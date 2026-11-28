/* Offline chronological replay for unique-path. No private peer identities enter award evidence. */
const CUTOFF='2026-11-27';
const SQL=`with p as (
 select e.user_id uid,e.id,e.exam_date d,coalesce(e.grade_level,'') cat,
  b.basket,100.0*e.total_rank/e.total_participants pos
 from public.score_tracker_exams e
 join public.score_tracker_users u on u.id=e.user_id
 join public.score_tracker_trajectory_sharing sh on sh.user_id=e.user_id and sh.enabled and not coalesce(sh.test_all_database,false)
 cross join lateral (select string_agg(s.subject,'|' order by s.subject) basket from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=e.user_id and not coalesce(s.exclude_from_total,false)) b
 where not coalesce(u.is_admin,false) and lower(u.username) not in ('showcase','admin','admin1')
 and not coalesce(e.is_hidden,false) and e.exam_date<'2026-11-27' and e.total_participants>=30
 and e.total_rank between 1 and e.total_participants and b.basket is not null
 and (e.total_year_position_percent is null or abs(e.total_year_position_percent-100.0*e.total_rank/e.total_participants)<=0.011)
 and exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=e.user_id and (s.max_score>0 and s.actual_score between 0 and s.max_score or s.raw_max_score>0 and s.raw_score between 0 and s.raw_max_score) and not coalesce(s.exclude_from_total,false))
), unambiguous as (select *,count(*) over(partition by uid,basket,d) dup from p)
select uid,basket,jsonb_agg(jsonb_build_array(id,d,cat,pos) order by d,id) points
from unambiguous where dup=1 group by uid,basket having count(*)>=4 order by uid,basket`;
const median=a=>{const x=[...a].sort((a,b)=>a-b),m=x.length>>1;return x.length%2?x[m]:(x[m-1]+x[m])/2};
const clamp=x=>Math.max(0,Math.min(100,x));
function fit(a,b){
 const k=a.length;let sx=0,sy=0,xx=0,yy=0,xy=0;
 for(let i=0;i<k;i++){const x=a[i],y=b[i];sx+=x;sy+=y;xx+=x*x;yy+=y*y;xy+=x*y}
 const vx=Math.max(0,xx/k-(sx/k)**2),vy=Math.max(0,yy/k-(sy/k)**2),cv=xy/k-sx*sy/k/k,dx=Math.sqrt(vx),dy=Math.sqrt(vy);
 const shape=dx<1&&dy<1?Math.sqrt(Math.max(0,vx+vy-2*cv)):Math.sqrt(Math.max(0,vx/Math.max(dx,1)**2+vy/Math.max(dy,1)**2-2*cv/(Math.max(dx,1)*Math.max(dy,1))));
 if(shape>0.9)return null;
 const error=shape/0.9+0.1*Math.abs(dx-dy)/Math.max(dx,dy,1);
 return {error,band:error<=.65?0:1};
}
function replay(rows){
 const pool=new Map(),wins=[],seen=new Set();let targets=0,matched=0;
 for(const row of rows){const a=pool.get(row.basket)||[];a.push(row);pool.set(row.basket,a)}
 for(const [basket,peers] of pool){
  for(const own of peers){
   const groups=new Map();
   for(const p of own.points){const a=groups.get(p[2])||[];a.push(p);groups.set(p[2],a)}
   for(const [category,points] of groups){
    for(let i=3;i<points.length;i++){
     const target=points[i],date=target[1];if(date>=CUTOFF)continue;
     const hist=points.slice(Math.max(0,i-80),i),values=hist.map(p=>Number(p[3])),n=values.length;
     if(n<3||hist.some(p=>p[1]>=date))continue;
     targets++;
     const chosen=[];
     for(const peer of peers){
      if(peer.uid===own.uid)continue;
      const a=peer.points;let bestBand=Infinity,bestDistance=Infinity;const fits=[];
      // Both peer history and the observed continuation precede the target.
      for(let finish=3;finish<a.length&&a[finish][1]<date;finish++){
       for(let k=3;k<=Math.min(finish,n);k++){
        const y=a.slice(finish-k,finish).map(p=>Number(p[3])),x=values.slice(-k),f=fit(x,y);if(!f)continue;
        const distance=f.error+0.6/Math.sqrt(Math.max(k-2,1))+0.9*(1-k/n);
        const v={k,finish,distance,band:f.band,error:f.error,last:y.at(-1),next:Number(a[finish][3]),nextDate:a[finish][1],uid:peer.uid};
        if(v.band<bestBand){bestBand=v.band;bestDistance=distance}else if(v.band===bestBand)bestDistance=Math.min(bestDistance,distance);
        fits.push(v);
       }
      }
      const best=fits.filter(v=>v.band===bestBand&&v.distance<=bestDistance+.05).sort((a,b)=>b.k-a.k||a.distance-b.distance||b.finish-a.finish)[0];
      if(best)chosen.push(best);
     }
     const refs=chosen.sort((a,b)=>a.band-b.band||a.distance-b.distance||b.k-a.k||a.uid.localeCompare(b.uid)).slice(0,20);
     if(refs.length<3)continue;
     matched++;
     // Identical default center formula in trajectory-forecast.js: rounded
     // match_score, shape alignment, similarity weight 1, history weight .5,
     // 75% own median + 25% reference mean. No peer IDs or trajectories persisted.
     let weight=0,sum=0;
     for(const ref of refs){const score=Math.max(.01,Math.round(100*Math.exp(-Math.max(ref.error,0)))/100),w=score*Math.sqrt(ref.k);weight+=w;sum+=w*clamp(ref.next+values.at(-1)-ref.last)}
     const center=clamp(.75*median(values.slice(-3))+.25*sum/weight);
     const actual=Number(target[3]);if(center-actual<5)continue;
     const key=own.uid+':'+date;if(seen.has(key))continue;seen.add(key);
     wins.push({user_id:own.uid,prediction_id:target[0],model:'trajectory-replay-v1',context_key:JSON.stringify([category,basket.split('|'),target[0]]),history_exam_ids:hist.map(p=>p[0]),result_exam_id:target[0],prediction:{center,references:refs.length,lastDate:hist.at(-1)[1],targetDate:date,peerThrough:refs.map(x=>x.nextDate).sort().at(-1),category,basket:basket.split('|'),mode:'shape',source:'historical_replay',cutoff:CUTOFF}});
    }
   }
  }
 }
 return {wins,targets,matched};
}
module.exports={SQL,CUTOFF,fit,replay};
