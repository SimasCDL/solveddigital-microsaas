<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Security model (auth on API routes)

Every internal/admin route is **fail-closed**: it 401s unless
`req.headers.get('x-admin-key') === process.env.ADMIN_KEY` (and `ADMIN_KEY` is
set). Pattern — never `if (ADMIN_KEY && key !== ADMIN_KEY)` (that fails OPEN when
the env is unset); always `if (!ADMIN_KEY || key !== ADMIN_KEY)`.

- **Admin-key gated:** `generate`, `bakeoff`, `qc-test`, `ingest`, `sort`,
  `stitch`, `history`, `admin/retry`. The admin `/generate` page sends the key
  via `getAdminKey()` on every fetch.
- **Payment-gated:** `fulfill` verifies the Stripe session is `paid` /
  `no_payment_required` before generating; `pack` returns a `paid` flag that the
  `/upload` page uses to lock the uploader (in `NEXT_PUBLIC_FREE_MODE`).
- **Cron-gated:** `daily-report` requires `CRON_SECRET`.
- **Signature-verified:** `webhook` (Stripe).
- **Public by design (UUID-as-capability, no login system):** `checkout`,
  `upload` (validates image type + 15 MB/file cap), `status`, `videos/[id]`.
- Security headers (HSTS, nosniff, frame-options, referrer/permissions policy)
  set in `next.config.ts`; `poweredByHeader: false`.

### Required prod config (must be set in Vercel — not in the repo)

- `ADMIN_KEY` — without it, every admin route 401s and the `/generate` panel
  stops working.
- `SKIP_PAYMENT_CHECK` — **must NOT be `true` in production** (it bypasses the
  Stripe payment verification in `fulfill`/`pack`; dev-only).
- Stripe Payment Link **success URLs must be**
  `https://<domain>/upload?session_id={CHECKOUT_SESSION_ID}` — otherwise paid
  customers arrive without a session and the `/upload` gate blocks them.
