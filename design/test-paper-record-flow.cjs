// Full record -> confirmed raw marks -> longitudinal statistics -> text-only AI pipeline.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {harness,uid,examId,input,rid}=require('./test-paper-review.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,80));
async function fixture(){
 const h=harness();await h.init();
 Object.assign(h.tables.score_tracker_exams[0],{name:'测试期中',exam_date:'2026-10-28',updated_at:'2026-10-28T00:00:00Z',question_type_scores:{英语:[{name:'作文',score:20,max:25}]}});
 Object.assign(h.tables.score_tracker_scores[0],{raw_score:5,raw_max_score:10,actual_score:5,max_score:10});
 const call=async(body,status=200)=>{const r=await h.call(body),d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;};
 await call({action:'save_materials',...input,exam_id:examId,options:{purpose:'record',config_version:2,review_before_analysis:false,use_account_history:false}});
 await call({action:'upload_page',request_id:rid,page:1,role:'paper',url:input.pages[0].url});
 await call({action:'start',request_id:rid,use_saved:true,consent:true,work_on_paper:true},202);await h.drain();
 let r=(await call({action:'get',request_id:rid})).review;assert.equal(r.status,'succeeded');assert(r.result.record_only);
 const corrections=r.result.questions.map((q,i)=>({id:q.id,stem:q.stem,answer:q.answer,teacher_score:q.teacher_score,max_score:q.max_score,verified:true,question_type:i?'解答题':'填空题',question_difficulty:i?'hard':'easy'}));
 r=(await call({action:'correct',request_id:rid,revision:r.revision,corrections})).review;
 return {h,call,row:r,corrections};
}
async function backend(){
 const {h,call,row,corrections}=await fixture();
 h.tables.score_tracker_paper_reviews[0].exam_id=null;h.tables.score_tracker_paper_materials[0].exam_id=null;
 await call({action:'attach',exam_id:examId,draft_id:input.draft_id});
 assert.equal(h.tables.score_tracker_paper_reviews[0].exam_id,examId);
 assert.equal(h.tables.score_tracker_paper_materials[0].exam_id,examId,'saving a new exam also links an uploaded draft');
 const preview=await call({action:'preview_types',request_id:rid,revision:row.revision});
 assert.deepEqual(preview.rows,[{name:'填空题',score:5,max:5,difficulty:'easy'},{name:'解答题',score:0,max:5,difficulty:'hard'}]);
 const modelCalls=h.upstream.length;
 await call({action:'sync_types',request_id:rid,revision:row.revision,exam_version:'stale'},409);
 const originalScore=structuredClone(h.tables.score_tracker_scores);
 const saved=await call({action:'sync_types',request_id:rid,revision:row.revision,exam_version:preview.exam_version});
 assert.equal(h.upstream.length,modelCalls,'sync is independent of AI');
 assert.deepEqual(h.tables.score_tracker_scores,originalScore,'does not rewrite subject/raw/final scores');
 assert.deepEqual(saved.question_type_scores.英语,[{name:'作文',score:20,max:25}],'other subjects preserved');
 const p2=await call({action:'preview_types',request_id:rid,revision:row.revision});
 await call({action:'sync_types',request_id:rid,revision:row.revision,exam_version:p2.exam_version},409);
 h.tables.score_tracker_exams[0].updated_at='2026-10-29T00:00:00Z';
 await call({action:'sync_types',request_id:rid,revision:row.revision,exam_version:p2.exam_version,replace:true},409);
 const p3=await call({action:'preview_types',request_id:rid,revision:row.revision});
 await call({action:'sync_types',request_id:rid,revision:row.revision,exam_version:p3.exam_version,replace:true});
 assert.equal(h.tables.score_tracker_exams[0].question_type_scores.数学.length,2,'repeated sync replaces instead of doubles totals');
 const request={action:'analyze_record',request_id:crypto.randomUUID(),draft_id:crypto.randomUUID(),source_request_id:rid,source_revision:row.revision,consent:true,options:{use_account_history:false,modules:['difficulty','solutions']}};
 const writes=h.writes.length;
 await call({...request,source_revision:0},409);assert.equal(h.writes.length,writes,'stale source cannot reserve quota');
 await call({...request,consent:false},400);
 const before=h.upstream.length;
 await call(request,202);await h.drain();
 let analysis=(await call({action:'get',request_id:request.request_id})).review;
 assert.equal(analysis.status,'succeeded');assert.equal(analysis.result.record_only,false);
 assert.deepEqual(analysis.result.source_record,{request_id:rid,revision:row.revision});
 assert.equal(analysis.result.questions[1].teacher_score,0);
 assert.equal(analysis.result.questions[1].question_type,'解答题');
 const newCalls=h.upstream.slice(before);
 assert(newCalls.length>0);assert(newCalls.every(c=>!JSON.stringify(c).includes('image_url')),'analysis never reuploads images');
 assert(newCalls.every(c=>!/(阶段一：|识别作答：|独立资料复核：|独立分数补读：)/.test(c.messages[0].content[0].text)),'no OCR stages after recording');
 const scanStart=h.upstream.length,scanId=crypto.randomUUID();
 await call({...request,request_id:scanId,options:{use_source_scans:true,use_account_history:false,modules:['solutions']}},202);await h.drain();
 const scanCalls=h.upstream.slice(scanStart);
 assert.equal((await call({action:'get',request_id:scanId})).review.status,'succeeded');
 assert(scanCalls.some(c=>JSON.stringify(c).includes('image_url')),'optional figures use existing private scans');
 assert(scanCalls.every(c=>!/(阶段一：|识别作答：|独立资料复核：|独立分数补读：)/.test(c.messages[0].content[0].text)),'using figures never restarts OCR');
 const count=h.tables.score_tracker_paper_reviews.length, upstream=h.upstream.length;
 await call(request,202);await h.drain();assert.equal(h.tables.score_tracker_paper_reviews.length,count);assert.equal(h.upstream.length,upstream,'retry is idempotent');
 const recordRows=await call({action:'list_all',purpose:'record'}),analysisRows=await call({action:'list_all',purpose:'analysis'});
 assert.deepEqual(recordRows.reviews.map(r=>r.request_id),[rid]);assert.deepEqual(new Set(analysisRows.reviews.map(r=>r.request_id)),new Set([request.request_id,scanId]));
 const scans=await call({action:'sources',request_id:request.request_id});assert.equal(scans.pages.length,1);assert(scans.readonly);
 let changed=(await call({action:'correct',request_id:rid,revision:row.revision,corrections:corrections.map((c,i)=>({...c,teacher_score:i?null:c.teacher_score}))})).review;
 const incomplete=await call({action:'preview_types',request_id:rid,revision:changed.revision});
 assert.equal(incomplete.rows[1].score,null,'unknown never becomes zero');
 assert.equal((await call({action:'get',request_id:request.request_id})).review.result.questions[1].teacher_score,0,'source edits cannot mutate a saved analysis snapshot');
 changed=(await call({action:'correct',request_id:rid,revision:changed.revision,corrections:corrections.map(c=>({...c,verified:false}))})).review;
 const unverified=await call({action:'preview_types',request_id:rid,revision:changed.revision});
 await call({action:'sync_types',request_id:rid,revision:changed.revision,exam_version:unverified.exam_version,replace:true},400);
 await call({...request,request_id:crypto.randomUUID(),token:'wrong'},401);
 const foreign=crypto.randomUUID();h.tables.score_tracker_paper_reviews.push({request_id:foreign,user_id:crypto.randomUUID(),status:'succeeded',result:row.result,revision:0});
 await call({...request,source_request_id:foreign,source_revision:0},404);
 await call({action:'delete',request_id:request.request_id});assert.equal(h.blobs.size,1,'deleting derived analysis preserves source scans');
 await call({action:'delete',request_id:rid});assert.equal(h.blobs.size,0);
 console.log('PASS: record-only completion, type preview/sync, raw/zero/unknown, revisions, concurrent edits, manual protection, ownership, quota dedup, text-only analysis, source snapshots, independent deletion');
}
async function ui(){
 const {h}=await fixture(),errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
 const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.setInterval=()=>1;w.confirm=()=>true;w.AbortController=AbortController;
 const exam={...h.tables.score_tracker_exams[0],scores:{数学:{actual:5,max:10,raw:5,rawMax:10}},question_type_scores:{}};
 w.fetch=async(url,opts)=>{const body=JSON.parse(opts?.body||'{}');calls.push(body);if(String(url).includes('paper-review'))return h.call(body);return new Response(JSON.stringify({ok:true,modules:[],exams:[exam],subjects:[{name:'数学',defaultMax:10}],enabled:false}));};
 try{
 w.eval(read('app-bundle.js')+'\nwindow.state=state;');await tick();
 Object.assign(w.state,{user:{id:uid,username:'fixture'},token:'test-token',exams:[exam],allExams:[exam],subjectConfigs:[{name:'数学',defaultMax:10}],modulesV18:[],page:'stats',analysisTab:'papers'});
 w.render();await tick();assert.equal(d.querySelectorAll('.ph-tabs').length,1);assert.equal(d.querySelectorAll('[data-analysis-tab]').length,4);
 d.querySelector('[data-hub^="open:"]').click();await tick();
 const input=d.querySelector('[data-field=question_type]');assert(input);input.value='综合题';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 d.querySelector('[data-pr=analyze-record]').click();await tick();assert(d.querySelector('.pr-message').textContent.includes('先保存'));
 d.querySelector('[data-pr=save]').click();await tick();
 d.querySelector('[data-pr=preview-types]').click();await tick();assert(d.querySelector('.pr-type-sync'));assert(d.querySelector('[data-sync-types]'));
 d.querySelector('[data-sync-types]').click();await tick();assert(d.querySelector('[data-view-types]'));assert.equal(w.state.allExams[0].question_type_scores.数学[0].name,'综合题');
 d.querySelector('[data-view-types]').click();await tick();assert(d.querySelector('.qta-page'));assert.equal(d.querySelectorAll('.ph-tabs').length,1);assert(d.querySelector('.qta-page').textContent.includes('综合题'));
 d.querySelector('[data-analysis-tab=papers]').click();await tick();d.querySelector('[data-hub^="open:"]').click();await tick();
 d.querySelector('[data-pr=analyze-record]').click();await tick();assert(d.querySelector('.pr-record-analysis'));assert(!d.querySelector('input[type=file]'),'analysis form never requests uploads');
 d.querySelector('[name=consent]').checked=true;d.querySelector('.pr-record-analysis').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await h.drain();await tick();
 assert(calls.some(c=>c.action==='analyze_record'&&!c.pages));
 for(const tab of ['stats','types','papers','ai']){d.querySelector('[data-analysis-tab='+tab+']').click();await tick();assert.equal(d.querySelectorAll('[data-analysis-tab]').length,4);assert.equal(d.querySelectorAll('.ph-tabs').length,1);}
 d.querySelector('[data-analysis-tab=papers]').click();await tick();d.querySelector('[data-hub=new]').click();await tick();assert(d.querySelector('.ph-basics'));assert(!d.querySelector('.ph-preferences'),'recording has no analysis settings');assert(d.querySelector('[data-pr=start]').textContent.includes('录入'));
 assert.deepEqual(errors,[]);console.log('PASS: actual production bundle -> saved edits -> type sync -> analysis statistics -> AI creation, 4 peer tabs, single nav and independent recording form');
 }finally{w.close();}
}
if(require.main===module)(async()=>{await backend();await ui()})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={fixture};
