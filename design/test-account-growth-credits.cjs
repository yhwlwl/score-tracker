// Isolated PostgreSQL tests. Synthetic fixtures only; never connects to Supabase.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',exam='00000000-0000-4000-8000-000000000003';
const db=new PGlite();let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
async function sql(s,p=[]){return(await db.query(s,p)).rows;}
async function rpc(name,...args){return(await sql(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args))[0].v;}
const account=()=>rpc('score_tracker_ai_account',uid);
const task=()=>crypto.randomUUID();
async function ageTasks(){await sql("update score_tracker_ai_tasks set created_at=now()-interval '30 seconds'");}
async function start(id,feature='vision',floor=13,cap=150,user=uid){return rpc('score_tracker_ai_task_start',user,id,feature,floor,cap);}
async function reserve(id,key,model='deepseek-v4-flash',max=8192,user=uid){return rpc('score_tracker_ai_call_reserve',user,id,key,model,max);}
async function settle(key,usage,user=uid){return rpc('score_tracker_ai_call_settle',user,key,usage==null?null:JSON.stringify(usage),'fixture-request',200);}
async function finish(id,ok,user=uid){return rpc('score_tracker_ai_task_finish',user,id,ok);}
async function rejects(fn,pattern){await assert.rejects(fn,pattern);checks++;}
(async()=>{
await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 grant usage on schema public to service_role,anon,authenticated;
 create table score_tracker_users(id uuid primary key,created_at timestamptz default now(),is_admin boolean default false);
 create table score_tracker_exams(id uuid primary key,user_id uuid,exam_date date,created_at timestamptz default now(),total_actual_score numeric,reflection text,reflection_updated_at timestamptz);
 create table score_tracker_scores(user_id uuid,exam_id uuid,actual_score numeric,max_score numeric);
 create table score_tracker_user_goals(user_id uuid,total_goal numeric,dream_school text,subject_goals jsonb,updated_at timestamptz);
 create table score_tracker_paper_reviews(request_id uuid primary key,user_id uuid,draft_id uuid,exam_id uuid,subject text,fingerprint text,options jsonb,status text default 'running',result jsonb,corrections jsonb,created_at timestamptz default now());
 create table score_tracker_paper_usage(usage_date date,scope text,request_count integer,last_requested_at timestamptz,primary key(usage_date,scope));
 create table score_tracker_feature_votes(user_id uuid,created_at timestamptz);
 create table score_tracker_feedback_submissions(id uuid primary key default gen_random_uuid(),user_id uuid,status text,created_at timestamptz default now());
 create table score_tracker_visit_logs(user_id uuid,event_type text,metadata jsonb,occurred_at timestamptz default now());
 grant select on all tables in schema public to service_role;
`);
await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261115060104_account_growth_ai_credits.sql'),'utf8'));
await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261122121519_configurable_ai_monthly_budget.sql'),'utf8'));
await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261122121811_ai_manual_reservation_release_state.sql'),'utf8'));
await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261123090000_study_questions.sql'),'utf8'));
await sql('update score_tracker_ai_policy set hard_limit_cny=50');eq(Number((await sql('select hard_limit_cny from score_tracker_ai_policy'))[0].hard_limit_cny),50);await sql('update score_tracker_ai_policy set hard_limit_cny=20');
eq(await rpc('score_tracker_ai_release_ready'),true);
await sql('insert into score_tracker_users(id) values($1),($2)',[uid,other]);
await sql('update score_tracker_users set is_admin=true where id=$1',[other]);
await rejects(()=>rpc('score_tracker_ai_opening_budget',uid,0),/forbidden/);
eq((await rpc('score_tracker_ai_opening_budget',other,0)).recorded,true);
eq((await rpc('score_tracker_ai_opening_budget',other,5)).opening_cny,0);
await sql('update score_tracker_ai_policy set enabled=true');
let a=await account();eq(a.growth.level,1);eq(a.credits.available,150);eq((await account()).credits.balance,150);
await rejects(()=>db.exec(`set role anon;select score_tracker_ai_account('${uid}');`),/permission denied/);await db.exec('reset role');
await rejects(()=>db.exec('set role authenticated;select * from score_tracker_ai_wallets;'),/permission denied/);await db.exec('reset role');
await db.exec('set role service_role');eq((await account()).growth.points,0);await db.exec('reset role');
await sql("insert into score_tracker_exams(id,user_id,exam_date,total_actual_score) values($1,$2,current_date,0)",[exam,uid]);
await sql('update score_tracker_growth_accounts set last_refresh_at=null');a=await account();eq(a.growth.points,110);eq(a.growth.level,2);eq(a.credits.balance,550);
eq((await account()).credits.balance,550);
await rpc('score_tracker_growth_observe',uid,'chart_subject_changed',JSON.stringify({exam_id:exam}),new Date().toISOString());
await sql('update score_tracker_growth_accounts set last_refresh_at=null');a=await account();eq(a.growth.points,130);eq(a.growth.level,3);eq(a.credits.balance,650);
await rpc('score_tracker_growth_observe',other,'chart_subject_changed',JSON.stringify({exam_id:exam}),new Date().toISOString());eq((await rpc('score_tracker_ai_account',other)).growth.points,0);
for(let i=0;i<10;i++)await rpc('score_tracker_growth_observe',uid,'chart_subject_changed',JSON.stringify({exam_id:exam}),new Date().toISOString());eq((await account()).growth.points,130);
// Invalid, future, empty and duplicate-date exams cannot inflate the record award.
await sql("insert into score_tracker_exams(id,user_id,exam_date,total_actual_score) values(gen_random_uuid(),$1,current_date,10),(gen_random_uuid(),$1,current_date+2,20),(gen_random_uuid(),$1,current_date,null)",[uid]);
await sql('update score_tracker_growth_accounts set last_refresh_at=null');eq((await account()).growth.points,130);
await sql('delete from score_tracker_exams where user_id=$1',[uid]);await sql('update score_tracker_growth_accounts set last_refresh_at=null');a=await account();eq(a.growth.level,3);eq(a.growth.points,130);
let id=task();eq((await start(id)).approved,150);eq((await start(id)).duplicate,true);eq((await account()).credits.held,150);
eq((await reserve(id,'known')).allowed,true);
eq((await reserve(id,'known')).reason,'duplicate_call');
await settle('known',{prompt_tokens:3460,completion_tokens:662,completion_tokens_details:{reasoning_tokens:500}});
eq((await settle('known',{prompt_tokens:9999,completion_tokens:9999})).credits,12.216);
eq((await finish(id,true)).charged,13);eq((await finish(id,true)).charged,13);eq((await account()).credits.balance,637);eq((await account()).credits.held,0);
eq((await start(id)).duplicate,true);eq((await reserve(id,'cannot-replay')).reason,'task_inactive');
eq((await sql("select cache_hit_tokens,cache_miss_tokens from score_tracker_ai_calls where id='known'"))[0],{cache_hit_tokens:null,cache_miss_tokens:null});
await ageTasks();id=task();await start(id);await reserve(id,'cached');await settle('cached',{prompt_tokens:10000,completion_tokens:1000,prompt_cache_hit_tokens:8000,prompt_cache_miss_tokens:2000,completion_tokens_details:{reasoning_tokens:900}});eq((await finish(id,true)).charged,13);
eq(Number((await sql("select spent_cny from score_tracker_ai_budgets"))[0].spent_cny),0.024536);
await ageTasks();id=task();await start(id);await reserve(id,'failed');await settle('failed',{prompt_tokens:1000,completion_tokens:1000});const before=(await account()).credits.balance;eq((await finish(id,false)).charged,0);eq((await account()).credits.balance,before);
await ageTasks();id=task();await start(id);await reserve(id,'miss-only');await sql('update score_tracker_ai_policy set input_rate=99,cost_multiplier=9');
await settle('miss-only',{prompt_tokens:1000,completion_tokens:0,prompt_cache_miss_tokens:200});eq((await finish(id,true)).charged,1);eq(Number((await sql("select cost_cny from score_tracker_ai_calls where id='miss-only'"))[0].cost_cny),.000432);
await sql('update score_tracker_ai_policy set input_rate=2,cost_multiplier=1');
await ageTasks();id=task();await start(id);await reserve(id,'bad-cache');await settle('bad-cache',{prompt_tokens:1000,completion_tokens:0,prompt_cache_hit_tokens:1000,prompt_cache_miss_tokens:1000});eq((await finish(id,true)).charged,2);eq((await sql("select cache_hit_tokens from score_tracker_ai_calls where id='bad-cache'"))[0].cache_hit_tokens,null);
await ageTasks();id=task();await start(id);await reserve(id,'timeout');await settle('timeout',null);await finish(id,false);
let reserved=Number((await sql('select reserved_cny from score_tracker_ai_budgets'))[0].reserved_cny);assert(reserved>2);checks++;
await sql("update score_tracker_ai_calls set created_at=now()-interval '90 days' where id='timeout'");await account();eq(Number((await sql('select reserved_cny from score_tracker_ai_budgets'))[0].reserved_cny),reserved);
await rejects(()=>settle('timeout',{prompt_tokens:1,completion_tokens:1},other),/call_owner/);
await settle('timeout',{prompt_tokens:1000,completion_tokens:0});eq(Number((await sql('select reserved_cny from score_tracker_ai_budgets'))[0].reserved_cny),0);
// A failed result still costs the site; unknown costs are never released by age.
assert(Number((await sql('select spent_cny from score_tracker_ai_budgets'))[0].spent_cny)>0.03);checks++;
await ageTasks();id=task();await start(id);eq((await reserve(id,'unknown-model','unpriced')).reason,'unpriced_model');eq((await reserve(id,'null-limit','deepseek-v4-flash',null)).reason,'unpriced_model');
eq((await start(task(),'analysis')).reason,'analysis_disabled');eq((await start(task(),'admin_test',0,0)).reason,'forbidden');
await sql('update score_tracker_ai_policy set hard_limit_cny=0.1');eq((await reserve(id,'too-expensive')).reason,'site_budget');await sql('update score_tracker_ai_policy set hard_limit_cny=20');await finish(id,false);
// Manual release preserves unknown costs and late settlement must never subtract unrelated holds.
await ageTasks();id=task();await start(id);await reserve(id,'manual-release');await settle('manual-release',null);await finish(id,false);
await sql("update score_tracker_ai_budgets set reserved_cny=reserved_cny-(select reserved_cny from score_tracker_ai_calls where id='manual-release')");
await sql("update score_tracker_ai_calls set status='released',released_at=now() where id='manual-release'");
eq((await sql("select cost_cny from score_tracker_ai_calls where id='manual-release'"))[0].cost_cny,null);
await ageTasks();id=task();await start(id);await reserve(id,'unrelated-hold');
const unrelated=Number((await sql('select reserved_cny from score_tracker_ai_budgets'))[0].reserved_cny);
await settle('manual-release',null);eq((await sql("select status from score_tracker_ai_calls where id='manual-release'"))[0].status,'released');
await settle('manual-release',{prompt_tokens:1000,completion_tokens:0});eq(Number((await sql('select reserved_cny from score_tracker_ai_budgets'))[0].reserved_cny),unrelated);
await settle('unrelated-hold',{prompt_tokens:0,completion_tokens:0});await finish(id,false);
await ageTasks();
const study=task(),turn=JSON.stringify({question:'这场怎么样？',previous:null,result:{answer:'示例'}});
eq((await start(study,'study_question',1,60)).allowed,true);
await rejects(()=>rpc('score_tracker_study_finish',other,study,turn),/no rows/);
eq((await reserve(study,'study-turn')).allowed,true);await settle('study-turn',{prompt_tokens:100,completion_tokens:20});
const studyCharge=await rpc('score_tracker_study_finish',uid,study,turn);
eq(studyCharge.charged>0,true);
eq((await rpc('score_tracker_study_finish',uid,study,turn)).charged,studyCharge.charged);
eq((await sql('select count(*)::int n from score_tracker_study_turns where user_id=$1',[uid]))[0].n,1);
await rejects(()=>db.exec('set role authenticated;select turn from score_tracker_study_turns'),/permission denied/);await db.exec('reset role');
// Parallel reservations are serialized by the shared budget row; no overspend.
await ageTasks();id=task();await start(id,'probe',0,0);const many=await Promise.all(Array.from({length:15},(_,i)=>reserve(id,'parallel-'+i)));
eq(many.filter(r=>r.allowed).length,9);assert(Number((await sql('select spent_cny+reserved_cny as total from score_tracker_ai_budgets'))[0].total)<=20);checks++;
await finish(id,true);eq((await account()).credits.held,0);
// Rollover uses the previous monthly allowance, not today's upgraded allowance.
await sql("update score_tracker_ai_wallets set balance=0,grant_month=(date_trunc('month',now() at time zone 'Asia/Shanghai')-interval '2 months')::date,grant_allowance=400 where user_id=$1",[uid]);
await sql("delete from score_tracker_ai_grants where user_id=$1 and grant_key like 'month:%'",[uid]);a=await account();eq(a.credits.balance,900);
await sql("update score_tracker_ai_wallets set balance=0,grant_month=(date_trunc('month',now() at time zone 'Asia/Shanghai')-interval '12 months')::date,grant_allowance=500 where user_id=$1",[uid]);
await sql("delete from score_tracker_ai_grants where user_id=$1 and grant_key like 'month:%'",[uid]);eq((await account()).credits.balance,3000);
await sql('update score_tracker_growth_accounts set points=2000,last_refresh_at=null where user_id=$1',[uid]);a=await account();eq(a.growth.level,8);eq(a.credits.monthly,1700);
await sql("update score_tracker_users set created_at=now()-interval '181 days' where id=$1",[uid]);
for(let i=1;i<=4;i++)await rpc('score_tracker_growth_touch',uid,'record',new Date(Date.now()-i*31*86400000).toISOString(),null);
await sql('update score_tracker_growth_accounts set last_refresh_at=null');a=await account();eq(a.growth.level,12);eq(a.credits.monthly,4500);eq(a.credits.cap,13500);
eq((await account()).credits.balance,a.credits.balance);
// Even direct client SQL cannot award points or reconcile a call.
await rejects(()=>db.exec(`set role authenticated;select score_tracker_growth_award('${uid}','forged','first',99999,now(),null);`),/permission denied/);await db.exec('reset role');
eq((await sql("select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and (proname like 'score_tracker_ai_%' or proname like 'score_tracker_growth_%') and prosecdef"))[0].n,0);
const issue=(await sql("insert into score_tracker_feedback_submissions(user_id,status) values($1,'resolved') returning id",[uid]))[0].id;
await rejects(()=>rpc('score_tracker_growth_contribution',uid,issue),/forbidden/);
const points=(await account()).growth.points;await rpc('score_tracker_growth_contribution',other,issue);await rpc('score_tracker_growth_contribution',other,issue);eq((await account()).growth.points,points+20);
for(let i=0;i<6;i++){const f=(await sql("insert into score_tracker_feedback_submissions(user_id,status) values($1,'planned') returning id",[uid]))[0].id;await rpc('score_tracker_growth_contribution',other,f);}
eq(Number((await sql("select sum(points) n from score_tracker_growth_ledger where user_id=$1 and feature='contribution'",[uid]))[0].n),100);
await ageTasks();const paper=task();await start(paper,'paper_entry',150,1000);
eq((await rpc('score_tracker_ai_paper_reserve',uid,paper,task(),null,'数学','fixture')).created,true);
eq((await rpc('score_tracker_ai_paper_reserve',uid,paper,task(),null,'数学','fixture')).created,false);
eq((await rpc('score_tracker_ai_paper_reserve',uid,paper,task(),null,'数学','changed')).reason,'conflict');
eq((await rpc('score_tracker_ai_paper_reserve',uid,task(),task(),null,'数学','missing')).reason,'task_inactive');
for(let i=0;i<5;i++)await sql('insert into score_tracker_exams(id,user_id,exam_date,total_actual_score) values(gen_random_uuid(),$1,current_date-$2::int,10)',[other,i]);
await sql('update score_tracker_growth_accounts set last_refresh_at=null where user_id=$1',[other]);eq((await rpc('score_tracker_ai_account',other)).growth.points,150,'new exam-date awards capped at 60 each month');
const deletedTask=task();await start(deletedTask,'vision',13,150,other);await sql('delete from score_tracker_users where id=$1',[other]);eq((await sql('select user_id from score_tracker_ai_tasks where id=$1',[deletedTask]))[0].user_id,null);
console.log(`Account growth / credits: ${checks} assertions passed (isolated PostgreSQL).`);await db.close();
})().catch(async e=>{console.error(e);await db.close();process.exitCode=1});
