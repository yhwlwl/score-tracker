create table if not exists public.score_tracker_ai_usage (
  usage_date date not null,
  scope text not null,
  request_count integer not null default 0 check (request_count >= 0),
  last_requested_at timestamptz,
  primary key (usage_date, scope)
);

alter table public.score_tracker_ai_usage enable row level security;
revoke all on table public.score_tracker_ai_usage from anon, authenticated;

create or replace function public.claim_score_tracker_ai_request(
  p_user_id uuid,
  p_daily_limit integer,
  p_global_daily_limit integer,
  p_cooldown_seconds integer
)
returns table (
  allowed boolean,
  reason text,
  retry_after_seconds integer,
  user_count integer,
  global_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := current_date;
  v_now timestamptz := clock_timestamp();
  v_user_scope text;
  v_user_count integer;
  v_global_count integer;
  v_last_requested_at timestamptz;
  v_retry_after integer;
begin
  if p_user_id is null then
    return query select false, 'invalid_user', 0, 0, 0;
    return;
  end if;

  v_user_scope := 'user:' || p_user_id::text;

  insert into public.score_tracker_ai_usage (usage_date, scope)
  values (v_date, 'global')
  on conflict (usage_date, scope) do nothing;

  insert into public.score_tracker_ai_usage (usage_date, scope)
  values (v_date, v_user_scope)
  on conflict (usage_date, scope) do nothing;

  select request_count
    into v_global_count
    from public.score_tracker_ai_usage
   where usage_date = v_date and scope = 'global'
   for update;

  select request_count, last_requested_at
    into v_user_count, v_last_requested_at
    from public.score_tracker_ai_usage
   where usage_date = v_date and scope = v_user_scope
   for update;

  if v_global_count >= greatest(coalesce(p_global_daily_limit, 100), 1) then
    return query select false, 'global_limit', 0, v_user_count, v_global_count;
    return;
  end if;

  if v_user_count >= greatest(coalesce(p_daily_limit, 10), 1) then
    return query select false, 'daily_limit', 0, v_user_count, v_global_count;
    return;
  end if;

  if v_last_requested_at is not null
     and v_last_requested_at > v_now - make_interval(secs => greatest(coalesce(p_cooldown_seconds, 15), 0)) then
    v_retry_after := greatest(1, ceil(extract(epoch from (
      v_last_requested_at + make_interval(secs => greatest(coalesce(p_cooldown_seconds, 15), 0)) - v_now
    )))::integer);
    return query select false, 'cooldown', v_retry_after, v_user_count, v_global_count;
    return;
  end if;

  update public.score_tracker_ai_usage
     set request_count = request_count + 1,
         last_requested_at = v_now
   where usage_date = v_date and scope = 'global';

  update public.score_tracker_ai_usage
     set request_count = request_count + 1,
         last_requested_at = v_now
   where usage_date = v_date and scope = v_user_scope;

  return query select true, 'allowed', 0, v_user_count + 1, v_global_count + 1;
end;
$$;

revoke all on function public.claim_score_tracker_ai_request(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_score_tracker_ai_request(uuid, integer, integer, integer) to service_role;
