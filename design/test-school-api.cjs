const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname,'../supabase/functions/score-tracker-setup/index.ts'),'utf8');
const code = ts.transpile(source.replace(/^import .*;\n/gm,''),{target:ts.ScriptTarget.ES2022});
const records = new Map(); let handler, expired=false, writes=0;
const db = {
  from(table) {
    let row, filter;
    const q={select(){return q},eq(k,v){filter=[k,v];return q},upsert(value){row=value;writes++;return q},update(value){row=value;writes++;return q},
      async maybeSingle(){
        if(table==='score_tracker_users') {
          const digest=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('fixture-token'));
          const hash=Buffer.from(digest).toString('hex');
          return {data:filter[1]===hash ? {id:'fixture-user',session_expires_at:expired?'2000-01-01':'2099-01-01'} : null,error:null};
        }
        if(row) records.set(filter[1],{...records.get(filter[1]),...row});
        return {data:records.get(filter[1])||null,error:null};
      },
      async single(){records.set(row.user_id,{step:0,selected_subjects:[],...records.get(row.user_id),...row});return {data:records.get(row.user_id),error:null}},
      then(resolve){if(row&&!records.has(row.user_id))records.set(row.user_id,{...row});return Promise.resolve({error:null}).then(resolve)}
    }; return q;
  },
  async rpc(name,params){
    if(name==='score_tracker_claim_school_prompt') {
      const p=records.get(params.p_user_id),claimed=!p?.school&&!p?.school_prompted_at&&!p?.completed_at&&p?.step!==6;
      if(claimed)records.set(params.p_user_id,{...p,school_prompted_at:'once'});
      return {data:claimed,error:null};
    }
    if(name==='score_tracker_school_regions')return {data:[{province:'浙江省',city:'杭州市'}],error:null};
    return {data:[{name:'测试中学',province:'浙江省',city:'杭州市',area:'测试区'}],error:null};
  }
};
vm.runInNewContext(code,{createClient:()=>db,schoolText:v=>v,schoolSearchKey:v=>v,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,TextEncoder,crypto:webcrypto,console});
async function call(action,payload={},token='fixture-token') {return handler(new Request('https://test',{method:'POST',body:JSON.stringify({action,token,...payload})}));}
(async()=>{
  assert.equal((await call('school_save',{school:{name:'学校'}},'')).status,401);
  assert.equal((await call('school_save',{school:{name:'学校'}},'wrong')).status,401);
  expired=true;assert.equal((await call('school_prompt_claim')).status,401);expired=false;assert.equal(writes,0);
  for(const school of [null,{},[],{name:''},{name:'x'.repeat(101)},{name:'学校',province:7},{name:'学\n校'}])assert.equal((await call('school_save',{school})).status,400);
  const existing={step:3,selected_subjects:['物理','化学','生物'],completed_at:null};records.set('fixture-user',existing);
  let response=await call('school_save',{school:{name:' 手填高中 ',province:'浙江省'},step:6,selected_subjects:[]});assert.equal(response.status,200);
  let p=(await response.json()).profile;assert.equal(p.school.name,'手填高中');assert.equal(p.school.source,'manual');assert.equal(p.step,3);assert.deepEqual(p.selected_subjects,existing.selected_subjects);assert.equal(p.completed_at,null);
  response=await call('school_save',{school:{name:'目录学校',province:'浙江省',city:'杭州市',area:'区',source:'github'}});assert.equal((await response.json()).profile.school.source,'github');
  assert.equal((await(await call('school_prompt_claim')).json()).claimed,false);
  records.clear();assert.equal((await(await call('school_prompt_claim')).json()).claimed,true);assert.equal((await(await call('school_prompt_claim')).json()).claimed,false);
  records.clear();response=await call('school_save',{school:{name:'首次直接保存'}});assert.equal(response.status,200);assert.equal((await response.json()).profile.step,0);
  assert.equal((await call('school_search',{query:'x'.repeat(101)})).status,400);assert.equal((await call('school_search',{province:[]})).status,400);
  assert.deepEqual((await(await call('school_search',{query:'测试'})).json()).schools,[['测试中学','浙江省','杭州市','测试区']]);
  assert.deepEqual((await(await call('school_regions')).json()).regions,[['浙江省','杭州市']]);
  assert.equal((await call('get')).status,200);assert.equal((await call('unknown')).status,400);
  console.log('School API: session authentication, validation, profile preservation, first save, claims and directory shapes passed.');
})().catch(e=>{console.error(e);process.exit(1)});
