/* Optional, voluntary appreciation. No payment confirmation or paid entitlements. */
(() => {
  'use strict';
  const CONFIG_URL = '/api/score-tracker-notices';
  const COPY_FIELDS = ['title','intro','thanks','entry_label','footer_label','home_kicker','home_title','home_description','home_link_label','qr_label','save_label','phone_help','desktop_help','note'];
  const INTERVAL = 8000;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 620px)');
  const heart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="2.5" height="10" rx=".7"/><rect x="9.5" y="3" width="2.5" height="10" rx=".7"/></svg>';
  const playIcon = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m5 3 8 5-8 5Z"/></svg>';
  let available = false, qrImage = '', copy = {}, loading = null, modal = null, carousel = null, lastLoad = 0;
  let stopped = false, slideIndex = 0, previousPage = '', account = '';
  const originalPlanner = typeof studyPlannerCardV18 === 'function' ? studyPlannerCardV18 : null;
  const track = (event, metadata = {}) => {
    try { window.__scoreTrackerTrack?.(event, metadata); } catch (_) {}
  };
  const signedIn = () => typeof state !== 'undefined' && !!state.user && !!state.token;
  const blocked = () => document.visibilityState !== 'visible' || !!document.querySelector('.modal-backdrop,.rn-back,.pwa-back,.school-back,.fv36-back,.st-fb-back,.gmodal-backdrop.open');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = key => esc(copy[key] || '');

  function injectStyles() {
    if (document.getElementById('author-support-style')) return;
    const style = document.createElement('style'); style.id = 'author-support-style';
    style.textContent = `
      .support-entry{width:100%;display:flex;align-items:center;gap:11px;border:0;border-top:1px solid var(--line);padding:15px 0 0;margin-top:17px;background:transparent;color:var(--text);text-align:left;font:inherit;font-size:13px;cursor:pointer}
      .support-entry svg{width:19px;height:19px;color:var(--accent);flex:none}.support-entry .support-entry-arrow{margin-left:auto;color:var(--muted);font-size:20px;font-weight:400}
      .support-footer{display:block;margin:0 auto 8px;padding:9px 12px;border:0;background:transparent;color:var(--muted);font:inherit;font-size:11px;cursor:pointer}
      .support-entry:focus-visible,.support-footer:focus-visible,.support-carousel button:focus-visible,.support-carousel a:focus-visible,.support-panel button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      .support-carousel{margin-bottom:18px;min-width:0;touch-action:pan-y}.support-slides{display:grid;min-width:0}.support-slide{grid-area:1/1;min-width:0;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease}.support-slide.active{opacity:1;visibility:visible;pointer-events:auto}
      .support-carousel .study-tool-v18{height:100%;margin:0;background:linear-gradient(135deg,var(--panel-solid),var(--cell,var(--accent-soft)));border-color:var(--line);color:var(--text)}
      .support-carousel .study-tool-v18:hover{transform:none;border-color:var(--accent);box-shadow:none}.support-carousel .study-tool-kicker-v18,.support-carousel .study-tool-open-v18{color:var(--muted)}
      .support-promo{width:100%;font:inherit;text-align:left;cursor:pointer}.support-promo-art{display:grid;place-items:center;border-radius:14px;background:var(--accent-soft);color:var(--accent);min-height:116px}.support-promo-art svg{width:43px;height:43px}
      .support-carousel-controls{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:5px;position:relative;min-height:30px}.support-carousel-dots{display:flex;gap:0}.support-carousel-dots button{display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;background:transparent;cursor:pointer;border-radius:8px}.support-carousel-dots i{width:5px;height:5px;border-radius:9px;background:var(--muted);opacity:.35;transition:width .18s ease}.support-carousel-dots [aria-pressed="true"] i{width:15px;background:var(--accent);opacity:1}
      .support-carousel-pause{position:absolute;right:0;display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:8px;color:var(--muted);background:transparent;cursor:pointer}.support-carousel-pause svg{width:13px;height:13px}
      .support-back.modal-backdrop{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:20px;background:rgba(20,27,39,.38);backdrop-filter:blur(6px);animation:support-fade .18s ease-out}
      .support-panel{width:min(420px,100%);max-height:90vh;max-height:90dvh;overflow:auto;overscroll-behavior:contain;padding:22px 24px 21px;border-radius:22px;border:1px solid var(--line);background:var(--panel-solid);color:var(--text);box-shadow:0 24px 70px rgba(20,27,39,.2);animation:support-enter .18s ease-out}
      .support-drag{display:none}.support-head{display:flex;align-items:center;gap:10px;margin-bottom:15px}.support-head>svg{width:21px;height:21px;color:var(--accent)}.support-head h2{margin:0;font-size:18px;font-weight:750}.support-close{margin-left:auto;width:36px;height:36px;border:0;border-radius:11px;background:var(--cell,var(--accent-soft));color:var(--muted);font-size:23px;cursor:pointer}
      .support-intro{margin:0;color:var(--text);font-size:13px;line-height:1.85}.support-thanks{margin:9px 0 19px;font-size:12px;line-height:1.75;color:var(--muted)}.support-qr{margin:0 auto;width:min(224px,100%);padding:12px;border:1px solid #e8ebf0;background:#fff;border-radius:16px;line-height:0}.support-qr img{display:block;width:100%;max-height:260px;height:auto;object-fit:contain}
      .support-qr-label{text-align:center;margin:12px 0 5px;font-size:12px;font-weight:650}.support-help{text-align:center;font-size:11px;line-height:1.7;color:var(--muted);margin:0 0 16px}.support-save{display:block;width:100%;border:0;border-radius:12px;padding:12px 14px;background:var(--accent);color:var(--on-surface,#fff);font:inherit;font-size:13px;font-weight:650;cursor:pointer}
      .support-status:empty{display:none}.support-status{margin:10px 0 0;text-align:center;font-size:11px;line-height:1.7;color:var(--muted)}.support-note{margin:14px 0 0;text-align:center;font-size:11px;line-height:1.7;color:var(--muted)}.support-qr-error{font-size:12px;line-height:1.75;color:#788392;text-align:center;padding:28px 5px}
      .support-intro,.support-thanks,.support-help,.support-note{white-space:pre-line;overflow-wrap:anywhere}.support-carousel h3,.support-carousel p{overflow-wrap:anywhere}
      @keyframes support-fade{from{opacity:0}to{opacity:1}}@keyframes support-enter{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
      @media(max-width:620px){.support-carousel{margin-bottom:14px}.support-promo-art{min-height:104px;border-radius:12px}.support-promo-art svg{width:32px;height:32px}.support-back.modal-backdrop{padding:0;align-items:end}.support-panel{width:100%;max-height:92vh;max-height:92dvh;border-radius:23px 23px 0 0;padding:0 22px calc(20px + env(safe-area-inset-bottom))}.support-drag{display:grid;place-items:center;height:24px;touch-action:none}.support-drag::after{content:"";width:34px;height:4px;border-radius:4px;background:var(--muted);opacity:.3}.support-head{margin-bottom:12px}.support-intro{font-size:13px}.support-thanks{margin-bottom:16px}.support-qr{width:214px}.support-note{margin-top:12px}}
      @media(max-width:760px){body.has-author-support #app-version-v17{padding-bottom:calc(90px + env(safe-area-inset-bottom))}}
      @media(prefers-reduced-motion:reduce){.support-back.modal-backdrop,.support-panel{animation:none}.support-slide,.support-carousel-dots i{transition:none}.support-carousel .study-tool-v18{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function carouselHtml() {
    const planner = originalPlanner();
    return '<section class="support-carousel" role="region" aria-roledescription="轮播" aria-label="学习工具与支持作者"><div class="support-slides">' +
      '<div class="support-slide active" data-support-slide="0" role="group" aria-roledescription="卡片" aria-label="第 1 张，共 2 张：Study Planner">' + planner + '</div>' +
      '<div class="support-slide" data-support-slide="1" role="group" aria-roledescription="卡片" aria-label="第 2 张，共 2 张：' + text('entry_label') + '" aria-hidden="true" inert><button type="button" class="study-tool-v18 support-promo" data-support-open="home" tabindex="-1"><div class="study-tool-copy-v18"><span class="study-tool-kicker-v18">' + text('home_kicker') + '</span><h3>' + text('home_title') + '</h3><p>' + text('home_description') + '</p><span class="study-tool-open-v18">' + text('home_link_label') + '</span></div><div class="support-promo-art">' + heart + '</div></button></div></div>' +
      '<div class="support-carousel-controls"><div class="support-carousel-dots" role="group" aria-label="切换卡片"><button type="button" data-support-dot="0" aria-label="显示 Study Planner" aria-pressed="true"><i></i></button><button type="button" data-support-dot="1" aria-label="显示支持作者" aria-pressed="false"><i></i></button></div><button type="button" class="support-carousel-pause" data-support-pause aria-label="暂停自动轮播" title="暂停自动轮播">' + pauseIcon + '</button></div></section>';
  }
  if (originalPlanner) {
    studyPlannerCardV18 = function () { return available ? carouselHtml() : originalPlanner(); };
  }

  function mountCarousel(root) {
    if (carousel?.root === root) return;
    carousel?.dispose(); carousel = null;
    if (!root) return;
    let timer = null, hovered = false, inView = false, pointer = null, suppressClickUntil = 0;
    const slides = [...root.querySelectorAll('[data-support-slide]')];
    const dots = [...root.querySelectorAll('[data-support-dot]')];
    const pause = root.querySelector('[data-support-pause]');
    const controller = new AbortController(), options = {signal:controller.signal};
    const stopTimer = () => { clearTimeout(timer); timer = null; };
    const canPlay = () => !stopped && !reducedMotion.matches && inView && !hovered && !pointer && root.isConnected && !blocked() && !root.contains(document.activeElement);
    function updatePause() {
      const playing = !stopped && !reducedMotion.matches;
      pause.innerHTML = playing ? pauseIcon : playIcon;
      pause.setAttribute('aria-label', reducedMotion.matches ? '已按减少动态效果设置关闭自动轮播' : playing ? '暂停自动轮播' : '继续自动轮播');
      pause.title = pause.getAttribute('aria-label'); pause.disabled = reducedMotion.matches;
    }
    function schedule() {
      stopTimer(); updatePause();
      if (!canPlay()) return;
      timer = setTimeout(() => { if (canPlay()) select((slideIndex + 1) % slides.length, false); else schedule(); }, INTERVAL);
    }
    function select(index, manual) {
      const focusedSlide = slides.find(slide => slide.contains(document.activeElement));
      if (manual) { stopped = true; track('support_carousel_changed', {slide:index, source:'manual'}); }
      slideIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
        slide.toggleAttribute('inert', i !== index);
        slide.querySelectorAll('a,button').forEach(el => { el.tabIndex = i === index ? 0 : -1; });
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
      if (manual && focusedSlide && focusedSlide !== slides[index]) slides[index].querySelector('a,button')?.focus({preventScroll:true});
      schedule();
    }
    dots.forEach(dot => dot.addEventListener('click', () => select(Number(dot.dataset.supportDot), true), options));
    pause.addEventListener('click', () => { stopped = !stopped; track('support_carousel_playback_changed', {paused:stopped}); schedule(); }, options);
    root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; schedule(); } }, options);
    root.addEventListener('pointerleave', () => { hovered = false; schedule(); }, options);
    root.addEventListener('focusin', schedule, options);
    root.addEventListener('focusout', () => queueMicrotask(schedule), options);
    root.addEventListener('pointerdown', event => { pointer = {x:event.clientX, y:event.clientY, id:event.pointerId}; stopTimer(); }, options);
    root.addEventListener('pointerup', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        suppressClickUntil = Date.now() + 350;
        select((slideIndex + (dx < 0 ? 1 : slides.length - 1)) % slides.length, true);
      } else schedule();
    }, options);
    root.addEventListener('pointercancel', () => { pointer = null; schedule(); }, options);
    window.addEventListener('pointerup', () => queueMicrotask(() => { pointer = null; schedule(); }), options);
    window.addEventListener('pointercancel', () => { pointer = null; schedule(); }, options);
    root.addEventListener('click', event => {
      if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, {capture:true, signal:controller.signal});
    root.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); select((slideIndex + (event.key === 'ArrowRight' ? 1 : slides.length - 1)) % slides.length, true);
    }, options);
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting); schedule();
    }) : null;
    if (observer) observer.observe(root);
    else { const rect = root.getBoundingClientRect(); inView = rect.bottom > 0 && rect.top < innerHeight; }
    carousel = {root, schedule, dispose() { stopTimer(); controller.abort(); observer?.disconnect(); }};
    select(slideIndex, false);
  }

  function refresh() {
    const userId = signedIn() ? String(state.user.id) : '';
    if (userId !== account && modal) close('account_changed');
    account = userId;
    const page = userId ? state.page : '';
    if (page !== previousPage) { stopped = false; slideIndex = 0; previousPage = page; }
    const footer = document.getElementById('app-version-v17');
    let footerEntry = document.getElementById('authorSupportFooter');
    if (available && userId && footer && !footerEntry) {
      footerEntry = document.createElement('button'); footerEntry.type = 'button';
      footerEntry.id = 'authorSupportFooter'; footerEntry.className = 'support-footer';
      footerEntry.dataset.supportOpen = 'footer'; footer.before(footerEntry);
    } else if (!available || !userId) footerEntry?.remove();
    if (available && footerEntry) footerEntry.textContent = copy.footer_label;
    document.body.classList.toggle('has-author-support', !!(available && userId && footerEntry));
    const firstCard = page === 'account' ? document.querySelector('.account-grid > .account-card') : null;
    if (available && firstCard && !firstCard.querySelector('.support-entry')) {
      firstCard.insertAdjacentHTML('beforeend', '<button class="support-entry" type="button" data-support-open="account">' + heart + '<span data-support-entry-label></span><span class="support-entry-arrow" aria-hidden="true">›</span></button>');
    }
    if (available && firstCard) firstCard.querySelector('[data-support-entry-label]').textContent = copy.entry_label;
    if (!available) document.querySelectorAll('.support-entry').forEach(el => el.remove());
    const oldPlanner = document.getElementById('studyPlannerToolV18');
    if (available && page === 'home' && oldPlanner && !oldPlanner.closest('.support-carousel')) {
      const shell = document.createElement('div'); shell.innerHTML = carouselHtml();
      oldPlanner.replaceWith(shell.firstElementChild);
      document.getElementById('studyPlannerToolV18')?.addEventListener('click', trackStudyPlannerV18, {capture:true});
    }
    let root = document.querySelector('.support-carousel');
    if ((!available || !userId) && root) {
      carousel?.dispose(); carousel = null;
      if (userId && originalPlanner) { root.outerHTML = originalPlanner(); document.getElementById('studyPlannerToolV18')?.addEventListener('click', trackStudyPlannerV18, {capture:true}); }
      else root.remove();
      root = null;
    }
    mountCarousel(root);
    window.__releaseNotices?.refreshSupport?.();
  }

  function close(reason = 'close_button') {
    if (!modal) return;
    const old = modal; modal = null;
    old.controller.abort(); old.back.remove();
    old.background.forEach(([node, wasInert]) => { if (node.isConnected && !wasInert) node.removeAttribute('inert'); });
    document.body.style.overflow = old.overflow;
    if (old.focus?.isConnected) old.focus.focus({preventScroll:true});
    track('support_panel_closed', {source:old.source, reason}); carousel?.schedule();
  }
  function open(source = 'account') {
    if (!available || !signedIn() || modal || blocked() || state.onboarding) return false;
    const back = document.createElement('div'); back.className = 'support-back modal-backdrop';
    const phone = mobile.matches;
    back.innerHTML = '<section class="support-panel" role="dialog" aria-modal="true" aria-labelledby="supportTitle" aria-describedby="supportIntro supportNote"><div class="support-drag" aria-hidden="true"></div><header class="support-head">' + heart + '<h2 id="supportTitle">' + text('title') + '</h2><button class="support-close" type="button" aria-label="关闭赞赏面板">×</button></header><p class="support-intro" id="supportIntro">' + text('intro') + '</p><p class="support-thanks">' + text('thanks') + '</p><div class="support-qr"><img src="' + esc(qrImage) + '" alt="作者的微信赞赏码"></div><p class="support-qr-label">' + text('qr_label') + '</p><p class="support-help">' + text(phone ? 'phone_help' : 'desktop_help') + '</p><button type="button" class="support-save">' + text('save_label') + '</button><p class="support-status" role="status"></p><p class="support-note" id="supportNote">' + text('note') + '</p></section>';
    const controller = new AbortController(), options = {signal:controller.signal};
    modal = {back, controller, source, focus:document.activeElement, overflow:document.body.style.overflow, background:[]};
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    back.querySelector('.support-close').focus();
    [...document.body.children].filter(node => node !== back && !/^(SCRIPT|STYLE)$/.test(node.tagName)).forEach(node => {
      modal.background.push([node, node.hasAttribute('inert')]); node.setAttribute('inert', '');
    });
    back.querySelector('.support-close').addEventListener('click', () => close(), options);
    back.addEventListener('click', event => { if (event.target === back) close('backdrop'); }, options);
    back.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close('escape'); return; }
      if (event.key !== 'Tab') return;
      const buttons = [...back.querySelectorAll('button:not(:disabled)')], first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }, options);
    const handle = back.querySelector('.support-drag'); let drag = null;
    handle.addEventListener('pointerdown', event => { drag = {x:event.clientX, y:event.clientY}; handle.setPointerCapture?.(event.pointerId); }, options);
    handle.addEventListener('pointerup', event => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y; drag = null;
      if (mobile.matches && dy > 65 && dy > Math.abs(dx) * 1.3) close('swipe');
    }, options);
    handle.addEventListener('pointercancel', () => { drag = null; }, options);
    back.querySelector('.support-save').addEventListener('click', () => {
      const link = document.createElement('a'); link.href = qrImage;
      const format = qrImage.startsWith('data:') ? /^data:image\/(png|jpeg|webp)/.exec(qrImage)[1] : new URL(qrImage).pathname.split('.').pop().toLowerCase();
      link.download = '成绩轨迹-赞赏码.' + (format === 'jpeg' ? 'jpg' : format);
      document.body.appendChild(link); link.click(); link.remove();
      back.querySelector('.support-status').textContent = '已发起图片下载。如果没有保存，可长按图片保存。';
      track('support_qr_download_requested', {source});
    }, options);
    back.querySelector('.support-qr img').addEventListener('error', () => {
      back.querySelector('.support-qr').innerHTML = '<div class="support-qr-error">赞赏码暂时加载不出来，请稍后再试。</div>';
      back.querySelector('.support-save').disabled = true; available = false; refresh();
      track('support_qr_unavailable', {source});
    }, options);
    track('support_panel_opened', {source}); carousel?.schedule(); return true;
  }

  function preload(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => { image.onload = image.onerror = null; reject(new Error('image timeout')); }, 5000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('image unavailable')); };
      image.src = url;
    });
  }
  function loadConfig() {
    if (loading) return loading;
    loading = (async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
      try {
        lastLoad = Date.now();
        const response = await fetch(CONFIG_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'support_public'}), cache:'no-store', signal:controller.signal});
        if (!response.ok) return;
        const config = (await response.json()).config;
        if (config?.enabled !== true) { available = false; close('disabled'); refresh(); return; }
        if (typeof config.qr_image !== 'string' || !config.qr_image.trim() || COPY_FIELDS.some(key => typeof config[key] !== 'string' || !config[key].trim())) return;
        const raw = config.qr_image.trim(), embedded = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw);
        const url = new URL(raw, location.href);
        // Keep the real QR asset on this site; never send visitors to a third-party image tracker.
        if (!embedded && (url.origin !== location.origin || !/\.(png|jpe?g|webp)$/i.test(url.pathname))) return;
        if (url.href !== qrImage || !available) await preload(url.href);
        const changed = JSON.stringify(copy) !== JSON.stringify(config);
        if (modal && url.href !== qrImage) close('qr_changed');
        qrImage = url.href; copy = config; available = true;
        if (changed && carousel) {
          const root = carousel.root; carousel.dispose(); carousel = null; root.outerHTML = carouselHtml();
          document.getElementById('studyPlannerToolV18')?.addEventListener('click', trackStudyPlannerV18, {capture:true});
        }
        injectStyles(); refresh();
      } catch (_) { /* Appreciation must never block the core app. */ }
      finally { clearTimeout(timer); loading = null; }
    })();
    return loading;
  }

  document.addEventListener('click', event => {
    const entry = event.target.closest?.('[data-support-open]');
    if (entry) open(entry.dataset.supportOpen);
  });
  document.addEventListener('visibilitychange', () => { carousel?.schedule(); if (document.visibilityState === 'visible' && Date.now() - lastLoad > 60000) loadConfig(); });
  setInterval(() => { if (document.visibilityState === 'visible') loadConfig(); }, 30 * 60 * 1000);
  reducedMotion.addEventListener?.('change', () => carousel?.schedule());
  window.addEventListener('online', () => { if (!available) loadConfig(); });
  const previousBind = typeof bindPage === 'function' ? bindPage : null;
  if (previousBind) bindPage = function () { const result = previousBind.apply(this, arguments); refresh(); return result; };
  const previousRender = typeof render === 'function' ? render : null;
  if (previousRender) render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  const previousLogin = typeof renderLogin === 'function' ? renderLogin : null;
  if (previousLogin) renderLogin = function () { const result = previousLogin.apply(this, arguments); refresh(); return result; };
  // Existing dialogs are direct children of body. Resume when one closes, without observing charts.
  new MutationObserver(() => carousel?.schedule()).observe(document.body, {childList:true});
  window.__scoreTrackerSupport = {open, available:() => available};
  refresh(); loadConfig();
})();
