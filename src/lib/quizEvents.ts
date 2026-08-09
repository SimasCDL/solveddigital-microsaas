import { sbFetch, supabaseConfigured } from "./supabase";

/**
 * Quiz funnel step counts, over the `quiz_events` table.
 *
 * Deliberately dumb: one append-only row per event, aggregated in JS at report
 * time. At this volume (a few hundred events a day) that is cheaper to reason
 * about than a materialised counter that can drift, and it keeps the raw events
 * around for answering a question the report did not anticipate.
 *
 * The `step_answer` rows are the ones worth having. Knowing that a third of
 * people leave on question 4 tells you where; knowing that most of them had
 * just picked "I hire a videographer" tells you why.
 */

export type QuizEventName =
  | "quiz_start"
  | "step_view"
  | "step_answer"
  | "gate_view"
  | "lead"
  | "result_view"
  | "checkout_click";

export async function recordQuizEvent(e: {
  sessionId: string;
  event: QuizEventName;
  stepId: string | null;
  stepIndex: number | null;
  answer: string | null;
  ipHash: string | null;
}): Promise<void> {
  if (!supabaseConfigured()) return;
  await sbFetch("/quiz_events", {
    method: "POST",
    body: JSON.stringify({
      session_id: e.sessionId,
      event: e.event,
      step_id: e.stepId,
      step_index: e.stepIndex,
      answer: e.answer,
      ip_hash: e.ipHash,
    }),
  });
}

export interface FunnelStage {
  /** Stable key the report can special-case: an event name, or `step_<n>`. */
  step: string;
  label: string;
  sessions: number;
  /** Percent of the previous stage that survived to this one. */
  keptPct: number;
}

/**
 * Distinct visits that reached each stage in the last N hours.
 *
 * Counted distinct per session so a re-render or a back-and-forth cannot
 * inflate a stage, which would otherwise show more people at step 5 than at
 * step 4 and make the whole report untrustworthy.
 *
 * The question steps are discovered from the data rather than hardcoded,
 * because the quiz branches: a homeowner skips the volume question, so the
 * number of steps is not fixed.
 */
export async function funnelCounts(hours: number): Promise<FunnelStage[]> {
  if (!supabaseConfigured()) return [];
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const res = await sbFetch(
    `/quiz_events?created_at=gte.${encodeURIComponent(since)}&select=session_id,event,step_index&limit=20000`,
  );
  const rows: Array<{
    session_id: string;
    event: string;
    step_index: number | null;
  }> = await res.json();

  const seen = new Map<string, Set<string>>();
  const add = (key: string, sid: string) => {
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key)!.add(sid);
  };

  let maxStep = 0;
  for (const r of rows) {
    if (r.event === "step_view" && r.step_index) {
      add(`step_${r.step_index}`, r.session_id);
      maxStep = Math.max(maxStep, r.step_index);
    } else if (r.event !== "step_answer") {
      // step_answer would double-count a screen that step_view already counted.
      add(r.event, r.session_id);
    }
  }

  const order: Array<{ step: string; label: string }> = [
    { step: "quiz_start", label: "Landed" },
    ...Array.from({ length: maxStep }, (_, i) => ({
      step: `step_${i + 1}`,
      label: `Q${i + 1}`,
    })),
    { step: "gate_view", label: "Email gate" },
    { step: "lead", label: "Gave email" },
    { step: "result_view", label: "Saw result" },
    { step: "checkout_click", label: "Hit checkout" },
  ];

  const out: FunnelStage[] = [];
  let prev = 0;
  for (const f of order) {
    const sessions = seen.get(f.step)?.size ?? 0;
    // Stages the branch skipped would otherwise read as a 100% drop and bury
    // the real one.
    if (!sessions) continue;
    out.push({
      ...f,
      sessions,
      keptPct: prev ? Math.round((sessions / prev) * 100) : 100,
    });
    prev = sessions;
  }
  return out;
}
