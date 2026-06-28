import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createOrder } from '@/lib/orders';
import type { Order } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('photos') as File[];
    const email = formData.get('email') as string;
    const propertyAddress = formData.get('propertyAddress') as string;

    if (!files.length || !email || !propertyAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const photoUrls: string[] = [];
    for (const file of files.slice(0, 10)) {
      const { url } = await put(`photos/${uuid()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: false,
      });
      photoUrls.push(url);
    }

    const orderId = uuid();
    const order: Order = {
      id: orderId,
      email,
      propertyAddress,
      photoUrls,
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
