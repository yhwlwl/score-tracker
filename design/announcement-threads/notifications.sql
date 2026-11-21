-- Notification records are derived from trusted reply rows, never client recipient IDs.
create table public.score_tracker_announcement_thread_notifications(
 reply_id uuid primary key references public.score_tracker_announcement_thread_replies(id) on delete cascade,
 recipient_id uuid not null references public.score_tracker_users(id) on delete cascade,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index on public.score_tracker_announcement_thread_notifications(recipient_id,created_at desc) where read_at is null;
alter table public.score_tracker_announcement_thread_notifications enable row level security;
revoke all on public.score_tracker_announcement_thread_notifications from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_announcement_thread_notifications to service_role;
create function public.score_tracker_thread_notify() returns trigger language plpgsql security invoker set search_path='' as $$
declare recipient uuid;
begin
 if tg_op='UPDATE' then
   if new.deleted_at is not null then delete from public.score_tracker_announcement_thread_notifications where reply_id=new.id; end if;
   return new;
 end if;
 if new.deleted_at is not null then return new; end if;
 if new.parent_legacy then
   select admin_replied_by into recipient from public.score_tracker_announcement_comments where id=new.root_id and admin_reply is not null;
 elsif new.parent_id is not null then
   select user_id into recipient from public.score_tracker_announcement_thread_replies where id=new.parent_id and root_id=new.root_id and deleted_at is null;
 else
   select user_id into recipient from public.score_tracker_announcement_comments where id=new.root_id;
 end if;
 if recipient is not null and recipient<>new.user_id then
   insert into public.score_tracker_announcement_thread_notifications(reply_id,recipient_id,created_at) values(new.id,recipient,new.created_at) on conflict(reply_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.score_tracker_thread_notify() from public,anon,authenticated;
grant execute on function public.score_tracker_thread_notify() to service_role;
create trigger score_tracker_thread_notify_insert after insert on public.score_tracker_announcement_thread_replies for each row execute function public.score_tracker_thread_notify();
create trigger score_tracker_thread_notify_delete after update of deleted_at on public.score_tracker_announcement_thread_replies for each row execute function public.score_tracker_thread_notify();

-- Edge API supplies only public notice IDs from the current authoritative history.
create function public.score_tracker_thread_notification_rows(p_user uuid,p_notices text[],p_reply uuid default null)
returns table(id uuid,notice_id text,root_id uuid,comment_preview text,reply_preview text,replied_at timestamptz,author text,is_developer boolean,total bigint,target_author text,target_created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select t.id,c.notice_id,c.id,
 left(case when t.parent_legacy then coalesce(c.admin_reply,'原回复已删除') when t.parent_id is not null then coalesce(p.content,'原回复已删除') else c.content end,1000),
 left(t.content,300),t.created_at,
 case when u.is_admin then '开发者' when char_length(btrim(u.username))<3 then '***' else left(btrim(u.username),1)||'***'||right(btrim(u.username),1) end,
 u.is_admin,count(*) over(),
 case when t.parent_legacy then '开发者' when t.parent_id is not null and p.deleted_at is not null then '已删除' when me.is_admin then '开发者' when char_length(btrim(me.username))<3 then '***' else left(btrim(me.username),1)||'***'||right(btrim(me.username),1) end,
 case when t.parent_legacy then c.admin_replied_at when t.parent_id is not null then p.created_at else c.created_at end
 from public.score_tracker_announcement_thread_notifications n
 join public.score_tracker_announcement_thread_replies t on t.id=n.reply_id
 join public.score_tracker_announcement_comments c on c.id=t.root_id
 join public.score_tracker_users u on u.id=t.user_id
 join public.score_tracker_users me on me.id=n.recipient_id
 left join public.score_tracker_announcement_thread_replies p on p.id=t.parent_id and p.root_id=t.root_id
 where n.recipient_id=p_user and t.deleted_at is null and c.notice_id=any(p_notices)
 and ((p_reply is null and n.read_at is null) or t.id=p_reply)
 order by t.created_at desc,t.id desc limit 20
$$;
revoke all on function public.score_tracker_thread_notification_rows(uuid,text[],uuid) from public,anon,authenticated;
grant execute on function public.score_tracker_thread_notification_rows(uuid,text[],uuid) to service_role;