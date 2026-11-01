/* Add media to existing notice surfaces without changing their publication flow. */
(function(){
  'use strict';
  var media=window.__scoreTrackerNoticeMedia;if(!media)return;
  var processed=new WeakSet(),queued=false;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function actor(admin){try{return admin?localStorage.getItem('st_admin_token')||'':typeof state!=='undefined'&&state.user&&state.token?String(state.user.id)+'|'+state.token:''}catch(_){return ''}}
  function track(type,data){try{(window.__scoreTrackerTrack||window.__stTrack||function(){})(type,Object.assign({source:'notice'},data||{}))}catch(_){}}
  function safeQr(v){return typeof v==='string'&&v.length<=500000&&(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)||/^\.?\/?[a-zA-Z0-9_\-./]+\.(png|jpe?g|webp)$/i.test(v)&&!v.startsWith('//')&&!v.includes('..'))}
  function usable(c){return c&&c.enabled===true&&safeQr(c.qr_image)&&(!c.expires_at||Number.isFinite(Date.parse(c.expires_at))&&Date.parse(c.expires_at)>Date.now())}
  function message(box,text,admin){box.innerHTML='<p role="status">'+esc(text)+'</p>';if(actor(admin)){var retry=document.createElement('button');retry.type='button';retry.className='community-button';retry.textContent='重新读取二维码';retry.onclick=function(){mountQr(box,admin)};box.appendChild(retry)}}
  async function mountQr(box,admin){
    var who=actor(admin);box.__noticeActor=who;clearTimeout(box.__noticeExpiry);box.__noticeConfig=null;
    if(!who){message(box,'登录后可以查看当前群二维码。',admin);return}
    box.innerHTML='<p role="status">正在读取群二维码…</p>';
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},10000),request={};box.__noticeRequest=request;
    function current(){return box.isConnected&&box.__noticeRequest===request&&actor(admin)===who}
    try{
      var response=await fetch(admin?'/mg?action=notification_community_config':'/api/score-tracker-notices',admin?{headers:{'x-score-token':who},cache:'no-store',signal:controller.signal}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'community_public',token:state.token}),cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('unavailable');var payload=await response.json(),c=payload.config;if(!current())return;
      if(!usable(c)){message(box,'当前群二维码不可用，可以稍后重试或通过反馈联系我。',admin);return}
      box.__noticeConfig=c;
      box.innerHTML='<h3>'+esc(c.title||'微信交流群')+'</h3><p>新功能抢先体验 · 和作者直接交流</p><button class="community-qr" type="button" aria-label="放大微信群二维码" aria-pressed="false"><img '+(window.__scoreTrackerAssets?window.__scoreTrackerAssets.attributes(c.qr_image):'src="'+esc(c.qr_image)+'"')+' alt="微信群入群二维码"></button><button class="community-button" type="button" data-notice-qr-save>保存群二维码，去微信加群</button><p>电脑用微信扫一扫；手机保存图片后，在微信扫一扫中从相册识别。也可以长按图片保存。</p>'+(c.expires_at?'<p>有效至 '+esc(new Date(c.expires_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}))+'（北京时间）</p>':'')+'<p role="status" aria-live="polite"></p>';
      if(!admin)track('community_qr_inline_shown');
      var zoom=box.querySelector('.community-qr'),save=box.querySelector('[data-notice-qr-save]'),status=box.querySelector('[role="status"]');
      zoom.onclick=function(){var expanded=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(expanded));zoom.setAttribute('aria-label',expanded?'缩小微信群二维码':'放大微信群二维码');zoom.classList.toggle('is-large',expanded);if(!admin)track('community_qr_zoomed',{expanded:expanded?1:0})};
      box.querySelector('img').onerror=function(){zoom.hidden=true;save.disabled=true;status.textContent='二维码暂时加载不出来，请稍后重试。';if(!admin)track('community_qr_load_failed')};
      save.onclick=async function(){if(!current()||!usable(c)){mountQr(box,admin);return}if(!admin)track('community_qr_save_requested');save.disabled=true;try{var name='成绩轨迹-微信群二维码.'+(c.qr_image.startsWith('data:')?c.qr_image.slice(11).split(';')[0]:c.qr_image.split('.').pop());if(window.__scoreTrackerAssets)await window.__scoreTrackerAssets.save(c.qr_image,name);else{var a=document.createElement('a');a.href=c.qr_image;a.download=name;document.body.appendChild(a);a.click();a.remove();}status.textContent='已发起保存。如果没有保存成功，可以长按二维码保存。';}catch(_){status.textContent='保存失败，可以长按二维码保存，或稍后重试。';}finally{save.disabled=false}};
      if(c.expires_at)box.__noticeExpiry=setTimeout(function(){if(current())message(box,'群二维码已到期，请通过反馈联系作者更新。',admin)},Math.min(Date.parse(c.expires_at)-Date.now()+20,2147483647));
    }catch(_){if(current())message(box,'二维码读取失败，请稍后重试。',admin)}finally{clearTimeout(timer)}
  }
  function enhance(root,admin){
    if(processed.has(root))return;processed.add(root);
    var walker=document.createTreeWalker(root,4),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(node){if(node.parentElement.closest('button,.notice-gallery,.notice-community-inline')||!/(?:!\[|#community-qr)/.test(node.textContent))return;var html=media.markup(node.textContent,esc);if(html===esc(node.textContent))return;var template=document.createElement('template');template.innerHTML=html;node.replaceWith(template.content)});
    media.mount(root,admin?null:track);root.querySelectorAll('[data-notice-community-inline]').forEach(function(box){box.__noticeAdmin=admin;mountQr(box,admin)});
  }
  async function draft(){var r=await fetch('/assets/announcements/beta-invitation.json',{cache:'no-store'});if(!r.ok)throw Error('内测公告草稿暂时无法读取');return r.json()}
  function changed(el){el.dispatchEvent(new Event('input',{bubbles:true}))}
  function insert(el,text){if(!el)return;var start=el.selectionStart,end=el.selectionEnd,addition='\n'+text+'\n';if(el.value.length-(end-start)+addition.length>el.maxLength)throw Error('内容已达到长度上限');el.setRangeText(addition,start,end,'end');changed(el);el.focus()}
  function editorTools(){
    var form=document.getElementById('noticeForm');if(!form)return;
    form.querySelectorAll('.notice-format-tools').forEach(function(tools){if(tools.querySelector('[data-media-tools]'))return;var bold=tools.querySelector('[data-notice-bold]');if(!bold)return;var key=bold.dataset.noticeBold,span=document.createElement('span');span.dataset.mediaTools='1';span.style.cssText='display:contents';span.innerHTML='<button class="btn ghost" type="button" data-add-qr>插入群二维码</button><button class="btn ghost" type="button" data-add-shots>插入内测截图</button>'+(key==='announcement_content'?'<button class="btn" type="button" data-add-invite>填入新功能内测公告草稿</button>':'')+'<span role="status" data-media-status></span>';tools.appendChild(span);
      var status=span.querySelector('[data-media-status]');span.querySelector('[data-add-qr]').onclick=function(){try{insert(document.getElementById('notice_'+key),'[加入微信内测群](#community-qr)')}catch(e){status.textContent=e.message}};
      function bind(selector,fill){var button=span.querySelector(selector);if(!button)return;button.onclick=async function(){var who=actor(true),before=JSON.stringify(Array.from(form.querySelectorAll('[data-notice-field]')).map(function(el){return [el.value,el.checked]}));button.disabled=true;status.textContent='正在读取…';try{var data=await draft();if(!form.isConnected||actor(true)!==who)return;if(before!==JSON.stringify(Array.from(form.querySelectorAll('[data-notice-field]')).map(function(el){return [el.value,el.checked]})))throw Error('内容刚刚有修改，请再点击一次');fill(data);status.textContent='已填入，可以修改和预览，尚未发布。'}catch(e){if(form.isConnected)status.textContent=e.message}finally{button.disabled=false}}}
      bind('[data-add-shots]',function(data){insert(document.getElementById('notice_'+key),data.announcement_content.split('\n').filter(function(line){return line.startsWith('![')}).join('\n'))});
      bind('[data-add-invite]',function(data){Object.keys(data).forEach(function(k){var el=form.querySelector('[data-notice-field="'+k+'"]');if(el){if(el.type==='checkbox')el.checked=data[k];else el.value=data[k]}});changed(form.querySelector('[data-notice-field="announcement_content"]'))});
    });
  }
  function scan(){queued=false;document.querySelectorAll('.rn-content').forEach(function(root){enhance(root,false)});document.querySelectorAll('.notice-preview-content').forEach(function(root){enhance(root,true)});editorTools();document.querySelectorAll('[data-notice-community-inline]').forEach(function(box){if(box.__noticeActor!==actor(box.__noticeAdmin)){box.__noticeRequest=null;mountQr(box,box.__noticeAdmin)}})}
  function schedule(){if(!queued){queued=true;queueMicrotask(scan)}}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')document.querySelectorAll('[data-notice-community-inline]').forEach(function(box){mountQr(box,box.__noticeAdmin)})});
  scan();
})();
