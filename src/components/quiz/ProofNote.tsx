import type { ProofPoint } from "@/lib/proof";

/**
 * An attributed industry figure, parked under the answer options.
 *
 * The job is a specific psychological one. A question screen asking an agent
 * how badly their marketing is going is a screen they can leave, because
 * answering it costs them something and pays nothing back. The same screen with
 * a sourced figure underneath reads as an article that happens to ask a
 * question, and people finish articles.
 *
 * Everything about the styling is chosen to be believed rather than noticed:
 *
 *   - No card, no shadow, no accent colour, no icon. A boxed and tinted stat is
 *     read as an ad unit and skipped by everyone who has used the internet. A
 *     hairline rule and a citation is read as a footnote and skipped by nobody.
 *   - The organisation's name sits ABOVE the claim, in the position a masthead
 *     occupies. That is what makes the sentence arrive as somebody else's
 *     finding rather than ours.
 *   - The figure is the only bold thing, and it is not our accent teal. The
 *     accent is reserved for the one control that moves money; borrowing it
 *     here would quietly tell the reader this is our marketing.
 *
 * It never links anywhere. A link is an exit, and this screen has exactly one
 * job that is not exiting.
 */
export function ProofNote({ point }: { point: ProofPoint }) {
  return (
    <figure className="mt-7 border-t border-line pt-4">
      <figcaption className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft/75">
        {point.source}
      </figcaption>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-soft">
        <span className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">
          {point.stat}
        </span>{" "}
        {point.claim}
      </p>
    </figure>
  );
}
