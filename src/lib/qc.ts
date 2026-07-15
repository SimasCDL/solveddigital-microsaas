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

const QC_PROMPT = `Image 1 is the SOURCE photo of a room/property. Images 2, 3 and 4 are frames from the START, MIDDLE and END of an AI-generated video that must start at the source photo and show ONLY smooth lateral camera movement through a completely still scene.

Judge these three things strictly:

1. MOTION — Do the frames show clear camera movement (the framing visibly shifts between start, middle and end)? Fail with category "static" if the three frames are nearly identical. Fail with category "zoom_only" if the end frame is merely a zoomed-in or zoomed-out crop of the start with no lateral movement.

2. FIDELITY — Compare the frames to the source photo. Fail with category "hallucination" if anything appears, disappears or changes that is not explained by camera movement: added/removed objects or furniture, people or animals, doors or drawers that opened, lights that turned on/off, materials or colors that changed, invented rooms or windows.

3. QUALITY — Fail with category "warping" if there is melted or bending geometry, warped straight lines (door frames, counters, windows), garbled textures, ghosting/double-exposure, or smeared artifacts.

Minor motion blur and small perspective changes from camera movement are NORMAL and fine. Only fail for clear problems a customer would notice.

Reply with ONLY strict JSON, no markdown fences:
{"pass": true/false, "category": "ok|static|zoom_only|hallucination|warping|other", "reason": "<one short sentence>"}`;

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
      max_tokens: 200,
      messages: [{ role: 'user', content }],
    });

    const textBlock = msg.content.find(b => b.type === 'text') as { text: string } | undefined;
    if (!textBlock) throw new Error('QC model returned no text block');
    const text = textBlock.text.trim().replace(/^```(json)?|```$/g, '');
    const parsed = JSON.parse(text) as QCVerdict;
    return {
      pass: !!parsed.pass,
      category: parsed.category ?? 'other',
      reason: parsed.reason ?? '',
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
