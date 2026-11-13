const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const admin={id:'11111111-1111-4111-8111-111111111111',is_admin:true},user={id:'22222222-2222-4222-8222-222222222222',is_admin:false},other={id:'33333333-3333-4333-8333-333333333333',is_admin:false};
const notice='a'.repeat(24),historical='b'.repeat(24),notices=[{id:notice,title:'本次公告'},{id:historical,title:'历史公告'}];
async function until(fn){for(let i=0;i<150;i++){if(fn())return;await pause(20)}throw Error('UI did not settle')}
(async()=>{
 const pg=new PGlite();let adminDOM,publicDOM;
 try{
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create table score_tracker_users(id uuid primary key,username text,is_admin boolean not null default false);
   create table score_tracker_notification_config(id integer primary key,announcement_enabled boolean,announcement_title text,announcement_content text);
   insert into score_tracker_users values('${admin.id}','admin',true),('${user.id}','用户甲',false),('${other.id}','用户乙',false);`);
  await pg.exec(read('supabase/migrations/20261005064822_announcement_comments.sql'));
  await pg.exec(read('supabase/migrations/20261026135346_admin_comment_replies.sql'));
  const replyMigration=fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.endsWith('_announcement_reply_read_receipts.sql'));
  await pg.exec(read('supabase/migrations/'+replyMigration));
  const migration=fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.endsWith('_developer_announcement_comments.sql'));
  await pg.query('insert into score_tracker_announcement_comments(notice_id,user_id,content) values($1,$2,$3)',[notice,admin.id,'之前的管理员评论']);
  await pg.exec(read('supabase/migrations/'+migration));
  assert.equal((await pg.query('select is_developer from score_tracker_announcement_comments')).rows[0].is_developer,true);
  for(const role of ['anon','authenticated']){await pg.exec('set role '+role);await assert.rejects(pg.query('select * from score_tracker_announcement_comments'),/permission denied/);await pg.exec('reset role')}
  await assert.rejects(pg.query('insert into score_tracker_announcement_comments(notice_id,user_id,content,is_developer) values($1,$2,$3,true)',[notice,user.id,'伪造身份']),/只有管理员/);
  await assert.rejects(pg.query('insert into score_tracker_announcement_comments(notice_id,user_id,content,pinned_at) values($1,$2,$3,now())',[notice,user.id,'伪造置顶']),/check constraint/);

  // PostgREST-shaped adapter executes every mutation and visibility filter against PostgreSQL.
  const ident=x=>{assert(/^[a-z_]+$/.test(x));return '"'+x+'"'};
  const db={from(table){let fields='*',kind='select',patch={},filters=[],orders=[],values=[],max=null;const param=v=>{values.push(v&&typeof v==='object'?JSON.stringify(v):v);return '$'+values.length};
   const q={select(s){fields=s;return q},insert(v){kind='insert';patch=v;return q},update(v){kind='update';patch=v;return q},delete(){kind='delete';return q},
    eq(k,v){filters.push(ident(k)+'='+param(v));return q},lt(k,v){filters.push(ident(k)+'<'+param(v));return q},is(k,v){assert.equal(v,null);filters.push(ident(k)+' is null');return q},not(k,op,v){assert.equal(op,'is');assert.equal(v,null);filters.push(ident(k)+' is not null');return q},
    or(s){filters.push('('+s.split(',').map(part=>{const [k,op,v]=part.split('.');assert.equal(op,'eq');return ident(k)+'='+param(v==='true'?true:v)}).join(' or ')+')');return q},order(k,o){orders.push(ident(k)+(o.ascending===false?' desc':' asc'));return q},limit(n){max=n;return q},
    async run(){let where=filters.length?' where '+filters.join(' and '):'',projection=fields.replace('author:score_tracker_users(username)',"(select jsonb_build_object('username',username) from score_tracker_users where id=score_tracker_announcement_comments.user_id) as author"),sql;
     if(kind==='insert'){const cols=Object.keys(patch);sql='insert into '+ident(table)+'('+cols.map(ident).join(',')+') values('+cols.map(k=>param(patch[k])).join(',')+') returning '+projection;}
     else if(kind==='update')sql='update '+ident(table)+' set '+Object.entries(patch).map(([k,v])=>ident(k)+'='+param(v)).join(',')+where+' returning '+projection;
     else if(kind==='delete')sql='delete from '+ident(table)+where+' returning '+projection;
     else sql='select '+projection+' from '+ident(table)+where+(orders.length?' order by '+orders.join(','):'')+(max?' limit '+max:'');
     try{return {data:(await pg.query(sql,values)).rows,error:null}}catch(e){return {data:null,error:{code:e.code,message:e.message}}}
    },async maybeSingle(){const r=await q.run();return {...r,data:r.data?.[0]||null}},async single(){return q.maybeSingle()},then(a,b){return q.run().then(a,b)}};return q;
  }};
  const ctx={Date,Number};vm.createContext(ctx);vm.runInContext(read('supabase/functions/score-tracker-notices/developer-comments.ts').replace(/export /g,''),ctx);
  const command=(action,body,u=admin)=>ctx.developerCommentAdmin(db,u,action,body,async()=>notices);
  const create=body=>command('notification_developer_comment_create',body),update=body=>command('notification_developer_comment_update',body);
  const draft={id:crypto.randomUUID(),notice_id:notice,content:'<img src=x onerror=alert(1)> 开发者说明\n第二行',pinned:true};
  assert.equal((await command('notification_developer_comment_create',draft,user)).status,403);
  for(const bad of [{...draft,notice_id:'c'.repeat(24)},{...draft,content:''},{...draft,content:'x'.repeat(1001)},{...draft,pinned:'true'}])assert((await create(bad)).status>=400);
  let r=await create(draft);assert(r.ok);assert(r.comment.is_developer);assert(r.comment.pinned_at);
  assert.equal((await create(draft)).replayed,true,'retrying a lost response does not publish twice');
  const own=[];for(let i=0;i<35;i++){const x=await pg.query('insert into score_tracker_announcement_comments(notice_id,user_id,content) values($1,$2,$3) returning id',[notice,user.id,'用户自己的评论 '+i]);own.push(x.rows[0].id)}
  await pg.query('insert into score_tracker_announcement_comments(notice_id,user_id,content) values($1,$2,$3)',[notice,other.id,'用户乙的私密评论']);
  const page=(before='',n={id:notice,comments_public:false,comments_enabled:false},u=user)=>ctx.announcementCommentPage(db,u,n,true,before);
  let first=await page();assert.equal(first.pinned.length,1);assert.equal(first.pinned[0].author,'开发者');assert.equal(first.rows.length,30);assert.equal(first.comments_enabled,false);assert(!JSON.stringify(first).includes('用户乙的私密评论'));
  let second=await page(first.next);assert.equal(second.pinned.length,0);assert.equal(second.rows.length,6);assert.equal(second.next,null);assert.equal(new Set(first.rows.concat(second.rows).map(x=>x.id)).size,36);
  assert.equal((await update({...draft,content:'修改后的开发者说明',revision:0})).comment.comment_revision,1);
  assert.equal((await update({...draft,revision:0})).status,409);
  assert.equal((await update({...draft,revision:1,pinned:false})).ok,true);
  first=await page();assert.equal(first.pinned.length,0);second=await page(first.next);assert(first.rows.concat(second.rows).some(x=>x.id===draft.id));
  const results=await Promise.all([update({...draft,revision:2,content:'设备甲'}),update({...draft,revision:2,content:'设备乙'})]);assert.deepEqual(results.map(x=>x.status||200).sort(),[200,409]);
  assert.equal((await command('notification_developer_comment_delete',{id:draft.id,notice_id:notice,revision:2})).status,409);
  const removed=await command('notification_developer_comment_delete',{id:draft.id,notice_id:notice,revision:3});assert(removed.ok);
  assert.equal((await pg.query('select count(*) n from score_tracker_announcement_comments where is_developer=false')).rows[0].n,36,'ordinary comments stay intact');
  const pinnedDraft={...draft,id:crypto.randomUUID(),content:'重要补充：开发者说明',pinned:true};await create(pinnedDraft);
  console.log('PASS: migration, RLS, identity protection, create/replay/edit/delete, CAS conflicts, private visibility, pinned pagination and ordinary data preservation');

  // Exercise the actual administrator document using the real module and PostgreSQL writes.
  const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));let fail=false;
  const config={version:'v9.0',title:'更新',content:'内容',announcement_title:'本次公告',announcement_content:'正文',announcement_enabled:true,announcement_id:notice,revision:1};
  const activity=async()=>({announcement_id:notice,notices,viewers:2,current_comments:40,total_comments:40,rows:(await pg.query("select *,case when is_developer then '开发者' else '用户' end as author from score_tracker_announcement_comments order by sequence desc")).rows.map(r=>({...r,id:r.id,comment_revision:r.comment_revision,is_current:r.notice_id===notice})),next:null});
  const adminHTML=vm.runInNewContext(read('api/mg-ui.js').replace('export const MG_HTML','const MG_HTML')+';MG_HTML');
  adminDOM=new JSDOM(adminHTML,{url:'https://fixture.test/mg?view=notices',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.localStorage.setItem('st_admin_token','admin');w.setInterval=()=>1;w.confirm=()=>true;w.fetch=async(url,options={})=>{const action=new URL(url,w.location.href).searchParams.get('action');let data={ok:true,counts:{},rows:[]};
    if(action==='notification_config')data={config};
    if(action==='notification_announcement_activity')data=await activity();
    if(action.startsWith('notification_developer_comment_')){const body=JSON.parse(options.body);calls.push({action,body});data=fail?{error:'模拟断网，草稿保留',status:503}:await command(action,body);}
    return {ok:!data.status,json:async()=>data};};}});
  const d=adminDOM.window.document;await until(()=>d.querySelector('#noticeDeveloperNew:not([disabled])'));
  d.querySelector('#noticeDeveloperNew').click();d.querySelector('#developerCommentText').value='后台发布的开发者评论';d.querySelector('#developerCommentPinned').checked=true;
  const submit=()=>d.querySelector('#developerCommentForm').dispatchEvent(new adminDOM.window.Event('submit',{bubbles:true,cancelable:true}));
  fail=true;submit();await until(()=>d.querySelector('#developerCommentStatus')?.textContent.includes('模拟断网'));assert.equal(d.querySelector('#developerCommentText').value,'后台发布的开发者评论');
  fail=false;submit();await until(()=>!d.querySelector('#developerCommentForm'));await until(()=>d.querySelector('#noticeAdminComments').textContent.includes('后台发布的开发者评论'));
  assert.equal(calls[0].body.id,calls[1].body.id,'retry keeps the original creation id');
  let row=[...d.querySelectorAll('#noticeAdminComments article')].find(x=>x.textContent.includes('后台发布的开发者评论'));assert(row.textContent.includes('置顶'));row.querySelector('[data-developer-pin]').click();await until(()=>{const x=[...d.querySelectorAll('#noticeAdminComments article')].find(x=>x.textContent.includes('后台发布的开发者评论'));return x?.querySelector('[data-developer-pin]')?.textContent==='置顶'});
  row=[...d.querySelectorAll('#noticeAdminComments article')].find(x=>x.textContent.includes('后台发布的开发者评论'));row.querySelector('[data-developer-edit]').click();d.querySelector('#developerCommentText').value='编辑后的开发者评论';submit();await until(()=>!d.querySelector('#developerCommentForm'));await until(()=>d.querySelector('#noticeAdminComments').textContent.includes('编辑后的开发者评论'));
  row=[...d.querySelectorAll('#noticeAdminComments article')].find(x=>x.textContent.includes('编辑后的开发者评论'));row.querySelector('[data-developer-delete]').click();await until(()=>!d.querySelector('#noticeAdminComments').textContent.includes('编辑后的开发者评论'));
  assert.deepEqual(errors,[]);console.log('PASS: actual admin HTML publishes, retries with draft, toggles pin, edits and deletes through PostgreSQL');

  const publicConfig={...config,enabled:false,tip_enabled:false,announcement_comments_enabled:false,announcement_comments_public:false,announcement_comment_title:'公告评论'};
  publicDOM=new JSDOM('<!doctype html><meta name="application-version" content="v9.0"><footer id="app-version-v17"></footer>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=publicDOM.window;w.state={user:{id:user.id},token:'fixture'};w.render=()=>{};w.setInterval=()=>1;w.fetch=async(url,options)=>{const body=JSON.parse(options.body);let data={ok:true};if(['notice_check','notice_public','notice_history'].includes(body.action))data={config:publicConfig,seen:[]};if(body.action==='notice_claim')data={claimed:true};if(body.action==='announcement_comments')data=await page(body.before);return {ok:true,json:async()=>data};};
  w.eval(read('release-notices.js'));await until(()=>w.document.querySelector('.rn-comment-developer'));
  const pin=w.document.querySelector('.rn-pinned-list .rn-comment');assert(pin);assert.equal(pin.querySelector('b').textContent,'开发者');assert.equal(pin.querySelector('.rn-comment-pin').textContent,'置顶');assert(pin.textContent.includes('重要补充'));assert(w.document.querySelector('.rn-comment-form').hidden);assert(!w.document.body.textContent.includes('用户乙的私密评论'));assert(!w.document.querySelector('.rn-comment img'));
  if(process.env.DEVELOPER_QA_DIR){fs.mkdirSync(process.env.DEVELOPER_QA_DIR,{recursive:true});let publicHTML=publicDOM.serialize().replace(/<script[\s\S]*?<\/script>/g,'');publicHTML=publicHTML.replace('</head>','<style>'+read('styles.css')+'</style></head>');fs.writeFileSync(path.join(process.env.DEVELOPER_QA_DIR,'user.html'),publicHTML);fs.writeFileSync(path.join(process.env.DEVELOPER_QA_DIR,'admin.html'),adminDOM.serialize().replace(/<script[\s\S]*?<\/script>/g,''));}
  assert.deepEqual(errors,[]);console.log('PASS: actual user HTML shows developer identity and pins even with comments closed, while preserving privacy');

  // Current announcements retain their legacy content hash once identity becomes persistent.
  await pg.exec(`alter table score_tracker_notification_config
    add column version text default 'v9.0',add column enabled boolean default true,add column title text default '更新',add column content text default '更新内容',
    add column tip_enabled boolean default false,add column tip_content text default '',add column announcement_comments_public boolean default true,
    add column revision integer default 1,add column updated_at timestamptz default now(),add column updated_by uuid,add column release_history jsonb default '[]',add column announcement_history jsonb default '[]';
    alter table score_tracker_users add column session_token_hash text,add column session_expires_at timestamptz;
    create table score_tracker_visit_logs(session_id uuid,visitor_id uuid,user_id uuid,app_version text,pathname text,app_page text,user_agent text,account_mode text,event_type text,metadata jsonb);
    create table score_tracker_notification_receipts(user_id uuid,kind text,notice_id text);`);
  const legacyTitle='需要编辑的原公告',legacyContent='最初发布的内容',legacy=crypto.createHash('sha256').update(legacyTitle+'\n'+legacyContent).digest('hex').slice(0,24);
  await pg.query('insert into score_tracker_notification_config(id,announcement_enabled,announcement_title,announcement_content,announcement_comments_enabled) values(1,true,$1,$2,true)',[legacyTitle,legacyContent]);
  await pg.query('insert into score_tracker_announcement_comments(notice_id,user_id,content,is_developer,pinned_at) values($1,$2,$3,true,now())',[legacy,admin.id,'原公告的置顶说明']);
  await pg.query('insert into score_tracker_notification_receipts values($1,$2,$3)',[user.id,'announcement',legacy]);
  const stableMigration=fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.endsWith('_stable_announcement_identity.sql'));
  await pg.exec(read('supabase/migrations/'+stableMigration));
  assert.equal((await pg.query('select announcement_id from score_tracker_notification_config')).rows[0].announcement_id,legacy);
  for(const [account,token] of [[admin,'fixture-admin'],[user,'fixture-user']])await pg.query('update score_tracker_users set session_token_hash=$1,session_expires_at=now()+interval \'1 hour\' where id=$2',[crypto.createHash('sha256').update(token).digest('hex'),account.id]);
  let handler;Object.assign(ctx,{createClient:()=>db,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,URL,TextEncoder,crypto:crypto.webcrypto,console});
  vm.runInContext(read('supabase/functions/score-tracker-notices/index.ts').replace(/^import .*;\n/gm,''),ctx);
  async function request(body){const response=await handler(new Request('https://fixture.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,...await response.json()}}
  let current=(await request({action:'notice_public'})).config;
  const save=changes=>request({...current,...changes,action:'notification_config_save',token:'fixture-admin'});
  let saved=await save({announcement_title:'修正后的标题',announcement_content:'二次编辑内容'});assert.equal(saved.status,200);current=saved.config;
  assert.equal(current.announcement_id,legacy);assert.equal((await pg.query('select count(*) n from score_tracker_announcement_comments where notice_id=$1 and pinned_at is not null',[legacy])).rows[0].n,1);
  assert.equal((await pg.query('select count(*) n from score_tracker_notification_receipts where notice_id=$1',[legacy])).rows[0].n,1);
  await pg.query("update score_tracker_announcement_comments set created_at=now()-interval '1 minute' where user_id=$1",[user.id]);
  await pg.query('select score_tracker_add_announcement_comment($1,$2,$3)',[user.id,legacy,'编辑后仍能发表评论']);
  let historyResult=await request({action:'notice_history'});assert.equal(historyResult.announcements.length,1);assert.equal(historyResult.announcements[0].content,'二次编辑内容');
  saved=await save({announcement_new:true,announcement_title:'另发一条新公告',announcement_content:'全新内容'});assert.equal(saved.status,200);current=saved.config;assert.notEqual(current.announcement_id,legacy);const publishedId=current.announcement_id;
  historyResult=await request({action:'notice_history'});assert.equal(historyResult.announcements.length,2);assert.equal(historyResult.announcements.find(x=>x.id===legacy).content,'二次编辑内容');
  assert.equal((await save({revision:1,announcement_new:true})).status,409);assert.equal((await save({announcement_new:'true'})).status,400);
  saved=await save({announcement_content:'编辑新公告，但不再创建新的一条'});assert.equal(saved.status,200);assert.equal(saved.config.announcement_id,publishedId);
  console.log('PASS: stable migration preserves legacy identity, pinned comments and receipts; real handler distinguishes edits/new publication, archives correctly and retains RPC/CAS protection');

  const noticeSaves=[],oldFetch=adminDOM.window.fetch;
  adminDOM.window.fetch=async(url,options={})=>{if(new URL(url,adminDOM.window.location.href).searchParams.get('action')==='notification_config_save'){const body=JSON.parse(options.body);noticeSaves.push(body);Object.assign(config,body,{announcement_id:body.announcement_new?crypto.randomUUID().replace(/-/g,'').slice(0,24):config.announcement_id,revision:config.revision+1});return {ok:true,json:async()=>({config})}}return oldFetch(url,options)};
  d.querySelector('#notice_announcement_content').value='后台编辑原公告';d.querySelector('#noticeSave').click();await until(()=>noticeSaves.length===1&&d.querySelector('#noticeSave')?.isConnected);assert.equal(noticeSaves[0].announcement_new,false);
  await until(()=>d.querySelector('#noticePublishNew')&&!d.querySelector('#noticeSave').disabled);d.querySelector('#noticePublishNew').click();await until(()=>noticeSaves.length===2);assert.equal(noticeSaves[1].announcement_new,true);assert.equal(noticeSaves[1].announcement_enabled,true);await until(()=>d.querySelector('#noticePublishNew')&&!d.querySelector('#noticePublishNew').disabled);
  assert.deepEqual(errors,[]);console.log('PASS: real admin Save changes / Publish new announcement controls send distinct server intents');
 }finally{adminDOM?.window.close();publicDOM?.window.close();await pg.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
