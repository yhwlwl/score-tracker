// Reproducible study-agent quality benchmark. All exam data is invented.
// Default: deterministic replay; --live: explicitly opted-in model evaluation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
global.ScoreExamGoals=require('../supabase/functions/_shared/exam-goals.js');
const {studyQuestion}=require('../supabase/functions/score-tracker-study-api/study-question.ts');
const {studyTools}=require('../supabase/functions/score-tracker-study-api/study-tools.ts');

const subjects=['数学','物理','英语'];
const values=[[60,75,80,65,85,90],[50,60,65,55,75,80],[90,80,85,90,75,70]];
const snapshot=()=>({modules:[],exams:Array.from({length:6},(_,i)=>({
  id:'eval-'+(i+1),name:'模拟考试'+(i+1),exam_date:'2026-10-'+String(i+11),
  grade_level:i<3?'高一':'高二',total_rank:[50,40,35,30,24,32][i],total_participants:100,
  scores:Object.fromEntries(subjects.map((name,j)=>[name,{actual:values[j][i],max:100,rank:j===0?[45,38,30,22,20,35][i]:30+j*5,participants:100}]))
}))});
const mixed=()=>{const s=snapshot();s.exams=s.exams.slice(0,2);s.exams[1].scores.数学={actual:120,max:150,rank:38,participants:100};return s;};
const zero=()=>{const s=snapshot();s.exams.at(-1).scores.物理={actual:0,max:100};return s;};
const sparse=()=>{const s=snapshot();s.exams=s.exams.slice(-1);s.exams[0].scores.数学={max:100,rank:35,participants:100};return s;};
const custom=()=>{const s=snapshot();s.modules=[{id:'eval-combo',name:'自选理科',subjects:['数学','物理']}];return s;};
const factsFrom=m=>JSON.parse(m.at(-1).content).results.flatMap(r=>r.facts||[]);
const seriesFrom=m=>JSON.parse(m.at(-1).content).results.flatMap(r=>r.series||[]);
const fact=(r,label,pattern)=>r.evidence?.some(f=>f.label===label&&pattern.test(f.value));
const chartList=r=>r.charts?.length?r.charts:r.chart?[r.chart]:[];
const match=(r,pattern)=>pattern.test(r.answer||'');
const widget=(r,type)=>r.widgets?.find(w=>w.type===type);
const ids=(m,pattern)=>factsFrom(m).filter(f=>pattern.test(f.label)).map(f=>f.id).slice(0,6);
const reply=(m,answer,pattern,extra={})=>({answer,refs:ids(m,pattern),...extra});
const simple=(query,answer,pattern,extra)=>[query,m=>reply(m,answer,pattern,typeof extra==='function'?extra(m):extra)];
const cases=[
  {id:'latest-score',group:'准确性',q:'最近一次数学考了多少分？',script:simple({tool:'results',scopes:['s:数学'],limit:1},'最近一次数学是90分，满分100分。',/^数学$/),check:r=>[match(r,/90\s*分|90\s*\/\s*100/),fact(r,'数学',/90\/100/)]},
  {id:'rank-vs-score',group:'指标方向',q:'最近两次数学分数和年级位置分别怎么变了？',script:simple({tool:'results',scopes:['s:数学'],limit:2},'数学增加5分，但年级位置从前20%退到前35%，后退15个百分点。',/数学分差|数学年级位置$/),check:r=>[match(r,/5\s*分/),match(r,/15\s*个?百分点|前\s*35%/),match(r,/后退|靠后|下降|退步/),fact(r,'数学年级位置',/后退 15/)]},
  {id:'mixed-max',group:'统计口径',snapshot:mixed,q:'两场数学满分不同，得分率进步了多少？',script:simple({tool:'results',scopes:['s:数学'],range:'all'},'得分率由60%提高到80%，增加20个百分点。',/数学得分率变化/),check:r=>[match(r,/20\s*个?百分点/),fact(r,'数学得分率变化',/\+20/),!fact(r,'数学分差',/\+60/)]},
  {id:'zero-score',group:'稀疏数据',snapshot:zero,q:'最近一次物理成绩是多少？',script:simple({tool:'results',scopes:['s:物理'],limit:1},'最近一次物理是0分，满分100分。',/^物理$/),check:r=>[match(r,/0\s*分|0\/100/),fact(r,'物理',/^0\/100/),!match(r,/没有录入|没有成绩数据/)]},
  {id:'rank-only',group:'稀疏数据',snapshot:sparse,q:'最近一次数学的成绩和年级排名是多少？',script:simple({tool:'results',scopes:['s:数学'],limit:1},'数学未录入分数，年级第35名，前35%。',/^数学$/),check:r=>[match(r,/未录入|没有.*分数|缺少.*分/),match(r,/35\s*名|前\s*35%/),fact(r,'数学',/年级第 35 名/)]},
  {id:'custom-combination',group:'自定义组合',snapshot:custom,q:'最近一次自选理科组合总分多少？',script:simple({tool:'results',scopes:['m:eval-combo'],limit:1},'自选理科组合总分170分，满分200分。',/^自选理科$/),check:r=>[match(r,/170\s*分|170\/200/),fact(r,'自选理科',/170\/200/)]},
  {id:'trimmed-mean',group:'通用分析',q:'数学去掉最高和最低的一场，剩下考试平均得分率是多少？',script:simple({tool:'aggregate',scopes:['s:数学'],metric:'rate',ops:['mean','count'],trimLow:1,trimHigh:1,range:'all'},'剩下4场，平均得分率76.25%。',/数学得分率平均|数学得分率有效场次/,{components:[{type:'metric',refs:[1,2],after:1}]}),check:r=>[match(r,/76\.2[45]?%|76\.3%/),fact(r,'数学得分率平均',/76\.25%/),fact(r,'数学得分率有效场次',/4 场/)]},
  {id:'grouped-stability',group:'通用分析',q:'比较高一和高二数学的得分率稳定性，用标准差和场次列成表。',script:simple({tool:'aggregate',scopes:['s:数学'],metric:'rate',ops:['std','count'],groupBy:'category',range:'all'},'高一、高二均有3场有效记录，高一的得分率波动较小。',/标准差|有效场次/,{components:[{type:'aggregate',index:1,after:1}]}),check:r=>{const w=widget(r,'aggregate');return [!!w,w?.rows?.length===2,w?.rows?.every(x=>x.count===3&&Number.isFinite(x.values.std)),match(r,/高一/)&&match(r,/高二/)];}},
  {id:'synchronized-change',group:'分析方法',q:'哪些科目容易同时进步或退步？有没有什么规律？',script:simple({tool:'statistics',scopes:['s:数学','s:物理','s:英语'],mode:'change',allPairs:true,range:'all'},'数学和物理的进退变化最同步，英语与它们的变化方向较不一致。这只描述历史记录。',/进退相关性/),check:r=>{const w=widget(r,'relations');return [w?.mode==='change',w?.pairs?.length===3,w?.pairs?.find(p=>[p.a,p.b].includes('数学')&&[p.a,p.b].includes('物理'))?.same===5,match(r,/数学/)&&match(r,/物理/)];}},
  {id:'all-subject-forecast',group:'预测覆盖',q:'我各科下次大概能考多少？',script:simple({tool:'trajectory',scopes:['s:数学'],metric:'score'},'请看各科历史参考。',/下次得分率估计/),check:r=>{const c=chartList(r).find(c=>c.type==='table');return [c?.series?.[0]?.points?.length===3,c?.series?.[0]?.points?.every(p=>p.forecast===true),c?.series?.some(s=>s.metric==='score'),match(r,/3\s*科/),c?.series?.[0]?.points?.every(p=>p.low==null&&p.high==null)];}},
  {id:'usual-total',group:'通用分析',q:'如果每科都发挥到平时的水平，总分大概是多少？和这次相比呢？',script:simple({tool:'baseline'},'正常发挥总分220分，本次240分。',/各科正常发挥总分/),check:r=>[match(r,/220/),match(r,/240/),fact(r,'各科正常发挥总分',/220\/300.*240\/300/),chartList(r).some(c=>c.series.some(s=>s.metric==='scoreChange'))]},
  {id:'interactive-total',group:'交互组件',q:'如果物理再多5分，总分是多少？我想自己调整各科分数。',script:simple({tool:'scenario',adjustments:{'s:物理':5}},'物理多5分，总分245分。可以调整各科成绩。',/模拟总分/),check:r=>{const w=widget(r,'scenario');return [match(r,/245/),fact(r,'模拟总分',/245\/300/),w?.subjects?.find(s=>s.label==='物理')?.value===85];}},
  {id:'chart-grounding',group:'交互组件',q:'画出最近两场数学得分率的柱状图。',script:simple({tool:'results',scopes:['s:数学'],limit:2},'数学得分率从85%提高到90%。',/^数学$/,m=>({chart:{type:'bar',series:[seriesFrom(m).find(s=>s.metric==='rate').id],title:'错误的生物排名',after:1}})),check:r=>{const c=chartList(r)[0];return [!!c,c?.series?.every(s=>s.label==='数学'&&s.metric==='rate'),!(/生物|排名/.test(c?.title||'')),c?.series?.[0]?.points?.at(-1)?.value===90];}},
  {id:'follow-up-scope',group:'连续追问',q:'那只看高二呢？',previous:{question:'数学历史平均得分率是多少？',result:{answer:'全历史均值约75.8%。'},previous:null},script:simple({tool:'aggregate',scopes:['s:数学'],metric:'rate',ops:['mean','count'],category:'高二',range:'all'},'高二3场，平均80%。',/数学得分率平均|数学得分率有效场次/),check:r=>[match(r,/80%/),fact(r,'数学得分率平均',/^80%/),fact(r,'数学得分率有效场次',/^3 场/)]},
];
const argv=process.argv.slice(2);
const option=(name,fallback)=>argv.find(x=>x.startsWith('--'+name+'='))?.split('=').slice(1).join('=')??fallback;
const live=argv.includes('--live');
const selectedMode=option('mode','standard');
const selection=option('case','all');
const repeat=Number(option('repeat','1'));
const maxCredits=Number(option('max-credits','0'));
const maxCalls=Number(option('max-calls','0'));
const out=option('out','');
const baselinePath=option('baseline','');
const modes=selectedMode==='all'?['low','standard','high']:[selectedMode];
if(modes.some(m=>!['low','standard','high'].includes(m))||!Number.isInteger(repeat)||repeat<1||repeat>5)throw Error('invalid mode or repeat');
if(live&&(!process.env.STUDY_EVAL_API_KEY||!(maxCredits>0&&maxCredits<=10000)||!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>150))throw Error('Live evaluation requires a dedicated STUDY_EVAL_API_KEY, --max-credits and --max-calls. No production account or data is used.');
const budget={spent:0,calls:0,unknown:false};
const providerFetch=global.fetch;
function fakeDb(test,mode){
  const tasks=new Map(),turns=new Map();
  const priorId='01000000-0000-4000-8000-000000000001';
  if(test.previous){
    tasks.set(priorId,{id:priorId,user_id:'eval-owner',feature:'study_question',status:'succeeded',charged_credits:0});
    turns.set(priorId,{task_id:priorId,user_id:'eval-owner',turn:test.previous});
  }
  let spent=0,approved=0,calls=0,usage={prompt:0,output:0,cache:0,reasoning:0},trace=[];
  return {priorId,stats:()=>({spent,calls,usage,trace}),db:{
    from(table){
      const filters={};
      const read=()=>table==='score_tracker_ai_configs'?{data:{enabled:true,model:'deepseek-flash',base_url:'https://api.deepseek.com',openrouter_api_key:live?process.env.STUDY_EVAL_API_KEY:'synthetic'}}:
        {data:[...(table==='score_tracker_study_turns'?turns:tasks).values()].find(r=>Object.entries(filters).every(([k,v])=>r[k]===v))||null};
      return {select(){return this},eq(k,v){filters[k]=v;return this},maybeSingle:read,single:read};
    },
    async rpc(fn,p){
      if(fn.endsWith('task_start')){approved=p.p_cap;tasks.set(p.p_task,{id:p.p_task,user_id:p.p_user,feature:'study_question',status:'active'});return {data:{allowed:true,approved}};}
      if(fn.endsWith('call_reserve'))return {data:spent>=approved?{allowed:false,reason:'task_credit_cap'}:{allowed:true}};
      if(fn.endsWith('call_settle')){
        const u=p.p_usage;
        if(!Number.isFinite(u?.prompt_tokens)||!Number.isFinite(u?.completion_tokens)){if(live)budget.unknown=true;return {data:{known:false}};}
        const hit=Math.max(0,Math.min(u.prompt_tokens,Number(u.prompt_cache_hit_tokens??u.prompt_tokens_details?.cached_tokens??0)||0));
        const credits=((u.prompt_tokens-hit)*2+hit*.04+u.completion_tokens*8)/1000;
        spent+=credits;budget.spent+=credits;
        usage.prompt+=u.prompt_tokens;usage.output+=u.completion_tokens;usage.cache+=hit;usage.reasoning+=Number(u.completion_tokens_details?.reasoning_tokens??u.reasoning_tokens??0)||0;
        return {data:{known:true,credits}};
      }
      if(fn.endsWith('study_finish')){const charged=Math.min(approved,Math.ceil(spent));tasks.get(p.p_task).status='succeeded';tasks.get(p.p_task).charged_credits=charged;turns.set(p.p_task,{task_id:p.p_task,user_id:p.p_user,turn:p.p_turn});return {data:{charged}};}
      if(fn.endsWith('task_finish'))return {data:{finished:true,charged:0}};
      throw Error('unexpected eval RPC');
    }
  },fetch:async(url,init)=>{
    const body=JSON.parse(init.body);
    // Approximate conservative pre-call ceiling (not a provider billing guarantee).
    const upper=(Buffer.byteLength(JSON.stringify(body.messages),'utf8')*2+body.max_tokens*8)/1000;
    if(live&&(budget.unknown||budget.calls>=maxCalls||budget.spent+upper>maxCredits))throw Error('evaluation budget stop');
    if(live)budget.calls++;
    calls++;
    trace.push({thinking:body.thinking?.type,maxTokens:body.max_tokens});
    if(live)return providerFetch(url,init);
    const item=test.script[Math.min(calls-1,test.script.length-1)];
    const answer=typeof item==='function'?item(body.messages):item;
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(answer)}}],usage:{prompt_tokens:100,completion_tokens:50,prompt_cache_hit_tokens:0}});
  }};
}
function structureChecks(r){
  const paragraphs=String(r.answer||'').split(/\n\s*\n/).filter(Boolean);
  return [
    typeof r.answer==='string'&&r.answer.trim().length>0,
    chartList(r).length<=3&&(r.chartAfter==null||r.chartAfter.every(n=>Number.isInteger(n)&&n>=1&&n<=paragraphs.length)),
    (r.widgets||[]).length<=3&&(r.widgets||[]).every(w=>Number.isInteger(w.after)&&w.after>=1&&w.after<=paragraphs.length),
    chartList(r).every(c=>c.series?.length&&c.series.every(s=>s.points?.every(p=>p.value===null||Number.isFinite(p.value)))),
    !/<(?:script|iframe)\b/i.test(r.answer||'')
  ];
}
async function main(){
  const chosen=cases.filter(c=>selection==='all'||selection.split(',').includes(c.id));
  if(!chosen.length)throw Error('unknown case selection');
  const rows=[];
  // Fail clearly on fixture/bootstrap errors rather than classifying them as model failures.
  studyTools(snapshot());
  try{
    run: for(const mode of modes)for(let trial=1;trial<=repeat;trial++)for(const c of chosen){
      if(live&&(budget.unknown||budget.calls>=maxCalls||budget.spent>=maxCredits))break run;
      const f=fakeDb(c,mode);global.fetch=f.fetch;global.Deno={env:{get:()=>undefined}};
      const start=performance.now();
      const response=await studyQuestion(f.db,'eval-owner',{requestId:crypto.randomUUID(),question:c.q,thinking:mode,previous:c.previous?f.priorId:undefined},async()=> (c.snapshot||snapshot)());
      const r=response.data||{},stats=f.stats();
      const ok=response.status===200;
      let checks=[];
      try{checks=ok?[...structureChecks(r),...c.check(r)].map(Boolean):[false];}catch{checks=[false];}
      const passed=checks.every(Boolean);
      rows.push({id:c.id,group:c.group,question:c.q,mode,trial,passed,status:response.status,checks,ms:Math.round(performance.now()-start),calls:stats.calls,usage:stats.usage,estimatedCredits:Math.round(stats.spent*1000)/1000,charged:r.charged??0,trace:stats.trace,answer:r.answer||'',evidence:r.evidence||[]});
      console.log((passed?'PASS':'FAIL')+' '+mode+' '+c.id+' '+checks.filter(Boolean).length+'/'+checks.length+' checks, '+stats.calls+' model '+(live?'calls':'replays'));
      if(live&&(budget.unknown||budget.calls>=maxCalls||budget.spent>=maxCredits))break run;
    }
  }finally{global.fetch=providerFetch;delete global.Deno;}
  const report={schema:1,kind:live?'live-model':'deterministic-replay',commit:process.env.GITHUB_SHA||null,planned:chosen.length*modes.length*repeat,executed:rows.length,passed:rows.filter(r=>r.passed).length,results:rows,manualReview:live?['关键结论是否有依据且正确','是否完整回答所有子问题','是否有超越数据复述的分析价值','语言是否自然清楚','组件是否有助于理解']:[]};
  const average=(arr,key)=>arr.length?Math.round(arr.reduce((sum,r)=>sum+r[key],0)/arr.length*100)/100:null;
  report.summary=modes.map(mode=>{const rs=rows.filter(r=>r.mode===mode);return {mode,cases:rs.length,passed:rs.filter(r=>r.passed).length,avgMs:average(rs,'ms'),avgCalls:average(rs,'calls'),avgCredits:average(rs,'estimatedCredits')};});
  if(baselinePath){
    const prev=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
    if(prev.schema!==report.schema||prev.kind!==report.kind)throw Error('baseline must use the same report schema and evaluation kind');
    const old=new Map(prev.results.map(r=>[r.mode+':'+r.trial+':'+r.id,r]));
    report.comparison=rows.flatMap(r=>{
      const p=old.get(r.mode+':'+r.trial+':'+r.id);
      if(!p)return [];
      return [{id:r.id,mode:r.mode,trial:r.trial,regression:p.passed&&!r.passed,improvement:!p.passed&&r.passed,creditsDelta:live?Math.round((r.estimatedCredits-p.estimatedCredits)*1000)/1000:null,msDelta:live?r.ms-p.ms:null}];
    });
  }
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.log('Summary: '+report.passed+'/'+report.executed+' passed; '+report.kind+'; planned '+report.planned);
  console.log(JSON.stringify(report.summary));
  if(report.comparison)console.log('Regressions: '+report.comparison.filter(r=>r.regression).length);
  if(report.passed!==report.executed||report.executed!==report.planned)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
