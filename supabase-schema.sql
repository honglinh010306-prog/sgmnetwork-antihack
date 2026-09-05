-- Run this once in Supabase SQL Editor.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_code text unique not null,
  type text not null,
  player_name text,
  reporter_uid text,
  target text not null,
  occurred_at timestamptz,
  category text not null,
  description text not null,
  evidence_name text,
  evidence_data text,
  evidence_type text,
  status text not null default 'Mới',
  status_history jsonb not null default '[]'::jsonb,
  reply text,
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

alter table public.reports enable row level security;

drop policy if exists "Public can submit reports" on public.reports;
create policy "Public can submit reports" on public.reports
  for insert to anon, authenticated with check (true);

drop policy if exists "Public can read reports for lookup" on public.reports;
create policy "Public can read reports for lookup" on public.reports
  for select to anon, authenticated using (true);

drop policy if exists "Authenticated admins can update reports" on public.reports;
create policy "Authenticated admins can update reports" on public.reports
  for update to authenticated using (true) with check (true);
