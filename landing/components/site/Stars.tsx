import { Star } from "@/components/site/icons";

interface StarsProps {
  /** Number of stars to render (default 5). */
  count?: number;
  className?: string;
}

/** A row of gold rating stars. */
export function Stars({ count = 5, className = "h-4 w-4" }: StarsProps) {
  return (
    <span className="flex gap-px text-[#f5a623]">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className={className} />
      ))}
    </span>
  );
}
