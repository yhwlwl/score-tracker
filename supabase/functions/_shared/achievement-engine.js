/* Deterministic evaluator; consumes only authenticated server-loaded records. */
(function(g){'use strict';
const num=x=>x===null||x===undefined||x===''?NaN:Number(x);
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
const med=a=>{const b=[...a].sort((a,b)=>a-b),i=b.length>>1;return b.length%2?b[i]:(b[i-1]+b[i])/2};
const days=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000;
const valid=(s,m)=>Number.isFinite(num(s))&&num(m)>0&&num(s)>=0&&num(s)<=num(m);
const rank=(r,n)=>Number.isFinite(num(r))&&Number.isInteger(num(r))&&Number.isInteger(num(n))&&num(n)>=30&&num(r)>=1&&num(r)<=num(n);
const round=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
const popOk=a=>Math.min(...a.map(o=>o.N))>=.7*Math.max(...a.map(o=>o.N));
const groups=(a,key)=>{const m=new Map();for(const x of a){const k=key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return m};
const dedup=a=>[...new Map(a.map(x=>[x.date,x])).values()];
const beijing=x=>{const t=Date.parse(x);return Number.isFinite(t)?new Date(t+28800000).toISOString().slice(0,10):''};
const point=o=>({date:o.date,subject:o.subject,position:round(o.pos),rate:Number.isFinite(o.rate)?round(o.rate):null,examId:o.examId});
function evaluate({exams=[],goal=null,createdAt=null,today=beijing(new Date().toISOString()),owned=[],models=g.ScoreAchievementModels}={}){
 const out=new Map(),existing=new Set(owned);
 const add=(id,evidence)=>{if(!existing.has(id)&&!out.has(id))out.set(id,{badge_id:id,rule_version:1,evidence:{...evidence,kind:evidence.kind||'record',source:evidence.source||'historical_replay'}})};
 const all=exams.filter(e=>!e.is_hidden&&/^\d{4}-\d{2}-\d{2}$/.test(e.exam_date||'')&&e.exam_date<=today).sort((a,b)=>a.exam_date.localeCompare(b.exam_date)||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));
 const es=all.filter(e=>Number.isFinite(num(e.total_actual_score))||Number.isFinite(num(e.total_raw_score))||Object.values(e.scores||{}).some(s=>valid(s.actual,s.max)||valid(s.raw,s.rawMax)));
 const examDays=[...new Set(es.map(e=>e.exam_date))],uploadDays=[...new Set(es.map(e=>beijing(e.created_at)).filter(Boolean))].sort(),months=new Set(examDays.map(d=>d.slice(0,7))),uploadMonths=new Set(uploadDays.map(d=>d.slice(0,7)));
 const span=examDays.length?days(examDays[0],examDays.at(-1)):0,upSpan=uploadDays.length?days(uploadDays[0],uploadDays.at(-1)):0;
 function time(id,dates){add(id,{kind:'time',dates:[dates[0],dates.at(-1)],count:dates.length,span:days(dates[0],dates.at(-1)),months:new Set(dates.map(d=>d.slice(0,7))).size})}
 if(examDays.length)add('first-step',{date:examDays[0]});
 const subjects=new Set();for(const e of es)for(const [s,v] of Object.entries(e.scores||{}))if(valid(v.actual,v.max)||valid(v.raw,v.rawMax))subjects.add(s);
 if(subjects.size>=3)add('full-picture',{subjects:[...subjects]});
 if(goal)add('goal-set',{kind:'record',label:'长期目标已建立'});
 if(es.some(e=>{const r=e.reflection;return typeof r==='string'?!!r.trim():r&&typeof r==='object'&&JSON.stringify(r).replace(/[\s{}[\]"':,]/g,'').length>0}))add('reflection',{label:'已保存考后反思'});
 for(const [id,n] of [['three-days',3],['five-days',5],['ten-days',10],['twenty-days',20],['chronicle',40]])if(examDays.length>=n)time(id,examDays);
 if(months.size>=6&&examDays.length>=6)time('half-year',examDays);
 if(months.size>=12&&examDays.length>=12)time('four-seasons',examDays);
 if(examDays.length>=12&&span>=365&&months.size>=6)time('year-trace',examDays);
 if(examDays.length>=20&&span>=365&&months.size>=9)time('rings',examDays);
 if(uploadDays.length>=3&&upSpan>=30)time('time-witness',uploadDays);
 if(uploadDays.length>=4&&upSpan>=60)time('long-road',uploadDays);
 if(uploadDays.length>=6&&uploadMonths.size>=3)time('time-kept',uploadDays);
 if(Number.isFinite(Date.parse(createdAt))&&Date.parse(createdAt)<Date.parse('2026-08-26T16:00:00Z'))add('early',{kind:'event',date:beijing(createdAt)});
 const rp=[],sp=[],perExam=new Map();
 for(const e of es){
  const basket=[],ranks=[];
  for(const [subject,s] of Object.entries(e.scores||{})){
   if(s.excludeFromTotal)continue;
   const hasScore=valid(s.actual,s.max),hasRaw=valid(s.raw,s.rawMax);if(!hasScore&&!hasRaw)continue;
   basket.push(subject);
   const N=num(s.participants??e.total_participants),r=num(s.rank);
   const o={date:e.exam_date,examId:e.id,category:e.grade_level||'',subject,rate:hasScore?100*num(s.actual)/num(s.max):NaN,max:num(s.max),score:num(s.actual),rank:r,N,pos:rank(r,N)?100*r/N:NaN,prevId:null};
   if(hasScore)sp.push(o);
   if(rank(r,N)){rp.push(o);ranks.push(o);add('rank-aware',{kind:'record',date:o.date,subject,position:round(o.pos),participants:N})}
  }
  perExam.set(e.id,ranks);
  if(basket.length&&rank(e.total_rank,e.total_participants)){const N=num(e.total_participants),r=num(e.total_rank);rp.push({date:e.exam_date,examId:e.id,category:e.grade_level||'',subject:'总分:'+basket.sort().join('|'),rank:r,N,pos:100*r/N,rate:NaN})}
 }
 const diverg=new Map(),dual=new Map(),pairs=new Map();
 for(const seq of groups(sp,x=>JSON.stringify([x.category,x.subject,x.max])).values()){
  const a=dedup(seq);let best=-Infinity;
  for(let i=0;i<a.length;i++){const o=a[i];if(i&&o.rate>best)add('new-best',{kind:'score',points:[...a.slice(0,i).filter(x=>x.rate===best).slice(-1),o].map(point)});
   if(i>=3&&i+1<a.length&&o.rate>=best+5&&a[i+1].rate>=best)add('hold-peak',{kind:'score',points:a.slice(Math.max(0,i-3),i+2).map(point),previousBest:round(best),historyCount:i+2,priorCount:i});
   if(i&&Number.isFinite(o.pos)&&Number.isFinite(a[i-1].pos)&&popOk([a[i-1],o])){
    const p=a[i-1],dp=p.pos-o.pos,ds=o.rate-p.rate;
    const ev={kind:'dual',points:[p,o].map(point),positionChange:round(dp),scoreChange:round(ds)};
    if(dp>=5&&ds<=-3){add('beyond-score',ev);diverg.set(o.date,ev)}
    if(dp>=5&&ds>=3)dual.set(o.date,ev);
    const key=JSON.stringify([p.examId,o.examId]);if(!pairs.has(key))pairs.set(key,[]);pairs.get(key).push({subject:o.subject,before:round(p.pos),after:round(o.pos),dp});
   }
   best=Math.max(best,o.rate);
  }
 }
 if(diverg.size>=3)add('more-than-score',{kind:'dual',events:[...diverg.values()].slice(0,3)});
 if(dual.size>=3)add('double-proof',{kind:'dual',events:[...dual.values()].slice(0,3)});
 for(const a of pairs.values()){const good=a.filter(x=>x.dp>=5).length;if(a.every(x=>x.dp>=-2)){if(good>=3)add('chorus',{kind:'radar',subjects:a});if(good>=5)add('resonance',{kind:'radar',subjects:a})}}
 // Rank sequences; total is separated by subject basket. Split on population change.
 const forecasts2=new Map(),forecasts5=new Map();
 for(const seq of groups(rp,x=>JSON.stringify([x.category,x.subject])).values()){
  const a=dedup(seq),isTotal=a[0]?.subject.startsWith('总分:');if(!a.length)continue;
  let seg=[];
  for(let i=0;i<a.length;i++){
   const o=a[i],p=a[i-1];if(p&&!popOk([p,o]))seg=[];
   seg.push(o);
   if(p&&popOk([p,o])&&p.pos-o.pos>=5)add('step-up',{kind:'rank',points:[p,o].map(point)});
   const last=n=>seg.slice(-n),check=n=>seg.length>=n&&popOk(last(n));
   if(check(3)){const [x,y,z]=last(3);if(x.pos>y.pos&&y.pos>z.pos&&x.pos-z.pos>=5)add('getting-better',{kind:'rank',points:last(3).map(point)})}
   if(check(4)){
    const [x,y,z,t]=last(4),old=avg([x.pos,y.pos]),worst=Math.max(z.pos,t.pos),gain=old-worst,ev={kind:'rank',points:last(4).map(point),improvement:round(gain)};
    if(days(x.date,t.date)>=30){
      if(old-avg([z.pos,t.pos])>=5&&[y.pos<=x.pos,z.pos<=y.pos,t.pos<=z.pos].filter(Boolean).length>=2)add('steady',ev);
      if(Math.abs(x.pos-y.pos)<=5&&gain>=15)add('plateau',ev);
      if(!isTotal&&Math.abs(x.pos-y.pos)<=5&&gain>=30)add('another-height',ev);
    }
    if(isTotal&&gain>=30)add('new-horizon',ev);
   }
   if(check(5)){
    const [x,y,z,t,v]=last(5),old=avg([x.pos,y.pos,z.pos]),worst=Math.max(t.pos,v.pos),gain=old-worst,ev={kind:'rank',points:last(5).map(point),improvement:round(gain)};
    if(gain>=20)add('accumulation',ev);
    if(!isTotal&&gain>=40)add('ascent',ev);
    if(z.pos-avg([x.pos,y.pos])>=10&&z.pos-worst>=10&&worst<=avg([x.pos,y.pos])+2)add('comeback',ev);
   }
   if(isTotal&&check(5)){
    const hist=seg.slice(0,-1),prediction=hist.reduce((a,x,j)=>j?0.4*x.pos+0.6*a:x.pos,0),delta=prediction-o.pos;
    const ev={date:o.date,examId:o.examId,actual:round(o.pos),prediction:round(prediction),delta:round(delta)};
    if(delta>=2)forecasts2.set(o.date,ev);
    if(delta>=5)forecasts5.set(o.date,ev);
    if(models?.pal&&(!existing.has('outside-range')&&!out.has('outside-range')||!existing.has('break-limit')&&!out.has('break-limit'))){
     try{const r=models.pal.pipeline.analyzeSeries(hist,PROD),[lo,hi]=r.nextExam.ci95Percentile;if(Number.isFinite(lo)&&Number.isFinite(hi)&&o.pos<lo){const ev={kind:'interval',model:'app-v34/no-se-v1',source:'historical_replay',date:o.date,actual:round(o.pos),low:round(lo),high:round(hi),delta:round(lo-o.pos)};add('outside-range',ev);if(lo-o.pos>=5)add('break-limit',ev)}}catch(_){/* invalid model outputs are not awards */}
    }
   }
   if(models?.pal&&check(6)&&!existing.has('phase-shift')&&!out.has('phase-shift')){
    const h=seg.slice(0,-1),k=h.length-1;try{const cp=models.pal.pipeline.analyzeSeries(h,PROD).changepoint,old=avg(h.slice(-4,-1).map(x=>x.pos)),fresh=Math.max(h.at(-1).pos,o.pos);if(k>=4&&cp.recentChangeProb[k]>.5&&cp.mapRunLength[k-1]>=3&&old-fresh>=5)add('phase-shift',{kind:'state',model:'app-v34/no-se-v1',points:seg.slice(-6).map(point),probability:round(cp.recentChangeProb[k]*100),improvement:round(old-fresh),stableRun:cp.mapRunLength[k-1]})}catch(_){}
   }
  }
  if(!isTotal&&models?.worth&&(!existing.has('harder')&&!out.has('harder')||!existing.has('headwind')&&!out.has('headwind'))){
   const validObs=a.filter(x=>Number.isFinite(x.rate));let seg=[];
   for(const o of validObs){if((existing.has('harder')||out.has('harder'))&&(existing.has('headwind')||out.has('headwind')))break;if(seg.length&&!popOk([seg.at(-1),o]))seg=[];seg.push(o);if(seg.length<4||!popOk(seg))continue;
    const prev=seg.slice(0,-1);const e=seg.map((x,j)=>({id:String(j),exam_date:x.date,grade_level:'same',total_participants:x.N,scores:{s:{actual:x.score,max:x.max,rank:x.rank,participants:x.N}}}));
    try{const r=models.worth.compare(e,'s',e.length-1,{mode:'period',start:prev[0].date,end:prev.at(-1).date});if(r.kind!=='estimate'||(r.warnings||[]).some(x=>x!=='历史记录还少'))continue;const baseline=avg(prev.slice(-3).map(x=>x.pos)),delta=r.difficulty-r.referenceDifficulty;if(delta>=10&&o.pos<=baseline){const ev={kind:'difficulty',model:'score-worth-v1',date:o.date,subject:o.subject,difficulty:round(r.difficulty),referenceDifficulty:round(r.referenceDifficulty),actual:round(o.pos),baseline:round(baseline),historyCount:seg.length,qualityPassed:true};add('harder',ev);if(seg.length>=5&&baseline-o.pos>=5)add('headwind',ev)}}catch(_){}
   }
  }
 }
 for(const [id,n,m] of [['unexpected',1,forecasts2],['beyond-expectation',3,forecasts2],['rewrite',5,forecasts2],['undefined',10,forecasts5]])if(m.size>=n)add(id,{kind:'forecast',model:'ewma-0.40-v1',points:[...m.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,n),count:n});
 // Four exams with the same ranked subject basket; compare averages before/after.
 const bundles=groups(es.filter(e=>(perExam.get(e.id)||[]).length>=4),e=>JSON.stringify([e.grade_level||'',perExam.get(e.id).map(x=>x.subject).sort()]));
 for(const raw of bundles.values()){
  const a=[...new Map(raw.map(e=>[e.exam_date,e])).values()];
  for(let i=3;i<a.length;i++){
   const frame=a.slice(i-3,i+1);if(days(frame[0].exam_date,frame[3].exam_date)<30)continue;
   const records=frame.map(e=>perExam.get(e.id)),sub=records[0].map(x=>x.subject),arr=[];
   for(const s of sub){const vals=records.map(r=>r.find(x=>x.subject===s));if(vals.every(Boolean)&&popOk(vals))arr.push({subject:s,before:avg(vals.slice(0,2).map(x=>x.pos)),after:avg(vals.slice(2).map(x=>x.pos))})}
   if(arr.length<4)continue;const b=med(arr.map(x=>x.before)),c=med(arr.map(x=>x.after)),declines=arr.filter(x=>x.after-x.before>2).length;
   const ev={kind:'radar',subjects:arr.map(x=>({subject:x.subject,before:round(x.before),after:round(x.after)})),dates:[frame[0].exam_date,frame[3].exam_date]};
   const puzzleWitness=arr.find(x=>x.before-b>=10&&x.after-c<=5&&x.before-x.after>=10);if(puzzleWitness&&declines<=1)add('puzzle',{...ev,historyCount:4,witnessSubject:puzzleWitness.subject});
   const cocoonWitness=arr.find(x=>x.before-b>=10&&x.after-c<=-5&&x.before-x.after>=15);if(days(frame[0].exam_date,frame[3].exam_date)>=60&&cocoonWitness)add('cocoon',{...ev,historyCount:4,witnessSubject:cocoonWitness.subject});
  }
 }
 return [...out.values()];
}
const PROD={seWeighting:false,ewmaForecastAlpha:.4,conformalPriorK:4.539237871385978,conformalPriorW:4};
g.ScoreAchievementEngine={evaluate};
if(typeof module!=='undefined'&&module.exports)module.exports=g.ScoreAchievementEngine;
})(globalThis);
