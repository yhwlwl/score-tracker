const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../exam-detail.js'),'utf8');
(async()=>{
 const dom=new JSDOM('<main id="content"></main>',{runScripts:'outside-only',url:'https://fixture.test'});
 const w=dom.window,d=w.document; let response,events=[];
 w.state={user:{id:'owner'},token:'token',page:'home',allExams:[],modal:null};
 w.recordHtml=()=>''; w.bindPage=w.renderPage=w.bindNav=()=>{};
 w.escapeHtml=String; w.__scoreTrackerTrack=(type,metadata)=>events.push({type,metadata});
 w.toast=msg=>{let t=d.querySelector('.toast');if(!t){t=d.createElement('div');t.className='toast';d.body.appendChild(t)}t.textContent=msg;t.classList.add('show');};
 w.dataApiV7=async()=>response;
 w.saveExam=async(id,modal)=>{const r=await w.dataApiV7('save_exam',{exam:{id}});if(r.ok){w.state.allExams.push({id:r.id});modal.remove();w.state.modal=null;w.toast(id?'已保存修改':'考试已记录');}};
 w.eval(source);
 const modal=()=>{let el=d.createElement('div');d.body.appendChild(el);w.state.modal=el;return el;};
 try{
 response={ok:true,id:'new',created:true,planned:false};await w.saveExam(null,modal());
 assert.equal(d.querySelector('.ed-reflection-toast-action').textContent,'写反思');
 assert(events.some(e=>e.type==='exam_reflection_entry_shown'&&e.metadata.source==='save_success'));
 response={ok:true,id:'old',created:false};await w.saveExam('old',modal());assert(!d.querySelector('.ed-reflection-toast-action'));
 response={ok:true,id:'planned',created:true,planned:true};await w.saveExam(null,modal());assert(!d.querySelector('.ed-reflection-toast-action'));
 response={ok:false};await w.saveExam(null,modal());assert(!d.querySelector('.ed-reflection-toast-action'));
 console.log('PASS: only successful new non-planned exams receive a reflection action; edits, planned exams and failures do not');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
