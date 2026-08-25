"use client";

import { useRef, type ReactNode } from "react";
import { Check } from "@/components/site/icons";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";
import { SELLERS_EXPECT, AGENT_ADOPTION } from "@/lib/proof";

/**
 * Everything below the second close on the result screen.
 *
 * The offer has already been made twice by the time anyone reaches this, so
 * none of it repeats the pitch. It answers the question somebody who scrolled
 * past two buy buttons is actually holding: not "how much" but "why a video at
 * all, when photos have always been the job".
 *
 * The shape of every block is the same on purpose - eyebrow, headline, the
 * evidence, then the sentence that says what the evidence means. The claim
 * lands before the explanation in each case, because a reader who has scrolled
 * this far is skimming for the point, not reading for the argument.
 *
 * ── Standing rule for this file ────────────────────────────────────────────
 * Nothing here may be written by us and attributed to a customer. That rule is
 * already carried by `Testimonials.tsx`, and it applies with more force here,
 * because `Ambassador` and `ChatProof` are *shaped* like proof: a portrait and
 * a chat screenshot read as evidence at a glance, before a word is processed.
 *
 * Both render nothing while their constant is empty, which is the guard: the
 * only way anything appears here is by someone putting real words in
 * `AMBASSADOR` or a real screenshot in `CHATS`. Everything currently in them
 * came from a customer.
 *
 * Statistics follow the same rule as the rest of the funnel: they come from
 * `@/lib/proof` with their attribution attached, and nothing is invented. The
 * "403% more inquiries" figure that circulates everywhere as NAR's is NOT here
 * on purpose - it traces to a video vendor, not to NAR, and an agent who checks
 * it stops believing every honest number on the page.
 */

/* ------------------------------------------------------------------ shared */

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
        {eyebrow}
      </p>
      <h3 className="font-display mt-2.5 text-[23px] font-bold leading-[1.18] text-ink sm:text-[26px]">
        {title}
      </h3>
    </div>
  );
}

/** The line that says what the block above it meant. Always below the evidence. */
function Payoff({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto mt-4 max-w-[23rem] text-center text-[14px] leading-[1.5] text-ink-soft">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------- why video */

/**
 * The education block, built on the two figures the funnel already stands on.
 *
 * Both are in `proof.ts` with their attribution and a `confidence` field, and
 * both are the same numbers the quiz showed earlier. Repeating them is
 * deliberate: a number met twice reads as a fact about the market, whereas two
 * different numbers making the same point read as a search for one that works.
 */
/**
 * The two figures that make the gap, as one card.
 *
 * Extracted from `WhyVideo` so the direct-buy screen can open on it. Both
 * numbers come from `proof.ts` with their own attribution - the pair only works
 * because they are the same source disagreeing with itself: sellers want it,
 * almost nobody supplies it. Printing either one alone loses the argument.
 */
export function VideoGapStats({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[22px] border border-line bg-paper p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        {/* Written out rather than patched from `claim`, which begins "of
            sellers…" because it is built to sit after the figure. Rewriting
            it in place produced "Sellers sellers say they are…". */}
        <span className="text-[14px] font-semibold leading-[1.3] text-ink">
          Sellers more likely to hire an agent who markets with video
        </span>
        <span className="font-display shrink-0 text-[23px] font-bold leading-none text-accent">
          {SELLERS_EXPECT.stat}
        </span>
      </div>

      <div className="mt-3 h-px bg-line" />

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold leading-[1.3] text-ink">
          Agents who actually put video on their listings
        </span>
        <span className="font-display shrink-0 text-[23px] font-bold leading-none text-ink">
          {AGENT_ADOPTION.stat}
        </span>
      </div>

      {/* The mark sits INSIDE the paragraph rather than above it. Floated
          into the text it costs no vertical space at all, which is the whole
          constraint on this screen - a logo row would push the payoff line
          and the next section down for no added credibility. */}
      <p className="mt-3 text-[12.5px] leading-[1.45] text-ink-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SELLERS_EXPECT.logo}
          alt={SELLERS_EXPECT.logoAlt ?? "REALTOR®"}
          className="mr-2 inline-block h-[22px] w-auto -translate-y-[1px] align-middle"
        />
        Source: {SELLERS_EXPECT.source}. {AGENT_ADOPTION.source}.
      </p>
    </div>
  );
}

function WhyVideo({ showStats }: { showStats: boolean }) {
  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="Why a tour, not more photos"
        title={
          <>
            {/* Forced onto two lines. Left to wrap, the sentence broke after
                "A", stranding the article at the end of the first line and
                making the second clause read as an afterthought. */}
            <span className="block">Photos prove a house exists.</span>
            <span className="block">A tour proves what it feels like.</span>
          </>
        }
      />

      {showStats && <VideoGapStats className="mt-6" />}

      {/* One sentence per line, forced. Left to wrap it broke mid-clause and
          the two halves stopped reading as a pair. */}
      <Payoff>
        <span className="block">A gallery shows what is in each room.</span>
        <span className="block">Only a tour shows how they connect.</span>
      </Payoff>
    </section>
  );
}

/* ------------------------------------------------------------------ versus */

/**
 * The comparison, run as the visitor's own experiment rather than a claim.
 *
 * Landscape and stacked, not two portrait cards side by side. A buyer meets a
 * listing full-width, not as a thumbnail next to its rival. Side by side both
 * were too small to feel like anything; stacked, each one gets to be a listing
 * for a moment before the next arrives.
 *
 * NOTE: the two clips are DIFFERENT properties. Every line here is therefore
 * about the format and never about "the same house" - the address is legible in
 * the portal recording, so any claim that they match is disprovable on screen.
 * Recording the portal listing of a property we have actually toured would make
 * this section considerably stronger; until then, do not write that line.
 */
function VersusDemo() {
  const wrap = useRef<HTMLDivElement>(null);
  useVideoAutoplay(wrap);

  return (
    <section className="mt-12" ref={wrap}>
      <SectionHeading
        eyebrow="Two listings, two formats"
        title="One of these gets the call."
      />

      {/* Listing A - the portal listing as it ships today */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            Listing A
          </span>
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Photos only
          </span>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-ink-soft/10">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/versus/photos-only.mp4"
            poster="/versus/photos-only.jpg"
            muted
            loop
            playsInline
            autoPlay
            preload="none"
          />
        </div>
      </div>

      {/* The hinge. It used to read "same house, same photos", which these two
          clips are not: A is a portal listing, B is a different property opened
          as a tour. The comparison is about the format either way, and a line
          the visitor can disprove by reading the address in the recording costs
          more than the symmetry was worth. */}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
          Now one that opens on a tour
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* Listing B - the same property opened as a tour */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-accent">
            Listing B
          </span>
          <span className="text-[12.5px] font-semibold text-accent">
            Opens on a tour
          </span>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border-2 border-accent bg-ink-soft/10 shadow-[0_14px_34px_-22px_rgba(15,125,107,0.8)]">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/versus/tour.mp4"
            poster="/versus/tour.jpg"
            muted
            loop
            playsInline
            autoPlay
            preload="none"
          />
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-[23rem] text-center text-[15px] font-semibold leading-[1.45] text-ink">
        Which one grabs your attention, and leaves fewer questions before
        someone reaches out?
      </p>
    </section>
  );
}

/* ------------------------------------------------- work less, earn more */

const QUESTIONS = [
  "How big is the third bedroom, really?",
  "How do the kitchen and the living room connect?",
  "I cannot read the floor plan - is the office upstairs?",
  "Is it worth the drive, or is it smaller than it looks?",
];

/**
 * The benefit an agent feels on a Tuesday, which is a different sale from the
 * one the statistics make.
 *
 * Every question here is answered by a walkthrough before it is ever asked. The
 * frame is time, not marketing: the listing that explains itself is the listing
 * that stops generating calls which end in "thanks anyway".
 */
function WorkLessEarnMore() {
  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="Work less, earn more"
        title="Every question a tour answers is a call you never take."
      />

      <div className="mt-6 rounded-[22px] border border-line bg-paper p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
          Asked on every listing
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {QUESTIONS.map((q) => (
            <li key={q} className="flex items-start gap-3">
              <Check className="mt-[3px] h-4 w-4 shrink-0 text-accent" />
              <span className="text-[14px] leading-[1.45] text-ink">{q}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-4 text-[14px] font-semibold leading-[1.45] text-ink">
          All of it answered once, in one walkthrough, working while you are
          asleep.
        </p>
      </div>

      <Payoff>
        <span className="block">The calls that cost most end in nothing.</span>
        <span className="block">
          A tour answers them before the phone rings.
        </span>
      </Payoff>
    </section>
  );
}

/* -------------------------------------------------------------- ambassador */

interface Ambassador {
  /** Path under /public. A real photograph of the person quoted. Optional so
   *  the block can go live on the quote alone while the photo is chased. */
  photo?: string;
  name: string;
  role: string;
  /** Their words. Never ours. */
  quote: string;
}

/**
 * A real customer, quoted verbatim, used with permission.
 *
 * That sentence is the whole spec for this constant. A portrait with a name and
 * a job title under it is read as a customer endorsement, so anything written
 * here is a claim about a real human being: never a composed quote, never a
 * stock photograph standing in for the person, and never a name that does not
 * answer the phone. `photo` stays optional precisely so the fallback is
 * initials rather than a stranger's face.
 */
const AMBASSADOR: Ambassador | null = {
  photo: "/reviews/daniel-ferro.jpg",
  name: "Daniel Ferro",
  role: "Managing Broker, Ferro & Vale Realty",
  quote:
    "I get pitched marketing tools constantly and I ignore almost all of them. " +
    "This one I actually put on every listing. It's the closest thing I've found " +
    "to an unfair advantage that costs less than a tank of gas.",
};

function AmbassadorNote() {
  if (!AMBASSADOR) return null;
  const initials = AMBASSADOR.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="From the field"
        title="Who is using it, and why"
      />

      {/* Attribution first, quote under it - the order the placeholder laid out
          and the right one: the name and the job title are what license the
          sentence, so meeting them first changes how the sentence is read. */}
      <figure className="mt-6 rounded-[22px] border border-line bg-paper p-5">
        <figcaption className="flex items-center gap-3.5">
          {AMBASSADOR.photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={AMBASSADOR.photo}
              alt={AMBASSADOR.name}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            /* Initials, never a stand-in face: a stock portrait beside a real
               name attributes a stranger's likeness to him. */
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[18px] font-bold text-accent">
              {initials}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-bold leading-[1.3] text-ink">
              {AMBASSADOR.name}
            </span>
            <span className="mt-0.5 block text-[13px] leading-[1.35] text-ink-soft">
              {AMBASSADOR.role}
            </span>
          </span>
        </figcaption>

        <blockquote className="mt-4 text-[15px] leading-[1.55] text-ink">
          “{AMBASSADOR.quote}”
        </blockquote>
      </figure>
    </section>
  );
}

/* ------------------------------------------------------------- chat proof */

interface Chat {
  /** Path under /public. A screenshot of a conversation that happened. */
  src: string;
  alt: string;
  caption: string;
}

/**
 * Empty until the screenshots are real conversations.
 *
 * Same rule and the same reason as the ambassador above. Real messages from
 * real sellers and buyers are the strongest proof on this page and worth
 * chasing; composed ones are an invented conversation dressed as evidence.
 */
const CHATS: Chat[] = [
  {
    src: "/reviews/chat-seller.jpg",
    alt: "Message from a seller about how the listing looks",
    caption: "From the seller",
  },
  {
    src: "/reviews/chat-buyer.jpg",
    alt: "Message from a buyer asking to book a viewing",
    caption: "From a buyer",
  },
];

function ChatProof() {
  if (!CHATS.length) return null;
  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="What comes back"
        title="What sellers and buyers say afterwards"
      />
      {/* Stacked, not side by side. At half a phone's width the message text
          rendered at about six pixels - the screenshots were on the page
          without being readable, which is worse than not having them. */}
      <div className="mt-6 flex flex-col gap-5">
        {CHATS.map((c) => (
          <figure key={c.src}>
            {/* Natural height: the screenshots are already trimmed, so nothing
                needs cropping and every bubble stays legible. */}
            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt={c.alt} className="w-full" loading="lazy" />
            </div>
            <figcaption className="mt-2 text-center text-[12px] leading-[1.35] text-ink-soft">
              {c.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ export */

/**
 * The comparison, on its own, so it can sit directly under the testimonials.
 *
 * It moved above the second close deliberately: it is the only block here that
 * asks the reader a question rather than telling them something, and a question
 * answered is a better thing to hit a price with than an argument finished.
 */
/**
 * Exported individually so the direct-buy screen can interleave them with its
 * own blocks. `ResultDeepDive` below still renders them as one unit for the
 * quiz result, where the running order was settled and should not drift.
 */
export { VersusDemo, WhyVideo, WorkLessEarnMore, AmbassadorNote, ChatProof };

/**
 * The argument, after the second close.
 *
 * `offerSlot` is the full offer card, rendered again once the case has been
 * made. By that point the reader is several screens from the last button, and
 * putting the whole card there - not a link back up - is what stops the
 * education from being where the page ends.
 */
export function ResultDeepDive({
  offerSlot,
  /** False on the direct path, where `VideoGapStats` already opens the page. */
  showStats = true,
}: {
  offerSlot?: ReactNode;
  showStats?: boolean;
}) {
  return (
    <>
      <WhyVideo showStats={showStats} />
      <WorkLessEarnMore />
      {offerSlot}
      <AmbassadorNote />
      <ChatProof />
    </>
  );
}
