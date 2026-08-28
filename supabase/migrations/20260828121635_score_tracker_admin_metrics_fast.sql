-- 管理面板总览只需要一个日志聚合结果。统一扫描并提高本次函数的工作内存，
-- 避免 visitors_total、sessions_total 等 distinct 统计各自重复回表。
create or replace function public.score_tracker_admin_exact_metrics()
returns jsonb
language sql
security definer
set search_path = public
set enable_indexscan = off
set enable_indexonlyscan = off
set work_mem = '64MB'
as $$
  with log_metrics as (
    select
      count(*)::bigint as events_total,
      count(distinct visitor_id) filter (where visitor_id is not null)::bigint as visitors_total,
      count(distinct session_id) filter (where session_id is not null)::bigint as sessions_total,
      count(distinct visitor_id) filter (
        where visitor_id is not null and occurred_at >= now() - interval '24 hours'
      )::bigint as visitors_24h,
      count(distinct session_id) filter (
        where session_id is not null and occurred_at >= now() - interval '24 hours'
      )::bigint as sessions_24h,
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) filter (
        where occurred_at >= now() - interval '5 minutes'
      )::bigint as online_5m
    from public.score_tracker_visit_logs
  ), row_counts as (
    select
      (select count(*) from public.score_tracker_users where coalesce(is_admin, false) = false)::bigint as users_total,
      (select count(*) from public.score_tracker_exams)::bigint as exams_total,
      (select count(*) from public.score_tracker_scores)::bigint as scores_total,
      (select count(*) from public.score_tracker_feedback_submissions)::bigint as feedback_total
  )
  select jsonb_build_object(
    'events_total', l.events_total,
    'visitors_total', l.visitors_total,
    'sessions_total', l.sessions_total,
    'visitors_24h', l.visitors_24h,
    'sessions_24h', l.sessions_24h,
    'online_5m', l.online_5m,
    'users_total', r.users_total,
    'exams_total', r.exams_total,
    'scores_total', r.scores_total,
    'feedback_total', r.feedback_total
  )
  from log_metrics l cross join row_counts r;
$$;

revoke all on function public.score_tracker_admin_exact_metrics() from public, anon, authenticated;
grant execute on function public.score_tracker_admin_exact_metrics() to service_role;
