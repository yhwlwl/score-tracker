-- Real model diagnostics use a separate, non-refundable budget.
-- Automatic readiness checks must never call the provider or consume recognition quota.
create table public.score_tracker_vision_connectivity_requests (
  request_id uuid primary key,
  user_id uuid references public.score_tracker_users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  model text not null,
  provider_host text not null,
  http_status integer,
  upstream_status integer,
  error_code text,
  duration_ms integer,
  attempts jsonb not null default '[]'::jsonb check (jsonb_typeof(attempts) = 'array')
);
create index score_tracker_vision_connectivity_created_idx
  on public.score_tracker_vision_connectivity_requests(created_at desc);
create index score_tracker_vision_connectivity_user_created_idx
  on public.score_tracker_vision_connectivity_requests(user_id,created_at desc);
alter table public.score_tracker_vision_connectivity_requests enable row level security;
revoke all on public.score_tracker_vision_connectivity_requests from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_vision_connectivity_requests to service_role;

create function public.score_tracker_vision_connectivity_reserve(
  p_user_id uuid,p_request_id uuid,p_model text,p_provider_host text
) returns jsonb language plpgsql security invoker set search_path = '' as $function$
declare
  request_time timestamptz;
  day_start timestamptz;
  existing_user uuid;
  user_used integer;
  global_used integer;
  user_last timestamptz;
  global_last timestamptz;
  running_since timestamptz;
  retry integer := 0;
  reason text;
begin
  -- A deleted account must not erase the global budget or audit history.
  -- One stable global lock serializes checks and inserts, including across UTC midnight.
  perform pg_advisory_xact_lock(hashtextextended('score_tracker_vision_connectivity',0));
  request_time := clock_timestamp();
  day_start := date_trunc('day',request_time at time zone 'UTC') at time zone 'UTC';
  select user_id into existing_user from public.score_tracker_vision_connectivity_requests where request_id=p_request_id;
  if found then
    return jsonb_build_object('allowed',false,'reason',case when existing_user=p_user_id then 'duplicate_request' else 'request_id_conflict' end);
  end if;
  if not exists(select 1 from public.score_tracker_users where id=p_user_id) then
    raise exception 'Unknown user' using errcode='22023';
  end if;
  select count(*)::integer into user_used from public.score_tracker_vision_connectivity_requests where user_id=p_user_id and created_at>=day_start;
  select count(*)::integer into global_used from public.score_tracker_vision_connectivity_requests where created_at>=day_start;
  select max(created_at) into user_last from public.score_tracker_vision_connectivity_requests where user_id=p_user_id;
  select max(created_at) into global_last from public.score_tracker_vision_connectivity_requests;
  select max(created_at) into running_since from public.score_tracker_vision_connectivity_requests
    where status='running' and created_at>request_time-interval '20 seconds';
  if global_used>=50 then reason:='global_daily_limit';
  elsif user_used>=3 then reason:='user_daily_limit';
  elsif user_last>request_time-interval '60 seconds' then
    reason:='cooldown';retry:=greatest(1,ceil(extract(epoch from(user_last+interval '60 seconds'-request_time)))::integer);
  elsif running_since is not null then
    reason:='in_flight';retry:=greatest(1,ceil(extract(epoch from(running_since+interval '20 seconds'-request_time)))::integer);
  elsif global_last>request_time-interval '2 seconds' then
    reason:='global_cooldown';retry:=2;
  end if;
  if reason in ('global_daily_limit','user_daily_limit') then
    retry:=greatest(1,ceil(extract(epoch from(day_start+interval '1 day'-request_time)))::integer);
  end if;
  if reason is null then
    insert into public.score_tracker_vision_connectivity_requests(request_id,user_id,model,provider_host)
      values(p_request_id,p_user_id,left(p_model,200),left(p_provider_host,255));
    user_used:=user_used+1;global_used:=global_used+1;
  end if;
  return jsonb_build_object('allowed',reason is null,'reason',reason,'limit',3,'used',user_used,
    'remaining',greatest(0,3-user_used),'global_limit',50,'global_used',global_used,
    'global_remaining',greatest(0,50-global_used),'retry_after_seconds',retry,'resets_at',day_start+interval '1 day');
end;
$function$;
revoke all on function public.score_tracker_vision_connectivity_reserve(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_vision_connectivity_reserve(uuid,uuid,text,text) to service_role;
