-- Versioned, opt-in API: legacy functions and privileges remain unchanged.
CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_points_v2(p_subjects text[],p_metric text,p_category text,p_requester uuid)
RETURNS TABLE(uid uuid,seq bigint,exam_date date,category text,basket text,value numeric,unrelated boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $points$
with points as (
    select e.user_id, e.exam_date, e.created_at, e.id,
      coalesce(e.grade_level,'') as category, s.basket, (p_subjects is not null and s.basket is null) as unrelated,
      case when p_subjects is null and p_metric = 'year' then
        coalesce(e.total_year_position_percent, case when e.total_rank between 1 and e.total_participants then 100.0*e.total_rank/nullif(e.total_participants,0) end)
      when p_subjects is null and p_metric = 'class' then
        coalesce(e.total_class_position_percent, case when e.total_class_rank between 1 and e.total_class_participants then 100.0*e.total_class_rank/nullif(e.total_class_participants,0) end)
      when p_metric = 'score' then
        case when s.complete and s.max_total > 0 then 100.0 * (case when p_subjects is null then coalesce(e.total_actual_score,s.score_total) else s.score_total end) / s.max_total end
      when s.rank_complete then s.rank_median end as value
    from public.score_tracker_exams e
    left join public.score_tracker_trajectory_sharing sharing on sharing.user_id=e.user_id
    cross join lateral (
      select string_agg(r.subject, '|' order by r.subject) as basket,
        count(*)>0 and bool_and(r.actual_score is not null and r.max_score>0 and r.actual_score between 0 and r.max_score)
          and (p_subjects is null or count(*)=cardinality(p_subjects)) as complete,
        sum(r.actual_score) as score_total, sum(r.max_score) as max_total,
        count(*)>0 and count(v.pos)=count(*) and (p_subjects is null or count(*)=cardinality(p_subjects)) as rank_complete,
        percentile_cont(0.5) within group(order by v.pos)::numeric as rank_median
      from public.score_tracker_scores r
      cross join lateral (select case when p_metric='class' then
        coalesce(r.class_position_percent,case when r.class_rank_position between 1 and coalesce(r.class_participant_count,e.total_class_participants) then 100.0*r.class_rank_position/nullif(coalesce(r.class_participant_count,e.total_class_participants),0) end)
      else coalesce(r.year_position_percent,case when r.rank_position between 1 and coalesce(r.participant_count,e.total_participants) then 100.0*r.rank_position/nullif(coalesce(r.participant_count,e.total_participants),0) end) end as pos) v
      where r.exam_id=e.id and r.user_id=e.user_id
        and (case when p_subjects is null then not coalesce(r.exclude_from_total,false) else r.subject=any(p_subjects) end)
    ) s
    where (coalesce(sharing.enabled,false) or exists (select 1 from public.score_tracker_trajectory_sharing a where a.user_id=p_requester and a.enabled and a.test_all_database)) and not coalesce(e.is_hidden,false) and e.exam_date<=current_date
      and (p_category='__all__' or (p_category='__none__' and coalesce(e.grade_level,'')='') or e.grade_level=p_category)
  )
select user_id,row_number() over(partition by user_id order by exam_date,created_at,id),exam_date,category,basket,
case when value between 0 and 100 then value end,unrelated from points;
$points$;

CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_match_v2(
p_user_id uuid,p_subjects text[] DEFAULT NULL,p_metric text DEFAULT 'year',p_category text DEFAULT '__all__',
p_match_mode text DEFAULT 'shape',p_reference_policy text DEFAULT 'balanced',p_min_history integer DEFAULT 2,p_same_category boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET statement_timeout='12s'
AS $match$
declare target numeric[]:='{}'; target_dates date[]:='{}'; target_categories text[]:='{}';
n int:=0; minimum int; latest_category text; current_basket text; own_stats jsonb; qualification jsonb;
matches jsonb:='[]'; matched_uids uuid[]:='{}';
begin
if not exists(select 1 from public.score_tracker_trajectory_sharing where user_id=p_user_id and enabled) then
  return jsonb_build_object('enabled',false,'reason','sharing_disabled','matches','[]'::jsonb);
end if;
if p_metric is null or p_metric not in ('year','class','score') or p_match_mode is null or p_match_mode not in ('shape','overlap')
or p_reference_policy is null or p_reference_policy not in ('balanced','long','recent') or p_min_history is null or p_min_history not between 2 and 1000
or p_same_category is null or p_category is null or length(p_category)>40
or (p_subjects is not null and (cardinality(p_subjects) not between 1 and 20 or array_position(p_subjects,null) is not null)) then
  raise exception 'Invalid trajectory filters';
end if;
with own as materialized (
  select * from public.score_tracker_trajectory_points_v2(p_subjects,p_metric,p_category,p_user_id) where uid=p_user_id
), valid as (
  select *,lag(basket) over(order by seq) previous_basket from own where value is not null
), grouped as (
  select *,sum(case when basket is distinct from previous_basket then 1 else 0 end) over(order by seq) run from valid
), recent as (select * from grouped where run=(select max(run) from grouped))
select coalesce(array_agg(value order by seq),'{}'::numeric[]),coalesce(array_agg(exam_date order by seq),'{}'::date[]),
coalesce(array_agg(category order by seq),'{}'::text[]),max(basket),
jsonb_build_object('exam_count',(select count(*) from own),
'skipped_missing',(select count(*) from own where value is null and not unrelated),
'skipped_unrelated',(select count(*) from own where unrelated),
'incompatible_count',(select count(*) from valid)-(select count(*) from recent),
'categories',(select coalesce(jsonb_agg(c),'[]'::jsonb) from (select distinct category c from recent order by category) cats))
into target,target_dates,target_categories,current_basket,own_stats from recent;
n:=cardinality(target); latest_category:=target_categories[n];
minimum:=case when n>=3 then greatest(3,p_min_history) else p_min_history end;
qualification:=own_stats||jsonb_build_object('valid_count',n,'preliminary_required',2,'formal_required',3,
'preliminary_eligible',n>=2,'formal_eligible',n>=3,'required_count',minimum,
'remaining',greatest(0,minimum-n),'level',case when n>=3 then 'formal' when n=2 then 'preliminary' else 'insufficient' end);
if n<minimum then
  return jsonb_build_object('enabled',true,'reason','need_history','history',target,'history_dates',target_dates,
  'qualification',qualification,'matches','[]'::jsonb,'min_history',p_min_history,'same_category',p_same_category,'api_version',2);
end if;
with observations as materialized (
  select *,lag(basket) over(partition by uid order by seq) previous_basket
  from public.score_tracker_trajectory_points_v2(p_subjects,p_metric,p_category,p_user_id)
  where uid<>p_user_id and value is not null and (not p_same_category or category=latest_category)
), grouped as (
  select *,sum(case when basket is distinct from previous_basket then 1 else 0 end) over(partition by uid order by seq) run
  from observations
), runs as materialized (
  select uid,run,array_agg(value order by seq) vals,array_agg(exam_date order by seq) dates,array_agg(category order by seq) categories
  from grouped where basket is not distinct from current_basket group by uid,run having count(*)>=minimum+1
), segments as (
  select uid,run,vals,dates,categories,g.finish,h.k,vals[g.finish-h.k+1:g.finish] history
  from runs cross join lateral generate_series(minimum,cardinality(vals)-1) g(finish)
  cross join lateral generate_series(minimum,least(g.finish,n,case when p_reference_policy='recent' then greatest(5,minimum) else n end)) h(k)
), statistics as (
  select s.*,a.mse,a.vx,a.vy,a.cv
  from segments s cross join lateral (
    select avg(power(x-y,2)) mse,var_pop(x) vx,var_pop(y) vy,covar_pop(x::double precision,y::double precision)::numeric cv
    from (select target[n-s.k+j] x,s.history[j] y from generate_series(1,s.k) j) aligned
  ) a
), errors as (
  select *,sqrt(greatest(0,mse)) level_gap,sqrt(greatest(0,vx+vy-2*cv)) centered_gap,
  case when k=2 then abs((history[2]-history[1])-(target[n]-target[n-1]))/10
  when sqrt(vx)<1 and sqrt(vy)<1 then sqrt(greatest(0,vx+vy-2*cv))
  else sqrt(greatest(0,vx/power(greatest(sqrt(vx),1),2)+vy/power(greatest(sqrt(vy),1),2)-2*cv/(greatest(sqrt(vx),1)*greatest(sqrt(vy),1)))) end shape_error,
  0.6/sqrt(greatest(k-2,1)::numeric)+0.9*(1-k::numeric/n) support_penalty
  from statistics
), fits as (
  select *,case when p_match_mode='shape' then
  case when k=2 then shape_error else shape_error/0.9+0.1*abs(sqrt(vx)-sqrt(vy))/greatest(sqrt(vx),sqrt(vy),1) end
  else 0.75*level_gap/12+0.25*centered_gap/10 end fit_error
  from errors where (p_match_mode='shape' and shape_error<=case when k=2 then 1 else 0.9 end)
  or (p_match_mode='overlap' and level_gap<=12 and centered_gap<=10)
), distances as (
  select *,fit_error+case when p_reference_policy='recent' then 0.6/sqrt(greatest(k-2,1)::numeric) else support_penalty end distance,
  case when fit_error<=0.65 then 0 else 1 end fit_band
  from fits
), best_scores as (
  select *,min(fit_band) over(partition by uid) best_band,min(distance) over(partition by uid,fit_band) best_distance from distances
), ranked as (
  select *,row_number() over(partition by uid order by case when p_reference_policy in ('balanced','long') then k else 0 end desc,distance,k desc,run desc,finish desc) best
  from best_scores where fit_band=best_band and (p_reference_policy<>'balanced' or distance<=best_distance+0.05)
), top_matches as (
  select * from ranked where best=1 order by fit_band,case when p_reference_policy='long' then k else 0 end desc,distance,k desc,uid limit 20
)
select coalesce(jsonb_agg(jsonb_build_object('history',history,'history_length',k,'own_history_start',n-k,'own_history_length',k,
'future',vals[finish+1:least(finish+3,cardinality(vals))],
'gap',round(distance,2),'match_score',case when k=2 then null else round(100*exp(-greatest(fit_error,0))) end,
'preliminary',k=2,'cross_category',categories[finish]<>latest_category)
order by fit_band,case when p_reference_policy='long' then k else 0 end desc,distance,k desc,uid),'[]'::jsonb),
coalesce(array_agg(uid),'{}'::uuid[]) into matches,matched_uids from top_matches;
if cardinality(matched_uids)>0 then
  insert into public.score_tracker_trajectory_match_exposures(owner_user_id,matcher_user_id,first_matched_at,last_matched_at)
  select matched_uid,p_user_id,now(),now() from unnest(matched_uids) rows(matched_uid)
  where not exists(select 1 from public.score_tracker_trajectory_sharing a where a.user_id=p_user_id and a.test_all_database)
  on conflict(owner_user_id,matcher_user_id) do update set last_matched_at=excluded.last_matched_at;
end if;
return jsonb_build_object('enabled',true,'api_version',2,'history',target,'history_dates',target_dates,'qualification',qualification,
'matches',matches,'metric',p_metric,'match_mode',p_match_mode,'reference_policy',p_reference_policy,
'min_history',p_min_history,'same_category',p_same_category,
'reason',case when jsonb_array_length(matches)=0 then 'no_match' when n=2 then 'preliminary' else 'matched' end);
end;
$match$;
revoke all on function public.score_tracker_trajectory_points_v2(text[],text,text,uuid) from public,anon,authenticated;
revoke all on function public.score_tracker_trajectory_match_v2(uuid,text[],text,text,text,text,int,boolean) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_points_v2(text[],text,text,uuid) to service_role;
grant execute on function public.score_tracker_trajectory_match_v2(uuid,text[],text,text,text,text,int,boolean) to service_role;
