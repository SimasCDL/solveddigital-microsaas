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

  const item = photoCount ? `${photoCount}-photo tour` : "Listing tour";
  await sendTelegram(
    `💸 *New sale* — ${item} · ${money(amount)}\n\n📊 Today: ${money(dayRevenue)} · ${daySales} sale${daySales === 1 ? "" : "s"}`,
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
  const orderId = session.client_reference_id!;

  const order = await getOrder(orderId);
  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Stripe retries webhooks — only fulfill once
  if (order.status !== "pending_payment") {
    return NextResponse.json({ received: true });
  }

  await updateOrder(orderId, {
    status: "processing",
    stripeSessionId: session.id,
  });

  after(() => notifyPurchase(session, order.photoUrls?.length ?? 0));
  after(() => fulfillOrder(orderId));

  return NextResponse.json({ received: true });
}
