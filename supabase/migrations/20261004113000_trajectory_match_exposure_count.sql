-- Keep an anonymous, distinct-user count of who has actually received a match
-- containing this user's trajectory. No usernames, schools or exam names are stored.
create table if not exists public.score_tracker_trajectory_match_exposures (
  owner_user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  matcher_user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  first_matched_at timestamptz not null default now(),
  last_matched_at timestamptz not null default now(),
  primary key (owner_user_id, matcher_user_id),
  check (owner_user_id <> matcher_user_id)
);
alter table public.score_tracker_trajectory_match_exposures enable row level security;
revoke all on public.score_tracker_trajectory_match_exposures from public, anon, authenticated;
grant select, insert, update on public.score_tracker_trajectory_match_exposures to service_role;
create index if not exists score_tracker_trajectory_match_exposures_owner_idx
  on public.score_tracker_trajectory_match_exposures(owner_user_id);

create or replace function public.score_tracker_trajectory_matcher_count(p_user_id uuid)
returns integer language sql stable security invoker set search_path='' as $$
  select count(*)::integer
  from public.score_tracker_trajectory_match_exposures
  where owner_user_id=p_user_id;
$$;
revoke all on function public.score_tracker_trajectory_matcher_count(uuid) from public, anon, authenticated;
grant execute on function public.score_tracker_trajectory_matcher_count(uuid) to service_role;

-- The configured matcher is the current endpoint path. It records only the
-- distinct requester/owner pair for the top three returned anonymous tracks.
create or replace function public.score_tracker_trajectory_match_configured(
  p_user_id uuid,
  p_subjects text[] default null,
  p_metric text default 'year',
  p_category text default '__all__',
  p_match_mode text default 'shape',
  p_reference_policy text default 'balanced',
  p_min_history int default 3
)
returns jsonb language plpgsql volatile security invoker set search_path='' set statement_timeout='12s' as $$
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
  i:=coalesce(cardinality(mine),0);
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
    select * from ranked where best=1 order by fit_band,case when p_reference_policy='long' then k else 0 end desc,distance,k desc,uid limit 3
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
$$;
revoke all on function public.score_tracker_trajectory_match_configured(uuid,text[],text,text,text,text,int) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_match_configured(uuid,text[],text,text,text,text,int) to service_role;

create or replace function public.score_tracker_trajectory_match_adaptive(p_user_id uuid,p_subjects text[] default null,p_metric text default 'year',p_category text default '__all__',p_match_mode text default 'shape')
returns jsonb language sql volatile security invoker set search_path='' set statement_timeout='12s' as $$
  select public.score_tracker_trajectory_match_configured(p_user_id,p_subjects,p_metric,p_category,p_match_mode,'balanced',3);
$$;
revoke all on function public.score_tracker_trajectory_match_adaptive(uuid,text[],text,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_match_adaptive(uuid,text[],text,text,text) to service_role;

create or replace function public.score_tracker_trajectory_match(p_user_id uuid,p_subjects text[] default null,p_metric text default 'year',p_category text default '__all__')
returns jsonb language sql volatile security invoker set search_path='' as $$
  select public.score_tracker_trajectory_match_adaptive(p_user_id,p_subjects,p_metric,p_category,'overlap');
$$;
revoke all on function public.score_tracker_trajectory_match(uuid,text[],text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_match(uuid,text[],text,text) to service_role;
