// Private, anonymized snapshots only. No network calls or live exposure-log writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {series,match,median,mean}=require('./trajectory-v2-model.cjs');
const root=path.resolve(__dirname,'..'),cut='2026-07-06',cohorts=[],coverage=[];
const forecastContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'trajectory-forecast.js'),'utf8'),forecastContext);
const oldContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'private-old-forecast.js'),'utf8'),oldContext);
const summarize=(cases,field)=>({n:cases.length,mae:cases.reduce((s,c)=>s+Math.abs(c[field]-c.actual),0)/cases.length,rmse:Math.sqrt(cases.reduce((s,c)=>s+(c[field]-c.actual)**2,0)/cases.length),large_error_rate:cases.filter(c=>Math.abs(c[field]-c.actual)>20).length/cases.length});
for(const key of ['total','math']){
 const source=fs.readFileSync(path.join(root,'private-'+key+'.json'),'utf8'),data=JSON.parse(source).filter(u=>u.target!=='excluded-test');
 const totals={scope:key+'/year/shared',snapshot_sha256:crypto.createHash('sha256').update(source).digest('hex'),users:data.length,old_eligible:0,new_initial:0,new_formal:0,old_matched:0,new_initial_matched:0,new_formal_matched:0};
 for(const u of data){
  const ownOld=series(u.points,1).at(-1)||[],ownNew=series(u.points,2).at(-1)||[];
  if(ownOld.length>=3){totals.old_eligible++;if(match(ownOld,data,'9999-12-31',u.uid,1,3).length)totals.old_matched++;}
  if(ownNew.length>=2){totals.new_initial++;if(match(ownNew,data,'9999-12-31',u.uid,2,20).length)totals.new_initial_matched++;}
  if(ownNew.length>=3){totals.new_formal++;if(match(ownNew,data,'9999-12-31',u.uid,2,20).length)totals.new_formal_matched++;}
 }
 coverage.push(totals);
 const cases=[];let preliminaryCases=0;
 for(const u of data)for(const run of series(u.points,2)){
  for(let i=2;i<run.length;i++){
   const own=run.slice(0,i),actual=run[i],anchor=own.at(-1).date;if(actual.date<=anchor)continue;
   if(i===2){preliminaryCases++;continue;}
   const peers=match(own,data,anchor,u.uid,2,20);if(!peers.length)continue;
   const vals=own.map(p=>p.v),prediction=forecastContext.window.__stTrajectoryForecast.estimate(vals,peers,'shape');
   const oldOwn=series(u.points.filter(p=>p.date<=anchor),1).at(-1)||[];
   let oldPrediction=null;
   if(oldOwn.length>=3){const oldPeers=match(oldOwn,data,anchor,u.uid,1,3);if(oldPeers.length)oldPrediction=oldContext.window.__stTrajectoryForecast.estimate(oldOwn.map(p=>p.v),oldPeers,'shape').center;}
   cases.push({uid:u.uid,target:u.target,date:actual.date,n:vals.length,actual:actual.v,prediction:prediction.center,baseline:median(vals.slice(-3)),latest:vals.at(-1),oldPrediction,count:peers.length});
  }
 }
 const evaluation=cases.filter(c=>!c.target&&c.date>=cut),paired=evaluation.filter(c=>c.oldPrediction!==null),long=evaluation.filter(c=>c.n>=8);
 const admin=data.find(u=>u.target==='admin1'),own=admin&&series(admin.points,2).at(-1),peers=own&&match(own,data,'9999-12-31',admin.uid,2,20);
 cohorts.push({key,cases:cases.length,preliminaryCases,holdoutUsers:new Set(evaluation.map(c=>c.uid)).size,holdout:summarize(evaluation,'prediction'),baseline:summarize(evaluation,'baseline'),pairedOld:summarize(paired,'oldPrediction'),pairedNew:summarize(paired,'prediction'),longHoldout:summarize(long,'prediction'),longBaseline:summarize(long,'baseline'),admin:own&&{history:own.map(p=>p.v),prediction:forecastContext.window.__stTrajectoryForecast.estimate(own.map(p=>p.v),peers,'shape'),cases:cases.filter(c=>c.target==='admin1')}});
 console.log(JSON.stringify({coverage:totals,cohort:cohorts.at(-1)},null,2));
}
fs.writeFileSync(path.join(root,'private-v2-evaluation.json'),JSON.stringify({cut,coverage,cohorts},null,2));
