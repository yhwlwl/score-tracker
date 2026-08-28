-- 为管理后台补回最近 7 天的趋势和分布聚合。
-- 精确总量仍由独立计数提供，行为图表只扫描最近窗口，避免历史全表去重。
create or replace function public.score_tracker_admin_exact_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with recent_logs as materialized (
    select
      occurred_at,
      (occurred_at at time zone 'Asia/Shanghai')::date as local_day,
      event_type,
      visitor_id,
      session_id,
      user_id,
      app_page,
      pathname,
      first_referrer,
      referrer_origin,
      city,
      user_agent,
      app_version
    from public.score_tracker_visit_logs
    where occurred_at >= now() - interval '7 days'
  ),
  log_metrics as (
    select
      count(distinct visitor_id) filter (
        where visitor_id is not null and occurred_at >= now() - interval '24 hours'
      )::bigint as visitors_24h,
      count(distinct session_id) filter (
        where session_id is not null and occurred_at >= now() - interval '24 hours'
      )::bigint as sessions_24h,
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) filter (
        where occurred_at >= now() - interval '5 minutes'
      )::bigint as online_5m
    from recent_logs
  ),
  log_total as (
    select count(*)::bigint as events_total
    from public.score_tracker_visit_logs
  ),
  row_counts as (
    select
      (select count(*) from public.score_tracker_users where coalesce(is_admin, false) = false)::bigint as users_total,
      (select count(*) from public.score_tracker_exams)::bigint as exams_total,
      (select count(*) from public.score_tracker_scores)::bigint as scores_total,
      (select count(*) from public.score_tracker_feedback_submissions)::bigint as feedback_total
  ),
  days as (
    select value::date as local_day
    from generate_series(
      ((now() at time zone 'Asia/Shanghai')::date - 6)::timestamp,
      (now() at time zone 'Asia/Shanghai')::date::timestamp,
      interval '1 day'
    ) as series(value)
  ),
  day_counts as (
    select local_day, count(*)::bigint as count
    from recent_logs
    group by local_day
  ),
  events_by_day as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', to_char(days.local_day, 'MM-DD'),
          'count', coalesce(day_counts.count, 0)
        ) order by days.local_day
      ),
      '[]'::jsonb
    ) as value
    from days
    left join day_counts using (local_day)
  ),
  events_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', event_type, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select coalesce(nullif(event_type, ''), '未标记') as event_type, count(*)::bigint as count
      from recent_logs
      group by coalesce(nullif(event_type, ''), '未标记')
    ) grouped
  ),
  pages_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', page, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select coalesce(nullif(app_page, ''), nullif(pathname, ''), '未标记') as page, count(*)::bigint as count
      from recent_logs
      group by coalesce(nullif(app_page, ''), nullif(pathname, ''), '未标记')
    ) grouped
  ),
  sources_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', source, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select
        case
          when coalesce(nullif(first_referrer, ''), nullif(referrer_origin, '')) is null
            then '直接访问 / 无 Referrer'
          when coalesce(first_referrer, referrer_origin) ~* 'score-tracker|vercel\\.app'
            then '站内 / Preview'
          when coalesce(first_referrer, referrer_origin) ~* 'weixin'
            then '微信'
          when coalesce(first_referrer, referrer_origin) ~* 'baidu'
            then '百度'
          when coalesce(first_referrer, referrer_origin) ~* 'bing'
            then 'Bing'
          when coalesce(first_referrer, referrer_origin) ~* 'github'
            then 'GitHub'
          else left(coalesce(first_referrer, referrer_origin), 80)
        end as source,
        count(*)::bigint as count
      from recent_logs
      group by 1
    ) grouped
  ),
  cities_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', city, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select coalesce(nullif(city, ''), '未标记') as city, count(*)::bigint as count
      from recent_logs
      group by coalesce(nullif(city, ''), '未标记')
    ) grouped
  ),
  devices_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', device, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select
        case
          when user_agent ~* 'iPhone|iPad' then 'iOS'
          when user_agent ~* 'Android' then 'Android'
          when user_agent ~* 'Windows' then 'Windows'
          when user_agent ~* 'Macintosh' then 'macOS'
          else '其他'
        end as device,
        count(*)::bigint as count
      from recent_logs
      group by 1
    ) grouped
  ),
  versions_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', version, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select coalesce(nullif(app_version, ''), '未标记') as version, count(*)::bigint as count
      from recent_logs
      group by coalesce(nullif(app_version, ''), '未标记')
    ) grouped
  ),
  user_activity as (
    select
      user_id,
      count(distinct local_day)::numeric as active_days,
      count(distinct session_id)::numeric as sessions,
      count(*)::numeric as events
    from recent_logs
    where user_id is not null
    group by user_id
  ),
  depth_7d as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', depth_level, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select
        case
          when depth_score < 15 then 'new'
          when depth_score < 35 then 'casual'
          when depth_score < 55 then 'returning'
          when depth_score < 75 then 'engaged'
          else 'power'
        end as depth_level,
        count(*)::bigint as count
      from (
        select least(
          100,
          round(
            least(25, active_days * 5)
            + least(20, sessions * 2)
            + least(30, events / 5.0)
          )
        )::int as depth_score
        from user_activity
      ) scored
      group by 1
    ) grouped
  ),
  feedback_types_all as (
    select coalesce(
      jsonb_agg(jsonb_build_object('key', feedback_type, 'count', count) order by count desc),
      '[]'::jsonb
    ) as value
    from (
      select coalesce(nullif(feedback_type, ''), 'other') as feedback_type, count(*)::bigint as count
      from public.score_tracker_feedback_submissions
      group by coalesce(nullif(feedback_type, ''), 'other')
    ) grouped
  )
  select jsonb_build_object(
    'events_total', totals.events_total,
    'visitors_24h', metrics.visitors_24h,
    'sessions_24h', metrics.sessions_24h,
    'online_5m', metrics.online_5m,
    'users_total', counts.users_total,
    'exams_total', counts.exams_total,
    'scores_total', counts.scores_total,
    'feedback_total', counts.feedback_total,
    'analytics_window_days', 7,
    'events_by_day', (select value from events_by_day),
    'events_7d', (select value from events_7d),
    'pages_7d', (select value from pages_7d),
    'sources_7d', (select value from sources_7d),
    'cities_7d', (select value from cities_7d),
    'devices_7d', (select value from devices_7d),
    'versions_7d', (select value from versions_7d),
    'depth_7d', (select value from depth_7d),
    'feedback_types_all', (select value from feedback_types_all)
  )
  from log_total totals
  cross join log_metrics metrics
  cross join row_counts counts;
$$;

revoke all on function public.score_tracker_admin_exact_metrics() from public, anon, authenticated;
grant execute on function public.score_tracker_admin_exact_metrics() to service_role;
