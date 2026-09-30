/* Account-scoped completion behavior, real admin UI and notification service contracts.
   Run: NODE_PATH=/path/to/node_modules node design/test-feature-completion.cjs */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(require.resolve('jsdom',{paths:[process.cwd(),process.env.NODE_PATH||'']}));
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'feature-vote.js'),'utf8');
const done={id:'11111111-1111-4111-8111-111111111111',key:'done',label:'图片识别',completedAt:'2026-09-30T12:00:00Z',isActive:false,votedByMe:true,votes:12};
const active={id:'22222222-2222-4222-8222-222222222222',key:'active',label:'成绩分析',isActive:true,votedByMe:false,votes:4};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function server(){return {receipts:new Set(),requests:[],fail:false,delay:0};}
function harness(options={},shared=server()){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<!doctype html><html><head><meta name="application-version" content="v7.0"></head><body></body></html>',{url:'https://vote.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  w.state={user:{id:options.user||'user-a'},token:options.token||'token-a',page:options.account?'account':'home'};w.events=[];w.__stTrack=(type,data)=>w.events.push({type,data});w.visible=options.visible!==false;w.hidden=false;
  Object.defineProperty(w.document,'hidden',{get:()=>w.hidden});
  w.Element.prototype.getClientRects=function(){return w.visible?[this.getBoundingClientRect()]:[];};
  w.Element.prototype.getBoundingClientRect=()=>({top:20,bottom:90,left:20,right:440,width:420,height:70});
  w.matchMedia=()=>({matches:!!options.reduced});
  if(options.intersection){w.observers=[];w.IntersectionObserver=class{constructor(fn){this.fn=fn;w.observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};}
  if(options.storage)Object.entries(options.storage).forEach(([k,v])=>w.localStorage.setItem(k,v));
  if(options.noStorage){w.Storage.prototype.getItem=function(){throw Error('blocked')};w.Storage.prototype.setItem=function(){throw Error('blocked')};}
  w.accountHtml=()=>'';w.bindPage=()=>{};w.render=()=>{w.document.body.innerHTML=w.state.page==='account'?w.accountHtml():'';w.bindPage();};
  w.fetch=async(url,init)=>{
    const b=JSON.parse(init.body);shared.requests.push(b);
    if(b.action==='feature_vote_overview'){
      if(options.overviewDelay)await sleep(options.overviewDelay);
      return {ok:true,json:async()=>({availableCount:1,totalVoters:12,options:[{...done,label:options.label||done.label},active],myVotes:[done]})};
    }
    assert.equal(b.action,'feature_completion_claim');assert(String(url).endsWith('/score-tracker-notices'));
    if(shared.delay)await sleep(shared.delay);
    if(shared.fail)return {ok:false,status:503,json:async()=>({error:'暂时无法读取'})};
    const key=b.token+':'+b.option_id,claimed=!shared.receipts.has(key);shared.receipts.add(key);return {ok:true,json:async()=>({claimed})};
  };
  w.eval(source);return {w,d:w.document,errors,shared,close:()=>w.close()};
}
function click(h,s){const el=h.d.querySelector(s);assert(el,s);el.click();}
const count=(h,event)=>h.w.events.filter(x=>x.type===event).length;
async function run(){
  let h=harness();await h.w.__featureVote.open();await sleep(150);assert(h.d.querySelector('.fv36-revealed'));assert.equal(h.d.querySelector('[data-completion-id] button'),null);click(h,'[data-feature-id="'+active.id+'"]');assert(h.d.querySelector('.selected'));await sleep(1100);assert.equal(count(h,'feature_completion_animation_finished'),1);click(h,'.fv36-close');await h.w.__featureVote.open();await sleep(120);assert.equal(h.d.querySelector('[data-completion-id]'),null);assert(h.d.querySelector('[data-feature-id]'));assert.deepEqual(h.errors,[]);let shared=h.shared;h.close();h=harness({},shared);await h.w.__featureVote.open();await sleep(150);assert.equal(h.d.querySelector('[data-completion-id]'),null);assert.equal(count(h,'feature_completion_animation_started'),0);h.close();console.log('PASS: first reveal, subsequent hiding, active voting, cross-device server receipt and telemetry');

  h=harness({account:true});h.w.render();await sleep(150);assert(h.d.querySelector('#featureVoteCardV36 .fv36-revealed'));click(h,'#featureVoteOpenV36');await sleep(30);assert.equal(h.d.querySelector('#featureVoteV36 [data-completion-id]'),null);h.w.render();await sleep(50);assert.equal(h.d.querySelector('#featureVoteCardV36 [data-completion-id]'),null);assert(!h.d.querySelector('#featureVoteCardV36').textContent.includes(done.label));h.close();console.log('PASS: account card consumes once; completed vote does not reappear as archived history');

  h=harness({reduced:true,noStorage:true});await h.w.__featureVote.open();await sleep(150);assert.equal(h.w.events.find(x=>x.type==='feature_completion_animation_started').data.reduced_motion,true);click(h,'.fv36-close');await h.w.__featureVote.open();assert.equal(h.d.querySelector('[data-completion-id]'),null);h.close();console.log('PASS: reduced motion and blocked local storage');

  h=harness({visible:false});await h.w.__featureVote.open();await sleep(250);assert.equal(h.shared.receipts.size,0);h.w.visible=true;h.w.hidden=true;await sleep(220);assert.equal(h.shared.receipts.size,0);h.w.hidden=false;await sleep(220);assert(h.d.querySelector('.fv36-revealed'));h.close();console.log('PASS: offscreen or hidden pages do not consume the reveal');

  h=harness({intersection:true});await h.w.__featureVote.open();await sleep(220);assert.equal(h.shared.receipts.size,0);h.w.observers[0].fn([{isIntersecting:true}]);await sleep(220);assert(h.d.querySelector('.fv36-revealed'));assert(h.w.observers[0].disconnected);h.close();console.log('PASS: intersection observer waits for actual viewport visibility');

  h=harness({account:true});const blocker=h.d.createElement('div');blocker.className='rn-back';h.w.render();h.d.body.appendChild(blocker);await sleep(250);assert.equal(h.shared.receipts.size,0);blocker.remove();await sleep(220);assert(h.d.querySelector('.fv36-revealed'));h.close();console.log('PASS: account card behind another modal waits');

  shared=server();shared.delay=40;const a=harness({},shared),b=harness({},shared);await Promise.all([a.w.__featureVote.open(),b.w.__featureVote.open()]);await sleep(250);assert.equal(count(a,'feature_completion_animation_started')+count(b,'feature_completion_animation_started'),1);assert.equal(shared.receipts.size,1);a.close();b.close();console.log('PASS: concurrent tabs only animate once');

  h=harness();await h.w.__featureVote.open();await sleep(150);click(h,'.fv36-close');h.w.state.user={id:'user-b'};h.w.state.token='token-b';await h.w.__featureVote.open();await sleep(150);assert.equal(count(h,'feature_completion_animation_started'),2);assert.equal(h.shared.receipts.size,2);h.close();console.log('PASS: separate accounts each get their own reveal');

  shared=server();shared.delay=120;h=harness({},shared);await h.w.__featureVote.open();await sleep(90);h.w.state.user={id:'user-b'};h.w.state.token='token-b';h.w.render();await sleep(160);assert.equal(h.d.querySelector('#featureVoteV36'),null);assert.equal(count(h,'feature_completion_animation_started'),0);assert.equal(count(h,'feature_completion_animation_finished'),0);h.close();console.log('PASS: account switch during claim does not display or attribute the old account animation');

  h=harness({overviewDelay:90});const opening=h.w.__featureVote.open();h.w.state.user={id:'user-b'};h.w.state.token='token-b';await opening;assert.equal(h.d.querySelector('#featureVoteV36'),null);h.close();console.log('PASS: stale overview cannot open a modal for a different account');

  h=harness({label:'<img src=x onerror=alert(1)>'});h.shared.fail=true;await h.w.__featureVote.open();await sleep(150);assert.equal(h.d.querySelector('img'),null);assert.equal(count(h,'feature_completion_claim_failed'),1);assert.equal(h.shared.receipts.size,0);click(h,'.fv36-close');h.shared.fail=false;await h.w.__featureVote.open();await sleep(150);assert(h.d.querySelector('.fv36-revealed'));h.close();console.log('PASS: escaped labels, failed claim telemetry and retry on reopening');

  // Exercise the actual management UI.
  const html=vm.runInNewContext(fs.readFileSync(path.join(root,'api/mg-ui.js'),'utf8').replace('export const MG_HTML','const MG_HTML')+'\nMG_HTML');let completed=false,request;
  const admin=new JSDOM(html,{url:'https://vote.test/mg?view=featurevotes',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.localStorage.setItem('st_admin_token','admin');w.setInterval=()=>1;w.fetch=async(url,init={})=>{const action=new URL(url,w.location.href).searchParams.get('action');if(action==='feature_option_complete'){request=JSON.parse(init.body);completed=true;return {ok:true,json:async()=>({ok:true})};}if(action==='feature_votes')return {ok:true,json:async()=>({options:[{id:done.id,label:done.label,is_active:!completed,completed_at:completed?done.completedAt:null,votes:12}]})};return {ok:true,json:async()=>({ok:true,rows:[]})};}}});await sleep(40);admin.window.document.querySelector('[data-fv-complete]').click();await sleep(50);assert.equal(request.id,done.id);assert.equal(request.context.app_page,'admin_featurevotes');assert.equal(admin.window.document.querySelector('[data-fv-complete]'),null);assert.equal(admin.window.document.querySelector('[data-fv-active]'),null);assert(admin.window.document.querySelector('.table').textContent.includes('已完成'));admin.window.close();console.log('PASS: real admin completion control and persisted badge');

  await backendTest();await proxyTest();
}
async function backendTest(){
  const tables={score_tracker_users:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',is_admin:true,session_token_hash:hash('admin'),session_expires_at:'2099-01-01'},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',is_admin:false,session_token_hash:hash('user'),session_expires_at:'2099-01-01'}],score_tracker_feature_vote_options:[{id:done.id,is_active:true,completed_at:null}],score_tracker_feature_completion_receipts:[],score_tracker_visit_logs:[]};
  function hash(v){return crypto.createHash('sha256').update(v).digest('hex')}
  class Query{
    constructor(name){this.name=name;this.filters=[];this.op='select';}
    select(){return this}eq(k,v){this.filters.push(r=>r[k]===v);return this}is(k,v){return this.eq(k,v)}
    update(values){this.op='update';this.values=values;return this}
    insert(values){this.op='insert';this.values=values;return this}
    upsert(values,options){this.op='upsert';this.values=values;this.keys=options.onConflict.split(',');return this}
    async execute(){const rows=tables[this.name];let data=rows.filter(r=>this.filters.every(f=>f(r)));if(this.op==='update')data.forEach(r=>Object.assign(r,this.values));if(this.op==='insert'){rows.push({...this.values});data=[this.values];}if(this.op==='upsert'){const exists=rows.some(r=>this.keys.every(k=>r[k]===this.values[k]));data=exists?[]:[{...this.values}];rows.push(...data);}return {data,error:null};}
    then(resolve,reject){return this.execute().then(resolve,reject)}async maybeSingle(){const r=await this.execute();return {...r,data:r.data[0]||null}}
  }
  let handler;const scope={Deno:{env:{get:()=>''},serve:fn=>handler=fn},createClient:()=>({from:n=>new Query(n)}),Response,crypto:crypto.webcrypto,URL,TextEncoder,console};vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(root,'supabase/functions/score-tracker-notices/index.ts'),'utf8').replace(/^import .*;\n/gm,''),scope);
  const call=(action,token,body={})=>handler(new Request('https://service.test/?action='+action,{method:'POST',headers:{'content-type':'application/json','x-score-token':token},body:JSON.stringify(body)}));
  assert.equal((await call('feature_option_complete','',{id:done.id})).status,401);assert.equal((await call('feature_option_complete','user',{id:done.id})).status,403);assert.equal((await call('feature_option_complete','admin',{id:'invalid'})).status,400);
  assert.equal((await (await call('feature_completion_claim','user',{option_id:done.id})).json()).claimed,false);
  assert.equal((await call('feature_option_active','admin',{id:done.id,active:false})).status,200);assert.equal(tables.score_tracker_feature_vote_options[0].is_active,false);assert.equal((await call('feature_option_active','admin',{id:done.id,active:true})).status,200);assert.equal(tables.score_tracker_feature_vote_options[0].is_active,true);
  assert.equal((await call('feature_option_complete','admin',{id:done.id})).status,200);assert.equal(tables.score_tracker_feature_vote_options[0].is_active,false);const timestamp=tables.score_tracker_feature_vote_options[0].completed_at;assert(timestamp);
  await call('feature_option_complete','admin',{id:done.id});assert.equal(tables.score_tracker_feature_vote_options[0].completed_at,timestamp);assert.equal(tables.score_tracker_visit_logs.filter(x=>x.event_type==='feature_option_completed').length,1);
  assert.equal((await call('feature_option_active','admin',{id:done.id,active:true})).status,409);
  const claimed=await Promise.all([call('feature_completion_claim','user',{option_id:done.id}),call('feature_completion_claim','user',{option_id:done.id})]);const results=await Promise.all(claimed.map(x=>x.json()));assert.equal(results.filter(x=>x.claimed).length,1);assert.equal(tables.score_tracker_feature_completion_receipts.length,1);assert.equal(tables.score_tracker_visit_logs.filter(x=>x.event_type==='feature_completion_seen').length,1);
  console.log('PASS: real service authentication, admin authorization, idempotent completion, restoration guard, atomic receipt and audit');
}
async function proxyTest(){
  const script=fs.readFileSync(path.join(root,'api/mg.js'),'utf8').replace(/^import .*;\n/gm,'').replace('export default async function handler','async function handler');let fail=false,calls=[];
  const scope={MG_HTML:'',URL,AbortSignal,Buffer,fetch:async(url)=>{calls.push(url);return String(url).includes('feature_completion_admin')?new Response(JSON.stringify({options:[{id:done.id,completed_at:done.completedAt,is_active:false}]}),{status:fail?503:200}):new Response(JSON.stringify({options:[{id:done.id,label:done.label,is_active:true,votes:12}],ai_config:{configured:true}}));}};vm.createContext(scope);vm.runInContext(script,scope);
  function response(){return {code:200,setHeader(){return this},status(n){this.code=n;return this},send(data){this.data=JSON.parse(String(data));return this},json(data){this.data=data;return this}};}
  let res=response();await scope.handler({url:'/api/mg?action=feature_votes',method:'GET',headers:{'x-score-token':'admin'}},res);assert.equal(res.data.options[0].completed_at,done.completedAt);assert.equal(res.data.options[0].is_active,false);assert.equal(res.data.options[0].votes,12);assert.equal(res.data.ai_config.configured,true);
  fail=true;res=response();await scope.handler({url:'/api/mg?action=feature_votes',method:'GET',headers:{}},res);assert.equal(res.code,502);
  fail=false;calls=[];res=response();await scope.handler({url:'/api/mg?action=feature_option_complete',method:'POST',headers:{},body:{id:done.id}},res);assert(calls[0].includes('score-tracker-notices'));
  console.log('PASS: admin proxy merges completion status, preserves settings and avoids misleading state on errors');
}
run().catch(e=>{console.error(e);process.exitCode=1});
