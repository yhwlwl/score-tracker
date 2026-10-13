const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const helper = fs.readFileSync(path.join(root,'supabase/functions/score-tracker-notices/support.ts'),'utf8').replace(/^export /gm,'');
const scope = {atob,console};vm.createContext(scope);vm.runInContext(helper,scope);
const defaults = vm.runInContext('SUPPORT_DEFAULTS',scope);
const image = 'data:image/png;base64,' + fs.readFileSync(path.join(root,'pwa-icon-192.png')).toString('base64');
const tick = () => new Promise(resolve => setTimeout(resolve,25));
function db() {
  const storage = {config:{...defaults},revision:1,updated_at:null};
  return {storage,from(table) {
    assert.equal(table,'score_tracker_support_config');
    const query = {filters:{},changes:null,select(){return this},eq(key,value){this.filters[key]=value;return this},update(changes){this.changes=changes;return this},async maybeSingle(){
      if(this.changes){if(this.filters.revision!==storage.revision)return {data:null,error:null};Object.assign(storage,this.changes);return {data:{revision:storage.revision},error:null}}
      return {data:{...storage},error:null};
    }};return query;
  }};
}
async function backendTests() {
  const validate=scope.validateSupport;
  for(const qr_image of ['javascript:alert(1)','https://tracker.test/qr.png','//evil.test/qr.png','../qr.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YWJj'])assert.throws(()=>validate({...defaults,enabled:true,qr_image}));
  assert.throws(()=>validate({...defaults,enabled:true}));assert.throws(()=>validate({...defaults,title:''}));assert.throws(()=>validate({...defaults,intro:'x'.repeat(401)}));
  assert.equal(validate({...defaults,enabled:true,qr_image:image}).qr_image,image);
  assert.equal(validate({...defaults,enabled:true,qr_image:'./qr.png'}).enabled,true);
  const database=db();assert.equal((await scope.readSupport(database,true)).enabled,false);
  const saved=await scope.saveSupport(database,{...defaults,enabled:true,qr_image:image,intro:'我修改后的文案',revision:1},'admin');
  assert.equal(saved.revision,2);assert.equal(saved.intro,'我修改后的文案');assert.equal(saved.qr_image,image);
  await assert.rejects(()=>scope.saveSupport(database,{...saved,revision:1,intro:'过时修改'},'admin'),error=>error.status===409);
  assert.equal(database.storage.config.intro,'我修改后的文案');
  const missing={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {error:{code:'PGRST205'}}}}}};
  assert.equal((await scope.readSupport(missing,true)).enabled,false);await assert.rejects(()=>scope.readSupport(missing),error=>error.status===503);

  let handler;const hashes={};for(const token of ['admin','viewer'])hashes[token]=require('node:crypto').createHash('sha256').update(token).digest('hex');
  const serviceDb={from(table){
    if(table==='score_tracker_support_config')return database.from(table);
    if(table==='score_tracker_visit_logs')return {async insert(){return {error:null}}};
    assert.equal(table,'score_tracker_users');let hash;
    return {select(){return this},eq(key,value){hash=value;return this},async maybeSingle(){const token=Object.keys(hashes).find(key=>hashes[key]===hash);return {data:token?{id:token,is_admin:token==='admin',session_expires_at:new Date(Date.now()+60000).toISOString()}:null,error:null}}};
  }};
  const service={atob,Deno:{env:{get:()=>''},serve:fn=>{handler=fn}},createClient:()=>serviceDb,Response,Request,crypto:require('node:crypto').webcrypto,TextEncoder,URL,console};vm.createContext(service);
  vm.runInContext(helper+'\n'+fs.readFileSync(path.join(root,'supabase/functions/score-tracker-notices/index.ts'),'utf8').replace(/^import .*;\n/gm,''),service);
  const request=(body,method='POST')=>handler(new Request('https://notices.test/?action='+body.action,{method,headers:{'Content-Type':'application/json','x-score-token':body.token||''},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
  assert.equal((await request({action:'support_public'})).status,200);
  assert.equal((await request({action:'notification_support_config'} ,'GET')).status,401);
  assert.equal((await request({action:'notification_support_config',token:'viewer'},'GET')).status,403);
  assert.equal((await request({...saved,action:'notification_support_save',token:'viewer'})).status,403);
  assert.equal((await request({action:'notification_support_config',token:'admin'},'GET')).status,200);
  const result=await request({...saved,action:'notification_support_save',token:'admin',revision:2,title:'新的面板标题'});assert.equal(result.status,200);assert.equal((await result.json()).config.title,'新的面板标题');
  assert.equal((await request({...saved,action:'notification_support_save',token:'admin',revision:2})).status,409);
  console.log('PASS: real API handler public read, administrator authorization, validation and optimistic revisions');
}
async function adminTests() {
  const moduleSource=fs.readFileSync(path.join(root,'api/mg-ui.js'),'utf8');
  const html=moduleSource.slice(moduleSource.indexOf('`')+1,moduleSource.lastIndexOf('`'));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{url:'https://admin.test/mg?view=support',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,store=db(),requests=[];
  w.localStorage.setItem('st_admin_token','admin');w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;
  w.Image=class {set src(value){Promise.resolve().then(()=>this.onload?.())}};
  w.fetch=async (url,init={})=>{
    const action=new URL(url,'https://admin.test').searchParams.get('action');
    const body=JSON.parse(init.body||'{}');requests.push({action,body});
    if(action==='notification_support_config')return {ok:true,json:async()=>({config:await scope.readSupport(store)})};
    if(action==='notification_support_save'){
      try{const config=await scope.saveSupport(store,body,'admin');return {ok:true,json:async()=>({ok:true,config})}}
      catch(error){return {ok:false,status:error.status||400,json:async()=>({error:error.message})}}
    }
    return {ok:true,json:async()=>({})};
  };
  w.eval(script);await tick();assert(d.querySelector('#supportForm'));
  assert.equal(d.querySelectorAll('[data-support-field]').length,15);
  assert(!d.getElementById('support_notice_text'));assert(!d.getElementById('support_notice_link_label'));
  const intro=d.getElementById('support_intro');intro.value='自定义介绍 <img src=x onerror=alert(1)>\n第二行';intro.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert(d.getElementById('supportSaveState').textContent.includes('未保存'));d.getElementById('supportPreview').click();assert(d.querySelector('.drawer-body').textContent.includes('<img src=x'));assert(!d.querySelector('.drawer-body img'));d.getElementById('closeDrawer').click();
  const file=d.getElementById('supportQrFile');Object.defineProperty(file,'files',{configurable:true,value:[new w.File([fs.readFileSync(path.join(root,'pwa-icon-192.png'))],'original.png',{type:'image/png'})]});file.dispatchEvent(new w.Event('change'));await tick();
  assert.equal(d.querySelector('#supportQrPreview img').src,image);
  const enabled=d.querySelector('[data-support-field="enabled"]');enabled.checked=true;enabled.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.getElementById('supportForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(store.storage.config.qr_image,image);assert.equal(store.storage.config.intro,intro.value);assert.equal(store.storage.config.enabled,true);
  const edited=d.getElementById('support_title');edited.value='尚未保存的标题';edited.dispatchEvent(new w.Event('input',{bubbles:true}));
  store.storage.revision++;store.storage.config.title='另一个管理员改了标题';
  d.getElementById('refresh').click();await tick();assert.equal(d.getElementById('support_title').value,'尚未保存的标题');
  d.getElementById('supportForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert(d.getElementById('supportSaveMessage').textContent.includes('刚刚有变化'), 'message='+d.getElementById('supportSaveMessage').textContent+', revisions='+requests.filter(row=>row.action==='notification_support_save').map(row=>row.body.revision).join(','));assert.equal(store.storage.config.title,'另一个管理员改了标题');assert.equal(d.getElementById('support_title').value,'尚未保存的标题');
  d.getElementById('supportReload').click();await tick();assert.equal(d.getElementById('support_title').value,'另一个管理员改了标题');
  d.getElementById('supportQrClear').click();assert(!d.querySelector('[data-support-field="enabled"]').checked);
  assert.equal(requests.filter(row=>row.action==='notification_support_save').length,2);
  dom.window.close();console.log('PASS: real admin editor, original image upload, escaped preview, save, conflict draft retention and explicit reload');
}
async function migrationTests() {
  const {PGlite}=require('@electric-sql/pglite');const local=new PGlite();
  await local.exec('create role anon;create role authenticated;create role service_role bypassrls;create table public.score_tracker_users(id uuid primary key);');
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261012153049_author_support_config.sql'),'utf8');await local.exec(migration);
  assert.equal((await local.query('select count(*)::integer as count from public.score_tracker_support_config')).rows[0].count,1);
  assert.equal((await local.query("select relrowsecurity from pg_class where relname='score_tracker_support_config'")).rows[0].relrowsecurity,true);
  for(const role of ['anon','authenticated']) {
    await local.exec('set role '+role);await assert.rejects(()=>local.query('select * from public.score_tracker_support_config'),error=>error.code==='42501');await local.exec('reset role');
  }
  await local.exec('set role service_role');assert.equal((await local.query('select revision from public.score_tracker_support_config')).rows[0].revision,1);
  await local.exec('update public.score_tracker_support_config set revision=2 where id=1');assert.equal((await local.query('select revision from public.score_tracker_support_config')).rows[0].revision,2);
  await assert.rejects(()=>local.exec('delete from public.score_tracker_support_config'),error=>error.code==='42501');await local.exec('reset role');await local.close();
  console.log('PASS: migration, RLS, anon/authenticated denial and service-only read/update');
}
(async()=>{await backendTests();await adminTests();await migrationTests()})().catch(error=>{console.error(error);process.exitCode=1});
