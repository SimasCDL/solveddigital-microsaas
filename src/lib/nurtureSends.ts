import { sbFetch, supabaseConfigured } from "./supabase";

/**
 * A row per nurture email, so the daily report can state how many actually went
 * out rather than infer it.
 *
 * Inference from the leads table does not work: a lead carries only its current
 * step, so there is no way to tell whether that step was reached today or three
 * weeks ago. One append-only row per send is the cheap, honest answer.
 *
 * `sentAt` is when the email is *delivered*, not when the row was written.
 * Step 1 is handed to Resend's scheduler up to 25 minutes ahead, and counting
 * it on the day it was queued rather than the day it landed would quietly
 * misattribute every lead captured near midnight.
 */

export async function recordSend(p: {
  email: string;
  step: number;
  source: string;
  sentAt: string;
}): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    await sbFetch("/nurture_sends", {
      method: "POST",
      body: JSON.stringify({
        email: p.email,
        step: p.step,
        source: p.source,
        sent_at: p.sentAt,
      }),
    });
  } catch (err) {
    // Bookkeeping must never fail a send that already happened.
    console.error("[nurture] recordSend failed:", err);
  }
}

/** How many nurture emails landed in the window. */
export async function sendsInWindow(hours: number): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const now = new Date().toISOString();
    const res = await sbFetch(
      `/nurture_sends?sent_at=gte.${encodeURIComponent(since)}&sent_at=lte.${encodeURIComponent(now)}&select=id&limit=5000`,
    );
    return ((await res.json()) as unknown[]).length;
  } catch {
    return 0;
  }
}
