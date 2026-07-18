import { Star } from "videotour-funnel";

// Star glyph — inherits color via `currentColor`, size via h-/w- utilities.
export const Default = () => <Star className="h-10 w-10 text-ink" />;

// Brand accent tone.
export const Accent = () => <Star className="h-10 w-10 text-accent" />;
