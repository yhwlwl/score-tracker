/* Existing notice flow + actual appreciation module: one notice and an explicit modal handoff. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const defaults=vm.runInNewContext(read('supabase/functions/score-tracker-notices/support.ts').replace(/^export /gm,'')+'\nSUPPORT_DEFAULTS;',{atob});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function harness(options={}){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<!doctype html><meta name="application-version" content="v7.0"><div id="app"><main id="content"></main></div><footer id="app-version-v17"></footer>',{url:'https://score.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,d=w.document,events=[],receipts=new Set(),intervals=[];
  const config={version:'v7.0',enabled:options.announcement!==true,title:'更新内容',content:options.content||'功能已更新',tip_enabled:false,announcement_enabled:options.announcement===true,announcement_title:'公告',announcement_content:options.content||'欢迎体验新功能',announcement_id:'announcement-1',announcement_comments_enabled:false,revision:1};
  w.state={user:options.guest?null:{id:'fixture-user'},token:options.guest?'':'fixture-token',page:'home',exams:[{id:'exam'}],onboarding:null};
  w.render=()=>{};w.renderLogin=()=>{};w.setInterval=fn=>{intervals.push(fn);return intervals.length};
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.Image=class{set src(value){Promise.resolve().then(()=>this.onload?.())}};
  w.__scoreTrackerTrack=(type,data)=>{events.push({type,data});return Promise.resolve()};
  let supportEnabled=options.disabled!==true;
  w.fetch=async(url,init={})=>{
    if(String(url).includes('__cb'))return {ok:true,text:async()=>'<meta name="application-version" content="v7.0">'};
    const body=JSON.parse(init.body);
    if(body.action==='support_public')return {ok:true,json:async()=>({config:{...defaults,enabled:supportEnabled,qr_image:'./fixture.png'}})};
    if(['notice_check','notice_public','notice_history'].includes(body.action))return {ok:true,json:async()=>({config,releases:[config],seen:[]})};
    if(body.action==='notice_claim'){const key=body.kind+':'+body.notice_id,claimed=!receipts.has(key);receipts.add(key);return {ok:true,json:async()=>({claimed})};}
    throw Error('Unexpected action: '+body.action);
  };
  w.eval(read('release-notices.js'));if(!options.lateSupport)w.eval(read('author-support.js'));
  await sleep(210);
  return {w,d,events,errors,poll:()=>intervals.at(-1)(),disable:()=>{supportEnabled=false},close:()=>w.close()};
}
(async()=>{
  let h=await harness();assert.equal(h.d.querySelectorAll('.rn-back').length,1);assert(!h.d.querySelector('.support-release,.support-back,[data-notice-support]'));
  h.d.querySelector('.rn-action').click();await sleep(420);assert(!h.d.querySelector('.rn-back,.support-back'));assert.equal(h.events.filter(x=>x.type==='update_prompt_shown').length,1);h.close();
  console.log('PASS: enabling appreciation adds no independent notice, appended introduction or extra popup');
  for(const announcement of [false,true]){
    h=await harness({announcement,content:'新功能已上线。\n[支持作者](#author-support)'});
    const link=h.d.querySelector('[data-notice-support]');assert(link&&!link.hidden);assert.equal(link.textContent,'支持作者');assert(!h.d.querySelector('.support-back'));
    link.click();assert(!h.d.querySelector('.rn-back'));assert.equal(h.d.querySelectorAll('.support-back').length,1);assert(h.d.querySelector('#app').hasAttribute('inert'));assert.equal(h.d.body.style.overflow,'hidden');
    assert(h.events.some(x=>x.type==='support_panel_opened'&&x.data.source===(announcement?'announcement':'release')));
    h.d.querySelector('.support-close').click();await sleep(420);assert(!h.d.querySelector('.rn-back,.support-back'));assert(!h.d.querySelector('#app').hasAttribute('inert'));assert.equal(h.d.body.style.overflow,'');
    await h.w.__releaseNotices.check('login');assert(!h.d.querySelector('.rn-back,.support-back'));assert.deepEqual(h.errors,[]);h.close();
  }
  console.log('PASS: release/announcement links open the real appreciation panel, close the notice first, restore scrolling and keep receipts');
  h=await harness({lateSupport:true,content:'[支持作者](#author-support)'});assert(h.d.querySelector('[data-notice-support]').hidden);
  h.w.eval(read('author-support.js'));await sleep(30);assert(!h.d.querySelector('[data-notice-support]').hidden);h.d.querySelector('[data-notice-support]').click();assert(h.d.querySelector('.support-back'));h.close();
  h=await harness({content:'[支持作者](#author-support)'});assert(!h.d.querySelector('[data-notice-support]').hidden);h.disable();h.poll();await sleep(30);assert(h.d.querySelector('[data-notice-support]').hidden);h.close();
  for(const options of [{disabled:true},{guest:true}]){
    h=await harness({...options,content:'[支持作者](#author-support)'});if(options.guest){await h.w.__releaseNotices.check('manual',true);await sleep(20)}assert(h.d.querySelector('[data-notice-support]').hidden);h.close();
  }
  h=await harness({content:'[<img src=x onerror=alert(1)>](#author-support) [外链](javascript:alert(1)) **加粗**'});
  assert(!h.d.querySelector('.rn-content img,.rn-content a'));assert(h.d.querySelector('[data-notice-support]').textContent.includes('<img'));assert.equal(h.d.querySelector('.rn-content strong').textContent,'加粗');assert(h.d.querySelector('.rn-content').textContent.includes('javascript:'));h.close();
  console.log('PASS: late config loading, disabled/guest suppression, escaped link text and unchanged bold formatting');
})().catch(error=>{console.error(error);process.exitCode=1});
