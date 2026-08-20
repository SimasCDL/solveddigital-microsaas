import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz/QuizPage";

/**
 * The live diagnostic funnel — the destination for paid traffic.
 *
 * Same funnel as `/`, kept as the ad destination so existing creatives and any
 * links already in the wild keep working. It stays out of the index precisely
 * because it is now a duplicate of the homepage — letting both compete would
 * split the ranking for no gain. Ad traffic arrives by link, not by search, and
 * `canonical` points search engines at `/`.
 */
export const metadata: Metadata = {
  title: "How to market your listings in today's market - Tourly",
  description:
    "A free 2-minute diagnostic for agents: your listing marketing score, the one gap costing you the most, and what the agents winning listings are doing differently.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};

export default function TourPage() {
  return <QuizPage />;
}
