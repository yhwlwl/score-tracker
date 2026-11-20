'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('paper-review.js','utf8');
const code=source.slice(source.indexOf('  var PREVIEW_HOST'),source.indexOf('  function prepare('));
assert(code.includes('PREVIEW_RELAY'));
const endpoint='/api/score-tracker-paper-review',relay='https://assets.tantantan.tech/paper-preview-upload';
async function scenario(host,action,results){
  const calls=[];let i=0;
  const context={window:{location:{hostname:host}},state:{user:{id:'fixture'},token:'fixture'},ENDPOINT:endpoint,PREVIEW_RELAY:relay,AbortController,setTimeout,clearTimeout,
    entryOnly:()=>false,current:()=>true,fetch:async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});const x=results[i++];if(x==='network')throw Error('unreachable');return {ok:x===200,status:x,json:async()=>x===200?{ok:true}:{error:'failed'}};}};
  const api=vm.runInNewContext(code+'\napi',context);let error;
  try{await api({user:'fixture',token:'fixture'},action,{page:1});}catch(e){error=e;}
  return {calls,error};
}
async function relaySequentialPageScenario(){
  const mirrorPath=require.resolve('../ops/paper-preview-mirror.cjs'),relayPath=require.resolve('../ops/paper-preview-relay.cjs');
  const priorMirror=require.cache[mirrorPath],priorRelay=require.cache[relayPath],savedFetch=global.fetch;
  const saved=[];
  require.cache[mirrorPath]={id:mirrorPath,filename:mirrorPath,loaded:true,exports:{
    run:async()=>{},
    savePrimaryAsset:async(...args)=>saved.push(args),
    readPrimaryAsset:async()=>{throw Error('not used');},
    withPrimaryLock:async(_id,fn)=>fn(),
    signBridgeAsset:async()=>`sig-${saved.length}`
  }};
  delete require.cache[relayPath];
  const {handleUpload}=require(relayPath);
  const requestId='11111111-1111-4111-8111-111111111111',userId='22222222-2222-4222-8222-222222222222';
  const image=`data:image/jpeg;base64,${Buffer.from([0xff,0xd8,0xff,0x00]).toString('base64')}`;
  let authorizations=0;
  global.fetch=async(_url,opts)=>{
    const request=JSON.parse(opts.body);assert.equal(request.action,'authorize_ecs_page');authorizations++;
    return {ok:true,status:200,text:async()=>JSON.stringify({user_id:userId})};
  };
  try{
    const base={action:'upload_page',token:'A'.repeat(43),request_id:requestId,url:image,regions:[],separate_views:false};
    const first=await handleUpload({...base,page:1});
    const second=await handleUpload({...base,page:2});
    assert.equal(first.ok,true);assert.equal(second.ok,true);assert.equal(authorizations,1);
  }finally{
    global.fetch=savedFetch;
    if(priorMirror)require.cache[mirrorPath]=priorMirror;else delete require.cache[mirrorPath];
    if(priorRelay)require.cache[relayPath]=priorRelay;else delete require.cache[relayPath];
  }
}
(async()=>{
  const host='feat-paper-entry-analysis-fl.score-tracker-d83.pages.dev';
  let r=await scenario(host,'upload_page',[200]);assert.deepEqual(r.calls.map(c=>c.url),[relay]);assert(!r.error);
  r=await scenario(host,'upload_page',['network',200]);assert.deepEqual(r.calls.map(c=>c.url),[relay,endpoint]);assert(!r.error);
  r=await scenario(host,'upload_page_view',[503,200]);assert.deepEqual(r.calls.map(c=>c.url),[relay,endpoint]);assert(!r.error);
  r=await scenario(host,'upload_page',[401]);assert.deepEqual(r.calls.map(c=>c.url),[relay]);assert.equal(r.error.status,401);
  r=await scenario(host,'save_materials',[200]);assert.deepEqual(r.calls.map(c=>c.url),[endpoint]);
  r=await scenario('score-tracker.pages.dev','upload_page',[200]);assert.deepEqual(r.calls.map(c=>c.url),[endpoint]);
  r=await scenario('649d0811.score-tracker-d83.pages.dev','upload_page',[200]);assert.deepEqual(r.calls.map(c=>c.url),[relay]);
  r=await scenario('feat-paper-entry-analysis-fl.score-tracker-d83.pages.dev.attacker.test','upload_page',[200]);assert.deepEqual(r.calls.map(c=>c.url),[endpoint]);
  await relaySequentialPageScenario();
  console.log('paper preview routing: fixed host, relay, failure fallback, auth errors, production isolation and sequential ECS pages passed');
})().catch(e=>{console.error(e);process.exitCode=1});
