const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const uid='00000000-0000-4000-8000-000000000001',scope='user:'+uid;
async function run(){
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table score_tracker_users(id uuid primary key,created_at timestamptz not null);
    create table score_tracker_exams(id uuid primary key,user_id uuid not null);
    create table score_tracker_scores(exam_id uuid,user_id uuid,actual_score numeric,target_score numeric);
    create table score_tracker_ai_configs(id text primary key,enabled boolean not null,daily_limit int not null,global_daily_limit int not null,cooldown_seconds int not null);
    insert into score_tracker_users values('${uid}',clock_timestamp());
    insert into score_tracker_ai_configs values('score_vision',true,10,100,0),('custom',false,17,100,0);`);
  for(const name of ['20260927213000_score_tracker_ai_usage_limits.sql','20261012163740_tiered_vision_quota.sql'])await db.exec(read('supabase/migrations/'+name));
  await db.query("update score_tracker_ai_configs set tier_rules=$1 where id='custom'",[JSON.stringify([{name:'自定义',min_exams:0,min_account_days:0,daily_limit:17}])]);
  await db.exec(`insert into score_tracker_ai_usage values((now() at time zone 'UTC')::date-50,'${scope}',1,now()-interval '50 days');`);
  await db.exec(read('supabase/migrations/20261013050225_vision_quota_periods.sql'));
  await db.exec('grant usage on schema public to service_role;grant all on all tables in schema public to service_role');
  const q=async consume=>(await db.query('select score_tracker_vision_quota($1,$2) as q',[uid,!!consume])).rows[0].q;
  let v=await q(false);assert.equal(v.limit,1);assert.equal(v.period,'lifetime');assert.equal(v.used,1);assert.equal(v.remaining,0);assert.equal(v.resets_at,null);assert.equal(v.reason,'period_limit');
  assert.equal((await q(true)).consumed,false);assert.equal((await db.query("select sum(request_count)::int as n from score_tracker_ai_usage where scope=$1",[scope])).rows[0].n,1);
  const custom=(await db.query("select enabled,tier_rules from score_tracker_ai_configs where id='custom'")).rows[0];assert.equal(custom.enabled,false);assert.equal(custom.tier_rules[0].quota_limit,17);assert.equal(custom.tier_rules[0].period,'day');
  console.log('PASS: migration preserves historical spending/custom rules; one-time allowance never silently renews');
  const window=async(period,now)=>(await db.query('select score_tracker_vision_window($1,$2::timestamptz) as w',[period,now])).rows[0].w;
  for(const [period,now,start,end] of [
    ['month','2028-02-29T23:59:59Z','2028-02-01','2028-03-01T00:00:00.000Z'],
    ['month','2026-12-31T23:59:59Z','2026-12-01','2027-01-01T00:00:00.000Z'],
    ['week','2026-10-11T23:59:59Z','2026-10-05','2026-10-12T00:00:00.000Z'],
    ['week','2026-10-12T00:00:00Z','2026-10-12','2026-10-19T00:00:00.000Z'],
    ['day','2026-10-13T23:59:59Z','2026-10-13','2026-10-14T00:00:00.000Z']]){
    const w=await window(period,now);assert.equal(w.start_date,start);assert.equal(new Date(w.resets_at).toISOString(),end);
  }
  assert.equal((await window('lifetime','2026-10-13')).resets_at,null);await assert.rejects(window('year','2026-10-13'));
  console.log('PASS: leap months, year transitions, Sunday/Monday and daily boundaries retain UTC resets (08:00 Shanghai)');
  await db.exec(`truncate score_tracker_ai_usage;insert into score_tracker_ai_usage values((now() at time zone 'UTC')::date,'${scope}',1,now()-interval '1 hour'),((now() at time zone 'UTC')::date,'global',1,now()-interval '1 hour');
    insert into score_tracker_exams select md5(i::text)::uuid,'${uid}' from generate_series(1,20)i;
    insert into score_tracker_scores select md5(i::text)::uuid,'${uid}',case when i<=3 then 0 else null end,100 from generate_series(1,20)i;
    update score_tracker_users set created_at=now()-interval '7 days' where id='${uid}';`);
  v=await q(false);assert.equal(v.period,'month');assert.equal(v.limit,5);assert.equal(v.used,1);assert.equal(v.remaining,4);
  const burst=await Promise.all(Array.from({length:8},()=>q(true)));assert.equal(burst.filter(x=>x.consumed).length,4);assert.equal((await q(false)).reason,'period_limit');
  await db.exec(`update score_tracker_scores set actual_score=95 where exam_id in(select md5(i::text)::uuid from generate_series(1,10)i);update score_tracker_users set created_at=now()-interval '14 days' where id='${uid}';`);
  v=await q(false);assert.equal(v.period,'week');assert.equal(v.limit,10);assert.equal(v.used,5);assert.equal(v.remaining,5);
  await db.exec(`update score_tracker_scores set actual_score=95;update score_tracker_users set created_at=now()-interval '30 days' where id='${uid}';`);
  v=await q(false);assert.equal(v.period,'day');assert.equal(v.limit,20);assert.equal(v.used,5);assert.equal(v.remaining,15);
  await db.exec('update score_tracker_ai_configs set global_daily_limit=6 where id=\'score_vision\'');assert.equal((await q(true)).consumed,true);v=await q(true);assert.equal(v.reason,'global_limit');assert.equal(v.used,6);
  await db.exec("update score_tracker_ai_configs set global_daily_limit=100,cooldown_seconds=60 where id='score_vision'");assert.equal((await q(true)).reason,'cooldown');
  await db.exec("update score_tracker_ai_configs set enabled=false where id='score_vision'");assert.equal((await q(true)).reason,'vision_disabled');
  await db.exec("update score_tracker_ai_configs set enabled=true,cooldown_seconds=0 where id='score_vision'");
  console.log('PASS: lifetime → month → week → day upgrades carry spending; reservations enforce period/global caps and cooldown');
  async function policy(period,limit){await db.query("update score_tracker_ai_configs set tier_rules=$1 where id='score_vision'",[JSON.stringify([{name:'测试',min_exams:0,min_account_days:0,period,quota_limit:limit,daily_limit:limit}])]);}
  await policy('lifetime',1);assert.equal((await q(false)).remaining,0);await policy('month',5);assert.equal((await q(false)).remaining,0);await policy('week',10);assert.equal((await q(false)).remaining,4);
  await db.exec(`truncate score_tracker_ai_usage;insert into score_tracker_ai_usage values((date_trunc('month',now() at time zone 'UTC'))::date-1,'${scope}',9,now()-interval '40 days');
    insert into score_tracker_ai_usage values((date_trunc('month',now() at time zone 'UTC'))::date,'${scope}',3,now()-interval '1 hour');
    insert into score_tracker_ai_usage values((now() at time zone 'UTC')::date,'${scope}',1,now()-interval '1 hour') on conflict(usage_date,scope) do update set request_count=score_tracker_ai_usage.request_count+excluded.request_count;`);
  await policy('month',5);v=await q(false);assert.equal(v.used,4);assert.equal(v.remaining,1);await policy('lifetime',20);assert.equal((await q(false)).used,13);
  await db.exec(`truncate score_tracker_ai_usage;insert into score_tracker_ai_usage values((date_trunc('week',now() at time zone 'UTC'))::date-1,'${scope}',9,now()-interval '20 days'),((now() at time zone 'UTC')::date,'${scope}',2,now()-interval '1 hour');`);
  await policy('week',10);assert.equal((await q(false)).used,2);await policy('day',20);assert.equal((await q(false)).used,2);
  const before=(await db.query('select count(*)::int as n from score_tracker_ai_usage')).rows[0].n;await q(false);assert.equal((await db.query('select count(*)::int as n from score_tracker_ai_usage')).rows[0].n,before);
  console.log('PASS: configuration changes keep spending; period sums include the right historical days; refresh does not create usage');
  for(const bad of [{period:'year',quota_limit:1},{period:null,quota_limit:1},{period:'day',quota_limit:0},{period:'week',quota_limit:1,daily_limit:2}])await assert.rejects(db.query("update score_tracker_ai_configs set tier_rules=$1 where id='score_vision'",[JSON.stringify([{name:'非法',min_exams:0,min_account_days:0,...bad}])]));
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(q(false),/permission denied/);await assert.rejects(window('month','2026-10-13'),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');assert.equal((await q(false)).limit,20);await db.exec('reset role');await db.close();
  console.log('PASS: invalid periods/amounts are rejected and all quota RPCs remain service-only');
}
run().catch(e=>{console.error(e.message,e.code||'');process.exitCode=1});
