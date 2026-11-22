/* Unit-consistent goal review for records and analysis; no long-term goal changes. */
(function(){
'use strict';
const G=window.ScoreExamGoals;if(!G)return;
const n=G.num,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v)=>n(v)===null?'—':String(Math.round(v*100)/100);
const mods=()=>state.modulesV18||[];
function subjectActual(e,name){const s=e.scores?.[name]||{};return {score:n(s.actual)??(n(s.rawMax)===n(s.max)?n(s.raw):null),max:n(s.max),rank:n(s.rank),people:n(s.participants)??n(e.total_participants),percent:n(s.yearPositionPercent)};}
function groupActual(e,key){
 const total=key==='total',m=total?null:mods().find(x=>String(x.id)===key.slice(2));
 if(!total&&(!m||!(e.moduleIds||[]).map(String).includes(String(m.id))))return {};
 const names=total?Object.keys(e.scores||{}).filter(s=>!e.scores[s].excludeFromTotal):m.subjects||[];
 const rows=names.map(s=>subjectActual(e,s));let max=rows.length&&rows.every(r=>n(r.max)>0)?rows.reduce((a,r)=>a+r.max,0):null;
 const score=(total?n(e.total_actual_score):null)??(rows.length&&rows.every(r=>n(r.score)!==null)?rows.reduce((a,r)=>a+r.score,0):null);
 const rank=m?e.moduleRanks?.[m.id]||{}:{yearRank:e.total_rank,yearParticipants:e.total_participants,yearPositionPercent:e.total_year_position_percent};
 return {score,max,rank:n(rank.yearRank),people:n(rank.yearParticipants)??n(e.total_participants),percent:n(rank.yearPositionPercent)};
}
function goalOf(e,key,original){
 let items=original&&e.exam_goals?.locked?e.exam_goals.locked:G.snapshot(e),g=items[key];
 if(g)return g;
 if(key.startsWith('s:'))return null;
 let names=key==='total'?Object.keys(e.scores||{}).filter(s=>!e.scores[s].excludeFromTotal):mods().find(m=>String(m.id)===key.slice(2))?.subjects||[];
 if(key!=='total'&&!(e.moduleIds||[]).map(String).includes(key.slice(2)))return null;
 if(names.length&&names.every(s=>n(items['s:'+s]?.score)!==null&&n(items['s:'+s]?.max)>0))return {score:names.reduce((a,s)=>a+items['s:'+s].score,0),max:names.reduce((a,s)=>a+items['s:'+s].max,0)};
 return null;
}
function data(exams,key){
 return exams.map(e=>({exam:e,goal:goalOf(e,key,true),actual:key.startsWith('s:')?subjectActual(e,key.slice(2)):groupActual(e,key),origin:e.exam_goals?.origin||'legacy'}));
}
function keys(exams,subjects){
 let set=new Set();if(!subjects||!subjects.length)set.add('total');
 exams.forEach(e=>Object.keys(e.scores||{}).filter(s=>!subjects||!subjects.length||subjects.includes(s)).forEach(s=>set.add('s:'+s)));
 mods().forEach(m=>{if(!subjects||!subjects.length||(m.subjects||[]).length===subjects.length&&subjects.every(s=>m.subjects.includes(s)))set.add('m:'+m.id);});
 return Array.from(set);
}
function name(key){return key==='total'?'总分':key.startsWith('s:')?key.slice(2):mods().find(m=>String(m.id)===key.slice(2))?.name||'组合';}
function goalText(g,k){return k==='score'?fmt(g?.score)+' / '+fmt(g?.max):g?.rankType==='percent'?'前'+fmt(g?.rank)+'%':'前'+fmt(g?.rank)+'名';}
function actualText(r,g,k){if(k==='score')return n(r.score)===null?'待补录':fmt(r.score)+' / '+fmt(r.max);let v=G.rankValue(r,g.rankType);return v===null?'待补录':g.rankType==='percent'?'前'+fmt(v)+'%':'第'+fmt(v)+'名';}
function suggestion(c,k){return k==='score'?fmt(c.suggestion)+' 分'+(c.max?' / '+fmt(c.max):''):c.unit==='percent'?'前'+fmt(c.suggestion)+'%':'前'+fmt(c.suggestion)+'名';}
function rows(exams,subjects){
 const out=[];for(const key of keys(exams,subjects)){const h=data(exams,key);for(const k of ['score','rank']){let c=G.calibrate(h,k);if(c)out.push({key,kind:k,...c});}}return out;
}
function calHtml(exams,subjects){
 const r=rows(exams,subjects);
 return '<div class="card eg-calibration" data-eg-calibration><div class="card-title-row"><div><h3 class="card-title">目标校准</h3></div></div>'+(r.length?'<div class="eg-cal-grid">'+r.map(c=>'<article class="eg-cal-item"><div class="eg-row"><b>'+esc(name(c.key))+' <small class="eg-muted">'+(c.kind==='score'?'分数目标':'排名目标')+'</small></b><span class="eg-muted">'+esc(c.origin==='retro'?'补录目标':c.streak>0?'连续'+c.streak+'场'+(c.met?'达标':'未达标'):'待积累')+'</span></div><div class="eg-cal-values"><div><small>原定目标</small><b>'+esc(goalText(c.goal,c.kind))+'</b></div><div><small>最近实际</small><b>'+esc(actualText(c.actual,c.goal,c.kind))+'</b></div><div><small>'+esc(c.decision)+'</small><strong>'+esc(c.decision==='暂不调整'?'—':suggestion(c,c.kind))+'</strong></div></div><small class="eg-muted">'+esc(c.reason)+'</small></article>').join('')+'</div>':'<p class="eg-muted">尚无可对比的单场考试目标。</p>')+'<details class="eg-guide"><summary>怎么看</summary><div class="eg-guide-grid"><div><b>分数目标</b><p>例如120/150的目标，换成满分100的考试就是80分。按相同得分率比较。</p></div><div><b>排名目标</b><p>目标前100名，实际第82名，即达标；目标前10%，实际前15%，即还差5个百分点。</p></div><div><b>怎样给出建议</b><p>至少三场可比较的目标与实际成绩，才考虑调整。连续达标或未达标，再参考近五场表现。考后补录的目标不用于调整建议。</p></div></div></details></div>';
}
function recap(ex){
 const items=keys([ex]).map(k=>[k,goalOf(ex,k,false)]).filter(x=>x[1]);
 if(!items.length)return '';
 return '<section class="ed-section eg-recap"><div class="ed-section-head"><div><h2>考试目标复盘</h2><p>'+esc(({before_exam:'考前目标',before_results:'成绩前记录',retro:'考后补录',legacy:'来源时间未知'})[ex.exam_goals?.origin||'legacy']||'来源时间未知')+(ex.exam_goals?.changedAfterResults?' · 成绩录入后修改过':'')+'</p></div></div><div class="eg-cal-grid">'+items.flatMap(([key,g])=>['score','rank'].filter(k=>n(k==='score'?g.score:g.rank)!==null).map(k=>{const a=key.startsWith('s:')?subjectActual(ex,key.slice(2)):groupActual(ex,key),r=G.evaluate(g,a,k),status=r?r.met?'已达标':'未达标':'待补录';return '<div class="eg-cal-item"><div class="eg-row"><b>'+esc(name(key))+' · '+(k==='score'?'分数':'排名')+'</b><span class="eg-muted">'+status+'</span></div><div class="eg-cal-values"><div><small>目标</small><b>'+esc(goalText(g,k))+'</b></div><div><small>实际</small><b>'+esc(actualText(a,g,k))+'</b></div></div></div>';})).join('')+'</div></section>';
}
function scope(){
 const cfg=state.sv31||{},v=window.__v32;let exams=(state.allExams||[]).filter(e=>!G.pending(e)&&(cfg.includeHidden||!e.is_hidden));
 exams=v?.scopeFilter?v.scopeFilter(exams,cfg.scope):exams;
 return exams.slice().sort((a,b)=>String(a.exam_date).localeCompare(String(b.exam_date))||String(a.created_at).localeCompare(String(b.created_at)));
}
let queued=false;
function sync(){
 const page=document.querySelector('#content .sv31-page');if(!page||state.page!=='stats')return;
 if(page.dataset.egCalibrated)return;page.dataset.egCalibrated='1';
 const exams=scope(),subjects=state.sv31?.subjMod||null,old=Array.from(page.querySelectorAll(':scope > .card')).find(c=>/目标校准/.test(c.querySelector('.card-title')?.textContent||''));
 const next=document.createElement('div');next.innerHTML=calHtml(exams,subjects);const card=next.firstElementChild;
 if(old)old.replaceWith(card);else page.append(card);
 // The legacy reminder uses a score streak and unrelated rank recommendation.
 // Remove only its exact titles; new recommendations are available in calibration.
 const insightCard=Array.from(page.querySelectorAll(':scope > .card')).find(c=>/智能提醒/.test(c.querySelector('.card-title')?.textContent||''));
 if(insightCard){
  insightCard.querySelectorAll('.sv31-insight').forEach(c=>{if(/的目标该调一调了$|可以再进一步$/.test(c.querySelector('b')?.textContent||''))c.remove();});
  const tag=insightCard.querySelector('.sv31-tag');if(tag)tag.textContent=insightCard.querySelectorAll('.sv31-insight').length+' 条提醒';
 }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
if(window.__v32)window.__v32.calib=(f)=>calHtml((f.exams||[]).filter(e=>!G.pending(e)),f.subjects);
window.ScoreExamGoalReview={calHtml,recap,rows,goalOf,subjectActual,groupActual};
const css=document.createElement('style');css.textContent='.eg-cal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:10px;margin-top:12px}.eg-cal-item{border:1px solid var(--line);border-radius:10px;padding:11px;min-width:0}.eg-cal-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}.eg-cal-values small{display:block;color:var(--muted);font-size:11px;margin-bottom:4px}.eg-cal-values b,.eg-cal-values strong{font-size:14px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.eg-cal-values strong{color:var(--accent)}.eg-guide{margin-top:12px;font-size:12px}.eg-guide summary{color:var(--accent);cursor:pointer}.eg-guide-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:8px;margin-top:8px}.eg-guide-grid>div{padding:9px;border:1px solid var(--line);border-radius:8px}.eg-guide-grid p{font-size:12px;line-height:1.6;margin:5px 0 0}';document.head.append(css);
function boot(){let app=document.getElementById('app')||document.body;new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();