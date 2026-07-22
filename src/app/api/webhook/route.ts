import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getOrder, updateOrder } from "@/lib/orders";
import { fulfillOrder } from "@/lib/fulfill";
import { sendTelegram } from "@/lib/telegram";
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

export const maxDuration = 800;

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

  after(() => notifyPurchase(session, order?.photoUrls?.length ?? 0));

  // Fulfillment only applies to the pay-after-upload flow (/api/checkout), where
  // an order already exists in pending_payment. Stripe retries webhooks, so the
  // status guard keeps this idempotent. Pay-first orders fulfill via /api/fulfill.
  if (order && order.status === "pending_payment") {
    await updateOrder(orderId, {
      status: "processing",
      stripeSessionId: session.id,
    });
    after(() => fulfillOrder(orderId));
  }

  return NextResponse.json({ received: true });
}
