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
- **Cron-gated:** `daily-report` and `nurture` require `CRON_SECRET` (both
  fail-closed: an unset secret 401s rather than running open).
- **Signature-verified:** `webhook` (Stripe).
- **Public by design (UUID-as-capability, no login system):** `checkout`,
  `upload` (validates image type + 15 MB/file cap), `status`, `videos/[id]`,
  `quiz-lead` (throttled to 5/hour per IP), `unsubscribe` (random per-lead
  token, never derived from the address).
- Security headers (HSTS, nosniff, frame-options, referrer/permissions policy)
  set in `next.config.ts`; `poweredByHeader: false`.

## Support channel (there is no monitored inbox)

`CONTACT_EMAIL` in `src/lib/legal.ts` is published in the Terms and Privacy
pages as a monitored inbox for refunds and GDPR requests. **If nobody reads it,
that is a live legal exposure** — the Terms promise a route to a refund.

`/help` is the working channel: a form posting to `/api/help`, delivered to
Telegram, reaching a phone in seconds. All nurture copy points here. It reports
a delivery failure to the customer instead of showing a false success, because
a swallowed refund request becomes a chargeback. **Never write "just reply to
this email" anywhere in customer copy** — nothing reads those replies.

## Funnel positioning: they are not buying a video

`/tour` sells **how to market a listing**, not a video tour. The visitor does
not know a video is the answer until the result screen, and that is deliberate:
cold traffic that knows it is being sold a listing video prices the product
before it has valued the problem.

The rules this imposes, in the order they break if you edit carelessly:

- **No price anywhere before the result.** A price mid-quiz turns the whole
  thing into an ad and the visitor re-reads every earlier screen as one. This is
  why the old question-3 cost chart is gone and the interstitial there now shows
  a demand/supply gap with no figure of ours on it.
- **The product is never named in a question.** "If every listing went out with
  a tour" pre-supposes the answer three screens early. Questions ask about the
  marketing being handled well.
- **The interstitials must pay out.** Each one carries a `takeaway`: one thing
  the reader can act on tonight without buying anything. The landing page
  promises they will learn something, and if every screen only softens them up,
  the result screen is where they notice the promise was bait.
- **Third-party figures live in `src/lib/proof.ts`, never inline.** Every claim
  carries its own attribution and a `confidence` field. The two NAR figures in
  use are marked `cited`, meaning consistently attributed to NAR across the
  industry but read by us in secondary sources; swap in the primary when we have
  it. Standing rule unchanged: nothing invented, ever.
- **The result screen compares one number to one number**, per property:
  `VIDEOGRAPHER_TYPICAL` ($500, conservative inside the quoted $300-$1,000
  range) against the recommended pack price. Not a range against an annual sum.

`src/components/quiz/Showcase.tsx` and `tourlyCost()` in `quiz.ts` are now
**orphaned** by this change. Kept rather than deleted because they are the
intro's previous media block and the old cost chart's maths, and reverting the
positioning would need both.

## Quiz funnel instrumentation

⚠️ `supabase/quiz_leads.sql` is a **merge of two independently written
schemas**. The analytics columns (`funnel`, `segment`, `listings_per_year`,
`emailed`) and the sequence columns (`status`, `step`, `next_at`,
`unsub_token`, …) are both required. `email` **must** stay UNIQUE — the lead
upsert targets `on_conflict=email`, and without it every capture starts a
second sequence to the same inbox. The file is re-runnable and ALTERs an
existing table into shape.


`src/lib/track.ts` fires each step to **both** our own counters
(`/api/quiz-event` → `quiz_events`, run `supabase/quiz_events.sql`) and Clarity
as a `quiz_<step>` tag. The counters give the numbers; the tags make the replays
filterable. Clarity's API does not expose custom events, so the numbers cannot
come from there.

⚠️ The report looks stages up **by the event names `funnelCounts` emits**
(`quiz_start`, `step_N`, `gate_view`, `lead`, `result_view`, `checkout_click`).
A key that misses returns 0, so a wrong one prints a confident `0%` instead of
failing — which is exactly how `Start 0% · Gate 0% · Buy 0%` shipped and went
unnoticed for weeks against real traffic. Change a key in one file, change it
in both.

Clarity is the only report input that can vanish on its own, so its absence is
now **stated, never rendered as a zero**. `fetchClarity` returns
`{ok:false, reason}` rather than `null`; with it down the FUNNEL line falls
back to our own quiz landings and labels them `(quiz)`, and BEHAVIOR prints the
reason. `GET /api/debug?clarity=1` (admin key) asks the export API directly —
a 401 means the token cannot read the project the page tag writes to, which is
indistinguishable from no traffic without the status code.

**There is no HEALTH section and no `lib/health.ts`.** Both are deleted, not
disabled. The fal.ai probe outlived its subject (uploads went to Supabase,
generation to Replicate under `VIDEO_PROVIDER=seedance`) and spent weeks firing
a red BALANCE EXHAUSTED banner above the numbers for a service no request
touches. What was left probed Replicate and was empty on every normal day. If
something silently breaking needs an alarm again, write the probe for the thing
that is actually in the customer's path.

Three Clarity shapes that cost us wrong numbers, all live at once until 20 Aug:

- **Engagement time is in MINUTES.** Divided by session count and passed to
  `fmtSec` it printed `Active 2s` for a funnel people spend 1m 36s in.
- **Direct traffic is `{name: null, sessionsCount: "11"}`.** Any "first string
  value on the row" fallback picks up the *count* and names the top traffic
  source `11`.
- **One source arrives under several hosts** (`facebook.com`, `l.facebook.com`,
  `m.facebook.com`). Unmerged, the real biggest source reads as a third of
  itself. Our own host is filtered too: Clarity logs the return from Stripe as
  a referral from `/upload`, which both outranks real sources and prints a live
  `cs_live_…` id into Telegram.

The QUIZ FUNNEL section is **three rates and one worst-drop line, with no
stage-by-stage list**. Thirteen labels and thirteen counts wrapped across a
phone is the part nobody reads twice. The worst drop covers the quiz body only
(intro → questions → gate); result → checkout is excluded because it is the
biggest drop in any priced funnel, so naming it daily is arithmetic rather than
a finding. Gate and buy are reported separately as their own rates.

7-DAY rides on the header line, not its own block at the bottom: it is the one
number that answers "are we selling".

## Old leads / winback

**Quiz leads captured before `quiz_leads` existed were never persisted** — the
old `/api/quiz-lead` only sent Telegram. Those addresses exist only in Telegram
history. The recoverable sources are `free_trials` and `orders`.

Backfilled leads run a **separate 3-email winback** (`WINBACK` in `nurture.ts`),
not the quiz sequence. The quiz sequence opens by naming their archetype and
quoting figures from answers they never gave; sent to an old free-preview
signup that is simply false. The winback's hook is the one true new fact: the
packs are ~35% cheaper than when they last looked.

`POST /api/backfill-leads` (admin, **dry run unless `confirm: true`**) enrols
them. It excludes the team's own addresses (`EXCLUDE`) and obvious junk, since
every funnel was tested through the real endpoint and the history is full of
them.

## Proving the emails send

`GET /api/nurture-test?key=$ADMIN_KEY&to=<email>&step=N` sends one real email
through the exact render/send path the cron uses. Add `&source=winback`,
`&recovery=1`, or `&dry=1`. It returns the Resend id on success and a 502 with
the reason on failure — it never reports success for an email that did not send.

## Abandoned checkout recovery

Stripe fires `checkout.session.expired` ~24h after someone reaches the payment
page and does not pay. The webhook catches it and sends one recovery email
(`RECOVERY_EMAIL` in `nurture.ts`), guarded by `recovery_sent_at` so a second
expired session cannot re-send. The address is present because the quiz link
sets `prefilled_email`.

It concedes **nothing** — no discount, unless the lead was already past step 4,
in which case their existing code is repeated. A discount handed out for
abandoning teaches people to abandon.

## Quiz nurture email sequence

Eleven emails over 49 days to anyone who leaves an address on the quiz. Review
every screen at **`/emails`** (`?p=homeowner` for the single-property branch) —
those frames are the real rendered output, not mockups.

Timing: 25 min, then days 1, 3, **6 (the offer)**, **9 (last call)**, then
weekly to day 49. The front is compressed on purpose: this is impulse-priced,
and reach roughly halves between step 1 and step 4, so the offer must not sit
at day 8. Nothing before step 4 concedes anything, because an early discount
teaches every future lead to wait for one.

- **Content:** `src/lib/nurture.ts` (copy + timing), rendered to matching HTML
  and plain text by `src/lib/emailBlocks.ts`. Every figure derives from the
  visitor's own answers via `diagnose()`. Two standing rules: no invented
  statistics, and no deadline that isn't actually enforced.
- **State:** `src/lib/leads.ts` over Supabase table `quiz_leads` (create it with
  `supabase/quiz_leads.sql`). Transitions live in `src/lib/sequence.ts`.
- **Step 1 (+25 min) is scheduled at Resend**, not cronned — Hobby crons are
  daily-only and cannot fire at 25 minutes. Its Resend id is stored so a
  purchase can cancel it mid-flight.
- **Steps 2-11 run from the `/api/nurture` daily cron**, which re-checks
  purchase and unsubscribe state *at send time*. Never move this to
  schedule-ahead: that is what stops a customer receiving "you have not bought
  yet".
- **Stopping:** the Stripe webhook calls `stopSequence()` for every completed
  checkout (matched on `customer_details.email`), and the cron independently
  double-checks `hasPaidOrderFor()` as a backstop for a webhook that never
  landed. Unsubscribes are permanent — `upsertLead` will not restart a sequence
  for that row even if the person retakes the quiz.
- **The discount lives on steps 4 and 5 only** (`PROMO_STEPS`), in the copy and
  in the checkout link alike. That is what makes step 5's "last time I mention
  it" true of the software rather than just of the sentence.
- **Two discount modes, and the copy adapts so neither lies.** Set
  `NURTURE_PROMO_CODE` for one shared code (what this ships with): no minting,
  no expiry claimed, sold on exclusivity instead. Leave it unset and set
  `STRIPE_NURTURE_COUPON_ID` to mint a single-use per-lead code with a real
  72-hour `expires_at`, which is the only configuration allowed to print a
  deadline. Neither set means a full-price offer, which is also fine.
- **The bonus is stacked into step 4**, not dangled earlier. Seven days of free
  re-cuts, delivered through the existing `/api/admin/retry`. Spreading small
  concessions across the sequence is what trains people to wait for the next
  one.

### Required prod config (must be set in Vercel — not in the repo)

- `ADMIN_KEY` — without it, every admin route 401s and the `/generate` panel
  stops working.
- `SKIP_PAYMENT_CHECK` — **must NOT be `true` in production** (it bypasses the
  Stripe payment verification in `fulfill`/`pack`; dev-only).
- Stripe Payment Link **success URLs must be**
  `https://<domain>/upload?session_id={CHECKOUT_SESSION_ID}` — otherwise paid
  customers arrive without a session and the `/upload` gate blocks them.

For the nurture sequence:

- `CRON_SECRET` — without it `/api/nurture` 401s and the sequence silently stops
  at step 1 for everyone.
- `NEXT_PUBLIC_APP_URL` — every unsubscribe link and checkout link is built from
  it. Wrong value means dead unsubscribe links, which is a spam-complaint route.
- `NURTURE_PROMO_CODE` + `NURTURE_PROMO_PCT` — the shared code (`YOURPLAN15`,
  15%). The percentage here is only what the email *prints*; the real discount
  is whatever the Stripe coupon behind that code says, so **the two must be set
  to match** or the email quotes a number Stripe will not honour.
- `STRIPE_NURTURE_COUPON_ID` — only for per-lead minted codes, ignored when
  `NURTURE_PROMO_CODE` is set. Must be a **percent-off** coupon; a fixed-amount
  one is rejected and logged.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — now load-bearing for support, not
  just alerts. Without them `/help` 502s and customers have no route to a
  refund.
- The three pack Payment Links must have **"Allow promotion codes" enabled**, or
  the `prefilled_promo_code` in the offer email is ignored and the customer pays
  full price after being told they had a discount.
- `NURTURE_FROM_EMAIL` — optional. The emails are written in the first person,
  so set it to a named human. Do **not** point `REPLY_TO_EMAIL` at an unmonitored
  address; leaving it unset is more honest than inviting a reply nobody reads.
