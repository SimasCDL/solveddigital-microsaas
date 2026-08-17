import { sbFetch, supabaseConfigured } from "./supabase";

/**
 * Pre-flight checks for the things that silently take the product offline.
 *
 * Written after a day where fal.ai locked the account for an exhausted balance
 * and nobody found out until a customer could not upload photos. Every failure
 * mode here is invisible from the outside — the site stays up, the funnel
 * converts, checkout takes money, and the product simply stops working.
 *
 * Deliberately reports "unknown" rather than "ok" when a probe itself fails.
 * A health check that says everything is fine because it could not reach
 * anything is worse than no health check at all.
 */

export type ProbeState = "ok" | "down" | "unknown";

export interface Probe {
  name: string;
  state: ProbeState;
  detail?: string;
}

/**
 * fal.ai is deliberately NOT probed.
 *
 * It was, back when /api/upload put every photo in fal.storage and a lapsed
 * balance took the product offline at its first step. Neither is true now:
 * uploads go to our own Supabase bucket, and generation runs on Replicate
 * under `VIDEO_PROVIDER=seedance`. The account can sit at zero indefinitely
 * without a customer noticing.
 *
 * So the probe did the one thing a health check must never do — print a red
 * BALANCE EXHAUSTED banner above the numbers, every morning, for a service no
 * request touches. An alarm that is always on and never actionable is worse
 * than no alarm, because it teaches you to skip the section where the real one
 * will appear. If a fal code path ever goes back in the customer's way, probe
 * it again then.
 */

/** Replicate — generates every clip. A dead token means no tours, only after
 *  the customer has already uploaded and paid. */
async function probeReplicate(): Promise<Probe> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return {
      name: "Replicate",
      state: "down",
      detail: "REPLICATE_API_TOKEN not set",
    };
  }
  try {
    const res = await fetch("https://api.replicate.com/v1/account", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return { name: "Replicate", state: "ok" };
    return {
      name: "Replicate",
      state: "down",
      detail: `${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}`,
    };
  } catch (err) {
    return {
      name: "Replicate",
      state: "unknown",
      detail: String(err).slice(0, 120),
    };
  }
}

export async function probeProviders(): Promise<Probe[]> {
  return Promise.all([probeReplicate()]);
}

export interface StuckOrder {
  id: string;
  email: string;
  minutes: number;
  paid: boolean;
}

/**
 * Orders wedged in `processing`.
 *
 * The signature of a fulfillment that was killed rather than failed: a
 * maxDuration timeout is a hard kill, so the catch in `fulfillOrder` never
 * runs, no failure email is sent and no alert fires. The row just sits there.
 *
 * 20 minutes is comfortably past the slowest real generation observed (790s),
 * so anything older is genuinely stuck rather than merely slow.
 */
export async function stuckOrders(minMinutes = 20): Promise<StuckOrder[]> {
  if (!supabaseConfigured()) return [];
  const cutoff = new Date(Date.now() - minMinutes * 60_000).toISOString();
  const res = await sbFetch(
    `/orders?status=eq.processing&updated_at=lt.${encodeURIComponent(cutoff)}` +
      `&select=id,email,updated_at,stripe_session_id&order=updated_at.asc&limit=25`,
  );
  const rows: Array<{
    id: string;
    email: string;
    updated_at: string;
    stripe_session_id: string | null;
  }> = await res.json();

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    minutes: Math.round(
      (Date.now() - new Date(r.updated_at).getTime()) / 60_000,
    ),
    // A `free:` marker is a preview, not a purchase — worth separating, because
    // a stuck PAID order is somebody owed either a video or their money back.
    paid: !!r.stripe_session_id && !r.stripe_session_id.startsWith("free:"),
  }));
}

/** The report's health block. Empty array when there is nothing wrong, so a
 *  clean day adds no noise to the message. */
export async function healthSection(): Promise<string[]> {
  const [probes, stuck] = await Promise.all([
    probeProviders().catch(() => [] as Probe[]),
    stuckOrders().catch(() => [] as StuckOrder[]),
  ]);

  const bad = probes.filter((p) => p.state !== "ok");
  if (!bad.length && !stuck.length) return [];

  const L: string[] = ["🚨 *HEALTH*"];
  for (const p of bad) {
    L.push(
      `${p.state === "down" ? "❌" : "❓"} ${p.name} — ${p.detail ?? p.state}`,
    );
  }
  if (stuck.length) {
    const paid = stuck.filter((s) => s.paid).length;
    L.push(
      `⏳ ${stuck.length} order(s) stuck in processing` +
        (paid ? ` · *${paid} PAID*` : ""),
    );
    for (const s of stuck.slice(0, 5)) {
      L.push(
        `   ${s.paid ? "💳" : "🆓"} ${s.email} · ${s.minutes}m · \`${s.id}\``,
      );
    }
  }
  return L;
}
