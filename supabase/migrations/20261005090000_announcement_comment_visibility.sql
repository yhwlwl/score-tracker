alter table public.score_tracker_notification_config
  add column announcement_comments_public boolean not null default true;
