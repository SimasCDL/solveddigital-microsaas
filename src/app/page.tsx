import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz/QuizPage";

/**
 * The front door is the direct-buy funnel: intro -> packs -> Stripe.
 *
 * It was the diagnostic quiz until the questions, the email gate and the score
 * were taken out of the path. Those screens still exist in `QuizFunnel` and are
 * still reviewable at /questions - putting them back is a one-line change to
 * the intro's `onStart`. Before that it was the marketing landing (`FunnelPage`
 * + `FUNNELS.main`), still served at /f/direct and /f/quick.
 *
 * This page is the indexable one. `/tour` renders the same funnel and stays
 * noindex, so the two cannot compete for the same keywords: ads keep pointing at
 * /tour by link, search lands here.
 */
export const metadata: Metadata = {
  title: "Listing video tours from your photos - Tourly",
  description:
    "Upload the photo gallery you already have and get a listing video tour back in minutes, fully automated: a vertical cut for Reels and TikTok, a horizontal one for the MLS, licensed music on both.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <QuizPage />;
}
