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
// Mirror only the original event eligibility, using one canonical collection badge.
async function syncCentenaryAward(db:any,uid:string,list:any[]){
 const existing=list.find((a:any)=>a.badge_id==='triple');
 if(existing?.seen_at)return;
 const [milestone,qualification]=await Promise.all([
  db.from('score_tracker_centenary').select('published_at').eq('id',1).maybeSingle(),
  db.from('score_tracker_centenary_accounts').select('registration_position,seen_at').eq('user_id',uid).maybeSingle()
 ]);
 if(milestone.error||qualification.error){console.warn('achievement_centenary_unavailable');return;}
 const published=milestone.data?.published_at,entry=qualification.data;
 if(!published||!entry)return;
 if(existing){
  if(entry.seen_at){
   const r=await db.from('score_tracker_achievement_awards').update({seen_at:entry.seen_at}).eq('user_id',uid).eq('badge_id','triple').is('seen_at',null);
   if(r.error)console.warn('achievement_centenary_receipt_sync_failed');
  }
  return;
 }
 const achievedDate=new Date(Date.parse(published)+8*3600000).toISOString().slice(0,10);
 const r=await db.from('score_tracker_achievement_awards').upsert({user_id:uid,badge_id:'triple',rule_version:1,awarded_at:published,seen_at:entry.seen_at??null,evidence:{kind:'event',source:'centenary',verified:true,achievedDate,dateBasis:'event',registrationPosition:entry.registration_position}},{onConflict:'user_id,badge_id',ignoreDuplicates:true});
 if(r.error)console.warn('achievement_centenary_sync_failed');
}
function qualificationDate(e:any){
 if(e?.dateBasis==='record_unknown')return null;
 if(typeof e?.achievedDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.achievedDate))return e.achievedDate;
 return [e?.date,...(e?.points||[]).map((x:any)=>x.date),...(e?.events||[]).flatMap((x:any)=>(x.points||[]).map((p:any)=>p.date)),...(e?.dates||[])].filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)).sort().at(-1)||null;
}
async function persistQualifications(db:any,uid:string,found:any[]){
 const input=found.filter(a=>ids.has(a.badge_id)).map(a=>({user_id:uid,badge_id:a.badge_id,rule_version:a.rule_version,achieved_date:qualificationDate(a.evidence),source:a.evidence?.source||'evaluation'}));
 if(!input.length)return;
 const r=await db.from('score_tracker_achievement_qualifications').upsert(input,{onConflict:'user_id,badge_id,rule_version',ignoreDuplicates:true});
 if(r.error)throw r.error;
}
async function collection(db:any,uid:string,list:any[],pilot=false) {
 const [pref,stats]=await Promise.all([db.from('score_tracker_achievement_preferences').select('favorites').eq('user_id',uid).maybeSingle(),pilot?Promise.resolve({data:null,error:null}):db.rpc('score_tracker_achievement_live_stats')]);
 if(pref.error||stats.error)console.warn('achievement_collection_metadata_unavailable');
 return {enabled:true,awards:list,favorites:pref.error||!Array.isArray(pref.data?.favorites)?null:[...new Set<string>(pref.data.favorites.map(canonicalId))].filter(x=>ids.has(x)).slice(0,3),stats:stats.error?null:stats.data,pilot};
}
export async function achievements(db:any,uid:string,body:any,qualificationOnly=false) {
 // Only release-v2 clients activate the new endpoint. Old production pages remain unchanged.
 if(body.achievement_release!==2)return {enabled:false};
 const mode=Deno.env.get('SCORE_TRACKER_ACHIEVEMENTS_V2_ENABLED')??'true';
 const pilot=mode==='pilot';
 if(mode!=='true'&&(!pilot||!(Deno.env.get('SCORE_TRACKER_ACHIEVEMENT_PILOT_USERS')||'').split(',').map(x=>x.trim()).includes(uid)))return {enabled:false};
 if(body.action==='achievement_admin_grant'){
  const actor=await db.from('score_tracker_users').select('is_admin').eq('id',uid).single();
  if(actor.error)throw actor.error;if(actor.data?.is_admin!==true)throw Error('admin_required');
  const badgeId=String(body.badgeId||''),definition=catalogue.badges.find((b:any)=>b.id===badgeId&&b.mode==='manual');
  if(!definition||typeof body.username!=='string'||!body.username.trim()||body.username.length>40||body.confirmed!==true)throw Error('invalid_grant');
  const date=String(body.eventDate||'');const now=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date>now)throw Error('invalid_event_date');
  const target=await db.from('score_tracker_users').select('id').eq('username',body.username.trim()).maybeSingle();
  if(target.error)throw target.error;if(!target.data)throw Error('account_not_found');
  const r=await db.from('score_tracker_achievement_awards').upsert({user_id:target.data.id,badge_id:badgeId,rule_version:2,evidence:{kind:'event',source:'manual',verified:true,date,achievedDate:date,label:definition.name+' · 管理员确认'}},{onConflict:'user_id,badge_id',ignoreDuplicates:true});
  if(r.error)throw r.error;return {ok:true,enabled:true};
 }
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
 if(body.action==='achievement_overview')return await collection(db,uid,await awards(db,uid),pilot);
 if(!qualificationOnly){const lock=await db.rpc('score_tracker_achievement_claim_scan',{p_user:uid});
 if(lock.error)throw lock.error;
 if(!lock.data)return {...await collection(db,uid,await awards(db,uid),pilot),retryAfter:60};}
 let already=await awards(db,uid);
 if(!qualificationOnly){await syncCentenaryAward(db,uid,already);already=await awards(db,uid);}
 const firstStep=already.find((a:any)=>a.badge_id==='first-step');
 const needFirstUse=!firstStep||firstStep.rule_version<2;
 const needMatch=!already.some((a:any)=>a.badge_id==='unique-path'&&a.rule_version===2);
 const [exams,scores,goal,user,firstVisit,predictions]=await Promise.all([
  rows(db,'score_tracker_exams',uid,'id,exam_date,created_at,is_hidden,grade_level,total_rank,total_participants,total_actual_score,total_raw_score,reflection'),
  rows(db,'score_tracker_scores',uid,'id,exam_id,subject,actual_score,max_score,raw_score,raw_max_score,rank_position,participant_count,exclude_from_total,created_at'),
  db.from('score_tracker_user_goals').select('user_id').eq('user_id',uid).maybeSingle(),
  db.from('score_tracker_users').select('created_at').eq('id',uid).single(),
  needFirstUse?db.from('score_tracker_visit_logs').select('occurred_at').eq('user_id',uid).in('event_type',['app_page_view','page_view']).order('occurred_at',{ascending:true}).limit(1).maybeSingle():Promise.resolve({data:null,error:null}),
  needMatch?db.from('score_tracker_achievement_predictions').select('model,context_key,frozen_at,history_exam_ids,prediction,result_exam_id').eq('user_id',uid).order('frozen_at',{ascending:true}).limit(1000):Promise.resolve({data:[],error:null})
 ]);
 if(goal.error)throw goal.error;
 if(user.error)throw user.error;
 if(predictions.error)throw predictions.error;
 const byExam=new Map(exams.map((e:any)=>[e.id,{...e,scores:{}}]));
 for(const s of scores){const e:any=byExam.get(s.exam_id);if(e)e.scores[s.subject]={actual:s.actual_score,max:s.max_score,raw:s.raw_score,rawMax:s.raw_max_score,rank:s.rank_position,participants:s.participant_count,excludeFromTotal:s.exclude_from_total,created_at:s.created_at};}
 if(firstVisit.error)console.warn('achievement_first_visit_unavailable');
 // Replay only the legacy record-time badges to correct evidence; never reset award or read receipts.
 const repairable=new Set(['first-step','full-picture','rank-aware']);
 const repairIds=new Set(already.filter((a:any)=>repairable.has(a.badge_id)&&a.rule_version<2).map((a:any)=>a.badge_id));
 const found=engine.evaluate({exams:[...byExam.values()],goal:goal.data,createdAt:user.data?.created_at,firstUseAt:firstVisit.error?null:firstVisit.data?.occurred_at,predictions:predictions.data||[],owned:[]});
 await persistQualifications(db,uid,found);
 if(qualificationOnly)return {enabled:true,ok:true};
 for(const a of found.filter((a:any)=>repairIds.has(a.badge_id)&&a.evidence.achievedDate)){
   const result=await db.from('score_tracker_achievement_awards').update({rule_version:a.rule_version,evidence:a.evidence}).eq('user_id',uid).eq('badge_id',a.badge_id).eq('rule_version',1);
   if(result.error)console.warn('achievement_legacy_date_repair_failed',a.badge_id);
 }
 const insert=found.filter((a:any)=>!already.some((old:any)=>old.badge_id===a.badge_id)&&!repairIds.has(a.badge_id)&&catalogue.badges.some((b:any)=>b.id===a.badge_id&&(b.mode==='auto'||b.mode==='snapshot'&&['frozen_prediction','historical_replay','mixed_prediction'].includes(a.evidence.source)))).map((a:any)=>({user_id:uid,...a}));
 if(insert.length){
  // Ignore conflicts to preserve the first award's evidence and read receipt.
  const r=await db.from('score_tracker_achievement_awards').upsert(insert,{onConflict:'user_id,badge_id',ignoreDuplicates:true});
  if(r.error)throw r.error;
 }
 return await collection(db,uid,await awards(db,uid),pilot);
}
