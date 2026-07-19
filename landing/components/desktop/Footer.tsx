import Link from "next/link";
import { Container } from "@/components/site/Container";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night py-12">
      <Container className="flex flex-col items-center justify-between gap-6 text-sm text-cream/60 sm:flex-row">
        <span className="font-display text-xl font-semibold text-cream">
          Tourly
        </span>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#how" className="transition-colors hover:text-cream">
            How it works
          </a>
          <a href="#pricing" className="transition-colors hover:text-cream">
            Pricing
          </a>
          <a href="#faq" className="transition-colors hover:text-cream">
            FAQ
          </a>
          <Link href="/terms" className="transition-colors hover:text-cream">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-cream">
            Privacy
          </Link>
        </nav>

        <span>© 2026 Tourly · AI-generated video tours</span>
      </Container>
    </footer>
  );
}
