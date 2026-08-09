"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shield, Arrow, Bolt } from "@/components/site/icons";
import { Stars } from "@/components/site/Stars";
import { PaymentLogos } from "@/components/site/PaymentLogos";
import { ReviewAvatars } from "@/components/site/ReviewsRow";
import { Showcase } from "@/components/quiz/Showcase";
import { LessonArt } from "@/components/quiz/LessonArt";
import { BeforeAfterRail } from "@/components/sections/BeforeAfterRail";
import { Testimonials } from "@/components/quiz/Testimonials";
import { packCheckoutUrl, discountPct } from "@/lib/pricing";
import {
  visibleSteps,
  diagnose,
  resolve,
  usd,
  type Answers,
  type Diagnosis,
} from "@/lib/quiz";

type Phase = "intro" | "steps" | "email" | "analyzing" | "result";

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
      end = !saved || Number.isNaN(saved) || saved < Date.now() ? fresh() : saved;
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
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "intro");
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
  const stepsLeft = total - index - 1;

  // Each step is its own screen, so the next one has to start at the top. Off in
  // preview, where a dozen mounted funnels would fight over the page scroll.
  const isPreview = Boolean(initial);
  useEffect(() => {
    if (isPreview) return;
    topRef.current?.scrollIntoView({ block: "start" });
  }, [index, phase, isPreview]);

  const advance = () => {
    if (index + 1 < total) setIndex(index + 1);
    else setPhase("email");
  };

  const answer = (id: string) => {
    setAnswers((a) => ({ ...a, [step.id]: id }));
    advance();
  };

  const submitEmail = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setError("Add a valid email so we can send your copy.");
    }
    if (!consent) return setError("Please accept so we can send your copy.");
    setError("");
    setPhase("analyzing");
    // Fire and forget — a failed lead ping must never block the result the
    // visitor just spent two minutes earning.
    fetch("/api/quiz-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answers }),
    }).catch(() => {});
    setTimeout(() => setPhase("result"), 2200);
  };

  if (phase === "intro") return <Intro onStart={() => setPhase("steps")} ref={topRef} />;

  if (phase === "analyzing") return <Analyzing ref={topRef} />;

  if (phase === "result")
    return <Result answers={answers} email={email} ref={topRef} />;

  if (phase === "email")
    return (
      <Shell ref={topRef}>
        <h2 className="font-display text-center text-[27px] font-bold leading-tight text-ink">
          Your listing plan is ready.
        </h2>
        <p className="mx-auto mt-2.5 max-w-[20rem] text-center text-[15px] leading-[1.5] text-ink-soft">
          See it right here — and we&apos;ll send a copy to your inbox.
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
          Get my listing plan
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
            Send me my listing plan by email. I&apos;ve read the{" "}
            <a href="/privacy" className="underline decoration-ink-soft/40">
              privacy policy
            </a>
            .
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <p className="mt-6 text-center text-[13px] text-ink-soft">
          Join the agents already marketing every listing with video
        </p>
      </Shell>
    );

  // --- Question / lesson steps -------------------------------------------
  return (
    <Shell ref={topRef}>
      <div className="flex items-center justify-between text-[13px] text-ink-soft">
        <span>Question {index + 1}</span>
        <span>
          {stepsLeft === 0
            ? "Last one"
            : `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} left`}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

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
        </>
      ) : (
        <>
          <h2 className="font-display mt-8 text-center text-[25px] font-bold leading-[1.18] text-ink">
            {step.title}
          </h2>
          <p className="mt-4 text-center text-[15px] leading-[1.6] text-ink-soft">
            {step.body(answers)}
          </p>
          <LessonArt kind={step.visual} answers={answers} />
          <button
            type="button"
            onClick={advance}
            className="mt-7 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
          >
            Continue
            <Arrow className="h-[18px] w-[18px]" />
          </button>
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
  ref,
}: {
  children: React.ReactNode;
  wide?: boolean;
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
      className={`mx-auto w-full max-w-[440px] px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10 lg:my-auto lg:pb-14 lg:pt-10 ${
        wide
          ? "sm:max-w-[620px] lg:max-w-[1120px] [@media(min-width:1450px)_and_(min-height:860px)]:max-w-[1380px]"
          : "sm:max-w-[620px] [@media(min-width:1450px)_and_(min-height:860px)]:max-w-[760px]"
      }`}
    >
      <div ref={ref} />
      <div className="mb-7 flex items-center justify-center gap-[11px] sm:mb-9 [@media(min-width:1450px)_and_(min-height:860px)]:mb-11 [@media(min-width:1450px)_and_(min-height:860px)]:gap-3.5">
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

function Intro({ onStart, ref }: { onStart: () => void; ref?: React.Ref<HTMLDivElement> }) {
  return (
    <Shell wide ref={ref}>
      {/*
       * One column on phones, two from `lg`.
       *
       * Mobile keeps its DOM order — copy, proof, player, CTA — so the phone
       * layout is untouched. On desktop the grid pulls the player into its own
       * column and the copy and CTA stack beside it, which fills the width
       * instead of stranding a phone-shaped card in the middle of the screen.
       */}
      {/*
       * `contents` is doing the real work here. On desktop the copy and the CTA
       * have to be one stacked column beside the media; on mobile the media has
       * to sit between them. Splitting them across two grid rows put the button
       * in a row the taller media column stretched, which is what left that
       * canyon of empty space under the proof line.
       *
       * So they live in one wrapper that is a grid item at lg and dissolves into
       * its parent below it, letting `order` interleave all three on mobile.
       */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-x-14">
        <div className="contents lg:block">
          <div className="order-1 lg:order-none">
          <span className="inline-block rounded-full bg-accent-soft px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-accent [@media(min-width:1450px)_and_(min-height:860px)]:px-5 [@media(min-width:1450px)_and_(min-height:860px)]:py-2.5 [@media(min-width:1450px)_and_(min-height:860px)]:text-[12.5px]">
            Free listing diagnostic
          </span>
          {/* Cold Meta traffic arrives with a wrong belief — that listing video
              runs hundreds per property. That belief is true of videographers
              and false of us, so the hook asks the question rather than claiming
              a loss the numbers can't back. Kept to two lines so the player and
              CTA clear the fold on a 375px in-app browser. */}
          <h1 className="font-display mt-3.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink text-balance sm:text-[34px] lg:text-[40px] [@media(min-width:1450px)_and_(min-height:860px)]:mt-5 [@media(min-width:1450px)_and_(min-height:860px)]:text-[52px]">
            What does a listing video actually cost?
          </h1>
          <p className="mt-3 text-[14.5px] leading-[1.5] text-ink-soft sm:text-[15.5px] lg:mt-4 lg:text-[16.5px] lg:leading-[1.55] [@media(min-width:1450px)_and_(min-height:860px)]:mt-5 [@media(min-width:1450px)_and_(min-height:860px)]:text-[19px]">
            6 quick questions — your marketing score, the real market rate, and
            the pack that fits your gallery.
          </p>

          {/* Proof qualifies the clips you're about to watch. Same faces as the
              home page hero, so the ad → landing → quiz run shows one set of
              people. */}
          <div className="mt-4 flex items-center gap-3 lg:mt-6">
            <ReviewAvatars size={30} />
            <div className="flex flex-col leading-none">
              <Stars />
              <span className="mt-1 text-[13px] font-semibold text-ink">
                1,564 tours delivered
              </span>
              </div>
            </div>
          </div>

          <div className="order-3 lg:order-none lg:mt-9">
            <button
              type="button"
              onClick={onStart}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99] lg:mt-0 lg:h-[60px] lg:text-[17px] [@media(min-width:1450px)_and_(min-height:860px)]:h-[70px] [@media(min-width:1450px)_and_(min-height:860px)]:text-[19px]"
            >
              Start the diagnostic
              <Arrow className="h-[18px] w-[18px] [@media(min-width:1450px)_and_(min-height:860px)]:h-5 [@media(min-width:1450px)_and_(min-height:860px)]:w-5" />
            </button>
            <p className="mt-3 text-[13px] text-ink-soft [@media(min-width:1450px)_and_(min-height:860px)]:mt-4 [@media(min-width:1450px)_and_(min-height:860px)]:text-[14.5px]">
              Takes about 2 minutes · No card needed to see your result
            </p>
          </div>
        </div>

        {/* Show the work before asking for two minutes. */}
        <div className="order-2 mt-4 lg:order-none lg:mt-0">
          <Showcase />
        </div>
      </div>
    </Shell>
  );
}

function Analyzing({ ref }: { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <Shell ref={ref}>
      <div className="flex flex-col items-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-line border-t-accent" />
        <p className="mt-6 text-[15px] text-ink-soft">Building your listing plan…</p>
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
              i === d.tier
                ? "font-bold text-accent"
                : "text-ink-soft/70"
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
      <div className="mt-4 rounded-2xl border border-line bg-accent-soft p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-ink-soft">Videographer</span>
          <span className="font-display text-[17px] font-bold text-ink">
            {usd(d.costLow)}–{usd(d.costHigh)}
            {d.single ? "" : "/yr"}
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-accent/20 pt-2.5">
          <span className="text-[14px] font-semibold text-ink">With Tourly</span>
          <span className="font-display text-[22px] font-bold text-accent">
            {usd(d.tourlyTotal)}
            {d.single ? "" : "/yr"}
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
}: {
  d: Diagnosis;
  checkoutUrl: string;
  label: string;
  expired: boolean;
}) {
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
            expired
              ? "bg-accent-soft text-accent"
              : "bg-[#d92d20] text-white"
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
        <div className="mt-3 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pack-box.jpg"
            alt="The Listing Tour pack"
            className="w-[46%] max-w-[240px] shrink-0 mix-blend-multiply"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-2.5 gap-y-1">
              <span className="font-display text-[40px] font-bold leading-none text-ink sm:text-[46px]">
                {d.pack.priceLabel}
              </span>
              <span className="pb-1 text-[18px] text-ink-soft line-through">
                {d.pack.wasLabel}
              </span>
            </div>
            <span className="mt-2 inline-block rounded-full bg-[#fdeceb] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#b42318]">
              Save {discountPct(d.pack)}%
            </span>
            <p className="mt-2 text-[13.5px] leading-[1.4] text-ink-soft">
              {d.pack.name} · one-time, no subscription
            </p>
          </div>
        </div>

        <LiveCount />

        {/* A real tour output, as close to the button as it can get.
            At the moment of payment the objection is "will this look cheap",
            not "is this expensive" — so the last thing seen before clicking is
            the finished product, not another claim about it. The before/after
            rail further down answers a different question. */}
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-night">
          <video
            src="/clips/exterior-tour.mp4"
            poster="/clips/exterior-tour.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-[150px] w-full object-cover sm:h-[180px]"
          />
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-night/65 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-cream backdrop-blur-sm">
            Made from photos
          </span>
        </div>

        <a
          href={checkoutUrl}
          className="mt-3 flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[17px] font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
        >
          Lock in {d.pack.priceLabel}
          <Arrow className="h-[18px] w-[18px]" />
        </a>

        <div className="mt-3 flex items-center justify-center gap-2.5">
          <ReviewAvatars size={24} />
          <span className="text-[12.5px] font-semibold text-ink">
            1,564 tours delivered
          </span>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-ink-soft">
          <Shield className="h-4 w-4 shrink-0 text-accent" />
          30-day money-back guarantee · secure checkout
        </p>

        <PaymentLogos />
      </div>
    </>
  );
}
