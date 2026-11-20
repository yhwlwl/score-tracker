// Preview-only replication control. The ECS private key never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false, autoRefreshToken: false } });
const PUBLIC_KEY = 'MCowBQYDK2VwAyEA7JtwHhWMyR/YVIk1XmeZtx/19Cq1LycLMd3FBTnksBE=';
const JOBS = 'score_tracker_paper_mirror_preview_jobs', NONCES = 'score_tracker_paper_mirror_preview_nonces';
const BUCKET = 'score-tracker-paper-scans', PRIMARY = 'preview-v2-primary';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256 = /^[a-f0-9]{64}$/;
const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const decode = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function query(op: PromiseLike<any>) { const {data,error} = await op; if (error) throw Error('db'); return data; }
function flatAssets(material:any) { return (material?.pages || []).flatMap((p:any)=>[p,...(p.detail_images||[])]); }
function safeAssets(material:any, user:string, requestId:string, primary=false) {
  const prefix=`${user}/${requestId}/`;
  const assets=flatAssets(material).map((p:any)=>({path:p.path,mime:p.mime,bytes:p.bytes,...(primary?{ecs_ref:p.ecs_ref,sha256:p.sha256}:{})}));
  const valid=assets.length<=165 && assets.every((p:any)=>typeof p.path==='string'&&p.path.startsWith(prefix)&&!p.path.slice(prefix.length).includes('/')&&/^[A-Za-z0-9-]+$/.test(p.path.slice(prefix.length))&&['image/jpeg','image/png','image/webp'].includes(p.mime)&&Number.isInteger(p.bytes)&&p.bytes>=1&&p.bytes<=2100000&&(!primary||(!p.ecs_ref&&!p.sha256)||(uuid.test(p.ecs_ref||'')&&sha256.test(p.sha256||''))));
  return valid?assets:null;
}
async function materialFor(job:any){ return query(db.from('score_tracker_paper_materials').select('request_id,user_id,options,pages').eq('request_id',job.request_id).eq('user_id',job.user_id).maybeSingle()); }

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST' || Number(req.headers.get('content-length') || 0) > 8192) return reply(400,{error:'invalid'});
    const raw = await req.text(); if (raw.length > 8192) return reply(400,{error:'invalid'});
    const signature = req.headers.get('x-mirror-signature') || '';
    if (!/^[A-Za-z0-9+/]{86}==$/.test(signature)) return reply(401,{error:'unauthorized'});
    const key = await crypto.subtle.importKey('spki', decode(PUBLIC_KEY), {name:'Ed25519'}, false, ['verify']);
    if (!await crypto.subtle.verify('Ed25519', key, decode(signature), new TextEncoder().encode(raw))) return reply(401,{error:'unauthorized'});
    const body = JSON.parse(raw);
    if (!uuid.test(body.nonce || '') || !Number.isInteger(body.ts) || Math.abs(Date.now() / 1000 - body.ts) > 90) return reply(401,{error:'expired'});
    if (Math.random() < .1) await db.from(NONCES).delete().lt('created_at', new Date(Date.now() - 300000).toISOString());
    const inserted = await db.from(NONCES).insert({nonce:body.nonce});
    if (inserted.error) return reply(401,{error:'replay'});

    if (body.action === 'pull') {
      const rows = await query(db.from(JOBS).select('*').lte('available_at',new Date().toISOString()).order('available_at').order('updated_at').limit(1));
      const job = rows[0]; if (!job) return reply(200,{job:null});
      if (job.operation === 'delete') return reply(200,{job});
      const material = await materialFor(job);
      if (!material || !Array.isArray(material.pages)) return reply(200,{job,error:'changed'});
      if (job.operation === 'primary') {
        if (material.options?.ecs_mirror !== PRIMARY) return reply(200,{job,error:'changed'});
        const assets=safeAssets(material,job.user_id,job.request_id,true);
        if(!assets) return reply(200,{job,error:'metadata'});
        if(!assets.length) return reply(200,{job,error:'empty'});
        // A page saved through the Supabase fallback still needs an ECS copy.
        const fallback=assets.filter((p:any)=>!p.ecs_ref), byPath=new Map();
        if(fallback.length){
          const {data,error}=await db.storage.from(BUCKET).createSignedUrls(fallback.map((p:any)=>p.path),900);
          if(error||!data||data.length!==fallback.length||data.some((p:any)=>!p.signedUrl||p.error))return reply(200,{job,error:'urls'});
          fallback.forEach((p:any,i:number)=>byPath.set(p.path,data[i].signedUrl));
        }
        return reply(200,{job,assets:assets.map((p:any)=>p.ecs_ref?p:{...p,url:byPath.get(p.path)})});
      }
      if (material.options?.ecs_mirror !== 'preview-v1') return reply(200,{job,error:'changed'});
      const assets=safeAssets(material,job.user_id,job.request_id,false);
      if (!assets) return reply(200,{job,error:'metadata'});
      let urls:any[]=[];
      if(assets.length){
        const {data,error}=await db.storage.from(BUCKET).createSignedUrls(assets.map((p:any)=>p.path),900);
        if(error||!data||data.length!==assets.length||data.some((p:any)=>!p.signedUrl||p.error))return reply(200,{job,error:'urls'});
        urls=data;
      }
      return reply(200,{job,assets:assets.map((p:any,i:number)=>({...p,url:urls[i].signedUrl}))});
    }

    if (!uuid.test(body.request_id || '')) return reply(400,{error:'invalid'});
    if (body.action === 'cleanup_stale') {
      const currentJob=await query(db.from(JOBS).select('*').eq('request_id',body.request_id).maybeSingle());
      if(!uuid.test(body.user_id||'')||(currentJob&&currentJob.user_id!==body.user_id))return reply(400,{error:'invalid'});
      const material=await materialFor({request_id:body.request_id,user_id:body.user_id}), currentPaths=new Set(flatAssets(material).map((p:any)=>p.path));
      const prefix=`${body.user_id}/${body.request_id}/`, paths=Array.isArray(body.paths)?body.paths:[];
      if(paths.length>10||paths.some((p:any)=>typeof p!=='string'||!p.startsWith(prefix)||!/^[A-Za-z0-9-]+$/.test(p.slice(prefix.length))))return reply(400,{error:'invalid'});
      const stale=paths.filter((p:string)=>!currentPaths.has(p));
      if(stale.length){const removed=await db.storage.from(BUCKET).remove(stale);if(removed.error)throw Error('storage');}
      return reply(200,{ok:true});
    }

    if (!uuid.test(body.generation || '')) return reply(400,{error:'invalid'});
    const current = await query(db.from(JOBS).select('*').eq('request_id',body.request_id).eq('generation',body.generation).maybeSingle());
    if (!current) return reply(200,{current:false});
    if (body.action === 'prepare_upload') {
      if(current.operation!=='primary'||!uuid.test(body.ecs_ref||''))return reply(400,{error:'invalid'});
      const material=await materialFor(current);
      if(!material||material.options?.ecs_mirror!==PRIMARY)return reply(200,{current:false});
      const assets=safeAssets(material,current.user_id,current.request_id,true),asset=assets?.find((p:any)=>p.ecs_ref===body.ecs_ref);
      if(!asset)return reply(200,{current:false});
      const {data,error}=await db.storage.from(BUCKET).createSignedUploadUrl(asset.path,{upsert:true});
      if(error||!data?.token||!data?.signedUrl)throw Error('storage');
      return reply(200,{current:true,path:asset.path,mime:asset.mime,bytes:asset.bytes,sha256:asset.sha256,signed_url:data.signedUrl,token:data.token});
    }
    if (body.action === 'check') return reply(200,{current:true,operation:current.operation,user_id:current.user_id});
    if (body.action === 'ack') {
      await query(db.from(JOBS).delete().eq('request_id',body.request_id).eq('generation',body.generation));
      return reply(200,{ok:true});
    }
    if (body.action === 'retry') {
      const attempts = Math.min(100,current.attempts + 1), delay = Math.min(1800,30 * 2 ** Math.min(attempts,6));
      await query(db.from(JOBS).update({attempts,available_at:new Date(Date.now()+delay*1000).toISOString()}).eq('request_id',body.request_id).eq('generation',body.generation));
      return reply(200,{ok:true});
    }
    return reply(400,{error:'invalid'});
  } catch (_) { return reply(503,{error:'unavailable'}); }
});
