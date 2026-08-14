import { NextRequest, NextResponse } from "next/server";
import { getStripe, photosForSession } from "@/lib/stripe";

// Tells the upload page how many photos the customer's pack allows, so the
// uploader can cap itself. The real enforcement lives in /api/fulfill; this is
// just for UX. Falls back to the max (40) when there's no verifiable session.
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id");

  // dev/free bypass or no session → let them use the full uploader
  if (
    process.env.SKIP_PAYMENT_CHECK === "true" ||
    !sessionId ||
    !sessionId.startsWith("cs_")
  ) {
    return NextResponse.json({ maxPhotos: 40, paid: false });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    // 'paid' = normal purchase; 'no_payment_required' = 100%-off coupon. Both
    // are accepted by /api/fulfill, so both must open the uploader here — a
    // customer this gate turns away has already been charged (or comped) and
    // has nowhere else to go.
    if (
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      return NextResponse.json({ maxPhotos: 40, paid: false });
    }
    // amount/currency feed the browser Purchase pixel on the upload page. The
    // webhook reports the same sale server-side with event_id = session id, so
    // Meta de-dupes the two rather than counting the revenue twice.
    return NextResponse.json({
      maxPhotos: await photosForSession(session),
      paid: true,
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      // Prefills the uploader so the tour goes to the address Stripe already
      // has. A retyped address delivers the video to the wrong inbox AND stops
      // the purchase matching the nurture lead, so the buyer keeps receiving
      // "you have not bought this yet".
      email: session.customer_details?.email ?? session.customer_email ?? null,
    });
  } catch {
    return NextResponse.json({ maxPhotos: 40, paid: false });
  }
}
