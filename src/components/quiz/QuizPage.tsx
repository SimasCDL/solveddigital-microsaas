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
    <div className="tourly relative flex min-h-screen flex-col bg-cream text-ink">
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
