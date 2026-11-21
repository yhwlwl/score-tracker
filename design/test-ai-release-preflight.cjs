const assert=require('node:assert/strict');
(async()=>{
 const {checkAiBackend,release}=await import('../tools/check-ai-release-backend.mjs');let calls=[];
 const good=async(url,init)=>{calls.push({url:String(url),body:JSON.parse(init.body)});assert(!init.headers.Authorization);return new Response(JSON.stringify({release,migration_ready:true,analysis:false,paper_entry:false,production_disabled:true,setup_guide_version:2,privacy_status_version:1}));};
 assert.equal((await checkAiBackend('https://fixture.test',good)).length,3);assert(calls.every(c=>c.body.action==='release_capabilities'));
 await assert.rejects(()=>checkAiBackend('https://fixture.test',async()=>new Response('{}',{status:401})),/已阻止生产前端发布/);
 await assert.rejects(()=>checkAiBackend('https://fixture.test',async()=>new Response(JSON.stringify({release,migration_ready:false,analysis:false}))),/尚未就绪/);
 await assert.rejects(()=>checkAiBackend('https://fixture.test',async()=>new Response(JSON.stringify({release,migration_ready:true,analysis:true}))),/尚未就绪/);
 await assert.rejects(()=>checkAiBackend('https://fixture.test',async()=>new Response(JSON.stringify({release,migration_ready:true,analysis:false}))),/统一引导后端或迁移尚未就绪/);
 console.log('PASS: production build refuses old/unmigrated/unmetered backends; capability checks use no credentials, model or account actions.');
})().catch(e=>{console.error(e);process.exitCode=1});
