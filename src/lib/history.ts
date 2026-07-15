import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  rooms: string[];
  thumbnails: string[];
  photoUrls?: string[];
  clipUrls: string[];
  videoUrl?: string;
}

const LOCAL_DIR = join(process.cwd(), '.orders', 'history');

const useSupabase = () =>
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sbFetch(path: string, init?: RequestInit & { headers?: Record<string, string> }) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  if (useSupabase()) {
    try {
      await sbFetch('/generations', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: entry.id,
          created_at: new Date(entry.timestamp).toISOString(),
          rooms: entry.rooms,
          thumbnails: entry.thumbnails,
          photo_urls: entry.photoUrls ?? [],
          clip_urls: entry.clipUrls,
          video_url: entry.videoUrl ?? null,
        }),
      });
      return;
    } catch (err) {
      console.error('[history] Supabase unreachable, saving locally instead:', err);
    }
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, `${entry.id}.json`), JSON.stringify(entry));
}

export async function listHistory(limit = 30): Promise<HistoryEntry[]> {
  if (useSupabase()) {
    try {
      const res = await sbFetch(`/generations?select=*&order=created_at.desc&limit=${limit}`);
      const rows: Array<{
        id: string; created_at: string; rooms: string[]; thumbnails: string[];
        photo_urls: string[]; clip_urls: string[]; video_url: string | null;
      }> = await res.json();
      return rows.map(r => ({
        id: r.id,
        timestamp: new Date(r.created_at).getTime(),
        rooms: r.rooms ?? [],
        thumbnails: r.thumbnails ?? [],
        photoUrls: r.photo_urls ?? [],
        clipUrls: r.clip_urls ?? [],
        videoUrl: r.video_url ?? undefined,
      }));
    } catch (err) {
      console.error('[history] Supabase unreachable, reading local history instead:', err);
    }
  }
  try {
    const files = await readdir(LOCAL_DIR);
    const entries = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => JSON.parse(await readFile(join(LOCAL_DIR, f), 'utf-8')) as HistoryEntry)
    );
    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  } catch {
    return [];
  }
}
