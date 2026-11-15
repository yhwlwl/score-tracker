/* Synthetic end-to-end setup state transitions; no network or real credentials. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../setup-preferences-guide.js'),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,15));
function harness({fresh=false,version=0,fail='',delay=false}={}){
 const dom=new JSDOM('<!doctype html><body><main id="app">首页</main></body>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[];
 let profile={step:6,completed_at:'now',preference_guide_version:version,school:fresh?null:{name:'测试中学'},selected_subjects:fresh?[]:['物理','化学','地理'],current_grade:'高二'},defaults={total:{year:620,class:48},'s:数学':{year:600}};
 const goal={subjects:{数学:130},totalGoal:600,targetRank:90,school:'理想大学',date:'2027-06-07',dateName:'高考'};
 let visual={theme:'sunny',font:'system',size:'standard'},failure=fail;
 w.AbortSignal=AbortSignal;
 w.state={user:{id:'u1',username:fresh?'new-user':'tester'},token:'fixture',page:'home',onboarding:null,subjectConfigs:['语文','数学','英语','物理','化学','地理'].map(name=>({name,defaultMax:['语文','数学','英语'].includes(name)?150:100})),modulesV18:[{id:'core',name:'语数外',subjects:['语文','数学','英语'],isBuiltin:true},{id:'six',name:'语数外 + 所选科（六科）',subjects:['语文','数学','英语','物理','化学','地理'],isBuiltin:true},{id:'custom',name:'理科重点',subjects:['物理','化学'],isBuiltin:false}],classification:{label:'学段',options:['高二上','高二下']}};
 w.render=()=>{};w.openExam=()=>{};w.loadExams=async()=>{};w.ScoreParticipantDefaults={snapshot:()=>structuredClone(defaults)};w.toast=()=>{};
 w.__v29={currentTheme:()=>visual.theme,reading:()=>({font:visual.font,size:visual.size}),applyTheme:(theme,_s,persist)=>{visual.theme=theme;if(persist)calls.push({action:'persist-theme'})},applyReading:(font,size,persist)=>{visual.font=font;visual.size=size;w.document.documentElement.dataset.uiFont=font;w.document.documentElement.dataset.uiSize=size;if(persist)calls.push({action:'persist-font'})}};

 const appearanceSource=fs.readFileSync(path.join(__dirname,'../app-v29.js'),'utf8');
 const appearanceFunctions=appearanceSource.slice(appearanceSource.indexOf('  function appearanceSettingsHtmlV29'),appearanceSource.indexOf('  /* ================= 产品 Logo'));
 const fontDefinitions=appearanceSource.slice(appearanceSource.indexOf('  var FONT_PRESETS_V29='),appearanceSource.indexOf('  var readingV29='));
 w.eval('(function(){var readingV29=window.__v29.reading();'+fontDefinitions+'var THEMES_V29=["sunny","sky","paper","pink","lavender","mint","night"].map(id=>({id,name:id,meta:"#fff",dot:"#777"}));var currentThemeV29=()=>window.__v29.currentTheme();var applyThemeV29=(...args)=>window.__v29.applyTheme(...args);var applyReadingV29=(font,size,persist)=>{readingV29={font,size};window.__v29.applyReading(font,size,persist)};'+appearanceFunctions+'window.__v29.appearanceHtml=appearanceSettingsHtmlV29;window.__v29.bindAppearance=bindAppearanceSettingsV29;})()');
 w.usernameApiV19=async(action,p)=>{calls.push({action:'rename',...p});return {user:{username:p.username}}};w.changePasswordApiV15=async()=>{calls.push({action:'password'})};
 w.dataApiV7=async(action,p)=>{calls.push({action,...p});if(failure===action)throw Error('模拟保存失败');if(action==='get_goal')return {goal:structuredClone(goal)};if(action==='save_subjects')return {subjects:p.subjects};if(action==='save_participant_defaults'){for(const [key,row]of Object.entries(p.defaults))defaults[key]={...defaults[key],...row};return {participantDefaults:defaults}}if(action==='account_status')return {account:{growth:{level:5,points:300,levels:[{level:6,threshold:500}]},credits:{available:900,monthly:800}}};if(action==='save_classification')return {classification:p.classification};return {ok:true}};
 w.modulesApiV18=async(action,p)=>{calls.push({action,...p});return {modules:p.modules.map((m,i)=>({...m,id:m.id||'new-'+i}))}};
 w.fetch=async(url,o)=>{const b=JSON.parse(o.body);calls.push({...b,url});if(delay&&b.action==='get')await new Promise(r=>setTimeout(r,100));if(b.action==='privacy_status')return {ok:true,json:async()=>({enabled:!fresh,configured:!fresh})};if(b.action==='sharing')return {ok:true,json:async()=>({enabled:b.enabled})};if(b.action==='start')profile={...profile,completed_at:'now'};if(b.action==='save')profile={...profile,...b};if(b.action==='school_save')profile.school=b.school;return {ok:true,json:async()=>({profile})};};
 if(fresh)w.state.onboarding={username:'new-user',password:'synthetic-only-123'};
 w.eval(source);
 return {w,calls,get profile(){return profile},get visual(){return visual},get defaults(){return defaults},set failure(v){failure=v},close:()=>dom.window.close()};
}
function $(h,s){return h.w.document.querySelector(s)}
async function next(h){$(h,'[data-next]').click();await wait();await wait();}
async function skip(h){$(h,'[data-skip]').click();await wait();await wait();}
(async()=>{
 let h=harness();await wait();await wait();assert.equal($(h,'#sg-title').textContent,'Hi tester，');assert($(h,'.sg-welcome').textContent.includes('欢迎回来！'));
 await next(h);assert($(h,'.sg-done'));await next(h);assert($(h,'[data-count="s:1"]'));assert.equal($(h,'[data-count="s:1"] [data-field="year"]').value,'600');
 $(h,'[data-count="s:1"] [data-field="year"]').value='700';await next(h);assert.equal(h.defaults['s:数学'].year,700);
 assert(!$(h,'[data-elective="技术"]'));assert(!$(h,'[data-elective="生物"]'));const before=JSON.stringify(h.w.state.modulesV18);$(h,'[data-elective="地理"]').click();$(h,'[data-elective="地理"]').click();await next(h);assert.equal(JSON.stringify(h.w.state.modulesV18),before,'changing electives must not overwrite existing combinations');assert(!h.calls.some(c=>c.action==='save_modules'));
 assert($(h,'[data-preset="junior"]'));$(h,'[data-preset="junior"]').click();assert.equal($(h,'[data-preset="junior"]').getAttribute('aria-pressed'),'true');assert($(h,'.sg-preset-check'));assert.equal(h.w.document.querySelectorAll('.sg-category-row').length,3);assert(!$(h,'.sg-category-editor details'));$(h,'[data-field="grade"]').value='初二';await next(h);assert.equal(h.profile.current_grade,'初二');assert.equal(JSON.stringify(h.w.state.classification.options),JSON.stringify(['初一','初二','初三']));
 await next(h);assert(!h.calls.some(c=>c.action==='school_save'),'unchanged school is not rewritten');
 $(h,'[data-field="goal-rank"]').value='60';await next(h);const saved=h.calls.find(c=>c.action==='save_goal').goal;assert.equal(saved.targetRank,60);assert.equal(saved.date,'2027-06-07');assert.equal(saved.subjects.数学,130);
 assert.equal(h.w.document.querySelectorAll('[data-theme-opt-v29]').length,7);$(h,'[data-reading-font-v29="serif"]').click();assert.equal(h.w.document.documentElement.dataset.uiFont,'serif');$(h,'[data-theme-opt-v29="night"]').click();await next(h);
 assert(!$(h,'#sg-sharing'));assert(!h.calls.some(c=>['sharing','privacy_status'].includes(c.action)),'guide does not read or change sharing');assert.equal(h.profile.privacy_notice_version,undefined);
 assert($(h,'.sg-level-orbit').textContent.includes('5'));await next(h);assert.equal(h.profile.preference_guide_version,2);assert(!$(h,'.sg-root'));h.w.render();await wait();assert(!$(h,'.sg-root'));h.close();

 h=harness({fresh:true});await wait();assert.equal($(h,'#sg-title').textContent,'Hi new-user，');assert($(h,'.sg-welcome').textContent.includes('欢迎使用 Score Tracker！'));await next(h);assert($(h,'.sg-credentials').textContent.includes('synthetic-only-123'));assert(!h.calls.some(c=>JSON.stringify(c).includes('synthetic-only-123')),'credentials are never sent to tracking or setup');await next(h);$(h,'[data-field="username"]').value='changed-name';$(h,'[data-field="password"]').value='newpass123';$(h,'[data-field="confirmation"]').value='wrong';await next(h);assert($(h,'.sg-error').textContent.includes('不一致'));assert(!h.calls.some(c=>c.action==='rename'));$(h,'[data-field="confirmation"]').value='newpass123';await next(h);assert.equal(h.w.state.user.username,'changed-name');assert(h.calls.some(c=>c.action==='password'));
 for(let step=2;step<=7;step++)await skip(h);assert($(h,'.sg-level-orbit'));await next(h);assert.equal(h.profile.preference_guide_version,2);assert(!h.calls.some(c=>['sharing','privacy_status'].includes(c.action)));assert.equal(h.profile.privacy_notice_version,undefined);h.close();

 h=harness({fail:'save_participant_defaults'});await wait();await next(h);await next(h);$(h,'[data-count="total"] [data-field="year"]').value='700';await next(h);assert($(h,'[data-subject-row]'),'failed save stays on the current page');assert($(h,'.sg-error').textContent.includes('模拟'));h.failure='';await next(h);assert($(h,'[data-elective]'));h.close();
 h=harness();await wait();await next(h);await next(h);$(h,'[data-add-subject]').click();const last=h.w.document.querySelectorAll('[data-subject-row]');last[last.length-1].querySelector('[data-field="name"]').value='体育';await next(h);assert($(h,'[data-elective="体育"]'),'custom subjects reach elective choices');assert(!$(h,'[data-elective="技术"]'));h.close();
 h=harness({version:2});await wait();await wait();assert(!$(h,'.sg-root'),'completed guide is not automatically repeated');h.close();
 h=harness({delay:true});h.w.state.user={id:'other',username:'other'};h.w.state.token='other-token';h.w.render();await new Promise(r=>setTimeout(r,140));assert(!h.calls.some(c=>c.action==='save'),'stale account responses never save');h.close();
 const shell=fs.readFileSync(path.join(__dirname,'setup-guide-qa/index.html'),'utf8');
 for(const suffix of ['/?user=new','?user=existing']){
  const urls=[],dom=new JSDOM(shell,{url:'https://fixture.test/design/setup-guide-qa'+suffix,runScripts:'dangerously',beforeParse(w){w.fetch=async(url)=>{urls.push(String(url));return new Response(String(url).includes('fixture.js')?'/* fixture */':'<!doctype html><head></head><body></body>',{headers:{'Content-Type':String(url).includes('fixture.js')?'application/javascript':'text/html'}})}}});
  await wait();assert.deepEqual(urls,['https://fixture.test/index.html','https://fixture.test/design/setup-guide-qa/fixture.js']);
  const frame=dom.window.document.querySelector('iframe').srcdoc;assert(frame.includes("connect-src 'none'"),'preview must fail closed');assert(frame.includes('/* fixture */'));dom.window.close();
 }
 const broken=new JSDOM(shell,{url:'https://fixture.test/design/setup-guide-qa?user=new',runScripts:'dangerously',beforeParse(w){w.fetch=async()=>new Response('<html>404</html>',{status:404,headers:{'Content-Type':'text/html'}})}});await wait();assert(!broken.window.document.querySelector('iframe').srcdoc,'missing fixture must never boot live app');broken.window.close();
 console.log('PASS: unified setup, welcome copy, credentials, preservation, privacy and cleanUrls preview isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
