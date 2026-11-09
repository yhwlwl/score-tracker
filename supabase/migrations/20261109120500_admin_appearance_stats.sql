-- 管理面板：外观（装扮）使用情况聚合
-- 只统计 score_tracker_visit_logs 中 appearance_studio_* 事件，供 /mg 分析面板使用。
create or replace function public.score_tracker_admin_appearance(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with w as (
  select now() - make_interval(days => least(90, greatest(1, coalesce(p_days, 30)))) as since
), ev as (
  select l.*
  from public.score_tracker_visit_logs l, w
  where l.occurred_at >= w.since
    and l.event_type like 'appearance_studio%'
), opened as (
  select distinct metadata->>'studio_session_id' sid
  from ev
  where event_type = 'appearance_studio_opened' and metadata ? 'studio_session_id'
), applied_s as (
  select distinct metadata->>'studio_session_id' sid
  from ev
  where event_type = 'appearance_studio_applied' and metadata ? 'studio_session_id'
), cancelled_s as (
  select distinct metadata->>'studio_session_id' sid
  from ev
  where event_type = 'appearance_studio_cancelled' and metadata ? 'studio_session_id'
)
select jsonb_build_object(
  'window_days', least(90, greatest(1, coalesce(p_days, 30))),
  'users', jsonb_build_object(
    'loaded', (select count(distinct user_id) from ev where event_type = 'appearance_studio_loaded'),
    'entry_shown', (select count(distinct user_id) from ev where event_type = 'appearance_studio_entry_shown'),
    'opened', (select count(distinct user_id) from ev where event_type = 'appearance_studio_opened'),
    'applied', (select count(distinct user_id) from ev where event_type = 'appearance_studio_applied'),
    'cancelled', (select count(distinct user_id) from ev where event_type = 'appearance_studio_cancelled')
  ),
  'sessions', jsonb_build_object(
    'opened', (select count(*) from opened),
    'applied', (select count(*) from applied_s),
    'cancelled', (select count(*) from cancelled_s),
    'abandoned', (
      select count(*) from opened o
      where o.sid not in (select sid from applied_s)
        and o.sid not in (select sid from cancelled_s)
    )
  ),
  'events', (select count(*) from ev),
  'pwa_share', (
    select case when count(*) = 0 then null else round(100.0 * count(*) filter (where is_pwa) / count(*), 1) end
    from ev
  ),
  'daily', coalesce((
    select jsonb_agg(jsonb_build_object(
      'day', d.d_day, 'opened', d.opened, 'applied', d.applied,
      'cancelled', d.cancelled, 'users', d.users
    ) order by d.d_day)
    from (
      select occurred_at::date as d_day,
        count(*) filter (where event_type = 'appearance_studio_opened') opened,
        count(*) filter (where event_type = 'appearance_studio_applied') applied,
        count(*) filter (where event_type = 'appearance_studio_cancelled') cancelled,
        count(distinct user_id) users
      from ev group by 1
    ) d
  ), '[]'::jsonb),
  'themes', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'theme', 'unknown') key, count(*) n
      from ev where event_type = 'appearance_studio_applied'
      group by 1 order by 2 desc limit 12
    ) t
  ), '[]'::jsonb),
  'backgrounds', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'background', 'none') key, count(*) n
      from ev where event_type = 'appearance_studio_applied'
      group by 1 order by 2 desc limit 12
    ) t
  ), '[]'::jsonb),
  'decorations', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'decoration_kind', 'none') key, count(*) n
      from ev where event_type = 'appearance_studio_applied'
      group by 1 order by 2 desc
    ) t
  ), '[]'::jsonb),
  'sections', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'section', 'unknown') key, count(*) n
      from ev where event_type = 'appearance_studio_option_selected'
      group by 1 order by 2 desc
    ) t
  ), '[]'::jsonb),
  'fields', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'field', 'unknown') key, count(*) n
      from ev where event_type = 'appearance_studio_option_selected'
      group by 1 order by 2 desc limit 12
    ) t
  ), '[]'::jsonb),
  'fonts', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'value', 'unknown') key, count(*) n
      from ev
      where event_type = 'appearance_studio_option_selected'
        and metadata->>'section' = 'fonts' and metadata->>'field' = 'font'
      group by 1 order by 2 desc limit 10
    ) t
  ), '[]'::jsonb),
  'titles', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'value', 'unknown') key, count(*) n
      from ev
      where event_type = 'appearance_studio_option_selected'
        and metadata->>'section' = 'fonts' and metadata->>'field' = 'title'
      group by 1 order by 2 desc limit 10
    ) t
  ), '[]'::jsonb),
  'applies', coalesce((
    select jsonb_build_object(
      'sessions', count(*),
      'avg_seconds', round(avg(nullif(metadata->>'duration_ms', '')::numeric) / 1000.0, 1),
      'p50_seconds', round((percentile_cont(0.5) within group (order by nullif(metadata->>'duration_ms', '')::numeric) / 1000.0)::numeric, 1),
      'p90_seconds', round((percentile_cont(0.9) within group (order by nullif(metadata->>'duration_ms', '')::numeric) / 1000.0)::numeric, 1),
      'avg_selections', round(avg(nullif(metadata->>'selection_count', '')::numeric), 1),
      'median_selections', round((percentile_cont(0.5) within group (order by nullif(metadata->>'selection_count', '')::numeric))::numeric, 1),
      'changed', count(*) filter (where (metadata->>'changed')::boolean)
    )
    from ev
    where event_type = 'appearance_studio_applied' and metadata ? 'duration_ms'
  ), '{}'::jsonb),
  'actions', jsonb_build_object(
    'reset', (select count(*) from ev where event_type = 'appearance_studio_reset'),
    'undo', (select count(*) from ev where event_type = 'appearance_studio_undone'),
    'card_edit_started', (select count(*) from ev where event_type = 'appearance_studio_card_edit_started'),
    'card_edit_finished', (select count(*) from ev where event_type = 'appearance_studio_card_edit_finished'),
    'preview', (select count(*) from ev where event_type = 'appearance_studio_page_preview_started'),
    'favorite_added', (select count(*) from ev where event_type = 'appearance_studio_favorite_added')
  ),
  'cancel_reasons', coalesce((
    select jsonb_agg(jsonb_build_object('key', t.key, 'count', t.n) order by t.n desc)
    from (
      select coalesce(metadata->>'reason', 'unknown') key, count(*) n
      from ev where event_type = 'appearance_studio_cancelled'
      group by 1 order by 2 desc
    ) t
  ), '[]'::jsonb)
);
$$;

grant execute on function public.score_tracker_admin_appearance(integer) to service_role;
-- 外观事件只占全部访问日志的很小一部分，单独建部分索引，避免整表扫描。
create index if not exists score_tracker_visit_logs_appearance_idx
  on public.score_tracker_visit_logs (occurred_at desc)
  where event_type like 'appearance_studio%';

-- 把外观统计并入管理面板既有的 dashboard_more，避免再改一次 Edge Function。
do $$
begin
  if to_regprocedure('public.score_tracker_admin_dashboard_more_base(integer)') is null then
    alter function public.score_tracker_admin_dashboard_more(integer) rename to score_tracker_admin_dashboard_more_base;
  end if;
end $$;

create or replace function public.score_tracker_admin_dashboard_more(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare base jsonb; app jsonb := '{}'::jsonb;
begin
  base := public.score_tracker_admin_dashboard_more_base(p_days);
  begin
    app := public.score_tracker_admin_appearance(p_days);
  exception when others then app := '{}'::jsonb;
  end;
  return coalesce(base, '{}'::jsonb) || jsonb_build_object('appearance', app);
end $$;

grant execute on function public.score_tracker_admin_dashboard_more(integer) to service_role;
