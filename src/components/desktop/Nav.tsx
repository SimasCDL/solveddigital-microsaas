import Link from "next/link";
import { CtaButton } from "@/components/ab/CtaButton";
import { MAIN_FUNNEL, type Funnel } from "@/lib/funnels";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#work", label: "Examples" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav({ funnel = MAIN_FUNNEL }: { funnel?: Funnel }) {
  return (
    <header className="sticky top-3 z-50 sm:top-4">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between rounded-full border border-line bg-cream/85 pl-6 pr-2.5 shadow-lg shadow-black/5 backdrop-blur-md">
          {/* Left: logo + links */}
          <div className="flex items-center gap-8">
            {/* Home points at the funnel's own route, so clicking the logo
                can't quietly move a visitor onto a different variant. */}
            <Link
              href={funnel.path}
              className="font-display text-xl tracking-tight text-ink"
            >
              Tourly
            </Link>
            <nav className="hidden items-center gap-7 text-sm text-ink/70 md:flex">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="transition-colors hover:text-ink"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: CTA */}
          <CtaButton
            size="sm"
            label={funnel.ctaLabelShort}
            href={funnel.ctaHref}
          />
        </div>
      </div>
    </header>
  );
}
