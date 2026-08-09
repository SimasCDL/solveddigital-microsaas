-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Leads captured at the /tour email gate, plus the diagnosis that was shown to
-- them. Two jobs:
--
--   1. Keep the lead. Today the only record of a quiz lead is a Telegram message,
--      which is not queryable and not a list.
--   2. Give /api/quiz-lead a durable rate limit. That endpoint currently throttles
--      in per-instance memory, which resets on cold start and is not shared across
--      lambdas — counting rows here by ip_hash is the real fix.

create table if not exists quiz_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  email text not null,
  -- sha256 of the client IP, same helper the free-trial limiter uses. Never the
  -- raw address.
  ip_hash text,

  -- Which funnel it came from, so /tour can be compared against future variants.
  funnel text not null default 'quiz',

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

  emailed boolean not null default false
);

create index if not exists quiz_leads_created_at_idx on quiz_leads (created_at desc);
create index if not exists quiz_leads_email_idx on quiz_leads (lower(email));
-- The rate-limit lookup: recent rows for one IP.
create index if not exists quiz_leads_ip_recent_idx on quiz_leads (ip_hash, created_at desc);

-- RLS on with no policies = only the service-role key reaches this, which is the
-- only thing that should. New Supabase tables default to RLS OFF, meaning the
-- public anon key can read them — for a table of customer emails that is not a
-- default worth accepting.
alter table quiz_leads enable row level security;
