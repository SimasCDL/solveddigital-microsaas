import { fal } from '@fal-ai/client';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createOrder } from '@/lib/orders';
import type { Order } from '@/lib/types';

fal.config({ credentials: process.env.FAL_KEY! });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('photos') as File[];
    const email = formData.get('email') as string;
    // property address is optional — kept for support labelling if provided
    const propertyAddress = (formData.get('propertyAddress') as string) || '';
    const music = formData.get('music') === 'true';

    if (!files.length || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // up to 40 photos (the $150 pack) — uploaded in parallel
    const photoUrls = await Promise.all(
      files.slice(0, 40).map(file => fal.storage.upload(file))
    );

    const orderId = uuid();
    const order: Order = {
      id: orderId,
      email,
      propertyAddress,
      photoUrls,
      music,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createOrder(order);

    return NextResponse.json({ orderId, photoCount: photoUrls.length });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
