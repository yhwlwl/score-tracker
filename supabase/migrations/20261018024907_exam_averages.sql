-- Optional final-score references follow existing exam ownership and RLS rules.
alter table public.score_tracker_exams
  add column if not exists averages jsonb not null default '{}'::jsonb
  check (jsonb_typeof(averages) = 'object');
