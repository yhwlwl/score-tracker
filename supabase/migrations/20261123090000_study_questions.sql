create or replace function public.score_tracker_ai_task_start(p_user uuid,p_task uuid,p_feature text,p_floor integer default 0,p_cap integer default 1000)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare account jsonb;t score_tracker_ai_tasks;w score_tracker_ai_wallets;available numeric;approved numeric;p score_tracker_ai_policy;
begin
 if p_feature='study_question' then perform pg_advisory_xact_lock(hashtextextended(p_task::text,0));end if;
 account:=score_tracker_ai_account(p_user);select * into p from score_tracker_ai_policy where id;
 if not p.enabled then return jsonb_build_object('allowed',false,'reason','ai_disabled');end if;
 if p_feature not in('vision','paper_entry','probe','admin_test','study_question') then return jsonb_build_object('allowed',false,'reason','analysis_disabled');end if;
 if p_feature='admin_test' and not exists(select 1 from score_tracker_users where id=p_user and is_admin) then return jsonb_build_object('allowed',false,'reason','forbidden');end if;
 select * into t from score_tracker_ai_tasks where id=p_task;
 if found then return jsonb_build_object('allowed',t.user_id=p_user and t.feature=p_feature and t.status in('active','succeeded'),'duplicate',true,'status',t.status,'approved',t.approved_credits,'account',account);end if;
 select * into w from score_tracker_ai_wallets where user_id=p_user for update;
 if exists(select 1 from score_tracker_ai_tasks where user_id=p_user and created_at>now()-interval '15 seconds') then return jsonb_build_object('allowed',false,'reason','cooldown');end if;
 if(select count(*) from score_tracker_ai_tasks where user_id=p_user and status='active')>=2 then return jsonb_build_object('allowed',false,'reason','concurrency');end if;
 available:=greatest(0,w.balance-w.held);approved:=case when p_feature in('probe','admin_test') then 0 else least(available,greatest(1,least(p_cap,3000))) end;
 if p_feature not in('probe','admin_test') and available<greatest(1,p_floor) then return jsonb_build_object('allowed',false,'reason','credits_exhausted','account',account);end if;
 insert into score_tracker_ai_tasks(id,user_id,feature,approved_credits) values(p_task,p_user,p_feature,approved);
 update score_tracker_ai_wallets set held=held+approved where user_id=p_user;
 return jsonb_build_object('allowed',true,'consumed',true,'approved',approved,'account',account);
end $$;

-- Keep private conversations separate from the usage ledger when an account is removed.
create table public.score_tracker_study_turns (
  task_id uuid primary key references public.score_tracker_ai_tasks(id) on delete cascade,
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  turn jsonb not null
);
alter table public.score_tracker_study_turns enable row level security;
revoke all on public.score_tracker_study_turns from public,anon,authenticated;
grant select,insert on public.score_tracker_study_turns to service_role;

-- Publishing the answer and charging the wallet commit together.
create function public.score_tracker_study_finish(p_user uuid,p_task uuid,p_turn jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare t score_tracker_ai_tasks;
begin
 perform 1 from score_tracker_ai_wallets where user_id=p_user for update;
 select * into strict t from score_tracker_ai_tasks where id=p_task and user_id=p_user and feature='study_question' for update;
 if t.status='succeeded' then return jsonb_build_object('charged',t.charged_credits);end if;
 if t.status<>'active' then raise exception 'study_task_inactive';end if;
 insert into score_tracker_study_turns(task_id,user_id,turn) values(p_task,p_user,p_turn);
 return score_tracker_ai_task_finish(p_user,p_task,true);
end $$;
revoke all on function public.score_tracker_study_finish(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.score_tracker_study_finish(uuid,uuid,jsonb) to service_role;
