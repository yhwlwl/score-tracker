// Synthetic regression: saved response handoff, legacy fallback and account isolation.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
const root=require('node:path').resolve(__dirname,'..');
const read=f=>fs.readFileSync(root+'/'+f,'utf8');
async function main(){
 const source=read('app-v7.js'),start=source.indexOf('async function dataApiV7('),end=source.indexOf('function subjectShortV7',start);
 let calls=0,body;
 const state={token:'owner',user:{id:'u'}};
 const ctx={state,DATA_API_V7:'/api',fetch:async(_,o)=>{calls++;body=JSON.parse(o.body);return{ok:true,json:async()=>({fresh:true})}}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const data={user:{id:'u'},examGoalVersion:1,exams:[{id:'e'}],subjects:[],modules:[]};
 const snapshot={owner:'owner',examId:'e',data};
 assert.equal(await ctx.dataApiV7('list_exams',{_savedExamSnapshot:snapshot}),data);
 assert.equal(calls,0);
 for(const invalid of [{...snapshot,owner:'other'},{...snapshot,examId:'missing'},{...snapshot,data:{...data,user:{id:'other'}}}]){
  assert.equal((await ctx.dataApiV7('list_exams',{_savedExamSnapshot:invalid})).fresh,true);
  assert.equal('_savedExamSnapshot' in body,false);
 }
 assert.equal(calls,3);
 assert.equal((await ctx.dataApiV7('list_exams')).fresh,true);
 const server=read('supabase/functions/score-tracker-data-api/index.ts');
 const a=server.indexOf('    if (action === "save_exam") {'),b=server.indexOf('    if (action === "change_password")',a);
 const block=stripTypeScriptTypes('async function handler(){'+server.slice(a,b)+'}');
 async function scenario(body,{failList=false,failDefaults=false,created=false,planned=false}={}){
  let growth=0,listed=0,defaults=0,events=[];
  const user={id:'u',participant_defaults:{}};
  const run=new Function('body','user','action','saveExam','participantPatch','refreshGrowth','saveParticipantDefaults','list','out','db','console',block+';return handler()');
  const r=await run(body,user,'save_exam',async()=>({ok:true,id:'e',created,planned}),v=>v,async()=>{growth++;events.push('growth')},async()=>{defaults++;if(failDefaults)throw Error('test');return {total:{year:300}}},async(u,aware)=>{listed++;events.push('list');assert.equal(aware,true);if(failList)throw Error('test');return {...data,participantDefaults:u.participant_defaults}},v=>v,{}, {error(){}});
  return {r,growth,listed,defaults,events};
 }
 const opt={return_exam_snapshot:1,exam_goal_version:1};
 let x=await scenario(opt);assert.equal(x.r.examSnapshot.user.id,'u');assert.equal(x.growth,1);assert.equal(x.listed,1);
 x=await scenario({});assert.equal(x.listed,0);assert.equal(x.r.ok,true);
 x=await scenario(opt,{failList:true});assert.equal(x.r.ok,true);assert.equal(x.r.examSnapshot,undefined);
 x=await scenario({...opt,participantDefaults:{total:{year:300}}},{created:true});assert.equal(x.r.examSnapshot.participantDefaults.total.year,300);
 x=await scenario({...opt,participantDefaults:{total:{year:300}}},{created:true,failDefaults:true});assert.equal(x.r.ok,true);assert.equal(x.listed,0);assert.ok(x.r.participantDefaultsWarning);
 x=await scenario(opt,{planned:true});assert.equal(x.growth,0);assert.equal(x.listed,1);
 assert.match(read('exam-detail.js'),/delete result\.examSnapshot;\s*var saved = await window\.ScoreExamReflection\.saveEntry/);
 console.log('exam save snapshot regression passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
