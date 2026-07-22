import { Arrow } from "@/components/site/icons";

interface CtaButtonProps {
  /** Where it goes. Defaults to the upload/purchase flow. */
  href?: string;
  size?: "sm" | "lg" | "xl";
  /** "accent" = shiny teal (primary). "dark" = ink. "light" = cream. */
  tone?: "accent" | "dark" | "light";
  label?: string;
  className?: string;
}

const TONES = {
  accent:
    "bg-gradient-to-b from-[#13a48c] to-[#0e7d6b] text-white ring-1 ring-white/10 shadow-[0_14px_34px_-10px_rgba(15,125,107,0.65)] hover:brightness-[1.06] hover:shadow-[0_18px_44px_-10px_rgba(15,125,107,0.75)]",
  dark: "bg-ink text-cream shadow-lg shadow-ink/15 hover:bg-ink/90",
  light: "bg-cream text-ink shadow-xl shadow-black/25 hover:bg-paper",
};

const SIZES = {
  sm: "h-10 px-5 text-sm",
  lg: "h-14 px-7 text-[0.95rem]",
  xl: "h-16 px-9 text-base",
};

export function CtaButton({
  href = "/upload",
  size = "lg",
  tone = "accent",
  label = "Make my first tour",
  className = "",
}: CtaButtonProps) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all active:scale-[0.99] ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      <span>{label}</span>
      <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
