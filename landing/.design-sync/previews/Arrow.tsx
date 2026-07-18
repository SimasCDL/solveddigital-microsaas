import { Arrow } from "videotour-funnel";

// Arrow glyph — inherits color via `currentColor`, size via h-/w- utilities.
export const Default = () => <Arrow className="h-10 w-10 text-ink" />;

// Brand accent tone.
export const Accent = () => <Arrow className="h-10 w-10 text-accent" />;
