import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { v4 as uuid } from 'uuid';
import { createOrder } from '@/lib/orders';
import { fulfillOrder } from '@/lib/fulfill';
import { sendTelegram } from '@/lib/telegram';
import {
  checkFreeTrialEligible,
  clientIp,
  hashIp,
  recordFreeTrial,
  type Segment,
} from '@/lib/freeTrial';
import type { Order } from '@/lib/types';

fal.config({ credentials: process.env.FAL_KEY! });

export const maxDuration = 800;

/** The whole point of the free tier: a 2-photo taste, not a usable listing tour. */
const FREE_PHOTOS = 2;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const SEGMENTS: Segment[] = ['agent', 'homeowner'];

const DENIAL_MESSAGE: Record<string, string> = {
  email_used:
    'This email has already used its free tour. Grab a pack to make more — they start at $105.',
  ip_limit:
    'That’s a few free tours from this connection already. Grab a pack to keep going.',
  daily_cap:
    'We’ve hit today’s free-tour limit. Try again tomorrow, or grab a pack to go now.',
  unavailable:
    'Free tours are unavailable right now. Please try again shortly.',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('photos') as File[];
    const email = ((formData.get('email') as string) || '').trim();
    const segment = (formData.get('segment') as string) || '';

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
    }
    if (!SEGMENTS.includes(segment as Segment)) {
      return NextResponse.json({ error: 'Please tell us which one you are.' }, { status: 400 });
    }
    if (!files.length) {
      return NextResponse.json({ error: 'Add your photos first.' }, { status: 400 });
    }

    const ipHash = hashIp(clientIp(req.headers));

    // Guard BEFORE spending anything on uploads or generation.
    const eligible = await checkFreeTrialEligible(email, ipHash);
    if (!eligible.ok) {
      return NextResponse.json(
        { error: DENIAL_MESSAGE[eligible.reason], reason: eligible.reason },
        { status: 429 },
      );
    }

    // Hard-cap at 2 photos server-side — the client cap is only cosmetic.
    const valid = files
      .filter((f) => f.type.startsWith('image/') && f.size > 0 && f.size <= MAX_FILE_BYTES)
      .slice(0, FREE_PHOTOS);
    if (!valid.length) {
      return NextResponse.json({ error: 'No valid image files' }, { status: 400 });
    }

    const orderId = uuid();

    // Claim the free trial before generating. Awaited (not fire-and-forget) so
    // two simultaneous submissions can't both slip through the check above.
    try {
      await recordFreeTrial({ email, segment: segment as Segment, orderId, ipHash });
    } catch (err) {
      console.error('[free] could not record trial — refusing to generate:', err);
      return NextResponse.json(
        { error: DENIAL_MESSAGE.unavailable, reason: 'unavailable' },
        { status: 429 },
      );
    }

    const photoUrls = await Promise.all(valid.map((file) => fal.storage.upload(file)));

    const now = new Date().toISOString();
    const order: Order = {
      id: orderId,
      email,
      propertyAddress: '',
      photoUrls,
      music: true,
      status: 'processing',
      // No Stripe session exists for a free tour. This marker records HOW the
      // order was paid for and is what /api/status uses to tell the order page
      // it's a trial (so it fires StartTrial, not the purchase Lead event). It
      // can never collide with countOrdersBySession, which matches `cs_...` ids.
      stripeSessionId: `free:${segment}`,
      createdAt: now,
      updatedAt: now,
    };
    await createOrder(order);

    // Alert first, and independently guarded: the lead is worth more than the
    // video, so a fulfillment blow-up must never take the notification with it.
    after(() =>
      sendTelegram(
        `🎬 *Free trial* · ${segment === 'agent' ? 'Agent' : 'Homeowner'}\n📧 ${email}\n📸 ${photoUrls.length} photos`,
      ).catch(() => {}),
    );
    after(() =>
      fulfillOrder(orderId).catch((err) =>
        console.error(`[free] fulfillment failed for ${orderId}:`, err),
      ),
    );

    return NextResponse.json({ orderId });
  } catch (err) {
    console.error('[free] request failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
