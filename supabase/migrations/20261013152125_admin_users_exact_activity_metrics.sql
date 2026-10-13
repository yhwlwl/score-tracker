-- Keep exact activity cardinalities without copying or deleting raw events.
-- Separate the short schema/trigger update from the historical backfill.
alter table public.score_tracker_admin_user_activity
  add column session_keys text[],
  add column active_dates date[],
  add column events bigint,
  add column sessions bigint generated always as (cardinality(session_keys)::bigint) stored,
  add column days bigint generated always as (cardinality(active_dates)::bigint) stored;

create or replace function public.score_tracker_refresh_admin_user_activity(p_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare latest timestamptz; keys text[]; dates date[]; event_count bigint;
begin
  if p_user_id is null then return; end if;
  insert into public.score_tracker_admin_user_activity(user_id)
    select u.id from public.score_tracker_users u where u.id=p_user_id
    on conflict(user_id) do nothing;
  perform 1 from public.score_tracker_admin_user_activity a where a.user_id=p_user_id for update;
  if not found then return; end if;
  -- A fresh snapshot after the lock also handles concurrent edits/deletions.
  select max(v.occurred_at),count(*),
    coalesce(array_agg(distinct v.session_id::text) filter(where v.session_id is not null),'{}'::text[]),
    coalesce(array_agg(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)
      filter(where v.occurred_at is not null),'{}'::date[])
    into latest,event_count,keys,dates
    from public.score_tracker_visit_logs v where v.user_id=p_user_id;
  update public.score_tracker_admin_user_activity
    set last_seen=latest,events=event_count,session_keys=keys,active_dates=dates,changed_at=clock_timestamp()
    where user_id=p_user_id;
end;
$$;

create or replace function public.score_tracker_sync_admin_user_activity()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare uid uuid; cached public.score_tracker_admin_user_activity%rowtype;
  latest timestamptz; added_keys text[]; added_dates date[]; keys text[]; dates date[]; event_count bigint;
begin
  if tg_op='INSERT' then
    for uid in select distinct n.user_id from new_activity_rows n where n.user_id is not null order by n.user_id loop
      insert into public.score_tracker_admin_user_activity(user_id)
        select u.id from public.score_tracker_users u where u.id=uid on conflict(user_id) do nothing;
      select * into cached from public.score_tracker_admin_user_activity a where a.user_id=uid for update;
      if not found then continue; end if;
      if cached.events is null or cached.session_keys is null or cached.active_dates is null then
        perform public.score_tracker_refresh_admin_user_activity(uid);
        continue;
      end if;
      -- Only merge keys from the new batch. Joining the original rows also
      -- handles rows that a nested trigger has already edited or deleted.
      select max(v.occurred_at),
        coalesce(array_agg(distinct v.session_id::text) filter(where v.session_id is not null),'{}'::text[]),
        coalesce(array_agg(distinct (v.occurred_at at time zone 'Asia/Shanghai')::date)
          filter(where v.occurred_at is not null),'{}'::date[])
        into latest,added_keys,added_dates
        from new_activity_rows n join public.score_tracker_visit_logs v on v.id=n.id
        where v.user_id=uid;
      select coalesce(array_agg(distinct k order by k),'{}'::text[]) into keys
        from unnest(cached.session_keys||added_keys) k;
      select coalesce(array_agg(distinct d order by d),'{}'::date[]) into dates
        from unnest(cached.active_dates||added_dates) d;
      -- Use the narrow user index for the exact event count. A delta alone
      -- would double-count INSERT ... ON CONFLICT DO UPDATE statements whose
      -- UPDATE trigger has already refreshed the same user's complete state.
      select count(*) into event_count from public.score_tracker_visit_logs v where v.user_id=uid;
      update public.score_tracker_admin_user_activity
        set last_seen=greatest(cached.last_seen,latest),events=event_count,
          session_keys=keys,active_dates=dates,changed_at=clock_timestamp()
        where user_id=uid;
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
-- CREATE OR REPLACE preserves the service-only grants from the first migration.
