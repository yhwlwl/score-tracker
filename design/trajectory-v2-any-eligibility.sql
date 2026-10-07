-- Read-only before/after eligibility; same statement and source rows for both rules.
with exams as materialized (
 select e.* from public.score_tracker_exams e join public.score_tracker_trajectory_sharing sh on sh.user_id=e.user_id and sh.enabled
 where not coalesce(e.is_hidden,false) and e.exam_date<=date '2026-10-07'
), choices as (select distinct user_id,subject from public.score_tracker_scores),
subject_points as (
 select e.user_id,e.exam_date,e.created_at,e.id,coalesce(e.grade_level,'') category,r.subject basket,'subject:'||c.subject channel,
 coalesce(r.year_position_percent,case when r.rank_position between 1 and coalesce(r.participant_count,e.total_participants) then 100.0*r.rank_position/nullif(coalesce(r.participant_count,e.total_participants),0) end) year_value,
 coalesce(r.class_position_percent,case when r.class_rank_position between 1 and coalesce(r.class_participant_count,e.total_class_participants) then 100.0*r.class_rank_position/nullif(coalesce(r.class_participant_count,e.total_class_participants),0) end) class_value,
 case when r.max_score>0 and r.actual_score between 0 and r.max_score then 100.0*r.actual_score/r.max_score end score_value
 from exams e join choices c on c.user_id=e.user_id left join public.score_tracker_scores r on r.exam_id=e.id and r.user_id=e.user_id and r.subject=c.subject
), total_points as (
 select e.user_id,e.exam_date,e.created_at,e.id,coalesce(e.grade_level,'') category,s.basket,'total' channel,
 coalesce(e.total_year_position_percent,case when e.total_rank between 1 and e.total_participants then 100.0*e.total_rank/nullif(e.total_participants,0) end) year_value,
 coalesce(e.total_class_position_percent,case when e.total_class_rank between 1 and e.total_class_participants then 100.0*e.total_class_rank/nullif(e.total_class_participants,0) end) class_value,
 case when s.complete and s.max_total>0 then 100.0*coalesce(e.total_actual_score,s.score_total)/s.max_total end score_value
 from exams e cross join lateral (
  select string_agg(r.subject,'|' order by r.subject) basket,count(*)>0 and bool_and(r.actual_score is not null and r.max_score>0 and r.actual_score between 0 and r.max_score) complete,sum(r.actual_score) score_total,sum(r.max_score) max_total
  from public.score_tracker_scores r where r.exam_id=e.id and r.user_id=e.user_id and not coalesce(r.exclude_from_total,false)
 ) s
), points as (select * from total_points union all select * from subject_points), channels as materialized (
 select p.user_id,p.channel,m.metric,p.basket,p.category,case when m.v between 0 and 100 then m.v end v,
 row_number() over(partition by p.user_id,p.channel,m.metric order by p.exam_date,p.created_at,p.id) k
 from points p cross join lateral (values('year',p.year_value),('class',p.class_value),('score',p.score_value)) m(metric,v)
), old_observations as (
 select *,lag(v) over(partition by user_id,channel,metric order by k) previous_v,
 lag(category) over(partition by user_id,channel,metric order by k) previous_category,
 lag(basket) over(partition by user_id,channel,metric order by k) previous_basket from channels
), old_grouped as (
 select *,sum(case when v is null or previous_v is null or category is distinct from previous_category or basket is distinct from previous_basket then 1 else 0 end)
 over(partition by user_id,channel,metric order by k) run from old_observations
), old_runs as (
 select user_id,channel,metric,run,count(*) n,max(k) end_k from old_grouped where v is not null group by 1,2,3,4
), old_latest as (
 select distinct on(user_id,channel,metric) user_id,channel,metric,n from old_runs order by user_id,channel,metric,end_k desc
), valid as (
 select *,lag(basket) over(partition by user_id,channel,metric order by k) previous_basket from channels where v is not null
), new_grouped as (
 select *,sum(case when basket is distinct from previous_basket then 1 else 0 end) over(partition by user_id,channel,metric order by k) run from valid
), new_runs as (
 select user_id,channel,metric,run,count(*) n,max(k) end_k from new_grouped group by 1,2,3,4
), new_latest as (
 select distinct on(user_id,channel,metric) user_id,channel,metric,n from new_runs order by user_id,channel,metric,end_k desc
), users as (
 select coalesce(o.user_id,n.user_id) user_id,max(coalesce(o.n,0)) old_n,max(coalesce(n.n,0)) new_n
 from old_latest o full join new_latest n using(user_id,channel,metric) group by 1
)
select count(*) users_with_any_valid_metric,count(*) filter(where old_n>=3) old_eligible,
count(*) filter(where new_n>=2) new_preliminary_or_formal,count(*) filter(where new_n>=3) new_formal from users;
