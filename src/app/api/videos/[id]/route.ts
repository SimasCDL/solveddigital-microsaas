import { readLocalVideo } from '@/lib/videos';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return new Response('Bad id', { status: 400 });

  const data = await readLocalVideo(id);
  if (!data) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'inline; filename="walkthrough.mp4"',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
