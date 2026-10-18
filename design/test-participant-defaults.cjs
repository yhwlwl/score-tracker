// NODE_PATH=<directory containing jsdom and @electric-sql/pglite> node design/test-participant-defaults.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const {stripTypeScriptTypes} = require('node:module');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 50));
const moduleId = '11111111-1111-4111-8111-111111111111';
const subjects = [{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}];
const modules = [{id:moduleId,name:'文科组合',subjects:['数学','历史'],isBuiltin:false}];
async function ui() {
  const errors = [], calls = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''), {url:'https://fixture.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});
  w.scrollTo = () => {}; w.setInterval = () => 1;
  let prefs = {total:{year:1000,class:40},'s:历史':{year:120,class:30},['m:'+moduleId]:{year:260,class:35}};
  w.fetch = async (url, options) => {
    const body = JSON.parse(options && options.body || '{}'); calls.push(body);
    let data = {};
    if (body.action === 'list_modules') data = {modules};
    if (['bootstrap','list_exams'].includes(body.action)) data = {user:{id:'a',username:'a'},subjects,modules,exams:[],classification:{label:'年级',options:['高二']},goal:null,participantDefaults:prefs};
    if (body.action === 'save_participant_defaults') {
      for (const [key,row] of Object.entries(body.defaults)) prefs[key] = {...prefs[key],...row};
      data = {participantDefaults:prefs};
    }
    if (body.action === 'save_exam') data = {ok:true,id:'created',created:true,participantDefaults:prefs};
    return new Response(JSON.stringify(data), {status:200,headers:{'content-type':'application/json'}});
  };
  w.eval(read('app-bundle.js')+'\nwindow.state=state;');
  w.eval(read('app-v36.js')); w.eval(read('app-v37.js')); w.eval(read('app-v38.js'));
  Object.assign(w.state,{user:{id:'a',username:'a'},token:'token-a',page:'home',subjectConfigs:subjects,modulesV18:modules,allExams:[],exams:[],classification:{label:'年级',options:['高二']}});
  w.applyExamSubjectsV10([],subjects); await w.dataApiV7('bootstrap');
  w.openExam(); let modal = w.state.modal; await tick();
  const card = name => Array.from(modal.querySelectorAll('.exam-subject-card-v10')).find(c => c.querySelector('.exam-subject-name-v10').value === name);
  assert.equal(modal.querySelector('.pt-year-v25').value,'1000');
  assert.equal(card('历史').querySelector('.year-participants-v16').value,'120');
  assert.equal(card('数学').querySelector('.year-participants-v16').value,'1000');
  const change = (input,v) => { input.value = v; input.dispatchEvent(new w.Event('input',{bubbles:true})); };
  change(modal.querySelector('.pt-year-v25'),'1100'); await tick();
  assert.equal(card('历史').querySelector('.year-participants-v16').value,'120','subject default is independent from total');
  assert.equal(card('数学').querySelector('.year-participants-v16').value,'1100','fallback follows total');
  change(card('数学').querySelector('.year-participants-v16'),'900');
  change(modal.querySelector('.pt-year-v25'),'1200');
  assert.equal(card('数学').querySelector('.year-participants-v16').value,'900','manual exam entry wins');
  const picker = modal.querySelector('#comboPickerV21'); picker.value = moduleId; picker.dispatchEvent(new w.Event('change',{bubbles:true})); await tick();
  assert.equal(modal.querySelector('.combo-yp-v25').value,'260');
  assert.equal(modal.querySelector('.combo-cp-v25').value,'35');
  // Rebuilt combination cards preserve a temporary manual override.
  change(modal.querySelector('.combo-yp-v25'),'280');
  modal.querySelector('.combo-remove-v21').click(); picker.value = moduleId; picker.dispatchEvent(new w.Event('change',{bubbles:true})); await tick();
  assert.equal(modal.querySelector('.combo-yp-v25').value,'280');
  modal.querySelector('#examName').value = '人数测试'; card('数学').querySelector('.actual-v16').value = '90';
  await w.saveExam(null,modal); await tick();
  const saved = calls.find(c => c.action === 'save_exam');
  assert.equal(saved.exam.scores.数学.participants,'900');
  assert.equal(saved.participantDefaults['s:数学'].year,900);
  assert.equal(saved.participantDefaults['m:'+moduleId].year,280);
  assert(!saved.participantDefaults['s:历史'],'automatically filled defaults are not treated as a manual edit');
  console.log('PASS: total fallback, independent subject/combination defaults, dynamic combo cards and manual priority');
  w.openExam({id:'old',name:'旧考试',exam_date:'2025-01-01',scores:{数学:{actual:80,max:150,participants:700},历史:{actual:60,max:100,participants:null}},moduleIds:[moduleId],moduleRanks:{[moduleId]:{yearParticipants:210}}});
  modal = w.state.modal; await tick();
  assert.equal(card('数学').querySelector('.year-participants-v16').value,'700');
  assert.equal(modal.querySelector('.combo-yp-v25').value,'210');
  assert(!modal._participantDraft,'editing an existing exam never records defaults');
  modal.remove(); w.state.modal = null;
  w.openExam({id:null,name:'草稿',exam_date:'2026-01-01',scores:{数学:{actual:80,max:150,participants:880}}}); modal = w.state.modal; await tick();
  assert.equal(card('数学').querySelector('.year-participants-v16').value,'880'); assert(!modal._participantDraft);
  modal.remove(); w.state.modal = null;
  w.state.page = 'account'; w.render(); await tick();
  const box = d.querySelector('.participant-settings'); assert(box); assert.equal(d.querySelectorAll('.participant-settings').length,1);
  const history = box.querySelector('[data-participant-key="s:历史"] [data-participant-scope="year"]');
  history.value = '130'; box.querySelector('button').click(); await tick();
  assert.equal(calls.filter(c=>c.action==='save_participant_defaults').at(-1).defaults['s:历史'].year,130);
  assert.equal(box.querySelector('[role=status]').textContent,'已保存');
  const before = calls.filter(c=>c.action==='save_participant_defaults').length; history.value = '-1'; box.querySelector('button').click(); await tick();
  assert.equal(calls.filter(c=>c.action==='save_participant_defaults').length,before); assert.equal(history.getAttribute('aria-invalid'),'true');
  history.value = ''; box.querySelector('button').click(); await tick();
  assert.equal(prefs['s:历史'].year,null,'clear means use total, without re-learning automatically');
  w.state.token = 'token-b'; w.state.user = {id:'b',username:'b'}; w.render(); await tick(); w.openExam(); modal = w.state.modal; await tick();
  assert.notEqual(card('历史').querySelector('.year-participants-v16').value,'130','other accounts cannot inherit subject defaults');
  assert.deepEqual(errors,[]); dom.window.close();
  console.log('PASS: old exams/drafts remain independent, inline settings save/clear/validate, account isolation and existing page scripts');
}
async function api() {
  let handler, prefs = {}, collision = false, expired = false;
  const token='session', hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const db = {from(table) {
    let operation='select', changes, filters=[];
    const q = {select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},in(){return q},
      update(v){operation='update';changes=v;return q},insert(v){operation='insert';changes=v;return q},delete(){operation='delete';return q},
      single(){return execute()},maybeSingle(){return execute()},then(resolve,reject){return execute().then(resolve,reject)}};
    async function execute() {
      if (table === 'score_tracker_users') {
        const session=filters.find(x=>x[0]==='session_token_hash');
        if (session) return {data:session[1]===hash?{id:'verified',username:'verified',session_expires_at:new Date(Date.now()+(expired?-60000:60000)).toISOString(),participant_defaults:prefs}:null,error:null};
        assert.equal(filters.find(x=>x[0]==='id')[1],'verified','all preference access is bound to authenticated user');
        if (operation==='select') return {data:{participant_defaults:JSON.parse(JSON.stringify(prefs))},error:null};
        const expected=JSON.parse(filters.find(x=>x[0]==='participant_defaults')[1]);
        if(collision){collision=false;prefs['s:并发']={year:88};return {data:null,error:null};}
        if(JSON.stringify(expected)!==JSON.stringify(prefs))return {data:null,error:null};
        prefs=JSON.parse(JSON.stringify(changes.participant_defaults));return {data:{participant_defaults:prefs},error:null};
      }
      if(table==='score_tracker_subjects')return {data:subjects.map((s,i)=>({id:String(i),name:s.name,default_max:s.defaultMax,sort_order:i+1})),error:null};
      if(table==='score_tracker_exams'&&operation==='insert')return {data:{id:'new'},error:null};
      if(['score_tracker_scores','score_tracker_exam_modules'].includes(table))return {data:[],error:null};
      throw Error('Unexpected table '+table);
    }
    return q;
  }};
  const source=read('supabase/functions/score-tracker-data-api/index.ts').replace(/^import[^\n]*\n/gm,'');
  const context={createClient:()=>db,Deno:{env:{get:()=> 'test'},serve:f=>handler=f},crypto,TextEncoder,Uint8Array,Response,Request,Date,console};
  vm.runInNewContext(stripTypeScriptTypes(source),context);
  async function request(body){return handler(new Request('https://test.local/data',{method:'POST',body:JSON.stringify(body)}));}
  const body={action:'save_participant_defaults',token,defaults:{'s:历史':{year:120,class:30}}};
  let response=await request({...body,user_id:'someone-else'});assert.equal(response.status,200);assert.equal((await response.json()).participantDefaults['s:历史'].year,120);
  for(const defaults of [{bad:{year:1}},{'s:历史':{year:0}},{'s:历史':{year:1.5}},{'s:历史':{year:true}},{'s:历史':{year:10000001}},{'s:历史':{other:20}},[],null])assert.equal((await request({...body,defaults})).status,400);
  collision=true;assert.equal((await request({...body,defaults:{'s:数学':{year:1000}}})).status,200);assert.equal(prefs['s:并发'].year,88);
  await context.saveParticipantDefaults('verified',{'s:历史':{year:999},'s:新科':{year:500}},true);assert.equal(prefs['s:历史'].year,120);assert.equal(prefs['s:新科'].year,500);
  await request({...body,defaults:{'s:历史':{year:null}}});await context.saveParticipantDefaults('verified',{'s:历史':{year:999}},true);assert.equal(prefs['s:历史'].year,null);
  assert.equal((await request({...body,token:'wrong'})).status,401);expired=true;assert.equal((await request(body)).status,401);expired=false;
  const exam={name:'新考试',exam_date:'2026-10-17',scores:{数学:{actual:90,max:150,participants:1000}}};
  response=await request({action:'save_exam',token,exam,participantDefaults:{'s:数学':{year:2000},'s:新科二':{year:600}}});assert.equal(response.status,200);
  const saved=await response.json();assert(saved.created);assert.equal(saved.participantDefaults['s:数学'].year,1000);assert.equal(saved.participantDefaults['s:新科二'].year,600);
  const before=JSON.stringify(prefs);assert.equal((await request({action:'save_exam',token,exam:{...exam,name:''},participantDefaults:{'s:未保存':{year:300}}})).status,400);assert.equal(JSON.stringify(prefs),before);
  console.log('PASS: actual Edge handler, first-save-only memory, failed saves, clearing, strict validation, session/owner isolation and concurrent settings merge');
}
async function migration() {
  const {PGlite}=require('@electric-sql/pglite'), db=new PGlite();
  const file=fs.readdirSync(path.join(root,'supabase/migrations')).find(p=>p.endsWith('_participant_defaults.sql'));
  assert(file,'migration exists');await db.exec('create table public.score_tracker_users(id uuid primary key);insert into public.score_tracker_users values (gen_random_uuid());');
  const sql=read('supabase/migrations/'+file);await db.exec(sql);await db.exec(sql);
  assert.deepEqual((await db.query('select participant_defaults from score_tracker_users')).rows[0].participant_defaults,{});
  await assert.rejects(()=>db.exec("update score_tracker_users set participant_defaults='[]'::jsonb"));await db.close();
  console.log('PASS: real Postgres migration preserves existing users, initializes empty defaults and rejects invalid JSON shapes');
}
(async()=>{await ui();await api();await migration();})().catch(e=>{console.error(e);process.exitCode=1});
