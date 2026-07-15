import { writeFile, readFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY! });

const execFileAsync = promisify(execFile);

// Turbopack mangles require('ffmpeg-static') paths — resolve from cwd instead
const ffmpegBin = () =>
  join(
    process.cwd(),
    'node_modules', 'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
  );

export async function stitchClips(urls: string[]): Promise<Buffer> {
  if (!urls.length) throw new Error('No clips to stitch');

  const dir = join(tmpdir(), `stitch-${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    const clipPaths: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const res = await fetch(urls[i]);
      if (!res.ok) throw new Error(`Failed to download clip ${i + 1}: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const p = join(dir, `clip${i}.mp4`);
      await writeFile(p, buf);
      clipPaths.push(p);
    }

    // Normalize every clip to 1920x1080 16:9 at the models' native 24fps;
    // 60fps comes from GPU frame interpolation (Topaz) after the concat.
    const inputs = clipPaths.flatMap(p => ['-i', p]);
    const norm = clipPaths
      .map((_, i) => `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`)
      .join(';');
    const concat = clipPaths.map((_, i) => `[v${i}]`).join('') + `concat=n=${clipPaths.length}:v=1:a=0[outv]`;

    const outputPath = join(dir, 'output.mp4');
    await execFileAsync(ffmpegBin(), [
      ...inputs,
      '-filter_complex', `${norm};${concat}`,
      '-map', '[outv]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      outputPath,
    ], { maxBuffer: 1024 * 1024 * 64 });

    const stitched = await readFile(outputPath);

    // Real 60fps via Topaz GPU frame interpolation ($0.04/video-second).
    // If it fails, deliver the 24fps version rather than failing the order.
    let final: Buffer = stitched;
    try {
      final = await interpolateTo60(stitched);
    } catch (err) {
      console.error('[stitch] 60fps interpolation failed, delivering 24fps:', err);
    }

    // Topaz output is very high bitrate; Supabase free tier caps objects at 50MB.
    return await compressToLimit(dir, final);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

const SIZE_LIMIT = 45 * 1024 * 1024; // stay safely under Supabase's 50MB object cap

async function compressToLimit(dir: string, data: Buffer): Promise<Buffer> {
  if (data.length <= SIZE_LIMIT) return data;

  const inPath = join(dir, 'final-in.mp4');
  await writeFile(inPath, data);

  let smallest = data;
  for (const crf of [23, 27, 31]) {
    const outPath = join(dir, `final-crf${crf}.mp4`);
    await execFileAsync(ffmpegBin(), [
      '-y', '-i', inPath,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      outPath,
    ], { maxBuffer: 1024 * 1024 * 64 });
    const out = await readFile(outPath);
    console.log(`[stitch] compressed crf${crf}: ${(out.length / 1024 / 1024).toFixed(1)}MB`);
    if (out.length < smallest.length) smallest = out;
    if (out.length <= SIZE_LIMIT) return out;
  }
  return smallest;
}

async function interpolateTo60(data: Buffer): Promise<Buffer> {
  const videoUrl = await fal.storage.upload(
    new File([new Uint8Array(data)], 'stitched.mp4', { type: 'video/mp4' }),
  );

  const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
    input: {
      video_url: videoUrl,
      target_fps: 60,
      upscale_factor: 1,
      H264_output: true,
    },
  });

  const outUrl = (result.data as { video?: { url: string } })?.video?.url;
  if (!outUrl) throw new Error('Topaz returned no video URL');

  const res = await fetch(outUrl);
  if (!res.ok) throw new Error(`Failed to download 60fps video: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
