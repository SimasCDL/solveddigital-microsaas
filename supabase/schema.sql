-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- Generation history (used by /generate page)
create table if not exists generations (
  id uuid primary key,
  created_at timestamptz not null default now(),
  rooms jsonb not null default '[]',
  thumbnails jsonb not null default '[]',
  photo_urls jsonb not null default '[]',
  clip_urls jsonb not null default '[]',
  video_url text
);

-- Public bucket for stitched walkthrough MP4s
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;
