import { CtaButton } from "@/components/ab/CtaButton";
import { FreeTrialCta, FREE_TRIAL_ENABLED } from "@/components/FreeTrialCta";
import { ReviewsRow } from "@/components/site/ReviewsRow";
import { Arrow } from "@/components/site/icons";

export function Hero() {
  return (
    <div className="px-[22px] pt-11 text-center">
      <span className="inline-block rounded-full bg-accent-soft px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-accent">
        The 2-minute listing tour
      </span>

      <h1 className="font-display mt-5 text-[33px] font-bold leading-[1.08] tracking-[-0.02em] text-ink text-balance">
        Turn listing photos into stunning video tours{" "}
        <span className="text-accent">instantly</span>
      </h1>

      <p className="mx-auto mt-[18px] max-w-[23rem] text-base leading-[1.55] text-ink-soft">
        Upload your photos and get a polished, share-ready listing video in
        about two minutes.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        {/* The free trial is the hero's single call to action — the paid packs
            take over further down the page. Falls back to the buy CTA if the
            offer is switched off, so the hero is never left without one. */}
        {FREE_TRIAL_ENABLED ? (
          <FreeTrialCta variant="primary" />
        ) : (
          <CtaButton size="xl" label="Make my first tour" href="#buy" />
        )}
        <p className="text-[13.5px] text-ink-soft">
          {FREE_TRIAL_ENABLED
            ? "No card required · Your clip in about a minute"
            : "Secure checkout · Money-back guarantee"}
        </p>
      </div>

      <ReviewsRow className="mt-[26px]" />

      {/* Before → After label */}
      <div className="mt-11 flex items-center justify-center gap-3 text-[17px] font-semibold text-ink">
        <span>Before</span>
        <Arrow className="h-5 w-5 text-accent" />
        <span>After</span>
      </div>
    </div>
  );
}
