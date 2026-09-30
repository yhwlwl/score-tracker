/* Release notifications: deployed version stays immutable; content is managed remotely. */
(function () {
  'use strict';
  var API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-notices';
  var CURRENT = (document.querySelector('meta[name="application-version"]') || {}).content || 'v7.0';
  var PERIOD = 30 * 60 * 1000;
  var DEFAULT = {version:'v7.0',enabled:true,title:'v7.0 更新内容',content:'我们好高兴地告诉大家，图片识别功能正式上线了！\n\n新建考试时，进入「快速录入」，选择「图片识别」模式，上传图片即可自动解析。\n\n功能刚刚上线，还有些不稳定。如果遇到识别错误等情况，欢迎大家及时反馈哦。',tip_enabled:false,tip_content:'自然语言快速录入功能已上线，欢迎在新建考试时体验。',announcement_enabled:false,announcement_title:'公告',announcement_content:'',revision:1};
  var active = '', lastCheck = 0, busy = null, pending = [], memory = {}, latestConfig = DEFAULT;
  var modal = null, lastFocus = null, pumpTimer = null, loginTimer = null;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function version(v) { var parts=String(v || '').trim().replace(/^v/i,'').split('.').map(Number);while(parts.length>2&&parts[parts.length-1]===0)parts.pop();if(parts.length===1)parts.push(0);return 'v'+parts.join('.'); }
  function compare(a,b) { var x=version(a).slice(1).split('.').map(Number), y=version(b).slice(1).split('.').map(Number); for(var i=0;i<Math.max(x.length,y.length);i++){var d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0; }
  function track(type,data) { try { return (window.__scoreTrackerTrack || window.__stTrack || function(){})(type,Object.assign({current_version:CURRENT},data||{})); } catch (_) {} }
  function user() { try { return state.user && state.token ? {id:String(state.user.id),token:state.token} : null; } catch (_) { return null; } }
  function key(u,kind,id) { return 'st_notice_seen:'+u.id+':'+kind+':'+id; }
  function seen(u,kind,id) { var k=key(u,kind,id);try{return memory[k] || localStorage.getItem(k)==='1';}catch(_){return !!memory[k];} }
  function mark(u,kind,id) { var k=key(u,kind,id);memory[k]=true;try{localStorage.setItem(k,'1');}catch(_){} }
  function context() { var id=function(k,storage){try{return storage.getItem(k)||null;}catch(_){return null;}};return {session_id:id('st_session_id',sessionStorage),visitor_id:id('st_visitor_id',localStorage),app_version:CURRENT,pathname:location.pathname,app_page:(typeof state!=='undefined'&&state.page)||'unknown'}; }
  async function call(action,payload,u) {
    var controller=new AbortController(),timeout=setTimeout(function(){controller.abort();},10000);
    try {
      var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,cache:'no-store',body:JSON.stringify(Object.assign({action:action,token:(u||user()||{}).token||'',context:context()},payload||{}))});
      var data=await r.json();if(!r.ok){var e=new Error(data.error||'暂时无法读取更新内容');e.status=r.status;throw e;}return data;
    } finally {clearTimeout(timeout);}
  }
  async function deployed() {
    var controller=new AbortController(),timeout=setTimeout(function(){controller.abort();},10000);
    try { var url=new URL('index.html',location.href);url.searchParams.set('__cb',Date.now());var r=await fetch(url.href,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error('版本检查失败');var doc=new DOMParser().parseFromString(await r.text(),'text/html'),m=doc.querySelector('meta[name="application-version"]');if(!m||!/^v?\d+(\.\d+){0,2}$/i.test(m.content))throw new Error('暂时未找到版本信息');return version(m.content); } finally {clearTimeout(timeout);}
  }
  function blocking() { try{if(state.onboarding)return true;}catch(_){}return document.visibilityState!=='visible'||!!document.querySelector('.modal-backdrop,.fv36-back,.st-fb-back,.gmodal-backdrop.open'); }
  function injectStyle() {
    if(document.getElementById('release-notices-style'))return;
    var s=document.createElement('style');s.id='release-notices-style';s.textContent=
      '.rn-back{position:fixed;inset:0;z-index:171;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.42);backdrop-filter:blur(9px)}'+
      '.rn-modal{width:min(540px,100%);max-height:90vh;max-height:90dvh;overflow:auto;border:1px solid var(--line,#e7eaf0);border-radius:24px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 30px 90px rgba(17,24,39,.26);padding:24px;animation:rn-enter .24s ease-out}'+
      '.rn-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.rn-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font-size:25px;margin-bottom:17px}.rn-close{border:0;border-radius:11px;background:var(--cell,#f3f5f8);color:var(--muted,#6f7988);width:34px;height:34px;font-size:22px;cursor:pointer}'+
      '.rn-kicker{color:var(--accent,#5d72e8);font-size:11px;font-weight:750;letter-spacing:.04em}.rn-title{font-size:23px;line-height:1.4;margin:7px 0 17px}.rn-content{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.9}.rn-status{background:var(--cell,#f7f8fb);color:var(--muted,#7a8494);border-radius:13px;padding:11px 13px;margin-top:20px;font-size:12px;line-height:1.65}.rn-actions{display:flex;justify-content:flex-end;margin-top:21px}.rn-action{border:0;border-radius:12px;background:var(--accent,#5d72e8);color:var(--on-surface,#fff);padding:12px 22px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer}.rn-action:disabled{opacity:.6}.rn-modal button:focus-visible,.rn-banner button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}'+
      '.rn-banner{position:fixed;top:calc(14px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(620px,calc(100vw - 24px));padding:13px 15px;display:flex;gap:12px;align-items:center;border:1px solid var(--line,#e7eaf0);border-radius:16px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:var(--nav-shadow);z-index:95;font-size:13px;line-height:1.6}.rn-banner span{flex:1;white-space:pre-wrap;overflow-wrap:anywhere}'+
      '@keyframes rn-enter{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.rn-modal{animation:none}}@media(max-width:620px){.rn-back{padding:12px}.rn-modal{padding:20px 18px;border-radius:21px}.rn-title{font-size:21px}.rn-content{font-size:13px}.rn-actions .rn-action{width:100%}}';
    document.head.appendChild(s);
  }
  function close(reason) {
    if(!modal)return;var old=modal;modal=null;
    track(old.kind==='release'?'update_prompt_dismissed':'announcement_dismissed',{target_version:old.id,source:old.source,reason:reason,duration_ms:Date.now()-old.started,needs_update:old.outdated});
    old.back.remove();document.body.style.overflow=old.overflow;
    if(lastFocus&&lastFocus.isConnected)lastFocus.focus();lastFocus=null;queuePump();
  }
  function show(item) {
    injectStyle();if(item.kind==='tip')return showTip(item);
    var outdated=item.kind==='release'&&compare(item.id,CURRENT)>0,back=document.createElement('div');back.className='rn-back';back.id='releaseNotice';
    back.innerHTML='<section class="rn-modal" role="dialog" aria-modal="true" aria-labelledby="rnTitle" aria-describedby="rnContent"><div class="rn-head"><div class="rn-icon" aria-hidden="true">'+(item.kind==='release'?'✦':'↗')+'</div><button class="rn-close" type="button" aria-label="关闭">×</button></div><div class="rn-kicker">'+(item.kind==='release'?'成绩轨迹 · '+esc(item.id):'成绩轨迹')+'</div><h2 class="rn-title" id="rnTitle">'+esc(item.title)+'</h2><div class="rn-content" id="rnContent">'+esc(item.content)+'</div>'+(item.kind==='release'?'<div class="rn-status">'+(outdated?'你正在使用 '+esc(CURRENT)+'，更新后就能体验新功能。':'你已经在使用 '+esc(CURRENT)+'，快去试试吧。')+'</div>':'')+'<div class="rn-actions"><button class="rn-action" type="button">'+(outdated?'现在更新':'我知道了')+'</button></div></section>';
    lastFocus=document.activeElement;modal=Object.assign({},item,{back:back,outdated:outdated,started:Date.now(),overflow:document.body.style.overflow});document.body.style.overflow='hidden';document.body.appendChild(back);
    mark(item.user,item.kind,item.id);
    if(item.manual&&item.user.id!=='guest')call('notice_claim',{kind:item.kind,notice_id:item.id},item.user).catch(function(e){track('notice_claim_failed',{kind:item.kind,notice_id:item.id,status:e.status||0});});
    track(item.kind==='release'?'update_prompt_shown':'announcement_shown',{target_version:item.id,source:item.source,manual:item.manual,needs_update:outdated});
    var button=back.querySelector('.rn-action');button.focus();back.querySelector('.rn-close').onclick=function(){close('close_button');};back.onclick=function(e){if(e.target===back)close('backdrop');};
    back.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close('escape');}if(e.key==='Tab'){var buttons=back.querySelectorAll('button'),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    button.onclick=async function(){if(!outdated){track(item.kind==='release'?'update_acknowledged':'announcement_acknowledged',{target_version:item.id,source:item.source});close('acknowledged');return;}button.disabled=true;button.textContent='正在更新…';try{sessionStorage.setItem('st_notice_update_pending',JSON.stringify({user_id:item.user.id,from:CURRENT,to:item.id}));}catch(_){}await Promise.race([Promise.resolve(track('update_apply',{from:CURRENT,to:item.id,source:item.source})),new Promise(function(resolve){setTimeout(resolve,500);})]);var url=new URL(location.href);url.searchParams.set('__update',Date.now());location.replace(url.href);};
  }
  function showTip(item) {
    var existing=document.getElementById('releaseTip');if(existing)existing.remove();var b=document.createElement('div');b.className='rn-banner';b.id='releaseTip';b.innerHTML='<span>'+esc(item.content)+'</span><button class="rn-close" type="button" aria-label="关闭提示">×</button>';document.body.appendChild(b);mark(item.user,item.kind,item.id);track('tip_shown',{notice_id:item.id,source:item.source});b.querySelector('button').onclick=function(){b.remove();track('tip_dismissed',{notice_id:item.id,reason:'close_button'});};
  }
  function queuePump() { clearTimeout(pumpTimer);if(pending.length)pumpTimer=setTimeout(pump,350); }
  async function pump() {
    if(modal||!pending.length)return;
    if(blocking()){queuePump();return;}
    var item=pending[0],u=user()||(item.manual&&item.user.id==='guest'?item.user:null);if(!u||u.id!==item.user.id||u.token!==item.user.token){pending.shift();queuePump();return;}
    if(!item.manual&&!item.claimed){
      if(seen(u,item.kind,item.id)){pending.shift();queuePump();return;}
      if(item.claiming)return;item.claiming=true;
      try{var claim=await call('notice_claim',{kind:item.kind,notice_id:item.id},u);if(!user()||user().id!==u.id||user().token!==u.token||pending[0]!==item)return;if(!claim.claimed){mark(u,item.kind,item.id);pending.shift();track('notice_suppressed',{kind:item.kind,notice_id:item.id,reason:'already_seen'});queuePump();return;}item.claimed=true;}
      catch(e){track('notice_claim_failed',{kind:item.kind,notice_id:item.id,status:e.status||0,error:String(e.message).slice(0,180)});if(pending[0]===item)pending.shift();queuePump();return;}
      finally{item.claiming=false;}
      if(!user()||user().id!==u.id||user().token!==u.token)return;if(blocking()){queuePump();return;}
    }
    pending.shift();show(item);queuePump();
  }
  function enqueue(item) {if((modal&&modal.kind===item.kind&&modal.id===item.id)||pending.some(function(x){return x.kind===item.kind&&x.id===item.id;}))return;pending.push(item);pump();}
  async function check(source,manual) {
    var u=user();if((!u&&!manual)||(!manual&&document.querySelector('.auth-page'))||(!manual&&(document.visibilityState!=='visible'||navigator.onLine===false)))return;
    if(busy){await busy;if(manual)return check(source,true);return;}
    u=u||{id:'guest',token:''};var start=Date.now();lastCheck=start;
    busy=(async function(){
      track('update_check_started',{source:source});
      var results=await Promise.allSettled([call(u.id==='guest'?'notice_public':'notice_check',{},u),deployed()]);
      if(u.id!=='guest'&&(!user()||user().id!==u.id||user().token!==u.token))return;
      var config=results[0].status==='fulfilled'?results[0].value.config:null,html=results[1].status==='fulfilled'?results[1].value:CURRENT;
      if(config)latestConfig=config;
      var c=config||latestConfig,target=compare(c.version,html)>=0?version(c.version):html;if(compare(target,CURRENT)<0)target=version(CURRENT);
      var receipts=results[0].status==='fulfilled'?results[0].value.seen||[]:[];receipts.forEach(function(r){mark(u,r.kind,r.notice_id);});
      track('update_check_completed',{source:source,target_version:target,duration_ms:Date.now()-start,config_ok:!!config,version_ok:results[1].status==='fulfilled'});
      if(results.some(function(r){return r.status==='rejected';}))track('update_check_failed',{source:source,status:results[0].status==='rejected'?results[0].reason.status||0:0,error:results.filter(function(r){return r.status==='rejected';}).map(function(r){return String(r.reason.message);}).join('; ').slice(0,180)});
      var known=target===version(c.version),content=known?c.content:(target==='v7.0'?DEFAULT.content:'新版本已准备好了，欢迎更新体验。'),title=known?c.title:target+' 更新内容';
      if(manual||c.enabled!==false){if(manual||!seen(u,'release',target))enqueue({user:u,kind:'release',id:target,title:title,content:content,source:source,manual:!!manual});else track('notice_suppressed',{kind:'release',notice_id:target,reason:'already_seen',source:source});}
      if(!manual&&config){['announcement','tip'].forEach(function(kind){if(!c[kind+'_enabled']||!c[kind+'_content']||seen(u,kind,String(c[kind+'_id'])))return;enqueue({user:u,kind:kind,id:String(c[kind+'_id']),title:c.announcement_title,content:c[kind+'_content'],source:source,manual:false});});}
    })().finally(function(){busy=null;});return busy;
  }
  function sync() {
    mountFooter();var u=user(),id=u?u.id+':'+u.token:'';if(id===active)return;
    active=id;pending=[];latestConfig=DEFAULT;clearTimeout(loginTimer);if(modal)close('account_changed');var tip=document.getElementById('releaseTip');if(tip)tip.remove();
    if(u){try{var info=JSON.parse(sessionStorage.getItem('st_notice_update_pending')||'null');if(info&&info.user_id===u.id){track(compare(CURRENT,info.to)>=0?'update_completed':'update_reload_still_old',{from:info.from,to:info.to});sessionStorage.removeItem('st_notice_update_pending');}}catch(_){}loginTimer=setTimeout(function(){check('login',false);},120);}
  }
  function mountFooter() {var f=document.getElementById('app-version-v17');if(!f)return;f.textContent='Score Tracker · '+CURRENT;if(f.dataset.noticeTrigger)return;f.dataset.noticeTrigger='1';f.classList.add('version-trigger-v31');f.setAttribute('role','button');f.setAttribute('tabindex','0');f.setAttribute('title','查看版本更新');var open=function(){track('version_update_opened',{version:CURRENT});check('manual',true);};f.addEventListener('click',open);f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});}
  var oldRender=typeof render==='function'?render:null;if(oldRender)render=function(){var r=oldRender.apply(this,arguments);sync();return r;};
  var oldLogin=typeof renderLogin==='function'?renderLogin:null;if(oldLogin)renderLogin=function(){var r=oldLogin.apply(this,arguments);sync();return r;};
  setInterval(function(){sync();if(Date.now()-lastCheck>=PERIOD)check('interval',false);},PERIOD);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){sync();pump();if(Date.now()-lastCheck>=PERIOD)check('resume',false);}});
  window.addEventListener('online',function(){if(Date.now()-lastCheck>=PERIOD)check('online',false);});
  window.addEventListener('storage',function(e){if(e.key==='st_token'&&user()&&e.newValue!==user().token){pending=[];if(modal)close('account_changed');}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  window.__releaseNotices={check:check,compareVersions:compare};
})();
