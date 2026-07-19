import { CtaButton } from "@/components/ab/CtaButton";
import { Stars } from "@/components/site/Stars";
import { Arrow } from "@/components/site/icons";

const AVATARS = [
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
];

export function Hero() {
  return (
    <div className="px-[22px] pt-11 text-center">
      <span className="inline-block rounded-full bg-accent-soft px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-accent">
        The 2-minute listing tour
      </span>

      <h1 className="font-display mt-5 text-[33px] font-bold leading-[1.08] tracking-[-0.02em] text-ink text-balance">
        Turn listing photos into stunning video tours{" "}
        <span className="text-accent">instantly</span>
      </h1>

      <p className="mx-auto mt-[18px] max-w-[23rem] text-base leading-[1.55] text-ink-soft">
        Upload your photos and get a polished, share-ready listing video in
        about two minutes.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        <CtaButton size="xl" label="Make my first tour" />
        <p className="text-[13.5px] text-ink-soft">
          Secure checkout · Money-back guarantee
        </p>
      </div>

      {/* Reviews */}
      <div className="mt-[26px] flex flex-wrap items-center justify-center gap-3">
        <div className="flex">
          {AVATARS.map((src, i) => (
            <span
              key={src}
              className="h-[38px] w-[38px] overflow-hidden rounded-full border-2 border-cream"
              style={{
                marginLeft: i === 0 ? 0 : -13,
                zIndex: AVATARS.length - i,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-ink">4.9</span>
          <Stars />
          <span className="text-sm text-ink-soft">360+ reviews</span>
        </div>
      </div>

      {/* Before → After label */}
      <div className="mt-11 flex items-center justify-center gap-3 text-[17px] font-semibold text-ink">
        <span>Before</span>
        <Arrow className="h-5 w-5 text-accent" />
        <span>After</span>
      </div>
    </div>
  );
}
