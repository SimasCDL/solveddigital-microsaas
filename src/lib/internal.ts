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
  "s@gmail.com",
  "jona.jonas@gmail.com",
  "ignataras.skucas@gmail.com",
  "razmarinas1@gmail.com",
  "nojus.siugzdinis@gmail.com",
  "simonasberesnevicius@gmail.com",
]);

/**
 * An address that cannot exist, so nobody is behind it.
 *
 * Gmail requires a username of 6 to 30 characters. `a@gmail.com` and
 * `s@gmail.com` are therefore not addresses somebody merely failed to check -
 * they cannot be registered at all, which makes anything shorter than six
 * characters a throwaway typed into a form by us.
 *
 * Structural, not a list, because listing them one at a time is how
 * `s@gmail.com` reached the channel after `a@gmail.com` was already excluded.
 * The next single letter is covered without anyone having to notice it.
 */
function isImpossibleGmail(email: string): boolean {
  const [local = "", domain = ""] = email.split("@");
  if (domain !== "gmail.com" && domain !== "googlemail.com") return false;
  // Gmail ignores dots, so `a.b@gmail.com` is a 2-character username.
  return local.replace(/\./g, "").length < 6;
}

/**
 * Not a customer: our own address, or one that could never have been real.
 *
 * Case and whitespace insensitive.
 */
export function isTestAddress(email?: string | null): boolean {
  if (!email) return false;
  const addr = email.trim().toLowerCase();
  return INTERNAL_EMAILS.has(addr) || isImpossibleGmail(addr);
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
  return !isTestAddress(email) && !isFreeCheckout(amountMajorUnits);
}
