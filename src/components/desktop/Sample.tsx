"use client";

import { useRef } from "react";
import { Container } from "@/components/site/Container";
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
      className="overflow-hidden bg-night py-24 text-cream sm:py-28"
    >
      <Container>
        <div className="max-w-3xl">
          <p className="eyebrow text-cream/50">The work</p>
          <h2 className="font-display mt-4 text-nowrap text-4xl leading-tight sm:text-5xl">
            See what two minutes gets you
          </h2>
          <p className="mt-4 text-nowrap text-lg text-cream/70">
            Real listing photos in, scroll-stopping tours out.
          </p>
        </div>
      </Container>

      <div className="marquee-row mt-14 marquee-mask">
        <div
          className="animate-marquee-right flex w-max gap-4"
          style={{ animationDuration: "40s" }}
        >
          {TRACK.map((t, i) => (
            <div
              key={`${t.src}-${i}`}
              className="relative aspect-[9/16] w-[190px] shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:w-[230px]"
            >
              <video
                src={t.src}
                poster={t.src.replace(".mp4", ".jpg")}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                {t.duration}
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3.5 text-[15px] font-medium text-cream">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
