"use client";

import { useRef } from "react";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";
import { WORK_TOURS } from "@/lib/work";

/** Cards duplicated once so the -50% marquee loop is seamless. */
const TRACK = [...WORK_TOURS, ...WORK_TOURS];

export function Sample() {
  const ref = useRef<HTMLElement>(null);
  useVideoAutoplay(ref);

  return (
    <section
      ref={ref}
      id="work"
      className="overflow-hidden bg-night py-11 text-cream"
    >
      <div className="px-5 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-cream/50">
          The work
        </p>
        <h2 className="font-display mt-3 text-[26px] font-semibold leading-[1.15]">
          See what two minutes gets you
        </h2>
        <p className="mx-auto mt-2.5 max-w-[19rem] text-sm leading-[1.5] text-cream/70">
          Real listing photos in, scroll-stopping tours out.
        </p>
      </div>

      {/* Auto-scrolling carousel, moving right. */}
      <div className="marquee-mask mt-[22px]">
        <div
          className="animate-marquee-right flex w-max gap-3.5 px-2.5"
          style={{ animationDuration: "20s" }}
        >
          {TRACK.map((t, i) => (
            <div key={`${t.src}-${i}`} className="w-[158px] flex-none">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[18px] border border-white/10">
                <video
                  src={t.src}
                  poster={t.src.replace(".mp4", ".jpg")}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-[3px] text-[10.5px] font-semibold text-white backdrop-blur">
                  {t.duration}
                </span>
                <span className="absolute bottom-2 left-2 text-[12.5px] font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                  {t.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
