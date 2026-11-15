const assert=require('node:assert/strict'),{plan}=require('../paper-scan-views.js'),{harness,input,rid}=require('./test-paper-review.cjs');
(async()=>{
 for(const [w,h] of [[1280,1810],[1807,1280],[800,800],[400,2400],[2400,400],[1000,1400]]){
  const boxes=plan(w,h);assert.deepEqual(boxes[0],[0,0,1,1]);assert(boxes.length<=6);
  for(let y=0;y<=50;y++)for(let x=0;x<=50;x++)assert(boxes.slice(1).some(([l,t,ww,hh])=>x/50>=l-1e-8&&x/50<=l+ww+1e-8&&y/50>=t-1e-8&&y/50<=t+hh+1e-8),'detail crops cover any aspect ratio');
 }
 const h=harness();await h.init();const k=h.scope,boxes=plan(1807,1280),jpeg='data:image/jpeg;base64,/9j/AA==';
 const page={page:2,role:'work',url:input.pages[0].url,regions:boxes.map(()=>jpeg),region_boxes:boxes},normal={...input,work_on_paper:false,pages:[{page:1,role:'paper'},page]};
 const raw={coordinate_system:'view_xyxy_1000',questions:[{label:'1',question_type:'单选题',confidence:'high',source_regions:[{kind:'work',view_id:'v2',bbox:[100,200,800,900]}]}],shared_regions:[{questions:['2','3','999'],kind:'work',view_id:'v1',bbox:[100,100,900,300]}]};
 const saved=[{questions:[{label:'1',question_type:'单选题'},{label:'2',question_type:'单选题'},{label:'3',question_type:'单选题'}]}];
 const result=k.normalizeScanPage(raw,page,normal,saved);assert.equal(result.questions.length,3);assert(result.questions[1].shared_work);assert(result.warnings.some(s=>s.includes('未确认题号')));
 const [l,t,w,hh]=boxes[2],b=result.questions[0].source_regions[0].box;
 assert(Math.abs(b[0]-(l+.092*w))<.0001);assert(Math.abs(b[1]-.194)<.0001);assert(Math.abs(b[2]-.716*w)<.0001);assert(Math.abs(b[3]-.712)<.0001);
 assert.throws(()=>k.normalizeScanPage({...raw,coordinate_system:'xywh'},page,normal),/坐标格式/);
 const invalid=k.normalizeScanPage({...raw,questions:[{label:'1',source_regions:[{kind:'work',view_id:'missing',bbox:[0,0,500,500]}]}],shared_regions:[]},page,normal);
 assert.equal(invalid.questions[0].source_regions.length,0);assert(invalid.questions[0].uncertainties.some(s=>s.includes('坐标无效')));
 const old=k.normalizeScanPage({questions:[{label:'1',source_regions:[{kind:'work',page:2,box:[.9,.9,.8,.8]}]}]},{page:2,role:'work'},normal);assert(old.questions[0].uncertainties.length);
 const call=async(body,status=200)=>{const r=await h.call(body),j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;};
 await call({action:'save_materials',...input,options:{purpose:'record',config_version:2}});
 await call({action:'upload_page',request_id:rid,page:1,role:'paper',url:input.pages[0].url,regions:page.regions,region_boxes:boxes});
 const row=h.tables.score_tracker_paper_materials[0];assert.deepEqual(JSON.parse(JSON.stringify(row.pages[0].detail_images.map(d=>d.box))),boxes);
 const restored=await k.storedPages(h.scope.createClient(),'00000000-0000-4000-8000-000000000001',rid);assert.deepEqual(JSON.parse(JSON.stringify(restored[0].region_boxes)),boxes);
 assert.throws(()=>k.validateStart({...input,pages:[{...input.pages[0],regions:page.regions,region_boxes:boxes.slice(1)}]}),/坐标范围/);
 h.transport=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({coordinate_system:'view_xyxy_1000',questions:[{label:'1',question_type:'单选题',confidence:'high',source_regions:[{kind:'paper',view_id:'v2',bbox:[100,200,800,900]}],max_score:5,max_mark:{page:1,quote:'本题5分'}}],shared_regions:[],total:{}})}}]}));
 await call({action:'start',request_id:rid,use_saved:true,consent:true,work_on_paper:false},202);await h.drain();
 const completed=h.tables.score_tracker_paper_reviews[0];assert.equal(completed.status,'succeeded');assert.equal(completed.result.prompt_version,'screenshots-v2');assert.equal(completed.result.questions[0].source_regions.length,1);
 assert.equal(h.upstream[0].messages[0].content.filter(c=>c.type==='image_url').length,boxes.length);assert.equal(h.upstream[0].thinking,undefined,'fixture non-DeepSeek model has no invented reasoning setting');
 await call({action:'start',request_id:rid,use_saved:true,consent:true,work_on_paper:false},202);await h.drain();assert.equal(h.upstream.length,1,'stored transformed views survive fingerprint checks and start deduplication');
 const content=k.scanContent(normal,page,saved);assert.equal(content.filter(c=>c.type==='image_url').length,boxes.length);assert(content[0].text.includes('shared_regions'));assert(content[0].text.includes('view_xyxy_1000'));
 console.log('PASS: general portrait/landscape/square crop coverage, local-to-original XYXY transforms, shared answer grids, invalid coordinates, legacy compatibility and persisted view metadata round trip');
})().catch(e=>{console.error(e);process.exitCode=1});
