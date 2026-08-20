import { QuizFunnel } from "@/components/quiz/QuizFunnel";

/**
 * Page shell for the diagnostic funnel.
 *
 * Below `sm` this adds nothing at all — the funnel fills the screen exactly as
 * it does on a phone today, because that's the layout the traffic actually sees
 * and it isn't worth risking for a desktop that converts far less.
 *
 * From `sm` up it lays the wash down full-bleed, edge to edge. The funnel sits
 * directly on it with no panel around it; width is the Shell's job, since only
 * the funnel knows whether it's showing the wide intro or a question.
 */
export function QuizPage() {
  return (
    /* A flex column, which matters for two reasons beyond layout: margins do not
       collapse through a flex container (the Shell's vertical margin was
       otherwise escaping and pushing this whole element down, exposing the dark
       admin `body` background as a bar across the top), and it lets the card
       centre itself with `my-auto`. */
    /* `min-h-dvh`, not `min-h-screen`. `100vh` on iOS Safari is the viewport with
       the browser chrome hidden, which is taller than what is actually on screen,
       so the last band of every long screen sat underneath the address bar. The
       dynamic unit is the one that tracks the chrome. */
    <div className="tourly relative flex min-h-dvh flex-col bg-cream text-ink">
      {/* Desktop-only wash. A layer rather than a background utility so the
          mobile rendering is provably untouched. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          background:
            "linear-gradient(180deg,#e6f4ef 0%,#f0f8f4 38%,var(--color-cream) 100%)",
        }}
      />

      <div className="relative flex flex-1 flex-col">
        <QuizFunnel />
      </div>
    </div>
  );
}
