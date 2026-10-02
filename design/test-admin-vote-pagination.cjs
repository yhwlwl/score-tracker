const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),{stripTypeScriptTypes}=require('node:module');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),tick=ms=>new Promise(r=>setTimeout(r,ms||30));

(async()=>{
  let handler,role='admin',failNames=0,failVotes=false,nameQueries=[],voteQueries=[],votes=[],suggestions=[];
  const options=[{id:'active',label:'新功能',is_active:true},{id:'old',label:'历史功能',is_active:false}];
  const db={from(table){
    const q={ids:null,bounds:null,select(){return this},eq(){return this},order(){return this},limit(){return this},in(k,ids){this.ids=ids;return this},range(a,b){this.bounds=[a,b];return this},
      async maybeSingle(){return{data:table==='score_tracker_users'?(role==='none'?null:{id:'admin',is_admin:role==='admin',session_expires_at:new Date(Date.now()+(role==='expired'?-60000:60000)).toISOString()}):{openrouter_api_key:'secret-vision-key-do-not-leak'}}},
      then(resolve,reject){let result;
        if(table==='score_tracker_users'){nameQueries.push(this.ids);result=failNames===nameQueries.length?{error:{message:'transport failure',code:'NETWORK_ERROR'}}:{data:this.ids.map(id=>({id,username:'用户 '+id}))}}
        else if(table==='score_tracker_feature_votes'){voteQueries.push(this.bounds);result=failVotes&&this.bounds[0]>0?{error:{message:'failed page'}}:{data:votes.slice(this.bounds[0],this.bounds[1]+1)}}
        else result={data:table==='score_tracker_feature_vote_options'?options:suggestions};
        return Promise.resolve(result).then(resolve,reject);
      }};return q;
  }};
  vm.runInNewContext(stripTypeScriptTypes(read('supabase/functions/score-tracker-admin/index.ts').replace(/^import .*;\s*$/gm,'')),{
    Deno:{env:{get:()=>''},serve:fn=>handler=fn},createClient:()=>db,crypto:require('node:crypto').webcrypto,TextEncoder,Response,Request,URL,Map,Set,Uint8Array,atob,btoa,setTimeout,clearTimeout,console:{log(){},error(){}},fetch:async()=>{throw Error('Unexpected network')}
  });
  const request=()=>new Request('https://admin.test?action=feature_votes',{headers:{'x-score-token':'test-admin'}});
  const reset=()=>{nameQueries=[];voteQueries=[];failNames=0;failVotes=false};
  const makeVotes=count=>Array.from({length:count},(_,i)=>({id:'vote-'+i,user_id:'u'+i%383,option_id:i%2?'active':'old',created_at:new Date(Date.UTC(2026,0,1)+i*1000).toISOString()})).reverse();
  votes=makeVotes(1250);suggestions=[{id:'suggestion',user_id:'suggestion-only',status:'converted',feedback_id:'feedback-1'}];
  let response=await handler(request()),data=await response.json();assert.equal(response.status,200);
  assert.equal(data.total_votes,1250);assert.equal(data.total_voters,383);assert.equal(data.options.reduce((s,x)=>s+x.votes,0),1250);
  assert.deepEqual(voteQueries,[[0,999],[1000,1999]]);assert.equal(nameQueries.length,4);assert(nameQueries.every(ids=>ids.length<=100));
  assert.equal(new Set(nameQueries.flat()).size,384);assert.equal(data.users[0].user_id,votes[0].user_id);
  assert(data.users.some(u=>u.votes.some(v=>!v.is_active)));assert.equal(data.suggestions[0].username,'用户 suggestion-only');
  assert(!JSON.stringify(data).includes('secret-vision-key-do-not-leak'));assert.equal(data.suggestions[0].feedback_id,'feedback-1');
  reset();votes=makeVotes(1000);await handler(request());assert.deepEqual(voteQueries,[[0,999],[1000,1999]]);
  reset();votes=[];suggestions=[];data=await(await handler(request())).json();assert.equal(data.total_votes,0);assert.equal(data.users.length,0);assert.equal(nameQueries.length,0);
  reset();votes=makeVotes(1250);failNames=2;response=await handler(request());data=await response.json();assert.equal(response.status,500);assert.equal(data.code,'NETWORK_ERROR');assert.equal(data.users,undefined);assert(!data.error.includes('[object Object]'));
  reset();failVotes=true;response=await handler(request());assert.equal(response.status,500);assert.equal(nameQueries.length,0);
  for(role of ['user','none','expired']){reset();response=await handler(request());assert.equal(response.status,401);assert.equal(voteQueries.length,0);assert.equal(nameQueries.length,0)}

  const html=read('api/mg-ui.js').replace(/^export const MG_HTML = String.raw`/,'').replace(/`;\s*$/,''),calls=[];
  let users=Array.from({length:383},(_,i)=>({user_id:'u'+i,username:'用户 '+i,votes:[{label:i===0?'<img src=x onerror=alert(1)>':'新功能',is_active:true}],last_voted_at:'2026-10-02T00:00:00Z'}));
  const dom=new JSDOM(html,{url:'https://score.test/mg?view=featurevotes&featurevotes_page=2',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  w.localStorage.setItem('st_admin_token','test-admin');w.setInterval=()=>0;
  w.fetch=async url=>{const action=new URL(url,'https://score.test').searchParams.get('action');calls.push(action);return{ok:true,json:async()=>action==='feature_votes'?{options,users,total_votes:703,total_voters:383,suggestions:[{id:'pending',content:'待处理的需求',status:'new',username:'用户 1'}],ai_config:{model:'existing-model'}}:{ok:true}}};
  w.eval(w.document.querySelector('script').textContent);await tick();
  const panel=()=>w.document.getElementById('featureVoteUsers'),rows=()=>panel().querySelectorAll('tbody tr'),next=()=>panel().querySelector('[data-page="featurevotes:next"]'),prev=()=>panel().querySelector('[data-page="featurevotes:prev"]');
  assert.equal(rows().length,100);assert(rows()[0].textContent.includes('用户 100'));assert(panel().textContent.includes('第 2 / 4 页'));
  assert.equal(panel(),w.document.querySelector('#page').lastElementChild);assert(w.document.querySelector('#page').textContent.indexOf('待处理的需求')<w.document.querySelector('#page').textContent.indexOf('用户投票情况'));
  const reads=calls.filter(x=>x==='feature_votes').length;
  const model=w.document.getElementById('aiVisionModel');model.value='draft-model';model.dispatchEvent(new w.Event('input'));
  next().click();assert.equal(rows().length,100);assert(rows()[0].textContent.includes('用户 200'));assert.equal(w.document.getElementById('aiVisionModel').value,'draft-model');
  next().click();assert.equal(rows().length,83);assert(next().disabled);assert(w.location.search.includes('featurevotes_page=4'));
  prev().click();assert.equal(rows().length,100);assert.equal(calls.filter(x=>x==='feature_votes').length,reads);
  const search=w.document.getElementById('globalSearch');search.value='用户 382';search.dispatchEvent(new w.Event('input'));await tick(300);
  assert.equal(rows().length,1);assert(rows()[0].textContent.includes('用户 382'));assert(panel().textContent.includes('共 1 人'));assert(prev().disabled&&next().disabled);
  search.value='not-found';search.dispatchEvent(new w.Event('input'));await tick(300);assert(panel().textContent.includes('没有匹配的投票用户'));assert(prev().disabled&&next().disabled);
  search.value='';search.dispatchEvent(new w.Event('input'));await tick(300);assert(prev().disabled);assert(!panel().querySelector('img'));assert(panel().textContent.includes('<img src=x onerror=alert(1)>'));
  next().click();next().click();next().click();users=users.slice(0,105);w.document.getElementById('refreshFeatureVotes').click();await tick();
  assert.equal(rows().length,5);assert(panel().textContent.includes('第 2 / 2 页'));assert(next().disabled);
  users=[];w.document.getElementById('refreshFeatureVotes').click();await tick();assert(panel().textContent.includes('还没有用户投票'));assert(panel().textContent.includes('第 1 / 1 页'));assert(prev().disabled&&next().disabled);
  dom.window.close();console.log('Admin votes: complete totals, bounded username requests, auth, failure handling, bottom placement, pagination, URL state, search, draft preservation and safe content passed');
})().catch(e=>{console.error(e);process.exit(1)});
