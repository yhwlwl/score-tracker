const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'../'+name),'utf8');
(async()=>{
 const dom=new JSDOM('<main id="content"></main>',{runScripts:'outside-only',url:'https://fixture.test'});
 const w=dom.window,d=w.document; let response,events=[],requests=[],fail=false,cloud={reflection:'',reflection_revision:0,reflection_updated_at:null};
 w.state={user:{id:'owner'},token:'token',page:'home',allExams:[],modal:null};
 w.recordHtml=()=>''; w.bindPage=w.renderPage=w.bindNav=()=>{};
 w.escapeHtml=String; w.__scoreTrackerTrack=(type,metadata)=>events.push({type,metadata});
 w.toast=msg=>{let t=d.querySelector('.toast');if(!t){t=d.createElement('div');t.className='toast';d.body.appendChild(t)}t.textContent=msg;t.classList.add('show');};
 w.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);requests.push(b);if(fail)throw Error('offline');if(b.action==='get_exam_reflection')return new Response(JSON.stringify(cloud));if(b.revision!==cloud.reflection_revision)return new Response(JSON.stringify({error:'conflict',current:cloud}),{status:409});cloud={reflection:b.text,reflection_revision:cloud.reflection_revision+1,reflection_updated_at:new Date().toISOString()};return new Response(JSON.stringify(cloud));};
 w.dataApiV7=async()=>response;
 w.openExam=exam=>{const el=d.createElement('div');el.innerHTML='<div class="modal-body"><input id="examName"><div class="modal-actions"><button class="save-btn">保存</button></div></div>';d.body.appendChild(el);w.state.modal=el;};
 w.saveExam=async(id,modal)=>{const r=await w.dataApiV7('save_exam',{exam:{id}});if(r.ok){w.state.allExams.push({id:r.id,...cloud});modal.remove();w.state.modal=null;w.toast(id?'已保存修改':'考试已记录');}};
 w.eval(read('exam-reflection.js'));w.eval(read('exam-detail.js'));
 function open(exam){w.openExam(exam);return w.state.modal;}
 function field(m){return m.querySelector('[data-entry-reflection]');}
 try{
 let m=open(null);assert.equal(m.querySelector('.ed-entry-reflection').nextElementSibling.className,'modal-actions');assert.equal(field(m).value,'');assert.equal(field(m).required,false);
 response={ok:true,id:'new',created:true,planned:false};await w.saveExam(null,m);assert.equal(requests.length,0);assert.equal(d.querySelector('.toast').textContent,'考试已记录');assert(!d.querySelector('.ed-reflection-toast-action'));
 m=open(null);field(m).value='第一次反思';response={ok:true,id:'with-note',created:true,planned:false};await w.saveExam(null,m);assert.equal(requests.at(-1).examId,'with-note');assert.equal(requests.at(-1).text,'第一次反思');assert.equal(requests.at(-1).revision,0);assert.equal(cloud.reflection,'第一次反思');assert.equal(d.querySelector('.toast').textContent,'考试已记录');assert(events.some(e=>e.type==='exam_reflection_saved'&&e.metadata.source==='score_entry'));
 m=open({id:'with-note',...cloud});assert.equal(field(m).value,'第一次反思');let before=requests.length;response={ok:true,id:'with-note'};await w.saveExam('with-note',m);assert.equal(requests.length,before);
 m=open({id:'with-note',...cloud});field(m).value='更新反思';response={ok:true,id:'with-note'};await w.saveExam('with-note',m);assert.equal(cloud.reflection,'更新反思');
 m=open({id:'with-note',...cloud});field(m).value='';await w.saveExam('with-note',m);assert.equal(cloud.reflection,'');
 m=open({id:'with-note',...cloud});field(m).value='成绩保存失败不应写反思';response={ok:false};before=requests.length;await w.saveExam('with-note',m);assert.equal(requests.length,before);assert(m.isConnected);m.remove();
 m=open({id:'with-note',...cloud});field(m).value='离线保留';response={ok:true,id:'with-note'};fail=true;await w.saveExam('with-note',m);assert.equal(JSON.parse(w.localStorage.getItem('st_exam_reflection_v1_owner_with-note')).text,'离线保留');assert(d.querySelector('.toast').textContent.includes('草稿已保留'));
 fail=false;m=open({id:'with-note',...cloud});assert.equal(field(m).value,'离线保留');await w.saveExam('with-note',m);assert.equal(cloud.reflection,'离线保留');assert.equal(w.localStorage.getItem('st_exam_reflection_v1_owner_with-note'),null);
 m=open({id:'with-note',...cloud});field(m).value='我的修改';cloud={...cloud,reflection:'其他设备修改',reflection_revision:cloud.reflection_revision+1};await w.saveExam('with-note',m);assert.equal(cloud.reflection,'其他设备修改');assert.equal(JSON.parse(w.localStorage.getItem('st_exam_reflection_v1_owner_with-note')).text,'我的修改');
 assert(!d.querySelector('.ed-reflection-toast-action'));
 console.log('PASS: inline optional field before Save, empty note, new and edited notes, no post-save action, save failure, offline draft, concurrent edit protection');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
