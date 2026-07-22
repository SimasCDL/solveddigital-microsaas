"use client";

import { useEffect } from "react";

/**
 * The mobile funnel and the desktop landing both render at all times — CSS
 * (`md:hidden` / `hidden md:block`) just toggles which one is visible. That
 * means two elements share `id="pricing"`, and native hash navigation targets
 * the FIRST in the DOM (the mobile one). On desktop that section is
 * `display:none`, so the browser can't scroll to it and clicking a #pricing
 * link does nothing. (The desktop wrapper's `zoom` also breaks native anchor
 * scrolling.)
 *
 * This intercepts clicks on any same-page #pricing link and smooth-scrolls to
 * whichever #pricing is actually on screen — desktop lands on the desktop
 * pricing, mobile on the mobile pricing.
 *
 * The desktop landing sits inside a `zoom: 0.8` wrapper, which breaks the
 * browser's native smooth scrolling (`scrollIntoView`/`scrollTo` with
 * `behavior:"smooth"` simply don't move). Instant scrolling still works, so we
 * animate it ourselves frame-by-frame.
 */
function smoothScrollTo(target: number, duration = 500) {
  const start = window.scrollY;
  const distance = target - start;
  if (Math.abs(distance) < 2) return;

  // No animation when the tab is backgrounded (rAF is paused, so it'd never
  // move) or the user prefers reduced motion — just jump straight there.
  const reduce = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;
  if (reduce || document.hidden || typeof requestAnimationFrame !== "function") {
    window.scrollTo(0, target);
    return;
  }

  const t0 = performance.now();
  const easeInOut = (p: number) =>
    p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + distance * easeInOut(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function SmartHashScroll() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const link = (e.target as HTMLElement)?.closest?.(
        'a[href$="#pricing"]',
      ) as HTMLAnchorElement | null;
      if (!link) return;

      // Only handle in-page links — let cross-page ones (e.g. /#pricing from
      // /upload) navigate normally.
      const url = new URL(link.href, window.location.href);
      if (url.pathname !== window.location.pathname) return;

      const visible = Array.from(
        document.querySelectorAll<HTMLElement>("#pricing"),
      ).find((el) => el.offsetParent !== null);
      if (!visible) return;

      e.preventDefault();
      // ~16px breathing room above the section (clears the sticky nav).
      const target = visible.getBoundingClientRect().top + window.scrollY - 16;
      smoothScrollTo(Math.max(0, target));
      history.replaceState(null, "", "#pricing");
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
