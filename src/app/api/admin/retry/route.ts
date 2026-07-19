import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/orders';
import { fulfillOrder } from '@/lib/fulfill';

export const maxDuration = 800;

// Support tool: re-run a failed (or stuck-in-processing) order without the
// customer paying again. Gated by ADMIN_KEY — same key as /generate.
export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_KEY || req.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { orderId } = await req.json();
  if (typeof orderId !== 'string' || !orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.status === 'completed') {
    return NextResponse.json({ error: 'Order already completed', videoUrls: order.videoUrls }, { status: 409 });
  }
  if (order.status === 'pending_payment') {
    return NextResponse.json({ error: 'Order was never paid/started' }, { status: 409 });
  }

  await updateOrder(orderId, { status: 'processing', errorMessage: undefined });

  after(() => fulfillOrder(orderId));

  return NextResponse.json({ ok: true, retrying: orderId });
}
