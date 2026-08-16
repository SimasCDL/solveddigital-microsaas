import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrder, countOrdersBySession } from "@/lib/orders";
import { fulfillOrder } from "@/lib/fulfill";
import { getStripe, photosForSession } from "@/lib/stripe";

// 300s is the ceiling on Vercel's Hobby plan — a higher value does not just get
// clamped, it fails the deploy with "invalid maxDuration value". Raise this only
// alongside a plan upgrade.
export const maxDuration = 300;

// Post-funnel fulfillment: payment happened on the landing funnel's Stripe
// checkout; customers land here with ?session_id={CHECKOUT_SESSION_ID} from the
// Payment Link success URL. We verify the session is real, PAID, and not
// already used up before generating anything. The funnel's Payment Links must
// live in the SAME Stripe account as STRIPE_SECRET_KEY.
//
// SKIP_PAYMENT_CHECK=true (local dev only) bypasses verification.

// One tour per checkout. Every current pack (p15/p25/p40) buys a single
// listing tour and differs only in how many photos it covers — the photo cap is
// the entitlement, not a tour count.
//
// This used to read `amountTotal === 9400 ? 3 : 1`, for a $94 three-video pack
// that no longer exists. Left in place it was a live hazard, because a promo
// code can land an unrelated pack on any amount, and the one it happened to hit
// would have handed out three tours for one payment.
const USES_PER_SESSION = 1;

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_FREE_MODE !== "true") {
    return NextResponse.json(
      { error: "Direct fulfillment is disabled" },
      { status: 403 },
    );
  }

  const { orderId, sessionId } = await req.json();
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // one fulfillment per order, ever
  if (order.status !== "pending_payment") {
    return NextResponse.json({ received: true });
  }

  let stripeSessionId: string | undefined;
  if (process.env.SKIP_PAYMENT_CHECK !== "true") {
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        {
          error:
            "We couldn’t verify your purchase. Please use the link from your checkout confirmation.",
        },
        { status: 402 },
      );
    }
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      // 'paid' = normal purchase; 'no_payment_required' = 100%-off coupon ($0 total).
      if (
        session.payment_status !== "paid" &&
        session.payment_status !== "no_payment_required"
      ) {
        return NextResponse.json(
          {
            error:
              "This checkout hasn’t been paid yet. Please complete your purchase first.",
          },
          { status: 402 },
        );
      }
      const used = await countOrdersBySession(sessionId);
      if (used >= USES_PER_SESSION) {
        return NextResponse.json(
          // Not "reply to your confirmation email" — nothing reads that inbox, and
          // this is a customer who paid and is being refused. /help reaches a phone.
          {
            error:
              "This purchase has already been used. If that doesn’t seem right, tell us at /help and we’ll sort it out.",
          },
          { status: 402 },
        );
      }
      // Enforce the pack's photo limit — can't buy the 15-pack and upload 40.
      // Entitlement comes off the Price, never the amount: a discounted 40-pack
      // pays $95.20, and the amount ladder would refuse the customer 15 of the
      // photos they just paid for.
      const allowed = await photosForSession(session);
      if (order.photoUrls.length > allowed) {
        return NextResponse.json(
          {
            error: `Your pack covers up to ${allowed} photos, but you added ${order.photoUrls.length}. Please remove ${order.photoUrls.length - allowed} and try again — or buy a larger pack.`,
          },
          { status: 402 },
        );
      }
      stripeSessionId = sessionId;
    } catch (err) {
      console.error("[fulfill] Stripe session verification failed:", err);
      return NextResponse.json(
        {
          error:
            "We couldn’t verify your purchase. Please use the link from your checkout confirmation.",
        },
        { status: 402 },
      );
    }
  }

  await updateOrder(orderId, { status: "processing", stripeSessionId });

  after(() => fulfillOrder(orderId));

  return NextResponse.json({ ok: true });
}
