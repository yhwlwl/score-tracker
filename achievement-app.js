/* App adapter: only authenticated data API may grant achievements. */
(function(){'use strict';
 if(!window.ScoreAchievementUI||!window.ScoreAchievements||typeof bindPage!=='function')return;
 const UI=window.ScoreAchievementUI,C=window.ScoreAchievements;
 let session='',cache=null,enabled=null,inFlight=null,refreshTimer=null,revealTimer=null,dirty=false,checked=false,entry=null,generation=0;
 const presented=new Set();
 const tierOrder=['common','rare','epic','legendary','limited','mythic'];
 const key=()=>{try{return state?.user&&state?.token?String(state.user.id||state.user.username)+':'+state.token:''}catch(_){return ''}};
 function sync(){
  const current=key();if(current!==session){
   generation++;presented.clear();session=current;cache=null;enabled=null;dirty=false;checked=false;inFlight=null;clearTimeout(refreshTimer);clearTimeout(revealTimer);refreshTimer=null;revealTimer=null;
   UI.close();entry?.remove();entry=null;
  }
  return current;
 }
 async function call(action,payload={}){
  const current=sync();if(!current)throw Error('not signed in');
  const r=await fetch('/api/score-tracker-data-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:state.token,...payload})});
  if(current!==key())throw Error('account changed');
  const data=await r.json();if(!r.ok)throw Error('achievement unavailable');return data;
 }
 function blocked(){
  try{return !!(state.modal&&state.modal.isConnected!==false)||Array.from(document.querySelectorAll('dialog[open],.modal-backdrop,.fv36-back,.first-run-setup-overlay')).some(x=>x.getClientRects().length)}catch(_){return true}
 }
 function mount(){
  if(!sync()||enabled!==true)return;
  if(state.page!=='account'){entry?.remove();entry=null;return}
  const card=document.querySelector('#content .account-grid .account-card');if(!card)return;
  if(!entry||!entry.isConnected){entry=document.createElement('button');entry.type='button';entry.className='st-ach-entry';entry.onclick=()=>UI.openGallery(cache||[]);card.append(entry)}
  entry.textContent='我的成就 · 已收藏 '+(cache?.length||0)+' 枚  ›';
 }
 function acknowledge(ids,owner){
  if(key()!==owner)return;call('achievement_ack',{badgeIds:ids}).then(()=>{if(key()!==owner)return;const set=new Set(ids);cache=(cache||[]).map(a=>set.has(a.badge_id)?{...a,seen_at:new Date().toISOString()}:a);mount()}).catch(()=>{});
 }
 function reveal(){
  clearTimeout(revealTimer);revealTimer=null;if(!sync()||enabled!==true||document.hidden)return;
  const fresh=(cache||[]).filter(a=>!a.seen_at&&!presented.has(a.badge_id)&&C.badges.some(b=>b.id===a.badge_id));if(!fresh.length)return;
  if(blocked()){revealTimer=setTimeout(reveal,1800);return}
  const owner=session,badges=new Map(C.badges.map(b=>[b.id,b]));
  const ordered=[...fresh].sort((a,b)=>tierOrder.indexOf(badges.get(b.badge_id).tier)-tierOrder.indexOf(badges.get(a.badge_id).tier));
  const first=ordered[0];fresh.forEach(a=>presented.add(a.badge_id));UI.show(badges.get(first.badge_id),first,{play:true,batch:fresh.length,ack:()=>acknowledge(fresh.map(x=>x.badge_id),owner),onGallery:()=>{if(key()===owner)UI.openGallery(cache||[])}});
 }
 function queue(delay=700){if(!sync()||enabled===false)return;dirty=true;clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,delay)}
 async function refresh(){
  clearTimeout(refreshTimer);refreshTimer=null;const owner=sync();if(!owner||enabled===false)return;
  if(inFlight){dirty=true;return}dirty=false;const gen=generation;
  const promise=call('achievement_refresh');inFlight=promise;
  try{
   const r=await promise;if(gen!==generation||owner!==key())return;checked=true;enabled=r.enabled===true;if(!enabled)return;
   cache=Array.isArray(r.awards)?r.awards:[];mount();reveal();
   if(r.retryAfter){dirty=true;refreshTimer=setTimeout(refresh,Math.max(15,Math.min(120,Number(r.retryAfter)||60))*1000)}
  }catch(_){if(gen===generation)checked=true}
  finally{if(gen===generation&&inFlight===promise){inFlight=null;if(dirty&&!refreshTimer)refreshTimer=setTimeout(refresh,1000)}}
 }
 const prev=bindPage;bindPage=function(){const r=prev.apply(this,arguments);if(sync()){mount();if(!checked&&!inFlight&&!refreshTimer)queue(900)}return r};
 if(typeof dataApiV7==='function'){const previous=dataApiV7;dataApiV7=async function(action,payload){const owner=key(),result=await previous.apply(this,arguments);if(owner&&key()===owner&&['save_exam','save_goal','save_exam_reflection','delete_exam','toggle_exam_hidden'].includes(action)&&!result?.error)queue(1200);return result}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&sync()){mount();if(!checked)queue();else reveal()}});
 if(sync())queue(900);
})();
