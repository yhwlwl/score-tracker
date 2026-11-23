const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname,'..');
global.ScoreExamGoals = require('../supabase/functions/_shared/exam-goals.js');
const {studyTools} = require('../supabase/functions/score-tracker-data-api/study-tools.ts');
const {explore,studyQuestion} = require('../supabase/functions/score-tracker-data-api/study-question.ts');
const moduleId='custom';
const exams=[0,1,2].map((i)=>({
  name:'月考'+(i+1),exam_date:'2026-10-'+(10+i),scores:{
    数学:{actual:100+5*i,max:i===2?120:150,rank:10-i,participants:200,target:112},
    物理:{actual:i===1?null:0,max:100,excludeFromTotal:true}
  },total_actual_score:i===1?122:null,
  moduleIds:[moduleId],moduleRanks:{custom:{yearRank:35,yearParticipants:100}},
  exam_goals:{items:{'s:数学':{rankType:'number',rank:8}}}
}));
async function roundTrip(snapshot) {
  const tasks=new Map(), turns=new Map(), requests=[];
  let modelCalls=0, settledCalls=0, saved=0, failed=0;
  global.Deno={env:{get:k=>({STUDY_ANALYSIS_BASE_URL:'https://fixture.invalid/api',STUDY_ANALYSIS_MODEL:'deepseek-v4-flash',STUDY_ANALYSIS_API_KEY:'fixture'})[k]}};
  const db={
    from(table){
      const f={};
      const read=()=>({data:[...(table==='score_tracker_study_turns'?turns:tasks).values()].find(r=>Object.entries(f).every(([k,v])=>r[k]===v)) || null});
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
      const reply=messages.length===2?{tool:'results',exams:[1,2],scopes:['s:数学']}:{answer:'数学提高了 5 分。',refs:[3]};
      return Response.json({choices:[{message:{content:JSON.stringify(reply)}}],usage:{prompt_tokens:128,completion_tokens:20}});
    };
    const first={requestId:crypto.randomUUID(),question:'这次进步了吗？',user_id:'someone-else'};
    const run=(owner,body)=>studyQuestion(db,owner,body,async()=>snapshot);
    assert.equal((await run('owner',first)).status,200);
    assert.equal((await run('owner',first)).data.charged,2);
    assert.equal(modelCalls,2);assert.equal(saved,1);
    const follow={requestId:crypto.randomUUID(),question:'那上一次呢？',previous:first.requestId};
    assert.equal((await run('other',follow)).status,400);assert.equal(modelCalls,2);
    assert.equal((await run('owner',follow)).status,200);
    assert.equal(requests.at(-1).history[0].question,first.question);
    assert.equal(settledCalls,4);
    global.fetch=async()=>new Response('',{status:503});
    assert.equal((await run('owner',{...first,requestId:crypto.randomUUID()})).status,503);
    assert.equal(failed,1);assert.equal(saved,2);
  } finally {global.fetch=old;delete global.Deno;}
}
async function main() {
  const snapshot={exams,modules:[{id:moduleId,name:'自选组合',subjects:['数学','物理']}]};
  await roundTrip(snapshot);
  const tools=studyTools(snapshot);
  const data=tools.query({tool:'results',exams:[2,1,3,900],scopes:['total','m:custom','s:数学','s:物理','bogus']});
  const values=data.map(x=>[x.label,x.value,x.source].join('|')).join('\n');
  assert.match(values,/数学分差\|\+5 分/);assert.doesNotMatch(values,/数学分差.*月考3/);
  assert.match(values,/物理\|0\/100 分/);assert.match(values,/总分\|122\/150 分/);
  assert.match(values,/自选组合\|年级第 35 名 \/ 100 人/);
  assert.match(values,/年级前 4.5%/);
  const goals=tools.query({tool:'goals',exams:[1],scopes:['s:数学']});
  assert.match(JSON.stringify(goals),/差 12 分/);assert.match(JSON.stringify(goals),/差 2 名/);
  const history=[{question:'上次怎么样？',answer:'有进步。'}];
  let step=0;
  const result=await explore(snapshot,'那这次呢？',history,async messages=>{
    assert.match(messages[1].content,/上次怎么样/);
    return [{tool:'results',exams:[1,2],scopes:['s:数学']},{tool:'goals',exams:[2],scopes:['s:数学']},{answer:'数学提高了 5 分。',refs:[3],next:'离目标还有多远？'}][step++];
  });
  assert.equal(step,3);assert.equal(result.evidence[0].value,'+5 分');
  let calls=0;
  await assert.rejects(explore(snapshot,'看看数学',[],async()=>calls++?{answer:'答',refs:[999]}:{tool:'results',scopes:['s:数学'],exams:[1]}),/invalid_reference/);
  const dom=new JSDOM('<div id="content"><div class="an-secondary-row"></div></div>',{runScripts:'outside-only',url:'https://example.test'});
  const w=dom.window, requests=[];
  w.state={user:{id:'a'},token:'fixture'};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  let resolve;
  w.fetch=async(url,init)=>{
    const b=JSON.parse(init.body);requests.push(b);
    if(b.action==='study_status')return Response.json({enabled:true,cap:60});
    return new Promise(r=>{resolve=()=>r(Response.json({...result,id:b.requestId,charged:3}));});
  };
  w.eval(fs.readFileSync(path.join(root,'study-questions.js'),'utf8'));
  const $=s=>w.document.querySelector(s),tick=()=>new Promise(r=>setTimeout(r,5));
  w.ScoreStudyQuestions.attach($('.an-secondary-row'));await tick();$('.an-study-open').click();
  assert.equal(requests.length,1);
  $('.sq-choice').click();$('button[type=submit]').click();
  assert.equal($('button[type=submit]').disabled,true);resolve();await tick();
  assert.equal($('.sq-answer').textContent,result.answer);assert.equal($('details').open,false);
  $('.sq-turn .sq-choice').click();$('button[type=submit]').click();assert.equal(requests.at(-1).previous,requests[1].requestId);
  w.state={user:{id:'b'},token:'different'};w.ScoreStudyQuestions.attach($('.an-secondary-row'));resolve();await tick();
  assert.equal($('dialog'),null);$('.an-study-open').click();assert.equal($('.sq-turn'),null);
  dom.window.close();
  console.log('Study question tools, evidence, follow-up, duplicate click and account switch: OK');
}
main().catch(e=>{console.error(e);process.exitCode=1});
