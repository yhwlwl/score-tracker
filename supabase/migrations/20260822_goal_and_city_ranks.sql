-- 20260822_goal_and_city_ranks.sql
-- 1) 长期目标档案:每用户一行,客户端全量读写
-- 2) 市/区排名(仅总分层面,选填):列可空,不填即无
alter table score_tracker_exams
  add column if not exists city_rank integer,
  add column if not exists city_participants integer,
  add column if not exists district_rank integer,
  add column if not exists district_participants integer;

create table if not exists score_tracker_user_goals (
  user_id uuid primary key references score_tracker_users(id) on delete cascade,
  subject_goals jsonb not null default '{}'::jsonb,
  total_goal numeric(10,2),
  dream_school text,
  exam_date date,
  date_name text,
  updated_at timestamptz not null default now()
);

-- 客户端仅经 Edge Function(service role)访问;关闭直连面
alter table score_tracker_user_goals enable row level security;
