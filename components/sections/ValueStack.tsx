import { Container } from "@/components/site/Container";
import { CtaButton } from "@/components/ab/CtaButton";
import { Play, Swap, Star } from "@/components/site/icons";

const COLUMNS = [
  {
    Icon: Play,
    title: "Shot like a videographer",
    body: "Cinematic camera motion on every room, set to licensed music.",
  },
  {
    Icon: Swap,
    title: "Made for every feed",
    body: "Vertical and horizontal cuts for every feed, with auto captions.",
  },
  {
    Icon: Star,
    title: "Branded and instant",
    body: "Your logo, name and contact baked in — ready in about two minutes.",
  },
];

export function ValueStack() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-accent-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            What’s included
          </span>
          <h2 className="font-display mx-auto mt-6 max-w-3xl text-4xl leading-tight sm:text-5xl">
            A <span className="text-accent">studio-grade</span> tour, every time
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-ink-soft">
            Everything a videographer would charge $300–$1,000 for — minus the
            scheduling, the wait, and the invoice. One flat price, no
            subscription.
          </p>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {COLUMNS.map(({ Icon, title, body }) => (
            <div key={title} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft">
                <Icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-display mt-6 text-xl font-semibold text-ink">
                {title}
              </h3>
              {/* max-w keeps every subtitle to two rows */}
              <p className="mx-auto mt-3 max-w-[17rem] leading-7 text-ink-soft">
                {body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <CtaButton />
        </div>
      </Container>
    </section>
  );
}
