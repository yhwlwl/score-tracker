import "../_shared/achievement-trajectory-forecast.js";
const forecast=(globalThis as any).__stTrajectoryForecast;
const day=(s:string)=>new Date(Date.parse(s)+8*3600000).toISOString().slice(0,10);
export async function captureAchievementPrediction(db:any,uid:string,body:any,data:any,mode:string){
 // Only server-generated total year-rank reference forecasts, with real distinct reference accounts.
 if(Deno.env.get('SCORE_TRACKER_ACHIEVEMENTS_V2_ENABLED')==='false'||body.metric!=='year'||body.subjects!=null||data?.reason!=='matched'||data.preliminary||!Array.isArray(data.history)||!Array.isArray(data.matches)||!Array.isArray(data.history_dates)||!Array.isArray(data.history_categories))return;
 const allDates=data.history_dates,allHistory=data.history,allCategories=data.history_categories;
 if(allHistory.length<3||allDates.length!==allHistory.length||new Set(allDates).size!==allDates.length||allCategories.length!==allHistory.length||data.matches.length<3||!allHistory.every((v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100))return;
 // Preserve the actual forecast; bound only the stored provenance window and lookup cost.
 const estimate=forecast.estimate(allHistory,data.matches,mode);if(!estimate||estimate.count<3||!Number.isFinite(estimate.center))return;
 const dates=allDates.slice(-80),history=allHistory.slice(-80),categories=allCategories.slice(-80);
 const frozen=new Date().toISOString();if(dates.some((d:any)=>typeof d!=='string'||d>day(frozen)))return;
 const e=await db.from('score_tracker_exams').select('id,exam_date,grade_level,total_rank,total_participants,total_year_position_percent').eq('user_id',uid).eq('is_hidden',false).in('exam_date',dates).limit(1000);
 if(e.error)throw e.error;if(!e.data?.length||e.data.length>=1000)return;
 const sc=await db.from('score_tracker_scores').select('exam_id,subject,exclude_from_total').eq('user_id',uid).in('exam_id',e.data.map((x:any)=>x.id)).limit(1000);
 if(sc.error)throw sc.error;if((sc.data||[]).length>=1000)return;
 const baskets=new Map<string,string[]>();for(const row of sc.data||[]){if(row.exclude_from_total)continue;const a=baskets.get(row.exam_id)||[];a.push(row.subject);baskets.set(row.exam_id,a);}
 for(const a of baskets.values())a.sort();
 const pos=(x:any)=>{const n=Number(x.total_participants),r=Number(x.total_rank);if(n<30||r<1||r>n||!Number.isInteger(n)||!Number.isInteger(r))return NaN;const v=100*r/n;const stored=x.total_year_position_percent==null?v:Number(x.total_year_position_percent);return Math.abs(v-stored)<=0.011?v:NaN;};
 const find=(i:number,basket?:string[])=>e.data.filter((x:any)=>x.exam_date===dates[i]&&(x.grade_level||'')===categories[i]&&Math.abs(pos(x)-history[i])<=0.011&&(!basket||JSON.stringify(baskets.get(x.id))===JSON.stringify(basket)));
 const last=find(history.length-1);if(last.length!==1)return;
 const basket=baskets.get(last[0].id);if(!basket?.length)return;
 const ids:string[]=[];for(let i=0;i<dates.length;i++){const rows=find(i,basket);if(rows.length!==1)return;ids.push(rows[0].id)}
 const category=last[0].grade_level||'',context=JSON.stringify([category,basket,last[0].id]);
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uid+':'+context)));
 const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
 const predictionId=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);
 const result=await db.from('score_tracker_achievement_predictions').upsert({user_id:uid,prediction_id:predictionId,model:'trajectory-forecast-v1',context_key:context,frozen_at:frozen,history_exam_ids:ids,prediction:{center:estimate.center,references:estimate.count,lastDate:dates.at(-1),category,basket,mode}},{onConflict:'user_id,prediction_id',ignoreDuplicates:true});
 if(result.error)throw result.error;
}
