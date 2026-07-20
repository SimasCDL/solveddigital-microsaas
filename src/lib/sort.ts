import Anthropic from '@anthropic-ai/sdk';

// Lazy singleton — constructing Anthropic at module load throws when the API key
// isn't present (e.g. during Vercel's build). Build it on first use.
let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }));

export const ROOM_ORDER: Record<string, number> = {
  exterior:       0,
  entrance:       1,
  'living room':  2,
  'dining room':  3,
  kitchen:        4,
  office:         5,
  'master bedroom': 6,
  bedroom:        7,
  bathroom:       8,
  laundry:        9,
  garage:         10,
  other:          11,
};

export async function classifyPhoto(base64: string, mediaType: string): Promise<string> {
  const msg = await client().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 },
        },
        {
          type: 'text',
          text: 'What room or area of a property is shown? Reply with exactly one label: exterior, entrance, living room, dining room, kitchen, office, master bedroom, bedroom, bathroom, laundry, garage, other',
        },
      ],
    }],
  });

  const label = (msg.content[0] as { text: string }).text.trim().toLowerCase();
  return ROOM_ORDER[label] !== undefined ? label : 'other';
}

export interface WalkthroughPlan {
  /** Indices into the input array, in walk order. */
  order: number[];
  /** Room label per input index. */
  labels: string[];
}

/** A photo given either as a public URL or as base64 (for uploaded files). */
export type PhotoSource = { url: string } | { base64: string; mediaType: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
const toImageBlock = (s: PhotoSource): any =>
  'url' in s
    ? { type: 'image', source: { type: 'url', url: s.url } }
    : { type: 'image', source: { type: 'base64', media_type: s.mediaType, data: s.base64 } };

const PLAN_PROMPT = `All of these photos show ONE property (a real-estate / Airbnb listing). Plan the ideal walkthrough order for a continuous video tour, as if physically walking through the home: start outside if exterior shots exist, enter, then move room to room along the most plausible physical path, ending with outdoor/pool/garden areas if present.

Use visual clues to infer the floor plan: matching floors and finishes, doorways and sight lines, rooms visible in the background of other photos. Consecutive photos in your order should be spatially adjacent or visually connected wherever possible — the video will morph from each photo directly into the next, so big spatial jumps look bad.

Also give each photo a short lowercase room label (e.g. exterior, entrance, living room, kitchen, bedroom, bathroom, pool).

Reply with ONLY strict JSON, no markdown fences:
{"order":[<photo numbers in walk order>],"labels":{"<photo number>":"<label>", ...}}
Every photo number from 0 to N-1 must appear exactly once in "order".`;

/** Plan a walkthrough across ALL photos at once — spatial reasoning, not per-photo labels. */
export async function planWalkthrough(photos: PhotoSource[]): Promise<WalkthroughPlan> {
  const content: any[] = photos.flatMap((p, i) => [
    { type: 'text', text: `Photo ${i}:` },
    toImageBlock(p),
  ]);
  content.push({ type: 'text', text: PLAN_PROMPT });

  const msg = await client().messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 800,
    messages: [{ role: 'user', content }],
  });

  const text = (msg.content[0] as { text: string }).text.trim().replace(/^```(json)?|```$/g, '');
  const parsed = JSON.parse(text) as { order: number[]; labels: Record<string, string> };

  // validate: keep only valid unique indices, append anything the model missed
  const seen = new Set<number>();
  const order: number[] = [];
  for (const idx of parsed.order ?? []) {
    if (Number.isInteger(idx) && idx >= 0 && idx < photos.length && !seen.has(idx)) {
      seen.add(idx);
      order.push(idx);
    }
  }
  for (let i = 0; i < photos.length; i++) if (!seen.has(i)) order.push(i);

  const labels = photos.map((_, i) => (parsed.labels?.[String(i)] || 'other').toLowerCase());
  return { order, labels };
}

const TRANSITIONS_PROMPT = `These photos are the consecutive stops of ONE continuous walkthrough video of a single property, already in exact walk order. For each consecutive pair (photo i to photo i+1), write ONE short camera instruction (max 25 words) describing how a person holding the camera physically walks from the first view to the second.

Rules:
- Ground every instruction ONLY in what is visible: doorways, openings, hallways, stairs, sight lines, rooms visible in the background of the other photo.
- The camera must NEVER pass through a wall, window, floor, ceiling, or any solid object. It moves only through open space, visible doorways and openings.
- If both photos show the same room, describe a simple move/turn within the room.
- If the connection between the rooms is not visible, route through the most plausible visible doorway or opening and keep it brief.
- Mention the direction (left, right, ahead, turn around) relative to the first photo's viewpoint.

Reply with ONLY strict JSON, no markdown fences:
{"transitions":["<instruction for pair 0→1>", "<pair 1→2>", ...]}
There must be exactly N-1 instructions for N photos.`;

/** For photos in final walk order, get a grounded camera-path instruction per consecutive pair. */
export async function planTransitions(urls: string[]): Promise<string[]> {
  if (urls.length < 2) return [];
  const content: any[] = urls.flatMap((url, i) => [
    { type: 'text', text: `Photo ${i}:` },
    { type: 'image', source: { type: 'url', url } },
  ]);
  content.push({ type: 'text', text: TRANSITIONS_PROMPT });

  const msg = await client().messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content }],
  });

  const text = (msg.content[0] as { text: string }).text.trim().replace(/^```(json)?|```$/g, '');
  const parsed = JSON.parse(text) as { transitions: string[] };
  const transitions = Array.isArray(parsed.transitions) ? parsed.transitions : [];
  // pad/trim to exactly N-1 so a short reply can't misalign pairs
  return Array.from({ length: urls.length - 1 }, (_, i) =>
    typeof transitions[i] === 'string' ? transitions[i].slice(0, 300) : '',
  );
}

/** Sort photo URLs into walkthrough order (exterior → interior). Falls back to original order on failure. */
export async function sortPhotoUrls(urls: string[]): Promise<string[]> {
  try {
    const classified = await Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch photo ${i + 1}`);
        const base64 = Buffer.from(await res.arrayBuffer()).toString('base64');
        const mediaType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
        const label = await classifyPhoto(base64, mediaType);
        return { url, order: ROOM_ORDER[label] ?? 11, index: i };
      })
    );
    classified.sort((a, b) => a.order - b.order || a.index - b.index);
    return classified.map(c => c.url);
  } catch (err) {
    console.error('[sort] falling back to upload order:', err);
    return urls;
  }
}
