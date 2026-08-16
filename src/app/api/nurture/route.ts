import { NextRequest, NextResponse } from "next/server";
import { dueLeads, updateLead } from "@/lib/leads";
import { advanceLead, stopSequence } from "@/lib/sequence";
import { hasPaidOrderFor } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The nurture cron. Sends whichever sequence step each lead is due.
 *
 * Runs daily, which is the finest granularity Vercel's Hobby plan offers. Only
 * step 1 needs minute precision and that one is handed to Resend's scheduler at
 * capture time, so daily is enough for everything this route owns.
 *
 * The important property is that eligibility is re-checked at send time rather
 * than at schedule time. A lead who bought yesterday is caught here even if the
 * Stripe webhook never fired, because a customer receiving "you still have not
 * bought this" is the single most damaging email in the sequence.
 *
 * Auth matches /api/daily-report: Vercel Cron's bearer token, or ?key= for a
 * manual run. Add ?dry=1 to see what would go out without sending it.
 */

/** Bounded so one run cannot exceed maxDuration on a backlog. Leftovers are
 *  still due tomorrow, and `dueLeads` returns oldest-first, so nobody starves. */
const BATCH = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";

  try {
    const leads = await dueLeads(BATCH);
    if (dry) {
      return NextResponse.json({
        ok: true,
        dry: true,
        due: leads.map((l) => ({
          email: l.email,
          nextStep: l.step + 1,
          dueAt: l.nextAt,
        })),
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        // Backstop for a webhook that never landed, or a customer who paid with
        // a different address than the one Stripe reported. An order row is the
        // other independent record that they bought.
        //
        // Never applied to the `customer` sequence, whose entry condition IS
        // having bought. Without this exemption that sequence would be stopped
        // by its own qualifying event on the first cron run after enrolment,
        // and the failure would look exactly like it working.
        if (lead.source !== "customer" && (await hasPaidOrderFor(lead.email))) {
          await stopSequence(lead.email, "purchased");
          skipped++;
          continue;
        }

        const { sent: step } = await advanceLead(lead);
        if (step) sent++;
        else failed++;
      } catch (err) {
        console.error(`[nurture] lead ${lead.id} failed:`, err);
        failed++;
        // Push this lead a day out so one poisoned row cannot occupy a batch
        // slot on every future run.
        await updateLead(lead.id, {
          nextAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      due: leads.length,
      sent,
      skipped,
      failed,
    });
  } catch (err) {
    console.error("[nurture] run failed:", err);
    return NextResponse.json(
      { ok: false, error: "Nurture run failed" },
      { status: 500 },
    );
  }
}
