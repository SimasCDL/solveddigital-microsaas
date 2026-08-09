import { randomUUID } from "crypto";
import { sbFetch, supabaseConfigured } from "./supabase";
import type { Answers } from "./quiz";
import type { LeadSource } from "./nurture";

/**
 * Quiz leads and their nurture-sequence state.
 *
 * Mirrors `orders.ts`: Supabase over the REST API with the service-role key, no
 * SDK. Unlike orders there is no local /tmp fallback, and that is deliberate.
 * An order that fails to persist is a customer who paid and lost their photos;
 * a lead that fails to persist is one missed email. Writing a lead to a
 * serverless temp dir would produce a sequence that advances only when the
 * cron happens to land on the same warm instance, which is worse than not
 * having the row at all.
 */

export type LeadStatus =
  "active" | "purchased" | "unsubscribed" | "done" | "bounced";

export interface Lead {
  id: string;
  email: string;
  answers: Answers;
  /** Snapshot of the diagnosis at capture, for the ops view. The emails
   *  recompute from `answers` so a scoring change applies to leads in flight. */
  archetype: string;
  score: number;
  packId: string;
  /** Which sequence this lead runs: the quiz follow-up, or the short winback
   *  for addresses collected before the quiz existed. */
  source: LeadSource;
  /** Highest sequence step already sent. 0 = nothing but the diagnostic. */
  step: number;
  /** When the next step is due. Null once the sequence has ended. */
  nextAt: string | null;
  /** Resend ids for sends that have not gone out yet, so they can be cancelled. */
  scheduledIds: string[];
  status: LeadStatus;
  /** Capability token in the unsubscribe link. Random, not derived from the
   *  email, so a link can never be forged for an address you merely know. */
  unsubToken: string;
  promoCode: string | null;
  promoPct: number | null;
  promoExpiresAt: string | null;
  purchasedAt: string | null;
  unsubscribedAt: string | null;
  /** Set once, so a second expired Stripe session cannot re-send it. */
  recoverySentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadRow {
  id: string;
  email: string;
  answers: Answers;
  archetype: string | null;
  score: number | null;
  pack_id: string | null;
  source: LeadSource | null;
  step: number;
  next_at: string | null;
  scheduled_ids: string[] | null;
  status: LeadStatus;
  ip_hash: string | null;
  unsub_token: string;
  promo_code: string | null;
  promo_pct: number | null;
  promo_expires_at: string | null;
  purchased_at: string | null;
  unsubscribed_at: string | null;
  recovery_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

const fromRow = (r: LeadRow): Lead => ({
  id: r.id,
  email: r.email,
  answers: r.answers ?? {},
  archetype: r.archetype ?? "",
  score: r.score ?? 0,
  packId: r.pack_id ?? "",
  source: r.source ?? "quiz",
  step: r.step ?? 0,
  nextAt: r.next_at,
  scheduledIds: r.scheduled_ids ?? [],
  status: r.status,
  unsubToken: r.unsub_token,
  promoCode: r.promo_code,
  promoPct: r.promo_pct,
  promoExpiresAt: r.promo_expires_at,
  purchasedAt: r.purchased_at,
  unsubscribedAt: r.unsubscribed_at,
  recoverySentAt: r.recovery_sent_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Addresses are compared and stored lowercased so the unique index holds and
 *  a purchase under `Ray@x.com` still stops the sequence for `ray@x.com`. */
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export async function getLeadByEmail(email: string): Promise<Lead | null> {
  if (!supabaseConfigured()) return null;
  const res = await sbFetch(
    `/quiz_leads?email=eq.${encodeURIComponent(normalizeEmail(email))}&select=*&limit=1`,
  );
  const rows: LeadRow[] = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

export async function getLeadByToken(token: string): Promise<Lead | null> {
  if (!supabaseConfigured()) return null;
  const res = await sbFetch(
    `/quiz_leads?unsub_token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
  );
  const rows: LeadRow[] = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

/**
 * Create the lead, or restart the sequence for someone retaking the quiz.
 *
 * Retaking is a real signal (new answers, renewed interest), so the sequence
 * restarts from the top with the new answers. Two exceptions that are never
 * overwritten: an unsubscribe is permanent, and a customer who already bought
 * does not get dropped back into a "you haven't bought yet" sequence. Both
 * return the existing row untouched and the caller schedules nothing.
 */
export async function upsertLead(params: {
  email: string;
  answers: Answers;
  archetype: string;
  score: number;
  packId: string;
  source?: LeadSource;
  /** Hashed, never raw: a raw IP is personal data and nothing here needs to
   *  reverse it. */
  ipHash?: string;
}): Promise<{ lead: Lead; isNew: boolean }> {
  const email = normalizeEmail(params.email);
  const existing = await getLeadByEmail(email);

  if (
    existing &&
    (existing.status === "unsubscribed" || existing.status === "purchased")
  ) {
    return { lead: existing, isNew: false };
  }

  const now = new Date().toISOString();
  const row: Partial<LeadRow> = {
    id: existing?.id ?? randomUUID(),
    email,
    answers: params.answers,
    archetype: params.archetype,
    score: params.score,
    pack_id: params.packId,
    source: params.source ?? "quiz",
    step: 0,
    next_at: null,
    scheduled_ids: [],
    status: "active",
    ip_hash: params.ipHash ?? null,
    unsub_token: existing?.unsubToken ?? randomUUID(),
    // A restart clears any stale promo so step 4 mints a fresh code with a
    // deadline that is actually in the future.
    promo_code: null,
    promo_pct: null,
    promo_expires_at: null,
    purchased_at: null,
    unsubscribed_at: null,
    recovery_sent_at: null,
    created_at: now,
    updated_at: now,
  };

  const res = await sbFetch("/quiz_leads?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  const rows: LeadRow[] = await res.json();
  return { lead: fromRow(rows[0]), isNew: !existing };
}

export async function updateLead(
  id: string,
  updates: Partial<{
    step: number;
    nextAt: string | null;
    scheduledIds: string[];
    status: LeadStatus;
    promoCode: string | null;
    promoPct: number | null;
    promoExpiresAt: string | null;
    purchasedAt: string | null;
    unsubscribedAt: string | null;
    recoverySentAt: string | null;
  }>,
): Promise<void> {
  if (!supabaseConfigured()) return;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.step !== undefined) patch.step = updates.step;
  if (updates.nextAt !== undefined) patch.next_at = updates.nextAt;
  if (updates.scheduledIds !== undefined)
    patch.scheduled_ids = updates.scheduledIds;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.promoCode !== undefined) patch.promo_code = updates.promoCode;
  if (updates.promoPct !== undefined) patch.promo_pct = updates.promoPct;
  if (updates.promoExpiresAt !== undefined)
    patch.promo_expires_at = updates.promoExpiresAt;
  if (updates.purchasedAt !== undefined)
    patch.purchased_at = updates.purchasedAt;
  if (updates.unsubscribedAt !== undefined)
    patch.unsubscribed_at = updates.unsubscribedAt;
  if (updates.recoverySentAt !== undefined)
    patch.recovery_sent_at = updates.recoverySentAt;

  await sbFetch(`/quiz_leads?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Leads whose next step is due. Ordered oldest-first so a backlog drains in
 *  the order people signed up rather than starving the earliest leads. */
export async function dueLeads(limit: number): Promise<Lead[]> {
  if (!supabaseConfigured()) return [];
  const now = new Date().toISOString();
  const res = await sbFetch(
    `/quiz_leads?status=eq.active&next_at=not.is.null&next_at=lte.${encodeURIComponent(now)}` +
      `&select=*&order=next_at.asc&limit=${limit}`,
  );
  const rows: LeadRow[] = await res.json();
  return rows.map(fromRow);
}

/**
 * How many leads this IP hash has created recently.
 *
 * The durable half of the capture endpoint's throttle. The in-memory counters
 * there are per-instance and reset on a cold start; this survives both, which
 * is what makes it worth a query. Counting rows is enough: a human reaches that
 * endpoint once, at the end of a two-minute quiz, so anything above a handful
 * an hour from one address is not a person.
 *
 * Fails open. Supabase being down must not stop real leads being captured.
 */
export async function countRecentByIpHash(
  ipHash: string,
  minutes: number,
): Promise<number> {
  if (!supabaseConfigured() || !ipHash) return 0;
  try {
    const since = new Date(Date.now() - minutes * 60_000).toISOString();
    const res = await sbFetch(
      `/quiz_leads?ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}&select=id`,
    );
    const rows: Array<{ id: string }> = await res.json();
    return rows.length;
  } catch (err) {
    console.error("[leads] ip count failed, allowing:", err);
    return 0;
  }
}

/**
 * Leads that bought in the window, having received at least one email.
 *
 * The honest version of "emails converted". It is attribution by association,
 * not proof: someone can receive an email and buy for an unrelated reason. But
 * every one of these people was on the sequence and then paid, which is the
 * question the report is actually being asked. `step >= 1` is what excludes a
 * lead captured and converted before a single email went out.
 */
export async function convertedInWindow(hours: number): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const res = await sbFetch(
      `/quiz_leads?status=eq.purchased&purchased_at=gte.${encodeURIComponent(since)}&step=gte.1&select=id`,
    );
    return ((await res.json()) as unknown[]).length;
  } catch {
    return 0;
  }
}

/** Counts for the daily ops report. */
export async function leadCounts(): Promise<
  Record<LeadStatus | "total", number>
> {
  const empty = {
    total: 0,
    active: 0,
    purchased: 0,
    unsubscribed: 0,
    done: 0,
    bounced: 0,
  };
  if (!supabaseConfigured()) return empty;
  const res = await sbFetch("/quiz_leads?select=status");
  const rows: Array<{ status: LeadStatus }> = await res.json();
  for (const r of rows) {
    empty.total++;
    if (r.status in empty) empty[r.status]++;
  }
  return empty;
}
