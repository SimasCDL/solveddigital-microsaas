import { Container } from "@/components/site/Container";
import { CtaButton } from "@/components/ab/CtaButton";

const PLATFORMS = ["Zillow", "MLS", "Instagram", "YouTube"];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">
            Property videos, <span className="text-accent">made easy</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Three steps, about two minutes. No editing skills or software
            needed.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {/* ── Step 1 — Upload ── */}
          <div className="flex flex-col rounded-2xl border border-line bg-paper p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Step 1
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">
              Upload your photos
            </h3>
            <p className="mt-3 flex-1 text-[0.95rem] leading-7 text-ink-soft">
              Drop in 10–30 listing photos and set the order — that’s the only
              work you do.
            </p>

            {/*
              Media panel (4:3). Placeholder for the real upload clip.
              Swap for: <video autoPlay muted loop playsInline poster="/how/upload-poster.jpg">
                          <source src="/how/upload-demo.mp4" type="video/mp4" />
                        </video>
            */}
            <div className="mt-6 grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-[#f1ede5]">
              <div className="relative h-24 w-32">
                <div className="absolute left-1 top-2 h-20 w-28 -rotate-6 rounded-lg border border-line bg-white shadow-sm" />
                <div className="absolute left-2 top-1 h-20 w-28 rotate-3 rounded-lg border border-line bg-white shadow-sm" />
                <div className="absolute inset-x-2 top-0 h-20 rounded-lg border border-line bg-gradient-to-br from-[#e9e3d7] to-[#cfc7b8] shadow-md" />
              </div>
            </div>
          </div>

          {/* ── Step 2 — Finished video ── */}
          <div className="flex flex-col rounded-2xl border border-line bg-paper p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Step 2
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">
              Get your polished video instantly
            </h3>
            <p className="mt-3 flex-1 text-[0.95rem] leading-7 text-ink-soft">
              AI-powered editing turns your photos into a ready-to-post tour —
              cinematic motion, music, captions and branding, assembled
              automatically.
            </p>

            {/* The finished tour. Wired to the real clip; swap for /how/tour.mp4 when ready. */}
            <div className="mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-night">
              <video
                className="h-full w-full object-cover"
                src="/hero.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          </div>

          {/* ── Step 3 — Post ── */}
          <div className="flex flex-col rounded-2xl border border-line bg-paper p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Step 3
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">
              Post and sell
            </h3>
            <p className="mt-3 flex-1 text-[0.95rem] leading-7 text-ink-soft">
              Download vertical and horizontal cuts for Zillow, the MLS,
              Instagram and YouTube — the marketing sellers expect.
            </p>

            {/*
              Media panel (4:3). Placeholder for a finished-tour still.
              Swap the gradient for: <img src="/how/posted.jpg" alt="Finished tour, posted" ... />
            */}
            <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b2620] to-[#100d09]">
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 p-3">
                {PLATFORMS.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <CtaButton />
          <p className="text-sm text-ink-soft">
            No subscription · Love it or it’s free
          </p>
        </div>
      </Container>
    </section>
  );
}
