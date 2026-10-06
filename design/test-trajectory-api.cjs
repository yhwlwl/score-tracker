// Node 22+ runs the actual Edge handler with custom-auth and database stubs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
(async()=>{
  let handler,calls=[],expired=false,sharingRow=null,upserts=[],matcherCount=2;
  const token='test-session',hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const db={from(table){if(table==='score_tracker_users'){let received;return {select(){return this},eq(column,value){assert.equal(column,'session_token_hash');received=value;return this},async maybeSingle(){return {data:received===hash?{id:'verified-user',session_expires_at:new Date(Date.now()+(expired?-60000:60000)).toISOString()}:null,error:null}}}}if(table==='score_tracker_trajectory_sharing'){let received;return {select(){return this},eq(column,value){assert.equal(column,'user_id');received=value;return this},async maybeSingle(){return {data:sharingRow&&received==='verified-user'?sharingRow:null,error:null}},async upsert(row,options){if(options){assert.equal(options.onConflict,'user_id');assert.equal(options.ignoreDuplicates,true);}upserts.push(row);sharingRow={enabled:row.enabled};return {error:null}}}}assert.fail('unexpected table '+table)},async rpc(name,parameters){calls.push({name,parameters});if(name==='score_tracker_trajectory_matcher_count')return {data:matcherCount,error:null};return {data:{enabled:true,matches:[],reference_policy:parameters.p_reference_policy,min_history:parameters.p_min_history},error:null}}};
  const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/score-tracker-trajectories/index.ts'),'utf8').replace(/^import[^\n]*\n/,'');
  vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>db,Deno:{env:{get:()=> 'test'},serve:f=>handler=f},crypto,TextEncoder,Uint8Array,Response,Request,Date,console});
  const base={action:'match',token,metric:'year',category:'__all__',subjects:null,match_mode:'shape'};
  async function request(body){return handler(new Request('https://test.local/trajectories',{method:'POST',body:JSON.stringify(body)}));}
  let statusResponse=await request({action:'status',token});assert.equal(statusResponse.status,200);assert.deepEqual(await statusResponse.json(),{enabled:true,defaulted:true,matched_count:2},'missing sharing choice defaults to enabled and returns the anonymous exposure count');assert.equal(upserts.length,1);assert.equal(upserts[0].enabled,true);
  statusResponse=await request({action:'status',token});assert.equal(statusResponse.status,200);assert.deepEqual(await statusResponse.json(),{enabled:true,defaulted:false,matched_count:2},'existing default choice is not presented as a new choice');
  assert.equal((await request({action:'sharing',token,enabled:false})).status,200);statusResponse=await request({action:'status',token});assert.deepEqual(await statusResponse.json(),{enabled:false,defaulted:false,matched_count:2},'explicit opt-out remains off while historical anonymous count stays available');
  for(const mode of ['shape','overlap'])for(const policy of ['balanced','long','recent']){
    const r=await request({...base,match_mode:mode,reference_policy:policy,min_history:8,user_id:'someone-else',test_all_database:true});assert.equal(r.status,200);
    assert.equal(r.headers.get('Cache-Control'),'private, no-store');
    const call=calls.at(-1);assert.equal(call.name,'score_tracker_trajectory_match_configured');assert.equal(call.parameters.p_user_id,'verified-user');assert.equal(call.parameters.p_reference_policy,policy);assert.equal(call.parameters.p_min_history,8);assert.equal(call.parameters.p_match_mode,mode);assert(!('p_test_all_database' in call.parameters));
  }
  for(const fields of [{reference_policy:'unknown'},{reference_policy:null},{min_history:2},{min_history:1001},{min_history:3.5},{min_history:'8'},{min_history:null}]){
    const n=calls.length;assert.equal((await request({...base,...fields})).status,400);assert.equal(calls.length,n,'invalid settings never reach RPC');
  }
  assert.equal((await request({...base,min_history:1000})).status,200,'upper bound is accepted');
  for(const mode of ['shape','overlap']){
    assert.equal((await request({...base,match_mode:mode,reference_limit:20})).status,200);
    assert.equal(calls.at(-1).name,'score_tracker_trajectory_match_ensemble');
    assert.equal(calls.at(-1).parameters.p_user_id,'verified-user');
  }
  for(const reference_limit of [null,0,4,21,'20',20.5]){
    const before=calls.length;assert.equal((await request({...base,reference_limit})).status,400);assert.equal(calls.length,before);
  }
  await request(base);assert.equal(calls.at(-1).name,'score_tracker_trajectory_match_adaptive','old explicit-mode clients remain compatible');
  const legacy={...base};delete legacy.match_mode;await request(legacy);assert.equal(calls.at(-1).name,'score_tracker_trajectory_match','oldest clients retain equal-length API');
  await request({...legacy,reference_policy:'long'});assert.equal(calls.at(-1).name,'score_tracker_trajectory_match_configured','settings work with default shape mode');
  const n=calls.length;assert.equal((await request({...base,token:'wrong'})).status,401);expired=true;assert.equal((await request(base)).status,401);assert.equal(calls.length,n,'invalid or expired sessions cannot match');expired=false;
  assert.equal((await request(null)).status,400);assert.equal((await request([])).status,400);assert.equal((await request({...base,padding:'x'.repeat(8192)})).status,413);
  assert.equal((await handler(new Request('https://test.local/trajectories'))).status,405);
  console.log('PASS: default-on sharing, explicit opt-out, configured API routing, strict settings validation, custom session authentication, requester isolation, cache protection and two legacy contracts');
})().catch(e=>{console.error(e);process.exitCode=1});
