-- Image-recognition beta access is controlled server-side.
alter table public.score_tracker_ai_configs
  add column if not exists beta_only boolean;

update public.score_tracker_ai_configs
set beta_only = coalesce(beta_only, true)
where id = 'score_vision';

alter table public.score_tracker_ai_configs
  alter column beta_only set default true;

alter table public.score_tracker_ai_configs
  alter column beta_only set not null;

create table if not exists public.score_tracker_ai_beta_users (
  username_key text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.score_tracker_ai_beta_users enable row level security;
revoke all on table public.score_tracker_ai_beta_users from anon, authenticated;

insert into public.score_tracker_ai_beta_users (username_key)
values
  ('showcase'),
  ('kind-river-2839'),
  ('revolution'),
  ('clever-leaf-5022'),
  ('kind-maple-5989'),
  ('kind-river-8378'),
  ('奋笔即睡'),
  ('calm-star-6046'),
  ('neat-maple-8928'),
  ('蒲野'),
  ('jennifer_cang'),
  ('啊_'),
  ('粒裡'),
  ('21zheart'),
  ('calm-star-2987'),
  ('lucky-panda-1661'),
  ('clever-kite-1426'),
  ('sunny-star-3513'),
  ('alwaysgoon'),
  ('踏实的大力花菜'),
  ('eve_19')
on conflict (username_key) do update set enabled = true;
