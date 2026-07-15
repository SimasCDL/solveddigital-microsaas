import { fal } from '@fal-ai/client';
import { qcClip, type QCVerdict } from './qc';
import { consumeClipBudget } from './budget';
import { writeFile, readFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

fal.config({ credentials: process.env.FAL_KEY! });

const execFileAsync = promisify(execFile);

/** Grab the final frame of a generated clip and host it on fal storage — used to
 *  start the next connector clip exactly where the room pan ended. */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  const dir = join(tmpdir(), `frame-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Failed to download clip for frame extraction: ${res.status}`);
    const inPath = join(dir, 'in.mp4');
    await writeFile(inPath, Buffer.from(await res.arrayBuffer()));

    const outPath = join(dir, 'last.jpg');
    const ffmpegBin = join(
      process.cwd(),
      'node_modules', 'ffmpeg-static',
      process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
    );
    await execFileAsync(ffmpegBin, ['-sseof', '-0.2', '-i', inPath, '-frames:v', '1', '-q:v', '2', outPath]);

    const jpg = await readFile(outPath);
    return await fal.storage.upload(new File([new Uint8Array(jpg)], 'last-frame.jpg', { type: 'image/jpeg' }));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Max generation attempts per clip (1 initial + retries when QC rejects or fal errors)
const MAX_ATTEMPTS = 4;

const MODEL = 'fal-ai/veo3.1/image-to-video';

const PROMPT = 'Smooth horizontal camera slide from left to right (or right to left). The camera physically moves sideways across the scene — even if the scene appears flat or simple, the camera must still visibly travel laterally so elements shift and scroll across the frame. Do NOT zoom in. Do NOT push forward. Do NOT stay static. The camera slides sideways the entire duration. Visible lateral parallax motion throughout. Like a camera on a long slider rail. ABSOLUTE RULE: the scene itself is completely frozen and still, like an empty staged home. Nothing in the scene moves, changes, opens, or appears. No doors open. No drawers open. No curtains or blinds move. No lights turn on or off. No objects, people, or animals enter the frame. Every object, surface, and detail stays exactly as it is in the photo — do not add, change, or invent anything. The ONLY movement in the entire video is the camera sliding sideways. Photorealistic. No people. No text.';

// Walking shots between rooms: Kling 3.0 Pro start+end frame. Veo's frame-to-frame
// mode cross-dissolves when endpoints are spatially distant (verified on real output);
// Kling 3.0 physically walks the camera between the anchor frames instead.
const WALK_MODEL = 'fal-ai/kling-video/v3/pro/image-to-video';

const WALKTHROUGH_PROMPT = 'Professional real estate walkthrough footage, one single continuous steadicam shot with no cuts. The camera begins exactly at the first frame, glides forward at a slow steady walking pace through the home, turning naturally where needed, and arrives exactly at the last frame. The camera moves ONLY through open space, visible doorways and openings — it NEVER passes through walls, windows, furniture, or any solid object, exactly like a real person walking. Buttery smooth stabilized gimbal motion, constant speed, eye-level height. Photorealistic interior, consistent architecture, flooring and furniture throughout — do not add, change, or invent anything not visible in the frames. Completely still scene: no people, no pets, no doors moving, no objects changing, no text. Only the camera moves.';

const NEGATIVE_PROMPT = 'passing through walls, clipping through objects, teleporting, doors opening, drawers opening, objects moving, curtains moving, people appearing, animals, lights changing, flickering, new objects appearing, morphing, changing scenery, cross dissolve, fade transition, cuts, camera shake, blur, distortion, watermark, text, people, artifacts, low quality';

export async function generateTransitionClip(startUrl: string, endUrl: string, pathHint?: string): Promise<string> {
  const prompt = pathHint?.trim()
    ? `${WALKTHROUGH_PROMPT} Camera route for this shot: ${pathHint.trim()}`
    : WALKTHROUGH_PROMPT;
  let lastErr: unknown = new Error('No video URL returned from fal.ai');
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await consumeClipBudget();
      const result = await fal.subscribe(WALK_MODEL, {
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          start_image_url: startUrl,
          end_image_url: endUrl,
          duration: '5',
          generate_audio: false,
        },
      });
      const url = (result.data as { video?: { url: string } })?.video?.url;
      if (url) return url;
    } catch (err) {
      lastErr = err;
      console.error(`[fal] generateTransitionClip attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
    }
  }
  throw lastErr;
}

/**
 * Generate one room clip with automatic quality control: each candidate clip is
 * inspected by Claude (motion present, no hallucinated content, no warping) and
 * regenerated with a fresh seed if it fails. Hallucinating clips are never
 * delivered; if all attempts fail QC for motion-style reasons only, the least-bad
 * candidate is returned rather than dropping the room.
 */
/** Shared per-run generation allowance: caps how much one video run can spend on retries. */
export interface RunBudget { left: number }

export const makeRunBudget = (photos: number): RunBudget => ({
  // every photo gets its 1 generation plus a shared retry pool of ~50%
  left: photos + Math.ceil(photos * 0.5),
});

export async function generateVideo(photoUrl: string, onProgress?: (msg: string) => void, runBudget?: RunBudget): Promise<string> {
  let lastErr: unknown = new Error('No video URL returned from fal.ai');
  let fallback: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) onProgress?.(`retrying (attempt ${attempt}/${MAX_ATTEMPTS})...`);
      if (runBudget) {
        if (runBudget.left <= 0) {
          // retry pool for this run is spent — deliver the least-bad candidate or give up
          if (fallback) return fallback;
          throw new Error('Run retry budget exhausted');
        }
        runBudget.left--;
      }
      await consumeClipBudget();
      const result = await fal.subscribe(MODEL, {
        input: {
          prompt: PROMPT,
          negative_prompt: 'doors opening, drawers opening, objects moving, curtains moving, people appearing, animals, lights changing, flickering, new objects appearing, morphing, changing scenery, zoom in, zoom out, push in, dolly in, static shot, no movement, camera shake, blur, distortion, watermark, text, people, artifacts, low quality',
          image_url: photoUrl,
          duration: '6s',
          resolution: '1080p',
          aspect_ratio: '16:9',
          generate_audio: false,
          seed: Math.floor(Math.random() * 1_000_000),
        },
      });
      const url = (result.data as { video?: { url: string } })?.video?.url;
      if (!url) {
        lastErr = new Error('No video URL returned from fal.ai');
        continue;
      }

      onProgress?.('quality check...');
      let verdict: QCVerdict;
      try {
        verdict = await qcClip(url, photoUrl);
      } catch (qcErr) {
        // QC infrastructure failure must not block delivery of a generated clip
        console.error('[fal] QC errored, accepting clip unchecked:', qcErr);
        return url;
      }

      if (verdict.pass) return url;

      console.warn(`[fal] QC rejected clip (${verdict.category}): ${verdict.reason} — regenerating`);
      onProgress?.(`quality check failed (${verdict.category}) — regenerating...`);
      lastErr = new Error(`Quality check failed: ${verdict.reason}`);
      // a static/zoomy clip can serve as last resort; a hallucinating clip cannot
      if (verdict.category !== 'hallucination') fallback = url;
    } catch (err) {
      lastErr = err;
      console.error(`[fal] generateVideo attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
    }
  }

  if (fallback) {
    console.warn('[fal] all attempts failed QC, delivering least-bad candidate');
    return fallback;
  }
  throw lastErr;
}
