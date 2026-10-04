import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'private, no-store'};
const out = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers});
async function matchedCount(userId:string) {
  try {
    const {data,error} = await db.rpc('score_tracker_trajectory_matcher_count',{p_user_id:userId});
    if(error) throw error;
    return Math.max(0,Number(data)||0);
  } catch(_) {
    // The count is informative; an older deployment without the migration must not block matching.
    return 0;
  }
}
Deno.serve(async (req:Request) => {
  if(req.method==='OPTIONS') return new Response(null,{headers});
  if(req.method!=='POST') return out({error:'请求方式不正确'},405);
  try {
    const raw = await req.text();
    if(raw.length>8192) return out({error:'请求内容过长'},413);
    const body = JSON.parse(raw);
    if(!body||typeof body!=='object'||Array.isArray(body)) return out({error:'请求内容不正确'},400);
    if(typeof body.token!=='string'||!body.token||body.token.length>512) return out({error:'请先登录'},401);
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const {data:user,error:authError} = await db.from('score_tracker_users').select('id,session_expires_at').eq('session_token_hash',hash).maybeSingle();
    if(authError) throw authError;
    if(!user?.session_expires_at || new Date(user.session_expires_at).getTime()<=Date.now()) return out({error:'登录已失效，请重新登录'},401);
    if(body.action==='sharing') {
      if(typeof body.enabled!=='boolean') return out({error:'请选择是否参与'},400);
      const {error} = await db.from('score_tracker_trajectory_sharing').upsert({user_id:user.id,enabled:body.enabled,updated_at:new Date().toISOString()});
      if(error) throw error;
      return out({enabled:body.enabled,matched_count:await matchedCount(user.id)});
    }
    if(body.action==='status') {
      const {data,error} = await db.from('score_tracker_trajectory_sharing').select('enabled').eq('user_id',user.id).maybeSingle();
      if(error) throw error;
      if(data) return out({enabled:data.enabled===true,defaulted:false,matched_count:await matchedCount(user.id)});
      const {error:defaultError} = await db.from('score_tracker_trajectory_sharing').upsert({user_id:user.id,enabled:true,updated_at:new Date().toISOString()},{onConflict:'user_id',ignoreDuplicates:true});
      if(defaultError) throw defaultError;
      return out({enabled:true,defaulted:true,matched_count:await matchedCount(user.id)});
    }
    if(body.action!=='match') return out({error:'请求内容不正确'},400);
    const subjects = body.subjects===null || body.subjects===undefined ? null : body.subjects;
    if(subjects!==null && (!Array.isArray(subjects)||subjects.length<1||subjects.length>20||subjects.some((x:unknown)=>typeof x!=='string'||!x||x.length>40)||new Set(subjects).size!==subjects.length)) return out({error:'请选择要查看的科目'},400);
    if(!['year','class','score'].includes(body.metric)||typeof body.category!=='string'||body.category.length>40) return out({error:'请选择要查看的成绩'},400);
    const mode = body.match_mode ?? 'shape';
    if(!['shape','overlap'].includes(mode)) return out({error:'请选择匹配方式'},400);
    const policy = body.reference_policy === undefined ? 'balanced' : body.reference_policy;
    const minimum = body.min_history === undefined ? 3 : body.min_history;
    if(!['balanced','long','recent'].includes(policy)) return out({error:'请选择匹配偏好'},400);
    if(!Number.isInteger(minimum)||minimum<3||minimum>1000) return out({error:'参考场次需要是 3～1000 之间的整数'},400);
    const parameters = {p_user_id:user.id,p_subjects:subjects,p_metric:body.metric,p_category:body.category};
    const configured = body.reference_policy !== undefined || body.min_history !== undefined;
    const {data,error} = configured
      ? await db.rpc('score_tracker_trajectory_match_configured',{...parameters,p_match_mode:mode,p_reference_policy:policy,p_min_history:minimum})
      : body.match_mode === undefined
      ? await db.rpc('score_tracker_trajectory_match',parameters)
      : await db.rpc('score_tracker_trajectory_match_adaptive',{...parameters,p_match_mode:mode});
    if(error) throw error;
    return out(data);
  } catch(error) {
    if(error instanceof SyntaxError) return out({error:'请求内容不正确'},400);
    console.error('trajectory request failed', (error as {code?:string}).code || 'unknown');
    return out({error:'暂时没能找到轨迹，请稍后再试'},503);
  }
});
