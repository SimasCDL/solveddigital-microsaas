"use client";

import { useState } from "react";
import { Menu, Arrow } from "@/components/site/icons";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <div className="relative z-30 px-3.5 pt-3.5">
      <nav className="flex items-center rounded-[22px] bg-paper px-[18px] py-[15px] shadow-[0_8px_24px_rgba(21,19,15,0.07)]">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex text-ink"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-[13px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tourly-mark.png"
            alt="Tourly"
            className="h-[26px] w-auto shrink-0"
          />
          <span className="font-display text-[25px] font-bold tracking-[-0.02em] text-ink">
            Tourly
          </span>
        </div>
        <div className="w-6" />
      </nav>

      {menuOpen && (
        <div className="relative z-[29] mt-2 overflow-hidden rounded-[18px] border border-line bg-paper shadow-[0_18px_44px_-18px_rgba(21,19,15,0.3)]">
          <a
            href="#how"
            onClick={close}
            className="block border-b border-line px-5 py-[15px] text-[15px] font-semibold text-ink"
          >
            How it works
          </a>
          <a
            href="#pricing"
            onClick={close}
            className="block border-b border-line px-5 py-[15px] text-[15px] font-semibold text-ink"
          >
            Pricing
          </a>
          <a
            href="#faq"
            onClick={close}
            className="block px-5 py-[15px] text-[15px] font-semibold text-ink"
          >
            FAQ
          </a>
          <a
            href="#buy"
            onClick={close}
            className="m-3 flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[15px] font-bold text-white"
          >
            Make my tour
            <Arrow className="h-[17px] w-[17px]" />
          </a>
        </div>
      )}
    </div>
  );
}
