import { NextRequest, NextResponse } from "next/server";
import { recordQuizEvent, type QuizEventName } from "@/lib/quizEvents";
import { clientIp, hashIp } from "@/lib/freeTrial";

export const dynamic = "force-dynamic";

/**
 * Funnel step counter for the quiz.
 *
 * Public and unauthenticated by necessity: it is called from the page before
 * anyone has identified themselves. It grants nothing, stores no personal data
 * (a random per-visit id, a step label, and a salted IP hash), and the worst an
 * abuser achieves is skewing a Telegram report. That is a much smaller problem
 * than the one it solves, which is optimising the funnel blind.
 *
 * Everything is whitelisted by shape before it is stored, so this cannot become
 * a way to write arbitrary strings into the database. The answer field in
 * particular only ever holds choice ids like "agent" or "p20", never free text.
 */

const EVENTS: readonly QuizEventName[] = [
  "quiz_start",
  "step_view",
  "step_answer",
  "gate_view",
  "lead",
  "result_view",
  "checkout_click",
];

const ID_RE = /^[a-z0-9_]{1,32}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      event?: string;
      stepId?: string;
      stepIndex?: number;
      answer?: string;
    };

    const event = body.event as QuizEventName;
    if (!body.sessionId || !event || !EVENTS.includes(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const idx = Number(body.stepIndex);
    await recordQuizEvent({
      sessionId: String(body.sessionId).slice(0, 64),
      event,
      stepId: body.stepId && ID_RE.test(body.stepId) ? body.stepId : null,
      stepIndex: Number.isInteger(idx) && idx > 0 && idx < 100 ? idx : null,
      answer: body.answer && ID_RE.test(body.answer) ? body.answer : null,
      ipHash: hashIp(clientIp(req.headers)),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Analytics must never surface an error to the page.
    console.error("[quiz-event] failed:", err);
    return NextResponse.json({ ok: false });
  }
}
