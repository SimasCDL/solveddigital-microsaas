import { NextRequest, NextResponse } from 'next/server';
import { getStripe, photosForAmount } from '@/lib/stripe';

// Tells the upload page how many photos the customer's pack allows, so the
// uploader can cap itself. The real enforcement lives in /api/fulfill; this is
// just for UX. Falls back to the max (40) when there's no verifiable session.
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('session_id');

  // dev/free bypass or no session → let them use the full uploader
  if (process.env.SKIP_PAYMENT_CHECK === 'true' || !sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ maxPhotos: 40, paid: false });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    // 'no_payment_required' is a 100%-off coupon — a real, entitled customer.
    // /api/fulfill has always accepted both; this route only accepted 'paid',
    // so a free-coupon buyer was shown the locked uploader and could not
    // deliver their photos at all. Keep the two in agreement.
    if (
      session.payment_status !== 'paid' &&
      session.payment_status !== 'no_payment_required'
    ) {
      return NextResponse.json({ maxPhotos: 40, paid: false });
    }
    // amount/currency feed the browser Purchase pixel on the upload page. The
    // webhook reports the same sale server-side with event_id = session id, so
    // Meta de-dupes the two rather than counting the revenue twice.
    return NextResponse.json({
      maxPhotos: photosForAmount(session.amount_total),
      paid: true,
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? 'usd',
    });
  } catch {
    return NextResponse.json({ maxPhotos: 40, paid: false });
  }
}
