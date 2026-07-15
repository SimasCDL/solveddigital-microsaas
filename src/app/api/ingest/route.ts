import { NextRequest, NextResponse } from 'next/server';
import { extractListingPhotos } from '@/lib/listing';

export async function POST(req: NextRequest) {
  if (process.env.ADMIN_KEY && req.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { url } = await req.json();
    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'No listing URL' }, { status: 400 });
    }

    const photoUrls = await extractListingPhotos(url);
    if (!photoUrls.length) {
      return NextResponse.json({ error: 'No photos found on that listing page' }, { status: 422 });
    }
    return NextResponse.json({ photoUrls });
  } catch (err) {
    console.error('[ingest] failed:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Ingest failed' }, { status: 500 });
  }
}
