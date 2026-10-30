var state={user:{id:'announcement-preview'},token:'preview-only',page:'preview'};
function render(){}function renderLogin(){}function bindPage(){}function toast(){}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var qaEvents=[],qaRequests=[],qaCommunity={enabled:true,title:'成绩轨迹微信交流群',intro:'',qr_image:'/community-qr-20261024.jpg',join_url:'',expires_at:''};
var qaQrMode=new URLSearchParams(location.search).get('qr');
if(qaQrMode==='expired')qaCommunity.expires_at='2020-01-01T00:00:00Z';
if(qaQrMode==='disabled')qaCommunity.enabled=false;
window.__scoreTrackerTrack=function(type,data){qaEvents.push({type:type,data:data});return Promise.resolve()};
var nativeFetch=window.fetch.bind(window),draftPromise=nativeFetch('/assets/announcements/beta-invitation.json').then(function(r){return r.json()});
window.fetch=async function(url,init){
  if(String(url).includes('__cb'))return new Response('<meta name="application-version" content="v8.1">');
  if(!String(url).includes('/api/'))return nativeFetch(url,init);
  var body=JSON.parse(init.body||'{}'),draft=await draftPromise;qaRequests.push(body);
  var config=Object.assign({version:'v8.1',enabled:false,title:'更新',content:'',announcement_enabled:true,announcement_id:'preview-invitation',revision:1},draft);
  if(new URLSearchParams(location.search).get('notice')==='release'){config.enabled=true;config.announcement_enabled=false;config.title='v8.1 更新内容';config.content='这是更新公告的模拟内容。点击弹窗外不应关闭；关闭按钮可正常使用。'}
  if(body.action==='community_public')return qaQrMode==='error'?Response.json({error:'模拟读取失败'},{status:503}):Response.json({config:qaCommunity});
  if(body.action==='notice_claim')return Response.json({claimed:true});
  if(body.action==='announcement_comments')return Response.json({rows:[],next:null});
  if(body.action==='announcement_comment_add')return Response.json({ok:true});
  return Response.json({config:config,announcements:[Object.assign({id:'preview-invitation',title:draft.announcement_title,content:draft.announcement_content},draft)],releases:[],seen:[]});
};
