-- CardClear Supabase storage
-- Run this in the Supabase SQL editor for the same project used by the trading app.

create table if not exists public.credit_card_tracker_state (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.credit_card_tracker_state enable row level security;

drop policy if exists "Allow public read credit card tracker state" on public.credit_card_tracker_state;
drop policy if exists "Allow public write credit card tracker state" on public.credit_card_tracker_state;

create policy "Allow public read credit card tracker state"
on public.credit_card_tracker_state
for select
to anon, authenticated
using (true);

create policy "Allow public write credit card tracker state"
on public.credit_card_tracker_state
for all
to anon, authenticated
using (true)
with check (true);
