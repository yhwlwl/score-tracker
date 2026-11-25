// Isolated synthetic PostgreSQL fixtures; never accesses production.
const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const db=new PGlite();
const u='00000000-0000-4000-8000-000000000001',u2='00000000-0000-4000-8000-000000000002',a='00000000-0000-4000-8000-000000000011',b='00000000-0000-4000-8000-000000000012',c='00000000-0000-4000-8000-000000000013';
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261125153000_feature_vote_rounds.sql'),'utf8');
async function query(s,p=[]){return (await db.query(s,p)).rows;}
async function rpc(name,...params){return (await query('select public.'+name+'('+params.map((_,i)=>'$'+(i+1)).join(',')+') v',params))[0].v;}
(async()=>{
await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create table score_tracker_users(id uuid primary key);create table score_tracker_feature_vote_options(id uuid primary key,label text not null,description text,sort_order integer default 0,completed_at timestamptz);create table score_tracker_feature_votes(user_id uuid references score_tracker_users(id),option_id uuid references score_tracker_feature_vote_options(id));");
await query('insert into score_tracker_users values($1),($2)',[u,u2]);
await query("insert into score_tracker_feature_vote_options(id,label) values($1,'A'),($2,'B'),($3,'C')",[a,b,c]);
await query('insert into score_tracker_feature_votes values($1,$2)',[u,a]);
await db.exec(migration);
const view=()=>rpc('score_tracker_rounds_overview',u,false);
const save=(id,title,start,end,max,options,publish)=>rpc('score_tracker_round_save',id,title,start,end,max,options,publish);
const submit=(user,round,choices)=>rpc('score_tracker_round_submit',user,round,choices);
assert.equal((await view()).enabled,false);
const start=new Date(Date.now()-60000).toISOString(),end=new Date(Date.now()+86400000).toISOString(),nextEnd=new Date(Date.now()+22*86400000).toISOString();
const r=await save(null,'第一轮',start,end,2,[a,b,c],false);
assert.equal((await view()).rounds.length,0);
await save(r,'第一轮',start,end,2,[a,b,c],true);
assert.equal((await view()).enabled,true);
assert.equal((await view()).rounds[0].options[0].votes,null);
await assert.rejects(()=>submit(u,r,[a,a]),/重复/);
await assert.rejects(()=>submit(u,r,[a,b,c]),/额度/);
await assert.rejects(()=>save(null,'重叠',start,end,1,[a,b],true),/exclusion|conflicting/i);
let result=await submit(u,r,[a,b]);assert.equal(result.rounds[0].participants,1);assert.equal(result.rounds[0].totalVotes,2);
await submit(u,r,[c]);result=await view();assert.equal(result.rounds[0].totalVotes,1);assert.deepEqual(result.rounds[0].choices,[c]);
assert.equal(result.legacy.totalVotes,1);
await assert.rejects(()=>query('insert into score_tracker_feature_votes values($1,$2)',[u2,b]),/归档/);
const r2=await save(null,'第二轮',end,nextEnd,1,[a,b],true);
await assert.rejects(()=>submit(u,r2,[a]),/尚未开始/);
await query("update score_tracker_feature_vote_options set development_status='declined',development_note='不符合定位' where id=$1",[c]);
result=await view();assert.equal(result.rounds[0].options.find(x=>x.id===c).status,'declined');assert.equal(result.rounds[0].options.find(x=>x.id===c).votes,1);
await query('delete from score_tracker_users where id=$1',[u2]); // No effect on another user's ballots.
await assert.rejects(()=>save(r,'修改已发布',start,end,1,[a,b],false),/草稿/);
await db.exec('set role anon');
await assert.rejects(()=>query('select * from score_tracker_vote_round_ballots'),/permission denied/);
await db.exec('reset role');
console.log('vote-round regression passed');
await db.close();
})().catch(e=>{console.error(e);process.exitCode=1;});