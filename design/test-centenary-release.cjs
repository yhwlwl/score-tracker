const assert=require('node:assert/strict'),fs=require('node:fs'),{eligible,shouldPrompt,NOTICE_ID}=require('../centenary-release.js');
const ready={published:true,eligible:true,paused:false,published_at:'2026-11-29T00:00:00Z',seen_at:null};
for(const d of [null,{}, {...ready,published:false},{...ready,paused:true},{...ready,published_at:null}]){assert(!eligible(d));assert(!shouldPrompt(d,false))}
assert(eligible({...ready,eligible:false}));assert(eligible(ready));assert(shouldPrompt(ready,false));assert(!shouldPrompt(ready,true));assert(!shouldPrompt({...ready,seen_at:'2026-11-29T00:01:00Z'},false));
const js=fs.readFileSync('centenary-release.js','utf8'),sql=fs.readFileSync('design/centenary/manual-publish.sql','utf8');
assert(js.includes("api('centenary_status'")&&js.includes("api('centenary_seen'"));assert(!/centenary_preview|centenary_refresh|armed=true/.test(js));
assert(js.includes('data:image/svg+xml')&&!js.includes('data:image/webp'));assert(js.includes("action:'achievement_overview'"));assert(fs.readFileSync('index.html','utf8').includes('centenary-release.js'));assert(fs.readFileSync('tools/cf-build.js','utf8').includes('"centenary-release.js"'));
assert(sql.includes('a<10000 or e<1000000')&&sql.includes('set armed=false')&&sql.includes("on conflict(user_id,badge_id) do nothing")&&sql.includes(NOTICE_ID));assert(!/cron\.schedule\(/.test(sql));
console.log('PASS centenary visibility gates, asset inclusion, manual release safeguards');

const {JSDOM}=require('jsdom');
const delay=()=>new Promise(r=>setTimeout(r,20));
async function testDom(){
 const dom=new JSDOM('<!doctype html><html><body><main id="content"><div class="account-grid"><div class="account-card"></div></div></main></body></html>',{url:'https://centenary.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,doc=w.document,requests=[];let check,published=false,paused=false,seen=false,seenB=false,fail=false;
 w.state={user:{id:'user-a'},token:'token-a',page:'account'};
 w.ScoreAchievements={badges:[{id:'triple',name:'三百纪念'}]};w.ScoreAchievementUI={emblem:()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"/>',show:(b,a,opt)=>requests.push({action:'show-award',badge:b.id,award:a,autoFlip:opt.autoFlip})};
 w.matchMedia=()=>({matches:false});
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 w.HTMLElement.prototype.getClientRects=function(){return this.hasAttribute('hidden')?[]:[{}]};
 w.setInterval=fn=>{check=fn;return 1};
 w.__releaseNotices={openCentenaryDiscussion:async()=>requests.push({action:'open-discussion'})};
 w.fetch=async(url,opt)=>{
  const b=JSON.parse(opt.body);requests.push(b);if(b.action==='achievement_overview'){assert.equal(url,'/api/score-tracker-data-api');return {ok:true,json:async()=>({enabled:true,awards:[{badge_id:'triple',awarded_at:ready.published_at}],stats:{total:10000,counts:{triple:10000}}})}}assert.equal(url,'/api/score-tracker-notices');
  if(fail)return {ok:false,json:async()=>({error:'test failure'})};
  if(b.action==='centenary_seen'){if(b.token==='token-b')seenB=true;else seen=true;return {ok:true,json:async()=>({ok:true})}}
  assert.equal(b.action,'centenary_status');
  const eligible=b.token==='token-a';
  return {ok:true,json:async()=>published&&!paused?{...ready,eligible,seen_at:(eligible?seen:seenB)?'2026-11-29T00:01:00Z':null,registered_at:'2026-11-29T00:00:00Z',day_at:'2026-11-26T16:00:00Z',registration_position:42,days_together:100,personal_events:123,event_hit_at:'2026-11-22 01:25:41.319174+00',account_hit_at:'2026-11-29T00:00:00Z',account_hit_at:'2026-11-29T00:00:00Z',event_hit_at:'2026-11-22T01:25:41Z'}:{published:false}};
 };
 const force=async()=>{w.dispatchEvent(new w.Event('online'));await delay();};
 try{
  w.eval(js);await delay();
  assert(!doc.querySelector('.st-centenary-dialog'));assert(!doc.querySelector('.st-centenary-entry'));assert(!requests.some(x=>x.action==='centenary_seen'));
  fail=true;await force();assert(!doc.querySelector('.st-centenary-dialog'));fail=false;
  published=true;
  w.state.onboarding={kind:'new-account'};
  await force();
  assert(w.ScoreModalGuard.occupied());assert(!doc.querySelector('.st-centenary-dialog'));
  w.state.onboarding=null;
  await force();
  let dialog=doc.querySelector('.st-centenary-dialog[open]');assert(dialog);assert(w.ScoreModalGuard.occupied());let shadow=dialog.firstChild.shadowRoot;
  assert.equal(shadow.getElementById('title').textContent,'三百纪念');
  assert.equal(shadow.getElementById('position').textContent,'42');
  assert(!shadow.getElementById('title').textContent.includes('42'));
  assert.equal(shadow.getElementById('done').textContent,'收藏这份纪念');
  assert(!shadow.getElementById('accounts'));
  assert(!shadow.getElementById('events'));
  assert(shadow.getElementById('eventdate').textContent.includes('2026/11/22'));assert(shadow.getElementById('timeline').textContent.includes('2026/11/22'));
  assert(shadow.querySelector('.mini-badge img').src.startsWith('data:image/svg+xml'));
  assert.equal(requests.filter(x=>x.action==='centenary_seen').length,1);
  shadow.getElementById('done').click();await delay();assert(requests.some(x=>x.action==='show-award'&&x.badge==='triple'&&x.autoFlip));assert(!doc.querySelector('.st-centenary-dialog'));assert(doc.querySelector('.st-centenary-entry'));
  await force();check();assert(!doc.querySelector('.st-centenary-dialog'));assert.equal(requests.filter(x=>x.action==='centenary_seen').length,1);
  doc.querySelector('.st-centenary-entry').click();dialog=doc.querySelector('.st-centenary-dialog[open]');assert(dialog);
  dialog.firstChild.shadowRoot.getElementById('discussion').click();await delay();assert(requests.some(x=>x.action==='open-discussion'));assert(!doc.querySelector('.st-centenary-dialog'));
  w.state={user:{id:'user-b'},token:'token-b',page:'account'};check();await delay();assert(doc.querySelector('.st-centenary-entry'));const newDialog=doc.querySelector('.st-centenary-dialog[open]');assert(newDialog);assert.equal(newDialog.firstChild.shadowRoot.getElementById('done').textContent,'开始我的记录');newDialog.firstChild.shadowRoot.getElementById('done').click();await delay();assert(!doc.querySelector('.st-centenary-dialog'));assert.equal(requests.filter(x=>x.action==='centenary_seen'&&x.token==='token-b').length,1);
  w.state={user:{id:'user-a'},token:'token-a',page:'account'};check();await delay();assert(doc.querySelector('.st-centenary-entry'));assert(!doc.querySelector('.st-centenary-dialog'));
  paused=true;await force();assert(!doc.querySelector('.st-centenary-entry'));assert(!doc.querySelector('.st-centenary-dialog'));
  w.state={user:null,token:'',page:'account'};check();const count=requests.length;await force();assert.equal(requests.length,count);
  console.log('PASS centenary DOM: unpublished/failed requests, manual publish transition, one-time acknowledgement, replay, exact discussion, account isolation, pause and logout');
 }finally{w.close()}
}
testDom().catch(e=>{console.error(e);process.exitCode=1});
