alter table public.score_tracker_notification_config
  add column announcement_comments_enabled boolean not null default false,
  add column announcement_comment_title text not null default '想听听大家的意见'
    check (length(announcement_comment_title) between 1 and 120);
create table public.score_tracker_announcement_comments (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity unique,
  notice_id text not null check (length(notice_id) = 24),
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index score_tracker_announcement_comments_notice on public.score_tracker_announcement_comments(notice_id,sequence desc);
create index score_tracker_announcement_comments_user on public.score_tracker_announcement_comments(user_id,created_at desc);
alter table public.score_tracker_announcement_comments enable row level security;
revoke all on public.score_tracker_announcement_comments from anon, authenticated;
grant select,insert,delete on public.score_tracker_announcement_comments to service_role;
grant usage,select on sequence public.score_tracker_announcement_comments_sequence_seq to service_role;
-- Only the Edge Function calls this after verifying the custom account session.
-- Serialize per-account submissions and keep the current-announcement check atomic.
create function public.score_tracker_add_announcement_comment(p_user_id uuid,p_notice_id text,p_content text)
returns uuid language plpgsql security invoker set search_path = public, extensions as $$
declare c public.score_tracker_notification_config; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 741));
  select * into c from public.score_tracker_notification_config where id=1 for share;
  if not c.announcement_enabled or not c.announcement_comments_enabled or
    p_notice_id <> substr(encode(digest(c.announcement_title || E'\n' || c.announcement_content,'sha256'),'hex'),1,24)
  then raise exception '公告已更新或关闭评论'; end if;
  if exists(select 1 from public.score_tracker_announcement_comments where user_id=p_user_id and created_at>now()-interval '30 seconds')
  then raise exception '评论太快'; end if;
  insert into public.score_tracker_announcement_comments(notice_id,user_id,content)
    values(p_notice_id,p_user_id,trim(p_content)) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.score_tracker_add_announcement_comment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_add_announcement_comment(uuid,text,text) to service_role;
