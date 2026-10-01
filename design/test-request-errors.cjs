/* Run: NODE_PATH=<directory containing jsdom> node design/test-request-errors.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(r=>setTimeout(r,25));
const api=read('app-v3.js').split('async function api(')[1].split('\nfunction injectExtraStyles')[0];
const login=read('app-v3.js').split('async function login()')[1].split('\nasync function logout')[0];
const dataApi=read('app-v7.js').split('async function dataApiV7(')[1].split('\nfunction subjectShortV7')[0];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','sb-request-id':'server-fixture'}});
function harness(route,options={}){
  const errors=[],requests=[],events=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<!doctype html><head><meta name="application-version" content="v7.0"></head><body><div class="auth-page"><div class="auth-card"><input id="loginUser" value="private-user"><input id="loginPass" value="private-password"><button id="loginBtn">登录</button></div></div></body>',{url:'https://request.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  w.Response=Response;w.matchMedia=()=>({matches:false});w.crypto.randomUUID=()=>crypto.randomUUID();
  w.state={token:'private-token',user:null};w.$=s=>w.document.querySelector(s);w.toast=x=>w.lastToast=x;w.renderLogin=()=>{};w.loadExams=async()=>{};w.render=()=>{w.document.body.textContent='首页'};
  w.localStorage.setItem('st_session_id','unused');w.sessionStorage.setItem('st_session_id','original-session');w.localStorage.setItem('st_visitor_id','original-visitor');
  for(const [k,v] of Object.entries(options.storage||{}))w.localStorage.setItem(k,v);
  Object.defineProperty(w.navigator,'onLine',{get:()=>options.offline!==true});
  w.fetch=async(url,init)=>{const body=JSON.parse(init.body);requests.push(body);if(body.action==='track_event'){events.push(body);return options.trackFails?Promise.reject(new w.TypeError('Failed to fetch')):json({ok:true});}return route(body,w);};
  if(options.telemetry)w.eval(read('telemetry-feedback.js'));
  else w.__scoreTrackerTrack=(eventType,metadata,_,context)=>w.fetch('https://request.test/telemetry',{body:JSON.stringify({action:'track_event',eventType,metadata,context})});
  w.eval("var API='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';var DATA_API_V7='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-data-api';async function api("+api+'\nasync function dataApiV7('+dataApi+'\nasync function login()'+login);
  w.eval(read('app-v28.js'));w.eval(read('app-v37.js'));
  return {w,d:w.document,requests,events,errors,close:()=>w.close()};
}
async function run(){
  let h=harness((b,w)=>b.action==='login'?Promise.reject(new w.TypeError('Failed to fetch')):json({error:'用户名或密码不正确'},401));
  await h.w.login();await tick();let panel=h.d.querySelector('#requestErrorDetails');assert(panel.textContent.startsWith('用户名或密码不正确'));assert(panel.textContent.includes('HTTP_401'));assert(panel.textContent.includes('NETWORK_FETCH_FAILED'));assert(panel.textContent.includes('server-fixture'));assert(!panel.textContent.includes('广告拦截'));assert.equal(h.d.querySelector('#loginBtn').disabled,false);
  let copied;h.w.navigator.clipboard={writeText:async x=>copied=x};panel.querySelector('button').click();await tick();assert(copied.includes('请求编号：st-'));assert(copied.includes('未收到 HTTP 响应'));assert(!/private-user|private-password|private-token/.test(copied));assert.equal(h.events.length,2);assert.equal(h.w.localStorage.getItem('st_request_error_queue'),'[]');h.close();console.log('PASS: fallback HTTP error wins, both requests remain copyable, exact status/message/id and no credentials');

  h=harness(b=>json({error:'请输入用户名和密码'},400));await h.w.login();assert.equal(h.requests.filter(b=>b.action==='login_v2').length,0);assert(h.d.querySelector('#requestErrorDetails').textContent.includes('HTTP_400'));h.d.querySelector('#requestErrorDetails button').click();await tick();assert(h.d.querySelector('#requestErrorDetails details').open);assert(h.w.getSelection().toString().includes('HTTP_400'));h.close();console.log('PASS: invalid input does not trigger fallback; copying works without Clipboard API');

  h=harness(b=>b.action==='login'?json({error:'用户名或密码不正确'},401):json({token:'new-token',user:{id:'new-user'}}));await h.w.login();assert.equal(h.w.state.token,'new-token');assert.equal(h.d.querySelector('#requestErrorDetails'),null);assert.equal(h.d.body.textContent,'首页');h.close();console.log('PASS: legacy compatibility fallback still logs in successfully');

  h=harness(b=>b.action==='login'?json({token:'new-token',user:{id:'new-user'}}):json({error:'服务暂时不可用'},503));h.w.loadExams=()=>h.w.dataApiV7('list_exams');await h.w.login();assert(h.d.querySelector('#requestErrorDetails').textContent.includes('HTTP_503'));assert.equal(h.requests.filter(b=>b.action==='login_v2').length,0);h.close();console.log('PASS: data loading failure preserves its own diagnostic and never repeats authentication');

  h=harness((b,w)=>Promise.reject(new w.TypeError('Failed to fetch')),{offline:true,trackFails:true});await h.w.login();assert(h.d.querySelector('#requestErrorDetails').textContent.includes('NETWORK_OFFLINE'));assert.equal(h.events.length,0);let queued=h.w.localStorage.getItem('st_request_error_queue');assert.equal(JSON.parse(queued).length,2);assert(!/private-user|private-password|private-token/.test(queued));h.close();
  h=harness(()=>json({ok:true}),{storage:{st_request_error_queue:queued}});h.w.dispatchEvent(new h.w.Event('online'));await tick();assert.equal(h.events.length,2);assert.equal(h.events[0].context.sessionId,'original-session');assert.equal(h.w.localStorage.getItem('st_request_error_queue'),'[]');h.close();console.log('PASS: offline queue survives reload and uploads original IDs once after reconnecting');

  h=harness((b,w)=>Promise.reject(new w.TypeError('Load failed')),{trackFails:true});await h.w.login();await tick();assert.equal(JSON.parse(h.w.localStorage.getItem('st_request_error_queue')).length,2);assert(h.d.querySelector('#requestErrorDetails').textContent.includes('Load failed'));h.close();console.log('PASS: failed telemetry stays queued without blocking login feedback');

  for(const [name,code] of [['TimeoutError','REQUEST_TIMEOUT'],['AbortError','REQUEST_ABORTED']]){h=harness((b,w)=>{const e=new w.Error('cancelled');e.name=name;throw e});await h.w.login();assert(h.d.querySelector('#requestErrorDetails').textContent.includes(code));h.close();}console.log('PASS: timeouts and cancellation have separate codes');

  const waits={};h=harness(b=>new Promise(resolve=>waits[b.key]=resolve));const a=h.w.dataApiV7('save_exam',{key:'a'}).catch(e=>e),b=h.w.dataApiV7('save_exam',{key:'b'}).catch(e=>e);waits.b(json({error:'second'},502));waits.a(json({error:'first'},409));const [ea,eb]=await Promise.all([a,b]);assert.equal(ea.status,409);assert.equal(eb.status,502);assert(ea.message.includes('first'));assert(eb.message.includes('second'));assert.notEqual(ea.requestId,eb.requestId);h.close();console.log('PASS: concurrent identical actions retain their own response diagnostics');

  h=harness(()=>json({error:'<img src=x> token=secret password=hunter2'},500));await h.w.login();await tick();assert.equal(h.d.querySelector('#requestErrorDetails img'),null);assert(!h.d.querySelector('#requestErrorDetails').textContent.includes('hunter2'));assert(!JSON.stringify(h.events).includes('secret'));assert(h.d.querySelector('style:last-child').textContent.includes('var(--panel-solid'));h.close();console.log('PASS: hostile error text is escaped, secret-like values redacted and theme variables retained');

  h=harness((b,w)=>{if(b.action==='login')throw new w.TypeError('Failed to fetch');return json({error:'bad password'},401)},{telemetry:true});await h.w.login();await tick();assert.equal(h.events.filter(x=>x.eventType==='api_fetch_error').length,2);assert(h.events.filter(x=>x.eventType==='api_fetch_error').every(x=>x.metadata.request_id));h.close();console.log('PASS: real telemetry wrapper does not duplicate primary network errors');
}
run().catch(e=>{console.error(e);process.exitCode=1});
