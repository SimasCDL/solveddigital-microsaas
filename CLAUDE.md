# Tourly — project context

Tourly is the marketing **landing page / funnel** for an AI product that turns a
real-estate agent's **listing photos into a cinematic video tour in ~2 minutes**
(for MLS, Reels, TikTok, YouTube). This repo is **only the funnel/landing** — the
actual photo→video generation system is a separate project built by a colleague.

This is a standalone venture, unrelated to any other project on this machine.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** — tokens live in `app/globals.css` under `@theme` (NOT a
  `tailwind.config`). Custom utility classes also in `globals.css`.
- **Geist** font via `next/font` (no serif — the user explicitly dislikes serif
  headlines). No shadcn / no component library.
- Run: `npm run dev` → http://localhost:3000 · `npm run build` to verify.

## Design system (the brand — keep everything on these tokens)

Defined in `app/globals.css` `@theme`:

| token | hex | use |
|---|---|---|
| `cream` | `#faf8f3` | page background |
| `paper` | `#ffffff` | cards / alternating sections |
| `ink` | `#15130f` | near-black text |
| `ink-soft` | `#6f6a60` | muted text |
| `line` | `#e7e1d6` | borders |
| `night` | `#100d09` | dark sections |
| `night-soft` | `#221d16` | dark panels |
| `accent` | `#0f7d6b` | the ONE accent (emerald-teal) |
| `accent-soft` | `#e3f3ec` | accent pill backgrounds |
| `star` | `#f5b945` | star/rating gold |

- On dark sections, a brighter teal `#34c4a8` is used for the accent so it stays legible.
- `.font-display` = Geist, weight 600/700, letter-spacing -0.022em (all headlines).
- **Aesthetic:** clean, premium, lots of whitespace, big bold clear type, **one**
  restrained teal accent. Reference inspiration: AutoReel (light, clear, bold).

## File map

- `app/layout.tsx` — Geist font + metadata
- `app/globals.css` — Tailwind v4 import + `@theme` tokens + custom classes
  (`.font-display`, `.eyebrow`, marquee keyframes, hero gradients)
- `app/page.tsx` — assembles the page in this order:
  PromoBar → Nav → Hero → BeforeAfter → HowItWorks → Sample → ValueStack →
  Guarantee → Pricing → Faq → FinalCta → Footer
- `app/checkout/page.tsx` — dead-end Stripe placeholder (reads `?pack` / `?price`)
- `lib/pricing.ts` — **the one place to edit prices** (`PACKS` + `packCheckoutUrl`)
- `components/ab/CtaButton.tsx` — the shiny accent CTA (tones `accent|dark|light`,
  sizes `sm|lg|xl`; defaults to accent)
- `components/site/` — `Nav` (sticky frosted island, links left + CTA right),
  `PromoBar` (client, evergreen 24h countdown), `Container`, `icons`,
  `ProofStats`, `Footer`
- `components/sections/` — `Hero`, `BeforeAfter` (client, draggable slider),
  `HowItWorks` (3 steps), `Sample` (auto-scroll marquee), `ValueStack`,
  `Guarantee`, `Pricing`, `Faq`, `FinalCta`
- `tourly-landing.html` — a single self-contained copy of the whole page (Tailwind
  CDN + inline JS) for pasting into Claude Design as a quick preview.

## Pricing (one-time, no subscription) — `lib/pricing.ts`

- **1 video** — `$47` — one tour, up to 1 minute
- **3 videos** — `$94` — three tours, up to 1 min each · "Just $31 per video" ·
  "Most popular" (highlighted dark card)
- Routes to Stripe Payment Links via `NEXT_PUBLIC_STRIPE_LINK_SINGLE` / `_TRIO`;
  with no env set it falls back to the `/checkout` dead-end placeholder.

## Current copy / structure (already iterated with the user)

- **PromoBar:** dark bar, "Founding launch — lock in $47 first tours. Ends in
  HH:MM:SS" (live countdown).
- **Hero (light, no video):** eyebrow pill "THE 2-MINUTE LISTING TOUR" → big bold
  headline "Turn listing photos into stunning video tours, **instantly**" (accent
  on "instantly"; line 1 longer / line 2 shorter) → subtitle (line 1 shorter /
  line 2 longer) → shiny **XL teal CTA** → microcopy "Secure checkout · Money-back
  guarantee · Delivered in ~2 min" → **proof row** (`~2 min` / `$300+ saved` /
  `100% money-back` — honest value numbers, NO fabricated testimonials/traction).
- **BeforeAfter:** dark section, draggable slider, "Before: static photo" /
  "After: AI video" pills, swap handle, "Transform:" caption. AFTER side uses
  `/public/hero.mp4` (the real tour clip; gradient placeholder if missing).
- **HowItWorks:** 3 cards w/ teal numbered circles (Upload → Wait ~2 min → Post).
- Value / Guarantee / Pricing / FAQ / FinalCta — clean cream/ink, teal accents.

## Analytics

- **Microsoft Clarity** (project ID `xpy86yhdm3`) via
  `components/site/ClarityAnalytics.tsx`, loaded in `app/layout.tsx`. ID is
  hardcoded (public, non-secret client ID) with an optional
  `NEXT_PUBLIC_CLARITY_ID` override. Fires **only in production** (`NODE_ENV`),
  so local dev doesn't pollute the project. Historically the tag was absent from
  the site entirely, so paid ad traffic went untracked — this is the fix.

## Stubs / integration seams (intentional — not needed for design work)

- **Stripe + delivery:** the colleague builds the real Stripe → success → delivery
  flow and the upload/generation backend. This repo only has the `/checkout`
  placeholder + env seam.
- **Assets to swap:** `/public/hero.mp4` (tour video), the before/after "Before"
  side (grayscale placeholder), `ProofStats` numbers, any real reviews.

## Immediate goal

Push this design system to **Claude Design** via `/design-sync`, then iterate on
the visual design in the Claude Design app. Any visual changes get ported back
into these real components afterward.

## Rules

- Keep all user-facing copy in clean English (US real-estate audience).
- Never fabricate testimonials, traction, or stats — use honest value-based proof
  until real data exists.
- Edit prices only in `lib/pricing.ts`. Keep everything on the design tokens above.
