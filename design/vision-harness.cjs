const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module'),crypto=require('node:crypto').webcrypto;
const root=path.resolve(__dirname,'..');
const source=file=>stripTypeScriptTypes(fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,''));
function backendHarness(){
  let handler,reply={choices:[{finish_reason:'stop',message:{content:JSON.stringify({exam:{},subjects:[{name:'数学',finalScore:128}],warnings:[]})}}]},quotaCalls=0;
  const upstream=[],records=new Map(),connectivityRecords=new Map(),uploads=[],tasks=[],logs=[];
  const rows={score_tracker_users:{id:'00000000-0000-4000-8000-000000000001',username:'test-user',session_expires_at:'2099-01-01'},score_tracker_ai_configs:{enabled:true,beta_only:false,openrouter_api_key:'fixture-secret',base_url:'https://models.test/v1',model:'deepseek-v4.1-flash'}};
  class Query{
    constructor(table){this.table=table;this.filters={};}
    select(){return this} eq(k,v){this.filters[k]=v;return this} insert(row){this.inserted=row;return this} update(row){this.updated=row;return this}
    async run(){
      if(this.table==='score_tracker_vision_connectivity_requests'){
        const r=connectivityRecords.get(this.filters.request_id);
        if(r&&r.user_id===this.filters.user_id&&this.updated)Object.assign(r,this.updated);
        return {data:r,error:null};
      }
      if(this.table!=='score_tracker_vision_requests')return {data:rows[this.table],error:null};
      if(this.inserted){const id=this.inserted.request_id;if(records.has(id))return {data:null,error:{code:'23505'}};records.set(id,{status:'running',...this.inserted});return {error:null};}
      const r=records.get(this.filters.request_id);if(!r||Object.entries(this.filters).some(([k,v])=>r[k]!==v))return {data:null,error:null};
      if(this.updated)Object.assign(r,this.updated);return {data:r,error:null};
    }
    maybeSingle(){return this.run()} then(resolve,reject){return this.run().then(resolve,reject)}
  }
  const quota=()=>({allowed:true,limit:10,used:0,remaining:10,global_remaining:100,service_enabled:true,tier_name:'初用',retry_after_seconds:0});
  const db={from:name=>new Query(name),async rpc(name,args){quotaCalls++;
    if(name==='score_tracker_vision_connectivity_reserve'){
      const previous=connectivityRecords.get(args.p_request_id);
      if(previous)return {data:{allowed:false,reason:previous.user_id===args.p_user_id?'duplicate_request':'request_id_conflict'},error:null};
      const used=[...connectivityRecords.values()].filter(r=>r.user_id===args.p_user_id);
      if(used.length)return {data:{allowed:false,reason:'cooldown',retry_after_seconds:60},error:null};
      connectivityRecords.set(args.p_request_id,{request_id:args.p_request_id,user_id:args.p_user_id,status:'running',model:args.p_model});
      return {data:{allowed:true,limit:3,used:1,remaining:2,global_limit:50,global_used:connectivityRecords.size},error:null};
    }
    if(name==='score_tracker_vision_refund'){const r=records.get(args.p_request_id);r.quota_refunded=true;return {data:true,error:null};}
    if(name==='score_tracker_vision_reserve'){const r=records.get(args.p_request_id);r.quota_consumed=true;return {data:{...quota(),consumed:true},error:null};}
    return {data:quota(),error:null};
  },storage:{from:bucket=>({async upload(path,bytes,options){uploads.push({bucket,path,bytes:Buffer.from(bytes),options});return {error:null}}})}};
  const scope={Deno:{env:{get:()=>''},serve:fn=>handler=fn},EdgeRuntime:{waitUntil:p=>tasks.push(p)},createClient:()=>db,crypto,TextEncoder,URL,Response,AbortController,setTimeout,clearTimeout,atob,btoa,
    console:{log(...args){logs.push(args)},error(...args){logs.push(args)}},fetch:async(url,options)=>{upstream.push({url,body:JSON.parse(options.body)});const item=Array.isArray(reply)?reply.shift():reply;return new Response(JSON.stringify(item),{status:200,headers:{'content-type':'application/json','x-request-id':'upstream-fixture'}})}};
  vm.createContext(scope);
  for(const p of ['reliability.ts','audit.ts','index.ts'])vm.runInContext(source('supabase/functions/score-tracker-vision-preview/'+p),scope);
  return {scope,upstream,rows,records,connectivityRecords,uploads,tasks,logs,db,set reply(v){reply=v},get quotaCalls(){return quotaCalls},call:body=>handler(new Request('https://vision.test/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'fixture-token',...body})})),drain:()=>Promise.all(tasks)};
}
module.exports={backendHarness,source};

