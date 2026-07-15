import { NextRequest } from 'next/server';
import { fal } from '@fal-ai/client';
import { consumeClipBudget } from '@/lib/budget';

fal.config({ credentials: process.env.FAL_KEY! });

export const maxDuration = 800;

const SLIDER_PROMPT = 'Smooth horizontal camera slide from left to right (or right to left). The camera physically moves sideways across the scene — even if the scene appears flat or simple, the camera must still visibly travel laterally so elements shift and scroll across the frame. Do NOT zoom in. Do NOT push forward. Do NOT stay static. The camera slides sideways the entire duration. Visible lateral parallax motion throughout. Like a camera on a long slider rail. ABSOLUTE RULE: scene content must be exactly what is in the photo — do not add, change, or invent any object, light, material, person, or detail. Only the camera moves sideways. Photorealistic. No people. No text.';

const NEG = 'zoom in, zoom out, push in, dolly in, static shot, no movement, camera shake, blur, distortion, watermark, text, people, artifacts, low quality';

// Hailuo takes literal director commands in square brackets
const HAILUO_PROMPT = '[Truck left] Professional real estate walkthrough shot. The camera slides slowly and perfectly smoothly sideways across the scene, constant speed, stabilized like a slider rail. The scene must contain exactly what is in the photo — do not add, remove, or change any object, light, or detail. Photorealistic. No people. No text.';

interface Candidate {
  key: string;
  label: string;
  price: number; // USD per clip
  seconds: number; // clip length
  model: string;
  input: (imageUrl: string) => object;
}

const CANDIDATES: Candidate[] = [
  {
    key: 'kling25',
    label: 'Kling 2.5 Turbo Pro (current)',
    price: 0.35,
    seconds: 5,
    model: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    input: url => ({ prompt: SLIDER_PROMPT, negative_prompt: NEG, image_url: url, duration: '5' }),
  },
  {
    key: 'seedance15',
    label: 'Seedance 1.5 Pro (1080p)',
    price: 0.29,
    seconds: 5,
    model: 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video',
    input: url => ({ prompt: SLIDER_PROMPT, image_url: url, duration: '5', resolution: '1080p', aspect_ratio: '16:9', camera_fixed: false, generate_audio: false }),
  },
  {
    key: 'kling3pro',
    label: 'Kling 3.0 Pro',
    price: 0.56,
    seconds: 5,
    model: 'fal-ai/kling-video/v3/pro/image-to-video',
    input: url => ({ prompt: SLIDER_PROMPT, negative_prompt: NEG, start_image_url: url, duration: '5', generate_audio: false }),
  },
  {
    key: 'veo31fast',
    label: 'Veo 3.1 Fast (1080p, 6s)',
    price: 0.6,
    seconds: 6,
    model: 'fal-ai/veo3.1/fast/image-to-video',
    input: url => ({ prompt: SLIDER_PROMPT, negative_prompt: NEG, image_url: url, duration: '6s', resolution: '1080p', aspect_ratio: '16:9', generate_audio: false }),
  },
  {
    key: 'hailuo23',
    label: 'Hailuo 2.3 Pro ([Truck left], 6s)',
    price: 0.49,
    seconds: 6,
    model: 'fal-ai/minimax/hailuo-2.3/pro/image-to-video',
    input: url => ({ prompt: HAILUO_PROMPT, image_url: url, prompt_optimizer: false }),
  },
  {
    key: 'seedance2',
    label: 'Seedance 2.0 (1080p) — stability favorite',
    price: 3.4,
    seconds: 5,
    model: 'bytedance/seedance-2.0/image-to-video',
    input: url => ({ prompt: SLIDER_PROMPT, image_url: url, duration: '5', resolution: '1080p', aspect_ratio: '16:9', generate_audio: false }),
  },
];

export async function POST(req: NextRequest) {
  if (process.env.ADMIN_KEY && req.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) return new Response('No photo', { status: 400 });

  const encoder = new TextEncoder();
  const push = (controller: ReadableStreamDefaultController, data: object) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        push(controller, { type: 'status', message: 'Uploading photo...' });
        const imageUrl = await fal.storage.upload(file);

        push(controller, {
          type: 'started',
          candidates: CANDIDATES.map(c => ({ key: c.key, label: c.label, price: c.price, seconds: c.seconds })),
        });

        await Promise.all(
          CANDIDATES.map(async c => {
            const t0 = Date.now();
            try {
              await consumeClipBudget();
              const result = await fal.subscribe(c.model as Parameters<typeof fal.subscribe>[0], {
                input: c.input(imageUrl) as never,
              });
              const url = (result.data as { video?: { url: string } })?.video?.url;
              if (!url) throw new Error('No video URL returned');
              push(controller, { type: 'result', key: c.key, url, ms: Date.now() - t0 });
            } catch (err) {
              console.error(`[bakeoff] ${c.key} failed:`, err);
              push(controller, { type: 'result', key: c.key, error: String(err), ms: Date.now() - t0 });
            }
          })
        );

        push(controller, { type: 'done' });
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
