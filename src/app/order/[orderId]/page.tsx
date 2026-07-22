"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Status = "pending_payment" | "processing" | "completed" | "failed";

interface StatusData {
  status: Status;
  expired?: boolean;
  videoUrls: string[];
  propertyAddress: string;
  photoCount: number;
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
  },
  completed: {
    status: "completed",
    videoUrls: [DEMO_SAMPLE, DEMO_SAMPLE, DEMO_SAMPLE],
    propertyAddress: "128 Maple Ave, Austin, TX",
    photoCount: 24,
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

  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (demo) {
      setData(DEMO_STATES[demo] ?? DEMO_STATES.processing);
      return;
    }

    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/status?orderId=${orderId}`);
        if (!res.ok) throw new Error("Order not found");
        const json: StatusData = await res.json();
        setData(json);

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
              Video links are available for 7 days after delivery. If you still
              need your tour, reply to your delivery email and we&apos;ll help
              you out.
            </p>
            <p className="mt-6 text-[13px] text-tink-soft/80">
              Order #{orderId}
            </p>
          </div>
        ) : data.status === "completed" ? (
          <div>
            <div className="mb-8 text-center">
              <span className="eyebrow inline-block rounded-full bg-accent-soft px-4 py-2 text-accent">
                Ready to post
              </span>
              <h1 className="font-display mt-5 text-4xl text-tink sm:text-5xl">
                Your tour is ready
              </h1>
              {data.propertyAddress && (
                <p className="mt-3 text-tink-soft">{data.propertyAddress}</p>
              )}
            </div>

            <div className="rounded-3xl border border-line bg-paper p-4 shadow-xl shadow-black/5 sm:p-6">
              <video
                controls
                src={data.videoUrls[0]}
                className="aspect-video w-full rounded-2xl bg-night"
              />
              <a
                href={data.videoUrls[0]}
                download="tourly-widescreen.mp4"
                className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] ring-1 ring-white/10 transition-all hover:brightness-[1.06] active:scale-[0.99]"
              >
                Download widescreen (16:9)
              </a>

              {data.videoUrls.length > 1 && (
                <div className="mt-8">
                  <p className="eyebrow mb-3 text-tink-soft">
                    Vertical versions — for Reels & TikTok
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

            <p className="mt-6 text-center text-[13px] text-tink-soft">
              We also sent these links to your email · Order #{orderId}
            </p>
          </div>
        ) : data.status === "failed" ? (
          <div className="text-center">
            <h1 className="font-display text-3xl text-tink">
              Generation failed
            </h1>
            <p className="mx-auto mt-3 max-w-md text-tink-soft">
              We&apos;ve been notified and we&apos;ll make it right — check your
              email for details.
            </p>
          </div>
        ) : (
          <div className="text-center">
            {justPaid && (
              <div className="mx-auto mb-8 inline-block rounded-full border border-accent/25 bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent">
                ✓ Payment confirmed — filming your tour now
              </div>
            )}
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <h1 className="font-display text-3xl text-tink sm:text-4xl">
              Creating your tour
            </h1>
            <p className="mt-3 text-tink-soft">{data.propertyAddress}</p>
            <p className="mt-1.5 text-sm text-tink-soft">
              {`Turning ${data.photoCount} photo${data.photoCount !== 1 ? "s" : ""} into your video — usually ready in 15–30 minutes`}
            </p>
            <p className="mt-8 text-[13px] text-tink-soft/80">
              This page updates automatically · We&apos;ll also email you when
              it&apos;s done
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
