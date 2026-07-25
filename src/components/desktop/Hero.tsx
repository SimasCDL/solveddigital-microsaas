import { Container } from "@/components/site/Container";
import { CtaButton } from "@/components/ab/CtaButton";
import { FreeTrialCta, FREE_TRIAL_ENABLED } from "@/components/FreeTrialCta";
import { ReviewsRow } from "@/components/site/ReviewsRow";
import { Arrow } from "@/components/site/icons";
import { BeforeAfterRail } from "@/components/sections/BeforeAfterRail";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16">
      {/* Soft light wash behind the headline. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-10%,var(--color-accent-soft),transparent_70%)]" />

      <Container className="relative pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center rounded-full bg-accent-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          The 2-minute listing tour
        </span>

        {/* Title — forced 3 lines */}
        <h1 className="font-display mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] text-ink sm:text-7xl">
          Turn listing photos
          <br />
          into stunning video tours
          <br />
          <span className="text-accent">instantly</span>
        </h1>

        {/* Subtitle — line 1 shorter, line 2 longer */}
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-ink-soft sm:text-xl">
          Photos to a finished tour in about two minutes.
          <br className="hidden sm:block" /> No videographer, no editing, no
          software to learn.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3">
          {/* The free trial is the hero's single call to action — the paid packs
              take over further down the page. Falls back to the buy CTA if the
              offer is switched off, so the hero is never left without one. */}
          {FREE_TRIAL_ENABLED ? (
            <FreeTrialCta variant="primary" />
          ) : (
            <CtaButton size="xl" />
          )}
          <p className="text-sm text-ink-soft">
            {FREE_TRIAL_ENABLED
              ? "No card required · Your clip in about a minute"
              : "Secure checkout · Money-back guarantee"}
          </p>
        </div>

        <ReviewsRow className="mt-8" />

        {/* Before → After label */}
        <div className="mt-12 flex items-center justify-center gap-3 text-xl font-semibold text-ink">
          <span>Before</span>
          <Arrow className="h-6 w-6 text-accent" />
          <span>After</span>
        </div>
      </Container>

      {/* Full-bleed Before → After showcase (AI staging transformations). */}
      <BeforeAfterRail
        height={400}
        cardWidth={620}
        durationSec={34}
        className="mt-8"
      />
    </section>
  );
}
