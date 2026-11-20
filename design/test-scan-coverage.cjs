const assert=require('node:assert/strict');
const {harness,input}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const k=h.scope,jpeg='data:image/jpeg;base64,/9j/AA==';
 const page={page:2,role:'paper',url:input.pages[0].url,regions:[jpeg],region_boxes:[[0,0,1,1]]},normal={...input,work_on_paper:false,pages:[{page:1,role:'paper'},page,{page:3,role:'work'}]};
 const box=(page,kind,box)=>({page,kind,box});
 const near=[box(3,'work',[.01,.493,.347,.109]),box(3,'work',[.018,.499,.331,.097])],before=structuredClone(near);
 assert.equal(k.compactScanRegions(near).length,1);assert.deepEqual(near,before,'compaction never mutates model evidence');
 assert.equal(k.compactScanRegions(near.reverse()).length,1,'result is stable across pass order');
 for(const pair of [
 [box(2,'paper',[0,0,1,.4]),box(3,'paper',[0,0,1,.4])],
 [box(2,'paper',[0,0,1,.4]),box(2,'work',[0,0,1,.4])],
 [box(2,'work',[0,0,.3,.2]),box(2,'work',[0,.2,.3,.2])],
 [box(2,'work',[0,0,1,1]),box(2,'work',[.1,.1,.4,.4])],
 [box(2,'work',[0,0,.5,.5]),box(2,'work',[.05,0,.5,.5])]
 ])assert.equal(k.compactScanRegions(pair).length,2,'retain real continuations, separate sources and partial overlaps');
 const raw={anchor_columns:[{id:'main',bbox:[0,0,1000,1000]}],questions:[{label:'21',question_type:'阅读理解',anchors:[{column:'main',view_id:'v0',y:100}]},{label:'22',question_type:'写作',anchors:[{column:'main',view_id:'v0',y:700}]}],section_starts:[{column:'main',view_id:'v0',y:600,question_type:'写作'}]};
 const section=k.normalizeScanPage(raw,page,normal);
 assert.equal(section.questions[0].source_regions[0].box[3],.5,'the next section heading is not inside the prior question');
 const wrong=k.normalizeScanPage({...raw,section_starts:[{...raw.section_starts[0],question_type:'听力'}]},page,normal);
 assert.equal(wrong.questions[0].source_regions[0].box[3],.6,'an unverified heading cannot shorten a question');
 const same=k.normalizeScanPage({...raw,questions:raw.questions.map(q=>({...q,question_type:'写作'}))},page,normal);
 assert.equal(same.questions[0].source_regions[0].box[3],.6,'same-type body content cannot become a section cut');
 const previous={page:1,role:'paper',complete:true,questions:[{label:'20',question_type:'阅读理解',teacher_score:null,score_mark:null,max_score:null,max_mark:null,confidence:'high',uncertainties:[],source_regions:[box(1,'paper',[0,.8,1,.2])]}],score_groups:[],warnings:[],total:{}};
 assert.throws(()=>k.normalizeScanPage({...raw,prefix_continuation:true},page,normal,[previous]),/页首已确认/,'a confirmed continuation may not silently disappear');
 const continued=k.normalizeScanPage({...raw,prefix_continuation:true,questions:[{label:'续20',question_type:'阅读理解',anchors:[{column:'main',view_id:'v0',y:0}]},...raw.questions]},page,normal,[previous]);
 assert.equal(continued.questions[0].label,'20');
 const uncertain=k.normalizeScanPage({...raw,prefix_continuation:null},page,normal,[previous]);
 const report=k.scanReport([previous,uncertain],normal);
 assert(report.questions.find(q=>q.label==='20').uncertainties.some(s=>s.includes('续题范围')));
 const onlyAnswer=k.normalizeScanPage({questions:[{label:'23',question_type:'写作',source_regions:[box(3,'work',[.1,.1,.8,.8])]}]},{page:3,role:'work'},normal);
 const missing=k.scanReport([previous,onlyAnswer],normal),q=missing.questions.find(q=>q.label==='23');
 assert.equal(q.paper_expected,true);assert.deepEqual(Array.from(q.pages),[1,2],'missing originals retain candidate source pages for manual association');assert(!q.source_regions.some(r=>r.kind==='paper'),'missing paper is never filled with an invented crop');assert.equal(missing.complete,false);
 console.log('PASS: contained duplicate compaction, non-overlap preservation, cross-subject section boundaries, page-prefix continuation repair and missing-paper coverage');
})().catch(e=>{console.error(e);process.exitCode=1});

async function checkMissingCropUI(){
 const fs=require('node:fs'),{JSDOM,VirtualConsole}=require('jsdom'),errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
 try{
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.setInterval=()=>1;w.HTMLElement.prototype.scrollIntoView=()=>{};w.AbortController=AbortController;
 w.fetch=async()=>new Response(JSON.stringify({ok:true,exams:[],subjects:[],modules:[],enabled:false}));
 w.eval(fs.readFileSync('app-bundle.js','utf8'));
 const main=d.createElement('main');d.body.appendChild(main);main.innerHTML='<article data-question="missing"><div data-scan-host></div></article>';
 const q={id:'missing',label:'23',source_regions:[{page:3,kind:'work',box:[.1,.1,.8,.8]}],pages:[],work_pages:[3],work_expected:true,screenshot_only:true};
 const row={request_id:input.request_id,status:'succeeded',result:{questions:[q],screenshot_only:true,work_on_paper:false}};
 let saved;
 const api=async(_ctx,action,body)=>action==='sources'?{pages:[{page:1,role:'paper',url:'https://scan.test/paper'},{page:3,role:'work',url:'https://scan.test/work'}],regions:{}}:(saved=body,{ok:true});
 await w.ScorePaperScans.decorate(main,row,{}, {api,load:async()=>{},note(){}});
 assert(main.querySelector('.ps-unlocated').textContent.includes('原题截图尚未定位'),'legacy work-only questions show an explicit missing-original card');
 assert(main.querySelector('.ps-unlocated a'),'candidate original pages remain reachable');
 main.querySelector('[data-scan="add"]').click();main.querySelector('.ps-editor [data-scan="save"]').click();
 for(let i=0;i<50&&main.querySelector('.ps-editor');i++)await new Promise(r=>setTimeout(r,10));
 assert(saved.regions.some(r=>r.kind==='paper'));assert(!main.querySelector('.ps-unlocated'),'a manual association immediately clears the missing-original card');assert.deepEqual(errors,[]);
 console.log('PASS: missing-original card, source-page fallback and live clearing after manual association');
 }finally{w.close();}
}
checkMissingCropUI().catch(e=>{console.error(e);process.exitCode=1});

async function checkPrintedBinding(){
 const h=harness();await h.init();const k=h.scope,page={page:1,role:'paper'},normal={...input,pages:[page],work_on_paper:false};
 const wrong=k.normalizeScanPage({questions:[{label:'16',max_score:16,max_mark:{page:1,quote:'16（15分）'}}]},page,normal);
 assert.equal(wrong.questions[0].max_score,null,'a question number cannot masquerade as its printed maximum');
 const right=k.normalizeScanPage({questions:[{label:'16',max_score:15,max_mark:{page:1,quote:'16（15分）'}}]},page,normal);
 assert.equal(right.questions[0].max_score,15);
 const unit=k.normalizeScanPage({questions:['1','2','3','4'].map(label=>({label,question_type:'单选题'})),printed_rules:[{label:'选择题',unit_score:3,count:4,quote:'共4小题，每小题3分，共12分'}]},page,normal);
 const report=k.scanReport([unit],normal);assert(report.questions.every(q=>q.max_score===3),'a broad printed heading resolves only to one complete compatible type');
 const ambiguous={...unit,questions:[...unit.questions,...unit.questions.map((q,i)=>({...q,label:String(11+i),question_type:'多选题'}))]};
 assert(k.scanReport([ambiguous],normal).questions.every(q=>q.max_score===null),'equally compatible type scopes stay unknown');
 console.log('PASS: explicit printed-point binding, scoped generic headings and ambiguous-scope rejection');
}
checkPrintedBinding().catch(e=>{console.error(e);process.exitCode=1});
