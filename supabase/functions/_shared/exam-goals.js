/* Shared single-exam goal model. Long-term goals are intentionally independent. */
(function(root){
'use strict';
const num=v=>v===null||v===undefined||!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
const filled=v=>v!==null&&v!==undefined&&v!=='';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const valid=(v,lo,hi,int=false)=>{let n=num(v);return n!==null&&n>=lo&&n<=hi&&(!int||Number.isInteger(n));};
const round=v=>Math.round(v*100)/100;
function actual(e){
 if(!e)return false;
 return ['total_actual_score','total_raw_score','total_rank','total_class_rank','total_year_position_percent','total_class_position_percent','city_rank','district_rank','cityRank','districtRank'].some(k=>num(e[k])!==null)||
 Object.values(e.scores||{}).some(s=>['actual','raw','rank','classRank','yearPositionPercent','classPositionPercent'].some(k=>num(s[k])!==null))||
 Object.values(e.moduleRanks||{}).some(s=>['yearRank','classRank','yearPositionPercent','classPositionPercent'].some(k=>num(s[k])!==null));
}
function pending(e){return !!(e?.exam_goals&&e.exam_goals.planned&&!actual(e));}
function cleanItems(raw,e){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>53)throw Error('考试目标格式不正确');
 const out={};
 for(const [key,v] of Object.entries(raw)){
  if(key!=='total'&&!(key.startsWith('s:')&&own(e.scores,key.slice(2)))&&!(key.startsWith('m:')&&(e.moduleIds||[]).includes(key.slice(2))))throw Error('目标对应的科目或组合不存在');
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('目标格式不正确');
  const item={};
  if(filled(v.score)){if(!valid(v.score,0,99999)||!valid(v.max,0.01,99999)||+v.score>+v.max)throw Error('目标分不能超过满分');item.score=+v.score;item.max=+v.max;}
  if(filled(v.rank)){if(!['number','percent'].includes(v.rankType)||!valid(v.rank,v.rankType==='number'?1:0,v.rankType==='number'?10000000:100,v.rankType==='number'))throw Error('排名目标格式不正确');item.rankType=v.rankType;item.rank=+v.rank;}
  if(Object.keys(item).length)out[key]=item;
 }
 return out;
}
function snapshot(e){
 e=e||{};
 const items=Object.assign({},e.exam_goals?.items||{});
 Object.entries(e.scores||{}).forEach(([n,s])=>{if(num(s.target)!==null&&num(s.max)>0){const k='s:'+n;if(num(items[k]?.score)===null)items[k]={...items[k],score:+s.target,max:+s.max};}});
 return items;
}
function evolve(old,e,raw,now){
 const items=cleanItems(raw.items||{},e),prev=old&&old.exam_goals,oldActual=!!old&&actual(old),hasActual=actual(e);
 const planned=raw.planned===true&&!hasActual&&!oldActual;
 if(planned&&!Object.keys(items).length)throw Error('请至少设置一项目标');
 if(!Object.keys(items).length&&!prev)return null;
 const first=prev?.firstSetAt||now;
 const legacy=old&&!prev?snapshot(old):{};
 const canonical=o=>JSON.stringify(Object.keys(o).sort().map(k=>[k,o[k].score??null,o[k].max??null,o[k].rankType??null,o[k].rank??null]));
 const oldItems=prev?.items||legacy;
 const changed=canonical(oldItems)!==canonical(items);
 const origin=prev?.origin||(Object.keys(legacy).length?'legacy':oldActual||hasActual?'retro':String(e.exam_date||'')>new Date(Date.parse(now)+8*3600000).toISOString().slice(0,10)?'before_exam':'before_results');
 const locked=prev?.locked||((oldActual||hasActual)&&Object.keys(oldItems).length&&origin!=='retro'?oldItems:null);
 return {version:1,planned,items,firstSetAt:first,updatedAt:changed?now:prev?.updatedAt||now,origin,locked,changedAfterResults:!!prev?.changedAfterResults||!!(oldActual&&changed)};
}
function rankValue(r,kind){
 if(kind==='number')return num(r.rank);
 const p=num(r.percent),n=num(r.people),a=num(r.rank);
 return p!==null?p:n>0&&a!==null&&a<=n?a/n*100:null;
}
function evaluate(goal,r,kind){
 if(!goal)return null;
 let target,actualValue;
 if(kind==='score'){target=num(goal.score);actualValue=num(r.score);if(!(num(goal.max)>0&&num(r.max)>0))return null;if(target!==null&&+goal.max!==+r.max){target=target/+goal.max*100;actualValue=actualValue===null?null:actualValue/+r.max*100;}}
 else{target=num(goal.rank);actualValue=rankValue(r,goal.rankType);}
 if(target===null||actualValue===null)return null;
 return {met:kind==='score'?actualValue>=target:actualValue<=target,gap:round(kind==='score'?actualValue-target:target-actualValue)};
}
function quantile(a,q){const x=a.slice().sort((a,b)=>a-b),p=(x.length-1)*q,i=Math.floor(p);return x[i]+(x[Math.min(i+1,x.length-1)]-x[i])*(p-i);}
function calibrate(history,kind){
 const goalExists=x=>x.goal&&num(kind==='score'?x.goal.score:x.goal.rank)!==null;
 const last=history.filter(goalExists).at(-1);
 if(!last)return null;
 const g=last.goal,unit=kind==='score'?'score':g.rankType,max=num(g.max),people=num(last.actual.people);
 const lastEval=evaluate(g,last.actual,kind);
 const comparable=x=>(!x.exam||!last.exam||String(x.exam.grade_level||'')===String(last.exam.grade_level||''))&&(!last.actual.scope||!x.actual.scope||x.actual.scope===last.actual.scope);
 // Specific rank targets are evaluated as actual places. For comparisons across
 // different cohorts, normalize observed ranks and the last target to percentages.
 const normalize=x=>kind==='score'?(num(x.actual.score)!==null&&num(x.actual.max)>0?+x.actual.score/+x.actual.max*100:null):rankValue(x.actual,'percent');
 const target=kind==='score'?num(g.score)/max*100:unit==='percent'?num(g.rank):people>0&&num(g.rank)<=people?num(g.rank)/people*100:null;
 const evaluated=history.filter(x=>comparable(x)&&goalExists(x)).map(x=>({x,ev:evaluate(x.goal,x.actual,kind)}));
 // Missing result is not a failure and must not extend a consecutive streak.
 // A retroactively set target may be displayed in recap but not drive advice.
 const comparableTargets=evaluated.filter(t=>t.x.origin!=='retro'&&t.ev!==null&&(kind==='score'||normalize(t.x)!==null));
 let streak=0,met=lastEval?.met;
 for(let i=evaluated.length-1;i>=0;i--){const t=evaluated[i];if(t.x.origin==='retro'||!t.ev||t.ev.met!==met)break;streak++;}
 const comparableActual=history.filter(comparable).map(normalize).filter(v=>v!==null&&Number.isFinite(v));
 const recent=comparableActual.slice(-5);
 let suggestion=target,decision='保持目标',reason='目前目标较合理，建议继续保持。';
 const result={goal:g,actual:last.actual,streak,met,eligible:comparableTargets.length,unit,max,origin:last.origin,referencePeople:people,actualMissing:!lastEval,recentCount:recent.length};
 if(!lastEval){decision='待补录';reason='补录实际'+(kind==='score'?'成绩':'排名')+'后再判断。';}
 else if(last.origin==='retro'){decision='暂不调整';reason='补录目标仅用于本次复盘。';}
 else if(target===null||!Number.isFinite(target)||comparableTargets.length<3||recent.length<3){decision='暂不调整';reason='至少需要三场可比较的目标及实际表现。';}
 else if(streak>=3){
  // Median is the typical level. The upper/lower quartile and personal best
  // limit how ambitious the next step is; IQR guards against unstable results.
  const direction=kind==='score'?1:-1,quality=recent.map(v=>v*direction);
  const mid=quantile(quality,.5),strong=quantile(quality,.75),recentBest=Math.max(...quality),best=Math.max(...comparableActual.map(v=>v*direction)),spread=quantile(quality,.75)-quantile(quality,.25),t=target*direction;
  const stable=Math.max(0,1-spread/20),bestBound=Math.min(best,recentBest+(recentBest-mid)*.15),buffer=Math.min((bestBound-mid)*.5,(strong-mid)+Math.max(0,bestBound-strong)*.35);
  const candidate=met?mid+(strong-mid)*(.5+.5*stable):mid+buffer*(.45+.55*stable);
  const tolerance=kind==='score'?0.5:unit==='number'?Math.max(.2,100/people):.5;
  if((met&&candidate>t+tolerance)||(!met&&candidate<t-tolerance)){
   suggestion=candidate*direction;decision=met?'提高目标':'适当放宽';
   reason=met?'近期稳定达标，可以尝试更进一步。':'结合近期表现，先设一个更容易稳定达到的目标。';
  }
  result.typical=mid*direction;result.best=best*direction;result.spread=spread;
 }
 let value=null;
 if(suggestion!==null&&Number.isFinite(suggestion)){
  if(kind==='score')value=decision==='保持目标'?num(g.score):Math.max(0,Math.min(max,Math.round(suggestion*max/100*2)/2));
  else if(unit==='number')value=Math.max(1,Math.min(people,Math.round(suggestion*people/100)));
  else value=Math.max(0,Math.min(100,round(suggestion)));
 }
 return {...result,decision,reason,suggestion:value};
}
function restoreBackup(raw,normalized){
 if(!Array.isArray(raw?.exams)||!Array.isArray(normalized?.exams)||raw.exams.length!==normalized.exams.length)throw Error('备份考试数量不一致');
 normalized.exams.forEach((e,i)=>{
  const g=raw.exams[i]?.exam_goals;if(g==null)return;
  if(g.version!==1||!g.items||typeof g.items!=='object')throw Error('考试目标备份版本不支持');
  const items=cleanItems(g.items,e),planned=g.planned===true&&!actual(e);
  const stamp=v=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v))?v:null;
  // Restore current data; imported origin cannot be independently verified.
  const locked=g.locked&&typeof g.locked==='object'&&!Array.isArray(g.locked)?cleanItems(Object.fromEntries(Object.entries(g.locked).filter(([k])=>k==='total'||k.startsWith('s:')&&own(e.scores,k.slice(2))||k.startsWith('m:')&&(e.moduleIds||[]).includes(k.slice(2)))),e):null;
  e.exam_goals={version:1,planned,items,firstSetAt:stamp(g.firstSetAt),updatedAt:stamp(g.updatedAt),origin:g.origin==='retro'?'retro':'legacy',imported:true,locked,changedAfterResults:!!g.changedAfterResults};
  if(planned)e.is_hidden=true;
 });
 return normalized;
}
const api={num,actual,pending,cleanItems,snapshot,evolve,rankValue,evaluate,calibrate,quantile,restoreBackup};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else {root.ScoreExamGoals=api;if(root.ScoreBackup){const normalize=root.ScoreBackup.normalize;root.ScoreBackup.normalize=raw=>restoreBackup(raw,normalize(raw));}}
})(typeof globalThis!=='undefined'?globalThis:this);
