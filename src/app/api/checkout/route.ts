import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { getOrder } from '@/lib/orders';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    const order = await getOrder(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = await createCheckoutSession({
      orderId,
      email: order.email,
      photoCount: order.photoUrls.length,
      successUrl: `${appUrl}/order/${orderId}?success=1`,
      cancelUrl: `${appUrl}/?cancelled=1`,
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
