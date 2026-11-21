-- Proposed migration: apply in staging first; service-role API only.
begin;
create table public.score_tracker_announcement_thread_replies(
 id uuid primary key default gen_random_uuid(),
 root_id uuid not null references public.score_tracker_announcement_comments(id) on delete cascade,
 user_id uuid not null references public.score_tracker_users(id) on delete cascade,
 parent_id uuid,
 content text not null check(length(btrim(content)) between 1 and 300),
 created_at timestamptz not null default now(),
 unique(root_id,id),
 foreign key(root_id,parent_id) references public.score_tracker_announcement_thread_replies(root_id,id) on delete cascade
);
create index on public.score_tracker_announcement_thread_replies(root_id,created_at,id);
create index on public.score_tracker_announcement_thread_replies(user_id,created_at desc);
create table public.score_tracker_announcement_root_likes(
 root_id uuid references public.score_tracker_announcement_comments(id) on delete cascade,
 user_id uuid references public.score_tracker_users(id) on delete cascade,
 primary key(root_id,user_id)
);
create table public.score_tracker_announcement_reply_likes(
 reply_id uuid references public.score_tracker_announcement_thread_replies(id) on delete cascade,
 user_id uuid references public.score_tracker_users(id) on delete cascade,
 primary key(reply_id,user_id)
);
alter table public.score_tracker_announcement_thread_replies enable row level security;
alter table public.score_tracker_announcement_root_likes enable row level security;
alter table public.score_tracker_announcement_reply_likes enable row level security;
revoke all on public.score_tracker_announcement_thread_replies,public.score_tracker_announcement_root_likes,public.score_tracker_announcement_reply_likes from public,anon,authenticated;
grant select,insert,delete on public.score_tracker_announcement_thread_replies,public.score_tracker_announcement_root_likes,public.score_tracker_announcement_reply_likes to service_role;
create function public.score_tracker_thread_reply_add(p_user uuid,p_root uuid,p_parent uuid,p_content text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.score_tracker_notification_config; n uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,741));
 select * into c from public.score_tracker_notification_config where id=1 for share;
 if not c.announcement_enabled or not c.announcement_comments_enabled or not c.announcement_comments_public or not exists(select 1 from public.score_tracker_announcement_comments where id=p_root and notice_id=c.announcement_id) then raise exception 'discussion_closed'; end if;
 if exists(select 1 from public.score_tracker_announcement_thread_replies where user_id=p_user and created_at>now()-interval '30 seconds') or exists(select 1 from public.score_tracker_announcement_comments where user_id=p_user and created_at>now()-interval '30 seconds') then raise exception 'rate_limit'; end if;
 insert into public.score_tracker_announcement_thread_replies(root_id,user_id,parent_id,content) values(p_root,p_user,p_parent,btrim(p_content)) returning id into n;
 return n;
end $$;
revoke all on function public.score_tracker_thread_reply_add(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.score_tracker_thread_reply_add(uuid,uuid,uuid,text) to service_role;
commit;
