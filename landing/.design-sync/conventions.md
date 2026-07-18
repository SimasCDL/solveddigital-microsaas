# Tourly — design system conventions

Tourly is the brand UI for an AI listing-video funnel: restrained, cinematic, mostly
monochrome — light editorial sections (cream/ink) plus a deep "night" used for
high-contrast panels, with a single emerald-teal accent. Built with **Tailwind CSS v4**;
every design token is a CSS theme variable exposed as a Tailwind utility.

## How to build with it

- **No provider or wrapper is required** — components are self-contained React components.
- Most **page sections** (`Hero`, `Pricing`, `HowItWorks`, `BeforeAfter`, `Sample`,
  `ValueStack`, `Guarantee`, `Faq`, `FinalCta`) and **site chrome** (`Nav`, `Footer`,
  `PromoBar`, `ProofStats`) take **no props** — drop them in as `<Hero />`. They already
  carry their own copy and layout; compose a page by stacking them.
- **The styling idiom is Tailwind utility classes built on the brand tokens below.** Style
  your own layout/glue with these utilities — do not invent new color names.

## Token vocabulary (use these exact names)

Color tokens — combine with `bg-`, `text-`, `border-`, `ring-`, `from-`/`to-`:

| Token | Use |
|---|---|
| `cream` | page background (light editorial) |
| `paper` | raised surfaces / cards on cream |
| `ink` | primary text, dark-on-light |
| `ink-soft` | secondary / muted text |
| `line` | hairline borders on light |
| `night` | deep background for high-contrast panels |
| `night-soft` | raised surface on night |
| `accent` | the single emerald-teal accent (CTAs, highlights) |
| `accent-soft` | tinted accent background (chips, washes) |

e.g. `bg-cream text-ink`, `bg-night text-cream`, `text-accent`, `bg-accent-soft text-accent`,
`border-line`.

Custom utility classes (defined in the stylesheet):
- `font-display` — display-headline style (optically tightened, semibold sans).
- `eyebrow` — small uppercase, wide-tracked label above a heading.
- `animate-marquee-left` / `animate-marquee-right` + `marquee-mask` — the auto-scrolling sample carousels.
- `hero-cinematic` / `hero-vignette` / `hero-sheen` — cinematic backdrops behind a hero video.

The sans family is `--font-sans` (Geist Sans), already the default `font-sans`.

## Components that take props

- **`CtaButton`** — the primary action pill. `tone`: `"accent"` (shiny teal, default) ·
  `"dark"` (ink) · `"light"` (cream, for use on `night` backgrounds). `size`: `"sm" | "lg" | "xl"`.
  Also `label`, `href`, `className`.
- **`Container`** — centers content at a comfortable reading width (`max-w-5xl`) with
  responsive gutters. Wrap section content in it.
- **Icons** (`Check`, `Arrow`, `Play`, `Star`, `Swap`) — SVG glyphs; color via `currentColor`
  (set with `text-*`), size via `h-/w-`, e.g. `<Arrow className="h-5 w-5 text-accent" />`.

## Where the truth lives

Read `styles.css` (and its `@import "./_ds_bundle.css"`) for the full token + utility surface,
and each component's `<Name>.d.ts` / `<Name>.prompt.md` for its exact API and usage.

## Idiomatic snippet

```tsx
// A cream call-to-action band built from library parts + brand utilities.
<section className="bg-cream py-20">
  <Container className="text-center">
    <p className="eyebrow text-accent">Get started</p>
    <h2 className="font-display mt-3 text-4xl text-ink">List smarter, today</h2>
    <p className="mt-4 text-ink-soft">Turn your photos into a tour in ~2 minutes.</p>
    <div className="mt-8 flex justify-center">
      <CtaButton size="xl" label="Make my first tour" />
    </div>
  </Container>
</section>
```
