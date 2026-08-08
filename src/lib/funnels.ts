/**
 * Funnel variants — one config per landing route.
 *
 * Every landing route renders the same sections; what differs is where the CTAs
 * point and what they say. Keeping that in one table means a new variant is a
 * config edit rather than a forked copy of the page, so the sections stay a
 * single source of truth and can't drift apart.
 *
 * `main` is the live funnel at `/`. Its values are exactly what the sections
 * used to hardcode, so adding variants can never change the page that's already
 * running traffic.
 */

export type FunnelId = "main" | "direct" | "quick" | "quiz";

export interface Funnel {
  id: FunnelId;
  /** Route this funnel is served from. */
  path: string;
  /** Destination for every primary CTA on the page. */
  ctaHref: string;
  /** Label for the big CTAs — hero, instant-buy, pack cards, sticky bar. */
  ctaLabel: string;
  /** Label for the compact nav CTA, where the long one won't fit. */
  ctaLabelShort: string;
  /** Reassurance line printed under the hero CTA. */
  ctaNote: string;
}

/**
 * Variants tag their CTA with `?f=<id>` so the click can be told apart in
 * Clarity/Pixel. `main` stays untagged — an untagged hit *is* the control, and
 * leaving it bare keeps the live URLs unchanged.
 */
export const FUNNELS: Record<FunnelId, Funnel> = {
  main: {
    id: "main",
    path: "/",
    ctaHref: "/free",
    ctaLabel: "Make your first video for free",
    ctaLabelShort: "Try it free",
    ctaNote: "No card · ready in minutes",
  },
  direct: {
    id: "direct",
    path: "/f/direct",
    ctaHref: "/free?f=direct",
    ctaLabel: "Make your first video for free",
    ctaLabelShort: "Try it free",
    ctaNote: "No card · ready in minutes",
  },
  quick: {
    id: "quick",
    path: "/f/quick",
    ctaHref: "/free?f=quick",
    ctaLabel: "Make your first video for free",
    ctaLabelShort: "Try it free",
    ctaNote: "No card · ready in minutes",
  },
  /**
   * The diagnostic quiz. It renders its own self-contained page rather than the
   * shared sections, so these values only matter to anything linking *into* it.
   */
  quiz: {
    id: "quiz",
    path: "/tour",
    ctaHref: "/tour",
    ctaLabel: "Find what your listings are costing you",
    ctaLabelShort: "Free diagnostic",
    ctaNote: "2 minutes · no card needed",
  },
};

/** The control funnel — the default for any section rendered without one. */
export const MAIN_FUNNEL = FUNNELS.main;
