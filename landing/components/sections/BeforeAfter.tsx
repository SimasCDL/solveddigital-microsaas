"use client";

import { useCallback, useRef, useState } from "react";
import { Container } from "@/components/site/Container";
import { Swap } from "@/components/site/icons";

/**
 * Draggable before/after. AFTER = the real tour video (/hero.mp4). BEFORE = a
 * flat static "photo" placeholder — swap the BEFORE layer for a real listing
 * <img> when you have one.
 */
export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  return (
    <section className="bg-night py-24 text-cream sm:py-28">
      <Container className="max-w-4xl">
        <div className="text-center">
          <h2 className="font-display mx-auto max-w-2xl text-4xl leading-tight sm:text-5xl">
            From flat photos to a cinematic video tour{" "}
            <span className="text-[#34c4a8]">in about two minutes</span>
          </h2>
          <p className="mt-4 text-lg text-cream/60">
            Drag to compare — the same listing, before and after.
          </p>
        </div>

        <div
          ref={ref}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragging.current) setFromClientX(e.clientX);
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="relative mt-10 aspect-[16/10] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl border border-white/10 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]"
        >
          {/* AFTER — the real tour video */}
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <span className="absolute right-3 top-3 z-20 rounded-full bg-[#34c4a8] px-3 py-1 text-xs font-semibold text-night">
            After: AI video
          </span>

          {/* BEFORE — flat static photo (clipped) */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#c9c4ba] via-[#a7a298] to-[#7d786f] grayscale"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-cream backdrop-blur">
              Before: static photo
            </span>
          </div>

          {/* Handle */}
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-cream"
            style={{ left: `${pos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-ink shadow-lg">
              <Swap className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Transform caption */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-night-soft px-5 py-4 text-sm">
          <span className="font-semibold text-[#34c4a8]">
            One photo → full tour.
          </span>{" "}
          <span className="text-cream/80">
            Tourly adds the camera motion, music and pacing automatically.
          </span>
        </div>
      </Container>
    </section>
  );
}
