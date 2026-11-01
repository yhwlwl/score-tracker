// Preview data is generated through the isolated Edge handler used in the chain tests.
const fs=require('node:fs'),path=require('node:path'),{fixture}=require('./test-paper-record-flow.cjs'),{uid,examId,rid}=require('./test-paper-review.cjs');
(async()=>{
 const {h,call,row}=await fixture();
 const id=crypto.randomUUID();await call({action:'analyze_record',request_id:id,draft_id:crypto.randomUUID(),source_request_id:rid,source_revision:row.revision,consent:true,options:{use_account_history:false}},202);await h.drain();
 const analysis=(await call({action:'get',request_id:id})).review;
 const current={id:examId,name:'期中数学 · 演示',exam_date:'2026-10-28',updated_at:'2026-10-28T00:00:00Z',scores:{数学:{actual:5,max:10,raw:5,rawMax:10}},question_type_scores:{}};
 const history=Array.from({length:4},(_,i)=>({...current,id:'demo-'+i,name:'数学练习 '+(i+1),exam_date:'2026-10-'+String(4+i*5).padStart(2,'0'),question_type_scores:{数学:[{name:'填空题',score:[3,5,4,5][i],max:5,difficulty:'easy'},{name:'解答题',score:[2,0,3,1][i],max:5,difficulty:'hard'}]}}));
 const data={record:row,analysis,exam:current,history,user:uid};
 const pre=`<script>window.__paperFlowDemo=${JSON.stringify(data).replaceAll('<','\\u003c')};</script><script src="./preview.js"></script>`;
 let html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/(src|href)="\.\//g,'$1="../../').replace('<head>','<head>'+pre).replace('</body>',`<script>document.addEventListener('DOMContentLoaded',function(){var f=window.__paperFlowDemo;Object.assign(state,{user:{id:f.user,username:'试题链路演示'},token:'test-token',page:'stats',analysisTab:new URL(location.href).searchParams.get('tab')||'papers',exams:f.history.concat([f.exam]),allExams:f.history.concat([f.exam]),subjectConfigs:[{name:'数学',defaultMax:10}],modulesV18:[]});render();var banner=document.createElement('div');banner.style='padding:10px 16px;text-align:center;background:#e8f0ff;color:#244d8a;font:13px/1.5 system-ui;position:relative;z-index:50';banner.textContent='合成演示数据 · 可体验试题核对 → 题型同步 → AI 分析 · 请求已模拟';document.body.prepend(banner);});</script></body>`);
 const out=path.join(__dirname,'paper-record-flow-qa');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
