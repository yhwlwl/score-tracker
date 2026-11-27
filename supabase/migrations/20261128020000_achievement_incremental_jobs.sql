-- Durable, coalesced jobs; no public access or full-population scans.
create table public.score_tracker_achievement_jobs(
 user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
 generation bigint not null default 1,
 replay_needed boolean not null default true,
 due_at timestamptz not null default now()+interval '20 seconds',
 attempts integer not null default 0,
 lease uuid unique,
 lease_until timestamptz,
 started boolean not null default false,
 leased_generation bigint,
 last_error text
);
alter table public.score_tracker_achievement_jobs enable row level security;
revoke all on public.score_tracker_achievement_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_achievement_jobs to service_role;
create index st_achievement_jobs_due on public.score_tracker_achievement_jobs(due_at);

create function public.st_achievement_enqueue_changes() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 -- Goal-only changes do not invalidate trajectory predictions. Statement-level
 -- transition tables coalesce multi-score inserts into one job per account.
 if tg_op='DELETE' then
  insert into public.score_tracker_achievement_jobs(user_id,replay_needed)
  select distinct x.user_id,tg_table_name<>'score_tracker_user_goals'
  from old_rows x join public.score_tracker_users u on u.id=x.user_id
  on conflict(user_id) do update set generation=public.score_tracker_achievement_jobs.generation+1,
    replay_needed=public.score_tracker_achievement_jobs.replay_needed or excluded.replay_needed,
    due_at=now()+interval '20 seconds',attempts=0,last_error=null;
 else
  insert into public.score_tracker_achievement_jobs(user_id,replay_needed)
  select distinct x.user_id,tg_table_name<>'score_tracker_user_goals'
  from new_rows x join public.score_tracker_users u on u.id=x.user_id
  on conflict(user_id) do update set generation=public.score_tracker_achievement_jobs.generation+1,
    replay_needed=public.score_tracker_achievement_jobs.replay_needed or excluded.replay_needed,
    due_at=now()+interval '20 seconds',attempts=0,last_error=null;
 end if;
 return null;
end $$;
do $$
declare t text;
begin
 foreach t in array array['score_tracker_exams','score_tracker_scores','score_tracker_user_goals','score_tracker_trajectory_sharing'] loop
  execute format('create trigger st_achievement_enqueue_insert after insert on public.%I referencing new table as new_rows for each statement execute function public.st_achievement_enqueue_changes()',t);
  execute format('create trigger st_achievement_enqueue_update after update on public.%I referencing new table as new_rows for each statement execute function public.st_achievement_enqueue_changes()',t);
  execute format('create trigger st_achievement_enqueue_delete after delete on public.%I referencing old table as old_rows for each statement execute function public.st_achievement_enqueue_changes()',t);
 end loop;
end $$;
-- A short-lived, single-use capability selects only an already queued job.
-- No user ID or reusable service key is sent through pg_net.
create function public.st_achievement_job_claim(p_lease uuid) returns jsonb
language sql volatile security invoker set search_path='' as $$
 with x as (update public.score_tracker_achievement_jobs
 set started=true where lease=p_lease and not started and lease_until>now()
 returning user_id,leased_generation,replay_needed)
 select to_jsonb(x) from x
$$;
create function public.st_achievement_job_finish(p_lease uuid,p_more boolean,p_error boolean) returns boolean
language plpgsql security invoker set search_path='' as $$
declare j public.score_tracker_achievement_jobs%rowtype;
begin
 select * into j from public.score_tracker_achievement_jobs where lease=p_lease and started for update;
 if not found then return false; end if;
 if j.generation<>j.leased_generation then
  update public.score_tracker_achievement_jobs set lease=null,lease_until=null,started=false,leased_generation=null where user_id=j.user_id;
 elsif p_error then
  update public.score_tracker_achievement_jobs set lease=null,lease_until=null,started=false,leased_generation=null,
   attempts=attempts+1,last_error='worker_failed',
   due_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6))::int))
  where user_id=j.user_id;
 elsif p_more then
  update public.score_tracker_achievement_jobs set lease=null,lease_until=null,started=false,leased_generation=null,attempts=0,last_error=null,due_at=now() where user_id=j.user_id;
 else
  delete from public.score_tracker_achievement_jobs where user_id=j.user_id;
 end if;
 return true;
end $$;
-- Up to two independent accounts per minute, zero HTTP calls on empty queue.
create function public.st_achievement_dispatch(p_url text) returns integer
language plpgsql security invoker set search_path='' as $$
declare j record; n int:=0; token uuid;
begin
 for j in select user_id from public.score_tracker_achievement_jobs
   where due_at<=now() and (lease is null or lease_until<=now())
   order by due_at,user_id limit 2 for update skip locked loop
  token:=gen_random_uuid();
  update public.score_tracker_achievement_jobs set lease=token,lease_until=now()+interval '4 minutes',started=false,leased_generation=generation where user_id=j.user_id;
  perform net.http_post(url:=p_url,headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('lease',token),timeout_milliseconds:=60000);
  n:=n+1;
 end loop;
 return n;
end $$;
-- Own or currently opted-in reference series, restricted to the requested
-- subject basket and chronological cutoff. Never return to browser.
create function public.st_achievement_replay_points(p_user uuid,p_peers boolean,p_basket text,p_before date) returns jsonb
language sql stable security invoker set search_path='' as $$
 with p as (
 select e.user_id uid,e.id,e.exam_date d,coalesce(e.grade_level,'') cat,
  b.basket,100.0*e.total_rank/e.total_participants pos
 from public.score_tracker_exams e
 join public.score_tracker_users u on u.id=e.user_id
 join public.score_tracker_trajectory_sharing sh on sh.user_id=e.user_id and sh.enabled and not coalesce(sh.test_all_database,false)
 cross join lateral (select string_agg(s.subject,'|' order by s.subject) basket from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=e.user_id and not coalesce(s.exclude_from_total,false)) b
 where public.st_achievement_eligible(u.is_admin,u.username)
 and ((not p_peers and e.user_id=p_user) or (p_peers and e.user_id<>p_user))
 and not coalesce(e.is_hidden,false) and e.exam_date<p_before and e.total_participants>=30
 and e.total_rank between 1 and e.total_participants and b.basket is not null and (p_basket is null or b.basket=p_basket)
 and (e.total_year_position_percent is null or abs(e.total_year_position_percent-100.0*e.total_rank/e.total_participants)<=0.011)
 and exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=e.user_id and (s.max_score>0 and s.actual_score between 0 and s.max_score or s.raw_max_score>0 and s.raw_score between 0 and s.raw_max_score) and not coalesce(s.exclude_from_total,false))
 ), unambiguous as (select *,count(*) over(partition by uid,basket,d) dup from p),
 grouped as (select uid,basket,jsonb_agg(jsonb_build_array(id,d,cat,pos) order by d,id) points
 from unambiguous where dup=1 group by uid,basket having count(*)>=4)
 select coalesce(jsonb_agg(to_jsonb(grouped) order by uid,basket),'[]'::jsonb) from grouped
$$;
-- Commit only if the job's lease and input generation still match.
create function public.st_achievement_replay_write(p_lease uuid,p_rows jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare j public.score_tracker_achievement_jobs%rowtype;
begin
 select * into j from public.score_tracker_achievement_jobs where lease=p_lease and started and lease_until>now() and generation=leased_generation for update;
 if not found then return false; end if;
 insert into public.score_tracker_achievement_predictions(user_id,prediction_id,model,context_key,history_exam_ids,result_exam_id,prediction)
 select j.user_id,x.result_exam_id,'trajectory-replay-v2',x.context_key,x.history_exam_ids,x.result_exam_id,x.prediction
 from jsonb_to_recordset(p_rows) x(result_exam_id uuid,context_key text,history_exam_ids uuid[],prediction jsonb)
 join public.score_tracker_exams e on e.id=x.result_exam_id and e.user_id=j.user_id
 where x.prediction->>'source'='historical_replay' and x.prediction->>'targetDate'=e.exam_date::text
 on conflict(user_id,prediction_id) do update set model=excluded.model,context_key=excluded.context_key,history_exam_ids=excluded.history_exam_ids,result_exam_id=excluded.result_exam_id,prediction=excluded.prediction,frozen_at=now()
 where public.score_tracker_achievement_predictions.model in ('trajectory-replay-v1','trajectory-replay-v2');
 return true;
end $$;
revoke all on function public.st_achievement_enqueue_changes(),public.st_achievement_job_claim(uuid),public.st_achievement_job_finish(uuid,boolean,boolean),public.st_achievement_dispatch(text),public.st_achievement_replay_points(uuid,boolean,text,date),public.st_achievement_replay_write(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.st_achievement_enqueue_changes(),public.st_achievement_job_claim(uuid),public.st_achievement_job_finish(uuid,boolean,boolean),public.st_achievement_replay_points(uuid,boolean,text,date),public.st_achievement_replay_write(uuid,jsonb) to service_role;
-- Cron activation is a separate, project-specific deployment step after worker verification.
