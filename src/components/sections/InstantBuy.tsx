"use client";

import { useRef, useState } from "react";
import { Check, Shield, Arrow } from "@/components/site/icons";
import { Stars } from "@/components/site/Stars";
import { PaymentLogos } from "@/components/site/PaymentLogos";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";
import {
  PACKS,
  packById,
  packCheckoutUrl,
  discountPct,
  type PackId,
} from "@/lib/pricing";

const THUMBS = [1, 2, 3, 4];

export function InstantBuy() {
  const ref = useRef<HTMLElement>(null);
  useVideoAutoplay(ref);
  const [pack, setPack] = useState<PackId>("p25");
  const selected = packById(pack);

  return (
    <section ref={ref} id="buy" className="bg-cream px-5 pb-2 pt-9">
      <div className="rounded-[24px] border border-line bg-paper p-[18px] shadow-[0_26px_64px_-36px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <Stars />
          <span className="text-[13px] font-semibold text-ink">
            3,000+ tours delivered for agents
          </span>
        </div>

        <h2 className="font-display mt-2.5 text-[27px] font-bold tracking-[-0.01em] text-ink">
          The Listing Tour
        </h2>
        <p className="mt-1.5 whitespace-nowrap text-sm leading-[1.5] text-ink-soft">
          One upload → a polished video in ~2 minutes.
        </p>

        {/* Product gallery */}
        <div className="relative mt-4 aspect-[4/5] overflow-hidden rounded-2xl bg-night">
          <video
            src="/clips/clip-1.mp4"
            poster="/clips/clip-1.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-cream">
            Launch pricing
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {THUMBS.map((n) => (
            <div
              key={n}
              className="aspect-square overflow-hidden rounded-[10px] border border-line"
            >
              <video
                src={`/clips/clip-${n}.mp4`}
                poster={`/clips/clip-${n}.jpg`}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Dynamic price */}
        <div className="mt-4 flex items-baseline gap-2.5">
          <span className="font-display text-[34px] font-bold text-ink">
            {selected.priceLabel}
          </span>
          <span className="text-[17px] text-ink-soft line-through">
            {selected.wasLabel}
          </span>
          <span className="rounded-full bg-accent-soft px-2.5 py-[5px] text-[11.5px] font-bold text-accent">
            Save {discountPct(selected)}%
          </span>
        </div>

        {/* Product features */}
        <div className="mt-3.5 flex flex-wrap gap-x-[18px] gap-y-[9px]">
          {["Vertical (fit & full) + horizontal", "Licensed music"].map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-[7px] text-[13.5px] text-ink"
            >
              <Check className="h-4 w-4 shrink-0 text-accent" />
              {f}
            </span>
          ))}
        </div>

        <div className="my-5 h-px bg-line" />

        {/* Pack selector */}
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
          Choose your pack
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {PACKS.map((p) => {
            const on = p.id === pack;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p.id)}
                className={`relative flex items-center gap-[13px] rounded-2xl border-2 p-[15px] text-left transition-colors ${
                  on ? "border-accent bg-accent-soft" : "border-line bg-paper"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-[11px] right-3.5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-cream">
                    {p.badge}
                  </span>
                )}
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-accent">
                  <span
                    className={`h-[11px] w-[11px] rounded-full ${
                      on ? "bg-accent" : "bg-transparent"
                    }`}
                  />
                </span>
                <span className="flex-1">
                  <span className="block text-[15.5px] font-bold text-ink">
                    {p.name}
                  </span>
                  <span className="block text-[12.5px] text-ink-soft">
                    {p.blurbShort}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-base font-bold text-ink">
                    {p.priceLabel}
                  </span>
                  <span className="block text-xs text-ink-soft line-through">
                    {p.wasLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <a
          href={packCheckoutUrl(selected)}
          className="mt-[18px] flex h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)]"
        >
          Get my tour — {selected.priceLabel}
          <Arrow className="h-[18px] w-[18px]" />
        </a>

        {/* Money-back strip */}
        <div className="mt-[18px] flex items-center gap-3 rounded-[14px] border border-line bg-accent-soft px-[15px] py-3.5">
          <Shield className="h-[26px] w-[26px] shrink-0 text-accent" />
          <div>
            <div className="text-[13.5px] font-bold text-ink">
              30-day money-back guarantee
            </div>
            <div className="text-[12.5px] text-ink-soft">
              Not obsessed with your video? Full refund — keep the files.
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Secure checkout · Instant delivery
        </p>
        <PaymentLogos />
      </div>
    </section>
  );
}
