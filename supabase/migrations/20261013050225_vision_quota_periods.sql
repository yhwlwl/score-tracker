-- All periods reuse the existing UTC daily ledger. Calendar resets remain at
-- 08:00 Asia/Shanghai, preserving old usage without inventing or erasing requests.
create or replace function public.score_tracker_valid_vision_tiers(rules jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  r jsonb; i integer := 0; exams integer; days integer; quota integer; period text; period_rank integer;
  previous_exams integer := -1; previous_days integer := -1; previous_quota integer := 0;
  previous_period text := 'lifetime'; previous_rank integer := 0; amount jsonb;
begin
  if jsonb_typeof(rules) is distinct from 'array' then return false; end if;
  if jsonb_array_length(rules) not between 1 and 8 then return false; end if;
  for r in select value from jsonb_array_elements(rules) loop
    amount := coalesce(r->'quota_limit',r->'daily_limit');
    period := coalesce(r->>'period','day');
    period_rank := case period when 'lifetime' then 0 when 'month' then 1 when 'week' then 2 when 'day' then 3 else -1 end;
    if jsonb_typeof(r) is distinct from 'object'
      or jsonb_typeof(r->'name') is distinct from 'string'
      or length(btrim(r->>'name')) not between 1 and 20
      or jsonb_typeof(r->'min_exams') is distinct from 'number'
      or jsonb_typeof(r->'min_account_days') is distinct from 'number'
      or jsonb_typeof(amount) is distinct from 'number'
      or (r->>'min_exams') !~ '^\d+$' or (r->>'min_account_days') !~ '^\d+$'
      or (amount #>> '{}') !~ '^\d+$' or period_rank < 0
      or (r ? 'period' and jsonb_typeof(r->'period') is distinct from 'string')
      or (r ? 'quota_limit' and r ? 'daily_limit' and r->'quota_limit' is distinct from r->'daily_limit') then return false; end if;
    exams := (r->>'min_exams')::integer; days := (r->>'min_account_days')::integer; quota := (amount #>> '{}')::integer;
    if exams not between 0 and 10000 or days not between 0 and 3650 or quota not between 1 and 1000
      or exams < previous_exams or days < previous_days
      or (i = 0 and (exams <> 0 or days <> 0))
      or (i > 0 and (exams = previous_exams and days = previous_days))
      or (i > 0 and (period_rank < previous_rank or (period = previous_period and quota <= previous_quota))) then return false; end if;
    previous_exams := exams; previous_days := days; previous_quota := quota; previous_period := period; previous_rank := period_rank; i := i + 1;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.score_tracker_ai_configs alter column tier_rules set default
  '[{"name":"初用","min_exams":0,"min_account_days":0,"quota_limit":1,"period":"lifetime","daily_limit":1},{"name":"常用","min_exams":3,"min_account_days":7,"quota_limit":5,"period":"month","daily_limit":5},{"name":"深入","min_exams":10,"min_account_days":14,"quota_limit":10,"period":"week","daily_limit":10},{"name":"长期","min_exams":20,"min_account_days":30,"quota_limit":20,"period":"day","daily_limit":20}]'::jsonb;

-- Replace only the unchanged defaults. Custom thresholds/amounts survive as daily rules.
update public.score_tracker_ai_configs c set tier_rules = case
  when c.tier_rules = '[{"name":"初用","min_exams":0,"min_account_days":0,"daily_limit":10},{"name":"常用","min_exams":3,"min_account_days":7,"daily_limit":20},{"name":"深入","min_exams":10,"min_account_days":14,"daily_limit":35},{"name":"长期","min_exams":20,"min_account_days":30,"daily_limit":50}]'::jsonb
  then '[{"name":"初用","min_exams":0,"min_account_days":0,"quota_limit":1,"period":"lifetime","daily_limit":1},{"name":"常用","min_exams":3,"min_account_days":7,"quota_limit":5,"period":"month","daily_limit":5},{"name":"深入","min_exams":10,"min_account_days":14,"quota_limit":10,"period":"week","daily_limit":10},{"name":"长期","min_exams":20,"min_account_days":30,"quota_limit":20,"period":"day","daily_limit":20}]'::jsonb
  else (select jsonb_agg(r || jsonb_build_object('period',coalesce(r->>'period','day'),'quota_limit',coalesce(r->'quota_limit',r->'daily_limit'),'daily_limit',coalesce(r->'quota_limit',r->'daily_limit')) order by ord)
    from jsonb_array_elements(c.tier_rules) with ordinality t(r,ord)) end;

create index if not exists score_tracker_ai_usage_scope_date_idx on public.score_tracker_ai_usage(scope,usage_date);

create or replace function public.score_tracker_vision_window(p_period text, p_now timestamptz)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare start_date date; end_date date; utc_now timestamp := p_now at time zone 'UTC';
begin
  case p_period
    when 'lifetime' then return jsonb_build_object('start_date',null,'resets_at',null);
    when 'month' then start_date := date_trunc('month',utc_now)::date; end_date := (start_date + interval '1 month')::date;
    when 'week' then start_date := date_trunc('week',utc_now)::date; end_date := start_date + 7;
    when 'day' then start_date := utc_now::date; end_date := start_date + 1;
    else raise exception 'Invalid quota period' using errcode = '22023';
  end case;
  return jsonb_build_object('start_date',start_date,'resets_at',end_date::timestamp at time zone 'UTC');
end;
$$;
revoke all on function public.score_tracker_vision_window(text,timestamptz) from public, anon, authenticated;
grant execute on function public.score_tracker_vision_window(text,timestamptz) to service_role;

create or replace function public.score_tracker_vision_quota(p_user_id uuid, p_consume boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  cfg public.score_tracker_ai_configs%rowtype; account_created timestamptz; account_days integer; exam_count integer;
  rule jsonb; next_rule jsonb := null; tier_name text := '固定额度'; quota_limit integer; period text := 'day';
  usage_day date; quota_window jsonb; start_date date; user_scope text := 'user:' || p_user_id::text;
  user_used bigint := 0; day_used integer := 0; global_used integer := 0; last_request timestamptz;
  retry integer := 0; reason text := null; consumed boolean := false; request_time timestamptz;
begin
  if p_consume then
    -- Stable per-account lock, even when requests straddle midnight/month boundaries.
    perform pg_advisory_xact_lock(hashtextextended('score_tracker_vision:' || p_user_id::text,0));
  end if;
  select created_at into account_created from public.score_tracker_users where id = p_user_id;
  if not found then raise exception 'Unknown user' using errcode = '22023'; end if;
  select * into cfg from public.score_tracker_ai_configs where id = 'score_vision' for share;
  if not found then raise exception 'Missing vision configuration' using errcode = '22023'; end if;
  request_time := clock_timestamp(); usage_day := (request_time at time zone 'UTC')::date;
  account_days := greatest(0,floor(extract(epoch from (request_time - account_created))/86400)::integer);
  select count(*)::integer into exam_count from public.score_tracker_exams e where e.user_id = p_user_id
    and exists(select 1 from public.score_tracker_scores s where s.exam_id = e.id and s.user_id = p_user_id and s.actual_score is not null);
  quota_limit := cfg.daily_limit;
  if cfg.tier_enabled then
    for rule in select value from jsonb_array_elements(cfg.tier_rules) loop
      if exam_count >= (rule->>'min_exams')::integer and account_days >= (rule->>'min_account_days')::integer then
        quota_limit := coalesce(rule->>'quota_limit',rule->>'daily_limit')::integer; period := coalesce(rule->>'period','day'); tier_name := rule->>'name';
      elsif next_rule is null then next_rule := rule; end if;
    end loop;
  end if;
  quota_window := public.score_tracker_vision_window(period,request_time); start_date := (quota_window->>'start_date')::date;
  if p_consume then
    insert into public.score_tracker_ai_usage(usage_date,scope) values(usage_day,'global'),(usage_day,user_scope) on conflict do nothing;
    select request_count into global_used from public.score_tracker_ai_usage where usage_date = usage_day and scope = 'global' for update;
    select request_count into day_used from public.score_tracker_ai_usage where usage_date = usage_day and scope = user_scope for update;
  else
    select request_count into global_used from public.score_tracker_ai_usage where usage_date = usage_day and scope = 'global';
    select request_count into day_used from public.score_tracker_ai_usage where usage_date = usage_day and scope = user_scope;
  end if;
  select coalesce(sum(request_count) filter(where start_date is null or usage_date >= start_date),0),max(last_requested_at)
    into user_used,last_request from public.score_tracker_ai_usage where scope = user_scope and usage_date <= usage_day;
  day_used := coalesce(day_used,0); global_used := coalesce(global_used,0);
  if last_request is not null then retry := greatest(0,ceil(cfg.cooldown_seconds - extract(epoch from (clock_timestamp() - last_request)))::integer); end if;
  if not cfg.enabled then reason := 'vision_disabled';
  elsif global_used >= cfg.global_daily_limit then reason := 'global_limit';
  elsif user_used >= quota_limit then reason := case when period = 'day' then 'daily_limit' else 'period_limit' end;
  elsif retry > 0 then reason := 'cooldown'; end if;
  if p_consume and reason is null then
    update public.score_tracker_ai_usage set request_count = request_count + 1,last_requested_at = clock_timestamp()
      where usage_date = usage_day and scope in ('global',user_scope);
    user_used := user_used + 1; day_used := day_used + 1; global_used := global_used + 1; consumed := true; retry := cfg.cooldown_seconds;
  end if;
  return jsonb_build_object('allowed',reason is null,'reason',reason,'consumed',consumed,'retry_after_seconds',retry,
    'limit',quota_limit,'used',user_used,'daily_used',day_used,'remaining',greatest(0,quota_limit-user_used),'period',period,
    'period_start',start_date,'resets_at',quota_window->'resets_at','global_resets_at',(usage_day+1)::timestamp at time zone 'UTC',
    'global_remaining',greatest(0,cfg.global_daily_limit-global_used),'service_enabled',cfg.enabled,
    'tier_enabled',cfg.tier_enabled,'tier_name',tier_name,'valid_exams',exam_count,'account_days',account_days,
    'next_tier',next_rule,'tiers',case when cfg.tier_enabled then cfg.tier_rules else '[]'::jsonb end);
end;
$$;

create or replace function public.claim_score_tracker_ai_request(p_user_id uuid,p_daily_limit integer,p_global_daily_limit integer,p_cooldown_seconds integer)
returns table(allowed boolean,reason text,retry_after_seconds integer,user_count integer,global_count integer)
language plpgsql security invoker set search_path = '' as $$
declare q jsonb; cap integer;
begin
  q := public.score_tracker_vision_quota(p_user_id,true);
  select global_daily_limit into cap from public.score_tracker_ai_configs where id = 'score_vision';
  return query select (q->>'allowed')::boolean,q->>'reason',(q->>'retry_after_seconds')::integer,
    (q->>'daily_used')::integer,cap-(q->>'global_remaining')::integer;
end;
$$;
revoke all on function public.score_tracker_valid_vision_tiers(jsonb) from public, anon, authenticated;
revoke all on function public.score_tracker_vision_quota(uuid,boolean) from public, anon, authenticated;
revoke all on function public.claim_score_tracker_ai_request(uuid,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.score_tracker_valid_vision_tiers(jsonb),public.score_tracker_vision_quota(uuid,boolean),public.claim_score_tracker_ai_request(uuid,integer,integer,integer) to service_role;
