import "../_shared/achievement-catalog.js";
import "../_shared/achievement-models.js";
import "../_shared/achievement-engine.js";
const catalogue=(globalThis as any).ScoreAchievements;
const engine=(globalThis as any).ScoreAchievementEngine;
const fields="badge_id,rule_version,awarded_at,seen_at,evidence";
const ids=new Set(catalogue.badges.map((b:any)=>b.id));
const canonicalId=(id:string)=>id==='contributor'?'creator':id;
// Preserve original award rows and evidence; expose one canonical achievement.
function canonicalAwards(list:any[]){
 const byId=new Map<string,any>();
 for(const a of list){
  const id=canonicalId(a.badge_id);
  if(!ids.has(id))continue;
  const prev=byId.get(id);
  const row={...a,badge_id:id};
  if(!prev){byId.set(id,row);continue}
  const first=Date.parse(row.awarded_at)<Date.parse(prev.awarded_at)?row:prev;
  const seen=prev.seen_at||row.seen_at||null;
  byId.set(id,{...first,seen_at:seen});
 }
 return [...byId.values()];
}
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
 return canonicalAwards(r.data||[]);
}
async function collection(db:any,uid:string,list:any[]) {
 const [pref,stats]=await Promise.all([db.from('score_tracker_achievement_preferences').select('favorites').eq('user_id',uid).maybeSingle(),db.rpc('score_tracker_achievement_stats_daily')]);
 if(pref.error||stats.error)console.warn('achievement_collection_metadata_unavailable');
 return {enabled:true,awards:list,favorites:pref.error||!Array.isArray(pref.data?.favorites)?null:[...new Set<string>(pref.data.favorites.map(canonicalId))].filter(x=>ids.has(x)).slice(0,3),stats:stats.error?null:stats.data};
}
export async function achievements(db:any,uid:string,body:any) {
 if(Deno.env.get('SCORE_TRACKER_ACHIEVEMENTS_ENABLED')!=='true')return {enabled:false};
 if(body.action==='achievement_favorites'){
  if(!Array.isArray(body.badgeIds)||body.badgeIds.length>3||body.badgeIds.some((x:any)=>typeof x!=='string'||!ids.has(canonicalId(x))))throw Error('invalid_favorites');
  const selected=[...new Set<string>(body.badgeIds.map(canonicalId))];
  const own=new Set((await awards(db,uid)).map((a:any)=>a.badge_id));
  if(selected.some(x=>!own.has(x)))throw Error('unowned_favorite');
  const r=await db.from('score_tracker_achievement_preferences').upsert({user_id:uid,favorites:selected,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(r.error)throw r.error;return {enabled:true,ok:true,favorites:selected};
 }
 if(body.action==='achievement_ack'){
  const requested=Array.isArray(body.badgeIds)?[...new Set<string>(body.badgeIds.filter((x:any)=>typeof x==='string').map(canonicalId).filter((x:string)=>ids.has(x)))].slice(0,ids.size):[];
  if(requested.includes('creator'))requested.push('contributor');
  if(requested.length){
   const r=await db.from('score_tracker_achievement_awards').update({seen_at:new Date().toISOString()}).eq('user_id',uid).in('badge_id',requested).is('seen_at',null);
   if(r.error)throw r.error;
  }
  return {enabled:true,ok:true};
 }
 if(body.action==='achievement_overview')return await collection(db,uid,await awards(db,uid));
 const lock=await db.rpc('score_tracker_achievement_claim_scan',{p_user:uid});
 if(lock.error)throw lock.error;
 if(!lock.data)return {...await collection(db,uid,await awards(db,uid)),retryAfter:60};
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
 return await collection(db,uid,await awards(db,uid));
}
