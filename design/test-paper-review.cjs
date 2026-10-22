// NODE_PATH=<directory containing jsdom and @electric-sql/pglite> node design/test-paper-review.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { JSDOM, VirtualConsole } = require('jsdom');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file), 'utf8');
const code = file => stripTypeScriptTypes(read(file).replace(/^import[^\n]*\n/gm, '').replace(/^export /gm, ''));
const tick = () => new Promise(r => setTimeout(r, 30));
const uid = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
const examId = '00000000-0000-4000-8000-000000000003', draftId = '00000000-0000-4000-8000-000000000004';
const rid = '00000000-0000-4000-8000-000000000005';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
const input = { request_id: rid, draft_id: draftId, subject: '数学', consent: true, work_on_paper: true, pages: [{ role: 'paper', url: png }] };
const raw = { complete: true, coverage: '第1页的两道题', overview: '第2题符号转换需要核对。', strengths: ['第1题计算正确'], priorities: ['重新写出第2题的移项步骤'], warnings: [], questions: [
  { label: '1', stem: '1 + 1 = ?', pages: [1], answer: '2', reference: '2', max_score: 5, teacher_score: 5, estimated_score: 5, score_evidence: '第1页右侧批改5分', knowledge: ['运算'], status: 'answered', confidence: 'high', loss_reason: '未见失分', suggestion: '保持验算' },
  { label: '2', stem: '解方程 x + 2 = 5', pages: [1], answer: 'x = 7', reference: 'x = 3', max_score: 5, teacher_score: 0, estimated_score: 0, score_evidence: '第1页第2题批改0分', knowledge: ['方程'], status: 'answered', confidence: 'medium', loss_reason: '移项时符号未变', evidence: 'x=5+2', suggestion: '在等号两边同时减去2' },
] };
function facts(reply) {
  return {...reply,total:{score:5,max:10,score_mark:{page:1,quote:'总分5分'},max_mark:{page:1,quote:'满分10分'}},questions:reply.questions.map(q=>({...q,work_pages:[1],subparts:[],score_mark:q.score_evidence?{page:1,quote:q.score_evidence,scope:'question',label:q.label}:null,max_mark:{page:1,quote:'本题'+q.max_score+'分'}}))};
}
function diagnosis(q) {
  return {...q,wins:[{skill:'已正确识别本题运算',observed:q.answer,basis:'work',significance:'保留已经写出的等式关系'}],difficulty:{overall:2,evidence_quote:q.stem.slice(0,5),reason:'常规等式运算',dimensions:{thinking:{score:2,reason:'需要等式变形'},calculation:{score:1,reason:'简单整数运算'}}},cause_analysis:{observation:'答案与等式不对应',hypotheses:[{kind:'execution',explanation:'可能是等式变形时执行失误',evidence:q.answer,counter_evidence:'仅凭答案不能确认当时思路',check:'不看答案口述第一步，再独立计算',if_confirmed:'保留等式两边同一运算并分步检查'}]},correct_steps:q.label==='1'?['1+1=2']:[],first_issue:{location:'移项',observed:q.answer,explanation:q.loss_reason,correction:q.suggestion,certainty:q.label==='1'?'none':'confirmed'},transfer_rule:'等式两边进行同一运算',practice:'解x+3=8',practice_answer:'x=5',success_check:'能在两边同时减3',review_status:'reviewed'};
}
function stagedReply(reply,request) {
  const p=request.messages[0].content[0].text;
  if(p.includes('阶段一：'))return facts(reply);
  if(p.includes('识别作答：'))return facts(reply);
  if(p.includes('阶段二：')){const batch=JSON.parse(p.split('本批事实：')[1].split('\n')[0]);return {questions:batch.map(b=>diagnosis(reply.questions.find(q=>q.label===b.label)))};}
  if(p.includes('独立资料复核：')){const labels=JSON.parse(p.split('题目身份：')[1].split('\n')[0]).map(q=>q.label);return {questions:reply.questions.filter(q=>labels.includes(q.label)).map(q=>({label:q.label,kind:'written',answer:'',teacher_score:q.teacher_score,score_mark:{page:1,quote:q.score_evidence,scope:'question',label:q.label,location:'第1页对应题号旁'}}))};}
  return {...reply,question_updates:[],action_plan:[{title:'修正等式变形',questions:['2'],reason:'已有具体符号错误',task:'两边同时减去2后独立重做',success_check:'不看答案解出相似方程'}]};
}
function harness() {
  let handler, modelReply = raw, failWrites = false, transport = null;
  const tables = { score_tracker_users: [{ id: uid, session_token_hash: '', session_expires_at: '2099-01-01' }], score_tracker_paper_settings: [{ id: 'default', enabled: true, api_key: 'fixture-only-key', base_url: 'https://model.test/v1', model: 'test-vision' }], score_tracker_paper_reviews: [], score_tracker_exams: [{ id: examId, user_id: uid }], score_tracker_scores: [{ id: 's1', exam_id: examId, user_id: uid, subject: '数学' }] };
  const calls = [], writes = [], background = [], upstream = [], logs = [];
  const blobs = new Map();
  const db = { storage: { from() { return { async upload(path,bytes){blobs.set(path,bytes);return {data:{path}}},async download(path){return blobs.has(path)?{data:new Blob([blobs.get(path)])}:{error:'missing'}},async remove(paths){paths.forEach(p=>blobs.delete(p));return {data:[]}},async createSignedUrls(paths){return {data:paths.map(path=>({signedUrl:'https://scan.test/'+path}))}} } } }, from(table) {
    let offset = 0, filters = [], action = 'select', value, single = false, sort, maximum, columns;
    const q = { range(a,b) {offset=a;maximum=b-a+1;return q;}, insert(v) {action='insert';value=v;return q;}, upsert(v) {action='upsert';value=v;return q;}, select(fields) { columns=fields;return q; }, eq(k,v) { filters.push(r=>k.includes('->>')?r[k.split('->>')[0]]?.[k.split('->>')[1]]===v:r[k]===v); return q; }, is(k,v) { filters.push(r=>(r[k]??null)===v);return q; }, in(k,v) { filters.push(r=>v.includes(r[k]));return q; },
      or(scope) { filters.push(r=>scope.split(',').some(term=>{const [key,op,...rest]=term.split('.'),value=rest.join('.');return op==='is'&&value==='null'?r[key]==null:op==='eq'&&r[key]===value;}));return q; }, order(k) { sort=k;return q; }, limit(n) { maximum=n;return q; }, update(v) { action='update';value=v;return q; }, delete() { action='delete';return q; }, single() { single=true;return run(); }, maybeSingle() { single=true;return run(); }, then(a,b) { return run().then(a,b); } };
    async function run() {
      let found = (tables[table] || []).filter(r=>filters.every(f=>f(r)));
      calls.push(table);
      if (action !== 'select') { writes.push(table); if(failWrites===true || typeof failWrites==='function'&&failWrites(value))return {error:{code:'fixture_database_error',message:'fixture database error fixture-only-key'}}; }
      if(action==='insert'||action==='upsert'){tables[table] ||= []; if(action==='insert' && tables[table].some(r=>r.request_id===value.request_id))return {error:{code:'23505'}};const old=action==='upsert'&&tables[table].find(r=>r.user_id===value.user_id);if(old)Object.assign(old,structuredClone(value));else tables[table].push({revision:0,regions:{},created_at:new Date().toISOString(),...structuredClone(value)});found=[old||tables[table].at(-1)];}
      if(action==='update')found.forEach(r=>Object.assign(r, structuredClone(value)));
      if(action==='delete')tables[table]=tables[table].filter(r=>!found.includes(r));
      if(sort)found.sort((a,b)=>String(b[sort]).localeCompare(String(a[sort])));
      if(maximum)found=found.slice(offset,offset+maximum);
      if(columns&&columns!=='*')found=found.map(r=>Object.fromEntries(columns.split(',').filter(k=>k in r).map(k=>[k,r[k]])));
      return { data: structuredClone(single ? found[0] || null : found), error: null };
    } return q;
  }, async rpc(name, p) {
    calls.push(name);
    const quota = { enabled: true, limit: 3, used: tables.score_tracker_paper_reviews.length, remaining: 3-tables.score_tracker_paper_reviews.length, global_available: true };
    if(name==='score_tracker_paper_quota')return {data:quota};
    assert.equal(name,'score_tracker_paper_reserve');
    const previous=tables.score_tracker_paper_reviews.find(r=>r.request_id===p.p_request_id);
    if(previous)return {data: previous.user_id===p.p_user_id&&previous.fingerprint===p.p_fingerprint?{allowed:true,created:false,quota}:{allowed:false,reason:'conflict',message:'conflict'}};
    tables.score_tracker_paper_reviews.push({request_id:p.p_request_id,user_id:p.p_user_id,draft_id:p.p_draft_id,exam_id:p.p_exam_id,subject:p.p_subject,fingerprint:p.p_fingerprint,status:'running',created_at:new Date().toISOString(),corrections:[],revision:0});
    return {data:{allowed:true,created:true,quota}};
  } };
  const scope = { createClient:()=>db, Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://test.local':k==='SUPABASE_SERVICE_ROLE_KEY'?'fixture-service-key':''},serve:fn=>handler=fn}, EdgeRuntime:{waitUntil:p=>background.push(p)}, crypto, structuredClone, TextEncoder, TextDecoder, Uint8Array, URL, Request, Response, Blob, btoa, Date, AbortController, setTimeout, clearTimeout, atob,
    console:{log(...args){logs.push(args)},error(...args){logs.push(args)},warn(...args){logs.push(args)}},
    fetch:async(url,options)=>{if(url.startsWith('https://test.local/functions/'))return handler(new Request(url,options));const request=JSON.parse(options.body);upstream.push(request);return transport?transport(url,options):new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(stagedReply(modelReply,request))}}]}));} };
  vm.createContext(scope);
  ['supabase/functions/score-tracker-vision-preview/reliability.ts','supabase/functions/score-tracker-paper-review/options.ts','supabase/functions/score-tracker-paper-review/model.ts','supabase/functions/score-tracker-paper-review/learner.ts','supabase/functions/score-tracker-paper-review/analysis.ts','supabase/functions/score-tracker-paper-review/reading.ts','supabase/functions/score-tracker-paper-review/runtime.ts','supabase/functions/score-tracker-paper-review/audit.ts','supabase/functions/score-tracker-paper-review/pipeline.ts','supabase/functions/score-tracker-paper-review/workspace.ts','supabase/functions/score-tracker-paper-review/index.ts'].forEach(f=>vm.runInContext(code(f),scope));
  return { scope, blobs, tables, calls, writes, upstream, background, logs, set transport(v){transport=v},set reply(v){modelReply=v}, set fail(v){failWrites=v}, async init(){tables.score_tracker_users[0].session_token_hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('test-token'))).toString('hex')},
    call:body=>handler(new Request('https://test.local/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'test-token',...body})})), handler, drain:async()=>{for(let i=0;i<background.length;i++)await background[i]} };
}
async function backend() {
  const h=harness();await h.init();
  assert.equal((await h.call({action:'quota',token:'bad'})).status,401);
  assert.equal((await h.call({action:'start',...input,consent:false})).status,400);
  assert.equal((await h.call({action:'start',...input,pages:[{role:'paper',url:'https://internal.test/image'}]})).status,400);
  assert.equal((await h.call({action:'start',...input,pages:[{role:'paper',url:'data:image/png;base64,YWJjZA=='}]})).status,400);
  assert.equal((await h.call({action:'start',...input,exam_id:other})).status,404);
  assert.equal((await h.call({action:'start',...input})).status,202);await h.drain();
  let r=await h.call({action:'get',request_id:rid}),report=(await r.json()).review;
  assert.equal(report.status,'succeeded');assert.equal(report.result.questions[1].teacher_score,0);
  assert.equal((await h.call({action:'start',...input})).status,202);assert.equal(h.upstream.length,6,'idempotent start does not restart the staged analysis');
  assert.equal((await h.call({action:'start',...input,subject:'历史'})).status,409);
  const corrections=[{id:'1',teacher_score:5,max_score:5,answer:'2',verified:true,corrected:false},{id:'2',teacher_score:0,max_score:5,answer:'7',verified:true,corrected:true}];
  assert.equal((await h.call({action:'correct',request_id:rid,revision:0,corrections:[{...corrections[0],teacher_score:9}]})).status,400);
  r=await h.call({action:'correct',request_id:rid,revision:0,corrections});assert.equal(r.status,200);report=(await r.json()).review;
  assert.equal(report.revision,1);assert.equal(report.result.questions[1].answer,'x = 7','original model evidence retained');
  assert.equal((await h.call({action:'correct',request_id:rid,revision:0,corrections})).status,409);
  assert.equal((await h.call({action:'attach',draft_id:draftId,exam_id:other})).status,404);
  assert.equal((await h.call({action:'attach',draft_id:draftId,exam_id:examId})).status,200);
  assert.equal(h.tables.score_tracker_paper_reviews[0].exam_id,examId);
  h.tables.score_tracker_paper_reviews[0].user_id=other;
  for(const action of ['get','correct','delete'])assert.equal((await h.call({action,request_id:rid})).status,404,'cross-owner '+action);
  h.tables.score_tracker_paper_reviews[0].user_id=uid;
  assert.equal((await h.call({action:'delete',request_id:rid})).status,200);
  assert.equal(h.tables.score_tracker_paper_reviews.length,0);
  assert(h.writes.every(n=>n==='score_tracker_paper_reviews'),'no writes to scores, old configs, auth or vision usage');
  assert(!h.calls.includes('score_tracker_vision_quota'));
  const paperOnly=h.scope.normalizeReport(raw,{...input,work_on_paper:false});
  assert.equal(paperOnly.questions[0].teacher_score,null);assert.equal(paperOnly.questions[0].estimated_score,null);assert.equal(paperOnly.priorities.length,0);
  assert.equal(h.scope.normalizeReport({...raw,questions:[{...raw.questions[0],teacher_score:99}]},input).questions[0].teacher_score,null);
  assert.equal(h.scope.normalizeReport({...raw,questions:[{...raw.questions[0],score_evidence:''}]},input).questions[0].teacher_score,null);
  assert.equal(h.scope.normalizeReport({...raw,questions:[{...raw.questions[0],teacher_score:'0'}]},input).questions[0].teacher_score,null);
  console.log('PASS: actual Edge handler, auth/ownership, image validation, idempotency, score evidence, paper-only mode, correction conflicts, deletion and legacy isolation');
  return report;
}
async function migration() {
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create table score_tracker_users(id uuid primary key);create table score_tracker_exams(id uuid primary key,user_id uuid);create table score_tracker_ai_configs(id text primary key,enabled boolean,openrouter_api_key text,base_url text,model text);insert into score_tracker_users values('${uid}'),('${other}');insert into score_tracker_exams values('${examId}','${uid}');insert into score_tracker_ai_configs values('score_vision',true,'fixture','https://model.test/v1','fixture');`);
  const file=fs.readdirSync(path.join(root,'supabase/migrations')).find(f=>f.endsWith('_paper_review_beta.sql'));
  await db.exec(read('supabase/migrations/'+file));
  const call=async(id,user=uid,fingerprint='same')=>(await db.query('select score_tracker_paper_reserve($1,$2,$3,null,$4,$5) q',[user,id,draftId,'数学',fingerprint])).rows[0].q;
  let q=await call(rid);assert.equal(q.created,true);assert.equal(q.quota.used,1);
  q=await call(rid);assert.equal(q.created,false);
  assert.equal((await call(rid,other)).reason,'conflict');
  assert.equal((await call(crypto.randomUUID())).reason,'cooldown');
  await db.exec('update score_tracker_paper_settings set cooldown_seconds=0');
  assert.equal((await call(crypto.randomUUID())).created,true);assert.equal((await call(crypto.randomUUID())).created,true);
  assert.equal((await call(crypto.randomUUID())).reason,'user_limit');
  await db.exec(`delete from score_tracker_paper_reviews where user_id='${uid}'`);
  assert.equal((await call(crypto.randomUUID())).reason,'user_limit','deletion does not reset quota');
  await db.exec('update score_tracker_paper_settings set global_daily_limit=3');
  assert.equal((await call(crypto.randomUUID(),other)).reason,'global_limit');
  const old=(await db.query("select * from score_tracker_ai_configs where id='score_vision'")).rows[0];assert.equal(old.model,'fixture');assert.equal(old.enabled,true);
  for(const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    await assert.rejects(()=>db.query('select * from public.score_tracker_paper_reviews'));
    await assert.rejects(()=>db.query('select score_tracker_paper_quota($1)',[uid]));
    await db.exec('reset role');
  }
  const rls=(await db.query("select relname,relrowsecurity from pg_class where relname in ('score_tracker_paper_reviews','score_tracker_paper_settings','score_tracker_paper_usage')")).rows;assert(rls.every(r=>r.relrowsecurity));
  await db.exec('create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  const workspaceFile=fs.readdirSync(path.join(root,'supabase/migrations')).find(f=>f.endsWith('_paper_workspace.sql'));
  await db.exec(read('supabase/migrations/'+workspaceFile));
  const bucket=(await db.query("select * from storage.buckets where id='score-tracker-paper-scans'")).rows[0];assert.equal(bucket.public,false);
  for(const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    await assert.rejects(()=>db.query('select * from score_tracker_paper_materials'));
    await assert.rejects(()=>db.query('select * from score_tracker_paper_preferences'));
    await db.exec('reset role');
  }
  await db.exec(`insert into score_tracker_paper_reviews(request_id,user_id,draft_id,exam_id,subject,fingerprint,status) values('${rid}','${uid}','${draftId}','${examId}','数学','fixture','paused');delete from score_tracker_exams where id='${examId}';`);
  assert.equal((await db.query('select exam_id from score_tracker_paper_reviews where request_id=$1',[rid])).rows[0].exam_id,null,'exam deletion preserves reports and unlinks them');
  await db.close();console.log('PASS: PostgreSQL migration, independent ledgers, duplicate reservation, personal/global caps, cooldown, delete-resistant quota, RLS and denied public RPC access');
}
async function ui(report) {
  const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
  const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://test.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.setInterval=()=>1;w.confirm=()=>true;w.AbortController=AbortController;
  let savedReport=structuredClone(report), failAttach=false, startAttempts=0;
  w.fetch=async(url,options)=>{
    const body=JSON.parse(options?.body||'{}');calls.push({url:String(url),...body});let data={ok:true};
    if(String(url).includes('paper-review')) {
      if(body.action==='quota')data={quota:{enabled:true,limit:3,remaining:3,global_available:true}};
      if(body.action==='list')data={reviews:[savedReport]};
      if(body.action==='start') {
        startAttempts++;
        if(startAttempts===1)throw new TypeError('fixture network interruption before reservation');
        savedReport.request_id=body.request_id;data={request_id:body.request_id,quota:{enabled:true,limit:3,remaining:2,global_available:true}};
      }
      if(body.action==='get'){
        if(body.request_id!==savedReport.request_id)return new Response(JSON.stringify({error:'not found'}),{status:404});
        data={review:savedReport};
      }
      if(body.action==='correct'){savedReport={...savedReport,corrections:body.corrections,revision:savedReport.revision+1};data={review:savedReport};}
      if(body.action==='attach'&&failAttach)return new Response(JSON.stringify({error:'attach failed'}),{status:503});
    } else if(body.action==='save_exam')data={ok:true,id:examId,created:true};
    else if(body.action==='list_modules')data={modules:[]};
    else if(['bootstrap','list_exams'].includes(body.action))data={user:{id:uid,username:'fixture'},subjects:[{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}],modules:[],exams:[],participantDefaults:{},classification:{label:'年级',options:['高二']}};
    return new Response(JSON.stringify(data));
  };
  w.eval(read('app-bundle.js')+'\nwindow.state=state;');w.ScorePaperHub=undefined; // Legacy mount remains supported; workspace navigation is tested separately.
for(const f of ['app-v36.js','app-v37.js','app-v38.js'])w.eval(read(f));await tick();
  Object.assign(w.state,{user:{id:uid,username:'fixture'},token:'test-token',subjectConfigs:[{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}],modulesV18:[],allExams:[],exams:[],page:'home'});w.applyExamSubjectsV10([],w.state.subjectConfigs);
  w.openExam();await tick();let modal=w.state.modal;
  assert.equal(modal.querySelectorAll('.pr-entry').length,2);assert.equal(calls.filter(c=>c.url.includes('paper-review')).length,0,'no feature requests until entry is used');
  modal.querySelector('#examName').value='普通考试';modal.querySelector('.actual-v16').value='100';await w.saveExam(null,modal);await tick();
  assert.equal(calls.filter(c=>c.url.includes('paper-review')).length,0,'ordinary save untouched');
  w.openExam();modal=w.state.modal;modal.querySelector('.actual-v16').value='88';modal.querySelector('.pr-entry').click();await tick();await tick();
  let dialog=d.querySelector('.pr-dialog');assert(dialog);assert.equal(w.state.modal,modal,'nested view preserves the exam editor');
  assert.equal(dialog.querySelectorAll('input[type=file]').length,3);assert(!dialog.textContent.includes('fixture-only-key'));
  modal._paperReview.sessions['数学'].pages=[{role:'paper',url:png,name:'fixture.png'}];
  dialog.querySelector('#pr-consent').checked=true;dialog.querySelector('#pr-consent').dispatchEvent(new w.Event('change',{bubbles:true}));
  dialog.querySelector('[data-pr=start]').click();await tick();await tick();assert(dialog.querySelector('[data-pr=start]').textContent.includes('继续确认'));
  dialog.querySelector('[data-pr=start]').click();await tick();await tick();
  const starts=calls.filter(c=>c.action==='start');assert.equal(starts[0].exam_context.score,88,'current draft numeric context is included');assert.equal(starts.length,2);assert.equal(starts[0].request_id,starts[1].request_id,'ambiguous network failure preserves request id and payload');
  dialog.querySelector('[data-pr=history]').click();await tick();dialog.querySelector('[data-pr^="report:"]').click();await tick();
  assert.equal(dialog.querySelectorAll('.pr-question').length,2);assert(dialog.querySelector('.pr-wins'));assert(dialog.querySelector('.pr-wins').compareDocumentPosition(dialog.querySelector('.pr-questions')) & w.Node.DOCUMENT_POSITION_FOLLOWING);assert.equal(dialog.querySelectorAll('[data-question=\"1\"] .pr-solution').length,0,'full-credit question has no repeated solution');assert(dialog.querySelector('.pr-difficulty-table'));assert(dialog.querySelector('[data-field=cause]'));
  assert(dialog.querySelector('.pr-action-plan').compareDocumentPosition(dialog.querySelector('.pr-questions')) & w.Node.DOCUMENT_POSITION_FOLLOWING,'actionable overview precedes question detail');
  assert.equal(dialog.querySelector('.pr-solution').open,false,'solution is optional');
  assert.equal(dialog.querySelector('.pr-practice details').open,false,'practice answer stays hidden until requested');
  dialog.querySelector('[data-pr="focus:2"]').click();assert.equal(dialog.querySelector('[data-question="2"]').open,true,'action links open the source diagnosis');
  assert.equal(dialog.querySelector('[data-pr-score]').textContent,'5 / 10');
  assert.equal(dialog.querySelectorAll('.pr-reading-section').length,3,'three clear reading levels');
  const second=dialog.querySelectorAll('.pr-question')[1];
  assert.equal(second.querySelector('.pr-source').open,false,'source transcripts are optional');
  assert.equal(second.querySelector('.pr-edit').open,false,'editing does not lead the report');
  assert(second.querySelector('.pr-first-issue').compareDocumentPosition(second.querySelector('.pr-source')) & w.Node.DOCUMENT_POSITION_FOLLOWING,'explanation before source/edit controls');
  dialog.querySelector('[data-pr="filter:review"]').click();assert.equal(dialog.querySelector('[data-question="1"]').hidden,true);assert.equal(second.hidden,false);
  dialog.querySelector('[data-pr="filter:confirm"]').click();assert.equal(dialog.querySelector('.pr-filter-empty').hidden,false);
  dialog.querySelector('[data-pr="focus:2"]').click();assert.equal(second.hidden,false);assert.equal(dialog.querySelector('[data-pr="filter:all"]').getAttribute('aria-pressed'),'true','question links reset active filter');
  second.querySelector('[data-field=cause]').value='time';second.querySelector('[data-field=cause]').dispatchEvent(new w.Event('input',{bubbles:true}));assert(second.querySelector('.pr-reflection-route').textContent.includes('计时'));second.querySelector('[data-field=reflection_note]').value='还剩一分钟';second.querySelector('[data-field=teacher_score]').value='3';second.querySelector('[data-field=teacher_score]').dispatchEvent(new w.Event('input',{bubbles:true}));
  dialog.querySelector('[data-pr=save]').click();await tick();assert.equal(dialog.querySelector('[data-pr-score]').textContent,'8 / 10');assert.equal(modal.querySelector('.actual-v16').value,'88','review never overwrites exam scores');assert.equal(calls.filter(c=>c.action==='correct').at(-1).corrections[1].reflection.cause,'time');assert.equal(calls.filter(c=>c.action==='correct').at(-1).reanalyze,true);
  savedReport.status='running';savedReport.progress={version:3,phase:'diagnose',completed_steps:2,total_questions:15,completed_questions:9,current_questions:['14'],message:'分析失分步骤与可能原因',phase_started_at:new Date().toISOString()};dialog.querySelector('[data-pr=history]').click();await tick();dialog.querySelector('[data-pr^=\"report:\"]').click();await tick();assert(dialog.textContent.includes('下方保留上一版报告'));assert.equal(dialog.querySelectorAll('.pr-question').length,2);assert.equal(dialog.querySelector('[data-pr=save]').disabled,true);savedReport.status='succeeded';
  dialog.querySelector('[data-pr=close]').click();assert(!d.querySelector('.pr-dialog'));assert.equal(modal.querySelector('.actual-v16').value,'88');
  const draft=modal._paperReview.draftId;modal.querySelector('#examName').value='关联测试';failAttach=true;await w.saveExam(null,modal);await tick();
  assert(calls.some(c=>c.action==='attach'&&c.exam_id===examId&&c.draft_id===draft));assert(!w.state.modal,'attachment failure does not fail exam save');
  failAttach=false;w.openExam({id:examId,name:'关联测试',exam_date:'2026-10-18',scores:{数学:{actual:88,max:150}}});await tick();modal=w.state.modal;assert.equal(modal._paperReview.draftId,draft,'association survives reopen');
  modal.querySelector('.pr-entry').click();await tick();w.state.token='another-account';modal.querySelector('.pr-entry').click();await tick();
  d.body.appendChild(d.createElement('div'));await tick();assert(!d.querySelector('.pr-dialog'),'account change clears report display');
  assert.deepEqual(errors,[]);dom.window.close();console.log('PASS: bundled UI, simple entries, lazy API use, editor preservation, review editing, score isolation, attachment failure recovery and account change');
}
module.exports={harness,uid,examId,input,raw,rid,stagedReply};
if(require.main===module)(async()=>{const report=await backend();await migration();await ui(report)})().catch(e=>{console.error(e);process.exitCode=1});
