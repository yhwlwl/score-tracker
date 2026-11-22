alter table public.score_tracker_ai_calls
  add column if not exists released_at timestamptz,
  drop constraint score_tracker_ai_calls_status_check,
  add constraint score_tracker_ai_calls_status_check check (status in ('reserved','known','unknown','released'));

-- Explicit administrative release does not assert that upstream usage was zero.
-- Late reconciliation adds known cost without subtracting a reservation twice.
create or replace function public.score_tracker_ai_call_settle(p_user uuid,p_call text,p_usage jsonb,p_provider text default null,p_status integer default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c score_tracker_ai_calls;t score_tracker_ai_tasks;p score_tracker_ai_policy;inp bigint;outp bigint;hit bigint;miss bigint;fee numeric;call_credits numeric;
begin
 select * into c from score_tracker_ai_calls where id=p_call;
 if not found then raise exception 'call_missing';end if;
 perform 1 from score_tracker_ai_budgets where period=c.period for update;
 select * into t from score_tracker_ai_tasks where id=c.task_id and user_id is not distinct from p_user for update;
 if not found then raise exception 'call_owner';end if;
 select * into c from score_tracker_ai_calls where id=p_call for update;
 if c.status='known' then return jsonb_build_object('known',true,'credits',c.credits);end if;
 -- Reasoning is already included in completion_tokens. Cached input is a subset of prompt_tokens.
 if coalesce(p_usage->>'prompt_tokens','')!~'^[0-9]+$' or coalesce(p_usage->>'completion_tokens','')!~'^[0-9]+$' then
  update score_tracker_ai_calls set status=case when c.status='released' then 'released' else 'unknown' end,raw_usage=p_usage,provider_request_id=left(p_provider,240),http_status=p_status where id=p_call;
  return jsonb_build_object('known',false);
 end if;
 inp:=(p_usage->>'prompt_tokens')::bigint;outp:=(p_usage->>'completion_tokens')::bigint;
 if inp>1000000 or outp>c.max_output then raise exception 'usage_out_of_bounds';end if;
 hit:=null;
 if coalesce(p_usage->>'prompt_cache_hit_tokens',p_usage#>>'{prompt_tokens_details,cached_tokens}','')~'^[0-9]+$' then
  hit:=coalesce(p_usage->>'prompt_cache_hit_tokens',p_usage#>>'{prompt_tokens_details,cached_tokens}')::bigint;
  if hit>inp then hit:=null;end if;
 elsif coalesce(p_usage->>'prompt_cache_miss_tokens','')~'^[0-9]+$' and(p_usage->>'prompt_cache_miss_tokens')::bigint<=inp then
  hit:=inp-(p_usage->>'prompt_cache_miss_tokens')::bigint;
 end if;
 if hit is not null and coalesce(p_usage->>'prompt_cache_miss_tokens','')~'^[0-9]+$' and hit+(p_usage->>'prompt_cache_miss_tokens')::bigint<>inp then hit:=null;end if;
 miss:=case when hit is null then inp else inp-hit end;
 select * into p from score_tracker_ai_policy where id;
 fee:=((coalesce(hit,0)*c.cache_rate+miss*c.input_rate+outp*c.output_rate)/1000000)*c.cost_multiplier;
 if fee>c.reserved_cny then raise exception 'usage_exceeds_reservation';end if;
 call_credits:=(coalesce(hit,0)*c.cache_rate+miss*c.input_rate+outp*c.output_rate)/1000;
 update score_tracker_ai_calls set status='known',cost_cny=fee,credits=call_credits,prompt_tokens=inp,completion_tokens=outp,cache_hit_tokens=hit,cache_miss_tokens=case when hit is null then null else miss end,
  reasoning_tokens=case when coalesce(p_usage#>>'{completion_tokens_details,reasoning_tokens}',p_usage->>'reasoning_tokens','')~'^[0-9]+$' then least(outp,coalesce(p_usage#>>'{completion_tokens_details,reasoning_tokens}',p_usage->>'reasoning_tokens')::bigint) else null end,
  raw_usage=p_usage,provider_request_id=left(p_provider,240),http_status=p_status,settled_at=now() where id=p_call;
 update score_tracker_ai_budgets set reserved_cny=greatest(0,reserved_cny-case when c.status='released' then 0 else c.reserved_cny end),spent_cny=spent_cny+fee where period=c.period;
 update score_tracker_ai_tasks set spent_credits=spent_credits+call_credits where id=t.id;
 return jsonb_build_object('known',true,'credits',call_credits);
end $$;
