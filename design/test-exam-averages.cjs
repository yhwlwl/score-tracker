// NODE_PATH=<directory containing jsdom and @electric-sql/pglite> node design/test-exam-averages.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(r=>setTimeout(r,50));
const mid='11111111-1111-4111-8111-111111111111',subjects=[{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}],modules=[{id:mid,name:'文科组合',subjects:['数学','历史'],isBuiltin:false}];
async function backend(){
  let handler,next=0;
  const token='test-session',hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
  const tables={score_tracker_users:[{id:'owner',username:'owner',session_token_hash:hash,session_expires_at:'2099-01-01',participant_defaults:{}}],score_tracker_subjects:subjects.map((s,i)=>({id:'s'+i,user_id:'owner',name:s.name,default_max:s.defaultMax,sort_order:i+1})),score_tracker_modules:modules.map(m=>({...m,user_id:'owner'})),score_tracker_exams:[],score_tracker_scores:[],score_tracker_exam_modules:[]},mutations=[];
  const db={from(table){
    let op='select',changes,one=false,filters=[];
    const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},update(v){op='update';changes=v;return q},insert(v){op='insert';changes=v;return q},delete(){op='delete';return q},single(){one=true;return run()},maybeSingle(){one=true;return run()},then(a,b){return run().then(a,b)}};
    async function run(){
      if(!tables[table])return {data:null,error:null};
      let matching=tables[table].filter(r=>filters.every(f=>f(r))),out=matching;
      if(op!=='select')mutations.push({table,op,changes,matching});
      if(op==='insert'){out=(Array.isArray(changes)?changes:[changes]).map(r=>({id:'e'+(++next),averages:{},...structuredClone(r)}));tables[table].push(...out);}
      if(op==='update')out=matching.map(r=>Object.assign(r,structuredClone(changes)));
      if(op==='delete')tables[table]=tables[table].filter(r=>!matching.includes(r));
      return {data:structuredClone(one?out[0]||null:out),error:null};
    }return q;
  }};
  const context={createClient:()=>db,Deno:{env:{get:()=>''},serve:f=>handler=f},crypto,TextEncoder,Uint8Array,Response,Request,Date,console};
  vm.runInNewContext(stripTypeScriptTypes(read('supabase/functions/score-tracker-data-api/index.ts').replace(/^import[^\n]*\n/gm,'')),context);
  const request=body=>handler(new Request('https://test.local/api',{method:'POST',body:JSON.stringify({token,...body})}));
  const exam={name:'均分测试',exam_date:'2026-10-17',moduleIds:[mid],scores:{数学:{actual:110,max:150},历史:{actual:80,max:100}},averages:{total:{class:170.5,year:160},'s:数学':{class:100,year:0},['m:'+mid]:{class:168,year:158}}};
  let r=await request({action:'save_exam',exam,user_id:'other'});assert.equal(r.status,200);const id=(await r.json()).id,stored=tables.score_tracker_exams[0];
  assert.equal(stored.user_id,'owner');assert.equal(stored.averages['s:数学'].year,0);assert.equal(stored.averages.total.basis,'[["历史",100],["数学",150]]');
  r=await request({action:'list_exams'});assert.equal(r.status,200);const listed=(await r.json()).exams[0];assert.equal(listed.averages.total.class,170.5);assert.equal(listed.averages['m:'+mid].year,158);
  const old=structuredClone(exam);delete old.averages;old.id=id;assert.equal((await request({action:'save_exam',exam:old})).status,200);assert.equal(stored.averages.total.class,170.5,'old clients preserve optional data');
  assert.equal((await request({action:'save_exam',exam:{...old,averages:{}}})).status,200);assert.deepEqual(stored.averages,{});
  for(const averages of [null,[],{bad:{class:1}},{'s:不存在':{year:1}},{'s:数学':{class:-1}},{'s:数学':{class:true}},{'s:数学':{class:151}},{'s:数学':{year:1.234}},{total:{year:251}},{['m:'+mid]:{class:999}}]){
    const before=mutations.length;assert.equal((await request({action:'save_exam',exam:{...exam,averages}})).status,400,JSON.stringify(averages));assert.equal(mutations.length,before,'validate before writes');
  }
  assert.equal((await request({action:'save_exam',exam:{...exam,moduleIds:[],averages:{['m:'+mid]:{year:1}}}})).status,400);
  assert.equal((await request({action:'save_exam',exam:{...exam,id:'someone-elses-id'}})).status,404);assert.equal((await request({action:'save_exam',token:'bad',exam})).status,401);
  assert.equal((await request({action:'save_exam',exam:{...exam,total_actual_score:320,averages:{total:{year:300}}}})).status,200,'weighted total has no assumed maximum');
  console.log('PASS: actual Edge save/list, decimals/zero, clear, older clients, ownership and pre-write validation');return listed;
}
async function ui(listed){
  const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
  const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://fixture.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.scrollTo=()=>{};w.setInterval=()=>1;
  w.fetch=async(url,opts)=>{const body=JSON.parse(opts&&opts.body||'{}');calls.push(body);const data=body.action==='list_modules'?{modules}:['bootstrap','list_exams'].includes(body.action)?{user:{id:'owner',username:'owner'},subjects,modules,exams:[],participantDefaults:{},classification:{label:'年级',options:['高二']}}:{ok:true,id:'new',created:true};return new Response(JSON.stringify(data));};
  w.eval(read('app-bundle.js')+'\nwindow.state=state;');for(const f of ['app-v36.js','app-v37.js','app-v38.js'])w.eval(read(f));await tick();
  Object.assign(w.state,{user:{id:'owner',username:'owner'},token:'token',page:'home',subjectConfigs:subjects,modulesV18:modules,allExams:[],exams:[],subject:'数学',trendMetric:'score',scoreBasis:'final',scoreViewV25:'score'});w.applyExamSubjectsV10([],subjects);
  w.openExam();await tick();let modal=w.state.modal;assert.equal(modal.querySelectorAll('.exam-averages').length,3);assert(!modal.querySelector('details.exam-averages'));
  modal.querySelectorAll('.exam-subject-card-v10').forEach(card=>{assert.equal(card.querySelectorAll('.exam-averages input').length,2);assert(card.querySelector('.score-compact-v14').nextElementSibling.matches('.exam-averages'));});
  assert.equal(modal.querySelector('.combo-total-v21 .exam-averages').dataset.averageKey,'total');
  const mean=(key,scope)=>Array.from(modal.querySelectorAll('input[data-average-row]')).find(n=>n.dataset.averageRow===key&&n.dataset.averageScope===scope),input=(n,v)=>{n.value=v;n.dispatchEvent(new w.Event('input',{bubbles:true}));};
  input(mean('s:数学','class'),'100');input(mean('s:数学','year'),'0');input(mean('total','year'),'170.5');
  const pick=modal.querySelector('#comboPickerV21');pick.value=mid;pick.dispatchEvent(new w.Event('change',{bubbles:true}));await tick();input(mean('m:'+mid,'year'),'160');
  assert.equal(mean('m:'+mid,'year').closest('.combo-card-v21').dataset.comboId,mid);assert(modal.querySelector('.combo-score-v21').nextElementSibling.matches('.exam-averages'));
  assert.equal(modal.querySelectorAll('.exam-averages').length,4,'each block owns exactly one mean row');
  modal.querySelector('.combo-remove-v21').click();await tick();assert(!mean('m:'+mid,'year'));pick.value=mid;pick.dispatchEvent(new w.Event('change',{bubbles:true}));await tick();assert.equal(mean('m:'+mid,'year').value,'160');
  modal.querySelector('#examName').value='录入测试';modal.querySelector('.actual-v16').value='110';await w.saveExam(null,modal);await tick();
  const saved=calls.find(c=>c.action==='save_exam');assert.equal(saved.exam.averages['s:数学'].class,100);assert.equal(saved.exam.averages['s:数学'].year,0);assert.equal(saved.exam.averages.total.year,170.5);
  w.openExam(listed);modal=w.state.modal;await tick();assert.equal(mean('total','class').value,'170.5');input(mean('s:数学','class'),'1.234');const count=calls.filter(c=>c.action==='save_exam').length;await w.saveExam(listed.id,modal);assert.equal(calls.filter(c=>c.action==='save_exam').length,count);assert.equal(mean('s:数学','class').getAttribute('aria-invalid'),'true');assert.equal(d.activeElement,mean('s:数学','class'),'invalid inline mean receives focus');
  modal.remove();w.state.modal=null;w.openExam();modal=w.state.modal;assert.equal(mean('s:数学','class').value,'','new exams never inherit means');modal.remove();w.state.modal=null;
  const a=structuredClone(listed),b=structuredClone(listed),c=structuredClone(listed);Object.assign(a,{id:'a',name:'第一次',exam_date:'2026-08-01'});Object.assign(b,{id:'b',name:'中间缺失',exam_date:'2026-09-01',averages:{}});Object.assign(c,{id:'c',name:'最近一次',exam_date:'2026-10-01'});
  Object.assign(w.state,{allExams:[a,b,c],exams:[a,b,c],subject:'数学'});w.render();await tick();let svg=d.querySelector('#chart svg');
  assert.equal(svg.querySelectorAll('path').length,4);assert(d.querySelector('.chart-card .legend').textContent.includes('班级均分'));assert.equal(d.querySelectorAll('#chart circle[data-tip*="年级均分"]').length,2);
  assert.equal(svg.querySelector('path[stroke="#8f62db"]').getAttribute('d').split('M').length,3,'missing means break the line');assert(d.querySelector('.hero-stat').textContent.includes('高于班级均分 19.5 分'));assert(d.querySelector('.hero-stat').textContent.includes('较上次同口径 +0 分'));
  for(const circle of svg.querySelectorAll('circle'))assert(Number(circle.getAttribute('cy'))>=20&&Number(circle.getAttribute('cy'))<=254,'axis contains averages');
  Array.from(d.querySelectorAll('.legend>span')).find(n=>n.textContent.includes('班级均分')).click();await tick();const show=d.querySelector('#v29ColorPop .pk-show-v29 input');assert(show);show.checked=false;show.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(svg.querySelector('path[stroke="#d38429"]').style.display,'none');
  w.state.scoreViewV25='percent';w.render();await tick();svg=d.querySelector('#chart svg');assert(svg.querySelector('circle[data-tip*="年级均分"]'));assert.equal(svg.querySelectorAll('path')[0].getAttribute('stroke'),'#5d72e8');
  d.querySelector('#trendFullV25').click();await tick();assert(d.querySelector('.full-trend-stage-v25').textContent.includes('年级均分'));assert(!d.querySelector('.full-trend-stage-v25').textContent.includes('班级均分'));d.querySelector('.full-trend-modal-v25 .close-btn').click();
  for(const change of [{scoreBasis:'raw'},{scoreBasis:'final',trendMetric:'rank'},{trendMetric:'score',subject:'总览'}]){Object.assign(w.state,change);w.render();await tick();assert(!d.querySelector('#chart circle[data-tip*="均分"]'));}
  Object.assign(w.state,{subject:'文科组合',trendMetric:'score',scoreBasis:'final',scoreViewV25:'score'});assert.equal(w.ScoreAverages.series().length,2);assert.equal(w.ScoreAverages.value(c,'文科组合','year',false),158);assert.equal(w.ScoreAverages.value(c,'总分','year',false),160,'total mean is separately entered');
  const changed=structuredClone(c);changed.scores.数学.max=100;assert.equal(w.ScoreAverages.value(changed,'总分','year',false),null);
  const incomplete=structuredClone(c);incomplete.scores.历史.actual=null;assert.equal(w.ScoreAverages.value(incomplete,'总分','year',false),null);
  const raw=structuredClone(c);raw.scores.数学.actual=null;raw.scores.数学.raw=80;raw.scores.数学.rawMax=100;assert.equal(w.ScoreAverages.comparison(raw,'数学',80),'');assert.equal(w.ScoreAverages.value({...c,total_actual_score:320},'总分','year',true),null);
  const differentCombo=structuredClone(c);differentCombo.id='different';differentCombo.exam_date='2026-09-01';delete differentCombo.scores.历史;
  Object.assign(w.state,{page:'home',allExams:[differentCombo,c],exams:[differentCombo,c],subject:'总分'});w.render();await tick();assert(!d.querySelector('.hero-stat').textContent.includes('较上次同口径'),'different total combinations do not show a score delta');
  const singlePrevious=structuredClone(c);singlePrevious.id='single-previous';singlePrevious.exam_date='2026-09-01';singlePrevious.scores={数学:{actual:110,max:150}};
  const singleLatest=structuredClone(c);singleLatest.id='single-latest';singleLatest.exam_date='2026-10-01';singleLatest.scores={数学:{actual:120,max:150}};singleLatest.averages={};
  Object.assign(w.state,{page:'home',allExams:[singlePrevious,singleLatest],exams:[singlePrevious,singleLatest],subject:'数学'});w.render();await tick();assert(d.querySelector('.hero-stat').textContent.includes('较上次同科 +10 分'),'same subject shows a score delta');
  Object.assign(w.state,{allExams:[b],exams:[b],subject:'数学'});w.render();await tick();assert(!d.querySelector('.chart-card .legend').textContent.includes('均分'));assert(!d.querySelector('.hero-stat').textContent.includes('较上次'));
  Object.assign(w.state,{page:'stats',allExams:[a,b,c],exams:[a,b,c]});w.render();await tick();await tick();assert(!d.querySelector('.sv31-kpi').textContent.includes('较上次'));
  assert(w.__v30.buildCsv([c],'全部').includes('数学 班级均分'));assert(w.__v30.buildTxt([c],'全部').includes('班级均分 100'));assert.equal(JSON.parse(w.__v30.buildJson([c],'全部')).exams[0].averages.total.year,160);assert(w.__v38.buildReport([c],{records:new Set(['details']),charts:new Set(),analysis:new Set()}).includes('班级均分 100'));
  assert.deepEqual(errors,[]);dom.window.close();console.log('PASS: bundled editor, optional fields/dynamic combos, isolation, chart axis/gaps/legend/exports, scoring basis and fair headline');
}
async function migration(){const {PGlite}=require('@electric-sql/pglite'),db=new PGlite();await db.exec('create table score_tracker_exams(id int primary key);insert into score_tracker_exams values (1);');const f=fs.readdirSync(path.join(root,'supabase/migrations')).find(f=>f.endsWith('_exam_averages.sql')),sql=read('supabase/migrations/'+f);await db.exec(sql);await db.exec(sql);assert.deepEqual((await db.query('select averages from score_tracker_exams')).rows,[{averages:{}}]);await assert.rejects(()=>db.exec("update score_tracker_exams set averages='[]'::jsonb"));await db.close();console.log('PASS: additive migration, existing exams, object constraint and safe repeat');}
(async()=>{await ui(await backend());await migration();})().catch(e=>{console.error(e);process.exitCode=1});
