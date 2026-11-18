// Exercise deployment routing through the real handler, storage and worker chain.
const assert=require('node:assert/strict');
const {harness,input,rid}=require('./test-paper-review.cjs');
const preview='score-tracker-paper-credits-preview',production='score-tracker-paper-review';
async function run(name,{interrupt=false}={}){
 const h=harness();await h.init();const delivered=[],reads=[];let fail=interrupt,savedFirst;
 for(const path of ['/functions/v1/'+name,'/'+name+'/'])assert.equal(h.scope.continuationUrl('https://untrusted.test'+path),'https://test.local/functions/v1/'+name);
 for(const path of ['/api','/functions/v1/other','/'+name+'/other'])assert.throws(()=>h.scope.continuationUrl('https://untrusted.test'+path),/continuation_route_unknown/);
 const fetch=h.scope.fetch;
 h.scope.fetch=async(url,options)=>{
  if(url.startsWith('https://test.local/functions/')){
   delivered.push(url);
   // Production and preview can have different checkpoint schemas.
   if(new URL(url).pathname!=='/functions/v1/'+name)return new Response('{}',{status:409});
   if(fail)return new Response('{}',{status:503});
  }
  return fetch(url,options);
 };
 const call=async(body,status=200)=>{
  const response=await h.handler(new Request('https://gateway.test/functions/v1/'+name,{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'test-token',...body})
  }));
  const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
 };
 h.transport=async(_url,options)=>{
  const request=JSON.parse(options.body),p=request.messages[0].content[0].text;
  const page=Number(p.match(/本轮仅第(\d+)页/)[1]);reads.push(page);
  if(page===2&&savedFirst)assert.deepEqual(h.tables.score_tracker_paper_reviews[0].analysis_state.scan_pages[0],savedFirst,'resume keeps the completed page exactly');
  const q={label:String(page),question_type:'解答题',teacher_score:page===3?0:5,max_score:5,
   score_mark:{page,quote:page===3?'0分':'5分',scope:'question',label:String(page)},max_mark:{page,quote:'本题5分'},
   source_regions:[{kind:'paper',page,box:[0.05,0.1,0.8,0.2]}],confidence:'high'};
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({questions:[q],total:{},score_groups:[]})}}]}));
 };
 await call({action:'save_materials',...input,options:{purpose:'record',config_version:2}});
 for(let page=1;page<=3;page++)await call({action:'upload_page',request_id:rid,page,role:'paper',url:input.pages[0].url});
 await call({action:'continue',request_id:rid,claim:crypto.randomUUID()},401);
 await call({action:'start',request_id:rid,use_saved:true,consent:true,work_on_paper:true,
  continuation_url:'https://untrusted.test/functions/v1/'+production},202);
 await h.drain();const row=h.tables.score_tracker_paper_reviews[0];
 if(interrupt){
  assert.equal(row.status,'failed');assert.equal(row.error_code,'continuation_failed');
  assert.match(row.error_message,/进度已保存/);assert.equal(row.analysis_state.scan_pages.length,1);
  savedFirst=structuredClone(row.analysis_state.scan_pages[0]);fail=false;
  await call({action:'resume',request_id:rid},202);await h.drain();
 }
 assert.equal(row.status,'succeeded',JSON.stringify({error:row.error_detail,logs:h.logs}));
 assert.deepEqual(reads,[1,2,3],'each page is read once, including after a dispatch failure');
 assert.equal(row.progress.completed_pages,3);assert.equal(row.result.questions.find(q=>q.label==='3').teacher_score,0);
 assert(delivered.length>=2);assert(delivered.every(url=>url==='https://test.local/functions/v1/'+name),'every successor stays on the same deployment and trusted project host');
}
(async()=>{
 await run(preview);await run(production);await run(preview,{interrupt:true});
 console.log('PASS: isolated preview and production continuation routing, service-only dispatch, saved-material fingerprints, three-page automatic completion, zero scores and checkpoint resume after failed delivery');
})().catch(e=>{console.error(e);process.exitCode=1});
