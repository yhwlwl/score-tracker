-- One disabled, service-only configuration row; no user/group-membership data.
begin;
create table public.score_tracker_community_config (
  id smallint primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 600000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.score_tracker_users(id) on delete set null
);
alter table public.score_tracker_community_config enable row level security;
revoke all on public.score_tracker_community_config from public, anon, authenticated;
grant select, update on public.score_tracker_community_config to service_role;
insert into public.score_tracker_community_config (id) values (1);
comment on table public.score_tracker_community_config is 'Optional WeChat community. Only verified admins can edit; authenticated users receive active QR configuration through the notices function.';
commit;
