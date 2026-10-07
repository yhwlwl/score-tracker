const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');

(async()=>{
  const db=new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE TABLE public.score_tracker_trajectory_sharing(
      user_id uuid PRIMARY KEY, enabled boolean NOT NULL DEFAULT true, test_all_database boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.score_tracker_exams(
      id uuid PRIMARY KEY,user_id uuid NOT NULL,exam_date date NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
      grade_level text,is_hidden boolean DEFAULT false,total_year_position_percent numeric,total_class_position_percent numeric,
      total_rank integer,total_participants integer,total_class_rank integer,total_class_participants integer,total_actual_score numeric
    );
    CREATE TABLE public.score_tracker_scores(
      id uuid PRIMARY KEY,exam_id uuid NOT NULL,user_id uuid NOT NULL,subject text NOT NULL,
      actual_score numeric,max_score numeric,year_position_percent numeric,class_position_percent numeric,
      rank_position integer,participant_count integer,class_rank_position integer,class_participant_count integer,
      exclude_from_total boolean DEFAULT false
    );
    CREATE TABLE public.score_tracker_trajectory_match_exposures(
      owner_user_id uuid NOT NULL,matcher_user_id uuid NOT NULL,first_matched_at timestamptz NOT NULL,last_matched_at timestamptz NOT NULL,
      PRIMARY KEY(owner_user_id,matcher_user_id)
    );
  `);
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007190000_trajectory_history_qualification.sql'),'utf8'));
  const users={own:'00000000-0000-0000-0000-000000000001',same:'00000000-0000-0000-0000-000000000002',other:'00000000-0000-0000-0000-000000000003',total:'00000000-0000-0000-0000-000000000004'};
  await db.query(`INSERT INTO public.score_tracker_trajectory_sharing(user_id,enabled,test_all_database)
    VALUES ($1,true,true),($2,true,false),($3,true,false),($4,true,false)`,Object.values(users));
  const exams=[];
  const addExam=(user,day,category,subjects,rank,totalRank=null)=>{
    const id='10000000-0000-0000-0000-'+String(exams.length+1).padStart(12,'0');
    exams.push({id,user,day,category,subjects,rank,totalRank});
    return id;
  };
  const own1=addExam(users.own,'2026-01-01','高一',[['数学',20]]);
  addExam(users.own,'2026-01-02','高一',[['物理',60]]);
  addExam(users.own,'2026-01-03','高二',[['数学',null]]);
  addExam(users.own,'2026-01-04','高二',[['数学',30]]);
  addExam(users.same,'2026-01-01','高二',[['数学',10]]);
  addExam(users.same,'2026-01-02','高二',[['数学',20]]);
  addExam(users.same,'2026-01-03','高二',[['数学',30]]);
  addExam(users.same,'2026-01-04','高二',[['数学',35]]);
  addExam(users.other,'2026-01-01','高一',[['数学',10]]);
  addExam(users.other,'2026-01-02','高一',[['数学',20]]);
  addExam(users.other,'2026-01-03','高一',[['数学',30]]);
  addExam(users.other,'2026-01-04','高一',[['数学',35]]);
  addExam(users.total,'2026-01-01','高一',[['数学',1],['语文',1]],null,10);
  addExam(users.total,'2026-01-02','高二',[['数学',2],['语文',2]],null,20);
  addExam(users.total,'2026-01-03','高二',[['数学',3]],null,30);
  addExam(users.total,'2026-01-04','高三',[['数学',4]],null,40);
  for(const e of exams){
    await db.query(`INSERT INTO public.score_tracker_exams(id,user_id,exam_date,grade_level,total_year_position_percent,total_participants,total_actual_score)
      VALUES($1,$2,$3::date,$4,$5,100,100)`,[e.id,e.user,e.day,e.category,e.totalRank]);
    for(const [idx,s] of e.subjects.entries()) await db.query(`INSERT INTO public.score_tracker_scores
      (id,exam_id,user_id,subject,actual_score,max_score,year_position_percent,participant_count)
      VALUES($1,$2,$3,$4,80,100,$5,100)`,[
        '20000000-0000-0000-0000-'+String(exams.indexOf(e)*10+idx+1).padStart(12,'0'),e.id,e.user,s[0],s[1]
      ]);
  }
  const call=async(user,category='__all__',same=true)=>{
    const {rows}=await db.query(`SELECT public.score_tracker_trajectory_match_v2(
      $1::uuid,ARRAY['数学']::text[],'year',$2::text,$3::boolean,'shape','balanced',3,20
    ) AS result`,[user,category,same]);
    return rows[0].result;
  };
  const callTotal=async(user)=>{
    const {rows}=await db.query(`SELECT public.score_tracker_trajectory_match_v2(
      $1::uuid,NULL::text[],'year','__all__',false,'shape','balanced',3,20
    ) AS result`,[user]);
    return rows[0].result;
  };
  let result=await call(users.own);
  assert.equal(result.reason,'preliminary','two valid values are preliminary, not a formal forecast');
  assert.equal(result.history_count,2,'physics-only and missing math rank do not break valid history');
  assert.deepEqual(result.history,[20,30]);
  assert.deepEqual(result.history_dates,['2026-01-01','2026-01-04']);
  assert.equal(result.skipped_count,2,'unrelated and incomplete records are visibly counted');
  assert.equal(result.matches.length,1,'two-point preview can find a low-confidence reference');
  assert.equal(result.matches[0].match_score,null,'preliminary references do not show a match score');
  assert.equal(result.peer_category,'高二','same-category matching uses the latest valid exam category');
  const {rows:peerRows}=await db.query(`SELECT uid FROM public.score_tracker_trajectory_points_v2(
    ARRAY['数学']::text[],'year','高二',current_date,NULL,$1::uuid
  ) WHERE uid<>$1::uuid`,[users.own]);
  assert(peerRows.some(row=>row.uid===users.same),'strict category scope keeps same-category references');
  assert(!peerRows.some(row=>row.uid===users.other),'strict category scope excludes other-category references');

  await db.query(`INSERT INTO public.score_tracker_exams(id,user_id,exam_date,grade_level,total_year_position_percent,total_participants,total_actual_score)
    VALUES('10000000-0000-0000-0000-000000000017',$1,'2026-01-05','高二',35,100,100)`,[users.own]);
  await db.query(`INSERT INTO public.score_tracker_scores(id,exam_id,user_id,subject,actual_score,max_score,year_position_percent,participant_count)
    VALUES('20000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000017',$1,'数学',80,100,35,100)`,[users.own]);
  result=await call(users.own);
  assert.equal(result.reason,'matched','three valid values enable formal matching');
  assert.equal(result.preliminary,false);
  assert.equal(result.history_count,3);
  assert.equal(result.matches[0].match_score>0,true,'formal matches may carry a fit score');

  result=await call(users.own,'高二',true);
  assert.equal(result.history_count,2,'a specific own-history category stays scoped to that category');
  assert.equal(result.reason,'preliminary');
  result=await callTotal(users.total);
  assert.equal(result.history_count,2,'total trajectories do not combine different subject baskets');
  assert.deepEqual(result.history,[30,40]);
  assert.equal(result.combination_excluded_count,2);

  const callPolicy=async(user,policy,subject='数学',metric='year')=>{
    const {rows}=await db.query(`SELECT public.score_tracker_trajectory_match_v2(
      $1::uuid,ARRAY[$2]::text[],$3::text,'__all__',false,'shape',$4::text,3,20
    ) AS result`,[user,subject,metric,policy]);
    return rows[0].result;
  };
  const shortPolicies=await Promise.all(['balanced','long','recent'].map(policy=>callPolicy(users.own,policy)));
  assert.deepEqual(shortPolicies[0].matches,shortPolicies[1].matches,'with only three points all policies use the same comparison window');
  assert.deepEqual(shortPolicies[0].matches,shortPolicies[2].matches);

  // Synthetic eight-exam regression: seven usable language exams separated by
  // an unrelated physics exam. No real peer records are stored in this fixture.
  const sevenUser='00000000-0000-0000-0000-000000000100';
  let fixtureId=1,seed=739;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const insertPoint=async(user,index,subject,value)=>{
    const suffix=String(fixtureId++).padStart(12,'0'),exam='30000000-0000-0000-0000-'+suffix,score='40000000-0000-0000-0000-'+suffix;
    await db.query(`INSERT INTO public.score_tracker_exams(id,user_id,exam_date,grade_level,total_participants,total_class_participants)
      VALUES($1,$2,$3::date,'测试分类',100,100)`,[exam,user,'2026-02-'+String(index+1).padStart(2,'0')]);
    await db.query(`INSERT INTO public.score_tracker_scores(id,exam_id,user_id,subject,actual_score,max_score,year_position_percent,class_position_percent)
      VALUES($1,$2,$3,$4,$5,100,$5,$5)`,[score,exam,user,subject,value]);
  };
  await db.query(`INSERT INTO public.score_tracker_trajectory_sharing(user_id) VALUES($1)`,[sevenUser]);
  const pattern=[17,35,65,31,62,67,71];
  for(let i=0;i<8;i++)await insertPoint(sevenUser,i,i===4?'物理':'语文',i===4?50:pattern[i<4?i:i-1]);
  for(let j=0;j<24;j++){
    const peer='00000000-0000-0000-0000-'+String(200+j).padStart(12,'0');
    await db.query(`INSERT INTO public.score_tracker_trajectory_sharing(user_id) VALUES($1)`,[peer]);
    for(let i=0;i<4+j%10;i++)await insertPoint(peer,i,'语文',Math.max(1,Math.min(99,pattern[(i+j)%7]+Math.round((random()-.5)*40))));
  }
  for(const metric of ['year','class','score']){
    const language=await callPolicy(sevenUser,'balanced','语文',metric);
    assert.equal(language.visible_exam_count,8);
    assert.equal(language.history_count,7,'an unrelated physics exam must not truncate seven valid language records');
    assert.equal(language.skipped_count,1);
    assert.deepEqual(language.history_dates,['2026-02-01','2026-02-02','2026-02-03','2026-02-04','2026-02-06','2026-02-07','2026-02-08']);
  }
  const policies=await Promise.all(['balanced','long','recent'].map(policy=>callPolicy(sevenUser,policy,'语文')));
  assert(policies.every(r=>r.history_count===7&&r.matches.length>0));
  assert(policies[1].matches.some(m=>m.own_history_length>5),'long matching can use more than five own observations');
  assert(policies[2].matches.every(m=>m.own_history_length<=5),'recent matching stays within the latest three to five observations');
  assert.notDeepEqual(policies[1].matches,policies[2].matches,'policies change actual matches when longer histories are available');
  assert.notDeepEqual(policies[0].matches,policies[1].matches,'balanced fit and long-history preference make different selections on a tradeoff fixture');

  await db.close();
  console.log('PASS: skipped subjectless/missing exams, categories, preliminary mode, dates, total baskets, seven-of-eight language history, and distinct matching policies');
})().catch(error=>{console.error(error);process.exitCode=1;});
