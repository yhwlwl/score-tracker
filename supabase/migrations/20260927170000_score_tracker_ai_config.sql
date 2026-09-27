-- Server-only configuration for student score image recognition.
create table if not exists public.score_tracker_ai_configs (
  id text primary key default 'score_vision',
  provider text not null default 'openrouter' check (provider = 'openrouter'),
  openrouter_api_key text,
  model text not null default 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.score_tracker_users(id) on delete set null
);

comment on table public.score_tracker_ai_configs is
  'Server-only AI provider configuration. Never expose this table to browser clients.';

alter table public.score_tracker_ai_configs enable row level security;
revoke all on table public.score_tracker_ai_configs from anon, authenticated;
