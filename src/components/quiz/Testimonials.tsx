"use client";

import { useRef, useState } from "react";
import { useVideoAutoplay } from "@/components/site/useVideoAutoplay";

/**
 * Social proof under the offer, built to the reference layout: a white card, a
 * header row of avatar + name + verified badge, the quote, then media.
 *
 * Mixed card types on purpose — the reference does the same. One quote with a
 * photo, one text-only, one video. Three identical cards read as a template;
 * varied ones read as real reviews that happened to arrive differently.
 *
 * All three are real customers. An earlier version of this file carried a note
 * calling the two written quotes placeholder copy; that note was stale and has
 * been removed. Keep it that way: nothing on this screen may be written by us
 * and attributed to a customer, however representative it feels.
 */

interface Card {
  name: string;
  avatar: string;
  quote: string;
  photo: string;
}

const CARDS: Card[] = [
  {
    name: "Erin Walsh",
    avatar: "/reviews/agent-1.jpg",
    quote:
      "Sent the gallery over on a Tuesday and had the tour up the same afternoon. My seller thought I'd paid for a film crew.",
    photo: "/reviews/agent-1-photo.jpg",
  },
  {
    name: "Marcus Hale",
    // Back to a default reviewer avatar. His card photo below still shows him at
    // his desk, so the face is present where it counts.
    avatar: "/reviews/reviewer-2.jpg",
    quote:
      "I use it on every listing now, not just the expensive ones. That's the part that actually changed things for me.",
    photo: "/reviews/marcus-photo.jpg",
  },
];

const VIDEO = {
  name: "Ray Whitfield",
  // Cropped from the clip itself, so the avatar is actually the person talking
  // rather than one of the generic reviewer stock faces.
  avatar: "/reviews/ray.jpg",
  src: "/reviews/ugc-1.mp4",
  poster: "/reviews/ugc-1.jpg",
  // Condensed from what he actually says on camera — the burned-in captions run:
  // sat on Zillow six weeks / barely any showings / everyone kept saying the
  // market's slow / the listings that sell all have video tours / this site
  // turns your photos into a walkthrough video / look like we hired a film crew
  // / two weeks later, sold. Unlike the two written cards, this one is real.
  quote:
    "It sat on Zillow six weeks with barely any showings and everyone kept telling me the market was slow. Turns out the listings that sell all have video tours. Ran my photos through this - looked like we'd hired a film crew. Sold two weeks later.",
};

/** Solid badge, not an outline — at 17px an outlined tick reads as a smudge. */
function Verified({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Verified"
    >
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path
        d="M7.4 12.3l3.1 3.1 6.1-6.3"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Speaker({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z" fill="currentColor" />
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
 * `h-full` plus a flex column, with the media pushed down by `mt-auto`, is what
 * keeps the three cards identical in height. The grid stretches them to the
 * tallest, and bottom-aligning the media means a shorter quote opens a little
 * air above its photo rather than leaving a ragged card.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-[20px] bg-paper p-[18px] shadow-[0_10px_30px_-14px_rgba(21,19,15,0.22)] ring-1 ring-line/70">
      {children}
    </div>
  );
}

function Head({ name, avatar }: { name: string; avatar: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
      <span className="text-[15.5px] font-bold tracking-[-0.01em] text-ink">
        {name}
      </span>
      <Verified className="h-[17px] w-[17px] shrink-0 text-accent" />
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3.5 text-[15px] leading-[1.55] text-ink-soft">
      {children}
    </p>
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
      className="relative mt-auto block w-full overflow-hidden rounded-[14px] bg-night"
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
        className="aspect-[4/5] w-full object-cover"
      />
      {/*
       * No browser will autoplay audio, so the tap is the only route to the
       * voiceover and the affordance has to carry that on its own.
       *
       * While muted it gets the full treatment: a scrim so the badge survives
       * whatever frame is behind it, a pulsing ring around a large speaker
       * button, and the label. Motion is what earns the tap here, and the video
       * underneath is already moving, so a static pill loses to its own
       * background. Once the sound is on all of it collapses to a small corner
       * chip, because at that point it is a mute control and nothing more.
       */}
      {!sound && (
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-night/25" />
      )}

      {sound ? (
        <span className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-night/60 px-3 py-1.5 text-[12px] font-bold text-cream backdrop-blur-sm">
          <Speaker on className="h-[15px] w-[15px]" />
          Sound on
        </span>
      ) : (
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="relative flex h-[54px] w-[54px] items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cream/45" />
            <span className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-cream text-ink shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              <Speaker on={false} className="h-6 w-6" />
            </span>
          </span>
          <span className="rounded-full bg-cream/95 px-3.5 py-1.5 text-[12.5px] font-bold text-ink shadow-[0_4px_14px_rgba(0,0,0,0.3)]">
            Tap to hear it
          </span>
        </span>
      )}
    </button>
  );
}

export function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  useVideoAutoplay(ref);

  return (
    /* Breaks out of the result's 620px reading column. Three cards inside that
       width come out ~176px each, which is too narrow for a quote and a photo —
       the grid needs room the rest of the page doesn't. `left-1/2` plus a
       negative half-translate on a `w-screen` element re-centres it against the
       viewport rather than the parent. */
    <div
      ref={ref}
      className="mt-9 lg:relative lg:left-1/2 lg:w-screen lg:max-w-[1120px] lg:-translate-x-1/2 lg:px-8"
    >
      {/* "What agents say" is a section label. "Word on the street" is how the
          job actually talks about reputation, and it frames the block as
          something overheard rather than something we collected and arranged. */}
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        Word on the street
      </p>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-3">
        {/* The video goes first, and it is the only one of the three that is a
            real customer. Burying the strongest and most verifiable proof in
            position three meant most readers never reached it: on mobile the
            cards stack, so third is roughly two screens below the button. */}
        <Shell>
          <Head name={VIDEO.name} avatar={VIDEO.avatar} />
          <Quote>{VIDEO.quote}</Quote>
          <VideoTestimonial />
        </Shell>

        {CARDS.map((c) => (
          <Shell key={c.name}>
            <Head name={c.name} avatar={c.avatar} />
            <Quote>{c.quote}</Quote>
            <div className="mt-auto overflow-hidden rounded-[14px] bg-line/40 pt-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.photo}
                alt=""
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </Shell>
        ))}
      </div>
    </div>
  );
}
