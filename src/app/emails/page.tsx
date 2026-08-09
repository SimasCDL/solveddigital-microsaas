import type { Metadata } from "next";
import { renderHtml, renderText } from "@/lib/emailBlocks";
import {
  SEQUENCE,
  STEP_DUE_MINUTES,
  PROMO_STEPS,
  buildContext,
  previewPromo,
} from "@/lib/nurture";
import type { Answers } from "@/lib/quiz";

/**
 * Internal review page — every email in the nurture sequence, rendered.
 *
 * Each frame is the real `renderHtml` output in an iframe, not a mockup, so
 * what you read here is byte-identical to what Resend will deliver. The plain
 * text alternative is under each one, because that is the copy a good half of
 * recipients' clients will actually show and it is the part that silently rots.
 */
export const metadata: Metadata = {
  title: "Nurture sequence — every email",
  robots: { index: false, follow: false },
};

/** The two branches worth reviewing: the agent path and the single-property
 *  path, which change roughly half the sentences in the sequence. */
const PERSONAS: Record<
  string,
  { label: string; note: string; answers: Answers }
> = {
  agent: {
    label: "Agent, 4 to 8 listings a month",
    note: "The multi-listing branch: annual figures, ladder copy, pitch angle.",
    answers: {
      pain: "cost",
      who: "agent",
      volume: "v3",
      today: "photos",
      photos: "p20",
      goal: "listings",
    },
  },
  homeowner: {
    label: "Selling their own home",
    note: "The single-property branch: no volume question, per-property figures.",
    answers: {
      pain: "slow",
      who: "homeowner",
      today: "phone",
      photos: "p35",
      goal: "faster",
    },
  },
};

function timing(step: number): string {
  const mins = STEP_DUE_MINUTES[step];
  if (!mins) return "";
  if (mins < 60) return `${mins} minutes after they submit`;
  const days = Math.round(mins / (60 * 24));
  return days === 1 ? "1 day later" : `Day ${days}`;
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const key = p && p in PERSONAS ? p : "agent";
  const persona = PERSONAS[key];

  // A promo that is genuinely live, so steps 4 and 5 render their real
  // discounted state rather than the degraded no-coupon fallback.
  const promo = previewPromo();

  // Mirror production exactly: only the promo steps carry the code, in the copy
  // and in the checkout link alike. Building one shared context would show a
  // discount on steps that will not have one when this actually sends.
  const ctxFor = (step: number) =>
    buildContext({
      email: key === "agent" ? "agent@brokerage.com" : "seller@example.com",
      answers: persona.answers,
      unsubToken: "preview-token",
      promo: PROMO_STEPS.includes(step) ? promo : null,
    });

  const emails = SEQUENCE.map((def) => {
    const ctx = ctxFor(def.step);
    const blocks = def.blocks(ctx);
    const reason = def.reason ?? "";
    return {
      step: def.step,
      subject: def.subject(ctx),
      preheader: def.preheader(ctx),
      skipped: def.skipIf?.(ctx) ?? false,
      html: renderHtml({
        blocks,
        preheader: def.preheader(ctx),
        unsubUrl: ctx.unsubUrl,
        reason,
      }),
      text: renderText({ blocks, unsubUrl: ctx.unsubUrl, reason }),
    };
  });

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-10 sm:px-8">
      {/*
        The same emails in machine-readable form.
        `scripts/build-email-preview.mjs` reads this to compose the standalone
        inbox simulator, so the exported file is generated from the rendered
        output rather than from a second copy of the copy. Scraping the iframe
        attributes instead would break the moment the markup changed.
      */}
      <script
        type="application/json"
        id="email-data"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            persona: { id: key, ...persona },
            emails: emails.map((e) => ({
              step: e.step,
              subject: e.subject,
              preheader: e.preheader,
              skipped: e.skipped,
              dueMinutes: STEP_DUE_MINUTES[e.step],
              html: e.html,
              text: e.text,
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Internal review
          </p>
          <h1 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900">
            Nurture sequence — every email
          </h1>
          <p className="mt-2.5 max-w-3xl text-[15px] leading-[1.55] text-slate-600">
            Eleven emails over 50 days, sent to anyone who leaves an address on
            the quiz and stops when they buy or unsubscribe. These frames are
            the real rendered output, so what you read is what gets delivered.
            Every figure is derived from that person&rsquo;s own answers.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(PERSONAS).map(([id, v]) => (
              <a
                key={id}
                href={`/emails?p=${id}`}
                className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                  id === key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {v.label}
              </a>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] text-slate-500">{persona.note}</p>
        </header>

        <div className="grid gap-7 lg:grid-cols-2 2xl:grid-cols-3">
          {emails.map((e) => (
            <div key={e.step} className="flex flex-col">
              <div className="mb-2.5">
                <div className="flex items-baseline gap-2.5">
                  <span className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
                    {e.step}
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">
                    {timing(e.step)}
                  </span>
                  {e.skipped && (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                      skipped without a live code
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[14px] font-semibold leading-snug text-slate-900">
                  {e.subject}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">
                  {e.preheader}
                </p>
              </div>

              <iframe
                title={`Email ${e.step}`}
                srcDoc={e.html}
                className="h-[640px] w-full rounded-2xl border border-slate-300 bg-white shadow-sm"
              />

              <details className="mt-2">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-slate-600">
                  Plain-text version
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-300 bg-white p-3.5 text-[12px] leading-[1.5] text-slate-700">
                  {e.text}
                </pre>
              </details>
            </div>
          ))}
        </div>

        <footer className="mt-10 rounded-2xl border border-slate-300 bg-white p-6">
          <h2 className="text-[15px] font-bold text-slate-900">
            How it actually runs
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-[14px] leading-[1.55] text-slate-600">
            <li>
              <strong className="text-slate-900">
                Email 1 is scheduled, not cronned.
              </strong>{" "}
              Vercel&rsquo;s Hobby plan only allows daily crons, so the
              25-minute email is handed to Resend&rsquo;s scheduler at capture
              and its id is stored. Buying cancels it mid-flight.
            </li>
            <li>
              <strong className="text-slate-900">
                Everything else re-checks at send time.
              </strong>{" "}
              The daily cron confirms the lead has not bought or unsubscribed in
              the moment before sending, so a customer never receives a
              &ldquo;you have not bought yet&rdquo; email.
            </li>
            <li>
              <strong className="text-slate-900">
                The discount exists only on steps 4 and 5.
              </strong>{" "}
              After that the code is dropped from the copy and from the checkout
              link, so &ldquo;the last time I mention it&rdquo; describes what
              the software does rather than what the sentence claims.
            </li>
            <li>
              <strong className="text-slate-900">
                Nothing promises a reply.
              </strong>{" "}
              There is no monitored inbox, so every offer of help and the refund
              guarantee point at <code>/help</code>, which delivers to Telegram.
              The copy adapts to the code too: a shared code never claims a
              personal expiry it cannot enforce.
            </li>
            <li>
              <strong className="text-slate-900">
                One unsubscribe, permanent.
              </strong>{" "}
              Every send carries List-Unsubscribe headers for the one-click
              button in Gmail, and an unsubscribed lead is never resurrected,
              even if they run the quiz again.
            </li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
