import Link from "next/link";
import { Container } from "@/components/site/Container";

/**
 * Dead-end Stripe placeholder. The pack buttons land here until the real Stripe
 * Payment Links are set (NEXT_PUBLIC_STRIPE_LINK_SINGLE / _TRIO) — at which
 * point they go straight to Stripe instead. This page is the integration seam:
 * your colleague replaces it (or the env links) with the real Stripe → success
 * → delivery flow. The pack + price are passed through for tracking.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string; price?: string }>;
}) {
  const { pack, price } = await searchParams;
  const packLabel =
    pack === "trio"
      ? "3 video tours"
      : pack === "single"
        ? "1 video tour"
        : "Your tour";

  return (
    <main className="flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-md text-center">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Tourly
        </Link>

        <div className="mt-8 rounded-3xl border border-line bg-paper p-10 shadow-2xl shadow-ink/5">
          <p className="text-sm font-medium uppercase tracking-wide text-ink-soft">
            Secure checkout
          </p>
          <p className="font-display mt-3 text-5xl text-ink">
            {price ? `$${price}` : "—"}
          </p>
          <p className="mt-2 text-ink-soft">{packLabel}</p>

          <div className="mt-8 rounded-xl border border-dashed border-line bg-cream px-5 py-6 text-sm text-ink-soft">
            Stripe checkout mounts here.
            <br />
            <span className="text-ink-soft/70">
              (pack{" "}
              <span className="font-semibold text-ink">{pack ?? "?"}</span>)
            </span>
          </div>

          <Link
            href="/"
            className="mt-8 inline-block text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            ← Back to Tourly
          </Link>
        </div>
      </Container>
    </main>
  );
}
