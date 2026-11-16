const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom'),{harness,uid,input}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,d=w.document;let fail=true;
 const until=async check=>{for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error(d.querySelector('.pr-message')?.textContent||'UI timeout')};
 try{
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.setInterval=()=>1;w.AbortController=AbortController;
 w.fetch=async(url,opts)=>{
  const body=JSON.parse(opts?.body||'{}');
  if(!String(url).includes('paper-review'))return new Response(JSON.stringify({ok:true,enabled:false,exams:[],subjects:[],modules:[]}));
  calls.push(body);assert(Buffer.byteLength(JSON.stringify(body))<4500000);
  if(body.action==='upload_page_view'&&body.view===1&&fail){fail=false;return new Response(JSON.stringify({error:'fixture interrupted'}),{status:503});}
  return h.call(body);
 };
 w.eval(fs.readFileSync('app-bundle.js','utf8')+'\nwindow.qaState=state;');
 Object.assign(w.qaState,{user:{id:uid},token:'test-token',page:'stats',analysisTab:'papers'});
 const jpeg='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(650000)]).toString('base64');
 const pages=Array.from({length:2},(_,i)=>({role:i?'work':'paper',url:jpeg,regions:Array(6).fill(jpeg),region_boxes:Array.from({length:6},()=>[0,0,1,1]),region_rows:Array.from({length:6},()=>[]),page_frames:[],region_focus:[]}));
 const session={pages,workOnPaper:false,consent:true,pending:null};const host=d.createElement('section');d.body.appendChild(host);
 w.ScorePaperReview.mount({host,user:uid,token:'test-token',sessions:{'数学':session},draftId:input.draft_id,isActive:()=>true,options:{purpose:'record',config_version:2}},'数学');
 const save=()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='保存资料草稿');await until(()=>save());
 save().click();await until(()=>!save().disabled&&host.querySelector('.pr-message').textContent.includes('fixture interrupted'));
 assert.equal(h.tables.score_tracker_paper_materials[0].pages[0].detail_images.length,1);assert.equal(session.pages[0].cloud_upload.views,1);
 save().click();await until(()=>!save().disabled&&host.querySelector('.pr-message').textContent.includes('草稿已保存，可从试卷列表继续上传'));
 assert.equal(calls.filter(b=>b.action==='upload_page').length,2,'retry never reuploads a completed original');assert.equal(h.blobs.size,14);
 const count=calls.length;save().click();await until(()=>!save().disabled);assert(!calls.slice(count).some(b=>b.action.startsWith('upload_page')),'reopening save skips unchanged uploaded images');
 host.querySelector('[data-pr="up:1"]').click();await until(()=>host.querySelector('[data-pr="up:1"]'));
 save().click();await until(()=>!save().disabled);
 assert.deepEqual(h.tables.score_tracker_paper_materials[0].pages.map(p=>p.role),['work','paper'],'reordering invalidates the old page-index upload receipt');assert.equal(h.blobs.size,14);
 assert.equal(h.upstream.length,0);assert.deepEqual(errors,[]);
 // Dense canvases try bounded quality steps and then resize without changing aspect ratio.
 const qualities=[],canvas={width:3600,height:1800,toDataURL(_type,q){qualities.push(q);return 'x'.repeat(q<.8?2000000:3000000)}};
 assert.equal(w.ScorePaperScanViews.encode(canvas).length,2000000);assert(qualities.length>=4);assert.equal(canvas.width,3600,'quality adjustment keeps resolution when sufficient');
 // The admission path must count source files, not charge generated views against 12 MB.
 assert(pages.reduce((n,p)=>n+p.url.length+p.regions.reduce((n,s)=>n+s.length,0),0)>12000000);
 w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};
 w.Image=class {constructor(){this.naturalWidth=1800;this.naturalHeight=2400;}set src(_){w.queueMicrotask(()=>this.onload());}};
 w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});
 w.ScorePaperScanViews.build=()=>({regions:Array(6).fill(jpeg),region_boxes:Array.from({length:6},()=>[0,0,1,1]),region_rows:Array.from({length:6},()=>[]),page_frames:[],region_focus:[]});
 w.ScorePaperScanViews.encode=()=>jpeg;
 const file=host.querySelector('input[data-role=paper]');Object.defineProperty(file,'files',{value:[{type:'image/jpeg',size:11*1024*1024,name:'synthetic-large.jpg'}]});file.dispatchEvent(new w.Event('change'));
 await until(()=>session.pages.length===3&&!save().disabled);assert.equal(session.pages.length,3,'an 11 MB source is admitted even when existing derived views already exceed 12 MB');
 console.log('PASS: actual upload UI and handler, one asset per request, partial upload retry, saved-image reuse, reordered-page invalidation, no model use, adaptive encoding and >12 MB admission');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
