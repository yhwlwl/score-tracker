// Real handler + staged orchestration, with isolated model/database fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite'),{harness,input,raw,uid,stagedReply}=require('./test-paper-review.cjs');
const root=path.resolve(__dirname,'..'),secret='fixture-only-key';
function ok(options){const request=JSON.parse(options.body);return new Response(JSON.stringify({model:'deepseek-fixture',choices:[{finish_reason:'stop',message:{content:JSON.stringify(stagedReply(raw,request)),reasoning_content:'not retained'}}],usage:{prompt_tokens:300,completion_tokens:200,completion_tokens_details:{reasoning_tokens:40}}}),{headers:{'x-request-id':'model-success-123','content-type':'application/json'}});}
async function run(transport,setup=()=>{}){
 const h=harness();await h.init();h.tables.score_tracker_paper_settings[0].model='deepseek-fixture';
 h.transport=transport||((url,options)=>ok(options));setup(h);
 assert.equal((await h.call({action:'start',...input})).status,202);await h.drain();
 const row=h.tables.score_tracker_paper_reviews[0];assert(row.started_at&&row.completed_at);assert(row.duration_ms>=0);assert.equal(row.model,'deepseek-fixture');assert.equal(row.image_count,1);assert.equal(row.diagnostics.budget_per_stage_ms,125000);
 const recorded=JSON.stringify({row,logs:h.logs});assert(!recorded.includes(secret));assert(!recorded.includes('test-token'));assert(!recorded.includes(input.pages[0].url));assert(!recorded.includes('not retained'),'private reasoning is not persisted');
 const pub=(await(await h.call({action:'get',request_id:input.request_id})).json()).review;
 for(const key of ['raw_output','attempts','diagnostics','error_detail','image_meta','provider_host','analysis_state'])assert(!(key in pub),'private field excluded: '+key);
 return {h,row,pub};
}
async function outcomes(){
 let {h,row,pub}=await run();assert.equal(row.status,'succeeded');assert.equal(row.result.version,2);assert.equal(row.result.score_check.status,'matched');assert.deepEqual(row.analysis_state,{});assert.equal(pub.progress.phase,'completed');
 assert.deepEqual(row.attempts.map(a=>a.stage),['extract','verify','diagnose_0','synthesize']);assert(row.attempts.every(a=>a.thinking.type==='enabled'&&a.reasoning_tokens===40));assert.deepEqual(row.attempts.map(a=>a.reasoning_effort),['low','low','high','low']);
 assert.equal(row.attempts[0].prompt_tokens,300);assert.equal(row.upstream_status,200);assert.equal(row.error_code,null);assert(row.raw_output.includes('questions'));
 assert.equal(row.result.action_plan[0].task,row.result.questions[1].suggestion,'summary cannot invent a new mathematical instruction');assert.equal(row.result.action_plan[0].success_check,row.result.questions[1].success_check);
 const prior=JSON.stringify(row);await h.call({action:'start',...input});await h.drain();assert.equal(JSON.stringify(row),prior);assert.equal(h.upstream.length,4);
 assert.equal((await h.call({action:'continue',request_id:input.request_id,claim:crypto.randomUUID()})).status,401,'browser session cannot advance internal work');
 // Duplicate internal delivery is safe even when both handlers see the same old checkpoint.
 ({h,row}=await run(null,h=>{const original=h.scope.fetch;h.scope.fetch=async(url,options)=>{if(!url.startsWith('https://test.local/functions/'))return original(url,options);const both=await Promise.all([original(url,options),original(url,options)]);return both[0];};}));assert.equal(row.status,'succeeded');assert.equal(h.upstream.length,4);
 for(const e of [{status:401,code:'upstream_auth_failed',count:1},{status:402,code:'upstream_billing_or_model_error',count:1},{status:429,code:'upstream_rate_limited',count:2},{status:503,code:'upstream_error',count:2}]){
  ({row}=await run(()=>new Response(JSON.stringify({error:{message:'provider failure '+secret,code:'provider-code'}}),{status:e.status})));
  assert.equal(row.status,'failed');assert.equal(row.error_code,e.code);assert.equal(row.error_stage,'extract');assert.equal(row.upstream_status,e.status);assert.equal(row.attempts.length,e.count);assert(row.error_detail.includes('[hidden]'));
 }
 ({row}=await run(()=>{throw Object.assign(new Error('network '+secret),{cause:{code:'ECONNRESET'}})}));assert.equal(row.error_code,'upstream_network_error');assert.equal(row.attempts.length,2);
 ({row}=await run((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})),h=>{h.scope.setTimeout=(fn,ms)=>setTimeout(fn,Math.min(ms,5));}));assert.equal(row.error_code,'upstream_timeout');assert.equal(row.attempts.length,2);
 for(const [content,finish,code] of [['not JSON '+secret,'stop','invalid_model_output'],['{"questions":[','length','model_output_truncated'],['','stop','empty_model_output']]){
  ({row}=await run(()=>new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content}}]}))));assert.equal(row.error_code,code);assert.equal(row.error_stage,'extract');assert.equal(row.attempts.length,code==='model_output_truncated'?1:2);
 }
 ({row}=await run(()=>new Response(JSON.stringify({error:{message:'thinking parameter unsupported'}}),{status:400})));
 assert.equal(row.error_code,'reasoning_not_supported');assert.equal(row.attempts.length,1,'never silently disable reasoning');
 let interrupted=false;({h,row}=await run((url,options)=>{
  const p=JSON.parse(options.body).messages[0].content[0].text;
  if(!interrupted&&p.includes('阶段二：')){interrupted=true;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}
  return ok(options);
 },h=>{h.scope.setTimeout=(fn,ms)=>setTimeout(fn,Math.min(ms,5));}));assert.equal(row.status,'succeeded');assert(row.attempts.some(a=>a.outcome==='upstream_timeout'));assert.equal(h.tables.score_tracker_paper_reviews.length,1,'automatic smaller batches do not reserve another report');
 ({row}=await run((url,options)=>{
  const p=JSON.parse(options.body).messages[0].content[0].text;
  if(p.includes('阶段二：')&&JSON.parse(p.split('本批事实：')[1].split('\n')[0]).some(q=>q.label==='2'))return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  return ok(options);
 },h=>{h.scope.setTimeout=(fn,ms)=>setTimeout(fn,Math.min(ms,5));}));assert.equal(row.status,'succeeded');assert.equal(row.result.complete,false);assert.equal(row.result.questions[1].reference,'');assert.equal(row.result.questions[1].review_status,'unresolved');assert.equal(row.result.quality,'needs_review','one unsolved question cannot masquerade as a complete diagnosis');
 ({h,row}=await run(()=>new Response(JSON.stringify({error:{message:'temporary'}}),{status:503})));
 assert.equal((await h.call({action:'resume',...input,work_on_paper:false})).status,409,'resume must keep the original source');
 h.transport=(url,options)=>ok(options);assert.equal((await h.call({action:'resume',...input})).status,202);await h.drain();assert.equal(row.status,'succeeded');assert.equal(h.tables.score_tracker_paper_reviews.length,1);assert(row.attempts.some(a=>a.outcome==='upstream_error'),'resume retains the actual failure history');
 ({h,row}=await run(()=>new Response(JSON.stringify({error:{message:'unauthorized'}}),{status:401})));
 for(let i=0;i<2;i++){assert.equal((await h.call({action:'resume',...input})).status,202);await h.drain();assert.equal(row.status,'failed');}
 assert.equal((await h.call({action:'resume',...input})).status,409,'resume limit bounds model usage');
 let n=0;({row}=await run((url,options)=>++n===1?new Response(JSON.stringify({error:{message:'response_format unsupported'}}),{status:400}):ok(options)));
 assert.equal(row.status,'succeeded');assert.equal(row.attempts.length,5);assert(row.attempts.every(a=>a.thinking.type==='enabled'));
 ({h,row}=await run(null,h=>{let failed=false;h.fail=v=>v.status==='succeeded'&&!failed&&(failed=true);}));assert.equal(row.status,'failed');assert.equal(row.error_code,'result_save_failed');assert.equal(row.error_stage,'result_save');assert(!row.diagnostics.phases.some(p=>p.phase==='succeeded'));
 ({h,row}=await run());row.status='running';row.created_at=new Date(Date.now()-1000000).toISOString();row.progress.updated_at=new Date().toISOString();await h.call({action:'get',request_id:input.request_id});assert.equal(row.status,'running','fresh progress survives long overall processing');
 row.progress.updated_at=new Date(Date.now()-241000).toISOString();await h.call({action:'get',request_id:input.request_id});assert.equal(row.error_code,'analysis_incomplete');
 console.log('PASS: staged reasoning, idempotent continuation, score alignment, private state, auth/network/timeout/retry/truncation/format errors, save failure and heartbeat expiry');
}
async function evidenceRules(){
 const h=harness();await h.init();const evaluate=expression=>vm.runInContext(expression,h.scope);
 h.scope.sampleInput={...input,pages:[{role:'paper',page:1,url:input.pages[0].url}]};
 h.scope.sampleFacts={complete:true,total:{score:5,max:10,score_mark:{page:1,quote:'总分5'},max_mark:{page:1,quote:'满分10'}},questions:[{label:'1',stem:'阅读材料后回答',pages:[1],work_pages:[1],answer:'已有论点但未引用材料',teacher_score:5,max_score:10,score_mark:{page:1,quote:'5分',scope:'question',label:'1'},max_mark:{page:1,quote:'10分'}}]};
 let facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');assert.equal(facts.score_check.status,'matched');assert.equal(facts.questions[0].teacher_score,5);
 h.scope.sampleFacts.questions[0].score_mark.scope='subpart';facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');assert.equal(facts.questions[0].teacher_score,null,'aggregate marks cannot be reassigned to a subpart');
 h.scope.sampleFacts.questions[0].score_mark={page:1,quote:'未标，按0分计',scope:'question',label:'1'};h.scope.sampleFacts.questions[0].teacher_score=0;facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');assert.equal(facts.questions[0].teacher_score,null);
 h.scope.sampleFacts.questions[0].score_mark={page:1,quote:'7分',scope:'question',label:'1'};h.scope.sampleFacts.questions[0].teacher_score=7;facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');assert.equal(facts.score_check.status,'conflict');
 h.scope.sampleFacts.questions[0].max_score=6;h.scope.sampleFacts.questions[0].max_mark={page:1,quote:'每空2分，本部分共14分',unit_score:2,unit_labels:['a','b','c']};facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');assert.equal(facts.questions[0].max_score,6,'explicit per-blank rule can establish a question total');
 h.scope.sampleFacts.questions[0].max_score=7;facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');assert.equal(facts.questions[0].max_score,null,'arithmetic evidence must match');
 h.scope.sampleFacts.questions[0].max_score=10;h.scope.sampleFacts.questions[0].max_mark={page:1,quote:'10分'};facts=evaluate('normalizeEvidence(sampleFacts,sampleInput)');
 h.scope.evidence=facts;h.scope.finalRaw={overview:'材料论证需要核对',strengths:[],questions:[{label:'1',reference:'结合材料给出论据',correct_steps:['已有论点'],first_issue:{certainty:'confirmed',observed:'没有材料依据'},review_status:'reviewed'}],action_plan:[{title:'补论据',questions:['1'],task:'引用材料并解释对应关系',success_check:'每个论点有材料支撑'}]};
 let result=evaluate('assembleReport(finalRaw,evidence,sampleInput)');assert.equal(result.questions[0].teacher_score,null);assert.equal(result.quality,'needs_review');
 assert.equal(result.questions[0].first_issue.certainty,'uncertain','a fabricated quotation is never a confirmed first error');
 h.scope.independent={questions:[{label:'1',kind:'written',teacher_score:5,score_mark:{page:1,quote:'5分',scope:'question',label:'1',location:'第1页第1题旁'}}]};
 const reconciled=evaluate('reconcileEvidence(independent,evidence,sampleInput)');assert.equal(reconciled.evidence.questions[0].teacher_score,null,'disagreeing individual marks remain unknown even when sums could match');
 h.scope.sampleFacts.total.score=10;h.scope.sampleFacts.questions[0].teacher_score=10;h.scope.sampleFacts.questions[0].score_mark.quote='10分';h.scope.sampleFacts.total.score_mark.quote='总分10';h.scope.evidence=evaluate('normalizeEvidence(sampleFacts,sampleInput)');
 result=evaluate('assembleReport(finalRaw,evidence,sampleInput)');assert.equal(result.questions[0].review_status,'teacher_conflict');assert.equal(result.action_plan.length,0,'full-mark conflict is not a remediation priority');
 h.scope.sampleInput.work_on_paper=false;h.scope.evidence=evaluate('normalizeEvidence(sampleFacts,sampleInput)');result=evaluate('assembleReport(finalRaw,evidence,sampleInput)');assert.equal(result.action_plan.length,0);assert.equal(result.strengths.length,0);assert.equal(result.questions[0].correct_steps.length,0);assert.equal(result.questions[0].teacher_score,null);
 h.scope.sampleInput.work_on_paper=true;h.scope.sampleInput.pages.push({role:'reference',page:2,url:input.pages[0].url});h.scope.sampleFacts.questions[0].status='answered';h.scope.sampleFacts.questions[0].provided_reference='引用材料给2分，解释联系给3分';h.scope.sampleFacts.questions[0].reference_pages=[2];h.scope.evidence=evaluate('normalizeEvidence(sampleFacts,sampleInput)');h.scope.finalRaw.questions[0].estimated_score=3;h.scope.finalRaw.questions[0].estimate_evidence={quote:'解释联系给3分',pages:[2]};result=evaluate('assembleReport(finalRaw,evidence,sampleInput)');assert.equal(result.questions[0].estimated_score,3);assert.equal(result.questions[0].teacher_score,10,'rubric-based AI estimate is separate from the observed teacher mark');h.scope.finalRaw.questions[0].estimate_evidence.quote='相似度给3分';result=evaluate('assembleReport(finalRaw,evidence,sampleInput)');assert.equal(result.questions[0].estimated_score,null,'invented rubric text cannot justify an estimate');
 console.log('PASS: generic humanities evidence, no guessed zeros, no score splitting, total conflicts, full-mark protection and paper-only boundaries');
}
async function migration(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create table score_tracker_paper_reviews(request_id uuid primary key,user_id uuid,status text,result jsonb);alter table score_tracker_paper_reviews enable row level security;revoke all on score_tracker_paper_reviews from public,anon,authenticated;grant select,insert,update,delete on score_tracker_paper_reviews to service_role;insert into score_tracker_paper_reviews values('${input.request_id}','${uid}','failed',null);`);
 for(const suffix of ['_paper_review_diagnostics.sql','_paper_review_staged_analysis.sql']){const f=fs.readdirSync(path.join(root,'supabase/migrations')).find(f=>f.endsWith(suffix)),sql=fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8');await db.exec(sql);await db.exec(sql);}
 const old=(await db.query('select status,error_code,attempts,analysis_state,progress from score_tracker_paper_reviews')).rows[0];assert.equal(old.status,'failed');assert.equal(old.error_code,null);assert.deepEqual(old.analysis_state,{});assert.deepEqual(old.progress,{});
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select analysis_state,raw_output from score_tracker_paper_reviews'));await db.exec('reset role');}
 await db.close();console.log('PASS: additive migrations, existing records, repeat application, server-only checkpoints and RLS');
}
(async()=>{await outcomes();await evidenceRules();await migration()})().catch(e=>{console.error(e);process.exitCode=1});
