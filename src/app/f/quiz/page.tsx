import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz/QuizPage";

/**
 * Internal alias for the diagnostic funnel, kept alongside the live `/tour`
 * route so existing links and the `/questions` review page don't break. Both
 * render the same component — there is no second copy to drift.
 */
export const metadata: Metadata = {
  title: "Free listing diagnostic — Tourly",
  robots: { index: false, follow: true },
};

export default function QuizAliasPage() {
  return <QuizPage />;
}
