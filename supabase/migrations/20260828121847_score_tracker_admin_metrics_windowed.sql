-- 总览只展示 24 小时访客、24 小时 Session 和 5 分钟在线数。
-- 移除未被管理面板使用的历史全量 distinct 扫描，避免打开总览超时。
create or replace function public.score_tracker_admin_exact_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with log_total as (
    select count(*)::bigint as events_total
    from public.score_tracker_visit_logs
  ), recent_metrics as (
    select
      count(distinct visitor_id) filter (where visitor_id is not null)::bigint as visitors_24h,
      count(distinct session_id) filter (where session_id is not null)::bigint as sessions_24h
    from public.score_tracker_visit_logs
    where occurred_at >= now() - interval '24 hours'
  ), row_counts as (
    select
      (select count(*) from public.score_tracker_users where coalesce(is_admin, false) = false)::bigint as users_total,
      (select count(*) from public.score_tracker_exams)::bigint as exams_total,
      (select count(*) from public.score_tracker_scores)::bigint as scores_total,
      (select count(*) from public.score_tracker_feedback_submissions)::bigint as feedback_total
  )
  select jsonb_build_object(
    'events_total', l.events_total,
    'visitors_24h', r.visitors_24h,
    'sessions_24h', r.sessions_24h,
    'online_5m', (
      select count(distinct coalesce(visitor_id::text, user_id::text, session_id::text))::bigint
      from public.score_tracker_visit_logs
      where occurred_at >= now() - interval '5 minutes'
    ),
    'users_total', c.users_total,
    'exams_total', c.exams_total,
    'scores_total', c.scores_total,
    'feedback_total', c.feedback_total
  )
  from log_total l
  cross join recent_metrics r
  cross join row_counts c;
$$;

revoke all on function public.score_tracker_admin_exact_metrics() from public, anon, authenticated;
grant execute on function public.score_tracker_admin_exact_metrics() to service_role;
