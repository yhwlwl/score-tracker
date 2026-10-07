const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table public.score_tracker_trajectory_sharing(user_id uuid primary key,enabled boolean,test_all_database boolean default false);
 create table public.score_tracker_trajectory_match_exposures(owner_user_id uuid,matcher_user_id uuid,first_matched_at timestamptz,last_matched_at timestamptz,primary key(owner_user_id,matcher_user_id));
 create table public.score_tracker_exams(id uuid primary key,user_id uuid,exam_date date,created_at timestamptz,grade_level text,is_hidden boolean,total_year_position_percent numeric,total_rank int,total_participants int,total_class_position_percent numeric,total_class_rank int,total_class_participants int,total_actual_score numeric);
 create table public.score_tracker_scores(exam_id uuid,user_id uuid,subject text,actual_score numeric,max_score numeric,rank_position int,participant_count int,year_position_percent numeric,class_rank_position int,class_participant_count int,class_position_percent numeric,exclude_from_total boolean);
 `);
 const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007074147_trajectory_eligibility_v2.sql'),'utf8');await db.exec(migration);
 const owner='00000000-0000-4000-8000-000000000001',peer='00000000-0000-4000-8000-000000000002',off='00000000-0000-4000-8000-000000000003';
 await db.query('insert into score_tracker_trajectory_sharing values($1,true,false),($2,true,false),($3,false,false)',[owner,peer,off]);
 let serial=10;
 async function exam(user,date,category,v,subject='数学'){
   const id='00000000-0000-4000-8000-'+String(serial++).padStart(12,'0');
   await db.query('insert into score_tracker_exams(id,user_id,exam_date,created_at,grade_level,total_year_position_percent,total_participants) values($1,$2,$3,$3::date,$4,$5,100)',[id,user,date,category,v]);
   await db.query('insert into score_tracker_scores(exam_id,user_id,subject,actual_score,max_score,year_position_percent) values($1,$2,$3,80,100,$4)',[id,user,subject,v]);return id;
 }
 const ownExams=[];for(const [i,v] of [20,21,null,23,24].entries())ownExams.push(await exam(owner,'2026-01-0'+(i+1),i<3?'高一':'高二',v));
 for(const [i,v] of [40,41,null,43,44,45].entries())await exam(peer,'2026-01-0'+(i+1),'其他分类',v);
 await exam(off,'2026-01-01','高二',24);
 async function match(options={}){
   const r=await db.query('select public.score_tracker_trajectory_match_v2($1,$2,$3,$4,$5,$6,$7,$8) data',[owner,options.subjects===undefined?['数学']:options.subjects,options.metric||'year',options.category||'__all__',options.mode||'shape',options.policy||'balanced',options.min||2,options.same||false]);return r.rows[0].data;
 }
 let r=await match();assert.deepEqual(r.history,[20,21,23,24]);assert.equal(r.qualification.valid_count,4);assert.equal(r.qualification.skipped_missing,1);assert.equal(r.qualification.categories.length,2);assert.equal(r.matches.length,1);assert(r.matches[0].cross_category);assert.equal(r.history_dates.length,4);
 assert.equal((await match({same:true})).reason,'no_match','same-category only restricts references, not own history');
 r=await match({category:'高二'});assert.deepEqual(r.history,[23,24]);assert.equal(r.reason,'no_match','explicit category filters the reference pool too');
 await db.query('update score_tracker_exams set grade_level=$1 where user_id=$2',['高二',peer]);
 r=await match({category:'高二'});assert.equal(r.reason,'preliminary');assert.equal(r.qualification.formal_eligible,false);assert.equal(r.matches[0].match_score,null,'two-point direction is not advertised as near-perfect shape fit');
 await exam(owner,'2026-01-06','高二',null,'物理');
 r=await match();assert.equal(r.qualification.skipped_unrelated,1);assert.deepEqual(r.history,[20,21,23,24],'trailing unrelated exam does not hide older history');
 for(const policy of ['balanced','long','recent'])assert((await match({mode:'shape',policy})).matches.length);
 assert.equal((await match({mode:'overlap'})).reason,'no_match','levels more than 12 points apart cannot overlap');
 assert.equal((await match({min:8})).reason,'need_history');
 // A valid change of total subject basket still separates histories.
 await exam(owner,'2026-01-07','高二',25,'物理');r=await match({subjects:null});assert.deepEqual(r.history,[25]);assert.equal(r.qualification.incompatible_count,4);
 // A genuinely missing metric is skipped, even in the middle, and score/year remain independent.
 r=await match({metric:'score'});assert.equal(r.history.length,5);assert(r.qualification.formal_eligible);
 await db.query('update score_tracker_trajectory_sharing set enabled=false where user_id=$1',[owner]);assert.equal((await match()).reason,'sharing_disabled');
 await assert.rejects(()=>db.query('select public.score_tracker_trajectory_match_v2($1,null,$2,$3,$4,$5,1,false)',[peer,'year','__all__','shape','balanced']),/Invalid trajectory filters/);
 const acl=await db.query("select has_function_privilege('anon','public.score_tracker_trajectory_match_v2(uuid,text[],text,text,text,text,integer,boolean)','execute') allowed");assert.equal(acl.rows[0].allowed,false);
 await db.close();console.log('PASS SQL: actual migration, skip nulls, cross-category continuity, optional reference restriction, two-point preliminary, total basket boundaries, opt-out and privileges');
})().catch(e=>{console.error(e);process.exitCode=1});
