const assert = require('node:assert/strict'), fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { harness, input, rid, uid, examId } = require('./test-paper-review.cjs');
const read = file => fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 25));
async function until(fn) { for (let i=0; i<160; i++) { if(fn()) return; await tick(); } throw new Error('UI wait expired'); }
(async () => {
  const h=harness(); await h.init();
  const opts={config_version:2,purpose:'analysis',review_before_analysis:true,analysis_scope:'all'};
  await h.call({action:'save_materials',...input,options:opts});
  for(let page=1;page<=15;page++)await h.call({action:'upload_page',request_id:rid,page,role:page===1?'paper':'work',url:input.pages[0].url});
  const errors=[], calls=[], vc=new VirtualConsole();
  vc.on('jsdomError',e=>{ if(!e.message.includes('CSS'))errors.push(e.message); });
  const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://test.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window, d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.setInterval=()=>1;w.confirm=()=>true;w.AbortController=AbortController;
  let failNinthPage=true;
  w.fetch=async (url,options)=>{
    if(String(url).startsWith('https://scan.test/')) {
      const bytes=h.blobs.get(new URL(url).pathname.slice(1));
      return {ok:!!bytes,blob:async()=>new w.Blob([bytes],{type:'image/png'})};
    }
    const body=JSON.parse(options?.body||'{}');calls.push(body);
    if(String(url).includes('paper-review')) {
      if(body.action==='upload_page' && body.page===9 && failNinthPage) { failNinthPage=false;return new Response(JSON.stringify({error:'fixture-save-failure'}),{status:503}); }
      return h.call(body);
    }
    return new Response(JSON.stringify({ok:true,enabled:false,modules:[],exams:[],subjects:[],profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}}));
  };
  w.eval(read('app-bundle.js')+'\nwindow.state=state;');
  for(const f of ['app-v36.js','app-v37.js','app-v38.js'])w.eval(read(f));await tick();
  Object.assign(w.state,{user:{id:uid,username:'fixture'},token:'test-token',subjectConfigs:[{name:'数学',defaultMax:150}],modulesV18:[],exams:[{id:examId,name:'期中考试',exam_date:'2026-10-20',scores:{数学:{actual:88,max:150}}}],allExams:[],page:'stats',analysisTab:'ai'});
  w.applyExamSubjectsV10([],w.state.subjectConfigs);w.render();
  await until(()=>d.querySelector('.ph-card'));
  d.querySelector('[data-hub=new]').click();await until(()=>d.querySelector('.ph-preferences'));
  assert.equal(d.querySelector('[name=subject]').value,'','no arbitrary default subject');
  assert.equal(d.querySelectorAll('input[data-role=paper]').length,1,'uploads share the setup page');
  assert.equal(d.querySelectorAll('.ph-choice small').length,13,'choices have plain-language descriptions');
  d.querySelector('[name=preset][value=record]').click();
  assert(d.querySelector('[data-analysis-options]').hidden);
  d.querySelector('[name=preset][value=focused]').click();assert.equal(d.querySelector('[name=analysis_scope]').value,'losses');
  d.querySelector('[data-hub=list]').click();await until(()=>d.querySelector('[data-hub="draft:'+rid+'"]'));
  d.querySelector('[data-hub="draft:'+rid+'"]').click();await until(()=>d.querySelector('.pr-page img'));
  assert.equal(d.querySelector('[name=subject]').value,'数学');
  const prefs=d.querySelector('.ph-preferences');
  prefs.querySelector('[name=analysis_scope]').value='selected';prefs.querySelector('[name=analysis_scope]').dispatchEvent(new w.Event('change',{bubbles:true}));
  prefs.querySelector('[name=experience_note]').value='最后两分钟没有做完';
  prefs.querySelector('[name=grade]').value='高二';
  d.querySelector('[name=pr_location][value=separate]').click();
  assert.equal(d.querySelector('.ph-preferences'),prefs,'upload rerenders preserve settings and handlers');
  assert.equal(prefs.querySelector('[name=grade]').value,'高二');
  d.querySelector('[name=pr_location][value=paper]').click();
  await until(()=>!d.querySelector('[data-pr=start]').disabled);
  d.querySelector('#pr-consent').checked=true;d.querySelector('#pr-consent').dispatchEvent(new w.Event('change',{bubbles:true}));
  d.querySelector('[data-pr=start]').click();
  await until(()=>d.querySelector('.pr-footer > .pr-message')?.textContent.includes('第 9 张扫描件保存失败'));
  const failure=d.querySelector('.pr-footer > .pr-message');
  assert(!failure.textContent.includes('确认同一请求'),'saving scans is distinct from an ambiguous analysis reservation');
  assert.equal(h.tables.score_tracker_paper_reviews.length,0,'failed material upload does not reserve AI usage');
  assert.equal(d.querySelectorAll('.pr-page img').length,15,'all local images remain available for retry');
  assert.equal(failure.parentElement.querySelector('[data-pr=start]').textContent,'开始分析');
  d.querySelector('[data-pr=start]').click();
  try { await until(()=>h.tables.score_tracker_paper_reviews.length); }
  catch(e) { throw new Error(e.message+'; '+d.querySelector('.pr-message').textContent+'; calls='+calls.map(c=>c.action).join(',')+'; errors='+errors.join(',')); }
  await h.drain();
  const start=calls.find(x=>x.action==='start');assert.equal(start.request_id,rid,'retry keeps the same saved material request');assert.equal(calls.filter(x=>x.action==='start').length,1);assert.equal(start.subject,'数学');assert.equal(start.options.analysis_scope,'selected');assert.equal(start.options.exam_experience.note,'最后两分钟没有做完');
  d.querySelector('[data-pr^="report:"]').click();await until(()=>d.querySelector('.ps-verify'));
  const pick=d.querySelector('[name=detail_questions][value="2"]');pick.checked=true;
  d.querySelector('.ps-verify').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>h.tables.score_tracker_paper_reviews[0].status!=='paused');await h.drain();
  const report=h.tables.score_tracker_paper_reviews[0].result;assert.equal(report.questions[0].detail_level,'overview');assert.equal(report.questions[1].detail_level,'detailed');
  if(d.querySelector('[data-pr^="report:"]'))d.querySelector('[data-pr^="report:"]').click();await until(()=>d.querySelector('.pr-result-top'));
  assert.deepEqual(Array.from(d.querySelectorAll('[data-report-section]')).map(x=>x.dataset.reportSection),['highlights','performance','insights','questions','plan','materials']);
  assert(d.querySelector('.pr-overview'));assert.equal(d.querySelectorAll('.pr-metric').length,4);
  const pref=h.tables.score_tracker_paper_preferences[0].settings;assert.equal(pref.exam_experience.note,'');assert.equal(pref.grade,'高二');
  assert.deepEqual(errors,[]);dom.window.close();
  console.log('PASS: real setup → draft scans → preferences → OCR selection → Edge stages → six-section report; no UI errors');
})().catch(e=>{console.error(e);process.exit(1);});
