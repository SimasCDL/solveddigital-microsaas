import { Container } from "@/components/site/Container";
import { CtaButton } from "@/components/ab/CtaButton";
import { ProofStats } from "@/components/desktop/ProofStats";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft light wash behind the headline. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-10%,var(--color-accent-soft),transparent_70%)]" />

      <Container className="relative pt-14 pb-16 text-center sm:pt-20">
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
          <CtaButton size="xl" />
          <p className="text-sm text-ink-soft">
            Secure checkout · Money-back guarantee
          </p>
        </div>

        <div className="mt-10">
          <ProofStats />
        </div>
      </Container>
    </section>
  );
}
