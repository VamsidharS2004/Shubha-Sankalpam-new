-- Run once in the project's Supabase SQL Editor before publishing.
-- Additive: no inferred/backfilled signup sources or interests.
create table if not exists public.devotee_leads (
  phone text primary key references public.devotees(phone) on update cascade on delete cascade,
  signup_at timestamptz,
  signup_source text,
  signup_puja text,
  interested_puja text,
  interest_ref text,
  interest_at timestamptz
);
alter table public.devotee_leads enable row level security;
revoke all on public.devotee_leads from anon, authenticated;
grant all on public.devotee_leads to service_role;
