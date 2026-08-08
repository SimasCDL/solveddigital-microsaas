"use client";

import { useRef, useState } from "react";
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

/**
 * Two cards, not three. The only two faces we have are Claire and Ray, and Ray
 * is the person in the video — putting him on a written card too would show the
 * same customer twice. A third would need a third real face; a stock avatar
 * between two real ones is worse than having two.
 */
const WRITTEN: Written[] = [
  {
    name: "Claire Bennett",
    avatar: "/reviews/claire.jpg",
    quote:
      "Sent the gallery over on a Tuesday and had the tour up the same afternoon. My seller thought I'd paid for a film crew.",
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

function Speaker({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z"
        fill="currentColor"
      />
      {on ? (
        <path
          d="M15.5 8.8a4.4 4.4 0 0 1 0 6.4M18 6.3a7.9 7.9 0 0 1 0 11.4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 9.5l4.5 5M20.5 9.5l-4.5 5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * Muted looping preview until you tap it, then it restarts with sound.
 *
 * It has to start muted — no browser autoplays audio — so the tap is the only
 * way to get the voiceover, and without an obvious affordance nobody discovers
 * it. Tapping again mutes it rather than stopping, so the card never goes dead.
 */
function VideoTestimonial() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !sound;
    v.muted = !next;
    if (next) v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    setSound(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={sound ? "Mute testimonial" : "Play testimonial with sound"}
      className="group relative mt-3 block w-full overflow-hidden rounded-xl bg-night"
    >
      <video
        ref={videoRef}
        src={VIDEO.src}
        poster={VIDEO.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="aspect-[9/16] max-h-[320px] w-full object-cover"
      />
      <span
        className={`absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm transition-colors ${
          sound
            ? "bg-night/60 text-cream"
            : "bg-cream/95 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.3)]"
        }`}
      >
        <Speaker on={sound} className="h-[15px] w-[15px]" />
        {sound ? "Sound on" : "Tap for sound"}
      </span>
    </button>
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <VideoTestimonial />
        </div>
      </div>
    </div>
  );
}
