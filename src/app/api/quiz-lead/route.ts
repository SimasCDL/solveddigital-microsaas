import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { sendTelegram } from "@/lib/telegram";
import { clientIp, hashIp } from "@/lib/freeTrial";
import { sendQuizDiagnosticEmail } from "@/lib/resend";
import { packCheckoutUrl } from "@/lib/pricing";
import { diagnose, costSentence, usd, type Answers } from "@/lib/quiz";
import { countRecentByIpHash, upsertLead } from "@/lib/leads";
import { startSequence } from "@/lib/sequence";

/**
 * Quiz lead capture — mails the diagnostic, starts the nurture sequence and
 * alerts the channel.
 *
 * Public by design, same as `/api/free`: there's no login and the endpoint
 * grants nothing. It deliberately accepts no caller-supplied copy — every word
 * of every email is derived server-side from the answers.
 *
 * But it DOES send mail to whatever address it is given, and one submission now
 * commits to an eleven-email sequence, so unthrottled it is both a way to burn
 * the Resend quota and a way to repeatedly mail a stranger.
 *
 * Two layers, cheapest first:
 *
 * 1. Per-instance counters (per-IP, per-email, global). Free, and they stop the
 *    trivial loop from one machine. They reset on a cold start and are not
 *    shared across concurrent lambdas.
 * 2. A Supabase count of leads already created from this IP hash. Durable and
 *    shared across instances, which is what layer 1 cannot be. This is the fix
 *    the original limiter noted was missing for want of a table; `quiz_leads`
 *    is that table. It costs one query, only reached when layer 1 passes.
 *
 * Only the hashed IP is ever stored. A raw address is personal data under GDPR
 * and there is nothing here that needs to reverse it.
 */

const HOUR = 60 * 60 * 1000;

/** hits keyed by ip hash / email, each a list of timestamps. */
const hits = new Map<string, number[]>();

const PER_IP = { max: 4, window: 10 * 60 * 1000 };
const PER_EMAIL = { max: 2, window: HOUR };
const GLOBAL = { max: 80, window: HOUR };

/** Durable backstop: leads from one IP hash in an hour, across all instances. */
const PER_IP_PER_HOUR_DURABLE = 6;

function overLimit(key: string, max: number, window: number, now: number) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < window);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

/** Drop keys nothing has touched in an hour so the map can't grow unbounded. */
function sweep(now: number) {
  for (const [k, times] of hits) {
    const live = times.filter((t) => now - t < HOUR);
    if (live.length) hits.set(k, live);
    else hits.delete(k);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, answers } = (await req.json()) as {
      email?: string;
      answers?: Answers;
    };

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const now = Date.now();
    sweep(now);
    const ipHash = hashIp(clientIp(req.headers));
    const addr = email.trim().toLowerCase();

    // 200, not 429, on every throttle path: the visitor's result must render
    // either way, the client treats this call as fire-and-forget, and telling a
    // bot which of its attempts landed is free information. Nothing is sent.
    if (
      overLimit("g", GLOBAL.max, GLOBAL.window, now) ||
      overLimit(`ip:${ipHash}`, PER_IP.max, PER_IP.window, now) ||
      overLimit(`em:${addr}`, PER_EMAIL.max, PER_EMAIL.window, now)
    ) {
      console.warn("[quiz-lead] rate limited (memory)");
      return NextResponse.json({ ok: true });
    }

    if ((await countRecentByIpHash(ipHash, 60)) >= PER_IP_PER_HOUR_DURABLE) {
      console.warn("[quiz-lead] rate limited (durable)");
      return NextResponse.json({ ok: true });
    }

    const a = answers ?? {};
    const d = diagnose(a);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const checkoutUrl = `${packCheckoutUrl(d.pack)}&prefilled_email=${encodeURIComponent(email)}`;
    const costLine = `${usd(d.costLow)}–${usd(d.costHigh)}${d.single ? "" : " a year"} ${costSentence(d)}`;

    // Both after() — the visitor is already watching the "analyzing" spinner and
    // must never wait on an email provider to see their result.
    after(() =>
      sendQuizDiagnosticEmail({
        to: email,
        archetype: d.archetype,
        score: d.score,
        costLine,
        situation: d.situation,
        fixFirst: d.fixFirst,
        plan: d.plan,
        packName: d.pack.name,
        packPrice: d.pack.priceLabel,
        checkoutUrl,
      }).catch((err) =>
        console.error("[quiz-lead] diagnostic email failed:", err),
      ),
    );

    // Persist the lead and hand step 1 to Resend's scheduler. Inside after()
    // like the rest: the visitor is watching a spinner and must never wait on
    // Supabase. A failure here costs the sequence, never the result screen.
    after(async () => {
      try {
        const { lead } = await upsertLead({
          email,
          answers: a,
          archetype: d.archetype,
          score: d.score,
          packId: d.pack.id,
          ipHash,
        });
        // upsertLead refuses to resurrect someone who unsubscribed or already
        // bought, and returns their untouched row. Starting a sequence on that
        // row is exactly the thing the guard exists to prevent.
        if (lead.status === "active") await startSequence(lead);
      } catch (err) {
        console.error("[quiz-lead] sequence start failed:", err);
        // Loud, because this failure is otherwise invisible from the outside.
        // The visitor still gets their diagnostic (sent above, before any DB
        // call) and the lead still reaches Telegram, so every surface anyone
        // actually watches looks healthy while the follow-up sequence is being
        // dropped on the floor. That is exactly how the missing `quiz_leads`
        // table ran for days: eleven emails owed to five real leads, and the
        // only trace was a Vercel log line.
        await sendTelegram(
          `🚨 *Lead NOT persisted* — nurture sequence did not start\n` +
            `📧 ${email}\n` +
            `⚠️ ${String(err).slice(0, 300)}`,
        ).catch(() => {});
      }
    });

    after(() =>
      sendTelegram(
        `🧭 *Quiz lead* · ${d.archetype} (${d.score}/100)\n` +
          `📧 ${email}\n` +
          `👤 ${a.who ?? "—"} · 📈 ${d.single ? "single property" : `${d.perYear} listings/yr`} · 🎥 today: ${a.today ?? "—"}\n` +
          `😖 pain: ${a.pain ?? "—"}\n` +
          `💡 ${d.pack.name} (${d.pack.priceLabel}) · market rate ${usd(d.costLow)}–${usd(d.costHigh)}` +
          (appUrl ? `\n🔗 ${appUrl}/f/quiz` : ""),
      ).catch(() => {}),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quiz-lead] request failed:", err);
    // Never surface a failure — the visitor's result must render regardless.
    return NextResponse.json({ ok: false });
  }
}
