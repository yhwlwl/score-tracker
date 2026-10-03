// Run with NODE_PATH pointing to a directory containing jsdom.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const tick = () => new Promise(r => setTimeout(r, 50));
async function run() {
  const errors = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), {url:'https://fixture.test/', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole:vc});
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}});
  w.scrollTo = () => {}; w.setInterval = () => 1;
  w.fetch = async () => new Response(JSON.stringify({}));
  w.eval(read('app-bundle.js') + '\nwindow.state=state;');
  w.eval(read('app-v36.js')); w.eval(read('app-v37.js')); w.eval(read('app-v38.js'));
  await tick();
  const exams = Array.from({length:8}, (_,i) => ({id:'exam-'+i, name:'月考 '+i, grade_level:i<4?'高一':'高二', exam_date:'2026-0'+(i+1)+'-01', total_rank:60-i*2,total_participants:500,total_class_rank:10-i%4,total_class_participants:50,scores:Object.fromEntries(['语文','数学','英语','物理','化学','生物'].map((s,j)=>[s,{actual:70+i+j,target:90,max:100,rank:80-i*3+j,participants:500,classRank:10-i%3,classParticipants:50}]))}));
  w.state.user={id:'fixture',username:'fixture'}; w.state.exams=exams;w.state.allExams=exams;
  w.state.subjectConfigs=Object.keys(exams[0].scores).map(name=>({name,max:100}));
  w.state.page='stats';w.render();await tick();await tick();
  assert.equal(d.querySelectorAll('.sv31-page > .card').length,11);
  assert.equal(d.querySelectorAll('.sv31-page > .card[data-fold-v38]').length,11);
  assert.equal(d.querySelector('.sv31-page > .fold-body-v38').hidden,true);
  const b=d.querySelector('.sv31-page > .card .fold-toggle-v38');b.click();assert.equal(b.getAttribute('aria-expanded'),'false');
  w.__v32.rerender();await tick();assert.equal(d.querySelector('.sv31-page > .card .fold-toggle-v38').getAttribute('aria-expanded'),'false');
  const count=d.querySelectorAll('.fold-toggle-v38').length;w.__v38.enhance();w.__v38.enhance();assert.equal(d.querySelectorAll('.fold-toggle-v38').length,count);
  assert(d.querySelector('.explain-v38'));assert(d.querySelector('.dsb-privacy-note'),'privacy notice retained');
  d.querySelectorAll('.fold-toggle-v38').forEach(btn=>{
    const body=d.getElementById(btn.getAttribute('aria-controls'));assert(body,'every fold has a body');
    const before=body.hidden;btn.click();assert.equal(body.hidden,!before);btn.click();assert.equal(body.hidden,before);
  });
  console.log('PASS: 11 independent folds, remembered state, compact filters, explanations, idempotent rendering');
  w.state.page='records';w.render();await tick();
  const ids=Array.from(d.querySelectorAll('.record [data-edit]'),n=>n.dataset.edit);assert.equal(ids[0],'exam-7');assert.equal(ids.at(-1),'exam-0');assert.equal(exams[0].id,'exam-0');
  console.log('PASS: newest categories and exams first without mutating source data');
  w.__v38.openExport();let overlay=d.querySelector('#customExportV38');
  const choose=(selector,value)=>{const n=overlay.querySelector(selector);n.value=value;n.dispatchEvent(new w.Event('change',{bubbles:true}));};
  choose('#exportCategoryV38','0');assert.equal(overlay.querySelector('[data-count=exams]').textContent,'4 项');
  overlay.querySelector('[data-none=exams]').click();assert(overlay.querySelector('[data-download-v38]').disabled);
  overlay.querySelector('[data-all=exams]').click();assert(!overlay.querySelector('[data-download-v38]').disabled);
  let downloaded;
  w.__v30.download=(name,content)=>{downloaded={name,content};};
  for(const format of ['json','txt','csv']) {
    overlay.querySelector('[data-format='+format+']').click();assert(overlay.querySelector('[data-report-options]').hidden);
    overlay.querySelector('[data-download-v38]').click();assert(downloaded.content.includes('月考 7'));assert(!downloaded.content.includes('月考 0'));
    if(format==='json')assert.equal(JSON.parse(downloaded.content).exams.length,4);
  }
  overlay.querySelector('[data-format=pdf]').click();
  for(const group of ['records','charts','analysis'])overlay.querySelector('[data-none='+group+']').click();
  assert(overlay.querySelector('[data-download-v38]').disabled);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!d.querySelector('#customExportV38'));
  console.log('PASS: category and exam selection, format-specific controls, empty selection, CSV/TXT/JSON subsets, Escape');
  const selected={records:new Set(['details']),charts:new Set(['year']),analysis:new Set(['kpi','worth','insights','trend','structure','hall','calib','comp','matrix','deep','quality'])};
  const before=JSON.stringify(w.state.allExams),report=w.__v38.buildReport(exams.slice(4),selected);
  const doc=new JSDOM(report).window.document;
  assert(!doc.querySelector('.ov'));assert.equal(doc.querySelectorAll('.rank-grid .mini').length,1);assert.equal(doc.querySelector('.rank-grid h4').textContent,'年排');
  assert.equal(doc.querySelectorAll('.analysis-section-v38').length,11);assert.equal(doc.querySelectorAll('.exam-block').length,4);
  assert(doc.querySelector('.exam-block').textContent.includes('月考 7'));assert(!doc.body.textContent.includes('月考 0'));assert.equal(JSON.stringify(w.state.allExams),before);
  const printCss=Array.from(doc.querySelectorAll('style')).map(n=>n.textContent).join('\n');
  assert(printCss.includes('.report-analysis .sv31-insight .ico svg'),'report icons keep print sizing and stroke styles');
  assert(printCss.includes('.report-analysis .sv31-insight .sv31-evbody{display:block;flex:0 0 100%'),'print evidence uses a full-width row');
  assert(printCss.includes('.rank-grid{break-inside:avoid'),'rank cards stay together in print');
  const reportIcons=doc.querySelectorAll('.report-analysis .sv31-insight .ico svg');
  assert(reportIcons.length>0,'analysis report keeps insight icons');
  assert.equal(reportIcons[0].getAttribute('width'),'16','report icons have an inline print-safe size');
  const reportEvidence=doc.querySelector('.report-analysis .sv31-evbody');
  assert(reportEvidence && !reportEvidence.hasAttribute('hidden'),'report evidence is visible and readable');
  for(const k of ['kpi','worth','insights','trend','structure','hall','calib','comp','matrix','deep','quality'])assert.doesNotThrow(()=>w.__v38.buildReport([exams[0]],{records:new Set(),charts:new Set(),analysis:new Set([k])}));
  assert.deepEqual(errors,[]);dom.window.close();console.log('PASS: report omits unselected blocks, recomputes 11 analysis sections, newest records, one-exam cases, no runtime errors');
}
run().catch(e=>{console.error(e);process.exit(1);});

