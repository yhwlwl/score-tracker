// Run the actual match SQL against the same anonymized snapshot used by JS replay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');const {series,match}=require('./trajectory-v2-model.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),db=new PGlite(),source=JSON.parse(fs.readFileSync(path.join(root,'private-math.json'))).filter(u=>u.target!=='excluded-test');
 const uuid=s=>s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);
 await db.exec(`create table score_tracker_trajectory_sharing(user_id uuid primary key,enabled boolean,test_all_database boolean);
 create table score_tracker_trajectory_match_exposures(owner_user_id uuid,matcher_user_id uuid,first_matched_at timestamptz,last_matched_at timestamptz,primary key(owner_user_id,matcher_user_id));
 create table snapshot(uid uuid,seq bigint,exam_date date,category text,basket text,value numeric,unrelated boolean);
 create index on snapshot(uid,seq);
 create function public.score_tracker_trajectory_points_v2(text[],text,text,uuid) returns table(uid uuid,seq bigint,exam_date date,category text,basket text,value numeric,unrelated boolean)
 language sql stable as $$ select * from public.snapshot where $3='__all__' or category=$3 $$;`);
 const points=source.flatMap(u=>u.points.map((p,i)=>({uid:uuid(u.uid),seq:i+1,exam_date:p.date,category:JSON.parse(p.ctx)[0],basket:JSON.parse(p.ctx)[1],value:p.v,unrelated:JSON.parse(p.ctx)[1]===null})));
 await db.query(`insert into snapshot select * from jsonb_to_recordset($1::jsonb) as x(uid uuid,seq bigint,exam_date date,category text,basket text,value numeric,unrelated boolean)`,[JSON.stringify(points)]);
 await db.exec('insert into score_tracker_trajectory_sharing select distinct uid,true,true from snapshot');
 const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261007074147_trajectory_eligibility_v2.sql'),'utf8');
 await db.exec(sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_match_v2'),sql.indexOf('revoke all')));
 const forecast={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'trajectory-forecast.js'),'utf8'),forecast);
 const seen=new Set(),longUsers=source.filter(u=>!u.target&&series(u.points,2).at(-1)?.length>=8).sort((a,b)=>series(b.points,2).at(-1).length-series(a.points,2).at(-1).length).filter(u=>{const fingerprint=JSON.stringify(u.points);if(seen.has(fingerprint))return false;seen.add(fingerprint);return true;});
 const candidates=[source.find(u=>u.target==='admin1'),...longUsers.slice(0,3),
 ...source.filter(u=>series(u.points,2).at(-1)?.length===2).slice(0,2)];
 const out=[];
 for(const u of candidates){
  const r=await db.query("select public.score_tracker_trajectory_match_v2($1,array['数学'],'year','__all__','shape','balanced',2,false) result",[uuid(u.uid)]),payload=r.rows[0].result;
  const own=series(u.points,2).at(-1)||[],js=match(own,source,'9999-12-31',u.uid,2);
  assert.deepEqual(payload.history,own.map(p=>p.v));assert.equal(payload.matches.length,js.length);
  const a=forecast.window.__stTrajectoryForecast.estimate(payload.history,payload.matches,'shape'),b=forecast.window.__stTrajectoryForecast.estimate(own.map(p=>p.v),js,'shape');
  if(a&&b)assert(Math.abs(a.center-b.center)<.05,'independent SQL/JS agreement within rounding tolerance');
  out.push({n:own.length,count:payload.matches.length,center:a?.center||null,reason:payload.reason});
  if(u.target==='admin1')fs.writeFileSync(path.join(root,'private-admin-v2-payload.json'),JSON.stringify(payload));
 }
 console.log(JSON.stringify({sqlSnapshotAgreement:out}));await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});
