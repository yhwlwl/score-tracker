/* Published release versions and loaded asset freshness are checked separately. */
(function () {
  'use strict';
  var API = '/api/score-tracker-notices';
  var CURRENT = (document.querySelector('meta[name="application-version"]') || {}).content || 'v7.0';
  function build(doc) { var scripts=Array.from(doc.querySelectorAll('script[src]')).map(function(s){var u=new URL(s.getAttribute('src'),location.href);return u.pathname+u.search;});return scripts.length?JSON.stringify(scripts):((doc.querySelector('meta[name="application-version"]')||{}).content||''); }
  var LOADED_BUILD=build(document),initialReady=false,bootStarted=false;
  var PERIOD = 30 * 60 * 1000;
  var DEFAULT = {version:'v7.0',enabled:true,title:'v7.0 更新内容',content:'我们好高兴地告诉大家，图片识别功能正式上线了！\n\n新建考试时，进入「快速录入」，选择「图片识别」模式，上传图片即可自动解析。\n\n功能刚刚上线，还有些不稳定。如果遇到识别错误等情况，欢迎大家及时反馈哦。',tip_enabled:false,tip_content:'自然语言快速录入功能已上线，欢迎在新建考试时体验。',announcement_enabled:false,announcement_title:'公告',announcement_content:'',announcement_comments_enabled:false,announcement_comments_public:true,announcement_comment_title:'想听听大家的意见',revision:1};
  var active = '', lastCheck = 0, busy = null, pending = [], memory = {}, latestConfig = DEFAULT;
  var modal = null, lastFocus = null, pumpTimer = null, loginTimer = null;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function noticeMarkup(v) { return esc(v).replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g,'<strong>$2</strong>'); }
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
    try { var url=new URL('index.html',location.href);url.searchParams.set('__cb',Date.now());var r=await fetch(url.href,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error('版本检查失败');var doc=new DOMParser().parseFromString(await r.text(),'text/html'),m=doc.querySelector('meta[name="application-version"]');if(!m||!/^v?\d+(\.\d+){0,2}$/i.test(m.content))throw new Error('暂时未找到版本信息');return {version:version(m.content),build:build(doc)}; } finally {clearTimeout(timeout);}
  }
  function blocking() { try{if(state.onboarding)return true;}catch(_){}return document.visibilityState!=='visible'||!!document.querySelector('.modal-backdrop,.fv36-back,.st-fb-back,.pwa-back,.school-back,.gmodal-backdrop.open'); }
  function injectStyle() {
    if(document.getElementById('release-notices-style'))return;
    var s=document.createElement('style');s.id='release-notices-style';s.textContent=
      '.rn-back{position:fixed;inset:0;z-index:171;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.42);backdrop-filter:blur(9px)}'+
      '.rn-modal{width:min(540px,100%);max-height:90vh;max-height:90dvh;overflow:auto;border:1px solid var(--line,#e7eaf0);border-radius:24px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 30px 90px rgba(17,24,39,.26);padding:24px;animation:rn-enter .24s ease-out}'+
      '.rn-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.rn-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font-size:25px;margin-bottom:17px}.rn-close{border:0;border-radius:11px;background:var(--cell,#f3f5f8);color:var(--muted,#6f7988);width:34px;height:34px;font-size:22px;cursor:pointer}'+
      '.rn-kicker{color:var(--accent,#5d72e8);font-size:11px;font-weight:750;letter-spacing:.04em}.rn-title{font-size:23px;line-height:1.4;margin:7px 0 17px}.rn-content{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.9}.rn-status{background:var(--cell,#f7f8fb);color:var(--muted,#7a8494);border-radius:13px;padding:11px 13px;margin-top:20px;font-size:12px;line-height:1.65}.rn-actions{display:flex;justify-content:flex-end;margin-top:21px}.rn-action{border:0;border-radius:12px;background:var(--accent,#5d72e8);color:var(--on-surface,#fff);padding:12px 22px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer}.rn-action:disabled{opacity:.6}.rn-modal button:focus-visible,.rn-banner button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}'+
      '.rn-banner{position:fixed;top:calc(14px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(620px,calc(100vw - 24px));padding:13px 15px;display:flex;gap:12px;align-items:center;border:1px solid var(--line,#e7eaf0);border-radius:16px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:var(--nav-shadow);z-index:95;font-size:13px;line-height:1.6}.rn-banner span{flex:1;white-space:pre-wrap;overflow-wrap:anywhere}'+
      '@keyframes rn-enter{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.rn-modal{animation:none}}@media(max-width:620px){.rn-back{padding:12px}.rn-modal{padding:20px 18px;border-radius:21px}.rn-title{font-size:21px}.rn-content{font-size:13px}.rn-actions .rn-action{width:100%}}';
    s.textContent+='.rn-comments{margin-top:24px;border-top:1px solid var(--line,#e7eaf0);padding-top:18px}.rn-comments h3{margin:0 0 12px;font-size:15px;overflow-wrap:anywhere}.rn-comments-hint{margin:-4px 0 12px;color:var(--muted,#7a8494);font-size:11px;line-height:1.6}.rn-comment{padding:12px 0;border-bottom:1px solid var(--line,#e7eaf0)}.rn-comment-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:var(--muted,#7a8494)}.rn-comment-meta b{color:var(--text,#18212f)}.rn-comment-meta button,.rn-more{border:0;background:transparent;color:var(--accent,#5d72e8);font:inherit;cursor:pointer}.rn-comment-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.75;margin-top:7px}.rn-more{margin-top:12px;font-size:12px}.rn-comment-form{margin-top:16px}.rn-comment-form label{font-size:12px}.rn-comment-form textarea{display:block;box-sizing:border-box;width:100%;margin:8px 0;padding:10px 12px;border:1px solid var(--line,#e7eaf0);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:13px;resize:vertical}.rn-comment-bottom{display:flex;gap:10px;align-items:center;justify-content:space-between}.rn-comment-status,.rn-comment-list{font-size:12px;color:var(--muted,#7a8494)}.rn-comment-bottom button{flex-shrink:0;padding:9px 13px}';
    document.head.appendChild(s);
    s.textContent+='.rn-history{display:flex;align-items:center;gap:12px;margin:0 0 18px;font-size:12px;color:var(--muted)}.rn-history select{flex:1;min-width:0;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel-solid);color:var(--text);font:inherit}';
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
    back.innerHTML='<section class="rn-modal" role="dialog" aria-modal="true" aria-labelledby="rnTitle" aria-describedby="rnContent"><div class="rn-head"><div class="rn-icon" aria-hidden="true">'+(item.kind==='release'?'✦':'↗')+'</div><button class="rn-close" type="button" aria-label="关闭">×</button></div><div class="rn-kicker">'+(item.kind==='release'?'成绩轨迹 · '+esc(item.id):'成绩轨迹')+'</div><h2 class="rn-title" id="rnTitle">'+esc(item.title)+'</h2><div class="rn-content" id="rnContent">'+noticeMarkup(item.content)+'</div>'+(item.kind==='release'?'<div class="rn-status">'+(outdated?'你正在使用 '+esc(CURRENT)+'，更新后就能体验新功能。':'你已经在使用 '+esc(CURRENT)+'，快去试试吧。')+'</div>':'')+'<div class="rn-actions"><button class="rn-action" type="button">'+(outdated?'现在更新':'我知道了')+'</button></div></section>';
    lastFocus=document.activeElement;modal=Object.assign({},item,{back:back,outdated:outdated,started:Date.now(),overflow:document.body.style.overflow});document.body.style.overflow='hidden';document.body.appendChild(back);
    if(item.manual&&item.releases&&item.releases.length>1){
      var history=document.createElement('label');history.className='rn-history';history.innerHTML='更新记录<select aria-label="选择更新版本">'+item.releases.map(function(r){return '<option value="'+esc(r.version)+'"'+(r.version===item.id?' selected':'')+'>'+esc(r.version)+(r.version===item.releases[0].version?' · 最新':'')+'</option>';}).join('')+'</select>';back.querySelector('.rn-title').before(history);
      history.querySelector('select').onchange=function(){var selected=item.releases.find(function(r){return r.version===history.querySelector('select').value;});if(!selected)return;track('version_history_selected',{target_version:selected.version,source:'manual'});close('history_selected');show(Object.assign({},item,{id:selected.version,title:selected.title,content:selected.content}));};
    }
    mountComments(item,back);
    if(item.manual&&item.kind==='release'&&latestConfig.announcement_enabled&&latestConfig.announcement_content){var open=document.createElement('button');open.type='button';open.className='rn-more';open.textContent='查看公告';back.querySelector('.rn-actions').before(open);open.onclick=function(){var c=latestConfig;close('open_announcement');show({user:item.user,kind:'announcement',id:c.announcement_id,title:c.announcement_title,content:c.announcement_content,commentsEnabled:c.announcement_comments_enabled,commentsPublic:c.announcement_comments_public!==false,commentTitle:c.announcement_comment_title,manual:true,source:'manual'});};}
    mark(item.user,item.kind,item.id);
    if(item.manual&&item.user.id!=='guest')call('notice_claim',{kind:item.kind,notice_id:item.id},item.user).catch(function(e){track('notice_claim_failed',{kind:item.kind,notice_id:item.id,status:e.status||0});});
    track(item.kind==='release'?'update_prompt_shown':'announcement_shown',{target_version:item.id,source:item.source,manual:item.manual,needs_update:outdated});
    var button=back.querySelector('.rn-actions > .rn-action');button.focus();back.querySelector('.rn-close').onclick=function(){close('close_button');};back.onclick=function(e){if(e.target===back)close('backdrop');};
    back.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close('escape');}if(e.key==='Tab'){var buttons=back.querySelectorAll('button:not([disabled]):not([hidden]),textarea,input,select'),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    button.onclick=async function(){if(!outdated){track(item.kind==='release'?'update_acknowledged':'announcement_acknowledged',{target_version:item.id,source:item.source});close('acknowledged');return;}button.disabled=true;button.textContent='正在更新…';try{sessionStorage.setItem('st_notice_update_pending',JSON.stringify({user_id:item.user.id,from:CURRENT,to:item.id}));}catch(_){}await Promise.race([Promise.resolve(track('update_apply',{from:CURRENT,to:item.id,source:item.source})),new Promise(function(resolve){setTimeout(resolve,500);})]);var url=new URL(location.href);url.searchParams.set('__update',Date.now());location.replace(url.href);};
  }
  function mountComments(item,back) {
    if(item.kind!=='announcement'||!item.commentsEnabled)return;
    var section=document.createElement('section');section.className='rn-comments';
    section.innerHTML='<h3>'+esc(item.commentTitle||'想听听大家的意见')+'</h3>'+(item.commentsPublic===false?'<div class="rn-comments-hint">这里只显示你自己的评论，其他用户的评论对你不可见。</div>':'')+'<div class="rn-comment-list"></div><button type="button" class="rn-more" hidden>查看更多评论</button><form class="rn-comment-form"><label for="rnComment">你的想法</label><textarea id="rnComment" maxlength="1000" rows="3" placeholder="说说你的想法吧" required></textarea><div class="rn-comment-bottom"><span role="status" class="rn-comment-status"></span><button type="submit" class="rn-action">发表评论</button></div></form>';
    back.querySelector('.rn-actions').before(section);
    var list=section.querySelector('.rn-comment-list'),more=section.querySelector('.rn-more'),form=section.querySelector('form'),status=section.querySelector('[role="status"]'),submit=form.querySelector('button'),input=form.querySelector('textarea'),next=null,loading=false;
    function current(){var u=user();return back.isConnected&&u&&u.id===item.user.id&&u.token===item.user.token;}
    async function load(append){if(loading)return;loading=true;more.disabled=true;status.textContent='正在加载评论…';try{var data=await call('announcement_comments',{notice_id:item.id,before:append?next:null},item.user);if(!current())return;if(!append)list.innerHTML='';(data.rows||[]).forEach(function(row){var article=document.createElement('article');article.className='rn-comment';article.innerHTML='<div class="rn-comment-meta"><b>'+esc(row.author)+'</b><time>'+esc(new Date(row.created_at).toLocaleString())+'</time>'+(row.can_delete?'<button type="button">删除</button>':'')+'</div><div class="rn-comment-text">'+esc(row.content)+'</div>';var del=article.querySelector('button');if(del)del.onclick=async function(){del.disabled=true;try{await call('announcement_comment_delete',{notice_id:item.id,id:row.id},item.user);if(current())await load(false);}catch(e){status.textContent=e.message;}finally{del.disabled=false;}};list.appendChild(article);});if(!list.children.length)list.textContent='还没有评论，欢迎说说你的想法。';next=data.next;more.hidden=!next;status.textContent='';}catch(e){if(current())status.textContent=e.message;}finally{loading=false;more.disabled=false;}}
    more.onclick=function(){load(true);};
    form.onsubmit=async function(e){e.preventDefault();if(!current())return;var content=input.value.trim();if(!content){status.textContent='写点内容再发送吧';return;}submit.disabled=true;status.textContent='正在发送…';try{await call('announcement_comment_add',{notice_id:item.id,content:content},item.user);if(!current())return;input.value='';await load(false);if(!status.textContent)status.textContent='评论已发送';}catch(e){if(current())status.textContent=e.message;}finally{submit.disabled=false;}};
    if(item.user.id==='guest'){form.hidden=true;list.textContent='登录后可以查看和发表评论';return;}load(false);
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
    var u=user();if((!u&&!manual&&source!=='boot')||(!manual&&source!=='boot'&&document.querySelector('.auth-page'))||(!manual&&(document.visibilityState==='hidden'||navigator.onLine===false)))return;
    if(busy){await busy;if(manual)return check(source,true);return;}
    u=u||{id:'guest',token:''};var start=Date.now();lastCheck=start;
    busy=(async function(){
      track('update_check_started',{source:source});
      var results=await Promise.allSettled([call(manual?'notice_history':u.id==='guest'?'notice_public':'notice_check',{},u),deployed()]);
      if(u.id!=='guest'&&(!user()||user().id!==u.id||user().token!==u.token))return;
      var config=results[0].status==='fulfilled'?results[0].value.config:null,html=results[1].status==='fulfilled'?results[1].value.version:CURRENT;
      if(config)latestConfig=config;
      if(!initialReady&&config&&results[1].status==='fulfilled'){
        initialReady=true;
        if(results[1].value.build===LOADED_BUILD&&compare(config.version,CURRENT)>=0)CURRENT=version(config.version);
        mountFooter();
      }
      if(config&&results[1].status==='fulfilled'&&u.id!=='guest')try{var info=JSON.parse(sessionStorage.getItem('st_notice_update_pending')||'null');if(info&&info.user_id===u.id){track(compare(CURRENT,info.to)>=0?'update_completed':'update_reload_still_old',{from:info.from,to:info.to});sessionStorage.removeItem('st_notice_update_pending');}}catch(_){}
      var c=config||latestConfig,target=compare(c.version,html)>=0?version(c.version):html;if(compare(target,CURRENT)<0)target=version(CURRENT);
      var receipts=results[0].status==='fulfilled'?results[0].value.seen||[]:[];receipts.forEach(function(r){mark(u,r.kind,r.notice_id);});
      track('update_check_completed',{source:source,target_version:target,duration_ms:Date.now()-start,config_ok:!!config,version_ok:results[1].status==='fulfilled'});
      if(results.some(function(r){return r.status==='rejected';}))track('update_check_failed',{source:source,status:results[0].status==='rejected'?results[0].reason.status||0:0,error:results.filter(function(r){return r.status==='rejected';}).map(function(r){return String(r.reason.message);}).join('; ').slice(0,180)});
      var known=target===version(c.version),content=known?c.content:(target==='v7.0'?DEFAULT.content:'新版本已准备好了，欢迎更新体验。'),title=known?c.title:target+' 更新内容';
      var releases=manual&&results[0].status==='fulfilled'&&Array.isArray(results[0].value.releases)?results[0].value.releases:[];
      releases=releases.filter(function(r){return r&&/^v?\d+(\.\d+){0,2}$/i.test(r.version)&&typeof r.title==='string'&&typeof r.content==='string';}).map(function(r){return {version:version(r.version),title:r.title,content:r.content};}).filter(function(r,i,a){return a.findIndex(function(x){return x.version===r.version;})===i;});
      releases=releases.filter(function(r){return r.version!==target;}).sort(function(a,b){return compare(b.version,a.version);});releases.unshift({version:target,title:title,content:content});
      if(!manual){pending=pending.filter(function(item){return item.kind!=='release'||item.manual||item.id===target;});if(modal&&modal.kind==='release'&&!modal.manual&&modal.id!==target)close('superseded');}
      if(manual||(u.id!=='guest'&&c.enabled!==false)){if(manual||!seen(u,'release',target))enqueue({user:u,kind:'release',id:target,title:title,content:content,source:source,manual:!!manual,releases:manual?releases:null});else track('notice_suppressed',{kind:'release',notice_id:target,reason:'already_seen',source:source});}
      if(!manual&&config){['announcement','tip'].forEach(function(kind){if(!c[kind+'_enabled']||!c[kind+'_content']||seen(u,kind,String(c[kind+'_id'])))return;enqueue({user:u,kind:kind,id:String(c[kind+'_id']),title:c.announcement_title,content:c[kind+'_content'],commentsEnabled:c.announcement_comments_enabled,commentsPublic:c.announcement_comments_public!==false,commentTitle:c.announcement_comment_title,source:source,manual:false});});}
    })().finally(function(){busy=null;});return busy;
  }
  function sync() {
    mountFooter();var u=user(),id=u?u.id+':'+u.token:'';if(!u&&!bootStarted){bootStarted=true;check('boot',false);}if(id===active)return;
    active=id;pending=[];latestConfig=DEFAULT;clearTimeout(loginTimer);if(modal)close('account_changed');var tip=document.getElementById('releaseTip');if(tip)tip.remove();
    if(u)loginTimer=setTimeout(function(){check('login',false);},120);
  }
  function mountFooter() {var f=document.getElementById('app-version-v17');if(!f)return;f.textContent='Score Tracker · '+CURRENT;if(f.dataset.noticeTrigger)return;f.dataset.noticeTrigger='1';f.classList.add('version-trigger-v31');f.setAttribute('role','button');f.setAttribute('tabindex','0');f.setAttribute('title','查看版本更新');var open=function(){track('version_update_opened',{version:CURRENT});check('manual',true);};f.addEventListener('click',open);f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});}
  var oldRender=typeof render==='function'?render:null;if(oldRender)render=function(){var r=oldRender.apply(this,arguments);sync();return r;};
  var oldLogin=typeof renderLogin==='function'?renderLogin:null;if(oldLogin)renderLogin=function(){var r=oldLogin.apply(this,arguments);sync();return r;};
  setInterval(function(){sync();if(Date.now()-lastCheck>=PERIOD)check('interval',false);},PERIOD);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){sync();pump();if(Date.now()-lastCheck>=PERIOD)check('resume',false);}});
  window.addEventListener('online',function(){if(Date.now()-lastCheck>=PERIOD)check('online',false);});
  window.addEventListener('storage',function(e){if(e.key==='st_token'&&user()&&e.newValue!==user().token){pending=[];if(modal)close('account_changed');}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  window.__releaseNotices={check:check,compareVersions:compare,currentVersion:function(){return CURRENT;}};
})();
