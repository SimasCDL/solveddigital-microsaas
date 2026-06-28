import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

export const PRICE_CENTS = 9700; // $97.00

export async function createCheckoutSession(params: {
  orderId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.email,
    client_reference_id: params.orderId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'Property Walkthrough Video',
            description: 'AI-generated cinematic walkthrough from your property photos. Delivered within 30 minutes.',
            images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600'],
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
