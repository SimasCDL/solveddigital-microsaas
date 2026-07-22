/**
 * Pricing packs — the ONE place to edit prices.
 *
 * Photo-based one-time packs (no subscription). Each routes to its own Stripe
 * checkout with `?pack=` appended for attribution. Set the real Stripe Payment
 * Link URLs via env (NEXT_PUBLIC_STRIPE_LINK_P15 / _P25 / _P40). Until then the
 * buttons fall back to the local /checkout dead-end placeholder (your colleague
 * swaps that for the real Stripe → success → delivery flow).
 */

export type PackId = "p15" | "p25" | "p40";

export interface Pack {
  id: PackId;
  /** Max photos, e.g. 15. */
  photos: number;
  /** Card label, e.g. "Up to 15 photos". */
  name: string;
  /** Numeric price in USD. */
  price: number;
  priceLabel: string;
  /** Original ("was") price the discount is measured against. */
  was: number;
  wasLabel: string;
  /** Short blurb for the instant-buy pack radios. */
  blurbShort: string;
  /** Longer blurb for the pricing cards. */
  blurb: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  /** Stripe Payment Link URL. Empty → local /checkout placeholder. */
  stripeUrl: string;
}

export const PACKS: Pack[] = [
  {
    id: "p15",
    photos: 15,
    name: "Up to 15 photos",
    price: 105,
    priceLabel: "$105",
    was: 160,
    wasLabel: "$160",
    blurbShort: "Quick single listing",
    blurb: "Perfect for a quick single listing",
    features: [
      "One listing video tour",
      "Vertical + horizontal cuts",
      "Licensed background music",
    ],
    stripeUrl:
      process.env.NEXT_PUBLIC_STRIPE_LINK_P15 ??
      "https://buy.stripe.com/fZu3cvfUkcuNdbwcCY0x200",
  },
  {
    id: "p25",
    photos: 25,
    name: "Up to 25 photos",
    price: 125,
    priceLabel: "$125",
    was: 190,
    wasLabel: "$190",
    blurbShort: "Most listings fit here",
    blurb: "Most listings fit right here",
    badge: "Most popular",
    highlighted: true,
    features: [
      "Everything in the 15-photo pack",
      "Longer, richer edit",
      "Priority rendering",
    ],
    stripeUrl:
      process.env.NEXT_PUBLIC_STRIPE_LINK_P25 ??
      "https://buy.stripe.com/3cIaEX23u8exefAgTe0x201",
  },
  {
    id: "p40",
    photos: 40,
    name: "Up to 40 photos",
    price: 160,
    priceLabel: "$160",
    was: 245,
    wasLabel: "$245",
    blurbShort: "Big homes & full galleries",
    blurb: "Big homes & full galleries",
    features: ["Everything in the 25-photo pack", "Full-home walkthrough"],
    stripeUrl:
      process.env.NEXT_PUBLIC_STRIPE_LINK_P40 ??
      "https://buy.stripe.com/00weVd7nOgL33AW5aw0x202",
  },
];

/** Whole-percent discount off the "was" price, e.g. 34. */
export function discountPct(p: Pack): number {
  return Math.round(((p.was - p.price) / p.was) * 100);
}

/** Look up a pack by id (falls back to the highlighted/default pack). */
export function packById(id: PackId): Pack {
  return PACKS.find((p) => p.id === id) ?? PACKS[1];
}

/** Build the checkout destination for a pack (real Stripe link or placeholder). */
export function packCheckoutUrl(p: Pack): string {
  if (p.stripeUrl) {
    const sep = p.stripeUrl.includes("?") ? "&" : "?";
    return `${p.stripeUrl}${sep}pack=${p.id}`;
  }
  return `/checkout?pack=${p.id}&price=${p.price}`;
}
