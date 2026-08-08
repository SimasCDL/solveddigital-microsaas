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
  title: "What does a listing video actually cost? — Tourly",
  description:
    "Answer 6 quick questions and get a personalised listing plan: your marketing score, the real market rate for video, and the pack that fits your gallery.",
  robots: { index: false, follow: true },
};

export default function TourPage() {
  return <QuizPage />;
}
