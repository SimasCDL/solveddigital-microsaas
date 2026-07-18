// Honest, value-based proof points (no fabricated traction). Swap for real
// metrics / reviews once you have them.
const STATS = [
  { value: "~2 min", label: "Photos to a finished tour" },
  { value: "$300+", label: "Saved vs a videographer" },
  { value: "100%", label: "Money-back guarantee" },
];

export function ProofStats() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-5 sm:gap-x-16">
      {STATS.map((s) => (
        <div key={s.label} className="text-center">
          <div className="font-display text-3xl font-bold text-accent sm:text-4xl">
            {s.value}
          </div>
          <div className="mt-1 text-sm text-ink-soft">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
