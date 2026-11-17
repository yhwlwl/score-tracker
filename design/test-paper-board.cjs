const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM,VirtualConsole}=require('jsdom');
const {harness,input,rid}=require('./test-paper-review.cjs');
const tick=()=>new Promise(r=>setTimeout(r,15));
(async()=>{
 const h=harness();await h.init();const k=h.scope,uid=h.tables.score_tracker_users[0].id;
 const pages=[{...input.pages[0],page:1,role:'paper'},{...input.pages[0],page:2,role:'work'}],normal={...input,pages,work_on_paper:false,options:{purpose:'record',config_version:2}};
 const raw={questions:['1','2','3'].map((label,i)=>({label,question_type:i?'填空题':'解答题',teacher_score:i?null:0,score_mark:i?null:{page:2,quote:'0分',scope:'question',label},max_score:5,max_mark:{page:2,quote:'每题5分'},source_regions:[{page:2,kind:'work',box:i?[.05,.65,.9,.2]:[.1,.1,.8,.4]}],confidence:'high'})),score_groups:[{label:'填空题',questions:['2','3'],teacher_score:5,max_score:10,score_mark:{page:2,quote:'填空5分'},max_mark:{page:2,quote:'共10分'}}]};
 const paper=k.normalizeScanPage({...raw,score_groups:[],questions:raw.questions.map((q,i)=>({...q,teacher_score:null,score_mark:null,source_regions:[{page:1,kind:'paper',box:[.1,.05+i*.3,.8,.22]}],max_mark:{page:1,quote:'每题5分'}}))},pages[0],normal),work=k.normalizeScanPage(raw,pages[1],normal),report=k.scanReport([paper,work],normal);
 const call=async b=>{const r=await h.call(b);assert(r.ok,await r.clone().text());return r.json();};
 await call({action:'save_materials',...normal,consent:true});for(const p of pages)await call({action:'upload_page',request_id:rid,...p});
 h.tables.score_tracker_paper_reviews.push({request_id:rid,user_id:uid,draft_id:input.draft_id,subject:'数学',status:'succeeded',revision:0,corrections:[],result:report,options:normal.options});
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message);});
 const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
 try{
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.AbortController=AbortController;
 w.fetch=async(url,opts)=>String(url).includes('paper-review')?h.call(JSON.parse(opts?.body||'{}')):new Response(JSON.stringify({ok:true,enabled:false,exams:[],subjects:[]}));
 w.eval(fs.readFileSync('app-bundle.js','utf8')+'\nwindow.state=state;');Object.assign(w.state,{user:{id:uid,username:'fixture'},token:'test-token',page:'stats',analysisTab:'papers'});
 const host=d.createElement('main');d.body.append(host);w.ScorePaperReview.mount({user:uid,token:'test-token',host,sessions:{},draftId:input.draft_id,initialReport:rid,isActive:()=>true,options:{purpose:'record'}},'数学');
 const q=s=>host.querySelector(s),until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await tick();}throw Error(host.textContent.slice(-2000));};
 await until(()=>q('.pb-board'));assert.equal(host.querySelectorAll('.pb-pages button').length,2);assert(q('.pb-ledger'));assert(q('.pb-pages button').textContent.includes('原题'),'page title never replaces the first thumbnail');assert.equal(q('.pb-board [data-pb-field=teacher_score]').value,'0','zero is not blank');
 q('[data-pb-page="2"]').click();await tick();assert.equal(host.querySelectorAll('.pb-box').length,2,'identical shared answer areas have one outline');
 const shared=Array.from(host.querySelectorAll('[data-pb-select]')).find(b=>b.textContent.includes('2、3'));shared.click();await tick();assert.equal(q('[data-pb-score-label]').textContent,'题型合计');
 const total=q('[data-pb-field=teacher_score]');total.value='8';total.dispatchEvent(new w.Event('input',{bubbles:true}));q('.pb-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>h.tables.score_tracker_paper_reviews[0].revision===1&&q('[data-pb-field=teacher_score]')?.value==='8');
 let row=h.tables.score_tracker_paper_reviews[0],fill=row.corrections.filter(c=>c.type_total);assert.equal(fill.length,2);assert(fill.every(c=>c.teacher_score===null&&c.type_total.score===8));assert.equal(row.result.score_groups.find(g=>g.label==='填空题').teacher_score,5,'provider group remains original');assert.equal(k.recordTypeRows(row).rows.find(r=>r.name==='填空题').score,8,'manual group is counted once');
 // Direct crop dragging must preserve all other pages and update shared members
 // in one optimistic material write. A failed write leaves the draft in place.
 await until(()=>q('.pb-board'));q('[data-pb=adjust]').click();await tick();const stage=q('.pb-stage'),img=stage.querySelector('img');Object.defineProperty(img,'naturalWidth',{value:1200,configurable:true});stage.getBoundingClientRect=()=>({left:0,top:0,width:600,height:400});stage.setPointerCapture=()=>{};
 function point(target,type,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,button:0,pointerId:1});target.dispatchEvent(e);}
 let box=q('.pb-selected');point(box,'pointerdown',250,300);point(stage,'pointermove',270,290);point(stage,'pointerup',270,290);
 const original=JSON.stringify(row.result.questions.map(q=>q.source_regions));h.fail=value=>!!value.regions;q('[data-pb=adjust]').click();await until(()=>q('[data-pb-status]').textContent.includes('重试'));assert(q('.pb-selected'),'failed save retains the selected crop');assert.equal(Object.keys(h.tables.score_tracker_paper_materials[0].regions).length,0);h.fail=false;q('[data-pb=adjust]').click();await until(()=>Object.keys(h.tables.score_tracker_paper_materials[0].regions).length===2);
 const material=h.tables.score_tracker_paper_materials[0];assert.deepEqual(material.regions['2'].filter(r=>r.kind==='work'),material.regions['3'].filter(r=>r.kind==='work'));assert.notDeepEqual(material.regions['2'].filter(r=>r.kind==='paper'),material.regions['3'].filter(r=>r.kind==='paper'));assert(material.regions['2'].some(r=>r.kind==='paper'&&r.page===1));assert.equal(JSON.stringify(row.result.questions.map(q=>q.source_regions)),original,'regions live in user overrides');
 q('[data-pb=undo]').click();await until(()=>Math.abs(h.tables.score_tracker_paper_materials[0].regions['2'].find(r=>r.kind==='work').box[0]-.05)<.0001);
 assert.equal(h.upstream.length,0,'all checking and geometry edits are model-free');assert.deepEqual(errors,[]);
 // Server validation: no made-up scopes, partial group overrides, duplicate
 // labels or out-of-bounds regions, including atomic failure of shared edits.
 const valid=fill.map(c=>({...c}));assert.throws(()=>k.normalizeCorrections([valid[0]],row.result),/全部题目/);assert.throws(()=>k.normalizeCorrections(valid.map(c=>({...c,type_total:{...c.type_total,questions:['2','99']}})),row.result),/覆盖题号/);
 const before=JSON.stringify(material.regions),bad=await h.call({action:'save_regions',request_id:rid,updates:[{label:'2',regions:[]},{label:'99',regions:[]}]});assert.equal(bad.status,400);assert.equal(JSON.stringify(material.regions),before,'a shared write validates every target before writing any');
 console.log('PASS: real UI/handler chain, grouped overlays, zero, editable type totals without splitting, preserved raw evidence, multi-owner crop persistence, undo, invalid scopes, atomic validation and no model calls');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
