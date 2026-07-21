import Stripe from 'stripe';

// Lazy singleton — constructing Stripe at module load throws when the secret key
// isn't present (e.g. during Vercel's build). Build it on first use instead.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
  }));
}

// Pack ladder — keep in sync with PACKS in src/app/page.tsx
export function priceForPhotoCount(n: number): number {
  if (n <= 10) return 7000; // $70
  if (n <= 20) return 10000; // $100
  return 15000; // $150 — up to 40 photos
}

// Max photos a paid Stripe amount (in cents) entitles a customer to.
// Mirrors the funnel packs: $105→15, $125→25, $160→40. Tolerant of small
// discounts/rounding by using >= thresholds slightly below each price.
export function photosForAmount(amountTotal: number | null): number {
  const cents = amountTotal ?? 0;
  if (cents >= 15500) return 40; // $160 pack
  if (cents >= 12000) return 25; // $125 pack
  return 15;                     // $105 pack (floor)
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
