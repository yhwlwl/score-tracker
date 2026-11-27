/* Service-only launch backfill, executed in bounded disjoint hash shards.
 * No peer identities, reflection text, usernames or scores are persisted in the ledger.
 * Each input row is evaluated by the same release engine as the live backend.
 */
const DAY='2026-11-28', SHARDS=16;
function query(i){
 if(!Number.isInteger(i)||i<0||i>=SHARDS)throw Error('invalid shard');
 return `with u as (select id,created_at from public.score_tracker_users where public.st_achievement_eligible(is_admin,username) and mod(abs(hashtextextended(id::text,0)::numeric),${SHARDS})=${i}),
 e as (select e.id,e.user_id,e.exam_date,e.created_at,e.grade_level,e.total_rank,e.total_participants,e.total_actual_score,e.total_raw_score,
 case when jsonb_typeof(to_jsonb(e.reflection))='string' then length(trim(both '"' from e.reflection::text))>0 else e.reflection is not null and regexp_replace(e.reflection::text,'[\\s{}\\[\\]"'':,]','','g')<>'' end refl
 from public.score_tracker_exams e join u on u.id=e.user_id where not coalesce(e.is_hidden,false) and e.exam_date<='${DAY}'),
 s as (select s.exam_id,jsonb_object_agg(s.subject,jsonb_build_array(s.actual_score,s.max_score,s.raw_score,s.raw_max_score,s.rank_position,s.participant_count,s.exclude_from_total,s.created_at)) scores from public.score_tracker_scores s join e on e.id=s.exam_id and e.user_id=s.user_id group by s.exam_id),
 ee as (select e.user_id,jsonb_agg(jsonb_build_array(e.id,e.exam_date,e.created_at,e.grade_level,e.total_rank,e.total_participants,e.total_actual_score,e.total_raw_score,e.refl,coalesce(s.scores,'{}'::jsonb))) exams from e left join s on s.exam_id=e.id group by e.user_id),
 pr as (select p.user_id,jsonb_agg(jsonb_build_object('model',model,'frozen_at',frozen_at,'history_exam_ids',history_exam_ids,'prediction',prediction,'result_exam_id',result_exam_id)) preds from public.score_tracker_achievement_predictions p join u on u.id=p.user_id group by p.user_id)
 select jsonb_build_array(u.id,u.created_at,exists(select 1 from public.score_tracker_user_goals g where g.user_id=u.id),coalesce(ee.exams,'[]'),coalesce(pr.preds,'[]'),(select c.published_at from public.score_tracker_centenary_accounts ca join public.score_tracker_centenary c on c.id=1 and c.published_at is not null where ca.user_id=u.id limit 1)) v from u left join ee on ee.user_id=u.id left join pr on pr.user_id=u.id`;
}
function achievedDate(e){
 const dates=[e?.date,...(e?.points||[]).map(x=>x.date),...(e?.events||[]).flatMap(x=>(x.points||[]).map(p=>p.date)),...(e?.dates||[])].filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
 return e?.achievedDate|| (e?.dateBasis==='record_unknown'?null:dates.at(-1)||null);
}
function evaluate(rows,engine,catalog){
 const ids=new Set(catalog.badges.map(b=>b.id)),out=[],counts={};let examsN=0,scoresN=0;
 for(const {v:[uid,createdAt,goal,raw,predictions,centenary]} of rows){
  const exams=raw.map(([id,exam_date,created_at,grade_level,total_rank,total_participants,total_actual_score,total_raw_score,refl,ss])=>({id,exam_date,created_at,grade_level,total_rank,total_participants,total_actual_score,total_raw_score,reflection:refl?'present':null,scores:Object.fromEntries(Object.entries(ss).map(([k,[actual,max,raw,rawMax,rank,participants,excludeFromTotal,created_at]])=>[k,{actual,max,raw,rawMax,rank,participants,excludeFromTotal,created_at}]))}));
  examsN+=exams.length;scoresN+=exams.reduce((n,e)=>n+Object.keys(e.scores).length,0);
  const hits=engine.evaluate({exams,goal:goal?{}:null,createdAt,predictions,today:DAY});
  if(centenary)hits.push({badge_id:'triple',rule_version:1,evidence:{achievedDate:new Date(Date.parse(centenary)+28800000).toISOString().slice(0,10),source:'event'}});
  for(const a of hits){if(!ids.has(a.badge_id))throw Error('unknown badge '+a.badge_id);const k=a.badge_id+':'+a.rule_version;counts[k]=(counts[k]||0)+1;
   if(a.badge_id==='first-step'||a.badge_id==='early')continue; // initialized transactionally by account trigger
   out.push([uid,a.badge_id,a.rule_version,achievedDate(a.evidence),a.evidence?.source||'evaluation']);
  }
 }
 return {out,counts,users:rows.length,examsN,scoresN};
}
function insertSQL(rows){
 const data=JSON.stringify(rows).replaceAll("'","''");
 return `with src as (select v->>0 uid,v->>1 badge,(v->>2)::int version,nullif(v->>3,'')::date achieved_date,v->>4 source from jsonb_array_elements('${data}'::jsonb) v), added as (insert into public.score_tracker_achievement_qualifications(user_id,badge_id,rule_version,achieved_date,source) select u.id,s.badge,s.version,s.achieved_date,s.source from src s join public.score_tracker_users u on u.id=s.uid::uuid on conflict do nothing returning 1) select count(*) inserted from added;`;
}
module.exports={DAY,SHARDS,query,evaluate,insertSQL};
