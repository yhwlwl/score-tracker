/* App adapter: only authenticated data API may grant achievements. */
(function(){'use strict';
 if(!window.ScoreAchievementUI||!window.ScoreAchievements||typeof bindPage!=='function')return;
 const UI=window.ScoreAchievementUI,C=window.ScoreAchievements;
 let session='',cache=null,enabled=null,inFlight=null,refreshTimer=null,revealTimer=null,dirty=false,checked=false,entry=null,adminEntry=null,generation=0,cooldownRetry=false,failures=0,lastRefresh=0,followupTimer=null;
 const presented=new Set();let favorites=null,stats=null,ackInFlight=null;
 const receiptKey=()=> 'st-ach-presented:'+String(state.user.id||state.user.username);
 function restorePresented(){try{for(const id of JSON.parse(localStorage.getItem(receiptKey())||'[]'))if(C.badges.some(b=>b.id===id))presented.add(id)}catch(_){}}
 function rememberPresented(ids){restorePresented();ids.forEach(id=>presented.add(id));try{localStorage.setItem(receiptKey(),JSON.stringify([...presented]))}catch(_){}}
 function galleryOptions(){const owner=session;return {favorites,stats,onFavorites:async ids=>{if(key()!==owner)throw Error('account changed');const r=await call('achievement_favorites',{badgeIds:ids});if(key()!==owner||!r.ok)throw Error('save failed');favorites=r.favorites;mount()}}}
 let openingCollection=false;
 async function openCollection(){
  const owner=key();if(!owner||openingCollection)return;openingCollection=true;
  try{const r=await call('achievement_overview');if(key()!==owner)return;if(r.enabled){cache=Array.isArray(r.awards)?r.awards:cache;favorites=r.favorites??favorites;stats=r.stats??stats;mount()}}
  catch(_){/* last successful aggregate remains usable */}
  finally{openingCollection=false}
  if(key()===owner)UI.openGallery(cache||[],galleryOptions());
 }
 const tierOrder=['common','rare','epic','legendary','limited','mythic'];
 const key=()=>{try{return state?.user&&state?.token?String(state.user.id||state.user.username)+':'+state.token:''}catch(_){return ''}};
 function sync(){
  const current=key();if(current!==session){
   generation++;cooldownRetry=false;failures=0;lastRefresh=0;clearTimeout(followupTimer);followupTimer=null;presented.clear();ackInFlight=null;if(current)restorePresented();favorites=null;stats=null;session=current;cache=null;enabled=null;dirty=false;checked=false;inFlight=null;clearTimeout(refreshTimer);clearTimeout(revealTimer);refreshTimer=null;revealTimer=null;
   UI.close();entry?.remove();entry=null;adminEntry?.remove();adminEntry=null;
  }
  return current;
 }
 async function call(action,payload={}){
  const current=sync();if(!current)throw Error('not signed in');
  const r=await fetch('/api/score-tracker-data-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:state.token,...payload,achievement_release:2})});
  if(current!==key())throw Error('account changed');
  const data=await r.json();if(!r.ok)throw Error('achievement unavailable');return data;
 }
 function blocked(){
  try{return !!(state.modal&&state.modal.isConnected!==false)||Array.from(document.querySelectorAll('dialog[open],.modal-backdrop,.fv36-back,.first-run-setup-overlay')).some(x=>x.getClientRects().length)}catch(_){return true}
 }
 function mount(){
  if(!sync()||enabled!==true)return;
  if(state.page!=='account'){entry?.remove();entry=null;adminEntry?.remove();adminEntry=null;return}
  const card=document.querySelector('#content .account-grid .account-card');if(!card)return;
  if(!entry||!entry.isConnected){entry=document.createElement('button');entry.type='button';entry.className='st-ach-entry';entry.onclick=openCollection;const before=card.querySelector('.account-secure-v39,#logoutBtn');if(before&&before.parentElement===card)card.insertBefore(entry,before);else card.append(entry)}
  entry.innerHTML=UI.entryHTML(cache||[],{favorites,stats});
  if(state.user?.is_admin===true&&(!adminEntry||!adminEntry.isConnected)){
   adminEntry=document.createElement('button');adminEntry.type='button';adminEntry.textContent='管理发放限定徽章';adminEntry.className='st-ach-entry';adminEntry.onclick=adminGrant;entry.after(adminEntry);
  }
 }
 function adminGrant(){
  if(state.user?.is_admin!==true)return;
  const owner=key(),dialog=document.createElement('dialog'),form=document.createElement('form');
  dialog.style.cssText='max-width:min(420px,90vw);width:100%;border:1px solid #8493a8;border-radius:14px;padding:20px;background:Canvas;color:CanvasText';
  form.style.cssText='display:grid;gap:12px';
  const heading=document.createElement('h2');heading.textContent='发放限定徽章';
  const field=(text,control)=>{const l=document.createElement('label');l.style.cssText='display:grid;gap:5px';l.append(document.createTextNode(text),control);return l};
  const username=document.createElement('input');username.required=true;username.maxLength=40;username.autocomplete='off';
  const badge=document.createElement('select');for(const b of C.badges.filter(b=>b.mode==='manual')){const o=document.createElement('option');o.value=b.id;o.textContent=b.name;badge.append(o)}
  const date=document.createElement('input');date.type='date';date.required=true;date.max=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const confirm=document.createElement('input');confirm.type='checkbox';confirm.required=true;const check=document.createElement('label');check.append(confirm,document.createTextNode(' 我已确认该账号确实满足活动或贡献条件'));
  const status=document.createElement('p');status.setAttribute('role','status');const submit=document.createElement('button');submit.type='submit';submit.textContent='确认发放';const close=document.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>dialog.close();
  form.append(heading,field('账号用户名',username),field('徽章',badge),field('实际参与或贡献日期',date),check,status,submit,close);dialog.append(form);document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  form.onsubmit=async e=>{e.preventDefault();if(key()!==owner)return;submit.disabled=true;try{const r=await call('achievement_admin_grant',{username:username.value.trim(),badgeId:badge.value,eventDate:date.value,confirmed:confirm.checked});if(!r.ok)throw Error();status.textContent='发放成功（已有徽章不会重复发放）';confirm.checked=false;queue()}catch(_){status.textContent='发放失败，请核对账号、日期和管理员权限。'}finally{submit.disabled=false}};
  dialog.showModal();
 }
 function acknowledge(){
  if(ackInFlight)return;
  const owner=session,ids=(cache||[]).filter(a=>a.badge_id!=='triple'&&!a.seen_at&&presented.has(a.badge_id)).map(a=>a.badge_id);
  if(!ids.length||key()!==owner)return;
  const request=call('achievement_ack',{badgeIds:ids});ackInFlight=request;
  request.then(r=>{if(key()!==owner||!r.ok)return;const set=new Set(ids);cache=(cache||[]).map(a=>set.has(a.badge_id)?{...a,seen_at:a.seen_at||new Date().toISOString()}:a);mount()}).catch(()=>{}).finally(()=>{if(ackInFlight===request)ackInFlight=null});
 }
 function reveal(){
  clearTimeout(revealTimer);revealTimer=null;if(!sync()||enabled!==true||document.hidden)return;
  restorePresented();acknowledge();
  const fresh=(cache||[]).filter(a=>a.badge_id!=='triple'&&!a.seen_at&&!presented.has(a.badge_id)&&C.badges.some(b=>b.id===a.badge_id));if(!fresh.length)return;
  if(blocked()){revealTimer=setTimeout(reveal,1800);return}
  const owner=session,badges=new Map(C.badges.map(b=>[b.id,b]));
  const ordered=[...fresh].sort((a,b)=>tierOrder.indexOf(badges.get(b.badge_id).tier)-tierOrder.indexOf(badges.get(a.badge_id).tier));
  const first=ordered[0];UI.show(badges.get(first.badge_id),first,{stats,play:true,autoFlip:true,batch:fresh.length,ack:()=>{if(key()===owner)acknowledge()},onGallery:()=>{if(key()===owner)openCollection()}});rememberPresented(fresh.map(a=>a.badge_id));acknowledge();
 }
 function queue(delay=700){if(!sync()||enabled===false)return;cooldownRetry=false;dirty=true;clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,delay)}
 async function refresh(){
  clearTimeout(refreshTimer);refreshTimer=null;const owner=sync();if(!owner||enabled===false)return;
  if(inFlight){dirty=true;return}dirty=false;const gen=generation;
  const promise=call('achievement_refresh');inFlight=promise;
  try{
   const r=await promise;if(gen!==generation||owner!==key())return;failures=0;checked=true;enabled=r.enabled===true;if(!r.retryAfter)lastRefresh=Date.now();if(!enabled)return;
   cache=Array.isArray(r.awards)?r.awards:[];favorites=r.favorites??null;stats=r.stats??null;mount();reveal();
   if(r.retryAfter&&!cooldownRetry){cooldownRetry=true;dirty=true;refreshTimer=setTimeout(refresh,Math.max(15,Math.min(120,Number(r.retryAfter)||60))*1000)}
  }catch(_){if(gen===generation){checked=false;failures++;if(failures<=3&&!refreshTimer)refreshTimer=setTimeout(refresh,Math.min(8000,1000*2**failures));}}
  finally{if(gen===generation&&inFlight===promise){inFlight=null;if(dirty&&!refreshTimer)refreshTimer=setTimeout(refresh,1000)}}
 }
 // A save may enqueue an asynchronous trajectory replay. One coalesced follow-up, not a polling loop.
 function followup(owner){clearTimeout(followupTimer);followupTimer=setTimeout(()=>{followupTimer=null;if(key()===owner&&!document.hidden)queue(0)},120000)}
 const prev=bindPage;bindPage=function(){const r=prev.apply(this,arguments);if(sync()){mount();if(!checked&&!inFlight&&!refreshTimer)queue(900)}return r};
 if(typeof dataApiV7==='function'){const previous=dataApiV7;dataApiV7=async function(action,payload){const owner=key(),result=await previous.apply(this,arguments);if(owner&&key()===owner&&['save_exam','save_goal','save_exam_reflection','delete_exam','toggle_exam_hidden','study_question'].includes(action)&&!result?.error){queue(1200);if(action!=='study_question')followup(owner)}return result}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&sync()){mount();if((!checked||Date.now()-lastRefresh>=120000)&&!inFlight&&!refreshTimer){failures=0;queue()}else reveal()}});
 if(sync())queue(900);
})();
