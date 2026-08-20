/**
 * The team's own addresses.
 *
 * Every funnel here is tested through the real endpoints and the real Stripe
 * account, so our own traffic lands in the same tables as the customers'. Left
 * alone it does not just add noise, it moves the numbers the business is
 * steered by: before this was applied, 13 of 22 order rows were ours, and a
 * "New sale" alert fired in the channel every time somebody ran a test.
 *
 * One list, imported everywhere, because the previous copy lived inside
 * `backfill-leads` and nothing else could see it. Anything that counts, alerts
 * on, or mails a person should ask this module first.
 *
 * Historic rows for these addresses were deleted on 21 Aug 2026. This is what
 * stops them coming back.
 */
const INTERNAL_EMAILS = new Set([
  "mr.redwolf01@gmail.com",
  "a@gmail.com",
  "jona.jonas@gmail.com",
  "ignataras.skucas@gmail.com",
  "razmarinas1@gmail.com",
  "nojus.siugzdinis@gmail.com",
  "simonasberesnevicius@gmail.com",
]);

/** True for our own addresses. Case and whitespace insensitive. */
export function isInternalEmail(email?: string | null): boolean {
  if (!email) return false;
  return INTERNAL_EMAILS.has(email.trim().toLowerCase());
}

/**
 * A checkout that moved no money is not a sale.
 *
 * Stripe reports a 100%-off coupon as `no_payment_required` with a zero total,
 * and the webhook treats that as a completed checkout because for fulfilment it
 * is one: somebody is owed a video. For counting it is not. Reporting it as
 * revenue puts a "New sale $0" in the channel and adds a buyer who never paid
 * to the day's total.
 */
export function isFreeCheckout(amountMajorUnits: number): boolean {
  return !(amountMajorUnits > 0);
}

/** Both reasons a completed checkout should not be counted or announced. */
export function countsAsSale(
  email: string | null | undefined,
  amountMajorUnits: number,
): boolean {
  return !isInternalEmail(email) && !isFreeCheckout(amountMajorUnits);
}
