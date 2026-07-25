"use client";

import { useMemo, useRef, useState } from "react";

/** A taste, not a deliverable — 2 photos is ~6 seconds of video. */
const FREE_PHOTOS = 2;

type Segment = "agent" | "homeowner";

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

export default function FreeTrialPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState<Segment | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const valid = Array.from(selected).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...valid].slice(0, FREE_PHOTOS));
  };

  const removeFile = (i: number) =>
    setFiles((f) => f.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!files.length) return setError("Add a photo or two first.");
    if (!segment) return setError("Let us know which one you are.");
    if (!email) return setError("Add your email so we can send your tour.");
    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("email", email);
      body.append("segment", segment);
      files.forEach((f) => body.append("photos", f));

      const res = await fetch("/api/free", { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Something went wrong — please try again.");
      }
      window.location.href = `/order/${json.orderId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="tourly min-h-screen bg-cream text-tink">
      <header className="px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex h-14 items-center justify-between rounded-full border border-line bg-cream/85 px-6 shadow-lg shadow-black/5 backdrop-blur-md">
            <a href="/" className="font-display text-xl tracking-tight text-tink">
              Tourly
            </a>
            <span className="hidden text-sm text-tink-soft sm:block">
              No card needed
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 text-center">
          <span className="eyebrow inline-block rounded-full bg-accent-soft px-4 py-2 text-accent">
            Free sample · no card
          </span>
          <h1 className="font-display mt-4 text-3xl leading-tight text-tink sm:text-4xl">
            See it on your own listing
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-[15px] text-tink-soft">
            Drop in 2 photos and we&apos;ll film a real cinematic clip from them
            — free, in a few minutes. No card, no catch.
          </p>
        </div>

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
              dragging ? "border-accent bg-accent-soft/40" : "border-line bg-cream"
            } ${files.length ? "p-3" : "cursor-pointer p-8 text-center"}`}
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
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
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
                  Drop 2 photos here
                </p>
                <p className="mt-0.5 text-sm text-tink-soft">
                  or click to browse — your best 2 rooms work great
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
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
                {files.length < FREE_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-lg text-tink-soft transition-colors hover:border-accent hover:text-accent"
                  >
                    +
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Who are you — segments the lead and tailors the follow-up */}
          <div className="mt-4">
            <label className="eyebrow mb-1.5 block text-tink-soft">
              Which one are you?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "agent", label: "Real estate agent", hint: "I list properties" },
                  { id: "homeowner", label: "Selling my own home", hint: "Just my place" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSegment(o.id)}
                  className={`flex flex-col rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    segment === o.id
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-cream hover:border-accent/40"
                  }`}
                >
                  <span className="text-sm font-semibold text-tink">{o.label}</span>
                  <span className="text-[12.5px] text-tink-soft">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="email" className="eyebrow mb-1.5 block text-tink-soft">
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

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="group mt-4 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] px-7 py-3.5 text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] ring-1 ring-white/10 transition-all hover:brightness-[1.06] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{busy ? "Filming your clip…" : "Make my free clip"}</span>
            {!busy && (
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>

          <p className="mt-3 text-center text-[13px] text-tink-soft">
            One free clip per person · No card required
          </p>
        </div>

        <p className="mt-5 text-center text-[13px] text-tink-soft">
          Want the whole listing?{" "}
          <a href="/#buy" className="font-semibold text-accent underline">
            See the full packs
          </a>
        </p>
      </main>
    </div>
  );
}
