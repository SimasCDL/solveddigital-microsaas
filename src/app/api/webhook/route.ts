import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getStripe, photosForSession } from "@/lib/stripe";
import { getOrder, updateOrder } from "@/lib/orders";
import { fulfillOrder } from "@/lib/fulfill";
import { sendTelegram } from "@/lib/telegram";
import { sendUploadLinkEmail } from "@/lib/resend";
import { stopSequence, sendRecovery } from "@/lib/sequence";
import { sendMetaEventServerSide } from "@/lib/meta";
import type Stripe from "stripe";

/** Telegram "cha-ching" on a sale: what + amount + today's running total. */
async function notifyPurchase(
  session: Stripe.Checkout.Session,
  photoCount: number,
) {
  const currency = (session.currency ?? "usd").toUpperCase();
  const sym =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  const money = (n: number) => `${sym}${n % 1 ? n.toFixed(2) : n.toFixed(0)}`;
  const amount = (session.amount_total ?? 0) / 100;

  // Start of today in Vilnius (DST-safe).
  const now = new Date();
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vilnius",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  const startOfDay =
    Math.floor(now.getTime() / 1000) -
    (get("hour") * 3600 + get("minute") * 60 + get("second"));

  let dayRevenue = 0;
  let daySales = 0;
  let included = false;
  try {
    const list = await getStripe().checkout.sessions.list({
      created: { gte: startOfDay },
      limit: 100,
    });
    for (const s of list.data) {
      if (
        s.payment_status !== "paid" &&
        s.payment_status !== "no_payment_required"
      )
        continue;
      dayRevenue += (s.amount_total ?? 0) / 100;
      daySales += 1;
      if (s.id === session.id) included = true;
    }
  } catch {
    /* still send the sale line even if the day total can't be fetched */
  }
  if (!included) {
    dayRevenue += amount;
    daySales += 1;
  }

  // ~delivery cost ≈ $1.5 per uploaded photo.
  const cost = photoCount * 1.5;
  const costStr = Number.isInteger(cost) ? String(cost) : cost.toFixed(1);
  const photoLine = photoCount
    ? `\n📸 ${photoCount} photo${photoCount === 1 ? "" : "s"} · ~${sym}${costStr} cost`
    : "";

  await sendTelegram(
    `💸 *New sale* · ${money(amount)}${photoLine}\n\n📊 Today: ${money(dayRevenue)} · ${daySales} sale${daySales === 1 ? "" : "s"}`,
  );
}

// 300s is the ceiling on Vercel's Hobby plan — a higher value does not just get
// clamped, it fails the deploy with "invalid maxDuration value". Raise this only
// alongside a plan upgrade.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  /**
   * Abandoned checkout.
   *
   * Stripe expires an unfinished Checkout Session (24h for a Payment Link) and
   * fires this. It is the only signal we get that somebody reached the payment
   * page and did not pay, and those are the hottest leads in the funnel.
   *
   * The address is there because the quiz link sets `prefilled_email`, which
   * Stripe records on the session even when nobody types anything.
   */
  if (event.type === "checkout.session.expired") {
    const s = event.data.object as Stripe.Checkout.Session;
    const abandonedEmail =
      s.customer_details?.email ?? s.customer_email ?? null;
    if (abandonedEmail) {
      after(async () => {
        const sent = await sendRecovery(abandonedEmail);
        if (sent) {
          await sendTelegram(
            `🛒 *Abandoned checkout*\n📧 ${abandonedEmail}\n↩️ recovery email sent`,
          ).catch(() => {});
        }
      });
    }
    return NextResponse.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Only real sales — paid, or 100%-off coupons (no_payment_required).
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return NextResponse.json({ received: true });
  }

  // In the pay-first funnel, purchases come through Stripe Payment Links which
  // have NO client_reference_id and NO pre-existing order (the order is created
  // later, when the customer uploads photos). So the Telegram sale alert must
  // fire for EVERY completed checkout — never gate it behind an order lookup.
  const orderId = session.client_reference_id ?? "";
  const order = orderId ? await getOrder(orderId) : null;

  // Stripe retries webhooks (timeouts, 5xx, manual resend). If the order already
  // carries THIS session id we've fully handled this payment: don't re-announce
  // the sale, and — critically — don't fire the unfulfilled alarm below. Crying
  // wolf on every retry is how a real "paid but got nothing" gets ignored.
  const alreadyHandled = !!order && order.stripeSessionId === session.id;
  if (alreadyHandled) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  after(() => notifyPurchase(session, order?.photoUrls?.length ?? 0));

  // Purchase, reported from the money landing rather than from a page view.
  //
  // This is the event a Sales campaign optimises on, and the webhook is the only
  // place that is both authoritative about the amount and guaranteed to run. The
  // pay-first funnel takes payment on a Stripe Payment Link, so there is no order
  // yet here and the customer may never open a page again — a browser-only
  // Purchase would simply be missed for those. `event_id` is the session id so
  // the /upload pixel de-dupes against this instead of double-counting.
  //
  // Distinct from the `Lead` fired in fulfillOrder: Lead marks a tour being
  // built, Purchase marks money received, and in the pay-first flow they are
  // different moments. Both are kept so the existing Lead-optimised campaigns
  // keep their signal while the new Sales campaigns get a real revenue event.
  after(() =>
    sendMetaEventServerSide({
      eventName: "Purchase",
      orderId: session.id,
      email:
        session.customer_details?.email ?? session.customer_email ?? undefined,
      value: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      eventSourceUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/upload`,
    }).catch((err) => console.error("[webhook] Meta Purchase failed:", err)),
  );

  // Take the buyer out of the nurture sequence and cancel anything already
  // sitting in Resend's scheduler. This has to happen for EVERY completed
  // checkout, not just ones carrying an order: pay-first Payment Link purchases
  // have no order yet, and those customers are exactly the ones who came from
  // the quiz. The address Stripe collected is the one to match on, since it is
  // what they typed at checkout.
  const buyerEmail =
    session.customer_details?.email ??
    session.customer_email ??
    order?.email ??
    null;
  if (buyerEmail) {
    after(() =>
      stopSequence(buyerEmail, "purchased").catch((err) =>
        console.error("[webhook] stopSequence failed:", err),
      ),
    );
  }

  // Pay-first purchase: money has landed and there is no order yet, because the
  // customer has not uploaded anything. Their ONLY route to the uploader is the
  // session id on Stripe's success URL, so mail them a durable copy of it now.
  //
  // Without this, closing that tab is indistinguishable from being robbed: no
  // order exists to chase, Stripe's receipt has no link of ours, and the
  // "PAID BUT NOT FULFILLED" alarm below cannot fire because a Payment Link
  // carries no client_reference_id. Nobody would ever know.
  //
  // Skipped when an order already exists — those customers uploaded first and
  // are being told to upload something they already sent.
  if (!order && buyerEmail) {
    after(async () => {
      try {
        await sendUploadLinkEmail({
          to: buyerEmail,
          sessionId: session.id,
          maxPhotos: await photosForSession(session),
        });
      } catch (err) {
        // Loud: this failing means somebody paid and has no way back in.
        console.error("[webhook] upload link email failed:", err);
        await sendTelegram(
          `🚨 *Upload link email FAILED* — customer has paid and cannot reach the uploader\n` +
            `📧 ${buyerEmail}\n💳 session \`${session.id}\`\n` +
            `🔗 ${process.env.NEXT_PUBLIC_APP_URL || ""}/upload?session_id=${session.id}\n` +
            `⚠️ ${String(err).slice(0, 300)}`,
        ).catch(() => {});
      }
    });
  }

  // Did this payment actually kick off fulfillment? A paid checkout that carries
  // an order reference but fulfills NOTHING is a customer who paid and got
  // nothing — that must never pass silently (see the alert below).
  let fulfilled = false;

  // Fulfillment only applies to the pay-after-upload flow (/api/checkout), where
  // an order already exists in pending_payment. Stripe retries webhooks, so the
  // status guard keeps this idempotent. Pay-first orders fulfill via /api/fulfill.
  if (order && order.status === "pending_payment") {
    await updateOrder(orderId, {
      status: "processing",
      stripeSessionId: session.id,
    });
    after(() => fulfillOrder(orderId));
    fulfilled = true;
  }

  // Unlocking a free preview: the result page sends the customer to Stripe with
  // client_reference_id set to their order, so payment lands back here. Their
  // photos are already stored — re-render the full tour from all of them, up to
  // whatever their pack covers. Replacing the `free:` marker with the real
  // session id is what flips the order from preview to paid, and makes this
  // idempotent against Stripe's webhook retries.
  if (
    order &&
    order.status === "completed" &&
    (order.stripeSessionId ?? "").startsWith("free:")
  ) {
    await updateOrder(orderId, {
      status: "processing",
      stripeSessionId: session.id,
    });
    // Entitlement from the Price the customer bought (discount-proof), shared
    // with /api/pack and /api/fulfill so the three can never disagree.
    const allowed = await photosForSession(session);
    after(() => fulfillOrder(orderId, { limitPhotos: allowed }));
    fulfilled = true;
  }

  // Paid, tied to an order, but nothing fulfilled — order missing, already
  // unlocked, a double-payment, a $0 unlock attempt, or an unexpected state.
  // Never keep the money silently: alert loudly for a manual fix/refund.
  if (orderId && !fulfilled) {
    const amount = ((session.amount_total ?? 0) / 100).toFixed(2);
    const cur = (session.currency ?? "usd").toUpperCase();
    after(() =>
      sendTelegram(
        `⚠️ *PAID BUT NOT FULFILLED* — manual review\n` +
          `🆔 order \`${orderId}\`\n💳 session \`${session.id}\`\n` +
          `💵 ${amount} ${cur} · order status: ${order?.status ?? "NOT FOUND"}`,
      ).catch(() => {}),
    );
  }

  return NextResponse.json({ received: true });
}
