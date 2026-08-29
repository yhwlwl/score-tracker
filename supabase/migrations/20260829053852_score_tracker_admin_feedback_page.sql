-- 反馈工作台服务端分页与筛选。避免把全部反馈、回复和附件读入 Edge Function 再本地过滤。
create or replace function public.score_tracker_admin_feedback_page(
  p_limit integer default 30,
  p_offset integer default 0,
  p_search text default null,
  p_status text default null,
  p_type text default null,
  p_reply text default null,
  p_segment text default null,
  p_depth_level text default null,
  p_account_mode text default null,
  p_has_attachment text default null,
  p_sort text default 'created_at',
  p_order text default 'desc'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with reply_stats as (
    select
      r.feedback_id,
      count(*)::bigint as reply_count,
      count(*) filter (where r.author_type <> 'admin' and r.read_at is null)::bigint as admin_unread_count,
      max(r.created_at) as last_reply_at
    from public.score_tracker_feedback_replies r
    group by r.feedback_id
  ),
  attachment_stats as (
    select a.feedback_id, count(*)::bigint as attachment_count
    from public.score_tracker_feedback_attachments a
    group by a.feedback_id
  ),
  base as (
    select
      f.*,
      u.username,
      coalesce(rs.reply_count, 0)::bigint as reply_count,
      coalesce(rs.admin_unread_count, 0)::bigint as admin_unread_count,
      rs.last_reply_at,
      coalesce(ats.attachment_count, 0)::bigint as attachment_count,
      (f.status = 'new' or coalesce(rs.admin_unread_count, 0) > 0) as needs_reply
    from public.score_tracker_feedback_submissions f
    left join public.score_tracker_users u on u.id = f.user_id
    left join reply_stats rs on rs.feedback_id = f.id
    left join attachment_stats ats on ats.feedback_id = f.id
    where (
      nullif(btrim(p_search), '') is null
      or f.id::text ilike '%' || btrim(p_search) || '%'
      or coalesce(f.content, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(f.user_id::text, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(f.visitor_id::text, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(u.username, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(u.original_username, '') ilike '%' || btrim(p_search) || '%'
    )
    and (nullif(btrim(p_status), '') is null or f.status = btrim(p_status))
    and (nullif(btrim(p_type), '') is null or f.feedback_type = btrim(p_type))
    and (nullif(btrim(p_reply), '') is null
      or (btrim(p_reply) = 'needs' and (f.status = 'new' or coalesce(rs.admin_unread_count, 0) > 0))
      or (btrim(p_reply) = 'done' and f.status <> 'new' and coalesce(rs.admin_unread_count, 0) = 0))
    and (nullif(btrim(p_segment), '') is null or f.depth_level = btrim(p_segment))
    and (nullif(btrim(p_depth_level), '') is null or f.depth_level = btrim(p_depth_level))
    and (nullif(btrim(p_account_mode), '') is null or f.account_mode = btrim(p_account_mode))
    and (nullif(btrim(p_has_attachment), '') is null
      or (btrim(p_has_attachment) in ('yes','true','1') and coalesce(ats.attachment_count, 0) > 0)
      or (btrim(p_has_attachment) in ('no','false','0') and coalesce(ats.attachment_count, 0) = 0))
  ),
  numbered as (
    select b.*, count(*) over ()::bigint as total_count
    from base b
  ),
  page as (
    select *
    from numbered
    order by
      case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'created_at' then created_at end asc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'created_at' then created_at end desc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'last_reply_at' then last_reply_at end asc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'last_reply_at' then last_reply_at end desc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'depth_score' then depth_score end asc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'depth_score' then depth_score end desc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'tenure_days' then tenure_days end asc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'tenure_days' then tenure_days end desc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'total_sessions' then total_sessions end asc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'total_sessions' then total_sessions end desc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'asc' and p_sort = 'total_active_days' then total_active_days end asc nulls last,
      case when lower(coalesce(p_order, 'desc')) = 'desc' and p_sort = 'total_active_days' then total_active_days end desc nulls last,
      created_at desc,
      id asc
    limit greatest(20, least(coalesce(p_limit, 30), 100))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) - 'total_count' order by created_at desc, id asc) from page), '[]'::jsonb),
    'total_count', coalesce((select max(total_count) from numbered), 0),
    'server', true
  );
$$;

revoke all on function public.score_tracker_admin_feedback_page(integer, integer, text, text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.score_tracker_admin_feedback_page(integer, integer, text, text, text, text, text, text, text, text, text, text)
  to service_role;

create index if not exists score_tracker_feedback_created_admin_idx
  on public.score_tracker_feedback_submissions (created_at desc, id);
create index if not exists score_tracker_feedback_filter_admin_idx
  on public.score_tracker_feedback_submissions (status, feedback_type, depth_level, account_mode, created_at desc);
create index if not exists score_tracker_feedback_replies_feedback_admin_idx
  on public.score_tracker_feedback_replies (feedback_id, created_at desc);
create index if not exists score_tracker_feedback_attachments_feedback_admin_idx
  on public.score_tracker_feedback_attachments (feedback_id);
