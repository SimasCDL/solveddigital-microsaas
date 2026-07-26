"use client";

import { type RefObject, useEffect } from "react";

/**
 * Play the muted videos inside `ref`, but ONLY while each one is on screen —
 * pausing the rest via an IntersectionObserver.
 *
 * Why this matters: the marquees mount ~50 <video> elements. Forcing them all
 * to play at once starves mobile in-app browsers (Facebook/Instagram — most of
 * our traffic) of their handful of hardware video decoders, which janks the
 * page (dead clicks) and throws autoplay errors. Keeping only the visible clips
 * playing fixes that.
 *
 * React doesn't reflect the `muted` attribute, so we set it as a property before
 * calling play(). Videos whose src carries a `#t=` fragment are frozen "before"
 * frames and are never played. The JSX keeps `autoPlay` as a graceful fallback:
 * if the observer never runs, videos behave exactly as before.
 */
export function useVideoAutoplay(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const videos = Array.from(root.querySelectorAll("video"));

    const play = (v: HTMLVideoElement) => {
      v.muted = true;
      if ((v.getAttribute("src") ?? "").includes("#t=")) return; // frozen frame
      if (v.preload !== "auto") v.preload = "auto";
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    // No IntersectionObserver (old browsers) → fall back to playing them all.
    if (typeof IntersectionObserver === "undefined") {
      videos.forEach(play);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) play(v);
          else v.pause();
        }
      },
      { rootMargin: "200px", threshold: 0.01 },
    );

    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [ref]);
}
