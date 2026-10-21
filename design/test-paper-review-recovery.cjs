const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const {harness,input,stagedReply,raw}=require('./test-paper-review.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
  const h=harness();await h.init();
  h.transport=(url,options)=>{
    const request=JSON.parse(options.body),prompt=request.messages[0].content[0].text;
    if(prompt.includes('阶段二：')&&JSON.parse(prompt.split('本批事实：')[1].split('\n')[0]).some(q=>q.label==='2'))return new Response(JSON.stringify({error:{message:'unauthorized'}}),{status:401});
    return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(stagedReply(raw,request))}}]}));
  };
  await h.call({action:'start',...input});await h.drain();let row=h.tables.score_tracker_paper_reviews[0];assert.equal(row.status,'failed');assert.equal(row.analysis_state.diagnoses.length,1);
  // Simulate an older checkpoint, before upload metadata was saved in analysis_state.
  delete row.analysis_state.source_input;
  const exposed=(await(await h.call({action:'get',request_id:input.request_id})).json()).review;
  assert.equal(exposed.recovery.mode,'saved');assert.equal(exposed.recovery.completed,1);assert.equal(exposed.recovery.questions[1].answer,'x = 7');assert(!('analysis_state'in exposed));assert(!JSON.stringify(exposed).includes(row.analysis_state.claim));
  const before=h.upstream.length;h.transport=null;
  assert.equal((await h.call({action:'resume',request_id:input.request_id,mode:'saved'})).status,202);await h.drain();assert.equal(row.status,'succeeded');assert.equal(h.upstream.length-before,2,'only pending question and synthesis run');
  assert(h.upstream.slice(before).every(r=>r.messages[0].content.every(c=>c.type!=='image_url')),'text recovery sends no fake or missing images');
  assert.equal(row.result.source_pages.length,1,'source page identities survive every delivery');assert.equal(h.calls.filter(x=>x==='score_tracker_paper_reserve').length,1);
  row.status='failed';row.analysis_state={phase:'verify',evidence:{questions:[{label:'1',stem:'题目'}]},has_work:true,diagnoses:[],claim:crypto.randomUUID()};
  assert.equal((await h.call({action:'resume',request_id:input.request_id,mode:'saved'})).status,400,'incomplete reading cannot masquerade as a ready text checkpoint');
  row.user_id=crypto.randomUUID();assert.equal((await h.call({action:'resume',request_id:input.request_id,mode:'saved'})).status,404);
  const evaluate=s=>vm.runInContext(s,h.scope);h.scope.runtimeOptions={config:{api_key:'test',model:'test',base_url:'https://model.test/v1',stage_deadline:Date.now()+1000},content:[],requestId:input.request_id,stage:'test',validate:x=>x,mark:()=>{}};
  const count=h.upstream.length;assert.equal((await evaluate('reviewModel(runtimeOptions)')).code,'worker_deadline');assert.equal(h.upstream.length,count,'expired worker budget never starts a doomed model request');

  const handoff=harness();await handoff.init();let delivery=0;const originalConfig=handoff.scope.configForReview;
  handoff.scope.configForReview=async()=>({...await originalConfig(),stage_deadline:Date.now()+(delivery++===0?1000:140000)});
  await handoff.call({action:'start',...input});await handoff.drain();assert.equal(handoff.tables.score_tracker_paper_reviews[0].status,'succeeded');assert.equal(handoff.upstream.length,6,'preflight worker handoff does not repeat any model work');assert(handoff.logs.some(l=>JSON.stringify(l).includes('worker_deadline_checkpoint')));
  const bounded=harness();await bounded.init();const boundedConfig=bounded.scope.configForReview;bounded.scope.configForReview=async()=>({...await boundedConfig(),stage_deadline:Date.now()+1000});
  await bounded.call({action:'start',...input});await bounded.drain();assert.equal(bounded.tables.score_tracker_paper_reviews[0].error_code,'worker_deadline');assert.equal(bounded.upstream.length,0);assert.equal(bounded.tables.score_tracker_paper_reviews[0].analysis_state.deadline_handoffs,3,'handoffs cannot loop forever');

  const db=new IDBFactory();function window(){const d=new JSDOM('<!doctype html><head></head><body></body>',{url:'https://fixture.test',runScripts:'outside-only'});d.window.indexedDB=db;d.window.eval(fs.readFileSync(path.join(root,'paper-review-support.js'),'utf8'));return d;}
  let dom=window(),support=dom.window.ScorePaperSupport;
  const saved={scope:'draft|物理',pages:[{role:'paper',url:input.pages[0].url,regions:['data:image/jpeg;base64,/9j/'],name:'original.png'}],pending:input.request_id,workOnPaper:true,consent:true,payload:{subject:'物理',exam_context:{score:65}}};
  assert.equal(await support.uploads('put','owner-a',input.request_id,saved),true);dom.window.close();
  dom=window();support=dom.window.ScorePaperSupport;const restored=await support.uploads('latest','owner-a','draft|物理');assert.equal(restored.pages[0].url,saved.pages[0].url);assert.equal(restored.pages[0].regions[0],saved.pages[0].regions[0]);assert.equal(restored.pending,input.request_id);assert.equal(restored.workOnPaper,true);assert.equal(restored.consent,true);
  assert.equal(await support.uploads('get','owner-b',input.request_id),null,'another owner cannot load the upload');assert.equal(await support.uploads('latest','owner-b','draft|物理'),null);
  assert.equal(support.legacyFormula('GM/R²=4π²R/T²'),'\\frac{GM}{R^{2}}=4\\pi ^{2}\\frac{R}{T^{2}}');
  assert.equal(support.wins({wins:[{basis:'work',observed:'小于',skill:'完整推导',significance:'虚构了整个方法'}]})[0].basis,'work_result');
  dom.window.eval(fs.readFileSync(path.join(root,'vendor/katex/katex.min.js'),'utf8'));dom.window.eval(fs.readFileSync(path.join(root,'vendor/katex/auto-render.min.js'),'utf8'));
  const target=dom.window.document.createElement('section');target.innerHTML='<p class="pr-text">行内 $\\frac{1}{2}mv^2$；旧报告 GM/R²=4π²R/T²。$$v=\\sqrt{2gh}$$</p><textarea>$x=3$</textarea><p class="pr-text">$\\href{javascript:alert(1)}{test}$</p>';
  dom.window.document.body.appendChild(target);await support.renderMath(target);assert.equal(target.querySelectorAll('.katex').length,4);assert(target.querySelector('.katex-display'));assert.equal(target.querySelector('textarea').value,'$x=3$');assert(!target.querySelector('a[href^="javascript:"]'));assert(!target.querySelector('img'));assert.equal(target.querySelectorAll('.katex-error').length,0);
  const blanks=dom.window.document.createElement('p');blanks.className='pr-text';blanks.textContent='ω=________；g=________；m₂________；保留不明写法 x__y__z。';target.appendChild(blanks);await support.renderMath(target);assert.equal(blanks.querySelectorAll('.katex').length,4);assert.equal(target.querySelectorAll('.katex-error').length,0);await support.renderMath(target);assert.equal(blanks.querySelectorAll('.katex').length,4,'repeat renders do not nest formulas');
  await support.uploads('delete','owner-a',input.request_id);assert.equal(await support.uploads('get','owner-a',input.request_id),null);dom.window.close();
  console.log('PASS: legacy no-image checkpoint recovery, saved-work preview, ownership, no duplicate quota, worker deadline guard, uploads surviving reopen, account isolation, exact image restoration, safe LaTeX and legacy equations');
})().catch(e=>{console.error(e);process.exitCode=1});
