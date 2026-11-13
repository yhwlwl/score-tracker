-- A session-authenticated Edge handler validates the backup. This RPC is service-only.
create table public.score_tracker_backup_import_items (
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  source_key text not null,
  exam_id uuid not null references public.score_tracker_exams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,source_key)
);
create index score_tracker_backup_import_exam_idx on public.score_tracker_backup_import_items(exam_id);
alter table public.score_tracker_backup_import_items enable row level security;
revoke all on public.score_tracker_backup_import_items from public,anon,authenticated;
grant all on public.score_tracker_backup_import_items to service_role;

create or replace function public.score_tracker_import_backup(p_user uuid,p_backup jsonb,p_preview boolean default true,p_settings boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ex jsonb; s record; m jsonb; row_data jsonb; ranks jsonb; averages jsonb;
  todo jsonb='[]'; mmap jsonb='{}'; nmap jsonb='{}'; defs jsonb='{}'; k text; key_source text; duplicate_id uuid;
  eid uuid; mid uuid; module_name text; suffix integer; n integer=0; skipped integer=0; score_count integer=0;
  module_count integer=0; conflicts jsonb='[]'; labels jsonb; g jsonb; item record;
begin
  if jsonb_typeof(p_backup) is distinct from 'object' or p_backup->>'app' is distinct from 'score-tracker'
    or jsonb_typeof(p_backup->'exams') is distinct from 'array' or jsonb_array_length(p_backup->'exams')>1000
    or octet_length(p_backup::text)>8388608 then raise exception 'invalid_backup'; end if;
  -- Serializes imports for this account, including preview/commit and lost-response retries.
  perform id from public.score_tracker_users where id=p_user for update;
  if not found then raise exception 'account_not_found'; end if;
  for ex in select value from jsonb_array_elements(p_backup->'exams') loop
    key_source=md5(coalesce(p_backup->>'account','')||'|'||coalesce(ex->>'sourceId',ex::text));
    duplicate_id=null;
    select b.exam_id into duplicate_id from public.score_tracker_backup_import_items b
      where b.user_id=p_user and b.source_key=key_source;
    if duplicate_id is null then
      select e.id into duplicate_id from public.score_tracker_exams e where e.user_id=p_user and
        (e.id::text=ex->>'sourceId' or
         (e.name=ex->>'name' and e.exam_date=(ex->>'exam_date')::date and coalesce(e.grade_level,'')=coalesce(ex->>'grade_level','')
          and (select coalesce(jsonb_agg(subject order by subject),'[]') from public.score_tracker_scores where exam_id=e.id and user_id=p_user)
            =(select coalesce(jsonb_agg(v order by v),'[]') from jsonb_object_keys(ex->'scores') v))) limit 1;
    end if;
    if duplicate_id is not null then
      skipped=skipped+1;
      if jsonb_array_length(conflicts)<10 then conflicts=conflicts||jsonb_build_array(jsonb_build_object('name',ex->>'name','date',ex->>'exam_date')); end if;
    else
      -- Also collapse duplicate identities inside one legacy backup without IDs.
      if exists(select 1 from jsonb_array_elements(todo) t where t->'exam'->>'name'=ex->>'name'
          and t->'exam'->>'exam_date'=ex->>'exam_date' and coalesce(t->'exam'->>'grade_level','')=coalesce(ex->>'grade_level','')
          and (select jsonb_agg(v order by v) from jsonb_object_keys(t->'exam'->'scores') v)
             is not distinct from (select jsonb_agg(v order by v) from jsonb_object_keys(ex->'scores') v)) then skipped=skipped+1;
      else todo=todo||jsonb_build_array(jsonb_build_object('key',key_source,'exam',ex)); n=n+1;
        score_count=score_count+(select count(*) from jsonb_object_keys(ex->'scores'));
      end if;
    end if;
  end loop;
  if p_preview then return jsonb_build_object('ok',true,'preview',true,'added',n,'skipped',skipped,'scores',score_count,'duplicates',conflicts); end if;
  if n=0 and not p_settings then return jsonb_build_object('ok',true,'preview',false,'added',0,'skipped',skipped,'scores',0,'modulesAdded',0,'settingsRestored',false); end if;
  -- Reuse only the same name AND the same subject set. Otherwise keep both combinations.
  for m in select value from jsonb_array_elements(p_backup->'modules') loop
    mid=null;
    select id into mid from public.score_tracker_modules x where x.user_id=p_user and
      (x.name=m->>'name' or (left(x.name,length(left(m->>'name',20))+3)=left(m->>'name',20)||'（导入' and right(x.name,1)='）'))
      and (select jsonb_agg(v order by v) from jsonb_array_elements_text(x.subjects) v)
        =(select jsonb_agg(v order by v) from jsonb_array_elements_text(m->'subjects') v) limit 1;
    if mid is null then
      module_name=m->>'name'; suffix=1;
      while exists(select 1 from public.score_tracker_modules where user_id=p_user and name=module_name) loop
        suffix=suffix+1; module_name=left(m->>'name',20)||'（导入'||suffix||'）';
      end loop;
      insert into public.score_tracker_modules(user_id,name,subjects,is_builtin,sort_order)
        values(p_user,module_name,m->'subjects',false,100+module_count) returning id into mid;
      module_count=module_count+1;
    end if;
    mmap=mmap||jsonb_build_object(m->>'id',mid::text);
    select name into module_name from public.score_tracker_modules where id=mid and user_id=p_user;
    nmap=nmap||jsonb_build_object(m->>'name',module_name);
  end loop;
  for m in select value from jsonb_array_elements(p_backup->'subjectConfigs') loop
    if p_settings then
      update public.score_tracker_subjects set default_max=(m->>'defaultMax')::numeric,updated_at=now() where user_id=p_user and name=m->>'name';
    end if;
    if not exists(select 1 from public.score_tracker_subjects where user_id=p_user and name=m->>'name') then
      insert into public.score_tracker_subjects(user_id,name,default_max,sort_order) values(p_user,m->>'name',(m->>'defaultMax')::numeric,100);
    end if;
  end loop;
  for item in select value from jsonb_array_elements(todo) loop
    ex=item.value->'exam'; eid=gen_random_uuid(); averages='{}';
    for s in select * from jsonb_each(ex->'averages') loop
      k=s.key;
      if left(k,2)='m:' then
        if not mmap ? substring(k from 3) then raise exception 'missing_module'; end if;
        k='m:'||(mmap->>substring(k from 3));
      end if;
      averages=averages||jsonb_build_object(k,s.value);
    end loop;
    -- Only these explicitly named exam fields can be restored; IDs and owners are fresh.
    insert into public.score_tracker_exams(id,user_id,name,exam_date,end_date,grade_level,is_hidden,
      total_rank,total_participants,total_class_rank,total_class_participants,total_year_position_percent,total_class_position_percent,
      total_actual_score,total_raw_score,city_rank,city_participants,district_rank,district_participants,averages,reflection,question_type_scores)
    values(eid,p_user,ex->>'name',(ex->>'exam_date')::date,(ex->>'end_date')::date,ex->>'grade_level',(ex->>'is_hidden')::boolean,
      (ex->>'total_rank')::integer,(ex->>'total_participants')::integer,(ex->>'total_class_rank')::integer,(ex->>'total_class_participants')::integer,
      (ex->>'total_year_position_percent')::numeric,(ex->>'total_class_position_percent')::numeric,(ex->>'total_actual_score')::numeric,(ex->>'total_raw_score')::numeric,
      (ex->>'city_rank')::integer,(ex->>'city_participants')::integer,(ex->>'district_rank')::integer,(ex->>'district_participants')::integer,
      averages,ex->>'reflection',ex->'question_type_scores');
    for s in select * from jsonb_each(ex->'scores') loop
      insert into public.score_tracker_scores(user_id,exam_id,subject,target_score,actual_score,raw_score,max_score,raw_max_score,rank_position,participant_count,
        class_rank_position,class_participant_count,year_position_percent,class_position_percent,exclude_from_total)
      values(p_user,eid,s.key,(s.value->>'target')::numeric,(s.value->>'actual')::numeric,(s.value->>'raw')::numeric,(s.value->>'max')::numeric,(s.value->>'rawMax')::numeric,
        (s.value->>'rank')::integer,(s.value->>'participants')::integer,(s.value->>'classRank')::integer,(s.value->>'classParticipants')::integer,
        (s.value->>'yearPositionPercent')::numeric,(s.value->>'classPositionPercent')::numeric,(s.value->>'excludeFromTotal')::boolean);
    end loop;
    suffix=0;
    for k in select value from jsonb_array_elements_text(ex->'moduleIds') loop
      mid=(mmap->>k)::uuid; if mid is null then raise exception 'missing_module'; end if;
      suffix=suffix+1; ranks=coalesce(ex->'moduleRanks'->k,'{}');
      insert into public.score_tracker_exam_modules(user_id,exam_id,module_id,sort_order,ranks) values(p_user,eid,mid,suffix,ranks);
    end loop;
    insert into public.score_tracker_backup_import_items(user_id,source_key,exam_id) values(p_user,item.value->>'key',eid);
  end loop;
  if p_settings then
    if jsonb_typeof(p_backup->'category')='object' then
      update public.score_tracker_users set exam_category_label=p_backup->'category'->>'label',
        exam_category_options=p_backup->'category'->'options' where id=p_user;
    end if;
    for s in select * from jsonb_each(p_backup->'participantDefaults') loop
      k=s.key;
      if left(k,2)='m:' then k='m:'||(mmap->>substring(k from 3)); end if;
      if k is not null then defs=defs||jsonb_build_object(k,s.value); end if;
    end loop;
    if (p_backup->'restoreFields'->>'participantDefaults')::boolean then
      update public.score_tracker_users set participant_defaults=defs where id=p_user;
    end if;
    g=p_backup->'goal';
    if jsonb_typeof(g)='object' then
      defs='{}';
      for s in select * from jsonb_each(g->'subjects') loop
        k=coalesce(nmap->>s.key,s.key); defs=defs||jsonb_build_object(k,s.value);
      end loop;
      insert into public.score_tracker_user_goals(user_id,subject_goals,total_goal,dream_school,exam_date,date_name)
      values(p_user,defs,(g->>'totalGoal')::numeric,g->>'school',(g->>'date')::date,g->>'dateName')
      on conflict(user_id) do update set subject_goals=excluded.subject_goals,total_goal=excluded.total_goal,dream_school=excluded.dream_school,
        exam_date=excluded.exam_date,date_name=excluded.date_name,updated_at=now();
    elsif (p_backup->'restoreFields'->>'goal')::boolean then
      delete from public.score_tracker_user_goals where user_id=p_user;
    end if;
  end if;
  return jsonb_build_object('ok',true,'preview',false,'added',n,'skipped',skipped,'scores',score_count,'modulesAdded',module_count,'settingsRestored',p_settings);
end $$;
revoke all on function public.score_tracker_import_backup(uuid,jsonb,boolean,boolean) from public,anon,authenticated;
grant execute on function public.score_tracker_import_backup(uuid,jsonb,boolean,boolean) to service_role;
