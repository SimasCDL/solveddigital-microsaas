"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_PHOTOS = 40;

// Customers arrive here from the funnel AFTER paying (Stripe checkout lives in
// the landing funnel). With NEXT_PUBLIC_FREE_MODE=true, submitting starts
// generation immediately via /api/fulfill — no checkout on this side. Turning
// the flag off restores this app's own Stripe checkout as a fallback.
const SKIP_CHECKOUT = process.env.NEXT_PUBLIC_FREE_MODE === "true";

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

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [email, setEmail] = useState("");
  const [dragging, setDragging] = useState(false);
  const [music, setMusic] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "uploading" | "redirecting">(
    "form",
  );
  const [maxPhotos, setMaxPhotos] = useState(MAX_PHOTOS);
  // In pay-first (FREE_MODE) the uploader must only open for a verified PAID
  // Stripe session. Non-checkout mode collects payment after upload, so it's
  // always open. "checking" avoids a flash of the form before we know.
  const [access, setAccess] = useState<"checking" | "ok" | "denied">(
    SKIP_CHECKOUT ? "checking" : "ok",
  );

  // Ask the server to verify the customer's paid Stripe session — it returns
  // how many photos their pack allows (uploader caps itself) and whether the
  // session is actually paid. The real enforcement also lives in /api/fulfill.
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get(
      "session_id",
    );
    fetch(
      `/api/pack${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d?.maxPhotos) setMaxPhotos(d.maxPhotos);
        if (SKIP_CHECKOUT) setAccess(d?.paid ? "ok" : "denied");
      })
      .catch(() => {
        if (SKIP_CHECKOUT) setAccess("denied");
      });
  }, []);

  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const valid = Array.from(selected).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFiles((prev) => [...prev, ...valid].slice(0, maxPhotos));
  };

  const removeFile = (i: number) =>
    setFiles((f) => f.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!files.length) return setError("Add your listing photos first.");
    if (!email) return setError("Add your email so we can send your tour.");
    setError("");
    setStep("uploading");
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("music", String(music));
      files.forEach((f) => formData.append("photos", f));
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed — please try again.");
      const { orderId } = await uploadRes.json();
      setStep("redirecting");

      if (SKIP_CHECKOUT) {
        // payment already happened in the funnel — the Stripe session id rides
        // along on the success-URL redirect and is verified server-side
        const sessionId = new URLSearchParams(window.location.search).get(
          "session_id",
        );
        const res = await fetch("/api/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, sessionId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || "Could not start your tour — please try again.",
          );
        }
        window.location.href = `/order/${orderId}`;
        return;
      }

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!checkoutRes.ok)
        throw new Error("Could not open checkout — please try again.");
      const { url } = await checkoutRes.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  };

  const busy = step !== "form";
  const ctaLabel = busy
    ? step === "uploading"
      ? "Uploading your photos…"
      : SKIP_CHECKOUT
        ? "Starting your tour…"
        : "Opening secure checkout…"
    : "Create my tour";

  // Verifying the paid session — brief hold to avoid flashing the form.
  if (access === "checking") {
    return (
      <div className="tourly flex h-screen items-center justify-center bg-cream text-tink-soft">
        <p className="text-sm">Verifying your purchase…</p>
      </div>
    );
  }

  // No verified purchase — send them to buy a pack instead of the uploader.
  if (access === "denied") {
    return (
      <div className="tourly flex h-screen flex-col items-center justify-center gap-5 bg-cream px-6 text-center text-tink">
        <div>
          <h1 className="font-display text-2xl leading-tight text-tink sm:text-3xl">
            No active purchase found
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-tink-soft">
            Grab a pack first — you&apos;ll land right back here to upload your
            photos.
          </p>
        </div>
        <a
          href="/#pricing"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] px-7 text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)]"
        >
          See pricing
          <Arrow className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="tourly flex h-screen flex-col overflow-hidden bg-cream text-tink">
      {/* Nav — the funnel's frosted island */}
      <header className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex h-14 items-center justify-between rounded-full border border-line bg-cream/85 px-6 shadow-lg shadow-black/5 backdrop-blur-md">
            <span className="font-display text-xl tracking-tight text-tink">
              Tourly
            </span>
            <span className="hidden text-sm text-tink-soft sm:block">
              Delivered to your inbox
            </span>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-6">
        <div className="w-full max-w-2xl">
          {/* Heading */}
          <div className="mb-4 text-center">
            <h1 className="font-display text-2xl leading-tight text-tink sm:text-3xl">
              Upload your listing photos
            </h1>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-tink-soft">
              Drop in up to {maxPhotos} photos — your cinematic tour lands in
              your inbox.
            </p>
          </div>

          {/* Upload card */}
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-xl shadow-black/5 sm:p-5">
            {/* Drop zone */}
            <div
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => !files.length && fileRef.current?.click()}
              className={`rounded-xl border border-dashed transition-colors ${
                dragging
                  ? "border-accent bg-accent-soft/40"
                  : "border-line bg-cream"
              } ${files.length ? "p-2.5" : "cursor-pointer p-7 text-center"}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {files.length === 0 ? (
                <>
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M4 19h16"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="font-display text-base text-tink">
                    Drop your photos here
                  </p>
                  <p className="mt-0.5 text-sm text-tink-soft">
                    or click to browse — JPG or PNG, up to {maxPhotos}
                  </p>
                </>
              ) : (
                <div className="grid max-h-[34vh] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-8">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-night/60 text-[11px] leading-none text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {files.length < maxPhotos && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-line text-lg text-tink-soft transition-colors hover:border-accent hover:text-accent"
                    >
                      +
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Music + email row */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="eyebrow mb-1.5 block text-tink-soft">
                  Soundtrack
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-cream p-1">
                  <button
                    type="button"
                    onClick={() => setMusic(true)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      music
                        ? "bg-paper text-tink shadow-sm"
                        : "text-tink-soft hover:text-tink"
                    }`}
                  >
                    🎵 Music
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusic(false)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      !music
                        ? "bg-paper text-tink shadow-sm"
                        : "text-tink-soft hover:text-tink"
                    }`}
                  >
                    No music
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="eyebrow mb-1.5 block text-tink-soft"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-line bg-paper px-4 text-[15px] text-tink outline-none transition-colors placeholder:text-tink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {/* CTA — the funnel's shiny accent button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="group mt-4 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] px-7 py-3.5 text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] ring-1 ring-white/10 transition-all hover:brightness-[1.06] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{ctaLabel}</span>
              {!busy && (
                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>

            <p className="mt-3 text-center text-[13px] text-tink-soft">
              Widescreen + 2 vertical cuts · Ready in ~15 minutes
            </p>
          </div>

          {/* Compact trust line replaces the tall 3-step section */}
          <p className="mt-4 text-center text-[13px] text-tink-soft">
            Upload → we film your tour → delivered to your inbox. No editing, no
            software.
          </p>
        </div>
      </main>
    </div>
  );
}
