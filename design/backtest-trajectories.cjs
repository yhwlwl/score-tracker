// Replay anonymous database snapshots in exam-date order. No future target or peer outcomes enter a prediction.
const fs=require('fs');
const clamp=x=>Math.max(0,Math.min(100,x)),median=a=>{const b=a.slice().sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
function runs(points,skipEmpty=false){const result=[];let run=[];for(const p of points){if(skipEmpty&&JSON.parse(p.ctx)[1]===null)continue;if(p.v===null||!Number.isFinite(p.v)){if(run.length)result.push(run);run=[];continue;}if(run.length&&p.ctx!==run[0].ctx){result.push(run);run=[];}run.push(p);}if(run.length)result.push(run);return result;}
function fits(x,y){const k=x.length,mx=x.reduce((s,v)=>s+v,0)/k,my=y.reduce((s,v)=>s+v,0)/k;let vx=0,vy=0,cv=0,mse=0;for(let i=0;i<k;i++){vx+=(x[i]-mx)**2/k;vy+=(y[i]-my)**2/k;cv+=(x[i]-mx)*(y[i]-my)/k;mse+=(x[i]-y[i])**2/k;}const sx=Math.sqrt(vx),sy=Math.sqrt(vy),centered=Math.sqrt(Math.max(0,vx+vy-2*cv)),shape=sx<1&&sy<1?centered:Math.sqrt(Math.max(0,vx/Math.max(sx,1)**2+vy/Math.max(sy,1)**2-2*cv/(Math.max(sx,1)*Math.max(sy,1))));return {shape,fit:shape/.9+.1*Math.abs(sx-sy)/Math.max(sx,sy,1)};}
function match(own,pool,date,uid,limit=20){const n=own.length,ctx=own[0].ctx,x=own.map(p=>p.v),best=[];
for(const user of pool){if(user.uid===uid)continue;const candidates=[];for(const [runIndex,run] of user.runs.entries()){if(run[0].ctx!==ctx)continue;const vals=run.filter(p=>p.date<=date);for(let finish=3;finish<vals.length;finish++){for(let k=3;k<=Math.min(finish,n);k++){const history=vals.slice(finish-k,finish).map(p=>p.v),a=fits(x.slice(n-k),history);if(a.shape>.9)continue;const distance=a.fit+.6/Math.sqrt(k-2)+.9*(1-k/n);candidates.push({history,future:vals.slice(finish,finish+3).map(p=>p.v),match_score:Math.round(100*Math.exp(-Math.max(a.fit,0))),fit:a.fit,band:a.fit<=.65?0:1,distance,k,finish,runIndex,uid:user.uid});}}}
if(!candidates.length)continue;const band=Math.min(...candidates.map(c=>c.band)),dist=Math.min(...candidates.filter(c=>c.band===band).map(c=>c.distance));const eligible=candidates.filter(c=>c.band===band&&c.distance<=dist+.05).sort((a,b)=>b.k-a.k||a.distance-b.distance||b.runIndex-a.runIndex||b.finish-a.finish);best.push(eligible[0]);}
return best.sort((a,b)=>a.band-b.band||a.distance-b.distance||b.k-a.k||a.uid.localeCompare(b.uid)).slice(0,limit);}
function mean(own,peers){const latest=own.at(-1),samples=peers.map(p=>({value:clamp(p.future[0]+latest-p.history.at(-1)),weight:p.match_score/100*Math.sqrt(p.history.length)})),sum=samples.reduce((s,p)=>s+p.weight,0);return {center:samples.reduce((s,p)=>s+p.value*p.weight,0)/sum,samples};}
function runBacktest(){
const rows=[];
for(const key of ['math','total']){const dataset=JSON.parse(fs.readFileSync(require('node:path').join(process.argv[2]||'.','backtest-'+key+'.json'))),pool=dataset.map(u=>({...u,runs:runs(u.points,key==='math')}));
 for(const user of pool){for(const run of user.runs){for(let i=3;i<run.length;i++){const own=run.slice(0,i),actual=run[i];if(actual.date<=own.at(-1).date)continue;const peers=match(own,pool,own.at(-1).date,user.uid,20);if(!peers.length)continue;const values=own.map(p=>p.v),latest=values.at(-1),med=median(values.slice(-3)),three=mean(values,peers.slice(0,3)),twenty=mean(values,peers),vol=median(values.slice(-6).slice(1).map((v,j)=>Math.abs(v-values.slice(-6)[j]))),cap=Math.max(5,2*vol);const robust={...twenty,center:median(twenty.samples.map(p=>p.value))};
 rows.push({key,user:user.target||user.uid,date:actual.date,anchor:own.at(-1).date,n:values.length,actual:actual.v,count:peers.length,latest,median:med,three:three.center,twenty:twenty.center,robust:robust.center,blendLast:latest+.25*(twenty.center-latest),blendMedian:med+.25*(twenty.center-med),capped:latest+.25*Math.max(-cap,Math.min(cap,twenty.center-latest)),history:values,peers});
 }}}
}
fs.writeFileSync(require('node:path').join(process.argv[3]||'.','backtest-results.json'),JSON.stringify(rows));
const methods=['latest','median','three','twenty','robust','blendLast','blendMedian','capped'];
function metrics(rs){return Object.fromEntries(methods.map(m=>[m,{mae:rs.reduce((s,r)=>s+Math.abs(r[m]-r.actual),0)/rs.length,rmse:Math.sqrt(rs.reduce((s,r)=>s+(r[m]-r.actual)**2,0)/rs.length)}]));}
const cohort=rows.filter(r=>!['admin1','showcase'].includes(r.user)),dates=cohort.map(r=>r.date).sort(),cut=dates[Math.floor(dates.length*.8)],train=cohort.filter(r=>r.date<cut),test=cohort.filter(r=>r.date>=cut);
console.log(JSON.stringify({cases:rows.length,users:new Set(rows.map(r=>r.user)).size,cut,train:train.length,test:test.length,trainMetrics:metrics(train),testMetrics:metrics(test),targets:rows.filter(r=>['admin1','showcase'].includes(r.user)).map(({peers,...r})=>r)},null,2));
}
if(require.main===module)runBacktest();
module.exports={runs,fits,match,mean,median};
