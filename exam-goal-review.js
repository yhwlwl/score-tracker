/* Unit-consistent goal review for records and analysis; no long-term goal changes. */
(function(){
'use strict';
const G=window.ScoreExamGoals;if(!G)return;
const n=G.num,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v)=>n(v)===null?'—':String(Math.round(v*100)/100);
const mods=()=>state.modulesV18||[];
function subjectActual(e,name){return G.measured(e,'s:'+name,mods());}
function groupActual(e,key){return G.measured(e,key,mods());}
function goalOf(e,key,original){return G.goalFor(e,key,mods(),original);}
function data(exams,key){
 return exams.filter(e=>!G.pending(e)).slice().sort((a,b)=>String(a.exam_date||'').localeCompare(String(b.exam_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''))).map(e=>({exam:e,goal:goalOf(e,key,true),currentGoal:goalOf(e,key,false),actual:G.measured(e,key,mods()),origin:e.exam_goals?.origin||'legacy'}));
}
function keys(exams,subjects){
 let set=new Set();if(!subjects||!subjects.length)set.add('total');
 exams.forEach(e=>Object.keys(e.scores||{}).filter(s=>!subjects||!subjects.length||subjects.includes(s)).forEach(s=>set.add('s:'+s)));
 mods().forEach(m=>{if(!subjects||!subjects.length||String(m.id)===String(state.sv31?.subjModule||''))set.add('m:'+m.id);});
 return Array.from(set);
}
function name(key){return key==='total'?'总分':key.startsWith('s:')?key.slice(2):mods().find(m=>String(m.id)===key.slice(2))?.name||'组合';}
function goalText(g,k){return k==='score'?fmt(g?.score)+' / '+fmt(g?.max):g?.rankType==='percent'?'前'+fmt(g?.rank)+'%':'前'+fmt(g?.rank)+'名';}
function actualText(r,g,k){if(k==='score')return n(r.score)===null?'待补录':fmt(r.score)+' / '+fmt(r.max);let v=G.rankValue(r,g.rankType);return v===null?'待补录':g.rankType==='percent'?'前'+fmt(v)+'%':'第'+fmt(v)+'名';}
function suggestion(c,k){return k==='score'?fmt(c.suggestion)+' 分'+(c.max?' / '+fmt(c.max):''):c.unit==='percent'?'前'+fmt(c.suggestion)+'%':'前'+fmt(c.suggestion)+'名';}
function rows(exams,subjects){
 const out=[];for(const key of keys(exams,subjects)){const h=data(exams,key);for(const k of ['score','rank']){const property=k==='score'?'score':'rank';const series=h.map(x=>n(x.goal?.[property])===null&&n(x.currentGoal?.[property])!==null?{...x,goal:x.currentGoal,origin:'retro'}:x);let c=G.calibrate(series,k);if(c)out.push({key,kind:k,...c});}}return out;
}
let selectedKind='score',selectedOwner=null;
function choice(r){
 if(selectedOwner!==state.token){selectedOwner=state.token;selectedKind=r.some(c=>c.kind==='score')?'score':'rank';}
 return selectedKind;
}
function status(c){if(c.actualMissing)return '待补录';if(c.origin==='retro')return '补录目标';if(c.streak)return '连续'+c.streak+'场'+(c.met?'达标':'未达标');return '待积累';}
function statusClass(c){return c.actualMissing||c.origin==='retro'||!c.streak?'neutral':c.met?'good':'warn';}
function values(c){
 const k=c.kind,same=k==='score'&&n(c.actual.max)>0&&n(c.goal.max)===n(c.actual.max);
 const unit=same?'分':'';
 const target=same?fmt(c.goal.score)+unit:goalText(c.goal,k);
 const actual=same?(n(c.actual.score)===null?'待补录':fmt(c.actual.score)+unit):actualText(c.actual,c.goal,k);
 const hint=c.decision==='待补录'||c.decision==='暂不调整'?'—':same?fmt(c.suggestion)+unit:suggestion(c,k);
 return {target,actual,hint};
}
function ruler(c){
 if(c.actualMissing||n(c.suggestion)===null||['暂不调整','待补录'].includes(c.decision))return '';
 const k=c.kind,clamp=x=>Math.max(0,Math.min(100,x));
 let goal,actual,advice;
 if(k==='score'&&n(c.goal.max)>0&&n(c.actual.max)>0){goal=c.goal.score/c.goal.max*100;actual=c.actual.score/c.actual.max*100;advice=c.suggestion/c.goal.max*100;}
 else if(k==='rank'&&c.unit==='percent'){goal=100-c.goal.rank;actual=100-G.rankValue(c.actual,'percent');advice=100-c.suggestion;}
 else if(k==='rank'&&c.referencePeople>0){goal=100-c.goal.rank/c.referencePeople*100;actual=100-c.actual.rank/c.referencePeople*100;advice=100-c.suggestion/c.referencePeople*100;}
 else return '';
 if(![goal,actual,advice].every(Number.isFinite))return '';
 return '<div class="eg-ruler" aria-label="实际表现、原定目标和建议目标位置"><div class="eg-ruler-track"><i class="eg-ruler-fill" style="width:'+clamp(actual)+'%"></i><i class="eg-ruler-target" style="left:'+clamp(goal)+'%"></i><i class="eg-ruler-advice" style="left:'+clamp(advice)+'%"></i></div></div>';
}
function card(c){const v=values(c);return '<article class="eg-cal-item"><div class="eg-row"><b>'+esc(name(c.key))+'</b><span class="eg-status '+statusClass(c)+'">'+esc(status(c))+'</span></div><div class="eg-cal-values"><div><small>原定目标</small><b>'+esc(v.target)+'</b></div><div><small>最近实际</small><b>'+esc(v.actual)+'</b></div><div><small>建议目标</small><strong>'+esc(v.hint)+'</strong></div></div>'+ruler(c)+'<p class="eg-cal-reason">'+esc(c.reason)+'</p></article>';}
function table(rs){return '<div class="eg-cal-table-wrap"><table class="eg-cal-table"><thead><tr><th>科目</th><th>原定目标</th><th>最近实际</th><th>最近战绩</th><th>建议目标</th><th>调整建议</th></tr></thead><tbody>'+rs.map(c=>{const v=values(c);return '<tr><th>'+esc(name(c.key))+'</th><td>'+esc(v.target)+'</td><td>'+esc(v.actual)+'</td><td><span class="eg-status '+statusClass(c)+'">'+esc(status(c))+'</span></td><td><strong>'+esc(v.hint)+'</strong></td><td><b class="eg-decision">'+esc(c.decision)+'</b><span class="eg-table-reason">'+esc(c.reason)+'</span></td></tr>';}).join('')+'</tbody></table></div>';}
function calHtml(exams,subjects){
 const all=rows(exams,subjects),kind=choice(all);
 const panel=k=>{const rs=all.filter(c=>c.kind===k);return '<div data-eg-cal-panel="'+k+'" '+(kind===k?'':'hidden')+'>'+(rs.length?'<div class="eg-cal-mobile">'+rs.map(card).join('')+'</div>'+table(rs):'<div class="eg-cal-empty">还没有可复盘的'+(k==='score'?'分数':'排名')+'目标。设置单场考试目标后，即可查看达标情况。</div>')+'</div>';};
 return '<div class="card eg-calibration" data-eg-calibration><div class="card-title-row eg-cal-head"><div><h3 class="card-title">目标校准</h3></div><div class="eg-cal-tabs" role="group" aria-label="目标类型">'+[['score','分数'],['rank','排名']].map(([k,l])=>'<button type="button" data-eg-cal-kind="'+k+'" aria-pressed="'+(k===kind)+'" class="'+(k===kind?'active':'')+'">'+l+'</button>').join('')+'</div></div>'+panel('score')+panel('rank')+'<details class="eg-guide"><summary>怎么看</summary><div class="eg-guide-grid"><div><b>看分数和排名</b><p>120/150与80/100是同一得分率。目标前100名，实际第82名，就算达标。</p></div><div><b>看进度条</b><div class="eg-key"><i class="eg-key-fill"></i>实际 <i class="eg-key-target"></i>原定目标 <i class="eg-key-advice"></i>建议目标</div><p>越靠右代表表现越好。不同满分和参考人数按比例比较。</p></div><div><b>下次怎么定</b><p>至少3场可比较记录；参考近5场的典型成绩、最好表现与起伏。偶尔一次没达到，不立即放宽。考后补录只做复盘。</p></div></div></details></div>';
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-eg-cal-kind]');if(!btn)return;const card=btn.closest('[data-eg-calibration]');if(!card)return;
 selectedKind=btn.dataset.egCalKind;selectedOwner=state.token;
 card.querySelectorAll('[data-eg-cal-kind]').forEach(b=>{const active=b.dataset.egCalKind===selectedKind;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 card.querySelectorAll('[data-eg-cal-panel]').forEach(p=>p.hidden=p.dataset.egCalPanel!==selectedKind);
});
function recap(ex){
 const items=keys([ex],null).map(k=>[k,goalOf(ex,k,false)]).filter(x=>x[1]);if(!items.length)return '';
 const meta=ex.exam_goals,src=({before_exam:'考前目标',before_results:'成绩前记录',retro:'考后补录',legacy:'来源时间未知'})[meta?.origin||'legacy'];
 return '<section class="ed-section eg-recap"><div class="ed-section-head"><div><h2>考试目标复盘</h2><p>'+esc(src||'来源时间未知')+(meta?.changedAfterResults?' · 成绩录入后修改过':'')+'</p></div></div><div class="eg-recap-grid">'+items.map(([key,g])=>{const a=key.startsWith('s:')?subjectActual(ex,key.slice(2)):groupActual(ex,key);
  return '<article class="eg-cal-item"><b>'+esc(name(key))+'</b>'+['score','rank'].filter(k=>n(k==='score'?g.score:g.rank)!==null).map(k=>{const r=G.evaluate(g,a,k),diff=r?Math.abs(r.gap):null,unit=k==='score'?(n(g.max)===n(a.max)?'分':'个百分点'):g.rankType==='number'?'名':'个百分点';let result=!r?'待补录':r.met?'已达标':'还差'+fmt(diff)+unit;
   return '<div class="eg-recap-row"><div><small class="eg-muted">'+(k==='score'?'分数目标':'排名目标')+' · '+esc(goalText(g,k))+'</small><strong>'+esc(actualText(a,g,k))+'</strong></div><span class="eg-status '+(!r?'neutral':r.met?'good':'warn')+'">'+esc(result)+'</span></div>';}).join('')+'</article>';}).join('')+'</div></section>';
}
window.ScoreExamGoalReview={calHtml,recap,rows,goalOf,subjectActual,groupActual,name,suggestion};
const css=document.createElement('style');css.textContent=".eg-calibration{container-type:inline-size}.eg-calibration [hidden]{display:none!important}.eg-cal-head{display:flex!important;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap}.eg-cal-tabs{display:flex;gap:3px;padding:3px;border-radius:9px;background:var(--accent-soft,#eef1ff);margin-left:auto}.eg-cal-tabs button{border:0;border-radius:7px;background:transparent;color:var(--muted,#788392);font:inherit;font-size:12px;padding:6px 12px;cursor:pointer;white-space:nowrap}.eg-cal-tabs button.active{background:var(--panel-solid,#fff);color:var(--accent,#6578dd);font-weight:650;box-shadow:0 1px 4px #0000000a}.eg-cal-mobile,.eg-recap-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;margin-top:12px}.eg-cal-table-wrap{display:none}.eg-cal-item{border:1px solid var(--line,#e0e4ec);border-radius:12px;padding:12px;min-width:0}.eg-cal-item>.eg-row>b,.eg-cal-item>b{font-size:15px}.eg-cal-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}.eg-cal-values small{display:block;color:var(--muted,#788392);font-size:11px;margin-bottom:5px}.eg-cal-values b,.eg-cal-values strong{font-size:17px;font-weight:680;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.eg-cal-values strong,.eg-cal-table strong{color:var(--accent,#6578dd)}.eg-status{font-size:11px;white-space:normal;color:var(--muted,#788392)}.eg-status.good{color:var(--green,#26866d)}.eg-status.warn{color:var(--red,#c55d69)}.eg-cal-reason{font-size:12px;line-height:1.5;color:var(--muted,#788392);margin:9px 0 0}.eg-ruler{padding:8px 5px 6px}.eg-ruler-track{position:relative;height:7px;background:var(--line,#e5e7eb);border-radius:5px}.eg-ruler-fill{position:absolute;left:0;top:0;height:100%;background:var(--accent,#6578dd);opacity:.32;border-radius:5px}.eg-ruler-target{position:absolute;height:19px;top:-6px;border-left:1.5px dashed var(--muted,#788392)}.eg-ruler-advice{position:absolute;width:12px;height:12px;top:-2.5px;border-radius:50%;background:var(--accent,#6578dd);transform:translateX(-50%);outline:2px solid var(--panel-solid,#fff)}.eg-cal-table{width:100%;border-collapse:collapse;table-layout:auto;font-size:13px}.eg-cal-table th,.eg-cal-table td{text-align:left;padding:12px 8px;border-bottom:1px solid var(--line,#e1e5ee);vertical-align:middle;overflow-wrap:anywhere}.eg-cal-table th{font-weight:650}.eg-cal-table thead th{font-size:11px;color:var(--muted,#788392);white-space:nowrap}.eg-cal-table td:nth-child(2),.eg-cal-table td:nth-child(3),.eg-cal-table td:nth-child(5){font-variant-numeric:tabular-nums;white-space:nowrap}.eg-table-reason{display:block;font-size:11px;line-height:1.4;color:var(--muted);margin-top:4px}.eg-decision{font-size:12px}.eg-cal-table-wrap{margin-top:8px;overflow:auto}.eg-cal-empty{padding:20px 0;color:var(--muted);font-size:13px;line-height:1.55}.eg-guide{margin-top:12px;font-size:12px}.eg-guide summary{color:var(--accent);cursor:pointer}.eg-guide-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:8px;margin-top:8px}.eg-guide-grid>div{padding:9px;border:1px solid var(--line);border-radius:8px}.eg-guide-grid p{font-size:12px;line-height:1.6;margin:5px 0 0}.eg-key{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10px;margin-top:8px}.eg-key i{display:inline-block;width:12px;height:7px;background:var(--accent);opacity:.4;border-radius:4px}.eg-key .eg-key-target{width:2px;height:14px;background:var(--muted);opacity:1}.eg-key .eg-key-advice{width:10px;height:10px;opacity:1;border-radius:50%}.eg-recap-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line);margin-top:5px}.eg-recap-row strong{display:block;font-size:17px;margin-top:3px}.eg-recap-row .eg-status{font-size:12px}.eg-recap-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}@container (min-width:660px){.eg-cal-mobile{display:none}.eg-cal-table-wrap{display:block}}@supports not (container-type:inline-size){@media(min-width:1000px){.eg-cal-mobile{display:none}.eg-cal-table-wrap{display:block}}}@media(max-width:365px){.eg-cal-values b,.eg-cal-values strong{font-size:15px}}";document.head.append(css);
})();