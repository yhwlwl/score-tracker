/* Exam planning and post-exam entry. Reuse the production score editor. */
(function(){
'use strict';
const G=window.ScoreExamGoals;if(!G)return;
let supported=false,apiOwner=null;
function available(){return supported&&apiOwner===String(state.user?.id||state.user?.username||'');}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=(n,k)=>n?.querySelector(k)?.value??'';
const find=id=>(state.allExams||[]).find(e=>String(e.id)===String(id));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const labelRank=g=>G.num(g?.rank)===null?'':g.rankType==='percent'?'前'+g.rank+'%':'前'+g.rank+'名';
const summary=g=>[G.num(g?.score)!==null?g.score+'分':'',labelRank(g)].filter(Boolean).join(' · ');
function fields(key,g,score,max){
 return '<div class="eg-inputs" data-eg-key="'+esc(key)+'">'+(score?'<label>目标分<input data-eg-score inputmode="decimal" placeholder="选填" value="'+esc(g?.score)+'"></label><label>目标满分<input data-eg-max inputmode="decimal" value="'+esc(g?.max??max)+'"></label>':'')+'<label>目标年排<select data-eg-type><option value="number" '+(g?.rankType!=='percent'?'selected':'')+'>名次</option><option value="percent" '+(g?.rankType==='percent'?'selected':'')+'>前 %</option></select></label><label>排名目标<input data-eg-rank inputmode="decimal" placeholder="选填" value="'+esc(g?.rank)+'"></label></div>';
}
function readFields(el,old){
 let g={};const score=el.querySelector('[data-eg-score]');
 if(score){if(score.value.trim()!==''){g.score=score.value;g.max=val(el,'[data-eg-max]');}}
 else if(old&&G.num(old.score)!==null){g.score=old.score;g.max=old.max;}
 const r=val(el,'[data-eg-rank]');if(r.trim()!==''){g.rank=r;g.rankType=val(el,'[data-eg-type]');}
 return g;
}
function pendingCard(e){
 const items=G.snapshot(e),scores=Object.keys(e.scores||{}).filter(n=>!e.scores[n].excludeFromTotal);
 const all=scores.length&&scores.every(n=>G.num(e.scores[n].target)!==null);
 const total=items.total?.score??(all?scores.reduce((a,n)=>a+Number(e.scores[n].target),0):null);
 return '<article class="card eg-pending"><div class="eg-row"><b>'+esc(e.name)+'</b><span class="eg-muted">'+(e.exam_date<today()?'待录入成绩':'待考试')+'</span></div><p class="eg-muted">'+esc(e.exam_date)+' · '+esc(e.grade_level||'未分类')+'</p><div class="eg-metrics"><div><small>目标总分</small><strong>'+esc(total??'—')+'</strong></div><div><small>目标年排</small><strong>'+esc(labelRank(items.total)||'—')+'</strong></div></div><div class="eg-row"><button type="button" class="secondary" data-eg-plan="'+esc(e.id)+'">编辑目标</button><button type="button" class="primary" data-eg-fill="'+esc(e.id)+'">录入成绩</button></div></article>';
}
function planDialog(ex){
 if(state.modal?.isConnected)return;
 const original=ex||null,items=G.snapshot(ex||{}),cfg=state.subjectConfigs||[];
 const scores=Object.fromEntries((ex?Object.entries(ex.scores||{}):cfg.map(s=>[s.name,{max:s.defaultMax||100}])).map(([n,s])=>[n,{...s}]));
 const modIds=new Set(ex?.moduleIds||[]),mods=state.modulesV18||[];
 let modal=document.createElement('div');modal.className='modal-backdrop eg-plan-modal';
 modal.innerHTML='<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>'+(ex?'编辑考试目标':'设置考试目标')+'</h3><button type="button" class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="egName" maxlength="60" value="'+esc(ex?.name)+'" placeholder="如 期末考试"></div><div class="field"><label>预计考试日期</label><input id="egDate" type="date" value="'+esc(ex?.exam_date||today())+'"></div><div class="field"><label>考试分类</label><select id="egCategory"></select></div></div><div class="eg-row"><h4>本次考试目标</h4><span class="eg-muted">可分别留空</span></div><div class="eg-mode"><button type="button" data-eg-mode="score">分数</button><button type="button" data-eg-mode="rank">排名</button><button type="button" data-eg-mode="both">两者</button></div><div id="egSubjects"></div><details><summary>选择科目</summary><div id="egPick"></div></details><div id="egTotal"></div><details><summary>组合目标（选填）</summary><div id="egModules"></div></details><p class="eg-muted">总分可单独指定，排名不能由各科排名相加。考试后打开这条记录补录成绩。</p><div class="modal-actions"><button type="button" class="secondary cancel-btn">取消</button><button type="button" class="primary save-btn">保存考试目标</button></div></div></div>';
 document.body.append(modal);state.modal=modal;
 const categories=Array.from(new Set(['',...(typeof categoryOptionsV14==='function'?categoryOptionsV14():[]),ex?.grade_level||'']));
 const select=modal.querySelector('#egCategory');categories.forEach(n=>{let o=document.createElement('option');o.value=n;o.textContent=n||'未分类';select.append(o);});select.value=ex?.grade_level||categories[1]||'';
 const list=modal.querySelector('#egSubjects'),total=modal.querySelector('#egTotal'),modules=modal.querySelector('#egModules'),pick=modal.querySelector('#egPick');
 let selected=new Set(Object.keys(scores)),mode=Object.values(items).some(g=>G.num(g.rank)!==null)?'both':'score';
 function draw(){
  list.innerHTML=Array.from(selected).map(n=>'<div class="eg-plan-row"><b>'+esc(n)+'</b>'+fields('s:'+n,items['s:'+n],true,scores[n]?.max||100)+'</div>').join('');
  pick.innerHTML=Array.from(new Set([...cfg.map(s=>s.name),...Object.keys(scores)])).map(n=>'<label class="eg-choice"><input type="checkbox" data-eg-sub="'+esc(n)+'" '+(selected.has(n)?'checked':'')+'>'+esc(n)+'</label>').join('');
  const max=Array.from(selected).reduce((s,n)=>s+Number(scores[n]?.max||100),0);
  total.innerHTML='<div class="eg-plan-row"><b>总分</b>'+fields('total',items.total,true,max||1)+'<small class="eg-muted">留空则按已填全的各科目标自动汇总。</small></div>';
  modules.innerHTML=mods.map(m=>'<div class="eg-plan-row"><label class="eg-choice"><input type="checkbox" data-eg-module="'+esc(m.id)+'" '+(modIds.has(String(m.id))?'checked':'')+'>'+esc(m.name)+'</label>'+(modIds.has(String(m.id))?fields('m:'+m.id,items['m:'+m.id],true,(m.subjects||[]).reduce((s,n)=>s+Number(scores[n]?.max||cfg.find(c=>c.name===n)?.defaultMax||100),0)||1):'')+'</div>').join('');
  modal.dataset.egMode=mode;modal.querySelectorAll('[data-eg-mode]').forEach(b=>b.classList.toggle('active',b.dataset.egMode===mode));
 }
 function sync(){modal.querySelectorAll('[data-eg-key]').forEach(el=>{let k=el.dataset.egKey;items[k]=readFields(el,items[k]);});}
 function close(){modal.remove();if(state.modal===modal)state.modal=null;}
 modal.addEventListener('click',ev=>{const b=ev.target.closest('[data-eg-mode]');if(b){sync();mode=b.dataset.egMode;draw();}});
 modal.addEventListener('change',ev=>{const t=ev.target;if(t.hasAttribute('data-eg-sub')||t.hasAttribute('data-eg-module')){sync();const isSub=t.hasAttribute('data-eg-sub'),key=isSub?t.dataset.egSub:t.dataset.egModule,set=isSub?selected:modIds;if(t.checked){set.add(key);if(isSub&&!scores[key])scores[key]={max:cfg.find(s=>s.name===key)?.defaultMax||100};}else set.delete(key);draw();}});
 modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
 modal.querySelector('.save-btn').onclick=async function(){
  if(!available())return toast('当前预览未连接新版目标后端，暂不能保存考试计划');
  sync();let next={...(original||{}),name:val(modal,'#egName').trim(),exam_date:val(modal,'#egDate'),grade_level:select.value,scores:{},moduleIds:Array.from(modIds),moduleRanks:original?.moduleRanks||{},is_hidden:!!original?.is_hidden};
  if(!next.name||!next.exam_date||!selected.size)return toast('请填写考试名称、日期和科目');
  const clean={};
  for(const n of selected){let g=items['s:'+n]||{},s={...scores[n]};if(!original||G.pending(original)){s.max=G.num(g.max)??s.max;s.rawMax=s.max;}s.target=g.score??null;next.scores[n]=s;if(Object.keys(g).length)clean['s:'+n]=g;}
  if(items.total)clean.total=items.total;for(const id of modIds){if(items['m:'+id])clean['m:'+id]=items['m:'+id];}
  try{next.exam_goals={planned:!original||G.pending(original),items:G.cleanItems(clean,next)};if(!Object.keys(next.exam_goals.items).length)throw Error('请至少设置一项目标');}catch(e){return toast(e.message);}
  this.disabled=true;this.textContent='保存中…';try{await dataApiV7('save_exam',{exam:next});await loadExams();close();render();toast('考试目标已保存');}catch(e){toast(e.message);this.disabled=false;this.textContent='保存考试目标';}
 };
 draw();
}
function decorate(modal,source){
 if(!modal||!modal.querySelector('#examSubjectsV16')||modal._egItems)return;
 const old=source||modal._restoredExamV61||{};modal._egItems=G.snapshot(old);modal._egSource=old;
 function collect(){
  modal.querySelectorAll('.eg-editor [data-eg-key]').forEach(el=>{let k=el.dataset.egKey;modal._egItems[k]=readFields(el,modal._egItems[k]);});
 }
 modal._egCollect=collect;
 function add(card,key,anchor,score,max,target){
  if(!card||!anchor||card.querySelector(':scope > .eg-editor'))return;
  const g=modal._egItems[key]||{},d=document.createElement('details');d.className='eg-editor';d.innerHTML='<summary>考试目标（选填） <span class="eg-muted">'+esc(summary(g))+'</span></summary>'+fields(key,g,score,max);
  if(target){const label=document.createElement('div');label.className='eg-sub-score';target.querySelector('label').textContent='目标分';label.append(target);d.insertBefore(label,d.children[1]);}
  card.append(d);
  d.addEventListener('input',()=>{collect();const tg=d.querySelector('.target-v16'),next=modal._egItems[key]||{};if(tg&&tg.value!==''){next.score=tg.value;next.max=val(card,'.max-v16');}d.querySelector('summary span').textContent=summary(next);});
 }
 function refresh(){
  if(!modal.isConnected)return;
  modal.querySelectorAll('.exam-subject-card-v10').forEach(card=>{
   const name=val(card,'.exam-subject-name-v10').trim(),target=card.querySelector('.target-box-v14');if(!name)return;
   add(card,'s:'+name,card.querySelector('.score-compact-v14'),false,null,target);
  });
  const total=modal.querySelector('.combo-total-v21');
  if(total)add(total,'total',total,true,Array.from(modal.querySelectorAll('.max-v16')).reduce((v,n)=>v+(Number(n.value)||0),0));
  modal.querySelectorAll('.combo-card-v21').forEach(card=>{let m=(state.modulesV18||[]).find(x=>String(x.id)===card.dataset.comboId);if(m)add(card,'m:'+m.id,card,true,(m.subjects||[]).reduce((v,n)=>v+Number(Array.from(modal.querySelectorAll('.exam-subject-card-v10')).find(c=>val(c,'.exam-subject-name-v10')===n)?.querySelector('.max-v16')?.value||0),0));});
 }
 refresh();let root=modal.querySelector('#examSubjectsV16'),combos=modal.querySelector('#comboListV21');
 let observer=new MutationObserver(()=>{if(!modal.isConnected){observer.disconnect();return;}refresh();});[root,combos].filter(Boolean).forEach(el=>observer.observe(el,{childList:true}));
 if(G.pending(old)){const hidden=modal.querySelector('#examHiddenV16');if(hidden)hidden.value='0';const h=modal.querySelector('.modal-head h3');if(h)h.textContent='录入考试成绩';const b=modal.querySelector('.save-btn');if(b)b.textContent='保存成绩';}
}
const beforeOpen=openExam;openExam=function(exam){const r=beforeOpen.apply(this,arguments);decorate(state.modal,exam||state.modal?._restoredExamV61);return r;};
function metadata(modal,exam){
 if(!modal?._egItems)return null;modal._egCollect();
 const items={};for(const [k,g] of Object.entries(modal._egItems)){
  if(k==='total'||k.startsWith('s:')&&Object.prototype.hasOwnProperty.call(exam.scores||{},k.slice(2))||k.startsWith('m:')&&(exam.moduleIds||[]).includes(k.slice(2)))items[k]={...g};
 }
 for(const [name,row] of Object.entries(exam.scores||{})){const k='s:'+name;if(G.num(row.target)!==null)items[k]={...items[k],score:row.target,max:row.max};else if(items[k]){delete items[k].score;delete items[k].max;}}
 return {planned:!!modal._egSource?.exam_goals?.planned,items:G.cleanItems(items,exam)};
}
const beforeApi=dataApiV7;dataApiV7=function(action,payload){
 const modal=state.modal;if(action==='save_exam'&&payload?.exam&&modal?._egItems){
  const e=payload.exam,meta=metadata(modal,e);
  if(G.pending(modal._egSource)&&!G.actual(e)&&!Array.from(modal.querySelectorAll('.combo-yr-v25,.combo-cr-v25,.total-actual-override-v24,.total-raw-override-v24')).some(n=>G.num(n.value)!==null))throw Error('请至少录入一项实际成绩或排名');
  if(meta){if(!available()&&Object.entries(meta.items).some(([k,g])=>k==='total'||k.startsWith('m:')||G.num(g.rank)!==null))throw Error('新版目标后端尚未启用，排名目标及独立总分目标暂不能保存');if(available())e.exam_goals=meta;}
 }
 const result=(action==='list_exams'||action==='bootstrap')?beforeApi.call(this,action,{...payload,exam_goal_version:1}):beforeApi.apply(this,arguments);
 if(action==='list_exams'||action==='bootstrap')return Promise.resolve(result).then(data=>{supported=data?.examGoalVersion===1;apiOwner=String(data?.user?.id||state.user?.id||state.user?.username||'');return data;});
 return result;
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-eg-plan],[data-eg-fill],[data-eg-new]');if(!b)return;
 if(b.hasAttribute('data-eg-fill')){const ex=find(b.dataset.egFill);if(ex)openExam(ex);return;}
 const ex=b.hasAttribute('data-eg-plan')?find(b.dataset.egPlan):null;planDialog(ex);
});
const css=document.createElement('style');css.textContent=
'.eg-row{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap}.eg-muted,.eg-metrics small{font-size:12px;color:var(--muted)}.eg-metrics{display:flex;gap:18px;padding:12px 0}.eg-metrics>div{flex:1}.eg-metrics strong{display:block;font-size:23px;font-variant-numeric:tabular-nums;margin-top:4px}.eg-pending-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin:10px 0 18px}.eg-pending p{margin:5px 0}.eg-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 8px}.eg-section-head h3{font-size:15px}.eg-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}.eg-inputs label{font-size:12px;color:var(--muted);min-width:0}.eg-inputs input,.eg-inputs select{width:100%;min-width:0;margin-top:4px}.eg-editor{margin-top:10px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px}.eg-editor summary{cursor:pointer}.eg-editor summary span{margin-left:6px}.eg-plan-row{border-bottom:1px solid var(--line);padding:9px 0}.eg-plan-row>b{font-size:14px}.eg-mode{display:flex;gap:6px;margin:8px 0}.eg-mode button{flex:1;border:1px solid var(--line);border-radius:8px;background:var(--panel-solid);color:var(--text);padding:8px}.eg-mode button.active{color:var(--accent);background:var(--accent-soft)}.eg-choice{display:inline-flex;align-items:center;gap:5px;margin:6px}.eg-plan-modal[data-eg-mode="score"] .eg-inputs label:has([data-eg-rank]),.eg-plan-modal[data-eg-mode="score"] .eg-inputs label:has([data-eg-type]),.eg-plan-modal[data-eg-mode="rank"] .eg-inputs label:has([data-eg-score]),.eg-plan-modal[data-eg-mode="rank"] .eg-inputs label:has([data-eg-max]){display:none}.exam-subject-card-v10:has(.eg-editor) .score-compact-v14{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}.exam-subject-card-v10[data-final-only-v62="1"]:has(.eg-editor) .score-compact-v14{grid-template-columns:minmax(0,1fr)!important}.exam-subject-card-v10:has(.eg-editor) .final-box-v14{grid-column:auto;order:-1}.exam-subject-card-v10:has(.eg-editor) .actual-v16{font-size:20px;font-weight:650}.eg-sub-score .target-box-v14{max-width:180px}.eg-plan-modal .modal{max-width:720px}';
document.head.append(css);
window.ExamGoalLifecycle={pending:G.pending,pendingCard,openPlan:planDialog,metadata,summary,labelRank};
})();