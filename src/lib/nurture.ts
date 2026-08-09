import type { Block } from "./emailBlocks";
import { diagnose, painLabel, usd, type Answers, type Diagnosis } from "./quiz";
import { packCheckoutUrl } from "./pricing";

/**
 * The post-diagnostic email sequence.
 *
 * Everything a recipient reads is derived from the answers they gave. That is
 * not decoration: the funnel's whole promise is a personalised diagnostic, and
 * a follow-up written to "Hi there" retroactively turns the quiz into a form
 * that harvested an address.
 *
 * Three rules the copy is held to:
 *
 * 1. No invented statistics. There is no "listings with video sell 32% faster"
 *    anywhere in here. Agents know their own market and one fabricated figure
 *    loses them permanently. Every number traces to PACKS or to the $300-$1,000
 *    videographer range the marketing site already quotes.
 * 2. No promise the business cannot keep. There is no monitored inbox behind
 *    this, so nothing here says "just reply to me". Every offer of help points
 *    at /help, which delivers to Telegram and reaches someone in seconds.
 * 3. Scarcity has to be real. What the copy claims depends on which kind of
 *    discount code is configured, and neither variant claims a deadline that
 *    is not enforced somewhere. See `LeadPromo`.
 */

/* ------------------------------------------------------------------ timing */

/**
 * Minutes after email capture that each step is due.
 *
 * Step 1 is delivered by Resend's scheduler because Vercel's Hobby plan only
 * permits daily crons and cannot fire at 25 minutes. Steps 2 and up are chosen
 * by the daily cron, which re-checks purchase and unsubscribe state at send
 * time. That split matters: the only email that can reach someone who bought
 * five minutes ago is step 1, and step 1 is cancellable by id.
 *
 * The front is deliberately compressed. This is an impulse-priced product, so
 * an eight-day runway to the offer put the strongest email in front of the
 * smallest audience: reach roughly halves between step 1 and step 4. The offer
 * sits at day 6 instead, and nothing before it concedes anything, because a
 * discount offered early teaches every future lead to wait for one.
 */
const DAY = 60 * 24;
export const STEP_DUE_MINUTES: Record<number, number> = {
  1: 25,
  2: 1 * DAY,
  3: 3 * DAY,
  4: 6 * DAY, // the offer: discount and bonus stacked together
  5: 9 * DAY, // last call, and the last step that carries the code
  6: 14 * DAY,
  7: 21 * DAY,
  8: 28 * DAY,
  9: 35 * DAY,
  10: 42 * DAY,
  11: 49 * DAY, // the last one, and it says so
};

export const LAST_STEP = 11;

/**
 * The only steps that carry the discount.
 *
 * Enforced rather than described: after step 5 the code is dropped from the
 * checkout link as well as the copy, so "this is the last time I mention it"
 * is a statement about what the software actually does.
 */
export const PROMO_STEPS = [4, 5];

/** Lifetime of a per-lead minted code. Step 5 lands 72h after step 4 so the
 *  "last call" email arrives while that code is still alive. */
export const PROMO_HOURS = 72;

export function dueAtFor(createdAt: string, step: number): string | null {
  const mins = STEP_DUE_MINUTES[step];
  if (!mins) return null;
  return new Date(new Date(createdAt).getTime() + mins * 60_000).toISOString();
}

/* ----------------------------------------------------------------- context */

/**
 * The discount attached to a lead, in one of two shapes.
 *
 * - **Shared** (`expiresAt: null`): one code, configured once in Stripe, sent
 *   to everyone. Cheap to run and easy to track. It cannot claim a personal
 *   deadline, so the copy sells it on exclusivity instead: it is the diagnostic
 *   price and it is not published on the site, both of which are true.
 * - **Personal** (`expiresAt` set): minted per lead through the Stripe API,
 *   single use, with a real `expires_at`. The deadline in the copy is enforced
 *   by Stripe rather than asserted by us.
 */
export interface LeadPromo {
  code: string;
  pct: number;
  expiresAt: string | null;
}

export interface LeadContext {
  email: string;
  answers: Answers;
  d: Diagnosis;
  appUrl: string;
  unsubUrl: string;
  helpUrl: string;
  /** Their pack, email prefilled, discount applied only on the promo steps. */
  checkoutUrl: string;
  promo: LeadPromo | null;
}

export function buildContext(params: {
  email: string;
  answers: Answers;
  unsubToken: string;
  promo: LeadPromo | null;
}): LeadContext {
  const d = diagnose(params.answers);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tourly.app";

  const base = packCheckoutUrl(d.pack);
  const parts = [`prefilled_email=${encodeURIComponent(params.email)}`];
  if (params.promo) {
    parts.push(`prefilled_promo_code=${encodeURIComponent(params.promo.code)}`);
  }

  return {
    email: params.email,
    answers: params.answers,
    d,
    appUrl,
    unsubUrl: `${appUrl}/api/unsubscribe?t=${encodeURIComponent(params.unsubToken)}`,
    helpUrl: `${appUrl}/help`,
    checkoutUrl: `${base}${base.includes("?") ? "&" : "?"}${parts.join("&")}`,
    promo: params.promo,
  };
}

/* ------------------------------------------------------------ copy helpers */

/** How they described their own gallery, in words rather than a band id. */
function photosPhrase(a: Answers): string {
  switch (a.photos) {
    case "p10":
      return "a dozen";
    case "p35":
      return "thirty-odd";
    case "p50":
      return "forty-plus";
    default:
      return "twenty-odd";
  }
}

/**
 * "25-photo pack".
 *
 * `pack.name` is card copy ("Up to 25 photos") and reads badly mid-sentence:
 * lowercasing it produces "your up to 25 photos pack".
 */
const packPhrase = (d: Diagnosis) => `${d.pack.photos}-photo pack`;

/** The rung above theirs on the ladder they were shown. */
function nextRung(d: Diagnosis): string {
  return d.tiers[Math.min(d.tier + 1, d.tiers.length - 1)];
}

/** "your listing" or "every listing you take", so one sentence serves both. */
const theirs = (d: Diagnosis) =>
  d.single ? "your listing" : "every listing you take";
const listingWord = (d: Diagnosis) =>
  d.single ? "your property" : "a listing";

/** What they already do, as a clause that can follow "you". */
function todayClause(a: Answers): string {
  switch (a.today) {
    case "phone":
      return "you shoot something on your phone";
    case "pro":
      return "you pay a videographer when the fee justifies it";
    case "none":
      return "there is no repeatable step yet";
    default:
      return "the gallery goes out as stills";
  }
}

function readableDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const priceAfter = (d: Diagnosis, pct: number) =>
  usd(d.pack.price - (d.pack.price * pct) / 100);

/**
 * The guarantee, pointed at /help rather than at a reply.
 *
 * The old wording said "reply and I refund you". Nothing reads that mailbox, so
 * it was a refund promise with no route to a refund, which is how a guarantee
 * turns into a chargeback.
 */
const guarantee = (c: LeadContext) =>
  `30 days to change your mind. If the tour is not something you would put your name on, ask at ${c.helpUrl} and we refund you, and you keep the files either way.`;

/* --------------------------------------------------------------- the emails */

export interface NurtureEmail {
  step: number;
  subject: (c: LeadContext) => string;
  preheader: (c: LeadContext) => string;
  blocks: (c: LeadContext) => Block[];
  /** Why this person is receiving mail, printed above the unsubscribe link. */
  reason?: string;
  /** Return true to skip this step entirely and move to the next. */
  skipIf?: (c: LeadContext) => boolean;
}

const REASON =
  "You are getting this because you ran the Tourly listing diagnostic.";

export const SEQUENCE: NurtureEmail[] = [
  /* 1 ---------------------------------------------------- +25 min: the why */
  {
    step: 1,
    subject: () => "the bit I could not fit on your result page",
    // Both sides of this comparison must be per-property. `costLow` is annual
    // for an agent, so pairing it with a pack price read as "$84 here versus
    // $21,600 elsewhere", which is not a comparison, it is a category error.
    preheader: (c) =>
      `Why one ${c.d.single ? "property" : "listing"} costs ${c.d.pack.priceLabel} here and ${usd(300)} to ${usd(1000)} elsewhere.`,
    blocks: (c) => [
      {
        t: "p",
        text: painLabel(c.answers)
          ? `Quick one while it is still fresh. You picked "${painLabel(c.answers)}" as the hardest part, and then your own answers put the going rate at ${usd(c.d.costLow)} to ${usd(c.d.costHigh)}${c.d.single ? " for the one property" : " a year"}.`
          : `Quick one while it is still fresh. Your answers put the going rate for covering ${c.d.single ? "your property" : `${c.d.perYear} listings`} at ${usd(c.d.costLow)} to ${usd(c.d.costHigh)}.`,
      },
      {
        t: "p",
        text: "The result page put our number next to that one. What it did not have room for is why the two are so far apart, and that is the part worth two minutes.",
      },
      {
        t: "figures",
        rows: [
          [
            c.d.single
              ? "Videographer, your property"
              : `Videographer, ${c.d.perYear} listings a year`,
            `${usd(c.d.costLow)} to ${usd(c.d.costHigh)}`,
          ],
          [
            "The same coverage here",
            `${usd(c.d.tourlyTotal)}${c.d.single ? "" : " a year"}`,
          ],
        ],
      },
      {
        t: "p",
        text: "The gap is not a discount, and it is not a cheaper version of the same thing. It is that nobody drives anywhere.",
      },
      {
        t: "p",
        text: "What a videographer quotes is mostly a day of their life. Travel, setup, the shoot itself, then hours in an edit suite. We start from the photos a photographer has already been paid to take, so none of that day exists. That is the entire mechanism. There is nothing clever hiding underneath it.",
      },
      { t: "h", text: "Which for you means" },
      {
        t: "ul",
        items:
          c.answers.today === "pro"
            ? [
                "Keep the videographer for the properties where the fee makes sense.",
                "Everything you currently cannot justify filming gets covered anyway.",
                "No second shoot, no second calendar to coordinate.",
              ]
            : c.answers.today === "phone"
              ? [
                  "The gallery your photographer delivered will out-shoot handheld footage.",
                  "No filming step at all, so there is nothing to skip on a busy week.",
                  "The finish is the same on the tenth one as it was on the first.",
                ]
              : [
                  `The gallery you already have for ${listingWord(c.d)} is enough. Nothing gets reshot.`,
                  "No appointment, no crew, no waiting on somebody else to be free.",
                  "It applies backwards, to everything already photographed.",
                ],
      },
      {
        t: "p",
        text: `Tomorrow I will show you exactly what comes back when you send ${photosPhrase(c.answers)} photos. If you would rather not wait, your ${packPhrase(c.d)} is here.`,
      },
      { t: "cta", label: "Turn my photos into a tour", href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    ],
    reason: REASON,
  },

  /* 2 ------------------------------------------------- +1 day: the artifact */
  {
    step: 2,
    subject: (c) =>
      `what comes back when you send ${photosPhrase(c.answers)} photos`,
    preheader: () =>
      "Three files, same day, no shoot. Here is the actual list.",
    blocks: (c) => [
      {
        t: "p",
        text: "Yesterday I said the reason this is cheap is that nobody drives anywhere. Fair enough, but that only tells you what you are not paying for. Here is what you actually get.",
      },
      { t: "h", text: `Your ${packPhrase(c.d)}` },
      {
        t: "ul",
        items: [
          "One widescreen cut, sized for the portal listing and the MLS.",
          "Two vertical cuts, sized for Reels, TikTok and Stories.",
          "Licensed background music, cleared for commercial use.",
          `Built from up to ${c.d.pack.photos} photos you already have.`,
        ],
      },
      {
        t: "p",
        text: "The camera moves through the rooms rather than cutting between stills. That is the difference between a slideshow and something that looks filmed, and it is the only reason a moving tour earns a stop in a feed when a gallery does not.",
      },
      {
        t: "p",
        text: "The honest limit, so nothing surprises you later: it works from what is in the photo. It will not invent a room you did not photograph, and it will not stage furniture that is not there. If the gallery is good, the tour is good.",
      },
      {
        t: "p",
        text: `You told me ${todayClause(c.answers)}. Uploading takes about as long as attaching them to an email, and the files come back the same day.`,
      },
      { t: "cta", label: "Send my first gallery", href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    ],
    reason: REASON,
  },

  /* 3 ----------------------------------------- +3 days: the cost of waiting */
  {
    step: 3,
    subject: (c) =>
      c.d.single
        ? "the quiet cost of a listing that is already live"
        : "the gap between you and the rung above",
    preheader: (c) =>
      `Scoring ${c.d.score} is not a verdict. It is a starting point.`,
    blocks: (c) => [
      {
        t: "p",
        text: c.d.single
          ? `The diagnostic scored you ${c.d.score} out of 100, which lands in "${c.d.archetype}" with "${nextRung(c.d)}" one rung up. The distance between those two is a single file.`
          : `The diagnostic scored you ${c.d.score} out of 100, which lands in "${c.d.archetype}" with "${nextRung(c.d)}" one rung up. The distance between them is not budget or talent. It is whether the tour gets made by default or by decision.`,
      },
      {
        t: "p",
        text: c.d.single
          ? "Here is the thing about a listing that is already on the market: the cost of under-marketing it never arrives as a bill. Nothing happens. Viewings are quiet, the portal listing looks like the other nine on the page, and eventually the conversation turns to dropping the price. That conversation is expensive in a way a tour never was."
          : `At ${c.d.perYear} listings a year, the properties that get the extra effort are the ones where the fee justifies it. That is a completely rational way to run it, and it is also why the ordinary listings go out thinner than the ones you would want a seller to judge you on.`,
      },
      {
        t: "p",
        text: c.d.single
          ? `A price drop is measured in thousands. The tour is measured in ${c.d.pack.priceLabel}.`
          : `A single lost listing costs more than covering every property you take this year. That is not a sales line, it is the arithmetic of ${usd(c.d.tourlyTotal)} against one commission.`,
      },
      {
        t: "p",
        text: c.d.goalPhrase
          ? `You said what you wanted out of this was ${c.d.goalPhrase}. Nothing in the way of that is technical.`
          : "Nothing in the way of this is technical.",
      },
      { t: "cta", label: `Get my ${packPhrase(c.d)}`, href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    ],
    reason: REASON,
  },

  /* 4 ------------------------------ +6 days: the offer, everything stacked */
  {
    step: 4,
    subject: (c) =>
      c.promo
        ? `${c.promo.pct}% off, and I will re-cut it until you are happy`
        : `your ${packPhrase(c.d)}, and everything in it`,
    preheader: (c) =>
      c.promo
        ? `Code ${c.promo.code}, ${priceAfter(c.d, c.promo.pct)} instead of ${c.d.pack.priceLabel}.`
        : "Everything that comes with it, in one place.",
    blocks: (c) => {
      const blocks: Block[] = [
        {
          t: "p",
          text: "I have sent you three emails about why this is cheap and what it produces. This one is the offer itself, laid out plainly, and then I stop pushing.",
        },
        { t: "h", text: "What you get" },
        {
          t: "ul",
          items: [
            `One widescreen cut for the portal and the MLS, from up to ${c.d.pack.photos} photos.`,
            "Two vertical cuts for Reels, TikTok and Stories.",
            "Licensed music, cleared commercially, no claim on your posts.",
            "Delivered the same day. No shoot, no crew, no calendar.",
            "Yours to keep and reuse, with no subscription attached to any of it.",
          ],
        },
      ];

      if (c.promo) {
        blocks.push({
          t: "figures",
          rows: [
            [`Your ${packPhrase(c.d)}`, c.d.pack.priceLabel],
            [
              `Code ${c.promo.code}`,
              `-${usd((c.d.pack.price * c.promo.pct) / 100)}`,
            ],
            ["You pay", priceAfter(c.d, c.promo.pct)],
          ],
        });

        // Two honest framings for two kinds of code. A shared code has no
        // per-person deadline to enforce, so it does not claim one.
        blocks.push({
          t: "p",
          text: c.promo.expiresAt
            ? `The code is ${c.promo.code}. It was made for your address, it works once, and it stops working on ${readableDate(c.promo.expiresAt)}. I will not pretend it comes back, because when it expires it is genuinely gone from Stripe.`
            : `The code is ${c.promo.code}. It is the diagnostic price, it is not on the site, and the only people who have it are the ones who sat through the questions. This email and the next one are the only places I hand it out.`,
        });
      } else {
        blocks.push({
          t: "figures",
          rows: [
            [`Your ${packPhrase(c.d)}`, c.d.pack.priceLabel],
            ["A videographer, one property", `${usd(300)} to ${usd(1000)}`],
          ],
        });
      }

      // The bonus is stacked here rather than dangled earlier on purpose. One
      // moment where everything lands beats three small concessions spread out,
      // and spreading them is what teaches people to wait for the next one.
      blocks.push(
        { t: "h", text: "And I will keep cutting until you are happy" },
        {
          t: "p",
          text: "Order this week and for the first seven days you can send it back as many times as you like. Different opening room, different pacing, a photo you would rather lead with. Say what looked wrong and it gets re-run from your gallery at no charge.",
        },
        {
          t: "p",
          text: "That is the part I would care about if I were you. The question at this price is never really the money, it is whether what comes back is any good, and this makes that question free to ask.",
        },
        {
          t: "cta",
          label: c.promo
            ? `Get it for ${priceAfter(c.d, c.promo.pct)}`
            : `Get my ${packPhrase(c.d)}`,
          href: c.checkoutUrl,
        },
        {
          t: "p",
          text: `On top of that, the 30-day guarantee still stands. Ask at ${c.helpUrl} and you get your money back, and you keep the files, because taking them back would not make either of us better off.`,
        },
        {
          t: "note",
          text: `Which means the worst case is ten minutes uploading ${photosPhrase(c.answers)} photos and a refund. There is not a version of this where you are out of pocket.`,
        },
      );

      return blocks;
    },
    reason: REASON,
  },

  /* 5 --------------------------------------------------- +9 days: last call */
  {
    step: 5,
    // Nothing to say without a code. With a personal one, it must still be live
    // or the deadline is about nothing.
    skipIf: (c) =>
      !c.promo ||
      (!!c.promo.expiresAt &&
        new Date(c.promo.expiresAt).getTime() <= Date.now()),
    subject: (c) =>
      c.promo?.expiresAt
        ? `${c.promo.code} stops working tonight`
        : `last time I mention ${c.promo?.code ?? "the code"}`,
    preheader: (c) =>
      `${c.promo?.pct ?? 0}% off your ${packPhrase(c.d)}, then I leave it alone.`,
    blocks: (c) => [
      {
        t: "p",
        text: c.promo?.expiresAt
          ? "Short one. The code I sent on Monday expires today, and after that Stripe simply stops accepting it."
          : "Short one. This is the last email that carries the code. After today I go back to writing about the work rather than selling you anything, and the link below goes back to full price.",
      },
      {
        t: "figures",
        rows: [
          ["Your code", c.promo?.code ?? ""],
          ["Your price today", priceAfter(c.d, c.promo?.pct ?? 0)],
          ["After this", c.d.pack.priceLabel],
        ],
      },
      {
        t: "p",
        text: "Seven days of free re-cuts still comes with it, so if you were waiting to be sure the output is good, this is the cheapest possible way to find out.",
      },
      { t: "cta", label: "Use it before it goes", href: c.checkoutUrl },
      {
        t: "note",
        text: "If the timing is wrong, ignore this. The pack is still there at full price next month, and the guarantee does not change.",
      },
    ],
    reason: REASON,
  },

  /* 6 ------------------------------------------ +14 days: back to the value */
  {
    step: 6,
    subject: () => "why most agents never put video on a listing",
    preheader: () =>
      "It is almost never the money, which is the interesting part.",
    blocks: (c) => [
      {
        t: "p",
        text: "The code is done, so this one is not a pitch. It is the thing I find genuinely interesting about this market.",
      },
      {
        t: "p",
        text: "When video does not happen, the reason people give is cost. When you dig, it almost never is. The real reason is that video is a project. It needs a date, a person, a property that is tidy at the right hour, and a follow-up. Every one of those is a place it can quietly fall over, and on a busy week it always does.",
      },
      {
        t: "p",
        text: 'So it becomes the thing you do for the listing that deserves it. Which sounds reasonable until you notice that the listing that "deserves it" is usually the one that would have sold anyway, and the one that needed the help went out with stills.',
      },
      {
        t: "p",
        text: `That is the whole reason this exists as a file you upload rather than a service you book. Not because the output beats a good videographer. Because it survives a bad week, and ${theirs(c.d)} gets the same treatment as the one you are proud of.`,
      },
      {
        t: "cta",
        label: "See what it does with a gallery",
        href: c.checkoutUrl,
      },
    ],
    reason: REASON,
  },

  /* 7 ---------------------------------------------- +21 days: the objections */
  {
    step: 7,
    subject: () => "three reasons people do not, answered honestly",
    preheader: () => "Including the one where you should not buy this.",
    blocks: (c) => [
      {
        t: "p",
        text: "Three objections that come up most often. Straight answers to all three.",
      },
      { t: "h", text: '"It will look like AI"' },
      {
        t: "p",
        text: "The camera moves through your actual photograph. It is not generating a house, it is moving through the one you photographed. Where it does look wrong is when the source photo is soft or badly lit, and no tool fixes that. If your photography is decent, this is decent.",
      },
      { t: "h", text: '"My sellers would not care"' },
      {
        t: "p",
        text: "Possibly. Sellers rarely ask for video. They do notice which agent turned up with a tour of their house at the listing presentation, and that is a different moment with a different audience.",
      },
      { t: "h", text: '"I do not have time to learn another tool"' },
      {
        t: "p",
        text: "There is nothing to learn. You select the photos you already have and they come back as files. If it takes more than ten minutes I have built it wrong.",
      },
      { t: "h", text: "And one case where you should not buy it" },
      {
        t: "p",
        text: "If your photos are phone snaps in poor light, this will not rescue them, and I would rather say so than take the money and have you disappointed. Spend it on a photographer first. The tour will still be here afterwards.",
      },
      { t: "cta", label: `Get my ${packPhrase(c.d)}`, href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    ],
    reason: REASON,
  },

  /* 8 --------------------------------------------------- +28 days: the story */
  {
    step: 8,
    subject: () => "the listing nobody was looking at",
    preheader: () => "Same house, same price, different file.",
    blocks: (c) => [
      {
        t: "p",
        text: "A pattern worth knowing about, because it is the most common way this gets used and not the one people expect.",
      },
      {
        t: "p",
        text: "Agents almost always run the first tour on a new listing. The second one they run is usually on something that has been sitting. Not because the property is wrong, but because the listing has gone stale in the feed and everyone who was going to see the gallery has already scrolled past it.",
      },
      {
        t: "p",
        text: "A tour gives a stale listing a legitimate reason to reappear. It is new content about an old property, which is the one thing a price drop cannot claim to be, and it costs a fraction of what the first price drop would.",
      },
      {
        t: "p",
        text: c.d.single
          ? "If your property has been live a while and gone quiet, that is the exact moment this is worth doing, and it is worth doing before the price conversation rather than after it."
          : "Your back catalogue is the cheapest thing you own. Every property already photographed is already paid for, and every one of them can move.",
      },
      {
        t: "cta",
        label: "Run it on a listing that has gone quiet",
        href: c.checkoutUrl,
      },
    ],
    reason: REASON,
  },

  /* 9 ------------------------------------------------ +35 days: the pitch use */
  {
    step: 9,
    subject: () => "the version of this that wins listings",
    preheader: () => "Not the tour. The sentence in front of it.",
    blocks: (c) => [
      {
        t: "p",
        text: c.d.single
          ? "Most of what I write goes to agents, so this one may not apply to you directly. Pass it to whoever is selling your property if it is useful."
          : "The highest-return use of this has nothing to do with any individual listing.",
      },
      {
        t: "p",
        text: "It is a line in the listing presentation: every property I take gets a cinematic tour, not just the expensive ones. That is a promise almost nobody else in a local market can make, because for them it means booking a crew every time, and the arithmetic does not work.",
      },
      {
        t: "p",
        text: "A seller cannot evaluate your pricing strategy or your negotiating. They can absolutely evaluate whether their house looks like the ones they have been scrolling past, and they will use it to decide, because it is the only evidence in the room they know how to read.",
      },
      {
        t: "p",
        text: "Which makes the tour on your last listing a sales asset before it is a marketing one. Show it in the second meeting and let it do the arguing.",
      },
      { t: "cta", label: "Build one to show", href: c.checkoutUrl },
    ],
    reason: REASON,
  },

  /* 10 ------------------------------------------- +42 days: the price question */
  {
    step: 10,
    subject: () => "is it the price, or the doubt?",
    preheader: () =>
      "Two different problems, and only one of them is about money.",
    blocks: (c) => [
      {
        t: "p",
        text: "People who read this far and still do not buy are almost always stuck on one of two things, and they are not the same problem.",
      },
      {
        t: "p",
        text: `If it is the price, the smallest pack is ${usd(65)} and covers a fifteen-photo gallery. That is the entire risk, and the 30-day guarantee sits on top of it, so the real exposure is a few minutes of uploading.`,
      },
      {
        t: "p",
        text: "If it is doubt about the output, that is more reasonable and no amount of copy from me settles it. The only thing that settles it is seeing one built from a gallery like yours, which is exactly what the seven days of free re-cuts are for.",
      },
      {
        t: "p",
        text: `If it is neither and the timing is just wrong, that is fine too. There is nothing to cancel and no subscription running in the background.`,
      },
      {
        t: "cta",
        label: `Try one on ${listingWord(c.d)}`,
        href: c.checkoutUrl,
      },
      { t: "note", text: guarantee(c) },
    ],
    reason: REASON,
  },

  /* 11 ------------------------------------------------- +49 days: the close */
  {
    step: 11,
    subject: () => "last one from me",
    preheader: () => "Closing the loop, with the useful part repeated.",
    blocks: (c) => [
      {
        t: "p",
        text: "This is the last email in the sequence you started when you ran the diagnostic. No unsubscribe needed, it simply ends here.",
      },
      {
        t: "p",
        text: "The part worth keeping, separate from whether you ever buy anything from me:",
      },
      {
        t: "ul",
        items: [
          `You scored ${c.d.score} out of 100, which is "${c.d.archetype}". One rung up is "${nextRung(c.d)}".`,
          `Covering ${c.d.single ? "your property" : `${c.d.perYear} listings a year`} at market rate runs ${usd(c.d.costLow)} to ${usd(c.d.costHigh)}.`,
          "The photos you already have are enough to produce a moving tour. That is true whether you use us or anyone else.",
        ],
      },
      {
        t: "p",
        text: `If the timing is ever right, your ${packPhrase(c.d)} is at the link below and the 30-day guarantee does not expire. And if not, thanks for the two minutes you spent on the diagnostic.`,
      },
      { t: "cta", label: "The pack, whenever", href: c.checkoutUrl },
    ],
    reason: REASON,
  },
];

/* ------------------------------------------------------- winback sequence */

/**
 * For addresses collected before the quiz funnel existed.
 *
 * The numbered sequence cannot be reused for these people. Every one of its
 * early emails is built on "you just ran the diagnostic": it opens by naming
 * their archetype, quotes figures from answers they never gave, and email 2
 * refers back to what email 1 said. Sent to someone who signed up for a free
 * preview four months ago, all of that is simply false, and the first false
 * sentence is where they stop reading.
 *
 * So this is short, and its hook is the one genuinely new fact we have: the
 * packs are about 35% cheaper than when they last looked. That is true, it is
 * specific, and it is a real reason to make contact rather than a manufactured
 * one.
 */
const WINBACK_DAY = 60 * 24;
export const WINBACK_DUE_MINUTES: Record<number, number> = {
  1: 2, // effectively immediate; a couple of minutes so a bulk enrol drips
  2: 3 * WINBACK_DAY,
  3: 6 * WINBACK_DAY,
};
export const WINBACK_LAST_STEP = 3;

/** Old prices, for the only comparison in the winback that matters. */
const OLD_PRICES: Record<string, number> = { p15: 105, p25: 125, p40: 160 };

export const WINBACK: NurtureEmail[] = [
  {
    step: 1,
    subject: () => "the price you saw is not the price any more",
    preheader: (c) =>
      `The ${packPhrase(c.d)} went from ${usd(OLD_PRICES[c.d.pack.id] ?? c.d.pack.was)} to ${c.d.pack.priceLabel}.`,
    blocks: (c) => [
      {
        t: "p",
        text: "You gave us your email at some point over the last few months, either for a free preview or for a listing plan. I have not written since, and I am not going to start writing often. This is one thing worth knowing.",
      },
      {
        t: "p",
        text: "The packs are about a third cheaper than when you last looked. Not a sale, not a launch offer, just what they cost now.",
      },
      {
        t: "figures",
        rows: [
          [
            `${packPhrase(c.d)}, then`,
            usd(OLD_PRICES[c.d.pack.id] ?? c.d.pack.was),
          ],
          [`${packPhrase(c.d)}, now`, c.d.pack.priceLabel],
        ],
      },
      {
        t: "p",
        text: "Same thing in the box: one widescreen cut for the portal and the MLS, two vertical cuts for Reels and TikTok, licensed music, built from photos you already have. No shoot, no crew, same day.",
      },
      {
        t: "p",
        text: `If the price was the reason it did not happen last time, that reason is mostly gone.`,
      },
      { t: "cta", label: `See the ${packPhrase(c.d)}`, href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    ],
    reason:
      "You are getting this because you gave Tourly your email for a free preview or a listing plan.",
  },
  {
    step: 2,
    subject: () => "what actually comes back, and what does not",
    preheader: () => "Including the honest limit, so nothing surprises you.",
    blocks: (c) => [
      {
        t: "p",
        text: "Following up once on the price note, with the part people actually want to know: what the file looks like.",
      },
      {
        t: "ul",
        items: [
          `One widescreen cut for the portal listing and the MLS, from up to ${c.d.pack.photos} photos.`,
          "Two vertical cuts sized for Reels, TikTok and Stories.",
          "Licensed music, cleared commercially.",
          "Back the same day, with no shoot and nothing to schedule.",
        ],
      },
      {
        t: "p",
        text: "The camera moves through the rooms rather than cutting between stills, which is the difference between a slideshow and something that looks filmed.",
      },
      {
        t: "p",
        text: "The honest limit: it works from what is in the photo. It will not invent a room you did not photograph or stage furniture that is not there. If the gallery is good, the tour is good. If the photos are phone snaps in bad light, this will not rescue them and I would rather say so now.",
      },
      { t: "cta", label: "Send a gallery", href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    ],
    reason:
      "You are getting this because you gave Tourly your email for a free preview or a listing plan.",
  },
  {
    step: 3,
    // The only step in the winback that carries a code, for the same reason as
    // the main sequence: a discount offered first does the selling instead of
    // the offer, and teaches everyone to wait for one.
    subject: (c) =>
      c.promo
        ? `${c.promo.pct}% on top, then I will leave it`
        : "last one about this",
    preheader: (c) =>
      c.promo
        ? `Code ${c.promo.code} on the already-lower price.`
        : "Closing the loop on the price change.",
    blocks: (c) => {
      const blocks: Block[] = [
        {
          t: "p",
          text: "Last email about this, then I go quiet again and you can forget I mentioned it.",
        },
      ];
      if (c.promo) {
        blocks.push(
          {
            t: "p",
            text: `There is a code, ${c.promo.code}, that takes ${c.promo.pct}% off the new price. It is not on the site.`,
          },
          {
            t: "figures",
            rows: [
              [
                "What it used to be",
                usd(OLD_PRICES[c.d.pack.id] ?? c.d.pack.was),
              ],
              ["What it is now", c.d.pack.priceLabel],
              [`With ${c.promo.code}`, priceAfter(c.d, c.promo.pct)],
            ],
          },
          {
            t: "p",
            text: "And if the output is not something you would put your name on, I re-cut it from your photos until it is, or refund you. Whichever you prefer.",
          },
          {
            t: "cta",
            label: `Get it for ${priceAfter(c.d, c.promo.pct)}`,
            href: c.checkoutUrl,
          },
        );
      } else {
        blocks.push(
          {
            t: "p",
            text: `The ${packPhrase(c.d)} is ${c.d.pack.priceLabel}, down from ${usd(OLD_PRICES[c.d.pack.id] ?? c.d.pack.was)}, and the guarantee means the worst case is a refund and ten minutes of your time.`,
          },
          {
            t: "cta",
            label: `Get the ${packPhrase(c.d)}`,
            href: c.checkoutUrl,
          },
        );
      }
      blocks.push({
        t: "note",
        text: `Nothing else is coming after this one. If it is ever useful, ${c.helpUrl} reaches a person.`,
      });
      return blocks;
    },
    reason:
      "You are getting this because you gave Tourly your email for a free preview or a listing plan.",
  },
];

/** Which step of which sequence carries the discount. */
export const WINBACK_PROMO_STEPS = [3];

export type LeadSource = "quiz" | "winback";

export function sequenceFor(source: LeadSource): NurtureEmail[] {
  return source === "winback" ? WINBACK : SEQUENCE;
}

export function lastStepFor(source: LeadSource): number {
  return source === "winback" ? WINBACK_LAST_STEP : LAST_STEP;
}

export function promoStepsFor(source: LeadSource): number[] {
  return source === "winback" ? WINBACK_PROMO_STEPS : PROMO_STEPS;
}

export function dueAtForSource(
  createdAt: string,
  step: number,
  source: LeadSource,
): string | null {
  const table = source === "winback" ? WINBACK_DUE_MINUTES : STEP_DUE_MINUTES;
  const mins = table[step];
  if (mins === undefined) return null;
  return new Date(new Date(createdAt).getTime() + mins * 60_000).toISOString();
}

export function emailForStepIn(
  source: LeadSource,
  step: number,
): NurtureEmail | undefined {
  return sequenceFor(source).find((e) => e.step === step);
}

/**
 * Abandoned checkout recovery.
 *
 * Not part of the numbered sequence: it fires off the Stripe
 * `checkout.session.expired` event, whenever that happens to land, and the
 * sequence carries on around it.
 *
 * These are the hottest leads in the whole funnel. Somebody who reached the
 * Stripe page had decided; something then stopped them, and roughly half the
 * time that something is mechanical rather than a change of heart. So the
 * email leads by asking whether it broke, which is both the most useful thing
 * to say and the least like a nag.
 *
 * It concedes nothing. The discount still belongs to step 4, because a code
 * handed out for abandoning teaches people to abandon. The only exception is
 * someone who was already past step 4, whose code is simply repeated.
 */
export const RECOVERY_EMAIL: NurtureEmail = {
  step: 0,
  subject: (c) => `did the checkout not work for your ${packPhrase(c.d)}?`,
  preheader: () => "If something broke, tell me and I will fix it.",
  blocks: (c) => {
    const blocks: Block[] = [
      {
        t: "p",
        text: `You got as far as the checkout for your ${packPhrase(c.d)} and it did not go through. In my experience that is one of two things.`,
      },
      {
        t: "p",
        text: `If something actually broke, a card declined, the page not loading, the discount not applying, tell me at ${c.helpUrl} and I will get it sorted. I would rather hear about it than assume you changed your mind.`,
      },
      {
        t: "p",
        text: "And if you stopped to think about it, that is fair enough. The short version of what you were buying:",
      },
      {
        t: "ul",
        items: [
          `One widescreen cut and two vertical cuts, from up to ${c.d.pack.photos} photos you already have.`,
          "Same day. No shoot, no crew, nothing to schedule.",
          "One-time. There is no subscription attached to any of it.",
        ],
      },
    ];

    if (c.promo) {
      blocks.push({
        t: "p",
        text: `Your code ${c.promo.code} is still on the link below, so it is still ${priceAfter(c.d, c.promo.pct)} rather than ${c.d.pack.priceLabel}.`,
      });
    }

    blocks.push(
      { t: "cta", label: "Pick up where you left off", href: c.checkoutUrl },
      { t: "note", text: guarantee(c) },
    );
    return blocks;
  },
  reason: REASON,
};

/**
 * A stand-in promo for the /emails review page, so steps 4 and 5 render their
 * live discounted state rather than the no-coupon fallback.
 *
 * Lives here rather than inline in the page because reading the clock during a
 * component's render is impure, and the React lint rule is right to object.
 */
export function previewPromo(): LeadPromo {
  return {
    code: process.env.NURTURE_PROMO_CODE || "YOURPLAN15",
    pct: Number(process.env.NURTURE_PROMO_PCT) || 15,
    // Null renders the shared-code copy, which is the configuration this is
    // shipping with.
    expiresAt: null,
  };
}

export function emailForStep(step: number): NurtureEmail | undefined {
  return SEQUENCE.find((e) => e.step === step);
}
