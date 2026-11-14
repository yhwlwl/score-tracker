/* All /api requests stay in this browser. No model calls, tokens, or production writes. */
(function(){
 'use strict';
 var f=window.__entryPreview,realFetch=window.fetch.bind(window),key='st_entry_public_demo_20261114_v1';
 var store={records:JSON.parse(JSON.stringify(f.records)),exams:JSON.parse(JSON.stringify(f.exams)),drafts:{}};
 try{var cached=JSON.parse(localStorage.getItem(key)||'null');if(cached&&cached.records&&cached.exams)store=cached;}catch(_){}
 try{localStorage.setItem('st_known_user','1');localStorage.setItem('st_token','entry-preview-local');localStorage.setItem('st_pwa_install_v1',JSON.stringify({never:true}));}catch(_){}
 function persist(){try{localStorage.setItem(key,JSON.stringify(store));}catch(_){}}
 function response(data,status){return new Response(JSON.stringify(data),{status:status||200,headers:{'Content-Type':'application/json'}});}
 function copy(o){return JSON.parse(JSON.stringify(o));}
 function groups(r){var rows=new Map(),untyped=0,unverified=0;(r.corrections||[]).forEach(function(q){var name=(q.question_type||'').trim();if(!name){untyped++;return;}if(!q.verified)unverified++;var a=rows.get(name)||{name:name,score:0,max:0,difficulty:q.question_difficulty||''};a.score=q.teacher_score==null||a.score==null?null:Math.round((a.score+q.teacher_score)*100)/100;a.max=q.max_score==null||a.max==null?null:Math.round((a.max+q.max_score)*100)/100;rows.set(name,a);});return {rows:Array.from(rows.values()),untyped:untyped,unverified:unverified};}
 window.__entryReplay={store:store,reset:function(){localStorage.removeItem(key);location.href=location.pathname;},fillSample:async function(subject){
  var row=f.records.find(function(r){return r.subject===subject;}),form=document.querySelector('.ph-basics');if(!row||!form)return;
  form.elements.subject.value=subject;form.elements.subject.dispatchEvent(new Event('change',{bubbles:true}));form.elements.exam_id.value=row.exam_id;form.elements.exam_id.dispatchEvent(new Event('input',{bubbles:true}));
  var canvas=document.createElement('canvas');canvas.width=900;canvas.height=1250;var c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,900,1250);c.fillStyle='#172b50';c.font='bold 34px sans-serif';c.fillText(subject+' · 合成演示数据页',55,80);c.font='22px sans-serif';c.fillStyle='#64748b';c.fillText('按已保存文字重排，非原始试卷图片',55,125);c.fillText(row.result.questions.length+'题 · 原始测试 '+row.created_at.slice(0,10),55,166);var y=230;c.fillStyle='#243247';c.font='24px sans-serif';row.result.questions.slice(0,4).forEach(function(q){c.fillText('第'+q.label+'题 · '+q.question_type+' · '+(q.teacher_score==null?'得分待确认':q.teacher_score+'/'+q.max_score+'分'),55,y);y+=42;for(var n=0;n<Math.min(q.stem.length,160);n+=30){c.fillText(q.stem.slice(n,n+30),55,y);y+=34;}y+=30;});
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/jpeg',.9);}),file=new File([blob],subject+'-示例转录.jpg',{type:'image/jpeg'}),dt=new DataTransfer();dt.items.add(file);var input=document.querySelector('[data-role=paper]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 }};
 if(navigator.serviceWorker)navigator.serviceWorker.register=function(){return Promise.resolve({});};
 if(navigator.sendBeacon)navigator.sendBeacon=function(){return true;};
 window.fetch=async function(url,options){
  var path=new URL(typeof url==='string'?url:url.url,location.href).pathname;if(!path.startsWith('/api/'))return realFetch(url,options);
  var b={};try{b=JSON.parse(options&&options.body||'{}');}catch(_){}
  var data={ok:true,enabled:false,modules:[],subjects:[],exams:store.exams,profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}};
  if(path.includes('score-tracker-paper-review')){
   var r=store.records.find(function(r){return r.request_id===b.request_id;}),exam=r&&store.exams.find(function(e){return e.id===r.exam_id;});
   if(['analyze_record','retry_scores'].includes(b.action)||b.reanalyze===true)return response({error:'此预览仅开放试题录入，试卷分析暂未开放。'},403);
   if(b.action==='list_all'||b.action==='list')data={reviews:store.records.filter(function(r){return (!b.subject||r.subject===b.subject)&&(!b.exam_id||r.exam_id===b.exam_id)&&(!b.source_request_id||r.request_id===b.source_request_id);}),drafts:[],has_more:false};
   else if(b.action==='get'){if(!r)return response({error:'记录已移除'},404);data={review:r};}
   else if(b.action==='quota')data={quota:{enabled:true,limit:10,remaining:10,global_available:true}};
   else if(b.action==='preferences')data={settings:{}};
   else if(b.action==='sources')data={pages:[],regions:{},readonly:true};
   else if(b.action==='correct'){
    if(!r)return response({error:'记录不存在'},404);if(b.revision!==r.revision)return response({error:'记录已更新，请重新打开'},409);
    var bad=(b.corrections||[]).some(function(q){return q.teacher_score!=null&&q.max_score!=null&&q.teacher_score>q.max_score;});if(bad)return response({error:'得分不能高于满分'},400);
    r.corrections=b.corrections;r.revision++;persist();data={review:r};
   }
   else if(b.action==='preview_types'){if(!r)return response({error:'记录不存在'},404);data=Object.assign(groups(r),{existing:exam&&exam.question_type_scores[r.subject]||[],exam_id:exam&&exam.id,exam_version:exam&&exam.updated_at});}
   else if(b.action==='sync_types'){
    if(!r||!exam)return response({error:'请先关联考试'},400);var g=groups(r);if(g.unverified)return response({error:'请先核对已分类题目'},400);
    if(b.revision!==r.revision||b.exam_version!==exam.updated_at)return response({error:'记录已变化，请重新核对'},409);
    if((exam.question_type_scores[r.subject]||[]).length&&!b.replace)return response({error:'请先确认替换已有题型'},409);
    exam.question_type_scores[r.subject]=g.rows;exam.updated_at=new Date().toISOString();persist();data={ok:true,exam_id:exam.id,subject:r.subject,question_type_scores:exam.question_type_scores};
   }
   else if(b.action==='save_materials'){store.drafts[b.request_id]=copy(b);persist();data={ok:true,request_id:b.request_id};}
   else if(b.action==='upload_page'||b.action==='save_regions'||b.action==='save_score_details')data={ok:true};
   else if(b.action==='start'){
    if(store.records.some(function(r){return r.request_id===b.request_id;}))return response({request_id:b.request_id},202);
    var draft=store.drafts[b.request_id]||b;if(!draft.options||draft.options.purpose!=='record')return response({error:'只允许试题录入'},403);
    var source=f.records.find(function(r){return r.subject===draft.subject;});if(!source)return response({error:'预览只有数学、物理示例样本，不识别新照片。'},400);
    var next=copy(source);Object.assign(next,{request_id:b.request_id,draft_id:draft.draft_id,exam_id:draft.exam_id||null,title:draft.title||source.title,created_at:new Date().toISOString(),revision:0,corrections:[]});store.records.push(next);delete store.drafts[b.request_id];persist();data={request_id:b.request_id};return response(data,202);
   }
   else if(b.action==='link'){if(!r)return response({error:'记录不存在'},404);r.exam_id=b.exam_id;r.title=b.title;persist();}
   else if(b.action==='delete'){store.records=store.records.filter(function(v){return v!==r;});persist();}
   else if(b.action==='delete_draft'){delete store.drafts[b.request_id];persist();}
   else return response({error:'此预览不执行该操作'},403);
  }else if(b.action==='me'||b.action==='login'||b.action==='register')data={user:{id:f.user,username:'试题录入预览'},token:'entry-preview-local'};
  else if(b.action==='list_exams')data={exams:store.exams};
  return response(data);
 };
})();
