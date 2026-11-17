const assert=require('node:assert/strict');
const {harness,input,rid}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const k=h.scope;
 const page={page:2,role:'work',url:input.pages[0].url},normal={...input,work_on_paper:false,pages:[{page:1,role:'paper',url:input.pages[0].url},page]};
 const q=(label,score=null)=>({label,question_type:'单选题',teacher_score:score,score_mark:score===null?null:{page:2,quote:String(score),scope:'question',label},max_score:null,max_mark:null,confidence:'high',uncertainties:[],source_regions:[{kind:'work',page:2,box:[0,0,1,1]}]});
 const base={page:2,role:'work',questions:[q('1'),q('2',0),q('3'),q('4')],score_groups:[{label:'填空题',questions:['3','4'],teacher_score:5,score_mark:{page:2,quote:'填空题5分'}}],total:{},warnings:[]};
 assert.deepEqual(Array.from(k.scanScoreTargets(base,normal),v=>v.label),['1'],'preserve zero and explicit grouped totals');
 const raw={questions:[{label:'1',teacher_score:5,score_mark:{page:1,quote:'5分',scope:'question',label:'1'}}]};
 const read=k.normalizeScanScores(raw,page,normal,[],[base.questions[0]]);
 assert.equal(read[0].teacher_score,5);assert.equal(read[0].score_mark.page,2,'bind source page in program');
 assert.equal(raw.questions[0].score_mark.page,1,'retain raw provider response');
 const wrong=k.normalizeScanScores({questions:[{...raw.questions[0],score_mark:{...raw.questions[0].score_mark,label:'99'}}]},page,normal,[],[base.questions[0]]);assert.equal(wrong[0].teacher_score,null,'page correction cannot excuse a wrong question binding');
 assert.throws(()=>k.normalizeScanScores({questions:[]},page,normal,[],[base.questions[0]]),/目标题号/);
 const bad=structuredClone(base);bad.questions[0].uncertainties=['整页与补读批改分不一致，请核对'];
 const once=k.mergeScanScores(bad,read,[bad.questions[0]],0);assert.equal(once.questions[0].teacher_score,null,'existing conflict needs independent confirmation');
 const twice=k.mergeScanScores(once,read,[once.questions[0]],1);assert.equal(twice.questions[0].teacher_score,5);assert.equal(twice.questions[1].teacher_score,0);
 const other=structuredClone(read);other[0].teacher_score=0;other[0].score_mark.quote='0分';
 const disputed=k.mergeScanScores(once,other,[once.questions[0]],1);assert.equal(disputed.questions[0].teacher_score,null);assert(disputed.questions[0].uncertainties.some(v=>v.includes('两次补读')));
 const failed=k.mergeScanScores(base,[],[base.questions[0]],1,true);assert.equal(failed.questions[1].teacher_score,0);assert.deepEqual(failed.questions[1].source_regions,base.questions[1].source_regions);
 // Exercise the durable handler, not only helpers: a missing score gets a local
 // attempt then a whole-page attempt, and neither replays completed pages.
 let recover=0;
 h.transport=async(_url,opts)=>{const b=JSON.parse(opts.body),p=b.messages[0].content[0].text;let data;
  if(p.startsWith('截图分数自动复核')){recover++;assert.equal(b.max_tokens,8192);assert(!p.includes('转录题干'));data={questions:[{label:'1',teacher_score:recover===1?null:0,score_mark:recover===1?null:{page:1,quote:'0分',scope:'question',label:'1'}}]};}
  else {const n=Number(p.match(/本轮仅第(\d+)页/)[1]);data={questions:[{label:'1',question_type:'单选题',source_regions:[{kind:n===1?'paper':'work',page:n,box:[0,0,1,1]}],teacher_score:null,max_score:5,max_mark:{page:n,quote:'本题5分'}}],score_groups:[],total:{}};}
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]}));};
 const r=await h.call({action:'start',...input,pages:normal.pages,work_on_paper:false,options:{purpose:'record',config_version:2}});assert.equal(r.status,202,await r.clone().text());await h.drain();
 const row=h.tables.score_tracker_paper_reviews[0];assert.equal(row.status,'succeeded',JSON.stringify(h.logs));assert.equal(row.result.questions[0].teacher_score,0);assert.equal(recover,2);assert.equal(h.upstream.length,4,'two original pages plus two focused score reads');
 const f=harness();await f.init();f.transport=async(_url,opts)=>{const p=JSON.parse(opts.body).messages[0].content[0].text;if(p.startsWith('截图分数自动复核'))return new Response('{}',{status:400});const n=Number(p.match(/本轮仅第(\d+)页/)[1]);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({questions:[{label:'1',source_regions:[{kind:n===1?'paper':'work',page:n,box:[0,0,1,1]}]}]})}}]}));};
 await f.call({action:'start',...input,pages:normal.pages,work_on_paper:false,options:{purpose:'record',config_version:2}});await f.drain();assert.equal(f.tables.score_tracker_paper_reviews[0].status,'succeeded');assert.equal(f.tables.score_tracker_paper_reviews[0].result.questions[0].source_regions.length,2,'failed supplemental reads retain completed crops');
 console.log('PASS: source-page binding, zero, grouped totals, independent conflict checks, bounded durable recovery and failed reread preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
