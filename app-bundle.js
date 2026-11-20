Warning: truncated output (original token count: 373984)
... 447359 bytes omitted ...

/*! app-bundle.js · 自动生成,勿手改 —— 改源码后运行: node design/build-bundles.js
   来源顺序: public-assets.js, compat.js, request-budget-v24.js, telemetry-feedback.js, feedback-statuses.js, app-v3.js, app-v4.js, app-v5.js, app-v6.js, app-v7.js, app-v8.js, app-v9.js, app-v10.js, app-v11.js, feedback-unread-dot.js, app-v12.js, app-v13.js, app-v14.js, app-v15.js, app-v16.js, app-v17.js, app-v18.js, app-v19.js, app-v20.js, app-v21.js, app-v22.js, app-v23.js, app-v24.js, app-v25.js, app-v26.js, app-v27.js, app-v28.js, app-v29.js, app-v30.js, app-v31.js, app-v32.js, app-v33.js, app-v34.js, app-v35.js, score-worth-model.js, score-worth.js, release-notices.js, account-recovery.js, trajectory-forecast.js, similar-trajectories.js, school-settings.js, announcement-settings.js, announcement-replies.js, author-support.js, community.js, participant-defaults.js, exam-averages.js, supabase/functions/_shared/question-types.js, question-type-scores.js, question-type-analysis-model.js, question-type-analysis.js, exam-changes.js, exam-reflection.js, entry-rollout.js, paper-review-support.js, paper-scan-views.js, paper-review.js, paper-review-board.js, paper-review-scans.js, paper-review-hub.js, paper-records.js, exam-detail.js, supabase/functions/_shared/backup-format.js, backup-import.js, account-growth.js */
/* ===== public-assets.js ===== */
/* Public artwork only. Private uploads and application requests never use this host. */
(function () {
  'use strict';
  var HOST = 'https://assets.tantantan.tech';
  var FILES = {"/assets/announcements/beta-appearance.svg":{"remote":"/v1/6d9533821e7edbee/beta-appearance.svg","sha256":"6d9533821e7edbee96131b0b1c3b01fffe7d015bde484ca3beb41aab9bc610aa","bytes":107752},"/assets/announcements/beta-paper-review.svg":{"remote":"/v1/142515b99068c618/beta-paper-review.svg","sha256":"142515b99068c618998f74e159bc6917494178949269a2d20d6fa6d52acbd9dd","bytes":94188},"/assets/announcements/beta-question-entry.svg":{"remote":"/v1/0b08e0a3b9ef2892/beta-question-entry.svg","sha256":"0b08e0a3b9ef2892ae842c021bd5d69a103075dc41bcec302264f09a493d1f2d","bytes":62144},"/assets/announcements/beta-question-analysis.svg":{"remote":"/v1/7919a14a4f85f14c/beta-question-analysis.svg","sha256":"7919a14a4f85f14ce552ecb43ad4bfca5a2fc6554e02ba94e7d423625224f6e6","bytes":114256},"/study-planner-promo.webp":{"remote":"/v1/c09ce61ea3a7d657/study-planner-promo.webp","sha256":"c09ce61ea3a7d65747f8842bf4ae3d6356896255aa972e6f460604cf255f182a","bytes":4792},"/community-qr-20261024.jpg":{"remote":"/v1/0c59b644f7faa666/community-qr-20261024.jpg","sha256":"0c59b644f7faa66655b9696d54d584c1de456dc118ae60c0df5974bbe5a1a8c6","bytes":268370},"/pwa-icon-192.png":{"remote":"/v1/1b9292f5b4e0b254/pwa-icon-192.png","sha256":"1b9292f5b4e0b2541f12d6783d6ba2bea2fa7694bbe39b517848e3a0f572c315","bytes":974},"/pwa-icon-512.png":{"remote":"/v1/612a7cedd99d598b/pwa-icon-512.png","sha256":"612a7cedd99d598b28349388677c6ca7e8015366ca4949bb8b6feba2efa4d83e","bytes":2974},"/assets/community/community-qr-662a653885569ef4.jpg":{"remote":"/v1/662a653885569ef4/community-qr-662a653885569ef4.jpg","sha256":"662a653885569ef4087170b58a6f98dc18885c5387f7ca18f1c79b09aa1f3f85","bytes":296379},"/assets/community/support-qr-8f3b6b302c8e6cf8.jpg":{"remote":"/v1/8f3b6b302c8e6cf8/support-qr-8f3b6b302c8e6cf8.jpg","sha256":"8f3b6b302c8e6cf87b0a7cf77334abe19821600f00e7885092b7edf25252cdd2","bytes":103619}};
  var timers = new WeakMap();
  function local(value) {
    try {
      var url = new URL(value, location.href);
      return url.origin === location.origin && !url.search && !url.hash && Object.prototype.hasOwnProperty.call(FILES, url.pathname) ? url.pathname : '';
    } catch (_) { return ''; }
  }
  function url(value) { var key = local(value); return key ? HOST + FILES[key].remote : value; }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function attributes(value) {
    var key = local(value);
    return key ? 'src="' + escape(url(key)) + '" data-st-asset-local="' + escape(key) + '" crossorigin="anonymous" referrerpolicy="no-referrer"' : 'src="' + escape(value) + '"';
  }
  function clear(image) { clearTimeout(timers.get(image)); timers.delete(image); }
  function fallback(image) {
    var key = image.getAttribute('data-st-asset-local');
    if (!FILES[key] || image.getAttribute('data-st-asset-retried') || image.getAttribute('src') !== url(key)) return false;
    clear(image);
    image.setAttribute('data-st-asset-retried', '1');
    image.removeAttribute('crossorigin');
    image.src = key;
    return true;
  }
  // Capture before a feature's error handler so it sees an error only if both sources fail.
  window.addEventListener('error', function (event) {
    var image = event.target;
    if (image && image.tagName === 'IMG' && fallback(image)) event.stopImmediatePropagation();
  }, true);
  window.addEventListener('load', function (event) { if (event.target && event.target.tagName === 'IMG') clear(event.target); }, true);
  function watch(root) {
    var images = root.querySelectorAll ? Array.from(root.querySelectorAll('img[data-st-asset-local]')) : [];
    if (root.matches && root.matches('img[data-st-asset-local]')) images.push(root);
    images.forEach(function (image) {
      if (timers.has(image) || image.hasAttribute('data-st-asset-retried') || image.complete && image.naturalWidth) return;
      // Lazy gallery shots should retain native lazy loading; use their error fallback.
      if (image.loading === 'lazy') return;
      timers.set(image, setTimeout(function () { clear(image); if (image.isConnected && !image.naturalWidth) fallback(image); }, 4000));
    });
  }
  new MutationObserver(function (records) { records.forEach(function (record) { record.addedNodes.forEach(watch); }); }).observe(document.documentElement, {childList:true, subtree:true});
  watch(document);
  function clickDownload(href, filename) {
    var link = document.createElement('a'); link.href = href; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
  }
  async function fetchImage(target, external) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 5000);
    try {
      var response = await fetch(target, {credentials:external ? 'omit' : 'same-origin', mode:external ? 'cors' : 'same-origin', referrerPolicy:'no-referrer', signal:controller.signal});
      if (!response.ok || !/^image\/(?:png|jpeg|webp)(?:;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('image unavailable');
      var blob = await response.blob();
      if (!blob.size || blob.size > 500000) throw new Error('invalid image size');
      return blob;
    } finally { clearTimeout(timer); }
  }
  async function save(value, filename) {
    var key = local(value);
    if (!key) { clickDownload(value, filename); return; }
    var blob;
    try { blob = await fetchImage(url(key), true); } catch (_) { blob = await fetchImage(key, false); }
    var objectUrl = URL.createObjectURL(blob);
    clickDownload(objectUrl, filename);
    setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
  }
  window.__scoreTrackerAssets = {url:url, attributes:attributes, save:save};
})();

/* ===== compat.js ===== */
// Compatibility helpers for older iOS Safari/WebViews.
// Keep this file tiny and load it before the application scripts.
// Keep the repaired main bundle on a fresh cache key after recovery.
(function () {
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      value: function (index) {
        var len = this.length >>> 0;
        var n = Number(index) || 0;
        n = n < 0 ? Math.ceil(n) : Math.floor(n);
        if (n < 0) n += len;
        if (n < 0 || n >= len) return undefined;
        return this[n];
      },
      writable: true,
      configurable: true
    });
  }

  // Registration must never create an account and then lose the one-time
  // credentials because a later page-rendering error happened.
  window.addEventListener('DOMContentLoaded', function () {
    if (typeof startRegister !== 'function' || typeof api !== 'function') return;

    window.startRegister = async function startRegisterCompat() {
      var app = document.querySelector('#app');
      if (app) app.innerHTML = '<div class="splash"><div class="brand-mark">↗</div><div>正在创建你的专属账号</div><small>只需要几秒钟</small></div>';

      try {
        var data = await api('register');
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('st_token', data.token);
        localStorage.setItem('st_known_user', '1');

        var modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = '<div class="modal onboard"><div class="big-icon">✓</div><h2>账号已经准备好了</h2><p>请先保存账号，再进入成绩页面。</p>' +
          '<div class="credential"><small>用户名</small><div class="credential-row"><code>' + escapeHtml(data.user.username) + '</code><button class="copy-btn" data-copy="' + escapeHtml(data.user.username) + '">复制</button></div></div>' +
          '<div class="credential"><small>密码</small><div class="credential-row"><code>' + escapeHtml(data.password) + '</code><button class="copy-btn" data-copy="' + escapeHtml(data.password) + '">复制</button></div></div>' +
          '<div class="save-warning"><span class="i">i</span><div><b>请现在截图保存。</b><br>密码只展示这一次。</div></div>' +
          '<button class="primary full" id="compatSavedBtn">我已截图保存，继续</button></div>';
        document.body.appendChild(modal);

        var copyButtons = modal.querySelectorAll('[data-copy]');
        for (var i = 0; i < copyButtons.length; i += 1) {
          copyButtons[i].onclick = async function () {
            try {
              await navigator.clipboard.writeText(this.getAttribute('data-copy'));
              if (typeof toast === 'function') toast('已复制');
            } catch (e) {}
          };
        }

        document.querySelector('#compatSavedBtn').onclick = async function () {
          try {
            await loadExams();
            modal.remove();
            state.page = 'home';
            render();
          } catch (e) {
            modal.remove();
            renderLogin('账号已创建并已登录，但页面加载失败，请刷新后重试。');
          }
        };
      } catch (e) {
        renderLogin(e && e.message ? e.message : '注册失败，请重试');
      }
    };
  });
})();

/* ===== request-budget-v24.js ===== */
// v24: small client request budget. Loaded before telemetry so background polling can be coalesced.
(function(){
  var API='/api/score-tracker-api';
  /* 版本唯一来源:index.html 的 <meta name="application-version">。
     此前这里硬编码 'v2.4',把 telemetry 读到的真实版本在发送前覆盖掉了。 */
  function currentVersion(){
    var m=document.querySelector('meta[name="application-version"]');
    return (m&&m.getAttribute('content'))||'unknown';
  }
  var nativeFetch=window.fetch.bind(window);
  var lastHeartbeatAt=0;
  var unreadCache=null;
  var unreadCacheAt=0;
  var HEARTBEAT_MIN_MS=10*60*1000;
  var UNREAD_CACHE_MS=5*60*1000;

  function syntheticJson(data,status){
    return new Response(JSON.stringify(data),{status:status||200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  window.fetch=async function requestBudgetFetch(input,init){
    var target=typeof input==='string'?input:(input&&input.url)||'';
    try{var endpoint=new URL(target,location.href);if(endpoint.origin!==location.origin||endpoint.pathname!==API)return nativeFetch(input,init);}catch(e){return nativeFetch(input,init);}
    if(!init||!init.body)return nativeFetch(input,init);
    var body=null;
    try{body=JSON.parse(String(init.body));}catch(e){return nativeFetch(input,init);}

    // Keep version metadata current without making the feedback/telemetry bundle itself a deployment dependency.
    if(body&&body.context&&typeof body.context==='object')body.context.appVersion=currentVersion();

    if(body?.action==='track_event'&&body?.eventType==='heartbeat'){
      var now=Date.now();
      if(now-lastHeartbeatAt<HEARTBEAT_MIN_MS)return syntheticJson({ok:true,coalesced:true});
      lastHeartbeatAt=now;
    }

    // The unread badge polls every minute in the legacy bundle. Reuse the last successful response for
    // five minutes while the feedback drawer is closed; opening the drawer always forces a fresh read.
    if(body?.action==='feedback_list'&&!document.querySelector('.st-fb-back')){
      var now=Date.now();
      if(unreadCache&&now-unreadCacheAt<UNREAD_CACHE_MS)return syntheticJson(unreadCache);
      var response=await nativeFetch(input,Object.assign({},init,{body:JSON.stringify(body)}));
      if(response.ok){
        try{unreadCache=await response.clone().json();unreadCacheAt=now;}catch(e){}
      }
      return response;
    }

    return nativeFetch(input,Object.assign({},init,{body:JSON.stringify(body)}));
  };
})();
/* ===== telemetry-feedback.js ===== */
(() => {
  'use strict';
  const API = '/api/score-tracker-api';
  const appVersion = () => window.__releaseNotices?.currentVersion?.() || (document.querySelector('meta[name="application-version"]') || {}).content || 'unknown';
  const nativeFetch = window.fetch.bind(window);
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uuid = () => crypto.randomUUID();
  const visitorId = localStorage.getItem('st_visitor_id') || uuid();
  const sessionId = sessionStorage.getItem('st_session_id') || uuid();
  const guestAccessToken = localStorage.getItem('st_feedback_guest') || `${uuid()}${uuid()}`;
  const firstReferrer = localStorage.getItem('st_first_referrer') ?? document.referrer;
  const url = new URL(location.href);
  const utmSource = localStorage.getItem('st_utm_source') || url.searchParams.get('utm_source') || '';
  const utmCampaign = localStorage.getItem('st_utm_campaign') || url.searchParams.get('utm_campaign') || '';
  localStorage.setItem('st_visitor_id', visitorId);
  sessionStorage.setItem('st_session_id', sessionId);
  localStorage.setItem('st_feedback_guest', guestAccessToken);
  if (!localStorage.getItem('st_first_seen_at')) localStorage.setItem('st_first_seen_at', new Date().toISOString());
  if (!localStorage.getItem('st_first_referrer')) localStorage.setItem('st_first_referrer', firstReferrer || '');
  if (utmSource) localStorage.setItem('st_utm_source', utmSource);
  if (utmCampaign) localStorage.setItem('st_utm_campaign', utmCampaign);

  const currentPage = () => {
    const active = $('[data-page].active');
    if (active?.dataset.page) return active.dataset.page;
    if ($('.auth-page')) return 'login';
    return 'unknown';
  };
  const context = () => ({
    eventId: uuid(), sessionId, visitorId, clientTime: new Date().toISOString(), pathname: location.pathname,
    appPage: currentPage(), referrerOrigin: document.referrer || '', firstReferrer, utmSource, utmCampaign,
    userAgent: navigator.userAgent, browserLanguage: navigator.language, clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: screen.width, screenHeight: screen.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
    isPwa: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true, appVersion: appVersion(),
  });
  async function call(action, payload = {}) {
    const r = await nativeFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: localStorage.getItem('st_token') || '', ...payload }) });
    const j = await r.json().catch(() => ({ error: '网络响应异常' }));
    if (!r.ok) throw new Error(j.error || '请求失败');
    return j;
  }
  function track(eventType, metadata = {}, overridePage, originalContext, options = {}) {
    const c = Object.assign(context(), originalContext || {}); if (overridePage) c.appPage = overridePage;
    return nativeFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, signal: options.signal,
      body: JSON.stringify({ action: 'track_event', token: localStorage.getItem('st_token') || '', eventType, context: c, metadata }) }).catch(() => undefined);
  }

  // Expose the existing telemetry channel to feature modules without exposing user-entered content.
  window.__scoreTrackerTrack = track;

  window.fetch = async (...args) => {
    let action = '', body = null;
    try {
      const target = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const endpoint = new URL(target, location.href);
      if (endpoint.origin === location.origin && endpoint.pathname === API && args[1]?.body) { body = JSON.parse(String(args[1].body)); action = body?.action || ''; }
    } catch {}
    let response;
    try {
      response = await nativeFetch(...args);
    } catch (err) {
      // 网络层失败（断网/被插件拦截/DNS 等）此前完全不可观测：这里上报后原样抛出
      if (!window.__scoreTrackerRequestDiagnosticsV37 && action && action !== 'track_event' && !String(action).startsWith('feedback_')) {
        try {
          nativeFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
            body: JSON.stringify({ action: 'track_event', token: localStorage.getItem('st_token') || '', eventType: 'api_fetch_error',
              context: context(), metadata: { failed_action: action, online: navigator.onLine, error: String((err && err.message) || err).slice(0, 180) } })
          }).catch(() => {});
        } catch {}
      }
      throw err;
    }
    if (response.ok && action && action !== 'track_event' && !action.startsWith('feedback_')) {
      const after = async () => {
        let data = {}; try { data = await response.clone().json(); } catch {}
        if (action === 'register') track('register_completed', { generated_account: true }, 'home');
        if (action === 'login') track('login_success', {}, 'home');
        if (action === 'logout') track('logout');
        if (action === 'save_exam') track(data.created ? 'exam_created' : 'exam_updated', { exam_id: data.id || body?.exam?.id || null });
        if (action === 'delete_exam') track('exam_deleted', { exam_id: body?.examId || null });
      };
      setTimeout(after, 80);
    }
    return response;
  };

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
  ready(() => {
    injectStyles(); injectFeedbackButton(); track('page_view');
    document.addEventListener('click', (e) => {
      const t = e.target.closest?.('[data-page],#newAccountBtn,[data-subject],[data-radar-mode],[data-radar-exam],a[href]');
      if (!t) return;
      if (t.matches('#newAccountBtn')) track('register_started', {}, 'login');
      if (t.dataset?.page) setTimeout(() => track('app_page_view', { source: 'navigation' }, t.dataset.page), 0);
      if (t.dataset?.subject) track('chart_subject_changed', { subject: t.dataset.subject }, 'home');
      if (t.dataset?.radarMode) track('radar_mode_changed', { mode: t.dataset.radarMode }, 'home');
      if (t.dataset?.radarExam) track('radar_exam_selected', { exam_id: t.dataset.radarExam }, 'home');
      if (t.tagName === 'A' && /github\.com\/yhwlwl\/score-tracker/i.test(t.href)) track('github_repo_clicked', { href: t.href, source: currentPage() });
    }, true);
    setTimeout(() => track('app_page_view', { source: 'initial' }, currentPage()), 700);
    if (context().isPwa) track('pwa_launch');
    window.addEventListener('appinstalled', () => track('pwa_installed'));
    setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) track('heartbeat'); }, 4 * 60 * 1000);
    pollUnread(); setInterval(() => { if (document.visibilityState === 'visible') pollUnread(); }, 60 * 1000);
  });

  function injectStyles() {
    const s = document.createElement('style'); s.id = 'st-feedback-style'; s.textContent = `
    .st-fb-btn{position:fixed;right:18px;bottom:max(84px,calc(env(safe-area-inset-bottom) + 72px));z-index:38;border:1px solid #dfe4ee;background:#fff;color:#303a4c;border-radius:999px;padding:11px 15px;box-shadow:0 10px 28px #25304a22;font:600 13px system-ui;cursor:pointer}.st-fb-btn b{display:none;margin-left:5px;background:#e85661;color:#fff;border-radius:99px;padding:1px 6px;font-size:10px}.st-fb-btn.has-unread b{display:inline-block}.st-fb-back{position:fixed;inset:0;background:#1b2332aa;z-index:80;display:grid;place-items:center;padding:16px}.st-fb-modal{width:min(680px,100%);max-height:min(780px,92vh);overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 60px #0003;color:#273142}.st-fb-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #eef1f6}.st-fb-head h3{margin:0;font-size:18px}.st-fb-close{border:0;background:#f3f5f8;border-radius:12px;width:36px;height:36px;font-size:22px;cursor:pointer}.st-fb-body{padding:20px 22px}.st-fb-tabs{display:flex;gap:8px;margin-bottom:16px}.st-fb-tabs button{border:1px solid #dfe4ee;background:#fff;border-radius:999px;padding:8px 13px}.st-fb-tabs button.active{background:#303a4c;color:#fff}.st-fb-field{display:grid;gap:7px;margin-bottom:14px}.st-fb-field label{font-size:12px;font-weight:700}.st-fb-field textarea,.st-fb-field select{width:100%;border:1px solid #dfe4ee;border-radius:13px;padding:11px 12px;font:inherit;background:#fff}.st-fb-field textarea{min-height:130px;resize:vertical}.st-fb-actions{display:flex;justify-content:flex-end;gap:8px}.st-fb-primary,.st-fb-secondary{border-radius:12px;padding:10px 15px;cursor:pointer}.st-fb-primary{border:0;background:#5d72e8;color:#fff}.st-fb-secondary{border:1px solid #dfe4ee;background:#fff}.st-fb-list{display:grid;gap:10px}.st-fb-item{border:1px solid #e6eaf1;border-radius:15px;padding:13px;cursor:pointer}.st-fb-item:hover{background:#fafbfe}.st-fb-meta{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#7c8799;margin-bottom:7px}.st-fb-content{font-size:13px;line-height:1.55}.st-fb-pill{display:inline-block;border:1px solid #dfe4ee;border-radius:99px;padding:2px 7px;font-size:10px}.st-fb-unread{color:#e85661;font-weight:700}.st-fb-thread{display:grid;gap:10px}.st-fb-msg{max-width:88%;padding:10px 12px;border-radius:14px;background:#f3f5f9;font-size:13px;line-height:1.55}.st-fb-msg.admin{margin-left:auto;background:#edf1ff}.st-fb-imgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.st-fb-imgs img{width:110px;height:90px;object-fit:cover;border-radius:9px;border:1px solid #e2e6ee}.st-fb-note{font-size:12px;color:#7d8798;line-height:1.6}.st-fb-notice{position:fixed;right:18px;bottom:145px;z-index:39;background:#273142;color:#fff;border-radius:12px;padding:10px 13px;font-size:12px;box-shadow:0 10px 30px #0003}.st-fb-empty{text-align:center;padding:30px;color:#8a94a5}.st-fb-files{font-size:12px;color:#6c778a}.st-fb-files input{max-width:100%}@media(max-width:620px){.st-fb-btn{right:12px;bottom:max(76px,calc(env(safe-area-inset-bottom) + 66px))}.st-fb-back{padding:0;place-items:end center}.st-fb-modal{border-radius:22px 22px 0 0;max-height:90vh}.st-fb-head,.st-fb-body{padding-left:16px;padding-right:16px}}
    `; document.head.appendChild(s);
  }
  function injectFeedbackButton() {
    if ($('#stFeedbackBtn')) return;
    const b = document.createElement('button'); b.id = 'stFeedbackBtn'; b.className = 'st-fb-btn'; b.innerHTML = '建议反馈 <b>0</b>'; b.onclick = () => openFeedback(); document.body.appendChild(b);
  }
  const statusText = { new: '新反馈', open: '已查看', in_progress: '处理中', resolved: '已解决', closed: '已关闭' };
  async function pollUnread() {
    try {
      const d = await call('feedback_list', { guestAccessToken });
      const n = (d.feedback || []).reduce((a, x) => a + Number(x.unread || 0), 0), b = $('#stFeedbackBtn');
      if (b) { b.classList.toggle('has-unread', n > 0); $('b', b).textContent = n; }
      const prev = Number(localStorage.getItem('st_feedback_unread') || 0);
      if (n > prev && n > 0) { const x = document.createElement('div'); x.className = 'st-fb-notice'; x.textContent = `你有 ${n} 条管理员新回复`; document.body.appendChild(x); setTimeout(() => x.remove(), 4000); }
      localStorage.setItem('st_feedback_unread', String(n));
    } catch {}
  }
  function modalBase(title) {
    const back = document.createElement('div'); back.className = 'st-fb-back'; back.innerHTML = `<div class="st-fb-modal"><div class="st-fb-head"><h3>${title}</h3><button class="st-fb-close">×</button></div><div class="st-fb-body"></div></div>`;
    document.body.appendChild(back); $('.st-fb-close', back).onclick = () => back.remove(); back.onclick = e => { if (e.target === back) back.remove(); }; return back;
  }
  async function filePayload(input) {
    const files = [...(input?.files || [])].slice(0, 3), out = [];
    for (const f of files) { if (!f.type.startsWith('image/')) continue; if (f.size > 5 * 1024 * 1024) throw new Error('单张图片不能超过 5MB'); const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f); }); out.push({ name: f.name, type: f.type, size: f.size, data }); }
    return out;
  }
  window.__scoreTrackerFeedback = { open: openFeedback };
  async function openFeedback(options = {}) {
    if (document.querySelector('.st-fb-back')) return;
    track('feedback_opened');
    const back = modalBase('建议与反馈'), body = $('.st-fb-body', back);
    body.innerHTML = `<div class="st-fb-tabs"><button class="active" data-tab="new">提交反馈</button><button data-tab="history">我的反馈</button></div><div id="stFbPane"></div>`;
    const showNew = () => { $$('.st-fb-tabs button', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'new')); $('#stFbPane', back).innerHTML = `<div class="st-fb-field"><label>类型</label><select id="stFbType"><option value="suggestion">功能建议</option><option value="bug">问题 / Bug</option><option value="experience">体验反馈</option><option value="other">其他</option></select></div><div class="st-fb-field"><label>内容</label><textarea id="stFbContent" maxlength="5000" placeholder="请尽量描述发生了什么、你希望怎样改进…"></textarea></div><div class="st-fb-field st-fb-files"><label>截图（可选，最多 3 张，每张 ≤ 5MB）</label><input id="stFbFiles" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></div><div class="st-fb-note">会自动附带版本、页面、设备、访问来源、使用深度和成绩记录统计，方便定位问题；不会上传你的密码。</div><div class="st-fb-actions" style="margin-top:16px"><button class="st-fb-primary" id="stFbSubmit">提交</button></div>`; $('#stFbSubmit', back).onclick = submitFeedback; };
    const showHistory = async () => { $$('.st-fb-tabs button', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'history')); const pane = $('#stFbPane', back); pane.innerHTML = '<div class="st-fb-empty">读取中…</div>'; try { const d = await call('feedback_list', { guestAccessToken }); pane.innerHTML = (d.feedback || []).length ? `<div class="st-fb-list">${d.feedback.map(x => `<div class="st-fb-item" data-feedback-id="${x.id}"><div class="st-fb-meta"><span>${new Date(x.created_at).toLocaleString('zh-CN')} · <span class="st-fb-pill">${statusText[x.status] || x.status}</span></span>${x.unread ? `<span class="st-fb-unread">${x.unread} 条新回复</span>` : ''}</div><div class="st-fb-content">${escapeHtml(x.content)}</div></div>`).join('')}</div>` : '<div class="st-fb-empty">还没有提交过反馈</div>'; $$('[data-feedback-id]', pane).forEach(x => x.onclick = () => openThread(x.dataset.feedbackId, back)); } catch (e) { pane.innerHTML = `<div class="st-fb-empty">${escapeHtml(e.message)}</div>`; } };
    $$('[data-tab]', back).forEach(x => x.onclick = () => x.dataset.tab === 'new' ? showNew() : showHistory());
    if (options.feedbackId) {
      $$('[data-tab]', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'history'));
      await openThread(options.feedbackId, back);
    } else if (options.tab === 'history') await showHistory();
    else {
      showNew();
      if (options.type) $('#stFbType', back).value = options.type;
      if (options.content) $('#stFbContent', back).value = options.content;
    }
    async function submitFeedback() { const btn = $('#stFbSubmit', back), content = $('#stFbContent', back).value.trim(); if (!content) return; btn.disabled = true; btn.textContent = '提交中…'; try { const attachments = await filePayload($('#stFbFiles', back)); await call('feedback_submit', { feedbackType: $('#stFbType', back).value, content, context: context(), guestAccessToken, attachments }); track('feedback_submitted', { type: $('#stFbType', back).value }); $('#stFbPane', back).innerHTML = '<div class="st-fb-empty"><b>已收到，谢谢你的反馈。</b><br><br>管理员回复后这里会出现未读提醒。</div>'; pollUnread(); } catch (e) { btn.disabled = false; btn.textContent = '提交'; alert(e.message); } }
  }
  async function openThread(id, parent) {
    const pane = $('#stFbPane', parent); pane.innerHTML = '<div class="st-fb-empty">读取会话…</div>';
    try {
      const d = await call('feedback_detail', { feedbackId: id, guestAccessToken }); await call('feedback_mark_read', { feedbackId: id, guestAccessToken }).catch(() => {}); track('feedback_read', { feedback_id: id });
      const atts = d.attachments || [], msgs = [{ author_type: 'user', content: d.feedback.content, created_at: d.feedback.created_at, id: null }, ...(d.replies || [])];
      const imgs = rid => { const a = atts.filter(x => (x.reply_id || null) === rid && x.url); return a.length ? `<div class="st-fb-imgs">${a.map(x => `<a href="${x.url}" target="_blank" rel="noopener"><img src="${x.url}" alt="${escapeHtml(x.file_name)}"></a>`).join('')}</div>` : ''; };
      pane.innerHTML = `<button class="st-fb-secondary" id="stFbBack">← 返回列表</button><div class="st-fb-meta" style="margin:14px 0"><span class="st-fb-pill">${statusText[d.feedback.status] || d.feedback.status}</span><span>${new Date(d.feedback.created_at).toLocaleString('zh-CN')}</span></div><div class="st-fb-thread">${msgs.map(m => `<div class="st-fb-msg ${m.author_type === 'admin' ? 'admin' : ''}"><b>${m.author_type === 'admin' ? '管理员' : '我'}</b><br>${escapeHtml(m.content)}${imgs(m.id)}</div>`).join('')}</div><div class="st-fb-field" style="margin-top:16px"><label>继续回复</label><textarea id="stFbReply" maxlength="5000" placeholder="补充情况或回复管理员…"></textarea></div><div class="st-fb-field st-fb-files"><input id="stFbReplyFiles" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></div><div class="st-fb-actions"><button class="st-fb-primary" id="stFbReplyBtn">发送回复</button></div>`;
      $('#stFbBack', pane).onclick = () => { $$('.st-fb-tabs button', parent).find(x => x.dataset.tab === 'history')?.click(); };
      $('#stFbReplyBtn', pane).onclick = async () => { const content = $('#stFbReply', pane).value.trim(); if (!content) return; const btn = $('#stFbReplyBtn', pane); btn.disabled = true; try { const attachments = await filePayload($('#stFbReplyFiles', pane)); await call('feedback_reply', { feedbackId: id, content, guestAccessToken, attachments }); track('feedback_replied', { feedback_id: id }); await openThread(id, parent); } catch (e) { btn.disabled = false; alert(e.message); } };
      pollUnread();
    } catch (e) { pane.innerHTML = `<div class="st-fb-empty">${escapeHtml(e.message)}</div>`; }
  }
  function escapeHtml(v = '') { return String(v).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
})();


/* ===== feedback-statuses.js ===== */
(() => {
  'use strict';

  const STATUS_LABELS = new Map([
    ['new', '已收到'],
    ['新反馈', '已收到'],
    ['reviewing', '处理中'],
    ['open', '处理中'],
    ['已查看', '处理中'],
    ['planned', '已计划'],
    ['resolved', '已解决'],
    ['closed', '已关闭'],
  ]);

  const STATUS_CLASSES = {
    '已收到': 'is-received',
    '处理中': 'is-reviewing',
    '已计划': 'is-planned',
    '已解决': 'is-resolved',
    '已关闭': 'is-closed',
  };

  const style = document.createElement('style');
  style.textContent = `
    .st-fb-pill.is-received{background:#eef4ff;border-color:#bfd0ff;color:#365fc4}
    .st-fb-pill.is-reviewing{background:#fff7e7;border-color:#f2d18d;color:#9a6410}
    .st-fb-pill.is-planned{background:#f4efff;border-color:#d7c6ff;color:#6c45b8}
    .st-fb-pill.is-resolved{background:#ecf9f2;border-color:#aadfc3;color:#237a4d}
    .st-fb-pill.is-closed{background:#f2f4f7;border-color:#d8dde6;color:#697386}
  `;
  document.head.appendChild(style);

  function normalize(root) {
    root.querySelectorAll?.('.st-fb-pill').forEach((badge) => {
      const current = badge.textContent?.trim() || '';
      const next = STATUS_LABELS.get(current) || current;
      if (next !== current) badge.textContent = next;
      Object.values(STATUS_CLASSES).forEach((name) => badge.classList.remove(name));
      const className = STATUS_CLASSES[next];
      if (className) badge.classList.add(className);
    });
  }

  function bindModal() {
    const modal = document.querySelector('.st-fb-modal');
    if (!modal || modal.dataset.statusLabelsBound === '1') return;
    modal.dataset.statusLabelsBound = '1';
    normalize(modal);
    const observer = new MutationObserver(() => normalize(modal));
    observer.observe(modal, { childList: true, subtree: true });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#stFeedbackBtn,.st-fb-tabs,[data-feedback-id],#stFbBack,#stFbReplyBtn')) {
      queueMicrotask(bindModal);
      setTimeout(bindModal, 0);
    }
  }, true);
})();

/* ===== app-v3.js ===== */
const API = '/api/score-tracker-api';
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
const SUBJECT_SHORT = { 语文: '语', 数学: '数', 英语: '英', 物理: '物', 化学: '化', 生物: '生', 历史: '史', 地理: '地', 政治: '政' };
const SUBJECT_MAX = { 语文: 150, 数学: 150, 英语: 150, 物理: 100, 化学: 100, 生物: 100, 历史: 100, 地理: 100, 政治: 100 };
const RADAR_COLORS = ['#5d72e8', '#32a77a', '#e59b45', '#df5f68'];
const state = {
  token: localStorage.getItem('st_token') || '',
  user: null,
  exams: [],
  page: 'home',
  subject: '总分',
  modal: null,
  onboarding: null,
  radarMode: 'actual',
  radarSelection: []
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

injectExtraStyles();

async function api(action, payload = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: state.token, ...payload })
  });
  const data = await res.json().catch(() => ({ error: '网络响应异常' }));
  if (!res.ok) {
    if (res.status === 401 && action !== 'login' && action !== 'register') {
      localStorage.removeItem('st_token');
      state.token = '';
      state.user = null;
      renderLogin();
    }
    throw window.__scoreTrackerResponseError ? window.__scoreTrackerResponseError(res, data, action) : new Error(data.error || '请求失败');
  }
  return data;
}

function injectExtraStyles() {
  if ($('#app-v3-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v3-extra-style';
  style.textContent = `
    .stack-main{display:grid;gap:18px;min-width:0}
    .radar-card{padding:22px}
    .radar-toolbar{display:grid;gap:12px;margin-bottom:12px}
    .toggle-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .toggle-row .label{font-size:12px;color:var(--muted);font-weight:700}
    .subtle-note{font-size:12px;color:var(--muted);line-height:1.6}
    .multi-select{display:flex;gap:8px;overflow:auto;padding-bottom:4px;scrollbar-width:none}
    .multi-select::-webkit-scrollbar{display:none}
    .select-pill{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 12px;font-size:12px;color:var(--muted);white-space:nowrap}
    .select-pill.active{background:var(--text);color:#fff;border-color:var(--text)}
    .radar-wrap{height:360px;position:relative;margin-top:4px}
    .radar-wrap svg{width:100%;height:100%}
    .radar-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
    .legend-pill{display:inline-flex;align-items:center;gap:8px;background:#f7f8fb;border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:#566172}
    .legend-pill i{width:10px;height:10px;border-radius:999px;display:inline-block}
    .radar-summary{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .summary-card{border:1px solid var(--line);background:#fafbfe;border-radius:16px;padding:14px}
    .summary-card h4{margin:0 0 8px;font-size:13px}
    .summary-list{display:grid;gap:7px;font-size:12px;color:#566172}
    .summary-item{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .summary-item b{color:var(--text)}
    .comparison-grid{display:grid;gap:8px;font-size:12px;color:#566172}
    .comparison-strong{font-weight:700;color:var(--text)}
    .comparison-positive{color:var(--green);font-weight:700}
    .comparison-negative{color:var(--danger);font-weight:700}
    @media(max-width:880px){.radar-summary{grid-template-columns:1fr}.radar-wrap{height:330px}}
    @media(max-width:620px){.radar-card{padding:17px 14px}.radar-wrap{height:300px}.select-pill,.legend-pill{font-size:11px;padding:7px 10px}.summary-card{padding:12px}}
  `;
  document.head.appendChild(style);
}

function escapeHtml(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00`);
  return `${x.getMonth() + 1}月${x.getDate()}日`;
}
function fmtYearDate(d) {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00`);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
}
function num(v) {
  return v === null || v === undefined || v === '' ? null : Number(v);
}
function formatScore(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function formatPercent(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Math.round(Number(v) * 10) / 10;
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`;
}
function defaultMax(subject) {
  return SUBJECT_MAX[subject] || 100;
}
function examScore(exam, subject, key) {
  return num(exam?.scores?.[subject]?.[key]);
}
function examMax(exam, subject) {
  return num(exam?.scores?.[subject]?.max) ?? defaultMax(subject);
}
function scoreRate(exam, subject, key) {
  const score = examScore(exam, subject, key);
  const max = examMax(exam, subject);
  if (score === null || !max) return null;
  return Math.max(0, Math.min(100, (score / max) * 100));
}
function totalFor(exam, key) {
  let sum = 0;
  let count = 0;
  SUBJECTS.forEach((s) => {
    const v = examScore(exam, s, key);
    if (v !== null) {
      sum += v;
      count += 1;
    }
  });
  return count ? sum : null;
}
function totalMax(exam, key) {
  let sum = 0;
  let count = 0;
  SUBJECTS.forEach((s) => {
    const v = examScore(exam, s, key);
    if (v !== null) {
      sum += examMax(exam, s);
      count += 1;
    }
  });
  return count ? sum : null;
}
function totalRate(exam, key) {
  const score = totalFor(exam, key);
  const max = totalMax(exam, key);
  if (score === null || !max) return null;
  return (score / max) * 100;
}
function latestActualTotal() {
  const valid = [...state.exams].reverse().map((e) => ({ e, v: totalFor(e, 'actual') })).find((x) => x.v !== null);
  return valid?.v ?? null;
}
function latestTargetTotal() {
  const valid = [...state.exams].reverse().map((e) => ({ e, v: totalFor(e, 'target') })).find((x) => x.v !== null);
  return valid?.v ?? null;
}
function trendDelta() {
  const vals = state.exams.map((e) => totalFor(e, 'actual')).filter((v) => v !== null);
  return vals.length > 1 ? vals.at(-1) - vals.at(-2) : null;
}
function recordedCount() {
  return state.exams.filter((e) => SUBJECTS.some((s) => examScore(e, s, 'actual') !== null)).length;
}
function toast(msg) {
  let t = $('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

function radarAvailableExams(mode = state.radarMode) {
  return state.exams.filter((exam) => SUBJECTS.some((subject) => scoreRate(exam, subject, mode) !== null));
}
function ensureRadarSelection() {
  const available = radarAvailableExams();
  const availableIds = new Set(available.map((exam) => exam.id));
  state.radarSelection = state.radarSelection.filter((id) => availableIds.has(id)).slice(0, 4);
  if (!state.radarSelection.length && available.length) {
    state.radarSelection = available.slice(-2).map((exam) => exam.id);
  }
  if (!state.radarSelection.length && state.radarMode === 'actual') {
    const targetAvailable = radarAvailableExams('target');
    if (targetAvailable.length) {
      state.radarMode = 'target';
      state.radarSelection = targetAvailable.slice(-2).map((exam) => exam.id);
    }
  }
}
function selectedRadarExams() {
  ensureRadarSelection();
  return state.radarSelection
    .map((id) => state.exams.find((exam) => exam.id === id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
}

async function init() {
  if (state.token) {
    try {
      const me = await api('me');
      state.user = me.user;
      await loadExams();
      render();
      return;
    } catch (e) {}
  }
  renderLogin();
}

async function startRegister() {
  $('#app').innerHTML = '<div class="splash"><div class="brand-mark">↗</div><div>正在创建你的专属账号</div><small>只需要几秒钟</small></div>';
  try {
    const data = await api('register');
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_known_user', '1');
    state.onboarding = { username: data.user.username, password: data.password };
    await loadExams();
    state.page = 'home';
    render();
  } catch (e) {
    renderLogin(e.message);
  }
}

async function loadExams() {
  const data = await api('list_exams');
  state.exams = data.exams || [];
  ensureRadarSelection();
}

function render() {
  if (!state.user) {
    renderLogin();
    return;
  }
  const app = $('#app');
  app.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand"><div class="logo">↗</div><div><h1>成绩轨迹</h1><p>把每一次努力，连成一条向上的线</p></div></div>
    <nav class="desktop-nav">${navButton('home', '概览')}${navButton('records', '考试记录')}${navButton('account', '账号')}</nav></header>
    <main id="content"></main></div>
    <nav class="bottom-nav">${bottomButton('home', '概览')}${bottomButton('records', '记录')}${bottomButton('account', '账号')}</nav>`;
  renderPage();
  bindNav();
  if (state.onboarding) showOnboarding();
}
function navButton(p, label) {
  return `<button class="nav-btn ${state.page === p ? 'active' : ''}" data-page="${p}">${label}</button>`;
}
function navIcon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 10.7 8.5-7 8.5 7v9.8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9 22v-6.2h6V22"/></svg>',
    records: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M11.5 8h5M11.5 12h5M11.5 16h3.5"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V5M4 20h17"/><path d="M8 17v-4M12 17V8M16 17v-7M20 17v-3"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="2.5"/><path d="M7.5 18c.9-2.2 2.4-3.3 4.5-3.3s3.6 1.1 4.5 3.3"/></svg>'
  };
  return icons[name] || icons.home;
}
function bottomButton(p, label) {
  return `<button class="${state.page === p ? 'active' : ''}" data-page="${p}" aria-label="${label}" ${state.page === p ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${navIcon(p)}</span><span>${label}</span></button>`;
}
function bindNav() {
  $$('[data-page]').forEach((b) => {
    b.onclick = () => {
      state.page = b.dataset.page;
      render();
    };
  });
}
function renderPage() {
  const c = $('#content');
  if (state.page === 'home') c.innerHTML = homeHtml();
  if (state.page === 'records') c.innerHTML = recordsHtml();
  if (state.page === 'account') c.innerHTML = accountHtml();
  bindPage();
}

function homeHtml() {
  const actual = latestActualTotal();
  const target = latestTargetTotal();
  const delta = trendDelta();
  const last = state.exams.at(-1);
  return `<section class="hero">
    <div class="card hero-main"><span class="eyebrow">✦ 本学年成长记录</span><h2>${state.exams.length ? '看见起伏，也看见自己在进步。' : '从第一次考试开始，记录你的上升轨迹。'}</h2><p class="hero-desc">记录语数英物化生史地政 9 科的目标与真实成绩，折线图看总趋势，雷达图看结构变化，更容易找到弱项并追踪改善。</p><div class="hero-actions"><button class="primary" id="addExamHome">＋ 记录一次考试</button><button class="secondary" data-page="records">查看全部记录</button></div></div>
    <div class="card hero-stat"><div><div class="stat-label">最近一次真实总分</div><div class="stat-value">${actual === null ? '—' : formatScore(actual)}</div><div class="stat-sub">${last ? `${escapeHtml(last.name)} · ${fmtDate(last.exam_date)}` : '还没有真实成绩记录'}</div></div>${delta === null ? '' : `<span class="trend-pill">${delta >= 0 ? '↗' : '↘'} 较上次 ${delta >= 0 ? '+' : ''}${formatScore(delta)} 分</span>`}</div>
  </section>
  <section class="grid-main"><div class="stack-main"><div class="card chart-card"><div class="card-title-row"><div><h3 class="card-title">成绩趋势</h3><p class="card-sub">真实成绩与目标成绩放在同一张图里</p></div><div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div></div><div class="chips">${['总分', ...SUBJECTS].map((s) => `<button class="chip ${state.subject === s ? 'active' : ''}" data-subject="${s}">${s}</button>`).join('')}</div><div class="chart-wrap" id="chart">${chartHtml()}</div></div>${radarCardHtml()}</div>
  <div class="side-stack"><div class="card quick-card"><h3 class="card-title">这一年的记录</h3><div class="quick-grid"><div class="mini-stat"><b>${state.exams.length}</b><span>次考试</span></div><div class="mini-stat"><b>${recordedCount()}</b><span>次已出分</span></div><div class="mini-stat"><b>${target === null ? '—' : formatScore(target)}</b><span>最近目标总分</span></div><div class="mini-stat"><b>${delta === null ? '—' : `${delta >= 0 ? '+' : ''}${formatScore(delta)}`}</b><span>最近变化</span></div></div></div>
  <div class="card recent-card"><div class="card-title-row"><div><h3 class="card-title">最近考试</h3><p class="card-sub">点击可编辑或补录成绩</p></div></div>${recentHtml()}</div></div></section>`;
}

function recentHtml() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:150px"><div><div class="empty-icon">✎</div>第一条记录，会成为你的起点</div></div>`;
  return [...state.exams].reverse().slice(0, 4).map((e, i) => {
    const a = totalFor(e, 'actual');
    return `<div class="exam-item clickable" data-edit="${e.id}"><div class="exam-dot">${i + 1}</div><div class="exam-info"><b>${escapeHtml(e.name)}</b><span>${fmtYearDate(e.exam_date)}</span></div><div class="exam-score">${a === null ? '待补录' : formatScore(a)}</div></div>`;
  }).join('');
}

function chartHtml() {
  if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>`;
  const points = state.exams.map((e) => ({
    exam: e,
    name: e.name,
    date: e.exam_date,
    actual: state.subject === '总分' ? totalFor(e, 'actual') : examScore(e, state.subject, 'actual'),
    target: state.subject === '总分' ? totalFor(e, 'target') : examScore(e, state.subject, 'target')
  }));
  const extra = window.ScoreAverages ? window.ScoreAverages.series() : [];
  const vals = points.flatMap((p) => [p.actual, p.target, ...extra.map((s) => s.value(p.exam))]).filter((v) => v !== null);
  if (!vals.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>`;
  let max = Math.max(...vals), min = Math.min(...vals);
  const pad = Math.max(10, (max - min) * 0.18);
  max = Math.ceil((max + pad) / 10) * 10;
  min = Math.max(0, Math.floor((min - pad) / 10) * 10);
  if (max === min) max = min + 100;
  const W = 760, H = 300, L = 46, R = 18, T = 20, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  const y = (v) => T + (max - v) / (max - min) * ch;
  const ticks = 5;
  let grid = '';
  for (let i = 0; i <= ticks; i += 1) {
    const v = max - ((max - min) * i / ticks);
    const yy = T + (ch * i / ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`;
  }
  const line = (key, color, dash = '', reader = null, label = '') => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((p, i) => {
      const v = reader ? reader(p.exam) : p[key];
      if (v === null) {
        started = false;
        return;
      }
      const xx = x(i), yy = y(v);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="${color}" stroke-width="3" data-tip="${escapeHtml(p.name)} · ${label || (key === 'actual' ? '真实' : '目标')} ${reader ? window.ScoreAverages.format(v) : formatScore(v)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${circles}`;
  };
  const labels = points.map((p, i) => `<text x="${x(i)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(p.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" data-axis-min="${min}" data-axis-max="${max}" preserveAspectRatio="none">${grid}${/* Keep series order aligned with the legend. */
  line('actual', '#5d72e8')}${line('target', '#32a77a', '7 7')}${extra.map((s) => line('', s.color, s.dash, s.value, s.label)).join('')}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

function radarCardHtml() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试，直观看出弱项是否改善</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试，推荐对比最近几次，找出最薄弱学科和进步最明显的学科。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
}

function radarLegendHtml(selected) {
  if (!selected.length) return '';
  return `<div class="radar-legend">${selected.map((exam, index) => `<span class="legend-pill"><i style="background:${RADAR_COLORS[index % RADAR_COLORS.length]}"></i>${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</span>`).join('')}</div>`;
}

function radarChartHtml(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
  const W = 760, H = 360;
  const cx = 380, cy = 180, radius = 122;
  const angleStep = (Math.PI * 2) / SUBJECTS.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i);
    const r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  let grid = '';
  [0.2, 0.4, 0.6, 0.8, 1].forEach((ratio) => {
    const pts = SUBJECTS.map((_, i) => pointAt(ratio, i).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(ratio * 100)}%</text>`;
  });
  SUBJECTS.forEach((subject, i) => {
    const [x, y] = pointAt(1, i);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    const labelPos = pointAt(1.14, i);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
  });
  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = SUBJECTS.map((subject, i) => {
      const ratio = (scoreRate(exam, subject, state.radarMode) ?? 0) / 100;
      return pointAt(ratio, i).join(',');
    }).join(' ');
    const circles = SUBJECTS.map((subject, i) => {
      const rate = scoreRate(exam, subject, state.radarMode);
      const ratio = (rate ?? 0) / 100;
      const [x, y] = pointAt(ratio, i);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg>`;
}

function radarSummaryHtml(selected) {
  if (!selected.length) return '';
  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = SUBJECTS
    .map((subject) => ({ subject, rate: scoreRate(latest, subject, state.radarMode) }))
    .filter((item) => item.rate !== null)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  const comparisons = SUBJECTS
    .map((subject) => {
      const latestRate = scoreRate(latest, subject, state.radarMode);
      const earliestRate = scoreRate(earliest, subject, state.radarMode);
      if (latestRate === null || earliestRate === null) return null;
      return { subject, delta: latestRate - earliestRate, latestRate };
    })
    .filter(Boolean)
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const averageRate = totalRate(latest, state.radarMode);
  return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="summary-list">${weakness.length ? weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${item.subject}</b></span><span>${formatPercent(item.rate)}</span></div>`).join('') : '<div class="subtle-note">这次考试还没有足够数据</div>'}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>整体平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${best.subject} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${worst.subject} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到弱项改善了多少。</div></div>`}</div></div>`;
}

function recordsHtml() {
  return `<div class="page-head"><div><h2>考试记录</h2><p>按时间整理目标成绩与真实成绩，任何时候都可以回来补录。</p></div><button class="primary" id="addExam">＋ 新建</button></div><div class="card records-card">${state.exams.length ? state.exams.map(recordHtml).join('') : `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div>`}</div>`;
}

function recordHtml(e) {
  const actual = totalFor(e, 'actual');
  const target = totalFor(e, 'target');
  return `<div class="record"><div class="record-date">${fmtYearDate(e.exam_date)}<b>${escapeHtml(e.name)}</b></div><div class="record-scores">${SUBJECTS.map((s) => {
    const a = examScore(e, s, 'actual');
    const t = examScore(e, s, 'target');
    if (a === null && t === null) return '';
    return `<span class="score-tag">${s} ${a === null ? '—' : formatScore(a)}<span style="color:#a1a9b5"> / ${t === null ? '—' : formatScore(t)}</span></span>`;
  }).join('') || '<span class="score-tag">尚未填写分数</span>'}<span class="score-tag"><b>总分 ${actual === null ? '—' : formatScore(actual)}</b> / 目标 ${target === null ? '—' : formatScore(target)}</span></div><div class="record-actions"><button class="icon-btn" title="编辑" data-edit="${e.id}">✎</button><button class="icon-btn danger" title="删除" data-delete="${e.id}">⌫</button></div></div>`;
}

function accountHtml() {
  return `<div class="page-head"><div><h2>账号</h2><p>这个账号让你的成绩记录可以一直保存在云端。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><p class="card-sub">用户名可以用于以后重新登录</p><div class="account-chip"><code>${escapeHtml(state.user?.username || '')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username || '')}">复制</button></div><div class="info-box" style="margin-top:15px"><b>ⓘ 关于密码</b><br>为了安全，密码只在账号创建时展示一次，服务器只保存经过加密处理的密码摘要，无法再显示原密码。</div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">所有考试与成绩都保存在 Supabase 中，并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div>`;
}

function bindPage() {
  $$('[data-page]').forEach((b) => {
    b.onclick = () => {
      state.page = b.dataset.page;
      render();
    };
  });
  $('#addExamHome')?.addEventListener('click', () => openExam());
  $('#addExam')?.addEventListener('click', () => openExam());
  $('#emptyAdd')?.addEventListener('click', () => openExam());
  $$('[data-edit]').forEach((b) => b.onclick = () => openExam(state.exams.find((e) => e.id === b.dataset.edit)));
  $$('[data-delete]').forEach((b) => b.onclick = () => deleteExam(b.dataset.delete));
  $$('[data-subject]').forEach((b) => b.onclick = () => { state.subject = b.dataset.subject; render(); });
  $$('[data-copy]').forEach((b) => b.onclick = async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast('已复制');
    } catch (e) {
      toast('复制失败，请手动选择');
    }
  });
  $$('[data-radar-mode]').forEach((b) => b.onclick = () => {
    state.radarMode = b.dataset.radarMode;
    ensureRadarSelection();
    render();
  });
  $$('[data-radar-exam]').forEach((b) => b.onclick = () => toggleRadarExam(b.dataset.radarExam));
  $('#logoutBtn')?.addEventListener('click', logout);
  const chart = $('#chart');
  if (chart) {
    $$('[data-tip]', chart).forEach((p) => {
      const show = () => {
        const tip = $('#chartTip');
        tip.textContent = p.dataset.tip;
        tip.style.display = 'block';
        const rect = chart.getBoundingClientRect();
        const cr = p.getBoundingClientRect();
        tip.style.left = `${cr.left - rect.left + cr.width / 2}px`;
        tip.style.top = `${cr.top - rect.top}px`;
      };
      p.addEventListener('mouseenter', show);
      p.addEventListener('click', show);
      p.addEventListener('mouseleave', () => { $('#chartTip').style.display = 'none'; });
    });
  }
}

function toggleRadarExam(id) {
  const selected = new Set(state.radarSelection);
  if (selected.has(id)) {
    selected.delete(id);
  } else {
    if (selected.size >= 4) {
      toast('最多叠加 4 次考试');
      return;
    }
    selected.add(id);
  }
  state.radarSelection = [...selected];
  render();
}

function openExam(exam = null) {
  const editing = !!exam;
  const today = new Date().toISOString().slice(0, 10);
  const scores = exam?.scores || {};
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? '编辑考试' : '记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="例如：高二上学期期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div><div class="score-table"><div class="score-row header"><span>科目</span><span>目标成绩</span><span>真实成绩</span><span>满分</span></div>${SUBJECTS.map((s) => `<div class="score-row" data-score-row="${s}"><span class="subject-name">${s}</span><input inputmode="decimal" class="target-input" placeholder="目标" value="${scores[s]?.target ?? ''}"><input inputmode="decimal" class="actual-input" placeholder="考后补录" value="${scores[s]?.actual ?? ''}"><input inputmode="decimal" class="max-input" value="${scores[s]?.max ?? defaultMax(s)}"></div>`).join('')}</div><p class="form-note">语文、数学、英语默认满分 150，其余科目默认满分 100。可以先只填写目标成绩，考完再回来补录真实成绩。未填写的科目不会计入总分。</p><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing ? '保存修改' : '保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;
  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
}

function validateExam(exam) {
  for (const subject of SUBJECTS) {
    const row = exam.scores[subject] || {};
    const max = num(row.max) ?? defaultMax(subject);
    const target = num(row.target);
    const actual = num(row.actual);
    if (max <= 0) return `${subject} 的满分必须大于 0`;
    if (target !== null && target > max) return `${subject} 的目标成绩不能超过满分 ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${subject} 的真实成绩不能超过满分 ${formatScore(max)}`;
  }
  return '';
}

async function saveExam(id, modal) {
  const btn = $('.save-btn', modal);
  const exam = { id, name: $('#examName', modal).value.trim(), exam_date: $('#examDate', modal).value, scores: {} };
  $$('[data-score-row]', modal).forEach((r) => {
    exam.scores[r.dataset.scoreRow] = {
      target: $('.target-input', r).value,
      actual: $('.actual-input', r).value,
      max: $('.max-input', r).value
    };
  });
  if (!exam.name || !exam.exam_date) {
    toast('请填写考试名称和日期');
    return;
  }
  const error = validateExam(exam);
  if (error) {
    toast(error);
    return;
  }
  btn.disabled = true;
  btn.textContent = '保存中…';
  try {
    await api('save_exam', { exam });
    await loadExams();
    modal.remove();
    state.modal = null;
    render();
    toast(id ? '已保存修改' : '考试已记录');
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = id ? '保存修改' : '保存考试';
  }
}

async function deleteExam(id) {
  const exam = state.exams.find((e) => e.id === id);
  if (!confirm(`确定删除「${exam?.name || '这次考试'}」？`)) return;
  try {
    await api('delete_exam', { examId: id });
    await loadExams();
    render();
    toast('已删除');
  } catch (e) {
    toast(e.message);
  }
}

function showOnboarding() {
  const d = state.onboarding;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal onboard"><div class="big-icon">✓</div><h2>账号已经准备好了</h2><p>以后换手机或清除浏览器数据时，可以用下面的用户名和密码重新登录。</p><div class="credential"><small>用户名</small><div class="credential-row"><code>${escapeHtml(d.username)}</code><button class="copy-btn" data-copy="${escapeHtml(d.username)}">复制</button></div></div><div class="credential"><small>密码</small><div class="credential-row"><code>${escapeHtml(d.password)}</code><button class="copy-btn" data-copy="${escapeHtml(d.password)}">复制</button></div></div><div class="save-warning"><span class="i">i</span><div><b>请现在截图保存。</b><br>为了安全，密码关闭此窗口后将不会再次显示，我们也无法从服务器取回原密码。</div></div><button class="primary full" id="savedBtn">我已截图保存，开始记录</button></div>`;
  document.body.appendChild(modal);
  $$('[data-copy]', modal).forEach((b) => b.onclick = async () => {
    await navigator.clipboard.writeText(b.dataset.copy);
    toast('已复制');
  });
  $('#savedBtn', modal).onclick = () => {
    state.onboarding = null;
    modal.remove();
  };
}

function renderLogin(error = '') {
  $('#app').innerHTML = `<div class="auth-page"><div class="card auth-card"><div class="logo">↗</div><h2>欢迎使用成绩轨迹</h2><p>先登录已有账号；如果你是第一次使用，可以直接注册一个新账号，系统会自动生成用户名和初始密码，并提醒你截图保存。</p>${error ? `<div class="info-box" style="margin-bottom:15px">${escapeHtml(error)}</div>` : ''}<div class="field"><label>用户名</label><input id="loginUser" autocomplete="username" placeholder="例如 bright-panda-4821"></div><div class="field"><label>密码</label><input id="loginPass" type="password" autocomplete="current-password" placeholder="密码"></div><div class="auth-actions"><button class="primary" id="loginBtn">登录</button><button class="secondary" id="newAccountBtn">注册新账号</button></div><div class="auth-help">支持记录语数英物化生史地政 9 科成绩，自动生成趋势图与雷达图。</div></div></div>`;
  $('#loginBtn').onclick = login;
  $('#newAccountBtn').onclick = () => startRegister();
  $('#loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
}

async function login() {
  const btn = $('#loginBtn');
  document.getElementById('requestErrorDetails')?.remove();
  btn.disabled = true;
  btn.textContent = '登录中…';
  let primaryError;
  try {
    const credentials = { username: $('#loginUser').value.trim(), password: $('#loginPass').value };
    let data;
    try {
      data = await api('login', credentials);
    } catch (error) {
      primaryError = error;
      // Compatibility login may succeed for a password created by the newer account service.
      if (error.status === 400 || error.status === 429) throw error;
      const response = await fetch('/api/score-tracker-data-api', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login_v2', ...credentials })
      });
      const result = await response.json().catch(() => ({ error: '网络响应异常' }));
      if (!response.ok || !result.token) {
        throw window.__scoreTrackerResponseError ? window.__scoreTrackerResponseError(response, result, 'login_v2') : new Error(result.error || '登录失败');
      }
      data = result;
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_known_user', '1');
    await loadExams();
    state.page = 'home';
    render();
  } catch (e) {
    if (window.__scoreTrackerShowRequestError) window.__scoreTrackerShowRequestError(e, primaryError && primaryError !== e ? [primaryError] : []);
    else toast(e.message);
  } finally {
    if (btn.isConnected) { btn.disabled = false; btn.textContent = '登录'; }
  }
}

async function logout() {
  if (!confirm('确定退出登录？请确认你已经保存好用户名和密码。')) return;
  try { await api('logout'); } catch (e) {}
  localStorage.removeItem('st_token');
  state.token = '';
  state.user = null;
  renderLogin();
}

init();


/* ===== app-v4.js ===== */
// v4 enhancement: dynamic radar axes + all-subject overview trend chart
const OVERVIEW_COLORS_V4 = ['#18212f', '#5d72e8', '#32a77a', '#e59b45', '#df5f68', '#8f62db', '#22a6b3', '#f06a8b', '#6c87ff', '#7a8a9a'];

function subjectsWithDataV4(exams, key = 'actual', strategy = 'all') {
  if (!exams.length) return [];
  return SUBJECTS.filter((subject) => {
    if (strategy === 'any') return exams.some((exam) => scoreRate(exam, subject, key) !== null);
    return exams.every((exam) => scoreRate(exam, subject, key) !== null);
  });
}

(function injectV4Styles() {
  if ($('#app-v4-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v4-extra-style';
  style.textContent = `
    .overview-card{padding:22px}
    .overview-wrap{height:340px;position:relative;margin-top:10px}
    .overview-wrap svg{width:100%;height:100%;overflow:visible}
    .overview-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
    .overview-pill{display:inline-flex;align-items:center;gap:8px;background:#f7f8fb;border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:#566172}
    .overview-pill i{width:10px;height:10px;border-radius:999px;display:inline-block}
    @media(max-width:620px){.overview-card{padding:17px 14px}.overview-wrap{height:300px}.overview-pill{font-size:11px;padding:7px 10px}}
  `;
  document.head.appendChild(style);
})();

function overviewSeriesV4() {
  const subjectList = subjectsWithDataV4(state.exams, 'actual', 'any');
  return [
    { label: '总分', color: OVERVIEW_COLORS_V4[0], getValue: (exam) => totalRate(exam, 'actual') },
    ...subjectList.map((subject, index) => ({
      label: subject,
      color: OVERVIEW_COLORS_V4[(index + 1) % OVERVIEW_COLORS_V4.length],
      getValue: (exam) => scoreRate(exam, subject, 'actual')
    }))
  ];
}

function overviewCardHtml() {
  const series = overviewSeriesV4();
  return `<div class="card overview-card"><div class="card-title-row"><div><h3 class="card-title">总览趋势图</h3><p class="card-sub">把总分和各科放在同一张图里统一观察。为便于比较，这里按得分率绘制；没有数据的科目不会显示。</p></div></div><div class="overview-wrap" id="overviewChart">${overviewChartHtmlV4(series)}</div>${overviewLegendHtmlV4(series)}</div>`;
}

function overviewLegendHtmlV4(series) {
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!visible.length) return '';
  return `<div class="overview-legend">${visible.map((item) => `<span class="overview-pill"><i style="background:${item.color}"></i>${item.label}</span>`).join('')}</div>`;
}

function overviewChartHtmlV4(series) {
  if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>还没有可用于总览图的真实成绩</div></div>`;

  const points = state.exams.map((exam) => ({
    name: exam.name,
    date: exam.exam_date,
    values: visible.map((item) => item.getValue(exam))
  }));
  const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  const y = (v) => T + (100 - v) / 100 * ch;

  let grid = '';
  for (let i = 0; i <= 5; i += 1) {
    const v = 100 - (100 * i / 5);
    const yy = T + (ch * i / 5);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(v)}%</text>`;
  }

  const lines = visible.map((seriesItem, seriesIndex) => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((point, pointIndex) => {
      const value = point.values[seriesIndex];
      if (value === null) {
        started = false;
        return;
      }
      const xx = x(pointIndex), yy = y(value);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} · ${seriesItem.label} ${formatPercent(value)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div>`;
}

radarCardHtml = function radarCardHtmlV4() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加对比时，会自动只显示这些考试共同拥有数据的科目，避免空轴干扰判断。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV4(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
  const subjects = subjectsWithDataV4(selected, state.radarMode, 'all');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目数据，暂时无法叠加比较</div></div>`;

  const W = 760, H = 360;
  const cx = 380, cy = 180, radius = 122;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i);
    const r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  let grid = '';
  [0.2, 0.4, 0.6, 0.8, 1].forEach((ratio) => {
    const pts = subjects.map((_, i) => pointAt(ratio, i).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(ratio * 100)}%</text>`;
  });
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    const labelPos = pointAt(1.14, i);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(scoreRate(exam, subject, state.radarMode) / 100, i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const [x, y] = pointAt(scoreRate(exam, subject, state.radarMode) / 100, i);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg>`;
};

radarSummaryHtml = function radarSummaryHtmlV4(selected) {
  if (!selected.length) return '';
  const subjects = subjectsWithDataV4(selected, state.radarMode, 'all');
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="subtle-note">所选考试没有共同科目，暂时无法计算结构变化。</div></div><div class="summary-card"><h4>对比说明</h4><div class="subtle-note">请改为选择数据范围更接近的几次考试，或者只查看单次考试雷达图。</div></div></div>`;

  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = subjects
    .map((subject) => ({ subject, rate: scoreRate(latest, subject, state.radarMode) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  const comparisons = subjects
    .map((subject) => ({ subject, delta: scoreRate(latest, subject, state.radarMode) - scoreRate(earliest, subject, state.radarMode) }))
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const averageRate = totalRate(latest, state.radarMode);

  return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${item.subject}</b></span><span>${formatPercent(item.rate)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与对比科目：<span class="comparison-strong">${subjects.map((subject) => SUBJECT_SHORT[subject]).join(' / ')}</span></div><div>整体平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${best.subject} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta)}</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${worst.subject} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta)}</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => SUBJECT_SHORT[subject]).join(' / ')}</span></div><div>平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到弱项改善了多少。</div></div>`}</div></div>`;
};

const homeHtmlV3 = homeHtml;
homeHtml = function homeHtmlV4() {
  const html = homeHtmlV3();
  const marker = '<div class="card radar-card">';
  const index = html.indexOf(marker);
  if (index < 0) return html;
  return `${html.slice(0, index)}${overviewCardHtml()}${html.slice(index)}`;
};

function bindOverviewTooltipV4() {
  const container = $('#overviewChart');
  const tip = $('#overviewChartTip', container || document);
  if (!container || !tip) return;
  $$('[data-tip]', container).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = container.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

const bindPageV3 = bindPage;
bindPage = function bindPageV4() {
  bindPageV3();
  bindOverviewTooltipV4();
};

/* ===== app-v5.js ===== */
// v5: move all-subject overview into the existing trend card
const chartHtmlBeforeV5 = chartHtml;
const bindPageBeforeV5 = bindPage;

(function injectV5Styles() {
  if ($('#app-v5-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v5-extra-style';
  style.textContent = `
    .chart-wrap.overview-mode-v5{height:auto}
    .overview-stage-v5{height:300px;position:relative;margin-top:4px}
    .overview-stage-v5 svg{width:100%;height:100%;overflow:visible}
    .overview-stage-v5 + .overview-legend{margin-top:12px}
    @media(max-width:620px){.overview-stage-v5{height:280px}}
  `;
  document.head.appendChild(style);
})();

function overviewTrendHtmlV5() {
  const series = overviewSeriesV4();
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!state.exams.length) {
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
  }
  if (!visible.length) {
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">⌁</div>还没有可用于总览的真实成绩</div></div>`;
  }
  return `<div class="overview-stage-v5">${overviewChartHtmlV4(series)}</div>${overviewLegendHtmlV4(series)}`;
}

chartHtml = function chartHtmlV5() {
  if (state.subject === '总览') return overviewTrendHtmlV5();
  return chartHtmlBeforeV5();
};

homeHtml = function homeHtmlV5() {
  let html = homeHtmlV3();
  const overviewButton = `<button class="chip ${state.subject === '总览' ? 'active' : ''}" data-subject="总览">总览</button>`;
  html = html.replace('<div class="chips">', `<div class="chips">${overviewButton}`);

  if (state.subject === '总览') {
    html = html.replace(
      '<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>',
      '<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>'
    );
    html = html.replace(
      '<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>',
      '<div class="subtle-note">真实成绩 · 得分率</div>'
    );
    html = html.replace(
      '<div class="chart-wrap" id="chart">',
      '<div class="chart-wrap overview-mode-v5" id="chart">'
    );
  }
  return html;
};

function bindOverviewTrendTooltipV5() {
  if (state.subject !== '总览') return;
  const container = $('#chart');
  const tip = $('#overviewChartTip', container || document);
  if (!container || !tip) return;
  $$('[data-tip]', container).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = container.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

bindPage = function bindPageV5() {
  bindPageBeforeV5();
  bindOverviewTrendTooltipV5();
};

/* ===== app-v6.js ===== */
// v6: dynamic chart/radar axis ranges to improve visual separation on mobile
(function injectV6Styles() {
  if (document.getElementById('app-v6-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v6-extra-style';
  style.textContent = `
    .axis-caption-v6{font-size:11px;color:var(--muted);margin-top:8px}
    .radar-wrap{height:470px}
    .radar-wrap svg{display:block;width:100%;height:100%}
    @media(max-width:620px){.radar-wrap{height:430px}}
  `;
  document.head.appendChild(style);
})();

function calcDynamicAxisRangeV6(values, options = {}) {
  const nums = (values || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v))).map(Number);
  const minLimit = options.minLimit ?? 0;
  const maxLimit = options.maxLimit ?? 100;
  const step = options.step ?? 5;
  const minSpan = options.minSpan ?? 20;
  const padRatio = options.padRatio ?? 0.18;
  if (!nums.length) return { min: minLimit, max: maxLimit, ticks: 5 };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  const rawSpan = Math.max(max - min, minSpan * 0.4);
  const pad = Math.max(step, rawSpan * padRatio);
  min = Math.max(minLimit, Math.floor((min - pad) / step) * step);
  max = Math.min(maxLimit, Math.ceil((max + pad) / step) * step);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = Math.max(minLimit, Math.floor((mid - minSpan / 2) / step) * step);
    max = Math.min(maxLimit, Math.ceil((mid + minSpan / 2) / step) * step);
    if (max - min < minSpan) {
      if (min === minLimit) max = Math.min(maxLimit, min + minSpan);
      else min = Math.max(minLimit, max - minSpan);
    }
  }
  if (min === max) {
    max = Math.min(maxLimit, min + minSpan);
    min = Math.max(minLimit, max - minSpan);
  }
  return { min, max, ticks: 5 };
}

if (typeof overviewChartHtmlV4 === 'function') {
  overviewChartHtmlV4 = function overviewChartHtmlDynamicV6(series) {
    if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
    const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
    if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>还没有可用于总览图的真实成绩</div></div>`;

    const points = state.exams.map((exam) => ({
      name: exam.name,
      date: exam.exam_date,
      values: visible.map((item) => item.getValue(exam))
    }));
    const allValues = points.flatMap((point) => point.values).filter((v) => v !== null);
    const axis = calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 });

    const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46;
    const cw = W - L - R, ch = H - T - B;
    const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
    const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;

    let grid = '';
    for (let i = 0; i <= axis.ticks; i += 1) {
      const value = axis.max - ((axis.max - axis.min) * i / axis.ticks);
      const yy = T + (ch * i / axis.ticks);
      grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`;
    }

    const lines = visible.map((seriesItem, seriesIndex) => {
      let d = '';
      let started = false;
      let circles = '';
      points.forEach((point, pointIndex) => {
        const value = point.values[seriesIndex];
        if (value === null) {
          started = false;
          return;
        }
        const xx = x(pointIndex), yy = y(value);
        d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
        started = true;
        circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} · ${seriesItem.label} ${formatPercent(value)}"/>`;
      });
      return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    }).join('');
    const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div><div class="axis-caption-v6">纵轴已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
  };
}

if (typeof radarChartHtml === 'function') {
  radarCardHtml = function radarCardHtmlV6() {
    const available = radarAvailableExams();
    const selected = selectedRadarExams();
    return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。</p></div></div>
      <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加对比时，会自动只显示这些考试共同拥有数据的科目；纵轴会按当前选中的数据动态缩放，差异更清楚。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
      <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
  };

  radarChartHtml = function radarChartHtmlDynamicV6(selected) {
    if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
    const subjects = (typeof subjectsWithDataV4 === 'function' ? subjectsWithDataV4(selected, state.radarMode, 'all') : SUBJECTS.filter((subject) => selected.every((exam) => scoreRate(exam, subject, state.radarMode) !== null)));
    if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目数据，暂时无法叠加比较</div></div>`;

    const allValues = [];
    selected.forEach((exam) => subjects.forEach((subject) => allValues.push(scoreRate(exam, subject, state.radarMode))));
    const axis = calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 });

    const W = 620, H = 430;
    const cx = 310, cy = 210, radius = 190;
    const angleStep = (Math.PI * 2) / subjects.length;
    const angleAt = (i) => -Math.PI / 2 + i * angleStep;
    const pointAt = (ratio, i) => {
      const angle = angleAt(i);
      const r = radius * ratio;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    };
    const normalize = (value) => Math.max(0, Math.min(1, (value - axis.min) / (axis.max - axis.min)));

    let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">${Math.round(axis.min)}%</text>`;
    for (let i = 1; i <= axis.ticks; i += 1) {
      const ratio = i / axis.ticks;
      const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
      const labelValue = axis.min + ((axis.max - axis.min) * i / axis.ticks);
      grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
      grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(labelValue)}%</text>`;
    }
    subjects.forEach((subject, i) => {
      const [x, y] = pointAt(1, i);
      grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
      const labelPos = pointAt(1.11, i);
      grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
    });

    const polygons = selected.map((exam, index) => {
      const color = RADAR_COLORS[index % RADAR_COLORS.length];
      const points = subjects.map((subject, i) => pointAt(normalize(scoreRate(exam, subject, state.radarMode)), i).join(',')).join(' ');
      const circles = subjects.map((subject, i) => {
        const [x, y] = pointAt(normalize(scoreRate(exam, subject, state.radarMode)), i);
        return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
      }).join('');
      return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">纵轴已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
  };
}

/* ===== app-v7.js ===== */
// v7: customizable subjects + scientifically normalized rank trends
const DATA_API_V7 = '/api/score-tracker-data-api';
state.subjectConfigs = state.subjectConfigs || [];
state.trendMetric = state.trendMetric || 'score';

(function injectV7Styles() {
  if ($('#app-v7-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v7-extra-style';
  style.textContent = `
    .trend-metric-toggle-v7{display:flex;align-items:center;gap:8px;margin:0 0 10px;flex-wrap:wrap}
    .trend-metric-toggle-v7 .label{font-size:12px;font-weight:700;color:var(--muted)}
    .metric-btn-v7{border:1px solid var(--line);background:#fff;color:var(--muted);border-radius:999px;padding:8px 12px;font-size:12px}
    .metric-btn-v7.active{background:var(--text);border-color:var(--text);color:#fff}
    .rank-method-v7{font-size:11px;line-height:1.6;color:var(--muted);margin-top:8px}
    .rank-method-v7 b{color:var(--text)}
    .chart-wrap.rank-mode-v7{height:auto}
    .rank-chart-stage-v7{height:310px;position:relative;margin-top:4px}
    .rank-chart-stage-v7 svg{width:100%;height:100%;overflow:visible}
    .rank-legend-v7{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .rank-legend-v7 span{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:11px;color:#596474}
    .rank-legend-v7 i{width:9px;height:9px;border-radius:50%;display:block}
    .subject-settings-v7{margin-top:18px;padding:24px}
    .subject-settings-head-v7{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
    .subject-chip-list-v7{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}
    .subject-chip-v7{display:inline-flex;align-items:center;gap:6px;background:#f7f8fb;border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:#586477}
    .subject-config-list-v7{display:grid;gap:9px;margin-top:14px}
    .subject-config-row-v7{display:grid;grid-template-columns:minmax(0,1fr) 110px 38px;gap:8px;align-items:center}
    .subject-config-row-v7 input{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;outline:none;min-width:0}
    .subject-config-row-v7 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .remove-subject-v7{width:38px;height:38px;border-radius:11px;border:1px solid var(--line);background:#fff;color:var(--danger);font-size:18px}
    .subject-manager-actions-v7{display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap}
    .section-head-v7{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:22px;margin-bottom:10px}
    .section-head-v7 h4{margin:0;font-size:15px}
    .section-head-v7 p{margin:4px 0 0;font-size:11px;color:var(--muted);line-height:1.55}
    .rank-table-v7{border:1px solid var(--line);border-radius:17px;overflow:hidden}
    .rank-row-v7{display:grid;grid-template-columns:minmax(70px,1fr) 1fr 1fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
    .rank-row-v7:last-child{border-bottom:0}
    .rank-row-v7.header{background:#f7f8fb;color:var(--muted);font-size:11px;font-weight:700}
    .rank-row-v7.total{background:#fbfcff}
    .rank-row-v7 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;outline:none;background:#fff}
    .rank-row-v7 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .rank-science-box-v7{margin-top:12px;background:#f4f8ff;border:1px solid #e3ebfb;border-radius:14px;padding:12px 13px;font-size:11px;color:#586477;line-height:1.65}
    .rank-science-box-v7 b{color:#27344a}
    @media(max-width:620px){
      .rank-chart-stage-v7{height:285px}
      .subject-settings-v7{padding:18px 16px}
      .subject-settings-head-v7{display:block}.subject-settings-head-v7 button{margin-top:12px}
      .subject-config-row-v7{grid-template-columns:minmax(0,1fr) 88px 36px}
      .rank-row-v7{grid-template-columns:72px minmax(0,1fr) minmax(0,1fr);padding:9px 9px;gap:6px}
      .rank-row-v7 input{font-size:12px;padding:9px 6px}
      .rank-row-v7 .subject-name{font-size:12px}
    }
  `;
  document.head.appendChild(style);
})();

async function dataApiV7(action, payload = {}) {
  const res = await fetch(DATA_API_V7, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: state.token, ...payload })
  });
  const data = await res.json().catch(() => ({ error: '网络响应异常' }));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('st_token');
      state.token = '';
      state.user = null;
      renderLogin();
    }
    throw window.__scoreTrackerResponseError ? window.__scoreTrackerResponseError(res, data, action) : new Error(data.error || '请求失败');
  }
  return data;
}

function subjectShortV7(name) {
  const value = String(name || '');
  if (!value) return '';
  if (/^[\u4e00-\u9fff]/.test(value)) return value.slice(0, 2);
  return value.slice(0, 4);
}

function applySubjectConfigsV7(configs) {
  const clean = (configs || [])
    .map((item, index) => ({
      id: item.id || null,
      name: String(item.name || '').trim(),
      defaultMax: Number(item.defaultMax ?? 100),
      sortOrder: Number(item.sortOrder ?? index + 1)
    }))
    .filter((item) => item.name && Number.isFinite(item.defaultMax) && item.defaultMax > 0);
  if (!clean.length) return;
  state.subjectConfigs = clean;
  SUBJECTS.splice(0, SUBJECTS.length, ...clean.map((item) => item.name));
  clean.forEach((item) => {
    SUBJECT_MAX[item.name] = item.defaultMax;
    SUBJECT_SHORT[item.name] = subjectShortV7(item.name);
  });
  if (!['总览', '总分', ...SUBJECTS].includes(state.subject)) state.subject = '总分';
}

const loadExamsBeforeV7 = loadExams;
loadExams = async function loadExamsV7() {
  try {
    const data = await dataApiV7('list_exams');
    applySubjectConfigsV7(data.subjects || []);
    state.exams = data.exams || [];
    ensureRadarSelection();
  } catch (error) {
    console.error('v7 data api fallback', error);
    await loadExamsBeforeV7();
    if (!state.subjectConfigs.length) {
      applySubjectConfigsV7(SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })));
    }
  }
};

function rankPerformanceV7(rank, participants) {
  const r = num(rank);
  const n = num(participants);
  if (r === null || n === null || r < 1 || n < 1 || r > n) return null;
  if (n === 1) return 100;
  return Math.max(0, Math.min(100, ((n - r) / (n - 1)) * 100));
}

function rankInfoV7(exam, subject) {
  if (!exam) return { rank: null, participants: null, performance: null };
  if (subject === '总分') {
    const rank = num(exam.total_rank);
    const participants = num(exam.total_participants);
    return { rank, participants, performance: rankPerformanceV7(rank, participants) };
  }
  const row = exam.scores?.[subject] || {};
  const rank = num(row.rank);
  const participants = num(row.participants) ?? num(exam.total_participants);
  return { rank, participants, performance: rankPerformanceV7(rank, participants) };
}

function rankSeriesColorsV7() {
  if (typeof OVERVIEW_COLORS_V4 !== 'undefined') return OVERVIEW_COLORS_V4;
  return ['#18212f', '#5d72e8', '#32a77a', '#e59b45', '#df5f68', '#8f62db', '#22a6b3', '#f06a8b', '#6c87ff', '#7a8a9a'];
}

function dynamicRangeV7(values) {
  if (typeof calcDynamicAxisRangeV6 === 'function') {
    return calcDynamicAxisRangeV6(values, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 15, padRatio: 0.18 });
  }
  const nums = values.filter((v) => v !== null && Number.isFinite(Number(v))).map(Number);
  if (!nums.length) return { min: 0, max: 100, ticks: 5 };
  let min = Math.max(0, Math.floor((Math.min(...nums) - 5) / 5) * 5);
  let max = Math.min(100, Math.ceil((Math.max(...nums) + 5) / 5) * 5);
  if (max - min < 15) {
    min = Math.max(0, min - 5);
    max = Math.min(100, Math.max(max + 5, min + 15));
  }
  return { min, max, ticks: 5 };
}

function rankChartHtmlV7() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">⌁</div>记录排名后，这里会显示排名趋势</div></div>`;

  const colors = rankSeriesColorsV7();
  const series = state.subject === '总览'
    ? ['总分', ...SUBJECTS].map((subject, index) => ({ subject, color: colors[index % colors.length] }))
    : [{ subject: state.subject, color: '#5d72e8' }];
  const visible = series.filter((item) => state.exams.some((exam) => rankInfoV7(exam, item.subject).performance !== null));
  if (!visible.length) {
    const hasRawRank = series.some((item) => state.exams.some((exam) => rankInfoV7(exam, item.subject).rank !== null));
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>${hasRawRank ? '已经录入名次，但还缺参考人数。补充参考人数后才能进行可比的排名趋势分析。' : '这个科目还没有排名数据'}</div></div>`;
  }

  const points = state.exams.map((exam) => ({
    exam,
    date: exam.exam_date,
    values: visible.map((item) => rankInfoV7(exam, item.subject))
  }));
  const axis = dynamicRangeV7(points.flatMap((point) => point.values.map((value) => value.performance)).filter((v) => v !== null));
  const W = 760, H = 310, L = 48, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;

  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) {
    const value = axis.max - ((axis.max - axis.min) * i / axis.ticks);
    const yy = T + (ch * i / axis.ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`;
  }

  const lines = visible.map((item, seriesIndex) => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((point, pointIndex) => {
      const info = point.values[seriesIndex];
      if (info.performance === null) {
        started = false;
        return;
      }
      const xx = x(pointIndex), yy = y(info.performance);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      const raw = `${info.rank}/${info.participants}`;
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} · ${item.subject} 第${raw}名 · 排名表现 ${formatPercent(info.performance)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === '总览' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
  const legend = state.subject === '总览'
    ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>`
    : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="rank-method-v7"><b>排名表现</b> = 按参考人数标准化后的超越率；越高越好。这样不同考试参考人数变化时，比直接比较“第几名”更公平。</div>`;
}

const chartHtmlBeforeV7 = chartHtml;
chartHtml = function chartHtmlV7() {
  if (state.trendMetric === 'rank') return rankChartHtmlV7();
  return chartHtmlBeforeV7();
};

const homeHtmlBeforeV7 = homeHtml;
homeHtml = function homeHtmlV7() {
  let html = homeHtmlBeforeV7();
  html = html.replace('记录语数英物化生史地政 9 科的目标与真实成绩，折线图看总趋势，雷达图看结构变化，更容易找到弱项并追踪改善。', '科目可以自由设置：既能记录学校学科，也能拆成题型、模块或备考项目；成绩、排名和雷达图一起看，更容易找到真正的薄弱点。');
  const metricToggle = `<div class="trend-metric-toggle-v7"><span class="label">趋势类型</span><button class="metric-btn-v7 ${state.trendMetric === 'score' ? 'active' : ''}" data-trend-metric="score">成绩</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">排名</button></div>`;
  html = html.replace('<div class="chips">', `${metricToggle}<div class="chips">`);

  if (state.trendMetric === 'rank') {
    html = html.replace('<h3 class="card-title">成绩趋势</h3>', '<h3 class="card-title">排名趋势</h3>');
    html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">用参考人数把名次转换成可比较的“排名表现”，避免考试难度和人数变化干扰判断</p>');
    html = html.replace('<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>', '<p class="card-sub">总分与各科排名统一换算为排名表现；参考人数不同也能放在一起比较</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">越高越好 · 原始名次会显示在数据点提示里</div>');
    html = html.replace('<div class="subtle-note">真实成绩 · 得分率</div>', '<div class="subtle-note">排名表现 · 标准化超越率</div>');
    html = html.replace('<div class="chart-wrap" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
    html = html.replace('<div class="chart-wrap overview-mode-v5" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
  }
  return html;
};

const accountHtmlBeforeV7 = accountHtml;
accountHtml = function accountHtmlV7() {
  const base = accountHtmlBeforeV7();
  const subjects = state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 }));
  return `${base}<div class="card subject-settings-v7"><div class="subject-settings-head-v7"><div><h3 class="card-title">科目设置</h3><p class="card-sub">可以把“科目”改造成学科、题型、模块或备考项目。比如：阅读理解、完形填空、翻译、写作。</p></div><button class="secondary" id="manageSubjectsBtn">管理科目</button></div><div class="subject-chip-list-v7">${subjects.map((item) => `<span class="subject-chip-v7"><b>${escapeHtml(item.name)}</b> · 满分 ${formatScore(item.defaultMax)}</span>`).join('')}</div><div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。</div></div>`;
};

function openSubjectManagerV7() {
  const subjects = (state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })))
    .map((item) => ({ ...item }));
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>管理科目</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="info-box"><b>可以自定义。</b> 科目不一定是学校学科，也可以是“阅读理解、写作、逻辑、数量关系”等你想长期追踪的模块。最多 20 个。</div><div class="subject-config-list-v7" id="subjectConfigList"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addSubjectRowV7">＋ 添加科目</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveSubjectsV7">保存设置</button></div></div><p class="form-note">修改已有科目名称会被视为新的科目；原名称的历史成绩仍保留在云端，只是暂时隐藏。</p></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;

  const list = $('#subjectConfigList', modal);
  const rowHtml = (item = { name: '', defaultMax: 100 }) => `<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="${escapeHtml(item.name || '')}" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="${item.defaultMax ?? 100}" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>`;
  const renderRows = () => {
    list.innerHTML = subjects.map((item) => rowHtml(item)).join('');
    $$('.remove-subject-v7', list).forEach((button, index) => button.onclick = () => {
      if (subjects.length <= 1) return toast('至少保留 1 个科目');
      subjects.splice(index, 1);
      renderRows();
    });
  };
  renderRows();

  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('#addSubjectRowV7', modal).onclick = () => {
    if (subjects.length >= 20) return toast('最多设置 20 个科目');
    subjects.push({ name: '', defaultMax: 100 });
    renderRows();
    $('.subject-config-row-v7:last-child .subject-name-input-v7', list)?.focus();
  };
  $('#saveSubjectsV7', modal).onclick = async () => {
    const rows = $$('.subject-config-row-v7', list);
    const payload = rows.map((row) => ({
      name: $('.subject-name-input-v7', row).value.trim(),
      defaultMax: $('.subject-max-input-v7', row).value
    }));
    if (payload.some((item) => !item.name)) return toast('请填写完整的科目名称');
    if (new Set(payload.map((item) => item.name)).size !== payload.length) return toast('科目名称不能重复');
    if (payload.some((item) => !Number(item.defaultMax) || Number(item.defaultMax) <= 0)) return toast('默认满分必须大于 0');
    const button = $('#saveSubjectsV7', modal);
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const data = await dataApiV7('save_subjects', { subjects: payload });
      applySubjectConfigsV7(data.subjects || []);
      close();
      render();
      toast('科目设置已保存');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      button.textContent = '保存设置';
    }
  };
}

openExam = function openExamV7(exam = null) {
  const editing = !!exam;
  const today = new Date().toISOString().slice(0, 10);
  const scores = exam?.scores || {};
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? '编辑考试' : '记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="例如：期中考试 / 2023 英语真题"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div>
    <div class="section-head-v7"><div><h4>成绩</h4><p>可以只录目标、只录真实成绩，或者两者都录。</p></div></div>
    <div class="score-table"><div class="score-row header"><span>科目</span><span>目标成绩</span><span>真实成绩</span><span>满分</span></div>${SUBJECTS.map((subject) => `<div class="score-row" data-score-row="${escapeHtml(subject)}"><span class="subject-name">${escapeHtml(subject)}</span><input inputmode="decimal" class="target-input" placeholder="目标" value="${scores[subject]?.target ?? ''}"><input inputmode="decimal" class="actual-input" placeholder="考后补录" value="${scores[subject]?.actual ?? ''}"><input inputmode="decimal" class="max-input" value="${scores[subject]?.max ?? defaultMax(subject)}"></div>`).join('')}</div>
    <div class="section-head-v7"><div><h4>排名（可选）</h4><p>建议同时填写参考人数。各科参考人数留空时，会自动使用“总分”的参考人数。</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>科目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span class="subject-name">总分</span><input id="totalRankV7" inputmode="numeric" pattern="[0-9]*" placeholder="例如 36" value="${exam?.total_rank ?? ''}"><input id="totalParticipantsV7" inputmode="numeric" pattern="[0-9]*" placeholder="例如 620" value="${exam?.total_participants ?? ''}"></div>${SUBJECTS.map((subject) => `<div class="rank-row-v7" data-rank-row="${escapeHtml(subject)}"><span class="subject-name">${escapeHtml(subject)}</span><input class="rank-input-v7" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="${scores[subject]?.rank ?? ''}"><input class="participants-input-v7" inputmode="numeric" pattern="[0-9]*" placeholder="同总人数" value="${scores[subject]?.participants ?? ''}"></div>`).join('')}</div>
    <div class="rank-science-box-v7"><b>为什么要填参考人数？</b> 单看“第 30 名”无法判断是在 100 人里还是 1000 人里。趋势图会把名次换算成标准化的“排名表现（超越率）”：第 1 名接近 100%，越高越好，因此不同考试难度、不同参考人数之间更可比。</div>
    <p class="form-note">科目与默认满分可以在「账号 → 科目设置」中调整。未填写的科目不会计入总分。</p><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing ? '保存修改' : '保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;
  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
};

validateExam = function validateExamV7(exam) {
  const totalRank = num(exam.total_rank);
  const totalParticipants = num(exam.total_participants);
  if (totalRank !== null && (!Number.isInteger(totalRank) || totalRank < 1)) return '总排名请输入正整数';
  if (totalParticipants !== null && (!Number.isInteger(totalParticipants) || totalParticipants < 1)) return '参考人数请输入正整数';
  if (totalRank !== null && totalParticipants !== null && totalRank > totalParticipants) return '总排名不能大于参考人数';

  for (const subject of SUBJECTS) {
    const row = exam.scores[subject] || {};
    const max = num(row.max) ?? defaultMax(subject);
    const target = num(row.target);
    const actual = num(row.actual);
    const rank = num(row.rank);
    const participants = num(row.participants);
    const effectiveParticipants = participants ?? totalParticipants;
    if (max <= 0) return `${subject} 的满分必须大于 0`;
    if (target !== null && target > max) return `${subject} 的目标成绩不能超过满分 ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${subject} 的真实成绩不能超过满分 ${formatScore(max)}`;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) return `${subject}排名请输入正整数`;
    if (participants !== null && (!Number.isInteger(participants) || participants < 1)) return `${subject}参考人数请输入正整数`;
    if (rank !== null && effectiveParticipants !== null && rank > effectiveParticipants) return `${subject}排名不能大于参考人数`;
  }
  return '';
};

saveExam = async function saveExamV7(id, modal) {
  const btn = $('.save-btn', modal);
  const exam = {
    id,
    name: $('#examName', modal).value.trim(),
    exam_date: $('#examDate', modal).value,
    total_rank: $('#totalRankV7', modal)?.value || '',
    total_participants: $('#totalParticipantsV7', modal)?.value || '',
    scores: {}
  };
  $$('[data-score-row]', modal).forEach((row) => {
    exam.scores[row.dataset.scoreRow] = {
      target: $('.target-input', row).value,
      actual: $('.actual-input', row).value,
      max: $('.max-input', row).value,
      rank: '',
      participants: ''
    };
  });
  $$('[data-rank-row]', modal).forEach((row) => {
    const subject = row.dataset.rankRow;
    exam.scores[subject] = exam.scores[subject] || { target: '', actual: '', max: defaultMax(subject) };
    exam.scores[subject].rank = $('.rank-input-v7', row).value;
    exam.scores[subject].participants = $('.participants-input-v7', row).value;
  });
  if (!exam.name || !exam.exam_date) return toast('请填写考试名称和日期');
  const error = validateExam(exam);
  if (error) return toast(error);

  btn.disabled = true;
  btn.textContent = '保存中…';
  try {
    await dataApiV7('save_exam', { exam });
    await loadExams();
    modal.remove();
    state.modal = null;
    render();
    toast(id ? '已保存修改' : '考试已记录');
  } catch (error) {
    toast(error.message);
    btn.disabled = false;
    btn.textContent = id ? '保存修改' : '保存考试';
  }
};

const recordHtmlBeforeV7 = recordHtml;
recordHtml = function recordHtmlV7(exam) {
  let html = recordHtmlBeforeV7(exam);
  const info = rankInfoV7(exam, '总分');
  if (info.rank !== null) {
    const badge = `<span class="score-tag"><b>总排名 ${info.rank}${info.participants ? ` / ${info.participants}` : ''}</b>${info.performance !== null ? ` · 排名表现 ${formatPercent(info.performance)}` : ''}</span>`;
    html = html.replace('</div><div class="record-actions">', `${badge}</div><div class="record-actions">`);
  }
  return html;
};

const bindPageBeforeV7 = bindPage;
bindPage = function bindPageV7() {
  bindPageBeforeV7();
  $$('[data-trend-metric]').forEach((button) => button.onclick = () => {
    state.trendMetric = button.dataset.trendMetric;
    render();
  });
  $('#manageSubjectsBtn')?.addEventListener('click', openSubjectManagerV7);
};

const renderLoginBeforeV7 = renderLogin;
renderLogin = function renderLoginV7(error = '') {
  renderLoginBeforeV7(error);
  const help = $('.auth-help');
  if (help) help.textContent = '支持自定义科目、目标/真实成绩、排名趋势与多次考试雷达对比。';
};


/* ===== app-v8.js ===== */
// v8: preserve edits while adding/removing custom subjects and clarify rank-comparison scope
openSubjectManagerV7 = function openSubjectManagerV8() {
  const subjects = (state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })))
    .map((item) => ({ ...item }));
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>管理科目</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="info-box"><b>可以自定义。</b> 科目不一定是学校学科，也可以是“阅读理解、写作、逻辑、数量关系”等你想长期追踪的模块。最多 20 个。</div><div class="subject-config-list-v7" id="subjectConfigList"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addSubjectRowV7">＋ 添加科目</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveSubjectsV7">保存设置</button></div></div><p class="form-note">移除科目不会删除历史成绩；修改名称会被视为新的科目，原名称的历史成绩仍保留在云端。</p></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;

  const list = $('#subjectConfigList', modal);
  const rowHtml = (item = { name: '', defaultMax: 100 }) => `<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="${escapeHtml(item.name || '')}" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="${item.defaultMax ?? 100}" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>`;

  const syncRows = () => {
    const rows = $$('.subject-config-row-v7', list);
    if (!rows.length) return;
    const next = rows.map((row) => ({
      name: $('.subject-name-input-v7', row).value,
      defaultMax: $('.subject-max-input-v7', row).value
    }));
    subjects.splice(0, subjects.length, ...next);
  };

  const renderRows = () => {
    list.innerHTML = subjects.map((item) => rowHtml(item)).join('');
    $$('.remove-subject-v7', list).forEach((button, index) => button.onclick = () => {
      if (subjects.length <= 1) return toast('至少保留 1 个科目');
      syncRows();
      subjects.splice(index, 1);
      renderRows();
    });
  };
  renderRows();

  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('#addSubjectRowV7', modal).onclick = () => {
    if (subjects.length >= 20) return toast('最多设置 20 个科目');
    syncRows();
    subjects.push({ name: '', defaultMax: 100 });
    renderRows();
    $('.subject-config-row-v7:last-child .subject-name-input-v7', list)?.focus();
  };
  $('#saveSubjectsV7', modal).onclick = async () => {
    syncRows();
    const payload = subjects.map((item) => ({ name: String(item.name || '').trim(), defaultMax: item.defaultMax }));
    if (payload.some((item) => !item.name)) return toast('请填写完整的科目名称');
    if (new Set(payload.map((item) => item.name)).size !== payload.length) return toast('科目名称不能重复');
    if (payload.some((item) => !Number(item.defaultMax) || Number(item.defaultMax) <= 0)) return toast('默认满分必须大于 0');
    const button = $('#saveSubjectsV7', modal);
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const data = await dataApiV7('save_subjects', { subjects: payload });
      applySubjectConfigsV7(data.subjects || []);
      close();
      render();
      toast('科目设置已保存');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      button.textContent = '保存设置';
    }
  };
};

const openExamBeforeV8 = openExam;
openExam = function openExamV8(exam = null) {
  openExamBeforeV8(exam);
  const box = $('.rank-science-box-v7', state.modal || document);
  if (box && !box.dataset.scopeNote) {
    box.dataset.scopeNote = '1';
    box.innerHTML += '<br><b>比较口径也要一致：</b>建议长期都使用同一种排名口径，例如都填“年级排名”，不要把班级排名和年级排名混在同一条趋势里。';
  }
};

/* ===== app-v9.js ===== */
// v9: add normalized rank percentile to radar comparison
(function injectV9Styles() {
  if ($('#app-v9-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v9-extra-style';
  style.textContent = `
    .radar-mode-note-v9{font-size:11px;line-height:1.6;color:var(--muted);margin-top:7px}
    .radar-mode-note-v9 b{color:var(--text)}
  `;
  document.head.appendChild(style);
})();

function radarValueV9(exam, subject, mode = state.radarMode) {
  if (mode === 'rank') {
    return typeof rankInfoV7 === 'function' ? rankInfoV7(exam, subject).performance : null;
  }
  return scoreRate(exam, subject, mode);
}

function radarSubjectsV9(exams, mode = state.radarMode) {
  if (!exams.length) return [];
  return SUBJECTS.filter((subject) => exams.every((exam) => radarValueV9(exam, subject, mode) !== null));
}

radarAvailableExams = function radarAvailableExamsV9(mode = state.radarMode) {
  return state.exams.filter((exam) => SUBJECTS.some((subject) => radarValueV9(exam, subject, mode) !== null));
};

radarCardHtml = function radarCardHtmlV9() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  const rankMode = state.radarMode === 'rank';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">${rankMode ? '按排名百分位绘制：越靠外代表相对排名越好；可叠加多次考试观察竞争力变化。' : '按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。'}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">排名百分位</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加时只显示所选考试共同拥有数据的科目；坐标轴会按当前数据动态缩放。</div>${rankMode ? '<div class="radar-mode-note-v9"><b>排名百分位不是直接用“第几名”：</b>会结合参考人数标准化。第 1 名接近 100%，越高越好；不同考试人数变化时也更可比。</div>' : ''}<div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : `<span class="subtle-note">${rankMode ? '当前还没有同时填写“名次 + 参考人数”的科目排名数据' : '当前还没有可用于雷达图的数据'}</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV9(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>${state.radarMode === 'rank' ? '选择有排名数据的考试后，这里会显示各科排名百分位' : '选择 1 次或多次考试后，这里会显示全部科目的结构变化'}</div></div>`;
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>${state.radarMode === 'rank' ? '所选考试没有共同且完整的排名数据，请检查各科名次和参考人数' : '所选考试没有共同的科目数据，暂时无法叠加比较'}</div></div>`;

  const allValues = [];
  selected.forEach((exam) => subjects.forEach((subject) => allValues.push(radarValueV9(exam, subject))));
  const axis = typeof calcDynamicAxisRangeV6 === 'function'
    ? calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 })
    : { min: 0, max: 100, ticks: 5 };

  const W = 620, H = 430;
  const cx = 310, cy = 210, radius = 190;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i);
    const r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const normalize = (value) => Math.max(0, Math.min(1, (value - axis.min) / (axis.max - axis.min)));

  let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">${Math.round(axis.min)}%</text>`;
  for (let i = 1; i <= axis.ticks; i += 1) {
    const ratio = i / axis.ticks;
    const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
    const labelValue = axis.min + ((axis.max - axis.min) * i / axis.ticks);
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(labelValue)}%</text>`;
  }
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    const labelPos = pointAt(1.11, i);
    const label = SUBJECT_SHORT[subject] || subjectShortV7?.(subject) || String(subject).slice(0, 2);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${escapeHtml(label)}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(normalize(radarValueV9(exam, subject)), i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const value = radarValueV9(exam, subject);
      const [x, y] = pointAt(normalize(value), i);
      let tip = `${escapeHtml(exam.name)} · ${escapeHtml(subject)} ${formatPercent(value)}`;
      if (state.radarMode === 'rank' && typeof rankInfoV7 === 'function') {
        const info = rankInfoV7(exam, subject);
        tip = `${escapeHtml(exam.name)} · ${escapeHtml(subject)} 第${info.rank}/${info.participants}名 · 排名百分位 ${formatPercent(value)}`;
      }
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${tip}"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  const label = state.radarMode === 'rank' ? '排名百分位' : '纵轴';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">${label}已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
};

radarSummaryHtml = function radarSummaryHtmlV9(selected) {
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="subtle-note">所选考试没有共同完整的数据，暂时无法计算。</div></div><div class="summary-card"><h4>对比说明</h4><div class="subtle-note">请减少叠加考试，或补齐相同科目的${state.radarMode === 'rank' ? '名次和参考人数' : '成绩'}。</div></div></div>`;

  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = subjects
    .map((subject) => ({ subject, value: radarValueV9(latest, subject) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);
  const comparisons = subjects
    .map((subject) => ({
      subject,
      delta: radarValueV9(latest, subject) - radarValueV9(earliest, subject),
      latest: radarValueV9(latest, subject)
    }))
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const average = subjects.reduce((sum, subject) => sum + radarValueV9(latest, subject), 0) / subjects.length;
  const isRank = state.radarMode === 'rank';

  return `<div class="radar-summary"><div class="summary-card"><h4>${isRank ? '当前排名相对薄弱科目' : '当前薄弱科目'}</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>${formatPercent(item.value)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与对比科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? '平均排名百分位' : '整体平均得分率'}：<span class="comparison-strong">${formatPercent(average)}</span></div><div>${isRank ? '排名提升最大' : '进步最大'}：${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? '平均排名百分位' : '平均得分率'}：<span class="comparison-strong">${formatPercent(average)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到${isRank ? '各科相对排名' : '弱项'}改善了多少。</div></div>`}</div></div>`;
};

// Radar points also support tap/hover tooltips in v9.
const bindPageBeforeV9 = bindPage;
bindPage = function bindPageV9() {
  bindPageBeforeV9();
  const radar = $('#radarChart');
  if (!radar) return;
  let tip = $('.tooltip-card', radar);
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip-card';
    radar.appendChild(tip);
  }
  $$('[data-tip]', radar).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = radar.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
};

/* ===== app-v10.js ===== */
// v10: subjects belong to each exam; hide/delete controls; hidden exams stay out of charts
state.allExams = state.allExams || [];

(function injectV10Styles() {
  if ($('#app-v10-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v10-extra-style';
  style.textContent = `
    .exam-subjects-v10{display:grid;gap:12px;margin-top:12px}
    .exam-subject-card-v10{border:1px solid var(--line);border-radius:16px;background:#fbfcfe;padding:13px}
    .exam-subject-head-v10{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:8px;align-items:center;margin-bottom:10px}
    .exam-subject-name-v10{border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 11px;font-weight:700;min-width:0;width:100%;outline:none}
    .exam-subject-card-v10 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .remove-exam-subject-v10{width:38px;height:38px;border:1px solid #f0d9dc;border-radius:11px;background:#fff;color:var(--danger);font-size:18px}
    .exam-score-grid-v10{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .exam-rank-grid-v10{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .mini-field-v10{display:grid;gap:5px;min-width:0}
    .mini-field-v10 label{font-size:10px;color:var(--muted);font-weight:700}
    .mini-field-v10 input{width:100%;min-width:0;border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 8px;outline:none}
    .exam-subject-toolbar-v10{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}
    .template-note-v10{font-size:11px;color:var(--muted);line-height:1.55}
    .visibility-box-v10{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid var(--line);border-radius:14px;background:#f7f8fb;margin-top:14px}
    .visibility-box-v10 b{display:block;font-size:12px;margin-bottom:3px}.visibility-box-v10 span{font-size:11px;color:var(--muted);line-height:1.5}
    .hidden-record-v10{opacity:.64;background:#fafafa}
    .hidden-badge-v10{display:inline-flex;align-items:center;border:1px solid #dfe3ea;background:#f2f4f7;color:#6d7787;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:700;margin-left:7px}
    .record-actions-v10{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .record-action-btn-v10{border:1px solid var(--line);background:#fff;border-radius:10px;padding:7px 9px;font-size:11px;color:#5f6b7b;white-space:nowrap}
    .record-action-btn-v10.danger{color:var(--danger);border-color:#f0d9dc}
    .modal-danger-row-v10{display:flex;justify-content:flex-start;margin-top:8px}
    .delete-exam-v10{border:1px solid #f1d6da;background:#fff;color:var(--danger);border-radius:12px;padding:10px 13px;font-weight:700}
    .account-note-v10{margin-top:18px;padding:22px}
    @media(max-width:620px){
      .exam-score-grid-v10{gap:6px}.exam-rank-grid-v10{gap:6px}
      .exam-subject-card-v10{padding:11px}.mini-field-v10 input{font-size:12px;padding:9px 6px}
    }
  `;
  document.head.appendChild(style);
})();

function deriveExamSubjectsV10(exams, templates = []) {
  const names = [], seen = new Set();
  for (const exam of exams || []) {
    for (const name of Object.keys(exam.scores || {})) {
      if (!seen.has(name)) { seen.add(name); names.push(name); }
    }
  }
  if (!names.length) {
    for (const item of templates || []) {
      const name = String(item.name || '').trim();
      if (name && !seen.has(name)) { seen.add(name); names.push(name); }
    }
  }
  return names;
}

function applyExamSubjectsV10(exams, templates = []) {
  state.subjectConfigs = templates || [];
  const names = deriveExamSubjectsV10(exams, templates);
  SUBJECTS.splice(0, SUBJECTS.length, ...names);
  for (const item of templates || []) {
    if (!item?.name) continue;
    SUBJECT_MAX[item.name] = Number(item.defaultMax ?? SUBJECT_MAX[item.name] ?? 100);
    SUBJECT_SHORT[item.name] = typeof subjectShortV7 === 'function' ? subjectShortV7(item.name) : String(item.name).slice(0, 2);
  }
  for (const exam of exams || []) {
    for (const [name, row] of Object.entries(exam.scores || {})) {
      if (row?.max) SUBJECT_MAX[name] = Number(row.max);
      SUBJECT_SHORT[name] = SUBJECT_SHORT[name] || (typeof subjectShortV7 === 'function' ? subjectShortV7(name) : String(name).slice(0, 2));
    }
  }
  if (!['总览', '总分', ...SUBJECTS].includes(state.subject)) state.subject = '总分';
}

loadExams = async function loadExamsV10() {
  const data = await dataApiV7('list_exams');
  state.allExams = data.exams || [];
  state.exams = state.allExams.filter((exam) => !exam.is_hidden);
  applyExamSubjectsV10(state.exams, data.subjects || []);
  state.radarSelection = (state.radarSelection || []).filter((id) => state.exams.some((exam) => exam.id === id));
  ensureRadarSelection();
};

function seedRowsV10(exam) {
  if (exam) {
    return Object.entries(exam.scores || {}).map(([name, row]) => ({
      name, target: row.target ?? '', actual: row.actual ?? '', max: row.max ?? defaultMax(name),
      rank: row.rank ?? '', participants: row.participants ?? ''
    }));
  }
  const last = state.exams.at(-1);
  if (last && Object.keys(last.scores || {}).length) {
    return Object.entries(last.scores).map(([name, row]) => ({ name, target: '', actual: '', max: row.max ?? defaultMax(name), rank: '', participants: '' }));
  }
  const templates = state.subjectConfigs?.length ? state.subjectConfigs : SUBJECTS.map((name) => ({ name, defaultMax: defaultMax(name) }));
  return templates.map((item) => ({ name: item.name, target: '', actual: '', max: item.defaultMax ?? 100, rank: '', participants: '' }));
}

openExam = function openExamV10(exam = null) {
  const editing = !!exam, today = new Date().toISOString().slice(0, 10), rows = seedRowsV10(exam);
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? '编辑考试' : '记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body">
    <div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="例如：期中考试 / 2023 英语真题"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div>
    <div class="section-head-v7"><div><h4>本次考试科目</h4><p>科目只属于这一次考试，可以随意新增、删除或改成题型/模块，不影响其他考试。</p></div></div>
    <div class="exam-subjects-v10" id="examSubjectsV10"></div>
    <div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV10">＋ 添加科目 / 模块</button><span class="template-note-v10">新考试默认沿用最近一次的科目，减少重复输入。</span></div>
    <div class="section-head-v7"><div><h4>总排名（可选）</h4><p>各科排名在上面的科目卡里填写；参考人数留空时使用这里的总参考人数。</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span class="subject-name">总分</span><input id="totalRankV10" inputmode="numeric" pattern="[0-9]*" placeholder="例如 36" value="${exam?.total_rank ?? ''}"><input id="totalParticipantsV10" inputmode="numeric" pattern="[0-9]*" placeholder="例如 620" value="${exam?.total_participants ?? ''}"></div></div>
    <div class="rank-science-box-v7"><b>排名比较：</b>趋势图和雷达图都会把“名次 + 参考人数”换算成排名百分位（超越率），越高越好。建议长期保持同一种口径，例如都记录年级排名。</div>
    <div class="visibility-box-v10"><div><b>图表显示状态</b><span>${exam?.is_hidden ? '这次考试已隐藏：记录仍保留，但不参与首页统计、趋势图和雷达图。' : '这次考试当前会参与首页统计、趋势图和雷达图。'}</span></div><button class="secondary" id="toggleHiddenModalV10">${exam?.is_hidden ? '恢复显示' : '从图表隐藏'}</button><input type="hidden" id="examHiddenV10" value="${exam?.is_hidden ? '1' : '0'}"></div>
    ${editing ? '<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamModalV10">删除这次考试</button></div>' : ''}
    <div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing ? '保存修改' : '保存考试'}</button></div>
  </div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;
  const list = $('#examSubjectsV10', modal);

  const syncRows = () => {
    const next = $$('.exam-subject-card-v10', list).map((card) => ({
      name: $('.exam-subject-name-v10', card).value,
      target: $('.target-v10', card).value,
      actual: $('.actual-v10', card).value,
      max: $('.max-v10', card).value,
      rank: $('.rank-v10', card).value,
      participants: $('.participants-v10', card).value
    }));
    rows.splice(0, rows.length, ...next);
  };
  const cardHtml = (row) => `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name || '')}" placeholder="科目 / 题型 / 模块名称"><button class="remove-exam-subject-v10" type="button" title="删除本次考试中的这个科目">×</button></div><div class="exam-score-grid-v10"><div class="mini-field-v10"><label>目标成绩</label><input class="target-v10" inputmode="decimal" placeholder="可留空" value="${row.target ?? ''}"></div><div class="mini-field-v10"><label>真实成绩</label><input class="actual-v10" inputmode="decimal" placeholder="可留空" value="${row.actual ?? ''}"></div><div class="mini-field-v10"><label>满分</label><input class="max-v10" inputmode="decimal" value="${row.max ?? 100}"></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>科目名次</label><input class="rank-v10" inputmode="numeric" pattern="[0-9]*" placeholder="可留空" value="${row.rank ?? ''}"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v10" inputmode="numeric" pattern="[0-9]*" placeholder="留空=总人数" value="${row.participants ?? ''}"></div></div></div>`;
  const renderRows = () => {
    list.innerHTML = rows.map(cardHtml).join('');
    $$('.remove-exam-subject-v10', list).forEach((button, index) => button.onclick = () => { syncRows(); rows.splice(index, 1); renderRows(); });
    $$('.exam-subject-name-v10', list).forEach((input) => input.addEventListener('blur', () => {
      const card = input.closest('.exam-subject-card-v10'), max = $('.max-v10', card), known = SUBJECT_MAX[input.value.trim()];
      if (known && (!max.value || Number(max.value) === 100)) max.value = known;
    }));
  };
  renderRows();

  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close; $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('#addExamSubjectV10', modal).onclick = () => {
    if (rows.length >= 40) return toast('单次考试最多 40 个科目 / 模块');
    syncRows(); rows.push({ name: '', target: '', actual: '', max: 100, rank: '', participants: '' }); renderRows();
    $('.exam-subject-card-v10:last-child .exam-subject-name-v10', list)?.focus();
  };
  $('#toggleHiddenModalV10', modal).onclick = () => {
    const hiddenInput = $('#examHiddenV10', modal), next = hiddenInput.value !== '1';
    hiddenInput.value = next ? '1' : '0';
    $('#toggleHiddenModalV10', modal).textContent = next ? '恢复显示' : '从图表隐藏';
    $('.visibility-box-v10 span', modal).textContent = next ? '保存后，这次考试仍会保留在记录中，但不参与首页统计、趋势图和雷达图。' : '保存后，这次考试会重新参与首页统计、趋势图和雷达图。';
  };
  $('#deleteExamModalV10', modal)?.addEventListener('click', async () => {
    if (!confirm(`确定永久删除「${exam?.name || '这次考试'}」？成绩和排名都会一起删除。`)) return;
    try { await dataApiV7('delete_exam', { examId: exam.id }); await loadExams(); close(); render(); toast('已删除'); }
    catch (error) { toast(error.message); }
  });
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
};

validateExam = function validateExamV10(exam) {
  const totalRank = num(exam.total_rank), totalParticipants = num(exam.total_participants);
  if (totalRank !== null && (!Number.isInteger(totalRank) || totalRank < 1)) return '总排名请输入正整数';
  if (totalParticipants !== null && (!Number.isInteger(totalParticipants) || totalParticipants < 1)) return '参考人数请输入正整数';
  if (totalRank !== null && totalParticipants !== null && totalRank > totalParticipants) return '总排名不能大于参考人数';
  const names = new Set();
  for (const [name, row] of Object.entries(exam.scores || {})) {
    if (!name || name.length > 40) return '科目名称不能为空且不能超过 40 个字符';
    if (names.has(name)) return `科目「${name}」重复了`; names.add(name);
    const max = num(row.max) ?? defaultMax(name), target = num(row.target), actual = num(row.actual), rank = num(row.rank), participants = num(row.participants), effective = participants ?? totalParticipants;
    if (!Number.isFinite(max) || max <= 0) return `${name} 的满分必须大于 0`;
    if (target !== null && target > max) return `${name} 的目标成绩不能超过满分 ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${name} 的真实成绩不能超过满分 ${formatScore(max)}`;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) return `${name}排名请输入正整数`;
    if (participants !== null && (!Number.isInteger(participants) || participants < 1)) return `${name}参考人数请输入正整数`;
    if (rank !== null && effective !== null && rank > effective) return `${name}排名不能大于参考人数`;
  }
  return '';
};

saveExam = async function saveExamV10(id, modal) {
  const btn = $('.save-btn', modal), exam = {
    id, name: $('#examName', modal).value.trim(), exam_date: $('#examDate', modal).value,
    total_rank: $('#totalRankV10', modal)?.value || '', total_participants: $('#totalParticipantsV10', modal)?.value || '',
    is_hidden: $('#examHiddenV10', modal)?.value === '1', scores: {}
  };
  const seen = new Set();
  for (const card of $$('.exam-subject-card-v10', modal)) {
    const name = $('.exam-subject-name-v10', card).value.trim();
    if (!name) return toast('请填写科目名称，或删除空白科目');
    if (seen.has(name)) return toast(`科目「${name}」重复了`); seen.add(name);
    exam.scores[name] = { target: $('.target-v10', card).value, actual: $('.actual-v10', card).value, max: $('.max-v10', card).value, rank: $('.rank-v10', card).value, participants: $('.participants-v10', card).value };
  }
  if (!exam.name || !exam.exam_date) return toast('请填写考试名称和日期');
  const error = validateExam(exam); if (error) return toast(error);
  btn.disabled = true; btn.textContent = '保存中…';
  try { await dataApiV7('save_exam', { exam }); await loadExams(); modal.remove(); state.modal = null; render(); toast(id ? '已保存修改' : '考试已记录'); }
  catch (error) { toast(error.message); btn.disabled = false; btn.textContent = id ? '保存修改' : '保存考试'; }
};

deleteExam = async function deleteExamV10(id) {
  const exam = (state.allExams || []).find((item) => item.id === id) || state.exams.find((item) => item.id === id);
  if (!confirm(`确定永久删除「${exam?.name || '这次考试'}」？成绩和排名都会一起删除。`)) return;
  try { await dataApiV7('delete_exam', { examId: id }); await loadExams(); render(); toast('已删除'); }
  catch (error) { toast(error.message); }
};

async function toggleExamHiddenV10(id) {
  const exam = (state.allExams || []).find((item) => item.id === id); if (!exam) return;
  try { await dataApiV7('toggle_exam_hidden', { examId: id, hidden: !exam.is_hidden }); await loadExams(); render(); toast(exam.is_hidden ? '已恢复到图表' : '已从图表隐藏'); }
  catch (error) { toast(error.message); }
}

recordHtml = function recordHtmlV10(exam) {
  const subjects = Object.keys(exam.scores || {}), rank = rankInfoV7(exam, '总分');
  const actualVals = subjects.map((s) => examScore(exam, s, 'actual')).filter((v) => v !== null), targetVals = subjects.map((s) => examScore(exam, s, 'target')).filter((v) => v !== null);
  const actual = actualVals.length ? actualVals.reduce((a, b) => a + b, 0) : null, target = targetVals.length ? targetVals.reduce((a, b) => a + b, 0) : null;
  return `<div class="record ${exam.is_hidden ? 'hidden-record-v10' : ''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}${exam.is_hidden ? '<span class="hidden-badge-v10">已隐藏</span>' : ''}</b></div><div class="record-scores">${subjects.map((subject) => {
    const row = exam.scores[subject] || {}, a = num(row.actual), t = num(row.target), r = num(row.rank), n = num(row.participants) ?? num(exam.total_participants);
    if (a === null && t === null && r === null) return '';
    return `<span class="score-tag">${escapeHtml(subject)} ${a === null ? '—' : formatScore(a)}<span style="color:#a1a9b5"> / ${t === null ? '—' : formatScore(t)}</span>${r === null ? '' : `<span style="color:#667085"> · 第${r}${n ? `/${n}` : ''}</span>`}</span>`;
  }).join('') || '<span class="score-tag">尚未填写分数或排名</span>'}<span class="score-tag"><b>总分 ${actual === null ? '—' : formatScore(actual)}</b> / 目标 ${target === null ? '—' : formatScore(target)}</span>${rank.rank !== null ? `<span class="score-tag"><b>总排名 ${rank.rank}${rank.participants ? ` / ${rank.participants}` : ''}</b>${rank.performance !== null ? ` · ${formatPercent(rank.performance)}` : ''}</span>` : ''}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">编辑</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden ? '恢复显示' : '隐藏'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">删除</button></div></div>`;
};

recordsHtml = function recordsHtmlV10() {
  const exams = state.allExams || [], hiddenCount = exams.filter((exam) => exam.is_hidden).length;
  return `<div class="page-head"><div><h2>考试记录</h2><p>每次考试可以有不同科目；“隐藏”只影响图表，不会删除记录。${hiddenCount ? ` 当前有 ${hiddenCount} 次已隐藏。` : ''}</p></div><button class="primary" id="addExam">＋ 新建</button></div><div class="card records-card">${exams.length ? exams.map(recordHtml).join('') : `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div>`}</div>`;
};

accountHtml = function accountHtmlV10() {
  const base = typeof accountHtmlBeforeV7 === 'function' ? accountHtmlBeforeV7() : `<div class="page-head"><div><h2>账号</h2></div></div>`;
  return `${base}<div class="card account-note-v10"><h3 class="card-title">科目按考试单独设置</h3><p class="card-sub">现在不再需要维护一套全局科目。新建或编辑某次考试时，可以直接添加、删除、改名科目或题型，只影响那一次考试；新考试默认沿用最近一次的科目。</p></div>`;
};

const bindPageBeforeV10 = bindPage;
bindPage = function bindPageV10() {
  bindPageBeforeV10();
  $$('[data-edit]').forEach((button) => button.onclick = () => { const exam = (state.allExams || []).find((item) => item.id === button.dataset.edit); if (exam) openExam(exam); });
  $$('[data-delete]').forEach((button) => button.onclick = () => deleteExam(button.dataset.delete));
  $$('[data-hidden-toggle]').forEach((button) => button.onclick = () => toggleExamHiddenV10(button.dataset.hiddenToggle));
};

const renderLoginBeforeV10 = renderLogin;
renderLogin = function renderLoginV10(error = '') {
  renderLoginBeforeV10(error);
  const help = $('.auth-help'); if (help) help.textContent = '每次考试都可自由增减科目，并支持成绩、排名趋势与排名百分位雷达对比。';
};

/* ===== app-v11.js ===== */
// v11: add direct raw-rank views beside normalized rank percentile
state.trendMetric = state.trendMetric || 'score';

(function injectV11Styles() {
  if ($('#app-v11-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v11-extra-style';
  style.textContent = `
    .raw-rank-note-v11{font-size:11px;line-height:1.6;color:var(--muted);margin-top:8px}
    .raw-rank-note-v11 b{color:var(--text)}
  `;
  document.head.appendChild(style);
})();

function rawRankValueV11(exam, subject) {
  if (!exam) return null;
  if (subject === '总分') return num(exam.total_rank);
  return num(exam.scores?.[subject]?.rank);
}

function niceRankStepV11(rough) {
  if (!Number.isFinite(rough) || rough <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return Math.max(1, nice * power);
}

function rawRankAxisV11(values) {
  const nums = (values || []).filter((v) => v !== null && Number.isFinite(Number(v))).map(Number);
  if (!nums.length) return { min: 1, max: 100, step: 20, ticks: 5 };
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const span = Math.max(hi - lo, Math.max(8, hi * 0.08));
  const pad = Math.max(2, span * 0.14);
  const step = niceRankStepV11((span + pad * 2) / 5);
  let min = Math.max(1, Math.floor((lo - pad) / step) * step);
  let max = Math.ceil((hi + pad) / step) * step;
  if (min < 1) min = 1;
  if (max <= min) max = min + step * 4;
  let ticks = Math.round((max - min) / step);
  if (ticks < 3) { max = min + step * 4; ticks = 4; }
  if (ticks > 6) ticks = 6;
  return { min, max, step: (max - min) / ticks, ticks };
}

function rawRankChartHtmlV11() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>记录名次后，这里会显示原始名次趋势</div></div>`;
  const colors = typeof rankSeriesColorsV7 === 'function' ? rankSeriesColorsV7() : ['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
  const subjects = state.subject === '总览' ? ['总分', ...SUBJECTS] : [state.subject];
  const series = subjects.map((subject, index) => ({ subject, color: colors[index % colors.length] }));
  const visible = series.filter((item) => state.exams.some((exam) => rawRankValueV11(exam, item.subject) !== null));
  if (!visible.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>这个项目还没有名次数据</div></div>`;

  const points = state.exams.map((exam) => ({ exam, values: visible.map((item) => rawRankValueV11(exam, item.subject)) }));
  const axis = rawRankAxisV11(points.flatMap((point) => point.values));
  const W = 760, H = 310, L = 56, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  // Raw rank is intentionally inverted: rank 1 stays at the top, larger/worse ranks go downward.
  const y = (v) => T + (v - axis.min) / (axis.max - axis.min) * ch;

  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) {
    const value = axis.min + ((axis.max - axis.min) * i / axis.ticks);
    const yy = T + (ch * i / axis.ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="axis-label">第${Math.max(1, Math.round(value))}</text>`;
  }

  const lines = visible.map((item, seriesIndex) => {
    let d = '', started = false, circles = '';
    points.forEach((point, pointIndex) => {
      const value = point.values[seriesIndex];
      if (value === null) { started = false; return; }
      const xx = x(pointIndex), yy = y(value);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} · ${escapeHtml(item.subject)} 第${value}名"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === '总览' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = state.subject === '总览' ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>` : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="raw-rank-note-v11"><b>原始名次模式：</b>直接显示第几名，不换算百分位；纵轴越高越好，第 1 名在最上方。总览叠加时，最好保证各科使用相同的排名口径和相近的参考人数。</div>`;
}

const chartHtmlBeforeV11 = chartHtml;
chartHtml = function chartHtmlV11() {
  if (state.trendMetric === 'rank_raw') return rawRankChartHtmlV11();
  return chartHtmlBeforeV11();
};

const homeHtmlBeforeV11 = homeHtml;
homeHtml = function homeHtmlV11() {
  let html = homeHtmlBeforeV11();
  html = html.replace(/<button class="metric-btn-v7 [^"]*" data-trend-metric="rank">排名<\/button>/,
    `<button class="metric-btn-v7 ${state.trendMetric === 'rank_raw' ? 'active' : ''}" data-trend-metric="rank_raw">名次</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">排名百分位</button>`);
  if (state.trendMetric === 'rank_raw') {
    html = html.replace('<h3 class="card-title">成绩趋势</h3>', '<h3 class="card-title">名次趋势</h3>');
    html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">直接看原始第几名；纵轴反向显示，第 1 名在最上方</p>');
    html = html.replace('<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>', '<p class="card-sub">总分与各科直接叠加原始名次；越靠上代表名次越好</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">原始名次 · 第 1 名最好</div>');
    html = html.replace('<div class="subtle-note">真实成绩 · 得分率</div>', '<div class="subtle-note">原始名次 · 越小越好</div>');
    html = html.replace('<div class="chart-wrap" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
    html = html.replace('<div class="chart-wrap overview-mode-v5" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
  }
  return html;
};

const radarValueBeforeV11 = radarValueV9;
radarValueV9 = function radarValueV11(exam, subject, mode = state.radarMode) {
  if (mode === 'rank_raw') return rawRankValueV11(exam, subject);
  return radarValueBeforeV11(exam, subject, mode);
};

const radarChartBeforeV11 = radarChartHtml;
radarChartHtml = function radarChartHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarChartBeforeV11(selected);
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择有名次数据的考试后，这里会直接显示各科原始名次</div></div>`;
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目名次，暂时无法叠加比较</div></div>`;

  const allValues = [];
  selected.forEach((exam) => subjects.forEach((subject) => allValues.push(rawRankValueV11(exam, subject))));
  const axis = rawRankAxisV11(allValues);
  const W = 620, H = 430, cx = 310, cy = 210, radius = 190;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i), r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  // Smaller/better rank is farther out, preserving the radar-chart meaning: outward = better.
  const normalize = (rank) => Math.max(0, Math.min(1, (axis.max - rank) / (axis.max - axis.min)));

  let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">第${Math.round(axis.max)}</text>`;
  for (let i = 1; i <= axis.ticks; i += 1) {
    const ratio = i / axis.ticks;
    const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
    const rankValue = axis.max - ((axis.max - axis.min) * ratio);
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">第${Math.max(1, Math.round(rankValue))}</text>`;
  }
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i), labelPos = pointAt(1.11, i);
    const label = SUBJECT_SHORT[subject] || (typeof subjectShortV7 === 'function' ? subjectShortV7(subject) : String(subject).slice(0, 2));
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${escapeHtml(label)}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(normalize(rawRankValueV11(exam, subject)), i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const value = rawRankValueV11(exam, subject), [x, y] = pointAt(normalize(value), i);
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${escapeHtml(exam.name)} · ${escapeHtml(subject)} 第${value}名"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">原始名次动态缩放（外圈名次更好：第${Math.round(axis.min)} ～ 第${Math.round(axis.max)}）</div>`;
};

const radarSummaryBeforeV11 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarSummaryBeforeV11(selected);
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前名次较弱科目</h4><div class="subtle-note">所选考试没有共同名次数据。</div></div></div>`;
  const latest = selected.at(-1), earliest = selected[0];
  const weakness = subjects.map((subject) => ({ subject, rank: rawRankValueV11(latest, subject) })).sort((a, b) => b.rank - a.rank).slice(0, 3);
  const comparisons = subjects.map((subject) => ({
    subject,
    before: rawRankValueV11(earliest, subject),
    after: rawRankValueV11(latest, subject),
    improvement: rawRankValueV11(earliest, subject) - rawRankValueV11(latest, subject)
  })).sort((a, b) => b.improvement - a.improvement);
  const best = comparisons[0] || null, worst = comparisons.at(-1) || null;
  return `<div class="radar-summary"><div class="summary-card"><h4>当前名次较弱科目</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>第${item.rank}名</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '名次变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.improvement >= 0 ? '↑' : '↓'}${Math.abs(best.improvement)}名</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.improvement >= 0 ? '↑' : '↓'}${Math.abs(worst.improvement)}名</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div class="subtle-note">再选择一次考试，就能直接比较各科前进或后退了多少名。</div></div>`}</div></div>`;
};

const radarCardBeforeV11 = radarCardHtml;
radarCardHtml = function radarCardHtmlV11() {
  let html = radarCardBeforeV11();
  html = html.replace(/<button class="chip [^"]*" data-radar-mode="rank">排名百分位<\/button>/,
    `<button class="chip ${state.radarMode === 'rank_raw' ? 'active' : ''}" data-radar-mode="rank_raw">名次</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">排名百分位</button>`);
  if (state.radarMode === 'rank_raw') {
    html = html.replace('按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。', '直接按原始名次绘制：外圈代表更好的名次，第 1 名方向最外；不做参考人数百分位换算。');
    html = html.replace('最多可叠加 4 次考试。叠加时只显示所选考试共同拥有数据的科目；坐标轴会按当前数据动态缩放。', '最多可叠加 4 次考试。只显示共同拥有名次的科目；原始名次会动态缩放，外圈名次更好。');
  }
  return html;
};

/* ===== feedback-unread-dot.js ===== */
// Show unread feedback replies as a small red dot on the feedback button.
(() => {
  const apply = () => {
    if (document.getElementById('st-feedback-unread-dot-style')) return;
    const style = document.createElement('style');
    style.id = 'st-feedback-unread-dot-style';
    style.textContent = `
      .st-fb-btn{overflow:visible!important}
      .st-fb-btn b{display:none!important;position:absolute!important;top:-4px!important;right:-4px!important;width:12px!important;height:12px!important;min-width:0!important;margin:0!important;padding:0!important;border-radius:50%!important;background:#e5484d!important;color:transparent!important;font-size:0!important;line-height:0!important;box-shadow:0 0 0 3px #fff!important}
      .st-fb-btn.has-unread b{display:block!important}
    `;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();

/* ===== app-v12.js ===== */
// v12: mobile radar controls should wrap cleanly instead of overflowing the card
(() => {
  if (document.getElementById('app-v12-radar-layout')) return;
  const style = document.createElement('style');
  style.id = 'app-v12-radar-layout';
  style.textContent = `
    .radar-toolbar .toggle-row{flex-wrap:wrap}
    .radar-toolbar .multi-select{flex-wrap:wrap;overflow:visible}

    @media(max-width:620px){
      .radar-toolbar{gap:14px}
      .radar-toolbar .toggle-row{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%;
      }
      .radar-toolbar .toggle-row .label{
        grid-column:1 / -1;
        margin:0 0 2px;
      }
      .radar-toolbar .toggle-row .chip{
        width:100%!important;
        min-width:0!important;
        padding:10px 8px!important;
        justify-content:center;
        text-align:center;
        white-space:nowrap;
      }
      .radar-toolbar .multi-select{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%;
        max-width:100%;
        overflow:visible!important;
        padding:0!important;
      }
      .radar-toolbar .select-pill{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        white-space:normal!important;
        line-height:1.35;
        padding:10px 8px!important;
        text-align:center;
        overflow-wrap:anywhere;
      }
    }

    @media(max-width:360px){
      .radar-toolbar .toggle-row,
      .radar-toolbar .multi-select{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);
})();

/* ===== app-v13.js ===== */
// v13: raw-vs-assigned scores + grade grouping/filtering
state.gradeFilter = state.gradeFilter || '全部';
state.scoreBasis = state.scoreBasis || 'final';
state.unfilteredVisibleExamsV13 = state.unfilteredVisibleExamsV13 || [];

const GRADE_LEVELS_V13 = ['高一', '高二', '高三'];
const ASSIGNED_DEFAULT_SUBJECTS_V13 = new Set(['化学', '生物', '政治', '地理']);

(function injectV13Styles() {
  if ($('#app-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v13-style';
  style.textContent = `
    .grade-filter-v13{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 16px}
    .grade-filter-v13 .label{font-size:12px;color:var(--muted);font-weight:700;margin-right:2px}
    .grade-chip-v13{border:1px solid var(--line);background:#fff;color:#687487;border-radius:999px;padding:8px 13px;font-size:12px;white-space:nowrap}
    .grade-chip-v13.active{background:var(--text);border-color:var(--text);color:#fff}
    .score-basis-v13{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 4px}
    .score-basis-v13 .label{font-size:12px;color:var(--muted);font-weight:700}
    .basis-btn-v13{border:1px solid var(--line);background:#fff;color:#687487;border-radius:999px;padding:7px 11px;font-size:11px}
    .basis-btn-v13.active{background:#eef1ff;color:#4e63d8;border-color:#cbd2ff;font-weight:700}
    .grade-select-v13{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:11px 12px;outline:none;color:var(--text)}
    .exam-score-grid-v13{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .raw-field-v13{background:#fffaf2;border-radius:11px;padding:7px}
    .final-field-v13{background:#f4fbf8;border-radius:11px;padding:7px}
    .score-total-preview-v13{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .score-total-box-v13{border:1px solid var(--line);background:#fafbfe;border-radius:14px;padding:12px}
    .score-total-box-v13 span{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .score-total-box-v13 b{font-size:20px;color:var(--text)}
    .score-total-box-v13 small{font-size:10px;color:var(--muted);margin-left:5px}
    .grade-section-v13{margin-bottom:18px}
    .grade-section-head-v13{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 10px}
    .grade-section-head-v13 h3{margin:0;font-size:16px}.grade-section-head-v13 span{font-size:11px;color:var(--muted)}
    .grade-badge-v13{display:inline-flex;align-items:center;border:1px solid #dce2ee;background:#f5f7fb;border-radius:999px;padding:3px 7px;font-size:10px;color:#5f6b7b;margin-left:7px;vertical-align:middle}
    .raw-final-inline-v13{color:#667085;font-size:11px}
    .raw-final-inline-v13 b{color:#d38429}
    @media(max-width:620px){
      .grade-filter-v13{overflow-x:auto;flex-wrap:nowrap;padding-bottom:3px;scrollbar-width:none}.grade-filter-v13::-webkit-scrollbar{display:none}
      .grade-filter-v13 .label{position:sticky;left:0;background:var(--bg);padding-right:4px;z-index:1}
      .exam-score-grid-v13{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .score-basis-v13{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .score-basis-v13 .label{grid-column:1/-1}.basis-btn-v13{width:100%}
    }
  `;
  document.head.appendChild(style);
})();

function examRawScoreV13(exam, subject) {
  const row = exam?.scores?.[subject] || {};
  const raw = num(row.raw);
  return raw !== null ? raw : num(row.actual);
}
function rawScoreRateV13(exam, subject) {
  const score = examRawScoreV13(exam, subject), max = examMax(exam, subject);
  if (score === null || !max) return null;
  return Math.max(0, Math.min(100, score / max * 100));
}
function totalRawForV13(exam) {
  const names = Object.keys(exam?.scores || {});
  let sum = 0, count = 0;
  names.forEach((subject) => { const value = examRawScoreV13(exam, subject); if (value !== null) { sum += value; count += 1; } });
  return count ? sum : null;
}
function totalRawMaxV13(exam) {
  const names = Object.keys(exam?.scores || {});
  let sum = 0, count = 0;
  names.forEach((subject) => { const value = examRawScoreV13(exam, subject); if (value !== null) { sum += examMax(exam, subject); count += 1; } });
  return count ? sum : null;
}
function totalRawRateV13(exam) {
  const value = totalRawForV13(exam), max = totalRawMaxV13(exam);
  return value === null || !max ? null : value / max * 100;
}
function gradeLabelV13(exam) { return exam?.grade_level || '未分类'; }

function applyGradeFilterV13() {
  const source = state.unfilteredVisibleExamsV13 || [];
  state.exams = state.gradeFilter === '全部' ? [...source]
    : state.gradeFilter === '未分类' ? source.filter((exam) => !exam.grade_level)
    : source.filter((exam) => exam.grade_level === state.gradeFilter);
  if (typeof applyExamSubjectsV10 === 'function') applyExamSubjectsV10(state.exams, state.subjectConfigs || []);
  state.radarSelection = (state.radarSelection || []).filter((id) => state.exams.some((exam) => exam.id === id));
  ensureRadarSelection();
}

const loadExamsBeforeV13 = loadExams;
loadExams = async function loadExamsV13() {
  await loadExamsBeforeV13();
  state.unfilteredVisibleExamsV13 = (state.allExams || []).filter((exam) => !exam.is_hidden);
  applyGradeFilterV13();
};

function rawScoreOverviewHtmlV13() {
  const subjects = SUBJECTS.filter((subject) => state.exams.some((exam) => rawScoreRateV13(exam, subject) !== null));
  const series = [
    { label: '总分', color: (typeof OVERVIEW_COLORS !== 'undefined' ? OVERVIEW_COLORS[0] : '#18212f'), value: (exam) => totalRawRateV13(exam) },
    ...subjects.map((subject, index) => ({ label: subject, color: (typeof OVERVIEW_COLORS !== 'undefined' ? OVERVIEW_COLORS[index + 1] : null) || RADAR_COLORS[index % RADAR_COLORS.length], value: (exam) => rawScoreRateV13(exam, subject) }))
  ];
  const visible = series.filter((item) => state.exams.some((exam) => item.value(exam) !== null));
  if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>当前分类还没有原始分数据</div></div>`;
  const points = state.exams.map((exam) => ({ exam, values: visible.map((item) => item.value(exam)) }));
  const vals = points.flatMap((point) => point.values).filter((v) => v !== null);
  const axis = typeof calcDynamicAxisRangeV6 === 'function' ? calcDynamicAxisRangeV6(vals, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: .16 }) : { min: 0, max: 100, ticks: 5 };
  const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46, cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + i / (points.length - 1) * cw;
  const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;
  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) { const value = axis.max - (axis.max - axis.min) * i / axis.ticks, yy = T + ch * i / axis.ticks; grid += `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-8}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`; }
  const lines = visible.map((item, sidx) => { let d = '', started = false, circles = ''; points.forEach((point, pidx) => { const value = point.values[sidx]; if (value === null) { started = false; return; } const xx=x(pidx), yy=y(value); d += `${started?'L':'M'} ${xx} ${yy} `; started=true; circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${item.color}" stroke-width="2.4" data-tip="${escapeHtml(point.exam.name)} · ${escapeHtml(item.label)} 原始得分率 ${formatPercent(value)}"/>`; }); return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${sidx===0?'3.4':'2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`; }).join('');
  const labels = points.map((point,index)=>`<text x="${x(index)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = `<div class="overview-legend">${visible.map((item)=>`<span class="overview-pill"><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`).join('')}</div>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div>${legend}<div class="axis-caption-v6">原始分总览按得分率比较；未填写原始分的普通科目自动沿用最终分。</div>`;
}

function rawScoreSingleHtmlV13() {
  const isTotal = state.subject === '总分';
  const points = state.exams.map((exam) => ({ exam, value: isTotal ? totalRawForV13(exam) : examRawScoreV13(exam, state.subject) }));
  const values = points.map((p) => p.value).filter((v) => v !== null);
  if (!values.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个项目还没有原始分数据</div></div>`;
  let min = Math.min(...values), max = Math.max(...values), pad = Math.max(5, (max-min)*.18); min = Math.max(0, Math.floor((min-pad)/5)*5); max = Math.ceil((max+pad)/5)*5; if (max-min < 20) { const mid=(max+min)/2; min=Math.max(0,Math.floor((mid-10)/5)*5); max=Math.ceil((mid+10)/5)*5; } if(max===min) max=min+20;
  const W=760,H=300,L=50,R=18,T=20,B=46,cw=W-L-R,ch=H-T-B, x=(i)=>points.length===1?L+cw/2:L+i/(points.length-1)*cw, y=(v)=>T+(max-v)/(max-min)*ch;
  let grid=''; for(let i=0;i<=5;i++){const v=max-(max-min)*i/5,yy=T+ch*i/5;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`;}
  let d='',started=false,circles=''; points.forEach((point,index)=>{if(point.value===null){started=false;return;}const xx=x(index),yy=y(point.value);d+=`${started?'L':'M'} ${xx} ${yy} `;started=true;circles+=`<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="#d38429" stroke-width="3" data-tip="${escapeHtml(point.exam.name)} · 原始${isTotal?'总分':state.subject} ${formatScore(point.value)}"/>`;});
  const labels=points.map((point,index)=>`<text x="${x(index)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}<path d="${d}" fill="none" stroke="#d38429" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

const chartHtmlBeforeV13 = chartHtml;
chartHtml = function chartHtmlV13() {
  if (state.trendMetric === 'score' && state.scoreBasis === 'raw') return state.subject === '总览' ? rawScoreOverviewHtmlV13() : rawScoreSingleHtmlV13();
  return chartHtmlBeforeV13();
};

const radarValueBeforeV13 = radarValueV9;
radarValueV9 = function radarValueV13(exam, subject, mode = state.radarMode) {
  if (mode === 'raw_score') return rawScoreRateV13(exam, subject);
  return radarValueBeforeV13(exam, subject, mode);
};

const radarCardBeforeV13 = radarCardHtml;
radarCardHtml = function radarCardHtmlV13() {
  let html = radarCardBeforeV13();
  html = html.replace(/<button class="chip ([^"]*)" data-radar-mode="actual">真实成绩<\/button>/,
    `<button class="chip $1" data-radar-mode="actual">赋分/最终分</button><button class="chip ${state.radarMode === 'raw_score' ? 'active' : ''}" data-radar-mode="raw_score">原始分</button>`);
  if (state.radarMode === 'raw_score') html = html.replace(/<p class="card-sub">.*?<\/p>/, '<p class="card-sub">按原始得分率绘制；未填写原始分的普通科目会沿用最终分，方便比较赋分前后的学科结构。</p>');
  return html;
};

const homeHtmlBeforeV13 = homeHtml;
homeHtml = function homeHtmlV13() {
  let html = homeHtmlBeforeV13();
  const gradeBar = `<div class="grade-filter-v13"><span class="label">年级</span>${['全部',...GRADE_LEVELS_V13,'未分类'].map((grade)=>`<button class="grade-chip-v13 ${state.gradeFilter===grade?'active':''}" data-grade-filter-v13="${grade}">${grade}</button>`).join('')}</div>`;
  html = html.replace('<section class="grid-main">', `${gradeBar}<section class="grid-main">`);
  if (state.trendMetric === 'score') {
    const basis = `<div class="score-basis-v13"><span class="label">成绩口径</span><button class="basis-btn-v13 ${state.scoreBasis==='final'?'active':''}" data-score-basis-v13="final">赋分 / 最终分</button><button class="basis-btn-v13 ${state.scoreBasis==='raw'?'active':''}" data-score-basis-v13="raw">原始分</button></div>`;
    html = html.replace('<div class="chips">', `${basis}<div class="chips">`);
    if (state.scoreBasis === 'raw') {
      html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">查看赋分前的原始成绩变化；总览模式按原始得分率统一比较</p>');
      html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">原始分 · 赋分科目可与最终分切换对照</div>');
    }
  }
  return html;
};

function seedRowsV13(exam) {
  if (exam) return Object.entries(exam.scores || {}).map(([name,row]) => ({ name, target: row.target ?? '', raw: row.raw ?? '', actual: row.actual ?? '', max: row.max ?? defaultMax(name), rank: row.rank ?? '', participants: row.participants ?? '' }));
  const last = state.exams.at(-1) || state.unfilteredVisibleExamsV13.at(-1);
  if (last && Object.keys(last.scores || {}).length) return Object.entries(last.scores).map(([name,row]) => ({ name, target:'', raw:'', actual:'', max:row.max ?? defaultMax(name), rank:'', participants:'' }));
  const templates = state.subjectConfigs?.length ? state.subjectConfigs : SUBJECTS.map((name)=>({name,defaultMax:defaultMax(name)}));
  return templates.map((item)=>({name:item.name,target:'',raw:'',actual:'',max:item.defaultMax ?? 100,rank:'',participants:''}));
}
function rawTotalFromRowsV13(rows) { let sum=0,count=0; rows.forEach((row)=>{const raw=num(row.raw),actual=num(row.actual),value=raw ?? actual;if(value!==null){sum+=value;count++;}}); return count?sum:null; }
function finalTotalFromRowsV13(rows) { let sum=0,count=0;rows.forEach((row)=>{const value=num(row.actual);if(value!==null){sum+=value;count++;}});return count?sum:null; }

openExam = function openExamV13(exam = null) {
  const editing=!!exam, today=new Date().toISOString().slice(0,10), rows=seedRowsV13(exam);
  const lastGrade=(state.unfilteredVisibleExamsV13.at(-1)?.grade_level || '高一'), selectedGrade=exam?.grade_level || (editing ? '' : lastGrade);
  const modal=document.createElement('div');modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body">
    <div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：高二上期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>年级分类</label><select id="gradeLevelV13" class="grade-select-v13"><option value="">未分类</option>${GRADE_LEVELS_V13.map((grade)=>`<option value="${grade}" ${selectedGrade===grade?'selected':''}>${grade}</option>`).join('')}</select></div></div>
    <div class="section-head-v7"><div><h4>本次考试科目</h4><p>化学、生物、政治、地理等赋分科目可以同时记录原始分和赋分；其他科目原始分可留空。</p></div></div>
    <div class="exam-subjects-v10" id="examSubjectsV13"></div>
    <div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV13">＋ 添加科目 / 模块</button><span class="template-note-v10">原始分留空时，统计原始总分会自动沿用该科最终分。</span></div>
    <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV13">—</b><small>赋分前</small></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV13">—</b><small>用于正式总分</small></div></div>
    <div class="section-head-v7"><div><h4>总排名（可选）</h4><p>各科名次在科目卡中填写；参考人数留空时使用总参考人数。</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span class="subject-name">总分</span><input id="totalRankV13" inputmode="numeric" pattern="[0-9]*" placeholder="例如 36" value="${exam?.total_rank??''}"><input id="totalParticipantsV13" inputmode="numeric" pattern="[0-9]*" placeholder="例如 620" value="${exam?.total_participants??''}"></div></div>
    <div class="rank-science-box-v7"><b>两种排名视图都保留：</b>“名次”直接看第几名；“排名百分位”结合参考人数，更适合跨考试比较。</div>
    <div class="visibility-box-v10"><div><b>图表显示状态</b><span>${exam?.is_hidden?'这次考试已隐藏：记录仍保留，但不参与图表。':'这次考试当前会参与首页统计和图表。'}</span></div><button class="secondary" id="toggleHiddenModalV13">${exam?.is_hidden?'恢复显示':'从图表隐藏'}</button><input type="hidden" id="examHiddenV13" value="${exam?.is_hidden?'1':'0'}"></div>
    ${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamModalV13">删除这次考试</button></div>':''}
    <div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div>
  </div></div>`;
  document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV13',modal);
  const syncRows=()=>{const next=$$('.exam-subject-card-v10',list).map((card)=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v13',card).value,raw:$('.raw-v13',card).value,actual:$('.actual-v13',card).value,max:$('.max-v13',card).value,rank:$('.rank-v13',card).value,participants:$('.participants-v13',card).value}));rows.splice(0,rows.length,...next);};
  const updateTotals=()=>{syncRows();$('#rawTotalV13',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV13',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const cardHtml=(row)=>{const assigned=ASSIGNED_DEFAULT_SUBJECTS_V13.has(String(row.name).trim()) || row.raw!=='';return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 题型 / 模块名称"><button class="remove-exam-subject-v10" type="button" title="删除本次考试中的这个科目">×</button></div><div class="exam-score-grid-v13"><div class="mini-field-v10"><label>目标成绩</label><input class="target-v13" inputmode="decimal" placeholder="可留空" value="${row.target??''}"></div><div class="mini-field-v10 raw-field-v13"><label>原始分${assigned?'':'（可选）'}</label><input class="raw-v13" inputmode="decimal" placeholder="赋分前" value="${row.raw??''}"></div><div class="mini-field-v10 final-field-v13"><label>${assigned?'赋分':'最终分'}</label><input class="actual-v13" inputmode="decimal" placeholder="正式成绩" value="${row.actual??''}"></div><div class="mini-field-v10"><label>满分</label><input class="max-v13" inputmode="decimal" value="${row.max??100}"></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>科目名次</label><input class="rank-v13" inputmode="numeric" pattern="[0-9]*" placeholder="可留空" value="${row.rank??''}"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v13" inputmode="numeric" pattern="[0-9]*" placeholder="留空=总人数" value="${row.participants??''}"></div></div></div>`;};
  const renderRows=()=>{list.innerHTML=rows.map(cardHtml).join('');$$('.remove-exam-subject-v10',list).forEach((button,index)=>button.onclick=()=>{syncRows();rows.splice(index,1);renderRows();updateTotals();});$$('input',list).forEach((input)=>input.addEventListener('input',updateTotals));};
  renderRows();updateTotals();
  const close=()=>{modal.remove();state.modal=null;};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=(event)=>{if(event.target===modal)close();};
  $('#addExamSubjectV13',modal).onclick=()=>{if(rows.length>=40)return toast('单次考试最多 40 个科目 / 模块');syncRows();rows.push({name:'',target:'',raw:'',actual:'',max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};
  $('#toggleHiddenModalV13',modal).onclick=()=>{const input=$('#examHiddenV13',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenModalV13',modal).textContent=next?'恢复显示':'从图表隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后仍保留记录，但不参与图表。':'保存后会重新参与首页统计和图表。';};
  $('#deleteExamModalV13',modal)?.addEventListener('click',async()=>{if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？成绩和排名都会一起删除。`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam = function validateExamV13(exam) {
  const totalRank=num(exam.total_rank),totalParticipants=num(exam.total_participants);
  if(totalRank!==null&&(!Number.isInteger(totalRank)||totalRank<1))return'总排名请输入正整数';
  if(totalParticipants!==null&&(!Number.isInteger(totalParticipants)||totalParticipants<1))return'参考人数请输入正整数';
  if(totalRank!==null&&totalParticipants!==null&&totalRank>totalParticipants)return'总排名不能大于参考人数';
  const names=new Set();for(const[name,row]of Object.entries(exam.scores||{})){if(!name||name.length>40)return'科目名称不能为空且不能超过 40 个字符';if(names.has(name))return`科目「${name}」重复了`;names.add(name);const max=num(row.max)??defaultMax(name),target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??totalParticipants;if(!Number.isFinite(max)||max<=0)return`${name} 的满分必须大于 0`;if(target!==null&&target>max)return`${name} 的目标成绩不能超过满分 ${formatScore(max)}`;if(raw!==null&&raw>max)return`${name} 的原始分不能超过满分 ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name} 的赋分/最终分不能超过满分 ${formatScore(max)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}排名请输入正整数`;if(parti…162152 tokens truncated…iv');target.className='pb-box pb-selected pb-new';boxes.appendChild(target);}paint(b,target);};
  stage.onpointerup=function(){if(!drag)return;drag=null;$('[data-pb=undo]').disabled=false;if(mode==='add'){mode='adjust';$('[data-pb=add]').textContent='补画框';$('[data-pb=adjust]').textContent='保存补画';}crop();say('范围尚未保存，点“'+(draft.add?'保存补画':'完成调整')+'”即可。');};
  stage.onpointercancel=function(){drag=null;};
  board.onkeydown=function(e){var handle=e.target.closest('[data-pb-corner]');if(!handle||mode!=='adjust'||!active||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();draft||={kind:active.region.kind,box:active.region.box.slice(),refs:active.refs};var b=draft.box,c=handle.dataset.pbCorner,d=e.shiftKey ? .01 : .002,axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?0:1,delta=e.key==='ArrowLeft'||e.key==='ArrowUp'?-d:d,far=axis===0?c.includes('e'):c.includes('s');if(far)b[axis+2]=Math.max(.011,Math.min(1-b[axis],b[axis+2]+delta));else{var end=b[axis]+b[axis+2];b[axis]=Math.max(0,Math.min(end-.011,b[axis]+delta));b[axis+2]=end-b[axis];}paint(b,boxes.querySelector('.pb-selected'));$('[data-pb=undo]').disabled=false;crop();changed(selected);};
  if(!remembered.page){var pending=questions.find(needs);if(pending){selected=pending;var r=allRegions(pending).find(function(r){return r.kind==='work';})||allRegions(pending)[0];if(r)page=pages.find(function(p){return p.page===r.page;})||page;}}
  render();if(active){chooseEntry(active);renderBoxes();renderEditor();}if(readonly)board.querySelectorAll('input,select,.pb-form button,.pb-finish,.pb-finish-choice button').forEach(function(el){el.disabled=true;});
  function externalInput(e){if(e.target.closest('.pb-board'))return;if(e.target.matches('[data-field]')){stateCache=null;renderBoxes();renderPending();}}
  main.addEventListener('input',externalInput);main.paperBoardDispose=function(){main.removeEventListener('input',externalInput);main.paperBoardDispose=null;};
 }
 window.ScorePaperBoard={mount:mount,groups:groups};
 var css=document.createElement('style');css.textContent=`.pb-board{margin:20px 0;border:1px solid var(--line);border-radius:14px;background:var(--panel-solid,#fff);overflow:hidden}.pb-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px}.pb-head h3{margin:0;font-size:20px}.pb-head p{margin:5px 0 0;color:var(--muted);font-size:13px}.pb-pages{display:flex;gap:8px;padding:0 20px 18px;overflow:auto}.pb-pages>.pr-button{flex:none;display:flex;flex-direction:column;gap:4px;min-width:74px;padding:7px 10px;font-size:12px}.pb-pages img{width:48px;height:52px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:3px}.pb-pages [aria-current=true]{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}.pb-pages small{font-size:11px;color:#a36b23}.pb-layout{display:grid;grid-template-columns:minmax(0,1fr) 255px;border-top:1px solid var(--line)}.pb-view{padding:14px;background:var(--soft,#f5f7fb);min-width:0}.pb-view-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;margin-bottom:12px}.pb-view-head .pr-button{padding:5px 8px;margin:0;min-width:32px;font-size:12px}.pb-scroll{overflow:auto;max-height:760px;overscroll-behavior:contain}.pb-stage{position:relative;width:100%;line-height:0;user-select:none}.pb-stage>img{display:block;width:100%;max-width:none;height:auto;background:#fff}.pb-boxes{position:absolute;inset:0;pointer-events:none}.pb-box{position:absolute;border:1.5px solid var(--accent,#5264e8);background:#5264e805;pointer-events:auto;box-sizing:border-box;line-height:1.4}.pb-pending{border-style:dashed;border-color:#b47b2a}.pb-selected{z-index:4;border:2px solid var(--accent,#5264e8);background:#5264e810}.pb-box>button[data-pb-select]{position:absolute;top:-10px;left:3px;max-width:calc(100% - 6px);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;padding:3px 7px;min-height:26px;border:0;border-radius:4px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;font-size:11px;box-shadow:0 0 0 1px var(--line);cursor:pointer}.pb-selected>button[data-pb-select]{background:var(--accent,#5264e8);color:white}.pb-handle{position:absolute;width:28px;height:28px;min-height:0;padding:0;border:0;background:transparent;display:flex;align-items:center;justify-content:center;touch-action:none;z-index:2}.pb-handle:after{content:'';width:10px;height:10px;border:2px solid var(--accent);background:var(--panel-solid,#fff);border-radius:2px}.pb-handle[data-pb-corner=nw]{left:-15px;top:-15px;cursor:nwse-resize}.pb-handle[data-pb-corner=ne]{right:-15px;top:-15px;cursor:nesw-resize}.pb-handle[data-pb-corner=sw]{left:-15px;bottom:-15px;cursor:nesw-resize}.pb-handle[data-pb-corner=se]{right:-15px;bottom:-15px;cursor:nwse-resize}.pb-editing{touch-action:none}.pb-editing .pb-selected{cursor:move}.pb-new{pointer-events:none}.pb-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding-top:12px}.pb-tools .pr-button{padding:7px 9px;margin:0;font-size:12px}.pb-tools>span{font-size:11px;color:var(--muted);flex:1 1 170px}.pb-inspector{padding:18px;min-width:0;border-left:1px solid var(--line)}.pb-title{display:flex;justify-content:space-between;align-items:center;gap:8px}.pb-title h4{font-size:18px;margin:0}.pb-title>span{font-size:11px;color:var(--muted)}.pb-picker{display:block;font-size:12px;color:var(--muted);margin-top:14px}.pb-picker select{display:block;width:100%;padding:8px;background:var(--panel-solid);color:var(--text);border:1px solid var(--line);border-radius:8px}.pb-pair{display:flex;gap:6px;margin:12px 0}.pb-pair .pr-button{flex:1;margin:0;padding:7px;font-size:12px}.pb-pair [aria-pressed=true]{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}.pb-crop{position:relative;overflow:hidden;background:white;border:1px solid var(--line);border-radius:7px;max-height:250px;margin:14px 0}.pb-crop img{position:absolute;height:auto;display:block}.pb-form>label,.pb-scores label{display:flex;flex-direction:column;gap:6px;font-size:12px}.pb-form input{min-width:0;box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;color:var(--text);background:var(--panel-solid);font:inherit;font-size:16px}.pb-scores{display:grid;grid-template-columns:minmax(0,1fr) 10px minmax(0,1fr);align-items:end;gap:8px;margin-top:14px}.pb-scores>span{padding-bottom:10px;color:var(--muted)}.pb-hint,.pb-message{font-size:12px!important;line-height:1.7;color:var(--muted);margin:12px 0!important;overflow-wrap:anywhere}.pb-form>.pr-button{width:100%;margin-top:4px}.pb-next{width:100%;font-size:12px!important;margin-top:12px}.pb-error{color:var(--danger,#a74944)!important;font-size:12px!important;line-height:1.6}.pb-error:empty{display:none}.pb-ledger{margin:20px 0}.pb-ledger>summary{padding:14px 0;cursor:pointer;font-size:15px;color:var(--muted)}.pb-image-first .pr-record-overview{display:none}.pb-board [hidden]{display:none!important}@media(max-width:760px){.pb-layout{grid-template-columns:1fr}.pb-inspector{border-left:0;border-top:1px solid var(--line)}.pb-crop{display:none}.pb-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 12px;align-items:end}.pb-scores{margin:0}.pb-form>.pb-hint,.pb-form>.pb-error,.pb-form>button{grid-column:1/-1}.pb-scroll{max-height:560px}.pb-head{padding:15px}.pb-pages{padding:0 15px 15px}.pb-inspector{padding:15px}}@media(max-width:420px){.pb-head h3{font-size:18px}.pb-head p{font-size:12px}.pb-head>.pr-button{padding:8px;white-space:nowrap}.pb-form{display:block}.pb-scores{margin-top:12px}.pb-view{padding:12px}.pb-scroll{max-height:450px}}@media(pointer:coarse){.pb-board .pr-button,.pb-picker select{min-height:44px}.pb-handle{width:44px;height:44px}.pb-handle[data-pb-corner=nw]{left:-23px;top:-23px}.pb-handle[data-pb-corner=ne]{right:-23px;top:-23px}.pb-handle[data-pb-corner=sw]{left:-23px;bottom:-23px}.pb-handle[data-pb-corner=se]{right:-23px;bottom:-23px}}`;
 css.textContent+=' .pb-next{white-space:normal;overflow-wrap:anywhere}.pb-finish{width:100%;white-space:normal}.pb-finish-choice{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.pb-finish-choice>p{grid-column:1/-1}.pb-finish-choice .pr-button{width:100%}@media(max-width:420px){.pb-finish-choice{grid-template-columns:1fr}}';document.head.appendChild(css);
})();

/* ===== paper-review-scans.js ===== */
/* Per-question scan regions and editable OCR records; no generated HTML is trusted. */
(function () {
  'use strict';
  var esc = function (s) { return escapeHtml(String(s == null ? '' : s)); };
  var roles = { paper: '原题', work: '作答', reference: '参考答案' };
  function validRegion(r,pages){return r&&roles[r.kind]&&pages.some(function(p){return p.page===r.page;})&&Array.isArray(r.box)&&r.box.length===4&&r.box.every(function(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;})&&r.box[2]>.01&&r.box[3]>.01&&r.box[0]+r.box[2]<=1.001&&r.box[1]+r.box[3]<=1.001;}
  function layoutCrop(img,box){function layout(){if(!img.naturalWidth||!img.naturalHeight)return;img.parentElement.style.aspectRatio=(box[2]*img.naturalWidth)/(box[3]*img.naturalHeight);img.style.cssText='width:'+(100/box[2])+'%;max-width:none;left:'+(-box[0]/box[2]*100)+'%;top:'+(-box[1]/box[3]*100)+'%';}img.onload=layout;if(img.complete)layout();}
  function enlarge(region,page,opener){var modal=document.createElement('dialog');modal.className='ps-enlarge';modal.innerHTML='<header><strong>'+roles[region.kind]+'截图 · 第 '+region.page+' 页</strong><button type="button" class="pr-button" data-close-crop>关闭</button></header><div class="ps-crop"><img alt="'+roles[region.kind]+'截图放大"></div><p class="pr-muted">显示的是已保存扫描件的对应区域，未调用 AI。</p>';document.body.appendChild(modal);window.ScorePaperSupport.useFallbackImages(modal,[page]);var image=modal.querySelector('img');image.src=page.url;layoutCrop(image,region.box);modal.querySelector('[data-close-crop]').onclick=function(){modal.close();};modal.onclick=function(e){if(e.target===modal)modal.close();};modal.onclose=function(){modal.remove();if(opener&&opener.isConnected)opener.focus();};modal.showModal();}
  function btn(s, action) { return '<button type="button" class="pr-button" data-scan="' + action + '">' + s + '</button>'; }
  function cropEditor(parent, pages, current, save) {
    var editor = document.createElement('section'); editor.className = 'ps-editor';
    var page = pages.find(function (p) { return current && p.page === current.page; }) || pages[0], box = current ? current.box.slice() : [0,0,1,1], kind = current ? current.kind : page.role;
    editor.innerHTML = '<div class="ps-controls"><label>来源页<select data-page>' + pages.map(function (p) { return '<option value="' + p.page + '" ' + (p === page ? 'selected' : '') + '>第 ' + p.page + ' 页 · ' + roles[p.role] + '</option>'; }).join('') + '</select></label><label>区域内容<select data-kind>' + Object.keys(roles).map(function (k) { return '<option value="' + k + '" ' + (k === kind ? 'selected' : '') + '>' + roles[k] + '</option>'; }).join('') + '</select></label></div><p class="pr-muted">在图片上拖动框选完整题目或作答；也可以调整下面的百分比。跨页内容可继续添加区域。</p><div class="ps-stage"><img alt="待框选的扫描页" draggable="false"><div class="ps-selection"></div></div><div class="ps-coordinates">' + ['左边距','上边距','宽度','高度'].map(function (n, i) { return '<label>' + n + ' %<input type="number" min="0" max="100" step="0.1" data-coordinate="' + i + '"></label>'; }).join('') + '</div><div class="ps-actions">' + btn('整页','full') + btn('保存区域','save') + btn('取消','cancel') + '</div><p class="ps-error" role="status"></p>';
    parent.appendChild(editor); var stage = editor.querySelector('.ps-stage'), img = stage.querySelector('img'), selection = stage.querySelector('.ps-selection'), start;
    function paint() { selection.style.cssText = 'left:' + box[0]*100 + '%;top:' + box[1]*100 + '%;width:' + box[2]*100 + '%;height:' + box[3]*100 + '%'; editor.querySelectorAll('[data-coordinate]').forEach(function (el, i) { el.value = Math.round(box[i]*1000)/10; }); }
    img.src = page.url; paint();
    editor.querySelector('[data-page]').onchange = function (e) { page = pages.find(function (p) { return String(p.page) === e.target.value; }); img.src = page.url; box = [0,0,1,1]; paint(); };
    editor.querySelector('[data-kind]').onchange = function (e) { kind = e.target.value; };
    function point(e) { var r = stage.getBoundingClientRect(); return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]; }
    stage.onpointerdown = function (e) { if (!img.complete) return; e.preventDefault(); start = point(e); stage.setPointerCapture(e.pointerId); };
    stage.onpointermove = function (e) { if (!start) return; var end = point(e); box = [Math.min(start[0],end[0]),Math.min(start[1],end[1]),Math.max(.001,Math.abs(end[0]-start[0])),Math.max(.001,Math.abs(end[1]-start[1]))]; paint(); };
    stage.onpointerup = stage.onpointercancel = function () { start = null; };
    editor.querySelectorAll('[data-coordinate]').forEach(function (el, i) { el.onchange = function () { box[i] = Math.max(0,Math.min(1,Number(el.value)/100)); box[2] = Math.min(box[2],1-box[0]); box[3] = Math.min(box[3],1-box[1]); paint(); }; });
    editor.onclick = async function (e) { var b = e.target.closest('[data-scan]'); if (!b) return; e.stopPropagation();
      if (b.dataset.scan === 'cancel') editor.remove();
      if (b.dataset.scan === 'full') { box = [0,0,1,1]; paint(); }
      if (b.dataset.scan === 'save') { b.disabled = true; try { box=Array.from(editor.querySelectorAll('[data-coordinate]')).map(function(el){return Number(el.value)/100;});if(box.some(function(n){return !Number.isFinite(n)||n<0||n>1;})||box[0]+box[2]>1.001||box[1]+box[3]>1.001)throw new Error('请在图片范围内框选');if (box[2] <= .01 || box[3] <= .01) throw new Error('请框选更完整的区域'); await save({ page: page.page, kind: kind, box: box.slice() }); editor.remove(); } catch (err) { editor.querySelector('.ps-error').textContent = err.message; } finally { b.disabled = false; } }
    };
    editor.scrollIntoView && editor.scrollIntoView({ block: 'nearest' });
  }
  function regionCard(region, page, index, shared) {
    return '<figure class="ps-region" data-index="' + index + '" data-region-kind="'+region.kind+'"><figcaption>' + (region.kind==='paper'?'原题截图':region.kind==='work'?(shared?'作答截图 · 共用填涂区':'答题卡 / 作答截图'):'参考答案截图') + ' · 第 ' + region.page + ' 页</figcaption><button type="button" class="ps-preview" data-scan="zoom:'+index+'" aria-label="放大'+roles[region.kind]+'截图"><div class="ps-crop"><img loading="lazy" src="' + esc(page.url) + '" alt="' + roles[region.kind] + '扫描区域"></div></button><div>' + btn('放大','zoom:' + index) + btn('调整','edit:' + index) + btn('移除区域','remove:' + index) + '</div></figure>';
  }
  async function decorate(main, r, ctx, hooks) {
    var generation = String(Number(main.dataset.scanGeneration || 0) + 1); main.dataset.scanGeneration = generation;
    var isPaused = r.status === 'paused', qs = r.result ? r.result.questions : r.recovery && r.recovery.questions || [];
    if (!qs.length) return;
    var api = function (action, payload) { return hooks.api(ctx, action, Object.assign({ request_id: r.request_id }, payload || {})); };
    if (isPaused) {
      var form = document.createElement('form'); form.className = 'ps-verify';
      form.innerHTML = '<h3>核对题目与作答</h3><p class="pr-muted">保留原有错误写法；修正识别文字和批改分，分析会使用保存后的内容。</p>' + qs.map(function (q, i) { return '<details class="pr-question" data-ocr="' + i + '"><summary>第 ' + esc(q.label) + ' 题</summary><div class="pr-question-body"><label>题目<textarea name="stem' + i + '" rows="4" maxlength="4500" required>' + esc(q.stem) + '</textarea></label><label>考试时的作答<textarea name="answer' + i + '" rows="4" maxlength="4000">' + esc(q.answer) + '</textarea></label><div class="pr-score-fields"><label>批改得分<input name="score' + i + '" type="number" min="0" max="9999" step=".01" value="' + esc(q.teacher_score) + '"></label><label>满分<input name="max' + i + '" type="number" min="0" max="9999" step=".01" value="' + esc(q.max_score) + '"></label></div></div></details>'; }).join('') + '<button class="pr-button pr-primary" type="submit">保存核对并继续</button>';
      var selection = r.input_selection || r.options || {};
      if (selection.config_version === 2 && selection.purpose !== 'record') {
        var picker=document.createElement('fieldset');picker.className='ps-scope';
        picker.innerHTML='<legend>哪些题需要详细分析？</legend><label>分析范围<select name="analysis_scope"><option value="all">全部适用题目</option><option value="losses">失分题优先</option><option value="selected">我选择的题目</option></select></label><p class="pr-muted">整体概览仍覆盖已上传题目，未选中的题保留简短结论。</p><div class="ps-question-picks">'+qs.map(function(q){return '<label class="pr-check"><input type="checkbox" name="detail_questions" value="'+esc(q.label)+'" '+((selection.selected_questions||[]).includes(q.label)?'checked':'')+'>第 '+esc(q.label)+' 题'+(q.teacher_score!=null?' · '+q.teacher_score+(q.max_score!=null?' / '+q.max_score:'')+' 分':'')+'</label>';}).join('')+'</div>';
        form.querySelector('button[type=submit]').before(picker);picker.querySelector('select').value=selection.analysis_scope||'all';
        function togglePicks(){picker.querySelector('.ps-question-picks').hidden=picker.querySelector('select').value!=='selected';}picker.onchange=togglePicks;togglePicks();
      }
      main.appendChild(form);
      form.onsubmit = async function (e) { e.preventDefault(); var b = form.querySelector('[type=submit]'); b.disabled = true;
        try { var questions = qs.map(function (q, i) { function value(k) { return form.elements[k+i].value; } return { label: q.label, stem: value('stem'), answer: value('answer'), teacher_score: value('score') === '' ? null : Number(value('score')), max_score: value('max') === '' ? null : Number(value('max')) }; }); var scope=form.elements.analysis_scope?{analysis_scope:form.elements.analysis_scope.value,selected_questions:Array.from(form.querySelectorAll('[name=detail_questions]:checked')).map(function(x){return x.value;})}:undefined; if(scope && scope.analysis_scope==='selected' && !scope.selected_questions.length)throw new Error('请选择至少一道需要详细分析的题目'); await api('confirm_input', { questions: questions, analysis_selection:scope }); await api('resume', { mode: 'saved' }); await hooks.load(r.request_id); } catch (err) { hooks.note(err.message, true); } finally { if (b.isConnected) b.disabled = false; }
      };
      if (r.input_review) main.querySelector('[data-pr=resume]').hidden = true;
    }
    var source;
    try { source = await api('sources'); } catch (err) { if (main.isConnected) hooks.note(err.message, true); return; }
    if (!main.isConnected || main.dataset.scanGeneration !== generation) return;
    var pages = source.pages || [], regions = source.regions || {}, panel = document.createElement('details'); panel.className = 'ps-library';
    if(main.paperFallbackDispose)main.paperFallbackDispose();
    main.paperFallbackDispose=window.ScorePaperSupport.useFallbackImages(main,pages);
    panel.innerHTML = '<summary>扫描件 · ' + pages.length + ' 页</summary><p class="pr-muted">扫描件保存在当前账号。关联分析共用原始扫描件；原录入删除后，分析仍保留已保存的题目文字。</p><div class="ps-pages">' + pages.map(function (p) { return '<a target="_blank" rel="noopener" href="' + esc(p.url) + '"><img loading="lazy" src="' + esc(p.url) + '" alt="第' + p.page + '页扫描件"><span>第' + p.page + '页 · ' + roles[p.role] + '</span></a>'; }).join('') + '</div>' + (r.status !== 'running' && !source.readonly ? '<label>补充扫描件类别<select data-add-kind><option value="paper">原题</option><option value="work">作答</option><option value="reference">参考答案</option></select></label><label class="pr-check"><input type="checkbox" data-scan-consent>同意在账号中保存补充扫描件；裁掉姓名、考号等无关信息</label><label class="pr-button pr-file-label">补充扫描件<input type="file" accept="image/jpeg,image/png,image/webp" data-add-page></label>' : '') + '<p class="ps-upload-note" role="status"></p>';
    var materials = main.querySelector('.pr-materials'); if (materials) materials.appendChild(panel); else main.prepend(panel);
    var file = panel.querySelector('[data-add-page]'); if (file) file.onchange = async function () {
      if (!file.files.length) return; var message = panel.querySelector('.ps-upload-note'); file.disabled = true;
      try {
        if (!panel.querySelector('[data-scan-consent]').checked) throw new Error('请先确认保存扫描件');
        if (pages.length >= 15) throw new Error('本份报告已保存15张扫描件');
        message.textContent = '正在保存扫描件…'; var p = await window.ScorePaperReview.prepare(file.files[0]);
        await api('save_materials', { consent: true, subject: r.subject, draft_id: r.draft_id, exam_id: r.exam_id, title: r.title, options: r.options });
        await api('upload_page', { page: pages.length+1, role: panel.querySelector('[data-add-kind]').value, url: p.url });
        await hooks.load(r.request_id);
      } catch (err) { message.textContent = err.message; } finally { file.disabled = false; file.value = ''; }
    };
    var controllers=new Map();
    qs.forEach(function (q, i) {
      var target = isPaused ? main.querySelector('[data-ocr="' + i + '"] .pr-question-body') : main.querySelector('[data-question="' + q.id + '"] [data-scan-host]');
      if (!target) return;
      var zone = document.createElement('section'); zone.className = 'ps-question'; target.prepend(zone);
      var current = Object.prototype.hasOwnProperty.call(regions,q.label) ? regions[q.label] : q.source_regions || [];
      current = current.filter(function (r) { return validRegion(r,pages); });
      function render() {
        q.source_regions=current;
        var kinds=['paper','work','reference'],cards=kinds.map(function(kind){var found=current.map(function(region,index){return {region:region,index:index};}).filter(function(item){return item.region.kind===kind;});if(found.length)return found.map(function(item){return regionCard(item.region,pages.find(function(p){return p.page===item.region.page;}),item.index,q.shared_work);}).join('');var ids=kind==='paper'?q.pages||[]:kind==='work'?q.work_pages||[]:q.reference_pages||[],known=pages.filter(function(p){return ids.includes(p.page);});if(!known.length&&kind==='paper')known=pages.filter(function(p){return p.role==='paper';});if(!known.length&&kind==='work'&&q.work_expected)known=pages.filter(function(p){return p.role===(r.result&&r.result.work_on_paper?'paper':'work');});return (known.length||kind==='paper'||kind==='work'&&q.work_expected)?'<div class="ps-unlocated"><b>'+roles[kind]+'截图尚未定位</b><p>尚未关联完整截图；可能缺少扫描页，可补充页面后框选。</p>'+known.map(function(p){return '<a href="'+esc(p.url)+'" target="_blank" rel="noopener">查看第 '+p.page+' 页</a>';}).join(' · ')+'</div>':'';}).join('');
        zone.innerHTML = '<h4>原题与作答截图</h4>' + (pages.length ? '<div class="ps-regions">' + cards + '</div>' + (!source.readonly?btn('＋ 框选扫描区域','add'):'') + (!current.length ? '<p class="pr-muted">没有可靠定位时保留原页；可分别框选原题与作答，也支持跨页。</p>' : '') : '<p class="pr-muted">本题暂无可用扫描件，可在资料区补充原卷或答题卡。</p>');
        zone.querySelectorAll('.ps-region').forEach(function(card){var region=current[Number(card.dataset.index)];layoutCrop(card.querySelector('.ps-crop img'),region.box);});
        if(source.readonly)zone.querySelectorAll('[data-scan^="edit:"],[data-scan^="remove:"]').forEach(function(b){b.remove();});
      }
      controllers.set(q.label,function(next){current=next;regions[q.label]=next;render();});
      async function persist(next) { await api('save_regions', { label: q.label, regions: next }); current = next;regions[q.label]=next;render();var item=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(q.id);}),check=item&&item.querySelector('[data-field=verified]'),accepted=item&&item.querySelector('[data-field=accepted]');if(accepted)accepted.checked=false;if(check){check.checked=false;check.dispatchEvent(new Event('input',{bubbles:true}));}hooks.note('截图区域已保存，请确认本题对应位置。'); }
      zone.onclick = async function (e) { var b = e.target.closest('[data-scan]'); if (!b || b.closest('.ps-editor')) return; e.preventDefault(); e.stopPropagation();
        var a = b.dataset.scan, index = Number(a.split(':')[1]);
        try { if(a.startsWith('zoom:')){var region=current[index];if(region)enlarge(region,pages.find(function(p){return p.page===region.page;}),b);}
          else if(!source.readonly&&(a === 'add' || a.startsWith('edit:'))) { var old = zone.querySelector('.ps-editor'); if (old) old.remove(); cropEditor(zone,pages,a === 'add' ? null : current[index],async function (r) { var next = current.slice(); if (a === 'add') next.push(r); else next[index] = r; await persist(next); }); }
          else if (!source.readonly&&a.startsWith('remove:')) await persist(current.filter(function (_, j) { return j !== index; }));
        } catch (err) { hooks.note(err.message,true); }
      };
      render();
    });
    if(window.ScorePaperBoard&&hooks.save)window.ScorePaperBoard.mount(main,r,ctx,source,{save:hooks.save,finalize:hooks.finalize,regions:async function(updates){var saved=await api('save_regions',{updates:updates});updates.forEach(function(u){var apply=controllers.get(u.label);if(apply)apply(u.regions);});return saved;}});
    var syncPanel=main.querySelector('.pr-type-sync');if(syncPanel&&syncPanel.refresh)syncPanel.refresh();
  }
  window.ScorePaperScans = { decorate: decorate };
  var style = document.createElement('style'); style.textContent = `.ps-library{padding:16px;border:1px solid var(--line);border-radius:12px;margin-bottom:18px}.ps-library summary{font-weight:700;cursor:pointer}.ps-pages{display:flex;gap:12px;overflow:auto;padding:15px 0}.ps-pages a{flex:none;width:90px;font-size:11px;color:var(--text);text-decoration:none}.ps-pages img{width:90px;height:110px;object-fit:contain;border:1px solid var(--line);border-radius:8px;display:block}.ps-library>label{display:block;margin:12px 0}.ps-library .pr-check{display:flex}.ps-library .pr-file-label{display:inline-block}.ps-library select{display:block}.ps-question{padding:12px 0;border-bottom:1px solid var(--line);margin-bottom:15px}.ps-regions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ps-region{margin:8px 0;border:1px solid var(--line);border-radius:10px;padding:10px;min-width:0}.ps-region figcaption{font-size:12px;color:var(--muted);margin-bottom:8px}.ps-crop{position:relative;overflow:hidden;background:#fff;aspect-ratio:1;max-height:600px}.ps-crop img{position:absolute;height:auto;display:block}.ps-region .pr-button{font-size:11px;padding:5px 8px;margin:10px 4px 0 0}.ps-editor{margin:15px 0;padding:12px;border:1px solid var(--accent);border-radius:12px}.ps-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ps-controls select{width:100%;padding:8px}.ps-stage{position:relative;touch-action:none;user-select:none;margin:12px auto;max-width:600px;line-height:0}.ps-stage>img{width:100%;height:auto;display:block}.ps-selection{position:absolute;box-sizing:border-box;border:2px solid #5264e8;background:#5264e820;pointer-events:none}.ps-coordinates{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ps-coordinates input{width:100%}.ps-actions{display:flex;gap:8px;margin-top:12px}.ps-error{color:var(--danger)}.ps-verify{margin-top:20px}.ps-upload-note{font-size:12px;color:var(--muted)}@media(max-width:520px){.ps-regions{grid-template-columns:1fr}.ps-coordinates{grid-template-columns:1fr 1fr}}`;
  style.textContent += '.ps-scope{border:1px solid var(--line);border-radius:12px;padding:16px;margin:24px 0}.ps-scope legend{font-size:16px;font-weight:600}.ps-scope select{display:block;padding:10px;width:100%;margin:8px 0;background:var(--panel-solid);color:var(--text);border:1px solid var(--line);border-radius:8px}.ps-question-picks{display:flex;flex-wrap:wrap;gap:8px 20px}.ps-question-picks[hidden]{display:none}.ps-verify>h3{font-size:22px}';
  document.head.appendChild(style);
  var cropStyle=document.createElement('style');cropStyle.textContent='.ps-region{margin:0}.ps-preview{display:block;width:100%;padding:0;border:0;background:white;cursor:zoom-in;text-align:left;border-radius:6px;overflow:hidden}.ps-crop{max-height:none}.ps-region figcaption{font-weight:600}.ps-unlocated{padding:14px;border:1px dashed var(--line);border-radius:10px;font-size:12px;color:var(--muted)}.ps-unlocated a{color:var(--accent)}.ps-unlocated p{line-height:1.7}.ps-enlarge{box-sizing:border-box;width:min(960px,94vw);max-height:90vh;overflow:auto;padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--panel-solid,#fff);color:var(--text)}.ps-enlarge::backdrop{background:#17203399}.ps-enlarge header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;position:sticky;top:-18px;padding:10px 0;background:var(--panel-solid,#fff);z-index:1}.ps-enlarge .ps-crop{max-height:none}.ps-enlarge .pr-button{flex:none}@media(max-width:520px){.ps-region{padding:9px}.ps-enlarge{padding:12px}.ps-enlarge header{top:-12px}}';document.head.appendChild(cropStyle);
})();

/* ===== paper-review-hub.js ===== */
/* One paper workspace: upload, check questions, then read related reports. */
(function () {
  'use strict';
  function entryOnly() { return window.ScorePaperEntryOnly === true; }
  var esc = function (s) { return escapeHtml(String(s == null ? '' : s)); };
  var names = { strengths: '找出做得好的地方', difficulty: '看懂试卷难在哪里', causes: '分析为什么丢分', solutions: '讲清关键解题步骤', practice: '生成针对性练习', patterns: '找出多道题的共同特点', plan: '安排接下来的复习' };
  var labels = { running: '分析中', paused: '可继续', succeeded: '已完成', failed: '待恢复', draft: '资料草稿' };
  var ctx, root, generation = 0, rows = [], drafts = [], more = false, origin = null, seed = null, selection = null, activeEditor = null, pendingAnalysis = null, paper = null, requestVersion = 0;
  function leaveEditor() { if (activeEditor && activeEditor.canLeave && !activeEditor.canLeave()) return false; if (activeEditor && activeEditor.dispose) activeEditor.dispose(); activeEditor = null; return true; }
  var filters = { subject: '', exam_id: '', status: '', search: '' };
  function user() { return String(state.user && state.user.id || ''); }
  function context() { return { user: user(), token: state.token }; }
  function api(action, body) { return window.ScorePaperReview.api(ctx, action, body); }
  function button(label, action, primary) { return '<button type="button" class="pr-button ' + (primary ? 'pr-primary' : '') + '" data-hub="' + action + '">' + label + '</button>'; }
  function exams() { return state.exams || []; }
  function examName(id) { var e = exams().find(function (e) { return e.id === id; }); return e ? e.name : id ? '已关联考试' : '未关联考试'; }
  function examOptions(id, subject) { return '<option value="">暂不关联考试</option>' + exams().filter(function (e) { return !subject || e.scores && e.scores[subject]; }).map(function (e) { return '<option value="' + esc(e.id) + '" ' + (id === e.id ? 'selected' : '') + '>' + esc(e.name + ' · ' + e.exam_date) + '</option>'; }).join(''); }
  function subjects() { return Array.from(new Set(['语文','数学','英语','物理','化学','生物','政治','历史','地理'].concat(exams().flatMap(function (e) { return Object.keys(e.scores || {}); }), rows.map(function (r) { return r.subject; })))); }
  function navigation() {
    var selected = state.analysisTab === 'ai' ? 'papers' : state.analysisTab || 'stats', labels = { stats:'成绩分析', types:'题型分析', papers:entryOnly()?'试题录入':'试卷复盘' };
    return '<nav class="ph-tabs" aria-label="分析分类">' + Object.keys(labels).map(function(k){return '<button type="button" aria-pressed="'+(selected===k)+'" data-analysis-tab="'+k+'">'+labels[k]+'</button>';}).join('') + '</nav>';
  }
  function tabs(node) { if (node) node.insertAdjacentHTML('afterbegin', navigation()); }
  document.addEventListener('click', function(e) {
    var b=e.target.closest('[data-analysis-tab]'); if(!b || !leaveEditor())return;
    state.analysisTab=b.dataset.analysisTab; selection=null; seed=null; renderPage();
  });
  function analyzeRecord(row) {
    if (entryOnly()) { note('试卷分析暂未开放，可继续核对和保存试题。'); return; }
    if (!leaveEditor()) return;
    state.analysisTab='papers'; selection=null; shell();root.querySelector('.ph-header').hidden=true;
    body().innerHTML = paperNavigation('reports') + '<div class="ph-analysis-setup"></div>';
    window.ScorePaperRecords.configure(body().querySelector('.ph-analysis-setup'), row, { api:api,
      user:ctx.user, open:async function(id){await open(id);},
      started:async function(id){await open(id);} });
    window.scrollTo(0,0);
  }
  function note(s) { var el = root && root.querySelector('.ph-message'); if (el) el.textContent = s || ''; }
  function shell() {
    root.innerHTML = '<div class="ph-workspace"><header class="ph-header"><div><span class="pr-eyebrow">学习复盘</span><h1>' + '试卷复盘' + '</h1><p>' + '上传试卷，核对得分，查看题型表现和 AI 分析。' + '</p></div><div>' + (origin && origin.modal.isConnected ? button('返回正在编辑的考试', 'return') : '') + button('上传试卷', 'new', true) + '</div></header><div class="ph-message" role="status" aria-live="polite"></div><div class="ph-body"></div></div>';
    tabs(root.firstElementChild);
    if (entryOnly()) {
      root.querySelector('.pr-eyebrow').textContent='试题资料';
      root.querySelector('.ph-header h1').textContent='试题录入';
      root.querySelector('.ph-header p').textContent='读取题目、作答和已有批改分，确认后保存。';
    }
    root.querySelector('.ph-workspace').onclick = async function (e) {
      var b = e.target.closest('[data-hub]'); if (!b) return;
      try {
        if (/^(new|list|return|open:|draft:|paper-)/.test(b.dataset.hub) && !leaveEditor()) return;
        if (b.dataset.hub === 'new') { selection = null; seed = null; state.analysisTab='papers'; shell(); await create(); }
        else if (b.dataset.hub === 'list') { paper=null; await list(); }
        else if (b.dataset.hub === 'paper-record' && paper && paper.record) await open(paper.record.request_id);
        else if (b.dataset.hub === 'paper-reports' && paper) showReports();
        else if (b.dataset.hub === 'paper-more-reports' && paper) await moreReports();
        else if (b.dataset.hub === 'paper-analyze' && paper && paper.record) analyzeRecord(paper.record);
        else if (b.dataset.hub === 'more') await list(true);
        else if (b.dataset.hub === 'return') { origin.modal.style.display = ''; state.page = origin.previousPage || 'exams'; state.analysisTab = 'ai'; renderPage(); }
        else if (b.dataset.hub.startsWith('open:')) await open(b.dataset.hub.slice(5));
        else if (b.dataset.hub.startsWith('draft:')) await create(drafts.find(function (r) { return r.request_id === b.dataset.hub.slice(6); }));
        else if (b.dataset.hub.startsWith('delete-draft:') && confirm('删除这份资料草稿及扫描件？')) { b.disabled = true; await api('delete_draft', { request_id: b.dataset.hub.slice(13) }); await list(); }
      } catch (err) { note(err.message); } finally { if (b.isConnected) b.disabled = false; }
    };
  }
  function body() { return root.querySelector('.ph-body'); }
  function sourceId(r) { return r.source_record && r.source_record.request_id || r.result && r.result.source_record && r.result.source_record.request_id || r.request_id; }
  function isRecord(r) { return r.options && r.options.purpose === 'record'; }
  function renderCards() {
    var host = root.querySelector('.ph-list'); if (!host) return;
    var groups = new Map();
    drafts.forEach(function(d){if((!filters.subject || d.subject===filters.subject)&&(!filters.exam_id || d.exam_id===filters.exam_id))groups.set(d.request_id,{record:Object.assign({},d,{status:'draft'}),reports:[]});});
    rows.forEach(function(r){if(entryOnly()&&!isRecord(r))return;var id=sourceId(r),g=groups.get(id)||{record:null,reports:[]};if(isRecord(r))g.record=r;else if(!g.reports.some(function(a){return a.request_id===r.request_id;}))g.reports.push(r);groups.set(id,g);});
    var cards=Array.from(groups.values()).map(function(g){
      g.reports.sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at));});
      var latest=g.reports[0],r=g.record||latest;
      var current=latest && ['running','paused','failed'].includes(latest.status)?latest:r;
      var progress=current.entry_progress||current.result&&current.result.entry_progress||null;
      var status=current.status==='draft'?'资料草稿':current.status==='running'?(isRecord(current)?'识别中':'分析中'):current.status==='paused'?'待继续':current.status==='failed'?'待恢复':(current.entry_completion||current.result&&current.result.entry_completion)?'录入完成':(progress&&progress.pending!=null?'待核对 · '+progress.pending+' 处':'待核对');
      var target=current.status==='draft'?current.request_id:latest?latest.request_id:r.request_id;
      var action=current.status==='draft'?'继续上传':['running','paused','failed'].includes(current.status)?'查看进度 / 继续':isRecord(current)?'查看试题':'查看报告';
      return {g:g,row:r,status:status,target:target,action:action,current:current};
    }).filter(function(c){return (!filters.status || c.current.status===filters.status) && (!filters.search || [c.row.title,c.row.subject,examName(c.row.exam_id)].join(' ').toLowerCase().includes(filters.search.toLowerCase()));});
    host.innerHTML = cards.length ? cards.map(function(c){var r=c.row;return '<article class="ph-card"><div class="ph-card-top"><span class="ph-subject">'+esc(r.subject)+'</span><span class="ph-status">'+esc(c.status)+'</span></div><h3>'+esc(r.title||examName(r.exam_id)+' · '+r.subject)+'</h3><p>'+esc(examName(r.exam_id))+'</p><small>'+esc(new Date(r.created_at).toLocaleString('zh-CN'))+(c.g.reports.length?' · '+c.g.reports.length+' 份已加载报告':'')+'</small>'+(c.current.progress && c.current.status!=='succeeded'?'<p class="ph-progress">'+esc(c.current.progress.message||'进度已保存')+'</p>':'')+'<footer>'+button(c.action,(c.current.status==='draft'?'draft:':'open:')+c.target,true)+(c.g.record && c.g.reports.length?button('试题与得分','open:'+c.g.record.request_id):'')+(r.status==='draft'?button('删除草稿','delete-draft:'+r.request_id):'')+'</footer></article>';}).join('') : '<div class="ph-empty"><h3>'+(filters.subject||filters.exam_id||filters.status||filters.search?'没有符合条件的试卷':'从一张试卷开始')+'</h3><p>上传试卷与作答，核对后可查看题型表现，也可以稍后再生成 AI 分析。</p>'+button('上传试卷','new',true)+'</div>';
    root.querySelector('.ph-more').innerHTML=more?button('加载更多试卷','more'):'';
    if(entryOnly()&&host.querySelector('.ph-empty p'))host.querySelector('.ph-empty p').textContent='上传试卷与作答，核对后保存试题，并更新题型得分。';
  }
  async function list(append) {
    selection = null; seed = null; paper = null; root.querySelector('.ph-header').hidden=false;var version=++requestVersion;
    if (!append) {
      body().innerHTML = '<details class="ph-list-filters"><summary>筛选试卷</summary><div class="ph-filters"><label>科目<select data-filter="subject"><option value="">全部科目</option>' + subjects().map(function (s) { return '<option ' + (filters.subject === s ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label><label>考试<select data-filter="exam_id">' + examOptions(filters.exam_id).replace('暂不关联考试','全部考试') + '</select></label><label>状态<select data-filter="status"><option value="">全部状态</option>' + Object.keys(labels).filter(function (k) { return k !== 'draft'; }).map(function (k) { return '<option value="' + k + '" ' + (filters.status === k ? 'selected' : '') + '>' + labels[k] + '</option>'; }).join('') + '</select></label><label>搜索已加载记录<input data-search value="' + esc(filters.search) + '" placeholder="试卷名称、科目或考试"></label>' + button('刷新', 'list') + '</div></details><div class="ph-list" aria-live="polite">正在读取试卷…</div><div class="ph-more"></div>';
      body().querySelectorAll('[data-filter]').forEach(function (el) { el.onchange = function () { filters[el.dataset.filter] = el.value; list().catch(function (e) { note(e.message); }); }; });
      body().querySelector('[data-search]').oninput = function (e) { filters.search = e.target.value; renderCards(); };
    }
    var gen = generation; note('');
    try { var data = await api('list_all', Object.assign({}, filters, { offset: append ? rows.length : 0, status:'' })); if (gen !== generation || version!==requestVersion || !root.isConnected) return; rows = append ? rows.concat(data.reviews.filter(function(r){return !rows.some(function(old){return old.request_id===r.request_id;});})) : data.reviews; if (!append) drafts = data.drafts || []; more = data.has_more; renderCards(); }
    catch (e) { note(e.message); var el = root.querySelector('.ph-list'); if (el) el.innerHTML = '<p>记录读取未完成，请点击刷新重试。</p>'; }
  }
  function optionSelect(key, label, values, chosen) { return '<label>' + label + '<select name="' + key + '">' + Object.keys(values).map(function (k) { return '<option value="' + k + '" ' + (String(chosen) === k ? 'selected' : '') + '>' + values[k] + '</option>'; }).join('') + '</select></label>'; }
  function choice(name, value, title, description, selected, type) {
    return '<label class="ph-choice"><input type="' + (type || 'radio') + '" name="' + name + '" value="' + esc(value) + '" ' + (selected ? 'checked' : '') + '><span><strong>' + title + '</strong><small>' + description + '</small></span></label>';
  }
  function step(n, title, description) { return '<div class="ph-step"><span>' + n + '</span><div><h3>' + title + '</h3><p>' + description + '</p></div></div>'; }
  async function create(draft) {
    root.querySelector('.ph-header').hidden=true;
    var gen=generation, data=draft || seed || {}, opts=Object.assign({},data.options || {}), selectedSubject=data.subject || '';
    selection=null;
    body().innerHTML='<div class="ph-create"><div class="ph-section-title"><div><h2>'+(draft?'继续试题录入':'上传试卷')+'</h2><p>先上传并识别，核对后可保存题型得分，也可以生成 AI 分析。</p></div>'+button('返回试卷列表','list')+'</div><form class="ph-basics">'+step('01','录入哪张试卷','可以先录入，之后再关联考试。')+'<div class="ph-form-grid"><label>科目<input name="subject" list="ph-subjects" maxlength="40" required placeholder="请选择或输入科目" value="'+esc(selectedSubject)+'"><datalist id="ph-subjects">'+subjects().map(function(n){return '<option value="'+esc(n)+'">';}).join('')+'</datalist></label><label>关联考试<select name="exam_id">'+examOptions(data.exam_id || '',selectedSubject)+'</select></label></div><details class="ph-name"><summary>试卷名称 <span data-title-preview></span></summary><label>自定义名称<input name="title" maxlength="100" value="'+esc(data.title || '')+'" placeholder="按考试和科目自动命名"></label></details>'+(data.originDraft?'<p class="ph-hint">保存正在编辑的考试后，试题会自动关联。</p>':'')+'</form><div class="ph-editor ph-create-editor"></div></div>';
    var basics=body().querySelector('form'), c=Object.assign(context(),{host:body().querySelector('.ph-editor'),draftId:data.draft_id || crypto.randomUUID(),restoreDraft:!!draft,sessions:{},setup:true,fresh:!draft,onClose:list});
    if(entryOnly())body().querySelector('.ph-section-title p').textContent='读取已有内容，确认识别结果后保存。';
    function update(){
      var subject=basics.elements.subject.value.trim();
      c.title=basics.elements.title.value.trim() || (basics.elements.exam_id.value?examName(basics.elements.exam_id.value)+' · ':'')+(subject || '试卷')+' · 试题';
      basics.querySelector('[data-title-preview]').textContent=c.title;
      c.options=Object.assign({},opts,{config_version:2,purpose:'record',modules:[],review_before_analysis:false,analysis_scope:'all',selected_questions:[],use_account_history:false});
      c.examId=basics.elements.exam_id.value;c.exam=exams().find(function(e){return e.id===c.examId;});c.examContext=undefined;
    }
    basics.onsubmit=function(e){e.preventDefault();};basics.oninput=update;
    basics.elements.subject.onchange=function(){var id=basics.elements.exam_id.value;basics.elements.exam_id.innerHTML=examOptions(id,basics.elements.subject.value.trim());update();};
    c.beforeSubmit=async function(){if(!basics.reportValidity())throw new Error('请先选择科目');update();return basics.elements.subject.value.trim();};
    c.onUpload=function(){update();};c.onAnalyzeRecord=analyzeRecord;c.onRecorded=function(row){open(row.request_id).catch(function(e){note(e.message);});};
    c.onNewEntry=function(){generation++;selection=null;seed=null;paper=null;shell();create().catch(function(e){note(e.message);});};
    c.onView=function(view){basics.hidden=view!=='upload';body().querySelector('.ph-section-title').hidden=view!=='upload';c.host.classList.toggle('ph-creating',view==='upload');};
    if(draft && !data.pages){
      note('正在恢复已保存的扫描件…');var source=await api('sources',{request_id:draft.request_id});
      data.pages=await Promise.all(source.pages.map(async function(p){var response=await window.ScorePaperSupport.fetchScan(p);if(!response.ok)throw new Error('扫描件读取失败，请重试');var prepared=await window.ScorePaperReview.prepare(await response.blob());return Object.assign(prepared,{role:p.role,name:'第'+p.page+'页'});}));
    }
    if(gen!==generation)return;
    if(data.pages)c.sessions[selectedSubject]={pages:data.pages,workOnPaper:data.workOnPaper!==undefined?data.workOnPaper:opts.work_location!=='none'&&opts.work_location!=='separate',workLocation:opts.work_location,consent:false,pending:null,cloudDraftId:draft&&draft.request_id};
    activeEditor=c;update();note('');window.ScorePaperReview.mount(c,selectedSubject,null);
  }
  function mount(data, reportId) {
    root.querySelector('.ph-header').hidden=true;
    selection = { data: data, reportId: reportId }; seed = null; note('');
    body().innerHTML = paperNavigation(data.options && data.options.purpose==='record'?'record':'reports') + '<div class="ph-editor-toolbar"><span>' + esc(data.title || data.subject + '试卷') + ' · ' + esc(examName(data.exam_id)) + '</span>' + (reportId ? button('关联考试 / 名称', 'link') : '<span class="pr-muted">每轮 ' + data.options.time_budget_minutes + ' 分钟 · ' + (data.options.purpose === 'record' ? '只录入' : data.options.modules.length + ' 项分析')) + '</div><div class="ph-editor"></div>';
    var host = body().querySelector('.ph-editor'), exam = exams().find(function (e) { return e.id === data.exam_id; });
    var c = Object.assign(context(), { host: host, exam: exam, examId: data.exam_id || '', draftId: data.draft_id, sessions: {}, title: data.title, options: data.options, examContext: data.examContext, initialReport: reportId, onClose: list });
    if (data.pages) c.sessions[data.subject] = { pages: data.pages, workOnPaper: true, consent: false, pending: null };
    if (data.request_id) c.sessions[data.subject].cloudDraftId = data.request_id;
    c.onAnalyzeRecord = analyzeRecord;
    c.onRecordChange=function(row){if(paper && paper.record && paper.record.request_id===row.request_id)paper.record=row;};
    activeEditor = c;
    window.ScorePaperReview.mount(c, data.subject, null);
    var link = body().querySelector('[data-hub=link]'); if (link) link.onclick = function () {
      if(activeEditor && activeEditor.canLeave && !activeEditor.canLeave())return;
      var panel = document.createElement('form'); panel.className = 'ph-link-form'; panel.innerHTML = '<label>报告名称<input name="title" maxlength="100" value="' + esc(data.title || '') + '"></label><label>关联到考试<select name="exam">' + examOptions(data.exam_id, data.subject) + '</select></label><p class="pr-muted">关联用于整理记录；报告保留开始分析时的考试数值。</p><button class="pr-button pr-primary" type="submit">保存关联</button>';
      link.replaceWith(panel); panel.onsubmit = async function (e) { e.preventDefault(); try { await api('link', { request_id: reportId, exam_id: panel.elements.exam.value || null, title: panel.elements.title.value }); await open(reportId); note('关联已保存'); } catch (err) { note(err.message); } };
    };
  }
  function paperNavigation(active) {
    if(!paper)return '';
    if(entryOnly())return '<div class="ph-paper-bar">'+button('所有试卷','list')+'<span class="pr-muted">试题与得分</span></div>';
    return '<div class="ph-paper-bar">'+button('所有试卷','list')+'<nav aria-label="本份试卷">'+(paper.record?'<button type="button" class="pr-button" aria-pressed="'+(active==='record')+'" data-hub="paper-record">试题与得分</button>':'')+'<button type="button" class="pr-button" aria-pressed="'+(active==='reports')+'" data-hub="paper-reports">AI 分析'+(paper.reports.length?' · '+paper.reports.length:'')+'</button></nav></div>';
  }
  function showReports() {
    if(entryOnly()){if(paper&&paper.record)open(paper.record.request_id);return;}
    selection=null;
    body().innerHTML=paperNavigation('reports')+'<section class="ph-report-list"><h2>这份试卷的 AI 分析</h2><p class="pr-muted">使用已保存的题目生成报告，不必重新上传或识别。</p>'+(paper.record && paper.record.status==='succeeded'?button(paper.reports.length?'重新生成分析 · 消耗 1 次':'生成 AI 分析 · 消耗 1 次','paper-analyze',true):'')+(!paper.record?'<p class="pr-muted">原始录入已移除，仍可查看已保存的报告。</p>':'')+'<div class="ph-list">'+(paper.reports.length?paper.reports.map(function(r){return '<article class="ph-card"><span class="ph-status">'+esc(labels[r.status])+'</span><h3>'+esc(r.title||r.subject+' · AI 分析')+'</h3><p>'+esc(new Date(r.created_at).toLocaleString('zh-CN'))+'</p>'+button(r.status==='succeeded'?'查看报告':'查看进度 / 继续','open:'+r.request_id,true)+'</article>';}).join(''):'<p>还没有分析报告。试题已保存，可以现在分析，也可以稍后继续。</p>')+'</div>'+(paper.more?button('加载更多报告','paper-more-reports'):'')+'</section>';
  }
  async function moreReports(){var current=paper,version=++requestVersion;var data=await api('list_all',{source_request_id:current.id,offset:current.reports.length});if(paper!==current||version!==requestVersion)return;current.reports=current.reports.concat(data.reviews.filter(function(r){return !current.reports.some(function(old){return old.request_id===r.request_id;});}));current.more=data.has_more;showReports();}
  async function open(id) {
    var version=++requestVersion,gen=generation,d=await api('get',{request_id:id}),r=d.review,source=sourceId(r),record=isRecord(r)?r:null;
    var data=await api('list_all',{source_request_id:source,offset:0});
    if(!record && (r.source_record || r.result && r.result.source_record)){try{record=(await api('get',{request_id:source})).review;}catch(e){if(e.status!==404)throw e;}}
    if(gen!==generation || version!==requestVersion || !root.isConnected)return;
    paper={id:source,record:record,reports:data.reviews,more:data.has_more};
    if(!isRecord(r) && !paper.reports.some(function(x){return x.request_id===r.request_id;}))paper.reports.unshift(r);
    state.analysisTab='papers';
    mount({subject:r.subject,exam_id:r.exam_id,draft_id:r.draft_id,title:r.title,options:r.options||{}},id);
  }
  function enter(old, subject, examContext) {
    old.previousPage = state.page; origin = old; old.modal.style.display = 'none';
    var freshDraft = crypto.randomUUID(); old.draftId = freshDraft;
    seed = { subject: subject, exam_id: old.exam && old.exam.scores && old.exam.scores[subject] ? old.examId : '', draft_id: freshDraft, examContext: examContext, title: (old.modal.querySelector('#examName').value || '考试') + ' · ' + subject, originDraft: !old.examId }; selection = null;
    state.analysisTab = 'papers'; state.page = 'stats'; renderPage();
  }
  function render(node) {
    if (!node) return; generation++; root = node;if(state.analysisTab==='ai')state.analysisTab='papers';
    var next = context(); if (ctx && ctx.user !== next.user) { seed = null; selection = null; rows = []; drafts = []; origin = null; paper = null; } ctx = next;
    shell(); if (pendingAnalysis) { var record=pendingAnalysis; pendingAnalysis=null; analyzeRecord(record); } else if (selection) mount(selection.data, selection.reportId); else if (seed) create().catch(function (e) { note(e.message); }); else list();
  }
  window.ScorePaperHub = { tabs: tabs, navigation:navigation, render: render, enter: enter, open:open, canLeave:leaveEditor,
    analyze:function(row){pendingAnalysis=row;state.page='stats';state.analysisTab='papers';selection=null;seed=null;renderPage();} };
  var style = document.createElement('style'); style.textContent = `
.ph-workspace{max-width:1100px;margin:0 auto;padding:0 0 40px;color:var(--text)}.ph-tabs{display:flex;gap:6px;margin:0 0 24px;padding:5px;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:13px;width:fit-content}.ph-tabs button{border:0;background:transparent;color:var(--muted);padding:10px 22px;border-radius:9px;font:inherit;font-size:14px;cursor:pointer}.ph-tabs [aria-pressed=true]{background:var(--accent-soft,#eef1ff);color:var(--accent);font-weight:700}.ph-header,.ph-section-title{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.ph-header h1{font-size:26px;margin:6px 0}.ph-header p,.ph-section-title p{font-size:13px;color:var(--muted);margin:5px 0}.ph-header>div:last-child{display:flex;gap:8px;flex-wrap:wrap}.ph-filters{display:grid;grid-template-columns:1fr 1.4fr 1fr 1.6fr auto;gap:12px;align-items:end;margin:20px 0}.ph-workspace label{font-size:12px;color:var(--muted)}.ph-workspace input:not([type=checkbox]):not([type=file]),.ph-workspace select,.ph-workspace textarea{box-sizing:border-box;width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;font-size:14px;margin-top:6px}.ph-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.ph-card{min-width:0;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:16px;padding:20px;display:flex;flex-direction:column}.ph-card h3{font-size:17px;line-height:1.5;margin:16px 0 7px;overflow-wrap:anywhere}.ph-card p{font-size:13px;color:var(--muted);margin:4px 0 8px}.ph-card small{font-size:11px;color:var(--muted)}.ph-card-top{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ph-subject{font-weight:700;color:var(--accent)}.ph-status{padding:3px 8px;border-radius:20px;background:var(--accent-soft);font-size:11px}.ph-succeeded{color:#31846c;background:#31846c15}.ph-card footer{display:flex;gap:8px;margin-top:auto;padding-top:18px}.ph-progress{padding-top:10px}.ph-empty{grid-column:1/-1;padding:55px 18px;text-align:center;border:1px dashed var(--line);border-radius:16px}.ph-empty p{font-size:13px;color:var(--muted)}.ph-more{text-align:center;margin:20px}.ph-message:empty{display:none}.ph-message{padding:12px;border-radius:10px;background:var(--accent-soft);font-size:13px;margin-bottom:16px}.ph-create{background:var(--panel-solid,#fff);padding:26px;border:1px solid var(--line);border-radius:18px}.ph-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ph-create fieldset{border:1px solid var(--line);border-radius:12px;padding:18px;margin:24px 0}.ph-create legend{font-size:14px;font-weight:700;padding:0 7px}.ph-create fieldset p,.ph-hint{font-size:12px;color:var(--muted);line-height:1.8}.ph-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ph-modules label{display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px}.ph-modules input{accent-color:var(--accent)}.ph-create fieldset:disabled{opacity:.5}.ph-actions{text-align:right;padding-top:15px}.ph-editor-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;margin-bottom:15px;flex-wrap:wrap}.ph-link-form{display:grid;gap:10px;flex:1}.pr-inline{width:100%!important;max-width:100%!important;max-height:none!important;height:auto!important;margin:0!important;border:1px solid var(--line)!important;border-radius:16px!important;box-shadow:none;overflow:visible}.pr-inline .pr-head{position:static;border-radius:16px 16px 0 0}.pr-inline .pr-tabs{display:none}.pr-inline .pr-content{padding-top:20px}.pr-inline .pr-main{max-width:850px;margin:auto}.ph-workspace button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:800px){.ph-list{grid-template-columns:repeat(2,minmax(0,1fr))}.ph-filters{grid-template-columns:1fr 1fr}.ph-filters>button{justify-self:start}.ph-header{align-items:start}.ph-header h1{font-size:22px}.ph-modules{grid-template-columns:1fr 1fr}}@media(max-width:520px){.ph-header,.ph-section-title{flex-direction:column;align-items:stretch}.ph-header>div:last-child{justify-content:flex-start}.ph-list{grid-template-columns:1fr}.ph-create{padding:18px}.ph-form-grid{grid-template-columns:1fr}.ph-tabs{width:100%;box-sizing:border-box}.ph-tabs button{flex:1;padding:9px 10px}.ph-workspace .pr-head{align-items:start;gap:8px}.ph-editor-toolbar{align-items:start}.pr-inline .pr-content{padding:12px 14px 22px}.ph-workspace{padding-bottom:60px}}`;
  style.textContent += `
/* Guided setup and readable report hierarchy. */
.ph-create{padding:28px}.ph-create h2{font-size:26px;margin:0 0 8px}.ph-create .ph-section-title p,.ph-step p{font-size:14px;line-height:1.7}.ph-step{display:flex;gap:14px;align-items:flex-start;margin:26px 0 20px}.ph-step>span{display:grid;place-items:center;min-width:34px;height:34px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:14px}.ph-step h3{font-size:20px!important;margin:1px 0 5px!important;line-height:1.4}.ph-step p{margin:0;color:var(--muted)}.ph-create label{font-size:14px}.ph-name{margin-top:18px}.ph-name summary{cursor:pointer;font-size:14px}.ph-name summary span{color:var(--muted);margin-left:8px}.ph-name label{display:block;margin-top:12px}.ph-create .ph-create-editor .pr-inline{border:0!important;border-radius:0!important}.ph-create .ph-creating .pr-head{display:none}.ph-create .pr-content{padding:0}.ph-create .pr-main{max-width:none}.ph-create .pr-intro{padding:20px;margin:22px 0;background:var(--accent-soft);border-radius:12px}.ph-create .pr-intro h3{font-size:18px}.ph-create .pr-intro p,.ph-create .pr-quota{font-size:14px;line-height:1.65}.ph-create .pr-upload-group{padding:20px 0}.ph-create .pr-upload-group h3{font-size:17px}.ph-create .pr-upload-group>p{font-size:14px}.ph-create .pr-work-location{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0;border:0;margin:20px 0}.pr-work-location legend{font-size:16px;font-weight:650;margin-bottom:12px}.pr-work-location label,.ph-choice{display:flex!important;align-items:flex-start!important;gap:9px!important;padding:15px!important;border:1px solid var(--line);border-radius:11px;cursor:pointer;background:var(--panel-solid);min-width:0}.pr-work-location label:has(input:checked),.ph-choice:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}.ph-choice input,.pr-work-location input{margin:4px 0 0;flex:none;accent-color:var(--accent)}.ph-choice strong,.pr-work-location strong{display:block;font-size:15px;font-weight:650;line-height:1.5;color:var(--text)}.ph-choice small,.pr-work-location small{display:block;font-size:13px;line-height:1.65;color:var(--muted);margin-top:5px}.ph-create .ph-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;border:0;padding:0;margin:0}.ph-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.ph-create .ph-modules{grid-template-columns:1fr 1fr;margin:16px 0}.ph-preferences{border-top:1px solid var(--line);margin-top:28px}.ph-preferences .ph-step:first-child{margin-top:28px}.ph-core-note{font-size:14px!important;line-height:1.8;padding:13px 0;color:var(--muted)}.ph-context,.ph-custom{border:1px solid var(--line);border-radius:12px;padding:0 16px;margin:14px 0}.ph-context>summary,.ph-custom>summary{padding:16px 0;font-size:15px;font-weight:600;cursor:pointer;line-height:1.5}.ph-context>summary small{font-weight:400;color:var(--muted);font-size:13px}.ph-context[open],.ph-custom[open]{padding-bottom:16px}.ph-context>label,.ph-custom>label{display:block;margin-top:14px}.ph-hint{font-size:13px!important;line-height:1.8}.ph-example{font-size:14px;padding:15px;border-radius:10px;background:var(--accent-soft);line-height:1.8;align-self:end}.ph-create .ph-priorities{border:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:20px 0}.ph-priorities legend{margin-bottom:12px}.ph-summary{padding:18px;border-radius:12px;background:var(--accent-soft);margin:20px 0;font-size:15px}.ph-summary p{font-size:14px;line-height:1.8;margin:8px 0 0}.ph-create .pr-footer{position:sticky;bottom:70px;z-index:4;background:var(--panel-solid);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:0 4px 20px #00000008;flex-wrap:wrap}.ph-create .pr-footer .pr-button{min-height:44px;font-size:14px}.ph-create .pr-consent{font-size:13px;line-height:1.75;margin:24px 0 16px}.ph-create [hidden],.pr-main [hidden]{display:none!important}.ph-create .pr-help{font-size:13px}.ph-create .ph-form-grid{gap:16px}.ph-create .pr-message{font-size:14px}.ph-create .pr-check{font-size:14px}
.pr-main .pr-result-top h3{font-size:27px;margin-top:8px}.pr-main .pr-chapter{margin:0 0 22px;gap:14px}.pr-main .pr-chapter h3{font-size:22px;line-height:1.4}.pr-main .pr-chapter p{font-size:14px;line-height:1.7}.pr-main .pr-reading-section{padding-top:28px;margin-top:28px;border-top:1px solid var(--line)}.pr-main .pr-overall-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 24px}.pr-metric{padding:16px;border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;gap:8px;min-width:0}.pr-metric>span{font-size:13px;color:var(--muted)}.pr-metric strong{font-size:25px;line-height:1.3;letter-spacing:-.6px;font-variant-numeric:tabular-nums}.pr-metric small{font-size:13px;line-height:1.6;color:var(--muted)}.pr-main .pr-headline{font-size:19px;line-height:1.65;font-weight:700;margin:24px 0 12px}.pr-main .pr-overview .pr-prose{font-size:16px;line-height:1.8}.pr-overall-findings{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}.pr-overall-findings>section{padding:18px;border:1px solid var(--line);border-radius:12px;border-top:3px solid #43937a}.pr-overall-findings>.pr-overall-gap{border-top-color:#c98c4c}.pr-main .pr-overall-findings h4{font-size:16px;margin:0 0 14px}.pr-overall-findings article{margin:14px 0 0}.pr-overall-findings strong{font-size:15px;line-height:1.7;display:block}.pr-first-action{padding:18px;background:var(--accent-soft);border-radius:12px;line-height:1.8;font-size:15px}.pr-first-action .pr-button{margin-top:10px}.pr-main .pr-recollection{font-size:14px;color:var(--muted);line-height:1.8;margin-top:18px}.pr-main .pr-prose,.pr-main .pr-text{font-size:15px;line-height:1.8}.pr-main .pr-muted,.pr-main .pr-evidence{font-size:13px;line-height:1.75}.pr-main h4{font-size:16px;margin-top:20px}.pr-main .pr-fold>summary{font-size:15px;padding:15px 2px}.pr-main .pr-question>summary{font-size:16px;min-height:52px}.pr-main .pr-question summary small{font-size:13px}.pr-main .pr-badge{font-size:14px}.pr-main .pr-question-body h4{font-size:16px}.pr-main .pr-key-gaps article{padding:16px 0;border-bottom:1px solid var(--line)}.pr-key-gaps strong{font-size:17px}.pr-main .pr-pattern h4{font-size:17px}.pr-main .pr-action-plan{background:var(--panel-solid);border:1px solid var(--line)}.pr-main .pr-action h4{font-size:17px}.pr-main .pr-success{font-size:14px;padding:12px 14px}.pr-main .pr-report-nav .pr-button{flex:0 1 auto;font-size:13px;min-height:44px}.pr-main .pr-correct-prefix{border-left:3px solid #43937a;padding:12px 16px;margin-bottom:18px}.pr-main .pr-correct-prefix h4{margin-top:0}.pr-main .pr-difficulty-table{font-size:14px}.pr-main .pr-loss-map>span{font-size:14px;padding:10px}.pr-main .pr-win-card h4{font-size:14px}.pr-main .pr-context>summary{font-size:15px}.pr-main .pr-question .pr-check{font-size:13px}
@media(min-width:1080px){.ph-preferences{display:grid;grid-template-columns:minmax(0,1fr) 235px;gap:0 24px;align-items:start}.ph-preferences>*{grid-column:1;min-width:0}.ph-preferences>.ph-summary{grid-column:2;grid-row:1/7;position:sticky;top:24px;margin-top:28px}.ph-create .ph-presets{grid-template-columns:1fr}.ph-presets .ph-choice{padding:13px 16px!important}}
@media(max-width:700px){.ph-create{padding:18px}.ph-create .ph-presets,.ph-create .pr-work-location,.ph-create .ph-priorities{grid-template-columns:1fr}.ph-create .ph-modules{grid-template-columns:1fr}.ph-create .ph-form-grid{grid-template-columns:1fr}.ph-create .pr-footer{bottom:75px;gap:8px}.ph-create .pr-footer>span{width:100%}.ph-create .pr-footer .pr-button{flex:1}.pr-main .pr-overall-metrics{grid-template-columns:1fr 1fr;gap:10px}.pr-metric{padding:13px}.pr-metric strong{font-size:25px}.pr-overall-findings{grid-template-columns:1fr}.pr-main .pr-chapter h3{font-size:20px}.pr-main .pr-report-nav{gap:6px}.pr-main .pr-report-nav .pr-button{flex:1 0 28%;padding:8px}.pr-main .pr-difficulty-table tr{grid-template-columns:repeat(3,minmax(0,1fr))}.pr-main .pr-difficulty-table td:nth-child(2)::before{content:'难度 '}.pr-main .pr-difficulty-table td:nth-child(3)::before{content:'得分 '}.pr-main .pr-difficulty-table td:nth-child(4)::before{content:'主要难点 '}.pr-main .pr-question-body{padding:14px}.ph-create h2{font-size:24px}}
`;
  style.textContent += '.ph-workspace .ph-create input[type=radio]{width:16px;height:16px;padding:0;margin:4px 0 0;border:initial;background:initial;flex:none}.ph-workspace .ph-create input[type=checkbox]{width:16px;height:16px;flex:none}';
  document.head.appendChild(style);
})();

/* ===== paper-records.js ===== */
/* A checked question ledger feeds marks and optional AI reports. */
(function () {
  'use strict';
  var esc = function (v) { return escapeHtml(String(v == null ? '' : v)); };
  var names = { strengths:'优势与得分步骤', difficulty:'题目难度', causes:'失分原因', solutions:'关键解答', practice:'针对性练习', patterns:'跨题共性', plan:'复习安排' };
  function track(event, data) { if (window.__scoreTrackerTrack) window.__scoreTrackerTrack(event, data, 'stats'); }
  function fields(q, c) {
    var level = c.question_difficulty ?? q.question_difficulty ?? '';
    return '<div class="pr-score-fields"><label>题型名称<input data-field="question_type" maxlength="40" placeholder="如：阅读理解 / 填空题" value="' + esc(c.question_type ?? q.question_type) + '"></label><label>题目难度（选填）<select data-field="question_difficulty"><option value="">未标注</option>' + Object.keys(ScoreQuestionTypeModel.difficulties).map(function (k) { return '<option value="' + k + '"' + (k === level ? ' selected' : '') + '>' + ScoreQuestionTypeModel.difficulties[k] + '</option>'; }).join('') + '</select></label></div>';
  }
  function groupsFor(row){return window.ScorePaperBoard?window.ScorePaperBoard.groups(row):row.result.score_groups;}
  function valueOf(c,q,key){return Object.prototype.hasOwnProperty.call(c,key)?c[key]:q[key];}
  function questionState(q, c, items, scoreGroups) {
    var reasons=[];
    if (!q.screenshot_only && !(valueOf(c,q,'stem') || '').trim()) reasons.push('缺少题干');
    if (q.screenshot_only && !(q.source_regions||[]).some(function(r){return r.kind==='paper';})) reasons.push('原题截图待定位');
    if (q.screenshot_only && (q.work_expected || q.work_pages&&q.work_pages.length) && !(q.source_regions||[]).some(function(r){return r.kind==='work';})) reasons.push('作答截图待定位');
    var grouped=q.type_total&&valueOf(c,q,'question_type')===q.type_total.label;
    if(grouped&&items){var members=items.filter(function(i){return i.c.question_type===c.question_type;});grouped=(scoreGroups||[]).some(function(g){return g.label===c.question_type&&g.teacher_score!=null&&g.max_score!=null&&g.questions.length===members.length&&members.every(function(i){return g.questions.includes(i.q.label);});});}
    if (valueOf(c,q,'teacher_score') == null&&!grouped&&(!q.screenshot_only||q.work_expected||q.work_pages&&q.work_pages.length)) reasons.push('缺少得分');
    if (valueOf(c,q,'max_score') == null&&!grouped) reasons.push('缺少满分');
    if (!(valueOf(c,q,'question_type') || '').trim()) reasons.push('未填题型');
    var score=valueOf(c,q,'teacher_score'),max=valueOf(c,q,'max_score');
    if(score!=null&&(!Number.isFinite(score)||score<0)||max!=null&&(!Number.isFinite(max)||max<=0)||score!=null&&max!=null&&score>max)reasons.push('分值需检查');
    if (!c.verified && (q.score_verification === 'conflict' || q.review_status === 'teacher_conflict')) reasons.push('批改分有冲突');
    if (!c.verified && q.answer_verification === 'conflict') reasons.push('作答存在歧义');
    if (!c.verified && (['low','medium'].includes(q.confidence) || !q.screenshot_only&&(q.analysis_mode === 'needs_confirmation' || q.status === 'unclear'))) reasons.push('识别内容待确认');
    if (!c.verified && ['single_read','conflict'].includes(q.max_verification)) reasons.push('满分待复核');
    if (!c.verified && q.score_verification === 'single_read') reasons.push('批改分待复核');
    if (!c.verified) (q.uncertainties||[]).map(function(s){return String(s||'').trim();}).filter(Boolean).slice(0,3).forEach(function(s){reasons.push(s);});
    return { reasons:reasons, verified:!!c.verified };
  }
  function live(main, row) {
    return row.result.questions.map(function(q){
      var node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(q.id);}),old=(row.corrections||[]).find(function(c){return c.id===q.id;})||{};
      function value(k,fallback){var el=node && node.querySelector('[data-field="'+k+'"]');if(!el)return fallback;if(el.type==='checkbox')return el.checked;if(el.type==='number')return el.value.trim()===''?null:Number(el.value);return el.value;}
      return {q:q,c:{stem:value('stem',valueOf(old,q,'stem')),answer:value('answer',valueOf(old,q,'answer')),question_type:value('question_type',valueOf(old,q,'question_type')),question_difficulty:value('question_difficulty',valueOf(old,q,'question_difficulty')),teacher_score:value('teacher_score',valueOf(old,q,'teacher_score')),max_score:value('max_score',valueOf(old,q,'max_score')),verified:value('verified',!!old.verified),accepted:value('accepted',!!old.accepted)}};
    });
  }
  function totals(items, scoreGroups) {
    var groups=new Map(),untyped=0,unverified=0;
    items.forEach(function(item){var c=item.c,name=(c.question_type||'').trim();if(!name){untyped++;return;}if(!c.verified&&!c.accepted)unverified++;
      var g=groups.get(name)||{name:name,score:0,max:0,levels:[]};
      g.score=g.score==null||c.teacher_score==null?null:Math.round((g.score+c.teacher_score)*100)/100;
      g.max=g.max==null||c.max_score==null?null:Math.round((g.max+c.max_score)*100)/100;
      g.levels.push(c.question_difficulty);groups.set(name,g);
    });
    return {rows:Array.from(groups.values()).map(function(g){var level=g.levels[0],members=items.filter(function(i){return (i.c.question_type||'').trim()===g.name;}),group=(scoreGroups||[]).find(function(s){return s.label===g.name&&s.questions.length===members.length&&members.every(function(i){return (i.c.verified||i.c.accepted||!questionState(i.q,i.c,items,scoreGroups).reasons.length)&&s.questions.includes(i.q.label);});});return {name:g.name,score:(!group?.manual?g.score:null)??(group&&members.reduce(function(n,i){return n+(i.c.teacher_score??0);},0)<=group.teacher_score?group.teacher_score:null),max:(!group?.manual?g.max:null)??(group&&members.reduce(function(n,i){return n+(i.c.max_score??0);},0)<=group.max_score?group.max_score:null),difficulty:level&&g.levels.every(function(x){return x===level;})?level:''};}),untyped:untyped,unverified:unverified};
  }
  function existingFor(row) {
    var exam=(state.allExams||state.exams||[]).find(function(e){return e.id===row.exam_id;});return exam && exam.question_type_scores && exam.question_type_scores[row.subject] || [];
  }
  function drawSync(panel, data, linked, screenshot) {
    panel.innerHTML='<h3>本场题型得分</h3><p class="pr-muted">仅汇总你已确认的卷面批改分。</p>'+(data.rows.length?'<div class="pr-type-table"><table><thead><tr><th>题型</th><th>得分 / 满分</th><th>难度</th></tr></thead><tbody>'+data.rows.map(function(r){return '<tr><td>'+esc(r.name)+'</td><td>'+esc(r.score==null?'待补全':r.score)+' / '+esc(r.max==null?'待补全':r.max)+'</td><td>'+esc(ScoreQuestionTypeModel.difficulties[r.difficulty]||'未标注')+'</td></tr>';}).join('')+'</tbody></table></div>':'<p>填写题型名称后，这里会自动汇总。</p>')+
      '<p class="pr-muted">'+(data.untyped?data.untyped+' 题未填题型，不纳入本次汇总。':'')+(data.unverified?(screenshot?'保存时将一并采用没有疑点的识别结果。':data.unverified+' 题尚未对照原卷核对。'):'')+'缺少得分或满分的题型保存为待补全，不参与统计。</p>'+
      (data.existing.length?'<details><summary>查看本科已有的 '+data.existing.length+' 项题型</summary><p>'+data.existing.map(function(r){return esc(r.name)+'：'+esc(r.score==null?'—':r.score)+' / '+esc(r.max==null?'—':r.max);}).join('；')+'</p></details><label class="pr-check" style="display:none"><input type="checkbox" data-replace-types>用上方汇总替换本科已有题型得分</label>':'')+
      (!linked?'<p>关联考试后，即可把这里的得分更新到题型分析。</p>':'')+
      '<div class="pr-footer">'+(linked?'<button type="button" class="pr-button pr-primary" data-sync-types style="display:none">更新题型并完成</button>':'')+'<button type="button" class="pr-button" data-pr="save" style="display:none">仅保存试卷</button></div><p role="status" data-sync-note></p>';
  }
  function decorate(main,row,ctx,api,note,hooks) {
    if(row.result.screenshot_only){
      main.classList.add('pr-screenshot-entry');
      main.querySelectorAll('.pr-source>.pr-fold-body>h4,.pr-source>.pr-fold-body>p').forEach(function(n){n.hidden=true;});
      main.querySelectorAll('[data-field="stem"],[data-field="answer"],[data-field="corrected"]').forEach(function(n){n.closest('label').hidden=true;});
      main.querySelectorAll('.pr-edit>summary').forEach(function(n){n.textContent='修改题型或分数';});
      row.result.questions.forEach(function(q){if(!q.type_total)return;var node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(q.id);});if(node){var hint=document.createElement('p');hint.className='pr-muted pr-type-total';hint.textContent=q.type_total.label+'卷面合计：'+q.type_total.score+' / '+q.type_total.max+' 分；不拆分到每题。';node.querySelector('.pr-question-body').prepend(hint);}});
    }
    var lastBatch=[];
    var overview=document.createElement('section');overview.className='pr-record-overview';overview.setAttribute('aria-label','核对概览');
    main.querySelector('.pr-result-top').after(overview);
    var panel=document.createElement('section');panel.className='pr-type-sync pr-insight';
    main.querySelector('[data-report-section="questions"] > .pr-footer').replaceWith(panel);
    function update(){
      var items=live(main,row),pending=items.filter(function(i){return !i.c.verified&&questionState(i.q,i.c,items,groupsFor(row)).reasons.length;}),verified=items.filter(function(i){return i.c.verified;}).length;
      var total=row.result.total||{};
      overview.innerHTML='<div class="pr-check-metrics"><div><b>'+items.length+'</b><span>已识别题目</span></div><div><b>'+pending.length+'</b><span>处需要核对</span></div><div><b>'+verified+' / '+items.length+'</b><span>已对照原卷</span></div>'+(total.score!=null?'<div><b>'+esc(total.score)+(total.max!=null?' / '+esc(total.max):'')+'</b><span>卷面批改总分</span></div>':'')+'</div><p>'+ (pending.length?'只需处理标出的缺失或冲突；其余结果可直接采用。':'核对完成，可以直接完成录入。')+'</p>';
      var eligible=items.filter(function(i){return !i.c.verified&&!questionState(i.q,i.c,items,groupsFor(row)).reasons.length;});
      overview.insertAdjacentHTML('beforeend','<div class="pr-bulk-actions"><button type="button" class="pr-button pr-primary" data-confirm-clean '+(!eligible.length?'disabled':'')+'>采用全部无异常题（'+eligible.length+'）</button>'+(pending.length?'<button type="button" class="pr-button" data-show-pending>查看需处理的 '+pending.length+' 题</button>':'')+(lastBatch.length?'<button type="button" class="pr-button" data-undo-batch>撤销本次操作</button>':'')+'</div><p class="pr-bulk-hint">没有疑点的识别结果可以直接采用，不需要逐题点确认。</p>');
      overview.querySelector('[data-confirm-clean]').onclick=function(){
        var current=live(main,row),chosen=current.filter(function(i){return !i.c.verified&&!questionState(i.q,i.c,current,groupsFor(row)).reasons.length;}),first;
        lastBatch=chosen.map(function(i){return String(i.q.id);});
        main.querySelectorAll('[data-question]').forEach(function(n){if(lastBatch.includes(n.dataset.question)){var box=n.querySelector('[data-field=verified]');box.checked=true;first=first||box;}});
        if(first)first.dispatchEvent(new Event('input',{bubbles:true}));
        note('已采用 '+chosen.length+' 题无异常结果；异常题仍需单独处理。');
        var filter=main.querySelector('[data-pr="filter:confirm"]');if(pending.length&&filter)filter.click();
        track('paper_confirm_clean',{count:chosen.length});
      };
      var undo=overview.querySelector('[data-undo-batch]');if(undo)undo.onclick=function(){var ids=lastBatch.slice(),first;lastBatch=[];main.querySelectorAll('[data-question]').forEach(function(n){if(ids.includes(n.dataset.question)){var box=n.querySelector('[data-field=verified]');box.checked=false;first=first||box;}});if(first)first.dispatchEvent(new Event('input',{bubbles:true}));note('已撤销本次批量确认，其他题目的核对状态不变。');};
      var show=overview.querySelector('[data-show-pending]');if(show)show.onclick=function(){var filter=main.querySelector('[data-pr="filter:confirm"]');if(filter){filter.click();filter.scrollIntoView({block:'nearest'});}};
      items.forEach(function(item){var info=questionState(item.q,item.c,items,groupsFor(row)),node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(item.q.id);});if(!node)return;
        node.dataset.needsConfirm=String(!info.verified&&info.reasons.length>0);node.dataset.unverified=String(!info.verified);
        var brief=node.querySelector('.pr-record-brief');if(!brief){brief=document.createElement('small');brief.className='pr-record-brief';node.querySelector('summary>span').appendChild(brief);}
        var hint=node.querySelector('.pr-type-total');if(hint){var members=items.filter(function(i){return i.c.question_type===item.c.question_type;});hint.hidden=!(groupsFor(row)||[]).some(function(g){return g.label===item.c.question_type&&g.questions.length===members.length&&members.every(function(i){return g.questions.includes(i.q.label);});});}
        brief.textContent=[item.c.question_type||'未分类',info.verified?'已核对':info.reasons.length?info.reasons.join(' · '):item.c.accepted?'已采用':'可直接采用'].join(' · ');
      });
      var data=totals(items,groupsFor(row));data.existing=existingFor(row);drawSync(panel,data,!!row.exam_id,!!row.result.screenshot_only);
      var submit=panel.querySelector('[data-sync-types]'),replace=panel.querySelector('[data-replace-types]');
      function enabled(){if(submit)submit.disabled=!data.rows.length||(row.result.screenshot_only?pending.length>0:data.unverified>0)||!!replace&&!replace.checked;}
      if(replace)replace.onchange=enabled;enabled();
      if(submit)submit.onclick=async function(){
        var accepted=!!replace&&replace.checked;submit.disabled=true;
        try{
          if(row.result.screenshot_only){
            var current=live(main,row),first;
            current.forEach(function(item){if(item.c.verified||item.c.accepted||questionState(item.q,item.c,current,groupsFor(row)).reasons.length)return;var box=main.querySelector('[data-question="'+item.q.id+'"] [data-field=accepted]');if(box){box.checked=true;first=first||box;}});
            if(first)first.dispatchEvent(new Event('input',{bubbles:true}));
          }
          var saved=await hooks.save();if(!saved)return;
          var preview=await api(ctx,'preview_types',{request_id:saved.request_id,revision:saved.revision});
          if(!main.isConnected)return;
          var active=main.querySelector('.pr-type-sync');
          if(preview.existing.length&&!accepted){[state.exams,state.allExams].forEach(function(list){(list||[]).forEach(function(e){if(e.id===row.exam_id){e.question_type_scores=e.question_type_scores||{};e.question_type_scores[row.subject]=preview.existing;}});});if(active.refresh)active.refresh();active.querySelector('[data-sync-note]').textContent='试题已保存；本科题型已发生变化，请重新核对后确认替换。';return;}
          if(preview.unverified)throw new Error('请先对照原卷核对已分类题目');
          var savedTypes=await api(ctx,'sync_types',{request_id:saved.request_id,revision:saved.revision,exam_version:preview.exam_version,replace:accepted});
          [state.exams,state.allExams].forEach(function(list){(list||[]).forEach(function(e){if(e.id===savedTypes.exam_id)e.question_type_scores=savedTypes.question_type_scores;});});
          if(!main.isConnected)return;
          main.querySelector('.pr-type-sync').innerHTML='<h3>试题与题型得分已保存</h3><p>已更新本场'+esc(row.subject)+'的 '+preview.rows.length+' 项题型。整科和总分保持原样。</p><button type="button" class="pr-button" data-view-types>查看题型分析</button>';var board=main.querySelector('.pb-board');if(board){var done=board.querySelector('[data-pb-complete]'),finish=board.querySelector('[data-pb=finish]'),choice=board.querySelector('.pb-finish-choice');if(done){done.hidden=false;done.textContent='录入完成 · 题型得分已更新。';}if(finish)finish.hidden=true;if(choice)choice.hidden=true;}
          main.querySelector('[data-view-types]').onclick=function(){if(ctx.canLeave&&!ctx.canLeave())return;if(ctx.dispose)ctx.dispose();window.ScoreQuestionTypeAnalysis.open(row.subject);};
          if(hooks.finalize){await hooks.finalize('sync');return;}
          note('试题与题型得分已保存');track('paper_type_sync',{types:preview.rows.length,replaced:preview.existing.length>0});
        }catch(e){if(main.isConnected){note('题型得分未更新：'+e.message,true);var active=main.querySelector('[data-sync-types]');if(active)active.disabled=false;}}
      };
      var activeFilter=main.querySelector('[data-pr^="filter:"][aria-pressed=true]');if(activeFilter)activeFilter.click();
    }
    panel.refresh=update;update();
    if(window.ScorePaperEntryOnly===true)row.result.questions.forEach(function(q){
      var node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(q.id);});
      if(!node)return;var source=node.querySelector('.pr-source>.pr-fold-body');
      if(q.provided_reference){var reference=document.createElement('details');reference.className='pr-legacy-reference';reference.innerHTML='<summary>已识别的参考答案</summary><p class="pr-text">'+esc(q.provided_reference)+'</p>';source.appendChild(reference);}
      if(q.uncertainties&&q.uncertainties.length){var notes=document.createElement('details');notes.className='pr-legacy-reference';notes.innerHTML='<summary>待核对备注 · '+q.uncertainties.length+'</summary><ul>'+q.uncertainties.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ul>';source.appendChild(notes);}
    });
    live(main,row).forEach(function(item){var node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(item.q.id);});if(node&&questionState(item.q,item.c,live(main,row),groupsFor(row)).reasons.length){node.open=true;var edit=node.querySelector('.pr-edit');if(edit)edit.open=true;}});
    main.querySelectorAll('.pr-question input,.pr-question textarea,.pr-question select').forEach(function(el){el.addEventListener('input',function(){
      if(el.dataset.field!=='verified'&&el.dataset.field!=='accepted'&&el.dataset.field!=='corrected'){var card=el.closest('[data-question]'),verified=card.querySelector('[data-field=verified]'),accepted=card.querySelector('[data-field=accepted]');if(verified)verified.checked=false;if(accepted)accepted.checked=false;}
      update();
    });});
  }
  function preferences(user){try{return JSON.parse(localStorage.getItem('st_paper_analysis_preferences_v1_'+user)||'{}');}catch(_){return {};}}
  function configure(host,row,hooks) {
    if(window.ScorePaperEntryOnly===true){host.textContent='试卷分析暂未开放，请返回试题录入。';return;}
    var user=hooks.user||String(state.user&&state.user.id||''),requestId=crypto.randomUUID(),draftId=crypto.randomUUID(),old=row.options||{},saved=preferences(user),defaults=['strengths','difficulty','causes','solutions','patterns'];
    var selectedModules=Array.isArray(saved.modules)?saved.modules.filter(function(k){return names[k];}):defaults;
    host.innerHTML='<section class="ph-create"><div class="ph-section-title"><div><h2>生成 AI 分析</h2><p>'+esc(row.subject)+' · '+row.result.questions.length+' 题 · 直接使用已保存的题目与作答。</p></div><button type="button" class="pr-button" data-back-record>返回试题</button></div><form class="pr-record-analysis"><label>分析范围<select name="scope"><option value="all">整张试卷</option><option value="losses">失分题优先</option><option value="selected">指定题目</option></select></label><fieldset data-question-picks hidden><legend>选择题目</legend>'+row.result.questions.map(function(q){return '<label class="pr-check"><input type="checkbox" name="question" value="'+esc(q.label)+'">第 '+esc(q.label)+' 题</label>';}).join('')+'</fieldset><label>你特别想了解什么？（选填）<textarea name="goal" maxlength="300" rows="2" placeholder="例如：数学大题主要丢分在哪里？"></textarea></label><details class="ph-context"><summary>更多设置</summary><label>讲解详略<select name="detail"><option value="brief">只讲关键点</option><option value="standard">讲清关键步骤</option><option value="detailed">从基础一步步讲</option></select></label><div class="ph-modules">'+Object.keys(names).map(function(k){return '<label class="pr-check"><input type="checkbox" name="module" value="'+k+'" '+(selectedModules.includes(k)?'checked':'')+'>'+names[k]+'</label>';}).join('')+'</div><label>单轮运行上限<select name="budget"><option value="3">3 分钟</option><option value="8">8 分钟</option><option value="15">15 分钟</option><option value="30">30 分钟</option></select></label><label>年级<input name="grade" maxlength="40" value="'+esc(saved.grade??old.grade)+'"></label><label>已学范围<input name="range" maxlength="200" value="'+esc(saved.learning_range??old.learning_range)+'"></label><label class="pr-check"><input type="checkbox" name="scans" checked>结合已保存原图理解图形</label><label class="pr-check"><input type="checkbox" name="history" '+(saved.use_account_history===false?'':'checked')+'>结合本账号历史成绩</label></details><p class="pr-muted">识别与生成分析各消耗 1 次；查看报告、手动核对和更新题型得分不消耗次数。</p><label class="pr-check pr-consent"><input type="checkbox" name="consent" required>同意将已保存的题目、作答与批改分，以及允许使用的原图和考试数值发送给 AI 服务生成分析。</label><div class="pr-footer"><span role="status" data-analysis-note></span><button class="pr-button pr-primary" type="submit">开始分析 · 消耗 1 次</button></div></form></section>';
    var form=host.querySelector('form');form.elements.detail.value=['brief','standard','detailed'].includes(saved.detail)?saved.detail:'standard';form.elements.budget.value=[3,8,15,30].includes(saved.time_budget_minutes)?String(saved.time_budget_minutes):'15';
    host.querySelector('[data-back-record]').onclick=function(){hooks.open(row.request_id);};
    form.elements.scope.onchange=function(){form.querySelector('[data-question-picks]').hidden=this.value!=='selected';};
    form.onsubmit=async function(e){
      e.preventDefault();var submit=form.querySelector('[type=submit]'),status=form.querySelector('[data-analysis-note]');if(String(state.user&&state.user.id||'')!==user){status.textContent='账号已切换，请重新打开试卷';return;}
      var selected=Array.from(form.querySelectorAll('[name=question]:checked')).map(function(b){return b.value;});
      if(!form.elements.consent.checked){status.textContent='请先确认 AI 分析说明';return;}
      if(form.elements.scope.value==='selected'&&!selected.length){status.textContent='请至少选择一道题';return;}
      submit.disabled=true;status.textContent='正在创建分析…';
      try{
        var options=Object.assign({},old,{config_version:2,purpose:'analysis',use_source_scans:form.elements.scans.checked,use_account_history:form.elements.history.checked,review_before_analysis:false,analysis_scope:form.elements.scope.value,selected_questions:selected,detail:form.elements.detail.value,time_budget_minutes:Number(form.elements.budget.value),grade:form.elements.grade.value,learning_range:form.elements.range.value,goal:form.elements.goal.value,modules:Array.from(form.querySelectorAll('[name=module]:checked')).map(function(b){return b.value;})});
        var data=await hooks.api('analyze_record',{request_id:requestId,draft_id:draftId,source_request_id:row.request_id,source_revision:row.revision,consent:true,options:options});
        if(!host.isConnected)return;
        try{localStorage.setItem('st_paper_analysis_preferences_v1_'+user,JSON.stringify({detail:options.detail,time_budget_minutes:options.time_budget_minutes,grade:options.grade,learning_range:options.learning_range,modules:options.modules,use_account_history:options.use_account_history}));}catch(_){}
        track('paper_analysis_from_record',{questions:row.result.questions.length,scope:options.analysis_scope});await hooks.started(data.request_id);
      }catch(err){if(host.isConnected){status.textContent=err.message+'；重试不重复计次。';submit.disabled=false;}}
    };
  }
  window.ScorePaperRecords={fields:fields,decorate:decorate,questionState:questionState,configure:configure};
  var style=document.createElement('style');
  style.textContent='.ph-workspace>.ph-header[hidden]{display:none!important}.pr-record-view .pr-result-top{background:transparent;padding:0;margin:0 0 16px}.pr-record-view .pr-result-top h3{font-size:22px!important;margin:6px 0}.pr-record-view .pr-report-nav{display:none}.pr-record-view .pr-first-action{padding:0;background:none;margin:16px 0}.pr-record-view .pr-first-action p{margin:0}.pr-record-view .pr-reading-section{padding-top:20px!important;margin-top:20px!important}.pr-type-table{overflow-x:auto}.pr-type-table table{width:100%;border-collapse:collapse;font-size:14px}.pr-type-table th,.pr-type-table td{padding:12px 8px;border-bottom:1px solid var(--line);text-align:left}.pr-type-table td:first-child{overflow-wrap:anywhere}.pr-type-sync .pr-footer{flex-wrap:wrap}.pr-record-analysis>label{display:block;margin:18px 0}.pr-record-analysis fieldset{border:1px solid var(--line);border-radius:10px}.pr-record-overview{padding:18px;border:1px solid var(--line);border-radius:14px;margin:18px 0;background:var(--panel-solid)}.pr-check-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pr-check-metrics>div{display:flex;flex-direction:column;gap:6px}.pr-check-metrics b{font-size:23px}.pr-check-metrics span,.pr-record-overview p,.pr-record-brief{font-size:13px;color:var(--muted);line-height:1.7}.pr-record-brief{display:block;margin-top:3px}.ph-paper-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}.ph-paper-bar nav{display:flex;gap:8px}.ph-paper-bar [aria-pressed=true]{color:var(--accent);background:var(--accent-soft);border-color:var(--accent)}.ph-list-filters{margin:14px 0 20px}.pr-upload-extra>summary{padding:16px 0;cursor:pointer;font-size:15px;font-weight:600}.ph-list-filters summary{cursor:pointer;font-size:14px;color:var(--muted)}.ph-workspace .pr-inline .pr-head{display:none}.ph-report-list>p{line-height:1.7}.ph-report-list>.ph-list{margin-top:20px}.ph-report-list>.pr-button{margin:8px 0}.ph-tabs{flex-wrap:wrap}.ph-tabs button{white-space:nowrap}.pr-question[data-needs-confirm=true]>summary{border-left:3px solid #ba7c2d}.pr-type-sync .pr-check{margin:16px 0}.pr-record-overview p{margin-bottom:0}.ph-workspace .pr-record-analysis input[type=checkbox],.ph-workspace .pr-record-analysis input[type=radio]{width:16px;height:16px;flex:none}.pr-report-extra>summary{padding:16px;cursor:pointer;font-weight:600;color:var(--accent)}.pr-report-extra{margin:20px 0;border:1px solid var(--line);border-radius:12px}.pr-report-extra>.pr-reading-section{margin:0!important;padding:20px!important;border:0!important}@media(max-width:520px){.pr-check-metrics{grid-template-columns:1fr 1fr}.pr-type-sync .pr-button{width:100%}.ph-paper-bar nav{width:100%}.ph-paper-bar nav .pr-button{flex:1}.ph-tabs button{flex:1 1 auto;padding:9px 8px}}';
  document.head.appendChild(style);
  var bulkStyle=document.createElement('style');bulkStyle.textContent='.pr-bulk-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pr-bulk-hint{font-size:12px!important}.pr-bulk-actions .pr-button{white-space:normal}@media(max-width:520px){.pr-bulk-actions .pr-button{flex:1 1 100%}}';document.head.appendChild(bulkStyle);
  var scanStyle=document.createElement('style');scanStyle.textContent='.pr-page-statuses{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.pr-page-statuses span{padding:6px 10px;border:1px solid var(--line);border-radius:8px;font-size:12px;color:var(--muted)}.pr-page-statuses .pr-page-done{color:var(--text)}.pr-page-statuses .pr-page-current{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.pr-scan-counts{line-height:1.9}.pr-screenshot-entry [hidden]{display:none!important}';document.head.appendChild(scanStyle);
})();

/* ===== exam-detail.js ===== */
/* One exam, one place to read its scores, ranks and saved papers. */
(function () {
  'use strict';
  var view = null, editor = null, generation = 0;
  var esc = function (v) { return escapeHtml(v == null ? '' : String(v)); };
  function number(v) { return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v); }
  function fmt(v) { return v == null ? '—' : String(Math.round(v * 10) / 10); }
  function signed(v) { return (v > 0 ? '+' : '') + fmt(v); }
  function owner() { return String(state.user && state.user.id || ''); }
  function allExams() { return state.allExams || state.exams || []; }
  function currentExam() { return view && allExams().find(function (e) { return e.id === view.id; }); }
  function active(v) { return view === v && v.user === owner() && v.token === state.token && state.page === 'records'; }
  function track(event, metadata) { try { var fn = window.__scoreTrackerTrack || window.__stTrack; if (typeof fn === 'function') fn(event, metadata || {}); } catch (_) {} }
  function paperReviewAvailable() { return !!(window.ScorePaperReview && typeof window.ScorePaperReview.api === 'function' && typeof window.ScorePaperReview.mount === 'function'); }
  function leave() {
    if (window.ScoreExamReflection && !window.ScoreExamReflection.leave()) return false;
    if (editor && editor.canLeave && !editor.canLeave()) return false;
    if (editor && editor.dispose) editor.dispose();
    editor = null; generation++; return true;
  }
  function button(label, action, extra) { return '<button type="button" class="ed-button ' + (extra || '') + '" data-ed="' + esc(action) + '">' + esc(label) + '</button>'; }
  function rank(exam, subject, scope) {
    var r = rankInfoByScopeV16(exam, subject, scope), n = number(r.rank), count = number(r.participants);
    if (!(n >= 1 && Number.isInteger(n))) n = null;
    if (!(count >= 1 && Number.isInteger(count))) count = null;
    if (n !== null && count !== null && n > count) return { n: n, count: count, percent: null, invalid: true };
    var direct = r.directPercent ? number(r.positionPercent) : null;
    return { n: n, count: count, percent: direct !== null && direct >= 0 && direct <= 100 ? direct : n !== null && count !== null ? n / count * 100 : null };
  }
  function rankText(r) {
    return r.n !== null ? '第 ' + fmt(r.n) + ' 名' : r.percent !== null ? '前 ' + fmt(r.percent) + '%' : '未录入';
  }
  function rankSub(r) {
    if (r.invalid) return '名次大于参考人数，请核对';
    return (r.count !== null ? '共 ' + fmt(r.count) + ' 人' : r.n !== null ? '未填参考人数' : '') + (r.percent !== null && r.n !== null ? ' · 前 ' + fmt(r.percent) + '%' : '');
  }
  function model(exam) {
    var moduleNames = new Set((state.modulesV18 || []).map(function (m) { return m.name; }));
    var rows = Object.keys(exam.scores || {}).filter(function (name) { return !moduleNames.has(name); }).map(function (name) {
      var s = exam.scores[name], actual = number(examScore(exam, name, 'actual')), max = number(examMax(exam, name));
      return { name: name, actual: actual, max: max, raw: number(s.raw), rawMax: number(s.rawMax) || max,
        fallback: number(s.actual) === null && actual !== null, target: number(s.target), excluded: !!s.excludeFromTotal,
        rate: actual !== null && actual >= 0 && max > 0 && actual <= max ? actual / max * 100 : null,
        year: rank(exam, name, 'year'), class: rank(exam, name, 'class') };
    });
    var included = rows.filter(function (r) { return !r.excluded; }), scored = included.filter(function (r) { return r.actual !== null; });
    var manual = number(exam.total_actual_score), complete = included.length > 0 && scored.length === included.length;
    var max = included.every(function (r) { return r.max > 0; }) ? included.reduce(function (n, r) { return n + r.max; }, 0) : null;
    var total = manual !== null ? manual : scored.length ? scored.reduce(function (n, r) { return n + r.actual; }, 0) : null;
    var target = included.length && included.every(function (r) { return r.target !== null; }) ? included.reduce(function (n, r) { return n + r.target; }, 0) : null;
    return { rows: rows, included: included, scored: scored, complete: complete, manual: manual !== null, max: max, total: total,
      rate: manual === null && complete && max > 0 && included.every(function (r) { return r.rate !== null; }) ? total / max * 100 : null,
      gap: manual === null && complete && target !== null ? total - target : null,
      year: rank(exam, '总分', 'year'), class: rank(exam, '总分', 'class') };
  }
  var quadrants = {
    strength: { title: '优势巩固', text: '得分率较高，排名也较靠前。保留有效方法。', color: '#2b886d' },
    potential: { title: '抢分突破', text: '排名较靠前，卷面仍有失分空间。优先找可追回的分。', color: '#427cc4' },
    compete: { title: '竞争提升', text: '得分率较高，排名相对靠后。关注区分度较高的题。', color: '#aa761c' },
    support: { title: '优先补强', text: '得分率和排名都相对靠后。先补基础与常见失分。', color: '#b56862' },
    neutral: { title: '接近均值', text: '至少一项指标位于均值线上，结合具体试题判断。', color: '#7b8493' }
  };
  function quadrantData(m, scope) {
    var eligible = m.included.filter(function (r) { return r.rate !== null && r[scope].percent !== null; });
    var meanRate = eligible.reduce(function (sum, r) { return sum + r.rate; }, 0) / eligible.length;
    var meanPosition = eligible.reduce(function (sum, r) { return sum + r[scope].percent; }, 0) / eligible.length;
    return { mode: 'performance', palette: quadrants, rate: meanRate, position: meanPosition, points: eligible.map(function (r, i) {
      var x = r.rate - meanRate, y = meanPosition - r[scope].percent;
      var group = Math.abs(x) < 0.000001 || Math.abs(y) < 0.000001 ? 'neutral' : x > 0 ? y > 0 ? 'strength' : 'compete' : y > 0 ? 'potential' : 'support';
      return { row: r, index: i + 1, x: x, y: y, group: group };
    }) };
  }
  var movementGroups = {
    strength: { title: '优势上升', text: '当前排名相对靠前，最近也在进步。继续保持有效的方法。', color: '#2b886d' },
    potential: { title: '优势回落', text: '当前仍是相对优势科目，最近出现回落。对照试题找找失分变化。', color: '#aa761c' },
    compete: { title: '弱科改善', text: '当前排名相对靠后，但最近正在改善。继续观察有效的练习方法。', color: '#427cc4' },
    support: { title: '优先关注', text: '当前排名相对靠后，最近也在回落。优先核对失分原因。', color: '#b56862' },
    neutral: { title: '持平或临界', text: '变化基本持平，或当前排名位于强弱科分界线上，结合具体试题判断。', color: '#7b8493' }
  };
  function median(values) {
    if (!values.length) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; }), mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
  function movementData(exam, m, scope, windowSize, sameCategory) {
    var current = m.included.filter(function (r) { return r[scope].percent !== null; });
    var divider = median(current.map(function (r) { return r[scope].percent; }));
    var category = String(exam.grade_level || '').trim();
    var candidates = validDate(exam.exam_date) ? allExams().filter(function (e) {
      return e.id !== exam.id && !e.is_hidden && validDate(e.exam_date) && e.exam_date < exam.exam_date && (!sameCategory || String(e.grade_level || '').trim() === category);
    }).slice().sort(function (a, b) { return b.exam_date.localeCompare(a.exam_date) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)); }) : [];
    var points = [], missing = [], required = windowSize === 'recent' ? 2 : 1;
    m.included.forEach(function (r) {
      if (r[scope].percent === null) {
        missing.push({ row: r, reason: r[scope].invalid ? '名次与人数不一致' : '缺少本次位比（请补名次与人数）' }); return;
      }
      // Use actual exam dates, not the manually arranged record order. Same-day records do not imply a sequence.
      var dates = new Set(), history = [];
      candidates.forEach(function (e) {
        var row = e.scores && e.scores[r.name]; if (!row || row.excludeFromTotal || dates.has(e.exam_date)) return;
        var info = rank(e, r.name, scope); if (info.percent === null) return;
        dates.add(e.exam_date); history.push({ exam: e, info: info });
      });
      if (history.length < required) { missing.push({ row: r, reason: required === 2 ? '近3次趋势需要本次及之前2次可比排名，目前共 ' + (history.length + 1) + ' 次' : '没有更早的' + (sameCategory ? '同分类、' : '') + '同科目、同排名范围的有效排名' }); return; }
      var observations = history.slice(0, required).reverse().concat([{ exam: exam, info: r[scope] }]);
      var x;
      if (required === 1) x = observations[0].info.percent - r[scope].percent;
      else {
        // Fit by exam sequence, never by the irregular days between exams. Positive means moving forward.
        var center = (observations.length - 1) / 2, mean = observations.reduce(function (n, o) { return n + o.info.percent; }, 0) / observations.length;
        var numerator = 0, denominator = 0;
        observations.forEach(function (o, i) { numerator += (i - center) * (o.info.percent - mean); denominator += (i - center) * (i - center); });
        x = -numerator / denominator;
      }
      var y = divider - r[scope].percent;
      var group = Math.abs(x) < 0.005 || Math.abs(y) < 0.000001 ? 'neutral' : y > 0 ? x > 0 ? 'strength' : 'potential' : x > 0 ? 'compete' : 'support';
      points.push({ row: r, index: points.length + 1, x: x, y: y, group: group, observations: observations });
    });
    return { mode: 'movement', palette: movementGroups, position: divider, positions: current.map(function (r) { return r[scope].percent; }), currentCount: current.length, points: points, missing: missing, windowSize: windowSize, sameCategory: !!sameCategory };
  }
  function fmtChange(value) { return String(Math.round((value + Number.EPSILON) * 100) / 100); }
  function changeText(point, recent) { return Math.abs(point.x) < 0.005 ? '基本持平' : (point.x > 0 ? '进步 ' : '退步 ') + fmtChange(Math.abs(point.x)) + (recent ? ' 个百分点 / 场' : ' 个百分点'); }
  function metric(label, value, sub) { return '<div class="ed-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(sub || '') + '</small></div>'; }
  function header(exam) {
    return '<div class="ed-top">' + button(view && view.returnPage === 'stats' ? '← 返回题型分析' : '← 返回考试记录', 'back') + button('编辑 / 补录', 'edit') + '</div><header class="ed-heading"><span class="ed-eyebrow">单次考试详情</span><h1 tabindex="-1">' + esc(exam.name) + '</h1><p>' + esc(fmtYearDate(exam.exam_date) + (exam.end_date && exam.end_date !== exam.exam_date ? ' — ' + fmtYearDate(exam.end_date) : '') + ' · ' + (exam.grade_level || '未分类')) + (exam.is_hidden ? ' · 已从趋势图隐藏，仍可查看完整记录' : '') + '</p></header>';
  }
  function overview(exam, m) {
    var totalLabel = m.manual ? '已录入总分' : m.complete ? '本次总分' : '已录入科目小计';
    var totalSub = m.manual ? '使用手动填写的总分' : '计入总分的 ' + m.scored.length + ' / ' + m.included.length + ' 科已出分';
    var rateSub = m.manual ? '手动总分不推算满分与得分率' : m.complete ? '总分 ÷ 本次各科满分之和' : '全部计分科目出分后计算';
    var extra = [['city_rank','city_participants','市排名'],['district_rank','district_participants','区排名']].map(function (pair) {
      var r = number(exam[pair[0]]), n = number(exam[pair[1]]); return r > 0 ? '<span>' + pair[2] + ' <b>第 ' + fmt(r) + ' 名</b>' + (n > 0 ? ' / ' + fmt(n) + ' 人' : '') + '</span>' : '';
    }).join('');
    var targetText = m.gap === null ? '' : m.gap >= 0 ? '已达到本次总目标' + (m.gap ? '，超出 ' + fmt(m.gap) + ' 分' : '') : '距离本次总目标还差 ' + fmt(-m.gap) + ' 分';
    return '<section class="ed-overview" aria-label="考试整体概况"><div class="ed-metrics">' +
      metric(totalLabel, fmt(m.total), totalSub) + metric('总得分率', m.rate === null ? '—' : fmt(m.rate) + '%', rateSub) +
      metric('年级排名', rankText(m.year), rankSub(m.year)) + metric('班级排名', rankText(m.class), rankSub(m.class)) +
      '</div>' + (targetText || extra ? '<div class="ed-context">' + (targetText ? '<span>' + targetText + '</span>' : '') + extra + '</div>' : '') +
      '<nav class="ed-nav" aria-label="考试详情目录">' + button('各科成绩', 'jump:scores') + button('本场变化', 'jump:changes') + button('强弱科四象限', 'jump:quadrants') + button('考后反思', 'jump:reflection') + (paperReviewAvailable() ? button('已录入试题', 'jump:papers') : '') + '</nav></section>';
  }
  function cell(label, text) { return '<td data-label="' + label + '">' + text + '</td>'; }
  function rankCell(r) { return '<span>' + esc(rankText(r)) + '</span><small>' + esc(rankSub(r)) + '</small>'; }
  function averageCell(exam, r) {
    return [['year','年级'],['class','班级']].map(function (pair) {
      var v = window.ScoreAverages && window.ScoreAverages.value(exam, r.name, pair[0], false);
      if (v == null) return '';
      return '<span>' + pair[1] + ' ' + fmt(v) + '</span>' + (r.actual !== null ? '<small>' + (r.actual === v ? '与均分持平' : (r.actual > v ? '高于' : '低于') + '均分 ' + fmt(Math.abs(r.actual - v)) + ' 分') + '</small>' : '');
    }).join('') || '—';
  }
  function scores(exam, m) {
    var hasAverages = m.rows.some(function (r) { return averageCell(exam, r) !== '—'; });
    return '<section class="ed-section" id="ed-scores" tabindex="-1"><div class="ed-section-head"><div><span class="ed-eyebrow">01 / 成绩</span><h2>各科得分与排名</h2><p>最终分与原始分分开展示，目标差按最终分计算。</p></div></div>' +
      (m.rows.length ? '<div class="ed-table-wrap"><table class="ed-table"><thead><tr>' + ['科目','最终分 / 满分','原始分 / 满分','得分率','目标 / 差值','年级排名','班级排名'].concat(hasAverages ? ['平均分'] : []).map(function (s) { return '<th scope="col">' + s + '</th>'; }).join('') + '</tr></thead><tbody>' + m.rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.name) + (r.excluded ? '<small>统计项 · 不计总分</small>' : '') + '</th>' +
          cell('最终分', '<b>' + fmt(r.actual) + '</b> / ' + fmt(r.max) + (r.fallback ? '<small>同满分原始分</small>' : '')) +
          cell('原始分', r.raw === null ? '—' : fmt(r.raw) + ' / ' + fmt(r.rawMax)) + cell('得分率', r.rate === null ? '—' : fmt(r.rate) + '%') +
          cell('目标', r.target === null ? '未设置' : fmt(r.target) + (r.actual !== null ? '<small>' + (r.actual === r.target ? '已达标' : signed(r.actual - r.target) + ' 分') + '</small>' : '')) +
          cell('年级排名', rankCell(r.year)) + cell('班级排名', rankCell(r.class)) + (hasAverages ? cell('平均分', averageCell(exam, r)) : '') + '</tr>';
      }).join('') + '</tbody></table></div>' : '<p class="ed-empty">还没有科目数据，点击“编辑 / 补录”添加成绩。</p>') + (window.ScoreQuestionTypes ? window.ScoreQuestionTypes.detail(exam) : '') + combinations(exam, m) + '</section>';
  }
  function combinations(exam, m) {
    var selected = (state.modulesV18 || []).filter(function (mod) { return (exam.moduleIds || []).includes(mod.id); });
    if (!selected.length) return '';
    var ranks = exam.moduleRanks || {};
    if (!Object.keys(ranks).length) { try { ranks = JSON.parse(localStorage.getItem('st_moduleranks_v25_' + (state.user.username || 'anon')) || '{}')[exam.exam_date + '|' + exam.name] || {}; } catch (_) {} }
    return '<details class="ed-combinations"><summary>科目组合 <span>' + selected.length + ' 组</span></summary><div class="ed-combo-grid">' + selected.map(function (mod) {
      var members = mod.subjects.map(function (s) { return m.rows.find(function (r) { return r.name === s; }); });
      var complete = members.length > 0 && members.every(function (r) { return r && r.actual !== null; });
      var total = complete ? members.reduce(function (n, r) { return n + r.actual; }, 0) : null, mr = ranks[mod.id] || {};
      return '<article><h3>' + esc(mod.name) + '</h3><p>' + esc(mod.subjects.join(' + ')) + '</p><b>' + (total === null ? '科目分数待补齐' : fmt(total) + ' 分') + '</b>' + [['yearRank','yearParticipants','年排'],['classRank','classParticipants','班排']].map(function (pair) {
        var n = number(mr[pair[0]]), people = number(mr[pair[1]]); return n !== null ? '<small>' + pair[2] + ' ' + fmt(n) + (people !== null ? ' / ' + fmt(people) + ' 人' : '') + '</small>' : '';
      }).join('') + '</article>';
    }).join('') + '</div></details>';
  }
  function plot(data) {
    var movement = data.mode === 'movement', palette = data.palette;
    var compact = window.matchMedia && window.matchMedia('(max-width:620px)').matches;
    var host = document.getElementById('ed-quadrants'), box = host && window.getComputedStyle(host);
    var W = compact ? Math.max(240, Math.round(host.clientWidth - parseFloat(box.paddingLeft || 0) - parseFloat(box.paddingRight || 0))) : 660;
    var H = compact ? 300 : 430, left = compact ? 45 : 85, right = compact ? W - 18 : 575;
    var top = compact ? 22 : 62, bottom = compact ? 252 : 340, tickY = compact ? 278 : 365;
    var points = data.points, maxX = Math.max(10, Math.ceil(Math.max.apply(null, points.map(function (p) { return Math.abs(p.x); })) / 10) * 10), maxY = Math.max(10, Math.ceil(Math.max.apply(null, points.map(function (p) { return Math.abs(p.y); })) / 10) * 10);
    var low = 0, high = 100;
    if (movement) {
      var min = Math.min.apply(null, data.positions), max = Math.max.apply(null, data.positions), pad = Math.max(2, (max - min) * .15);
      low = Math.max(0, Math.floor((min - pad) / 5) * 5); high = Math.min(100, Math.ceil((max + pad) / 5) * 5);
      if (high - low < 10) { high = Math.min(100, low + 10); low = Math.max(0, high - 10); }
    }
    function positionY(value) { return top + (value - low) / (high - low) * (bottom - top); }
    var cx = (left + right) / 2, cy = movement ? positionY(data.position) : (top + bottom) / 2;
    var sx = (right - left) / 2 / maxX, sy = (bottom - top) / 2 / maxY, marks = '';
    function yFor(p) { return movement ? positionY(p.row[view.scope].percent) : cy - p.y * sy; }
    [-1, -.5, .5, 1].forEach(function (t) {
      var x = cx + t * (right - left) / 2;
      marks += '<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + bottom + '" class="ed-grid-line"/><text x="' + x + '" y="' + tickY + '" text-anchor="middle">' + signed(t * maxX) + '</text>';
    });
    (movement ? [0, .25, .5, .75, 1] : [-1, -.5, 0, .5, 1]).forEach(function (t) {
      var position = low + t * (high - low), y = movement ? positionY(position) : cy - t * (bottom - top) / 2;
      marks += '<line x1="' + left + '" y1="' + y + '" x2="' + right + '" y2="' + y + '" class="ed-grid-line"/><text x="' + (left - 9) + '" y="' + (y + 4) + '" text-anchor="end">' + (movement ? fmtChange(position) + '%' : signed(t * maxY)) + '</text>';
    });
    var groups = new Map(); points.forEach(function (p) { var key = p.x.toFixed(6) + '|' + p.y.toFixed(6); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(p); });
    var dots = Array.from(groups.values()).map(function (ps) {
      var p = ps[0], label = ps.map(function (p) { return p.row.name; }).join('、'), x = cx + p.x * sx, y = yFor(p);
      return '<g role="button" tabindex="0" aria-label="' + esc(label + '，查看科目表现') + '" data-ed-point="' + p.index + '"><title>' + esc(label) + '</title><circle cx="' + x + '" cy="' + y + '" r="' + (compact ? 10 : 13) + '" fill="' + palette[p.group].color + '"/><text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central" class="ed-dot-number">' + (ps.length > 1 ? ps.length + (compact ? '' : '科') : p.index) + '</text></g>';
    }).join('');
    var xLabel = movement ? data.windowSize === 'recent' ? '← 退步 / 进步 →（百分点 / 场）' : '← 退步 / 进步 →（百分点）' : '得分率较均值（百分点）→';
    var accessible = movement ? '当前排名与变化四象限。上方排名较靠前，右侧正在进步，左侧正在退步。' : '本次考试强弱科四象限。右侧得分率较高，上方排名较靠前。';
    var regions = '<rect x="' + left + '" y="' + top + '" width="' + (cx - left) + '" height="' + (cy - top) + '" fill="' + palette.potential.color + '0a"/><rect x="' + cx + '" y="' + top + '" width="' + (right - cx) + '" height="' + (cy - top) + '" fill="' + palette.strength.color + '0a"/><rect x="' + left + '" y="' + cy + '" width="' + (cx - left) + '" height="' + (bottom - cy) + '" fill="' + palette.support.color + '0a"/><rect x="' + cx + '" y="' + cy + '" width="' + (right - cx) + '" height="' + (bottom - cy) + '" fill="' + palette.compete.color + '0a"/>';
    return '<svg class="ed-quadrant" data-layout="' + (compact ? 'compact' : 'wide') + '" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + accessible + '详细数值见下方科目按钮。">' + regions + marks + '<path d="M' + left + ' ' + cy + 'H' + right + 'M' + cx + ' ' + top + 'V' + bottom + '" class="ed-axis"/><text x="' + cx + '" y="' + tickY + '" text-anchor="middle">0</text>' +
      (compact ? '' : '<text class="ed-axis-label" x="330" y="410" text-anchor="middle">' + xLabel + '</text><text class="ed-axis-label" transform="translate(16 201) rotate(-90)" text-anchor="middle">' + (movement ? '当前排名位比（越上越好）' : '排名较均值领先（百分点）→') + '</text>') + dots + '</svg>';
  }
  function quadrantsHtml(m, scope, d) {
    var movement = d.mode === 'movement', scopeName = scope === 'year' ? '年级' : '班级', palette = d.palette;
    var missing = movement ? d.missing : m.included.filter(function (r) { return !d.points.some(function (p) { return p.row === r; }); }).map(function (r) { return { row: r, reason: r.rate === null ? '缺少有效最终分或满分' : r[scope].invalid ? '名次与人数不一致' : '缺少' + scopeName + '位比（请补名次与人数）' }; });
    var ready = movement ? d.currentCount >= 2 && d.points.length > 0 : d.points.length >= 2;
    var modes = '<div class="ed-scope" role="group" aria-label="四象限视图">' + [['movement','排名与变化'],['performance','本次表现']].map(function (pair) { return '<button type="button" data-ed-mode="' + pair[0] + '" aria-pressed="' + (d.mode === pair[0]) + '">' + pair[1] + '</button>'; }).join('') + '</div>';
    var range = '<div class="ed-scope" role="group" aria-label="四象限排名范围">' + ['year','class'].map(function (s) { return '<button type="button" data-ed-scope="' + s + '" aria-pressed="' + (s === scope) + '">' + (s === 'year' ? '按年级' : '按班级') + '</button>'; }).join('') + '</div>';
    var method = movement ? '纵轴显示本次' + scopeName + '位比，以本次 ' + d.currentCount + ' 科位比中位数 <b>前 ' + fmt(d.position) + '%</b> 划分个人相对强弱。横轴以 0 为界，右进步、左退步。' + (d.windowSize === 'recent' ? '近3次趋势包含本次，按考试场次计算平均变化，不按间隔天数计算。' : '变化 = 上一次可比考试位比 − 本次位比。') + '只比较更早、' + (d.sameCategory ? '同分类、' : '') + '同科目、同排名范围的有效排名；已隐藏考试不参与历史比较，同一天不推断先后。变化四舍五入到 0.01 个百分点后为 0，标为基本持平。' : '以这 ' + d.points.length + ' 科的平均得分率 <b>' + fmt(d.rate) + '%</b>、平均' + scopeName + '位比 <b>前 ' + fmt(d.position) + '%</b> 为分界。各科等权，仅反映本次考试内的相对强弱，不代表试卷难度或长期水平。均值线上的科目标为“接近均值”。';
    var empty = movement ? d.currentCount < 2 ? '本次至少需要 2 门科目的有效' + scopeName + '位比，才能划分个人相对强弱。补充名次与参考人数，或直接填写位比即可。' : d.windowSize === 'recent' ? '还没有科目具备本次及之前2次的可比排名，可以先切换“较上次”，或查看“本次表现”。' : '还没有科目具备更早的可比排名，可以先查看“本次表现”。缺少历史不会记作持平。' : '至少需要 2 门科目的有效得分率和' + scopeName + '位比。补充名次与参考人数，或直接填写位比即可。';
    return '<div class="ed-section-head"><div><span class="ed-eyebrow">03 / 强弱科</span><h2>' + (movement ? '各科排名与变化' : '这一场，哪些科目值得重点关注') + '</h2><p>' + (movement ? '越靠上，当前排名越靠前；越靠右，最近进步越明显。' : '越靠右，得分率越高；越靠上，在同范围考生中排名越靠前。') + '</p></div></div><div class="ed-chart-controls">' + modes + range + (movement ? '<label class="ed-window">比较分类<select data-ed-category aria-label="排名变化比较分类"><option value="all" ' + (d.sameCategory ? '' : 'selected') + '>全部分类</option><option value="same" ' + (d.sameCategory ? 'selected' : '') + '>仅同分类</option></select></label><label class="ed-window">比较口径<select data-ed-window aria-label="排名变化比较口径"><option value="previous" ' + (view.trendWindow !== 'recent' ? 'selected' : '') + '>较上次可比考试</option><option value="recent" ' + (view.trendWindow === 'recent' ? 'selected' : '') + '>近3次趋势</option></select></label>' : '') + '</div>' +
      (!ready ? '<div class="ed-empty"><h3>' + (movement ? '暂时无法比较排名变化' : '还差一点数据，就能比较各科表现') + '</h3><p>' + empty + '</p>' + (movement ? '<button type="button" class="ed-button" data-ed-mode="performance">查看本次表现</button>' : button('补录成绩与排名', 'edit')) + '</div>' :
        '<div class="ed-chart-layout"><div>' + plot(d) + '<div class="ed-quadrant-key" aria-label="四象限区域说明">' + [['potential','左上'],['strength','右上'],['support','左下'],['compete','右下']].map(function (item) { return '<span><i style="background:' + palette[item[0]].color + '"></i><small>' + item[1] + '</small>' + palette[item[0]].title + '</span>'; }).join('') + '</div><p class="ed-chart-caption">' + (movement ? '横轴：位比变化（' + (d.windowSize === 'recent' ? '百分点 / 场' : '百分点') + '）；纵轴：本次排名位比。' : '横轴：得分率较均值；纵轴：排名位比相对均值的领先程度。') + '</p><div class="ed-point-list">' + d.points.map(function (p) { return '<button type="button" data-ed-point="' + p.index + '" aria-pressed="false"><i style="background:' + palette[p.group].color + '">' + p.index + '</i>' + esc(p.row.name) + '</button>'; }).join('') + '</div></div><aside class="ed-inspect" aria-live="polite"></aside></div>' +
        '<div class="ed-quadrant-groups">' + ['strength','potential','compete','support'].map(function (key) { var names = d.points.filter(function (p) { return p.group === key; }).map(function (p) { return p.row.name; }); return '<article><h3><i style="background:' + palette[key].color + '"></i>' + palette[key].title + '</h3><b>' + (names.length ? esc(names.join('、')) : '暂无科目') + '</b><p>' + palette[key].text + '</p></article>'; }).join('') + '</div><details class="ed-method"><summary>分界与比较说明</summary><p>' + method + '</p></details>') +
      (missing.length ? '<details class="ed-missing"><summary>' + missing.length + ' 科暂未参与' + (movement ? '变化比较' : '四象限') + '</summary><ul>' + missing.map(function (item) { return '<li>' + esc(item.row.name) + '：' + esc(item.reason) + '</li>'; }).join('') + '</ul></details>' : '') +
      (m.rows.some(function (r) { return r.excluded; }) ? '<p class="ed-method">“不计总分”的统计项保留在成绩表中，不参与强弱科比较。</p>' : '');
  }
  function bindQuadrants(exam, m) {
    var host = document.querySelector('#ed-quadrants'); if (!host) return;
    var d = view.chartMode === 'performance' ? quadrantData(m, view.scope) : movementData(exam, m, view.scope, view.trendWindow || 'previous', view.sameCategory === true);
    host.innerHTML = quadrantsHtml(m, view.scope, d);
    function select(index, userInitiated) {
      var p = d.points.find(function (p) { return p.index === Number(index); }), inspect = host.querySelector('.ed-inspect'); if (!p || !inspect) return;
      var r = p.row, scopeName = view.scope === 'year' ? '年级' : '班级', movement = d.mode === 'movement'; view.pointName = r.name;
      if (userInitiated) track('exam_detail_quadrant_subject_selected', { mode: d.mode, scope: view.scope });
      var history = movement ? '<ol class="ed-history">' + p.observations.map(function (o, i) { return '<li><span>' + esc((i === p.observations.length - 1 ? '本次 · ' : '') + o.exam.name) + '</span><small>' + esc(fmtYearDate(o.exam.exam_date)) + '</small><b>' + esc(rankText(o.info)) + '</b>' + (o.info.n !== null ? '<small>' + esc(rankSub(o.info)) + '</small>' : '') + '</li>'; }).join('') + '</ol>' : '';
      inspect.innerHTML = '<span class="ed-eyebrow">科目观察</span><h3>' + esc(r.name) + '</h3><span class="ed-tag" style="color:' + d.palette[p.group].color + '">' + d.palette[p.group].title + '</span><dl>' +
        (movement ? '<div><dt>' + scopeName + '排名</dt><dd>' + esc(rankText(r[view.scope])) + '</dd></div>' : '<div><dt>最终分 / 满分</dt><dd>' + fmt(r.actual) + ' / ' + fmt(r.max) + '</dd></div><div><dt>得分率</dt><dd>' + fmt(r.rate) + '%</dd></div>') +
        '<div><dt>本次' + scopeName + '位比</dt><dd>前 ' + fmt(r[view.scope].percent) + '%</dd></div>' + (movement ? '<div><dt>' + (d.windowSize === 'recent' ? '近3次趋势' : '较上次') + '</dt><dd class="ed-change">' + changeText(p, d.windowSize === 'recent') + '</dd></div>' : '') + '</dl><p>' + d.palette[p.group].text + '</p>' + history + '<small>' + (movement ? '强弱科按本次各科位比中位数划分。' : '相对本次参与比较的各科均值。') + '</small>';
      host.querySelectorAll('button[data-ed-point]').forEach(function (el) { el.setAttribute('aria-pressed', String(el.dataset.edPoint === String(index))); });
    }
    host.querySelectorAll('[data-ed-point]').forEach(function (el) { el.onclick = function () { select(el.dataset.edPoint, true); }; if (el.tagName.toLowerCase() === 'g') el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el.dataset.edPoint, true); } }; });
    host.querySelectorAll('[data-ed-scope]').forEach(function (b) { b.onclick = function () { view.scope = b.dataset.edScope; track('exam_detail_quadrant_scope_changed', { scope: view.scope }); bindQuadrants(exam, m); document.querySelector('[data-ed-scope="' + view.scope + '"]').focus(); }; });
    host.querySelectorAll('[data-ed-mode]').forEach(function (b) { b.onclick = function () { view.chartMode = b.dataset.edMode; track('exam_detail_quadrant_mode_changed', { mode: view.chartMode }); bindQuadrants(exam, m); host.querySelector('[data-ed-mode="' + view.chartMode + '"]').focus(); }; });
    var categorySelect = host.querySelector('[data-ed-category]'); if (categorySelect) categorySelect.onchange = function () { view.sameCategory = categorySelect.value === 'same'; track('exam_detail_quadrant_category_scope_changed', { same_category: view.sameCategory }); bindQuadrants(exam, m); host.querySelector('[data-ed-category]').focus(); };
    var windowSelect = host.querySelector('[data-ed-window]'); if (windowSelect) windowSelect.onchange = function () { view.trendWindow = windowSelect.value; track('exam_detail_quadrant_window_changed', { window: view.trendWindow }); bindQuadrants(exam, m); host.querySelector('[data-ed-window]').focus(); };
    var first = d.points.find(function (p) { return p.row.name === view.pointName; }) || d.points[0]; if (first) select(first.index, false);
  }
  function papersHtml(v) {
    var subjects = Array.from(new Set(v.papers.map(function (p) { return p.subject; })));
    var filtered = v.papers.filter(function (p) { return !v.subject || p.subject === v.subject; });
    return '<div class="ed-paper-tools"><label>科目<select data-ed-subject><option value="">全部科目</option>' + subjects.map(function (s) { return '<option value="' + esc(s) + '" ' + (v.subject === s ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label>' + button('刷新', 'refresh-papers') + '</div>' +
      (filtered.length ? '<div class="ed-paper-grid">' + filtered.map(function (r) {
        var label = r.status === 'succeeded' ? r.options && r.options.purpose === 'record' ? '已录入' : '分析完成' : ({ running: '处理中', paused: '待继续', failed: '待恢复' })[r.status] || '待查看';
        return '<article class="ed-paper"><div><span class="ed-tag">' + esc(r.subject) + '</span><span class="ed-status">' + label + '</span></div><h3>' + esc(r.title || r.subject + '试卷') + '</h3><p>' + esc(r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '') + '</p>' + (r.progress && r.status !== 'succeeded' ? '<p>' + esc(r.progress.message || '') + '</p>' : '') + '<footer>' + button(r.status === 'succeeded' ? '查看录入的题' : '查看进度 / 已保存题目', 'paper:' + r.request_id, 'ed-primary') + (r.status === 'succeeded' && (!r.options || r.options.purpose !== 'record') ? button('查看分析', 'report:' + r.request_id) : '') + '</footer></article>';
      }).join('') + '</div>' : '<div class="ed-empty"><h3>' + (v.subject ? '当前已加载记录中没有这科的试题' : '这次考试还没有已录入试题') + '</h3><p>在“编辑 / 补录”中选择科目录入试卷，保存后会集中显示在这里。已有分析也可以在分析页关联到这次考试。</p>' + button('去录入试卷', 'edit') + '</div>') +
      '<div class="ed-paper-status" role="status" aria-live="polite">' + esc(v.paperError || '') + '</div>' + (v.more ? button(v.loading ? '读取中…' : '加载更多试卷', 'more-papers') : '');
  }
  function drawPapers(v) {
    var host = document.querySelector('.ed-paper-content'); if (!active(v) || !host) return;
    host.innerHTML = papersHtml(v);
    host.querySelector('[data-ed-subject]').onchange = function (e) { v.subject = e.target.value; track('exam_detail_papers_filtered', { filtered: v.subject ? 1 : 0 }); drawPapers(v); };
    host.querySelectorAll('[data-ed="refresh-papers"],[data-ed="more-papers"]').forEach(function (b) { b.disabled = !!v.loading; });
  }
  async function loadPapers(v, append) {
    var gen = generation, host = document.querySelector('.ed-paper-content'); if (!host || v.loading) return;
    track('exam_detail_papers_load_started', { append: append ? 1 : 0 });
    v.loading = true; v.paperError = ''; if (v.papers) drawPapers(v); else host.innerHTML = '<p class="ed-empty" role="status">正在读取这次考试的试题…</p>';
    try {
      var data = await window.ScorePaperReview.api(v, 'list_all', { exam_id: v.id, offset: append ? v.offset : 0 });
      if (!active(v) || generation !== gen || !host.isConnected) return;
      var rows = data.reviews || [];
      v.offset = (append ? v.offset : 0) + rows.length;
      v.papers = (append ? v.papers : []).concat(rows.filter(function (r) { return r.exam_id === v.id; }));
      v.more = !!data.has_more; v.loading = false; drawPapers(v);
      track('exam_detail_papers_loaded', { append: append ? 1 : 0, count: rows.length, total: v.papers.length, has_more: v.more ? 1 : 0 });
    } catch (e) {
      if (!active(v) || generation !== gen || !host.isConnected) return;
      v.loading = false; v.paperError = '试题读取未完成：' + e.message;
      track('exam_detail_papers_load_failed', { append: append ? 1 : 0, status: Number(e && e.status) || 0 });
      if (v.papers) drawPapers(v); else host.innerHTML = '<p class="ed-empty" role="alert">' + esc(v.paperError) + '</p>' + button('重新读取', 'refresh-papers');
    }
  }
  function changeValue(value, metric) {
    var amount = String(Math.round(Math.abs(value) * 100) / 100);
    if (!value) return '持平';
    if (metric === 'rank') return (value > 0 ? '前进 ' : '退后 ') + amount + ' 名';
    if (metric === 'position') return (value > 0 ? '前进 ' : '退后 ') + amount + ' 个百分点';
    return (value > 0 ? '+' : '−') + amount + (metric === 'rate' ? ' 个百分点' : ' 分');
  }
  function changeOriginal(point, metric) {
    function value(n) { return String(Math.round(n * 100) / 100); }
    if (metric === 'rank') return '第 ' + value(point.before) + ' → ' + value(point.after) + ' 名';
    if (metric === 'position') return '前 ' + value(point.before) + '% → 前 ' + value(point.after) + '%';
    return value(point.before) + (metric === 'rate' ? '%' : '') + ' → ' + value(point.after) + (metric === 'rate' ? '%' : ' 分');
  }
  function changePeople(point) {
    if (!point.oldRank) return '';
    var a = point.oldRank.count, b = point.newRank.count;
    return a !== null && b !== null ? '参考人数 ' + fmt(a) + ' → ' + fmt(b) + ' 人' : '有参考人数未填写，位比请以有效记录为准';
  }
  function drawChanges(exam) {
    var host = document.getElementById('ed-changes'); if (!host) return;
    var options = view.changes || (view.changes = { metric: 'score', scope: 'year', sameCategory: false, compareId: '' });
    var data = window.ScoreExamChanges.build(exam, allExams(), options, model), metricName = { score: '分数', rate: '得分率', rank: '名次', position: '位比' };
    var rankMode = options.metric === 'rank' || options.metric === 'position';
    var title = '<div class="ed-section-head"><div><span class="ed-eyebrow">02 / 对比</span><h2>本场变化</h2><p>选一场此前的考试，看看各科的分数与排名发生了什么变化。</p></div></div>';
    var tabs = '<div class="ed-change-tabs" role="group" aria-label="变化指标">' + Object.keys(metricName).map(function (key) { return '<button type="button" data-change-metric="' + key + '" aria-pressed="' + (options.metric === key) + '">' + metricName[key] + '</button>'; }).join('') + '</div>';
    var filters = '<div class="ed-change-filters"><label>对比考试<select data-change-exam aria-label="本场变化对比考试"><option value="">自动选择最近可比考试</option>' + data.history.map(function (e) { return '<option value="' + esc(e.id) + '" ' + (options.compareId === e.id ? 'selected' : '') + '>' + esc(e.exam_date + ' · ' + e.name) + '</option>'; }).join('') + '</select></label><label>分类范围<select data-change-category aria-label="本场变化分类范围"><option value="all" ' + (!options.sameCategory ? 'selected' : '') + '>全部分类</option><option value="same" ' + (options.sameCategory ? 'selected' : '') + '>仅同分类</option></select></label>' +
      (rankMode ? '<label>排名范围<select data-change-scope aria-label="本场变化排名范围"><option value="year" ' + (options.scope === 'year' ? 'selected' : '') + '>年级</option><option value="class" ' + (options.scope === 'class' ? 'selected' : '') + '>班级</option></select></label>' : '') + '</div>';
    var chart;
    if (!data.previous) chart = '<div class="ed-empty"><h3>还没有更早的' + (options.sameCategory ? '同分类' : '') + '考试</h3><p>先记录这次成绩与反思，之后就能在这里对照变化。</p></div>';
    else {
      var limit = Math.max.apply(Math, [1].concat(data.points.map(function (p) { return Math.abs(p.value); })));
      var positive = data.points.filter(function (p) { return p.value > 0; }).length, negative = data.points.filter(function (p) { return p.value < 0; }).length;
      chart = '<div class="ed-change-context"><span>对比 <b>' + esc(data.previous.name) + '</b></span><time>' + esc(data.previous.exam_date) + '</time></div>';
      if (data.total) chart += '<div class="ed-change-total"><div><span>' + (rankMode ? (options.scope === 'year' ? '年级' : '班级') : '') + esc(data.total.name) + '</span><strong class="' + (data.total.value > 0 ? 'ed-gain' : data.total.value < 0 ? 'ed-loss' : '') + '">' + esc(changeValue(data.total.value, options.metric)) + '</strong></div><p>' + esc(changeOriginal(data.total, options.metric)) + (rankMode ? '<small>' + esc(changePeople(data.total)) + '</small>' : '') + '</p></div>';
      chart += '<div class="ed-change-key"><span>' + data.points.length + ' 科可比' + (data.points.length ? ' · ' + positive + ' 科' + (rankMode ? '前进' : '上升') + ' · ' + negative + ' 科' + (rankMode ? '退后' : '下降') : '') + '</span><span>← ' + (rankMode ? '退后' : '下降') + '　｜　' + (rankMode ? '前进' : '上升') + ' →</span></div>';
      chart += '<div class="ed-change-bars" role="list" aria-label="各科' + metricName[options.metric] + '变化">' + data.points.map(function (p) {
        var width = Math.abs(p.value) / limit * 48, direction = p.value > 0 ? 'ed-gain' : p.value < 0 ? 'ed-loss' : 'ed-flat';
        return '<div class="ed-change-row" role="listitem"><div class="ed-change-label"><b>' + esc(p.name) + '</b><span>' + esc(changeOriginal(p, options.metric)) + '</span>' + (rankMode ? '<small>' + esc(changePeople(p)) + '</small>' : '') + '</div><div class="ed-change-plot" aria-hidden="true"><i class="ed-change-zero"></i><i class="ed-change-bar ' + direction + '" style="' + (p.value < 0 ? 'right' : 'left') + ':50%;width:' + width + '%"></i>' + (!p.value ? '<i class="ed-change-tie"></i>' : '') + '</div><strong class="ed-change-delta ' + direction + '">' + esc(changeValue(p.value, options.metric)) + '</strong></div>';
      }).join('') + '</div>';
      if (!data.points.length) chart += '<p class="ed-empty">这两场暂无可比的科目' + (rankMode ? '排名' : '成绩') + '，可切换指标或对比考试。</p>';
      chart += '<p class="ed-change-note">' + (rankMode ? '排名不要求两场满分相同。名次越小越靠前；位比按各场参考人数计算。年级和班级分别比较，参考群体变化时请结合实际情况判断。' : '按最终分比较；满分不同可切换得分率。试卷难度也会影响成绩，变化不直接代表能力变化。') + (!data.total && data.totalReason ? ' ' + esc(data.totalReason) : '') + '</p>';
      if (data.missing.length) chart += '<details class="ed-missing"><summary>' + data.missing.length + ' 科暂未参与对比</summary><ul>' + data.missing.map(function (p) { return '<li><b>' + esc(p.name) + '</b>：' + esc(p.reason) + '</li>'; }).join('') + '</ul></details>';
    }
    host.innerHTML = title + tabs + filters + chart;
    function changed(kind) { track('exam_detail_comparison_changed', { control: kind, metric: options.metric, scope: options.scope, category: options.sameCategory ? 'same' : 'all' }); drawChanges(exam); }
    host.querySelectorAll('[data-change-metric]').forEach(function (b) { b.onclick = function () { options.metric = b.dataset.changeMetric; changed('metric'); var activeButton = host.querySelector('[data-change-metric="' + options.metric + '"]'); if (activeButton) activeButton.focus({ preventScroll: true }); }; });
    host.querySelector('[data-change-exam]').onchange = function (e) { options.compareId = e.target.value; changed('exam'); host.querySelector('[data-change-exam]').focus({ preventScroll: true }); };
    host.querySelector('[data-change-category]').onchange = function (e) { options.sameCategory = e.target.value === 'same'; options.compareId = ''; changed('category'); host.querySelector('[data-change-category]').focus({ preventScroll: true }); };
    if (rankMode) host.querySelector('[data-change-scope]').onchange = function (e) { options.scope = e.target.value; changed('scope'); host.querySelector('[data-change-scope]').focus({ preventScroll: true }); };
  }

  function renderDetail(exam) {
    var v = view, m = model(exam), content = document.getElementById('content');
    generation++; v.loading = false;
    if (!v.scope) v.scope = m.included.filter(function (r) { return r.year.percent !== null; }).length < 2 && m.included.filter(function (r) { return r.class.percent !== null; }).length >= 2 ? 'class' : 'year';
    content.innerHTML = '<div class="ed-page">' + header(exam) + (v.report ? '<div class="ed-reader"></div>' : overview(exam, m) + scores(exam, m) + '<section class="ed-section" id="ed-changes" tabindex="-1"></section><section class="ed-section" id="ed-quadrants" tabindex="-1"></section><section class="ed-section ed-reflection" id="ed-reflection" tabindex="-1"></section>' + (paperReviewAvailable() ? '<section class="ed-section" id="ed-papers" tabindex="-1"><div class="ed-section-head"><div><span class="ed-eyebrow">05 / 试题与作答</span><h2>这次考试的试卷</h2><p>按科目查看已录入的题目、作答、批改分与原始扫描件。查看已有内容不计分析次数。</p></div></div><div class="ed-paper-content"></div></section>' : '')) + '</div>';
    content.querySelector('.ed-page').onclick = function (e) {
      var b = e.target.closest('[data-ed]'); if (!b) return;
      var action = b.dataset.ed;
      if (action === 'back') {
        if (!leave()) return;
        track('exam_detail_closed', { reason: 'back' });
        var scroll = v.scroll; state.page = v.returnPage || 'records'; view = null; render(); window.scrollTo(0, scroll);
        var original = Array.from(document.querySelectorAll('[data-exam-detail],[data-qta-exam]')).find(function (b) { return (b.dataset.examDetail || b.dataset.qtaExam) === exam.id; }); if (original) original.focus({ preventScroll: true });
      } else if (action === 'edit') {
        track('exam_detail_edit_opened');
        if (editor) { if (!leave()) return; v.report = null; renderPage(); }
        openExam(currentExam());
      }
      else if (action.startsWith('jump:')) { var sectionName = action.slice(5), section = document.getElementById('ed-' + sectionName); if (section) { track('exam_detail_section_jumped', { section: sectionName }); section.focus({ preventScroll: true }); if (section.scrollIntoView) section.scrollIntoView({ block: 'start' }); } }
      else if (action === 'refresh-papers' || action === 'more-papers') { track('exam_detail_papers_action', { action: action === 'more-papers' ? 'load_more' : 'refresh' }); loadPapers(v, action === 'more-papers'); }
      else if (action.startsWith('paper:') || action.startsWith('report:')) {
        var r = v.papers.find(function (p) { return p.request_id === action.slice(action.indexOf(':') + 1); });
        if (r && leave()) { track('exam_detail_paper_opened', { view: action.startsWith('paper:') ? 'questions' : 'report', status: r.status || 'unknown' }); v.report = r; v.questionsFirst = action.startsWith('paper:'); renderPage(); }
      }
    };
    if (v.report) {
      var r = v.report;
      editor = { user: v.user, token: v.token, host: content.querySelector('.ed-reader'), exam: exam, examId: exam.id, draftId: r.draft_id,
        sessions: {}, options: r.options, initialReport: r.request_id, initialSection: v.questionsFirst ? 'questions' : '', expectedExamId: exam.id,
        closeLabel: '← 返回本次考试详情', isActive: function () { return active(v) && view.report === r; },
        onClose: function () { editor = null; v.report = null; v.papers = null; renderPage(); } };
      window.ScorePaperReview.mount(editor, r.subject, null);
    } else { drawChanges(exam); bindQuadrants(exam, m); window.ScoreExamReflection.mount(document.getElementById('ed-reflection'), { userId: v.user, token: v.token, examId: v.id, owns: function () { return v.user === owner() && v.token === state.token; } }); if (v.papers) drawPapers(v); else loadPapers(v, false); }
  }
  function open(id) {
    var exam = allExams().find(function (e) { return e.id === id; }); if (!exam || !leave()) return;
    view = { id: id, returnPage: state.page === 'stats' && window.ScoreQuestionTypeAnalysis && window.ScoreQuestionTypeAnalysis.active() ? 'stats' : 'records', user: owner(), token: state.token, scroll: window.scrollY || 0, papers: null, offset: 0, more: false, loading: false, subject: '', chartMode: 'movement', trendWindow: 'previous', sameCategory: false };
    track('exam_detail_opened', { source: 'records' });
    state.page = 'records'; render(); window.scrollTo(0, 0);
    var heading = document.querySelector('.ed-heading h1'); if (heading) heading.focus({ preventScroll: true });
  }
  var recordBefore = recordHtml;
  recordHtml = function (exam) {
    return recordBefore.apply(this, arguments).replace(/(<div class="record-actions[^\"]*">)/, '$1<button type="button" class="record-action-btn-v10 ed-view-button" data-exam-detail="' + esc(exam.id) + '">查看详情</button>');
  };
  var bindBefore = bindPage;
  bindPage = function () { bindBefore.apply(this, arguments); document.querySelectorAll('[data-exam-detail]').forEach(function (b) { b.onclick = function () { open(b.dataset.examDetail); }; }); };
  var renderBefore = renderPage;
  renderPage = function () {
    if (view && active(view)) {
      var exam = currentExam(); if (exam) { renderBefore.apply(this, arguments); renderDetail(exam); return; }
    }
    if (view && (view.user !== owner() || view.token !== state.token || !currentExam())) { if (editor && editor.dispose) editor.dispose(); editor = null; view = null; }
    return renderBefore.apply(this, arguments);
  };
  var navBefore = bindNav;
  bindNav = function () {
    navBefore.apply(this, arguments);
    document.querySelectorAll('.desktop-nav [data-page],.bottom-nav [data-page]').forEach(function (b) {
      var previous = b.onclick; b.onclick = function (event) { if (!leave()) return; if (view && active(view)) track('exam_detail_closed', { reason: 'navigation' }); view = null; if (previous) previous.call(this, event); };
    });
  };
  window.ScoreExamDetail = { open: open };
  var style = document.createElement('style'); style.textContent = `
.ed-page{max-width:1160px;margin:0 auto 64px;color:var(--text)}.ed-top{display:flex;justify-content:space-between;gap:10px;margin-bottom:24px}.ed-button,.ed-scope button,.ed-point-list button{font:inherit;font-size:13px;cursor:pointer;min-height:38px;padding:8px 13px;color:var(--text);border:1px solid var(--line);background:var(--panel-solid,#fff);border-radius:9px}.ed-primary,.ed-view-button{color:var(--accent)!important;background:var(--accent-soft)!important;border-color:transparent!important;font-weight:650}.ed-button:disabled{opacity:.55;cursor:wait}.ed-page button:focus-visible,.ed-quadrant g:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.ed-heading{margin-bottom:25px}.ed-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--muted)}.ed-heading h1{font-size:30px;line-height:1.4;margin:8px 0;overflow-wrap:anywhere}.ed-heading p,.ed-section-head p{color:var(--muted);font-size:13px;line-height:1.75;margin:6px 0}.ed-overview{background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:18px;padding:25px;margin-bottom:28px}.ed-metrics{display:grid;grid-template-columns:1.15fr 1fr 1fr 1fr;gap:24px}.ed-metric{display:flex;flex-direction:column;gap:9px;min-width:0}.ed-metric>span{font-size:13px;color:var(--muted)}.ed-metric strong{font-size:28px;letter-spacing:-.04em;line-height:1.4;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.ed-metric:first-child strong{font-size:38px;line-height:1.03;color:var(--accent)}.ed-metric small{font-size:11px;line-height:1.6;color:var(--muted)}.ed-context{display:flex;gap:10px 25px;flex-wrap:wrap;font-size:12px;padding-top:22px;color:var(--muted)}.ed-nav{border-top:1px solid var(--line);display:flex;gap:9px;flex-wrap:wrap;margin-top:23px;padding-top:18px}.ed-nav .ed-button{border:0;background:var(--accent-soft);color:var(--accent)}.ed-section{background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:17px;padding:25px;margin:22px 0;scroll-margin-top:22px;min-width:0}.ed-section-head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:22px}.ed-section h2{font-size:21px;line-height:1.5;margin:6px 0}.ed-table-wrap{overflow-x:auto}.ed-table{width:100%;border-collapse:collapse;font-size:13px}.ed-table th,.ed-table td{padding:16px 10px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums;min-width:70px}.ed-table thead th{font-size:11px;font-weight:500;color:var(--muted);white-space:nowrap;background:var(--cell,#f8f9fc)}.ed-table tbody th{min-width:80px;font-size:14px;font-weight:650}.ed-table td b{font-size:16px}.ed-table small{display:block;font-size:11px;font-weight:400;color:var(--muted);line-height:1.6;margin-top:5px}.ed-combinations{margin-top:22px}.ed-combinations summary,.ed-missing summary{font-size:13px;cursor:pointer}.ed-combinations summary span{margin-left:8px;color:var(--muted)}.ed-combo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.ed-combo-grid article{border:1px solid var(--line);border-radius:12px;padding:16px}.ed-combo-grid h3{font-size:14px;margin:0}.ed-combo-grid p,.ed-combo-grid small{font-size:12px;line-height:1.6;color:var(--muted)}.ed-combo-grid small{display:block}.ed-scope{display:flex;flex:none;padding:3px;border:1px solid var(--line);border-radius:10px}.ed-scope button{background:transparent;border:0;padding:7px 12px}.ed-scope [aria-pressed=true]{color:var(--accent);background:var(--accent-soft);font-weight:650}.ed-chart-layout{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:24px;align-items:center}.ed-quadrant{display:block;width:100%;height:auto;overflow:visible}.ed-quadrant text{font-family:inherit;font-size:11px;fill:var(--muted)}.ed-quadrant .ed-quadrant-title{font-size:13px;font-weight:650;fill:var(--text)}.ed-quadrant .ed-dot-number{fill:#fff;font-size:11px;font-weight:700;pointer-events:none}.ed-quadrant g{cursor:pointer}.ed-grid-line{stroke:var(--line);stroke-width:.65;stroke-dasharray:3 5}.ed-axis{stroke:var(--muted);stroke-width:1;stroke-dasharray:4 4;fill:none}.ed-point-list{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin:14px 0}.ed-point-list button{display:flex;align-items:center;gap:7px;font-size:12px;padding:6px 10px;min-height:36px}.ed-point-list i{display:grid;place-items:center;font-size:10px;font-style:normal;width:19px;height:19px;border-radius:50%;color:#fff}.ed-point-list [aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent)}.ed-inspect{padding:22px 18px;background:var(--cell,#f7f9fc);border-radius:14px;min-width:0}.ed-inspect h3{font-size:24px;margin:9px 0 14px;overflow-wrap:anywhere}.ed-tag{display:inline-block;font-size:12px;font-weight:650;padding:4px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent)}.ed-inspect dl{margin:20px 0}.ed-inspect dl>div{display:flex;justify-content:space-between;gap:10px;margin:12px 0;font-size:12px}.ed-inspect dt{color:var(--muted)}.ed-inspect dd{font-variant-numeric:tabular-nums;margin:0;text-align:right}.ed-inspect p{font-size:13px;line-height:1.7}.ed-inspect small{font-size:11px;color:var(--muted)}.ed-quadrant-groups{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;border-top:1px solid var(--line);padding-top:20px;margin-top:17px}.ed-quadrant-groups h3{font-size:13px;margin:0 0 12px;display:flex;align-items:center;gap:7px}.ed-quadrant-groups i{width:7px;height:7px;border-radius:50%;flex:none}.ed-quadrant-groups b{font-size:14px;overflow-wrap:anywhere}.ed-quadrant-groups p,.ed-method,.ed-missing{font-size:12px;color:var(--muted);line-height:1.8}.ed-method{margin:18px 0 0}.ed-missing{margin-top:16px}.ed-missing ul{padding-left:20px}.ed-empty{padding:28px 15px;color:var(--muted);text-align:center;font-size:13px;line-height:1.8}.ed-empty h3{font-size:17px;color:var(--text)}.ed-paper-tools{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:18px}.ed-paper-tools label{display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted)}.ed-paper-tools select{font:inherit;font-size:13px;color:var(--text);background:var(--panel-solid,#fff);border:1px solid var(--line);padding:9px;border-radius:9px;max-width:200px}.ed-paper-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ed-paper{border:1px solid var(--line);border-radius:13px;padding:18px;display:flex;flex-direction:column;min-width:0}.ed-paper>div{display:flex;justify-content:space-between;gap:8px;align-items:center}.ed-status{font-size:11px;color:var(--muted)}.ed-paper h3{font-size:17px;line-height:1.6;margin:14px 0 7px;overflow-wrap:anywhere}.ed-paper p{font-size:12px;color:var(--muted);line-height:1.6}.ed-paper footer{display:flex;flex-wrap:wrap;gap:7px;padding-top:15px;margin-top:auto}.ed-paper-status{font-size:13px;color:var(--danger);margin:12px 0}.ed-reader .pr-main{max-width:900px}.ed-reader .pr-tabs{display:none}.ed-reader .pr-head h2{font-size:21px}.record-actions.record-actions-v10:has(.ed-view-button){flex-wrap:wrap!important}
@media(max-width:900px){.ed-chart-layout{grid-template-columns:minmax(0,1fr)}.ed-inspect{display:block}.ed-inspect dl{display:flex;gap:25px;flex-wrap:wrap;margin:10px 0}.ed-inspect dl>div{gap:12px;margin:6px 0}.ed-inspect h3{font-size:20px;display:inline-block;margin-right:10px}.ed-inspect>.ed-eyebrow{display:block}.ed-quadrant-groups{grid-template-columns:repeat(2,minmax(0,1fr))}.ed-paper-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ed-metrics{gap:18px}.ed-metric strong{font-size:23px}}
@media(max-width:620px){.ed-heading h1{font-size:25px}.ed-heading p{font-size:12px}.ed-overview,.ed-section{padding:18px 15px}.ed-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 14px}.ed-metric:first-child strong{font-size:34px}.ed-section-head{flex-direction:column;align-items:flex-start}.ed-section h2{font-size:19px}.ed-scope{align-self:flex-start}.ed-nav{gap:5px}.ed-nav .ed-button{padding:8px;font-size:12px}.ed-table,.ed-table tbody{display:block}.ed-table thead{display:none}.ed-table tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}.ed-table tbody th{grid-column:1/-1;font-size:17px;border-bottom:1px solid var(--line);padding:0 0 12px}.ed-table td{display:block;border:0;min-width:0;padding:0;font-size:13px}.ed-table td:before{content:attr(data-label);display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.ed-table small{font-size:11px}.ed-table-wrap{overflow:visible}.ed-paper-grid,.ed-combo-grid{grid-template-columns:1fr}.ed-quadrant-groups{gap:18px 12px}.ed-chart-layout{gap:12px}.ed-quadrant{width:calc(100% + 16px);margin-left:-8px}.ed-reader .pr-head{flex-wrap:wrap}.ed-reader .pr-main{min-width:0}.ed-inspect{padding:17px}.ed-inspect dl{gap:8px 20px}.ed-inspect dl>div{flex-direction:column}.ed-inspect dd{text-align:left}.ed-top{margin-bottom:20px}.ed-page{margin-bottom:80px}}
`;
  style.textContent += '.ed-chart-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:-4px 0 24px}.ed-window{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}.ed-window select{font:inherit;padding:10px;border:1px solid var(--line);border-radius:9px;color:var(--text);background:var(--panel-solid,#fff);min-height:38px;max-width:100%}.ed-method summary{cursor:pointer}.ed-method p{margin:8px 0}.ed-history{padding:0;list-style:none;margin:18px 0;border-top:1px solid var(--line)}.ed-history li{padding:12px 0;border-bottom:1px solid var(--line);font-size:12px;overflow-wrap:anywhere}.ed-history span,.ed-history small,.ed-history b{display:block}.ed-history small{margin-top:4px}.ed-history b{font-size:13px;margin-top:6px}.ed-inspect .ed-change{font-weight:650;overflow-wrap:anywhere}@media(max-width:620px){.ed-chart-controls{gap:10px;margin-bottom:20px}.ed-chart-controls .ed-scope{padding:2px}.ed-chart-controls .ed-scope button{font-size:12px;padding:7px 10px}.ed-window{width:100%}.ed-window select{flex:1;min-width:0}.ed-inspect .ed-history{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ed-inspect .ed-history li{min-width:0}}';
  // Shared reading scale for this detail page; retain the application's system font stack.
  style.textContent += `
.ed-page{--muted:color-mix(in srgb,var(--text) 72%,var(--panel-solid));--ed-positive:color-mix(in srgb,var(--green) 65%,var(--text));--ed-negative:color-mix(in srgb,var(--danger) 70%,var(--text));font-size:15px;line-height:1.65}
.ed-heading h1{font-size:30px;font-weight:650;letter-spacing:-.02em}.ed-heading p,.ed-section-head p{font-size:14px;line-height:1.75}.ed-eyebrow{font-size:12px;font-weight:600;letter-spacing:.06em}.ed-section h2{font-size:20px;font-weight:650}.ed-section{padding:26px;margin:24px 0}.ed-section-head{margin-bottom:20px}.ed-button,.ed-scope button{font-size:14px;min-height:42px}.ed-metric strong{font-weight:650}.ed-metric small,.ed-table small,.ed-combo-grid small{font-size:12px}.ed-metric>span{font-size:14px}.ed-context{font-size:14px}.ed-table{font-size:14px}.ed-table th,.ed-table td{padding:17px 9px}.ed-table thead th{font-size:12px;font-weight:500}.ed-table tbody th{font-size:15px;font-weight:600}.ed-table td b{font-size:18px;font-weight:600}.ed-combo-grid h3{font-size:15px}.ed-combo-grid p{font-size:14px}.ed-inspect p{font-size:15px}.ed-inspect dl>div,.ed-history li{font-size:13px}.ed-inspect small{font-size:12px}.ed-quadrant-groups p,.ed-method,.ed-missing{font-size:13px}.ed-point-list button{font-size:13px}.ed-chart-controls .ed-window{font-size:13px}.ed-chart-controls select{font-size:14px}.ed-paper p{font-size:14px}.ed-status{font-size:12px}.ed-empty{font-size:14px}.ed-gain{color:var(--ed-positive)}.ed-loss{color:var(--ed-negative)}
.ed-change-tabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--cell,#f6f7fa);width:fit-content;margin-bottom:22px}.ed-change-tabs button{font:inherit;font-size:14px;border:0;border-radius:9px;background:transparent;color:var(--muted);padding:9px 18px;min-height:42px}.ed-change-tabs [aria-pressed=true]{background:var(--panel-solid);color:var(--text);font-weight:600;box-shadow:0 2px 5px #18212f0c}.ed-change-filters{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px}.ed-change-filters label{display:grid;gap:7px;min-width:0;font-size:13px;color:var(--muted)}.ed-change-filters label:first-child{flex:1 1 250px}.ed-change-filters select{width:100%;min-width:0;max-width:100%;font:inherit;font-size:14px;min-height:44px;border:1px solid var(--line);border-radius:10px;color:var(--text);background:var(--panel-solid);padding:9px 34px 9px 12px;text-overflow:ellipsis}.ed-change-filters select:focus-visible,.ed-reflection textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.ed-change-context{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:14px;color:var(--muted);padding-top:20px;border-top:1px solid var(--line)}.ed-change-context b{font-weight:500;color:var(--text)}.ed-change-context time{font-size:13px}.ed-change-total{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:22px 0 26px}.ed-change-total>div{display:grid;gap:4px}.ed-change-total span{font-size:13px;color:var(--muted)}.ed-change-total strong{font-size:28px;line-height:1.4;font-weight:600;font-variant-numeric:tabular-nums}.ed-change-total p{font-size:15px;text-align:right;margin:0;font-variant-numeric:tabular-nums}.ed-change-total small{display:block;font-size:12px;color:var(--muted);margin-top:6px}.ed-change-key{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin:22px 0 8px}.ed-change-bars{border-top:1px solid var(--line)}.ed-change-row{display:grid;grid-template-columns:170px minmax(100px,1fr) 150px;gap:22px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line)}.ed-change-label{min-width:0}.ed-change-label b{display:block;font-size:15px;font-weight:600;overflow-wrap:anywhere}.ed-change-label span{display:block;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}.ed-change-label small{display:block;font-size:12px;color:var(--muted);margin-top:3px}.ed-change-plot{position:relative;height:28px;background:linear-gradient(to right,transparent 24.9%,var(--line) 25%,transparent 25.1%,transparent 74.9%,var(--line) 75%,transparent 75.1%)}.ed-change-zero{position:absolute;left:50%;width:1px;background:var(--muted);top:-3px;bottom:-3px;opacity:.5}.ed-change-bar{position:absolute;top:7px;height:14px;min-width:0;border-radius:3px;background:currentColor;opacity:.85}.ed-change-tie{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--muted);left:calc(50% - 2.5px);top:11px}.ed-change-delta{font-size:15px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.ed-change-note{font-size:13px;line-height:1.8;color:var(--muted);margin:20px 0 0}
.ed-reflection-private{font-size:12px;color:var(--muted);flex-shrink:0}.ed-reflection textarea{display:block;width:100%;min-height:180px;max-height:600px;resize:vertical;font:inherit;font-size:16px;line-height:1.8;border:1px solid var(--line);border-radius:12px;background:var(--panel-solid);color:var(--text);padding:17px 18px;box-sizing:border-box}.ed-reflection textarea::placeholder{color:var(--muted);opacity:1}.ed-reflection textarea:disabled{background:var(--cell,#f6f7fa);opacity:1}.ed-reflection-footer{display:flex;align-items:center;gap:10px 18px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:13px}.ed-reflection-footer [data-reflection-status]{flex:1 1 220px;font-size:13px}.ed-reflection-error{color:var(--ed-negative)}.ed-reflection-conflict{margin-top:20px;padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--cell,#f6f7fa);font-size:14px}.ed-reflection-conflict p{white-space:pre-wrap;overflow-wrap:anywhere;max-height:280px;overflow:auto;line-height:1.8}.ed-reflection-conflict>div{display:flex;gap:10px;flex-wrap:wrap}.ed-reflection-conflict small{display:block;color:var(--muted);margin-top:12px;font-size:12px}.ed-page [hidden]{display:none!important}
@media(min-width:621px) and (max-width:1050px){.ed-table,.ed-table tbody{display:block}.ed-table thead{display:none}.ed-table tbody{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.ed-table tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;border:1px solid var(--line);border-radius:12px;padding:18px}.ed-table tbody th{grid-column:1/-1;padding:0 0 12px;font-size:17px}.ed-table td{border:0;padding:0;min-width:0;display:block;font-size:14px}.ed-table td:before{content:attr(data-label);display:block;color:var(--muted);font-size:12px;margin-bottom:5px}.ed-table-wrap{overflow:visible}}
@media(max-width:900px){.ed-change-row{grid-template-columns:140px minmax(80px,1fr) 130px;gap:16px}}
@media(max-width:620px){.ed-page{margin-bottom:85px}.ed-heading h1{font-size:26px}.ed-heading p{font-size:13px}.ed-section{padding:22px 17px}.ed-overview{padding:22px 17px}.ed-section h2{font-size:19px}.ed-metric small{font-size:12px}.ed-nav .ed-button{font-size:13px;padding:8px 9px}.ed-table tr{padding:17px;gap:18px 14px}.ed-table td{font-size:14px}.ed-table td:before,.ed-table small{font-size:12px}.ed-table tbody th{font-size:17px}.ed-change-tabs{width:100%}.ed-change-tabs button{flex:1;padding:9px 6px}.ed-change-filters{gap:12px}.ed-change-filters label{flex:1 1 120px}.ed-change-filters label:first-child{flex-basis:100%}.ed-change-filters select{font-size:14px}.ed-change-total{align-items:flex-start;gap:10px}.ed-change-total strong{font-size:24px}.ed-change-total p{font-size:14px}.ed-change-key{font-size:12px;gap:8px;margin-top:22px}.ed-change-row{grid-template-columns:minmax(0,1fr) auto;gap:10px 16px;padding:18px 0}.ed-change-label{grid-column:1;grid-row:1}.ed-change-delta{grid-column:2;grid-row:1;max-width:130px;font-size:14px}.ed-change-plot{grid-column:1/-1;grid-row:2;width:100%;height:24px}.ed-change-bar{top:5px}.ed-change-tie{top:9px}.ed-change-label b{font-size:15px}.ed-reflection .ed-section-head{gap:8px}.ed-reflection textarea{padding:14px;min-height:200px}.ed-reflection-footer [data-reflection-status]{flex-basis:190px}.ed-reflection-conflict{padding:14px}.ed-top .ed-button{font-size:13px;padding:8px 10px}.ed-inspect dl>div{font-size:13px}.ed-chart-controls .ed-scope button{font-size:13px}.ed-chart-controls .ed-window select{font-size:14px}}
`;
  style.textContent += `
.ed-heading h1:focus,.ed-section:focus{outline:none}.ed-chart-caption{display:none}.ed-quadrant .ed-dot-number{font-weight:600}.ed-quadrant-key{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin:8px 0 20px;font-size:12px;line-height:1.7;color:var(--muted)}.ed-quadrant-key span{display:flex;align-items:center;gap:7px;min-width:0}.ed-quadrant-key i{width:6px;height:6px;border-radius:50%;flex:none;opacity:.8}.ed-quadrant-key small{font-size:11px;opacity:.8}.ed-point-list{margin:18px 0 24px}.ed-chart-controls{gap:16px;margin-top:8px;margin-bottom:28px}.ed-quadrant{overflow:visible}
@media(min-width:621px) and (max-width:1050px){.ed-table tr{align-content:start}}
@media(max-width:620px){.ed-quadrant{width:100%;margin:0}.ed-quadrant[data-layout=compact] text{font-size:12px;font-weight:400}.ed-quadrant[data-layout=compact] .ed-dot-number{font-size:11px;fill:#fff;font-weight:600}.ed-chart-caption{display:block;font-size:12px;line-height:1.8;color:var(--muted);margin:16px 0 22px}.ed-quadrant-key{font-size:12px;margin-top:4px;margin-bottom:0;gap:10px 14px}.ed-chart-controls{gap:16px 12px;margin:22px 0 28px}.ed-chart-controls .ed-scope{padding:3px}.ed-chart-controls .ed-scope button{padding:8px 10px;font-weight:500;font-size:13px;min-height:40px}.ed-chart-controls .ed-window{display:grid;gap:7px;flex:1 1 130px;min-width:0;width:auto;font-size:12px}.ed-chart-controls .ed-window select{width:100%;min-width:0;max-width:100%;font-size:13px;padding:10px 8px;min-height:42px}.ed-point-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:20px 0 26px}.ed-point-list button{justify-content:flex-start;min-width:0;font-size:13px;line-height:1.6;padding:7px 9px;min-height:38px;text-align:left;overflow-wrap:anywhere}.ed-point-list i{flex:none}.ed-inspect{padding:20px 17px}.ed-chart-layout{gap:18px}}
@media(max-width:360px){.ed-point-list{grid-template-columns:repeat(2,minmax(0,1fr))}.ed-chart-controls .ed-scope{width:100%;display:flex}.ed-chart-controls .ed-scope button{flex:1}}
`;
  var chartResizeTimer;
  window.addEventListener('resize', function () { clearTimeout(chartResizeTimer); chartResizeTimer = setTimeout(function () { if (view && active(view) && !view.report) { var exam = currentExam(); if (exam) bindQuadrants(exam, model(exam)); } }, 120); });
  document.head.appendChild(style);
})();

/* ===== supabase/functions/_shared/backup-format.js ===== */
/* One validator for the browser preview and the authenticated import endpoint. */
(function (root) {
  'use strict';
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function object(v, label) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(label + '格式不正确');
    for (var k of Object.keys(v)) if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new Error('备份含有不支持的字段');
    return v;
  }
  function str(v, max, label, required) {
    if (v == null) v = '';
    if (typeof v !== 'string' || v.length > max || v.includes('\u0000')) throw new Error(label + '格式或长度不正确');
    v = v.trim(); if (required && !v) throw new Error(label + '不能为空'); return v;
  }
  function number(v, label, max, min, integer) {
    if (v === null || v === undefined || v === '') return null;
    if (!['number', 'string'].includes(typeof v) || (typeof v === 'string' && !v.trim())) throw new Error(label + '必须是数字');
    var n = Number(v);
    if (!Number.isFinite(n) || n < (min || 0) || n > (max || 99999) || (integer && !Number.isInteger(n)) || (!integer && Math.abs(n * 1000 - Math.round(n * 1000)) > .00001)) throw new Error(label + '超出范围或精度不正确');
    return n;
  }
  function date(v, label, required) {
    var s = str(v, 10, label, required);
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s) throw new Error(label + '不是有效日期');
    return s;
  }
  function bool(v, label) { if (v == null) return false; if (typeof v !== 'boolean') throw new Error(label + '必须为布尔值'); return v; }
  function list(v, max, label) { if (!Array.isArray(v) || v.length > max) throw new Error(label + '须为列表，最多 ' + max + ' 项'); return v; }
  function ranks(v, label) {
    v = object(v || {}, label); var o = {};
    [['yearRank','yearParticipants'],['classRank','classParticipants']].forEach(function (pair) {
      pair.forEach(function (key) { o[key] = number(v[key], label + key, 10000000, 1, true); });
      if (o[pair[0]] != null && o[pair[1]] != null && o[pair[0]] > o[pair[1]]) throw new Error(label + '排名大于人数');
    });
    ['yearPositionPercent','classPositionPercent'].forEach(function (k) { if (own(v, k)) o[k] = number(v[k], label + k, 100); });
    return o;
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(value[k]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  function identity(exam) { return canonical([exam.name, exam.exam_date, exam.grade_level || '', Object.keys(exam.scores || {}).sort()]); }
  function normalize(raw) {
    object(raw, '备份');
    if (raw.app !== 'score-tracker') throw new Error('请选择成绩轨迹导出的「完整备份」JSON 文件');
    if (raw.backupVersion != null && raw.backupVersion !== 2) throw new Error('备份版本较新，请先更新成绩轨迹');
    var out = { app: 'score-tracker', backupVersion: 2, account: str(raw.originalUsername || raw.account, 100, '备份账号'), modules: [], subjectConfigs: [], exams: [], category: null, goal: null, participantDefaults: {}, restoreFields:{goal:own(raw,'goal'),participantDefaults:own(raw,'participantDefaults')} };
    var mods = new Map(), names = new Set(), ids = new Set();
    list(raw.modules || [], 40, '成绩组合').forEach(function (m) {
      object(m, '组合'); var id = str(m.id, 100, '组合编号', true), name = str(m.name, 30, '组合名称', true);
      if (mods.has(id) || names.has(name)) throw new Error('备份中的组合编号或名称重复');
      var subjects = list(m.subjects, 40, '组合科目').map(function (s) { return str(s, 40, '组合科目', true); });
      if (subjects.length < 2 || new Set(subjects).size !== subjects.length) throw new Error('组合须有至少两门不重复科目');
      var row = { id: id, name: name, subjects: subjects, isBuiltin: bool(m.isBuiltin, '内置组合') };
      mods.set(id, row); names.add(name); out.modules.push(row);
    });
    names.clear();
    list(raw.subjectConfigs || [], 40, '科目设置').forEach(function (s) {
      object(s, '科目设置'); var name = str(s.name, 40, '科目名称', true), max = number(s.defaultMax, '科目满分', 999, .001);
      if (max == null || names.has(name)) throw new Error('科目名称重复或缺少默认满分');
      names.add(name); out.subjectConfigs.push({ name: name, defaultMax: max });
    });
    var exams = list(raw.exams, 1000, '考试');
    if (raw.examCount != null && raw.examCount !== exams.length) throw new Error('备份考试数量与内容不一致');
    exams.forEach(function (ex, index) {
      object(ex, '考试'); var label = '第 ' + (index + 1) + ' 场考试：';
      var e = { name: str(ex.name, 100, label + '名称', true), exam_date: date(ex.exam_date, label + '日期', true), end_date: date(ex.end_date, label + '结束日期'), grade_level: str(ex.grade_level, 20, label + '分类') || null, is_hidden: bool(ex.is_hidden, label + '隐藏状态'), reflection: str(ex.reflection, 10000, label + '考后反思'), scores: {}, moduleIds: [], moduleRanks: {}, averages: {}, question_type_scores: {} };
      if (e.end_date && e.end_date < e.exam_date) throw new Error(label + '结束日期早于开始日期');
      if (ex.id != null) { e.sourceId = str(ex.id, 100, label + '编号', true); if (ids.has(e.sourceId)) throw new Error('备份中有重复考试编号'); ids.add(e.sourceId); }
      [['total_rank','total_participants'],['total_class_rank','total_class_participants'],['city_rank','city_participants'],['district_rank','district_participants']].forEach(function (pair) {
        pair.forEach(function (k) { var camel = k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }); e[k] = number(ex[k] == null ? ex[camel] : ex[k], label + k, 10000000, 1, true); });
        if (e[pair[0]] != null && e[pair[1]] != null && e[pair[0]] > e[pair[1]]) throw new Error(label + '排名大于人数');
      });
      ['total_actual_score','total_raw_score'].forEach(function (k) { e[k] = number(ex[k], label + k); });
      ['total_year_position_percent','total_class_position_percent'].forEach(function (k) { e[k] = number(ex[k], label + k, 100); });
      object(ex.scores, label + '成绩');
      if (Object.keys(ex.scores).length > 40) throw new Error(label + '科目过多');
      Object.keys(ex.scores).forEach(function (key) {
        var name = str(key, 40, label + '科目', true), r = object(ex.scores[key], label + name), s = {};
        ['target','actual','raw','max','rawMax'].forEach(function (k) { s[k] = number(r[k], label + name + k,k==='raw'?9999:99999); });
        if (s.max == null) s.max = (out.subjectConfigs.find(function (c) { return c.name === name; }) || {}).defaultMax || 100;
        if (s.rawMax == null) s.rawMax = s.max;
        if (s.max <= 0 || s.rawMax <= 0 || (s.actual != null && s.actual > s.max) || (s.target != null && s.target > s.max) || (s.raw != null && s.raw > s.rawMax)) throw new Error(label + name + '成绩超过满分或满分无效');
        var rank = ranks({yearRank:r.rank,yearParticipants:r.participants,classRank:r.classRank,classParticipants:r.classParticipants}, label + name);
        s.rank=rank.yearRank; s.participants=rank.yearParticipants; s.classRank=rank.classRank; s.classParticipants=rank.classParticipants;
        s.yearPositionPercent=number(r.yearPositionPercent,label+name+'年位比',100); s.classPositionPercent=number(r.classPositionPercent,label+name+'班位比',100);
        s.excludeFromTotal=bool(r.excludeFromTotal,label+name+'计分状态'); e.scores[name]=s;
      });
      list(ex.moduleIds || [], 40, label + '组合关联').forEach(function (id) { if (!mods.has(id) || e.moduleIds.includes(id)) throw new Error(label + '引用了缺失或重复的组合'); e.moduleIds.push(id); });
      Object.entries(object(ex.moduleRanks || {}, label + '组合排名')).forEach(function (entry) {
        if (!e.moduleIds.includes(entry[0])) throw new Error(label + '组合排名没有关联组合'); e.moduleRanks[entry[0]] = ranks(entry[1], label + '组合');
      });
      Object.entries(object(ex.averages || {}, label + '均分')).forEach(function (entry) {
        var k=entry[0], r=object(entry[1],label+'均分'), avg={};
        if (k !== 'total' && !(k.startsWith('s:') && own(e.scores,k.slice(2))) && !(k.startsWith('m:') && e.moduleIds.includes(k.slice(2)))) throw new Error(label+'均分引用了缺失的科目或组合');
        ['class','year'].forEach(function (scope) { if (own(r,scope)) avg[scope]=number(r[scope],label+'均分'); });
        if (r.basis != null) avg.basis=str(r.basis,5000,label+'均分口径'); e.averages[k]=avg;
      });
      Object.entries(object(ex.question_type_scores || {}, label+'题型')).forEach(function (entry) {
        if (!own(e.scores,entry[0])) throw new Error(label+'题型缺少所属科目');
        var rows=list(entry[1],100,label+'题型').map(function (r) {
          object(r,label+'题型'); var row={name:str(r.name,40,label+'题型名称',true),score:number(r.score,label+'题型得分'),max:number(r.max,label+'题型满分')};
          if (row.max===0 || (row.score!=null && row.max!=null && row.score>row.max)) throw new Error(label+'题型得分超过满分');
          ['position','difficulty','cause','reason'].forEach(function (k) { if (r[k]!=null) row[k]=str(r[k],200,label+'题型标注'); }); return row;
        }); e.question_type_scores[entry[0]]=rows;
      });
      out.exams.push(e);
    });
    if (raw.category != null) {
      object(raw.category,'分类设置'); var options=list(raw.category.options,12,'分类选项').map(function (s) { return str(s,20,'分类选项',true); });
      if (!options.length || new Set(options).size!==options.length) throw new Error('分类选项为空或重复');
      out.category={label:str(raw.category.label,16,'分类名称',true),options:options};
    }
    if (raw.goal != null) {
      var g=object(raw.goal,'长期目标'), goals={};
      Object.entries(object(g.subjects || {},'科目目标')).forEach(function (entry) { var name=str(entry[0],40,'目标科目',true), n=number(entry[1],'科目目标',1000); if(n==null)throw new Error('科目目标不能为空');goals[name]=n; });
      if (Object.keys(goals).length>40) throw new Error('科目目标过多');
      out.goal={subjects:goals,totalGoal:number(g.totalGoal,'总分目标'),school:str(g.school,40,'理想学校'),date:date(g.date,'目标日期'),dateName:str(g.dateName,20,'倒计时名称')};
    }
    Object.entries(object(raw.participantDefaults || {},'默认人数')).forEach(function (entry) {
      var k=entry[0],r=object(entry[1],'默认人数'),v={};
      if(k!=='total' && !/^s:.{1,40}$/.test(k) && !(k.startsWith('m:')&&mods.has(k.slice(2))))throw new Error('默认人数引用了缺失的组合');
      ['class','year'].forEach(function (scope) { if(own(r,scope))v[scope]=number(r[scope],'默认人数',10000000,1,true); });out.participantDefaults[k]=v;
    });
    if(Object.keys(out.participantDefaults).length>200)throw new Error('默认人数项目过多');
    return out;
  }
  root.ScoreBackup={normalize:normalize,canonical:canonical,identity:identity,maxBytes:8*1024*1024};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ScoreBackup;
})(globalThis);

/* ===== backup-import.js ===== */
(function () {
  'use strict';
  var active=null,esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  function owner(){return String(state.user&&state.user.id||'');}
  function track(name,meta){try{if(window.__stTrack)window.__stTrack(name,meta||{});}catch(e){}}
  function open(){
    if(active||!state.token||!owner())return;
    var origin=document.activeElement,box=document.createElement('div'),a={box:box,owner:owner(),token:state.token,version:0,busy:false,raw:null,preview:null};active=a;
    box.className='export-overlay-v30 backup-overlay';box.id='backupImportOverlay';
    box.innerHTML='<section class="export-sheet-v30 backup-sheet" role="dialog" aria-modal="true" aria-labelledby="backupTitle" tabindex="-1">'
      +'<div class="export-head-v30"><b id="backupTitle">导入恢复</b><button type="button" class="close-btn" data-backup-close aria-label="关闭">×</button></div>'
      +'<p class="card-sub">选择成绩轨迹导出的「完整备份」JSON 文件，先核对，再导入当前账号。</p>'
      +'<label class="backup-file-label">备份文件<input id="backupFile" type="file" accept=".json,application/json"></label>'
      +'<div id="backupStatus" role="status" aria-live="polite">支持旧版备份，文件不超过 8 MB。</div>'
      +'<div id="backupPreview"></div>'
      +'<label class="backup-settings" hidden><input type="checkbox" id="backupSettings">同时恢复科目满分、分类、长期目标和默认参考人数，替换当前对应设置</label>'
      +'<p class="backup-rule">已有考试会保留。同一考试编号，或同名、同日期、同分类且科目相同的考试会跳过，不覆盖已有成绩。不同选科的同名组合会分别保留。</p>'
      +'<button type="button" class="primary export-go-v30" id="backupCommit" disabled>选择备份后预览</button></section>';
    document.body.appendChild(box);
    var status=box.querySelector('#backupStatus'),go=box.querySelector('#backupCommit'),file=box.querySelector('#backupFile'),preview=box.querySelector('#backupPreview'),settings=box.querySelector('#backupSettings');
    function valid(){return active===a&&box.isConnected&&a.owner===owner()&&a.token===state.token;}
    function statusText(text,error){status.textContent=text;status.classList.toggle('backup-error',!!error);}
    function close(){if(a.busy)return;cleanup();if(origin&&origin.isConnected)origin.focus();}
    function cleanup(){if(a.controller)a.controller.abort();clearInterval(a.watch);document.removeEventListener('keydown',keys);box.remove();if(active===a)active=null;}
    function keys(e){if(!valid())return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){var nodes=Array.from(box.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(function(n){return !n.closest('[hidden]');});var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    document.addEventListener('keydown',keys);box.querySelector('[data-backup-close]').onclick=close;
    a.watch=setInterval(function(){if(!valid())cleanup();},250);
    async function request(action){
      if(!valid())throw new Error('账号已切换，请重新选择备份');
      var controller=new AbortController();a.controller=controller;var timeout=setTimeout(function(){controller.abort();},60000);
      try{
        var response=await fetch('/api/score-tracker-import',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({action:action,token:a.token,backup:a.raw,digest:a.preview&&a.preview.digest,confirmed:action==='import',restoreSettings:settings.checked})});
        var result=await response.json().catch(function(){return {error:'服务响应异常，请重试'};});
        if(!response.ok)throw new Error(result.error||'导入请求失败');return result;
      }finally{clearTimeout(timeout);}
    }
    file.onchange=async function(){
      var version=++a.version,f=file.files&&file.files[0];a.raw=null;a.preview=null;preview.textContent='';settings.checked=false;box.querySelector('.backup-settings').hidden=true;go.disabled=true;
      if(!f)return statusText('请选择完整备份 JSON 文件。');
      if(f.size>ScoreBackup.maxBytes)return statusText('文件超过 8 MB，请按分类分别导出后导入。',true);
      go.textContent='正在核对…';statusText('正在读取并核对备份，不会修改成绩。');
      try{
        var content=await f.text();if(!valid()||version!==a.version)return;
        var raw;try{raw=JSON.parse(content.replace(/^\uFEFF/,''));}catch(e){throw new Error('文件不是有效的 JSON，请选择「完整备份」，CSV 或 TXT 不能用于恢复。');}
        var normalized=ScoreBackup.normalize(raw);a.raw=raw;
        var result=await request('preview');if(!valid()||version!==a.version)return;a.preview=result;
        var dates=normalized.exams.map(function(e){return e.exam_date;}).sort();
        preview.innerHTML='<div class="backup-summary"><div><strong>'+result.added+'</strong><span>将新增考试</span></div><div><strong>'+result.skipped+'</strong><span>重复将跳过</span></div><div><strong>'+result.scores+'</strong><span>将新增成绩</span></div></div>'
          +'<p class="backup-meta">备份账号：'+esc(raw.account||raw.originalUsername||'未记录')+'<br>导入账号：'+esc(state.user.username||'当前账号')+(dates.length?'<br>考试日期：'+esc(dates[0])+' ～ '+esc(dates[dates.length-1]):'')+'</p>'
          +'<details><summary>查看备份考试（前 20 场）</summary><ul>'+normalized.exams.slice(0,20).map(function(e){return '<li>'+esc(e.exam_date)+' · '+esc(e.name)+' · '+Object.keys(e.scores).length+' 科'+(e.is_hidden?' · 已隐藏':'')+'</li>';}).join('')+'</ul></details>'
          +(result.skipped?'<details><summary>查看重复考试（最多 10 场）</summary><ul>'+(result.duplicates||[]).map(function(e){return '<li>'+esc(e.date)+' · '+esc(e.name)+'</li>';}).join('')+'</ul></details>':'');
        box.querySelector('.backup-settings').hidden=!(raw.goal||raw.category||raw.participantDefaults);
        statusText('预览完成。确认后将写入当前账号；原有成绩保留。');go.textContent='确认导入';go.disabled=false;
        track('backup_import_preview',{exams:normalized.exams.length,added:result.added,skipped:result.skipped});
      }catch(e){if(!valid()||version!==a.version)return;a.raw=null;a.preview=null;statusText(e.name==='AbortError'?'核对超时，请重新选择文件。':e.message,true);go.textContent='请重新选择备份';}
    };
    go.onclick=async function(){
      if(a.done){close();return;}
      if(a.busy||!a.preview||!valid())return;
      a.busy=true;go.disabled=true;file.disabled=true;settings.disabled=true;box.querySelector('[data-backup-close]').disabled=true;go.textContent='正在导入…';statusText('正在保存，请稍候。');
      try{
        var result=await request('import');if(!valid())return;a.done=true;
        track('backup_import_done',{added:result.added,skipped:result.skipped,scores:result.scores,settings:result.settingsRestored});
        statusText('导入完成：新增 '+result.added+' 场考试、'+result.scores+' 条成绩，跳过 '+result.skipped+' 场重复考试。');go.textContent='完成';
        try{await loadExams();if(valid())render();}catch(e){if(valid())statusText('数据已导入成功，但列表刷新失败。关闭后刷新页面即可查看，请勿重复修改文件。');}
      }catch(e){if(valid()){statusText((e.name==='AbortError'?'连接超时，导入可能已提交。':e.message)+' 可直接重试，重复考试会自动跳过。',true);go.textContent='重试导入';track('backup_import_failed',{});}}
      finally{a.busy=false;if(valid()){go.disabled=false;box.querySelector('[data-backup-close]').disabled=false;if(!a.done){file.disabled=false;settings.disabled=false;}}}
    };
    box.querySelector('.backup-sheet').focus();track('backup_import_open',{});
  }
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#importDataV30'))open();});
  var style=document.createElement('style');style.textContent='.backup-sheet{box-sizing:border-box;color:var(--text);overflow-wrap:anywhere}.backup-sheet .card-sub{line-height:1.65}.backup-file-label{display:grid;gap:9px;font-size:13px;font-weight:600;margin:20px 0 12px}.backup-file-label input{width:100%;min-width:0;box-sizing:border-box;border:1px dashed var(--line);border-radius:12px;padding:14px 10px;font:inherit;color:var(--text);background:var(--cell,#f6f8fc)}#backupStatus{font-size:12px;line-height:1.65;margin:12px 0;color:var(--muted)}#backupStatus.backup-error{color:var(--danger,#c54b57)}.backup-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:18px 0}.backup-summary>div{background:var(--accent-soft,#f1f3ff);border:1px solid var(--line);border-radius:12px;padding:13px 6px;text-align:center}.backup-summary strong{font-size:26px;display:block;line-height:1.2}.backup-summary span{display:block;font-size:11px;color:var(--muted);margin-top:7px}.backup-meta,.backup-rule,.backup-sheet details{font-size:12px;line-height:1.75;color:var(--muted)}.backup-rule{padding-top:12px;border-top:1px solid var(--line)}.backup-settings{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.7;margin-top:18px}.backup-settings[hidden]{display:none}.backup-settings input{margin-top:4px;flex-shrink:0}.backup-sheet button:disabled{opacity:.55;cursor:default}.backup-sheet .export-go-v30{min-height:46px}';document.head.appendChild(style);
  window.ScoreBackupImport={open:open};
})();

/* ===== account-growth.js ===== */
(function(){
 'use strict';
 var cached=null,cachedToken='',loadedAt=0,pending=null;
 var names={record:'记录有效成绩',quick:'快速录入后保存',trend:'成绩趋势',radar:'能力雷达',worth:'成绩含金量',trajectory:'轨迹匹配',goal:'设置目标',reflection:'考试反思',types:'题型统计',paper:'核对试题',report:'查看已有分析报告',export:'导出成绩',appearance:'应用外观',feedback:'提交反馈或投票',planner:'学习规划'};
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function number(v){return Math.max(0,Math.floor(Number(v)||0)).toLocaleString();}
 async function request(action){var token=state.token,r=await fetch('/api/score-tracker-data-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,token:token})});var j=await r.json();if(!r.ok)throw Error(j.error||'暂时无法读取');if(token!==state.token)throw Error('登录状态已变化');return j;}
 function view(a){
  var g=a.growth,c=a.credits,next=(g.levels||[]).find(function(l){return l.level===g.level+1;});
  var requirements=next?['成长分 '+number(g.points)+' / '+number(next.threshold),next.min_days?'注册 '+g.registered_days+' / '+next.min_days+' 天':'',next.min_months?'有效使用 '+g.active_months+' / '+next.min_months+' 个月':'',!g.valid_exams?'至少 1 场有效考试':''].filter(Boolean).join(' · '):'已达到最高等级';
  var levelTable='<div class="ag-table" tabindex="0" role="region" aria-label="等级与 AI 月额度"><table><thead><tr><th>等级</th><th>成长分</th><th>额外要求</th><th>月积分</th></tr></thead><tbody>'+(g.levels||[]).map(function(l){return '<tr'+(l.level===g.level?' class="ag-current"':'')+'><td>Lv.'+l.level+'</td><td>'+l.threshold+'</td><td>'+esc([l.level>1?'有效考试':'',l.min_days?l.min_days+'天':'',l.min_months?l.min_months+'个有效月':''].filter(Boolean).join(' · ')||'—')+'</td><td>'+l.monthly_credits+'</td></tr>';}).join('')+'</tbody></table></div>';
  return '<div class="ag-summary"><div><span class="ag-level">Lv.'+g.level+'</span><span>成长分 <b>'+number(g.points)+'</b></span></div><button type="button" class="ag-refresh">刷新</button></div><p class="ag-progress">'+esc(requirements)+'</p><div class="ag-wallet"><div><b>'+number(c.available)+'</b><span>可用 AI 积分</span></div><div><b>'+number(c.monthly)+'</b><span>每月发放</span></div>'+(c.held?'<div><b>'+number(c.held)+'</b><span>任务预留</span></div>':'')+'</div>'+
   (!a.enabled?'<p class="ag-note">账号等级对所有账号显示；AI 功能暂未开放。</p>':a.budget_status==='paused'?'<p class="ag-note">本月 AI 预算不足，未扣积分</p>':'')+
   '<details><summary>积分怎么用</summary><div class="ag-rules"><p><b>按实际用量扣分，失败不扣。</b>手动核对与保存免费。</p><div class="ag-table"><table aria-label="识别选项与开始所需积分"><thead><tr><th>功能 / 页面选项</th><th>开始需可用积分</th></tr></thead><tbody><tr><td>成绩图片识别</td><td>13 分（通常约 13 分 / 次）</td></tr><tr><td>试题识别 · 仅上传题目</td><td>150 分</td></tr><tr><td>试题识别 · 写在试卷上</td><td>400 分</td></tr><tr><td>试题识别 · 在答题卡上</td><td>400 分</td></tr></tbody></table></div><p>试题识别通常每张约 10～30 积分，实际随图片和补读次数变化，上传后会显示本次估算。表中是开始所需余额，并非固定费用。提交时预留部分积分，完成后释放余量。试卷分析暂未开放。</p><p>首次赠送 <b>'+number(c.welcome)+'</b> 分；Lv.2 起每月自动发放，升级补差。可累积至 <b>'+number(c.cap)+'</b> 分。</p></div></details>'+
   '<details><summary>如何升级</summary><div class="ag-rules"><ul><li>首次有效体验：按功能加分</li><li>有效使用月：<b>+60</b>，无需每天签到</li><li>不同日期的有效考试：每场 <b>+20</b>，每月最多 3 场</li><li>结合考试查看趋势、雷达、含金量或匹配：每场每月最多 <b>+10</b>，全账号每月最多 <b>+20</b></li></ul><p>重复点击不加分，等级累计保留。</p><details><summary>12 级门槛与月额度</summary>'+levelTable+'</details><details><summary>首次体验成长分</summary><div class="ag-features">'+(g.features||[]).filter(function(f){return f.feature!=='planner';}).map(function(f){return '<span>'+esc(names[f.feature]||f.feature)+' <b>+'+f.points+'</b> '+(f.earned?'已获得':'')+'</span>';}).join('')+'</div><p>历史仅按已保存的有效记录补记。</p></details></div></details><button type="button" class="ag-usage">最近 AI 用量</button><div class="ag-history" aria-live="polite"></div>';
 }
 function paint(){var host=document.getElementById('accountGrowth');if(!host||cachedToken!==state.token||!cached)return;host.innerHTML=view(cached);host.querySelector('.ag-refresh').onclick=function(){load(true);};host.querySelector('.ag-usage').onclick=async function(){var box=host.querySelector('.ag-history');this.disabled=true;try{var j=await request('account_usage');if(!host.isConnected)return;box.innerHTML=(j.usage||[]).map(function(r){var feature={vision:'成绩识图',paper_entry:'试题识别',probe:'连接测试',admin_test:'模型测试'}[r.feature]||'AI 调用';return '<p>'+esc(feature)+' · '+esc(new Date(r.created_at).toLocaleString())+' · '+number(r.charged_credits)+' 分 · '+esc({active:'进行中',succeeded:'已完成',failed:'失败未扣分',expired:'已释放预留'}[r.status]||r.status)+'</p>';}).join('')||'<p>暂无 AI 使用记录</p>';}catch(e){box.textContent=e.message;}finally{this.disabled=false;}};}
 async function load(force){
  if(!state.token)return;var token=state.token,host=document.getElementById('accountGrowth');
  if(!force&&cachedToken===token&&cached&&Date.now()-loadedAt<30000){paint();return;}
  if(pending&&pending.token===token)return pending.promise;
  if(host&&!cached)host.textContent='正在读取等级与 AI 积分…';
  var promise=(async function(){try{var j=await request('account_status');if(state.token!==token)return;cached=j.account;cachedToken=token;loadedAt=Date.now();paint();}catch(e){if(host&&host.isConnected&&state.token===token){host.textContent='等级与 AI 积分暂不可用。';var b=document.createElement('button');b.type='button';b.className='ag-refresh';b.textContent='重试';b.onclick=function(){load(true);};host.appendChild(b);}}finally{if(pending&&pending.token===token)pending=null;}})();pending={token:token,promise:promise};return promise;
 }
 var oldAccount=accountHtml;accountHtml=function(){var html=oldAccount();if(!state.token)return html;var block='<section class="account-growth" id="accountGrowth" aria-label="账号等级（所有账号）与 AI 积分" aria-live="polite">正在读取账号等级与 AI 积分…</section>';return html.replace('<div class="username-origin-v19"',block+'<div class="username-origin-v19"');};
 var oldBind=bindPage;bindPage=function(){var result=oldBind.apply(this,arguments);if(state.page==='account')load(false);return result;};
 if(typeof dataApiV7==='function'){var oldApi=dataApiV7;dataApiV7=async function(action,payload){if(action==='save_exam'&&state.modal&&state.modal.dataset&&state.modal.dataset.quickEntryApplied)payload=Object.assign({},payload,{quick_entry:true});var r=await oldApi.call(this,action,payload);if(/^save_|^import/.test(action)){loadedAt=0;cached=null;}return r;};}
 window.ScoreAccountBenefits={refresh:function(){return load(true);},invalidate:function(){cached=null;loadedAt=0;}};
 var style=document.createElement('style');style.textContent='.account-growth{margin:12px 0 8px;padding:16px;border:1px solid var(--line,#e2e8f0);border-radius:14px;background:var(--panel-solid,#fff);font-size:13px;line-height:1.7;max-width:100%;box-sizing:border-box;min-width:0;text-align:left}.ag-summary,.ag-summary>div{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ag-summary{justify-content:space-between}.ag-level{font-size:15px;font-weight:750;color:var(--accent,#5269d8);background:var(--accent-soft,#edf1ff);border-radius:8px;padding:2px 10px}.ag-progress,.ag-note{color:var(--muted,#687386);font-size:12px;margin:10px 0}.ag-wallet{display:flex;gap:24px;flex-wrap:wrap;margin:14px 0}.ag-wallet>div{display:flex;flex-direction:column}.ag-wallet b{font-size:24px;line-height:1.2}.ag-wallet span{font-size:12px;color:var(--muted,#687386);margin-top:5px}.account-growth summary{cursor:pointer;color:var(--accent,#5269d8);padding:7px 0}.ag-rules{padding-top:4px}.ag-rules p{font-size:12px;color:var(--muted,#687386);margin:8px 0}.ag-table{width:100%;overflow:auto}.ag-table table{border-collapse:collapse;width:100%;font-size:12px}.ag-table th,.ag-table td{text-align:left;padding:8px 5px;border-bottom:1px solid var(--line,#e2e8f0)}.ag-current{color:var(--accent,#5269d8);font-weight:650}.ag-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ag-features span{padding:6px;background:var(--soft,#f7f8fb);border-radius:6px;font-size:12px}.ag-refresh,.ag-usage{font:inherit;padding:6px 10px;color:var(--accent,#5269d8);border:1px solid var(--line,#e2e8f0);border-radius:8px;background:transparent;cursor:pointer;min-height:36px}.ag-usage{margin-top:12px}.ag-history p{border-bottom:1px solid var(--line,#e2e8f0);padding:8px 0;overflow-wrap:anywhere}@media(max-width:420px){.account-growth{padding:12px}.ag-features{grid-template-columns:1fr}.ag-table th,.ag-table td{padding:7px 3px}}';document.head.appendChild(style);
})();
