const base=process.env.SUPABASE_URL||'https://kdwpmcdxapwecbfrvqtm.supabase.co';
for(const [name,action,validate] of [
 ['score-tracker-data-api','achievement_release_status',j=>j.achievement_release===2&&j.ready===true&&j.enabled===true],
 ['score-tracker-trajectories','release_capabilities',j=>j.privacy_status_version===1&&j.achievement_prediction_version===1]
]){
 const r=await fetch(new URL('/functions/v1/'+name,base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action}),signal:AbortSignal.timeout(15000)});const j=await r.json();
 if(!r.ok||!validate(j))throw Error('阻止正式发布：'+name+' 的成就后端尚未就绪');
}
console.log('Achievement v2 backend and frozen trajectory capability ready.');
