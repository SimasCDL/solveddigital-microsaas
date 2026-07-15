import { NextRequest } from 'next/server';
import { fal } from '@fal-ai/client';
import { generateTransitionClip, generateVideo, extractLastFrame, makeRunBudget } from '@/lib/fal';
import { planTransitions } from '@/lib/sort';

fal.config({ credentials: process.env.FAL_KEY! });

// Model, prompt and per-clip QC all live in src/lib/fal.ts (generateVideo) so the
// test page and the paid webhook can never drift apart again.
export const maxDuration = 800;

export async function POST(req: NextRequest) {
  if (process.env.ADMIN_KEY && req.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const files = (formData.getAll('photos') as File[]).slice(0, 12);

  // Remote photos (e.g. from an ingested Airbnb listing) come as a JSON array of
  // public URLs — no fal storage upload needed, models accept them directly.
  let remoteUrls: string[] = [];
  const rawUrls = formData.get('photo_urls');
  if (typeof rawUrls === 'string' && rawUrls) {
    try {
      const parsed = JSON.parse(rawUrls);
      if (Array.isArray(parsed)) remoteUrls = parsed.filter(u => typeof u === 'string').slice(0, 12);
    } catch { /* treated as no remote photos */ }
  }

  const photoTotal = files.length || remoteUrls.length;
  if (!photoTotal) return new Response('No photos', { status: 400 });

  // 'walkthrough' chains start→end frame clips (photo N → photo N+1) into one
  // continuous camera move; 'slides' is the classic one-clip-per-photo mode.
  const mode = formData.get('mode') === 'walkthrough' ? 'walkthrough' : 'slides';
  if (mode === 'walkthrough' && photoTotal < 2) {
    return new Response('Walkthrough mode needs at least 2 photos', { status: 400 });
  }

  const encoder = new TextEncoder();
  const push = (controller: ReadableStreamDefaultController, data: object) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let photoUrls: string[];
        if (remoteUrls.length) {
          push(controller, { type: 'status', message: `Using ${remoteUrls.length} listing photo(s)...` });
          photoUrls = remoteUrls;
        } else {
          push(controller, { type: 'status', message: `Uploading ${files.length} photo(s)...` });
          photoUrls = [];
          for (const file of files) {
            const url = await fal.storage.upload(file);
            photoUrls.push(url);
          }
        }

        if (mode === 'slides') {
          push(controller, { type: 'status', message: `Animating ${photoUrls.length} photo(s) — this takes a few minutes...` });
        }

        const videoUrls: string[] = new Array(photoUrls.length);

        if (mode === 'walkthrough') {
          // Dwell + connect: a real pan inside every room (anchored on the photo),
          // joined by short walking shots that start on the pan's final frame and
          // land exactly on the next photo — one continuous take, mostly real footage.
          const n = photoUrls.length;
          const total = 2 * n - 1;

          // One Claude pass over ALL photos in walk order: per-pair camera routes
          // grounded in visible doorways, so walks never cut through walls.
          let pathHints: string[] = [];
          try {
            push(controller, { type: 'status', message: 'Analyzing the home’s layout...' });
            pathHints = await planTransitions(photoUrls);
          } catch (err) {
            console.error('[generate] transition planning failed, using generic prompts:', err);
          }

          push(controller, { type: 'status', message: `Filming ${n} room(s) and ${n - 1} doorway walk(s) — this takes a few minutes...` });

          // Room pans all start immediately; each walk starts the moment its room pan is done.
          const roomPromises = photoUrls.map((url, i) => {
            push(controller, { type: 'progress', clip: 2 * i + 1, total, message: `Room ${i + 1} filming...` });
            return generateVideo(url)
              .then(u => {
                console.log(`[generate] room ${i + 1} ready: ${u}`);
                push(controller, { type: 'clip_ready', clip: 2 * i + 1, total, url: u });
                return u;
              })
              .catch(err => {
                console.error(`[generate] room ${i + 1} failed:`, err);
                push(controller, { type: 'progress', clip: 2 * i + 1, total, message: `Room ${i + 1} failed after all attempts — skipping` });
                return undefined;
              });
          });

          const walkPromises = Array.from({ length: n - 1 }, async (_, i) => {
            const roomUrl = await roomPromises[i];
            try {
              // start the walk exactly where the pan ended; if the pan failed, from the photo itself
              const startFrame = roomUrl ? await extractLastFrame(roomUrl) : photoUrls[i];
              push(controller, { type: 'progress', clip: 2 * i + 2, total, message: `Walk ${i + 1} filming...` });
              const url = await generateTransitionClip(startFrame, photoUrls[i + 1], pathHints[i]);
              console.log(`[generate] walk ${i + 1} ready: ${url}`);
              push(controller, { type: 'clip_ready', clip: 2 * i + 2, total, url });
              return url;
            } catch (err) {
              console.error(`[generate] walk ${i + 1} failed:`, err);
              push(controller, { type: 'progress', clip: 2 * i + 2, total, message: `Walk ${i + 1} failed — rooms will hard-cut here` });
              return undefined;
            }
          });

          const rooms = await Promise.all(roomPromises);
          const walks = await Promise.all(walkPromises);

          const ordered: string[] = [];
          for (let i = 0; i < n; i++) {
            if (rooms[i]) ordered.push(rooms[i]!);
            if (i < n - 1 && walks[i]) ordered.push(walks[i]!);
          }

          if (!ordered.length) {
            push(controller, { type: 'error', message: 'All clips failed to generate. This is usually temporary — please try again in a minute.' });
          } else {
            push(controller, { type: 'done', videoUrls: ordered, photoUrls });
          }
          return;
        }

        // shared retry pool: one run can spend at most ~1.5x its normal clip count
        const runBudget = makeRunBudget(photoUrls.length);

        await Promise.all(
          photoUrls.map(async (imageUrl, i) => {
            push(controller, { type: 'progress', clip: i + 1, total: photoUrls.length, message: `Photo ${i + 1} animating...` });
            try {
              // generateVideo includes automatic QC: every clip is inspected against
              // the source photo and regenerated if static, zooming, warped or hallucinating
              const url = await generateVideo(imageUrl, msg =>
                push(controller, { type: 'progress', clip: i + 1, total: photoUrls.length, message: `Photo ${i + 1} ${msg}` }),
                runBudget
              );
              videoUrls[i] = url;
              console.log(`[generate] clip ${i + 1} ready: ${url}`);
              push(controller, { type: 'clip_ready', clip: i + 1, total: photoUrls.length, url });
            } catch (err) {
              console.error(`[generate] clip ${i + 1} failed:`, err);
              push(controller, { type: 'progress', clip: i + 1, total: photoUrls.length, message: `Photo ${i + 1} failed after all attempts — skipping` });
            }
          })
        );

        const successful = videoUrls.filter(Boolean);
        if (!successful.length) {
          push(controller, { type: 'error', message: 'All clips failed to generate. This is usually temporary — please try again in a minute.' });
        } else {
          push(controller, { type: 'done', videoUrls: successful, photoUrls });
        }
      } catch (err) {
        push(controller, { type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
