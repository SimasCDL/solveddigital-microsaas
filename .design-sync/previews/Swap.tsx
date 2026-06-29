import { Swap } from "videotour-funnel";

// Swap glyph — inherits color via `currentColor`, size via h-/w- utilities.
export const Default = () => <Swap className="h-10 w-10 text-ink" />;

// Brand accent tone.
export const Accent = () => <Swap className="h-10 w-10 text-accent" />;
