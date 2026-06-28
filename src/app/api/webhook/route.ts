import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrder, updateOrder } from '@/lib/orders';
import { submitVideoJob } from '@/lib/fal';
import type Stripe from 'stripe';

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.client_reference_id!;

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const falRequestIds: string[] = [];

  for (let i = 0; i < order.photoUrls.length; i++) {
    const webhookUrl = `${appUrl}/api/fal-webhook?orderId=${orderId}&photoIndex=${i}&totalPhotos=${order.photoUrls.length}`;
    const { requestId } = await submitVideoJob(order.photoUrls[i], webhookUrl);
    falRequestIds.push(requestId);
  }

  await updateOrder(orderId, {
    status: 'processing',
    stripeSessionId: session.id,
    falRequestIds,
  });

  return NextResponse.json({ received: true });
}
