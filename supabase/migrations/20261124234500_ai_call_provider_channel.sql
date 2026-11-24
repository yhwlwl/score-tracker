-- Record the server-selected upstream at the same time as the budget reservation.
-- Historical requests deliberately remain NULL; model names are not proof of a channel.
alter table public.score_tracker_ai_calls
  add column if not exists provider_channel text check (provider_channel in ('opencode-go','deepseek','openrouter','other'));
create index if not exists score_tracker_ai_calls_recent_idx on public.score_tracker_ai_calls(created_at desc);
create or replace function public.score_tracker_ai_call_reserve_routed(p_user uuid,p_task uuid,p_call text,p_model text,p_max_output integer,p_channel text)
returns jsonb language plpgsql security invoker set search_path to public,pg_temp as $$
declare result jsonb;
begin
 if p_channel is null or p_channel not in ('opencode-go','deepseek','openrouter','other') then
   raise exception 'invalid provider channel';
 end if;
 result:=public.score_tracker_ai_call_reserve(p_user,p_task,p_call,p_model,p_max_output);
 if result->>'allowed'='true' then
   update public.score_tracker_ai_calls set provider_channel=p_channel where id=p_call and task_id=p_task;
   if not found then raise exception 'missing reserved call'; end if;
 end if;
 return result;
end $$;
revoke all on function public.score_tracker_ai_call_reserve_routed(uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.score_tracker_ai_call_reserve_routed(uuid,uuid,text,text,integer,text) to service_role;
