const {fits,median,mean}=require('./backtest-trajectories.cjs');
function series(points,version=2,category='__all__'){
 const result=[];let run=[];
 for(const p of points){
  const [cat,basket]=JSON.parse(p.ctx);
  if(category!=='__all__'&&cat!==(category==='__none__'?'':category))continue;
  if(p.v===null||!Number.isFinite(p.v)){if(version===1&&run.length){result.push(run);run=[];}continue;}
  if(run.length&&(version===1?p.ctx!==run.at(-1).ctx:basket!==JSON.parse(run.at(-1).ctx)[1])){result.push(run);run=[];}
  run.push(p);
 }
 if(run.length)result.push(run);return result;
}
function match(own,pool,date,uid,version=2,limit=20,same=false){
 const n=own.length,min=version===2&&n===2?2:3;if(n<min)return [];
 const x=own.map(p=>p.v),ctx=JSON.parse(own.at(-1).ctx),best=[];
 for(const user of pool){
  if(user.uid===uid)continue;
  const points=user.points.filter(p=>p.date<=date&&(!same||JSON.parse(p.ctx)[0]===ctx[0]));
  const candidates=[];
  for(const [runIndex,run] of series(points,version).entries()){
   const peerCtx=JSON.parse(run[0].ctx);if(version===1?run[0].ctx!==own.at(-1).ctx:peerCtx[1]!==ctx[1])continue;
   for(let finish=min;finish<run.length;finish++)for(let k=min;k<=Math.min(finish,n);k++){
    const history=run.slice(finish-k,finish).map(p=>p.v);let a;
    if(k===2){const fit=Math.abs((history[1]-history[0])-(x[n-1]-x[n-2]))/10;if(fit>1)continue;a={shape:fit,fit};}
    else{a=fits(x.slice(n-k),history);if(a.shape>.9)continue;}
    const distance=a.fit+.6/Math.sqrt(Math.max(k-2,1))+.9*(1-k/n);
    candidates.push({history,future:run.slice(finish,finish+3).map(p=>p.v),match_score:k===2?null:Math.round(100*Math.exp(-Math.max(a.fit,0))),fit:a.fit,band:a.fit<=.65?0:1,distance,k,finish,runIndex,uid:user.uid});
   }
  }
  if(!candidates.length)continue;
  const band=Math.min(...candidates.map(c=>c.band)),dist=Math.min(...candidates.filter(c=>c.band===band).map(c=>c.distance));
  best.push(candidates.filter(c=>c.band===band&&c.distance<=dist+.05).sort((a,b)=>b.k-a.k||a.distance-b.distance||b.runIndex-a.runIndex||b.finish-a.finish)[0]);
 }
 return best.sort((a,b)=>a.band-b.band||a.distance-b.distance||b.k-a.k||a.uid.localeCompare(b.uid)).slice(0,limit);
}
module.exports={series,match,median,mean};
