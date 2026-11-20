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
  console.log('paper preview routing: fixed host, relay, failure fallback, auth errors and production isolation passed');
})().catch(e=>{console.error(e);process.exitCode=1});
