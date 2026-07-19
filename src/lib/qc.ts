import Anthropic from '@anthropic-ai/sdk';
import { writeFile, readFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const ffmpegBin = () =>
  join(
    process.cwd(),
    'node_modules', 'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
  );

export interface QCVerdict {
  pass: boolean;
  category: 'ok' | 'static' | 'zoom_only' | 'hallucination' | 'warping' | 'other';
  reason: string;
}

const QC_PROMPT = `Image 1 is the SOURCE photo of a room/property. Images 2, 3 and 4 are frames from the START, MIDDLE and END of an AI-generated video that must start at the source photo and show ONLY a slow, smooth, professional camera movement through a completely still scene, staying within the space visible in the source photo. The movement may be a forward glide/push-in, a lateral truck (gliding sideways), a gentle crane (rising or lowering), or a slight arc — any of these is good.

Judge these things strictly:

1. MOTION — Do the frames show smooth camera movement (the framing shifts between start, middle and end)? Fail with category "static" if the three frames are nearly identical. Any slow smooth professional move — forward push-in, sideways lateral truck, crane up/down, or slight arc — is GOOD and passes. Only fail with "zoom_only" if it looks like a cheap flat digital crop-zoom with no depth or parallax.

2. STAYS INSIDE THE PHOTO — This is the most important check. The END frame must show only space that is visible (even partially) in the source photo. Fail with category "hallucination" if the camera traveled beyond the photo's edges into invented space: new rooms, hallways, doorways, walls, windows, or furniture that are NOT in the source photo. The camera "explaining" it by moving there does NOT excuse it — anything not in the source photo is invented. Small slivers of extended wall or floor at the very edges are acceptable; whole new areas or rooms are not.

3. FIDELITY — Fail with category "hallucination" if anything inside the original view appears, disappears or changes: added/removed objects or furniture, people or animals, doors or drawers that opened, lights that turned on/off, materials or colors that changed.

4. QUALITY — Fail with category "warping" if there is melted or bending geometry, warped straight lines (door frames, counters, windows), garbled textures, ghosting/double-exposure, or smeared artifacts.

Minor motion blur and small perspective shifts are NORMAL and fine.

Reply with ONLY strict JSON, no markdown fences:
{"pass": true/false, "category": "ok|static|zoom_only|hallucination|warping|other", "reason": "<one short sentence>"}`;

const REEL_QC_PROMPT = `The first images are the SOURCE photos of rooms/spaces of one property. The following images are frames sampled across an AI-generated video reel that must show these exact spaces as separate shots, in order, with slow smooth camera movement and clean cuts.

Judge strictly:

1. MOTION — Frames within a shot should show gentle camera movement. Fail "static" only if the whole video appears to be still images.

2. STAYS TRUE TO THE SOURCES — the most important check. Every video frame must clearly correspond to one of the source photos: same room, same architecture, same furniture, same materials and colors. Fail "hallucination" if any frame shows a room, space, or major object that does not match ANY source photo, or if rooms were redesigned (different furniture, changed layout, invented windows/doors), or if the camera traveled into space not visible in the sources.

3. FIDELITY — Fail "hallucination" for people, animals, doors/drawers that opened, lights changed, objects added or removed relative to the sources.

4. QUALITY — Fail "warping" for melted/bending geometry, warped straight lines, garbled textures, ghosting or smearing.

Minor motion blur, small perspective shifts, and clean cuts between shots are NORMAL and fine.

Reply with ONLY strict JSON, no markdown fences:
{"pass": true/false, "category": "ok|static|zoom_only|hallucination|warping|other", "reason": "<one short sentence>"}`;

/** QC a multi-photo reel segment: sample frames across the video, judge against ALL source photos. */
export async function qcReelSegment(clipUrl: string, sourcePhotoUrls: string[]): Promise<QCVerdict> {
  const dir = join(tmpdir(), `qc-${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    const res = await fetch(clipUrl);
    if (!res.ok) throw new Error(`Failed to download segment for QC: ${res.status}`);
    const clipPath = join(dir, 'clip.mp4');
    await writeFile(clipPath, Buffer.from(await res.arrayBuffer()));

    // one frame roughly every 2.5s across the segment
    const frameCount = Math.min(6, Math.max(3, sourcePhotoUrls.length + 1));
    await execFileAsync(ffmpegBin(), [
      '-i', clipPath,
      '-vf', `fps=${frameCount}/15,scale=640:-1`,
      '-frames:v', String(frameCount),
      join(dir, 'f%d.jpg'),
    ]);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const content: any[] = [];
    for (let i = 0; i < sourcePhotoUrls.length; i++) {
      const pRes = await fetch(sourcePhotoUrls[i]);
      if (!pRes.ok) throw new Error(`Failed to download source photo ${i + 1} for QC`);
      const b64 = Buffer.from(await pRes.arrayBuffer()).toString('base64');
      const mt = (pRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
      content.push({ type: 'text', text: `SOURCE photo ${i + 1}:` });
      content.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } });
    }
    for (let i = 1; i <= frameCount; i++) {
      try {
        const frame = await readFile(join(dir, `f${i}.jpg`));
        content.push({ type: 'text', text: `VIDEO frame ${i}:` });
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame.toString('base64') } });
      } catch { /* fewer frames than requested — fine */ }
    }
    content.push({ type: 'text', text: REEL_QC_PROMPT });

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });

    const textBlock = msg.content.find(b => b.type === 'text') as { text: string } | undefined;
    if (!textBlock) throw new Error('QC model returned no text block');
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`QC model returned no JSON: ${textBlock.text.slice(0, 120)}`);
    const parsed = JSON.parse(jsonMatch[0]) as QCVerdict;
    return {
      pass: !!parsed.pass,
      category: parsed.category ?? 'other',
      reason: parsed.reason ?? '',
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Extract start/middle/end frames from a clip and have Claude judge it against the source photo. */
export async function qcClip(clipUrl: string, sourcePhotoUrl: string): Promise<QCVerdict> {
  const dir = join(tmpdir(), `qc-${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    const res = await fetch(clipUrl);
    if (!res.ok) throw new Error(`Failed to download clip for QC: ${res.status}`);
    const clipPath = join(dir, 'clip.mp4');
    await writeFile(clipPath, Buffer.from(await res.arrayBuffer()));

    // start (0.2s), middle (50%), end (last ~0.3s)
    await execFileAsync(ffmpegBin(), ['-ss', '0.2', '-i', clipPath, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=768:-1', join(dir, 'f1.jpg')]);
    await execFileAsync(ffmpegBin(), ['-ss', '3', '-i', clipPath, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=768:-1', join(dir, 'f2.jpg')]);
    await execFileAsync(ffmpegBin(), ['-sseof', '-0.3', '-i', clipPath, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=768:-1', join(dir, 'f3.jpg')]);

    const frames = await Promise.all(
      ['f1.jpg', 'f2.jpg', 'f3.jpg'].map(async f => (await readFile(join(dir, f))).toString('base64'))
    );

    // download the source photo ourselves — Anthropic's URL fetcher is blocked
    // by many image hosts' robots.txt, base64 always works
    const photoRes = await fetch(sourcePhotoUrl);
    if (!photoRes.ok) throw new Error(`Failed to download source photo for QC: ${photoRes.status}`);
    const photoB64 = Buffer.from(await photoRes.arrayBuffer()).toString('base64');
    const photoType = (photoRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/webp';

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const content: any[] = [
      { type: 'text', text: 'Image 1 (SOURCE photo):' },
      { type: 'image', source: { type: 'base64', media_type: photoType, data: photoB64 } },
    ];
    frames.forEach((b64, i) => {
      content.push({ type: 'text', text: `Image ${i + 2} (${['START', 'MIDDLE', 'END'][i]} frame):` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
    });
    content.push({ type: 'text', text: QC_PROMPT });

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });

    const textBlock = msg.content.find(b => b.type === 'text') as { text: string } | undefined;
    if (!textBlock) throw new Error('QC model returned no text block');
    // extract the JSON object even if the model wrapped it in prose or fences
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`QC model returned no JSON: ${textBlock.text.slice(0, 120)}`);
    const parsed = JSON.parse(jsonMatch[0]) as QCVerdict;
    return {
      pass: !!parsed.pass,
      category: parsed.category ?? 'other',
      reason: parsed.reason ?? '',
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
