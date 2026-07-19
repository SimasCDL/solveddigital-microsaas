import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrder, updateOrder } from '@/lib/orders';
import { fulfillOrder } from '@/lib/fulfill';
import type Stripe from 'stripe';

export const maxDuration = 800;

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

  // Stripe retries webhooks — only fulfill once
  if (order.status !== 'pending_payment') {
    return NextResponse.json({ received: true });
  }

  await updateOrder(orderId, { status: 'processing', stripeSessionId: session.id });

  after(() => fulfillOrder(orderId));

  return NextResponse.json({ received: true });
}
