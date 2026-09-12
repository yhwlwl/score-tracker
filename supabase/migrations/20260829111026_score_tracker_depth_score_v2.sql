-- 深度分 2.1（本地实验）：统一管理列表、用户详情与反馈快照的运营分层口径。
-- 这是产品使用深度，不是学习能力评分。高频原始事件采用对数和封顶，避免刷点击。
-- 相比 2.0：考试记录在高段继续增长，并按记录成熟度设置软上限，避免少量历史+高频点击直接冲到满分。

create or replace function public.score_tracker_depth_components(uid uuid)
returns table (
  score integer,
  level text,
  data_score integer,
  activity_score integer,
  feature_score integer,
  participation_score integer,
  exam_count bigint,
  actual_exams bigint,
  score_rows bigint,
  subjects bigint,
  active_days bigint,
  sessions bigint,
  events bigint,
  last_seen timestamptz,
  feature_families bigint,
  meaningful_interactions bigint,
  feedback_submissions bigint,
  user_feedback_replies bigint,
  has_goal boolean,
  used_planner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with activity as (
    select
      count(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)::bigint as active_days,
      count(distinct v.session_id)::bigint as sessions,
      count(*)::bigint as events,
      max(v.occurred_at) as last_seen,
      count(distinct case
        when v.event_type ~* '^stats_|deep|analysis' then 'analysis'
        when v.event_type ~* '^chart_|^legend_' then 'trend'
        when v.event_type ~* '^radar_' then 'radar'
        when v.event_type ~* '^goal_' then 'goal'
        when v.event_type ~* '^feedback_' then 'feedback'
        when v.event_type ~* '^study_planner_' then 'planner'
        when v.event_type ~* '^export_' then 'export'
        else null end)::bigint as feature_families,
      count(*) filter (where v.event_type ~* '^stats_|deep|analysis|^chart_|^legend_|^radar_|^goal_|^feedback_|^study_planner_|^export_')::bigint as meaningful_interactions,
      bool_or(v.event_type ~* '^study_planner_') as used_planner
    from public.score_tracker_visit_logs v
    where v.user_id = uid
  ), exam_data as (
    select count(*)::bigint as exam_count
    from public.score_tracker_exams e
    where e.user_id = uid
  ), score_data as (
    select
      count(*)::bigint as score_rows,
      count(distinct s.exam_id) filter (where s.actual_score is not null)::bigint as actual_exams,
      count(distinct s.subject) filter (where s.actual_score is not null or s.target_score is not null)::bigint as subjects
    from public.score_tracker_scores s
    where s.user_id = uid
  ), feedback_data as (
    select
      (select count(*)::bigint from public.score_tracker_feedback_submissions f where f.user_id = uid) as submissions,
      (select count(*)::bigint from public.score_tracker_feedback_replies r
        where r.author_type <> 'admin' and r.author_user_id = uid) as user_replies
  ), raw as (
    select
      coalesce(e.exam_count, 0)::bigint as exam_count,
      coalesce(s.actual_exams, 0)::bigint as actual_exams,
      coalesce(s.score_rows, 0)::bigint as score_rows,
      coalesce(s.subjects, 0)::bigint as subjects,
      coalesce(a.active_days, 0)::bigint as active_days,
      coalesce(a.sessions, 0)::bigint as sessions,
      coalesce(a.events, 0)::bigint as events,
      a.last_seen,
      coalesce(a.feature_families, 0)::bigint as feature_families,
      coalesce(a.meaningful_interactions, 0)::bigint as meaningful_interactions,
      coalesce(f.submissions, 0)::bigint as feedback_submissions,
      coalesce(f.user_replies, 0)::bigint as user_feedback_replies,
      exists(select 1 from public.score_tracker_user_goals g where g.user_id = uid) as has_goal,
      coalesce(a.used_planner, false) as used_planner
    from activity a cross join exam_data e cross join score_data s cross join feedback_data f
  ), dimensions as (
    select r.*,
      (
        -- 考试记录单独提高到 26 分；对数增长保留边际递减，但 20+ 场仍有可见区分度。
        least(26, round(26 * ln(1 + r.exam_count::numeric) / ln(31)))
        + least(10, round(10 * ln(1 + r.actual_exams::numeric) / ln(29)))
        + least(6, round(6 * ln(1 + r.score_rows::numeric) / ln(262)))
        + least(6, round(6 * ln(1 + r.subjects::numeric) / ln(14)))
      )::integer as data_score,
      (
        least(18, round(7 * ln(1 + r.active_days::numeric)))
        + least(10, round(3 * ln(1 + r.sessions::numeric)))
      )::integer as activity_score,
      (
        least(12, r.feature_families * 2)
        + least(8, round(2 * ln(1 + r.meaningful_interactions::numeric)))
      )::integer as feature_score,
      (
        least(6, r.feedback_submissions * 2 + r.user_feedback_replies)
        + case when r.has_goal then 2 else 0 end
        + case when r.used_planner then 2 else 0 end
      )::integer as participation_score
    from raw r
  ), final as (
    select d.*,
      -- 软上限随有效考试记录平滑提高：9 场约 87，20 场约 95，29 场达到 100。
      least(
        70 + round(30 * sqrt(least(d.exam_count::numeric, 29) / 29)),
        d.data_score + d.activity_score + d.feature_score + d.participation_score
      )::integer as depth_score
    from dimensions d
  )
  select
    f.depth_score,
    case when f.depth_score < 20 then 'new'
      when f.depth_score < 40 then 'casual'
      when f.depth_score < 60 then 'returning'
      when f.depth_score < 80 then 'engaged'
      else 'power' end::text,
    f.data_score, f.activity_score, f.feature_score, f.participation_score,
    f.exam_count, f.actual_exams, f.score_rows, f.subjects,
    f.active_days, f.sessions, f.events, f.last_seen,
    f.feature_families, f.meaningful_interactions,
    f.feedback_submissions, f.user_feedback_replies, f.has_goal, f.used_planner
  from final f;
$$;

create or replace function public.score_tracker_depth_score(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select c.score from public.score_tracker_depth_components(uid) c), 0);
$$;

create or replace function public.score_tracker_depth_breakdown(uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(to_jsonb(c), '{}'::jsonb)
  from public.score_tracker_depth_components(uid) c;
$$;

-- 总览使用同一份持久化分数，只筛选当前分析窗口里真正活跃过的用户。
create or replace function public.score_tracker_admin_depth_distribution(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active_users as (
    select distinct v.user_id
    from public.score_tracker_visit_logs v
    where v.user_id is not null
      and v.occurred_at >= now() - (greatest(1, least(coalesce(p_days, 7), 90))::text || ' days')::interval
  ), grouped as (
    select case
      when coalesce(u.depth_score, 0) < 20 then 'new'
      when coalesce(u.depth_score, 0) < 40 then 'casual'
      when coalesce(u.depth_score, 0) < 60 then 'returning'
      when coalesce(u.depth_score, 0) < 80 then 'engaged'
      else 'power' end::text as key,
      count(*)::bigint as count
    from active_users a
    join public.score_tracker_users u on u.id = a.user_id
    where coalesce(u.is_admin, false) = false
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'count', count) order by count desc), '[]'::jsonb)
  from grouped;
$$;

create or replace function public.score_tracker_refresh_depth_score(uid uuid)
returns void
language plpgsql
security definer
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
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  with activity as (
    select v.user_id,
      count(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)::numeric as active_days,
      count(distinct v.session_id)::numeric as sessions,
      max(v.occurred_at) as last_seen,
      count(distinct case
        when v.event_type ~* '^stats_|deep|analysis' then 'analysis'
        when v.event_type ~* '^chart_|^legend_' then 'trend'
        when v.event_type ~* '^radar_' then 'radar'
        when v.event_type ~* '^goal_' then 'goal'
        when v.event_type ~* '^feedback_' then 'feedback'
        when v.event_type ~* '^study_planner_' then 'planner'
        when v.event_type ~* '^export_' then 'export'
        else null end)::numeric as feature_families,
      count(*) filter (where v.event_type ~* '^stats_|deep|analysis|^chart_|^legend_|^radar_|^goal_|^feedback_|^study_planner_|^export_')::numeric as meaningful_interactions,
      bool_or(v.event_type ~* '^study_planner_') as used_planner
    from public.score_tracker_visit_logs v where v.user_id is not null group by v.user_id
  ), exam_data as (
    select e.user_id, count(*)::numeric as exam_count
    from public.score_tracker_exams e where e.user_id is not null group by e.user_id
  ), score_data as (
    select s.user_id, count(*)::numeric as score_rows,
      count(distinct s.exam_id) filter (where s.actual_score is not null)::numeric as actual_exams,
      count(distinct s.subject) filter (where s.actual_score is not null or s.target_score is not null)::numeric as subjects
    from public.score_tracker_scores s where s.user_id is not null group by s.user_id
  ), feedback_data as (
    select f.user_id, count(*)::numeric as submissions
    from public.score_tracker_feedback_submissions f where f.user_id is not null group by f.user_id
  ), reply_data as (
    select r.author_user_id as user_id, count(*)::numeric as user_replies
    from public.score_tracker_feedback_replies r
    where r.author_type <> 'admin' and r.author_user_id is not null group by r.author_user_id
  ), goal_data as (
    select g.user_id, true as has_goal from public.score_tracker_user_goals g
  ), raw as (
    select u.id,
      coalesce(a.active_days,0) as active_days, coalesce(a.sessions,0) as sessions, a.last_seen,
      coalesce(a.feature_families,0) as feature_families,
      coalesce(a.meaningful_interactions,0) as meaningful_interactions,
      coalesce(a.used_planner,false) as used_planner,
      coalesce(e.exam_count,0) as exam_count, coalesce(s.score_rows,0) as score_rows,
      coalesce(s.actual_exams,0) as actual_exams, coalesce(s.subjects,0) as subjects,
      coalesce(f.submissions,0) as submissions, coalesce(r.user_replies,0) as user_replies,
      coalesce(g.has_goal,false) as has_goal
    from public.score_tracker_users u
    left join activity a on a.user_id=u.id
    left join exam_data e on e.user_id=u.id
    left join score_data s on s.user_id=u.id
    left join feedback_data f on f.user_id=u.id
    left join reply_data r on r.user_id=u.id
    left join goal_data g on g.user_id=u.id
    where coalesce(u.is_admin,false)=false
  ), dimensions as (
    select r.*,
      least(26,round(26*ln(1+r.exam_count)/ln(31)))+least(10,round(10*ln(1+r.actual_exams)/ln(29)))
        +least(6,round(6*ln(1+r.score_rows)/ln(262)))+least(6,round(6*ln(1+r.subjects)/ln(14))) as data_score,
      least(18,round(7*ln(1+r.active_days)))+least(10,round(3*ln(1+r.sessions))) as activity_score,
      least(12,r.feature_families*2)+least(8,round(2*ln(1+r.meaningful_interactions))) as feature_score,
      least(6,r.submissions*2+r.user_replies)+case when r.has_goal then 2 else 0 end+case when r.used_planner then 2 else 0 end as participation_score
    from raw r
  ), calculated as (
    select d.id,
      least(
        70 + round(30 * sqrt(least(d.exam_count, 29) / 29)),
        d.data_score + d.activity_score + d.feature_score + d.participation_score
      )::integer as depth_score
    from dimensions d
  )
  update public.score_tracker_users u
     set depth_score = c.depth_score, depth_updated_at = now()
    from calculated c where u.id=c.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.score_tracker_depth_on_related_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  uid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  if uid is not null then perform public.score_tracker_refresh_depth_score(uid); end if;
  return null;
end;
$$;

drop trigger if exists score_tracker_depth_score_touch_trg on public.score_tracker_scores;
create trigger score_tracker_depth_score_touch_trg
  after insert or update or delete on public.score_tracker_scores
  for each row execute function public.score_tracker_depth_on_related_touch();

drop trigger if exists score_tracker_depth_feedback_touch_trg on public.score_tracker_feedback_submissions;
create trigger score_tracker_depth_feedback_touch_trg
  after insert or update of user_id or delete on public.score_tracker_feedback_submissions
  for each row execute function public.score_tracker_depth_on_related_touch();

drop trigger if exists score_tracker_depth_goal_touch_trg on public.score_tracker_user_goals;
create trigger score_tracker_depth_goal_touch_trg
  after insert or update or delete on public.score_tracker_user_goals
  for each row execute function public.score_tracker_depth_on_related_touch();

create or replace function public.score_tracker_depth_on_feedback_reply_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  uid := case when tg_op = 'DELETE' then old.author_user_id else new.author_user_id end;
  if uid is not null then perform public.score_tracker_refresh_depth_score(uid); end if;
  return null;
end;
$$;

drop trigger if exists score_tracker_depth_feedback_reply_touch_trg on public.score_tracker_feedback_replies;
create trigger score_tracker_depth_feedback_reply_touch_trg
  after insert or update or delete on public.score_tracker_feedback_replies
  for each row execute function public.score_tracker_depth_on_feedback_reply_touch();

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
  id uuid, username text, is_admin boolean, created_at timestamptz, updated_at timestamptz,
  last_seen timestamptz, sessions bigint, events bigint, days bigint, exam_count bigint,
  actual_exams bigint, score_rows bigint, subjects bigint, feedback_count bigint,
  depth_score integer, depth_level text, total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with activity as (
    select v.user_id, max(v.occurred_at) as last_seen,
      count(distinct v.session_id)::bigint as sessions,
      count(*)::bigint as events,
      count(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)::bigint as days
    from public.score_tracker_visit_logs v where v.user_id is not null group by v.user_id
  ), exams as (
    select e.user_id, count(*)::bigint as exam_count
    from public.score_tracker_exams e where e.user_id is not null group by e.user_id
  ), scores as (
    select s.user_id, count(*)::bigint as score_rows,
      count(distinct s.exam_id) filter (where s.actual_score is not null)::bigint as actual_exams,
      count(distinct s.subject) filter (where s.actual_score is not null or s.target_score is not null)::bigint as subjects
    from public.score_tracker_scores s where s.user_id is not null group by s.user_id
  ), feedback as (
    select f.user_id, count(*)::bigint as feedback_count
    from public.score_tracker_feedback_submissions f where f.user_id is not null group by f.user_id
  ), aggregated as (
    select u.id, u.username, u.is_admin, u.created_at, u.updated_at, a.last_seen,
      coalesce(a.sessions,0)::bigint as sessions, coalesce(a.events,0)::bigint as events,
      coalesce(a.days,0)::bigint as days, coalesce(e.exam_count,0)::bigint as exam_count,
      coalesce(s.actual_exams,0)::bigint as actual_exams, coalesce(s.score_rows,0)::bigint as score_rows,
      coalesce(s.subjects,0)::bigint as subjects, coalesce(f.feedback_count,0)::bigint as feedback_count,
      coalesce(u.depth_score,0)::integer as depth_score
    from public.score_tracker_users u
    left join activity a on a.user_id=u.id
    left join exams e on e.user_id=u.id
    left join scores s on s.user_id=u.id
    left join feedback f on f.user_id=u.id
    where coalesce(u.is_admin,false)=false
      and (nullif(btrim(p_search),'') is null or u.username ilike '%'||btrim(p_search)||'%'
        or u.original_username ilike '%'||btrim(p_search)||'%' or u.id::text ilike '%'||btrim(p_search)||'%')
  ), filtered as (
    select a.*, case when a.depth_score < 20 then 'new' when a.depth_score < 40 then 'casual'
      when a.depth_score < 60 then 'returning' when a.depth_score < 80 then 'engaged' else 'power' end::text as calculated_depth_level
    from aggregated a
    where (nullif(btrim(p_depth_level),'') is null or
      case when a.depth_score < 20 then 'new' when a.depth_score < 40 then 'casual'
        when a.depth_score < 60 then 'returning' when a.depth_score < 80 then 'engaged' else 'power' end = btrim(p_depth_level))
      and (nullif(btrim(p_activity),'') is null
        or (btrim(p_activity)='active' and a.last_seen is not null)
        or (btrim(p_activity)='none' and a.last_seen is null))
  )
  select f.id,f.username,f.is_admin,f.created_at,f.updated_at,f.last_seen,f.sessions,f.events,f.days,
    f.exam_count,f.actual_exams,f.score_rows,f.subjects,f.feedback_count,f.depth_score,f.calculated_depth_level,
    count(*) over() as total_count
  from filtered f
  order by
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='username' then f.username end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='username' then f.username end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='last_seen' then f.last_seen end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='last_seen' then f.last_seen end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='depth_score' then f.depth_score end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='depth_score' then f.depth_score end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='exam_count' then f.exam_count end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='exam_count' then f.exam_count end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='actual_exams' then f.actual_exams end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='actual_exams' then f.actual_exams end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='score_rows' then f.score_rows end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='score_rows' then f.score_rows end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='sessions' then f.sessions end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='sessions' then f.sessions end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='events' then f.events end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='events' then f.events end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='days' then f.days end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='days' then f.days end desc nulls last,
    case when lower(coalesce(p_order,'desc'))='asc' and p_sort='feedback_count' then f.feedback_count end asc nulls last,
    case when lower(coalesce(p_order,'desc'))='desc' and p_sort='feedback_count' then f.feedback_count end desc nulls last,
    f.id asc
  limit greatest(1,least(coalesce(p_limit,50),100)) offset greatest(coalesce(p_offset,0),0);
$$;

revoke all on function public.score_tracker_depth_components(uuid) from public, anon, authenticated;
revoke all on function public.score_tracker_depth_score(uuid) from public, anon, authenticated;
revoke all on function public.score_tracker_depth_breakdown(uuid) from public, anon, authenticated;
revoke all on function public.score_tracker_admin_depth_distribution(integer) from public, anon, authenticated;
revoke all on function public.score_tracker_refresh_all_depth_scores() from public, anon, authenticated;
revoke all on function public.score_tracker_admin_users_page(integer,integer,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.score_tracker_depth_components(uuid) to service_role;
grant execute on function public.score_tracker_depth_score(uuid) to service_role;
grant execute on function public.score_tracker_depth_breakdown(uuid) to service_role;
grant execute on function public.score_tracker_admin_depth_distribution(integer) to service_role;
grant execute on function public.score_tracker_refresh_all_depth_scores() to service_role;
grant execute on function public.score_tracker_admin_users_page(integer,integer,text,text,text,text,text) to service_role;

select public.score_tracker_refresh_all_depth_scores();
