/**
 * Pricing packs — the ONE place to edit prices.
 *
 * Two one-time packs (no subscription). Each routes to its own Stripe checkout,
 * with `?pack=` appended for attribution. Set the real Stripe Payment Link URLs
 * via env (NEXT_PUBLIC_STRIPE_LINK_SINGLE / _TRIO). Until then, the buttons fall
 * back to the local /checkout dead-end placeholder (your colleague swaps that
 * for the real Stripe → success → delivery flow).
 */

export type PackId = "single" | "trio";

export interface Pack {
  id: PackId;
  /** Short label, e.g. "1 video". */
  name: string;
  videos: number;
  /** Numeric price in USD. */
  price: number;
  priceLabel: string;
  /** One-line scope, e.g. "up to 1 minute each". */
  cadence: string;
  /** Optional per-video framing, e.g. "Just $31 per video". */
  perVideoLabel?: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  /** Stripe Payment Link URL. Empty → local /checkout placeholder. */
  stripeUrl: string;
}

export const PACKS: Pack[] = [
  {
    id: "single",
    name: "1 video",
    videos: 1,
    price: 47,
    priceLabel: "$47",
    cadence: "One tour, up to 1 minute",
    features: [
      "One video tour from your photos",
      "Vertical + horizontal versions",
      "Your branding, music & captions",
      "Delivered in ~2 minutes",
      "Love it or it's free",
    ],
    stripeUrl: process.env.NEXT_PUBLIC_STRIPE_LINK_SINGLE ?? "",
  },
  {
    id: "trio",
    name: "3 videos",
    videos: 3,
    price: 94,
    priceLabel: "$94",
    cadence: "Three tours, up to 1 minute each",
    perVideoLabel: "Just $31 per video",
    badge: "Most popular",
    highlighted: true,
    features: [
      "Three video tours from your photos",
      "Save $47 vs buying singles",
      "Vertical + horizontal versions",
      "Your branding, music & captions",
      "Priority rendering",
    ],
    stripeUrl: process.env.NEXT_PUBLIC_STRIPE_LINK_TRIO ?? "",
  },
];

/** Build the checkout destination for a pack (real Stripe link or placeholder). */
export function packCheckoutUrl(p: Pack): string {
  if (p.stripeUrl) {
    const sep = p.stripeUrl.includes("?") ? "&" : "?";
    return `${p.stripeUrl}${sep}pack=${p.id}`;
  }
  return `/checkout?pack=${p.id}&price=${p.price}`;
}
