"use client";

import { useRef } from "react";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";

/**
 * Social proof under the offer.
 *
 * The two written quotes are example copy for the concept build — swap them for
 * real customer ones before this takes live traffic. The video is genuine.
 */

interface Written {
  name: string;
  avatar: string;
  quote: string;
}

const WRITTEN: Written[] = [
  {
    name: "Marcus Hale",
    avatar: "/reviews/reviewer-2.jpg",
    quote:
      "Sent the gallery over on a Tuesday and had the tour up the same afternoon. My seller thought I'd paid for a film crew.",
  },
  {
    name: "Dani Okafor",
    avatar: "/reviews/reviewer-4.jpg",
    quote:
      "I use it on every listing now, not just the expensive ones. That's the part that actually changed things for me.",
  },
];

const VIDEO = {
  name: "Ray Whitfield",
  // Cropped from the clip itself, so the avatar is actually the person talking
  // rather than one of the generic reviewer stock faces.
  avatar: "/reviews/ray.jpg",
  src: "/reviews/ugc-1.mp4",
  poster: "/reviews/ugc-1.jpg",
};

function Verified({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Verified">
      <path
        d="M12 2.5l2.2 1.6 2.7-.3 1 2.5 2.4 1.2-.7 2.6.7 2.6-2.4 1.2-1 2.5-2.7-.3L12 21.5l-2.2-1.6-2.7.3-1-2.5-2.4-1.2.7-2.6-.7-2.6 2.4-1.2 1-2.5 2.7.3L12 2.5Z"
        fill="currentColor"
      />
      <path
        d="M8.6 12.1l2.3 2.3 4.5-4.6"
        stroke="#faf8f3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Head({ name, avatar }: { name: string; avatar: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
      <span className="text-[14.5px] font-bold text-ink">{name}</span>
      <Verified className="h-[15px] w-[15px] text-accent" />
    </div>
  );
}

export function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  useVideoAutoplay(ref);

  return (
    <div ref={ref} className="mt-9">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        What agents say
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {WRITTEN.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-line bg-paper p-4 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.4)]"
          >
            <Head name={t.name} avatar={t.avatar} />
            <p className="mt-3 text-[14.5px] leading-[1.5] text-ink-soft">
              {t.quote}
            </p>
          </div>
        ))}

        <div className="rounded-2xl border border-line bg-paper p-4 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.4)]">
          <Head name={VIDEO.name} avatar={VIDEO.avatar} />
          {/* Captions are burned into the clip, so it works muted — which it has
              to be, since no browser will autoplay it with sound. */}
          <div className="mt-3 overflow-hidden rounded-xl bg-night">
            <video
              src={VIDEO.src}
              poster={VIDEO.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="aspect-[9/16] max-h-[320px] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
