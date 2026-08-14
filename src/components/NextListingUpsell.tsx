"use client";

import { PACKS, packCheckoutUrl } from "@/lib/pricing";

/**
 * "Do another listing" — the repeat-purchase prompt.
 *
 * Shown to somebody who has just watched a finished tour, or who is looking at
 * their library. That is the only audience in the funnel that has already paid
 * once and seen what they got, which makes it the cheapest sale available and
 * the one place a price is not an interruption.
 *
 * Deliberately not a discount. A customer who liked the product does not need
 * bribing, and teaching buyers that the second one is cheaper is how the first
 * one stops selling.
 */
export function NextListingUpsell({
  /** Prefills Stripe when we know it. The order page does not, by design. */
  email,
  heading = "Do another listing",
  sub = "Pick the pack that fits your gallery, send the photos, and the tour comes back to your inbox.",
}: {
  email?: string;
  heading?: string;
  sub?: string;
}) {
  const href = (url: string) =>
    email ? `${url}&prefilled_email=${encodeURIComponent(email)}` : url;

  return (
    <section className="mt-12">
      <div className="text-center">
        <h2 className="font-display text-xl text-tink sm:text-2xl">
          {heading}
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-tink-soft">{sub}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {PACKS.map((p) => (
          <a
            key={p.id}
            href={href(packCheckoutUrl(p))}
            className={`group relative flex flex-col rounded-2xl border bg-paper p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
              p.highlighted ? "border-accent shadow-md" : "border-line"
            }`}
          >
            {p.badge && (
              <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {p.badge}
              </span>
            )}
            <p className="font-display text-base text-tink">{p.name}</p>
            <p className="mt-0.5 text-[13px] text-tink-soft">{p.blurbShort}</p>
            <p className="mt-3 font-display text-2xl text-tink">
              {p.priceLabel}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
              Start this one
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M2 8h11m0 0L9.5 4.5M13 8l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
