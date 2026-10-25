-- Additive: old clients and score edits leave reflections unchanged.
alter table public.score_tracker_exams
  add column if not exists reflection text not null default '' check (char_length(reflection) <= 10000),
  add column if not exists reflection_revision integer not null default 0 check (reflection_revision >= 0),
  add column if not exists reflection_updated_at timestamptz;
-- Existing RLS and service-role-only access remain in force. No new public grants.
