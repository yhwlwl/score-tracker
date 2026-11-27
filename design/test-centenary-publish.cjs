// Disposable PGlite database. No production connection, credentials, or writes.
const {PGlite}=require('@electric-sql/pglite'),assert=require('node:assert/strict'),fs=require('node:fs');
const publish=fs.readFileSync('design/centenary/manual-publish.sql','utf8');
const refresh="create function public.score_tracker_centenary_refresh() returns boolean\nlanguage plpgsql security invoker set search_path='' as $$\ndeclare s public.score_tracker_centenary; a bigint; e bigint; now_at timestamptz:=clock_timestamp(); hit timestamptz;\nbegin\n if not pg_catalog.pg_try_advisory_xact_lock(6843120901::bigint) then return false; end if;\n select * into s from public.score_tracker_centenary where id=1 for update;\n if s.published_at is not null then return false; end if;\n select count(*) into a from public.score_tracker_users where not is_admin;\n select count(*) into e from public.score_tracker_visit_logs;\n if s.event_hit_at is null and e>=1000000 then\n   select created_at into hit from public.score_tracker_visit_logs order by id offset 999999 limit 1;\n end if;\n update public.score_tracker_centenary set account_count=a,event_count=e,measured_at=now_at,\n account_hit_at=coalesce(account_hit_at,case when a>=10000 then now_at end),\n event_hit_at=coalesce(event_hit_at,hit),\n event_hit_observed_at=coalesce(event_hit_observed_at,case when e>=1000000 then now_at end)\n where id=1;\n if s.armed and not s.paused and now_at>=s.day_at and a>=10000 and e>=1000000 then\n   insert into public.score_tracker_centenary_accounts(user_id,registration_position,registered_at)\n   select id,row_number() over(order by created_at,id),created_at from public.score_tracker_users where not is_admin on conflict(user_id) do nothing;\n   update public.score_tracker_centenary set published_at=now_at,publish_account_count=a,publish_event_count=e where id=1 and published_at is null;\n   return true;\n end if;\n return false;\nend $$;";
async function run(){
 const db=new PGlite();try{
 await db.exec(`
 create schema cron;
 create table cron.job(jobname text, active boolean);
 insert into cron.job values('score-tracker-centenary-check',false);
 create table public.score_tracker_users(id uuid primary key,created_at timestamptz not null,is_admin boolean not null);
 create table public.score_tracker_centenary(id smallint primary key,armed boolean not null default false,paused boolean not null default false,day_at timestamptz not null,account_hit_at timestamptz,event_hit_at timestamptz,event_hit_observed_at timestamptz,account_count bigint not null default 0,event_count bigint not null default 0,measured_at timestamptz,published_at timestamptz,publish_account_count bigint,publish_event_count bigint);
 insert into public.score_tracker_centenary(id,day_at) values(1,'2026-11-26 16:00:00+00');
 create table public.score_tracker_centenary_accounts(user_id uuid primary key,registration_position bigint not null,registered_at timestamptz not null,seen_at timestamptz);
 create table public.score_tracker_achievement_awards(user_id uuid,badge_id text,rule_version int,awarded_at timestamptz,seen_at timestamptz,evidence jsonb,primary key(user_id,badge_id));
 create table public.score_tracker_notification_config(id int primary key,announcement_id text,announcement_title text,announcement_content text,announcement_history jsonb,announcement_enabled boolean,announcement_comments_enabled boolean,announcement_comments_public boolean,announcement_comment_title text,revision int,updated_at timestamptz);
 insert into public.score_tracker_notification_config values(1,'aaaaaaaaaaaaaaaaaaaaaaaa','原公告','原内容','[]',true,true,true,'原留言',3,now());
 create table event_fixture(n int);insert into event_fixture values(1000000);
 create view public.score_tracker_visit_logs as select i::bigint id,'2026-11-22 01:25:41+00'::timestamptz created_at from event_fixture cross join lateral generate_series(1,n) i;
 insert into public.score_tracker_users select md5(i::text)::uuid,'2026-08-20 00:00:00+00'::timestamptz+i*interval '1 second',i=10000 from generate_series(1,10000)i;
 `+refresh);
 const q=async s=>(await db.query(s)).rows[0];
 const snap=()=>q("select armed,paused,published_at,publish_account_count,publish_event_count,(select count(*)::int from public.score_tracker_centenary_accounts) cohort,(select count(*)::int from public.score_tracker_achievement_awards) awards,(select revision from public.score_tracker_notification_config) revision from public.score_tracker_centenary");
 const reject=async pattern=>{await assert.rejects(()=>db.exec(publish),pattern);await db.exec('rollback');const s=await snap();assert(!s.armed&&!s.published_at);assert.equal(s.cohort,0);assert.equal(s.awards,0);assert.equal(s.revision,3)};
 // Admin must not count toward 10K; other gates independently prevent publishing.
 await reject(/centenary_not_ready/);
 await db.exec("insert into public.score_tracker_users values(md5('10001')::uuid,'2026-11-28 00:00:00+00',false);update event_fixture set n=999999");
 await reject(/centenary_not_ready/);
 await db.exec("update event_fixture set n=1000000;update public.score_tracker_centenary set day_at=clock_timestamp()+interval '1 day'");
 await reject(/centenary_not_ready/);
 await db.exec("update public.score_tracker_centenary set day_at=clock_timestamp()-interval '1 day',paused=true");
 await reject(/centenary_paused/);
 await db.exec("update public.score_tracker_centenary set paused=false;update cron.job set active=true");
 await reject(/automatic_job_must_stay_disabled/);
 await db.exec("update cron.job set active=false");
 await db.exec(publish);
 const s=await snap();assert(s.published_at);assert.equal(s.armed,false);assert.equal(s.cohort,10000);assert.equal(s.awards,10000);assert.equal(Number(s.publish_account_count),10000);assert.equal(Number(s.publish_event_count),1000000);assert.equal(s.revision,4);
 const detail=await q("select (select count(*)::int from public.score_tracker_achievement_awards where badge_id='triple' and evidence->>'source'='centenary') valid_awards,(select count(*)::int from public.score_tracker_centenary_accounts where registration_position=10000) final_position,(select count(*)::int from public.score_tracker_centenary_accounts a join public.score_tracker_users u on a.user_id=u.id where u.is_admin) admin_awards,(select announcement_id from public.score_tracker_notification_config) discussion,(select announcement_history->0->>'title' from public.score_tracker_notification_config) old_title");
 assert.equal(detail.valid_awards,10000);assert.equal(detail.final_position,1);assert.equal(detail.admin_awards,0);assert.equal(detail.discussion,'63656e74656e617279323032');assert.equal(detail.old_title,'原公告');
 await db.exec("insert into public.score_tracker_users values(md5('10002')::uuid,clock_timestamp(),false)");
 await db.exec(publish);
 const again=await snap();assert.deepEqual(again,s);
 console.log('PASS manual centenary transaction: independent gates, rollback, frozen cohort, canonical award, preserved notice, idempotent repeat');
 }finally{await db.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1});
