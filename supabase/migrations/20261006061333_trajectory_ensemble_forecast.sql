-- Skip exams with none of the requested subjects; retain genuine incomplete marks.
CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_points(p_subjects text[], p_metric text, p_category text)
 RETURNS TABLE(uid uuid, vals numeric[], contexts text[])
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with points as (
    select e.user_id, e.exam_date, e.created_at, e.id,
      jsonb_build_array(coalesce(e.grade_level,''), s.basket)::text as context,
      case when p_subjects is null and p_metric = 'year' then
        coalesce(e.total_year_position_percent, case when e.total_rank between 1 and e.total_participants then 100.0*e.total_rank/nullif(e.total_participants,0) end)
      when p_subjects is null and p_metric = 'class' then
        coalesce(e.total_class_position_percent, case when e.total_class_rank between 1 and e.total_class_participants then 100.0*e.total_class_rank/nullif(e.total_class_participants,0) end)
      when p_metric = 'score' then
        case when s.complete and s.max_total > 0 then 100.0 * (case when p_subjects is null then coalesce(e.total_actual_score,s.score_total) else s.score_total end) / s.max_total end
      when s.rank_complete then s.rank_median end as value
    from public.score_tracker_exams e
    join public.score_tracker_trajectory_sharing sharing on sharing.user_id=e.user_id and sharing.enabled
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
    where not coalesce(e.is_hidden,false) and e.exam_date<=current_date
      and (p_subjects is null or s.basket is not null)
      and (p_category='__all__' or (p_category='__none__' and coalesce(e.grade_level,'')='') or e.grade_level=p_category)
  )
  select user_id, array_agg(case when value between 0 and 100 then value end order by exam_date,created_at,id),
    array_agg(context order by exam_date,created_at,id) from points group by user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_points_for_request(p_subjects text[], p_metric text, p_category text, p_requester uuid)
 RETURNS TABLE(uid uuid, vals numeric[], contexts text[])
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with points as (
    select e.user_id, e.exam_date, e.created_at, e.id,
      jsonb_build_array(coalesce(e.grade_level,''), s.basket)::text as context,
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
    where (coalesce(sharing.enabled,false) or exists (
        select 1 from public.score_tracker_trajectory_sharing access
        where access.user_id=p_requester and access.enabled and access.test_all_database
      )) and not coalesce(e.is_hidden,false) and e.exam_date<=current_date
      and (p_subjects is null or s.basket is not null)
      and (p_category='__all__' or (p_category='__none__' and coalesce(e.grade_level,'')='') or e.grade_level=p_category)
  )
  select user_id, array_agg(case when value between 0 and 100 then value end order by exam_date,created_at,id),
    array_agg(context order by exam_date,created_at,id) from points group by user_id;
$function$
;

-- Opt-in ensemble endpoint; the legacy three-reference RPC remains unchanged.
CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_match_ensemble(p_user_id uuid, p_subjects text[] DEFAULT NULL::text[], p_metric text DEFAULT 'year'::text, p_category text DEFAULT '__all__'::text, p_match_mode text DEFAULT 'shape'::text, p_reference_policy text DEFAULT 'balanced'::text, p_min_history integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
 SET statement_timeout TO '12s'
AS $function$
declare
  mine numeric[];
  ctx text[];
  target numeric[]:='{}';
  current_context text;
  i int;
  n int;
  matches jsonb;
  matched_uids uuid[];
begin
  if not exists(select 1 from public.score_tracker_trajectory_sharing where user_id=p_user_id and enabled) then
    return jsonb_build_object('enabled',false,'matches','[]'::jsonb);
  end if;
  if p_metric is null or p_metric not in ('year','class','score') or p_match_mode is null or p_match_mode not in ('shape','overlap')
    or p_reference_policy is null or p_reference_policy not in ('balanced','long','recent')
    or p_min_history is null or p_min_history not between 3 and 1000
    or p_category is null or length(p_category)>40
    or (p_subjects is not null and (cardinality(p_subjects) not between 1 and 20 or array_position(p_subjects,null) is not null)) then
    raise exception 'Invalid trajectory filters';
  end if;
  select vals,contexts into mine,ctx from public.score_tracker_trajectory_points(p_subjects,p_metric,p_category) where uid=p_user_id;
  -- Ignore trailing exams that have no usable value for this metric. They
  -- should not hide an otherwise valid recent trajectory.
  i:=coalesce(cardinality(mine),0);
  while i>0 loop
    exit when mine[i] is not null;
    i:=i-1;
  end loop;
  if i>0 then
    current_context:=ctx[i];
    while i>0 loop
      exit when mine[i] is null or ctx[i]<>current_context;
      target:=array_prepend(mine[i],target);i:=i-1;
    end loop;
  end if;
  n:=cardinality(target);
  if n<p_min_history then
    return jsonb_build_object('enabled',true,'reason','need_history','history',target,'matches','[]'::jsonb,'match_mode',p_match_mode,'reference_policy',p_reference_policy,'min_history',p_min_history);
  end if;
  with pool as materialized (
    select * from public.score_tracker_trajectory_points_for_request(p_subjects,p_metric,p_category,p_user_id) where uid<>p_user_id
  ), observations as (
    select p.uid,k,p.vals[k] as v,p.contexts[k] as context,
      lag(p.vals[k]) over(partition by p.uid order by k) as previous_v,
      lag(p.contexts[k]) over(partition by p.uid order by k) as previous_context
    from pool p cross join lateral generate_series(1,cardinality(p.vals)) k
  ), grouped as (
    select *,sum(case when v is null or previous_v is null or context<>previous_context then 1 else 0 end)
      over(partition by uid order by k) as run from observations
  ), runs as materialized (
    select uid,run,array_agg(v order by k) as vals from grouped
    where v is not null and context=current_context group by uid,run having count(*)>=p_min_history+1
  ), segments as (
    select uid,run,vals,g.finish,h.k,vals[g.finish-h.k+1:g.finish] as history
    from runs cross join lateral generate_series(p_min_history,cardinality(vals)-1) g(finish)
    cross join lateral generate_series(p_min_history,least(g.finish,n,case when p_reference_policy='recent' then greatest(5,p_min_history) else n end)) h(k)
  ), statistics as (
    select s.*,a.mse,a.vx,a.vy,a.cv
    from segments s cross join lateral (
      select avg(power(x-y,2)) as mse,var_pop(x) as vx,var_pop(y) as vy,covar_pop(x::double precision,y::double precision)::numeric as cv
      from (
        select target[n-s.k+j] as x,s.history[j] as y
        from generate_series(1,s.k) j
      ) aligned
    ) a
  ), errors as (
    select *,sqrt(greatest(0,mse)) as level_gap,sqrt(greatest(0,vx+vy-2*cv)) as centered_gap,
      case when sqrt(vx)<1 and sqrt(vy)<1 then sqrt(greatest(0,vx+vy-2*cv)) else
        sqrt(greatest(0,vx/power(greatest(sqrt(vx),1),2)+vy/power(greatest(sqrt(vy),1),2)-2*cv/(greatest(sqrt(vx),1)*greatest(sqrt(vy),1)))) end as shape_error,
      0.6/sqrt((k-2)::numeric)+0.9*(1-k::numeric/n) as support_penalty
    from statistics
  ), fits as (
    select *,case when p_match_mode='shape' then shape_error/0.9+
      0.1*abs(sqrt(vx)-sqrt(vy))/greatest(sqrt(vx),sqrt(vy),1)
      else 0.75*level_gap/12+0.25*centered_gap/10 end as fit_error
    from errors
    where (p_match_mode='shape' and shape_error<=0.9)
       or (p_match_mode='overlap' and level_gap<=12 and centered_gap<=10)
  ), distances as (
    select *,fit_error+case when p_reference_policy='recent' then 0.6/sqrt((k-2)::numeric) else support_penalty end as distance,
      case when fit_error<=0.65 then 0 else 1 end as fit_band from fits
  ), best_scores as (
    select *,min(fit_band) over(partition by uid) as best_band,
      min(distance) over(partition by uid,fit_band) as best_distance
    from distances
  ), ranked as (
    select *,row_number() over(partition by uid order by case when p_reference_policy in ('balanced','long') then k else 0 end desc,distance,k desc,run desc,finish desc) as best
    from best_scores where fit_band=best_band and (p_reference_policy<>'balanced' or distance<=best_distance+0.05)
  ), top_three as (
    select * from ranked where best=1 order by fit_band,case when p_reference_policy='long' then k else 0 end desc,distance,k desc,uid limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object('history',history,'history_length',k,'own_history_start',n-k,'own_history_length',k,
    'future',vals[finish+1:least(finish+3,cardinality(vals))],'gap',round(distance,2),'match_score',round(100*exp(-greatest(fit_error,0)))) order by fit_band,case when p_reference_policy='long' then k else 0 end desc,distance,k desc,uid),'[]'::jsonb),
    coalesce(array_agg(uid order by fit_band,case when p_reference_policy='long' then k else 0 end desc,distance,k desc,uid),'{}'::uuid[])
    into matches,matched_uids from top_three;

  if cardinality(matched_uids)>0 then
    insert into public.score_tracker_trajectory_match_exposures(owner_user_id,matcher_user_id,first_matched_at,last_matched_at)
      select matched_uid,p_user_id,now(),now() from unnest(matched_uids) as rows(matched_uid)
      where not exists(select 1 from public.score_tracker_trajectory_sharing test_access where test_access.user_id=p_user_id and test_access.test_all_database)
      on conflict (owner_user_id,matcher_user_id) do update set last_matched_at=excluded.last_matched_at;
  end if;

  return jsonb_build_object('enabled',true,'history',target,'matches',matches,'metric',p_metric,'match_mode',p_match_mode,'reference_policy',p_reference_policy,'min_history',p_min_history,
    'reason',case when jsonb_array_length(matches)=0 then 'no_match' else 'matched' end);
end;
$function$
;
revoke all on function public.score_tracker_trajectory_match_ensemble(uuid,text[],text,text,text,text,int) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_match_ensemble(uuid,text[],text,text,text,text,int) to service_role;
