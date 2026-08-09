/**
 * Third-party figures used in the funnel.
 *
 * ONE file, on purpose. The funnel now teaches before it sells, and a teaching
 * funnel lives or dies on whether an agent believes the numbers in it. Every
 * external claim on any screen has to come from here, carrying its own
 * attribution, so a figure can never appear on a page without a source next to
 * it and can never be edited in two places into disagreeing with itself.
 *
 * Standing rule, unchanged: nothing here may be invented. If a figure cannot be
 * attributed to a named organisation, it does not go on a screen.
 *
 * `confidence` is a note to us, never rendered:
 *   "cited"   — attributed to NAR consistently across the industry, but read by
 *               us in secondary sources rather than the primary report. Fine to
 *               publish with attribution; swap in the primary when we have it.
 *   "primary" — we have read it in the original publication.
 */

export interface ProofPoint {
  id: string;
  /** The figure itself, rendered large. Keep it short. */
  stat: string;
  /** What the figure says, in the agent's language. One sentence, no pitch. */
  claim: string;
  /** Rendered as the citation line. Must name the organisation. */
  source: string;
  confidence: "primary" | "cited";
}

/**
 * The load-bearing one. It is the whole repositioning in a single sentence:
 * marketing is not a cost the agent absorbs, it is a thing sellers are already
 * grading them on. Note it is about winning listings, not about video quality —
 * which is why it can sit on a screen long before the product is mentioned.
 */
export const SELLERS_EXPECT: ProofPoint = {
  id: "sellers_expect",
  stat: "73%",
  claim:
    "of sellers say they are more likely to hire an agent who markets with video.",
  source: "National Association of REALTORS®",
  confidence: "cited",
};

/**
 * The other half of the gap. Held separately because it is the weaker of the
 * two: the adoption figure circulates widely at "around 1 in 10" but we have
 * not read it in a primary NAR release, so it is written as an approximation
 * rather than a decimal that implies a measurement we cannot show.
 */
export const AGENT_ADOPTION: ProofPoint = {
  id: "agent_adoption",
  stat: "~1 in 10",
  claim: "agents actually put video on their listings.",
  source: "Industry research, cited across NAR reporting",
  confidence: "cited",
};

/** Everything, for the review page and for a quick audit of what we claim. */
export const PROOF: ProofPoint[] = [SELLERS_EXPECT, AGENT_ADOPTION];
