"use client";

import { SELLERS_EXPECT, AGENT_ADOPTION } from "@/lib/proof";
import { type LessonVisual } from "@/lib/quiz";

/**
 * Diagrams for the quiz interstitials.
 *
 * Both are drawn from layout primitives in the site palette rather than
 * photography. Traffic here is mobile and mostly in-app, so these get read in
 * about a second: an abstract shape lands in that window, a busy image doesn't.
 */

function Card({
  eyebrow,
  caption,
  source,
  children,
}: {
  eyebrow: string;
  caption?: string;
  /** Attribution line. Present on anything quoting a third-party figure. */
  source?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-line bg-paper p-[18px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        {eyebrow}
      </p>
      {children}
      {caption && (
        <p className="mt-3.5 text-center text-[12.5px] leading-[1.45] text-ink-soft">
          {caption}
        </p>
      )}
      {/* The citation is the point of the card, not a footnote we are obliged
          to add. Separated by a rule so it reads as provenance rather than as
          more of our own copy. */}
      {source && (
        <p className="mt-3.5 border-t border-line pt-3 text-[11px] leading-[1.4] text-ink-soft/80">
          Source: {source}
        </p>
      )}
    </div>
  );
}

/**
 * The demand/supply gap, as two bars that obviously do not match.
 *
 * This replaced a chart of our own prices. The argument is stronger without us
 * in it: one bar is what sellers want, the other is how many agents provide it,
 * and the reader draws the only available conclusion themselves. Nothing here
 * mentions a product, a price, or Tourly, which is exactly why it survives the
 * scepticism a price chart on question three would not.
 *
 * The bars are drawn to their own honest widths. 73% draws at 73, and the
 * adoption figure draws at roughly 1 in 10, so the picture and the numbers
 * agree; a chart that exaggerates the gap it is describing is the fastest way
 * to lose a reader who can subtract.
 */
function GapArt() {
  const rows = [
    {
      label: "Sellers who want it",
      stat: SELLERS_EXPECT.stat,
      width: 73,
      bar: "bg-accent",
      text: "text-accent",
    },
    {
      label: "Agents who do it",
      stat: AGENT_ADOPTION.stat,
      width: 10,
      bar: "bg-ink/80",
      text: "text-ink",
    },
  ];

  return (
    <Card
      eyebrow="Demand vs supply"
      caption="That distance is the whole opportunity."
      source={SELLERS_EXPECT.source}
    >
      <div className="mt-4 flex flex-col gap-[18px]">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-semibold text-ink">
                {r.label}
              </span>
              <span className={`text-[17px] font-bold ${r.text}`}>
                {r.stat}
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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
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
      caption="Two stills and one that moves. Only one of them stops a thumb."
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

export function LessonArt({ kind }: { kind?: LessonVisual }) {
  if (kind === "gap") return <GapArt />;
  if (kind === "feed") return <FeedArt />;
  return null;
}
