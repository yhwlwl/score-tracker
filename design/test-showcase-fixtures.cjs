const assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite');
const {fixtures,modules,sql}=require('./showcase-question-types.cjs'),Q=require('../supabase/functions/_shared/question-types.js'),M=require('../question-type-analysis-model.js');
const core=fixtures.filter(e=>e.grade_level==='题型演示');
assert.equal(core.length,12);assert.equal(fixtures.length,16);
let entries=0,known=0;
for(const e of fixtures)for(const [subject,rows] of Object.entries(e.question_type_scores)){
  Q.validate(Q.clean(rows),e.scores[subject].rawMax,e.scores[subject].raw);
  for(const r of rows){entries++;assert(r.difficulty);assert(r.position);known++;}
}
for(const subject of Object.keys(core[0].scores)){
  const values=core.map(e=>e.scores[subject].raw),deltas=values.slice(1).map((v,i)=>v-values[i]);
  assert(deltas.some(d=>d>0)&&deltas.some(d=>d<0),subject+' must have gains and setbacks');
}
assert(core[6].total_actual_score<core[5].total_actual_score&&core[6].total_rank<core[5].total_rank,'lower marks can coexist with a better rank');
assert(fixtures.some(e=>e.is_hidden));assert(fixtures.some(e=>e.total_year_position_percent));
assert(fixtures.some(e=>Object.values(e.scores).some(s=>s.max===70&&s.rawMax===100)));
assert(fixtures.some(e=>Object.values(e.question_type_scores).flat().some(r=>r.score===null)));
assert(fixtures.some(e=>Object.values(e.question_type_scores).flat().some(r=>r.score===0)));
const english=M.analyze(core,{subject:'英语',group:'type'});assert(english.rows.find(g=>g.name==='阅读理解').change<0);assert(english.rows.find(g=>g.name==='完形填空').change>0);
assert(M.analyze(core,{subject:'数学',group:'position'}).rows.some(g=>g.difficulty==='mixed'));
(async()=>{
const db=new PGlite();await db.exec(`create table score_tracker_users(id uuid primary key,username text);create table score_tracker_exams(id uuid primary key,user_id uuid,name text,exam_date date,end_date date,grade_level text,is_hidden boolean,total_rank integer,total_participants integer,total_class_rank integer,total_class_participants integer,total_actual_score numeric,total_raw_score numeric,total_year_position_percent numeric,total_class_position_percent numeric,city_rank integer,city_participants integer,district_rank integer,district_participants integer,question_type_scores jsonb,averages jsonb,reflection text,reflection_revision integer,reflection_updated_at timestamptz,updated_at timestamptz);create table score_tracker_scores(exam_id uuid,user_id uuid,subject text,target_score numeric,actual_score numeric,max_score numeric,raw_score numeric,raw_max_score numeric,rank_position integer,participant_count integer,class_rank_position integer,class_participant_count integer,year_position_percent numeric,class_position_percent numeric,updated_at timestamptz,unique(exam_id,subject));create table score_tracker_user_goals(user_id uuid primary key,subject_goals jsonb,total_goal numeric,dream_school text,exam_date date,date_name text,updated_at timestamptz);create table score_tracker_modules(id uuid primary key,user_id uuid,name text,sort_order integer);create table score_tracker_exam_modules(exam_id uuid,user_id uuid,module_id uuid,sort_order integer,ranks jsonb,primary key(exam_id,module_id));insert into score_tracker_users values('11111111-1111-4111-8111-111111111111','showcase');insert into score_tracker_exams(id,user_id,name,grade_level) values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Original','高一');`);
for(let i=0;i<modules.length;i++)await db.query('insert into score_tracker_modules values($1,$2,$3,$4)',[modules[i].id,'11111111-1111-4111-8111-111111111111',modules[i].name,i+1]);
await db.exec(sql());await db.exec(sql());
assert.equal((await db.query('select count(*)::int as n from score_tracker_exams')).rows[0].n,17);
assert.equal((await db.query('select count(*)::int as n from score_tracker_scores')).rows[0].n,76);
assert.equal((await db.query('select count(*)::int as n from score_tracker_exam_modules')).rows[0].n,24);
assert.equal((await db.query("select name from score_tracker_exams where grade_level='高一'")).rows[0].name,'Original');
assert.equal((await db.query("select max_score,raw_max_score from score_tracker_scores where subject='生物' limit 1")).rows[0].max_score,'70');
await db.close();console.log('PASS: nonmonotonic six-subject demo, explicit metadata, grade/score divergence, coverage scenarios and idempotent scoped PostgreSQL seed ('+entries+' annotated entries)');
})().catch(e=>{console.error(e);process.exitCode=1});
