/* Real migration + Edge handlers + DOM contracts. No model calls or production writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const {stripTypeScriptTypes} = require('node:module');
const {PGlite} = require('@electric-sql/pglite');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const wait = () => new Promise(resolve => setTimeout(resolve, 25));
const user = '00000000-0000-4000-8000-000000000001';
const helper = stripTypeScriptTypes(read('supabase/functions/score-tracker-admin/vision-tiers.ts').replace(/^export /gm, ''));
const tiers = vm.runInNewContext(helper + '\nDEFAULT_VISION_TIERS');
const legacyTiers = [{name:'初用',min_exams:0,min_account_days:0,daily_limit:10},{name:'常用',min_exams:3,min_account_days:7,daily_limit:20}];
const serialize = value => JSON.parse(JSON.stringify(value));

async function sqlTests() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.score_tracker_users(id uuid primary key,created_at timestamptz not null);
    create table public.score_tracker_exams(id integer primary key,user_id uuid not null);
    create table public.score_tracker_scores(exam_id integer,user_id uuid,actual_score numeric,target_score numeric);
    create table public.score_tracker_ai_configs(id text primary key,enabled boolean not null,daily_limit integer not null,global_daily_limit integer not null,cooldown_seconds integer not null);
    insert into public.score_tracker_users values ('${user}',clock_timestamp());
    insert into public.score_tracker_ai_configs values ('score_vision',true,10,100,0);
  `);
  await db.exec(read('supabase/migrations/20260927213000_score_tracker_ai_usage_limits.sql'));
  await db.exec(read('supabase/migrations/20261012163740_tiered_vision_quota.sql'));
  await db.exec('grant usage on schema public to service_role; grant all on all tables in schema public to service_role;');
  const quota = async consume => (await db.query('select public.score_tracker_vision_quota($1,$2) as q', [user, !!consume])).rows[0].q;
  let q = await quota(false);
  assert.equal(q.limit,10); assert.equal(q.remaining,10); assert.equal(q.tier_name,'初用');
  assert.equal((await db.query('select count(*)::int as n from score_tracker_ai_usage')).rows[0].n,0);
  await quota(false);
  assert.equal((await db.query('select count(*)::int as n from score_tracker_ai_usage')).rows[0].n,0);
  console.log('PASS: migration defaults and repeated quota reads create no usage rows');

  await db.exec(`insert into score_tracker_exams select i,'${user}' from generate_series(1,25) i;
    insert into score_tracker_scores select i,'${user}',case when i<=3 then 0 else null end,120 from generate_series(1,25) i;
    update score_tracker_users set created_at=clock_timestamp()-interval '6 days 23 hours' where id='${user}';`);
  q = await quota(false); assert.equal(q.valid_exams,3); assert.equal(q.limit,10);
  await db.exec(`update score_tracker_users set created_at=clock_timestamp()-interval '7 days' where id='${user}'`);
  q = await quota(false); assert.equal(q.limit,20); assert.equal(q.next_tier.name,'深入');
  await db.exec('update score_tracker_scores set actual_score=95 where exam_id<=10');
  q = await quota(false); assert.equal(q.limit,20);
  await db.exec(`update score_tracker_users set created_at=clock_timestamp()-interval '14 days' where id='${user}'`);
  q = await quota(false); assert.equal(q.limit,35);
  await db.exec(`update score_tracker_users set created_at=clock_timestamp()-interval '30 days' where id='${user}'; update score_tracker_scores set actual_score=95 where exam_id<=20;`);
  q = await quota(false); assert.equal(q.limit,50); assert.equal(q.next_tier,null);
  console.log('PASS: zero counts as a score; empty/target-only exams do not; both thresholds are required at tier boundaries');

  q = await quota(true); assert.equal(q.used,1); assert.equal(q.remaining,49); assert.equal(q.consumed,true);
  await db.exec('update score_tracker_ai_configs set tier_enabled=false,daily_limit=3');
  q = await quota(false); assert.equal(q.limit,3); assert.equal(q.used,1); assert.equal(q.remaining,2);
  const submissions = await Promise.all(Array.from({length:12}, () => quota(true)));
  assert.equal(submissions.filter(x=>x.consumed).length,2);
  q = await quota(false); assert.equal(q.reason,'daily_limit'); assert.equal(q.remaining,0);
  assert.equal((await db.query("select request_count from score_tracker_ai_usage where scope='global'")).rows[0].request_count,3);
  await db.exec('update score_tracker_ai_configs set tier_enabled=true,global_daily_limit=4');
  q = await quota(true); assert.equal(q.consumed,true);
  q = await quota(true); assert.equal(q.reason,'global_limit'); assert.equal(q.used,4);
  await db.exec('update score_tracker_ai_configs set global_daily_limit=100,cooldown_seconds=60');
  q = await quota(true); assert.equal(q.reason,'cooldown'); assert.equal(q.used,4); assert(q.retry_after_seconds>0);
  await db.exec('update score_tracker_ai_configs set cooldown_seconds=0,enabled=false');
  q = await quota(true); assert.equal(q.reason,'vision_disabled'); assert.equal(q.used,4);
  await db.exec('update score_tracker_ai_configs set enabled=true,tier_enabled=false,daily_limit=4');
  const legacy = (await db.query(`select * from claim_score_tracker_ai_request('${user}',1000,10000,0)`)).rows[0];
  assert.equal(legacy.allowed,false); assert.equal(legacy.reason,'daily_limit');
  console.log('PASS: saved quota changes preserve usage; account/global caps, cooldown, disabled service and legacy calls enforce stored policy');

  await db.exec("update score_tracker_ai_usage set usage_date=usage_date-1");
  q = await quota(false); assert.equal(q.used,0); assert.equal(q.remaining,4);
  assert(new Date(q.resets_at).getTime()>Date.now());
  for (const invalid of [[], [{...legacyTiers[0],min_exams:1}], [{...legacyTiers[0],daily_limit:0}], [legacyTiers[0],{...legacyTiers[1],daily_limit:9}], [legacyTiers[0],{...legacyTiers[1],min_account_days:0,min_exams:0}], [{...legacyTiers[0],min_exams:null}]]) {
    await assert.rejects(db.query('update score_tracker_ai_configs set tier_rules=$1::jsonb', [JSON.stringify(invalid)]));
  }
  for (const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    await assert.rejects(quota(false), /permission denied/);
    await assert.rejects(db.query('select * from score_tracker_ai_usage'), /permission denied/);
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await quota(false)).used,0);
  await db.exec('reset role');
  await db.close();
  console.log('PASS: daily rollover, DB rule constraints and service-only RPC/usage permissions');
}

function edgeHarness(slug) {
  let handler, saved, providerCalls=0, consumed=0;
  const config = {enabled:true,beta_only:false,openrouter_api_key:'fixture-key',base_url:'https://model.test/v1',model:'vision-model',daily_limit:10,global_daily_limit:100,cooldown_seconds:0,tier_enabled:true,tier_rules:serialize(tiers)};
  const quota = {allowed:true,limit:10,used:0,remaining:10,global_remaining:100,service_enabled:true,retry_after_seconds:0,tier_name:'初用',tier_enabled:true,valid_exams:0,account_days:0,tiers:serialize(tiers),next_tier:serialize(tiers[1]),resets_at:'2099-01-01T00:00:00Z'};
  const db = {from(name) {
    return {select(){return this},eq(){return this},insert(){return this},update(){return this},then(resolve,reject){return Promise.resolve({data:null,error:null}).then(resolve,reject)},upsert(data){saved=data;Object.assign(config,data);return this},
      maybeSingle:async()=>({data:name==='score_tracker_users'?{id:user,username:'admin',is_admin:true,session_expires_at:'2099-01-01'}:name==='score_tracker_ai_configs'?config:null,error:null}),
      single:async()=>({data:config,error:null})};
  },rpc:async(name,args)=>{
    if(name==='score_tracker_vision_refund'){quota.used--;quota.remaining++;return {data:true,error:null};}
    assert(['score_tracker_vision_quota','score_tracker_vision_reserve'].includes(name));
    const claim=(args.p_consume||name==='score_tracker_vision_reserve')&&quota.allowed;
    if(claim){consumed++;quota.used++;quota.remaining--;}
    return {data:{...quota,consumed:!!claim},error:null};
  }};
  const context={Deno:{env:{get:()=>''},serve:fn=>handler=fn},createClient:()=>db,URL,Response,TextEncoder,crypto,AbortController,setTimeout,clearTimeout,console:{log(){},error(){}},fetch:async()=>{providerCalls++;return new Response(JSON.stringify({error:{message:'fixture failure'}}),{status:502})}};
  const source = (slug==='score-tracker-admin'?helper+'\n': ['reliability.ts','audit.ts'].map(p=>read('supabase/functions/score-tracker-vision-preview/'+p).replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'')).join('\n')+'\n') + read('supabase/functions/'+slug+'/index.ts').replace(/^import .*;\s*$/gm,'');
  vm.runInNewContext(stripTypeScriptTypes(source),context);
  return {config,quota,get saved(){return saved},get providerCalls(){return providerCalls},get consumed(){return consumed},call:body=>handler(new Request('https://test/?action='+(body.action||''),{method:'POST',headers:{'Content-Type':'application/json','x-score-token':'fixture-token'},body:JSON.stringify({token:'fixture-token',...body})}))};
}

async function edgeTests() {
  const h=edgeHarness('score-tracker-admin');
  let r=await h.call({action:'ai_config_save',tierEnabled:true,tierRules:[tiers[0],{...tiers[1],quota_limit:0}]});
  assert.equal(r.status,400); assert.equal(h.saved,undefined);
  r=await h.call({action:'ai_config_save',tierEnabled:false,tierRules:[{...tiers[0],quota_limit:'4',daily_limit:'4'},{name:'进阶',min_exams:'5',min_account_days:'10',quota_limit:'12',period:'month'}]});
  assert.equal(r.status,200); let data=await r.json(); assert.equal(data.tier_rules[1].daily_limit,12); assert.equal(data.tier_enabled,false); assert.equal(data.tier_rules[1].period,'month'); assert(!JSON.stringify(data).includes('fixture-key'));
  r=await h.call({action:'ai_config_save',model:'changed-model'}); assert.equal(r.status,200); assert.equal(h.saved.tier_enabled,false); assert.equal(h.saved.tier_rules[1].daily_limit,12);
  r=await h.call({action:'ai_config_save',tierRules:h.saved.tier_rules.map(r=>({name:r.name,min_exams:r.min_exams,min_account_days:r.min_account_days,daily_limit:r.quota_limit}))});assert.equal(r.status,200);assert.equal(h.saved.tier_rules[1].period,'month');
  console.log('PASS: real admin handler rejects invalid rules, masks Key, and preserves tiers for old/partial saves');

  const v=edgeHarness('score-tracker-vision-preview');
  r=await v.call({action:'quota'}); data=await r.json(); assert.equal(r.status,200); assert.equal(data.quota.remaining,10); assert.equal(v.consumed,0); assert.equal(v.providerCalls,0); assert(!JSON.stringify(data).includes('fixture-key'));
  r=await v.call({images:['bad image']}); assert.equal(r.status,400); assert.equal(v.consumed,0);
  v.quota.allowed=false;v.quota.reason='daily_limit';v.quota.remaining=0;
  r=await v.call({images:['data:image/png;base64,AAAA']}); data=await r.json();assert.equal(r.status,429);assert.equal(data.quota.remaining,0);assert.equal(v.providerCalls,0);
  r=await v.call({action:'connectivity_test'});assert.equal(r.status,429);assert.equal(v.providerCalls,0);
  for(const [period,text] of [['month','本月'],['week','本周'],['lifetime','一次性']]){v.quota.period=period;v.quota.reason='period_limit';r=await v.call({images:['data:image/png;base64,AAAA']});data=await r.json();assert.equal(r.status,429);assert(data.error.includes(text));assert.equal(data.quota.period,period);}
  v.quota.allowed=true;v.quota.remaining=1;
  r=await v.call({images:['data:image/png;base64,AAAA']});data=await r.json();assert.equal(r.status,502);assert.equal(data.quota.remaining,1);assert.equal(v.consumed,1);assert.equal(v.providerCalls,2);assert.equal(data.quota_refunded,true);
  r=await v.call({token:''});assert.equal(r.status,401);
  const invalid=edgeHarness('score-tracker-vision-preview');invalid.config.base_url='http://invalid.test';
  r=await invalid.call({images:['data:image/png;base64,AAAA']});assert.equal(r.status,503);assert.equal(invalid.consumed,0);assert.equal(invalid.providerCalls,0);
  const disabled=edgeHarness('score-tracker-vision-preview');disabled.config.enabled=false;disabled.quota.service_enabled=false;
  r=await disabled.call({action:'quota'});data=await r.json();assert.equal(r.status,200);assert.equal(data.enabled,false);assert.equal(disabled.consumed,0);
  const beta=edgeHarness('score-tracker-vision-preview');beta.config.beta_only=true;
  r=await beta.call({action:'quota'});data=await r.json();assert.equal(data.eligible,false);assert.equal(beta.consumed,0);
  r=await beta.call({images:['data:image/png;base64,AAAA']});assert.equal(r.status,403);assert.equal(beta.providerCalls,0);
  console.log('PASS: real quota endpoint is free/private; exhausted quota stops provider/ping; provider failures return updated remaining quota');
}

async function domTests() {
  const errors=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
  let cfg={enabled:true,beta_only:false,base_url:'https://model.test/v1',model:'vision-model',daily_limit:10,global_daily_limit:100,cooldown_seconds:0,tier_enabled:true,tier_rules:serialize(tiers)},posted;
  const html=vm.runInNewContext(read('api/mg-ui.js').replace('export const MG_HTML','const MG_HTML')+'\nMG_HTML');
  const dom=new JSDOM(html,{url:'https://test/mg?view=featurevotes',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,beforeParse(w){w.localStorage.setItem('st_admin_token','fixture');w.fetch=async(url,init)=>{
    const u=new URL(url,'https://test');assert.equal(u.pathname,'/mg');const action=u.searchParams.get('action');
    if(action==='feature_votes')return{ok:true,json:async()=>({options:[],users:[],suggestions:[],ai_config:cfg})};
    if(action==='ai_config_save'){posted=JSON.parse(init.body);cfg={...cfg,tier_enabled:posted.tierEnabled,tier_rules:posted.tierRules.map(r=>({...r,min_exams:Number(r.min_exams),min_account_days:Number(r.min_account_days),quota_limit:Number(r.quota_limit),daily_limit:Number(r.quota_limit)}))};}
    return{ok:true,json:async()=>({ok:true,is_admin:true,rows:[],metrics:{}})};
  }}});
  const w=dom.window;await wait();
  assert.equal(w.document.querySelectorAll('[data-vision-tier]').length,4);
  let input=w.document.querySelector('[data-vision-tier="1"] [data-tier-field="quota_limit"]');input.value='23';input.dispatchEvent(new w.Event('input'));
  const periodInput=w.document.querySelector('[data-vision-tier="0"] [data-tier-field="period"]');assert.equal(periodInput.value,'lifetime');periodInput.value='month';periodInput.dispatchEvent(new w.Event('change'));
  w.document.getElementById('aiVisionModel').value='edited-model';w.document.getElementById('aiVisionModel').dispatchEvent(new w.Event('input'));
  w.document.getElementById('aiVisionTierAdd').click();assert.equal(w.document.querySelectorAll('[data-vision-tier]').length,5);assert.equal(w.document.getElementById('aiVisionModel').value,'edited-model');
  assert.equal(w.document.querySelector('[data-vision-tier="0"] [data-tier-field="period"]').value,'month');
  w.document.querySelector('[data-tier-remove="4"]').click();
  assert.equal(w.document.querySelector('[data-vision-tier="1"] [data-tier-field="quota_limit"]').value,'23');
  await w.document.getElementById('aiVisionSave').onclick();assert.equal(posted.tierRules[1].quota_limit,'23');assert.equal(posted.tierRules[0].period,'month');assert.equal(posted.model,'edited-model');assert.equal(w.document.querySelectorAll('[data-vision-tier]').length,4);assert.deepEqual(errors,[]);w.close();
  console.log('PASS: admin DOM edits/adds/removes/saves tiers through /mg and preserves unsaved model/tier values across renders');

  let used=0,submissions=0,quotaReads=0,period='lifetime',limit=1;
  const entry=new JSDOM('<html><head></head><body></body></html>',{url:'https://test',runScripts:'outside-only',pretendToBeVisual:true});const e=entry.window;
  e.localStorage.setItem('st_token','fixture');e.state={user:{username:'test'},modal:null};
  e.openExam=()=>{const modal=e.document.createElement('div');modal.className='modal-backdrop';modal.innerHTML='<div class="modal-head"><h3>新建考试</h3><button class="close-btn">×</button></div><div class="modal-body"></div>';e.document.body.appendChild(modal);e.state.modal=modal;};
  const q=()=>({allowed:used<limit,reason:used>=limit?'period_limit':null,period,limit,used,remaining:Math.max(0,limit-used),global_remaining:100-used,service_enabled:true,tier_name:'新手',tier_enabled:true,valid_exams:0,account_days:1,tiers:[{name:'新手',min_exams:0,min_account_days:0,daily_limit:1},tiers[1]],next_tier:tiers[1],resets_at:period==='lifetime'?null:'2099-01-01T00:00:00Z',retry_after_seconds:0});
  e.__stVisionImages={prepare:async()=>({images:['data:image/png;base64,AAAA'],parts:[{source_index:0,kind:'original',part_index:0,part_count:1}],stats:[],total_bytes:3})};
  e.fetch=async(url,init)=>{const b=JSON.parse(init.body);if(b.action==='beta_status')return{ok:true,json:async()=>({enabled:true,beta_only:false})};if(b.action==='quota'){quotaReads++;return{ok:true,json:async()=>({enabled:true,eligible:true,quota:q()})};}if(b.action==='connectivity_test')return{ok:true,json:async()=>({ok:true})};submissions++;used++;return{ok:true,json:async()=>({exam:{name:'期中'},subjects:[{name:'数学',finalScore:120}],warnings:[],quota:q()})};};
  e.eval(read('natural-entry.js'));e.openExam();e.document.querySelector('.nl-entry-trigger').click();await wait();
  const files=e.document.querySelector('.nl-entry-files');Object.defineProperty(files,'files',{value:[{name:'成绩单.png',type:'image/png'}]});files.dispatchEvent(new e.Event('change'));
  assert(e.document.querySelector('.nl-entry-quota-count').textContent.includes('1 / 1'));
  await e.document.querySelector('.nl-entry-quota-refresh').onclick();assert.equal(submissions,0);assert.equal(used,0);assert(quotaReads>=2);
  const button=e.document.querySelector('.nl-entry-vision-submit');await button.onclick();assert.equal(submissions,1);assert(e.document.querySelector('.nl-entry-quota-count').textContent.includes('0 / 1'));assert.equal(button.textContent,'确认并填入');assert.equal(button.disabled,false);
  files.dispatchEvent(new e.Event('change'));assert.equal(button.disabled,true);await button.onclick();assert.equal(submissions,1);
  used=0;await e.document.querySelector('.nl-entry-quota-refresh').onclick();assert.equal(button.disabled,false);
  assert(e.document.querySelector('.nl-entry-quota-note').textContent.includes('不自动恢复'));
  for(const cycle of ['month','week','day']){period=cycle;limit=cycle==='month'?5:cycle==='week'?10:20;await e.document.querySelector('.nl-entry-quota-refresh').onclick();assert(e.document.querySelector('.nl-entry-quota-count').textContent.includes(({month:'本月',week:'本周',day:'今日'})[cycle]+'剩余'));}
  e.close();console.log('PASS: entry shows/refreshes remaining quota, allows last result confirmation at zero, blocks another recognition, and recovers after refresh');
}

(async()=>{await sqlTests();await edgeTests();await domTests();})().catch(error=>{console.error(error);process.exitCode=1;});
