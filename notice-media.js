/* Small, same-origin media vocabulary shared by notices and the admin preview. */
(function () {
  'use strict';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function imagePath(v) { return /^\/assets\/announcements\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$/.test(v)||/^\/assets\/announcements\/beta-(?:appearance|paper-review|question-entry|question-analysis)\.svg$/.test(v); }
  function markup(value, textMarkup) {
    var gallery=[], out=[], text=[], hasMedia=false;
    function flush(){if(gallery.length){out.push('<div class="notice-gallery">'+gallery.join('')+'</div>');gallery=[];}}
    function flushText(){if(text.length){var chunk=text.join('\n').replace(/^\n+|\n+$/g,'');if(chunk)out.push(textMarkup(chunk));text=[];}}
    String(value||'').split('\n').forEach(function(line){
      var match=line.match(/^!\[([^\]\n]{1,80})\]\(([^\s)]+)\)$/);
      if(match&&imagePath(match[2])){
        hasMedia=true;
        flushText();
        gallery.push('<figure class="notice-shot"><button type="button" data-notice-image aria-expanded="false" aria-label="查看大图：'+esc(match[1])+'"><img src="'+esc(match[2])+'" alt="'+esc(match[1])+'" loading="lazy" decoding="async"><span>'+esc(match[1])+'</span><small>点击看大图</small></button></figure>');return;
      }
      flush();
      if(/^\[[^\]\n]{1,80}\]\(#community-qr\)$/.test(line)){hasMedia=true;flushText();out.push('<section class="notice-community-inline" data-notice-community-inline aria-label="加入微信交流群"><p role="status">正在读取群二维码…</p></section>');}
      else text.push(line);
    });flush();flushText();return hasMedia?out.join(''):textMarkup(value);
  }
  function mount(root, track) {
    root.querySelectorAll('[data-notice-image]').forEach(function(button){
      if(button.dataset.mediaBound)return;button.dataset.mediaBound='1';
      button.onclick=function(){var expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(expanded));button.closest('.notice-shot').classList.toggle('is-expanded',expanded);button.querySelector('small').textContent=expanded?'点击收起':'点击看大图';if(track)track('announcement_image_toggled',{expanded:expanded?1:0});};
      var img=button.querySelector('img');img.onerror=function(){img.hidden=true;button.disabled=true;button.querySelector('small').textContent='图片暂时无法加载';};
    });
  }
  var style=document.createElement('style');style.id='notice-media-style';style.textContent=
    '.notice-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;white-space:normal;margin:16px 0}.notice-shot{margin:0;min-width:0}.notice-shot button{box-sizing:border-box;width:100%;padding:0 0 10px;text-align:left;border:1px solid var(--line,#e5e9f0);border-radius:14px;overflow:hidden;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;cursor:zoom-in}.notice-shot img{display:block;width:100%;height:170px;object-fit:cover;object-position:top;background:#f1f4fa}.notice-shot span,.notice-shot small{display:block;padding:0 11px;overflow-wrap:anywhere}.notice-shot span{font-size:12px;font-weight:700;line-height:1.6;margin-top:9px}.notice-shot small{font-size:10px;color:var(--muted,#687386);line-height:1.6;margin-top:3px}.notice-shot.is-expanded{grid-column:1/-1}.notice-shot.is-expanded img{height:auto;max-height:none;object-fit:contain}.notice-shot.is-expanded button{cursor:zoom-out}.notice-community-inline{white-space:normal;text-align:center;padding:16px;border:1px solid var(--line,#e5e9f0);border-radius:17px;background:var(--accent-soft,#f1f4ff);margin:16px 0}.notice-community-inline h3{font-size:15px;line-height:1.6;margin:0 0 5px}.notice-community-inline p{font-size:12px;line-height:1.7;color:var(--muted,#687386);margin:8px 0}.notice-community-inline .community-qr{box-sizing:border-box;width:200px;max-width:100%;padding:8px;margin:12px auto;border:1px solid #e5e9f0;border-radius:12px;background:#fff;cursor:zoom-in}.notice-community-inline .community-qr img{display:block;width:100%;height:auto}.notice-community-inline .community-qr.is-large{width:100%;cursor:zoom-out}.notice-community-inline .community-button{box-sizing:border-box;display:inline-block;width:100%;padding:11px 14px;border:0;border-radius:11px;background:var(--accent,#5d72e8);color:#fff;font:inherit;font-weight:700;font-size:13px;cursor:pointer}.notice-community-inline button:disabled{opacity:.6;cursor:default}.notice-community-inline button:focus-visible,.notice-shot button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}@media(max-width:360px){.notice-gallery{gap:8px}.notice-shot img{height:140px}.notice-community-inline{padding:12px}}';
  document.head.appendChild(style);
  window.__scoreTrackerNoticeMedia={markup:markup,mount:mount,imagePath:imagePath};
})();
