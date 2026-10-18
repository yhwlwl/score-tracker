const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');const {source}=require('./vision-harness.cjs');
const root=path.resolve(__dirname,'..'),id='00000000-0000-4000-8000-000000000003',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const record={request_id:id,user_id:'fixture',username:'测试同学',created_at:'2026-10-17T08:00:00Z',status:'succeeded',model:'deepseek-v4.1-flash',duration_ms:13500,
  source_image_count:1,storage_status:'complete',result:{exam:{name:'<img src=x onerror=alert(1)>'},subjects:[{name:'数学',finalScore:128}]},
  images:[{path:id+'/0.png',url:'https://fixture.supabase.co/temporary.png',source_index:0,kind:'original'}],attempts:[{attempt:1,reasoning_tokens:0}],diagnostics:{},image_meta:[],storage_errors:[]};
async function domTests(){
  const html=vm.runInNewContext(fs.readFileSync(path.join(root,'api/mg-ui.js'),'utf8').replace('export const MG_HTML','const MG_HTML')+';MG_HTML'),calls=[],errors=[];
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://test/mg?view=vision',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
    w.localStorage.setItem('st_admin_token','fixture-token');w.fetch=async(url,options)=>{const q=new URL(url,'https://test').searchParams;calls.push(Object.fromEntries(q));assert.equal(options.headers['x-score-token'],'fixture-token');
      return {ok:true,json:async()=>q.get('action')==='vision_request_detail'?{record}:q.get('action')==='vision_requests'?{rows:[record],total:61,summary:{success_rate:41.9,succeeded:13,failed:18,median_ms:13500,p95_ms:35000,errors:[]}}:{ok:true}};
    };
  }});
  const w=dom.window,d=w.document;await sleep(50);
  assert(d.querySelector('#page').textContent.includes('41.9%'));assert(d.querySelector('#page').textContent.includes('13.5 秒'));assert(!d.querySelector('#page').textContent.includes('NaN'));
  d.querySelector('[data-vision-record]').click();await sleep(20);assert.equal(d.querySelector('.drawer img').getAttribute('src'),record.images[0].url);assert(!d.querySelector('.drawer img[src="x"]'));assert(d.querySelector('.drawer').textContent.includes('128'));
  d.querySelector('#closeDrawer').click();d.querySelector('#visionStatus').value='failed';d.querySelector('#visionStatus').dispatchEvent(new w.Event('change'));await sleep(20);assert.equal(calls.at(-1).status,'failed');
  d.querySelector('#visionNext').click();await sleep(20);assert.equal(calls.at(-1).page,'2');
  d.querySelector('#globalSearch').value='测试同学';d.querySelector('#globalSearch').dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(450);assert.equal(calls.at(-1).search,'测试同学');
  d.querySelector('#visionDays').value='1';d.querySelector('#visionDays').dispatchEvent(new w.Event('change'));await sleep(20);assert.equal(calls.at(-1).days,'1');assert(w.location.search.includes('vision_days=1'));assert.deepEqual(errors,[]);w.close();
  process.stdout.write('PASS: actual admin DOM renders rates/durations, filters, paging, search, private images/results, URL state and escaped model content\n');
}
async function signingTests(){
  let signed;
  const row={...record,images:[{path:id+'/0.png'},{path:'another-request/private.png'}]};
  const db={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:row,error:null})}},storage:{from(){return {createSignedUrls:async(paths,expiry)=>{signed={paths,expiry};return {data:paths.map(path=>({signedUrl:'https://fixture.supabase.co/'+path})),error:null}}}}}};
  const scope={console};vm.createContext(scope);vm.runInContext(source('supabase/functions/score-tracker-admin/vision-records.ts')+';globalThis.detail=visionRecordDetail;globalThis.removeRecord=deleteVisionRecord',scope);
  const r=await scope.detail(db,id);assert.equal(r.images.length,1);assert.equal(signed.expiry,300);assert.equal(signed.paths[0],id+'/0.png');assert.equal(await scope.detail(db,'../../private'),null);
  process.stdout.write('PASS: admin detail signs only stored paths belonging to the selected request, with 5-minute expiry\n');
  let removed,deleted=false;
  db.storage.from=()=>({remove:async paths=>{removed=paths;return {error:null}}});
  db.from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:row,error:null}),delete(){return {eq:async()=>{deleted=true;return {error:null}}}}});
  row.storage_status='pending';assert.equal((await scope.removeRecord(db,id)).status,409);assert.equal(deleted,false);
  row.storage_status='complete';const result=await scope.removeRecord(db,id);assert.equal(result.ok,true);assert.equal(removed[0],id+'/0.png');assert.equal(deleted,true);
  process.stdout.write('PASS: admin deletion waits for processing to finish and removes only that request’s private objects and audit record\n');
}
(async()=>{await domTests();await signingTests()})().catch(e=>{console.error(e);process.exitCode=1});
