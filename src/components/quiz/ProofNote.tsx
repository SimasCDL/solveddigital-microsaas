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
 * WHY IT LOOKS LIKE THIS. The first version was bare text on the page
 * background and read as something we had typed ourselves, which is worse than
 * having no citation at all: an unsupported statistic in your own voice is the
 * exact thing an agent has learned to distrust. What makes a quoted figure feel
 * real is not a famous masthead, it is the apparatus of a citation. So:
 *
 *   - It sits on its own surface with a heavy left rule, the shape every
 *     pull-quote in every publication uses.
 *   - The organisation is set in the display face at readable size, not as
 *     grey micro-caps, because that is how a source is credited rather than how
 *     a label is printed.
 *   - A second line describes what the source IS. "Member research on seller
 *     expectations" implies a document exists. That line must always stay a
 *     description and never become a report title or a year we have not
 *     verified: inventing a citation is worse than having a plain one.
 *
 * Deliberately NOT a famous news brand. Putting Forbes or the Times on this
 * would be fabricating attribution, and the first agent who searches for it
 * finds nothing and disbelieves everything else on the page. For a US listing
 * agent, NAR is a stronger name than any newspaper anyway: it is their own
 * trade body, and they pay it dues.
 *
 * It never links anywhere. A link is an exit, and this screen has exactly one
 * job that is not exiting.
 */
export function ProofNote({ point }: { point: ProofPoint }) {
  return (
    <figure className="mt-7 rounded-r-xl border-l-[3px] border-accent bg-paper py-4 pl-4 pr-4 shadow-[0_6px_20px_-16px_rgba(21,19,15,0.5)] ring-1 ring-line/60">
      <p className="text-[14px] leading-[1.5] text-ink">
        <span className="font-display text-[26px] font-bold leading-none tracking-[-0.01em] text-ink">
          {point.stat}
        </span>{" "}
        {point.claim}
      </p>

      {/* The mark carries this block. It is the only thing here the reader
          recognises from outside our funnel, and recognition is what a typeface
          cannot fake. Sized to sit level with both caption lines so it reads as
          a credited source rather than a badge stuck on. */}
      <figcaption className="mt-3 flex items-center gap-3 border-t border-line/80 pt-2.5">
        {point.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={point.logo}
            alt={point.logoAlt ?? point.source}
            className="h-10 w-auto shrink-0"
          />
        )}
        <span className="min-w-0">
          <span className="font-display block text-[13px] font-bold leading-tight tracking-[-0.01em] text-ink">
            {point.source}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-[1.35] text-ink-soft">
            {point.context}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
