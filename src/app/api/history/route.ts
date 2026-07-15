import { NextRequest, NextResponse } from 'next/server';
import { listHistory, saveHistoryEntry } from '@/lib/history';

export async function GET() {
  try {
    return NextResponse.json({ entries: await listHistory() });
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
