import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow, noarchive'};
const out=(v:any,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
async function sha(v:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function auth(token:string){if(!token)return null;const {data,error}=await db.from('score_tracker_users').select('id,is_admin,session_expires_at').eq('session_token_hash',await sha(token)).maybeSingle();if(error)throw error;if(!data?.is_admin||!data.session_expires_at||new Date(data.session_expires_at).getTime()<Date.now())return null;return data}
Deno.serve(async req=>{
  if(req.method!=='GET')return out({error:'method_not_allowed'},405);
  try{
    const admin=await auth(req.headers.get('x-score-token')||'');
    if(!admin)return out({error:'unauthorized'},401);
    const url=new URL(req.url);
    const requested=Number(url.searchParams.get('days')||7);
    const days=Math.max(1,Math.min(90,Number.isFinite(requested)?Math.trunc(requested):7));
    // 主分析和补充分析并行读取。补充分析是可选项，旧环境尚未迁移时不影响主面板。
    const [mainResult, moreResult]=await Promise.all([
      db.rpc('score_tracker_admin_dashboard_metrics',{p_days:days}),
      db.rpc('score_tracker_admin_dashboard_more',{p_days:days})
    ]);
    let result=mainResult;
    // 迁移尚未同步时保留旧口径，避免后台整体不可用；同步后始终走完整分析函数。
    if(result.error){
      result=await db.rpc('score_tracker_admin_exact_metrics');
      if(result.error)throw result.error;
    }
    const metrics={...(result.data||{}),...(!moreResult.error?(moreResult.data||{}):{})};
    return out({...metrics,
      analytics_window_days:Number(metrics.analytics_window_days||days),
      timeseries:metrics.timeseries||metrics.trend||metrics.events_by_day||[],
      pages_all:metrics.pages_all||metrics.pages||metrics.pages_7d||[],
      sources_all:metrics.sources_all||metrics.sources||metrics.sources_7d||[],
      cities_all:metrics.cities_all||metrics.cities||metrics.cities_7d||[],
      devices_all:metrics.devices_all||metrics.devices||metrics.devices_7d||[],
      versions_all:metrics.versions_all||metrics.versions||metrics.versions_7d||[]
    });
  }catch(e){
    console.error(e);
    return out({error:e instanceof Error?e.message:'metrics_unavailable'},500);
  }
});
