const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{createFixture}=require('./exam-reflection-fixture.cjs');
const source=fs.readFileSync(path.join(__dirname,'../exam-reflection.js'),'utf8'),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(fn())return;await pause(30)}throw new Error('Timed out waiting for UI state')}
(async()=>{const f=await createFixture(),doms=[];let offline=false,hold=null,calls=[];
 function device(draft){const dom=new JSDOM('<section id="host"></section>',{url:'https://fixture.test',runScripts:'outside-only'});doms.push(dom);const w=dom.window;w.state={allExams:[{id:f.examId}],exams:[]};w.escapeHtml=s=>String(s).replace(/</g,'&lt;');w.AbortController=AbortController;w.confirm=()=>true;w.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);calls.push(b);if(offline)throw new Error('暂时离线');if(hold&&b.action==='save_exam_reflection')await hold.promise;return f.request(b)};
  const key='st_exam_reflection_v1_'+f.owner+'_'+f.examId;if(draft)w.localStorage.setItem(key,JSON.stringify(draft));
  w.eval(source);let owner=true;const options={userId:f.owner,token:'fixture-token',examId:f.examId,owns:()=>owner};w.ScoreExamReflection.mount(w.document.getElementById('host'),options);
  return {w,key,field:()=>w.document.querySelector('textarea'),status:()=>w.document.querySelector('[data-reflection-status]').textContent,type(text){this.field().value=text;this.field().dispatchEvent(new w.Event('input',{bubbles:true}))},save(){w.document.querySelector('[data-reflection-save]').click()},switchAccount(){owner=false}};
 }
 try{
  const a=device();await until(()=>!a.field().disabled);assert.equal(a.field().value,'');a.type('第一次复盘\n先易后难 <img src=x>');assert(a.w.localStorage.getItem(a.key).includes('第一次复盘'));a.save();await until(()=>a.status().includes('已保存'));assert.equal(a.w.state.allExams[0].reflection,a.field().value);assert.equal(a.w.document.querySelector('img'),null);
  const b=device();await until(()=>!b.field().disabled);assert.equal(b.field().value,a.field().value,'a second device reads persisted text');
  a.type('设备甲的新内容');a.save();await until(()=>a.status().includes('已保存'));
  b.type('设备乙的修改');b.save();await until(()=>!b.w.document.querySelector('[data-reflection-conflict]').hidden);assert.equal(b.field().value,'设备乙的修改');assert(b.w.document.querySelector('[data-reflection-conflict] p').textContent.includes('设备甲'));
  b.w.document.querySelector('[data-reflection-mine]').click();await until(()=>b.status().includes('已保存'));assert.equal((await (await f.request({action:'get_exam_reflection'})).json()).reflection,'设备乙的修改');
  offline=true;b.type('断网时的草稿');b.save();await until(()=>b.status().includes('草稿已留在本机'));const restored=JSON.parse(b.w.localStorage.getItem(b.key));assert.equal(restored.text,'断网时的草稿');offline=false;
  const c=device(restored);await until(()=>!c.field().disabled);assert.equal(c.field().value,'断网时的草稿');c.save();await until(()=>c.status().includes('已保存'));
  const conflict=device({text:'旧设备尚未同步的内容',base:'很早的云端版本',revision:0});await until(()=>!conflict.w.document.querySelector('[data-reflection-conflict]').hidden);assert.equal(conflict.field().value,'旧设备尚未同步的内容');conflict.w.document.querySelector('[data-reflection-cloud]').click();assert.equal(conflict.field().value,'断网时的草稿');
  let release;hold={promise:new Promise(r=>release=r)};c.type('保存期间第一段');c.save();await until(()=>c.status().includes('正在保存'));c.type('保存期间继续输入第二段');release();hold=null;await until(()=>c.status().includes('已保存'));assert.equal((await (await f.request({action:'get_exam_reflection'})).json()).reflection,'保存期间继续输入第二段');
  const base=c.field().value;hold={promise:new Promise(r=>release=r)};c.type('等待保存的版本');c.save();await until(()=>c.status().includes('正在保存'));c.type(base);assert(JSON.parse(c.w.localStorage.getItem(c.key)).text===base,'reverting while save is in flight still preserves the intended draft');release();hold=null;await until(()=>c.status().includes('已保存'));assert.equal((await (await f.request({action:'get_exam_reflection'})).json()).reflection,base);
  const before=calls.filter(c=>c.action==='save_exam_reflection').length;c.type('账号切换前的草稿');c.switchAccount();await pause(1150);assert.equal(calls.filter(c=>c.action==='save_exam_reflection').length,before,'no new save after account change');assert(c.w.localStorage.getItem(c.key).includes('账号切换前'));
  console.log('PASS: UI → real Edge → PostgreSQL, automatic draft, cross-device read, explicit conflicts, offline/reload recovery, edits during save and account isolation');
 }finally{for(const d of doms)d.window.close();await f.pg.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
