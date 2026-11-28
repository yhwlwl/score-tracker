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
  function noticeMarkup(v) { return esc(v).replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g,'<strong>$2</strong>').replace(/\[([^\]\n]{1,80})\]\(#author-support\)/g,'<button type="button" class="rn-support-link" data-notice-support hidden>$1</button>').replace(/\[([^\]\n]{1,80})\]\(#community\)/g,'<button type="button" class="rn-support-link" data-notice-community hidden>$1</button>'); }
  function anonymousName(v) { var a=Array.from(String(v||'').trim()); return a.length<3?'***':a[0]+'***'+a[a.length-1]; }
  function version(v) { var parts=String(v || '').trim().replace(/^v/i,'').split('.').map(Number);while(parts.length>2&&parts[parts.length-1]===0)parts.pop();if(parts.length===1)parts.push(0);return 'v'+parts.join('.'); }
  // 补丁位（第三位）只作构建号：不参与版本比较，避免 9.0.1 触发“有新版本”提示和公告。
  function compare(a,b) { var x=version(a).slice(1).split('.').map(Number), y=version(b).slice(1).split('.').map(Number); for(var i=0;i<2;i++){var d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0; }
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
  function blocking() {
 if(window.ScoreModalGuard)return window.ScoreModalGuard.occupied()||window.ScoreModalGuard.centenaryPending(); try{if(state.onboarding)return true;}catch(_){}return document.visibilityState!=='visible'||!!document.querySelector('dialog.st-centenary-dialog[open],.modal-backdrop,.fv36-back,.st-fb-back,.pwa-back,.school-back,.gmodal-backdrop.open'); }
  function injectStyle() {
    if(document.getElementById('release-notices-style'))return;
    var s=document.createElement('style');s.id='release-notices-style';s.textContent=
      '.rn-back{position:fixed;inset:0;z-index:171;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.42);backdrop-filter:blur(9px)}'+
      '.rn-modal{width:min(540px,100%);max-height:90vh;max-height:90dvh;overflow:auto;border:1px solid var(--line,#e7eaf0);border-radius:24px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 30px 90px rgba(17,24,39,.26);padding:24px;animation:rn-enter .24s ease-out}'+
      '.rn-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.rn-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font-size:25px;margin-bottom:17px}.rn-close{border:0;border-radius:11px;background:var(--cell,#f3f5f8);color:var(--muted,#6f7988);width:34px;height:34px;font-size:22px;cursor:pointer}'+
      '.rn-kicker{color:var(--accent,#5d72e8);font-size:11px;font-weight:750;letter-spacing:.04em}.rn-title{font-size:23px;line-height:1.4;margin:7px 0 17px}.rn-content{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.9}.rn-status{background:var(--cell,#f7f8fb);color:var(--muted,#7a8494);border-radius:13px;padding:11px 13px;margin-top:20px;font-size:12px;line-height:1.65}.rn-actions{display:flex;justify-content:flex-end;margin-top:21px}.rn-action{border:0;border-radius:12px;background:var(--accent,#5d72e8);color:var(--on-surface,#fff);padding:12px 22px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer}.rn-action:disabled{opacity:.6}.rn-modal button:focus-visible,.rn-banner button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}'+
      '.rn-banner{position:fixed;top:calc(14px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(620px,calc(100vw - 24px));padding:13px 15px;display:flex;gap:12px;align-items:center;border:1px solid var(--line,#e7eaf0);border-radius:16px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:var(--nav-shadow);z-index:95;font-size:13px;line-height:1.6}.rn-banner span{flex:1;white-space:pre-wrap;overflow-wrap:anywhere}'+
      '@keyframes rn-enter{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.rn-modal{animation:none}}@media(max-width:620px){.rn-back{padding:12px}.rn-modal{padding:20px 18px;border-radius:21px}.rn-title{font-size:21px}.rn-content{font-size:13px}.rn-actions .rn-action{width:100%}}';
    s.textContent+='.rn-comment.rn-comment-developer{padding:14px;margin:10px 0;border:1px solid var(--accent,#5d72e8);border-left-width:3px;border-radius:12px;background:var(--accent-soft,#eef1ff)}.rn-comment-developer .rn-comment-meta b{color:var(--accent,#5d72e8);font-size:13px}.rn-comment-developer .rn-comment-text{color:var(--text,#18212f)}.rn-comment-pin{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:var(--accent,#5d72e8);color:var(--accent-contrast,#fff)}.rn-pinned-list:empty{display:none}.rn-comments{margin-top:24px;border-top:1px solid var(--line,#e7eaf0);padding-top:18px}.rn-comments h3{margin:0 0 12px;font-size:15px;overflow-wrap:anywhere}.rn-comments-hint{margin:-4px 0 12px;color:var(--muted,#7a8494);font-size:11px;line-height:1.6}.rn-comment{padding:12px 0;border-bottom:1px solid var(--line,#e7eaf0)}.rn-comment-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:var(--muted,#7a8494)}.rn-comment-meta b{color:var(--text,#18212f)}.rn-comment-meta button,.rn-more{border:0;background:transparent;color:var(--accent,#5d72e8);font:inherit;cursor:pointer}.rn-comment-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.75;margin-top:7px}.rn-more{margin-top:12px;font-size:12px}.rn-comment-form{margin-top:16px}.rn-comment-form label{font-size:12px}.rn-comment-form textarea{display:block;box-sizing:border-box;width:100%;margin:8px 0;padding:10px 12px;border:1px solid var(--line,#e7eaf0);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:13px;resize:vertical}.rn-comment-bottom{display:flex;gap:10px;align-items:center;justify-content:space-between}.rn-comment-status,.rn-comment-list{font-size:12px;color:var(--muted,#7a8494)}.rn-comment-bottom button{flex-shrink:0;padding:9px 13px}';
    document.head.appendChild(s);
    s.textContent+=".rn-compact-thread-modal{display:flex;flex-direction:column;overflow:hidden}.rn-compact-thread-modal>.rn-head{flex:none;position:relative}.rn-compact-thread-modal>.rn-layout{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}.rn-compact-thread-modal .rn-actions[hidden]{display:none!important}.rn-compact-composer{flex:none;border-top:1px solid var(--line,#e7eaf0);padding:9px 20px max(9px,env(safe-area-inset-bottom));margin:0;background:var(--panel-solid,#fff)}.rn-compact-composer .rn-compact-line{display:flex;align-items:flex-end;gap:9px}.rn-comment-form.rn-compact-composer textarea{margin:0;min-height:38px;max-height:104px;height:38px;padding:8px 12px;resize:none;border-radius:18px;font-size:14px;line-height:20px}.rn-compact-line .rn-action{width:auto!important;min-width:62px;padding:8px 14px;height:38px;flex:none}.rn-compact-composer .rn-comment-bottom:has(.rn-comment-status:empty){display:none}.rn-compact-composer .rn-comment-bottom{display:block;margin:0 0 3px}.rn-compact-composer .rn-reply-target{margin-bottom:4px}.rn-thread-group{padding:2px 10px}.rn-thread-reply{padding:6px 0}.rn-thread-reply .rn-thread-actions{gap:10px}.rn-thread-reply .rn-thread-action{min-height:24px;padding:3px 0}.rn-thread-like{display:inline-flex;align-items:center;gap:4px}.rn-thread-self{font-size:10px;color:var(--muted,#68758b)}.rn-thread-parent{border:0;background:none;color:var(--muted,#68758b);padding:0;font:inherit;cursor:pointer}.rn-thread-parent:hover{text-decoration:underline}.rn-thread-highlight{background:var(--accent-soft,#eef1ff)}.rn-thread-reply.rn-thread-legacy-inline{margin:0;border:0;border-bottom:1px solid var(--line,#e7eaf0);border-radius:0;background:transparent;color:var(--text,#18212f);padding:6px 0;line-height:inherit}.rn-thread-reply.rn-thread-legacy-inline:last-child{border-bottom:0}.rn-thread-legacy-inline>div{margin-top:0;white-space:normal}.rn-thread-legacy-inline time{font-size:inherit;color:inherit}.rn-thread-legacy-inline .rn-thread-text{white-space:pre-wrap;margin-top:3px}@media(max-width:620px){.rn-compact-composer{padding:8px 14px max(8px,env(safe-area-inset-bottom))}}";
    s.textContent+=".rn-threads-enabled .rn-comment{padding:12px 0;color:var(--text,#18212f)}.rn-threads-enabled .rn-comment-developer{padding:12px 14px;margin:8px 0;background:var(--accent-soft,#eef1ff)}.rn-threads-enabled .rn-comment-meta b{font-size:13px}.rn-thread-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:5px;font-size:12px;color:var(--muted,#68758b)}.rn-thread-action{border:0;background:transparent;padding:5px 0;color:var(--muted,#68758b);font:inherit;font-size:12px;cursor:pointer;min-height:28px}.rn-thread-action[aria-pressed=true],.rn-thread-action[aria-expanded]{color:var(--accent,#526fb4)}.rn-thread-action:disabled{opacity:.7;cursor:default}.rn-thread-group{background:var(--cell,#f4f6fa);border-radius:11px;margin:5px 0 4px 16px;padding:3px 12px}.rn-thread-group[hidden],.rn-reply-target[hidden],.rn-comment-form[hidden]{display:none!important}.rn-thread-reply{padding:9px 0;border-bottom:1px solid var(--line,#e7eaf0)}.rn-thread-reply:last-child{border-bottom:0}.rn-thread-reply-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--muted,#68758b)}.rn-thread-reply-meta b{font-size:12px;color:var(--text,#18212f)}.rn-thread-reply-meta b.rn-thread-dev{color:var(--accent,#526fb4)}.rn-thread-text{font-size:13px;line-height:1.6;color:var(--text,#18212f);white-space:pre-wrap;overflow-wrap:anywhere;margin-top:3px}.rn-thread-deleted{color:var(--muted,#68758b)}.rn-thread-reply .rn-thread-actions{margin-top:1px;gap:12px}.rn-thread-menu{position:relative;margin-left:auto}.rn-thread-menu summary{cursor:pointer;list-style:none;padding:0 6px;font-weight:bold;line-height:1.5}.rn-thread-menu summary::-webkit-details-marker{display:none}.rn-thread-delete{position:absolute;right:0;top:100%;z-index:6;background:var(--panel-solid,#fff)!important;border:1px solid var(--line,#e7eaf0)!important;border-radius:8px;padding:7px 14px!important;color:var(--text,#18212f)!important;white-space:nowrap;box-shadow:0 4px 16px #0001}.rn-threads-enabled .rn-thread-legacy{margin:8px 0 4px 16px;border:0;background:var(--cell,#f4f6fa);padding:9px 12px;font-size:13px;color:var(--text,#18212f)}.rn-thread-legacy b{color:var(--accent,#526fb4)}.rn-thread-legacy time{display:inline;margin-left:8px}.rn-threads-enabled .rn-comment-form{position:sticky;bottom:0;z-index:4;margin:12px -2px 0;padding:9px 2px max(8px,env(safe-area-inset-bottom));background:var(--panel-solid,#fff);border-top:1px solid var(--line,#e7eaf0)}.rn-threads-enabled .rn-comment-form textarea{margin:5px 0;min-height:42px;max-height:120px;resize:vertical}.rn-reply-target{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted,#68758b)}.rn-reply-target button{border:0;background:none;color:inherit;cursor:pointer;font-size:18px}.rn-threads-enabled .rn-comment-bottom .rn-action{width:auto;min-width:64px}.rn-threads-enabled .rn-more[hidden],.rn-thread-action[hidden]{display:none}@media(max-width:620px){.rn-thread-group,.rn-threads-enabled .rn-thread-legacy{margin-left:10px}.rn-thread-actions{gap:12px}}";
    s.textContent+='.rn-modal{box-sizing:border-box;width:min(680px,100%);padding:0;overflow-y:auto;overflow-x:hidden;outline:none!important}.rn-modal:focus,.rn-modal:focus-visible{outline:none!important}.rn-head{position:sticky;top:0;z-index:5;align-items:center;padding:12px 22px;background:var(--panel-solid,#fff);border-bottom:1px solid var(--line,#e7eaf0);gap:12px}.rn-head-label{font-size:13px;font-weight:700;color:var(--muted,#687386)}.rn-head .rn-close{display:grid;place-items:center;flex:none;line-height:1}.rn-layout{padding:22px;min-width:0}.rn-reader{min-width:0}.rn-hero{margin-bottom:18px}.rn-kind-release .rn-hero{background:var(--accent-soft,#eef1ff);border-radius:16px;padding:19px 20px}.rn-title{margin:0;font-size:clamp(22px,3vw,29px);line-height:1.4;overflow-wrap:anywhere}.rn-content{white-space:normal;font-size:14px;line-height:1.8}.rn-history-panel{margin-bottom:16px;min-width:0}.rn-history-panel summary{cursor:pointer;font-size:12px;padding:10px;border-radius:10px;background:var(--cell,#f6f7fa);display:flex;justify-content:space-between}.rn-history-list{display:grid;gap:5px;margin-top:6px;max-height:260px;overflow:auto}.rn-history-list button{display:grid;gap:4px;text-align:left;border:0;background:transparent;border-radius:9px;padding:9px;color:var(--text,#18212f);font:inherit;font-size:12px;min-width:0;overflow-wrap:anywhere}.rn-history-list button[aria-current=true]{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font-weight:650}.rn-history-list small{font-size:11px;color:var(--muted,#687386);font-weight:400}.rn-history[hidden],[data-notice-feature][hidden]{display:none!important}@media(min-width:1000px){.rn-modal.rn-has-history{width:min(980px,100%)}.rn-has-history .rn-layout{display:grid;grid-template-columns:minmax(155px,205px) minmax(0,1fr);gap:24px}.rn-has-history .rn-history-panel{position:sticky;top:72px;align-self:start}.rn-has-history .rn-history-list{max-height:calc(90dvh - 150px)}}@media(max-width:620px){.rn-back{padding:8px}.rn-modal{width:100%;max-height:94dvh;border-radius:19px;padding:0}.rn-head{padding:10px 15px}.rn-layout{padding:16px}.rn-kind-release .rn-hero{padding:16px}.rn-title{font-size:23px}.rn-content{font-size:14px}}';
    s.textContent+='.rn-support-link{border:0;padding:0;background:transparent;color:var(--accent,#5d72e8);font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.rn-support-link[hidden]{display:none}';
    s.textContent+='.rn-history{display:flex;align-items:center;gap:12px;margin:0 0 18px;font-size:12px;color:var(--muted)}.rn-history select{flex:1;min-width:0;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel-solid);color:var(--text);font:inherit}';
  }
  function close(reason) {
    if(!modal)return;var old=modal;modal=null;
    track(old.kind==='release'?'update_prompt_dismissed':'announcement_dismissed',{target_version:old.id,source:old.source,reason:reason,duration_ms:Date.now()-old.started,needs_update:old.outdated});
    (old.back.replyObservers||[]).forEach(function(observer){observer.disconnect();});old.back.remove();document.body.style.overflow=old.overflow;
    if(lastFocus&&lastFocus.isConnected)lastFocus.focus();lastFocus=null;queuePump();
  }
  function mountSupport(back,item) {
    back.querySelectorAll('[data-notice-community]').forEach(function(link){
      link.hidden=!user()||!window.__scoreTrackerCommunity?.available()||!!state.onboarding;
      link.onclick=function(){if(!window.__scoreTrackerCommunity?.available())return;close('open_community');window.__scoreTrackerCommunity.open('notice');};
    });
    back.querySelectorAll('[data-notice-support]').forEach(function(link){
      link.hidden=!user()||!window.__scoreTrackerSupport?.available()||!!state.onboarding;
      link.onclick=function(){if(!window.__scoreTrackerSupport?.available())return;close('open_support');window.__scoreTrackerSupport.open(item.kind==='release'?'release':'announcement');};
    });
  }
  function show(item) {
    injectStyle();if(item.kind==='tip')return showTip(item);
    var outdated=item.kind==='release'&&compare(item.id,CURRENT)>0,back=document.createElement('div');back.className='rn-back';back.id='releaseNotice';
    var layout=window.ScoreNoticeLayout;
    back.innerHTML='<section class="rn-modal rn-kind-'+item.kind+'" role="dialog" aria-modal="true" aria-labelledby="rnTitle" aria-describedby="rnContent"><div class="rn-head"><div class="rn-head-label">'+(item.kind==='release'?'更新日志':'公告')+'</div><button class="rn-close" type="button" aria-label="关闭">×</button></div><div class="rn-layout"><article class="rn-reader"><header class="rn-hero">'+(layout?layout.meta(item.kind,item.id,item.content,item.updated_at):'<div class="rn-kicker">'+(item.kind==='release'?'成绩轨迹 · '+esc(item.id):'成绩轨迹')+'</div>')+'<h2 class="rn-title" id="rnTitle">'+esc(item.title)+'</h2></header><div class="rn-content" id="rnContent">'+(layout?layout.render(item.content,item.kind,noticeMarkup):noticeMarkup(item.content))+'</div>'+(item.kind==='release'?'<div class="rn-status">'+(outdated?'你正在使用 '+esc(CURRENT)+'，更新后就能体验新功能。':'你已经在使用 '+esc(CURRENT)+'，快去试试吧。')+'</div>':'')+'<div class="rn-actions"><button class="rn-action" type="button">'+(outdated?'现在更新':'我知道了')+'</button></div></article></div></section>';
    lastFocus=document.activeElement;modal=Object.assign({},item,{back:back,outdated:outdated,started:Date.now(),overflow:document.body.style.overflow});document.body.style.overflow='hidden';document.body.appendChild(back);
    if(item.manual&&item.releases&&item.releases.length>1){
      var history=document.createElement('label');history.className='rn-history';history.innerHTML='更新记录<select aria-label="选择更新版本">'+item.releases.map(function(r){return '<option value="'+esc(r.version)+'"'+(r.version===item.id?' selected':'')+'>'+esc(r.version)+(r.version===item.releases[0].version?' · 最新':'')+'</option>';}).join('')+'</select>';back.querySelector('.rn-layout').prepend(history);
      history.querySelector('select').onchange=function(){var selected=item.releases.find(function(r){return r.version===history.querySelector('select').value;});if(!selected)return;track('version_history_selected',{target_version:selected.version,source:'manual'});close('history_selected');show(Object.assign({},item,{id:selected.version,title:selected.title,content:selected.content,updated_at:selected.updated_at||null}));};
    }
    if(item.manual&&item.kind==='announcement'&&item.announcements&&item.announcements.length>1){
      var announcementHistory=document.createElement('label');announcementHistory.className='rn-history';announcementHistory.innerHTML='公告记录<select aria-label="选择公告">'+item.announcements.map(function(r){return '<option value="'+esc(r.id)+'"'+(r.id===item.id?' selected':'')+'>'+esc(r.title||'公告')+(r.id===item.announcements[0].id?' · 最新':'')+'</option>';}).join('')+'</select>';back.querySelector('.rn-layout').prepend(announcementHistory);
      announcementHistory.querySelector('select').onchange=function(){var selected=item.announcements.find(function(r){return r.id===announcementHistory.querySelector('select').value;});if(!selected)return;track('announcement_history_selected',{notice_id:selected.id,source:'settings'});close('history_selected');show(Object.assign({},item,selected,{manual:true,commentsEnabled:selected.id!==item.announcements[0].id||selected.comments_enabled===true,commentsReadOnly:selected.id!==item.announcements[0].id,commentsPublic:selected.comments_public!==false,commentTitle:selected.comment_title||'想听听大家的意见'}));};
    }
    var historySelect=back.querySelector('.rn-history select');
    if(historySelect&&layout){
      var historyLabel=historySelect.parentElement,versions=item.kind==='release'?item.releases:item.announcements;
      var navigation=document.createElement('details');navigation.className='rn-history-panel';navigation.open=!!(window.matchMedia&&window.matchMedia('(min-width:1000px)').matches);
      navigation.innerHTML='<summary>'+ (item.kind==='release'?'历史版本':'历史公告') +' <span aria-hidden="true">⌄</span></summary><div class="rn-history-list">'+versions.map(function(row,i){
        var id=item.kind==='release'?row.version:row.id;return '<button type="button" data-rn-history="'+esc(id)+'"'+(id===item.id?' aria-current="true"':'')+'><span>'+esc(item.kind==='release'?row.version:row.title||'公告')+'</span>'+(item.kind==='release'?'<small>'+esc(row.title||'')+'</small>':'')+(row.updated_at?'<small>'+esc(String(row.updated_at).slice(0,10))+'</small>':'')+(i===0?'<small>最新</small>':'')+'</button>';
      }).join('')+'</div>';
      historyLabel.hidden=true;historyLabel.before(navigation);back.querySelector('.rn-modal').classList.add('rn-has-history');
      navigation.querySelectorAll('[data-rn-history]').forEach(function(b){b.onclick=function(){historySelect.value=b.dataset.rnHistory;historySelect.dispatchEvent(new Event('change',{bubbles:true}));};});
    }
    back.querySelectorAll('[data-notice-feature]').forEach(function(link){
      var page=link.dataset.noticeFeature;
      var target=/^(home|records|stats|account)$/.test(page)&&document.querySelector('.desktop-nav [data-page="'+page+'"],.bottom-nav [data-page="'+page+'"]');
      link.hidden=!user()||!target;
      link.onclick=function(){if(!user()||!target||!target.isConnected)return;track('notice_feature_opened',{kind:item.kind,notice_id:item.id,destination:page});close('open_feature');target.click();};
    });
    mountComments(item,back);
    if(item.manual&&item.kind==='release'&&latestConfig.announcement_enabled&&latestConfig.announcement_content){var open=document.createElement('button');open.type='button';open.className='rn-more';open.textContent='查看公告';back.querySelector('.rn-actions').before(open);open.onclick=function(){var c=latestConfig;close('open_announcement');show({user:item.user,kind:'announcement',id:c.announcement_id,title:c.announcement_title,content:c.announcement_content,updated_at:c.updated_at,commentsEnabled:c.announcement_comments_enabled,commentsPublic:c.announcement_comments_public!==false,commentTitle:c.announcement_comment_title,announcements:item.announcements||[],manual:true,source:'manual'});};}
    mark(item.user,item.kind,item.id);
    if(item.manual&&item.user.id!=='guest')call('notice_claim',{kind:item.kind,notice_id:item.id},item.user).catch(function(e){track('notice_claim_failed',{kind:item.kind,notice_id:item.id,status:e.status||0});});
    track(item.kind==='release'?'update_prompt_shown':'announcement_shown',{target_version:item.id,source:item.source,manual:item.manual,needs_update:outdated});
    var button=back.querySelector('.rn-actions > .rn-action'),panel=back.querySelector('.rn-modal');panel.setAttribute('tabindex','-1');panel.focus({preventScroll:true});panel.scrollTop=0;back.querySelector('.rn-close').onclick=function(){close('close_button');};
    back.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close('escape');}if(e.key==='Tab'){var buttons=Array.from(back.querySelectorAll('button:not([disabled]):not([hidden]),textarea,input,select,summary')).filter(function(el){return !el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY');}),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    button.onclick=async function(){if(!outdated){track(item.kind==='release'?'update_acknowledged':'announcement_acknowledged',{target_version:item.id,source:item.source});close('acknowledged');return;}button.disabled=true;button.textContent='正在更新…';try{sessionStorage.setItem('st_notice_update_pending',JSON.stringify({user_id:item.user.id,from:CURRENT,to:item.id}));}catch(_){}await Promise.race([Promise.resolve(track('update_apply',{from:CURRENT,to:item.id,source:item.source})),new Promise(function(resolve){setTimeout(resolve,500);})]);var url=new URL(location.href);url.searchParams.set('__update',Date.now());location.replace(url.href);};
    mountSupport(back,modal);
  }
  var replyDrafts=new Map();
  function mountComments(item,back) {
    if(item.kind!=='announcement')return;
    var section=document.createElement('section');section.className='rn-comments';
    section.innerHTML='<h3>'+esc(item.commentTitle||'想听听大家的意见')+'</h3>'+(item.commentsPublic===false?'<div class="rn-comments-hint">开发者评论对所有登录用户可见；其他用户的评论对你不可见。</div>':'')+'<div class="rn-pinned-list" aria-label="置顶评论"></div><div class="rn-comment-list"></div><button type="button" class="rn-more" hidden>查看更多评论</button><form class="rn-comment-form"><label for="rnComment">你的想法</label><div class="rn-reply-target" hidden><span></span><button type="button" aria-label="取消回复">×</button></div><textarea id="rnComment" maxlength="1000" rows="1" placeholder="说说你的想法吧" required></textarea><div class="rn-comment-bottom"><span role="status" class="rn-comment-status"></span><button type="submit" class="rn-action">发表评论</button></div></form>';
    back.querySelector('.rn-actions').before(section);
    var panel=back.querySelector('.rn-modal'),list=section.querySelector('.rn-comment-list'),more=section.querySelector('.rn-more'),form=section.querySelector('form'),status=section.querySelector('[role="status"]'),submit=form.querySelector('[type=submit]'),input=form.querySelector('textarea'),targetBar=form.querySelector('.rn-reply-target'),next=null,loading=false,threadsEnabled=false,replyTarget=null,draftKey=String(item.user.id)+':'+item.id,statusTimer=null,compact=false;
    function resizeInput(){if(!compact)return;input.style.height='auto';input.style.height=Math.min(104,Math.max(38,input.scrollHeight))+'px';}
    function keyFor(target){return draftKey+':'+(target?target.thread.root.id+':'+(target.parent||'root'):'main');}
    function saveDraft(){var key=keyFor(replyTarget);if(input.value)replyDrafts.set(key,input.value);else replyDrafts.delete(key);while(replyDrafts.size>100)replyDrafts.delete(replyDrafts.keys().next().value);}
    function restoreDraft(){input.value=replyDrafts.get(keyFor(replyTarget))||'';resizeInput();}
    function flash(message){clearTimeout(statusTimer);status.textContent=message;statusTimer=setTimeout(function(){if(status.textContent===message)status.textContent='';},2200);}
    input.addEventListener('input',function(){saveDraft();resizeInput();});
    section.addEventListener('click',function(e){section.querySelectorAll('.rn-thread-menu[open]').forEach(function(m){if(!m.contains(e.target))m.open=false;});});
    function node(tag,text,cls){var n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
    function action(text,fn,cls){var b=node('button',text,cls||'rn-thread-action');b.type='button';b.onclick=fn;return b;}
    function name(row){return row.is_developer?'开发者':row.author==='***'?'***':anonymousName(row.author);}
    function shortTime(s){var d=new Date(s);if(!Number.isFinite(d.getTime()))return '';var m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));return m<1?'刚刚':m<60?m+'分钟前':m<1440?Math.floor(m/60)+'小时前':d.toLocaleDateString();}
    function current(){var u=user();return back.isConnected&&u&&u.id===item.user.id&&u.token===item.user.token;}
    function scrollBody(){return compact?back.querySelector('.rn-layout'):panel;}
    function preserve(fn){var sc=scrollBody(),y=sc.scrollTop;fn();sc.scrollTop=y;}
    function resetTarget(){replyTarget=null;targetBar.hidden=true;input.maxLength=1000;input.placeholder='说说你的想法…';restoreDraft();}
    targetBar.querySelector('button').onclick=function(){saveDraft();resetTarget();};
    function chooseThread(thread,parent,who){if(!current()||!thread.writable||item.commentsReadOnly||form.hidden||submit.disabled)return;saveDraft();replyTarget={thread:thread,parent:parent};restoreDraft();targetBar.hidden=false;targetBar.querySelector('span').textContent='回复 '+who;input.maxLength=300;input.placeholder='回复 '+who+'…';input.focus({preventScroll:true});if(!compact&&input.scrollIntoView)input.scrollIntoView({block:'nearest'});}
    function hideCommentForm(){resetTarget();form.hidden=true;submit.disabled=true;input.disabled=true;submit.classList.remove('rn-action');if(form.parentNode===section)section.insertBefore(status,form);}
    function archiveComments(){item.commentsReadOnly=true;hideCommentForm();if(!section.querySelector('.rn-comment-archive'))section.querySelector('h3').after(node('p','这条公告已归档，可查看当时的评论。','rn-comments-hint rn-comment-archive'));}
    if(item.commentsReadOnly)archiveComments();else if(!item.commentsEnabled)hideCommentForm();
    function menu(deleteFn){var d=node('details',null,'rn-thread-menu'),s=node('summary','···');s.setAttribute('aria-label','更多操作');d.append(s,action('删除',function(){d.open=false;deleteFn();},'rn-thread-delete'));return d;}
    function appendRow(row,target){
      var article=node('article',null,'rn-comment'+(row.is_developer?' rn-comment-developer':''));article.dataset.commentId=row.id;
      var meta=node('div',null,'rn-comment-meta');meta.append(node('b',name(row)));if(threadsEnabled&&row.is_mine)meta.append(node('span','我','rn-thread-self'));if(row.pinned_at)meta.append(node('span','置顶','rn-comment-pin'));var t=node('time',threadsEnabled?shortTime(row.created_at):new Date(row.created_at).toLocaleString());t.title=new Date(row.created_at).toLocaleString();meta.append(t);
      if(row.can_delete&&!item.commentsReadOnly){async function remove(){if(threadsEnabled&&!window.confirm('删除这条评论？该评论下的讨论也会删除。'))return;try{await call('announcement_comment_delete',{notice_id:item.id,id:row.id},item.user);if(!current())return;if(threadsEnabled){if(replyTarget?.thread.root.id===row.id)resetTarget();article.remove();}else await load(false);}catch(e){status.textContent=e.message;}}if(threadsEnabled)meta.append(menu(remove));else meta.append(action('删除',remove));}
      article.append(meta,node('div',row.content,'rn-comment-text'));
      if(row.reply&&(!threadsEnabled||item.focusedComment)){var legacy=node('div',null,'rn-admin-reply'+(threadsEnabled?' rn-thread-legacy':''));legacy.append(node('b',threadsEnabled?'开发者':'作者回复'),node('time',threadsEnabled?shortTime(row.reply.created_at):new Date(row.reply.created_at).toLocaleString()),node('div',row.reply.content));article.append(legacy);}
      (target||list).appendChild(article);if(threadsEnabled&&!item.focusedComment)mountThread(row,article);else watchReply(row,article,item,back);
    }
    function mountThread(row,article){
      var controls=node('div',null,'rn-thread-actions'),body=node('div',null,'rn-thread-group'),items=[],legacy=row.reply_legacy||null,preview=[...(row.reply_legacy?[row.reply_legacy]:[]),...(row.reply_preview||[])].slice(0,2),rootLikes=row.root_likes||{count:0,liked:false},total=Number(row.reply_count)||0,opened=false,busy=false,loaded=false,cursor=null,writable=!item.commentsReadOnly&&item.commentsEnabled;
      var thread={root:row,writable:writable,send:send,afterSend:afterSend};body.hidden=!preview.length;article.append(controls,body);
      async function send(a,p){return call(a,Object.assign({notice_id:item.id,root_id:row.id},p||{}),item.user);}
      function like(r,root){
        var b=action('',async function(){if(b.disabled||!thread.writable)return;var desired=!r.liked;b.disabled=true;try{var result=await send('announcement_thread_like',{reply_id:root?null:r.id,liked:desired});if(!current())return;r.count=Number.isFinite(result.count)?result.count:Math.max(0,r.count+(desired?1:-1));r.liked=desired;paint();}catch(e){status.textContent=e.message;}finally{b.disabled=!thread.writable;}},'rn-thread-action rn-thread-like');
        function paint(){b.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="'+(r.liked?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.7c0 4-5.4 7.6-8.8 10.6C8.6 16.3 3.2 12.7 3.2 8.7a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>';if(r.count)b.append(node('span',String(r.count)));b.setAttribute('aria-pressed',String(!!r.liked));b.setAttribute('aria-label',r.liked?'取消点赞':'点赞');}paint();b.disabled=!thread.writable;return b;
      }
      var rootLike=like(rootLikes,true),toggle=action('',async function(){opened=!opened;updateToggle();if(opened&&!loaded){try{await refresh(false);}catch(e){status.textContent=e.message;opened=false;draw();}}else draw();});
      function updateToggle(){toggle.hidden=!opened&&total<=preview.length;toggle.textContent=opened?'收起回复':('查看全部 '+total+' 条回复');toggle.setAttribute('aria-expanded',String(opened));}
      controls.append(rootLike);if(writable)controls.append(action('回复',function(){chooseThread(thread,null,name(row));}));controls.append(toggle);updateToggle();
      function draw(){if(!current())return;var shown=opened&&loaded?[...(legacy?[legacy]:[]),...items]:preview;body.hidden=!shown.length&&!opened;preserve(function(){body.replaceChildren();shown.forEach(function(r){
        var box=node('div',null,'rn-thread-reply'+(r.id==='legacy'?' rn-admin-reply rn-thread-legacy-inline':'')),meta=node('div',null,'rn-thread-reply-meta');box.dataset.replyId=r.id;meta.append(node('b',r.deleted?'已删除':r.is_developer?'开发者':r.author,r.is_developer&&!r.deleted?'rn-thread-dev':''));if(r.is_mine&&!r.deleted)meta.append(node('span','我','rn-thread-self'));
        if(r.parent_id&&!r.deleted){var parent=[...(legacy?[legacy]:[]),...items,...preview].find(function(x){return x.id===r.parent_id;});var link=action('回复 '+(parent?(parent.deleted?'已删除的回复':parent.author):'上条回复'),async function(){if(!opened||!loaded){opened=true;try{await refresh(false);}catch(e){status.textContent=e.message;return;}}var target=Array.from(body.querySelectorAll('[data-reply-id]')).find(function(n){return n.dataset.replyId===r.parent_id;});if(target){target.scrollIntoView({block:'nearest'});target.classList.add('rn-thread-highlight');setTimeout(function(){target.classList.remove('rn-thread-highlight');},1200);}else flash('原回复不在当前已加载范围');},'rn-thread-parent');meta.append(link);}
        if(r.can_delete&&!r.deleted)meta.append(menu(async function(){if(!window.confirm('删除这条回复？其他人的回复仍会保留。'))return;try{await send('announcement_thread_delete',{reply_id:r.id});if(!current())return;r.deleted=true;r.author='已删除';r.content='原回复已删除';r.can_delete=false;if(replyTarget?.parent===r.id)resetTarget();draw();}catch(e){status.textContent=e.message;}}));
        box.append(meta,node('div',r.deleted?'原回复已删除':r.content,'rn-thread-text'+(r.deleted?' rn-thread-deleted':'')));
        if(!r.deleted){var actions=node('div',null,'rn-thread-actions');var time=node('time',shortTime(r.created_at));time.title=new Date(r.created_at).toLocaleString();actions.append(time,like(r,false));if(thread.writable)actions.append(action('回复',function(){chooseThread(thread,r.id,r.author);}));box.append(actions);}body.append(box);
      });if(opened&&cursor!==null)body.append(action('更多回复',async function(){try{await refresh(true);}catch(e){status.textContent=e.message;}}));if(opened&&!shown.length)body.append(node('small','还没有回复','rn-thread-deleted'));});updateToggle();if(body.querySelector('.rn-admin-reply'))watchReply(row,article,item,back);}
      async function refresh(append){if(busy)return;busy=true;try{var d=await send('announcement_thread_read',{offset:append?cursor:0});if(!current())return;items=append?items.concat(d.rows||[]):d.rows||[];legacy=d.legacy||null;preview=[...(legacy?[legacy]:[]),...items.filter(function(r){return r.is_developer&&!r.deleted;}),...items.filter(function(r){return !r.is_developer&&!r.deleted;})].slice(0,2);cursor=d.next??null;total=Number.isFinite(d.reply_count)?d.reply_count:Math.max(total,items.length+(cursor!==null?1:0));thread.writable=!!d.writable&&!item.commentsReadOnly;Object.assign(rootLikes,d.root_likes||{});var fresh=like(rootLikes,true);rootLike.replaceWith(fresh);rootLike=fresh;loaded=true;draw();}finally{busy=false;}}
      async function afterSend(result,content,parent){if(!current())return;opened=true;body.hidden=false;total++;updateToggle();if(result.id&&loaded&&cursor===null){items.push({id:result.id,parent_id:parent,author:result.author||'我',is_developer:result.is_developer===true,is_mine:true,content:content,created_at:result.created_at||new Date().toISOString(),count:0,liked:false,can_delete:true});preview=[...(legacy?[legacy]:[]),...items.filter(function(r){return r.is_developer&&!r.deleted;}),...items.filter(function(r){return !r.is_developer&&!r.deleted;})].slice(0,2);draw();return;}await refresh(false);}
      draw();
    }
    async function load(append){if(loading)return;loading=true;more.disabled=true;status.textContent='正在加载评论…';try{var data=await call('announcement_comments',{notice_id:item.id,before:append?next:null},item.user);if(!current())return;if(!append&&!item.commentsEnabled&&!(data.rows||[]).length&&!(data.pinned||[]).length){section.remove();return;}threadsEnabled=data.threads_enabled===true;if(threadsEnabled){section.classList.add('rn-threads-enabled');form.querySelector('label').hidden=true;input.placeholder='说说你的想法…';submit.textContent='发送';if(!compact&&!item.commentsReadOnly&&data.comments_enabled!==false){compact=true;panel.classList.add('rn-compact-thread-modal');form.classList.add('rn-compact-composer');var line=node('div',null,'rn-compact-line');line.append(input,submit);form.append(line);panel.append(form);back.querySelector('.rn-actions').hidden=true;restoreDraft();}}if(data.read_only===true)archiveComments();if(!append){list.innerHTML='';var pins=section.querySelector('.rn-pinned-list');pins.innerHTML='';(data.pinned||[]).forEach(function(row){appendRow(row,pins);});}if(data.comments_enabled===false)hideCommentForm();(data.rows||[]).forEach(function(row){appendRow(row);});if(!list.children.length)list.textContent=item.commentsReadOnly?'这条公告还没有评论。':'还没有评论，欢迎说说你的想法。';next=data.next;more.hidden=!next;status.textContent='';}catch(e){if(current())status.textContent=e.message;}finally{loading=false;more.disabled=false;}}
    more.onclick=function(){load(true);};
    form.onsubmit=async function(e){e.preventDefault();if(!current()||item.commentsReadOnly||!item.commentsEnabled||submit.disabled)return;var content=input.value.trim(),chosen=replyTarget;if(!content){status.textContent='写点内容再发送吧';return;}if(chosen&&content.length>300){status.textContent='回复最多300字';return;}submit.disabled=true;status.textContent='正在发送…';try{if(chosen){var result=await chosen.thread.send('announcement_thread_add',{parent_id:chosen.parent,content:content});if(!current())return;if(item.id==='63656e74656e617279323032')track('centenary_comment_sent',{notice_id:item.id,kind:'reply'});replyDrafts.delete(keyFor(chosen));input.value='';resetTarget();flash('回复已发送');try{await chosen.thread.afterSend(result,content,chosen.parent);}catch(e){status.textContent='已发送，可重新展开查看。';}}else{await call('announcement_comment_add',{notice_id:item.id,content:content},item.user);if(!current())return;if(item.id==='63656e74656e617279323032')track('centenary_comment_sent',{notice_id:item.id,kind:'comment'});replyDrafts.delete(keyFor(null));input.value='';resizeInput();var sc=scrollBody(),y=sc.scrollTop;await load(false);sc.scrollTop=y;if(!status.textContent)flash('评论已发送');}}catch(e){if(current())status.textContent=e.message;}finally{submit.disabled=false;}};
    if(item.focusedThreadNotification){
      hideCommentForm();section.querySelector('h3').textContent='收到的回复';var n=item.focusedThreadNotification;
      var target=node('article',null,'rn-comment');target.append(node('div',n.target_author||'我的评论','rn-comment-meta'),node('div',n.target_content,'rn-comment-text'));
      var reply=node('div',null,'rn-thread-group'),replyRow=node('div',null,'rn-thread-reply rn-thread-highlight');replyRow.append(node('div',(n.is_developer?'开发者':n.author||'用户')+' 回复了你','rn-comment-meta'),node('div',n.content,'rn-thread-text'),node('time',shortTime(n.created_at),'rn-thread-actions'));reply.append(replyRow);target.append(reply);list.append(target);
      var reading=false,done=false,observer=null;
      async function acknowledge(){if(reading||done||!current()||document.visibilityState!=='visible')return;reading=true;try{var r=await call('announcement_reply_read',{id:n.id,kind:'thread'},item.user);if(!current())return;done=true;if(observer)observer.disconnect();window.dispatchEvent(new Event('announcement-replies-changed'));try{localStorage.setItem('st_announcement_reply_read:'+item.user.id,String(Date.now()));}catch(_){} }catch(_){}finally{reading=false;}}
      function visible(){var a=replyRow.getBoundingClientRect(),b=panel.getBoundingClientRect();if(a.height>0&&a.bottom>b.top&&a.top<b.bottom)acknowledge();}
      if(typeof IntersectionObserver==='function'){observer=new IntersectionObserver(function(entries){if(entries.some(function(e){return e.isIntersecting;}))acknowledge();},{root:panel,threshold:0.1});observer.observe(replyRow);}else{panel.addEventListener('scroll',visible);observer={disconnect:function(){panel.removeEventListener('scroll',visible);}};}
      (back.replyObservers||(back.replyObservers=[])).push(observer);requestAnimationFrame(function(){if(current()){replyRow.scrollIntoView({block:'center'});visible();}});return;
    }
    if(item.user.id==='guest'){if(!item.commentsEnabled){section.remove();return;}hideCommentForm();list.textContent=item.commentsReadOnly?'登录后可以查看当时的评论':'登录后可以查看和发表评论';return;}if(item.focusedComment){hideCommentForm();section.querySelector('h3').textContent='我的评论与作者回复';appendRow(item.focusedComment);requestAnimationFrame(function(){if(!current())return;var reply=list.querySelector('.rn-admin-reply');if(reply&&reply.scrollIntoView)reply.scrollIntoView({block:'center'});});return;}load(false);
  }
  function watchReply(row,article,item,back) {
    if(!row.is_mine||!row.reply_unread||!row.reply||!Number.isSafeInteger(row.reply_revision))return;
    var target=article.querySelector('.rn-admin-reply'),panel=back.querySelector('.rn-compact-thread-modal .rn-layout')||back.querySelector('.rn-modal'),reading=false,observer;if(!target)return;if(article.__legacyObserver)article.__legacyObserver.disconnect();
    function current(){var u=user();return back.isConnected&&u&&u.id===item.user.id&&u.token===item.user.token;}
    async function read(){
      if(reading||!current()||document.visibilityState!=='visible')return;reading=true;
      try{var result=await call('announcement_reply_read',{id:row.id,revision:row.reply_revision,replied_at:row.reply.created_at},item.user);var u=user();if(!u||u.id!==item.user.id||u.token!==item.user.token)return;if(result.read){row.reply_unread=false;if(observer)observer.disconnect();}window.dispatchEvent(new Event('announcement-replies-changed'));try{localStorage.setItem('st_announcement_reply_read:'+u.id,String(Date.now()));}catch(_){};}
      catch(_){/* Keep the unread reminder if acknowledging the reply fails. */}
      finally{reading=false;}
    }
    var checkVisible=function(){var r=target.getBoundingClientRect(),p=panel.getBoundingClientRect();if(r.height>0&&r.bottom>p.top&&r.top<p.bottom)read();};
    if(typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)read();});},{root:panel,threshold:0});observer.observe(target);
    }else{
      panel.addEventListener('scroll',checkVisible);requestAnimationFrame(checkVisible);
      observer={disconnect:function(){panel.removeEventListener('scroll',checkVisible);}};
    }
    document.addEventListener('visibilitychange',checkVisible);var disconnect=observer.disconnect.bind(observer);observer.disconnect=function(){document.removeEventListener('visibilitychange',checkVisible);disconnect();};
    article.__legacyObserver=observer;(back.replyObservers||(back.replyObservers=[])).push(observer);
  }
  async function openAnnouncementReply(id,kind){
    var u=user();if(!u)throw Error('请先登录再查看回复');
    var result=await call('announcement_reply_detail',{id:id,kind:kind==='thread'?'thread':'legacy'},u),now=user();
    if(!now||now.id!==u.id||now.token!==u.token)return;
    if(modal)close('open_reply');
    var notice=result.notice;
    pending.unshift({user:u,kind:'announcement',id:notice.id,title:notice.title,content:notice.content,updated_at:notice.updated_at,
      commentsEnabled:true,commentsReadOnly:result.read_only,commentsPublic:notice.comments_public!==false,
      focusedComment:result.comment,focusedThreadNotification:result.thread_notification||null,source:'reply_notification',manual:true});pump();
    track('announcement_reply_opened',{comment_id:id,notice_id:notice.id,reply_kind:kind==='thread'?'thread':'legacy'});
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
  async function check(source,manual,manualKind) {
    var u=user();if((!u&&!manual&&source!=='boot')||(!manual&&source!=='boot'&&document.querySelector('.auth-page'))||(!manual&&(document.visibilityState==='hidden'||navigator.onLine===false)))return;
    if(busy){await busy;if(manual)return check(source,true,manualKind);return;}
    u=u||{id:'guest',token:''};var start=Date.now();lastCheck=start;
    busy=(async function(){
      track('update_check_started',{source:source});
      var results=await Promise.allSettled([call(manual?'notice_history':u.id==='guest'?'notice_public':'notice_check',{},u),deployed()]);
      if(u.id!=='guest'&&(!user()||user().id!==u.id||user().token!==u.token))return;
      var config=results[0].status==='fulfilled'?results[0].value.config:null,html=results[1].status==='fulfilled'?results[1].value.version:CURRENT;
      if(config)latestConfig=config;
      if(!initialReady&&config&&results[1].status==='fulfilled'){
        initialReady=true;
        if(results[1].value.build===LOADED_BUILD&&compare(config.version,CURRENT)>=0){
          CURRENT=version(config.version);
          // Legacy telemetry and recognition read the live meta, not the footer.
          var versionMeta=document.querySelector('meta[name="application-version"]');
          if(versionMeta)versionMeta.setAttribute('content',CURRENT);
        }
        mountFooter();
      }
      if(config&&results[1].status==='fulfilled'&&u.id!=='guest')try{var info=JSON.parse(sessionStorage.getItem('st_notice_update_pending')||'null');if(info&&info.user_id===u.id){track(compare(CURRENT,info.to)>=0?'update_completed':'update_reload_still_old',{from:info.from,to:info.to});sessionStorage.removeItem('st_notice_update_pending');}}catch(_){}
      var c=config||latestConfig,target=compare(c.version,html)>=0?version(c.version):html;if(compare(target,CURRENT)<0)target=version(CURRENT);
      var receipts=results[0].status==='fulfilled'?results[0].value.seen||[]:[];receipts.forEach(function(r){mark(u,r.kind,r.notice_id);});
      track('update_check_completed',{source:source,target_version:target,duration_ms:Date.now()-start,config_ok:!!config,version_ok:results[1].status==='fulfilled'});
      if(results.some(function(r){return r.status==='rejected';}))track('update_check_failed',{source:source,status:results[0].status==='rejected'?results[0].reason.status||0:0,error:results.filter(function(r){return r.status==='rejected';}).map(function(r){return String(r.reason.message);}).join('; ').slice(0,180)});
      var known=target===version(c.version),content=known?c.content:(target==='v7.0'?DEFAULT.content:'新版本已准备好了，欢迎更新体验。'),title=known?c.title:target+' 更新内容';
      var releases=manual&&results[0].status==='fulfilled'&&Array.isArray(results[0].value.releases)?results[0].value.releases:[];
      releases=releases.filter(function(r){return r&&/^v?\d+(\.\d+){0,2}$/i.test(r.version)&&typeof r.title==='string'&&typeof r.content==='string';}).map(function(r){return {version:version(r.version),title:r.title,content:r.content,updated_at:r.updated_at||null};}).filter(function(r,i,a){return a.findIndex(function(x){return x.version===r.version;})===i;});
      releases=releases.filter(function(r){return r.version!==target;}).sort(function(a,b){return compare(b.version,a.version);});releases.unshift({version:target,title:title,content:content,updated_at:known?c.updated_at:null});
      var announcements=manual&&results[0].status==='fulfilled'&&Array.isArray(results[0].value.announcements)?results[0].value.announcements:[];
      announcements=announcements.filter(function(r){return r&&typeof r.id==='string'&&r.id.length===24&&typeof r.title==='string'&&typeof r.content==='string';}).map(function(r){return {id:r.id,title:r.title,content:r.content,updated_at:r.updated_at||null,comments_enabled:r.id===c.announcement_id&&c.announcement_enabled===true&&r.comments_enabled===true,comments_public:r.comments_public!==false,comment_title:r.comment_title||'想听听大家的意见'};});
      if(c.announcement_content&&c.announcement_id&&!announcements.some(function(r){return r.id===c.announcement_id;}))announcements.unshift({id:c.announcement_id,title:c.announcement_title,content:c.announcement_content,updated_at:c.updated_at,comments_enabled:c.announcement_enabled===true&&c.announcement_comments_enabled===true,comments_public:c.announcement_comments_public!==false,comment_title:c.announcement_comment_title||'想听听大家的意见'});
      announcements=announcements.filter(function(r,i,a){return a.findIndex(function(x){return x.id===r.id;})===i;});
      if(manual&&manualKind==='announcement'){
        if(announcements.length){var announcement=announcements[0];enqueue({user:u,kind:'announcement',id:announcement.id,title:announcement.title,content:announcement.content,updated_at:announcement.updated_at,commentsEnabled:announcement.comments_enabled,commentsPublic:announcement.comments_public,commentTitle:announcement.comment_title,announcements:announcements,source:source,manual:true});}
        return;
      }
      if(!manual){pending=pending.filter(function(item){return item.kind!=='release'||item.manual||item.id===target;});if(modal&&modal.kind==='release'&&!modal.manual&&modal.id!==target)close('superseded');}
      if(manual||(u.id!=='guest'&&c.enabled!==false)){if(manual||!seen(u,'release',target))enqueue({user:u,kind:'release',id:target,title:title,content:content,updated_at:known?c.updated_at:null,source:source,manual:!!manual,releases:manual?releases:null,announcements:manual?announcements:null});else track('notice_suppressed',{kind:'release',notice_id:target,reason:'already_seen',source:source});}
      if(!manual&&config){['announcement','tip'].forEach(function(kind){if(kind==='announcement'&&c.announcement_id==='63656e74656e617279323032')return;if(!c[kind+'_enabled']||!c[kind+'_content']||seen(u,kind,String(c[kind+'_id'])))return;enqueue({user:u,kind:kind,id:String(c[kind+'_id']),title:c.announcement_title,content:c[kind+'_content'],updated_at:c.updated_at,commentsEnabled:c.announcement_comments_enabled,commentsPublic:c.announcement_comments_public!==false,commentTitle:c.announcement_comment_title,source:source,manual:false});});}
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
  async function openCentenaryDiscussion(){
    var u=user();if(!u||u.id==='guest')return;
    var data=await call('notice_history',{},u),nowUser=user();if(!nowUser||nowUser.id!==u.id||nowUser.token!==u.token)return;
    var c=data.config||{},id='63656e74656e617279323032',r=(data.announcements||[]).find(function(x){return x.id===id;});
    if(c.announcement_id===id)r={id:id,title:c.announcement_title,content:c.announcement_content,updated_at:c.updated_at,comments_enabled:c.announcement_comments_enabled,comments_public:c.announcement_comments_public,comment_title:c.announcement_comment_title};
    if(!r)return;
    enqueue({user:u,kind:'announcement',id:id,title:r.title,content:r.content,updated_at:r.updated_at,commentsEnabled:c.announcement_id===id?r.comments_enabled===true:true,commentsReadOnly:c.announcement_id!==id,commentsPublic:r.comments_public!==false,commentTitle:r.comment_title||'纪念留言',source:'centenary',manual:true});
  }
  window.__releaseNotices={openCentenaryDiscussion:openCentenaryDiscussion,check:check,compareVersions:compare,currentVersion:function(){return CURRENT;},refreshSupport:function(){if(modal)mountSupport(modal.back,modal);},openAnnouncementReply:openAnnouncementReply,openAnnouncement:function(){track('announcement_manual_opened',{source:'settings'});return check('manual_announcement',true,'announcement');}};
  var replyStyle=document.createElement('style');replyStyle.textContent='.rn-admin-reply{margin-top:12px;padding:12px 14px;border-left:3px solid var(--accent,#315efb);background:var(--accent-soft,#f3f6ff);border-radius:8px;font-size:13px;line-height:1.8;overflow-wrap:anywhere}.rn-admin-reply time{display:block;font-size:11px;color:var(--muted,#68758b)}.rn-admin-reply>div{white-space:pre-wrap;margin-top:4px}';document.head.appendChild(replyStyle);
})();
