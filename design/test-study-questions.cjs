const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname,'..');
global.ScoreExamGoals = require('../supabase/functions/_shared/exam-goals.js');
const {studyTools} = require('../supabase/functions/score-tracker-study-api/study-tools.ts');
const {explore,studyQuestion} = require('../supabase/functions/score-tracker-study-api/study-question.ts');
const {studyEventResponse} = require('../supabase/functions/score-tracker-study-api/study-events.ts');
const {loadSnapshot} = require('../supabase/functions/score-tracker-study-api/snapshot.ts');
const moduleId='custom';
const exams=[0,1,2,3,4].map((i)=>({
  id:'fixture-'+i,name:'月考'+(i+1),exam_date:'2026-10-'+(10+i),grade_level:i>=3?'高二':'高一',scores:{
    数学:{actual:100+5*i,max:i===2?120:150,rank:[10,9,18,14,24][i],participants:200,target:112},
    物理:{actual:i===1?null:0,max:100,excludeFromTotal:true}
  },total_actual_score:i===1?122:null,
  moduleIds:[moduleId],moduleRanks:{custom:{yearRank:35,yearParticipants:100}},
  exam_goals:{items:{'s:数学':{rankType:'number',rank:8}}}
}));
async function checkEventStream() {
  let finish, task;
  const response=studyEventResponse(async report=>{
    report({stage:'records'});
    await new Promise(resolve=>{finish=resolve});
    report({stage:'analysis'});
    return {status:200,data:{answer:'期中表现平稳'}};
  },{},done=>{task=done});
  assert.match(response.headers.get('content-type'),/^text\/event-stream/);
  const reader=response.body.getReader();
  const first=await reader.read();
  assert.match(new TextDecoder().decode(first.value),/event: progress\ndata: \{"stage":"records"\}/);
  finish();
  assert.match(new TextDecoder().decode((await reader.read()).value),/"stage":"analysis"/);
  assert.match(new TextDecoder().decode((await reader.read()).value),/event: result.*期中表现平稳/s);
  assert.equal((await reader.read()).done,true);
  await task;

  let resume, background, settled=false;
  const disconnected=studyEventResponse(async report=>{
    report({stage:'records'});
    await new Promise(resolve=>{resume=resolve});
    settled=true;
    return {status:200,data:{}};
  },{},done=>{background=done});
  const opened=disconnected.body.getReader();
  await opened.read();
  await opened.cancel();
  resume();
  await background;
  assert.equal(settled,true,'allow the original metered turn to settle after disconnect');
}
async function roundTrip(snapshot) {
  const tasks=new Map(), turns=new Map(), requests=[];
  let modelCalls=0, settledCalls=0, saved=0, failed=0;
  global.Deno={env:{get:k=>({STUDY_ANALYSIS_BASE_URL:'https://fixture.invalid/api',STUDY_ANALYSIS_MODEL:'deepseek-v4-flash',STUDY_ANALYSIS_API_KEY:'fixture'})[k]}};
  const db={
    from(table){
      const f={};
      const read=()=>{
        if(table==='score_tracker_ai_configs') return {data:{openrouter_api_key:'fixture',base_url:'https://fixture.invalid/api',model:'deepseek-v4-flash',enabled:true}};
        return {data:[...(table==='score_tracker_study_turns'?turns:tasks).values()].find(r=>Object.entries(f).every(([k,v])=>r[k]===v)) || null};
      };
      return {select(){return this},eq(k,v){f[k]=v;return this},single:read,maybeSingle:read};
    },
    async rpc(fn,p){
      if(fn.endsWith('task_start')){
        assert.equal(p.p_feature,'study_question');
        tasks.set(p.p_task,{id:p.p_task,user_id:p.p_user,feature:p.p_feature,status:'active'});
        return {data:{allowed:true}};
      }
      if(fn.endsWith('call_reserve'))return {data:{allowed:true}};
      if(fn.endsWith('call_settle')){settledCalls++;return {data:{known:true}};}
      if(fn.endsWith('study_finish')){
        saved++;
        Object.assign(tasks.get(p.p_task),{status:'succeeded',charged_credits:2});
        turns.set(p.p_task,{task_id:p.p_task,user_id:p.p_user,turn:p.p_turn});
        return {data:{charged:2}};
      }
      if(fn.endsWith('task_finish')){failed++;return {data:{finished:true}};}
      throw Error(fn);
    }
  };
  const old=global.fetch;
  try{
    global.fetch=async(_,init)=>{
      modelCalls++;
      const {messages}=JSON.parse(init.body);
      const q=JSON.parse(messages[1].content);
      requests.push(q);
      const reply=messages.length===2?{tool:'results',exams:[1,2],scopes:['s:数学']}:
        {answer:'数学得分和年级位置一起提升了。',refs:[3],chart:{type:'line',series:[1]}};
      return Response.json({choices:[{message:{content:JSON.stringify(reply)}}],usage:{prompt_tokens:128,completion_tokens:20}});
    };
    const first={requestId:crypto.randomUUID(),question:'这次进步了吗？',user_id:'someone-else'};
    const run=(owner,body,progress)=>studyQuestion(db,owner,body,async()=>snapshot,undefined,progress);
    const progress=[];
    assert.equal((await run('owner',first,stage=>progress.push(stage))).status,200);
    assert.deepEqual(progress,[{stage:'records'},{stage:'planning'},{stage:'tools',tools:['results']},{stage:'analysis'}]);
    assert.equal((await run('owner',first)).data.charged,2);
    assert.equal(modelCalls,2);assert.equal(saved,1);
    const follow={requestId:crypto.randomUUID(),question:'那上一次呢？',previous:first.requestId};
    assert.equal((await run('other',follow)).status,400);assert.equal(modelCalls,2);
    assert.equal((await run('owner',follow)).status,200);
    assert.equal(requests.at(-1).history[0].question,first.question);
    assert.equal(requests.at(-1).history[0].chart,undefined);
    assert.equal(settledCalls,4);
    const budgets=[];
    global.fetch=async(_,init)=>{
      const body=JSON.parse(init.body);
      budgets.push({max:body.max_tokens,thinking:body.thinking?.type});
      const reply=budgets.length===1?{message:{content:JSON.stringify({tool:'results',exams:[1,2],scopes:['s:数学']})}}:
        budgets.length===2?{finish_reason:'length',message:{content:'',reasoning_content:'not an answer'}}:
        {finish_reason:'stop',message:{content:JSON.stringify({answer:'数学得分提升了。',refs:[3]})}};
      return Response.json({choices:[reply],usage:{prompt_tokens:128,completion_tokens:20}});
    };
    const repaired=await run('owner',{...first,requestId:crypto.randomUUID()});
    assert.equal(repaired.status,200);
    assert.equal(repaired.data.answer,'数学得分提升了。');
    assert.deepEqual(budgets,[{max:800,thinking:'disabled'},{max:2000,thinking:'enabled'},{max:1400,thinking:'disabled'}]);
    assert.equal(settledCalls,7);
    global.fetch=async()=>new Response('',{status:503});
    assert.equal((await run('owner',{...first,requestId:crypto.randomUUID()})).status,503);
    assert.equal(failed,1);assert.equal(saved,3);
  } finally {global.fetch=old;delete global.Deno;}
}
async function checkOtherData(snapshot) {
  const requests=[];
  const rich=snapshot.exams.map((exam,i)=>({...exam,
    city_rank:100+i,city_participants:10000,total_rank:20+i,total_participants:200,
    total_class_rank:4,total_class_participants:40,
    scores:{...exam.scores,数学:{...exam.scores.数学,raw:80+i,rawMax:120,classRank:4,classParticipants:40}},
    averages:{'s:数学':{basis:JSON.stringify([['数学',exam.scores.数学.max]]),year:80,yearMax:140}},
  }));
  const tools=studyTools({...snapshot,exams:rich,plans:[{name:'下一场预设',exam_date:'2026-12-01',scores:{数学:{max:150}},
    exam_goals:{planned:true,items:{'s:数学':{score:120,max:150}}}}],
    async longGoal(){return {goal:{subject_goals:{数学:130},target_rank:10},subjects:[{name:'数学',default_max:150}]};},
    async details(kind, ids) {
      requests.push({kind,ids});
      if(kind==='reflection') return ids.map(id=>({id,reflection:'这场先练限时审题。'}));
      if(kind==='types') return ids.map(id=>({id,question_type_scores:{数学:[{name:'选择题',score:30,max:40,cause:'careless'},{name:'解答题',score:40,max:60}]}}));
      return ids.map(id=>({exam_id:id,subject:'数学',questions:[{id:'a',label:'第 3 题',teacher_score:3,max_score:5},{id:'b',label:'未经核对',teacher_score:0,max_score:10}],
        corrections:[{id:'a',verified:true,teacher_score:2,max_score:5}]}));
    },
  });
  const ranks=await tools.query({tool:'results',scopes:['total','s:数学'],ranks:['class','city'],limit:1,basis:'raw'});
  assert.match(JSON.stringify(ranks.facts),/数学原始分.*84\/120/);
  assert.match(JSON.stringify(ranks.facts),/总分市排名.*第 104 名 \/ 10000 人/);
  assert.match(JSON.stringify(ranks.facts),/数学班级排名.*第 4 名 \/ 40 人/);
  assert.deepEqual(requests,[]);
  const matrix=await tools.query({tool:'matrix',scopes:['*'],metric:'class',range:'all'});
  assert.equal(matrix.series[0].values.length,5);
  assert.equal(matrix.series[0].metric,'classRank');
  const overview=await tools.query({tool:'profile',scopes:['s:数学'],range:'all',mode:'distribution'});
  assert.match(JSON.stringify(overview.facts),/最佳得分率.*91\.67%/);
  assert.equal(overview.series[0].values.reduce((sum,row)=>sum+row[1],0),5);
  const radar=await tools.query({tool:'structure',scopes:['*'],exams:[5]});
  assert.equal(radar.series[0].dimension,'subjects');
  const note=await tools.query({tool:'reflection',exams:[3]});
  assert.match(JSON.stringify(note.facts),/限时审题/);
  assert.deepEqual(requests[0].ids,['fixture-2']);
  const patterns=await tools.query({tool:'types',scopes:['s:数学'],exams:[4,5]});
  assert.match(JSON.stringify(patterns.facts),/解答题.*失 40 分/);
  assert.match(JSON.stringify(patterns.facts),/已标记错因 粗心/);
  const paper=await tools.query({tool:'paper',scopes:['s:数学'],exams:[5]});
  assert.match(JSON.stringify(paper.facts),/第 3 题.*失 3 分/);
  assert.doesNotMatch(JSON.stringify(paper),/未经核对/);
  const goal=await tools.query({tool:'longGoal',scopes:['s:数学']});
  assert.match(JSON.stringify(goal.facts),/数学长期目标.*差 6\.67 个百分点/);
  const plans=await tools.query({tool:'plan',scopes:['s:数学'],from:'2026-12-01'});
  assert.match(JSON.stringify(plans.facts),/预设目标.*120\/150/);
  const refs=await tools.query({tool:'benchmarks',scopes:['s:数学'],limit:1});
  assert.match(JSON.stringify(refs.facts),/年级最高分.*140 分/);
  const list=await tools.query({tool:'examList',from:'2026-10-11',to:'2026-10-12'});
  assert.equal(list.facts[0].value,'2 场');
}

async function checkForecastLookup(snapshot) {
  const ranked = {...snapshot, exams:snapshot.exams.map((exam,i)=>({
    ...exam, total_rank:[44,null,55,null,36][i], total_participants:200,
  }))};
  let turns = 0;
  const ranking = await explore(ranked,'下一场大概能排到哪里？',[],async messages=>{
    if (!turns++) {
      const {catalog} = JSON.parse(messages[1].content);
      assert.equal(catalog.history.totalRankCount,3);
      return {tool:'forecast',category:'高二',scopes:['错误科目']};
    }
    const {results:[forecast]} = JSON.parse(messages.at(-1).content);
    assert.equal(forecast.facts[0].kind,'estimate');
    assert.match(forecast.facts[0].source,/参考 3 场考试/);
    return {answer:'暂时无法预测下一场排名，成绩和排名数据是空的。',refs:[]};
  });
  assert.match(ranking.answer,/下次总分的年级排名大概在前 \d+(\.\d+)?%/);
  assert.equal(ranking.chart.series[0].points.at(-1).forecast,true);

  turns = 0;
  const latestOnly = {...ranked, exams:ranked.exams.slice(-1)};
  const partial = await explore(latestOnly,'下一场大概能排到哪里？',[],async messages=>{
    if (!turns++) return {tool:'forecast'};
    const {results:[forecast]} = JSON.parse(messages.at(-1).content);
    assert.match(forecast.notes[0],/已录入 1 场年级排名/);
    return {answer:'数据不足。',refs:[]};
  });
  assert.match(partial.answer,/最近一次年级排名是 第 36 名/);
  assert.equal(partial.evidence.length,1);

  const requested = [];
  turns = 0;
  const all = await explore(ranked,'我各科下次大概能考多少？',[{question:'下一场大概能排到哪里？'}],async messages=>{
    if (!turns++) return {tool:'trajectory',metric:'score',scopes:['s:数学']};
    const {results:[forecast]} = JSON.parse(messages.at(-1).content);
    assert.equal(forecast.facts.filter(f=>f.kind==='estimate').length,turns===2?2:0);
    if (turns===2) return {tool:'trajectory',metric:'score',scopes:['s:数学']};
    return {answer:'目前只有数学生成了下次估计。',refs:[1]};
  },async (subjects,metric,category)=>{
    requested.push(subjects[0]);
    assert.equal(metric,'score');
    assert.equal(category,'__all__');
    return {enabled:true,history:[66,77,70],history_dates:['2026-10-10','2026-10-11','2026-10-12'],
      matches:[{history:[64,74,69],future:[72],match_score:90}]};
  });
  assert.deepEqual(requested.sort(),['数学','物理']);
  assert.match(all.answer,/2 科的下次估计/);
  assert.doesNotMatch(all.answer,/按满分/);
  assert.equal(all.chart.type,'table');
  assert.deepEqual(all.chart.series[0].points.map(p=>[p.label,p.forecast]),[['数学',true],['物理',true]]);
  assert.match(all.evidence[0].value,/按满分 150 分换算/);
}

async function checkSnapshotOwnership() {
  const seen=[];
  const rows=Array.from({length:81},(_,i)=>({id:'visible-'+i,name:'测试',exam_date:'2026-10-01',total_rank:50,
    scoreRows:[],links:[]}));
  const db={from(table){
    const q={table,eq:[]};seen.push(q);
    const chain={select(){return this},eq(field,value){q.eq.push([field,value]);return this;},
      or(){return this},order(){return this},not(){return this},in(field,ids){q.ids=ids;return this;},
      range(a,b){return Promise.resolve({data:rows.slice(a,b+1)});},
      then(resolve){resolve({data:q.ids?.map(id=>({id,reflection:'自有'}))||[]});}};
    return chain;
  }};
  const snapshot=await loadSnapshot(db,'owner');
  assert.equal(snapshot.exams.length,81);
  const pages=seen.filter(q=>q.table==='score_tracker_exams');
  assert.equal(pages.length,2);
  assert.deepEqual(pages[0].eq,[['user_id','owner'],['scoreRows.user_id','owner'],['links.user_id','owner']]);
  await snapshot.details('reflection',['foreign-exam','visible-3'],[]);
  assert.deepEqual(seen.at(-1).ids,['visible-3']);
}
async function checkAgentCompleteness(snapshot) {
  const rich={...snapshot,exams:snapshot.exams.map((exam,i)=>({...exam,
    scores:{...exam.scores,物理:{actual:[60,63,66,66,72][i],max:100,rank:30-i,participants:200}},
    total_actual_score:null,total_rank:40-i,total_participants:200
  }))};
  const requested=[];
  const tools=studyTools(rich,async subjects=>{
    requested.push(subjects[0]);
    if(subjects[0]==='物理') throw Error('temporary');
    return {enabled:true,history:[66,77,70],history_dates:['2026-10-10','2026-10-11','2026-10-12'],matches:[{history:[64,74,69],future:[72],match_score:90}]};
  });
  const forecasts=await tools.query({tool:'trajectory',scopes:['s:数学','s:物理']});
  assert.equal(forecasts.facts.filter(f=>f.kind==='estimate').length,2);
  assert.equal(requested.filter(s=>s==='物理').length,2);
  const fallback=forecasts.facts.find(f=>f.label==='物理下次得分率估计');
  assert.match(fallback.source,/个人历史粗略参考.*查询暂时失败/);
  const table=tools.chart(null,'我各科下次大概能考多少？');
  assert.equal(table.type,'table');
  const p=table.series[0].points.find(p=>p.label==='物理');
  assert.equal(p.value,66);
  assert.equal(p.low,undefined);
  assert.equal(p.high,undefined);
  const converted=table.series.find(s=>s.metric==='score');
  assert.ok(converted);
  assert.equal(converted.points.find(p=>p.label==='物理').value,66);
  assert.equal(converted.points.find(p=>p.label==='物理').low,undefined);
  const relation=await tools.query({tool:'statistics',scopes:['s:数学','s:物理'],metrics:['rate','rate'],range:'all'});
  const sync=await tools.query({tool:'statistics',scopes:['s:数学','s:物理'],range:'all',mode:'change',allPairs:true});
  assert.ok(sync.facts.some(f=>f.label.endsWith('进退相关性')&&f.value.includes('4 组变化')));
  assert.ok(sync.series.every(s=>s.metric==='rateChange'));
  const verified=tools.chart({type:'line',title:'语文与生物年级排名预测',series:sync.series.map(s=>s.id)},'');
  assert.doesNotMatch(verified.title,/语文|生物|排名|预测/);
  assert.match(verified.title,/数学.*物理.*得分率变化/);
  const normal=await tools.query({tool:'baseline'});
  assert.ok(normal.facts.some(f=>f.label==='各科正常发挥总分'));
  assert.ok(normal.series.some(s=>s.label==='实际较常态'));
  const simulator=tools.simulator(5,{'s:数学':10});
  assert.ok(simulator);
  assert.equal(simulator.subjects.find(s=>s.label==='数学').value,130);
  assert.equal(tools.simulator(5,{'s:数学':100}),null);
  let routeCalls=0;
  const routed=await explore(rich,'我的哪些科目容易同时进步或退步？',[],async messages=>{
    if(routeCalls++===0)return {tool:'statistics',scopes:['s:数学','s:物理']};
    const {results}=JSON.parse(messages.at(-1).content);
    assert.ok(results[0].facts.some(f=>f.label.endsWith('进退相关性')));
    return {answer:'两科的进退关系可参考。',refs:[results[0].facts[0].id]};
  });
  assert.match(routed.answer,/进退关系/);

  assert.match(relation.facts[0].value,/相关系数.*5 场配对/);
  assert.equal(tools.chart({type:'scatter',series:relation.series.map(s=>s.id)},'这两科有关系吗').type,'scatter');
  const scenario=await tools.query({tool:'scenario',exams:[5],adjustments:{'s:数学':10}});
  assert.match(JSON.stringify(scenario.facts),/模拟总分.*变化 \+10 分/);
  const invalid=await tools.query({tool:'scenario',exams:[5],adjustments:{'s:数学':100}});
  assert.equal(invalid.facts.length,0);
  let step=0;
  const rank=await explore(rich,'下一场大概能排到哪里？',[],async()=>{
    return step++===0?{tool:'forecast'}:{answer:'前10%比前40%更靠后。',refs:[1]};
  });
  assert.match(rank.answer,/下次总分的年级排名大概在前/);
  assert.match(rank.answer,/与最近一场相比/);
  assert.doesNotMatch(rank.answer,/更靠后/);
  let calls=0;
  const deeper=await explore(rich,'从长期、难度和目标分析我的数学',[],async()=>{
    return [{tool:'profile',scopes:['s:数学']},{tool:'difficulty',scopes:['s:数学']},{tool:'goals',scopes:['s:数学']},{answer:'先看长期表现，再结合难度与目标。'.repeat(14),refs:[1]}][calls++];
  });
  assert.equal(calls,4);
  assert.ok(deeper.answer.length>180);
  let multi=0;
  const charts=await explore(rich,'比较数学的得分率和排名',[],async messages=>{
    if(multi++===0)return {tool:'results',scopes:['s:数学'],range:'all'};
    const {results:[result]}=JSON.parse(messages.at(-1).content);
    const rate=result.series.find(s=>s.metric==='rate').id,rank=result.series.find(s=>s.metric==='rank').id;
    return {answer:'**得分率**有变化。\n\n排名也需要单独看。',refs:[1],charts:[
      {type:'line',series:[rate],title:'得分率走势',after:1},
      {type:'line',series:[rank],title:'排名走势',after:2},
      {type:'line',series:[rate],title:'重复图表'}]};
  });
  assert.equal(charts.charts.length,2);
  assert.equal(charts.charts[0].series[0].metric,'rate');
  assert.equal(charts.charts[1].series[0].metric,'rank');
  assert.deepEqual(charts.chartAfter,[1,2]);
  let attempt=0;
  const unavailable={...rich,async details(){throw Error('private upstream error')}};
  const partial=await explore(unavailable,'结合数学成绩和考试反思',[],async messages=>{
    if(attempt++===0)return {queries:[{tool:'results',scopes:['s:数学']},{tool:'reflection'}]};
    const {results}=JSON.parse(messages.at(-1).content);
    assert.equal(results[0].status,'ok');
    assert.equal(results[1].status,'failed');
    assert.doesNotMatch(JSON.stringify(results),/private upstream error/);
    return {answer:'数学成绩已经查到，考试反思暂时未能读取。',refs:[results[0].facts[0].id]};
  });
  assert.match(partial.answer,/成绩已经查到/);
  let combined=0;
  const mixed=await explore(rich,'看下我的物理，最近如何，预测下下一次',[],async messages=>{
    if(combined++===0)return {tool:'trajectory',scopes:['s:物理'],metric:'score'};
    const {results}=JSON.parse(messages.at(-1).content);
    assert.equal(results[0].tool,'trajectory');
    assert.equal(results[1].tool,'results');
    return {answer:'近期得分上升。',analysis:'物理近期的实际得分有所提升。',refs:[results[1].facts[0].id]};
  });
  assert.match(mixed.answer,/物理近期的实际得分有所提升/);
  assert.match(mixed.answer,/下次物理的得分率大概是 66%/);
  assert.match(mixed.answer,/历史粗略参考/);
  assert.ok(mixed.evidence.some(f=>f.label==='物理'));
}

async function main() {
  const snapshot={exams,modules:[{id:moduleId,name:'自选组合',subjects:['数学','物理']}]};
  await checkEventStream();
  await roundTrip(snapshot);
  await checkOtherData(snapshot);
  await checkForecastLookup(snapshot);
  await checkAgentCompleteness(snapshot);
  await checkSnapshotOwnership();
  const tools=studyTools(snapshot);
  const data=await tools.query({tool:'results',exams:[2,1,3,900],scopes:['total','m:custom','s:数学','s:物理','bogus']});
  const values=data.facts.map(x=>[x.label,x.value,x.source].join('|')).join('\n');
  assert.match(values,/数学分差\|\+5 分/);assert.doesNotMatch(values,/数学分差.*月考3/);
  assert.match(values,/物理\|0\/100 分/);assert.match(values,/总分\|122\/150 分/);
  assert.match(values,/自选组合\|年级第 35 名 \/ 100 人/);
  assert.match(values,/年级前 4.5%/);
  const goals=await tools.query({tool:'goals',exams:[1],scopes:['s:数学']});
  assert.match(JSON.stringify(goals),/差 12 分/);assert.match(JSON.stringify(goals),/差 2 名/);
  const history=[{question:'上次怎么样？',answer:'有进步。'}];
  let step=0;
  const result=await explore(snapshot,'那这次呢？',history,async messages=>{
    assert.match(messages[1].content,/上次怎么样/);
    return [{tool:'results',exams:[1,2],scopes:['s:数学']},{tool:'goals',exams:[2],scopes:['s:数学']},
      {answer:'数学得分和年级位置一起提升了。',takeaway:'可以接着看看是否已够到目标。',refs:[3],chart:{type:'line',series:[1],title:'数学分数'},next:'离目标还有多远？'}][step++];
  });
  assert.equal(step,3);assert.equal(result.evidence[0].value,'+5 分');
  assert.deepEqual(result.chart.series[0].points.map(p=>p.value),[100,105]);
  const difficulty = await tools.query({tool:'difficulty',scopes:['s:数学'],exams:[5],worth:true,reference:3});
  const original = global.__stScoreWorthModel.compare(exams,'数学',4,{mode:'exam',exam:2});
  assert.equal(difficulty.series[0].values[0][1],Math.round(original.difficulty*100)/100);
  assert.match(JSON.stringify(difficulty.facts),/参考分.*参照 月考3/);
  const forecast = await tools.query({tool:'forecast',scopes:['s:数学']});
  const originalReport = global.PAL2.pipeline.analyzeSeries(exams.map(e=>({rank:e.scores.数学.rank,N:200,score:e.scores.数学.actual,max:e.scores.数学.max})),global.PAL2.productionOptions);
  const chart = tools.chart({type:'line',series:[forecast.series[0].id]},'下一场能排多少');
  const forecastPoint = chart.series[0].points.at(-1);
  assert.equal(forecastPoint.forecast,true);
  assert.equal(forecastPoint.value,Math.round(originalReport.ewmaForecast.percentile*100)/100);
  assert.deepEqual([forecastPoint.low,forecastPoint.high],originalReport.nextExam.ci95Percentile.map(x=>Math.round(x*100)/100));
  const uncertain = await tools.query({tool:'forecast',scopes:['s:物理']});
  assert.equal(uncertain.facts.length,0);
  assert.match(uncertain.notes[0],/参考人数/);
  const tracked = studyTools(snapshot,async (subjects,metric)=>{
    assert.deepEqual(subjects,['数学']);
    assert.equal(metric,'score');
    return {enabled:true,history:[65,72,68],history_dates:['2026-10-10','2026-10-11','2026-10-12'],
      matches:[{history:[63,70,67],future:[72],match_score:89,private_label:'should-never-leave'}]};
  });
  const recent=await tracked.query({tool:'results',scopes:['s:数学'],limit:3});
  const matched = await tracked.query({tool:'trajectory',scopes:['s:数学']});
  assert.match(JSON.stringify(matched.facts),/下次得分率估计.*参考 1 条相近的匿名成绩走势/);
  assert.doesNotMatch(JSON.stringify(matched),/should-never-leave/);
  const historyOnly={type:'line',series:[recent.series.find(s=>s.metric==='rate').id],title:'数学最近几场'};
  const upcoming=tracked.chart(historyOnly,'看下数学最近如何，预测下下一次');
  assert.equal(upcoming.title,'数学下次成绩估计');
  assert.equal(upcoming.series[0].id,matched.series[0].id);
  assert.equal(upcoming.series[0].points.at(-1).forecast,true);
  assert.equal(tracked.chart(historyOnly,'看看最近成绩').series[0].id,historyOnly.series[0]);
  assert.equal(tracked.chart(null,'预测下下次'),null);
  assert.equal(tracked.chart({...historyOnly,type:'table'},'预测下下一次，最近成绩用表格').type,'table');
  const pairs = studyTools(snapshot);
  const whole = await pairs.query({tool:'results',scopes:['s:数学'],range:'all'});
  const insight = whole.facts.find(f=>f.label==='数学得分率与年级位置');
  assert.match(insight.value,/同向 1 次 · 反向 3 次/);
  const deltaIds = whole.series.filter(s=>['rateChange','rankChange'].includes(s.metric)).map(s=>s.id);
  const table = pairs.chart({type:'line',series:[...deltaIds,999],values:[10000]},'把每次分数和年级位置变化列成对照');
  assert.equal(table.type,'table');
  assert.deepEqual(table.series[0].points.map(p=>p.key),['1:2','2:3','3:4','4:5']);
  assert.deepEqual(table.series[1].points.map(p=>p.value),[.5,-4.5,2,-5]);
  assert.equal(pairs.chart({type:'scatter',series:deltaIds},'画散点图').type,'scatter');
  assert.equal(pairs.chart({type:'scatter',series:[deltaIds[0]]},'画散点图').type,'line');
  const cross=await pairs.query({tool:'matrix',scopes:['s:数学','s:物理'],metric:'rate',range:'all'});
  assert.equal(pairs.chart({type:'heatmap',series:cross.series.map(s=>s.id)},'考试热力图').type,'heatmap');
  assert.equal(pairs.chart({type:'line',series:[999]},'数学怎么样'),null);
  let calls=0;
  await assert.rejects(explore(snapshot,'看看数学',[],async()=>calls++?{answer:'答',refs:[999]}:{tool:'results',scopes:['s:数学'],exams:[1]}),/invalid_reference/);
  const dom=new JSDOM('<div id="content"><div class="an-layout"><nav class="an-navigation"></nav></div></div>',{runScripts:'outside-only',url:'https://example.test'});
  const w=dom.window, requests=[];
  w.state={user:{id:'a'},token:'fixture'};
  w.TextDecoder=TextDecoder;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  let respond, sendEvent, disconnect;
  w.fetch=async(url,init)=>{
    const b=JSON.parse(init.body);requests.push(b);
    if(b.action==='study_status')return Response.json({enabled:true,cap:60});
    assert.equal(b.stream,true);
    return new Response(new ReadableStream({start(controller){
      sendEvent=(event,data)=>{
        const bytes=new TextEncoder().encode('event: '+event+'\r\ndata: '+JSON.stringify(data)+'\r\n\r\n');
        const cutoff=bytes.findIndex(b=>b>127)+1 || 12;
        controller.enqueue(bytes.slice(0,cutoff));
        controller.enqueue(bytes.slice(cutoff));
      };
      disconnect=()=>controller.close();
      respond=()=>{sendEvent('result',{status:200,data:{...result,id:b.requestId,charged:3}});disconnect();};
    }}),{headers:{'content-type':'text/event-stream'}});
  };
  for (const name of ['study-question-chart.js','study-questions.js']) w.eval(fs.readFileSync(path.join(root,name),'utf8'));
  const $=s=>w.document.querySelector(s),tick=()=>new Promise(r=>setTimeout(r,5));
  const attach=()=>w.ScoreStudyQuestions.attach($('.an-layout'),$('.an-navigation'));
  attach();await tick();$('.an-study-open').click();
  assert.equal(requests.length,1);
  $('.sq-choice').click();$('button[type=submit]').click();
  assert.equal($('button[type=submit]').disabled,true);
  assert.equal($('.sq-question').textContent,'最近两场，哪科变化最大？');
  assert.equal($('textarea').value,'');
  assert.equal($('[role=status]').textContent,'正在发送…');
  sendEvent('progress',{stage:'tools',tools:['results','difficulty']});await tick();
  assert.equal($('[role=status]').textContent,'正在查看成绩变化和难度参考…');
  respond();await tick();
  assert.equal($('.sq-answer').textContent,result.answer);assert.equal($('details').open,false);
  $('.sq-turn .sq-choice').click();$('button[type=submit]').click();assert.equal(requests.at(-1).previous,requests[1].requestId);
  const followId=requests.at(-1).requestId;
  disconnect();await tick();$('.sq-retry').click();
  assert.equal(requests.at(-1).requestId,followId);
  assert.equal(w.document.querySelectorAll('.sq-question').length,2);
  w.state={user:{id:'b'},token:'different'};attach();respond();await tick();
  assert.equal($('dialog'),null);$('.an-study-open').click();assert.equal($('.sq-turn'),null);
  dom.window.close();
  console.log('Study question data, streaming progress, retry, evidence, follow-up and account switch: OK');
}
main().catch(e=>{console.error(e);process.exitCode=1});
