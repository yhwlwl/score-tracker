create table public.score_tracker_centenary(
 id smallint primary key check(id=1),
 armed boolean not null default false,
 paused boolean not null default false,
 day_at timestamptz not null default '2026-11-27 00:00:00+08',
 account_hit_at timestamptz,
 event_hit_at timestamptz,
 event_hit_observed_at timestamptz,
 account_count bigint not null default 0,
 event_count bigint not null default 0,
 measured_at timestamptz,
 published_at timestamptz,
 publish_account_count bigint,
 publish_event_count bigint
);
insert into public.score_tracker_centenary(id) values(1);
create table public.score_tracker_centenary_accounts(
 user_id uuid primary key references public.score_tracker_users(id) on delete cascade,
 registration_position bigint not null,
 registered_at timestamptz not null,
 seen_at timestamptz
);
alter table public.score_tracker_centenary enable row level security;
alter table public.score_tracker_centenary_accounts enable row level security;
revoke all on public.score_tracker_centenary,public.score_tracker_centenary_accounts from public,anon,authenticated;
grant select,update on public.score_tracker_centenary to service_role;
grant select,insert,update on public.score_tracker_centenary_accounts to service_role;
create function public.score_tracker_centenary_refresh() returns boolean
language plpgsql security invoker set search_path='' as $$
declare s public.score_tracker_centenary; a bigint; e bigint; now_at timestamptz:=clock_timestamp(); hit timestamptz;
begin
 if not pg_catalog.pg_try_advisory_xact_lock(6843120901::bigint) then return false; end if;
 select * into s from public.score_tracker_centenary where id=1 for update;
 if s.published_at is not null then return false; end if;
 select count(*) into a from public.score_tracker_users where not is_admin;
 select count(*) into e from public.score_tracker_visit_logs;
 if s.event_hit_at is null and e>=1000000 then
   select created_at into hit from public.score_tracker_visit_logs order by id offset 999999 limit 1;
 end if;
 update public.score_tracker_centenary set account_count=a,event_count=e,measured_at=now_at,
 account_hit_at=coalesce(account_hit_at,case when a>=10000 then now_at end),
 event_hit_at=coalesce(event_hit_at,hit),
 event_hit_observed_at=coalesce(event_hit_observed_at,case when e>=1000000 then now_at end)
 where id=1;
 if s.armed and not s.paused and now_at>=s.day_at and a>=10000 and e>=1000000 then
   insert into public.score_tracker_centenary_accounts(user_id,registration_position,registered_at)
   select id,row_number() over(order by created_at,id),created_at from public.score_tracker_users where not is_admin on conflict(user_id) do nothing;
   update public.score_tracker_centenary set published_at=now_at,publish_account_count=a,publish_event_count=e where id=1 and published_at is null;
   return true;
 end if;
 return false;
end $$;
revoke all on function public.score_tracker_centenary_refresh() from public,anon,authenticated;
grant execute on function public.score_tracker_centenary_refresh() to service_role;
create function public.score_tracker_centenary_data(p_user uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'published',s.published_at is not null,'paused',s.paused,'published_at',s.published_at,'day_at',s.day_at,
 'account_hit_at',s.account_hit_at,'event_hit_at',s.event_hit_at,'event_hit_observed_at',s.event_hit_observed_at,
 'account_count',s.account_count,'event_count',s.event_count,'measured_at',s.measured_at,
 'eligible',a.user_id is not null,'seen_at',a.seen_at,
 'registration_position',case when s.published_at is not null then a.registration_position when not u.is_admin then
 (select count(*) from public.score_tracker_users r where not r.is_admin and (r.created_at,r.id)<=(u.created_at,u.id)) else null end,
 'registered_at',u.created_at,
 'days_together',greatest(1,((now() at time zone 'Asia/Shanghai')::date-(u.created_at at time zone 'Asia/Shanghai')::date)+1),
 'personal_events',(select count(*) from public.score_tracker_visit_logs v where v.user_id=u.id),
 'publish_account_count',s.publish_account_count,'publish_event_count',s.publish_event_count)
 from public.score_tracker_users u cross join public.score_tracker_centenary s left join public.score_tracker_centenary_accounts a on a.user_id=u.id
 where u.id=p_user and s.id=1
$$;
revoke all on function public.score_tracker_centenary_data(uuid) from public,anon,authenticated;
grant execute on function public.score_tracker_centenary_data(uuid) to service_role;
select cron.schedule('score-tracker-centenary-check','*/5 * * * *',$job$select public.score_tracker_centenary_refresh();$job$);