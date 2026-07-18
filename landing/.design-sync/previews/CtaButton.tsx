import { CtaButton } from "videotour-funnel";

// Primary call-to-action — the shiny teal "accent" tone at the default large size.
export const Primary = () => <CtaButton label="Make my first tour" />;

// The three sizes (sm / lg / xl) at the accent tone.
export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-4 p-4">
    <CtaButton size="sm" label="Small" />
    <CtaButton size="lg" label="Large" />
    <CtaButton size="xl" label="Extra large" />
  </div>
);

// Accent + light tones on the deep "night" background (where the light tone lives).
export const OnNight = () => (
  <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-night p-8">
    <CtaButton tone="accent" label="Accent" />
    <CtaButton tone="light" label="Light" />
  </div>
);

// Dark + accent tones on the cream/editorial background.
export const OnCream = () => (
  <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-cream p-8 ring-1 ring-line">
    <CtaButton tone="dark" label="Dark" />
    <CtaButton tone="accent" label="Accent" />
  </div>
);
