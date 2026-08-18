/**
 * The listing-marketing diagnostic: content and scoring for the /tour funnel.
 *
 * Shape is modelled on the MoleculeData diagnostic: questions with teaching
 * interstitials folded in as steps, so the problem gets installed while the
 * visitor is still answering rather than in a wall of copy at the end.
 *
 * POSITIONING (read this before editing any string here). The visitor did not
 * arrive looking for a video. They arrived to find out how to market a listing
 * in this market, and that is all this funnel is until the result screen. So:
 *
 *   - No price appears anywhere before the result. A price mid-quiz turns a
 *     diagnostic into an ad, and the visitor re-reads every earlier screen as
 *     one.
 *   - The interstitials pay out. Each one hands over something usable on its
 *     own, sourced to somebody who is not us, because the promise on the way in
 *     was that they would learn something.
 *   - The product is never named in a question. "If every listing went out with
 *     a tour" pre-supposes the answer and tells them what is being sold three
 *     screens early.
 *
 * Every number shown in the result derives from the visitor's own answers and
 * the $300-$1,000 videographer range the marketing site already quotes. Nothing
 * here invents a statistic; third-party figures come from `@/lib/proof`, which
 * carries their attribution. An agent spots a made-up days-on-market figure
 * immediately, and the funnel loses them for good when they do.
 */

import { PACKS, packForPhotoCount, type Pack } from "@/lib/pricing";
import { SELLERS_EXPECT, type ProofPoint } from "@/lib/proof";

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
  /**
   * An attributed industry figure, rendered small and quiet under the options.
   *
   * This is the difference between a form and a briefing. A question screen on
   * its own asks the visitor to rate how badly they are doing, which is a thing
   * people leave rather than answer. The same screen with a sourced figure at
   * the bottom reads as reading material that happens to ask a question, and
   * the figure does the arguing so we never have to.
   *
   * Deliberately not on every screen. On all eight it becomes furniture and
   * stops being read.
   */
  proof?: ProofPoint;
}

/** Which diagram the funnel renders under a lesson. Kept as a tag rather than a
 *  component so this stays a plain data module with no JSX. */
export type LessonVisual = "gap" | "feed";

export interface LessonStep extends BaseStep {
  kind: "lesson";
  /** Eyebrow above the title. Frames the screen as a finding, not a pitch. */
  eyebrow?: string;
  title: string;
  body: (a: Answers) => string;
  visual?: LessonVisual;
  /**
   * The payout. One instruction they can act on tonight without buying
   * anything.
   *
   * This is the part that makes the whole funnel honest. The landing page
   * promises they will learn how to market a listing; if every interstitial
   * only softens them up for the offer, the promise was bait and the result
   * screen is where they realise it. A takeaway that works standalone is also
   * the strongest possible setup for the offer, because it proves we know the
   * job before we ask for money.
   */
  takeaway?: string;
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
      { id: "unsure", label: "Not sure, it just feels off" },
    ],
    // The first screen is the one that has to establish this is a briefing
    // rather than a lead form, so the strongest figure we have goes here. It is
    // also the only one that reframes the whole quiz before they answer it:
    // marketing is not a cost they choose to absorb, it is something sellers
    // are already grading them on.
    proof: SELLERS_EXPECT,
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
    id: "lesson_gap",
    visual: "gap",
    eyebrow: "What the research says",
    /**
     * Was a price comparison. It is now the single most valuable screen in the
     * funnel and mentions no price at all.
     *
     * The old version put our own cost chart in front of someone who had
     * answered three questions and been promised a diagnostic. It converted the
     * screen into an ad, and everything after it read as one. This version
     * hands them a genuine finding about their own market and lets the finding
     * sell: a demand number and a supply number that do not match. An agent
     * does not need the conclusion spelled out, and spelling it out is what
     * would make them suspicious of it.
     */
    title: "The gap almost nobody in your market is filling.",
    /**
     * Three short sentences, and the word "video" appears in the first one.
     *
     * The previous version ran six lines and never said what the gap was in, so
     * the chart underneath read as "sellers who want it" with no antecedent. A
     * reader who has to hold an unexplained "it" across two paragraphs stops
     * reading. Naming video here is safe: it is presented as what SELLERS
     * expect, not as what we sell, and no price or product follows it.
     */
    body: () =>
      "Sellers judge your marketing before they judge you. Most of them now " +
      "expect video on their listing. Almost none of the agents you compete " +
      "with actually deliver it.",
    takeaway:
      "Try this at your next listing appointment: open with how you will market " +
      "the property, before price or commission comes up. It is what the seller " +
      "came to hear, and it is the part most agents leave until last.",
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
    eyebrow: "Where it actually gets found",
    title: "Buyers scroll before they ever browse.",
    // No diagram. The abstract feed mock illustrated a sentence that was already
    // clear, and it pushed the takeaway and the button below the fold on a
    // phone for no gain.
    /**
     * Kept, tightened, and given a payout. The angle was already right: it is
     * the only screen that explains why the format matters at all, and it does
     * it without asking anyone to believe a number.
     *
     * Shorter than it was. This lands about halfway through, which is where
     * people start deciding whether the rest is worth it, and a six-line
     * paragraph at that exact point is what makes them decide it is not.
     */
    body: () =>
      "Properties get discovered in a feed, not on a portal, and the same feed " +
      "rewards motion. A gallery that moves earns the stop on its own. Same " +
      "property, same photos, but different results, decided only by the format " +
      "it was delivered in.",
    /**
     * The diagram that sat here is gone, so the takeaway is now the only thing
     * between the paragraph and the button and has to carry the screen on its
     * own. Two lines instead of one: the instruction, then the reason it works.
     * The reason is what makes it feel like advice rather than a tip list.
     */
    takeaway:
      "Whatever you post next, open on a shot with depth in it. A hallway, or a " +
      "view through a doorway into another room. Depth is what makes a thumb " +
      "stop, and almost every agent in your market opens with the front of the " +
      "house instead.",
  },
  {
    kind: "question",
    id: "photos",
    /**
     * Was "How many photos does the gallery have?", which reads like a form
     * field written by somebody who has never spoken to an agent. Split by
     * branch: an agent is thinking about what their photographer hands back,
     * and a single seller has no photographer and no "gallery".
     */
    question: (a) =>
      isMultiListing(a)
        ? "How many photos does your photographer usually deliver?"
        : "How many photos do you have of the property?",
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
     * to one, and the plan is then framed as the route to the thing they just
     * chose: their goal, not our pitch.
     *
     * The old wording was "If every listing went out with a tour". That names
     * the product two screens before the result and turns the last question
     * into the pitch, so the answer they give is an answer to an ad. Asking
     * about the marketing being handled well keeps the frame the landing page
     * set, and the answer stays theirs.
     */
    question: (a) =>
      isMultiListing(a)
        ? "If every listing you took was marketed properly, what would you want it to win you?"
        : "If this property were marketed properly, what would you want it to win you?",
    choices: (a) =>
      isMultiListing(a)
        ? [
            {
              id: "listings",
              label: "More listings. It is what I would pitch to win them",
            },
            { id: "faster", label: "Faster sales, fewer days on market" },
            {
              id: "offers",
              label: "Better offers, because it shows at its best",
            },
            { id: "time", label: "My time back, with nothing to schedule" },
          ]
        : [
            { id: "faster", label: "A faster sale" },
            {
              id: "offers",
              label: "Stronger offers, because it shows at its best",
            },
            { id: "viewings", label: "More viewings booked" },
            {
              id: "confidence",
              label: "Knowing it is being marketed properly",
            },
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
const PHOTO_COUNT: Record<string, number> = {
  p10: 12,
  p20: 22,
  p35: 35,
  p50: 45,
};

/** Maturity points. Lower total = more headroom, which the result leans on. */
const TODAY_POINTS: Record<string, number> = {
  none: 0,
  photos: 12,
  phone: 24,
  pro: 38,
};
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

/**
 * One videographer, one property, at the conservative end of the market.
 *
 * The result screen compares a single number against a single number, because
 * that is the comparison the buyer is actually making at that moment: this
 * property, this week, one way or the other. A range against a range makes the
 * reader do arithmetic at the exact point they were about to decide, and the
 * annual figure the old card showed compared a year of their listings against a
 * year of ours, which is a bigger and less believable claim than the one we
 * need.
 *
 * $500 sits low inside the $300-$1,000 range the marketing site quotes and the
 * lesson screens teach. Understating the comparison costs a little contrast and
 * buys the thing worth more: an agent who has actually paid a videographer
 * recognises the number instead of arguing with it.
 */
export const VIDEOGRAPHER_TYPICAL = 500;

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
/**
 * The single-property ladder.
 *
 * "Well-marketed listing" sat one rung below the top, which is a contradiction
 * the reader notices before they notice their score: if it is well marketed,
 * what is the rung above it, and why am I being sold something? A ladder only
 * works when each rung is obviously short of the next one. These are phrased as
 * how much marketing the property is getting, not as a verdict on whether it is
 * good enough, so the gap is a quantity rather than an insult.
 */
const TIERS_SINGLE = [
  "Under-marketed",
  "Standard listing",
  "Ahead of the block",
  "Fully marketed",
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
  unsure: "You weren't sure what's wrong, only that something feels off.",
};

/**
 * The pain echo on its own.
 *
 * `diagnose()` glues it to the situation paragraph, but the nurture emails open
 * on it as a standalone line, and reading their own words back in the first
 * sentence is what separates a follow-up from a broadcast. Exported rather than
 * copied so the two can never disagree about what the visitor said.
 */
export function painEcho(a: Answers): string {
  return PAIN_ECHO[a.pain] ?? "";
}

/**
 * The exact option they tapped, word for word.
 *
 * Quoting the choice beats restating it. "You said video costs too much" is a
 * template filling a slot, and it reads like one; «you picked "Video costs too
 * much"» is a quote of something they actually did, which is both true and
 * obviously true to the reader. Pulled from ALL_STEPS so it cannot drift from
 * the wording on the screen they tapped it on.
 */
export function choiceLabel(a: Answers, stepId: string): string {
  const q = ALL_STEPS.find((s) => s.id === stepId);
  if (!q || q.kind !== "question") return "";
  return resolve(q.choices, a).find((c) => c.id === a[stepId])?.label ?? "";
}

export function painLabel(a: Answers): string {
  return choiceLabel(a, "pain");
}

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
