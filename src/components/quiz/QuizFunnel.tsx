"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shield, Arrow, Bolt, Check } from "@/components/site/icons";
import { Stars } from "@/components/site/Stars";
import { PaymentLogos } from "@/components/site/PaymentLogos";
import { ReviewAvatars } from "@/components/site/ReviewsRow";
import { LessonArt } from "@/components/quiz/LessonArt";
import { ProofNote } from "@/components/quiz/ProofNote";
import { IntroTestimonials } from "@/components/quiz/IntroTestimonials";
import { BeforeAfterRail } from "@/components/sections/BeforeAfterRail";
import { Testimonials } from "@/components/quiz/Testimonials";
import {
  ResultDeepDive,
  VersusDemo,
  VideoGapStats,
  WhyVideo,
  WorkLessEarnMore,
  AmbassadorNote,
  ChatProof,
} from "@/components/quiz/ResultDeepDive";
import {
  packCheckoutUrl,
  discountPct,
  packById,
  PACKS,
  type Pack,
  type PackId,
} from "@/lib/pricing";
import { track, sessionId } from "@/lib/track";
import { trackCompleteRegistrationOnce } from "@/components/MetaPixel";
import {
  visibleSteps,
  diagnose,
  choiceLabel,
  resolve,
  usd,
  VIDEOGRAPHER_TYPICAL,
  type Answers,
  type Diagnosis,
} from "@/lib/quiz";

/**
 * `checkout` is the live path: intro -> packs -> Stripe.
 *
 * The diagnostic phases (`steps`, `email`, `analyzing`, `result`) are no longer
 * reachable from the intro. They are kept, not deleted, for two reasons: the
 * `/questions` review page mounts each one as its own frame, and putting the
 * quiz back is a one-line change to the intro's `onStart`. Nothing else in the
 * app routes into them.
 */
type Phase = "intro" | "steps" | "email" | "analyzing" | "result" | "checkout";

/**
 * How long the post-diagnostic price holds, per visitor.
 *
 * 14:22 rather than a flat 15:00 on purpose — a timer that opens on a round
 * number announces that it started when you arrived. An odd figure reads as a
 * clock that was already running.
 */
const OFFER_SECONDS = 14 * 60 + 22;
const OFFER_KEY = "tourly_quiz_offer_end";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Countdown on the offer. Persisted in localStorage so a refresh doesn't hand
 * out a fresh 15 minutes — a timer that visibly resets reads as fake and costs
 * more trust than the urgency buys.
 */
function useOfferCountdown(active: boolean) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const store = (ms: number) => {
      try {
        localStorage.setItem(OFFER_KEY, String(ms));
      } catch {
        // Private mode — the window just won't survive a reload.
      }
    };
    const fresh = () => {
      const e = Date.now() + OFFER_SECONDS * 1000;
      store(e);
      return e;
    };

    let end: number;
    try {
      const saved = Number(localStorage.getItem(OFFER_KEY));
      end =
        !saved || Number.isNaN(saved) || saved < Date.now() ? fresh() : saved;
    } catch {
      end = Date.now() + OFFER_SECONDS * 1000;
    }

    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);

    /**
     * Renew on return, never under their nose.
     *
     * A countdown that visibly rewinds while someone is watching it is the most
     * obviously fake thing you can put on a page, and it discredits the price
     * next to it. Someone who leaves and comes back gets a running clock again;
     * someone sitting on the page watches it reach zero honestly.
     */
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (end <= Date.now()) {
        end = fresh();
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);

  if (remaining === null) return { label: "--:--", expired: false };
  const total = Math.floor(remaining / 1000);
  return {
    label: `${pad(Math.floor(total / 60))}:${pad(total % 60)}`,
    expired: remaining <= 0,
  };
}

/** Lets /questions mount the funnel at any screen. Unused in the live funnel. */
export interface QuizInitialState {
  phase?: Phase;
  index?: number;
  answers?: Answers;
  email?: string;
}

export function QuizFunnel({ initial }: { initial?: QuizInitialState } = {}) {
  // The offer IS the landing page. Nothing precedes it: no intro, no click.
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "checkout");
  const [index, setIndex] = useState(initial?.index ?? 0);
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [email, setEmail] = useState(initial?.email ?? "");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  // Recomputed from the answers so far: picking "selling my own home" drops the
  // listings-per-month question, and the counter shrinks with it.
  const steps = useMemo(() => visibleSteps(answers), [answers]);
  const total = steps.length;
  const step = steps[Math.min(index, total - 1)];

  /**
   * Straight arithmetic, no flattery. Starting a visitor at a padded 20% is a
   * lie they catch on the second screen, when it moves by less than the first
   * one did, and the whole bar stops meaning anything after that.
   */
  const pctComplete = Math.round(((index + 1) / total) * 100);

  // Each step is its own screen, so the next one has to start at the top. Off in
  // preview, where a dozen mounted funnels would fight over the page scroll.
  const isPreview = Boolean(initial);
  useEffect(() => {
    if (isPreview) return;
    topRef.current?.scrollIntoView({ block: "start" });
  }, [index, phase, isPreview]);

  // One effect covers every screen change, so instrumenting the whole funnel
  // costs a single call site instead of one per transition. Off in preview,
  // where a dozen mounted funnels would each report a visit.
  useEffect(() => {
    if (isPreview) return;
    if (phase === "steps") {
      track("step_view", { stepId: step?.id, stepIndex: index + 1 });
    } else if (phase === "intro") track("quiz_start");
    else if (phase === "email") track("gate_view");
    else if (phase === "analyzing") track("lead");
    else if (phase === "result") track("result_view");
    // One screen, so landing on it and seeing the offer are the same event.
    // It fires `quiz_start` because that is the key the report divides by, and
    // NOT `result_view` as well: two keys for one moment would report a 100%
    // offer rate every morning, which looks like a finding and is arithmetic.
    // The only rate left that means anything is checkout_click / quiz_start.
    else if (phase === "checkout") track("quiz_start");
  }, [phase, index, step?.id, isPreview]);

  const advance = () => {
    if (index + 1 < total) setIndex(index + 1);
    else {
      setPhase("analyzing");
      const sid = sessionId();
      if (!isPreview) trackCompleteRegistrationOnce(sid);
      fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers, sessionId: sid }),
      }).catch(() => {});
    }
  };

  const answer = (id: string) => {
    if (!isPreview) {
      track("step_answer", {
        stepId: step.id,
        stepIndex: index + 1,
        answer: id,
      });
    }
    setAnswers((a) => ({ ...a, [step.id]: id }));
    advance();
  };

  const submitEmail = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setError("Enter a valid email so we can send your plan.");
    }
    if (!consent) return setError("Please accept so we can send your plan.");
    setError("");
    setPhase("steps");

    // Early capture: persist the email now so a drop-off mid-quiz still lands
    // in quiz_leads and starts the nurture sequence. The second call after the
    // last question upserts with full answers and a real diagnosis.
    fetch("/api/quiz-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answers: {}, sessionId: sessionId() }),
    }).catch(() => {});
  };

  if (phase === "intro")
    return <Intro onStart={() => setPhase("checkout")} ref={topRef} />;

  if (phase === "checkout") return <Checkout ref={topRef} />;

  if (phase === "analyzing")
    return (
      <Analyzing
        answers={answers}
        // /questions mounts this phase as its own frame. Letting it advance
        // would leave the screen labelled "analysing" showing the result four
        // seconds after anyone scrolled to it.
        onDone={() => {
          if (!isPreview) setPhase("result");
        }}
        ref={topRef}
      />
    );

  if (phase === "result")
    return <Result answers={answers} email={email} ref={topRef} />;

  if (phase === "email")
    return (
      <Shell ref={topRef}>
        <h2 className="font-display text-center text-[27px] font-bold leading-tight text-ink">
          Where should we send your plan?
        </h2>
        <p className="mx-auto mt-2.5 max-w-[22rem] text-center text-[15px] leading-[1.5] text-ink-soft">
          After six quick questions we&apos;ll build your personalized listing
          marketing plan and email it to you - your score, the gaps, and
          exactly what to fix first.
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbrokerage.com"
          className="mt-6 h-14 w-full rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
        />

        <button
          type="button"
          onClick={submitEmail}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
        >
          Start my diagnostic
          <Arrow className="h-[18px] w-[18px]" />
        </button>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-[1.45] text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-[3px] h-4 w-4 shrink-0 accent-[#0f7d6b]"
          />
          <span>
            Email me my marketing plan and result. I&apos;ve read the{" "}
            <a href="/privacy" className="underline decoration-ink-soft/40">
              privacy policy
            </a>
            .
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <p className="mt-6 text-center text-[13px] text-ink-soft">
          No spam. Unsubscribe in one click, any time.
        </p>
      </Shell>
    );

  // --- Question / lesson steps -------------------------------------------
  return (
    <Shell ref={topRef} flushBottom={step.kind === "lesson"}>
      {/*
       * Progress is stated as work banked, never as work remaining.
       *
       * "7 steps left" is a chore counter. It is read at the exact moment the
       * visitor is deciding whether this is worth two minutes, and it answers
       * "no" for them: they have done one thing and seven remain. Percent
       * complete describes the identical position with the sign flipped, and it
       * only ever goes up. It also stops rewarding the skim, because there is
       * no countdown to watch tick toward an exit.
       *
       * Hiding it entirely tested worse in every funnel that has tried it: a
       * bar with no number reads as an unknown length, and people do not start
       * things of unknown length. The label is what turns the bar into a
       * promise the intro already made.
       */}
      <div className="flex items-center justify-between text-[13px] text-ink-soft">
        <span>{step.kind === "lesson" ? "Your diagnostic" : "Diagnostic"}</span>
        <span className="font-semibold tabular-nums text-ink">
          {pctComplete}% complete
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${pctComplete}%` }}
        />
      </div>

      {/* After Q1: a personalized insight based on what they just told us.
          This is the hook - they answered one question, and immediately got
          something back. Now they want to see what the rest reveals. */}
      {step.id === "who" && answers.pain && (
        <div className="mt-5 rounded-xl border border-accent/20 bg-accent-soft/25 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
            Quick insight
          </p>
          <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink">
            {answers.pain === "slow" &&
              "Listings with video get 403% more inquiries than those without. We'll show you exactly where yours falls short - and what to fix first."}
            {answers.pain === "photos" &&
              "73% of sellers say they'd fire their agent over bad marketing. The gap between photos and what buyers expect is bigger than most agents think."}
            {answers.pain === "cost" &&
              "The average videographer charges $300-$1,000 per listing. We'll show you how top agents are getting better results for a fraction of that."}
            {answers.pain === "time" &&
              "The agents winning the most listings spend less time on content, not more. We'll show you what they do differently in your plan."}
            {answers.pain === "unsure" &&
              "That feeling usually means there's one thing holding your marketing back. We'll find it - most agents are surprised by what it is."}
          </p>
        </div>
      )}

      {step.kind === "question" ? (
        <>
          <h2 className="font-display mt-7 text-[25px] font-bold leading-[1.15] text-ink sm:mt-9 sm:text-[31px] lg:text-[35px] [@media(min-width:1450px)_and_(min-height:860px)]:text-[42px]">
            {resolve(step.question, answers)}
          </h2>
          {/* Short laptops get the tighter spacing back — five options at the
              roomy desktop padding overflow a 720px-tall viewport by ~40px, and
              a question screen that scrolls for one row is worse than one with
              slightly less air. */}
          <div className="mt-5 flex flex-col gap-2.5 sm:mt-7 sm:gap-3 [@media(min-width:640px)_and_(max-height:780px)]:mt-5 [@media(min-width:640px)_and_(max-height:780px)]:gap-2.5">
            {resolve(step.choices, answers).map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => answer(c.id)}
                /* Options stay quiet: the accent is reserved for the one action
                   that moves money. A page where everything is teal has no
                   primary action at all. */
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-paper p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft/50 sm:gap-4 sm:p-5 [@media(min-width:640px)_and_(max-height:780px)]:p-4 [@media(min-width:1450px)_and_(min-height:860px)]:p-6"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-[12px] font-bold text-ink-soft sm:h-8 sm:w-8 sm:text-[13px] [@media(min-width:1450px)_and_(min-height:860px)]:h-9 [@media(min-width:1450px)_and_(min-height:860px)]:w-9 [@media(min-width:1450px)_and_(min-height:860px)]:text-[14px]">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[15px] font-medium leading-[1.35] text-ink sm:text-[16.5px] [@media(min-width:1450px)_and_(min-height:860px)]:text-[18.5px]">
                  {c.label}
                </span>
              </button>
            ))}
          </div>

          {step.proof && <ProofNote point={step.proof} />}
        </>
      ) : (
        <>
          {step.eyebrow && (
            <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              {step.eyebrow}
            </p>
          )}
          <h2
            className={`font-display text-center text-[25px] font-bold leading-[1.18] text-ink ${
              step.eyebrow ? "mt-2.5" : "mt-8"
            }`}
          >
            {step.title}
          </h2>
          <p className="mt-4 text-center text-[15px] leading-[1.6] text-ink-soft">
            {step.body(answers)}
          </p>
          <LessonArt kind={step.visual} />

          {/* The payout, and the reason this screen is not an ad.
              Left-aligned and rule-separated rather than boxed in accent: this
              is a note handed over, not a callout selling the note. */}
          {step.takeaway && (
            <div className="mt-5 border-l-2 border-accent pl-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-accent">
                Take this with you
              </p>
              <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink">
                {step.takeaway}
              </p>
            </div>
          )}

          {/*
           * Sticky, because this button kept falling off the bottom.
           *
           * A lesson screen is a title, a paragraph, a diagram and a takeaway,
           * and on a phone that is taller than the viewport — so the only
           * control on the screen was below the fold, on the one screen type
           * that has no other way forward. A visitor who does not scroll does
           * not see a way to continue, and there is nothing on screen telling
           * them one exists.
           *
           * The fade is what stops the last line of the takeaway from being
           * cut in half by a hard edge; content passes under it and stays
           * readable on the way.
           */}
          <div className="sticky bottom-0 z-20 -mx-5 mt-7 bg-gradient-to-t from-cream from-60% to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 sm:-mx-8 sm:px-8">
            <button
              type="button"
              onClick={advance}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
            >
              Continue
              <Arrow className="h-[18px] w-[18px]" />
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}

/* ---------------------------------------------------------------------- */

/**
 * The container every screen sits in.
 *
 * There is no card. An earlier version boxed the funnel into a phone-width panel
 * on desktop, which just looked like a mobile emulator parked on a big screen —
 * the page is the page, and the background runs edge to edge behind it.
 *
 * `wide` is for the intro alone. A question screen is a list of options and
 * reads badly stretched across 1100px, but the intro has media to place, so it
 * earns the extra width and the two-column layout that comes with it.
 */
const Shell = function Shell({
  children,
  wide = false,
  /** Drop the bottom padding for a screen that ends in its own sticky bar,
   *  which supplies the spacing itself and would otherwise float above a gap. */
  flushBottom = false,
  ref,
}: {
  children: React.ReactNode;
  wide?: boolean;
  flushBottom?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      /* `my-auto` centres a short screen in the viewport and collapses to zero
         when the content outgrows it, so a long result page still scrolls from
         the top instead of being clipped.
         The big-screen step up is gated on width AND height together: widening
         the container also widens the media column, and a 16:9 player gets
         taller as it gets wider. Keyed on width alone it would overflow a
         1280x720 laptop, which is exactly the screen that can least afford it. */
      className={`mx-auto w-full max-w-[440px] my-auto px-5 pt-5 sm:px-8 sm:pt-8 lg:pt-8 [@media(max-height:780px)]:pt-3 ${
        // env() resolves to 0 anywhere without a notch, so this is the same
        // padding as before on every desktop and a home-indicator's worth more
        // on the phones that were being clipped by it.
        flushBottom
          ? ""
          : "pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-14"
      } ${
        wide
          ? "sm:max-w-[620px] lg:max-w-[1120px] [@media(min-width:1450px)_and_(min-height:860px)]:max-w-[1380px]"
          : "sm:max-w-[620px] [@media(min-width:1450px)_and_(min-height:860px)]:max-w-[760px]"
      }`}
    >
      <div ref={ref} />
      <div className="mb-5 flex items-center justify-center gap-[11px] [@media(max-height:780px)]:mb-2 sm:mb-7 [@media(min-width:1450px)_and_(min-height:860px)]:mb-9 [@media(min-width:1450px)_and_(min-height:860px)]:gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tourly-mark.png"
          alt=""
          className="h-[22px] w-auto [@media(min-width:1450px)_and_(min-height:860px)]:h-[28px]"
        />
        <span className="font-display text-[21px] font-bold tracking-[-0.02em] text-ink [@media(min-width:1450px)_and_(min-height:860px)]:text-[27px]">
          Tourly
        </span>
      </div>
      {children}
    </div>
  );
};

/**
 * The intro.
 *
 * This screen carries the repositioning on its own, so what is NOT here matters
 * more than what is.
 *
 * The showcase player is gone. Four tour clips above the fold answered a
 * question nobody had asked yet and gave away the ending: anyone who watched
 * them knew within two seconds that this was a company selling listing videos,
 * which meant the six questions that followed were a sales form and got treated
 * like one. The clips were also the single most expensive thing on the page for
 * mobile ad traffic, and they were competing with the only control that
 * matters.
 *
 * What replaces it is nothing. Headline, promise, one button. The visitor's
 * whole model of this page should be "somebody is about to tell me how to
 * market a listing", and every element removed from this screen makes that
 * model easier to hold. The product gets introduced on the result screen, after
 * they have been paid back twice for their attention.
 *
 * Proof sits BELOW the button now rather than above it. Above, it is a claim
 * they have no reason to care about yet, and it pushes the button down. Below,
 * it is reassurance collected on the way past, in the position where somebody
 * who has already decided glances for a reason not to.
 */
function SellerChat() {
  return (
    <div className="mx-auto mt-4 max-w-[310px] rounded-xl border border-line/60 bg-paper px-3 py-2.5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] [@media(max-height:780px)]:mt-2 [@media(max-height:780px)]:py-1.5 [@media(min-width:1450px)_and_(min-height:860px)]:mt-6 [@media(min-width:1450px)_and_(min-height:860px)]:max-w-[380px] [@media(min-width:1450px)_and_(min-height:860px)]:px-5 [@media(min-width:1450px)_and_(min-height:860px)]:py-4">
      <div className="flex items-center gap-2 pb-2 [@media(max-height:780px)]:pb-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8e8ed] text-[10px] font-bold text-[#636366]">
          KM
        </span>
        <div className="text-left">
          <span className="block text-[11.5px] font-semibold leading-tight text-ink">Karen M.</span>
          <span className="block text-[10px] leading-tight text-ink-soft">Seller</span>
        </div>
        <span className="ml-auto text-[10px] text-ink-soft/70">iMessage</span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line/40 pt-2 [@media(max-height:780px)]:gap-1 [@media(max-height:780px)]:pt-1.5">
        <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-[#e8e8ed] px-3 py-1.5 text-left text-[12.5px] leading-[1.35] [@media(max-height:780px)]:py-1 [@media(max-height:780px)]:text-[12px] text-[#1c1c1e]">
          4 showings this week?? We never got this on our last place
        </div>
        <div className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-[#007aff] px-3 py-1.5 text-left text-[12.5px] leading-[1.35] [@media(max-height:780px)]:py-1 [@media(max-height:780px)]:text-[12px] text-white">
          The marketing made the difference this time!
        </div>
        <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-[#e8e8ed] px-3 py-1.5 text-left text-[12.5px] leading-[1.35] [@media(max-height:780px)]:py-1 [@media(max-height:780px)]:text-[12px] text-[#1c1c1e]">
          First time selling where I didn&apos;t stress about it sitting there. Whatever you changed, keep doing it
        </div>
      </div>
    </div>
  );
}

function Intro({
  onStart,
  ref,
}: {
  onStart: () => void;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <Shell ref={ref} flushBottom>
      <div className="text-center pb-[calc(1.25rem+env(safe-area-inset-bottom))] [@media(max-height:780px)]:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <span className="inline-block rounded-full bg-accent-soft px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent [@media(min-width:1450px)_and_(min-height:860px)]:px-5 [@media(min-width:1450px)_and_(min-height:860px)]:py-2.5 [@media(min-width:1450px)_and_(min-height:860px)]:text-[12.5px]">
          Launch pricing
        </span>

        <h1 className="font-display mt-3 text-[28px] [@media(max-height:780px)]:mt-2 [@media(max-height:780px)]:text-[23px] font-bold leading-[1.08] tracking-[-0.02em] text-ink text-balance sm:text-[34px] lg:text-[40px] [@media(min-width:640px)_and_(max-height:860px)]:text-[30px] [@media(min-width:1450px)_and_(min-height:860px)]:mt-5 [@media(min-width:1450px)_and_(min-height:860px)]:text-[56px]">
          Turn your listing photos into a video tour
        </h1>

        <SellerChat />

        <button
          type="button"
          onClick={onStart}
          className="mt-5 [@media(max-height:780px)]:mt-3 h-[52px] [@media(max-height:780px)]:h-[46px] flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[15px] font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99] lg:h-14 lg:text-base [@media(min-width:1450px)_and_(min-height:860px)]:mt-7 [@media(min-width:1450px)_and_(min-height:860px)]:h-[64px] [@media(min-width:1450px)_and_(min-height:860px)]:text-[18px]"
        >
          Get my listing tour
          <Arrow className="h-[17px] w-[17px]" />
        </button>

        <p className="mt-2.5 [@media(max-height:780px)]:mt-1.5 text-[12.5px] leading-[1.4] text-ink-soft text-balance sm:text-[13px]">
          One upload, back the same day. Vertical for Reels, horizontal for the MLS.
        </p>

        <div className="mt-5 [@media(max-height:780px)]:mt-2.5 [@media(min-width:640px)_and_(max-height:860px)]:mt-3">
          <IntroTestimonials />
        </div>

        <p className="mt-3 [@media(max-height:780px)]:mt-1.5 text-center text-[11.5px] leading-[1.3] text-ink-soft">
          Trusted by agents in the US, Canada and Australia
        </p>
      </div>
    </Shell>
  );
}

/**
 * The offer screen: the result screen exactly, minus the diagnosis.
 *
 * Same blocks in the same order as `Result` - comparison, offer card, rail,
 * testimonials, versus, picker, deep dive, offer again, final picker - because
 * that sequence is the one that has been selling, and rebuilding a lighter
 * version of it threw away three closes to save a scroll.
 *
 * Two things are gone, both of which asserted something about a visitor who has
 * now told us nothing: the score ring with its archetype, and the `TierLadder`
 * that placed them on a rung ("Steady marketer"). A ladder that marks a stranger
 * as a photo-only lister is not a diagnosis, it is a guess printed as a verdict.
 *
 * Everything else reads `d.pack`, and `diagnose({})` resolves every field
 * through its own fallbacks - landing on the 25-photo pack, since it assumes 22
 * photos, which is the pack marked "most popular" anyway. So the card, the two
 * pickers and the price countdown are all correct without anybody answering
 * anything, and none of them claim otherwise.
 */
function Checkout({ ref }: { ref?: React.Ref<HTMLDivElement> }) {
  const d = useMemo(() => diagnose({}), []);
  const { label, expired } = useOfferCountdown(true);

  /**
   * One selection for the whole page.
   *
   * Four independent selectors is four different prices on one screen, and a
   * visitor who picks 40 photos at the top and scrolls to a button quoting $84
   * has caught the page contradicting itself at the moment they were deciding.
   */
  const [selected, setSelected] = useState<PackId>(d.pack.id);
  const pack = packById(selected);

  // No prefilled_email: nothing was collected on this path, so Stripe asks.
  const checkoutUrl = useMemo(() => packCheckoutUrl(pack), [pack]);

  const offer = (
    <Offer
      d={d}
      pack={pack}
      onSelectPack={setSelected}
      checkoutUrl={checkoutUrl}
      label={label}
      expired={expired}
    />
  );

  return (
    <Shell ref={ref}>
      {/* What the product IS, before anything argues for it.
          Somebody who has just landed does not yet know whether this is a
          service they brief, a tool they learn, or a crew they book. Until
          that is answered every claim underneath is being read by someone
          still working out what they would be buying. Three facts, in the
          order the question arrives: it uses the photos they already have, no
          one touches it, and it comes back the same session. */}
      <div className="text-center">
        <h2 className="font-display text-[27px] font-bold leading-[1.1] tracking-[-0.025em] text-ink text-balance sm:text-[35px]">
          Turn the listing photos you already have into a finished video tour in
          minutes, fully automated.
        </h2>
      </div>

      {offer}

      {/* The comparison runs first, directly under the price.
          It is the only block that asks a question instead of making a claim,
          and someone who has just answered "which of these gets the call" for
          themselves is a better person to show the rest to than one who has
          just been shown a staging rail. */}
      <VersusDemo />

      {/* `showStats={false}`: the two figures now close the page instead, and
          this is the one place they would otherwise appear twice. */}
      <WhyVideo showStats={false} />

      <Testimonials />

      <WorkLessEarnMore />

      <div className="-mx-5 mt-8 sm:-mx-9">
        <p className="mb-2.5 px-5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft sm:px-9">
          Photo in, tour out
        </p>
        <BeforeAfterRail height={200} cardWidth={260} />
      </div>

      <PackPicker
        recommended={d.pack.id}
        value={selected}
        onChange={setSelected}
      />

      {/* The offer card appears ONCE, at the top. It used to close a second
          time here, which put two identical red price-hold cards on one page
          running the same clock - the repeat read as a template that had been
          pasted twice rather than as a second chance to buy. The two pickers
          below still carry the same price and the same button. */}

      <AmbassadorNote />
      <ChatProof />

      <PackPicker
        recommended={d.pack.id}
        value={selected}
        onChange={setSelected}
        heading="Ready when you are"
        sub="Pick a size, hand over the photos, and the tour is back the same day."
        hold
      />

      {/* The very last thing on the page, below the final button.
          It is not a close and it is not asking for anything - it is the market
          fact the whole page has been describing, left with anyone who scrolled
          past the last picker without buying. */}
      <VideoGapStats className="mt-12" />
    </Shell>
  );
}

/** Per-line dwell, and the beat held after the last one lands. */
const LINE_MS = 850;
const HOLD_MS = 550;

/**
 * What the analysing screen reads out, built from what they actually tapped.
 *
 * Every line is a real input to `diagnose()` and every value is the visitor's
 * own answer, resolved from ALL_STEPS via `choiceLabel` so a quote here cannot
 * drift from the wording on the screen they tapped it on. Nothing is invented
 * and nothing claims a computation that does not happen — there is no
 * "scanning 4,000 listings in your area", because we do not, and an agent can
 * tell.
 *
 * No price and no market figure. Both belong to the result screen: the entire
 * positioning of this funnel rests on the number arriving after the diagnosis
 * rather than alongside it.
 *
 * A missing answer drops its line rather than rendering an empty one — the
 * homeowner branch skips the volume question, and a blank row on the one screen
 * that is supposed to prove we read them is worse than a shorter list.
 */
function analysisLines(a: Answers): { task: string; found: string }[] {
  const { single, perYear } = diagnose(a);
  return [
    { task: "Reading your answers", found: choiceLabel(a, "who") },
    {
      task: "Checking how your listings go out today",
      found: choiceLabel(a, "today"),
    },
    {
      task: "Weighing what you said is going wrong",
      found: choiceLabel(a, "pain"),
    },
    {
      task: "Sizing the plan to your volume",
      found: single ? "One property" : `${perYear} listings a year`,
    },
  ].filter((l) => l.found);
}

/**
 * The pause between handing over an address and getting the result.
 *
 * It was a bare spinner over "Scoring your answers…" for 2.2 seconds, which is
 * the shape of a page waiting on a server rather than a person being read. The
 * result that follows is built entirely from their answers and nothing before
 * it said so, so the personalisation arrived unannounced and read as a
 * template. This screen shows the reading happening, in their own words.
 *
 * The delay is a pacing device, not a progress bar over real work: `diagnose()`
 * is instant. That is why every line names something we genuinely use rather
 * than a fake workload — the time is spent showing them what we already know,
 * which is the one version of this pattern that is not a lie.
 */
function Analyzing({
  answers,
  onDone,
  ref,
}: {
  answers: Answers;
  onDone: () => void;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const lines = useMemo(() => analysisLines(answers), [answers]);
  const [done, setDone] = useState(0);

  // Held in a ref because the parent passes an inline arrow. As a dependency it
  // would be a new identity on every tick, and the effect would clear and
  // restart its own timers forever without ever reaching the result.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Someone who asked the OS for less motion is not asking to be held on a
    // screen watching rows tick over, so their dwell collapses to zero. Still
    // driven by the same timers rather than a straight setState, which keeps
    // the whole sequence on one code path.
    const step = reduced ? 0 : LINE_MS;
    const hold = reduced ? 400 : HOLD_MS;

    const timers = lines.map((_, i) =>
      setTimeout(() => setDone(i + 1), (i + 1) * step),
    );
    timers.push(
      setTimeout(() => doneRef.current(), lines.length * step + hold),
    );
    return () => timers.forEach(clearTimeout);
  }, [lines]);

  const pct = Math.round((done / Math.max(1, lines.length)) * 100);
  const finished = done >= lines.length;

  return (
    <Shell ref={ref}>
      <div className="py-14">
        <p className="text-center text-[12.5px] font-bold uppercase tracking-[0.08em] text-accent">
          Building your plan
        </p>
        <h2 className="mt-2 text-center font-display text-[25px] font-bold leading-[1.15] text-ink">
          {finished ? "Your plan is ready." : "Reading what you told us…"}
        </h2>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="mt-7 space-y-4">
          {lines.map((l, i) => {
            const complete = i < done;
            const active = i === done;
            return (
              <li
                key={l.task}
                className={`flex items-start gap-3 transition-opacity duration-500 ${
                  complete || active ? "opacity-100" : "opacity-40"
                }`}
              >
                <span
                  className={`mt-[3px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                    complete
                      ? "border-accent bg-accent text-white"
                      : "border-line"
                  }`}
                >
                  {complete ? (
                    <Check className="h-[12px] w-[12px]" />
                  ) : active ? (
                    <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-[1.35] text-ink-soft">
                    {l.task}
                  </span>
                  {/* Reserves its own height from the start, so a line landing
                      never nudges the rows below it. */}
                  <span
                    className={`block text-[15.5px] font-bold leading-[1.4] text-ink transition-all duration-500 ${
                      complete
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {l.found}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
}

/**
 * The four rungs with theirs marked.
 *
 * A label on its own is just a name — "Occasional poster" only stings once you
 * can see the two rungs above it. This is what turns the score into a gap.
 */
function TierLadder({ d }: { d: Diagnosis }) {
  return (
    <div className="mt-5">
      <div className="flex gap-1.5">
        {d.tiers.map((t, i) => (
          <div
            key={t}
            className={`h-1.5 flex-1 rounded-full ${
              i <= d.tier ? "bg-accent" : "bg-line"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {d.tiers.map((t, i) => (
          <span
            key={t}
            className={`flex-1 text-center text-[10px] leading-[1.25] ${
              i === d.tier ? "font-bold text-accent" : "text-ink-soft/70"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      {/* No caption under the ladder. The rungs already say it, and every line
          here pushes the offer further down the page. */}
    </div>
  );
}

/**
 * The discount arriving, instead of having already arrived.
 *
 * A price that is simply printed next to a struck-through one asks the reader
 * to take the saving on faith, and a struck number is the single most-faked
 * element in online retail. Counting down from the "was" to the charged price
 * shows the reduction happening to *their* recommended pack, which is the one
 * version of this they can watch rather than believe.
 *
 * What it must not do is claim the drop is momentary. The launch price is not
 * going anywhere — the countdown above already refuses to lie about that when
 * it hits zero — so this animates the discount, never a deadline.
 */
function useCountDown(
  from: number,
  to: number,
): { value: number | null; settled: boolean } {
  /**
   * `null` means "not animating — show the price we actually charge", and it is
   * deliberately the initial state.
   *
   * The server render, the first paint, a visitor whose JS never arrives and
   * anyone who has asked for reduced motion all land here, so all of them see
   * the real price. Starting this at `from` instead would server-render "$160
   * USD" beside a button reading "Lock in $112 USD" — the animation would have
   * been quoting a higher price than we charge to every visitor whose
   * JavaScript was slow, which is the one failure this must not have.
   */
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Nothing to do: the settled price is already the one on screen.
    if (reduced) return;

    const DELAY = 420; // a beat to land before the number starts moving
    const DURATION = 900;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start - DELAY;
      if (elapsed < 0) {
        setValue(from); // hold the old price while the beat runs
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      // Back to null at the end, so the settled figure is `priceLabel` itself
      // rather than a reconstruction that could drift from it.
      setValue(p < 1 ? Math.round(from + (to - from) * eased) : null);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);

  return { value, settled: value === null };
}


/**
 * The offer again, at the bottom, with all three packs open.
 *
 * The card at the top recommends one pack and links straight to it, which is
 * right for the visitor who accepts the recommendation. It leaves nothing at
 * all for the one who wants the cheaper option, or who knows their gallery runs
 * to forty photos — and by the time they have read the rail and the
 * testimonials, the only buy button is several screens back up.
 *
 * One CTA, not three. Three buttons side by side is three decisions; a
 * selection plus a single action is one, and the price on the button always
 * names what is about to be charged.
 */
function PackPicker({
  recommended,
  /** Prefills the Stripe email field. Empty on the direct path, where we never
   *  asked for one - Stripe then collects it itself at checkout. */
  email = "",
  heading = "Or pick the size that fits",
  sub,
  /** Label under the recommended pack. The diagnostic earned "Matches your
   *  answers"; the direct path has no answers to match, so it says nothing
   *  and each pack keeps its own blurb. */
  recommendedNote,
  /** Show the price-hold card under the button. The last close only. */
  hold = false,
  value,
  onChange,
}: {
  recommended: PackId;
  email?: string;
  heading?: string;
  sub?: string;
  recommendedNote?: string;
  hold?: boolean;
  /** Controlled selection. Supplied on the direct path so the two pickers and
   *  both offer cards are one choice rather than four that disagree. */
  value?: PackId;
  onChange?: (id: PackId) => void;
}) {
  const [own, setOwn] = useState<PackId>(recommended);
  const selected = value ?? own;
  const setSelected = onChange ?? setOwn;
  const pack = packById(selected);

  const href = useMemo(() => {
    const base = packCheckoutUrl(pack);
    if (!email) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}prefilled_email=${encodeURIComponent(email)}`;
  }, [pack, email]);

  return (
    <div className="mt-10">
      <h3 className="font-display text-center text-[21px] font-bold leading-[1.2] text-ink">
        {heading}
      </h3>
      {sub && (
        <p className="mx-auto mt-2 max-w-[19rem] text-center text-[13.5px] leading-[1.45] text-ink-soft">
          {sub}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {PACKS.map((p) => {
          const on = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              aria-pressed={on}
              className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 ${
                on
                  ? "border-accent bg-accent-soft/40 shadow-[0_10px_26px_-18px_rgba(15,125,107,0.7)]"
                  : "border-line bg-paper hover:border-accent/40"
              }`}
            >
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                  on ? "border-accent bg-accent text-white" : "border-line"
                }`}
              >
                {on && <Check className="h-[12px] w-[12px]" />}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-[1.3] text-ink">
                  {p.name}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.3] text-ink-soft">
                  {p.id === recommended && recommendedNote
                    ? recommendedNote
                    : p.blurbShort}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-display text-[19px] font-bold leading-none text-ink">
                  {p.priceLabel}
                </span>
                <span className="mt-1 block text-[12px] font-semibold leading-none text-ink-soft line-through decoration-ink-soft/40 decoration-[1px]">
                  {p.wasLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <a
        href={href}
        onClick={() => track("checkout_click")}
        className="mt-4 flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[17px] font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
      >
        Get it for {pack.priceLabel}
        <Arrow className="h-[18px] w-[18px]" />
      </a>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-ink-soft">
        <Shield className="h-4 w-4 shrink-0 text-accent" />
        One-time · 30-day money-back guarantee
      </p>
      {hold && <PriceHold />}
    </div>
  );
}

/**
 * The last thing on the page: how long this price is held.
 *
 * Red outline because it is the only element below the fold that is not
 * reassurance, and it has to read differently from the guarantee line directly
 * above it.
 *
 * It shows the SAME clock as the offer card at the top - one hold per visit,
 * not a second deadline invented for the bottom of the page. And it keeps the
 * rule the top card already keeps: at zero it says the pricing still applies,
 * because it does. A countdown that claims a discount died, on a page that will
 * sell at the same price a minute later, is the one lie an agent can disprove
 * by reloading.
 */
function PriceHold() {
  const { label, expired } = useOfferCountdown(true);
  return (
    <div className="mt-3 rounded-2xl border-2 border-[#e5484d] bg-[#fdeceb]/50 px-4 py-3 text-center">
      {expired ? (
        <p className="text-[13px] font-bold leading-[1.35] text-[#b42318]">
          Launch pricing still applies today
        </p>
      ) : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#b42318]">
            Launch price held for
          </p>
          <p className="font-display mt-1 text-[27px] font-bold leading-none tabular-nums text-[#b42318]">
            {label}
          </p>
        </>
      )}
    </div>
  );
}

function Result({
  answers,
  email,
  ref,
}: {
  answers: Answers;
  email: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const d = useMemo(() => diagnose(answers), [answers]);
  const { label, expired } = useOfferCountdown(true);

  const checkoutUrl = useMemo(() => {
    const base = packCheckoutUrl(d.pack);
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}prefilled_email=${encodeURIComponent(email)}`;
  }, [d.pack, email]);

  return (
    <Shell ref={ref}>
      {/* Score + archetype */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full border-[5px] border-accent/25">
          <span className="font-display text-[23px] font-bold text-ink">
            {d.score}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
            Your listing marketing
          </p>
          <p className="font-display mt-1 text-[24px] font-bold leading-tight text-ink">
            {d.archetype}
          </p>
        </div>
      </div>

      <TierLadder d={d} />

      {/* Two rows, no prose. The comparison is the argument — a sentence
          explaining it only delays the offer. */}
      {/*
       * One number against one number, per property.
       *
       * This card previously showed a videographer range against an annual
       * Tourly total, which asked the reader to compare a spread with a sum and
       * to accept a year-sized claim in the same breath as their first price.
       * Two flat figures for the same job is the comparison they are actually
       * making, and it is the only framing where the second number matches the
       * button underneath it exactly.
       */}
      <div className="mt-4 rounded-2xl border border-line bg-accent-soft p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-ink-soft">Videographer</span>
          <span className="font-display text-[17px] font-bold text-ink">
            {usd(VIDEOGRAPHER_TYPICAL)}
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-accent/20 pt-2.5">
          <span className="text-[14px] font-semibold text-ink">
            With Tourly
          </span>
          <span className="font-display text-[22px] font-bold text-accent">
            {d.pack.priceLabel}
          </span>
        </div>
      </div>

      {/* Proof, then the offer, then the reading.
       *
       * The number above is the peak of the whole funnel — that is where intent
       * is highest, so the buy button belongs here rather than three sections of
       * prose later. The same before/after rail the home page uses sits directly
       * above it: it answers "will this actually look good?" at the exact moment
       * the price is asked for. The diagnosis and plan still follow underneath
       * for anyone who wants to read before deciding. */}
      <Offer d={d} checkoutUrl={checkoutUrl} label={label} expired={expired} />

      <div className="-mx-5 mt-8 sm:-mx-9">
        <p className="mb-2.5 px-5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft sm:px-9">
          Photo in, tour out
        </p>
        <BeforeAfterRail height={200} cardWidth={260} />
      </div>

      <Testimonials />

      {/* The comparison sits between the proof and the price. It is the only
          block on the page that asks a question instead of making a claim, and
          a reader who has just answered it for themselves is a better person to
          show a price to than one who has just been told something. */}
      <VersusDemo />

      <PackPicker
        recommended={d.pack.id}
        email={email}
        recommendedNote="Matches your answers"
      />

      {/*
       * Below the second close: no more pitch, only the case.
       *
       * Somebody who has scrolled past two buy buttons is not holding a
       * question about price, they are holding "why a video at all". This
       * answers that, and then closes a third time - because a page that
       * educates and then makes you scroll back up to act has spent the
       * attention it just earned.
       */}
      <ResultDeepDive
        offerSlot={
          <div className="mt-12">
            <Offer
              d={d}
              checkoutUrl={checkoutUrl}
              label={label}
              expired={expired}
            />
          </div>
        }
      />

      <PackPicker
        recommended={d.pack.id}
        email={email}
        recommendedNote="Matches your answers"
        heading="Ready when you are"
        sub="Pick a size, hand over the photos, and the tour is back the same day."
        hold
      />

      {/* The written diagnosis and 30-day plan used to sit here. They are still
          generated and still go out in the emailed copy — they were just reading
          material stacked under a buy button, and every screen of it was a
          chance to leave before deciding.
          No free-trial escape hatch either: checkout is the only exit from this
          funnel, and the guarantee in the offer carries the risk reversal. */}
    </Shell>
  );
}

/**
 * Live-activity line above the buy button.
 *
 * The count is generated in the browser, not measured — it drifts by one every
 * nine seconds inside 3–8 so it reads as a live figure rather than a static
 * claim. It is invented, same as any "N people are viewing this" widget; swap it
 * for a real count off the orders table if you ever want it to be true.
 *
 * Seeded in an effect rather than at render because the server has no business
 * picking a random number the client would then disagree with — that is a
 * hydration mismatch.
 */
function LiveCount() {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    // Both the seed and the drift run from timer callbacks. Setting state
    // straight from the effect body would fire a second render immediately.
    const tick = () =>
      setN((prev) =>
        prev === null
          ? 3 + Math.floor(Math.random() * 6)
          : Math.min(8, Math.max(3, prev + (Math.random() < 0.5 ? -1 : 1))),
      );
    const seed = setTimeout(tick, 0);
    const id = setInterval(tick, 9000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);

  if (n === null) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
      </span>
      <span className="text-[13.5px] font-semibold text-[#15803d]">
        {n} people are making their tour right now
      </span>
    </div>
  );
}

/**
 * The offer card. Rendered high on the result — right after the cost figure —
 * because that is where intent peaks, not after the reading.
 */
function Offer({
  d,
  checkoutUrl,
  label,
  expired,
  /** The pack the card is quoting. Defaults to the diagnosed one. */
  pack = d.pack,
  /**
   * Supplied only on the direct path, where nothing was diagnosed and the
   * visitor picks the size themselves. Its presence is what renders the size
   * row inside the card: on the quiz path the count came from their own answer,
   * and re-asking there would reopen a question they already closed.
   */
  onSelectPack,
}: {
  d: Diagnosis;
  checkoutUrl: string;
  label: string;
  expired: boolean;
  pack?: Pack;
  onSelectPack?: (id: PackId) => void;
}) {
  const { value: shownPrice, settled } = useCountDown(pack.was, pack.price);

  return (
    <>
      {/* The whole card is ringed in red while the hold is live, so the urgency
          reads as one deliberate block rather than a stray coloured strip. Once
          it expires the ring drops away and the card goes quiet — leaving it
          shouting at someone the offer no longer applies to is just noise. */}
      <div
        className={`mt-5 rounded-[24px] bg-paper p-[18px] transition-all ${
          expired
            ? "border border-line shadow-[0_26px_64px_-36px_rgba(0,0,0,0.3)]"
            : "border-2 border-[#e5484d] shadow-[0_0_0_5px_rgba(229,72,77,0.13),0_26px_64px_-36px_rgba(0,0,0,0.35)]"
        }`}
      >
        {/* Urgency is the one place a second hue earns its keep: it's the only
            warm element on a cool page, so it isolates without competing with
            the teal buy button. */}
        {/* At zero the offer stays open. Telling someone who is still on the
            page that they've missed it invents a reason to leave, and the price
            hasn't actually changed. */}
        <div
          className={`-mx-[18px] -mt-[18px] flex items-center justify-center gap-2.5 rounded-t-[22px] px-4 py-3.5 ${
            expired ? "bg-accent-soft text-accent" : "bg-[#d92d20] text-white"
          }`}
        >
          <Bolt className="h-[19px] w-[19px] shrink-0" />
          <span className="text-[14px] font-bold uppercase tracking-[0.04em]">
            {expired ? "Launch pricing still applies today" : "Price held for"}
          </span>
          {!expired && (
            <span className="font-display text-[27px] font-bold leading-none tabular-nums">
              {label}
            </span>
          )}
        </div>

        {/* The pack as a hero, not a thumbnail.
            `mix-blend-multiply` is what makes it look cut out without an alpha
            channel: the render's background is clipped to pure white, and white
            multiplied against the card's white background disappears, while the
            box and its contact shadow survive. Sharper than a matted PNG and it
            cannot leave a halo — but it only works because the card underneath
            is pure white. On any other surface this needs a real alpha PNG. */}
        {/* Pack on the left, price on the right — the product and what it costs
            read as one line item rather than a stacked poster, which is what a
            checkout is supposed to look like. */}
        <div className="mt-3 flex items-center gap-3 sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pack-box.jpg"
            alt="The Listing Tour pack"
            className="w-[36%] max-w-[200px] shrink-0 mix-blend-multiply"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-2.5 gap-y-1">
              {/* `tabular-nums` so the digits don't jitter the layout while the
                  number is counting. The settled state prints `priceLabel`
                  verbatim rather than a reconstruction, because that string is
                  the one place the currency is spelled out and Stripe's
                  Adaptive Pricing makes a bare "$" a real problem. */}
              <span className="font-display whitespace-nowrap text-[31px] font-bold leading-none text-ink tabular-nums min-[390px]:text-[36px] min-[430px]:text-[40px] sm:text-[46px]">
                {settled ? pack.priceLabel : `$${shownPrice} USD`}
              </span>
              {/* The old price was struck at full weight in the same colour as
                  the digits, which buried the number the discount is measured
                  against — a saving you cannot read is not a saving. Thin rule,
                  lighter than the text, and the figure itself carries more
                  weight than it did so it survives being crossed out. */}
              <span
                className={`pb-1 text-[17px] font-semibold text-ink-soft line-through decoration-ink-soft/40 decoration-[1.5px] transition-opacity duration-500 ${
                  settled ? "opacity-100" : "opacity-0"
                }`}
              >
                {pack.wasLabel}
              </span>
            </div>
            <span
              className={`mt-2 inline-block rounded-full bg-[#fdeceb] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#b42318] transition-all duration-300 ${
                settled ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
            >
              Save {discountPct(pack)}%
            </span>
            {/* The pack size is gone. "Up to 40 photos" reads as a limit being
                imposed at the exact moment the price is being accepted, and the
                photo count was already settled by their own answer two screens
                ago. "One-time" stays: the subscription objection is the live
                one on a $112 impulse purchase. */}
            <p className="mt-2 text-[13.5px] leading-[1.4] text-ink-soft">
              One-time. No subscription.
            </p>
          </div>
        </div>

        {/* All three sizes, inside the held-price card on purpose.
            The banner says the price is held; if only one figure sits under it,
            the other two look like they are not covered. Here every price the
            visitor can pick is inside the same red ring, so the hold plainly
            applies to all of them - which is true, they are all launch prices
            and none of them move when the clock runs out. */}
        {onSelectPack && (
          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              How many photos do you have?
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PACKS.map((p) => {
                const on = p.id === pack.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPack(p.id)}
                    aria-pressed={on}
                    className={`rounded-xl border-2 px-1.5 py-1.5 text-center transition-colors ${
                      on
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-paper hover:border-accent/40"
                    }`}
                  >
                    <span className="block text-[12px] font-semibold leading-tight text-ink-soft">
                      Up to {p.photos}
                    </span>
                    <span className="font-display mt-0.5 block text-[16px] font-bold leading-none text-ink">
                      ${p.price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <LiveCount />

        {/* The tour clip that used to sit here is gone. The Photo in, tour out
            rail directly below the card shows the same output, and showing it
            twice inside 400px made the second one read as filler rather than
            proof. Removing it also pulls the button up by ~180px, which is the
            single cheapest conversion gain available on this screen. */}

        <a
          href={checkoutUrl}
          onClick={() => track("checkout_click")}
          className="mt-3 flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[17px] font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
        >
          Lock in {pack.priceLabel}
          <Arrow className="h-[18px] w-[18px]" />
        </a>

        {/* Same lockup as the intro: faces, stars, count. It was faces and count
            only, which made the two screens look like two different companies
            quoting two different proofs. The stars are also what turns a
            delivery number into a rating. */}
        <div className="mt-3 flex items-center justify-center gap-2.5">
          <ReviewAvatars size={24} />
          <div className="flex flex-col items-start leading-none">
            <Stars className="h-[13px] w-[13px]" />
            <span className="mt-1 text-[12.5px] font-semibold text-ink">
              1,564 tours delivered
            </span>
          </div>
        </div>

        <PaymentLogos />

        {/* The guarantee sits under the cards, not over them.
            Above, it separated the button from the payment marks and read as a
            disclaimer attached to the price. Below, it is the last line in the
            card and closes the risk question after the payment methods have
            already answered the safety one. */}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-ink-soft">
          <Shield className="h-4 w-4 shrink-0 text-accent" />
          30-day money-back guarantee · secure checkout
        </p>
      </div>
    </>
  );
}
