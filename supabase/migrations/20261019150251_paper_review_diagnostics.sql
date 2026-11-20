-- Server-side diagnostics follow the existing vision audit contract. Old rows
-- retain NULL outcome details: do not invent an error code for historical failures.
alter table public.score_tracker_paper_reviews
  add column if not exists started_at timestamptz,
  add column if not exists model text,
  add column if not exists provider_host text,
  add column if not exists duration_ms integer,
  add column if not exists image_count integer,
  add column if not exists image_bytes integer,
  add column if not exists image_meta jsonb not null default '[]',
  add column if not exists attempts jsonb not null default '[]',
  add column if not exists diagnostics jsonb not null default '{}',
  add column if not exists upstream_status integer,
  add column if not exists error_code text,
  add column if not exists error_stage text,
  add column if not exists error_detail text,
  add column if not exists raw_output text;
comment on column public.score_tracker_paper_reviews.attempts is 'Service-only per-attempt HTTP, timing, token usage, parsing and retry diagnostics; no credentials or images.';
comment on column public.score_tracker_paper_reviews.raw_output is 'Service-only redacted model output (up to 100000 characters), removed with the report. Never returned by the user API.';
-- Existing table-level RLS and revocations also cover these new columns.
