"use client";

import { Stars } from "@/components/site/Stars";

/**
 * The slow auto-scrolling proof rail on the quiz intro.
 *
 * ⚠️ PLACEHOLDER COPY. Ray's is condensed from a real customer; the rest are
 * written examples for the concept build. Swap them for real quotes before this
 * takes serious spend. They are grouped in one file precisely so that is a
 * five-minute job rather than a hunt.
 *
 * Two content rules, both load-bearing for the repositioning:
 *
 *   1. Nothing here mentions video, filming, a tour or a crew. On this screen
 *      the visitor still believes they are about to learn how to market a
 *      listing, and a quote about a film crew hands them the ending. Every
 *      quote is about the OUTCOME: pitching better, moving faster, winning the
 *      instruction.
 *   2. No hard percentages or win counts. A quantified results claim is a
 *      different legal category and needs substantiation we would have to
 *      actually hold.
 *
 * Motion: reuses the marquee already in globals.css, so there is one animation
 * system on the site rather than two. That brings the edge mask, pause on
 * hover, and the prefers-reduced-motion override along with it, the last of
 * which matters because a permanently moving element beside the primary button
 * is a genuine accessibility problem for anyone with vestibular sensitivity.
 *
 * Deliberately slow (72s). This sits directly under the CTA and its job is to
 * be read by someone who is nearly decided, not to catch the eye of someone who
 * is not. Anything faster competes with the button it is supposed to support.
 */

interface Card {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}

const CARDS: Card[] = [
  {
    name: "Ray W.",
    role: "Listing agent, 6 years",
    avatar: "/reviews/ray.jpg",
    quote:
      "Honestly the most useful thing anyone has sent me this year. I changed how I pitch and my last three listings moved faster than anything I did last spring.",
  },
  {
    name: "Claire M.",
    role: "Broker, Ontario",
    avatar: "/reviews/claire.jpg",
    quote:
      "I forwarded it to my whole team. Two of them rebuilt their listing presentation the same week, which never happens.",
  },
  {
    name: "Marcus H.",
    role: "Agent, Queensland",
    avatar: "/reviews/marcus.jpg",
    quote:
      "Took two minutes and told me something I had been getting wrong for about a year. No idea why nobody says it out loud.",
  },
  {
    name: "Erin W.",
    role: "Agent, Texas",
    avatar: "/reviews/agent-1.jpg",
    quote:
      "I stopped opening on commission and started opening on the marketing. Sellers lean in now instead of bracing.",
  },
  {
    name: "Dan R.",
    role: "Team lead, Alberta",
    avatar: "/reviews/reviewer-2.jpg",
    quote:
      "Expected a sales pitch, got an actual answer. The bit about how sellers judge you before the appointment stuck with me.",
  },
];

function Quote({ c }: { c: Card }) {
  return (
    <figure className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-line/70 bg-paper/70 p-4 text-left sm:w-[320px]">
      <Stars className="h-[14px] w-[14px]" />
      <blockquote className="mt-2 flex-1 text-[14px] leading-[1.5] text-ink">
        &ldquo;{c.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.avatar}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <span className="text-[12.5px] leading-tight">
          <span className="block font-bold text-ink">{c.name}</span>
          <span className="block text-ink-soft">{c.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function IntroTestimonials() {
  return (
    /* Breaks out of the intro's reading column so the rail runs edge to edge.
       A carousel that stops short of the screen edges reads as a stuck widget
       rather than a moving strip. */
    <div className="marquee-row marquee-mask -mx-5 mt-9 overflow-hidden sm:-mx-8">
      {/* The list is rendered twice and the track translates by exactly -50%,
          which is what makes the loop seamless: at the end of the cycle the
          second copy sits precisely where the first started. `w-max` stops flex
          from compressing the cards to fit. aria-hidden on the duplicate so a
          screen reader is not read the same five quotes twice. */}
      <div
        className="animate-marquee-left flex w-max gap-3.5 px-5 sm:px-8"
        style={{ animationDuration: "72s" }}
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
  );
}
