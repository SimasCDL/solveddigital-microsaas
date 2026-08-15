"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NextListingUpsell } from "@/components/NextListingUpsell";

/**
 * The customer's tour library.
 *
 * Two jobs, and the second is the reason it exists. It gives a buyer somewhere
 * their tours live permanently, which the 7-day emailed link never did, and it
 * puts "do another listing" in front of the one person already proven to pay.
 */

interface Tour {
  id: string;
  status: "pending_payment" | "processing" | "completed" | "failed";
  createdAt: string;
  propertyAddress: string;
  photoCount: number;
  thumbnail: string | null;
  free: boolean;
  videoUrls: string[];
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 8h11m0 0L9.5 4.5M13 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Mock data for /library?demo=1. Never reachable with a real token. */
const DEMO_TOURS: Tour[] = [
  {
    id: "demo-1",
    status: "completed",
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    propertyAddress: "128 Maple Ave, Austin, TX",
    photoCount: 32,
    thumbnail: "/transform/pool.jpg",
    free: false,
    videoUrls: ["/demo/sample.mp4", "/demo/sample.mp4", "/demo/sample.mp4"],
  },
  {
    id: "demo-2",
    status: "processing",
    createdAt: new Date().toISOString(),
    propertyAddress: "9 Birchwood Close",
    photoCount: 24,
    thumbnail: "/transform/furniture.jpg",
    free: false,
    videoUrls: [],
  },
];

function RequestLink() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setBusy(true);
    try {
      await fetch("/api/my-tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* the confirmation below is deliberately the same either way */
    }
    setSent(true);
    setBusy(false);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl leading-tight text-tink sm:text-3xl">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-tink-soft">
          If {email} has tours with us, the link is on its way. It works for 30
          days.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="font-display text-2xl leading-tight text-tink sm:text-3xl">
        Your tours
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-tink-soft">
        Enter the email you bought with and we will send you a link to every
        tour you have made. No password.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@example.com"
          className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-[15px] text-tink outline-none transition-colors placeholder:text-tink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] px-7 text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] transition-all hover:brightness-[1.06] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send my link"}
          {!busy && <Arrow className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function TourCard({ tour }: { tour: Tour }) {
  const done = tour.status === "completed" && tour.videoUrls.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <div className="relative aspect-video bg-line">
        {done ? (
          <video
            src={tour.videoUrls[0]}
            poster={tour.thumbnail ?? undefined}
            controls
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            {tour.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tour.thumbnail}
                alt=""
                className="h-full w-full object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-night/70 px-3 py-1 text-xs font-medium text-white">
                {tour.status === "processing"
                  ? "Still rendering…"
                  : tour.status === "failed"
                    ? "Something went wrong"
                    : "Waiting"}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <p className="font-display text-base text-tink">
          {tour.propertyAddress || `${tour.photoCount} photos`}
        </p>
        <p className="mt-0.5 text-[13px] text-tink-soft">
          {fmtDate(tour.createdAt)}
          {tour.free && " · free preview"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={
              tour.id.startsWith("demo")
                ? "/order/demo?demo=completed"
                : `/order/${tour.id}`
            }
            className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-medium text-tink transition-colors hover:border-accent hover:text-accent"
          >
            Open
          </a>
          {done &&
            !tour.free &&
            tour.videoUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                download
                className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-medium text-tink transition-colors hover:border-accent hover:text-accent"
              >
                {i === 0
                  ? "Widescreen"
                  : i === 1
                    ? "Vertical"
                    : "Vertical crop"}
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Styles, shown locked.
 *
 * None of this is built yet, and the panel says so in plain words rather than
 * implying a plan the customer might be waiting on. What it does do is make the
 * library read as a place their tours live and keep gaining things, instead of
 * a receipt page — which is the difference between a one-time funnel and
 * something worth coming back to.
 *
 * The tiles are their OWN photo under different CSS treatments, not stock
 * mockups. Cheaper, more convincing, and it cannot misrepresent output we have
 * never produced, because it is visibly a colour treatment of a still they
 * uploaded rather than a frame of a video we are claiming to have made.
 */
const STYLES: Array<{ name: string; hint: string; css: string }> = [
  {
    name: "Cinematic",
    hint: "Slow push-ins, deeper contrast",
    css: "contrast(1.25) saturate(1.1) brightness(0.92)",
  },
  {
    name: "Bright & airy",
    hint: "The look most listing photos aim for",
    css: "brightness(1.12) saturate(0.95) contrast(0.95)",
  },
  {
    name: "Golden hour",
    hint: "Warm, late-afternoon grade",
    css: "sepia(0.35) saturate(1.35) brightness(1.05)",
  },
  {
    name: "Fast cut",
    hint: "Shorter holds, built for Reels",
    css: "contrast(1.15) saturate(1.25)",
  },
  {
    name: "Twilight",
    hint: "Cool dusk grade for exteriors",
    css: "hue-rotate(-12deg) brightness(0.85) saturate(1.2)",
  },
  {
    name: "Editorial",
    hint: "Black and white, for the hero shot",
    css: "grayscale(1) contrast(1.2)",
  },
];

function Lock({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockedStyles({ thumbnail }: { thumbnail: string | null }) {
  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-line bg-paper">
        {/* The tiles sit behind glass. Enough shows through to read as a real
            feature waiting to be switched on; not enough to browse, because
            there is nothing to browse yet. */}
        <div
          className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3"
          aria-hidden="true"
          style={{ filter: "blur(7px)", opacity: 0.55 }}
        >
          {STYLES.map((st) => (
            <div key={st.name} className="overflow-hidden rounded-2xl bg-line">
              <div className="relative aspect-video">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ filter: st.css }}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-line to-cream" />
                )}
              </div>
              <div className="px-3 py-2">
                <div className="h-2 w-2/3 rounded bg-tink/15" />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream/70 px-6 text-center backdrop-blur-[2px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-night/85 text-white">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-xl text-tink sm:text-2xl">
            Styles
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-tink-soft">
            Re-cut a tour you already have in a different look, without
            re-uploading anything.
          </p>
          <span className="mt-4 rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-tink-soft">
            Coming soon
          </span>
        </div>
      </div>

      {/* Says what it is without pretending it can be bought. Nothing here is a
          paywall: there is no version of this a customer could pay to unlock
          today, and implying otherwise would be selling something that does not
          exist. */}
      <p className="mt-3 text-center text-[13px] text-tink-soft">
        Not available yet. When it lands it will work on the tours you already
        have, at no extra cost for the ones you have paid for.
      </p>
    </section>
  );
}

type Tab = "tours" | "new" | "styles";

const TABS: Array<{ id: Tab; label: string; locked?: boolean }> = [
  { id: "tours", label: "My tours" },
  { id: "new", label: "New tour" },
  { id: "styles", label: "Styles", locked: true },
];

function Nav({
  tab,
  setTab,
  email,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  email: string;
}) {
  const [open, setOpen] = useState(false);

  const item = (t: (typeof TABS)[number], onPick: () => void) => (
    <button
      key={t.id}
      type="button"
      onClick={onPick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        tab === t.id
          ? "bg-paper text-tink shadow-sm"
          : "text-tink-soft hover:text-tink"
      }`}
    >
      {t.label}
      {t.locked && <Lock className="h-3 w-3" />}
    </button>
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 rounded-full border border-line bg-cream px-2 py-2">
        {/* Desktop: the tabs sit inline. */}
        <div className="hidden items-center gap-1 sm:flex">
          {TABS.map((t) => item(t, () => setTab(t.id)))}
        </div>

        {/* Mobile: one button, because three tabs and an email do not fit. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menu"
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-tink sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {TABS.find((t) => t.id === tab)?.label}
        </button>

        <span className="truncate px-3 text-[13px] text-tink-soft">{email}</span>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-line bg-cream p-2 sm:hidden">
          {TABS.map((t) =>
            item(t, () => {
              setTab(t.id);
              setOpen(false);
            }),
          )}
        </div>
      )}
    </div>
  );
}

/** One shell for the demo and the real thing, so they cannot drift apart. */
function Portal({ email, tours }: { email: string; tours: Tour[] }) {
  const [tab, setTab] = useState<Tab>("tours");
  const thumb = tours.find((t) => t.thumbnail)?.thumbnail ?? null;

  return (
    <>
      <Nav tab={tab} setTab={setTab} email={email} />

      {tab === "tours" &&
        (tours.length === 0 ? (
          <p className="mt-8 text-center text-sm text-tink-soft">
            Nothing here yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tours.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        ))}

      {tab === "new" && (
        <NextListingUpsell
          email={email}
          heading="Start a new tour"
          sub="Pick the pack that fits your gallery. Send the photos, and the tour comes back to your inbox."
        />
      )}

      {tab === "styles" && <LockedStyles thumbnail={thumb} />}
    </>
  );
}

function Library() {
  const params = useSearchParams();
  const token = params.get("t");
  // Design preview: /library?demo=1 renders the signed-in state with mock data,
  // no token and no backend. Mirrors the same affordance on the order page.
  const demo = params.get("demo") === "1";

  const [data, setData] = useState<{ email: string; tours: Tour[] } | null>(
    null,
  );
  const [state, setState] = useState<"loading" | "ok" | "expired">("loading");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/my-tours?t=${encodeURIComponent(token)}`);
      if (!res.ok) return setState("expired");
      setData(await res.json());
      setState("ok");
    } catch {
      setState("expired");
    }
  }, [token]);

  useEffect(() => {
    // Every setState in `load` happens after an await, so this is not the
    // synchronous cascading render the rule is written to catch — it is an
    // ordinary fetch-on-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Anything still rendering means the page is worth refreshing on its own —
  // a 30-minute render must not require the customer to know to hit reload.
  useEffect(() => {
    if (!data?.tours.some((t) => t.status === "processing")) return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [data, load]);

  if (demo) {
    return (
      <Portal email="agent@example.com" tours={DEMO_TOURS} />
    );
  }

  if (!token) return <RequestLink />;

  if (state === "loading") {
    return <p className="text-center text-sm text-tink-soft">Loading…</p>;
  }

  if (state === "expired" || !data) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl leading-tight text-tink sm:text-3xl">
          That link has expired
        </h1>
        <p className="mt-2 text-sm text-tink-soft">
          Links last 30 days. Put your email in below and we will send a fresh
          one.
        </p>
        <div className="mt-6">
          <RequestLink />
        </div>
      </div>
    );
  }

  return (
    <Portal email={data.email} tours={data.tours} />
  );
}

export default function ToursPage() {
  return (
    <div className="tourly min-h-screen bg-cream text-tink">
      <header className="px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex h-14 items-center justify-between rounded-full border border-line bg-cream/85 px-6 shadow-lg shadow-black/5 backdrop-blur-md">
            <Link
              href="/"
              className="font-display text-xl tracking-tight text-tink"
            >
              Tourly
            </Link>
            <span className="hidden text-sm text-tink-soft sm:block">
              Your library
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Suspense
          fallback={
            <p className="text-center text-sm text-tink-soft">Loading…</p>
          }
        >
          <Library />
        </Suspense>
      </main>
    </div>
  );
}
