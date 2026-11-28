/* Uses exactly the original historical replay fit and center formula.
 * Reference points remain transient; only own history and aggregate forecast are stored.
 */
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
const normalize=p=>[p[0],p[1],p[2],Math.round(Number(p[3])*1e8)/1e8];
export function replayCandidates(own,snapshots){
 const cached=new Map(snapshots.filter(x=>x.model==='trajectory-replay-v2').map(x=>[x.result_exam_id,x.prediction]));
 const frozen=new Set();
 for(const row of snapshots.filter(x=>x.model==='trajectory-forecast-v1').sort((a,b)=>String(a.frozen_at).localeCompare(String(b.frozen_at)))){
  const p=row.prediction||{},t=Date.parse(row.frozen_at);
  if(!Number.isFinite(t)||!p.lastDate||!Array.isArray(p.basket)||!p.basket.length||!Array.isArray(row.history_exam_ids)||row.history_exam_ids.length<3||!Number.isFinite(p.center)||p.center<0||p.center>100||p.references<3)continue;
  const day=new Date(t+28800000).toISOString().slice(0,10);
  const next=own.find(x=>x.basket===p.basket.join('|'))?.points.find(x=>x[1]>day&&x[1]>p.lastDate&&x[2]===p.category&&!row.history_exam_ids.includes(x[0]));
  if(next)frozen.add(next[1]);
 }
 const pending=[];
 for(const row of own){
  const groups=new Map();
  for(const p of row.points){const a=groups.get(p[2])||[];a.push(normalize(p));groups.set(p[2],a)}
  for(const [category,points] of groups)for(let i=3;i<points.length;i++){
   const target=points[i],history=points.slice(Math.max(0,i-80),i);
   if(frozen.has(target[1]))continue;
   const fingerprint=JSON.stringify([row.basket,history,target]);
   if(cached.get(target[0])?.fingerprint===fingerprint)continue;
   pending.push({basket:row.basket,category,target,history,fingerprint});
  }
 }
 return pending.sort((a,b)=>a.target[1].localeCompare(b.target[1])||a.target[0].localeCompare(b.target[0]));
}
export function replayTarget(task,peers){
 const {basket,category,target,history,fingerprint}=task,date=target[1],values=history.map(p=>p[3]),n=values.length;
 const chosen=[];
 // No peer continuation from the target date or the future can enter the estimate.
 for(const peer of peers){
  const a=peer.points;let bestBand=Infinity,bestDistance=Infinity;const fits=[];
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
 let center=null;
 if(refs.length>=3){let weight=0,sum=0;for(const ref of refs){const score=Math.max(.01,Math.round(100*Math.exp(-Math.max(ref.error,0)))/100),w=score*Math.sqrt(ref.k);weight+=w;sum+=w*clamp(ref.next+values.at(-1)-ref.last)}center=clamp(.75*median(values.slice(-3))+.25*sum/weight)}
 return {result_exam_id:target[0],context_key:JSON.stringify([category,basket.split('|'),target[0]]),history_exam_ids:history.map(p=>p[0]),prediction:{center,references:refs.length,lastDate:history.at(-1)[1],targetDate:date,peerThrough:refs.map(x=>x.nextDate).sort().at(-1)||null,category,basket:basket.split('|'),mode:'shape',source:'historical_replay',fingerprint,ownHistory:history,targetPosition:target[3]}};
}
