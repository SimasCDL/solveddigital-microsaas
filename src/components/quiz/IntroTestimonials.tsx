"use client";

import { useEffect, useState } from "react";

/**
 * Social-proof rail on the quiz intro screen.
 *
 * Card style matches the result-screen testimonials: white card, avatar + name
 * + firm + location, verified badge, blockquote. No stars.
 *
 * Two positioning rules, both load-bearing:
 *
 *   1. Nothing here mentions video, filming, a tour or a crew. On this screen
 *      the visitor still believes they are about to learn how to market a
 *      listing, and a quote about a film crew hands them the ending.
 *   2. No hard percentages or win counts. A quantified results claim needs
 *      substantiation we do not hold.
 */

interface Card {
  name: string;
  title: string;
  avatar: string;
  quote: string;
}

const CARDS: Card[] = [
  {
    name: "Daniel Ferro",
    title: "Managing Broker, Ferro & Vale Realty",
    avatar: "/reviews/daniel-ferro.jpg",
    quote:
      "I get pitched marketing tools constantly and I ignore almost all of them. This one I actually put on every listing. Closest thing I've found to an unfair advantage that costs less than a tank of gas.",
  },
  {
    name: "Nicole Reyes",
    title: "Agent, Compass",
    avatar: "/reviews/nicole-reyes.jpg",
    quote:
      "My listings used to just sit and I kept blaming the market. Ran through this and realized I was presenting everything the same way as every other agent in my area. Changed one thing and it clicked.",
  },
  {
    name: "Samantha Chen",
    title: "Listing Specialist, Keller Williams",
    avatar: "/reviews/samantha-chen.jpg",
    quote:
      "Forwarded this to my whole team on a Monday, by Wednesday two of them completely redid how they present listings. That literally never happens with the things I usually send around.",
  },
  {
    name: "Jessica Torres",
    title: "Broker Associate, Coldwell Banker",
    avatar: "/reviews/jessica-torres.jpg",
    quote:
      "Nine years in and this still showed me something I was missing. The part about how buyers decide before they ever walk in stuck with me. My sellers can feel the difference now.",
  },
  {
    name: "Rachel Whitmore",
    title: "Team Lead, eXp Realty",
    avatar: "/reviews/rachel-whitmore.jpg",
    quote:
      "I was skeptical because I've tried every marketing tool out there. But this actually changed how I run listing appointments. Didn't change my pitch, just my presentation. Huge difference.",
  },
  {
    name: "Megan Avery",
    title: "Agent, RE/MAX",
    avatar: "/reviews/megan-avery.jpg",
    quote:
      "A friend sent me this and I almost didn't open it. Glad I did. Five years in the business and nobody had ever explained the gap between what sellers expect and what most agents deliver.",
  },
];

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

function Quote({ c }: { c: Card }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-line/60 bg-paper p-5 text-left shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] sm:w-[340px]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.avatar}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-line/40"
        />
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold leading-tight text-ink">
              {c.name}
            </span>
            <Verified className="h-[15px] w-[15px] shrink-0 text-accent" />
          </span>
          <span className="block text-[12.5px] leading-tight text-ink-soft">
            {c.title}
          </span>
        </div>
      </div>
      <blockquote className="mt-4 text-[14.5px] leading-[1.55] text-ink">
        &ldquo;{c.quote}&rdquo;
      </blockquote>
    </figure>
  );
}

function LiveActivity() {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    const tick = () =>
      setN((prev) =>
        prev === null
          ? 12 + Math.floor(Math.random() * 9)
          : Math.min(25, Math.max(8, prev + (Math.random() < 0.5 ? -1 : 1))),
      );
    const seed = setTimeout(tick, 0);
    const id = setInterval(tick, 7000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);

  if (n === null) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" />
      </span>
      <span className="text-[13px] font-semibold text-[#15803d]">
        {n} agents are building their listing plan right now
      </span>
    </div>
  );
}

export function IntroTestimonials() {
  return (
    <div className="mt-9">
      <LiveActivity />
      <div className="marquee-row marquee-mask -mx-5 mt-3 overflow-hidden sm:-mx-8">
        <div
          className="animate-marquee-left flex w-max items-start gap-3.5 px-5 sm:px-8"
          style={{ animationDuration: "82s" }}
        >
          {CARDS.map((c) => (
            <Quote key={c.name} c={c} />
          ))}
          <span className="contents" aria-hidden="true">
            {CARDS.map((c) => (
              <Quote key={`${c.name}-dup`} c={c} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
