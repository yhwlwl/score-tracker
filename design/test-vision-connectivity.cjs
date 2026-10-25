const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {PGlite} = require('@electric-sql/pglite');
const {backendHarness} = require('./vision-harness.cjs');
const root = path.resolve(__dirname, '..');
const image = 'data:image/png;base64,AAAA';

async function handlerTests() {
  const h = backendHarness();
  for (let n = 0; n < 14; n++) {
    const response = await h.call({action:'readiness'});
    assert.equal(response.status,200);
    const body = await response.json();
    assert.equal(body.check,'service_readiness');
    assert.equal(body.quota.used,0);
    assert.equal(body.diagnostics.max_output_tokens,0);
  }
  assert.equal(h.upstream.length,0);
  assert.equal(h.connectivityRecords.size,0);
  const id = randomUUID();
  let response = await h.call({action:'connectivity_test',request_id:id});
  assert.equal(response.status,200);
  assert.equal((await response.json()).connectivity_quota.used,1);
  assert.equal(h.upstream.length,1);
  assert.equal(h.connectivityRecords.get(id).status,'succeeded');
  assert.equal(h.connectivityRecords.get(id).attempts.length,1);
  assert.equal(h.records.size,0);
  response = await h.call({action:'connectivity_test',request_id:id});
  assert.equal(response.status,409);
  const burst = await Promise.all(Array.from({length:10},()=>h.call({action:'connectivity_test'})));
  assert(burst.every(r=>r.status===429));
  assert.equal(h.upstream.length,1);
  response = await h.call({action:'recognize',images:[image]});
  assert.equal(response.status,200);
  assert.equal(h.records.size,1);
  assert.equal([...h.records.values()][0].quota_consumed,true);
  response = await h.call({action:'readiness'});
  assert.equal(response.status,200);
  assert.equal(h.upstream.length,2);

  for (const failure of [
    {error:{message:'upstream busy'}},
    {choices:[{finish_reason:'length',message:{content:''}}]},
  ]) {
    const bad = backendHarness(); let attempts = 0;
    bad.scope.fetch = async()=>{ attempts++; return new Response(JSON.stringify(failure),{status:failure.error?503:200}); };
    response = await bad.call({action:'connectivity_test'});
    assert(response.status>=400);
    assert.equal(attempts,1);
    assert.equal(bad.connectivityRecords.size,1);
    assert.equal([...bad.connectivityRecords.values()][0].status,'failed');
    response = await bad.call({action:'connectivity_test'});
    assert.equal(response.status,429);
    assert.equal(attempts,1);
  }
  const unavailable = backendHarness();
  const originalRpc = unavailable.db.rpc;
  unavailable.db.rpc = async(name,args)=>name==='score_tracker_vision_connectivity_reserve'
    ? {error:{message:'database unavailable'}} : originalRpc(name,args);
  response = await unavailable.call({action:'connectivity_test'});
  assert.equal(response.status,503);
  assert.equal(unavailable.upstream.length,0);
  response = await unavailable.call({action:'readiness'});
  assert.equal(response.status,200);
  const anonymous = backendHarness();
  anonymous.rows.score_tracker_users.session_expires_at='2000-01-01';
  assert.equal((await anonymous.call({action:'connectivity_test'})).status,401);
  assert.equal(anonymous.connectivityRecords.size,0);
  assert.equal(anonymous.upstream.length,0);
  console.log('PASS: free automatic readiness, durable diagnostic reservation, duplicates/bursts blocked, failures retain budget, one attempt, fail closed, recognition unaffected');
}

async function sqlTests() {
  const db = new PGlite();
  const uid = randomUUID(), other = randomUUID();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.score_tracker_users(id uuid primary key);
    create table public.score_tracker_ai_usage(request_count int);
    insert into public.score_tracker_ai_usage values(7);
    insert into public.score_tracker_users values('${uid}'),('${other}');`);
  const migration = fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.endsWith('_vision_connectivity_limits.sql'));
  await db.exec(fs.readFileSync(path.join(root,migration?'supabase/migrations/'+migration:'design/vision-connectivity-limits.sql'),'utf8'));
  const reserve = async(user=uid,id=randomUUID())=>(await db.query(
    'select public.score_tracker_vision_connectivity_reserve($1,$2,$3,$4) as q',[user,id,'fixture-model','models.test'])).rows[0].q;
  const id = randomUUID();
  assert.equal((await reserve(uid,id)).used,1);
  assert.equal((await reserve(uid,id)).reason,'duplicate_request');
  assert.equal((await reserve(other,id)).reason,'request_id_conflict');
  assert.equal((await reserve()).reason,'cooldown');
  assert.equal((await reserve(other)).reason,'in_flight');
  await db.exec("update score_tracker_vision_connectivity_requests set status='failed'");
  assert.equal((await reserve(other)).reason,'global_cooldown');
  for (const used of [2,3]) {
    await db.exec("update score_tracker_vision_connectivity_requests set created_at=created_at-interval '61 seconds',status='failed'");
    assert.equal((await reserve()).used,used);
  }
  await db.exec("update score_tracker_vision_connectivity_requests set created_at=created_at-interval '61 seconds'");
  assert.equal((await reserve()).reason,'user_daily_limit');
  assert.equal((await db.query('select count(*)::int as n from score_tracker_vision_connectivity_requests')).rows[0].n,3);
  assert.equal((await db.query('select request_count from score_tracker_ai_usage')).rows[0].request_count,7);

  for (const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    await assert.rejects(reserve(),/permission denied/);
    await assert.rejects(db.query('select * from score_tracker_vision_connectivity_requests'),/permission denied/);
    await db.exec('reset role');
  }
  await db.exec('grant usage on schema public to service_role;grant select on score_tracker_users to service_role;set role service_role');
  assert.equal((await reserve()).reason,'user_daily_limit');
  await db.exec('reset role');
  await db.exec("update score_tracker_vision_connectivity_requests set created_at=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC'-interval '1 day'");
  assert.equal((await reserve()).used,1);
  await db.exec("update score_tracker_vision_connectivity_requests set status='succeeded',created_at=created_at-interval '61 seconds'");
  const submissions = await Promise.all(Array.from({length:10},()=>reserve()));
  assert.equal(submissions.filter(q=>q.allowed).length,1);
  await db.exec(`insert into score_tracker_vision_connectivity_requests(request_id,user_id,status,model,provider_host)
    select gen_random_uuid(),null,'failed','fixture','models.test' from generate_series(1,50)`);
  assert.equal((await reserve(other)).reason,'global_daily_limit');
  const countBefore = (await db.query('select count(*)::int as n from score_tracker_vision_connectivity_requests')).rows[0].n;
  await db.query('delete from score_tracker_users where id=$1',[uid]);
  assert.equal((await db.query('select count(*)::int as n from score_tracker_vision_connectivity_requests')).rows[0].n,countBefore);
  assert.equal((await reserve(other)).reason,'global_daily_limit');
  const table = (await db.query("select relrowsecurity from pg_class where relname='score_tracker_vision_connectivity_requests'")).rows[0];
  assert.equal(table.relrowsecurity,true);
  await db.close();
  console.log('PASS: actual Postgres migration, per-user/global limits, in-flight/cooldown, UTC rollover, atomic bursts, private permissions and deletion-resistant global budget');
}
(async()=>{await handlerTests();await sqlTests()})().catch(error=>{console.error(error);process.exitCode=1});
