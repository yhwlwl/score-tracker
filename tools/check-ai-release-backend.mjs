import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export const release='20261115-entry-credits-v1';
export async function checkAiBackend(base,send=fetch){
 const functions=['score-tracker-data-api','score-tracker-vision-preview','score-tracker-paper-review','score-tracker-admin'];
 const results=await Promise.allSettled(functions.map(async name=>{
  const url=new URL('/functions/v1/'+name,base);if(name==='score-tracker-admin')url.searchParams.set('action','release_capabilities');
  const r=await send(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'release_capabilities'}),signal:AbortSignal.timeout(15000)});const j=await r.json();
  if(!r.ok||j.release!==release||j.migration_ready!==true||j.analysis!==false)throw Error(name+' 的额度后端或迁移尚未就绪');return name;
 }));
 const failed=results.filter(r=>r.status==='rejected');if(failed.length)throw Error('已阻止生产前端发布；请先部署已审核迁移和计费后端。'+failed.map(r=>r.reason?.message||'检查失败').join('；'));
 return functions;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 await checkAiBackend(process.env.SUPABASE_URL||'https://kdwpmcdxapwecbfrvqtm.supabase.co');console.log('AI release backend ready; no model requests or account mutations were made.');
}
