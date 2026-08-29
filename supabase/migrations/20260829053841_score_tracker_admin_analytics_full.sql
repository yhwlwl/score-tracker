-- 管理后台分析统一口径：窗口趋势、严格激活漏斗、注册 Cohort 留存、功能采用率与数据质量。
-- 所有行为数据均按 Asia/Shanghai 的自然日聚合；精确总量仍直接来自业务表。
create or replace function public.score_tracker_admin_dashboard_metrics(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select greatest(1, least(coalesce(p_days, 7), 90))::integer as days,
           now() as now_ts,
           (now() - (greatest(1, least(coalesce(p_days, 7), 90))::text || ' days')::interval) as since_ts,
           (now() at time zone 'Asia/Shanghai')::date as today_local
  ),
  recent_logs as materialized (
    select
      v.id, v.event_id, v.session_id, v.visitor_id, v.user_id,
      v.event_type, v.occurred_at,
      (v.occurred_at at time zone 'Asia/Shanghai')::date as local_day,
      v.pathname, v.app_page, v.referrer_origin, v.first_referrer,
      v.utm_source, v.city, v.user_agent, v.app_version,
      v.account_mode, v.is_pwa
    from public.score_tracker_visit_logs v
    cross join settings s
    where v.occurred_at >= s.since_ts
  ),
  days as (
    select value::date as local_day
    from settings s,
    generate_series(
      s.today_local - (s.days - 1),
      s.today_local,
      interval '1 day'
    ) as series(value)
  ),
  exact_counts as (
    select
      (select count(*) from public.score_tracker_visit_logs)::bigint as logs,
      (select count(*) from public.score_tracker_users where coalesce(is_admin, false) = false)::bigint as users,
      (select count(*) from public.score_tracker_exams)::bigint as exams,
      (select count(*) from public.score_tracker_scores)::bigint as scores,
      (select count(*) from public.score_tracker_feedback_submissions)::bigint as feedback,
      (select count(*) from public.score_tracker_user_goals)::bigint as goal_rows,
      (select count(distinct user_id) from public.score_tracker_exams)::bigint as exam_users,
      (select count(distinct user_id) from public.score_tracker_scores)::bigint as score_users,
      (select count(distinct user_id) from public.score_tracker_user_goals)::bigint as goal_users,
      (select count(distinct exam_id) from public.score_tracker_scores where actual_score is not null)::bigint as exams_with_actual,
      (select count(distinct exam_id) from public.score_tracker_scores where target_score is not null)::bigint as exams_with_target,
      (select count(*) from public.score_tracker_scores where actual_score is not null)::bigint as actual_score_rows,
      (select count(*) from public.score_tracker_scores where target_score is not null)::bigint as target_score_rows
  ),
  period_counts as (
    select
      count(*)::bigint as events,
      count(distinct visitor_id) filter (where visitor_id is not null)::bigint as visitors,
      count(distinct session_id) filter (where session_id is not null)::bigint as sessions,
      count(distinct user_id) filter (where user_id is not null)::bigint as active_users,
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) filter (where coalesce(visitor_id::text, user_id::text, session_id::text) is not null)::bigint as actors,
      count(*) filter (where occurred_at >= now() - interval '5 minutes')::bigint as online_events,
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) filter (where occurred_at >= now() - interval '5 minutes' and coalesce(visitor_id::text, user_id::text, session_id::text) is not null)::bigint as online,
      count(distinct user_id) filter (where event_type = 'register_completed' and user_id is not null)::bigint as registered_events,
      count(*) filter (where event_type = 'register_completed')::bigint as registration_events,
      count(*) filter (where event_type = 'feedback_submitted')::bigint as feedback_events
    from recent_logs
  ),
  daily_base as (
    select
      d.local_day,
      count(rl.id)::bigint as events,
      count(distinct rl.visitor_id) filter (where rl.visitor_id is not null)::bigint as visitors,
      count(distinct rl.session_id) filter (where rl.session_id is not null)::bigint as sessions,
      count(distinct rl.user_id) filter (where rl.user_id is not null)::bigint as active_users,
      count(distinct rl.user_id) filter (where rl.event_type = 'register_completed' and rl.user_id is not null)::bigint as registrations,
      count(*) filter (where rl.event_type = 'feedback_submitted')::bigint as feedback,
      count(distinct rl.user_id) filter (where rl.event_type in ('stats_open','deep_stats_view') and rl.user_id is not null)::bigint as stats_users,
      count(distinct coalesce(rl.visitor_id::text, rl.user_id::text, rl.session_id::text)) filter (where coalesce(rl.visitor_id::text, rl.user_id::text, rl.session_id::text) is not null)::bigint as actors
    from days d
    left join recent_logs rl on rl.local_day = d.local_day
    group by d.local_day
  ),
  actor_first_seen as (
    select actor_id, min(local_day) as first_day
    from (select coalesce(visitor_id::text, user_id::text, session_id::text) as actor_id, local_day from recent_logs) x
    where actor_id is not null
    group by actor_id
  ),
  daily_trend as (
    select
      b.local_day,
      to_char(b.local_day, 'MM-DD') as key,
      b.events, b.visitors, b.sessions, b.active_users,
      b.registrations, b.feedback, b.stats_users, b.actors,
      coalesce((select count(*) from actor_first_seen a where a.first_day = b.local_day), 0)::bigint as new_actors,
      greatest(0, b.actors - coalesce((select count(*) from actor_first_seen a where a.first_day = b.local_day), 0))::bigint as returning_actors
    from daily_base b
  ),
  events_grouped as (
    select coalesce(nullif(event_type, ''), '未标记') as key, count(*)::bigint as count
    from recent_logs group by 1 order by count desc
  ),
  pages_grouped as (
    select coalesce(nullif(app_page, ''), nullif(pathname, ''), '未标记') as key, count(*)::bigint as count
    from recent_logs group by 1 order by count desc
  ),
  sources_grouped as (
    select
      case
        when coalesce(nullif(utm_source, ''), nullif(first_referrer, ''), nullif(referrer_origin, '')) is null then '直接访问 / 无来源'
        when coalesce(utm_source, first_referrer, referrer_origin) ~* 'score-tracker|vercel\\.app' then '站内 / Preview'
        when coalesce(utm_source, first_referrer, referrer_origin) ~* 'weixin|wechat' then '微信'
        when coalesce(utm_source, first_referrer, referrer_origin) ~* 'baidu' then '百度'
        when coalesce(utm_source, first_referrer, referrer_origin) ~* 'bing' then 'Bing'
        when coalesce(utm_source, first_referrer, referrer_origin) ~* 'github' then 'GitHub'
        else left(coalesce(utm_source, first_referrer, referrer_origin), 80)
      end as key,
      count(*)::bigint as count
    from recent_logs group by 1 order by count desc
  ),
  cities_grouped as (
    select coalesce(nullif(city, ''), '未标记') as key, count(*)::bigint as count
    from recent_logs group by 1 order by count desc
  ),
  devices_grouped as (
    select case
      when user_agent ~* 'iPhone|iPad' then 'iOS'
      when user_agent ~* 'Android' then 'Android'
      when user_agent ~* 'Windows' then 'Windows'
      when user_agent ~* 'Macintosh' then 'macOS'
      else '其他' end as key,
      count(*)::bigint as count
    from recent_logs group by 1 order by count desc
  ),
  versions_grouped as (
    select coalesce(nullif(app_version, ''), '未标记') as key, count(*)::bigint as count
    from recent_logs group by 1 order by count desc
  ),
  user_period as (
    select user_id,
           count(distinct local_day)::numeric as active_days,
           count(distinct session_id)::numeric as sessions,
           count(*)::numeric as events
    from recent_logs where user_id is not null group by user_id
  ),
  depth_grouped as (
    select case
      when depth_score < 15 then 'new'
      when depth_score < 35 then 'casual'
      when depth_score < 55 then 'returning'
      when depth_score < 75 then 'engaged'
      else 'power' end as key,
      count(*)::bigint as count
    from (
      select least(100, round(least(25, active_days * 5) + least(20, sessions * 2) + least(30, events / 5.0)))::int as depth_score
      from user_period
    ) x group by 1 order by count desc
  ),
  feedback_grouped as (
    select coalesce(nullif(feedback_type, ''), 'other') as key, count(*)::bigint as count
    from public.score_tracker_feedback_submissions group by 1 order by count desc
  ),
  cohort_users as (
    select u.id, u.created_at, (u.created_at at time zone 'Asia/Shanghai')::date as cohort_day
    from public.score_tracker_users u cross join settings s
    where coalesce(u.is_admin, false) = false and u.created_at >= s.since_ts
  ),
  cohort_activity as (
    select c.cohort_day,
           count(distinct c.id)::bigint as cohort_users,
           count(distinct c.id) filter (where (v.occurred_at at time zone 'Asia/Shanghai')::date = c.cohort_day)::bigint as d0_users,
           count(distinct c.id) filter (where (v.occurred_at at time zone 'Asia/Shanghai')::date = c.cohort_day + 1)::bigint as d1_users,
           count(distinct c.id) filter (where (v.occurred_at at time zone 'Asia/Shanghai')::date = c.cohort_day + 2)::bigint as d2_users,
           count(distinct c.id) filter (where (v.occurred_at at time zone 'Asia/Shanghai')::date = c.cohort_day + 3)::bigint as d3_users,
           count(distinct c.id) filter (where (v.occurred_at at time zone 'Asia/Shanghai')::date = c.cohort_day + 7)::bigint as d7_users
    from cohort_users c
    left join recent_logs v on v.user_id = c.id and v.occurred_at >= c.created_at
    group by c.cohort_day
  ),
  cohort_exam_users as (
    select distinct c.id
    from cohort_users c
    join public.score_tracker_exams e on e.user_id = c.id and e.created_at >= c.created_at
  ),
  cohort_actual_users as (
    select distinct x.id
    from cohort_exam_users x
    join public.score_tracker_scores s on s.user_id = x.id and s.actual_score is not null
    join cohort_users c on c.id = x.id and s.created_at >= c.created_at
  ),
  cohort_stats_users as (
    select distinct x.id
    from cohort_actual_users x
    join cohort_users c on c.id = x.id
    join recent_logs v on v.user_id = x.id and v.occurred_at >= c.created_at and v.event_type in ('stats_open','deep_stats_view')
  ),
  cohort_returned_users as (
    select x.id
    from cohort_stats_users x
    join cohort_users c on c.id = x.id
    join recent_logs v on v.user_id = x.id and v.occurred_at >= c.created_at
    group by x.id
    having count(distinct v.local_day) >= 2
  ),
  strict_steps as (
    select
      (select count(*) from cohort_users)::bigint as registered,
      (select count(*) from cohort_exam_users)::bigint as created_exam,
      (select count(*) from cohort_actual_users)::bigint as actual_score,
      (select count(*) from cohort_stats_users)::bigint as viewed_stats,
      (select count(*) from cohort_returned_users)::bigint as returned
  ),
  activation_rows as (
    select 1 as ord, '注册用户' as key, registered as users from strict_steps
    union all select 2, '创建考试', created_exam from strict_steps
    union all select 3, '录入实际成绩', actual_score from strict_steps
    union all select 4, '打开统计分析', viewed_stats from strict_steps
    union all select 5, '跨日再次访问', returned from strict_steps
  ),
  activation_ranked as (
    select ord, key, users, lag(users) over (order by ord) as previous_users
    from activation_rows
  ),
  time_to_activate as (
    select bucket as key, count(*)::bigint as count
    from (
      select case
        when not exists (select 1 from public.score_tracker_exams e where e.user_id = c.id and e.created_at >= c.created_at) then '尚未创建考试'
        when first_exam - c.created_at <= interval '5 minutes' then '5 分钟内'
        when first_exam - c.created_at <= interval '30 minutes' then '5–30 分钟'
        when first_exam - c.created_at <= interval '1 hour' then '30–60 分钟'
        when first_exam - c.created_at <= interval '1 day' then '1–24 小时'
        else '超过 24 小时' end as bucket
      from cohort_users c
      left join lateral (select min(e.created_at) as first_exam from public.score_tracker_exams e where e.user_id = c.id and e.created_at >= c.created_at) e on true
    ) x group by bucket order by count desc
  ),
  feature_rows as (
    select feature as key, count(distinct actor_id)::bigint as users, count(*)::bigint as events
    from (
      select coalesce(visitor_id::text, user_id::text, session_id::text) as actor_id,
        case
          when coalesce(app_page, '') in ('records','record') or event_type ~* 'exam|score|record' then '成绩记录'
          when coalesce(app_page, '') in ('stats','statistics') or event_type ~* 'stats|deep_' then '统计分析'
          when coalesce(app_page, '') ~* 'radar' or event_type ~* '^radar' then '雷达分析'
          when coalesce(app_page, '') ~* 'planner|plan' or event_type ~* 'goal|planner|study_' then '目标与计划'
          when event_type ~* 'feedback' then '反馈'
          when coalesce(app_page, '') in ('account','login') or event_type ~* 'login|register' then '账户与登录'
          else '其他行为'
        end as feature
      from recent_logs
      where coalesce(visitor_id::text, user_id::text, session_id::text) is not null
    ) x
    group by feature
    order by users desc
  ),
  quality as (
    select
      count(*)::bigint as events,
      round(100.0 * count(*) filter (where coalesce(app_page, pathname) is null or coalesce(app_page, pathname) in ('','unknown')) / nullif(count(*),0), 2) as unknown_page_pct,
      round(100.0 * count(*) filter (where visitor_id is null) / nullif(count(*),0), 2) as missing_visitor_pct,
      round(100.0 * count(*) filter (where session_id is null) / nullif(count(*),0), 2) as missing_session_pct,
      round(100.0 * count(*) filter (where user_id is null) / nullif(count(*),0), 2) as guest_event_pct,
      round(100.0 * count(*) filter (where city is null or city = '') / nullif(count(*),0), 2) as missing_city_pct,
      round(100.0 * count(*) filter (where app_version is null or app_version = '') / nullif(count(*),0), 2) as missing_version_pct
    from recent_logs
  ),
  business as (
    select jsonb_build_object(
      'users', (select users from exact_counts),
      'exam_users', (select exam_users from exact_counts),
      'exams', (select exams from exact_counts),
      'exams_with_actual', (select exams_with_actual from exact_counts),
      'exams_with_target', (select exams_with_target from exact_counts),
      'score_users', (select score_users from exact_counts),
      'scores', (select scores from exact_counts),
      'actual_score_rows', (select actual_score_rows from exact_counts),
      'target_score_rows', (select target_score_rows from exact_counts),
      'goal_users', (select goal_users from exact_counts),
      'goal_rows', (select goal_rows from exact_counts)
    ) as value
  )
  select jsonb_build_object(
    'generated_at', now(),
    'analytics_window_days', (select days from settings),
    'counts', jsonb_build_object(
      'logs', e.logs, 'users', e.users, 'exams', e.exams, 'scores', e.scores, 'feedback', e.feedback,
      'goal_rows', e.goal_rows, 'online', p.online, 'visitors', p.visitors, 'sessions', p.sessions,
      'active_users', p.active_users, 'actors', p.actors
    ),
    'period_counts', jsonb_build_object(
      'events', p.events, 'visitors', p.visitors, 'sessions', p.sessions,
      'active_users', p.active_users, 'actors', p.actors, 'online', p.online,
      'registration_events', p.registration_events, 'feedback_events', p.feedback_events
    ),
    'trend', coalesce((select jsonb_agg(jsonb_build_object(
      'day', local_day, 'key', key, 'events', events, 'count', events, 'visitors', visitors,
      'sessions', sessions, 'active_users', active_users, 'registrations', registrations,
      'feedback', feedback, 'stats_users', stats_users, 'actors', actors,
      'new_actors', new_actors, 'returning_actors', returning_actors
    ) order by local_day) from daily_trend), '[]'::jsonb),
    'events_by_day', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', events) order by local_day) from daily_trend), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from events_grouped), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from pages_grouped), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from sources_grouped), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from cities_grouped), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from devices_grouped), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from versions_grouped), '[]'::jsonb),
    'depth', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from depth_grouped), '[]'::jsonb),
    'feedback_types', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from feedback_grouped), '[]'::jsonb),
    'activation_funnel', coalesce((select jsonb_agg(jsonb_build_object(
      'key', key, 'label', key, 'users', users,
      'conversion', case when (select registered from strict_steps) > 0 then round(100.0 * users / (select registered from strict_steps), 1) else 0 end,
      'step_conversion', case when previous_users > 0 then round(100.0 * users / previous_users, 1) else null end
    ) order by ord) from activation_ranked), '[]'::jsonb),
    'time_to_activate', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from time_to_activate), '[]'::jsonb),
    'retention', jsonb_build_object(
      'cohorts', coalesce((select jsonb_agg(jsonb_build_object(
        'cohort', cohort_day, 'users', cohort_users,
        'd0_users', d0_users, 'd1_users', d1_users, 'd2_users', d2_users, 'd3_users', d3_users, 'd7_users', d7_users,
        'd0_rate', case when cohort_users > 0 then round(100.0*d0_users/cohort_users,1) else 0 end,
        'd1_rate', case when cohort_users > 0 then round(100.0*d1_users/cohort_users,1) else 0 end,
        'd2_rate', case when cohort_users > 0 then round(100.0*d2_users/cohort_users,1) else 0 end,
        'd3_rate', case when cohort_users > 0 then round(100.0*d3_users/cohort_users,1) else 0 end,
        'd7_rate', case when cohort_users > 0 then round(100.0*d7_users/cohort_users,1) else 0 end
      ) order by cohort_day) from cohort_activity), '[]'::jsonb),
      'definition', '按注册自然日分组；D+n 表示注册后第 n 个自然日仍有至少一次访问。',
      'active_days', coalesce((select jsonb_agg(jsonb_build_object('key', local_day, 'count', active_users) order by local_day) from daily_base), '[]'::jsonb)
    ),
    'features', coalesce((select jsonb_agg(jsonb_build_object(
      'key', key, 'label', key, 'users', users, 'events', events,
      'adoption_rate', case when p.actors > 0 then round(100.0*users/p.actors,1) else 0 end,
      'events_per_user', case when users > 0 then round(events::numeric/users,1) else 0 end
    ) order by users desc) from feature_rows), '[]'::jsonb),
    'business', (select value from business),
    'quality', (select row_to_json(quality)::jsonb from quality),
    'timeseries', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', events) order by local_day) from daily_trend), '[]'::jsonb),
    'pages_all', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from pages_grouped), '[]'::jsonb),
    'sources_all', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from sources_grouped), '[]'::jsonb),
    'cities_all', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from cities_grouped), '[]'::jsonb),
    'devices_all', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from devices_grouped), '[]'::jsonb),
    'versions_all', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc) from versions_grouped), '[]'::jsonb)
  )
  from exact_counts e cross join period_counts p;
$$;

revoke all on function public.score_tracker_admin_dashboard_metrics(integer) from public, anon, authenticated;
grant execute on function public.score_tracker_admin_dashboard_metrics(integer) to service_role;
