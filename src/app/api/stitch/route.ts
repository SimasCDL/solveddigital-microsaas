import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { stitchClips } from '@/lib/stitch';
import { saveVideo } from '@/lib/videos';

export const maxDuration = 800;

export async function POST(req: NextRequest) {
  try {
    const { urls }: { urls: string[] } = await req.json();
    if (!urls?.length) {
      return NextResponse.json(
        { error: 'No clips to merge — every clip failed to generate. Please try again.' },
        { status: 400 },
      );
    }

    const data = await stitchClips(urls);
    const id = randomUUID();
    const url = await saveVideo(id, data);

    return NextResponse.json({ id, url });
  } catch (err) {
    console.error('[stitch]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
