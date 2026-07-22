import { Check, Arrow } from "@/components/site/icons";
import { PACKS, type Pack } from "@/lib/pricing";

function PackCard({ pack }: { pack: Pack }) {
  const hi = pack.highlighted;
  return (
    <div
      className={`relative mt-5 rounded-[22px] p-6 ${
        hi
          ? "bg-night text-cream shadow-[0_30px_70px_-38px_rgba(0,0,0,0.6)]"
          : "border border-line bg-paper text-ink"
      }`}
    >
      {pack.badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-cream px-3 py-[5px] text-[11px] font-semibold text-ink shadow-[0_4px_10px_rgba(0,0,0,0.15)]">
          {pack.badge}
        </span>
      )}
      <p
        className={`text-[13px] font-medium ${hi ? "text-cream/60" : "text-ink-soft"}`}
      >
        {pack.name}
      </p>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-display text-[44px] font-semibold leading-none">
          {pack.priceLabel}
        </span>
        <span
          className={`text-[13px] ${hi ? "text-cream/50" : "text-ink-soft"}`}
        >
          one-time
        </span>
      </div>
      <p
        className={`mt-2 text-[13px] ${hi ? "text-cream/70" : "text-ink-soft"}`}
      >
        {pack.blurb}
      </p>

      <div className="mt-[18px] flex flex-col gap-[11px]">
        {pack.features.map((f) => (
          <div key={f} className="flex items-center gap-2.5">
            <Check
              className={`h-4 w-4 shrink-0 ${hi ? "text-[#34c4a8]" : "text-accent"}`}
            />
            <span className={`text-[13.5px] ${hi ? "text-cream" : "text-ink"}`}>
              {f}
            </span>
          </div>
        ))}
      </div>

      <a
        href="/upload"
        className={`mt-[22px] flex h-[52px] items-center justify-center gap-2 rounded-full text-[15px] font-medium ${
          hi ? "bg-cream text-ink" : "bg-ink text-cream"
        }`}
      >
        Choose {pack.priceLabel}
        <Arrow className="h-4 w-4" />
      </a>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-cream px-5 py-11">
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Pricing
        </p>
        <h2 className="font-display mt-3 text-[25px] font-semibold leading-[1.15] text-ink">
          One-time pricing. No subscription.
        </h2>
        <p className="mx-auto mt-3 max-w-[20rem] text-sm leading-[1.5] text-ink-soft">
          A videographer charges $300+ for a single listing video. Pick a pack
          and keep your margin.
        </p>
      </div>

      <div className="mt-[22px]">
        {PACKS.map((pack) => (
          <PackCard key={pack.id} pack={pack} />
        ))}
      </div>

      <p className="mt-[18px] text-center text-[11.5px] leading-[1.5] text-ink-soft">
        Secure checkout · Instant delivery · Money-back guarantee
      </p>
    </section>
  );
}
