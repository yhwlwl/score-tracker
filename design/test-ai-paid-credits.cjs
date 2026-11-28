// Isolated PostgreSQL + JSDOM tests for paid AI credits, redeem codes, calibrated level curve, and UI.
const {PGlite}=require('@electric-sql/pglite');
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');

const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const wait=()=>new Promise(r=>setTimeout(r,30));

async function testSql(){
 const db=new PGlite();
 let checks=0;
 const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
 const sql=(s,p=[])=>db.query(s,p).then(r=>r.rows);
 const rpc=(name,...args)=>sql(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) v`,args).then(r=>r[0].v);
 const uid='00000000-0000-4000-8000-000000000101';
 const admin='00000000-0000-4000-8000-000000000102';
 const veteran='00000000-0000-4000-8000-000000000103';
 const exam1='00000000-0000-4000-8000-000000000201';
 const exam2='00000000-0000-4000-8000-000000000202';

 try{
  await db.exec(`
   create role anon;create role authenticated;create role service_role bypassrls;
   grant usage on schema public to service_role,anon,authenticated;
   create table score_tracker_users(id uuid primary key,created_at timestamptz default now(),is_admin boolean default false);
   create table score_tracker_exams(id uuid primary key,user_id uuid,exam_date date,created_at timestamptz default now(),total_actual_score numeric,reflection text,reflection_updated_at timestamptz);
   create table score_tracker_scores(user_id uuid,exam_id uuid,actual_score numeric,max_score numeric);
   create table score_tracker_user_goals(user_id uuid,total_goal numeric,dream_school text,subject_goals jsonb,updated_at timestamptz);
   create table score_tracker_paper_reviews(request_id uuid primary key,user_id uuid,draft_id uuid,exam_id uuid,subject text,fingerprint text,options jsonb,status text default 'running',result jsonb,corrections jsonb,created_at timestamptz default now());
   create table score_tracker_paper_usage(usage_date date,scope text,request_count integer,last_requested_at timestamptz,primary key(usage_date,scope));
   create table score_tracker_feature_votes(user_id uuid,created_at timestamptz);
   create table score_tracker_feedback_submissions(id uuid primary key default gen_random_uuid(),user_id uuid,status text,created_at timestamptz default now());
   create table score_tracker_visit_logs(user_id uuid,event_type text,metadata jsonb,occurred_at timestamptz default now());
   grant select on all tables in schema public to service_role;
  `);
  for(const f of [
   '20261115060104_account_growth_ai_credits.sql',
   '20261122121519_configurable_ai_monthly_budget.sql',
   '20261122121811_ai_manual_reservation_release_state.sql',
  ]){
   await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/'+f),'utf8'));
  }

  // Create a veteran evaluated under old rules at Lv.8 (280 pts, 0 reg days) BEFORE applying new migration.
  await sql('insert into score_tracker_users(id,is_admin) values($1,false),($2,true),($3,false)',[uid,admin,veteran]);
  await sql("insert into score_tracker_exams(id,user_id,exam_date,total_actual_score) values($1,$2,current_date,100),($3,$4,current_date,90)",[exam1,uid,exam2,veteran]);
  await rpc('score_tracker_ai_opening_budget',admin,0);
  await sql('update score_tracker_ai_policy set enabled=true');
  await rpc('score_tracker_ai_account',veteran);
  await sql('update score_tracker_growth_accounts set points=300,last_refresh_at=null where user_id=$1',[veteran]);
  eq((await rpc('score_tracker_ai_account',veteran)).growth.level,8,'veteran reaches Lv.8 under old curve');

  // Now apply the new migration.
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261128030000_ai_paid_credits_and_level_curve.sql'),'utf8'));
  eq(await rpc('score_tracker_ai_release_ready'),true);

  // 1. Veteran keeps Lv.8 (never demoted).
  await sql('update score_tracker_growth_accounts set last_refresh_at=null where user_id=$1',[veteran]);
  eq((await rpc('score_tracker_ai_account',veteran)).growth.level,8,'veteran keeps Lv.8 after curve calibration');

  // 2. New user curve calibration: 130 pts stays Lv.2 (Lv.3 requires 150), 200 pts with 0 days stays Lv.3 (Lv.4 requires 7 days).
  let a=await rpc('score_tracker_ai_account',uid);
  eq(a.growth.points,110);eq(a.growth.level,2);
  await sql('update score_tracker_growth_accounts set points=140,last_refresh_at=null where user_id=$1',[uid]);
  eq((await rpc('score_tracker_ai_account',uid)).growth.level,2,'140 pts stays Lv.2 under new Lv.3=150 threshold');
  await sql('update score_tracker_growth_accounts set points=260,last_refresh_at=null where user_id=$1',[uid]);
  eq((await rpc('score_tracker_ai_account',uid)).growth.level,3,'260 pts with 0 reg days capped at Lv.3');
  await sql("update score_tracker_users set created_at=now()-interval '8 days' where id=$1",[uid]);
  await sql('update score_tracker_growth_accounts set last_refresh_at=null where user_id=$1',[uid]);
  eq((await rpc('score_tracker_ai_account',uid)).growth.level,4,'8 reg days unlocks Lv.4');

  // 3. Default top-up packs seeded & exposed in account payload.
  eq(a.topup.packs.map(p=>[p.code,Number(p.price_cny),p.credits]),[['pack_1',1,500],['pack_3',3,1650],['pack_10',9.9,6000]]);

  // 4. Redeem code lifecycle: valid, duplicate/used, disabled, expired, rate-limit.
  const batchId=crypto.randomUUID();
  const code1Hash=sha('STABCD2345EFGH');
  const codeDisabledHash=sha('STDISABLED1234');
  const codeExpiredHash=sha('STEXPIRED12345');
  await sql(`insert into score_tracker_ai_redeem_codes(code_hash,code_prefix,pack_code,credits,amount_cny,batch_id,batch_note,max_uses,disabled,expires_at)
    values($1,'ST-ABCD','pack_1',500,1.00,$4,'batch1',1,false,null),
          ($2,'ST-DISA','pack_1',500,1.00,$4,'disabled',1,true,null),
          ($3,'ST-EXPI','pack_1',500,1.00,$4,'expired',1,false,now()-interval '1 minute')`,
    [code1Hash,codeDisabledHash,codeExpiredHash,batchId]);

  const redeemed=await rpc('score_tracker_ai_redeem_code',uid,code1Hash);
  eq(redeemed.ok,true);eq(redeemed.credits,500);eq(Number(redeemed.account.credits.paid_balance),500);
  eq((await rpc('score_tracker_ai_redeem_code',uid,code1Hash)).code,'code_used');
  eq((await rpc('score_tracker_ai_redeem_code',uid,codeDisabledHash)).code,'code_disabled');
  eq((await rpc('score_tracker_ai_redeem_code',uid,codeExpiredHash)).code,'code_expired');

  // 3 more invalid attempts -> total 5 failures in 10 min -> 6th attempt rate_limited.
  for(let i=0;i<2;i++)eq((await rpc('score_tracker_ai_redeem_code',uid,sha('BADCODE'+i))).code,'invalid_code');
  eq((await rpc('score_tracker_ai_redeem_code',uid,sha('BADCODE_BLOCKED'))).code,'rate_limited');

  // 5. Paid balance does NOT block monthly free grants and is not trimmed by cap.
  await sql("update score_tracker_ai_wallets set balance=0,paid_balance=10000,grant_month=(date_trunc('month',now() at time zone 'Asia/Shanghai')-interval '1 month')::date,grant_allowance=400 where user_id=$1",[uid]);
  await sql("delete from score_tracker_ai_grants where user_id=$1 and grant_key like 'month:%'",[uid]);
  a=await rpc('score_tracker_ai_account',uid);
  eq(Number(a.credits.free_balance),650,'Lv.4 monthly free grant still granted despite 10,000 paid credits');
  eq(Number(a.credits.paid_balance),10000);
  eq(Number(a.credits.available),10650);

  // 6. Priority spend: 10 free + 500 paid, 13-credit task consumes 10 free + 3 paid.
  await sql('update score_tracker_ai_wallets set balance=10,held=0,paid_balance=500,paid_held=0 where user_id=$1',[uid]);
  let tid=crypto.randomUUID();
  const started=await rpc('score_tracker_ai_task_start',uid,tid,'vision',13,150);
  eq(started.allowed,true);eq(Number(started.held_free),10);eq(Number(started.held_paid),140);eq(started.budget_bypass,false);
  eq((await rpc('score_tracker_ai_call_reserve',uid,tid,'call-mix','deepseek-v4-flash',8192)).allowed,true);
  await rpc('score_tracker_ai_call_settle',uid,'call-mix',JSON.stringify({prompt_tokens:3460,completion_tokens:662}),'req-mix',200);
  const fin=await rpc('score_tracker_ai_task_finish',uid,tid,true);
  eq(Number(fin.charged),13);eq(Number(fin.charged_free),10);eq(Number(fin.charged_paid),3);
  a=await rpc('score_tracker_ai_account',uid);
  eq(Number(a.credits.free_balance),0);eq(Number(a.credits.paid_balance),497);eq(Number(a.credits.held),0);

  // 7. Failed task releases both free and paid holds without charging.
  await sql("update score_tracker_ai_tasks set created_at=now()-interval '30 seconds'");
  await sql('update score_tracker_ai_wallets set balance=5,paid_balance=200 where user_id=$1',[uid]);
  tid=crypto.randomUUID();
  await rpc('score_tracker_ai_task_start',uid,tid,'vision',13,150);
  await rpc('score_tracker_ai_call_reserve',uid,tid,'call-fail','deepseek-v4-flash',8192);
  await rpc('score_tracker_ai_call_settle',uid,'call-fail',JSON.stringify({prompt_tokens:1000,completion_tokens:500}),'req-fail',200);
  eq(Number((await rpc('score_tracker_ai_task_finish',uid,tid,false)).charged),0);
  a=await rpc('score_tracker_ai_account',uid);
  eq(Number(a.credits.free_balance),5);eq(Number(a.credits.paid_balance),200);eq(Number(a.credits.held),0);

  // 8. 45-min expiry releases both free and paid holds.
  await sql("update score_tracker_ai_tasks set created_at=now()-interval '30 seconds'");
  tid=crypto.randomUUID();
  await rpc('score_tracker_ai_task_start',uid,tid,'vision',13,150);
  await sql("update score_tracker_ai_tasks set created_at=now()-interval '50 minutes' where id=$1",[tid]);
  a=await rpc('score_tracker_ai_account',uid);
  eq(Number(a.credits.free_held),0);eq(Number(a.credits.paid_held),0);

  // 9. Site budget paused isolation: free-only user blocked with site_budget; paid user bypasses & succeeds.
  await sql("update score_tracker_ai_tasks set created_at=now()-interval '30 seconds'");
  await sql('update score_tracker_ai_policy set hard_limit_cny=0.0001');
  await sql('update score_tracker_ai_wallets set balance=500,paid_balance=0 where user_id=$1',[veteran]);
  eq((await rpc('score_tracker_ai_task_start',veteran,crypto.randomUUID(),'vision',13,150)).reason,'site_budget');

  tid=crypto.randomUUID();
  const paidStart=await rpc('score_tracker_ai_task_start',uid,tid,'vision',13,150);
  eq(paidStart.allowed,true);eq(paidStart.budget_bypass,true);eq(Number(paidStart.held_free),0);eq(Number(paidStart.held_paid),150);
  eq((await rpc('score_tracker_ai_call_reserve',uid,tid,'call-bypass','deepseek-v4-flash',8192)).allowed,true);
  await rpc('score_tracker_ai_call_settle',uid,'call-bypass',JSON.stringify({prompt_tokens:3460,completion_tokens:662}),'req-bypass',200);
  const bypassFin=await rpc('score_tracker_ai_task_finish',uid,tid,true);
  eq(Number(bypassFin.charged_free),0);eq(Number(bypassFin.charged_paid),13);
  await sql('update score_tracker_ai_policy set hard_limit_cny=20');

  // 10. Unified admin_grant topup: idempotency, forbidden for non-admin, negative guard.
  await sql("update score_tracker_ai_tasks set created_at=now()-interval '30 seconds'");
  const sqTask=crypto.randomUUID();
  eq((await rpc('score_tracker_ai_task_start',uid,sqTask,'study_question',15,150)).allowed,true,'study_question remains supported');
  eq((await rpc('score_tracker_ai_task_finish',uid,sqTask,false)).finished,true);
  await assert.rejects(()=>rpc('score_tracker_ai_credit_topup',uid,'admin_grant','admin:unauth',100,0,null,'nope',uid),/forbidden/);checks++;
  const g1=await rpc('score_tracker_ai_credit_topup',uid,'admin_grant','admin:same-1',300,0,null,'comp',admin);
  eq(g1.duplicate,false);
  const g2=await rpc('score_tracker_ai_credit_topup',uid,'admin_grant','admin:same-1',300,0,null,'comp',admin);
  eq(g2.duplicate,true);eq(Number(g2.paid_balance),Number(g1.paid_balance));
  await assert.rejects(()=>rpc('score_tracker_ai_credit_topup',uid,'admin_grant','admin:over-deduct',-999999,0,null,'too much',admin),/insufficient_paid_balance/);checks++;

  // 11. Security invariants: zero SECURITY DEFINER, zero anon/authenticated access on new tables/RPCs.
  eq((await sql("select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and (proname like 'score_tracker_ai_%' or proname like 'score_tracker_growth_%') and prosecdef"))[0].n,0);
  await assert.rejects(()=>db.exec('set role anon;select * from score_tracker_ai_redeem_codes;'),/permission denied/);await db.exec('reset role');checks++;
  await assert.rejects(()=>db.exec(`set role authenticated;select score_tracker_ai_redeem_code('${uid}','${code1Hash}');`),/permission denied/);await db.exec('reset role');checks++;
  console.log(`Paid AI credits & level curve SQL: ${checks} assertions passed (isolated PostgreSQL).`);
 } finally {
  await db.close();
 }
}

async function testUi(){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const acct={
  enabled:true,budget_status:'available',
  growth:{level:2,points:110,valid_exams:1,active_months:1,registered_days:2,levels:[{level:1,threshold:0,monthly_credits:0},{level:2,threshold:50,monthly_credits:400},{level:3,threshold:150,monthly_credits:500}],features:[{feature:'record',points:30,earned:true}]},
  credits:{balance:5,held:0,available:5,free_balance:5,free_held:0,free_available:5,paid_balance:0,paid_held:0,paid_available:0,monthly:400,cap:3000,welcome:150},
  topup:{enabled:true,shop_url:'https://afdian.com/item/demo',notice:'付款后自动发放兑换码',packs:[{code:'pack_1',name:'1 元应急包',price_cny:1,credits:500,tag:''},{code:'pack_3',name:'3 元学期包',price_cny:3,credits:1650,tag:'推荐'}]}
 };

 const dom=new JSDOM('<html><head></head><body><main></main></body></html>',{url:'https://fixture.test',runScripts:'dangerously',virtualConsole:vc});
 const w=dom.window;
 w.state={token:'tok-1',page:'account',modal:null};
 w.accountHtml=()=>'<div class="account-chip">学生</div><div class="username-origin-v19">原始用户名</div>';
 w.bindPage=()=>{};w.dataApiV7=async()=>({ok:true});
 const reqs=[];
 w.fetch=async(url,init)=>{
  const body=JSON.parse(init.body);reqs.push(body);
  if(body.action==='account_status')return {ok:true,json:async()=>({account:structuredClone(acct)})};
  if(body.action==='account_topups')return {ok:true,json:async()=>({topups:[{channel:'redeem_code',credits:500,amount_cny:1,note:'批次1',created_at:'2026-11-28T00:00:00Z'}]})};
  if(body.action==='redeem_ai_code'){
   acct.credits.paid_balance=500;acct.credits.paid_available=500;acct.credits.available=505;
   return {ok:true,json:async()=>({ok:true,credits:500,pack_code:'pack_1',account:structuredClone(acct)})};
  }
  return {ok:true,json:async()=>({usage:[]})};
 };
 w.eval(fs.readFileSync(path.join(__dirname,'../account-growth.js'),'utf8'));
 w.document.querySelector('main').innerHTML=w.accountHtml();w.bindPage();await wait();
 assert(w.document.querySelector('#accountGrowth').textContent.includes('当前可用 AI 积分不足（开始识图需至少 13 分）'),'low credit warning shown');
 assert(w.document.querySelector('.ag-topup-btn'),'topup button shown when topup.enabled');

 // Open modal, verify shop link + packs + redeem flow
 w.document.querySelector('.ag-topup-btn').click();
 assert(w.document.querySelector('.ag-shop-link').href==='https://afdian.com/item/demo');
 assert.equal(w.document.querySelectorAll('.ag-pack').length,2);
 w.document.querySelector('#agRedeemCodeInput').value='ST-ABCD-2345-EFGH';
 w.document.querySelector('.ag-code-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await wait();
 assert(w.document.querySelector('.ag-code-status').textContent.includes('+500'));
 assert(w.document.querySelector('.ag-wallet').textContent.includes('505'));
 assert(w.document.querySelector('.ag-wallet').textContent.includes('补充积分'));

 // Topup history button
 w.document.querySelector('.ag-topup-history').click();await wait();
 assert(w.document.querySelector('.ag-history').textContent.includes('兑换码')&&w.document.querySelector('.ag-history').textContent.includes('+500'));

 // Admin UI: budget save includes topup fields + redeem generate + manual grant
 const html=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/mg-ui.js'),'utf8').replace('export const MG_HTML','const MG_HTML')+';MG_HTML');
 const adminCalls=[];
 const adm=new JSDOM(html,{url:'https://fixture.test/mg?view=vision',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(aw){
  aw.localStorage.setItem('st_admin_token','fixture');
  aw.fetch=async(url,init)=>{
   const action=new URL(url,'https://fixture.test').searchParams.get('action');
   adminCalls.push({action,body:init.body&&JSON.parse(init.body)});
   if(action==='ai_config')return {ok:true,json:async()=>({enabled:true,configured:true,beta_only:false,tier_rules:[]})};
   if(action==='ai_budget')return {ok:true,json:async()=>({policy:{enabled:true,warning_cny:15,hard_limit_cny:20,cost_multiplier:1,topup_enabled:false,topup_shop_url:'',topup_notice:''},budget:{spent_cny:1,reserved_cny:0},opening_required:false,unresolved:[]})};
   if(action==='ai_redeem_codes')return {ok:true,json:async()=>({codes:[],orders:[],packs:[{code:'pack_1',name:'1 元应急包',price_cny:1,credits:500}]})};
   if(action==='ai_redeem_generate')return {ok:true,json:async()=>({ok:true,codes:['ST-1111-2222-3333','ST-4444-5555-6666']})};
   return {ok:true,json:async()=>({ok:true})};
  };
 }});
 await wait();adm.window.document.querySelector('[data-vision-tab="settings"]').click();await wait();
 const d=adm.window.document;
 d.querySelector('#aiTopupEnabled').checked=true;
 d.querySelector('#aiTopupShopUrl').value='https://afdian.com/item/demo';
 d.querySelector('#aiTopupNotice').value='自动发卡';
 d.querySelector('#aiBudgetSave').click();await wait();
 const saved=adminCalls.find(c=>c.action==='ai_budget_save');
 assert.equal(saved.body.topup_enabled,true);
 assert.equal(saved.body.topup_shop_url,'https://afdian.com/item/demo');
 assert.equal(saved.body.topup_notice,'自动发卡');

 d.querySelector('#aiRedeemCount').value='2';
 d.querySelector('#aiRedeemNote').value='测试批次';
 d.querySelector('#aiRedeemGenerate').click();await wait();
 assert(d.querySelector('#aiRedeemGenerated').value.includes('ST-1111-2222-3333'));

 d.querySelector('#aiPaidGrantUser').value='alice';
 d.querySelector('#aiPaidGrantCredits').value='500';
 d.querySelector('#aiPaidGrantNote').value='掉单补发';
 d.querySelector('#aiPaidGrantSubmit').click();await wait();
 const granted=adminCalls.find(c=>c.action==='ai_paid_grant');
 assert.equal(granted.body.username,'alice');
 assert.equal(granted.body.credits,500);

 assert.deepEqual(errors,[]);
 w.close();adm.window.close();

 // Vision modal (natural-entry.js): low credits (<13) shows clear warning + topup button, redeeming refreshes quota and unblocks submit.
 const entry=new JSDOM('<html><head></head><body></body></html>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const ew=entry.window;
 ew.localStorage.setItem('st_token','tok-1');
 ew.state={token:'tok-1',page:'home',user:{username:'student'},modal:null};
 ew.accountHtml=()=>'<div class="username-origin-v19"></div>';
 ew.bindPage=()=>{};ew.dataApiV7=async()=>({ok:true});
 ew.openExam=()=>{const m=ew.document.createElement('div');m.className='modal-backdrop';m.innerHTML='<div class="modal-head"><h3>新建考试</h3><button class="close-btn">×</button></div><div class="modal-body"></div>';ew.document.body.appendChild(m);ew.state.modal=m;};
 let creditRemaining=5,paidRemaining=0,budgetPaused=false;
 ew.fetch=async(url,init)=>{
  const b=JSON.parse(init.body);
  if(b.action==='beta_status')return {ok:true,json:async()=>({enabled:true,beta_only:false})};
  if(b.action==='quota')return {ok:true,json:async()=>({enabled:true,eligible:true,quota:{unit:'credits',service_enabled:true,remaining:creditRemaining,free_remaining:5,paid_remaining:paidRemaining,global_remaining:budgetPaused&&paidRemaining<13?0:1,budget_paused:budgetPaused,topup:{enabled:true,shop_url:'https://afdian.com/item/demo',notice:'',packs:[{code:'pack_1',name:'1 元应急包',price_cny:1,credits:500,tag:''}]}}})};
  if(b.action==='redeem_ai_code'){
   creditRemaining=505;paidRemaining=500;
   return {ok:true,json:async()=>({ok:true,credits:500,pack_code:'pack_1',account:{enabled:true,budget_status:budgetPaused?'paused':'available',growth:{level:2,points:110,valid_exams:1,active_months:1,registered_days:2,levels:[],features:[]},credits:{balance:5,held:0,available:505,free_balance:5,free_held:0,free_available:5,paid_balance:500,paid_held:0,paid_available:500,monthly:400,cap:3000,welcome:150},topup:{enabled:true,shop_url:'https://afdian.com/item/demo',notice:'',packs:[]}}})};
  }
  return {ok:true,json:async()=>({ok:true})};
 };
 ew.eval(fs.readFileSync(path.join(__dirname,'../account-growth.js'),'utf8'));
 ew.eval(fs.readFileSync(path.join(__dirname,'../natural-entry.js'),'utf8'));
 ew.openExam();ew.document.querySelector('.nl-entry-trigger').click();await wait();
 const files=ew.document.querySelector('.nl-entry-files');
 Object.defineProperty(files,'files',{value:[{name:'成绩单.png',type:'image/png'}]});
 files.dispatchEvent(new ew.Event('change'));
 assert(ew.document.querySelector('.nl-entry-quota-note').textContent.includes('可用积分不足（开始识图需至少 13 分）'),'vision modal shows explicit low-credit warning');
 assert.equal(ew.document.querySelector('.nl-entry-vision-submit').disabled,true,'vision submit disabled when <13 credits');
 const topupBtn=ew.document.querySelector('.nl-entry-quota-topup');
 assert.equal(topupBtn.hidden,false,'inline topup button visible');
 assert(topupBtn.classList.contains('is-emphasis'),'inline topup button emphasized when credits low');
 topupBtn.click();
 ew.document.querySelector('#agRedeemCodeInput').value='ST-ABCD-2345-EFGH';
 ew.document.querySelector('.ag-code-form').dispatchEvent(new ew.Event('submit',{cancelable:true}));
 await wait();await wait();
 assert(ew.document.querySelector('.nl-entry-quota-count').textContent.includes('可用 505 AI 积分（含补充 500 分）'),'vision modal quota refreshed inline');
 assert.equal(ew.document.querySelector('.nl-entry-vision-submit').disabled,false,'vision submit unblocked after redeeming code');
 assert.deepEqual(errors,[]);
 ew.close();
 console.log('PASS: account-growth top-up modal, low-credit warning, vision inline top-up flow, and admin redeem generator UI.');
}

(async()=>{await testSql();await testUi();})().catch(e=>{console.error(e);process.exitCode=1;});
