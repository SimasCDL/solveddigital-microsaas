import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY! });

const MODEL = 'fal-ai/kling-video/v2/master/image-to-video';

const WALKTHROUGH_PROMPT = `Using all provided Airbnb photos as references, generate a single continuous first-person walkthrough beginning outside the property and smoothly entering through the front door. The camera should move naturally and continuously through the entire home in one uninterrupted path, revealing each space in a logical order.
Preserve the exact architecture, room layouts, furniture placement, decor, colors, materials, and lighting from the reference images. Move confidently through hallways, around corners, through doorways, and between rooms as if filmed by a professional real estate videographer using a stabilized gimbal. Maintain consistent spatial relationships and realistic room connections. Prioritize accurate navigation of the property over cinematic effects. Bright, inviting atmosphere, photorealistic quality, realistic depth and parallax. No cuts, no teleporting between rooms, no floating camera, no people, no text, no added objects, no redesigned spaces, no hallucinated features, no distortion, and no camera shake. Create the feeling of physically walking through a luxury Airbnb from the exterior to every major interior space in a seamless tour.`;

const NEGATIVE_PROMPT = 'camera shake, cuts, jump cuts, teleporting, distortion, people, text, watermark, floating camera, hallucinated rooms, added furniture, redesigned spaces, blur';

export interface FalJobResult {
  requestId: string;
}

export async function submitVideoJob(
  photoUrl: string,
  webhookUrl: string
): Promise<FalJobResult> {
  const { request_id } = await fal.queue.submit(MODEL, {
    input: {
      prompt: WALKTHROUGH_PROMPT,
      image_url: photoUrl,
      duration: '10',
      negative_prompt: NEGATIVE_PROMPT,
      cfg_scale: 0.5,
    },
    webhookUrl,
  });
  return { requestId: request_id };
}

export async function getVideoResult(requestId: string): Promise<string | null> {
  try {
    const result = await fal.queue.result(MODEL, { requestId });
    const output = result.data as { video?: { url: string } };
    return output?.video?.url ?? null;
  } catch {
    return null;
  }
}
