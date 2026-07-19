import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = join(process.cwd(), '.orders', 'videos');

const useSupabase = () =>
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Persist a stitched video. Returns a URL the browser can play/download.
 *  If Supabase is unreachable (paused project, DNS, outage), falls back to
 *  local storage so a finished (paid) video is never lost. */
export async function saveVideo(id: string, data: Buffer): Promise<string> {
  if (useSupabase()) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/videos/${id}.mp4`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'video/mp4',
          'x-upsert': 'true',
        },
        body: new Uint8Array(data),
      });
      if (!res.ok) throw new Error(`Supabase storage upload failed: ${res.status} ${await res.text()}`);
      return `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${id}.mp4`;
    } catch (err) {
      console.error('[videos] Supabase unreachable, saving locally instead:', err);
    }
  }
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`videos/${id}.mp4`, data, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false,
    });
    return blob.url;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, `${id}.mp4`), data);
  return `/api/videos/${id}`;
}

export async function readLocalVideo(id: string): Promise<Buffer | null> {
  try {
    return await readFile(join(LOCAL_DIR, `${id}.mp4`));
  } catch {
    return null;
  }
}

/** Turn a stored Supabase video URL into a signed URL that expires.
 *  The videos bucket is PRIVATE — the permanent object URL stored on the order
 *  is only reachable through links signed here (email links get 7 days, order
 *  page playback gets shorter ones). Non-Supabase URLs pass through unchanged. */
export async function signVideoUrl(url: string, expiresInSeconds: number): Promise<string> {
  const base = process.env.SUPABASE_URL;
  if (!base || !url.startsWith(base)) return url;

  const match = url.match(/\/storage\/v1\/object\/(?:public\/)?videos\/(.+)$/);
  if (!match) return url;
  const objectPath = match[1];

  try {
    const res = await fetch(`${base}/storage/v1/object/sign/videos/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!res.ok) throw new Error(`sign failed: ${res.status} ${await res.text()}`);
    const { signedURL } = (await res.json()) as { signedURL: string };
    return `${base}/storage/v1${signedURL}`;
  } catch (err) {
    console.error('[videos] signing failed, returning stored URL:', err);
    return url;
  }
}

export const signVideoUrls = (urls: string[], expiresInSeconds: number) =>
  Promise.all(urls.map(u => signVideoUrl(u, expiresInSeconds)));
