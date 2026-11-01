/* Isolated admin UI demo: no account or remote writes. */
var qaAdminCalls=[],qaAdminSaved=null,qaRealStorage=window.localStorage;
Object.defineProperty(window,'localStorage',{value:{getItem:function(key){return key==='st_admin_token'?'preview-admin':qaRealStorage.getItem(key)},setItem:function(key,value){if(key!=='st_admin_token')qaRealStorage.setItem(key,value)},removeItem:function(key){if(key!=='st_admin_token')qaRealStorage.removeItem(key)}}});
var qaAdminNativeFetch=window.fetch.bind(window),qaAdminConfig={version:'v8.1',enabled:false,title:'更新',content:'',announcement_enabled:false,announcement_title:'当前公告（模拟）',announcement_content:'这是模拟公告，不会修改线上内容。',announcement_comments_enabled:false,announcement_comments_public:true,announcement_comment_title:'想听听大家的意见',revision:1};
window.fetch=async function(url,init){
  if(!String(url).includes('/mg?'))return qaAdminNativeFetch(url,init);
  var action=new URL(url,location.href).searchParams.get('action');qaAdminCalls.push(action);
  if(action==='notification_config')return Response.json({config:qaAdminConfig});
  if(action==='notification_config_save'){qaAdminSaved=JSON.parse(init.body);qaAdminConfig=Object.assign({},qaAdminConfig,qaAdminSaved,{revision:qaAdminConfig.revision+1});return Response.json({config:qaAdminConfig})}
  if(action==='notification_community_config')return Response.json({config:{enabled:true,title:'成绩轨迹微信交流群',intro:'',qr_image:'/community-qr-20261024.jpg',expires_at:'',join_url:''}});
  return Response.json({ok:true,rows:[],counts:{},viewers:0,current_comments:0,total_comments:0});
};
history.replaceState(null,'',location.pathname+'?view=notices');
