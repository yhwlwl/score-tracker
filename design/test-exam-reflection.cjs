const assert=require('node:assert/strict'),{createFixture}=require('./exam-reflection-fixture.cjs');
(async()=>{const f=await createFixture();try{
 const initial=await (await f.request({action:'get_exam_reflection'})).json();assert.equal(initial.reflection,'');assert.equal(initial.reflection_revision,0);
 const sent='数学：最后一题没来得及做。\n英语：先看问题再读文章。<img src=x onerror=alert(1)>';
 let r=await f.request({action:'save_exam_reflection',text:sent,revision:0,user_id:f.other});assert.equal(r.status,200);let data=await r.json();assert.equal(data.reflection,sent);assert.equal(data.reflection_revision,1);assert(data.reflection_updated_at);
 r=await f.request({action:'save_exam_reflection',text:sent,revision:0});assert.equal(r.status,200,'lost response replay is idempotent');assert.equal((await r.json()).reflection_revision,1);
 r=await f.request({action:'save_exam_reflection',text:'stale',revision:0});assert.equal(r.status,409);assert.equal((await r.json()).current.reflection,sent);
 let responses=await Promise.all(['设备甲','设备乙'].map(text=>f.request({action:'save_exam_reflection',text,revision:1})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409],'CAS permits one concurrent winner');
 r=await f.request({action:'get_exam_reflection',token:'other-token'});assert.equal(r.status,404);assert(!(await r.text()).includes('设备'));
 assert.equal((await f.request({action:'save_exam_reflection',token:'other-token',text:'not mine',revision:2})).status,404);
 assert.equal((await f.request({action:'get_exam_reflection',token:'bad'})).status,401);assert.equal((await f.request({action:'get_exam_reflection',examId:'bad'})).status,400);
 for(const payload of [{text:3,revision:2},{text:'x'.repeat(10001),revision:2},{text:'\0',revision:2},{text:'ok',revision:-1},{text:'ok',revision:'2'}]) assert.equal((await f.request({action:'save_exam_reflection',...payload})).status,400);
 r=await f.request({action:'save_exam_reflection',text:'',revision:2});assert.equal(r.status,200);assert.equal((await r.json()).reflection,'','clear is supported');
 await assert.rejects(()=>f.pg.query('update score_tracker_exams set reflection=$1',['x'.repeat(10001)]));
 await assert.rejects(()=>f.pg.exec('update score_tracker_exams set reflection_revision=-1'));
 const stored=await f.pg.query('select name,reflection_revision from score_tracker_exams where id=$1',[f.examId]);assert.equal(stored.rows[0].name,'隔离验收考试');assert.equal(stored.rows[0].reflection_revision,3);
 assert(f.mutations.every(m=>Object.keys(m.patch).every(k=>k.startsWith('reflection'))),'notes never rewrite scores or other exam fields');
 console.log('PASS: actual Edge + PostgreSQL migration, authenticated ownership, validation, lost-response replay, concurrent CAS, conflict payload, clearing and field isolation');
 }finally{await f.pg.close()}})().catch(e=>{console.error(e);process.exitCode=1});
