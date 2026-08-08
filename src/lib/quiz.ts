/**
 * The listing-marketing diagnostic — content and scoring for the /f/quiz funnel.
 *
 * Shape is modelled on the MoleculeData diagnostic: questions with teaching
 * interstitials folded in as steps, so the problem gets installed while the
 * visitor is still answering rather than in a wall of copy at the end.
 *
 * Every number shown in the result is derived from the visitor's own answers and
 * the $300–$1,000 videographer range the marketing site already quotes. Nothing
 * here invents a statistic — an agent will spot a made-up days-on-market figure
 * immediately, and the funnel loses them for good when they do.
 */

import { PACKS, packForPhotoCount, type Pack } from "@/lib/pricing";

export interface Choice {
  id: string;
  label: string;
}

interface BaseStep {
  id: string;
  /** Omit the step when this returns false. Steps default to shown. */
  showIf?: (a: Answers) => boolean;
}

/** Copy that varies by answer is a function; fixed copy is a plain string. */
type Dynamic<T> = T | ((a: Answers) => T);

export interface QuestionStep extends BaseStep {
  kind: "question";
  question: Dynamic<string>;
  choices: Dynamic<Choice[]>;
}

/** Which diagram the funnel renders under a lesson. Kept as a tag rather than a
 *  component so this stays a plain data module with no JSX. */
export type LessonVisual = "cost" | "feed";

export interface LessonStep extends BaseStep {
  kind: "lesson";
  title: string;
  body: (a: Answers) => string;
  visual?: LessonVisual;
}

export type Step = QuestionStep | LessonStep;
export type Answers = Record<string, string>;

export function resolve<T>(v: Dynamic<T>, a: Answers): T {
  return typeof v === "function" ? (v as (a: Answers) => T)(a) : v;
}

/**
 * Someone selling their own home, or listing one rental, has a single property.
 * Asking them "how many listings a month" — and quoting them an annual figure —
 * reads as a form that wasn't built for them, so that whole branch is skipped.
 */
export function isMultiListing(a: Answers): boolean {
  return a.who !== "homeowner" && a.who !== "host";
}

const ALL_STEPS: Step[] = [
  {
    kind: "question",
    id: "pain",
    // Self-diagnosis first: they name the pain from a menu, so every later claim
    // reads as their own conclusion. Worded to fit one property or fifty, since
    // we don't know which they are yet.
    question: "What's the hardest part of marketing a property right now?",
    // Five short options, not six sentences. This is the highest-drop-off screen
    // in the funnel — the visitor has invested nothing yet, so every extra line
    // of reading here is paid for in abandonment. The old "marketing doesn't
    // match what the property deserves" overlapped almost entirely with the
    // photos option and was the one worth losing. The "not sure" escape stays:
    // without it, anyone who doesn't recognise themselves just leaves.
    choices: [
      { id: "slow", label: "It sits on the market too long" },
      { id: "photos", label: "The photos don't do it justice" },
      { id: "cost", label: "Video costs too much" },
      { id: "time", label: "I've no time to make content" },
      { id: "unsure", label: "Not sure — it just feels off" },
    ],
  },
  {
    kind: "question",
    id: "who",
    question: "Which one are you?",
    choices: [
      { id: "agent", label: "Real estate agent" },
      { id: "team", label: "Team or brokerage" },
      { id: "homeowner", label: "Selling my own home" },
      { id: "host", label: "Short-term rental host" },
    ],
  },
  {
    kind: "question",
    id: "volume",
    // The qualifier, and the input to the annual maths. Agents and teams only.
    question: "How many listings do you market in a typical month?",
    choices: [
      { id: "v1", label: "Just one right now" },
      { id: "v2", label: "2–3" },
      { id: "v3", label: "4–8" },
      { id: "v4", label: "9 or more" },
    ],
    showIf: isMultiListing,
  },
  {
    kind: "lesson",
    id: "lesson_cost",
    visual: "cost",
    title: "This is why video doesn't make it onto every property.",
    body: (a) => {
      const c = videographerCost(a);
      if (c.single) {
        return (
          `A videographer runs ${usd(c.low)}–${usd(c.high)} for a single property, ` +
          `on top of the photographer you're already paying. For one sale that's a ` +
          `real decision — which is why most homes go to market with stills and hope, ` +
          `even when the property could carry far more.`
        );
      }
      return (
        `At ${c.perYear} listings a year, covering each one with a videographer runs ` +
        `${usd(c.low)}–${usd(c.high)}. That's the real reason video gets saved for the ` +
        `expensive properties — the cost scales with every listing you take on, so the ` +
        `ordinary ones go out with photos and hope.`
      );
    },
  },
  {
    kind: "question",
    id: "today",
    question: "How is it being marketed today?",
    choices: [
      { id: "photos", label: "Photos only" },
      { id: "phone", label: "A phone video I shoot myself" },
      { id: "pro", label: "I hire a videographer" },
      { id: "none", label: "Nothing consistent" },
    ],
  },
  {
    kind: "lesson",
    id: "lesson_feed",
    visual: "feed",
    title: "Buyers scroll before they ever browse.",
    body: () =>
      "A property now gets discovered in a feed, not on a portal — and a feed rewards " +
      "motion. A still gallery asks someone to stop and tap through. A moving tour " +
      "earns the stop by itself, which is why the same property performs differently " +
      "depending only on the format it went out in.",
  },
  {
    kind: "question",
    id: "photos",
    question: "How many photos does the gallery have?",
    choices: [
      { id: "p10", label: "Under 15" },
      { id: "p20", label: "15–25" },
      { id: "p35", label: "25–40" },
      { id: "p50", label: "More than 40" },
    ],
  },
  {
    kind: "question",
    id: "goal",
    /**
     * Future-pacing, and deliberately last. They picture the outcome and commit
     * to one, and the 30-day plan is then framed as the route to the thing they
     * just chose — their goal, not our pitch.
     */
    question: (a) =>
      isMultiListing(a)
        ? "If every listing went out with a tour, what would that win you?"
        : "If your listing went out with a tour, what would that win you?",
    choices: (a) =>
      isMultiListing(a)
        ? [
            { id: "listings", label: "More listings — it's what I'd pitch to win them" },
            { id: "faster", label: "Faster sales — fewer days on market" },
            { id: "offers", label: "Better offers — the property shows at its best" },
            { id: "time", label: "My time back — no shoots to schedule" },
          ]
        : [
            { id: "faster", label: "A faster sale" },
            { id: "offers", label: "Stronger offers — it shows at its best" },
            { id: "viewings", label: "More viewings booked" },
            { id: "confidence", label: "Knowing it's being marketed properly" },
          ],
  },
];

/** The steps this visitor actually sees, given what they've answered so far. */
export function visibleSteps(a: Answers): Step[] {
  return ALL_STEPS.filter((s) => !s.showIf || s.showIf(a));
}

/** Listings per year implied by the volume answer. */
const PER_YEAR: Record<string, number> = { v1: 12, v2: 30, v3: 72, v4: 120 };

/** Midpoint photo count per band — feeds the pack recommendation. */
const PHOTO_COUNT: Record<string, number> = { p10: 12, p20: 22, p35: 35, p50: 45 };

/** Maturity points. Lower total = more headroom, which the result leans on. */
const TODAY_POINTS: Record<string, number> = { none: 0, photos: 12, phone: 24, pro: 38 };
const PAIN_POINTS: Record<string, number> = {
  slow: 6,
  photos: 8,
  cost: 10,
  time: 8,
  unsure: 4,
};

export function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** What covering their listings costs at market rate — annual, or per-property. */
export function videographerCost(a: Answers) {
  if (!isMultiListing(a)) {
    return { single: true, perYear: 1, low: 300, high: 1000 };
  }
  const perYear = PER_YEAR[a.volume] ?? 30;
  return { single: false, perYear, low: perYear * 300, high: perYear * 1000 };
}

/** The same coverage through Tourly. Used by the interstitial chart, which runs
 *  before the photo count is known — hence a pack range rather than one price. */
export function tourlyCost(a: Answers) {
  const { perYear } = videographerCost(a);
  const lo = Math.min(...PACKS.map((p) => p.price));
  const hi = Math.max(...PACKS.map((p) => p.price));
  return { perYear, low: lo * perYear, high: hi * perYear };
}

export function recommendedPack(a: Answers): Pack {
  return packForPhotoCount(PHOTO_COUNT[a.photos] ?? 22);
}

/** 0–100. Deliberately tops out well short of 100 — nobody should feel finished. */
export function score(a: Answers): number {
  return 20 + (TODAY_POINTS[a.today] ?? 0) + (PAIN_POINTS[a.pain] ?? 0);
}

/**
 * The four rungs, shown on the result with the visitor's own marked.
 *
 * A score only stings when you can see what's above it — one label on its own
 * is just a name, whereas a ladder makes the gap the point.
 */
const TIERS_MULTI = [
  "Photo-only lister",
  "Occasional poster",
  "Steady marketer",
  "Full-funnel operator",
];
const TIERS_SINGLE = [
  "Under-marketed listing",
  "Standard listing",
  "Well-marketed listing",
  "Fully marketed listing",
];

export function tiers(single: boolean): string[] {
  return single ? TIERS_SINGLE : TIERS_MULTI;
}

export function tierIndex(s: number): number {
  if (s < 35) return 0;
  if (s < 50) return 1;
  if (s < 65) return 2;
  return 3;
}

export function archetype(s: number, single: boolean): string {
  return tiers(single)[tierIndex(s)];
}

export interface Diagnosis {
  score: number;
  archetype: string;
  tiers: string[];
  tier: number;
  single: boolean;
  perYear: number;
  costLow: number;
  costHigh: number;
  pack: Pack;
  /** Cost of the same coverage through Tourly, at the recommended pack. */
  tourlyTotal: number;
  situation: string;
  fixFirst: string;
  plan: string[];
  /** What they said they want out of it, as a sentence fragment. */
  goalPhrase: string;
}

/**
 * Mirrors the frustration they picked in question 1 straight back at them.
 *
 * Without this the pain answer only moves the score, and the visitor watches
 * their own stated problem get ignored by the "personalised" result.
 */
const PAIN_ECHO: Record<string, string> = {
  slow: "You said it sits on the market too long.",
  photos: "You said the photos don't do it justice.",
  cost: "You said video costs too much.",
  time: "You said there's no time to make the content.",
  unsure: "You weren't sure what's wrong — only that something feels off.",
};

const GOAL_PHRASE: Record<string, string> = {
  listings: "winning more listings",
  faster: "getting to an offer faster",
  offers: "pulling stronger offers",
  time: "getting your time back",
  viewings: "booking more viewings",
  confidence: "knowing it's marketed properly",
};

const SITUATION: Record<string, string> = {
  photos:
    "It's going out as a photo gallery — the same format as every other listing in the market, so nothing about it interrupts a scroll. The property has to do all the work on its own.",
  phone:
    "You're already shooting something, which puts you ahead of most of the market. The gap is consistency and finish: a handheld clip sets a bar you then have to clear every time, and anything you skip looks neglected by comparison.",
  pro: "You already know video works, because you're paying for it. The constraint isn't belief, it's economics — at that rate you can only justify it where the fee makes sense, and everything else goes out thinner.",
  none: "There's no repeatable marketing step here right now. That makes every launch a decision instead of a routine, and the properties that need the push most are usually the ones that don't get it.",
};

const FIX_FIRST: Record<string, string> = {
  photos:
    "Turn the gallery you already have into a tour. There's no new shoot — the photos already taken are enough to produce a moving walkthrough, so the fix applies to everything that's already been photographed.",
  phone:
    "Stop shooting and start converting. The gallery your photographer already delivered will produce a steadier, better-finished tour than handheld footage, and it takes the shoot out of the process entirely.",
  pro: "Keep the videographer where the fee is justified and cover everything else automatically. The money isn't in replacing what you pay for — it's in covering what you currently can't justify paying for.",
  none: "Make it a default, not a decision. If a tour gets made the moment photos land, marketing stops competing for attention with everything else.",
};

const PLAN_MULTI = [
  "Week 1 — Run your next listing's gallery through Tourly and post the vertical cut the day photos land.",
  "Week 2 — Add the horizontal cut to the portal listing and send it to your seller. It's the easiest listing-presentation win you have.",
  "Week 3 — Do it for every active listing, not just the new one. The back catalogue is where the quick wins are.",
  'Week 4 — Put it in your pitch. "Every listing I take gets a cinematic tour" is a claim your competition can\'t match at this price.',
];

const PLAN_SINGLE = [
  "Week 1 — Run your gallery through Tourly and post the vertical cut to your own feed and local groups.",
  "Week 2 — Send the horizontal cut to your agent for the portal listing. Most agents will use it — it costs them nothing and makes their listing look better.",
  "Week 3 — Re-post the vertical cut with a different opening room. The same tour reaches a different slice of the feed.",
  "Week 4 — If viewings have gone quiet, that's the signal the listing needs a fresh look before a price change, not after one.",
];

export function diagnose(a: Answers): Diagnosis {
  const s = score(a);
  const c = videographerCost(a);
  const pack = recommendedPack(a);
  const echo = PAIN_ECHO[a.pain] ?? "";
  return {
    score: s,
    archetype: archetype(s, c.single),
    tiers: tiers(c.single),
    tier: tierIndex(s),
    single: c.single,
    perYear: c.perYear,
    costLow: c.low,
    costHigh: c.high,
    pack,
    tourlyTotal: pack.price * c.perYear,
    situation: `${echo} ${SITUATION[a.today] ?? SITUATION.photos}`.trim(),
    fixFirst: FIX_FIRST[a.today] ?? FIX_FIRST.photos,
    plan: c.single ? PLAN_SINGLE : PLAN_MULTI,
    goalPhrase: GOAL_PHRASE[a.goal] ?? "",
  };
}

/** The headline cost sentence, phrased for their situation. */
export function costSentence(d: Diagnosis): string {
  return d.single
    ? `is what a videographer would charge to film your property — before you've sold anything.`
    : `is what covering your ${d.perYear} listings with a videographer would cost at market rate.`;
}
