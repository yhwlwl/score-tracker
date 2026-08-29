-- 管理后台补充分析：DAU/WAU/MAU、来源质量、活跃天数、浏览器/PWA/屏幕和反馈老化。
create or replace function public.score_tracker_admin_dashboard_more(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select greatest(1, least(coalesce(p_days, 7), 90))::integer as days,
           now() as now_ts,
           (now() - (greatest(1, least(coalesce(p_days, 7), 90))::text || ' days')::interval) as since_ts
  ),
  period_business as (
    select
      (select count(*)::bigint from public.score_tracker_users u, settings s
        where coalesce(u.is_admin,false)=false and u.created_at >= s.since_ts) as new_users,
      (select count(*)::bigint from public.score_tracker_exams e, settings s
        where e.created_at >= s.since_ts) as new_exams,
      (select count(*)::bigint from public.score_tracker_feedback_submissions f, settings s
        where f.created_at >= s.since_ts) as new_feedback
  ),
  logs_window as materialized (
    select v.id, v.user_id, v.visitor_id, v.session_id, v.event_type, v.occurred_at,
      (v.occurred_at at time zone 'Asia/Shanghai')::date as local_day,
      v.app_page, v.pathname, v.first_referrer, v.referrer_origin, v.utm_source,
      v.user_agent, v.is_pwa, v.screen_width, v.viewport_width
    from public.score_tracker_visit_logs v
    where v.occurred_at >= now() - interval '90 days'
  ),
  logs_30d as materialized (
    select l.* from logs_window l
    where l.occurred_at >= now() - interval '30 days'
  ),
  period_logs as materialized (
    select l.* from logs_window l cross join settings s where l.occurred_at >= s.since_ts
  ),
  actor_windows as (
    select
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) filter (where occurred_at >= now() - interval '1 day')::bigint as dau,
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) filter (where occurred_at >= now() - interval '7 days')::bigint as wau,
      count(distinct coalesce(visitor_id::text, user_id::text, session_id::text))::bigint as mau,
      count(*) filter (where occurred_at >= now() - interval '1 day')::bigint as events_1d,
      count(*)::bigint as events_30d
    from logs_30d
    where coalesce(visitor_id::text, user_id::text, session_id::text) is not null
  ),
  user_activity as (
    select user_id, count(distinct local_day)::bigint as active_days,
      count(distinct session_id)::bigint as sessions, count(*)::bigint as events
    from period_logs where user_id is not null group by user_id
  ),
  active_days_distribution as (
    select case when active_days = 1 then '1 天' when active_days = 2 then '2 天'
      when active_days = 3 then '3 天' when active_days between 4 and 7 then '4–7 天'
      when active_days between 8 and 14 then '8–14 天' else '15+ 天' end as key,
      count(*)::bigint as count
    from user_activity group by 1 order by min(active_days)
  ),
  users_flags as (
    select a.user_id, a.active_days,
      exists (select 1 from public.score_tracker_scores s where s.user_id=a.user_id and s.actual_score is not null) as activated
    from user_activity a
  ),
  source_rows as (
    select case
      when coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')) is null then '直接访问 / 无来源'
      when coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')) ~* 'weixin|wechat' then '微信'
      when coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')) ~* 'baidu' then '百度'
      when coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')) ~* 'bing' then 'Bing'
      when coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')) ~* 'github' then 'GitHub'
      when coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')) ~* 'score-tracker|score[.]yhwlwl[.]xyz|vercel[.]app' then '站内 / Preview'
      else left(coalesce(nullif(utm_source,''), nullif(first_referrer,''), nullif(referrer_origin,'')),80) end as source,
      coalesce(visitor_id::text,user_id::text,session_id::text) as actor_id,
      user_id, event_type
    from period_logs
    where coalesce(visitor_id::text,user_id::text,session_id::text) is not null
  ),
  source_quality as (
    select source as key, count(distinct actor_id)::bigint as visitors,
      count(distinct sr.user_id) filter (where sr.event_type='register_completed')::bigint as registrations,
      count(distinct sr.user_id) filter (where uf.activated)::bigint as activated_users,
      count(distinct sr.user_id) filter (where uf.active_days >= 2)::bigint as returning_users
    from source_rows sr left join users_flags uf on uf.user_id=sr.user_id
    group by source order by visitors desc
  ),
  browser_rows as (
    select case
      when user_agent ~* 'MicroMessenger' then '微信内置浏览器'
      when user_agent ~* 'Edg/' then 'Edge'
      when user_agent ~* 'Chrome|CriOS' then 'Chrome'
      when user_agent ~* 'Safari' and user_agent !~* 'Chrome|CriOS' then 'Safari'
      when user_agent ~* 'Firefox|FxiOS' then 'Firefox'
      else '其他' end as key, count(*)::bigint as count
    from period_logs group by 1 order by count desc
  ),
  pwa_rows as (
    select case when coalesce(is_pwa,false) then 'PWA 应用' else '普通浏览器' end as key,
      count(distinct coalesce(visitor_id::text,user_id::text,session_id::text))::bigint as count
    from period_logs where coalesce(visitor_id::text,user_id::text,session_id::text) is not null
    group by 1 order by count desc
  ),
  screen_rows as (
    select case
      when coalesce(nullif(viewport_width,0),nullif(screen_width,0)) < 375 then '< 375'
      when coalesce(nullif(viewport_width,0),nullif(screen_width,0)) between 375 and 430 then '375–430'
      when coalesce(nullif(viewport_width,0),nullif(screen_width,0)) between 431 and 768 then '431–768'
      when coalesce(nullif(viewport_width,0),nullif(screen_width,0)) between 769 and 1024 then '769–1024'
      when coalesce(nullif(viewport_width,0),nullif(screen_width,0)) > 1024 then '> 1024'
      else '未记录' end as key,
      count(*)::bigint as count
    from period_logs group by 1 order by count desc
  ),
  feedback_age as (
    select case when now()-created_at < interval '1 hour' then '< 1 小时'
      when now()-created_at < interval '6 hours' then '1–6 小时'
      when now()-created_at < interval '1 day' then '6–24 小时'
      when now()-created_at < interval '3 days' then '1–3 天'
      else '> 3 天' end as key, count(*)::bigint as count
    from public.score_tracker_feedback_submissions
    where status in ('new','reviewing') group by 1 order by min(created_at)
  ),
  feedback_status as (
    select status as key, count(*)::bigint as count
    from public.score_tracker_feedback_submissions group by status order by count desc
  )
  select jsonb_build_object(
    'audience', jsonb_build_object(
      'dau',(select dau from actor_windows),'wau',(select wau from actor_windows),'mau',(select mau from actor_windows),
      'events_1d',(select events_1d from actor_windows),'events_30d',(select events_30d from actor_windows),
      'events_per_actor_30d',case when (select mau from actor_windows)>0 then round((select events_30d from actor_windows)::numeric/(select mau from actor_windows),1) else 0 end
    ),
    'period_activity', jsonb_build_object(
      'new_users',(select new_users from period_business),
      'new_exams',(select new_exams from period_business),
      'new_feedback',(select new_feedback from period_business)
    ),
    'active_days_distribution',coalesce((select jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc) from active_days_distribution),'[]'::jsonb),
    'source_quality',coalesce((select jsonb_agg(jsonb_build_object('key',key,'visitors',visitors,'registrations',registrations,'activated_users',activated_users,'returning_users',returning_users) order by visitors desc) from source_quality),'[]'::jsonb),
    'browsers',coalesce((select jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc) from browser_rows),'[]'::jsonb),
    'pwa',coalesce((select jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc) from pwa_rows),'[]'::jsonb),
    'screens',coalesce((select jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc) from screen_rows),'[]'::jsonb),
    'feedback_aging',coalesce((select jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc) from feedback_age),'[]'::jsonb),
    'feedback_status',coalesce((select jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc) from feedback_status),'[]'::jsonb)
  );
$$;

revoke all on function public.score_tracker_admin_dashboard_more(integer) from public, anon, authenticated;
grant execute on function public.score_tracker_admin_dashboard_more(integer) to service_role;

