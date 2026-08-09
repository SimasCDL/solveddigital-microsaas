import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz/QuizPage";

/**
 * The live diagnostic funnel — the destination for paid traffic.
 *
 * Kept out of the index: it sells the same product as `/` to the same keywords,
 * so letting both compete would split the landing page's ranking for no gain.
 * Ad traffic arrives by link, not by search. `follow` stays on so the links out
 * of it are still crawled.
 */
export const metadata: Metadata = {
  title: "How to market your listings in today's market — Tourly",
  description:
    "A free 2-minute diagnostic for agents: your listing marketing score, the one gap costing you the most, and what the agents winning listings are doing differently.",
  robots: { index: false, follow: true },
};

export default function TourPage() {
  return <QuizPage />;
}
