import { Container } from "@/components/site/Container";
import { CtaButton } from "@/components/ab/CtaButton";

const PLATFORMS = ["Zillow", "MLS", "Instagram", "YouTube"];

const STEPS = [
  {
    n: 1,
    title: "Upload your photos",
    body: "Drop in 10–30 listing photos and set the order — that’s the only work you do.",
    img: "/how/step-1-upload.png",
  },
  {
    n: 2,
    title: "Get your polished video instantly",
    body: "No videographer, no editing — AI turns your photos into a ready-to-post tour for you.",
    img: "/how/step-2-edit.png",
  },
  {
    n: 3,
    title: "Post and sell",
    body: "Download vertical and horizontal cuts for Zillow, the MLS, Instagram and YouTube — the marketing sellers expect.",
    img: "/how/step-3-post.png",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 sm:py-32">
      <Container className="max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            Property videos, <span className="text-accent">made easy</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Three steps, about two minutes. No editing skills or software
            needed.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_30px_70px_-45px_rgba(30,26,20,0.4)]"
            >
              {/* Big image-forward media (perfect 4:3). */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.img}
                  alt={s.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {s.n === 3 && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 p-4">
                    {PLATFORMS.map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-ink backdrop-blur"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-cream shadow-lg">
                  {s.n}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Step {s.n}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">
                  {s.title}
                </h3>
                <p className="mt-3 text-[1.05rem] leading-7 text-ink-soft">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-3">
          <CtaButton />
          <p className="text-sm text-ink-soft">
            No subscription · Love it or it’s free
          </p>
        </div>
      </Container>
    </section>
  );
}
