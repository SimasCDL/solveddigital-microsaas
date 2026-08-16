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
  /**
   * The charged price, currency included.
   *
   * "USD" is load-bearing, not decoration. Ads run in the US, Canada and
   * Australia, and Stripe's Adaptive Pricing (always on for Payment Links)
   * shows a Canadian CA$155 at checkout for what this page called "$112". A
   * bare dollar sign reads as the local dollar everywhere it is not the local
   * dollar, and the surprise lands at the exact moment they were about to pay.
   */
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
  /** Stripe Payment Link URL. Hardcoded on purpose: an env override once left
   *  the page showing a new price while Stripe still charged the old one. */
  stripeUrl: string;
}

export const PACKS: Pack[] = [
  {
    id: "p15",
    photos: 15,
    name: "Up to 15 photos",
    price: 65,
    priceLabel: "$65 USD",
    was: 105,
    wasLabel: "$105",
    blurbShort: "Quick single listing",
    blurb: "Perfect for a quick single listing",
    features: [
      "One listing video tour",
      "Vertical + horizontal cuts",
      "Licensed background music",
    ],
    stripeUrl: "https://buy.stripe.com/7sY8wP9vW52l0oKfPa0x203",
  },
  {
    id: "p25",
    photos: 25,
    name: "Up to 25 photos",
    price: 84,
    priceLabel: "$84 USD",
    was: 125,
    wasLabel: "$125",
    blurbShort: "Most listings fit here",
    blurb: "Most listings fit right here",
    badge: "Most popular",
    highlighted: true,
    features: [
      "Everything in the 15-photo pack",
      "Longer, richer edit",
      "Priority rendering",
    ],
    stripeUrl: "https://buy.stripe.com/eVq4gzeQg52lefAauQ0x204",
  },
  {
    id: "p40",
    photos: 40,
    name: "Up to 40 photos",
    price: 112,
    priceLabel: "$112 USD",
    was: 160,
    wasLabel: "$160",
    blurbShort: "Big homes & full galleries",
    blurb: "Big homes & full galleries",
    features: ["Everything in the 25-photo pack", "Full-home walkthrough"],
    stripeUrl: "https://buy.stripe.com/14AbJ14bCdyR4F0byU0x205",
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

/** The smallest pack that covers this many photos. */
export function packForPhotoCount(count: number): Pack {
  return PACKS.find((p) => count <= p.photos) ?? PACKS[PACKS.length - 1];
}

/**
 * Build the checkout destination for a pack (real Stripe link or placeholder).
 *
 * Passing `orderId` appends Stripe's `client_reference_id`, which comes back on
 * the `checkout.session.completed` webhook — that's how paying to unlock a free
 * preview gets tied back to the order holding the customer's photos.
 */
export function packCheckoutUrl(p: Pack, orderId?: string): string {
  const ref = orderId
    ? `&client_reference_id=${encodeURIComponent(orderId)}`
    : "";
  if (p.stripeUrl) {
    const sep = p.stripeUrl.includes("?") ? "&" : "?";
    return `${p.stripeUrl}${sep}pack=${p.id}${ref}`;
  }
  return `/checkout?pack=${p.id}&price=${p.price}${ref}`;
}
