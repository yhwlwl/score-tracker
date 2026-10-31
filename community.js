/* Optional, account-only WeChat community. No chat SDK or third-party image requests. */
(function () {
  'use strict';
  var config=null, identity='', loading=null, generation=0, lastLoad=0, modal=null, expiryTimer, entryTracked='',lastSuccess=0,authFailed=false;
  var esc=function(v){return escapeHtml(String(v==null?'':v));};
  function track(event, metadata) { try { var fn=window.__scoreTrackerTrack||window.__stTrack; if(typeof fn==='function')fn(event,metadata||{}); } catch (_) {} }
  function owner(){return state.user&&state.token?String(state.user.id)+'|'+state.token:'';}
  function available(){return !!(owner()&&owner()===identity&&config&&config.enabled&&config.qr_image&&Date.now()-lastSuccess<10*60000&&(!config.expires_at||Date.parse(config.expires_at)>Date.now()));}
  function safeImage(value){return typeof value==='string' && value.length<=500000 && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)||/^\.?\/?[a-zA-Z0-9_\-./]+\.(png|jpe?g|webp)$/i.test(value)&&!value.startsWith('//')&&!value.includes('..'));}
  function safeLink(value){try{var u=new URL(value);return u.protocol==='https:'&&['weixin.qq.com','work.weixin.qq.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:'';}catch(_){return '';}}
  function close(reason){
    if(!modal)return;var old=modal;modal=null;track('community_closed',{reason:reason||'unknown'});old.back.remove();document.body.style.overflow=old.overflow;
    old.background.forEach(function(pair){if(pair[0].isConnected&&!pair[1])pair[0].removeAttribute('inert');});
    if(old.focus&&old.focus.isConnected)old.focus.focus();
  }
  function reset(){generation++;loading=null;lastLoad=0;lastSuccess=0;authFailed=false;config=null;identity=owner();entryTracked='';clearTimeout(expiryTimer);close('account_changed');}
  function homeDismissed(){try{return Number(localStorage.getItem('st_community_hide_'+state.user.id)||0)>Date.now()}catch(_){return false}}
  function refresh(){
    if(owner()!==identity)reset();
    if(!available())close('unavailable');
    var card=document.getElementById('communityAccountCard'),first=state.page==='account'&&document.querySelector('.account-grid > .account-card');
    if(!available()||!first){if(card)card.remove();}
    else if(!card){
      card=document.createElement('section');card.id='communityAccountCard';card.className='card account-card community-card';
      card.innerHTML='<div><h3 class="card-title">交流与反馈</h3><p>遇到问题、想提建议，来群里直接聊。也欢迎分享自己的使用心得。</p></div><button type="button" class="community-button" data-community-open="account">加入微信交流群 <span aria-hidden="true">›</span></button>';
      first.after(card);
    }
    var home=document.getElementById('communityHomeCard'),content=state.page==='home'&&document.getElementById('content');
    if(!available()||!content||state.onboarding||homeDismissed()){if(home)home.remove();}
    else if(!home){
      home=document.createElement('section');home.id='communityHomeCard';home.className='community-home';
      home.innerHTML='<div class="community-home-icon" aria-hidden="true">聊</div><div class="community-home-copy"><span class="community-kicker">和作者、同学一起交流</span><h3>有想法，来群里聊聊</h3><p>使用问题 · 功能建议 · 学习心得</p></div><button class="community-button" type="button" data-community-open="home">看看交流群 <span aria-hidden="true">↗</span></button><button class="community-dismiss" type="button" aria-label="暂时收起交流群入口，七天后再显示" title="收起 7 天">×</button>';
      var anchor=content.querySelector('.hero');if(anchor)anchor.after(home);else content.prepend(home);
      home.querySelector('.community-dismiss').onclick=function(){try{localStorage.setItem('st_community_hide_'+state.user.id,String(Date.now()+7*86400000))}catch(_){}home.remove();track('community_entry_dismissed',{source:'home',days:7})};
    }
    var source=home&&home.isConnected?'home':card&&card.isConnected?'account':'';
    if(source&&entryTracked.indexOf('|'+source+'|')<0){entryTracked+='|'+source+'|';track('community_entry_shown',{source:source});}
    window.__releaseNotices?.refreshSupport?.();
    if(identity&&!authFailed&&!loading&&(!lastLoad||Date.now()-lastLoad>5*60000))load(false,'refresh');
  }
  async function load(force,source){
    if(owner()!==identity)reset();if(!identity||authFailed)return;
    if(loading)return loading;if(!force&&Date.now()-lastLoad<5*60000)return;
    source=source||'refresh';var who=identity,seq=++generation,started=Date.now();lastLoad=Date.now();
    loading=(async function(){
      var attempts=0;
      try{
        var c;
        for(var attempt=0;attempt<2;attempt++){
          attempts++;var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
          try{
            var res=await fetch('/api/score-tracker-notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'community_public',token:state.token}),cache:'no-store',signal:controller.signal});
            if(!res.ok)throw Object.assign(new Error('config unavailable'),{status:res.status});
            var payload=await res.json();c=payload.config;break;
          }catch(error){if(attempt===0&&seq===generation&&owner()===who&&(!error.status||error.status>=500||error.status===408)&&error.name!=='SyntaxError')continue;throw error}
          finally{clearTimeout(timer)}
        }
        if(seq!==generation||owner()!==who)return;
        if(!c||typeof c.enabled!=='boolean')throw Object.assign(new Error('invalid config'),{kind:'invalid_config'});
        if(c.enabled&&(!safeImage(c.qr_image)||typeof c.title!=='string'||typeof c.intro!=='string'||c.expires_at&&!Number.isFinite(Date.parse(c.expires_at))))throw Object.assign(new Error('invalid config'),{kind:'invalid_config'});
        if(!c.enabled)c=null;
        if(modal&&JSON.stringify(config)!==JSON.stringify(c))close('config_changed');config=c;lastSuccess=Date.now();clearTimeout(expiryTimer);
        if(c&&c.expires_at){var remaining=Date.parse(c.expires_at)-Date.now();if(remaining>0)expiryTimer=setTimeout(refresh,Math.min(remaining+20,2147483647));}
      }catch(error){if(seq===generation&&owner()===who){
        var status=Number(error&&error.status)||0,kind=error.kind||(status===401?'auth_expired':error.name==='AbortError'?'timeout':error.name==='SyntaxError'?'invalid_response':status?'http_error':'network');
        authFailed=status===401;
        if(authFailed||kind==='invalid_config'||kind==='invalid_response'||status>=400&&status<500&&status!==408&&status!==429||!available()){config=null;close('load_failed');}
        track('community_config_load_failed',{source:source,status:status,failure_type:kind,attempts:attempts,duration_ms:Date.now()-started,using_recent_config:available()?1:0});
      }}finally{if(seq===generation){loading=null;refresh();}}
    })();return loading;
  }
  async function open(source){
    source=source||'api';
    if(!owner()||state.onboarding)return false;
    if(!available()||Date.now()-lastSuccess>=5*60000)await load(true,'open');
    if(!available()){track('community_open_unavailable',{source:source});if(typeof toast==='function')toast(authFailed?'登录已失效，请重新登录后查看交流群。':'交流群暂时无法打开，请稍后再试；仍可通过反馈联系我。');return false;}
    if(modal)return true;
    if(document.querySelector('.modal-backdrop,.rn-back,.support-back,.st-fb-back'))return false;
    track('community_opened',{source:source});
    var c=config,back=document.createElement('div');back.className='community-back modal-backdrop';
    var url=safeLink(c.join_url);
    back.innerHTML='<section class="community-panel" role="dialog" aria-modal="true" aria-labelledby="communityTitle"><header><h2 id="communityTitle">'+esc(c.title)+'</h2><button type="button" data-community-close aria-label="关闭交流群面板">×</button></header><p>'+esc(c.intro)+'</p><button type="button" class="community-qr" aria-label="放大微信群二维码" aria-pressed="false"><img '+(window.__scoreTrackerAssets?window.__scoreTrackerAssets.attributes(c.qr_image):'src="'+esc(c.qr_image)+'"')+' alt="微信群入群二维码"></button><p class="community-help">电脑上可用微信扫一扫；手机上可保存图片，再从微信扫一扫的相册中识别。点击二维码可放大，也可长按保存。</p>'+(c.expires_at?'<p class="community-help">二维码有效至 '+esc(new Date(c.expires_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}))+'（北京时间）</p>':'')+'<button type="button" class="community-button" data-community-save>保存群二维码</button>'+(url?'<a class="community-button" data-community-join href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">前往微信加群</a>':'')+'<p class="community-status" role="status" aria-live="polite"></p><p class="community-help">加群完全自愿，不影响任何功能。群满或二维码失效时，仍可使用原有反馈入口联系我。</p></section>';
    modal={back:back,focus:document.activeElement,overflow:document.body.style.overflow,background:[]};
    document.body.appendChild(back);document.body.style.overflow='hidden';
    Array.from(document.body.children).filter(function(n){return n!==back&&!/^(SCRIPT|STYLE)$/.test(n.tagName);}).forEach(function(n){modal.background.push([n,n.hasAttribute('inert')]);n.setAttribute('inert','');});
    back.querySelector('[data-community-close]').onclick=function(){close('close_button');};back.onclick=function(e){if(e.target===back)close('backdrop');};
    back.onkeydown=function(e){
      if(e.key==='Escape'){e.preventDefault();close('escape');return;}if(e.key!=='Tab')return;
      var buttons=Array.from(back.querySelectorAll('button:not(:disabled),a[href]')),first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    var image=back.querySelector('img'),zoom=back.querySelector('.community-qr'),save=back.querySelector('[data-community-save]');
    zoom.onclick=function(){var expanded=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(expanded));zoom.setAttribute('aria-label',expanded?'缩小微信群二维码':'放大微信群二维码');zoom.classList.toggle('is-large',expanded);track('community_qr_zoomed',{expanded:expanded?1:0});};
    image.onerror=function(){track('community_qr_load_failed');save.disabled=true;zoom.hidden=true;back.querySelector('.community-status').textContent='二维码暂时加载不出来，请稍后重试。';};
    save.onclick=async function(){if(!available()){close('unavailable');return;}track('community_qr_save_requested');save.disabled=true;try{var name='成绩轨迹-微信群二维码.'+(c.qr_image.startsWith('data:')?c.qr_image.slice(11).split(';')[0]:c.qr_image.split('.').pop());if(window.__scoreTrackerAssets)await window.__scoreTrackerAssets.save(c.qr_image,name);else{var a=document.createElement('a');a.href=c.qr_image;a.download=name;document.body.appendChild(a);a.click();a.remove();}back.querySelector('.community-status').textContent='已发起保存。如果没有保存成功，可以长按二维码保存。';}catch(_){back.querySelector('.community-status').textContent='保存失败，可以长按二维码保存，或稍后重试。';}finally{save.disabled=false;}};
    var join=back.querySelector('[data-community-join]');if(join)join.onclick=function(){track('community_join_link_clicked');};
    back.querySelector('[data-community-close]').focus();return true;
  }
  var style=document.createElement('style');style.textContent='.community-home{position:relative;display:flex;align-items:center;gap:16px;padding:20px 48px 20px 22px;margin:18px 0;border:1px solid var(--line);border-radius:18px;background:var(--panel-solid,#fff)}.community-home-icon{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:14px;color:var(--accent);background:var(--accent-soft);font-size:19px;font-weight:700}.community-home-copy{flex:1;min-width:0}.community-kicker{font-size:11px;color:var(--muted)}.community-home h3{font-size:16px;line-height:1.5;margin:3px 0}.community-home p{font-size:12px;color:var(--muted);margin:0}.community-dismiss{position:absolute;right:10px;top:9px;width:28px;height:28px;background:transparent;border:0;font-size:21px;color:var(--muted);cursor:pointer}@media(max-width:560px){.community-home{display:grid;grid-template-columns:44px minmax(0,1fr);padding:18px;gap:12px}.community-home-copy{padding-right:16px}.community-home>.community-button{grid-column:2;justify-self:start;margin-left:0;padding:8px 13px;font-size:12px}}.community-card{display:flex;align-items:center;justify-content:space-between;gap:18px}.community-card h3{margin:0 0 6px;font-size:16px}.community-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.8}.community-button{display:inline-block;text-align:center;border:1px solid var(--line);border-radius:10px;background:var(--accent-soft);color:var(--accent);font:inherit;font-size:13px;padding:11px 15px;cursor:pointer;text-decoration:none;flex-shrink:0}.community-back{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:16px;background:#101a3070;backdrop-filter:blur(6px)}.community-panel{box-sizing:border-box;width:min(460px,100%);max-height:90dvh;overflow:auto;border-radius:20px;background:var(--panel-solid,#fff);color:var(--text);padding:24px;line-height:1.8}.community-panel header{display:flex;justify-content:space-between;align-items:center;gap:12px}.community-panel h2{margin:0;font-size:19px;overflow-wrap:anywhere}.community-panel p{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.community-panel header button{border:0;background:transparent;color:var(--muted);font-size:26px;cursor:pointer}.community-qr{display:block;max-width:100%;width:230px;margin:20px auto 12px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:zoom-in}.community-qr img{display:block;width:100%;height:auto}.community-qr.is-large{width:100%;cursor:zoom-out}.community-panel .community-help{font-size:12px;color:var(--muted)}.community-panel>.community-button{box-sizing:border-box;width:100%;margin-top:10px}.community-button:disabled{opacity:.5;cursor:default}.community-panel button:focus-visible,.community-button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:520px){.community-card{flex-direction:column;align-items:stretch}.community-panel{padding:20px}.community-qr{width:210px}}';document.head.appendChild(style);
  document.addEventListener('click',function(e){var entry=e.target.closest?.('[data-community-open]');if(entry)open(entry.dataset.communityOpen||'account');});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')refresh();});
  window.addEventListener('online',function(){load(true);});
  setInterval(function(){if(document.visibilityState==='visible')refresh();},60000);
  var previousRender=render;render=function(){var r=previousRender.apply(this,arguments);refresh();return r;};
  var previousBind=bindPage;bindPage=function(){var r=previousBind.apply(this,arguments);refresh();return r;};
  new MutationObserver(function(){if(owner()!==identity)refresh();}).observe(document.body,{childList:true});
  window.__scoreTrackerCommunity={available:available,open:open,refresh:refresh,load:load};refresh();
})();
