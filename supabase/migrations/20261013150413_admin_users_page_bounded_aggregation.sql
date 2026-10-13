-- Prepare a small exact latest-activity summary. Keep raw logs and all metrics.
-- Backfill and the new RPC are in the next migration to avoid long DDL locks.
create table public.score_tracker_admin_user_activity (
  user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
  last_seen timestamptz,
  changed_at timestamptz not null default clock_timestamp()
);
alter table public.score_tracker_admin_user_activity enable row level security;
revoke all on table public.score_tracker_admin_user_activity from public,anon,authenticated;
grant all on table public.score_tracker_admin_user_activity to service_role;

create or replace function public.score_tracker_refresh_admin_user_activity(p_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare latest timestamptz;
begin
  if p_user_id is null then return; end if;
  insert into public.score_tracker_admin_user_activity(user_id)
    select u.id from public.score_tracker_users u where u.id=p_user_id
    on conflict(user_id) do nothing;
  -- Lock before the fresh read: concurrent log changes cannot publish stale data.
  perform 1 from public.score_tracker_admin_user_activity a where a.user_id=p_user_id for update;
  if not found then return; end if;
  select v.occurred_at into latest from public.score_tracker_visit_logs v
    where v.user_id=p_user_id and v.occurred_at is not null order by v.occurred_at desc limit 1;
  update public.score_tracker_admin_user_activity set last_seen=latest,changed_at=clock_timestamp()
    where user_id=p_user_id;
end;
$$;

create or replace function public.score_tracker_sync_admin_user_activity()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare uid uuid;
begin
  if tg_op='INSERT' then
    for uid in select distinct n.user_id from new_activity_rows n where n.user_id is not null order by n.user_id loop
      perform public.score_tracker_refresh_admin_user_activity(uid);
    end loop;
  elsif tg_op='DELETE' then
    for uid in select distinct o.user_id from old_activity_rows o where o.user_id is not null order by o.user_id loop
      perform public.score_tracker_refresh_admin_user_activity(uid);
    end loop;
  else
    for uid in select user_id from (
      select n.user_id from new_activity_rows n where n.user_id is not null
      union select o.user_id from old_activity_rows o where o.user_id is not null
    ) affected order by user_id loop
      perform public.score_tracker_refresh_admin_user_activity(uid);
    end loop;
  end if;
  return null;
end;
$$;
create trigger score_tracker_admin_activity_insert
after insert on public.score_tracker_visit_logs referencing new table as new_activity_rows
for each statement execute function public.score_tracker_sync_admin_user_activity();
create trigger score_tracker_admin_activity_update
after update on public.score_tracker_visit_logs referencing old table as old_activity_rows new table as new_activity_rows
for each statement execute function public.score_tracker_sync_admin_user_activity();
create trigger score_tracker_admin_activity_delete
after delete on public.score_tracker_visit_logs referencing old table as old_activity_rows
for each statement execute function public.score_tracker_sync_admin_user_activity();

revoke all on function public.score_tracker_refresh_admin_user_activity(uuid) from public,anon,authenticated;
revoke all on function public.score_tracker_sync_admin_user_activity() from public,anon,authenticated;
grant execute on function public.score_tracker_refresh_admin_user_activity(uuid),public.score_tracker_sync_admin_user_activity() to service_role;
