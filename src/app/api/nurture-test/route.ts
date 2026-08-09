import { NextRequest, NextResponse } from "next/server";
import { renderHtml, renderText } from "@/lib/emailBlocks";
import {
  buildContext,
  emailForStepIn,
  RECOVERY_EMAIL,
  previewPromo,
  promoStepsFor,
  type LeadSource,
} from "@/lib/nurture";
import { sendNurtureEmail } from "@/lib/resend";
import type { Answers } from "@/lib/quiz";

export const dynamic = "force-dynamic";

/**
 * Send one nurture email, for real, to one address.
 *
 * This exists so "the emails work" can be demonstrated rather than asserted.
 * It goes through exactly the same render and send path the cron uses, so a
 * success here proves the Resend key, the sending domain, the templates and the
 * unsubscribe headers all work together. The only thing it skips is the lead
 * lookup, because the point is to be able to fire it before any lead exists.
 *
 * Admin-key gated and fail-closed, same as every other internal route: it can
 * send mail to an arbitrary address, so an unset ADMIN_KEY must 401 rather than
 * leave an open relay of fixed content.
 *
 *   GET /api/nurture-test?to=you@example.com&step=4
 *   GET /api/nurture-test?to=you@example.com&step=1&source=winback
 *   GET /api/nurture-test?to=you@example.com&recovery=1
 *   ...&dry=1   renders and returns the subject without sending
 */

/** A representative agent run, so the personalised copy has something to say. */
const SAMPLE: Answers = {
  pain: "cost",
  who: "agent",
  volume: "v3",
  today: "photos",
  photos: "p20",
  goal: "listings",
};

export async function GET(req: NextRequest) {
  if (
    !process.env.ADMIN_KEY ||
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    // Also accept ?key= so this is usable straight from a browser bar.
    if (req.nextUrl.searchParams.get("key") !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const to = req.nextUrl.searchParams.get("to");
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "Pass ?to=<email>" }, { status: 400 });
  }

  const source = (req.nextUrl.searchParams.get("source") ??
    "quiz") as LeadSource;
  const step = Number(req.nextUrl.searchParams.get("step") ?? 1);
  const recovery = req.nextUrl.searchParams.get("recovery") === "1";
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const def = recovery ? RECOVERY_EMAIL : emailForStepIn(source, step);
  if (!def) {
    return NextResponse.json(
      { error: `No step ${step} in the ${source} sequence` },
      { status: 400 },
    );
  }

  const ctx = buildContext({
    email: to,
    answers: SAMPLE,
    unsubToken: "test-token",
    // Mirror production: only the promo steps carry a code.
    promo:
      recovery || promoStepsFor(source).includes(step) ? previewPromo() : null,
  });

  const blocks = def.blocks(ctx);
  const reason = def.reason ?? "";
  const subject = def.subject(ctx);
  const html = renderHtml({
    blocks,
    preheader: def.preheader(ctx),
    unsubUrl: ctx.unsubUrl,
    reason,
  });
  const text = renderText({ blocks, unsubUrl: ctx.unsubUrl, reason });

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      subject,
      chars: html.length,
    });
  }

  const id = await sendNurtureEmail({
    to,
    subject,
    html,
    text,
    unsubUrl: ctx.unsubUrl,
    step: recovery ? 0 : step,
  });

  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Resend rejected the send. Check RESEND_API_KEY, FROM_EMAIL and that the sending domain is verified.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sent: true, resendId: id, subject, to });
}
