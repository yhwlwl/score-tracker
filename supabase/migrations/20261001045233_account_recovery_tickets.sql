-- Recovery APIs are callable only by the server's service role. The edge function
-- authenticates admins using the existing, expiring score-tracker session.
create table public.score_tracker_recovery_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  key_hash text not null check (length(key_hash)=64),
  mode text not null check (mode in ('password','account')),
  username_hint text not null default '',
  evidence jsonb not null check (jsonb_typeof(evidence)='object'),
  status text not null default 'pending' check (status in ('pending','reviewing','needs_info','approved','rejected','claimed')),
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history)='array'),
  source_user_id uuid references public.score_tracker_users(id),
  new_user_id uuid unique references public.score_tracker_users(id),
  reviewed_by uuid references public.score_tracker_users(id),
  review_note text,
  claim_until timestamptz,
  copy_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index score_tracker_recovery_queue_idx on public.score_tracker_recovery_tickets(status,updated_at desc);
create table public.score_tracker_recovery_limits (
  scope text primary key,
  window_start timestamptz not null,
  requests integer not null check (requests>0)
);
alter table public.score_tracker_recovery_tickets enable row level security;
alter table public.score_tracker_recovery_limits enable row level security;
revoke all on public.score_tracker_recovery_tickets,public.score_tracker_recovery_limits from public,anon,authenticated;
grant all on public.score_tracker_recovery_tickets,public.score_tracker_recovery_limits to service_role;

create function public.score_tracker_recovery_rate(p_scope text,p_seconds integer,p_max integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  insert into public.score_tracker_recovery_limits(scope,window_start,requests) values(p_scope,now(),1)
  on conflict(scope) do update set
    requests=case when score_tracker_recovery_limits.window_start <= now()-make_interval(secs=>p_seconds) then 1 else score_tracker_recovery_limits.requests+1 end,
    window_start=case when score_tracker_recovery_limits.window_start <= now()-make_interval(secs=>p_seconds) then now() else score_tracker_recovery_limits.window_start end
  returning requests into n;
  return n<=p_max;
end $$;

create or replace function public.score_tracker_recovery_candidates(p_ticket uuid,p_query text default '')
returns jsonb language sql security invoker set search_path='' as $$
with t as (select * from public.score_tracker_recovery_tickets where id=p_ticket),
x as (select u.id,u.username,u.original_username,u.created_at,
  (t.username_hint<>'' and (lower(u.username)=lower(t.username_hint) or lower(u.original_username)=lower(t.username_hint))) as username_match,
  exists(select 1 from public.score_tracker_exams e where e.user_id=u.id
    and (nullif(t.evidence->>'exam_name','') is not null or nullif(t.evidence->>'exam_date','') is not null or nullif(t.evidence->>'score','') is not null)
    and (coalesce(t.evidence->>'exam_name','')='' or position(lower(t.evidence->>'exam_name') in lower(e.name))>0)
    and (coalesce(t.evidence->>'exam_date','')='' or e.exam_date::text=t.evidence->>'exam_date')
    and (coalesce(t.evidence->>'score','')='' or exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id
      and (coalesce(t.evidence->>'subject','')='' or s.subject=t.evidence->>'subject')
      and (s.actual_score::text=t.evidence->>'score' or s.raw_score::text=t.evidence->>'score' or s.actual_score=nullif(t.evidence->>'score','')::numeric or s.raw_score=nullif(t.evidence->>'score','')::numeric))
      or ((t.evidence->>'subject')='总分' and (coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=nullif(t.evidence->>'score','')::numeric or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=nullif(t.evidence->>'score','')::numeric)))) as exam_match,
  exists(select 1 from public.score_tracker_setup_profiles p where p.user_id=u.id and coalesce(t.evidence->>'school','')<>'' and position(lower(t.evidence->>'school') in lower(p.school->>'name'))>0) as school_match
from public.score_tracker_users u cross join t where not u.is_admin
  and (p_query='' or position(lower(p_query) in lower(u.username))>0 or position(lower(p_query) in lower(u.original_username))>0)),
r as (select *, (case when username_match then 4 else 0 end + case when exam_match then 3 else 0 end + case when school_match then 1 else 0 end) as strength from x
  where p_query<>'' or username_match or exam_match or school_match order by strength desc,created_at desc limit 25)
select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'exams',(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select e.name,e.exam_date,e.total_actual_score,e.total_rank,
    (select coalesce(jsonb_agg(jsonb_build_object('subject',s.subject,'actual_score',s.actual_score,'raw_score',s.raw_score,'rank_position',s.rank_position)),'[]'::jsonb) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=r.id) as scores
    from public.score_tracker_exams e cross join t where e.user_id=r.id order by
    (coalesce(t.evidence->>'exam_name','')<>'' and position(lower(t.evidence->>'exam_name') in lower(e.name))>0) desc,e.exam_date desc limit 5) v),
  'school',(select p.school->>'name' from public.score_tracker_setup_profiles p where p.user_id=r.id),
  'exam_count',(select count(*) from public.score_tracker_exams e where e.user_id=r.id))), '[]'::jsonb) from r;
$$;

create function public.score_tracker_recovery_supplement(p_ticket uuid,p_key_hash text,p_content text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.score_tracker_recovery_tickets;
begin
  select * into t from public.score_tracker_recovery_tickets where id=p_ticket and key_hash=p_key_hash for update;
  if not found then raise exception 'ticket_not_found'; end if;
  if t.status not in ('pending','reviewing','needs_info') then raise exception 'ticket_closed'; end if;
  if jsonb_array_length(t.history)>=40 then raise exception 'message_limit'; end if;
  update public.score_tracker_recovery_tickets set history=history||jsonb_build_array(jsonb_build_object('author','user','content',p_content,'at',now())),status='pending',updated_at=clock_timestamp() where id=p_ticket;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.score_tracker_recovery_review(p_ticket uuid,p_admin_hash text,p_status text,p_source uuid,p_note text,p_version timestamptz,p_username text,p_password_hash text,p_password_salt text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.score_tracker_recovery_tickets; a uuid; src public.score_tracker_users; dst uuid; item record; new_id uuid; emap jsonb='{}'; mmap jsonb='{}'; c_exams integer=0; c_scores integer=0; c_modules integer=0; summary jsonb;
begin
  select id into a from public.score_tracker_users where session_token_hash=p_admin_hash and is_admin and session_expires_at>now();
  if a is null then raise exception 'unauthorized'; end if;
  select * into t from public.score_tracker_recovery_tickets where id=p_ticket for update;
  if not found then raise exception 'ticket_not_found'; end if;
  if t.status in ('approved','claimed','rejected') then raise exception 'ticket_closed'; end if;
  if t.updated_at<>p_version then raise exception 'ticket_changed'; end if;
  if p_status not in ('reviewing','needs_info','rejected','approved') then raise exception 'invalid_status'; end if;
  if length(trim(p_note))<2 or length(p_note)>4000 then raise exception 'review_note_required'; end if;
  if jsonb_array_length(t.history)>=40 then raise exception 'message_limit'; end if;
  if p_status='approved' then
    select * into src from public.score_tracker_users where id=p_source and not is_admin for share;
    if not found then raise exception 'source_not_found'; end if;
    -- One transaction creates a new identity and rewrites every relational ID.
    insert into public.score_tracker_users(username,original_username,password_hash,password_salt,exam_category_label,exam_category_options,is_admin)
      values(p_username,p_username,p_password_hash,p_password_salt,src.exam_category_label,src.exam_category_options,false) returning id into dst;
    for item in select * from public.score_tracker_exams where user_id=src.id loop
      new_id=gen_random_uuid(); emap=emap||jsonb_build_object(item.id::text,new_id::text);
      insert into public.score_tracker_exams select (jsonb_populate_record(null::public.score_tracker_exams,to_jsonb(item)||jsonb_build_object('id',new_id,'user_id',dst))).*;
      c_exams=c_exams+1;
    end loop;
    for item in select * from public.score_tracker_modules where user_id=src.id loop
      new_id=gen_random_uuid(); mmap=mmap||jsonb_build_object(item.id::text,new_id::text);
      insert into public.score_tracker_modules select (jsonb_populate_record(null::public.score_tracker_modules,to_jsonb(item)||jsonb_build_object('id',new_id,'user_id',dst))).*;
      c_modules=c_modules+1;
    end loop;
    for item in select * from public.score_tracker_scores where user_id=src.id loop
      if not emap ? item.exam_id::text then raise exception 'invalid_source_links'; end if;
      insert into public.score_tracker_scores select (jsonb_populate_record(null::public.score_tracker_scores,to_jsonb(item)||jsonb_build_object('id',gen_random_uuid(),'user_id',dst,'exam_id',emap->>item.exam_id::text))).*;
      c_scores=c_scores+1;
    end loop;
    for item in select * from public.score_tracker_exam_modules where user_id=src.id loop
      if not emap ? item.exam_id::text or not mmap ? item.module_id::text then raise exception 'invalid_source_links'; end if;
      insert into public.score_tracker_exam_modules select (jsonb_populate_record(null::public.score_tracker_exam_modules,to_jsonb(item)||jsonb_build_object('user_id',dst,'exam_id',emap->>item.exam_id::text,'module_id',mmap->>item.module_id::text))).*;
    end loop;
    for item in select * from public.score_tracker_subjects where user_id=src.id loop
      insert into public.score_tracker_subjects select (jsonb_populate_record(null::public.score_tracker_subjects,to_jsonb(item)||jsonb_build_object('id',gen_random_uuid(),'user_id',dst))).*;
    end loop;
    insert into public.score_tracker_user_goals select (jsonb_populate_record(null::public.score_tracker_user_goals,to_jsonb(g)||jsonb_build_object('user_id',dst))).* from public.score_tracker_user_goals g where user_id=src.id;
    insert into public.score_tracker_setup_profiles select (jsonb_populate_record(null::public.score_tracker_setup_profiles,to_jsonb(g)||jsonb_build_object('user_id',dst,'step',6,'completed_at',coalesce(g.completed_at,now())))).* from public.score_tracker_setup_profiles g where user_id=src.id;
    insert into public.score_tracker_setup_profiles(user_id,step,completed_at) values(dst,6,now()) on conflict(user_id) do nothing;
    insert into public.score_tracker_user_roles select (jsonb_populate_record(null::public.score_tracker_user_roles,to_jsonb(g)||jsonb_build_object('user_id',dst))).* from public.score_tracker_user_roles g where user_id=src.id;
    insert into public.score_tracker_teacher_workspaces select (jsonb_populate_record(null::public.score_tracker_teacher_workspaces,to_jsonb(g)||jsonb_build_object('user_id',dst))).* from public.score_tracker_teacher_workspaces g where user_id=src.id;
    insert into public.score_tracker_notification_receipts(user_id,kind,notice_id,shown_at) select dst,kind,notice_id,shown_at from public.score_tracker_notification_receipts where user_id=src.id;
    insert into public.score_tracker_feature_completion_receipts(user_id,option_id,shown_at) select dst,option_id,shown_at from public.score_tracker_feature_completion_receipts where user_id=src.id;
    summary=jsonb_build_object('exams',c_exams,'scores',c_scores,'modules',c_modules);
  end if;
  update public.score_tracker_recovery_tickets set status=p_status,review_note=p_note,reviewed_by=a,
    source_user_id=case when p_status='approved' then src.id else source_user_id end,
    new_user_id=case when p_status='approved' then dst else new_user_id end,
    copy_summary=case when p_status='approved' then summary else copy_summary end,
    claim_until=case when p_status='approved' then now()+interval '7 days' else claim_until end,
    history=history||jsonb_build_array(jsonb_build_object('author','admin','content',p_note,'at',now(),'status',p_status)),updated_at=clock_timestamp() where id=p_ticket;
  return jsonb_build_object('ok',true,'status',p_status,'copy_summary',summary);
end $$;

create function public.score_tracker_recovery_claim(p_ticket uuid,p_key_hash text,p_hash text,p_salt text,p_token_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.score_tracker_recovery_tickets; u public.score_tracker_users;
begin
  select * into t from public.score_tracker_recovery_tickets where id=p_ticket and key_hash=p_key_hash for update;
  if not found then raise exception 'ticket_not_found'; end if;
  if t.status<>'approved' then raise exception 'not_claimable'; end if;
  if t.claim_until<now() then raise exception 'claim_expired'; end if;
  update public.score_tracker_users set password_hash=p_hash,password_salt=p_salt,session_token_hash=p_token_hash,session_expires_at=now()+interval '180 days',updated_at=now() where id=t.new_user_id and not is_admin returning * into u;
  if not found then raise exception 'source_not_found'; end if;
  update public.score_tracker_recovery_tickets set status='claimed',history=history||jsonb_build_array(jsonb_build_object('author','system','content','新账号已领取。请保存账号和新密码。','at',now())),updated_at=clock_timestamp() where id=p_ticket;
  return jsonb_build_object('user',jsonb_build_object('id',u.id,'username',u.username,'created_at',u.created_at));
end $$;

revoke all on function public.score_tracker_recovery_rate(text,integer,integer),public.score_tracker_recovery_candidates(uuid,text),public.score_tracker_recovery_supplement(uuid,text,text),public.score_tracker_recovery_review(uuid,text,text,uuid,text,timestamptz,text,text,text),public.score_tracker_recovery_claim(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_recovery_rate(text,integer,integer),public.score_tracker_recovery_candidates(uuid,text),public.score_tracker_recovery_supplement(uuid,text,text),public.score_tracker_recovery_review(uuid,text,text,uuid,text,timestamptz,text,text,text),public.score_tracker_recovery_claim(uuid,text,text,text,text) to service_role;
