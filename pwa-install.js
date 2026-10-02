(() => {
  'use strict';
  const KEY = 'st_pwa_install_v1', SESSION = 'st_pwa_offer_v1', WEEK = 7 * 86400000;
  let deferred = null, modal = null, timer, installing = false, offered = false, knownInstalled = false, source = '', previousFocus, previousOverflow;
  const ua = navigator.userAgent || '';
  const platform = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop';
  const standalone = () => navigator.standalone === true || ['standalone', 'fullscreen', 'minimal-ui'].some(mode => window.matchMedia?.('(display-mode: ' + mode + ')').matches);
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; } };
  const save = next => { try { localStorage.setItem(KEY, JSON.stringify({...read(), ...next})); } catch (_) {} };
  const track = (event, meta = {}) => { try { window.__scoreTrackerTrack?.(event, {platform, source, native_available:!!deferred, ...meta}); } catch (_) {} };
  const blocked = () => {
    try { if (state.onboarding) return true; } catch (_) {}
    return document.visibilityState !== 'visible' || !!document.querySelector('.modal-backdrop,.rn-back,.fv36-back,.st-fb-back,.gmodal-backdrop.open');
  };
  function eligible() {
    const s = read();
    try { if (sessionStorage.getItem(SESSION)) return false; } catch (_) {}
    return !offered && !knownInstalled && !standalone() && !s.installed && !s.never && !(s.until > Date.now());
  }
  function schedule(delay = 1500) {
    clearTimeout(timer);
    if (modal || !eligible()) return;
    timer = setTimeout(() => {
      if (!eligible()) return;
      if (blocked() || !document.querySelector('.shell')) { schedule(); return; }
      open('auto');
    }, delay);
  }
  const guides = {
    ios: {label:'iPhone / iPad', browser:'Safari', menu:'共享 ↑', items:['加入阅读列表','添加书签','添加到主屏幕 ＋','在页面上查找'], target:2, steps:['用 Safari 打开成绩追踪。','点“共享”，向下找到“添加到主屏幕”。','如果看到“作为网页 App 打开”，保持开启，再点“添加”。']},
    android: {label:'Android', browser:'Chrome', menu:'⋮', items:['新建标签页','分享…','安装应用 / 添加到主屏幕','设置'], target:2, steps:['用 Chrome 打开成绩追踪。','点右上角“⋮”，选择“安装应用”或“添加到主屏幕”。','按屏幕提示确认安装，以后就能点图标打开。']},
    desktop: {label:'电脑', browser:'Chrome / Edge', menu:'⋯', items:['打印…','投放、保存和分享','将网页安装为应用…','更多工具'], target:2, steps:['用 Chrome 或 Edge 打开成绩追踪。','点地址栏右侧的安装图标，或在浏览器菜单里找“安装应用 / 将网页安装为应用”。','确认安装，以后可以从桌面、Dock 或开始菜单打开。']}
  };
  function renderGuide(selected) {
    const g = guides[selected];
    modal.querySelectorAll('[data-pwa-platform]').forEach(b => { const on = b.dataset.pwaPlatform === selected; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    const inApp = /MicroMessenger|QQ\/|Weibo/i.test(ua);
    const otherIos = selected === 'ios' && platform === 'ios' && (!/Safari/i.test(ua) || /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua));
    modal.querySelector('#pwaGuide').innerHTML = '<div class="pwa-guide-copy">' +
      ((inApp || otherIos) && selected === platform ? '<p class="pwa-browser-note">先用' + g.browser + '打开这个网址，再按下面的步骤添加。<button type="button" id="pwaCopyUrl">复制网址</button></p>' : '') +
      '<ol>' + g.steps.map((step, i) => '<li><b>' + (i + 1) + '</b><span>' + step + '</span></li>').join('') + '</ol></div>' +
      '<div class="pwa-diagram" role="img" aria-label="' + g.browser + '安装菜单示意图"><div class="pwa-browser-bar"><span>' + g.browser + '</span><b>' + g.menu + '</b></div><div class="pwa-browser-menu">' + g.items.map((item, i) => '<div' + (i === g.target ? ' class="highlight"' : '') + '>' + item + '</div>').join('') + '</div><small>按钮名称和位置可能随浏览器版本变化</small></div>';
    const copy = modal.querySelector('#pwaCopyUrl');
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(location.origin + location.pathname); copy.textContent = '已复制'; track('pwa_install_url_copied'); }
      catch (_) { copy.textContent = '请复制地址栏的网址'; }
    };
  }
  function close(reason = 'later', silent = false) {
    if (!modal) return;
    if (!silent) {
      if (reason === 'never') save({never:true});
      else if (reason === 'already') { knownInstalled = true; save({installed:true}); }
      else save({until:Date.now() + WEEK});
      track('pwa_install_prompt_dismissed', {reason});
    }
    modal.remove(); modal = null;
    document.body.style.overflow = previousOverflow;
    document.removeEventListener('keydown', keyboard);
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function keyboard(e) {
    if (e.key === 'Escape' && !installing) { e.preventDefault(); close('close'); }
    if (e.key !== 'Tab' || !modal) return;
    const buttons = [...modal.querySelectorAll('button:not(:disabled)')], first = buttons[0], last = buttons.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  async function install() {
    if (!deferred || installing) return;
    const request = deferred; deferred = null; installing = true;
    const button = modal?.querySelector('#pwaInstall');
    if (button) { button.disabled = true; button.textContent = '正在打开…'; }
    track('pwa_install_clicked', {native_available:true});
    try {
      await request.prompt();
      const choice = await request.userChoice;
      track('pwa_install_result', {outcome:choice.outcome});
      if (choice.outcome === 'accepted') { knownInstalled = true; save({installed:true}); close('accepted', true); }
      else close('native_dismissed');
    } catch (e) {
      track('pwa_install_error', {error:String(e?.message || e).slice(0,120)});
      if (button) { button.hidden = true; modal.querySelector('#pwaStatus').textContent = '没能打开安装窗口，可以按上面的步骤添加。'; }
    } finally { installing = false; }
  }
  function open(from = 'account') {
    if (modal) return;
    if (standalone()) { try { toast('你已经在应用里了'); } catch (_) {} return; }
    if (from === 'auto' && (!eligible() || blocked())) return;
    clearTimeout(timer); source = from; offered = true;
    try { sessionStorage.setItem(SESSION, '1'); } catch (_) {}
    previousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
    modal = document.createElement('div'); modal.className = 'pwa-back';
    modal.innerHTML = '<section class="pwa-modal" role="dialog" aria-modal="true" aria-labelledby="pwaTitle" aria-describedby="pwaIntro">' +
      '<header class="pwa-head"><div class="pwa-app-mark" aria-hidden="true"><img src="./pwa-icon-192.png" alt=""></div><button class="pwa-close" aria-label="关闭安装提示" type="button">×</button><p class="pwa-kicker">成绩追踪，随手打开</p><h2 id="pwaTitle">放到主屏幕，下次更好找</h2><p id="pwaIntro">以后点图标就能记录成绩、看趋势，不用再翻浏览器标签页。</p></header>' +
      '<div class="pwa-body"><div class="pwa-platforms" role="group" aria-label="选择设备">' + Object.entries(guides).map(([key,g]) => '<button type="button" data-pwa-platform="' + key + '">' + g.label + '</button>').join('') + '</div><div class="pwa-guide" id="pwaGuide"></div><p class="pwa-status" id="pwaStatus" role="status"></p></div>' +
      '<footer class="pwa-actions"><button type="button" class="pwa-primary" id="pwaInstall"' + (!deferred ? ' hidden' : '') + '>直接安装</button><button type="button" class="pwa-secondary" id="pwaLater">以后再说</button><div class="pwa-quiet"><button type="button" id="pwaAlready">我已添加</button><button type="button" id="pwaNever">不再提醒</button></div></footer></section>';
    document.body.appendChild(modal); document.body.style.overflow = 'hidden';
    renderGuide(platform);
    modal.querySelector('.pwa-close').onclick = () => { if (!installing) close('close'); };
    modal.onclick = e => { if (e.target === modal && !installing) close('backdrop'); };
    modal.querySelector('#pwaLater').onclick = () => { if (!installing) close('later'); };
    modal.querySelector('#pwaNever').onclick = () => { if (!installing) close('never'); };
    modal.querySelector('#pwaAlready').onclick = () => { if (!installing) close('already'); };
    modal.querySelector('#pwaInstall').onclick = install;
    modal.querySelectorAll('[data-pwa-platform]').forEach(b => { b.onclick = () => { renderGuide(b.dataset.pwaPlatform); track('pwa_install_guide_changed', {guide_platform:b.dataset.pwaPlatform}); }; });
    document.addEventListener('keydown', keyboard); modal.querySelector('.pwa-close').focus();
    track('pwa_install_prompt_shown');
  }
  window.__scoreTrackerPwa = {open, standalone};
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e; knownInstalled = false; save({installed:false});
    track('pwa_install_available');
    const button = modal?.querySelector('#pwaInstall'); if (button) button.hidden = false;
    schedule();
  });
  window.addEventListener('appinstalled', () => { knownInstalled = true; save({installed:true}); deferred = null; clearTimeout(timer); close('installed', true); });
  const display = window.matchMedia?.('(display-mode: standalone)');
  display?.addEventListener?.('change', () => { if (standalone()) { knownInstalled = true; save({installed:true}); close('standalone', true); } });
  document.addEventListener('visibilitychange', () => { if (standalone()) { knownInstalled = true; save({installed:true}); close('standalone', true); } else schedule(); });
  document.addEventListener('click', () => schedule(3000), true);
  function ready() {
    if (standalone()) { knownInstalled = true; save({installed:true}); }
    if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(e => track('pwa_service_worker_error', {error:String(e?.message || e).slice(0,120)}));
    schedule(8000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true}); else ready();
  const accountBefore = typeof accountHtml === 'function' ? accountHtml : null;
  if (accountBefore) accountHtml = function () {
    return accountBefore.apply(this, arguments) + '<div class="card pwa-account"><div><h3 class="card-title">' + (standalone() ? '已从主屏幕打开' : '添加到主屏幕') + '</h3><p class="card-sub">点图标就能打开成绩追踪。</p></div>' + (!standalone() ? '<button type="button" class="secondary" data-pwa-open>看看怎么添加</button>' : '') + '</div>';
  };
  document.addEventListener('click', e => { if (e.target.closest?.('[data-pwa-open]')) open('account'); });
})();
