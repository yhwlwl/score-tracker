-- Schema/trigger changes have already committed, so this historical read
-- never holds a DDL lock on visit logs, users or the private activity table.
set local statement_timeout = '180s';
with snapshot_time as materialized (select statement_timestamp() as started_at),
activity as (
  select v.user_id,max(v.occurred_at) as last_seen,count(*)::bigint as events,
    coalesce(array_agg(distinct v.session_id::text) filter(where v.session_id is not null),'{}'::text[]) as session_keys,
    coalesce(array_agg(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)
      filter(where v.occurred_at is not null),'{}'::date[]) as active_dates
  from public.score_tracker_visit_logs v where v.user_id is not null group by v.user_id
)
insert into public.score_tracker_admin_user_activity as cached(user_id,last_seen,events,session_keys,active_dates,changed_at)
select u.id,a.last_seen,coalesce(a.events,0),coalesce(a.session_keys,'{}'::text[]),coalesce(a.active_dates,'{}'::date[]),t.started_at
from public.score_tracker_users u cross join snapshot_time t left join activity a on a.user_id=u.id order by u.id
on conflict(user_id) do update set last_seen=excluded.last_seen,events=excluded.events,
  session_keys=excluded.session_keys,active_dates=excluded.active_dates,changed_at=excluded.changed_at
-- Never overwrite a newer, fully recomputed live state with an older snapshot.
where cached.changed_at <= excluded.changed_at;

-- Preserve the complete users contract. All activity metrics are exact,
-- transactionally maintained summaries of the complete original history.
create or replace function public.score_tracker_admin_users_page(
  p_limit integer default 50, p_offset integer default 0, p_search text default null,
  p_sort text default 'last_seen', p_order text default 'desc',
  p_depth_level text default null, p_activity text default null
)
returns table (
  id uuid, username text, is_admin boolean, created_at timestamptz, updated_at timestamptz,
  last_seen timestamptz, sessions bigint, events bigint, days bigint, exam_count bigint,
  actual_exams bigint, score_rows bigint, subjects bigint, feedback_count bigint,
  depth_score integer, depth_level text, total_count bigint
)
-- Avoid JIT compilation overhead for this short, repeatedly executed list query.
language sql stable security invoker set search_path = '' set jit = off as $$
  with settings as (
    select case when p_sort in ('username','last_seen','depth_score','exam_count','actual_exams','score_rows','sessions','events','days','feedback_count')
      then p_sort else 'last_seen' end as sort_key, lower(coalesce(p_order,'desc')) as sort_order
  ), matching_users as materialized (
    select u.id,u.username,u.is_admin,u.created_at,u.updated_at,coalesce(u.depth_score,0)::integer as depth_score,
      case when coalesce(u.depth_score,0)<20 then 'new' when u.depth_score<40 then 'casual'
        when u.depth_score<60 then 'returning' when u.depth_score<80 then 'engaged' else 'power' end::text as depth_level
    from public.score_tracker_users u
    where coalesce(u.is_admin,false)=false
      and (nullif(btrim(p_search),'') is null or u.username ilike '%'||btrim(p_search)||'%'
        or u.original_username ilike '%'||btrim(p_search)||'%' or u.id::text ilike '%'||btrim(p_search)||'%')
      and (nullif(btrim(p_depth_level),'') is null or
        case when coalesce(u.depth_score,0)<20 then 'new' when u.depth_score<40 then 'casual'
          when u.depth_score<60 then 'returning' when u.depth_score<80 then 'engaged' else 'power' end=btrim(p_depth_level))
  ), candidates as materialized (
    select u.*,recent.last_seen,coalesce(recent.sessions,0)::bigint as sort_sessions,coalesce(recent.events,0)::bigint as sort_events,coalesce(recent.days,0)::bigint as sort_days,
      e.exam_count as sort_exams,s.actual_exams as sort_actual,s.score_rows as sort_scores,f.feedback_count as sort_feedback
    from matching_users u cross join settings cfg
    left join public.score_tracker_admin_user_activity recent on recent.user_id=u.id
    left join lateral (
      select count(*)::bigint as exam_count from public.score_tracker_exams e
      where e.user_id=u.id and cfg.sort_key='exam_count'
    ) e on true
    left join lateral (
      select count(*)::bigint as score_rows,count(distinct s.exam_id) filter(where s.actual_score is not null)::bigint as actual_exams
      from public.score_tracker_scores s where s.user_id=u.id and cfg.sort_key in ('score_rows','actual_exams')
    ) s on true
    left join lateral (
      select count(*)::bigint as feedback_count from public.score_tracker_feedback_submissions f
      where f.user_id=u.id and cfg.sort_key='feedback_count'
    ) f on true
    where nullif(btrim(p_activity),'') is null
      or (btrim(p_activity)='active' and recent.last_seen is not null)
      or (btrim(p_activity)='none' and recent.last_seen is null)
  ), user_page as materialized (
    select c.*,count(*) over() as total_count,row_number() over(order by
      case when cfg.sort_order='asc' and cfg.sort_key='username' then c.username end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='username' then c.username end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='last_seen' then c.last_seen end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='last_seen' then c.last_seen end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='depth_score' then c.depth_score end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='depth_score' then c.depth_score end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='exam_count' then c.sort_exams end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='exam_count' then c.sort_exams end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='actual_exams' then c.sort_actual end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='actual_exams' then c.sort_actual end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='score_rows' then c.sort_scores end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='score_rows' then c.sort_scores end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='sessions' then c.sort_sessions end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='sessions' then c.sort_sessions end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='events' then c.sort_events end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='events' then c.sort_events end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='days' then c.sort_days end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='days' then c.sort_days end desc nulls last,
      case when cfg.sort_order='asc' and cfg.sort_key='feedback_count' then c.sort_feedback end asc nulls last,
      case when cfg.sort_order<>'asc' and cfg.sort_key='feedback_count' then c.sort_feedback end desc nulls last,
      c.id asc
    ) as page_order
    from candidates c cross join settings cfg
    order by page_order limit greatest(1,least(coalesce(p_limit,50),100)) offset greatest(coalesce(p_offset,0),0)
  )
  select p.id,p.username,p.is_admin,p.created_at,p.updated_at,p.last_seen,
    p.sort_sessions,p.sort_events,p.sort_days,
    e.exam_count,s.actual_exams,s.score_rows,s.subjects,f.feedback_count,p.depth_score,p.depth_level,p.total_count
  from user_page p cross join settings cfg
  left join lateral (
    select count(*)::bigint as exam_count from public.score_tracker_exams e where e.user_id=p.id
  ) e on true
  left join lateral (
    select count(*)::bigint as score_rows,count(distinct s.exam_id) filter(where s.actual_score is not null)::bigint as actual_exams,
      count(distinct s.subject) filter(where s.actual_score is not null or s.target_score is not null)::bigint as subjects
    from public.score_tracker_scores s where s.user_id=p.id
  ) s on true
  left join lateral (
    select count(*)::bigint as feedback_count from public.score_tracker_feedback_submissions f where f.user_id=p.id
  ) f on true
  order by p.page_order;
$$;
revoke all on function public.score_tracker_admin_users_page(integer,integer,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_admin_users_page(integer,integer,text,text,text,text,text) to service_role;
