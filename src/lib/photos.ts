import { randomUUID } from "crypto";

/**
 * Customer photo storage, over the Supabase `photos` bucket.
 *
 * Replaces `fal.storage.upload`, which was the single point of failure that
 * took the whole product offline on 13 Aug 2026: fal locked the account for an
 * exhausted balance, every upload 403'd, and nobody could submit photos at all
 * — paid, free or coupon. Photo hosting is not worth a paid dependency when the
 * project already runs a Supabase bucket for the finished videos.
 *
 * The bucket is PUBLIC on purpose. Replicate fetches these URLs server-side
 * during generation, so they have to be reachable without our credentials, and
 * a signed URL would expire out from under an admin re-run days later. Secrecy
 * comes from the random UUID path — the same UUID-as-capability model the order
 * pages and unsubscribe links already use. These are listing photos that are
 * about to be published on a portal anyway.
 */

const BUCKET = "photos";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export const photoStorageConfigured = () =>
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Store one photo and return a public URL.
 *
 * Throws on failure rather than returning a placeholder: a missing photo would
 * otherwise surface much later as a tour that is silently short a room, which
 * is far harder to diagnose than a failed upload.
 */
export async function uploadPhoto(file: File): Promise<string> {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Supabase storage is not configured");

  const ext = EXT[file.type] ?? "jpg";
  // Never the customer's filename: it can collide, carry a path, or leak the
  // address of the property.
  const path = `${randomUUID()}.${ext}`;

  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: new Uint8Array(await file.arrayBuffer()),
  });

  if (!res.ok) {
    throw new Error(
      `Photo upload failed: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`,
    );
  }

  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Upload a batch in parallel, same shape the routes already used. */
export const uploadPhotos = (files: File[]) =>
  Promise.all(files.map((f) => uploadPhoto(f)));
