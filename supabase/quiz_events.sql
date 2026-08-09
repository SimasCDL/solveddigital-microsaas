-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Step-level funnel events for /tour, so drop-off can be read per screen instead
-- of inferred from the handful of leads that reach the gate.
--
-- This is the thing that answers "which question loses people". Question 1 is the
-- highest-drop-off screen in any quiz funnel and right now nothing measures it.

create table if not exists quiz_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  -- Random per-visit id minted client-side. Not a user id, not tied to identity —
  -- it only stitches one visitor's steps into a single run.
  session_id text not null,
  funnel text not null default 'quiz',

  -- quiz_start | step_view | step_answer | gate_view | lead | checkout_click
  event text not null,

  -- Which screen, and how far in. step_index makes "where did they stop" a
  -- max() rather than a join.
  step_id text,
  step_index int,
  -- The option chosen, for step_answer. Ids only ("agent", "p20"), never free text.
  answer text,

  ip_hash text
);

-- Per-run replay, ordered.
create index if not exists quiz_events_session_idx on quiz_events (session_id, created_at);
-- Funnel counts by event over a window.
create index if not exists quiz_events_event_idx on quiz_events (event, created_at desc);
-- Drop-off by screen.
create index if not exists quiz_events_step_idx on quiz_events (funnel, step_index);

-- Same reasoning as quiz_leads: service-role only.
alter table quiz_events enable row level security;
