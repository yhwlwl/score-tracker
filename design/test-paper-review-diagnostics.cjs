// Uses the real Edge handler and recovery helper with isolated fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite'),{harness,input,raw,uid,rid}=require('./test-paper-review.cjs');
const root=path.resolve(__dirname,'..'),secret='fixture-only-key';
const ok=()=>new Response(JSON.stringify({model:'fixture-vision',choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}],usage:{prompt_tokens:300,completion_tokens:200}}),{headers:{'x-request-id':'model-success-123','content-type':'application/json'}});
async function run(transport,setup=()=>{}){
  const h=harness();await h.init();if(transport)h.transport=transport;setup(h);
  assert.equal((await h.call({action:'start',...input})).status,202);await h.drain();
  const row=h.tables.score_tracker_paper_reviews[0];
  assert.equal(row.request_id,input.request_id);assert(row.started_at&&row.completed_at);assert(row.duration_ms>=0);
  assert.equal(row.model,'test-vision');assert.equal(row.provider_host,'model.test');assert.equal(row.image_count,1);
  assert.equal(row.image_bytes,Buffer.from(input.pages[0].url.split(',')[1],'base64').length);
  assert.equal(row.image_meta[0].role,'paper');assert.equal(row.diagnostics.budget_ms,90000);
  const recorded=JSON.stringify({row,logs:h.logs});assert(!recorded.includes(secret),'provider key is redacted');assert(!recorded.includes('test-token'),'session token is not logged');assert(!recorded.includes(input.pages[0].url),'image base64 is not persisted');
  const pub=(await(await h.call({action:'get',request_id:input.request_id})).json()).review;
  for(const key of ['raw_output','attempts','diagnostics','error_detail','image_meta','provider_host'])assert(!(key in pub),'private field excluded: '+key);
  return {h,row,pub};
}
async function outcomes(){
  let {h,row}=await run(()=>ok());
  assert.equal(row.status,'succeeded');assert.equal(row.attempts.length,1);assert.equal(row.attempts[0].prompt_tokens,300);assert.equal(row.attempts[0].completion_tokens,200);assert.equal(row.attempts[0].upstream_request_id,'model-success-123');assert.equal(row.upstream_status,200);assert.equal(row.error_code,null);assert(row.raw_output.includes('questions'));
  const prior=JSON.stringify(row);await h.call({action:'start',...input});await h.drain();assert.equal(JSON.stringify(row),prior,'duplicate start preserves original audit');assert.equal(h.upstream.length,1);
  const errors=[{status:401,code:'upstream_auth_failed',attempts:1},{status:402,code:'upstream_billing_or_model_error',attempts:1},{status:429,code:'upstream_rate_limited',attempts:2},{status:503,code:'upstream_error',attempts:2}];
  for(const e of errors){
    ({row}=await run(()=>new Response(JSON.stringify({error:{message:'provider failure '+secret,code:'provider-code'}}),{status:e.status,headers:{'x-request-id':'provider-request-'+e.status}})));
    assert.equal(row.status,'failed');assert.equal(row.error_code,e.code);assert.equal(row.error_stage,'upstream');assert.equal(row.upstream_status,e.status);assert.equal(row.attempts.length,e.attempts);assert.equal(row.attempts[0].upstream_error_code,'provider-code');assert(row.error_detail.includes('[hidden]'));assert(!row.error_message.includes('拍清'));
  }
  ({row}=await run(()=>{throw Object.assign(new Error('network failure '+secret),{cause:{code:'ECONNRESET'}})}));
  assert.equal(row.error_code,'upstream_network_error');assert.equal(row.attempts.length,2);assert.equal(row.attempts[0].network_code,'ECONNRESET');assert(row.error_message.includes('网络中断'));
  ({row}=await run((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})),h=>{
    vm.runInContext('const recoverForTest=recognizeWithRecovery;recognizeWithRecovery=options=>recoverForTest({...options,budgetMs:1000,attemptTimeoutMs:5});',h.scope);
  }));
  assert.equal(row.error_code,'upstream_timeout');assert.equal(row.attempts.length,2);assert(row.attempts.every(a=>a.outcome==='upstream_timeout'));assert(row.error_message.includes('超时'));
  for(const [content,finish,code] of [['not JSON '+secret,'stop','invalid_model_output'],['{"questions":[','length','model_output_truncated'],['','stop','empty_model_output']]){
    ({row}=await run(()=>new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content}}]}))));
    assert.equal(row.error_code,code);assert.equal(row.error_stage,'output_validation');assert.equal(row.attempts.length,2);assert.equal(row.upstream_status,200);
    if(content)assert(row.raw_output);if(code==='invalid_model_output')assert(row.attempts[0].parse_error);
  }
  ({row}=await run(()=>new Response('<html>provider unavailable '+secret+'</html>',{headers:{'content-type':'text/html'}})));
  assert.equal(row.error_code,'invalid_upstream_response');assert(row.attempts[0].upstream_message.includes('[hidden]'));
  let n=0;({row}=await run(()=>++n===1?new Response(JSON.stringify({error:{message:'busy'}}),{status:503}):ok()));
  assert.equal(row.status,'succeeded');assert.equal(row.attempts.length,2);assert.equal(row.attempts[0].outcome,'upstream_error');assert.equal(row.attempts[1].outcome,'succeeded');assert.equal(row.diagnostics.last_stage,'succeeded');
  ({h,row}=await run(()=>ok(),h=>{let failed=false;h.fail=v=>v.status==='succeeded'&&!failed&&(failed=true);}));
  assert.equal(row.status,'failed');assert.equal(row.error_code,'result_save_failed');assert.equal(row.error_stage,'result_save');assert(row.diagnostics.audit_write_errors.some(e=>e.stage==='finish'));assert(!h.logs.some(a=>a[0]==='paper_review_event'&&JSON.parse(a[1]).event==='succeeded'),'never log success before the result is saved');
  assert(!row.diagnostics.phases.some(p=>p.phase==='succeeded'),'failed save does not invent a success checkpoint');
  ({row}=await run(()=>ok(),h=>{let failed=false;h.fail=v=>!v.status&&!failed&&(failed=true);}));
  assert.equal(row.status,'succeeded','audit checkpoint failure does not discard valid model results');assert.equal(row.diagnostics.audit_write_errors.length,1);
  ({h,row}=await run(()=>ok()));row.status='running';row.created_at=new Date(Date.now()-181000).toISOString();
  const savedAttempts=JSON.stringify(row.attempts);const r=await h.call({action:'get',request_id:input.request_id});assert.equal(r.status,200);assert.equal(row.error_code,'analysis_incomplete');assert.equal(row.error_stage,'background');assert.equal(JSON.stringify(row.attempts),savedAttempts,'stale recovery preserves evidence');
  console.log('PASS: success/retry/timeout/network/401/402/429/503/truncation/invalid JSON/empty response/save failure/stale worker; private fields, redaction and duplicate audit preservation');
}
async function migration(){
  const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create table score_tracker_paper_reviews(request_id uuid primary key,user_id uuid,status text,result jsonb);alter table score_tracker_paper_reviews enable row level security;revoke all on score_tracker_paper_reviews from public,anon,authenticated;grant select,insert,update,delete on score_tracker_paper_reviews to service_role;insert into score_tracker_paper_reviews values('${input.request_id}','${uid}','failed',null);`);
  const f=fs.readdirSync(path.join(root,'supabase/migrations')).find(f=>f.endsWith('_paper_review_diagnostics.sql')),sql=fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8');
  await db.exec(sql);await db.exec(sql);
  const old=(await db.query('select status,error_code,error_detail,attempts,diagnostics from score_tracker_paper_reviews')).rows[0];assert.equal(old.status,'failed');assert.equal(old.error_code,null,'historical unknown error is not fabricated');assert.equal(old.error_detail,null);assert.deepEqual(old.attempts,[]);assert.deepEqual(old.diagnostics,{});
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select raw_output,error_detail from score_tracker_paper_reviews'));await db.exec('reset role')}
  await db.exec('set role service_role');await db.query('update score_tracker_paper_reviews set error_code=$1,attempts=$2::jsonb where request_id=$3',['fixture_timeout','[{"attempt":1}]',input.request_id]);await db.exec('reset role');
  await db.close();console.log('PASS: additive diagnostic migration, existing reports, repeat application and server-only column access');
}
(async()=>{await outcomes();await migration()})().catch(e=>{console.error(e);process.exitCode=1});
