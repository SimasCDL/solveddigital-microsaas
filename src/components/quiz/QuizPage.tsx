import { QuizFunnel } from "@/components/quiz/QuizFunnel";

/**
 * Page shell for the diagnostic funnel.
 *
 * Below `sm` this adds nothing at all — the funnel fills the screen exactly as
 * it does on a phone today, because that's the layout the traffic actually sees
 * and it isn't worth risking for a desktop that converts far less.
 *
 * From `sm` up it provides the wash the card sits on. The card and its width are
 * the Shell's job, since only the funnel knows which screen is showing.
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

      {/* Width and the card itself live on the funnel's Shell, which is the only
          thing that knows whether it's showing the wide intro or a question.
          flex-1 lets the Shell's `my-auto` centre a short screen without
          clipping a tall one — auto margins collapse to zero when the child
          outgrows the container, which `justify-center` does not. */}
      <div className="relative flex flex-1 flex-col sm:px-6 sm:py-10">
        <QuizFunnel />
      </div>
    </div>
  );
}
