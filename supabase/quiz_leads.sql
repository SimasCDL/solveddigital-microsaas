-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run, and safe to run over the earlier version of this file.
--
-- Leads captured at the /tour email gate, plus the diagnosis shown to them and
-- the state of the follow-up sequence they are on. Three jobs:
--
--   1. Keep the lead. Before this table the only record of a quiz lead was a
--      Telegram message, which is not queryable and not a list.
--   2. Give /api/quiz-lead a durable rate limit. That endpoint throttles in
--      per-instance memory, which resets on cold start and is not shared across
--      lambdas — counting rows here by ip_hash is the real fix.
--   3. Drive the nurture sequence: which step this lead is on, when the next one
--      is due, and what must stop it.
--
-- Job 3 is why the sequence columns are not optional. src/lib/leads.ts upserts
-- on `email` and reads status/step/next_at/unsub_token on every cron run;
-- without them the follow-up emails fail silently.

create table if not exists quiz_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- UNIQUE is load-bearing: the upsert targets on_conflict=email, so retaking
  -- the quiz updates the lead instead of starting a second sequence to the
  -- same inbox.
  email text not null unique,

  -- sha256 of the client IP, same helper the free-trial limiter uses. Never the
  -- raw address: that is personal data and nothing here needs to reverse it.
  ip_hash text,

  -- Which funnel it came from, so /tour can be compared against future variants.
  funnel text not null default 'quiz',

  -- Which sequence this lead runs: 'quiz' (took the diagnostic) or 'winback'
  -- (address collected before the quiz existed, where the quiz copy would be
  -- referring to answers they never gave).
  source text not null default 'quiz',

  -- Raw answers, kept whole so the diagnosis can be recomputed if the scoring
  -- changes rather than being frozen at whatever the visitor happened to see.
  answers jsonb not null default '{}',

  -- Denormalised copies of what was actually shown, for reporting without
  -- replaying the scoring in SQL.
  segment text,
  score int,
  archetype text,
  pack_id text,
  listings_per_year int,

  ------------------------------------------------------------ sequence state
  -- Highest step already sent. 0 = nothing but the diagnostic.
  step integer not null default 0,
  -- When the next step is due. Null once the sequence has ended.
  next_at timestamptz,
  -- Resend ids for sends that have not fired yet, so a purchase can cancel them.
  scheduled_ids jsonb not null default '[]',
  -- active | purchased | unsubscribed | done | bounced
  status text not null default 'active',
  -- Random capability token in the unsubscribe link. Never derived from the
  -- email, so knowing an address is not enough to unsubscribe it.
  unsub_token text,

  -- A per-lead Stripe promotion code, when minting is used instead of a shared one.
  promo_code text,
  promo_pct integer,
  promo_expires_at timestamptz,

  purchased_at timestamptz,
  unsubscribed_at timestamptz,
  -- Set once, so a second expired Stripe session cannot re-send the
  -- abandoned-checkout recovery email.
  recovery_sent_at timestamptz,

  emailed boolean not null default false
);

-- Bring an existing table (created from the earlier version of this file) up to
-- date. No-ops on a fresh install.
alter table quiz_leads
  add column if not exists updated_at       timestamptz not null default now(),
  add column if not exists source           text not null default 'quiz',
  add column if not exists step             integer not null default 0,
  add column if not exists next_at          timestamptz,
  add column if not exists scheduled_ids    jsonb not null default '[]',
  add column if not exists status           text not null default 'active',
  add column if not exists unsub_token      text,
  add column if not exists promo_code       text,
  add column if not exists promo_pct        integer,
  add column if not exists promo_expires_at timestamptz,
  add column if not exists purchased_at     timestamptz,
  add column if not exists unsubscribed_at  timestamptz,
  add column if not exists recovery_sent_at timestamptz;

-- The upsert target. Added separately so it also applies to a table created
-- before `email` was unique. Will error if duplicate emails already exist —
-- de-duplicate first if so.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_leads_email_key'
  ) then
    alter table quiz_leads add constraint quiz_leads_email_key unique (email);
  end if;
end $$;

create index if not exists quiz_leads_created_at_idx on quiz_leads (created_at desc);
create index if not exists quiz_leads_email_idx on quiz_leads (lower(email));
-- The rate-limit lookup: recent rows for one IP.
create index if not exists quiz_leads_ip_recent_idx on quiz_leads (ip_hash, created_at desc);
-- The nurture cron's only query: active leads whose next step is due.
create index if not exists quiz_leads_due_idx on quiz_leads (next_at) where status = 'active';
-- Unsubscribe by capability token.
create index if not exists quiz_leads_unsub_idx on quiz_leads (unsub_token);

-- RLS on with no policies = only the service-role key reaches this, which is the
-- only thing that should. New Supabase tables default to RLS OFF, meaning the
-- public anon key can read them — for a table of customer emails that is not a
-- default worth accepting.
alter table quiz_leads enable row level security;
