alter table public.score_tracker_users
  add column if not exists participant_defaults jsonb not null default '{}'::jsonb
  check (jsonb_typeof(participant_defaults) = 'object');
