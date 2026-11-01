/* Offline interaction preview. No service calls or real account changes. */
(function(){
 var f=window.__paperFlowDemo,record=f.record,reports=[record,f.analysis],exam=f.exam;
 if(navigator.serviceWorker)navigator.serviceWorker.register=function(){return Promise.resolve({});};
 window.fetch=async function(url,options){
  var b={};try{b=JSON.parse(options&&options.body||'{}');}catch(_){}
  var data={ok:true,enabled:false,modules:[],subjects:[],exams:[],profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}};
  if(String(url).includes('/api/score-tracker-paper-review')){
   var r=reports.find(function(r){return r.request_id===b.request_id;})||record;
   var rows=function(){var map=new Map();(r.corrections||[]).forEach(function(q){if(!q.question_type)return;var a=map.get(q.question_type)||{name:q.question_type,score:0,max:0,difficulty:q.question_difficulty};a.score=q.teacher_score==null||a.score==null?null:a.score+q.teacher_score;a.max=q.max_score==null||a.max==null?null:a.max+q.max_score;map.set(q.question_type,a);});return Array.from(map.values());};
   if(b.action==='list_all')data={reviews:reports.filter(function(r){return !b.purpose||r.options.purpose===b.purpose;}),drafts:[],has_more:false};
   else if(b.action==='get')data={review:r};
   else if(b.action==='quota')data={quota:{enabled:true,limit:10,remaining:10,global_available:true}};
   else if(b.action==='preferences')data={settings:{}};
   else if(b.action==='sources')data={pages:[],regions:{},readonly:true};
   else if(b.action==='correct'){r.corrections=b.corrections;r.revision++;data={review:r};}
   else if(b.action==='preview_types')data={rows:rows(),untyped:0,unverified:r.corrections.filter(function(c){return !c.verified;}).length,existing:exam.question_type_scores.数学||[],exam_id:exam.id,exam_version:exam.updated_at};
   else if(b.action==='sync_types'){exam.question_type_scores.数学=rows();exam.updated_at=new Date().toISOString();data={ok:true,exam_id:exam.id,subject:'数学',question_type_scores:exam.question_type_scores};}
   else if(b.action==='analyze_record'){var copy=JSON.parse(JSON.stringify(f.analysis));copy.request_id=b.request_id;copy.options=b.options;copy.created_at=new Date().toISOString();copy.result.source_record={request_id:record.request_id,revision:record.revision};copy.result.options=b.options;copy.result.questions.forEach(function(q){var c=record.corrections.find(function(c){return c.id===q.id;});if(c)Object.assign(q,{stem:c.stem||q.stem,answer:c.answer,teacher_score:c.teacher_score,max_score:c.max_score,question_type:c.question_type,question_difficulty:c.question_difficulty});});reports.push(copy);data={request_id:b.request_id};}
   else if(b.action==='link'){r.exam_id=b.exam_id;r.title=b.title;}
   else if(b.action==='delete')reports=reports.filter(function(v){return v!==r;});
  }
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
})();
