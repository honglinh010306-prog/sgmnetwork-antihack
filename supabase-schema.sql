-- ================================================================
-- Free Fire Antihack – Supabase schema
-- Run this entire script once in: Supabase Dashboard → SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS guards)
-- ================================================================

-- 1. Create table
create table if not exists public.reports (
  id             uuid        primary key default gen_random_uuid(),
  report_code    text        unique not null,
  type           text        not null,
  player_name    text,
  reporter_uid   text,
  target         text        not null,
  occurred_at    timestamptz,
  category       text        not null,
  description    text        not null,
  evidence_name  text,
  evidence_data  text,
  evidence_type  text,
  status         text        not null default 'Mới',
  status_history jsonb       not null default '[]'::jsonb,
  reply          text,
  replied_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- 2. Row Level Security
alter table public.reports enable row level security;

-- Anyone (including anonymous users) can submit new reports
drop policy if exists "Public can submit reports" on public.reports;
create policy "Public can submit reports"
  on public.reports
  for insert
  to anon, authenticated
  with check (true);

-- Anyone can read reports (needed for lookup and public overview)
drop policy if exists "Public can read reports" on public.reports;
create policy "Public can read reports"
  on public.reports
  for select
  to anon, authenticated
  using (true);

-- Anyone with the anon key can update reports
-- (admin page is protected by a password in the browser, not Supabase Auth)
drop policy if exists "Public can update reports" on public.reports;
create policy "Public can update reports"
  on public.reports
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- 3. Enable Realtime
-- Adds the reports table to the Supabase Realtime publication so
-- INSERT and UPDATE events are broadcast to all connected clients.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;

-- 4. Indexes for common queries
create index if not exists reports_created_at_idx  on public.reports (created_at desc);
create index if not exists reports_report_code_idx on public.reports (report_code);
create index if not exists reports_status_idx      on public.reports (status);
create index if not exists reports_type_idx        on public.reports (type);
