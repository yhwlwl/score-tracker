const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Caller verifies the administrator session before either operation.
export async function paperRecords(db:any,params:URLSearchParams){
 const days=Math.max(1,Math.min(90,Number(params.get('days'))||7)),page=Math.max(1,Math.min(10000,Math.trunc(Number(params.get('page'))||1))),since=new Date(Date.now()-days*86400000).toISOString();
 let q=db.from('score_tracker_paper_reviews').select('request_id,user_id,subject,title,created_at,completed_at,status,error_code,error_stage,error_message,model,duration_ms,image_count,options',{count:'exact'}).gte('created_at',since).or('options->>purpose.eq.record,result->>record_only.eq.true').order('created_at',{ascending:false});
 const status=params.get('status')||'';if(['succeeded','failed','paused','running'].includes(status))q=q.eq('status',status);
 const search=(params.get('search')||'').trim();
 if(search){if(UUID.test(search))q=q.eq('request_id',search);else{const u=await db.from('score_tracker_users').select('id').ilike('username','%'+search.replace(/[\\%_]/g,'\\$&').slice(0,80)+'%').limit(50);if(u.error)throw u.error;q=q.in('user_id',(u.data||[]).map((x:any)=>x.id));}}
 const [r,s]=await Promise.all([q.range((page-1)*30,page*30-1),db.rpc('score_tracker_admin_paper_summary',{p_since:since})]);if(r.error||s.error)throw r.error||s.error;
 const ids=[...new Set((r.data||[]).map((x:any)=>x.user_id).filter(Boolean))],u=ids.length?await db.from('score_tracker_users').select('id,username').in('id',ids):{data:[]};if(u.error)throw u.error;
 const names=new Map((u.data||[]).map((x:any)=>[x.id,x.username]));
 return {rows:(r.data||[]).map((x:any)=>({...x,source_image_count:x.image_count,username:names.get(x.user_id)||null})),total:r.count||0,page,page_size:30,summary:s.data};
}
export async function paperRecordDetail(db:any,id:string){
 if(!UUID.test(id))return null;
 const r=await db.from('score_tracker_paper_reviews').select('request_id,user_id,subject,title,status,created_at,completed_at,model,duration_ms,error_code,error_stage,error_message,options,result,corrections,attempts,diagnostics').eq('request_id',id).maybeSingle();if(r.error)throw r.error;if(!r.data)return null;const row=r.data;
 const m=await db.from('score_tracker_paper_materials').select('pages,regions').eq('request_id',id).eq('user_id',row.user_id).maybeSingle();if(m.error)throw m.error;
 const pages=(m.data?.pages||[]).filter((p:any)=>typeof p.path==='string'&&p.path.startsWith(row.user_id+'/'+id+'/')&&!p.path.split('/').some((s:string)=>s==='..'||s==='.'));
 let images:any[]=[];if(pages.length){const s=await db.storage.from('score-tracker-paper-scans').createSignedUrls(pages.map((p:any)=>p.path),300);if(s.error)throw s.error;images=pages.map((p:any,i:number)=>({page:p.page,role:p.role,url:s.data[i]?.signedUrl||null}));}
 const [t,c]=await Promise.all([db.from('score_tracker_ai_tasks').select('approved_credits,spent_credits,charged_credits,status').eq('id',id).maybeSingle(),db.from('score_tracker_ai_calls').select('id,status,model,prompt_tokens,completion_tokens,reasoning_tokens,cache_hit_tokens,cache_miss_tokens,cost_cny,reserved_cny,provider_request_id').eq('task_id',id).order('created_at')]);if(t.error||c.error)throw t.error||c.error;
 return {...row,images,regions:m.data?.regions||{},billing:t.data,calls:c.data||[]};
}
