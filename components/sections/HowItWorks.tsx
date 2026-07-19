const STEPS = [
  {
    n: 1,
    title: "Upload your photos",
    body: "Drop in 10–30 listing photos and set the order — that's the only work you do.",
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
    body: "Download vertical and horizontal cuts for Zillow, the MLS, Instagram and YouTube.",
    img: "/how/step-3-post.png",
  },
];

const PLATFORMS = ["Zillow", "MLS", "Instagram", "YouTube"];

export function HowItWorks() {
  return (
    <section id="how" className="px-5 py-11">
      <div className="text-center">
        <h2 className="font-display text-[30px] font-semibold leading-[1.15] text-ink">
          Property videos, <span className="text-accent">made easy</span>
        </h2>
      </div>

      {STEPS.map((s) => (
        <div
          key={s.n}
          className="mt-4 rounded-[20px] border border-line bg-paper p-[18px] first:mt-5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
              {s.n}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Step {s.n}
            </span>
          </div>
          <h3 className="font-display mt-[13px] text-lg font-semibold text-ink">
            {s.title}
          </h3>
          <p className="mt-[7px] text-sm leading-[1.5] text-ink-soft">
            {s.body}
          </p>

          <div className="relative mt-3.5 aspect-[4/3] overflow-hidden rounded-[14px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.img}
              alt={s.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {s.n === 3 && (
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 px-3 pb-1 pt-3">
                {PLATFORMS.map((p, i) => (
                  <span
                    key={p}
                    className="animate-float rounded-full bg-white/90 px-[11px] py-[5px] text-xs font-semibold text-ink backdrop-blur"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
