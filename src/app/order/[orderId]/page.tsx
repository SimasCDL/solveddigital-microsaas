"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { trackLeadOnce, trackStartTrialOnce } from "@/components/MetaPixel";
import { FullTourUpsell } from "@/components/FullTourUpsell";
import { NextListingUpsell } from "@/components/NextListingUpsell";

type Status = "pending_payment" | "processing" | "completed" | "failed";

interface StatusData {
  status: Status;
  expired?: boolean;
  videoUrls: string[];
  propertyAddress: string;
  photoCount: number;
  /** True while this is an unpaid free preview rather than a paid order. */
  free?: boolean;
  /** How many of their photos the free preview was built from. */
  previewCount?: number;
  /** One of their uploaded photos — shown blurred/locked while generating. */
  previewPhoto?: string;
}

const POLL_INTERVAL = 8000;

// Design preview: visit /order/demo?demo=<state> to render a state with mock
// data, no backend needed. Remove before shipping if you don't want it live.
const DEMO_SAMPLE = "/demo/sample.mp4";
const DEMO_STATES: Record<string, StatusData> = {
  processing: {
    status: "processing",
    videoUrls: [],
    propertyAddress: "128 Maple Ave, Austin, TX",
    photoCount: 24,
    previewPhoto: "/transform/pool.jpg",
  },
  // Free 2-photo trial while generating — /order/demo?demo=processing-free
  "processing-free": {
    status: "processing",
    free: true,
    videoUrls: [],
    propertyAddress: "",
    photoCount: 2,
    previewPhoto: "/transform/furniture.jpg",
  },
  completed: {
    status: "completed",
    videoUrls: [DEMO_SAMPLE, DEMO_SAMPLE, DEMO_SAMPLE],
    propertyAddress: "128 Maple Ave, Austin, TX",
    photoCount: 24,
  },
  // Finished free preview — watch-only + unlock offer. /order/demo?demo=free
  free: {
    status: "completed",
    free: true,
    videoUrls: [DEMO_SAMPLE, DEMO_SAMPLE, DEMO_SAMPLE],
    propertyAddress: "",
    photoCount: 24,
    previewCount: 3,
  },
  expired: {
    status: "completed",
    expired: true,
    videoUrls: [],
    propertyAddress: "",
    photoCount: 24,
  },
  failed: {
    status: "failed",
    videoUrls: [],
    propertyAddress: "",
    photoCount: 24,
  },
};

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("success") === "1";
  const demo = searchParams.get("demo");

  // Demo states come straight from the URL, so they are initial state rather
  // than something an effect assigns after the first paint.
  const [data, setData] = useState<StatusData | null>(
    demo ? (DEMO_STATES[demo] ?? DEMO_STATES.processing) : null,
  );
  const [error, setError] = useState("");
  // Seconds on the "creating your tour" screen — drives the live progress bar
  // and step, so the wait feels like something is happening (not a dead spinner).
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (demo) return;

    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/status?orderId=${orderId}`);
        if (!res.ok) throw new Error("Order not found");
        const json: StatusData = await res.json();
        setData(json);

        // Reaching this page in processing/completed means the Stripe payment
        // was verified in /api/fulfill — count it as a converted Lead in Meta,
        // once per order. Free trials report StartTrial instead so they never
        // dilute the Lead signal the paid campaigns optimize on.
        if (json.status === "processing" || json.status === "completed") {
          if (json.free) trackStartTrialOnce(orderId);
          else trackLeadOnce(orderId);
        }

        if (json.status !== "processing" && json.status !== "pending_payment")
          return;
        timer = setTimeout(poll, POLL_INTERVAL);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      }
    };

    poll();
    return () => clearTimeout(timer);
  }, [orderId, demo]);

  // Tick the elapsed counter once a second while the video is generating.
  useEffect(() => {
    if (data?.status !== "processing") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [data?.status]);

  // Progress model for the generating screen. No real server ETA, so we ease a
  // bar toward (but never reaching) 100% over the expected duration, and walk a
  // set of reassuring step labels alongside it.
  const expectedSec = data?.free ? 300 : 1800;
  const progressPct = Math.min(96, Math.round((elapsed / expectedSec) * 100));
  const steps = [
    "Analyzing your photos",
    "Directing the camera moves",
    "Rendering your video",
    "Adding the final polish",
  ];
  const stepIndex = Math.min(
    steps.length - 1,
    Math.floor(elapsed / (expectedSec / steps.length)),
  );
  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="tourly min-h-screen bg-cream text-tink">
      <header className="sticky top-3 z-50 sm:top-4">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-center rounded-full border border-line bg-cream/85 px-6 shadow-lg shadow-black/5 backdrop-blur-md">
            <span className="font-display text-xl tracking-tight text-tink">
              Tourly
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[82vh] w-full max-w-3xl flex-col justify-center px-4 pb-16 pt-8 sm:px-6">
        {error ? (
          <div className="text-center">
            <h1 className="font-display text-3xl text-tink">
              Something went wrong
            </h1>
            <p className="mt-3 text-tink-soft">{error}</p>
          </div>
        ) : !data ? (
          <div className="text-center">
            <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-tink-soft">Loading your order…</p>
          </div>
        ) : data.status === "completed" && data.expired ? (
          <div className="text-center">
            <h1 className="font-display text-3xl text-tink">
              This link has expired
            </h1>
            <p className="mx-auto mt-3 max-w-md text-tink-soft">
              This page&apos;s links last 7 days. Your tour itself did not go
              anywhere - open your library and it is still there.
            </p>
            <a
              href="/library"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] px-7 text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)]"
            >
              Open my library
            </a>
            <p className="mt-6 text-[13px] text-tink-soft/80">
              Order #{orderId}
            </p>
          </div>
        ) : data.status === "completed" ? (
          <div>
            <div className="mb-8 text-center">
              <span className="eyebrow inline-block rounded-full bg-accent-soft px-4 py-2 text-accent">
                {data.free ? "Free preview" : "Ready to post"}
              </span>
              <h1 className="font-display mt-5 text-4xl text-tink sm:text-5xl">
                {data.free ? "Here's your preview" : "Your tour is ready"}
              </h1>
              {data.propertyAddress && (
                <p className="mt-3 text-tink-soft">{data.propertyAddress}</p>
              )}
            </div>

            <div className="rounded-3xl border border-line bg-paper p-4 shadow-xl shadow-black/5 sm:p-6">
              <video
                controls
                controlsList={data.free ? "nodownload" : undefined}
                src={data.videoUrls[0]}
                className="aspect-video w-full rounded-2xl bg-night"
              />
              {/* Downloads are the thing being paid for — a free preview is
                  watch-only until the order is unlocked. */}
              {data.free ? (
                <p className="mt-5 text-center text-sm text-tink-soft">
                  Downloads unlock with the full tour ↓
                </p>
              ) : (
                <a
                  href={data.videoUrls[0]}
                  download="tourly-widescreen.mp4"
                  className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] ring-1 ring-white/10 transition-all hover:brightness-[1.06] active:scale-[0.99]"
                >
                  Download widescreen (16:9)
                </a>
              )}

              {!data.free && data.videoUrls.length > 1 && (
                <div className="mt-8">
                  <p className="eyebrow mb-3 text-tink-soft">
                    Vertical versions - for Reels & TikTok
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      {
                        label: "Vertical (9:16)",
                        hint: "Full frame",
                        file: "tourly-vertical.mp4",
                      },
                      {
                        label: "Vertical full-screen",
                        hint: "Fills the screen",
                        file: "tourly-vertical-fullscreen.mp4",
                      },
                    ].map((f, i) =>
                      data.videoUrls[i + 1] ? (
                        <a
                          key={i}
                          href={data.videoUrls[i + 1]}
                          download={f.file}
                          className="flex flex-col rounded-xl border border-line px-4 py-3 transition-colors hover:border-accent"
                        >
                          <span className="text-sm font-medium text-tink">
                            {f.label}
                          </span>
                          <span className="text-[13px] text-tink-soft">
                            {f.hint}
                          </span>
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>

            {data.free ? (
              <FullTourUpsell
                orderId={orderId}
                photoCount={data.photoCount}
                previewCount={data.previewCount ?? 3}
              />
            ) : (
              // Paid and finished: the one moment they have seen the product
              // work. Nothing to unlock, so the only honest next step is the
              // next listing.
              <NextListingUpsell />
            )}

            <p className="mt-6 text-center text-[13px] text-tink-soft">
              {data.free
                ? `Order #${orderId}`
                : `We also sent these links to your email · Order #${orderId}`}
            </p>

            {!data.free && (
              <p className="mt-2 text-center text-[13px] text-tink-soft">
                Every tour you make lives in{" "}
                <a href="/library" className="text-accent underline">
                  your library
                </a>
                , after these links expire.
              </p>
            )}
          </div>
        ) : data.status === "failed" ? (
          <div className="text-center">
            <h1 className="font-display text-3xl text-tink">
              Generation failed
            </h1>
            <p className="mx-auto mt-3 max-w-md text-tink-soft">
              We&apos;ve been notified and we&apos;ll make it right - check your
              email for details.
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md text-center">
            {justPaid && (
              <div className="mx-auto mb-8 inline-block rounded-full border border-accent/25 bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent">
                ✓ Payment confirmed - filming your tour now
              </div>
            )}
            <h1 className="font-display text-3xl text-tink sm:text-4xl">
              Creating your tour
            </h1>
            {data.propertyAddress && (
              <p className="mt-3 text-tink-soft">{data.propertyAddress}</p>
            )}

            {/* Locked preview — their own photo, blurred, behind a play/lock
                badge. Makes the wait feel like a real video is being built for
                them, not a blank screen. Falls back to a brand gradient. */}
            <div className="relative mx-auto mt-8 aspect-video w-full overflow-hidden rounded-2xl bg-night ring-1 ring-black/5">
              {data.previewPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.previewPhoto}
                  alt=""
                  className="h-full w-full scale-110 object-cover blur-md brightness-[0.6]"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "linear-gradient(135deg,#0e7d6b 0%,#13a48c 55%,#0b6659 100%)",
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-night/55 to-night/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-md">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-0.5 h-6 w-6 text-white/90"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-night text-white ring-2 ring-white/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <rect x="4" y="10" width="16" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 animate-pulse whitespace-nowrap rounded-full bg-night/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                Locked · rendering your tour…
              </div>
            </div>

            {/* Live progress bar — eases toward completion over the ETA */}
            <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#13a48c] to-[#0e7d6b] transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(4, progressPct)}%` }}
              />
            </div>

            {/* Current step */}
            <div className="mt-5 flex items-center justify-center gap-2 text-[15px] font-medium text-tink">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              {steps[stepIndex]}…
            </div>
            <p className="mt-2 text-sm text-tink-soft">
              {elapsedLabel} elapsed ·{" "}
              {data.free ? "usually under 5 minutes" : "usually 15–30 minutes"}
            </p>

            <p className="mt-8 text-[13px] text-tink-soft/80">
              This page updates on its own · we&apos;ll email you the moment
              it&apos;s ready, so you can safely close this tab.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
