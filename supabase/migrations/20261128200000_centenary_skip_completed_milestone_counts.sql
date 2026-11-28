-- Once all count milestones are recorded, the user-facing read no longer recounts site-wide data.
CREATE OR REPLACE FUNCTION public.score_tracker_centenary_data(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s public.score_tracker_centenary%rowtype; n bigint; e bigint; w bigint; stamp timestamptz; hit timestamptz;
begin
 if not exists(select 1 from public.score_tracker_users where id=p_user) then return null; end if;
 select * into s from public.score_tracker_centenary where id=1;
 if (s.account_hit_at is null or s.event_hit_at is null)
 and (s.measured_at is null or s.measured_at < clock_timestamp()-interval '60 seconds')
 and pg_catalog.pg_try_advisory_xact_lock(6843120901::bigint) then
  select * into s from public.score_tracker_centenary where id=1 for update;
  if (s.account_hit_at is null or s.event_hit_at is null)
  and (s.measured_at is null or s.measured_at < clock_timestamp()-interval '60 seconds') then
   select count(*) into n from public.score_tracker_users where not is_admin;
   select count(*) into e from public.score_tracker_visit_logs;
   select count(*) into w from public.score_tracker_achievement_awards a join public.score_tracker_users u on u.id=a.user_id where a.badge_id='triple' and not u.is_admin;
   stamp:=clock_timestamp();
   if s.event_hit_at is null and e>=1000000 then select created_at into hit from public.score_tracker_visit_logs order by id offset 999999 limit 1; end if;
   update public.score_tracker_centenary set account_count=n,event_count=e,live_award_count=w,measured_at=stamp,
    account_hit_at=coalesce(account_hit_at,case when n>=10000 then stamp end),
    event_hit_at=coalesce(event_hit_at,hit),
    event_hit_observed_at=coalesce(event_hit_observed_at,case when e>=1000000 then stamp end)
   where id=1 returning * into s;
  end if;
 end if;
 return (select jsonb_build_object(
 'published',s.published_at is not null,'paused',s.paused,'published_at',s.published_at,'day_at',s.day_at,
 'account_hit_at',s.account_hit_at,'event_hit_at',s.event_hit_at,'event_hit_observed_at',s.event_hit_observed_at,
 'eligible',a.user_id is not null,'seen_at',a.seen_at,
 'registration_position',case when s.published_at is not null then a.registration_position when not u.is_admin then
 (select count(*) from public.score_tracker_users r where not r.is_admin and (r.created_at,r.id)<=(u.created_at,u.id)) else null end,
 'registered_at',u.created_at,
 'days_together',greatest(1,((now() at time zone 'Asia/Shanghai')::date-(u.created_at at time zone 'Asia/Shanghai')::date)+1),
 'personal_events',(select count(*) from public.score_tracker_visit_logs v where v.user_id=u.id),
 'personal_measured_at',clock_timestamp())
 from public.score_tracker_users u left join public.score_tracker_centenary_accounts a on a.user_id=u.id
 where u.id=p_user);
end $function$
;
