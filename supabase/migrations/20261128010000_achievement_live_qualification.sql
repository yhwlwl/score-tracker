-- Private, permanent attainment ledger, separate from delivery/read receipts.
-- A version is counted once per account. Retiring an old rule never removes awards.
create table public.score_tracker_achievement_qualifications (
 user_id uuid not null references public.score_tracker_users(id) on delete cascade,
 badge_id text not null check (badge_id ~ '^[a-z0-9-]{1,64}$'),
 rule_version integer not null check (rule_version>0),
 achieved_date date,
 source text not null default 'evaluation',
 eligible boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(user_id,badge_id,rule_version)
);
create table public.score_tracker_achievement_live_counts (
 badge_id text not null, rule_version integer not null,
 n bigint not null default 0 check(n>=0),
 updated_at timestamptz not null default now(),
 primary key(badge_id,rule_version)
);
alter table public.score_tracker_achievement_qualifications enable row level security;
alter table public.score_tracker_achievement_live_counts enable row level security;
revoke all on public.score_tracker_achievement_qualifications,public.score_tracker_achievement_live_counts from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_achievement_qualifications,public.score_tracker_achievement_live_counts to service_role;
create function public.st_achievement_eligible(p_admin boolean,p_name text) returns boolean
language sql immutable security invoker set search_path='' as $$
 select not coalesce(p_admin,false) and lower(p_name) not in ('showcase','admin','admin1')
$$;
create function public.st_achievement_qualification_owner() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select public.st_achievement_eligible(u.is_admin,u.username) into new.eligible from public.score_tracker_users u where u.id=new.user_id;
 if not found then raise exception 'qualification account missing'; end if;
 return new;
end $$;
create trigger st_achievement_qualification_owner before insert on public.score_tracker_achievement_qualifications
for each row execute function public.st_achievement_qualification_owner();
-- Transition tables amortize each batch into at most one update per badge/version.
create function public.st_achievement_qualification_added() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.score_tracker_achievement_live_counts(badge_id,rule_version,n)
 select badge_id,rule_version,count(*) from new_qualifications where eligible group by 1,2 order by 1,2
 on conflict(badge_id,rule_version) do update set n=public.score_tracker_achievement_live_counts.n+excluded.n,updated_at=now();
 return null;
end $$;
create function public.st_achievement_qualification_removed() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 update public.score_tracker_achievement_live_counts c set n=c.n-x.n,updated_at=now()
 from (select badge_id,rule_version,count(*) n from old_qualifications where eligible group by 1,2) x
 where c.badge_id=x.badge_id and c.rule_version=x.rule_version;
 return null;
end $$;
create function public.st_achievement_qualification_changed() returns trigger language plpgsql security invoker set search_path='' as $$
declare x record;
begin
 for x in select badge_id,rule_version,sum(delta)::bigint n from (
  select badge_id,rule_version,-1 delta from old_qualifications where eligible
  union all select badge_id,rule_version,1 delta from new_qualifications where eligible
 ) d group by 1,2 having sum(delta)<>0 order by 1,2 loop
  if x.n>0 then
   insert into public.score_tracker_achievement_live_counts(badge_id,rule_version,n) values(x.badge_id,x.rule_version,x.n)
   on conflict(badge_id,rule_version) do update set n=public.score_tracker_achievement_live_counts.n+excluded.n,updated_at=now();
  else
   update public.score_tracker_achievement_live_counts set n=n+x.n,updated_at=now() where badge_id=x.badge_id and rule_version=x.rule_version;
  end if;
 end loop;
 return null;
end $$;
create trigger st_achievement_qualification_added after insert on public.score_tracker_achievement_qualifications referencing new table as new_qualifications for each statement execute function public.st_achievement_qualification_added();
create trigger st_achievement_qualification_removed after delete on public.score_tracker_achievement_qualifications referencing old table as old_qualifications for each statement execute function public.st_achievement_qualification_removed();
create trigger st_achievement_qualification_changed after update on public.score_tracker_achievement_qualifications referencing old table as old_qualifications new table as new_qualifications for each statement execute function public.st_achievement_qualification_changed();
-- Keep the denominator accurate even when an account is removed or changes role/name.
lock table public.score_tracker_users in share row exclusive mode;
insert into public.score_tracker_achievement_live_counts(badge_id,rule_version,n)
select '__users__',0,count(*) from public.score_tracker_users where public.st_achievement_eligible(is_admin,username);
insert into public.score_tracker_achievement_live_counts(badge_id,rule_version,n) values('__ready__',0,0);
create function public.st_achievement_user_change() returns trigger language plpgsql security invoker set search_path='' as $$
declare was boolean:=false; active boolean:=false; d integer;
begin
 if tg_op<>'INSERT' then was:=public.st_achievement_eligible(old.is_admin,old.username); end if;
 if tg_op<>'DELETE' then active:=public.st_achievement_eligible(new.is_admin,new.username); end if;
 d:=active::integer-was::integer;
 if d<>0 then update public.score_tracker_achievement_live_counts set n=n+d,updated_at=now() where badge_id='__users__' and rule_version=0; end if;
 if tg_op='INSERT' then
  insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,achieved_date,source)
  values(new.id,'first-step',2,(new.created_at at time zone 'Asia/Shanghai')::date,'registration')
  on conflict do nothing;
  if new.created_at<'2026-08-26T16:00:00Z'::timestamptz then
   insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,achieved_date,source)
   values(new.id,'early',1,(new.created_at at time zone 'Asia/Shanghai')::date,'registration') on conflict do nothing;
  end if;
 elsif tg_op='UPDATE' and d<>0 then
  update public.score_tracker_achievement_qualifications set eligible=active where user_id=new.id and eligible is distinct from active;
 end if;
 return null;
end $$;
create trigger st_achievement_user_change after insert or delete or update of is_admin,username on public.score_tracker_users for each row execute function public.st_achievement_user_change();
-- New actual awards mirror into the ledger; the ledger never sends a notification.
create function public.st_achievement_award_mirror() returns trigger language plpgsql security invoker set search_path='' as $$
declare bid text; ver integer; ad date;
begin
 bid:=case when new.badge_id='contributor' then 'creator' else new.badge_id end;
 ver:=case when bid in ('creator','pioneer','spark-support','annual','triple') then 1 else new.rule_version end;
 if coalesce(new.evidence->>'achievedDate',new.evidence->>'date','') ~ '^\d{4}-\d{2}-\d{2}$' then
  begin ad:=coalesce(new.evidence->>'achievedDate',new.evidence->>'date')::date; exception when others then ad:=null; end;
 end if;
 insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,achieved_date,source)
 values(new.user_id,bid,ver,ad,'award') on conflict(user_id,badge_id,rule_version) do nothing;
 return null;
end $$;
create trigger st_achievement_award_mirror after insert or update of rule_version on public.score_tracker_achievement_awards for each row execute function public.st_achievement_award_mirror();
-- Fast public-facing aggregate through the already authenticated data API only.
create function public.score_tracker_achievement_live_stats() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'ready',coalesce((select n=1 from public.score_tracker_achievement_live_counts where badge_id='__ready__' and rule_version=0),false),
 'total',coalesce((select n from public.score_tracker_achievement_live_counts where badge_id='__users__' and rule_version=0),0),
 'version_counts',coalesce((select jsonb_object_agg(badge_id||':'||rule_version,n) from public.score_tracker_achievement_live_counts where rule_version>0),'{}'::jsonb),
 'updated_at',(select max(updated_at) from public.score_tracker_achievement_live_counts),
 'day',(now() at time zone 'Asia/Shanghai')::date
 )
$$;
revoke all on function public.score_tracker_achievement_live_stats() from public,anon,authenticated;
grant execute on function public.score_tracker_achievement_live_stats() to service_role;
revoke all on function public.st_achievement_eligible(boolean,text),public.st_achievement_qualification_owner(),public.st_achievement_qualification_added(),public.st_achievement_qualification_removed(),public.st_achievement_qualification_changed(),public.st_achievement_user_change(),public.st_achievement_award_mirror() from public,anon,authenticated;
grant execute on function public.st_achievement_eligible(boolean,text),public.st_achievement_qualification_owner(),public.st_achievement_qualification_added(),public.st_achievement_qualification_removed(),public.st_achievement_qualification_changed(),public.st_achievement_user_change(),public.st_achievement_award_mirror() to service_role;
-- Baseline registration-only achievements and existing receipts; no award writes.
insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,achieved_date,source)
select id,'first-step',2,(created_at at time zone 'Asia/Shanghai')::date,'registration' from public.score_tracker_users
on conflict do nothing;
insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,achieved_date,source)
select id,'early',1,(created_at at time zone 'Asia/Shanghai')::date,'registration' from public.score_tracker_users where created_at<'2026-08-26T16:00:00Z'::timestamptz
on conflict do nothing;
insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,source)
select user_id,case when badge_id='contributor' then 'creator' else badge_id end,
case when badge_id in ('creator','contributor','pioneer','spark-support','annual','triple') then 1 else rule_version end,'award'
from public.score_tracker_achievement_awards on conflict do nothing;
