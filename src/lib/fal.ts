import { fal } from '@fal-ai/client';
import { qcClip, qcReelSegment, type QCVerdict } from './qc';
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

// --- Seedance 2.0 via Replicate (VIDEO_PROVIDER=seedance) ---

const REPLICATE_MODEL = 'bytedance/seedance-2.0';

const SEEDANCE_PROMPT = `Create a premium luxury real estate cinematic video using the uploaded image as the exact first frame. Preserve the uploaded image with over 99% visual fidelity. The camera should move, not the architecture.

THE MOST IMPORTANT RULE: every frame of the video must show only what is visible in the uploaded image. The camera must never travel, turn, or orbit far enough to reveal spaces outside the uploaded image — no new rooms, hallways, doorways, walls, windows, sides of the building, neighboring structures, or furniture may ever appear from beyond the edges of the original image. If a camera movement would reveal unseen space, keep the movement smaller instead. All camera motion stays within the boundaries of the original composition.

Maintain the exact architecture, layout, proportions, furniture, windows, doors, flooring, walls, ceilings, landscaping, pool, driveway, trees, materials, textures, colors, lighting, and composition. Do not redesign, replace, add, remove, or alter any architectural or interior elements.

Choose the SINGLE camera movement that best flatters this specific scene, filmed as if with a stabilized cinema camera or luxury real estate drone on a 24mm wide-angle lens: a slow cinematic forward dolly with subtle parallax when the image has strong depth or a clear vanishing point; a smooth lateral truck (the camera gliding sideways) when the scene is wide and extends horizontally, like a living room, kitchen or facade; or a gentle crane (rising or lowering) or very slight arc for large, open, high-ceilinged spaces. Let the composition motivate the move — do not default to a forward push every time. The movement must be small, refined, slow, stable and natural, and must never reveal space beyond the original image; if it would, make it smaller instead.

Add only realistic environmental motion: gently moving tree leaves, subtle grass movement, soft cloud movement, realistic sunlight and shadow changes, slight reflections on glass, gentle pool water ripples if visible, and subtle curtain movement if visible. Keep all motion minimal and realistic. Doors and drawers stay closed; lights stay exactly as they are; nothing opens, turns on, turns off, or changes state.

Lighting should remain bright, clean, natural daylight with HDR architectural photography quality and crisp details. Preserve the fine detail, sharpness, and texture of the original image throughout — no softening or loss of resolution.

Do not change furniture, decorations, landscaping, room layout, pool, driveway, windows, doors, or any architectural details. No people, pets, vehicles, text, logos, watermarks, camera shake, flickering, warping, melting, object deformation, hallucinated objects, invented off-screen spaces, exaggerated motion, or unrealistic effects.

Ultra photorealistic, premium luxury real estate commercial, architectural visualization, cinematic composition, HDR, 4K quality, stable camera, natural motion, elegant, modern, high-end property marketing.`;

/** Split sorted photos into near-equal groups of at most `maxPerChunk` (segment = one generation). */
export function chunkPhotos<T>(items: T[], maxPerChunk = 5): T[][] {
  const k = Math.max(1, Math.ceil(items.length / maxPerChunk));
  const base = Math.floor(items.length / k);
  let rem = items.length % k;
  const out: T[][] = [];
  let i = 0;
  for (let c = 0; c < k; c++) {
    const size = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem--;
    out.push(items.slice(i, i + size));
    i += size;
  }
  return out;
}

const REEL_PROMPT = `Create a premium luxury real estate video from the provided reference images, shown strictly IN ORDER: [Image1] first, then [Image2], and so on. Each reference image becomes its own shot with slow, smooth, perfectly stabilized cinematic camera movement, connected by clean professional cuts. Spend roughly equal time on each shot.

VARY THE CAMERA MOVEMENT FROM SHOT TO SHOT so the video feels dynamic and professionally edited — do NOT use the same forward push on every shot. For each shot, choose the single movement that best flatters that specific scene:
- A slow forward dolly / push-in for shots with strong depth, a hallway, or a clear vanishing point leading the eye inward.
- A smooth lateral truck (the camera gliding sideways, left-to-right or right-to-left) for wide scenes that extend horizontally — living rooms, kitchens, exteriors, wide facades.
- A gentle crane (rising or lowering) or a subtle slow arc for large, open, high-ceilinged spaces.
- An occasional slow tilt to take in ceiling height or a tall window.
Mix these across the shots — some forward, some sideways, some rising — like a real estate videographer choosing the best move for each room. Every movement stays slow, smooth and stabilized, like a heavy cinema camera on a dolly or gimbal.

THE MOST IMPORTANT RULE: every frame must show only what is visible in its reference image. Recreate each room or space EXACTLY as photographed: identical architecture, layout, proportions, furniture, windows, doors, flooring, walls, materials, textures, colors and lighting. Do not redesign, replace, add, remove or alter anything. No matter which movement is used — including lateral trucking and crane moves — NEVER move the camera far enough to reveal spaces beyond the edges of the reference image: no new rooms, hallways, doorways, walls, ceilings, sides of the building or furniture may ever appear from beyond the frame. If a movement would reveal unseen space, make that movement smaller and slower so it stays within the original composition.

The scene in every shot is completely frozen and still: no doors or drawers opening, no curtains moving, no lights changing, no objects moving or appearing, no people, no animals, no vehicles, no text, no watermarks. Only the camera moves. Add only minimal realistic environmental motion where already visible in the reference: gently moving leaves, soft clouds, subtle water ripples.

Sharp, crisp, ultra photorealistic, HDR architectural photography quality, premium luxury property marketing, natural daylight, no warping, no melting, no object deformation, no camera shake, no exaggerated motion.`;

/** One multi-photo segment: up to 5 reference photos → one video (~3s per photo). */
export async function generateReelSegment(
  photoUrls: string[],
  onProgress?: (msg: string) => void,
  runBudget?: RunBudget,
): Promise<string> {
  const duration = Math.min(15, Math.max(6, photoUrls.length * 3));
  let lastErr: unknown = new Error('No video URL returned from Replicate');
  let fallback: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) onProgress?.(`retrying (attempt ${attempt}/${MAX_ATTEMPTS})...`);
      if (runBudget) {
        if (runBudget.left <= 0) {
          if (fallback) return fallback;
          throw new Error('Run retry budget exhausted');
        }
        runBudget.left--;
      }
      await consumeClipBudget();

      const tok = process.env.REPLICATE_API_TOKEN!;
      const create = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            prompt: REEL_PROMPT,
            reference_images: photoUrls,
            duration,
            resolution: '1080p',
            aspect_ratio: '16:9',
            generate_audio: false,
            seed: Math.floor(Math.random() * 1_000_000),
          },
        }),
      });
      if (!create.ok) throw new Error(`Replicate create failed: ${create.status} ${await create.text()}`);
      let pred = await create.json();

      const deadline = Date.now() + 12 * 60 * 1000;
      while (pred.status === 'starting' || pred.status === 'processing') {
        if (Date.now() > deadline) throw new Error('Replicate generation timed out after 12 minutes');
        await new Promise(r => setTimeout(r, 5000));
        const res = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (!res.ok) throw new Error(`Replicate poll failed: ${res.status}`);
        pred = await res.json();
      }
      if (pred.status !== 'succeeded') {
        throw new Error(`Replicate generation ${pred.status}: ${JSON.stringify(pred.error ?? '')}`);
      }
      const out = pred.output;
      const url = typeof out === 'string' ? out : Array.isArray(out) ? out[0] : out?.url;
      if (!url || typeof url !== 'string') throw new Error('Replicate returned no video URL');

      onProgress?.('quality check...');
      let verdict: QCVerdict;
      try {
        verdict = await qcReelSegment(url, photoUrls);
      } catch (qcErr) {
        console.error('[reel] QC errored, accepting segment unchecked:', qcErr);
        return url;
      }
      if (verdict.pass) return url;

      console.warn(`[reel] QC rejected segment (${verdict.category}): ${verdict.reason} — regenerating`);
      onProgress?.(`quality check failed (${verdict.category}) — regenerating...`);
      lastErr = new Error(`Quality check failed: ${verdict.reason}`);
      if (verdict.category !== 'hallucination') fallback = url;
    } catch (err) {
      lastErr = err;
      console.error(`[reel] segment attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
    }
  }
  if (fallback) {
    console.warn('[reel] all attempts failed QC, delivering least-bad segment');
    return fallback;
  }
  throw lastErr;
}

async function generateSeedanceClip(photoUrl: string, seed: number): Promise<string> {
  const tok = process.env.REPLICATE_API_TOKEN!;
  const create = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        prompt: SEEDANCE_PROMPT,
        image: photoUrl,
        duration: 6,
        resolution: '1080p',
        aspect_ratio: '16:9',
        generate_audio: false,
        seed,
      },
    }),
  });
  if (!create.ok) throw new Error(`Replicate create failed: ${create.status} ${await create.text()}`);
  let pred = await create.json();

  const deadline = Date.now() + 12 * 60 * 1000;
  while (pred.status === 'starting' || pred.status === 'processing') {
    if (Date.now() > deadline) throw new Error('Replicate generation timed out after 12 minutes');
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) throw new Error(`Replicate poll failed: ${res.status}`);
    pred = await res.json();
  }

  if (pred.status !== 'succeeded') {
    throw new Error(`Replicate generation ${pred.status}: ${JSON.stringify(pred.error ?? '')}`);
  }
  const out = pred.output;
  const url = typeof out === 'string' ? out : Array.isArray(out) ? out[0] : out?.url;
  if (!url || typeof url !== 'string') throw new Error('Replicate returned no video URL');
  return url;
}

const PROMPT = 'Smooth cinematic camera movement through exactly the scene in the photo. The camera is free to move however best suits the scene — glide forward into the space, drift sideways, arc gently — as long as the motion is slow, buttery smooth and perfectly stabilized, like a heavy cinema camera on a dolly. THE ONE ABSOLUTE RULE: everything shown on screen must actually exist in the original photo. The camera must never travel far enough to reveal spaces outside the photo — no new rooms, hallways, doorways, walls, windows or furniture may ever appear from beyond the photo edges. The scene itself is completely frozen and still, like an empty staged home: nothing moves, changes, opens, or appears. No doors open. No drawers open. No curtains or blinds move. No lights turn on or off. No objects, people, or animals enter the frame. Every object, surface, and detail stays exactly as it is in the photo — do not add, change, or invent anything. Only the camera moves. Sharp and crisp, preserve every fine detail and texture of the original photo. Photorealistic. No people. No text.';

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

      const seed = Math.floor(Math.random() * 1_000_000);
      let url: string | undefined;

      if (process.env.VIDEO_PROVIDER === 'seedance' && process.env.REPLICATE_API_TOKEN) {
        url = await generateSeedanceClip(photoUrl, seed);
      } else {
        const result = await fal.subscribe(MODEL, {
          input: {
            prompt: PROMPT,
            negative_prompt: 'new rooms appearing, revealing space beyond the photo, hallways appearing from off-screen, doors opening, drawers opening, objects moving, curtains moving, people appearing, animals, lights changing, flickering, new objects appearing, morphing, changing scenery, fast zoom, crash zoom, whip pan, fast camera movement, static shot, no movement, camera shake, blur, soft focus, distortion, watermark, text, people, artifacts, low quality',
            image_url: photoUrl,
            duration: '6s',
            // '4k' is supported by the API; the client's typings are just outdated
            resolution: '4k' as unknown as '1080p',
            aspect_ratio: '16:9',
            generate_audio: false,
            seed,
          },
        });
        url = (result.data as { video?: { url: string } })?.video?.url;
      }

      if (!url) {
        lastErr = new Error('No video URL returned from the provider');
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
