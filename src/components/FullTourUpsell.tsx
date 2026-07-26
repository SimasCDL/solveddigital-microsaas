"use client";

import { useState } from "react";
import {
  PACKS,
  packById,
  packCheckoutUrl,
  packForPhotoCount,
  discountPct,
  type PackId,
} from "@/lib/pricing";

/**
 * The unlock offer on a finished free preview — the highest-intent moment we
 * get, since they've just watched a clip made from their own photos. Checkout
 * lives right here: the pack that covers their upload is preselected, and the
 * order id rides along so payment unlocks THIS order rather than starting a new
 * one. No re-uploading, no trip back to the landing page.
 */
export function FullTourUpsell({
  orderId,
  photoCount = 0,
  previewCount = 3,
}: {
  orderId?: string;
  photoCount?: number;
  previewCount?: number;
}) {
  const [pack, setPack] = useState<PackId>(
    () => packForPhotoCount(photoCount || 25).id,
  );
  const selected = packById(pack);
  const shown = Math.min(previewCount, photoCount || previewCount);
  const covered = Math.min(photoCount, selected.photos);

  return (
    <div className="mt-8 rounded-3xl border border-accent/25 bg-accent-soft/60 p-5 sm:p-7">
      <div className="text-center">
        <span className="eyebrow inline-block rounded-full bg-paper px-4 py-2 text-accent">
          {photoCount > shown
            ? `That was ${shown} of your ${photoCount} photos`
            : `That was just ${shown} photos`}
        </span>
        <h2 className="font-display mt-4 text-2xl leading-tight text-tink sm:text-3xl">
          Unlock your full tour
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-[15px] text-tink-soft">
          {photoCount > shown
            ? `We'll rebuild it using all ${covered} of your photos — widescreen for the MLS plus both vertical cuts, with licensed music. Yours to download.`
            : `Add your full gallery and get the complete tour — widescreen for the MLS plus both vertical cuts, with licensed music. Yours to download.`}
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

      {/* Straight to Stripe — the pack's Payment Link, carrying the order id so
          the webhook can unlock this exact order. */}
      <a
        href={packCheckoutUrl(selected, orderId)}
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
