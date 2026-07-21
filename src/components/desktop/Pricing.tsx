import { Container } from "@/components/site/Container";
import { Check, Arrow } from "@/components/site/icons";
import { PACKS, packCheckoutUrl, type Pack } from "@/lib/pricing";

function PackCard({ pack }: { pack: Pack }) {
  const highlighted = pack.highlighted;

  return (
    <div
      className={`relative flex flex-col rounded-3xl p-8 sm:p-9 ${
        highlighted
          ? "bg-night text-cream shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]"
          : "border border-line bg-paper text-ink"
      }`}
    >
      {pack.badge && (
        <span className="absolute -top-3 left-8 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink shadow-md ring-1 ring-line">
          {pack.badge}
        </span>
      )}

      <p
        className={`text-sm font-medium ${
          highlighted ? "text-cream/60" : "text-ink-soft"
        }`}
      >
        {pack.name}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl leading-none">
          {pack.priceLabel}
        </span>
        <span
          className={`text-xl line-through ${
            highlighted ? "text-cream/45" : "text-ink-soft/70"
          }`}
        >
          {pack.wasLabel}
        </span>
        <span
          className={`text-sm ${highlighted ? "text-cream/50" : "text-ink-soft"}`}
        >
          one-time
        </span>
      </div>

      <p
        className={`mt-2 text-sm ${
          highlighted ? "text-cream/70" : "text-ink-soft"
        }`}
      >
        {pack.blurb}
      </p>

      <ul className="mt-7 flex-1 space-y-3">
        {pack.features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-[0.95rem]">
            <Check
              className={`h-4 w-4 shrink-0 ${
                highlighted ? "text-[#34c4a8]" : "text-accent"
              }`}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={packCheckoutUrl(pack)}
        className={`group mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium tracking-tight transition-all active:scale-[0.99] ${
          highlighted
            ? "bg-cream text-ink hover:bg-paper"
            : "bg-ink text-cream hover:bg-ink/90"
        }`}
      >
        Choose {pack.priceLabel}
        <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <Container className="max-w-5xl">
        <div className="text-center">
          <p className="eyebrow text-ink-soft">Pricing</p>
          <h2 className="font-display mt-4 text-4xl leading-tight sm:text-5xl">
            One-time pricing. No subscription.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            A videographer charges $300+ for a single listing video. Pick a pack
            and keep your margin.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink-soft">
          Secure checkout · Instant delivery · Money-back guarantee
        </p>
      </Container>
    </section>
  );
}
