"use client";

import { useRef } from "react";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";

/** AI staging transformations — first frame = "before", playing = "after". */
const SCENES = ["furniture", "daynight", "fireplace", "pool"];
const TRACK = [...SCENES, ...SCENES];

interface BeforeAfterRailProps {
  /** Rail height in px. */
  height: number;
  /** Card width in px (landscape scenes read best wider than tall). */
  cardWidth: number;
  className?: string;
}

/**
 * Two overlaid marquees clipped to the left/right of a fixed center divider.
 * Left half shows each clip frozen on its first frame (the "before"); right
 * half shows it playing (the AI-staged "after"). Both rails share the railMove
 * animation so the halves stay pixel-aligned as scenes slide across the seam.
 */
export function BeforeAfterRail({
  height,
  cardWidth,
  className = "",
}: BeforeAfterRailProps) {
  const ref = useRef<HTMLDivElement>(null);
  useVideoAutoplay(ref);

  const card =
    "h-full flex-none overflow-hidden rounded-[18px] mr-3 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]";
  const video = "h-full w-full object-cover block";
  const cardStyle = { width: cardWidth };

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* BEFORE — clipped to the LEFT of center; frozen first frame. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: "inset(0 50% 0 0)" }}
      >
        <div className="animate-rail flex h-full w-max">
          {TRACK.map((s, i) => (
            <div key={`b-${i}`} className={card} style={cardStyle}>
              <video
                src={`/transform/${s}.mp4#t=0.1`}
                muted
                playsInline
                preload="auto"
                className={video}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AFTER — clipped to the RIGHT of center; the same clip playing. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: "inset(0 0 0 50%)" }}
      >
        <div className="animate-rail flex h-full w-max">
          {TRACK.map((s, i) => (
            <div key={`a-${i}`} className={card} style={cardStyle}>
              <video
                src={`/transform/${s}.mp4`}
                autoPlay
                muted
                loop
                playsInline
                className={video}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fixed center divider. */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[5] w-[5px] -translate-x-1/2 rounded-[3px] bg-cream shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_0_16px_rgba(0,0,0,0.32)]" />

      {/* Corner labels. */}
      <span className="pointer-events-none absolute left-3 top-3 z-[6] rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 z-[6] rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
        After
      </span>
    </div>
  );
}
