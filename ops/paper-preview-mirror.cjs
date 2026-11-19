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
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const fileFor = asset => digest(asset.path) + '.enc';

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
async function enoughSpace() {
  const stat = await fs.statfs(ROOT); if(Number(stat.bavail)*Number(stat.bsize) < 6*1024**3) throw Error('disk reserve');
}
async function processJob(privateKey, encKey, payload) {
  const {job,assets=[]}=payload;
  if(!job || !uuid.test(job.request_id||'') || !uuid.test(job.user_id||'') || !uuid.test(job.generation||''))throw Error('invalid job');
  const base=path.join(ROOT,job.user_id,job.request_id), identity={request_id:job.request_id,generation:job.generation};
  const current=await control(privateKey,{action:'check',...identity});
  if(!current.current || current.user_id!==job.user_id || current.operation!==job.operation)return;
  if(job.operation==='delete') { await fs.rm(base,{recursive:true,force:true}); await control(privateKey,{action:'ack',...identity}); return; }
  if(job.operation!=='sync' || !Array.isArray(assets) || assets.length>165)throw Error('invalid job');
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
  // Prune only files owned by this exact record after a complete replacement is durable.
  for(const name of await fs.readdir(base)) if(/^[a-f0-9]{64}\.enc$/.test(name) && !expected.has(name)) await fs.unlink(path.join(base,name));
  await control(privateKey,{action:'ack',...identity});
}
async function run() {
  const privateKey=await fs.readFile(path.join(KEY_DIR,'worker.pem'));
  const encKey=await fs.readFile(path.join(KEY_DIR,'encryption.key'));if(encKey.length!==32)throw Error('key');
  await fs.mkdir(ROOT,{recursive:true,mode:0o700});
  for(;;){
    let payload;
    try { payload=await control(privateKey,{action:'pull'});if(payload.error)throw Error('job unavailable');if(payload.job)await processJob(privateKey,encKey,payload); }
    catch (_) {
      if(payload?.job) await control(privateKey,{action:'retry',request_id:payload.job.request_id,generation:payload.job.generation}).catch(()=>{});
      console.error('paper mirror: a sync attempt failed; it will be retried');
    }
    await sleep(payload?.job ? 1000 : 30000);
  }
}
if(require.main===module)run().catch(()=>{console.error('paper mirror: startup failed');process.exitCode=1;});
module.exports={seal,open,processJob,fileFor,run};
