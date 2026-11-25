import "../_shared/achievement-catalog.js";
import "../_shared/achievement-models.js";
import "../_shared/achievement-engine.js";
const catalogue=(globalThis as any).ScoreAchievements;
const engine=(globalThis as any).ScoreAchievementEngine;
const fields="badge_id,rule_version,awarded_at,seen_at,evidence";
const ids=new Set(catalogue.badges.map((b:any)=>b.id));
async function rows(db:any,table:string,uid:string,columns:string) {
 const result:any[]=[];
 for(let start=0;;start+=500){
   const r=await db.from(table).select(columns).eq('user_id',uid).order('id').range(start,start+499);
   if(r.error)throw r.error;
   result.push(...(r.data||[]));
   if((r.data||[]).length<500)return result;
   if(start>=9500)throw new Error('achievement_scan_requires_paging');
 }
}
async function awards(db:any,uid:string) {
 const r=await db.from('score_tracker_achievement_awards').select(fields).eq('user_id',uid).order('awarded_at');
 if(r.error)throw r.error;
 return r.data||[];
}
export async function achievements(db:any,uid:string,body:any) {
 if(Deno.env.get('SCORE_TRACKER_ACHIEVEMENTS_ENABLED')!=='true')return {enabled:false};
 if(body.action==='achievement_ack'){
  const requested=Array.isArray(body.badgeIds)?[...new Set(body.badgeIds.filter((x:any)=>typeof x==='string'&&ids.has(x)))].slice(0,52):[];
  if(requested.length){
   const r=await db.from('score_tracker_achievement_awards').update({seen_at:new Date().toISOString()}).eq('user_id',uid).in('badge_id',requested).is('seen_at',null);
   if(r.error)throw r.error;
  }
  return {enabled:true,ok:true};
 }
 if(body.action==='achievement_overview')return {enabled:true,awards:await awards(db,uid)};
 const lock=await db.rpc('score_tracker_achievement_claim_scan',{p_user:uid});
 if(lock.error)throw lock.error;
 if(!lock.data)return {enabled:true,awards:await awards(db,uid),retryAfter:60};
 const already=await awards(db,uid);
 const [exams,scores,goal,user]=await Promise.all([
  rows(db,'score_tracker_exams',uid,'id,exam_date,created_at,is_hidden,grade_level,total_rank,total_participants,total_actual_score,total_raw_score,reflection'),
  rows(db,'score_tracker_scores',uid,'id,exam_id,subject,actual_score,max_score,raw_score,raw_max_score,rank_position,participant_count,exclude_from_total'),
  db.from('score_tracker_user_goals').select('user_id').eq('user_id',uid).maybeSingle(),
  db.from('score_tracker_users').select('created_at').eq('id',uid).single()
 ]);
 if(goal.error)throw goal.error;
 if(user.error)throw user.error;
 const byExam=new Map(exams.map((e:any)=>[e.id,{...e,scores:{}}]));
 for(const s of scores){const e:any=byExam.get(s.exam_id);if(e)e.scores[s.subject]={actual:s.actual_score,max:s.max_score,raw:s.raw_score,rawMax:s.raw_max_score,rank:s.rank_position,participants:s.participant_count,excludeFromTotal:s.exclude_from_total};}
 const found=engine.evaluate({exams:[...byExam.values()],goal:goal.data,createdAt:user.data?.created_at,owned:already.map((a:any)=>a.badge_id)});
 const insert=found.filter((a:any)=>catalogue.badges.some((b:any)=>b.id===a.badge_id&&b.mode==='auto')).map((a:any)=>({user_id:uid,...a}));
 if(insert.length){
  // Ignore conflicts to preserve the first award's evidence and read receipt.
  const r=await db.from('score_tracker_achievement_awards').upsert(insert,{onConflict:'user_id,badge_id',ignoreDuplicates:true});
  if(r.error)throw r.error;
 }
 return {enabled:true,awards:await awards(db,uid)};
}
