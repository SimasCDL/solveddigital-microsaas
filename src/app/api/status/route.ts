import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/orders';
import { signVideoUrls } from '@/lib/videos';

// Customer links live for 7 days after the order completes, then expire.
const LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// Playback links on the order page are short-lived; the page re-polls anyway.
const PLAYBACK_SIGN_SECONDS = 60 * 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const expired =
    order.status === 'completed' &&
    Date.now() - new Date(order.updatedAt).getTime() > LINK_LIFETIME_MS;

  return NextResponse.json({
    status: order.status,
    expired,
    videoUrls: expired ? [] : await signVideoUrls(order.videoUrls ?? [], PLAYBACK_SIGN_SECONDS),
    propertyAddress: order.propertyAddress,
    photoCount: order.photoUrls.length,
  });
}
