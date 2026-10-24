/* Optional, account-only WeChat community. No chat SDK or third-party image requests. */
(function () {
  'use strict';
  var config=null, identity='', loading=null, generation=0, lastLoad=0, modal=null, expiryTimer;
  var esc=function(v){return escapeHtml(String(v==null?'':v));};
  function owner(){return state.user&&state.token?String(state.user.id)+'|'+state.token:'';}
  function available(){return !!(owner()&&owner()===identity&&config&&config.enabled&&config.qr_image&&(!config.expires_at||Date.parse(config.expires_at)>Date.now()));}
  function safeImage(value){return typeof value==='string' && value.length<=500000 && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)||/^\.?\/?[a-zA-Z0-9_\-./]+\.(png|jpe?g|webp)$/i.test(value)&&!value.startsWith('//')&&!value.includes('..'));}
  function safeLink(value){try{var u=new URL(value);return u.protocol==='https:'&&['weixin.qq.com','work.weixin.qq.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:'';}catch(_){return '';}}
  function close(){
    if(!modal)return;var old=modal;modal=null;old.back.remove();document.body.style.overflow=old.overflow;
    old.background.forEach(function(pair){if(pair[0].isConnected&&!pair[1])pair[0].removeAttribute('inert');});
    if(old.focus&&old.focus.isConnected)old.focus.focus();
  }
  function reset(){generation++;loading=null;lastLoad=0;config=null;identity=owner();clearTimeout(expiryTimer);close();}
  function refresh(){
    if(owner()!==identity)reset();
    if(!available())close();
    var card=document.getElementById('communityAccountCard'),first=state.page==='account'&&document.querySelector('.account-grid > .account-card');
    if(!available()||!first){if(card)card.remove();}
    else if(!card){
      card=document.createElement('section');card.id='communityAccountCard';card.className='account-card community-card';
      card.innerHTML='<div><h3>交流与反馈</h3><p>一起交流使用心得，也欢迎提出建议。加入自愿，原反馈入口照常保留。</p></div><button type="button" class="community-button" data-community-open>加入微信交流群 <span aria-hidden="true">›</span></button>';
      first.after(card);
    }
    window.__releaseNotices?.refreshSupport?.();
    if(identity&&!loading&&(!lastLoad||(state.page==='account'||modal||document.querySelector('[data-notice-community]'))&&Date.now()-lastLoad>5*60000))load(false);
  }
  async function load(force){
    if(owner()!==identity)reset();if(!identity)return;
    if(loading)return loading;if(!force&&Date.now()-lastLoad<5*60000)return;
    var who=identity,seq=++generation,controller=new AbortController(),timer=setTimeout(function(){controller.abort();},8000);
    lastLoad=Date.now();
    loading=(async function(){
      try{
        var res=await fetch('/api/score-tracker-notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'community_public',token:state.token}),cache:'no-store',signal:controller.signal});
        if(!res.ok)throw new Error('config unavailable');var c=(await res.json()).config;
        if(seq!==generation||owner()!==who)return;
        if(!c||c.enabled!==true||!safeImage(c.qr_image)||typeof c.title!=='string'||typeof c.intro!=='string'||c.expires_at&&!Number.isFinite(Date.parse(c.expires_at)))c=null;
        if(modal&&JSON.stringify(config)!==JSON.stringify(c))close();config=c;clearTimeout(expiryTimer);
        if(c&&c.expires_at){var remaining=Date.parse(c.expires_at)-Date.now();if(remaining>0)expiryTimer=setTimeout(refresh,Math.min(remaining+20,2147483647));}
      }catch(_){if(seq===generation&&owner()===who){config=null;close();}}
      finally{clearTimeout(timer);if(seq===generation){loading=null;refresh();}}
    })();return loading;
  }
  async function open(){
    if(!owner()||state.onboarding)return false;
    await load(true);
    if(!available()){if(typeof toast==='function')toast('交流群暂未开放或二维码已到期，请稍后再试。');return false;}
    if(modal)return true;
    if(document.querySelector('.modal-backdrop,.rn-back,.support-back,.st-fb-back'))return false;
    var c=config,back=document.createElement('div');back.className='community-back modal-backdrop';
    var url=safeLink(c.join_url);
    back.innerHTML='<section class="community-panel" role="dialog" aria-modal="true" aria-labelledby="communityTitle"><header><h2 id="communityTitle">'+esc(c.title)+'</h2><button type="button" data-community-close aria-label="关闭交流群面板">×</button></header><p>'+esc(c.intro)+'</p><button type="button" class="community-qr" aria-label="放大微信群二维码" aria-pressed="false"><img src="'+esc(c.qr_image)+'" alt="微信群入群二维码"></button><p class="community-help">电脑上可用微信扫一扫；手机上可保存图片，再从微信扫一扫的相册中识别。点击二维码可放大，也可长按保存。</p>'+(c.expires_at?'<p class="community-help">二维码有效至 '+esc(new Date(c.expires_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}))+'（北京时间）</p>':'')+'<button type="button" class="community-button" data-community-save>保存群二维码</button>'+(url?'<a class="community-button" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">前往微信加群</a>':'')+'<p class="community-status" role="status" aria-live="polite"></p><p class="community-help">加群完全自愿，不影响任何功能。群满或二维码失效时，仍可使用原有反馈入口联系我。</p></section>';
    modal={back:back,focus:document.activeElement,overflow:document.body.style.overflow,background:[]};
    document.body.appendChild(back);document.body.style.overflow='hidden';
    Array.from(document.body.children).filter(function(n){return n!==back&&!/^(SCRIPT|STYLE)$/.test(n.tagName);}).forEach(function(n){modal.background.push([n,n.hasAttribute('inert')]);n.setAttribute('inert','');});
    back.querySelector('[data-community-close]').onclick=close;back.onclick=function(e){if(e.target===back)close();};
    back.onkeydown=function(e){
      if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key!=='Tab')return;
      var buttons=Array.from(back.querySelectorAll('button:not(:disabled),a[href]')),first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    var image=back.querySelector('img'),zoom=back.querySelector('.community-qr'),save=back.querySelector('[data-community-save]');
    zoom.onclick=function(){var expanded=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(expanded));zoom.setAttribute('aria-label',expanded?'缩小微信群二维码':'放大微信群二维码');zoom.classList.toggle('is-large',expanded);};
    image.onerror=function(){save.disabled=true;zoom.hidden=true;back.querySelector('.community-status').textContent='二维码暂时加载不出来，请稍后重试。';};
    save.onclick=function(){if(!available()){close();return;}var a=document.createElement('a');a.href=c.qr_image;a.download='成绩轨迹-微信群二维码.'+(c.qr_image.startsWith('data:')?c.qr_image.slice(11).split(';')[0]:c.qr_image.split('.').pop());document.body.appendChild(a);a.click();a.remove();back.querySelector('.community-status').textContent='已发起保存。如果没有保存成功，可以长按二维码保存。';};
    back.querySelector('[data-community-close]').focus();return true;
  }
  var style=document.createElement('style');style.textContent='.community-card{display:flex;align-items:center;justify-content:space-between;gap:18px}.community-card h3{margin:0 0 6px;font-size:16px}.community-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.8}.community-button{display:inline-block;text-align:center;border:1px solid var(--line);border-radius:10px;background:var(--accent-soft);color:var(--accent);font:inherit;font-size:13px;padding:11px 15px;cursor:pointer;text-decoration:none;flex-shrink:0}.community-back{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:16px;background:#101a3070;backdrop-filter:blur(6px)}.community-panel{box-sizing:border-box;width:min(460px,100%);max-height:90dvh;overflow:auto;border-radius:20px;background:var(--panel-solid,#fff);color:var(--text);padding:24px;line-height:1.8}.community-panel header{display:flex;justify-content:space-between;align-items:center;gap:12px}.community-panel h2{margin:0;font-size:19px;overflow-wrap:anywhere}.community-panel p{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.community-panel header button{border:0;background:transparent;color:var(--muted);font-size:26px;cursor:pointer}.community-qr{display:block;max-width:100%;width:230px;margin:20px auto 12px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:zoom-in}.community-qr img{display:block;width:100%;height:auto}.community-qr.is-large{width:100%;cursor:zoom-out}.community-panel .community-help{font-size:12px;color:var(--muted)}.community-panel>.community-button{box-sizing:border-box;width:100%;margin-top:10px}.community-button:disabled{opacity:.5;cursor:default}.community-panel button:focus-visible,.community-button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:520px){.community-card{flex-direction:column;align-items:stretch}.community-panel{padding:20px}.community-qr{width:210px}}';document.head.appendChild(style);
  document.addEventListener('click',function(e){if(e.target.closest?.('[data-community-open]'))open();});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')refresh();});
  window.addEventListener('online',function(){load(true);});
  setInterval(function(){if(document.visibilityState==='visible')refresh();},60000);
  var previousRender=render;render=function(){var r=previousRender.apply(this,arguments);refresh();return r;};
  var previousBind=bindPage;bindPage=function(){var r=previousBind.apply(this,arguments);refresh();return r;};
  new MutationObserver(function(){if(owner()!==identity)refresh();}).observe(document.body,{childList:true});
  window.__scoreTrackerCommunity={available:available,open:open,refresh:refresh,load:load};refresh();
})();
