const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {harness,input,raw,uid,examId,rid}=require('./test-paper-review.cjs');
const evaluate=(h,s)=>vm.runInContext(s,h.scope);
const mark=(label,n,page=1)=>({page,quote:String(n)+'分',scope:'question',label,location:'按印刷题号定位的批改位置'});
async function run(){
 const h=harness();await h.init();h.scope.source={...input,options:{config_version:2,use_account_history:false},pages:[{page:1,role:'paper'},{page:2,role:'work'}]};
 h.scope.e={complete:true,coverage:'全部题目',warnings:[],context:[],score_groups:[],total:{score:24,max:null},questions:[
  {label:'甲-1',stem:'说明条件',pages:[1],work_pages:[2],subparts:[],answer:'已写步骤',teacher_score:7,max_score:7,score_mark:mark('甲-1',7,2),max_mark:{page:1,quote:'7分'},uncertainties:[]},
  {label:'乙.2',stem:'用材料作答',pages:[1],work_pages:[2],subparts:[],answer:'已写步骤',teacher_score:null,max_score:null,uncertainties:[],score_candidates:[10,11],score_verification:'conflict'}]};
 h.scope.r={questions:[{label:'乙.2',teacher_score:11,score_mark:mark('乙.2',11,2),max_score:19,max_mark:{page:2,quote:'本题19分'}}]};
 let out=evaluate(h,'mergeScoreReading(r,e,source,["乙.2"])');assert.equal(out.evidence.questions[1].teacher_score,11);assert.equal(out.evidence.questions[1].max_score,19);assert.equal(out.evidence.total.max,26);assert.equal(out.evidence.total.max_source,'printed_question_sum');assert.equal(out.evidence.questions[1].score_verification,'matched');assert.equal(out.evidence.score_check.status,'conflict','printed total disagreement remains visible');
 h.scope.r.questions[0].teacher_score=null;h.scope.r.questions[0].max_score=null;out=evaluate(h,'mergeScoreReading(r,e,source,["乙.2"])');assert.equal(out.evidence.questions[1].teacher_score,null,'unreadable is never zero');
 h.scope.r.questions[0]={label:'乙.2',teacher_score:0,score_mark:mark('乙.2',0,2),max_score:19,max_mark:{page:2,quote:'本题19分'}};h.scope.e.questions[1].score_candidates=undefined;out=evaluate(h,'mergeScoreReading(r,e,source,["乙.2"])');assert.equal(out.evidence.questions[1].teacher_score,0,'explicit zero is retained');
 h.scope.r.questions[0].score_mark.page=9;out=evaluate(h,'mergeScoreReading(r,e,source,["乙.2"])');assert.equal(out.evidence.questions[1].teacher_score,null,'invalid source page is rejected');
 h.scope.e.total={score:18,max:null};h.scope.e.questions.forEach(q=>{q.max_score=null;q.teacher_score=null});h.scope.e.score_groups=[{label:'第一部分',questions:['甲-1'],teacher_score:7,max_score:13,max_mark:{page:2,quote:'共13分'}},{label:'第二部分',questions:['乙.2'],teacher_score:11,max_score:24,max_mark:{page:2,quote:'共24分'}}];
 out=evaluate(h,'completeMaximum(e,source)');assert.equal(out.total.max,37);assert.equal(out.total.max_source,'printed_section_sum');assert.equal(out.score_check.status,'partial','section maxima never invent per-question maxima');assert.equal(out.questions[0].teacher_score,null);
 h.scope.e.total={score:109,max:null};h.scope.e.score_groups=[];h.scope.source.exam_context={source:'saved_exam',score:109,max:150};out=evaluate(h,'completeMaximum(e,source)');assert.equal(out.total.max,null,'disabled history cannot supply a denominator');h.scope.source.options.use_account_history=true;out=evaluate(h,'completeMaximum(e,source)');assert.equal(out.total.max,150);assert.equal(out.total.max_source,'saved_exam');
 console.log('PASS: independent missing-score retries, zero marks, third-read agreement, generic section/total maxima, conflicts and explicit source provenance');
 h.scope.qInput={...input,options:{use_account_history:false},pages:[{page:1,role:'paper'},{page:2,role:'work'}]};
 h.scope.qEvidence={complete:true,total:{score:8,max:null},score_groups:[],questions:[{label:'X',stem:'说明',pages:[1],work_pages:[2],teacher_score:null,max_score:null,uncertainties:[]}]};
 h.scope.qRead={questions:[{label:'X',teacher_score:8,score_mark:mark('X',8,2),max_score:14,max_mark:{page:2,quote:'本题14分'}}]};
 h.scope.qEvidence=evaluate(h,'mergeScoreReading(qRead,qEvidence,qInput,["X"]).evidence');assert.deepEqual(Array.from(evaluate(h,'scoreTargets(qEvidence)')),['X'],'new values require an independent second reading');
 h.scope.qRead.questions[0].max_score=16;h.scope.qRead.questions[0].max_mark.quote='本题16分';
 h.scope.qEvidence=evaluate(h,'mergeScoreReading(qRead,qEvidence,qInput,["X"]).evidence');assert.equal(h.scope.qEvidence.questions[0].max_score,null,'disagreeing maximum is not silently replaced');
 h.scope.qEvidence=evaluate(h,'mergeScoreReading(qRead,qEvidence,qInput,["X"]).evidence');assert.equal(h.scope.qEvidence.questions[0].max_score,16);assert.equal(h.scope.qEvidence.questions[0].max_verification,'matched');
 assert.deepEqual(Array.from(evaluate(h,'scoreReadPages(qInput,qEvidence,["X"])')),[2],'first reread selects only relevant work pages');

 const exams=Array.from({length:5},(_,i)=>({id:'exam-'+i,user_id:uid,exam_date:'2026-10-'+String(i+1).padStart(2,'0'),grade_level:'相同分类',total_participants:600}));
 const scores=exams.map((e,i)=>({exam_id:e.id,user_id:uid,subject:'自定义科目',actual_score:60+i,max_score:120,rank_position:[360,300,240,180,1][i],participant_count:600}));
 h.scope.hist={exams,scores,input:{exam_id:'exam-3',subject:'自定义科目'}};
 const snap=evaluate(h,'accountSnapshot(hist.exams,hist.scores,hist.input)');assert.equal(snap.prediction.history_count,3);assert.equal(snap.prediction.predicted_position_percent,49.6);assert.equal(snap.prediction.actual_position_percent,30);assert.equal(snap.trajectory.length,4);assert.equal(snap.difficulty.source,'score_page_model');
 const altered=structuredClone(scores);altered[4].rank_position=599;h.scope.hist.scores=altered;assert.equal(evaluate(h,'accountSnapshot(hist.exams,hist.scores,hist.input)').prediction.predicted_position_percent,snap.prediction.predicted_position_percent,'future outcomes cannot improve a reconstructed forecast');
 const forecastSource=fs.readFileSync(require('node:path').join(__dirname,'../app-v34.js'),'utf8').match(/function forecast\(percentiles, alpha\) \{[\s\S]*?\n  \}/)[0];const original=vm.runInNewContext('('+forecastSource+')');assert.equal(evaluate(h,'priorPrediction([60,50,40])'),original([60,50,40],0.4).percentile,'uses the existing deep-analysis point-estimate formula');
 h.scope.forbiddenDb={from(){throw new Error('must not read history')}};assert.equal((await evaluate(h,'loadAccountSnapshot(forbiddenDb,"owner",{options:{use_account_history:false}})')).status,'disabled');
 assert(!JSON.stringify(snap).includes(uid));assert(!JSON.stringify(snap).includes('user_id'));assert(!JSON.stringify(snap).includes('school'));
 console.log('PASS: scores-page model reuse, dated/cohort-aware trajectories, causal pre-exam forecast parity, no future leakage, and no account reads when disabled');

 const full=harness();await full.init();await full.call({action:'save_materials',...input});const jpeg='data:image/jpeg;base64,/9j/AA==';
 assert.equal((await full.call({action:'upload_page',request_id:rid,page:1,role:'paper',url:input.pages[0].url,regions:[jpeg]})).status,200);
 full.scope.args={user:uid,rid};const restored=await evaluate(full,'storedPages(db,args.user,args.rid)');assert.equal(restored[0].regions[0],jpeg,'cloud restore retains byte-identical close-ups');
 full.tables.score_tracker_paper_settings[0].model='deepseek-fixture';
 await full.call({action:'start',...input,use_saved:true});await full.drain();const row=full.tables.score_tracker_paper_reviews[0];assert.equal(row.status,'succeeded');const reserved=full.calls.filter(x=>x==='score_tracker_paper_reserve').length;
 const originalScan=full.tables.score_tracker_paper_materials[0].pages[0].path;
 const sourceHash=require('node:crypto').createHash('sha256').update(full.blobs.get(originalScan)).digest('hex');
 assert.equal((await full.call({action:'save_score_details',request_id:rid,page:1,source_sha256:'0'.repeat(64),regions:[jpeg]})).status,409,'reject details derived from a different original');
 assert.equal((await full.call({action:'save_score_details',request_id:rid,page:1,source_sha256:sourceHash,regions:['https://external/image']})).status,400);
 assert.equal((await full.call({action:'save_score_details',request_id:rid,page:1,source_sha256:sourceHash,regions:[jpeg]})).status,200);
 assert.equal(full.tables.score_tracker_paper_materials[0].pages[0].path,originalScan,'legacy report detail regeneration never replaces its original scan');
 assert.equal(full.blobs.size,2,'superseded details are removed, original remains');
 const originalAnswers=row.result.questions.map(q=>q.answer),updates=row.result.update_count;
 assert.equal((await full.call({action:'retry_scores',request_id:rid,revision:row.revision})).status,202);await full.drain();assert.equal(row.status,'succeeded');assert.equal(row.result.score_refresh_count,1);assert.equal(row.result.update_count,updates);assert.deepEqual(row.result.questions.map(q=>q.answer),originalAnswers);assert.equal(full.calls.filter(x=>x==='score_tracker_paper_reserve').length,reserved,'score-only reread does not consume a new report');
 const scoreRequests=full.upstream.filter(r=>r.messages[0].content[0].text.includes('独立分数补读'));assert(scoreRequests.length);assert(scoreRequests.every(r=>r.messages[0].content.some(c=>c.image_url?.url===jpeg)),'reread receives the restored close-ups');
 assert(scoreRequests.every(r=>r.messages[0].content.filter(c=>c.type==='image_url').length===1),'each delivery reads one view, not all duplicate scans');
 assert(scoreRequests.every(r=>r.thinking.type==='disabled'&&r.max_tokens===8192),'bounded numeric transcription uses the explicit OCR mode');
 assert(full.upstream.filter(r=>!r.messages[0].content[0].text.includes('独立分数补读')).every(r=>r.thinking.type==='enabled'),'analysis reasoning remains enabled');
 console.log('PASS: private cloud close-ups survive restore, real HTTP score-only refresh preserves answers/update allowance and does not reserve another analysis');
}
run().catch(e=>{console.error(e);process.exitCode=1});
