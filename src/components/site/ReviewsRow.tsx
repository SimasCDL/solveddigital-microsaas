import { Stars } from "@/components/site/Stars";

// Pilot users who agreed to appear. Square-cropped to 160px and served from
// /public rather than hotlinked, so the hero doesn't depend on a third-party
// image host and doesn't ship megabytes to mobile ad traffic.
const AVATARS = [
  "/reviews/reviewer-1.jpg",
  "/reviews/reviewer-2.jpg",
  "/reviews/reviewer-3.jpg",
  "/reviews/reviewer-4.jpg",
  "/reviews/reviewer-5.jpg",
];

/** Overlapping avatars + rating + review count. Shared by mobile & desktop heroes. */
export function ReviewsRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-3 ${className}`}
    >
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
  );
}
