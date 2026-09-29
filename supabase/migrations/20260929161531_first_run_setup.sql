create table if not exists public.score_tracker_setup_profiles (
  user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 6),
  selected_subjects jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_subjects) = 'array'),
  school jsonb check (school is null or jsonb_typeof(school) = 'object'),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.score_tracker_setup_profiles enable row level security;
-- This app uses its own hashed session tokens, verified by the Edge Function.
revoke all on public.score_tracker_setup_profiles from anon, authenticated;
grant select, insert, update, delete on public.score_tracker_setup_profiles to service_role;
