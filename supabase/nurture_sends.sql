-- One row per nurture email, so the daily report can state how many actually
-- landed instead of inferring it from a lead's current step.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.nurture_sends (
  id         bigserial   primary key,
  email      text        not null,
  -- 0 for the abandoned-checkout recovery, 1..11 for the quiz sequence,
  -- 1..3 for the winback.
  step       integer     not null,
  -- 'quiz' | 'winback' | '<source>_recovery'
  source     text        not null default 'quiz',
  -- When the email is DELIVERED, not when the row was written. Step 1 is
  -- scheduled up to 25 minutes ahead, and counting it on the day it was queued
  -- would misattribute every lead captured near midnight.
  sent_at    timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists nurture_sends_sent_idx
  on public.nurture_sends (sent_at desc);

alter table public.nurture_sends enable row level security;

-- Note: the quiz_leads columns this system needs (status, step, next_at,
-- unsub_token, ...) are added by supabase/quiz_leads.sql. Run that one too.
