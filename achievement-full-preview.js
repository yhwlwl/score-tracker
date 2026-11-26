/* Full-site preview only. Read existing personal records, evaluate locally, never call award-write APIs. */
(function(){'use strict';
const UI=window.ScoreAchievementUI,C=window.ScoreAchievements,E=window.ScoreAchievementEngine;
if(!UI||!C||!E||typeof bindPage!=='function')return;
let owner='',generation=0,awards=[],pending={},favorites=null,seen=new Set(),presented=new Set(),timer=null,revealTimer=null,flight=null,dirty=false,ready=false,failed=false,entry=null,controller=null;
const key=()=>{try{return state.user&&state.token?String(state.user.id||state.user.username)+':'+state.token:''}catch(_){return ''}};
const definitions=new Map(C.badges.map(b=>[b.id,b])),tiers=['common','rare','epic','legendary','limited','mythic'];
function sync(){const k=key();if(k!==owner){generation++;owner=k;clearTimeout(timer);clearTimeout(revealTimer);timer=null;revealTimer=null;controller?.abort();controller=null;flight=null;dirty=false;ready=false;failed=false;awards=[];pending={};favorites=null;seen=new Set();presented=new Set();UI.close();entry?.remove();entry=null}return k}
async function read(action,token,signal,fields={}){
 if(!['list_exams','get_goal'].includes(action))throw Error('preview read only');
 const r=await fetch('/api/score-tracker-data-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token,...fields}),cache:'no-store',credentials:'same-origin',signal});
 const d=await r.json().catch(()=>null);if(!r.ok||!d||d.error)throw Error('个人记录暂不可用');return d;
}
function opts(){const session=owner;return {realPreview:true,pending,favorites,onFavorites:async ids=>{if(key()!==session)throw Error('账号已切换');favorites=ids.filter(id=>awards.some(a=>a.badge_id===id)).slice(0,3);mount()}}}
function openCollection(){if(!sync())return;if(!ready){queue(0);return}UI.openGallery(awards,opts())}
function mount(){if(!sync())return;if(state.page!=='account'){entry?.remove();entry=null;return}
 const card=document.querySelector('#content .account-grid .account-card');if(!card)return;
 if(!entry||!entry.isConnected){entry=document.createElement('button');entry.type='button';entry.className='st-ach-entry';entry.onclick=openCollection;const before=card.querySelector('.account-secure-v39,#logoutBtn');if(before&&before.parentElement===card)card.insertBefore(entry,before);else card.append(entry)}
 entry.innerHTML=ready?UI.entryHTML(awards,{favorites,realPreview:true}):'<span class="st-ach-entry-top"><strong>我的成就</strong><span>'+ (failed?'点击重试':'正在计算…')+'</span></span>';
 const note=document.createElement('span');note.className='st-ach-entry-sub';note.textContent='预览 · 根据真实记录计算，不正式发放';entry.append(note);
}
function blocked(){try{return !!(state.modal&&state.modal.isConnected!==false)||Array.from(document.querySelectorAll('dialog[open],.modal-backdrop,.fv36-back,.first-run-setup-overlay')).some(x=>x.getClientRects().length)}catch(_){return true}}
function reveal(){clearTimeout(revealTimer);revealTimer=null;if(!sync()||!ready||document.hidden)return;const fresh=awards.filter(a=>!seen.has(a.badge_id)&&!presented.has(a.badge_id));if(!fresh.length)return;if(blocked()){revealTimer=setTimeout(reveal,1800);return}
 const session=owner,first=[...fresh].sort((a,b)=>tiers.indexOf(definitions.get(b.badge_id).tier)-tiers.indexOf(definitions.get(a.badge_id).tier))[0];fresh.forEach(a=>presented.add(a.badge_id));UI.show(definitions.get(first.badge_id),first,{...opts(),play:true,batch:fresh.length,ack:()=>{if(key()===session)fresh.forEach(a=>seen.add(a.badge_id))},onGallery:()=>{if(key()===session)openCollection()}});
}
function queue(delay=650){if(!sync())return;dirty=true;clearTimeout(timer);timer=setTimeout(refresh,delay)}
async function refresh(){clearTimeout(timer);timer=null;const k=sync();if(!k)return;if(flight){dirty=true;return}dirty=false;failed=false;const gen=generation,token=state.token,expected=state.user.id,ac=new AbortController();controller=ac;
 const task=Promise.all([read('list_exams',token,ac.signal,{exam_goal_version:1}),read('get_goal',token,ac.signal)]);
 flight=task;mount();
 try{
  const [d,g]=await task;if(gen!==generation||key()!==k)return;
  if(!d.user?.id||(expected&&d.user.id!==expected)||!Array.isArray(d.exams)||!Object.hasOwn(g,'goal'))throw Error('数据不完整');
  if(d.exams.length>=1000||d.exams.reduce((n,e)=>n+Object.keys(e.scores||{}).length,0)>=1000)throw Error('超过预览读取上限');
  const createdAt=d.user.created_at||d.user.createdAt||state.user.created_at||state.user.createdAt||null;
  const hits=E.evaluate({exams:d.exams,goal:g.goal,createdAt}).filter(a=>definitions.get(a.badge_id)?.mode==='auto');
  if(gen!==generation||key()!==k)return;
  awards=hits;pending=Object.fromEntries(C.badges.filter(b=>b.mode!=='auto').map(b=>[b.id,b.mode==='snapshot'?'真实预测快照未接入，暂不能核验。':'需要活动记录或人工核验。']));
  if(!createdAt)pending.early='账号接口未提供注册日期，暂不能核验。';
  ready=true;failed=false;mount();reveal();
 }catch(_){if(gen===generation&&key()===k){failed=true;mount()}}
 finally{if(gen===generation&&flight===task){flight=null;controller=null;if(dirty&&!timer)timer=setTimeout(refresh,800)}}
}
const prev=bindPage;bindPage=function(){const r=prev.apply(this,arguments);if(sync()){mount();if(!ready&&!failed&&!flight&&!timer)queue(900)}return r};
if(typeof dataApiV7==='function'){const previous=dataApiV7;dataApiV7=async function(action,payload){const k=key(),r=await previous.apply(this,arguments);if(k&&key()===k&&['save_exam','save_goal','save_exam_reflection','delete_exam','toggle_exam_hidden','save_subjects'].includes(action)&&!r?.error)queue(1200);return r}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&sync()){mount();if(!ready&&!failed&&!flight&&!timer)queue();else reveal()}});
if(sync())queue(900);
})();