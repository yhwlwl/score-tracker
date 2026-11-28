import { createClient } from "npm:@supabase/supabase-js@2";
import { achievements } from "../score-tracker-data-api/achievements.ts";
import { replayCandidates,replayTarget } from "../_shared/achievement-replay.js";
const db=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false,autoRefreshToken:false}});
const json=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
async function rpc(name:string,args:any){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data}
async function qualify(uid:string){const q=await achievements(db,uid,{achievement_release:2,action:'achievement_refresh'},true);if(!q.enabled||!q.ok)throw Error('qualification_disabled')}
async function qualified(uid:string){const r=await db.from('score_tracker_achievement_qualifications').select('badge_id').eq('user_id',uid).eq('badge_id','unique-path').eq('rule_version',2).maybeSingle();if(r.error)throw r.error;return !!r.data}
async function replay(uid:string,lease:string){
 if(await qualified(uid))return false;
 const tomorrow=new Date(Date.now()+28800000+86400000).toISOString().slice(0,10);
 const own=await rpc('st_achievement_replay_points',{p_user:uid,p_peers:false,p_basket:null,p_before:tomorrow});
 if(!own?.length)return false;
 const s=await db.from('score_tracker_achievement_predictions').select('model,frozen_at,result_exam_id,history_exam_ids,prediction').eq('user_id',uid).limit(1000);
 if(s.error)throw s.error;
 if((s.data||[]).length>=1000)throw Error('prediction_paging_required');
 const pending=replayCandidates(own,s.data||[]);
 if(!pending.length)return false;
 // Small chunks and one reference query per basket. Already cached misses also skip.
 const batch=pending.slice(0,3),pools=new Map(),out=[];
 for(const t of batch){
  if(!pools.has(t.basket)){const before=batch.filter(x=>x.basket===t.basket).map(x=>x.target[1]).sort().at(-1);pools.set(t.basket,await rpc('st_achievement_replay_points',{p_user:uid,p_peers:true,p_basket:t.basket,p_before:before}));}
  out.push(replayTarget(t,pools.get(t.basket)||[]));
 }
 if(!await rpc('st_achievement_replay_write',{p_lease:lease,p_rows:out}))return true;
 return pending.length>batch.length;
}
Deno.serve(async req=>{
 if(req.method!=='POST')return json(405);
 let lease:string;
 try{const b=await req.json();lease=b.lease;if(typeof lease!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lease))return json(401)}catch(_){return json(400)}
 let j:any;
 try{j=await rpc('st_achievement_job_claim',{p_lease:lease});if(!j)return json(401)}catch(_){return json(503)}
 try{
  const uid=j.user_id;
  // Ordinary badges are independent from trajectory work and can qualify immediately.
  await qualify(uid);
  let more=false;
  if(j.replay_needed&&!await qualified(uid)){more=await replay(uid,lease);await qualify(uid);if(await qualified(uid))more=false}
  await rpc('st_achievement_job_finish',{p_lease:lease,p_more:more,p_error:false});
  return json(204);
 }catch(e){console.warn('achievement_job_failed',(e as any)?.code||'internal');try{await rpc('st_achievement_job_finish',{p_lease:lease,p_more:false,p_error:true})}catch(_){}return json(503)}
});
