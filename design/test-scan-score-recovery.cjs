const assert=require('node:assert/strict');
const {harness,input,rid}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const k=h.scope;
 const page={page:2,role:'work',url:input.pages[0].url},normal={...input,work_on_paper:false,pages:[{page:1,role:'paper',url:input.pages[0].url},page]};
 const q=(label,score=null)=>({label,question_type:'单选题',teacher_score:score,score_mark:score===null?null:{page:2,quote:String(score),scope:'question',label},max_score:null,max_mark:null,confidence:'high',uncertainties:[],source_regions:[{kind:'work',page:2,box:[0,0,1,1]}]});
 const base={page:2,role:'work',questions:[q('1'),q('2',0),q('3'),q('4')],score_groups:[{label:'填空题',questions:['3','4'],teacher_score:5,score_mark:{page:2,quote:'填空题5分'}}],total:{},warnings:[]};
 assert.deepEqual(Array.from(k.scanScoreTargets(base,normal),v=>v.label),['1','3','4'],'preserve zero but still check for explicit per-question marks in a scored group');
 const detailed={...page,regions:['overview','local','unrelated'],region_boxes:[[0,0,1,1],[0,0,.5,.5],[.75,.75,.2,.2]]};
 const localized={...base.questions[0],source_regions:[{kind:'work',page:2,box:[0,0,.4,.4]}]};
 assert.deepEqual(Array.from(k.scanScoreContent(normal,detailed,[localized],1).filter(c=>c.type==='image_url'),c=>c.image_url.url),['overview','local'],'independent review includes context and relevant magnification, excluding unrelated crops');
 const raw={questions:[{label:'1',teacher_score:5,score_mark:{page:1,quote:'5分',scope:'question',label:'1'}}]};
 const read=k.normalizeScanScores(raw,page,normal,[],[base.questions[0]]);
 assert.equal(read[0].teacher_score,5);assert.equal(read[0].score_mark.page,2,'bind source page in program');
 assert.equal(raw.questions[0].score_mark.page,1,'retain raw provider response');
 const wrong=k.normalizeScanScores({questions:[{...raw.questions[0],score_mark:{...raw.questions[0].score_mark,label:'99'}}]},page,normal,[],[base.questions[0]]);assert.equal(wrong[0].teacher_score,null,'page correction cannot excuse a wrong question binding');
 assert.throws(()=>k.normalizeScanScores({questions:[]},page,normal,[],[base.questions[0]]),/目标题号/);
 const bad=structuredClone(base);bad.questions[0].uncertainties=['整页与补读批改分不一致，请核对'];
 const once=k.mergeScanScores(bad,read,[bad.questions[0]],0);assert.equal(once.questions[0].teacher_score,null,'existing conflict needs independent confirmation');
 const twice=k.mergeScanScores(once,read,[once.questions[0]],1);assert.equal(twice.questions[0].teacher_score,5);assert.equal(twice.questions[1].teacher_score,0);
 const other=structuredClone(read);other[0].teacher_score=0;other[0].score_mark.quote='0分';
 const disputed=k.mergeScanScores(once,other,[once.questions[0]],1);assert.equal(disputed.questions[0].teacher_score,null);assert(disputed.questions[0].uncertainties.some(v=>v.includes('两次补读')));
 const failed=k.mergeScanScores(base,[],[base.questions[0]],1,true);assert.equal(failed.questions[1].teacher_score,0);assert.deepEqual(failed.questions[1].source_regions,base.questions[1].source_regions);
 const shared=structuredClone(base);shared.questions[0].shared_work=true;
 const sharedOnce=k.mergeScanScores(shared,read,[shared.questions[0]],0);assert.equal(sharedOnce.questions[0].teacher_score,null,'a shared grid needs independent confirmation');
 const sharedTwice=k.mergeScanScores(sharedOnce,read,[sharedOnce.questions[0]],1);assert.equal(sharedTwice.questions[0].teacher_score,5);
 const jpeg=require('jpeg-js'),pixels=Buffer.alloc(800*600*4,255);
 for(let y=315;y<330;y++)for(let x=95;x<110;x++){const i=(y*800+x)*4;pixels[i]=230;pixels[i+1]=20;pixels[i+2]=20;}
 const data=jpeg.encode({data:pixels,width:800,height:600},85).data;
 const missingView={page:2,role:'work',url:'data:image/jpeg;base64,'+data.toString('base64'),regions:['overview','unrelated'],region_boxes:[[0,0,1,1],[.65,.05,.3,.8]]};
 const grid={...base.questions[0],shared_work:true,source_regions:[{kind:'work',page:2,box:[.01,.51,.34,.07]}]};
 const cropped=k.cropMissingScoreViews(missingView,[grid,{...grid,label:'2'}]);assert.equal(cropped.length,1,'a shared region is decoded once');
 const decoded=jpeg.decode(Buffer.from(cropped[0].url.split(',')[1],'base64'),{useTArray:true});
 assert(decoded.width<800&&decoded.height<200,'the missing score band is truly cropped, not another full-page image');
 const redX=100-Math.floor(cropped[0].box[0]*800),redY=320-Math.floor(cropped[0].box[1]*600),red=(redY*decoded.width+redX)*4;
 assert(decoded.data[red]>180&&decoded.data[red+1]<70&&decoded.data[red+2]<70,'RGB decoding preserves colored score marks in the crop');
 assert(cropped[0].box[0]<=grid.source_regions[0].box[0]&&cropped[0].box[1]<grid.source_regions[0].box[1],'padding retains marks beside the detected grid');
 const noCrop=k.cropMissingScoreViews({...missingView,regions:['overview','local'],region_boxes:[[0,0,1,1],[.01,.51,.34,.07]]},[grid]);assert.equal(noCrop.length,0,'an existing tight local view is reused');
 assert.equal(k.cropMissingScoreViews({...missingView,url:'data:image/png;base64,AAAA'},[grid]).length,0,'unsupported images safely fall back to saved views');
 const scoreContent=k.scanScoreContent(normal,missingView,[grid],0).filter(c=>c.type==='image_url');assert.equal(scoreContent.length,1);assert.notEqual(scoreContent[0].image_url.url,'overview','the actual model request receives the generated crop');
 // Exercise the durable handler, not only helpers: a missing score gets a local
 // attempt then a whole-page attempt, and neither replays completed pages.
 let recover=0;
 h.transport=async(_url,opts)=>{const b=JSON.parse(opts.body),p=b.messages[0].content[0].text;let data;
  if(p.startsWith('截图分数自动复核')){recover++;assert.equal(b.max_tokens,8192);assert(!p.includes('转录题干'));data={questions:[{label:'1',teacher_score:recover===1?null:0,score_mark:recover===1?null:{page:1,quote:'0分',scope:'question',label:'1'}}]};}
  else {const n=Number(p.match(/本轮仅第(\d+)页/)[1]);data={questions:[{label:'1',question_type:'单选题',source_regions:[{kind:n===1?'paper':'work',page:n,box:[0,0,1,1]}],teacher_score:null,max_score:5,max_mark:{page:n,quote:'本题5分'}}],score_groups:[],total:{}};}
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]}));};
 const r=await h.call({action:'start',...input,pages:normal.pages,work_on_paper:false,options:{purpose:'record',config_version:2}});assert.equal(r.status,202,await r.clone().text());await h.drain();
 const row=h.tables.score_tracker_paper_reviews[0];assert.equal(row.status,'succeeded',JSON.stringify(h.logs));assert.equal(row.result.questions[0].teacher_score,0);assert.equal(recover,2);assert.equal(h.upstream.length,4,'two original pages plus two focused score reads');
 const f=harness();await f.init();f.transport=async(_url,opts)=>{const p=JSON.parse(opts.body).messages[0].content[0].text;if(p.startsWith('截图分数自动复核'))return new Response('{}',{status:400});const n=Number(p.match(/本轮仅第(\d+)页/)[1]);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({questions:[{label:'1',source_regions:[{kind:n===1?'paper':'work',page:n,box:[0,0,1,1]}]}]})}}]}));};
 await f.call({action:'start',...input,pages:normal.pages,work_on_paper:false,options:{purpose:'record',config_version:2}});await f.drain();assert.equal(f.tables.score_tracker_paper_reviews[0].status,'succeeded');assert.equal(f.tables.score_tracker_paper_reviews[0].result.questions[0].source_regions.length,2,'failed supplemental reads retain completed crops');
 console.log('PASS: source-page binding, zero, grouped totals, independent conflict checks, bounded durable recovery and failed reread preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
