-- PR-only migration. Apply before the new Edge Functions; never run from the browser.
create table public.score_tracker_account_levels (
 level integer primary key check(level between 1 and 12), threshold integer not null,
 min_days integer not null default 0, min_months integer not null default 0,
 monthly_credits integer not null default 0
);
insert into public.score_tracker_account_levels values
 (1,0,0,0,0),(2,50,0,0,400),(3,120,0,0,500),(4,140,0,0,650),
 (5,165,0,0,800),(6,195,0,0,1000),(7,230,0,0,1300),(8,280,0,0,1700),
 (9,350,30,2,2200),(10,450,30,2,2800),(11,650,60,3,3600),(12,1200,180,5,4500);
create table public.score_tracker_growth_features(feature text primary key,points integer not null);
insert into public.score_tracker_growth_features values
 ('record',30),('quick',10),('trend',15),('radar',15),('worth',20),('trajectory',20),
 ('goal',15),('reflection',15),('types',20),('paper',20),('report',20),('export',10),('appearance',10),('feedback',10),('planner',10);
create table public.score_tracker_growth_accounts (
 user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
 points integer not null default 0 check(points>=0),level integer not null default 1,
 valid_exams integer not null default 0,last_scan_at timestamptz,last_refresh_at timestamptz
);
create table public.score_tracker_growth_ledger (
 id bigint generated always as identity primary key,user_id uuid not null references public.score_tracker_users(id) on delete cascade,
 event_key text not null,feature text not null,source_id text,period date not null,
 points integer not null check(points>=0),occurred_at timestamptz not null,created_at timestamptz not null default now(),
 unique(user_id,event_key)
);
create index on public.score_tracker_growth_ledger(user_id,period,feature);
create table public.score_tracker_ai_policy (
 id boolean primary key default true check(id),enabled boolean not null default false,
 analysis_enabled boolean not null default false,warning_cny numeric not null default 15,
 hard_limit_cny numeric not null default 20 check(hard_limit_cny>0 and hard_limit_cny<=20),initial_credits integer not null default 150 check(initial_credits>=0),
 input_rate numeric not null default 2 check(input_rate>=0),cache_rate numeric not null default 0.04 check(cache_rate>=0),output_rate numeric not null default 8 check(output_rate>=0),
 context_limit integer not null default 1000000 check(context_limit between 1 and 1000000),cost_multiplier numeric not null default 1 check(cost_multiplier>=1),
 starts_period date,activated_at timestamptz
);
insert into public.score_tracker_ai_policy(id) values(true);
create table public.score_tracker_ai_wallets (
 user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
 balance numeric(18,6) not null default 0 check(balance>=0),held numeric(18,6) not null default 0 check(held>=0),
 grant_month date,grant_allowance integer not null default 0,created_at timestamptz not null default now()
);
create table public.score_tracker_ai_grants (
 user_id uuid not null references public.score_tracker_users(id) on delete cascade,
 grant_key text not null,credits numeric(18,6) not null,created_at timestamptz not null default now(),primary key(user_id,grant_key)
);
create table public.score_tracker_ai_budgets (
 period date primary key,spent_cny numeric(18,9) not null default 0 check(spent_cny>=0),
 reserved_cny numeric(18,9) not null default 0 check(reserved_cny>=0),
 opening_cny numeric(18,9) not null default 0 check(opening_cny>=0),opening_recorded boolean not null default false,opening_admin uuid,opening_at timestamptz
);
create table public.score_tracker_ai_tasks (
 id uuid primary key,user_id uuid references public.score_tracker_users(id) on delete set null,feature text not null,
 status text not null default 'active' check(status in('active','succeeded','failed','expired')),
 approved_credits numeric(18,6) not null,spent_credits numeric(18,6) not null default 0,
 charged_credits numeric(18,6) not null default 0,created_at timestamptz not null default now(),finished_at timestamptz
);
create index on public.score_tracker_ai_tasks(user_id,status,created_at);
create table public.score_tracker_ai_calls (
 id text primary key,task_id uuid not null references public.score_tracker_ai_tasks(id),period date not null,
 status text not null default 'reserved' check(status in('reserved','known','unknown')),
 model text not null,reserved_cny numeric(18,9) not null,cost_cny numeric(18,9),credits numeric(18,6),
 input_rate numeric not null,cache_rate numeric not null,output_rate numeric not null,cost_multiplier numeric not null,max_output integer not null,
 prompt_tokens bigint,completion_tokens bigint,cache_hit_tokens bigint,cache_miss_tokens bigint,
 reasoning_tokens bigint,raw_usage jsonb,provider_request_id text,http_status integer,
 created_at timestamptz not null default now(),settled_at timestamptz
);
create index on public.score_tracker_ai_calls(task_id,status);

-- All RPCs are INVOKER, reachable only with the server's service role. Existing
-- custom sessions are verified by the Edge handler; no client-supplied user id is trusted.
create function public.score_tracker_growth_award(p_user uuid,p_key text,p_feature text,p_points integer,p_at timestamptz,p_source text default null)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into score_tracker_growth_accounts(user_id) values(p_user) on conflict do nothing;
 perform 1 from score_tracker_growth_accounts where user_id=p_user for update;
 insert into score_tracker_growth_ledger(user_id,event_key,feature,points,occurred_at,period,source_id)
 values(p_user,p_key,p_feature,p_points,p_at,date_trunc('month',p_at at time zone 'Asia/Shanghai')::date,p_source)
 on conflict(user_id,event_key) do nothing;
 if found then update score_tracker_growth_accounts set points=points+p_points where user_id=p_user;end if;
end $$;
create function public.score_tracker_growth_touch(p_user uuid,p_feature text,p_at timestamptz,p_exam uuid default null)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare pts integer;mon text:=to_char(p_at at time zone 'Asia/Shanghai','YYYY-MM');used integer;per_exam integer;
begin
 select points into pts from score_tracker_growth_features where feature=p_feature;
 if pts is null and p_feature<>'exam' then return;end if;
 if pts is not null then perform score_tracker_growth_award(p_user,'first:'||p_feature,p_feature,pts,p_at);end if;
 perform score_tracker_growth_award(p_user,'month:'||mon,'month',60,p_at);
 if p_exam is not null and p_feature in('trend','radar','worth','trajectory','exam') then
  select coalesce(sum(points),0),coalesce(sum(points) filter(where source_id=p_exam::text),0) into used,per_exam
   from score_tracker_growth_ledger where user_id=p_user and feature='repeat' and period=(mon||'-01')::date;
  if used<20 and per_exam<10 then perform score_tracker_growth_award(p_user,'repeat:'||mon||':'||p_exam||':'||p_feature,'repeat',5,p_at,p_exam::text);end if;
 end if;
end $$;
create function public.score_tracker_growth_observe(p_user uuid,p_event text,p_metadata jsonb default '{}'::jsonb,p_at timestamptz default now())
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare f text;eid uuid;valid boolean:=false;
begin
 -- Only the migration/backfill or verified server events supply p_at.
 if coalesce(p_metadata->>'exam_id',p_metadata->>'examId','')~'^[0-9a-fA-F-]{36}$' then
  begin eid:=coalesce(p_metadata->>'exam_id',p_metadata->>'examId')::uuid;exception when others then eid:=null;end;
 end if;
 select exists(select 1 from score_tracker_exams e where e.user_id=p_user and (eid is null or e.id=eid)
  and e.created_at<=p_at and e.exam_date<=(p_at at time zone 'Asia/Shanghai')::date
  and (e.total_actual_score>=0 or exists(select 1 from score_tracker_scores s where s.exam_id=e.id and s.user_id=p_user and s.actual_score>=0 and(s.max_score is null or s.actual_score<=s.max_score)))) into valid;
 if not valid then return;end if;
 f:=case
  when p_event in('chart_subject_changed','trend_controls_toggle') then 'trend'
  when p_event in('radar_mode_changed','radar_exam_selected') then 'radar'
  when p_event in('score_worth_selection','score_worth_reference_mode','score_worth_matrix_metric','score_worth_evidence_open','score_worth_matrix_open','score_worth_reference_selected') then 'worth'
  when p_event='trajectory_select' and p_metadata->>'selected'='true' or p_event='trajectory_details_toggle' and p_metadata->>'open'='true' or p_event='trajectory_forecast_detail' and p_metadata->>'action'='open' or p_event='trajectory_references_expand' and coalesce(p_metadata->>'open','true')='true' or p_event='trajectory_filter_change' then 'trajectory'
  when p_event in('export_done','export_pdf_generated') and coalesce(p_metadata->>'bytes','1')~'^[1-9][0-9]*$' then 'export'
  when p_event='appearance_studio_applied' and p_metadata->>'changed'='true' then 'appearance'
  when p_event='quick_entry_saved' and eid is not null then 'quick'
  when p_event='question_type_analysis_viewed' and eid is not null then 'types'
  when p_event in('exam_detail_comparison_changed','exam_detail_quadrant_subject_selected','exam_detail_quadrant_mode_changed','exam_detail_quadrant_scope_changed','exam_detail_quadrant_window_changed') then 'exam'
  else null end;
 if f is not null then perform score_tracker_growth_touch(p_user,f,p_at,eid);end if;
end $$;
create function public.score_tracker_growth_contribution(p_admin uuid,p_issue uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare owner_id uuid;used integer;
begin
 if not exists(select 1 from score_tracker_users where id=p_admin and is_admin) then raise exception 'forbidden';end if;
 select user_id into owner_id from score_tracker_feedback_submissions where id=p_issue and status in('planned','resolved');
 if owner_id is null then raise exception 'accepted_feedback_required';end if;
 insert into score_tracker_growth_accounts(user_id) values(owner_id) on conflict do nothing;
 perform 1 from score_tracker_growth_accounts where user_id=owner_id for update;
 select coalesce(sum(points),0) into used from score_tracker_growth_ledger where user_id=owner_id and feature='contribution';
 if used<100 then perform score_tracker_growth_award(owner_id,'contribution:'||p_issue,'contribution',20,now(),p_issue::text);end if;
 select coalesce(sum(points),0) into used from score_tracker_growth_ledger where user_id=owner_id and feature='contribution';
 return jsonb_build_object('ok',true,'total',used);
end $$;
create function public.score_tracker_growth_refresh(p_user uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare a score_tracker_growth_accounts;u score_tracker_users;entry record;l record;n integer;used integer;m integer;lev integer;created timestamptz;now_at timestamptz:=now();scan_at timestamptz;
begin
 select * into u from score_tracker_users where id=p_user;if not found then raise exception 'account_missing';end if;
 insert into score_tracker_growth_accounts(user_id) values(p_user) on conflict do nothing;
 select * into a from score_tracker_growth_accounts where user_id=p_user for update;
 if a.last_refresh_at is null or a.last_refresh_at<now_at-interval '30 seconds' then
  select count(*) into n from score_tracker_exams e where e.user_id=p_user and e.exam_date<=(now_at at time zone 'Asia/Shanghai')::date
   and(e.total_actual_score>=0 or exists(select 1 from score_tracker_scores s where s.user_id=p_user and s.exam_id=e.id and s.actual_score>=0 and(s.max_score is null or s.actual_score<=s.max_score)));
  update score_tracker_growth_accounts set valid_exams=greatest(valid_exams,n) where user_id=p_user;
  for entry in select e.exam_date,min(e.created_at) at from score_tracker_exams e where e.user_id=p_user and e.exam_date<=(now_at at time zone 'Asia/Shanghai')::date
   and(e.total_actual_score>=0 or exists(select 1 from score_tracker_scores s where s.user_id=p_user and s.exam_id=e.id and s.actual_score>=0 and(s.max_score is null or s.actual_score<=s.max_score))) group by e.exam_date order by min(e.created_at),e.exam_date loop
   perform score_tracker_growth_touch(p_user,'record',entry.at);
   select coalesce(sum(points),0) into used from score_tracker_growth_ledger where user_id=p_user and feature='exam_date' and period=date_trunc('month',entry.at at time zone 'Asia/Shanghai')::date;
   if used<60 then perform score_tracker_growth_award(p_user,'exam_date:'||entry.exam_date,'exam_date',20,entry.at,entry.exam_date::text);end if;
  end loop;
  if n>0 then
   select min(updated_at) into created from score_tracker_user_goals where user_id=p_user and(total_goal>0 or nullif(btrim(dream_school),'') is not null or coalesce(subject_goals,'{}') not in('{}'::jsonb,'null'::jsonb));
   if created is not null then perform score_tracker_growth_touch(p_user,'goal',created);end if;
   select min(coalesce(reflection_updated_at,created_at)) into created from score_tracker_exams where user_id=p_user and nullif(btrim(reflection),'') is not null;
   if created is not null then perform score_tracker_growth_touch(p_user,'reflection',created);end if;
   select min(created_at) into created from score_tracker_paper_reviews where user_id=p_user and status='succeeded' and result->>'record_only'='true' and corrections @> '[{"verified":true}]';
   if created is not null then perform score_tracker_growth_touch(p_user,'paper',created);end if;
  end if;
  select min(t) into created from(select created_at t from score_tracker_feature_votes where user_id=p_user union all select created_at from score_tracker_feedback_submissions where user_id=p_user) v;
  if created is not null then perform score_tracker_growth_award(p_user,'first:feedback','feedback',10,created);end if;
  -- Incremental, indexed source evidence; no old-depth-score conversion or inferred missing events.
  scan_at:=a.last_scan_at;
  for l in select event_type,metadata,occurred_at from score_tracker_visit_logs where user_id=p_user and occurred_at<=now_at and(scan_at is null or occurred_at>scan_at) order by occurred_at loop
   perform score_tracker_growth_observe(p_user,l.event_type,coalesce(l.metadata,'{}'),l.occurred_at);
  end loop;
  update score_tracker_growth_accounts set last_scan_at=now_at,last_refresh_at=now_at where user_id=p_user;
 end if;
 select count(*) into m from score_tracker_growth_ledger where user_id=p_user and feature='month';
 select * into a from score_tracker_growth_accounts where user_id=p_user;
 select coalesce(max(level),1) into lev from score_tracker_account_levels where threshold<=a.points and min_days<=extract(epoch from(now_at-u.created_at))/86400 and min_months<=m and(level=1 or a.valid_exams>0);
 lev:=greatest(lev,a.level);update score_tracker_growth_accounts set level=lev where user_id=p_user;
 return jsonb_build_object('level',lev,'points',a.points,'valid_exams',a.valid_exams,'active_months',m,'registered_days',greatest(0,floor(extract(epoch from(now_at-u.created_at))/86400)),
  'next_threshold',(select threshold from score_tracker_account_levels where level=lev+1),'levels',(select jsonb_agg(to_jsonb(x) order by level) from score_tracker_account_levels x),
  'features',(select jsonb_agg(jsonb_build_object('feature',f.feature,'points',f.points,'earned',exists(select 1 from score_tracker_growth_ledger g where g.user_id=p_user and g.event_key='first:'||f.feature))) from score_tracker_growth_features f));
end $$;

create function public.score_tracker_ai_account(p_user uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare g jsonb;w score_tracker_ai_wallets;p score_tracker_ai_policy;b score_tracker_ai_budgets;mon date:=(date_trunc('month',now() at time zone 'Asia/Shanghai'))::date;allowance integer;cap integer;amount numeric;step date;t record;
begin
 g:=score_tracker_growth_refresh(p_user);select * into p from score_tracker_ai_policy where id;
 insert into score_tracker_ai_wallets(user_id) values(p_user) on conflict do nothing;
 select * into w from score_tracker_ai_wallets where user_id=p_user for update;
 -- Expire only the personal hold. Unknown provider costs are NEVER released by time.
 for t in select * from score_tracker_ai_tasks where user_id=p_user and status='active' and created_at<now()-interval '45 minutes' for update loop
  update score_tracker_ai_wallets set held=greatest(0,held-t.approved_credits) where user_id=p_user;
  update score_tracker_ai_tasks set status='expired',finished_at=now() where id=t.id;
 end loop;
 insert into score_tracker_ai_grants values(p_user,'welcome',p.initial_credits,now()) on conflict do nothing;
 if found then update score_tracker_ai_wallets set balance=balance+p.initial_credits where user_id=p_user;end if;
 select monthly_credits into allowance from score_tracker_account_levels where level=(g->>'level')::int;
 cap:=greatest(3000,allowance*3);
 if allowance>0 then
  for step in select generate_series(greatest(coalesce(w.grant_month,mon),mon-make_interval(months=>ceil(cap::numeric/greatest(1,w.grant_allowance))::integer)),mon,interval '1 month')::date loop
   if step=mon then amount:=case when w.grant_month=mon then greatest(0,allowance-w.grant_allowance) else allowance end;
   elsif step>w.grant_month then amount:=w.grant_allowance;else amount:=0;end if;
   if amount>0 then
    select least(amount,greatest(0,cap-balance)) into amount from score_tracker_ai_wallets where user_id=p_user;
    insert into score_tracker_ai_grants(user_id,grant_key,credits) values(p_user,'month:'||step||':'||case when step<mon then w.grant_allowance else allowance end,amount) on conflict do nothing;
    if found then update score_tracker_ai_wallets set balance=balance+amount where user_id=p_user;end if;
   end if;
  end loop;
  update score_tracker_ai_wallets set grant_month=mon,grant_allowance=allowance where user_id=p_user;
 end if;
 select * into w from score_tracker_ai_wallets where user_id=p_user;
 select * into b from score_tracker_ai_budgets where period=mon;
 return jsonb_build_object('growth',g,'credits',jsonb_build_object('balance',w.balance,'held',w.held,'available',greatest(0,w.balance-w.held),'monthly',allowance,'cap',cap,'welcome',p.initial_credits,'period',mon),
  'enabled',p.enabled,'analysis_enabled',p.analysis_enabled,'budget_status',case when coalesce(b.spent_cny,0)+coalesce(b.reserved_cny,0)>=p.hard_limit_cny then 'paused' when coalesce(b.spent_cny,0)+coalesce(b.reserved_cny,0)>=p.warning_cny then 'busy' else 'available' end);
end $$;
create function public.score_tracker_ai_opening_budget(p_actor uuid,p_amount numeric)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare mon date:=date_trunc('month',now() at time zone 'Asia/Shanghai')::date;b score_tracker_ai_budgets;
begin
 if not exists(select 1 from score_tracker_users where id=p_actor and is_admin) then raise exception 'forbidden';end if;
 if p_amount is null or p_amount<0 or p_amount>10000 then raise exception 'invalid_opening';end if;
 if exists(select 1 from score_tracker_ai_policy where id and enabled) then raise exception 'disable_before_opening';end if;
 insert into score_tracker_ai_budgets(period) values(mon) on conflict do nothing;
 select * into b from score_tracker_ai_budgets where period=mon for update;
 if b.opening_recorded then
  update score_tracker_ai_policy set starts_period=mon where id and activated_at is null;
  return jsonb_build_object('recorded',true,'opening_cny',b.opening_cny);
 end if;
 update score_tracker_ai_budgets set opening_cny=p_amount,spent_cny=spent_cny+p_amount,opening_recorded=true,opening_admin=p_actor,opening_at=now() where period=mon;
 update score_tracker_ai_policy set starts_period=mon where id and activated_at is null;
 return jsonb_build_object('recorded',true,'opening_cny',p_amount);
end $$;
create function public.score_tracker_ai_task_start(p_user uuid,p_task uuid,p_feature text,p_floor integer default 0,p_cap integer default 1000)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare account jsonb;t score_tracker_ai_tasks;w score_tracker_ai_wallets;available numeric;approved numeric;p score_tracker_ai_policy;
begin
 account:=score_tracker_ai_account(p_user);select * into p from score_tracker_ai_policy where id;
 if not p.enabled then return jsonb_build_object('allowed',false,'reason','ai_disabled');end if;
 if p_feature not in('vision','paper_entry','probe','admin_test') then return jsonb_build_object('allowed',false,'reason','analysis_disabled');end if;
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
-- The old daily paper counter is kept for history, but no longer gates entry.
create function public.score_tracker_ai_paper_reserve(p_user_id uuid,p_request_id uuid,p_draft_id uuid,p_exam_id uuid,p_subject text,p_fingerprint text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous score_tracker_paper_reviews;today date:=(now() at time zone 'Asia/Shanghai')::date;
begin
 perform pg_advisory_xact_lock(hashtextextended('credit_paper:'||p_request_id,0));
 select * into previous from score_tracker_paper_reviews where request_id=p_request_id;
 if found then
  if previous.user_id<>p_user_id or previous.fingerprint<>p_fingerprint then return jsonb_build_object('allowed',false,'reason','conflict','message','录入编号已使用，请重新开始');end if;
  return jsonb_build_object('allowed',true,'created',false);
 end if;
 if not exists(select 1 from score_tracker_ai_tasks where id=p_request_id and user_id=p_user_id and feature='paper_entry' and status='active') then return jsonb_build_object('allowed',false,'reason','task_inactive','message','请重新开始识别');end if;
 if p_exam_id is not null and not exists(select 1 from score_tracker_exams where id=p_exam_id and user_id=p_user_id) then raise exception 'Exam ownership mismatch' using errcode='42501';end if;
 insert into score_tracker_paper_reviews(request_id,user_id,draft_id,exam_id,subject,fingerprint,options)
 values(p_request_id,p_user_id,p_draft_id,p_exam_id,p_subject,p_fingerprint,'{"purpose":"record","config_version":2}'::jsonb);
 insert into score_tracker_paper_usage(usage_date,scope,request_count,last_requested_at)
 values(today,'user:'||p_user_id,1,now()),(today,'global',1,now())
 on conflict(usage_date,scope) do update set request_count=score_tracker_paper_usage.request_count+1,last_requested_at=excluded.last_requested_at;
 return jsonb_build_object('allowed',true,'created',true);
end $$;
create function public.score_tracker_ai_call_reserve(p_user uuid,p_task uuid,p_call text,p_model text,p_max_output integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare p score_tracker_ai_policy;b score_tracker_ai_budgets;t score_tracker_ai_tasks;mon date:=(date_trunc('month',now() at time zone 'Asia/Shanghai'))::date;bound numeric;
begin
 select * into p from score_tracker_ai_policy where id;
 if not p.enabled then return jsonb_build_object('allowed',false,'reason','ai_disabled');end if;
 if p_model is null or p_model not in('deepseek-flash','deepseek-v4-flash','deepseek-v4.1-flash','deepseek-v4-flash-vision-exp') or p_max_output is null or p_max_output<1 or p_max_output>131072 then return jsonb_build_object('allowed',false,'reason','unpriced_model');end if;
 bound:=(p.context_limit*p.input_rate+p_max_output*p.output_rate)/1000000*p.cost_multiplier;
 insert into score_tracker_ai_budgets(period) values(mon) on conflict do nothing;
 select * into b from score_tracker_ai_budgets where period=mon for update;
 if p.starts_period is null or mon=p.starts_period and not b.opening_recorded then return jsonb_build_object('allowed',false,'reason','opening_budget_required');end if;
 select * into t from score_tracker_ai_tasks where id=p_task and user_id=p_user for update;
 if not found or t.status<>'active' or t.created_at<now()-interval '45 minutes' then return jsonb_build_object('allowed',false,'reason','task_inactive');end if;
 if t.feature not in('probe','admin_test') and t.spent_credits>=t.approved_credits then return jsonb_build_object('allowed',false,'reason','task_credit_cap');end if;
 if exists(select 1 from score_tracker_ai_calls where id=p_call) then return jsonb_build_object('allowed',false,'reason','duplicate_call');end if;
 if b.spent_cny+b.reserved_cny+bound>p.hard_limit_cny then return jsonb_build_object('allowed',false,'reason','site_budget');end if;
 insert into score_tracker_ai_calls(id,task_id,period,model,reserved_cny,input_rate,cache_rate,output_rate,cost_multiplier,max_output) values(p_call,p_task,mon,p_model,bound,p.input_rate,p.cache_rate,p.output_rate,p.cost_multiplier,p_max_output);
 update score_tracker_ai_budgets set reserved_cny=reserved_cny+bound where period=mon;
 return jsonb_build_object('allowed',true,'reserved_cny',bound);
end $$;
create function public.score_tracker_ai_call_settle(p_user uuid,p_call text,p_usage jsonb,p_provider text default null,p_status integer default null)
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
  update score_tracker_ai_calls set status='unknown',raw_usage=p_usage,provider_request_id=left(p_provider,240),http_status=p_status where id=p_call;
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
 update score_tracker_ai_budgets set reserved_cny=greatest(0,reserved_cny-c.reserved_cny),spent_cny=spent_cny+fee where period=c.period;
 update score_tracker_ai_tasks set spent_credits=spent_credits+call_credits where id=t.id;
 return jsonb_build_object('known',true,'credits',call_credits);
end $$;
create function public.score_tracker_ai_task_finish(p_user uuid,p_task uuid,p_success boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare t score_tracker_ai_tasks;charge numeric;
begin
 perform 1 from score_tracker_ai_wallets where user_id=p_user for update;
 select * into t from score_tracker_ai_tasks where id=p_task and user_id=p_user for update;
 if not found then return jsonb_build_object('finished',false);end if;
 if t.status<>'active' then return jsonb_build_object('finished',true,'charged',t.charged_credits);end if;
 charge:=case when p_success and t.feature not in('probe','admin_test') then least(t.approved_credits,ceil(t.spent_credits)) else 0 end;
 update score_tracker_ai_wallets set balance=greatest(0,balance-charge),held=greatest(0,held-t.approved_credits) where user_id=p_user;
 update score_tracker_ai_tasks set status=case when p_success then 'succeeded' else 'failed' end,charged_credits=charge,finished_at=now() where id=p_task;
 return jsonb_build_object('finished',true,'charged',charge);
end $$;

create function public.score_tracker_ai_release_ready()
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select to_regprocedure('public.score_tracker_growth_refresh(uuid)') is not null
 and to_regprocedure('public.score_tracker_ai_account(uuid)') is not null
 and to_regprocedure('public.score_tracker_ai_task_start(uuid,uuid,text,integer,integer)') is not null
 and to_regprocedure('public.score_tracker_ai_call_reserve(uuid,uuid,text,text,integer)') is not null
 and to_regprocedure('public.score_tracker_ai_call_settle(uuid,text,jsonb,text,integer)') is not null
 and to_regprocedure('public.score_tracker_ai_paper_reserve(uuid,uuid,uuid,uuid,text,text)') is not null;
$$;
-- No client role can read another account's ledger or mint points/credits.
do $$ declare n text;f record;begin
 foreach n in array array['score_tracker_account_levels','score_tracker_growth_features','score_tracker_growth_accounts','score_tracker_growth_ledger','score_tracker_ai_policy','score_tracker_ai_wallets','score_tracker_ai_grants','score_tracker_ai_budgets','score_tracker_ai_tasks','score_tracker_ai_calls'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated',n);
  execute format('grant select,insert,update,delete on public.%I to service_role',n);
 end loop;
 grant usage,select on sequence score_tracker_growth_ledger_id_seq to service_role;
 for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and (proname like 'score_tracker_growth_%' or proname like 'score_tracker_ai_%') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
