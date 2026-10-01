import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {auth:{persistSession:false,autoRefreshToken:false}});
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-score-token','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION = /^v?\d{1,4}(\.\d{1,4}){0,2}$/i;
function normalizeVersion(v) {const p=String(v).trim().replace(/^v/i,'').split('.').map(Number);while(p.length>2&&p.at(-1)===0)p.pop();if(p.length===1)p.push(0);return 'v'+p.join('.');}
async function sha(v) { const bits=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function auth(token) { if(!token)return null;const r=await db.from('score_tracker_users').select('id,is_admin,session_expires_at').eq('session_token_hash',await sha(token)).maybeSingle();if(r.error)throw r.error;return r.data?.session_expires_at&&new Date(r.data.session_expires_at).getTime()>Date.now()?r.data:null; }
async function config() { const r=await db.from('score_tracker_notification_config').select('version,enabled,title,content,tip_enabled,tip_content,announcement_enabled,announcement_title,announcement_content,revision,updated_at').eq('id',1).single();if(r.error)throw r.error;const c=r.data;c.announcement_id=(await sha(c.announcement_title+'\n'+c.announcement_content)).slice(0,24);c.tip_id=(await sha(c.tip_content)).slice(0,24);return c; }
function cleanContext(body,req) { const c=body.context||{};return {session_id:UUID.test(c.session_id)?c.session_id:null,visitor_id:UUID.test(c.visitor_id)?c.visitor_id:null,app_version:String(c.app_version||'').slice(0,30),pathname:String(c.pathname||'/mg').slice(0,300),app_page:String(c.app_page||'admin_notifications').slice(0,60),user_agent:req.headers.get('user-agent')||null,account_mode:'registered'}; }
async function audit(type,user,body,req,metadata={}) { const r=await db.from('score_tracker_visit_logs').insert({...cleanContext(body,req),event_type:type,user_id:user.id,metadata:{...metadata,source:'notification_service'}});if(r.error)throw r.error; }
function validate(body) {
  const keys=['version','title','content','tip_content','announcement_title','announcement_content'],limits={version:20,title:120,content:6000,tip_content:1000,announcement_title:120,announcement_content:6000};
  const c={};for(const k of keys){if(typeof body[k]!=='string'||body[k].length>limits[k])throw new Error('请检查内容长度');c[k]=body[k].trim();}
  if(!VERSION.test(c.version))throw new Error('版本号请填写 7.0 这样的数字');c.version=normalizeVersion(c.version);
  for(const k of ['enabled','tip_enabled','announcement_enabled']){if(typeof body[k]!=='boolean')throw new Error('请选择是否显示');c[k]=body[k];}
  if(!c.title||!c.content)throw new Error('请填写更新标题和内容');
  if(c.tip_enabled&&!c.tip_content)throw new Error('请填写提示内容');
  if(c.announcement_enabled&&(!c.announcement_title||!c.announcement_content))throw new Error('请填写公告标题和内容');
  if(!Number.isInteger(body.revision)||body.revision<1)throw new Error('请刷新后再保存');return c;
}
Deno.serve(async req => {
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},405);
  let user=null,body={},action='';
  try {
    body=req.method==='POST'?await req.json():{};action=new URL(req.url).searchParams.get('action')||String(body.action||'');
    if(action==='notice_public'&&req.method==='POST')return json({config:await config()});
    user=await auth(req.headers.get('x-score-token')||String(body.token||''));if(!user)return json({error:'登录已失效，请重新登录'},401);
    if((action.startsWith('notification_')||['feature_completion_admin','feature_option_complete','feature_option_active'].includes(action))&&!user.is_admin)return json({error:'只有管理员可以修改这些内容'},403);
    if(action==='feature_completion_admin'&&req.method==='GET'){
      const r=await db.from('score_tracker_feature_vote_options').select('id,completed_at,is_active');if(r.error)throw r.error;return json({options:r.data||[]});
    }
    if(['feature_option_complete','feature_option_active'].includes(action)&&req.method==='POST'){
      if(!UUID.test(body.id))return json({error:'请选择一个投票选项'},400);
      const before=await db.from('score_tracker_feature_vote_options').select('id,completed_at,is_active').eq('id',body.id).maybeSingle();if(before.error)throw before.error;if(!before.data)return json({error:'这个选项已不存在'},404);
      if(action==='feature_option_complete'){
        const r=await db.from('score_tracker_feature_vote_options').update({completed_at:new Date().toISOString(),is_active:false,updated_at:new Date().toISOString()}).eq('id',body.id).is('completed_at',null).select('id,completed_at');if(r.error)throw r.error;
        if(r.data?.length)await audit('feature_option_completed',user,body,req,{option_id:body.id,completed_at:r.data[0].completed_at});
        return json({ok:true});
      }
      if(typeof body.active!=='boolean')return json({error:'请选择选项状态'},400);
      if(before.data.completed_at)return json({error:'这个功能已完成，无需再开启投票'},409);
      const r=await db.from('score_tracker_feature_vote_options').update({is_active:body.active,updated_at:new Date().toISOString()}).eq('id',body.id).is('completed_at',null).select('id');if(r.error)throw r.error;
      if(!r.data?.length)return json({error:'这个功能刚刚已完成，请刷新看看'},409);
      await audit('feature_option_status_changed',user,body,req,{option_id:body.id,is_active:body.active});return json({ok:true});
    }
    if(action==='feature_completion_claim'&&req.method==='POST'){
      if(!UUID.test(body.option_id))return json({error:'无效的投票选项'},400);
      const option=await db.from('score_tracker_feature_vote_options').select('completed_at').eq('id',body.option_id).maybeSingle();if(option.error)throw option.error;
      if(!option.data?.completed_at)return json({claimed:false});
      const r=await db.from('score_tracker_feature_completion_receipts').upsert({user_id:user.id,option_id:body.option_id},{onConflict:'user_id,option_id',ignoreDuplicates:true}).select('option_id');if(r.error)throw r.error;
      if(r.data?.length){try{await audit('feature_completion_seen',user,body,req,{option_id:body.option_id,completed_at:option.data.completed_at});}catch(e){console.error('feature_completion_audit_error',e);}}
      return json({claimed:!!r.data?.length});
    }
    if(action==='notification_config'&&req.method==='GET'){const c=await config();await audit('notification_admin_viewed',user,body,req,{revision:c.revision});return json({config:c});}
    if(action==='notification_config_save'&&req.method==='POST'){
      let c;try{c=validate(body);}catch(e){await audit('notification_config_save_failed',user,body,req,{reason:e.message});return json({error:e.message},400);}
      const before=await config(),changed=Object.keys(c).filter(k=>c[k]!==before[k]);
      const saved=await db.from('score_tracker_notification_config').update({...c,revision:body.revision+1,updated_at:new Date().toISOString(),updated_by:user.id}).eq('id',1).eq('revision',body.revision).select('revision').maybeSingle();
      if(saved.error)throw saved.error;if(!saved.data){await audit('notification_config_save_failed',user,body,req,{reason:'revision_conflict'});return json({error:'内容刚刚有变化，请刷新后再保存'},409);}
      await audit('notification_config_saved',user,body,req,{version:c.version,revision:saved.data.revision,changed_fields:changed});return json({ok:true,config:await config()});
    }
    if(action==='notification_event'&&req.method==='POST'){
      if(!['notification_previewed','notification_admin_tab_opened'].includes(body.event_type))return json({error:'不支持的操作'},400);
      await audit(body.event_type,user,body,req,{kind:['release','announcement','tip'].includes(body.kind)?body.kind:null});return json({ok:true});
    }
    if(action==='notice_check'&&req.method==='POST'){
      const [c,r]=await Promise.all([config(),db.from('score_tracker_notification_receipts').select('kind,notice_id').eq('user_id',user.id).order('shown_at',{ascending:false}).limit(200)]);if(r.error)throw r.error;return json({config:c,seen:r.data||[]});
    }
    if(action==='notice_claim'&&req.method==='POST'){
      const kind=String(body.kind||''),id=String(body.notice_id||'');if(!['release','announcement','tip'].includes(kind)||id.length>40||!id)return json({error:'无效的通知'},400);
      const c=await config();if(kind==='release'&&!VERSION.test(id))return json({error:'无效的版本号'},400);
      if(kind!=='release'&&(!c[kind+'_enabled']||id!==c[kind+'_id']))return json({claimed:false});
      const r=await db.from('score_tracker_notification_receipts').upsert({user_id:user.id,kind,notice_id:kind==='release'?normalizeVersion(id):id},{onConflict:'user_id,kind,notice_id',ignoreDuplicates:true}).select('notice_id');if(r.error)throw r.error;return json({claimed:!!r.data?.length});
    }
    return json({error:'Unknown action'},400);
  } catch(e) {
    console.error('notification_service_error',action,e);
    if(user&&action==='feature_option_complete'){try{await audit('feature_option_complete_failed',user,body,req,{option_id:UUID.test(body.id)?body.id:null,reason:'server_error'});}catch(_){} }
    if(user&&action==='notification_config_save'){try{await audit('notification_config_save_failed',user,body,req,{reason:'server_error'});}catch(_){} }
    return json({error:'通知暂时无法读取，请稍后重试'},500);
  }
});
