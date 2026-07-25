import { Arrow } from "@/components/site/icons";

/** One switch for the whole free-trial offer. Off until the Supabase
 *  `free_trials` ledger exists, so the offer can never advertise itself before
 *  the abuse guards can actually record a claim.
 *
 *  Exported because the heroes lead with the free CTA *instead of* the paid one
 *  — they need to know to fall back to "Make my first tour" when it's off,
 *  rather than rendering a hero with no call to action at all. */
export const FREE_TRIAL_ENABLED = process.env.NEXT_PUBLIC_FREE_TRIAL === "true";

/**
 * The free-trial call to action.
 *
 * `primary` — the filled teal hero button, used when the free trial IS the
 * hero's only call to action.
 *
 * `pill` — a ghost/outline button, for sitting beside a filled buy button where
 * paying should stay the obvious primary action.
 *
 * `link` — a quiet text link for use next to a checkout button, where it acts as
 * risk-reversal for someone hesitating rather than a competing offer.
 */
export function FreeTrialCta({
  variant = "link",
  className = "",
}: {
  variant?: "link" | "pill" | "primary";
  className?: string;
}) {
  if (!FREE_TRIAL_ENABLED) return null;

  if (variant === "primary") {
    return (
      <a
        href="/free"
        className={`group inline-flex h-16 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] px-9 text-base font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] ring-1 ring-white/10 transition-all hover:brightness-[1.06] hover:shadow-[0_18px_44px_-10px_rgba(15,125,107,0.75)] active:scale-[0.99] ${className}`}
      >
        Make your first video — free
        <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    );
  }

  if (variant === "pill") {
    return (
      <a
        href="/free"
        className={`inline-flex h-13 items-center justify-center gap-2 rounded-full border-2 border-accent/35 bg-paper/70 px-7 text-[0.95rem] font-semibold tracking-tight text-accent transition-colors hover:border-accent hover:bg-accent-soft ${className}`}
      >
        Or make one free
        <Arrow className="h-4 w-4" />
      </a>
    );
  }

  return (
    <a
      href="/free"
      className={`inline-flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-accent underline decoration-accent/30 underline-offset-2 ${className}`}
    >
      Not sure? Make your first one free
      <Arrow className="h-3.5 w-3.5" />
    </a>
  );
}
