// Node 22+ runs the actual Edge handler with custom-auth and database stubs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
(async()=>{
  let handler,calls=[],expired=false;
  const token='test-session',hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const db={from(table){assert.equal(table,'score_tracker_users');let received;return {select(){return this},eq(column,value){assert.equal(column,'session_token_hash');received=value;return this},async maybeSingle(){return {data:received===hash?{id:'verified-user',session_expires_at:new Date(Date.now()+(expired?-60000:60000)).toISOString()}:null,error:null}}}},async rpc(name,parameters){calls.push({name,parameters});return {data:{enabled:true,matches:[],reference_policy:parameters.p_reference_policy,min_history:parameters.p_min_history},error:null}}};
  const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/score-tracker-trajectories/index.ts'),'utf8').replace(/^import[^\n]*\n/,'');
  vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>db,Deno:{env:{get:()=> 'test'},serve:f=>handler=f},crypto,TextEncoder,Uint8Array,Response,Request,Date,console});
  const base={action:'match',token,metric:'year',category:'__all__',subjects:null,match_mode:'shape'};
  async function request(body){return handler(new Request('https://test.local/trajectories',{method:'POST',body:JSON.stringify(body)}));}
  for(const mode of ['shape','overlap'])for(const policy of ['balanced','long','recent']){
    const r=await request({...base,match_mode:mode,reference_policy:policy,min_history:8,user_id:'someone-else',test_all_database:true});assert.equal(r.status,200);
    assert.equal(r.headers.get('Cache-Control'),'private, no-store');
    const call=calls.at(-1);assert.equal(call.name,'score_tracker_trajectory_match_configured');assert.equal(call.parameters.p_user_id,'verified-user');assert.equal(call.parameters.p_reference_policy,policy);assert.equal(call.parameters.p_min_history,8);assert.equal(call.parameters.p_match_mode,mode);assert(!('p_test_all_database' in call.parameters));
  }
  for(const fields of [{reference_policy:'unknown'},{reference_policy:null},{min_history:2},{min_history:1001},{min_history:3.5},{min_history:'8'},{min_history:null}]){
    const n=calls.length;assert.equal((await request({...base,...fields})).status,400);assert.equal(calls.length,n,'invalid settings never reach RPC');
  }
  assert.equal((await request({...base,min_history:1000})).status,200,'upper bound is accepted');
  await request(base);assert.equal(calls.at(-1).name,'score_tracker_trajectory_match_adaptive','old explicit-mode clients remain compatible');
  const legacy={...base};delete legacy.match_mode;await request(legacy);assert.equal(calls.at(-1).name,'score_tracker_trajectory_match','oldest clients retain equal-length API');
  await request({...legacy,reference_policy:'long'});assert.equal(calls.at(-1).name,'score_tracker_trajectory_match_configured','settings work with default shape mode');
  const n=calls.length;assert.equal((await request({...base,token:'wrong'})).status,401);expired=true;assert.equal((await request(base)).status,401);assert.equal(calls.length,n,'invalid or expired sessions cannot match');expired=false;
  assert.equal((await request(null)).status,400);assert.equal((await request([])).status,400);assert.equal((await request({...base,padding:'x'.repeat(8192)})).status,413);
  assert.equal((await handler(new Request('https://test.local/trajectories'))).status,405);
  console.log('PASS: configured API routing, strict settings validation, custom session authentication, requester isolation, cache protection and two legacy contracts');
})().catch(e=>{console.error(e);process.exitCode=1});
