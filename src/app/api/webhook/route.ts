import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getStripe, photosForAmount } from "@/lib/stripe";
import { getOrder, updateOrder } from "@/lib/orders";
import { fulfillOrder } from "@/lib/fulfill";
import { sendTelegram } from "@/lib/telegram";
import type Stripe from "stripe";

// A pack's photo cap is fixed by the Stripe Price the customer paid for — NOT
// the amount. Deriving it from the amount broke under promo codes: OFF20 on the
// $160/40-photo pack pays $128, which the amount ladder misread as the 25-pack.
// The Price a promo discounts is still the same Price, so this stays correct.
// Keep in sync with the pack Payment Links.
const PHOTOS_BY_PRICE: Record<string, number> = {
  // Current prices.
  price_1TyAcqI5ln1sJkOAvIqvpvp1: 40, // $112 pack
  price_1TyAcpI5ln1sJkOAq05gmtCD: 25, // $84 pack
  price_1TyAcoI5ln1sJkOAXNVR2BxX: 15, // $65 pack
  // Retired prices — kept so an in-flight checkout opened before the price
  // change still entitles the right pack instead of falling back to 15.
  price_1TvdxxI5ln1sJkOAwnzfABr8: 40, // was $160
  price_1TvdxbI5ln1sJkOAZt1Xttod: 25, // was $125
  price_1TvdxBI5ln1sJkOA1GKh5Q4C: 15, // was $105
};

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
    // Entitlement from the Price the customer bought (discount-proof). Fall back
    // to the amount only if the line item can't be read for some reason.
    let allowed = photosForAmount(session.amount_total);
    try {
      const items = await getStripe().checkout.sessions.listLineItems(
        session.id,
        { limit: 1 },
      );
      const priceId = items.data[0]?.price?.id;
      if (priceId && PHOTOS_BY_PRICE[priceId]) {
        allowed = PHOTOS_BY_PRICE[priceId];
      }
    } catch {
      /* keep the amount-based fallback */
    }
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
