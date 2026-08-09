import { renderHtml, renderText } from "./emailBlocks";
import {
  buildContext,
  emailForStepIn,
  dueAtForSource,
  lastStepFor,
  promoStepsFor,
  PROMO_HOURS,
  RECOVERY_EMAIL,
  type LeadContext,
  type LeadPromo,
  type NurtureEmail,
} from "./nurture";
import { cancelScheduledEmails, sendNurtureEmail } from "./resend";
import {
  updateLead,
  getLeadByEmail,
  type Lead,
  type LeadStatus,
} from "./leads";
import { createLeadPromoCode } from "./stripe";
import { recordSend } from "./nurtureSends";

/**
 * Drives a lead through the nurture sequence.
 *
 * Split from `nurture.ts` (which is content) and `leads.ts` (which is storage)
 * so the copy can be rewritten without touching state transitions, which is the
 * change that actually gets made every week.
 */

/**
 * Which discount, if any, this lead should see.
 *
 * Two configurations, and the copy in `nurture.ts` adapts to whichever is live:
 *
 * - `NURTURE_PROMO_CODE` set: one shared code for everyone. Nothing is minted
 *   and nothing is stored, so it works even when the Stripe API is unreachable.
 *   It carries no expiry, and the copy therefore never claims a personal
 *   deadline for it.
 * - Otherwise: the per-lead code minted at step 4, valid only until its real
 *   Stripe `expires_at`.
 *
 * An expired code must never reach `buildContext`, because it would be
 * prefilled into the checkout link and Stripe would greet the customer with a
 * rejected discount, which is worse than no discount at all.
 */
function resolvePromo(lead: Lead): LeadPromo | null {
  const shared = process.env.NURTURE_PROMO_CODE;
  if (shared) {
    return {
      code: shared,
      pct: Number(process.env.NURTURE_PROMO_PCT) || 15,
      expiresAt: null,
    };
  }
  if (!lead.promoCode || !lead.promoPct) return null;
  if (
    lead.promoExpiresAt &&
    new Date(lead.promoExpiresAt).getTime() <= Date.now()
  ) {
    return null;
  }
  return {
    code: lead.promoCode,
    pct: lead.promoPct,
    expiresAt: lead.promoExpiresAt,
  };
}

/**
 * The discount is scoped to the steps that talk about it.
 *
 * Step 5 tells the reader this is the last email carrying the code. Dropping
 * the promo from the checkout link everywhere else is what makes that true of
 * the software and not just of the prose, which matters most for the shared
 * code, where nothing else stops it being used forever.
 */
function contextFor(lead: Lead, step: number): LeadContext {
  return buildContext({
    email: lead.email,
    answers: lead.answers,
    unsubToken: lead.unsubToken,
    promo: promoStepsFor(lead.source).includes(step) ? resolvePromo(lead) : null,
  });
}

function render(def: NurtureEmail, ctx: LeadContext) {
  const blocks = def.blocks(ctx);
  const reason = def.reason ?? "You ran the Tourly listing diagnostic.";
  return {
    subject: def.subject(ctx),
    html: renderHtml({
      blocks,
      preheader: def.preheader(ctx),
      unsubUrl: ctx.unsubUrl,
      reason,
    }),
    text: renderText({ blocks, unsubUrl: ctx.unsubUrl, reason }),
  };
}

/**
 * Hand step 1 to Resend's scheduler and record where the cron should pick up.
 *
 * If scheduling fails the lead is left at step 0 with step 1 still due, so the
 * next cron run sends it late rather than dropping it. Late is a worse email
 * than on time; missing is a lost lead.
 */
export async function startSequence(lead: Lead): Promise<void> {
  const def = emailForStepIn(lead.source, 1);
  if (!def) return;

  const ctx = contextFor(lead, 1);
  const { subject, html, text } = render(def, ctx);

  const id = await sendNurtureEmail({
    to: lead.email,
    subject,
    html,
    text,
    unsubUrl: ctx.unsubUrl,
    step: 1,
    scheduledAt: dueAtForSource(lead.createdAt, 1, lead.source) ?? undefined,
  });

  if (id) {
    await recordSend({
      email: lead.email,
      step: 1,
      source: lead.source,
      sentAt: dueAtForSource(lead.createdAt, 1, lead.source) ?? new Date().toISOString(),
    });
    await updateLead(lead.id, {
      step: 1,
      scheduledIds: [id],
      nextAt: dueAtForSource(lead.createdAt, 2, lead.source),
    });
  } else {
    await updateLead(lead.id, {
      step: 0,
      nextAt: dueAtForSource(lead.createdAt, 1, lead.source),
    });
  }
}

/**
 * Send whatever step this lead is due, and schedule the one after it.
 *
 * Steps that opt out via `skipIf` are stepped past without sending, so a lead
 * whose discount could not be minted does not stall on the deadline email
 * waiting for a code that will never exist.
 */
export async function advanceLead(
  lead: Lead,
): Promise<{ sent: number | null }> {
  let step = lead.step + 1;
  let current = { ...lead };

  const last = lastStepFor(lead.source);

  while (step <= last) {
    const def = emailForStepIn(current.source, step);
    if (!def) break;

    // The offer step mints a per-lead code just before it is needed, so the 72
    // hours start when the email lands rather than when the lead signed up.
    // Skipped entirely when a shared code is configured: there is nothing to
    // mint, and `resolvePromo` will hand out the shared one instead.
    if (
      current.source === "quiz" &&
      step === 4 &&
      !process.env.NURTURE_PROMO_CODE &&
      !current.promoCode
    ) {
      const promo = await createLeadPromoCode({
        email: current.email,
        hours: PROMO_HOURS,
      });
      if (promo) {
        await updateLead(current.id, {
          promoCode: promo.code,
          promoPct: promo.pct,
          promoExpiresAt: promo.expiresAt,
        });
        current = {
          ...current,
          promoCode: promo.code,
          promoPct: promo.pct,
          promoExpiresAt: promo.expiresAt,
        };
      }
    }

    const ctx = contextFor(current, step);

    if (def.skipIf?.(ctx)) {
      step++;
      continue;
    }

    const { subject, html, text } = render(def, ctx);
    const id = await sendNurtureEmail({
      to: current.email,
      subject,
      html,
      text,
      unsubUrl: ctx.unsubUrl,
      step,
    });

    // A send that failed leaves `step` where it was so the next run retries it,
    // rather than silently burning an email nobody received.
    if (!id) return { sent: null };

    await recordSend({
      email: current.email,
      step,
      source: current.source,
      sentAt: new Date().toISOString(),
    });

    const nextAt = dueAtForSource(current.createdAt, step + 1, current.source);
    await updateLead(current.id, {
      step,
      nextAt,
      status: step >= last || !nextAt ? "done" : "active",
    });
    return { sent: step };
  }

  await updateLead(current.id, {
    step: last,
    nextAt: null,
    status: "done",
  });
  return { sent: null };
}

/**
 * Send the abandoned-checkout recovery, once.
 *
 * Guarded three ways, because this fires off a Stripe event rather than off our
 * own schedule and every guard covers a real case: the lead may have bought on
 * a second attempt before the first session expired, may have unsubscribed
 * since, and Stripe may expire more than one session for the same person.
 *
 * The code is only repeated for someone already past the offer step. Handing a
 * discount to somebody for abandoning would teach exactly the wrong lesson.
 */
export async function sendRecovery(email: string): Promise<boolean> {
  try {
    const lead = await getLeadByEmail(email);
    if (!lead) return false;
    if (lead.status !== "active") return false;
    if (lead.recoverySentAt) return false;

    const ctx = buildContext({
      email: lead.email,
      answers: lead.answers,
      unsubToken: lead.unsubToken,
      promo:
        lead.step >= Math.min(...promoStepsFor(lead.source))
          ? resolvePromo(lead)
          : null,
    });

    const { subject, html, text } = render(RECOVERY_EMAIL, ctx);
    const id = await sendNurtureEmail({
      to: lead.email,
      subject,
      html,
      text,
      unsubUrl: ctx.unsubUrl,
      step: 0,
    });
    if (!id) return false;

    await recordSend({
      email: lead.email,
      step: 0,
      source: `${lead.source}_recovery`,
      sentAt: new Date().toISOString(),
    });
    await updateLead(lead.id, { recoverySentAt: new Date().toISOString() });
    return true;
  } catch (err) {
    console.error("[nurture] sendRecovery failed:", err);
    return false;
  }
}

/**
 * Take a lead out of the sequence and cancel anything already queued at Resend.
 *
 * Cancelling matters most for a purchase: step 1 may be sitting in Resend's
 * scheduler with "you have not bought yet" in it, aimed at somebody who just
 * paid. Never throws, because both callers (a Stripe webhook and an unsubscribe
 * click) have to answer successfully regardless.
 */
export async function stopSequence(
  email: string,
  status: Extract<LeadStatus, "purchased" | "unsubscribed">,
): Promise<boolean> {
  try {
    const lead = await getLeadByEmail(email);
    if (!lead) return false;
    if (lead.status === status) return true;

    await cancelScheduledEmails(lead.scheduledIds);

    const now = new Date().toISOString();
    await updateLead(lead.id, {
      status,
      nextAt: null,
      scheduledIds: [],
      ...(status === "purchased"
        ? { purchasedAt: now }
        : { unsubscribedAt: now }),
    });
    return true;
  } catch (err) {
    console.error(`[nurture] stopSequence(${status}) failed:`, err);
    return false;
  }
}
