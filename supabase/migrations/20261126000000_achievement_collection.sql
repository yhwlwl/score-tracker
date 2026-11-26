-- Private, immutable award evidence. Application custom-session auth is performed in the Edge Function.
create table public.score_tracker_achievement_awards (
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  badge_id text not null check (badge_id ~ '^[a-z0-9-]{1,64}$'),
  rule_version integer not null check (rule_version > 0),
  awarded_at timestamptz not null default now(),
  seen_at timestamptz,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  primary key (user_id,badge_id)
);
alter table public.score_tracker_achievement_awards enable row level security;
revoke all on public.score_tracker_achievement_awards from public, anon, authenticated;
grant select,insert,update on public.score_tracker_achievement_awards to service_role;
create table public.score_tracker_achievement_scan (
  user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
  last_attempt_at timestamptz not null default now()
);
alter table public.score_tracker_achievement_scan enable row level security;
revoke all on public.score_tracker_achievement_scan from public,anon,authenticated;
grant select,insert,update on public.score_tracker_achievement_scan to service_role;
create function public.score_tracker_achievement_claim_scan(p_user uuid)
returns boolean language sql volatile security invoker set search_path='' as $$
  with claimed as (
    insert into public.score_tracker_achievement_scan(user_id,last_attempt_at) values(p_user,now())
    on conflict(user_id) do update set last_attempt_at=excluded.last_attempt_at
    where public.score_tracker_achievement_scan.last_attempt_at < now()-interval '60 seconds'
    returning user_id
  ) select exists(select 1 from claimed);
$$;
revoke all on function public.score_tracker_achievement_claim_scan(uuid) from public,anon,authenticated;
grant execute on function public.score_tracker_achievement_claim_scan(uuid) to service_role;
-- Reserved for real pre-result predictions; clients cannot create or modify these snapshots.
create table public.score_tracker_achievement_predictions (
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  prediction_id uuid not null default gen_random_uuid(),
  model text not null,
  context_key text not null,
  frozen_at timestamptz not null default now(),
  history_exam_ids uuid[] not null,
  prediction jsonb not null check(jsonb_typeof(prediction)='object'),
  result_exam_id uuid references public.score_tracker_exams(id) on delete set null,
  primary key(user_id,prediction_id)
);
alter table public.score_tracker_achievement_predictions enable row level security;
revoke all on public.score_tracker_achievement_predictions from public,anon,authenticated;
grant select,insert,update on public.score_tracker_achievement_predictions to service_role;

-- Collection metadata, private per-user preferences and cached aggregate.
create table public.score_tracker_achievement_preferences (
 user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
 favorites text[] not null default '{}'::text[] check(cardinality(favorites)<=3),
 updated_at timestamptz not null default now()
);
alter table public.score_tracker_achievement_preferences enable row level security;
revoke all on public.score_tracker_achievement_preferences from public,anon,authenticated;
grant select,insert,update on public.score_tracker_achievement_preferences to service_role;
create table public.score_tracker_achievement_stats (
 singleton boolean primary key default true check(singleton),
 snapshot_day date not null,
 total bigint not null,
 counts jsonb not null
);
alter table public.score_tracker_achievement_stats enable row level security;
revoke all on public.score_tracker_achievement_stats from public,anon,authenticated;
grant select,insert,update on public.score_tracker_achievement_stats to service_role;
create function public.score_tracker_achievement_stats_daily()
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare d date := (now() at time zone 'Asia/Shanghai')::date; r public.score_tracker_achievement_stats%rowtype;
begin
 select * into r from public.score_tracker_achievement_stats where singleton;
 if r.snapshot_day is distinct from d then
  perform pg_advisory_xact_lock(812426031);
  select * into r from public.score_tracker_achievement_stats where singleton;
  if r.snapshot_day is distinct from d then
   with eligible as (select id from public.score_tracker_users where not coalesce(is_admin,false) and lower(username) not in ('showcase','admin','admin1')),
   by_badge as (select case when a.badge_id='contributor' then 'creator' else a.badge_id end badge_id,count(distinct a.user_id) n from public.score_tracker_achievement_awards a join eligible e on e.id=a.user_id group by 1)
   insert into public.score_tracker_achievement_stats(singleton,snapshot_day,total,counts)
   values(true,d,(select count(*) from eligible),coalesce((select jsonb_object_agg(badge_id,n) from by_badge),'{}'::jsonb))
   on conflict(singleton) do update set snapshot_day=excluded.snapshot_day,total=excluded.total,counts=excluded.counts returning * into r;
  end if;
 end if;
 return jsonb_build_object('day',r.snapshot_day,'total',r.total,'counts',r.counts);
end;
$$;
revoke all on function public.score_tracker_achievement_stats_daily() from public,anon,authenticated;
grant execute on function public.score_tracker_achievement_stats_daily() to service_role;
