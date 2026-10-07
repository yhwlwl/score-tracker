-- Read-only shared-pool snapshot. For math change options.subjects to array['数学']::text[].
with options as (select null::text[] subjects,'year'::text metric,'__all__'::text category,date '2026-10-07' as_of), points as (
    select e.user_id, e.exam_date, e.created_at, e.id,
      jsonb_build_array(coalesce(e.grade_level,''), s.basket)::text as context,
      case when ((select subjects from options)::text[]) is null and (select metric from options) = 'year' then
        coalesce(e.total_year_position_percent, case when e.total_rank between 1 and e.total_participants then 100.0*e.total_rank/nullif(e.total_participants,0) end)
      when ((select subjects from options)::text[]) is null and (select metric from options) = 'class' then
        coalesce(e.total_class_position_percent, case when e.total_class_rank between 1 and e.total_class_participants then 100.0*e.total_class_rank/nullif(e.total_class_participants,0) end)
      when (select metric from options) = 'score' then
        case when s.complete and s.max_total > 0 then 100.0 * (case when ((select subjects from options)::text[]) is null then coalesce(e.total_actual_score,s.score_total) else s.score_total end) / s.max_total end
      when s.rank_complete then s.rank_median end as value
    from public.score_tracker_exams e
    join public.score_tracker_trajectory_sharing sharing on sharing.user_id=e.user_id and sharing.enabled
    cross join lateral (
      select string_agg(r.subject, '|' order by r.subject) as basket,
        count(*)>0 and bool_and(r.actual_score is not null and r.max_score>0 and r.actual_score between 0 and r.max_score)
          and (((select subjects from options)::text[]) is null or count(*)=cardinality(((select subjects from options)::text[]))) as complete,
        sum(r.actual_score) as score_total, sum(r.max_score) as max_total,
        count(*)>0 and count(v.pos)=count(*) and (((select subjects from options)::text[]) is null or count(*)=cardinality(((select subjects from options)::text[]))) as rank_complete,
        percentile_cont(0.5) within group(order by v.pos)::numeric as rank_median
      from public.score_tracker_scores r
      cross join lateral (select case when (select metric from options)='class' then
        coalesce(r.class_position_percent,case when r.class_rank_position between 1 and coalesce(r.class_participant_count,e.total_class_participants) then 100.0*r.class_rank_position/nullif(coalesce(r.class_participant_count,e.total_class_participants),0) end)
      else coalesce(r.year_position_percent,case when r.rank_position between 1 and coalesce(r.participant_count,e.total_participants) then 100.0*r.rank_position/nullif(coalesce(r.participant_count,e.total_participants),0) end) end as pos) v
      where r.exam_id=e.id and r.user_id=e.user_id
        and (case when ((select subjects from options)::text[]) is null then not coalesce(r.exclude_from_total,false) else r.subject=any(((select subjects from options)::text[])) end)
    ) s
    where not coalesce(e.is_hidden,false) and e.exam_date<=(select as_of from options)
      and ((select category from options)='__all__' or ((select category from options)='__none__' and coalesce(e.grade_level,'')='') or e.grade_level=(select category from options))
  )
select md5(user_id::text) uid,case when md5(user_id::text)='40ad66a6c7c5375ab33e21bb26e3745a' then 'admin1' when md5(user_id::text)=md5('46e774f0-040e-420b-8d29-ae8555eef5a6') then 'excluded-test' else null end target,jsonb_agg(jsonb_build_object('v',case when value between 0 and 100 then value end,'ctx',context,'date',exam_date) order by exam_date,created_at,id) points from points group by user_id order by user_id;
