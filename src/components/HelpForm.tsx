"use client";

import { useState } from "react";
import { Arrow } from "@/components/site/icons";

/**
 * Support form for /help. Posts to /api/help, which delivers to Telegram.
 *
 * It reports a delivery failure rather than showing a success state on a
 * message that never arrived. This form carries refund requests, and a false
 * "we got it" is how a refund becomes a chargeback.
 */
export function HelpForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setError("Add the email you ordered with so we can find you.");
    }
    if (message.trim().length < 3) {
      return setError("Tell us what you need and we'll sort it.");
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("idle");
        return setError(body.error ?? "That did not send. Please try again.");
      }
      setState("sent");
    } catch {
      setState("idle");
      setError(
        "That did not send. Please check your connection and try again.",
      );
    }
  };

  if (state === "sent") {
    return (
      <div className="mt-7 rounded-2xl border border-accent/30 bg-accent-soft p-5">
        <p className="text-[15px] font-bold text-ink">Got it.</p>
        <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink-soft">
          That has landed with us. We&rsquo;ll come back to you at{" "}
          <strong className="text-ink">{email}</strong>, usually the same day.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7">
      <label
        htmlFor="help-email"
        className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-soft"
      >
        Your email
      </label>
      <input
        id="help-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbrokerage.com"
        className="mt-2 h-14 w-full rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
      />

      <label
        htmlFor="help-message"
        className="mt-5 block text-[13px] font-bold uppercase tracking-[0.1em] text-ink-soft"
      >
        What do you need?
      </label>
      <textarea
        id="help-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder="A refund, a re-cut, or a question about your tour."
        className="mt-2 w-full resize-y rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] leading-[1.5] text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
      />

      <button
        type="button"
        onClick={submit}
        disabled={state === "sending"}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(15,125,107,0.6)] transition-all hover:brightness-[1.06] active:scale-[0.99] disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send it"}
        {state !== "sending" && <Arrow className="h-[18px] w-[18px]" />}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
