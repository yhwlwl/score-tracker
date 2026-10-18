const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {backendHarness,source}=require('./vision-harness.cjs');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration='supabase/migrations/20261017085214_vision_reliability_and_samples.sql';
const image='data:image/png;base64,AAAA',uuid='00000000-0000-4000-8000-000000000003';
const valid={choices:[{finish_reason:'stop',message:{content:JSON.stringify({exam:{},subjects:[{name:'数学',finalScore:128}],warnings:[]})}}]};
async function upstreamTests(){
  const sent=[],scope={Response,AbortController,setTimeout,clearTimeout,console,fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return responses.shift()}};
  vm.createContext(scope);vm.runInContext(source('supabase/functions/score-tracker-vision-preview/reliability.ts')+';globalThis.api={recognizeWithRecovery,requestOptions,readDatabase,safeMessage}',scope);
  let responses=[];
  const response=(p,status=200)=>new Response(JSON.stringify(p),{status,headers:{'content-type':'application/json','x-request-id':'fixture'}});
  const run=()=>scope.api.recognizeWithRecovery({url:'https://models.test',headers:{Authorization:'Bearer secret'},body:{model:'deepseek-v4.1-flash',max_tokens:9600,...scope.api.requestOptions('deepseek-v4.1-flash',false)},requestId:uuid,validate:JSON.parse,mark(){}});
  responses=[response({choices:[{finish_reason:'length',message:{content:'{"subjects":'},}],usage:{completion_tokens:9600,completion_tokens_details:{reasoning_tokens:9600}}}),response(valid)];
  let out=await run();assert.equal(out.ok,true);assert.equal(out.attempts.length,2);assert.equal(sent[0].thinking.type,'disabled');assert.equal(sent[0].max_tokens,9600);assert.equal(sent[1].max_tokens,12800);assert.equal(out.attempts[0].reasoning_tokens,9600);
  responses=[response({error:{message:'response_format unsupported'}},400),response(valid)];out=await run();assert.equal(out.ok,true);assert.equal(sent.at(-1).response_format,undefined);assert.equal(sent.at(-1).thinking.type,'disabled');
  responses=[response({error:{message:'temporarily unavailable'}},503),response(valid)];assert.equal((await run()).ok,true);
  responses=[response({error:{message:'invalid key'}},401)];out=await run();assert.equal(out.code,'upstream_auth_failed');assert.equal(out.attempts.length,1);
  responses=[response({choices:[{finish_reason:'length',message:{content:'{"subjects":[]}'}}]})];assert.equal((await run()).ok,true);
  responses=[response({choices:[{message:{content:''}}]}),response({choices:[{message:{content:''}}]})];out=await run();assert.equal(out.code,'empty_model_output');assert.equal(out.attempts.length,2);
  let calls=0;await scope.api.readDatabase(async()=>++calls<3?{error:{code:'PGRST303',message:'JWT issued at future'}}:{data:true});assert.equal(calls,3);
  calls=0;await scope.api.readDatabase(async()=>{calls++;return {error:{code:'42501',message:'permission denied'}}});assert.equal(calls,1);
  assert(!scope.api.safeMessage('Bearer secret sk-private data:image/png;base64,AAAA').includes('private'));
  console.log('PASS: output recovery, disabled thinking, parameter compatibility, transient-only retries and JWT-specific database retry');
}
async function handlerTests(){
  const h=backendHarness();let r=await h.call({request_id:uuid,images:[image],image_stats:[{width:600,height:400}],context:{subjectNames:['数学']}}),body=await r.json();
  assert.equal(r.status,200);assert.equal(body.request_id,uuid);assert.equal(body.diagnostics.attempt_count,1);assert.equal(body.subjects[0].finalScore,128);await h.drain();
  const row=h.records.get(uuid);assert.equal(row.status,'succeeded');assert.equal(row.result.subjects[0].finalScore,128);assert(row.raw_output.includes('128'));assert.equal(row.storage_status,'complete');assert.equal(h.uploads[0].options.upsert,false);assert.equal(h.uploads[0].bytes.toString('base64'),'AAAA');assert.equal(row.image_meta[0].width,600);assert(row.diagnostics.timings.some(x=>x.phase==='auth_ok'));
  const before=h.upstream.length;r=await h.call({request_id:uuid,images:[image]});assert.equal((await r.json()).replayed,true);assert.equal(h.upstream.length,before);
  h.rows.score_tracker_users.id='00000000-0000-4000-8000-000000000002';r=await h.call({request_id:uuid,images:[image]});assert.equal(r.status,409);assert.equal(h.records.get(uuid).user_id,'00000000-0000-4000-8000-000000000001');
  const failed=backendHarness();failed.reply=[{choices:[{finish_reason:'length',message:{content:'{'}}]},valid];r=await failed.call({images:[image]});body=await r.json();assert.equal(r.status,200);assert.equal(failed.upstream.length,2);assert.equal([...failed.records.values()][0].attempts.length,2);assert.equal([...failed.records.values()][0].quota_consumed,true);
  const bad=backendHarness();bad.reply={choices:[{finish_reason:'length',message:{content:'{'}}]};r=await bad.call({images:[image]});body=await r.json();assert.equal(r.status,422);assert.equal(body.code,'model_output_truncated');assert.equal(body.quota_refunded,true);assert.equal([...bad.records.values()][0].status,'failed');assert.equal(bad.upstream.length,2);
  const ready=backendHarness();r=await ready.call({action:'connectivity_test'});assert.equal(r.status,200);assert.equal(ready.upstream.length,0);
  assert(!JSON.stringify(h.logs).includes('fixture-secret'));assert(!JSON.stringify(h.logs).includes(image));
  console.log('PASS: live handler contract, private byte-exact samples, request deduplication/ownership, failed-attempt logging, refunds and readiness without a model call');
}
async function sqlTests(){
  const db=new PGlite(),uid='00000000-0000-4000-8000-000000000001';
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text);alter table storage.objects enable row level security;
    create policy other_application_policy on storage.objects for all to anon,authenticated using(true) with check(true);
    grant usage on schema storage to anon,authenticated;grant select,insert on storage.objects to anon,authenticated;
    insert into storage.objects values('score-tracker-vision-samples'),('another-bucket');
    create table score_tracker_users(id uuid primary key,created_at timestamptz not null);
    create table score_tracker_exams(id uuid primary key,user_id uuid not null);
    create table score_tracker_scores(exam_id uuid,user_id uuid,actual_score numeric,target_score numeric);
    create table score_tracker_ai_configs(id text primary key,enabled boolean not null,daily_limit int not null,global_daily_limit int not null,cooldown_seconds int not null);
    insert into score_tracker_users values('${uid}',clock_timestamp());insert into score_tracker_ai_configs values('score_vision',true,10,100,0);`);
  for(const name of ['20260927213000_score_tracker_ai_usage_limits.sql','20261012163740_tiered_vision_quota.sql','20261013050225_vision_quota_periods.sql'])await db.exec(read('supabase/migrations/'+name));
  await db.exec(read(migration));await db.exec('grant usage on schema public to service_role;grant all on all tables in schema public to service_role');
  await db.query('insert into score_tracker_vision_requests(request_id,user_id) values($1,$2)',[uuid,uid]);
  const reserve=async()=>(await db.query('select score_tracker_vision_reserve($1,$2) as q',[uid,uuid])).rows[0].q;
  assert.equal((await reserve()).consumed,true);assert.equal((await reserve()).consumed,true);
  let usage=(await db.query('select scope,request_count from score_tracker_ai_usage order by scope')).rows;assert(usage.every(x=>x.request_count===1));
  await db.query("update score_tracker_vision_requests set status='failed',error_code='upstream_timeout',duration_ms=60000 where request_id=$1",[uuid]);
  const refund=async()=>(await db.query('select score_tracker_vision_refund($1) as refunded',[uuid])).rows[0].refunded;
  assert.equal(await refund(),true);assert.equal(await refund(),false);usage=(await db.query('select scope,request_count,last_requested_at from score_tracker_ai_usage order by scope')).rows;assert.equal(usage[0].scope,'global');assert.equal(usage[0].request_count,1);assert.equal(usage[1].request_count,0);assert(usage[1].last_requested_at);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from score_tracker_vision_requests'),/permission denied/);await assert.rejects(reserve(),/permission denied/);await assert.rejects(refund(),/permission denied/);await assert.rejects(db.query("select score_tracker_vision_summary(now()-interval '1 day')"),/permission denied/);await db.exec('reset role');}
  await db.exec('set role anon');assert.deepEqual((await db.query('select bucket_id from storage.objects')).rows.map(x=>x.bucket_id),['another-bucket']);
  await assert.rejects(db.query("insert into storage.objects values('score-tracker-vision-samples')"),/row-level security/);await db.exec('reset role');
  assert.equal((await db.query('select public from storage.buckets')).rows[0].public,false);
  await db.exec('set role service_role');const summary=(await db.query("select score_tracker_vision_summary(now()-interval '1 day') as s")).rows[0].s;assert.equal(summary.failed,1);assert.equal(summary.success_rate,0);await db.exec('reset role');await db.close();
  console.log('PASS: real Postgres migration, one reservation per request, idempotent user-only refunds, global/cooldown preservation, private bucket and service-only grants/RLS');
}
(async()=>{await upstreamTests();await handlerTests();await sqlTests()})().catch(error=>{console.error(error);process.exitCode=1});
