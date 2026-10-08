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
  where not u.is_admin and (t.query_key='' or position(lower(t.query_key) in lower(u.username))>0 or position(lower(t.query_key) in lower(u.original_username))>0 or exists(select 1 from public.score_tracker_exams e where e.user_id=u.id and t.query_score is not null
    and ((exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (s.actual_score=t.query_score or s.raw_score=t.query_score)))
      or coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score
      or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score)))
),
r as (select *, (case when username_match then 4 else 0 end + case when exam_match then 3 else 0 end + case when school_match then 1 else 0 end + case when query_score_match then 2 else 0 end) as strength from x
  where query_username_match or query_score_match or username_match or exam_match or school_match)
select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'exams',(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select e.name,e.exam_date,e.total_actual_score,e.total_raw_score,e.total_rank,
    (select coalesce(jsonb_agg(jsonb_build_object('subject',s.subject,'actual_score',s.actual_score,'raw_score',s.raw_score,'rank_position',s.rank_position)),'[]'::jsonb) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=r.id) as scores
    from public.score_tracker_exams e cross join t where e.user_id=r.id order by
      (coalesce(t.evidence->>'exam_name','')<>'' and position(lower(t.evidence->>'exam_name') in lower(e.name))>0) desc,e.exam_date desc limit 5) v),
  'school',(select p.school->>'name' from public.score_tracker_setup_profiles p where p.user_id=r.id),
  'exam_count',(select count(*) from public.score_tracker_exams e where e.user_id=r.id))), '[]'::jsonb) from r;
$function$
