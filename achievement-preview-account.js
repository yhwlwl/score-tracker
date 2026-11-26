/* Preview only: existing authenticated account API, local evaluator, no award writes. */
(function(){
'use strict';
const $=id=>document.getElementById(id),UI=window.ScoreAchievementUI,C=window.ScoreAchievements,E=window.ScoreAchievementEngine;
const tabs=$('preview-tabs'),form=$('preview-login'),status=$('preview-status'),real=$('preview-real'),demo=$('achievement-preview'),account=$('preview-account'),notice=$('preview-result-note');
let token='',user=null,awards=[],pending={},epoch=0,busy=false,request=null,previewFavorites=null;
function message(s){status.textContent=s}
function setMode(mode){UI.close();const isReal=mode==='real';demo.hidden=isReal;real.hidden=!isReal;tabs.querySelectorAll('button').forEach(b=>{const active=b.dataset.mode===mode;b.setAttribute('aria-pressed',String(active))})}
function setBusy(value){busy=value;form.querySelectorAll('input,button').forEach(x=>x.disabled=value);$('preview-refresh').disabled=value;$('preview-use-session').disabled=value}
function clearResult(){UI.close();previewFavorites=null;awards=[];pending={};$('preview-real-gallery').replaceChildren();account.hidden=true;notice.textContent='';user=null;token=''}
function reset(){epoch++;request?.abort();request=null;clearResult();form.reset();form.hidden=false;setBusy(false);message('');$('preview-use-session').hidden=!existingToken()}
function existingToken(){try{return localStorage.getItem('st_token')||''}catch(_){return ''}}
async function api(endpoint,action,fields,signal){
 const r=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...fields}),cache:'no-store',credentials:'same-origin',signal});
 const data=await r.json().catch(()=>null);
 if(!r.ok||!data||data.error){const e=Error(typeof data?.error==='string'?data.error:'服务暂时不可用（HTTP '+r.status+'）');e.status=r.status;throw e}
 return data;
}
async function load(session,expected,signal){
 message('正在读取真实考试及目标记录…');
 const [data,goal]=await Promise.all([
  api('score-tracker-data-api','list_exams',{token:session,exam_goal_version:1},signal),
  api('score-tracker-data-api','get_goal',{token:session},signal)
 ]);
 if(!data.user?.id||!Array.isArray(data.exams)||!Object.hasOwn(goal,'goal'))throw Error('真实数据接口返回不完整，未计算成就。');
 if(expected&&data.user.id!==expected)throw Error('账号身份不一致，请重新登录。');
 const scoreCount=data.exams.reduce((n,e)=>n+Object.keys(e.scores||{}).length,0);
 if(data.exams.length>=1000||scoreCount>=1000)throw Error('记录已达到现有接口单次读取上限，无法确认数据完整性；本次不生成不完整的成就结果。');
 if(!E||!window.ScoreAchievementModels)throw Error('成就判定模型加载失败，请刷新页面。');
 message('正在使用真实记录计算符合的成就…');
 // Render the status before running the synchronous, deterministic local replay.
 await new Promise(resolve=>setTimeout(resolve,0));
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 const createdAt=data.user.created_at||data.user.createdAt||null;
 const evaluated=E.evaluate({exams:data.exams,goal:goal.goal,createdAt});
 const available=new Set(C.badges.filter(b=>b.mode==='auto').map(b=>b.id));
 const hits=evaluated.filter(a=>available.has(a.badge_id));
 const unavailable=Object.fromEntries(C.badges.filter(b=>b.mode!=='auto').map(b=>[b.id,b.mode==='snapshot'?'缺少真实轨迹匹配预测快照，本次不能判定。':'需要活动记录或人工核验，本次不能判定。']));
 if(!createdAt)unavailable.early='现有账号接口未返回注册日期，不能核验首周注册资格。';
 return {user:data.user,hits,unavailable,examCount:data.exams.length};
}
function render(result,session){
 token=session;user=result.user;awards=result.hits;pending=result.unavailable;
 form.hidden=true;account.hidden=false;
 $('preview-user').textContent=user.username||'已登录账号';
 notice.textContent='已读取 '+result.examCount+' 条考试记录，检测到 '+awards.length+' 枚符合条件的徽章；'+Object.keys(pending).length+' 枚待快照或活动资格核验。以下为真实历史数据计算结果，不代表正式发放。';
 UI.gallery($('preview-real-gallery'),awards,false,{realPreview:true,pending,favorites:previewFavorites,onFavorites:async ids=>{previewFavorites=ids}});
 $('preview-pending').textContent=Object.keys(pending).length?'暂不能核验：'+C.badges.filter(b=>pending[b.id]).map(b=>b.name).join('、')+'。':'';
 $('preview-play').disabled=!awards.length;
 message('');setMode('real');
}
async function run(task){
 if(busy)return;
 const seq=++epoch;request?.abort();request=new AbortController();const signal=request.signal;setBusy(true);
 try{const r=await task(signal);if(epoch===seq&&!signal.aborted)render(r.result,r.session)}
 catch(e){if(epoch===seq&&!signal.aborted){clearResult();form.hidden=false;message(e?.status===401?'登录无效或账号密码不正确，请重新登录。':e.message||'加载失败，请重试。')}}
 finally{if(epoch===seq){request=null;setBusy(false);$('preview-password').value='';$('preview-use-session').hidden=!existingToken()}}
}
form.addEventListener('submit',e=>{e.preventDefault();if(busy)return;const credentials={username:$('preview-username').value.trim(),password:$('preview-password').value};$('preview-password').value='';
 run(async signal=>{message('正在通过 Score Tracker 账号服务登录…');let auth;
 try{auth=await api('score-tracker-api','login',credentials,signal)}catch(e){if(e.status===400||e.status===429||signal.aborted)throw e;auth=await api('score-tracker-data-api','login_v2',credentials,signal)}
 if(!auth.token||!auth.user?.id)throw Error('登录响应不完整。');return {session:auth.token,result:await load(auth.token,auth.user.id,signal)}});
});
$('preview-use-session').onclick=()=>{const t=existingToken();if(t)run(async signal=>({session:t,result:await load(t,null,signal)}))};
$('preview-refresh').onclick=()=>{const t=token,id=user?.id;if(t)run(async signal=>({session:t,result:await load(t,id,signal)}))};
$('preview-logout').onclick=reset;
$('preview-play').onclick=()=>{if(!awards.length)return;const order=['common','rare','epic','legendary','limited','mythic'];const defs=new Map(C.badges.map(b=>[b.id,b]));const first=[...awards].sort((a,b)=>order.indexOf(defs.get(b.badge_id).tier)-order.indexOf(defs.get(a.badge_id).tier))[0];UI.show(defs.get(first.badge_id),first,{realPreview:true,play:true,batch:awards.length})};
tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-mode]');if(b)setMode(b.dataset.mode)});
window.addEventListener('pagehide',()=>{epoch++;request?.abort();request=null;clearResult();form.reset();form.hidden=false;setBusy(false);message('')});
UI.gallery(demo,[],true);reset();setMode('demo');
})();
