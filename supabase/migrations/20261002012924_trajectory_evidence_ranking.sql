-- Rank recent-first references by fit, coverage, and sample support.
-- Good longer matches outrank accidental short snippets; short-only pools remain usable.
create or replace function public.score_tracker_trajectory_match_adaptive(p_user_id uuid,p_subjects text[] default null,p_metric text default 'year',p_category text default '__all__',p_match_mode text default 'shape')
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='12s' as $$
declare mine numeric[];ctx text[];target numeric[]:='{}';current_context text;i int;n int;matches jsonb;
begin
  if not exists(select 1 from public.score_tracker_trajectory_sharing where user_id=p_user_id and enabled) then
    return jsonb_build_object('enabled',false,'matches','[]'::jsonb);
  end if;
  if p_metric is null or p_metric not in ('year','class','score') or p_match_mode is null or p_match_mode not in ('shape','overlap')
    or p_category is null or length(p_category)>40
    or (p_subjects is not null and (cardinality(p_subjects) not between 1 and 20 or array_position(p_subjects,null) is not null)) then
    raise exception 'Invalid trajectory filters';
  end if;
  select vals,contexts into mine,ctx from public.score_tracker_trajectory_points(p_subjects,p_metric,p_category) where uid=p_user_id;
  i:=coalesce(cardinality(mine),0);
  if i>0 then
    current_context:=ctx[i];
    while i>0 loop
      exit when mine[i] is null or ctx[i]<>current_context;
      target:=array_prepend(mine[i],target);i:=i-1;
    end loop;
  end if;
  n:=cardinality(target);
  if n<3 then return jsonb_build_object('enabled',true,'reason','need_history','history',target,'matches','[]'::jsonb,'match_mode',p_match_mode);end if;
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
    where v is not null and context=current_context group by uid,run having count(*)>=4
  ), segments as (
    select uid,run,vals,g.finish,h.k,vals[g.finish-h.k+1:g.finish] as history
    from runs cross join lateral generate_series(3,cardinality(vals)-1) g(finish)
    cross join lateral generate_series(3,least(g.finish,n)) h(k)
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
    -- Put both modes on a comparable 0..1 fit scale. This is a ranking
    -- heuristic, not a probability or a forecast confidence interval.
    select *,case when p_match_mode='shape' then shape_error/0.9+
      0.1*abs(sqrt(vx)-sqrt(vy))/greatest(sqrt(vx),sqrt(vy),1)
      else 0.75*level_gap/12+0.25*centered_gap/10 end as fit_error
    from errors
    where (p_match_mode='shape' and shape_error<=0.9)
       or (p_match_mode='overlap' and level_gap<=12 and centered_gap<=10)
  ), distances as (
    -- More covered exams and more than one independent change provide
    -- better support than a coincidentally close three-exam snippet.
    select *,fit_error+support_penalty as distance,
      case when fit_error<=0.65 then 0 else 1 end as fit_band from fits
  ), best_scores as (
    select *,min(fit_band) over(partition by uid) as best_band,
      min(distance) over(partition by uid,fit_band) as best_distance
    from distances
  ), ranked as (
    -- For the same person, prefer the longest segment within 0.05 of
    -- their best supported fit. Never extend through a poor old segment.
    select *,row_number() over(partition by uid order by k desc,distance,run desc,finish desc) as best
    from best_scores where fit_band=best_band and distance<=best_distance+0.05
  ), top_three as (
    -- Scan and score all candidates before taking three distinct people.
    select * from ranked where best=1 order by fit_band,distance,k desc,uid limit 3
  )
  select coalesce(jsonb_agg(jsonb_build_object('history',history,'history_length',k,'own_history_start',n-k,'own_history_length',k,
    'future',vals[finish+1:least(finish+3,cardinality(vals))],'gap',round(distance,2)) order by fit_band,distance,k desc,uid),'[]'::jsonb)
    into matches from top_three;
  return jsonb_build_object('enabled',true,'history',target,'matches',matches,'metric',p_metric,'match_mode',p_match_mode,
    'reason',case when jsonb_array_length(matches)=0 then 'no_match' else 'matched' end);
end;
$$;
revoke all on function public.score_tracker_trajectory_match_adaptive(uuid,text[],text,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_match_adaptive(uuid,text[],text,text,text) to service_role;

