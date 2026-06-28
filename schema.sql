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

-- Bills table for credit card tracker
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  card_id text,
  amount numeric(12,2) not null,
  currency text default 'USD',
  due_date date,
  cycle_start date,
  cycle_end date,
  paid boolean default false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bills enable row level security;

drop policy if exists "Allow public select bills" on public.bills;
drop policy if exists "Allow public write bills" on public.bills;

create policy "Allow public select bills"
on public.bills
for select
to anon, authenticated
using (true);

create policy "Allow public write bills"
on public.bills
for all
to anon, authenticated
using (true)
with check (true);
