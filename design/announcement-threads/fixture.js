/* Isolated UI acceptance fixture. Never forwards requests or uses real accounts. */
var state={user:{id:'demo-a'},token:'demo-a',page:'account'};
function render(){} function renderLogin(){}
window.__scoreTrackerTrack=()=>Promise.resolve();
const id='aaaaaaaaaaaaaaaaaaaaaaaa',old='bbbbbbbbbbbbbbbbbbbbbbbb',now=()=>new Date().toISOString();
const config={version:'v10.0',enabled:false,title:'预览',content:'预览',tip_enabled:false,announcement_enabled:true,announcement_id:id,announcement_title:'公告评论功能 · 验收样例',announcement_content:'这里使用新版公告评论的实际前端代码，所有数据都是本地模拟。试试回复其他同学、自己追评、点赞和切换开发者身份。',announcement_comments_enabled:true,announcement_comments_public:true,announcement_comment_title:'大家的留言',updated_at:now()};
const notices=[{id,title:config.announcement_title,content:config.announcement_content,comments_enabled:true,comments_public:true,comment_title:'大家的留言'},{id:old,title:'历史公告 · 只读样例',content:'历史评论与旧版作者回复仍然保留。',comments_enabled:false,comments_public:true,comment_title:'历史留言'}];
let serial=20;
const users={'demo-a':'calm-leaf-0265','demo-b':'moon-light-0817','demo-admin':'开发者'};
const roots=[{id:'r1',notice_id:id,author:users['demo-a'],owner:'demo-a',content:'希望之后能支持更多图表自定义！',created_at:now(),reply:{content:'收到啦，会继续优化！',created_at:now()}},{id:'r2',notice_id:id,author:users['demo-b'],owner:'demo-b',content:'从九月份就在用，谢谢开发者！',created_at:now()},{id:'r3',notice_id:id,author:'开发者',owner:'demo-admin',is_developer:true,pinned_at:now(),content:'欢迎大家在这里提建议～',created_at:now()},{id:'r4',notice_id:old,author:users['demo-a'],owner:'demo-a',content:'这是以前的留言。',created_at:now(),reply:{content:'历史回复仍然可以看到。',created_at:now()}}];
let replies=[{id:'t1',root_id:'r1',owner:'demo-admin',content:'这个功能已经在计划里啦！',created_at:now(),parent_id:null},{id:'t2',root_id:'r1',owner:'demo-b',content:'我也想要这个功能！',parent_id:'t1',created_at:now()},{id:'t3',root_id:'r1',owner:'demo-a',content:'谢谢！补充一下，希望平板也能使用。',parent_id:'t2',created_at:now()}];
let likes=new Map([['r1',new Set(['demo-b','demo-admin'])],['t1',new Set(['demo-a','demo-b'])]]);
const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});
const stat=(key,u)=>({count:likes.get(key)?.size||0,liked:!!likes.get(key)?.has(u)});
function mask(s){return s.length<3?'***':s[0]+'***'+s.slice(-1)}
function legacy(x,u){return x?.reply?{id:'legacy',author:'开发者',is_developer:true,is_mine:u==='demo-admin',can_delete:false,content:x.reply.content,created_at:x.reply.created_at,...stat('legacy:'+x.id,u)}:null}
function replyRow(x,u,writable){return {id:x.id,parent_id:x.parent_id,content:x.deleted?'原回复已删除':x.content,deleted:!!x.deleted,created_at:x.created_at,author:x.deleted?'已删除':x.owner==='demo-admin'?'开发者':mask(users[x.owner]),is_developer:!x.deleted&&x.owner==='demo-admin',is_mine:x.owner===u,can_delete:!x.deleted&&writable&&(x.owner===u||u==='demo-admin'),...stat(x.id,u)}}
window.fetch=async function(url,init={}){
 if(String(url).includes('__cb'))return new Response(document.documentElement.outerHTML,{status:200});
 if(!String(url).includes('/api/score-tracker-notices'))return response({error:'验收环境阻止外部请求'},403);
 const b=JSON.parse(init.body||'{}'),u=b.token||state.token,a=b.action;
 if(['notice_history','notice_check','notice_public'].includes(a))return response({config,announcements:notices,releases:[],seen:[{kind:'announcement',notice_id:id}]});
 if(a==='notice_claim')return response({claimed:true});
 if(a==='announcement_comments'){
  const n=notices.find(x=>x.id===b.notice_id),rows=roots.filter(x=>x.notice_id===b.notice_id).map(x=>({...x,is_mine:x.owner===u,can_delete:b.notice_id===id&&(u==='demo-admin'||x.owner===u),reply_unread:false,author:x.is_developer?'开发者':mask(x.author),root_likes:stat(x.id,u),reply_count:replies.filter(r=>r.root_id===x.id).length+(x.reply?1:0),reply_legacy:legacy(x,u),reply_preview:replies.filter(r=>r.root_id===x.id&&!r.deleted).sort((a,b)=>Number(b.owner==='demo-admin')-Number(a.owner==='demo-admin')).slice(0,2).map(r=>replyRow(r,u,b.notice_id===id))}));
  return response({rows:rows.filter(x=>!x.pinned_at),pinned:rows.filter(x=>x.pinned_at),next:null,threads_enabled:true,read_only:b.notice_id!==id,comments_enabled:n?.comments_enabled});
 }
 if(a==='announcement_comment_add'){roots.unshift({id:'r'+serial++,notice_id:b.notice_id,owner:u,author:users[u],is_developer:u==='demo-admin',content:b.content,created_at:now()});return response({ok:true})}
 if(a==='announcement_comment_delete'){let i=roots.findIndex(x=>x.id===b.id&&(x.owner===u||u==='demo-admin'));if(i<0)return response({error:'无权删除'},403);roots.splice(i,1);return response({ok:true})}
 if(a==='announcement_thread_read'){let list=replies.filter(x=>x.root_id===b.root_id),original=roots.find(x=>x.id===b.root_id),oldReply=legacy(original,u),offset=b.offset||0;return response({root_likes:stat(b.root_id,u),legacy:oldReply,reply_count:list.length+(oldReply?1:0),rows:list.slice(offset,offset+30).map(x=>replyRow(x,u,b.notice_id===id)),writable:b.notice_id===id,next:list.length>offset+30?offset+30:null})}
 if(b.notice_id!==id)return response({error:'历史公告只读'},403);
 if(a==='announcement_thread_add'){if(b.parent_id==='legacy'&&!roots.find(x=>x.id===b.root_id)?.reply)return response({error:'历史回复不存在'},404);let created={id:'t'+serial++,root_id:b.root_id,owner:u,parent_id:b.parent_id,content:b.content,created_at:now()};replies.push(created);return response({ok:true,id:created.id,author:u==='demo-admin'?'开发者':mask(users[u]),is_developer:u==='demo-admin',created_at:created.created_at})}
 if(a==='announcement_thread_like'){let key=b.reply_id==='legacy'?'legacy:'+b.root_id:b.reply_id||b.root_id,set=likes.get(key)||new Set();b.liked?set.add(u):set.delete(u);likes.set(key,set);return response({ok:true,count:set.size})}
 if(a==='announcement_thread_delete'){let target=replies.find(x=>x.id===b.reply_id&&x.root_id===b.root_id);if(!target||!(target.owner===u||u==='demo-admin'))return response({error:'无权删除'},403);target.deleted=true;target.content='原回复已删除';return response({ok:true})}
 return response({error:'不支持的模拟操作'},400);
};
document.addEventListener('DOMContentLoaded',()=>{
 const status=document.getElementById('qa-status');
 async function openNotice(){
  status.textContent='正在打开公告…';
  try{
   if(!window.__releaseNotices)throw new Error('公告组件未加载');
   await window.__releaseNotices.openAnnouncement();
   if(!document.querySelector('.rn-back')){
    status.textContent=document.visibilityState!=='visible'?'请在浏览器中打开此页面，再点打开公告。':'公告未显示，请重新点击；也可查看下方错误提示。';
   }else status.textContent='组件已就绪；当前为模拟数据。';
  }catch(e){status.textContent='打开失败：'+String(e.message||e);}
 }
 document.getElementById('open').onclick=openNotice;
 document.getElementById('role').onchange=e=>{state.user={id:e.target.value};state.token=e.target.value;render();openNotice()};
 document.getElementById('theme').onclick=()=>document.body.classList.toggle('dark');
 openNotice();
});