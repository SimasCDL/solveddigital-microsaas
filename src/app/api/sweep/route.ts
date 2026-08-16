import { NextRequest, NextResponse } from "next/server";
import { getStripe, photosForSession } from "@/lib/stripe";
import {
  listStuckOrders,
  countOrdersBySession,
  updateOrder,
} from "@/lib/orders";
import { sendUploadReminderEmail } from "@/lib/resend";
import { hasSent, recordSend } from "@/lib/nurtureSends";
import { sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The sweep: two failures that are invisible from every screen we look at.
 *
 * 1. **Orders stuck generating.** On Vercel a stalled fulfilment eventually hit
 *    the function timeout and threw, which marked the order `failed` and mailed
 *    the customer. On a VPS nothing interrupts it, so a restart mid-generation
 *    kills the job with no exception and the row sits in `processing` forever
 *    while the customer watches a progress bar. One in this database has been
 *    processing since 19 July and nobody found out from the software.
 *
 * 2. **Paid, never uploaded.** In the pay-first funnel the order only exists
 *    once photos arrive, so somebody who paid and never came back leaves no row
 *    at all. They are invisible to every query we run: not a failed order, not
 *    a pending one, nothing. The only record is a Stripe session with no order
 *    against it.
 *
 * Both are read-only against our own data plus Stripe, and the only writes are
 * an alert and at most two emails per customer, ever.
 */

/**
 * A generation that has run this long is not running any more.
 *
 * Measured runs land at 4-13 minutes, but a 40-photo order on a single vCPU has
 * never been timed and the ffmpeg half grows with the finished video's length.
 * 90 minutes is well past any honest run and still catches a dead job the same
 * working day.
 */
const STUCK_AFTER_MIN = 90;

/** How far back to look for paid sessions. Beyond this, chasing is archaeology. */
const LOOKBACK_DAYS = 14;

const REMINDER_SOURCE = "upload_reminder";
/** Hours after payment for each of the two reminders. */
const REMINDER_AT_HOURS: Record<1 | 2, number> = { 1: 24, 2: 72 };

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const out = {
    stuck: [] as string[],
    reminded: [] as string[],
    checked: 0,
  };

  /* ---------------------------------------------------------- stuck orders */
  try {
    const stuck = await listStuckOrders(STUCK_AFTER_MIN);
    for (const o of stuck) {
      const mins = Math.round(
        (Date.now() - new Date(o.updatedAt).getTime()) / 60_000,
      );
      out.stuck.push(`${o.id} (${mins}m)`);
      if (dry) continue;

      // Resolve it, do not just report it. Marking the order `failed` is what
      // makes this alert fire once instead of every hour forever: the row stops
      // matching the query that found it. The first version only alerted, and
      // it re-announced the same month-old order on every run until somebody
      // noticed the channel had turned into a metronome.
      //
      // It is also the honest state. The job is dead, and until this runs the
      // order page shows a customer a progress bar that will never finish.
      // `failed` is what the page needs to offer them a way out.
      await updateOrder(o.id, {
        status: "failed",
        errorMessage: `No progress for ${mins} minutes — marked failed by the sweep. The process was most likely restarted mid-generation.`,
      }).catch((err) => console.error("[sweep] could not mark failed:", err));

      // Deliberately no customer email here. A retry often fixes this in a few
      // minutes, and "your video failed" followed by "your video is ready" is
      // worse than a short silence. A human decides, with the command to hand.
      await sendTelegram(
        `🕒 *Order stuck* ${mins}m · marked failed\n📧 ${o.email}\n🆔 \`${o.id}\`\n` +
          `Retry: POST /api/admin/retry`,
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[sweep] stuck check failed:", err);
  }

  /* ------------------------------------------------- paid, never uploaded */
  try {
    const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
    const sessions = await getStripe().checkout.sessions.list({
      created: { gte: since },
      limit: 100,
    });

    for (const s of sessions.data) {
      if (
        s.payment_status !== "paid" &&
        s.payment_status !== "no_payment_required"
      ) {
        continue;
      }
      const email = s.customer_details?.email ?? s.customer_email;
      if (!email) continue;

      out.checked++;

      // An order against this session means the photos arrived. Nothing to do,
      // and this is the check that stops us chasing a served customer.
      if ((await countOrdersBySession(s.id)) > 0) continue;

      const hoursSince = (Date.now() / 1000 - s.created) / 3600;
      const attempt: 1 | 2 | null =
        hoursSince >= REMINDER_AT_HOURS[2]
          ? 2
          : hoursSince >= REMINDER_AT_HOURS[1]
            ? 1
            : null;
      if (!attempt) continue;

      // Both are keyed off the same source, so reaching the day-3 window does
      // not re-send the day-1 email to somebody who already had it.
      if (await hasSent(email, attempt, REMINDER_SOURCE)) continue;

      out.reminded.push(`${email} #${attempt}`);
      if (dry) continue;

      await sendUploadReminderEmail({
        to: email,
        sessionId: s.id,
        maxPhotos: await photosForSession(s),
        attempt,
      });
      await recordSend({
        email,
        step: attempt,
        source: REMINDER_SOURCE,
        sentAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[sweep] upload reminder pass failed:", err);
  }

  return NextResponse.json({ ok: true, dry, ...out });
}
