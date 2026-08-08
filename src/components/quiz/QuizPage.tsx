import { QuizFunnel } from "@/components/quiz/QuizFunnel";

/**
 * Page shell for the diagnostic funnel.
 *
 * Below `sm` this renders nothing at all — the funnel fills the screen exactly
 * as it does on a phone today, because that's the layout the traffic actually
 * sees and it isn't worth risking for a desktop that barely converts.
 *
 * From `sm` up the same 440px column would otherwise sit stranded in the middle
 * of an empty field, so it gets a soft wash behind it and a card around it. The
 * column width is deliberately unchanged: widening it on desktop would reflow
 * every screen and give us a layout nobody has looked at.
 */
export function QuizPage() {
  return (
    <div className="tourly relative min-h-screen bg-cream text-ink">
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

      <div className="relative mx-auto w-full max-w-[460px] sm:px-6 sm:py-10">
        <div className="sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-line sm:bg-cream sm:shadow-[0_40px_90px_-50px_rgba(21,19,15,0.45)]">
          <QuizFunnel />
        </div>
      </div>
    </div>
  );
}
