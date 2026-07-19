"use client";

import { useEffect, useState } from "react";
import { Stars } from "@/components/site/Stars";
import { Bolt, Arrow } from "@/components/site/icons";

/**
 * Bottom CTA bar, hidden until the user scrolls past the instant-buy block
 * (observed by its #buy id), then fades/slides in.
 */
export function StickyBuyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const buy = document.getElementById("buy");
    if (!buy) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Show once the buy block has scrolled fully above the viewport top.
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    io.observe(buy);
    return () => io.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div
        className="pointer-events-auto flex w-full max-w-[440px] flex-col-reverse border-t border-line bg-[color-mix(in_oklab,var(--color-cream)_94%,transparent)] px-4 pb-[30px] pt-2.5 backdrop-blur-md transition-[opacity,transform] duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(130%)",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <div className="mt-2.5 flex flex-row-reverse items-center justify-center gap-5">
          <div className="flex items-center gap-1.5">
            <Stars className="h-[13px] w-[13px]" />
            <span className="text-xs text-ink-soft">
              <strong className="font-bold text-ink">4.9</strong> · 360+ reviews
            </span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink">
            <Bolt className="h-3.5 w-3.5 text-accent" />2 min delivery
          </div>
        </div>
        <a
          href="#pricing"
          className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[15.5px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(15,125,107,0.6)]"
        >
          Create your first winning video
          <Arrow className="h-[18px] w-[18px]" />
        </a>
      </div>
    </div>
  );
}
