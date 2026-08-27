-- 20260827: 深度分口径统一(列表/详情同源) —— 深度分 = 创建考试数 × 3 + 活跃天数 × 2
-- 权重常量在最下方 REFRESH 函数里,可直接改数值后重跑。
-- 存储于 score_tracker_users.depth_score:考试增删即时刷新;活跃天数通过埋点触发器
-- 15 分钟防抖刷新(考试表写入量小,精确即时;visit_logs 写入量大,按时间窗合并)。

alter table public.score_tracker_users
  add column if not exists depth_score int not null default 0;
alter table public.score_tracker_users
  add column if not exists depth_updated_at timestamptz;

create index if not exists score_tracker_exams_user_id_idx
  on public.score_tracker_exams (user_id);
create index if not exists score_tracker_visit_logs_user_id_idx
  on public.score_tracker_visit_logs (user_id);

/* ---- 单用户深度分 = 考试数×3 + 活跃天数×2 ---- */
create or replace function public.score_tracker_user_exam_count(uid uuid)
returns int
language sql stable
as $$
  select count(*)::int
  from public.score_tracker_exams e
  where e.user_id is not null and e.user_id::text = uid::text;
$$;

create or replace function public.score_tracker_user_active_days(uid uuid)
returns int
language sql stable
as $$
  select count(distinct (l.occurred_at at time zone 'Asia/Shanghai')::date)::int
  from public.score_tracker_visit_logs l
  where l.user_id is not null and l.user_id::text = uid::text;
$$;

create or replace function public.score_tracker_depth_score(uid uuid)
returns int
language sql stable
as $$
  select public.score_tracker_user_exam_count(uid) * 3
       + public.score_tracker_user_active_days(uid) * 2;
$$;

create or replace function public.score_tracker_refresh_depth_score(uid uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.score_tracker_users u
     set depth_score = public.score_tracker_depth_score(u.id),
         depth_updated_at = now()
   where u.id = uid and coalesce(u.is_admin, false) = false;
end;
$$;

create or replace function public.score_tracker_refresh_all_depth_scores()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare n integer;
begin
  /* 单遍聚合(不是逐用户子查询),大表下一次扫描,远低于超时窗口 */
  with agg as (
    select u.id,
           coalesce(e.cnt, 0) * 3 + coalesce(d.days, 0) * 2 as depth
      from public.score_tracker_users u
      left join (select user_id, count(*) as cnt
                   from public.score_tracker_exams e2 group by user_id) e
        on e.user_id::text = u.id::text
      left join (select user_id, count(distinct (occurred_at at time zone 'Asia/Shanghai')::date) as days
                   from public.score_tracker_visit_logs v2 group by user_id) d
        on d.user_id::text = u.id::text
     where coalesce(u.is_admin, false) = false
  )
  update public.score_tracker_users u
     set depth_score = a.depth,
         depth_updated_at = now()
    from agg a
   where u.id = a.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

/* ---- 考试增删/改动 → 该用户深度分即时重算 ---- */
create or replace function public.score_tracker_depth_on_exam_touch()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare uid uuid;
begin
  if tg_op = 'DELETE' then uid := old.user_id; else uid := new.user_id; end if;
  if uid is null then return null; end if;
  update public.score_tracker_users u
     set depth_score = public.score_tracker_depth_score(uid),
         depth_updated_at = now()
   where u.id = uid and coalesce(u.is_admin, false) = false;
  return null;
end;
$$;

drop trigger if exists score_tracker_depth_exam_touch_trg on public.score_tracker_exams;
create trigger score_tracker_depth_exam_touch_trg
  after insert or update of user_id or delete on public.score_tracker_exams
  for each row execute function public.score_tracker_depth_on_exam_touch();

/* ---- 埋点日志 → 活跃天数变更,15 分钟防抖后重算(控制高频表开销) ---- */
create or replace function public.score_tracker_depth_on_visit_touch()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare uid uuid;
begin
  uid := new.user_id;
  if uid is null then return null; end if;
  /* 先只打时间戳(轻量),15 分钟内只有第一次会触发下面的重算 */
  update public.score_tracker_users u
     set depth_updated_at = now()
   where u.id = uid
     and coalesce(u.is_admin, false) = false
     and (u.depth_updated_at is null
          or u.depth_updated_at < now() - interval '15 minutes');
  if found then
    update public.score_tracker_users u
       set depth_score = public.score_tracker_depth_score(u.id)
     where u.id = uid;
  end if;
  return null;
end;
$$;

drop trigger if exists score_tracker_depth_visit_touch_trg on public.score_tracker_visit_logs;
create trigger score_tracker_depth_visit_touch_trg
  after insert on public.score_tracker_visit_logs
  for each row execute function public.score_tracker_depth_on_visit_touch();

revoke all on function public.score_tracker_refresh_all_depth_scores() from public, anon, authenticated;
grant execute on function public.score_tracker_refresh_all_depth_scores() to service_role;

/* ---- 上线即重算全量(历史数据一次性落列) ---- */
select public.score_tracker_refresh_all_depth_scores();
