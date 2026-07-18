import { Container } from "@/components/site/Container";
import { CtaButton } from "@/components/ab/CtaButton";
import { Check } from "@/components/site/icons";

const PROOFS = ["Ready in ~2 min", "Love it or it's free", "No subscription"];

export function FinalCta() {
  return (
    <section className="py-28 sm:py-36">
      <Container className="text-center">
        <h2 className="font-display mx-auto max-w-2xl text-5xl leading-[1.05] sm:text-6xl">
          Give your next listing the marketing it deserves.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-lg text-ink-soft">
          Upload your photos and have a professional video tour in the time it
          takes to read this page.
        </p>

        <div className="mt-10 flex flex-col items-center gap-5">
          <CtaButton />
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-soft">
            {PROOFS.map((p) => (
              <li key={p} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
