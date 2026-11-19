// Preview-only replication control. The ECS private key never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false, autoRefreshToken: false } });
// Public key only; the corresponding private key is generated and retained on ECS.
const PUBLIC_KEY = 'MCowBQYDK2VwAyEA7JtwHhWMyR/YVIk1XmeZtx/19Cq1LycLMd3FBTnksBE=';
const JOBS = 'score_tracker_paper_mirror_preview_jobs', NONCES = 'score_tracker_paper_mirror_preview_nonces';
const BUCKET = 'score-tracker-paper-scans';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const decode = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function query(op: PromiseLike<any>) { const {data,error} = await op; if (error) throw Error('db'); return data; }

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST' || Number(req.headers.get('content-length') || 0) > 4096) return reply(400,{error:'invalid'});
    const raw = await req.text(); if (raw.length > 4096) return reply(400,{error:'invalid'});
    const signature = req.headers.get('x-mirror-signature') || '';
    if (!/^[A-Za-z0-9+/]{86}==$/.test(signature)) return reply(401,{error:'unauthorized'});
    const key = await crypto.subtle.importKey('spki', decode(PUBLIC_KEY), {name:'Ed25519'}, false, ['verify']);
    if (!await crypto.subtle.verify('Ed25519', key, decode(signature), new TextEncoder().encode(raw))) return reply(401,{error:'unauthorized'});
    const body = JSON.parse(raw);
    if (!uuid.test(body.nonce || '') || !Number.isInteger(body.ts) || Math.abs(Date.now() / 1000 - body.ts) > 90) return reply(401,{error:'expired'});
    // Keep the replay table bounded. A failed cleanup is harmless; a failed insert denies the request.
    if (Math.random() < .1) await db.from(NONCES).delete().lt('created_at', new Date(Date.now() - 300000).toISOString());
    const inserted = await db.from(NONCES).insert({nonce:body.nonce});
    if (inserted.error) return reply(401,{error:'replay'});

    if (body.action === 'pull') {
      const rows = await query(db.from(JOBS).select('*').lte('available_at',new Date().toISOString()).order('available_at').order('updated_at').limit(1));
      const job = rows[0]; if (!job) return reply(200,{job:null});
      if (job.operation === 'delete') return reply(200,{job});
      const material = await query(db.from('score_tracker_paper_materials').select('request_id,user_id,options,pages').eq('request_id',job.request_id).eq('user_id',job.user_id).maybeSingle());
      if (!material || material.options?.ecs_mirror !== 'preview-v1' || !Array.isArray(material.pages)) return reply(200,{job,error:'changed'});
      const assets = material.pages.flatMap((p: any) => [p,...(p.detail_images || [])]).map((p: any) => ({path:p.path,mime:p.mime,bytes:p.bytes}));
      const prefix = `${job.user_id}/${job.request_id}/`;
      if (assets.length > 165 || assets.some((p: any) => typeof p.path !== 'string' || !p.path.startsWith(prefix) || p.path.slice(prefix.length).includes('/') || !/^[A-Za-z0-9-]+$/.test(p.path.slice(prefix.length)) || !['image/jpeg','image/png','image/webp'].includes(p.mime) || !Number.isInteger(p.bytes) || p.bytes < 1 || p.bytes > 2100000)) return reply(200,{job,error:'metadata'});
      let urls: any[] = [];
      if (assets.length) {
        const {data,error} = await db.storage.from(BUCKET).createSignedUrls(assets.map((p: any) => p.path), 900);
        if (error || !data || data.length !== assets.length || data.some((p: any) => !p.signedUrl || p.error)) return reply(200,{job,error:'urls'});
        urls = data;
      }
      return reply(200,{job,assets:assets.map((p: any,i: number) => ({...p,url:urls[i].signedUrl}))});
    }
    if (!uuid.test(body.request_id || '') || !uuid.test(body.generation || '')) return reply(400,{error:'invalid'});
    const current = await query(db.from(JOBS).select('*').eq('request_id',body.request_id).eq('generation',body.generation).maybeSingle());
    if (!current) return reply(200,{current:false});
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
