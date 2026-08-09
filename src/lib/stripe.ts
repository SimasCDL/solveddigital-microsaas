import Stripe from "stripe";

// Lazy singleton — constructing Stripe at module load throws when the secret key
// isn't present (e.g. during Vercel's build). Build it on first use instead.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia",
  }));
}

// Pack ladder — keep in sync with PACKS in src/lib/pricing.ts
export function priceForPhotoCount(n: number): number {
  if (n <= 15) return 6500; // $65
  if (n <= 25) return 8400; // $84
  return 11200; // $112 — up to 40 photos
}

// Max photos a paid Stripe amount (in cents) entitles a customer to.
// FALLBACK ONLY: the webhook entitles by Stripe Price id (PHOTOS_BY_PRICE) and
// only lands here if that lookup fails, because an amount can't survive a promo
// code — $112 minus 20% reads as the $84 pack. Thresholds sit below each price
// to tolerate rounding, not discounts.
export function photosForAmount(amountTotal: number | null): number {
  const cents = amountTotal ?? 0;
  if (cents >= 11000) return 40; // $112 pack
  if (cents >= 7500) return 25; // $84 pack
  return 15; // $65 pack (floor)
}

/**
 * Mint a single-use discount code for one lead.
 *
 * The nurture sequence tells the recipient the code belongs to them, works
 * once, and dies on a specific date. All three are enforced here rather than
 * asserted in the copy: `max_redemptions: 1` and `expires_at` mean Stripe stops
 * honouring it whether or not anyone believed the email. That is the only kind
 * of deadline worth printing, because the alternative teaches the reader that
 * the rest of the email is decoration too.
 *
 * The percentage comes back off the coupon rather than an env var, so the
 * figure in the email cannot drift from the discount actually applied.
 *
 * Returns null when `STRIPE_NURTURE_COUPON_ID` is not configured, which the
 * sequence treats as "run the offer email at full price" rather than an error.
 */
export async function createLeadPromoCode(params: {
  email: string;
  hours: number;
}): Promise<{ code: string; pct: number; expiresAt: string } | null> {
  const couponId = process.env.STRIPE_NURTURE_COUPON_ID;
  if (!couponId) return null;

  try {
    const stripe = getStripe();
    const coupon = await stripe.coupons.retrieve(couponId);
    if (!coupon.percent_off) {
      console.error("[promo] coupon is not percent-based, skipping discount");
      return null;
    }

    const expiresMs = Date.now() + params.hours * 3600_000;
    // Ambiguous characters (0/O, 1/I) left out: this gets read off a phone
    // screen and typed into Stripe by hand when the prefilled link is lost.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const suffix = Array.from(
      { length: 6 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");

    const promo = await stripe.promotionCodes.create({
      // Stripe's v22 API takes a `promotion` object here rather than the
      // top-level `coupon` the older docs and most examples still show.
      promotion: { type: "coupon", coupon: couponId },
      code: `TOUR${suffix}`,
      max_redemptions: 1,
      expires_at: Math.floor(expiresMs / 1000),
      metadata: { email: params.email, source: "quiz_nurture" },
    });

    return {
      code: promo.code,
      pct: coupon.percent_off,
      expiresAt: new Date(expiresMs).toISOString(),
    };
  } catch (err) {
    // A missing discount must never stop the offer email going out.
    console.error("[promo] could not create promotion code:", err);
    return null;
  }
}

export async function createCheckoutSession(params: {
  orderId: string;
  email: string;
  photoCount: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: params.email,
    client_reference_id: params.orderId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceForPhotoCount(params.photoCount),
          product_data: {
            name: `Tourly video tour — ${params.photoCount} photo${params.photoCount === 1 ? "" : "s"}`,
            description:
              "Cinematic AI video tour generated from your listing photos, delivered by email.",
          },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
  return session.url!;
}
