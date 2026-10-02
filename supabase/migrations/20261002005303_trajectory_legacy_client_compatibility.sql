-- Keep the fixed-length response for previously deployed clients.
create or replace function public.score_tracker_trajectory_match(p_user_id uuid, p_subjects text[] default null, p_metric text default 'year', p_category text default '__all__')
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='8s' as $$
declare mine numeric[]; ctx text[]; target numeric[] := '{}'; current_context text; i int; n int; matches jsonb;
begin
  if not exists(select 1 from public.score_tracker_trajectory_sharing where user_id=p_user_id and enabled) then
    return jsonb_build_object('enabled',false,'matches','[]'::jsonb);
  end if;
  if p_metric not in ('year','class','score') or p_category is null or length(p_category)>40
    or (p_subjects is not null and (cardinality(p_subjects) not between 1 and 20 or array_position(p_subjects,null) is not null)) then
    raise exception 'Invalid trajectory filters';
  end if;
  select vals,contexts into mine,ctx from public.score_tracker_trajectory_points(p_subjects,p_metric,p_category) where uid=p_user_id;
  i:=coalesce(cardinality(mine),0);
  if i>0 then
    current_context:=ctx[i];
    while i>0 loop
      exit when mine[i] is null or ctx[i]<>current_context;
      target:=array_prepend(mine[i],target); i:=i-1;
    end loop;
  end if;
  n:=cardinality(target);
  if n<3 then return jsonb_build_object('enabled',true,'reason','need_history','history',target,'matches','[]'::jsonb); end if;
  with candidates as (
    select p.uid,p.vals,p.contexts,g.finish,
      sqrt((select avg(power(p.vals[g.finish-n+k]-target[k],2)) from generate_series(1,n) k)) as level_gap,
      sqrt((select avg(power((p.vals[g.finish-n+k]-p.vals[g.finish-n+k-1])-(target[k]-target[k-1]),2)) from generate_series(2,n) k)) as step_gap
    from public.score_tracker_trajectory_points_for_request(p_subjects,p_metric,p_category,p_user_id) p
    cross join lateral generate_series(n,cardinality(p.vals)-1) g(finish)
    where p.uid<>p_user_id
      and not exists(select 1 from generate_series(g.finish-n+1,g.finish+1) k where p.vals[k] is null or p.contexts[k]<>current_context)
  ), scored as (
    select *,level_gap*0.6+step_gap*0.4 as distance,
      row_number() over(partition by uid order by level_gap*0.6+step_gap*0.4,finish desc) as best
    from candidates where level_gap<=12 and step_gap<=10
  ), top_three as (
    select * from scored where best=1 order by distance,uid limit 3
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'history',vals[finish-n+1:finish],
    'future',(select jsonb_agg(vals[k] order by k) from generate_series(finish+1,least(finish+3,cardinality(vals))) k
      where not exists(select 1 from generate_series(finish+1,k) j where vals[j] is null or contexts[j]<>current_context)),
    'gap',round(distance,1)
  ) order by distance,uid),'[]'::jsonb) into matches from top_three;
  return jsonb_build_object('enabled',true,'history',target,'matches',matches,'metric',p_metric,
    'reason',case when jsonb_array_length(matches)=0 then 'no_match' else 'matched' end);
end;
$$;
revoke all on function public.score_tracker_trajectory_match(uuid,text[],text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_match(uuid,text[],text,text) to service_role;

