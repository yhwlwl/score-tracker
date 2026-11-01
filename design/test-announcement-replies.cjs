const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
async function until(check){for(let i=0;i<200;i++){if(check())return;await tick()}throw Error('UI did not settle')}
const uid='11111111-1111-4111-8111-111111111111',cid='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',at='2026-11-01T08:00:00Z';

async function backend(){
  const pg=new PGlite();
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table score_tracker_announcement_comments(id uuid primary key,sequence bigint generated always as identity,notice_id text,user_id uuid,content text,created_at timestamptz default now());
    alter table score_tracker_announcement_comments enable row level security;
    grant all on score_tracker_announcement_comments to service_role;`);
  await pg.exec(read('supabase/migrations/20261026135346_admin_comment_replies.sql'));
  const migration=fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.endsWith('_announcement_reply_read_receipts.sql'));
  await pg.exec(read('supabase/migrations/'+migration));
  await pg.query(`insert into score_tracker_announcement_comments(id,notice_id,user_id,content,admin_reply,admin_replied_at,reply_revision) values
    ($1,'old-notice',$2,'我的评论','作者回复',$4,1),($3,'old-notice',$3,'别人的私密评论','别人的回复',$4,1)`,[cid,uid,other,at]);
  for(const role of ['anon','authenticated']){
    await pg.exec('set role '+role);await assert.rejects(pg.query('select * from score_tracker_announcement_comments'),/permission denied/);await pg.exec('reset role');
  }
  // Small PostgREST adapter executes the real handler filters against PostgreSQL.
  const db={from(table){
    const values=[],filters=[],sort=[];let fields='*',changes=null,max=null,count=false;
    const ident=x=>{assert(/^[a-z_]+$/.test(x));return '"'+x+'"'},param=v=>{values.push(v);return '$'+values.length};
    const q={select(s,opts={}){fields=s;count=opts.count==='exact';return q},update(x){changes=x;return q},eq(k,v){filters.push(ident(k)+'='+param(v));return q},is(k,v){assert.equal(v,null);filters.push(ident(k)+' is null');return q},not(k,op,v){assert.equal(op,'is');assert.equal(v,null);filters.push(ident(k)+' is not null');return q},order(k,o){sort.push(ident(k)+(o.ascending===false?' desc':' asc'));return q},limit(n){max=n;return q},
      async run(){let sql,where=filters.length?' where '+filters.join(' and '):'',total=0;
        if(count)total=Number((await pg.query('select count(*) as n from '+ident(table)+where,values)).rows[0].n);
        if(changes){const set=Object.entries(changes).map(([k,v])=>ident(k)+'='+param(v));sql='update '+ident(table)+' set '+set.join(',')+where+' returning '+fields;}
        else sql='select '+fields+' from '+ident(table)+where+(sort.length?' order by '+sort.join(','):'')+(max?' limit '+max:'');
        return {data:(await pg.query(sql,values)).rows,count:total,error:null};
      },async maybeSingle(){const r=await q.run();return {...r,data:r.data[0]||null}},then(resolve,reject){return q.run().then(resolve,reject)}};return q;
  }};
  const ctx={Date,Number};vm.createContext(ctx);vm.runInContext(read('supabase/functions/score-tracker-notices/replies.ts').replace('export async function','async function')+';this.replies=announcementReplies',ctx);
  const owner={id:uid,username:'我'},history=async()=>({notices:[],current:'new-notice',commentsEnabled:false});
  const call=(action,body={},u=owner)=>ctx.replies(db,u,action,body,history);
  let result=await call('announcement_reply_inbox');assert.equal(result.count,1);assert.equal(result.rows[0].id,cid);assert(!JSON.stringify(result).includes('别人的'));
  assert.equal((await call('announcement_reply_detail',{id:other})).status,404);
  result=await call('announcement_reply_detail',{id:cid});assert.equal(result.notice.title,'历史公告');assert(result.read_only);assert.equal(result.comment.reply.content,'作者回复');
  assert.equal((await call('announcement_reply_read',{id:cid,revision:'1',replied_at:at})).status,400);
  assert.equal((await call('announcement_reply_read',{id:other,revision:1,replied_at:at})).read,false);
  assert.equal((await call('announcement_reply_read',{id:cid,revision:1,replied_at:at})).read,true);
  assert.equal((await call('announcement_reply_inbox')).count,0);
  await pg.query('update score_tracker_announcement_comments set admin_reply=$1 where id=$2',['更新后的回复',cid]);
  assert.equal((await call('announcement_reply_inbox')).count,1,'direct SQL reply edit resets unread state');
  assert.equal((await call('announcement_reply_read',{id:cid,revision:1,replied_at:at})).read,false,'old receipt cannot mark an edited reply read');
  result=await call('announcement_reply_detail',{id:cid});assert.equal(result.comment.reply_revision,2);
  assert.equal((await call('announcement_reply_read',{id:cid,revision:2,replied_at:at})).read,true);
  await pg.query('update score_tracker_announcement_comments set admin_reply=null where id=$1',[cid]);assert.equal((await call('announcement_reply_inbox')).count,0);
  assert.equal((await call('announcement_reply_inbox',{}, {id:other})).count,1,'read receipts remain per author');
  await pg.close();console.log('PASS: real migration/RLS, own-only inbox/detail/read, archives, direct-SQL edit invalidation and stale receipt protection');
}

async function frontend(){
  let unread=true,blocked=false,release;const calls=[],errors=[],observers=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<!doctype html><meta name="application-version" content="v8.1"><nav class="desktop-nav"><button data-page="account">账号</button></nav><main id="content"></main><nav class="bottom-nav"><button data-page="account">账号</button></nav>',{url:'https://fixture/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,d=w.document;w.state={user:{id:uid},token:'owner',page:'account'};w.setInterval=()=>0;
  w.render=()=>{};w.renderLogin=()=>{};w.bindPage=()=>{};w.accountHtml=()=>'';
  w.IntersectionObserver=class{constructor(cb){this.cb=cb;observers.push(this)}observe(target){this.target=target}disconnect(){this.stopped=true}};
  w.fetch=async(url,init={})=>{
    if(String(url).includes('__cb'))return {ok:true,text:async()=>'<meta name="application-version" content="v8.1">'};
    const b=JSON.parse(init.body);calls.push(b);let result={};
    if(b.action==='notice_check'||b.action==='notice_history')result={config:{version:'v8.1',enabled:false,announcement_enabled:false}};
    if(b.action==='announcement_reply_inbox'){
      result=b.token==='owner'&&unread?{count:1,rows:[{id:cid,notice_id:'old',comment_preview:'<img src=x> 我的建议'}]}:{count:0,rows:[]};
      if(blocked)await new Promise(r=>release=r);
    }
    if(b.action==='announcement_reply_detail')result={notice:{id:'old',title:'上次的公告',content:'历史公告正文',comments_public:false},read_only:true,comment:{id:cid,content:'我的建议',author:'我',created_at:at,is_mine:true,reply_unread:true,reply_revision:1,reply:{content:'<script>回复仅以文字显示</script>',created_at:at}}};
    if(b.action==='announcement_reply_read'){unread=false;result={ok:true,read:true};}
    return {ok:true,json:async()=>result};
  };
  w.eval(read('release-notices.js'));w.eval(read('announcement-settings.js'));w.eval(read('announcement-replies.js'));
  d.getElementById('content').innerHTML=w.accountHtml();w.bindPage();await until(()=>d.getElementById('announcementReplyGuide'));
  assert.equal(d.querySelectorAll('.announcement-reply-dot').length,2);assert(!d.querySelector('#announcementReplyGuide img'));
  d.querySelector('[data-announcement-reply]').click();await until(()=>d.querySelector('.rn-admin-reply'));
  assert.equal(d.querySelector('.rn-title').textContent,'上次的公告');assert(d.querySelector('.rn-comment-form').hidden);assert(!d.querySelector('.rn-admin-reply script'));
  assert(!calls.some(x=>x.action==='announcement_reply_read'),'opening account or fetching details does not mark an unseen reply read');
  observers[0].cb([{isIntersecting:true,target:observers[0].target}]);await until(()=>!d.querySelector('.announcement-reply-dot'));
  assert.equal(d.getElementById('announcementReplyGuide'),null);assert(calls.some(x=>x.action==='announcement_reply_read'&&x.id===cid&&x.revision===1));
  d.querySelector('.rn-close').click();assert(observers[0].stopped);
  // Ignore an old-session inbox response after an account change.
  blocked=true;unread=true;w.__announcementReplies.refresh();await until(()=>release);
  w.state.user={id:other};w.state.token='other';w.render();release();blocked=false;
  await tick();await tick();assert(!d.querySelector('.announcement-reply-dot'));assert(!d.getElementById('announcementReplyGuide'));
  w.state.user=null;w.state.token='';w.renderLogin();assert(!d.querySelector('.announcement-reply-dot'));
  assert.deepEqual(errors,[]);w.close();console.log('PASS: account red dot/guide, safe targeted historical reply, visible-only read, clearing reminder and account isolation');
}
(async()=>{await backend();await frontend()})().catch(e=>{console.error(e);process.exitCode=1});
