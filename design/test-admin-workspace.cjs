const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom'),{PGlite}=require('@electric-sql/pglite'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(r=>setTimeout(r,15));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await tick()}throw Error('Timed out waiting for UI')}
const uid='00000000-0000-4000-8000-000000000001',cid='00000000-0000-4000-8000-000000000002';
function fixtureDb(){
  const config={version:'v8.0',announcement_title:'公告',announcement_content:'测试',announcement_comments_enabled:true,announcement_comments_public:false,announcement_enabled:true,announcement_history:[]};
  const notice=crypto.createHash('sha256').update('公告\n测试').digest('hex').slice(0,24);
  const tables={score_tracker_notification_config:[{id:1,...config}],score_tracker_users:[{id:uid,username:'student',is_admin:false,session_expires_at:'2099-01-01',session_token_hash:crypto.createHash('sha256').update('student').digest('hex')},{id:'admin',is_admin:true,session_expires_at:'2099-01-01',session_token_hash:crypto.createHash('sha256').update('admin').digest('hex')}],score_tracker_announcement_comments:[{id:cid,user_id:uid,notice_id:notice,content:'请支持作文分析',created_at:'2026-10-26',sequence:1,author:{username:'student'},reply_revision:0},{id:'other-comment',user_id:'other',notice_id:notice,content:'private',sequence:2,reply_revision:0}]};
  const queries=[];
  return {tables,queries,notice,from(table){const q={table,filters:[],changes:null,selection:'',offset:0,end:Infinity,sort:[],head:false,
    select(c,o={}){this.selection=c;this.head=!!o.head;return this},eq(k,v){this.filters.push(r=>r[k]===v);return this},lt(k,v){this.filters.push(r=>r[k]<v);return this},like(k,v){this.filters.push(r=>r[k].startsWith(v.replace('%','')));return this},order(k,o={}){this.sort.push([k,o.ascending===false?-1:1]);return this},range(a,b){this.offset=a;this.end=b+1;return this},limit(n){this.end=n;return this},update(v){this.changes=v;return this},insert(v){(tables[table]||=[]).push(v);return Promise.resolve({error:null})},
    result(){queries.push({table,selection:this.selection,offset:this.offset});let rows=(tables[table]||[]).filter(r=>this.filters.every(f=>f(r)));const count=rows.length;if(this.changes)rows.forEach(r=>Object.assign(r,this.changes));rows.sort((a,b)=>{for(const [k,d] of this.sort){if(a[k]<b[k])return -d;if(a[k]>b[k])return d}return 0});return{data:this.head?null:structuredClone(rows.slice(this.offset,this.end)),count,error:null}},async single(){let r=this.result();return {...r,data:r.data[0]}},async maybeSingle(){return this.single()},then(resolve,reject){return Promise.resolve(this.result()).then(resolve,reject)}};return q;}};
}
async function backend(){
  const pg=new PGlite();await pg.exec('create role anon;create role authenticated;create role service_role bypassrls;create table score_tracker_announcement_comments(id uuid primary key,content text);alter table score_tracker_announcement_comments enable row level security;');
  await pg.exec(read('supabase/migrations/20261026135346_admin_comment_replies.sql'));await pg.exec(`insert into score_tracker_announcement_comments(id,content)values('${cid}','original');`);
  await assert.rejects(pg.query('update score_tracker_announcement_comments set admin_reply=$1',['x'.repeat(2001)]));
  for(const role of ['anon','authenticated']){await pg.exec('set role '+role);await assert.rejects(pg.query('select * from score_tracker_announcement_comments'),/permission denied/);await pg.exec('reset role')}
  await pg.close();
  const db=fixtureDb();let handler;const context={URL,Response,TextEncoder,crypto:crypto.webcrypto,console,createClient:()=>db,Deno:{env:{get:()=>''},serve:f=>handler=f}};
  vm.runInNewContext(read('supabase/functions/score-tracker-notices/index.ts').replace(/^import .*;\n/gm,''),context);
  const call=(action,token,body={})=>handler(new Request('https://fixture/?action='+action,{method:'POST',headers:{'content-type':'application/json','x-score-token':token},body:JSON.stringify(body)}));
  assert.equal((await call('notification_comment_reply','student',{id:cid,revision:0,content:'unauthorized'})).status,403);
  assert.equal((await call('notification_comment_reply','',{id:cid,revision:0,content:'unauthorized'})).status,401);
  let r=await call('notification_comment_reply','admin',{id:cid,revision:0,content:'谢谢，我来看看。'});assert.equal(r.status,200);assert.equal(db.tables.score_tracker_announcement_comments[0].reply_revision,1);
  assert.equal((await call('notification_comment_reply','admin',{id:cid,revision:0,content:'stale'})).status,409);
  r=await call('announcement_comments','student',{notice_id:db.notice});let data=await r.json();assert.equal(data.rows.length,1,'private comments remain scoped to their author');assert.equal(data.rows[0].reply.content,'谢谢，我来看看。');assert(!JSON.stringify(data).includes('admin_replied_by'));
  assert.equal((await call('notification_comment_reply','admin',{id:cid,revision:1,content:''})).status,200);assert.equal(db.tables.score_tracker_announcement_comments[0].content,'请支持作文分析');
  assert.equal((await call('notification_comment_reply','admin',{id:cid,revision:2,content:'x'.repeat(2001)})).status,400);
  const ctx={crypto:crypto.webcrypto,TextEncoder};vm.createContext(ctx);vm.runInContext(read('supabase/functions/score-tracker-admin/user-records.ts').replace('export async function','async function')+';globalThis.records=userRecords;',ctx);
  db.tables.score_tracker_feature_votes=Array.from({length:37},(_,i)=>({id:i,user_id:uid,created_at:'2026-10-'+String((i%25)+1).padStart(2,'0'),option:{label:'作文分析 '+i}})).concat([{id:100,user_id:'other',option:{label:'other'}}]);
  data=await ctx.records(db,new URLSearchParams({id:uid,section:'votes',page:'2'}));assert.equal(data.total,37);assert.equal(data.rows.length,7);assert(data.rows.every(r=>r.user_id===uid));
  await ctx.records(db,new URLSearchParams({id:uid,section:'feedback'}));assert(!db.queries.at(-1).selection.includes('*'));assert(!db.queries.at(-1).selection.includes('guest_access_hash'));
  await assert.rejects(ctx.records(db,new URLSearchParams({id:uid,section:'users'})),/分类/);await assert.rejects(ctx.records(db,new URLSearchParams({id:'invalid',section:'votes'})),/用户/);
  console.log('PASS: real SQL reply limits/RLS, real Edge admin authorization/CAS/reply deletion/private visibility, user-section scope and pagination');
}
async function frontend(){
  let html=vm.runInNewContext(read('api/mg-ui.js').replace('export const MG_HTML','const MG_HTML')+';MG_HTML');
  html=html.replace('  boot();','  window.__adminTest={state:S,cached:cached,invalidate:invalidate,load:loadView,go:go,openUser:openUser};boot();');
  const errors=[],calls=[],pending={},vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));let blocked='',fail='';
  const config={enabled:true,title:'通知',content:'正文',version:'v8.0',announcement_title:'公告',announcement_content:'正文',announcement_id:'notice',revision:1};
  const user={id:uid,username:'fixture-student',depth_score:50,depth_level:'returning',events:100,days:5,exam_count:8,created_at:'2026-09-01'};
  const response=a=>a==='users'?{rows:[user],total_count:1}:a==='user'?{user,depth:{score:50}}:a==='user_records'?{rows:[{id:cid,notice_title:'功能更新',content:'<script>用户评论</script>',reply_revision:0}],total:1,page:1,page_size:30}:a==='ai_config'?{configured:true,enabled:true,beta_only:false,model:'fixture-model'}:a==='feature_votes'?{options:[],users:[],suggestions:[]}:a.startsWith('notification_')?{config,rows:[]}:a==='vision_requests'?{rows:[],total:0,summary:{}}:{rows:[],counts:{},marker:a};
  const dom=new JSDOM(html,{url:'https://fixture/mg?view=users',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.localStorage.setItem('st_admin_token','fixture');w.scrollTo=()=>{};w.confirm=()=>true;w.fetch=async(url,opts)=>{const q=new URL(url,w.location.href).searchParams,a=q.get('action');calls.push({action:a,params:Object.fromEntries(q),body:opts.body});if(a===blocked)await new Promise(r=>pending[a]=r);return {ok:a!==fail,status:a===fail?503:200,json:async()=>a===fail?{error:'fixture failure'}:response(a)}}}});
  const w=dom.window,d=w.document;await until(()=>d.querySelector('[data-user]'));let t=w.__adminTest;
  await t.go('vision');await until(()=>d.getElementById('visionDays'));const n=calls.length;await t.go('users');assert(d.querySelector('[data-user]'),'cache renders immediately');assert.equal(calls.length,n,'fresh tab switch sends no request');
  const search=d.getElementById('globalSearch');search.value='student-search';search.dispatchEvent(new w.Event('input',{bubbles:true}));t.go('vision');await new Promise(r=>setTimeout(r,300));assert.equal(t.state.search,'','pending search cannot leak into another tab');t.go('users');assert.equal(t.state.search,'student-search','search survives returning to the original tab');await until(()=>!t.state.loading);
  blocked='realtime';t.go('recent');await until(()=>pending.realtime);t.go('vision');await until(()=>d.getElementById('visionDays'));pending.realtime();await tick();assert(d.getElementById('visionDays'),'late response cannot replace active tab');assert.equal(t.state.vision.marker,undefined);
  blocked='fixture_read';const p1=t.cached('fixture_read',{},true),p2=t.cached('fixture_read',{},true);await until(()=>pending.fixture_read);assert.equal(calls.filter(x=>x.action==='fixture_read').length,1);pending.fixture_read();await Promise.all([p1,p2]);blocked='';
  fail='vision_requests';await t.load(true);assert(d.getElementById('visionDays'),'failed refresh retains existing content');fail='';
  await t.go('featurevotes');await until(()=>d.getElementById('fvAddOption'));assert(!d.getElementById('aiVisionEnabled'));
  await t.go('vision');d.querySelector('[data-vision-tab=settings]').click();await until(()=>d.getElementById('aiVisionEnabled'));assert.equal(d.getElementById('aiVisionModel').value,'fixture-model');
  const before=calls.length;await t.openUser(uid);await until(()=>d.querySelector('[data-user-tab=comments]'));assert.equal(calls[before].params.summary,'1');assert(!calls.slice(before).some(x=>x.action==='user_records'));
  d.querySelector('[data-user-tab=comments]').click();await until(()=>d.querySelector('[data-user-comment]'));assert(!d.querySelector('#userTab script'));assert(d.querySelector('#userTab').textContent.includes('<script>用户评论</script>'));const seen=calls.filter(x=>x.action==='user_records').length;
  d.querySelector('[data-user-tab=summary]').click();d.querySelector('[data-user-tab=comments]').click();await tick();assert.equal(calls.filter(x=>x.action==='user_records').length,seen);
  d.querySelector('[data-user-comment]').click();await until(()=>d.getElementById('commentReplyForm'));d.getElementById('commentReplyText').value='草稿保留';fail='notification_comment_reply';d.getElementById('commentReplyForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>d.getElementById('commentReplyStatus').textContent.includes('failure'));assert.equal(d.getElementById('commentReplyText').value,'草稿保留');fail='';
  d.getElementById('closeDrawer').click();blocked='users';t.go('users');t.load(true);await until(()=>pending.users);d.getElementById('logout').click();pending.users();await tick();assert(d.getElementById('loginForm'));assert.equal(Object.keys(t.state.cache).length,0);assert.equal(t.state.aiConfig,null);
  assert.deepEqual(errors,[]);w.close();console.log('PASS: actual admin DOM tab cache/no flash, deduplication, out-of-order results, failed refresh, moved settings, lazy user tabs, escaped comments, retained reply draft and logout isolation');
}
(async()=>{await backend();await frontend()})().catch(e=>{console.error(e);process.exitCode=1});
