// Browser-safe `process` shim, loaded FIRST in the synced bundle's entry.
//
// The synced bundle runs in the browser (claude.ai/design's design runtime and
// the preview cards), where `process` is undefined. Some bundled modules read
// `process.env.*` at module-evaluation time:
//   - lib/pricing.ts  → process.env.NEXT_PUBLIC_STRIPE_LINK_{SINGLE,TRIO}
//   - next/link       → process.env.__NEXT_ROUTER_BASEPATH and friends
// Without this, the very first read throws "process is not defined" and the
// whole IIFE fails, blanking every component.
//
// Defining a no-op process.env makes those reads yield `undefined` (then the
// app's `?? ""` / basepath fallbacks kick in) instead of crashing. This only
// affects the synced bundle — the real Next app is untouched (Next statically
// inlines NEXT_PUBLIC_* at build, and provides process.env on the server).
globalThis.process ||= { env: {} };
globalThis.process.env ||= {};
