// Dedicated preview worker; no image, signed URL or user token is logged.
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = process.env.PAPER_MIRROR_ROOT || '/var/lib/score-tracker-paper-preview';
const KEY_DIR = process.env.PAPER_MIRROR_KEY_DIR || '/etc/score-tracker-paper-preview';
const CONTROL = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-paper-mirror-preview';
const ORIGIN = 'https://kdwpmcdxapwecbfrvqtm.supabase.co';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const readToken = /^[A-Za-z0-9_-]{43}$/;
const sha256 = /^[a-f0-9]{64}$/;
const mimes = new Set(['image/jpeg','image/png','image/webp']);
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const fileFor = asset => digest(asset.path) + '.enc';
const primaryBase = requestId => path.join(ROOT,'primary',requestId);
const primaryData = (requestId,ref) => path.join(primaryBase(requestId),ref+'.data.enc');
const primaryMeta = (requestId,ref) => path.join(primaryBase(requestId),ref+'.meta.enc');
let keyPromise;
async function encryptionKey(){return keyPromise ||= fs.readFile(path.join(KEY_DIR,'encryption.key')).then(k=>{if(k.length!==32)throw Error('key');return k;});}

async function atomicWrite(file, bytes) {
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  const handle = await fs.open(temp, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  try { await fs.rename(temp,file); } catch (e) { await fs.unlink(temp).catch(()=>{}); throw e; }
}
function seal(key,aad,plain) {
  const iv=crypto.randomBytes(12), c=crypto.createCipheriv('aes-256-gcm',key,iv);
  c.setAAD(Buffer.from(aad)); const encrypted=Buffer.concat([c.update(plain),c.final()]);
  return Buffer.concat([Buffer.from('STP1'),iv,c.getAuthTag(),encrypted]);
}
function open(key,aad,data) {
  if(data.length<32 || data.subarray(0,4).toString()!=='STP1')throw Error('corrupt');
  const d=crypto.createDecipheriv('aes-256-gcm',key,data.subarray(4,16));
  d.setAAD(Buffer.from(aad)); d.setAuthTag(data.subarray(16,32));
  return Buffer.concat([d.update(data.subarray(32)),d.final()]);
}
async function enoughSpace() {
  await fs.mkdir(ROOT,{recursive:true,mode:0o700});
  const stat = await fs.statfs(ROOT); if(Number(stat.bavail)*Number(stat.bsize) < 6*1024**3) throw Error('disk reserve');
}
function tokenHash(token){return digest(Buffer.from(token));}
function safeEqualHex(a,b){if(!sha256.test(a||'')||!sha256.test(b||''))return false;return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
function validPrimary(requestId,ref,token,mime,bytes,hash){
  return uuid.test(requestId||'')&&uuid.test(ref||'')&&readToken.test(token||'')&&mimes.has(mime)&&Buffer.isBuffer(bytes)&&bytes.length>=1&&bytes.length<=2100000&&(!hash||sha256.test(hash));
}
async function savePrimaryAsset(requestId,ref,token,mime,bytes,expectedSha) {
  if(!validPrimary(requestId,ref,token,mime,bytes,expectedSha))throw Error('invalid primary asset');
  const hash=digest(bytes);if(expectedSha&&hash!==expectedSha)throw Error('hash');
  await enoughSpace();const key=await encryptionKey(),base=primaryBase(requestId);await fs.mkdir(base,{recursive:true,mode:0o700});
  const meta={version:1,ref,mime,bytes:bytes.length,sha256:hash,token_hash:tokenHash(token)};
  await atomicWrite(primaryData(requestId,ref),seal(key,`primary/${requestId}/${ref}/data`,bytes));
  try{await atomicWrite(primaryMeta(requestId,ref),seal(key,`primary/${requestId}/${ref}/meta`,Buffer.from(JSON.stringify(meta))));}
  catch(e){await fs.rm(primaryData(requestId,ref),{force:true});throw e;}
  return {ecs_ref:ref,ecs_read_token:token,mime,bytes:bytes.length,sha256:hash};
}
async function readPrimaryAsset(requestId,ref,token) {
  if(!uuid.test(requestId||'')||!uuid.test(ref||'')||!readToken.test(token||''))throw Error('invalid primary lookup');
  const key=await encryptionKey(),meta=JSON.parse(open(key,`primary/${requestId}/${ref}/meta`,await fs.readFile(primaryMeta(requestId,ref))).toString('utf8'));
  if(meta.ref!==ref||!mimes.has(meta.mime)||!Number.isInteger(meta.bytes)||meta.bytes<1||meta.bytes>2100000||!safeEqualHex(meta.token_hash,tokenHash(token)))throw Error('unauthorized');
  const data=open(key,`primary/${requestId}/${ref}/data`,await fs.readFile(primaryData(requestId,ref)));
  if(data.length!==meta.bytes||digest(data)!==meta.sha256)throw Error('corrupt');
  return {data,mime:meta.mime,bytes:meta.bytes,sha256:meta.sha256};
}
async function removePrimaryAsset(requestId,ref) {
  if(!uuid.test(requestId||'')||!uuid.test(ref||''))return;
  await Promise.all([fs.rm(primaryData(requestId,ref),{force:true}),fs.rm(primaryMeta(requestId,ref),{force:true})]);
}
async function prunePrimary(requestId,refs) {
  if(!uuid.test(requestId||''))throw Error('invalid request');
  const base=primaryBase(requestId),keep=new Set(refs);let names;
  try{names=await fs.readdir(base);}catch(e){if(e.code==='ENOENT')return;throw e;}
  for(const name of names){const m=/^([0-9a-f-]{36})\.(?:data|meta)\.enc$/i.exec(name);if(m&&uuid.test(m[1])&&!keep.has(m[1]))await removePrimaryAsset(requestId,m[1]);}
}

async function control(privateKey, payload) {
  const body=JSON.stringify({...payload,nonce:crypto.randomUUID(),ts:Math.floor(Date.now()/1000)});
  const signature=crypto.sign(null,Buffer.from(body),privateKey).toString('base64');
  const res=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-mirror-signature':signature},body,signal:AbortSignal.timeout(20000),redirect:'error'});
  if(!res.ok)throw Error('control unavailable');
  return res.json();
}
async function download(asset) {
  const url = new URL(asset.url);
  if (url.origin !== ORIGIN || !url.pathname.startsWith('/storage/v1/object/sign/score-tracker-paper-scans/')) throw Error('url');
  const res=await fetch(url,{signal:AbortSignal.timeout(120000),redirect:'error'});
  if(!res.ok || Number(res.headers.get('content-length') || 0)>2100000)throw Error('download');
  const chunks=[]; let size=0;
  for await(const chunk of res.body){size+=chunk.length;if(size>2100000)throw Error('size');chunks.push(chunk);}
  const data=Buffer.concat(chunks); if(data.length!==asset.bytes)throw Error('size'); return data;
}
async function uploadBackup(privateKey,job,asset,bytes){
  const prepared=await control(privateKey,{action:'prepare_upload',request_id:job.request_id,generation:job.generation,ecs_ref:asset.ecs_ref});
  if(!prepared.current) return {stale:true};
  if(prepared.bytes!==bytes.length||prepared.mime!==asset.mime||prepared.sha256!==digest(bytes)||prepared.path!==asset.path||typeof prepared.token!=='string')throw Error('upload metadata');
  const url=new URL(prepared.signed_url,ORIGIN);
  if(url.origin!==ORIGIN||!url.pathname.startsWith('/storage/v1/object/upload/sign/score-tracker-paper-scans/'))throw Error('upload url');
  if(!url.searchParams.get('token'))url.searchParams.set('token',prepared.token);
  const res=await fetch(url,{method:'PUT',headers:{'content-type':asset.mime,'x-upsert':'true'},body:bytes,redirect:'error',signal:AbortSignal.timeout(120000)});
  if(!res.ok)throw Error('backup upload');
  return {path:asset.path};
}
async function cleanupStale(privateKey,requestId,paths){
  for(let i=0;i<paths.length;i+=10)await control(privateKey,{action:'cleanup_stale',request_id:requestId,paths:paths.slice(i,i+10)});
}
async function processJob(privateKey, encKey, payload) {
  const {job,assets=[]}=payload;
  if(!job || !uuid.test(job.request_id||'') || !uuid.test(job.user_id||'') || !uuid.test(job.generation||''))throw Error('invalid job');
  const base=path.join(ROOT,job.user_id,job.request_id), identity={request_id:job.request_id,generation:job.generation};
  const current=await control(privateKey,{action:'check',...identity});
  if(!current.current || current.user_id!==job.user_id || current.operation!==job.operation)return;
  if(job.operation==='delete') {
    await Promise.all([fs.rm(base,{recursive:true,force:true}),fs.rm(primaryBase(job.request_id),{recursive:true,force:true})]);
    await control(privateKey,{action:'ack',...identity}); return;
  }
  if(!Array.isArray(assets)||assets.length>165)throw Error('invalid job');
  if(job.operation==='primary')throw Error('use primary worker');
  if(job.operation!=='sync')throw Error('invalid job');
  await fs.mkdir(base,{recursive:true,mode:0o700});
  const expected=new Set(), manifest=[];
  for(const asset of assets){
    if(typeof asset.path!=='string' || !asset.path.startsWith(`${job.user_id}/${job.request_id}/`) || !Number.isInteger(asset.bytes) || asset.bytes<1 || asset.bytes>2100000)throw Error('invalid asset');
    const name=fileFor(asset),file=path.join(base,name),aad=`${job.user_id}/${job.request_id}/${name}`; expected.add(name);
    let bytes;
    try { bytes=open(encKey,aad,await fs.readFile(file));if(bytes.length!==asset.bytes)throw Error('size'); }
    catch (_) { await enoughSpace();bytes=await download(asset);await atomicWrite(file,seal(encKey,aad,bytes)); }
    manifest.push({path:asset.path,mime:asset.mime,bytes:asset.bytes,sha256:digest(bytes),file:name});
  }
  const still=await control(privateKey,{action:'check',...identity}); if(!still.current)return;
  await atomicWrite(path.join(base,'manifest.enc'),seal(encKey,`${job.user_id}/${job.request_id}/manifest`,Buffer.from(JSON.stringify({version:1,assets:manifest}))));
  for(const name of await fs.readdir(base)) if(/^[a-f0-9]{64}\.enc$/.test(name) && !expected.has(name)) await fs.unlink(path.join(base,name));
  await control(privateKey,{action:'ack',...identity});
}
async function readPrimaryMetaToken(requestId,ref){
  // The capability token itself is intentionally not stored. Background backup
  // does not need it for authorization, so use an internal path that reads data
  // without capability verification.
  const key=await encryptionKey(),meta=JSON.parse(open(key,`primary/${requestId}/${ref}/meta`,await fs.readFile(primaryMeta(requestId,ref))).toString('utf8'));
  if(meta.ref!==ref||!mimes.has(meta.mime)||!sha256.test(meta.sha256||''))throw Error('corrupt');
  const data=open(key,`primary/${requestId}/${ref}/data`,await fs.readFile(primaryData(requestId,ref)));
  if(data.length!==meta.bytes||digest(data)!==meta.sha256)throw Error('corrupt');
  return {internal:true,data,mime:meta.mime,bytes:meta.bytes,sha256:meta.sha256};
}
async function primaryInternal(requestId,ref){
  const x=await readPrimaryMetaToken(requestId,ref);return x;
}
async function run() {
  const privateKey=await fs.readFile(path.join(KEY_DIR,'worker.pem'));
  const encKey=await encryptionKey();
  await fs.mkdir(ROOT,{recursive:true,mode:0o700});
  for(;;){
    let payload;
    try { payload=await control(privateKey,{action:'pull'});if(payload.error)throw Error('job unavailable');
      if(payload.job){
        if(payload.job.operation==='primary'){
          const assets=payload.assets||[],resolved=[];
          for(const a of assets){const local=await primaryInternal(payload.job.request_id,a.ecs_ref);resolved.push({...a,_local:local});}
          await processPrimaryJob(privateKey,payload.job,resolved);
        } else await processJob(privateKey,encKey,payload);
      }
    } catch (_) {
      if(payload?.job) await control(privateKey,{action:'retry',request_id:payload.job.request_id,generation:payload.job.generation}).catch(()=>{});
      console.error('paper mirror: a sync attempt failed; it will be retried');
    }
    await sleep(payload?.job ? 1000 : 30000);
  }
}
async function processPrimaryJob(privateKey,job,assets){
  if(!job||job.operation!=='primary'||!uuid.test(job.request_id||'')||!uuid.test(job.user_id||'')||!uuid.test(job.generation||'')||!Array.isArray(assets)||assets.length>165)throw Error('invalid primary job');
  const identity={request_id:job.request_id,generation:job.generation},current=await control(privateKey,{action:'check',...identity});
  if(!current.current||current.user_id!==job.user_id||current.operation!=='primary')return;
  const refs=new Set(),uploaded=[];
  for(const asset of assets){
    if(typeof asset.path!=='string'||!asset.path.startsWith(`${job.user_id}/${job.request_id}/`)||!uuid.test(asset.ecs_ref||'')||!sha256.test(asset.sha256||'')||refs.has(asset.ecs_ref))throw Error('invalid asset');
    refs.add(asset.ecs_ref);const local=asset._local;
    if(!local||local.bytes!==asset.bytes||local.mime!==asset.mime||local.sha256!==asset.sha256)throw Error('local mismatch');
    const result=await uploadBackup(privateKey,job,asset,local.data);if(result.stale){await cleanupStale(privateKey,job.request_id,uploaded);return;}uploaded.push(result.path);
  }
  const still=await control(privateKey,{action:'check',...identity});
  if(!still.current){await cleanupStale(privateKey,job.request_id,uploaded);return;}
  await prunePrimary(job.request_id,refs);await control(privateKey,{action:'ack',...identity});
}
if(require.main===module)run().catch(()=>{console.error('paper mirror: startup failed');process.exitCode=1;});
module.exports={seal,open,processJob,processPrimaryJob,fileFor,run,savePrimaryAsset,readPrimaryAsset,removePrimaryAsset,primaryInternal,prunePrimary};
