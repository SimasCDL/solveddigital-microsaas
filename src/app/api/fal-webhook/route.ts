import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/orders';
import { sendDeliveryEmail, sendFailureEmail } from '@/lib/resend';

interface FalWebhookPayload {
  request_id: string;
  status: 'OK' | 'ERROR';
  payload?: {
    video?: { url: string };
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const photoIndex = parseInt(searchParams.get('photoIndex') ?? '0');
  const totalPhotos = parseInt(searchParams.get('totalPhotos') ?? '1');

  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  const body: FalWebhookPayload = await req.json();

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (body.status === 'ERROR') {
    await updateOrder(orderId, { status: 'failed', errorMessage: body.error ?? 'Generation failed' });
    await sendFailureEmail({ to: order.email, orderId });
    return NextResponse.json({ received: true });
  }

  const videoUrl = body.payload?.video?.url;
  if (!videoUrl) return NextResponse.json({ error: 'No video URL' }, { status: 400 });

  const existingUrls = order.videoUrls ?? [];
  const updatedUrls = [...existingUrls];
  updatedUrls[photoIndex] = videoUrl;

  const allDone = updatedUrls.filter(Boolean).length === totalPhotos;

  if (allDone) {
    const finalOrder = await updateOrder(orderId, {
      status: 'completed',
      videoUrls: updatedUrls,
    });

    await sendDeliveryEmail({
      to: order.email,
      propertyAddress: order.propertyAddress,
      videoUrls: finalOrder.videoUrls!,
      orderId,
    });
  } else {
    await updateOrder(orderId, { videoUrls: updatedUrls });
  }

  return NextResponse.json({ received: true });
}
