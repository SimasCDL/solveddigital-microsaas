"use client";

/**
 * Quiz funnel instrumentation.
 *
 * Two destinations for every event, because they answer different questions:
 *
 * - **Our own counters** (`/api/quiz-event` → `quiz_events`) give the numbers:
 *   how many reached step 4 versus step 5, and which option they picked when
 *   they left. That is what the daily report needs to name the leak. Clarity's
 *   API does not expose custom events, so this cannot come from there.
 * - **Clarity** gets the same event as a tag, which is what makes the replays
 *   filterable once the numbers tell you where to look.
 *
 * Nothing here can break the funnel: every call is fire-and-forget inside a
 * try/catch, and a tracking failure must never stop someone reaching the offer.
 *
 * No personal data. The session id is a random value generated in the browser
 * and kept in sessionStorage; it identifies a visit, not a person, and is never
 * joined to the email the quiz later collects.
 */

const KEY = "tourly_quiz_sid";

/** Matches the event vocabulary in supabase/quiz_events.sql. */
export type QuizEvent =
  | "quiz_start"
  | "step_view"
  | "step_answer"
  | "gate_view"
  | "lead"
  | "result_view"
  | "checkout_click";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode: the visit is still counted, it just cannot be stitched
    // across steps. Better a slightly inflated top-of-funnel than no data.
    return "no-storage";
  }
}

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function track(
  event: QuizEvent,
  extra?: { stepId?: string; stepIndex?: number; answer?: string },
): void {
  try {
    const sid = sessionId();

    window.clarity?.("event", `quiz_${event}`);
    if (extra?.stepId) window.clarity?.("set", "quiz_step", extra.stepId);

    // keepalive so the beacon still goes out when the click that fired it is
    // navigating the page away, which is exactly the case for checkout_click.
    void fetch("/api/quiz-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, event, ...extra }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let instrumentation break the funnel */
  }
}
