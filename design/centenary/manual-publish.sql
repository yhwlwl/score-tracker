-- MANUAL ONLY: run this transaction only after explicit release authorization and frontend production verification.
-- Never schedule this file. Cron stays disabled; armed is true only inside this transaction.
begin isolation level repeatable read;
do $release$
declare s public.score_tracker_centenary%rowtype; a bigint; e bigint; published boolean; n public.score_tracker_notification_config%rowtype;
begin
 perform pg_advisory_xact_lock(6843120901::bigint);
 select * into strict s from public.score_tracker_centenary where id=1 for update;
 if s.paused then raise exception 'centenary_paused'; end if;
 if exists(select 1 from cron.job where jobname='score-tracker-centenary-check' and active) then raise exception 'automatic_job_must_stay_disabled';end if;
 if s.published_at is not null then
   -- Safe retry: do not change original snapshot or announcement again.
   return;
 end if;
 select count(*) into a from public.score_tracker_users where not is_admin;
 select count(*) into e from public.score_tracker_visit_logs;
 if clock_timestamp()<s.day_at or a<10000 or e<1000000 then raise exception 'centenary_not_ready: accounts %, events %',a,e;end if;
 if to_regclass('public.score_tracker_achievement_awards') is null then raise exception 'achievement_awards_missing';end if;
 update public.score_tracker_centenary set armed=true where id=1;
 select public.score_tracker_centenary_refresh() into published;
 if published is distinct from true then raise exception 'centenary_publish_failed';end if;
 update public.score_tracker_centenary set armed=false where id=1 returning * into s;
 if (select count(*) from public.score_tracker_centenary_accounts)<>s.publish_account_count then raise exception 'centenary_eligibility_count_mismatch';end if;
 -- The original event cohort is the only eligibility authority; a single canonical medal ID.
 insert into public.score_tracker_achievement_awards(user_id,badge_id,rule_version,awarded_at,seen_at,evidence)
 select user_id,'triple',1,s.published_at,seen_at,jsonb_build_object('kind','event','source','centenary','verified',true,'achievedDate',(s.published_at at time zone 'Asia/Shanghai')::date,'dateBasis','event','registrationPosition',registration_position)
 from public.score_tracker_centenary_accounts on conflict(user_id,badge_id) do nothing;
 -- Reuse existing announcement discussion, with dedicated stable ID; preserve previous announcement and its comments.
 select * into strict n from public.score_tracker_notification_config where id=1 for update;
 if n.announcement_id is distinct from '63656e74656e617279323032' then
   update public.score_tracker_notification_config set
    announcement_history=coalesce(n.announcement_history,'[]'::jsonb)||
      case when n.announcement_id is not null and coalesce(n.announcement_content,'')<>'' then jsonb_build_array(jsonb_build_object('id',n.announcement_id,'title',n.announcement_title,'content',n.announcement_content,'updated_at',n.updated_at,'comments_enabled',n.announcement_comments_enabled,'comments_public',n.announcement_comments_public,'comment_title',n.announcement_comment_title)) else '[]'::jsonb end,
    announcement_id='63656e74656e617279323032',announcement_enabled=true,announcement_title='三百纪念',announcement_content='一百天、一万名用户、一百万次交互。谢谢大家一路以来的支持！欢迎在这里留下属于你的纪念。',
    announcement_comments_enabled=true,announcement_comments_public=true,announcement_comment_title='纪念留言',revision=n.revision+1,updated_at=clock_timestamp()
   where id=1;
 end if;
end
$release$;
commit;
-- Verify published_at, armed=false, frozen cohort, canonical triple count, announcement_id after commit.
select s.published_at,s.armed,s.publish_account_count,s.publish_event_count,
 (select count(*) from public.score_tracker_centenary_accounts) as cohort,
 (select count(*) from public.score_tracker_achievement_awards where badge_id='triple') as triple_awards,
 (select announcement_id from public.score_tracker_notification_config where id=1) as discussion_id
from public.score_tracker_centenary s where id=1;
