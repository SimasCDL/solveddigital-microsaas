import { Container } from "videotour-funnel";

// Layout primitive — centers content and caps it at a comfortable reading width
// (max-w-5xl) with responsive gutters. Shown wider than the cap so the centered
// column and side padding are visible.
export const Default = () => (
  <div className="bg-cream py-10">
    <Container>
      <div className="rounded-xl border border-line bg-paper p-6">
        <p className="eyebrow text-accent">Layout</p>
        <h3 className="font-display mt-2 text-2xl text-ink">
          Centered content column
        </h3>
        <p className="mt-2 text-ink-soft">
          Container caps content at a comfortable reading width and pads the
          gutters. Every section on the page sits inside one.
        </p>
      </div>
    </Container>
  </div>
);
