alter table public.score_tracker_announcement_comments
  add column is_developer boolean not null default false,
  add column pinned_at timestamptz,
  add column comment_revision integer not null default 0 check (comment_revision >= 0),
  add constraint score_tracker_comment_pin_developer check (pinned_at is null or is_developer);

-- Identity is assigned by trusted server code, never by public comment payloads.
create function public.score_tracker_validate_developer_comment()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.is_developer and (tg_op = 'INSERT' or new.is_developer is distinct from old.is_developer or new.user_id is distinct from old.user_id) then
    if not exists(select 1 from public.score_tracker_users where id=new.user_id and is_admin) then
      raise exception '只有管理员可以发布开发者评论';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.score_tracker_validate_developer_comment() from public, anon, authenticated;
create trigger score_tracker_developer_comment_identity
  before insert or update of is_developer,user_id on public.score_tracker_announcement_comments
  for each row execute function public.score_tracker_validate_developer_comment();

update public.score_tracker_announcement_comments c set is_developer=true
from public.score_tracker_users u where c.user_id=u.id and u.is_admin;

create index score_tracker_announcement_pins
  on public.score_tracker_announcement_comments(notice_id,pinned_at desc,sequence desc)
  where pinned_at is not null;

create or replace function public.score_tracker_add_announcement_comment(p_user_id uuid,p_notice_id text,p_content text)
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
  insert into public.score_tracker_announcement_comments(notice_id,user_id,content,is_developer)
    values(p_notice_id,p_user_id,trim(p_content),coalesce((select is_admin from public.score_tracker_users where id=p_user_id),false)) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.score_tracker_add_announcement_comment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_add_announcement_comment(uuid,text,text) to service_role;
-- Keep the existing private RLS table and its service-only access model.
