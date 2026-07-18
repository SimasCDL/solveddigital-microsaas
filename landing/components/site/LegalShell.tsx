import Link from "next/link";
import { Container } from "@/components/site/Container";
import { EFFECTIVE_DATE } from "@/lib/legal";

interface LegalShellProps {
  title: string;
  children: React.ReactNode;
}

/** Chrome for the Terms / Privacy pages: wordmark, title, prose, back link. */
export function LegalShell({ title, children }: LegalShellProps) {
  return (
    <main className="min-h-screen bg-cream py-16 sm:py-20">
      <Container className="max-w-3xl">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-ink"
        >
          Tourly
        </Link>

        <h1 className="font-display mt-10 text-4xl font-bold leading-tight text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Last updated: {EFFECTIVE_DATE}
        </p>

        <article className="legal mt-10">{children}</article>

        <div className="mt-14 border-t border-line pt-8">
          <Link
            href="/"
            className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            ← Back to Tourly
          </Link>
        </div>
      </Container>
    </main>
  );
}
