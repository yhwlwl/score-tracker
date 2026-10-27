-- Flexible admin-only lookup. All exam/score terms must match the same exam.
create or replace function public.score_tracker_recovery_number_match(value numeric, term text)
returns boolean language sql immutable set search_path='' as $$
select case when term ~ '^[0-9]+([.][0-9]+)?$' then value=term::numeric
when term ~ '^[0-9]+([.][0-9]+)?-[0-9]+([.][0-9]+)?$' then value between split_part(term,'-',1)::numeric and split_part(term,'-',2)::numeric else false end;
$$;
create or replace function public.score_tracker_recovery_query_match(uid uuid, query text, exam uuid default null)
returns boolean language sql stable set search_path='' as $$
with terms as (
 select case when position(':' in token)>0 then split_part(token,':',1) else '' end field,
 case when position(':' in token)>0 then substring(token from position(':' in token)+1) else token end val
 from regexp_split_to_table(lower(btrim(replace(query,'：',':'))),'[[:space:]]+') token
)
select exists(select 1 from public.score_tracker_users u
 left join public.score_tracker_setup_profiles p on p.user_id=u.id
 left join public.score_tracker_exams e on e.user_id=u.id
 where u.id=uid and (exam is null or e.id=exam) and not u.is_admin and not exists(select 1 from terms t where not coalesce(case
 when t.val='' then false
 when t.field in ('用户名','账号') then position(t.val in lower(coalesce(u.username,'')||' '||coalesce(u.original_username,'')))>0
 when t.field='学校' then position(t.val in lower(coalesce(p.school->>'name','')))>0
 when t.field='考试' then position(t.val in lower(e.name))>0
 when t.field='日期' then position(t.val in e.exam_date::text)>0
 when t.field='科目' then exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and position(t.val in lower(s.subject))>0)
 when t.field='总分' then public.score_tracker_recovery_number_match(coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total)),t.val) or public.score_tracker_recovery_number_match(coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total)),t.val)
 when t.field<>'' then exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (t.field='分数' or lower(s.subject)=t.field) and (public.score_tracker_recovery_number_match(s.actual_score,t.val) or public.score_tracker_recovery_number_match(s.raw_score,t.val)))
 else position(t.val in lower(coalesce(u.username,'')||' '||coalesce(u.original_username,'')))>0
 or position(t.val in lower(coalesce(p.school->>'name','')))>0 or position(t.val in lower(e.name))>0 or position(t.val in e.exam_date::text)>0
 or exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (position(t.val in lower(s.subject))>0 or public.score_tracker_recovery_number_match(s.actual_score,t.val) or public.score_tracker_recovery_number_match(s.raw_score,t.val)))
 or public.score_tracker_recovery_number_match(coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total)),t.val)
 or public.score_tracker_recovery_number_match(coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total)),t.val)
 end,false)));
$$;
-- Manual username searches must remain candidates even when ticket evidence is inaccurate.
-- Keep evidence strength separate from manual lookup and preserve the existing function ACL.
CREATE OR REPLACE FUNCTION public.score_tracker_recovery_candidates(p_ticket uuid, p_query text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
with t as (
  select r.*,
    lower(regexp_replace(coalesce(r.evidence->>'subject',''),'[[:space:]·._-]+','','g')) as subject_key,
    nullif(r.evidence->>'score','')::numeric as score_value,
    regexp_replace(btrim(coalesce(p_query,'')),'[[:space:],]+','','g') as query_key,
    case when regexp_replace(btrim(coalesce(p_query,'')),'[[:space:],]+','','g') ~ '^[0-9]+([.][0-9]+)?$' then regexp_replace(btrim(coalesce(p_query,'')),'[[:space:],]+','','g')::numeric end as query_score
  from public.score_tracker_recovery_tickets r where r.id=p_ticket
),
x as (
  select u.id,u.username,u.original_username,u.created_at,
    (t.query_key<>'' and (position(lower(t.query_key) in lower(u.username))>0 or position(lower(t.query_key) in lower(u.original_username))>0)) as query_username_match,
    (t.username_hint<>'' and (lower(u.username)=lower(t.username_hint) or lower(u.original_username)=lower(t.username_hint))) as username_match,
    exists(select 1 from public.score_tracker_exams e where e.user_id=u.id
      and (nullif(t.evidence->>'exam_name','') is not null or nullif(t.evidence->>'exam_date','') is not null or t.score_value is not null)
      and (coalesce(t.evidence->>'exam_name','')='' or position(lower(t.evidence->>'exam_name') in lower(e.name))>0)
      and (coalesce(t.evidence->>'exam_date','')='' or e.exam_date::text=t.evidence->>'exam_date')
      and (t.score_value is null or
        (t.subject_key not in ('总分','总成绩','总分数','合计','总分合计') and exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (t.subject_key='' or s.subject=t.evidence->>'subject') and (s.actual_score=t.score_value or s.raw_score=t.score_value)))
        or ((t.subject_key='' or t.subject_key in ('总分','总成绩','总分数','合计','总分合计')) and
          (coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value
          or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value)))) as exam_match,
    exists(select 1 from public.score_tracker_exams e where e.user_id=u.id and t.score_value is not null
      and (coalesce(t.evidence->>'exam_name','')='' or position(lower(t.evidence->>'exam_name') in lower(e.name))>0)
      and (coalesce(t.evidence->>'exam_date','')='' or e.exam_date::text=t.evidence->>'exam_date')
      and (t.subject_key='' or t.subject_key in ('总分','总成绩','总分数','合计','总分合计'))
      and (coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value
        or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value)) as total_match,
    exists(select 1 from public.score_tracker_setup_profiles p where p.user_id=u.id and coalesce(t.evidence->>'school','')<>'' and position(lower(t.evidence->>'school') in lower(p.school->>'name'))>0) as school_match,
    exists(select 1 from public.score_tracker_exams e where e.user_id=u.id and t.query_score is not null
      and ((exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (s.actual_score=t.query_score or s.raw_score=t.query_score)))
        or coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score
        or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score)) as query_score_match
  from public.score_tracker_users u cross join t
  where not u.is_admin and (t.query_key='' or public.score_tracker_recovery_query_match(u.id,p_query))
),
r as (select *, (case when username_match then 4 else 0 end + case when exam_match then 3 else 0 end + case when school_match then 1 else 0 end + case when query_score_match then 2 else 0 end) as strength from x
  where exists(select 1 from t where t.query_key<>'') or query_username_match or query_score_match or username_match or exam_match or school_match)
select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'exams',(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select e.name,e.exam_date,e.total_actual_score,e.total_raw_score,e.total_rank,
    (select coalesce(jsonb_agg(jsonb_build_object('subject',s.subject,'actual_score',s.actual_score,'raw_score',s.raw_score,'rank_position',s.rank_position)),'[]'::jsonb) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=r.id) as scores
    from public.score_tracker_exams e cross join t where e.user_id=r.id order by
      (t.query_key<>'' and public.score_tracker_recovery_query_match(r.id,p_query,e.id)) desc,
      (coalesce(t.evidence->>'exam_name','')<>'' and position(lower(t.evidence->>'exam_name') in lower(e.name))>0) desc,e.exam_date desc limit 5) v),
  'school',(select p.school->>'name' from public.score_tracker_setup_profiles p where p.user_id=r.id),
  'exam_count',(select count(*) from public.score_tracker_exams e where e.user_id=r.id))), '[]'::jsonb) from r;
$function$;

revoke all on function public.score_tracker_recovery_query_match(uuid,text,uuid),public.score_tracker_recovery_number_match(numeric,text) from public,anon,authenticated;
grant execute on function public.score_tracker_recovery_query_match(uuid,text,uuid),public.score_tracker_recovery_number_match(numeric,text) to service_role;

create or replace function public.score_tracker_recovery_search_tickets(p_search text default '',p_status text default '',p_limit integer default 30,p_offset integer default 0)
returns jsonb language sql stable set search_path='' as $$
with filtered as (
 select r.id,r.ticket_no,r.mode,r.username_hint,r.status,r.created_at,r.updated_at,r.review_note
 from public.score_tracker_recovery_tickets r
 where (p_status='' or r.status=p_status)
 and not exists(select 1 from regexp_split_to_table(lower(btrim(p_search)),'[[:space:]]+') term
 where position(term in lower(concat_ws(' ',r.ticket_no,r.username_hint,r.evidence->>'exam_name',r.evidence->>'exam_date',r.evidence->>'school',r.evidence->>'subject',r.evidence->>'score',r.evidence->>'details',r.review_note)))=0)
), page as (select * from filtered order by updated_at desc,id desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0))
select jsonb_build_object('rows',coalesce((select jsonb_agg(page) from page),'[]'::jsonb),'total_count',(select count(*) from filtered));
$$;
revoke all on function public.score_tracker_recovery_search_tickets(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.score_tracker_recovery_search_tickets(text,text,integer,integer) to service_role;
