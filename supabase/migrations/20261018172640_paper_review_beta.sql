-- Entirely additive: the released score APIs, tables, triggers and vision quotas
-- do not reference these objects. Only the new authenticated Edge Function does.
create table public.score_tracker_paper_settings (
  id text primary key check (id = 'default'),
  enabled boolean not null default false,
  api_key text,
  base_url text not null default 'https://openrouter.ai/api/v1',
  model text not null,
  user_daily_limit integer not null default 3 check (user_daily_limit between 0 and 20),
  global_daily_limit integer not null default 20 check (global_daily_limit between 0 and 200),
  cooldown_seconds integer not null default 60 check (cooldown_seconds between 0 and 3600)
);
-- Snapshot the provider configuration once; never update the existing vision row.
-- Credentials stay in this server-only table and are never returned to clients.
insert into public.score_tracker_paper_settings(id,enabled,api_key,base_url,model)
select 'default',enabled,openrouter_api_key,base_url,model
from public.score_tracker_ai_configs where id='score_vision';

create table public.score_tracker_paper_reviews (
  request_id uuid primary key,
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  draft_id uuid not null,
  exam_id uuid references public.score_tracker_exams(id) on delete cascade,
  subject text not null check (length(subject) between 1 and 40),
  fingerprint text not null,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  result jsonb,
  corrections jsonb not null default '[]' check (jsonb_typeof(corrections)='array'),
  revision integer not null default 0,
  error_message text,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  check (result is null or jsonb_typeof(result)='object')
);
create index score_tracker_paper_reviews_exam_idx on public.score_tracker_paper_reviews(user_id,exam_id,subject,created_at desc);
create index score_tracker_paper_reviews_draft_idx on public.score_tracker_paper_reviews(user_id,draft_id,subject,created_at desc);
create index score_tracker_paper_reviews_exam_fk_idx on public.score_tracker_paper_reviews(exam_id) where exam_id is not null;
-- Retain only aggregate counts when a user deletes a report: deletion must not
-- reset quotas. No uploaded images or original provider output are stored.
create table public.score_tracker_paper_usage (
  usage_date date not null,
  scope text not null,
  request_count integer not null default 0 check (request_count>=0),
  last_requested_at timestamptz,
  primary key (usage_date,scope)
);
alter table public.score_tracker_paper_settings enable row level security;
alter table public.score_tracker_paper_reviews enable row level security;
alter table public.score_tracker_paper_usage enable row level security;
revoke all on public.score_tracker_paper_settings,public.score_tracker_paper_reviews,public.score_tracker_paper_usage from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_paper_settings,public.score_tracker_paper_reviews,public.score_tracker_paper_usage to service_role;

create function public.score_tracker_paper_quota(p_user_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cfg public.score_tracker_paper_settings%rowtype; used integer; total integer; last_at timestamptz;
  today date := (now() at time zone 'Asia/Shanghai')::date; wait_seconds integer;
begin
  select * into cfg from public.score_tracker_paper_settings where id='default';
  select request_count,last_requested_at into used,last_at from public.score_tracker_paper_usage where usage_date=today and scope='user:'||p_user_id::text;
  select request_count into total from public.score_tracker_paper_usage where usage_date=today and scope='global';
  used:=coalesce(used,0); total:=coalesce(total,0);
  wait_seconds:=greatest(0,ceil(extract(epoch from last_at + make_interval(secs=>cfg.cooldown_seconds)-now()))::integer);
  return jsonb_build_object('enabled',coalesce(cfg.enabled,false),'limit',coalesce(cfg.user_daily_limit,0),
    'used',used,'remaining',greatest(0,coalesce(cfg.user_daily_limit,0)-used),
    'global_available',total<coalesce(cfg.global_daily_limit,0),'retry_after_seconds',wait_seconds,
    'resets_at',(today+1)::timestamp at time zone 'Asia/Shanghai');
end;
$$;

create function public.score_tracker_paper_reserve(p_user_id uuid,p_request_id uuid,p_draft_id uuid,p_exam_id uuid,p_subject text,p_fingerprint text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.score_tracker_paper_reviews%rowtype; q jsonb;
  today date := (clock_timestamp() at time zone 'Asia/Shanghai')::date;
begin
  -- One short transaction serializes both the global cap and per-user caps.
  perform pg_advisory_xact_lock(hashtextextended('score_tracker_paper_review_reservation',0));
  select * into r from public.score_tracker_paper_reviews where request_id=p_request_id;
  if found then
    if r.user_id<>p_user_id or r.fingerprint<>p_fingerprint then
      return jsonb_build_object('allowed',false,'reason','conflict','message','分析编号已使用，请重新开始');
    end if;
    return jsonb_build_object('allowed',true,'created',false,'quota',public.score_tracker_paper_quota(p_user_id));
  end if;
  if p_exam_id is not null and not exists(select 1 from public.score_tracker_exams where id=p_exam_id and user_id=p_user_id) then
    raise exception 'Exam ownership mismatch' using errcode='42501';
  end if;
  q:=public.score_tracker_paper_quota(p_user_id);
  if not (q->>'enabled')::boolean then return jsonb_build_object('allowed',false,'reason','disabled','message','试卷分析暂未开放','quota',q); end if;
  if (q->>'remaining')::integer<=0 then return jsonb_build_object('allowed',false,'reason','user_limit','message','今日试卷分析次数已用完，明天再来','quota',q); end if;
  if not (q->>'global_available')::boolean then return jsonb_build_object('allowed',false,'reason','global_limit','message','今日试用名额已满，明天再来','quota',q); end if;
  if (q->>'retry_after_seconds')::integer>0 then return jsonb_build_object('allowed',false,'reason','cooldown','message','刚刚开始过分析，请稍等一分钟','quota',q); end if;
  insert into public.score_tracker_paper_reviews(request_id,user_id,draft_id,exam_id,subject,fingerprint)
    values(p_request_id,p_user_id,p_draft_id,p_exam_id,p_subject,p_fingerprint);
  insert into public.score_tracker_paper_usage(usage_date,scope,request_count,last_requested_at)
    values(today,'user:'||p_user_id::text,1,clock_timestamp()),(today,'global',1,clock_timestamp())
    on conflict(usage_date,scope) do update set request_count=public.score_tracker_paper_usage.request_count+1,last_requested_at=excluded.last_requested_at;
  return jsonb_build_object('allowed',true,'created',true,'quota',public.score_tracker_paper_quota(p_user_id));
end;
$$;
revoke all on function public.score_tracker_paper_quota(uuid) from public,anon,authenticated;
revoke all on function public.score_tracker_paper_reserve(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_paper_quota(uuid) to service_role;
grant execute on function public.score_tracker_paper_reserve(uuid,uuid,uuid,uuid,text,text) to service_role;
