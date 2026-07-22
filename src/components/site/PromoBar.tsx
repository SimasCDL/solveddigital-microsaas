import { Tag, Arrow } from "@/components/site/icons";

export function PromoBar() {
  return (
    <a
      href="/upload"
      className="flex items-center justify-center gap-2 whitespace-nowrap bg-accent px-3.5 py-[11px] text-center text-[12.5px] font-semibold text-cream"
    >
      <Tag className="h-[15px] w-[15px]" />
      <span>This week only — 35% off your first tour</span>
      <Arrow className="h-4 w-4" />
    </a>
  );
}
