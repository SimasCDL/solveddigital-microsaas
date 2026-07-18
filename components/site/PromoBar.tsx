"use client";

import { useEffect, useState } from "react";

const KEY = "tourly_promo_end";
const WINDOW_MS = 24 * 60 * 60 * 1000; // evergreen 24h window per visitor

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function format(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function PromoBar() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let end = Number(localStorage.getItem(KEY));
    if (!end || Number.isNaN(end) || end < Date.now()) {
      end = Date.now() + WINDOW_MS;
      localStorage.setItem(KEY, String(end));
    }
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full bg-ink text-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2.5 text-center text-sm">
        <span className="font-medium">
          Founding launch pricing — your first tour for $47.
        </span>
        <span className="text-cream/55">Ends in</span>
        <span className="font-semibold tabular-nums tracking-wide text-[#34c4a8]">
          {remaining === null ? "—" : format(remaining)}
        </span>
      </div>
    </div>
  );
}
