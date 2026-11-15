/* All data is synthetic. Every application request is intercepted in this frame. */
(function(){
 const fresh=window.SETUP_QA_MODE==='new';
 const clone=v=>JSON.parse(JSON.stringify(v));
 let profile={step:6,completed_at:'2026-11-15',preference_guide_version:0,selected_subjects:fresh?[]:['物理','化学','地理'],school:fresh?null:{name:'示例中学',province:'四川省',city:'成都市',source:'manual'},current_grade:fresh?'':'高二'};
 let subjects=['语文','数学','英语','物理','化学','地理'].map(name=>({name,defaultMax:['语文','数学','英语'].includes(name)?150:100}));
 let modules=[{id:'11111111-1111-4111-8111-111111111111',name:'语数外',subjects:['语文','数学','英语'],isBuiltin:true},{id:'22222222-2222-4222-8222-222222222222',name:'语数外 + 物理/历史（四科）',subjects:['语文','数学','英语','物理'],isBuiltin:true},{id:'33333333-3333-4333-8333-333333333333',name:'语数外 + 所选科（六科）',subjects:['语文','数学','英语','物理','化学','地理'],isBuiltin:true}];
 if(!fresh)modules.push({id:'44444444-4444-4444-8444-444444444444',name:'理科重点',subjects:['物理','化学'],isBuiltin:false});
 let classification={label:'年级',options:['高一','高二','高三']},defaults=fresh?{}:{total:{year:650,class:48},'s:物理':{year:360,class:48}};
 let goal=fresh?null:{subjects:{数学:135,英语:130},totalGoal:620,targetRank:100,school:'理想大学',date:'2027-06-07',dateName:'高考'};
 let sharing=!fresh,username=fresh?'bright-cloud-1024':'小林',store={};
 if(!fresh)store.st_token='synthetic-preview-token';store.st_pwa_install_v1=JSON.stringify({never:true});store.st_theme='sunny';
 Object.defineProperty(window,'localStorage',{value:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}}});
 navigator.sendBeacon=()=>true;
 const user=()=>({id:'55555555-5555-4555-8555-555555555555',username,is_admin:false});
 window.qaCalls=[];
 window.fetch=async(url,opts)=>{
  const b=JSON.parse(opts?.body||'{}');window.qaCalls.push({url:String(url),...b});let data={ok:true,enabled:false,items:[],notices:[],comments:[],availableCount:0,hasVoted:!fresh,hasUnvoted:false};
  if(['me','register','login'].includes(b.action))data={user:user(),token:'synthetic-preview-token',password:'demo-only-7T9k'};
  if(['bootstrap','list_exams'].includes(b.action))data={user:user(),subjects,modules,classification,participantDefaults:defaults,goal,exams:[]};
  if(b.action==='list_modules')data={modules};
  if(b.action==='get')data={profile};
  if(b.action==='start')data={profile};
  if(b.action==='save'){profile={...profile,...b};delete profile.token;delete profile.action;data={profile};}
  if(b.action==='school_save'){profile.school=b.school;data={profile};}
  if(b.action==='school_search')data={schools:[['示例中学','四川省','成都市',''],['示例实验学校','四川省','成都市','']],has_more:false};
  if(b.action==='save_subjects'){subjects=clone(b.subjects);data={subjects};}
  if(b.action==='save_modules'){modules=clone(b.modules).map((m,i)=>({...m,id:m.id||'66666666-6666-4666-8666-'+String(i+1).padStart(12,'0')}));data={modules};}
  if(b.action==='save_classification'){classification=clone(b.classification);data={classification};}
  if(b.action==='save_participant_defaults'){Object.entries(b.defaults).forEach(([k,r])=>defaults[k]={...defaults[k],...r});data={participantDefaults:defaults};}
  if(b.action==='get_goal')data={goal};
  if(b.action==='save_goal'){goal=clone(b.goal);data={ok:true};}
  if(b.action==='rename'){username=b.username;data={user:user()};}
  if(b.action==='privacy_status')data={enabled:sharing,configured:!fresh};
  if(b.action==='sharing'){sharing=b.enabled;data={enabled:sharing};}
  if(b.action==='account_status')data={account:{enabled:true,budget_status:'ready',growth:{level:fresh?1:6,points:fresh?0:670,registered_days:fresh?0:145,active_months:fresh?0:5,valid_exams:fresh?0:12,features:[],levels:[{level:1,threshold:0,monthly_credits:0},{level:2,threshold:60,monthly_credits:400},{level:6,threshold:500,monthly_credits:1000},{level:7,threshold:900,monthly_credits:1400,min_days:120,min_months:4}]},credits:{available:fresh?150:1860,monthly:fresh?0:1000,welcome:150,cap:3000,held:0}}};
  if(b.action==='school_prompt_claim')data={claimed:false,profile};
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 if(fresh)document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>startRegister(),0),{once:true});
})();
