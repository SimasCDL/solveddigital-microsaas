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
            href={`/order/${tour.id}`}
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

/** Signposted, not sold. Nothing here can be bought yet, so nothing claims it can. */
function ComingSoon() {
  return (
    <section className="mt-10 rounded-2xl border border-dashed border-line bg-cream p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line/60 text-tink-soft">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
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
        </div>
        <div>
          <p className="font-display text-base text-tink">Styles and effects</p>
          <p className="mt-0.5 max-w-lg text-[13px] text-tink-soft">
            Re-cut the same listing in a different look, pace or soundtrack,
            without re-uploading anything. We are building it. Nothing to do
            yet, it will show up here for tours you already have.
          </p>
        </div>
      </div>
    </section>
  );
}

function Library() {
  const params = useSearchParams();
  const token = params.get("t");

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
    <>
      <div className="text-center">
        <h1 className="font-display text-2xl leading-tight text-tink sm:text-3xl">
          Your tours
        </h1>
        <p className="mt-1.5 text-sm text-tink-soft">{data.email}</p>
      </div>

      {data.tours.length === 0 ? (
        <p className="mt-8 text-center text-sm text-tink-soft">
          Nothing here yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {data.tours.map((t) => (
            <TourCard key={t.id} tour={t} />
          ))}
        </div>
      )}

      <NextListingUpsell email={data.email} />
      <ComingSoon />
    </>
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
