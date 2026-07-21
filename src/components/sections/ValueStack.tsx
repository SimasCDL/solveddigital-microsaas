import { CtaButton } from "@/components/ab/CtaButton";
import { Play, Swap, Star } from "@/components/site/icons";

const ROWS = [
  {
    Icon: Play,
    title: "Shot like a videographer",
    body: "Cinematic camera motion on every room, set to licensed music.",
  },
  {
    Icon: Swap,
    title: "Made for every feed",
    body: "Vertical and horizontal cuts for every feed.",
  },
  {
    Icon: Star,
    title: "Instant delivery",
    body: "Delivered straight into your inbox in about two minutes.",
  },
];

export function ValueStack() {
  return (
    <section className="px-5 py-11">
      <div className="text-center">
        <span className="inline-block rounded-full bg-accent-soft px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          What’s included
        </span>
        <h2 className="font-display mt-4 text-[26px] font-semibold leading-[1.15] text-ink">
          A <span className="text-accent">studio-grade</span> tour, every time
        </h2>
        <p className="mx-auto mt-3 max-w-[22rem] text-[14.5px] leading-[1.5] text-ink-soft">
          A videographer charges $300–$1,000 — we skip the scheduling, wait, and
          invoice.
        </p>
      </div>

      {ROWS.map(({ Icon, title, body }) => (
        <div
          key={title}
          className="mt-[18px] flex items-start gap-3.5 first:mt-[22px]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent">
            <Icon className="h-[22px] w-[22px]" />
          </div>
          <div>
            <h3 className="font-display mt-0.5 text-[17px] font-semibold text-ink">
              {title}
            </h3>
            <p className="mt-[5px] text-sm leading-[1.5] text-ink-soft">
              {body}
            </p>
          </div>
        </div>
      ))}

      <div className="mt-[26px] flex justify-center">
        <CtaButton label="Make my first tour" />
      </div>
    </section>
  );
}
