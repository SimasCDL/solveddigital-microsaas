"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Shield, Arrow, Bolt } from "@/components/site/icons";
import { Stars } from "@/components/site/Stars";
import { PaymentLogos } from "@/components/site/PaymentLogos";
import { ReviewAvatars } from "@/components/site/ReviewsRow";
import { Showcase } from "@/components/quiz/Showcase";
import { LessonArt } from "@/components/quiz/LessonArt";
import { packCheckoutUrl, discountPct } from "@/lib/pricing";
import {
  visibleSteps,
  diagnose,
  costSentence,
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
          <h2 className="font-display mt-7 text-[25px] font-bold leading-[1.15] text-ink">
            {resolve(step.question, answers)}
          </h2>
          <div className="mt-5 flex flex-col gap-2.5">
            {resolve(step.choices, answers).map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => answer(c.id)}
                /* Options stay quiet: the accent is reserved for the one action
                   that moves money. A page where everything is teal has no
                   primary action at all. */
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-paper p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft/50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-[12px] font-bold text-ink-soft">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[15px] font-medium leading-[1.35] text-ink">
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

const Shell = function Shell({
  children,
  ref,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="mx-auto w-full max-w-[440px] px-5 pb-16 pt-6">
      <div ref={ref} />
      <div className="mb-7 flex items-center justify-center gap-[11px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tourly-mark.png" alt="" className="h-[22px] w-auto" />
        <span className="font-display text-[21px] font-bold tracking-[-0.02em] text-ink">
          Tourly
        </span>
      </div>
      {children}
    </div>
  );
};

function Intro({ onStart, ref }: { onStart: () => void; ref?: React.Ref<HTMLDivElement> }) {
  return (
    <Shell ref={ref}>
      <span className="inline-block rounded-full bg-accent-soft px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
        Free listing diagnostic
      </span>
      {/* Cold Meta traffic arrives with a wrong belief — that listing video runs
          hundreds per property. That belief is true of videographers and false
          of us, so the hook asks the question rather than claiming a loss the
          numbers can't back. Kept to two lines so the player and CTA clear the
          fold on a 375px in-app browser. */}
      <h1 className="font-display mt-3.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink text-balance">
        What does a listing video actually cost?
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.5] text-ink-soft">
        6 quick questions — your marketing score, the real market rate, and the
        pack that fits your gallery.
      </p>

      {/* Proof line sits above the player: it qualifies the clips you're about
          to watch, and keeps the CTA tight under them. Same faces as the home
          page hero, so the ad → landing → quiz run shows one set of people. */}
      <div className="mt-4 flex items-center gap-3">
        <ReviewAvatars size={30} />
        <div className="flex flex-col leading-none">
          <Stars />
          <span className="mt-1 text-[13px] font-semibold text-ink">
            1,564 tours delivered
          </span>
        </div>
      </div>

      {/* Show the work before asking for two minutes. */}
      <div className="mt-4">
        <Showcase />
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
      >
        Start the diagnostic
        <Arrow className="h-[18px] w-[18px]" />
      </button>
      <p className="mt-3 text-[13px] text-ink-soft">
        Takes about 2 minutes · No card needed to see your result
      </p>
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
      {d.tier < d.tiers.length - 1 && (
        <p className="mt-2.5 text-[13px] leading-[1.45] text-ink-soft">
          {["One step", "Two steps", "Three steps"][
            d.tiers.length - 2 - d.tier
          ] ?? "Steps"}{" "}
          below{" "}
          <strong className="font-semibold text-ink">
            {d.tiers[d.tiers.length - 1]}
          </strong>{" "}
          — and the gap is format, not budget.
        </p>
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

      {/* The number — derived entirely from their own answers. */}
      <div className="mt-5 rounded-2xl border border-line bg-accent-soft p-[18px]">
        <p className="text-[15px] leading-[1.5] text-ink">
          <strong className="font-bold">
            {usd(d.costLow)}–{usd(d.costHigh)}
            {d.single ? "" : " a year"}
          </strong>{" "}
          {costSentence(d)}
        </p>

        {/* The comparison is the strongest honest number on the page, and it was
            already being computed — there's no reason to make them do it. */}
        <div className="mt-3.5 border-t border-accent/20 pt-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13.5px] text-ink-soft">
              The same {d.single ? "property" : "coverage"} with Tourly
            </span>
            <span className="font-display text-[20px] font-bold text-accent">
              {usd(d.tourlyTotal)}
              {d.single ? "" : "/yr"}
            </span>
          </div>
        </div>
      </div>

      <h2 className="font-display mt-8 text-[24px] font-bold leading-[1.15] text-ink">
        What&apos;s happening with your listings
      </h2>
      <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft">
        Your score is {d.score}/100: {d.archetype}. {d.situation}
      </p>

      <h3 className="font-display mt-6 text-[19px] font-bold text-ink">
        What to fix first
      </h3>
      <p className="mt-2.5 text-[15px] leading-[1.6] text-ink-soft">{d.fixFirst}</p>

      <h3 className="font-display mt-6 text-[19px] font-bold text-ink">
        Your 30-day plan
      </h3>
      {/* Framed as the route to the outcome they picked on the last question, so
          the plan reads as theirs rather than as our sales sequence. */}
      {d.goalPhrase && (
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Built around {d.goalPhrase}.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-3">
        {d.plan.map((t) => (
          <div key={t} className="flex items-start gap-2.5">
            <Check className="mt-[3px] h-4 w-4 shrink-0 text-accent" />
            <span className="text-[14.5px] leading-[1.5] text-ink-soft">{t}</span>
          </div>
        ))}
      </div>

      {/* ---- Offer ---- */}
      <div className="mt-9 rounded-[24px] border border-line bg-paper p-[18px] shadow-[0_26px_64px_-36px_rgba(0,0,0,0.3)]">
        {/* Urgency is the one place a second hue earns its keep: it's the only
            warm element on a cool page, so it isolates without competing with
            the teal buy button. */}
        {/* At zero the offer stays open. Telling someone who is still on the
            page that they've missed it invents a reason to leave, and the price
            hasn't actually changed. */}
        <div
          className={`flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 ${
            expired
              ? "bg-accent-soft text-accent"
              : "bg-[#fdeceb] text-[#b42318]"
          }`}
        >
          <Bolt className="h-4 w-4 shrink-0" />
          <span className="text-[13.5px] font-bold">
            {expired
              ? "Launch pricing still applies today"
              : `Your diagnostic price holds for ${label}`}
          </span>
        </div>
        {/* Unexplained urgency reads as theatre, so say what the timer is. */}
        {!expired && (
          <p className="mt-2 text-center text-[12px] leading-[1.4] text-ink-soft">
            Launch pricing, held for this session from the moment your plan was
            built.
          </p>
        )}

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
          Recommended for your galleries
        </p>
        <p className="font-display mt-1.5 text-[27px] font-bold leading-tight text-ink">
          {d.pack.name}
        </p>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-soft">
          {d.pack.blurb} — matched to the photo count you gave.
        </p>

        <div className="mt-4 flex items-end gap-3">
          <span className="font-display text-[38px] font-bold leading-none text-ink">
            {d.pack.priceLabel}
          </span>
          <span className="pb-1 text-[17px] text-ink-soft line-through">
            {d.pack.wasLabel}
          </span>
          <span className="mb-1 rounded-full bg-[#fdeceb] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#b42318]">
            Save {discountPct(d.pack)}%
          </span>
        </div>
        <p className="mt-2 text-[13px] text-ink-soft">
          One-time. No subscription. Against {usd(d.costLow)}+{" "}
          {d.single ? "for one videographer shoot" : "a year the old way"}.
        </p>

        <div className="mt-4 flex flex-col gap-[9px]">
          {d.pack.features.map((f) => (
            <span key={f} className="inline-flex items-center gap-2 text-[14px] text-ink">
              <Check className="h-4 w-4 shrink-0 text-accent" />
              {f}
            </span>
          ))}
        </div>

        {/* Proof belongs next to the button. Doubt peaks at the price, and the
            showcase they saw is two minutes behind them by now. */}
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <ReviewAvatars size={26} />
          <span className="text-[12.5px] font-semibold text-ink">
            1,564 tours delivered
          </span>
        </div>

        <a
          href={checkoutUrl}
          className="mt-2.5 flex h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99]"
        >
          Lock in {d.pack.priceLabel} — get my tours
          <Arrow className="h-[18px] w-[18px]" />
        </a>

        <div className="mt-[18px] flex items-center gap-3 rounded-[14px] border border-line bg-accent-soft px-[15px] py-3.5">
          <Shield className="h-[26px] w-[26px] shrink-0 text-accent" />
          <div>
            <div className="text-[13.5px] font-bold text-ink">
              30-day money-back guarantee
            </div>
            <div className="text-[12.5px] text-ink-soft">
              Not obsessed with your video? Full refund — keep the files.
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Secure checkout · Instant delivery
        </p>
        <PaymentLogos />
      </div>

      {/* No free-trial escape hatch here on purpose: checkout is the only exit
          from this funnel. The guarantee above carries the risk reversal. */}
    </Shell>
  );
}
