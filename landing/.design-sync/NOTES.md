# design-sync NOTES — videotour-funnel (Tourly)

This repo is a **Next.js 16 marketing-funnel app**, not a packaged design system.
It is synced to claude.ai/design via the converter's **synth-entry (no-dist) path** so
the design agent can build on-brand "Tourly" UI from the real components.

## Setup that a re-sync MUST reproduce

- **Self-symlink** `node_modules/videotour-funnel -> ..` is required so the converter's
  `PKG_DIR = node_modules/<pkg>` resolves to the repo root (synth-entry mode reads `src/`
  from there). Recreate it per clone: `ln -sfn .. node_modules/videotour-funnel`.
  It lives under the gitignored `node_modules/`, so it is never committed.
- **`srcDir: "components"` is mandatory.** The repo also has a `lib/` dir, and default
  source-root detection (`src` → `lib` → `components`) would wrongly pick `lib/`.
- **CSS is compiled, not shipped.** Components use Tailwind v4 utility classes + the
  `@theme` tokens in `app/globals.css` + custom classes (`.font-display`, `.eyebrow`,
  `.animate-marquee-*`, `.hero-*`, `.marquee-mask`). `cfg.cssEntry` points at a compiled
  stylesheet that must be (re)generated before every build via `cfg.buildCmd`:
  `npx --yes @tailwindcss/cli@4 -i app/globals.css -o .design-sync/.cache/tailwind.css`.
  The Tailwind **CLI is NOT a repo dependency** — `buildCmd` fetches it with npx.
  Tailwind v4 auto content-detection (app/ + components/) covers all used utilities,
  including arbitrary values inside `const TONES`/`const SIZES` objects (e.g. CtaButton's
  `from-[#13a48c]` gradient and `shadow-[…]` — verified present in the compiled output).
- **tsconfig wired** for the `@/* -> ./*` path alias so component-internal imports
  (`@/components/...`, `@/lib/pricing`) resolve in the esbuild bundle.
- **Brand font (Geist)** ships via `.design-sync/fonts/tourly-font.css` (a remote Google
  Fonts `@import` for Geist + a `:root { --font-geist-sans: ... }` definition). The Next app
  loads Geist through `next/font/google` (build-time, not a shippable package), so the
  bundle can't reuse those files; the remote import gives designs the real font and
  gracefully falls back to the system sans if the host blocks remote fonts. Wired via
  `cfg.tokensPkg: "videotour-funnel"` (the self-symlinked package) + `cfg.tokensGlob:
  ".design-sync/fonts/*.css"`, so it lands in `tokens/` and the `styles.css` import closure.
  Validate prints `[FONT_REMOTE] "Geist"` — informational, expected, non-blocking.

## process shim (critical — keeps the bundle from crashing in the browser)

- `.design-sync/process-shim.mjs` is wired first via `cfg.extraEntries`. The bundle runs
  in the browser where `process` is undefined; `lib/pricing.ts` (`process.env.NEXT_PUBLIC_STRIPE_LINK_*`)
  and `next/link` (`process.env.__NEXT_*`) read `process.env` at module-eval time. Without
  the shim the very first read throws `process is not defined` and the whole IIFE fails,
  blanking every component. The shim defines a no-op `globalThis.process.env`. It does NOT
  touch the real Next app. Confirmed working: `window.Tourly` exposes all 20 components.

## Preview authoring conventions (calibrated, all 20 graded good)

- **Full-width sections + site chrome** (Hero, BeforeAfter, HowItWorks, Sample, ValueStack,
  Guarantee, Pricing, Faq, FinalCta, Nav, PromoBar, Footer, ProofStats) are zero-prop:
  preview = `export const Default = () => <Name />;`, with `cfg.overrides.<Name>` =
  `{cardMode:"single", viewport:"WxH"}` so the card renders the section at desktop width
  instead of clipping in a narrow grid cell. Viewports were tuned per section from the
  review sheets (see config).
- **Icons** (Check, Arrow, Play, Star, Swap): two cells — `Default` (`h-10 w-10 text-ink`)
  and `Accent` (`text-accent`). Color via `currentColor` (stroke for Check/Swap/Arrow,
  fill for Play/Star). No multi-size sweep — it tiles badly in the review sheet.
- **CtaButton**: `cardMode:"column"`, variant sweep (Primary / Sizes / OnNight / OnCream)
  with the `light` tone shown on a `bg-night` wrapper and `dark` on `bg-cream`.
- **Container**: `cardMode:"single"`, rendered with realistic children so the centered
  max-width column + gutters are visible.
- Authored previews import the real component by name from the package:
  `import { Hero } from "videotour-funnel";` → `window.Tourly.Hero`.

## Known render warns (triaged — not regressions on re-sync)

- All 5 icons (Arrow, Check, Play, Star, Swap) fire `[RENDER_THIN]` **even with authored
  previews** — the heuristic flags a mount with no text and a small paint area, which an
  `h-10 w-10` SVG glyph legitimately is. Confirmed benign from the review sheets: each icon
  renders a crisp ink (Default) and teal (Accent) glyph. This is the expected steady state;
  a re-sync seeing these 5 thin warns should treat them as known, not new.

## Token note

- `--color-star` (#f5b945, "rating gold") is defined in `app/globals.css` `@theme` but is
  **tree-shaken out of the compiled CSS** because no component uses a `*-star` utility.
  It is therefore NOT a shippable token (omitted from `conventions.md`). If a future design
  needs the gold accent, either use it in a component (so Tailwind emits it) or switch the
  source to `@theme static`. Don't advertise it to the design agent until it's in the build.

## Re-sync risks (watch-list)

- The compiled `tailwind.css` is a build artifact in the gitignored `.cache/` — it is
  regenerated by `buildCmd`, never committed. If a re-sync skips `buildCmd`, styling on
  changed components goes stale silently. **Always run `buildCmd` first.**
- `lib/pricing.ts` reads `process.env.NEXT_PUBLIC_STRIPE_LINK_*` at module top-level; the
  process shim handles it, but watch on Next/dependency upgrades that change env access.
- **BeforeAfter** renders an `<video src="/hero.mp4">` for its AFTER pane. That asset is
  NOT shipped in the bundle, so the AFTER half is dark in the card — graded on the section
  structure (heading, slider, before-layer, badges, handle, caption), not the video. If a
  future run wants the video, copy `public/hero.mp4` into the bundle and add it to the plan.
- Viewports in `cfg.overrides` are framing-only and keyed (an edit re-grades that component).
  They were tuned to the current section heights; significant copy/layout changes to a
  section may need a viewport retune (watch for bottom-clipped content or excess whitespace).
