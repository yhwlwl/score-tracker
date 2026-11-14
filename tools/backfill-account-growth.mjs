// Operator tool. Default is read-only; do not run --apply without release authorization.
if(process.argv.includes('--help')){console.log('SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/backfill-account-growth.mjs [--apply] [--limit=50] [--cursor=uuid]\nDefault only lists the next batch; --apply backfills growth, never AI grants or model calls.');process.exit(0);}
const url=new URL(process.env.SUPABASE_URL||''),secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!secret)throw Error('需要有效的 Supabase URL 与服务端密钥');
const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.slice(8)||50),cursor=process.argv.find(a=>a.startsWith('--cursor='))?.slice(9),apply=process.argv.includes('--apply');
if(!Number.isInteger(limit)||limit<1||limit>100||cursor&&!/^[0-9a-f-]{36}$/i.test(cursor))throw Error('每批 1–100 个账号，cursor 必须为 UUID');
const headers={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
async function request(path,body){const r=await fetch(new URL('/rest/v1/'+path,url),{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error('数据库请求失败：'+String(j.code||r.status));return j;}
const users=await request('score_tracker_users?select=id&order=id&limit='+limit+(cursor?'&id=gt.'+cursor:''));
let done=0;for(const u of users){if(apply)await request('rpc/score_tracker_growth_refresh',{p_user:u.id});done++;}
console.log(JSON.stringify({mode:apply?'growth_applied':'read_only_plan',accounts:done,next_cursor:users.at(-1)?.id||null,ai_grants_created:0,model_calls:0}));
