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
      .map((_, i) => `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`)
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

// Background music track — a single licensed/royalty-free file the same music
// is laid over every delivered format. Set MUSIC_TRACK_PATH, else assets/tour-music.mp3.
const musicTrackPath = () =>
  process.env.MUSIC_TRACK_PATH || join(process.cwd(), 'assets', 'tour-music.mp3');

/** Seconds of a video file, parsed from ffmpeg's own output. */
async function videoDuration(path: string): Promise<number> {
  try {
    const { stderr } = await execFileAsync(ffmpegBin(), ['-i', path, '-f', 'null', '-'], {
      maxBuffer: 1024 * 1024 * 16,
    });
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (!m) return 0;
    return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  } catch {
    return 0;
  }
}

/** Lay the configured music track over a finished (silent) video, looping/trimming
 *  it to the video length with a short fade-out at the very end. If no track file
 *  is available, the original silent video is returned unchanged (delivery never
 *  fails on music). */
export async function addMusicTrack(video: Buffer): Promise<Buffer> {
  const track = musicTrackPath();
  const { existsSync } = await import('fs');
  if (!existsSync(track)) {
    console.warn(`[stitch] music requested but no track at ${track} — delivering without music`);
    return video;
  }

  const dir = join(tmpdir(), `music-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    const inPath = join(dir, 'in.mp4');
    const outPath = join(dir, 'out.mp4');
    await writeFile(inPath, video);

    // Fade the music out over the last 1.5s, whatever the video length is.
    const dur = await videoDuration(inPath);
    const fadeStart = Math.max(0, dur - 1.5);

    // Loop the track so it always covers the video, trim to the video length
    // (-shortest), copy the video stream untouched.
    await execFileAsync(ffmpegBin(), [
      '-y',
      '-i', inPath,
      '-stream_loop', '-1', '-i', track,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '160k',
      '-af', `afade=t=out:st=${fadeStart.toFixed(2)}:d=1.5`,
      '-shortest', '-movflags', '+faststart',
      outPath,
    ], { maxBuffer: 1024 * 1024 * 64 });
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Derive both 9:16 versions from the finished 16:9 master — no re-generation,
 *  just ffmpeg. `blurred` keeps the whole frame with a blurred fill top/bottom;
 *  `crop` fills the screen edge-to-edge (loses the sides). Both 1080x1920,
 *  inherit the master's 60fps, and are size-capped for Supabase. */
export async function makeVerticalVariants(master: Buffer): Promise<{ blurred: Buffer; crop: Buffer }> {
  const dir = join(tmpdir(), `vert-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    const inPath = join(dir, 'master.mp4');
    await writeFile(inPath, master);

    const blurredPath = join(dir, 'blurred.mp4');
    await execFileAsync(ffmpegBin(), [
      '-y', '-i', inPath,
      '-filter_complex',
      '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=22:4[bg];' +
      '[0:v]scale=1080:-2[fg];[bg][fg]overlay=0:(H-h)/2',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      blurredPath,
    ], { maxBuffer: 1024 * 1024 * 64 });

    const cropPath = join(dir, 'crop.mp4');
    await execFileAsync(ffmpegBin(), [
      '-y', '-i', inPath,
      '-vf', 'crop=ih*9/16:ih,scale=1080:1920',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      cropPath,
    ], { maxBuffer: 1024 * 1024 * 64 });

    const blurred = await compressToLimit(dir, await readFile(blurredPath));
    const crop = await compressToLimit(dir, await readFile(cropPath));
    return { blurred, crop };
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

// Topaz's queue is occasionally jammed for 30+ minutes; a video must never hang
// on it. Past this deadline we deliver the 24fps version instead.
const TOPAZ_TIMEOUT_MS = 5 * 60 * 1000;

async function interpolateTo60(data: Buffer): Promise<Buffer> {
  const videoUrl = await fal.storage.upload(
    new File([new Uint8Array(data)], 'stitched.mp4', { type: 'video/mp4' }),
  );

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Topaz 60fps timed out after ${TOPAZ_TIMEOUT_MS / 60000} minutes`)), TOPAZ_TIMEOUT_MS)
  );

  const result = await Promise.race([
    fal.subscribe('fal-ai/topaz/upscale/video', {
      input: {
        video_url: videoUrl,
        target_fps: 60,
        upscale_factor: 1,
        H264_output: true,
      },
    }),
    timeout,
  ]);

  const outUrl = (result.data as { video?: { url: string } })?.video?.url;
  if (!outUrl) throw new Error('Topaz returned no video URL');

  const res = await fetch(outUrl);
  if (!res.ok) throw new Error(`Failed to download 60fps video: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
