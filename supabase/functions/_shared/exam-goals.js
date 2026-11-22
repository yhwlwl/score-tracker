/* Shared single-exam goal model. Long-term goals are intentionally independent. */
(function(root){
'use strict';
const num=v=>v===null||v===undefined||!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
const filled=v=>v!==null&&v!==undefined&&v!=='';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const valid=(v,lo,hi,int=false)=>{let n=num(v);return n!==null&&n>=lo&&n<=hi&&(!int||Number.isInteger(n));};
const round=v=>Math.round(v*100)/100;
function actual(e){
 return ['total_actual_score','total_raw_score','total_rank','total_class_rank','total_year_position_percent','total_class_position_percent','city_rank','district_rank','cityRank','districtRank'].some(k=>num(e[k])!==null)||
 Object.values(e.scores||{}).some(s=>['actual','raw','rank','classRank','yearPositionPercent','classPositionPercent'].some(k=>num(s[k])!==null))||
 Object.values(e.moduleRanks||{}).some(s=>['yearRank','classRank','yearPositionPercent','classPositionPercent'].some(k=>num(s[k])!==null));
}
function pending(e){return !!(e.exam_goals&&e.exam_goals.planned&&!actual(e));}
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
 const items=Object.assign({},e.exam_goals?.items||{});
 Object.entries(e.scores||{}).forEach(([n,s])=>{if(num(s.target)!==null&&num(s.max)>0){const k='s:'+n;items[k]={...items[k],score:+s.target,max:+s.max};}});
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
 const origin=prev?.origin||(Object.keys(legacy).length?'legacy':oldActual||hasActual?'retro':String(e.exam_date||'')>now.slice(0,10)?'before_exam':'before_results');
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
 if(kind==='score'){target=num(goal.score);actualValue=num(r.score);if(target!==null&&num(goal.max)>0&&num(r.max)>0&&+goal.max!==+r.max){target=target/+goal.max*100;actualValue=actualValue===null?null:actualValue/+r.max*100;}}
 else{target=num(goal.rank);actualValue=rankValue(r,goal.rankType);}
 if(target===null||actualValue===null)return null;
 return {met:kind==='score'?actualValue>=target:actualValue<=target,gap:round(kind==='score'?actualValue-target:target-actualValue)};
}
function quantile(a,q){const x=a.slice().sort((a,b)=>a-b),p=(x.length-1)*q,i=Math.floor(p);return x[i]+(x[Math.min(i+1,x.length-1)]-x[i])*(p-i);}
function calibrate(history,kind){
 // Work on the latest comparable target's unit. Only actual comparable
 // observations count; missing data does not become a failure.
 const last=history.filter(x=>x.goal&&num(kind==='score'?x.goal.score:x.goal.rank)!==null&&evaluate(x.goal,x.actual,kind)).at(-1);
 if(!last)return null;
 const g=last.goal,unit=kind==='score'?'score':g.rankType,max=num(g.max);
 const comparable=x=>!x.exam||!last.exam||String(x.exam.grade_level||'')===String(last.exam.grade_level||'');
 const rankComparable=x=>kind==='score'||unit==='percent'||(num(last.actual.people)>0&&num(x.actual.people)===num(last.actual.people));
 const rows=history.filter(x=>comparable(x)&&rankComparable(x)&&x.goal&&(kind==='score'||x.goal.rankType===unit)&&x.origin!=='retro');
 const eligible=rows.map(x=>evaluate(x.goal,x.actual,kind)).filter(Boolean);
 let streak=0;const met=eligible.at(-1)?.met;for(let i=eligible.length-1;i>=0&&eligible[i].met===met;i--)streak++;
 const recent=history.filter(x=>comparable(x)&&rankComparable(x)).map(x=>kind==='score'?(num(x.actual.score)!==null&&num(x.actual.max)>0?+x.actual.score/+x.actual.max*100:null):rankValue(x.actual,unit)).filter(x=>x!==null).slice(-5);
 const target=kind==='score'?+g.score/max*100:+g.rank;let suggestion=target,decision='保持',reason='近期目标暂不需要调整';
 if(last.origin==='retro'||eligible.length<3||recent.length<3){decision='暂不调整';reason=last.origin==='retro'?'补录目标可用于复盘，暂不用于调整建议':'需要至少三场同类、可比较的目标与实际成绩';}
 else if(streak>=3){
  const candidate=quantile(recent,kind==='score'?(met?.75:.5):(met?.25:.5));
  if((kind==='score'?(met?candidate>target:candidate<target):(met?candidate<target:candidate>target))){suggestion=candidate;decision=met?'提高目标':'适当放宽';reason='参考最近'+recent.length+'场的实际表现及连续达标情况';}
 }
 let value=kind==='score'?round(suggestion*max/100):unit==='number'?Math.max(1,Math.round(suggestion)):round(suggestion);
 return {goal:g,actual:last.actual,decision,reason,streak,met,eligible:eligible.length,suggestion:value,unit,max,origin:last.origin};
}
function restoreBackup(raw,normalized){
 if(!Array.isArray(raw?.exams)||!Array.isArray(normalized?.exams)||raw.exams.length!==normalized.exams.length)throw Error('备份考试数量不一致');
 normalized.exams.forEach((e,i)=>{
  const g=raw.exams[i]?.exam_goals;if(g==null)return;
  if(g.version!==1||!g.items||typeof g.items!=='object')throw Error('考试目标备份版本不支持');
  const items=cleanItems(g.items,e),planned=g.planned===true&&!actual(e);
  const stamp=v=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v))?v:null;
  // Restore current data; imported origin cannot be independently verified.
  e.exam_goals={version:1,planned,items,firstSetAt:stamp(g.firstSetAt),updatedAt:stamp(g.updatedAt),origin:g.origin==='retro'?'retro':'legacy',imported:true,locked:null,changedAfterResults:!!g.changedAfterResults};
  if(planned)e.is_hidden=true;
 });
 return normalized;
}
const api={num,actual,pending,cleanItems,snapshot,evolve,rankValue,evaluate,calibrate,quantile,restoreBackup};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else {root.ScoreExamGoals=api;if(root.ScoreBackup){const normalize=root.ScoreBackup.normalize;root.ScoreBackup.normalize=raw=>restoreBackup(raw,normalize(raw));}}
})(typeof globalThis!=='undefined'?globalThis:this);
