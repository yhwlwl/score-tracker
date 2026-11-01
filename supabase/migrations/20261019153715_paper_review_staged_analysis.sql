-- Additive checkpoints for the isolated paper-review feature. No source images are persisted.
alter table public.score_tracker_paper_reviews
  add column if not exists analysis_state jsonb not null default '{}'::jsonb,
  add column if not exists progress jsonb not null default '{}'::jsonb;
comment on column public.score_tracker_paper_reviews.analysis_state is 'Service-only structured extraction and analysis checkpoints. No uploaded images, credentials or private reasoning. Cleared on success.';
comment on column public.score_tracker_paper_reviews.progress is 'Public owner-scoped stage name, counts and heartbeat; contains no source images or internal claim tokens.';
