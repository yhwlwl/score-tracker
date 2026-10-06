alter table public.score_tracker_notification_config
  add column if not exists announcement_history jsonb not null default '[]'::jsonb;
