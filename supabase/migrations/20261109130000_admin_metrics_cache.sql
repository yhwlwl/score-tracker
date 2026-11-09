-- 管理面板分析缓存 + 后台预热
--
-- 背景：分析页每次打开都要扫 80 万行访问日志做分组 / 去重 / 留存计算，
-- 单次 25~60 秒；service_role 的 statement_timeout 只有 30s，所以分析页
-- 经常「一直转圈然后失败」，同时大量临时文件把磁盘顶满。
--
-- 方案：
--   1) 在 RPC 层加结果缓存，命中即返回（允许轻微过期），用户请求不再做冷计算；
--   2) pg_cron 在后台预热 7 / 30 / 90 天窗口（按不同频率），冷计算只在后台发生；
--   3) 缓存 wrapper 内把 work_mem 提到 64MB，避免刷临时文件。

create extension if not exists pg_cron;

create table if not exists public.score_tracker_admin_metrics_cache (
  key text primary key,
  payload jsonb not null,
  computed_at timestamptz not null default now()
);
alter table public.score_tracker_admin_metrics_cache enable row level security;
revoke all on table public.score_tracker_admin_metrics_cache from anon, authenticated;

-- 把原来的实时计算函数改名保留，缓存 wrapper 负责调用它们。
do $$
begin
  if to_regprocedure('public.score_tracker_admin_dashboard_metrics_live(integer)') is null then
    alter function public.score_tracker_admin_dashboard_metrics(integer) rename to score_tracker_admin_dashboard_metrics_live;
  end if;
  if to_regprocedure('public.score_tracker_admin_dashboard_more_live(integer)') is null then
    alter function public.score_tracker_admin_dashboard_more(integer) rename to score_tracker_admin_dashboard_more_live;
  end if;
end $$;

create or replace function public.score_tracker_admin_dashboard_metrics(p_days integer default 7)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_key text := 'metrics:' || greatest(1, least(coalesce(p_days, 7), 90));
  v_payload jsonb;
begin
  perform set_config('work_mem', '64MB', true);
  select c.payload into v_payload from public.score_tracker_admin_metrics_cache c where c.key = v_key;
  -- 有缓存就直接用（允许轻微过期），冷计算交给后台预热，避免服务端 30s 语句超时
  if v_payload is not null then return v_payload; end if;
  v_payload := public.score_tracker_admin_dashboard_metrics_live(v_days);
  insert into public.score_tracker_admin_metrics_cache (key, payload, computed_at)
  values (v_key, v_payload, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;
  return v_payload;
end $$;

create or replace function public.score_tracker_admin_dashboard_more(p_days integer default 7)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_key text := 'more:' || greatest(1, least(coalesce(p_days, 7), 90));
  v_payload jsonb;
begin
  perform set_config('work_mem', '64MB', true);
  select c.payload into v_payload from public.score_tracker_admin_metrics_cache c where c.key = v_key;
  if v_payload is not null then return v_payload; end if;
  v_payload := public.score_tracker_admin_dashboard_more_live(v_days);
  insert into public.score_tracker_admin_metrics_cache (key, payload, computed_at)
  values (v_key, v_payload, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;
  return v_payload;
end $$;

revoke all on function public.score_tracker_admin_dashboard_metrics(integer) from public;
revoke all on function public.score_tracker_admin_dashboard_more(integer) from public;
grant execute on function public.score_tracker_admin_dashboard_metrics(integer) to service_role;
grant execute on function public.score_tracker_admin_dashboard_more(integer) to service_role;

-- 后台预热：一次指定若干窗口，直接调用 _live 并写缓存。
create or replace function public.score_tracker_admin_metrics_warm(p_days integer[] default array[7, 30])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d integer;
  payload jsonb;
begin
  perform set_config('work_mem', '64MB', true);
  perform set_config('statement_timeout', '0', true);
  foreach d in array p_days loop
    payload := public.score_tracker_admin_dashboard_metrics_live(d);
    insert into public.score_tracker_admin_metrics_cache (key, payload, computed_at)
    values ('metrics:' || d, payload, now())
    on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;

    payload := public.score_tracker_admin_dashboard_more_live(d);
    insert into public.score_tracker_admin_metrics_cache (key, payload, computed_at)
    values ('more:' || d, payload, now())
    on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;
  end loop;
end $$;

revoke all on function public.score_tracker_admin_metrics_warm(integer[]) from public;

-- 预热频率：7 天每 30 分钟、30 天每 30 分钟、90 天每小时；错开分钟避免互相抢 CPU。
-- 一次冷计算在这台实例上要 2~3 分钟，所以预热任务单独设置 statement_timeout=0。
select cron.unschedule('admin-metrics-warm-7') where exists (select 1 from cron.job where jobname = 'admin-metrics-warm-7');
select cron.unschedule('admin-metrics-warm-30') where exists (select 1 from cron.job where jobname = 'admin-metrics-warm-30');
select cron.unschedule('admin-metrics-warm-90') where exists (select 1 from cron.job where jobname = 'admin-metrics-warm-90');
select cron.schedule('admin-metrics-warm-7', '0,30 * * * *', 'select public.score_tracker_admin_metrics_warm(array[7])');
select cron.schedule('admin-metrics-warm-30', '12,42 * * * *', 'select public.score_tracker_admin_metrics_warm(array[30])');
select cron.schedule('admin-metrics-warm-90', '22 * * * *', 'select public.score_tracker_admin_metrics_warm(array[90])');
