-- Preserve the exact identifier used by existing comments and read receipts.
alter table public.score_tracker_notification_config
  add column announcement_id text check (announcement_id ~ '^[0-9a-f]{24}$');
update public.score_tracker_notification_config
  set announcement_id=substr(encode(sha256(convert_to(announcement_title || E'\n' || announcement_content,'UTF8')),'hex'),1,24);
alter table public.score_tracker_notification_config
  alter column announcement_id set not null,
  alter column announcement_id set default substr(replace(gen_random_uuid()::text,'-',''),1,24);

create or replace function public.score_tracker_add_announcement_comment(p_user_id uuid,p_notice_id text,p_content text)
returns uuid language plpgsql security invoker set search_path = public, extensions as $$
declare c public.score_tracker_notification_config; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 741));
  select * into c from public.score_tracker_notification_config where id=1 for share;
  if not c.announcement_enabled or not c.announcement_comments_enabled or p_notice_id <> c.announcement_id
  then raise exception '公告已更新或关闭评论'; end if;
  if exists(select 1 from public.score_tracker_announcement_comments where user_id=p_user_id and created_at>now()-interval '30 seconds')
  then raise exception '评论太快'; end if;
  insert into public.score_tracker_announcement_comments(notice_id,user_id,content,is_developer)
    values(p_notice_id,p_user_id,trim(p_content),coalesce((select is_admin from public.score_tracker_users where id=p_user_id),false)) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.score_tracker_add_announcement_comment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_add_announcement_comment(uuid,text,text) to service_role;
