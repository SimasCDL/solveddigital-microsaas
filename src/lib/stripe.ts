import Stripe from 'stripe';

// Lazy singleton — constructing Stripe at module load throws when the secret key
// isn't present (e.g. during Vercel's build). Build it on first use instead.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
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
  if (cents >= 7500) return 25;  // $84 pack
  return 15;                     // $65 pack (floor)
}

export async function createCheckoutSession(params: {
  orderId: string;
  email: string;
  photoCount: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: params.email,
    client_reference_id: params.orderId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: priceForPhotoCount(params.photoCount),
          product_data: {
            name: `Tourly video tour — ${params.photoCount} photo${params.photoCount === 1 ? '' : 's'}`,
            description: 'Cinematic AI video tour generated from your listing photos, delivered by email.',
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
