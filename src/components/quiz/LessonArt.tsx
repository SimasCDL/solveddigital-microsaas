"use client";

import {
  usd,
  videographerCost,
  tourlyCost,
  type Answers,
  type LessonVisual,
} from "@/lib/quiz";

/**
 * Diagrams for the quiz interstitials.
 *
 * Both are drawn from layout primitives in the site palette rather than
 * photography. Traffic here is mobile and mostly in-app, so these get read in
 * about a second — an abstract shape lands in that window, a busy image doesn't.
 */

function Card({
  eyebrow,
  caption,
  children,
}: {
  eyebrow: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-line bg-paper p-[18px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        {eyebrow}
      </p>
      {children}
      <p className="mt-3.5 text-center text-[12.5px] leading-[1.45] text-ink-soft">
        {caption}
      </p>
    </div>
  );
}

/**
 * Two left-anchored bars, on the same scale as the prose above them.
 *
 * The copy on this step talks annually for agents and per-property for single
 * sellers, so the chart follows suit — an annual sentence sitting on top of a
 * per-listing chart makes the reader reconcile two framings at once.
 *
 * Anchored at zero and scaled to a shared maximum so the lengths are directly
 * comparable; the gap is the whole argument. Both figures derive from PACKS and
 * the site's quoted videographer range, so a price change can't strand a stale
 * claim here.
 */
function CostArt({ answers }: { answers: Answers }) {
  const v = videographerCost(answers);
  const t = tourlyCost(answers);
  const MAX = v.high;

  const rows = [
    {
      label: "Videographer",
      price: `${usd(v.low)}–${usd(v.high)}`,
      width: 100,
      bar: "bg-ink/85",
      text: "text-ink",
    },
    {
      label: "Tourly",
      price: `${usd(t.low)}–${usd(t.high)}`,
      width: Math.max((t.high / MAX) * 100, 2),
      bar: "bg-accent",
      text: "text-accent",
    },
  ];

  return (
    <Card
      eyebrow={
        v.single ? "Cost for your property" : `Cost for ${v.perYear} listings a year`
      }
      caption={
        v.single
          ? "The same property on video, either way."
          : "The same listings on video, either way."
      }
    >
      <div className="mt-4 flex flex-col gap-[18px]">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13.5px] font-semibold text-ink">
                {r.label}
              </span>
              <span className={`text-[15px] font-bold ${r.text}`}>
                {r.price}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
              <div
                className={`h-full rounded-full ${r.bar}`}
                style={{ width: `${r.width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Play({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 6.5v11a.6.6 0 0 0 .92.5l8.2-5.5a.6.6 0 0 0 0-1l-8.2-5.5A.6.6 0 0 0 9 6.5Z" />
    </svg>
  );
}

/**
 * A feed with two stills and a tour in it. The cards above and below are cropped
 * by the frame so it reads as mid-scroll rather than as a finished list.
 */
function FeedArt() {
  return (
    <Card
      eyebrow="In the feed"
      caption="Two stills and a tour. Only one of them moves."
    >
      <div className="relative mx-auto mt-4 h-[176px] w-[186px] overflow-hidden rounded-[20px] border border-line bg-cream">
        <div className="absolute -top-7 left-3.5 right-3.5 h-[62px] rounded-xl bg-line/60" />

        <div className="absolute left-3.5 right-3.5 top-[57px] flex h-[62px] items-center justify-center rounded-xl border-2 border-accent bg-accent-soft shadow-[0_8px_18px_-10px_rgba(15,125,107,0.7)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-cream">
            <Play className="ml-[1px] h-4 w-4" />
          </span>
        </div>

        <div className="absolute -bottom-7 left-3.5 right-3.5 h-[62px] rounded-xl bg-line/60" />
      </div>
    </Card>
  );
}

export function LessonArt({
  kind,
  answers,
}: {
  kind?: LessonVisual;
  answers: Answers;
}) {
  if (kind === "cost") return <CostArt answers={answers} />;
  if (kind === "feed") return <FeedArt />;
  return null;
}
