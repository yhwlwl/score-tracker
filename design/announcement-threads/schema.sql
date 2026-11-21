-- Proposed migration: apply in staging first; service-role API only.
begin;
create table public.score_tracker_announcement_thread_replies(
 id uuid primary key default gen_random_uuid(),
 root_id uuid not null references public.score_tracker_announcement_comments(id) on delete cascade,
 user_id uuid not null references public.score_tracker_users(id) on delete cascade,
 parent_id uuid,
 parent_legacy boolean not null default false check(not parent_legacy or parent_id is null),
 deleted_at timestamptz,
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
create table public.score_tracker_announcement_legacy_likes(
 root_id uuid references public.score_tracker_announcement_comments(id) on delete cascade,
 user_id uuid references public.score_tracker_users(id) on delete cascade,
 primary key(root_id,user_id)
);
alter table public.score_tracker_announcement_legacy_likes enable row level security;
revoke all on public.score_tracker_announcement_legacy_likes from public,anon,authenticated;
grant select,insert,delete on public.score_tracker_announcement_legacy_likes to service_role;
alter table public.score_tracker_announcement_thread_replies enable row level security;
alter table public.score_tracker_announcement_root_likes enable row level security;
alter table public.score_tracker_announcement_reply_likes enable row level security;
revoke all on public.score_tracker_announcement_thread_replies,public.score_tracker_announcement_root_likes,public.score_tracker_announcement_reply_likes from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_announcement_thread_replies to service_role;
grant select,insert,delete on public.score_tracker_announcement_root_likes,public.score_tracker_announcement_reply_likes to service_role;
create function public.score_tracker_thread_reply_add(p_user uuid,p_root uuid,p_parent uuid,p_content text,p_legacy boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.score_tracker_notification_config; n uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,741));
 select * into c from public.score_tracker_notification_config where id=1 for share;
 if not c.announcement_enabled or not c.announcement_comments_enabled or not c.announcement_comments_public or not exists(select 1 from public.score_tracker_announcement_comments where id=p_root and notice_id=c.announcement_id) then raise exception 'discussion_closed'; end if;
 if exists(select 1 from public.score_tracker_announcement_thread_replies where user_id=p_user and created_at>now()-interval '30 seconds') or exists(select 1 from public.score_tracker_announcement_comments where user_id=p_user and created_at>now()-interval '30 seconds') then raise exception 'rate_limit'; end if;
 if p_legacy and (p_parent is not null or not exists(select 1 from public.score_tracker_announcement_comments where id=p_root and admin_reply is not null)) then raise exception 'reply_missing'; end if;
 if p_parent is not null and not exists(select 1 from public.score_tracker_announcement_thread_replies where id=p_parent and root_id=p_root and deleted_at is null) then raise exception 'reply_missing'; end if;
 insert into public.score_tracker_announcement_thread_replies(root_id,user_id,parent_id,parent_legacy,content) values(p_root,p_user,p_parent,p_legacy,btrim(p_content)) returning id into n;
 return n;
end $$;
revoke all on function public.score_tracker_thread_reply_add(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.score_tracker_thread_reply_add(uuid,uuid,uuid,text,boolean) to service_role;
create function public.score_tracker_thread_root_summary(p_roots uuid[],p_user uuid)
returns table(root_id uuid,reply_count bigint,like_count bigint,liked boolean,legacy_count bigint,legacy_liked boolean,preview jsonb)
language sql stable security invoker set search_path='' as $$
 select r.id,
 (select count(*) from public.score_tracker_announcement_thread_replies t where t.root_id=r.id),
 (select count(*) from public.score_tracker_announcement_root_likes l where l.root_id=r.id),
 exists(select 1 from public.score_tracker_announcement_root_likes l where l.root_id=r.id and l.user_id=p_user),
 (select count(*) from public.score_tracker_announcement_legacy_likes l where l.root_id=r.id),
 exists(select 1 from public.score_tracker_announcement_legacy_likes l where l.root_id=r.id and l.user_id=p_user),
 coalesce((select jsonb_agg(to_jsonb(p) order by p.priority,p.created_at,p.id) from (
   select t.id,t.parent_id,t.parent_legacy,t.created_at,t.deleted_at,
    case when t.deleted_at is null then t.content else '原回复已删除' end as content,
    case when t.deleted_at is not null then '已删除' when u.is_admin then '开发者'
      when char_length(btrim(u.username))<3 then '***'
      else left(btrim(u.username),1)||'***'||right(btrim(u.username),1) end as author,
    (t.deleted_at is null and u.is_admin) as is_developer,
    (t.deleted_at is null and t.user_id=p_user) as is_mine,
    (select count(*) from public.score_tracker_announcement_reply_likes l where l.reply_id=t.id) as count,
    exists(select 1 from public.score_tracker_announcement_reply_likes l where l.reply_id=t.id and l.user_id=p_user) as liked,
    case when u.is_admin then 0 else 1 end as priority
   from public.score_tracker_announcement_thread_replies t join public.score_tracker_users u on u.id=t.user_id
   where t.root_id=r.id and t.deleted_at is null
   order by priority,t.created_at,t.id limit 2
 ) p),'[]'::jsonb)
 from unnest(p_roots) as r(id)
$$;
revoke all on function public.score_tracker_thread_root_summary(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.score_tracker_thread_root_summary(uuid[],uuid) to service_role;
commit;
