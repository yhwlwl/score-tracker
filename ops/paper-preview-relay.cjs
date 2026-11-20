// Bounded, fixed-destination ECS-primary upload relay for the isolated preview only.
'use strict';
const http=require('node:http');
const crypto=require('node:crypto');
const {run,savePrimaryAsset,readPrimaryAsset,withPrimaryLock,signBridgeAsset}=require('./paper-preview-mirror.cjs');
const ORIGIN='https://feat-paper-entry-analysis-fl.score-tracker-d83.pages.dev';
const IMMUTABLE_ORIGIN=/^https:\/\/[0-9a-f]{8}\.score-tracker-d83\.pages\.dev$/i;
const UPSTREAM='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-paper-credits-preview';
const MAX=3900000, ASSET_MAX=2100000;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const token=/^[A-Za-z0-9_-]{43}$/;
const base={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const safeMeta=['request_id','page','role','separate_views','expected_views','region_boxes','region_rows','page_frames','region_focus','source_path','view'];
const pendingPages=new Map();
function pick(body,extra={}){const out={token:body.token};for(const k of safeMeta)if(body[k]!==undefined)out[k]=body[k];return {...out,...extra};}
function sessionTokenHash(value){return crypto.createHash('sha256').update(String(value)).digest('hex');}
function pendingSession(requestId,tokenValue,nextPage){
  const now=Date.now(),hash=sessionTokenHash(tokenValue);let latest=null;
  for(const [key,value] of pendingPages){
    if(!key.startsWith(`${requestId}:`))continue;
    if(value.expires<=now){pendingPages.delete(key);continue;}
    const page=Number(key.slice(requestId.length+1));
    if(!Number.isInteger(page)||value.token_hash!==hash)continue;
    if(!latest||page>latest.page)latest={...value,page};
  }
  return latest&&Number(nextPage)===latest.page+1?latest:null;
}
function validMagic(mime,buf){return mime==='image/jpeg'?buf.length>=3&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff:mime==='image/png'?buf.length>=8&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/webp'?buf.length>=12&&buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP':false;}
function decodeImage(value,detail=false){
  if(typeof value!=='string'||value.length>MAX)throw Object.assign(Error('图片格式不正确'),{status:400});
  const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!m||(detail&&m[1]!=='image/jpeg')||m[2].length%4)throw Object.assign(Error('图片格式不正确'),{status:400});
  const data=Buffer.from(m[2],'base64');
  if(!data.length||data.length>ASSET_MAX||!validMagic(m[1],data))throw Object.assign(Error('无法读取这张图片'),{status:400});
  return {mime:m[1],data};
}
async function upstream(body){
  const raw=JSON.stringify(body);if(raw.length>80000)throw Object.assign(Error('请求格式不正确'),{status:400});
  const res=await fetch(UPSTREAM,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:raw,redirect:'error',signal:AbortSignal.timeout(12000)});
  const text=await res.text();if(text.length>50000)throw Error('response');
  let value;try{value=JSON.parse(text)}catch(_){throw Error('response')}
  if(!res.ok){const e=Error(value.error||'保存暂时不可用');e.status=res.status;e.value=value;throw e;}
  return value;
}
function assetInput(image){return {ecs_ref:crypto.randomUUID(),ecs_read_token:crypto.randomBytes(32).toString('base64url'),mime:image.mime,bytes:image.data.length,sha256:crypto.createHash('sha256').update(image.data).digest('hex')};}
async function persistAsset(requestId,image){
  const a=assetInput(image);a.ecs_bridge_sig=await signBridgeAsset(requestId,a.ecs_ref,a.ecs_read_token);await savePrimaryAsset(requestId,a.ecs_ref,a.ecs_read_token,a.mime,image.data,a.sha256);return a;
}
async function handleUpload(body){
  if(typeof body.token!=='string'||!body.token||body.token.length>512||!uuid.test(body.request_id||''))throw Object.assign(Error('请求格式不正确'),{status:400});
  return withPrimaryLock(body.request_id,async()=>{
  if(body.action==='upload_page'){
    const main=decodeImage(body.url),regions=Array.isArray(body.regions)?body.regions:[];
    if(regions.length>10)throw Object.assign(Error('图片局部过多'),{status:400});
    const details=regions.map(v=>decodeImage(v,true)),separate=body.separate_views===true;
    // The first page is authorized against Supabase. Subsequent sequential
    // pages reuse that short-lived, token-bound relay session so background
    // registration cannot make page 2 look like an out-of-order upload.
    const session=pendingSession(body.request_id,body.token,body.page);
    const authorized=session?{user_id:session.user_id}:await upstream(pick(body,{action:'authorize_ecs_page',detail_count:details.length}));
    if(!uuid.test(authorized.user_id||''))throw Object.assign(Error('保存权限校验未完成'),{status:503});
    const mainAsset=await persistAsset(body.request_id,main),detailAssets=[];
    for(const img of details)detailAssets.push(await persistAsset(body.request_id,img));
    // ECS is the user-visible save boundary. Database registration is batched
    // by the browser in the background, so image saving never waits for the
    // second Supabase round trip.
    const sourcePath=`${authorized.user_id}/${body.request_id}/${body.page}-${mainAsset.ecs_ref}`;
    pendingPages.set(`${body.request_id}:${body.page}`,{user_id:authorized.user_id,token_hash:sessionTokenHash(body.token),source_path:sourcePath,expected_views:separate?body.expected_views:details.length,expires:Date.now()+30*60*1000});
    while(pendingPages.size>200)pendingPages.delete(pendingPages.keys().next().value);
    return {ok:true,page:body.page,source_path:sourcePath,assets:[mainAsset,...detailAssets],sync_pending:true,storage:'aliyun_primary',separate_views:separate,expected_views:separate?body.expected_views:details.length};
  }
  if(body.action==='upload_page_view'){
    if(!Array.isArray(body.regions)||body.regions.length!==1)throw Object.assign(Error('请逐张上传局部图'),{status:400});
    const image=decodeImage(body.regions[0],true);
    const pending=pendingPages.get(`${body.request_id}:${body.page}`);
    const authorized=pending&&pending.expires>Date.now()&&pending.token_hash===sessionTokenHash(body.token)&&pending.source_path===body.source_path&&Number.isInteger(pending.expected_views)&&body.view>=0&&body.view<pending.expected_views
      ? {user_id:pending.user_id}
      : await upstream(pick(body,{action:'authorize_ecs_page_view'}));
    if(!uuid.test(authorized.user_id||''))throw Object.assign(Error('保存权限校验未完成'),{status:503});
    const saved=await persistAsset(body.request_id,image);
    return {ok:true,page:body.page,view:body.view,asset:saved,sync_pending:true,storage:'aliyun_primary'};
  }
  throw Object.assign(Error('请求格式不正确'),{status:400});
  });
}
function start(){
  const server=http.createServer(async(req,res)=>{
    if(req.url&&req.url.startsWith('/paper-preview-read?')){
      if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405,base);return res.end();}
      try{
        const u=new URL(req.url,'http://127.0.0.1'),requestId=u.searchParams.get('request_id')||'',ref=u.searchParams.get('asset')||'',cap=u.searchParams.get('token')||'';
        if(!uuid.test(requestId)||!uuid.test(ref)||!token.test(cap)||[...u.searchParams.keys()].some(k=>!['request_id','asset','token'].includes(k)))throw Error('not found');
        const asset=await readPrimaryAsset(requestId,ref,cap);
        res.writeHead(200,{...base,'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Referrer-Policy':'no-referrer','Content-Type':asset.mime,'Content-Length':String(asset.bytes),'Content-Security-Policy':"default-src 'none'",'X-Robots-Tag':'noindex, nofollow, noarchive'});
        if(req.method==='HEAD')return res.end();return res.end(asset.data);
      }catch(_){res.writeHead(404,{...base,'Content-Type':'text/plain; charset=utf-8'});return res.end('not found');}
    }
    const origin=req.headers.origin===ORIGIN||IMMUTABLE_ORIGIN.test(req.headers.origin||'')?req.headers.origin:'';
    const headers={...base,'Access-Control-Allow-Origin':origin,'Vary':'Origin'};
    function end(status,data){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8','X-Score-Storage':'aliyun-primary','X-Score-Sync':'background'});res.end(JSON.stringify(data));}
    if((req.url||'').split('?')[0]!=='/paper-preview-upload' || !origin)return end(403,{error:'无权访问'});
    if(req.method==='OPTIONS') {res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Access-Control-Max-Age':'600'});return res.end();}
    if(req.method!=='POST' || !String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return end(405,{error:'请求格式不正确'});
    if(Number(req.headers['content-length']||0)>MAX)return end(413,{error:'上传内容过大'});
    const chunks=[];let size=0;
    try {
      for await(const chunk of req){size+=chunk.length;if(size>MAX)return end(413,{error:'上传内容过大'});chunks.push(chunk);}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const value=await handleUpload(body);return end(200,value);
    }catch(e){
      if(!res.headersSent){const status=Number.isInteger(e.status)?e.status:503;return end(status,e.value||{error:status>=500?'连接暂时不可用，请重试':e.message});}
      res.destroy();
    }
  });
  server.headersTimeout=10000;server.requestTimeout=30000;server.maxConnections=12;
  server.listen(18765,'127.0.0.1');
  return server;
}
if(require.main===module){start();run().catch(()=>{console.error('paper mirror: startup failed');process.exitCode=1;process.exit(1);});}
module.exports={start,decodeImage,handleUpload};
