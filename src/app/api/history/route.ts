import { NextRequest, NextResponse } from 'next/server';
import { listHistory, saveHistoryEntry } from '@/lib/history';
import { signVideoUrl } from '@/lib/videos';

export async function GET() {
  try {
    const entries = await listHistory();
    // videos bucket is private — sign stored URLs so the admin panel can play them
    const signed = await Promise.all(
      entries.map(async e => ({
        ...e,
        videoUrl: e.videoUrl ? await signVideoUrl(e.videoUrl, 60 * 60) : e.videoUrl,
      }))
    );
    return NextResponse.json({ entries: signed });
  } catch (err) {
    console.error('[history]', err);
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const entry = await req.json();
    if (!entry?.id || !Array.isArray(entry.clipUrls)) {
      return NextResponse.json({ error: 'Bad entry' }, { status: 400 });
    }
    await saveHistoryEntry(entry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[history]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
