alter table public.score_tracker_ai_configs
  add column if not exists base_url text;

update public.score_tracker_ai_configs
set base_url = 'https://openrouter.ai/api/v1'
where base_url is null or btrim(base_url) = '';

alter table public.score_tracker_ai_configs
  alter column base_url set default 'https://openrouter.ai/api/v1';

alter table public.score_tracker_ai_configs
  alter column base_url set not null;
