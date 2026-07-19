import { Container } from "@/components/site/Container";
import { Play } from "@/components/site/icons";

interface Tour {
  label: string;
  duration: string;
  /** Tailwind gradient classes for the placeholder tile. */
  tint: string;
}

const TOURS: Tour[] = [
  {
    label: "Modern kitchen",
    duration: "0:28",
    tint: "from-[#2b2620] to-[#100d09]",
  },
  {
    label: "Primary suite",
    duration: "0:31",
    tint: "from-[#26241f] to-[#0f0d0a]",
  },
  {
    label: "Backyard & pool",
    duration: "0:24",
    tint: "from-[#2a241c] to-[#100c08]",
  },
  {
    label: "Open living",
    duration: "0:33",
    tint: "from-[#23211d] to-[#0e0c09]",
  },
  {
    label: "Twilight exterior",
    duration: "0:29",
    tint: "from-[#2c261d] to-[#0f0c08]",
  },
  {
    label: "Loft & views",
    duration: "0:27",
    tint: "from-[#252019] to-[#100d09]",
  },
];

function TourCard({ tour }: { tour: Tour }) {
  return (
    <div className="group relative aspect-[9/16] w-[170px] shrink-0 overflow-hidden rounded-xl border border-white/10 sm:w-[210px]">
      {/* Placeholder tile — swap for <video autoPlay muted loop> when clips exist. */}
      <div className={`absolute inset-0 bg-gradient-to-b ${tour.tint}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/95 text-ink transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-0.5 h-5 w-5" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-cream/90">
        <span className="font-medium">{tour.label}</span>
        <span className="text-cream/60">{tour.duration}</span>
      </div>
    </div>
  );
}

function Row({ direction }: { direction: "left" | "right" }) {
  const items = [...TOURS, ...TOURS];
  return (
    <div className="marquee-mask">
      <div
        className={`flex w-max gap-4 ${
          direction === "left"
            ? "animate-marquee-left"
            : "animate-marquee-right"
        }`}
      >
        {items.map((tour, i) => (
          <TourCard key={`${tour.label}-${i}`} tour={tour} />
        ))}
      </div>
    </div>
  );
}

export function Sample() {
  return (
    <section
      id="work"
      className="overflow-hidden bg-night py-24 text-cream sm:py-28"
    >
      <Container>
        <div className="max-w-3xl">
          <p className="eyebrow text-cream/50">The work</p>
          <h2 className="font-display mt-4 text-nowrap text-4xl leading-tight sm:text-5xl">
            See what two minutes gets you
          </h2>
          <p className="mt-4 text-nowrap text-lg text-cream/70">
            Real listing photos in, scroll-stopping tours out.
          </p>
        </div>
      </Container>

      <div className="marquee-row mt-14">
        <Row direction="left" />
      </div>
    </section>
  );
}
