import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrder, updateOrder } from '@/lib/orders';
import { generateVideo, makeRunBudget } from '@/lib/fal';
import { sortPhotoUrls } from '@/lib/sort';
import { stitchClips } from '@/lib/stitch';
import { saveVideo } from '@/lib/videos';
import { sendDeliveryEmail, sendFailureEmail } from '@/lib/resend';
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

  after(async () => {
    try {
      const sortedUrls = await sortPhotoUrls(order.photoUrls);
      const runBudget = makeRunBudget(sortedUrls.length);
      const settled = await Promise.allSettled(sortedUrls.map(url => generateVideo(url, undefined, runBudget)));
      const clips = sortedUrls
        .map((_, i) => settled[i])
        .filter((s): s is PromiseFulfilledResult<string> => s.status === 'fulfilled')
        .map(s => s.value);

      if (!clips.length) throw new Error('All clips failed to generate');

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const absolute = (u: string) => (u.startsWith('/') ? `${appUrl}${u}` : u);

      const data = await stitchClips(clips);
      const videoUrl = absolute(await saveVideo(orderId, data));

      // customers get the individual clips too — persist each so links don't expire
      const persistedClips: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        try {
          const res = await fetch(clips[i]);
          if (!res.ok) throw new Error(`clip download ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          persistedClips.push(absolute(await saveVideo(`${orderId}-clip-${i + 1}`, buf)));
        } catch (err) {
          console.error(`[webhook] failed to persist clip ${i + 1}, using original URL:`, err);
          persistedClips.push(clips[i]);
        }
      }

      // videoUrls[0] = full stitched video, rest = individual clips
      await updateOrder(orderId, { status: 'completed', videoUrls: [videoUrl, ...persistedClips] });
      await sendDeliveryEmail({
        to: order.email,
        propertyAddress: order.propertyAddress,
        videoUrls: [videoUrl, ...persistedClips],
        orderId,
      });
    } catch (err) {
      console.error('Video generation failed:', err);
      await updateOrder(orderId, { status: 'failed', errorMessage: String(err) });
      await sendFailureEmail({ to: order.email, orderId });
    }
  });

  return NextResponse.json({ received: true });
}
