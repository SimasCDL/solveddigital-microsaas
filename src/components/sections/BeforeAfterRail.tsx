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
  /** Seconds per full marquee loop (lower = faster). Defaults to the CSS 36s. */
  durationSec?: number;
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
  durationSec,
  className = "",
}: BeforeAfterRailProps) {
  const ref = useRef<HTMLDivElement>(null);
  useVideoAutoplay(ref);

  const card =
    "h-full flex-none overflow-hidden rounded-[18px] mr-3 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]";
  const video = "h-full w-full object-cover block";
  const cardStyle = { width: cardWidth };
  const railStyle = durationSec
    ? { animationDuration: `${durationSec}s` }
    : undefined;

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
        <div className="animate-rail flex h-full w-max" style={railStyle}>
          {TRACK.map((s, i) => (
            <div key={`b-${i}`} className={card} style={cardStyle}>
              {/* BEFORE is a static frame — a plain <img> paints instantly and
                  keeps 8 <video> elements off the page, so iOS doesn't starve
                  the "after" clips + purchase videos of decoders. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/transform/${s}.jpg`}
                alt=""
                loading="eager"
                fetchPriority="high"
                decoding="async"
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
        <div className="animate-rail flex h-full w-max" style={railStyle}>
          {TRACK.map((s, i) => (
            <div key={`a-${i}`} className={card} style={cardStyle}>
              <video
                src={`/transform/${s}.mp4`}
                poster={`/transform/${s}.jpg`}
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
    </div>
  );
}
