// Exercise the real handler/worker boundary with the focused column schema.
const assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,input,rid}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const db=vm.runInContext('db',h.scope),downloads=[];
 const storage=db.storage.from;db.storage.from=(...args)=>{const bucket=storage(...args),read=bucket.download;bucket.download=async path=>{downloads.push(path);return read(path)};return bucket;};
 const call=async(body,status=200)=>{assert(Buffer.byteLength(JSON.stringify({...body,token:'test-token'}))<4500000,'every upload fits the preview host payload limit');const r=await h.call(body),j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;};
 // Exercise the maximum page/view count with individually bounded uploads.
 const jpeg='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(400000)]).toString('base64');
 const boxes=Array.from({length:10},()=>[0,0,1,1]),rows=boxes.map(()=>[]);
 await call({action:'save_materials',...input,options:{purpose:'record',config_version:2}});
 let last;
 for(let page=1;page<=15;page++){
  last=await call({action:'upload_page',request_id:rid,page,role:page===15?'work':'paper',url:jpeg,separate_views:true,expected_views:10,region_boxes:boxes,region_rows:rows,page_frames:[[0,0,1000,1000]],region_focus:page===15?[1]:[]});
  if(page===1){
   await call({action:'start',request_id:rid,use_saved:true,consent:true,work_on_paper:false},409);
   assert.equal(downloads.length,0,'incomplete uploads are rejected before downloading or reserving a task');assert.equal(h.tables.score_tracker_paper_reviews.length,0);
   await call({action:'upload_page_view',request_id:rid,page,view:0,source_path:last.source_path,regions:[jpeg],token:'bad'},401);
  }
  for(let view=0;view<10;view++){
   const body={action:'upload_page_view',request_id:rid,page,view,source_path:last.source_path,regions:[jpeg]};
   if(page===1&&view===2){
    const count=h.blobs.size;h.fail=true;await call(body,503);h.fail=false;
    assert.equal(h.blobs.size,count,'a failed material CAS removes only the new asset');assert.equal(h.tables.score_tracker_paper_materials[0].pages[0].detail_images.length,2,'earlier uploaded assets remain');
   }
   await call(body);
   if(page===1&&view===0){const count=h.blobs.size;await call(body);assert.equal(h.blobs.size,count,'lost-response retry replaces a view without leaking a blob');}
  }
 }
 assert.equal(h.blobs.size,165);assert([...h.blobs.values()].reduce((n,b)=>n+b.length,0)>31500000);
 const metadata=await h.scope.storedPages(db,require('./test-paper-review.cjs').uid,rid,[]);
 assert.equal(downloads.length,0);assert(metadata.every(p=>p.url.startsWith('stored:')&&p.regions.every(r=>r.startsWith('stored:'))));
 await call({action:'start',...input,pages:[{role:'paper',url:metadata[0].url}],options:{purpose:'record',config_version:2}},400);
 let fail=true,previousDownloads=0;
 h.transport=async(_url,opts)=>{
  const b=JSON.parse(opts.body),content=b.messages[0].content,p=content[0].text,page=Number((p.match(/(?:本轮仅第|这是第)(\d+)页/) || p.match(/max_mark=\{page:(\d+)/))[1]),focused=p.includes('（长答题栏）');
  assert(downloads.length-previousDownloads<=11,'each worker stage downloads at most one page');previousDownloads=downloads.length;
  assert(content.filter(c=>c.type==='image_url').every(c=>c.image_url.url.startsWith('data:image/')),'internal storage references never reach the model');
  if(focused&&fail)return new Response(JSON.stringify({error:{message:'fixture interruption'}}),{status:400});
  const q={label:String(page),question_type:'解答题',max_score:13,max_mark:{page,quote:page+'（13分）'},teacher_score:focused?10:null,score_mark:focused?{page,quote:'10分',scope:'question',label:String(page)}:null,confidence:'high'};
  const result=focused?{coordinate_system:'view_xyxy_1000',area_type:'answer',prefix_continuation:false,column_items:[{...q,header_row:null,header_y:62}],total:{},score_groups:[],warnings:[]}:{coordinate_system:'view_xyxy_1000',questions:[{...q,source_regions:[{kind:page===15?'work':'paper',view_id:'v0',bbox:[50,50,950,950]}]}],total:{},warnings:[]};
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));
 };
 await call({action:'start',request_id:rid,use_saved:true,consent:true,work_on_paper:false},202);await h.drain();
 const row=h.tables.score_tracker_paper_reviews[0];assert.equal(row.status,'failed',JSON.stringify(h.logs));assert.equal(row.analysis_state.material_version,2);assert.equal(row.analysis_state.scan_pages.length,14,JSON.stringify({error:row.error_detail,logs:h.logs.slice(-6)}));assert.equal(row.analysis_state.scan_pending.parts.length,1);
 const previousCalls=h.upstream.length;
 // Emulate an exhausted checkpoint written by the prior deployment.
 delete row.analysis_state.scan_context_version;row.analysis_state.resume_count=2;
 assert((await call({action:'get',request_id:rid})).review.recovery.available);
 fail=false;await call({action:'resume',request_id:rid},202);await h.drain();
 assert.equal(row.status,'succeeded',JSON.stringify(h.logs));assert.equal(h.upstream.length,previousCalls+1,'resuming a local view never replays completed pages or the main pass');
 assert.equal(row.result.questions.find(q=>q.label==='15').teacher_score,10,'column_items is normalized using the same active view that the worker prompted');
 assert.equal(row.progress.completed_pages,15);
 assert.equal(h.scope.needsScanContextUpgrade({flow:'screenshot_record',scan_context_version:2,resume_count:2}),false,'the release recovery allowance is consumed once');
 assert.equal(h.scope.recoveryInfo({status:'failed',options:{purpose:'record'},analysis_state:{phase:'extract',flow:'screenshot_record',scan_context_version:2,resume_count:2}}).available,false,'future failures still retain the bounded retry policy');
 console.log('PASS: 15-page / 165-asset full upload, payload bounds, partial-upload recovery, CAS cleanup, owner validation, incomplete-start guard, per-page reads, focused column worker normalization and exhausted checkpoint upgrade');
})().catch(e=>{console.error(e);process.exitCode=1});
