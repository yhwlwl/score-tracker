const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const tick=ms=>new Promise(r=>setTimeout(r,ms||30));
(async()=>{
  const html=fs.readFileSync(path.join(__dirname,'../api/mg-ui.js'),'utf8').replace(/^export const MG_HTML = String.raw`/,'').replace(/`;\s*$/,'');
  const dom=new JSDOM(html,{url:'https://score.test/mg?view=feedback&feedback_page=2&feedback_status=reviewing',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,doc=w.document,calls=[],scrolls=[];
  const rules=[...doc.styleSheets[0].cssRules];
  // Apply the source's media rules for each viewport; JSDOM itself does not evaluate media queries.
  function viewport(width){doc.querySelector('style').textContent=rules.flatMap(r=>{if(r.type!==4)return[r.cssText];const max=r.conditionText.match(/max-width:\s*(\d+)px/),min=r.conditionText.match(/min-width:\s*(\d+)px/);return(!max||width<=+max[1])&&(!min||width>=+min[1])?[...r.cssRules].map(x=>x.cssText):[]}).join('\n');w.matchMedia=()=>({matches:width<=860})}
  const display=selector=>w.getComputedStyle(doc.querySelector(selector)).display;
  w.localStorage.setItem('st_admin_token','admin-test');w.setInterval=()=>0;w.scrollTo=(x,y)=>scrolls.push([x,y]);
  const date='2026-10-02T00:00:00Z',unsafe='<img src=x onerror=alert(1)>',details={a:{username:'测试用户',feedback:{id:'a',user_id:'owner',feedback_type:'other',status:'reviewing',content:'内容 '+unsafe,created_at:date,page_path:'/feature-vote'},replies:[],attachments:[]},b:{username:'另一个用户',feedback:{id:'b',user_id:'owner2',feedback_type:'bug',status:'new',content:'第二条反馈',created_at:date},replies:[],attachments:[]}};
  details.slow={...details.a,feedback:{...details.a.feedback,id:'slow'}};
  let delayA=false,releaseA,failB=false;
  w.fetch=async(url,init={})=>{const u=new URL(url,'https://score.test'),action=u.searchParams.get('action');calls.push({action,url:u,body:init.body&&JSON.parse(init.body)});let data={ok:true},ok=true;
    if(action==='feedback')data={total_count:153,rows:Object.values(details).map(x=>({...x.feedback,username:x.username}))};
    if(action==='feedback_detail'){const id=u.searchParams.get('id');if(id==='slow'&&delayA)await new Promise(r=>releaseA=r);if(id==='b'&&failB){ok=false;data={error:'network unavailable'}}else data=details[id]}
    return{ok,status:ok?200:500,json:async()=>data};
  };
  viewport(390);w.eval(doc.querySelector('script').textContent);await tick();
  assert.equal(display('#feedbackFilterFields'),'none');assert.equal(display('.feedback-filter-bar'),'flex');assert(doc.querySelector('.feedback-list-count').textContent.includes('共 153 条'));
  doc.querySelector('#toggleFeedbackFilters').click();assert.equal(display('#feedbackFilterFields'),'grid');assert.equal(w.getComputedStyle(doc.querySelector('#feedbackFilterFields')).gridTemplateColumns,'repeat(2,minmax(0,1fr))');assert.equal(doc.querySelector('#toggleFeedbackFilters').getAttribute('aria-expanded'),'true');assert.equal(doc.querySelector('#fbStatus').value,'reviewing');
  const type=doc.querySelector('#fbType');type.value='bug';type.dispatchEvent(new w.Event('change'));await tick();assert.equal(calls.findLast(x=>x.action==='feedback').url.searchParams.get('type'),'bug');assert.equal(display('#feedbackFilterFields'),'grid');
  doc.querySelector('[data-page="feedback:next"]').click();await tick();assert(w.location.search.includes('feedback_page=2'));
  Object.defineProperty(w,'scrollY',{value:450,configurable:true});doc.querySelector('[data-feedback="a"]').click();await tick();
  assert.equal(display('#backFeedback'),'flex');assert.equal(display('.feedback-panel>.feedback-filters'),'none');assert.equal(display('.page-head'),'none');assert.equal(display('.inbox-list'),'none');assert.equal(display('.conversation'),'block');assert(!doc.querySelector('.messages img'));assert(doc.querySelector('.messages').textContent.includes(unsafe));
  assert.equal(w.getComputedStyle(doc.querySelector('.messages')).height,'auto');assert.equal(w.getComputedStyle(doc.querySelector('#replyText')).fontSize,'16px');
  for(const width of [320,430,768]){viewport(width);assert.equal(display('#backFeedback'),'flex');assert.equal(display('.feedback-panel>.feedback-filters'),'none')}
  viewport(1280);assert.equal(display('.feedback-detail-nav'),'none');assert.equal(display('.inbox-list'),'block');assert.equal(display('.conversation'),'block');assert.equal(display('#feedbackFilterFields'),'flex');assert.equal(w.getComputedStyle(doc.querySelector('.messages')).height,'400px');
  viewport(390);const reads=calls.filter(x=>x.action==='feedback').length;doc.querySelector('#backFeedback').click();assert.equal(display('.inbox-list'),'block');assert.equal(display('.conversation'),'none');assert.equal(doc.querySelector('#fbStatus').value,'reviewing');assert.equal(doc.querySelector('#fbType').value,'bug');assert(w.location.search.includes('feedback_page=2'));assert.equal(calls.filter(x=>x.action==='feedback').length,reads);assert.deepEqual(scrolls.at(-1),[0,450]);
  delayA=true;doc.querySelector('[data-feedback="slow"]').click();await tick();assert(doc.querySelector('#backFeedback'));doc.querySelector('#backFeedback').click();doc.querySelector('[data-feedback="b"]').click();await tick();releaseA();await tick();assert(doc.querySelector('.messages').textContent.includes('第二条反馈'));assert(!doc.querySelector('.messages').textContent.includes('内容 '+unsafe));
  doc.querySelector('#backFeedback').click();failB=true;
  // A refresh does not invalidate detail caches, so test an uncached ID for the error/return flow.
  details.b.feedback.id='failed';details.failed=details.b;doc.querySelector('#refreshFeedback').click();await tick();
  const originalFetch=w.fetch;w.fetch=async(url,init)=>new URL(url,'https://score.test').searchParams.get('id')==='failed'?{ok:false,status:500,json:async()=>({error:'network unavailable'})}:originalFetch(url,init);
  doc.querySelector('[data-feedback="failed"]').click();await tick();assert(doc.querySelector('#retryFeedbackDetail'));assert(doc.querySelector('#backFeedback'));doc.querySelector('#backFeedback').click();assert.equal(display('.inbox-list'),'block');
  dom.window.close();console.log('Mobile feedback: collapsed two-column filters, visible return control, saved list position/filters/page, desktop layout, loading/error return, stale responses, and escaped messages passed');
})().catch(e=>{console.error(e);process.exit(1)});
