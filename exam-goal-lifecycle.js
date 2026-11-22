/* Exam planning and post-exam entry. Reuse the production score editor. */
(function(){
'use strict';
const G=window.ScoreExamGoals;if(!G)return;
let supported=false,apiOwner=null;
function available(){return supported&&apiOwner===state.token;}
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
 const original=ex||null,items=G.snapshot(ex||{}),cfg=state.subjectConfigs||[],owner=state.token;
 const scores=Object.fromEntries((ex?Object.entries(ex.scores||{}):cfg.map(s=>[s.name,{max:s.defaultMax||100}])).map(([n,s])=>[n,{...s}]));
 const modIds=new Set((ex?.moduleIds||[]).map(String)),mods=state.modulesV18||[];
 let selected=new Set(Object.keys(scores)),mode=Object.values(items).some(g=>G.num(g.rank)!==null)?(Object.values(items).some(g=>G.num(g.score)!==null)?'both':'rank'):'score';
 const draft={};Object.entries(items).forEach(([k,g])=>{draft[k]={...g};});
 const modal=document.createElement('div');modal.className='modal-backdrop eg-plan-modal';
 modal.innerHTML='<form class="modal eg-plan-sheet" role="dialog" aria-modal="true" aria-labelledby="egPlanTitle"><div class="modal-head"><h3 id="egPlanTitle">'+(ex?'编辑考试目标':'设置考试目标')+'</h3><button type="button" class="close-btn" aria-label="关闭">×</button></div><div class="modal-body eg-plan-body"><div class="form-grid eg-meta"><div class="field eg-name"><label for="egName">考试名称</label><input id="egName" maxlength="60" value="'+esc(ex?.name)+'" placeholder="例如：期末考试" required></div><div class="field"><label for="egDate">预计考试日期</label><input id="egDate" type="date" value="'+esc(ex?.exam_date||today())+'" required></div><div class="field"><label for="egCategory">考试分类</label><select id="egCategory" class="grade-select-v13"></select></div></div><div class="eg-section-head"><h4>考试目标</h4><span class="eg-muted">选填</span></div><div class="eg-mode" role="group" aria-label="目标录入方式"><button type="button" data-eg-mode="score">分数</button><button type="button" data-eg-mode="rank">排名</button><button type="button" data-eg-mode="both">两者</button></div><div class="eg-plan-table"><div class="eg-plan-labels"><span>科目</span><span class="eg-score-col">目标分 / 满分</span><span class="eg-rank-col">目标年排</span></div><div id="egSubjects"></div><div id="egTotal"></div></div><details class="eg-options"><summary>选择科目</summary><div id="egPick"></div></details><details class="eg-options"><summary>组合目标（选填）</summary><div id="egModules"></div></details><p class="eg-muted eg-plan-hint">考后打开同一条记录补录成绩。排名目标单独填写。</p></div><div class="eg-plan-footer"><p id="egError" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary cancel-btn">取消</button><button type="submit" class="primary save-btn">保存考试目标</button></div></div></form>';
 document.body.append(modal);state.modal=modal;
 const form=modal.querySelector('form'),select=modal.querySelector('#egCategory'),list=modal.querySelector('#egSubjects'),total=modal.querySelector('#egTotal'),modules=modal.querySelector('#egModules'),pick=modal.querySelector('#egPick'),error=modal.querySelector('#egError'),save=modal.querySelector('.save-btn');
 const categories=Array.from(new Set(['',...(typeof categoryOptionsV14==='function'?categoryOptionsV14():[]),ex?.grade_level||'']));
 categories.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n||'未分类';select.append(o);});
 const latest=(state.allExams||[]).filter(e=>!G.pending(e)).slice().sort((a,b)=>String(b.exam_date||'').localeCompare(String(a.exam_date||'')))[0];
 select.value=ex?ex.grade_level||'':latest?.grade_level||'';
 function setError(message){error.hidden=!message;error.textContent=message||'';}
 function itemFields(k,g,max,caption){
  g=g||{};const unit=g.rankType==='percent'?'percent':'number';
  return '<div class="eg-plan-row" data-eg-key="'+esc(k)+'"><b>'+esc(caption)+'</b><div class="eg-score-col eg-score-pair"><input aria-label="'+esc(caption)+'目标分" data-eg-score inputmode="decimal" placeholder="—" value="'+esc(g.score)+'"><span>/</span><input aria-label="'+esc(caption)+'满分" data-eg-max inputmode="decimal" value="'+esc(g.max??max)+'"></div><div class="eg-rank-col eg-rank-pair"><select aria-label="'+esc(caption)+'排名单位" data-eg-type><option value="number" '+(unit==='number'?'selected':'')+'>名</option><option value="percent" '+(unit==='percent'?'selected':'')+'>前%</option></select><input aria-label="'+esc(caption)+'排名目标" data-eg-rank inputmode="'+(unit==='number'?'numeric':'decimal')+'" placeholder="—" value="'+esc(g.rank)+'"></div></div>';
 }
 function read(){
  modal.querySelectorAll('[data-eg-key]').forEach(el=>{const key=el.dataset.egKey,g=readFields(el,draft[key]);g.max=val(el,'[data-eg-max]');draft[key]=g;});
 }
 function sumMax(names){return names.reduce((v,n)=>v+(G.num(draft['s:'+n]?.max)??G.num(scores[n]?.max)??100),0);}
 function updateTotals(){
  const selectedNames=Array.from(selected).filter(n=>!scores[n]?.excludeFromTotal);
  const row=total.querySelector('[data-eg-key="total"]');if(!row)return;
  const input=row.querySelector('[data-eg-max]');if(input&&!input.dataset.manual)input.value=sumMax(selectedNames)||1;
  const score=row.querySelector('[data-eg-score]');if(score){const vals=selectedNames.map(n=>G.num(val(list.querySelector('[data-eg-key="'+CSS.escape('s:'+n)+'"]'),'[data-eg-score]')));score.placeholder=vals.length&&vals.every(v=>v!==null)?String(Math.round(vals.reduce((a,v)=>a+v,0)*100)/100)+'（自动）':'自动';}
 }
 function setMode(v){mode=v;modal.dataset.egMode=v;modal.querySelectorAll('[data-eg-mode]').forEach(b=>{const active=b.dataset.egMode===v;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
 function draw(){
  list.innerHTML=Array.from(selected).map(n=>itemFields('s:'+n,draft['s:'+n],scores[n]?.max||100,n)).join('');
  pick.innerHTML=Array.from(new Set([...cfg.map(s=>s.name),...Object.keys(scores)])).map(n=>'<label class="eg-choice"><input type="checkbox" data-eg-sub="'+esc(n)+'" '+(selected.has(n)?'checked':'')+'>'+esc(n)+'</label>').join('');
  const names=Array.from(selected).filter(n=>!scores[n]?.excludeFromTotal);
  total.innerHTML=itemFields('total',draft.total,sumMax(names)||1,'总分');
  if(draft.total?.score!=null&&draft.total?.max!=null)total.querySelector('[data-eg-max]').dataset.manual='1';
  modules.innerHTML=mods.map(m=>'<div class="eg-module-row"><label class="eg-choice"><input type="checkbox" data-eg-module="'+esc(m.id)+'" '+(modIds.has(String(m.id))?'checked':'')+'>'+esc(m.name)+'</label>'+(modIds.has(String(m.id))?itemFields('m:'+m.id,draft['m:'+m.id],sumMax(m.subjects||[])||1,'组合'):'')+'</div>').join('');
  setMode(mode);updateTotals();
 }
 let busy=false;
 function close(){if(busy)return;modal.remove();if(state.modal===modal)state.modal=null;}
 modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();const b=e.target.closest('[data-eg-mode]');if(b){setMode(b.dataset.egMode);}});
 modal.addEventListener('input',e=>{setError('');if(e.target.matches('#egTotal [data-eg-max]'))e.target.dataset.manual='1';else if(e.target.matches('#egSubjects [data-eg-score],#egSubjects [data-eg-max]')){read();updateTotals();}});
 modal.addEventListener('change',ev=>{
  const t=ev.target;
  if(t.matches('[data-eg-type]')){
   const row=t.closest('[data-eg-key]'),input=row.querySelector('[data-eg-rank]'),previous=input.dataset.unit||draft[row.dataset.egKey]?.rankType||'number';
   const memo=input._egRanks||{};memo[previous]=input.value;input.value=memo[t.value]??'';input._egRanks=memo;input.dataset.unit=t.value;input.inputMode=t.value==='number'?'numeric':'decimal';read();return;
  }
  if(t.hasAttribute('data-eg-sub')||t.hasAttribute('data-eg-module')){read();const isSub=t.hasAttribute('data-eg-sub'),key=isSub?t.dataset.egSub:t.dataset.egModule,set=isSub?selected:modIds;if(t.checked){set.add(key);if(isSub&&!scores[key])scores[key]={max:cfg.find(s=>s.name===key)?.defaultMax||100};}else set.delete(key);draw();}
 });
 form.addEventListener('invalid',e=>{setError(e.target.id==='egName'?'请填写考试名称':'请填写考试日期');},true);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;setError('');
  try{
   if(!owner||state.token!==owner)throw Error('账号已切换，请重新打开窗口');
   read();const next={...(original||{}),name:val(modal,'#egName').trim(),exam_date:val(modal,'#egDate'),grade_level:select.value,scores:{},moduleIds:Array.from(modIds),moduleRanks:original?.moduleRanks||{},is_hidden:!!original?.is_hidden};
   if(!next.name||!next.exam_date||!selected.size)throw Error('请填写考试名称、日期并选择科目');
   const clean={};
   for(const name of selected){const g=draft['s:'+name]||{},row={...scores[name]};const max=G.num(g.max);if(max===null||max<=0||max>99999)throw Error(name+'：请输入有效满分');
    if(!original||G.pending(original)){row.max=max;row.rawMax=max;}if(g.score!=null&&g.score!==''){row.target=g.score;clean['s:'+name]={...g,max};}else{row.target=null;if(g.rank!=null&&g.rank!=='')clean['s:'+name]={rank:g.rank,rankType:g.rankType};}next.scores[name]=row;
   }
   if(draft.total)clean.total=draft.total;for(const id of modIds){if(draft['m:'+id])clean['m:'+id]=draft['m:'+id];}
   next.exam_goals={planned:!original||G.pending(original),items:G.cleanItems(clean,next)};
   if(!Object.keys(next.exam_goals.items).length)throw Error('请至少填写一个分数或排名目标');
   busy=true;save.disabled=true;save.textContent='保存中…';
   // Dedicated plan submission does not read fields from the actual-score modal
   // wrappers or clear an unrelated unsaved score draft.
   const request=async(action,payload)=>{const res=await fetch(DATA_API_V7,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:owner,...payload})});const result=await res.json().catch(()=>({error:'网络响应异常'}));if(!res.ok||result.error)throw Error(result.error||'保存失败，请重试');return result;};
   if(!available()){const cap=await request('list_exams',{exam_goal_version:1});if(cap.examGoalVersion!==1)throw Error('新版目标服务暂不可用');supported=true;apiOwner=owner;}
   const result=await request('save_exam',{exam:next});if(!result.ok)throw Error('保存失败，请重试');
   busy=false;close();try{await loadExams();render();toast('考试目标已保存');}catch(_){toast('目标已保存，刷新页面查看');}
  }catch(err){busy=false;save.disabled=false;save.textContent='保存考试目标';setError(err.message||'保存失败，请重试');}
 });
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
 const requestOwner=state.token;
 const result=(action==='list_exams'||action==='bootstrap')?beforeApi.call(this,action,{...payload,exam_goal_version:1}):beforeApi.apply(this,arguments);
 if(action==='list_exams'||action==='bootstrap')return Promise.resolve(result).then(data=>{supported=data?.examGoalVersion===1;apiOwner=requestOwner;return data;});
 return result;
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-eg-plan],[data-eg-fill],[data-eg-new]');if(!b)return;
 if(b.hasAttribute('data-eg-fill')){const ex=find(b.dataset.egFill);if(ex)openExam(ex);return;}
 const ex=b.hasAttribute('data-eg-plan')?find(b.dataset.egPlan):null;planDialog(ex);
});
const css=document.createElement('style');css.textContent=
'.eg-row{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap}.eg-muted,.eg-metrics small{font-size:12px;color:var(--muted)}.eg-metrics{display:flex;gap:18px;padding:12px 0}.eg-metrics>div{flex:1}.eg-metrics strong{display:block;font-size:23px;font-variant-numeric:tabular-nums;margin-top:4px}.eg-pending-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin:10px 0 18px}.eg-pending p{margin:5px 0}.eg-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 8px}.eg-section-head h3{font-size:15px}.eg-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}.eg-inputs label{font-size:12px;color:var(--muted);min-width:0}.eg-inputs input,.eg-inputs select{width:100%;min-width:0;margin-top:4px}.eg-editor{margin-top:10px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px}.eg-editor summary{cursor:pointer}.eg-editor summary span{margin-left:6px}.eg-plan-row{border-bottom:1px solid var(--line);padding:9px 0}.eg-plan-row>b{font-size:14px}.eg-mode{display:flex;gap:6px;margin:8px 0}.eg-mode button{flex:1;border:1px solid var(--line);border-radius:8px;background:var(--panel-solid);color:var(--text);padding:8px}.eg-mode button.active{color:var(--accent);background:var(--accent-soft)}.eg-choice{display:inline-flex;align-items:center;gap:5px;margin:6px}.eg-plan-modal[data-eg-mode="score"] .eg-inputs label:has([data-eg-rank]),.eg-plan-modal[data-eg-mode="score"] .eg-inputs label:has([data-eg-type]),.eg-plan-modal[data-eg-mode="rank"] .eg-inputs label:has([data-eg-score]),.eg-plan-modal[data-eg-mode="rank"] .eg-inputs label:has([data-eg-max]){display:none}.exam-subject-card-v10:has(.eg-editor) .score-compact-v14{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}.exam-subject-card-v10[data-final-only-v62="1"]:has(.eg-editor) .score-compact-v14{grid-template-columns:minmax(0,1fr)!important}.exam-subject-card-v10:has(.eg-editor) .final-box-v14{grid-column:auto;order:-1}.exam-subject-card-v10:has(.eg-editor) .actual-v16{font-size:20px;font-weight:650}.eg-sub-score .target-box-v14{max-width:180px}.eg-plan-modal .modal{max-width:720px}';
css.textContent+="\n.eg-plan-modal{align-items:center;justify-items:center}.eg-plan-modal .eg-plan-sheet{display:flex;flex-direction:column;width:min(720px,100%);max-height:min(92dvh,900px);overflow:hidden;background:var(--panel-solid,#fff);color:var(--text,#18212f)}.eg-plan-modal .modal-head{flex:none;background:var(--panel-solid,#fff)}.eg-plan-modal .eg-plan-body{overflow:auto;min-height:0;overscroll-behavior:contain;padding-bottom:14px}.eg-plan-footer{flex:none;padding:12px 20px;border-top:1px solid var(--line);background:var(--panel-solid,#fff)}.eg-plan-footer .modal-actions{margin:0}.eg-plan-footer #egError{font-size:12px;color:var(--red,#c34b59);margin:0 0 9px;line-height:1.5}.eg-plan-footer #egError[hidden]{display:none!important}.eg-meta{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.eg-meta .eg-name{grid-column:1/-1}.eg-meta input,.eg-meta select,.eg-plan-row input,.eg-plan-row select{box-sizing:border-box;width:100%;min-width:0;max-width:100%;height:38px;padding:7px 9px;font:inherit;font-size:14px;border:1px solid var(--line,#dfe3e9);border-radius:8px;background:var(--panel-solid,#fff);color:var(--text,#18212f)}.eg-meta input[type=date]{display:block;-webkit-appearance:none;text-align:left}.eg-meta input[type=date]::-webkit-date-and-time-value{text-align:left}.eg-plan-modal h4{margin:0;font-size:15px}.eg-plan-modal .eg-mode{padding:3px;border-radius:10px;background:var(--accent-soft,#eef1ff);gap:2px;margin:8px 0 12px}.eg-plan-modal .eg-mode button{border:0;background:transparent;padding:9px;color:var(--muted,#788392)}.eg-plan-modal .eg-mode button.active{background:var(--panel-solid,#fff);color:var(--accent,#6375dc);font-weight:700;box-shadow:0 1px 4px #00000012}.eg-plan-table{border:1px solid var(--line);border-radius:12px;padding:0 10px}.eg-plan-labels,.eg-plan-modal .eg-plan-row{display:grid;grid-template-columns: minmax(50px,.65fr) minmax(0,1.4fr) minmax(0,1.35fr);align-items:center;gap:8px;padding:8px 0}.eg-plan-labels{font-size:11px;color:var(--muted);border-bottom:1px solid var(--line)}.eg-plan-modal .eg-plan-row>b{font-size:13px;overflow-wrap:anywhere}.eg-plan-modal .eg-plan-row{border-bottom:1px solid var(--line)}.eg-plan-modal #egTotal .eg-plan-row{border-bottom:0;border-top:1px solid var(--line);font-weight:650}.eg-score-pair,.eg-rank-pair{display:flex;align-items:center;gap:4px;min-width:0}.eg-score-pair [data-eg-score]{flex:1.35}.eg-score-pair [data-eg-max]{flex:1}.eg-score-pair span{color:var(--muted)}.eg-rank-pair select{width:60px;flex:none;font-size:12px;padding:4px}.eg-rank-pair input{flex:1}.eg-plan-modal[data-eg-mode=score] .eg-rank-col,.eg-plan-modal[data-eg-mode=rank] .eg-score-col{display:none!important}.eg-plan-modal[data-eg-mode=score] :is(.eg-plan-labels,.eg-plan-row),.eg-plan-modal[data-eg-mode=rank] :is(.eg-plan-labels,.eg-plan-row){grid-template-columns:minmax(65px,.6fr) minmax(0,1.4fr)}.eg-options{margin:12px 0;border-top:1px solid var(--line);padding-top:9px}.eg-options summary{font-size:13px;cursor:pointer}.eg-options #egPick{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:5px}.eg-options .eg-choice{font-size:13px;gap:5px;margin:5px 0}.eg-options .eg-choice input{width:16px;height:16px;accent-color:var(--accent)}.eg-module-row{border-bottom:1px solid var(--line);padding:6px 0}.eg-module-row .eg-plan-row{border:0}.eg-plan-hint{line-height:1.55;margin:8px 0 0}.eg-editor .eg-inputs select,.eg-editor .eg-inputs input{box-sizing:border-box;min-width:0;max-width:100%;border:1px solid var(--line);border-radius:8px;background:var(--panel-solid,#fff);color:var(--text);padding:8px;font:inherit}.eg-editor summary{font-size:12px;font-weight:500}.eg-editor .target-box-v14{display:block!important}.eg-editor .eg-sub-score{margin-top:7px}.eg-editor .eg-sub-score .target-box-v14{max-width:none}.eg-editor .eg-sub-score input{width:100%}\n@media(max-width:620px){.eg-plan-modal{padding:8px;align-items:center}.eg-plan-modal .eg-plan-sheet{max-height:calc(100dvh - 22px);border-radius:20px}.eg-plan-modal .modal-head,.eg-plan-modal .eg-plan-body{padding-left:14px;padding-right:14px}.eg-plan-footer{padding:10px 14px max(10px,env(safe-area-inset-bottom))}.eg-plan-footer .modal-actions{display:flex;gap:8px}.eg-plan-footer .save-btn{flex:1}.eg-meta{gap:8px}.eg-plan-labels,.eg-plan-modal .eg-plan-row{gap:5px}.eg-plan-modal[data-eg-mode=both] .eg-plan-labels,.eg-plan-modal[data-eg-mode=both] .eg-plan-row{grid-template-columns: minmax(38px,.55fr) minmax(0,1.5fr) minmax(0,1.5fr)}.eg-plan-row input,.eg-plan-row select{padding:6px 5px;font-size:13px}.eg-rank-pair select{width:49px}.eg-plan-table{padding:0 8px}.eg-plan-modal .eg-meta input,.eg-plan-modal .eg-meta select{font-size:16px}.eg-plan-row input{font-size:16px}}@media(max-width:365px){.eg-plan-modal[data-eg-mode=both] .eg-plan-labels{display:none}.eg-plan-modal[data-eg-mode=both] .eg-plan-row{grid-template-columns:38px minmax(0,1fr)}.eg-plan-modal[data-eg-mode=both] .eg-rank-pair{grid-column:2}}";
document.head.append(css);
window.ExamGoalLifecycle={pending:G.pending,pendingCard,openPlan:planDialog,metadata,summary,labelRank};
})();