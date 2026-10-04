-- Sharing is opt-in. Custom application sessions are authenticated by the edge
-- function; only service_role may call these functions or access this table.
create table public.score_tracker_trajectory_sharing (
  user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.score_tracker_trajectory_sharing enable row level security;
revoke all on public.score_tracker_trajectory_sharing from public, anon, authenticated;
grant select, insert, update, delete on public.score_tracker_trajectory_sharing to service_role;

create function public.score_tracker_trajectory_points(p_subjects text[], p_metric text, p_category text)
returns table (uid uuid, vals numeric[], contexts text[])
language sql stable security invoker set search_path = '' as $$
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
      and (p_category='__all__' or (p_category='__none__' and coalesce(e.grade_level,'')='') or e.grade_level=p_category)
  )
  select user_id, array_agg(case when value between 0 and 100 then value end order by exam_date,created_at,id),
    array_agg(context order by exam_date,created_at,id) from points group by user_id;
$$;
revoke all on function public.score_tracker_trajectory_points(text[],text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_trajectory_points(text[],text,text) to service_role;

create function public.score_tracker_trajectory_match(p_user_id uuid, p_subjects text[] default null, p_metric text default 'year', p_category text default '__all__')
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
    while i>0 and cardinality(target)<6 loop
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
    from public.score_tracker_trajectory_points(p_subjects,p_metric,p_category) p
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
