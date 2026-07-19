"use client";

import { type RefObject, useEffect } from "react";

/**
 * Force muted autoplay on the "playing" videos inside `ref`. React doesn't
 * reflect the `muted` attribute, so browsers block autoplay — set it as a
 * property and call play() (with retries; state re-renders can pause them).
 * Videos whose src carries a `#t=` fragment are treated as frozen "before"
 * frames and left paused.
 */
export function useVideoAutoplay(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const kick = () => {
      const root = ref.current;
      if (!root) return;
      root.querySelectorAll("video").forEach((v) => {
        v.muted = true;
        const src = v.getAttribute("src") ?? "";
        if (!src.includes("#t=")) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      });
    };
    kick();
    const t1 = window.setTimeout(kick, 500);
    const t2 = window.setTimeout(kick, 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ref]);
}
