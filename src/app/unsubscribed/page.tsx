import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribed - Tourly",
  robots: { index: false, follow: false },
};

/**
 * Where the unsubscribe link lands.
 *
 * No "are you sure", no win-back offer, no resubscribe button. Someone who
 * clicked unsubscribe has already decided, and a page that argues with them is
 * how a quiet opt-out becomes a spam complaint, which costs the sending domain
 * far more than the lead was worth.
 */
export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const failed = e === "1";

  return (
    <div className="tourly flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-ink">
      <div className="w-full max-w-[420px] text-center">
        <p className="font-display text-[21px] font-bold tracking-[-0.02em]">
          Tourly
        </p>

        {failed ? (
          <>
            <h1 className="font-display mt-6 text-[26px] font-bold leading-tight">
              That link has expired
            </h1>
            <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">
              We could not match it to a subscription, which usually means you
              are already unsubscribed. If you still hear from us, reply to any
              email and we will remove you by hand.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display mt-6 text-[26px] font-bold leading-tight">
              You are unsubscribed
            </h1>
            <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">
              That is done, and it takes effect immediately. Anything already
              queued for you has been cancelled.
            </p>
            <p className="mt-4 text-[14px] leading-[1.55] text-ink-soft">
              Emails about an order you place will still reach you, since those
              are receipts and delivery links rather than marketing.
            </p>
          </>
        )}

        <p className="mt-8">
          <Link
            href="/"
            className="text-[14px] font-semibold text-accent underline decoration-accent/30 underline-offset-2"
          >
            Back to Tourly
          </Link>
        </p>
      </div>
    </div>
  );
}
