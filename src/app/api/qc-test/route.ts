import { NextRequest, NextResponse } from 'next/server';
import { qcClip } from '@/lib/qc';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (process.env.ADMIN_KEY && req.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { clipUrl, photoUrl } = await req.json();
  const verdict = await qcClip(clipUrl, photoUrl);
  return NextResponse.json(verdict);
}
