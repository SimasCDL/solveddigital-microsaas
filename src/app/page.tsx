import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz/QuizPage";

/**
 * The front door is now the diagnostic funnel.
 *
 * It used to be the marketing landing (`FunnelPage` + `FUNNELS.main`), which is
 * still built and still served at /f/direct and /f/quick — nothing was deleted,
 * so reverting is a one-line change back to `<FunnelPage funnel={FUNNELS.main} />`.
 *
 * This page is the indexable one. `/tour` renders the same funnel and stays
 * noindex, so the two cannot compete for the same keywords: ads keep pointing at
 * /tour by link, search lands here.
 */
export const metadata: Metadata = {
  title: "How to market your listings in today's market — Tourly",
  description:
    "A free 2-minute diagnostic for agents: your listing marketing score, the one gap costing you the most, and what the agents winning listings are doing differently.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <QuizPage />;
}
