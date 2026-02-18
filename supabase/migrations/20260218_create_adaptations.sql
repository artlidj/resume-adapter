create extension if not exists pgcrypto;

create table if not exists public.adaptations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source_filename text not null,
  status text not null check (status in ('success', 'error')),
  job_description_length integer not null default 0,
  match_score integer,
  keywords_used text[] not null default '{}',
  duration_ms integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.adaptations enable row level security;

create policy "Users can view own adaptations"
on public.adaptations
for select
using (auth.uid() = user_id);

create policy "Users can insert own adaptations"
on public.adaptations
for insert
with check (auth.uid() = user_id);
