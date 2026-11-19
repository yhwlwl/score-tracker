// Bounded, fixed-destination upload relay for the isolated preview only.
'use strict';
const http=require('node:http');
const {run}=require('./paper-preview-mirror.cjs');
const ORIGIN='https://feat-paper-entry-analysis-fl.score-tracker-d83.pages.dev';
const UPSTREAM='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-paper-credits-preview';
const MAX=3900000;
const base={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function start(){
  const server=http.createServer(async(req,res)=>{
    const headers={...base,'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'};
    function end(status,data){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
    if(req.url!=='/paper-preview-upload' || req.headers.origin!==ORIGIN)return end(403,{error:'无权访问'});
    if(req.method==='OPTIONS') {res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Access-Control-Max-Age':'600'});return res.end();}
    if(req.method!=='POST' || !String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return end(405,{error:'请求格式不正确'});
    if(Number(req.headers['content-length']||0)>MAX)return end(413,{error:'上传内容过大'});
    const chunks=[];let size=0;
    try {
      for await(const chunk of req){size+=chunk.length;if(size>MAX)return end(413,{error:'上传内容过大'});chunks.push(chunk);}
      const raw=Buffer.concat(chunks).toString('utf8'),body=JSON.parse(raw);
      if(!['upload_page','upload_page_view'].includes(body.action) || typeof body.token!=='string' || !body.token || body.token.length>512)return end(400,{error:'请求格式不正确'});
      // Session validation and record ownership remain with the existing Edge Function.
      const upstream=await fetch(UPSTREAM,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:raw,redirect:'error',signal:AbortSignal.timeout(22000)});
      const value=await upstream.text();if(value.length>50000)throw Error('response');
      res.writeHead(upstream.status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(value);
    }catch(_){if(!res.headersSent)end(503,{error:'连接暂时不可用，请重试'});else res.destroy();}
  });
  server.headersTimeout=10000;server.requestTimeout=30000;server.maxConnections=12;
  server.listen(18765,'127.0.0.1');
  return server;
}
if(require.main===module){start();run().catch(()=>{console.error('paper mirror: startup failed');process.exitCode=1;process.exit(1);});}
module.exports={start};
