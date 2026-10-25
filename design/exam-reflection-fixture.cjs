/* Real PostgreSQL semantics behind the actual Edge handler, with isolated synthetic accounts. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{stripTypeScriptTypes}=require('node:module');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',examId='33333333-3333-4333-8333-333333333333';
async function createFixture(){
 const pg=new PGlite();
 await pg.exec(`create table score_tracker_users(id uuid primary key,username text,original_username text,session_token_hash text,session_expires_at timestamptz,exam_category_label text,exam_category_options jsonb,participant_defaults jsonb);
 create table score_tracker_exams(id uuid primary key,user_id uuid not null,name text,updated_at timestamptz default now());
 insert into score_tracker_exams(id,user_id,name) values ('${examId}','${owner}','隔离验收考试'),('44444444-4444-4444-8444-444444444444','${other}','另一个账号');`);
 const migration=read('supabase/migrations/'+fs.readdirSync(path.join(root,'supabase/migrations')).find(f=>f.endsWith('_exam_reflections.sql')));await pg.exec(migration);await pg.exec(migration);
 for(const [id,token] of [[owner,'fixture-token'],[other,'other-token']]) await pg.query('insert into score_tracker_users(id,username,session_token_hash,session_expires_at,participant_defaults) values ($1,$2,$3,$4,$5)',[id,'fixture',crypto.createHash('sha256').update(token).digest('hex'),'2099-01-01',{}]);
 const mutations=[];
 const db={from(table){
  if(!['score_tracker_users','score_tracker_exams'].includes(table))return {select(){return this},eq(){return this},order(){return this},maybeSingle:async()=>({data:null,error:null}),then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};
  let projection='*',filters=[],patch=null;
  const q={select(c){projection=c;return q},eq(k,v){filters.push([k,v]);return q},update(v){patch=v;return q},maybeSingle:run,single:run,then(a,b){return run().then(a,b)}};
  async function run(){try{
   const params=[],bind=v=>{params.push(v);return '$'+params.length};
   const set=patch?Object.entries(patch).map(([k,v])=>'"'+k+'"='+bind(v)).join(','):'';
   const where=filters.map(([k,v])=>'"'+k+'"='+bind(v)).join(' and ');
   const query=patch?`update ${table} set ${set} where ${where} returning ${projection}`:`select ${projection} from ${table} where ${where}`;
   if(patch)mutations.push({table,patch,filters});
   const result=await pg.query(query,params);return {data:result.rows[0]||null,error:null};
  }catch(e){return {data:null,error:e}}}return q;
 }};
 let handler;const sandbox={createClient:()=>db,Deno:{env:{get:()=>''},serve:fn=>handler=fn},crypto:crypto.webcrypto,TextEncoder,Uint8Array,Response,Request,Date,console};
 const source=read('supabase/functions/score-tracker-data-api/reflection.ts').replace(/^export /gm,'')+'\n'+read('supabase/functions/score-tracker-data-api/index.ts').replace(/^import[^\n]*\n/gm,'');vm.runInNewContext(stripTypeScriptTypes(source),sandbox);
 const request=body=>handler(new Request('https://fixture.test/api/score-tracker-data-api',{method:'POST',body:JSON.stringify({token:'fixture-token',examId,...body})}));
 return {pg,db,handler,request,mutations,owner,other,examId};
}
module.exports={createFixture,owner,other,examId};
