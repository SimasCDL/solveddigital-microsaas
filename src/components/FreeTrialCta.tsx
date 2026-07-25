import { Arrow } from "@/components/site/icons";

/** One switch for the whole free-trial offer. Off until the Supabase
 *  `free_trials` ledger exists, so the offer can never advertise itself before
 *  the abuse guards can actually record a claim. */
const ENABLED = process.env.NEXT_PUBLIC_FREE_TRIAL === "true";

/**
 * The free-trial call to action.
 *
 * `pill` — a ghost/outline button for the hero: impossible to miss above the
 * fold, but visually subordinate to the filled teal buy button next to it, so
 * paying stays the obvious primary action.
 *
 * `link` — a quiet text link for use next to a checkout button, where it acts as
 * risk-reversal for someone hesitating rather than a competing offer.
 */
export function FreeTrialCta({
  variant = "link",
  className = "",
}: {
  variant?: "link" | "pill";
  className?: string;
}) {
  if (!ENABLED) return null;

  if (variant === "pill") {
    return (
      <a
        href="/free"
        className={`inline-flex h-13 items-center justify-center gap-2 rounded-full border-2 border-accent/35 bg-paper/70 px-7 text-[0.95rem] font-semibold tracking-tight text-accent transition-colors hover:border-accent hover:bg-accent-soft ${className}`}
      >
        Or try it free — 2 photos, no card
        <Arrow className="h-4 w-4" />
      </a>
    );
  }

  return (
    <a
      href="/free"
      className={`inline-flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-accent underline decoration-accent/30 underline-offset-2 ${className}`}
    >
      Not sure? Try it free with 2 photos
      <Arrow className="h-3.5 w-3.5" />
    </a>
  );
}
