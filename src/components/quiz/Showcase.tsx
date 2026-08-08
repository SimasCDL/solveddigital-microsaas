"use client";

import { useEffect, useRef, useState } from "react";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";

/**
 * The proof block on the quiz intro: one large player with the exterior tour,
 * and the transform clips beneath it. Tapping a clip promotes it into the main
 * player with a crossfade; tapping the main player opens it fullscreen.
 *
 * Framed 16:9 rather than the 4:5 the home page uses, because every source clip
 * here is 16:9 — cropping to a portrait tile throws away most of the shot, which
 * defeats the point of showing the work at all.
 */

interface Item {
  src: string;
  poster: string;
  label: string;
}

/** First entry is the one that loads in the main player; the rest are thumbs. */
const ITEMS: Item[] = [
  {
    src: "/transform/daynight.mp4",
    poster: "/transform/daynight.jpg",
    label: "Day → night",
  },
  {
    src: "/clips/exterior-tour.mp4",
    poster: "/clips/exterior-tour.jpg",
    label: "Exterior tour",
  },
  { src: "/transform/pool.mp4", poster: "/transform/pool.jpg", label: "Pool" },
  {
    src: "/transform/fireplace.mp4",
    poster: "/transform/fireplace.jpg",
    label: "Fireplace",
  },
];

export function Showcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoAutoplay(rootRef);

  const [active, setActive] = useState(0);

  const select = (i: number) => {
    if (i === active) return;
    // Switch immediately — gating the swap behind a timer makes the tap feel
    // dead and queues competing timeouts if someone taps through the row fast.
    setActive(i);
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const item = ITEMS[active];

  /**
   * Drive the source change on one persistent element instead of remounting.
   *
   * `load()` is the important part: changing `src` on an element that is already
   * playing does not reliably restart it on its own, and an earlier version that
   * skipped it left the clip stalled. Rewinding to 0 keeps the first frame shown
   * and the first frame played identical, so the swap never appears to jump.
   *
   * The element is always visible. A previous attempt held it at opacity 0 until
   * `playing` fired, which meant any clip that failed to emit that event stayed
   * invisible forever — the video's own poster covers the load just as well and
   * cannot fail that way.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.load();
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [item.src]);

  return (
    <div ref={rootRef}>
      {/* Main player. The poster also sits on the container so there is never a
          bare dark box between tapping a clip and the new frame painting. */}
      <div
        ref={mainRef}
        className="relative aspect-video overflow-hidden rounded-2xl bg-night bg-cover bg-center"
        style={{ backgroundImage: `url(${item.poster})` }}
      >
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-cream">
          Made from photos
        </span>
      </div>

      <p className="mt-1.5 text-center text-[12px] font-medium text-ink-soft">
        {item.label} · tap a clip to play it here
      </p>

      {/* Every clip gets a thumb, including whichever one is currently playing.
          Showing only the inactive ones left the opening clip unreachable once
          you moved off it. */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {ITEMS.map((t, idx) => {
          const on = idx === active;
          return (
            <button
              key={t.src}
              type="button"
              onClick={() => select(idx)}
              aria-label={`Play ${t.label}`}
              aria-pressed={on}
              className={`relative aspect-video overflow-hidden rounded-[10px] border-2 transition-all ${
                on
                  ? "border-accent shadow-[0_6px_16px_-6px_rgba(15,125,107,0.6)]"
                  : "border-line opacity-85 hover:opacity-100"
              }`}
            >
              <video
                src={t.src}
                poster={t.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/85 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-bold leading-tight text-cream">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
