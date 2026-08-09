import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/telegram';
import { clientIp, hashIp } from '@/lib/freeTrial';
import { sendQuizDiagnosticEmail } from '@/lib/resend';
import { packCheckoutUrl } from '@/lib/pricing';
import { diagnose, costSentence, usd, type Answers } from '@/lib/quiz';

/**
 * Quiz lead capture — mails the diagnostic and alerts the channel.
 *
 * Public by design, same as `/api/free`: there's no login and the endpoint
 * grants nothing. It deliberately accepts no caller-supplied copy — every word
 * of the email is derived server-side from the answers.
 *
 * But it DOES send mail to whatever address it is given, so unthrottled it is
 * both a way to burn the Resend quota and a way to repeatedly mail a stranger.
 * The limiter below closes the trivial version of that.
 *
 * Its honest limitation: the counters are per-instance memory, so they reset on
 * a cold start and are not shared across concurrent lambdas. That is enough to
 * stop a loop from one machine; it is not enough to stop a distributed abuser.
 * Moving the counters into Supabase alongside the free-trial limiter is the real
 * fix, and needs a table.
 */

const HOUR = 60 * 60 * 1000;

/** hits keyed by ip hash / email, each a list of timestamps. */
const hits = new Map<string, number[]>();

const PER_IP = { max: 4, window: 10 * 60 * 1000 };
const PER_EMAIL = { max: 2, window: HOUR };
const GLOBAL = { max: 80, window: HOUR };

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
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const now = Date.now();
    sweep(now);
    const ip = hashIp(clientIp(req.headers));
    const addr = email.trim().toLowerCase();
    if (
      overLimit('g', GLOBAL.max, GLOBAL.window, now) ||
      overLimit(`ip:${ip}`, PER_IP.max, PER_IP.window, now) ||
      overLimit(`em:${addr}`, PER_EMAIL.max, PER_EMAIL.window, now)
    ) {
      // 200, not 429: the visitor's result must render either way, and the
      // client treats this call as fire-and-forget. Nothing is sent.
      console.warn('[quiz-lead] rate limited');
      return NextResponse.json({ ok: true });
    }

    const a = answers ?? {};
    const d = diagnose(a);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const checkoutUrl = `${packCheckoutUrl(d.pack)}&prefilled_email=${encodeURIComponent(email)}`;
    const costLine = `${usd(d.costLow)}–${usd(d.costHigh)}${d.single ? '' : ' a year'} ${costSentence(d)}`;

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
      }).catch((err) => console.error('[quiz-lead] diagnostic email failed:', err)),
    );

    after(() =>
      sendTelegram(
        `🧭 *Quiz lead* · ${d.archetype} (${d.score}/100)\n` +
        `📧 ${email}\n` +
        `👤 ${a.who ?? '—'} · 📈 ${d.single ? 'single property' : `${d.perYear} listings/yr`} · 🎥 today: ${a.today ?? '—'}\n` +
        `😖 pain: ${a.pain ?? '—'}\n` +
        `💡 ${d.pack.name} (${d.pack.priceLabel}) · market rate ${usd(d.costLow)}–${usd(d.costHigh)}` +
        (appUrl ? `\n🔗 ${appUrl}/f/quiz` : ''),
      ).catch(() => {}),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[quiz-lead] request failed:', err);
    // Never surface a failure — the visitor's result must render regardless.
    return NextResponse.json({ ok: false });
  }
}
