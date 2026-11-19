'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const http=require('node:http');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table public.score_tracker_paper_materials(request_id uuid primary key,user_id uuid not null,options jsonb not null,pages jsonb not null);`);
  for(const migration of ['20261119144358_paper_preview_ecs_mirror.sql','20261119151110_paper_preview_mirror_preserve_enrollment.sql','20261119163000_paper_preview_ecs_primary.sql'])
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/'+migration),'utf8'));
  const user=crypto.randomUUID(), id=crypto.randomUUID();
  await db.query('insert into public.score_tracker_paper_materials values ($1,$2,$3,$4)',[id,user,{},[]]);
  assert.equal((await db.query('select * from public.score_tracker_paper_mirror_preview_jobs')).rows.length,0,'production rows must not enqueue');
  await db.query("update public.score_tracker_paper_materials set options = '{\"ecs_mirror\":\"preview-v1\"}' where request_id=$1",[id]);
  let job=(await db.query('select * from public.score_tracker_paper_mirror_preview_jobs')).rows[0];
  assert.equal(job.operation,'sync');const old=job.generation;
  await db.query("update public.score_tracker_paper_materials set options = '{\"ecs_mirror\":\"preview-v2-primary\"}' where request_id=$1",[id]);
  job=(await db.query('select * from public.score_tracker_paper_mirror_preview_jobs')).rows[0];assert.equal(job.operation,'primary');
  await db.query("update public.score_tracker_paper_materials set options = '{}' where request_id=$1",[id]);
  let material=(await db.query('select options from public.score_tracker_paper_materials where request_id=$1',[id])).rows[0];
  assert.equal(material.options.ecs_mirror,'preview-v2-primary','old clients must preserve v2 enrollment');
  await db.query("update public.score_tracker_paper_materials set pages = '[{\"page\":1}]' where request_id=$1",[id]);
  job=(await db.query('select * from public.score_tracker_paper_mirror_preview_jobs')).rows[0];assert.equal(job.operation,'primary');assert.notEqual(job.generation,old);
  await db.query('delete from public.score_tracker_paper_materials where request_id=$1',[id]);
  job=(await db.query('select * from public.score_tracker_paper_mirror_preview_jobs')).rows[0];assert.equal(job.operation,'delete');assert.equal(job.user_id,user);
  await db.close();

  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'paper-mirror-test-')),keys=await fsp.mkdtemp(path.join(os.tmpdir(),'paper-mirror-keys-'));
  process.env.PAPER_MIRROR_ROOT=root;process.env.PAPER_MIRROR_KEY_DIR=keys;
  const encKey=crypto.randomBytes(32);await fsp.writeFile(path.join(keys,'encryption.key'),encKey);
  fsp.statfs=async()=>({bavail:10*1024*1024,bsize:1024});
  const mirror=require('../ops/paper-preview-mirror.cjs');
  const {seal,open,fileFor,processJob,processPrimaryJob,savePrimaryAsset,readPrimaryAsset,primaryInternal}=mirror;
  const plain=Buffer.from('private image'),aad='a',encrypted=seal(encKey,aad,plain);
  assert(!encrypted.includes(plain));assert.deepEqual(open(encKey,aad,encrypted),plain);
  const tampered=Buffer.from(encrypted);tampered[tampered.length-1]^=1;assert.throws(()=>open(encKey,aad,tampered));assert.throws(()=>open(encKey,'other',encrypted));

  const request=crypto.randomUUID(),owner=crypto.randomUUID(),generation=crypto.randomUUID(),ref=crypto.randomUUID(),cap=crypto.randomBytes(32).toString('base64url');
  const data=Buffer.from([0xff,0xd8,0xff,0xdb,1,2,3,4]),hash=crypto.createHash('sha256').update(data).digest('hex');
  const primary=await savePrimaryAsset(request,ref,cap,'image/jpeg',data,hash);
  assert.deepEqual((await readPrimaryAsset(request,ref,cap)).data,data);
  await assert.rejects(readPrimaryAsset(request,ref,crypto.randomBytes(32).toString('base64url')));
  const local=await primaryInternal(request,ref);assert.equal(local.sha256,hash);

  const pair=crypto.generateKeyPairSync('ed25519'),priv=pair.privateKey.export({format:'pem',type:'pkcs8'}),calls=[],uploaded=[];
  const asset={path:`${owner}/${request}/1-${ref}`,bytes:data.length,mime:'image/jpeg',ecs_ref:ref,sha256:hash,_local:local};
  global.fetch=async(url,opt)=>{
    if(String(url).includes('/functions/v1/')){
      assert(crypto.verify(null,Buffer.from(opt.body),pair.publicKey,Buffer.from(opt.headers['x-mirror-signature'],'base64')));
      const b=JSON.parse(opt.body);calls.push(b.action);
      if(b.action==='check')return Response.json({current:true,operation:'primary',user_id:owner});
      if(b.action==='prepare_upload')return Response.json({current:true,path:asset.path,mime:asset.mime,bytes:asset.bytes,sha256:asset.sha256,signed_url:'https://kdwpmcdxapwecbfrvqtm.supabase.co/storage/v1/object/upload/sign/score-tracker-paper-scans/test',token:'signed-token'});
      return Response.json({ok:true});
    }
    assert(String(url).includes('/storage/v1/object/upload/sign/score-tracker-paper-scans/test?token=signed-token'));assert.equal(opt.method,'PUT');
    uploaded.push(Buffer.from(opt.body));return new Response('{}',{status:200});
  };
  await processPrimaryJob(priv,{request_id:request,user_id:owner,generation,operation:'primary'},[asset]);
  assert.deepEqual(uploaded,[data]);assert(calls.includes('prepare_upload'));assert(calls.includes('ack'));

  const legacyRequest=crypto.randomUUID(),legacyOwner=crypto.randomUUID(),legacyGeneration=crypto.randomUUID(),legacyData=Buffer.from('synthetic page');
  const legacyAsset={path:`${legacyOwner}/${legacyRequest}/1-${crypto.randomUUID()}`,bytes:legacyData.length,mime:'image/jpeg',url:'https://kdwpmcdxapwecbfrvqtm.supabase.co/storage/v1/object/sign/score-tracker-paper-scans/test?token=fake'};
  global.fetch=async(url,opt)=>{
    if(String(url).includes('/functions/v1/')){const b=JSON.parse(opt.body);return Response.json(b.action==='check'?{current:true,operation:'sync',user_id:legacyOwner}:{ok:true});}
    assert.equal(String(url),legacyAsset.url);return new Response(legacyData);
  };
  await processJob(priv,encKey,{job:{request_id:legacyRequest,user_id:legacyOwner,generation:legacyGeneration,operation:'sync'},assets:[legacyAsset]});
  const legacyFolder=path.join(root,legacyOwner,legacyRequest),raw=await fsp.readFile(path.join(legacyFolder,fileFor(legacyAsset)));
  assert(!raw.includes(legacyData),'legacy private mirror stays encrypted');

  const {start}=require('../ops/paper-preview-relay.cjs');let actions=[],captured;
  global.fetch=async(url,opt)=>{
    assert.equal(String(url),'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-paper-credits-preview');
    const body=JSON.parse(opt.body);actions.push(body.action);
    if(body.action==='prepare_ecs_page'){captured=body.asset;return Response.json({ok:true,page:1,source_path:`${owner}/${body.request_id}/1-${body.asset.ecs_ref}`});}
    return Response.json({ok:true});
  };
  const relay=start();await new Promise(resolve=>relay.once('listening',resolve));
  const post=(origin,body,method='POST',route='/paper-preview-upload')=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:18765,path:route,method,headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{let out='';res.on('data',v=>out+=v);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:out}));});req.on('error',reject);req.end(body);
  });
  const get=route=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:18765,path:route,method:'GET'},res=>{const chunks=[];res.on('data',v=>chunks.push(v));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});
  const origin='https://feat-paper-entry-analysis-fl.score-tracker-d83.pages.dev',relayRequest=crypto.randomUUID(),jpg='data:image/jpeg;base64,'+data.toString('base64');
  assert.equal((await post('https://attacker.test',JSON.stringify({action:'upload_page',token:'fake'}))).status,403);
  assert.equal((await post(origin,JSON.stringify({action:'delete',token:'fake'}))).status,400);
  assert.equal((await post(origin,'','GET')).status,405);
  const ok=await post(origin,JSON.stringify({action:'upload_page',token:'fake',request_id:relayRequest,page:1,role:'paper',url:jpg,regions:[]}));
  assert.equal(ok.status,200);assert.deepEqual(actions,['authorize_ecs_page','prepare_ecs_page']);assert(captured&&captured.ecs_ref&&captured.ecs_read_token);
  const read=await get('/paper-preview-read?request_id='+relayRequest+'&asset='+captured.ecs_ref+'&token='+captured.ecs_read_token);
  assert.equal(read.status,200);assert.deepEqual(read.body,data);
  assert.equal((await get('/paper-preview-read?request_id='+relayRequest+'&asset='+captured.ecs_ref+'&token='+crypto.randomBytes(32).toString('base64url'))).status,404);
  await new Promise(resolve=>relay.close(resolve));
  await fsp.rm(root,{recursive:true,force:true});await fsp.rm(keys,{recursive:true,force:true});
  console.log('paper preview mirror: v1 compatibility, v2 primary queue, encrypted local storage, capability reads, signed backup and relay allowlists passed');
})().catch(e=>{console.error(e);process.exitCode=1});