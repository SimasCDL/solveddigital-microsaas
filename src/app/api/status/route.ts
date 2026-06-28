import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/orders';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  return NextResponse.json({
    status: order.status,
    videoUrls: order.videoUrls ?? [],
    propertyAddress: order.propertyAddress,
    photoCount: order.photoUrls.length,
  });
}
