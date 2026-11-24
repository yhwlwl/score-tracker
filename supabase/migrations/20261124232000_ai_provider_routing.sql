-- Admin-managed independent channels and sanitized server-side probe evidence.
alter table public.score_tracker_ai_configs
  add column if not exists study_provider text check (study_provider in ('legacy','deepseek','opencode-go')),
  add column if not exists vision_provider text check (vision_provider in ('legacy','deepseek','opencode-go')),
  add column if not exists go_test jsonb;
-- Existing configuration, RLS and service-role access remain unchanged; null preserves env defaults.
