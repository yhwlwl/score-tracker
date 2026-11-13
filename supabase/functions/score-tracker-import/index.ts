import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.101.0";
import "../_shared/backup-format.js";

const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {auth:{persistSession:false,autoRefreshToken:false}});
const format = (globalThis as any).ScoreBackup;
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const out=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
async function sha(text:string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join(''); }
Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS')return out({ok:true});
  if(req.method!=='POST')return out({error:'请求方式不受支持'},405);
  try {
    if(Number(req.headers.get('content-length')||0)>format.maxBytes)return out({error:'备份文件不能超过 8 MB'},413);
    // Bound even chunked requests; do not allocate an unbounded request.text().
    const reader=req.body?.getReader(); if(!reader)return out({error:'请求内容为空'},400);
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>format.maxBytes){await reader.cancel();return out({error:'备份文件不能超过 8 MB'},413);}chunks.push(r.value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let body:any;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return out({error:'备份不是有效的 JSON 文件'},400);}
    if(!body||typeof body!=='object'||!['preview','import'].includes(body.action))return out({error:'导入操作不正确'},400);
    if(typeof body.token!=='string'||!body.token||body.token.length>512)return out({error:'请先登录'},401);
    const user=await db.from('score_tracker_users').select('id,session_expires_at').eq('session_token_hash',await sha(body.token)).maybeSingle();
    if(user.error)throw user.error;
    if(!user.data||!user.data.session_expires_at||new Date(user.data.session_expires_at).getTime()<=Date.now())return out({error:'登录已过期，请重新登录'},401);
    let backup:any;try{backup=format.normalize(body.backup);}catch(e:any){return out({error:e.message||'备份格式不正确'},400);}
    const digest=await sha(format.canonical(backup));
    if(body.action==='import'&&(body.confirmed!==true||body.digest!==digest||typeof body.restoreSettings!=='boolean'))return out({error:'请重新预览备份后确认导入'},409);
    const result=await db.rpc('score_tracker_import_backup',{p_user:user.data.id,p_backup:backup,p_preview:body.action==='preview',p_settings:body.action==='import'&&body.restoreSettings===true});
    if(result.error)throw result.error;
    return out({...result.data,digest});
  } catch(e:any) {
    console.error('backup_import_failed',String(e.code||e.name||'unknown'));
    return out({error:'导入暂时未完成，请重试。已提交的导入会自动跳过重复考试。'},500);
  }
});
