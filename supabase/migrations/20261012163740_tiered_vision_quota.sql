-- Keep existing usage and UTC day boundaries; the frontend displays the reset time.
create or replace function public.score_tracker_valid_vision_tiers(rules jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  r jsonb; i integer := 0; exams integer; days integer; quota integer;
  previous_exams integer := -1; previous_days integer := -1; previous_quota integer := 0;
begin
  if jsonb_typeof(rules) is distinct from 'array' then return false; end if;
  if jsonb_array_length(rules) not between 1 and 8 then return false; end if;
  for r in select value from jsonb_array_elements(rules) loop
    if jsonb_typeof(r) is distinct from 'object'
      or jsonb_typeof(r->'name') is distinct from 'string'
      or length(btrim(r->>'name')) not between 1 and 20
      or jsonb_typeof(r->'min_exams') is distinct from 'number'
      or jsonb_typeof(r->'min_account_days') is distinct from 'number'
      or jsonb_typeof(r->'daily_limit') is distinct from 'number'
      or (r->>'min_exams') !~ '^\d+$'
      or (r->>'min_account_days') !~ '^\d+$'
      or (r->>'daily_limit') !~ '^\d+$' then return false; end if;
    exams := (r->>'min_exams')::integer;
    days := (r->>'min_account_days')::integer;
    quota := (r->>'daily_limit')::integer;
    if exams not between 0 and 10000 or days not between 0 and 3650 or quota not between 1 and 1000
      or exams < previous_exams or days < previous_days or quota <= previous_quota
      or (i = 0 and (exams <> 0 or days <> 0))
      or (i > 0 and exams = previous_exams and days = previous_days) then return false; end if;
    previous_exams := exams; previous_days := days; previous_quota := quota; i := i + 1;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function public.score_tracker_valid_vision_tiers(jsonb) from public, anon, authenticated;
grant execute on function public.score_tracker_valid_vision_tiers(jsonb) to service_role;

alter table public.score_tracker_ai_configs
  add column tier_enabled boolean not null default true,
  add column tier_rules jsonb not null default '[{"name":"初用","min_exams":0,"min_account_days":0,"daily_limit":10},{"name":"常用","min_exams":3,"min_account_days":7,"daily_limit":20},{"name":"深入","min_exams":10,"min_account_days":14,"daily_limit":35},{"name":"长期","min_exams":20,"min_account_days":30,"daily_limit":50}]'::jsonb,
  add constraint score_tracker_ai_valid_tiers check (public.score_tracker_valid_vision_tiers(tier_rules));

create or replace function public.score_tracker_vision_quota(p_user_id uuid, p_consume boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  cfg public.score_tracker_ai_configs%rowtype;
  account_created timestamptz; account_days integer; exam_count integer;
  rule jsonb; next_rule jsonb := null; tier_name text := '固定额度';
  daily integer; global_limit integer; cooldown integer;
  usage_day date := (clock_timestamp() at time zone 'UTC')::date;
  user_scope text := 'user:' || p_user_id::text;
  user_used integer := 0; global_used integer := 0; last_request timestamptz;
  retry integer := 0; reason text := null; consumed boolean := false;
begin
  select created_at into account_created from public.score_tracker_users where id = p_user_id;
  if not found then raise exception 'Unknown user' using errcode = '22023'; end if;
  select * into cfg from public.score_tracker_ai_configs where id = 'score_vision' for share;
  if not found then raise exception 'Missing vision configuration' using errcode = '22023'; end if;
  account_days := greatest(0, floor(extract(epoch from (clock_timestamp() - account_created)) / 86400)::integer);
  select count(*)::integer into exam_count from public.score_tracker_exams e
  where e.user_id = p_user_id and exists (
    select 1 from public.score_tracker_scores s
    where s.exam_id = e.id and s.user_id = p_user_id and s.actual_score is not null
  );
  daily := cfg.daily_limit; global_limit := cfg.global_daily_limit; cooldown := cfg.cooldown_seconds;
  if cfg.tier_enabled then
    for rule in select value from jsonb_array_elements(cfg.tier_rules) loop
      if exam_count >= (rule->>'min_exams')::integer and account_days >= (rule->>'min_account_days')::integer then
        daily := (rule->>'daily_limit')::integer; tier_name := rule->>'name';
      elsif next_rule is null then next_rule := rule; end if;
    end loop;
  end if;

  if p_consume then
    insert into public.score_tracker_ai_usage(usage_date,scope) values (usage_day,'global'),(usage_day,user_scope)
    on conflict do nothing;
    -- Always lock global first, then the account: concurrent tabs cannot overspend.
    select request_count into global_used from public.score_tracker_ai_usage
      where usage_date = usage_day and scope = 'global' for update;
    select request_count,last_requested_at into user_used,last_request from public.score_tracker_ai_usage
      where usage_date = usage_day and scope = user_scope for update;
  else
    select request_count into global_used from public.score_tracker_ai_usage where usage_date = usage_day and scope = 'global';
    select request_count,last_requested_at into user_used,last_request from public.score_tracker_ai_usage where usage_date = usage_day and scope = user_scope;
  end if;
  user_used := coalesce(user_used,0); global_used := coalesce(global_used,0);
  if last_request is not null then
    retry := greatest(0, ceil(cooldown - extract(epoch from (clock_timestamp() - last_request)))::integer);
  end if;
  if not cfg.enabled then reason := 'vision_disabled';
  elsif global_used >= global_limit then reason := 'global_limit';
  elsif user_used >= daily then reason := 'daily_limit';
  elsif retry > 0 then reason := 'cooldown'; end if;
  if p_consume and reason is null then
    update public.score_tracker_ai_usage set request_count = request_count + 1, last_requested_at = clock_timestamp()
      where usage_date = usage_day and scope in ('global',user_scope);
    user_used := user_used + 1; global_used := global_used + 1; consumed := true; retry := cooldown;
  end if;
  return jsonb_build_object(
    'allowed',reason is null,'reason',reason,'consumed',consumed,'retry_after_seconds',retry,
    'limit',daily,'used',user_used,'remaining',greatest(0,daily-user_used),
    'global_remaining',greatest(0,global_limit-global_used),'service_enabled',cfg.enabled,
    'tier_enabled',cfg.tier_enabled,'tier_name',tier_name,'valid_exams',exam_count,'account_days',account_days,
    'next_tier',next_rule,'tiers',case when cfg.tier_enabled then cfg.tier_rules else '[]'::jsonb end,
    'resets_at',(usage_day + 1)::timestamp at time zone 'UTC'
  );
end;
$$;
revoke all on function public.score_tracker_vision_quota(uuid,boolean) from public, anon, authenticated;
grant execute on function public.score_tracker_vision_quota(uuid,boolean) to service_role;

-- Preserve the old contract for already deployed clients/functions; trust stored policy.
create or replace function public.claim_score_tracker_ai_request(
  p_user_id uuid, p_daily_limit integer, p_global_daily_limit integer, p_cooldown_seconds integer
) returns table(allowed boolean,reason text,retry_after_seconds integer,user_count integer,global_count integer)
language plpgsql security invoker set search_path = '' as $$
declare q jsonb; cap integer;
begin
  q := public.score_tracker_vision_quota(p_user_id,true);
  select global_daily_limit into cap from public.score_tracker_ai_configs where id = 'score_vision';
  return query select (q->>'allowed')::boolean,q->>'reason',(q->>'retry_after_seconds')::integer,
    (q->>'used')::integer,cap-(q->>'global_remaining')::integer;
end;
$$;
revoke all on function public.claim_score_tracker_ai_request(uuid,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_score_tracker_ai_request(uuid,integer,integer,integer) to service_role;
