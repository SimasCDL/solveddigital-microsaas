"use client";

import { useRef } from "react";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";

/** Clips shown on both sides; the set is duplicated so the -50% loop is seamless. */
const CLIPS = [1, 2, 3, 4];
const TRACK = [...CLIPS, ...CLIPS];

const CARD =
  "h-full w-[200px] flex-none overflow-hidden rounded-[18px] mr-3 shadow-[0_20px_44px_-22px_rgba(0,0,0,0.45)]";
const VIDEO = "h-full w-full object-cover block";

/**
 * Before → After: two overlaid rails clipped to the left/right halves of a
 * fixed center divider. Left = the frozen first frame (a "photo"); right = the
 * same clip playing (the "video"). Both rails share the railMove animation so
 * the two halves stay pixel-aligned as they slide.
 */
export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  useVideoAutoplay(ref);

  return (
    <div
      ref={ref}
      className="relative mt-[18px] h-[300px] w-full overflow-hidden"
    >
      {/* BEFORE — clipped to the LEFT of center; frozen first frame. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: "inset(0 50% 0 0)" }}
      >
        <div className="animate-rail flex h-full w-max">
          {TRACK.map((n, i) => (
            <div key={`b-${i}`} className={CARD}>
              <video
                src={`/clips/clip-${n}.mp4#t=0.1`}
                muted
                playsInline
                preload="auto"
                className={VIDEO}
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
          {TRACK.map((n, i) => (
            <div key={`a-${i}`} className={CARD}>
              <video
                src={`/clips/clip-${n}.mp4`}
                autoPlay
                muted
                loop
                playsInline
                className={VIDEO}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fixed center divider. */}
      <div className="absolute inset-y-0 left-1/2 z-[5] w-[5px] -translate-x-1/2 rounded-[3px] bg-cream shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_0_16px_rgba(0,0,0,0.28)]" />
    </div>
  );
}
