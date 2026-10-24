const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const helper=read('supabase/functions/score-tracker-notices/support.ts').replace(/^export /gm,'')+'\n'+read('supabase/functions/score-tracker-notices/community.ts').replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
const scope={atob,URL,console};vm.createContext(scope);vm.runInContext(helper,scope);
const defaults=vm.runInContext('COMMUNITY_DEFAULTS',scope),image='data:image/png;base64,'+fs.readFileSync(path.join(root,'pwa-icon-192.png')).toString('base64');
const enabled={...defaults,enabled:true,qr_image:image};
const tick=()=>new Promise(r=>setTimeout(r,25));
async function until(fn){for(let n=0;n<100;n++){if(fn())return;await tick();}throw Error('test wait expired');}
function database(){const row={config:{...defaults},revision:1},logs=[];return {row,logs,from(table){
  if(table==='score_tracker_users'){let hash;return {select(){return this},eq(k,v){hash=v;return this},async maybeSingle(){const token=['admin','viewer'].find(t=>require('node:crypto').createHash('sha256').update(t).digest('hex')===hash);return {data:token?{id:token,is_admin:token==='admin',session_expires_at:'2099-01-01'}:null}}};}
  if(table==='score_tracker_visit_logs')return {async insert(v){logs.push(v);return {error:null}}};
  assert.equal(table,'score_tracker_community_config');let rev,changes;
  return {select(){return this},eq(k,v){if(k==='revision')rev=v;return this},update(v){changes=v;return this},async maybeSingle(){if(changes){if(rev!==row.revision)return {data:null};Object.assign(row,changes);}return {data:structuredClone(row)};}};
}};}
function serviceHarness(){
  const db=database();let handler;
  const service={atob,URL,Response,Request,TextEncoder,crypto:require('node:crypto').webcrypto,console,createClient:()=>db,Deno:{env:{get:()=>''},serve:fn=>handler=fn}};vm.createContext(service);vm.runInContext(helper+'\n'+read('supabase/functions/score-tracker-notices/index.ts').replace(/^import[^\n]*\n/gm,''),service);
  const call=(action,token='',body={},method='POST')=>handler(new Request('https://test.local/?action='+action,{method,headers:{'content-type':'application/json','x-score-token':token},...(method==='POST'?{body:JSON.stringify({...body,action})}:{})}));
  return {db,call,handler};
}
async function backend(){
  for(const extra of [{enabled:true},{title:''},{intro:'x'.repeat(401)},{qr_image:'data:image/svg+xml;base64,PHN2Zz4='},{qr_image:'javascript:alert(1)'},{qr_image:'https://tracker.test/code.png'},{qr_image:'../file.png'},{expires_at:'invalid'},{join_url:'https://weixin.qq.com.evil.test/'},{join_url:'https://user:password@weixin.qq.com/'}])assert.throws(()=>scope.validateCommunity({...defaults,...extra}));
  assert.equal(scope.validateCommunity({...enabled,join_url:'https://weixin.qq.com/g/example'}).join_url,'https://weixin.qq.com/g/example');
  const {db,call}=serviceHarness();
  assert.equal((await call('community_public')).status,401);
  assert.equal((await call('notification_community_config','viewer',{},'GET')).status,403);
  assert.equal((await call('notification_community_save','viewer',{...enabled,revision:1})).status,403);
  let r=await call('community_public','viewer');assert.equal((await r.json()).config.enabled,false);
  r=await call('notification_community_save','admin',{...enabled,revision:1});assert.equal(r.status,200);assert.equal((await r.json()).config.revision,2);
  assert.equal((await call('notification_community_save','admin',{...enabled,revision:1,title:'stale'})).status,409);assert.equal(db.row.config.title,defaults.title);
  r=await call('community_public','viewer');assert.equal((await r.json()).config.qr_image,image);
  assert(!JSON.stringify(db.logs).includes('base64'),'audit excludes QR payload');
  db.row.config.expires_at='2020-01-01T00:00:00Z';r=await call('community_public','viewer');const expired=(await r.json()).config;assert.equal(expired.enabled,false);assert.equal(expired.qr_image,'');
  r=await call('notification_community_config','admin',{},'GET');assert.equal((await r.json()).config.expired,true);
  assert.equal((await call('notification_community_save','admin',{...enabled,expires_at:'2020-01-01T00:00:00Z',revision:2})).status,400);
  console.log('PASS: actual Edge auth/admin boundary, QR/link/date validation, disabled/expired redaction, CAS conflict and audit payload isolation');
}
async function frontend(){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<!doctype html><meta name="application-version" content="v7.0"><div id="app"><main id="content"><div class="account-grid"><section class="account-card">账号信息</section><section class="account-card">设置</section></div></main></div>',{url:'https://test.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
  let c={...enabled},fail=false;const calls=[],events=[];
  w.state={user:{id:'viewer'},token:'viewer',page:'account'};w.render=()=>{};w.bindPage=()=>{};w.renderLogin=()=>{};w.toast=()=>{};w.setInterval=()=>1;w.HTMLAnchorElement.prototype.click=()=>{};
  w.__stTrack=(type,data)=>events.push({type,data});w.__scoreTrackerTrack=w.__stTrack;
  w.escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notice={version:'v7.0',enabled:true,title:'更新内容',content:'新增微信群，欢迎交流。\n[查看交流群](#community)',tip_enabled:false,announcement_enabled:false};
  w.fetch=async(url,init)=>{const body=JSON.parse(init.body||'{}');calls.push(body.action);if(body.action==='community_public'){if(fail)throw Error('offline');return {ok:true,json:async()=>({config:c})};}if(String(url).includes('__cb'))return {ok:true,text:async()=>'<meta name="application-version" content="v7.0">'};return {ok:true,json:async()=>({config:notice,releases:[notice],claimed:true,seen:[]})};};
  try{
    w.eval(read('release-notices.js'));w.eval(read('community.js'));await until(()=>d.querySelector('#communityAccountCard'));
    assert(events.some(e=>e.type==='community_entry_shown'&&e.data.source==='account'));
    assert.equal(d.querySelectorAll('.account-grid>.account-card')[1].id,'communityAccountCard');assert.equal(d.querySelectorAll('#communityAccountCard img').length,0,'QR is not spread across the profile');
    await w.__releaseNotices.check('manual',true);await until(()=>d.querySelector('[data-notice-community]'));const link=d.querySelector('[data-notice-community]');assert.equal(link.hidden,false);
    link.click();await until(()=>d.querySelector('.community-back'));assert.equal(d.querySelector('.rn-back'),null);assert(d.querySelector('#app').hasAttribute('inert'));assert.equal(d.body.style.overflow,'hidden');
    assert(events.some(e=>e.type==='community_opened'&&e.data.source==='notice'));
    const zoom=d.querySelector('.community-qr');zoom.click();assert.equal(zoom.getAttribute('aria-pressed'),'true');
    assert(events.some(e=>e.type==='community_qr_zoomed'&&e.data.expanded===1));
    d.querySelector('[data-community-close]').click();assert(!d.querySelector('#app').hasAttribute('inert'));assert.equal(d.body.style.overflow,'');
    assert(events.some(e=>e.type==='community_closed'&&e.data.reason==='close_button'));
    c={...enabled,join_url:'https://weixin.qq.com/g/example',title:'<img src=x onerror=alert(1)>',intro:'<script>unsafe</script>'};await w.__scoreTrackerCommunity.open('account');assert.equal(d.querySelectorAll('.community-panel img').length,1);assert.equal(d.querySelector('.community-panel script'),null);assert(d.querySelector('#communityTitle').textContent.includes('<img'));assert(events.some(e=>e.type==='community_opened'&&e.data.source==='account'));d.querySelector('[data-community-save]').click();assert(events.some(e=>e.type==='community_qr_save_requested'));d.querySelector('[data-community-join]').onclick();assert(events.some(e=>e.type==='community_join_link_clicked'));
    d.querySelector('img[alt="微信群入群二维码"]').dispatchEvent(new w.Event('error'));assert.equal(d.querySelector('[data-community-save]').disabled,true);assert(events.some(e=>e.type==='community_qr_load_failed'));d.querySelector('[data-community-close]').click();
    c={...enabled,expires_at:new Date(Date.now()+120).toISOString()};await w.__scoreTrackerCommunity.open();await new Promise(r=>setTimeout(r,180));assert.equal(d.querySelector('.community-back'),null);assert.equal(d.querySelector('#communityAccountCard'),null);
    c={...enabled};await w.__scoreTrackerCommunity.load(true);assert(d.querySelector('#communityAccountCard'));
    fail=true;await w.__scoreTrackerCommunity.load(true);assert.equal(d.querySelector('#communityAccountCard'),null,'fail closed instead of showing a stale QR');assert(events.some(e=>e.type==='community_config_load_failed'));await w.__scoreTrackerCommunity.open('account');assert(events.some(e=>e.type==='community_open_unavailable'));fail=false;
    w.state.user=null;w.state.token='';w.render();assert.equal(w.__scoreTrackerCommunity.available(),false);assert.equal(d.querySelector('#communityAccountCard'),null);
    assert.deepEqual(errors,[]);console.log('PASS: profile region, release→current group modal handoff, focus/inert/scroll, zoom, escaping, image error, expiry/offline and logout');
  }finally{w.close();}
}
async function admin(){
  const src=read('api/mg-ui.js'),html=src.slice(src.indexOf('`')+1,src.lastIndexOf('`')),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{url:'https://test.local/mg?view=community',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,db=database();
  w.localStorage.setItem('st_admin_token','admin');w.setInterval=()=>1;w.scrollTo=()=>{};w.confirm=()=>true;w.Image=class{set src(v){Promise.resolve().then(()=>this.onload?.())}};
  w.fetch=async(url,init={})=>{
    const action=new URL(url,'https://test.local').searchParams.get('action'),body=JSON.parse(init.body||'{}');
    try{const data=action==='notification_community_config'?{config:await scope.readCommunity(db)}:action==='notification_community_save'?{config:await scope.saveCommunity(db,body,'admin')}:{config:{version:'v7.0',title:'更新',content:'内容',revision:1},rows:[]};return {ok:true,json:async()=>data};}
    catch(e){return {ok:false,status:e.status,json:async()=>({error:e.message})};}
  };
  try{
    w.eval(script);await until(()=>d.querySelector('#communityForm'));assert.equal(d.querySelector('[data-community-field=enabled]').checked,false);
    const file=d.getElementById('communityQrFile');Object.defineProperty(file,'files',{value:[new w.File([fs.readFileSync(path.join(root,'pwa-icon-192.png'))],'group.png',{type:'image/png'})]});file.dispatchEvent(new w.Event('change'));await until(()=>d.querySelector('#communityQrPreview img'));
    assert.equal(d.querySelector('#communityQrPreview img').src,image,'original image is retained');
    d.querySelector('[data-community-field=enabled]').checked=true;d.querySelector('#communityExpiry').value='2099-01-01T12:00';d.querySelector('#communityExpiry').dispatchEvent(new w.Event('input',{bubbles:true}));
    d.querySelector('#communityForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>db.row.revision===2);await tick();assert.equal(db.row.config.expires_at,'2099-01-01T04:00:00.000Z');
    const title=d.querySelector('#community_title');title.value='未保存的群名';title.dispatchEvent(new w.Event('input',{bubbles:true}));db.row.revision++;
    d.querySelector('#communityForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>d.querySelector('#communityMessage').textContent.includes('刚刚有变化'));assert.equal(d.querySelector('#community_title').value,'未保存的群名');
    d.querySelector('#communityReload').click();await tick();await until(()=>d.querySelector('#community_title').value===defaults.title);
    d.querySelector('#communityQrClear').click();assert.equal(d.querySelector('[data-community-field=enabled]').checked,false);
    d.querySelector('[data-view=notices]').click();await until(()=>d.querySelector('[data-insert-community=content]'));
    d.querySelector('[data-insert-community=content]').click();assert(d.querySelector('#notice_content').value.includes('[查看交流群](#community)'));assert(d.querySelector('#notice_content').value.includes('新增微信交流群'));
    d.querySelector('[data-notice-preview=release]').click();assert(d.querySelector('[data-preview-community]'));assert.equal(d.querySelector('.notice-preview-content img'),null);
    console.log('PASS: admin navigation/editor, original QR upload, Beijing expiry conversion, saved settings, CAS draft retention, clear/reload and update-log insertion/preview');
  }finally{w.close();}
}
module.exports={serviceHarness,defaults,image};
async function proxy(){
  const {handler:edge}=serviceHarness();let upstream;
  const context={MG_HTML:'fixture',URL,Response,Request,AbortSignal,Buffer,console,fetch:async(url,init)=>{upstream=String(url);return edge(new Request(url,init));}};
  vm.createContext(context);vm.runInContext(read('api/mg.js').replace(/^import[^\n]*\n/gm,'').replace('export default async function handler','async function handler'),context);
  for(const [action,method,body] of [['notification_community_config','GET',null],['notification_community_save','POST',{...enabled,revision:1}]]){
    const res={code:0,headers:{},status(n){this.code=n;return this},setHeader(k,v){this.headers[k]=v;return this},json(v){this.value=v;return this},send(v){this.value=v;return this}};
    await context.handler({url:'/api/mg?action='+action,method,headers:{'x-score-token':'admin'},body},res);
    assert.equal(res.code,200);assert(upstream.includes('/score-tracker-notices?'));assert(JSON.parse(res.value.toString()).config);assert(res.headers['Cache-Control'].includes('no-store'));
  }
  console.log('PASS: actual admin same-origin proxy forwards both community actions and auth to the real Edge handler');
}
if(require.main===module)(async()=>{await backend();await frontend();await admin();await proxy();})().catch(e=>{console.error(e);process.exitCode=1});
