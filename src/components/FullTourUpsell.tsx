"use client";

import { useState } from "react";
import {
  PACKS,
  packById,
  packCheckoutUrl,
  discountPct,
  type PackId,
} from "@/lib/pricing";

/**
 * The upsell on a finished free trial — the highest-intent moment we get, since
 * they've just watched a clip made from their own photos. So checkout lives
 * right here: pick a pack, one tap to Stripe. No trip back to the landing page.
 */
export function FullTourUpsell() {
  const [pack, setPack] = useState<PackId>("p25");
  const selected = packById(pack);

  return (
    <div className="mt-8 rounded-3xl border border-accent/25 bg-accent-soft/60 p-5 sm:p-7">
      <div className="text-center">
        <span className="eyebrow inline-block rounded-full bg-paper px-4 py-2 text-accent">
          That was just 2 photos
        </span>
        <h2 className="font-display mt-4 text-2xl leading-tight text-tink sm:text-3xl">
          Now do the whole listing
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-[15px] text-tink-soft">
          Same look, your full gallery — widescreen for the MLS plus both
          vertical cuts, with licensed music. Delivered in about 15 minutes.
        </p>
      </div>

      {/* Pack picker */}
      <div className="mt-5 flex flex-col gap-2.5">
        {PACKS.map((p) => {
          const on = p.id === pack;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPack(p.id)}
              aria-pressed={on}
              className={`relative flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${
                on
                  ? "border-accent bg-paper"
                  : "border-line bg-paper/70 hover:border-accent/40"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 right-3.5 rounded-full bg-tink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-cream">
                  {p.badge}
                </span>
              )}
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-accent">
                <span
                  className={`h-[11px] w-[11px] rounded-full ${on ? "bg-accent" : "bg-transparent"}`}
                />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-tink">
                  {p.name}
                </span>
                <span className="block text-[12.5px] text-tink-soft">
                  {p.blurbShort}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-base font-bold text-tink">
                  {p.priceLabel}
                </span>
                <span className="block text-xs text-tink-soft line-through">
                  {p.wasLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Straight to Stripe — the pack's Payment Link */}
      <a
        href={packCheckoutUrl(selected)}
        className="mt-4 flex h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] ring-1 ring-white/10 transition-all hover:brightness-[1.06] active:scale-[0.99]"
      >
        Get my full tour — {selected.priceLabel}
        <span aria-hidden="true">→</span>
      </a>

      <p className="mt-3 text-center text-[13px] text-tink-soft">
        Save {discountPct(selected)}% · Secure checkout · 30-day money-back
        guarantee
      </p>
    </div>
  );
}
