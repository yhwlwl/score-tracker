const assert=require('node:assert/strict');
const {goOverride,recognitionConfig,prepareModelRequest,GO_BASE_URL,GO_MODEL,goProviderReadiness,goKeyFingerprint,verifiedProviderRow}=require('../supabase/functions/_shared/recognition-config.ts');
const {runGoProbe,makeProbePng}=require('../supabase/functions/score-tracker-admin/go-probe.ts');
const {meteredModelFetch,actualProviderChannel}=require('../supabase/functions/_shared/ai-credits.ts');
(async()=>{
 const env=values=>k=>values[k];
 const row={model:'deepseek-flash',base_url:'https://api.deepseek.com',openrouter_api_key:'fixture-legacy',enabled:true};
 assert.equal(goOverride('study',env({})),null);
 assert.equal(goOverride('study',env({DEEPSEEK_API_KEY:'official'}),{study_provider:'deepseek'}).apiKey,'official');
 assert.equal(goOverride('vision',env({}),{...row,vision_provider:'deepseek'}).apiKey,'fixture-legacy');
 assert.equal(goOverride('vision',env({}),{...row,base_url:'https://example.com',vision_provider:'deepseek'}).configured,false);
 assert.equal(goOverride('study',env({OPENCODE_GO_API_KEY:'go'}),{study_provider:'opencode-go'}).configured,false);
 assert.equal(goOverride('study',env({OPENCODE_GO_API_KEY:'go'}),{study_provider:'opencode-go',go_test:{text:{ok:true}}}).configured,true);
 assert.equal(goOverride('vision',env({OPENCODE_GO_API_KEY:'go'}),{vision_provider:'opencode-go',go_test:{text:{ok:true}}}).configured,false);
 assert.equal(recognitionConfig(row,env({})).apiKey,'fixture-legacy');
 const flags={SCORE_TRACKER_STUDY_PROVIDER:'opencode-go',OPENCODE_GO_API_KEY:'fixture-go'};
 assert.equal(goOverride('study',env(flags)).apiKey,'fixture-go');
 const readiness=goProviderReadiness(env(flags));assert.equal(readiness.configured,true);assert.equal(readiness.study_provider,'opencode-go');assert.equal(readiness.vision_provider,'legacy');assert.equal(readiness.text_live,'unverified');assert.equal(readiness.vision_live,'unverified');assert(!JSON.stringify(readiness).includes('fixture-go'));assert.equal(goProviderReadiness(env({})).configured,false);
 const report=require('./study-agent-live-report-2026-11-24.json');const evidence=readiness.independent_eval;
 assert.equal(report.kind,'live-model');assert.equal(report.provider,'opencode-go');assert.equal(evidence.scope,'independent_evaluation');assert.equal(evidence.model,report.model);assert.equal(evidence.commit,report.commit);assert.equal(evidence.scenarios,report.executed);assert.equal(evidence.success,report.results.filter(r=>r.status===200&&r.usage?.prompt>0&&r.usage?.output>0).length);assert.equal(evidence.model_calls,report.results.reduce((sum,r)=>sum+r.calls,0));assert.equal(evidence.quality_passed,report.passed);
 assert.equal(recognitionConfig(row,env(flags)).apiKey,'fixture-legacy');
 const vision={...flags,SCORE_TRACKER_VISION_PROVIDER:'opencode-go'};
 assert.equal(recognitionConfig(row,env(vision)).configured,false);
 assert.equal(recognitionConfig(row,env({...vision,SCORE_TRACKER_GO_VISION_VERIFIED:'true'})).apiKey,'fixture-go');
 assert.equal(recognitionConfig({...row,enabled:false},env({...vision,SCORE_TRACKER_GO_VISION_VERIFIED:'true'})).apiKey,'');
 assert.equal(goOverride('study',env({SCORE_TRACKER_STUDY_PROVIDER:'opencode-go'})).configured,false);
 const keyEnv=env({OPENCODE_GO_API_KEY:'fixture-go'});
 const verified={study_provider:'opencode-go',vision_provider:'opencode-go',go_test:{key_hash:await goKeyFingerprint(keyEnv),text:{ok:true},vision:{ok:false}}};
 const clean=await verifiedProviderRow(verified,keyEnv);
 assert.equal(goOverride('study',keyEnv,clean).configured,true);
 assert.equal(goOverride('vision',keyEnv,clean).configured,false);
 assert.equal(goProviderReadiness(keyEnv,clean).text_live,'passed');
 assert.equal(goProviderReadiness(keyEnv,clean).vision_live,'failed');
 assert(!JSON.stringify(goProviderReadiness(keyEnv,clean)).includes(verified.go_test.key_hash));
 assert.equal(goOverride('study',env({OPENCODE_GO_API_KEY:'new-key'}),await verifiedProviderRow(verified,env({OPENCODE_GO_API_KEY:'new-key'}))).configured,false);
 const zlib=require('node:zlib');
 const expectedColors={red:[255,0,0],blue:[0,0,255],green:[0,255,0],yellow:[255,255,0]};
 for(const [color,rgb] of Object.entries(expectedColors)){
  const png=Buffer.from(await makeProbePng(color),'base64');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  let pos=8,ended=false,idat=[];
  while(pos+12<=png.length){
   const n=png.readUInt32BE(pos),tag=png.toString('ascii',pos+4,pos+8);assert(pos+12+n<=png.length);
   const data=png.subarray(pos+8,pos+8+n);
   let crc=0xffffffff;for(const byte of png.subarray(pos+4,pos+8+n)){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
   assert.equal((crc^0xffffffff)>>>0,png.readUInt32BE(pos+8+n));
   if(tag==='IDAT')idat.push(data);if(tag==='IEND')ended=true;pos+=12+n;
  }
  assert(ended);assert.equal(pos,png.length);
  const raw=zlib.inflateSync(Buffer.concat(idat));assert.equal(raw.length,96*(1+96*3));
  for(let y=0;y<96;y++){assert.equal(raw[y*289],0);for(let x=0;x<96;x++)assert.deepEqual([...raw.subarray(y*289+1+x*3,y*289+4+x*3)],rgb);}
 }
 const probe=await runGoProbe(async(kind,body)=>{
  if(kind==='vision'){assert.equal(body.messages[0].content[1].type,'image_url');assert(body.messages[0].content[1].image_url.url.startsWith('data:image/png;base64,'));return new Response('{}',{status:400});}
  const value=body.messages[0].content.match(/st-[a-f0-9]{8}/)[0];
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({value})}}]}));
 });
 assert.equal(probe.text.ok,true);assert.equal(probe.vision.ok,false);assert.equal(probe.vision.status,400);
 const invalid=await runGoProbe(async()=>new Response(JSON.stringify({choices:[{message:{content:'not-json'}}]})));
 assert.equal(invalid.text.code,'invalid_json');assert.equal(invalid.vision.code,'invalid_json');
 const init={method:'POST',headers:{Authorization:'Bearer fixture-go'},body:JSON.stringify({model:GO_MODEL,max_tokens:42,thinking:{type:'disabled'},messages:[{role:'user',content:'fixture'}]})};
 assert.equal(await prepareModelRequest('https://api.deepseek.com/chat/completions',init,'u','s'),init);
 const a=await prepareModelRequest(GO_BASE_URL+'/chat/completions',init,'u','s');
 const b=await prepareModelRequest(GO_BASE_URL+'/chat/completions',init,'u','s');
 const c=await prepareModelRequest(GO_BASE_URL+'/chat/completions',init,'other','s');
 assert.equal(a.headers.get('x-opencode-session'),b.headers.get('x-opencode-session'));
 assert.notEqual(a.headers.get('x-opencode-session'),c.headers.get('x-opencode-session'));
 assert.equal(a.headers.get('User-Agent'),'Score-Tracker/1.0');assert.equal(a.redirect,'error');
 assert.equal(a.body,init.body);assert.equal(a.headers.get('Authorization'),'Bearer fixture-go');
 await assert.rejects(()=>prepareModelRequest(GO_BASE_URL+'/models',init,'u','s'),/unsupported_go_endpoint/);
 const calls=[];const db={rpc:async(name,args)=>{calls.push({name,args});return {data:{allowed:true,known:true,credits:2}}}};
 let sent=0,settled=0;
 await meteredModelFetch(db,'u','task','call',GO_BASE_URL+'/chat/completions',init,async(url,req)=>{sent++;assert.equal(req.headers.get('x-opencode-session'),a.headers.get('x-opencode-session'));return new Response(JSON.stringify({id:'fixture',usage:{prompt_tokens:3,completion_tokens:2}}));},n=>settled+=n,'s');
 assert.equal(actualProviderChannel('https://api.deepseek.com/v1/chat/completions'),'deepseek');assert.equal(actualProviderChannel('https://openrouter.ai/api/v1/chat/completions'),'openrouter');assert.equal(actualProviderChannel('https://api.deepseek.com.example.org/chat/completions'),'other');assert.equal(calls[0].name,'score_tracker_ai_call_reserve_routed');assert.equal(calls[0].args.p_channel,'opencode-go');assert.equal(sent,1);assert.equal(settled,2);assert.equal(calls[0].args.p_model,GO_MODEL);assert.equal(calls[1].args.p_usage.prompt_tokens,3);
 console.log('PASS: independent provider settings, disabled image route, session isolation, unchanged legacy request, metering with fake transport');
})().catch(e=>{console.error(e);process.exitCode=1});
