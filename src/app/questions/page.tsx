import type { Metadata } from "next";
import { QuizFunnel } from "@/components/quiz/QuizFunnel";
import { visibleSteps } from "@/lib/quiz";

/**
 * Internal review page — every screen of the /f/quiz funnel side by side.
 *
 * Each frame is a live funnel mounted at one screen, not a mockup, so what you
 * see here is exactly what ships. They're interactive: tap through any frame to
 * check a path without restarting the whole quiz.
 */
export const metadata: Metadata = {
  title: "Quiz funnel — every screen",
  robots: { index: false, follow: false },
};

/** A representative run: photos-only agent, mid volume, standard gallery. */
const SAMPLE = {
  pain: "cost",
  who: "agent",
  volume: "v3",
  today: "photos",
  photos: "p20",
};

function Frame({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2.5">
        <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        {note && (
          <p className="mt-0.5 text-[12px] leading-[1.45] text-slate-500">
            {note}
          </p>
        )}
      </div>
      {/* Phone-width viewport with its own scroll — matches the real funnel's
          max-w-[440px] container. */}
      <div className="h-[720px] w-full overflow-y-auto rounded-[20px] border border-slate-300 bg-cream shadow-sm">
        <div className="tourly text-ink">{children}</div>
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  // The agent path — the branch that shows every step, including volume.
  const STEPS = visibleSteps(SAMPLE);

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Internal review
          </p>
          <h1 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900">
            Quiz funnel — every screen
          </h1>
          <p className="mt-2.5 max-w-2xl text-[15px] leading-[1.55] text-slate-600">
            The live{" "}
            <a
              href="/f/quiz"
              className="font-semibold text-slate-900 underline underline-offset-2"
            >
              /f/quiz
            </a>{" "}
            funnel, mounted one screen per frame. These are real components, not
            mockups — every frame is interactive, so you can tap through a path
            in place. Sample run: agent, 4–8 listings a month, photos only,
            15–25 photo galleries.
          </p>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <Frame
            label="1 · Intro"
            note="Diagnostic framing, not a pitch. Promises the deliverable and kills the signup objection up front."
          >
            <QuizFunnel initial={{ phase: "intro" }} />
          </Frame>

          {STEPS.map((s, i) => (
            <Frame
              key={s.id}
              label={`${i + 2} · Step ${i + 1} — ${
                s.kind === "lesson" ? "interstitial" : "question"
              }`}
              note={
                s.kind === "lesson"
                  ? "Not a question. Teaching that pays out: an attributed finding plus one thing they can use tonight without buying anything."
                  : undefined
              }
            >
              <QuizFunnel
                initial={{ phase: "steps", index: i, answers: SAMPLE }}
              />
            </Frame>
          ))}

          <Frame
            label={`${STEPS.length + 2} · Email gate`}
            note="Arrives at maximum sunk cost — seven answers in. Framed as a copy for your inbox, not a toll."
          >
            <QuizFunnel initial={{ phase: "email", answers: SAMPLE }} />
          </Frame>

          <Frame
            label={`${STEPS.length + 3} · Analyzing`}
            note="A short beat so the result feels computed rather than looked up."
          >
            <QuizFunnel initial={{ phase: "analyzing", answers: SAMPLE }} />
          </Frame>

          <Frame
            label={`${STEPS.length + 4} · Result + checkout`}
            note="The only screen that names the product. Score, the per-property comparison, then the offer with the countdown."
          >
            <QuizFunnel
              initial={{
                phase: "result",
                answers: SAMPLE,
                email: "agent@example.com",
              }}
            />
          </Frame>
        </div>

        <footer className="mt-10 rounded-2xl border border-slate-300 bg-white p-6">
          <h2 className="text-[15px] font-bold text-slate-900">
            Colour decisions on show here
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-[14px] leading-[1.5] text-slate-600">
            <li>
              <strong className="text-slate-900">Teal is spent once.</strong>{" "}
              Answer options stay neutral so the one action that moves money
              keeps its isolation. A page where everything is teal has no
              primary action.
            </li>
            <li>
              <strong className="text-slate-900">
                Red appears only on urgency.
              </strong>{" "}
              The countdown and save badge are the only warm elements, so they
              isolate without competing with the buy button.
            </li>
            <li>
              <strong className="text-slate-900">Cream, not navy.</strong> Warm
              neutral reads as &ldquo;home&rdquo;; indigo reads fintech.
              Category congruence beats borrowed styling.
            </li>
            <li>
              <strong className="text-slate-900">No chrome.</strong> No nav,
              promo bar or footer — once the quiz starts, every link that
              isn&apos;t the next step is a way out.
            </li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
