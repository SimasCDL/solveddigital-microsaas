import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const FILE = join(process.cwd(), '.orders', 'usage.json');

/**
 * Hard daily cap on video generations — a backstop against any future bug that
 * could loop generation. Every fal video call must pass through this first.
 * Throws once the daily limit is hit; raise DAILY_CLIP_LIMIT in .env.local
 * intentionally, never automatically.
 */
export async function consumeClipBudget(): Promise<void> {
  const limit = Number(process.env.DAILY_CLIP_LIMIT || 60);
  const today = new Date().toISOString().slice(0, 10);

  let data = { date: today, clips: 0 };

  let raw: string | null = null;
  try {
    raw = await readFile(FILE, 'utf-8');
  } catch {
    raw = null; // file doesn't exist yet — first run, counter starts at 0
  }

  if (raw !== null) {
    try {
      // strip UTF-8 BOM (e.g. from PowerShell edits) before parsing
      const parsed = JSON.parse(raw.replace(/^﻿/, '').trim());
      if (parsed?.date === today && Number.isFinite(parsed.clips)) {
        data = { date: today, clips: parsed.clips };
      } else if (parsed?.date === undefined || !Number.isFinite(parsed?.clips)) {
        throw new Error('missing fields');
      }
      // a parsed file with an older date is a legitimate new day → counter resets
    } catch (err) {
      // fail CLOSED: a corrupt counter must never silently reset the budget
      console.error('[budget] usage.json is unreadable — refusing to generate:', err);
      throw new Error('Generation budget file is corrupt — fix or delete .orders/usage.json to continue.');
    }
  }

  if (data.clips >= limit) {
    throw new Error(
      `Daily generation limit reached (${limit} clips). This is a cost-protection stop — ` +
      `raise DAILY_CLIP_LIMIT in .env.local if this is intentional.`
    );
  }

  data.clips++;
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(data));
  console.log(`[budget] clip ${data.clips}/${limit} today`);
}
