import { Check } from "videotour-funnel";

// Check glyph — inherits color via `currentColor`, size via h-/w- utilities.
export const Default = () => <Check className="h-10 w-10 text-ink" />;

// Brand accent tone.
export const Accent = () => <Check className="h-10 w-10 text-accent" />;
