const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create table public.score_tracker_users(id uuid primary key);');
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261024025517_wechat_community_config.sql'),'utf8'));
    const rows=(await db.query('select config,revision from score_tracker_community_config')).rows;assert.equal(rows.length,1);assert.equal(rows[0].revision,1);assert.deepEqual(rows[0].config,{});
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='score_tracker_community_config'")).rows[0].relrowsecurity,true);
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);await assert.rejects(()=>db.query('select * from score_tracker_community_config'));await assert.rejects(()=>db.query("update score_tracker_community_config set config='{}'"));await db.exec('reset role');
    }
    await db.exec('set role service_role');assert.equal((await db.query('select * from score_tracker_community_config')).rows.length,1);await db.exec("update score_tracker_community_config set revision=2 where id=1");
    await assert.rejects(()=>db.exec('delete from score_tracker_community_config'));await db.exec('reset role');
    assert.equal((await db.query('select revision from score_tracker_community_config')).rows[0].revision,2);
    console.log('PASS: PostgreSQL singleton default-off config, RLS, public/anon/authenticated denial and limited service-role permissions');
  }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
