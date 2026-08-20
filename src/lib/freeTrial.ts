import crypto from 'crypto';
import { sbFetch, supabaseConfigured } from './supabase';

export type Segment = 'agent' | 'homeowner';

/**
 * Customers upload their whole gallery, but the free preview renders only this
 * many photos. Every photo is still stored on the order, so unlocking rebuilds
 * the full tour without asking them to upload again.
 */
export const FREE_PREVIEW_PHOTOS = 3;

/** Free trials are 2 photos → ~6s of video ≈ $2.70 of Replicate credit each, so
 *  the global daily cap is the real spend guard. Raise deliberately via env. */
const DEFAULT_DAILY_LIMIT = 40;

/** Per-IP allowance. Deliberately loose — offices, schools and mobile carriers
 *  share IPs, so this only catches obvious hammering, never a normal customer. */
const PER_IP_DAILY_LIMIT = 5;

const dailyLimit = () =>
  Number(process.env.FREE_DAILY_LIMIT || DEFAULT_DAILY_LIMIT);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** IPs are hashed, never stored raw — we only ever need equality, not the value. */
export function hashIp(ip: string): string {
  const salt = process.env.ADMIN_KEY || 'tourly';
  return crypto
    .createHash('sha256')
    .update(`${salt}:${ip}`)
    .digest('hex')
    .slice(0, 32);
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}

const startOfUtcDay = () => {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString();
};

export type FreeTrialDenial =
  | { ok: true }
  | { ok: false; reason: 'email_used' | 'ip_limit' | 'daily_cap' | 'unavailable' };

/**
 * Decide whether this visitor may claim a free trial.
 *
 * Fails CLOSED: if the ledger can't be read (Supabase down, or the
 * `free_trials` table not created yet) we deny rather than hand out unlimited
 * free video generations. A denied free trial costs nothing; an unguarded one
 * costs real money.
 */
export async function checkFreeTrialEligible(
  email: string,
  ipHash: string,
): Promise<FreeTrialDenial> {
  if (!supabaseConfigured()) {
    console.error('[free] Supabase not configured - refusing free trials');
    return { ok: false, reason: 'unavailable' };
  }

  try {
    const since = startOfUtcDay();

    const [emailRows, todayRows] = await Promise.all([
      sbFetch(
        `/free_trials?email=eq.${encodeURIComponent(normalizeEmail(email))}&select=id&limit=1`,
      ).then((r) => r.json() as Promise<Array<{ id: string }>>),
      sbFetch(
        `/free_trials?created_at=gte.${encodeURIComponent(since)}&select=ip_hash`,
      ).then((r) => r.json() as Promise<Array<{ ip_hash: string | null }>>),
    ]);

    if (emailRows.length) return { ok: false, reason: 'email_used' };
    if (todayRows.length >= dailyLimit()) return { ok: false, reason: 'daily_cap' };

    const fromThisIp = todayRows.filter((r) => r.ip_hash === ipHash).length;
    if (fromThisIp >= PER_IP_DAILY_LIMIT) return { ok: false, reason: 'ip_limit' };

    return { ok: true };
  } catch (err) {
    console.error('[free] eligibility check failed - denying (fail closed):', err);
    return { ok: false, reason: 'unavailable' };
  }
}

/** Write the ledger row. Must be awaited BEFORE generating, so two concurrent
 *  submissions can't both pass the check and each get a free video. */
export async function recordFreeTrial(params: {
  email: string;
  segment: Segment;
  orderId: string;
  ipHash: string;
}): Promise<void> {
  await sbFetch('/free_trials', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizeEmail(params.email),
      segment: params.segment,
      order_id: params.orderId,
      ip_hash: params.ipHash,
    }),
  });
}
