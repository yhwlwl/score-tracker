-- 将管理用户列表改为按表单次聚合，避免逐用户 lateral 重复扫描大表。
create or replace function public.score_tracker_admin_users_page(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null,
  p_sort text default 'last_seen',
  p_order text default 'desc',
  p_depth_level text default null,
  p_activity text default null
)
returns table (
  id uuid,
  username text,
  is_admin boolean,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen timestamptz,
  sessions bigint,
  events bigint,
  days bigint,
  exam_count bigint,
  actual_exams bigint,
  score_rows bigint,
  subjects bigint,
  feedback_count bigint,
  depth_score integer,
  depth_level text,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with activity as (
    select
      v.user_id,
      max(v.occurred_at) as last_seen,
      count(distinct v.session_id)::bigint as sessions,
      count(v.id)::bigint as events,
      count(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)::bigint as days
    from public.score_tracker_visit_logs v
    where v.user_id is not null
    group by v.user_id
  ), exams as (
    select e.user_id, count(*)::bigint as exam_count
    from public.score_tracker_exams e
    where e.user_id is not null
    group by e.user_id
  ), scores as (
    select
      s.user_id,
      count(*)::bigint as score_rows,
      count(distinct s.exam_id) filter (where s.actual_score is not null)::bigint as actual_exams,
      count(distinct s.subject) filter (where s.actual_score is not null or s.target_score is not null)::bigint as subjects
    from public.score_tracker_scores s
    where s.user_id is not null
    group by s.user_id
  ), feedback as (
    select f.user_id, count(*)::bigint as feedback_count
    from public.score_tracker_feedback_submissions f
    where f.user_id is not null
    group by f.user_id
  ), aggregated as (
    select
      u.id,
      u.username,
      u.is_admin,
      u.created_at,
      u.updated_at,
      a.last_seen,
      coalesce(a.sessions, 0)::bigint as sessions,
      coalesce(a.events, 0)::bigint as events,
      coalesce(a.days, 0)::bigint as days,
      coalesce(e.exam_count, 0)::bigint as exam_count,
      coalesce(s.actual_exams, 0)::bigint as actual_exams,
      coalesce(s.score_rows, 0)::bigint as score_rows,
      coalesce(s.subjects, 0)::bigint as subjects,
      coalesce(f.feedback_count, 0)::bigint as feedback_count,
      (
        coalesce(e.exam_count, 0) * 3
        + coalesce(a.days, 0) * 2
      )::integer as depth_score
    from public.score_tracker_users u
    left join activity a on a.user_id = u.id
    left join exams e on e.user_id = u.id
    left join scores s on s.user_id = u.id
    left join feedback f on f.user_id = u.id
    where coalesce(u.is_admin, false) = false
      and (
        nullif(btrim(p_search), '') is null
        or u.username ilike '%' || btrim(p_search) || '%'
        or u.original_username ilike '%' || btrim(p_search) || '%'
        or u.id::text ilike '%' || btrim(p_search) || '%'
      )
  ), filtered as (
    select
      a.*,
      case
        when a.depth_score < 15 then 'new'
        when a.depth_score < 35 then 'casual'
        when a.depth_score < 55 then 'returning'
        when a.depth_score < 75 then 'engaged'
        else 'power'
      end::text as calculated_depth_level
    from aggregated a
    where (
      nullif(btrim(p_depth_level), '') is null
      or (
        case
          when a.depth_score < 15 then 'new'
          when a.depth_score < 35 then 'casual'
          when a.depth_score < 55 then 'returning'
          when a.depth_score < 75 then 'engaged'
          else 'power'
        end
      ) = btrim(p_depth_level)
    )
      and (
        nullif(btrim(p_activity), '') is null
        or (btrim(p_activity) = 'active' and a.last_seen is not null)
        or (btrim(p_activity) = 'none' and a.last_seen is null)
      )
  )
  select
    f.id,
    f.username,
    f.is_admin,
    f.created_at,
    f.updated_at,
    f.last_seen,
    f.sessions,
    f.events,
    f.days,
    f.exam_count,
    f.actual_exams,
    f.score_rows,
    f.subjects,
    f.feedback_count,
    f.depth_score,
    f.calculated_depth_level as depth_level,
    count(*) over () as total_count
  from filtered f
  order by
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'username' then f.username end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'username' then f.username end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'last_seen' then f.last_seen end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'last_seen' then f.last_seen end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'depth_score' then f.depth_score end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'depth_score' then f.depth_score end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'exam_count' then f.exam_count end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'exam_count' then f.exam_count end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'actual_exams' then f.actual_exams end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'actual_exams' then f.actual_exams end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'score_rows' then f.score_rows end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'score_rows' then f.score_rows end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'sessions' then f.sessions end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'sessions' then f.sessions end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'events' then f.events end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'events' then f.events end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'days' then f.days end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'days' then f.days end desc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'feedback_count' then f.feedback_count end asc nulls last,
    case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'feedback_count' then f.feedback_count end desc nulls last,
    f.id asc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.score_tracker_admin_users_page(integer, integer, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.score_tracker_admin_users_page(integer, integer, text, text, text, text, text)
  to service_role;
