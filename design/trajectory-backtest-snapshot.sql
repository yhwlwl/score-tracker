-- Read-only, administrative snapshot export. Raw results belong in private scratch.
-- Mathematics: keep array['数学']; total: replace it with null::text[].
-- Mirrors the existing test account's eligible reference pool; no tokens or passwords.
with options as (select array['数学']::text[] as subjects), points as (
    select e.user_id, e.exam_date, e.created_at, e.id,
      jsonb_build_array(coalesce(e.grade_level,''), s.basket)::text as context,
      case when ((select subjects from options)::text[]) is null and 'year' = 'year' then
        coalesce(e.total_year_position_percent, case when e.total_rank between 1 and e.total_participants then 100.0*e.total_rank/nullif(e.total_participants,0) end)
      when ((select subjects from options)::text[]) is null and 'year' = 'class' then
        coalesce(e.total_class_position_percent, case when e.total_class_rank between 1 and e.total_class_participants then 100.0*e.total_class_rank/nullif(e.total_class_participants,0) end)
      when 'year' = 'score' then
        case when s.complete and s.max_total > 0 then 100.0 * (case when ((select subjects from options)::text[]) is null then coalesce(e.total_actual_score,s.score_total) else s.score_total end) / s.max_total end
      when s.rank_complete then s.rank_median end as value
    from public.score_tracker_exams e
    left join public.score_tracker_trajectory_sharing sharing on sharing.user_id=e.user_id
    cross join lateral (
      select string_agg(r.subject, '|' order by r.subject) as basket,
        count(*)>0 and bool_and(r.actual_score is not null and r.max_score>0 and r.actual_score between 0 and r.max_score)
          and (((select subjects from options)::text[]) is null or count(*)=cardinality(((select subjects from options)::text[]))) as complete,
        sum(r.actual_score) as score_total, sum(r.max_score) as max_total,
        count(*)>0 and count(v.pos)=count(*) and (((select subjects from options)::text[]) is null or count(*)=cardinality(((select subjects from options)::text[]))) as rank_complete,
        percentile_cont(0.5) within group(order by v.pos)::numeric as rank_median
      from public.score_tracker_scores r
      cross join lateral (select case when 'year'='class' then
        coalesce(r.class_position_percent,case when r.class_rank_position between 1 and coalesce(r.class_participant_count,e.total_class_participants) then 100.0*r.class_rank_position/nullif(coalesce(r.class_participant_count,e.total_class_participants),0) end)
      else coalesce(r.year_position_percent,case when r.rank_position between 1 and coalesce(r.participant_count,e.total_participants) then 100.0*r.rank_position/nullif(coalesce(r.participant_count,e.total_participants),0) end) end as pos) v
      where r.exam_id=e.id and r.user_id=e.user_id
        and (case when ((select subjects from options)::text[]) is null then not coalesce(r.exclude_from_total,false) else r.subject=any(((select subjects from options)::text[])) end)
    ) s
    where (coalesce(sharing.enabled,false) or exists (
        select 1 from public.score_tracker_trajectory_sharing access
        where access.user_id=(select id from public.score_tracker_users where username='admin1') and access.enabled and access.test_all_database
      )) and not coalesce(e.is_hidden,false) and e.exam_date<=current_date
      and ('__all__'='__all__' or ('__all__'='__none__' and coalesce(e.grade_level,'')='') or e.grade_level='__all__')
  )
  select md5(p.user_id::text) as uid,
    case when u.username in ('admin1','showcase') then u.username else null end as target,
    array_agg(jsonb_build_object('v',case when p.value between 0 and 100 then p.value end,'ctx',p.context,'date',p.exam_date)
      order by p.exam_date,p.created_at,p.id) as points
  from points p join public.score_tracker_users u on u.id=p.user_id group by p.user_id,u.username;
