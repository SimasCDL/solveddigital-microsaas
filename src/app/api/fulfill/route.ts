import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder, countOrdersBySession } from '@/lib/orders';
import { fulfillOrder } from '@/lib/fulfill';
import { getStripe, photosForAmount } from '@/lib/stripe';

export const maxDuration = 800;

// Post-funnel fulfillment: payment happened on the landing funnel's Stripe
// checkout; customers land here with ?session_id={CHECKOUT_SESSION_ID} from the
// Payment Link success URL. We verify the session is real, PAID, and not
// already used up before generating anything. The funnel's Payment Links must
// live in the SAME Stripe account as STRIPE_SECRET_KEY.
//
// SKIP_PAYMENT_CHECK=true (local dev only) bypasses verification.

// $94 = the funnel's 3-video pack → 3 tours per session; everything else 1.
const usesForAmount = (amountTotal: number | null) => (amountTotal === 9400 ? 3 : 1);

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_FREE_MODE !== 'true') {
    return NextResponse.json({ error: 'Direct fulfillment is disabled' }, { status: 403 });
  }

  const { orderId, sessionId } = await req.json();
  if (typeof orderId !== 'string' || !orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // one fulfillment per order, ever
  if (order.status !== 'pending_payment') {
    return NextResponse.json({ received: true });
  }

  let stripeSessionId: string | undefined;
  if (process.env.SKIP_PAYMENT_CHECK !== 'true') {
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return NextResponse.json(
        { error: 'We couldn’t verify your purchase. Please use the link from your checkout confirmation.' },
        { status: 402 }
      );
    }
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'This checkout hasn’t been paid yet. Please complete your purchase first.' },
          { status: 402 }
        );
      }
      const used = await countOrdersBySession(sessionId);
      if (used >= usesForAmount(session.amount_total)) {
        return NextResponse.json(
          { error: 'This purchase has already been used. If that doesn’t seem right, reply to your confirmation email.' },
          { status: 402 }
        );
      }
      // Enforce the pack's photo limit — can't buy the 15-pack and upload 40.
      const allowed = photosForAmount(session.amount_total);
      if (order.photoUrls.length > allowed) {
        return NextResponse.json(
          { error: `Your pack covers up to ${allowed} photos, but you added ${order.photoUrls.length}. Please remove ${order.photoUrls.length - allowed} and try again — or buy a larger pack.` },
          { status: 402 }
        );
      }
      stripeSessionId = sessionId;
    } catch (err) {
      console.error('[fulfill] Stripe session verification failed:', err);
      return NextResponse.json(
        { error: 'We couldn’t verify your purchase. Please use the link from your checkout confirmation.' },
        { status: 402 }
      );
    }
  }

  await updateOrder(orderId, { status: 'processing', stripeSessionId });

  after(() => fulfillOrder(orderId));

  return NextResponse.json({ ok: true });
}
