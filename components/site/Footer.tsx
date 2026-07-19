import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-night px-[22px] pb-[150px] pt-7 text-center text-cream/60">
      <span className="font-display text-xl font-semibold text-cream">
        Tourly
      </span>
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[13px]">
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
      </div>
      <p className="mt-4 text-xs text-cream/45">
        © 2026 Tourly · AI-generated video tours
      </p>
    </footer>
  );
}
