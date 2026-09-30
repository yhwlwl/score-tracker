/* Behavioral regression suite. Requires jsdom: npm install --no-save jsdom */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(require.resolve('jsdom',{paths:[process.cwd(),process.env.NODE_PATH||'']}));
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'release-notices.js'),'utf8');
const fixture={version:'v7.0',enabled:true,title:'v7.0 更新内容',content:'图片识别功能正式上线了！\n\n新建考试时，进入「快速录入」，选择「图片识别」模式，上传图片即可自动解析。',tip_enabled:false,tip_content:'自然语言快速录入功能已上线。',announcement_enabled:false,announcement_title:'公告',announcement_content:'',revision:1,tip_id:'tip1',announcement_id:'ann1'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function server(options={}){return {config:{...fixture,...options.config},receipts:new Map(),fail:!!options.fail,claimDelay:options.claimDelay||0,requests:[]};}
function harness(options={},shared=server(options)) {
  const errors=[],intervals=[],virtual=new VirtualConsole();virtual.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
  const current=options.current||'v7.0',dom=new JSDOM('<!doctype html><html><head><meta name="application-version" content="'+current+'"></head><body><button id="focusOrigin">首页</button><footer id="app-version-v17"></footer></body></html>',{url:'https://notices.test/?from=share#home',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:virtual});
  const w=dom.window;w.state={user:options.guest?null:{id:'user-a'},token:options.guest?'':'token-a',page:'home'};w.events=[];w.render=function(){};w.renderLogin=function(){};w.__scoreTrackerTrack=(type,data)=>{w.events.push({type,data});return Promise.resolve();};w.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};
  if(options.storage)for(const [k,v] of Object.entries(options.storage))w.localStorage.setItem(k,v);
  if(options.blocking){const b=w.document.createElement('div');b.className=options.blocking;w.document.body.appendChild(b);}
  w.fetch=async(url,init={})=>{
    if(String(url).includes('__cb'))return {ok:true,text:async()=>'<meta name="application-version" content="'+(options.deployed||shared.config.version)+'">'};
    const b=JSON.parse(init.body);shared.requests.push(b);if(shared.fail)return {ok:false,status:503,json:async()=>({error:'暂时无法读取'})};
    if(b.action==='notice_check'||b.action==='notice_public')return {ok:true,json:async()=>({config:shared.config,seen:shared.receipts.get(b.token)||[]})};
    if(b.action==='notice_claim'){if(shared.claimDelay)await sleep(shared.claimDelay);const seen=shared.receipts.get(b.token)||[],claimed=!seen.some(x=>x.kind===b.kind&&x.notice_id===b.notice_id);if(claimed)seen.push({kind:b.kind,notice_id:b.notice_id});shared.receipts.set(b.token,seen);return {ok:true,json:async()=>({claimed})};}
    throw Error('Unexpected action: '+b.action);
  };
  w.eval(source);return {w,d:w.document,dom,shared,errors,intervals,close:()=>w.close()};
}
function click(h,selector){const el=h.d.querySelector(selector);assert(el,selector);el.click();}
async function initial(h){await sleep(190);}
function storage(h){return Object.fromEntries(Array.from({length:h.w.localStorage.length},(_,i)=>{const k=h.w.localStorage.key(i);return [k,h.w.localStorage.getItem(k)];}));}
async function run(){
  let h=harness();await initial(h);assert.equal(h.d.querySelector('.rn-action').textContent,'我知道了');assert.equal(h.d.querySelector('#releaseTip'),null);assert.equal(h.d.querySelector('#rnTitle').textContent,'v7.0 更新内容');click(h,'.rn-action');await h.w.__releaseNotices.check('login');assert.equal(h.d.querySelector('.rn-back'),null);
  click(h,'#app-version-v17');await sleep(20);assert(h.d.querySelector('.rn-back'));h.d.querySelector('.rn-back').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(h.d.querySelector('.rn-back'),null);const local=storage(h),shared=h.shared;const types=h.w.events.map(x=>x.type);for(const t of ['update_check_started','update_check_completed','update_prompt_shown','update_acknowledged','update_prompt_dismissed','version_update_opened','notice_suppressed'])assert(types.includes(t),t);assert.deepEqual(h.errors,[]);h.close();h=harness({storage:local},shared);await initial(h);assert.equal(h.d.querySelector('.rn-back'),null);h.close();console.log('PASS: current version, reload deduplication, manual access, telemetry');

  h=harness({current:'v6.4'});await initial(h);assert.equal(h.d.querySelector('.rn-action').textContent,'现在更新');click(h,'.rn-action');await sleep(20);assert.equal(JSON.parse(h.w.sessionStorage.getItem('st_notice_update_pending')).to,'v7.0');assert(h.w.events.some(x=>x.type==='update_apply'));h.close();console.log('PASS: old-version button, refresh intent and update event');

  h=harness();await initial(h);click(h,'.rn-action');h.shared.config.version='v7.1';h.shared.config.title='v7.1 更新内容';const period=h.intervals.find(x=>x.ms===1800000);assert(period);const now=h.w.Date.now();h.w.Date.now=()=>now+1800001;period.fn();await sleep(20);assert.equal(h.d.querySelector('.rn-action').textContent,'现在更新');h.close();console.log('PASS: 30-minute polling detects new release');

  h=harness();await initial(h);click(h,'.rn-action');h.w.state.user={id:'user-b'};h.w.state.token='token-b';h.w.render();await initial(h);assert(h.d.querySelector('.rn-back'));h.close();console.log('PASS: per-account receipts');

  h=harness({guest:true});await initial(h);assert.equal(h.d.querySelector('.rn-back'),null);click(h,'#app-version-v17');await sleep(20);assert(h.d.querySelector('.rn-back'));h.close();console.log('PASS: manual access before login');

  h=harness({config:{announcement_enabled:true,announcement_content:'<img src=x onerror=alert(1)> 新消息',tip_enabled:true}});await initial(h);click(h,'.rn-action');await sleep(400);assert.equal(h.d.querySelector('#rnTitle').textContent,'公告');assert.equal(h.d.querySelector('.rn-content img'),null);click(h,'.rn-action');await sleep(400);assert(h.d.querySelector('#releaseTip'));click(h,'#releaseTip button');await h.w.__releaseNotices.check('interval');assert.equal(h.d.querySelector('.rn-back'),null);assert.equal(h.d.querySelector('#releaseTip'),null);h.close();console.log('PASS: queued announcements/tips, escaping and deduplication');

  h=harness({blocking:'fv36-back'});await initial(h);assert.equal(h.d.querySelector('.rn-back'),null);h.d.querySelector('.fv36-back').remove();await sleep(400);assert(h.d.querySelector('.rn-back'));h.close();console.log('PASS: waits for blocking modal');

  h=harness({claimDelay:180});await sleep(140);h.w.state.user={id:'user-b'};h.w.state.token='token-b';h.w.render();await sleep(550);assert.equal(h.w.events.filter(x=>x.type==='update_prompt_shown').length,1);assert(h.shared.receipts.has('token-b'));h.close();console.log('PASS: account change during pending claim');

  const s=server({claimDelay:40}),a=harness({},s),b=harness({},s);await sleep(250);assert.equal(Number(!!a.d.querySelector('.rn-back'))+Number(!!b.d.querySelector('.rn-back')),1);a.close();b.close();console.log('PASS: concurrent tabs share one automatic prompt');

  h=harness({fail:true});await initial(h);assert.equal(h.d.querySelector('.rn-back'),null);assert(h.w.events.some(x=>x.type==='update_check_failed'));h.shared.fail=false;await h.w.__releaseNotices.check('login');await sleep(20);assert(h.d.querySelector('.rn-back'));h.close();console.log('PASS: failure telemetry and retry');

  h=harness({config:{enabled:false}});await initial(h);assert.equal(h.d.querySelector('.rn-back'),null);click(h,'#app-version-v17');await sleep(20);assert(h.d.querySelector('.rn-back'));h.close();console.log('PASS: admin disables auto prompt while manual access remains');

  // Run the actual admin document and exercise its API contract.
  const html=vm.runInNewContext(fs.readFileSync(path.join(root,'api/mg-ui.js'),'utf8').replace('export const MG_HTML','const MG_HTML')+'\nMG_HTML');let c={...fixture},saved,conflict=false;const adminErrors=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>adminErrors.push(e.message));const admin=new JSDOM(html,{url:'https://notices.test/mg?view=notices',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.localStorage.setItem('st_admin_token','admin-token');w.setInterval=()=>1;w.fetch=async(url,init={})=>{const action=new URL(url,w.location.href).searchParams.get('action');if(action==='notification_config')return {ok:true,json:async()=>({config:c})};if(action==='notification_config_save'){if(conflict)return {ok:false,status:409,json:async()=>({error:'内容刚刚有变化，请刷新后再保存'})};saved=JSON.parse(init.body);c={...c,...saved,revision:c.revision+1};return {ok:true,json:async()=>({ok:true,config:c})};}return {ok:true,json:async()=>({ok:true,counts:{},rows:[]})};}}});const d=admin.window.document;await sleep(30);assert(d.querySelector('#notice_content'));
  d.querySelector('#notice_content').value='<script>alert(1)</script> 新的更新说明';d.querySelector('#notice_content').dispatchEvent(new admin.window.Event('input',{bubbles:true}));d.querySelector('[data-notice-preview="release"]').click();assert(d.querySelector('#drawerLayer'));assert.equal(d.querySelector('#drawerLayer script'),null);d.querySelector('#closeDrawer').click();d.querySelector('#noticeForm').dispatchEvent(new admin.window.Event('submit',{bubbles:true,cancelable:true}));await sleep(30);assert.equal(saved.content,'<script>alert(1)</script> 新的更新说明');assert.equal(saved.tip_enabled,false);
  conflict=true;d.querySelector('#notice_title').value='保留我的修改';d.querySelector('#noticeForm').dispatchEvent(new admin.window.Event('submit',{bubbles:true,cancelable:true}));await sleep(30);assert.equal(d.querySelector('#notice_title').value,'保留我的修改');assert(d.querySelector('#noticeSaveMessage').textContent.includes('请刷新'));assert.deepEqual(adminErrors,[]);admin.window.close();console.log('PASS: real admin document, previews, persisted fields, conflict draft retention');

  const backend=fs.readFileSync(path.join(root,'supabase/functions/score-tracker-notices/index.ts'),'utf8'),scope={Deno:{env:{get:()=>''},serve:()=>{}},createClient:()=>({}),Response,crypto:require('node:crypto').webcrypto,URL,TextEncoder,console};vm.createContext(scope);vm.runInContext(backend.replace(/^import .*;\n/gm,''),scope);scope.input={...fixture};assert.equal(vm.runInContext('validate(input).version',scope),'v7.0');scope.input.version='v07.00.0';assert.equal(vm.runInContext('validate(input).version',scope),'v7.0');scope.input.version='invalid';assert.throws(()=>vm.runInContext('validate(input)',scope));scope.input={...fixture,tip_enabled:true,tip_content:''};assert.throws(()=>vm.runInContext('validate(input)',scope));console.log('PASS: backend version and content validation');
}
run().catch(e=>{console.error(e);process.exitCode=1});
