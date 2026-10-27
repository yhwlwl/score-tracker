/* Compare every existing metric/sort to the old RPC, then exercise cache changes,
 * the real Edge users handler and the existing users UI. Fixture database only.
 * Requires @electric-sql/pglite and jsdom; run: node design/test-admin-users-loading.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto').webcrypto,{stripTypeScriptTypes}=require('node:module');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration1=read('supabase/migrations/20261013150413_admin_users_page_bounded_aggregation.sql');
const migration2=read('supabase/migrations/20261013150441_admin_users_page_cached_activity.sql');
const migration3=read('supabase/migrations/20261013152125_admin_users_exact_activity_metrics.sql');
const migration4=read('supabase/migrations/20261013152156_admin_users_cached_metrics_page.sql');
const tick=()=>new Promise(r=>setTimeout(r,250));
async function run(){
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table score_tracker_users(id uuid primary key,username text,original_username text,is_admin bool,created_at timestamptz,updated_at timestamptz,depth_score int);
    create table score_tracker_visit_logs(id bigint primary key,user_id uuid,session_id text,occurred_at timestamptz);
    create index logs_user_time on score_tracker_visit_logs(user_id,occurred_at desc);
    create index logs_covering on score_tracker_visit_logs(user_id,session_id,occurred_at desc,id);
    create table score_tracker_exams(id uuid primary key,user_id uuid,exam_date date);
    create index exams_user on score_tracker_exams(user_id);
    create table score_tracker_scores(id bigint,user_id uuid,exam_id uuid,subject text,actual_score numeric,target_score numeric);
    create index scores_user on score_tracker_scores(user_id);
    create table score_tracker_feedback_submissions(id bigint,user_id uuid,created_at timestamptz);
    create index feedback_user on score_tracker_feedback_submissions(user_id);
    insert into score_tracker_users select md5(i::text)::uuid,'user-'||lpad(i::text,3,'0'),'original-'||i,i>60,'2026-08-01','2026-10-01',case when i=1 then null else (i*7)%101 end from generate_series(1,62)i;
    update score_tracker_users set username='<img src=x onerror=alert(1)>' where id=md5('3')::uuid;
    insert into score_tracker_visit_logs select i,case when i%13=0 then null else md5(((i%45)+1)::text)::uuid end,
      case when i%11=0 then null when i%17=0 then '' else 's-'||(i%137) end,
      case when i%19=0 then null else '2026-09-28T15:59:00Z'::timestamptz+(i%120)*interval '1 minute' end from generate_series(1,2000)i;
    insert into score_tracker_exams select md5(('exam-'||i))::uuid,md5(((i%59)+1)::text)::uuid,'2026-10-01' from generate_series(1,200)i;
    insert into score_tracker_scores select i,md5(((i%59)+1)::text)::uuid,md5(('exam-'||((i%200)+1)))::uuid,
      case when i%23=0 then null else 'subject-'||(i%5) end,case when i%7=0 then null else i%100 end,case when i%13=0 then null else 100 end from generate_series(1,1300)i;
    insert into score_tracker_feedback_submissions select i,md5(((i%59)+1)::text)::uuid,'2026-10-01' from generate_series(1,150)i;`);
  const legacy=read('supabase/migrations/20260829111026_score_tracker_depth_score_v2.sql');
  const start=legacy.indexOf('create or replace function public.score_tracker_admin_users_page(');
  const end=legacy.indexOf('$$;',legacy.indexOf('as $$',start))+3;
  await db.exec(legacy.slice(start,end).replace('score_tracker_admin_users_page(','score_tracker_admin_users_page_reference('));
  const logsBefore=(await db.query('select count(*)::int n from score_tracker_visit_logs')).rows[0].n;
  await db.exec(migration1);await db.exec(migration2);await db.exec(migration3);
  await db.exec("begin;insert into score_tracker_visit_logs values(8900,md5('3')::uuid,'before-backfill','2026-10-13')");
  const interim=(await db.query("select events,sessions,days from score_tracker_admin_user_activity where user_id=md5('3')::uuid")).rows[0];
  assert.deepEqual(interim,(await db.query("select count(*) as events,count(distinct session_id)as sessions,count(distinct(occurred_at at time zone 'Asia/Shanghai')::date)as days from score_tracker_visit_logs where user_id=md5('3')::uuid")).rows[0]);
  await db.exec('rollback');await db.exec(migration4);
  assert.equal((await db.query('select count(*)::int n from score_tracker_visit_logs')).rows[0].n,logsBefore);
  const page=async(args=[],reference=false)=>(await db.query('select * from '+(reference?'score_tracker_admin_users_page_reference':'score_tracker_admin_users_page')+'($1,$2,$3,$4,$5,$6,$7)',[50,0,null,'last_seen','desc',null,null].map((v,i)=>args[i]===undefined?v:args[i]))).rows;
  async function compare(args){assert.deepEqual(await page(args),await page(args,true));}
  for(const sort of ['username','last_seen','depth_score','exam_count','actual_exams','score_rows','sessions','events','days','feedback_count'])for(const order of ['asc','desc'])for(const activity of [null,'active','none'])await compare([17,5,null,sort,order,null,activity]);
  for(const depth of ['new','casual','returning','engaged','power','unknown'])await compare([100,0,null,'last_seen','desc',depth,null]);
  for(const search of ['original-3','user-0','   ',(await db.query("select md5('6')::uuid id")).rows[0].id,'no-such-user'])await compare([100,0,search]);
  await compare([0,-5]);await compare([1000,10000]);
  const first=await page([10,0]),second=await page([10,10]);assert.equal(first[0].total_count,60);assert(!first.some(r=>second.some(x=>x.id===r.id)));assert.equal(Object.keys(first[0]).length,17);
  console.log('PASS: all 17 fields, 10 sort keys, both directions, search/original ID, filters and pagination match the old exact RPC');

  await db.exec(`insert into score_tracker_visit_logs values(9000,md5('1')::uuid,'new-session','2026-10-12'),(9001,md5('2')::uuid,'new-session','2026-10-13'),(9002,md5('1')::uuid,'late-old-session','2025-01-01');`);
  await compare([]);assert.equal((await page([1,0]))[0].username,'user-002');
  await db.exec("update score_tracker_visit_logs set user_id=md5('4')::uuid,occurred_at='2026-10-14' where id=9001");await compare([]);assert.equal((await page([1,0]))[0].username,'user-004');
  await db.exec('delete from score_tracker_visit_logs where id in(9000,9001)');await compare([]);
  await db.exec("delete from score_tracker_visit_logs where user_id=md5('1')::uuid");await compare([50,0,null,'last_seen','desc',null,'none']);
  // A newer live recomputation must beat an older backfill snapshot, even when
  // deleting/moving the latest event lowers the last_seen rather than raises it.
  await db.exec("update score_tracker_admin_user_activity set changed_at=clock_timestamp()+interval '1 day' where user_id=md5('2')::uuid");
  const protectedRow=(await db.query("select * from score_tracker_admin_user_activity where user_id=md5('2')::uuid")).rows[0];
  await db.exec(migration4.slice(0,migration4.indexOf('create or replace function')));
  assert.deepEqual((await db.query("select * from score_tracker_admin_user_activity where user_id=md5('2')::uuid")).rows[0],protectedRow);
  await compare([]);
  await db.exec("insert into score_tracker_visit_logs values(9002,md5('2')::uuid,'upsert-session','2026-10-13'),(9003,md5('1')::uuid,'upsert-session','2026-10-14') on conflict(id) do update set user_id=excluded.user_id,session_id=excluded.session_id,occurred_at=excluded.occurred_at");await compare([]);
  for(const sort of ['sessions','events','days'])for(const order of ['asc','desc'])await compare([100,0,null,sort,order]);
  await db.exec("insert into score_tracker_visit_logs values(9003,md5('1')::uuid,'ignored','2026-10-15') on conflict(id)do nothing");await compare([]);
  await db.exec("insert into score_tracker_users values(md5('63')::uuid,'new-account',null,false,'2026-10-13','2026-10-13',0)");
  await compare([1,0,(await db.query("select md5('63')::uuid id")).rows[0].id]);
  await db.exec("insert into score_tracker_visit_logs values(9004,md5('63')::uuid,'first-session','2026-10-13')");await compare([]);
  await db.exec("delete from score_tracker_users where id=md5('63')::uuid");
  assert.equal((await db.query("select count(*)::int n from score_tracker_admin_user_activity where user_id=md5('63')::uuid")).rows[0].n,0);
  await db.exec('delete from score_tracker_visit_logs where id=9004');await compare([]);
  console.log('PASS: bulk insert, old timestamps, reassignments, timestamp edits, latest/all-log deletions and backfill version protection stay exact');

  await db.exec('grant usage on schema public to service_role;grant all on all tables in schema public to service_role');
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(page(),/permission denied/);await assert.rejects(db.query('select * from score_tracker_admin_user_activity'),/permission denied/);await assert.rejects(db.query("select score_tracker_refresh_admin_user_activity(md5('1')::uuid)"),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');assert.equal((await page())[0].total_count,60);await db.exec('reset role');
  console.log('PASS: cache and RPC remain service-only, without SECURITY DEFINER or public policies');

  let handler,allowed=true,rpcCalls=0;
  const mockDb={from(){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:allowed?{id:'admin',username:'admin',is_admin:true,session_expires_at:'2099-01-01'}:null,error:null})}},rpc:async(name,b)=>{rpcCalls++;assert.equal(name,'score_tracker_admin_users_page');return{data:await page([b.p_limit,b.p_offset,b.p_search,b.p_sort,b.p_order,b.p_depth_level,b.p_activity]),error:null}}};
  vm.runInNewContext(stripTypeScriptTypes(read('supabase/functions/score-tracker-admin/index.ts').replace(/^import .*;\s*$/gm,'')),{Deno:{env:{get:()=>''},serve:f=>handler=f},createClient:()=>mockDb,Response,URL,crypto,TextEncoder,console});
  const request=params=>new Request('https://test/?action=users&'+new URLSearchParams(params),{headers:{'x-score-token':'fixture-token'}});
  let response=await handler(request({page:2,page_size:10,sort:'exam_count',order:'desc'})),payload=await response.json();assert.equal(response.status,200);assert.equal(payload.rows.length,10);assert.equal(payload.total_count,60);assert.equal(payload.page,2);assert.deepEqual(payload.rows,JSON.parse(JSON.stringify(await page([10,10,null,'exam_count','desc']))));
  const before=rpcCalls;allowed=false;response=await handler(request({}));assert.equal(response.status,401);assert.equal(rpcCalls,before);allowed=true;
  console.log('PASS: existing authenticated Edge endpoint returns the unchanged full paging contract; unauthorized reads never call RPC');

  const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  const html=vm.runInNewContext(read('api/mg-ui.js').replace('export const MG_HTML','const MG_HTML')+'\nMG_HTML');
  const dom=new JSDOM(html,{url:'https://test/mg?view=users',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  w.localStorage.setItem('st_admin_token','fixture-token');w.setInterval=()=>0;
  w.fetch=async(url,init)=>{const u=new URL(url,'https://test');assert.equal(u.pathname,'/mg');calls.push(Object.fromEntries(u.searchParams));if(u.searchParams.get('action')==='users'){return handler(new Request('https://test/'+u.search,{headers:init.headers}));}return{ok:true,json:async()=>({ok:true})};};
  w.eval(w.document.querySelector('script').textContent);await tick();
  assert(w.document.getElementById('page').textContent.includes('60 位用户'));assert.equal(w.document.querySelectorAll('.table thead th').length,12);assert(w.document.querySelector('.table').textContent.includes('活跃天'));assert(!w.document.querySelector('.table tbody img'));
  const size=w.document.querySelector('[data-page-size="users"]');size.value='20';size.dispatchEvent(new w.Event('change'));await tick();
  w.document.querySelector('[data-page="users:next"]').click();await tick();assert.equal(calls.at(-1).page,'2');
  w.document.querySelector('[data-sort="users:exam_count"]').click();await tick();assert.equal(calls.at(-1).sort,'exam_count');
  const filter=w.document.getElementById('userActivity');filter.value='none';filter.dispatchEvent(new w.Event('change'));await tick();assert.equal(calls.at(-1).activity,'none');
  assert.equal(errors.length,0);w.close();await db.close();
  console.log('PASS: users UI retains all columns, exact totals, page-size/page controls, sorting, activity filters and safe username rendering');
}
run().catch(e=>{console.error(e.message,e.stack?.split('\n').slice(0,3).join('\n'));process.exitCode=1});
