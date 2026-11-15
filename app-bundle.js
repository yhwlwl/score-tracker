/*! app-bundle.js Â· è‡ªåŠ¨ç”Ÿæˆ,å‹¿æ‰‹æ”¹ â€”â€” æ”¹æºç åè¿è¡Œ: node design/build-bundles.js
   æ¥æºé¡ºåº: public-assets.js, compat.js, request-budget-v24.js, telemetry-feedback.js, feedback-statuses.js, app-v3.js, app-v4.js, app-v5.js, app-v6.js, app-v7.js, app-v8.js, app-v9.js, app-v10.js, app-v11.js, feedback-unread-dot.js, app-v12.js, app-v13.js, app-v14.js, app-v15.js, app-v16.js, app-v17.js, app-v18.js, app-v19.js, app-v20.js, app-v21.js, app-v22.js, app-v23.js, app-v24.js, app-v25.js, app-v26.js, app-v27.js, app-v28.js, app-v29.js, app-v30.js, app-v31.js, app-v32.js, app-v33.js, app-v34.js, app-v35.js, score-worth-model.js, score-worth.js, release-notices.js, account-recovery.js, trajectory-forecast.js, similar-trajectories.js, school-settings.js, announcement-settings.js, announcement-replies.js, author-support.js, community.js, participant-defaults.js, exam-averages.js, supabase/functions/_shared/question-types.js, question-type-scores.js, question-type-analysis-model.js, question-type-analysis.js, exam-changes.js, exam-reflection.js, entry-rollout.js, paper-review-support.js, paper-review.js, paper-review-scans.js, paper-review-hub.js, paper-records.js, exam-detail.js, supabase/functions/_shared/backup-format.js, backup-import.js, account-growth.js */
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
      if (app) app.innerHTML = '<div class="splash"><div class="brand-mark">â†—</div><div>æ­£åœ¨åˆ›å»ºä½ çš„ä¸“å±è´¦å·</div><small>åªéœ€è¦å‡ ç§’é’Ÿ</small></div>';

      try {
        var data = await api('register');
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('st_token', data.token);
        localStorage.setItem('st_known_user', '1');

        var modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = '<div class="modal onboard"><div class="big-icon">âœ“</div><h2>è´¦å·å·²ç»å‡†å¤‡å¥½äº†</h2><p>è¯·å…ˆä¿å­˜è´¦å·ï¼Œå†è¿›å…¥æˆç»©é¡µé¢ã€‚</p>' +
          '<div class="credential"><small>ç”¨æˆ·å</small><div class="credential-row"><code>' + escapeHtml(data.user.username) + '</code><button class="copy-btn" data-copy="' + escapeHtml(data.user.username) + '">å¤åˆ¶</button></div></div>' +
          '<div class="credential"><small>å¯†ç </small><div class="credential-row"><code>' + escapeHtml(data.password) + '</code><button class="copy-btn" data-copy="' + escapeHtml(data.password) + '">å¤åˆ¶</button></div></div>' +
          '<div class="save-warning"><span class="i">i</span><div><b>è¯·ç°åœ¨æˆªå›¾ä¿å­˜ã€‚</b><br>å¯†ç åªå±•ç¤ºè¿™ä¸€æ¬¡ã€‚</div></div>' +
          '<button class="primary full" id="compatSavedBtn">æˆ‘å·²æˆªå›¾ä¿å­˜ï¼Œç»§ç»­</button></div>';
        document.body.appendChild(modal);

        var copyButtons = modal.querySelectorAll('[data-copy]');
        for (var i = 0; i < copyButtons.length; i += 1) {
          copyButtons[i].onclick = async function () {
            try {
              await navigator.clipboard.writeText(this.getAttribute('data-copy'));
              if (typeof toast === 'function') toast('å·²å¤åˆ¶');
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
            renderLogin('è´¦å·å·²åˆ›å»ºå¹¶å·²ç™»å½•ï¼Œä½†é¡µé¢åŠ è½½å¤±è´¥ï¼Œè¯·åˆ·æ–°åé‡è¯•ã€‚');
          }
        };
      } catch (e) {
        renderLogin(e && e.message ? e.message : 'æ³¨å†Œå¤±è´¥ï¼Œè¯·é‡è¯•');
      }
    };
  });
})();

/* ===== request-budget-v24.js ===== */
// v24: small client request budget. Loaded before telemetry so background polling can be coalesced.
(function(){
  var API='/api/score-tracker-api';
  /* ç‰ˆæœ¬å”¯ä¸€æ¥æº:index.html çš„ <meta name="application-version">ã€‚
     æ­¤å‰è¿™é‡Œç¡¬ç¼–ç  'v2.4',æŠŠ telemetry è¯»åˆ°çš„çœŸå®ç‰ˆæœ¬åœ¨å‘é€å‰è¦†ç›–æ‰äº†ã€‚ */
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
    const j = await r.json().catch(() => ({ error: 'ç½‘ç»œå“åº”å¼‚å¸¸' }));
    if (!r.ok) throw new Error(j.error || 'è¯·æ±‚å¤±è´¥');
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
      // ç½‘ç»œå±‚å¤±è´¥ï¼ˆæ–­ç½‘/è¢«æ’ä»¶æ‹¦æˆª/DNS ç­‰ï¼‰æ­¤å‰å®Œå…¨ä¸å¯è§‚æµ‹ï¼šè¿™é‡Œä¸ŠæŠ¥ååŸæ ·æŠ›å‡º
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
    const b = document.createElement('button'); b.id = 'stFeedbackBtn'; b.className = 'st-fb-btn'; b.innerHTML = 'å»ºè®®åé¦ˆ <b>0</b>'; b.onclick = () => openFeedback(); document.body.appendChild(b);
  }
  const statusText = { new: 'æ–°åé¦ˆ', open: 'å·²æŸ¥çœ‹', in_progress: 'å¤„ç†ä¸­', resolved: 'å·²è§£å†³', closed: 'å·²å…³é—­' };
  async function pollUnread() {
    try {
      const d = await call('feedback_list', { guestAccessToken });
      const n = (d.feedback || []).reduce((a, x) => a + Number(x.unread || 0), 0), b = $('#stFeedbackBtn');
      if (b) { b.classList.toggle('has-unread', n > 0); $('b', b).textContent = n; }
      const prev = Number(localStorage.getItem('st_feedback_unread') || 0);
      if (n > prev && n > 0) { const x = document.createElement('div'); x.className = 'st-fb-notice'; x.textContent = `ä½ æœ‰ ${n} æ¡ç®¡ç†å‘˜æ–°å›å¤`; document.body.appendChild(x); setTimeout(() => x.remove(), 4000); }
      localStorage.setItem('st_feedback_unread', String(n));
    } catch {}
  }
  function modalBase(title) {
    const back = document.createElement('div'); back.className = 'st-fb-back'; back.innerHTML = `<div class="st-fb-modal"><div class="st-fb-head"><h3>${title}</h3><button class="st-fb-close">Ã—</button></div><div class="st-fb-body"></div></div>`;
    document.body.appendChild(back); $('.st-fb-close', back).onclick = () => back.remove(); back.onclick = e => { if (e.target === back) back.remove(); }; return back;
  }
  async function filePayload(input) {
    const files = [...(input?.files || [])].slice(0, 3), out = [];
    for (const f of files) { if (!f.type.startsWith('image/')) continue; if (f.size > 5 * 1024 * 1024) throw new Error('å•å¼ å›¾ç‰‡ä¸èƒ½è¶…è¿‡ 5MB'); const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f); }); out.push({ name: f.name, type: f.type, size: f.size, data }); }
    return out;
  }
  window.__scoreTrackerFeedback = { open: openFeedback };
  async function openFeedback(options = {}) {
    if (document.querySelector('.st-fb-back')) return;
    track('feedback_opened');
    const back = modalBase('å»ºè®®ä¸åé¦ˆ'), body = $('.st-fb-body', back);
    body.innerHTML = `<div class="st-fb-tabs"><button class="active" data-tab="new">æäº¤åé¦ˆ</button><button data-tab="history">æˆ‘çš„åé¦ˆ</button></div><div id="stFbPane"></div>`;
    const showNew = () => { $$('.st-fb-tabs button', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'new')); $('#stFbPane', back).innerHTML = `<div class="st-fb-field"><label>ç±»å‹</label><select id="stFbType"><option value="suggestion">åŠŸèƒ½å»ºè®®</option><option value="bug">é—®é¢˜ / Bug</option><option value="experience">ä½“éªŒåé¦ˆ</option><option value="other">å…¶ä»–</option></select></div><div class="st-fb-field"><label>å†…å®¹</label><textarea id="stFbContent" maxlength="5000" placeholder="è¯·å°½é‡æè¿°å‘ç”Ÿäº†ä»€ä¹ˆã€ä½ å¸Œæœ›æ€æ ·æ”¹è¿›â€¦"></textarea></div><div class="st-fb-field st-fb-files"><label>æˆªå›¾ï¼ˆå¯é€‰ï¼Œæœ€å¤š 3 å¼ ï¼Œæ¯å¼  â‰¤ 5MBï¼‰</label><input id="stFbFiles" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></div><div class="st-fb-note">ä¼šè‡ªåŠ¨é™„å¸¦ç‰ˆæœ¬ã€é¡µé¢ã€è®¾å¤‡ã€è®¿é—®æ¥æºã€ä½¿ç”¨æ·±åº¦å’Œæˆç»©è®°å½•ç»Ÿè®¡ï¼Œæ–¹ä¾¿å®šä½é—®é¢˜ï¼›ä¸ä¼šä¸Šä¼ ä½ çš„å¯†ç ã€‚</div><div class="st-fb-actions" style="margin-top:16px"><button class="st-fb-primary" id="stFbSubmit">æäº¤</button></div>`; $('#stFbSubmit', back).onclick = submitFeedback; };
    const showHistory = async () => { $$('.st-fb-tabs button', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'history')); const pane = $('#stFbPane', back); pane.innerHTML = '<div class="st-fb-empty">è¯»å–ä¸­â€¦</div>'; try { const d = await call('feedback_list', { guestAccessToken }); pane.innerHTML = (d.feedback || []).length ? `<div class="st-fb-list">${d.feedback.map(x => `<div class="st-fb-item" data-feedback-id="${x.id}"><div class="st-fb-meta"><span>${new Date(x.created_at).toLocaleString('zh-CN')} Â· <span class="st-fb-pill">${statusText[x.status] || x.status}</span></span>${x.unread ? `<span class="st-fb-unread">${x.unread} æ¡æ–°å›å¤</span>` : ''}</div><div class="st-fb-content">${escapeHtml(x.content)}</div></div>`).join('')}</div>` : '<div class="st-fb-empty">è¿˜æ²¡æœ‰æäº¤è¿‡åé¦ˆ</div>'; $$('[data-feedback-id]', pane).forEach(x => x.onclick = () => openThread(x.dataset.feedbackId, back)); } catch (e) { pane.innerHTML = `<div class="st-fb-empty">${escapeHtml(e.message)}</div>`; } };
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
    async function submitFeedback() { const btn = $('#stFbSubmit', back), content = $('#stFbContent', back).value.trim(); if (!content) return; btn.disabled = true; btn.textContent = 'æäº¤ä¸­â€¦'; try { const attachments = await filePayload($('#stFbFiles', back)); await call('feedback_submit', { feedbackType: $('#stFbType', back).value, content, context: context(), guestAccessToken, attachments }); track('feedback_submitted', { type: $('#stFbType', back).value }); $('#stFbPane', back).innerHTML = '<div class="st-fb-empty"><b>å·²æ”¶åˆ°ï¼Œè°¢è°¢ä½ çš„åé¦ˆã€‚</b><br><br>ç®¡ç†å‘˜å›å¤åè¿™é‡Œä¼šå‡ºç°æœªè¯»æé†’ã€‚</div>'; pollUnread(); } catch (e) { btn.disabled = false; btn.textContent = 'æäº¤'; alert(e.message); } }
  }
  async function openThread(id, parent) {
    const pane = $('#stFbPane', parent); pane.innerHTML = '<div class="st-fb-empty">è¯»å–ä¼šè¯â€¦</div>';
    try {
      const d = await call('feedback_detail', { feedbackId: id, guestAccessToken }); await call('feedback_mark_read', { feedbackId: id, guestAccessToken }).catch(() => {}); track('feedback_read', { feedback_id: id });
      const atts = d.attachments || [], msgs = [{ author_type: 'user', content: d.feedback.content, created_at: d.feedback.created_at, id: null }, ...(d.replies || [])];
      const imgs = rid => { const a = atts.filter(x => (x.reply_id || null) === rid && x.url); return a.length ? `<div class="st-fb-imgs">${a.map(x => `<a href="${x.url}" target="_blank" rel="noopener"><img src="${x.url}" alt="${escapeHtml(x.file_name)}"></a>`).join('')}</div>` : ''; };
      pane.innerHTML = `<button class="st-fb-secondary" id="stFbBack">â† è¿”å›åˆ—è¡¨</button><div class="st-fb-meta" style="margin:14px 0"><span class="st-fb-pill">${statusText[d.feedback.status] || d.feedback.status}</span><span>${new Date(d.feedback.created_at).toLocaleString('zh-CN')}</span></div><div class="st-fb-thread">${msgs.map(m => `<div class="st-fb-msg ${m.author_type === 'admin' ? 'admin' : ''}"><b>${m.author_type === 'admin' ? 'ç®¡ç†å‘˜' : 'æˆ‘'}</b><br>${escapeHtml(m.content)}${imgs(m.id)}</div>`).join('')}</div><div class="st-fb-field" style="margin-top:16px"><label>ç»§ç»­å›å¤</label><textarea id="stFbReply" maxlength="5000" placeholder="è¡¥å……æƒ…å†µæˆ–å›å¤ç®¡ç†å‘˜â€¦"></textarea></div><div class="st-fb-field st-fb-files"><input id="stFbReplyFiles" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></div><div class="st-fb-actions"><button class="st-fb-primary" id="stFbReplyBtn">å‘é€å›å¤</button></div>`;
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
    ['new', 'å·²æ”¶åˆ°'],
    ['æ–°åé¦ˆ', 'å·²æ”¶åˆ°'],
    ['reviewing', 'å¤„ç†ä¸­'],
    ['open', 'å¤„ç†ä¸­'],
    ['å·²æŸ¥çœ‹', 'å¤„ç†ä¸­'],
    ['planned', 'å·²è®¡åˆ’'],
    ['resolved', 'å·²è§£å†³'],
    ['closed', 'å·²å…³é—­'],
  ]);

  const STATUS_CLASSES = {
    'å·²æ”¶åˆ°': 'is-received',
    'å¤„ç†ä¸­': 'is-reviewing',
    'å·²è®¡åˆ’': 'is-planned',
    'å·²è§£å†³': 'is-resolved',
    'å·²å…³é—­': 'is-closed',
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
const SUBJECTS = ['è¯­æ–‡', 'æ•°å­¦', 'è‹±è¯­', 'ç‰©ç†', 'åŒ–å­¦', 'ç”Ÿç‰©', 'å†å²', 'åœ°ç†', 'æ”¿æ²»'];
const SUBJECT_SHORT = { è¯­æ–‡: 'è¯­', æ•°å­¦: 'æ•°', è‹±è¯­: 'è‹±', ç‰©ç†: 'ç‰©', åŒ–å­¦: 'åŒ–', ç”Ÿç‰©: 'ç”Ÿ', å†å²: 'å²', åœ°ç†: 'åœ°', æ”¿æ²»: 'æ”¿' };
const SUBJECT_MAX = { è¯­æ–‡: 150, æ•°å­¦: 150, è‹±è¯­: 150, ç‰©ç†: 100, åŒ–å­¦: 100, ç”Ÿç‰©: 100, å†å²: 100, åœ°ç†: 100, æ”¿æ²»: 100 };
const RADAR_COLORS = ['#5d72e8', '#32a77a', '#e59b45', '#df5f68'];
const state = {
  token: localStorage.getItem('st_token') || '',
  user: null,
  exams: [],
  page: 'home',
  subject: 'æ€»åˆ†',
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
  const data = await res.json().catch(() => ({ error: 'ç½‘ç»œå“åº”å¼‚å¸¸' }));
  if (!res.ok) {
    if (res.status === 401 && action !== 'login' && action !== 'register') {
      localStorage.removeItem('st_token');
      state.token = '';
      state.user = null;
      renderLogin();
    }
    throw window.__scoreTrackerResponseError ? window.__scoreTrackerResponseError(res, data, action) : new Error(data.error || 'è¯·æ±‚å¤±è´¥');
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
  return `${x.getMonth() + 1}æœˆ${x.getDate()}æ—¥`;
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
  if (v === null || v === undefined || Number.isNaN(Number(v))) return 'â€”';
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function formatPercent(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return 'â€”';
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
  $('#app').innerHTML = '<div class="splash"><div class="brand-mark">â†—</div><div>æ­£åœ¨åˆ›å»ºä½ çš„ä¸“å±è´¦å·</div><small>åªéœ€è¦å‡ ç§’é’Ÿ</small></div>';
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
    <header class="topbar"><div class="brand"><div class="logo">â†—</div><div><h1>æˆç»©è½¨è¿¹</h1><p>æŠŠæ¯ä¸€æ¬¡åŠªåŠ›ï¼Œè¿æˆä¸€æ¡å‘ä¸Šçš„çº¿</p></div></div>
    <nav class="desktop-nav">${navButton('home', 'æ¦‚è§ˆ')}${navButton('records', 'è€ƒè¯•è®°å½•')}${navButton('account', 'è´¦å·')}</nav></header>
    <main id="content"></main></div>
    <nav class="bottom-nav">${bottomButton('home', 'æ¦‚è§ˆ')}${bottomButton('records', 'è®°å½•')}${bottomButton('account', 'è´¦å·')}</nav>`;
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
    <div class="card hero-main"><span class="eyebrow">âœ¦ æœ¬å­¦å¹´æˆé•¿è®°å½•</span><h2>${state.exams.length ? 'çœ‹è§èµ·ä¼ï¼Œä¹Ÿçœ‹è§è‡ªå·±åœ¨è¿›æ­¥ã€‚' : 'ä»ç¬¬ä¸€æ¬¡è€ƒè¯•å¼€å§‹ï¼Œè®°å½•ä½ çš„ä¸Šå‡è½¨è¿¹ã€‚'}</h2><p class="hero-desc">è®°å½•è¯­æ•°è‹±ç‰©åŒ–ç”Ÿå²åœ°æ”¿ 9 ç§‘çš„ç›®æ ‡ä¸çœŸå®æˆç»©ï¼ŒæŠ˜çº¿å›¾çœ‹æ€»è¶‹åŠ¿ï¼Œé›·è¾¾å›¾çœ‹ç»“æ„å˜åŒ–ï¼Œæ›´å®¹æ˜“æ‰¾åˆ°å¼±é¡¹å¹¶è¿½è¸ªæ”¹å–„ã€‚</p><div class="hero-actions"><button class="primary" id="addExamHome">ï¼‹ è®°å½•ä¸€æ¬¡è€ƒè¯•</button><button class="secondary" data-page="records">æŸ¥çœ‹å…¨éƒ¨è®°å½•</button></div></div>
    <div class="card hero-stat"><div><div class="stat-label">æœ€è¿‘ä¸€æ¬¡çœŸå®æ€»åˆ†</div><div class="stat-value">${actual === null ? 'â€”' : formatScore(actual)}</div><div class="stat-sub">${last ? `${escapeHtml(last.name)} Â· ${fmtDate(last.exam_date)}` : 'è¿˜æ²¡æœ‰çœŸå®æˆç»©è®°å½•'}</div></div>${delta === null ? '' : `<span class="trend-pill">${delta >= 0 ? 'â†—' : 'â†˜'} è¾ƒä¸Šæ¬¡ ${delta >= 0 ? '+' : ''}${formatScore(delta)} åˆ†</span>`}</div>
  </section>
  <section class="grid-main"><div class="stack-main"><div class="card chart-card"><div class="card-title-row"><div><h3 class="card-title">æˆç»©è¶‹åŠ¿</h3><p class="card-sub">çœŸå®æˆç»©ä¸ç›®æ ‡æˆç»©æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œ</p></div><div class="legend"><span><i class="actual"></i>çœŸå®æˆç»©</span><span><i class="target"></i>ç›®æ ‡æˆç»©</span></div></div><div class="chips">${['æ€»åˆ†', ...SUBJECTS].map((s) => `<button class="chip ${state.subject === s ? 'active' : ''}" data-subject="${s}">${s}</button>`).join('')}</div><div class="chart-wrap" id="chart">${chartHtml()}</div></div>${radarCardHtml()}</div>
  <div class="side-stack"><div class="card quick-card"><h3 class="card-title">è¿™ä¸€å¹´çš„è®°å½•</h3><div class="quick-grid"><div class="mini-stat"><b>${state.exams.length}</b><span>æ¬¡è€ƒè¯•</span></div><div class="mini-stat"><b>${recordedCount()}</b><span>æ¬¡å·²å‡ºåˆ†</span></div><div class="mini-stat"><b>${target === null ? 'â€”' : formatScore(target)}</b><span>æœ€è¿‘ç›®æ ‡æ€»åˆ†</span></div><div class="mini-stat"><b>${delta === null ? 'â€”' : `${delta >= 0 ? '+' : ''}${formatScore(delta)}`}</b><span>æœ€è¿‘å˜åŒ–</span></div></div></div>
  <div class="card recent-card"><div class="card-title-row"><div><h3 class="card-title">æœ€è¿‘è€ƒè¯•</h3><p class="card-sub">ç‚¹å‡»å¯ç¼–è¾‘æˆ–è¡¥å½•æˆç»©</p></div></div>${recentHtml()}</div></div></section>`;
}

function recentHtml() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:150px"><div><div class="empty-icon">âœ</div>ç¬¬ä¸€æ¡è®°å½•ï¼Œä¼šæˆä¸ºä½ çš„èµ·ç‚¹</div></div>`;
  return [...state.exams].reverse().slice(0, 4).map((e, i) => {
    const a = totalFor(e, 'actual');
    return `<div class="exam-item clickable" data-edit="${e.id}"><div class="exam-dot">${i + 1}</div><div class="exam-info"><b>${escapeHtml(e.name)}</b><span>${fmtYearDate(e.exam_date)}</span></div><div class="exam-score">${a === null ? 'å¾…è¡¥å½•' : formatScore(a)}</div></div>`;
  }).join('');
}

function chartHtml() {
  if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è®°å½•è€ƒè¯•åï¼Œè¿™é‡Œä¼šè‡ªåŠ¨å‡ºç°è¶‹åŠ¿çº¿</div></div>`;
  const points = state.exams.map((e) => ({
    exam: e,
    name: e.name,
    date: e.exam_date,
    actual: state.subject === 'æ€»åˆ†' ? totalFor(e, 'actual') : examScore(e, state.subject, 'actual'),
    target: state.subject === 'æ€»åˆ†' ? totalFor(e, 'target') : examScore(e, state.subject, 'target')
  }));
  const extra = window.ScoreAverages ? window.ScoreAverages.series() : [];
  const vals = points.flatMap((p) => [p.actual, p.target, ...extra.map((s) => s.value(p.exam))]).filter((v) => v !== null);
  if (!vals.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è¿™ä¸ªç§‘ç›®è¿˜æ²¡æœ‰æˆç»©æ•°æ®</div></div>`;
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
      circles += `<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="${color}" stroke-width="3" data-tip="${escapeHtml(p.name)} Â· ${label || (key === 'actual' ? 'çœŸå®' : 'ç›®æ ‡')} ${reader ? window.ScoreAverages.format(v) : formatScore(v)}"/>`;
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
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">å…¨éƒ¨ç§‘ç›®é›·è¾¾å›¾</h3><p class="card-sub">æŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼Œæ”¯æŒå åŠ å¤šæ¬¡è€ƒè¯•ï¼Œç›´è§‚çœ‹å‡ºå¼±é¡¹æ˜¯å¦æ”¹å–„</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">æŸ¥çœ‹å†…å®¹</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">çœŸå®æˆç»©</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">ç›®æ ‡æˆç»©</button></div><div><div class="subtle-note">æœ€å¤šå¯å åŠ  4 æ¬¡è€ƒè¯•ï¼Œæ¨èå¯¹æ¯”æœ€è¿‘å‡ æ¬¡ï¼Œæ‰¾å‡ºæœ€è–„å¼±å­¦ç§‘å’Œè¿›æ­¥æœ€æ˜æ˜¾çš„å­¦ç§‘ã€‚</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} Â· ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">å½“å‰è¿˜æ²¡æœ‰å¯ç”¨äºé›·è¾¾å›¾çš„æ•°æ®</span>'}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
}

function radarLegendHtml(selected) {
  if (!selected.length) return '';
  return `<div class="radar-legend">${selected.map((exam, index) => `<span class="legend-pill"><i style="background:${RADAR_COLORS[index % RADAR_COLORS.length]}"></i>${escapeHtml(exam.name)} Â· ${fmtDate(exam.exam_date)}</span>`).join('')}</div>`;
}

function radarChartHtml(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>é€‰æ‹© 1 æ¬¡æˆ–å¤šæ¬¡è€ƒè¯•åï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºå…¨éƒ¨ç§‘ç›®çš„ç»“æ„å˜åŒ–</div></div>`;
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
  return `<div class="radar-summary"><div class="summary-card"><h4>å½“å‰è–„å¼±ç§‘ç›®</h4><div class="summary-list">${weakness.length ? weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${item.subject}</b></span><span>${formatPercent(item.rate)}</span></div>`).join('') : '<div class="subtle-note">è¿™æ¬¡è€ƒè¯•è¿˜æ²¡æœ‰è¶³å¤Ÿæ•°æ®</div>'}</div></div><div class="summary-card"><h4>${selected.length > 1 ? 'å¯¹æ¯”å˜åŒ–' : 'æœ¬æ¬¡æ¦‚å†µ'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>å½“å‰å¯¹æ¯”ï¼š<span class="comparison-strong">${escapeHtml(earliest.name)}</span> â†’ <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>æ•´ä½“å¹³å‡å¾—åˆ†ç‡ï¼š<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div>è¿›æ­¥æœ€å¤§ï¼š${best ? `<span class="comparison-positive">${best.subject} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : 'â€”'}</div><div>éœ€è¦å…³æ³¨ï¼š${worst ? `<span class="comparison-negative">${worst.subject} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : 'â€”'}</div></div>` : `<div class="comparison-grid"><div>å·²é€‰æ‹©ï¼š<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>å¹³å‡å¾—åˆ†ç‡ï¼š<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div class="subtle-note">å†å¤šé€‰å‡ æ¬¡è€ƒè¯•ï¼Œå°±å¯ä»¥ç›´æ¥çœ‹åˆ°å¼±é¡¹æ”¹å–„äº†å¤šå°‘ã€‚</div></div>`}</div></div>`;
}

function recordsHtml() {
  return `<div class="page-head"><div><h2>è€ƒè¯•è®°å½•</h2><p>æŒ‰æ—¶é—´æ•´ç†ç›®æ ‡æˆç»©ä¸çœŸå®æˆç»©ï¼Œä»»ä½•æ—¶å€™éƒ½å¯ä»¥å›æ¥è¡¥å½•ã€‚</p></div><button class="primary" id="addExam">ï¼‹ æ–°å»º</button></div><div class="card records-card">${state.exams.length ? state.exams.map(recordHtml).join('') : `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">ğŸ“</div>è¿˜æ²¡æœ‰è€ƒè¯•è®°å½•<br><button class="secondary" id="emptyAdd" style="margin-top:14px">è®°å½•ç¬¬ä¸€åœºè€ƒè¯•</button></div></div>`}</div>`;
}

function recordHtml(e) {
  const actual = totalFor(e, 'actual');
  const target = totalFor(e, 'target');
  return `<div class="record"><div class="record-date">${fmtYearDate(e.exam_date)}<b>${escapeHtml(e.name)}</b></div><div class="record-scores">${SUBJECTS.map((s) => {
    const a = examScore(e, s, 'actual');
    const t = examScore(e, s, 'target');
    if (a === null && t === null) return '';
    return `<span class="score-tag">${s} ${a === null ? 'â€”' : formatScore(a)}<span style="color:#a1a9b5"> / ${t === null ? 'â€”' : formatScore(t)}</span></span>`;
  }).join('') || '<span class="score-tag">å°šæœªå¡«å†™åˆ†æ•°</span>'}<span class="score-tag"><b>æ€»åˆ† ${actual === null ? 'â€”' : formatScore(actual)}</b> / ç›®æ ‡ ${target === null ? 'â€”' : formatScore(target)}</span></div><div class="record-actions"><button class="icon-btn" title="ç¼–è¾‘" data-edit="${e.id}">âœ</button><button class="icon-btn danger" title="åˆ é™¤" data-delete="${e.id}">âŒ«</button></div></div>`;
}

function accountHtml() {
  return `<div class="page-head"><div><h2>è´¦å·</h2><p>è¿™ä¸ªè´¦å·è®©ä½ çš„æˆç»©è®°å½•å¯ä»¥ä¸€ç›´ä¿å­˜åœ¨äº‘ç«¯ã€‚</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">æˆ‘çš„è´¦å·</h3><p class="card-sub">ç”¨æˆ·åå¯ä»¥ç”¨äºä»¥åé‡æ–°ç™»å½•</p><div class="account-chip"><code>${escapeHtml(state.user?.username || '')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username || '')}">å¤åˆ¶</button></div><div class="info-box" style="margin-top:15px"><b>â“˜ å…³äºå¯†ç </b><br>ä¸ºäº†å®‰å…¨ï¼Œå¯†ç åªåœ¨è´¦å·åˆ›å»ºæ—¶å±•ç¤ºä¸€æ¬¡ï¼ŒæœåŠ¡å™¨åªä¿å­˜ç»è¿‡åŠ å¯†å¤„ç†çš„å¯†ç æ‘˜è¦ï¼Œæ— æ³•å†æ˜¾ç¤ºåŸå¯†ç ã€‚</div></div><div class="card account-card"><h3 class="card-title">æ•°æ®ä¸å®‰å…¨</h3><p class="card-sub">æ‰€æœ‰è€ƒè¯•ä¸æˆç»©éƒ½ä¿å­˜åœ¨ Supabase ä¸­ï¼Œå¹¶æŒ‰è´¦å·éš”ç¦»ã€‚</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">é€€å‡ºç™»å½•</button></div></div></div>`;
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
      toast('å·²å¤åˆ¶');
    } catch (e) {
      toast('å¤åˆ¶å¤±è´¥ï¼Œè¯·æ‰‹åŠ¨é€‰æ‹©');
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
      toast('æœ€å¤šå åŠ  4 æ¬¡è€ƒè¯•');
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
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? 'ç¼–è¾‘è€ƒè¯•' : 'è®°å½•ä¸€æ¬¡è€ƒè¯•'}</h3><button class="close-btn" aria-label="å…³é—­">Ã—</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>è€ƒè¯•åç§°</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="ä¾‹å¦‚ï¼šé«˜äºŒä¸Šå­¦æœŸæœŸä¸­è€ƒè¯•"></div><div class="field"><label>è€ƒè¯•æ—¥æœŸ</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div><div class="score-table"><div class="score-row header"><span>ç§‘ç›®</span><span>ç›®æ ‡æˆç»©</span><span>çœŸå®æˆç»©</span><span>æ»¡åˆ†</span></div>${SUBJECTS.map((s) => `<div class="score-row" data-score-row="${s}"><span class="subject-name">${s}</span><input inputmode="decimal" class="target-input" placeholder="ç›®æ ‡" value="${scores[s]?.target ?? ''}"><input inputmode="decimal" class="actual-input" placeholder="è€ƒåè¡¥å½•" value="${scores[s]?.actual ?? ''}"><input inputmode="decimal" class="max-input" value="${scores[s]?.max ?? defaultMax(s)}"></div>`).join('')}</div><p class="form-note">è¯­æ–‡ã€æ•°å­¦ã€è‹±è¯­é»˜è®¤æ»¡åˆ† 150ï¼Œå…¶ä½™ç§‘ç›®é»˜è®¤æ»¡åˆ† 100ã€‚å¯ä»¥å…ˆåªå¡«å†™ç›®æ ‡æˆç»©ï¼Œè€ƒå®Œå†å›æ¥è¡¥å½•çœŸå®æˆç»©ã€‚æœªå¡«å†™çš„ç§‘ç›®ä¸ä¼šè®¡å…¥æ€»åˆ†ã€‚</p><div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary save-btn">${editing ? 'ä¿å­˜ä¿®æ”¹' : 'ä¿å­˜è€ƒè¯•'}</button></div></div></div>`;
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
    if (max <= 0) return `${subject} çš„æ»¡åˆ†å¿…é¡»å¤§äº 0`;
    if (target !== null && target > max) return `${subject} çš„ç›®æ ‡æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${subject} çš„çœŸå®æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;
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
    toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');
    return;
  }
  const error = validateExam(exam);
  if (error) {
    toast(error);
    return;
  }
  btn.disabled = true;
  btn.textContent = 'ä¿å­˜ä¸­â€¦';
  try {
    await api('save_exam', { exam });
    await loadExams();
    modal.remove();
    state.modal = null;
    render();
    toast(id ? 'å·²ä¿å­˜ä¿®æ”¹' : 'è€ƒè¯•å·²è®°å½•');
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = id ? 'ä¿å­˜ä¿®æ”¹' : 'ä¿å­˜è€ƒè¯•';
  }
}

async function deleteExam(id) {
  const exam = state.exams.find((e) => e.id === id);
  if (!confirm(`ç¡®å®šåˆ é™¤ã€Œ${exam?.name || 'è¿™æ¬¡è€ƒè¯•'}ã€ï¼Ÿ`)) return;
  try {
    await api('delete_exam', { examId: id });
    await loadExams();
    render();
    toast('å·²åˆ é™¤');
  } catch (e) {
    toast(e.message);
  }
}

function showOnboarding() {
  const d = state.onboarding;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal onboard"><div class="big-icon">âœ“</div><h2>è´¦å·å·²ç»å‡†å¤‡å¥½äº†</h2><p>ä»¥åæ¢æ‰‹æœºæˆ–æ¸…é™¤æµè§ˆå™¨æ•°æ®æ—¶ï¼Œå¯ä»¥ç”¨ä¸‹é¢çš„ç”¨æˆ·åå’Œå¯†ç é‡æ–°ç™»å½•ã€‚</p><div class="credential"><small>ç”¨æˆ·å</small><div class="credential-row"><code>${escapeHtml(d.username)}</code><button class="copy-btn" data-copy="${escapeHtml(d.username)}">å¤åˆ¶</button></div></div><div class="credential"><small>å¯†ç </small><div class="credential-row"><code>${escapeHtml(d.password)}</code><button class="copy-btn" data-copy="${escapeHtml(d.password)}">å¤åˆ¶</button></div></div><div class="save-warning"><span class="i">i</span><div><b>è¯·ç°åœ¨æˆªå›¾ä¿å­˜ã€‚</b><br>ä¸ºäº†å®‰å…¨ï¼Œå¯†ç å…³é—­æ­¤çª—å£åå°†ä¸ä¼šå†æ¬¡æ˜¾ç¤ºï¼Œæˆ‘ä»¬ä¹Ÿæ— æ³•ä»æœåŠ¡å™¨å–å›åŸå¯†ç ã€‚</div></div><button class="primary full" id="savedBtn">æˆ‘å·²æˆªå›¾ä¿å­˜ï¼Œå¼€å§‹è®°å½•</button></div>`;
  document.body.appendChild(modal);
  $$('[data-copy]', modal).forEach((b) => b.onclick = async () => {
    await navigator.clipboard.writeText(b.dataset.copy);
    toast('å·²å¤åˆ¶');
  });
  $('#savedBtn', modal).onclick = () => {
    state.onboarding = null;
    modal.remove();
  };
}

function renderLogin(error = '') {
  $('#app').innerHTML = `<div class="auth-page"><div class="card auth-card"><div class="logo">â†—</div><h2>æ¬¢è¿ä½¿ç”¨æˆç»©è½¨è¿¹</h2><p>å…ˆç™»å½•å·²æœ‰è´¦å·ï¼›å¦‚æœä½ æ˜¯ç¬¬ä¸€æ¬¡ä½¿ç”¨ï¼Œå¯ä»¥ç›´æ¥æ³¨å†Œä¸€ä¸ªæ–°è´¦å·ï¼Œç³»ç»Ÿä¼šè‡ªåŠ¨ç”Ÿæˆç”¨æˆ·åå’Œåˆå§‹å¯†ç ï¼Œå¹¶æé†’ä½ æˆªå›¾ä¿å­˜ã€‚</p>${error ? `<div class="info-box" style="margin-bottom:15px">${escapeHtml(error)}</div>` : ''}<div class="field"><label>ç”¨æˆ·å</label><input id="loginUser" autocomplete="username" placeholder="ä¾‹å¦‚ bright-panda-4821"></div><div class="field"><label>å¯†ç </label><input id="loginPass" type="password" autocomplete="current-password" placeholder="å¯†ç "></div><div class="auth-actions"><button class="primary" id="loginBtn">ç™»å½•</button><button class="secondary" id="newAccountBtn">æ³¨å†Œæ–°è´¦å·</button></div><div class="auth-help">æ”¯æŒè®°å½•è¯­æ•°è‹±ç‰©åŒ–ç”Ÿå²åœ°æ”¿ 9 ç§‘æˆç»©ï¼Œè‡ªåŠ¨ç”Ÿæˆè¶‹åŠ¿å›¾ä¸é›·è¾¾å›¾ã€‚</div></div></div>`;
  $('#loginBtn').onclick = login;
  $('#newAccountBtn').onclick = () => startRegister();
  $('#loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
}

async function login() {
  const btn = $('#loginBtn');
  document.getElementById('requestErrorDetails')?.remove();
  btn.disabled = true;
  btn.textContent = 'ç™»å½•ä¸­â€¦';
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
      const result = await response.json().catch(() => ({ error: 'ç½‘ç»œå“åº”å¼‚å¸¸' }));
      if (!response.ok || !result.token) {
        throw window.__scoreTrackerResponseError ? window.__scoreTrackerResponseError(response, result, 'login_v2') : new Error(result.error || 'ç™»å½•å¤±è´¥');
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
    if (btn.isConnected) { btn.disabled = false; btn.textContent = 'ç™»å½•'; }
  }
}

async function logout() {
  if (!confirm('ç¡®å®šé€€å‡ºç™»å½•ï¼Ÿè¯·ç¡®è®¤ä½ å·²ç»ä¿å­˜å¥½ç”¨æˆ·åå’Œå¯†ç ã€‚')) return;
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
    { label: 'æ€»åˆ†', color: OVERVIEW_COLORS_V4[0], getValue: (exam) => totalRate(exam, 'actual') },
    ...subjectList.map((subject, index) => ({
      label: subject,
      color: OVERVIEW_COLORS_V4[(index + 1) % OVERVIEW_COLORS_V4.length],
      getValue: (exam) => scoreRate(exam, subject, 'actual')
    }))
  ];
}

function overviewCardHtml() {
  const series = overviewSeriesV4();
  return `<div class="card overview-card"><div class="card-title-row"><div><h3 class="card-title">æ€»è§ˆè¶‹åŠ¿å›¾</h3><p class="card-sub">æŠŠæ€»åˆ†å’Œå„ç§‘æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œç»Ÿä¸€è§‚å¯Ÿã€‚ä¸ºä¾¿äºæ¯”è¾ƒï¼Œè¿™é‡ŒæŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼›æ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¸ä¼šæ˜¾ç¤ºã€‚</p></div></div><div class="overview-wrap" id="overviewChart">${overviewChartHtmlV4(series)}</div>${overviewLegendHtmlV4(series)}</div>`;
}

function overviewLegendHtmlV4(series) {
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!visible.length) return '';
  return `<div class="overview-legend">${visible.map((item) => `<span class="overview-pill"><i style="background:${item.color}"></i>${item.label}</span>`).join('')}</div>`;
}

function overviewChartHtmlV4(series) {
  if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è®°å½•è€ƒè¯•åï¼Œè¿™é‡Œä¼šè‡ªåŠ¨æ±‡æ€»æ€»åˆ†å’Œå„ç§‘è¶‹åŠ¿</div></div>`;
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è¿˜æ²¡æœ‰å¯ç”¨äºæ€»è§ˆå›¾çš„çœŸå®æˆç»©</div></div>`;

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
      circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} Â· ${seriesItem.label} ${formatPercent(value)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div>`;
}

radarCardHtml = function radarCardHtmlV4() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">å…¨éƒ¨ç§‘ç›®é›·è¾¾å›¾</h3><p class="card-sub">æŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼Œæ”¯æŒå åŠ å¤šæ¬¡è€ƒè¯•ï¼›æ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—ï¼Œ6 ç§‘å°±æ˜¾ç¤ºå…­è¾¹å½¢ã€‚</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">æŸ¥çœ‹å†…å®¹</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">çœŸå®æˆç»©</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">ç›®æ ‡æˆç»©</button></div><div><div class="subtle-note">æœ€å¤šå¯å åŠ  4 æ¬¡è€ƒè¯•ã€‚å åŠ å¯¹æ¯”æ—¶ï¼Œä¼šè‡ªåŠ¨åªæ˜¾ç¤ºè¿™äº›è€ƒè¯•å…±åŒæ‹¥æœ‰æ•°æ®çš„ç§‘ç›®ï¼Œé¿å…ç©ºè½´å¹²æ‰°åˆ¤æ–­ã€‚</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} Â· ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">å½“å‰è¿˜æ²¡æœ‰å¯ç”¨äºé›·è¾¾å›¾çš„æ•°æ®</span>'}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV4(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>é€‰æ‹© 1 æ¬¡æˆ–å¤šæ¬¡è€ƒè¯•åï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºå…¨éƒ¨ç§‘ç›®çš„ç»“æ„å˜åŒ–</div></div>`;
  const subjects = subjectsWithDataV4(selected, state.radarMode, 'all');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒçš„ç§‘ç›®æ•°æ®ï¼Œæš‚æ—¶æ— æ³•å åŠ æ¯”è¾ƒ</div></div>`;

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
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>å½“å‰è–„å¼±ç§‘ç›®</h4><div class="subtle-note">æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒç§‘ç›®ï¼Œæš‚æ—¶æ— æ³•è®¡ç®—ç»“æ„å˜åŒ–ã€‚</div></div><div class="summary-card"><h4>å¯¹æ¯”è¯´æ˜</h4><div class="subtle-note">è¯·æ”¹ä¸ºé€‰æ‹©æ•°æ®èŒƒå›´æ›´æ¥è¿‘çš„å‡ æ¬¡è€ƒè¯•ï¼Œæˆ–è€…åªæŸ¥çœ‹å•æ¬¡è€ƒè¯•é›·è¾¾å›¾ã€‚</div></div></div>`;

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

  return `<div class="radar-summary"><div class="summary-card"><h4>å½“å‰è–„å¼±ç§‘ç›®</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${item.subject}</b></span><span>${formatPercent(item.rate)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? 'å¯¹æ¯”å˜åŒ–' : 'æœ¬æ¬¡æ¦‚å†µ'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>å½“å‰å¯¹æ¯”ï¼š<span class="comparison-strong">${escapeHtml(earliest.name)}</span> â†’ <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>å‚ä¸å¯¹æ¯”ç§‘ç›®ï¼š<span class="comparison-strong">${subjects.map((subject) => SUBJECT_SHORT[subject]).join(' / ')}</span></div><div>æ•´ä½“å¹³å‡å¾—åˆ†ç‡ï¼š<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div>è¿›æ­¥æœ€å¤§ï¼š${best ? `<span class="comparison-positive">${best.subject} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta)}</span>` : 'â€”'}</div><div>éœ€è¦å…³æ³¨ï¼š${worst ? `<span class="comparison-negative">${worst.subject} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta)}</span>` : 'â€”'}</div></div>` : `<div class="comparison-grid"><div>å·²é€‰æ‹©ï¼š<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>å‚ä¸ç§‘ç›®ï¼š<span class="comparison-strong">${subjects.map((subject) => SUBJECT_SHORT[subject]).join(' / ')}</span></div><div>å¹³å‡å¾—åˆ†ç‡ï¼š<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div class="subtle-note">å†å¤šé€‰å‡ æ¬¡è€ƒè¯•ï¼Œå°±å¯ä»¥ç›´æ¥çœ‹åˆ°å¼±é¡¹æ”¹å–„äº†å¤šå°‘ã€‚</div></div>`}</div></div>`;
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
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">âŒ</div>è®°å½•è€ƒè¯•åï¼Œè¿™é‡Œä¼šè‡ªåŠ¨æ±‡æ€»æ€»åˆ†å’Œå„ç§‘è¶‹åŠ¿</div></div>`;
  }
  if (!visible.length) {
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">âŒ</div>è¿˜æ²¡æœ‰å¯ç”¨äºæ€»è§ˆçš„çœŸå®æˆç»©</div></div>`;
  }
  return `<div class="overview-stage-v5">${overviewChartHtmlV4(series)}</div>${overviewLegendHtmlV4(series)}`;
}

chartHtml = function chartHtmlV5() {
  if (state.subject === 'æ€»è§ˆ') return overviewTrendHtmlV5();
  return chartHtmlBeforeV5();
};

homeHtml = function homeHtmlV5() {
  let html = homeHtmlV3();
  const overviewButton = `<button class="chip ${state.subject === 'æ€»è§ˆ' ? 'active' : ''}" data-subject="æ€»è§ˆ">æ€»è§ˆ</button>`;
  html = html.replace('<div class="chips">', `<div class="chips">${overviewButton}`);

  if (state.subject === 'æ€»è§ˆ') {
    html = html.replace(
      '<p class="card-sub">çœŸå®æˆç»©ä¸ç›®æ ‡æˆç»©æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œ</p>',
      '<p class="card-sub">æ€»åˆ†ä¸å„ç§‘æŒ‰å¾—åˆ†ç‡å åŠ å±•ç¤ºï¼Œæ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—</p>'
    );
    html = html.replace(
      '<div class="legend"><span><i class="actual"></i>çœŸå®æˆç»©</span><span><i class="target"></i>ç›®æ ‡æˆç»©</span></div>',
      '<div class="subtle-note">çœŸå®æˆç»© Â· å¾—åˆ†ç‡</div>'
    );
    html = html.replace(
      '<div class="chart-wrap" id="chart">',
      '<div class="chart-wrap overview-mode-v5" id="chart">'
    );
  }
  return html;
};

function bindOverviewTrendTooltipV5() {
  if (state.subject !== 'æ€»è§ˆ') return;
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
    if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è®°å½•è€ƒè¯•åï¼Œè¿™é‡Œä¼šè‡ªåŠ¨æ±‡æ€»æ€»åˆ†å’Œå„ç§‘è¶‹åŠ¿</div></div>`;
    const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
    if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è¿˜æ²¡æœ‰å¯ç”¨äºæ€»è§ˆå›¾çš„çœŸå®æˆç»©</div></div>`;

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
        circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} Â· ${seriesItem.label} ${formatPercent(value)}"/>`;
      });
      return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    }).join('');
    const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div><div class="axis-caption-v6">çºµè½´å·²æŒ‰å½“å‰æ•°æ®åŠ¨æ€ç¼©æ”¾ï¼ˆ${axis.min}% - ${axis.max}%ï¼‰</div>`;
  };
}

if (typeof radarChartHtml === 'function') {
  radarCardHtml = function radarCardHtmlV6() {
    const available = radarAvailableExams();
    const selected = selectedRadarExams();
    return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">å…¨éƒ¨ç§‘ç›®é›·è¾¾å›¾</h3><p class="card-sub">æŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼Œæ”¯æŒå åŠ å¤šæ¬¡è€ƒè¯•ï¼›æ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—ï¼Œ6 ç§‘å°±æ˜¾ç¤ºå…­è¾¹å½¢ã€‚</p></div></div>
      <div class="radar-toolbar"><div class="toggle-row"><span class="label">æŸ¥çœ‹å†…å®¹</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">çœŸå®æˆç»©</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">ç›®æ ‡æˆç»©</button></div><div><div class="subtle-note">æœ€å¤šå¯å åŠ  4 æ¬¡è€ƒè¯•ã€‚å åŠ å¯¹æ¯”æ—¶ï¼Œä¼šè‡ªåŠ¨åªæ˜¾ç¤ºè¿™äº›è€ƒè¯•å…±åŒæ‹¥æœ‰æ•°æ®çš„ç§‘ç›®ï¼›çºµè½´ä¼šæŒ‰å½“å‰é€‰ä¸­çš„æ•°æ®åŠ¨æ€ç¼©æ”¾ï¼Œå·®å¼‚æ›´æ¸…æ¥šã€‚</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} Â· ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">å½“å‰è¿˜æ²¡æœ‰å¯ç”¨äºé›·è¾¾å›¾çš„æ•°æ®</span>'}</div></div></div>
      <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
  };

  radarChartHtml = function radarChartHtmlDynamicV6(selected) {
    if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>é€‰æ‹© 1 æ¬¡æˆ–å¤šæ¬¡è€ƒè¯•åï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºå…¨éƒ¨ç§‘ç›®çš„ç»“æ„å˜åŒ–</div></div>`;
    const subjects = (typeof subjectsWithDataV4 === 'function' ? subjectsWithDataV4(selected, state.radarMode, 'all') : SUBJECTS.filter((subject) => selected.every((exam) => scoreRate(exam, subject, state.radarMode) !== null)));
    if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒçš„ç§‘ç›®æ•°æ®ï¼Œæš‚æ—¶æ— æ³•å åŠ æ¯”è¾ƒ</div></div>`;

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
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">çºµè½´å·²æŒ‰å½“å‰æ•°æ®åŠ¨æ€ç¼©æ”¾ï¼ˆ${axis.min}% - ${axis.max}%ï¼‰</div>`;
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
  const data = await res.json().catch(() => ({ error: 'ç½‘ç»œå“åº”å¼‚å¸¸' }));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('st_token');
      state.token = '';
      state.user = null;
      renderLogin();
    }
    throw window.__scoreTrackerResponseError ? window.__scoreTrackerResponseError(res, data, action) : new Error(data.error || 'è¯·æ±‚å¤±è´¥');
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
  if (!['æ€»è§ˆ', 'æ€»åˆ†', ...SUBJECTS].includes(state.subject)) state.subject = 'æ€»åˆ†';
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
  if (subject === 'æ€»åˆ†') {
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
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">âŒ</div>è®°å½•æ’ååï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºæ’åè¶‹åŠ¿</div></div>`;

  const colors = rankSeriesColorsV7();
  const series = state.subject === 'æ€»è§ˆ'
    ? ['æ€»åˆ†', ...SUBJECTS].map((subject, index) => ({ subject, color: colors[index % colors.length] }))
    : [{ subject: state.subject, color: '#5d72e8' }];
  const visible = series.filter((item) => state.exams.some((exam) => rankInfoV7(exam, item.subject).performance !== null));
  if (!visible.length) {
    const hasRawRank = series.some((item) => state.exams.some((exam) => rankInfoV7(exam, item.subject).rank !== null));
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">â†•</div>${hasRawRank ? 'å·²ç»å½•å…¥åæ¬¡ï¼Œä½†è¿˜ç¼ºå‚è€ƒäººæ•°ã€‚è¡¥å……å‚è€ƒäººæ•°åæ‰èƒ½è¿›è¡Œå¯æ¯”çš„æ’åè¶‹åŠ¿åˆ†æã€‚' : 'è¿™ä¸ªç§‘ç›®è¿˜æ²¡æœ‰æ’åæ•°æ®'}</div></div>`;
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
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} Â· ${item.subject} ç¬¬${raw}å Â· æ’åè¡¨ç° ${formatPercent(info.performance)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === 'æ€»è§ˆ' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
  const legend = state.subject === 'æ€»è§ˆ'
    ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>`
    : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="rank-method-v7"><b>æ’åè¡¨ç°</b> = æŒ‰å‚è€ƒäººæ•°æ ‡å‡†åŒ–åçš„è¶…è¶Šç‡ï¼›è¶Šé«˜è¶Šå¥½ã€‚è¿™æ ·ä¸åŒè€ƒè¯•å‚è€ƒäººæ•°å˜åŒ–æ—¶ï¼Œæ¯”ç›´æ¥æ¯”è¾ƒâ€œç¬¬å‡ åâ€æ›´å…¬å¹³ã€‚</div>`;
}

const chartHtmlBeforeV7 = chartHtml;
chartHtml = function chartHtmlV7() {
  if (state.trendMetric === 'rank') return rankChartHtmlV7();
  return chartHtmlBeforeV7();
};

const homeHtmlBeforeV7 = homeHtml;
homeHtml = function homeHtmlV7() {
  let html = homeHtmlBeforeV7();
  html = html.replace('è®°å½•è¯­æ•°è‹±ç‰©åŒ–ç”Ÿå²åœ°æ”¿ 9 ç§‘çš„ç›®æ ‡ä¸çœŸå®æˆç»©ï¼ŒæŠ˜çº¿å›¾çœ‹æ€»è¶‹åŠ¿ï¼Œé›·è¾¾å›¾çœ‹ç»“æ„å˜åŒ–ï¼Œæ›´å®¹æ˜“æ‰¾åˆ°å¼±é¡¹å¹¶è¿½è¸ªæ”¹å–„ã€‚', 'ç§‘ç›®å¯ä»¥è‡ªç”±è®¾ç½®ï¼šæ—¢èƒ½è®°å½•å­¦æ ¡å­¦ç§‘ï¼Œä¹Ÿèƒ½æ‹†æˆé¢˜å‹ã€æ¨¡å—æˆ–å¤‡è€ƒé¡¹ç›®ï¼›æˆç»©ã€æ’åå’Œé›·è¾¾å›¾ä¸€èµ·çœ‹ï¼Œæ›´å®¹æ˜“æ‰¾åˆ°çœŸæ­£çš„è–„å¼±ç‚¹ã€‚');
  const metricToggle = `<div class="trend-metric-toggle-v7"><span class="label">è¶‹åŠ¿ç±»å‹</span><button class="metric-btn-v7 ${state.trendMetric === 'score' ? 'active' : ''}" data-trend-metric="score">æˆç»©</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">æ’å</button></div>`;
  html = html.replace('<div class="chips">', `${metricToggle}<div class="chips">`);

  if (state.trendMetric === 'rank') {
    html = html.replace('<h3 class="card-title">æˆç»©è¶‹åŠ¿</h3>', '<h3 class="card-title">æ’åè¶‹åŠ¿</h3>');
    html = html.replace('<p class="card-sub">çœŸå®æˆç»©ä¸ç›®æ ‡æˆç»©æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œ</p>', '<p class="card-sub">ç”¨å‚è€ƒäººæ•°æŠŠåæ¬¡è½¬æ¢æˆå¯æ¯”è¾ƒçš„â€œæ’åè¡¨ç°â€ï¼Œé¿å…è€ƒè¯•éš¾åº¦å’Œäººæ•°å˜åŒ–å¹²æ‰°åˆ¤æ–­</p>');
    html = html.replace('<p class="card-sub">æ€»åˆ†ä¸å„ç§‘æŒ‰å¾—åˆ†ç‡å åŠ å±•ç¤ºï¼Œæ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—</p>', '<p class="card-sub">æ€»åˆ†ä¸å„ç§‘æ’åç»Ÿä¸€æ¢ç®—ä¸ºæ’åè¡¨ç°ï¼›å‚è€ƒäººæ•°ä¸åŒä¹Ÿèƒ½æ”¾åœ¨ä¸€èµ·æ¯”è¾ƒ</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>çœŸå®æˆç»©</span><span><i class="target"></i>ç›®æ ‡æˆç»©</span></div>', '<div class="subtle-note">è¶Šé«˜è¶Šå¥½ Â· åŸå§‹åæ¬¡ä¼šæ˜¾ç¤ºåœ¨æ•°æ®ç‚¹æç¤ºé‡Œ</div>');
    html = html.replace('<div class="subtle-note">çœŸå®æˆç»© Â· å¾—åˆ†ç‡</div>', '<div class="subtle-note">æ’åè¡¨ç° Â· æ ‡å‡†åŒ–è¶…è¶Šç‡</div>');
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
  return `${base}<div class="card subject-settings-v7"><div class="subject-settings-head-v7"><div><h3 class="card-title">ç§‘ç›®è®¾ç½®</h3><p class="card-sub">å¯ä»¥æŠŠâ€œç§‘ç›®â€æ”¹é€ æˆå­¦ç§‘ã€é¢˜å‹ã€æ¨¡å—æˆ–å¤‡è€ƒé¡¹ç›®ã€‚æ¯”å¦‚ï¼šé˜…è¯»ç†è§£ã€å®Œå½¢å¡«ç©ºã€ç¿»è¯‘ã€å†™ä½œã€‚</p></div><button class="secondary" id="manageSubjectsBtn">ç®¡ç†ç§‘ç›®</button></div><div class="subject-chip-list-v7">${subjects.map((item) => `<span class="subject-chip-v7"><b>${escapeHtml(item.name)}</b> Â· æ»¡åˆ† ${formatScore(item.defaultMax)}</span>`).join('')}</div><div class="subtle-note" style="margin-top:12px">ç§»é™¤ç§‘ç›®ä¸ä¼šåˆ é™¤å†å²æˆç»©ï¼›ä»¥åé‡æ–°æ·»åŠ åŒåç§‘ç›®ï¼Œå†å²æ•°æ®ä¼šé‡æ–°æ˜¾ç¤ºã€‚</div></div>`;
};

function openSubjectManagerV7() {
  const subjects = (state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })))
    .map((item) => ({ ...item }));
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>ç®¡ç†ç§‘ç›®</h3><button class="close-btn" aria-label="å…³é—­">Ã—</button></div><div class="modal-body"><div class="info-box"><b>å¯ä»¥è‡ªå®šä¹‰ã€‚</b> ç§‘ç›®ä¸ä¸€å®šæ˜¯å­¦æ ¡å­¦ç§‘ï¼Œä¹Ÿå¯ä»¥æ˜¯â€œé˜…è¯»ç†è§£ã€å†™ä½œã€é€»è¾‘ã€æ•°é‡å…³ç³»â€ç­‰ä½ æƒ³é•¿æœŸè¿½è¸ªçš„æ¨¡å—ã€‚æœ€å¤š 20 ä¸ªã€‚</div><div class="subject-config-list-v7" id="subjectConfigList"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addSubjectRowV7">ï¼‹ æ·»åŠ ç§‘ç›®</button><div><button class="secondary cancel-btn">å–æ¶ˆ</button> <button class="primary" id="saveSubjectsV7">ä¿å­˜è®¾ç½®</button></div></div><p class="form-note">ä¿®æ”¹å·²æœ‰ç§‘ç›®åç§°ä¼šè¢«è§†ä¸ºæ–°çš„ç§‘ç›®ï¼›åŸåç§°çš„å†å²æˆç»©ä»ä¿ç•™åœ¨äº‘ç«¯ï¼Œåªæ˜¯æš‚æ—¶éšè—ã€‚</p></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;

  const list = $('#subjectConfigList', modal);
  const rowHtml = (item = { name: '', defaultMax: 100 }) => `<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="${escapeHtml(item.name || '')}" placeholder="ç§‘ç›®/é¢˜å‹åç§°"><input class="subject-max-input-v7" inputmode="decimal" value="${item.defaultMax ?? 100}" placeholder="é»˜è®¤æ»¡åˆ†"><button class="remove-subject-v7" type="button" title="ç§»é™¤">Ã—</button></div>`;
  const renderRows = () => {
    list.innerHTML = subjects.map((item) => rowHtml(item)).join('');
    $$('.remove-subject-v7', list).forEach((button, index) => button.onclick = () => {
      if (subjects.length <= 1) return toast('è‡³å°‘ä¿ç•™ 1 ä¸ªç§‘ç›®');
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
    if (subjects.length >= 20) return toast('æœ€å¤šè®¾ç½® 20 ä¸ªç§‘ç›®');
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
    if (payload.some((item) => !item.name)) return toast('è¯·å¡«å†™å®Œæ•´çš„ç§‘ç›®åç§°');
    if (new Set(payload.map((item) => item.name)).size !== payload.length) return toast('ç§‘ç›®åç§°ä¸èƒ½é‡å¤');
    if (payload.some((item) => !Number(item.defaultMax) || Number(item.defaultMax) <= 0)) return toast('é»˜è®¤æ»¡åˆ†å¿…é¡»å¤§äº 0');
    const button = $('#saveSubjectsV7', modal);
    button.disabled = true;
    button.textContent = 'ä¿å­˜ä¸­â€¦';
    try {
      const data = await dataApiV7('save_subjects', { subjects: payload });
      applySubjectConfigsV7(data.subjects || []);
      close();
      render();
      toast('ç§‘ç›®è®¾ç½®å·²ä¿å­˜');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      button.textContent = 'ä¿å­˜è®¾ç½®';
    }
  };
}

openExam = function openExamV7(exam = null) {
  const editing = !!exam;
  const today = new Date().toISOString().slice(0, 10);
  const scores = exam?.scores || {};
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? 'ç¼–è¾‘è€ƒè¯•' : 'è®°å½•ä¸€æ¬¡è€ƒè¯•'}</h3><button class="close-btn" aria-label="å…³é—­">Ã—</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>è€ƒè¯•åç§°</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="ä¾‹å¦‚ï¼šæœŸä¸­è€ƒè¯• / 2023 è‹±è¯­çœŸé¢˜"></div><div class="field"><label>è€ƒè¯•æ—¥æœŸ</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div>
    <div class="section-head-v7"><div><h4>æˆç»©</h4><p>å¯ä»¥åªå½•ç›®æ ‡ã€åªå½•çœŸå®æˆç»©ï¼Œæˆ–è€…ä¸¤è€…éƒ½å½•ã€‚</p></div></div>
    <div class="score-table"><div class="score-row header"><span>ç§‘ç›®</span><span>ç›®æ ‡æˆç»©</span><span>çœŸå®æˆç»©</span><span>æ»¡åˆ†</span></div>${SUBJECTS.map((subject) => `<div class="score-row" data-score-row="${escapeHtml(subject)}"><span class="subject-name">${escapeHtml(subject)}</span><input inputmode="decimal" class="target-input" placeholder="ç›®æ ‡" value="${scores[subject]?.target ?? ''}"><input inputmode="decimal" class="actual-input" placeholder="è€ƒåè¡¥å½•" value="${scores[subject]?.actual ?? ''}"><input inputmode="decimal" class="max-input" value="${scores[subject]?.max ?? defaultMax(subject)}"></div>`).join('')}</div>
    <div class="section-head-v7"><div><h4>æ’åï¼ˆå¯é€‰ï¼‰</h4><p>å»ºè®®åŒæ—¶å¡«å†™å‚è€ƒäººæ•°ã€‚å„ç§‘å‚è€ƒäººæ•°ç•™ç©ºæ—¶ï¼Œä¼šè‡ªåŠ¨ä½¿ç”¨â€œæ€»åˆ†â€çš„å‚è€ƒäººæ•°ã€‚</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>ç§‘ç›®</span><span>åæ¬¡</span><span>å‚è€ƒäººæ•°</span></div><div class="rank-row-v7 total"><span class="subject-name">æ€»åˆ†</span><input id="totalRankV7" inputmode="numeric" pattern="[0-9]*" placeholder="ä¾‹å¦‚ 36" value="${exam?.total_rank ?? ''}"><input id="totalParticipantsV7" inputmode="numeric" pattern="[0-9]*" placeholder="ä¾‹å¦‚ 620" value="${exam?.total_participants ?? ''}"></div>${SUBJECTS.map((subject) => `<div class="rank-row-v7" data-rank-row="${escapeHtml(subject)}"><span class="subject-name">${escapeHtml(subject)}</span><input class="rank-input-v7" inputmode="numeric" pattern="[0-9]*" placeholder="åæ¬¡" value="${scores[subject]?.rank ?? ''}"><input class="participants-input-v7" inputmode="numeric" pattern="[0-9]*" placeholder="åŒæ€»äººæ•°" value="${scores[subject]?.participants ?? ''}"></div>`).join('')}</div>
    <div class="rank-science-box-v7"><b>ä¸ºä»€ä¹ˆè¦å¡«å‚è€ƒäººæ•°ï¼Ÿ</b> å•çœ‹â€œç¬¬ 30 åâ€æ— æ³•åˆ¤æ–­æ˜¯åœ¨ 100 äººé‡Œè¿˜æ˜¯ 1000 äººé‡Œã€‚è¶‹åŠ¿å›¾ä¼šæŠŠåæ¬¡æ¢ç®—æˆæ ‡å‡†åŒ–çš„â€œæ’åè¡¨ç°ï¼ˆè¶…è¶Šç‡ï¼‰â€ï¼šç¬¬ 1 åæ¥è¿‘ 100%ï¼Œè¶Šé«˜è¶Šå¥½ï¼Œå› æ­¤ä¸åŒè€ƒè¯•éš¾åº¦ã€ä¸åŒå‚è€ƒäººæ•°ä¹‹é—´æ›´å¯æ¯”ã€‚</div>
    <p class="form-note">ç§‘ç›®ä¸é»˜è®¤æ»¡åˆ†å¯ä»¥åœ¨ã€Œè´¦å· â†’ ç§‘ç›®è®¾ç½®ã€ä¸­è°ƒæ•´ã€‚æœªå¡«å†™çš„ç§‘ç›®ä¸ä¼šè®¡å…¥æ€»åˆ†ã€‚</p><div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary save-btn">${editing ? 'ä¿å­˜ä¿®æ”¹' : 'ä¿å­˜è€ƒè¯•'}</button></div></div></div>`;
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
  if (totalRank !== null && (!Number.isInteger(totalRank) || totalRank < 1)) return 'æ€»æ’åè¯·è¾“å…¥æ­£æ•´æ•°';
  if (totalParticipants !== null && (!Number.isInteger(totalParticipants) || totalParticipants < 1)) return 'å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°';
  if (totalRank !== null && totalParticipants !== null && totalRank > totalParticipants) return 'æ€»æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°';

  for (const subject of SUBJECTS) {
    const row = exam.scores[subject] || {};
    const max = num(row.max) ?? defaultMax(subject);
    const target = num(row.target);
    const actual = num(row.actual);
    const rank = num(row.rank);
    const participants = num(row.participants);
    const effectiveParticipants = participants ?? totalParticipants;
    if (max <= 0) return `${subject} çš„æ»¡åˆ†å¿…é¡»å¤§äº 0`;
    if (target !== null && target > max) return `${subject} çš„ç›®æ ‡æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${subject} çš„çœŸå®æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) return `${subject}æ’åè¯·è¾“å…¥æ­£æ•´æ•°`;
    if (participants !== null && (!Number.isInteger(participants) || participants < 1)) return `${subject}å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°`;
    if (rank !== null && effectiveParticipants !== null && rank > effectiveParticipants) return `${subject}æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°`;
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
  if (!exam.name || !exam.exam_date) return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');
  const error = validateExam(exam);
  if (error) return toast(error);

  btn.disabled = true;
  btn.textContent = 'ä¿å­˜ä¸­â€¦';
  try {
    await dataApiV7('save_exam', { exam });
    await loadExams();
    modal.remove();
    state.modal = null;
    render();
    toast(id ? 'å·²ä¿å­˜ä¿®æ”¹' : 'è€ƒè¯•å·²è®°å½•');
  } catch (error) {
    toast(error.message);
    btn.disabled = false;
    btn.textContent = id ? 'ä¿å­˜ä¿®æ”¹' : 'ä¿å­˜è€ƒè¯•';
  }
};

const recordHtmlBeforeV7 = recordHtml;
recordHtml = function recordHtmlV7(exam) {
  let html = recordHtmlBeforeV7(exam);
  const info = rankInfoV7(exam, 'æ€»åˆ†');
  if (info.rank !== null) {
    const badge = `<span class="score-tag"><b>æ€»æ’å ${info.rank}${info.participants ? ` / ${info.participants}` : ''}</b>${info.performance !== null ? ` Â· æ’åè¡¨ç° ${formatPercent(info.performance)}` : ''}</span>`;
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
  if (help) help.textContent = 'æ”¯æŒè‡ªå®šä¹‰ç§‘ç›®ã€ç›®æ ‡/çœŸå®æˆç»©ã€æ’åè¶‹åŠ¿ä¸å¤šæ¬¡è€ƒè¯•é›·è¾¾å¯¹æ¯”ã€‚';
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
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>ç®¡ç†ç§‘ç›®</h3><button class="close-btn" aria-label="å…³é—­">Ã—</button></div><div class="modal-body"><div class="info-box"><b>å¯ä»¥è‡ªå®šä¹‰ã€‚</b> ç§‘ç›®ä¸ä¸€å®šæ˜¯å­¦æ ¡å­¦ç§‘ï¼Œä¹Ÿå¯ä»¥æ˜¯â€œé˜…è¯»ç†è§£ã€å†™ä½œã€é€»è¾‘ã€æ•°é‡å…³ç³»â€ç­‰ä½ æƒ³é•¿æœŸè¿½è¸ªçš„æ¨¡å—ã€‚æœ€å¤š 20 ä¸ªã€‚</div><div class="subject-config-list-v7" id="subjectConfigList"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addSubjectRowV7">ï¼‹ æ·»åŠ ç§‘ç›®</button><div><button class="secondary cancel-btn">å–æ¶ˆ</button> <button class="primary" id="saveSubjectsV7">ä¿å­˜è®¾ç½®</button></div></div><p class="form-note">ç§»é™¤ç§‘ç›®ä¸ä¼šåˆ é™¤å†å²æˆç»©ï¼›ä¿®æ”¹åç§°ä¼šè¢«è§†ä¸ºæ–°çš„ç§‘ç›®ï¼ŒåŸåç§°çš„å†å²æˆç»©ä»ä¿ç•™åœ¨äº‘ç«¯ã€‚</p></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;

  const list = $('#subjectConfigList', modal);
  const rowHtml = (item = { name: '', defaultMax: 100 }) => `<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="${escapeHtml(item.name || '')}" placeholder="ç§‘ç›®/é¢˜å‹åç§°"><input class="subject-max-input-v7" inputmode="decimal" value="${item.defaultMax ?? 100}" placeholder="é»˜è®¤æ»¡åˆ†"><button class="remove-subject-v7" type="button" title="ç§»é™¤">Ã—</button></div>`;

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
      if (subjects.length <= 1) return toast('è‡³å°‘ä¿ç•™ 1 ä¸ªç§‘ç›®');
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
    if (subjects.length >= 20) return toast('æœ€å¤šè®¾ç½® 20 ä¸ªç§‘ç›®');
    syncRows();
    subjects.push({ name: '', defaultMax: 100 });
    renderRows();
    $('.subject-config-row-v7:last-child .subject-name-input-v7', list)?.focus();
  };
  $('#saveSubjectsV7', modal).onclick = async () => {
    syncRows();
    const payload = subjects.map((item) => ({ name: String(item.name || '').trim(), defaultMax: item.defaultMax }));
    if (payload.some((item) => !item.name)) return toast('è¯·å¡«å†™å®Œæ•´çš„ç§‘ç›®åç§°');
    if (new Set(payload.map((item) => item.name)).size !== payload.length) return toast('ç§‘ç›®åç§°ä¸èƒ½é‡å¤');
    if (payload.some((item) => !Number(item.defaultMax) || Number(item.defaultMax) <= 0)) return toast('é»˜è®¤æ»¡åˆ†å¿…é¡»å¤§äº 0');
    const button = $('#saveSubjectsV7', modal);
    button.disabled = true;
    button.textContent = 'ä¿å­˜ä¸­â€¦';
    try {
      const data = await dataApiV7('save_subjects', { subjects: payload });
      applySubjectConfigsV7(data.subjects || []);
      close();
      render();
      toast('ç§‘ç›®è®¾ç½®å·²ä¿å­˜');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      button.textContent = 'ä¿å­˜è®¾ç½®';
    }
  };
};

const openExamBeforeV8 = openExam;
openExam = function openExamV8(exam = null) {
  openExamBeforeV8(exam);
  const box = $('.rank-science-box-v7', state.modal || document);
  if (box && !box.dataset.scopeNote) {
    box.dataset.scopeNote = '1';
    box.innerHTML += '<br><b>æ¯”è¾ƒå£å¾„ä¹Ÿè¦ä¸€è‡´ï¼š</b>å»ºè®®é•¿æœŸéƒ½ä½¿ç”¨åŒä¸€ç§æ’åå£å¾„ï¼Œä¾‹å¦‚éƒ½å¡«â€œå¹´çº§æ’åâ€ï¼Œä¸è¦æŠŠç­çº§æ’åå’Œå¹´çº§æ’åæ··åœ¨åŒä¸€æ¡è¶‹åŠ¿é‡Œã€‚';
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
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">å…¨éƒ¨ç§‘ç›®é›·è¾¾å›¾</h3><p class="card-sub">${rankMode ? 'æŒ‰æ’åç™¾åˆ†ä½ç»˜åˆ¶ï¼šè¶Šé å¤–ä»£è¡¨ç›¸å¯¹æ’åè¶Šå¥½ï¼›å¯å åŠ å¤šæ¬¡è€ƒè¯•è§‚å¯Ÿç«äº‰åŠ›å˜åŒ–ã€‚' : 'æŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼Œæ”¯æŒå åŠ å¤šæ¬¡è€ƒè¯•ï¼›æ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—ï¼Œ6 ç§‘å°±æ˜¾ç¤ºå…­è¾¹å½¢ã€‚'}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">æŸ¥çœ‹å†…å®¹</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">çœŸå®æˆç»©</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">ç›®æ ‡æˆç»©</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">æ’åç™¾åˆ†ä½</button></div><div><div class="subtle-note">æœ€å¤šå¯å åŠ  4 æ¬¡è€ƒè¯•ã€‚å åŠ æ—¶åªæ˜¾ç¤ºæ‰€é€‰è€ƒè¯•å…±åŒæ‹¥æœ‰æ•°æ®çš„ç§‘ç›®ï¼›åæ ‡è½´ä¼šæŒ‰å½“å‰æ•°æ®åŠ¨æ€ç¼©æ”¾ã€‚</div>${rankMode ? '<div class="radar-mode-note-v9"><b>æ’åç™¾åˆ†ä½ä¸æ˜¯ç›´æ¥ç”¨â€œç¬¬å‡ åâ€ï¼š</b>ä¼šç»“åˆå‚è€ƒäººæ•°æ ‡å‡†åŒ–ã€‚ç¬¬ 1 åæ¥è¿‘ 100%ï¼Œè¶Šé«˜è¶Šå¥½ï¼›ä¸åŒè€ƒè¯•äººæ•°å˜åŒ–æ—¶ä¹Ÿæ›´å¯æ¯”ã€‚</div>' : ''}<div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} Â· ${fmtDate(exam.exam_date)}</button>`).join('') : `<span class="subtle-note">${rankMode ? 'å½“å‰è¿˜æ²¡æœ‰åŒæ—¶å¡«å†™â€œåæ¬¡ + å‚è€ƒäººæ•°â€çš„ç§‘ç›®æ’åæ•°æ®' : 'å½“å‰è¿˜æ²¡æœ‰å¯ç”¨äºé›·è¾¾å›¾çš„æ•°æ®'}</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV9(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>${state.radarMode === 'rank' ? 'é€‰æ‹©æœ‰æ’åæ•°æ®çš„è€ƒè¯•åï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºå„ç§‘æ’åç™¾åˆ†ä½' : 'é€‰æ‹© 1 æ¬¡æˆ–å¤šæ¬¡è€ƒè¯•åï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºå…¨éƒ¨ç§‘ç›®çš„ç»“æ„å˜åŒ–'}</div></div>`;
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>${state.radarMode === 'rank' ? 'æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒä¸”å®Œæ•´çš„æ’åæ•°æ®ï¼Œè¯·æ£€æŸ¥å„ç§‘åæ¬¡å’Œå‚è€ƒäººæ•°' : 'æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒçš„ç§‘ç›®æ•°æ®ï¼Œæš‚æ—¶æ— æ³•å åŠ æ¯”è¾ƒ'}</div></div>`;

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
      let tip = `${escapeHtml(exam.name)} Â· ${escapeHtml(subject)} ${formatPercent(value)}`;
      if (state.radarMode === 'rank' && typeof rankInfoV7 === 'function') {
        const info = rankInfoV7(exam, subject);
        tip = `${escapeHtml(exam.name)} Â· ${escapeHtml(subject)} ç¬¬${info.rank}/${info.participants}å Â· æ’åç™¾åˆ†ä½ ${formatPercent(value)}`;
      }
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${tip}"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  const label = state.radarMode === 'rank' ? 'æ’åç™¾åˆ†ä½' : 'çºµè½´';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">${label}å·²æŒ‰å½“å‰æ•°æ®åŠ¨æ€ç¼©æ”¾ï¼ˆ${axis.min}% - ${axis.max}%ï¼‰</div>`;
};

radarSummaryHtml = function radarSummaryHtmlV9(selected) {
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>å½“å‰è–„å¼±ç§‘ç›®</h4><div class="subtle-note">æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒå®Œæ•´çš„æ•°æ®ï¼Œæš‚æ—¶æ— æ³•è®¡ç®—ã€‚</div></div><div class="summary-card"><h4>å¯¹æ¯”è¯´æ˜</h4><div class="subtle-note">è¯·å‡å°‘å åŠ è€ƒè¯•ï¼Œæˆ–è¡¥é½ç›¸åŒç§‘ç›®çš„${state.radarMode === 'rank' ? 'åæ¬¡å’Œå‚è€ƒäººæ•°' : 'æˆç»©'}ã€‚</div></div></div>`;

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

  return `<div class="radar-summary"><div class="summary-card"><h4>${isRank ? 'å½“å‰æ’åç›¸å¯¹è–„å¼±ç§‘ç›®' : 'å½“å‰è–„å¼±ç§‘ç›®'}</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>${formatPercent(item.value)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? 'å¯¹æ¯”å˜åŒ–' : 'æœ¬æ¬¡æ¦‚å†µ'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>å½“å‰å¯¹æ¯”ï¼š<span class="comparison-strong">${escapeHtml(earliest.name)}</span> â†’ <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>å‚ä¸å¯¹æ¯”ç§‘ç›®ï¼š<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? 'å¹³å‡æ’åç™¾åˆ†ä½' : 'æ•´ä½“å¹³å‡å¾—åˆ†ç‡'}ï¼š<span class="comparison-strong">${formatPercent(average)}</span></div><div>${isRank ? 'æ’åæå‡æœ€å¤§' : 'è¿›æ­¥æœ€å¤§'}ï¼š${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : 'â€”'}</div><div>éœ€è¦å…³æ³¨ï¼š${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : 'â€”'}</div></div>` : `<div class="comparison-grid"><div>å·²é€‰æ‹©ï¼š<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>å‚ä¸ç§‘ç›®ï¼š<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? 'å¹³å‡æ’åç™¾åˆ†ä½' : 'å¹³å‡å¾—åˆ†ç‡'}ï¼š<span class="comparison-strong">${formatPercent(average)}</span></div><div class="subtle-note">å†å¤šé€‰å‡ æ¬¡è€ƒè¯•ï¼Œå°±å¯ä»¥ç›´æ¥çœ‹åˆ°${isRank ? 'å„ç§‘ç›¸å¯¹æ’å' : 'å¼±é¡¹'}æ”¹å–„äº†å¤šå°‘ã€‚</div></div>`}</div></div>`;
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
  if (!['æ€»è§ˆ', 'æ€»åˆ†', ...SUBJECTS].includes(state.subject)) state.subject = 'æ€»åˆ†';
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
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? 'ç¼–è¾‘è€ƒè¯•' : 'è®°å½•ä¸€æ¬¡è€ƒè¯•'}</h3><button class="close-btn" aria-label="å…³é—­">Ã—</button></div><div class="modal-body">
    <div class="form-grid"><div class="field"><label>è€ƒè¯•åç§°</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="ä¾‹å¦‚ï¼šæœŸä¸­è€ƒè¯• / 2023 è‹±è¯­çœŸé¢˜"></div><div class="field"><label>è€ƒè¯•æ—¥æœŸ</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div>
    <div class="section-head-v7"><div><h4>æœ¬æ¬¡è€ƒè¯•ç§‘ç›®</h4><p>ç§‘ç›®åªå±äºè¿™ä¸€æ¬¡è€ƒè¯•ï¼Œå¯ä»¥éšæ„æ–°å¢ã€åˆ é™¤æˆ–æ”¹æˆé¢˜å‹/æ¨¡å—ï¼Œä¸å½±å“å…¶ä»–è€ƒè¯•ã€‚</p></div></div>
    <div class="exam-subjects-v10" id="examSubjectsV10"></div>
    <div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV10">ï¼‹ æ·»åŠ ç§‘ç›® / æ¨¡å—</button><span class="template-note-v10">æ–°è€ƒè¯•é»˜è®¤æ²¿ç”¨æœ€è¿‘ä¸€æ¬¡çš„ç§‘ç›®ï¼Œå‡å°‘é‡å¤è¾“å…¥ã€‚</span></div>
    <div class="section-head-v7"><div><h4>æ€»æ’åï¼ˆå¯é€‰ï¼‰</h4><p>å„ç§‘æ’ååœ¨ä¸Šé¢çš„ç§‘ç›®å¡é‡Œå¡«å†™ï¼›å‚è€ƒäººæ•°ç•™ç©ºæ—¶ä½¿ç”¨è¿™é‡Œçš„æ€»å‚è€ƒäººæ•°ã€‚</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>é¡¹ç›®</span><span>åæ¬¡</span><span>å‚è€ƒäººæ•°</span></div><div class="rank-row-v7 total"><span class="subject-name">æ€»åˆ†</span><input id="totalRankV10" inputmode="numeric" pattern="[0-9]*" placeholder="ä¾‹å¦‚ 36" value="${exam?.total_rank ?? ''}"><input id="totalParticipantsV10" inputmode="numeric" pattern="[0-9]*" placeholder="ä¾‹å¦‚ 620" value="${exam?.total_participants ?? ''}"></div></div>
    <div class="rank-science-box-v7"><b>æ’åæ¯”è¾ƒï¼š</b>è¶‹åŠ¿å›¾å’Œé›·è¾¾å›¾éƒ½ä¼šæŠŠâ€œåæ¬¡ + å‚è€ƒäººæ•°â€æ¢ç®—æˆæ’åç™¾åˆ†ä½ï¼ˆè¶…è¶Šç‡ï¼‰ï¼Œè¶Šé«˜è¶Šå¥½ã€‚å»ºè®®é•¿æœŸä¿æŒåŒä¸€ç§å£å¾„ï¼Œä¾‹å¦‚éƒ½è®°å½•å¹´çº§æ’åã€‚</div>
    <div class="visibility-box-v10"><div><b>å›¾è¡¨æ˜¾ç¤ºçŠ¶æ€</b><span>${exam?.is_hidden ? 'è¿™æ¬¡è€ƒè¯•å·²éšè—ï¼šè®°å½•ä»ä¿ç•™ï¼Œä½†ä¸å‚ä¸é¦–é¡µç»Ÿè®¡ã€è¶‹åŠ¿å›¾å’Œé›·è¾¾å›¾ã€‚' : 'è¿™æ¬¡è€ƒè¯•å½“å‰ä¼šå‚ä¸é¦–é¡µç»Ÿè®¡ã€è¶‹åŠ¿å›¾å’Œé›·è¾¾å›¾ã€‚'}</span></div><button class="secondary" id="toggleHiddenModalV10">${exam?.is_hidden ? 'æ¢å¤æ˜¾ç¤º' : 'ä»å›¾è¡¨éšè—'}</button><input type="hidden" id="examHiddenV10" value="${exam?.is_hidden ? '1' : '0'}"></div>
    ${editing ? '<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamModalV10">åˆ é™¤è¿™æ¬¡è€ƒè¯•</button></div>' : ''}
    <div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary save-btn">${editing ? 'ä¿å­˜ä¿®æ”¹' : 'ä¿å­˜è€ƒè¯•'}</button></div>
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
  const cardHtml = (row) => `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name || '')}" placeholder="ç§‘ç›® / é¢˜å‹ / æ¨¡å—åç§°"><button class="remove-exam-subject-v10" type="button" title="åˆ é™¤æœ¬æ¬¡è€ƒè¯•ä¸­çš„è¿™ä¸ªç§‘ç›®">Ã—</button></div><div class="exam-score-grid-v10"><div class="mini-field-v10"><label>ç›®æ ‡æˆç»©</label><input class="target-v10" inputmode="decimal" placeholder="å¯ç•™ç©º" value="${row.target ?? ''}"></div><div class="mini-field-v10"><label>çœŸå®æˆç»©</label><input class="actual-v10" inputmode="decimal" placeholder="å¯ç•™ç©º" value="${row.actual ?? ''}"></div><div class="mini-field-v10"><label>æ»¡åˆ†</label><input class="max-v10" inputmode="decimal" value="${row.max ?? 100}"></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>ç§‘ç›®åæ¬¡</label><input class="rank-v10" inputmode="numeric" pattern="[0-9]*" placeholder="å¯ç•™ç©º" value="${row.rank ?? ''}"></div><div class="mini-field-v10"><label>å‚è€ƒäººæ•°</label><input class="participants-v10" inputmode="numeric" pattern="[0-9]*" placeholder="ç•™ç©º=æ€»äººæ•°" value="${row.participants ?? ''}"></div></div></div>`;
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
    if (rows.length >= 40) return toast('å•æ¬¡è€ƒè¯•æœ€å¤š 40 ä¸ªç§‘ç›® / æ¨¡å—');
    syncRows(); rows.push({ name: '', target: '', actual: '', max: 100, rank: '', participants: '' }); renderRows();
    $('.exam-subject-card-v10:last-child .exam-subject-name-v10', list)?.focus();
  };
  $('#toggleHiddenModalV10', modal).onclick = () => {
    const hiddenInput = $('#examHiddenV10', modal), next = hiddenInput.value !== '1';
    hiddenInput.value = next ? '1' : '0';
    $('#toggleHiddenModalV10', modal).textContent = next ? 'æ¢å¤æ˜¾ç¤º' : 'ä»å›¾è¡¨éšè—';
    $('.visibility-box-v10 span', modal).textContent = next ? 'ä¿å­˜åï¼Œè¿™æ¬¡è€ƒè¯•ä»ä¼šä¿ç•™åœ¨è®°å½•ä¸­ï¼Œä½†ä¸å‚ä¸é¦–é¡µç»Ÿè®¡ã€è¶‹åŠ¿å›¾å’Œé›·è¾¾å›¾ã€‚' : 'ä¿å­˜åï¼Œè¿™æ¬¡è€ƒè¯•ä¼šé‡æ–°å‚ä¸é¦–é¡µç»Ÿè®¡ã€è¶‹åŠ¿å›¾å’Œé›·è¾¾å›¾ã€‚';
  };
  $('#deleteExamModalV10', modal)?.addEventListener('click', async () => {
    if (!confirm(`ç¡®å®šæ°¸ä¹…åˆ é™¤ã€Œ${exam?.name || 'è¿™æ¬¡è€ƒè¯•'}ã€ï¼Ÿæˆç»©å’Œæ’åéƒ½ä¼šä¸€èµ·åˆ é™¤ã€‚`)) return;
    try { await dataApiV7('delete_exam', { examId: exam.id }); await loadExams(); close(); render(); toast('å·²åˆ é™¤'); }
    catch (error) { toast(error.message); }
  });
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
};

validateExam = function validateExamV10(exam) {
  const totalRank = num(exam.total_rank), totalParticipants = num(exam.total_participants);
  if (totalRank !== null && (!Number.isInteger(totalRank) || totalRank < 1)) return 'æ€»æ’åè¯·è¾“å…¥æ­£æ•´æ•°';
  if (totalParticipants !== null && (!Number.isInteger(totalParticipants) || totalParticipants < 1)) return 'å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°';
  if (totalRank !== null && totalParticipants !== null && totalRank > totalParticipants) return 'æ€»æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°';
  const names = new Set();
  for (const [name, row] of Object.entries(exam.scores || {})) {
    if (!name || name.length > 40) return 'ç§‘ç›®åç§°ä¸èƒ½ä¸ºç©ºä¸”ä¸èƒ½è¶…è¿‡ 40 ä¸ªå­—ç¬¦';
    if (names.has(name)) return `ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`; names.add(name);
    const max = num(row.max) ?? defaultMax(name), target = num(row.target), actual = num(row.actual), rank = num(row.rank), participants = num(row.participants), effective = participants ?? totalParticipants;
    if (!Number.isFinite(max) || max <= 0) return `${name} çš„æ»¡åˆ†å¿…é¡»å¤§äº 0`;
    if (target !== null && target > max) return `${name} çš„ç›®æ ‡æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${name} çš„çœŸå®æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) return `${name}æ’åè¯·è¾“å…¥æ­£æ•´æ•°`;
    if (participants !== null && (!Number.isInteger(participants) || participants < 1)) return `${name}å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°`;
    if (rank !== null && effective !== null && rank > effective) return `${name}æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°`;
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
    if (!name) return toast('è¯·å¡«å†™ç§‘ç›®åç§°ï¼Œæˆ–åˆ é™¤ç©ºç™½ç§‘ç›®');
    if (seen.has(name)) return toast(`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`); seen.add(name);
    exam.scores[name] = { target: $('.target-v10', card).value, actual: $('.actual-v10', card).value, max: $('.max-v10', card).value, rank: $('.rank-v10', card).value, participants: $('.participants-v10', card).value };
  }
  if (!exam.name || !exam.exam_date) return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');
  const error = validateExam(exam); if (error) return toast(error);
  btn.disabled = true; btn.textContent = 'ä¿å­˜ä¸­â€¦';
  try { await dataApiV7('save_exam', { exam }); await loadExams(); modal.remove(); state.modal = null; render(); toast(id ? 'å·²ä¿å­˜ä¿®æ”¹' : 'è€ƒè¯•å·²è®°å½•'); }
  catch (error) { toast(error.message); btn.disabled = false; btn.textContent = id ? 'ä¿å­˜ä¿®æ”¹' : 'ä¿å­˜è€ƒè¯•'; }
};

deleteExam = async function deleteExamV10(id) {
  const exam = (state.allExams || []).find((item) => item.id === id) || state.exams.find((item) => item.id === id);
  if (!confirm(`ç¡®å®šæ°¸ä¹…åˆ é™¤ã€Œ${exam?.name || 'è¿™æ¬¡è€ƒè¯•'}ã€ï¼Ÿæˆç»©å’Œæ’åéƒ½ä¼šä¸€èµ·åˆ é™¤ã€‚`)) return;
  try { await dataApiV7('delete_exam', { examId: id }); await loadExams(); render(); toast('å·²åˆ é™¤'); }
  catch (error) { toast(error.message); }
};

async function toggleExamHiddenV10(id) {
  const exam = (state.allExams || []).find((item) => item.id === id); if (!exam) return;
  try { await dataApiV7('toggle_exam_hidden', { examId: id, hidden: !exam.is_hidden }); await loadExams(); render(); toast(exam.is_hidden ? 'å·²æ¢å¤åˆ°å›¾è¡¨' : 'å·²ä»å›¾è¡¨éšè—'); }
  catch (error) { toast(error.message); }
}

recordHtml = function recordHtmlV10(exam) {
  const subjects = Object.keys(exam.scores || {}), rank = rankInfoV7(exam, 'æ€»åˆ†');
  const actualVals = subjects.map((s) => examScore(exam, s, 'actual')).filter((v) => v !== null), targetVals = subjects.map((s) => examScore(exam, s, 'target')).filter((v) => v !== null);
  const actual = actualVals.length ? actualVals.reduce((a, b) => a + b, 0) : null, target = targetVals.length ? targetVals.reduce((a, b) => a + b, 0) : null;
  return `<div class="record ${exam.is_hidden ? 'hidden-record-v10' : ''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}${exam.is_hidden ? '<span class="hidden-badge-v10">å·²éšè—</span>' : ''}</b></div><div class="record-scores">${subjects.map((subject) => {
    const row = exam.scores[subject] || {}, a = num(row.actual), t = num(row.target), r = num(row.rank), n = num(row.participants) ?? num(exam.total_participants);
    if (a === null && t === null && r === null) return '';
    return `<span class="score-tag">${escapeHtml(subject)} ${a === null ? 'â€”' : formatScore(a)}<span style="color:#a1a9b5"> / ${t === null ? 'â€”' : formatScore(t)}</span>${r === null ? '' : `<span style="color:#667085"> Â· ç¬¬${r}${n ? `/${n}` : ''}</span>`}</span>`;
  }).join('') || '<span class="score-tag">å°šæœªå¡«å†™åˆ†æ•°æˆ–æ’å</span>'}<span class="score-tag"><b>æ€»åˆ† ${actual === null ? 'â€”' : formatScore(actual)}</b> / ç›®æ ‡ ${target === null ? 'â€”' : formatScore(target)}</span>${rank.rank !== null ? `<span class="score-tag"><b>æ€»æ’å ${rank.rank}${rank.participants ? ` / ${rank.participants}` : ''}</b>${rank.performance !== null ? ` Â· ${formatPercent(rank.performance)}` : ''}</span>` : ''}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">ç¼–è¾‘</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden ? 'æ¢å¤æ˜¾ç¤º' : 'éšè—'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">åˆ é™¤</button></div></div>`;
};

recordsHtml = function recordsHtmlV10() {
  const exams = state.allExams || [], hiddenCount = exams.filter((exam) => exam.is_hidden).length;
  return `<div class="page-head"><div><h2>è€ƒè¯•è®°å½•</h2><p>æ¯æ¬¡è€ƒè¯•å¯ä»¥æœ‰ä¸åŒç§‘ç›®ï¼›â€œéšè—â€åªå½±å“å›¾è¡¨ï¼Œä¸ä¼šåˆ é™¤è®°å½•ã€‚${hiddenCount ? ` å½“å‰æœ‰ ${hiddenCount} æ¬¡å·²éšè—ã€‚` : ''}</p></div><button class="primary" id="addExam">ï¼‹ æ–°å»º</button></div><div class="card records-card">${exams.length ? exams.map(recordHtml).join('') : `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">ğŸ“</div>è¿˜æ²¡æœ‰è€ƒè¯•è®°å½•<br><button class="secondary" id="emptyAdd" style="margin-top:14px">è®°å½•ç¬¬ä¸€åœºè€ƒè¯•</button></div></div>`}</div>`;
};

accountHtml = function accountHtmlV10() {
  const base = typeof accountHtmlBeforeV7 === 'function' ? accountHtmlBeforeV7() : `<div class="page-head"><div><h2>è´¦å·</h2></div></div>`;
  return `${base}<div class="card account-note-v10"><h3 class="card-title">ç§‘ç›®æŒ‰è€ƒè¯•å•ç‹¬è®¾ç½®</h3><p class="card-sub">ç°åœ¨ä¸å†éœ€è¦ç»´æŠ¤ä¸€å¥—å…¨å±€ç§‘ç›®ã€‚æ–°å»ºæˆ–ç¼–è¾‘æŸæ¬¡è€ƒè¯•æ—¶ï¼Œå¯ä»¥ç›´æ¥æ·»åŠ ã€åˆ é™¤ã€æ”¹åç§‘ç›®æˆ–é¢˜å‹ï¼Œåªå½±å“é‚£ä¸€æ¬¡è€ƒè¯•ï¼›æ–°è€ƒè¯•é»˜è®¤æ²¿ç”¨æœ€è¿‘ä¸€æ¬¡çš„ç§‘ç›®ã€‚</p></div>`;
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
  const help = $('.auth-help'); if (help) help.textContent = 'æ¯æ¬¡è€ƒè¯•éƒ½å¯è‡ªç”±å¢å‡ç§‘ç›®ï¼Œå¹¶æ”¯æŒæˆç»©ã€æ’åè¶‹åŠ¿ä¸æ’åç™¾åˆ†ä½é›·è¾¾å¯¹æ¯”ã€‚';
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
  if (subject === 'æ€»åˆ†') return num(exam.total_rank);
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
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">â†•</div>è®°å½•åæ¬¡åï¼Œè¿™é‡Œä¼šæ˜¾ç¤ºåŸå§‹åæ¬¡è¶‹åŠ¿</div></div>`;
  const colors = typeof rankSeriesColorsV7 === 'function' ? rankSeriesColorsV7() : ['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
  const subjects = state.subject === 'æ€»è§ˆ' ? ['æ€»åˆ†', ...SUBJECTS] : [state.subject];
  const series = subjects.map((subject, index) => ({ subject, color: colors[index % colors.length] }));
  const visible = series.filter((item) => state.exams.some((exam) => rawRankValueV11(exam, item.subject) !== null));
  if (!visible.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">â†•</div>è¿™ä¸ªé¡¹ç›®è¿˜æ²¡æœ‰åæ¬¡æ•°æ®</div></div>`;

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
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="axis-label">ç¬¬${Math.max(1, Math.round(value))}</text>`;
  }

  const lines = visible.map((item, seriesIndex) => {
    let d = '', started = false, circles = '';
    points.forEach((point, pointIndex) => {
      const value = point.values[seriesIndex];
      if (value === null) { started = false; return; }
      const xx = x(pointIndex), yy = y(value);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} Â· ${escapeHtml(item.subject)} ç¬¬${value}å"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === 'æ€»è§ˆ' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = state.subject === 'æ€»è§ˆ' ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>` : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="raw-rank-note-v11"><b>åŸå§‹åæ¬¡æ¨¡å¼ï¼š</b>ç›´æ¥æ˜¾ç¤ºç¬¬å‡ åï¼Œä¸æ¢ç®—ç™¾åˆ†ä½ï¼›çºµè½´è¶Šé«˜è¶Šå¥½ï¼Œç¬¬ 1 ååœ¨æœ€ä¸Šæ–¹ã€‚æ€»è§ˆå åŠ æ—¶ï¼Œæœ€å¥½ä¿è¯å„ç§‘ä½¿ç”¨ç›¸åŒçš„æ’åå£å¾„å’Œç›¸è¿‘çš„å‚è€ƒäººæ•°ã€‚</div>`;
}

const chartHtmlBeforeV11 = chartHtml;
chartHtml = function chartHtmlV11() {
  if (state.trendMetric === 'rank_raw') return rawRankChartHtmlV11();
  return chartHtmlBeforeV11();
};

const homeHtmlBeforeV11 = homeHtml;
homeHtml = function homeHtmlV11() {
  let html = homeHtmlBeforeV11();
  html = html.replace(/<button class="metric-btn-v7 [^"]*" data-trend-metric="rank">æ’å<\/button>/,
    `<button class="metric-btn-v7 ${state.trendMetric === 'rank_raw' ? 'active' : ''}" data-trend-metric="rank_raw">åæ¬¡</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">æ’åç™¾åˆ†ä½</button>`);
  if (state.trendMetric === 'rank_raw') {
    html = html.replace('<h3 class="card-title">æˆç»©è¶‹åŠ¿</h3>', '<h3 class="card-title">åæ¬¡è¶‹åŠ¿</h3>');
    html = html.replace('<p class="card-sub">çœŸå®æˆç»©ä¸ç›®æ ‡æˆç»©æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œ</p>', '<p class="card-sub">ç›´æ¥çœ‹åŸå§‹ç¬¬å‡ åï¼›çºµè½´åå‘æ˜¾ç¤ºï¼Œç¬¬ 1 ååœ¨æœ€ä¸Šæ–¹</p>');
    html = html.replace('<p class="card-sub">æ€»åˆ†ä¸å„ç§‘æŒ‰å¾—åˆ†ç‡å åŠ å±•ç¤ºï¼Œæ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—</p>', '<p class="card-sub">æ€»åˆ†ä¸å„ç§‘ç›´æ¥å åŠ åŸå§‹åæ¬¡ï¼›è¶Šé ä¸Šä»£è¡¨åæ¬¡è¶Šå¥½</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>çœŸå®æˆç»©</span><span><i class="target"></i>ç›®æ ‡æˆç»©</span></div>', '<div class="subtle-note">åŸå§‹åæ¬¡ Â· ç¬¬ 1 åæœ€å¥½</div>');
    html = html.replace('<div class="subtle-note">çœŸå®æˆç»© Â· å¾—åˆ†ç‡</div>', '<div class="subtle-note">åŸå§‹åæ¬¡ Â· è¶Šå°è¶Šå¥½</div>');
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
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>é€‰æ‹©æœ‰åæ¬¡æ•°æ®çš„è€ƒè¯•åï¼Œè¿™é‡Œä¼šç›´æ¥æ˜¾ç¤ºå„ç§‘åŸå§‹åæ¬¡</div></div>`;
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">â—</div>æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒçš„ç§‘ç›®åæ¬¡ï¼Œæš‚æ—¶æ— æ³•å åŠ æ¯”è¾ƒ</div></div>`;

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

  let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">ç¬¬${Math.round(axis.max)}</text>`;
  for (let i = 1; i <= axis.ticks; i += 1) {
    const ratio = i / axis.ticks;
    const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
    const rankValue = axis.max - ((axis.max - axis.min) * ratio);
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">ç¬¬${Math.max(1, Math.round(rankValue))}</text>`;
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
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${escapeHtml(exam.name)} Â· ${escapeHtml(subject)} ç¬¬${value}å"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">åŸå§‹åæ¬¡åŠ¨æ€ç¼©æ”¾ï¼ˆå¤–åœˆåæ¬¡æ›´å¥½ï¼šç¬¬${Math.round(axis.min)} ï½ ç¬¬${Math.round(axis.max)}ï¼‰</div>`;
};

const radarSummaryBeforeV11 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarSummaryBeforeV11(selected);
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>å½“å‰åæ¬¡è¾ƒå¼±ç§‘ç›®</h4><div class="subtle-note">æ‰€é€‰è€ƒè¯•æ²¡æœ‰å…±åŒåæ¬¡æ•°æ®ã€‚</div></div></div>`;
  const latest = selected.at(-1), earliest = selected[0];
  const weakness = subjects.map((subject) => ({ subject, rank: rawRankValueV11(latest, subject) })).sort((a, b) => b.rank - a.rank).slice(0, 3);
  const comparisons = subjects.map((subject) => ({
    subject,
    before: rawRankValueV11(earliest, subject),
    after: rawRankValueV11(latest, subject),
    improvement: rawRankValueV11(earliest, subject) - rawRankValueV11(latest, subject)
  })).sort((a, b) => b.improvement - a.improvement);
  const best = comparisons[0] || null, worst = comparisons.at(-1) || null;
  return `<div class="radar-summary"><div class="summary-card"><h4>å½“å‰åæ¬¡è¾ƒå¼±ç§‘ç›®</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>ç¬¬${item.rank}å</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? 'åæ¬¡å˜åŒ–' : 'æœ¬æ¬¡æ¦‚å†µ'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>å½“å‰å¯¹æ¯”ï¼š<span class="comparison-strong">${escapeHtml(earliest.name)}</span> â†’ <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>å‚ä¸ç§‘ç›®ï¼š<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>è¿›æ­¥æœ€å¤§ï¼š${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.improvement >= 0 ? 'â†‘' : 'â†“'}${Math.abs(best.improvement)}å</span>` : 'â€”'}</div><div>éœ€è¦å…³æ³¨ï¼š${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.improvement >= 0 ? 'â†‘' : 'â†“'}${Math.abs(worst.improvement)}å</span>` : 'â€”'}</div></div>` : `<div class="comparison-grid"><div>å·²é€‰æ‹©ï¼š<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div class="subtle-note">å†é€‰æ‹©ä¸€æ¬¡è€ƒè¯•ï¼Œå°±èƒ½ç›´æ¥æ¯”è¾ƒå„ç§‘å‰è¿›æˆ–åé€€äº†å¤šå°‘åã€‚</div></div>`}</div></div>`;
};

const radarCardBeforeV11 = radarCardHtml;
radarCardHtml = function radarCardHtmlV11() {
  let html = radarCardBeforeV11();
  html = html.replace(/<button class="chip [^"]*" data-radar-mode="rank">æ’åç™¾åˆ†ä½<\/button>/,
    `<button class="chip ${state.radarMode === 'rank_raw' ? 'active' : ''}" data-radar-mode="rank_raw">åæ¬¡</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">æ’åç™¾åˆ†ä½</button>`);
  if (state.radarMode === 'rank_raw') {
    html = html.replace('æŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼Œæ”¯æŒå åŠ å¤šæ¬¡è€ƒè¯•ï¼›æ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—ï¼Œ6 ç§‘å°±æ˜¾ç¤ºå…­è¾¹å½¢ã€‚', 'ç›´æ¥æŒ‰åŸå§‹åæ¬¡ç»˜åˆ¶ï¼šå¤–åœˆä»£è¡¨æ›´å¥½çš„åæ¬¡ï¼Œç¬¬ 1 åæ–¹å‘æœ€å¤–ï¼›ä¸åšå‚è€ƒäººæ•°ç™¾åˆ†ä½æ¢ç®—ã€‚');
    html = html.replace('æœ€å¤šå¯å åŠ  4 æ¬¡è€ƒè¯•ã€‚å åŠ æ—¶åªæ˜¾ç¤ºæ‰€é€‰è€ƒè¯•å…±åŒæ‹¥æœ‰æ•°æ®çš„ç§‘ç›®ï¼›åæ ‡è½´ä¼šæŒ‰å½“å‰æ•°æ®åŠ¨æ€ç¼©æ”¾ã€‚', 'æœ€å¤šå¯å åŠ  4 æ¬¡è€ƒè¯•ã€‚åªæ˜¾ç¤ºå…±åŒæ‹¥æœ‰åæ¬¡çš„ç§‘ç›®ï¼›åŸå§‹åæ¬¡ä¼šåŠ¨æ€ç¼©æ”¾ï¼Œå¤–åœˆåæ¬¡æ›´å¥½ã€‚');
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
state.gradeFilter = state.gradeFilter || 'å…¨éƒ¨';
state.scoreBasis = state.scoreBasis || 'final';
state.unfilteredVisibleExamsV13 = state.unfilteredVisibleExamsV13 || [];

const GRADE_LEVELS_V13 = ['é«˜ä¸€', 'é«˜äºŒ', 'é«˜ä¸‰'];
const ASSIGNED_DEFAULT_SUBJECTS_V13 = new Set(['åŒ–å­¦', 'ç”Ÿç‰©', 'æ”¿æ²»', 'åœ°ç†']);

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
function gradeLabelV13(exam) { return exam?.grade_level || 'æœªåˆ†ç±»'; }

function applyGradeFilterV13() {
  const source = state.unfilteredVisibleExamsV13 || [];
  state.exams = state.gradeFilter === 'å…¨éƒ¨' ? [...source]
    : state.gradeFilter === 'æœªåˆ†ç±»' ? source.filter((exam) => !exam.grade_level)
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
    { label: 'æ€»åˆ†', color: (typeof OVERVIEW_COLORS !== 'undefined' ? OVERVIEW_COLORS[0] : '#18212f'), value: (exam) => totalRawRateV13(exam) },
    ...subjects.map((subject, index) => ({ label: subject, color: (typeof OVERVIEW_COLORS !== 'undefined' ? OVERVIEW_COLORS[index + 1] : null) || RADAR_COLORS[index % RADAR_COLORS.length], value: (exam) => rawScoreRateV13(exam, subject) }))
  ];
  const visible = series.filter((item) => state.exams.some((exam) => item.value(exam) !== null));
  if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>å½“å‰åˆ†ç±»è¿˜æ²¡æœ‰åŸå§‹åˆ†æ•°æ®</div></div>`;
  const points = state.exams.map((exam) => ({ exam, values: visible.map((item) => item.value(exam)) }));
  const vals = points.flatMap((point) => point.values).filter((v) => v !== null);
  const axis = typeof calcDynamicAxisRangeV6 === 'function' ? calcDynamicAxisRangeV6(vals, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: .16 }) : { min: 0, max: 100, ticks: 5 };
  const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46, cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + i / (points.length - 1) * cw;
  const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;
  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) { const value = axis.max - (axis.max - axis.min) * i / axis.ticks, yy = T + ch * i / axis.ticks; grid += `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-8}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`; }
  const lines = visible.map((item, sidx) => { let d = '', started = false, circles = ''; points.forEach((point, pidx) => { const value = point.values[sidx]; if (value === null) { started = false; return; } const xx=x(pidx), yy=y(value); d += `${started?'L':'M'} ${xx} ${yy} `; started=true; circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${item.color}" stroke-width="2.4" data-tip="${escapeHtml(point.exam.name)} Â· ${escapeHtml(item.label)} åŸå§‹å¾—åˆ†ç‡ ${formatPercent(value)}"/>`; }); return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${sidx===0?'3.4':'2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`; }).join('');
  const labels = points.map((point,index)=>`<text x="${x(index)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = `<div class="overview-legend">${visible.map((item)=>`<span class="overview-pill"><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`).join('')}</div>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div>${legend}<div class="axis-caption-v6">åŸå§‹åˆ†æ€»è§ˆæŒ‰å¾—åˆ†ç‡æ¯”è¾ƒï¼›æœªå¡«å†™åŸå§‹åˆ†çš„æ™®é€šç§‘ç›®è‡ªåŠ¨æ²¿ç”¨æœ€ç»ˆåˆ†ã€‚</div>`;
}

function rawScoreSingleHtmlV13() {
  const isTotal = state.subject === 'æ€»åˆ†';
  const points = state.exams.map((exam) => ({ exam, value: isTotal ? totalRawForV13(exam) : examRawScoreV13(exam, state.subject) }));
  const values = points.map((p) => p.value).filter((v) => v !== null);
  if (!values.length) return `<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è¿™ä¸ªé¡¹ç›®è¿˜æ²¡æœ‰åŸå§‹åˆ†æ•°æ®</div></div>`;
  let min = Math.min(...values), max = Math.max(...values), pad = Math.max(5, (max-min)*.18); min = Math.max(0, Math.floor((min-pad)/5)*5); max = Math.ceil((max+pad)/5)*5; if (max-min < 20) { const mid=(max+min)/2; min=Math.max(0,Math.floor((mid-10)/5)*5); max=Math.ceil((mid+10)/5)*5; } if(max===min) max=min+20;
  const W=760,H=300,L=50,R=18,T=20,B=46,cw=W-L-R,ch=H-T-B, x=(i)=>points.length===1?L+cw/2:L+i/(points.length-1)*cw, y=(v)=>T+(max-v)/(max-min)*ch;
  let grid=''; for(let i=0;i<=5;i++){const v=max-(max-min)*i/5,yy=T+ch*i/5;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`;}
  let d='',started=false,circles=''; points.forEach((point,index)=>{if(point.value===null){started=false;return;}const xx=x(index),yy=y(point.value);d+=`${started?'L':'M'} ${xx} ${yy} `;started=true;circles+=`<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="#d38429" stroke-width="3" data-tip="${escapeHtml(point.exam.name)} Â· åŸå§‹${isTotal?'æ€»åˆ†':state.subject} ${formatScore(point.value)}"/>`;});
  const labels=points.map((point,index)=>`<text x="${x(index)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}<path d="${d}" fill="none" stroke="#d38429" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

const chartHtmlBeforeV13 = chartHtml;
chartHtml = function chartHtmlV13() {
  if (state.trendMetric === 'score' && state.scoreBasis === 'raw') return state.subject === 'æ€»è§ˆ' ? rawScoreOverviewHtmlV13() : rawScoreSingleHtmlV13();
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
  html = html.replace(/<button class="chip ([^"]*)" data-radar-mode="actual">çœŸå®æˆç»©<\/button>/,
    `<button class="chip $1" data-radar-mode="actual">èµ‹åˆ†/æœ€ç»ˆåˆ†</button><button class="chip ${state.radarMode === 'raw_score' ? 'active' : ''}" data-radar-mode="raw_score">åŸå§‹åˆ†</button>`);
  if (state.radarMode === 'raw_score') html = html.replace(/<p class="card-sub">.*?<\/p>/, '<p class="card-sub">æŒ‰åŸå§‹å¾—åˆ†ç‡ç»˜åˆ¶ï¼›æœªå¡«å†™åŸå§‹åˆ†çš„æ™®é€šç§‘ç›®ä¼šæ²¿ç”¨æœ€ç»ˆåˆ†ï¼Œæ–¹ä¾¿æ¯”è¾ƒèµ‹åˆ†å‰åçš„å­¦ç§‘ç»“æ„ã€‚</p>');
  return html;
};

const homeHtmlBeforeV13 = homeHtml;
homeHtml = function homeHtmlV13() {
  let html = homeHtmlBeforeV13();
  const gradeBar = `<div class="grade-filter-v13"><span class="label">å¹´çº§</span>${['å…¨éƒ¨',...GRADE_LEVELS_V13,'æœªåˆ†ç±»'].map((grade)=>`<button class="grade-chip-v13 ${state.gradeFilter===grade?'active':''}" data-grade-filter-v13="${grade}">${grade}</button>`).join('')}</div>`;
  html = html.replace('<section class="grid-main">', `${gradeBar}<section class="grid-main">`);
  if (state.trendMetric === 'score') {
    const basis = `<div class="score-basis-v13"><span class="label">æˆç»©å£å¾„</span><button class="basis-btn-v13 ${state.scoreBasis==='final'?'active':''}" data-score-basis-v13="final">èµ‹åˆ† / æœ€ç»ˆåˆ†</button><button class="basis-btn-v13 ${state.scoreBasis==='raw'?'active':''}" data-score-basis-v13="raw">åŸå§‹åˆ†</button></div>`;
    html = html.replace('<div class="chips">', `${basis}<div class="chips">`);
    if (state.scoreBasis === 'raw') {
      html = html.replace('<p class="card-sub">çœŸå®æˆç»©ä¸ç›®æ ‡æˆç»©æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œ</p>', '<p class="card-sub">æŸ¥çœ‹èµ‹åˆ†å‰çš„åŸå§‹æˆç»©å˜åŒ–ï¼›æ€»è§ˆæ¨¡å¼æŒ‰åŸå§‹å¾—åˆ†ç‡ç»Ÿä¸€æ¯”è¾ƒ</p>');
      html = html.replace('<div class="legend"><span><i class="actual"></i>çœŸå®æˆç»©</span><span><i class="target"></i>ç›®æ ‡æˆç»©</span></div>', '<div class="subtle-note">åŸå§‹åˆ† Â· èµ‹åˆ†ç§‘ç›®å¯ä¸æœ€ç»ˆåˆ†åˆ‡æ¢å¯¹ç…§</div>');
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
  const lastGrade=(state.unfilteredVisibleExamsV13.at(-1)?.grade_level || 'é«˜ä¸€'), selectedGrade=exam?.grade_level || (editing ? '' : lastGrade);
  const modal=document.createElement('div');modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'ç¼–è¾‘è€ƒè¯•':'è®°å½•ä¸€æ¬¡è€ƒè¯•'}</h3><button class="close-btn" aria-label="å…³é—­">Ã—</button></div><div class="modal-body">
    <div class="form-grid"><div class="field"><label>è€ƒè¯•åç§°</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="ä¾‹å¦‚ï¼šé«˜äºŒä¸ŠæœŸä¸­è€ƒè¯•"></div><div class="field"><label>è€ƒè¯•æ—¥æœŸ</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>å¹´çº§åˆ†ç±»</label><select id="gradeLevelV13" class="grade-select-v13"><option value="">æœªåˆ†ç±»</option>${GRADE_LEVELS_V13.map((grade)=>`<option value="${grade}" ${selectedGrade===grade?'selected':''}>${grade}</option>`).join('')}</select></div></div>
    <div class="section-head-v7"><div><h4>æœ¬æ¬¡è€ƒè¯•ç§‘ç›®</h4><p>åŒ–å­¦ã€ç”Ÿç‰©ã€æ”¿æ²»ã€åœ°ç†ç­‰èµ‹åˆ†ç§‘ç›®å¯ä»¥åŒæ—¶è®°å½•åŸå§‹åˆ†å’Œèµ‹åˆ†ï¼›å…¶ä»–ç§‘ç›®åŸå§‹åˆ†å¯ç•™ç©ºã€‚</p></div></div>
    <div class="exam-subjects-v10" id="examSubjectsV13"></div>
    <div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV13">ï¼‹ æ·»åŠ ç§‘ç›® / æ¨¡å—</button><span class="template-note-v10">åŸå§‹åˆ†ç•™ç©ºæ—¶ï¼Œç»Ÿè®¡åŸå§‹æ€»åˆ†ä¼šè‡ªåŠ¨æ²¿ç”¨è¯¥ç§‘æœ€ç»ˆåˆ†ã€‚</span></div>
    <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>åŸå§‹æ€»åˆ†</span><b id="rawTotalV13">â€”</b><small>èµ‹åˆ†å‰</small></div><div class="score-total-box-v13"><span>èµ‹åˆ† / æœ€ç»ˆæ€»åˆ†</span><b id="finalTotalV13">â€”</b><small>ç”¨äºæ­£å¼æ€»åˆ†</small></div></div>
    <div class="section-head-v7"><div><h4>æ€»æ’åï¼ˆå¯é€‰ï¼‰</h4><p>å„ç§‘åæ¬¡åœ¨ç§‘ç›®å¡ä¸­å¡«å†™ï¼›å‚è€ƒäººæ•°ç•™ç©ºæ—¶ä½¿ç”¨æ€»å‚è€ƒäººæ•°ã€‚</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>é¡¹ç›®</span><span>åæ¬¡</span><span>å‚è€ƒäººæ•°</span></div><div class="rank-row-v7 total"><span class="subject-name">æ€»åˆ†</span><input id="totalRankV13" inputmode="numeric" pattern="[0-9]*" placeholder="ä¾‹å¦‚ 36" value="${exam?.total_rank??''}"><input id="totalParticipantsV13" inputmode="numeric" pattern="[0-9]*" placeholder="ä¾‹å¦‚ 620" value="${exam?.total_participants??''}"></div></div>
    <div class="rank-science-box-v7"><b>ä¸¤ç§æ’åè§†å›¾éƒ½ä¿ç•™ï¼š</b>â€œåæ¬¡â€ç›´æ¥çœ‹ç¬¬å‡ åï¼›â€œæ’åç™¾åˆ†ä½â€ç»“åˆå‚è€ƒäººæ•°ï¼Œæ›´é€‚åˆè·¨è€ƒè¯•æ¯”è¾ƒã€‚</div>
    <div class="visibility-box-v10"><div><b>å›¾è¡¨æ˜¾ç¤ºçŠ¶æ€</b><span>${exam?.is_hidden?'è¿™æ¬¡è€ƒè¯•å·²éšè—ï¼šè®°å½•ä»ä¿ç•™ï¼Œä½†ä¸å‚ä¸å›¾è¡¨ã€‚':'è¿™æ¬¡è€ƒè¯•å½“å‰ä¼šå‚ä¸é¦–é¡µç»Ÿè®¡å’Œå›¾è¡¨ã€‚'}</span></div><button class="secondary" id="toggleHiddenModalV13">${exam?.is_hidden?'æ¢å¤æ˜¾ç¤º':'ä»å›¾è¡¨éšè—'}</button><input type="hidden" id="examHiddenV13" value="${exam?.is_hidden?'1':'0'}"></div>
    ${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamModalV13">åˆ é™¤è¿™æ¬¡è€ƒè¯•</button></div>':''}
    <div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary save-btn">${editing?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•'}</button></div>
  </div></div>`;
  document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV13',modal);
  const syncRows=()=>{const next=$$('.exam-subject-card-v10',list).map((card)=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v13',card).value,raw:$('.raw-v13',card).value,actual:$('.actual-v13',card).value,max:$('.max-v13',card).value,rank:$('.rank-v13',card).value,participants:$('.participants-v13',card).value}));rows.splice(0,rows.length,...next);};
  const updateTotals=()=>{syncRows();$('#rawTotalV13',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV13',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const cardHtml=(row)=>{const assigned=ASSIGNED_DEFAULT_SUBJECTS_V13.has(String(row.name).trim()) || row.raw!=='';return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="ç§‘ç›® / é¢˜å‹ / æ¨¡å—åç§°"><button class="remove-exam-subject-v10" type="button" title="åˆ é™¤æœ¬æ¬¡è€ƒè¯•ä¸­çš„è¿™ä¸ªç§‘ç›®">Ã—</button></div><div class="exam-score-grid-v13"><div class="mini-field-v10"><label>ç›®æ ‡æˆç»©</label><input class="target-v13" inputmode="decimal" placeholder="å¯ç•™ç©º" value="${row.target??''}"></div><div class="mini-field-v10 raw-field-v13"><label>åŸå§‹åˆ†${assigned?'':'ï¼ˆå¯é€‰ï¼‰'}</label><input class="raw-v13" inputmode="decimal" placeholder="èµ‹åˆ†å‰" value="${row.raw??''}"></div><div class="mini-field-v10 final-field-v13"><label>${assigned?'èµ‹åˆ†':'æœ€ç»ˆåˆ†'}</label><input class="actual-v13" inputmode="decimal" placeholder="æ­£å¼æˆç»©" value="${row.actual??''}"></div><div class="mini-field-v10"><label>æ»¡åˆ†</label><input class="max-v13" inputmode="decimal" value="${row.max??100}"></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>ç§‘ç›®åæ¬¡</label><input class="rank-v13" inputmode="numeric" pattern="[0-9]*" placeholder="å¯ç•™ç©º" value="${row.rank??''}"></div><div class="mini-field-v10"><label>å‚è€ƒäººæ•°</label><input class="participants-v13" inputmode="numeric" pattern="[0-9]*" placeholder="ç•™ç©º=æ€»äººæ•°" value="${row.participants??''}"></div></div></div>`;};
  const renderRows=()=>{list.innerHTML=rows.map(cardHtml).join('');$$('.remove-exam-subject-v10',list).forEach((button,index)=>button.onclick=()=>{syncRows();rows.splice(index,1);renderRows();updateTotals();});$$('input',list).forEach((input)=>input.addEventListener('input',updateTotals));};
  renderRows();updateTotals();
  const close=()=>{modal.remove();state.modal=null;};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=(event)=>{if(event.target===modal)close();};
  $('#addExamSubjectV13',modal).onclick=()=>{if(rows.length>=40)return toast('å•æ¬¡è€ƒè¯•æœ€å¤š 40 ä¸ªç§‘ç›® / æ¨¡å—');syncRows();rows.push({name:'',target:'',raw:'',actual:'',max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};
  $('#toggleHiddenModalV13',modal).onclick=()=>{const input=$('#examHiddenV13',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenModalV13',modal).textContent=next?'æ¢å¤æ˜¾ç¤º':'ä»å›¾è¡¨éšè—';$('.visibility-box-v10 span',modal).textContent=next?'ä¿å­˜åä»ä¿ç•™è®°å½•ï¼Œä½†ä¸å‚ä¸å›¾è¡¨ã€‚':'ä¿å­˜åä¼šé‡æ–°å‚ä¸é¦–é¡µç»Ÿè®¡å’Œå›¾è¡¨ã€‚';};
  $('#deleteExamModalV13',modal)?.addEventListener('click',async()=>{if(!confirm(`ç¡®å®šæ°¸ä¹…åˆ é™¤ã€Œ${exam?.name||'è¿™æ¬¡è€ƒè¯•'}ã€ï¼Ÿæˆç»©å’Œæ’åéƒ½ä¼šä¸€èµ·åˆ é™¤ã€‚`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('å·²åˆ é™¤');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam = function validateExamV13(exam) {
  const totalRank=num(exam.total_rank),totalParticipants=num(exam.total_participants);
  if(totalRank!==null&&(!Number.isInteger(totalRank)||totalRank<1))return'æ€»æ’åè¯·è¾“å…¥æ­£æ•´æ•°';
  if(totalParticipants!==null&&(!Number.isInteger(totalParticipants)||totalParticipants<1))return'å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°';
  if(totalRank!==null&&totalParticipants!==null&&totalRank>totalParticipants)return'æ€»æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°';
  const names=new Set();for(const[name,row]of Object.entries(exam.scores||{})){if(!name||name.length>40)return'ç§‘ç›®åç§°ä¸èƒ½ä¸ºç©ºä¸”ä¸èƒ½è¶…è¿‡ 40 ä¸ªå­—ç¬¦';if(names.has(name))return`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`;names.add(name);const max=num(row.max)??defaultMax(name),target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??totalParticipants;if(!Number.isFinite(max)||max<=0)return`${name} çš„æ»¡åˆ†å¿…é¡»å¤§äº 0`;if(target!==null&&target>max)return`${name} çš„ç›®æ ‡æˆç»©ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;if(raw!==null&&raw>max)return`${name} çš„åŸå§‹åˆ†ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name} çš„èµ‹åˆ†/æœ€ç»ˆåˆ†ä¸èƒ½è¶…è¿‡æ»¡åˆ† ${formatScore(max)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}æ’åè¯·è¾“å…¥æ­£æ•´æ•°`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°`;if(rank!==null&&effective!==null&&rank>effective)return`${name}æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°`;}
  return'';
};

saveExam = async function saveExamV13(id, modal) {
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV13',modal)?.value||'',total_rank:$('#totalRankV13',modal)?.value||'',total_participants:$('#totalParticipantsV13',modal)?.value||'',is_hidden:$('#examHiddenV13',modal)?.value==='1',scores:{}};
  const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('è¯·å¡«å†™ç§‘ç›®åç§°ï¼Œæˆ–åˆ é™¤ç©ºç™½ç§‘ç›®');if(seen.has(name))return toast(`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`);seen.add(name);exam.scores[name]={target:$('.target-v13',card).value,raw:$('.raw-v13',card).value,actual:$('.actual-v13',card).value,max:$('.max-v13',card).value,rank:$('.rank-v13',card).value,participants:$('.participants-v13',card).value};}
  if(!exam.name||!exam.exam_date)return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='ä¿å­˜ä¸­â€¦';
  try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'å·²ä¿å­˜ä¿®æ”¹':'è€ƒè¯•å·²è®°å½•');}catch(error){toast(error.message);btn.disabled=false;btn.textContent=id?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•';}
};

recordHtml = function recordHtmlV13(exam) {
  const subjects=Object.keys(exam.scores||{}),rank=rankInfoV7(exam,'æ€»åˆ†');
  const finalValues=subjects.map((s)=>examScore(exam,s,'actual')).filter((v)=>v!==null),finalTotal=finalValues.length?finalValues.reduce((a,b)=>a+b,0):null,rawTotal=totalRawForV13(exam);
  return `<div class="record ${exam.is_hidden?'hidden-record-v10':''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}<span class="grade-badge-v13">${escapeHtml(gradeLabelV13(exam))}</span>${exam.is_hidden?'<span class="hidden-badge-v10">å·²éšè—</span>':''}</b></div><div class="record-scores">${subjects.map((subject)=>{const row=exam.scores[subject]||{},a=num(row.actual),raw=num(row.raw),t=num(row.target),r=num(row.rank),n=num(row.participants)??num(exam.total_participants);if(a===null&&raw===null&&t===null&&r===null)return'';return `<span class="score-tag">${escapeHtml(subject)} ${a===null?'â€”':formatScore(a)}${raw!==null?`<span class="raw-final-inline-v13"> Â· åŸå§‹ <b>${formatScore(raw)}</b></span>`:''}<span style="color:#a1a9b5"> / ç›®æ ‡ ${t===null?'â€”':formatScore(t)}</span>${r===null?'':`<span style="color:#667085"> Â· ç¬¬${r}${n?`/${n}`:''}</span>`}</span>`;}).join('')||'<span class="score-tag">å°šæœªå¡«å†™åˆ†æ•°æˆ–æ’å</span>'}<span class="score-tag"><b>èµ‹åˆ†æ€»åˆ† ${finalTotal===null?'â€”':formatScore(finalTotal)}</b>${rawTotal!==null?` Â· åŸå§‹æ€»åˆ† ${formatScore(rawTotal)}`:''}</span>${rank.rank!==null?`<span class="score-tag"><b>æ€»æ’å ${rank.rank}${rank.participants?` / ${rank.participants}`:''}</b>${rank.performance!==null?` Â· ${formatPercent(rank.performance)}`:''}</span>`:''}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">ç¼–è¾‘</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden?'æ¢å¤æ˜¾ç¤º':'éšè—'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">åˆ é™¤</button></div></div>`;
};

recordsHtml = function recordsHtmlV13() {
  const exams=state.allExams||[],hiddenCount=exams.filter((exam)=>exam.is_hidden).length;
  const groups=[...GRADE_LEVELS_V13,'æœªåˆ†ç±»'].map((grade)=>({grade,exams:exams.filter((exam)=>grade==='æœªåˆ†ç±»'?!exam.grade_level:exam.grade_level===grade)})).filter((group)=>group.exams.length);
  return `<div class="page-head"><div><h2>è€ƒè¯•è®°å½•</h2><p>æŒ‰é«˜ä¸€ã€é«˜äºŒã€é«˜ä¸‰åˆ†ç±»æ•´ç†ï¼›æ¯æ¬¡è€ƒè¯•ä»å¯æ‹¥æœ‰è‡ªå·±çš„ç§‘ç›®ã€‚${hiddenCount?` å½“å‰æœ‰ ${hiddenCount} æ¬¡å·²éšè—ã€‚`:''}</p></div><button class="primary" id="addExam">ï¼‹ æ–°å»º</button></div>${groups.length?groups.map((group)=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${group.grade}</h3><span>${group.exams.length} æ¬¡è€ƒè¯•</span></div><div class="card records-card">${group.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:300px"><div><div class="empty-icon">ğŸ“</div>è¿˜æ²¡æœ‰è€ƒè¯•è®°å½•<br><button class="secondary" id="emptyAdd" style="margin-top:14px">è®°å½•ç¬¬ä¸€åœºè€ƒè¯•</button></div></div></div>`}`;
};

const bindPageBeforeV13 = bindPage;
bindPage = function bindPageV13() {
  bindPageBeforeV13();
  $$('[data-grade-filter-v13]').forEach((button)=>button.onclick=()=>{state.gradeFilter=button.dataset.gradeFilterV13;state.radarSelection=[];applyGradeFilterV13();render();});
  $$('[data-score-basis-v13]').forEach((button)=>button.onclick=()=>{state.scoreBasis=button.dataset.scoreBasisV13;render();});
};

const renderLoginBeforeV13 = renderLogin;
renderLogin = function renderLoginV13(error='') { renderLoginBeforeV13(error); const help=$('.auth-help'); if(help) help.textContent='æ”¯æŒæ¯æ¬¡è€ƒè¯•è‡ªç”±å¢å‡ç§‘ç›®ã€åŸå§‹åˆ†/èµ‹åˆ†ã€åæ¬¡/ç™¾åˆ†ä½ï¼Œä»¥åŠé«˜ä¸€é«˜äºŒé«˜ä¸‰åˆ†ç±»ã€‚'; };

/* ===== app-v14.js ===== */
// v14: customizable exam categories + separate raw/final full marks, kept intentionally simple
state.classification = state.classification || { label: 'å¹´çº§', options: ['é«˜ä¸€', 'é«˜äºŒ', 'é«˜ä¸‰'] };

(function injectV14Styles(){
  if ($('#app-v14-style')) return;
  const style=document.createElement('style'); style.id='app-v14-style'; style.textContent=`
    .category-settings-v14{margin-top:18px;padding:22px}
    .category-head-v14{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .category-chips-v14{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .category-chip-v14{border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:12px;color:#596474}
    .category-list-v14{display:grid;gap:8px;margin-top:14px}
    .category-row-v14{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:8px}
    .category-row-v14 input,.category-label-v14{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;outline:none;background:#fff}
    .category-row-v14 button{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:10px;font-size:17px}
    .score-compact-v14{display:grid;grid-template-columns:1fr 1.35fr 1.35fr;gap:8px}
    .score-with-max-v14{display:grid;grid-template-columns:minmax(0,1fr) auto 68px;gap:5px;align-items:center}
    .score-with-max-v14 span{font-size:11px;color:var(--muted)}
    .raw-box-v14{background:#fff9f1;border:1px solid #f3e2cb;border-radius:12px;padding:8px}
    .final-box-v14{background:#eefaf5;border:1px solid #b8e5ce;border-radius:12px;padding:8px}.score-entry-tip-v16{display:block;margin-top:3px;color:#299a72;font-size:10px;font-weight:600;line-height:1.35}.final-box-v14:focus-within{border-color:#8bd1ae;box-shadow:0 0 0 2px rgba(47,169,116,.12)}
    .target-box-v14{padding:8px}
    @media(max-width:620px){
      .category-settings-v14{padding:18px 16px}.category-head-v14{display:block}.category-head-v14 button{margin-top:10px}
      .score-compact-v14{grid-template-columns:1fr 1fr}.target-box-v14{grid-column:1/-1}.score-with-max-v14{grid-template-columns:minmax(0,1fr) auto 64px}
    }
  `; document.head.appendChild(style);
})();

function categoryOptionsV14(){
  const configured=(state.classification?.options||[]).map(v=>String(v||'').trim()).filter(Boolean);
  const used=(state.allExams||[]).map(e=>String(e.grade_level||'').trim()).filter(Boolean);
  return [...new Set([...configured,...used])];
}
function categoryLabelV14(){ return String(state.classification?.label||'åˆ†ç±»').trim() || 'åˆ†ç±»'; }
function rawMaxV14(exam,subject){ const row=exam?.scores?.[subject]||{}; return num(row.rawMax) ?? num(row.max) ?? defaultMax(subject); }
rawScoreRateV13=function rawScoreRateV14(exam,subject){ const score=examRawScoreV13(exam,subject),max=rawMaxV14(exam,subject); return score===null||!max?null:Math.max(0,Math.min(100,score/max*100)); };
totalRawMaxV13=function totalRawMaxV14(exam){ const names=Object.keys(exam?.scores||{});let sum=0,count=0;names.forEach(subject=>{const value=examRawScoreV13(exam,subject);if(value!==null){sum+=rawMaxV14(exam,subject);count++;}});return count?sum:null; };

applyGradeFilterV13=function applyCategoryFilterV14(){
  const source=state.unfilteredVisibleExamsV13||[];
  state.exams=state.gradeFilter==='å…¨éƒ¨'?[...source]:state.gradeFilter==='æœªåˆ†ç±»'?source.filter(e=>!e.grade_level):source.filter(e=>e.grade_level===state.gradeFilter);
  if(typeof applyExamSubjectsV10==='function') applyExamSubjectsV10(state.exams,state.subjectConfigs||[]);
  state.radarSelection=(state.radarSelection||[]).filter(id=>state.exams.some(e=>e.id===id)); ensureRadarSelection();
};

loadExams=async function loadExamsV14(){
  const data=await dataApiV7('list_exams');
  state.allExams=data.exams||[]; state.subjectConfigs=data.subjects||[];
  state.classification=data.classification||state.classification||{label:'å¹´çº§',options:['é«˜ä¸€','é«˜äºŒ','é«˜ä¸‰']};
  state.unfilteredVisibleExamsV13=state.allExams.filter(e=>!e.is_hidden);
  if(state.gradeFilter!=='å…¨éƒ¨'&&state.gradeFilter!=='æœªåˆ†ç±»'&&!categoryOptionsV14().includes(state.gradeFilter)) state.gradeFilter='å…¨éƒ¨';
  applyGradeFilterV13();
};

const homeHtmlBeforeV14=homeHtml;
homeHtml=function homeHtmlV14(){
  let html=homeHtmlBeforeV14();
  const opts=categoryOptionsV14();
  const bar=`<div class="grade-filter-v13"><span class="label">${escapeHtml(categoryLabelV14())}</span>${['å…¨éƒ¨',...opts,'æœªåˆ†ç±»'].map(v=>`<button class="grade-chip-v13 ${state.gradeFilter===v?'active':''}" data-grade-filter-v13="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join('')}</div>`;
  html=html.replace(/<div class="grade-filter-v13">[\s\S]*?<\/div><section class="grid-main">/,`${bar}<section class="grid-main">`);
  return html;
};

accountHtml=function accountHtmlV14(){
  const c=state.classification||{label:'å¹´çº§',options:['é«˜ä¸€','é«˜äºŒ','é«˜ä¸‰']};
  return `<div class="page-head"><div><h2>è´¦å·</h2><p>è´¦å·ä¸å°‘é‡åå¥½è®¾ç½®ã€‚</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">æˆ‘çš„è´¦å·</h3><div class="account-chip"><code>${escapeHtml(state.user?.username||'')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username||'')}">å¤åˆ¶</button></div></div><div class="card account-card"><h3 class="card-title">æ•°æ®ä¸å®‰å…¨</h3><p class="card-sub">è€ƒè¯•ä¸æˆç»©ä¿å­˜åœ¨äº‘ç«¯å¹¶æŒ‰è´¦å·éš”ç¦»ã€‚</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">é€€å‡ºç™»å½•</button></div></div></div><div class="card category-settings-v14"><div class="category-head-v14"><div><h3 class="card-title">è€ƒè¯•åˆ†ç±»</h3><p class="card-sub">åªä¿ç•™ä¸€ä¸ªåˆ†ç±»ç»´åº¦ï¼Œåç§°å’Œé€‰é¡¹éƒ½å¯ä»¥è‡ªå®šä¹‰ï¼Œä¾‹å¦‚â€œå¹´çº§ï¼šé«˜ä¸€/é«˜äºŒ/é«˜ä¸‰â€æˆ–â€œé˜¶æ®µï¼šä¸€è½®/äºŒè½®/å†²åˆºâ€ã€‚</p></div><button class="secondary" id="manageCategoriesV14">è®¾ç½®</button></div><div class="category-chips-v14"><span class="category-chip-v14"><b>${escapeHtml(c.label||'åˆ†ç±»')}</b></span>${(c.options||[]).map(v=>`<span class="category-chip-v14">${escapeHtml(v)}</span>`).join('')}</div></div>`;
};

function openCategoryManagerV14(){
  const draft={label:categoryLabelV14(),options:[...(state.classification?.options||['é«˜ä¸€','é«˜äºŒ','é«˜ä¸‰'])]};
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>è€ƒè¯•åˆ†ç±»è®¾ç½®</h3><button class="close-btn">Ã—</button></div><div class="modal-body"><div class="field"><label>åˆ†ç±»åç§°</label><input class="category-label-v14" id="categoryLabelV14" maxlength="16" value="${escapeHtml(draft.label)}" placeholder="ä¾‹å¦‚ï¼šå¹´çº§ / é˜¶æ®µ / å­¦æœŸ"></div><div class="category-list-v14" id="categoryListV14"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addCategoryV14">ï¼‹ æ·»åŠ é€‰é¡¹</button><div><button class="secondary cancel-btn">å–æ¶ˆ</button> <button class="primary" id="saveCategoryV14">ä¿å­˜</button></div></div><p class="form-note">ä¿®æ”¹åˆ†ç±»è®¾ç½®ä¸ä¼šæ”¹åŠ¨å†å²è€ƒè¯•å·²æœ‰çš„åˆ†ç±»å€¼ï¼Œé¿å…è¯¯æ”¹æ—§æ•°æ®ï¼›å†å²åˆ†ç±»ä»ä¼šæ­£å¸¸æ˜¾ç¤ºã€‚</p></div></div>`;document.body.appendChild(modal);state.modal=modal;
  const list=$('#categoryListV14',modal);const renderRows=()=>{list.innerHTML=draft.options.map(v=>`<div class="category-row-v14"><input maxlength="20" value="${escapeHtml(v)}" placeholder="åˆ†ç±»é€‰é¡¹"><button type="button">Ã—</button></div>`).join('');$$('.category-row-v14 button',list).forEach((b,i)=>b.onclick=()=>{if(draft.options.length<=1)return toast('è‡³å°‘ä¿ç•™ 1 ä¸ªåˆ†ç±»');sync();draft.options.splice(i,1);renderRows();});};
  const sync=()=>{draft.options=$$('.category-row-v14 input',list).map(i=>i.value.trim());}; renderRows();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  $('#addCategoryV14',modal).onclick=()=>{sync();if(draft.options.length>=12)return toast('æœ€å¤š 12 ä¸ªåˆ†ç±»');draft.options.push('');renderRows();$('.category-row-v14:last-child input',list)?.focus();};
  $('#saveCategoryV14',modal).onclick=async()=>{sync();draft.label=$('#categoryLabelV14',modal).value.trim();if(!draft.label)return toast('è¯·å¡«å†™åˆ†ç±»åç§°');if(draft.options.some(v=>!v))return toast('è¯·å¡«å†™å®Œæ•´çš„åˆ†ç±»é€‰é¡¹');if(new Set(draft.options).size!==draft.options.length)return toast('åˆ†ç±»åç§°ä¸èƒ½é‡å¤');const btn=$('#saveCategoryV14',modal);btn.disabled=true;btn.textContent='ä¿å­˜ä¸­â€¦';try{const data=await dataApiV7('save_classification',{classification:draft});state.classification=data.classification;close();render();toast('åˆ†ç±»è®¾ç½®å·²ä¿å­˜');}catch(e){toast(e.message);btn.disabled=false;btn.textContent='ä¿å­˜';}};
}

function seedRowsV14(exam){
  if(exam)return Object.entries(exam.scores||{}).map(([name,row])=>({name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??''}));
  const last=state.exams.at(-1)||state.unfilteredVisibleExamsV13.at(-1);if(last&&Object.keys(last.scores||{}).length)return Object.entries(last.scores).map(([name,row])=>({name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:''}));
  const templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(name=>({name,defaultMax:defaultMax(name)}));return templates.map(item=>({name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:''}));
}

openExam=function openExamV14(exam=null){
  const editing=!!exam,today=new Date().toISOString().slice(0,10),rows=seedRowsV14(exam),options=categoryOptionsV14(),selected=exam?.grade_level||(!editing?(state.unfilteredVisibleExamsV13.at(-1)?.grade_level||''):'');
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'ç¼–è¾‘è€ƒè¯•':'è®°å½•ä¸€æ¬¡è€ƒè¯•'}</h3><button class="close-btn">Ã—</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>è€ƒè¯•åç§°</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="ä¾‹å¦‚ï¼šæœŸä¸­è€ƒè¯•"></div><div class="field"><label>è€ƒè¯•æ—¥æœŸ</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">æœªåˆ†ç±»</option>${options.map(v=>`<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div></div><div class="section-head-v7"><div><h4>æœ¬æ¬¡è€ƒè¯•ç§‘ç›®</h4><p>åŸå§‹åˆ†å’Œèµ‹åˆ†/æœ€ç»ˆåˆ†ä½¿ç”¨å„è‡ªçš„æ»¡åˆ†ï¼›ä¾‹å¦‚ä¸Šæµ·å°ç§‘å¯å¡«â€œåŸå§‹ 85 / 100ï¼Œèµ‹åˆ† 61 / 70â€ã€‚</p></div></div><div class="exam-subjects-v10" id="examSubjectsV14"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV14">ï¼‹ æ·»åŠ ç§‘ç›® / æ¨¡å—</button></div><div class="score-total-preview-v13"><div class="score-total-box-v13"><span>åŸå§‹æ€»åˆ†</span><b id="rawTotalV14">â€”</b></div><div class="score-total-box-v13"><span>èµ‹åˆ† / æœ€ç»ˆæ€»åˆ†</span><b id="finalTotalV14">â€”</b></div></div><div class="section-head-v7"><div><h4>æ€»æ’åï¼ˆå¯é€‰ï¼‰</h4></div></div><div class="rank-table-v7"><div class="rank-row-v7 header"><span>é¡¹ç›®</span><span>åæ¬¡</span><span>å‚è€ƒäººæ•°</span></div><div class="rank-row-v7 total"><span>æ€»åˆ†</span><input id="totalRankV14" inputmode="numeric" value="${exam?.total_rank??''}"><input id="totalParticipantsV14" inputmode="numeric" value="${exam?.total_participants??''}"></div></div><div class="visibility-box-v10"><div><b>å›¾è¡¨æ˜¾ç¤º</b><span>${exam?.is_hidden?'å·²éšè—ï¼Œä¸å‚ä¸å›¾è¡¨ã€‚':'æ­£å¸¸å‚ä¸å›¾è¡¨ã€‚'}</span></div><button class="secondary" id="toggleHiddenV14">${exam?.is_hidden?'æ¢å¤æ˜¾ç¤º':'éšè—'}</button><input type="hidden" id="examHiddenV14" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV14">åˆ é™¤è¿™æ¬¡è€ƒè¯•</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary save-btn">${editing?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•'}</button></div></div></div>`;document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV14',modal);
  const sync=()=>{const next=$$('.exam-subject-card-v10',list).map(card=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value}));rows.splice(0,rows.length,...next);};
  const totals=()=>{sync();$('#rawTotalV14',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV14',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const card=row=>`<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="ç§‘ç›® / æ¨¡å—"><button class="remove-exam-subject-v10" type="button">Ã—</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>ç›®æ ‡</label><input class="target-v14" inputmode="decimal" value="${row.target??''}" placeholder="å¯ç•™ç©º"></div><div class="mini-field-v10 final-box-v14"><label>æœ€ç»ˆåˆ†ï¼ˆèµ‹åˆ†åï¼‰<span class="score-entry-tip-v16">æ— èµ‹åˆ†ä¹Ÿå¡«è¿™é‡Œ</span></label><div class="score-with-max-v14"><input class="actual-v14" inputmode="decimal" value="${row.actual??''}" placeholder="å¾—åˆ†"><span>/</span><input class="max-v14" inputmode="decimal" value="${row.max??100}" placeholder="æ»¡åˆ†"></div></div><div class="mini-field-v10 raw-box-v14"><label>åŸå§‹åˆ†</label><div class="score-with-max-v14"><input class="raw-v14" inputmode="decimal" value="${row.raw??''}" placeholder="å¾—åˆ†"><span>/</span><input class="rawmax-v14" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="æ»¡åˆ†"></div></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>åæ¬¡</label><input class="rank-v14" inputmode="numeric" value="${row.rank??''}" placeholder="å¯ç•™ç©º"></div><div class="mini-field-v10"><label>å‚è€ƒäººæ•°</label><input class="participants-v14" inputmode="numeric" value="${row.participants??''}" placeholder="ç•™ç©º=æ€»äººæ•°"></div></div></div>`;
  const renderRows=()=>{list.innerHTML=rows.map(card).join('');$$('.remove-exam-subject-v10',list).forEach((b,i)=>b.onclick=()=>{sync();rows.splice(i,1);renderRows();totals()});$$('input',list).forEach(i=>i.addEventListener('input',totals));};renderRows();totals();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('#addExamSubjectV14',modal).onclick=()=>{sync();if(rows.length>=40)return toast('æœ€å¤š 40 ä¸ªç§‘ç›® / æ¨¡å—');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};$('#toggleHiddenV14',modal).onclick=()=>{const input=$('#examHiddenV14',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenV14',modal).textContent=next?'æ¢å¤æ˜¾ç¤º':'éšè—';$('.visibility-box-v10 span',modal).textContent=next?'ä¿å­˜åä¸å‚ä¸å›¾è¡¨ã€‚':'ä¿å­˜åæ­£å¸¸å‚ä¸å›¾è¡¨ã€‚';};$('#deleteExamV14',modal)?.addEventListener('click',async()=>{if(!confirm(`ç¡®å®šæ°¸ä¹…åˆ é™¤ã€Œ${exam?.name||'è¿™æ¬¡è€ƒè¯•'}ã€ï¼Ÿ`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('å·²åˆ é™¤');}catch(e){toast(e.message)}});$('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam=function validateExamV14(exam){
  const tr=num(exam.total_rank),tp=num(exam.total_participants);if(tr!==null&&(!Number.isInteger(tr)||tr<1))return'æ€»æ’åè¯·è¾“å…¥æ­£æ•´æ•°';if(tp!==null&&(!Number.isInteger(tp)||tp<1))return'å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°';if(tr!==null&&tp!==null&&tr>tp)return'æ€»æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°';
  for(const[name,row]of Object.entries(exam.scores||{})){const max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??tp;if(max<=0||rawMax<=0)return`${name} çš„æ»¡åˆ†å¿…é¡»å¤§äº 0`;if(target!==null&&target>max)return`${name}ç›®æ ‡ä¸èƒ½è¶…è¿‡æœ€ç»ˆæ»¡åˆ† ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name}èµ‹åˆ†/æœ€ç»ˆåˆ†ä¸èƒ½è¶…è¿‡æœ€ç»ˆæ»¡åˆ† ${formatScore(max)}`;if(raw!==null&&raw>rawMax)return`${name}åŸå§‹åˆ†ä¸èƒ½è¶…è¿‡åŸå§‹æ»¡åˆ† ${formatScore(rawMax)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}æ’åè¯·è¾“å…¥æ­£æ•´æ•°`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}å‚è€ƒäººæ•°è¯·è¾“å…¥æ­£æ•´æ•°`;if(rank!==null&&effective!==null&&rank>effective)return`${name}æ’åä¸èƒ½å¤§äºå‚è€ƒäººæ•°`;}
  return'';
};

saveExam=async function saveExamV14(id,modal){
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV14',modal)?.value||'',total_participants:$('#totalParticipantsV14',modal)?.value||'',is_hidden:$('#examHiddenV14',modal)?.value==='1',scores:{}};const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('è¯·å¡«å†™ç§‘ç›®åç§°ï¼Œæˆ–åˆ é™¤ç©ºç™½ç§‘ç›®');if(seen.has(name))return toast(`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`);seen.add(name);exam.scores[name]={target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value};}if(!exam.name||!exam.exam_date)return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='ä¿å­˜ä¸­â€¦';try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'å·²ä¿å­˜ä¿®æ”¹':'è€ƒè¯•å·²è®°å½•');}catch(e){toast(e.message);btn.disabled=false;btn.textContent=id?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•';}
};

recordsHtml=function recordsHtmlV14(){
  const exams=state.allExams||[],hidden=exams.filter(e=>e.is_hidden).length,order=categoryOptionsV14(),groups=[...order.map(v=>({name:v,exams:exams.filter(e=>e.grade_level===v)})),{name:'æœªåˆ†ç±»',exams:exams.filter(e=>!e.grade_level)}].filter(g=>g.exams.length);
  return `<div class="page-head"><div><h2>è€ƒè¯•è®°å½•</h2><p>æŒ‰${escapeHtml(categoryLabelV14())}åˆ†ç»„ï¼›æ¯æ¬¡è€ƒè¯•çš„ç§‘ç›®å½¼æ­¤ç‹¬ç«‹ã€‚${hidden?` ${hidden} æ¬¡å·²éšè—ã€‚`:''}</p></div><button class="primary" id="addExam">ï¼‹ æ–°å»º</button></div>${groups.length?groups.map(g=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} æ¬¡</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>è¿˜æ²¡æœ‰è€ƒè¯•è®°å½•<br><button class="secondary" id="emptyAdd" style="margin-top:14px">è®°å½•ç¬¬ä¸€åœºè€ƒè¯•</button></div></div></div>`}`;
};

const recordHtmlBeforeV14=recordHtml;
recordHtml=function recordHtmlV14(exam){let html=recordHtmlBeforeV14(exam);html=html.replace(/<span class="grade-badge-v13">[\s\S]*?<\/span>/,`<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'æœªåˆ†ç±»')}</span>`);return html;};

const bindPageBeforeV14=bindPage;
bindPage=function bindPageV14(){bindPageBeforeV14();$('#manageCategoriesV14')?.addEventListener('click',openCategoryManagerV14);$$('[data-grade-filter-v13]').forEach(button=>button.onclick=()=>{state.gradeFilter=button.dataset.gradeFilterV13;state.radarSelection=[];applyGradeFilterV13();render();});};

/* ===== app-v15.js ===== */
// v15: simple in-app password change setting
(function injectV15Styles(){
  if (document.getElementById('app-v15-style')) return;
  var style=document.createElement('style');
  style.id='app-v15-style';
  style.textContent='\n    .password-card-v15{margin-top:18px;padding:22px}\n    .password-grid-v15{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-top:14px}\n    .password-grid-v15 .field{margin:0}\n    .password-note-v15{font-size:12px;color:var(--muted);line-height:1.6;margin-top:10px}\n    @media(max-width:620px){.password-card-v15{padding:18px 16px}.password-grid-v15{grid-template-columns:1fr}.password-grid-v15 button{width:100%}}\n  ';
  document.head.appendChild(style);
})();

var PASSWORD_API_V15='/api/score-tracker-data-api';

async function changePasswordApiV15(newPassword){
  var response=await fetch(PASSWORD_API_V15,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'change_password',token:state.token,newPassword:newPassword})
  });
  var data=await response.json().catch(function(){return {error:'ç½‘ç»œå“åº”å¼‚å¸¸'};});
  if(!response.ok) throw new Error(data.error||'å¯†ç ä¿®æ”¹å¤±è´¥');
  return data;
}

var accountHtmlBeforeV15=accountHtml;
accountHtml=function accountHtmlV15(){
  var html=accountHtmlBeforeV15();
  return html+`<div class="card password-card-v15"><div><h3 class="card-title">ä¿®æ”¹å¯†ç </h3><p class="card-sub">å·²ç™»å½•æ—¶å¯ç›´æ¥è®¾ç½®ä¸€ä¸ªæ›´å¥½è®°çš„æ–°å¯†ç ã€‚</p></div><div class="password-grid-v15"><div class="field"><label>æ–°å¯†ç </label><input id="newPasswordV15" type="password" autocomplete="new-password" placeholder="6ï½20ä½ï¼Œå¯å«å­—æ¯æ•°å­—ç¬¦å·"></div><div class="field"><label>å†æ¬¡è¾“å…¥</label><input id="confirmPasswordV15" type="password" autocomplete="new-password" placeholder="å†æ¬¡è¾“å…¥æ–°å¯†ç "></div><button class="primary" id="changePasswordV15">ä¿å­˜æ–°å¯†ç </button></div><div class="password-note-v15">ä¿®æ”¹æˆåŠŸåå½“å‰è®¾å¤‡ä¸ä¼šé€€å‡ºï¼Œä»¥åé‡æ–°ç™»å½•è¯·ä½¿ç”¨æ–°å¯†ç ã€‚å»ºè®®è®¾ç½® 6ï½20 ä½ï¼Œå¯ä½¿ç”¨å¤§å°å†™å­—æ¯ã€æ•°å­—å’Œç¬¦å·ã€‚</div></div>`;
};

var bindPageBeforeV15=bindPage;
bindPage=function bindPageV15(){
  bindPageBeforeV15();
  var button=document.getElementById('changePasswordV15');
  if(button){
    button.onclick=async function(){
      var first=(document.getElementById('newPasswordV15')||{}).value||'';
      var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
      if(!/^[\x21-\x7E]{6,20}$/.test(first)) return toast('æ–°å¯†ç è¯·è®¾ç½® 6ï½20 ä½ï¼Œå¯ä½¿ç”¨å¤§å°å†™å­—æ¯ã€æ•°å­—å’Œç¬¦å·');
      if(first!==second) return toast('ä¸¤æ¬¡è¾“å…¥çš„å¯†ç ä¸ä¸€è‡´');
      button.disabled=true;
      button.textContent='ä¿å­˜ä¸­â€¦';
      try{
        await changePasswordApiV15(first);
        document.getElementById('newPasswordV15').value='';
        document.getElementById('confirmPasswordV15').value='';
        toast('å¯†ç å·²ä¿®æ”¹ï¼Œè¯·è®°ä½æ–°å¯†ç ');
      }catch(e){
        toast(e&&e.message?e.message:'å¯†ç ä¿®æ”¹å¤±è´¥');
      }finally{
        button.disabled=false;
        button.textContent='ä¿å­˜æ–°å¯†ç ';
      }
    };
  }
};

var renderLoginBeforeV15=renderLogin;
renderLogin=function renderLoginV15(error){
  renderLoginBeforeV15(error);
  var passwordInput=document.getElementById('loginPass');
  if(passwordInput) passwordInput.placeholder='è¾“å…¥å¯†ç ';
  var help=document.querySelector('.auth-help');
  if(help) help.textContent='æ–°è´¦å·ä¼šç”Ÿæˆ 10 ä½æ•°å­—å¯†ç ï¼›ç™»å½•åå¯åœ¨è´¦å·é¡µæ”¹æˆè‡ªå·±çš„ 6ï½20 ä½æ•°å­—å¯†ç ã€‚';
};

/* ===== app-v16.js ===== */
// v16: split rankings into year-grade rank and class rank while preserving all old rank data as year-grade rank.
state.rankScopeV16 = state.rankScopeV16 || 'year';

(function injectV16Styles(){
  if (document.getElementById('app-v16-style')) return;
  var style=document.createElement('style');
  style.id='app-v16-style';
  style.textContent=`
    .rank-scope-v16,.rank-view-v16{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
    .rank-scope-v16 .label,.rank-view-v16 .label{font-size:12px;font-weight:700;color:var(--muted)}
    .rank-view-v16{margin-top:-2px}
    .rank-view-v16 .metric-btn-v7{padding:6px 10px;font-size:11px}
    .total-ranks-v16{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .rank-scope-card-v16{border:1px solid var(--line);border-radius:14px;padding:11px;background:#fafbfe}
    .rank-scope-card-v16 b{display:block;font-size:12px;margin-bottom:8px}
    .rank-pair-v16{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .rank-pair-v16 label{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .rank-pair-v16 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;background:#fff;outline:none}
    .subject-ranks-v16{display:grid;gap:7px;margin-top:8px}
    .subject-rank-row-v16{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(0,1fr);gap:7px;align-items:center}
    .subject-rank-row-v16>span{font-size:11px;font-weight:700;color:#596474}
    .subject-rank-row-v16 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:8px 7px;background:#fff;outline:none;font-size:12px}
    .rank-compat-v16{font-size:11px;line-height:1.6;color:var(--muted);margin-top:9px}
    .record-ranks-v16{display:inline-flex;gap:6px;flex-wrap:wrap}
    @media(max-width:620px){
      .rank-scope-v16{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}
      .rank-scope-v16 .label{grid-column:1/-1}.rank-scope-v16 .metric-btn-v7{width:100%}
      .rank-view-v16{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .rank-view-v16 .label{grid-column:1/-1}.rank-view-v16 .metric-btn-v7{width:100%}
      .total-ranks-v16{grid-template-columns:1fr}
      .subject-rank-row-v16{grid-template-columns:44px minmax(0,1fr) minmax(0,1fr)}
    }
  `;
  document.head.appendChild(style);
})();

function rankScopeLabelV16(scope){ return scope === 'class' ? 'ç­æ’' : 'å¹´æ’'; }
function rankScopeLongLabelV16(scope){ return scope === 'class' ? 'ç­çº§æ’å' : 'å¹´çº§æ’å'; }
function rankInfoByScopeV16(exam, subject, scope){
  if (!exam) return { rank:null, participants:null, performance:null };
  var isClass = scope === 'class';
  if (subject === 'æ€»åˆ†') {
    var rank = num(isClass ? exam.total_class_rank : exam.total_rank);
    var participants = num(isClass ? exam.total_class_participants : exam.total_participants);
    return { rank:rank, participants:participants, performance:rankPerformanceV7(rank,participants) };
  }
  var row = exam.scores?.[subject] || {};
  var rank = num(isClass ? row.classRank : row.rank);
  var participants = num(isClass ? row.classParticipants : row.participants);
  if (participants === null) participants = num(isClass ? exam.total_class_participants : exam.total_participants);
  return { rank:rank, participants:participants, performance:rankPerformanceV7(rank,participants) };
}

rankInfoV7 = function rankInfoV16(exam,subject){ return rankInfoByScopeV16(exam,subject,state.rankScopeV16); };
rawRankValueV11 = function rawRankValueV16(exam,subject){ return rankInfoByScopeV16(exam,subject,state.rankScopeV16).rank; };

var rawRankChartBeforeV16 = rawRankChartHtmlV11;
rawRankChartHtmlV11 = function rawRankChartHtmlV16(){
  var html=rawRankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/åŸå§‹åæ¬¡æ¨¡å¼/g, label+'æ¨¡å¼')
    .replace(/åŸå§‹åæ¬¡/g, label)
    .replace(/è¿™ä¸ªé¡¹ç›®è¿˜æ²¡æœ‰åæ¬¡æ•°æ®/g, 'è¿™ä¸ªé¡¹ç›®è¿˜æ²¡æœ‰'+label+'æ•°æ®')
    .replace(/è®°å½•åæ¬¡å/g, 'è®°å½•'+label+'å');
};

var rankChartBeforeV16 = rankChartHtmlV7;
rankChartHtmlV7 = function rankChartHtmlV16(){
  var html=rankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/æ’åè¶‹åŠ¿åˆ†æ/g, label+'ç™¾åˆ†ä½è¶‹åŠ¿åˆ†æ')
    .replace(/è¿™ä¸ªç§‘ç›®è¿˜æ²¡æœ‰æ’åæ•°æ®/g, 'è¿™ä¸ªç§‘ç›®è¿˜æ²¡æœ‰'+label+'æ•°æ®')
    .replace(/æ’åè¡¨ç°/g, label+'ç™¾åˆ†ä½');
};

var homeHtmlBeforeV16 = homeHtml;
homeHtml = function homeHtmlV16(){
  var html=homeHtmlBeforeV16();
  var isRank=state.trendMetric==='rank_raw'||state.trendMetric==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var toggle=`<div class="trend-metric-toggle-v7 rank-scope-v16"><span class="label">è¶‹åŠ¿ç±»å‹</span><button class="metric-btn-v7 ${!isRank&&state.trendMetric==='score'?'active':''}" data-trend-scope-v16="score">æˆç»©</button><button class="metric-btn-v7 ${isRank&&scope==='year'?'active':''}" data-trend-scope-v16="year">å¹´æ’</button><button class="metric-btn-v7 ${isRank&&scope==='class'?'active':''}" data-trend-scope-v16="class">ç­æ’</button></div>${isRank?`<div class="rank-view-v16"><span class="label">æŸ¥çœ‹</span><button class="metric-btn-v7 ${state.trendMetric==='rank_raw'?'active':''}" data-trend-metric="rank_raw">åæ¬¡</button><button class="metric-btn-v7 ${state.trendMetric==='rank'?'active':''}" data-trend-metric="rank">ç™¾åˆ†ä½</button></div>`:''}`;
  html=html.replace(/<div class="trend-metric-toggle-v7">[\s\S]*?<\/div>/,toggle);
  if(isRank){
    var title=state.trendMetric==='rank_raw'?scopeLabel+'è¶‹åŠ¿':scopeLabel+'ç™¾åˆ†ä½è¶‹åŠ¿';
    html=html.replace(/<h3 class="card-title">(?:æˆç»©è¶‹åŠ¿|åæ¬¡è¶‹åŠ¿|æ’åè¶‹åŠ¿)<\/h3>/,`<h3 class="card-title">${title}</h3>`);
    if(state.trendMetric==='rank_raw'){
      html=html.replace('ç›´æ¥çœ‹åŸå§‹ç¬¬å‡ åï¼›çºµè½´åå‘æ˜¾ç¤ºï¼Œç¬¬ 1 ååœ¨æœ€ä¸Šæ–¹',`ç›´æ¥çœ‹${scopeLabel}ç¬¬å‡ åï¼›çºµè½´è¶Šé«˜è¶Šå¥½ï¼Œç¬¬ 1 ååœ¨æœ€ä¸Šæ–¹`);
      html=html.replace('æ€»åˆ†ä¸å„ç§‘ç›´æ¥å åŠ åŸå§‹åæ¬¡ï¼›è¶Šé ä¸Šä»£è¡¨åæ¬¡è¶Šå¥½',`æ€»åˆ†ä¸å„ç§‘å åŠ ${scopeLabel}ï¼›è¶Šé ä¸Šä»£è¡¨åæ¬¡è¶Šå¥½`);
    }else{
      html=html.replace('ç”¨å‚è€ƒäººæ•°æŠŠåæ¬¡è½¬æ¢æˆå¯æ¯”è¾ƒçš„â€œæ’åè¡¨ç°â€ï¼Œé¿å…è€ƒè¯•éš¾åº¦å’Œäººæ•°å˜åŒ–å¹²æ‰°åˆ¤æ–­',`${scopeLabel}ç»“åˆå¯¹åº”å‚è€ƒäººæ•°æ¢ç®—æˆç™¾åˆ†ä½ï¼Œæ–¹ä¾¿ä¸åŒè€ƒè¯•ä¹‹é—´æ¯”è¾ƒ`);
      html=html.replace('æ€»åˆ†ä¸å„ç§‘æ’åç»Ÿä¸€æ¢ç®—ä¸ºæ’åè¡¨ç°ï¼›å‚è€ƒäººæ•°ä¸åŒä¹Ÿèƒ½æ”¾åœ¨ä¸€èµ·æ¯”è¾ƒ',`æ€»åˆ†ä¸å„ç§‘${scopeLabel}ç»Ÿä¸€æ¢ç®—æˆç™¾åˆ†ä½ï¼›å‚è€ƒäººæ•°å˜åŒ–æ—¶ä¹Ÿæ›´å¯æ¯”`);
    }
  }
  return html;
};

var radarChartBeforeV16 = radarChartHtml;
radarChartHtml = function radarChartHtmlV16(selected){
  var html=radarChartBeforeV16(selected);
  if(state.radarMode==='rank_raw'){
    var label=rankScopeLongLabelV16(state.rankScopeV16);
    html=html.replace(/åŸå§‹åæ¬¡/g,label).replace(/åæ¬¡æ•°æ®/g,label+'æ•°æ®');
  }
  if(state.radarMode==='rank'){
    var p=rankScopeLabelV16(state.rankScopeV16)+'ç™¾åˆ†ä½';
    html=html.replace(/æ’åç™¾åˆ†ä½/g,p);
  }
  return html;
};
var radarSummaryBeforeV16 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV16(selected){
  var html=radarSummaryBeforeV16(selected);
  if(state.radarMode==='rank_raw') html=html.replace(/åæ¬¡/g,rankScopeLabelV16(state.rankScopeV16));
  if(state.radarMode==='rank') html=html.replace(/æ’åç™¾åˆ†ä½/g,rankScopeLabelV16(state.rankScopeV16)+'ç™¾åˆ†ä½');
  return html;
};
radarCardHtml = function radarCardHtmlV16(){
  var available=radarAvailableExams();
  var selected=selectedRadarExams();
  var isRank=state.radarMode==='rank_raw'||state.radarMode==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var sub=state.radarMode==='rank_raw'
    ? `ç›´æ¥æŒ‰${scopeLabel}ç»˜åˆ¶ï¼šè¶Šé å¤–ä»£è¡¨åæ¬¡è¶Šå¥½ï¼Œç¬¬ 1 åæ–¹å‘æœ€å¤–ã€‚`
    : state.radarMode==='rank'
      ? `æŒ‰${scopeLabel}ç™¾åˆ†ä½ç»˜åˆ¶ï¼šè¶Šé å¤–ä»£è¡¨ç›¸å¯¹æ’åè¶Šå¥½ã€‚`
      : state.radarMode==='raw_score'
        ? 'æŒ‰åŸå§‹å¾—åˆ†ç‡ç»˜åˆ¶ï¼Œæ–¹ä¾¿æ¯”è¾ƒèµ‹åˆ†å‰åçš„å­¦ç§‘ç»“æ„ã€‚'
        : 'æŒ‰å¾—åˆ†ç‡ç»˜åˆ¶ï¼›æ²¡æœ‰æ•°æ®çš„ç§‘ç›®ä¼šè‡ªåŠ¨éšè—ï¼Œ6 ç§‘å°±æ˜¾ç¤ºå…­è¾¹å½¢ã€‚';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">å…¨éƒ¨ç§‘ç›®é›·è¾¾å›¾</h3><p class="card-sub">${sub}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">æŸ¥çœ‹å†…å®¹</span><button class="chip ${state.radarMode==='actual'?'active':''}" data-radar-mode="actual">æœ€ç»ˆåˆ†</button><button class="chip ${state.radarMode==='raw_score'?'active':''}" data-radar-mode="raw_score">åŸå§‹åˆ†</button><button class="chip ${state.radarMode==='target'?'active':''}" data-radar-mode="target">ç›®æ ‡</button><button class="chip ${isRank&&scope==='year'?'active':''}" data-radar-scope-v16="year">å¹´æ’</button><button class="chip ${isRank&&scope==='class'?'active':''}" data-radar-scope-v16="class">ç­æ’</button></div>${isRank?`<div class="rank-view-v16"><span class="label">æŸ¥çœ‹</span><button class="metric-btn-v7 ${state.radarMode==='rank_raw'?'active':''}" data-radar-mode="rank_raw">åæ¬¡</button><button class="metric-btn-v7 ${state.radarMode==='rank'?'active':''}" data-radar-mode="rank">ç™¾åˆ†ä½</button></div>`:''}<div><div class="subtle-note">æœ€å¤šå åŠ  4 æ¬¡è€ƒè¯•ï¼Œåªæ˜¾ç¤ºæ‰€é€‰è€ƒè¯•å…±åŒæ‹¥æœ‰æ•°æ®çš„ç§‘ç›®ï¼›åæ ‡ä¼šè‡ªåŠ¨ç¼©æ”¾ã€‚</div>${isRank?`<div class="rank-compat-v16">${scopeLabel}å’Œ${scopeLabel}äººæ•°éƒ½å¯æŒ‰ç§‘ç›®å•ç‹¬å¡«å†™ï¼›ç§‘ç›®äººæ•°ç•™ç©ºæ—¶è‡ªåŠ¨ä½¿ç”¨æ€»${scopeLabel}äººæ•°ã€‚</div>`:''}<div class="multi-select" style="margin-top:8px">${available.length?available.map(function(exam){return `<button class="select-pill ${state.radarSelection.includes(exam.id)?'active':''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} Â· ${fmtDate(exam.exam_date)}</button>`;}).join(''):`<span class="subtle-note">å½“å‰è¿˜æ²¡æœ‰å¯ç”¨äº${isRank?scopeLabel+'é›·è¾¾å›¾':'é›·è¾¾å›¾'}çš„æ•°æ®</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

function seedRowsV16(exam){
  if(exam) return Object.entries(exam.scores||{}).map(function(entry){
    var name=entry[0],row=entry[1]||{};
    return {name:name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??'',classRank:row.classRank??'',classParticipants:row.classParticipants??''};
  });
  var source=state.exams&&state.exams.length?state.exams[state.exams.length-1]:((state.unfilteredVisibleExamsV13||[]).length?state.unfilteredVisibleExamsV13[state.unfilteredVisibleExamsV13.length-1]:null);
  if(source&&Object.keys(source.scores||{}).length) return Object.entries(source.scores).map(function(entry){
    var name=entry[0],row=entry[1]||{};
    return {name:name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:'',classRank:'',classParticipants:''};
  });
  var templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(function(name){return {name:name,defaultMax:defaultMax(name)};});
  return templates.map(function(item){return {name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:'',classRank:'',classParticipants:''};});
}

openExam = function openExamV16(exam=null){
  var editing=!!exam;
  var today=new Date().toISOString().slice(0,10);
  var rows=seedRowsV16(exam);
  var options=categoryOptionsV14();
  var previous=(state.unfilteredVisibleExamsV13||[]);
  var last=previous.length?previous[previous.length-1]:null;
  var selected=exam?.grade_level||(!editing?(last?.grade_level||''):'');
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'ç¼–è¾‘è€ƒè¯•':'è®°å½•ä¸€æ¬¡è€ƒè¯•'}</h3><button class="close-btn">Ã—</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>è€ƒè¯•åç§°</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="ä¾‹å¦‚ï¼šæœŸä¸­è€ƒè¯•"></div><div class="field"><label>è€ƒè¯•æ—¥æœŸ</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">æœªåˆ†ç±»</option>${options.map(function(v){return `<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`;}).join('')}</select></div></div>
  <div class="section-head-v7"><div><h4>æœ¬æ¬¡è€ƒè¯•ç§‘ç›®</h4><p>ç§‘ç›®å¯è‡ªç”±å¢å‡ï¼›åŸå§‹åˆ†å’Œæœ€ç»ˆåˆ†å¯ä»¥ä½¿ç”¨ä¸åŒæ»¡åˆ†ã€‚</p></div></div><div class="exam-subjects-v10" id="examSubjectsV16"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV16">ï¼‹ æ·»åŠ ç§‘ç›® / æ¨¡å—</button></div>
  <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>åŸå§‹æ€»åˆ†</span><b id="rawTotalV16">â€”</b></div><div class="score-total-box-v13"><span>èµ‹åˆ† / æœ€ç»ˆæ€»åˆ†</span><b id="finalTotalV16">â€”</b></div></div>
  <div class="section-head-v7"><div><h4>æ’åï¼ˆå¯é€‰ï¼‰</h4><p>æ—§ç‰ˆâ€œåæ¬¡â€å·²ç»Ÿä¸€è§†ä¸ºå¹´æ’ï¼›ç­æ’æ˜¯æ–°å¢å­—æ®µï¼Œä¸ä¼šæ”¹åŠ¨å·²æœ‰æ•°æ®ã€‚</p></div></div><div class="total-ranks-v16"><div class="rank-scope-card-v16"><b>å¹´çº§æ’å</b><div class="rank-pair-v16"><div><label>åæ¬¡</label><input id="totalRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_rank??''}" placeholder="å¦‚ 36"></div><div><label>å¹´çº§äººæ•°</label><input id="totalParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_participants??''}" placeholder="å¦‚ 620"></div></div></div><div class="rank-scope-card-v16"><b>ç­çº§æ’å</b><div class="rank-pair-v16"><div><label>åæ¬¡</label><input id="totalClassRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_rank??''}" placeholder="å¦‚ 8"></div><div><label>ç­çº§äººæ•°</label><input id="totalClassParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_participants??''}" placeholder="å¦‚ 45"></div></div></div></div>
  <div class="rank-compat-v16">å„ç§‘çš„å¹´çº§/ç­çº§äººæ•°å¯ä»¥ç•™ç©ºï¼Œåˆ†åˆ«è‡ªåŠ¨æ²¿ç”¨ä¸Šé¢çš„æ€»å¹´çº§äººæ•° / æ€»ç­çº§äººæ•°ã€‚</div>
  <div class="visibility-box-v10"><div><b>å›¾è¡¨æ˜¾ç¤º</b><span>${exam?.is_hidden?'å·²éšè—ï¼Œä¸å‚ä¸å›¾è¡¨ã€‚':'æ­£å¸¸å‚ä¸å›¾è¡¨ã€‚'}</span></div><button class="secondary" id="toggleHiddenV16">${exam?.is_hidden?'æ¢å¤æ˜¾ç¤º':'éšè—'}</button><input type="hidden" id="examHiddenV16" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV16">åˆ é™¤è¿™æ¬¡è€ƒè¯•</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary save-btn">${editing?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•'}</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('examSubjectsV16');
  function sync(){
    var next=$$('.exam-subject-card-v10',list).map(function(card){return {
      name:$('.exam-subject-name-v10',card).value,
      target:$('.target-v16',card).value,
      raw:$('.raw-v16',card).value,
      actual:$('.actual-v16',card).value,
      rawMax:$('.rawmax-v16',card).value,
      max:$('.max-v16',card).value,
      rank:$('.year-rank-v16',card).value,
      participants:$('.year-participants-v16',card).value,
      classRank:$('.class-rank-v16',card).value,
      classParticipants:$('.class-participants-v16',card).value
    };});
    rows.splice(0,rows.length,...next);
  }
  function totals(){sync();document.getElementById('rawTotalV16').textContent=formatScore(rawTotalFromRowsV13(rows));document.getElementById('finalTotalV16').textContent=formatScore(finalTotalFromRowsV13(rows));}
  function card(row){return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="ç§‘ç›® / æ¨¡å—"><button class="remove-exam-subject-v10" type="button">Ã—</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>ç›®æ ‡</label><input class="target-v16" inputmode="decimal" value="${row.target??''}" placeholder="å¯ç•™ç©º"></div><div class="mini-field-v10 final-box-v14"><label>æœ€ç»ˆåˆ†ï¼ˆèµ‹åˆ†åï¼‰<span class="score-entry-tip-v16">æ— èµ‹åˆ†ä¹Ÿå¡«è¿™é‡Œ</span></label><div class="score-with-max-v14"><input class="actual-v16" inputmode="decimal" value="${row.actual??''}" placeholder="å¾—åˆ†"><span>/</span><input class="max-v16" inputmode="decimal" value="${row.max??100}" placeholder="æ»¡åˆ†"></div></div><div class="mini-field-v10 raw-box-v14"><label>åŸå§‹åˆ†</label><div class="score-with-max-v14"><input class="raw-v16" inputmode="decimal" value="${row.raw??''}" placeholder="å¾—åˆ†"><span>/</span><input class="rawmax-v16" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="æ»¡åˆ†"></div></div></div><div class="subject-ranks-v16"><div class="subject-rank-row-v16"><span>å¹´æ’</span><input class="year-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.rank??''}" placeholder="åæ¬¡"><input class="year-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.participants??''}" placeholder="å¹´çº§äººæ•°"></div><div class="subject-rank-row-v16"><span>ç­æ’</span><input class="class-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classRank??''}" placeholder="åæ¬¡"><input class="class-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classParticipants??''}" placeholder="ç­çº§äººæ•°"></div></div></div>`;}
  function renderRows(){
    list.innerHTML=rows.map(card).join('');
    $$('.remove-exam-subject-v10',list).forEach(function(button,index){button.onclick=function(){sync();rows.splice(index,1);renderRows();totals();};});
    $$('input',list).forEach(function(input){input.addEventListener('input',totals);});
  }
  renderRows();totals();
  function close(){modal.remove();state.modal=null;}
  $('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=function(event){if(event.target===modal)close();};
  document.getElementById('addExamSubjectV16').onclick=function(){sync();if(rows.length>=40)return toast('æœ€å¤š 40 ä¸ªç§‘ç›® / æ¨¡å—');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:'',classRank:'',classParticipants:''});renderRows();var inputs=list.querySelectorAll('.exam-subject-name-v10');if(inputs.length)inputs[inputs.length-1].focus();};
  document.getElementById('toggleHiddenV16').onclick=function(){var input=document.getElementById('examHiddenV16'),next=input.value!=='1';input.value=next?'1':'0';this.textContent=next?'æ¢å¤æ˜¾ç¤º':'éšè—';$('.visibility-box-v10 span',modal).textContent=next?'ä¿å­˜åä¸å‚ä¸å›¾è¡¨ã€‚':'ä¿å­˜åæ­£å¸¸å‚ä¸å›¾è¡¨ã€‚';};
  document.getElementById('deleteExamV16')?.addEventListener('click',async function(){if(!confirm(`ç¡®å®šæ°¸ä¹…åˆ é™¤ã€Œ${exam?.name||'è¿™æ¬¡è€ƒè¯•'}ã€ï¼Ÿ`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('å·²åˆ é™¤');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=function(){saveExam(exam?.id||null,modal);};
};

validateExam = function validateExamV16(exam){
  function validatePair(rankValue,participantsValue,label){
    var r=num(rankValue),p=num(participantsValue);
    if(r!==null&&(!Number.isInteger(r)||r<1))return label+'è¯·è¾“å…¥æ­£æ•´æ•°';
    if(p!==null&&(!Number.isInteger(p)||p<1))return label.replace('æ’å','äººæ•°')+'è¯·è¾“å…¥æ­£æ•´æ•°';
    if(r!==null&&p!==null&&r>p)return label+'ä¸èƒ½å¤§äºå‚è€ƒäººæ•°';
    return '';
  }
  var error=validatePair(exam.total_rank,exam.total_participants,'å¹´çº§æ€»æ’å');if(error)return error;
  error=validatePair(exam.total_class_rank,exam.total_class_participants,'ç­çº§æ€»æ’å');if(error)return error;
  var yearTotal=num(exam.total_participants),classTotal=num(exam.total_class_participants);
  for(var entry of Object.entries(exam.scores||{})){
    var name=entry[0],row=entry[1]||{},max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual);
    if(max<=0||rawMax<=0)return `${name} çš„æ»¡åˆ†å¿…é¡»å¤§äº 0`;
    if(target!==null&&target>max)return `${name}ç›®æ ‡ä¸èƒ½è¶…è¿‡æœ€ç»ˆæ»¡åˆ† ${formatScore(max)}`;
    if(actual!==null&&actual>max)return `${name}èµ‹åˆ†/æœ€ç»ˆåˆ†ä¸èƒ½è¶…è¿‡æœ€ç»ˆæ»¡åˆ† ${formatScore(max)}`;
    if(raw!==null&&raw>rawMax)return `${name}åŸå§‹åˆ†ä¸èƒ½è¶…è¿‡åŸå§‹æ»¡åˆ† ${formatScore(rawMax)}`;
    var yr=num(row.rank),yp=num(row.participants),cr=num(row.classRank),cp=num(row.classParticipants);
    if(yr!==null&&(!Number.isInteger(yr)||yr<1))return `${name}å¹´æ’è¯·è¾“å…¥æ­£æ•´æ•°`;
    if(yp!==null&&(!Number.isInteger(yp)||yp<1))return `${name}å¹´çº§äººæ•°è¯·è¾“å…¥æ­£æ•´æ•°`;
    if(cr!==null&&(!Number.isInteger(cr)||cr<1))return `${name}ç­æ’è¯·è¾“å…¥æ­£æ•´æ•°`;
    if(cp!==null&&(!Number.isInteger(cp)||cp<1))return `${name}ç­çº§äººæ•°è¯·è¾“å…¥æ­£æ•´æ•°`;
    var yEffective=yp??yearTotal,cEffective=cp??classTotal;
    if(yr!==null&&yEffective!==null&&yr>yEffective)return `${name}å¹´æ’ä¸èƒ½å¤§äºå¹´çº§äººæ•°`;
    if(cr!==null&&cEffective!==null&&cr>cEffective)return `${name}ç­æ’ä¸èƒ½å¤§äºç­çº§äººæ•°`;
  }
  return '';
};

saveExam = async function saveExamV16(id,modal){
  var button=$('.save-btn',modal);
  var exam={id:id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV16',modal)?.value||'',total_participants:$('#totalParticipantsV16',modal)?.value||'',total_class_rank:$('#totalClassRankV16',modal)?.value||'',total_class_participants:$('#totalClassParticipantsV16',modal)?.value||'',is_hidden:$('#examHiddenV16',modal)?.value==='1',scores:{}};
  var seen=new Set();
  for(var card of $$('.exam-subject-card-v10',modal)){
    var name=$('.exam-subject-name-v10',card).value.trim();
    if(!name)return toast('è¯·å¡«å†™ç§‘ç›®åç§°ï¼Œæˆ–åˆ é™¤ç©ºç™½ç§‘ç›®');
    if(seen.has(name))return toast(`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`);seen.add(name);
    exam.scores[name]={target:$('.target-v16',card).value,raw:$('.raw-v16',card).value,actual:$('.actual-v16',card).value,rawMax:$('.rawmax-v16',card).value,max:$('.max-v16',card).value,rank:$('.year-rank-v16',card).value,participants:$('.year-participants-v16',card).value,classRank:$('.class-rank-v16',card).value,classParticipants:$('.class-participants-v16',card).value};
  }
  if(!exam.name||!exam.exam_date)return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');
  var error=validateExam(exam);if(error)return toast(error);
  button.disabled=true;button.textContent='ä¿å­˜ä¸­â€¦';
  try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'å·²ä¿å­˜ä¿®æ”¹':'è€ƒè¯•å·²è®°å½•');}
  catch(e){toast(e.message);button.disabled=false;button.textContent=id?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•';}
};

var recordHtmlBeforeV16=recordHtml;
recordHtml=function recordHtmlV16(exam){
  var html=recordHtmlBeforeV16(exam);
  html=html.replace(/<span class="score-tag"><b>æ€»æ’å[\s\S]*?<\/span>/g,'');
  var year=rankInfoByScopeV16(exam,'æ€»åˆ†','year');
  var cls=rankInfoByScopeV16(exam,'æ€»åˆ†','class');
  var badges='';
  if(year.rank!==null)badges+=`<span class="score-tag"><b>å¹´æ’ ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;
  if(cls.rank!==null)badges+=`<span class="score-tag"><b>ç­æ’ ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;
  if(badges)html=html.replace('</div><div class="record-actions">',`${badges}</div><div class="record-actions">`);
  return html;
};

var bindPageBeforeV16=bindPage;
bindPage=function bindPageV16(){
  bindPageBeforeV16();
  $$('[data-trend-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.trendScopeV16;if(scope==='score'){state.trendMetric='score';}else{state.rankScopeV16=scope;if(state.trendMetric!=='rank_raw'&&state.trendMetric!=='rank')state.trendMetric='rank_raw';}render();};});
  $$('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){state.rankScopeV16=button.dataset.radarScopeV16;if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';ensureRadarSelection();render();};});
};
/* ===== app-v17.js ===== */
// v17 / product v1.1: direct position-percent input, statistical subtotal items, newest-first records.
state.rankEntryModeV17 = state.rankEntryModeV17 || 'rank';

(function injectV17Styles(){
  if (document.getElementById('app-v17-style')) return;
  var style=document.createElement('style');
  style.id='app-v17-style';
  style.textContent=`
    .rank-entry-mode-v17{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:4px 0 10px}
    .rank-entry-mode-v17 .label{font-size:11px;font-weight:700;color:var(--muted)}
    .rank-entry-mode-v17 button{border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;padding:7px 11px;font-size:11px}
    .rank-entry-mode-v17 button.active{background:var(--text);border-color:var(--text);color:#fff;font-weight:700}
    .position-total-v17{display:none;margin-top:8px}
    .position-total-v17 label{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .position-total-v17 input,.position-percent-v17{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;background:#fff;outline:none}
    .position-percent-v17{display:none;grid-column:2/4}
    .rank-entry-percent-v17 .rank-scope-card-v16 .rank-pair-v16{display:none}
    .rank-entry-percent-v17 .position-total-v17{display:block}
    .rank-entry-percent-v17 .subject-rank-row-v16>input:not(.position-percent-v17){display:none}
    .rank-entry-percent-v17 .position-percent-v17{display:block}
    .exclude-total-v17{display:flex;align-items:center;gap:7px;margin:-2px 0 9px;font-size:11px;color:#667085;cursor:pointer;user-select:none}
    .exclude-total-v17 input{width:16px!important;height:16px;margin:0;accent-color:#5d72e8}
    .stat-badge-v17{display:inline-flex;align-items:center;border:1px solid #d9e3f3;background:#f4f7fb;color:#65758b;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:700;margin-left:5px}
    .position-note-v17{font-size:10px;line-height:1.55;color:var(--muted);margin-top:7px}
    #app-version-v17{text-align:center;color:#a0a8b6;font-size:11px;padding:10px 12px calc(18px + env(safe-area-inset-bottom));letter-spacing:.03em}
    @media(max-width:620px){.rank-entry-mode-v17{display:grid;grid-template-columns:auto 1fr 1fr}.rank-entry-mode-v17 button{width:100%}.exclude-total-v17{margin-top:1px}}
  `;
  document.head.appendChild(style);
})();

(function addVersionFooterV17(){
  if (document.getElementById('app-version-v17')) return;
  var footer=document.createElement('footer');footer.id='app-version-v17';footer.textContent='Score Tracker Â· v1.1';document.body.appendChild(footer);
})();

function positionPerformanceV17(positionPercent){var p=num(positionPercent);if(p===null||p<0||p>100)return null;return Math.max(0,Math.min(100,100-p));}
var rankInfoByScopeBeforeV17=rankInfoByScopeV16;
rankInfoByScopeV16=function rankInfoByScopeV17(exam,subject,scope){if(!exam)return{rank:null,participants:null,performance:null,positionPercent:null,directPercent:false};var isClass=scope==='class';var direct=subject==='æ€»åˆ†'?num(isClass?exam.total_class_position_percent:exam.total_year_position_percent):num(exam.scores?.[subject]?.[isClass?'classPositionPercent':'yearPositionPercent']);var base=rankInfoByScopeBeforeV17(exam,subject,scope);if(direct!==null&&direct>=0&&direct<=100)return{...base,performance:positionPerformanceV17(direct),positionPercent:direct,directPercent:true};return{...base,positionPercent:null,directPercent:false};};
rankInfoV7=function rankInfoV17(exam,subject){return rankInfoByScopeV16(exam,subject,state.rankScopeV16);};
rawRankValueV11=function rawRankValueV17(exam,subject){return rankInfoByScopeV16(exam,subject,state.rankScopeV16).rank;};

function totalSubjectsV17(exam){return Object.keys(exam?.scores||{}).filter(function(name){return !exam.scores?.[name]?.excludeFromTotal;});}
totalFor=function totalForV17(exam,key){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examScore(exam,s,key);if(v!==null){sum+=v;count++;}});return count?sum:null;};
totalMax=function totalMaxV17(exam,key){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examScore(exam,s,key);if(v!==null){sum+=examMax(exam,s);count++;}});return count?sum:null;};
totalRawForV13=function totalRawForV17(exam){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examRawScoreV13(exam,s);if(v!==null){sum+=v;count++;}});return count?sum:null;};
totalRawMaxV13=function totalRawMaxV17(exam){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examRawScoreV13(exam,s);if(v!==null){sum+=rawMaxV14(exam,s);count++;}});return count?sum:null;};
rawTotalFromRowsV13=function rawTotalFromRowsV17(rows){var sum=0,count=0;(rows||[]).forEach(function(row){if(row.excludeFromTotal)return;var raw=num(row.raw),actual=num(row.actual),v=raw??actual;if(v!==null){sum+=v;count++;}});return count?sum:null;};
finalTotalFromRowsV13=function finalTotalFromRowsV17(rows){var sum=0,count=0;(rows||[]).forEach(function(row){if(row.excludeFromTotal)return;var v=num(row.actual);if(v!==null){sum+=v;count++;}});return count?sum:null;};

function hasDirectPercentV17(scope){var isClass=scope==='class';return(state.exams||[]).some(function(exam){if(num(isClass?exam.total_class_position_percent:exam.total_year_position_percent)!==null)return true;return Object.values(exam.scores||{}).some(function(row){return num(row?.[isClass?'classPositionPercent':'yearPositionPercent'])!==null;});});}
function hasRawRankV17(scope){var isClass=scope==='class';return(state.exams||[]).some(function(exam){if(num(isClass?exam.total_class_rank:exam.total_rank)!==null)return true;return Object.values(exam.scores||{}).some(function(row){return num(row?.[isClass?'classRank':'rank'])!==null;});});}

var openExamBeforeV17=openExam;
openExam=function openExamV17(exam=null){
  openExamBeforeV17(exam);var modal=state.modal;if(!modal)return;
  var initial={};Object.entries(exam?.scores||{}).forEach(function(entry){var name=entry[0],row=entry[1]||{};initial[name]={excludeFromTotal:!!row.excludeFromTotal,yearPositionPercent:row.yearPositionPercent??'',classPositionPercent:row.classPositionPercent??''};});var customState={...initial};
  var directExists=num(exam?.total_year_position_percent)!==null||num(exam?.total_class_position_percent)!==null||Object.values(exam?.scores||{}).some(function(row){return num(row?.yearPositionPercent)!==null||num(row?.classPositionPercent)!==null;});var rankExists=num(exam?.total_rank)!==null||num(exam?.total_class_rank)!==null||Object.values(exam?.scores||{}).some(function(row){return num(row?.rank)!==null||num(row?.classRank)!==null;});var mode=directExists&&!rankExists?'percent':'rank';modal.dataset.rankEntryModeV17=mode;modal.classList.toggle('rank-entry-percent-v17',mode==='percent');
  var totalRanks=modal.querySelector('.total-ranks-v16');
  if(totalRanks&&!modal.querySelector('.rank-entry-mode-v17')){var switcher=document.createElement('div');switcher.className='rank-entry-mode-v17';switcher.innerHTML='<span class="label">å½•å…¥æ–¹å¼</span><button type="button" data-entry-mode-v17="rank">åæ¬¡</button><button type="button" data-entry-mode-v17="percent">ä½æ¯”</button>';totalRanks.parentNode.insertBefore(switcher,totalRanks);var cards=totalRanks.querySelectorAll('.rank-scope-card-v16');cards.forEach(function(card,index){var wrap=document.createElement('div');wrap.className='position-total-v17';var value=index===0?(exam?.total_year_position_percent??''):(exam?.total_class_position_percent??'');wrap.innerHTML='<label>ä½æ¯”ï¼ˆå‰ %ï¼‰</label><input class="'+(index===0?'total-year-position-v17':'total-class-position-v17')+'" inputmode="decimal" value="'+escapeHtml(value)+'" placeholder="å¦‚ 12.5">';card.appendChild(wrap);});var note=document.createElement('div');note.className='position-note-v17';note.textContent='ä½æ¯”æŒ‰æˆç»©å•â€œå‰ x%â€åŸæ ·å¡«å†™ï¼›è¶‹åŠ¿å›¾ä¼šè‡ªåŠ¨æ¢ç®—æˆè¶Šé«˜è¶Šå¥½çš„ç™¾åˆ†ä½ã€‚';totalRanks.insertAdjacentElement('afterend',note);}
  function snapshotCustom(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var name=card.querySelector('.exam-subject-name-v10')?.value.trim();if(!name)return;customState[name]={excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked,yearPositionPercent:card.querySelector('.year-position-v17')?.value??'',classPositionPercent:card.querySelector('.class-position-v17')?.value??''};});}
  function decorate(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){if(card.dataset.v17Decorated==='1')return;card.dataset.v17Decorated='1';var name=card.querySelector('.exam-subject-name-v10')?.value.trim()||'',saved=customState[name]||initial[name]||{excludeFromTotal:false,yearPositionPercent:'',classPositionPercent:''};var head=card.querySelector('.exam-subject-head-v10');if(head){var label=document.createElement('label');label.className='exclude-total-v17';label.innerHTML='<input type="checkbox" class="exclude-total-check-v17" '+(saved.excludeFromTotal?'checked':'')+'> <span>ç»Ÿè®¡é¡¹ï¼Œä¸è®¡å…¥æ€»åˆ†</span>';head.insertAdjacentElement('afterend',label);}var rankRows=card.querySelectorAll('.subject-rank-row-v16');rankRows.forEach(function(row,index){var input=document.createElement('input');input.className='position-percent-v17 '+(index===0?'year-position-v17':'class-position-v17');input.inputMode='decimal';input.placeholder='ä½æ¯”ï¼ˆå‰%ï¼‰';input.value=index===0?(saved.yearPositionPercent??''):(saved.classPositionPercent??'');row.appendChild(input);});});}
  function updateMode(){var current=modal.dataset.rankEntryModeV17||'rank';modal.classList.toggle('rank-entry-percent-v17',current==='percent');modal.querySelectorAll('[data-entry-mode-v17]').forEach(function(button){button.classList.toggle('active',button.dataset.entryModeV17===current);});}
  function updateTotals(){var rows=[...modal.querySelectorAll('.exam-subject-card-v10')].map(function(card){return{raw:card.querySelector('.raw-v16')?.value,actual:card.querySelector('.actual-v16')?.value,excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked};});var rawEl=modal.querySelector('#rawTotalV16'),finalEl=modal.querySelector('#finalTotalV16');if(rawEl)rawEl.textContent=formatScore(rawTotalFromRowsV13(rows));if(finalEl)finalEl.textContent=formatScore(finalTotalFromRowsV13(rows));}
  decorate();updateMode();updateTotals();modal.querySelectorAll('[data-entry-mode-v17]').forEach(function(button){button.onclick=function(){snapshotCustom();modal.dataset.rankEntryModeV17=button.dataset.entryModeV17;updateMode();};});modal.addEventListener('input',function(){snapshotCustom();setTimeout(updateTotals,0);});modal.addEventListener('change',function(){snapshotCustom();setTimeout(updateTotals,0);});modal.addEventListener('click',function(event){if(event.target.closest('#addExamSubjectV16,.remove-exam-subject-v10'))snapshotCustom();},true);var observer=new MutationObserver(function(){decorate();updateMode();updateTotals();});var list=modal.querySelector('#examSubjectsV16');if(list)observer.observe(list,{childList:true,subtree:true});
};

var validateExamBeforeV17=validateExam;
validateExam=function validateExamV17(exam){var base=validateExamBeforeV17(exam);if(base)return base;function check(v,label){if(v===null||v===undefined||v==='')return'';var n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?'':label+'è¯·è¾“å…¥ 0ï½100';}var e=check(exam.total_year_position_percent,'å¹´çº§ä½æ¯”');if(e)return e;e=check(exam.total_class_position_percent,'ç­çº§ä½æ¯”');if(e)return e;for(var entry of Object.entries(exam.scores||{})){var name=entry[0],row=entry[1]||{};e=check(row.yearPositionPercent,name+'å¹´çº§ä½æ¯”');if(e)return e;e=check(row.classPositionPercent,name+'ç­çº§ä½æ¯”');if(e)return e;}return'';};

saveExam=async function saveExamV17(id,modal){var button=modal.querySelector('.save-btn'),mode=modal.dataset.rankEntryModeV17||'rank';var exam={id:id,name:modal.querySelector('#examName').value.trim(),exam_date:modal.querySelector('#examDate').value,grade_level:modal.querySelector('#gradeLevelV14')?.value||'',total_rank:mode==='rank'?(modal.querySelector('#totalRankV16')?.value||''):'',total_participants:mode==='rank'?(modal.querySelector('#totalParticipantsV16')?.value||''):'',total_class_rank:mode==='rank'?(modal.querySelector('#totalClassRankV16')?.value||''):'',total_class_participants:mode==='rank'?(modal.querySelector('#totalClassParticipantsV16')?.value||''):'',total_year_position_percent:mode==='percent'?(modal.querySelector('.total-year-position-v17')?.value||''):'',total_class_position_percent:mode==='percent'?(modal.querySelector('.total-class-position-v17')?.value||''):'',is_hidden:modal.querySelector('#examHiddenV16')?.value==='1',scores:{}};var seen=new Set();for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=card.querySelector('.exam-subject-name-v10').value.trim();if(!name)return toast('è¯·å¡«å†™ç§‘ç›®åç§°ï¼Œæˆ–åˆ é™¤ç©ºç™½ç§‘ç›®');if(seen.has(name))return toast(`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`);seen.add(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked};}if(!exam.name||!exam.exam_date)return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='ä¿å­˜ä¸­â€¦';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'å·²ä¿å­˜ä¿®æ”¹':'è€ƒè¯•å·²è®°å½•');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•';}};

recordHtml=function recordHtmlV17(exam){var subjects=Object.keys(exam.scores||{}),finalTotal=totalFor(exam,'actual'),rawTotal=totalRawForV13(exam);var tags=subjects.map(function(subject){var row=exam.scores[subject]||{},a=num(row.actual),raw=num(row.raw),t=num(row.target),year=rankInfoByScopeV16(exam,subject,'year'),cls=rankInfoByScopeV16(exam,subject,'class');if(a===null&&raw===null&&t===null&&year.rank===null&&year.positionPercent===null&&cls.rank===null&&cls.positionPercent===null)return'';var rankText='';if(year.directPercent)rankText+=` Â· å¹´ä½æ¯” å‰${formatPercent(year.positionPercent)}`;else if(year.rank!==null)rankText+=` Â· å¹´æ’ ${year.rank}${year.participants?`/${year.participants}`:''}`;if(cls.directPercent)rankText+=` Â· ç­ä½æ¯” å‰${formatPercent(cls.positionPercent)}`;else if(cls.rank!==null)rankText+=` Â· ç­æ’ ${cls.rank}${cls.participants?`/${cls.participants}`:''}`;return `<span class="score-tag">${escapeHtml(subject)}${row.excludeFromTotal?'<span class="stat-badge-v17">ç»Ÿè®¡é¡¹</span>':''} ${a===null?'â€”':formatScore(a)}${raw!==null?`<span class="raw-final-inline-v13"> Â· åŸå§‹ <b>${formatScore(raw)}</b></span>`:''}<span style="color:#a1a9b5"> / ç›®æ ‡ ${t===null?'â€”':formatScore(t)}</span>${rankText?`<span style="color:#667085">${rankText}</span>`:''}</span>`;}).join('');var year=rankInfoByScopeV16(exam,'æ€»åˆ†','year'),cls=rankInfoByScopeV16(exam,'æ€»åˆ†','class'),badges='';if(year.directPercent)badges+=`<span class="score-tag"><b>å¹´ä½æ¯” å‰${formatPercent(year.positionPercent)}</b></span>`;else if(year.rank!==null)badges+=`<span class="score-tag"><b>å¹´æ’ ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;if(cls.directPercent)badges+=`<span class="score-tag"><b>ç­ä½æ¯” å‰${formatPercent(cls.positionPercent)}</b></span>`;else if(cls.rank!==null)badges+=`<span class="score-tag"><b>ç­æ’ ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;return `<div class="record ${exam.is_hidden?'hidden-record-v10':''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'æœªåˆ†ç±»')}</span>${exam.is_hidden?'<span class="hidden-badge-v10">å·²éšè—</span>':''}</b></div><div class="record-scores">${tags||'<span class="score-tag">å°šæœªå¡«å†™åˆ†æ•°æˆ–æ’å</span>'}<span class="score-tag"><b>èµ‹åˆ†æ€»åˆ† ${finalTotal===null?'â€”':formatScore(finalTotal)}</b>${rawTotal!==null?` Â· åŸå§‹æ€»åˆ† ${formatScore(rawTotal)}`:''}</span>${badges}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">ç¼–è¾‘</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden?'æ¢å¤æ˜¾ç¤º':'éšè—'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">åˆ é™¤</button></div></div>`;};

recordsHtml=function recordsHtmlV17(){var exams=state.allExams||[],hidden=exams.filter(function(e){return e.is_hidden;}).length,order=categoryOptionsV14();function byDateDesc(a,b){var d=String(b.exam_date||'').localeCompare(String(a.exam_date||''));if(d)return d;return String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||''));}var groups=[...order.map(function(v){return{name:v,exams:exams.filter(function(e){return e.grade_level===v;}).sort(byDateDesc)};}),{name:'æœªåˆ†ç±»',exams:exams.filter(function(e){return !e.grade_level;}).sort(byDateDesc)}].filter(function(g){return g.exams.length;}).sort(function(a,b){return byDateDesc(a.exams[0],b.exams[0]);});return `<div class="page-head"><div><h2>è€ƒè¯•è®°å½•</h2><p>æœ€è¿‘çš„è€ƒè¯•æ’åœ¨å‰é¢ã€‚${hidden?` ${hidden} æ¬¡å·²éšè—ã€‚`:''}</p></div><button class="primary" id="addExam">ï¼‹ æ–°å»º</button></div>${groups.length?groups.map(function(g){return `<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} æ¬¡</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`;}).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>è¿˜æ²¡æœ‰è€ƒè¯•è®°å½•<br><button class="secondary" id="emptyAdd" style="margin-top:14px">è®°å½•ç¬¬ä¸€åœºè€ƒè¯•</button></div></div></div>`}`;};

var bindPageBeforeV17=bindPage;
bindPage=function bindPageV17(){bindPageBeforeV17();document.querySelectorAll('[data-trend-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.trendScopeV16;if(scope==='score'){state.trendMetric='score';}else{state.rankScopeV16=scope;if(hasDirectPercentV17(scope)&&!hasRawRankV17(scope))state.trendMetric='rank';else if(state.trendMetric!=='rank_raw'&&state.trendMetric!=='rank')state.trendMetric='rank_raw';}render();};});document.querySelectorAll('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.radarScopeV16;state.rankScopeV16=scope;if(hasDirectPercentV17(scope)&&!hasRawRankV17(scope))state.radarMode='rank';else if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';ensureRadarSelection();render();};});};



/* ===== app-v18.js ===== */
// v18 / product v1.1: score modules, subtle Study Planner cross-link, optional ranking stays optional.
state.modulesV18 = state.modulesV18 || [];

var MODULE_API_V18='/api/score-tracker-modules-api';
var STUDY_PLANNER_URL_V18='https://study-planner.yhwlwl.xyz/?utm_source=score-tracker&utm_campaign=tool-crosslink';
var STUDY_PLANNER_PROMO_V18='./study-planner-promo.webp';

(function injectV18Styles(){
  if(document.getElementById('app-v18-style'))return;
  var style=document.createElement('style');style.id='app-v18-style';style.textContent=`
    .module-settings-v18{margin-top:18px;padding:22px}
    .module-settings-head-v18{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .module-chips-v18{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .module-chip-v18{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:11px;color:#596474}
    .module-chip-v18 b{color:var(--text)}
    .module-badge-v18{font-size:9px;border:1px solid #d9e3f3;background:#f4f7fb;color:#6b7890;border-radius:999px;padding:2px 6px}
    .module-manager-list-v18{display:grid;gap:12px;margin-top:12px}
    .module-editor-v18{border:1px solid var(--line);border-radius:16px;padding:13px;background:#fbfcfe}
    .module-editor-head-v18{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .module-editor-head-v18 input{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;background:#fff;outline:none;font-weight:700}
    .module-editor-head-v18 input[readonly]{background:#f5f7fa;color:#4d596b}
    .module-delete-v18{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:10px;padding:8px 10px}
    .module-subjects-v18{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .module-subject-v18{border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;padding:7px 9px;font-size:11px}
    .module-subject-v18.active{background:var(--text);border-color:var(--text);color:#fff}
    .module-subject-v18.locked{background:#eef1f5;color:#5c6675;border-color:#dfe4eb;cursor:default}
    .module-editor-note-v18{font-size:10px;color:var(--muted);line-height:1.55;margin-top:8px}
    .module-manager-actions-v18{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}
    .record-module-summary-v18{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .record-module-summary-v18 .module-chip-v18{background:#fbfcff}
    .study-tool-v18{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:16px;align-items:stretch;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:20px;background:linear-gradient(135deg,#fbfcff,#f7f9fc);padding:16px;margin:0 0 18px;overflow:hidden;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    .study-tool-v18:hover{transform:translateY(-1px);border-color:#cfd7e6;box-shadow:0 10px 28px #25304a0d}
    .study-tool-copy-v18{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:3px 2px}
    .study-tool-kicker-v18{font-size:10px;font-weight:800;letter-spacing:.08em;color:#7b8798;text-transform:uppercase}
    .study-tool-v18 h3{font-size:16px;margin:6px 0 5px;color:var(--text)}
    .study-tool-v18 p{font-size:12px;line-height:1.65;color:var(--muted);margin:0;max-width:520px}
    .study-tool-open-v18{margin-top:10px;font-size:11px;font-weight:700;color:#586781}
    .study-tool-thumb-v18{height:116px;border-radius:14px;overflow:hidden;border:1px solid #e5e9f0;background:#fff}
    .study-tool-thumb-v18 img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;display:block;filter:saturate(.78) contrast(.96)}
    @media(max-width:620px){
      .module-settings-v18{padding:18px 16px}.module-settings-head-v18{display:block}.module-settings-head-v18 button{margin-top:10px}
      .study-tool-v18{grid-template-columns:minmax(0,1fr) 96px;gap:10px;padding:13px;border-radius:17px;margin-bottom:14px}
      .study-tool-v18 h3{font-size:14px}.study-tool-v18 p{font-size:11px;line-height:1.55}.study-tool-open-v18{margin-top:7px}
      .study-tool-thumb-v18{height:104px;border-radius:12px}
    }
  `;document.head.appendChild(style);
})();

async function modulesApiV18(action,payload={}){
  var res=await fetch(MODULE_API_V18,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,token:state.token,...payload})});
  var data=await res.json().catch(function(){return{error:'ç½‘ç»œå“åº”å¼‚å¸¸'}});
  if(!res.ok)throw new Error(data.error||'æ¨¡å—è®¾ç½®è¯·æ±‚å¤±è´¥');
  return data;
}
async function loadModulesV18(){
  try{var data=await modulesApiV18('list_modules');state.modulesV18=data.modules||[];}
  catch(e){console.warn('module settings unavailable',e);state.modulesV18=state.modulesV18||[];}
}
function moduleNamesV18(){return new Set((state.modulesV18||[]).map(function(m){return m.name}));}
function moduleByNameV18(name){return(state.modulesV18||[]).find(function(m){return m.name===name})||null;}
function moduleSubjectOptionsV18(){
  var moduleNames=moduleNamesV18(),out=[],seen=new Set();
  function add(name){name=String(name||'').trim();if(!name||moduleNames.has(name)||seen.has(name))return;seen.add(name);out.push(name);}
  (state.subjectConfigs||[]).forEach(function(x){add(x.name)});
  (state.allExams||[]).forEach(function(exam){Object.keys(exam.scores||{}).forEach(add)});
  ['è¯­æ–‡','æ•°å­¦','è‹±è¯­','ç‰©ç†','å†å²','åŒ–å­¦','ç”Ÿç‰©','æ”¿æ²»','åœ°ç†'].forEach(add);
  return out;
}
function appendModulesV18(){
  (state.modulesV18||[]).forEach(function(m){
    if(!m||!m.name)return;
    if(!SUBJECTS.includes(m.name))SUBJECTS.push(m.name);
    SUBJECT_SHORT[m.name]=m.name.length<=4?m.name:('æ¨¡'+((state.modulesV18||[]).indexOf(m)+1));
  });
  if(!['æ€»è§ˆ','æ€»åˆ†',...SUBJECTS].includes(state.subject))state.subject='æ€»åˆ†';
}
if(typeof applyExamSubjectsV10==='function'){
  var applyExamSubjectsBeforeV18=applyExamSubjectsV10;
  applyExamSubjectsV10=function applyExamSubjectsV18(exams,templates){applyExamSubjectsBeforeV18(exams,templates);appendModulesV18();};
}
var loadExamsBeforeV18=loadExams;
loadExams=async function loadExamsV18(){await loadExamsBeforeV18();await loadModulesV18();if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);else appendModulesV18();};

function moduleCompleteSumV18(exam,module,key,reader){
  if(!module||!Array.isArray(module.subjects)||module.subjects.length<2)return null;
  var sum=0;
  for(var i=0;i<module.subjects.length;i++){var v=reader(exam,module.subjects[i],key);if(v===null||v===undefined||Number.isNaN(Number(v)))return null;sum+=Number(v);}
  return Math.round(sum*100)/100;
}
var examScoreBeforeV18=examScore;
examScore=function examScoreV18(exam,subject,key){
  var direct=examScoreBeforeV18(exam,subject,key);if(direct!==null)return direct;
  var module=moduleByNameV18(subject);if(!module)return direct;
  return moduleCompleteSumV18(exam,module,key,function(e,s,k){return examScoreBeforeV18(e,s,k);});
};
var examMaxBeforeV18=examMax;
examMax=function examMaxV18(exam,subject){
  var module=moduleByNameV18(subject);if(!module)return examMaxBeforeV18(exam,subject);
  var explicit=num(exam?.scores?.[subject]?.max);if(explicit!==null)return explicit;
  var sum=0;for(var i=0;i<module.subjects.length;i++){var v=examMaxBeforeV18(exam,module.subjects[i]);if(v===null||!Number.isFinite(Number(v)))return null;sum+=Number(v);}return sum;
};
if(typeof examRawScoreV13==='function'){
  var examRawScoreBeforeV18=examRawScoreV13;
  examRawScoreV13=function examRawScoreV18(exam,subject){
    var direct=examRawScoreBeforeV18(exam,subject);if(direct!==null)return direct;
    var module=moduleByNameV18(subject);if(!module)return direct;
    return moduleCompleteSumV18(exam,module,'raw',function(e,s){return examRawScoreBeforeV18(e,s);});
  };
}
if(typeof rawMaxV14==='function'){
  var rawMaxBeforeV18=rawMaxV14;
  rawMaxV14=function rawMaxV18(exam,subject){
    var module=moduleByNameV18(subject);if(!module)return rawMaxBeforeV18(exam,subject);
    var explicit=num(exam?.scores?.[subject]?.rawMax);if(explicit!==null)return explicit;
    var sum=0;for(var i=0;i<module.subjects.length;i++){var v=rawMaxBeforeV18(exam,module.subjects[i]);if(v===null||!Number.isFinite(Number(v)))return null;sum+=Number(v);}return sum;
  };
}
if(typeof totalSubjectsV17==='function'){
  var totalSubjectsBeforeV18=totalSubjectsV17;
  totalSubjectsV17=function totalSubjectsV18(exam){var names=moduleNamesV18();return totalSubjectsBeforeV18(exam).filter(function(name){return !names.has(name)});};
}

function moduleCardHtmlV18(){
  if(!(state.modulesV18||[]).length)return'';
  return `<div class="card module-settings-v18"><div class="module-settings-head-v18"><div><h3 class="card-title">æˆç»©æ¨¡å—</h3><p class="card-sub">è‡ªåŠ¨æ±‡æ€»å¸¸ç”¨ç»„åˆï¼Œä¸é‡å¤è®¡å…¥æ€»åˆ†ã€‚å†…ç½®è¯­æ•°å¤–ã€å››ç§‘å’Œå…­ç§‘ï¼Œä¹Ÿå¯ä»¥æ–°å¢è‡ªå·±çš„æ¨¡å—ã€‚</p></div><button class="secondary" id="manageModulesV18">è®¾ç½®</button></div><div class="module-chips-v18">${state.modulesV18.map(function(m){return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b>${m.isBuiltin?'<span class="module-badge-v18">å†…ç½®</span>':''} Â· ${(m.subjects||[]).map(escapeHtml).join(' / ')}</span>`}).join('')}</div></div>`;
}
var accountHtmlBeforeV18=accountHtml;
accountHtml=function accountHtmlV18(){return accountHtmlBeforeV18()+moduleCardHtmlV18();};

function normalizeBuiltinV18(module){
  var core=['è¯­æ–‡','æ•°å­¦','è‹±è¯­'],subjects=[...(module.subjects||[])],extras=subjects.filter(function(s){return !core.includes(s)});
  if(module.name==='è¯­æ•°å¤–')return core;
  if(module.name==='è¯­æ•°å¤– + ç‰©ç†/å†å²ï¼ˆå››ç§‘ï¼‰')return core.concat(extras.slice(0,1));
  if(module.name==='è¯­æ•°å¤– + æ‰€é€‰ç§‘ï¼ˆå…­ç§‘ï¼‰')return core.concat(extras.slice(0,3));
  return subjects;
}
function openModuleManagerV18(){
  var options=moduleSubjectOptionsV18(),draft=(state.modulesV18||[]).map(function(m){return{id:m.id,name:m.name,subjects:[...(m.subjects||[])],isBuiltin:!!m.isBuiltin}});
  var modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>æˆç»©æ¨¡å—è®¾ç½®</h3><button class="close-btn">Ã—</button></div><div class="modal-body"><p class="form-note">æ¨¡å—åªåšæ±‡æ€»å±•ç¤ºï¼Œä¸ä¼šå†æ¬¡åŠ å…¥æ€»åˆ†ã€‚å†…ç½®å››ç§‘è¯·é€‰æ‹©ç‰©ç†æˆ–å†å²ä¹‹ä¸€ï¼›å…­ç§‘è¯·é€‰æ‹© 3 é—¨é€‰ç§‘ã€‚</p><div class="module-manager-list-v18" id="moduleListV18"></div><div class="module-manager-actions-v18"><button class="secondary" id="addModuleV18">ï¼‹ è‡ªå®šä¹‰æ¨¡å—</button><div><button class="secondary cancel-btn">å–æ¶ˆ</button> <button class="primary" id="saveModulesV18">ä¿å­˜</button></div></div></div></div>`;document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('moduleListV18');
  function syncNames(){list.querySelectorAll('.module-editor-v18').forEach(function(card,i){var input=card.querySelector('.module-name-v18');if(input&&!draft[i].isBuiltin)draft[i].name=input.value.trim();});}
  function toggleSubject(index,name){
    var m=draft[index],core=['è¯­æ–‡','æ•°å­¦','è‹±è¯­'];
    if(m.isBuiltin&&core.includes(name))return;
    var has=m.subjects.includes(name);
    if(m.name==='è¯­æ•°å¤–')return;
    if(m.name==='è¯­æ•°å¤– + ç‰©ç†/å†å²ï¼ˆå››ç§‘ï¼‰'){
      if(!core.includes(name)&&!['ç‰©ç†','å†å²'].includes(name))return toast('å››ç§‘æ¨¡å—åªèƒ½é€‰æ‹©ç‰©ç†æˆ–å†å²');
      if(has)m.subjects=core.slice();else m.subjects=core.concat([name]);
    }else if(m.name==='è¯­æ•°å¤– + æ‰€é€‰ç§‘ï¼ˆå…­ç§‘ï¼‰'){
      var extras=m.subjects.filter(function(s){return !core.includes(s)});
      if(has)extras=extras.filter(function(s){return s!==name});else{if(extras.length>=3)return toast('å…­ç§‘æ¨¡å—æœ€å¤šé€‰æ‹© 3 é—¨é€‰ç§‘');extras.push(name);}m.subjects=core.concat(extras);
    }else{if(has)m.subjects=m.subjects.filter(function(s){return s!==name});else m.subjects.push(name);}
    renderRows();
  }
  function renderRows(){
    list.innerHTML=draft.map(function(m,i){m.subjects=normalizeBuiltinV18(m);var note=m.name==='è¯­æ•°å¤–'?'å›ºå®šæ±‡æ€»è¯­æ–‡ã€æ•°å­¦ã€è‹±è¯­ã€‚':m.name==='è¯­æ•°å¤– + ç‰©ç†/å†å²ï¼ˆå››ç§‘ï¼‰'?'è¯­æ•°å¤– + ç‰©ç†/å†å²ï¼Œå››ç§‘ã€‚':m.name==='è¯­æ•°å¤– + æ‰€é€‰ç§‘ï¼ˆå…­ç§‘ï¼‰'?'è¯­æ•°å¤– + 3 é—¨é€‰ç§‘ï¼Œå…­ç§‘ã€‚':'è‡³å°‘é€‰æ‹© 2 ä¸ªç§‘ç›®ã€‚';return `<div class="module-editor-v18" data-module-index="${i}"><div class="module-editor-head-v18"><input class="module-name-v18" maxlength="30" value="${escapeHtml(m.name||'')}" ${m.isBuiltin?'readonly':''} placeholder="æ¨¡å—åç§°">${m.isBuiltin?'<span class="module-badge-v18">å†…ç½®</span>':`<button type="button" class="module-delete-v18">åˆ é™¤</button>`}</div><div class="module-subjects-v18">${options.map(function(name){if(m.name==='è¯­æ•°å¤– + ç‰©ç†/å†å²ï¼ˆå››ç§‘ï¼‰'&&!['è¯­æ–‡','æ•°å­¦','è‹±è¯­','ç‰©ç†','å†å²'].includes(name))return '';var active=m.subjects.includes(name),locked=m.isBuiltin&&['è¯­æ–‡','æ•°å­¦','è‹±è¯­'].includes(name);return `<button type="button" class="module-subject-v18 ${active?'active':''} ${locked?'locked':''}" data-module-subject="${escapeHtml(name)}">${escapeHtml(name)}</button>`}).join('')}</div><div class="module-editor-note-v18">${note}</div></div>`}).join('');
    list.querySelectorAll('.module-editor-v18').forEach(function(card,index){
      card.querySelectorAll('[data-module-subject]').forEach(function(button){button.onclick=function(){syncNames();toggleSubject(index,button.dataset.moduleSubject)}});
      var del=card.querySelector('.module-delete-v18');if(del)del.onclick=function(){syncNames();draft.splice(index,1);renderRows();};
    });
  }
  renderRows();
  function close(){modal.remove();state.modal=null;}
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;modal.onclick=function(e){if(e.target===modal)close()};
  document.getElementById('addModuleV18').onclick=function(){syncNames();if(draft.length>=12)return toast('æœ€å¤š 12 ä¸ªæ¨¡å—');draft.push({id:null,name:'',subjects:[],isBuiltin:false});renderRows();list.querySelector('.module-editor-v18:last-child .module-name-v18')?.focus();};
  document.getElementById('saveModulesV18').onclick=async function(){
    syncNames();var names=new Set();
    for(var i=0;i<draft.length;i++){var m=draft[i];m.subjects=normalizeBuiltinV18(m);if(!m.name)return toast('è¯·å¡«å†™æ¨¡å—åç§°');if(names.has(m.name))return toast('æ¨¡å—åç§°ä¸èƒ½é‡å¤');names.add(m.name);if(m.name==='è¯­æ•°å¤–'&&m.subjects.length!==3)return toast('è¯­æ•°å¤–æ¨¡å—åº”ä¸º 3 ç§‘');if(m.name==='è¯­æ•°å¤– + ç‰©ç†/å†å²ï¼ˆå››ç§‘ï¼‰'&&m.subjects.length!==4)return toast('å››ç§‘æ¨¡å—è¯·é€‰æ‹©ç‰©ç†æˆ–å†å²ä¹‹ä¸€');if(m.name==='è¯­æ•°å¤– + æ‰€é€‰ç§‘ï¼ˆå…­ç§‘ï¼‰'&&m.subjects.length!==6)return toast('å…­ç§‘æ¨¡å—è¯·é€‰æ‹© 3 é—¨é€‰ç§‘');if(!m.isBuiltin&&m.subjects.length<2)return toast(`æ¨¡å—ã€Œ${m.name}ã€è‡³å°‘é€‰æ‹© 2 ä¸ªç§‘ç›®`);}
    var button=document.getElementById('saveModulesV18');button.disabled=true;button.textContent='ä¿å­˜ä¸­â€¦';
    try{var data=await modulesApiV18('save_modules',{modules:draft});state.modulesV18=data.modules||[];if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);close();render();toast('æ¨¡å—è®¾ç½®å·²ä¿å­˜');}
    catch(e){toast(e.message);button.disabled=false;button.textContent='ä¿å­˜';}
  };
}

function moduleSummaryV18(exam){
  var items=(state.modulesV18||[]).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target');
    if(final===null&&raw===null&&target===null)return'';
    var max=examMax(exam,m.name),parts=[];if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));if(raw!==null&&raw!==final)parts.push('åŸå§‹ '+formatScore(raw));if(target!==null)parts.push('ç›®æ ‡ '+formatScore(target));
    return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' Â· ')}</span>`;
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
}
var recordHtmlBeforeV18=recordHtml;
recordHtml=function recordHtmlV18(exam){var html=recordHtmlBeforeV18(exam),summary=moduleSummaryV18(exam);return summary?html.replace('<div class="record-actions record-actions-v10">',summary+'<div class="record-actions record-actions-v10">'):html;};

function studyPlannerCardV18(){
  return `<a class="study-tool-v18" id="studyPlannerToolV18" href="${STUDY_PLANNER_URL_V18}" target="_blank" rel="noopener noreferrer"><div class="study-tool-copy-v18"><span class="study-tool-kicker-v18">å¦ä¸€ä¸ªå­¦ä¹ å·¥å…·</span><h3>Study Planner Â· è‡ªåŠ¨å­¦ä¹ è§„åˆ’</h3><p>æŠŠç›®æ ‡ã€ä»»åŠ¡å’Œå¯ç”¨æ—¶é—´äº¤ç»™å®ƒï¼Œè‡ªåŠ¨æ’è¿›æ—¥å†ã€‚é€‚åˆå’Œæˆç»©è½¨è¿¹ä¸€èµ·ç”¨ï¼šè¿™é‡Œçœ‹ç»“æœï¼Œé‚£é‡Œå®‰æ’ä¸‹ä¸€æ­¥ã€‚</p><span class="study-tool-open-v18">æ‰“å¼€å­¦ä¹ è§„åˆ’å™¨ â†—</span></div><div class="study-tool-thumb-v18"><img ${window.__scoreTrackerAssets?window.__scoreTrackerAssets.attributes(STUDY_PLANNER_PROMO_V18):`src="${STUDY_PLANNER_PROMO_V18}"`} alt="Study Planner æœˆè§†å›¾"></div></a>`;
}
var homeHtmlBeforeV18=homeHtml;
homeHtml=function homeHtmlV18(){
  var html=homeHtmlBeforeV18(),card=studyPlannerCardV18();
  if(html.includes('<section class="grid-main">'))return html.replace('<section class="grid-main">',card+'<section class="grid-main">');
  return card+html;
};

function uuidV18(){try{return crypto.randomUUID()}catch(e){return 'v18-'+Date.now()+'-'+Math.random().toString(16).slice(2)}}
function trackStudyPlannerV18(){
  var context={eventId:uuidV18(),sessionId:sessionStorage.getItem('st_session_id')||'',visitorId:localStorage.getItem('st_visitor_id')||'',clientTime:new Date().toISOString(),pathname:location.pathname,appPage:'home',referrerOrigin:document.referrer||'',firstReferrer:localStorage.getItem('st_first_referrer')||'',utmSource:localStorage.getItem('st_utm_source')||'',utmCampaign:localStorage.getItem('st_utm_campaign')||'',userAgent:navigator.userAgent,browserLanguage:navigator.language,clientTimezone:(Intl.DateTimeFormat().resolvedOptions().timeZone||''),screenWidth:screen.width,screenHeight:screen.height,viewportWidth:innerWidth,viewportHeight:innerHeight,isPwa:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,appVersion:(function(){var m=document.querySelector('meta[name="application-version"]');return (m&&m.getAttribute('content'))||'';})()};
  fetch('/api/score-tracker-api',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({action:'track_event',token:state.token||'',eventType:'study_planner_opened',context:context,metadata:{source:'home_tool_card',destination:'https://study-planner.yhwlwl.xyz/'}})}).catch(function(){});
}
var bindPageBeforeV18=bindPage;
bindPage=function bindPageV18(){
  bindPageBeforeV18();
  var manage=document.getElementById('manageModulesV18');if(manage)manage.onclick=openModuleManagerV18;
  var tool=document.getElementById('studyPlannerToolV18');if(tool)tool.addEventListener('click',trackStudyPlannerV18,{capture:true});
};

/* ===== app-v19.js ===== */
// v19 / product v1.1: readable long trends + username rename while preserving original account name.
state.originalUsernameV19 = state.originalUsernameV19 || '';

var USERNAME_API_V19='/api/score-tracker-username-api';

(function injectV19Styles(){
  if(document.getElementById('app-v19-style'))return;
  var style=document.createElement('style');
  style.id='app-v19-style';
  style.textContent=`
    .trend-scroll-v19{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;touch-action:pan-x pan-y}
    .trend-scroll-v19::-webkit-scrollbar{display:none}
    .trend-scroll-v19 svg{max-width:none!important;display:block}
    .trend-scroll-hint-v19{display:none;font-size:10px;color:var(--muted);margin-top:6px;text-align:right}
    .username-origin-v19{font-size:11px;color:var(--muted);line-height:1.55;margin-top:8px}
    .username-origin-v19 code{color:#596474}
    .account-chip-v19{justify-content:flex-start!important;flex-wrap:wrap}
    .account-chip-v19 code{margin-right:auto}
    .rename-username-v19{border:1px solid var(--line);background:#fff;color:var(--muted);padding:7px 9px;border-radius:9px;font-size:11px;flex:0 0 auto}
    .username-modal-note-v19{font-size:11px;line-height:1.65;color:var(--muted);margin-top:10px}
    @media(max-width:620px){
      .trend-scroll-hint-v19{display:block}
      .tooltip-card{max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis}
    }
  `;
  document.head.appendChild(style);
})();

async function usernameApiV19(action,payload){
  var response=await fetch(USERNAME_API_V19,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({action:action,token:state.token},payload||{}))
  });
  var data=await response.json().catch(function(){return{error:'ç½‘ç»œå“åº”å¼‚å¸¸'};});
  if(!response.ok)throw new Error(data.error||'ç”¨æˆ·åè¯·æ±‚å¤±è´¥');
  return data;
}

function connectBrokenTrendPathsV19(stage){
  stage.querySelectorAll('svg path[fill="none"]').forEach(function(path){
    var d=path.getAttribute('d')||'';
    var seen=false;
    var next=d.replace(/\bM\b/g,function(){if(!seen){seen=true;return'M';}return'L';});
    if(next!==d)path.setAttribute('d',next);
  });
}

function enhanceTrendStageV19(stage){
  if(!stage)return;
  var svg=stage.querySelector('svg');
  if(!svg)return;
  if(!stage._trendGeometryV19){
    var box=(svg.getAttribute('viewBox')||'').split(/\s+/).map(Number);
    if(box.length!==4||!box[2]||!box[3])return;
    var grid=Array.from(svg.querySelectorAll('line[x1][x2]')).filter(function(el){return Number(el.getAttribute('x2'))-Number(el.getAttribute('x1'))>box[2]/2;})[0];
    if(!grid)return;
    var left=Number(grid.getAttribute('x1')),right=Number(grid.getAttribute('x2'));
    var labels=Array.from(svg.querySelectorAll('text[text-anchor="middle"]')).filter(function(el){return el.classList.contains('axis-label');});
    // Keep the original coordinates: resizing must not stretch an already resized chart again.
    stage._trendGeometryV19={width:box[2],height:box[3],left:left,right:right,count:labels.length||Math.max(1,(state.exams||[]).length),nodes:Array.from(svg.querySelectorAll('circle,text,line,path,polyline,polygon')).map(function(el){
      var attrs={};['x','cx','x1','x2','d','points'].forEach(function(key){if(el.hasAttribute(key))attrs[key]=el.getAttribute(key);});return{el:el,attrs:attrs};
    })};
  }
  var geometry=stage._trendGeometryV19;
  var viewport=Math.max(240,stage.clientWidth||Math.min(760,window.innerWidth-64));
  var rightMargin=Math.max(44,geometry.width-geometry.right);
  var desired=Math.max(viewport,geometry.left+rightMargin+Math.max(0,geometry.count-1)*84);
  var oldRange=Math.max(0,(stage._trendWidthV19||desired)-(stage._trendViewportV19||viewport));
  var followEnd=!stage._trendWidthV19||stage.scrollLeft>=oldRange-8;
  var progress=oldRange?stage.scrollLeft/oldRange:0;
  function x(value){var n=Number(value);return n<geometry.left?n:geometry.left+(n-geometry.left)/(geometry.right-geometry.left)*(desired-rightMargin-geometry.left);}
  geometry.nodes.forEach(function(item){Object.keys(item.attrs).forEach(function(key){
    var value=item.attrs[key];
    if(key==='d')value=value.replace(/([ML])\s*(-?[\d.]+(?:e[-+]?\d+)?)\s*[, ]\s*(-?[\d.]+(?:e[-+]?\d+)?)/g,function(_,command,px,py){return command+' '+x(px)+' '+py;});
    else if(key==='points')value=value.trim().split(/\s+/).map(function(pair){var p=pair.split(',');return x(p[0])+','+p[1];}).join(' ');
    else value=String(x(value));
    item.el.setAttribute(key,value);
  });});
  stage.dataset.v19Enhanced='1';
  stage.classList.add('trend-scroll-v19');
  // Expand the coordinate system, not the drawing: points, text and strokes keep their proportions.
  svg.setAttribute('viewBox','0 0 '+desired+' '+geometry.height);
  svg.setAttribute('preserveAspectRatio','xMinYMin meet');
  svg.setAttribute('width',String(desired));svg.setAttribute('height',String(geometry.height));
  svg.style.width=desired+'px';
  svg.style.minWidth=desired+'px';
  svg.style.height=geometry.height+'px';
  stage.style.height=geometry.height+'px';
  stage._trendWidthV19=desired;stage._trendViewportV19=viewport;
  stage.setAttribute('tabindex','0');stage.setAttribute('role','region');stage.setAttribute('aria-label','æˆç»©è¶‹åŠ¿ï¼Œå¯å·¦å³æ»šåŠ¨æŸ¥çœ‹è€ƒè¯•');
  if(!stage._trendHintV19){
    var hint=document.createElement('div');stage._trendHintV19=hint;
    hint.className='trend-scroll-hint-v19';
    hint.textContent='â† å·¦å³æ»‘åŠ¨æŸ¥çœ‹å…¨éƒ¨è€ƒè¯• â†’';
    stage.insertAdjacentElement('afterend',hint);
  }
  stage._trendHintV19.style.display=desired>viewport+4?'block':'none';
  requestAnimationFrame(function(){if(stage.isConnected)stage.scrollLeft=followEnd?Math.max(0,desired-viewport):progress*Math.max(0,desired-viewport);});
}

function enhanceTrendChartsV19(){
  var candidates=[];
  document.querySelectorAll('#chart,#overviewChart,.rank-chart-stage-v7').forEach(function(stage){
    if(stage.id==='chart'&&stage.querySelector('.rank-chart-stage-v7')){stage.style.height='auto';return;}
    if(candidates.indexOf(stage)<0)candidates.push(stage);
  });
  candidates.forEach(enhanceTrendStageV19);
}

var trendResizeFrameV19;
window.addEventListener('resize',function(){cancelAnimationFrame(trendResizeFrameV19);trendResizeFrameV19=requestAnimationFrame(enhanceTrendChartsV19);});

function clampTrendTooltipV19(point){
  var stage=point&&point.closest&&point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
  if(!stage)return;
  var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
  if(!tip||tip.style.display==='none')return;
  var sr=stage.getBoundingClientRect(),pr=point.getBoundingClientRect();
  tip.style.left=(pr.left-sr.left+stage.scrollLeft+pr.width/2)+'px';
  tip.style.top=(pr.top-sr.top+stage.scrollTop)+'px';
  var tr=tip.getBoundingClientRect();
  var minLeft=Math.max(8,sr.left+6),maxRight=Math.min(window.innerWidth-8,sr.right-6);
  var current=parseFloat(tip.style.left)||0;
  if(tr.left<minLeft)current+=minLeft-tr.left;
  if(tr.right>maxRight)current-=tr.right-maxRight;
  tip.style.left=current+'px';
}

document.addEventListener('click',function(event){
  var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
  if(point)setTimeout(function(){clampTrendTooltipV19(point);},0);
},false);
document.addEventListener('pointerover',function(event){
  var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
  if(point)setTimeout(function(){clampTrendTooltipV19(point);},0);
},false);

function usernameAccountPatchV19(html){
  var original=escapeHtml(state.originalUsernameV19||state.user?.username||'');
  return html.replace(/<div class="account-chip">([\s\S]*?)<\/div>/,function(match,inside){
    return `<div class="account-chip account-chip-v19">${inside}<button class="rename-username-v19" id="renameUsernameV19">ä¿®æ”¹</button></div><div class="username-origin-v19" id="usernameOriginV19">åˆå§‹è´¦å·ï¼š<code>${original}</code> Â· ä¿®æ”¹ç”¨æˆ·åä¸ä¼šæ”¹å˜åŸè´¦å·èº«ä»½ã€‚</div>`;
  });
}

var accountHtmlBeforeV19=accountHtml;
accountHtml=function accountHtmlV19(){return usernameAccountPatchV19(accountHtmlBeforeV19());};

function openUsernameModalV19(){
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>ä¿®æ”¹ç”¨æˆ·å</h3><button class="close-btn">Ã—</button></div><div class="modal-body"><div class="field"><label>æ–°ç”¨æˆ·å</label><input id="usernameInputV19" maxlength="24" autocomplete="username" value="${escapeHtml(state.user?.username||'')}" placeholder="2ï½24 ä½ä¸­æ–‡ã€å­—æ¯æˆ–æ•°å­—"></div><div class="username-modal-note-v19">ä¿å­˜æ—¶ä¼šè‡ªåŠ¨æŸ¥é‡ã€‚åˆå§‹è´¦å·ä¼šä½œä¸ºå†…éƒ¨è´¦å·æ ‡è¯†ä¿ç•™ï¼Œä¸ä¼šå› ä¸ºæ”¹åè€Œä¸¢å¤±æˆç»©æˆ–åé¦ˆè®°å½•ã€‚</div><div class="modal-actions"><button class="secondary cancel-btn">å–æ¶ˆ</button><button class="primary" id="saveUsernameV19">ä¿å­˜ç”¨æˆ·å</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var close=function(){modal.remove();if(state.modal===modal)state.modal=null;};
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;
  modal.onclick=function(e){if(e.target===modal)close();};
  var input=modal.querySelector('#usernameInputV19');input.focus();input.select();
  modal.querySelector('#saveUsernameV19').onclick=async function(){
    var button=this,next=String(input.value||'').trim();
    if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(next))return toast('ç”¨æˆ·åè¯·ä½¿ç”¨ 2ï½24 ä½ä¸­æ–‡ã€å­—æ¯ã€æ•°å­—ã€æ¨ªçº¿æˆ–ä¸‹åˆ’çº¿');
    button.disabled=true;button.textContent='æ£€æŸ¥å¹¶ä¿å­˜â€¦';
    try{
      var data=await usernameApiV19('rename',{username:next});
      state.user=Object.assign({},state.user,{username:data.user.username});
      state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username;
      close();render();toast('ç”¨æˆ·åå·²ä¿®æ”¹');
    }catch(e){toast(e&&e.message?e.message:'ç”¨æˆ·åä¿®æ”¹å¤±è´¥');}
    finally{if(button.isConnected){button.disabled=false;button.textContent='ä¿å­˜ç”¨æˆ·å';}}
  };
}

async function refreshUsernameIdentityV19(){
  if(state.page!=='account'||!state.token)return;
  try{
    var data=await usernameApiV19('get');
    state.originalUsernameV19=data.user.originalUsername||data.user.username;
    if(state.user&&data.user.username)state.user.username=data.user.username;
    var note=document.getElementById('usernameOriginV19');
    if(note)note.innerHTML='åˆå§‹è´¦å·ï¼š<code>'+escapeHtml(state.originalUsernameV19)+'</code> Â· ä¿®æ”¹ç”¨æˆ·åä¸ä¼šæ”¹å˜åŸè´¦å·èº«ä»½ã€‚';
  }catch(e){console.warn('username identity unavailable',e);}
}

var bindPageBeforeV19=bindPage;
bindPage=function bindPageV19(){
  bindPageBeforeV19();
  enhanceTrendChartsV19();
  var rename=document.getElementById('renameUsernameV19');
  if(rename)rename.onclick=openUsernameModalV19;
  refreshUsernameIdentityV19();
};

/* ===== app-v20.js ===== */
// v20 / product v1.1: mobile record polish, compact radar controls, fair latest metric, collapsible groups, raw-only score fallback.
state.collapsedRecordGroupsV20 = state.collapsedRecordGroupsV20 || new Set();

(function injectV20Styles(){
  if(document.getElementById('app-v20-style')) return;
  var style=document.createElement('style');
  style.id='app-v20-style';
  style.textContent=`
    .record-group-toggle-v20{
      border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;
      padding:6px 10px;font-size:10px;line-height:1;white-space:nowrap
    }
    .grade-section-head-v13{display:flex;align-items:center;gap:8px}
    .grade-section-head-v13 h3{margin-right:auto}
    @media(max-width:620px){
      .records-card{padding:4px 14px!important;overflow:hidden}
      .record{
        width:100%;min-width:0;display:grid!important;
        grid-template-columns:1fr!important;
        grid-template-areas:"date" "actions" "scores"!important;
        gap:10px!important;align-items:start!important;padding:16px 0!important
      }
      .record-date{grid-area:date;min-width:0;line-height:1.45}
      .record-date b{max-width:100%;overflow-wrap:anywhere}
      .record-actions,.record-actions-v10{
        grid-area:actions;width:100%;max-width:none!important;min-width:0;
        display:flex!important;flex-direction:row!important;align-items:center!important;
        justify-content:flex-start!important;gap:7px!important
      }
      .record-action-btn-v10{width:auto!important;min-width:58px!important;padding:7px 10px!important}
      .record-scores{
        grid-area:scores;width:100%;min-width:0;display:flex!important;flex-wrap:wrap!important;
        align-items:flex-start;gap:7px!important
      }
      .record-scores .score-tag{
        flex:0 1 auto;max-width:100%;min-width:0;white-space:normal!important;
        overflow-wrap:anywhere;word-break:normal;line-height:1.45
      }

      .radar-toolbar>.toggle-row:first-child{
        width:100%;display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:5px!important;align-items:center
      }
      .radar-toolbar>.toggle-row:first-child>.label{grid-column:1/-1}
      .radar-toolbar>.toggle-row:first-child>.chip{
        width:100%!important;min-width:0!important;padding:7px 2px!important;
        font-size:10.5px!important;text-align:center
      }
      .record-group-toggle-v20{padding:6px 9px}
    }
    @media(max-width:420px){
      .records-card{padding-left:12px!important;padding-right:12px!important}
      .record-action-btn-v10{min-width:54px!important;padding:7px 9px!important}
      .radar-toolbar>.toggle-row:first-child{gap:4px!important}
      .radar-toolbar>.toggle-row:first-child>.chip{font-size:10px!important;padding:6px 1px!important}
    }
  `;
  document.head.appendChild(style);
})();

function effectiveScoreSubjectsV20(exam){
  var moduleNames=typeof moduleNamesV18==='function'?moduleNamesV18():new Set();
  return Object.entries(exam?.scores||{}).filter(function(entry){
    var name=entry[0],row=entry[1]||{};
    return !moduleNames.has(name)&&!row.excludeFromTotal&&examScore(exam,name,'actual')!==null;
  }).map(function(entry){return entry[0];});
}

function sortedVisibleExamsV20(){
  return [...(state.exams||[])].sort(function(a,b){
    var d=String(a.exam_date||'').localeCompare(String(b.exam_date||''));
    if(d)return d;
    return String(a.created_at||'').localeCompare(String(b.created_at||''));
  });
}

function sameSubjectSetV20(a,b){
  if(a.length!==b.length)return false;
  var aa=[...a].sort(),bb=[...b].sort();
  return aa.every(function(x,i){return x===bb[i];});
}

function totalScopeSubjectsV20(exam){
  var moduleNames=typeof moduleNamesV18==='function'?moduleNamesV18():new Set();
  return Object.entries(exam?.scores||{}).filter(function(entry){
    return !moduleNames.has(entry[0])&&!entry[1]?.excludeFromTotal;
  }).map(function(entry){return entry[0];}).sort();
}

function sameScoreBasisV20(a,b,subjects){
  return (subjects||[]).every(function(name){
    var am=num(a?.scores?.[name]?.max),bm=num(b?.scores?.[name]?.max);
    return am===null||bm===null||Math.abs(am-bm)<0.000001;
  });
}

function previousSubjectDeltaV20(exams,index,subject,value){
  var latest=exams[index];
  for(var j=index-1;j>=0;j--){
    var previous=exams[j],previousValue=examScore(previous,subject,'actual');
    if(previousValue===null||!sameScoreBasisV20(latest,previous,[subject]))continue;
    return value-previousValue;
  }
  return null;
}

function previousTotalDeltaV20(exams,index,latest,value,subjects){
  var names=subjects||totalScopeSubjectsV20(latest);
  for(var j=index-1;j>=0;j--){
    var previous=exams[j],previousNames=totalScopeSubjectsV20(previous);
    if(!sameSubjectSetV20(names,previousNames)||!sameScoreBasisV20(latest,previous,names))continue;
    var previousValue=num(previous.total_actual_score);
    if(previousValue===null){
      if(!sameSubjectSetV20(names,effectiveScoreSubjectsV20(previous)))continue;
      previousValue=totalFor(previous,'actual');
    }
    if(previousValue!==null)return value-previousValue;
  }
  return null;
}

function latestMetricV20(){
  var exams=sortedVisibleExamsV20();
  for(var i=exams.length-1;i>=0;i--){
    var latest=exams[i],subjects=effectiveScoreSubjectsV20(latest);
    if(!subjects.length)continue;

    if(subjects.length===1){
      var subject=subjects[0],value=examScore(latest,subject,'actual');
      return {
        label:'æœ€è¿‘ä¸€æ¬¡'+subject+'æˆç»©',
        value:value,
        exam:latest,
        delta:previousSubjectDeltaV20(exams,i,subject,value),
        deltaLabel:'è¾ƒä¸Šæ¬¡åŒç§‘'
      };
    }

    var value=totalFor(latest,'actual');
    if(value===null)continue;
    return {
      label:'æœ€è¿‘ä¸€æ¬¡çœŸå®æ€»åˆ†',
      value:value,
      exam:latest,
      delta:previousTotalDeltaV20(exams,i,latest,value,subjects),
      deltaLabel:'è¾ƒä¸Šæ¬¡åŒå£å¾„'
    };
  }
  return null;
}

function patchLatestHeroV20(){
  if(state.page!=='home')return;
  var card=document.querySelector('.hero-stat');
  if(!card)return;
  var metric=latestMetricV20();
  if(!metric)return;
  var delta=metric.delta;
  card.innerHTML=`<div><div class="stat-label">${escapeHtml(metric.label)}</div><div class="stat-value">${formatScore(metric.value)}</div><div class="stat-sub">${escapeHtml(metric.exam.name)} Â· ${fmtDate(metric.exam.exam_date)}</div></div>${delta===null||delta===undefined?'':`<span class="trend-pill${delta<0?' down':''}">${delta>=0?'â†—':'â†˜'} ${escapeHtml(metric.deltaLabel||'è¾ƒä¸Šæ¬¡åŒå£å¾„')} ${delta>=0?'+':''}${formatScore(delta)} åˆ†</span>`}${metric.comparison?`<span class="hero-average">${escapeHtml(metric.comparison)}</span>`:''}`;
}

function decorateRecordGroupCollapseV20(){
  if(state.page!=='records')return;
  document.querySelectorAll('.grade-section-v13').forEach(function(section){
    var head=section.querySelector('.grade-section-head-v13');
    var card=section.querySelector('.records-card');
    var title=head?.querySelector('h3');
    if(!head||!card||!title)return;
    var key=String(title.textContent||'').trim();
    var button=head.querySelector('.record-group-toggle-v20');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='record-group-toggle-v20';
      head.appendChild(button);
    }
    function apply(){
      var collapsed=state.collapsedRecordGroupsV20.has(key);
      card.hidden=collapsed;
      button.textContent=collapsed?'å±•å¼€':'æ”¶èµ·';
      button.setAttribute('aria-expanded',collapsed?'false':'true');
    }
    button.onclick=function(){
      if(state.collapsedRecordGroupsV20.has(key))state.collapsedRecordGroupsV20.delete(key);
      else state.collapsedRecordGroupsV20.add(key);
      apply();
    };
    apply();
  });
}

var examScoreBeforeV20=examScore;
examScore=function examScoreV20(exam,subject,key){
  var value=examScoreBeforeV20(exam,subject,key);
  if(key==='actual'&&value===null){
    var raw=examScoreBeforeV20(exam,subject,'raw');
    if(raw!==null)return raw;
  }
  return value;
};

var saveExamBeforeV20=saveExam;
saveExam=async function saveExamV20(id,modal){
  modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
    var raw=card.querySelector('.raw-v16');
    var actual=card.querySelector('.actual-v16');
    if(raw&&actual&&String(actual.value||'').trim()===''&&String(raw.value||'').trim()!==''){
      actual.value=raw.value;
    }
  });
  return saveExamBeforeV20(id,modal);
};

var recordHtmlBeforeV20=recordHtml;
recordHtml=function recordHtmlV20(exam){
  var clone=Object.assign({},exam,{scores:{}});
  var fallbackRawValues=[];
  Object.entries(exam?.scores||{}).forEach(function(entry){
    var name=entry[0],row=entry[1]||{},next=Object.assign({},row);
    if(num(next.actual)===null&&num(next.raw)!==null){
      next.actual=next.raw;
      fallbackRawValues.push(formatScore(next.raw));
    }
    clone.scores[name]=next;
  });
  var html=recordHtmlBeforeV20(clone);
  fallbackRawValues.forEach(function(value){
    html=html.replace(`<span class="raw-final-inline-v13"> Â· åŸå§‹ <b>${value}</b></span>`,'');
  });
  var finalTotal=totalFor(clone,'actual'),rawTotal=typeof totalRawForV13==='function'?totalRawForV13(clone):null;
  if(finalTotal!==null&&rawTotal!==null&&Math.abs(Number(finalTotal)-Number(rawTotal))<0.000001){
    html=html.replace(` Â· åŸå§‹æ€»åˆ† ${formatScore(rawTotal)}`,'');
  }
  return html;
};

var bindPageBeforeV20=bindPage;
bindPage=function bindPageV20(){
  bindPageBeforeV20();
  patchLatestHeroV20();
  decorateRecordGroupCollapseV20();
};

/* ===== app-v21.js ===== */
// v21 / product v1.1: separate subjects from score combinations and make combinations exam-specific.
(function injectV21Styles(){
  if(document.getElementById('app-v21-style'))return;
  var style=document.createElement('style');style.id='app-v21-style';style.textContent=`
    .subject-fixed-v21{display:flex;align-items:center;min-height:38px;padding:0 4px;font-size:14px;font-weight:800;color:var(--text)}
    .subject-history-v21{font-size:9px;border:1px solid var(--line);border-radius:999px;padding:2px 6px;color:var(--muted);margin-left:7px;font-weight:700}
    .subject-picker-v21,.combo-picker-v21{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
    .subject-picker-v21 select,.combo-picker-v21 select{width:auto;min-width:180px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:9px 11px;color:#556070}
    .combo-section-v21{margin-top:18px}
    .combo-total-v21,.combo-card-v21{border:1px solid var(--line);border-radius:16px;background:#fafbfe;padding:13px;margin-top:10px}
    .combo-head-v21{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
    .combo-head-v21 b{font-size:13px}.combo-head-v21 span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.5}
    .combo-remove-v21{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:9px;padding:6px 9px;font-size:10px}
    .combo-list-v21{display:grid;gap:9px}.combo-card-v21{margin-top:0}
    .combo-score-v21{display:flex;gap:8px;flex-wrap:wrap}.combo-score-v21 span{font-size:11px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:#657083}
    .combo-score-v21 b{color:var(--text)}
    .rank-entry-top-v21{margin:12px 0 4px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#f8f9fc}
    .rank-entry-top-v21 .rank-entry-mode-v17{margin:0}
    .exam-subject-head-v10 .exam-subject-name-v10{display:none!important}
    .exam-subject-card-v10 .exclude-total-v17{display:none!important}
    @media(max-width:620px){
      .subject-picker-v21 select,.combo-picker-v21 select{width:100%;min-width:0}
      .combo-total-v21,.combo-card-v21{padding:11px}.combo-head-v21{margin-bottom:8px}
      .rank-entry-top-v21{padding:9px 10px}
    }
  `;document.head.appendChild(style);
})();

function moduleIdSetV21(){return new Set((state.modulesV18||[]).map(function(m){return String(m.id)}));}
function moduleNameSetV21(){return new Set((state.modulesV18||[]).map(function(m){return m.name}));}
function cleanSubjectAxisV21(){
  var moduleNames=moduleNameSetV21(),out=[],seen=new Set();
  function add(name){name=String(name||'').trim();if(!name||moduleNames.has(name)||seen.has(name))return;seen.add(name);out.push(name);}
  (state.subjectConfigs||[]).forEach(function(x){add(x.name)});
  (state.allExams||[]).forEach(function(exam){Object.keys(exam.scores||{}).forEach(add)});
  SUBJECTS.splice(0,SUBJECTS.length,...out);
  if(!['æ€»è§ˆ','æ€»åˆ†',...SUBJECTS].includes(state.subject))state.subject='æ€»åˆ†';
}
var loadExamsBeforeV21=loadExams;
loadExams=async function loadExamsV21(){await loadExamsBeforeV21();cleanSubjectAxisV21();};

moduleSummaryV18=function moduleSummaryV21(exam){
  var selected=new Set((exam?.moduleIds||[]).map(String));
  if(!selected.size)return'';
  var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m.id));}).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target'),max=examMax(exam,m.name),parts=[];
    if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));
    if(raw!==null&&raw!==final)parts.push('åŸå§‹ '+formatScore(raw));
    if(target!==null)parts.push('ç›®æ ‡ '+formatScore(target));
    return parts.length?`<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' Â· ')}</span>`:'';
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
};

var accountHtmlBeforeV21=accountHtml;
accountHtml=function accountHtmlV21(){return accountHtmlBeforeV21().replace('æˆç»©æ¨¡å—','ç»„åˆè®¾ç½®').replace('è‡ªåŠ¨æ±‡æ€»å¸¸ç”¨ç»„åˆï¼Œä¸é‡å¤è®¡å…¥æ€»åˆ†ã€‚å†…ç½®è¯­æ•°å¤–ã€å››ç§‘å’Œå…­ç§‘ï¼Œä¹Ÿå¯ä»¥æ–°å¢è‡ªå·±çš„æ¨¡å—ã€‚','å…ˆåœ¨è¿™é‡Œå®šä¹‰å¸¸ç”¨ç»„åˆï¼›æ¯æ¬¡è€ƒè¯•åªæ˜¾ç¤ºä½ åœ¨â€œç»„åˆåˆ†â€é‡Œä¸»åŠ¨æ·»åŠ çš„ç»„åˆã€‚');};
if(typeof openModuleManagerV18==='function'){
  var openModuleManagerBeforeV21=openModuleManagerV18;
  openModuleManagerV18=function openModuleManagerV21(){openModuleManagerBeforeV21();var modal=state.modal;if(!modal)return;var h=modal.querySelector('.modal-head h3');if(h)h.textContent='ç»„åˆè®¾ç½®';var note=modal.querySelector('.form-note');if(note)note.textContent='è¿™é‡Œåªå®šä¹‰ç»„åˆç”±å“ªäº›ç§‘ç›®ç»„æˆï¼›ä¸ä¼šè‡ªåŠ¨å‡ºç°åœ¨æ¯åœºè€ƒè¯•é‡Œã€‚å½•æˆç»©æ—¶å¯åœ¨â€œç»„åˆåˆ†â€ä¸­æŒ‰éœ€æ·»åŠ ã€‚';var add=modal.querySelector('#addModuleV18');if(add)add.textContent='ï¼‹ è‡ªå®šä¹‰ç»„åˆ';modal.querySelectorAll('.module-editor-note-v18').forEach(function(x){x.textContent=x.textContent.replaceAll('æ¨¡å—','ç»„åˆ')});};
}

function configuredSubjectsV21(){return (state.subjectConfigs||[]).map(function(x){return x.name}).filter(Boolean);}
function subjectDefaultV21(name){var x=(state.subjectConfigs||[]).find(function(s){return s.name===name});return Number(x?.defaultMax??defaultMax(name)??100);}
function cardNameV21(card){return card.querySelector('.exam-subject-name-v10')?.value.trim()||'';}
function selectedNamesV21(modal){return [...modal.querySelectorAll('.exam-subject-card-v10')].map(cardNameV21).filter(Boolean);}

function decorateExamV21(exam,modal){
  var list=modal.querySelector('#examSubjectsV16');if(!list||modal.dataset.v21Ready==='1')return;modal.dataset.v21Ready='1';
  var configured=new Set(configuredSubjectsV21());
  if(!exam){[...list.querySelectorAll('.exam-subject-card-v10')].forEach(function(card){var name=cardNameV21(card);if(name&&!configured.has(name))card.remove();});}
  var subjectHead=list.previousElementSibling;
  if(subjectHead?.classList.contains('section-head-v7')){var p=subjectHead.querySelector('p');if(p)p.textContent='ç§‘ç›®ç»Ÿä¸€åœ¨â€œè´¦å· â†’ ç§‘ç›®è®¾ç½®â€ç»´æŠ¤ï¼›è¿™é‡Œä»…é€‰æ‹©æœ¬æ¬¡è€ƒè¯•å®é™…å‚åŠ çš„ç§‘ç›®ã€‚';}

  var entry=modal.querySelector('.rank-entry-mode-v17');
  var form=modal.querySelector('.form-grid');
  if(entry&&form){var box=document.createElement('div');box.className='rank-entry-top-v21';form.insertAdjacentElement('afterend',box);box.appendChild(entry);}

  var addOld=modal.querySelector('#addExamSubjectV16'),addOldFn=addOld?.onclick;
  if(addOld){addOld.style.display='none';var picker=document.createElement('div');picker.className='subject-picker-v21';picker.innerHTML='<select id="subjectPickerV21"><option value="">ï¼‹ é€‰æ‹©ç§‘ç›®</option>'+configuredSubjectsV21().map(function(n){return `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`}).join('')+'</select><span class="template-note-v10">æ–°å¢ç§‘ç›®è¯·åˆ°è´¦å·è®¾ç½®ã€‚</span>';addOld.parentNode.insertBefore(picker,addOld);var select=picker.querySelector('select');select.onchange=function(){var name=this.value;if(!name)return;if(selectedNamesV21(modal).includes(name)){toast('æœ¬æ¬¡è€ƒè¯•å·²é€‰æ‹©ã€Œ'+name+'ã€');this.value='';return;}if(typeof addOldFn==='function')addOldFn.call(addOld);setTimeout(function(){var cards=modal.querySelectorAll('.exam-subject-card-v10'),card=cards[cards.length-1],input=card?.querySelector('.exam-subject-name-v10');if(input){input.value=name;var max=subjectDefaultV21(name),m=card.querySelector('.max-v16'),rm=card.querySelector('.rawmax-v16');if(m)m.value=max;if(rm)rm.value=max;input.dispatchEvent(new Event('input',{bubbles:true}));}decorateCards();select.value='';},0);};}

  function decorateCards(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var input=card.querySelector('.exam-subject-name-v10');if(!input)return;var name=input.value.trim();var head=card.querySelector('.exam-subject-head-v10');var label=head?.querySelector('.subject-fixed-v21');if(!label&&head){label=document.createElement('div');label.className='subject-fixed-v21';head.insertBefore(label,input);}if(label)label.innerHTML=escapeHtml(name||'æœªé€‰æ‹©')+(!configured.has(name)&&name?'<span class="subject-history-v21">å†å²é¡¹ç›®</span>':'');input.readOnly=true;var ex=card.querySelector('.exclude-total-check-v17');if(ex&&configured.has(name))ex.checked=false;});}

  var totalRanks=modal.querySelector('.total-ranks-v16'),rankNote=modal.querySelector('.rank-compat-v16'),positionNote=modal.querySelector('.position-note-v17'),preview=modal.querySelector('.score-total-preview-v13');
  var rankHead=totalRanks?.previousElementSibling;
  while(rankHead&&(!rankHead.classList||!rankHead.classList.contains('section-head-v7')))rankHead=rankHead.previousElementSibling;
  if(rankHead){var h=rankHead.querySelector('h4'),p=rankHead.querySelector('p');if(h)h.textContent='ç»„åˆåˆ†';if(p)p.textContent='æ€»åˆ†è‡ªåŠ¨æ±‡æ€»ï¼›ä¸‹é¢å¯æŒ‰éœ€æ·»åŠ ä½ åœ¨è®¾ç½®é‡Œå®šä¹‰çš„ç»„åˆã€‚';rankHead.classList.add('combo-section-v21');}
  if(totalRanks&&rankHead){var totalCard=document.createElement('div');totalCard.className='combo-total-v21';totalCard.innerHTML='<div class="combo-head-v21"><div><b>æ€»åˆ†</b><span>è‡ªåŠ¨æ±‡æ€»æœ¬æ¬¡ç§‘ç›®ï¼›æ’å/ä½æ¯”å‡å¯ç•™ç©ºã€‚</span></div></div>';rankHead.insertAdjacentElement('afterend',totalCard);if(preview)totalCard.appendChild(preview);totalCard.appendChild(totalRanks);if(positionNote)totalCard.appendChild(positionNote);if(rankNote)totalCard.appendChild(rankNote);
    var comboList=document.createElement('div');comboList.className='combo-list-v21';comboList.id='comboListV21';totalCard.insertAdjacentElement('afterend',comboList);
    var comboPicker=document.createElement('div');comboPicker.className='combo-picker-v21';comboPicker.innerHTML='<select id="comboPickerV21"><option value="">ï¼‹ æ·»åŠ ç»„åˆ</option>'+ (state.modulesV18||[]).map(function(m){return `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`}).join('') +'</select><span class="template-note-v10">ç»„åˆå†…å®¹åœ¨è´¦å·è®¾ç½®é‡Œç»´æŠ¤ã€‚</span>';comboList.insertAdjacentElement('afterend',comboPicker);
    modal._moduleIdsV21=[...(exam?.moduleIds||[])].map(String).filter(function(id){return moduleIdSetV21().has(id)});
    function renderCombos(){comboList.innerHTML=modal._moduleIdsV21.map(function(id){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===String(id)});if(!m)return'';return `<div class="combo-card-v21" data-combo-id="${escapeHtml(id)}"><div class="combo-head-v21"><div><b>${escapeHtml(m.name)}</b><span>${(m.subjects||[]).map(escapeHtml).join(' + ')}</span></div><button type="button" class="combo-remove-v21">ç§»é™¤</button></div><div class="combo-score-v21"><span>æœ€ç»ˆåˆ† <b data-combo-final>â€”</b></span><span>åŸå§‹åˆ† <b data-combo-raw>â€”</b></span></div></div>`;}).join('');comboList.querySelectorAll('.combo-remove-v21').forEach(function(btn){btn.onclick=function(){var id=this.closest('[data-combo-id]').dataset.comboId;modal._moduleIdsV21=modal._moduleIdsV21.filter(function(x){return x!==id});renderCombos();};});updateComboScores();}
    function currentValue(name,klass){var card=[...modal.querySelectorAll('.exam-subject-card-v10')].find(function(c){return cardNameV21(c)===name});if(!card)return null;return num(card.querySelector(klass)?.value);}
    function comboSum(m,klass){var sum=0;for(var s of m.subjects||[]){var v=currentValue(s,klass);if(v===null)return null;sum+=v;}return sum;}
    function updateComboScores(){comboList.querySelectorAll('[data-combo-id]').forEach(function(card){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===card.dataset.comboId});if(!m)return;var final=comboSum(m,'.actual-v16'),raw=comboSum(m,'.raw-v16');card.querySelector('[data-combo-final]').textContent=formatScore(final);card.querySelector('[data-combo-raw]').textContent=formatScore(raw);});}
    comboPicker.querySelector('select').onchange=function(){var id=this.value;if(!id)return;if(modal._moduleIdsV21.includes(id)){toast('è¿™ä¸ªç»„åˆå·²ç»æ·»åŠ äº†');this.value='';return;}modal._moduleIdsV21.push(id);renderCombos();this.value='';};modal.addEventListener('input',function(){setTimeout(updateComboScores,0)});renderCombos();
  }
  decorateCards();var obs=new MutationObserver(function(){decorateCards();});obs.observe(list,{childList:true,subtree:true});
}

var openExamBeforeV21=openExam;
openExam=function openExamV21(exam=null){openExamBeforeV21(exam);if(state.modal)decorateExamV21(exam,state.modal);};

saveExam=async function saveExamV21(id,modal){
  modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var raw=card.querySelector('.raw-v16'),actual=card.querySelector('.actual-v16'),rawMax=num(card.querySelector('.rawmax-v16')?.value),finalMax=num(card.querySelector('.max-v16')?.value);if(raw&&actual&&String(actual.value||'').trim()===''&&String(raw.value||'').trim()!==''&&rawMax!==null&&finalMax!==null&&rawMax===finalMax)actual.value=raw.value;});
  var button=modal.querySelector('.save-btn'),mode=modal.dataset.rankEntryModeV17||'rank';
  var exam={id:id,name:modal.querySelector('#examName').value.trim(),exam_date:modal.querySelector('#examDate').value,grade_level:modal.querySelector('#gradeLevelV14')?.value||'',total_rank:mode==='rank'?(modal.querySelector('#totalRankV16')?.value||''):'',total_participants:mode==='rank'?(modal.querySelector('#totalParticipantsV16')?.value||''):'',total_class_rank:mode==='rank'?(modal.querySelector('#totalClassRankV16')?.value||''):'',total_class_participants:mode==='rank'?(modal.querySelector('#totalClassParticipantsV16')?.value||''):'',total_year_position_percent:mode==='percent'?(modal.querySelector('.total-year-position-v17')?.value||''):'',total_class_position_percent:mode==='percent'?(modal.querySelector('.total-class-position-v17')?.value||''):'',is_hidden:modal.querySelector('#examHiddenV16')?.value==='1',moduleIds:[...(modal._moduleIdsV21||[])],scores:{}};
  var configured=new Set(configuredSubjectsV21()),seen=new Set();
  for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=cardNameV21(card);if(!name)return toast('è¯·é€‰æ‹©ç§‘ç›®');if(seen.has(name))return toast(`ç§‘ç›®ã€Œ${name}ã€é‡å¤äº†`);seen.add(name);var historical=!configured.has(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:historical?!!card.querySelector('.exclude-total-check-v17')?.checked:false};}
  if(!exam.name||!exam.exam_date)return toast('è¯·å¡«å†™è€ƒè¯•åç§°å’Œæ—¥æœŸ');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='ä¿å­˜ä¸­â€¦';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'å·²ä¿å­˜ä¿®æ”¹':'è€ƒè¯•å·²è®°å½•');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'ä¿å­˜ä¿®æ”¹':'ä¿å­˜è€ƒè¯•';}
};

/* ===== app-v22.js ===== */
// v22 / product v1.1: keep raw-only fallback scientifically safe across different score scales.
(function(){
  var base=typeof examScoreBeforeV20==='function'?examScoreBeforeV20:examScore;
  examScore=function examScoreV22(exam,subject,key){
    if(key!=='actual')return base(exam,subject,key);
    var row=exam?.scores?.[subject];
    if(row){
      var actual=num(row.actual);if(actual!==null)return actual;
      var raw=num(row.raw),max=num(row.max)??defaultMax(subject),rawMax=num(row.rawMax)??max;
      return raw!==null&&rawMax===max?raw:null;
    }
    return base(exam,subject,key);
  };
  if(typeof recordHtmlBeforeV20==='function')recordHtml=function recordHtmlV22(exam){return recordHtmlBeforeV20(exam);};
})();

/* ===== app-v23.js ===== */
// v23 / product v1.9: stop subject add/remove mutation storms and keep subject settings lightweight.
(function(){
  var PRODUCT_VERSION_V23='v1.9';

  function syncVersionV23(){
    /* åªè¯» meta(ç‰ˆæœ¬å”¯ä¸€æ¥æºæ˜¯ index.html),ä¸å†è¦†å†™ */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker Â· '+v;
  }
  syncVersionV23();

  // v17 and v21 both decorate the exam subject list with MutationObserver({subtree:true}).
  // Adding/removing a subject rebuilds the list, then each decorator mutates the same subtree,
  // causing the observers to wake each other repeatedly on slower/mobile browsers.
  // They only need to know when cards are added/removed, so observe direct children only.
  var openExamBeforeV23=openExam;
  openExam=function openExamV23(exam=null){
    var NativeMutationObserver=window.MutationObserver;
    if(typeof NativeMutationObserver!=='function')return openExamBeforeV23(exam);

    function DirectChildMutationObserver(callback){
      var observer=new NativeMutationObserver(callback);
      var nativeObserve=observer.observe.bind(observer);
      observer.observe=function(target,options){
        if(target&&target.id==='examSubjectsV16'&&options&&options.childList){
          return nativeObserve(target,Object.assign({},options,{subtree:false}));
        }
        return nativeObserve(target,options);
      };
      return observer;
    }
    DirectChildMutationObserver.prototype=NativeMutationObserver.prototype;

    try{
      window.MutationObserver=DirectChildMutationObserver;
      return openExamBeforeV23(exam);
    }finally{
      window.MutationObserver=NativeMutationObserver;
      syncVersionV23();
    }
  };

  // The global subject settings screen does not need to rebuild every row when one row changes.
  // Keep existing save validation/API logic, but make add/remove a local DOM operation.
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV23=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV23(){
      openSubjectManagerBeforeV23();
      var modal=state.modal;
      var list=modal&&modal.querySelector('#subjectConfigList');
      var add=modal&&modal.querySelector('#addSubjectRowV7');
      if(!modal||!list||!add)return;

      function rowHtml(){
        return '<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="" placeholder="ç§‘ç›®/é¢˜å‹åç§°"><input class="subject-max-input-v7" inputmode="decimal" value="100" placeholder="é»˜è®¤æ»¡åˆ†"><button class="remove-subject-v7" type="button" title="ç§»é™¤">Ã—</button></div>';
      }
      function bindRemove(){
        list.querySelectorAll('.remove-subject-v7').forEach(function(button){
          button.onclick=function(){
            var rows=list.querySelectorAll('.subject-config-row-v7');
            if(rows.length<=1)return toast('è‡³å°‘ä¿ç•™ 1 ä¸ªç§‘ç›®');
            var row=button.closest('.subject-config-row-v7');
            if(row)row.remove();
          };
        });
      }
      bindRemove();
      add.onclick=function(){
        var count=list.querySelectorAll('.subject-config-row-v7').length;
        if(count>=20)return toast('æœ€å¤šè®¾ç½® 20 ä¸ªç§‘ç›®');
        list.insertAdjacentHTML('beforeend',rowHtml());
        bindRemove();
        var inputs=list.querySelectorAll('.subject-name-input-v7');
        if(inputs.length)inputs[inputs.length-1].focus();
      };
    };
  }
})();

/* ===== app-v24.js ===== */
// v24 / product v2.0: explicit subject settings mapping, manual weighted totals, and bundled read requests.
(function(){
  var PRODUCT_VERSION_V24='v2.0';

  function syncVersionV24(){
    /* ç‰ˆæœ¬å”¯ä¸€æ¥æºæ˜¯ index.html çš„ meta;æ­¤å¤„åªè¯»ä¸å†™(æ—§é€»è¾‘ä¼šæŠŠ meta è¦†å†™æˆ v2.0) */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker Â· '+v;
  }
  syncVersionV24();

  var style=document.createElement('style');
  style.id='app-v24-style';
  style.textContent=`
    .manual-total-v24{border-top:1px dashed var(--line);margin-top:10px;padding-top:11px}
    .manual-total-title-v24{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
    .manual-total-title-v24 b{font-size:12px;color:var(--text)}
    .manual-total-title-v24 span{font-size:9px;border:1px solid #dfe4ee;background:#fff;border-radius:999px;padding:3px 7px;color:var(--muted)}
    .manual-total-grid-v24{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .manual-total-field-v24{display:grid;gap:5px}
    .manual-total-field-v24 label{font-size:10px;color:var(--muted);font-weight:700}
    .manual-total-field-v24 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}
    .manual-total-field-v24 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .manual-total-note-v24{font-size:10px;color:var(--muted);line-height:1.6;margin-top:7px}
    .manual-total-note-v24 b{color:var(--text)}
    .subject-sync-note-v24{margin-top:10px;padding:10px 12px;border:1px solid #e2e7f0;background:#f8faff;border-radius:12px;font-size:11px;color:#667085;line-height:1.6}
    .subject-sync-note-v24 b{color:var(--text)}
    @media(max-width:620px){
      .manual-total-grid-v24{grid-template-columns:1fr}
      .manual-total-v24{margin-top:9px;padding-top:10px}
    }
  `;
  document.head.appendChild(style);

  // One list_exams response now also carries modules and account identity. Reuse it instead of issuing
  // a second modules request and a separate username identity read.
  if(typeof dataApiV7==='function'){
    var dataApiBeforeV24=dataApiV7;
    dataApiV7=async function dataApiV24(action,payload={}){
      if(action==='save_exam'&&payload&&payload.exam){
        var modal=state.modal&&state.modal.isConnected?state.modal:document.querySelector('.modal-backdrop');
        var finalInput=modal&&modal.querySelector('.total-actual-override-v24');
        var rawInput=modal&&modal.querySelector('.total-raw-override-v24');
        if(finalInput)payload.exam.total_actual_score=String(finalInput.value||'').trim();
        if(rawInput)payload.exam.total_raw_score=String(rawInput.value||'').trim();
      }
      var data=await dataApiBeforeV24(action,payload);
      if((action==='list_exams'||action==='bootstrap')&&data){
        if(Array.isArray(data.modules)){
          state.modulesV18=data.modules;
          state._modulesBundledV24=true;
        }
        if(data.user){
          state.user=Object.assign({},state.user||{},data.user);
          state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username||'';
          state._identityBundledV24=true;
        }
      }
      return data;
    };
  }
  if(typeof modulesApiV18==='function'){
    var modulesApiBeforeV24=modulesApiV18;
    modulesApiV18=async function modulesApiV24(action,payload={}){
      if(action==='list_modules'&&state._modulesBundledV24)return{modules:state.modulesV18||[]};
      var data=await modulesApiBeforeV24(action,payload);
      if(action==='save_modules'&&data&&Array.isArray(data.modules)){
        state.modulesV18=data.modules;
        state._modulesBundledV24=true;
      }
      return data;
    };
  }
  if(typeof usernameApiV19==='function'){
    var usernameApiBeforeV24=usernameApiV19;
    usernameApiV19=async function usernameApiV24(action,payload){
      if(action==='get'&&state._identityBundledV24&&state.user){
        return{user:{username:state.user.username,originalUsername:state.originalUsernameV19||state.user.username}};
      }
      return usernameApiBeforeV24(action,payload);
    };
  }

  // Manual total overrides are nullable. Null means "use automatic sum".
  var totalForBeforeV24=totalFor;
  totalFor=function totalForV24(exam,key){
    if(key==='actual'){
      var override=num(exam?.total_actual_score);
      if(override!==null)return override;
    }
    return totalForBeforeV24(exam,key);
  };
  if(typeof totalRawForV13==='function'){
    var totalRawBeforeV24=totalRawForV13;
    totalRawForV13=function totalRawForV24(exam){
      var override=num(exam?.total_raw_score);
      return override!==null?override:totalRawBeforeV24(exam);
    };
  }

  // If a user explicitly supplies a weighted final total, treat it as the exam's authoritative
  // headline even when the component subject rows are incomplete.
  if(typeof latestMetricV20==='function'){
    var latestMetricBeforeV24=latestMetricV20;
    latestMetricV20=function latestMetricV24(){
      var exams=typeof sortedVisibleExamsV20==='function'?sortedVisibleExamsV20():[...(state.exams||[])];
      var base=latestMetricBeforeV24();
      var manual=null;
      for(var i=exams.length-1;i>=0;i--){
        var exam=exams[i],override=num(exam?.total_actual_score);
        if(override===null)continue;
        manual={label:'æœ€è¿‘ä¸€æ¬¡çœŸå®æ€»åˆ†',value:override,exam:exam,delta:previousTotalDeltaV20(exams,i,exam,override,totalScopeSubjectsV20(exam)),deltaLabel:'è¾ƒä¸Šæ¬¡åŒå£å¾„'};
        break;
      }
      if(!manual)return base;
      if(!base)return manual;
      function orderKey(x){
        var e=x&&x.exam||{};
        return String(e.exam_date||'')+'|'+String(e.created_at||e.updated_at||'');
      }
      return orderKey(manual)>=orderKey(base)?manual:base;
    };
  }

  function modalAutoTotalsV24(modal){
    var finalSum=0,rawSum=0,finalCount=0,rawCount=0;
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      var excluded=!!card.querySelector('.exclude-total-check-v17')?.checked;
      if(excluded)return;
      var actual=num(card.querySelector('.actual-v16')?.value);
      var raw=num(card.querySelector('.raw-v16')?.value);
      var finalMax=num(card.querySelector('.max-v16')?.value);
      var rawMax=num(card.querySelector('.rawmax-v16')?.value)??finalMax;
      if(actual===null&&raw!==null&&finalMax!==null&&rawMax===finalMax)actual=raw;
      if(actual!==null){finalSum+=actual;finalCount++;}
      var rawEffective=raw!==null?raw:actual;
      if(rawEffective!==null){rawSum+=rawEffective;rawCount++;}
    });
    return{final:finalCount?Math.round(finalSum*100)/100:null,raw:rawCount?Math.round(rawSum*100)/100:null};
  }

  function decorateManualTotalsV24(exam,modal){
    if(!modal||modal.dataset.v24Totals==='1')return;
    var totalCard=modal.querySelector('.combo-total-v21')||modal.querySelector('.score-total-preview-v13')?.parentElement;
    if(!totalCard)return;
    modal.dataset.v24Totals='1';
    var box=document.createElement('div');
    box.className='manual-total-v24';
    box.innerHTML=`<div class="manual-total-title-v24"><b>æ€»åˆ†è®¡ç®—</b><span>å¯é€‰æ‰‹åŠ¨å€¼</span></div><div class="manual-total-grid-v24"><div class="manual-total-field-v24"><label>æœ€ç»ˆ / èµ‹åˆ†æ€»åˆ†</label><input class="total-actual-override-v24" inputmode="decimal" value="${exam?.total_actual_score??''}" placeholder="è‡ªåŠ¨è®¡ç®—"></div><div class="manual-total-field-v24"><label>åŸå§‹æ€»åˆ†</label><input class="total-raw-override-v24" inputmode="decimal" value="${exam?.total_raw_score??''}" placeholder="è‡ªåŠ¨è®¡ç®—"></div></div><div class="manual-total-note-v24">ç•™ç©ºæ—¶æŒ‰æœ¬æ¬¡ç§‘ç›®è‡ªåŠ¨æ±‡æ€»ï¼›å¦‚å½“åœ°è§„åˆ™éœ€è¦åŠ æƒï¼Œå¯ç›´æ¥å¡«å†™å­¦æ ¡ç»™å‡ºçš„æ€»åˆ†ã€‚<b>æ‰‹åŠ¨å€¼ä¼šç”¨äºè®°å½•ã€è¶‹åŠ¿å’Œé¦–é¡µæœ€è¿‘æˆç»©ã€‚</b></div>`;
    var head=totalCard.querySelector('.combo-head-v21');
    if(head)head.insertAdjacentElement('afterend',box);else totalCard.insertBefore(box,totalCard.firstChild);
    var finalInput=box.querySelector('.total-actual-override-v24'),rawInput=box.querySelector('.total-raw-override-v24');
    function refresh(){
      var x=modalAutoTotalsV24(modal);
      finalInput.placeholder=x.final===null?'è‡ªåŠ¨è®¡ç®—':'è‡ªåŠ¨ '+formatScore(x.final);
      rawInput.placeholder=x.raw===null?'è‡ªåŠ¨è®¡ç®—':'è‡ªåŠ¨ '+formatScore(x.raw);
    }
    modal.addEventListener('input',function(e){if(!e.target.matches('.total-actual-override-v24,.total-raw-override-v24'))refresh();});
    refresh();
  }

  var openExamBeforeV24=openExam;
  openExam=function openExamV24(exam=null){
    var result=openExamBeforeV24(exam);
    if(state.modal)decorateManualTotalsV24(exam,state.modal);
    return result;
  };

  function subjectSettingsCardV24(){
    var subjects=(state.subjectConfigs&&state.subjectConfigs.length)
      ?state.subjectConfigs
      :SUBJECTS.map(function(name,index){return{name:name,defaultMax:defaultMax(name),sortOrder:index+1};});
    return '<div class="card subject-settings-v7"><div class="subject-settings-head-v7"><div><h3 class="card-title">ç§‘ç›®è®¾ç½®</h3><p class="card-sub">åœ¨è¿™é‡Œæ·»åŠ ã€æ”¹åã€åˆ é™¤ç§‘ç›®å¹¶è®¾ç½®é»˜è®¤æ»¡åˆ†ï¼›ä¿å­˜åä¼šç«‹å³åŒæ­¥åˆ°â€œè®°å½•è€ƒè¯• â†’ é€‰æ‹©ç§‘ç›®â€çš„åˆ—è¡¨ã€‚</p></div><button class="secondary" id="manageSubjectsBtn">ç®¡ç†ç§‘ç›®</button></div><div class="subject-chip-list-v7">'+subjects.map(function(item){return '<span class="subject-chip-v7"><b>'+escapeHtml(item.name)+'</b> Â· æ»¡åˆ† '+formatScore(item.defaultMax)+'</span>';}).join('')+'</div><div class="subtle-note" style="margin-top:12px">ç§»é™¤ç§‘ç›®ä¸ä¼šåˆ é™¤å†å²æˆç»©ï¼›ä»¥åé‡æ–°æ·»åŠ åŒåç§‘ç›®ï¼Œå†å²æ•°æ®ä¼šé‡æ–°æ˜¾ç¤ºã€‚</div><div class="subject-sync-note-v24"><b>ç§‘ç›®è®¾ç½®å°±æ˜¯å½•å…¥æ—¶çš„é€‰æ‹©åˆ—è¡¨ã€‚</b> è¿™é‡Œæ²¡æœ‰çš„ç§‘ç›®ä¸ä¼šä½œä¸ºæ–°è€ƒè¯•çš„å¯é€‰é¡¹ï¼›å†å²è€ƒè¯•ä»ä¿ç•™åŸæ•°æ®ã€‚</div></div>';
  }

  // Make the settings -> entry-list relationship explicit. The underlying picker already reads
  // state.subjectConfigs; this wording makes the source of truth obvious to users.
  var accountHtmlBeforeV24=accountHtml;
  accountHtml=function accountHtmlV24(){
    var html=accountHtmlBeforeV24();
    if(html.indexOf('subject-settings-v7')===-1){
      // The account page dropped the subject settings card back in v10/v14; restore it here so
      // â€œè´¦å· â†’ ç§‘ç›®è®¾ç½®â€ exists again and the manager modal keeps its entry point.
      var card=subjectSettingsCardV24();
      var anchor='<div class="card category-settings-v14">';
      if(html.indexOf(anchor)!==-1)html=html.replace(anchor,card+anchor);
      else html+=card;
    }else{
      html=html.replace(/(<h3 class="card-title">ç§‘ç›®è®¾ç½®<\/h3><p class="card-sub">)[\s\S]*?(<\/p>)/,
        '$1åœ¨è¿™é‡Œæ·»åŠ ã€æ”¹åã€åˆ é™¤ç§‘ç›®å¹¶è®¾ç½®é»˜è®¤æ»¡åˆ†ï¼›ä¿å­˜åä¼šç«‹å³åŒæ­¥åˆ°â€œè®°å½•è€ƒè¯• â†’ é€‰æ‹©ç§‘ç›®â€çš„åˆ—è¡¨ã€‚$2');
      html=html.replace(/(<div class="subtle-note" style="margin-top:12px">ç§»é™¤ç§‘ç›®ä¸ä¼šåˆ é™¤å†å²æˆç»©ï¼›ä»¥åé‡æ–°æ·»åŠ åŒåç§‘ç›®ï¼Œå†å²æ•°æ®ä¼šé‡æ–°æ˜¾ç¤ºã€‚<\/div>)/,
        '$1<div class="subject-sync-note-v24"><b>ç§‘ç›®è®¾ç½®å°±æ˜¯å½•å…¥æ—¶çš„é€‰æ‹©åˆ—è¡¨ã€‚</b> è¿™é‡Œæ²¡æœ‰çš„ç§‘ç›®ä¸ä¼šä½œä¸ºæ–°è€ƒè¯•çš„å¯é€‰é¡¹ï¼›å†å²è€ƒè¯•ä»ä¿ç•™åŸæ•°æ®ã€‚</div>');
    }
    return html;
  };
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV24=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV24(){
      var result=openSubjectManagerBeforeV24();
      var modal=state.modal;if(!modal)return result;
      var info=modal.querySelector('.info-box');
      if(info)info.innerHTML='<b>è¿™é‡Œç»´æŠ¤å½•åˆ†ç§‘ç›®åˆ—è¡¨ã€‚</b> å¯ä»¥æ–°å¢ã€æ”¹åã€ç§»é™¤å¹¶è®¾ç½®é»˜è®¤æ»¡åˆ†ï¼›ä¿å­˜åï¼Œæ–°å»º/ç¼–è¾‘è€ƒè¯•é‡Œçš„â€œé€‰æ‹©ç§‘ç›®â€ä¼šç›´æ¥è¯»å–è¿™é‡Œã€‚æœ€å¤š 20 ä¸ªã€‚';
      return result;
    };
  }

  syncVersionV24();
})();

/* ===== app-v25.js ===== */
// v25 / product v2.4: combo ranks, combo trends, score/percent view, full-trend PNG export,
// tooltip clamping, record/group reordering, password rule update, overview redesign.
(function(){
  var PRODUCT_VERSION_V25='v2.4';

  function syncVersionV25(){
    /* ç‰ˆæœ¬å”¯ä¸€æ¥æºæ˜¯ index.html çš„ meta;æ­¤å¤„åªè¯»ä¸å†™(æ—§é€»è¾‘ä¼šæŠŠ meta è¦†å†™æˆ v2.4) */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker Â· '+v;
  }
  syncVersionV25();

  state.scoreViewV25 = state.scoreViewV25 || 'score';

  // ---------- styles ----------
  if(typeof document!=='undefined'){
    var style=document.createElement('style');
    style.id='app-v25-style';
    style.textContent=`
      .combo-rank-v25{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
      .combo-rank-v25>div{min-width:0}
      .combo-rank-v25 b{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:5px}
      .combo-rank-pair-v25{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .combo-rank-pair-v25 input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;padding:8px 7px;background:#fff;outline:none;font-size:12px}
      .trend-actions-v25{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px}
      .trend-actions-v25 button{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:7px 12px;font-size:11px;cursor:pointer;transition:border-color .15s,color .15s}
      .trend-actions-v25 button:hover{border-color:#a9b4c8;color:#2c3648}
      .trend-actions-v25 button:active{transform:scale(.97)}
      .full-trend-modal-v25 .modal{max-width:920px}
      .full-trend-stage-v25{overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain;border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px 12px}
      .full-trend-scroll-hint-v25{font-size:10px;color:var(--muted);margin-top:7px}
      .full-trend-actions-v25{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      .score-view-v25{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;margin:0 0 4px}
      .score-view-v25 .label{font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap}
      .score-view-v25 .basis-btn-v13{flex:0 1 auto;width:auto;padding:7px 11px;white-space:nowrap}
      .combo-chips-v25{display:flex;gap:8px;overflow:auto;padding:0 0 8px;margin-top:6px;scrollbar-width:none;touch-action:pan-x;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
      .combo-chips-v25::-webkit-scrollbar{display:none}
      .order-btn-v25{border:1px solid var(--line);background:#fff;color:#667085;border-radius:8px;width:28px;height:28px;font-size:12px;line-height:1;padding:0;flex:0 0 auto;cursor:pointer}
      .order-btn-v25:hover, .order-btn-v25:active{border-color:#a9b4c8;color:#2c3648}
      .grade-section-head-v13 .order-btn-v25{width:30px;height:26px}
      .tooltip-card{white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:min(300px,calc(100vw - 16px))}
      .people-total-v25{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 10px}
      .people-total-v25>div{display:grid;gap:5px;min-width:0}
      .people-total-v25 label{font-size:10px;color:var(--muted);font-weight:700}
      .people-total-v25 input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}
      .end-date-field-v25{min-width:0}
      .combo-chips-v25 .label{font-size:12px;color:var(--muted);font-weight:700;white-space:nowrap}
      .basis-btn-v13.active{background:var(--text);color:#fff;border-color:var(--text)}
      .score-basis-v13{margin:0 0 10px}
      .radar-pick-v25{margin-top:8px}
      .radar-selection-v25{min-width:0;width:100%}
      .radar-card .radar-wrap.radar-empty-v25{height:180px}
      .radar-selection-note-v25{display:block;width:100%;margin-top:10px;font-size:13px;line-height:1.7;color:var(--muted);overflow-wrap:anywhere}
      .radar-pick-v25 .secondary{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:8px 13px;font-size:12px;cursor:pointer}
      .radar-picked-v25{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .radar-pick-chip-v25{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;color:#556070;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}
      .radar-pick-chip-v25:hover{border-color:#a9b4c8}
      .radar-pick-chip-v25{max-width:100%;text-align:left;white-space:normal;overflow-wrap:anywhere}
      .radar-pick-group-v25{margin:0 0 12px}
      .radar-pick-group-v25 h4{font-size:12px;color:var(--muted);margin:0 0 4px}
      .radar-pick-option-v25{display:flex;align-items:center;gap:8px;padding:9px 2px;font-size:13px;color:var(--text);border-bottom:1px solid var(--line);cursor:pointer}
      .radar-pick-option-v25 input{width:16px;height:16px;flex-shrink:0;accent-color:#5d72e8}
      .radar-pick-option-v25 span{min-width:0;overflow-wrap:anywhere}
      .trend-legend-row-v25{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}
      .trend-legend-row-v25 .legend{margin:0}
      .trend-legend-row-v25 .trend-scroll-hint-v19{margin:0;margin-left:auto;text-align:right}
      .quick-card .mini-stat span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rank-entry-mode-v17{gap:6px;margin:2px 0 28px}
      .rank-entry-mode-v17 button{padding:5px 9px;font-size:10.5px}
      .rank-entry-top-v21{margin:10px 0 14px;padding:9px 12px}
      .people-total-v25{margin-top:10px}
      @media(max-width:620px){
        .combo-rank-v25{grid-template-columns:1fr;gap:8px;padding-top:9px}
        .full-trend-stage-v25{padding:10px 8px}
        .order-btn-v25{width:32px;height:32px}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function moduleByIdV25(id){return(state.modulesV18||[]).find(function(m){return String(m&&m.id)===String(id);})||null;}
  function comboIdV25(name){var m=(state.modulesV18||[]).find(function(x){return x&&x.name===name;});return m?String(m.id):null;}
  function isComboSubjectV25(s){return comboIdV25(s)!==null;}
  function comboRankInfoV25(exam,name,scope){
    if(!exam||!name)return{rank:null,participants:null,performance:null};
    var id=comboIdV25(name);if(!id)return{rank:null,participants:null,performance:null};
    var ranksMap=examRanksForV25(exam);
    var row=(ranksMap&&ranksMap[id])||{};
    var isClass=scope==='class';
    var rank=num(isClass?row.classRank:row.yearRank);
    var participants=num(isClass?row.classParticipants:row.yearParticipants);
    if(participants===null)participants=num(isClass?exam.total_class_participants:exam.total_participants);
    var performance=rank===null?null:(typeof rankPerformanceV7==='function'?rankPerformanceV7(rank,participants):null);
    return{rank:rank,participants:participants,performance:performance};
  }
  function scopeLabelV25(){return(state.rankScopeV16==='class')?'ç­æ’':'å¹´æ’';}

  // A) å¹´çº§/ç­çº§æ€»äººæ•°çš„æœ¬æœºè®°å¿†ä¸è‡ªåŠ¨å¡«å……
  function peopleKeyV25(){return 'st_people_v25_'+(state.user&&state.user.username||'anon');}
  function peopleLoadV25(){
    var raw=localStorage.getItem(peopleKeyV25())||'';var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    return(d&&typeof d==='object')?d:{};
  }
  function peopleSaveV25(d){try{localStorage.setItem(peopleKeyV25(),JSON.stringify(d||{}));}catch(e){}}

  // é¦–é¡µä¾§æ æ¦‚å†µï¼šæ¬¡æ•° / å¹³å‡å¾—åˆ†ç‡ / è¾¾æˆç›®æ ‡æ¬¡æ•° / è·æœ€è¿‘ç›®æ ‡åˆ†å·®
  // å¾—åˆ†ç‡ç”¨äºã€Œå¹³å‡ã€ï¼ˆç§‘ç›®æ•°ä¸åŒå¯æ¯”ï¼‰ï¼›ç›®æ ‡è¾¾æˆä¸å·®è·æŒ‰åŒä¸€åœºè€ƒè¯•çš„åŸå§‹æ€»åˆ†æ¯”è¾ƒï¼ˆåŒä¸€åœºæ»¡åˆ†ç›¸åŒï¼Œåˆ†å·®æœ€ç›´è§‚ï¼‰
  function quickStatsV25(){
    var exams=state.exams||[];
    var rates=[];
    exams.forEach(function(e){var r=totalRate(e,'actual');if(r!==null)rates.push({rate:r,exam:e});});
    var sum=0;rates.forEach(function(x){sum+=x.rate;});
    var avg=rates.length?Math.round(sum/rates.length*10)/10:null;
    var met=0,targetExams=0,gap=null;
    for(var i=0;i<exams.length;i++){
      var e=exams[i],a=totalFor(e,'actual'),t=totalFor(e,'target');
      if(t===null)continue;
      targetExams++;
      if(a!==null&&a>=t)met++;
      if(gap===null&&a!==null)gap=Math.round((t-a)*10)/10;
    }
    return{count:exams.length,avg:avg,met:met,targetExams:targetExams,gap:gap};
  }

  // ç»„åˆæ’åï¼šäº‘ç«¯ä¼˜å…ˆï¼Œæœ¬åœ°å…œåº•ï¼ˆåç«¯ Edge Function æ”¯æŒ moduleRanks å‰å…ˆå­˜åœ¨æœ¬æœºï¼‰
  function comboRanksKeyV25(){return 'st_moduleranks_v25_'+(state.user&&state.user.username||'anon');}
  function comboRanksCacheV25(){
    try{var raw=localStorage.getItem(comboRanksKeyV25())||'';var d=raw?JSON.parse(raw):null;return d&&typeof d==='object'?d:{};}catch(e){return{};}
  }
  function examRanksForV25(exam){
    if(exam&&exam.moduleRanks&&typeof exam.moduleRanks==='object'&&Object.keys(exam.moduleRanks).length)return exam.moduleRanks;
    if(!exam||!exam.exam_date||!exam.name)return{};
    return comboRanksCacheV25()[exam.exam_date+'|'+exam.name]||{};
  }
  function rememberRanksV25(examDate,examName,ranks){
    try{var c=comboRanksCacheV25();c[String(examDate||'')+'|'+String(examName||'')]=ranks||{};localStorage.setItem(comboRanksKeyV25(),JSON.stringify(c));}catch(e){}
  }
  function fillPeopleDownV25(modal,year,cls){
    if(!modal)return;
    function fill(input,val){
      if(!input||!val)return;
      if(input.dataset.userSetV25==='1')return;                 // ç”¨æˆ·æ”¹è¿‡ï¼šä»¥ç”¨æˆ·ä¸ºå‡†
      if(input.dataset.autoV25!=='1'&&String(input.value||'')!=='')return; // å·²æœ‰ä¿å­˜å€¼ï¼ˆç¼–è¾‘æ—§è€ƒè¯•ï¼‰
      input.value=val;input.dataset.autoV25='1';
    }
    fill(modal.querySelector('#totalParticipantsV16'),year);
    fill(modal.querySelector('#totalClassParticipantsV16'),cls);
    modal.querySelectorAll('.year-participants-v16').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.class-participants-v16').forEach(function(i){fill(i,cls);});
    // ç»„åˆåˆ†çš„äººæ•°ç©ºåŒæ ·è‡ªåŠ¨å¡«ï¼ˆç”¨æˆ·æ”¹è¿‡çš„ä¸è¦†ç›–ï¼‰
    modal.querySelectorAll('.combo-yp-v25').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.combo-cp-v25').forEach(function(i){fill(i,cls);});
  }
  // C1) å¼¹çª—å†…æ–‡æ¡ˆç²¾ç®€ï¼šåˆ çº¯è¯´æ˜æ–‡å­—ï¼Œä¿ç•™å¿…è¦æç¤ºï¼ˆé˜²è¯¯åˆ ã€çŠ¶æ€è¯´æ˜ï¼‰
  function declutterModalV25(modal){
    if(!modal)return;
    modal.querySelectorAll('.rank-science-box-v7,.rank-compat-v16,.position-note-v17,.template-note-v10').forEach(function(el){el.remove();});
    modal.querySelectorAll('.section-head-v7 p').forEach(function(p){p.remove();});
    // ç§‘ç›®è®¾ç½®å¼¹çª—é‡Œçš„ã€Œç§»é™¤ä¸åˆ å†å²æˆç»©ã€æ˜¯å¿…è¦æç¤ºï¼Œä¿ç•™
    if(!modal.querySelector('#subjectConfigList')){
      modal.querySelectorAll('p.form-note').forEach(function(p){p.remove();});
    }
  }
  // C1) é¡µé¢æ–‡æ¡ˆç²¾ç®€ï¼šåˆ å†—ä½™ä»‹ç»ï¼Œä¿ç•™å¿…è¦æç¤ºï¼ˆé˜²è¯¯åˆ ã€åŠŸèƒ½å‰ç¼€ã€ç©ºæ€ã€å›¾ä¾‹ï¼‰
  function stripVerboseV25(html){
    return String(html||'')
      .replace(/<p class="card-sub">[\s\S]*?<\/p>/g,'')
      .replace(/<p class="hero-desc">[\s\S]*?<\/p>/g,'')
      .replace(/<div class="axis-caption-v6">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-method-v7">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="raw-rank-note-v11">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-science-box-v7">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-compat-v16">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="position-note-v17">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="subject-sync-note-v24">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="username-origin-v19">[\s\S]*?<\/div>/g,'')
      .replace(/<span class="template-note-v10">[\s\S]*?<\/span>/g,'')
      .replace(/<div class="subtle-note"([^>]*)>([\s\S]*?)<\/div>/g,function(m,attrs,inner){
        if(inner.indexOf('ç§»é™¤ç§‘ç›®')!==-1||inner.indexOf('ä¸ä¼šåˆ é™¤å†å²æˆç»©')!==-1||inner.indexOf('ç»„åˆï¼š')!==-1)return m;
        return '';
      })
      .replace(/(<div class="card hero-main">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/,'$1çœ‹è§èµ·ä¼ï¼Œä¹Ÿçœ‹è§è‡ªå·±åœ¨è¿›æ­¥ã€‚$2')
      .replace(/(<div class="page-head">[\s\S]*?<h2>[^<]*<\/h2>)<p>[\s\S]*?<\/p>/g,'$1');
  }

  // ---------- A) optional ranks per combo in the exam modal ----------
  var openExamBeforeV25=openExam;
  openExam=function openExamV25(exam){
    openExamBeforeV25(exam);
    var modal=state.modal;if(!modal)return;

    // A) å¹´çº§/ç­çº§æ€»äººæ•°ï¼šä¸€è¡Œè®¾ç½®ï¼Œæœ¬æœºè®°ä½ï¼Œè‡ªåŠ¨å¡«åˆ°ä¸‹é¢æ‰€æœ‰äººæ•°ç©ºï¼ˆç”¨æˆ·æ”¹è¿‡çš„ä¸è¦†ç›–ï¼‰
    var entry=modal.querySelector('.rank-entry-mode-v17');
    if(entry&&!modal.querySelector('.people-total-v25')){
      var peopleBox=document.createElement('div');
      peopleBox.className='people-total-v25';
      peopleBox.innerHTML='<div><label>å¹´çº§æ€»äººæ•°</label><input class="pt-year-v25" inputmode="numeric" pattern="[0-9]*" placeholder="å¦‚ 620"></div><div><label>ç­çº§æ€»äººæ•°</label><input class="pt-class-v25" inputmode="numeric" pattern="[0-9]*" placeholder="å¦‚ 45"></div>';
      entry.insertAdjacentElement('afterend',peopleBox);
      var pYear=peopleBox.querySelector('.pt-year-v25'),pClass=peopleBox.querySelector('.pt-class-v25');
      var savedPeople=peopleLoadV25();
      pYear.value=savedPeople.year??(modal.querySelector('#totalParticipantsV16')?.value||'');
      pClass.value=savedPeople.class??(modal.querySelector('#totalClassParticipantsV16')?.value||'');
      function fillDown(){fillPeopleDownV25(modal,pYear.value.trim(),pClass.value.trim());}
      pYear.addEventListener('input',function(){peopleSaveV25({year:pYear.value.trim(),class:pClass.value.trim()});fillDown();});
      pClass.addEventListener('input',function(){peopleSaveV25({year:pYear.value.trim(),class:pClass.value.trim()});fillDown();});
      modal.querySelectorAll('#totalParticipantsV16,#totalClassParticipantsV16,.year-participants-v16,.class-participants-v16').forEach(function(input){
        input.addEventListener('input',function(){input.dataset.userSetV25='1';delete input.dataset.autoV25;});
      });
      fillDown();
    }

    // B) ç»“æŸæ—¥æœŸï¼ˆæ—¶é—´æ®µï¼Œå¯é€‰ï¼›ä»…è€ƒè¯•è®°å½•é¡µå±•ç¤ºï¼Œè¶‹åŠ¿å›¾ä»ç”¨å¼€å§‹æ—¥æœŸï¼‰
    var dateField=modal.querySelector('#examDate')?.closest('.field');
    if(dateField&&!modal.querySelector('#examEndDateV25')){
      var endField=document.createElement('div');
      endField.className='field end-date-field-v25';
      endField.innerHTML='<label>ç»“æŸæ—¥æœŸï¼ˆå¯é€‰ï¼‰</label><input id="examEndDateV25" type="date" value="'+escapeHtml(exam&&exam.end_date?exam.end_date:'')+'">';
      dateField.insertAdjacentElement('afterend',endField);
      var startDate=modal.querySelector('#examDate'),endDate=endField.querySelector('#examEndDateV25');
      function syncEndDateAnchor(){
        var start=String(startDate&&startDate.value||'');
        endDate.min=start;
        if(endDate.dataset.autoV61==='1')endDate.value=start;
      }
      function primeEndDate(){
        if(!endDate.value&&startDate&&startDate.value){endDate.value=startDate.value;endDate.dataset.autoV61='1';}
      }
      endDate.addEventListener('pointerdown',primeEndDate);
      endDate.addEventListener('focus',primeEndDate);
      endDate.addEventListener('input',function(){delete endDate.dataset.autoV61;});
      endDate.addEventListener('change',function(){delete endDate.dataset.autoV61;});
      if(startDate)startDate.addEventListener('input',syncEndDateAnchor);
      syncEndDateAnchor();
    }

    // C1) å¼¹çª—æ–‡æ¡ˆç²¾ç®€
    declutterModalV25(modal);

    var list=modal.querySelector('#comboListV21');if(!list)return;
    var saved={};Object.entries(exam&&exam.moduleRanks?exam.moduleRanks:examRanksForV25(exam)).forEach(function(entry){saved[entry[0]]=entry[1]||{};});
    function decorateCard(card){
      if(card.querySelector('.combo-rank-v25'))return;
      var id=card.dataset.comboId;
      modal._comboRankCacheV25=modal._comboRankCacheV25||{};
      var s=(modal._comboRankCacheV25&&modal._comboRankCacheV25[id])||saved[id]||{};
      var block=document.createElement('div');
      block.className='combo-rank-v25';
      block.innerHTML=
        '<div><b>å¹´æ’ï¼ˆå¯é€‰ï¼‰</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-yr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="åæ¬¡" value="'+escapeHtml(s.yearRank??'')+'">'+
        '<input class="combo-yp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="å¹´çº§äººæ•°" value="'+escapeHtml(s.yearParticipants??'')+'">'+
        '</div></div>'+
        '<div><b>ç­æ’ï¼ˆå¯é€‰ï¼‰</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-cr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="åæ¬¡" value="'+escapeHtml(s.classRank??'')+'">'+
        '<input class="combo-cp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="ç­çº§äººæ•°" value="'+escapeHtml(s.classParticipants??'')+'">'+
        '</div></div>';
      card.appendChild(block);
      // è¾“å…¥å³ç¼“å­˜ï¼šç»„åˆå¡è¢«é‡å»ºï¼ˆå¢åˆ ç»„åˆï¼‰æ—¶å·²å¡«æ’åä¸ä¸¢å¤±ï¼›ç”¨æˆ·æ”¹è¿‡çš„äººæ•°ä¸å†è¢«è‡ªåŠ¨å¡«å……è¦†ç›–
      block.querySelectorAll('input').forEach(function(inp){
        inp.dataset.userSetV25=(String(inp.value||'').trim()!=='')?'1':'';
        inp.addEventListener('input',function(){
          inp.dataset.userSetV25='1';
          delete inp.dataset.autoV25;
          var c={};
          c.yearRank=(card.querySelector('.combo-yr-v25')?.value||'').trim();
          c.yearParticipants=(card.querySelector('.combo-yp-v25')?.value||'').trim();
          c.classRank=(card.querySelector('.combo-cr-v25')?.value||'').trim();
          c.classParticipants=(card.querySelector('.combo-cp-v25')?.value||'').trim();
          modal._comboRankCacheV25[id]=c;
        });
      });
    }
    function decorateAll(){list.querySelectorAll('.combo-card-v21').forEach(decorateCard);}
    decorateAll();
    try{
      var obs=new MutationObserver(function(){
        decorateAll();
        var ptY=modal.querySelector('.pt-year-v25'),ptC=modal.querySelector('.pt-class-v25');
        if(ptY)fillPeopleDownV25(modal,ptY.value.trim(),ptC?ptC.value.trim():'');
      });
      obs.observe(list,{childList:true,subtree:true});
      modal._comboRankObserverV25=obs;
    }catch(e){}
  };

  function validateComboRanksV25(ranks){
    function chkPair(rankValue,peopleValue,rLabel,pLabel){
      var r=num(rankValue),p=num(peopleValue);
      if(r!==null&&(!Number.isInteger(r)||r<1))return rLabel+'è¯·è¾“å…¥æ­£æ•´æ•°';
      if(p!==null&&(!Number.isInteger(p)||p<1))return pLabel+'è¯·è¾“å…¥æ­£æ•´æ•°';
      if(r!==null&&p!==null&&r>p)return rLabel+'ä¸èƒ½å¤§äº'+pLabel;
      return '';
    }
    for(var id in ranks){
      var r=ranks[id],e=chkPair(r.yearRank,r.yearParticipants,'ç»„åˆå¹´æ’åæ¬¡','å¹´çº§äººæ•°');if(e)return e;
      e=chkPair(r.classRank,r.classParticipants,'ç»„åˆç­æ’åæ¬¡','ç­çº§äººæ•°');if(e)return e;
    }
    return '';
  }

  if(typeof dataApiV7==='function'){
    var dataApiV25Before=dataApiV7;
    dataApiV7=async function dataApiV25(action,payload){
      if(action==='save_exam'&&payload&&payload.exam){
        var modal=state.modal&&state.modal.isConnected?state.modal:document.querySelector('.modal-backdrop');
        if(modal){
          var ranks={},has=false;
          modal.querySelectorAll('.combo-card-v21').forEach(function(card){
            var id=card.dataset.comboId;if(!id)return;
            has=true;
            ranks[id]={
              yearRank:(card.querySelector('.combo-yr-v25')?.value||'').trim(),
              yearParticipants:(card.querySelector('.combo-yp-v25')?.value||'').trim(),
              classRank:(card.querySelector('.combo-cr-v25')?.value||'').trim(),
              classParticipants:(card.querySelector('.combo-cp-v25')?.value||'').trim()
            };
          });
          if(has){
            var err=validateComboRanksV25(ranks);
            if(err)throw new Error(err);
            payload.exam.moduleRanks=ranks;
            rememberRanksV25(payload.exam.exam_date,payload.exam.name,ranks); // æœ¬åœ°å…œåº•
          }
          var endInput=modal.querySelector('#examEndDateV25');
          if(endInput)payload.exam.end_date=endInput.dataset.autoV61==='1'?'':String(endInput.value||'').trim();
        }
      }
      return dataApiV25Before(action,payload);
    };
  }

  // ---------- B) combo rank trend accessors ----------
  if(typeof rawRankValueV11==='function'){
    var rawRankValueBeforeV25=rawRankValueV11;
    rawRankValueV11=function rawRankValueV25(exam,subject){
      if(isComboSubjectV25(subject))return comboRankInfoV25(exam,subject,state.rankScopeV16||'year').rank;
      return rawRankValueBeforeV25(exam,subject);
    };
  }
  if(typeof rankInfoV7==='function'){
    var rankInfoBeforeV25=rankInfoV7;
    rankInfoV7=function rankInfoV25(exam,subject){
      if(isComboSubjectV25(subject))return comboRankInfoV25(exam,subject,state.rankScopeV16||'year');
      return rankInfoBeforeV25(exam,subject);
    };
  }

  if(typeof cleanSubjectAxisV21==='function'){
    var cleanSubjectAxisBeforeV25=cleanSubjectAxisV21;
    cleanSubjectAxisV21=function cleanSubjectAxisV25(){
      var combo=isComboSubjectV25(state.subject)?state.subject:null;
      cleanSubjectAxisBeforeV25();
      if(combo&&isComboSubjectV25(combo))state.subject=combo;
    };
  }

  // ---------- C) score/percent view chart ----------
  function percentTrendSingleV25(){
    var exams=state.exams||[];
    if(!exams.length)return '<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è®°å½•è€ƒè¯•åï¼Œè¿™é‡Œä¼šè‡ªåŠ¨å‡ºç°è¶‹åŠ¿çº¿</div></div>';
    var isTotal=state.subject==='æ€»åˆ†';
    var points=exams.map(function(e){return{
      exam:e,
      name:e.name,date:e.exam_date,
      actual:isTotal?totalRate(e,'actual'):scoreRate(e,state.subject,'actual'),
      target:isTotal?totalRate(e,'target'):scoreRate(e,state.subject,'target')
    };});
    var vals=[];
    points.forEach(function(p){if(p.actual!==null)vals.push(p.actual);if(p.target!==null)vals.push(p.target);});
    var extra=window.ScoreAverages?window.ScoreAverages.series():[];
    points.forEach(function(p){extra.forEach(function(s){var v=s.value(p.exam);if(v!==null)vals.push(v);});});
    if(!vals.length)return '<div class="empty-chart"><div><div class="empty-icon">âŒ</div>è¿™ä¸ªç§‘ç›®è¿˜æ²¡æœ‰æˆç»©æ•°æ®</div></div>';
    // åŠ¨æ€çºµè½´ï¼Œä¸ä¸»æˆç»©å›¾åŒç®—æ³•ï¼ˆv3 chartHtmlï¼‰
    var axis=fullTrendAxisV25(vals,'scoreFinal');
    var W=760,H=300,L=46,R=18,T=20,B=46;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return points.length===1?L+cw/2:L+(i/(points.length-1))*cw;};
    var y=function(v){return T+(axis.max-v)/(axis.max-axis.min)*ch;};
    var grid='';
    for(var i=0;i<=axis.ticks;i++){
      var v=axis.max-(axis.max-axis.min)*i/axis.ticks,yy=T+ch*i/axis.ticks;
      grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4"/><text x="'+(L-9)+'" y="'+(yy+4)+'" text-anchor="end" class="axis-label">'+Math.round(v)+'%</text>';
    }
    function line(key,color,dash,reader,label){
      var d='',started=false,circles='';
      points.forEach(function(p,i){
        var v=reader?reader(p.exam):p[key];if(v===null){started=false;return;}
        var xx=x(i),yy=y(v);
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+color+'" stroke-width="3" data-tip="'+escapeHtml(p.name)+' Â· '+(label||(key==='actual'?'çœŸå®':'ç›®æ ‡'))+' '+formatPercent(v)+'"/>';
      });
      return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'+circles;
    }
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-17)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" data-axis-min="'+axis.min+'" data-axis-max="'+axis.max+'" preserveAspectRatio="none">'+grid+line('actual','#5d72e8')+line('target','#32a77a','7 7')+extra.map(function(s){return line('',s.color,s.dash,s.value,s.label);}).join('')+labels+'</svg><div class="tooltip-card" id="chartTip"></div>';
  }

  var chartHtmlBeforeV25=(typeof chartHtml==='function')?chartHtml:null;
  chartHtml=function chartHtmlV25(){
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='æ€»è§ˆ'&&state.scoreBasis!=='raw'){
      return percentTrendSingleV25();
    }
    return chartHtmlBeforeV25?chartHtmlBeforeV25():'';
  };

  // ---------- D) home page: view row, two-row chips, toolbar buttons ----------
  var homeHtmlBeforeV25=homeHtml;
  homeHtml=function homeHtmlV25(){
    var html=homeHtmlBeforeV25();
    // 1) è‹±é›„åŒºé—®å€™è¯­ï¼šHiï¼Œç”¨æˆ·åï¼
    html=html.replace(/<span class="eyebrow">[^<]*<\/span>/,'<span class="eyebrow">Hiï¼Œ'+escapeHtml((state.user&&state.user.username)||'')+'ï¼</span>');
    // æŸ¥çœ‹ï¼šåˆ†æ•°/ç™¾åˆ†æ¯”ï¼Œä¸ã€Œè¶‹åŠ¿ç±»å‹ã€åŒçº§ï¼ˆæ’å…¥è¶‹åŠ¿ç±»å‹è¡Œå†…æœ«å°¾ï¼›ä»…æˆç»©+æœ€ç»ˆåˆ†æ¨¡å¼ï¼‰
    if(state.trendMetric==='score'&&state.subject!=='æ€»è§ˆ'&&state.scoreBasis!=='raw'){
      var viewBtns='<span class="label">æŸ¥çœ‹</span><button class="basis-btn-v13 '+(state.scoreViewV25==='score'?'active':'')+'" data-score-view-v25="score">åˆ†æ•°</button><button class="basis-btn-v13 '+(state.scoreViewV25==='percent'?'active':'')+'" data-score-view-v25="percent">ç™¾åˆ†æ¯”</button>';
      html=html.replace(/(<div class="trend-metric-toggle-v7[^"]*">)([\s\S]*?)(<\/div>)/,'$1$2'+viewBtns+'$3');
    }
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='æ€»è§ˆ'&&state.scoreBasis!=='raw'){
      html=html.replace('<p class="card-sub">çœŸå®æˆç»©ä¸ç›®æ ‡æˆç»©æ”¾åœ¨åŒä¸€å¼ å›¾é‡Œ</p>','<p class="card-sub">æŒ‰å¾—åˆ†ç‡ï¼ˆç™¾åˆ†æ¯”ï¼‰æŸ¥çœ‹çœŸå®ä¸ç›®æ ‡èµ°åŠ¿ï¼Œä¸åŒæ»¡åˆ†çš„é¡¹ç›®ä¹Ÿèƒ½ç›´æ¥æ¯”è¾ƒ</p>');
    }
    // 3) chips é‡æ’ï¼šç»„åˆè¡Œï¼ˆç»„åˆï¼šæ€»è§ˆ æ€»åˆ† ç»„åˆåˆ†ï¼‰+ ç§‘ç›®è¡Œï¼ˆç§‘ç›®ï¼šè¯­æ–‡ æ•°å­¦ â€¦ï¼‰
    var combos=(state.modulesV18||[]).filter(function(m){return m&&m.name&&(m.subjects||[]).length>0;});
    var chip=function(s){var active=state.subject===s;return '<button class="chip '+(active?'active':'')+'" data-subject="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>';};
    var comboRow=(combos.length?'<span class="label">ç»„åˆï¼š</span>':'')+chip('æ€»è§ˆ')+chip('æ€»åˆ†')+combos.map(function(c){return chip(c.name);}).join('');
    var subjectRow='<span class="label">ç§‘ç›®ï¼š</span>'+(SUBJECTS||[]).map(function(s){return chip(s);}).join('');
    html=html.replace(/<div class="chips">([\s\S]*?)<\/div>/,function(m,inner){
      return '<div class="combo-chips-v25">'+comboRow+'</div><div class="combo-chips-v25">'+subjectRow+'</div>';
    });
    // ä¾§æ ã€Œè¿™ä¸€å¹´çš„è®°å½•ã€ï¼šåªç•™æœ€æœ‰ä¿¡æ¯é‡çš„æŒ‡æ ‡ï¼ˆæ¬¡æ•°/æœ€é«˜åˆ†/å¹³å‡åˆ†/æœ€è¿‘ç›®æ ‡ï¼›åˆ ã€Œæ¬¡å·²å‡ºåˆ†ã€å’Œä¸ Hero é‡å¤çš„ã€Œæœ€è¿‘å˜åŒ–ã€ï¼‰
    var qs=quickStatsV25();
    var quickGrid='<div class="quick-grid">'
      +'<div class="mini-stat"><b>'+qs.count+'</b><span>æ¬¡è€ƒè¯•</span></div>'
      +'<div class="mini-stat"><b>'+(qs.avg===null?'â€”':formatPercent(qs.avg))+'</b><span>å¹³å‡å¾—åˆ†ç‡</span></div>'
      +'<div class="mini-stat"><b>'+(qs.targetExams?(qs.met+'/'+qs.targetExams):'â€”')+'</b><span>æ¬¡è¾¾æˆç›®æ ‡</span></div>'
      +'<div class="mini-stat"><b>'+(qs.gap===null?'â€”':(qs.gap<=0?'âœ“':formatScore(Math.abs(qs.gap))))+'</b><span>'+(qs.gap===null?'æœ€è¿‘ç›®æ ‡':(qs.gap<=0?'å·²è¾¾æˆç›®æ ‡':'åˆ† Â· è·ç›®æ ‡'))+'</span></div>'
      +'</div>';
    html=html.replace(/<div class="quick-grid">[\s\S]*?<\/div><\/div>/,quickGrid);
    // å®Œæ•´è¶‹åŠ¿ / ä¿å­˜å›¾ç‰‡
    html=html.replace(/<div class="chart-wrap[^"]*" id="chart">/,
      '<div class="trend-actions-v25"><button type="button" id="trendFullV25">â›¶ å®Œæ•´è¶‹åŠ¿</button><button type="button" id="trendSaveV25">â­³ ä¿å­˜å›¾ç‰‡</button></div><div class="chart-wrap" id="chart">');
    // C1) ç²¾ç®€æ–‡æ¡ˆ
    return stripVerboseV25(html);
  };

  // ---------- E) PNG export (string-based: no DOM serialization quirks, blob URL + data URL fallback) ----------
  function finalizeExportSvgV25(svgText){
    var text=String(svgText||'').replace(/class="axis-label"/g,'style="font-size:11px;fill:#98a1ae"');
    var m=text.match(/^<svg[^>]*>/);
    if(!m)return null;
    var head=m[0];
    if(head.indexOf('xmlns')===-1)head=head.replace(/^<svg/,'<svg xmlns="http://www.w3.org/2000/svg"');
    var vb=(head.match(/viewBox="([^"]+)"/)||['','0 0 760 300'])[1].trim().split(/\s+/).map(Number);
    var w=vb[2]||760,h=vb[3]||300;
    if(head.indexOf('width=')===-1)head=head.replace(/(<svg[^>]*?)\/?>$/,'$1 width="'+w+'" height="'+h+'">');
    head=head.replace(/>\s*$/,'><rect width="100%" height="100%" fill="#ffffff"/>');
    return head+text.slice(m[0].length);
  }
  function extractChartSvgV25(){
    var stage=document.getElementById('chart'),source=stage&&stage.querySelector('svg');
    if(!source)return null;
    var clone=source.cloneNode(true),sourceNodes=source.querySelectorAll('*'),cloneNodes=clone.querySelectorAll('*');
    for(var i=0;i<sourceNodes.length&&i<cloneNodes.length;i++){
      var src=sourceNodes[i],dst=cloneNodes[i],tag=String(src.tagName||'').toLowerCase(),cs=getComputedStyle(src);
      if(/^(path|polyline|circle|line)$/.test(tag)&&cs.stroke&&cs.stroke!=='none')dst.setAttribute('stroke',cs.stroke);
      if(/^(circle|text)$/.test(tag)&&cs.fill&&cs.fill!=='none')dst.setAttribute('fill',cs.fill);
      if(cs.display==='none')dst.setAttribute('display','none');
    }
    var box=(clone.getAttribute('viewBox')||'0 0 760 300').trim().split(/\s+/).map(Number),w=box[2]||760,h=box[3]||300;
    var card=stage.closest('.chart-card')||stage.parentElement;
    var legend=card&&card.querySelector('.trend-legend-row-v25 .legend,.trend-legend-row-v25 .overview-legend,.trend-legend-row-v25 .rank-legend-v7,.legend,.overview-legend,.rank-legend-v7');
    var items=legend?Array.prototype.filter.call(legend.children,function(n){return String(n.tagName||'').toLowerCase()==='span'&&!n.classList.contains('lg-hint-v31');}):[];
    if(items.length){
      var ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g'),x=22,y=h+28,rowHeight=25;
      group.setAttribute('aria-label','å›¾ä¾‹');
      items.forEach(function(item){
        var label=String(item.textContent||'').replace('âœ','').replace('ğŸ¨','').trim(),dot=item.querySelector('i'),color=dot?getComputedStyle(dot).backgroundColor:'#667085';
        var itemWidth=Math.max(82,34+Array.from(label).length*13);
        if(x+itemWidth>w-18){x=22;y+=rowHeight;}
        var mark=document.createElementNS(ns,'circle');mark.setAttribute('cx',String(x+5));mark.setAttribute('cy',String(y-4));mark.setAttribute('r','5');mark.setAttribute('fill',color);
        var text=document.createElementNS(ns,'text');text.setAttribute('x',String(x+17));text.setAttribute('y',String(y));text.setAttribute('fill','#4f596b');text.setAttribute('font-size','12');text.textContent=label;
        if(item.classList.contains('lg-hide-v29')){mark.setAttribute('opacity','.35');text.setAttribute('opacity','.45');}
        group.appendChild(mark);group.appendChild(text);x+=itemWidth;
      });
      clone.appendChild(group);
      clone.setAttribute('viewBox',[box[0]||0,box[1]||0,w,y-h+18+h].join(' '));
    }
    // Export the whole coordinate canvas, including the legend, without inheriting viewport sizing.
    var exportBox=clone.getAttribute('viewBox').trim().split(/\s+/).map(Number);
    clone.setAttribute('width',String(exportBox[2]));clone.setAttribute('height',String(exportBox[3]));
    clone.style.removeProperty('width');clone.style.removeProperty('height');clone.style.removeProperty('min-width');
    return new XMLSerializer().serializeToString(clone);
  }
  function downloadSvgAsPngV25(svgText,filename){
    try{
      var finalSvg=finalizeExportSvgV25(svgText);
      if(!finalSvg)return toast('å½“å‰å›¾è¡¨æ— æ³•å¯¼å‡º');
      var vb=(finalSvg.match(/viewBox="([^"]+)"/)||['','0 0 760 300'])[1].trim().split(/\s+/).map(Number);
      var w=vb[2]||760,h=vb[3]||300;
      var blob=new Blob([finalSvg],{type:'image/svg+xml;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var img=new Image();
      img.onload=function(){
        try{
          var scale=Math.min(2,2048/Math.max(w,h));
          var cw=Math.max(1,Math.round(w*scale)),chh=Math.max(1,Math.round(h*scale));
          var canvas=document.createElement('canvas');
          canvas.width=cw;canvas.height=chh;
          var ctx=canvas.getContext('2d');
          ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,chh);
          ctx.drawImage(img,0,0,cw,chh);
          function finish(href,isBlobUrl){
            var a=document.createElement('a');
            a.href=href;a.download=filename||('score-tracker-'+Date.now()+'.png');
            document.body.appendChild(a);a.click();a.remove();
            if(isBlobUrl)setTimeout(function(){URL.revokeObjectURL(href);},1500);
            toast('å›¾ç‰‡å·²ä¿å­˜');
          }
          if(typeof canvas.toBlob==='function'){
            canvas.toBlob(function(png){
              if(png){var u2=URL.createObjectURL(png);finish(u2,true);}
              else finish(canvas.toDataURL('image/png'),false);
            },'image/png');
          }else finish(canvas.toDataURL('image/png'),false);
        }catch(e2){toast('å¯¼å‡ºå¤±è´¥');}
        try{URL.revokeObjectURL(url);}catch(e3){}
      };
      img.onerror=function(){
        try{URL.revokeObjectURL(url);}catch(e4){}
        // å…œåº•ï¼šæ¢ data: URL å†è¯•ä¸€æ¬¡
        try{
          var img2=new Image();
          img2.onload=function(){
            var scale=Math.min(2,2048/Math.max(w,h));
            var cw=Math.max(1,Math.round(w*scale)),chh=Math.max(1,Math.round(h*scale));
            var canvas=document.createElement('canvas');
            canvas.width=cw;canvas.height=chh;
            var ctx=canvas.getContext('2d');
            ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,chh);
            ctx.drawImage(img2,0,0,cw,chh);
            var href=canvas.toDataURL('image/png');
            var a=document.createElement('a');
            a.href=href;a.download=filename||('score-tracker-'+Date.now()+'.png');
            document.body.appendChild(a);a.click();a.remove();
            toast('å›¾ç‰‡å·²ä¿å­˜');
          };
          img2.onerror=function(){toast('å›¾ç‰‡æ¸²æŸ“å¤±è´¥ï¼Œè¯·ç¨åå†è¯•');};
          img2.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(finalSvg);
        }catch(e5){toast('å›¾ç‰‡æ¸²æŸ“å¤±è´¥ï¼Œè¯·ç¨åå†è¯•');}
      };
      img.src=url;
    }catch(e){toast('å¯¼å‡ºå¤±è´¥');}
  }
  function trendFileNameV25(label){return 'æˆç»©è¶‹åŠ¿-'+label+'-'+new Date().toISOString().slice(0,10)+'.png';}

  // ---------- F) full-trend wide chart + modal ----------
  function fullTrendAxisV25(vals,kind){
    var nums=vals.filter(function(v){return v!==null&&v!==undefined&&!Number.isNaN(Number(v));}).map(Number);
    if(!nums.length)return{min:0,max:100,ticks:5};
    var min=Math.min.apply(null,nums),max=Math.max.apply(null,nums),pad;
    if(kind==='scoreFinal'){
      pad=Math.max(10,(max-min)*0.18);
      max=Math.ceil((max+pad)/10)*10;
      min=Math.max(0,Math.floor((min-pad)/10)*10);
      if(max===min)max=min+100;
      return{min:min,max:max,ticks:5};
    }
    if(kind==='scoreRaw'){
      pad=Math.max(5,(max-min)*0.18);
      min=Math.max(0,Math.floor((min-pad)/5)*5);
      max=Math.ceil((max+pad)/5)*5;
      if(max-min<20){var mid=(max+min)/2;min=Math.max(0,Math.floor((mid-10)/5)*5);max=Math.ceil((mid+10)/5)*5;}
      if(max===min)max=min+20;
      return{min:min,max:max,ticks:5};
    }
    if(kind==='rate'){
      return (typeof calcDynamicAxisRangeV6==='function')
        ?calcDynamicAxisRangeV6(nums,{minLimit:0,maxLimit:100,step:5,minSpan:20,padRatio:.16})
        :{min:0,max:100,ticks:5};
    }
    if(kind==='rankRaw'){
      return (typeof rawRankAxisV11==='function')?rawRankAxisV11(nums):{min:Math.min.apply(null,nums),max:Math.max.apply(null,nums),ticks:5};
    }
    return{min:0,max:100,ticks:5};
  }

  /* å¯¼å‡º/å®Œæ•´è¶‹åŠ¿å¤ç”¨é¦–é¡µå›¾ä¾‹çš„è‡ªå®šä¹‰é…è‰²ä¸æ˜¾éšï¼ˆv29/v31 å­˜äº localStorageï¼‰ */
  function customTrendColorV25(label,fallback){
    try{var c=JSON.parse(localStorage.getItem('st_line_colors_v29')||'{}');if(c&&typeof c==='object'&&c[label])return c[label];}catch(e){}
    return fallback;
  }
  function hiddenTrendLineV25(label){
    try{var h=JSON.parse(localStorage.getItem('st_legend_hidden_v31')||'{}');return !!(h&&typeof h==='object'&&h[label]===true);}catch(e){return false;}
  }
  function fullTrendSvgV25(){
    var exams=state.exams||[];
    var subject=state.subject||'æ€»åˆ†';
    var metric=state.trendMetric||'score';
    var basis=state.scoreBasis||'final';
    var scope=state.rankScopeV16||'year';
    var n=Math.max(1,exams.length);
    var W=Math.max(760,150+n*78),H=340,L=58,R=24,T=20,B=54;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return n===1?L+cw/2:L+(i/(n-1))*cw;};
    var colors=(typeof rankSeriesColorsV7==='function')?rankSeriesColorsV7():['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
    var isPercent=metric==='rank',isRawRank=metric==='rank_raw';
    var scorePercent=!isRawRank&&!isPercent&&basis!=='raw'&&subject!=='æ€»è§ˆ'&&state.scoreViewV25==='percent';
    var series;
    if(isRawRank||isPercent){
      var rankSubjects=subject==='æ€»è§ˆ'?['æ€»åˆ†'].concat(SUBJECTS):[subject];
      series=rankSubjects.map(function(s,i){
        return{label:s,color:customTrendColorV25(s,colors[i%colors.length]),value:function(e){return isRawRank?rawRankValueV11(e,s):rankInfoV7(e,s).performance;}};
      });
    }else if(basis==='raw'){
      if(subject==='æ€»è§ˆ'){
        series=['æ€»åˆ†'].concat(SUBJECTS).map(function(s,i){return{label:s,color:customTrendColorV25(s,colors[i%colors.length]),value:function(e){return rawScoreRateV13(e,s);}};});
      }else{
        var rawLabel=subject==='æ€»åˆ†'?'åŸå§‹æ€»åˆ†':subject;
        series=[{label:rawLabel,color:customTrendColorV25(rawLabel,'#d38429'),value:function(e){return subject==='æ€»åˆ†'?totalRawForV13(e):examRawScoreV13(e,subject);}}];
      }
    }else if(scorePercent){
      series=[
        {label:'çœŸå®',color:customTrendColorV25('çœŸå®','#5d72e8'),value:function(e){return subject==='æ€»åˆ†'?totalRate(e,'actual'):scoreRate(e,subject,'actual');}},
        {label:'ç›®æ ‡',color:customTrendColorV25('ç›®æ ‡','#32a77a'),dash:'7 7',value:function(e){return subject==='æ€»åˆ†'?totalRate(e,'target'):scoreRate(e,subject,'target');}}
      ];
    }else{
      if(subject==='æ€»è§ˆ'){
        series=['æ€»åˆ†'].concat(SUBJECTS).map(function(s,i){return{label:s,color:customTrendColorV25(s,colors[i%colors.length]),value:function(e){return scoreRate(e,s,'actual');}};});
      }else{
        series=[
          {label:'çœŸå®',color:customTrendColorV25('çœŸå®','#5d72e8'),dash:'',value:function(e){return subject==='æ€»åˆ†'?totalFor(e,'actual'):examScore(e,subject,'actual');}},
          {label:'ç›®æ ‡',color:customTrendColorV25('ç›®æ ‡','#32a77a'),dash:'7 7',value:function(e){return subject==='æ€»åˆ†'?totalFor(e,'target'):examScore(e,subject,'target');}}
        ];
      }
    }
    if(window.ScoreAverages)series=series.concat(window.ScoreAverages.series().map(function(s){return Object.assign({},s,{color:customTrendColorV25(s.label,s.color)});}));
    var visible=series.filter(function(s){return !hiddenTrendLineV25(s.label)&&exams.some(function(e){return s.value(e)!==null;});});
    if(!visible.length)return '<div class="empty-chart"><div><div class="empty-icon">âŒ</div>å½“å‰è¿˜æ²¡æœ‰å¯ç”¨äºå®Œæ•´è¶‹åŠ¿çš„æ•°æ®</div></div>';
    var points=exams.map(function(e){return{exam:e,values:visible.map(function(s){return s.value(e);})};});
    var flat=[];
    points.forEach(function(p){p.values.forEach(function(v){if(v!==null)flat.push(v);});});
    var axisKind = scorePercent?'scoreFinal':(subject==='æ€»è§ˆ'
      ? (isRawRank?'rankRaw':(isPercent?'rankPercent':'rate'))
      : (isRawRank?'rankRaw':(isPercent?'rankPercent':(basis==='raw'?'scoreRaw':'scoreFinal'))));
    var axis=fullTrendAxisV25(flat,axisKind);
    var isRate = axisKind==='rate';
    var grid='';
    for(var g=0;g<=axis.ticks;g++){
      var value=axis.max-(axis.max-axis.min)*g/axis.ticks;
      if(isRawRank)value=axis.min+(axis.max-axis.min)*g/axis.ticks;
      var yy=T+ch*g/axis.ticks;
      var lbl=isRawRank?('ç¬¬'+Math.max(1,Math.round(value))):(isPercent||isRate||scorePercent?Math.round(value)+'%':Math.round(value));
      grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end" class="axis-label">'+lbl+'</text>';
    }
    var lines=visible.map(function(item,sidx){
      var d='',started=false,circles='';
      for(var pi=0;pi<points.length;pi++){
        var v=points[pi].values[sidx];
        if(v===null){started=false;continue;}
        var xx=x(pi);
        var yy=isRawRank?T+(v-axis.min)/(axis.max-axis.min)*ch:T+(axis.max-v)/(axis.max-axis.min)*ch;
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        var tip;
        if(isRawRank)tip='ç¬¬'+v+'å';
        else if(isPercent)tip=scopeLabelV25()+'ç™¾åˆ†ä½ '+formatPercent(v);
        else tip=formatScore(v);
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+item.color+'" stroke-width="3" data-tip="'+escapeHtml(points[pi].exam.name)+' Â· '+escapeHtml(item.label)+' '+tip+'"/>';
      }
      return '<path d="'+d+'" fill="none" stroke="'+item.color+'" stroke-width="'+(sidx===0&&subject==='æ€»è§ˆ'?'3.2':'2.8')+'" stroke-linecap="round" stroke-linejoin="round"'+(item.dash?' stroke-dasharray="'+item.dash+'"':'')+'/>'+circles;
    }).join('');
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-18)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.exam.exam_date)+'</text>';}).join('');
    var legendRows=0,legend='';
    if(visible.length){
      var perRow=Math.max(2,Math.min(5,Math.floor((W-48)/150)));
      legendRows=Math.ceil(visible.length/perRow);
      var colW=(W-48)/perRow;
      legend=visible.map(function(s,i){
        var row=Math.floor(i/perRow),col=i%perRow,lx=24+col*colW,ly=H+16+row*20;
        return '<circle cx="'+(lx+5)+'" cy="'+(ly-4)+'" r="5" fill="'+s.color+'"/>'
          +'<text x="'+(lx+17)+'" y="'+ly+'" style="font-size:12px;fill:#4f596b">'+escapeHtml(s.label)+'</text>';
      }).join('');
    }
    var totalH=H+(legendRows?legendRows*20+14:0);
    return '<svg viewBox="0 0 '+W+' '+totalH+'" preserveAspectRatio="none">'+grid+lines+labels+legend+'</svg>';
  }

  function openFullTrendV25(){
    var exams=state.exams||[];
    if(!exams.length)return toast('è¿˜æ²¡æœ‰è€ƒè¯•è®°å½•');
    var subject=state.subject||'æ€»åˆ†';
    var svgText=fullTrendSvgV25();
    var modal=document.createElement('div');
    modal.className='modal-backdrop full-trend-modal-v25';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>å®Œæ•´è¶‹åŠ¿ Â· '+escapeHtml(subject)+'</h3><button class="close-btn" type="button">Ã—</button></div><div class="modal-body"><div class="full-trend-stage-v25" id="ftStageV25">'+svgText+'</div><div class="full-trend-scroll-hint-v25">å…¨éƒ¨è€ƒè¯•éƒ½ä¼šæ˜¾ç¤ºåœ¨è¿™é‡Œï¼›å›¾è¡¨è¾ƒé•¿æ—¶å·¦å³æ»‘åŠ¨æŸ¥çœ‹ã€‚ä¿å­˜åˆ°æ‰‹æœºçš„å›¾ç‰‡ä¸ºå®Œæ•´å®½åº¦ã€‚</div><div class="full-trend-actions-v25"><button class="secondary" id="ftCloseV25" type="button">å…³é—­</button><button class="primary" id="ftSaveV25" type="button">â­³ ä¿å­˜å›¾ç‰‡</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('#ftCloseV25').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelector('#ftSaveV25').onclick=function(){
      var m=String(svgText||'').match(/<svg[\s\S]*?<\/svg>/);
      if(!m)return toast('å›¾å½¢è¿˜æ²¡å‡†å¤‡å¥½');
      downloadSvgAsPngV25(m[0],trendFileNameV25(subject));
    };
  }

  // ---------- F2) é›·è¾¾å›¾è€ƒè¯•é€‰æ‹©å™¨ï¼šé€‰æ‹©å…¥å£ç‹¬ç«‹äºå½“å‰æŒ‡æ ‡ï¼Œåˆ‡æ¢æŒ‡æ ‡ä¿ç•™æ‰€é€‰ ----------
  function radarPickerExamsV25(){return(state.exams||[]).filter(function(exam){return !exam.is_hidden;});}
  var ensureRadarBeforeV25=(typeof ensureRadarSelection==='function')?ensureRadarSelection:null;
  if(ensureRadarBeforeV25){
    ensureRadarSelection=function ensureRadarSelectionV25(){
      var ids=state.radarSelection||[];
      var availableIds=new Set(radarPickerExamsV25().map(function(e){return e.id;}));
      state.radarSelection=ids.filter(function(id){return availableIds.has(id);}).slice(0,4);
    };
  }
  var radarCardHtmlBeforeV25=(typeof radarCardHtml==='function')?radarCardHtml:null;
  if(radarCardHtmlBeforeV25){
    radarCardHtml=function radarCardHtmlV25(){
      var html=radarCardHtmlBeforeV25();
      var available=radarPickerExamsV25();
      var selected=state.radarSelection||[];
      var picker='<div class="radar-selection-v25"><div class="radar-pick-v25"><button class="secondary" id="radarPickV25" type="button"'+(!available.length?' disabled':'')+'>'+(selected.length?'è°ƒæ•´è€ƒè¯•ï¼ˆå·²é€‰ '+selected.length+'/4ï¼‰':'é€‰æ‹©è€ƒè¯•ï¼ˆæœ€å¤š 4 æ¬¡ï¼‰')+'</button></div>';
      if(selected.length){
        picker+='<div class="radar-picked-v25">'+selected.map(function(id){
          var e=(state.exams||[]).find(function(x){return x.id===id;});
          return e?'<button type="button" class="radar-pick-chip-v25" data-radar-unpick="'+escapeHtml(id)+'" aria-label="ç§»é™¤'+escapeHtml(e.name)+'">'+escapeHtml(e.name)+' Â· '+fmtDate(e.exam_date)+' âœ•</button>':'';
        }).join('')+'</div>';
      }
      if(!available.length)picker+='<span class="radar-ó=ß¦òµë(š+myÕcbr’ÂwF÷FÂrÂv6Æ72r“°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræW†Ò×7V&¦V7BÖ6&B×cr’æf÷$V6‚†gVæ7F–öâ†6&B’°¢f"æÖRÒ6&BçVW'•6VÆV7F÷"‚ræW†Ò×7V&¦V7BÖæÖR×cr“²–b‚æÖRÇÂæÖRçfÇVRçG&–Ò‚’’&WGW&ã°¢FB†6&BçVW'•6VÆV7F÷"‚rç–V"×'F–6—çG2×cbr’Âw3¢r²æÖRçfÇVRçG&–Ò‚’Âw–V"r“°¢FB†6&BçVW'•6VÆV7F÷"‚ræ6Æ72×'F–6—çG2×cbr’Âw3¢r²æÖRçfÇVRçG&–Ò‚’Âv6Æ72r“°¢Ò“°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræ6öÖ&òÖ6&B×c#r’æf÷$V6‚†gVæ7F–öâ†6&B’°¢FB†6&BçVW'•6VÆV7F÷"‚ræ6öÖ&ò×—×c#Rr’ÂvÓ¢r²6&BæFF6WBæ6öÖ&ô–BÂw–V"r“°¢FB†6&BçVW'•6VÆV7F÷"‚ræ6öÖ&òÖ7×c#Rr’ÂvÓ¢r²6&BæFF6WBæ6öÖ&ô–BÂv6Æ72r“°¢Ò“°¢&WGW&â÷WC°¢Ğ¢f"”&Vf÷&RÒFF•cs°¢FF•crÒ7–æ2gVæ7F–öâ†7F–öâÂ–ÆöB’°¢f"Fö¶VâÒ7FFRçFö¶Vã°¢–b†7F–öâÓÓÒw6fUöW†Òrbb–ÆöBbb–ÆöBæW†Òbb–ÆöBæW†Òæ–Bbb7FFRæÖöFÂbb7FFRæÖöFÂå÷'F–6—çDG&gB’°¢–ÆöBÒö&¦V7Bæ76–vâ‡·ÒÂ–ÆöBÂ·'F–6—çDFVfVÇG3§7FFRæÖöFÂå÷'F–6—çDG&gGÒ“°¢Ğ¢f"FFÒv—B”&Vf÷&Ræ6ÆÂ‡F†—2Â7F–öâÂ–ÆöB“°¢&V6V—fR†FFÂFö¶Vâ“°¢–b‡Fö¶VâÓÓÒ7FFRçFö¶VâbbFFbbFFç'F–6—çDFVfVÇG5v&æ–ær’6WEF–ÖV÷WB†gVæ7F–öâ‚’²Fö7B†FFç'F–6—çDFVfVÇG5v&æ–ær“²ÒÂ“°¢&WGW&âFF°¢Ó°¢f"÷Vä&Vf÷&RÒ÷VäW†Ó°¢÷VäW†ÒÒgVæ7F–öâ†W†Ò’°¢f"&W7VÇBÒ÷Vä&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2’ÂÖöFÂÒ7FFRæÖöFÃ°¢òò6fVBW†×2æB&W7F÷&VBG&gG2&WF–âF†V—"÷vâfÇVW2Â–æ6ÇVF–ær–çFVçF–öæÂ&Ææ·2à¢–b‚ÖöFÂÇÂW†ÒÇÂÖöFÂæFF6WBç'F–6—çDFVfVÇG2’&WGW&â&W7VÇC°¢ÖöFÂæFF6WBç'F–6—çDFVfVÇG2Òss²ÖöFÂå÷'F–6—çDG&gBÒ·Ó°¢f"F÷V6†VBÒæWrvVµ6WB‚’Â–æ—F–Ä÷væW"Ò66÷VçB‚“°¢µ²rçB×–V"×c#RrÂw–V"uÒÅ²rçBÖ6Æ72×c#RrÂv6Æ72uÕÒæf÷$V6‚†gVæ7F–öâ‡—"’°¢f"–çWBÒÖöFÂçVW'•6VÆV7F÷"‡—%³Ò’ÂâÒfÇVR‚wF÷FÂrÂ—%³Ò“°¢–b†–çWBbbâ’–çWBçfÇVRÒ7G&–ær†â“°¢Ò“°¢gVæ7F–öâf–ÆÂ‚’°¢–b‚ÖöFÂæ—46öææV7FVBÇÂ–æ—F–Ä÷væW"ÓÒ66÷VçB‚’’&WGW&ã°¢f–VÆG2†ÖöFÂ’æf÷$V6‚†gVæ7F–öâ†f–VÆB’°¢f"–çWBÒf–VÆBæ–çWC°¢–b‡F÷V6†VBæ†2†–çWB’’&WGW&ã°¢f"âÒfÇVR†f–VÆBæ¶W’Âf–VÆBç66÷R“°¢–b†â’°¢–b‚–çWBçfÇVRÇÂ–çWBæFF6WBæWFõc#RÓÓÒsr’°¢–çWBçfÇVRÒ7G&–ær†â“²–çWBæFF6WBçW6W%6WEc#RÒss²FVÆWFR–çWBæFF6WBæWFõc#S°¢Ğ¢ÒVÇ6R–b‚–çWBçfÇVRÇÂ–çWBæFF6WBæWFõc#RÓÓÒsr’°¢f"F÷FÂÒÖöFÂçVW'•6VÆV7F÷"†f–VÆBç66÷RÓÓÒw–V"ròrçB×–V"×c#Rr¢rçBÖ6Æ72×c#Rr“°¢–b‡F÷FÂbbçVÖ&W"‡F÷FÂçfÇVR’’²–çWBçfÇVRÒF÷FÂçfÇVS²–çWBæFF6WBæWFõc#RÒss²Ğ¢Ğ¢Ò“°¢Ğ¢ÖöFÂæFDWfVçDÆ—7FVæW"‚v–çWBrÂgVæ7F–öâ†WfVçB’°¢f"–çWBÒWfVçBçF&vWC°¢f"f–VÆBÒf–VÆG2†ÖöFÂ’æf–æB†gVæ7F–öâ†b’²&WGW&âbæ–çWBÓÓÒ–çWC²Ò“°¢–b‚f–VÆBbb–çWBæÖF6†W2‚rçB×–V"×c#RÂçBÖ6Æ72×c#Rr’’f–VÆBÒ¶¶W“¢wF÷FÂrÇ66÷S¦–çWBæÖF6†W2‚rçB×–V"×c#Rr“òw–V"s¢v6Æ72wÓ°¢–b†f–VÆB’°¢F÷V6†VBæFB†–çWB“°¢f"âÒçVÖ&W"†–çWBçfÇVR“°¢–b†â’²f"&÷rÒÖöFÂå÷'F–6—çDG&gE¶f–VÆBæ¶W•ÒÇÂ·Ó²&÷u¶f–VÆBç66÷UÒÒã²ÖöFÂå÷'F–6—çDG&gE¶f–VÆBæ¶W•ÒÒ&÷s²Ğ¢VÇ6R–b†ÖöFÂå÷'F–6—çDG&gE¶f–VÆBæ¶W•Ò’FVÆWFRÖöFÂå÷'F–6—çDG&gE¶f–VÆBæ¶W•Õ¶f–VÆBç66÷UÓ°¢Ğ¢–b†–çWBæÖF6†W2‚ræW†Ò×7V&¦V7BÖæÖR×cr’’f–ÆÂ‚“°¢Ò“°¢f"ö'6W'fW"ÒæWr×WFF–öäö'6W'fW"†f–ÆÂ“²ö'6W'fW"æö'6W'fR†ÖöFÂÂ¶6†–ÆDÆ—7C§G'VRÇ7V'G&VS§G'VWÒ“°¢f"FWF6‚ÒæWr×WFF–öäö'6W'fW"†gVæ7F–öâ‚’²–b‚ÖöFÂæ—46öææV7FVB’²ö'6W'fW"æF—66öææV7B‚“²FWF6‚æF—66öææV7B‚“²ÒÒ“°¢FWF6‚æö'6W'fR†ÖöFÂç&VçDæöFRÂ¶6†–ÆDÆ—7C§G'VWÒ“²f–ÆÂ‚“°¢&WGW&â&W7VÇC°¢Ó°¢gVæ7F–öâ6WGF–æw2‚’°¢–b‡7FFRçvRÓÒv66÷VçBr’&WGW&ã°¢f"†÷7BÒFö7VÖVçBçVW'•6VÆV7F÷"‚rç7V&¦V7B×6WGF–æw2×crr“²–b‚†÷7BÇÂ†÷7BçVW'•6VÆV7F÷"‚rç'F–6—çB×6WGF–æw2r’’&WGW&ã°¢f"—FV×2Ò·¶¶W“¢wF÷FÂrÆæÖS¢~i[NYË®ˆ>ŠùRwÕÓ°¢‡7FFRç7V&¦V7D6öæf–w2ÇÂµÒ’æf÷$V6‚†gVæ7F–öâ‡2’²—FV×2çW6‚‡¶¶W“¢w3¢r·2ææÖRÆæÖS§2ææÖWÒ“²Ò“°¢‡7FFRæÖöGVÆW5c‚ÇÂµÒ’æf÷$V6‚†gVæ7F–öâ†Ò’²—FV×2çW6‚‡¶¶W“¢vÓ¢r¶Òæ–BÆæÖS¦ÒææÖWÒ“²Ò“°¢f"&÷‚ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“²&÷‚æ6Æ74æÖRÒw'F–6—çB×6WGF–æw2s°¢&÷‚æ–ææW$…DÔÂÒsÇ7VÖÖ'“î›¹ŠêNXø.ˆ>K«®i[Â÷7VÖÖ'“ãÇ6Æ73Ò&6&B×7V"#îikˆ>Šù^ˆz®Xª[ŠnXZ^ûÉ¾iÊÎYË®K‹Ni{nKúîiKKˆŞ[ÛY8Ş›¹ŠêNXÎ8.zyyºîY(Î{¸NYyYz›®i{nk+şyJi[NYË®K«®i[8#Â÷âr°¢sÆF—b6Æ73Ò''F–6—çBÖ†VB#ãÇ7ãîzyyºâò{¸NYƒÂ÷7ããÇ7ãî[›N{ª~K«®i[Â÷7ããÇ7ãîxúŞ{ª~K«®i[Â÷7ããÂöF—câr²—FV×2æÖ†gVæ7F–öâ†—FVÒ’°¢f"&÷rÒFVfVÇG2‚•¶—FVÒæ¶W•ÒÇÂ·Ó°¢&WGW&âsÆF—b6Æ73Ò''F–6—çB×&÷r"FF×'F–6—çBÖ¶W“Ò"r¶W62†—FVÒæ¶W’’²r#ãÇ7ãâr¶W62†—FVÒææÖR’²sÂ÷7ãâr²²w–V"rÂv6Æ72uÒæÖ†gVæ7F–öâ‡66÷R’°¢&WGW&âsÆ–çWBG—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#"7FWÒ#"–çWFÖöFSÒ&çVÖW&–2"FF×'F–6—çB×66÷SÒ"r·66÷R²r"&–ÖÆ&VÃÒ"r¶W62†—FVÒææÖR’²‡66÷SÓÓÒw–V"sò~[›N{ª~K«®i[s¢~xúŞ{ª~K«®i[r’²r"Æ6V†öÆFW#Ò"r²†—FVÒæ¶W“ÓÓÒwF÷FÂsò~˜Z²s¢~k+şyJh¾K«®i[r’²r"fÇVSÒ"r¶W62‡&÷u·66÷UÒ’²r#âs°¢Ò’æ¦ö–â‚rr’²sÂöF—câs°¢Ò’æ¦ö–â‚rr’²sÆF—b6Æ73Ò''F–6—çBÖ7F–öç2#ãÇ7â&öÆSÒ'7FGW2#ãÂ÷7ããÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'6V6öæF'’#îKùŞZÙK«®i[Âö'WGFöããÂöF—câs°¢†÷7BæVæD6†–ÆB†&÷‚“°¢f"–æ—F–Ä÷væW"Ò66÷VçB‚’Â6æ6†÷BÒ¥4ôâç'6R„¥4ôâç7G&–æv–g’†FVfVÇG2‚’’“°¢&÷‚çVW'•6VÆV7F÷"‚v'WGFöâr’æöæ6Æ–6²Ò7–æ2gVæ7F–öâ‚’°¢–b†–æ—F–Ä÷væW"ÓÒ66÷VçB‚’’&WGW&ã°¢f"F6‚Ò·ÒÂ–çfÆ–BÒfÇ6RÂ'WGFöâÒF†—2Â7FGW2Ò&÷‚çVW'•6VÆV7F÷"‚u·&öÆSÒ'7FGW2%Òr“°¢&÷‚çVW'•6VÆV7F÷$ÆÂ‚u¶FF×'F–6—çBÖ¶W•Òr’æf÷$V6‚†gVæ7F–öâ‡&÷r’°¢f"¶W’Ò&÷ræFF6WBç'F–6—çD¶W“°¢&÷rçVW'•6VÆV7F÷$ÆÂ‚v–çWBr’æf÷$V6‚†gVæ7F–öâ†–çWB’°¢f"&rÒ–çWBçfÇVRçG&–Ò‚’ÂâÒçVÖ&W"‡&r’Â66÷RÒ–çWBæFF6WBç'F–6—çE66÷S°¢–b‡&rbbâÓÓÒçVÆÂ’²–çfÆ–BÒG'VS²–çWBç6WDGG&–'WFR‚v&–Ö–çfÆ–BrÂwG'VRr“²Ğ¢VÇ6R–çWBç&VÖ÷fTGG&–'WFR‚v&–Ö–çfÆ–Br“°¢f"öÆBÒ6æ6†÷E¶¶W•Òbb6æ6†÷E¶¶W•Õ·66÷UÓ°¢–b†âÓÒ†öÆBÓÒçVÆÂòçVÆÂ¢öÆB’’²F6…¶¶W•ÒÒF6…¶¶W•ÒÇÂ·Ó²F6…¶¶W•Õ·66÷UÒÒã²Ğ¢Ò“°¢Ò“°¢–b†–çfÆ–B’²7FGW2çFW‡D6öçFVçBÒ~K«®i[Šû~‹é>XZ^jÚ>i[Ni[ûÈÎh‰nyYz›¢s²&WGW&ã²Ğ¢–b‚ö&¦V7Bæ¶W—2‡F6‚’æÆVæwF‚’²7FGW2çFW‡D6öçFVçBÒ~[{.KùŞZÙ‚s²&WGW&ã²Ğ¢'WGFöâæF—6&ÆVBÒG'VS²7FGW2çFW‡D6öçFVçBÒ~KùŞZÙKŠŞ(
bs°¢G'’°¢v—BFF•cr‚w6fU÷'F–6—çEöFVfVÇG2rÂ¶FVfVÇG3§F6‡Ò“°¢–b†–æ—F–Ä÷væW"ÓÓÒ66÷VçB‚’bb&÷‚æ—46öææV7FVB’²6æ6†÷BÒ¥4ôâç'6R„¥4ôâç7G&–æv–g’†FVfVÇG2‚’’“²7FGW2çFW‡D6öçFVçBÒ~[{.KùŞZÙ‚s²Ğ¢Ò6F6‚†R’²–b†–æ—F–Ä÷væW"ÓÓÒ66÷VçB‚’bb&÷‚æ—46öææV7FVB’7FGW2çFW‡D6öçFVçBÒRæÖW76vRÇÂ~KùŞZÙZK‹J^ûÈÎŠû~˜xŞŠùRs²Ğ¢f–æÆÇ’²'WGFöâæF—6&ÆVBÒfÇ6S²Ğ¢Ó°¢Ğ¢f"&–æD&Vf÷&RÒ&–æEvS°¢&–æEvRÒgVæ7F–öâ‚’²f"&W7VÇBÒ&–æD&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2“²6WGF–æw2‚“²&WGW&â&W7VÇC²Ó°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“°¢7G–ÆRçFW‡D6öçFVçBÒrç'F–6—çB×6WGF–æw7¶Ö&v–â×F÷£Gƒ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ær×F÷£'‡Òç'F–6—çB×6WGF–æw27VÖÖ'—¶7W'6÷#§ö–çFW#¶föçB×6—¦S£7ƒ¶föçB×vV–v‡C£sÒç'F–6—çB×6WGF–æw2æ6&B×7V'¶Ö&v–ã£‚Òç'F–6—çBÖ†VBÂç'F–6—çB×&÷w¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃãVg"’Ö–æÖ‚ƒÃg"’Ö–æÖ‚ƒÃg"“¶v£‡ƒ¶Æ–vâÖ—FV×3¦6VçFW'Òç'F–6—çBÖ†VG¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“·FF–æs£‡‚Òç'F–6—çB×&÷w·FF–æs£w‚¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶föçB×6—¦S£'‡Òç'F–6—çB×&÷sç7ç¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç'F–6—çB×&÷r–çWG·v–GFƒ£S¶Ö–â×v–GFƒ£¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ·FF–æs£—‚wƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—GÒç'F–6—çB×&÷r–çWE¶&–Ö–çfÆ–C×G'VU×¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖFævW"Â6CCB—Òç'F–6—çBÖ7F–öç7¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£ƒ¶Ö&v–â×F÷£'‡Òç'F–6—çBÖ7F–öç27ç¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒW†ÒÖfW&vW2æ§2ÓÓÓÓÒ¢ğ¢ò¢W†Ò×7V6–f–2f–æÂ×66÷&R&VfW&Væ6W3²&WW6RF†RW†—7F–ær6†'BÆVvVæBâ¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢gVæ7F–öâçVÖ&W"‡b’²&WGW&âbÓÓÒrrÇÂbÓÒçVÆÂÇÂçVÖ&W"æ—4f–æ—FR„çVÖ&W"‡b’’òçVÆÂ¢çVÖ&W"‡b“²Ğ¢gVæ7F–öâÖöGVÆTf÷"‡7V&¦V7B’²&WGW&â‡7FFRæÖöGVÆW5c‚ÇÂµÒ’æf–æB†gVæ7F–öâ†Ò’²&WGW&âÒææÖRÓÓÒ7V&¦V7C²Ò“²Ğ¢gVæ7F–öâ¶W”f÷"‡7V&¦V7B’²f"ÒÒÖöGVÆTf÷"‡7V&¦V7B“²&WGW&â7V&¦V7BÓÓÒ~h¾XˆbròwF÷FÂr¢ÒòvÓ¢r²Òæ–B¢w3¢r²7V&¦V7C²Ğ¢gVæ7F–öâæÖW4f÷"†W†ÒÂ7V&¦V7B’°¢–b‡7V&¦V7BÓÓÒ~h¾Xˆbr’&WGW&âö&¦V7Bæ¶W—2†W†Òç66÷&W2ÇÂ·Ò’æf–ÇFW"†gVæ7F–öâ‡2’²&WGW&âW†Òç66÷&W5·5ÒæW†6ÇVFTg&öÕF÷FÂbbÖöGVÆTf÷"‡2“²Ò’ç6÷'B‚“°¢f"ÒÒÖöGVÆTf÷"‡7V&¦V7B“²&WGW&âÒòÒç7V&¦V7G2ç6Æ–6R‚’ç6÷'B‚’¢·7V&¦V7EÓ°¢Ğ¢gVæ7F–öâ&6—2†W†ÒÂ7V&¦V7B’²&WGW&â¥4ôâç7G&–æv–g’†æÖW4f÷"†W†ÒÂ7V&¦V7B’æÖ†gVæ7F–öâ‡2’²&WGW&â·2ÂçVÖ&W"†W†Òç66÷&W2bbW†Òç66÷&W5·5ÒbbW†Òç66÷&W5·5ÒæÖ‚’ÇÂÓ²Ò’“²Ğ¢gVæ7F–öâf–æÅ66÷&R†W†ÒÂ7V&¦V7B’°¢–b‡7V&¦V7BÓÓÒ~h¾XˆbrbbçVÖ&W"†W†ÒçF÷FÅö7GVÅ÷66÷&R’ÓÒçVÆÂ’&WGW&âçVÖ&W"†W†ÒçF÷FÅö7GVÅ÷66÷&R“°¢f"æÖW2ÒæÖW4f÷"†W†ÒÂ7V&¦V7B’Â7VÒÒ°¢–b‚æÖW2æÆVæwF‚’&WGW&âçVÆÃ°¢f÷"‡f"2öbæÖW2’°¢f""Ò†W†Òç66÷&W2ÇÂ·Ò•·5Ó²–b‚"’&WGW&âçVÆÃ°¢f"bÒçVÖ&W"‡"æ7GVÂ“°¢–b‡bÓÓÒçVÆÂbbçVÖ&W"‡"ç&tÖ‚ÓÒçVÆÂò"æÖ‚¢"ç&tÖ‚’ÓÓÒçVÖ&W"‡"æÖ‚’’bÒçVÖ&W"‡"ç&r“°¢–b‡bÓÓÒçVÆÂ’&WGW&âçVÆÃ°¢7VÒ³Òc°¢Ğ¢&WGW&âÖF‚ç&÷VæB‡7VÒ¢’ò°¢Ğ¢gVæ7F–öâfÇVR†W†ÒÂ7V&¦V7BÂ66÷RÂW&6VçB’°¢f""ÒW†ÒæfW&vW2bbW†ÒæfW&vW5¶¶W”f÷"‡7V&¦V7B•Ó°¢–b‚"ÇÂ"æ&6—2ÓÒ&6—2†W†ÒÂ7V&¦V7B’’&WGW&âçVÆÃ°¢f"6†÷vâÒ7V&¦V7BÓÓÒ~h¾XˆbròF÷FÄf÷"†W†ÒÂv7GVÂr’¢W†Õ66÷&R†W†ÒÇ7V&¦V7BÂv7GVÂr“°¢f"6ö×ÆWFRÒf–æÅ66÷&R†W†ÒÇ7V&¦V7B“°¢–b‡6†÷vâÓÒçVÆÂbb†6ö×ÆWFRÓÓÒçVÆÂÇÂÖF‚æ'2‡6†÷vâÒ6ö×ÆWFR’âã’’&WGW&âçVÆÃ°¢f"bÒçVÖ&W"‡%·66÷UÒ“²–b‡bÓÓÒçVÆÂ’&WGW&âçVÆÃ°¢–b‚W&6VçB’&WGW&âc°¢òòvV–v‡FVBÖçVÂF÷FÂ†2æò¶æ÷vâFVæöÖ–æF÷"à¢–b‡7V&¦V7BÓÓÒ~h¾XˆbrbbçVÖ&W"†W†ÒçF÷FÅö7GVÅ÷66÷&R’ÓÒçVÆÂ’&WGW&âçVÆÃ°¢f"Ö‚Ò°¢f÷"‡f"2öbæÖW4f÷"†W†ÒÂ7V&¦V7B’’²f"&÷rÒ†W†Òç66÷&W2ÇÂ·Ò•·5Ó²–b‚&÷rÇÂ†çVÖ&W"‡&÷ræÖ‚’â’’&WGW&âçVÆÃ²Ö‚³ÒçVÖ&W"‡&÷ræÖ‚“²Ğ¢&WGW&âÖ‚âòbòÖ‚¢¢çVÆÃ°¢Ğ¢gVæ7F–öâ6W&–W2‚’°¢–b‡7FFRçG&VæDÖWG&–2ÓÒw66÷&RrÇÂ7FFRç66÷&T&6—2ÓÓÒw&rrÇÂ7FFRç7V&¦V7BÓÓÒ~h¾Šx‚r’&WGW&âµÓ°¢f"7V&¦V7BÒ7FFRç7V&¦V7BÂW&6VçBÒ7FFRç66÷&Uf–Wuc#RÓÓÒwW&6VçBs°¢&WGW&â·¶Æ&VÃ¢~xúŞ{ª~YØ~XˆbrÇ66÷S¢v6Æ72rÆ6öÆ÷#¢r6C3ƒC#’wÒÇ¶Æ&VÃ¢~[›N{ª~YØ~XˆbrÇ66÷S¢w–V"rÆ6öÆ÷#¢r3†cc&F"wÕÒæÖ†gVæ7F–öâ‡2’°¢&WGW&â¶Æ&VÃ§2æÆ&VÂÆ6öÆ÷#§2æ6öÆ÷"ÆF6ƒ¢s2RrÇfÇVS¦gVæ7F–öâ†R’²&WGW&âfÇVR†RÇ7V&¦V7BÇ2ç66÷RÇW&6VçB“²×Ó°¢Ò’æf–ÇFW"†gVæ7F–öâ‡2’²&WGW&â‡7FFRæW†×2ÇÂµÒ’ç6öÖR†gVæ7F–öâ†R’²&WGW&â2çfÇVR†R’ÓÒçVÆÃ²Ò“²Ò“°¢Ğ¢gVæ7F–öâf÷&ÖB‡b’²&WGW&â7G&–ær„ÖF‚ç&÷VæB‡b¢’ò“²Ğ¢gVæ7F–öâ6ö×&—6öâ†W†ÒÂ7V&¦V7BÂ7GVÂ’°¢f"6ö×ÆWFRÒf–æÅ66÷&R†W†ÒÇ7V&¦V7B“°¢–b†7GVÂÓÒçVÆÂÇÂ6ö×ÆWFRÓÓÒçVÆÂÇÂÖF‚æ'2†6ö×ÆWFRÒ7GVÂ’âã’&WGW&ârs°¢f"'G2ÒµÓ°¢µ²v6Æ72rÂ~xúŞ{ª~YØ~XˆbuÒÅ²w–V"rÂ~[›N{ª~YØ~XˆbuÕÒæf÷$V6‚†gVæ7F–öâ‡—"’°¢f"frÒfÇVR†W†ÒÇ7V&¦V7BÇ—%³ÒÆfÇ6R“²–b†frÓÓÒçVÆÂ’&WGW&ã°¢f"BÒÖF‚ç&÷VæB‚†7GVÂÒfr’¢’ò°¢'G2çW6‚†BÓÓÒò~hÈ[›2r²—%³Ò¢†Bâò~š¹K¨âr¢~KØîK¨âr’²—%³Ò²rr²f÷&ÖB„ÖF‚æ'2†B’’²rXˆbr“°¢Ò“°¢&WGW&â'G2æ¦ö–â‚r+rr“°¢Ğ¢v–æF÷rå66÷&TfW&vW2Ò¶¶W“¦¶W”f÷"Æ&6—3¦&6—2ÇfÇVS§fÇVRÇ6W&–W3§6W&–W2Æ6ö×&—6öã¦6ö×&—6öâÆf÷&ÖC¦f÷&ÖGÓ° ¢f"÷Vä&Vf÷&RÒ÷VäW†Ó°¢÷VäW†ÒÒgVæ7F–öâ†W†Ò’°¢f"&W7VÇBÒ÷Vä&Vf÷&RæÇ’‡F†—2Æ&wVÖVçG2’ÂÖöFÂÒ7FFRæÖöFÃ°¢–b‚ÖöFÂÇÂÖöFÂçVW'•6VÆV7F÷"‚r6W†Õ7V&¦V7G5cbr’ÇÂÖöFÂåöfW&vTG&gB’&WGW&â&W7VÇC°¢ÖöFÂåöfW&vW4f÷$W†ÒÒ7G&–ær†W†ÒbbW†Òæ–BÇÂrr“°¢ÖöFÂåöfW&vT÷væW"Ò7FFRçFö¶Vã°¢ÖöFÂåöfW&vTG&gBÒ¥4ôâç'6R„¥4ôâç7G&–æv–g’†W†ÒbbW†ÒæfW&vW2ÇÂ·Ò’“°¢gVæ7F–öâFV6÷&FR†6&BÆ¶W’ÆæÖRÆæ6†÷"’°¢f"&Æö6²Ò6&BçVW'•6VÆV7F÷"‚ræW†ÒÖfW&vW2r“°¢–b†&Æö6²bb&Æö6²æFF6WBæfW&vT¶W’ÓÓÒ¶W’’&WGW&ã°¢–b†&Æö6²’&Æö6²ç&VÖ÷fR‚“°¢&Æö6²ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vF—br“²&Æö6²æ6Æ74æÖRÒvW†ÒÖfW&vW2s²&Æö6²æFF6WBæfW&vT¶W’Ò¶W“°¢²v6Æ72rÂw–V"uÒæf÷$V6‚†gVæ7F–öâ‡66÷R’°¢f"Æ&VÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vÆ&VÂr“²Æ&VÂæ6Æ74æÖRÒvfW&vRÖf–VÆBs°¢f"F—FÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7âr“²F—FÆRçFW‡D6öçFVçBÒ66÷RÓÓÒv6Æ72rò~xúŞ{ª~YØ~Xˆbr¢~[›N{ª~YØ~Xˆbs²Æ&VÂæVæD6†–ÆB‡F—FÆR“°¢f"–çWBÒFö7VÖVçBæ7&VFTVÆVÖVçB‚v–çWBr“²–çWBæFF6WBæfW&vU&÷rÒ¶W“²–çWBæFF6WBæfW&vU66÷RÒ66÷S°¢–çWBçG—RÒvçVÖ&W"s²–çWBæÖ–âÒss²–çWBæÖ‚Òs““““’s²–çWBç7FWÒsãs²–çWBæ–çWDÖöFRÒvFV6–ÖÂs²–çWBçÆ6V†öÆFW"Ò~˜Z²+riÈ{¸Xˆbs°¢–çWBç6WDGG&–'WFR‚v&–ÖÆ&VÂrÆæÖR²F—FÆRçFW‡D6öçFVçB“°¢f"6fVBÒÖöFÂåöfW&vTG&gE¶¶W•Ó²–çWBçfÇVRÒ6fVBbb6fVE·66÷UÒÒçVÆÂò6fVE·66÷UÒ¢rs°¢–çWBæöæ–çWBÒgVæ7F–öâ‚’²f"G&gBÒÖöFÂåöfW&vTG&gE¶¶W•ÒÇÂ†ÖöFÂåöfW&vTG&gE¶¶W•ÒÒ·Ò“²G&gE·66÷UÒÒ–çWBçfÇVS²–çWBç&VÖ÷fTGG&–'WFR‚v&–Ö–çfÆ–Br“²Ó°¢Æ&VÂæVæD6†–ÆB†–çWB“²&Æö6²æVæD6†–ÆB†Æ&VÂ“°¢Ò“°¢f"66÷&RÒ6&BçVW'•6VÆV7F÷"†æ6†÷"“°¢–b‡66÷&R’66÷&Ræ–ç6W'DF¦6VçDVÆVÖVçB‚vgFW&VæBrÆ&Æö6²“²VÇ6R6&BæVæD6†–ÆB†&Æö6²“°¢Ğ¢gVæ7F–öâ7–æ2‚’°¢f"F÷FÂÒÖöFÂçVW'•6VÆV7F÷"‚ræ6öÖ&ò×F÷FÂ×c#r“°¢–b‡F÷FÂ’FV6÷&FR‡F÷FÂÂwF÷FÂrÂ~h¾XˆbrÂrç66÷&R×F÷FÂ×&Wf–Wr×c2r“°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræW†Ò×7V&¦V7BÖ6&B×cr’æf÷$V6‚†gVæ7F–öâ†6&B’°¢f"æÖRÒ6&BçVW'•6VÆV7F÷"‚ræW†Ò×7V&¦V7BÖæÖR×cr’çfÇVRçG&–Ò‚“°¢–b†æÖR’FV6÷&FR†6&BÂw3¢r²æÖRÆæÖRÂrç66÷&RÖ6ö×7B×cBr“°¢Ò“°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræ6öÖ&òÖ6&B×c#r’æf÷$V6‚†gVæ7F–öâ†6&B’°¢f"ÒÒ‡7FFRæÖöGVÆW5c‚ÇÂµÒ’æf–æB†gVæ7F–öâ†Ò’²&WGW&â7G&–ær†Òæ–B’ÓÓÒ6&BæFF6WBæ6öÖ&ô–C²Ò“°¢–b†Ò’FV6÷&FR†6&BÂvÓ¢r²Òæ–BÆÒææÖRÂræ6öÖ&ò×66÷&R×c#r“°¢Ò“°¢Ğ¢7–æ2‚“°¢f"ö'6W'fW"ÒæWr×WFF–öäö'6W'fW"†gVæ7F–öâ‚’²–b‚ÖöFÂæ—46öææV7FVB’²ö'6W'fW"æF—66öææV7B‚“²&WGW&ã²Ò7–æ2‚“²Ò“°¢²r6W†Õ7V&¦V7G5cbrÂr66öÖ&ôÆ—7Ec#uÒæf÷$V6‚†gVæ7F–öâ‡6VÂ’²f"VÂÒÖöFÂçVW'•6VÆV7F÷"‡6VÂ“²–b†VÂ’ö'6W'fW"æö'6W'fR†VÂÇ¶6†–ÆDÆ—7C§G'VRÇ7V'G&VS§G'VWÒ“²Ò“°¢ÖöFÂæFDWfVçDÆ—7FVæW"‚v–çWBrÆgVæ7F–öâ†R’²–b†RçF&vWBæÖF6†W2‚ræW†Ò×7V&¦V7BÖæÖR×cr’’7–æ2‚“²Ò“°¢&WGW&â&W7VÇC°¢Ó°¢f"”&Vf÷&RÒFF•cs°¢FF•crÒgVæ7F–öâ†7F–öâÇ–ÆöB’°¢f"ÖöFÂÒ7FFRæÖöFÃ°¢–b†7F–öâÓÓÒw6fUöW†Òrbb–ÆöBbb–ÆöBæW†ÒbbÖöFÂbbÖöFÂåöfW&vTG&gBbbÖöFÂåöfW&vW4f÷$W†ÒÓÓÒ7G&–ær‡–ÆöBæW†Òæ–BÇÂrr’’°¢–b†ÖöFÂåöfW&vT÷væW"ÓÒ7FFRçFö¶Vâ’F‡&÷ræWrW'&÷"‚~‹JnXû~[{.Xˆ~hÚ.ûÈÎŠû~˜xŞikh™>[Èˆ>ŠùRr“°¢f"fW&vW2Ò·Ó°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚v–çWE¶FFÖfW&vR×&÷uÒr’æf÷$V6‚†gVæ7F–öâ†–çWB’°¢f"&rÒ–çWBçfÇVRçG&–Ò‚“²–b‚&rbb–çWBçfÆ–F—G’æ&D–çWB’&WGW&ã°¢f"âÒçVÖ&W"‡&r“°¢–b†âÓÓÒçVÆÂÇÂâÂÇÂââ““““’ÇÂ–çWBçfÆ–F—G’çfÆ–B’°¢–çWBç6WDGG&–'WFR‚v&–Ö–çfÆ–BrÂwG'VRr“²–çWBæfö7W2‚“²F‡&÷ræWrW'&÷"†–çWBævWDGG&–'WFR‚v&–ÖÆ&VÂr’²~Šû~‹é>XZRûÙã““““ûÈÎiÈZI®KŠNKØŞ[şi[r“°¢Ğ¢f"&÷rÒfW&vW5¶–çWBæFF6WBæfW&vU&÷uÒÇÂ†fW&vW5¶–çWBæFF6WBæfW&vU&÷uÒÒ·Ò“²&÷u¶–çWBæFF6WBæfW&vU66÷UÒÒã°¢Ò“°¢–ÆöBÒö&¦V7Bæ76–vâ‡·ÒÇ–ÆöBÇ¶W†Ó¤ö&¦V7Bæ76–vâ‡·ÒÇ–ÆöBæW†ÒÇ¶fW&vW3¦fW&vW7Ò—Ò“°¢Ğ¢&WGW&â”&Vf÷&Ræ6ÆÂ‡F†—2Æ7F–öâÇ–ÆöB“°¢Ó°¢f"†öÖT&Vf÷&RÒ†öÖT‡FÖÃ°¢†öÖT‡FÖÂÒgVæ7F–öâ‚’°¢f"‡FÖÂÒ†öÖT&Vf÷&RæÇ’‡F†—2Æ&wVÖVçG2’ÂW‡G&Ò6W&–W2‚“°¢–b†W‡G&æÆVæwF‚’‡FÖÂÒ‡FÖÂç&WÆ6R‚òƒÆF—b6Æ73Ò&ÆVvVæB#â’…µÇ5Å5Ò£ò’ƒÅÂöF—câ’òÆgVæ7F–öâ…òÆÆ"Æ2’²&WGW&â²"²W‡G&æÖ†gVæ7F–öâ‡2’²&WGW&âsÇ7ããÆ’7G–ÆSÒ&&6¶w&÷VæC¢r²2æ6öÆ÷"²r#ãÂö“âr²2æÆ&VÂ²sÂ÷7ãâs²Ò’æ¦ö–â‚rr’²3²Ò“°¢&WGW&â‡FÖÃ°¢Ó°¢f"ÖWG&–4&Vf÷&RÒÆFW7DÖWG&–5c#°¢ÆFW7DÖWG&–5c#ÒgVæ7F–öâ‚’°¢f"ÖWG&–2ÒÖWG&–4&Vf÷&RæÇ’‡F†—2Æ&wVÖVçG2“²–b‚ÖWG&–2’&WGW&âÖWG&–3°¢f"7V&¦V7G2ÒVffV7F—fU66÷&U7V&¦V7G5c#†ÖWG&–2æW†Ò’Â7V&¦V7BÒ7V&¦V7G2æÆVæwF‚ÓÓÒbbçVÖ&W"†ÖWG&–2æW†ÒçF÷FÅö7GVÅ÷66÷&R’ÓÓÒçVÆÂò7V&¦V7G5³Ò¢~h¾Xˆbs°¢&WGW&âö&¦V7Bæ76–vâ‡·ÒÆÖWG&–2Ç¶6ö×&—6öã¦6ö×&—6öâ†ÖWG&–2æW†ÒÇ7V&¦V7BÆÖWG&–2çfÇVR—Ò“°¢Ó°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“°¢7G–ÆRçFW‡D6öçFVçBÒræW†ÒÖfW&vW7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£‡ƒ¶Ö&v–â×F÷£‡ÒæfW&vRÖf–VÆG¶F—7Æ“¦w&–C¶v£Wƒ¶Ö–â×v–GFƒ£¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæfW&vRÖf–VÆB–çWG·v–GFƒ£S¶Ö–â×v–GFƒ£¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶Ö–âÖ†V–v‡C£3‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖ–çWBÖÆ–æRÇf"‚ÒÖÆ–æR’“¶&÷&FW"×&F—W3£ƒ·FF–æs£—‚‡ƒ¶&6¶w&÷VæC§f"‚ÒÖ–çWBÖ&rÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—C¶föçB×6—¦S£'‡ÒæfW&vRÖf–VÆB–çWC¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖfö7W2Çf"‚ÒÖ66VçB’“¶÷WFÆ–æRÖöfg6WC£‡ÒæfW&vRÖf–VÆB¶&–Ö–çfÆ–C×G'VU×¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖFævW"—Òæ†W&òÖfW&vW¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãwÒs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒ7W&6RögVæ7F–öç2õ÷6†&VB÷VW7F–öâ×G—W2æ§2ÓÓÓÓÒ¢ğ¢ò¢6†&VB'’F†R'&÷w6W"'VæFÆRæBVFvR†æFÆW'2âÆÂ'&V¶F÷vç2W6R&rÖ&·2â¢ğ¢†gVæ7F–öâ‡&ö÷B’°¢wW6R7G&–7Bs°¢gVæ7F–öâçVÖ&W"‡fÇVR’°¢–b‡fÇVRÓÓÒçVÆÂÇÂfÇVRÓÓÒVæFVf–æVBÇÂfÇVRÓÓÒrr’&WGW&âçVÆÃ°¢–b‚²vçVÖ&W"rÂw7G&–æruÒæ–æ6ÇVFW2‡G—VöbfÇVR’ÇÂ‡G—VöbfÇVRÓÓÒw7G&–ærrbbfÇVRçG&–Ò‚’’’&WGW&âæã°¢f"âÒçVÖ&W"‡fÇVR“°¢&WGW&âçVÖ&W"æ—4f–æ—FR†â’bbâãÒbbâÃÒ““““’bbÖF‚æ'2†â¢ÒÖF‚ç&÷VæB†â¢’’Âãòâ¢æã°¢Ğ¢f"F–ff–7VÇF–W2Ò¶V7“¢~Yû®zrÆÖVF—VÓ¢~KŠŞzØ’rÆ†&C¢~‹è>™«âwÓ°¢f"6W6W2Ò¶¶æ÷vÆVFvS¢~yú^ŠønKˆŞxiòrÆÖWF†öC¢~h	Ş‹zşXù~™‹²rÆ6&VÆW73¢~Zêš)‚şŠêzé~yhşkÈòrÇF–ÖS¢~i{n™{NKˆŞ‹k2wÓ°¢gVæ7F–öâ¶W’‡&÷r’²&WGW&â¥4ôâç7G&–æv–g’…µ7G&–ær‡&÷rææÖRÇÂrr’çG&–Ò‚’Â7G&–ær‡&÷rç÷6—F–öâÇÂrr’çG&–Ò‚•Ò“²Ğ¢gVæ7F–öâÆ&VÂ‡&÷r’²&WGW&â&÷rææÖR²‡&÷rç÷6—F–öâòr+rr²&÷rç÷6—F–öâ¢rr“²Ğ¢gVæ7F–öâ6ÆVâ‡&÷w2Â7V&¦V7B’°¢–b‚'&’æ—4'&’‡&÷w2’ÇÂ&÷w2æÆVæwF‚â3’F‡&÷ræWrW'&÷"‚‡7V&¦V7BÇÂrr’²~š)Yè¾š¾K‹®X‰~ŠûÈÎjøşzyiÈZI¢3š’r“°¢f"6VVâÒæWr6WB‚“°¢f"6ÆVæVBÒ&÷w2æf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â‡"bb"ææÖRÓÓÒrrbb‡"ç66÷&RÓÒçVÆÂÇÂ"ç66÷&RÓÓÒrr’bb‡"æÖ‚ÓÒçVÆÂÇÂ"æÖ‚ÓÓÒrr’bb"ç÷6—F–öâbb"æF–ff–7VÇG’bb"æ6W6R“²Ò’æÖ†gVæ7F–öâ‡"’°¢–b‚"ÇÂG—Vöb"ÓÒvö&¦V7BrÇÂ'&’æ—4'&’‡"’’F‡&÷ræWrW'&÷"‚~š)Yè¾iÚyºîjÎ[ÈşKˆŞjÚ>zâr“°¢f"æÖRÒG—Vöb"ææÖRÓÓÒw7G&–ærrò"ææÖRçG&–Ò‚’¢rs°¢–b‚æÖRÇÂæÖRæÆVæwF‚âC’F‡&÷ræWrW'&÷"‚~š)Yè¾YŞz{Šû~Z¾Xi’ûÙãCKŠ®ZÙ~zÊbr“°¢–b‡"ç÷6—F–öâÒçVÆÂbbG—Vöb"ç÷6—F–öâÓÒw7G&–ærr’F‡&÷ræWrW'&÷"‚~š)XûrşKØŞ{Úîš¾K‹®ih~ZÙrr“°¢f"÷6—F–öâÒ‡"ç÷6—F–öâÇÂrr’çG&–Ò‚“°¢–b‡÷6—F–öâæÆVæwF‚â#B’F‡&÷ræWrW'&÷"‚~š)XûrşKØŞ{ÚîiÈZI¢#BKŠ®ZÙ~zÊbr“°¢f"–FVçF—G’Ò¶W’‡¶æÖS¦æÖRÇ÷6—F–öã§÷6—F–öçÒ“°¢–b‡6VVâæ†2†–FVçF—G’’’F‡&÷ræWrW'&÷"‚~š)Yè¾8Âr²æÖR²~8Ş˜xŞZHŞK¨nûÈÎŠû~Y[›nh‰nXË®Xˆnš)XûrşKØŞ{Úâr“°¢6VVâæFB†–FVçF—G’“°¢f"66÷&RÒçVÖ&W"‡"ç66÷&R’ÂÖ‚ÒçVÖ&W"‡"æÖ‚“°¢–b„çVÖ&W"æ—4æâ‡66÷&R’ÇÂçVÖ&W"æ—4æâ†Ö‚’ÇÂÖ‚ÓÓÒ’F‡&÷ræWrW'&÷"†æÖR²~y¨N[é~Xˆnš¾K‹®™Ùî‹Işi[8kºXˆnš¾ZJ~K¨âûÈÎiÈZI®KŠNKØŞ[şi[r“°¢–b†Ö‚ÓÒçVÆÂbb66÷&RÓÒçVÆÂbb66÷&RâÖ‚’F‡&÷ræWrW'&÷"†æÖR²~y¨N[é~XˆnKˆŞˆ;Ş‹h^‹ø~kºXˆbr“°¢f"&W7VÇBÒ²æÖS¢æÖRÂ66÷&S¢66÷&RÂÖƒ¢Ö‚Ó°¢–b‡÷6—F–öâ’&W7VÇBç÷6—F–öâÒ÷6—F–öã°¢µ²vF–ff–7VÇG’rÆF–ff–7VÇF–W5ÒÅ²v6W6RrÆ6W6W5ÕÒæf÷$V6‚†gVæ7F–öâ‡—"’°¢f"bÒ%·—%³ÕÓ°¢–b‡bÓÒçVÆÂÇÂbÓÓÒrr’&WGW&ã°¢–b‡G—VöbbÓÒw7G&–ærrÇÂö&¦V7Bç&÷F÷G—Ræ†4÷vå&÷W'G’æ6ÆÂ‡—%³ÒÇb’’F‡&÷ræWrW'&÷"†æÖR²~y¨N™«î[ªnh‰nZKXˆnXéşYº˜šKˆŞjÚ>zâr“°¢&W7VÇE·—%³ÕÒÒc°¢Ò“°¢&WGW&â&W7VÇC°¢Ò“°¢6ÆVæVBæf÷$V6‚†gVæ7F–öâ‡"’°¢–b‚"ç÷6—F–öâbb6ÆVæVBç6öÖR†gVæ7F–öâ†÷F†W"’²&WGW&â÷F†W"ææÖRÓÓÒ"ææÖRbb÷F†W"ç÷6—F–öã²Ò’’F‡&÷ræWrW'&÷"‡"ææÖR²~KˆŞˆ;ŞYÎi{n[Ù^XZ^š)Yè¾YŠêY(ÎXˆnš)[é~XˆnûÈÎŠû~KùŞyYKˆzxŞXú>[èBr“°¢Ò“°¢&WGW&â6ÆVæVC°¢Ğ¢gVæ7F–öâ7VÒ‡&÷w2’°¢f"66÷&RÒÂÖ‚ÒÂ66÷&VBÒÂ6ö×ÆWFRÒ&÷w2æÆVæwF‚â°¢&÷w2æf÷$V6‚†gVæ7F–öâ‡"’²–b‡"ç66÷&RÓÒçVÆÂ’²66÷&R³Ò"ç66÷&S²66÷&VB²³²Ò–b‡"æÖ‚ÓÒçVÆÂ’Ö‚³Ò"æÖƒ²–b‡"ç66÷&RÓÓÒçVÆÂÇÂ"æÖ‚ÓÓÒçVÆÂ’6ö×ÆWFRÒfÇ6S²Ò“°¢&WGW&â²66÷&S¢ÖF‚ç&÷VæB‡66÷&R¢’òÂÖƒ¢ÖF‚ç&÷VæB†Ö‚¢’òÂ66÷&VC¢66÷&VBÂ6ö×ÆWFS¢6ö×ÆWFRÓ°¢Ğ¢gVæ7F–öâfÆ–FFR‡&÷w2Â&tÖ‚Â&u66÷&R’°¢f"2Ò7VÒ‡&÷w2“°¢–b‡&tÖ‚ÒçVÆÂbb2æÖ‚â&tÖ‚²ã’F‡&÷ræWrW'&÷"‚~š)Yè¾kºXˆnYŠê‹h^‹ø~XÛ~™Ú.XéşZx¾kºXˆnûÈÎŠû~j8iú^iŠşY
n˜xŞZHŞ[Ù^XZRr“°¢–b‡&tÖ‚ÒçVÆÂbb2ç66÷&Râ&tÖ‚²ã’F‡&÷ræWrW'&÷"‚~š)Yè¾[é~XˆnYŠê‹h^‹ø~XÛ~™Ú.XéşZx¾kºXˆbr“°¢–b‡&u66÷&RÒçVÆÂbb2ç66÷&Râ&u66÷&R²ã’F‡&÷ræWrW'&÷"‚~š)Yè¾[é~XˆnYŠê‹h^‹ø~XéşZx¾XˆnûÈÎŠû~jZûYîKùŞZÙ‚r“°¢&WGW&â3°¢Ğ¢f"’Ò²çVÖ&W#¢çVÖ&W"Â6ÆVã¢6ÆVâÂ7VÓ¢7VÒÂfÆ–FFS¢fÆ–FFRÂ¶W“¦¶W’ÂÆ&VÃ¦Æ&VÂÂF–ff–7VÇF–W3¦F–ff–7VÇF–W2Â6W6W3¦6W6W2Ó°¢&ö÷Bå66÷&UVW7F–öåG—TÖöFVÂÒ“°¢–b‡G—VöbÖöGVÆRÓÒwVæFVf–æVBrbbÖöGVÆRæW‡÷'G2’ÖöGVÆRæW‡÷'G2Ò“°§Ò’†vÆö&ÅF†—2“° ¢ò¢ÓÓÓÓÒVW7F–öâ×G—R×66÷&W2æ§2ÓÓÓÓÒ¢ğ¢ò¢÷F–öæÂW"×7V&¦V7B&r×66÷&R'&V¶F÷vç2ÂæWfW"6÷VçFVBv–â–âW†ÒF÷FÇ2â¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"ÖöFVÂÒv–æF÷rå66÷&UVW7F–öåG—TÖöFVÃ°¢f"&W6WG2Ò°¢~ˆ»ŠúÒs¢²~Y
ÎX©²rÂ~™ˆ^Šû¾ynŠz2rÂ~Kˆ>˜K©BrÂ~ZèÎ[Ú.Z¾z›¢rÂ~ŠúŞk9^Z¾z›¢rÂ~yúŞih~iK™I’rÂ~[©NyJihrrÂ~Šû¾Yî{ºŞXi’rÂ~KÙÎihruÒÀ¢~ŠúŞihrs¢²~xëKº>ih~™ˆ^Šû²rÂ~ih~Šˆih~™ˆ^Šû²rÂ~XúNŠù~ŠøŞ˜›N‹XòrÂ~YŞzø~YŞXú^›¹Xi’rÂ~ŠúŞŠˆih~ZÙ~‹ùyJ‚rÂ~KÙÎihruÒÀ¢~i[ZÚbs¢²~XÙ^š˜hºš)‚rÂ~ZI®š˜hºš)‚rÂ~Z¾z›®š)‚rÂ~Šz>zÙNš)‚uÒÀ¢~xšybs¢²~XÙ^š˜hºš)‚rÂ~ZI®š˜hºš)‚rÂ~Zéîš¨Îš)‚rÂ~Šêzé~š)‚uÒÀ¢~XÉnZÚbs¢²~˜hºš)‚rÂ~Zéîš¨Îš)‚rÂ~Xéşyn{»ÎYš)‚rÂ~iÈiË®hêijŞš)‚uÒÀ¢~yIşxš’s¢²~˜hºš)‚rÂ~™Ùî˜hºš)‚uÒÂ~iKşk+²s¢²~˜hºš)‚rÂ~iÙiiXˆniéš)‚uÒÂ~XènXû"s¢²~˜hºš)‚rÂ~iÙiiXˆniéš)‚rÂ~Šë®‹ûš)‚uÒÂ~YËybs¢²~˜hºš)‚rÂ~{»ÎYš)‚uĞ¢Ó°¢gVæ7F–öâW62‡b’²&WGW&âW66T‡FÖÂ…7G&–ær‡bÓÒçVÆÂòrr¢b’“²Ğ¢gVæ7F–öâf×B‡b’²&WGW&âbÓÒçVÆÂò~(	Br¢7G&–ær‡b“²Ğ¢gVæ7F–öâ6&DæÖR†6&B’²&WGW&â6&BçVW'•6VÆV7F÷"‚ræW†Ò×7V&¦V7BÖæÖR×cr’çfÇVRçG&–Ò‚“²Ğ¢gVæ7F–öâfÇVR†6&BÂ6VÆV7F÷"’²f"–çWBÒ6&BçVW'•6VÆV7F÷"‡6VÆV7F÷"“²&WGW&âÖöFVÂæçVÖ&W"†–çWBò–çWBçfÇVR¢çVÆÂ“²Ğ¢gVæ7F–öâ&u66÷&R†6&B’²f"&rÒfÇVR†6&BÂrç&r×cbr“²&WGW&â&rÓÓÒçVÆÂbbfÇVR†6&BÂrç&vÖ‚×cbr’ÓÓÒfÇVR†6&BÂræÖ‚×cbr’òfÇVR†6&BÂræ7GVÂ×cbr’¢&s²Ğ¢gVæ7F–öâG&6²†WfVçBÂÖWFFF’²–b‡v–æF÷råõ÷66÷&UG&6¶W%G&6²’v–æF÷råõ÷66÷&UG&6¶W%G&6²†WfVçBÂÖWFFFÂw&V6÷&Br“²Ğ¢gVæ7F–öâÖWFFF‡"Â’Â7V&¦V7B’°¢f"&Vf—‚ÒW62‡7V&¦V7B’²~š)Yè²r²†’²“°¢gVæ7F–öâ6VÆV7B†f–VÆBÂF—FÆRÂ÷F–öç2’²&WGW&âsÆÆ&VÃãÇ7ãâr²F—FÆR²sÂ÷7ããÇ6VÆV7BFF×BÖf–VÆCÒ"r²f–VÆB²r"&–ÖÆ&VÃÒ"r²&Vf—‚²F—FÆR²r#ãÆ÷F–öâfÇVSÒ"#îiÊ®j~k:ƒÂö÷F–öãâr²ö&¦V7Bæ¶W—2†÷F–öç2’æÖ†gVæ7F–öâ†²’²&WGW&âsÆ÷F–öâfÇVSÒ"r²²²r"r²‡%¶f–VÆEÒÓÓÒ²òr6VÆV7FVBr¢rr’²sâr²÷F–öç5¶µÒ²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃâs²Ğ¢&WGW&âsÆFWF–Ç26Æ73Ò'BÖÖWF"r²‡"ç÷6—F–öâÇÂ"æF–ff–7VÇG’ÇÂ"æ6W6Ròr÷Vâr¢rr’²sãÇ7VÖÖ'“îKØŞ{Úî8™«î[ªnKˆîXéşYºÇ6ÖÆÃî˜Z³Â÷6ÖÆÃãÂ÷7VÖÖ'“ãÆF—cãÆÆ&VÃãÇ7ãîš)XûròKØŞ{ÚãÂ÷7ããÆ–çWBFF×BÖf–VÆCÒ'÷6—F–öâ"Ö†ÆVæwFƒÒ##B"fÇVSÒ"r²W62‡"ç÷6—F–öâ’²r"&–ÖÆ&VÃÒ"r²&Vf—‚²~š)Xû~KØŞ{Úâ"Æ6V†öÆFW#Ò.Zh.ûÉ®zÊÂ#š)‚ò™ˆ^Šû²#ãÂöÆ&VÃâr²6VÆV7B‚vF–ff–7VÇG’rÂ~™«î[ªbrÆÖöFVÂæF–ff–7VÇF–W2’²6VÆV7B‚v6W6RrÂ~K‹¾ŠhZKXˆnXéşYºrÆÖöFVÂæ6W6W2’²sÂöF—cãÇ6Æ73Ò'BÖ†VÇ#îhÈiÊÎš)Zéî™˜^h8^Xk^Z¾XiûÉ¾™«î[ªnKˆŞzîZé®XúşKº^yYz›®ûÈÎ[é~XˆnKØîKˆŞKˆZé®Kº>Šš)yºî™«î8#Â÷ãÂöFWF–Ç3âs°¢Ğ¢gVæ7F–öâÖ÷VçB†ÖöFÂÂ6&B’°¢–b†6&BçVW'•6VÆV7F÷"‚rçBÖVF—F÷"r’’&WGW&ã°¢f"æÖRÒ6&DæÖR†6&B“²–b‚æÖR’&WGW&ã°¢f"G&gBÒÖöFÂå÷VW7F–öåG—TG&gC°¢–b‚ö&¦V7Bç&÷F÷G—Ræ†4÷vå&÷W'G’æ6ÆÂ†G&gBÂæÖR’’G&gE¶æÖUÒÒµÓ°¢f"&÷‚ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“²&÷‚æ6Æ74æÖRÒwBÖVF—F÷"s²&÷‚æ÷VâÒG&gE¶æÖUÒæÆVæwF‚â°¢&÷‚æ–ææW$…DÔÂÒsÇ7VÖÖ'“ãÇ7ãîš)Yè¾[é~XˆbÇ6ÖÆÃî˜Z³Â÷6ÖÆÃãÂ÷7ããÇ7â6Æ73Ò'B×7VÖÖ'’#ãÂ÷7ããÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'BÖ&öG’#ãÇ6Æ73Ò'BÖ†VÇ#îhÈXÛ~™Ú.XéşZx¾XˆnŠë[Ù^ûÈÎXúşXú®Z¾˜:Xˆnš)Yè¾8.XúşZ¾š)Yè¾YŠêûÈÎh‰nyJš)Xû~XË®XˆnYÎKˆš)Yè¾y¨N[şš)ûÉ¾YÎKˆ˜:XˆnKˆŞŠh˜xŞZHŞ[Ù^XZ^8#Â÷ãÆF—b6Æ73Ò'B×&÷w2#ãÂöF—cãÆF—b6Æ73Ò'B×FööÆ&"#ãÆÆ&VÃãÇ7â6Æ73Ò'B×7"#îk{¾Xª[‹yJš)Yè³Â÷7ããÇ6VÆV7B6Æ73Ò'B×&W6WB"&–ÖÆ&VÃÒ"r²W62†æÖR’²~k{¾Xª[‹yJš)Yè²#ãÆ÷F–öâfÇVSÒ"#îûÈ²[‹yJš)Yè³Âö÷F–öãâr²‡&W6WG5¶æÖUÒÇÂ²~˜hºš)‚rÂ~Z¾z›®š)‚rÂ~Šz>zÙNš)‚uÒ’æÖ†gVæ7F–öâ†â’²&WGW&âsÆ÷F–öãâr²W62†â’²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'BÖFB#îûÈ²ˆz®Zé®K˜š)Yè³Âö'WGFöããÂöF—cãÆF—b6Æ73Ò'B×7FGW2"&–ÖÆ—fSÒ'öÆ—FR#ãÂöF—cãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'B×W6R"†–FFVãîyJYŠêZ¾XZ^XéşZx¾XˆcÂö'WGFöããÂöF—câs°¢6&BæVæD6†–ÆB†&÷‚“°¢f"&÷w2Ò&÷‚çVW'•6VÆV7F÷"‚rçB×&÷w2r’Â7FGW2Ò&÷‚çVW'•6VÆV7F÷"‚rçB×7FGW2r“°¢gVæ7F–öâWFFR‚’°¢&÷‚çVW'•6VÆV7F÷"‚rçB×7VÖÖ'’r’çFW‡D6öçFVçBÒG&gE¶æÖUÒæÆVæwF‚òG&gE¶æÖUÒæÆVæwF‚²rš’r¢~[^[È[Ù^XZRs°¢f"W6RÒ&÷‚çVW'•6VÆV7F÷"‚rçB×W6Rr“²W6Ræ†–FFVâÒG'VS²7FGW2æ6Æ74Æ—7Bç&VÖ÷fR‚wBÖW'&÷"r“°¢G'’°¢f"6ÆVâÒÖöFVÂæ6ÆVâ†G&gE¶æÖUÒ’Â7VÒÒÖöFVÂç7VÒ†6ÆVâ’ÂÖ‚ÒfÇVR†6&BÂrç&vÖ‚×cbr“°¢ÖöFVÂçfÆ–FFR†6ÆVâÂÖ‚ÂçVÆÂ“°¢W6Ræ†–FFVâÒ‡7VÒæ6ö×ÆWFRbbÖ‚ÓÒçVÆÂbbÖF‚æ'2‡7VÒæÖ‚ÒÖ‚’Âã“°¢7FGW2çFW‡D6öçFVçBÒ6ÆVâæÆVæwF‚ò~[{.[Ù^[é~Xˆbr²7VÒç66÷&R²rXˆb+rr²7VÒç66÷&VB²ròr²6ÆVâæÆVæwF‚²rš[{.Z¾[é~Xˆbr²‡7VÒæ6ö×ÆWFRbb7VÒæÖ‚ÓÓÒÖ‚òr+r[{.Šhny¹nXÛ~™Ú.kºXˆbr¢r+rK¸^{¹şŠê[{.[Ù^š)Yè²r’¢~XúşK¸î[‹yJš)Yè¾[ÈZx¾ûÈÎK™şXúşKº^y»Nhê^k{¾Xªˆz®[{y¨Nš)Yè¾8"s°¢f"&rÒ&u66÷&R†6&B“°¢–b‡&rÓÒçVÆÂbb7VÒç66÷&Râ&r’²7FGW2çFW‡D6öçFVçB³Ò~8.YŠê‹h^‹ø~[Ù>X˜ŞXéşZx¾XˆnûÈÎŠû~jZû8"s²7FGW2æ6Æ74Æ—7BæFB‚wBÖW'&÷"r“²Ğ¢VÇ6R–b‡7VÒæ6ö×ÆWFRbb7VÒæÖ‚ÓÓÒÖ‚bb&rÓÒçVÆÂbb7VÒç66÷&RÓÒ&r’7FGW2çFW‡D6öçFVçB³Ò~8.Kˆî[Ù>X˜ŞXéşZx¾Xˆny»[zâr²ÖF‚ç&÷VæB‚‡7VÒç66÷&RÒ&r’£’ó²rXˆnûÈÎŠû~jZû8"s°¢Ò6F6‚†R’²7FGW2çFW‡D6öçFVçBÒRæÖW76vS²7FGW2æ6Æ74Æ—7BæFB‚wBÖW'&÷"r“²Ğ¢Ğ¢gVæ7F–öâG&r‚’°¢&÷w2æ–ææW$…DÔÂÒG&gE¶æÖUÒæÖ†gVæ7F–öâ‡"Æ’’²&WGW&âsÆF—b6Æ73Ò'B×&÷r#ãÆÆ&VÂ6Æ73Ò'BÖæÖR#ãÇ7ãîš)Yè³Â÷7ããÆ–çWBFF×BÖf–VÆCÒ&æÖR"Ö†ÆVæwFƒÒ#C"fÇVSÒ"r²W62‡"ææÖR’²r"&–ÖÆ&VÃÒ"r²W62†æÖR’²~š)Yè²r²†’³’²~YŞz{"Æ6V†öÆFW#Ò.Zh.ûÉ®ZèÎ[Ú.Z¾z›¢#ãÂöÆ&VÃãÆÆ&VÃãÇ7ãî[é~XˆcÂ÷7ããÆ–çWBFF×BÖf–VÆCÒ'66÷&R"G—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#““““’"7FWÒ#ã"–çWFÖöFSÒ&FV6–ÖÂ"fÇVSÒ"r²W62‡"ç66÷&R’²r"&–ÖÆ&VÃÒ"r²W62†æÖR’²~š)Yè²r²†’³’²~[é~Xˆb"Æ6V†öÆFW#Ò.[è^ŠR#ãÂöÆ&VÃãÆÆ&VÃãÇ7ãîkºXˆcÂ÷7ããÆ–çWBFF×BÖf–VÆCÒ&Ö‚"G—SÒ&çVÖ&W""Ö–ãÒ#ã"ÖƒÒ#““““’"7FWÒ#ã"–çWFÖöFSÒ&FV6–ÖÂ"fÇVSÒ"r²W62‡"æÖ‚’²r"&–ÖÆ&VÃÒ"r²W62†æÖR’²~š)Yè²r²†’³’²~kºXˆb"Æ6V†öÆFW#Ò.[è^ŠR#ãÂöÆ&VÃãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'B×&VÖ÷fR"&–ÖÆ&VÃÒ.XŠ™šNš)Yè²r²†’³’²r#ì9sÂö'WGFöãâr²ÖWFFF‡"Æ’ÆæÖR’²sÂöF—câs²Ò’æ¦ö–â‚rr“°¢&÷w2çVW'•6VÆV7F÷$ÆÂ‚rçB×&÷rr’æf÷$V6‚†gVæ7F–öâ‡&÷rÆ’’°¢&÷rçVW'•6VÆV7F÷$ÆÂ‚v–çWBÇ6VÆV7Br’æf÷$V6‚†gVæ7F–öâ†–çWB’²–çWBæöæ–çWBÒ–çWBæöæ6†ævRÒgVæ7F–öâ‚’²G&gE¶æÖUÕ¶•Õ¶–çWBæFF6WBçDf–VÆEÒÒ–çWBçfÆ–F—G’æ&D–çWBòv–çfÆ–Br¢–çWBçfÇVS²WFFR‚“²Ó²Ò“°¢&÷rçVW'•6VÆV7F÷"‚v'WGFöâr’æöæ6Æ–6²ÒgVæ7F–öâ‚’²G&gE¶æÖUÒç7Æ–6R†’Ã“²G&r‚“²Ó°¢Ò“²WFFR‚“°¢Ğ¢gVæ7F–öâFB†Æ&VÂ’°¢–b†G&gE¶æÖUÒæÆVæwF‚ãÒ3’&WGW&âFö7B‚~jøşzyiÈZI®Šë[ÙR3KŠ®š)Yè²r“°¢–b†Æ&VÂbbG&gE¶æÖUÒç6öÖR†gVæ7F–öâ‡"’²&WGW&â"ææÖRçG&–Ò‚’ÓÓÒÆ&VÃ²Ò’’&WGW&âFö7B‚~‹ùKŠ®š)Yè¾[{.k{¾Xªr“°¢G&gE¶æÖUÒçW6‚‡¶æÖS¦Æ&VÂÇ66÷&S¦çVÆÂÆÖƒ¦çVÆÇÒ“²G&r‚“°¢f"FFVBÒ&÷w2æÆ7DVÆVÖVçD6†–ÆC²FFVBçVW'•6VÆV7F÷"†Æ&VÂòu¶FF×BÖf–VÆCÒ'66÷&R%Òr¢v–çWBr’æfö7W2‚“°¢Ğ¢&÷‚çVW'•6VÆV7F÷"‚rçBÖFBr’æöæ6Æ–6²ÒgVæ7F–öâ‚’²FB‚rr“²Ó°¢&÷‚çVW'•6VÆV7F÷"‚rçB×&W6WBr’æöæ6†ævRÒgVæ7F–öâ‚’²f"Æ&VÂÒF†—2çfÇVS²F†—2çfÇVRÒrs²–b†Æ&VÂ’FB†Æ&VÂ“²Ó°¢&÷‚çVW'•6VÆV7F÷"‚rçB×W6Rr’æöæ6Æ–6²ÒgVæ7F–öâ‚’°¢G'’°¢f"7VÒÒÖöFVÂçfÆ–FFR†ÖöFVÂæ6ÆVâ†G&gE¶æÖUÒ’ÇfÇVR†6&BÂrç&vÖ‚×cbr’ÆçVÆÂ“°¢–b‚7VÒæ6ö×ÆWFRÇÂÖF‚æ'2‡7VÒæÖ‚ÒfÇVR†6&BÂrç&vÖ‚×cbr’’âã’&WGW&ã°¢f"–çWBÒ6&BçVW'•6VÆV7F÷"‚rç&r×cbr“²–çWBçfÇVRÒ7VÒç66÷&S²–çWBæF—7F6„WfVçB†æWrWfVçB‚v–çWBrÇ¶'V&&ÆW3§G'VWÒ’“°¢–b‡fÇVR†6&BÂræÖ‚×cbr’ÓÓÒ7VÒæÖ‚bbfÇVR†6&BÂræ7GVÂ×cbr’ÓÓÒçVÆÂ’²f"f–æÂÒ6&BçVW'•6VÆV7F÷"‚ræ7GVÂ×cbr“²f–æÂçfÇVRÒ7VÒç66÷&S²f–æÂæF—7F6„WfVçB†æWrWfVçB‚v–çWBrÇ¶'V&&ÆW3§G'VWÒ’“²Ğ¢WFFR‚“°¢Ò6F6‚†R’²Fö7B†RæÖW76vR“²Ğ¢Ó°¢6&BæFDWfVçDÆ—7FVæW"‚v–çWBrÆgVæ7F–öâ†R’²–b‚&÷‚æ6öçF–ç2†RçF&vWB’’WFFR‚“²Ò“°¢&÷‚å÷&Vg&W6‚ÒG&s²G&r‚“°¢Ğ¢gVæ7F–öâFV6÷&FR†ÖöFÂ’²ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræW†Ò×7V&¦V7BÖ6&B×cr’æf÷$V6‚†gVæ7F–öâ†6&B’²Ö÷VçB†ÖöFÂÆ6&B“²Ò“²Ğ¢f"&Vf÷&T÷VâÒ÷VäW†Ó°¢÷VäW†ÒÒgVæ7F–öâ†W†Ò’°¢f"&W7VÇBÒ&Vf÷&T÷VâæÇ’‡F†—2Æ&wVÖVçG2’ÂÖöFÂÒ7FFRæÖöFÃ°¢–b‚ÖöFÂÇÂÖöFÂçVW'•6VÆV7F÷"‚r6W†Õ7V&¦V7G5cbr’ÇÂÖöFÂå÷VW7F–öåG—TG&gB’&WGW&â&W7VÇC°¢ÖöFÂå÷VW7F–öåG—TG&gBÒö&¦V7Bæ76–vâ„ö&¦V7Bæ7&VFR†çVÆÂ’Â¥4ôâç'6R„¥4ôâç7G&–æv–g’†W†ÒbbW†ÒçVW7F–öå÷G—U÷66÷&W2ÇÂ·Ò’’“°¢ÖöFÂå÷VW7F–öåG—TW†ÒÒ7G&–ær†W†ÒbbW†Òæ–BÇÂrr“²ÖöFÂå÷VW7F–öåG—T÷væW"Ò7FFRçFö¶Vã°¢FV6÷&FR†ÖöFÂ“°¢f"ö'6W'fW"ÒæWr×WFF–öäö'6W'fW"†gVæ7F–öâ‚’²–b‚ÖöFÂæ—46öææV7FVB’²ö'6W'fW"æF—66öææV7B‚“²&WGW&ã²ÒFV6÷&FR†ÖöFÂ“²Ò“°¢ö'6W'fW"æö'6W'fR†ÖöFÂçVW'•6VÆV7F÷"‚r6W†Õ7V&¦V7G5cbr’Ç¶6†–ÆDÆ—7C§G'VRÇ7V'G&VS§G'VWÒ“°¢&WGW&â&W7VÇC°¢Ó°¢f"&Vf÷&T’ÒFF•cs°¢FF•crÒgVæ7F–öâ†7F–öâÇ–ÆöB’°¢f"ÖöFÂÒ7FFRæÖöFÃ°¢–b†7F–öâÓÓÒw6fUöW†Òrbb–ÆöBbb–ÆöBæW†ÒbbÖöFÂbbÖöFÂå÷VW7F–öåG—TG&gBbbÖöFÂå÷VW7F–öåG—TW†ÒÓÓÒ7G&–ær‡–ÆöBæW†Òæ–BÇÂrr’’°¢–b†ÖöFÂå÷VW7F–öåG—T÷væW"ÓÒ7FFRçFö¶Vâ’F‡&÷ræWrW'&÷"‚~‹JnXû~[{.Xˆ~hÚ.ûÈÎŠû~˜xŞikh™>[Èˆ>ŠùRr“°¢f"ÖÒö&¦V7Bæ7&VFR†çVÆÂ’Â6÷VçBÒ°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræW†Ò×7V&¦V7BÖ6&B×cr’æf÷$V6‚†gVæ7F–öâ†6&B’°¢f"æÖRÒ6&DæÖR†6&B“°¢G'’°¢f"&÷w2ÒÖöFVÂæ6ÆVâ†ÖöFÂå÷VW7F–öåG—TG&gE¶æÖUÒÇÂµÒÆæÖR“°¢ÖöFVÂçfÆ–FFR‡&÷w2ÇfÇVR†6&BÂrç&vÖ‚×cbr’Ç&u66÷&R†6&B’“°¢–b‡&÷w2æÆVæwF‚’²Ö¶æÖUÒÒ&÷w3²6÷VçB³Ò&÷w2æÆVæwFƒ²Ğ¢Ò6F6‚†R’²f"&÷‚Ò6&BçVW'•6VÆV7F÷"‚rçBÖVF—F÷"r“²&÷‚æ÷VâÒG'VS²&÷‚çVW'•6VÆV7F÷"‚rçB×7FGW2r’çFW‡D6öçFVçBÒRæÖW76vS²&÷‚çVW'•6VÆV7F÷"‚rçB×7FGW2r’æ6Æ74Æ—7BæFB‚wBÖW'&÷"r“²&÷‚ç67&öÆÄ–çFõf–Wr‡¶&Æö6³¢v6VçFW"wÒ“²F‡&÷rS²Ğ¢Ò“°¢–ÆöBÒö&¦V7Bæ76–vâ‡·ÒÇ–ÆöBÇ¶W†Ó¤ö&¦V7Bæ76–vâ‡·ÒÇ–ÆöBæW†ÒÇ·VW7F–öå÷G—U÷66÷&W3¦ÖÒ—Ò“°¢&WGW&â&öÖ—6Rç&W6öÇfR†&Vf÷&T’æ6ÆÂ‡F†—2Æ7F–öâÇ–ÆöB’’çF†Vâ†gVæ7F–öâ‡"’²–b†6÷VçB’G&6²‚wVW7F–öå÷G—U÷66÷&W5÷6fVBrÇ·7V&¦V7Eö6÷VçC¤ö&¦V7Bæ¶W—2†Ö’æÆVæwF‚ÇG—Uö6÷VçC¦6÷VçGÒ“²&WGW&â#²Ò“°¢Ğ¢&WGW&â&Vf÷&T’æ6ÆÂ‡F†—2Æ7F–öâÇ–ÆöB“°¢Ó°¢gVæ7F–öâÇ’†ÖöFÂÂ6&BÂ&÷w2’°¢–b‚ÖöFÂå÷VW7F–öåG—TG&gBÇÂÖöFÂå÷VW7F–öåG—T÷væW"ÓÒ7FFRçFö¶Vâ’F‡&÷ræWrW'&÷"‚~Šû~˜xŞikh™>[Èˆ>Šù^[Ù^XZ^Š‚r“°¢f"æÖRÒ6&DæÖR†6&B’Â–æ6öÖ–ærÒÖöFVÂæ6ÆVâ‡&÷w2ÆæÖR’Â7W'&VçBÒ¥4ôâç'6R„¥4ôâç7G&–æv–g’†ÖöFÂå÷VW7F–öåG—TG&gE¶æÖUÒÇÂµÒ’“°¢òò&V6övæ—F–öâf–ÆÇ2Ö—76–ær6VÆÇ2öæÇ“²W†—7F–ærÖçVÂÖ&·2Çv—2v–âà¢–æ6öÖ–æræf÷$V6‚†gVæ7F–öâ‡"’²f"f÷VæBÒ7W'&VçBæf–æB†gVæ7F–öâ‡‚’²&WGW&âÖöFVÂæ¶W’‡‚’ÓÓÒÖöFVÂæ¶W’‡"“²Ò“²–b‚f÷VæB’7W'&VçBçW6‚‡"“²VÇ6R²w66÷&RrÂvÖ‚rÂw÷6—F–öârÂvF–ff–7VÇG’rÂv6W6RuÒæf÷$V6‚†gVæ7F–öâ†¶W’’²–b†f÷VæE¶¶W•ÒÓÒçVÆÂÇÂf÷VæE¶¶W•ÒÓÓÒrr’–b‡%¶¶W•ÒÒçVÆÂ’f÷VæE¶¶W•ÒÒ%¶¶W•Ó²Ò“²Ò“°¢–b†7W'&VçBæÆVæwF‚â3’F‡&÷ræWrW'&÷"‚~Y[›nYîš)Yè¾‹h^‹ør3šûÈÎŠû~Xˆnh›jZû’r“°¢ÖöFÂå÷VW7F–öåG—TG&gE¶æÖUÒÒ7W'&VçC²Ö÷VçB†ÖöFÂÆ6&B“²f"&÷‚Ò6&BçVW'•6VÆV7F÷"‚rçBÖVF—F÷"r“²&÷‚æ÷VâÒG'VS²&÷‚å÷&Vg&W6‚‚“°¢&WGW&â–æ6öÖ–æræÆVæwFƒ°¢Ğ¢gVæ7F–öâFW‡B†W†ÒÂ7V&¦V7B’²&WGW&â‚†W†ÒçVW7F–öå÷G—U÷66÷&W2ÇÂ·Ò•·7V&¦V7EÒÇÂµÒ’æÖ†gVæ7F–öâ‡"’²&WGW&âÖöFVÂæÆ&VÂ‡"’²rr²f×B‡"ç66÷&R’²ròr²f×B‡"æÖ‚’²‡"æF–ff–7VÇG’ò~ûÈ‚r²ÖöFVÂæF–ff–7VÇF–W5·"æF–ff–7VÇG•Ò²~ûÈ’r¢rr’²‡"æ6W6Ròr+rr²ÖöFVÂæ6W6W5·"æ6W6UÒ¢rr“²Ò’æ¦ö–â‚~ûÉ²r“²Ğ¢gVæ7F–öâFWF–Â†W†Ò’°¢f"ÖÒW†ÒçVW7F–öå÷G—U÷66÷&W2ÇÂ·ÒÂæÖW2Òö&¦V7Bæ¶W—2†W†Òç66÷&W2ÇÂ·Ò’æf–ÇFW"†gVæ7F–öâ†æÖR’²&WGW&â'&’æ—4'&’†Ö¶æÖUÒ’bbÖ¶æÖUÒæÆVæwFƒ²Ò“°¢–b‚æÖW2æÆVæwF‚’&WGW&ârs°¢&WGW&âsÆF—b6Æ73Ò'BÖFWF–Â#ãÆƒ3îš)Yè¾[é~XˆcÂöƒ3ãÇ6Æ73Ò'BÖ†VÇ#îXÛ~™Ú.XéşZx¾Xˆb+rXú®{¹şŠê[{.[Ù^XZ^y¨Nš)Yè³Â÷ãÆF—b6Æ73Ò'BÖFWF–ÂÖw&–B#âr²æÖW2æÖ†gVæ7F–öâ†æÖR’²&WGW&âsÆ'F–6ÆSãÆƒCâr²W62†æÖR’²sÂöƒCâr²Ö¶æÖUÒæÖ†gVæ7F–öâ‡"’²f"&FRÒ"ç66÷&RÒçVÆÂbb"æÖ‚âòÖF‚ç&÷VæB‡"ç66÷&R÷"æÖ‚£’ó¢çVÆÃ²&WGW&âsÆF—b6Æ73Ò'BÖFWF–Â×&÷r#ãÇ7ãâr²W62†ÖöFVÂæÆ&VÂ‡"’’²‡"æF–ff–7VÇG’òsÇ6ÖÆÂ6Æ73Ò'BÖF–ff–7VÇG’#âr²ÖöFVÂæF–ff–7VÇF–W5·"æF–ff–7VÇG•Ò²sÂ÷6ÖÆÃâr¢rr’²sÂ÷7ããÆ#âr²W62†f×B‡"ç66÷&R’’²rÇ6ÖÆÃâòr²W62†f×B‡"æÖ‚’’²sÂ÷6ÖÆÃãÂö#ãÇ6ÖÆÃâr²‡&FRÓÒçVÆÂò~[è^Š^XZ‚r¢&FR²rRr’²sÂ÷6ÖÆÃãÂöF—câs²Ò’æ¦ö–â‚rr’²sÂö'F–6ÆSâs²Ò’æ¦ö–â‚rr’²sÂöF—cãÂöF—câs°¢Ğ¢v–æF÷rå66÷&UVW7F–öåG—W2Ò²Ç“¦Ç’ÂFWF–Ã¦FWF–ÂÂFW‡C§FW‡BÓ°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“°¢7G–ÆRçFW‡D6öçFVçBÒrçBÖVF—F÷'¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–â×F÷£gƒ·FF–ær×F÷£G‡ÒçBÖVF—F÷"7VÖÖ'—¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ¶7W'6÷#§ö–çFW#·FF–æs£7‚¶föçB×6—¦S£Gƒ¶Æ—7B×7G–ÆS¦æöæWÒçBÖVF—F÷"7VÖÖ'“£¢×vV&¶—BÖFWF–Ç2ÖÖ&¶W'¶F—7Æ“¦æöæWÒçBÖVF—F÷"7VÖÖ'’6ÖÆÂÂçB×7VÖÖ'—¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£CÒçBÖVF—F÷"7VÖÖ'’6ÖÆÇ¶Ö&v–âÖÆVgC£g‡ÒçBÖVF—F÷"7VÖÖ'“¦gFW'¶6öçFVçC¢.ûÈ²#¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçBÖVF—F÷%¶÷VåÓç7VÖÖ'“¦gFW'¶6öçFVçC¢.(‰"'ÒçB×7VÖÖ'—¶Ö&v–âÖÆVgC¦WF÷ÒçBÖ†VÇ¶föçB×6—¦S£7‚–×÷'FçC¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãs¶Ö&v–ã£G‡ÒçB×&÷w7¶F—7Æ“¦w&–C¶v£'‡ÒçB×&÷w¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒ‚ÃãVg"’Ö–æÖ‚ƒcW‚Ãg"’Ö–æÖ‚ƒcW‚Ãg"’3'ƒ¶v£—ƒ¶Æ–vâÖ—FV×3¦VæGÒçB×&÷rÆ&VÇ¶Ö–â×v–GFƒ£¶F—7Æ“¦w&–C¶v£Wƒ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçB×&÷r–çWBÂçB×FööÆ&"6VÆV7G¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ·v–GFƒ£S¶Ö–â×v–GFƒ£¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚ÒÖ–çWBÖ&rÇf"‚Ò×æVÂ×6öÆ–BÂ6ffb’“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—C¶föçB×6—¦S£Gƒ¶Ö–âÖ†V–v‡C£C'ƒ·FF–æs£—‡ÒçB×&÷r'WGFöâÂçB×FööÆ&"'WGFöâÂçB×W6W¶föçC¦–æ†W&—C¶föçB×6—¦S£7ƒ¶Ö–âÖ†V–v‡C£Cƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡B“·FF–æs£‡‚ƒ¶7W'6÷#§ö–çFW'ÒçB×&÷rçB×&VÖ÷fW·FF–æs£¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£#‡ÒçB×FööÆ&'¶F—7Æ“¦fÆWƒ¶v£ƒ¶fÆW‚×w&§w&¶Ö&v–â×F÷£G‡ÒçB×FööÆ&"Æ&VÇ¶fÆWƒ£¶Ö–â×v–GFƒ£3‡ÒçB×FööÆ&"'WGFöç¶fÆWƒ£·v†—FR×76S¦æ÷w&ÒçB×7FGW7¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãs¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£7‡ÒçBÖW'&÷'¶6öÆ÷#§f"‚ÒÖFævW"’–×÷'FçGÒçB×W6W¶Ö&v–â×F÷£ƒ¶6öÆ÷#§f"‚ÒÖ66VçB—ÒçB×W6U¶†–FFVå×¶F—7Æ“¦æöæR–×÷'FçGÒçB×7'·÷6—F–öã¦'6öÇWFS·v–GFƒ£ƒ¶†V–v‡C£ƒ¶÷fW&fÆ÷s¦†–FFVã¶6Æ—×Fƒ¦–ç6WBƒSR—ÒçBÖVF—F÷"¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£'‡ÒçBÖFWF–Ç¶Ö&v–â×F÷£#gƒ·FF–ær×F÷£#'ƒ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—ÒçBÖFWF–Âƒ7¶föçB×6—¦S£‡ƒ¶Ö&v–ã£‡‡ÒçBÖFWF–ÂÖw&–G¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£#G‡ÒçBÖFWF–ÂƒG¶föçB×6—¦S£Wƒ¶Ö&v–ã£g‡ÒçBÖFWF–Â×&÷w¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃg"’WFòcGƒ¶v£'ƒ¶Æ–vâÖ—FV×3¦6VçFW#·FF–æs£'‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶föçB×6—¦S£Gƒ¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒçBÖFWF–Â×&÷sç7ç¶÷fW&fÆ÷r×w&¦ç—v†W&WÒçBÖFWF–Â×&÷r'¶föçB×vV–v‡C£cÒçBÖFWF–Â×&÷r6ÖÆÇ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçBÖFWF–Â×&÷sç6ÖÆÇ·FW‡BÖÆ–vã§&–v‡GÔÖVF–†Ö‚×v–GFƒ£c#‚—²çBÖFWF–ÂÖw&–G¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'ÒçB×&÷w¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃg"’Ö–æÖ‚ƒÃg"’3gƒ¶v£—‡ÒçB×&÷rçBÖæÖW¶w&–BÖ6öÇVÖã£ó7ÒçB×&÷rçB×&VÖ÷fW¶w&–BÖ6öÇVÖã£3¶w&–B×&÷s£ó3¶Æ–vâ×6VÆc¦6VçFW'ÒçB×&÷w·FF–ærÖ&÷GFöÓ£Gƒ¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—ÒçB×&÷rÆ&VÃ¦çF‚Ö6†–ÆBƒ"—¶w&–BÖ6öÇVÖã£¶w&–B×&÷s£'ÒçB×&÷rÆ&VÃ¦çF‚Ö6†–ÆBƒ2—¶w&–BÖ6öÇVÖã£#¶w&–B×&÷s£'ÒçB×&÷r–çWG¶föçB×6—¦S£g‡×Òs°¢7G–ÆRçFW‡D6öçFVçB³ÒrçB×&÷r6VÆV7G·v–GFƒ£S¶Ö–â×v–GFƒ£¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶Ö–âÖ†V–v‡C£C'ƒ·FF–æs£‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚ÒÖ–çWBÖ&rÇf"‚Ò×æVÂ×6öÆ–BÂ6ffb’“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—C¶föçB×6—¦S£7‡ÒçB×&÷rçBÖÖWF¶w&–BÖ6öÇVÖã£òÓÒçBÖÖWFç7VÖÖ'—·FF–æs£G‚ƒ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶§W7F–g’Ö6öçFVçC¦fÆW‚×7F'GÒçBÖÖWFç7VÖÖ'“¦gFW'¶Ö&v–âÖÆVgC¦WFó¶6öçFVçC¢.ûÈ²'ÒçBÖÖWF¶÷VåÓç7VÖÖ'“¦gFW'¶6öçFVçC¢.(‰"'ÒçBÖÖWFæF—g¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£—‡ÒçBÖÖWFçBÖ†VÇ¶Ö&v–ã£‡‚¶föçB×6—¦S£'‚–×÷'FçGÒçBÖF–ff–7VÇG—¶F—7Æ“¦&Æö6³¶Ö&v–â×F÷£7‡ÔÖVF–†Ö‚×v–GFƒ£c#‚—²çBÖÖWFæF—g¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’—ÒçBÖÖWFæF—cæÆ&VÃ¦f—'7BÖ6†–ÆG¶w&–BÖ6öÇVÖã£òÓÒçB×&÷rçBÖÖWFÆ&VÇ¶w&–BÖ6öÇVÖã¦WFó¶w&–B×&÷s¦WF÷ÒçB×&÷r6VÆV7G¶föçB×6—¦S£g‡×Òs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒVW7F–öâ×G—RÖæÇ—6—2ÖÖöFVÂæ§2ÓÓÓÓÒ¢ğ¢ò¢FWFW&Ö–æ—7F–2Â–ç7V7F&ÆR7FF—7F–72÷fW"÷F–öæÂ&r×66÷&R'&V¶F÷vç2â¢ğ¢†gVæ7F–öâ‡&ö÷B’°¢wW6R7G&–7Bs°¢gVæ7F–öâçVÒ‡b’²–b‡bÓÒçVÆÂÇÂbÓÓÒrrÇÂ²vçVÖ&W"rÂw7G&–æruÒæ–æ6ÇVFW2‡G—Vöbb’ÇÂ‡G—VöbbÓÓÒw7G&–ærrbbbçG&–Ò‚’’’&WGW&âçVÆÃ²f"ãÔçVÖ&W"‡b“²&WGW&âçVÖ&W"æ—4f–æ—FR†â’bbâãÒòâ¢çVÆÃ²Ğ¢gVæ7F–öâ&F–ò‡ö–çG2’²f"Öƒ×ö–çG2ç&VGV6R†gVæ7F–öâ‡2Ç—·&WGW&â2·æÖƒ·ÒÃ“²&WGW&âÖ‚òö–çG2ç&VGV6R†gVæ7F–öâ‡2Ç—·&WGW&â2·ç66÷&S·ÒÃ’öÖ‚¢çVÆÃ²Ğ¢gVæ7F–öâ6‡&öæöÆöv–6Â†Æ"’²&WGW&â7G&–ær†æW†ÕöFFWÇÂrr’æÆö6ÆT6ö×&R…7G&–ær†"æW†ÕöFFWÇÂrr’’ÇÂ7G&–ær†æ7&VFVEöGÇÂrr’æÆö6ÆT6ö×&R…7G&–ær†"æ7&VFVEöGÇÂrr’’ÇÂ7G&–ær†æ–GÇÂrr’æÆö6ÆT6ö×&R…7G&–ær†"æ–GÇÂrr’“²Ğ¢gVæ7F–öâ7V&¦V7DÖ&²†RÂ7V&¦V7B’°¢f"#Ò†Rç66÷&W7ÇÇ·Ò•·7V&¦V7E×ÇÇ·ÒÂÖƒÖçVÒ‡"ç&tÖ‚’Â66÷&SÖçVÒ‡"ç&r“°¢–b†ÖƒÓÓÖçVÆÂ’ÖƒÖçVÒ‡"æÖ‚“°¢–b‡66÷&SÓÓÖçVÆÂbbÖƒÓÓÖçVÒ‡"æÖ‚’’66÷&SÖçVÒ‡"æ7GVÂ“°¢&WGW&âÖƒãbb66÷&RÓÖçVÆÂbb66÷&SÃÖÖ‚ò·66÷&S§66÷&RÆÖƒ¦Ö‡Ò¢çVÆÃ°¢Ğ¢gVæ7F–öâw&÷W¶W’‡"Âw&÷W’²&WGW&â¥4ôâç7G&–æv–g’…·"ææÖRçG&–Ò‚’Âw&÷WÓÓÒw÷6—F–öârò‡"ç÷6—F–öçÇÂrr’çG&–Ò‚’¢ruÒ“²Ğ¢gVæ7F–öâæÇ—¦R‡6÷W&6RÂ÷F–öç2’°¢f"óÖ÷F–öç7ÇÇ·ÒÂ7V&¦V7CÖòç7V&¦V7BÂ6VVãÖæWr6WB‚“°¢f"W†×3Ò‡6÷W&6WÇÅµÒ’æf–ÇFW"†gVæ7F–öâ†R—°¢–b‚RÇÂö&¦V7Bç&÷F÷G—Ræ†4÷vå&÷W'G’æ6ÆÂ†Rç66÷&W7ÇÇ·ÒÇ7V&¦V7B’ÇÂ‚òæ–æ6ÇVFT†–FFVâbbRæ—5ö†–FFVâ’’&WGW&âfÇ6S°¢–b†òæ6FVv÷'’ÒçVÆÂbbòæ6FVv÷'’ÓÒr¢rbb†Ræw&FUöÆWfVÇÇÂrr’ÓÖòæ6FVv÷'’’&WGW&âfÇ6S°¢–b†Ræ–Bbb6VVâæ†2…7G&–ær†Ræ–B’’—&WGW&âfÇ6S¶–b†Ræ–B—6VVâæFB…7G&–ær†Ræ–B’“·&WGW&âG'VS°¢Ò’ç6Æ–6R‚’ç6÷'B†6‡&öæöÆöv–6Â“°¢–b„çVÖ&W"†òæÆ–Ö—B“ã’W†×3ÖW†×2ç6Æ–6R‚ÔçVÖ&W"†òæÆ–Ö—B’“°¢f"w&÷W3ÖæWrÖ‚’Â–æ6ö×ÆWFSÓÂ–çfÆ–CÓÂ&V6÷&FVCÓÂ6÷fW&vTÖƒÓÂ7V&¦V7DÖƒÓÂ6÷fW&vTW†×3Ó°¢W†×2æf÷$V6‚†gVæ7F–öâ†RÆ–æFW‚—°¢f"&÷w3Ò†RçVW7F–öå÷G—U÷66÷&W7ÇÇ·Ò•·7V&¦V7EÒÂ6VÆÇ3ÖæWrÖ‚“°¢–b‚'&’æ—4'&’‡&÷w2’—&÷w3ÕµÓ°¢–b‡&÷w2æÆVæwF‚—&V6÷&FVB²³°¢f"–FVçF—F–W3ÖæWr6WB‚’ÂæÖW5v—F…F÷FÃÖæWr6WB‡&÷w2æf–ÇFW"†gVæ7F–öâ‡"—·&WGW&â"bgG—Vöb"ææÖSÓÓÒw7G&–ærrbb"ç÷6—F–öã·Ò’æÖ†gVæ7F–öâ‡"—·&WGW&â"ææÖRçG&–Ò‚“·Ò’“°¢&÷w2æf÷$V6‚†gVæ7F–öâ‡"—°¢–b‚"ÇÂG—Vöb"ææÖRÓÒw7G&–ærrÇÂ"ææÖRçG&–Ò‚’ÇÂ‡"ç÷6—F–öâÖçVÆÂbgG—Vöb"ç÷6—F–öâÓÒw7G&–ærr’—¶–çfÆ–B²³·&WGW&ã·Ğ¢f"–CÖw&÷W¶W’‡"Âw÷6—F–öâr“°¢–b†–FVçF—F–W2æ†2†–B’ÇÂ‡"ç÷6—F–öâbbæÖW5v—F…F÷FÂæ†2‡"ææÖRçG&–Ò‚’’’—¶–çfÆ–B²³·&WGW&ã·Ö–FVçF—F–W2æFB†–B“°¢f"¶W“Öw&÷W¶W’‡"Æòæw&÷W’ÂæÖS×"ææÖRçG&–Ò‚“°¢–b‚w&÷W2æ†2†¶W’’–w&÷W2ç6WB†¶W’Ç¶¶W“¦¶W’ÆæÖS¦æÖRÇ÷6—F–öã¦òæw&÷WÓÓÒw÷6—F–öâsò‡"ç÷6—F–öçÇÂrr’çG&–Ò‚“¢rrÆ6VÆÇ3¦æWr'&’†W†×2æÆVæwF‚’æf–ÆÂ†çVÆÂ—Ò“°¢–b‚6VÆÇ2æ†2†¶W’’–6VÆÇ2ç6WB†¶W’Ç·66÷&S£ÆÖƒ£Æ6ö×ÆWFS§G'VRÆF–ff–7VÇF–W3¥µÒÆ6W6W3¥µÒÇ'G3£Ò“°¢f"3Ö6VÆÇ2ævWB†¶W’’Â66÷&SÖçVÒ‡"ç66÷&R’ÂÖƒÖçVÒ‡"æÖ‚“°¢2ç'G2²³°¢f"fÆ–C×66÷&RÓÖçVÆÂbfÖƒãbg66÷&SÃÖÖƒ°¢–b‚fÆ–B—¶2æ6ö×ÆWFSÖfÇ6S¶–æ6ö×ÆWFR²³·ÖVÇ6W¶2ç66÷&R³×66÷&S¶2æÖ‚³ÖÖƒ·Ğ¢–b…²vV7’rÂvÖVF—VÒrÂv†&BuÒæ–æ6ÇVFW2‡"æF–ff–7VÇG’’–2æF–ff–7VÇF–W2çW6‚‡"æF–ff–7VÇG’“°¢–b…²v¶æ÷vÆVFvRrÂvÖWF†öBrÂv6&VÆW72rÂwF–ÖRuÒæ–æ6ÇVFW2‡"æ6W6R’–2æ6W6W2çW6‚‡"æ6W6R“°¢Ò“°¢6VÆÇ2æf÷$V6‚†gVæ7F–öâ†2Æ¶W’—¶2ç&FSÖ2æ6ö×ÆWFSö2ç66÷&Rö2æÖƒ¦çVÆÃ¶2æ–æFWƒÖ–æFWƒ¶w&÷W2ævWB†¶W’’æ6VÆÇ5¶–æFW…ÓÖ3·Ò“°¢f"#Ò†Rç66÷&W7ÇÇ·Ò•·7V&¦V7E×ÇÇ·ÒÂ&tÖƒÖçVÒ‡"ç&tÖ‚“¶–b‡&tÖƒÓÓÖçVÆÂ—&tÖƒÖçVÒ‡"æÖ‚“°¢–b‡&tÖƒã—¶6÷fW&vTW†×2²³·7V&¦V7DÖ‚³×&tÖƒ¶6÷fW&vTÖ‚³ÔÖF‚æÖ–â‡&tÖ‚Ä'&’æg&öÒ†6VÆÇ2çfÇVW2‚’’æf–ÇFW"†gVæ7F–öâ†2—·&WGW&â2æ6ö×ÆWFS·Ò’ç&VGV6R†gVæ7F–öâ‡2Æ2—·&WGW&â2¶2æÖƒ·ÒÃ’“·Ğ¢Ò“°¢f"&÷w3Ô'&’æg&öÒ†w&÷W2çfÇVW2‚’’ÂF÷FÄÆ÷7CÓÂF÷FÅ66÷&SÓÂF÷FÄÖƒÓ°¢&÷w2æf÷$V6‚†gVæ7F–öâ†r—°¢f"fÆ–CÖræ6VÆÇ2æf–ÇFW"†gVæ7F–öâ†2—·&WGW&â2bf2æ6ö×ÆWFS·Ò’ÂÆ7C×fÆ–Bç6Æ–6R‚Ó2’Â†ÆcÔÖF‚æÖ–âƒ2ÄÖF‚æfÆö÷"‡fÆ–BæÆVæwF‚ó"’“°¢ræ6÷VçC×fÆ–BæÆVæwFƒ¶rç66÷&S×fÆ–Bç&VGV6R†gVæ7F–öâ‡2Æ2—·&WGW&â2¶2ç66÷&S·ÒÃ“¶ræÖƒ×fÆ–Bç&VGV6R†gVæ7F–öâ‡2Æ2—·&WGW&â2¶2æÖƒ·ÒÃ“°¢ræÆ÷7CÖræÖ‚Örç66÷&S¶rç&FSÖræÖƒörç66÷&RöræÖƒ¦çVÆÃ¶ræÆ÷75&FSÖrç&FSÓÓÖçVÆÃöçVÆÃ£Örç&FS°¢ræÆ÷746÷VçC×fÆ–Bæf–ÇFW"†gVæ7F–öâ†2—·&WGW&â2ç66÷&SÆ2æÖ‚Óã·Ò’æÆVæwFƒ¶ræg&WVVæ7“Öræ6÷VçCöræÆ÷746÷VçBöræ6÷VçC¦çVÆÃ°¢rç&V6VçE&FS×&F–ò†Æ7B“¶rç&V6VçDÆ÷746÷VçCÖÆ7Bæf–ÇFW"†gVæ7F–öâ†2—·&WGW&â2ç66÷&SÆ2æÖ‚Óã·Ò’æÆVæwFƒ°¢ræÆFW7C×fÆ–BæB‚Ó—ÇÆçVÆÃ°¢òòBÆV7BGvòö'6W'fF–öç2–âV6‚æöâÖ÷fW&Æ–ærv–æF÷s²Ö—76–ærVçG&–W2Fòæ÷B&V6öÖR¦W&öW2à¢rçG&VæD6÷VçC×fÆ–BæÆVæwFƒãÓCö†Æc£°¢rçG&VæE&FSÖrçG&VæD6÷VçC÷&F–ò‡fÆ–Bç6Æ–6R‚Ö†Æb’“¦çVÆÃ°¢rç&Wf–÷W5&FSÖrçG&VæD6÷VçC÷&F–ò‡fÆ–Bç6Æ–6R‚Ö†Æb£"ÂÖ†Æb’“¦çVÆÃ°¢ræ6†ævSÖrçG&VæD6÷VçCörçG&VæE&FRÖrç&Wf–÷W5&FS¦çVÆÃ°¢ræÖ–å&FS×fÆ–BæÆVæwFƒôÖF‚æÖ–â‚ââçfÆ–BæÖ†gVæ7F–öâ†2—·&WGW&â2ç&FS·Ò’“¦çVÆÃ°¢ræÖ…&FS×fÆ–BæÆVæwFƒôÖF‚æÖ‚‚ââçfÆ–BæÖ†gVæ7F–öâ†2—·&WGW&â2ç&FS·Ò’“¦çVÆÃ°¢f"F–cÖÆ7BæfÆDÖ†gVæ7F–öâ†2—·&WGW&â2æF–ff–7VÇF–W3·Ò’Â6W6SÖÆ7BæfÆDÖ†gVæ7F–öâ†2—·&WGW&â2æ6W6W3·Ò“°¢f"F—7F–æ7CÔ'&’æg&öÒ†æWr6WB†F–b’“¶ræF–ff–7VÇG“ÖF—7F–æ7BæÆVæwFƒÓÓÓöF—7F–æ7E³Ó¦F—7F–æ7BæÆVæwFƒòvÖ—†VBs¦çVÆÃ°¢ræF–ff–7VÇG”6÷VçCÖF–bæÆVæwFƒ¶ræF–ff–7VÇG”6ö×ÆWFSÖÆ7BæÆVæwFƒãbfF–bæÆVæwFƒÓÓÖÆ7Bç&VGV6R†gVæ7F–öâ‡2Æ2—·&WGW&â2¶2ç'G3·ÒÃ“°¢òòæWfW"GW&ââVæÆ&VÆÆVB÷'F–öâ–çFò6öæf—&ÖVBV7’ö†&B&V6öÖÖVæFF–öâà¢rç&æ´F–ff–7VÇG“ÖræF–ff–7VÇG”6ö×ÆWFSöræF–ff–7VÇG“¦çVÆÃ°¢ræ6W6T6÷VçG3Ôö&¦V7Bæg&öÔVçG&–W2„'&’æg&öÒ†æWr6WB†6W6R’’æÖ†gVæ7F–öâ†2—·&WGW&â¶2Æ6W6Ræf–ÇFW"†gVæ7F–öâ‡b—·&WGW&âcÓÓÖ3·Ò’æÆVæwF…Ó·Ò’“°¢ræ6W6SÖ6W6RæÆVæwFƒö6W6Rç6÷'B†gVæ7F–öâ†Æ"—·&WGW&â6W6Ræf–ÇFW"†gVæ7F–öâ†2—·&WGW&â3ÓÓÖ#·Ò’æÆVæwF‚Ö6W6Ræf–ÇFW"†gVæ7F–öâ†2—·&WGW&â3ÓÓÖ·Ò’æÆVæwFƒ·Ò•³Ó¦çVÆÃ°¢F÷FÄÆ÷7B³ÖræÆ÷7C·F÷FÅ66÷&R³Örç66÷&S·F÷FÄÖ‚³ÖræÖƒ°¢Ò“°¢f"Ö&·3ÖW†×2ç6Æ–6R‚ÓR’æÖ†gVæ7F–öâ†R—·&WGW&â7V&¦V7DÖ&²†RÇ7V&¦V7B“·Ò’æf–ÇFW"„&ööÆVâ’ÂÆWfVÅ&FS×&F–ò†Ö&·2’ÂF&vWCÖçVÒ†òçF&vWE&FR“°¢–b‡F&vWBÓÖçVÆÂbb‡F&vWCÃÓÇÇF&vWCã’—F&vWCÖçVÆÃ°¢f"ÆFW7E7V&¦V7CÖW†×2æÆVæwFƒò†W†×2æB‚Ó’ç66÷&W7ÇÇ·Ò•·7V&¦V7EÓ¦çVÆÃ°¢–b‡F&vWCÓÓÖçVÆÂbfÆFW7E7V&¦V7B—·f"CÖçVÒ†ÆFW7E7V&¦V7BçF&vWB’ÂÓÖçVÒ†ÆFW7E7V&¦V7BæÖ‚’Â&ÓÖçVÒ†ÆFW7E7V&¦V7Bç&tÖ‚“¶–b‡BÓÖçVÆÂbfÓãbgCÃÖÒbb‡&ÓÓÓÖçVÆÇÇÇ&ÓÓÓÖÒ’—F&vWC×BöÒ£·Ğ¢f"ÆWfVÃÕ²vf÷VæFF–öârÂv&Ææ6VBrÂvGfæ6VBuÒæ–æ6ÇVFW2†òæÆWfVÂ“öòæÆWfVÃ¦ÆWfVÅ&FSÓÓÖçVÆÃòwVæ¶æ÷vâs¦ÆWfVÅ&FSãÓãƒSòvGfæ6VBs¦ÆWfVÅ&FSÃãsòvf÷VæFF–öâs¢v&Ææ6VBs°¢f"Ö„Æ÷73ÔÖF‚æÖ‚ƒÂââç&÷w2æÖ†gVæ7F–öâ†r—·&WGW&âræ6÷VçCöræÆ÷7Böræ6÷VçC£·Ò’“°¢&÷w2æf÷$V6‚†gVæ7F–öâ†r—°¢ræ6öçG&–'WF–öãÖræ6÷VçBbgF÷FÄÆ÷7CãöræÆ÷7B÷F÷FÄÆ÷7C¦çVÆÃ°¢–b‚ræ6÷VçGÇÆræÆ÷7CÃÓ—¶rç&–÷&—G“×·V–6³£Æ'&V·F‡&÷Vvƒ£ÆÆÃ£Ó·&WGW&ã·Ğ¢f"Æ÷73ÖræÆ÷7Böræ6÷VçBöÖ„Æ÷72Âg&WÓãR³ãR¦ræg&WVVæ7’Â&V6VçCÓãB³ãb¢ƒÖrç&V6VçE&FR’ÂfÆÆ–æsÖræ6†ævRÓÖçVÆÂbfræ6†ævSÂÒã3óãS£°¢f"CÖrç&æ´F–ff–7VÇG’ÂV7“×¶V7“£ÆÖVF—VÓ¢ãcRÆ†&C¦ÆWfVÃÓÓÒvGfæ6VBsòã3¢ã'Õ¶E×ÇÂã3RÂ†&C×¶†&C£ÆÖVF—VÓ¢ãSRÆV7“¢ãWÕ¶E×ÇÂã3°¢f"&VF–æW73ÖÆWfVÃÓÓÒvf÷VæFF–öâsòãcS¦ÆWfVÃÓÓÒvGfæ6VBsóã#£°¢–b‡F&vWBÓÖçVÆÂbgF&vWCãÓ“—&VF–æW72£Óã°¢rç&–÷&—G“×·V–6³¦Æ÷72¦V7’¦g&W§&V6VçB¦fÆÆ–ærÆ'&V·F‡&÷Vvƒ¦†&B¤ÖF‚ç7'B†Æ÷72’¦g&W¢‚ãb²ãB¦rç&V6VçE&FR’§&VF–æW72ÆÆÃ¦Æ÷72¦g&W§&V6VçB¦fÆÆ–æwÓ°¢Ò“°¢&WGW&â¶W†×3¦W†×2Ç&÷w3§&÷w2Ç7V&¦V7C§7V&¦V7BÇ&V6÷&FVC§&V6÷&FVBÆ–æ6ö×ÆWFS¦–æ6ö×ÆWFRÆ–çfÆ–C¦–çfÆ–BÇF÷FÄÆ÷7C§F÷FÄÆ÷7BÇ&FS§F÷FÄÖƒ÷F÷FÅ66÷&R÷F÷FÄÖƒ¦çVÆÂÆ6÷fW&vS§7V&¦V7DÖƒö6÷fW&vTÖ‚÷7V&¦V7DÖƒ¦çVÆÂÆ6÷fW&vTW†×3¦6÷fW&vTW†×2ÆÆWfVÃ¦ÆWfVÂÆÆWfVÅ&FS¦ÆWfVÅ&FRÆÆWfVÄ6÷VçC¦Ö&·2æÆVæwF‚ÇF&vWE&FS§F&vWBÇ&V6öÖÖVæFVC¦ÆWfVÃÓÓÒvGfæ6VBwÇÂ‡F&vWCãÓ“bfÆWfVÂÓÒvf÷VæFF–öâr“òv'&V·F‡&÷Vv‚s¦ÆWfVÃÓÓÒvf÷VæFF–öâsòwV–6²s¢vÆÂwÓ°¢Ğ¢gVæ7F–öâ&æ¶VB‡&W7VÇBÇf–Wr—·&WGW&â&W7VÇBç&÷w2ç6Æ–6R‚’ç6÷'B†gVæ7F–öâ†Æ"—·&WGW&â†"ç&–÷&—G•·f–Wu×ÇÃ’Ò†ç&–÷&—G•·f–Wu×ÇÃ—ÇÆ"æÆ÷7BÖæÆ÷7GÇÆææÖRæÆö6ÆT6ö×&R†"ææÖR“·Ò“·Ğ¢f"“×¶æÇ—¦S¦æÇ—¦RÇ&æ¶VC§&æ¶VBÆçVÓ¦çVÒÇ7V&¦V7DÖ&³§7V&¦V7DÖ&²Æw&÷W¶W“¦w&÷W¶W—Ó·&ö÷Bå66÷&UVW7F–öåG—TæÇ—6—4ÖöFVÃÖ“¶–b‡G—VöbÖöGVÆRÓÒwVæFVf–æVBrbfÖöGVÆRæW‡÷'G2–ÖöGVÆRæW‡÷'G3Ö“°§Ò’†vÆö&ÅF†—2“° ¢ò¢ÓÓÓÓÒVW7F–öâ×G—RÖæÇ—6—2æ§2ÓÓÓÓÒ¢ğ¢ò¢Æöæv—GVF–æÂVW7F–öâ×G—RæÇ—6—2Â—6öÆFVBg&öÒ÷fW&ÆÂ66÷&R÷&æ²7FF—7F–72â¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"Ó×v–æF÷rå66÷&UVW7F–öåG—TæÇ—6—4ÖöFVÂÂ×v–æF÷rå66÷&UVW7F–öåG—TÖöFVÃ°¢f"f–Ww3×·V–6³¢~[ú¾˜	şhùXˆbrÆ'&V·F‡&÷Vvƒ¢~š¹Xˆnz¨zBrÆÆÃ¢~XZ™Ú.XˆniéwÓ°¢f"6frÂ66÷VçC°¢f"W63ÖgVæ7F–öâ‡b—·&WGW&âW66T‡FÖÂ…7G&–ær‡cÓÖçVÆÃòrs§b’“·Ó°¢f"f×CÖgVæ7F–öâ‡b—·&WGW&âcÓÖçVÆÃò~(	Bs¥7G&–ær„ÖF‚ç&÷VæB‡b£’ó“·Ó°¢f"7CÖgVæ7F–öâ‡b—·&WGW&âcÓÖçVÆÃò~(	Bs¦f×B‡b£’²rRs·Ó°¢f"ÆWfVÇ3×¶f÷VæFF–öã¢~[zY»®Yû®zrÆ&Ææ6VC¢~z‹>jÚ^hùXØrrÆGfæ6VC¢~Xk.X‹®š¹XˆbrÇVæ¶æ÷vã¢~i¨.{Ë®ZèÎi[Nzyyºîh‰{º’wÓ°¢gVæ7F–öâ6WGF–æw2‚’°¢f"÷væW#Õ7G&–ær‡7FFRçW6W"bg7FFRçW6W"æ–GÇÂrr’²s¢rµ7G&–ær‡7FFRçFö¶VçÇÂrr“°¢–b†66÷VçBÓÖ÷væW"—¶66÷VçCÖ÷væW#¶6fs×·F#¢v÷fW'f–WrrÇ7V&¦V7C¢rrÆ6FVv÷'“¢r¢rÆÆ–Ö—C£Æw&÷W¢wG—RrÆ–æ6ÇVFT†–FFVã¦fÇ6RÇf–Ws¢vÆÂrÇf–Wt6†÷6Vã¦fÇ6RÆÆWfVÃ¢vWFòrÆvöÇ3¤ö&¦V7Bæ7&VFR†çVÆÂ’Ç6VÆV7FVC¢rrÆVæC£Ó·Ğ¢&WGW&â6fs°¢Ğ¢gVæ7F–öâ6÷W&6R‚—·&WGW&â'&’æ—4'&’‡7FFRæÆÄW†×2“÷7FFRæÆÄW†×3¢‡7FFRæW†×7ÇÅµÒ“·Ğ¢gVæ7F–öâ7V&¦V7G2‚—·f"3ÖæWr6WB‚“²‡7FFRç7V&¦V7D6öæf–w7ÇÅµÒ’æf÷$V6‚†gVæ7F–öâ‡"—·2æFB‡"ææÖWÇÇ"“·Ò“·6÷W&6R‚’æf÷$V6‚†gVæ7F–öâ†R—´ö&¦V7Bæ¶W—2†Rç66÷&W7ÇÇ·Ò’æf÷$V6‚†gVæ7F–öâ†â—·2æFB†â“·Ò“·Ò“·&WGW&â'&’æg&öÒ‡2’æf–ÇFW"„&ööÆVâ“·Ğ¢gVæ7F–öâF'2‚—¶–b‡v–æF÷rå66÷&UW$‡V"—&WGW&âv–æF÷rå66÷&UW$‡V"ææf–vF–öâ‚“·f"3×6WGF–æw2‚“·&WGW&âsÆæb6Æ73Ò'F×F'2"&–ÖÆ&VÃÒ.XˆniéXˆn{²#ãÆ'WGFöâG—SÒ&'WGFöâ"FF×F×F#Ò&÷fW'f–Wr"&–×&W76VCÒ"r²†2çF#ÓÓÒv÷fW'f–Wrr’²r#îh‰{ºXˆniéÂö'WGFöããÆ'WGFöâG—SÒ&'WGFöâ"FF×F×F#Ò'G—W2"&–×&W76VCÒ"r²†2çF#ÓÓÒwG—W2r’²r#îš)Yè¾XˆniéÂö'WGFöããÂöæcâs·Ğ¢gVæ7F–öâ÷F–öâ‡bÆÆ&VÂÆ6†÷6Vâ—·&WGW&âsÆ÷F–öâfÇVSÒ"r¶W62‡b’²r"r²…7G&–ær‡b“ÓÓÕ7G&–ær†6†÷6Vâ“òr6VÆV7FVBs¢rr’²sâr¶W62†Æ&VÂ’²sÂö÷F–öãâs·Ğ¢gVæ7F–öâf–VÆB†¶W’ÆÆ&VÂÆ÷F–öç2—·&WGW&âsÆÆ&VÃãÇ7ãâr¶Æ&VÂ²sÂ÷7ããÇ6VÆV7BFF×FÖf–ÇFW#Ò"r¶¶W’²r#âr¶÷F–öç2²sÂ÷6VÆV7CãÂöÆ&VÃâs·Ğ¢gVæ7F–öâF—FÆR†r—·&WGW&ârææÖR²†rç÷6—F–öãòr+rr¶rç÷6—F–öã¦6fræw&÷WÓÓÒw÷6—F–öâsòr+riÊ®j~KØŞ{Úâs¢rr“·Ğ¢gVæ7F–öâF–ff–7VÇG’†r—·&WGW&âræF–ff–7VÇG“ÓÓÒvÖ—†VBsò~™«î[ªnKˆŞKˆs¦ræF–ff–7VÇG“õæF–ff–7VÇF–W5¶ræF–ff–7VÇG•Ò²†ræF–ff–7VÇG”6ö×ÆWFSòrs¢~ûÈ˜:Xˆnj~k:ûÈ’r“¢~™«î[ªn[è^j~k:‚s·Ğ¢gVæ7F–öâ6†ævR†r—·&WGW&âræ6†ævSÓÖçVÆÃò~ˆ{>[	BYË®YîjùN‹è>‹h¾X«òs¤ÖF‚æ'2†ræ6†ævR“ÂãSò~‹ùiÉşYû®iÊÎhÈ[›2s¢†ræ6†ævSãò~hùXØrs¢~Kˆ¾™˜Òr’¶f×B„ÖF‚æ'2†ræ6†ævR’£’²rKŠ®y›îXˆnx+’s·Ğ¢gVæ7F–öâ–çFW'&WFF–öâ†r—°¢–b‚ræ6÷VçB—&WGW&â~[	®izZèÎi[NŠë[Ù^8"s°¢–b†ræ6†ævSÓÓÖçVÆÂ—&WGW&â~yºîX˜Òr¶ræ6÷VçB²rYË®iÈiXŠë[Ù^ûÈÎˆ{>[	BYË®YîjùN‹è>‹ùiÉşXùXÉn8"s°¢&WGW&â~iÈ‹ùr¶rçG&VæD6÷VçB²rYË®[é~Xˆnxèrr·7B†rçG&VæE&FR’²~ûÈÎjÚNX˜Òr¶rçG&VæD6÷VçB²rYË®K‹¢r·7B†rç&Wf–÷W5&FR’²~ûÉ²r¶6†ævR†r’²~8"s°¢Ğ¢gVæ7F–öâææ÷FF–öç2†r—°¢f"Æ&VÇ3Ôö&¦V7Bæ¶W—2†ræ6W6T6÷VçG7ÇÇ·Ò’æÖ†gVæ7F–öâ†²—·&WGW&âæ6W6W5¶µÒ²rr¶ræ6W6T6÷VçG5¶µÒ²riÚs·Ò“°¢&WGW&âÆ&VÇ2æÆVæwFƒöÆ&VÇ2æ¦ö–â‚~8r“¢~iÊ®j~k:ZKXˆnXéşYºs°¢Ğ¢gVæ7F–öâ÷÷'GVæ—F–W2‡"Æ÷&FW&VB—°¢f"VÆ–v–&ÆSÖ÷&FW&VBæf–ÇFW"†gVæ7F–öâ†r—·&WGW&âræ6÷VçBbfræÆ÷7Cãbb†6frçf–WsÓÓÒwV–6²sõ²vV7’rÂvÖVF—VÒuÒæ–æ6ÇVFW2†rç&æ´F–ff–7VÇG’“¦6frçf–WsÓÓÒv'&V·F‡&÷Vv‚sörç&æ´F–ff–7VÇG“ÓÓÒv†&Bs§G'VR“·Ò“°¢f"6æF–FFW3ÖVÆ–v–&ÆRç6Æ–6RƒÃ2’ÆÆVC×·V–6³¢~iú^yÈ¾Yû®z8KŠŞzØ™«î[ªnš)y¨NZKXˆnûÈÎhÈYË®YØ~ZKXˆn8XøŞZHŞzˆ¾[ªnKˆî‹ùiÉşŠxëhé.[¨ş8"rÆ'&V·F‡&÷Vvƒ¢~iú^yÈ¾[{.j~K‹®‹è>™«îy¨Nš)Yè¾ûÈÎ[şXˆnXÎZKXˆnK™şKÉ®{«>XZ^hé.[¨ş8"rÆÆÃ¢~{»ÎY™[şiÉşZKXˆn8X{®xëš)jÊKˆî‹ùiÉşXùXÉnûÈÎ[^zK®[Ù>X˜ŞiÈz¨X{®y¨NKˆš8"wÕ¶6frçf–WuÓ°¢f"7Æ—CÖ6fræw&÷WÓÓÒwG—Rrbg"ç&÷w2ç6öÖR†gVæ7F–öâ†r—·&WGW&âræF–ff–7VÇG“ÓÓÒvÖ—†VBs·Ò“°¢f"V×G“×"ç&÷w2ç6öÖR†gVæ7F–öâ†r—·&WGW&âræ6÷VçBbfræÆ÷7Cã·Ò“ò‡7Æ—Cò~YÎKˆš)Yè¾XÈ^Y
¾KˆŞYÎ™«î[ªny¨NKØŞ{ÚîûÈÎXˆn[ÈYîXúşiú^yÈ¾YNš)Šxë8"s¢~iÊÎŠxnŠy.i¨.iz™«î[ªnj~k:ZèÎi[NK‰NiÈZKXˆny¨Nš)Yè¾ûÈÎXZ˜:i[hÚîK¸ŞXúşYÊKˆ¾ikiú^yÈ¾8"r“§"ç&÷w2ç6öÖR†gVæ7F–öâ†r—·&WGW&âræ6÷VçC·Ò“ò~[{.[Ù^y¨NZèÎi[Nš)Yè¾k*iÈZKXˆn8"s¢~Š^XZ[é~XˆnKˆîkºXˆnYîi‹îzK®i[hÚîŠz>Šû¾8"s°¢&WGW&âsÇ6V7F–öâ6Æ73Ò'FÖ6&B#ãÆF—b6Æ73Ò'F×6V7F–öâÖ†VF–ær#ãÆF—cãÆƒ#î˜xŞx+i[hÚîŠz>Šû³Âöƒ#ãÇâr¶ÆVB²sÂ÷ãÂöF—cãÇ7â6Æ73Ò'F×Fr#âr·f–Ww5¶6frçf–WuÒ²sÂ÷7ããÂöF—câr²†6æF–FFW2æÆVæwFƒòsÆF—b6Æ73Ò'FÖ÷÷'GVæ—F–W2#âr¶6æF–FFW2æÖ†gVæ7F–öâ†rÆ’—·&WGW&âsÆ'F–6ÆSãÇ7â6Æ73Ò'FÖ–æFW‚#ãr²†’³’²sÂ÷7ããÆƒ3âr¶W62‡F—FÆR†r’’²sÂöƒ3ãÆF—b6Æ73Ò'F×Fw2#ãÇ7ãâr¶F–ff–7VÇG’†r’²sÂ÷7ããÇ7ãâr¶ræ6÷VçB²rYË®iÈiXŠë[ÙSÂ÷7ããÂöF—cãÆFÂ6Æ73Ò'FÖ¶W’ÖÖWG&–72#ãÆF—cãÆGCîYË®YØ~ZKXˆcÂöGCãÆFCâr¶f×B†ræÆ÷7Böræ6÷VçB’²sÇ6ÖÆÃâXˆcÂ÷6ÖÆÃãÂöFCãÂöF—cãÆF—cãÆGCîXÚ[{.[Ù^ZKXˆcÂöGCãÆFCâr·7B†ræ6öçG&–'WF–öâ’²sÂöFCãÂöF—cãÂöFÃãÇ6Æ73Ò'F×&VF–ær#âr¶–çFW'&WFF–öâ†r’²sÂ÷ãÇ6Æ73Ò'FÖWf–FVæ6R#âr¶ræÆ÷746÷VçB²ròr¶ræ6÷VçB²rYË®iÈZKXˆb+r{JşŠêZKXˆbr¶f×B†ræÆ÷7B’²rXˆcÆ'#îXènjÊ[é~Xˆnxèrr·7B†ræÖ–å&FR’²~(	2r·7B†ræÖ…&FR’²sÂ÷ãÆFWF–Ç26Æ73Ò'FÖææ÷FF–öç2#ãÇ7VÖÖ'“îiú^yÈ¾iÈ‹ùj~k:ƒÂ÷7VÖÖ'“ãÇîiÈ‹ùiÈZI¢2YË®iÈiXŠë[Ù^ûÉ¢r¶W62†ææ÷FF–öç2†r’’²~8.j~k:iŠş[Ù^XZ^KúhşûÈÎKˆŞKº>Š{;¾{¹ş[{.zîŠêNXéşYº8#Â÷ãÂöFWF–Ç3ãÆ'WGFöâG—SÒ&'WGFöâ"FF×F×6VÆV7CÒ"r¶W62†ræ¶W’’²r#îiú^yÈ¾XènjÊ[é~XˆbÇ7â&–Ö†–FFVãÒ'G'VR#î(isÂ÷7ããÂö'WGFöããÂö'F–6ÆSâs·Ò’æ¦ö–â‚rr’²sÂöF—câs¢sÆF—b6Æ73Ò'FÖV×G’#ãÇâr¶V×G’²sÂ÷âr²‡7Æ—CòsÆ'WGFöâG—SÒ&'WGFöâ"FF×F×÷6—F–öãîhÈš)Yè²²KØŞ{Úîiú^yÈ³Âö'WGFöãâs¢rr’²sÂöF—câr’²sÇ6Æ73Ò'FÖæ÷FR#îK¸^Šz>Šû¾[{.[Ù^i[hÚîûÉ¾YË®YØ~ZKXˆniŠşXènXû.[›>YØ~XÎûÈÎKˆŞzØK¨îXúşhùXˆni[8.X{®xëZKXˆny¨NYË®jÊKˆŞzØK¨î™Iš)i[8#Â÷ãÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâÆ÷B†rÇ"Æ6ö×7B—°¢–b‚r—&WGW&âsÇ6Æ73Ò'FÖV×G’#î˜hºKˆKŠ®š)Yè¾ûÈÎiú^yÈ¾[é~Xˆnxè~XùXÉn8#Â÷âs°¢f"öfg6WCÔÖF‚æÖ‚ƒÇ"æW†×2æÆVæwF‚Ó"’Â6VÆÇ3Öræ6VÆÇ2ç6Æ–6R†öfg6WB’ÂãÖ6VÆÇ2æÆVæwF‚Âv–GFƒÖ6ö×7Có3#£cCÆ†V–v‡CÖ6ö×7Có#£#3ÆÆVgCÓCÇ&–v‡CÓ#ÇF÷Ó#Æ&÷GFöÓÓC#°¢f"ƒÖgVæ7F–öâ†’—·&WGW&âÆVgB²†ãÓÓÓòãS¦’ò†âÓ’’¢‡v–GF‚ÖÆVgB×&–v‡B“·ÒÂ“ÖgVæ7F–öâ‡&FR—·&WGW&âF÷²ƒ×&FR’¢††V–v‡B×F÷Ö&÷GFöÒ“·ÒÂ&öG“Òrs°¢³Âã#RÂãRÂãsRÃÒæf÷$V6‚†gVæ7F–öâ‡b—¶&öG’³ÒsÆÆ–æRƒÒ"r¶ÆVgB²r"“Ò"r·’‡b’²r"ƒ#Ò"r²‡v–GF‚×&–v‡B’²r"“#Ò"r·’‡b’²r"6Æ73Ò'FÖw&–B"óãÇFW‡BƒÒ"r²†ÆVgBÓ‚’²r"“Ò"r²‡’‡b’³B’²r"FW‡BÖæ6†÷#Ò&VæB#âr²‡b£’²rSÂ÷FW‡Câs·Ò“°¢f"&WcÖçVÆÃ°¢6VÆÇ2æf÷$V6‚†gVæ7F–öâ†2Æ’—°¢f"S×"æW†×5¶öfg6WB¶•ÒÇfÆ–CÖ2bf2æ6ö×ÆWFS°¢–b‡fÆ–B—¶–b‡&Wb–&öG’³ÒsÆÆ–æRƒÒ"r·&Wbç‚²r"“Ò"r·&Wbç’²r"ƒ#Ò"r·‚†’’²r"“#Ò"r·’†2ç&FR’²r"6Æ73Ò'FÖÆ–æR"óâs·&Wc×·ƒ§‚†’’Ç“§’†2ç&FR—Ó¶&öG’³ÒsÆ6—&6ÆR7ƒÒ"r·‚†’’²r"7“Ò"r·’†2ç&FR’²r"#Ò#BãR"6Æ73Ò'F×ö–çB#ãÇF—FÆSâr¶W62†RææÖR’²r+rr¶W62†RæW†ÕöFFR’²~ûÉ¢r¶f×B†2ç66÷&R’²ròr¶f×B†2æÖ‚’²~ûÈ‚r·7B†2ç&FR’²~ûÈ“Â÷F—FÆSãÂö6—&6ÆSâs·Ğ¢VÇ6W·&WcÖçVÆÃ¶&öG’³ÒsÇFW‡BƒÒ"r·‚†’’²r"“Ò"r·’‚ã2’²r"FW‡BÖæ6†÷#Ò&Ö–FFÆR#î(	CÂ÷FW‡Câs·Ğ¢–b†ãÃÒ†6ö×7CóC£b—ÇÆ’R†6ö×7Có3£"“ÓÓÓÇÆ“ÓÓÖâÓ–&öG’³ÒsÇFW‡BƒÒ"r·‚†’’²r"“Ò"r²††V–v‡BÓr’²r"FW‡BÖæ6†÷#Ò&Ö–FFÆR#âr¶W62‚†RæW†ÕöFFWÇÂ~iziz^iÉòr’ç6Æ–6RƒR—ÇÂ~iziz^iÉòr’²sÂ÷FW‡Câs°¢Ò“°¢&WGW&âsÇ7fr6Æ73Ò'FÖ6†'B"f–Wt&÷ƒÒ#r·v–GF‚²rr¶†V–v‡B²r"&öÆSÒ&–Ör"&–ÖÆ&VÃÒ"r¶W62‡F—FÆR†r’’²riÈ‹ùr¶â²~YË®[é~Xˆnxè~‹h¾X«şûÉ¾X[~KÙ>Xˆni[ŠxKˆ¾ikXènXû.Š‚#âr¶&öG’²sÂ÷7fsâs°¢Ğ¢gVæ7F–öâ†—7F÷'’‡"Æ÷&FW&VB—°¢f"6VÆV7FVC×"ç&÷w2æf–æB†gVæ7F–öâ†r—·&WGW&âræ¶W“ÓÓÖ6frç6VÆV7FVC·Ò—ÇÆ÷&FW&VE³Ó¶–b‡6VÆV7FVB–6frç6VÆV7FVC×6VÆV7FVBæ¶W“°¢f"VæCÖ6fræVæCãôÖF‚æÖ–â†6fræVæBÇ"æW†×2æÆVæwF‚“§"æW†×2æÆVæwF‚Ç7F'CÔÖF‚æÖ‚ƒÆVæBÓb’ÂW†×3×"æW†×2ç6Æ–6R‡7F'BÆVæB“°¢&WGW&âsÇ6V7F–öâ6Æ73Ò'FÖ6&B"–CÒ'FÖ†—7F÷'’#ãÆF—b6Æ73Ò'F×6V7F–öâÖ†VF–ær#ãÆF—cãÆƒ#îXènjÊ[é~XˆcÂöƒ#ãÇîYÎzyYÎYŞš)Yè¾Zû›ÙûÉ¾kºXˆnXùXÉni{nyÈ¾[é~Xˆnxè~8.KØŞ{Úîy»YÎKˆŞKº>ŠŠù^š)™«î[ªny»YÎ8#Â÷ãÂöF—cãÂöF—cãÆF—b6Æ73Ò'FÖ†—7F÷'’Ö6öçG&öÇ2#âr¶f–VÆB‚vw&÷WrÂ~jùN‹è>Xú>[èBrÆ÷F–öâ‚wG—RrÂ~hÈš)Yè¾k~h²rÆ6fræw&÷W’¶÷F–öâ‚w÷6—F–öârÂ~hÈš)Yè²²KØŞ{ÚârÆ6fræw&÷W’’¶f–VÆB‚w6VÆV7FVBrÂ~‹h¾X«şš)Yè²rÆ÷&FW&VBæÖ†gVæ7F–öâ†r—·&WGW&â÷F–öâ†ræ¶W’ÇF—FÆR†r’Æ6frç6VÆV7FVB“·Ò’æ¦ö–â‚rr’’²sÂöF—cãÆF—b6Æ73Ò'FÖ6†'B×v–FR#âr·Æ÷B‡6VÆV7FVBÇ"ÆfÇ6R’²sÂöF—cãÆF—b6Æ73Ò'FÖ6†'BÖ6ö×7B#âr·Æ÷B‡6VÆV7FVBÇ"ÇG'VR’²sÂöF—cãÇ6Æ73Ò'FÖæ÷FR#îh©{«şi‹îzK®iÈ‹ùiÈZI¢"YË®ûÉ¾{Ë®ZKZHNijŞ[È8"r²‡6VÆV7FVCö6†ævR‡6VÆV7FVB’²~ûÈiÈ‹ùKˆîK˜¾X˜ŞYNiÈZI¢2YË®iÈiXŠë[Ù^jùN‹è>ûÈ8"s¢rr’²sÂ÷ãÆF—b6Æ73Ò'F×F&ÆR×67&öÆÂ"F&–æFWƒÒ#"&öÆSÒ'&Vv–öâ"&–ÖÆ&VÃÒ.š)Yè¾XènjÊ[é~XˆnŠûÈÎXúşjŠ®Y	k¹®Xª‚#ãÇF&ÆR6Æ73Ò'FÖ†—7F÷'’#ãÆ6F–öãîjøşjÎK‹®[é~XˆbòkºXˆnKˆî[é~Xˆnxè~ûÉ¾(	BK‹®iÊ®[Ù^XZ^ûÈÎ[è^Š^XZKˆŞXø.Kˆî{¹şŠêÂö6F–öããÇF†VCãÇG#ãÇF‚66÷SÒ&6öÂ#îš)Yè²òKØŞ{ÚãÂ÷Fƒâr¶W†×2æÖ†gVæ7F–öâ†R—·&WGW&âsÇF‚66÷SÒ&6öÂ#ãÆ'WGFöâG—SÒ&'WGFöâ"FF×FÖW†ÓÒ"r¶W62†Ræ–B’²r"F—FÆSÒ.iú^yÈ¾ˆ>Šù^Šúnh8R#âr¶W62†RææÖWÇÂ~iÊ®YŞYŞˆ>ŠùRr’²sÂö'WGFöããÇ6ÖÆÃâr¶W62†RæW†ÕöFFWÇÂ~iziz^iÉòr’²sÂ÷6ÖÆÃãÂ÷Fƒâs·Ò’æ¦ö–â‚rr’²sÂ÷G#ãÂ÷F†VCãÇF&öG“âr¶÷&FW&VBæÖ†gVæ7F–öâ†r—·&WGW&âsÇG"r²†ræ¶W“ÓÓÖ6frç6VÆV7FVCòr6Æ73Ò'F×6VÆV7FVB"s¢rr’²sãÇF‚66÷SÒ'&÷r#ãÆ'WGFöâG—SÒ&'WGFöâ"FF×F×6VÆV7CÒ"r¶W62†ræ¶W’’²r"&–×&W76VCÒ"r²†ræ¶W“ÓÓÖ6frç6VÆV7FVB’²r#âr¶W62‡F—FÆR†r’’²sÂö'WGFöããÂ÷Fƒâr¶ræ6VÆÇ2ç6Æ–6R‡7F'BÆVæB’æÖ†gVæ7F–öâ†2—·&WGW&â2bf2æ6ö×ÆWFSòsÇFCãÇ7â6Æ73Ò'FÖ6VÆÂr²†2ç&FSÂãcòwFÖÆ÷rs¦2ç&FSãÒãƒSòwFÖ†–v‚s¢wFÖÖ–Br’²r#ãÆ#âr¶f×B†2ç66÷&R’²rÆVÓâòr¶f×B†2æÖ‚’²sÂöVÓãÂö#ãÇ6ÖÆÃâr·7B†2ç&FR’²sÂ÷6ÖÆÃãÂ÷7ããÂ÷FCâs¢sÇFB6Æ73Ò'FÖÖ—76–ær#âr²†3ò~[è^Š^XZ‚s¢~(	Br’²sÂ÷FCâs·Ò’æ¦ö–â‚rr’²sÂ÷G#âs·Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—cãÆF—b6Æ73Ò'F×v–æF–öâ#ãÆ'WGFöâG—SÒ&'WGFöâ"FF×F×v–æF÷sÒ"r·7F'B²r"r²‚7F'CòrF—6&ÆVBs¢rr’²sî(ii»Niz“Âö'WGFöããÇ7ãâr²‡"æW†×2æÆVæwFƒò‡7F'B³’²~(	2r¶VæC¢sr’²ròr·"æW†×2æÆVæwF‚²rYË£Â÷7ããÆ'WGFöâG—SÒ&'WGFöâ"FF×F×v–æF÷sÒ"r´ÖF‚æÖ–â‡"æW†×2æÆVæwF‚ÆVæB³b’²r"r²†VæCÓÓ×"æW†×2æÆVæwFƒòrF—6&ÆVBs¢rr’²sîi»Nik(i#Âö'WGFöããÂöF—cãÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâ7G'V7GW&R‡"Æ÷&FW&VB—°¢&WGW&âsÇ6V7F–öâ6Æ73Ò'FÖ6&B#ãÆF—b6Æ73Ò'F×6V7F–öâÖ†VF–ær#ãÆF—cãÆƒ#îZKXˆn{¹>ièNKˆî™[şiÉşŠxëÂöƒ#ãÇîY:®K©¾š)Yè¾XÚK¨ni»NZI®ZKXˆnûÉşy›îXˆnjùNKº^[Ù>X˜ŞˆÈ>Y»NXh^ZèÎi[Nš)Yè¾y¨N{JşŠêZKXˆnK‹®XˆnjøŞ8#Â÷ãÂöF—cãÂöF—câr²‡"çF÷FÄÆ÷7CãòsÆF—b6Æ73Ò'FÖ&'2#âr·"ç&÷w2æf–ÇFW"†gVæ7F–öâ†r—·&WGW&âræÆ÷7Cã·Ò’ç6÷'B†gVæ7F–öâ†Æ"—·&WGW&â"æÆ÷7BÖæÆ÷7C·Ò’æÖ†gVæ7F–öâ†r—·&WGW&âsÆF—b6Æ73Ò'FÖ&"×&÷r#ãÇ7ãâr¶W62‡F—FÆR†r’’²sÂ÷7ããÆF—b6Æ73Ò'FÖ&"×G&6²#ãÆ’7G–ÆSÒ'v–GFƒ¢r´ÖF‚æÖ‚ƒÄÖF‚æÖ–âƒÆræ6öçG&–'WF–öâ£’’²rR#ãÂö“ãÂöF—cãÆ#âr·7B†ræ6öçG&–'WF–öâ’²sÂö#ãÂöF—câs·Ò’æ¦ö–â‚rr’²sÂöF—câs¢sÇ6Æ73Ò'FÖV×G’#âr²‡"ç&FSÓÓÖçVÆÃò~Š^›Ù[é~XˆnKˆîkºXˆnYîi‹îzK®ZKXˆn{¹>ièN8"s¢~[{.[Ù^š)Yè¾k*iÈZKXˆn8"r’²sÂ÷âr’²sÆFWF–Ç26Æ73Ò'FÖÖWG&–2ÖFWF–Ç2#ãÇ7VÖÖ'“îiú^yÈ¾XZ˜:š)Yè¾hÈ~jsÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'F×F&ÆR×67&öÆÂ"F&–æFWƒÒ#"&öÆSÒ'&Vv–öâ"&–ÖÆ&VÃÒ.YNš)Yè¾{¹şŠêhÈ~jr#ãÇF&ÆR6Æ73Ò'FÖÖWG&–72#ãÇF†VCãÇG#ãÇF‚66÷SÒ&6öÂ#îš)Yè³Â÷FƒãÇF‚66÷SÒ&6öÂ#î[é~XˆnxèròZKXˆnxèsÂ÷FƒãÇF‚66÷SÒ&6öÂ#îXÚ[{.[Ù^ZKXˆcÂ÷FƒãÇF‚66÷SÒ&6öÂ#îYË®YØ~ZKXˆcÂ÷FƒãÇF‚66÷SÒ&6öÂ#îZKXˆnš)jÊÂ÷FƒãÇF‚66÷SÒ&6öÂ#î™«î[ªnj~k:ƒÂ÷FƒãÇF‚66÷SÒ&6öÂ#î‹ùiÉşXùXÉcÂ÷FƒãÂ÷G#ãÂ÷F†VCãÇF&öG“âr¶÷&FW&VBæÖ†gVæ7F–öâ†r—·&WGW&âsÇG#ãÇF‚66÷SÒ'&÷r#âr¶W62‡F—FÆR†r’’²sÂ÷FƒãÇFCâr·7B†rç&FR’²ròr·7B†ræÆ÷75&FR’²sÂ÷FCãÇFCâr·7B†ræ6öçG&–'WF–öâ’²sÂ÷FCãÇFCâr¶f×B†ræ6÷VçCöræÆ÷7Böræ6÷VçC¦çVÆÂ’²rXˆcÂ÷FCãÇFCâr¶ræÆ÷746÷VçB²ròr¶ræ6÷VçB²rYË£Â÷FCãÇFCâr¶F–ff–7VÇG’†r’²sÂ÷FCãÇFCâr¶6†ævR†r’²sÂ÷FCãÂ÷G#âs·Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—cãÂöFWF–Ç3ãÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâ&VæFW"‚—°¢f"3×6WGF–æw2‚’ÂæÖW3×7V&¦V7G2‚“°¢–b‚æÖW2æ–æ6ÇVFW2†2ç7V&¦V7B’—¶2ç7V&¦V7CÖæÖW2æf–æB†gVæ7F–öâ†â—·&WGW&â6÷W&6R‚’ç6öÖR†gVæ7F–öâ†R—·&WGW&â†RçVW7F–öå÷G—U÷66÷&W7ÇÇ·Ò•¶åÒbfRçVW7F–öå÷G—U÷66÷&W5¶åÒæÆVæwFƒ·Ò“·Ò—ÇÆæÖW5³×ÇÂrs·Ğ¢f"#ÔÒææÇ—¦R‡6÷W&6R‚’Äö&¦V7Bæ76–vâ‡·ÒÆ2Ç·F&vWE&FS¦2ævöÇ5¶2ç7V&¦V7E×Ò’“°¢–b‡"æW†×2æÆVæwF‚bgG—VöbG&6µW6vSÓÓÒvgVæ7F–öâr—G&6µW6vR‚wVW7F–öå÷G—UöæÇ—6—5÷f–WvVBrÇ¶W†Õö–C§"æW†×5·"æW†×2æÆVæwF‚ÓÒæ–GÒ“°¢–b‚2çf–Wt6†÷6Vâ–2çf–Ws×"ç&V6öÖÖVæFVC°¢f"÷&FW&VCÔÒç&æ¶VB‡"Æ2çf–Wr’Â6G3Ô'&’æg&öÒ†æWr6WB‡6÷W&6R‚’æÖ†gVæ7F–öâ†R—·&WGW&âRæw&FUöÆWfVÇÇÂrs·Ò’’“°¢f"6†÷v66SÕ7G&–ær‡7FFRçW6W"bg7FFRçW6W"çW6W&æÖWÇÂrr’çFôÆ÷vW$66R‚“ÓÓÒw6†÷v66Rs°¢–b‡6†÷v66Rbb2æFVÖõ6VÆV7FVBbf6G2æ–æ6ÇVFW2‚~š)Yè¾kÉNzK¢r’—¶2æ6FVv÷'“Ò~š)Yè¾kÉNzK¢s¶2æFVÖõ6VÆV7FVC×G'VS·&WGW&â&VæFW"‚“·Ğ¢f"f–ÇFW'3Öf–VÆB‚w7V&¦V7BrÂ~zyyºârÆæÖW2æÖ†gVæ7F–öâ†â—·&WGW&â÷F–öâ†âÆâÆ2ç7V&¦V7B“·Ò’æ¦ö–â‚rr’’¶f–VÆB‚v6FVv÷'’rÂ~ˆ>Šù^Xˆn{²rÆ÷F–öâ‚r¢rÂ~XZ˜:Xˆn{²rÆ2æ6FVv÷'’’¶6G2æÖ†gVæ7F–öâ†â—·&WGW&â÷F–öâ†âÆçÇÂ~iÊ®Xˆn{²rÆ2æ6FVv÷'’“·Ò’æ¦ö–â‚rr’’¶f–VÆB‚vÆ–Ö—BrÂ~i{n™{NˆÈ>Y»BrÆ÷F–öâƒRÂ~iÈ‹ùRYË¢rÆ2æÆ–Ö—B’¶÷F–öâƒÂ~iÈ‹ùYË¢rÆ2æÆ–Ö—B’¶÷F–öâƒÂ~XZ˜:ˆ>ŠùRrÆ2æÆ–Ö—B’“°¢f"FVÖó×6†÷v66SòsÇ6Æ73Ò'FÖæ÷F–6R#ãÆ#ç6†÷v66RkÉNzK®‹JnXûsÂö#â+r8Îš)Yè¾kÉNzK®8ŞXˆn{¾KŠŞy¨Nˆ>Šù^K‹®Yh‰i[hÚî8.ˆ»ŠúŞiÈ‹[~KÈşKˆî™ˆ^Šû¾Y¹î‰ŞûÈÎxšyniÈYû®zš)XøŞZHŞZKXˆnûÉ¾i[ZÚnhÈ8Îš)Yè²²KØŞ{Úî8Şiú^yÈ¾™«îš)[ş™zî8.Xˆ~hÚ.8ÎK‰>š[şkX¾8ŞXúşyÈ¾KˆŞYÎkºXˆn8™©‰xşY(Î[è^Š^XZŠë[Ù^8#Â÷âs¢rs°¢f"–çG&óÒsÆF—b6Æ73Ò'FÖ†VF–ær#ãÆF—cãÇ7â6Æ73Ò'FÖW–V'&÷r#îyÈ¾kˆ^jøşKˆXˆcÂ÷7ããÆƒîš)Yè¾XˆniéÂöƒãÇîyÈ¾kˆ^ZKXˆnXˆn[ˆ>8XènjÊXùXÉnKˆîKˆŞYÎ™«î[ªnKˆ¾y¨NŠxë8#Â÷ãÂöF—cãÆ'WGFöâG—SÒ&'WGFöâ"FF×FÖFCîûÈ²[Ù^XZ^ˆ>ŠùSÂö'WGFöããÂöF—câs°¢f"&öf–ÆSÒsÆFWF–Ç26Æ73Ò'F×&öf–ÆR#ãÇ7VÖÖ'“îkN[›>KˆîyºîjrÇ7ãâr¶ÆWfVÇ5·"æÆWfVÅÒ²‡"çF&vWE&FRÓÖçVÆÃòr+ryºîj~[é~Xˆnxèrr¶f×B‡"çF&vWE&FR’²rRs¢rr’²sÂ÷7ããÂ÷7VÖÖ'“ãÆF—câr¶f–VÆB‚vÆWfVÂrÂ~[Ù>X˜ŞKê~˜xŞx+’rÆ÷F–öâ‚vWFòrÂ~jhÚî‹ùiÉşXéşZx¾XˆnXŠNijÒrÆ2æÆWfVÂ’¶÷F–öâ‚vf÷VæFF–öârÂ~[zY»®Yû®zrÆ2æÆWfVÂ’¶÷F–öâ‚v&Ææ6VBrÂ~z‹>jÚ^hùXØrrÆ2æÆWfVÂ’¶÷F–öâ‚vGfæ6VBrÂ~Xk.X‹®š¹XˆbrÆ2æÆWfVÂ’’²sÆÆ&VÃãÇ7ãîiÊÎzyyºîj~[é~Xˆnxè~ûÈ‚^ûÈ“Â÷7ããÆ–çWBFF×FÖvöÂG—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#"7FWÒ#ã"–çWFÖöFSÒ&FV6–ÖÂ"fÇVSÒ"r¶W62†2ævöÇ5¶2ç7V&¦V7EÒ’²r"Æ6V†öÆFW#Ò"r²‡"çF&vWE&FRÓÖçVÆÃöf×B‡"çF&vWE&FR“¢~˜Z²r’²r#ãÇ6ÖÆÃîyYz›®i{nKÛşyJiÈ‹ùˆ>Šù^KŠŞXúşjùNy¨Nzyyºîyºîj~8#Â÷6ÖÆÃãÂöÆ&VÃãÂöF—cãÇ6Æ73Ò'FÖæ÷FR#âr²‡"æÆWfVÅ&FSÓÓÖçVÆÃò~{Ë®[	ZèÎi[Nzyyºîy¨NXéşZx¾h‰{ºûÈÎXúşh˜¾Xª˜hºKê~˜xŞx+8"s¢~[Ù>X˜ŞˆÈ>Y»NiÈ‹ùRYË®KŠÒr·"æÆWfVÄ6÷VçB²rYË®XéşZx¾h‰{ºXúşyJûÈÎXªiØ>[é~Xˆnxèrr·7B‡"æÆWfVÅ&FR’²~8.ˆz®XªXˆn{¸NûÉ®KØîK¨âsR[zY»®Yû®zûÈÃƒRR‹[~Xk.X‹®š¹Xˆn8"r’²rK¸^yJK¨î˜hº›¹ŠêNXˆniéŠxnŠy.ûÈÎXúş™¨şi{n‹>i[N8#Â÷ãÂöFWF–Ç3âs°¢f"7VÖÖ'“ÒsÆF—b6Æ73Ò'F×7VÖÖ'’#ãÆF—cãÇ7ãîiÈš)Yè¾Šë[ÙSÂ÷7ããÇ7G&öæsâr·"ç&V6÷&FVB²rÇ6ÖÆÃâòr·"æW†×2æÆVæwF‚²rYË£Â÷6ÖÆÃãÂ÷7G&öæsãÂöF—cãÆF—cãÇ7ãî[{.[Ù^š)Yè¾[é~XˆnxèsÂ÷7ããÇ7G&öæsâr·7B‡"ç&FR’²sÂ÷7G&öæsãÂöF—cãÆF—cãÇ7ãîXÛ~™Ú.Šhny¹nxèsÂ÷7ããÇ7G&öæsâr·7B‡"æ6÷fW&vR’²sÂ÷7G&öæsãÂöF—cãÆF—cãÇ7ãî[{.[Ù^˜:Xˆn{JşŠêZKXˆcÂ÷7ããÇ7G&öæsâr¶f×B‡"çF÷FÄÆ÷7B’²rÇ6ÖÆÃîXˆcÂ÷6ÖÆÃãÂ÷7G&öæsãÂöF—cãÂöF—câs°¢f"f–WsÒsÆF—b6Æ73Ò'F×W'7V7F—fW2"&öÆSÒ&w&÷W"&–ÖÆ&VÃÒ.XˆniéŠxnŠy"#âr´ö&¦V7Bæ¶W—2‡f–Ww2’æÖ†gVæ7F–öâ†²—·&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"FF×F×f–WsÒ"r¶²²r"&–×&W76VCÒ"r²†2çf–WsÓÓÖ²’²r#âr·f–Ww5¶µÒ²†³ÓÓ×"ç&V6öÖÖVæFVCòsÇ6ÖÆÃî[Ù>X˜Ş›¹ŠêNŠxnŠy#Â÷6ÖÆÃâs¢rr’²sÂö'WGFöãâs·Ò’æ¦ö–â‚rr’²sÂöF—câs°¢f"7FGW3×"æ–æ6ö×ÆWFWÇÇ"æ–çfÆ–CòsÇ6Æ73Ò'FÖæ÷F–6R#âr²‡"æ–æ6ö×ÆWFS÷"æ–æ6ö×ÆWFR²rš[é~Xˆnh‰nkºXˆn[è^Š^XZ8"s¢rr’²‡"æ–çfÆ–C÷"æ–çfÆ–B²rš˜xŞZHŞh‰njÎ[Èş[È.[‹Šë[Ù^[{.hé.™šN8"s¢rr’²~KˆŞZèÎi[Ny¨Nš)Yè¾k~h¾KˆŞXø.Kˆî{¹şŠê8#Â÷âs¢rs°¢f"V×G“ÒsÇ6V7F–öâ6Æ73Ò'FÖ6&BFÖV×G’#ãÆƒ#îK¸îKˆKŠ®š)Yè¾[ÈZx³Âöƒ#ãÇîYÊik[»®h‰n{Én‹éˆ>Šù^i{nûÈÎ[^[ÈzyyºîKˆ¾y¨N8Îš)Yè¾[é~Xˆn8ŞûÈÎZ¾XZ^[é~XˆnKˆîkºXˆn8#Æ'#îK™şXúşKº^YÊ8ÎŠù^š)[Ù^XZ^8ŞKŠŞŠønXŠ¾[›njZûŠù^XÛ~ûÈÎXhŞYÎjÚ^X‹‹ù˜xÎ8#Â÷ãÆ'WGFöâG—SÒ&'WGFöâ"FF×F×&V6÷&G3îXë¾ˆ>Šù^Šë[Ù^Š^[ÙSÂö'WGFöããÂ÷6V7F–öãâs°¢f"ÖWF†öCÒsÆFWF–Ç26Æ73Ò'FÖÖWF†öB#ãÇ7VÖÖ'“îhÈ~j~ŠûNiˆîKˆîhé.[¨şXú>[èCÂ÷7VÖÖ'“ãÇVÃãÆÆ“î[é~Xˆnxè~ûÉŞiÈiXŠë[Ù^[é~XˆnK˜¾Y(Â;rZû[©NkºXˆnK˜¾Y(ÎûÉ¾ZKXˆnxè~ûÉÓ(‰"[é~Xˆnxè~8.XéşZx¾XˆnKˆî‹X¾XˆnKˆŞk{~yJ8#ÂöÆ“ãÆÆ“îZKXˆn‹JxÊîXú®YÊ[Ù>X˜ŞzÙ¾˜ˆÈ>Y»Ny¨N[{.[Ù^š)Yè¾K˜¾™{NŠêzé~ûÈÎKˆŞKº>Ši[N[ÊŠù^XÛ~8.Šhny¹nxè~Kº^iÈXÛ~™Ú.kºXˆny¨Nˆ>Šù^K‹®XˆnjøŞûÈÎiÊ®[Ù^š)Yè¾KˆŞKÉ®[Ù>h‰™»nXˆn8#ÂöÆ“ãÆÆ“îZKXˆnš)jÊK‹®ZèÎi[NŠë[Ù^KŠŞX{®xëZKXˆny¨Nˆ>Šù^jÊi[ûÈÎKˆŞiŠş™Iš)i[8.™«î[ªnKˆîXéşYºiÚ^ˆz®[Ù^XZ^h‰nY»îx˜~KŠŞy¨Niˆîzîj~k:ûÈÎiÊ®j~k:i{nKˆŞKÙÎzîZé®XŠNijŞ8#ÂöÆ“ãÆÆ“î[ú¾˜	şhùXˆn{»ÎYYË®YØ~ZKXˆn8ZKXˆnš)jÊ8‹ùiÉşŠxëKˆî™«î[ªnûÈÎXéşYºj~k:K¸^KÙÎŠ^XX^KúhşûÉ¾š¹Xˆnz¨zNi»N˜xŞŠxn[{.j~k:™«îš)ûÈÎ[›n[ËXÉnXˆnXÎZJ~[şy¨N[ÛY8ŞûÉ¾XZ™Ú.XˆniéKê~˜xŞXøŞZHŞZKXˆnKˆî‹ùiÉşKˆ¾™˜Ş8#ÂöÆ“ãÆÆ“îŠxnŠy.Xú®iKXùi[hÚîy¨Niú^yÈ¾˜xŞx+ûÈÎKˆŞ{¹X{®X[~KÙ>ZÚnKš[»®Šêî8.[	K¨â2YË®Xú®KÙÎX‰ŞjÚ^Šx.ZùşûÉ¾‹h¾X«şˆ{>[	™ÈŠhBYË®iÈiXŠë[Ù^8.KˆŞYÎš)Yè¾Šhny¹n8ˆ>Šù^™«î[ªnY(ÎZÚnKš™‹një^KÉ®[ÛY8ŞjùN‹è>8#ÂöÆ“ãÆÆ“îhÈš)Yè¾k~h¾KÉ®YŠêYÎYŞš)Yè¾Kˆ¾[{.[Ù^y¨NKØŞ{ÚîûÉ¾Xˆnš)Šhny¹nXùXÉni{nŠû~Xˆ~hÚ.X‹8Îš)Yè²²KØŞ{Úî8Ş8.YÎYŞ8YÎKØŞ{Úîh˜ŞZû›ÙûÈÎKØŞ{ÚîŠû~KùŞhÈKˆˆ{N8#ÂöÆ“ãÂ÷VÃãÂöFWF–Ç3âs°¢f"†÷7CÖFö7VÖVçBævWDVÆVÖVçD'”–B‚v6öçFVçBr“¶–b‚†÷7B—&WGW&ã°¢†÷7Bæ–ææW$…DÔÃ×F'2‚’²sÆF—b6Æ73Ò'F×vR#âr¶–çG&ò¶FVÖò²sÇ6V7F–öâ6Æ73Ò'FÖ6&BFÖ6öçG&öÇ2#ãÆF—b6Æ73Ò'FÖf–ÇFW'2#âr¶f–ÇFW'2²sÂöF—cãÆÆ&VÂ6Æ73Ò'FÖ†–FFVâ×FövvÆR#ãÆ–çWBG—SÒ&6†V6¶&÷‚"FF×FÖ†–FFVâr²†2æ–æ6ÇVFT†–FFVãòr6†V6¶VBs¢rr’²sâXÈ^Y
¾™©‰xşˆ>ŠùSÂöÆ&VÃâr·&öf–ÆR²sÂ÷6V7F–öãâr·7VÖÖ'’·7FGW2·f–Wr²‡"ç&÷w2æÆVæwFƒö÷÷'GVæ—F–W2‡"Æ÷&FW&VB’¶†—7F÷'’‡"Æ÷&FW&VB’·7G'V7GW&R‡"Æ÷&FW&VB“¦V×G’’¶ÖWF†öB²sÂöF—câs°¢&–æB††÷7BÇ"“·&WGW&â#°¢Ğ¢gVæ7F–öâ&W&VæFW"†fö7W2—·&VæFW"‚“¶–b†fö7W2—·f"æöFSÖFö7VÖVçBçVW'•6VÆV7F÷"†fö7W2“¶–b†æöFR–æöFRæfö7W2‡·&WfVçE67&öÆÃ§G'VWÒ“·×Ğ¢gVæ7F–öâ&–æB††÷7BÇ"—°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FF×FÖf–ÇFW%Òr’æf÷$V6‚†gVæ7F–öâ†VÂ—¶VÂæöæ6†ævSÖgVæ7F–öâ‚—·f"¶W“ÖVÂæFF6WBçFf–ÇFW#¶6fu¶¶W•ÓÖVÂçfÇVS¶–b†¶W’ÓÒw6VÆV7FVBr–6fræVæCÓ¶–b†¶W“ÓÓÒvw&÷WwÇÆ¶W“ÓÓÒw7V&¦V7Br–6frç6VÆV7FVCÒrs·&W&VæFW"‚u¶FF×FÖf–ÇFW#Ò"r¶¶W’²r%Òr“·Ó·Ò“°¢†÷7BçVW'•6VÆV7F÷"‚u¶FF×FÖ†–FFVåÒr’æöæ6†ævSÖgVæ7F–öâ‚—¶6fræ–æ6ÇVFT†–FFVã×F†—2æ6†V6¶VC¶6fræVæCÓ·&W&VæFW"‚u¶FF×FÖ†–FFVåÒr“·Ó°¢†÷7BçVW'•6VÆV7F÷"‚u¶FF×FÖvöÅÒr’æöæ6†ævSÖgVæ7F–öâ‚—¶–b‡F†—2çfÇVRbbF†—2æ6†V6µfÆ–F—G’‚’—·F†—2ç&W÷'EfÆ–F—G’‚“·&WGW&ã·Ö6frævöÇ5¶6frç7V&¦V7EÓ×F†—2çfÇVS·&W&VæFW"‚u¶FF×FÖvöÅÒr“·Ó°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FF×F×f–WuÒr’æf÷$V6‚†gVæ7F–öâ†"—¶"æöæ6Æ–6³ÖgVæ7F–öâ‚—¶6frçf–WsÖ"æFF6WBçFf–Ws¶6frçf–Wt6†÷6Vã×G'VS·&W&VæFW"‚u¶FF×F×f–WsÒ"r¶6frçf–Wr²r%Òr“·Ó·Ò“°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FF×F×6VÆV7EÒr’æf÷$V6‚†gVæ7F–öâ†"—¶"æöæ6Æ–6³ÖgVæ7F–öâ‚—¶6frç6VÆV7FVCÖ"æFF6WBçF6VÆV7C·&VæFW"‚“·f"ƒÖFö7VÖVçBçVW'•6VÆV7F÷"‚r7FÖ†—7F÷'’r“¶‚ç67&öÆÄ–çFõf–Wr‡¶&Æö6³¢w7F'BrÆ&V†f–÷#¢w6Öö÷F‚wÒ“¶‚çVW'•6VÆV7F÷"‚u¶FF×FÖf–ÇFW#Ò'6VÆV7FVB%Òr’æfö7W2‡·&WfVçE67&öÆÃ§G'VWÒ“·Ó·Ò“°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FF×F×v–æF÷uÒr’æf÷$V6‚†gVæ7F–öâ†"—¶"æöæ6Æ–6³ÖgVæ7F–öâ‚—¶6fræVæCÔçVÖ&W"†"æFF6WBçFv–æF÷r“·&VæFW"‚“¶Fö7VÖVçBçVW'•6VÆV7F÷"‚r7FÖ†—7F÷'’r’ç67&öÆÄ–çFõf–Wr‡¶&Æö6³¢w7F'BwÒ“·Ó·Ò“°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FF×FÖW†ÕÒr’æf÷$V6‚†gVæ7F–öâ†"—¶"æöæ6Æ–6³ÖgVæ7F–öâ‚—¶–b‡v–æF÷rå66÷&TW†ÔFWF–Â—v–æF÷rå66÷&TW†ÔFWF–Âæ÷Vâ†"æFF6WBçFW†Ò“·Ó·Ò“°¢f"÷6—F–öç3Ö†÷7BçVW'•6VÆV7F÷"‚u¶FF×F×÷6—F–öåÒr“¶–b‡÷6—F–öç2—÷6—F–öç2æöæ6Æ–6³ÖgVæ7F–öâ‚—¶6fræw&÷WÒw÷6—F–öâs¶6frç6VÆV7FVCÒrs¶6fræVæCÓ·&W&VæFW"‚u¶FF×FÖf–ÇFW#Ò&w&÷W%Òr“·Ó°¢†÷7BçVW'•6VÆV7F÷"‚u¶FF×FÖFEÒr’æöæ6Æ–6³ÖgVæ7F–öâ‚—¶÷VäW†Ò‚“·Ó°¢f"&V6÷&G3Ö†÷7BçVW'•6VÆV7F÷"‚u¶FF×F×&V6÷&G5Òr“¶–b‡&V6÷&G2—&V6÷&G2æöæ6Æ–6³ÖgVæ7F–öâ‚—·7FFRçvSÒw&V6÷&G2s·&VæFW%vR‚“¶&–æDæb‚“·Ó°¢Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆgVæ7F–öâ†R—·f"#ÖRçF&vWBæ6Æ÷6W7B‚u¶FF×F×F%Òr“¶–b‚"—&WGW&ã·6WGF–æw2‚’çF#Ö"æFF6WBçFF#·7FFRææÇ—6—5F#Ö"æFF6WBçFF#ÓÓÒwG—W2sòwG—W2s¢w7FG2s·&VæFW%vR‚“·f"7F—fSÖFö7VÖVçBçVW'•6VÆV7F÷"‚u¶FF×F×F#Ò"r¶6frçF"²r%Òr“¶–b†7F—fR–7F—fRæfö7W2‡·&WfVçE67&öÆÃ§G'VWÒ“·Ò“°¢v–æF÷rå66÷&UVW7F–öåG—TæÇ—6—3×¶7F—fS¦gVæ7F–öâ‚—·&WGW&âv–æF÷rå66÷&UW$‡V"ò7FFRææÇ—6—5F#ÓÓÒwG—W2r¢6WGF–æw2‚’çF#ÓÓÒwG—W2s·ÒÇF'3§F'2Ç&VæFW#§&VæFW"Æ÷Vã¦gVæ7F–öâ‡7V&¦V7B—·f"3×6WGF–æw2‚“¶2çF#ÒwG—W2s·7FFRææÇ—6—5F#ÒwG—W2s¶–b‡7V&¦V7B–2ç7V&¦V7C×7V&¦V7C·7FFRçvSÒw7FG2s·&VæFW%vR‚“¶&–æDæb‚“·×Ó°¢f"7G–ÆSÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“·7G–ÆRçFW‡D6öçFVçCÖ ¢çF×F'7¶F—7Æ“¦fÆWƒ¶v£gƒ¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–ã£#Gƒ·FF–ærÖ&÷GFöÓ£‡ÒçF×F'2'WGFöâÂçF×vR'WGFöç¶föçC¦–æ†W&—C¶6öÆ÷#§f"‚Ò×FW‡B“¶7W'6÷#§ö–çFW#¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶Ö–âÖ†V–v‡C£Cƒ·FF–æs£—‚Gƒ¶föçB×6—¦S£7‡ÒçF×F'2'WGFöç¶&÷&FW"Ö6öÆ÷#§G&ç7&VçC¶&6¶w&÷VæC§G&ç7&VçC¶föçB×6—¦S£G‡ÒçF×F'2¶&–×&W76VC×G'VUÒÂçF×W'7V7F—fW2¶&–×&W76VC×G'VU×¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚ÒÖ66VçB“¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£cSÒçF×vW¶Ö‚×v–GFƒ£ƒƒ¶Ö&v–ã¦WFòWFòcƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶Ö–â×v–GFƒ£ÒçFÖ†VF–æw¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£‡ƒ¶Æ–vâÖ—FV×3¦6VçFW#¶Ö&v–âÖ&÷GFöÓ£#W‡ÒçFÖW–V'&÷w¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£cSÒçFÖ†VF–ærƒ¶föçB×6—¦S£3ƒ¶Ö&v–ã£‡‚¶Æ–æRÖ†V–v‡C£ã3WÒçFÖ†VF–ærÂçF×6V7F–öâÖ†VF–ær¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãsS¶Ö&v–ã£g‚ÒçFÖ†VF–ær'WGFöç·v†—FR×76S¦æ÷w&ÒçFÖ6&G·FF–æs£#Gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW"×&F—W3£gƒ¶Ö&v–âÖ&÷GFöÓ£#'ƒ¶Ö–â×v–GFƒ£ÒçFÖf–ÇFW'7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£g‡ÒçF×vRÆ&VÇ¶F—7Æ“¦w&–C¶v£wƒ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö–â×v–GFƒ£ÒçF×vR6VÆV7BÂçF×vR–çWE·G—SÖçVÖ&W%×·v–GFƒ£S¶Ö–â×v–GFƒ£¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚ÒÖ–çWBÖ&rÇf"‚Ò×æVÂ×6öÆ–BÂ6ffb’“¶6öÆ÷#§f"‚Ò×FW‡B“¶Ö–âÖ†V–v‡C£C'ƒ·FF–æs£—‚ƒ¶föçC¦–æ†W&—C¶föçB×6—¦S£G‡ÒçF×vRÆ&VÂ6ÖÆÇ¶föçB×6—¦S£ƒ¶Æ–æRÖ†V–v‡C£ãgÒçFÖ†–FFVâ×FövvÆW¶F—7Æ“¦fÆW‚–×÷'FçC¶Æ–vâÖ—FV×3¦6VçFW#¶v£w‚–×÷'FçC¶Ö&v–ã£W‚·v–GFƒ¦f—BÖ6öçFVçGÒçFÖ†–FFVâ×FövvÆR–çWG¶Ö&v–ã£ÒçF×&öf–ÆW¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ær×F÷£Wƒ¶Ö&v–â×F÷£‡‡ÒçF×&öf–ÆR7VÖÖ'—¶föçB×6—¦S£7ƒ¶7W'6÷#§ö–çFW#¶Æ–æRÖ†V–v‡C£ã‡ÒçF×&öf–ÆR7VÖÖ'’7ç¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–âÖÆVgC£'ƒ¶föçB×6—¦S£'‡ÒçF×&öf–ÆSæF—g¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£‡ƒ¶Ö&v–â×F÷£W‡ÒçF×7VÖÖ'—¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒBÆÖ–æÖ‚ƒÃg"’“¶v£gƒ¶Ö&v–ã£#g‚ÒçF×7VÖÖ'“æF—g·FF–æs£G‚‡ƒ¶&÷&FW"ÖÆVgC£'‚6öÆ–Bf"‚ÒÖÆ–æR“¶F—7Æ“¦w&–C¶v£ƒ¶Ö–â×v–GFƒ£ÒçF×7VÖÖ'’7ç¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£'‡ÒçF×7VÖÖ'’7G&öæw¶föçB×6—¦S£#gƒ¶föçB×vV–v‡C£cS¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒçF×7VÖÖ'’6ÖÆÇ¶föçB×6—¦S£7ƒ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçF×W'7V7F—fW7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£‡ƒ¶Ö&v–ã£#G‚‡‡ÒçF×W'7V7F—fW2'WGFöç¶föçB×6—¦S£Gƒ¶Ö–âÖ†V–v‡C£SG‡ÒçF×W'7V7F—fW26ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£C¶Ö&v–â×F÷£G‡ÒçF×6V7F–öâÖ†VF–æw¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£gƒ¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶Ö&v–âÖ&÷GFöÓ£#'‡ÒçF×6V7F–öâÖ†VF–ærƒ"ÂçFÖV×G’ƒ'¶föçB×6—¦S£#ƒ¶Æ–æRÖ†V–v‡C£ãS¶Ö&v–ã£ÒçF×Fw¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ66VçB“¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“·FF–æs£W‚—ƒ¶&÷&FW"×&F—W3£gƒ·v†—FR×76S¦æ÷w&ÒçFÖ÷÷'GVæ—F–W7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£‡‡ÒçFÖ÷÷'GVæ—F–W2'F–6ÆW·FF–æs£#ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶Ö–â×v–GFƒ£¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶Æ–vâÖ—FV×3¦fÆW‚×7F'GÒçFÖ–æFW‡¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£sÒçFÖ÷÷'GVæ—F–W2ƒ7¶föçB×6—¦S£‡ƒ¶Ö&v–ã£'‚¶Æ–æRÖ†V–v‡C£ãSS¶÷fW&fÆ÷r×w&¦ç—v†W&WÒçF×Fw7¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶v£g‡ÒçF×Fw27ç¶föçB×6—¦S£ƒ¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfcvf“¶6öÆ÷#§f"‚ÒÖ×WFVB“·FF–æs£G‚wƒ¶&÷&FW"×&F—W3£W‡ÒçFÖ÷÷'GVæ—F–W2¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãƒ¶Ö&v–ã£G‚ÒçFÖ÷÷'GVæ—F–W2çFÖWf–FVæ6W¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£'ƒ¶Æ–æRÖ†V–v‡C£ãƒS·v–GFƒ£WÒçFÖWf–FVæ6R'¶6öÆ÷#§f"‚Ò×FW‡B“¶föçB×vV–v‡C£cÒçFÖ÷÷'GVæ—F–W2'WGFöç¶Ö&v–â×F÷£gƒ¶6öÆ÷#§f"‚ÒÖ66VçB“¶&÷&FW#£¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶föçB×6—¦S£'‡ÒçFÖæ÷FRÂçFÖÖWF†öG¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãƒWÒçFÖæ÷FW¶Ö&v–ã£‡‚ÒçFÖ†—7F÷'’Ö6öçG&öÇ7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"&g#¶v£Wƒ¶Ö&v–ã£‡‚ÒçFÖ6†'BÖ6ö×7G¶F—7Æ“¦æöæWÒçFÖ6†'G¶F—7Æ“¦&Æö6³·v–GFƒ£S¶†V–v‡C¦WFó¶Ö‚Ö†V–v‡C£#ƒƒ¶Ö&v–â×F÷£#'ƒ¶÷fW&fÆ÷s§f—6–&ÆWÒçFÖ6†'BFW‡G¶föçB×6—¦S£ƒ¶f–ÆÃ§f"‚ÒÖ×WFVB“¶föçBÖfÖ–Ç“¦–æ†W&—GÒçFÖw&–G·7G&ö¶S§f"‚ÒÖÆ–æR“·7G&ö¶RÖF6†'&“£2GÒçFÖÆ–æW·7G&ö¶S§f"‚ÒÖ66VçB“·7G&ö¶R×v–GFƒ£"ãS¶f–ÆÃ¦æöæWÒçF×ö–çG¶f–ÆÃ§f"‚ÒÖ66VçB“·7G&ö¶S§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“·7G&ö¶R×v–GFƒ£'ÒçF×F&ÆR×67&öÆÇ¶Ö‚×v–GFƒ£S¶÷fW&fÆ÷s¦WFó¶Ö&v–â×F÷£#'ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£ƒ¶÷fW'67&öÆÂÖ&V†f–÷"×ƒ¦6öçF–çÒçF×vRF&ÆW·v–GFƒ£S¶&÷&FW"Ö6öÆÆ6S§6W&FS¶&÷&FW"×76–æs£¶föçB×6—¦S£'ƒ¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒçF×vR6F–öç·FW‡BÖÆ–vã¦ÆVgC·FF–æs£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãwÒçF×vRF‚ÂçF×vRFG·FF–æs£G‚'ƒ·FW‡BÖÆ–vã¦6VçFW#¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö–â×v–GFƒ£“‡ÒçF×vRF‡¶föçB×vV–v‡C£S¶föçB×6—¦S£'‡ÒçF×vRF†VBF‡¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfcvf“¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçF×vRF&öG’F‡·FW‡BÖÆ–vã¦ÆVgC¶Ö–â×v–GFƒ£ƒ¶Ö‚×v–GFƒ£ƒƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒçFÖ†—7F÷'’F†VBF‡¶Ö–â×v–GFƒ£W‡ÒçFÖ†—7F÷'’Fƒ¦f—'7BÖ6†–ÆG·÷6—F–öã§7F–6·“¶ÆVgC£·¢Ö–æFWƒ£¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷‚×6†F÷s£‚f"‚ÒÖÆ–æR—ÒçF×vRF‚'WGFöç¶föçB×6—¦S£'ƒ¶&6¶w&÷VæC§G&ç7&VçC¶&÷&FW#£¶Ö–âÖ†V–v‡C£¶Æ–æRÖ†V–v‡C£ãc·FF–æs£·FW‡BÖÆ–vã¦–æ†W&—C¶÷fW&fÆ÷r×w&¦ç—v†W&S¶6öÆ÷#¦–æ†W&—GÒçF×vRF‚6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£g‡ÒçFÖ6VÆÇ¶F—7Æ“¦&Æö6³¶&÷&FW"×&F—W3£‡ƒ·FF–æs£‚gƒ¶Ö–â×v–GFƒ£sg‡ÒçFÖ6VÆÂ'¶föçB×6—¦S£Gƒ¶föçB×vV–v‡C£cS·v†—FR×76S¦æ÷w&ÒçFÖ6VÆÂV×¶föçB×6—¦S£ƒ¶föçB×7G–ÆS¦æ÷&ÖÃ¶föçB×vV–v‡C£CÒçFÖ6VÆÂ6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶Ö&v–â×F÷£g‡ÒçFÖÆ÷w¶&6¶w&÷VæC§&v&ƒ#BÃSÃc2Âã2“¶6öÆ÷#§f"‚Ò×FW‡B—ÒçFÖÖ–G¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚Ò×FW‡B—ÒçFÖ†–v‡¶&6¶w&÷VæC§&v&ƒSÃcrÃ#"Âã"“¶6öÆ÷#§f"‚Ò×FW‡B—ÒçFÖÖ—76–æw¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçF×6VÆV7FVCçF‚'WGFöç¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£sÒçF×v–æF–öç¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Ö&v–â×F÷£Gƒ¶v£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£'‡ÒçF×vR'WGFöã¦F—6&ÆVG¶÷6—G“¢ãC¶7W'6÷#¦FVfVÇGÒçFÖ&'7¶F—7Æ“¦w&–C¶v£wƒ¶Ö&v–ã£#G‚ÒçFÖ&"×&÷w¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒƒW‚Ãg"’Ö–æÖ‚ƒÃ6g"’S'ƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£Gƒ¶föçB×6—¦S£7‡ÒçFÖ&"×&÷sç7ç¶÷fW&fÆ÷r×w&¦ç—v†W&WÒçFÖ&"×&÷r'·FW‡BÖÆ–vã§&–v‡C¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£SÒçFÖ&"×G&6·¶†V–v‡C£—ƒ¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfcvf“¶&÷&FW"×&F—W3£‡ƒ¶÷fW&fÆ÷s¦†–FFVçÒçFÖ&"×G&6²—¶†V–v‡C£S¶F—7Æ“¦&Æö6³¶&6¶w&÷VæC§f"‚ÒÖ66VçB“¶&÷&FW"×&F—W3£‡‡ÒçFÖÖWG&–77¶Ö–â×v–GFƒ£sƒ‡ÒçFÖÖWF†öB7VÖÖ'—¶7W'6÷#§ö–çFW#¶6öÆ÷#§f"‚Ò×FW‡B—ÒçFÖÖWF†öBVÇ·FF–ærÖÆVgC£‡‡ÒçFÖÖWF†öBÆ—¶Ö&v–ã£—‚ÒçFÖV×G—·FW‡BÖÆ–vã¦6VçFW#·FF–æs£3W‚Wƒ¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãƒS¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçFÖV×G’ƒ'¶6öÆ÷#§f"‚Ò×FW‡B—ÒçFÖæ÷F–6W¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãƒ·FF–æs£7‚gƒ¶&÷&FW"×&F—W3£ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚Ò×FW‡B—ÒçF×vR¦fö7W2×f—6–&ÆRÂçF×F'2¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£7‡Ò7FÖ†—7F÷'—·67&öÆÂÖÖ&v–â×F÷£#‡Ğ¢çFÖ¶W’ÖÖWG&–77¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£gƒ·v–GFƒ£S¶Ö&v–ã£#‚ÒçFÖ¶W’ÖÖWG&–72GG¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçFÖ¶W’ÖÖWG&–72FG¶Ö&v–ã£g‚¶föçB×6—¦S£#'ƒ¶föçB×vV–v‡C£cS¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒçFÖ¶W’ÖÖWG&–726ÖÆÇ¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçFÖ÷÷'GVæ—F–W2çF×&VF–æw¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãƒS¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ær×F÷£g‡ÒçFÖææ÷FF–öç7¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷¦WFó·v–GFƒ£WÒçFÖææ÷FF–öç27VÖÖ'’ÂçFÖÖWG&–2ÖFWF–Ç3ç7VÖÖ'—¶7W'6÷#§ö–çFW#¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒçFÖææ÷FF–öç2¶föçB×6—¦S£'ƒ¶Ö&v–ã£‡‚ÒçFÖÖWG&–2ÖFWF–Ç7¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ær×F÷£‡‡ÒçFÖÖWG&–2ÖFWF–Ç3ç7VÖÖ'—¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚Ò×FW‡B—Ğ¤ÖVF–†Ö‚×v–GFƒ£‚—²çFÖ÷÷'GVæ—F–W7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'ÒçFÖ÷÷'GVæ—F–W2'F–6ÆW¶F—7Æ“¦&Æö6·ÒçFÖ÷÷'GVæ—F–W2ƒ7¶F—7Æ“¦–æÆ–æS¶Ö&v–âÖÆVgC£‡ÒçF×Fw7¶Ö&v–â×F÷£'‡ÒçFÖ÷÷'GVæ—F–W2çFÖWf–FVæ6W¶Ö&v–ã£'‡ÒçF×7VÖÖ'’7G&öæw¶föçB×6—¦S£#G‡×Ğ¤ÖVF–†Ö‚×v–GFƒ£c#‚—²çFÖ6†'B×v–FW¶F—7Æ“¦æöæWÒçFÖ6†'BÖ6ö×7G¶F—7Æ“¦&Æö6·ÒçFÖ†VF–æw¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶fÆW‚×w&§w&ÒçFÖ†VF–ærƒ¶föçB×6—¦S£#w‡ÒçFÖ†VF–ær¶föçB×6—¦S£'‡ÒçFÖ6&G·FF–æs£—‚Wƒ¶&÷&FW"×&F—W3£7‡ÒçFÖf–ÇFW'7¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£7‡ÒçFÖf–ÇFW'3æÆ&VÃ¦f—'7BÖ6†–ÆG¶w&–BÖ6öÇVÖã£òÓÒçF×7VÖÖ'—¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£#'‚‡ÒçF×7VÖÖ'“æF—g·FF–ærÖÆVgC£'‡ÒçF×7VÖÖ'’7ç¶föçB×6—¦S£‡ÒçF×7VÖÖ'’7G&öæw¶föçB×6—¦S£#G‡ÒçF×W'7V7F—fW7¶v£W‡ÒçF×W'7V7F—fW2'WGFöç¶föçB×6—¦S£7ƒ·FF–æs£—‚7‡ÒçF×W'7V7F—fW26ÖÆÇ¶föçB×6—¦S£—‡ÒçF×&öf–ÆR7VÖÖ'’7ç¶F—7Æ“¦&Æö6³¶Ö&v–ã£G‚ÒçF×&öf–ÆSæF—g¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'ÒçF×6V7F–öâÖ†VF–æw¶v£‡ƒ¶fÆW‚×w&§w&ÒçF×6V7F–öâÖ†VF–ærƒ'¶föçB×6—¦S£—‡ÒçFÖ÷÷'GVæ—F–W2'F–6ÆW·FF–æs£w‚G‡ÒçFÖ†—7F÷'’Ö6öçG&öÇ7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'ÒçFÖ†—7F÷'’F†VBF‡¶Ö–â×v–GFƒ£W‡ÒçF×vRF&öG’F‡¶Ö–â×v–GFƒ£ƒWƒ¶Ö‚×v–GFƒ£‡ÒçF×vRF‚ÂçF×vRFG·FF–æs£'‚‡‡ÒçFÖ&"×&÷w¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒsW‚Ãg"’Ö–æÖ‚ƒÃãVg"’CWƒ¶v£—ƒ¶föçB×6—¦S£'‡ÒçFÖ6†'G¶Ö–âÖ†V–v‡C£S‡ÒçF×vR6VÆV7BÂçF×vR–çWE·G—SÖçVÖ&W%×¶föçB×6—¦S£g‡×Ğ¦¶Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒW†ÒÖ6†ævW2æ§2ÓÓÓÓÒ¢ğ¢ò¢öæRW‡Æ–6—B†—7F÷&–6ÂW†ÒW"6ö×&—6öã²&æ·2Fòæ÷BFWVæBöâ66÷&W2÷"Ö†–Öâ¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢gVæ7F–öâFFR‡b’²&WGW&âG—VöbbÓÓÒw7G&–ærrbbõåÆG³GÒÕÆG³'ÒÕÆG³'ÒBòçFW7B‡b’bbçVÖ&W"æ—4f–æ—FR„FFRç'6R‡b’’bbæWrFFR‡b’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ’ÓÓÒc²Ğ¢gVæ7F–öâ&÷VæB‡b’²&WGW&âÖF‚ç&÷VæB‡b¢’òÇÂ²Ğ¢gVæ7F–öâ—"†æ÷rÂ&Vf÷&RÂÖWG&–2Â66÷R’°¢–b‚&Vf÷&R’&WGW&â²&V6öã¢~ZûjùNˆ>Šù^iÊ®[Ù^XZ^iÊÎzyyºârÓ°¢–b†&Vf÷&RæW†6ÇVFVB’&WGW&â²&V6öã¢~ZûjùNˆ>Šù^KŠŞiÊÎzyyºîKˆŞŠêh¾XˆbrÓ°¢–b†ÖWG&–2ÓÓÒw&æ²rÇÂÖWG&–2ÓÓÒw÷6—F–öâr’°¢f"Òæ÷u·66÷UÒÂ"Ò&Vf÷&U·66÷UÒÂ¶W’ÒÖWG&–2ÓÓÒw&æ²ròvâr¢wW&6VçBs°¢–b†æ–çfÆ–BÇÂ"æ–çfÆ–B’&WGW&â²&V6öã¢~YŞjÊKˆîXø.ˆ>K«®i[KˆŞKˆˆ{NûÈÎŠû~XXjZû’rÓ°¢–b†¶¶W•ÒÓÓÒçVÆÂÇÂ%¶¶W•ÒÓÓÒçVÆÂ’&WGW&â²&V6öã¢ÖWG&–2ÓÓÒw&æ²rò~KŠNYË®˜;Ş™È[Ù^XZ^Šú^ˆÈ>Y»Ny¨NYŞjÊr¢~KŠNYË®˜;Ş™ÈiÈiXKØŞjùNûÈÎh‰nYŞjÊKˆîXø.ˆ>K«®i[rÓ°¢&WGW&â²&Vf÷&S¢%¶¶W•ÒÂgFW#¢¶¶W•ÒÂfÇVS¢&÷VæB†%¶¶W•ÒÒ¶¶W•Ò’ÂöÆE&æ³¢"ÂæWu&æ³¢Ó°¢Ğ¢–b†ÖWG&–2ÓÓÒw&FRr’°¢–b†æ÷rç&FRÓÓÒçVÆÂÇÂ&Vf÷&Rç&FRÓÓÒçVÆÂ’&WGW&â²&V6öã¢~KŠNYË®˜;Ş™ÈiÈiXiÈ{¸XˆnY(ÎkºXˆbrÓ°¢&WGW&â²&Vf÷&S¢&Vf÷&Rç&FRÂgFW#¢æ÷rç&FRÂfÇVS¢&÷VæB†æ÷rç&FRÒ&Vf÷&Rç&FR’Ó°¢Ğ¢–b†æ÷ræ7GVÂÓÓÒçVÆÂÇÂ&Vf÷&Ræ7GVÂÓÓÒçVÆÂ’&WGW&â²&V6öã¢~iÈKˆYË®[	®iÊ®[Ù^XZ^iÈ{¸XˆbrÓ°¢–b‚†æ÷ræÖ‚â’ÇÂæ÷ræÖ‚ÓÒ&Vf÷&RæÖ‚’&WGW&â²&V6öã¢~iÈ{¸kºXˆnKˆŞYÎûÈÎXúşXˆ~hÚ.[é~Xˆnxè~h‰nhé.YŞiú^yÈ²rÓ°¢–b†æ÷rç&FRÓÓÒçVÆÂÇÂ&Vf÷&Rç&FRÓÓÒçVÆÂ’&WGW&â²&V6öã¢~Xˆni[‹h^X{®iÈiXˆÈ>Y»NûÈÎŠû~XXjZû’rÓ°¢&WGW&â²&Vf÷&S¢&Vf÷&Ræ7GVÂÂgFW#¢æ÷ræ7GVÂÂfÇVS¢&÷VæB†æ÷ræ7GVÂÒ&Vf÷&Ræ7GVÂ’Ó°¢Ğ¢gVæ7F–öâ'V–ÆB†W†ÒÂW†×2Â÷F–öç2ÂÖöFVÂ’°¢f"ÖWG&–2Ò÷F–öç2æÖWG&–2ÇÂw66÷&RrÂ66÷RÒ÷F–öç2ç66÷RÇÂw–V"rÂ7W'&VçBÒÖöFVÂ†W†Ò“°¢f"†—7F÷'’ÒFFR†W†ÒæW†ÕöFFR’òW†×2æf–ÇFW"†gVæ7F–öâ†R’°¢&WGW&âRæ–BÓÒW†Òæ–BbbRæ—5ö†–FFVâbbFFR†RæW†ÕöFFR’bbRæW†ÕöFFRÂW†ÒæW†ÕöFFRbb‚÷F–öç2ç6ÖT6FVv÷'’ÇÂ7G&–ær†Ræw&FUöÆWfVÂÇÂrr’çG&–Ò‚’ÓÓÒ7G&–ær†W†Òæw&FUöÆWfVÂÇÂrr’çG&–Ò‚’“°¢Ò’ç6Æ–6R‚’ç6÷'B†gVæ7F–öâ†Â"’²&WGW&â"æW†ÕöFFRæÆö6ÆT6ö×&R†æW†ÕöFFR’ÇÂ7G&–ær†"æ7&VFVEöBÇÂrr’æÆö6ÆT6ö×&R…7G&–ær†æ7&VFVEöBÇÂrr’’ÇÂ7G&–ær†"æ–B’æÆö6ÆT6ö×&R…7G&–ær†æ–B’“²Ò’¢µÓ°¢gVæ7F–öâ6ö×&R‡&Wf–÷W2’°¢f"öÆBÒÖöFVÂ‡&Wf–÷W2’Âö–çG2ÒµÒÂÖ—76–ærÒµÓ°¢7W'&VçBæ–æ6ÇVFVBæf÷$V6‚†gVæ7F–öâ‡&÷r’°¢f"öÆE&÷rÒöÆBç&÷w2æf–æB†gVæ7F–öâ‡"’²&WGW&â"ææÖRÓÓÒ&÷rææÖS²Ò’Â&W7VÇBÒ—"‡&÷rÂöÆE&÷rÂÖWG&–2Â66÷R“°¢–b‡&W7VÇBç&V6öâ’Ö—76–ærçW6‚‡²æÖS¢&÷rææÖRÂ&V6öã¢&W7VÇBç&V6öâÒ“°¢VÇ6Rö–çG2çW6‚„ö&¦V7Bæ76–vâ‡²æÖS¢&÷rææÖRÒÂ&W7VÇB’“°¢Ò“°¢f"F÷FÂÒçVÆÂÂF÷FÅ&V6öâÒrs°¢–b†ÖWG&–2ÓÓÒw&æ²rÇÂÖWG&–2ÓÓÒw÷6—F–öâr’°¢f"Ò—"†7W'&VçBÂöÆBÂÖWG&–2Â66÷R“°¢–b‚ç&V6öâ’F÷FÂÒö&¦V7Bæ76–vâ‡²æÖS¢~h¾hé.YÒrÒÂ“²VÇ6RF÷FÅ&V6öâÒç&V6öã°¢ÒVÇ6R°¢f"6ÖU7V&¦V7G2Ò7W'&VçBæ–æ6ÇVFVBæÆVæwF‚âbb7W'&VçBæ–æ6ÇVFVBæÆVæwF‚ÓÓÒöÆBæ–æ6ÇVFVBæÆVæwF‚bb7W'&VçBæ–æ6ÇVFVBæWfW'’†gVæ7F–öâ‡"’²&WGW&âöÆBæ–æ6ÇVFVBç6öÖR†gVæ7F–öâ†ò’²&WGW&â"ææÖRÓÓÒòææÖRbb"æÖ‚ÓÓÒòæÖƒ²Ò“²Ò“°¢–b‡6ÖU7V&¦V7G2bb7W'&VçBæ6ö×ÆWFRbböÆBæ6ö×ÆWFRbb7W'&VçBæÖçVÂbböÆBæÖçVÂbb7W'&VçBç&FRÓÒçVÆÂbböÆBç&FRÓÒçVÆÂ’°¢F÷FÂÒÖWG&–2ÓÓÒw&FRrò²æÖS¢~h¾[é~XˆnxèrrÂ&Vf÷&S¢öÆBç&FRÂgFW#¢7W'&VçBç&FRÂfÇVS¢&÷VæB†7W'&VçBç&FRÒöÆBç&FR’Ò¢²æÖS¢~h¾XˆbrÂ&Vf÷&S¢öÆBçF÷FÂÂgFW#¢7W'&VçBçF÷FÂÂfÇVS¢&÷VæB†7W'&VçBçF÷FÂÒöÆBçF÷FÂ’Ó°¢ÒVÇ6RF÷FÅ&V6öâÒ7W'&VçBæÖçVÂÇÂöÆBæÖçVÂò~KÛşyJh˜¾Xªh¾XˆnûÈÎK¸^ZûjùNYNzyûÈÎKˆŞhêzé~h¾XˆnXùXÉn8"r¢~KŠNYË®ŠêXˆnzyyºî8kºXˆnh‰nX{®XˆnZèÎi[N[ªnKˆŞYÎûÈÎK¸^[^zK®XúşjùNzyyºî8"s°¢Ğ¢&WGW&â²ö–çG3¢ö–çG2ÂÖ—76–æs¢Ö—76–ærÂF÷FÃ¢F÷FÂÂF÷FÅ&V6öã¢F÷FÅ&V6öâÓ°¢Ğ¢f"6VÆV7FVBÒ÷F–öç2æ6ö×&T–Bò†—7F÷'’æf–æB†gVæ7F–öâ†R’²&WGW&âRæ–BÓÓÒ÷F–öç2æ6ö×&T–C²Ò’¢çVÆÃ°¢–b‚6VÆV7FVB’6VÆV7FVBÒ†—7F÷'’æf–æB†gVæ7F–öâ†R’²f"2Ò6ö×&R†R“²&WGW&â2çö–çG2æÆVæwF‚ÇÂ2çF÷FÃ²Ò’ÇÂ†—7F÷'•³Ó°¢&WGW&âö&¦V7Bæ76–vâ‡²ÖWG&–3¢ÖWG&–2Â66÷S¢66÷RÂ†—7F÷'“¢†—7F÷'’Â&Wf–÷W3¢6VÆV7FVBÇÂçVÆÂÒÂ6VÆV7FVBò6ö×&R‡6VÆV7FVB’¢²ö–çG3¢µÒÂÖ—76–æs¢µÒÂF÷FÃ¢çVÆÂÂF÷FÅ&V6öã¢rrÒ“°¢Ğ¢v–æF÷rå66÷&TW†Ô6†ævW2Ò²'V–ÆC¢'V–ÆBÓ°§Ò’‚“° ¢ò¢ÓÓÓÓÒW†Ò×&VfÆV7F–öâæ§2ÓÓÓÓÒ¢ğ¢ò¢&—fFRW†Òæ÷FW3¢Æö6ÂG&gBÂ6Æ÷VB42ÂW‡Æ–6—B6öæfÆ–7B&W6öÇWF–öââ¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"7W'&VçBÒçVÆÃ°¢gVæ7F–öâ6ÖT÷væW"†2’²&WGW&â2æF—7÷6VBbb2æ÷F–öç2æ÷vç2‚“²Ğ¢gVæ7F–öâfÆ–B†FF’²&WGW&âFFbbG—VöbFFç&VfÆV7F–öâÓÓÒw7G&–ærrbbçVÖ&W"æ—56fT–çFVvW"†FFç&VfÆV7F–öå÷&Wf—6–öâ’bbFFç&VfÆV7F–öå÷&Wf—6–öâãÒ²Ğ¢gVæ7F–öâF—'G’†2’²&WGW&â2çFW‡BÓÒ2æ&6RÇÂ†2ç6f–ærbb2çFW‡BÓÒ2ç6VçB“²Ğ¢gVæ7F–öâG&gB†2’°¢G'’°¢–b†F—'G’†2’’Æö6Å7F÷&vRç6WD—FVÒ†2æ¶W’Â¥4ôâç7G&–æv–g’‡²FW‡C¢2çFW‡BÂ&6S¢2æ&6RÂ&Wf—6–öã¢2ç&Wf—6–öâÂC¢FFRææ÷r‚’Ò’“°¢VÇ6R°¢òòFòæ÷B&VÖ÷fRæWvW"G&gBæ÷F†W"F"†2w&—GFVâÖVçv†–ÆRà¢f"6fVBÒ¥4ôâç'6R†Æö6Å7F÷&vRævWD—FVÒ†2æ¶W’’ÇÂvçVÆÂr“°¢–b‚6fVBÇÂ6fVBçFW‡BÓÓÒ2çFW‡B’Æö6Å7F÷&vRç&VÖ÷fT—FVÒ†2æ¶W’“°¢Ğ¢2æÆö6ÂÒG'VS°¢Ò6F6‚…ò’²2æÆö6ÂÒfÇ6S²Ğ¢Ğ¢gVæ7F–öâ7FGW2†2’°¢–b†2æÆöF–ær’&WGW&â~jÚ>YÊŠû¾Xùn[{.KùŞZÙy¨NXøŞh	Ş(
bs°¢–b†2æ6öæfÆ–7B’&WGW&â~XúnKˆZHNiÈikXh^ZëûÈÎŠû~XX˜hºŠhKùŞyYy¨Nx˜iÊÎ8"s°¢–b†2æW'&÷"’&WGW&â2æW'&÷"²†F—'G’†2’ò2æÆö6Âòr+rˆØz‹ş[{.yYYÊiÊÎiË¢r¢r+rŠû~i¨.X»şX[>™zŞš^™Ú"r¢rr“°¢–b†2ç6f–ær’&WGW&â~jÚ>YÊKùŞZÙ(
bs°¢–b†F—'G’†2’’&WGW&â2æÆö6Âò~ˆØz‹ş[{.KùŞyYûÈÎzˆŞYîˆz®XªYÎjÚRr¢~zØ[è^YÎjÚ^ûÈÎŠû~i¨.X»şX[>™zŞš^™Ú"s°¢&WGW&â2çWFFVBò~[{.KùŞZÙ‚+rr²æWrFFR†2çWFFVB’çFôÆö6ÆU7G&–ær‚w¦‚Ô4ârÂ²ÖöçFƒ¢vçVÖW&–2rÂF“¢vçVÖW&–2rÂ†÷W#¢s"ÖF–v—BrÂÖ–çWFS¢s"ÖF–v—BrÒ’¢~ˆz®XªKùŞZÙ‚+rXúş™¨şi{n{º~{ºŞŠ^XXRs°¢Ğ¢gVæ7F–öâ–çB†2’°¢–b‚2æ†÷7BÇÂ2æ†÷7Bæ—46öææV7FVBÇÂ6ÖT÷væW"†2’’&WGW&ã°¢f"f–VÆBÒ2æ†÷7BçVW'•6VÆV7F÷"‚wFW‡F&Vr“°¢–b‚f–VÆB’&WGW&ã°¢f–VÆBæF—6&ÆVBÒ2æÆöF–ærÇÂ‚2ç&VG’bb2ç&W7F÷&VB“°¢–b†f–VÆBçfÇVRÓÒ2çFW‡B’f–VÆBçfÇVRÒ2çFW‡C°¢f"Æ—fRÒ2æ†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâ×7FGW5Òr“°¢Æ—fRçFW‡D6öçFVçBÒ7FGW2†2“²Æ—fRæ6Æ74Æ—7BçFövvÆR‚vVB×&VfÆV7F–öâÖW'&÷"rÂ2æW'&÷"ÇÂ2æ6öæfÆ–7BÇÂ‚2æÆö6ÂbbF—'G’†2’’“°¢2æ†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâÖ6÷VçEÒr’çFW‡D6öçFVçBÒ2çFW‡BæÆVæwF‚²ròs°¢f"&WG'’Ò2æ†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâ×6fUÒr“°¢&WG'’æ†–FFVâÒ2æÆöF–ærÇÂ2ç6f–ærÇÂ2æ6öæfÆ–7BÇÂ‚F—'G’†2’bb2æW'&÷"“²&WG'’çFW‡D6öçFVçBÒ2ç&VG’ò~z¸¾XÛ>KùŞZÙ‚r¢~˜xŞikŠû¾Xùbs°¢f"6öæfÆ–7BÒ2æ†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâÖ6öæfÆ–7EÒr“°¢6öæfÆ–7Bæ†–FFVâÒ2æ6öæfÆ–7C°¢–b†2æ6öæfÆ–7B’6öæfÆ–7BçVW'•6VÆV7F÷"‚wr’çFW‡D6öçFVçBÒ2æ6öæfÆ–7Bç&VfÆV7F–öâÇÂ~ûÈK©zºşXh^ZëK‹®z›®ûÈ’s°¢Ğ¢gVæ7F–öâWFFTW†Ò†2ÂFF’°¢‡7FFRæÆÄW†×2ÇÂ7FFRæW†×2ÇÂµÒ’æf÷$V6‚†gVæ7F–öâ†W†Ò’²–b†W†Òæ–BÓÓÒ2æ÷F–öç2æW†Ô–B’ö&¦V7Bæ76–vâ†W†ÒÂFF“²Ò“°¢‡7FFRæW†×2ÇÂµÒ’æf÷$V6‚†gVæ7F–öâ†W†Ò’²–b†W†Òæ–BÓÓÒ2æ÷F–öç2æW†Ô–B’ö&¦V7Bæ76–vâ†W†ÒÂFF“²Ò“°¢Ğ¢7–æ2gVæ7F–öâ&WVW7B†2Â7F–öâÂ–ÆöB’°¢–b‚6ÖT÷væW"†2’’F‡&÷ræWrW'&÷"‚~‹JnXû~[{.Xˆ~hÚ"r“°¢f"6öçG&öÆÆW"ÒæWr&÷'D6öçG&öÆÆW"‚’ÂF–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²6öçG&öÆÆW"æ&÷'B‚“²ÒÂS“°¢2æ&÷'BÒ6öçG&öÆÆW#°¢G'’°¢f"&W7öç6RÒv—BfWF6‚‚rö’÷66÷&R×G&6¶W"ÖFFÖ’rÂ²ÖWF†öC¢uõ5BrÂ†VFW'3¢²t6öçFVçBÕG—Rs¢vÆ–6F–öâö§6öârÒÂ6–væÃ¢6öçG&öÆÆW"ç6–væÂÂ¶VWÆ—fS¢G'VRÀ¢&öG“¢¥4ôâç7G&–æv–g’„ö&¦V7Bæ76–vâ‡²7F–öã¢7F–öâÂFö¶Vã¢2æ÷F–öç2çFö¶VâÂW†Ô–C¢2æ÷F–öç2æW†Ô–BÒÂ–ÆöBÇÂ·Ò’’Ò“°¢f"FFÒv—B&W7öç6Ræ§6öâ‚“°¢–b‚&W7öç6Ræö²’²f"W'&÷"ÒæWrW'&÷"‡&W7öç6Rç7FGW2ÓÓÒCò~y›¾[Ù^[{.ZKiXûÈÎŠû~˜xŞiky›¾[Ù^Yî{º~{ºŞYÎjÚRr¢FFæW'&÷"ÇÂ~i¨.i{nizk9^YÎjÚ^ûÈÎŠû~˜xŞŠùRr“²W'&÷"ç7FGW2Ò&W7öç6Rç7FGW3²W'&÷"æ7W'&VçBÒFFæ7W'&VçC²F‡&÷rW'&÷#²Ğ¢–b‚fÆ–B†FF’’F‡&÷ræWrW'&÷"‚~‹ùNY¹îXh^ZëKˆŞZèÎi[NûÈÎŠû~˜xŞŠùRr“°¢&WGW&âFF°¢Òf–æÆÇ’²6ÆV%F–ÖV÷WB‡F–ÖW"“²–b†2æ&÷'BÓÓÒ6öçG&öÆÆW"’2æ&÷'BÒçVÆÃ²Ğ¢Ğ¢gVæ7F–öâ66†VGVÆR†2’°¢6ÆV%F–ÖV÷WB†2çF–ÖW"“°¢–b†F—'G’†2’bb2æ6ö×÷6–ærbb2æ6öæfÆ–7B’2çF–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²6fR†2“²ÒÂ“°¢Ğ¢7–æ2gVæ7F–öâ6fR†2’°¢6ÆV%F–ÖV÷WB†2çF–ÖW"“°¢–b‚6ÖT÷væW"†2’ÇÂ2ç&VG’ÇÂ2ç6f–ærÇÂ2æÆöF–ærÇÂ2æ6ö×÷6–ærÇÂ2æ6öæfÆ–7BÇÂF—'G’†2’’&WGW&ã°¢f"6VçBÒ2çFW‡C²2ç6VçBÒ6VçC²2ç6f–ærÒG'VS²2æW'&÷"Òrs²G&gB†2“²–çB†2“°¢G'’°¢f"FFÒv—B&WVW7B†2Âw6fUöW†Õ÷&VfÆV7F–öârÂ²FW‡C¢6VçBÂ&Wf—6–öã¢2ç&Wf—6–öâÒ“°¢–b‚6ÖT÷væW"†2’’&WGW&ã°¢2æ&6RÒFFç&VfÆV7F–öã²2ç&Wf—6–öâÒFFç&VfÆV7F–öå÷&Wf—6–öã²2çWFFVBÒFFç&VfÆV7F–öå÷WFFVEöC°¢WFFTW†Ò†2ÂFF“²G&gB†2“°¢G'’²–b‡v–æF÷råõ÷66÷&UG&6¶W%G&6²’v–æF÷råõ÷66÷&UG&6¶W%G&6²‚vW†Õ÷&VfÆV7F–öå÷6fVBrÂ²6÷W&6S¢vW†ÕöFWF–ÂrÒ“²Ò6F6‚…ò’·Ğ¢Ò6F6‚†R’°¢–b‚6ÖT÷væW"†2’’&WGW&ã°¢–b†Rç7FGW2ÓÓÒC’bbfÆ–B†Ræ7W'&VçB’’2æ6öæfÆ–7BÒRæ7W'&VçC°¢VÇ6R2æW'&÷"ÒRææÖRÓÓÒt&÷'DW'&÷"rò~YÎjÚ^‹h^i{nûÈÎŠû~˜xŞŠùRr¢RæÖW76vRÇÂ~i¨.i{nizk9^YÎjÚ^ûÈÎŠû~˜xŞŠùRs°¢G&gB†2“°¢Òf–æÆÇ’°¢2ç6f–ærÒfÇ6S²–çB†2“°¢–b‡6ÖT÷væW"†2’bb2æW'&÷"bb2æ6öæfÆ–7B’66†VGVÆR†2“°¢Ğ¢Ğ¢7–æ2gVæ7F–öâÆöB†2’°¢–b†2æÆöF–ærÇÂ6ÖT÷væW"†2’’&WGW&ã°¢2æÆöF–ærÒG'VS²2æW'&÷"Òrs²–çB†2“°¢G'’°¢f"FFÒv—B&WVW7B†2ÂvvWEöW†Õ÷&VfÆV7F–öâr“°¢–b‚6ÖT÷væW"†2’’&WGW&ã°¢2ç&VG’ÒG'VS²2çWFFVBÒFFç&VfÆV7F–öå÷WFFVEöC°¢WFFTW†Ò†2ÂFF“°¢–b†2ç&W7F÷&VBbb2çFW‡BÓÒFFç&VfÆV7F–öâbb2æ&6RÓÒFFç&VfÆV7F–öâbb2ç&Wf—6–öâÓÒFFç&VfÆV7F–öå÷&Wf—6–öâ’2æ6öæfÆ–7BÒFF°¢VÇ6R²–b‚2ç&W7F÷&VBÇÂ2çFW‡BÓÓÒFFç&VfÆV7F–öâ’2çFW‡BÒFFç&VfÆV7F–öã²2æ&6RÒFFç&VfÆV7F–öã²2ç&Wf—6–öâÒFFç&VfÆV7F–öå÷&Wf—6–öã²Ğ¢2ç&W7F÷&VBÒfÇ6S²G&gB†2“°¢Ò6F6‚†R’²–b‡6ÖT÷væW"†2’’2æW'&÷"ÒRææÖRÓÓÒt&÷'DW'&÷"rò~Šû¾Xùn‹h^i{nûÈÎŠû~˜xŞŠùRr¢RæÖW76vRÇÂ~Šû¾XùnZK‹J^ûÈÎŠû~˜xŞŠùRs²Ğ¢f–æÆÇ’²2æÆöF–ærÒfÇ6S²–çB†2“²–b‡6ÖT÷væW"†2’bb2æW'&÷"’66†VGVÆR†2“²Ğ¢Ğ¢gVæ7F–öâÖ÷VçB††÷7BÂ÷F–öç2’°¢f"¶W’Òw7EöW†Õ÷&VfÆV7F–öå÷còr²÷F–öç2çW6W$–B²uòr²÷F–öç2æW†Ô–BÂ2Ò7W'&VçC°¢–b‚2ÇÂ2æ¶W’ÓÒ¶W’ÇÂ2æ÷F–öç2çFö¶VâÓÒ÷F–öç2çFö¶VâÇÂ6ÖT÷væW"†2’’°¢–b†2’²6ÆV%F–ÖV÷WB†2çF–ÖW"“²2æF—7÷6VBÒG'VS²–b†2æ&÷'B’2æ&÷'Bæ&÷'B‚“²Ğ¢2Ò²¶W“¢¶W’Â÷F–öç3¢÷F–öç2ÂFW‡C¢rrÂ&6S¢rrÂ&Wf—6–öã¢ÂWFFVC¢çVÆÂÂÆö6Ã¢G'VRÂ&VG“¢fÇ6RÓ°¢G'’²f"6fVBÒ¥4ôâç'6R†Æö6Å7F÷&vRævWD—FVÒ†¶W’’ÇÂvçVÆÂr“²–b‡6fVBbbG—Vöb6fVBçFW‡BÓÓÒw7G&–ærrbbG—Vöb6fVBæ&6RÓÓÒw7G&–ærrbbçVÖ&W"æ—56fT–çFVvW"‡6fVBç&Wf—6–öâ’’²2çFW‡BÒ6fVBçFW‡C²2æ&6RÒ6fVBæ&6S²2ç&Wf—6–öâÒ6fVBç&Wf—6–öã²2ç&W7F÷&VBÒG'VS²ÒÒ6F6‚…ò’²2æÆö6ÂÒfÇ6S²Ğ¢7W'&VçBÒ3°¢Ğ¢2æ†÷7BÒ†÷7C°¢†÷7Bæ–ææW$…DÔÂÒsÆF—b6Æ73Ò&VB×6V7F–öâÖ†VB#ãÆF—cãÇ7â6Æ73Ò&VBÖW–V'&÷r#ãBòZHŞy¹ƒÂ÷7ããÆƒ"–CÒ&VB×&VfÆV7F–öâ×F—FÆR#îˆ>YîXøŞh	ÓÂöƒ#ãÇ–CÒ&VB×&VfÆV7F–öâÖ†–çB#îŠëKˆ¾‹ùjÊX®[é~Z[Şy¨NYËik8XÚKØşy¨NXéşYºûÈÎh‰nKˆ¾jÊh;>[	ŞŠù^y¨Nikk9^8#Â÷ãÂöF—cãÇ7â6Æ73Ò&VB×&VfÆV7F–öâ×&—fFR#îKŠ®K«®Šë[ÙSÂ÷7ããÂöF—câr°¢sÇFW‡F&V&–ÖÆ&VÆÆVF'“Ò&VB×&VfÆV7F–öâ×F—FÆR"&–ÖFW67&–&VF'“Ò&VB×&VfÆV7F–öâÖ†–çB"Ö†ÆVæwFƒÒ#"&÷w3Ò#R"Æ6V†öÆFW#Ò.jùNZh.ûÉ®i[ZÚniÈYîKŠNš)k*iÚ^[é~Xø®X®ûÈÎKˆ¾jÊh;>XXh¨®iÈh¨®húy¨Nš)X®ZèÎ8%Æîˆ»ŠúŞ‹ùjÊXXyÈ¾™zîš)XhŞŠû¾ih~zºûÈÎhIşŠxi»Nš®K¨n8""F—6&ÆVCãÂ÷FW‡F&Vâr°¢sÆF—b6Æ73Ò&VB×&VfÆV7F–öâÖfö÷FW"#ãÇ7âFF×&VfÆV7F–öâ×7FGW2&öÆSÒ'7FGW2"&–ÖÆ—fSÒ'öÆ—FR#ãÂ÷7ããÇ7âFF×&VfÆV7F–öâÖ6÷VçCãÂ÷7ããÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&VBÖ'WGFöâ"FF×&VfÆV7F–öâ×6fR†–FFVãîz¸¾XÛ>KùŞZÙƒÂö'WGFöããÂöF—câr°¢sÆF—b6Æ73Ò&VB×&VfÆV7F–öâÖ6öæfÆ–7B"FF×&VfÆV7F–öâÖ6öæfÆ–7B†–FFVããÇ7G&öæsîXúnKˆZHNKùŞZÙy¨NXh^Zë“Â÷7G&öæsãÇãÂ÷ãÆF—cãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&VBÖ'WGFöâ"FF×&VfÆV7F–öâÖ6Æ÷VCîKÛşyJK©zºşXh^Zë“Âö'WGFöããÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&VBÖ'WGFöâ"FF×&VfÆV7F–öâÖÖ–æSîKùŞyYh‰y¨NKúîiK“Âö'WGFöããÂöF—cãÇ6ÖÆÃîKˆ®ik‹é>XZ^jnKùŞyYyØKÚy¨NKúîiKûÈÎK™şXúşKº^XXY[›nKŠNjë^Xh^Zë8#Â÷6ÖÆÃãÂöF—câs°¢f"f–VÆBÒ†÷7BçVW'•6VÆV7F÷"‚wFW‡F&Vr“°¢f–VÆBæFDWfVçDÆ—7FVæW"‚v–çWBrÂgVæ7F–öâ‚’²2çFW‡BÒf–VÆBçfÇVS²2æW'&÷"Òrs²G&gB†2“²–çB†2“²66†VGVÆR†2“²Ò“°¢f–VÆBæFDWfVçDÆ—7FVæW"‚v6ö×÷6—F–öç7F'BrÂgVæ7F–öâ‚’²2æ6ö×÷6–ærÒG'VS²6ÆV%F–ÖV÷WB†2çF–ÖW"“²Ò“°¢f–VÆBæFDWfVçDÆ—7FVæW"‚v6ö×÷6—F–öæVæBrÂgVæ7F–öâ‚’²2æ6ö×÷6–ærÒfÇ6S²2çFW‡BÒf–VÆBçfÇVS²G&gB†2“²66†VGVÆR†2“²Ò“°¢f–VÆBæFDWfVçDÆ—7FVæW"‚v&ÇW"rÂgVæ7F–öâ‚’²6fR†2“²Ò“°¢†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâ×6fUÒr’æöæ6Æ–6²ÒgVæ7F–öâ‚’²–b†2ç&VG’’6fR†2“²VÇ6RÆöB†2“²Ó°¢†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâÖ6Æ÷VEÒr’æöæ6Æ–6²ÒgVæ7F–öâ‚’°¢–b‚2æ6öæfÆ–7BÇÂv–æF÷ræ6öæf—&Ò‚~KÛşyJK©zºşXh^ZëKÉ®i»şhÚ.Kˆ®ik[	®iÊ®YÎjÚ^y¨NKúîiKûÈÎzîZé®Y	~ûÉòr’’&WGW&ã°¢2çFW‡BÒ2æ6öæfÆ–7Bç&VfÆV7F–öã²2æ&6RÒ2çFW‡C²2ç&Wf—6–öâÒ2æ6öæfÆ–7Bç&VfÆV7F–öå÷&Wf—6–öã²2çWFFVBÒ2æ6öæfÆ–7Bç&VfÆV7F–öå÷WFFVEöC²WFFTW†Ò†2Â2æ6öæfÆ–7B“²2æ6öæfÆ–7BÒçVÆÃ²2æW'&÷"Òrs²G&gB†2“²–çB†2“°¢Ó°¢†÷7BçVW'•6VÆV7F÷"‚u¶FF×&VfÆV7F–öâÖÖ–æUÒr’æöæ6Æ–6²ÒgVæ7F–öâ‚’°¢–b‚2æ6öæfÆ–7B’&WGW&ã°¢2æ&6RÒ2æ6öæfÆ–7Bç&VfÆV7F–öã²2ç&Wf—6–öâÒ2æ6öæfÆ–7Bç&VfÆV7F–öå÷&Wf—6–öã²2çWFFVBÒ2æ6öæfÆ–7Bç&VfÆV7F–öå÷WFFVEöC²2æ6öæfÆ–7BÒçVÆÃ²2æW'&÷"Òrs²G&gB†2“²–çB†2“²6fR†2“°¢Ó°¢–çB†2“²–b‚2ç&VG’’ÆöB†2“°¢Ğ¢gVæ7F–öâÆVfR‚’°¢f"2Ò7W'&VçC²–b‚2ÇÂ6ÖT÷væW"†2’’&WGW&âG'VS°¢G&gB†2“²6fR†2“°¢–b†F—'G’†2’bb2æÆö6Âbbv–æF÷ræ6öæf—&Ò‚~XøŞh	Ş‹ùiÊ®YÎjÚ^ûÈÎK‰NiÊÎiË®izk9^KùŞyYˆØz‹ş8.zk¾[ÈXúşˆ;ŞKŠ.ZKKúîiKûÈÎK¸ŞŠhzk¾[ÈY	~ûÉòr’’&WGW&âfÇ6S°¢2æ†÷7BÒçVÆÃ²&WGW&âG'VS°¢Ğ¢v–æF÷ræFDWfVçDÆ—7FVæW"‚v&Vf÷&WVæÆöBrÂgVæ7F–öâ†R’²–b†7W'&VçBbb6ÖT÷væW"†7W'&VçB’bbF—'G’†7W'&VçB’’²G&gB†7W'&VçB“²–b‚7W'&VçBæÆö6Â’²Rç&WfVçDFVfVÇB‚“²Rç&WGW&åfÇVRÒrs²ÒÒÒ“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚vöæÆ–æRrÂgVæ7F–öâ‚’²–b†7W'&VçBbb6ÖT÷væW"†7W'&VçB’’²–b†7W'&VçBç&VG’’6fR†7W'&VçB“²VÇ6RÆöB†7W'&VçB“²ÒÒ“°¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚wf—6–&–Æ—G–6†ævRrÂgVæ7F–öâ‚’²–b†Fö7VÖVçBçf—6–&–Æ—G•7FFRÓÓÒv†–FFVârbb7W'&VçB’6fR†7W'&VçB“²Ò“°¢v–æF÷rå66÷&TW†Õ&VfÆV7F–öâÒ²Ö÷VçC¢Ö÷VçBÂÆVfS¢ÆVfRÓ°§Ò’‚“° ¢ò¢ÓÓÓÓÒVçG'’×&öÆÆ÷WBæ§2ÓÓÓÓÒ¢ğ¢òòF†Rf—'7B&öGV7F–öâ&VÆV6R–æ6ÇVFW2G&ç67&—F–öâæBÖçVÂ&Wf–WröæÇ’à§v–æF÷rå66÷&UW$VçG'”öæÇ’ÒG'VS° ¢ò¢ÓÓÓÓÒW"×&Wf–Wr×7W÷'Bæ§2ÓÓÓÓÒ¢ğ¢ò¢Æö6ÂWÆöB&V6÷fW'’æB6fVÇ’&VæFW&VB&W÷'Bf÷&×VÆ2â¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"FF&6RÂÖF„ÆöF–æs°¢gVæ7F–öâ÷VåWÆöG2‚’°¢–b‚v–æF÷ræ–æFW†VDD"’&WGW&â&öÖ—6Rç&W6öÇfR†çVÆÂ“°¢–b‚FF&6R’FF&6RÒæWr&öÖ—6R†gVæ7F–öâ‡&W6öÇfR’°¢f"&WVW7BÒ–æFW†VDD"æ÷Vâ‚w66÷&R×W"×WÆöG2×crÂ“°¢&WVW7BæöçWw&FVæVVFVBÒgVæ7F–öâ‚’²&WVW7Bç&W7VÇBæ7&VFTö&¦V7E7F÷&R‚wWÆöG2rÂ²¶W•Fƒ¢v¶W’rÒ“²Ó°¢&WVW7Bæöç7V66W72ÒgVæ7F–öâ‚’²&W6öÇfR‡&WVW7Bç&W7VÇB“²Ó°¢&WVW7BæöæW'&÷"Ò&WVW7Bæöæ&Æö6¶VBÒgVæ7F–öâ‚’²FF&6RÒçVÆÃ²&W6öÇfR†çVÆÂ“²Ó°¢Ò’æ6F6‚†gVæ7F–öâ‚’²FF&6RÒçVÆÃ²&WGW&âçVÆÃ²Ò“°¢&WGW&âFF&6S°¢Ğ¢7–æ2gVæ7F–öâWÆöG2†÷W&F–öâÂW6W"Â–BÂfÇVR’°¢f"F"Òv—B÷VåWÆöG2‚“²–b‚F"’&WGW&âçVÆÃ°¢&WGW&âæWr&öÖ—6R†gVæ7F–öâ‡&W6öÇfR’°¢f"G‚ÒF"çG&ç67F–öâ‚wWÆöG2rÂ÷W&F–öâÓÓÒvvWBròw&VFöæÇ’r¢w&VGw&—FRr’Â7F÷&RÒG‚æö&¦V7E7F÷&R‚wWÆöG2r’Â&W7VÇC°¢f"&WVW7BÒ÷W&F–öâÓÓÒwWBrò7F÷&RçWB„ö&¦V7Bæ76–vâ‡·ÒÂfÇVRÂ²¶W“¢W6W"²s¢r²–BÂ÷væW#¢W6W"Â–C¢–BÂC¢FFRææ÷r‚’Ò’’¢÷W&F–öâÓÓÒvFVÆWFRrò7F÷&RæFVÆWFR‡W6W"²s¢r²–B’¢÷W&F–öâÓÓÒvÆFW7Brò7F÷&RævWDÆÂ‚’¢7F÷&RævWB‡W6W"²s¢r²–B“°¢&WVW7Bæöç7V66W72ÒgVæ7F–öâ‚’°¢&W7VÇBÒ&WVW7Bç&W7VÇC°¢–b†÷W&F–öâÓÓÒvÆFW7Br’‡&W7VÇBÇÂµÒ’æf÷$V6‚†gVæ7F–öâ‡"’²–b„FFRææ÷r‚’Ò"æBãÒr¢ƒcC’7F÷&RæFVÆWFR‡"æ¶W’“²Ò“°¢–b†÷W&F–öâÓÓÒwWBr’7F÷&RævWDÆÂ‚’æöç7V66W72ÒgVæ7F–öâ†R’²RçF&vWBç&W7VÇBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"æ÷væW"ÓÓÒW6W#²Ò’ç6÷'B†gVæ7F–öâ†Â"’²&WGW&â"æBÒæC²Ò’æf÷$V6‚†gVæ7F–öâ‡"Â’’²–b†’ãÒ‚ÇÂFFRææ÷r‚’Ò"æBãÒr¢ƒcC’7F÷&RæFVÆWFR‡"æ¶W’“²Ò“²Ó°¢Ó°¢G‚æöæ6ö×ÆWFRÒgVæ7F–öâ‚’°¢–b†÷W&F–öâÓÓÒvÆFW7Br’&W7VÇBÒ‡&W7VÇBÇÂµÒ’æf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"æ÷væW"ÓÓÒW6W"bb"ç66÷RÓÓÒ–BbbFFRææ÷r‚’Ò"æBÂr¢ƒcC²Ò’ç6÷'B†gVæ7F–öâ†Â"’²&WGW&â"æBÒæC²Ò•³Ó°¢–b†÷W&F–öâÓÓÒvvWBrbb&W7VÇBbb‡&W7VÇBæ÷væW"ÓÒW6W"ÇÂFFRææ÷r‚’Ò&W7VÇBæBâr¢ƒcC’’&W7VÇBÒçVÆÃ°¢&W6öÇfR†÷W&F–öâÓÓÒwWBrÇÂ÷W&F–öâÓÓÒvFVÆWFRròG'VR¢&W7VÇBÇÂçVÆÂ“°¢Ó°¢G‚æöæW'&÷"ÒG‚æöæ&÷'BÒgVæ7F–öâ‚’²&W6öÇfR†çVÆÂ“²Ó°¢Ò’æ6F6‚†gVæ7F–öâ‚’²&WGW&âçVÆÃ²Ò“°¢Ğ¢gVæ7F–öâ67&—B‡7&2’°¢&WGW&âæWr&öÖ—6R†gVæ7F–öâ‡&W6öÇfRÂ&V¦V7B’²f"VÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w67&—Br“²VÂç7&2Ò7&3²VÂæöæÆöBÒ&W6öÇfS²VÂæöæW'&÷"Ò&V¦V7C²Fö7VÖVçBæ†VBæVæD6†–ÆB†VÂ“²Ò“°¢Ğ¢gVæ7F–öâVç7W&TÖF‚‚’°¢–b‡v–æF÷ræ¶FW‚bbv–æF÷rç&VæFW$ÖF„–äVÆVÖVçB’&WGW&â&öÖ—6Rç&W6öÇfR‚“°¢–b‚ÖF„ÆöF–ær’°¢f"Æ–æ²ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vÆ–æ²r“²Æ–æ²ç&VÂÒw7G–ÆW6†VWBs²Æ–æ²æ‡&VbÒrâ÷fVæF÷"ö¶FW‚ö¶FW‚æÖ–âæ773÷cÓã’ãs²Fö7VÖVçBæ†VBæVæD6†–ÆB†Æ–æ²“°¢ÖF„ÆöF–ærÒ67&—B‚râ÷fVæF÷"ö¶FW‚ö¶FW‚æÖ–âæ§3÷cÓã’ãr’çF†Vâ†gVæ7F–öâ‚’²&WGW&â67&—B‚râ÷fVæF÷"ö¶FW‚öWFò×&VæFW"æÖ–âæ§3÷cÓã’ãr“²Ò’æ6F6‚†gVæ7F–öâ†R’²ÖF„ÆöF–ærÒçVÆÃ²F‡&÷rS²Ò“°¢Ğ¢&WGW&âÖF„ÆöF–æs°¢Ğ¢gVæ7F–öâÆVv7”f÷&×VÆ‡fÇVR’°¢f"7WW'2Ò²~(s¢srÂ|+’s¢srÂ|+"s¢s"rÂ|+2s¢s2rÂ~(Bs¢sBrÂ~(Rs¢sRrÂ~(bs¢sbrÂ~(rs¢srrÂ~(‚s¢s‚rÂ~(’s¢s’rÂ~(²s¢rÒrÒÂ7V'2Ò²~((s¢srÂ~((s¢srÂ~(("s¢s"rÂ~((2s¢s2rÂ~((Bs¢sBrÂ~((Rs¢sRrÂ~((bs¢sbrÂ~((rs¢srrÂ~((‚s¢s‚rÂ~((’s¢s’rÓ°¢f"&W7VÇBÒfÇVRç&WÆ6R‚õ÷³"ÇÒörÂuÅÇVæFW&Æ–æWµÅÇVGÒr’ç&WÆ6R‚õ¾(+œ+,+>(N(^(n(~(((µÒ²örÂgVæ7F–öâ‡2’²&WGW&âuç²r²'&’æg&öÒ‡2’æÖ†gVæ7F–öâ†2’²&WGW&â7WW'5¶5Ó²Ò’æ¦ö–â‚rr’²wÒs²Ò’ç&WÆ6R‚õ¾((((((.((>((N((^((n((~((((•Ò²örÂgVæ7F–öâ‡2’²&WGW&âu÷²r²'&’æg&öÒ‡2’æÖ†gVæ7F–öâ†2’²&WGW&â7V'5¶5Ó²Ò’æ¦ö–â‚rr’²wÒs²Ò“°¢&W7VÇBÒ&W7VÇBç&WÆ6R‚õò…´Õ¦×¥ÕÆB§ÅÆB²’örÂu÷²CÒr’ç&WÆ6R‚õÅâ‚ÓõÆB·Å´Õ¦×¥Ò’örÂuç²CÒr’ç&WÆ6R‚ò…´Õ¦×¥Ò’…¾š¹KØîX‰ŞiÊ¾Y	[Ë{»>[©^h¾Zx¾{¸…Ò’…ÆB¢’örÂrC÷µÅÇFW‡G²C'ÒC7Òr’ç&WÆ6R‚ü+ÒörÂuÅÆg&7³×³'Òr’ç&WÆ6R‚õ¾(‰.(	5ÒörÂrÒr’ç&WÆ6R‚õ¼+|9uÒörÂuÅÆ6F÷Br’ç&WÆ6R‚üøörÂuÅÇ’r’ç&WÆ6R‚üë‚örÂuÅÇF†WFr’ç&WÆ6R‚üø’örÂuÅÆöÖVvr’ç&WÆ6R‚üëÂörÂuÅÆ×Rr’ç&WÆ6R‚üéBörÂuÅÄFVÇFr’ç&WÆ6R‚ş(šBörÂuÅÆÆRr’ç&WÆ6R‚ş(šRörÂuÅÆvRr’ç&WÆ6R‚ş(‰¥Â‚…µâ‚•Ò²•Â’örÂuÅÇ7'G²CÒr’ç&WÆ6R‚ş(‰¢…´Õ¦×£Ó•Ò²’örÂuÅÇ7'G²CÒr“°¢òòöæÇ’Æö6ÂFö×2&V6öÖRg&7F–öç3²æò6†ævRFòF†Rw&—GFVâ÷&FW"öb÷W&F–öç2à¢&WGW&â&W7VÇBç&WÆ6R‚ò…´Õ¦×¥Ò²ƒó¥µõåÕÇµµç·ÕÒµÇÒ’§ÅÆB²ƒó¥ÂåÆB²“ò•Âò…´Õ¦×¥Ò²ƒó¥µõåÕÇµµç·ÕÒµÇÒ’§ÅÆB²ƒó¥ÂåÆB²“ò’örÂuÅÆg&7²C×²C'Òr“°¢Ğ¢gVæ7F–öâÖ&´ÆVv7’‡&ö÷B’°¢f"vÆ¶W"ÒFö7VÖVçBæ7&VFUG&VUvÆ¶W"‡&ö÷BÂæöFTf–ÇFW"å4„õuõDU…B’ÂæöFW2ÒµÒÂæöFS°¢v†–ÆR‚†æöFRÒvÆ¶W"ææW‡DæöFR‚’’’–b‚æöFRç&VçDVÆVÖVçBæ6Æ÷6W7B‚wFW‡F&VÆ–çWBÇ6VÆV7BÇ67&—BÇ7G–ÆRÆ6öFRÇ&RÂæ¶FW‚Âç"ÖÖF‚×6÷W&6Rr’bbæöFRç&VçDVÆVÖVçBæ6Æ÷6W7B‚rç"×FW‡BÂç"ÖWf–FVæ6RÂç"×v–ç2Âç"×7V66W72r’’æöFW2çW6‚†æöFR“°¢æöFW2æf÷$V6‚†gVæ7F–öâ†æöFR’°¢f"÷&–v–æÂÒæöFRææöFUfÇVRÂ&÷FV7FVE&ævW2ÒµÒÂ&÷FV7FVDÖF6‚Â&÷FV7FVDÖF‚Òòƒó¥ÂEÂEµÇ5Å5Ò£õÂEÂGÅÂEµâEÆåÒµÂGÅÅÅÂ…µÇ5Å5Ò£õÅÅÂ—ÅÅÅÅµµÇ5Å5Ò£õÅÅÅÒ’ös°¢v†–ÆR‚‡&÷FV7FVDÖF6‚Ò&÷FV7FVDÖF‚æW†V2†÷&–v–æÂ’’’&÷FV7FVE&ævW2çW6‚…·&÷FV7FVDÖF6‚æ–æFW‚Â&÷FV7FVDÖF6‚æ–æFW‚²&÷FV7FVDÖF6…³ÒæÆVæwF…Ò“°¢f"&RÒõ´Õ¦×£ÓœøëŒøœëÌéL+ÕÕ´Õ¦×£ÓœøëŒøœëÌéN(‰®(‰¼+Şš¹KØîX‰ŞiÊ¾Y	[Ë{»>[©^h¾Zx¾{¸((Ş(((+œ+,+>(N(^(n(~(((µõç·Ò‚’ãÒ²¢ş(‰.(	3Ãî(šN(š\9|+rÕÒ¢örÂÆ7BÒÂg&vÖVçBÒFö7VÖVçBæ7&VFTFö7VÖVçDg&vÖVçB‚’ÂÖF6‚Â6†ævVBÒfÇ6S°¢v†–ÆR‚†ÖF6‚Ò&RæW†V2†÷&–v–æÂ’’’°¢–b‡&÷FV7FVE&ævW2ç6öÖR†gVæ7F–öâ‡&ævR’²&WGW&âÖF6‚æ–æFW‚ãÒ&ævU³ÒbbÖF6‚æ–æFW‚Â&ævU³Ó²Ò’’6öçF–çVS°¢f"fÇVRÒÖF6…³Ó°¢–b‚õ³Ş(šN(šSÃì+,+>(N(^(n(~(((+•õåÒòçFW7B‡fÇVR’ÇÂfÇVRæÆVæwF‚Â2ÇÂõ´Õ¦×¬øëŒøœëÌéEÒòçFW7B‡fÇVR’’6öçF–çVS°¢f"f÷&×VÆÒÆVv7”f÷&×VÆ‡fÇVR“°¢G'’²v–æF÷ræ¶FW‚ç&VæFW%Fõ7G&–ær†f÷&×VÆÂ²F‡&÷töäW'&÷#¢G'VRÂG'W7C¢fÇ6RÂÖ„W‡æC¢ÂÖ…6—¦S¢"Â7G&–7C¢v–væ÷&RrÒ“²Ò6F6‚…ò’²6öçF–çVS²Ğ¢g&vÖVçBæVæD6†–ÆB†Fö7VÖVçBæ7&VFUFW‡DæöFR†÷&–v–æÂç6Æ–6R†Æ7BÂÖF6‚æ–æFW‚’’“°¢f"7âÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7âr“²7âæ6Æ74æÖRÒw"ÖÖF‚×6÷W&6Rs²7âçFW‡D6öçFVçBÒuÅÂ‚r²f÷&×VÆ²uÅÂ’s²g&vÖVçBæVæD6†–ÆB‡7â“°¢Æ7BÒÖF6‚æ–æFW‚²fÇVRæÆVæwFƒ²6†ævVBÒG'VS°¢Ğ¢–b†6†ævVB’²g&vÖVçBæVæD6†–ÆB†Fö7VÖVçBæ7&VFUFW‡DæöFR†÷&–v–æÂç6Æ–6R†Æ7B’’“²æöFRç&WÆ6Uv—F‚†g&vÖVçB“²Ğ¢Ò“°¢Ğ¢7–æ2gVæ7F–öâ&VæFW$ÖF‚‡&ö÷B’°¢G'’°¢v—BVç7W&TÖF‚‚“²–b‚&ö÷Bæ—46öææV7FVB’&WGW&ã°¢Ö&´ÆVv7’‡&ö÷B“°¢v–æF÷rç&VæFW$ÖF„–äVÆVÖVçB‡&ö÷BÂ²FVÆ–Ö—FW'3¢·²ÆVgC¢rBBrÂ&–v‡C¢rBBrÂF—7Æ“¢G'VRÒÂ²ÆVgC¢uÅÅ²rÂ&–v‡C¢uÅÅÒrÂF—7Æ“¢G'VRÒÂ²ÆVgC¢uÅÂ‚rÂ&–v‡C¢uÅÂ’rÂF—7Æ“¢fÇ6RÒÂ²ÆVgC¢rBrÂ&–v‡C¢rBrÂF—7Æ“¢fÇ6RÕÒÂ–væ÷&VEFw3¢²w67&—BrÂw7G–ÆRrÂwFW‡F&VrÂw&RrÂv6öFRrÂv÷F–öâuÒÂ–væ÷&VD6Æ76W3¢²v¶FW‚uÒÂF‡&÷töäW'&÷#¢fÇ6RÂG'W7C¢fÇ6RÂÖ„W‡æC¢ÂÖ…6—¦S¢"Â7G&–7C¢v–væ÷&RrÒ“°¢Ò6F6‚…ò’²ò¢¶VW&VF&ÆR6÷W&6Rv†VâF†RÆö6ÂÖF‚76WB6ææ÷B&RÆöFVBâ¢òĞ¢Ğ¢gVæ7F–öâv–ç2‡’°¢&WGW&â‡çv–ç2ÇÂµÒ’æÖ†gVæ7F–öâ‡r’°¢–b‡ræ&6—2ÓÓÒwv÷&²rbbõâƒó¥´Ô…×³Ã‡×Å²²ÕÓõÆB²ƒó¥ÂåÆB²“òƒó¥´Õ¦×¢ü+,+5Ò²“÷ÎZJ~K¨çÎ[şK¨çÎzØK¨çÎy»zØ—ÎKˆŞy»zØ—ÎjÚ>zçÎ™IŠú÷ÎiŠ÷ÎY
b’BòçFW7B‡ræö'6W'fVBçG&–Ò‚’’’&WGW&â²6¶–ÆÃ¢~[{.{¹X{®iÊÎ[ş™zîy¨NXŠNijÒrÂö'6W'fVC¢ræö'6W'fVBÂ6–væ–f–6æ6S¢~h¨®X[>™JîynyKŠ^XX^X{®iÚ^ûÈÎXúşKº^[Ú.h‰ZèÎi[Ny¨N[é~XˆnjÚ^šªN8"rÂ&6—3¢wv÷&µ÷&W7VÇBrÓ°¢&WGW&âs°¢Ò“°¢Ğ¢òò&VF–ær×F–ÖR&ö¦V7F–öâöbW†—7F–ærGf–6RÂæWfW"æWrF–væ÷6—2÷"ÖöFVÂ6ÆÂà¢gVæ7F–öâæW‡DW†ÕF—2‡&W÷'B’°¢–b‚&W÷'BÇÂ&W÷'Bç&V6÷&EööæÇ’ÇÂ&W÷'BææÇ—6—5÷7FÆRÇÂ&W÷'Bçv÷&µööå÷W"ÓÓÒfÇ6Rbb‡&W÷'Bç6÷W&6U÷vW2ÇÂµÒ’ç6öÖR†gVæ7F–öâ‡’²&WGW&âç&öÆRÓÓÒwv÷&²s²Ò’’&WGW&âµÓ°¢f"VW7F–öç2Ò‡&W÷'BçVW7F–öç2ÇÂµÒ’æf–ÇFW"†gVæ7F–öâ‡’°¢–b‡ç&V6÷&EööæÇ’ÇÂç&Wf–Wu÷7FGW2bbç&Wf–Wu÷7FGW2ÓÒw&Wf–WvVBrÇÂç66÷&U÷fW&–f–6F–öâÓÓÒv6öæfÆ–7BrÇÂ²w7G&VæwF‚rÂv•÷7G&VæwF‚rÂvæVVG5ö6öæf—&ÖF–öârÂwVW7F–öåöwV–Fæ6RuÒæ–æ6ÇVFW2‡ææÇ—6—5öÖöFR’’&WGW&âfÇ6S°¢–b‡çFV6†W%÷66÷&RÒçVÆÂbbæÖ…÷66÷&RÒçVÆÂbbçFV6†W%÷66÷&RãÒæÖ…÷66÷&RÇÂæ•öw&F–ærbbæ•öw&F–ærç7FGW2ÓÓÒv6öæf—&ÖVBrbbæ•öw&F–ærçfW&F–7BÓÓÒv6÷'&V7Br’&WGW&âfÇ6S°¢f"&VF&ÆRÒG—Vöbæç7vW"ÓÓÒw7G&–ærrbbæç7vW"çG&–Ò‚’bbç7FGW2ÓÒwVæ6ÆV"rbbç7FGW2ÓÒv&Ææ²p¢ÇÂ‡ç7V''G2ÇÂµÒ’ç6öÖR†gVæ7F–öâ‡’²&WGW&âç7FGW2ÓÓÒvç7vW&VBrbbæç7vW#²Ò“°¢f"—77VRÒæf—'7Eö—77VRbbæf—'7Eö—77VRæ6W'F–çG’ÓÓÒv6öæf—&ÖVBs°¢f"Æ÷72ÒG—VöbçFV6†W%÷66÷&RÓÓÒvçVÖ&W"rbbG—VöbæÖ…÷66÷&RÓÓÒvçVÖ&W"rbbçFV6†W%÷66÷&RÂæÖ…÷66÷&S°¢f"w&FVBÒæ•öw&F–ærbbæ•öw&F–ærç7FGW2ÓÓÒv6öæf—&ÖVBrbb²v–æ6÷'&V7BrÂw'F–ÂuÒæ–æ6ÇVFW2‡æ•öw&F–ærçfW&F–7B“°¢&WGW&â&VF&ÆRbb†—77VRÇÂÆ÷72ÇÂw&FVB’bbG—VöbçG&ç6fW%÷'VÆRÓÓÒw7G&–ærrbbçG&ç6fW%÷'VÆRçG&–Ò‚“°¢Ò“°¢f"&W7VÇBÒµÒÂW6VBÒæWr6WB‚“°¢gVæ7F–öâ'VÆT¶W’‡fÇVR’²&WGW&âfÇVRææ÷&ÖÆ—¦R‚täd´2r’ç&WÆ6R‚õÇ2²örÂrr’ç&WÆ6R‚õÂ¥Â¢örÂrr’ç&WÆ6R‚õ¾8"âûÈ¾ûÉµÒ²BòÂrr“²Ğ¢gVæ7F–öâFB‡’°¢f"¶W’Ò'VÆT¶W’‡çG&ç6fW%÷'VÆR“°¢f"W†—7F–ærÒ&W7VÇBæf–æB†gVæ7F–öâ‡F—’²&WGW&â'VÆT¶W’‡F—çFW‡B’ÓÓÒ¶W“²Ò“°¢–b†W†—7F–ær’²–b‚W†—7F–ærçVW7F–öç2æ–æ6ÇVFW2‡æÆ&VÂ’’W†—7F–ærçVW7F–öç2çW6‚‡æÆ&VÂ“²W6VBæFB‡æÆ&VÂ“²&WGW&ã²Ğ¢–b‡&W7VÇBæÆVæwF‚ãÒ2ÇÂW6VBæ†2‡æÆ&VÂ’’&WGW&ã°¢&W7VÇBçW6‚‡²FW‡C¢çG&ç6fW%÷'VÆRçG&–Ò‚’ÂVW7F–öç3¢·æÆ&VÅÒÒ“²W6VBæFB‡æÆ&VÂ“°¢Ğ¢òò¶VWF†R&W÷'Bw2ÆV&æ–ær&–÷&—F–W2Â'WBFòæ÷BGW&â—G2&7F–6RVW7F–öç2À¢òò6öÇWF–öç2÷"7V7VÆF—fRW‡ÆæF–öç2–çFòvVæW&–2W†Ò6†V6¶Æ—7Bà¢‡&W÷'Bæ7F–öå÷ÆâÇÂµÒ’æf÷$V6‚†gVæ7F–öâ†7F–öâ’°¢f"Ò†7F–öâçVW7F–öç2ÇÂµÒ’æÖ†gVæ7F–öâ†Æ&VÂ’²&WGW&âVW7F–öç2æf–æB†gVæ7F–öâ‡’²&WGW&âæÆ&VÂÓÓÒÆ&VÃ²Ò“²Ò¢æf–æB†gVæ7F–öâ‡’²&WGW&âbbW6VBæ†2‡æÆ&VÂ“²Ò“°¢–b‡’FB‡“°¢Ò“°¢VW7F–öç2æf÷$V6‚†FB“°¢&WGW&â&W7VÇC°¢Ğ¢òò6ÖÆÂÂFVÆ–&W&FVÇ’æöâÔ…DÔÂ&VæFW&W"â¶VWÖF‚÷VRv†–ÆRf÷&ÖGF–ær&÷6S°¢òòV÷FW2æBVF—F&ÆR6÷W&6RG&ç67&—G2æWfW"72F‡&÷Vv‚F†—2f÷&ÖGFW"à¢gVæ7F–öâ&÷6R‡fÇVR’°¢f"ÖF‚ÒµÒÂ6÷W&6RÒ7G&–ær‡fÇVRÓÒçVÆÂòrr¢fÇVR’ç&WÆ6R‚õÇ%ÆãòörÂuÆâr“°¢òò&—fFR×W6RÖ&¶W'27WÆ–VB'’ÖöFVÂ÷W6W"FW‡B×W7Bæ÷B–×W'6öæFRÆ6V†öÆFW'2à¢6÷W&6RÒ6÷W&6Rç&WÆ6R‚õµÇTSÇTSÒörÂrr“°¢6÷W&6RÒ6÷W&6Rç&WÆ6R‚õÂEÂEµÇ5Å5Ò£õÂEÂGÅÅÅÅµµÇ5Å5Ò£õÅÅÅ×ÅÅÅÂ…µÇ5Å5Ò£õÅÅÂ—ÅÂEµâEÆåÒµÂBörÂgVæ7F–öâ‡2’²ÖF‚çW6‚‡2“²&WGW&âuÇTSr²†ÖF‚æÆVæwF‚Ò’²uÇTSs²Ò“°¢gVæ7F–öâ–æÆ–æR‡2’°¢&WGW&âW66T‡FÖÂ‡2’ç&WÆ6R‚õÂ¥Â¢…µâ¥ÆåÒ²•Â¥Â¢örÂsÇ7G&öæsâCÂ÷7G&öæsâr¢ç&WÆ6R‚õÇTS…ÆB²•ÇTSörÂgVæ7F–öâ…òÂâ’²&WGW&âW66T‡FÖÂ†ÖF…´çVÖ&W"†â•ÒÇÂrr“²Ò“°¢Ğ¢f"‡FÖÂÒrrÂ&w&‚ÒµÒÂÆ—7BÒrrÂ—FV×2ÒµÓ°¢gVæ7F–öâfÇW6‚‚’²–b‡&w&‚æÆVæwF‚’²‡FÖÂ³ÒsÇâr²–æÆ–æR‡&w&‚æ¦ö–â‚uÆâr’’²sÂ÷âs²&w&‚ÒµÓ²Ò–b†—FV×2æÆVæwF‚’²‡FÖÂ³ÒsÂr²Æ—7B²sâr²—FV×2æ¦ö–â‚rr’²sÂòr²Æ—7B²sâs²—FV×2ÒµÓ²Æ—7BÒrs²ÒĞ¢6÷W&6Rç7Æ—B‚uÆâr’æf÷$V6‚†gVæ7F–öâ†Æ–æR’°¢f"—FVÒÒÆ–æRæÖF6‚‚õåÇ2¢ƒó¢…ÆB²•²â8×Â…²Ò®(
%Ò’•Ç2²‚â²’Bò’Â†VF–ærÒÆ–æRæÖF6‚‚õåÇ2¢7³ÃgÕÇ2²‚â²’Bò“°¢–b‚Æ–æRçG&–Ò‚’’²fÇW6‚‚“²&WGW&ã²Ğ¢–b††VF–ær’²fÇW6‚‚“²‡FÖÂ³ÒsÇ6Æ73Ò'"×&÷6RÖ†VF–ær#ãÇ7G&öæsâr²–æÆ–æR††VF–æu³Ò’²sÂ÷7G&öæsãÂ÷âs²&WGW&ã²Ğ¢–b†—FVÒ’²f"¶–æBÒ—FVÕ³ÒòvöÂr¢wVÂs²–b‡&w&‚æÆVæwF‚ÇÂÆ—7BbbÆ—7BÓÒ¶–æB’fÇW6‚‚“²Æ—7BÒ¶–æC²—FV×2çW6‚‚sÆÆ’r²†—FVÕ³ÒòrfÇVSÒ"r²çVÖ&W"†—FVÕ³Ò’²r"r¢rr’²sâr²–æÆ–æR†—FVÕ³5Ò’²sÂöÆ“âr“²&WGW&ã²Ğ¢–b†—FV×2æÆVæwF‚’fÇW6‚‚“²&w&‚çW6‚†Æ–æR“°¢Ò“°¢fÇW6‚‚“²&WGW&âsÆF—b6Æ73Ò'"×FW‡B"×&÷6R#âr²‡FÖÂ²sÂöF—câs°¢Ğ¢v–æF÷rå66÷&UW%7W÷'BÒ²WÆöG3¢WÆöG2Â&VæFW$ÖFƒ¢&VæFW$ÖF‚ÂÆVv7”f÷&×VÆ¢ÆVv7”f÷&×VÆÂv–ç3¢v–ç2Â&÷6S¢&÷6RÂæW‡DW†ÕF—3¢æW‡DW†ÕF—2Ó°§Ò’‚“° ¢ò¢ÓÓÓÓÒW"×&Wf–Wræ§2ÓÓÓÓÒ¢ğ¢ò¢7V&¦V7BÖÆWfVÂW"&Wf–Wrâ66÷&W2æBF†RW†—7F–ærf—6–öâV÷F&RVçF÷V6†VBâ¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢gVæ7F–öâVçG'”öæÇ’‚’²&WGW&âv–æF÷rå66÷&UW$VçG'”öæÇ’ÓÓÒG'VS²Ğ¢f"7W÷'BÒv–æF÷rå66÷&UW%7W÷'C°¢f"TäEô”åBÒrö’÷66÷&R×G&6¶W"×W"×&Wf–WrrÂÔ…õtU2ÒS°¢f"&öÆTæÖW2Ò²W#¢~Šù^XÛrrÂv÷&³¢~zÙNš)XÚòKÙÎzÙBrÂ&VfW&Væ6S¢~Xø.ˆ>zÙNj‚rÓ°¢f"W62ÒgVæ7F–öâ‡b’²&WGW&âW66T‡FÖÂ…7G&–ær‡bÓÒçVÆÂòrr¢b’“²Ó°¢gVæ7F–öâçVÖ&W"‡b’²&WGW&âbÓÓÒrrÇÂbÓÒçVÆÂÇÂçVÖ&W"æ—4f–æ—FR„çVÖ&W"‡b’’òçVÆÂ¢çVÖ&W"‡b“²Ğ¢gVæ7F–öâ÷væW"‚’²&WGW&â7G&–ær‡7FFRçW6W"bb7FFRçW6W"æ–BÇÂrr“²Ğ¢gVæ7F–öâ¶W’‡W6W"’²&WGW&âw7E÷W%öG&gG5÷còr²W6W#²Ğ¢gVæ7F–öâG&gG2‡W6W"’²G'’²&WGW&â¥4ôâç'6R†Æö6Å7F÷&vRævWD—FVÒ†¶W’‡W6W"’’ÇÂw·Òr“²Ò6F6‚…ò’²&WGW&â·Ó²ÒĞ¢gVæ7F–öâWDG&gB‡W6W"ÂæÖRÂfÇVR’²f"ÆÂÒG&gG2‡W6W"“²–b‡fÇVR’ÆÅ¶æÖUÒÒfÇVS²VÇ6RFVÆWFRÆÅ¶æÖUÓ²G'’²Æö6Å7F÷&vRç6WD—FVÒ†¶W’‡W6W"’Â¥4ôâç7G&–æv–g’†ÆÂ’“²Ò6F6‚…ò’·ÒĞ¢gVæ7F–öâG&gDf÷"‡W6W"Â–B’²f"ÆÂÒG&gG2‡W6W"’Â6Æ÷BÒ–BÇÂvæWrs²–b‚ÆÅ·6Æ÷EÒ’²ÆÅ·6Æ÷EÒÒ7'—Fòç&æFöÕUT”B‚“²WDG&gB‡W6W"Â6Æ÷BÂÆÅ·6Æ÷EÒ“²Ò&WGW&âÆÅ·6Æ÷EÓ²Ğ¢gVæ7F–öâ7W'&VçB†7G‚’²&WGW&â7G‚çW6W"ÓÓÒ÷væW"‚’bb7G‚çFö¶VâÓÓÒ7FFRçFö¶Vã²Ğ¢7–æ2gVæ7F–öâ’†7G‚Â7F–öâÂ–ÆöB’°¢–b†VçG'”öæÇ’‚’bb†7F–öãÓÓÒvæÇ—¦U÷&V6÷&BwÇÆ7F–öãÓÓÒw&WG'•÷66÷&W2wÇÆ7F–öãÓÓÒv6÷'&V7Brbg–ÆöBbg–ÆöBç&VæÇ—¦SÓÓ×G'VR’—F‡&÷ræWrW'&÷"‚~Šù^XÛ~Xˆniéi¨.iÊ®[ÈiKâr“°¢–b‚7W'&VçB†7G‚’’F‡&÷ræWrW'&÷"‚~‹JnXû~[{.Xˆ~hÚ.ûÈÎŠû~˜xŞikh™>[Èˆ>ŠùRr“°¢f"6öçG&öÆÆW"ÒæWr&÷'D6öçG&öÆÆW"‚’ÂF–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²6öçG&öÆÆW"æ&÷'B‚“²ÒÂ#“°¢G'’°¢f"&W2Òv—BfWF6‚„TäEô”åBÂ²ÖWF†öC¢uõ5BrÂ†VFW'3¢²t6öçFVçBÕG—Rs¢vÆ–6F–öâö§6öârÒÂ6–væÃ¢6öçG&öÆÆW"ç6–væÂÀ¢&öG“¢¥4ôâç7G&–æv–g’„ö&¦V7Bæ76–vâ‡²7F–öã¢7F–öâÂFö¶Vã¢7G‚çFö¶VâÒÂ–ÆöBÇÂ·Ò’’Ò“°¢f"FFÒv—B&W2æ§6öâ‚’æ6F6‚†gVæ7F–öâ‚’²&WGW&â·Ó²Ò“°¢–b‚7W'&VçB†7G‚’’F‡&÷ræWrW'&÷"‚~‹JnXû~[{.Xˆ~hÚ.ûÈÎŠû~˜xŞikh™>[Èˆ>ŠùRr“°¢–b‚&W2æö²’²f"W'"ÒæWrW'&÷"†FFæW'&÷"ÇÂ~Šù^XÛ~XˆniéiÈŞXªi¨.KˆŞXúşyJûÈÎŠû~zˆŞYî˜xŞŠùRr“²W'"ç7FGW2Ò&W2ç7FGW3²F‡&÷rW'#²Ğ¢&WGW&âFF°¢Ò6F6‚†R’²–b†RææÖRÓÓÒt&÷'DW'&÷"r’F‡&÷ræWrW'&÷"‚~‹ùîhê^‹h^i{nûÈÎŠû~zˆŞYîiú^yÈ¾XˆniéŠë[ÙRr“²F‡&÷rS²Ğ¢f–æÆÇ’²6ÆV%F–ÖV÷WB‡F–ÖW"“²Ğ¢Ğ¢gVæ7F–öâ&W&R†f–ÆR’°¢–b‚õæ–ÖvUÂò†§VwÇæwÇvV'’BòçFW7B†f–ÆRçG—R’’&WGW&â&öÖ—6Rç&V¦V7B†æWrW'&÷"‚~zÊÎKˆx˜iJşhÈ¥~8ä~8vV%Y»îx˜~ûÉµDbŠû~XXZûÎX{®K‹®Y»îx˜rr’“°¢–b†f–ÆRç6—¦Râ¢#B¢#B’&WGW&â&öÖ—6Rç&V¦V7B†æWrW'&÷"‚~XÙ^[ÊY»îx˜~Šû~hê~X‹nYÊ‚Ô"Kº^XhRr’“°¢&WGW&âæWr&öÖ—6R†gVæ7F–öâ‡&W6öÇfRÂ&V¦V7B’°¢f"W&ÂÒU$Âæ7&VFTö&¦V7EU$Â†f–ÆR’Â–ÖvRÒæWr–ÖvR‚“°¢–ÖvRæöæW'&÷"ÒgVæ7F–öâ‚’²U$Âç&Wfö¶Tö&¦V7EU$Â‡W&Â“²&V¦V7B†æWrW'&÷"‚~‹ù[ÊY»îx˜~h™>KˆŞ[ÈûÈÎŠû~˜xŞik˜hº’r’“²Ó°¢–ÖvRæöæÆöBÒgVæ7F–öâ‚’°¢f"6çf2ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚v6çf2r“°¢G'’°¢f"rÒ–ÖvRææGW&Åv–GF‚Â‚Ò–ÖvRææGW&Ä†V–v‡C°¢–b‚rÇÂ‚ÇÂr¢‚âC’F‡&÷ræWrW'&÷"‚~Y»îx˜~[®Zû‹ø~ZJ~ûÈÎŠû~Xˆnh‰Xzš^Kˆ®KÊr“°¢f"66ÆRÒÖF‚æÖ–âƒÂ3còÖF‚æÖ‚‡rÂ‚’“°¢6çf2çv–GF‚ÒÖF‚ç&÷VæB‡r¢66ÆR“²6çf2æ†V–v‡BÒÖF‚ç&÷VæB†‚¢66ÆR“°¢f"2Ò6çf2ævWD6öçFW‡B‚s&Br“²2æf–ÆÅ7G–ÆRÒr6ffbs²2æf–ÆÅ&V7BƒÂÂ6çf2çv–GF‚Â6çf2æ†V–v‡B“²2æG&t–ÖvR†–ÖvRÂÂÂ6çf2çv–GF‚Â6çf2æ†V–v‡B“°¢f"Væ6öFVBÒ6çf2çFôFFU$Â‚v–ÖvRö§VrrÂã“"“°¢–b†Væ6öFVBæÆVæwF‚â#ƒ’Væ6öFVBÒ6çf2çFôFFU$Â‚v–ÖvRö§VrrÂãƒ"“°¢–b†Væ6öFVBæÆVæwF‚â#ƒ’F‡&÷ræWrW'&÷"‚~Y»îx˜~Xh^Zë‹ø~ZI®ûÈÎŠû~Š8Xš®h‰XÙ^š^YîXhŞ˜’r“°¢&W6öÇfR‡²W&Ã¢Væ6öFVBÂæÖS¢f–ÆRææÖRÂ&Vv–öç3¢FWF–Å&Vv–öç2†–ÖvRÂrÂ‚’Ò“°¢Ò6F6‚†R’²&V¦V7B†R“²Òf–æÆÇ’²U$Âç&Wfö¶Tö&¦V7EU$Â‡W&Â“²6çf2çv–GF‚Ò6çf2æ†V–v‡BÒ²Ğ¢Ó°¢–ÖvRç7&2ÒW&Ã°¢Ò“°¢Ğ¢gVæ7F–öâFWF–Å&Vv–öç2‡6÷W&6RÂrÂ‚’°¢òòvVöÖWG'’Ö&6VBF–ÆW2¶VW6ÖÆÂÖ&·2&VF&ÆRv—F†÷WB77VÖ–ær6öÇVÖâÆ–÷WBà¢–b‡rÂƒbb‚Â#C’&WGW&âµÓ°¢f"6öÇVÖç2ÒÖF‚æÖ‚ƒÂÖF‚æ6V–Â‡ròc’’Â&÷w2ÒÖF‚æÖ‚ƒÂÖF‚æ6V–Â†‚òƒ’“°¢v†–ÆR†6öÇVÖç2¢&÷w2âb’²–b†6öÇVÖç2âbb‡&÷w2ÓÓÒÇÂrò6öÇVÖç2Â‚ò&÷w2’’6öÇVÖç2ÒÓ²VÇ6R&÷w2ÒÓ²Ğ¢f"&Vv–öç2ÒµÒÂ6çf2ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚v6çf2r“°¢f÷"‡f"’Ò²’Â6öÇVÖç3²’²²’²f÷"‡f"&÷rÒ²&÷rÂ&÷w3²&÷r²²’°¢f"ÆVgBÒÖF‚æÖ‚ƒÂÖF‚æfÆö÷"‡r¢†’ò6öÇVÖç2ÒãB’’’Â&–v‡BÒÖF‚æÖ–â‡rÂÖF‚æ6V–Â‡r¢‚†’²’ò6öÇVÖç2²ãB’’“°¢f"F÷ÒÖF‚æÖ‚ƒÂÖF‚æfÆö÷"†‚¢‡&÷rò&÷w2Òãb’’’Â&÷GFöÒÒÖF‚æÖ–â†‚ÂÖF‚æ6V–Â†‚¢‚‡&÷r²’ò&÷w2²ãb’’“°¢f"66ÆRÒÖF‚æÖ–âƒÂ#còÖF‚æÖ‚‡&–v‡BÒÆVgBÂ&÷GFöÒÒF÷’“°¢6çf2çv–GF‚ÒÖF‚ç&÷VæB‚‡&–v‡BÒÆVgB’¢66ÆR“²6çf2æ†V–v‡BÒÖF‚ç&÷VæB‚†&÷GFöÒÒF÷’¢66ÆR“°¢6çf2ævWD6öçFW‡B‚s&Br’æG&t–ÖvR‡6÷W&6RÂÆVgBÂF÷Â&–v‡BÒÆVgBÂ&÷GFöÒÒF÷ÂÂÂ6çf2çv–GF‚Â6çf2æ†V–v‡B“°¢&Vv–öç2çW6‚†6çf2çFôFFU$Â‚v–ÖvRö§VrrÂã’’“°¢ÒĞ¢6çf2çv–GF‚Ò6çf2æ†V–v‡BÒ²&WGW&â&Vv–öç3°¢Ğ¢7–æ2gVæ7F–öâ&÷FFR‡vR’°¢f"–ÖvRÒæWr–ÖvR‚“°¢v—BæWr&öÖ—6R†gVæ7F–öâ‡&W6öÇfRÂ&V¦V7B’²–ÖvRæöæÆöBÒ&W6öÇfS²–ÖvRæöæW'&÷"Ò&V¦V7C²–ÖvRç7&2ÒvRçW&Ã²Ò“°¢f"6çf2ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚v6çf2r“²6çf2çv–GF‚Ò–ÖvRæ†V–v‡C²6çf2æ†V–v‡BÒ–ÖvRçv–GFƒ°¢f"2Ò6çf2ævWD6öçFW‡B‚s&Br“²2çG&ç6ÆFR†6çf2çv–GF‚Â“²2ç&÷FFR„ÖF‚å’ò"“²2æG&t–ÖvR†–ÖvRÂÂ“°¢vRçW&ÂÒ6çf2çFôFFU$Â‚v–ÖvRö§VrrÂã“"“²vRç&Vv–öç2ÒFWF–Å&Vv–öç2†6çf2Â6çf2çv–GF‚Â6çf2æ†V–v‡B“²6çf2çv–GF‚Ò6çf2æ†V–v‡BÒ°¢Ğ¢7–æ2gVæ7F–öâ&W7F÷&U66÷&TFWF–Ç2†7G‚Â–BÂWFFR’°¢f"66ç2Òv—B’†7G‚Âw6÷W&6W2rÂ²&WVW7Eö–C¢–BÒ“°¢f÷"‡f"vRöb66ç2çvW2ÇÂµÒ’°¢–b‡vRæ†5öFWF–Ç2ÇÂvRç&öÆRÓÓÒw&VfW&Væ6Rr’6öçF–çVS°¢WFFR‚~jÚ>YÊXxnZH~zÊÂr²vRçvR²rš^kˆ^i›Y»î(
br“°¢f"&W7öç6RÒv—BfWF6‚‡vRçW&Â“°¢–b‚&W7öç6Ræö²’F‡&÷ræWrW'&÷"‚~hš¾høşK»nŠû¾XùnZK‹J^ûÈÎŠû~˜xŞŠùRr“°¢f"&Æö"Òv—B&W7öç6Ræ&Æö"‚’Â†6‚Òv—B7'—Fòç7V'FÆRæF–vW7B‚u4„Ó#SbrÂv—B&Æö"æ'&”'VffW"‚’“°¢f"F–vW7BÒ'&’æg&öÒ†æWrV–çC„'&’††6‚’’æÖ†gVæ7F–öâ†â’²&WGW&ââçFõ7G&–ærƒb’çE7F'Bƒ"Âsr“²Ò’æ¦ö–â‚rr“°¢f"&W&VBÒv—B&W&R†&Æö"“°¢–b‡&W&VBç&Vv–öç2æÆVæwF‚’v—B’†7G‚Âw6fU÷66÷&UöFWF–Ç2rÂ²&WVW7Eö–C¢–BÂvS¢vRçvRÂ6÷W&6U÷6†#Sc¢F–vW7BÂ&Vv–öç3¢&W&VBç&Vv–öç2Ò“°¢Ğ¢Ğ¢gVæ7F–öâ'WGFöâ†Æ&VÂÂ7F–öâÂ6Ç2’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâr²†6Ç2ÇÂrr’²r"FF×#Ò"r²7F–öâ²r#âr²Æ&VÂ²sÂö'WGFöãâs²Ğ¢gVæ7F–öâ7VÖÖ'’‡&W÷'B’°¢f"fW&–f–VBÒÂ66÷&RÒÂÖ‚ÒÂ66÷&VBÒÂÆ÷76W2ÒµÓ°¢&W÷'Bç&W7VÇBçVW7F–öç2æf÷$V6‚†gVæ7F–öâ‡’°¢f"2Ò‡&W÷'Bæ6÷'&V7F–öç2ÇÂµÒ’æf–æB†gVæ7F–öâ†2’²&WGW&â2æ–BÓÓÒæ–C²Ò“°¢–b‚2ÇÂ2çfW&–f–VB’&WGW&ã°¢fW&–f–VB²³°¢–b†2çFV6†W%÷66÷&RÓÒçVÆÂbb2æÖ…÷66÷&RÓÒçVÆÂ’°¢66÷&R³Ò2çFV6†W%÷66÷&S²Ö‚³Ò2æÖ…÷66÷&S²66÷&VB²³°¢–b†2çFV6†W%÷66÷&RÂ2æÖ…÷66÷&R’Æ÷76W2çW6‚‡²Æ&VÃ¢æÆ&VÂÂÆ÷73¢2æÖ…÷66÷&RÒ2çFV6†W%÷66÷&RÒ“°¢Ğ¢Ò“°¢&WGW&â²fW&–f–VC¢fW&–f–VBÂ66÷&S¢ÖF‚ç&÷VæB‡66÷&R¢’òÂÖƒ¢ÖF‚ç&÷VæB†Ö‚¢’òÂ66÷&VC¢66÷&VBÂÆ÷76W3¢Æ÷76W2ç6÷'B†gVæ7F–öâ†Â"’²&WGW&â"æÆ÷72ÒæÆ÷73²Ò’Ó°¢Ğ¢gVæ7F–öâ'VÆÆWG2†—FV×2’²&WGW&âsÇVÃâr²†—FV×2ÇÂµÒ’æÖ†gVæ7F–öâ‡2’²&WGW&âsÆÆ’6Æ73Ò'"×FW‡B#âr²W62‡2’²sÂöÆ“âs²Ò’æ¦ö–â‚rr’²sÂ÷VÃâs²Ğ¢gVæ7F–öâ&÷6R‡fÇVR’²&WGW&â7W÷'Bç&÷6R‡fÇVR“²Ğ¢gVæ7F–öâföÆB‡F—FÆRÂ6öçFVçBÂ6Ç2’²&WGW&â6öçFVçBòsÆFWF–Ç26Æ73Ò'"ÖföÆBr²†6Ç2ÇÂrr’²r#ãÇ7VÖÖ'“âr²F—FÆR²sÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'"ÖföÆBÖ&öG’#âr²6öçFVçB²sÂöF—cãÂöFWF–Ç3âr¢rs²Ğ¢gVæ7F–öâVW7F–öäÆ–æ·2†Æ&VÇ2Â&W÷'B’°¢&WGW&â†Æ&VÇ2ÇÂµÒ’æÖ†gVæ7F–öâ†Æ&VÂ’²f"Ò&W÷'BçVW7F–öç2æf–æB†gVæ7F–öâ‡’²&WGW&âæÆ&VÂÓÓÒÆ&VÃ²Ò“²&WGW&âò'WGFöâ‚~zÊÂr²W62†Æ&VÂ’²rš)‚rÂvfö7W3¢r²æ–BÂw"ÖÆ–æ²r’¢rs²Ò’æ¦ö–â‚rr“°¢Ğ¢f"6W6TæÖW2Ò²Væ6W'F–ã¢~‹ùKˆŞzîZé¢rÂF–ÖS¢~[Ù>i{nk*i{n™{BrÂ–FV¢~[Ù>i{nk*h	Ş‹zòrÂW†V7WF–öã¢~iÈh	Ş‹zşûÈÎŠêzé~h‰nhš~ŠÎXÚKØòrÂ&VF–æs¢~Šû¾š)h‰nynŠz>XşK¨brÂW‡&W76–öã¢~KÉ®X®ûÈÎKØnŠ‹ëîh‰njÚ^šªNKˆŞZèÎi[BrÓ°¢gVæ7F–öâVÆ6VB†×2’²f"6V2ÒÖF‚æÖ‚ƒÂÖF‚æfÆö÷"†×2ò’“²&WGW&âÖF‚æfÆö÷"‡6V2òc’²rXˆbr²6V2Rc²rzy"s²Ğ¢gVæ7F–öâ'Vææ–æu&W÷'B‡"’°¢f"&V6÷&BÒ"æ÷F–öç2bb"æ÷F–öç2çW'÷6SÓÓÒw&V6÷&BrÂÒ"ç&öw&W72ÇÂ·ÒÂ7FW2Òç7FW2ÇÂ‡&V6÷&Bò²~ŠønXŠ¾Šù^š)‚rÂ~Šû¾XùnKÙÎzÙNKˆîh›iKXˆbrÂ~i[NynŠønXŠ¾{¹>iéÂuÒ¢²~[Ù^XZ^š)yºîKˆîKÙÎzÙBrÂ~jZûh›iKKˆîZ¾kh"rÂ~XˆniéKÉX«şY(ÎZKXˆnXéşYºrÂ~{»ÎYZHŞy¹Kˆî[»®ŠêâuÒ’Â6ö×ÆWFVBÒæ6ö×ÆWFVE÷7FW2ÓÒçVÆÂò¢æ6ö×ÆWFVE÷7FW3°¢&WGW&âsÇ6V7F–öâ6Æ73Ò'"×&öw&W72"&–ÖÆ&VÃÒ.Xˆnié‹ù¾[ªb#ãÆƒ3âr²W62‡æÖW76vRÇÂ~jÚ>YÊhê^iKnXˆniéK»¾Xªr’²sÂöƒ3ãÇ6Æ73Ò'"×FW‡B#âr²W62‡æFWF–ÂÇÂ~jÚ>YÊŠû¾XùnKˆ®KÊ‹XNii8"r’²sÂ÷ãÆöÂ6Æ73Ò'"ÖÖ–ÆW7FöæW2#âr²7FW2æÖ†gVæ7F–öâ‡F—FÆRÂ’’²&WGW&âsÆÆ’6Æ73Ò"r²†’Â6ö×ÆWFVBòv—2ÖFöæRr¢’ÓÓÒ6ö×ÆWFVBòv—2Ö7W'&VçBr¢rr’²r#ãÇ7â&–Ö†–FFVãÒ'G'VR#âr²†’Â6ö×ÆWFVBò~)É2r¢’²’²sÂ÷7ãâr²F—FÆR²sÇ6ÖÆÃâr²†’Â6ö×ÆWFVBò~[{.ZèÎh‰r¢’ÓÓÒ6ö×ÆWFVBò~‹ù¾ŠÎKŠÒr¢~zØ[è^KŠÒr’²sÂ÷6ÖÆÃãÂöÆ“âs²Ò’æ¦ö–â‚rr’²sÂööÃâr°¢‡çF÷FÅ÷VW7F–öç2òsÇî[{.[Ù^XZRÆ#âr²çF÷FÅ÷VW7F–öç2²sÂö#âš)‚+r[{.XˆniéÆ#âr²‡æ6ö×ÆWFVE÷VW7F–öç2ÇÂ’²sÂö#âòr²çF÷FÅ÷VW7F–öç2²rš)ûÈX[nKŠŞKÉX«şXˆniér²‡ç7G&VæwF…÷VW7F–öç2ÇÂ’²rš)ûÈ’+rXúşŠû¾h›iK’r²‡ç&VF&ÆUöÖ&·2ÇÂ’²rZHCÂ÷âr¢rr’°¢‡æ7W'&VçE÷VW7F–öç2bbæ7W'&VçE÷VW7F–öç2æÆVæwF‚òsÇ6Æ73Ò'"Ö7W'&VçB×VW7F–öç2#îiÊÎ‹ÚîûÉ®zÊÂr²W62‡æ7W'&VçE÷VW7F–öç2æ¦ö–â‚~8r’’²rš)ƒÂ÷âr¢rr’°¢sÇ6Æ73Ò'"Ö×WFVB#îiÊÎ‹Úî[{.zØ[èRr²VÆ6VB„FFRææ÷r‚’ÒFFRç'6R‡ç'Vå÷7F'FVEöBÇÂ"æ7&VFVEöB’’²r+r[Ù>X˜Ş™‹njëRr²VÆ6VB„FFRææ÷r‚’ÒFFRç'6R‡ç†6U÷7F'FVEöBÇÂ"æ7&VFVEöB’’²sÂ÷ãÇ6Æ73Ò'"Ö×WFVB#âr²‡&V6÷&Bò~‹ù¾[ªnˆz®Xªi»NikûÈÎXúşzˆŞYî‹ùNY¹îiú^yÈ¾ŠønXŠ¾{¹>iéÎ8"r¢~ZHŞiØ.š)KÉ®XÙ^xºÎXˆniéûÈÎ™‹një^ˆ	~i{nXúşˆ;ŞKˆŞYÎ8.‹ù¾[ªnjøò2zy.ˆz®Xªi»NikûÉ¾KÚXúşKº^‹ùNY¹îZ¾Xiˆ>Šù^ûÈÎzˆŞYîYÊXˆniéŠë[Ù^KŠŞiú^yÈ¾8"r’²sÂ÷âr²'WGFöâ‚~X‹~ikx«nhrÂw&W÷'C¢r²"ç&WVW7Eö–B’²sÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâF–ff–7VÇG•6V7F–öç2‡’°¢f"BÒæF–ff–7VÇG“²–b‚B’&WGW&ârs°¢f"æÖW2Ò²F†–æ¶–æs¢~h	Şˆ2ò[»®jŠrÂ6Æ7VÆF–öã¢~Šêzé~‹Işh¸RrÂ&VF–æs¢~Kúhşi[NY‚rÂW‡&W76–öã¢~Š‹ëîŠë®ŠørÓ°¢&WGW&âföÆB‚~™«î[ªbr²Bæ÷fW&ÆÂ²ròr²†Bç66ÆRÇÂR’²r+rK‹®K¸K˜‹ùj~ŠøBrÂ&÷6R†Bç&V6öâ’²sÆF—b6Æ73Ò'"ÖF–ÖVç6–öç2#âr²ö&¦V7Bæ¶W—2†æÖW2’æÖ†gVæ7F–öâ††—2’²f"Ò†BæF–ÖVç6–öç2ÇÂ·Ò•¶†—5Ó²&WGW&âbbç66÷&RÒçVÆÂòsÇ7ãâr²æÖW5¶†—5Ò²rÆ#âr²ç66÷&R²ròr²†Bç66ÆRÇÂR’²sÂö#ãÇ6ÖÆÃâr²W62†ç&V6öâ’²sÂ÷6ÖÆÃãÂ÷7ãâr¢rs²Ò’æ¦ö–â‚rr’²sÂöF—cãÇ6Æ73Ò'"ÖWf–FVæ6R#îš)yºîXéşih~ûÉ¢r²W62†BæWf–FVæ6U÷V÷FR’²sÂ÷ãÇ6Æ73Ò'"Ö×WFVB#îhÈš)yºîŠhk.KËŠêûÈÎKˆŞiŠşZûKÚˆ;ŞX©¾y¨NŠøNXˆn8#Â÷ârÂw"ÖF–ff–7VÇG’r“°¢Ğ¢gVæ7F–öâ&VfÆV7F–öå&÷WFR‡Â6W6R’°¢f"‚Òæ6W6UöæÇ—6—2bbæ6W6UöæÇ—6—2æ‡—÷F†W6W2æf–æB†gVæ7F–öâ†‚’²&WGW&â‚æ¶–æBÓÓÒ6W6S²Ò“°¢–b†‚’&WGW&â~hÈKÚy¨NY¹î[ønûÈÎKˆ¾KˆjÚ^Xúş[	ŞŠù^ûÉ¢r²‚æ–eö6öæf—&ÖVC°¢&WGW&â²F–ÖS¢~XXKˆŞyÈ¾zÙNj˜xŞX®KˆjÊ8.Zh.iéÎˆ;ŞxºÎz¸¾ZèÎh‰ûÈÎXhŞŠêi{n{¸>KšûÈÎyÈ¾yÈ¾Y:®KˆjÚ^ˆ«y¨Ni{n™{NiÈZI®8"rÂ–FV¢~K¸î[{.{¸şXiZûy¨N˜*>KˆjÚ^hê^yØX®8.™ÈŠhhùzK®i{nXú®yÈ¾Kˆ¾KˆjÚ^ûÈÎXhŞYKˆ®zÙNjûÈÎŠù^yØŠûNiˆîK‹®K¸K˜‹ùj~X®8"rÂW†V7WF–öã¢~KùŞyY[{.{¸şX‰~Zûy¨N[ÈşZÙh‰nh	Ş‹zşûÈÎXˆnjÚ^˜xŞX®ûÈÎj8iú^iŠşY:®KˆjÚ^zé~™Ih‰nkÈşK¨niÚK»n8"rÂ&VF–æs¢~yJˆz®[{y¨NŠùŞZHŞ‹ûš)yºîŠhk.ûÈÎYÈX{®X‰®h˜ŞkÈşyÈ¾h‰nyÈ¾™Iy¨NiÚK»nûÈÎXhŞ˜xŞikKÙÎzÙN8"rÂW‡&W76–öã¢~XXh¨®ynyKŠûNZèÎi[NûÈÎXhŞŠ^Xiš)yºîŠhk.y¨NjÚ^šªNh‰niÙiiKéŞhÚî8"rÂVæ6W'F–ã¢~XúşKº^XXŠù^yØ˜xŞX®ûÈÎXhŞŠ^XX^KÚXÚYÊY:®KˆjÚ^8"rÕ¶6W6UÒÇÂrs°¢Ğ¢gVæ7F–öâ6W6U6V7F–öç2‡Â6÷'&V7F–öâ’°¢f"2Òæ6W6UöæÇ—6—3²–b‚2ÇÂææÇ—6—5öÖöFRÓÓÒw7G&VæwF‚rÇÂææÇ—6—5öÖöFRÓÓÒvæVVG5ö6öæf—&ÖF–öâr’&WGW&ârs°¢f"&VfÆV7F–öâÒ6÷'&V7F–öâbb6÷'&V7F–öâç&VfÆV7F–öâÂ6W6RÒ&VfÆV7F–öâbb&VfÆV7F–öâæ6W6RÇÂwVæ6W'F–âs°¢&WGW&âsÆFWF–Ç26Æ73Ò'"ÖföÆB"Ö6W6R#ãÇ7VÖÖ'“îY¹îh;>KˆKˆ¾ûÈÎ[Ù>i{nK‹®K¸K˜k*X®X{®iÚ^ûÉóÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'"ÖföÆBÖ&öG’#âr²†2bb2æö'6W'fF–öâò&÷6R†2æö'6W'fF–öâ’¢rr’°¢†2bb2æ‡—÷F†W6W2æÆVæwF‚ò2æ‡—÷F†W6W2æÖ†gVæ7F–öâ†‚’²&WGW&âsÆ'F–6ÆSãÇ6Æ73Ò'"×FW‡B#ãÆ#îXXŠù^KˆKˆ¾ûÉ£Âö#âr²W62†‚æ6†V6²’²sÂ÷ãÆFWF–Ç3ãÇ7VÖÖ'“îK‹®K¸K˜X®‹ùKŠ®š¨ÎŠøÂ÷7VÖÖ'“ãÇâr²W62†‚æW‡ÆæF–öâ’²sÂ÷ãÇ6Æ73Ò'"ÖWf–FVæ6R#âr²W62†‚æWf–FVæ6R’²†‚æ6÷VçFW%öWf–FVæ6Rò~ûÉ²r²W62†‚æ6÷VçFW%öWf–FVæ6R’¢rr’²sÂ÷ãÂöFWF–Ç3ãÂö'F–6ÆSâs²Ò’æ¦ö–â‚rr’¢rr’°¢sÆÆ&VÃâr²W62†2bb2çVW7F–öâÇÂ~[Ù>i{ni»Nhê^‹ùY:®zxŞh8^Xk^ûÉòr’²sÇ6VÆV7BFFÖf–VÆCÒ&6W6R#âr²ö&¦V7Bæ¶W—2†6W6TæÖW2’æÖ†gVæ7F–öâ†¶W’’²&WGW&âsÆ÷F–öâfÇVSÒ"r²¶W’²r"r²†¶W’ÓÓÒ6W6Ròw6VÆV7FVBr¢rr’²sâr²6W6TæÖW5¶¶W•Ò²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃîŠ^XX^[Ù>i{ny¨Nh8^Xk^ûÈXúş˜ûÈ“ÇFW‡F&VFFÖf–VÆCÒ'&VfÆV7F–öåöæ÷FR"Ö†ÆVæwFƒÒ#S"&÷w3Ò#""Æ6V†öÆFW#Ò.Kè¾Zh.ûÉ®‹ùXšKŠNXˆn™)şûÈÎXú®XiX{®K¨nzÊÎKˆjÚR#âr²W62‡&VfÆV7F–öâbb&VfÆV7F–öâææ÷FRÇÂrr’²sÂ÷FW‡F&VãÂöÆ&VÃãÇ6Æ73Ò'"×&VfÆV7F–öâ×&÷WFR"×FW‡B#âr²W62‡&VfÆV7F–öå&÷WFR‡Â6W6R’’²sÂ÷ãÇ6Æ73Ò'"Ö×WFVB#îKùŞZÙYîûÈÎKÉ®{¹>YKÚy¨NY¹î[øn‹>i[N[»®Šêî8#Â÷ãÂöF—cãÂöFWF–Ç3âs°¢Ğ¢gVæ7F–öâ÷6—F—fU6V7F–öç2‡&W÷'B’°¢f"v–ç2Ò&W÷'BçVW7F–öç2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âçv–ç2bbçv–ç2æÆVæwFƒ²Ò“°¢v–ç2ç6÷'B†gVæ7F–öâ†Â"’²gVæ7F–öâvV–v‡B‡’²&WGW&â‡æF–ff–7VÇG’bbæF–ff–7VÇG’æ÷fW&ÆÂÇÂ’²‡7W÷'Bçv–ç2‡’ç6öÖR†gVæ7F–öâ‡r’²&WGW&âræ&6—2ÓÓÒwv÷&²s²Ò’ò2¢“²Ò&WGW&âvV–v‡B†"’ÒvV–v‡B†“²Ò“°¢gVæ7F–öâ6&B‡’²&WGW&âsÆ'F–6ÆR6Æ73Ò'"×v–âÖ6&B#ãÆƒCîzÊÂr²W62‡æÆ&VÂ’²rš)ƒÂöƒCâr²7W÷'Bçv–ç2‡’ç6Æ–6RƒÂ"’æÖ†gVæ7F–öâ‡r’²&WGW&â&÷6R‡rç6¶–ÆÂ’²föÆB‚~yÈ¾KÙÎzÙNY(ÎŠûNiˆârÂsÇ6Æ73Ò'"ÖWf–FVæ6R#îKÚy¨NKÙÎzÙNûÉ¢r²W62‡ræö'6W'fVB’²sÂ÷âr²&÷6R‡rç6–væ–f–6æ6R’“²Ò’æ¦ö–â‚rr’²VW7F–öäÆ–æ·2…·æÆ&VÅÒÂ&W÷'B’²sÂö'F–6ÆSâs²Ğ¢&WGW&âv–ç2æÆVæwF‚òsÇ6V7F–öâ6Æ73Ò'"Ö–ç6–v‡B"×v–ç2#ãÆƒ3î‹ùK©¾YËikX®[é~KˆŞ™I“Âöƒ3âr²v–ç2ç6Æ–6RƒÂ"’æÖ†6&B’æ¦ö–â‚rr’²‡v–ç2æÆVæwF‚â"òföÆB‚~‹ùiÈ’r²‡v–ç2æÆVæwF‚Ò"’²rš)X®[é~KˆŞ™I’rÂv–ç2ç6Æ–6Rƒ"’æÖ†6&B’æ¦ö–â‚rr’Âw"ÖÖ÷&R×v–ç2r’¢rr’²sÂ÷6V7F–öãâr¢rs°¢Ğ ¢gVæ7F–öâ6öçFW‡E6V7F–öç2‡&W÷'B’°¢f"2Ò&W÷'BæW†Õö6öçFW‡C²–b‚2’&WGW&ârs°¢f"Æ–æW2ÒµÓ°¢gVæ7F–öâ66÷&R†Æ&VÂÂ¶W’ÂÖ‚’²–b†5¶¶W•ÒÒçVÆÂ’Æ–æW2çW6‚†Æ&VÂ²rr²5¶¶W•Ò²†5¶Ö…ÒÓÒçVÆÂòrr¢ròr²5¶Ö…Ò’“²Ğ¢gVæ7F–öâ&æ²†Æ&VÂÂ¶W’Â6÷VçB’²–b†5¶¶W•ÒÒçVÆÂ’Æ–æW2çW6‚†Æ&VÂ²rr²5¶¶W•Ò²†5¶6÷VçEÒÓÒçVÆÂò~ûÈiÊ®Z¾K«®i[ûÈ’r¢ròr²5¶6÷VçEÒ²rK«¢r’“²Ğ¢66÷&R‚~iÊÎZÚnzyiÈ{¸XˆbrÂw66÷&RrÂvÖ‚r“²66÷&R‚~iÊÎZÚnzyXéşZx¾XˆbrÂw&u÷66÷&RrÂw&uöÖ‚r“°¢–b†2çF&vWBÒçVÆÂ’Æ–æW2çW6‚‚~iÊÎZÚnzyyºîj~Xˆbr²2çF&vWB“°¢&æ²‚~iÊÎZÚnzy[›Nhé"rÂw–V%÷&æ²rÂw–V%ö6÷VçBr“²&æ²‚~iÊÎZÚnzyxúŞhé"rÂv6Æ75÷&æ²rÂv6Æ75ö6÷VçBr“²&æ²‚~h¾Xˆn[›Nhé"rÂwF÷FÅ÷–V%÷&æ²rÂwF÷FÅ÷–V%ö6÷VçBr“²&æ²‚~h¾XˆnxúŞhé"rÂwF÷FÅö6Æ75÷&æ²rÂwF÷FÅö6Æ75ö6÷VçBr“°¢&WGW&âsÆFWF–Ç26Æ73Ò'"Ö6öçFW‡B#ãÇ7VÖÖ'“îiÊÎjÊXˆnié˜x~yJy¨Nˆ>Šù^KúhóÂ÷7VÖÖ'“ãÇ6Æ73Ò'"Ö×WFVB#âr²†2ç6÷W&6RÓÓÒw6fVEöW†Òrò~iÚ^ˆz®iÊÎ‹JnXû~[{.KùŞZÙy¨Nˆ>Šù^i[XÎ8"r¢~iÚ^ˆz®[ÈZx¾Xˆniéi{nˆ>Šù^ŠXÙ^y¨Ni[XÎ8"r’²~XéşZx¾Xˆn8iÈ{¸XˆnY(ÎKˆŞYÎˆÈ>Y»Ny¨Nhé.YŞXˆnXŠ¾KùŞyYûÉ¾KˆŞK¸îhé.YŞhêijŞX[~KÙ>ZKXˆnXéşYº8#Â÷âr²'VÆÆWG2†Æ–æW2’²sÂöFWF–Ç3âs°¢Ğ¢gVæ7F–öâ6WGF–æw56V7F–öâ‡&W÷'B’°¢f"2Ò&W÷'Bæ÷F–öç3²–b‚2’&WGW&ârs°¢f"æÖW2Ò²7G&VæwF‡3¢~KÉX«şKˆî[é~XˆnjÚ^šªBrÂF–ff–7VÇG“¢~š)yºî™«î[ªbrÂ6W6W3¢~ZKXˆnŠø®ijÒrÂ6öÇWF–öç3¢~X[>™JîŠz>zÙBrÂ&7F–6S¢~™(Zûh
~{¸>KšrÂGFW&ç3¢~‹zš)X[h
rrÂÆã¢~ZHŞKšŠêX‰"rÓ°¢&WGW&âsÆFWF–Ç26Æ73Ò'"Ö6öçFW‡B#ãÇ7VÖÖ'“îiÊÎK»Şhª^Y®y¨NXˆniéŠëî{ÚãÂ÷7VÖÖ'“ãÇâr²‡2çW'÷6RÓÓÒw&V6÷&Brò~Xú®[Ù^XZ^š)yºî8KÙÎzÙNY(Îh›iK’r¢‡2æÖöGVÆW2ÇÂµÒ’æÖ†gVæ7F–öâ†²’²&WGW&âæÖW5¶µÓ²Ò’æf–ÇFW"„&ööÆVâ’æ¦ö–â‚r+rr’’²sÂ÷ãÇîŠë.Šz>ûÉ¢r²‡²'&–Vc¢~zèkHrÂ7FæF&C¢~j~XxbrÂFWF–ÆVC¢~Šún{¸brÒ•·2æFWF–ÅÒ²r+rXÙ^‹Úî‹ùŠÎKˆ®™™ûÉ¢r²2çF–ÖUö'VFvWEöÖ–çWFW2²rXˆn™)óÂ÷âr²‡2ævöÂòsÇ6Æ73Ò'"×FW‡B#îZÚnKšyºîj~ûÉ¢r²W62‡2ævöÂ’²sÂ÷âr¢rr’²sÂöFWF–Ç3âs°¢Ğ¢gVæ7F–öâ66÷VçE6V7F–öç2‡&W÷'B’°¢f"2Ò&W÷'Bæ66÷VçEö6öçFW‡C°¢–b‚2’&WGW&ârs°¢–b‚2æVæ&ÆVB’&WGW&âsÇ6V7F–öâ6Æ73Ò'"Ö–ç6–v‡B"Ö66÷VçBÖ6öçFW‡B#ãÆƒCîXènXû.h‰{ºZûxZ~[{.X[>™zÓÂöƒCãÇ6Æ73Ò'"Ö×WFVB#îiÊÎK»Şhª^Y®Xú®KÛşyJiÊÎjÊ‹XNii8#Â÷ãÂ÷6V7F–öãâs°¢–b†2ç7FGW2ÓÒvf–Æ&ÆRr’&WGW&âsÇ6V7F–öâ6Æ73Ò'"Ö–ç6–v‡B"Ö66÷VçBÖ6öçFW‡B#ãÆƒCî‹JnXû~h‰{ºZûxZsÂöƒCâr²&÷6R†2ææ÷FRÇÂ~iÊÎjÊk*iÈXúşyJy¨NXènXû.Šë[Ù^8"r’²sÂ÷6V7F–öãâs°¢f"BÒ2æF–ff–7VÇG’ÇÂ·ÒÂÒ2ç&VF–7F–öâÇÂ·ÒÂö–çG2Ò2çG&¦V7F÷'’ÇÂµÓ°¢f"‡FÖÂÒsÇ6V7F–öâ6Æ73Ò'"Ö–ç6–v‡B"Ö66÷VçBÖ6öçFW‡B#ãÆƒCî‹ùjÊiKîYÊXènXû.˜xÎhîK˜yÈ³ÂöƒCâs°¢–b†Bæ–æFW‚ÒçVÆÂ’‡FÖÂ³ÒsÇîh‰{ºš^™«î[ªnXø.ˆ>ûÉ£Ç7G&öæsâr²W62†Bæ–æFW‚’²sÂ÷7G&öæsîûÈ{¸NXh^[›>YØ~K‹¢SûÈ8.hÚ.X‹XènXû.[›>YØ~™«î[ªnûÈÎ{ªny»[Ù>K¨âÇ7G&öæsâr²W62†BæWV—fÆVçE÷66÷&R’²ròr²W62†BæÖ‚’²sÂ÷7G&öæsî8#Â÷âr²&÷6R†Bææ÷FR’²†BçVÆ—G’ÓÓÒvÆ–Ö—FVBròsÇ6Æ73Ò'"Ö×WFVB#îXø.ˆ>‹è>[ËûÉ¢r²W62‚†Bçv&æ–æw2ÇÂµÒ’æ¦ö–â‚~ûÉ²r’’²sÂ÷âr¢rr“°¢VÇ6R‡FÖÂ³Ò&÷6R†Bææ÷FRÇÂ~XúşjùN‹è>y¨Nh‰{ºŠë[Ù^KˆŞ‹k>ûÈÎi¨.KˆŞKËŠêXènXû.™«î[ªn8"r“°¢–b‡ç7FGW2ÓÓÒvf–Æ&ÆRr’‡FÖÂ³ÒsÆƒCîˆ>X˜Şš(NkX¾Y¹îyÈ³ÂöƒCãÇîhÈˆ>X˜ŞŠë[Ù^˜xŞzé~y¨Nhé.YŞKØŞ{ÚîûÉ®X˜ÒÇ7G&öæsâr²W62‡ç&VF–7FVE÷÷6—F–öå÷W&6VçB’²rSÂ÷7G&öæsîûÉ¾iÊÎjÊZéî™˜^ûÉ®X˜ÒÇ7G&öæsâr²W62‡æ7GVÅ÷÷6—F–öå÷W&6VçB’²rSÂ÷7G&öæsî8#Â÷ãÇâr²‡æ–×&÷fVÖVçE÷ö–çG2âò~iÊÎjÊjùNŠú^š(NkX¾™ÚX˜Òr¢æ–×&÷fVÖVçE÷ö–çG2Âò~iÊÎjÊjùNŠú^š(NkX¾™ÚYâr¢~iÊÎjÊKˆîŠú^š(NkX¾hê^‹ùûÈÎ[zîXÎK‹¢r’²W62„ÖF‚æ'2‡æ–×&÷fVÖVçE÷ö–çG2’’²rKŠ®y›îXˆnx+8#Â÷âr²&÷6R‡ææ÷FR“°¢VÇ6R‡FÖÂ³Ò&÷6R‡ææ÷FRÇÂ~ˆ>X˜ŞŠë[Ù^KˆŞ‹k>ûÈÎi¨.KˆŞjùN‹è>š(NkX¾8"r“°¢–b‡ö–çG2æÆVæwF‚’°¢f"‚ÒgVæ7F–öâ†’—·&WGW&â3²’¢CCòÖF‚æÖ‚ƒÂö–çG2æÆVæwF‚Ò“·ÒÂ’ÒgVæ7F–öâ‡b—·&WGW&âb²b¢ã#·Ó°¢‡FÖÂ³ÒsÆƒCîYÎzyh‰{º‹Ú‹û“ÂöƒCãÇ6Æ73Ò'"Ö×WFVB#î{«^Y	K‹®[›N{ª~hé.YŞKØŞ{ÚîûÈÎ‹h®™ÚKˆ®‹h®Z[ŞûÉ¾jŠ®Y	hÈˆ>Šù^XXYîhé.X‰~8.K¸^jùN‹è>YÎXˆn{¾8Xø.ˆ>K«®i[y»‹ùy¨Nˆ>Šù^8#Â÷ãÇ7frf–Wt&÷ƒÒ#ScR"&öÆSÒ&–Ör"&–ÖÆ&VÃÒ.YÎzyXènXû.hé.YŞKØŞ{Úî‹Ú‹û’"7G–ÆSÒ'v–GFƒ£S¶Ö‚Ö†V–v‡C£#‚#ãÆÆ–æRƒÒ#3"“Ò#b"ƒ#Ò#3"“#Ò#3b"7G&ö¶SÒ&7W'&VçD6öÆ÷""÷6—G“Ò"ã2"óãÇFW‡BƒÒ#"“Ò##"föçB×6—¦SÒ#"f–ÆÃÒ&7W'&VçD6öÆ÷"#îX˜ÓSÂ÷FW‡CãÇFW‡BƒÒ#"“Ò#C"föçB×6—¦SÒ#"f–ÆÃÒ&7W'&VçD6öÆ÷"#ãSÂ÷FW‡CãÇöÇ–Æ–æRf–ÆÃÒ&æöæR"7G&ö¶SÒ'f"‚ÒÖ66VçBÂ3VCs&S‚’"7G&ö¶R×v–GFƒÒ#""ö–çG3Ò"r²ö–çG2æÖ†gVæ7F–öâ†òÆ’—·&WGW&â‚†’’²rÂr·’†òç÷6—F–öå÷W&6VçB“·Ò’æ¦ö–â‚rr’²r"óâr²ö–çG2æÖ†gVæ7F–öâ†òÆ’—·&WGW&âsÆ6—&6ÆR7ƒÒ"r·‚†’’²r"7“Ò"r·’†òç÷6—F–öå÷W&6VçB’²r"#Ò"r²†òæ7W'&VçCóS£2’²r"f–ÆÃÒ'f"‚ÒÖ66VçBÂ3VCs&S‚’#ãÇF—FÆSâr¶W62†òæFFR²~ûÉ®X˜Òr¶òç÷6—F–öå÷W&6VçB²rRr’²sÂ÷F—FÆSãÂö6—&6ÆSâs·Ò’æ¦ö–â‚rr’²sÇFW‡BƒÒ#3"“Ò#S‚"föçB×6—¦SÒ#"f–ÆÃÒ&7W'&VçD6öÆ÷"#âr¶W62‡ö–çG5³ÒæFFR’²sÂ÷FW‡CãÇFW‡BƒÒ#Cs"“Ò#S‚"FW‡BÖæ6†÷#Ò&VæB"föçB×6—¦SÒ#"f–ÆÃÒ&7W'&VçD6öÆ÷"#âr¶W62‡ö–çG5·ö–çG2æÆVæwF‚ÓÒæFFR’²sÂ÷FW‡CãÂ÷7fsâs°¢‡FÖÂ³ÒsÆFWF–Ç3ãÇ7VÖÖ'“îiú^yÈ¾YNjÊh‰{ºKˆîhé.YÓÂ÷7VÖÖ'“ãÆF—b7G–ÆSÒ&÷fW&fÆ÷r×ƒ¦WFò#ãÇF&ÆSãÇF†VCãÇG#ãÇFƒîiz^iÉóÂ÷FƒãÇFƒî[é~XˆbòkºXˆcÂ÷FƒãÇFƒî[›Nhé"òK«®i[Â÷FƒãÇFƒîhé.YŞKØŞ{ÚãÂ÷FƒãÂ÷G#ãÂ÷F†VCãÇF&öG“âr²ö–çG2æÖ†gVæ7F–öâ†ò—·&WGW&âsÇG#ãÇFCâr¶W62†òæFFR’²†òæ7W'&VçCòr+riÊÎjÊs¢rr’²sÂ÷FCãÇFCâr¶W62†òç66÷&R²ròr¶òæÖ‚’²sÂ÷FCãÇFCâr¶W62‚†òç&æ³ÓÖçVÆÃò~(	Bs¦òç&æ²’²ròr¶òç'F–6—çG2’²sÂ÷FCãÇFCîX˜Òr¶W62†òç÷6—F–öå÷W&6VçB’²rSÂ÷FCãÂ÷G#âs·Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—cãÂöFWF–Ç3âs°¢Ğ¢&WGW&â‡FÖÂ²sÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâ66÷&T'&V¶F÷vâ‡&W÷'B’°¢f"66÷&VBÒ&W÷'BçVW7F–öç2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âG—VöbçFV6†W%÷66÷&RÓÓÒvçVÖ&W"rbbG—VöbæÖ…÷66÷&RÓÓÒvçVÖ&W"s²Ò“°¢f"Æ÷76W2Ò66÷&VBæf–ÇFW"†gVæ7F–öâ‡’²&WGW&âçFV6†W%÷66÷&RÂæÖ…÷66÷&S²Ò’ç6÷'B†gVæ7F–öâ†Â"’²&WGW&â†"æÖ…÷66÷&RÒ"çFV6†W%÷66÷&R’Ò†æÖ…÷66÷&RÒçFV6†W%÷66÷&R“²Ò“°¢f"gVÆÂÒ66÷&VBæf–ÇFW"†gVæ7F–öâ‡’²&WGW&âçFV6†W%÷66÷&RÓÓÒæÖ…÷66÷&S²Ò“°¢f"Æ÷7BÒ66÷&VBç&VGV6R†gVæ7F–öâ†âÂ’²&WGW&ââ²æÖ…÷66÷&RÒçFV6†W%÷66÷&S²ÒÂ“°¢f"fö7W2ÒÆ÷76W2ç6Æ–6RƒÂ"’Âfö7W4Æ÷7BÒfö7W2ç&VGV6R†gVæ7F–öâ†âÂ’²&WGW&ââ²æÖ…÷66÷&RÒçFV6†W%÷66÷&S²ÒÂ“°¢f"Æ–æW2ÒµÓ°¢–b†gVÆÂæÆVæwF‚’Æ–æW2çW6‚‚~zÊÂr²gVÆÂæÖ†gVæ7F–öâ‡’²&WGW&âæÆ&VÃ²Ò’æ¦ö–â‚~8r’²rš)ˆë~[é~kºXˆn8"r“°¢–b†fö7W2æÆVæwF‚’Æ–æW2çW6‚‚~ZKXˆniÈ™¸nKŠŞy¨Nš)yºîiŠşzÊÂr²fö7W2æÖ†gVæ7F–öâ‡’²&WGW&âæÆ&VÃ²Ò’æ¦ö–â‚~8r’²rš)ûÈÎX[ZKr²ÖF‚ç&÷VæB†fö7W4Æ÷7B¢’ò²rXˆnûÈÎXÚ[{.[Ù^XZ^ZKXˆny¨Br²ÖF‚ç&÷VæB†fö7W4Æ÷7BòÆ÷7B¢’²r^8"r“°¢&WGW&â²FW‡C¢Æ–æW2æ¦ö–â‚rr’Â6÷VçC¢66÷&VBæÆVæwF‚ÂÆ÷7C¢Æ÷7BÓ°¢Ğ¢gVæ7F–öâ6†FW"†–BÂçVÖ&W"ÂF—FÆRÂFW67&—F–öâ’²&WGW&âsÇ6V7F–öâ6Æ73Ò'"×&VF–ær×6V7F–öâ"FF×&W÷'B×6V7F–öãÒ"r²–B²r"F&–æFWƒÒ"Ó#ãÆF—b6Æ73Ò'"Ö6†FW"#ãÇ7ãâr²çVÖ&W"²sÂ÷7ããÆF—cãÆƒ3âr²F—FÆR²sÂöƒ3ãÇâr²FW67&—F–öâ²sÂ÷ãÂöF—cãÂöF—câs²Ğ¢gVæ7F–öâ÷fW&ÆÄFF‡&W÷'B’°¢&WGW&â&W÷'Bæ÷fW&ÆÂÇÂ²7G&VæwF‡3¢&W÷'BçVW7F–öç2æfÆDÖ†gVæ7F–öâ‡—·&WGW&â7W÷'Bçv–ç2‡’ç6Æ–6RƒÃ’æÖ†gVæ7F–öâ‡r—·&WGW&â·F—FÆS§rç6¶–ÆÂÆFWF–Ã§rç6–væ–f–6æ6RÇVW7F–öç3¥·æÆ&VÅ×Ó·Ò“·Ò’ç6Æ–6RƒÃ2’Âv3¢&W÷'BçVW7F–öç2æf–ÇFW"†gVæ7F–öâ‡—·&WGW&âæf—'7Eö—77VRbbæf—'7Eö—77VRæ6W'F–çG“ÓÓÒv6öæf—&ÖVBrbbç&Wf–Wu÷7FGW2ÓÒwFV6†W%ö6öæfÆ–7Bs·Ò’ç6Æ–6RƒÃ2’æÖ†gVæ7F–öâ‡—·&WGW&â·F—FÆS§æf—'7Eö—77VRæÆö6F–öâÆFWF–Ã§æf—'7Eö—77VRæW‡ÆæF–öâÇVW7F–öç3¥·æÆ&VÅ×Ó·Ò’ÂF–ff–7VÇG“§&W÷'BçVW7F–öç2æf–ÇFW"†gVæ7F–öâ‡—·&WGW&âæF–ff–7VÇG“·Ò’æÖ†gVæ7F–öâ‡—·&WGW&âö&¦V7Bæ76–vâ‡¶Æ&VÃ§æÆ&VÇÒÇæF–ff–7VÇG’“·Ò’ÂW%÷7VÖÖ'“§&W÷'BçW%÷7VÖÖ'’ÇÂrrÓ°¢Ğ¢gVæ7F–öâÖWG&–2†Æ&VÂÂfÇVRÂæ÷FR’²&WGW&âsÆF—b6Æ73Ò'"ÖÖWG&–2#ãÇ7ãâr¶Æ&VÂ²sÂ÷7ããÇ7G&öæsâr¶W62‡fÇVR’²sÂ÷7G&öæsãÇ6ÖÆÃâr¶W62†æ÷FR’²sÂ÷6ÖÆÃãÂöF—câs²Ğ¢gVæ7F–öâ&W÷'DÖWG&–72‡&W÷'B’°¢f"—&VC×&W÷'BçVW7F–öç2æf–ÇFW"†gVæ7F–öâ‡—·&WGW&âçVÖ&W"‡çFV6†W%÷66÷&R’ÓÖçVÆÂbbçVÖ&W"‡æÖ…÷66÷&R’ÓÖçVÆÃ·Ò’ÂF÷FÃ×&W÷'BçF÷FÂÇÂ·ÒÂ6öæfÆ–7C×&W÷'Bç66÷&Uö6†V6²bb&W÷'Bç66÷&Uö6†V6²ç7FGW3ÓÓÒv6öæfÆ–7Bs°¢f"†5F÷FÃÖçVÖ&W"‡F÷FÂç66÷&R’ÓÖçVÆÂÂ66÷&SÖ†5F÷FÃ÷F÷FÂç66÷&S§—&VBç&VGV6R†gVæ7F–öâ†âÇ—·&WGW&ââ·çFV6†W%÷66÷&S·ÒÃ’ÂÖƒÖ†5F÷FÃ÷F÷FÂæÖƒ§—&VBç&VGV6R†gVæ7F–öâ†âÇ—·&WGW&ââ·æÖ…÷66÷&S·ÒÃ’Â¶æ÷vãÖ†5F÷FÂÇÂ—&VBæÆVæwFƒã°¢f"&FVCÖ÷fW&ÆÄFF‡&W÷'B’æF–ff–7VÇG’ÇÂµÒÂ66ÆW3Ô'&’æg&öÒ†æWr6WB‡&FVBæÖ†gVæ7F–öâ†B—·&WGW&âBç66ÆWÇÃS·Ò’’’ÂÖVã×&FVBæÆVæwF‚bb66ÆW2æÆVæwFƒÓÓÓôÖF‚ç&÷VæB‡&FVBç&VGV6R†gVæ7F–öâ†âÆB—·&WGW&ââ¶Bæ÷fW&ÆÃ·ÒÃ’÷&FVBæÆVæwF‚£’ó¦çVÆÃ°¢f"‡FÖÃÖÖWG&–2††5F÷FÃò~XéşXÛ~h›iK[é~Xˆbs¢~[{.[Ù^XZ^š)yºî[é~XˆbrÆ¶æ÷vãôÖF‚ç&÷VæB‡66÷&R£’ó²†çVÖ&W"†Ö‚’ÓÖçVÆÃòròr¶Öƒ¢rr“¢~[è^Š^XXRrÆ6öæfÆ–7Cò~Xˆni[YŠêZÙYÊ[zî[È.ûÈÎŠû~XXjZû’s¦†5F÷FÃò~iÚ^ˆz®XÛ~™Ú.iˆîzîy¨Nh¾Xˆbs¢~K¸^k~h¾[é~XˆnKˆîkºXˆnYØ~iˆîzîy¨Br·—&VBæÆVæwF‚²rš)‚r“°¢f"Ö„æ÷FRÒF÷FÂæÖ…÷6÷W&6RÓÓÒw6fVEöW†Òrò~kºXˆniÚ^ˆz®[{.X[>ˆNˆ>Šù^y¨Nh‰{ºŠë[ÙRr¢F÷FÂæÖ…÷6÷W&6RÓÓÒw&–çFVE÷6V7F–öå÷7VÒrò~kºXˆnyKXÛ~™Ú.YN˜:XˆnXÛX‹~XˆnXÎk~h²r¢F÷FÂæÖ…÷6÷W&6RÓÓÒw&–çFVE÷VW7F–öå÷7VÒrò~kºXˆnyKZèÎi[Nš)yºîXÛX‹~XˆnXÎk~h²r¢~hÈXéşXÛ~[é~XˆnKˆîkºXˆnŠêzérs°¢‡FÖÂ³ÖÖWG&–2††5F÷FÃò~XÛ~™Ú.[é~Xˆnxèrs¢~[{.[Ù^XZ^˜:Xˆn[é~XˆnxèrrÆ¶æ÷vâbfÖƒãbg66÷&SÃÖÖ‚bb6öæfÆ–7CôÖF‚ç&÷VæB‡66÷&RöÖ‚£’ó²rRs¢~i¨.izk9^zîZé¢rÆ†5F÷FÃöÖ„æ÷FS¢~KˆŞiŠşi[NXÛ~[é~Xˆnxèrr“°¢‡FÖÂ³ÖÖWG&–2‚~š)yºî™«î[ªnKËŠêrÆÖVâÓÖçVÆÃöÖVâ²ròr·66ÆW5³Ó§&FVBæÆVæwFƒò~j~[®KˆŞYÂs¢~i¨.izk9^XŠNijÒrÆÖVâÓÖçVÆÃò~[{.ŠøBr·&FVBæÆVæwF‚²rš)y¨N[›>YØ~XÎûÉ´’KËŠês§&FVBæÆVæwFƒò~Y
¾iz~x˜K©NXˆnX‹nûÈÎ˜	š)XˆnXŠ¾iú^yÈ²s¢~™ÈŠhkˆ^i›8ZèÎi[Ny¨Nš)yºîiÚK»br“°¢‡FÖÂ³ÖÖWG&–2‚~XˆniéŠhny¹brÇ&W÷'BçVW7F–öç2æÆVæwF‚²rš)‚rÇ&W÷'Bæ6ö×ÆWFSò~[{.ŠønXŠ¾Kˆ®KÊ‹XNiiKŠŞy¨Nš)yºâs¢~‹XNiih‰nXˆnié[	®iÈ[è^Š^XX^Xh^Zë’r“°¢&WGW&âsÆF—b6Æ73Ò'"Ö÷fW&ÆÂÖÖWG&–72#âr¶‡FÖÂ²sÂöF—câs°¢Ğ¢gVæ7F–öâ&W÷'E6V7F–öç2‡&W÷'BÂWFF–ær’°¢–b‡&W÷'Bç&V6÷&EööæÇ’—&WGW&ârs°¢f"6÷&SÖ÷fW&ÆÄFF‡&W÷'B’Â7F–öç3×&W÷'Bæ7F–öå÷ÆçÇÅµÒÂ†VFÆ–æS×&W÷'Bæ†VFÆ–æRÇÂ6÷&Ræ†VFÆ–æRÂ†5v÷&³×&W÷'Bçv÷&µööå÷W"ÓÖfÇ6RÇÂ‡&W÷'Bç6÷W&6U÷vW7ÇÅµÒ’ç6öÖR†gVæ7F–öâ‡—·&WGW&âç&öÆSÓÓÒwv÷&²s·Ò“°¢gVæ7F–öâf–æF–æw2†—FV×2ÆV×G’—·&WGW&â—FV×2æÆVæwFƒö—FV×2ç6Æ–6RƒÃ"’æÖ†gVæ7F–öâ‡‚—·&WGW&âsÆ'F–6ÆSãÇ7G&öæsâr¶W62‡‚çF—FÆR’²sÂ÷7G&öæsâr·VW7F–öäÆ–æ·2‡‚çVW7F–öç2Ç&W÷'B’²sÂö'F–6ÆSâs·Ò’æ¦ö–â‚rr“¢sÇ6Æ73Ò'"Ö×WFVB#âr¶V×G’²sÂ÷âs·Ğ¢f"‡FÖÃÖ6†FW"‚v†–v†Æ–v‡G2rÂsrÂ~iÊÎjÊi[NKÙ>XˆniérÂ~XXK¨nŠz>i[NKÙ>ŠxëûÈÎXhŞhÈ™ÈŠhiú^yÈ¾X[~KÙ>š)yºî8"r’·&W÷'DÖWG&–72‡&W÷'B“°¢–b††VFÆ–æR–‡FÖÂ³ÒsÇ6Æ73Ò'"Ö†VFÆ–æR#âr¶W62††VFÆ–æR’²sÂ÷âs°¢–b‡&W÷'Bæ÷fW'f–Wrbb&W÷'Bæ÷fW'f–WrÓÖ†VFÆ–æR–‡FÖÂ³ÖföÆB‚~iú^yÈ¾i[NKÙ>ŠøNK»rrÇ&÷6R‡&W÷'Bæ÷fW'f–Wr’Âw"Ö÷fW'f–Wrr“°¢‡FÖÂ³ÒæW‡DW†Õ6V7F–öâ‡&W÷'BÂWFF–ær“°¢‡FÖÂ³ÒsÆF—b6Æ73Ò'"Ö÷fW&ÆÂÖf–æF–æw2#ãÇ6V7F–öâ6Æ73Ò'"Ö÷fW&ÆÂ×v–â#ãÆƒCîX®[é~Z[Şy¨NYËik“ÂöƒCâr¶f–æF–æw2†6÷&Rç7G&VæwF‡7ÇÅµÒÆ†5v÷&³ò~xëiÈ‹XNiii¨.KˆŞ‹k>Kº^[Ù.{«>X[~KÙ>KÉX«şûÈÎXúşXXiú^yÈ¾˜	š)Šë[Ù^8"s¢~Š^XX^KÙÎzÙNYîûÈÎXúşXˆnié[{.{¸şX®Zûy¨N˜:Xˆn8"r’²sÂ÷6V7F–öããÇ6V7F–öâ6Æ73Ò'"Ö÷fW&ÆÂÖv#ãÆƒCîiÈ™ÈŠhyYhHşy¨NYËik“ÂöƒCâr¶f–æF–æw2†6÷&Ræv7ÇÅµÒÆ†5v÷&³ò~i¨.iÊ®zîŠêNX[~KÙ>™zîš)ûÉ¾[è^jZûy¨Nš)yºîKˆŞKÉ®y»Nhê^XŠNK‹®‰hN[Ë8"s¢~[Ù>X˜ŞK¸^Xˆniéš)yºîŠhk.ûÈÎKˆŞXŠNijŞKŠ®K«®KˆŞ‹k>8"r’²sÂ÷6V7F–öããÂöF—câs°¢–b†7F–öç2æÆVæwF‚–‡FÖÂ³Ö'WGFöâ‚~iú^yÈ¾{¸>KšKˆîZHŞKšZèhé"rÂv§V×§Æâr“°¢f"W‡×&W÷'Bæ÷F–öç2bb&W÷'Bæ÷F–öç2æW†ÕöW‡W&–Væ6S°¢–b†W‡bb†W‡æ6ö×ÆWF–öâÓÒwVæ¶æ÷vâwÇÆW‡æ6†V6¶VBÓÒwVæ¶æ÷vâwÇÆW‡ææ÷FR’–‡FÖÂ³ÒsÇ6Æ73Ò'"×&V6öÆÆV7F–öâ#îhÈKÚy¨NY¹î[ønûÉ¢r¶W62…²‡¶f–æ—6†VC¢~X®ZèÎK¨nŠù^XÛrrÇVæf–æ—6†VC¢~iÈš)yºîk*X®ZèÂwÒ•¶W‡æ6ö×ÆWF–öåÒÂ‡·–W3¢~j8iú^‹ørrÆæó¢~k*iÚ^[é~Xø®j8iúRrÇ'FÇ“¢~Xú®j8iú^K¨n˜:XˆbwÒ•¶W‡æ6†V6¶VEÒÆW‡ææ÷FUÒæf–ÇFW"„&ööÆVâ’æ¦ö–â‚~ûÉ²r’’²~8.‹ùyJK¨î‹è^XªXŠNijŞûÈÎKˆŞy»Nhê^KÙÎK‹®˜	š)™IYº8#Â÷âs°¢‡FÖÂ³ÒsÂ÷6V7F–öãâr¶6†FW"‚wW&f÷&Öæ6RrÂs"rÂ~Šù^XÛ~™«î[ªnKˆî[é~XˆnXˆn[ˆ2rÂ~XˆnXŠ¾yÈ¾š)yºîŠhk.Y(ÎZéî™˜^[é~XˆnûÈÎh›îX‹™ÈŠh‹ù¾KˆjÚ^K¨nŠz>y¨N˜:Xˆn8"r“°¢‡FÖÂ³×&÷6R†6÷&RçW%÷7VÖÖ'’ÇÂ&W÷'BçW%÷7VÖÖ'’ÇÂ~{¹>YKˆ¾ik˜	š)ŠøNK»~iú^yÈ¾Šù^XÛ~Šhk.ûÉ¾‹XNiiKˆŞ‹k>i{ni¨.KˆŞKÙÎi[NKÙ>™«î[ªnXŠNijŞ8"r“°¢–b†6÷&RæF–ff–7VÇG’bb6÷&RæF–ff–7VÇG’æÆVæwF‚–‡FÖÂ³ÒsÇ6Æ73Ò'"Ö×WFVB#îhÈš)yºîŠhk.KËŠêûÈÎKˆŞyKKÚy¨NZû™IXk>Zé®ûÈÎK™şKˆŞiŠşXZKÙ>ˆ>yIşy¨NZéîkX¾™«î[ªn8#Â÷âr¶föÆB‚~iú^yÈ¾jøşš)™«î[ªnKˆî[é~XˆbrÂsÆF—b6Æ73Ò'"×F&ÆR×67&öÆÂ#ãÇF&ÆR6Æ73Ò'"ÖF–ff–7VÇG’×F&ÆR#ãÇF†VCãÇG#ãÇFƒîš)XûsÂ÷FƒãÇFƒî™«î[ªnKËŠêÂ÷FƒãÇFƒîh›iK[é~XˆcÂ÷FƒãÇFƒîK‹¾Šh™«îx+“Â÷FƒãÂ÷G#ãÂ÷F†VCãÇF&öG“âr·&W÷'BçVW7F–öç2æÖ†gVæ7F–öâ‡—·f"CÖ6÷&RæF–ff–7VÇG’æf–æB†gVæ7F–öâ†B—·&WGW&âBæÆ&VÃÓÓ×æÆ&VÃ·Ò“·&WGW&âsÇG#ãÇFCâr¶W62‡æÆ&VÂ’²sÂ÷FCãÇFCâr²†CöBæ÷fW&ÆÂ²ròr²†Bç66ÆWÇÃR“¢~[è^ŠøBr’²sÂ÷FCãÇFCâr²‡çFV6†W%÷66÷&RÖçVÆÃöW62‡çFV6†W%÷66÷&R’²‡æÖ…÷66÷&RÖçVÆÃòròr¶W62‡æÖ…÷66÷&R“¢rr“¢~[è^Š^XXRr’²sÂ÷FCãÇFCâr¶W62†BbfBç&V6öçÇÂ~‹XNiiKˆŞ‹k2r’²sÂ÷FCãÂ÷G#âs·Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—câr“°¢–b‡66÷&T'&V¶F÷vâ‡&W÷'B’çFW‡B–‡FÖÂ³ÒsÇ6Æ73Ò'"×66÷&R×7VÖÖ'’#âr¶W62‡66÷&T'&V¶F÷vâ‡&W÷'B’çFW‡B’²sÂ÷âs°¢f"Æ÷76W3×&W÷'BçVW7F–öç2æf–ÇFW"†gVæ7F–öâ‡—·&WGW&âçFV6†W%÷66÷&RÖçVÆÂbgæÖ…÷66÷&RÖçVÆÂbgçFV6†W%÷66÷&SÇæÖ…÷66÷&S·Ò’ç6÷'B†gVæ7F–öâ†Æ"—·&WGW&â†"æÖ…÷66÷&RÖ"çFV6†W%÷66÷&R’Ò†æÖ…÷66÷&RÖçFV6†W%÷66÷&R“·Ò“°¢–b†Æ÷76W2æÆVæwF‚–‡FÖÂ³ÒsÆF—b6Æ73Ò'"ÖÆ÷72ÖÖ#âr¶Æ÷76W2æÖ†gVæ7F–öâ‡—·&WGW&âsÇ7ãîzÊÂr¶W62‡æÆ&VÂ’²rš)‚Æ#î(‰"r´ÖF‚ç&÷VæB‚‡æÖ…÷66÷&R×çFV6†W%÷66÷&R’£’ó²rXˆcÂö#ãÂ÷7ãâs·Ò’æ¦ö–â‚rr’²sÂöF—cãÇ6Æ73Ò'"Ö×WFVB#îK¸^hÈiˆîzîy¨N˜	š)h›iKXˆnk~h¾ûÈÎKˆŞY
²’KËXˆnûÉ¾ZKXˆnZI®[	KˆŞzØK¨îKúîZHŞKÉXX{ª~8#Â÷âs°¢–b‚‡&W÷'Bç66÷&Uöw&÷W7ÇÅµÒ’æÆVæwF‚–‡FÖÂ³ÒsÆƒCîXÛ~™Ú.Xˆn{¸N[é~XˆcÂöƒCãÆF—b6Æ73Ò'"ÖÆ÷72ÖÖ#âr·&W÷'Bç66÷&Uöw&÷W2æÖ†gVæ7F–öâ†r—·&WGW&âsÇ7ãâr¶W62†ræÆ&VÂ’²rÆ#âr²†rçFV6†W%÷66÷&SÓÖçVÆÃò~[é~Xˆn[è^zîŠêBs¦W62†rçFV6†W%÷66÷&R’’²†ræÖ…÷66÷&SÓÖçVÆÃòrs¢ròr¶W62†ræÖ…÷66÷&R’’²sÂö#ãÂ÷7ãâs·Ò’æ¦ö–â‚rr’²sÂöF—cãÇ6Æ73Ò'"Ö×WFVB#îXˆn{¸Nh¾XˆnKˆŞXˆni®X‹[şš)ûÈÎK™şKˆŞKˆî˜	š)[é~Xˆn˜xŞZHŞy»Xª8#Â÷âs°¢–b‚‡&W÷'Bæ•öw&FUö6†V6·7ÇÅµÒ’æÆVæwF‚–‡FÖÂ³ÒsÆƒCî˜	š)XŠNXˆnKˆîi[N{¸N[é~XˆnjZû“ÂöƒCâr·&W÷'Bæ•öw&FUö6†V6·2æÖ†gVæ7F–öâ†r—·&WGW&âsÇ6Æ73Ò'"Ö–ç6–v‡B#âr¶W62†ræÆ&VÂ’²~ûÉ®˜	š)YŠêÇ7G&öæsâr¶W62†ræ6ö×&VE÷66÷&R’²sÂ÷7G&öæsîûÈÎXÛ~™Ú.Xˆn{¸BÇ7G&öæsâr¶W62†rçFV6†W%öw&÷W÷66÷&R’²sÂ÷7G&öæsî8"r¶W62†rææ÷FR’²sÂ÷âs·Ò’æ¦ö–â‚rr“°¢–b‡&W÷'Bæ6öçFW‡E÷7VÖÖ'’–‡FÖÂ³ÖföÆB‚~{¹>YiÊÎjÊˆ>Šù^KúhşyÈ¾ŠxërÇ&÷6R‡&W÷'Bæ6öçFW‡E÷7VÖÖ'’’“°¢‡FÖÂ³ÒsÂ÷6V7F–öãâr¶6†FW"‚v–ç6–v‡G2rÂs2rÂ~X®[é~Z[Şy¨Nikk9^KˆîK‹¾Šh™zîš)‚rÂ~{¹>Šë®Zû[©NX[~KÙ>š)yºîûÉ¾ZI®˜>š)K˜¾™{Ny¨NX[YÎx›x+YÊ‹ù˜xÎ[Ù.{«>8"r“°¢‡FÖÂ³×÷6—F—fU6V7F–öç2‡&W÷'B“°¢–b‚†6÷&Rç7G&VæwF‡7ÇÅµÒ’æÆVæwF‚bb‡&W÷'Bç7G&VæwF‡7ÇÅµÒ’æÆVæwF‚–‡FÖÂ³Ö'VÆÆWG2‡&W÷'Bç7G&VæwF‡2“°¢–b‚†6÷&Ræv7ÇÅµÒ’æÆVæwF‚–‡FÖÂ³ÒsÆF—b6Æ73Ò'"Ö¶W’Öv2#ãÆƒCî[{.{¸şzîŠêNy¨NX[>™Jî™zîš)ƒÂöƒCâr¶6÷&Ræv2æÖ†gVæ7F–öâ†r—·&WGW&âsÆ'F–6ÆSãÇ7G&öæsâr¶W62†rçF—FÆR’²sÂ÷7G&öæsâr·&÷6R†ræFWF–Â’·VW7F–öäÆ–æ·2†rçVW7F–öç2Ç&W÷'B’²sÂö'F–6ÆSâs·Ò’æ¦ö–â‚rr’²sÂöF—câs°¢–b‚‡&W÷'BçGFW&ç7ÇÅµÒ’æÆVæwF‚–‡FÖÂ³ÒsÆF—b6Æ73Ò'"×GFW&ç2#ãÆƒCîXz˜>š)K˜¾™{Ny¨NˆN{;³ÂöƒCâr·&W÷'BçGFW&ç2æÖ†gVæ7F–öâ‡—·&WGW&âsÆ'F–6ÆR6Æ73Ò'"×GFW&â#ãÆƒCâr¶W62‡çF—FÆR’²‡æ6öæf–FVæ6SÓÓÒvÆ÷rsòrÇ6ÖÆÃî‹ù™Èš¨ÎŠøÂ÷6ÖÆÃâs¢rr’²sÂöƒCâr·&÷6R‡æ–çFW'&WFF–öâ’·VW7F–öäÆ–æ·2‡çVW7F–öç2Ç&W÷'B’¶föÆB‚~iú^yÈ¾KéŞhÚîKˆîXøŞKè²rÇ&÷6R‡æWf–FVæ6R’’²sÂö'F–6ÆSâs·Ò’æ¦ö–â‚rr’²sÂöF—câs°¢VÇ6R‡FÖÂ³ÒsÇ6Æ73Ò'"Ö×WFVB#âr²‡&W÷'Bæ÷F–öç2bb&W÷'Bæ÷F–öç2æÖöGVÆW2æ–æ6ÇVFW2‚wGFW&ç2r“ò~iÊÎjÊiÊ®[^[ÈZI®š)X[h
~Xˆnié8"s¢~i¨.iÊ®XùxëiÈ‹k>ZIşKéŞhÚîy¨N˜xŞZHŞx›x+ûÈÎKˆŞK¸îXÙ^˜>š)hšZJ~XŠNijŞ8"r’²sÂ÷âs°¢&WGW&â‡FÖÂ²sÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâæW‡DW†Õ6V7F–öâ‡&W÷'BÂWFF–ær’°¢f"F—2ÒWFF–æròµÒ¢7W÷'BææW‡DW†ÕF—2‡&W÷'B“°¢f"V×G’ÒWFF–ærò~jÚ>YÊi»NikXˆniéûÈÎZèÎh‰YîKÉ®YÎjÚ^i[Nynˆ>X˜Şhù˜i.8"p¢¢&W÷'BææÇ—6—5÷7FÆRò~KÙÎzÙNh‰nXˆni[[{.KúîiKûÈÎŠû~XXi»NikXˆniéûÈÎXhŞi[Nynˆ>X˜Şhù˜i.8"p¢¢&W÷'Bçv÷&µööå÷W"ÓÓÒfÇ6Rbb‡&W÷'Bç6÷W&6U÷vW2ÇÂµÒ’ç6öÖR†gVæ7F–öâ‡’²&WGW&âç&öÆRÓÓÒwv÷&²s²Ò’ò~Š^XX^ˆ>Šù^i{ny¨NKÙÎzÙNYîûÈÎh˜Şˆ;Şi[Nyn˜.YKÚy¨Nˆ>X˜Şhù˜i.8"p¢¢~iÊÎjÊi¨.k*iÈ‹k>ZIşKéŞhÚîi[NynX[~KÙ>hù˜i.ûÉ¾XúşXXiú^yÈ¾˜	š)ZHŞy¹ûÈÎKˆŞ[ø^š)ŞZInZ)îXªj8iú^K»¾Xª8"s°¢&WGW&âsÆ6–FR6Æ73Ò'"ÖæW‡BÖW†Ò"&–ÖÆ&VÃÒ.Kˆ¾jÊˆ>Šù^k:hHşx+’#ãÆƒCîKˆ¾jÊˆ>Šù^k:hHşx+“ÂöƒCâr°¢‡F—2æÆVæwF‚òsÇ6Æ73Ò'"Ö×WFVB#îˆ>X˜Ş[ú¾˜	şY¹îyÈ¾ûÈÎ˜~X‹y»[©Nš)Yè¾i{nyJKˆ®8.K¸^jhÚîiÊÎjÊZHŞy¹i[NynûÈÎKˆŞKº>Š™[şiÉş‰hN[Ëx+8#Â÷ãÆöÃâr²F—2æÖ†gVæ7F–öâ‡F—’°¢&WGW&âsÆÆ“âr²&÷6R‡F—çFW‡B’²sÆF—b6Æ73Ò'"×F—×6÷W&6W2#ãÇ7â6Æ73Ò'"Ö×WFVB#îiÚ^ˆz®iÊÎjÊûÉ£Â÷7ãâr²VW7F–öäÆ–æ·2‡F—çVW7F–öç2Â&W÷'B’²sÂöF—cãÂöÆ“âs°¢Ò’æ¦ö–â‚rr’²sÂööÃâr¢sÇ6Æ73Ò'"Ö×WFVB#âr²V×G’²sÂ÷âr’²sÂö6–FSâs°¢Ğ¢gVæ7F–öâ&W÷'EÆâ‡&W÷'B’°¢–b‡&W÷'Bç&V6÷&EööæÇ’—&WGW&ârs°¢f"7F–öç3×&W÷'Bæ7F–öå÷ÆçÇÅµÒÂ‡FÖÃÖ6†FW"‚wÆârÂsRrÂ~hê^Kˆ¾iÚ^y¨N{¸>KšKˆîZHŞKšrÂ~XXŠz>Xk>iÈXÎ[é~h©^XZ^y¨N™zîš)ûÈÎXhŞyJX[~KÙ>K»¾Xªj8iú^iŠşY
nhèÎhú8"r“°¢–b‡&W÷'Bæ÷F–öç2bb&W÷'Bæ÷F–öç2ç7GVG•öÖ–çWFW2–‡FÖÂ³ÒsÇ6Æ73Ò'"Ö×WFVB#îKÚy¨NZHŞKšZèhé.ûÉ®jøşZJ{ªbr·&W÷'Bæ÷F–öç2ç7GVG•öÖ–çWFW2²rXˆn™)ş8#Â÷âs°¢gVæ7F–öâ7F–öâ†Æ’—·&WGW&âsÆ'F–6ÆR6Æ73Ò'"Ö7F–öâ#ãÆF—b6Æ73Ò'"Ö7F–öâÖ†VF–ær#ãÇ7â6Æ73Ò'"×7FWÖçVÖ&W"#âr²†’³’²sÂ÷7ããÆƒCâr¶W62†çF—FÆR’²sÂöƒCãÂöF—câr·&÷6R†çF6²’²sÆF—b6Æ73Ò'"×7V66W72#ãÆ#îX®X‹‹ùj~[XúşKº^ûÉ£Âö#âr·&÷6R†ç7V66W75ö6†V6²’²sÂöF—câr²†çF–ÖV&÷ƒòsÇ6Æ73Ò'"Ö×WFVB#î{¸>KšZèhé.ûÉ¢r¶W62†çF–ÖV&÷‚’²sÂ÷âs¢rr’·VW7F–öäÆ–æ·2†çVW7F–öç2Ç&W÷'B’¶föÆB‚~K‹®K¸K˜XXX®‹ùK»nK¨²rÇ&÷6R†ç&V6öâ’’²sÂö'F–6ÆSâs·Ğ¢–b†7F–öç2æÆVæwF‚–‡FÖÂ³ÒsÆF—b6Æ73Ò'"Ö7F–öâ×Æâ#âr¶7F–öç2ç6Æ–6RƒÃ"’æÖ†7F–öâ’æ¦ö–â‚rr’²†7F–öç2æÆVæwFƒã#öföÆB‚~Yî{ºŞ‹ùiÈ’r²†7F–öç2æÆVæwF‚Ó"’²ršZèhé"rÆ7F–öç2ç6Æ–6Rƒ"’æÖ†gVæ7F–öâ†Æ’—·&WGW&â7F–öâ†Æ’³"“·Ò’æ¦ö–â‚rr’“¢rr’²sÂöF—câs°¢VÇ6R–b‚‡&W÷'Bç&–÷&—F–W7ÇÅµÒ’æÆVæwF‚–‡FÖÂ³Ö'VÆÆWG2‡&W÷'Bç&–÷&—F–W2“°¢VÇ6R‡FÖÂ³ÒsÇ6Æ73Ò'"Ö×WFVB#âr²‡&W÷'Bæ÷F–öç2bb&W÷'Bæ÷F–öç2æÖöGVÆW2æ–æ6ÇVFW2‚wÆâr“ò~iÊÎjÊiÊ®yIşh‰ZHŞKšŠêX‰.ûÈÎXúşhÈ˜	š)[»®ŠêîŠê.jÚ>8"s¢~xëiÈ‹XNiii¨.KˆŞ‹k>Kº^Zèhé.Xúş™Úy¨NŠ^[ËK»¾XªûÈÎXúşXXjZûKÙÎzÙN8"r’²sÂ÷âs°¢&WGW&â‡FÖÂ²sÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâ&W÷'DFWF–Ç2‡&W÷'B’²&WGW&â6öçFW‡E6V7F–öç2‡&W÷'B’·6WGF–æw56V7F–öâ‡&W÷'B’²‚‡&W÷'BçVæ6W'F–çF–W7ÇÅµÒ’æÆVæwFƒöföÆB‚~Š^XX^KúhşKˆîjZûš’rÆ'VÆÆWG2‡&W÷'BçVæ6W'F–çF–W2’“¢rr“²Ğ¢gVæ7F–öâ”w&F–æu6V7F–öâ‡’°¢f"rÒæ•öw&F–æs°¢–b‚rÇÂç&V6÷&EööæÇ’’&WGW&ârs°¢–b†rç7FGW2ÓÒv6öæf—&ÖVBr’&WGW&âsÆ6–FR6Æ73Ò'"Ö–ç6–v‡B"Ö’Öw&FR#ãÆƒCä’XŠNXˆn[è^ZHŞjƒÂöƒCãÇâr²W62†rç&V6öâÇÂ~xºÎz¸¾jZû[	®iÊ®Kˆˆ{NûÈÎi¨.KˆŞZ¾Xi˜	š)[é~Xˆn8"r’²sÂ÷ãÂö6–FSâs°¢f"çVÖW&–2ÒG—Vöbrç66÷&RÓÓÒvçVÖ&W"rÂF—FÆRÒçVÖW&–2òt’XŠNXˆnûÉ¢r²rç66÷&R²ròr²æÖ…÷66÷&R¢t’jZûûÉ¢r²†rçfW&F–7BÓÓÒv6÷'&V7Brò~zÙNjjÚ>zâr¢rçfW&F–7BÓÓÒw'F–Ârò~˜:XˆnjÚ>zâr¢~zÙNjiÈŠúòr“°¢&WGW&âsÆ6–FR6Æ73Ò'"Ö–ç6–v‡B"Ö’Öw&FR#ãÆƒCâr²W62‡F—FÆR’²sÂöƒCãÇâr²W62†rç6÷W&6RÓÓÒw&÷f–FVBrò~[{.jZûhùKé¾y¨NXø.ˆ>zÙNj‚r¢t’[{.xºÎz¸¾k.Šz>[›nZHŞj‚r’²~ûÉ¾KˆŞiŠşˆ[ˆ˜	š)h›iKXˆnûÈÎKˆŞKÉ®iKXªˆ>Šù^h‰{º8"r²‚çVÖW&–2ò~kºXˆnh‰nŠøNXˆnŠxNX‰iÊ®zîŠêNûÈÎXú®XŠNijŞKÙÎzÙNûÈÎKˆŞ{Én˜
i[XÎXˆni[8"r¢rr’²sÂ÷ãÇîXø.ˆ>{¹>Šë®ûÉ¢r²W62†ræç7vW%ö¶W’’²sÂ÷âr²&÷6R†ræ6ö×&—6öâ’²föÆB‚~iú^yÈ¾jZûKéŞhÚârÂ&÷6R†rç6öÇWF–öåö6†V6²’²†rç&VfW&Væ6U÷V÷FRòsÇ6Æ73Ò'"ÖWf–FVæ6R#îXø.ˆ>Xéşih~ûÉ¢r²W62†rç&VfW&Væ6U÷V÷FR’²sÂ÷âr¢rr’²sÇ6Æ73Ò'"Ö×WFVB#âr²W62†ræg&öÕö–ÖvRò~KÙÎzÙN[{.K¸îXéşY»îxºÎz¸¾ZHŞj8"r¢~Yû®K¨î[{.KùŞZÙy¨NKÙÎzÙN‹ÚÎ[Ù^8"r’²sÂ÷âr’²sÂö6–FSâs°¢Ğ¢gVæ7F–öâ”w&FT&FvR‡’°¢f"rÒæ•öw&F–æs°¢&WGW&âG—Vöbrç66÷&RÓÓÒvçVÖ&W"ròt’r²rç66÷&R²ròr²æÖ…÷66÷&R²rXˆbr¢t’r²†rçfW&F–7BÓÓÒv6÷'&V7Brò~zÙNjjÚ>zâr¢rçfW&F–7BÓÓÒw'F–Ârò~˜:XˆnjÚ>zâr¢~zÙNjiÈŠúòr“°¢Ğ¢gVæ7F–öâ6öÇWF–öå6V7F–öç2‡’°¢&WGW&â‡çG&ç6fW%÷'VÆRòföÆB‚~Kˆ¾jÊ˜~X‹{¾KËÎš)‚rÂ&÷6R‡çG&ç6fW%÷'VÆR’’¢rr’²‡ç&VfW&Væ6RòföÆB‡ç&VfW&Væ6U÷6÷W&6RÓÓÒw&÷f–FVBrò~Xø.ˆ>zÙNjKˆîŠz>š)jÚ^šªBr¢~Šz>š)Šë.Šz2+r’Šz>iérÂ&÷6R‡ç&VfW&Væ6R’Âw"×6öÇWF–öâr’¢rr“°¢Ğ¢gVæ7F–öâVW7F–öå6V7F–öç2‡Â6÷'&V7F–öâ’°¢–b‡ç&V6÷&EööæÇ’’&WGW&ârs°¢f"‡FÖÂÒæFWF–ÅöÆWfVÂÓÓÒv÷fW'f–WrròsÇ6Æ73Ò'"Ö×WFVB#îiÊÎš)hÈKÚy¨NŠëî{Úî[^zK®zèyúŞ{¹>Šë®ûÈÎiÊ®yIşh‰Šún{¸nŠz>zÙNY(Î{¸>Kš8#Â÷âr¢rs°¢–b‡ææÇ—6—5öÖöFRÓÓÒw7G&VæwF‚rÇÂææÇ—6—5öÖöFRÓÓÒv•÷7G&VæwF‚r’&WGW&â‡FÖÂ²sÇ6Æ73Ò'"ÖgVÆÂÖ7&VF—B#âr²‡ææÇ—6—5öÖöFRÓÓÒv•÷7G&VæwF‚ròt’[{.jZû‹ù˜>š)y¨NzÙNjjÚ>zî8"r¢~‹ù˜>š)[{.[é~kºXˆn8"r’²sÂ÷âr²‡çv–ç2bbçv–ç2æÆVæwF‚ò7W÷'Bçv–ç2‡’æÖ†gVæ7F–öâ‡r’²&WGW&â&÷6R‡rç6¶–ÆÂ’²föÆB‚~yÈ¾KÙÎzÙNY(ÎŠûNiˆârÂsÇ6Æ73Ò'"ÖWf–FVæ6R#âr²W62‡ræö'6W'fVB’²sÂ÷âr²&÷6R‡rç6–væ–f–6æ6R’“²Ò’æ¦ö–â‚rr’¢rr’²6öÇWF–öå6V7F–öç2‡’²F–ff–7VÇG•6V7F–öç2‡“°¢–b‡ææÇ—6—5öÖöFRÓÓÒvæVVG5ö6öæf—&ÖF–öârÇÂææÇ—6—5öÖöFRÓÓÒwVW7F–öåöwV–Fæ6Rr’‡FÖÂ³ÒsÇ6Æ73Ò'"Ö×WFVB#âr²W62‡æ6öæf—&ÖF–öå÷&ö×BÇÂ~Kº^Kˆ¾hÈš)yºîiÚK»nŠë.Šz>ûÈÎKˆŞhÚîjÚNŠøNK»~KÚy¨NKŠ®K«®Šxë8"r’²sÂ÷âs°¢–b‡æ6÷'&V7E÷7FW2bbæ6÷'&V7E÷7FW2æÆVæwF‚’‡FÖÂ³ÒsÇ6V7F–öâ6Æ73Ò'"Ö6÷'&V7B×&Vf—‚#ãÆƒCî[{.{¸şX®Zûy¨N˜:XˆcÂöƒCâr¶'VÆÆWG2‡æ6÷'&V7E÷7FW2’²sÂ÷6V7F–öãâs°¢f"—77VRÒæf—'7Eö—77VS°¢–b‡ç&Wf–Wu÷7FGW2ÓÓÒwFV6†W%ö6öæfÆ–7Br’‡FÖÂ³ÒsÇ6Æ73Ò'"×v&æ–ær#îh›iKKˆâ’XŠNijŞiÈXˆnjÚ~ûÈÎŠû~XXjZûûÉ¾i¨.KˆŞhÚîjÚNXŠNZé®‰hN[Ë8#Â÷âs°¢–b†—77VRbb—77VRæ6W'F–çG’ÓÓÒv6öæf—&ÖVBr’‡FÖÂ³ÒsÆF—b6Æ73Ò'"Öf—'7BÖ—77VR#ãÆƒCî™zîš)X{®YÊ‹ù˜xÂ+rr²W62†—77VRæÆö6F–öâ’²sÂöƒCâr²&÷6R†—77VRæW‡ÆæF–öâ’²sÆƒCî‹ùKˆjÚ^‹ùj~iK“ÂöƒCâr²&÷6R†—77VRæ6÷'&V7F–öâ’²föÆB‚~ZûxZ~KÚy¨NKÙÎzÙBrÂsÇ6Æ73Ò'"ÖWf–FVæ6R#âr²W62†—77VRæö'6W'fVB’²sÂ÷âr’²sÂöF—câs°¢VÇ6R–b‡æÆ÷75÷&V6öâ’‡FÖÂ³ÒsÆƒCî‹ù˜>š)y¨N™zîš)ƒÂöƒCâr²&÷6R‡æÆ÷75÷&V6öâ’²‡æWf–FVæ6RòföÆB‚~ZûxZ~KÚy¨NKÙÎzÙBrÂsÇ6Æ73Ò'"ÖWf–FVæ6R#âr²W62‡æWf–FVæ6R’²sÂ÷âr’¢rr“°¢‡FÖÂ³Ò6W6U6V7F–öç2‡Â6÷'&V7F–öâ“°¢–b‡ç7VvvW7F–öâbb‚—77VRÇÂç7VvvW7F–öâÓÒ—77VRæ6÷'&V7F–öâ’’‡FÖÂ³ÒsÆƒCîhê^yØhîK˜X£ÂöƒCâr²&÷6R‡ç7VvvW7F–öâ“°¢–b‡ç&7F–6R’‡FÖÂ³ÒföÆB‚~{¸>Kˆ˜>ûÈÎyÈ¾yÈ¾KÉ®KˆŞKÉ®K¨brÂ&÷6R‡ç&7F–6R’²sÆF—b6Æ73Ò'"×7V66W72#ãÆ#îj8iú^KˆKˆ¾ûÉ£Âö#âr²&÷6R‡ç7V66W75ö6†V6²’²sÂöF—câr²‡ç&7F–6Uöç7vW"òföÆB‚~X®ZèÎXhŞyÈ¾zÙNj‚rÂ&÷6R‡ç&7F–6Uöç7vW"’’¢rr’Âw"×&7F–6Rr“°¢‡FÖÂ³Ò6öÇWF–öå6V7F–öç2‡“°¢‡FÖÂ³ÒF–ff–7VÇG•6V7F–öç2‡“°¢–b‡çVæ6W'F–çF–W2bbçVæ6W'F–çF–W2æÆVæwF‚’‡FÖÂ³ÒsÆFWF–Ç26Æ73Ò'"Ö÷Vâ×VW7F–öç2#ãÇ7VÖÖ'“îiÊÎš)Š^XX^KúhóÂ÷7VÖÖ'“âr²'VÆÆWG2‡çVæ6W'F–çF–W2’²sÂöFWF–Ç3âs°¢&WGW&â‡FÖÃ°¢Ğ¢gVæ7F–öâf÷&Ô6öçFW‡B†7G‚Â7V&¦V7B’°¢f"6&BÒ'&’æg&öÒ†7G‚æÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræW†Ò×7V&¦V7BÖ6&B×cr’’æf–æB†gVæ7F–öâ†2’²&WGW&â2çVW'•6VÆV7F÷"‚ræW†Ò×7V&¦V7BÖæÖR×cr’çfÇVRçG&–Ò‚’ÓÓÒ7V&¦V7C²Ò“°¢gVæ7F–öâfÂ‡6VÆV7F÷"ÂæöFR’²f"VÂÒ†æöFRÇÂ7G‚æÖöFÂ’çVW'•6VÆV7F÷"‡6VÆV7F÷"“²&WGW&âVÂòçVÖ&W"†VÂçfÇVR’¢çVÆÃ²Ğ¢&WGW&â²66÷&S¢fÂ‚ræ7GVÂ×cbrÂ6&B’ÂÖƒ¢fÂ‚ræÖ‚×cbrÂ6&B’Â&u÷66÷&S¢fÂ‚rç&r×cbrÂ6&B’Â&uöÖƒ¢fÂ‚rç&vÖ‚×cbrÂ6&B’ÂF&vWC¢fÂ‚rçF&vWB×cbrÂ6&B’Â–V%÷&æ³¢fÂ‚rç–V"×&æ²×cbrÂ6&B’Â–V%ö6÷VçC¢fÂ‚rç–V"×'F–6—çG2×cbrÂ6&B’ÇÂfÂ‚r7F÷FÅ'F–6—çG5cbr’Â6Æ75÷&æ³¢fÂ‚ræ6Æ72×&æ²×cbrÂ6&B’Â6Æ75ö6÷VçC¢fÂ‚ræ6Æ72×'F–6—çG2×cbrÂ6&B’ÇÂfÂ‚r7F÷FÄ6Æ75'F–6—çG5cbr’ÂF÷FÅ÷–V%÷&æ³¢fÂ‚r7F÷FÅ&æµcbr’ÂF÷FÅ÷–V%ö6÷VçC¢fÂ‚r7F÷FÅ'F–6—çG5cbr’ÂF÷FÅö6Æ75÷&æ³¢fÂ‚r7F÷FÄ6Æ75&æµcbr’ÂF÷FÅö6Æ75ö6÷VçC¢fÂ‚r7F÷FÄ6Æ75'F–6—çG5cbr’Ó°¢Ğ¢gVæ7F–öâ6†÷r†7G‚Â7V&¦V7BÂG&–vvW"’°¢–b‚7W'&VçB†7G‚’ÇÂ†7G‚æ†÷7BÇÂ7G‚æÖöFÂ’æ—46öææV7FVB’&WGW&âFö7B‚~Šû~˜xŞikh™>[Èˆ>ŠùRr“°¢–b†7G‚æF–Æör’&WGW&ã°¢–b‚7G‚æG&gD–B’7G‚æG&gD–BÒG&gDf÷"†7G‚çW6W"Â7G‚æW†Ô–B“°¢f"6W76–öâÒ7G‚ç6W76–öç5·7V&¦V7EÒÇÂ†7G‚ç6W76–öç5·7V&¦V7EÒÒ²vW3¢µÒÂv÷&´öåW#¢G'VRÂ6öç6VçC¢fÇ6RÂVæF–æs¢çVÆÂÒ“°¢f"F–ÆörÒFö7VÖVçBæ7&VFTVÆVÖVçB†7G‚æ†÷7Bòw6V7F–öâr¢vF–Æörr“²F–Æöræ6Æ74æÖRÒ7G‚æ†÷7Bòw"ÖF–Æör"Ö–æÆ–æRr¢w"ÖF–Æörs²F–Æörç6WDGG&–'WFR‚v&–ÖÆ&VÆÆVF'’rÂw"×F—FÆRr“°¢f"'W7’ÒfÇ6RÂF—'G’ÒfÇ6RÂ6f–ærÒfÇ6RÂ6Æ÷6VBÒfÇ6RÂF–ÖW"Â6VÆV7FVBÒçVÆÂÂ&Wf–Ww2ÒµÒÂV÷FÒçVÆÂÂf–WrÒwWÆöBrÂ–æ—F–Å6V7F–öâÒ7G‚æ–æ—F–Å6V7F–öã°¢f"66†U66÷RÒ7G‚æG&gD–B²wÂr²7V&¦V7BÂ66†UVWVRÒ&öÖ—6Rç&W6öÇfR‚’Â&W7F÷&VEWÆöG2ÒfÇ6S°¢7G‚æF–ÆörÒF–Æös°¢F–Æöræ–ææW$…DÔÂÒsÆ†VFW"6Æ73Ò'"Ö†VB#ãÆF—cãÇ7â6Æ73Ò'"ÖW–V'&÷r#âr²W62‡7V&¦V7B’²r+r$UDÂ÷7ããÆƒ"–CÒ'"×F—FÆR#âr²†7G‚æ÷F–öç2bb7G‚æ÷F–öç2çW'÷6SÓÓÒw&V6÷&Bsò~Šù^š)Kˆî[é~Xˆbs¢t’Xˆniér’²sÂöƒ#ãÂöF—câr²'WGFöâ†W62†7G‚æ6Æ÷6TÆ&VÂÇÂ†7G‚æ†÷7Bò~‹ùNY¹îŠù^XÛ~X‰~Š‚r¢~‹ùNY¹îˆ>ŠùRr’’Âv6Æ÷6Rr’²sÂö†VFW#ãÆF—b6Æ73Ò'"Ö6öçFVçB#ãÆF—b6Æ73Ò'"ÖÖW76vR"&öÆSÒ'7FGW2"&–ÖÆ—fSÒ'öÆ—FR#ãÂöF—cãÆF—b6Æ73Ò'"×F'2#âr²'WGFöâ‚~Kˆ®KÊ‹XNii’rÂwWÆöBrÂv—2Ö7F—fRr’²'WGFöâ‚~XˆniéŠë[ÙRrÂv†—7F÷'’r’²sÂöF—cãÆF—b6Æ73Ò'"ÖÖ–â#ãÂöF—cãÂöF—câs°¢†7G‚æ†÷7BÇÂFö7VÖVçBæ&öG’’æVæD6†–ÆB†F–Æör“°¢–b†F–Æörç6†÷tÖöFÂ’F–Æörç6†÷tÖöFÂ‚“²VÇ6RF–Æörç6WDGG&–'WFR‚v÷VârÂrr“°¢f"Ö–âÒF–ÆörçVW'•6VÆV7F÷"‚rç"ÖÖ–âr’ÂÖW76vRÒF–ÆörçVW'•6VÆV7F÷"‚rç"ÖÖW76vRr“°¢gVæ7F–öâæ÷FR‡FW‡BÂW'&÷"’²ÖW76vRçFW‡D6öçFVçBÒFW‡BÇÂrs²ÖW76vRæ6Æ74Æ—7BçFövvÆR‚v—2ÖW'&÷"rÂW'&÷"“²Ğ¢gVæ7F–öâÆ—fR‚’²&WGW&â6Æ÷6VBbb7W'&VçB†7G‚’bb†7G‚æ†÷7Bò7G‚æ†÷7Bæ—46öææV7FVBbb†7G‚æ—47F—fRò7G‚æ—47F—fR‚’¢7FFRçvRÓÓÒw7FG2rbb²v’rÂwW'2uÒæ–æ6ÇVFW2‡7FFRææÇ—6—5F"’’¢7G‚æÖöFÂæ—46öææV7FVBbb7FFRæÖöFÂÓÓÒ7G‚æÖöFÂ“²Ğ¢gVæ7F–öâ6Æ÷6R†f÷&6R’°¢–b‚f÷&6RbbF—'G’bb6öæf—&Ò‚~jZûKúîiK[	®iÊ®KùŞZÙûÈÎzîZé®‹ùNY¹îˆ>Šù^Y	~ûÉòr’’&WGW&ã°¢6Æ÷6VBÒG'VS²6ÆV%F–ÖV÷WB‡F–ÖW"“²6ÆVçWæF—66öææV7B‚“²7G‚æF–ÆörÒçVÆÃ°¢–b†F–Æöræ6Æ÷6R’F–Æöræ6Æ÷6R‚“²F–Æörç&VÖ÷fR‚“²–b†7G‚æ†÷7Bbb7G‚æöä6Æ÷6Rbbf÷&6R’7G‚æöä6Æ÷6R‚“²VÇ6R–b‡G&–vvW"bbG&–vvW"æ—46öææV7FVB’G&–vvW"æfö7W2‚“°¢Ğ¢f"6ÆVçWÒæWr×WFF–öäö'6W'fW"†gVæ7F–öâ‚’²–b‚†7G‚æ†÷7BÇÂ7G‚æÖöFÂ’æ—46öææV7FVBÇÂ‚7G‚æ†÷7Bbb7FFRæÖöFÂÓÒ7G‚æÖöFÂ’ÇÂ7W'&VçB†7G‚’’6Æ÷6R‡G'VR“²Ò“°¢7G‚æ6äÆVfRÒgVæ7F–öâ‚’²&WGW&âF—'G’ÇÂ6öæf—&Ò‚~jZûKúîiK[	®iÊ®KùŞZÙûÈÎzîZé®zk¾[ÈY	~ûÉòr“²Ó°¢7G‚æF—7÷6RÒgVæ7F–öâ‚’²6Æ÷6R‡G'VR“²Ó°¢6ÆVçWæö'6W'fR†Fö7VÖVçBæ&öG’Â²6†–ÆDÆ—7C¢G'VRÂ7V'G&VS¢G'VRÒ“°¢F–ÆöræFDWfVçDÆ—7FVæW"‚v6æ6VÂrÂgVæ7F–öâ†R’²Rç&WfVçDFVfVÇB‚“²6Æ÷6R†fÇ6R“²Ò“°¢gVæ7F–öâF"†æW‡B’°¢–b†F—'G’bb6öæf—&Ò‚~jZûKúîiK[	®iÊ®KùŞZÙûÈÎzîZé®Xˆ~hÚ.Y	~ûÉòr’’&WGW&âfÇ6S°¢òò¶VWF†RÆ—fR7FGW2æöFRv†VâF†RWÆöB6öçFVçG2&R&WÆ6VBà¢–b†Ö–âæ6öçF–ç2†ÖW76vR’’Ö–âæ&Vf÷&R†ÖW76vR“°¢F—'G’ÒfÇ6S²f–WrÒæW‡C²–b†7G‚æöåf–Wr’7G‚æöåf–Wr†æW‡B“°¢F–ÆörçVW'•6VÆV7F÷$ÆÂ‚rç"×F'2'WGFöâr’æf÷$V6‚†gVæ7F–öâ†"’²"æ6Æ74Æ—7BçFövvÆR‚v—2Ö7F—fRrÂ"æFF6WBç"ÓÓÒæW‡B“²Ò“°¢&WGW&âG'VS°¢Ğ¢gVæ7F–öâ6æ6†÷B‚’°¢f"–ÆöBÒ6W76–öâç–ÆöBbbö&¦V7Bæ76–vâ‡·ÒÂ6W76–öâç–ÆöB“²–b‡–ÆöB’FVÆWFR–ÆöBçvW3°¢&WGW&â²66÷S¢66†U66÷RÂvW3¢6W76–öâçvW2Âv÷&´öåW#¢6W76–öâçv÷&´öåW"Âv÷&´Æö6F–öã¢6W76–öâçv÷&´Æö6F–öâÂ6öç6VçC¢6W76–öâæ6öç6VçBÂVæF–æs¢6W76–öâçVæF–ærÂ–ÆöC¢–ÆöBÂ&WG'•7V&Ö—76–öã¢6W76–öâç&WG'•7V&Ö—76–öâÂ6Æ÷VDG&gD–C¢6W76–öâæ6Æ÷VDG&gD–BÂ6Æ÷VE&VG“¢6W76–öâæ6Æ÷VE&VG’Ó°¢Ğ¢7–æ2gVæ7F–öâ6fT6Æ÷VB†–B’°¢–b†7G‚æ÷F–öç2bb7G‚æ÷F–öç2æ6öæf–u÷fW'6–öãÓÓÓ"’7G‚æ÷F–öç2çv÷&µöÆö6F–öã×6W76–öâçv÷&´Æö6F–öâÇÂ‡6W76–öâçv÷&´öåW#òwW"s§6W76–öâçvW2ç6öÖR†gVæ7F–öâ‡—·&WGW&âç&öÆSÓÓÒwv÷&²s·Ò“òw6W&FRs¢væöæRr“°¢v—B’†7G‚Âw6fUöÖFW&–Ç2rÂ²&WVW7Eö–C¢–BÂG&gEö–C¢7G‚æG&gD–BÂW†Õö–C¢7G‚æW†Ô–BÇÂçVÆÂÂ7V&¦V7C¢7V&¦V7BÂF—FÆS¢7G‚çF—FÆRÇÂrrÂ÷F–öç3¢7G‚æ÷F–öç2ÂvUö6÷VçC¢6W76–öâçvW2æÆVæwF‚Â6öç6VçC¢G'VRÒ“°¢6W76–öâæ6Æ÷VDG&gD–BÒ–C°¢f÷"‡f"’Ò²’Â6W76–öâçvW2æÆVæwFƒ²’²²’°¢æ÷FR‚~jÚ>YÊKùŞZÙhš¾høşK»br²‡’²’²ròr²6W76–öâçvW2æÆVæwF‚“°¢G'’²v—B’†7G‚ÂwWÆöE÷vRrÂ²&WVW7Eö–C¢–BÂvS¢’²Â&öÆS¢6W76–öâçvW5·•Òç&öÆRÂW&Ã¢6W76–öâçvW5·•ÒçW&ÂÂ&Vv–öç3¢6W76–öâçvW5·•Òç&Vv–öç2ÇÂµÒÒ“²Ğ¢6F6‚†R’²RæÖW76vRÒ~zÊÂr²‡’²’²r[Êhš¾høşK»nKùŞZÙZK‹J^ûÉ¢r²RæÖW76vS²F‡&÷rS²Ğ¢Ğ¢6W76–öâæ6Æ÷VE&VG’ÒG'VS²6W76–öâæ6Æ÷VDG&gD–BÒ–C°¢Ğ¢gVæ7F–öâW'6—7B‚’°¢f"–BÒ6W76–öâçVæF–ærÇÂ6W76–öâæ66†T–BÇÂ66†U66÷RÂfÇVRÒ6æ6†÷B‚“²6W76–öâæ66†T–BÒ–C°¢66†UVWVRÒ66†UVWVRçF†Vâ†gVæ7F–öâ‚’²&WGW&â7W÷'BçWÆöG2‚wWBrÂ7G‚çW6W"Â–BÂfÇVR“²Ò“°¢&WGW&â66†UVWVS°¢Ğ¢gVæ7F–öâf–ÆÂ‡6fVB’°¢–b‚6fVBÇÂ6fVBç66÷RÓÒ66†U66÷RÇÂ'&’æ—4'&’‡6fVBçvW2’’&WGW&âfÇ6S°¢6W76–öâçvW2Ò6fVBçvW3²6W76–öâçv÷&´öåW"Ò6fVBçv÷&´öåW#²6W76–öâçv÷&´Æö6F–öâÒ6fVBçv÷&´Æö6F–öã²6W76–öâæ6öç6VçBÒ6fVBæ6öç6VçC°¢6W76–öâæ6Æ÷VDG&gD–BÒ6fVBæ6Æ÷VDG&gD–C²6W76–öâæ6Æ÷VE&VG’Ò6fVBæ6Æ÷VE&VG“°¢6W76–öâçVæF–ærÒ6fVBçVæF–æs²6W76–öâæ66†T–BÒ6fVBæ–C²6W76–öâç&WG'•7V&Ö—76–öâÒ6fVBç&WG'•7V&Ö—76–öã°¢6W76–öâç–ÆöBÒ6fVBç–ÆöBbbö&¦V7Bæ76–vâ‡·ÒÂ6fVBç–ÆöBÂ²vW3¢6fVBçvW2æÖ†gVæ7F–öâ‡’²&WGW&â²&öÆS¢ç&öÆRÂW&Ã¢çW&ÂÂ&Vv–öç3¢ç&Vv–öç2ÇÂµÒÓ²Ò’Ò“°¢&W7F÷&VEWÆöG2ÒG'VS²&WGW&âG'VS°¢Ğ¢7–æ2gVæ7F–öâ&W7VÖR‚’°¢f""Ò6VÆV7FVC°¢–b‚"’&WGW&ã°¢f"ÖF6†–ærÒ6W76–öâçVæF–ærÓÓÒ"ç&WVW7Eö–BÇÂ6W76–öâæ66†T–BÓÓÒ"ç&WVW7Eö–C°¢–b‚‚ÖF6†–ærÇÂ6W76–öâçvW2æÆVæwF‚’bb"ç&V6÷fW'’bb"ç&V6÷fW'’æÖöFRÓÒw6fVBr’°¢f–ÆÂ†v—B7W÷'BçWÆöG2‚vvWBrÂ7G‚çW6W"Â"ç&WVW7Eö–B’“²ÖF6†–ærÒ6W76–öâçVæF–ærÓÓÒ"ç&WVW7Eö–BÇÂ6W76–öâæ66†T–BÓÓÒ"ç&WVW7Eö–C°¢Ğ¢–b‚‚ÖF6†–ærÇÂ6W76–öâçvW2æÆVæwF‚’bb"ç&V6÷fW'’bb"ç&V6÷fW'’æÖöFRÓÓÒv–ÖvW2r’°¢6W76–öâç&W7VÖUF&vWBÒ"ç&WVW7Eö–C²6W76–öâçVæF–ærÒ"ç&WVW7Eö–C²6W76–öâæ66†T–BÒ"ç&WVW7Eö–C²6W76–öâç–ÆöBÒçVÆÃ²–b‚ÖF6†–ær’6W76–öâçvW2ÒµÓ²WÆöB‚“²æ÷FR‚~[{.h.ZHŞXˆniéŠë[Ù^ûÈÎŠû~Š^XX^[	®iÊ®KùŞZÙX‹iÊÎiË®y¨NXéşY»î8"r“²&WGW&ã°¢Ğ¢f"FFÒv—B’†7G‚Âw&W7VÖRrÂ²&WVW7Eö–C¢"ç&WVW7Eö–BÀ¢ÖöFS¢7G‚æ†÷7Bòw6fVBr¢ÖF6†–ærbb6W76–öâçvW2æÆVæwF‚òv–ÖvW2r¢w6fVBrÀ¢vW3¢7G‚æ†÷7BbbÖF6†–ærò6W76–öâçvW2æÖ†gVæ7F–öâ‡’²&WGW&â²&öÆS¢ç&öÆRÂW&Ã¢çW&ÂÂ&Vv–öç3¢ç&Vv–öç2ÇÂµÒÓ²Ò’¢µÒÀ¢v÷&µööå÷W#¢6W76–öâçv÷&´öåW"Â6öç6VçC¢6W76–öâæ6öç6VçBÒ“°¢6W76–öâçVæF–ærÒ"ç&WVW7Eö–C²6W76–öâç&W7VÖUF&vWBÒçVÆÃ°¢–b‡6W76–öâçvW2æÆVæwF‚’v—BW'6—7B‚“°¢v—BÆöB†FFç&WVW7Eö–BÇÂ"ç&WVW7Eö–B“°¢Ğ¢gVæ7F–öâWÆöB‚’°¢–b‚F"‚wWÆöBr’’&WGW&ã°¢f"V÷FFW‡BÒV÷Fò‡V÷FæVæ&ÆVBò‡V÷FçVæ—CÓÓÒv7&VF—G2sò~XúşyJ‚r´ÖF‚æfÆö÷"‡V÷Fç&VÖ–æ–ær’²r’zzşXˆbs¢~XšKÙ’r·V÷Fç&VÖ–æ–ær²rjÊr’¢~Šù^š)ŠønXŠ¾i¨.iÊ®[ÈiKâr’¢~jÚ>YÊŠû¾Xùb’š)Ş[ªn(
bs°¢f"Æö6F–öâÒ6W76–öâçv÷&´Æö6F–öâÇÂ‡6W76–öâçv÷&´öåW"òwW"r¢6W76–öâçvW2ç6öÖR†gVæ7F–öâ‡—·&WGW&âç&öÆSÓÓÒwv÷&²s·Ò’òw6W&FRr¢væöæRr“°¢Ö–âæ–ææW$…DÔÂÒ‡&W7F÷&VEWÆöG2òsÇ6Æ73Ò'"ÖÖW76vR#î[{.ˆz®XªY¹îZ¾Kˆ®jÊy¨NY»îx˜~8š®[¨şY(ÎŠëî{Úî8#Â÷âr¢rr’²sÇ6V7F–öâ6Æ73Ò'"Ö–çG&ò#ãÆƒ3îk{¾XªŠù^XÛ~KˆîKÙÎzÙCÂöƒ3ãÇîhÈš^[¨şk{¾Xªkˆ^i›Y»îx˜~ûÈÎŠù^XÛ~8zÙNš)XÚKˆîXø.ˆ>zÙNjYŠêiÈZI¢R[Ê8#Â÷ãÆF—b6Æ73Ò'"×V÷F#âr²W62‡V÷FFW‡B’²sÂöF—cãÂ÷6V7F–öããÆf–VÆG6WB6Æ73Ò'"×v÷&²ÖÆö6F–öâ#ãÆÆVvVæCîKÙÎzÙNXiYÊY:®˜xÎûÉóÂöÆVvVæCâr²µ²wW"rÂ~XiYÊŠù^XÛ~Kˆ¢rÂ~Kˆ®KÊ[ŠnKÙÎzÙNy¨NŠù^XÛ~XÛ>Xúş8"uÒÅ²w6W&FRrÂ~YÊzÙNš)XÚKˆ¢rÂ~XˆnXŠ¾k{¾XªŠù^XÛ~Y(ÎzÙNš)XÚ8"uÒÅ²væöæRrÂ~K¸^Kˆ®KÊš)yºârÂ~Xú®ŠønXŠ¾š)yºîKˆîXÛX‹~XˆnXÎûÈÎKˆŞyIşh‰Xˆnié8"uÕÒæÖ†gVæ7F–öâ‡‚—·&WGW&âsÆÆ&VÃãÆ–çWBG—SÒ'&F–ò"æÖSÒ'%öÆö6F–öâ"fÇVSÒ"r·…³Ò²r"r²†Æö6F–öãÓÓ×…³Óòv6†V6¶VBs¢rr’²sãÇ7ããÇ7G&öæsâr·…³Ò²sÂ÷7G&öæsãÇ6ÖÆÃâr·…³%Ò²sÂ÷6ÖÆÃãÂ÷7ããÂöÆ&VÃâs·Ò’æ¦ö–â‚rr’²sÂöf–VÆG6WCâr°¢ö&¦V7Bæ¶W—2‡&öÆTæÖW2’æÖ†gVæ7F–öâ‡&öÆR’°¢f"vW2Ò6W76–öâçvW2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âç&öÆRÓÓÒ&öÆS²Ò“°¢&WGW&âsÇ6V7F–öâ6Æ73Ò'"×WÆöBÖw&÷W"FF×WÆöB×&öÆSÒ"r²&öÆR²r"r²‡&öÆSÓÓÒwv÷&²rbbÆö6F–öâÓÒw6W&FRrbbvW2æÆVæwF‚òv†–FFVâr¢rr’²sãÆF—b6Æ73Ò'"×6V7F–öâÖ†VB#ãÆƒ3âr²&öÆTæÖW5·&öÆUÒ²sÇ6ÖÆÃâr²‡&öÆRÓÓÒwW"rò~[ø^˜’r¢~Š^XX^‹XNii’r’²sÂ÷6ÖÆÃãÂöƒ3ãÆÆ&VÂ6Æ73Ò'"Ö'WGFöâ"Öf–ÆRÖÆ&VÂ#îûÈ²k{¾XªY»îx˜sÆ–çWBG—SÒ&f–ÆR"66WCÒ&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"×VÇF—ÆRFF×&öÆSÒ"r²&öÆR²r"r²†'W7’òvF—6&ÆVBr¢rr’²sãÂöÆ&VÃãÂöF—cãÇâr²‡²W#¢~hÈš)yºîš®[¨şKˆ®KÊûÈÎKÙÎzÙNXiYÊŠù^XÛ~Kˆ®K™şXúşKº^8"rÂv÷&³¢~KÙÎzÙNYÊXÙ^xºÎy¨NzÙNš)XÚKˆ®i{nûÈÎŠû~Š^XX^Kˆ®KÊ8"rÂ&VfW&Væ6S¢~Š^XX^Xø.ˆ>zÙNjh‰nŠøNXˆn{¸nX‰ûÈÎXúşKº^i»NXxnzîYËjZûzÙNjY(Î[é~XˆnjÚ^šªN8"rÒ•·&öÆUÒ²sÂ÷ãÆF—b6Æ73Ò'"×vW2#âr²vW2æÖ†gVæ7F–öâ‡’°¢f"’Ò6W76–öâçvW2æ–æFW„öb‡“°¢&WGW&âsÆ'F–6ÆR6Æ73Ò'"×vR#ãÆ–Ör7&3Ò"r²çW&Â²r"ÇCÒ"r²W62‡&öÆTæÖW5·&öÆUÒ²~zÊÂr²‡vW2æ–æFW„öb‡’²’²~šRr’²r#ãÆF—b6Æ73Ò'"×vRÖ–æfò#îzÊÂr²†’²’²ršR+rr²W62‡ææÖR’²sÂöF—cãÆF—b6Æ73Ò'"×vRÖ7F–öç2#âr²'WGFöâ‚~X˜Şz{²rÂwW¢r²’’²'WGFöâ‚~ix¾‹ÚÂrÂw&÷FFS¢r²’’²'WGFöâ‚~z{¾™šBrÂw&VÖ÷fS¢r²’’²sÂöF—cãÂö'F–6ÆSâs°¢Ò’æ¦ö–â‚rr’²sÂöF—cãÂ÷6V7F–öãâs°¢Ò’æ¦ö–â‚rr’²sÆÆ&VÂ6Æ73Ò'"Ö6†V6²"†–FFVããÆ–çWBG—SÒ&6†V6¶&÷‚"–CÒ'"×v÷&²"r²‡6W76–öâçv÷&´öåW"òv6†V6¶VBr¢rr’²sîŠù^XÛ~Y»îx˜~KŠŞXÈ^Y
¾h‰y¨NKÙÎzÙBòˆ[ˆh›iK“ÂöÆ&VÃâr°¢sÆFWF–Ç26Æ73Ò'"Ö†VÇ#ãÇ7VÖÖ'“îY»îx˜~Šhk.KˆîŠêjÊŠûNiˆãÂ÷7VÖÖ'“ãÇîiJşhÈ¥~8ä~8vV%ûÈÎX[ûÙâr²Ô…õtU2²r[ÊûÈÎjøş[ÊXéşY»îKˆŞ‹h^‹ørÔ.8.h¸Şkˆ^š)Xû~8ih~ZÙ~8jÚ^šªNY(Îh›iKyy^‹ûûÈÎŠ8hèZy>YŞ8ˆ>Xû~zØKúhş8%DbŠû~XX‹ÚÎh‰Y»îx˜~8#Â÷ãÇîyÈ¾KˆŞkˆ^y¨N˜:XˆnXÙ^xºÎjZûûÈÎX[nK¹nXh^Zë{º~{ºŞXˆnié8$’XŠNijŞKˆîˆ[ˆh›iKXˆnXˆn[Èi‹îzK®ûÈÎKˆŞKÉ®ˆz®XªZ¾XZ^ˆ>Šù^h‰{º8.k*iÈKÙÎzÙNK™şXúşŠë.Šz>š)yºîY(ÎZèhé.Xéşš)[	ŞŠù^ûÈÎKØnKˆŞŠøNK»~KŠ®K«®KÉXª>8.{Én‹éKŠŞy¨NY»îx˜~KÉ®i¨.ZÙYÊ[Ù>X˜ŞŠëîZHs~ZJ8.hùKªNYîhš¾høşK»nY(Î[Ù^XZ^Xh^ZëKùŞZÙX‹[Ù>X˜Ş‹JnXû~ûÈÎXúş‹zŠëîZH~iú^yÈ¾Y(Îh.ZHŞûÉ¾XŠ™šNXéşZx¾Šù^š)[Ù^XZ^KÉ®XŠ™šNhš¾høşK»nûÈÎ[{.iÈXˆniéK¸ŞKùŞyYih~ZÙ~8#Â÷ãÇîŠù^yJjÊi[xºÎz¸¾K¨îh‰{ºŠønY»î8$’ŠønXŠ¾[Ù^XZ^Kˆîik[»¢’XˆniéYNŠêKˆjÊûÈÎZK‹J^K™şŠêjÊûÉ¾˜xŞZHŞhùKªNYÎKˆŠû~k.8iú^yÈ¾Y(Îh˜¾XªjZûKˆŞ˜xŞZHŞŠêjÊ8.XÉ~KªÎi{n™{NjøşZJ’x+˜xŞ{Úî8#Â÷ãÂöFWF–Ç3âr°¢sÆÆ&VÂ6Æ73Ò'"Ö6†V6²"Ö6öç6VçB#ãÆ–çWBG—SÒ&6†V6¶&÷‚"–CÒ'"Ö6öç6VçB"r²‡6W76–öâæ6öç6VçBòv6†V6¶VBr¢rr’²sîYÎhHş[n‹ùK©¾Y»îx˜~ûÈÎKº^Xø®XXŠë‹>yJi{ny¨NiÊÎjÊKˆîXènXû.ˆ>Šù^i[XÎXù˜{¹zÊÎKˆik’’iÈŞXªXˆniéûÈÎ[›nYÊ‹JnXû~Xh^KùŞZÙhš¾høşK»nKˆîhª^Y£ÂöÆ&VÃãÆF—b6Æ73Ò'"Öfö÷FW"#ãÇ7ãâr²6W76–öâçvW2æÆVæwF‚²ròr²Ô…õtU2²r[ÊÂ÷7ãâr²'WGFöâ‡6W76–öâç&W7VÖUF&vWBò~h.ZHŞ‹ùK»ŞXˆniér¢6W76–öâçVæF–ærò‡6W76–öâç&WG'•7V&Ö—76–öâò~{º~{ºŞzîŠêNiÊÎjÊXˆniér¢~iú^yÈ¾‹ù¾ŠÎKŠŞy¨NXˆniér’¢'W7’ò~ZHNynY»îx˜~KŠŞ(
br¢7G‚æ÷F–öç2bb7G‚æ÷F–öç2çW'÷6SÓÓÒw&V6÷&Brò~[ÈZx¾ŠønXŠ²+rkhˆ	rjÊr¢~[ÈZx¾Xˆnié+rkhˆ	rjÊrÂ6W76–öâç&W7VÖUF&vWBòw&W7VÖRr¢w7F'BrÂw"×&–Ö'’r’²sÂöF—câs°¢f"&VfW&Væ6Tw&÷WÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×WÆöB×&öÆS×&VfW&Væ6UÒr“¶–b‡&VfW&Væ6Tw&÷W—·f"W‡G&ÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“¶W‡G&æ6Æ74æÖSÒw"×WÆöBÖW‡G&s¶W‡G&æ÷Vã×6W76–öâçvW2ç6öÖR†gVæ7F–öâ‡—·&WGW&âç&öÆSÓÓÒw&VfW&Væ6Rs·Ò“¶W‡G&æ–ææW$…DÔÃÒsÇ7VÖÖ'“îk{¾XªXø.ˆ>zÙNjûÈ˜Z¾ûÈ“Â÷7VÖÖ'“âs·&VfW&Væ6Tw&÷Wæ&Vf÷&R†W‡G&“¶W‡G&æVæD6†–ÆB‡&VfW&Væ6Tw&÷W“·Ğ¢–b†VçG'”öæÇ’‚’—°¢Ö–âçVW'•6VÆV7F÷"‚u¶æÖS×%öÆö6F–öåÕ·fÇVSÖæöæUÒr’æ6Æ÷6W7B‚vÆ&VÂr’çVW'•6VÆV7F÷"‚w6ÖÆÂr’çFW‡D6öçFVçCÒ~ŠønXŠ¾š)yºî8XˆnXÎXø®[{.iÈXø.ˆ>zÙNj8"s°¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×WÆöB×&öÆS×W%Óçr’çFW‡D6öçFVçCÒ~hÈš)yºîš®[¨şKˆ®KÊ8"s°¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×WÆöB×&öÆS×&VfW&Væ6UÓçr’çFW‡D6öçFVçCÒ~XúşKˆ®KÊXø.ˆ>zÙNjh‰nŠøNXˆn{¸nX‰8"s°¢Ö–âçVW'•6VÆV7F÷"‚rç"Ö†VÇr’æ–ææW$…DÔÃÒsÇ7VÖÖ'“îY»îx˜~KˆîŠønXŠ¾ŠûNiˆãÂ÷7VÖÖ'“ãÇä¥ròäròvV%ûÈÎXÙ^[ÊKˆŞ‹h^‹ørÔ.8.h¸Şkˆ^š)Xû~Kˆîh›iKXˆnûÈÎŠ8hèZy>YŞ8ˆ>Xû~ûÉµDbŠû~XX‹ÚÎY»îx˜~8#Â÷ãÇîXú®‹ÚÎ[Ù^[{.iÈXh^ZëûÈÎjŠ{8®ZHNyKKÚjZûûÉ¾KˆŞŠz>š)8KˆŞXŠNXˆn8KˆŞyIşh‰Xˆnié8#Â÷âs°¢Ö–âçVW'•6VÆV7F÷"‚rç"Ö6öç6VçBr’æÆ7D6†–ÆBçFW‡D6öçFVçCÒ~YÎhHş[nY»îx˜~Xù˜{¹’’ŠønXŠ¾ûÈÎ[›nYÊ‹JnXû~KŠŞKùŞZÙŠù^š)‹XNii’s°¢Ğ¢–b‡V÷FbbV÷FçVæ—CÓÓÒv7&VF—G2r—°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶æÖS×%öÆö6F–öåÒr’æf÷$V6‚†gVæ7F–öâ†VÂ—·f"6ÖÆÃÖVÂæ6Æ÷6W7B‚vÆ&VÂr’çVW'•6VÆV7F÷"‚w6ÖÆÂr“·6ÖÆÂæ–ç6W'DF¦6VçD…DÔÂ‚v&Vf÷&VVæBrÂrÆ#î™Èr²†VÂçfÇVSÓÓÒvæöæRsóS£C’²rXúşyJzzşXˆcÂö#âr“·Ò“°¢Ö–âçVW'•6VÆV7F÷"‚rç"×V÷Fr’æ–ç6W'DF¦6VçD…DÔÂ‚v&Vf÷&VVæBrÂsÆF—b6Æ73Ò'"Ö7&VF—B×V÷FR#ãÆ#âr²‡·W#¢~XiYÊŠù^XÛ~Kˆ¢rÇ6W&FS¢~YÊzÙNš)XÚKˆ¢rÆæöæS¢~K¸^Kˆ®KÊš)yºâwÒ•¶Æö6F–öåÒ²sÂö#â+r[ÈZx¾™Èr²†Æö6F–öãÓÓÒvæöæRsóS£C’²rXˆcÂöF—cãÆFWF–Ç3ãÇ7VÖÖ'“îZh.KÙ^hš>XˆcÂ÷7VÖÖ'“ãÇîhÈZéî™˜^yJ˜xşhš>XˆnûÈÎZK‹J^KˆŞhš>8.hùKªNi{niÈZI®š(NyY’r´ÖF‚æÖ–âƒÄÖF‚æfÆö÷"‡V÷Fç&VÖ–æ–ær’’²rXˆnûÈÎZèÎh‰Yî˜x®iKîKÙ˜xş8.h˜¾XªjZûKˆîKùŞZÙXXŞ‹K8#Â÷ãÂöFWF–Ç3âr“°¢Ğ¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚v–çWE·G—SÖf–ÆUÒr’æf÷$V6‚†gVæ7F–öâ†–çWB’²–çWBæöæ6†ævRÒ7–æ2gVæ7F–öâ‚’°¢f"f–ÆW2Ò'&’æg&öÒ†–çWBæf–ÆW2ÇÂµÒ“²–b‚f–ÆW2æÆVæwF‚ÇÂ'W7’’&WGW&ã°¢–b†f–ÆW2æÆVæwF‚²6W76–öâçvW2æÆVæwF‚âÔ…õtU2’&WGW&âæ÷FR‚~jøşjÊiÈZI¢r²Ô…õtU2²r[ÊûÈÎŠû~XXz{¾™šNZI®KÙY»îx˜rrÂG'VR“°¢'W7’ÒG'VS²æ÷FR‚~jÚ>YÊZHNynY»îx˜~(
br“²WÆöB‚“°¢G'’°¢f"FFVBÒµÓ°¢f÷"‡f"f–ÆRöbf–ÆW2’²f"Òv—B&W&R†f–ÆR“²ç&öÆRÒ–çWBæFF6WBç&öÆS²FFVBçW6‚‡“²Ğ¢f"ÆÂÒ6W76–öâçvW2æ6öæ6B†FFVB“°¢–b†ÆÂç&VGV6R†gVæ7F–öâ†âÂ’²&WGW&ââ²çW&ÂæÆVæwF‚²‡ç&Vv–öç2ÇÂµÒ’ç&VGV6R†gVæ7F–öâ‡7VÒÂW&Â’²&WGW&â7VÒ²W&ÂæÆVæwFƒ²ÒÂ“²ÒÂ’â#’F‡&÷ræWrW'&÷"‚~Y»îx˜~h¾ZJ~[ş‹è>ZJ~ûÈÎŠû~Xxş[	š^i[r“°¢6W76–öâçvW2ÒÆÃ²6W76–öâæ6Æ÷VE&VG’ÒfÇ6S²&W7F÷&VEWÆöG2ÒfÇ6S²f"6fVBÒv—BW'6—7B‚“²æ÷FR‡6fVBò~Y»îx˜~[{.KùŞZÙûÈÎXúşj8iú^ikY	Y(Îš^[¨òr¢~Y»îx˜~[{.k{¾XªûÈÎŠû~KùŞhÈš^™Ú.h™>[Èy»NX‹š)yºîY(ÎKÙÎzÙNŠû¾XùnZèÎh‰8"r“°¢Ò6F6‚†R’²æ÷FR†RæÖW76vRÂG'VR“²Òf–æÆÇ’²'W7’ÒfÇ6S²–b†Æ—fR‚’’WÆöB‚“²Ğ¢Ó²Ò“°¢–b†7G‚æöåWÆöB’7G‚æöåWÆöB†Ö–â“°¢Ö–âçVW'•6VÆV7F÷"‚rç"Öfö÷FW"r’ç&WVæB†ÖW76vR“°¢ÖW76vRæ6Æ74Æ—7BæFB‚w"Ö7F–öâÖÖW76vRr“°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶æÖS×%öÆö6F–öåÒr’æf÷$V6‚†gVæ7F–öâ†VÂ—¶VÂæöæ6†ævSÖgVæ7F–öâ‚—°¢–b†VÂçfÇVSÓÓÒvæöæRrbb6W76–öâçvW2ç6öÖR†gVæ7F–öâ‡—·&WGW&âç&öÆSÓÓÒwv÷&²s·Ò’—¶VÂæ6†V6¶VCÖfÇ6S¶Ö–âçVW'•6VÆV7F÷"‚u¶æÖS×%öÆö6F–öåÕ·fÇVSÒ"r¶Æö6F–öâ²r%Òr’æ6†V6¶VC×G'VS·&WGW&âæ÷FR‚~[{.k{¾XªzÙNš)XÚûÈÎŠû~XXz{¾™šNKÙÎzÙNY»îx˜~XhŞ˜hº(	ÎK¸^Kˆ®KÊš)yºî(	ÒrÇG'VR“·Ğ¢6W76–öâçv÷&´Æö6F–öãÖVÂçfÇVS·6W76–öâçv÷&´öåW#ÖVÂçfÇVSÓÓÒwW"s·6W76–öâæ6Æ÷VE&VG“ÖfÇ6S·W'6—7B‚“·WÆöB‚“°¢Ó·Ò“°¢Ö–âçVW'•6VÆV7F÷"‚r7"×v÷&²r’æöæ6†ævRÒgVæ7F–öâ†R’²6W76–öâçv÷&´öåW"ÒRçF&vWBæ6†V6¶VC²W'6—7B‚“²Ó°¢Ö–âçVW'•6VÆV7F÷"‚r7"Ö6öç6VçBr’æöæ6†ævRÒgVæ7F–öâ†R’²6W76–öâæ6öç6VçBÒRçF&vWBæ6†V6¶VC²W'6—7B‚“²Ó°¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×#×7F'EÒÅ¶FF×#×&W7VÖUÒr’æF—6&ÆVBÒ'W7’ÇÂ‚6W76–öâç&W7VÖUF&vWBbb‚6W76–öâçVæF–ærbb‚V÷FÇÂV÷FæVæ&ÆVBÇÂV÷Fç&VÖ–æ–ærÂ‡V÷FçVæ—CÓÓÒv7&VF—G2sò†Æö6F–öãÓÓÒvæöæRsóS£C“£’ÇÂV÷FævÆö&Åöf–Æ&ÆR’’“°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚rç"×vRÖ7F–öç2'WGFöâr’æf÷$V6‚†gVæ7F–öâ†"’²"æF—6&ÆVBÒ'W7“²Ò“°¢–b†7G‚æ†÷7Bbb6W76–öâçVæF–ær’°¢f"fö÷FW"ÒÖ–âçVW'•6VÆV7F÷"‚rç"Öfö÷FW"r’ÂG&gD'WGFöâÒFö7VÖVçBæ7&VFTVÆVÖVçB‚v'WGFöâr“°¢G&gD'WGFöâçG—RÒv'WGFöâs²G&gD'WGFöâæ6Æ74æÖRÒw"Ö'WGFöâs²G&gD'WGFöâçFW‡D6öçFVçBÒ~KùŞZÙ‹XNiiˆØz‹òs²G&gD'WGFöâæF—6&ÆVBÒ'W7“°¢fö÷FW"æ–ç6W'D&Vf÷&R†G&gD'WGFöâÂfö÷FW"æÆ7DVÆVÖVçD6†–ÆB“°¢G&gD'WGFöâæöæ6Æ–6²Ò7–æ2gVæ7F–öâ‚’°¢–b‚6W76–öâçvW2ç6öÖR†gVæ7F–öâ‡’²&WGW&âç&öÆRÓÓÒwW"s²Ò’’&WGW&âæ÷FR‚~Šû~XXk{¾XªŠù^XÛ~Y»îx˜rrÂG'VR“°¢–b‚6W76–öâæ6öç6VçB’&WGW&âæ÷FR‚~Šû~XXzîŠêNhš¾høşK»nKùŞZÙŠûNiˆârÂG'VR“°¢'W7’ÒG'VS²G&gD'WGFöâæF—6&ÆVBÒG'VS°¢G'’²–b†7G‚æ&Vf÷&U7V&Ö—B’7V&¦V7BÒv—B7G‚æ&Vf÷&U7V&Ö—B‚“²v—B6fT6Æ÷VB‡6W76–öâæ6Æ÷VDG&gD–BÇÂ7'—Fòç&æFöÕUT”B‚’“²v—BW'6—7B‚“²æ÷FR‚~ˆØz‹ş[{.KùŞZÙûÈÎXúşK¸îŠù^XÛ~X‰~Š{º~{ºŞKˆ®KÊr“²Ğ¢6F6‚†R’²æ÷FR†RæÖW76vRÂG'VR“²Òf–æÆÇ’²'W7’ÒfÇ6S²–b†G&gD'WGFöâæ—46öææV7FVB’G&gD'WGFöâæF—6&ÆVBÒfÇ6S²Ğ¢Ó°¢Ğ¢Ğ¢gVæ7F–öâ†—7F÷'’‚’°¢–b‚F"‚v†—7F÷'’r’’&WGW&ã°¢Ö–âæ–ææW$…DÔÂÒsÆƒ3îiÊÎzyyºîy¨NXˆniéŠë[ÙSÂöƒ3ãÇ6Æ73Ò'"Ö×WFVB#îi‹îzK®iÊÎjÊˆ>Šù^y¨Nhª^Y®ûÈÎKº^Xø®iÊÎzyyºî[	®iÊ®X[>ˆNˆ>Šù^y¨Nhª^Y®8.Šù^XÛ~XéşY»îŠû~yYYÊˆz®[{y¨NŠëîZH~KŠŞ8#Â÷âr°¢‡&Wf–Ww2æÆVæwF‚ò&Wf–Ww2æÖ†gVæ7F–öâ‡"’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö†—7F÷'’"FF×#Ò'&W÷'C¢r²"ç&WVW7Eö–B²r#ãÇ7ãâr²W62†æWrFFR‡"æ7&VFVEöB’çFôÆö6ÆU7G&–ær‚w¦‚Ô4âr’’²sÇ6ÖÆÂ6Æ73Ò'"Ö×WFVB#â+rr²‡"æW†Õö–Bò~iÊÎjÊˆ>ŠùRr¢~iÊ®X[>ˆNˆ>ŠùRr’²sÂ÷6ÖÆÃãÂ÷7ããÆ#âr²‡²'Vææ–æs¢~XˆniéKŠÒrÂ7V66VVFVC¢~iú^yÈ¾hª^Y¢rÂf–ÆVC¢~iÊ®ZèÎh‰rÒ•·"ç7FGW5Ò²r(i#Âö#ãÂö'WGFöãâs²Ò’æ¦ö–â‚rr’¢sÆF—b6Æ73Ò'"ÖV×G’#î‹ùk*iÈhª^Y®ûÈÎKˆ®KÊ‹ùjÊˆ>Šù^y¨NŠù^XÛ~Šù^Šù^8#ÂöF—câr“°¢Ğ¢7–æ2gVæ7F–öâ&Vg&W6‚‚’°¢f"&W7öç6W2Òv—B&öÖ—6RæÆÅ6WGFÆVB…¶’†7G‚ÂwV÷Fr’Â7G‚ç6WGWò&öÖ—6Rç&W6öÇfR‡·&Wf–Ww3¥µ×Ò’¢’†7G‚ÂvÆ—7BrÂ²G&gEö–C¢7G‚æG&gD–BÂW†Õö–C¢7G‚æW†Ô–BÇÂçVÆÂÂ7V&¦V7C¢7V&¦V7BÒ•Ò“°¢–b‚Æ—fR‚’’&WGW&ã°¢–b‡&W7öç6W5³Òç7FGW2ÓÓÒvgVÆf–ÆÆVBr’V÷FÒ&W7öç6W5³ÒçfÇVRçV÷F°¢–b‡&W7öç6W5³Òç7FGW2ÓÓÒvgVÆf–ÆÆVBr’&Wf–Ww2Ò&W7öç6W5³ÒçfÇVRç&Wf–Ww2ÇÂµÓ°¢f"f–ÇW&RÒ&W7öç6W2æf–æB†gVæ7F–öâ‡"’²&WGW&â"ç7FGW2ÓÓÒw&V¦V7FVBs²Ò“°¢–b†f–ÇW&R’æ÷FR†f–ÇW&Rç&V6öâæÖW76vRÂG'VR“°¢–b‡f–WrÓÓÒwWÆöBr’WÆöB‚“²VÇ6R–b‡f–WrÓÓÒv†—7F÷'’r’†—7F÷'’‚“°¢–b‡G&–vvW"bb&Wf–Ww2ç6öÖR†gVæ7F–öâ‡"’²&WGW&â"ç7FGW2ÓÓÒw7V66VVFVBs²Ò’’G&–vvW"çFW‡D6öçFVçBÒ~iú^yÈ¾Šù^XÛ~Xˆniés°¢Ğ¢gVæ7F–öâ&VæFW%&W÷'B‡"’°¢–b‚Æ—fR‚’’&WGW&ã°¢–b†Ö–âæ6öçF–ç2†ÖW76vR’’Ö–âæ&Vf÷&R†ÖW76vR“°¢ÖW76vRæ6Æ74Æ—7Bç&VÖ÷fR‚w"Ö7F–öâÖÖW76vRr“°¢–b†7G‚æöå&V6÷&D6†ævR–7G‚æöå&V6÷&D6†ævR‡"“°¢–b‡"ç&W7VÇBbb"ç&W7VÇBç&V6÷&EööæÇ’bb"ç7FGW3ÓÓÒw7V66VVFVBrbb7G‚æöå&V6÷&FVB—·f"&V6÷&FVCÖ7G‚æöå&V6÷&FVC¶7G‚æöå&V6÷&FVCÖçVÆÃ·&V6÷&FVB‡"“·&WGW&ã·Ğ¢6VÆV7FVBÒ#²f–WrÒw&W÷'Bs²F—'G’ÒfÇ6S²–b†7G‚æöåf–Wr’7G‚æöåf–Wr‚w&W÷'Br“°¢–b‡"ç7FGW2ÓÓÒwW6VBr’²Ö–âæ–ææW$…DÔÂÒsÇ6V7F–öâ6Æ73Ò'"×&V6÷fW'’#ãÆƒ3âr²W62‡"ç&öw&W72bb"ç&öw&W72æÖW76vRÇÂ~‹ù¾[ªn[{.KùŞZÙ‚r’²sÂöƒ3ãÇîiÊÎ‹Úî[{.ZèÎh‰y¨NXh^Zë[{.KùŞZÙ8.jZû‹XNiiYîûÈÎXúşKº^{º~{ºŞXšKÙXˆnié8#Â÷âr²'WGFöâ‚~{º~{ºŞXˆniérÂw&W7VÖRrÂw"×&–Ö'’r’²'WGFöâ‚~XŠ™šNŠë[ÙRrÂvFVÆWFRrÂw"ÖFævW"r’²sÂ÷6V7F–öãâs²–b‡v–æF÷rå66÷&UW%66ç2’v–æF÷rå66÷&UW%66ç2æFV6÷&FR†Ö–âÂ"Â7G‚Â²“¢’ÂÆöC¢ÆöBÂæ÷FS¢æ÷FRÒ“²&WGW&ã²Ğ¢–b‡"ç7FGW2ÓÓÒw'Vææ–ærrbb"ç&W7VÇB’°¢Ö–âæ–ææW$…DÔÂÒ'Vææ–æu&W÷'B‡"’²'WGFöâ‡"çW6U÷&WVW7FVBò~ZèÎh‰[Ù>X˜ŞjÚ^šªNYîi¨.XÂr¢~i¨.XÎ[›nKùŞZÙ‹ù¾[ªbrÂwW6Rr“°¢6ÆV%F–ÖV÷WB‡F–ÖW"“²F–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²ÆöB‡"ç&WVW7Eö–B“²ÒÂ3“²&WGW&ã°¢Ğ¢–b‡"ç7FGW2ÓÓÒw7V66VVFVBrbb6W76–öâçVæF–ærÓÓÒ"ç&WVW7Eö–B’²6W76–öâçVæF–ærÒçVÆÃ²6W76–öâç–ÆöBÒçVÆÃ²6W76–öâç&WG'•7V&Ö—76–öâÒfÇ6S²7W÷'BçWÆöG2‚vFVÆWFRrÂ7G‚çW6W"Â"ç&WVW7Eö–B“²7W÷'BçWÆöG2‚vFVÆWFRrÂ7G‚çW6W"Â66†U66÷R“²6W76–öâæ66†T–BÒçVÆÃ²Ğ¢–b‡"ç7FGW2ÓÓÒvf–ÆVBrbb"ç&W7VÇB’°¢f"Ò"ç&öw&W72ÇÂ·ÒÂ&V6÷fW'’Ò"ç&V6÷fW'’ÇÂ²f–Æ&ÆS¢çfW'6–öâãÒ"bb‡ç&W7VÖU÷&VÖ–æ–ærÓÒçVÆÂÇÂç&W7VÖU÷&VÖ–æ–ærâ’Â6ö×ÆWFVC¢æ6ö×ÆWFVE÷VW7F–öç2ÇÂÂF÷FÃ¢çF÷FÅ÷VW7F–öç2ÇÂÂVW7F–öç3¢µÒÓ°¢f"ÖF6†–ærÒ6W76–öâçVæF–ærÓÓÒ"ç&WVW7Eö–BÇÂ6W76–öâæ66†T–BÓÓÒ"ç&WVW7Eö–C°¢Ö–âæ–ææW$…DÔÂÒsÇ6V7F–öâ6Æ73Ò'"×&V6÷fW'’#ãÆƒ3îXˆnié[{.i¨.XÎûÈÎ‹ù¾[ªn[{.KùŞZÙƒÂöƒ3ãÇî[{.ZèÎh‰Æ#âr²&V6÷fW'’æ6ö×ÆWFVB²ròr²&V6÷fW'’çF÷FÂ²sÂö#âš)Xˆnié8#Â÷âr°¢†ÖF6†–ærbb6W76–öâçvW2æÆVæwF‚òsÇî[{.ˆz®XªY¹îZ¾Kˆ®jÊKˆ®KÊy¨Br²6W76–öâçvW2æÆVæwF‚²r[ÊY»îx˜~Xø®Šëî{Úî8#Â÷ãÆF—b6Æ73Ò'"×&V6÷fW&VB×vW2#âr²6W76–öâçvW2æÖ†gVæ7F–öâ‡’²&WGW&âsÆ–Ör7&3Ò"r²çW&Â²r"ÇCÒ"r²W62‡&öÆTæÖW5·ç&öÆUÒ’²r#âs²Ò’æ¦ö–â‚rr’²sÂöF—câr¢&V6÷fW'’æÖöFRÓÓÒw6fVBròsÇî[{.h.ZHŞKùŞZÙy¨Nš)yºî8KÙÎzÙNY(Îh›iKXˆnûÈÎXúşy»Nhê^{º~{ºŞ8#Â÷âr¢rr’°¢‡&V6÷fW'’æf–Æ&ÆRò'WGFöâ‚~h.ZHŞXˆniérÂw&W7VÖRrÂw"×&–Ö'’r’²sÇ6Æ73Ò'"Ö×WFVB#îhê^yØZèÎh‰XšKÙ˜:XˆnûÈÎKˆŞXúnŠê[ÈZx¾jÊi[8#Â÷âr¢sÇîiÊÎjÊh.ZHŞjÊi[[{.yJZèÎûÈÎ[{.KùŞZÙy¨N‹XNiiK¸ŞXúşiú^yÈ¾8#Â÷âr’°¢‡&V6÷fW'’çVW7F–öç2æÆVæwF‚òsÆFWF–Ç26Æ73Ò'"×&V6÷fW&VB×v÷&²#ãÇ7VÖÖ'“îiú^yÈ¾[{.h.ZHŞy¨Nš)yºîY(ÎKÙÎzÙCÂ÷7VÖÖ'“âr²&V6÷fW'’çVW7F–öç2æÖ†gVæ7F–öâ‡’²&WGW&âsÆ'F–6ÆSãÆƒCîzÊÂr²W62‡æÆ&VÂ’²rš)ƒÂöƒCãÇ6Æ73Ò'"×FW‡B#âr²W62‡ç7FVÒ’²sÂ÷ãÇ6Æ73Ò'"×FW‡B#îKÙÎzÙNûÉ¢r²W62‡æç7vW"ÇÂ~iÊ®KÙÎzÙBr’²sÂ÷ãÂö'F–6ÆSâs²Ò’æ¦ö–â‚rr’²sÂöFWF–Ç3âr¢rr’°¢sÆFWF–Ç3ãÇ7VÖÖ'“îiú^yÈ¾KŠŞijŞŠúnh8SÂ÷7VÖÖ'“ãÇâr²W62‡"æW'&÷%öÖW76vR’²sÂ÷ãÂöFWF–Ç3ãÂ÷6V7F–öãâr²'WGFöâ‚~‹ùNY¹îŠë[ÙRrÂv†—7F÷'’r’²'WGFöâ‚~XŠ™šNŠë[ÙRrÂvFVÆWFRrÂw"ÖFævW"r“°¢7W÷'Bç&VæFW$ÖF‚†Ö–â“²&WGW&ã°¢Ğ ¢f"&W÷'BÒ"ç&W7VÇBÂ7FG2Ò7VÖÖ'’‡"“¶Ö–âæ6Æ74Æ—7BçFövvÆR‚w"×&V6÷&B×f–WrrÂ&W÷'Bç&V6÷&EööæÇ’“°¢f"WFF–ærÒ"ç7FGW2ÓÓÒw'Vææ–ærrÂ7FÆRÒ&W÷'BææÇ—6—5÷7FÆS°¢f"WFFTæ÷F–6RÒWFF–æròsÆ6–FR6Æ73Ò'"ÖÖW76vR"&öÆSÒ'7FGW2#ãÆ#âr²W62‡"ç&öw&W72bb"ç&öw&W72æÖW76vRÇÂ~jÚ>YÊi»NikXˆniér’²sÂö#ãÇîKˆ¾ikKùŞyYKˆ®Kˆx˜hª^Y®8.i»NikZèÎh‰YîûÈÎ[ni»şhÚ.y»X[>š)yºîY(Îi[NKÙ>[»®Šêî8#Â÷ãÂö6–FSâr¢7FÆRòsÆ6–FR6Æ73Ò'"ÖÖW76vR#ãÆ#îjZûXh^Zë[{.KùŞZÙûÈÎKˆ¾™Ú.y¨NXˆniéK¸ŞK‹®Kˆ®Kˆx˜8#Âö#âr²‡"ç7FGW2ÓÓÒvf–ÆVBròsÇâr²W62‡"æW'&÷%öÖW76vR’²sÂ÷âr²‚‡"ç&öw&W72bb"ç&öw&W72ç&W7VÖU÷&VÖ–æ–ærÇÂ’âò'WGFöâ‚~{º~{ºŞi»NikXˆniérÂw&W7VÖRr’¢rr’¢rr’²sÂö6–FSâr¢rs°¢Ö–âæ–ææW$…DÔÂÒWFFTæ÷F–6R²sÇ6V7F–öâ6Æ73Ò'"×&W7VÇB×F÷#ãÇ7â6Æ73Ò'"ÖW–V'&÷r#âr²W62‡7V&¦V7B’²r+rr²&W÷'BçVW7F–öç2æÆVæwF‚²rš)ƒÂ÷7ããÆƒ3âr²‡&W÷'Bç&V6÷&EööæÇ’ò~zîŠêNŠønXŠ¾{¹>iéÂr¢~Šù^XÛ~ZHŞy¹‚r’²sÂöƒ3âr°¢sÆæb6Æ73Ò'"×&W÷'BÖæb"&–ÖÆ&VÃÒ.hª^Y®yºî[ÙR#âr²‡&W÷'Bç&V6÷&EööæÇ’òrr¢'WGFöâ‚~i[NKÙ>XˆniérÂv§V×¦†–v†Æ–v‡G2r’²'WGFöâ‚~™«î[ªnKˆî[é~XˆbrÂv§V×§W&f÷&Öæ6Rr’²'WGFöâ‚~KÉX«şKˆî™zîš)‚rÂv§V×¦–ç6–v‡G2r’’²'WGFöâ‡&W÷'Bç&V6÷&EööæÇ’ò~š)yºîKˆîKÙÎzÙBr¢~˜	š)ZHŞy¹‚rÂv§V×§VW7F–öç2r’²‡&W÷'Bç&V6÷&EööæÇ’òrr¢'WGFöâ‚~ZHŞKšZèhé"rÂv§V×§Æâr’’²'WGFöâ‚~‹XNiiKˆîŠûNiˆârÂv§V×¦ÖFW&–Ç2r’²sÂöæcãÂ÷6V7F–öãâr°¢‡&W÷'Bç&V6÷&EööæÇ’bbVçG'”öæÇ’‚’bb†7G‚æöäæÇ—¦U&V6÷&BÇÂv–æF÷rå66÷&UW$‡V"’òsÆF—b6Æ73Ò'"Öf—'7BÖ7F–öâ#ãÇîXXjZûŠønXŠ¾{¹>iéÎ8.Šù^š)XúşKº^XÙ^xºÎKùŞZÙûÈÎ™ÈŠhi{nXhŞyIşh‰Xˆnié8#Â÷âr¶'WGFöâ‚~yIşh‰’Xˆnié+rkhˆ	rjÊrÂvæÇ—¦R×&V6÷&BrÂw"×&–Ö'’r’²sÂöF—câr¢rr’²&W÷'E6V7F–öç2‡&W÷'BÂWFF–ær’²sÇ6V7F–öâ6Æ73Ò'"×&VF–ær×6V7F–öâ"FF×&W÷'B×6V7F–öãÒ'VW7F–öç2"F&–æFWƒÒ"Ó#ãÆF—b6Æ73Ò'"Ö6†FW"#ãÇ7ãâr²‡&W÷'Bç&V6÷&EööæÇ’òsr¢sBr’²sÂ÷7ããÆF—cãÆƒ3âr²‡&W÷'Bç&V6÷&EööæÇ’ò~š)yºîKˆîKÙÎzÙBr¢~˜	š)ZHŞy¹‚r’²sÂöƒ3ãÇâr²‡&W÷'Bç&V6÷&EööæÇ’ò~ZûxZ~hš¾høşK»nûÈÎjZûŠønXŠ¾y¨NXh^Zë8"r¢~XXyÈ¾Y:®˜xÎ™ÈŠhiKûÈÎXhŞhÈ™È[^[ÈŠë.Šz>Y(Î{¸>Kš8"r’²sÂ÷ãÂöF—cãÂöF—câr²sÆF—b6Æ73Ò'"×VW7F–öâÖf–ÇFW'2"&–ÖÆ&VÃÒ.zÙ¾˜š)yºâ#âr²‡&W÷'Bç&V6÷&EööæÇ’ò²vÆÂrÂv6öæf—&ÒrÂwVçfW&–f–VBuÒ¢²vÆÂrÂw&Wf–WrrÂv6öæf—&ÒuÒ’æÖ†gVæ7F–öâ†bÆ’—·&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FF×#Ò&f–ÇFW#¢r¶b²r"&–×&W76VCÒ"r²†“ÓÓÓ’²r#âr²‡&W÷'Bç&V6÷&EööæÇ“õ²~XZ˜:š)yºârÂ~™ÈŠhjZû’rÂ~iÊ®ZûxZ~XéşXÛruÓ¥²~XZ˜:š)yºârÂ~™ÈŠhŠê.jÚ2rÂ~™ÈŠhjZû’uÒ•¶•Ò²sÂö'WGFöãâs·Ò’æ¦ö–â‚rr’²sÂöF—câr²sÇ6Æ73Ò'"Öf–ÇFW"ÖV×G’"Ö×WFVB"&öÆSÒ'7FGW2"†–FFVãîk*iÈzÊnY‹ùšzÙ¾˜y¨Nš)yºîûÈÎXúşKº^Xˆ~Y¹îXZ˜:š)yºî8#Â÷ãÆF—b6Æ73Ò'"×VW7F–öç2#âr²&W÷'BçVW7F–öç2æÖ†gVæ7F–öâ‡’°¢f"2Ò‡"æ6÷'&V7F–öç2ÇÂµÒ’æf–æB†gVæ7F–öâ†2’²&WGW&â2æ–BÓÓÒæ–C²Ò’ÇÂ²ç7vW#¢æç7vW"ÂFV6†W%÷66÷&S¢çFV6†W%÷66÷&RÂÖ…÷66÷&S¢æÖ…÷66÷&RÓ°¢–b‡æ•öw&F–æsòç7FGW2ÓÓÒv6öæf—&ÖVBrbb2çfW&–f–VBbb2æç7vW"ÓÓÒæ•öw&F–æræ÷&–v–æÅöç7vW"’2Òö&¦V7Bæ76–vâ‡·ÒÂ2Â²ç7vW#¢æç7vW"Ò“°¢f"6öæf—&ÕVW7F–öâÒç66÷&U÷fW&–f–6F–öâÓÓÒv6öæfÆ–7BrÇÂç&Wf–Wu÷7FGW2ÓÓÒwFV6†W%ö6öæfÆ–7BrÇÂææÇ—6—5öÖöFRÓÓÒvæVVG5ö6öæf—&ÖF–öâs°¢f"&Wf–WuVW7F–öâÒ6öæf—&ÕVW7F–öâbb‡çFV6†W%÷66÷&RÒçVÆÂbbæÖ…÷66÷&RÒçVÆÂbbçFV6†W%÷66÷&RÂæÖ…÷66÷&RÇÂæ•öw&F–æsòç7FGW2ÓÓÒv6öæf—&ÖVBrbb²v–æ6÷'&V7BrÂw'F–ÂuÒæ–æ6ÇVFW2‡æ•öw&F–ærçfW&F–7B’ÇÂæf—'7Eö—77VRbbæf—'7Eö—77VRæ6W'F–çG’ÓÓÒv6öæf—&ÖVBr“°¢&WGW&âsÆFWF–Ç26Æ73Ò'"×VW7F–öâ"FF×VW7F–öãÒ"r²W62‡æ–B’²r"FFÖæVVG2×&Wf–WsÒ"r²&Wf–WuVW7F–öâ²r"FFÖæVVG2Ö6öæf—&ÓÒ"r²6öæf—&ÕVW7F–öâ²r#ãÇ7VÖÖ'“ãÇ7ãîzÊÂr²W62‡æÆ&VÂ’²rš)‚Ç6ÖÆÃâr²W62‡æ¶æ÷vÆVFvRæ¦ö–â‚r+rr’’²sÂ÷6ÖÆÃâr²‡æf—'7Eö—77VRbbæf—'7Eö—77VRæÆö6F–öâbbæf—'7Eö—77VRæ6W'F–çG’ÓÓÒv6öæf—&ÖVBròsÇ6ÖÆÂ6Æ73Ò'"Ö—77VR×&Wf–Wr#î™ÈŠhyYhHşûÉ¢r²W62‡æf—'7Eö—77VRæÆö6F–öâ’²sÂ÷6ÖÆÃâr¢rr’²sÂ÷7ããÇ7â6Æ73Ò'"Ö&FvR#âr²†6öæf—&ÕVW7F–öâò~™ÈŠhjZû’r¢çFV6†W%÷66÷&RÒçVÆÂbbæÖ…÷66÷&RÒçVÆÂòçFV6†W%÷66÷&R²ròr²æÖ…÷66÷&R²rXˆbr¢&W÷'Bç&V6÷&EööæÇ’bbæ•öw&F–æsòç7FGW2ÓÓÒv6öæf—&ÖVBrò”w&FT&FvR‡’¢~[^[Èiú^yÈ²r’²sÂ÷7ããÇ7â6Æ73Ò'"Ö6†Wg&öâ"&–Ö†–FFVãÒ'G'VR#î(ÈCÂ÷7ããÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'"×VW7F–öâÖ&öG’#âr²”w&F–æu6V7F–öâ‡’²VW7F–öå6V7F–öç2‡Â2’²sÆFWF–Ç26Æ73Ò'"ÖföÆB"×6÷W&6R"r²‡&W÷'Bç&V6÷&EööæÇ’òv÷Vâr¢rr’²sãÇ7VÖÖ'“îXéşš)8KÙÎzÙNKˆîhš¾høşK»cÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'"ÖföÆBÖ&öG’#ãÆF—bFF×66âÖ†÷7CãÂöF—cãÆƒCîš)yºãÂöƒCãÇ6Æ73Ò'"×FW‡B#âr²W62†2ç7FVÒÇÂç7FVÒ’²sÂ÷ãÆƒCîKÚy¨NKÙÎzÙCÂöƒCãÇ6Æ73Ò'"×FW‡B#âr²W62†2æç7vW"ÇÂ~iÊ®Z¾XiKÙÎzÙBr’²sÂ÷ãÆFWF–Ç26Æ73Ò'"ÖföÆB"ÖVF—B#ãÇ7VÖÖ'“îŠønXŠ¾iÈŠúşûÉşKúîiKih~ZÙ~h‰nXˆni[Â÷7VÖÖ'“ãÆF—b6Æ73Ò'"ÖföÆBÖ&öG’#ãÇ6Æ73Ò'"Ö×WFVB#îš)yºîš^ûÉ¢r²‡çvW2æ¦ö–â‚~8r’ÇÂ~(	Br’²‡çv÷&µ÷vW2bbçv÷&µ÷vW2æÆVæwF‚òr+rKÙÎzÙNš^ûÉ¢r²çv÷&µ÷vW2æ¦ö–â‚~8r’¢rr’²sÂ÷ãÆÆ&VÃîš)yºîûÈXúşKúîjÚ>ŠønXŠ¾Xh^ZëûÈ“ÇFW‡F&VFFÖf–VÆCÒ'7FVÒ"&÷w3Ò#2"Ö†ÆVæwFƒÒ#CS#âr²W62†2ç7FVÒÇÂç7FVÒ’²sÂ÷FW‡F&VãÂöÆ&VÃãÆÆ&VÃîˆ>Šù^i{ny¨NKÙÎzÙNûÈXúşKúîjÚ>ŠønXŠ¾Xh^ZëûÈ“ÇFW‡F&VFFÖf–VÆCÒ&ç7vW""&÷w3Ò#2"Ö†ÆVæwFƒÒ#C#âr²W62†2æç7vW"’²sÂ÷FW‡F&VãÂöÆ&VÃâr°¢sÆF—b6Æ73Ò'"×66÷&RÖf–VÆG2#ãÆÆ&VÃîˆ[ˆh›iK[é~XˆcÆ–çWBFFÖf–VÆCÒ'FV6†W%÷66÷&R"G—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#“““’"7FWÒ#ã"Æ6V†öÆFW#Ò.iÊ®ŠønXŠ²òiÊ®h›iK’"fÇVSÒ"r²W62†2çFV6†W%÷66÷&R’²r#ãÂöÆ&VÃãÆÆ&VÃîiÊÎš)kºXˆcÆ–çWBFFÖf–VÆCÒ&Ö…÷66÷&R"G—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#“““’"7FWÒ#ã"Æ6V†öÆFW#Ò.Z¾XikºXˆb"fÇVSÒ"r²W62†2æÖ…÷66÷&R’²r#ãÂöÆ&VÃãÂöF—cãÇ6Æ73Ò'"Ö×WFVB#îh›iKKéŞhÚîûÉ¢r²W62‡ç66÷&UöWf–FVæ6RÇÂ~iÈh›iKXˆnXúşYÊKˆ®ikŠ^XX^ûÈÎyYz›®ŠzK®iÊ®h›iKh‰niÊ®[Ù^XZ^8"r’²sÂ÷âr°¢‚&W÷'Bç&V6÷&EööæÇ’bbæW7F–ÖFVE÷66÷&RÓÒçVÆÂbbæ•öw&F–æsòç7FGW2ÓÒv6öæf—&ÖVBròsÇ6Æ73Ò'"ÖW7F–ÖFR#ä’KËXˆnûÉ¢r²æW7F–ÖFVE÷66÷&R²‡æÖ…÷66÷&RÓÒçVÆÂòròr²æÖ…÷66÷&R¢rr’²~ûÈÎK¸^Ké¾Xø.ˆ3Â÷âr²‡æW7F–ÖFUöWf–FVæ6RbbæW7F–ÖFUöWf–FVæ6RçV÷FRòsÇ6Æ73Ò'"ÖWf–FVæ6R#îŠøNXˆn{¸nX‰KéŞhÚîûÉ¢r²W62‡æW7F–ÖFUöWf–FVæ6RçV÷FR’²sÂ÷âr¢rr’¢rr’°¢sÂöF—cãÂöFWF–Ç3ãÂöF—cãÂöFWF–Ç3ãÆF—b6Æ73Ò'"Ö6†V6·2#ãÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"FFÖf–VÆCÒ'fW&–f–VB"r²†2çfW&–f–VBòv6†V6¶VBr¢rr’²sî[{.ZûxZ~XéşXÛ~jZû“ÂöÆ&VÃãÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"FFÖf–VÆCÒ&6÷'&V7FVB"r²†2æ6÷'&V7FVBòv6†V6¶VBr¢rr’²sî[{.ZèÎh‰Šê.jÚ3ÂöÆ&VÃãÂöF—cãÂöF—cãÂöFWF–Ç3âs°¢Ò’æ¦ö–â‚rr’²sÂöF—cãÆF—b6Æ73Ò'"Öfö÷FW"#ãÇ7â6Æ73Ò'"Ö×WFVB"FF×"×6fR×7FGW3îjZûKúîiKKˆŞKÉ®iKXùˆ>Šù^Xˆni[Â÷7ãâr²'WGFöâ‡&W÷'Bç&V6÷&EööæÇ’ÇÂ‡&W÷'BçWFFUö6÷VçBÇÂ’ãÒRò~KùŞZÙjZûŠë[ÙRr¢~KùŞZÙ[›ni»NikXˆniérÂw6fRrÂw"×&–Ö'’r’²sÂöF—cãÂ÷6V7F–öãâr²&W÷'EÆâ‡&W÷'B’²sÇ6V7F–öâ6Æ73Ò'"×&VF–ær×6V7F–öâ"FF×&W÷'B×6V7F–öãÒ&ÖFW&–Ç2"F&–æFWƒÒ"Ó#ãÆF—b6Æ73Ò'"Ö6†FW"#ãÇ7ãâr²‡&W÷'Bç&V6÷&EööæÇ’òs"r¢sbr’²sÂ÷7ããÆF—cãÆƒ3î‹XNiiKˆîŠûNiˆãÂöƒ3ãÇâr²‡&W÷'Bç&V6÷&EööæÇ’ò~iú^yÈ¾XéşZx¾hš¾høşK»nY(Îh˜¾XªjZûŠë[Ù^8"r¢~iú^yÈ¾XéşZx¾hš¾høşK»n8jZûŠë[Ù^Y(ÎiÊÎjÊXˆniéKÛşyJy¨NKúhş8"r’²sÂ÷ãÂöF—cãÂöF—cãÆF—b6Æ73Ò'"ÖÖFW&–Ç2#ãÂöF—câr²föÆB‚~ˆ>Šù^KúhşKˆîXˆniéKéŞhÚârÂ&W÷'DFWF–Ç2‡&W÷'B’Âw"×&W÷'BÖÖWFr’²föÆB‚~ŠønXŠ¾KˆîjZûŠë[ÙRrÂsÇ6Æ73Ò'"×FW‡B#âr²W62‡&W÷'Bæ6÷fW&vR’²sÂ÷ãÆF—b6Æ73Ò'"×7FG2#ãÆF—cãÆ#âr²&W÷'BçVW7F–öç2æÆVæwF‚²sÂö#ãÇ7ãîŠønXŠ¾š)yºãÂ÷7ããÂöF—cãÆF—cãÆ"FF×"×fW&–f–VCâr²7FG2çfW&–f–VB²sÂö#ãÇ7ãî[{.jZû“Â÷7ããÂöF—cãÆF—cãÆ"FF×"×66÷&Sâr²‡7FG2ç66÷&VBò7FG2ç66÷&R²ròr²7FG2æÖ‚¢~(	Br’²sÂö#ãÇ7ãî[{.jZûš)yºî[é~XˆcÂ÷7ããÂöF—cãÂöF—cãÇ6Æ73Ò'"Ö×WFVB#îK¸^k~h¾[{.zîŠêNy¨NXÛ~™Ú.h›iKXˆnûÈÎKˆŞKº>Ši[NXÛ~h‰{º8#Â÷ãÇ6V7F–öâ6Æ73Ò'"ÖWfÇVF–öâ#ãÆƒCî[{.jZûš)yºîy¨NZKXˆcÂöƒCãÆF—bFF×"ÖÆ÷76W3ãÂöF—cãÂ÷6V7F–öãâr’°¢‚‡&W÷'Bçv&æ–æw2ÇÂµÒ’æÆVæwF‚ÇÂ&W÷'Bæ6ö×ÆWFRòföÆB‚~™ÈŠhŠ^XX^h‰njZûy¨N‹XNii’rÂ‚&W÷'Bæ6ö×ÆWFRòsÇî[	®iÊ®Šhny¹ny¨Nš)yºîh‰nKÙÎzÙNXúşKº^{º~{ºŞŠ^XX^8#Â÷âr¢rr’²'VÆÆWG2‡&W÷'Bçv&æ–æw2’Âw"Ö÷Vâ×VW7F–öç2r’¢rr’²sÂ÷6V7F–öããÆF—b6Æ73Ò'"Öfö÷FW"#âr²'WGFöâ‚~‹ùNY¹îŠë[ÙRrÂv†—7F÷'’r’²'WGFöâ‡&W÷'Bç&V6÷&EööæÇ“ò~XŠ™šN‹ùK»ŞŠù^š)[Ù^XZRs¢~XŠ™šN‹ùK»Şhª^Y¢rÂvFVÆWFRrÂw"ÖFævW"r’²sÂöF—câs°¢f"†–v†Æ–v‡G2ÒÖ–âçVW'•6VÆV7F÷"‚u¶FF×&W÷'B×6V7F–öãÒ&†–v†Æ–v‡G2%Òr“°¢–b††–v†Æ–v‡G2’†–v†Æ–v‡G2æ–ç6W'DF¦6VçD…DÔÂ‚v&Vf÷&VVæBrÂ66÷VçE6V7F–öç2‡&W÷'B’“°¢f"ÖFW&–Ç2ÒÖ–âçVW'•6VÆV7F÷"‚rç"ÖÖFW&–Ç2r“°¢–b‚VçG'”öæÇ’‚’bbÖFW&–Ç2bbWFF–ærbb&W÷'Bç6÷W&6U÷&V6÷&Bbb‡&W÷'Bç66÷&U÷&Vg&W6…ö6÷VçBÇÂ’ÂR’ÖFW&–Ç2æ–ç6W'DF¦6VçD…DÔÂ‚v&Vf÷&V&Vv–ârÂsÆF—b6Æ73Ò'"Ö–ç6–v‡B#ãÇîŠ^Šû¾Xˆni[KˆîkºXˆnûÈÎ[›njZû{Ë®[	h›iKXˆny¨NKÙÎzÙNûÉ®iÈzÙNjXXZûûÈÎk*iÈzÙNjyK’k.Šz>ZHŞj8.ˆ[ˆh›iKXˆnKˆâ’XŠNXˆnXˆn[È[^zK®ûÉ¾KˆŞKÉ®h¨®i[N{¸NXˆni[[›>YØ~h¸n[È8#Â÷âr²'WGFöâ‚~˜xŞikŠønXŠ¾Xˆni[rÂw&WG'’×66÷&W2r’²sÇ6Æ73Ò'"Ö×WFVB#îKˆŞXÚikXˆniéjÊi[ûÉ¾jøşK»Şhª^Y®iÈZI®Š^Šû²RjÊ8.[{.K«.ˆz®jZûy¨NKÙÎzÙNKˆŞKÉ®Š*¾Šhny¹n8#Â÷ãÂöF—câr“°¢–b‡&W÷'Bç&V6÷&EööæÇ’bbv–æF÷rå66÷&UW%&V6÷&G2’&W÷'BçVW7F–öç2æf÷$V6‚†gVæ7F–öâ‡’°¢f"3Ò‡"æ6÷'&V7F–öç7ÇÅµÒ’æf–æB†gVæ7F–öâ†2—·&WGW&â2æ–CÓÓ×æ–C·Ò’ÇÂ·Ó°¢f"F&vWCÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×VW7F–öãÒ"r·æ–B²r%Òç"ÖVF—Bç"ÖföÆBÖ&öG’r“°¢–b‡F&vWB—·F&vWBæ–ç6W'DF¦6VçD…DÔÂ‚vgFW&&Vv–ârÇv–æF÷rå66÷&UW%&V6÷&G2æf–VÆG2‡Æ2’“·F&vWBç&VçDVÆVÖVçBæ÷VãÖfÇ6S·F&vWBç&VçDVÆVÖVçBçVW'•6VÆV7F÷"‚w7VÖÖ'’r’çFW‡D6öçFVçCÒ~KúîiKš)Yè¾8ih~ZÙ~h‰nXˆni[s·Ğ¢Ò“°¢–b‡&W÷'Bç&V6÷&EööæÇ’bbv–æF÷rå66÷&UW%&V6÷&G2—v–æF÷rå66÷&UW%&V6÷&G2æFV6÷&FR†Ö–âÇ"Æ7G‚Æ’Ææ÷FRÇ·6fS§6fRÆ—4F—'G“¦gVæ7F–öâ‚—·&WGW&âF—'G“·×Ò“°¢²‡&W÷'Bç&V6÷&EööæÇ“õ²vÖFW&–Ç2uÓ¥²wW&f÷&Öæ6RrÂv–ç6–v‡G2rÂwÆârÂvÖFW&–Ç2uÒ’æf÷$V6‚†gVæ7F–öâ†–B—·f"6V7F–öãÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×&W÷'B×6V7F–öãÒ"r¶–B²r%Òr“¶–b‚6V7F–öâ—&WGW&ã·f"föÆCÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“¶föÆBæ6Æ74æÖSÒw"×&W÷'BÖW‡G&s·f"F—FÆS×6V7F–öâçVW'•6VÆV7F÷"‚rç"Ö6†FW"ƒ2r“¶föÆBæ–ææW$…DÔÃÒsÇ7VÖÖ'“âr¶W62‡F—FÆS÷F—FÆRçFW‡D6öçFVçC¢~i»NZI®Xh^Zë’r’²sÂ÷7VÖÖ'“âs·6V7F–öâæ&Vf÷&R†föÆB“¶föÆBæVæD6†–ÆB‡6V7F–öâ“·Ò“·Ğ¢Æ÷76W2‡7FG2“²7W÷'Bç&VæFW$ÖF‚†Ö–â“²–b‡v–æF÷rå66÷&UW%66ç2’v–æF÷rå66÷&UW%66ç2æFV6÷&FR†Ö–âÂ"Â7G‚Â²“¢’ÂÆöC¢ÆöBÂæ÷FS¢æ÷FRÒ“°¢–b‡WFF–ær’²Ö–âçVW'•6VÆV7F÷$ÆÂ‚v–çWBÇFW‡F&VÇ6VÆV7BÅ¶FF×#×6fUÒÅ¶FF×#ÖFVÆWFUÒr’æf÷$V6‚†gVæ7F–öâ†VÂ’²VÂæF—6&ÆVBÒG'VS²Ò“²6ÆV%F–ÖV÷WB‡F–ÖW"“²F–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²ÆöB‡"ç&WVW7Eö–B“²ÒÂ3“²Ğ¢–b‚‡&W÷'BçWFFUö6÷VçBÇÂ’ãÒR’†Ö–âçVW'•6VÆV7F÷"‚u¶FF×"×6fR×7FGW5Òr—ÇÆÖW76vR’çFW‡D6öçFVçBÒs^jÊXˆniéi»Nik[{.yJZèÎûÈÎXúş{º~{ºŞKùŞZÙjZûY(ÎŠê.jÚ>Šë[ÙRs°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚rç"×VW7F–öâ–çWBÂç"×VW7F–öâFW‡F&VÂç"×VW7F–öâ6VÆV7Br’æf÷$V6‚†gVæ7F–öâ†VÂ’²VÂæFDWfVçDÆ—7FVæW"‚v–çWBrÂgVæ7F–öâ‚’²F—'G’ÒG'VS²–b†VÂæFF6WBæf–VÆBÓÓÒv6W6Rr’²f"FWF–ÂÒVÂæ6Æ÷6W7B‚u¶FF×VW7F–öåÒr’ÂÒ&W÷'BçVW7F–öç2æf–æB†gVæ7F–öâ‡’²&WGW&âæ–BÓÓÒFWF–ÂæFF6WBçVW7F–öã²Ò“²FWF–ÂçVW'•6VÆV7F÷"‚rç"×&VfÆV7F–öâ×&÷WFRr’çFW‡D6öçFVçBÒ&VfÆV7F–öå&÷WFR‡ÂVÂçfÇVR“²Ò†Ö–âçVW'•6VÆV7F÷"‚u¶FF×"×6fR×7FGW5Òr—ÇÆÖW76vR’çFW‡D6öçFVçBÒ~iÈiÊ®KùŞZÙy¨NjZûKúîiK’s²Ò“²Ò“°¢Ğ¢gVæ7F–öâÆ÷76W2‡7FG2’°¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×"ÖÆ÷76W5Òr’æ–ææW$…DÔÂÒ7FG2æÆ÷76W2æÆVæwF‚ò7FG2æÆ÷76W2æÖ†gVæ7F–öâ‡’²&WGW&âsÆF—b6Æ73Ò'"ÖÆ÷72#ãÇ7ãîzÊÂr²W62‡æÆ&VÂ’²rš)ƒÂ÷7ããÆ#îZKr²ÖF‚ç&÷VæB‡æÆ÷72¢’ò²rXˆcÂö#ãÂöF—câs²Ò’æ¦ö–â‚rr’¢sÇ6Æ73Ò'"Ö×WFVB#âr²‡7FG2ç66÷&VBò~[{.jZûy¨N[şš)i¨.izZKXˆn8"r¢~jZû[şš)[é~XˆnYîûÈÎYÊ‹ù˜xÎiú^yÈ¾ZKXˆnXˆn[ˆ>8"r’²sÂ÷âs°¢Ğ¢7–æ2gVæ7F–öâÆöB†–B’°¢6ÆV%F–ÖV÷WB‡F–ÖW"“°¢G'’°¢f"&W7VÇG2Òv—B&öÖ—6RæÆÂ…¶’†7G‚ÂvvWBrÂ²&WVW7Eö–C¢–BÒ’Â7W÷'BçWÆöG2‚vvWBrÂ7G‚çW6W"Â–B•Ò“°¢–b†Æ—fR‚’’°¢–b†7G‚æW‡V7FVDW†Ô–Bbb&W7VÇG5³Òç&Wf–WræW†Õö–BÓÒ7G‚æW‡V7FVDW†Ô–B’F‡&÷ræWrW'&÷"‚~‹ùK»ŞŠù^XÛ~[{.z{¾X{®[Ù>X˜Şˆ>Šù^ûÈÎŠû~‹ùNY¹îYîX‹~ikr“°¢–b‡&W7VÇG5³Ò’f–ÆÂ‡&W7VÇG5³Ò“²æ÷FR‚rr“²&VæFW%&W÷'B‡&W7VÇG5³Òç&Wf–Wr“°¢–b†–æ—F–Å6V7F–öâ’°¢f"6V7F–öâÒ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×&W÷'B×6V7F–öåÒr’’æf–æB†gVæ7F–öâ‡2’²&WGW&â2æFF6WBç&W÷'E6V7F–öâÓÓÒ–æ—F–Å6V7F–öã²Ò“°¢–b‡6V7F–öâ’²–æ—F–Å6V7F–öâÒçVÆÃ²6V7F–öâæfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²–b‡6V7F–öâç67&öÆÄ–çFõf–Wr’6V7F–öâç67&öÆÄ–çFõf–Wr‡²&Æö6³¢w7F'BrÒ“²Ğ¢Ğ¢Ğ¢Ğ¢6F6‚†R’²–b†Æ—fR‚’’²æ÷FR†RæÖW76vR²†7G‚æ†÷7Bò~ûÉ¾Xúş‹ùNY¹îYî˜xŞikh™>[È8"r¢~ûÉ¾Xúşx+X{¾(	ÎXˆniéŠë[Ù^(	Ş˜xŞikiú^yÈ¾8"r’ÂG'VR“²–b‡f–WrÓÓÒw&W÷'Brbb6VÆV7FVBbb6VÆV7FVBç7FGW2ÓÓÒw'Vææ–ærr’F–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²ÆöB†–B“²ÒÂƒ“²ÒĞ¢Ğ¢7–æ2gVæ7F–öâ7F'B‚’°¢–b‡6W76–öâçVæF–ærbb6W76–öâç&WG'•7V&Ö—76–öâ’²f–WrÒw&W÷'Bs²&WGW&âÆöB‡6W76–öâçVæF–ær“²Ğ¢–b†7G‚æ&Vf÷&U7V&Ö—Bbb6W76–öâçVæF–ær’²'W7“×G'VS·G'’²7V&¦V7BÒv—B7G‚æ&Vf÷&U7V&Ö—B‚“²Ò6F6‚†R’²&WGW&âæ÷FR†RæÖW76vRÇG'VR“²Òf–æÆÇ’¶'W7“ÖfÇ6S·ÒĞ¢–b‚6W76–öâçvW2ç6öÖR†gVæ7F–öâ‡’²&WGW&âç&öÆRÓÓÒwW"s²Ò’’&WGW&âæ÷FR‚~Šû~XXKˆ®KÊŠù^XÛ~š)yºârÂG'VR“°¢–b‚6W76–öâæ6öç6VçB’&WGW&âæ÷FR‚~Šû~XXzîŠêNY»îx˜~XˆniéKˆîhª^Y®KùŞZÙŠûNiˆârÂG'VR“°¢f"–BÒ6W76–öâçVæF–ærÇÂ6W76–öâæ6Æ÷VDG&gD–BÇÂ7'—Fòç&æFöÕUT”B‚’Â7V&Ö—GFVBÒfÇ6S²6W76–öâçVæF–ærÒ–C²'W7’ÒG'VS²WÆöB‚“²æ÷FR‚~jÚ>YÊhùKªN‹XNii(
br“°¢G'’°¢f"6fVE7V&¦V7BÒ7G‚æW†Òbb7G‚æW†Òç66÷&W2bb7G‚æW†Òç66÷&W5·7V&¦V7EÓ°¢6W76–öâç–ÆöBÒ6W76–öâç–ÆöBÇÂ²&WVW7Eö–C¢–BÂG&gEö–C¢7G‚æG&gD–BÂW†Õö–C¢6fVE7V&¦V7Bò7G‚æW†Ô–B¢çVÆÂÀ¢7V&¦V7C¢7V&¦V7BÂF—FÆS¢7G‚çF—FÆRÇÂrrÂ÷F–öç3¢7G‚æ÷F–öç2ÂW†Õö6öçFW‡C¢7G‚æ†÷7Bò7G‚æW†Ô6öçFW‡B¢f÷&Ô6öçFW‡B†7G‚Â7V&¦V7B’ÂvW3¢6W76–öâçvW2æÖ†gVæ7F–öâ‡’²&WGW&â²&öÆS¢ç&öÆRÂW&Ã¢çW&ÂÂ&Vv–öç3¢ç&Vv–öç2ÇÂµÒÓ²Ò’Âv÷&µööå÷W#¢6W76–öâçv÷&´öåW"Â6öç6VçC¢G'VRÓ°¢–b‚v—BW'6—7B‚’’æ÷FR‚~iÊÎiË®i¨.i{nizk9^KùŞZÙY»îx˜~ûÉ¾ZèÎh‰ŠønXŠ¾YîK¸ŞXúşK¸îKùŞZÙy¨NKÙÎzÙNh.ZHŞ8"r“°¢v—B7W÷'BçWÆöG2‚vFVÆWFRrÂ7G‚çW6W"Â66†U66÷R“°¢–b†7G‚æ†÷7Bbb‚6W76–öâæ6Æ÷VE&VG’ÇÂ7G‚ç6WGW’’°¢v—B6fT6Æ÷VB†–B“°¢Ğ¢7V&Ö—GFVBÒG'VS°¢f"FFÒv—B’†7G‚Âw7F'BrÂ7G‚æ†÷7Bòö&¦V7Bæ76–vâ‡·ÒÂ6W76–öâç–ÆöBÂ²vW3¢VæFVf–æVBÂW6U÷6fVC¢G'VRÒ’¢6W76–öâç–ÆöB“°¢6W76–öâç&WG'•7V&Ö—76–öâÒfÇ6S²V÷FÒFFçV÷F²–b†Æ—fR‚’’²f–WrÒw&W÷'Bs²v—BÆöB†–B“²Ğ¢Ò6F6‚†R’°¢–b‚7V&Ö—GFVB’°¢6W76–öâçVæF–ærÒçVÆÃ²6W76–öâç–ÆöBÒçVÆÃ²6W76–öâç&WG'•7V&Ö—76–öâÒfÇ6S°¢v—BW'6—7B‚“°¢–b†Æ—fR‚’’²æ÷FR†RæÖW76vR²~ûÉ¾[{.KùŞZÙy¨N‹XNiiKÉ®KùŞyYûÈÎx+X{¾[ÈZx¾hÈ™*îXúş˜xŞŠù^8"rÂG'VR“²WÆöB‚“²Ğ¢&WGW&ã°¢Ğ¢òòF–ÖV÷WBÖ’ö67W"gFW"&W6W'fF–öã²6†V6²F†R6ÖR”B&Vf÷&RöffW&–æræWr&WVW7Bà¢G'’²f"W†—7F–ærÒv—B’†7G‚ÂvvWBrÂ²&WVW7Eö–C¢–BÒ“²6W76–öâç&WG'•7V&Ö—76–öâÒfÇ6S²–b†Æ—fR‚’’&VæFW%&W÷'B†W†—7F–ærç&Wf–Wr“²Ğ¢6F6‚…ò’°¢–b†Rç7FGW2bbRç7FGW2ÂS’²6W76–öâçVæF–ærÒçVÆÃ²6W76–öâç–ÆöBÒçVÆÃ²6W76–öâç&WG'•7V&Ö—76–öâÒfÇ6S²Ğ¢VÇ6R6W76–öâç&WG'•7V&Ö—76–öâÒG'VS°¢–b†Æ—fR‚’’²æ÷FR†RæÖW76vR²‡6W76–öâç&WG'•7V&Ö—76–öâò~ûÉ¾XhŞjÊx+X{¾KÉ®zîŠêNYÎKˆŠû~k.ûÈÎKˆŞKÉ®˜xŞZHŞŠêjÊ8"r¢rr’ÂG'VR“²WÆöB‚“²Ğ¢Ğ¢Òf–æÆÇ’²'W7’ÒfÇ6S²–b†Æ—fR‚’bbf–WrÓÓÒwWÆöBr’WÆöB‚“²Ğ¢Ğ¢7–æ2gVæ7F–öâ6fR‚’°¢–b‡6f–ær—&WGW&âçVÆÃ°¢–b‚F—'G’—¶æ÷FR‚~Šù^š)[{.KùŞZÙ‚r“·&WGW&â6VÆV7FVC·Ğ¢f"6÷'&V7F–öç2ÒµÓ°¢f÷"‡f"FWF–ÂöbÖ–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’°¢f"vWBÒgVæ7F–öâ†æÖR’²&WGW&âFWF–ÂçVW'•6VÆV7F÷"‚u¶FFÖf–VÆCÒr²æÖR²uÒr“²Ó°¢f÷"‡f"f–VÆBöb²wFV6†W%÷66÷&RrÂvÖ…÷66÷&RuÒ’²–b‚vWB†f–VÆB’çfÆ–F—G’çfÆ–B’²FWF–Âæ÷VâÒG'VS²vWB†f–VÆB’æfö7W2‚“²F‡&÷ræWrW'&÷"‚~Xˆni[Šû~‹é>XZRûÙã“““ûÈÎiÈZI®KŠNKØŞ[şi[r“²ÒĞ¢f"66÷&RÒçVÖ&W"†vWB‚wFV6†W%÷66÷&Rr’çfÇVR’ÂÖ‚ÒçVÖ&W"†vWB‚vÖ…÷66÷&Rr’çfÇVR“°¢–b‡66÷&RÓÒçVÆÂbbÖ‚ÓÒçVÆÂbb66÷&RâÖ‚’²FWF–Âæ÷VâÒG'VS²vWB‚wFV6†W%÷66÷&Rr’æfö7W2‚“²F‡&÷ræWrW'&÷"‚~[é~XˆnKˆŞˆ;Şš¹K¨îiÊÎ[şš)kºXˆbr“²Ğ¢6÷'&V7F–öç2çW6‚‡²–C¢FWF–ÂæFF6WBçVW7F–öâÂ7FVÓ¢vWB‚w7FVÒr’çfÇVRÂç7vW#¢vWB‚vç7vW"r’çfÇVRÂVW7F–öå÷G—S¦vWB‚wVW7F–öå÷G—Rr“övWB‚wVW7F–öå÷G—Rr’çfÇVS§VæFVf–æVBÂVW7F–öåöF–ff–7VÇG“¦vWB‚wVW7F–öåöF–ff–7VÇG’r“övWB‚wVW7F–öåöF–ff–7VÇG’r’çfÇVS§VæFVf–æVBÂFV6†W%÷66÷&S¢66÷&RÂÖ…÷66÷&S¢Ö‚ÂfW&–f–VC¢vWB‚wfW&–f–VBr’æ6†V6¶VBÂ6÷'&V7FVC¢vWB‚v6÷'&V7FVBr’æ6†V6¶VBÂ&VfÆV7F–öã¢vWB‚v6W6Rr’ò²6W6S¢vWB‚v6W6Rr’çfÇVRÂæ÷FS¢vWB‚w&VfÆV7F–öåöæ÷FRr’çfÇVRÒ¢çVÆÂÒ“°¢Ğ¢6f–æs×G'VS°¢f"6öçG&öÇ3Ô'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚v–çWBÇFW‡F&VÇ6VÆV7BÆ'WGFöâr’“¶6öçG&öÇ2æf÷$V6‚†gVæ7F–öâ†VÂ—¶VÂæFF6WBçv4F—6&ÆVCÕ7G&–ær†VÂæF—6&ÆVB“¶VÂæF—6&ÆVC×G'VS·Ò“°¢G'—°¢f"&W7VÇCÖv—B’†7G‚Âv6÷'&V7BrÇ·&WVW7Eö–C§6VÆV7FVBç&WVW7Eö–BÇ&Wf—6–öã§6VÆV7FVBç&Wf—6–öâÆ6÷'&V7F–öç3¦6÷'&V7F–öç2Ç&VæÇ—¦S¢6VÆV7FVBç&W7VÇBç&V6÷&EööæÇ’bb‡6VÆV7FVBç&W7VÇBçWFFUö6÷VçGÇÃ“ÃWÒ“°¢–b†Æ—fR‚’—·&VæFW%&W÷'B‡&W7VÇBç&Wf–Wr“¶æ÷FR‡&W7VÇBç&Wf–Wrç7FGW3ÓÓÒw'Vææ–ærsò~[{.KùŞZÙûÈÎjÚ>YÊi»NikXˆniés¢~Šù^š)[{.KùŞZÙ‚r“·&WGW&â&W7VÇBç&Wf–Ws·Ğ¢Öf–æÆÇ—·6f–æsÖfÇ6S¶6öçG&öÇ2æf÷$V6‚†gVæ7F–öâ†VÂ—¶–b†VÂæ—46öææV7FVB–VÂæF—6&ÆVCÖVÂæFF6WBçv4F—6&ÆVCÓÓÒwG'VRs·Ò“·Ğ ¢Ğ¢F–ÆöræFDWfVçDÆ—7FVæW"‚v6Æ–6²rÂ7–æ2gVæ7F–öâ†R’°¢f"F&vWBÒRçF&vWBæ6Æ÷6W7B‚u¶FF×%Òr“²–b‚F&vWB’&WGW&ã°¢f"7F–öâÒF&vWBæFF6WBç#°¢–b†7F–öâÓÓÒv6Æ÷6Rr’&WGW&â6Æ÷6R†fÇ6R“°¢–b‚†'W7’ÇÂ6f–ær’bb7F–öâÓÒv†—7F÷'’rbb7F–öâÓÒwWÆöBr’&WGW&ã°¢G'’°¢–b†7F–öâÓÓÒvæÇ—¦R×&V6÷&Br’²–b†F—'G’bbv—B6fR‚’—&WGW&ã²–b†7G‚æöäæÇ—¦U&V6÷&B–v—B7G‚æöäæÇ—¦U&V6÷&B‡6VÆV7FVB“¶VÇ6R–b‡v–æF÷rå66÷&UW$‡V"—·f"&V6÷&C×6VÆV7FVC¶7G‚æF—7÷6R‚“·v–æF÷rå66÷&UW$‡V"ææÇ—¦R‡&V6÷&B“·ÒĞ¢VÇ6R–b†7F–öâÓÓÒwWÆöBr’WÆöB‚“°¢VÇ6R–b†7F–öâÓÓÒv†—7F÷'’rbb7G‚æ†÷7B’²6Æ÷6R†fÇ6R“²Ğ¢VÇ6R–b†7F–öâÓÓÒv†—7F÷'’r’²–b‡F"‚v†—7F÷'’r’’²†—7F÷'’‚“²v—B&Vg&W6‚‚“²ÒĞ¢VÇ6R–b†7F–öâÓÓÒw7F'Br’v—B7F'B‚“°¢VÇ6R–b†7F–öâÓÓÒwW6Rr’²v—B’†7G‚ÂwW6RrÂ²&WVW7Eö–C¢6VÆV7FVBç&WVW7Eö–BÒ“²v—BÆöB‡6VÆV7FVBç&WVW7Eö–B“²Ğ¢VÇ6R–b†7F–öâÓÓÒw&W7VÖRr’²F&vWBæF—6&ÆVBÒG'VS²v—B&W7VÖR‚“²Ğ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚w&W÷'C¢r’’²–b‡F"‚w&W÷'Br’’v—BÆöB†7F–öâç6Æ–6Rƒr’“²Ğ¢VÇ6R–b†7F–öâÓÓÒw6fRr’²F&vWBæF—6&ÆVBÒG'VS²v—B6fR‚“²Ğ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚vf–ÇFW#¢r’’°¢f"f–ÇFW"Ò7F–öâç6Æ–6Rƒr’Âf—6–&ÆRÒ°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚rç"×VW7F–öå¶FF×VW7F–öåÒr’æf÷$V6‚†gVæ7F–öâ‡’²æ†–FFVâÒf–ÇFW"ÓÓÒw&Wf–WrròæFF6WBææVVG5&Wf–WrÓÒwG'VRr¢f–ÇFW"ÓÓÒv6öæf—&ÒròæFF6WBææVVG46öæf—&ÒÓÒwG'VRr¢f–ÇFW"ÓÓÒwVçfW&–f–VBròæFF6WBçVçfW&–f–VBÓÒwG'VRr¢fÇ6S²–b‚æ†–FFVâ’f—6–&ÆR²³²Ò“°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×%ãÒ&f–ÇFW#¢%Òr’æf÷$V6‚†gVæ7F–öâ†"’²"ç6WDGG&–'WFR‚v&–×&W76VBrÂ"æFF6WBç"ÓÓÒ7F–öâòwG'VRr¢vfÇ6Rr“²Ò“°¢Ö–âçVW'•6VÆV7F÷"‚rç"Öf–ÇFW"ÖV×G’r’æ†–FFVâÒf—6–&ÆRâ°¢Ğ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚v§V×¢r’’²f"6V7F–öâÒÖ–âçVW'•6VÆV7F÷"‚u¶FF×&W÷'B×6V7F–öãÒ"r²7F–öâç6Æ–6RƒR’²r%Òr“²–b‡6V7F–öâ’²–b‡6V7F–öâç&VçDVÆVÖVçBæÖF6†W2‚vFWF–Ç2r’—6V7F–öâç&VçDVÆVÖVçBæ÷Vã×G'VS²6V7F–öâæfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²–b‡6V7F–öâç67&öÆÄ–çFõf–Wr’6V7F–öâç67&öÆÄ–çFõf–Wr‡²&Æö6³¢w7F'BrÒ“²ÒĞ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚vfö7W3¢r’’²f"FWF–ÂÒ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’æf–æB†gVæ7F–öâ‡’²&WGW&âæFF6WBçVW7F–öâÓÓÒ7F–öâç6Æ–6Rƒb“²Ò“²–b†FWF–Â’²f"ÆÂÒÖ–âçVW'•6VÆV7F÷"‚u¶FF×#Ò&f–ÇFW#¦ÆÂ%Òr“²–b†ÆÂ’ÆÂæ6Æ–6²‚“²FWF–Âæ÷VâÒG'VS²FWF–ÂçVW'•6VÆV7F÷"‚w7VÖÖ'’r’æfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²–b†FWF–Âç67&öÆÄ–çFõf–Wr’FWF–Âç67&öÆÄ–çFõf–Wr‡²&Æö6³¢w7F'BrÒ“²ÒĞ¢VÇ6R–b†7F–öâÓÓÒw&WG'’×66÷&W2rbb6VÆV7FVB’°¢–b†F—'G’’²æ÷FR‚~Šû~XXKùŞZÙjZûKúîiKûÈÎXhŞ˜xŞikŠønXŠ¾Xˆni[8"rÂG'VR“²&WGW&ã²Ğ¢v—B&W7F÷&U66÷&TFWF–Ç2†7G‚Â6VÆV7FVBç&WVW7Eö–BÂgVæ7F–öâ†ÖW76vR’²æ÷FR†ÖW76vR“²Ò“°¢v—B’†7G‚Âw&WG'•÷66÷&W2rÂ²&WVW7Eö–C¢6VÆV7FVBç&WVW7Eö–BÂ&Wf—6–öã¢6VÆV7FVBç&Wf—6–öâÒ“°¢v—BÆöB‡6VÆV7FVBç&WVW7Eö–B“°¢Ğ¢VÇ6R–b†7F–öâÓÓÒvFVÆWFRrbb6VÆV7FVBbb6öæf—&Ò‡6VÆV7FVBç&W7VÇBbb6VÆV7FVBç&W7VÇBç&V6÷&EööæÇ“ò~XŠ™šNiÊÎK»Ş[Ù^XZ^Xø®hš¾høşK»nûÉş[{.yIşh‰y¨NXˆniéKùŞyYih~ZÙ~[ú¾xZ~ûÉ¾[{.YÎjÚ^y¨Nš)Yè¾[é~XˆnKùŞyY8"s¢~XŠ™šN‹ùK»ŞXˆniéhª^Y®Xø®jZûŠë[Ù^ûÉşXéşZx¾Šù^š)[Ù^XZ^Y(Îˆ>Šù^h‰{ºKùŞyY8"r’’°¢v—B’†7G‚ÂvFVÆWFRrÂ²&WVW7Eö–C¢6VÆV7FVBç&WVW7Eö–BÒ“²v—B7W÷'BçWÆöG2‚vFVÆWFRrÂ7G‚çW6W"Â6VÆV7FVBç&WVW7Eö–B“²–b‡6W76–öâçVæF–ærÓÓÒ6VÆV7FVBç&WVW7Eö–BÇÂ6W76–öâæ66†T–BÓÓÒ6VÆV7FVBç&WVW7Eö–B’²6W76–öâçvW2ÒµÓ²6W76–öâçVæF–ærÒçVÆÃ²6W76–öâç–ÆöBÒçVÆÃ²6W76–öâæ66†T–BÒçVÆÃ²Ò6VÆV7FVBÒçVÆÃ²F—'G’ÒfÇ6S²æ÷FR‚~hª^Y®[{.XŠ™šBr“²f–WrÒv†—7F÷'’s²–b†7G‚æ†÷7B’6Æ÷6R†fÇ6R“²VÇ6Rv—B&Vg&W6‚‚“°¢ÒVÇ6R–b†7F–öâç7F'G5v—F‚‚w&VÖ÷fS¢r’’²6W76–öâçvW2ç7Æ–6R„çVÖ&W"†7F–öâç7Æ—B‚s¢r•³Ò’Â“²6W76–öâæ6Æ÷VE&VG’ÒfÇ6S²v—BW'6—7B‚“²WÆöB‚“²Ğ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚wW¢r’’²f"’ÒçVÖ&W"†7F–öâç7Æ—B‚s¢r•³Ò“²–b†’â’²f"Ò6W76–öâçvW2ç7Æ–6R†’Â•³Ó²6W76–öâçvW2ç7Æ–6R†’ÒÂÂ“²6W76–öâæ6Æ÷VE&VG’ÒfÇ6S²v—BW'6—7B‚“²WÆöB‚“²ÒĞ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚w&÷FFS¢r’’²'W7’ÒG'VS²v—B&÷FFR‡6W76–öâçvW5´çVÖ&W"†7F–öâç7Æ—B‚s¢r•³Ò•Ò“²6W76–öâæ6Æ÷VE&VG’ÒfÇ6S²v—BW'6—7B‚“²'W7’ÒfÇ6S²WÆöB‚“²Ğ¢Ò6F6‚†W'&÷"’²–b†Æ—fR‚’’æ÷FR†W'&÷"æÖW76vRÂG'VR“²Ğ¢f–æÆÇ’²'W7’ÒfÇ6S²–b‡F&vWBæ—46öææV7FVB’F&vWBæF—6&ÆVBÒfÇ6S²Ğ¢Ò“°¢–b†7G‚æ–æ—F–Å&W÷'B’²ÆöB†7G‚æ–æ—F–Å&W÷'B“²&WGW&ã²Ğ¢WÆöB‚“²7W÷'BçWÆöG2‚vÆFW7BrÂ7G‚çW6W"Â66†U66÷R’çF†Vâ†gVæ7F–öâ‡6fVB’²–b†Æ—fR‚’bb6W76–öâçvW2æÆVæwF‚bb6W76–öâçVæF–ærbb'W7’bbf–ÆÂ‡6fVB’’²–b‡6W76–öâçVæF–ær’&WGW&âÆöB‡6W76–öâçVæF–ær’çF†Vâ‡&Vg&W6‚“²–b‡f–WrÓÓÒwWÆöBr’WÆöB‚“²Ò&WGW&â&Vg&W6‚‚“²Ò“°¢Ğ ¢f"&Vf÷&T÷VâÒ÷VäW†Ó°¢÷VäW†ÒÒgVæ7F–öâ†W†Ò’°¢f"&W7VÇBÒ&Vf÷&T÷VâæÇ’‡F†—2Â&wVÖVçG2’ÂÖöFÂÒ7FFRæÖöFÃ°¢–b‚ÖöFÂÇÂÖöFÂçVW'•6VÆV7F÷"‚r6W†Õ7V&¦V7G5cbr’ÇÂÖöFÂå÷W%&Wf–WrÇÂ÷væW"‚’’&WGW&â&W7VÇC°¢f"7G‚Ò²ÖöFÃ¢ÖöFÂÂW†Ó¢W†ÒÇÂçVÆÂÂW†Ô–C¢7G&–ær†W†ÒbbW†Òæ–BÇÂrr’ÂW6W#¢÷væW"‚’ÂFö¶Vã¢7FFRçFö¶VâÀ¢G&gD–C¢G&gG2†÷væW"‚’•µ7G&–ær†W†ÒbbW†Òæ–BÇÂrr’ÇÂvæWruÒÇÂçVÆÂÂ6W76–öç3¢ö&¦V7Bæ7&VFR†çVÆÂ’ÂF–Æös¢çVÆÂÓ°¢ÖöFÂå÷W%&Wf–WrÒ7Gƒ°¢gVæ7F–öâFV6÷&FR‚’°¢ÖöFÂçVW'•6VÆV7F÷$ÆÂ‚ræW†Ò×7V&¦V7BÖ6&B×cr’æf÷$V6‚†gVæ7F–öâ†6&B’°¢–b†6&BçVW'•6VÆV7F÷"‚rç"ÖVçG'’r’’&WGW&ã°¢f"VçG'’ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚v'WGFöâr“²VçG'’çG—RÒv'WGFöâs²VçG'’æ6Æ74æÖRÒw"ÖVçG'’s²VçG'’çFW‡D6öçFVçBÒ~Šù^š)[Ù^XZRò’Xˆniés°¢VçG'’æöæ6Æ–6²ÒgVæ7F–öâ‚’²f"æÖRÒ6&BçVW'•6VÆV7F÷"‚ræW†Ò×7V&¦V7BÖæÖR×cr’çfÇVRçG&–Ò‚“²–b†æÖR’²–b‡v–æF÷rå66÷&UW$‡V"’²–b‚7G‚æG&gD–B’7G‚æG&gD–BÒG&gDf÷"†7G‚çW6W"Â7G‚æW†Ô–B“²v–æF÷rå66÷&UW$‡V"æVçFW"†7G‚ÂæÖRÂf÷&Ô6öçFW‡B†7G‚ÂæÖR’“²ÒVÇ6R6†÷r†7G‚ÂæÖRÂVçG'’“²ÒÓ°¢6&BæVæD6†–ÆB†VçG'’“°¢Ò“°¢Ğ¢FV6÷&FR‚“°¢f"ö'6W'fW"ÒæWr×WFF–öäö'6W'fW"†gVæ7F–öâ‚’²–b‚ÖöFÂæ—46öææV7FVB’²ö'6W'fW"æF—66öææV7B‚“²&WGW&ã²ÒFV6÷&FR‚“²Ò“°¢ö'6W'fW"æö'6W'fR†ÖöFÂçVW'•6VÆV7F÷"‚r6W†Õ7V&¦V7G5cbr’Â²6†–ÆDÆ—7C¢G'VRÂ7V'G&VS¢G'VRÒ“°¢ö'6W'fW"æö'6W'fR†Fö7VÖVçBæ&öG’Â²6†–ÆDÆ—7C¢G'VRÒ“°¢ÖöFÂæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÂgVæ7F–öâ†R’²–b†RçF&vWBæ6Æ÷6W7B‚ræG&gBÖ6ÆV"×ccr’’WDG&gB†7G‚çW6W"Â7G‚æW†Ô–BÇÂvæWrrÂçVÆÂ“²ÒÂG'VR“°¢&WGW&â&W7VÇC°¢Ó°¢f"&Vf÷&U6fRÒFF•cs°¢FF•crÒ7–æ2gVæ7F–öâ†7F–öâÂ–ÆöB’°¢f"7G‚Ò7FFRæÖöFÂbb7FFRæÖöFÂå÷W%&Wf–Ws°¢f"&VÆWfçBÒ7F–öâÓÓÒw6fUöW†Òrbb7G‚bb7G‚æG&gD–Bbb–ÆöBbb–ÆöBæW†Òbb7G&–ær‡–ÆöBæW†Òæ–BÇÂrr’ÓÓÒ7G‚æW†Ô–C°¢f"&W7VÇBÒv—B&Vf÷&U6fRæÇ’‡F†—2Â&wVÖVçG2“°¢–b‡&VÆWfçBbb&W7VÇBbb&W7VÇBæ–Bbb7W'&VçB†7G‚’’°¢WDG&gB†7G‚çW6W"Â&W7VÇBæ–BÂ7G‚æG&gD–B“°¢–b‚7G‚æW†Ô–B’WDG&gB†7G‚çW6W"ÂvæWrrÂçVÆÂ“°¢G'’²v—B’†7G‚ÂvGF6‚rÂ²G&gEö–C¢7G‚æG&gD–BÂW†Õö–C¢&W7VÇBæ–BÒ“²Ğ¢6F6‚…ò’²Fö7B‚~ˆ>Šù^[{.KùŞZÙûÈÎŠù^XÛ~hª^Y®zˆŞYîh™>[ÈŠú^zyyºîi{nKÉ®{º~{ºŞX[>ˆBr“²Ğ¢Ğ¢&WGW&â&W7VÇC°¢Ó°¢òò&WG'’öæÇ’F†RæWrfVGW&Rw276ö6–F–öââæWfW"&WÆ’6fUöW†Òà¢f"÷Våv—F„VçG'’Ò÷VäW†Ó°¢÷VäW†ÒÒgVæ7F–öâ†W†Ò’°¢f"&W7VÇBÒ÷Våv—F„VçG'’æÇ’‡F†—2Â&wVÖVçG2’Â7G‚Ò7FFRæÖöFÂbb7FFRæÖöFÂå÷W%&Wf–Ws°¢–b†7G‚bb7G‚æW†Ô–Bbb7G‚æG&gD–B’’†7G‚ÂvGF6‚rÂ²G&gEö–C¢7G‚æG&gD–BÂW†Õö–C¢7G‚æW†Ô–BÒ’æ6F6‚†gVæ7F–öâ‚’·Ò“°¢&WGW&â&W7VÇC°¢Ó°¢v–æF÷rå66÷&UW%&Wf–WrÒ²7VÖÖ'“¢7VÖÖ'’ÂÖ÷VçC¢6†÷rÂ“¢’Â&W&S¢&W&RÂG&gDf÷#¢G&gDf÷"Ó°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“°¢7G–ÆRçFW‡D6öçFVçBÒ ¢ç"×&öw&W77·FF–æs£‡‚Òç"ÖÖ–ÆW7FöæW7¶Æ—7B×7G–ÆS¦æöæS·FF–æs£¶Ö&v–ã£#'‚Òç"ÖÖ–ÆW7FöæW2Æ—¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£ƒ·FF–æs£‚¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖ–ÆW7FöæW2Æ“ç7ç¶F—7Æ“¦w&–C·Æ6RÖ—FV×3¦6VçFW#·v–GFƒ£#Wƒ¶†V–v‡C£#Wƒ¶&÷&FW"×&F—W3£SS¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶fÆWƒ¦æöæWÒç"ÖÖ–ÆW7FöæW26ÖÆÇ¶Ö&v–âÖÆVgC¦WFó¶föçB×6—¦S£‡Òç"ÖÖ–ÆW7FöæW2æ—2Ö7W'&VçG¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£sÒç"ÖÖ–ÆW7FöæW2æ—2Ö7W'&VçCç7ç¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB—Òç"ÖÖ–ÆW7FöæW2æ—2ÖFöæW¶6öÆ÷#§f"‚Ò×FW‡B—Òç"×v–ç7¶&÷&FW"ÖÆVgC£7‚6öÆ–B3C3“3v·FF–æs£G‚g‡Òç"×v–ç2'F–6ÆR¶'F–6ÆW¶Ö&v–â×F÷£W‡Òç"Ö6W6W¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£'ƒ¶Ö&v–ã£g‚Òç"Ö6W6R'F–6ÆW·FF–æs£‚Òç"Ö6W6RÆ&VÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£'ƒ¶Ö&v–â×F÷£‡Òç"Ö6W6R6VÆV7G¶F—7Æ“¦&Æö6³·v–GFƒ£S·FF–æs£—ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—GÒç"×&VfÆV7F–öâ×&÷WFW·FF–æs£ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW"×&F—W3£‡‡Òç"ÖF–ÖVç6–öç7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£‡ƒ¶Ö&v–ã£‚Òç"ÖF–ÖVç6–öç3ç7ç¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ·FF–æs£‡ƒ¶föçB×6—¦S£'‡Òç"ÖF–ÖVç6–öç26ÖÆÇ¶F—7Æ“¦&Æö6³¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£‡Òç"×F&ÆR×67&öÆÇ¶÷fW&fÆ÷s¦WF÷Òç"ÖF–ff–7VÇG’×F&ÆW·v–GFƒ£S¶&÷&FW"Ö6öÆÆ6S¦6öÆÆ6S¶föçB×6—¦S£'‡Òç"ÖF–ff–7VÇG’×F&ÆRF‚Âç"ÖF–ff–7VÇG’×F&ÆRFG·FF–æs£‡ƒ·FW‡BÖÆ–vã¦ÆVgC¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“·fW'F–6ÂÖÆ–vã§F÷Òç"ÖF–ff–7VÇG’×F&ÆRF‡·v†—FR×76S¦æ÷w&Ğ ¢ç"Ö–ç6–v‡G·FF–æs£‡‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–âÖ&÷GFöÓ£'‡Òç"Ö–ç6–v‡BVÂÂç"×VW7F–öâÖ&öG’VÇ·FF–ærÖÆVgC£#‡Òç"Ö–ç6–v‡BÆ’Âç"×VW7F–öâÖ&öG’Æ—¶Ö&v–ã£w‚Òç"×GFW&âÂç"Ö7F–öç·FF–æs£7‚Òç"×GFW&â²ç"×GFW&âÂç"Ö7F–öâ²ç"Ö7F–öç¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"×GFW&âƒB6ÖÆÇ¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"Ö7F–öâ×Æç¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6VVcfb“¶&÷&FW#£¶&÷&FW"×&F—W3£Wƒ·FF–æs£‡ƒ¶Ö&v–ã£g‚#‡Òç"×7V66W77·FF–æs£—‚'ƒ¶&÷&FW"ÖÆVgC£7‚6öÆ–Bf"‚ÒÖ66VçBÂ3VCs&S‚“¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶föçB×6—¦S£'‡Òç"ÖÆ–æ··FF–æs£G‚—ƒ¶Ö&v–ã£G‚'‚¶föçB×6—¦S£‡Òç"Öf—'7BÖ—77VW¶&÷&FW"ÖÆVgC£7‚6öÆ–B6C“–Ss·FF–ærÖÆVgC£'ƒ¶Ö&v–ã£g‚Òç"Ö—77VR×&Wf–Ww¶F—7Æ“¦&Æö6³¶6öÆ÷#§f"‚ÒÖ66VçB’–×÷'FçC¶Ö&v–â×F÷£G‡Òç"×6öÇWF–öâÂç"×&7F–6RÂç"Ö÷Vâ×VW7F–öç7·FF–æs£'‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"×6öÇWF–öâ7VÖÖ'’Âç"×&7F–6R7VÖÖ'’Âç"Ö÷Vâ×VW7F–öç27VÖÖ'—¶7W'6÷#§ö–çFW#¶föçB×vV–v‡C£cÒç"Ö÷&–v–æÂÖæ÷FW¶Ö&v–ã£G‚–×÷'FçGÒç"ÖÆ÷72ÖÖ¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶v£w‡Òç"ÖÆ÷72ÖÖç7ç¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–æs£g‚ƒ¶&÷&FW"×&F—W3£—ƒ¶föçB×6—¦S£'‡Òç"ÖÆ÷72ÖÖ'¶6öÆ÷#§f"‚ÒÖFævW"Â6#CCC3b“¶Ö&v–âÖÆVgC£w‡Òç"×VW7F–öç·67&öÆÂÖÖ&v–â×F÷£“‡Òç"×FW‡G¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"×F÷FÇ¶Ö&v–ã£‚–×÷'FçGĞ¢ç"ÖVçG'—¶F—7Æ“¦–æÆ–æRÖfÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶Ö&v–â×F÷£'ƒ·FF–æs£w‚ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§G&ç7&VçC¶6öÆ÷#§f"‚ÒÖ66VçBÂ3VCs&S‚“¶föçC¦–æ†W&—C¶föçB×6—¦S£'ƒ¶7W'6÷#§ö–çFW'Ğ¢ç"ÖF–Æöw¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ·v–GFƒ¦Ö–âƒsc‚Æ6Æ2ƒRÒ#G‚’“¶Ö‚Ö†V–v‡C£“&Gfƒ·FF–æs£¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æRÂ6S†V&c“¶&÷&FW"×&F—W3£#'ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡BÂ3ƒ#&b“¶&÷‚×6†F÷s£#G‚“‚33¶÷fW&fÆ÷s¦WFó¶föçC£G‚óãrÖÆR×7—7FVÒÄ&Æ–æ´Ö57—7FVÔföçBÂ%6VvöRT’"Ç6ç2×6W&–gĞ¢ç"ÖF–Æös£¦&6¶G&÷¶&6¶w&÷VæC¢33s¶&6¶G&÷Öf–ÇFW#¦&ÇW"ƒG‚—Òç"Ö†VG·÷6—F–öã§7F–6·“·F÷£·¢Ö–æFWƒ£#¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Æ–vâÖ—FV×3¦6VçFW#·FF–æs£‡‚#Gƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"Ö†VBƒ'¶föçB×6—¦S£#ƒ¶Ö&v–ã£Òç"ÖW–V'&÷w¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£s¶ÆWGFW"×76–æs£ƒ¶6öÆ÷#§f"‚ÒÖ66VçBÂ3VCs&S‚—Òç"Ö6öçFVçG·FF–æs£#G‚#G‡Òç"ÖÖW76vS¦V×G—¶F—7Æ“¦æöæWÒç"ÖÖW76vW·FF–æs£‚'ƒ¶Ö&v–ã£G‚¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6VVcfb“¶&÷&FW"×&F—W3£ƒ¶föçB×6—¦S£'‡Òç"ÖÖW76vRæ—2ÖW'&÷'¶6öÆ÷#§f"‚ÒÖFævW"Â6#CCC3b“¶&6¶w&÷VæC¢6fVcVGÒç"×F'7¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶Ö&v–ã£‡‚Òç"×F'2æ—2Ö7F—fW¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6VVcfb“¶6öÆ÷#§f"‚ÒÖ66VçBÂ3VCs&S‚“¶&÷&FW"Ö6öÆ÷#§G&ç7&VçGĞ¢ç"Ö'WGFöç¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æRÂ6S†V&c“¶&÷&FW"×&F—W3£ƒ·FF–æs£‡‚7ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡BÂ3ƒ#&b“¶föçC¦–æ†W&—C¶föçB×6—¦S£'ƒ¶7W'6÷#§ö–çFW#·v†—FR×76S¦æ÷w&Òç"Ö'WGFöã¦F—6&ÆVG¶÷6—G“¢ãS¶7W'6÷#§v—GÒç"Ö'WGFöã¦fö7W2×f—6–&ÆRÂç"ÖVçG'“¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£7‡Òç"×&–Ö'—¶&6¶w&÷VæC§f"‚ÒÖ66VçBÂ3VCs&S‚“¶6öÆ÷#§v†—FS¶&÷&FW"Ö6öÆ÷#§G&ç7&VçC¶föçB×vV–v‡C£sÒç"ÖFævW'¶6öÆ÷#§f"‚ÒÖFævW"Â6#CCC3b—Òç"ÖÖ–âƒ7¶föçB×6—¦S£gƒ¶Ö&v–ã£w‡Òç"ÖÖ–âƒG¶föçB×6—¦S£7ƒ¶Ö&v–ã£W‚W‡Òç"ÖÖ–â¶Ö&v–ã£g‚Òç"Ö–çG&÷·FF–æs£#ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6VVcfb“¶&÷&FW"×&F—W3£Wƒ¶Ö&v–âÖ&÷GFöÓ£#‡Òç"Ö–çG&ò¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVBÂ3sƒƒ3“"—Òç"×V÷F¶föçB×6—¦S£ƒ¶Ö&v–â×F÷£'ƒ¶6öÆ÷#§f"‚ÒÖ66VçBÂ3VCs&S‚—Òç"×6V7F–öâÖ†VG¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'‡Òç"×6V7F–öâÖ†VBƒ7¶Ö&v–ã£Òç"×6V7F–öâÖ†VB6ÖÆÇ¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–âÖÆVgC£‡‡Òç"×WÆöBÖw&÷W·FF–æs£‡‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"×WÆöBÖw&÷Wç¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"Öf–ÆRÖÆ&VÇ·÷6—F–öã§&VÆF—fS¶÷fW&fÆ÷s¦†–FFVçÒç"Öf–ÆRÖÆ&VÂ–çWG·÷6—F–öã¦'6öÇWFS¶–ç6WC£¶÷6—G“£·v–GFƒ£S¶7W'6÷#§ö–çFW'Òç"×vW7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£ƒ¶Ö&v–â×F÷£'‡Òç"×vW¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶÷fW&fÆ÷s¦†–FFVã¶Ö–â×v–GFƒ£Òç"×vR–Öw·v–GFƒ£S¶†V–v‡C£#Wƒ¶ö&¦V7BÖf—C¦6öçF–ã¶&6¶w&÷VæC¢6cFcVcs¶F—7Æ“¦&Æö6·Òç"×vRÖ–æf÷·FF–æs£W‚‡ƒ¶föçB×6—¦S£ƒ·v†—FR×76S¦æ÷w&¶÷fW&fÆ÷s¦†–FFVã·FW‡BÖ÷fW&fÆ÷s¦VÆÆ—6—7Òç"×vRÖ7F–öç7¶F—7Æ“¦fÆWƒ¶v£7ƒ·FF–æs£W‚g‡Òç"×vRÖ7F–öç2'WGFöç¶fÆWƒ£·FF–æs£G‚'ƒ¶föçB×6—¦S£‡Òç"Ö6†V6·¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶v£‡ƒ¶Ö&v–ã£W‚¶föçB×6—¦S£'‡Òç"Ö6†V6²–çWG¶Ö&v–â×F÷£Gƒ¶fÆWƒ¦æöæS¶66VçBÖ6öÆ÷#§f"‚ÒÖ66VçB—Òç"Ö6öç6VçG¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"Ö†VÇ¶föçB×6—¦S£'ƒ·FF–æs£‚¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"Ö†VÇ7VÖÖ'—¶7W'6÷#§ö–çFW#¶6öÆ÷#§f"‚Ò×FW‡B—Òç"Öfö÷FW'¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Æ–vâÖ—FV×3¦6VçFW#¶v£'ƒ¶Ö&v–ã£‡‚Òç"Öfö÷FW#ç7ç¶föçB×6—¦S£‡Òç"Ö×WFVG¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVBÂ3sƒƒ3“"—Òç"Ö†—7F÷'—·v–GFƒ£S¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ·FF–æs£gƒ¶Ö&v–ã£‡‚¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶föçC¦–æ†W&—C¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚Ò×FW‡B“·FW‡BÖÆ–vã¦ÆVgC¶7W'6÷#§ö–çFW'Òç"Ö†—7F÷'’'¶6öÆ÷#§f"‚ÒÖ66VçB—Òç"ÖV×G—·FW‡BÖÆ–vã¦6VçFW#·FF–æs£C‚'‡Òç"ÖV×G’¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£7ƒ¶Ö&v–ã£'‚#‡Òç"×7–ææW'·v–GFƒ£#Wƒ¶†V–v‡C£#Wƒ¶&÷&FW#£7‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×F÷Ö6öÆ÷#§f"‚ÒÖ66VçB“¶&÷&FW"×&F—W3£SS¶Ö&v–ã£WFò#ƒ¶æ–ÖF–öã§"×7–â2Æ–æV"–æf–æ—FWÔ¶W–g&ÖW2"×7–ç·F÷·G&ç6f÷&Ó§&÷FFRƒ3cFVr—×Ğ¢ç"×&W7VÇB×F÷·FF–æs£#ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£Wƒ¶Ö&v–âÖ&÷GFöÓ£g‡Òç"×&W7VÇB×F÷ç¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"×7FG7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g"ãfg#¶v£'ƒ¶Ö&v–ã£#‚Òç"×7FG2F—g¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖçÒç"×7FG2'¶föçB×6—¦S£#7ƒ¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7Òç"×7FG27ç¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"×v&æ–æw¶&6¶w&÷VæC¢6ffcVFc¶6öÆ÷#¢3ƒc&S¶&÷&FW"×&F—W3£'ƒ·FF–æs£‚Gƒ¶föçB×6—¦S£'ƒ¶Ö&v–âÖ&÷GFöÓ£#‡Òç"×VW7F–öç¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶Ö&v–ã£‚Òç"×VW7F–öãç7VÖÖ'—¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ·FF–æs£7ƒ¶7W'6÷#§ö–çFW#¶föçB×vV–v‡C£c¶Æ—7B×7G–ÆS¦æöæWÒç"×VW7F–öâ7VÖÖ'’6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×vV–v‡C£CÒç"Ö&FvW¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ66VçB“·v†—FR×76S¦æ÷w&Òç"×VW7F–öâÖ&öG—·FF–æs£W‚g‡Òç"×FW‡G·v†—FR×76S§&R×w&¶÷fW&fÆ÷r×w&¦ç—v†W&S¶föçB×6—¦S£7‡Òç"×VW7F–öâÖ&öG“æÆ&VÂÂç"×66÷&RÖf–VÆG2Æ&VÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"×VW7F–öâFW‡F&VÂç"×VW7F–öâ–çWE·G—SÖçVÖ&W%×¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ·v–GFƒ£S¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡ƒ·FF–æs£‡ƒ¶&6¶w&÷VæC§f"‚ÒÖ–çWBÖ&rÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—C¶föçB×6—¦S£7ƒ¶Ö&v–â×F÷£W‡Òç"×VW7F–öâFW‡F&V·&W6—¦S§fW'F–6ÇÒç"×66÷&RÖf–VÆG7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£'ƒ¶Ö&v–â×F÷£'‡Òç"Ö6†V6·7¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶v£g‡Òç"ÖWf–FVæ6W¶&÷&FW"ÖÆVgC£7‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ærÖÆVgC£ƒ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖW7F–ÖFW¶föçB×6—¦S£'ƒ¶6öÆ÷#¢3“Cs#GÒç"ÖWfÇVF–öç¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ær×F÷£#‡Òç"ÖWfÇVF–öâƒ7¶Ö&v–â×F÷£‡‡Òç"ÖWfÇVF–öâÆ—¶föçB×6—¦S£7ƒ¶Ö&v–ã£‡‚Òç"ÖÆ÷77¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£ƒ·FF–æs£‡‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶föçB×6—¦S£'‡Òç"ÖÆ÷72'¶6öÆ÷#§f"‚ÒÖFævW"Â6#CCC3b—Ğ¢ç"ÖÖ–âç"×v–ç7¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"ÖÆVgC£7‚6öÆ–B3C3“3v¶&÷&FW"×&F—W3£Gƒ·FF–æs£‡ƒ¶Ö&v–ã£‡‚¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb—Òç"ÖÖ–âç"×v–âÖ6&G·FF–æs£g‚Òç"ÖÖ–âç"×v–âÖ6&B²ç"×v–âÖ6&G¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–â×F÷£Òç"ÖÖ–âç"×v–âÖ6&BƒG¶Ö&v–ã£ƒ¶föçB×6—¦S£G‡Òç"ÖÖ–âç"×v–âÖ6&B¶Ö&v–ã£—‚Òç"ÖÖ–âç"×v–âÖ6&Bç"ÖWf–FVæ6W¶Ö&v–â×F÷£'ƒ·FF–æs£‡‚ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6cVcvf"“¶&÷&FW#£¶&÷&FW"×&F—W3£‡ƒ¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãwÒç"ÖÖ÷&R×v–ç27VÖÖ'’Âç"×&V6÷fW'’7VÖÖ'—¶7W'6÷#§ö–çFW#·FF–æs£'‚Òç"ÖÖ÷&R×v–ç7¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"ÖÖ–âç"×FW‡G¶Æ–æRÖ†V–v‡C£ãƒWÒç"ÖÖ–âæ¶FW‡¶föçB×6—¦S£ã†VÓ·v†—FR×76S¦æ÷&ÖÇÒç"ÖÖ–âæ¶FW‚ÖF—7Æ—¶÷fW&fÆ÷r×ƒ¦WFó¶÷fW&fÆ÷r×“¦†–FFVã·FF–æs£‡‚'ƒ¶Ö&v–ã£'‚¶Ö‚×v–GFƒ£WÒç"ÖÖ–âæ¶FW‚Ö‡FÖÇ·v†—FR×76S¦æ÷&ÖÇÒç"×&V6÷fW'—·FF–æs£#ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£G‡Òç"×&V6÷fW'“âç"Ö'WGFöç¶Ö&v–ã£'‚Òç"×&V6÷fW&VB×vW7¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶÷fW&fÆ÷s¦WFó·FF–æs£‚Òç"×&V6÷fW&VB×vW2–Öw·v–GFƒ£ƒƒ¶†V–v‡C£“Wƒ¶ö&¦V7BÖf—C¦6öçF–ã¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡ƒ¶fÆWƒ¦æöæWÒç"×&V6÷fW&VB×v÷&²'F–6ÆW·FF–æs£'‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"ÖÖ–âç"Öf—'7BÖ—77VW·FF–æs£'‚Gƒ¶&÷&FW"×&F—W3£‚‚¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6cVcvf"—Ğ¢ò¢&W÷'B&VF–ær†–W&&6‡’â6÷W&6W2öVF—F÷'27F’f–Æ&ÆRv—F†÷WBÆVF–ærF†R7F÷'’â¢ğ¢ç"Ö–æÆ–æRç"Ö6öçFVçG¶Ö‚×v–GFƒ£sƒƒ¶Ö&v–âÖ–æÆ–æS¦WF÷Òç"ÖÖ–âç"×&VF–ær×6V7F–öç¶Ö&v–ã£3‚3gƒ·67&öÆÂÖÖ&v–â×F÷£#‡Òç"ÖÖ–âç"×&VF–ær×6V7F–öã¦fö7W7¶÷WFÆ–æS¦æöæWÒç"ÖÖ–âç"×&VF–ær×6V7F–öã¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£g‡Ğ¢ç"ÖÖ–âç"Ö6†FW'¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶v£'ƒ¶Ö&v–ã£‡‡Òç"ÖÖ–âç"Ö6†FW#ç7ç¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£sS¶6öÆ÷#§f"‚ÒÖ66VçB“¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW"×&F—W3£ƒ·FF–æs£g‚—ƒ¶Æ–æRÖ†V–v‡C£ãWÒç"ÖÖ–âç"Ö6†FW"ƒ7¶föçB×6—¦S£—ƒ¶Æ–æRÖ†V–v‡C£ãC¶Ö&v–ã£G‡Òç"ÖÖ–âç"Ö6†FW"¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£'ƒ¶Ö&v–ã£Ğ¢ç"ÖÖ–âç"×&W7VÇB×F÷¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW#£·FF–æs£#Gƒ¶Ö&v–â×F÷£g‡Òç"ÖÖ–âç"×&W7VÇB×F÷ƒ7¶föçB×6—¦S£#Gƒ¶Æ–æRÖ†V–v‡C£ã3S¶Ö&v–ã£‡‚Òç"ÖÖ–âç"×F÷FÇ¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦&6VÆ–æS¶v£Wƒ¶6öÆ÷#§f"‚Ò×FW‡B—Òç"ÖÖ–âç"×F÷FÃæ'¶föçB×6—¦S£3gƒ¶ÆWGFW"×76–æs¢Ó‡Òç"ÖÖ–âç"×F÷FÃç7ç¶föçB×6—¦S£g‡Òç"ÖÖ–âç"×F÷FÃç6ÖÆÇ¶Ö&v–âÖÆVgC£‡ƒ¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Ğ¢ç"×&W÷'BÖæg¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶v£‡ƒ¶Ö&v–â×F÷£‡‡Òç"ÖÖ–âç"×&W÷'BÖæbç"Ö'WGFöç¶Ö–âÖ†V–v‡C£C'ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶fÆWƒ£Òç"ÖÖ–âç"×66÷&R×7VÖÖ'—¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãƒS·FF–æs£'‚Gƒ¶&÷&FW"×&F—W3£ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–âÖ&÷GFöÓ£G‡Ğ¢ç"ÖÖ–âç"ÖföÆG¶&÷&FW#£¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£·FF–æs£¶Ö&v–ã£'‚¶&6¶w&÷VæC¦æöæWÒç"ÖÖ–âç"ÖföÆCç7VÖÖ'—¶7W'6÷#§ö–çFW#·FF–æs£7‚'ƒ¶föçB×6—¦S£7ƒ¶föçB×vV–v‡C£c¶Æ–æRÖ†V–v‡C£ãc¶6öÆ÷#§f"‚Ò×FW‡B“¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"ÖÖ–âç"ÖföÆBÖ&öG—·FF–æs£'‚'ƒ¶Ö–â×v–GFƒ£Òç"ÖÖ–âç"ÖföÆBÖ&öG“æÆ&VÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£'‚Òç"ÖÖ–â7VÖÖ'“¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£7ƒ¶&÷&FW"×&F—W3£G‡Ğ¢ç"ÖÖ–âç"Ö7F–öâ×Æç¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×F÷£7‚6öÆ–Bf"‚ÒÖ66VçB“¶&÷&FW"×&F—W3£Gƒ·FF–æs£‡ƒ¶Ö&v–ã£‡‚Òç"ÖÖ–âç"Ö7F–öâÖ†VF–æw¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦&6VÆ–æS¶v£ƒ¶Ö&v–âÖ&÷GFöÓ£‡Òç"ÖÖ–âç"Ö7F–öâÖ†VF–ærƒG¶föçB×6—¦S£Wƒ¶Ö&v–ã£¶Æ–æRÖ†V–v‡C£ãc¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"×7FWÖçVÖ&W'¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£s¶fÆWƒ¦æöæWÒç"ÖÖ–âç"Ö7F–öç·FF–æs£g‚Òç"ÖÖ–âç"Ö7F–öã¦Æ7BÖ6†–ÆG·FF–ærÖ&÷GFöÓ£Òç"ÖÖ–âç"×7V66W77¶&÷&FW#£¶&÷&FW"×&F—W3£ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“·FF–æs£'‚Gƒ¶Ö&v–ã£G‚Òç"ÖÖ–âç"×7V66W73æ'¶F—7Æ“¦&Æö6³¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ66VçB“¶Ö&v–âÖ&÷GFöÓ£7‡Òç"ÖÖ–âç"×7V66W72¶Ö&v–ã£Ğ¢ç"ÖÖ–âç"×&÷6W·v†—FR×76S¦æ÷&ÖÃ¶föçB×6—¦S£Gƒ¶Æ–æRÖ†V–v‡C£ãƒWÒç"ÖÖ–âç"×&÷6R·v†—FR×76S§&R×w&¶Ö&v–ã£‡‚Òç"ÖÖ–âç"×&÷6R¦f—'7BÖ6†–ÆG¶Ö&v–â×F÷£Òç"ÖÖ–âç"×&÷6RVÂÂç"ÖÖ–âç"×&÷6RöÇ·FF–ærÖÆVgC£#Gƒ¶Ö&v–ã£‚Òç"ÖÖ–âç"×&÷6RÆ—¶Ö&v–ã£w‚·v†—FR×76S§&R×w&Òç"ÖÖ–âç"×&÷6R7G&öæw¶föçB×vV–v‡C£cSÒç"ÖÖ–âç"ÖWf–FVæ6W·v†—FR×76S§&R×w&¶÷fW&fÆ÷r×w&¦ç—v†W&S¶Æ–æRÖ†V–v‡C£ã‡Òç"ÖÖ–âç"×&÷6RÖ†VF–æw·FF–ær×F÷£g‡Òç"ÖÖ–âç"×v–ç2ç"×v–âÖ6&G·FF–æs£'‚Òç"ÖÖ–âç"×v–ç2ƒ7¶föçB×6—¦S£g‡Òç"ÖÖ–âç"×v–âÖ6&BƒG¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–âÖ&÷GFöÓ£g‡Òç"ÖÖ–âç"×v–âÖ6&Bç"ÖföÆG¶Ö&v–ã£g‚¶&÷&FW#£Òç"ÖÖ–âç"×v–âÖ6&Bç"ÖföÆCç7VÖÖ'—·FF–æs£W‚¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£'‡Ğ¢ç"×VW7F–öâÖf–ÇFW'7¶F—7Æ“¦fÆWƒ¶v£wƒ¶fÆW‚×w&§w&¶Ö&v–ã£G‚Òç"×VW7F–öâÖf–ÇFW'2¶&–×&W76VC×G'VU×¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚ÒÖ66VçB“¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖ66VçB—Òç"ÖÖ–âç"×VW7F–öå¶†–FFVåÒÂç"ÖÖ–â¶†–FFVå×¶F—7Æ“¦æöæR–×÷'FçGÒç"ÖÖ–âç"×VW7F–öç¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶÷fW&fÆ÷s¦†–FFVã·67&öÆÂÖÖ&v–â×F÷£#‡Òç"ÖÖ–âç"×VW7F–öãç7VÖÖ'—·FF–æs£gƒ¶föçB×6—¦S£Gƒ¶Ö–âÖ†V–v‡C£C‡ƒ¶Æ—7B×7G–ÆS¦æöæWÒç"ÖÖ–âç"×VW7F–öãç7VÖÖ'“£¢×vV&¶—BÖFWF–Ç2ÖÖ&¶W'¶F—7Æ“¦æöæWÒç"ÖÖ–âç"×VW7F–öãç7VÖÖ'“ç7ã¦f—'7BÖ6†–ÆG¶fÆWƒ£¶Ö–â×v–GFƒ£¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"ÖÖ–âç"×VW7F–öâ7VÖÖ'’6ÖÆÇ¶föçB×6—¦S£ƒ¶Æ–æRÖ†V–v‡C£ãcS¶Ö&v–â×F÷£G‡Òç"ÖÖ–âç"Ö&FvW¶föçB×6—¦S£'ƒ¶fÆWƒ¦æöæWÒç"Ö6†Wg&öç¶föçB×6—¦S£·v–GFƒ£wƒ¶†V–v‡C£wƒ¶&÷&FW"×&–v‡C£ãW‚6öÆ–Bf"‚ÒÖ×WFVB“¶&÷&FW"Ö&÷GFöÓ£ãW‚6öÆ–Bf"‚ÒÖ×WFVB“·G&ç6f÷&Ó§&÷FFRƒCVFVr“¶Ö&v–ã£7‚Gƒ¶fÆWƒ¦æöæWÒç"×VW7F–öå¶÷VåÓç7VÖÖ'“âç"Ö6†Wg&öç·G&ç6f÷&Ó§&÷FFRƒ##VFVr“¶Ö&v–â×F÷£g‡Òç"ÖÖ–âç"×VW7F–öå¶÷VåÓç7VÖÖ'—¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"ÖÖ–âç"×VW7F–öâÖ&öG—·FF–æs£g‡Òç"ÖÖ–âç"×VW7F–öâÖ&öG’ƒG¶föçB×6—¦S£G‡Òç"ÖÖ–âç"Öf—'7BÖ—77VW¶Ö&v–ã£‡ƒ·FF–æs£Gƒ¶&÷&FW"ÖÆVgC£7‚6öÆ–B6C“–SwÒç"ÖÖ–âç"Öf—'7BÖ—77VRƒC¦f—'7BÖ6†–ÆG¶Ö&v–â×F÷£Òç"ÖÖ–âç"ÖgVÆÂÖ7&VF—G¶föçB×6—¦S£Gƒ¶föçB×vV–v‡C£cÒç"ÖÖ–âç"×6÷W&6W¶Ö&v–â×F÷£#‡Òç"ÖÖ–âç"ÖÆ–æ·¶Ö–âÖ†V–v‡C£3gƒ·FF–æs£g‚'‡Òç"ÖÖ–âç"Ö6†V6·¶föçB×6—¦S£'‡Òç"ÖÖ–âç"Ö6öçFW‡G·FF–æs£'‚Òç"ÖÖ–âç"Ö6öçFW‡Cç7VÖÖ'—¶7W'6÷#§ö–çFW#¶föçB×vV–v‡C£cÒç"ÖÖ–âç"×&W÷'BÖÖWFç"Ö–ç6–v‡G¶Ö&v–âÖ&÷GFöÓ£‡‡Òç"ÖÖ–âæ¶FW‚ÖW'&÷'¶÷fW&fÆ÷r×w&¦ç—v†W&WĞ¢ÖVF–†Ö‚×v–GFƒ£S#‚—²ç"ÖF–Æöw·v–GFƒ£S¶Ö‚×v–GFƒ£S¶Ö‚Ö†V–v‡C£Gfƒ¶†V–v‡C£Gfƒ¶Ö&v–ã£¶&÷&FW"×&F—W3£¶&÷&FW#£Òç"Ö†VG·FF–æs£W‚g‡Òç"Ö6öçFVçG·FF–æs£g‚#G‡Òç"×vW7¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’—Òç"Ö–çG&òÂç"ÖÖ–âç"×&W7VÇB×F÷·FF–æs£‡‡Òç"Ö†VBƒ'¶föçB×6—¦S£‡‡Òç"×7FG2'¶föçB×6—¦S£#‡Òç"ÖÖ–âç"×VW7F–öãç7VÖÖ'—·FF–æs£Gƒ¶v£‡‡Òç"ÖÖ–âç"×&W÷'BÖæbç"Ö'WGFöç¶föçB×6—¦S£'ƒ·FF–æs£‡‡Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRF†VG¶F—7Æ“¦æöæWÒç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRF&öG—¶F—7Æ“¦&Æö6·Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRG'¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒBÆÖ–æÖ‚ƒÃg"’“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£ƒ¶Ö&v–ã£‚·FF–æs£‡‡Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFG·FF–æs£Gƒ¶&÷&FW#£Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒ“£¦&Vf÷&W¶6öçFVçC¢~š)Xûrs¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒ"“£¦&Vf÷&W¶6öçFVçC¢~{»ÎY‚s¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒ2“£¦&Vf÷&W¶6öçFVçC¢~h	Şˆ2s¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒB“£¦&Vf÷&W¶6öçFVçC¢~Šêzérs¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦Æ7BÖ6†–ÆG¶w&–BÖ6öÇVÖã£òÓ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–â×F÷£gƒ·FF–ær×F÷£‡ƒ¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ã‡×ÔÖVF–‡&VfW'2×&VGV6VBÖÖ÷F–öã§&VGV6R—²ç"×7–ææW'¶æ–ÖF–öã¦æöæW×Ğ¢°¢7G–ÆRçFW‡D6öçFVçB³Òrç"Ö7F–öâÖÖW76vW¶fÆWƒ£S¶Ö–â×v–GFƒ£¶Ö&v–ã£ƒ¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶Æ–æRÖ†V–v‡C£ãs¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"Ö7F–öâÖÖW76vS¦V×G—¶F—7Æ“¦æöæWÒç"Öfö÷FW#¦†2ƒâç"Ö7F–öâÖÖW76vR—¶fÆW‚×w&§w&Òs°¢7G–ÆRçFW‡D6öçFVçB³Òrç"ÖÖ–âç"ÖæW‡BÖW†×¶Ö&v–ã£‡‚·FF–æs£g‚‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"ÖÆVgC£7‚6öÆ–Bf"‚ÒÖ66VçB“¶&÷&FW"×&F—W3£'ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B—Òç"ÖÖ–âç"ÖæW‡BÖW†ÓæƒG¶Ö&v–ã£gƒ¶föçB×6—¦S£g‡Òç"ÖæW‡BÖW†ÓæöÇ¶Ö&v–ã£G‚·FF–ærÖÆVgC£#'‡Òç"ÖæW‡BÖW†ÓæöÃæÆ—·FF–ærÖÆVgC£7ƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"ÖæW‡BÖW†ÓæöÃæÆ’¶Æ—¶Ö&v–â×F÷£g‡Òç"ÖæW‡BÖW†ÓæöÃæÆ“£¦Ö&¶W'¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£cSÒç"ÖÖ–âç"ÖæW‡BÖW†Òç"×&÷6W¶föçB×6—¦S£7‡Òç"×F—×6÷W&6W7¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶Æ–vâÖ—FV×3¦6VçFW#¶v£Gƒ¶Ö–â×v–GFƒ£Òç"ÖÖ–âç"×F—×6÷W&6W2ç"ÖÆ–æ·¶Ö&v–ã£·v†—FR×76S¦æ÷&ÖÃ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒW"×&Wf–Wr×66ç2æ§2ÓÓÓÓÒ¢ğ¢ò¢W"×VW7F–öâ66â&Vv–öç2æBVF—F&ÆRô5"&V6÷&G3²æòvVæW&FVB…DÔÂ—2G'W7FVBâ¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"W62ÒgVæ7F–öâ‡2’²&WGW&âW66T‡FÖÂ…7G&–ær‡2ÓÒçVÆÂòrr¢2’“²Ó°¢f"&öÆW2Ò²W#¢~Xéşš)‚rÂv÷&³¢~KÙÎzÙBrÂ&VfW&Væ6S¢~Xø.ˆ>zÙNj‚rÓ°¢gVæ7F–öâfÆ–E&Vv–öâ‡"ÇvW2—·&WGW&â"bg&öÆW5·"æ¶–æEÒbgvW2ç6öÖR†gVæ7F–öâ‡—·&WGW&âçvSÓÓ×"çvS·Ò’bd'&’æ—4'&’‡"æ&÷‚’bg"æ&÷‚æÆVæwFƒÓÓÓBbg"æ&÷‚æWfW'’†gVæ7F–öâ†â—·&WGW&âG—VöbãÓÓÒvçVÖ&W"rbdçVÖ&W"æ—4f–æ—FR†â’bfããÓbfãÃÓ·Ò’bg"æ&÷…³%Óâãbg"æ&÷…³5Óâãbg"æ&÷…³Ò·"æ&÷…³%ÓÃÓãbg"æ&÷…³Ò·"æ&÷…³5ÓÃÓã·Ğ¢gVæ7F–öâÆ–÷WD7&÷†–ÖrÆ&÷‚—¶gVæ7F–öâÆ–÷WB‚—¶–b‚–ÖrææGW&Åv–GF‡ÇÂ–ÖrææGW&Ä†V–v‡B—&WGW&ã¶–Örç&VçDVÆVÖVçBç7G–ÆRæ7V7E&F–óÒ†&÷…³%Ò¦–ÖrææGW&Åv–GF‚’ò†&÷…³5Ò¦–ÖrææGW&Ä†V–v‡B“¶–Örç7G–ÆRæ775FW‡CÒwv–GFƒ¢r²ƒö&÷…³%Ò’²rS¶Ö‚×v–GFƒ¦æöæS¶ÆVgC¢r²‚Ö&÷…³Òö&÷…³%Ò£’²rS·F÷¢r²‚Ö&÷…³Òö&÷…³5Ò£’²rRs·Ö–ÖræöæÆöCÖÆ–÷WC¶–b†–Öræ6ö×ÆWFR–Æ–÷WB‚“·Ğ¢gVæ7F–öâVæÆ&vR‡&Vv–öâÇvRÆ÷VæW"—·f"ÖöFÃÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vF–Æörr“¶ÖöFÂæ6Æ74æÖSÒw2ÖVæÆ&vRs¶ÖöFÂæ–ææW$…DÔÃÒsÆ†VFW#ãÇ7G&öæsâr·&öÆW5·&Vv–öâæ¶–æEÒ²~hŠ®Y»â+rzÊÂr·&Vv–öâçvR²ršSÂ÷7G&öæsãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FFÖ6Æ÷6RÖ7&÷îX[>™zÓÂö'WGFöããÂö†VFW#ãÆF—b6Æ73Ò'2Ö7&÷#ãÆ–ÖrÇCÒ"r·&öÆW5·&Vv–öâæ¶–æEÒ²~hŠ®Y»îiKîZJr#ãÂöF—cãÇ6Æ73Ò'"Ö×WFVB#îi‹îzK®y¨NiŠş[{.KùŞZÙhš¾høşK»ny¨NZû[©NXË®YùşûÈÎiÊ®‹>yJ‚8#Â÷âs¶Fö7VÖVçBæ&öG’æVæD6†–ÆB†ÖöFÂ“·f"–ÖvSÖÖöFÂçVW'•6VÆV7F÷"‚v–Örr“¶–ÖvRç7&3×vRçW&Ã¶Æ–÷WD7&÷†–ÖvRÇ&Vv–öâæ&÷‚“¶ÖöFÂçVW'•6VÆV7F÷"‚u¶FFÖ6Æ÷6RÖ7&÷Òr’æöæ6Æ–6³ÖgVæ7F–öâ‚—¶ÖöFÂæ6Æ÷6R‚“·Ó¶ÖöFÂæöæ6Æ–6³ÖgVæ7F–öâ†R—¶–b†RçF&vWCÓÓÖÖöFÂ–ÖöFÂæ6Æ÷6R‚“·Ó¶ÖöFÂæöæ6Æ÷6SÖgVæ7F–öâ‚—¶ÖöFÂç&VÖ÷fR‚“¶–b†÷VæW"bf÷VæW"æ—46öææV7FVB–÷VæW"æfö7W2‚“·Ó¶ÖöFÂç6†÷tÖöFÂ‚“·Ğ¢gVæ7F–öâ'Fâ‡2Â7F–öâ’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FF×66ãÒ"r²7F–öâ²r#âr²2²sÂö'WGFöãâs²Ğ¢gVæ7F–öâ7&÷VF—F÷"‡&VçBÂvW2Â7W'&VçBÂ6fR’°¢f"VF—F÷"ÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w6V7F–öâr“²VF—F÷"æ6Æ74æÖRÒw2ÖVF—F÷"s°¢f"vRÒvW2æf–æB†gVæ7F–öâ‡’²&WGW&â7W'&VçBbbçvRÓÓÒ7W'&VçBçvS²Ò’ÇÂvW5³ÒÂ&÷‚Ò7W'&VçBò7W'&VçBæ&÷‚ç6Æ–6R‚’¢³ÃÃÃÒÂ¶–æBÒ7W'&VçBò7W'&VçBæ¶–æB¢vRç&öÆS°¢VF—F÷"æ–ææW$…DÔÂÒsÆF—b6Æ73Ò'2Ö6öçG&öÇ2#ãÆÆ&VÃîiÚ^k©šSÇ6VÆV7BFF×vSâr²vW2æÖ†gVæ7F–öâ‡’²&WGW&âsÆ÷F–öâfÇVSÒ"r²çvR²r"r²‡ÓÓÒvRòw6VÆV7FVBr¢rr’²sîzÊÂr²çvR²ršR+rr²&öÆW5·ç&öÆUÒ²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃîXË®YùşXh^Zë“Ç6VÆV7BFFÖ¶–æCâr²ö&¦V7Bæ¶W—2‡&öÆW2’æÖ†gVæ7F–öâ†²’²&WGW&âsÆ÷F–öâfÇVSÒ"r²²²r"r²†²ÓÓÒ¶–æBòw6VÆV7FVBr¢rr’²sâr²&öÆW5¶µÒ²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÂöF—cãÇ6Æ73Ò'"Ö×WFVB#îYÊY»îx˜~Kˆ®h¹nXªjn˜ZèÎi[Nš)yºîh‰nKÙÎzÙNûÉ¾K™şXúşKº^‹>i[NKˆ¾™Ú.y¨Ny›îXˆnjùN8.‹zš^Xh^ZëXúş{º~{ºŞk{¾XªXË®Yùş8#Â÷ãÆF—b6Æ73Ò'2×7FvR#ãÆ–ÖrÇCÒ.[è^jn˜y¨Nhš¾høşšR"G&vv&ÆSÒ&fÇ6R#ãÆF—b6Æ73Ò'2×6VÆV7F–öâ#ãÂöF—cãÂöF—cãÆF—b6Æ73Ò'2Ö6ö÷&F–æFW2#âr²²~[zn‹ë‹yÒrÂ~Kˆ®‹ë‹yÒrÂ~ZëŞ[ªbrÂ~š¹[ªbuÒæÖ†gVæ7F–öâ†âÂ’’²&WGW&âsÆÆ&VÃâr²â²rSÆ–çWBG—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#"7FWÒ#ã"FFÖ6ö÷&F–æFSÒ"r²’²r#ãÂöÆ&VÃâs²Ò’æ¦ö–â‚rr’²sÂöF—cãÆF—b6Æ73Ò'2Ö7F–öç2#âr²'Fâ‚~i[NšRrÂvgVÆÂr’²'Fâ‚~KùŞZÙXË®YùòrÂw6fRr’²'Fâ‚~Xùnkh‚rÂv6æ6VÂr’²sÂöF—cãÇ6Æ73Ò'2ÖW'&÷""&öÆSÒ'7FGW2#ãÂ÷âs°¢&VçBæVæD6†–ÆB†VF—F÷"“²f"7FvRÒVF—F÷"çVW'•6VÆV7F÷"‚rç2×7FvRr’Â–ÖrÒ7FvRçVW'•6VÆV7F÷"‚v–Örr’Â6VÆV7F–öâÒ7FvRçVW'•6VÆV7F÷"‚rç2×6VÆV7F–öâr’Â7F'C°¢gVæ7F–öâ–çB‚’²6VÆV7F–öâç7G–ÆRæ775FW‡BÒvÆVgC¢r²&÷…³Ò£²rS·F÷¢r²&÷…³Ò£²rS·v–GFƒ¢r²&÷…³%Ò£²rS¶†V–v‡C¢r²&÷…³5Ò£²rRs²VF—F÷"çVW'•6VÆV7F÷$ÆÂ‚u¶FFÖ6ö÷&F–æFUÒr’æf÷$V6‚†gVæ7F–öâ†VÂÂ’’²VÂçfÇVRÒÖF‚ç&÷VæB†&÷…¶•Ò£’ó²Ò“²Ğ¢–Örç7&2ÒvRçW&Ã²–çB‚“°¢VF—F÷"çVW'•6VÆV7F÷"‚u¶FF×vUÒr’æöæ6†ævRÒgVæ7F–öâ†R’²vRÒvW2æf–æB†gVæ7F–öâ‡’²&WGW&â7G&–ær‡çvR’ÓÓÒRçF&vWBçfÇVS²Ò“²–Örç7&2ÒvRçW&Ã²&÷‚Ò³ÃÃÃÓ²–çB‚“²Ó°¢VF—F÷"çVW'•6VÆV7F÷"‚u¶FFÖ¶–æEÒr’æöæ6†ævRÒgVæ7F–öâ†R’²¶–æBÒRçF&vWBçfÇVS²Ó°¢gVæ7F–öâö–çB†R’²f""Ò7FvRævWD&÷VæF–æt6Æ–VçE&V7B‚“²&WGW&â´ÖF‚æÖ‚ƒÄÖF‚æÖ–âƒÂ†Ræ6Æ–VçE‚×"æÆVgB’÷"çv–GF‚’’ÄÖF‚æÖ‚ƒÄÖF‚æÖ–âƒÂ†Ræ6Æ–VçE’×"çF÷’÷"æ†V–v‡B’•Ó²Ğ¢7FvRæöçö–çFW&F÷vâÒgVæ7F–öâ†R’²–b‚–Öræ6ö×ÆWFR’&WGW&ã²Rç&WfVçDFVfVÇB‚“²7F'BÒö–çB†R“²7FvRç6WEö–çFW$6GW&R†Rçö–çFW$–B“²Ó°¢7FvRæöçö–çFW&Ö÷fRÒgVæ7F–öâ†R’²–b‚7F'B’&WGW&ã²f"VæBÒö–çB†R“²&÷‚Ò´ÖF‚æÖ–â‡7F'E³ÒÆVæE³Ò’ÄÖF‚æÖ–â‡7F'E³ÒÆVæE³Ò’ÄÖF‚æÖ‚‚ãÄÖF‚æ'2†VæE³Ò×7F'E³Ò’’ÄÖF‚æÖ‚‚ãÄÖF‚æ'2†VæE³Ò×7F'E³Ò’•Ó²–çB‚“²Ó°¢7FvRæöçö–çFW'WÒ7FvRæöçö–çFW&6æ6VÂÒgVæ7F–öâ‚’²7F'BÒçVÆÃ²Ó°¢VF—F÷"çVW'•6VÆV7F÷$ÆÂ‚u¶FFÖ6ö÷&F–æFUÒr’æf÷$V6‚†gVæ7F–öâ†VÂÂ’’²VÂæöæ6†ævRÒgVæ7F–öâ‚’²&÷…¶•ÒÒÖF‚æÖ‚ƒÄÖF‚æÖ–âƒÄçVÖ&W"†VÂçfÇVR’ó’“²&÷…³%ÒÒÖF‚æÖ–â†&÷…³%ÒÃÖ&÷…³Ò“²&÷…³5ÒÒÖF‚æÖ–â†&÷…³5ÒÃÖ&÷…³Ò“²–çB‚“²Ó²Ò“°¢VF—F÷"æöæ6Æ–6²Ò7–æ2gVæ7F–öâ†R’²f""ÒRçF&vWBæ6Æ÷6W7B‚u¶FF×66åÒr“²–b‚"’&WGW&ã²Rç7F÷&÷vF–öâ‚“°¢–b†"æFF6WBç66âÓÓÒv6æ6VÂr’VF—F÷"ç&VÖ÷fR‚“°¢–b†"æFF6WBç66âÓÓÒvgVÆÂr’²&÷‚Ò³ÃÃÃÓ²–çB‚“²Ğ¢–b†"æFF6WBç66âÓÓÒw6fRr’²"æF—6&ÆVBÒG'VS²G'’²&÷ƒÔ'&’æg&öÒ†VF—F÷"çVW'•6VÆV7F÷$ÆÂ‚u¶FFÖ6ö÷&F–æFUÒr’’æÖ†gVæ7F–öâ†VÂ—·&WGW&âçVÖ&W"†VÂçfÇVR’ó·Ò“¶–b†&÷‚ç6öÖR†gVæ7F–öâ†â—·&WGW&âçVÖ&W"æ—4f–æ—FR†â—ÇÆãÃÇÆãã·Ò—ÇÆ&÷…³Ò¶&÷…³%ÓããÇÆ&÷…³Ò¶&÷…³5Óãã—F‡&÷ræWrW'&÷"‚~Šû~YÊY»îx˜~ˆÈ>Y»NXh^jn˜’r“¶–b†&÷…³%ÒÃÒãÇÂ&÷…³5ÒÃÒã’F‡&÷ræWrW'&÷"‚~Šû~jn˜i»NZèÎi[Ny¨NXË®Yùòr“²v—B6fR‡²vS¢vRçvRÂ¶–æC¢¶–æBÂ&÷ƒ¢&÷‚ç6Æ–6R‚’Ò“²VF—F÷"ç&VÖ÷fR‚“²Ò6F6‚†W'"’²VF—F÷"çVW'•6VÆV7F÷"‚rç2ÖW'&÷"r’çFW‡D6öçFVçBÒW'"æÖW76vS²Òf–æÆÇ’²"æF—6&ÆVBÒfÇ6S²ÒĞ¢Ó°¢VF—F÷"ç67&öÆÄ–çFõf–WrbbVF—F÷"ç67&öÆÄ–çFõf–Wr‡²&Æö6³¢væV&W7BrÒ“°¢Ğ¢gVæ7F–öâ&Vv–öä6&B‡&Vv–öâÂvRÂ–æFW‚’°¢&WGW&âsÆf–wW&R6Æ73Ò'2×&Vv–öâ"FFÖ–æFWƒÒ"r²–æFW‚²r"FF×&Vv–öâÖ¶–æCÒ"r·&Vv–öâæ¶–æB²r#ãÆf–v6F–öãâr²‡&Vv–öâæ¶–æCÓÓÒwW"sò~Xéşš)hŠ®Y»âs§&Vv–öâæ¶–æCÓÓÒwv÷&²sò~zÙNš)XÚòKÙÎzÙNhŠ®Y»âs¢~Xø.ˆ>zÙNjhŠ®Y»âr’²r+rzÊÂr²&Vv–öâçvR²ršSÂöf–v6F–öããÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'2×&Wf–Wr"FF×66ãÒ'¦ööÓ¢r¶–æFW‚²r"&–ÖÆ&VÃÒ.iKîZJrr·&öÆW5·&Vv–öâæ¶–æEÒ²~hŠ®Y»â#ãÆF—b6Æ73Ò'2Ö7&÷#ãÆ–ÖrÆöF–æsÒ&Æ§’"7&3Ò"r²W62‡vRçW&Â’²r"ÇCÒ"r²&öÆW5·&Vv–öâæ¶–æEÒ²~hš¾høşXË®Yùò#ãÂöF—cãÂö'WGFöããÆF—câr²'Fâ‚~iKîZJrrÂw¦ööÓ¢r²–æFW‚’²'Fâ‚~‹>i[BrÂvVF—C¢r²–æFW‚’²'Fâ‚~z{¾™šNXË®YùòrÂw&VÖ÷fS¢r²–æFW‚’²sÂöF—cãÂöf–wW&Sâs°¢Ğ¢7–æ2gVæ7F–öâFV6÷&FR†Ö–âÂ"Â7G‚Â†öö·2’°¢f"vVæW&F–öâÒ7G&–ær„çVÖ&W"†Ö–âæFF6WBç66ävVæW&F–öâÇÂ’²“²Ö–âæFF6WBç66ävVæW&F–öâÒvVæW&F–öã°¢f"—5W6VBÒ"ç7FGW2ÓÓÒwW6VBrÂ2Ò"ç&W7VÇBò"ç&W7VÇBçVW7F–öç2¢"ç&V6÷fW'’bb"ç&V6÷fW'’çVW7F–öç2ÇÂµÓ°¢–b‚2æÆVæwF‚’&WGW&ã°¢f"’ÒgVæ7F–öâ†7F–öâÂ–ÆöB’²&WGW&â†öö·2æ’†7G‚Â7F–öâÂö&¦V7Bæ76–vâ‡²&WVW7Eö–C¢"ç&WVW7Eö–BÒÂ–ÆöBÇÂ·Ò’“²Ó°¢–b†—5W6VB’°¢f"f÷&ÒÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vf÷&Òr“²f÷&Òæ6Æ74æÖRÒw2×fW&–g’s°¢f÷&Òæ–ææW$…DÔÂÒsÆƒ3îjZûš)yºîKˆîKÙÎzÙCÂöƒ3ãÇ6Æ73Ò'"Ö×WFVB#îKùŞyYXéşiÈ™IŠúşXik9^ûÉ¾KúîjÚ>ŠønXŠ¾ih~ZÙ~Y(Îh›iKXˆnûÈÎXˆniéKÉ®KÛşyJKùŞZÙYîy¨NXh^Zë8#Â÷âr²2æÖ†gVæ7F–öâ‡Â’’²&WGW&âsÆFWF–Ç26Æ73Ò'"×VW7F–öâ"FFÖö7#Ò"r²’²r#ãÇ7VÖÖ'“îzÊÂr²W62‡æÆ&VÂ’²rš)ƒÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'"×VW7F–öâÖ&öG’#ãÆÆ&VÃîš)yºãÇFW‡F&VæÖSÒ'7FVÒr²’²r"&÷w3Ò#B"Ö†ÆVæwFƒÒ#CS"&WV—&VCâr²W62‡ç7FVÒ’²sÂ÷FW‡F&VãÂöÆ&VÃãÆÆ&VÃîˆ>Šù^i{ny¨NKÙÎzÙCÇFW‡F&VæÖSÒ&ç7vW"r²’²r"&÷w3Ò#B"Ö†ÆVæwFƒÒ#C#âr²W62‡æç7vW"’²sÂ÷FW‡F&VãÂöÆ&VÃãÆF—b6Æ73Ò'"×66÷&RÖf–VÆG2#ãÆÆ&VÃîh›iK[é~XˆcÆ–çWBæÖSÒ'66÷&Rr²’²r"G—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#“““’"7FWÒ"ã"fÇVSÒ"r²W62‡çFV6†W%÷66÷&R’²r#ãÂöÆ&VÃãÆÆ&VÃîkºXˆcÆ–çWBæÖSÒ&Ö‚r²’²r"G—SÒ&çVÖ&W""Ö–ãÒ#"ÖƒÒ#“““’"7FWÒ"ã"fÇVSÒ"r²W62‡æÖ…÷66÷&R’²r#ãÂöÆ&VÃãÂöF—cãÂöF—cãÂöFWF–Ç3âs²Ò’æ¦ö–â‚rr’²sÆ'WGFöâ6Æ73Ò'"Ö'WGFöâ"×&–Ö'’"G—SÒ'7V&Ö—B#îKùŞZÙjZû[›n{º~{ºÓÂö'WGFöãâs°¢f"6VÆV7F–öâÒ"æ–çWE÷6VÆV7F–öâÇÂ"æ÷F–öç2ÇÂ·Ó°¢–b‡6VÆV7F–öâæ6öæf–u÷fW'6–öâÓÓÒ"bb6VÆV7F–öâçW'÷6RÓÒw&V6÷&Br’°¢f"–6¶W#ÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vf–VÆG6WBr“·–6¶W"æ6Æ74æÖSÒw2×66÷Rs°¢–6¶W"æ–ææW$…DÔÃÒsÆÆVvVæCîY:®K©¾š)™ÈŠhŠún{¸nXˆniéûÉóÂöÆVvVæCãÆÆ&VÃîXˆniéˆÈ>Y»CÇ6VÆV7BæÖSÒ&æÇ—6—5÷66÷R#ãÆ÷F–öâfÇVSÒ&ÆÂ#îXZ˜:˜.yJš)yºãÂö÷F–öããÆ÷F–öâfÇVSÒ&Æ÷76W2#îZKXˆnš)KÉXXƒÂö÷F–öããÆ÷F–öâfÇVSÒ'6VÆV7FVB#îh‰˜hºy¨Nš)yºãÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃãÇ6Æ73Ò'"Ö×WFVB#îi[NKÙ>jh.ŠxK¸ŞŠhny¹n[{.Kˆ®KÊš)yºîûÈÎiÊ®˜KŠŞy¨Nš)KùŞyYzèyúŞ{¹>Šë®8#Â÷ãÆF—b6Æ73Ò'2×VW7F–öâ×–6·2#âr·2æÖ†gVæ7F–öâ‡—·&WGW&âsÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"æÖSÒ&FWF–Å÷VW7F–öç2"fÇVSÒ"r¶W62‡æÆ&VÂ’²r"r²‚‡6VÆV7F–öâç6VÆV7FVE÷VW7F–öç7ÇÅµÒ’æ–æ6ÇVFW2‡æÆ&VÂ“òv6†V6¶VBs¢rr’²sîzÊÂr¶W62‡æÆ&VÂ’²rš)‚r²‡çFV6†W%÷66÷&RÖçVÆÃòr+rr·çFV6†W%÷66÷&R²‡æÖ…÷66÷&RÖçVÆÃòròr·æÖ…÷66÷&S¢rr’²rXˆbs¢rr’²sÂöÆ&VÃâs·Ò’æ¦ö–â‚rr’²sÂöF—câs°¢f÷&ÒçVW'•6VÆV7F÷"‚v'WGFöå·G—S×7V&Ö—EÒr’æ&Vf÷&R‡–6¶W"“·–6¶W"çVW'•6VÆV7F÷"‚w6VÆV7Br’çfÇVS×6VÆV7F–öâææÇ—6—5÷66÷WÇÂvÆÂs°¢gVæ7F–öâFövvÆU–6·2‚—·–6¶W"çVW'•6VÆV7F÷"‚rç2×VW7F–öâ×–6·2r’æ†–FFVã×–6¶W"çVW'•6VÆV7F÷"‚w6VÆV7Br’çfÇVRÓÒw6VÆV7FVBs·×–6¶W"æöæ6†ævS×FövvÆU–6·3·FövvÆU–6·2‚“°¢Ğ¢Ö–âæVæD6†–ÆB†f÷&Ò“°¢f÷&Òæöç7V&Ö—BÒ7–æ2gVæ7F–öâ†R’²Rç&WfVçDFVfVÇB‚“²f""Òf÷&ÒçVW'•6VÆV7F÷"‚u·G—S×7V&Ö—EÒr“²"æF—6&ÆVBÒG'VS°¢G'’²f"VW7F–öç2Ò2æÖ†gVæ7F–öâ‡Â’’²gVæ7F–öâfÇVR†²’²&WGW&âf÷&ÒæVÆVÖVçG5¶²¶•ÒçfÇVS²Ò&WGW&â²Æ&VÃ¢æÆ&VÂÂ7FVÓ¢fÇVR‚w7FVÒr’Âç7vW#¢fÇVR‚vç7vW"r’ÂFV6†W%÷66÷&S¢fÇVR‚w66÷&Rr’ÓÓÒrròçVÆÂ¢çVÖ&W"‡fÇVR‚w66÷&Rr’’ÂÖ…÷66÷&S¢fÇVR‚vÖ‚r’ÓÓÒrròçVÆÂ¢çVÖ&W"‡fÇVR‚vÖ‚r’’Ó²Ò“²f"66÷SÖf÷&ÒæVÆVÖVçG2ææÇ—6—5÷66÷S÷¶æÇ—6—5÷66÷S¦f÷&ÒæVÆVÖVçG2ææÇ—6—5÷66÷RçfÇVRÇ6VÆV7FVE÷VW7F–öç3¤'&’æg&öÒ†f÷&ÒçVW'•6VÆV7F÷$ÆÂ‚u¶æÖSÖFWF–Å÷VW7F–öç5Ó¦6†V6¶VBr’’æÖ†gVæ7F–öâ‡‚—·&WGW&â‚çfÇVS·Ò—Ó§VæFVf–æVC²–b‡66÷Rbb66÷RææÇ—6—5÷66÷SÓÓÒw6VÆV7FVBrbb66÷Rç6VÆV7FVE÷VW7F–öç2æÆVæwF‚—F‡&÷ræWrW'&÷"‚~Šû~˜hºˆ{>[	Kˆ˜>™ÈŠhŠún{¸nXˆniéy¨Nš)yºâr“²v—B’‚v6öæf—&Õö–çWBrÂ²VW7F–öç3¢VW7F–öç2ÂæÇ—6—5÷6VÆV7F–öã§66÷RÒ“²v—B’‚w&W7VÖRrÂ²ÖöFS¢w6fVBrÒ“²v—B†öö·2æÆöB‡"ç&WVW7Eö–B“²Ò6F6‚†W'"’²†öö·2ææ÷FR†W'"æÖW76vRÂG'VR“²Òf–æÆÇ’²–b†"æ—46öææV7FVB’"æF—6&ÆVBÒfÇ6S²Ğ¢Ó°¢–b‡"æ–çWE÷&Wf–Wr’Ö–âçVW'•6VÆV7F÷"‚u¶FF×#×&W7VÖUÒr’æ†–FFVâÒG'VS°¢Ğ¢f"6÷W&6S°¢G'’²6÷W&6RÒv—B’‚w6÷W&6W2r“²Ò6F6‚†W'"’²–b†Ö–âæ—46öææV7FVB’†öö·2ææ÷FR†W'"æÖW76vRÂG'VR“²&WGW&ã²Ğ¢–b‚Ö–âæ—46öææV7FVBÇÂÖ–âæFF6WBç66ävVæW&F–öâÓÒvVæW&F–öâ’&WGW&ã°¢f"vW2Ò6÷W&6RçvW2ÇÂµÒÂ&Vv–öç2Ò6÷W&6Rç&Vv–öç2ÇÂ·ÒÂæVÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“²æVÂæ6Æ74æÖRÒw2ÖÆ–'&'’s°¢æVÂæ–ææW$…DÔÂÒsÇ7VÖÖ'“îhš¾høşK»b+rr²vW2æÆVæwF‚²ršSÂ÷7VÖÖ'“ãÇ6Æ73Ò'"Ö×WFVB#îhš¾høşK»nKùŞZÙYÊ[Ù>X˜Ş‹JnXû~8.X[>ˆNXˆniéX[yJXéşZx¾hš¾høşK»nûÉ¾Xéş[Ù^XZ^XŠ™šNYîûÈÎXˆniéK¸ŞKùŞyY[{.KùŞZÙy¨Nš)yºîih~ZÙ~8#Â÷ãÆF—b6Æ73Ò'2×vW2#âr²vW2æÖ†gVæ7F–öâ‡’²&WGW&âsÆF&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW""‡&VcÒ"r²W62‡çW&Â’²r#ãÆ–ÖrÆöF–æsÒ&Æ§’"7&3Ò"r²W62‡çW&Â’²r"ÇCÒ.zÊÂr²çvR²~š^hš¾høşK»b#ãÇ7ãîzÊÂr²çvR²~šR+rr²&öÆW5·ç&öÆUÒ²sÂ÷7ããÂöâs²Ò’æ¦ö–â‚rr’²sÂöF—câr²‡"ç7FGW2ÓÒw'Vææ–ærrbb6÷W&6Rç&VFöæÇ’òsÆÆ&VÃîŠ^XX^hš¾høşK»n{¾XŠ³Ç6VÆV7BFFÖFBÖ¶–æCãÆ÷F–öâfÇVSÒ'W"#îXéşš)ƒÂö÷F–öããÆ÷F–öâfÇVSÒ'v÷&²#îKÙÎzÙCÂö÷F–öããÆ÷F–öâfÇVSÒ'&VfW&Væ6R#îXø.ˆ>zÙNjƒÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"FF×66âÖ6öç6VçCîYÎhHşYÊ‹JnXû~KŠŞKùŞZÙŠ^XX^hš¾høşK»nûÉ¾Š8hèZy>YŞ8ˆ>Xû~zØizX[>KúhóÂöÆ&VÃãÆÆ&VÂ6Æ73Ò'"Ö'WGFöâ"Öf–ÆRÖÆ&VÂ#îŠ^XX^hš¾høşK»cÆ–çWBG—SÒ&f–ÆR"66WCÒ&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"FFÖFB×vSãÂöÆ&VÃâr¢rr’²sÇ6Æ73Ò'2×WÆöBÖæ÷FR"&öÆSÒ'7FGW2#ãÂ÷âs°¢f"ÖFW&–Ç2ÒÖ–âçVW'•6VÆV7F÷"‚rç"ÖÖFW&–Ç2r“²–b†ÖFW&–Ç2’ÖFW&–Ç2æVæD6†–ÆB‡æVÂ“²VÇ6RÖ–âç&WVæB‡æVÂ“°¢f"f–ÆRÒæVÂçVW'•6VÆV7F÷"‚u¶FFÖFB×vUÒr“²–b†f–ÆR’f–ÆRæöæ6†ævRÒ7–æ2gVæ7F–öâ‚’°¢–b‚f–ÆRæf–ÆW2æÆVæwF‚’&WGW&ã²f"ÖW76vRÒæVÂçVW'•6VÆV7F÷"‚rç2×WÆöBÖæ÷FRr“²f–ÆRæF—6&ÆVBÒG'VS°¢G'’°¢–b‚æVÂçVW'•6VÆV7F÷"‚u¶FF×66âÖ6öç6VçEÒr’æ6†V6¶VB’F‡&÷ræWrW'&÷"‚~Šû~XXzîŠêNKùŞZÙhš¾høşK»br“°¢–b‡vW2æÆVæwF‚ãÒR’F‡&÷ræWrW'&÷"‚~iÊÎK»Şhª^Y®[{.KùŞZÙƒ^[Êhš¾høşK»br“°¢ÖW76vRçFW‡D6öçFVçBÒ~jÚ>YÊKùŞZÙhš¾høşK»n(
bs²f"Òv—Bv–æF÷rå66÷&UW%&Wf–Wrç&W&R†f–ÆRæf–ÆW5³Ò“°¢v—B’‚w6fUöÖFW&–Ç2rÂ²6öç6VçC¢G'VRÂ7V&¦V7C¢"ç7V&¦V7BÂG&gEö–C¢"æG&gEö–BÂW†Õö–C¢"æW†Õö–BÂF—FÆS¢"çF—FÆRÂ÷F–öç3¢"æ÷F–öç2Ò“°¢v—B’‚wWÆöE÷vRrÂ²vS¢vW2æÆVæwF‚³Â&öÆS¢æVÂçVW'•6VÆV7F÷"‚u¶FFÖFBÖ¶–æEÒr’çfÇVRÂW&Ã¢çW&ÂÒ“°¢v—B†öö·2æÆöB‡"ç&WVW7Eö–B“°¢Ò6F6‚†W'"’²ÖW76vRçFW‡D6öçFVçBÒW'"æÖW76vS²Òf–æÆÇ’²f–ÆRæF—6&ÆVBÒfÇ6S²f–ÆRçfÇVRÒrs²Ğ¢Ó°¢2æf÷$V6‚†gVæ7F–öâ‡Â’’°¢f"F&vWBÒ—5W6VBòÖ–âçVW'•6VÆV7F÷"‚u¶FFÖö7#Ò"r²’²r%Òç"×VW7F–öâÖ&öG’r’¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×VW7F–öãÒ"r²æ–B²r%Ò¶FF×66âÖ†÷7EÒr“°¢–b‚F&vWB’&WGW&ã°¢f"¦öæRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w6V7F–öâr“²¦öæRæ6Æ74æÖRÒw2×VW7F–öâs²F&vWBç&WVæB‡¦öæR“°¢f"7W'&VçBÒö&¦V7Bç&÷F÷G—Ræ†4÷vå&÷W'G’æ6ÆÂ‡&Vv–öç2ÇæÆ&VÂ’ò&Vv–öç5·æÆ&VÅÒ¢ç6÷W&6U÷&Vv–öç2ÇÂµÓ°¢7W'&VçBÒ7W'&VçBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&âfÆ–E&Vv–öâ‡"ÇvW2“²Ò“°¢gVæ7F–öâ&VæFW"‚’°¢f"¶–æG3Õ²wW"rÂwv÷&²rÂw&VfW&Væ6RuÒÆ6&G3Ö¶–æG2æÖ†gVæ7F–öâ†¶–æB—·f"f÷VæCÖ7W'&VçBæÖ†gVæ7F–öâ‡&Vv–öâÆ–æFW‚—·&WGW&â·&Vv–öã§&Vv–öâÆ–æFWƒ¦–æFW‡Ó·Ò’æf–ÇFW"†gVæ7F–öâ†—FVÒ—·&WGW&â—FVÒç&Vv–öâæ¶–æCÓÓÖ¶–æC·Ò“¶–b†f÷VæBæÆVæwF‚—&WGW&âf÷VæBæÖ†gVæ7F–öâ†—FVÒ—·&WGW&â&Vv–öä6&B†—FVÒç&Vv–öâÇvW2æf–æB†gVæ7F–öâ‡—·&WGW&âçvSÓÓÖ—FVÒç&Vv–öâçvS·Ò’Æ—FVÒæ–æFW‚“·Ò’æ¦ö–â‚rr“·f"–G3Ö¶–æCÓÓÒwW"s÷çvW7ÇÅµÓ¦¶–æCÓÓÒwv÷&²s÷çv÷&µ÷vW7ÇÅµÓ§ç&VfW&Væ6U÷vW7ÇÅµÒÆ¶æ÷vã×vW2æf–ÇFW"†gVæ7F–öâ‡—·&WGW&â–G2æ–æ6ÇVFW2‡çvR“·Ò“·&WGW&â¶æ÷vâæÆVæwFƒòsÆF—b6Æ73Ò'2×VæÆö6FVB#ãÆ#âr·&öÆW5¶¶–æEÒ²~hŠ®Y»î[	®iÊ®Zé®KØÓÂö#ãÇîiÊ®xÉÎkX¾hŠ®Y»îˆÈ>Y»NûÈÎXúşh™>[ÈiÚ^k©š^jZûh‰nh˜¾Xªjn˜8#Â÷âr¶¶æ÷vâæÖ†gVæ7F–öâ‡—·&WGW&âsÆ‡&VcÒ"r¶W62‡çW&Â’²r"F&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW"#îiú^yÈ¾zÊÂr·çvR²ršSÂöâs·Ò’æ¦ö–â‚r+rr’²sÂöF—câs¢rs·Ò’æ¦ö–â‚rr“°¢¦öæRæ–ææW$…DÔÂÒsÆƒCîXéşš)KˆîKÙÎzÙNhŠ®Y»ãÂöƒCâr²‡vW2æÆVæwF‚òsÆF—b6Æ73Ò'2×&Vv–öç2#âr²6&G2²sÂöF—câr²‚6÷W&6Rç&VFöæÇ“ö'Fâ‚~ûÈ²jn˜hš¾høşXË®YùòrÂvFBr“¢rr’²‚7W'&VçBæÆVæwF‚òsÇ6Æ73Ò'"Ö×WFVB#îk*iÈXúş™ÚZé®KØŞi{nKùŞyYXéşš^ûÉ¾XúşXˆnXŠ¾jn˜Xéşš)KˆîKÙÎzÙNûÈÎK™şiJşhÈ‹zš^8#Â÷âr¢rr’¢sÇ6Æ73Ò'"Ö×WFVB#îiÊÎš)i¨.izXúşyJhš¾høşK»nûÈÎXúşYÊ‹XNiiXË®Š^XX^XéşXÛ~h‰nzÙNš)XÚ8#Â÷âr“°¢¦öæRçVW'•6VÆV7F÷$ÆÂ‚rç2×&Vv–öâr’æf÷$V6‚†gVæ7F–öâ†6&B—·f"&Vv–öãÖ7W'&VçE´çVÖ&W"†6&BæFF6WBæ–æFW‚•Ó¶Æ–÷WD7&÷†6&BçVW'•6VÆV7F÷"‚rç2Ö7&÷–Örr’Ç&Vv–öâæ&÷‚“·Ò“°¢–b‡6÷W&6Rç&VFöæÇ’—¦öæRçVW'•6VÆV7F÷$ÆÂ‚u¶FF×66åãÒ&VF—C¢%ÒÅ¶FF×66åãÒ'&VÖ÷fS¢%Òr’æf÷$V6‚†gVæ7F–öâ†"—¶"ç&VÖ÷fR‚“·Ò“°¢Ğ¢7–æ2gVæ7F–öâW'6—7B†æW‡B’²v—B’‚w6fU÷&Vv–öç2rÂ²Æ&VÃ¢æÆ&VÂÂ&Vv–öç3¢æW‡BÒ“²7W'&VçBÒæW‡C·&Vv–öç5·æÆ&VÅÓÖæW‡C·&VæFW"‚“·f"—FVÓÔ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’æf–æB†gVæ7F–öâ†â—·&WGW&ââæFF6WBçVW7F–öãÓÓÕ7G&–ær‡æ–B“·Ò’Æ6†V6³Ö—FVÒbf—FVÒçVW'•6VÆV7F÷"‚u¶FFÖf–VÆC×fW&–f–VEÒr“¶–b†6†V6²bf6†V6²æ6†V6¶VB—¶6†V6²æ6†V6¶VCÖfÇ6S¶6†V6²æF—7F6„WfVçB†æWrWfVçB‚v–çWBrÇ¶'V&&ÆW3§G'VWÒ’“·Ö†öö·2ææ÷FR‚~hŠ®Y»îXË®Yùş[{.KùŞZÙûÈÎŠû~zîŠêNiÊÎš)Zû[©NKØŞ{Úî8"r“²Ğ¢¦öæRæöæ6Æ–6²Ò7–æ2gVæ7F–öâ†R’²f""ÒRçF&vWBæ6Æ÷6W7B‚u¶FF×66åÒr“²–b‚"ÇÂ"æ6Æ÷6W7B‚rç2ÖVF—F÷"r’’&WGW&ã²Rç&WfVçDFVfVÇB‚“²Rç7F÷&÷vF–öâ‚“°¢f"Ò"æFF6WBç66âÂ–æFW‚ÒçVÖ&W"†ç7Æ—B‚s¢r•³Ò“°¢G'’²–b†ç7F'G5v—F‚‚w¦ööÓ¢r’—·f"&Vv–öãÖ7W'&VçE¶–æFW…Ó¶–b‡&Vv–öâ–VæÆ&vR‡&Vv–öâÇvW2æf–æB†gVæ7F–öâ‡—·&WGW&âçvSÓÓ×&Vv–öâçvS·Ò’Æ"“·Ğ¢VÇ6R–b‚6÷W&6Rç&VFöæÇ’bb†ÓÓÒvFBrÇÂç7F'G5v—F‚‚vVF—C¢r’’’²f"öÆBÒ¦öæRçVW'•6VÆV7F÷"‚rç2ÖVF—F÷"r“²–b†öÆB’öÆBç&VÖ÷fR‚“²7&÷VF—F÷"‡¦öæRÇvW2ÆÓÓÒvFBròçVÆÂ¢7W'&VçE¶–æFW…ÒÆ7–æ2gVæ7F–öâ‡"’²f"æW‡BÒ7W'&VçBç6Æ–6R‚“²–b†ÓÓÒvFBr’æW‡BçW6‚‡"“²VÇ6RæW‡E¶–æFW…ÒÒ#²v—BW'6—7B†æW‡B“²Ò“²Ğ¢VÇ6R–b‚6÷W&6Rç&VFöæÇ’bfç7F'G5v—F‚‚w&VÖ÷fS¢r’’v—BW'6—7B†7W'&VçBæf–ÇFW"†gVæ7F–öâ…òÂ¢’²&WGW&â¢ÓÒ–æFWƒ²Ò’“°¢Ò6F6‚†W'"’²†öö·2ææ÷FR†W'"æÖW76vRÇG'VR“²Ğ¢Ó°¢&VæFW"‚“°¢Ò“°¢Ğ¢v–æF÷rå66÷&UW%66ç2Ò²FV6÷&FS¢FV6÷&FRÓ°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“²7G–ÆRçFW‡D6öçFVçBÒç2ÖÆ–'&'—·FF–æs£gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶Ö&v–âÖ&÷GFöÓ£‡‡Òç2ÖÆ–'&'’7VÖÖ'—¶föçB×vV–v‡C£s¶7W'6÷#§ö–çFW'Òç2×vW7¶F—7Æ“¦fÆWƒ¶v£'ƒ¶÷fW&fÆ÷s¦WFó·FF–æs£W‚Òç2×vW2¶fÆWƒ¦æöæS·v–GFƒ£“ƒ¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚Ò×FW‡B“·FW‡BÖFV6÷&F–öã¦æöæWÒç2×vW2–Öw·v–GFƒ£“ƒ¶†V–v‡C£ƒ¶ö&¦V7BÖf—C¦6öçF–ã¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡ƒ¶F—7Æ“¦&Æö6·Òç2ÖÆ–'&'“æÆ&VÇ¶F—7Æ“¦&Æö6³¶Ö&v–ã£'‚Òç2ÖÆ–'&'’ç"Ö6†V6·¶F—7Æ“¦fÆW‡Òç2ÖÆ–'&'’ç"Öf–ÆRÖÆ&VÇ¶F—7Æ“¦–æÆ–æRÖ&Æö6·Òç2ÖÆ–'&'’6VÆV7G¶F—7Æ“¦&Æö6·Òç2×VW7F–öç·FF–æs£'‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–âÖ&÷GFöÓ£W‡Òç2×&Vv–öç7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£'‡Òç2×&Vv–öç¶Ö&v–ã£‡‚¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£ƒ·FF–æs£ƒ¶Ö–â×v–GFƒ£Òç2×&Vv–öâf–v6F–öç¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–âÖ&÷GFöÓ£‡‡Òç2Ö7&÷·÷6—F–öã§&VÆF—fS¶÷fW&fÆ÷s¦†–FFVã¶&6¶w&÷VæC¢6ffc¶7V7B×&F–ó£¶Ö‚Ö†V–v‡C£c‡Òç2Ö7&÷–Öw·÷6—F–öã¦'6öÇWFS¶†V–v‡C¦WFó¶F—7Æ“¦&Æö6·Òç2×&Vv–öâç"Ö'WGFöç¶föçB×6—¦S£ƒ·FF–æs£W‚‡ƒ¶Ö&v–ã£‚G‚Òç2ÖVF—F÷'¶Ö&v–ã£W‚·FF–æs£'ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖ66VçB“¶&÷&FW"×&F—W3£'‡Òç2Ö6öçG&öÇ7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£‡Òç2Ö6öçG&öÇ26VÆV7G·v–GFƒ£S·FF–æs£‡‡Òç2×7FvW·÷6—F–öã§&VÆF—fS·F÷V6‚Ö7F–öã¦æöæS·W6W"×6VÆV7C¦æöæS¶Ö&v–ã£'‚WFó¶Ö‚×v–GFƒ£cƒ¶Æ–æRÖ†V–v‡C£Òç2×7FvSæ–Öw·v–GFƒ£S¶†V–v‡C¦WFó¶F—7Æ“¦&Æö6·Òç2×6VÆV7F–öç·÷6—F–öã¦'6öÇWFS¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶&÷&FW#£'‚6öÆ–B3S#cFSƒ¶&6¶w&÷VæC¢3S#cFSƒ#·ö–çFW"ÖWfVçG3¦æöæWÒç2Ö6ö÷&F–æFW7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒBÃg"“¶v£‡‡Òç2Ö6ö÷&F–æFW2–çWG·v–GFƒ£WÒç2Ö7F–öç7¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶Ö&v–â×F÷£'‡Òç2ÖW'&÷'¶6öÆ÷#§f"‚ÒÖFævW"—Òç2×fW&–g—¶Ö&v–â×F÷£#‡Òç2×WÆöBÖæ÷FW¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÔÖVF–†Ö‚×v–GFƒ£S#‚—²ç2×&Vv–öç7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç2Ö6ö÷&F–æFW7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g'×Ö°¢7G–ÆRçFW‡D6öçFVçB³Òrç2×66÷W¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£gƒ¶Ö&v–ã£#G‚Òç2×66÷RÆVvVæG¶föçB×6—¦S£gƒ¶föçB×vV–v‡C£cÒç2×66÷R6VÆV7G¶F—7Æ“¦&Æö6³·FF–æs£ƒ·v–GFƒ£S¶Ö&v–ã£‡‚¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶6öÆ÷#§f"‚Ò×FW‡B“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡‡Òç2×VW7F–öâ×–6·7¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶v£‡‚#‡Òç2×VW7F–öâ×–6·5¶†–FFVå×¶F—7Æ“¦æöæWÒç2×fW&–g“æƒ7¶föçB×6—¦S£#'‡Òs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°¢f"7&÷7G–ÆSÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“¶7&÷7G–ÆRçFW‡D6öçFVçCÒrç2×&Vv–öç¶Ö&v–ã£Òç2×&Wf–Ww¶F—7Æ“¦&Æö6³·v–GFƒ£S·FF–æs£¶&÷&FW#£¶&6¶w&÷VæC§v†—FS¶7W'6÷#§¦ööÒÖ–ã·FW‡BÖÆ–vã¦ÆVgC¶&÷&FW"×&F—W3£gƒ¶÷fW&fÆ÷s¦†–FFVçÒç2Ö7&÷¶Ö‚Ö†V–v‡C¦æöæWÒç2×&Vv–öâf–v6F–öç¶föçB×vV–v‡C£cÒç2×VæÆö6FVG·FF–æs£Gƒ¶&÷&FW#£‚F6†VBf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£ƒ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç2×VæÆö6FVB¶6öÆ÷#§f"‚ÒÖ66VçB—Òç2×VæÆö6FVB¶Æ–æRÖ†V–v‡C£ãwÒç2ÖVæÆ&vW¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ·v–GFƒ¦Ö–âƒ“c‚Ã“Ggr“¶Ö‚Ö†V–v‡C£“fƒ¶÷fW&fÆ÷s¦WFó·FF–æs£‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£Gƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡B—Òç2ÖVæÆ&vS£¦&6¶G&÷¶&6¶w&÷VæC¢3s#33“—Òç2ÖVæÆ&vR†VFW'¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ¶Ö&v–âÖ&÷GFöÓ£Gƒ·÷6—F–öã§7F–6·“·F÷¢Ó‡ƒ·FF–æs£‚¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“·¢Ö–æFWƒ£Òç2ÖVæÆ&vRç2Ö7&÷¶Ö‚Ö†V–v‡C¦æöæWÒç2ÖVæÆ&vRç"Ö'WGFöç¶fÆWƒ¦æöæWÔÖVF–†Ö‚×v–GFƒ£S#‚—²ç2×&Vv–öç·FF–æs£—‡Òç2ÖVæÆ&vW·FF–æs£'‡Òç2ÖVæÆ&vR†VFW'·F÷¢Ó'‡×Òs¶Fö7VÖVçBæ†VBæVæD6†–ÆB†7&÷7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒW"×&Wf–WrÖ‡V"æ§2ÓÓÓÓÒ¢ğ¢ò¢öæRW"v÷&·76S¢WÆöBÂ6†V6²VW7F–öç2ÂF†Vâ&VB&VÆFVB&W÷'G2â¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢gVæ7F–öâVçG'”öæÇ’‚’²&WGW&âv–æF÷rå66÷&UW$VçG'”öæÇ’ÓÓÒG'VS²Ğ¢f"W62ÒgVæ7F–öâ‡2’²&WGW&âW66T‡FÖÂ…7G&–ær‡2ÓÒçVÆÂòrr¢2’“²Ó°¢f"æÖW2Ò²7G&VæwF‡3¢~h›îX{®X®[é~Z[Şy¨NYËik’rÂF–ff–7VÇG“¢~yÈ¾hx.Šù^XÛ~™«îYÊY:®˜xÂrÂ6W6W3¢~XˆniéK‹®K¸K˜KŠ.XˆbrÂ6öÇWF–öç3¢~Šë.kˆ^X[>™JîŠz>š)jÚ^šªBrÂ&7F–6S¢~yIşh‰™(Zûh
~{¸>KšrÂGFW&ç3¢~h›îX{®ZI®˜>š)y¨NX[YÎx›x+’rÂÆã¢~Zèhé.hê^Kˆ¾iÚ^y¨NZHŞKšrÓ°¢f"Æ&VÇ2Ò²'Vææ–æs¢~XˆniéKŠÒrÂW6VC¢~Xúş{º~{ºÒrÂ7V66VVFVC¢~[{.ZèÎh‰rÂf–ÆVC¢~[è^h.ZHÒrÂG&gC¢~‹XNiiˆØz‹òrÓ°¢f"7G‚Â&ö÷BÂvVæW&F–öâÒÂ&÷w2ÒµÒÂG&gG2ÒµÒÂÖ÷&RÒfÇ6RÂ÷&–v–âÒçVÆÂÂ6VVBÒçVÆÂÂ6VÆV7F–öâÒçVÆÂÂ7F—fTVF—F÷"ÒçVÆÂÂVæF–ætæÇ—6—2ÒçVÆÂÂW"ÒçVÆÂÂ&WVW7EfW'6–öâÒ°¢gVæ7F–öâÆVfTVF—F÷"‚’²–b†7F—fTVF—F÷"bb7F—fTVF—F÷"æ6äÆVfRbb7F—fTVF—F÷"æ6äÆVfR‚’’&WGW&âfÇ6S²–b†7F—fTVF—F÷"bb7F—fTVF—F÷"æF—7÷6R’7F—fTVF—F÷"æF—7÷6R‚“²7F—fTVF—F÷"ÒçVÆÃ²&WGW&âG'VS²Ğ¢f"f–ÇFW'2Ò²7V&¦V7C¢rrÂW†Õö–C¢rrÂ7FGW3¢rrÂ6V&6ƒ¢rrÓ°¢gVæ7F–öâW6W"‚’²&WGW&â7G&–ær‡7FFRçW6W"bb7FFRçW6W"æ–BÇÂrr“²Ğ¢gVæ7F–öâ6öçFW‡B‚’²&WGW&â²W6W#¢W6W"‚’ÂFö¶Vã¢7FFRçFö¶VâÓ²Ğ¢gVæ7F–öâ’†7F–öâÂ&öG’’²&WGW&âv–æF÷rå66÷&UW%&Wf–Wræ’†7G‚Â7F–öâÂ&öG’“²Ğ¢gVæ7F–öâ'WGFöâ†Æ&VÂÂ7F–öâÂ&–Ö'’’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâr²‡&–Ö'’òw"×&–Ö'’r¢rr’²r"FFÖ‡V#Ò"r²7F–öâ²r#âr²Æ&VÂ²sÂö'WGFöãâs²Ğ¢gVæ7F–öâW†×2‚’²&WGW&â7FFRæW†×2ÇÂµÓ²Ğ¢gVæ7F–öâW†ÔæÖR†–B’²f"RÒW†×2‚’æf–æB†gVæ7F–öâ†R’²&WGW&âRæ–BÓÓÒ–C²Ò“²&WGW&âRòRææÖR¢–Bò~[{.X[>ˆNˆ>ŠùRr¢~iÊ®X[>ˆNˆ>ŠùRs²Ğ¢gVæ7F–öâW†Ô÷F–öç2†–BÂ7V&¦V7B’²&WGW&âsÆ÷F–öâfÇVSÒ"#îi¨.KˆŞX[>ˆNˆ>ŠùSÂö÷F–öãâr²W†×2‚’æf–ÇFW"†gVæ7F–öâ†R’²&WGW&â7V&¦V7BÇÂRç66÷&W2bbRç66÷&W5·7V&¦V7EÓ²Ò’æÖ†gVæ7F–öâ†R’²&WGW&âsÆ÷F–öâfÇVSÒ"r²W62†Ræ–B’²r"r²†–BÓÓÒRæ–Bòw6VÆV7FVBr¢rr’²sâr²W62†RææÖR²r+rr²RæW†ÕöFFR’²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr“²Ğ¢gVæ7F–öâ7V&¦V7G2‚’²&WGW&â'&’æg&öÒ†æWr6WB…²~ŠúŞihrrÂ~i[ZÚbrÂ~ˆ»ŠúÒrÂ~xšybrÂ~XÉnZÚbrÂ~yIşxš’rÂ~iKşk+²rÂ~XènXû"rÂ~YËybuÒæ6öæ6B†W†×2‚’æfÆDÖ†gVæ7F–öâ†R’²&WGW&âö&¦V7Bæ¶W—2†Rç66÷&W2ÇÂ·Ò“²Ò’Â&÷w2æÖ†gVæ7F–öâ‡"’²&WGW&â"ç7V&¦V7C²Ò’’’“²Ğ¢gVæ7F–öâæf–vF–öâ‚’°¢f"6VÆV7FVBÒ7FFRææÇ—6—5F"ÓÓÒv’ròwW'2r¢7FFRææÇ—6—5F"ÇÂw7FG2rÂÆ&VÇ2Ò²7FG3¢~h‰{ºXˆniérÂG—W3¢~š)Yè¾XˆniérÂW'3¦VçG'”öæÇ’‚“ò~Šù^š)[Ù^XZRs¢~Šù^XÛ~ZHŞy¹‚rÓ°¢&WGW&âsÆæb6Æ73Ò'‚×F'2"&–ÖÆ&VÃÒ.XˆniéXˆn{²#âr²ö&¦V7Bæ¶W—2†Æ&VÇ2’æÖ†gVæ7F–öâ†²—·&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"&–×&W76VCÒ"r²‡6VÆV7FVCÓÓÖ²’²r"FFÖæÇ—6—2×F#Ò"r¶²²r#âr¶Æ&VÇ5¶µÒ²sÂö'WGFöãâs·Ò’æ¦ö–â‚rr’²sÂöæcâs°¢Ğ¢gVæ7F–öâF'2†æöFR’²–b†æöFR’æöFRæ–ç6W'DF¦6VçD…DÔÂ‚vgFW&&Vv–ârÂæf–vF–öâ‚’“²Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÂgVæ7F–öâ†R’°¢f"#ÖRçF&vWBæ6Æ÷6W7B‚u¶FFÖæÇ—6—2×F%Òr“²–b‚"ÇÂÆVfTVF—F÷"‚’—&WGW&ã°¢7FFRææÇ—6—5F#Ö"æFF6WBææÇ—6—5F#²6VÆV7F–öãÖçVÆÃ²6VVCÖçVÆÃ²&VæFW%vR‚“°¢Ò“°¢gVæ7F–öâæÇ—¦U&V6÷&B‡&÷r’°¢–b†VçG'”öæÇ’‚’’²æ÷FR‚~Šù^XÛ~Xˆniéi¨.iÊ®[ÈiKîûÈÎXúş{º~{ºŞjZûY(ÎKùŞZÙŠù^š)8"r“²&WGW&ã²Ğ¢–b‚ÆVfTVF—F÷"‚’’&WGW&ã°¢7FFRææÇ—6—5F#ÒwW'2s²6VÆV7F–öãÖçVÆÃ²6†VÆÂ‚“·&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö†VFW"r’æ†–FFVã×G'VS°¢&öG’‚’æ–ææW$…DÔÂÒW$æf–vF–öâ‚w&W÷'G2r’²sÆF—b6Æ73Ò'‚ÖæÇ—6—2×6WGW#ãÂöF—câs°¢v–æF÷rå66÷&UW%&V6÷&G2æ6öæf–wW&R†&öG’‚’çVW'•6VÆV7F÷"‚rç‚ÖæÇ—6—2×6WGWr’Â&÷rÂ²“¦’À¢W6W#¦7G‚çW6W"Â÷Vã¦7–æ2gVæ7F–öâ†–B—¶v—B÷Vâ†–B“·ÒÀ¢7F'FVC¦7–æ2gVæ7F–öâ†–B—¶v—B÷Vâ†–B“·ÒÒ“°¢v–æF÷rç67&öÆÅFòƒÃ“°¢Ğ¢gVæ7F–öâæ÷FR‡2’²f"VÂÒ&ö÷Bbb&ö÷BçVW'•6VÆV7F÷"‚rç‚ÖÖW76vRr“²–b†VÂ’VÂçFW‡D6öçFVçBÒ2ÇÂrs²Ğ¢gVæ7F–öâ6†VÆÂ‚’°¢&ö÷Bæ–ææW$…DÔÂÒsÆF—b6Æ73Ò'‚×v÷&·76R#ãÆ†VFW"6Æ73Ò'‚Ö†VFW"#ãÆF—cãÇ7â6Æ73Ò'"ÖW–V'&÷r#îZÚnKšZHŞy¹ƒÂ÷7ããÆƒâr²~Šù^XÛ~ZHŞy¹‚r²sÂöƒãÇâr²~Kˆ®KÊŠù^XÛ~ûÈÎjZû[é~XˆnûÈÎiú^yÈ¾š)Yè¾ŠxëY(Â’Xˆnié8"r²sÂ÷ãÂöF—cãÆF—câr²†÷&–v–âbb÷&–v–âæÖöFÂæ—46öææV7FVBò'WGFöâ‚~‹ùNY¹îjÚ>YÊ{Én‹éy¨Nˆ>ŠùRrÂw&WGW&âr’¢rr’²'WGFöâ‚~Kˆ®KÊŠù^XÛrrÂvæWrrÂG'VR’²sÂöF—cãÂö†VFW#ãÆF—b6Æ73Ò'‚ÖÖW76vR"&öÆSÒ'7FGW2"&–ÖÆ—fSÒ'öÆ—FR#ãÂöF—cãÆF—b6Æ73Ò'‚Ö&öG’#ãÂöF—cãÂöF—câs°¢F'2‡&ö÷Bæf—'7DVÆVÖVçD6†–ÆB“°¢–b†VçG'”öæÇ’‚’’°¢&ö÷BçVW'•6VÆV7F÷"‚rç"ÖW–V'&÷rr’çFW‡D6öçFVçCÒ~Šù^š)‹XNii’s°¢&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö†VFW"ƒr’çFW‡D6öçFVçCÒ~Šù^š)[Ù^XZRs°¢&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö†VFW"r’çFW‡D6öçFVçCÒ~Šû¾Xùnš)yºî8KÙÎzÙNY(Î[{.iÈh›iKXˆnûÈÎzîŠêNYîKùŞZÙ8"s°¢Ğ¢&ö÷BçVW'•6VÆV7F÷"‚rç‚×v÷&·76Rr’æöæ6Æ–6²Ò7–æ2gVæ7F–öâ†R’°¢f""ÒRçF&vWBæ6Æ÷6W7B‚u¶FFÖ‡V%Òr“²–b‚"’&WGW&ã°¢G'’°¢–b‚õâ†æWwÆÆ—7GÇ&WGW&çÆ÷Vã§ÆG&gC§ÇW"Ò’òçFW7B†"æFF6WBæ‡V"’bbÆVfTVF—F÷"‚’’&WGW&ã°¢–b†"æFF6WBæ‡V"ÓÓÒvæWrr’²6VÆV7F–öâÒçVÆÃ²6VVBÒçVÆÃ²7FFRææÇ—6—5F#ÒwW'2s²6†VÆÂ‚“²v—B7&VFR‚“²Ğ¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒvÆ—7Br’²W#ÖçVÆÃ²v—BÆ—7B‚“²Ğ¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒwW"×&V6÷&BrbbW"bbW"ç&V6÷&B’v—B÷Vâ‡W"ç&V6÷&Bç&WVW7Eö–B“°¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒwW"×&W÷'G2rbbW"’6†÷u&W÷'G2‚“°¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒwW"ÖÖ÷&R×&W÷'G2rbbW"’v—BÖ÷&U&W÷'G2‚“°¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒwW"ÖæÇ—¦RrbbW"bbW"ç&V6÷&B’æÇ—¦U&V6÷&B‡W"ç&V6÷&B“°¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒvÖ÷&Rr’v—BÆ—7B‡G'VR“°¢VÇ6R–b†"æFF6WBæ‡V"ÓÓÒw&WGW&âr’²÷&–v–âæÖöFÂç7G–ÆRæF—7Æ’Òrs²7FFRçvRÒ÷&–v–âç&Wf–÷W5vRÇÂvW†×2s²7FFRææÇ—6—5F"Òv’s²&VæFW%vR‚“²Ğ¢VÇ6R–b†"æFF6WBæ‡V"ç7F'G5v—F‚‚v÷Vã¢r’’v—B÷Vâ†"æFF6WBæ‡V"ç6Æ–6RƒR’“°¢VÇ6R–b†"æFF6WBæ‡V"ç7F'G5v—F‚‚vG&gC¢r’’v—B7&VFR†G&gG2æf–æB†gVæ7F–öâ‡"’²&WGW&â"ç&WVW7Eö–BÓÓÒ"æFF6WBæ‡V"ç6Æ–6Rƒb“²Ò’“°¢VÇ6R–b†"æFF6WBæ‡V"ç7F'G5v—F‚‚vFVÆWFRÖG&gC¢r’bb6öæf—&Ò‚~XŠ™šN‹ùK»Ş‹XNiiˆØz‹şXø®hš¾høşK»nûÉòr’’²"æF—6&ÆVBÒG'VS²v—B’‚vFVÆWFUöG&gBrÂ²&WVW7Eö–C¢"æFF6WBæ‡V"ç6Æ–6Rƒ2’Ò“²v—BÆ—7B‚“²Ğ¢Ò6F6‚†W'"’²æ÷FR†W'"æÖW76vR“²Òf–æÆÇ’²–b†"æ—46öææV7FVB’"æF—6&ÆVBÒfÇ6S²Ğ¢Ó°¢Ğ¢gVæ7F–öâ&öG’‚’²&WGW&â&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö&öG’r“²Ğ¢gVæ7F–öâ6÷W&6T–B‡"’²&WGW&â"ç6÷W&6U÷&V6÷&Bbb"ç6÷W&6U÷&V6÷&Bç&WVW7Eö–BÇÂ"ç&W7VÇBbb"ç&W7VÇBç6÷W&6U÷&V6÷&Bbb"ç&W7VÇBç6÷W&6U÷&V6÷&Bç&WVW7Eö–BÇÂ"ç&WVW7Eö–C²Ğ¢gVæ7F–öâ—5&V6÷&B‡"’²&WGW&â"æ÷F–öç2bb"æ÷F–öç2çW'÷6RÓÓÒw&V6÷&Bs²Ğ¢gVæ7F–öâ&VæFW$6&G2‚’°¢f"†÷7BÒ&ö÷BçVW'•6VÆV7F÷"‚rç‚ÖÆ—7Br“²–b‚†÷7B’&WGW&ã°¢f"w&÷W2ÒæWrÖ‚“°¢G&gG2æf÷$V6‚†gVæ7F–öâ†B—¶–b‚‚f–ÇFW'2ç7V&¦V7BÇÂBç7V&¦V7CÓÓÖf–ÇFW'2ç7V&¦V7B’bb‚f–ÇFW'2æW†Õö–BÇÂBæW†Õö–CÓÓÖf–ÇFW'2æW†Õö–B’–w&÷W2ç6WB†Bç&WVW7Eö–BÇ·&V6÷&C¤ö&¦V7Bæ76–vâ‡·ÒÆBÇ·7FGW3¢vG&gBwÒ’Ç&W÷'G3¥µ×Ò“·Ò“°¢&÷w2æf÷$V6‚†gVæ7F–öâ‡"—¶–b†VçG'”öæÇ’‚’bb—5&V6÷&B‡"’—&WGW&ã·f"–C×6÷W&6T–B‡"’ÆsÖw&÷W2ævWB†–B—ÇÇ·&V6÷&C¦çVÆÂÇ&W÷'G3¥µ×Ó¶–b†—5&V6÷&B‡"’–rç&V6÷&C×#¶VÇ6R–b‚rç&W÷'G2ç6öÖR†gVæ7F–öâ†—·&WGW&âç&WVW7Eö–CÓÓ×"ç&WVW7Eö–C·Ò’–rç&W÷'G2çW6‚‡"“¶w&÷W2ç6WB†–BÆr“·Ò“°¢f"6&G3Ô'&’æg&öÒ†w&÷W2çfÇVW2‚’’æÖ†gVæ7F–öâ†r—°¢rç&W÷'G2ç6÷'B†gVæ7F–öâ†Æ"—·&WGW&â7G&–ær†"æ7&VFVEöB’æÆö6ÆT6ö×&R…7G&–ær†æ7&VFVEöB’“·Ò“°¢f"ÆFW7CÖrç&W÷'G5³ÒÇ#Örç&V6÷&GÇÆÆFW7C°¢f"7W'&VçCÖÆFW7Bbb²w'Vææ–ærrÂwW6VBrÂvf–ÆVBuÒæ–æ6ÇVFW2†ÆFW7Bç7FGW2“öÆFW7C§#°¢f"7FGW3Ö7W'&VçBç7FGW3ÓÓÒvG&gBsò~[è^ŠønXŠ²s¦7W'&VçBç7FGW3ÓÓÒw'Vææ–ærsò†—5&V6÷&B†7W'&VçB“ò~ŠønXŠ¾KŠÒs¢~XˆniéKŠÒr“¦7W'&VçBç7FGW3ÓÓÒwW6VBsò~[è^{º~{ºÒs¦7W'&VçBç7FGW3ÓÓÒvf–ÆVBsò~[è^h.ZHÒs¦ÆFW7Cò~Xˆnié[{.ZèÎh‰s¢~[{.[Ù^XZRs°¢f"F&vWCÖ7W'&VçBç7FGW3ÓÓÒvG&gBsö7W'&VçBç&WVW7Eö–C¦ÆFW7CöÆFW7Bç&WVW7Eö–C§"ç&WVW7Eö–C°¢f"7F–öãÖ7W'&VçBç7FGW3ÓÓÒvG&gBsò~{º~{ºŞKˆ®KÊs¥²w'Vææ–ærrÂwW6VBrÂvf–ÆVBuÒæ–æ6ÇVFW2†7W'&VçBç7FGW2“ò~iú^yÈ¾‹ù¾[ªbò{º~{ºÒs¦ÆFW7Cò~iú^yÈ¾hª^Y¢s¢~jZûŠù^š)‚s°¢&WGW&â¶s¦rÇ&÷s§"Ç7FGW3§7FGW2ÇF&vWC§F&vWBÆ7F–öã¦7F–öâÆ7W'&VçC¦7W'&VçGÓ°¢Ò’æf–ÇFW"†gVæ7F–öâ†2—·&WGW&â‚f–ÇFW'2ç7FGW2ÇÂ2æ7W'&VçBç7FGW3ÓÓÖf–ÇFW'2ç7FGW2’bb‚f–ÇFW'2ç6V&6‚ÇÂ¶2ç&÷rçF—FÆRÆ2ç&÷rç7V&¦V7BÆW†ÔæÖR†2ç&÷ræW†Õö–B•Òæ¦ö–â‚rr’çFôÆ÷vW$66R‚’æ–æ6ÇVFW2†f–ÇFW'2ç6V&6‚çFôÆ÷vW$66R‚’’“·Ò“°¢†÷7Bæ–ææW$…DÔÂÒ6&G2æÆVæwF‚ò6&G2æÖ†gVæ7F–öâ†2—·f"#Ö2ç&÷s·&WGW&âsÆ'F–6ÆR6Æ73Ò'‚Ö6&B#ãÆF—b6Æ73Ò'‚Ö6&B×F÷#ãÇ7â6Æ73Ò'‚×7V&¦V7B#âr¶W62‡"ç7V&¦V7B’²sÂ÷7ããÇ7â6Æ73Ò'‚×7FGW2#âr¶W62†2ç7FGW2’²sÂ÷7ããÂöF—cãÆƒ3âr¶W62‡"çF—FÆWÇÆW†ÔæÖR‡"æW†Õö–B’²r+rr·"ç7V&¦V7B’²sÂöƒ3ãÇâr¶W62†W†ÔæÖR‡"æW†Õö–B’’²sÂ÷ãÇ6ÖÆÃâr¶W62†æWrFFR‡"æ7&VFVEöB’çFôÆö6ÆU7G&–ær‚w¦‚Ô4âr’’²†2ærç&W÷'G2æÆVæwFƒòr+rr¶2ærç&W÷'G2æÆVæwF‚²rK»Ş[{.Xª‹ÛŞhª^Y¢s¢rr’²sÂ÷6ÖÆÃâr²†2æ7W'&VçBç&öw&W72bb2æ7W'&VçBç7FGW2ÓÒw7V66VVFVBsòsÇ6Æ73Ò'‚×&öw&W72#âr¶W62†2æ7W'&VçBç&öw&W72æÖW76vWÇÂ~‹ù¾[ªn[{.KùŞZÙ‚r’²sÂ÷âs¢rr’²sÆfö÷FW#âr¶'WGFöâ†2æ7F–öâÂ†2æ7W'&VçBç7FGW3ÓÓÒvG&gBsòvG&gC¢s¢v÷Vã¢r’¶2çF&vWBÇG'VR’²†2ærç&V6÷&Bbb2ærç&W÷'G2æÆVæwFƒö'WGFöâ‚~Šù^š)Kˆî[é~XˆbrÂv÷Vã¢r¶2ærç&V6÷&Bç&WVW7Eö–B“¢rr’²‡"ç7FGW3ÓÓÒvG&gBsö'WGFöâ‚~XŠ™šNˆØz‹òrÂvFVÆWFRÖG&gC¢r·"ç&WVW7Eö–B“¢rr’²sÂöfö÷FW#ãÂö'F–6ÆSâs·Ò’æ¦ö–â‚rr’¢sÆF—b6Æ73Ò'‚ÖV×G’#ãÆƒ3âr²†f–ÇFW'2ç7V&¦V7GÇÆf–ÇFW'2æW†Õö–GÇÆf–ÇFW'2ç7FGW7ÇÆf–ÇFW'2ç6V&6ƒò~k*iÈzÊnYiÚK»ny¨NŠù^XÛrs¢~K¸îKˆ[ÊŠù^XÛ~[ÈZx²r’²sÂöƒ3ãÇîKˆ®KÊŠù^XÛ~KˆîKÙÎzÙNûÈÎjZûYîXúşiú^yÈ¾š)Yè¾ŠxëûÈÎK™şXúşKº^zˆŞYîXhŞyIşh‰’Xˆnié8#Â÷âr¶'WGFöâ‚~Kˆ®KÊŠù^XÛrrÂvæWrrÇG'VR’²sÂöF—câs°¢&ö÷BçVW'•6VÆV7F÷"‚rç‚ÖÖ÷&Rr’æ–ææW$…DÔÃÖÖ÷&Sö'WGFöâ‚~Xª‹ÛŞi»NZI®Šù^XÛrrÂvÖ÷&Rr“¢rs°¢–b†VçG'”öæÇ’‚’bf†÷7BçVW'•6VÆV7F÷"‚rç‚ÖV×G’r’–†÷7BçVW'•6VÆV7F÷"‚rç‚ÖV×G’r’çFW‡D6öçFVçCÒ~Kˆ®KÊŠù^XÛ~KˆîKÙÎzÙNûÈÎjZûYîKùŞZÙŠù^š)ûÈÎ[›ni»Nikš)Yè¾[é~Xˆn8"s°¢Ğ¢7–æ2gVæ7F–öâÆ—7B†VæB’°¢6VÆV7F–öâÒçVÆÃ²6VVBÒçVÆÃ²W"ÒçVÆÃ²&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö†VFW"r’æ†–FFVãÖfÇ6S·f"fW'6–öãÒ²·&WVW7EfW'6–öã°¢–b‚VæB’°¢&öG’‚’æ–ææW$…DÔÂÒsÆFWF–Ç26Æ73Ò'‚ÖÆ—7BÖf–ÇFW'2#ãÇ7VÖÖ'“îzÙ¾˜Šù^XÛsÂ÷7VÖÖ'“ãÆF—b6Æ73Ò'‚Öf–ÇFW'2#ãÆÆ&VÃîzyyºãÇ6VÆV7BFFÖf–ÇFW#Ò'7V&¦V7B#ãÆ÷F–öâfÇVSÒ"#îXZ˜:zyyºãÂö÷F–öãâr²7V&¦V7G2‚’æÖ†gVæ7F–öâ‡2’²&WGW&âsÆ÷F–öâr²†f–ÇFW'2ç7V&¦V7BÓÓÒ2òw6VÆV7FVBr¢rr’²sâr²W62‡2’²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃîˆ>ŠùSÇ6VÆV7BFFÖf–ÇFW#Ò&W†Õö–B#âr²W†Ô÷F–öç2†f–ÇFW'2æW†Õö–B’ç&WÆ6R‚~i¨.KˆŞX[>ˆNˆ>ŠùRrÂ~XZ˜:ˆ>ŠùRr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃîx«nhÇ6VÆV7BFFÖf–ÇFW#Ò'7FGW2#ãÆ÷F–öâfÇVSÒ"#îXZ˜:x«nhÂö÷F–öãâr²ö&¦V7Bæ¶W—2†Æ&VÇ2’æf–ÇFW"†gVæ7F–öâ†²’²&WGW&â²ÓÒvG&gBs²Ò’æÖ†gVæ7F–öâ†²’²&WGW&âsÆ÷F–öâfÇVSÒ"r²²²r"r²†f–ÇFW'2ç7FGW2ÓÓÒ²òw6VÆV7FVBr¢rr’²sâr²Æ&VÇ5¶µÒ²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃîi	Î{J.[{.Xª‹ÛŞŠë[ÙSÆ–çWBFF×6V&6‚fÇVSÒ"r²W62†f–ÇFW'2ç6V&6‚’²r"Æ6V†öÆFW#Ò.Šù^XÛ~YŞz{8zyyºîh‰nˆ>ŠùR#ãÂöÆ&VÃâr²'WGFöâ‚~X‹~ikrÂvÆ—7Br’²sÂöF—cãÂöFWF–Ç3ãÆF—b6Æ73Ò'‚ÖÆ—7B"&–ÖÆ—fSÒ'öÆ—FR#îjÚ>YÊŠû¾XùnŠù^XÛ~(
cÂöF—cãÆF—b6Æ73Ò'‚ÖÖ÷&R#ãÂöF—câs°¢&öG’‚’çVW'•6VÆV7F÷$ÆÂ‚u¶FFÖf–ÇFW%Òr’æf÷$V6‚†gVæ7F–öâ†VÂ’²VÂæöæ6†ævRÒgVæ7F–öâ‚’²f–ÇFW'5¶VÂæFF6WBæf–ÇFW%ÒÒVÂçfÇVS²Æ—7B‚’æ6F6‚†gVæ7F–öâ†R’²æ÷FR†RæÖW76vR“²Ò“²Ó²Ò“°¢&öG’‚’çVW'•6VÆV7F÷"‚u¶FF×6V&6…Òr’æöæ–çWBÒgVæ7F–öâ†R’²f–ÇFW'2ç6V&6‚ÒRçF&vWBçfÇVS²&VæFW$6&G2‚“²Ó°¢Ğ¢f"vVâÒvVæW&F–öã²æ÷FR‚rr“°¢G'’²f"FFÒv—B’‚vÆ—7EöÆÂrÂö&¦V7Bæ76–vâ‡·ÒÂf–ÇFW'2Â²öfg6WC¢VæBò&÷w2æÆVæwF‚¢Â7FGW3¢rrÒ’“²–b†vVâÓÒvVæW&F–öâÇÂfW'6–öâÓ×&WVW7EfW'6–öâÇÂ&ö÷Bæ—46öææV7FVB’&WGW&ã²&÷w2ÒVæBò&÷w2æ6öæ6B†FFç&Wf–Ww2æf–ÇFW"†gVæ7F–öâ‡"—·&WGW&â&÷w2ç6öÖR†gVæ7F–öâ†öÆB—·&WGW&âöÆBç&WVW7Eö–CÓÓ×"ç&WVW7Eö–C·Ò“·Ò’’¢FFç&Wf–Ww3²–b‚VæB’G&gG2ÒFFæG&gG2ÇÂµÓ²Ö÷&RÒFFæ†5öÖ÷&S²&VæFW$6&G2‚“²Ğ¢6F6‚†R’²æ÷FR†RæÖW76vR“²f"VÂÒ&ö÷BçVW'•6VÆV7F÷"‚rç‚ÖÆ—7Br“²–b†VÂ’VÂæ–ææW$…DÔÂÒsÇîŠë[Ù^Šû¾XùniÊ®ZèÎh‰ûÈÎŠû~x+X{¾X‹~ik˜xŞŠù^8#Â÷âs²Ğ¢Ğ¢gVæ7F–öâ÷F–öå6VÆV7B†¶W’ÂÆ&VÂÂfÇVW2Â6†÷6Vâ’²&WGW&âsÆÆ&VÃâr²Æ&VÂ²sÇ6VÆV7BæÖSÒ"r²¶W’²r#âr²ö&¦V7Bæ¶W—2‡fÇVW2’æÖ†gVæ7F–öâ†²’²&WGW&âsÆ÷F–öâfÇVSÒ"r²²²r"r²…7G&–ær†6†÷6Vâ’ÓÓÒ²òw6VÆV7FVBr¢rr’²sâr²fÇVW5¶µÒ²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃâs²Ğ¢gVæ7F–öâ6†ö–6R†æÖRÂfÇVRÂF—FÆRÂFW67&—F–öâÂ6VÆV7FVBÂG—R’°¢&WGW&âsÆÆ&VÂ6Æ73Ò'‚Ö6†ö–6R#ãÆ–çWBG—SÒ"r²‡G—RÇÂw&F–òr’²r"æÖSÒ"r²æÖR²r"fÇVSÒ"r²W62‡fÇVR’²r"r²‡6VÆV7FVBòv6†V6¶VBr¢rr’²sãÇ7ããÇ7G&öæsâr²F—FÆR²sÂ÷7G&öæsãÇ6ÖÆÃâr²FW67&—F–öâ²sÂ÷6ÖÆÃãÂ÷7ããÂöÆ&VÃâs°¢Ğ¢gVæ7F–öâ7FW†âÂF—FÆRÂFW67&—F–öâ’²&WGW&âsÆF—b6Æ73Ò'‚×7FW#ãÇ7ãâr²â²sÂ÷7ããÆF—cãÆƒ3âr²F—FÆR²sÂöƒ3ãÇâr²FW67&—F–öâ²sÂ÷ãÂöF—cãÂöF—câs²Ğ¢7–æ2gVæ7F–öâ7&VFR†G&gB’°¢&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö†VFW"r’æ†–FFVã×G'VS°¢f"vVãÖvVæW&F–öâÂFFÖG&gBÇÂ6VVBÇÂ·ÒÂ÷G3Ôö&¦V7Bæ76–vâ‡·ÒÆFFæ÷F–öç2ÇÂ·Ò’Â6VÆV7FVE7V&¦V7CÖFFç7V&¦V7BÇÂrs°¢6VÆV7F–öãÖçVÆÃ°¢&öG’‚’æ–ææW$…DÔÃÒsÆF—b6Æ73Ò'‚Ö7&VFR#ãÆF—b6Æ73Ò'‚×6V7F–öâ×F—FÆR#ãÆF—cãÆƒ#âr²†G&gCò~{º~{ºŞŠù^š)[Ù^XZRs¢~Kˆ®KÊŠù^XÛrr’²sÂöƒ#ãÇîXXKˆ®KÊ[›nŠønXŠ¾ûÈÎjZûYîXúşKùŞZÙš)Yè¾[é~XˆnûÈÎK™şXúşKº^yIşh‰’Xˆnié8#Â÷ãÂöF—câr¶'WGFöâ‚~‹ùNY¹îŠù^XÛ~X‰~Š‚rÂvÆ—7Br’²sÂöF—cãÆf÷&Ò6Æ73Ò'‚Ö&6–72#âr·7FW‚srÂ~[Ù^XZ^Y:®[ÊŠù^XÛrrÂ~XúşKº^XX[Ù^XZ^ûÈÎK˜¾YîXhŞX[>ˆNˆ>Šù^8"r’²sÆF—b6Æ73Ò'‚Öf÷&ÒÖw&–B#ãÆÆ&VÃîzyyºãÆ–çWBæÖSÒ'7V&¦V7B"Æ—7CÒ'‚×7V&¦V7G2"Ö†ÆVæwFƒÒ#C"&WV—&VBÆ6V†öÆFW#Ò.Šû~˜hºh‰n‹é>XZ^zyyºâ"fÇVSÒ"r¶W62‡6VÆV7FVE7V&¦V7B’²r#ãÆFFÆ—7B–CÒ'‚×7V&¦V7G2#âr·7V&¦V7G2‚’æÖ†gVæ7F–öâ†â—·&WGW&âsÆ÷F–öâfÇVSÒ"r¶W62†â’²r#âs·Ò’æ¦ö–â‚rr’²sÂöFFÆ—7CãÂöÆ&VÃãÆÆ&VÃîX[>ˆNˆ>ŠùSÇ6VÆV7BæÖSÒ&W†Õö–B#âr¶W†Ô÷F–öç2†FFæW†Õö–BÇÂrrÇ6VÆV7FVE7V&¦V7B’²sÂ÷6VÆV7CãÂöÆ&VÃãÂöF—cãÆFWF–Ç26Æ73Ò'‚ÖæÖR#ãÇ7VÖÖ'“îŠù^XÛ~YŞz{Ç7âFF×F—FÆR×&Wf–WsãÂ÷7ããÂ÷7VÖÖ'“ãÆÆ&VÃîˆz®Zé®K˜YŞz{Æ–çWBæÖSÒ'F—FÆR"Ö†ÆVæwFƒÒ#"fÇVSÒ"r¶W62†FFçF—FÆRÇÂrr’²r"Æ6V†öÆFW#Ò.hÈˆ>Šù^Y(Îzyyºîˆz®XªYŞYÒ#ãÂöÆ&VÃãÂöFWF–Ç3âr²†FFæ÷&–v–äG&gCòsÇ6Æ73Ò'‚Ö†–çB#îKùŞZÙjÚ>YÊ{Én‹éy¨Nˆ>Šù^YîûÈÎŠù^š)KÉ®ˆz®XªX[>ˆN8#Â÷âs¢rr’²sÂöf÷&ÓãÆF—b6Æ73Ò'‚ÖVF—F÷"‚Ö7&VFRÖVF—F÷"#ãÂöF—cãÂöF—câs°¢f"&6–73Ö&öG’‚’çVW'•6VÆV7F÷"‚vf÷&Òr’Â3Ôö&¦V7Bæ76–vâ†6öçFW‡B‚’Ç¶†÷7C¦&öG’‚’çVW'•6VÆV7F÷"‚rç‚ÖVF—F÷"r’ÆG&gD–C¦FFæG&gEö–BÇÂv–æF÷rå66÷&UW%&Wf–WræG&gDf÷"‡W6W"‚’Âv‡V"r’Ç6W76–öç3§·ÒÇ6WGW§G'VRÆöä6Æ÷6S¦Æ—7GÒ“°¢–b†VçG'”öæÇ’‚’–&öG’‚’çVW'•6VÆV7F÷"‚rç‚×6V7F–öâ×F—FÆRr’çFW‡D6öçFVçCÒ~Šû¾Xùn[{.iÈXh^ZëûÈÎzîŠêNŠønXŠ¾{¹>iéÎYîKùŞZÙ8"s°¢gVæ7F–öâWFFR‚—°¢f"7V&¦V7CÖ&6–72æVÆVÖVçG2ç7V&¦V7BçfÇVRçG&–Ò‚“°¢2çF—FÆSÖ&6–72æVÆVÖVçG2çF—FÆRçfÇVRçG&–Ò‚’ÇÂ†&6–72æVÆVÖVçG2æW†Õö–BçfÇVSöW†ÔæÖR†&6–72æVÆVÖVçG2æW†Õö–BçfÇVR’²r+rs¢rr’²‡7V&¦V7BÇÂ~Šù^XÛrr’²r+rŠù^š)‚s°¢&6–72çVW'•6VÆV7F÷"‚u¶FF×F—FÆR×&Wf–WuÒr’çFW‡D6öçFVçCÖ2çF—FÆS°¢2æ÷F–öç3Ôö&¦V7Bæ76–vâ‡·ÒÆ÷G2Ç¶6öæf–u÷fW'6–öã£"ÇW'÷6S¢w&V6÷&BrÆÖöGVÆW3¥µÒÇ&Wf–Wuö&Vf÷&UöæÇ—6—3¦fÇ6RÆæÇ—6—5÷66÷S¢vÆÂrÇ6VÆV7FVE÷VW7F–öç3¥µÒÇW6Uö66÷VçEö†—7F÷'“¦fÇ6WÒ“°¢2æW†Ô–CÖ&6–72æVÆVÖVçG2æW†Õö–BçfÇVS¶2æW†ÓÖW†×2‚’æf–æB†gVæ7F–öâ†R—·&WGW&âRæ–CÓÓÖ2æW†Ô–C·Ò“¶2æW†Ô6öçFW‡C×VæFVf–æVC°¢Ğ¢&6–72æöç7V&Ö—CÖgVæ7F–öâ†R—¶Rç&WfVçDFVfVÇB‚“·Ó¶&6–72æöæ–çWC×WFFS°¢&6–72æVÆVÖVçG2ç7V&¦V7Bæöæ6†ævSÖgVæ7F–öâ‚—·f"–CÖ&6–72æVÆVÖVçG2æW†Õö–BçfÇVS¶&6–72æVÆVÖVçG2æW†Õö–Bæ–ææW$…DÔÃÖW†Ô÷F–öç2†–BÆ&6–72æVÆVÖVçG2ç7V&¦V7BçfÇVRçG&–Ò‚’“·WFFR‚“·Ó°¢2æ&Vf÷&U7V&Ö—CÖ7–æ2gVæ7F–öâ‚—¶–b‚&6–72ç&W÷'EfÆ–F—G’‚’—F‡&÷ræWrW'&÷"‚~Šû~XX˜hºzyyºâr“·WFFR‚“·&WGW&â&6–72æVÆVÖVçG2ç7V&¦V7BçfÇVRçG&–Ò‚“·Ó°¢2æöåWÆöCÖgVæ7F–öâ‚—·WFFR‚“·Ó¶2æöäæÇ—¦U&V6÷&CÖæÇ—¦U&V6÷&C¶2æöå&V6÷&FVCÖgVæ7F–öâ‡&÷r—¶÷Vâ‡&÷rç&WVW7Eö–B’æ6F6‚†gVæ7F–öâ†R—¶æ÷FR†RæÖW76vR“·Ò“·Ó°¢2æöåf–WsÖgVæ7F–öâ‡f–Wr—¶&6–72æ†–FFVã×f–WrÓÒwWÆöBs¶&öG’‚’çVW'•6VÆV7F÷"‚rç‚×6V7F–öâ×F—FÆRr’æ†–FFVã×f–WrÓÒwWÆöBs¶2æ†÷7Bæ6Æ74Æ—7BçFövvÆR‚w‚Ö7&VF–ærrÇf–WsÓÓÒwWÆöBr“·Ó°¢–b†G&gBbbFFçvW2—°¢æ÷FR‚~jÚ>YÊh.ZHŞ[{.KùŞZÙy¨Nhš¾høşK»n(
br“·f"6÷W&6SÖv—B’‚w6÷W&6W2rÇ·&WVW7Eö–C¦G&gBç&WVW7Eö–GÒ“°¢FFçvW3Öv—B&öÖ—6RæÆÂ‡6÷W&6RçvW2æÖ†7–æ2gVæ7F–öâ‡—·f"&W7öç6SÖv—BfWF6‚‡çW&Â“¶–b‚&W7öç6Ræö²—F‡&÷ræWrW'&÷"‚~hš¾høşK»nŠû¾XùnZK‹J^ûÈÎŠû~˜xŞŠùRr“·f"&W&VCÖv—Bv–æF÷rå66÷&UW%&Wf–Wrç&W&R†v—B&W7öç6Ræ&Æö"‚’“·&WGW&âö&¦V7Bæ76–vâ‡&W&VBÇ·&öÆS§ç&öÆRÆæÖS¢~zÊÂr·çvR²~šRwÒ“·Ò’“°¢Ğ¢–b†vVâÓÖvVæW&F–öâ—&WGW&ã°¢–b†FFçvW2–2ç6W76–öç5·6VÆV7FVE7V&¦V7EÓ×·vW3¦FFçvW2Çv÷&´öåW#¦FFçv÷&´öåW"Ó×VæFVf–æVCöFFçv÷&´öåW#¦÷G2çv÷&µöÆö6F–öâÓÒvæöæRrbf÷G2çv÷&µöÆö6F–öâÓÒw6W&FRrÇv÷&´Æö6F–öã¦÷G2çv÷&µöÆö6F–öâÆ6öç6VçC¦fÇ6RÇVæF–æs¦çVÆÂÆ6Æ÷VDG&gD–C¦G&gBbfG&gBç&WVW7Eö–GÓ°¢7F—fTVF—F÷#Ö3·WFFR‚“¶æ÷FR‚rr“·v–æF÷rå66÷&UW%&Wf–WræÖ÷VçB†2Ç6VÆV7FVE7V&¦V7BÆçVÆÂ“°¢Ğ¢gVæ7F–öâÖ÷VçB†FFÂ&W÷'D–B’°¢&ö÷BçVW'•6VÆV7F÷"‚rç‚Ö†VFW"r’æ†–FFVã×G'VS°¢6VÆV7F–öâÒ²FF¢FFÂ&W÷'D–C¢&W÷'D–BÓ²6VVBÒçVÆÃ²æ÷FR‚rr“°¢&öG’‚’æ–ææW$…DÔÂÒW$æf–vF–öâ†FFæ÷F–öç2bbFFæ÷F–öç2çW'÷6SÓÓÒw&V6÷&Bsòw&V6÷&Bs¢w&W÷'G2r’²sÆF—b6Æ73Ò'‚ÖVF—F÷"×FööÆ&"#ãÇ7ãâr²W62†FFçF—FÆRÇÂFFç7V&¦V7B²~Šù^XÛrr’²r+rr²W62†W†ÔæÖR†FFæW†Õö–B’’²sÂ÷7ãâr²‡&W÷'D–Bò'WGFöâ‚~X[>ˆNˆ>ŠùRòYŞz{rÂvÆ–æ²r’¢sÇ7â6Æ73Ò'"Ö×WFVB#îjøş‹Úâr²FFæ÷F–öç2çF–ÖUö'VFvWEöÖ–çWFW2²rXˆn™)ò+rr²†FFæ÷F–öç2çW'÷6RÓÓÒw&V6÷&Brò~Xú®[Ù^XZRr¢FFæ÷F–öç2æÖöGVÆW2æÆVæwF‚²ršXˆniér’’²sÂöF—cãÆF—b6Æ73Ò'‚ÖVF—F÷"#ãÂöF—câs°¢f"†÷7BÒ&öG’‚’çVW'•6VÆV7F÷"‚rç‚ÖVF—F÷"r’ÂW†ÒÒW†×2‚’æf–æB†gVæ7F–öâ†R’²&WGW&âRæ–BÓÓÒFFæW†Õö–C²Ò“°¢f"2Òö&¦V7Bæ76–vâ†6öçFW‡B‚’Â²†÷7C¢†÷7BÂW†Ó¢W†ÒÂW†Ô–C¢FFæW†Õö–BÇÂrrÂG&gD–C¢FFæG&gEö–BÂ6W76–öç3¢·ÒÂF—FÆS¢FFçF—FÆRÂ÷F–öç3¢FFæ÷F–öç2ÂW†Ô6öçFW‡C¢FFæW†Ô6öçFW‡BÂ–æ—F–Å&W÷'C¢&W÷'D–BÂöä6Æ÷6S¢Æ—7BÒ“°¢–b†FFçvW2’2ç6W76–öç5¶FFç7V&¦V7EÒÒ²vW3¢FFçvW2Âv÷&´öåW#¢G'VRÂ6öç6VçC¢fÇ6RÂVæF–æs¢çVÆÂÓ°¢–b†FFç&WVW7Eö–B’2ç6W76–öç5¶FFç7V&¦V7EÒæ6Æ÷VDG&gD–BÒFFç&WVW7Eö–C°¢2æöäæÇ—¦U&V6÷&BÒæÇ—¦U&V6÷&C°¢2æöå&V6÷&D6†ævSÖgVæ7F–öâ‡&÷r—¶–b‡W"bbW"ç&V6÷&BbbW"ç&V6÷&Bç&WVW7Eö–CÓÓ×&÷rç&WVW7Eö–B—W"ç&V6÷&C×&÷s·Ó°¢7F—fTVF—F÷"Ò3°¢v–æF÷rå66÷&UW%&Wf–WræÖ÷VçB†2ÂFFç7V&¦V7BÂçVÆÂ“°¢f"Æ–æ²Ò&öG’‚’çVW'•6VÆV7F÷"‚u¶FFÖ‡V#ÖÆ–æµÒr“²–b†Æ–æ²’Æ–æ²æöæ6Æ–6²ÒgVæ7F–öâ‚’°¢–b†7F—fTVF—F÷"bb7F—fTVF—F÷"æ6äÆVfRbb7F—fTVF—F÷"æ6äÆVfR‚’—&WGW&ã°¢f"æVÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚vf÷&Òr“²æVÂæ6Æ74æÖRÒw‚ÖÆ–æ²Öf÷&Òs²æVÂæ–ææW$…DÔÂÒsÆÆ&VÃîhª^Y®YŞz{Æ–çWBæÖSÒ'F—FÆR"Ö†ÆVæwFƒÒ#"fÇVSÒ"r²W62†FFçF—FÆRÇÂrr’²r#ãÂöÆ&VÃãÆÆ&VÃîX[>ˆNX‹ˆ>ŠùSÇ6VÆV7BæÖSÒ&W†Ò#âr²W†Ô÷F–öç2†FFæW†Õö–BÂFFç7V&¦V7B’²sÂ÷6VÆV7CãÂöÆ&VÃãÇ6Æ73Ò'"Ö×WFVB#îX[>ˆNyJK¨îi[NynŠë[Ù^ûÉ¾hª^Y®KùŞyY[ÈZx¾Xˆniéi{ny¨Nˆ>Šù^i[XÎ8#Â÷ãÆ'WGFöâ6Æ73Ò'"Ö'WGFöâ"×&–Ö'’"G—SÒ'7V&Ö—B#îKùŞZÙX[>ˆCÂö'WGFöãâs°¢Æ–æ²ç&WÆ6Uv—F‚‡æVÂ“²æVÂæöç7V&Ö—BÒ7–æ2gVæ7F–öâ†R’²Rç&WfVçDFVfVÇB‚“²G'’²v—B’‚vÆ–æ²rÂ²&WVW7Eö–C¢&W÷'D–BÂW†Õö–C¢æVÂæVÆVÖVçG2æW†ÒçfÇVRÇÂçVÆÂÂF—FÆS¢æVÂæVÆVÖVçG2çF—FÆRçfÇVRÒ“²v—B÷Vâ‡&W÷'D–B“²æ÷FR‚~X[>ˆN[{.KùŞZÙ‚r“²Ò6F6‚†W'"’²æ÷FR†W'"æÖW76vR“²ÒÓ°¢Ó°¢Ğ¢gVæ7F–öâW$æf–vF–öâ†7F—fR’°¢–b‚W"—&WGW&ârs°¢–b†VçG'”öæÇ’‚’—&WGW&âsÆF—b6Æ73Ò'‚×W"Ö&"#âr¶'WGFöâ‚~h˜iÈŠù^XÛrrÂvÆ—7Br’²sÇ7â6Æ73Ò'"Ö×WFVB#îŠù^š)Kˆî[é~XˆcÂ÷7ããÂöF—câs°¢&WGW&âsÆF—b6Æ73Ò'‚×W"Ö&"#âr¶'WGFöâ‚~h˜iÈŠù^XÛrrÂvÆ—7Br’²sÆæb&–ÖÆ&VÃÒ.iÊÎK»ŞŠù^XÛr#âr²‡W"ç&V6÷&CòsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"&–×&W76VCÒ"r²†7F—fSÓÓÒw&V6÷&Br’²r"FFÖ‡V#Ò'W"×&V6÷&B#îŠù^š)Kˆî[é~XˆcÂö'WGFöãâs¢rr’²sÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"&–×&W76VCÒ"r²†7F—fSÓÓÒw&W÷'G2r’²r"FFÖ‡V#Ò'W"×&W÷'G2#ä’Xˆniér²‡W"ç&W÷'G2æÆVæwFƒòr+rr·W"ç&W÷'G2æÆVæwFƒ¢rr’²sÂö'WGFöããÂöæcãÂöF—câs°¢Ğ¢gVæ7F–öâ6†÷u&W÷'G2‚’°¢–b†VçG'”öæÇ’‚’—¶–b‡W"bgW"ç&V6÷&B–÷Vâ‡W"ç&V6÷&Bç&WVW7Eö–B“·&WGW&ã·Ğ¢6VÆV7F–öãÖçVÆÃ°¢&öG’‚’æ–ææW$…DÔÃ×W$æf–vF–öâ‚w&W÷'G2r’²sÇ6V7F–öâ6Æ73Ò'‚×&W÷'BÖÆ—7B#ãÆƒ#î‹ùK»ŞŠù^XÛ~y¨B’XˆniéÂöƒ#ãÇ6Æ73Ò'"Ö×WFVB#îKÛşyJ[{.KùŞZÙy¨Nš)yºîyIşh‰hª^Y®ûÈÎKˆŞ[ø^˜xŞikKˆ®KÊh‰nŠønXŠ¾8#Â÷âr²‡W"ç&V6÷&BbbW"ç&V6÷&Bç7FGW3ÓÓÒw7V66VVFVBsö'WGFöâ‡W"ç&W÷'G2æÆVæwFƒò~˜xŞikyIşh‰Xˆnié+rkhˆ	rjÊs¢~yIşh‰’Xˆnié+rkhˆ	rjÊrÂwW"ÖæÇ—¦RrÇG'VR“¢rr’²‚W"ç&V6÷&CòsÇ6Æ73Ò'"Ö×WFVB#îXéşZx¾[Ù^XZ^[{.z{¾™šNûÈÎK¸ŞXúşiú^yÈ¾[{.KùŞZÙy¨Nhª^Y®8#Â÷âs¢rr’²sÆF—b6Æ73Ò'‚ÖÆ—7B#âr²‡W"ç&W÷'G2æÆVæwFƒ÷W"ç&W÷'G2æÖ†gVæ7F–öâ‡"—·&WGW&âsÆ'F–6ÆR6Æ73Ò'‚Ö6&B#ãÇ7â6Æ73Ò'‚×7FGW2#âr¶W62†Æ&VÇ5·"ç7FGW5Ò’²sÂ÷7ããÆƒ3âr¶W62‡"çF—FÆWÇÇ"ç7V&¦V7B²r+r’Xˆniér’²sÂöƒ3ãÇâr¶W62†æWrFFR‡"æ7&VFVEöB’çFôÆö6ÆU7G&–ær‚w¦‚Ô4âr’’²sÂ÷âr¶'WGFöâ‡"ç7FGW3ÓÓÒw7V66VVFVBsò~iú^yÈ¾hª^Y¢s¢~iú^yÈ¾‹ù¾[ªbò{º~{ºÒrÂv÷Vã¢r·"ç&WVW7Eö–BÇG'VR’²sÂö'F–6ÆSâs·Ò’æ¦ö–â‚rr“¢sÇî‹ùk*iÈXˆniéhª^Y®8.Šù^š)[{.KùŞZÙûÈÎXúşKº^xëYÊXˆniéûÈÎK™şXúşKº^zˆŞYî{º~{ºŞ8#Â÷âr’²sÂöF—câr²‡W"æÖ÷&Sö'WGFöâ‚~Xª‹ÛŞi»NZI®hª^Y¢rÂwW"ÖÖ÷&R×&W÷'G2r“¢rr’²sÂ÷6V7F–öãâs°¢Ğ¢7–æ2gVæ7F–öâÖ÷&U&W÷'G2‚—·f"7W'&VçC×W"ÇfW'6–öãÒ²·&WVW7EfW'6–öã·f"FFÖv—B’‚vÆ—7EöÆÂrÇ·6÷W&6U÷&WVW7Eö–C¦7W'&VçBæ–BÆöfg6WC¦7W'&VçBç&W÷'G2æÆVæwF‡Ò“¶–b‡W"ÓÖ7W'&VçGÇÇfW'6–öâÓ×&WVW7EfW'6–öâ—&WGW&ã¶7W'&VçBç&W÷'G3Ö7W'&VçBç&W÷'G2æ6öæ6B†FFç&Wf–Ww2æf–ÇFW"†gVæ7F–öâ‡"—·&WGW&â7W'&VçBç&W÷'G2ç6öÖR†gVæ7F–öâ†öÆB—·&WGW&âöÆBç&WVW7Eö–CÓÓ×"ç&WVW7Eö–C·Ò“·Ò’“¶7W'&VçBæÖ÷&SÖFFæ†5öÖ÷&S·6†÷u&W÷'G2‚“·Ğ¢7–æ2gVæ7F–öâ÷Vâ†–B’°¢f"fW'6–öãÒ²·&WVW7EfW'6–öâÆvVãÖvVæW&F–öâÆCÖv—B’‚vvWBrÇ·&WVW7Eö–C¦–GÒ’Ç#ÖBç&Wf–WrÇ6÷W&6S×6÷W&6T–B‡"’Ç&V6÷&CÖ—5&V6÷&B‡"“÷#¦çVÆÃ°¢f"FFÖv—B’‚vÆ—7EöÆÂrÇ·6÷W&6U÷&WVW7Eö–C§6÷W&6RÆöfg6WC£Ò“°¢–b‚&V6÷&Bbb‡"ç6÷W&6U÷&V6÷&BÇÂ"ç&W7VÇBbb"ç&W7VÇBç6÷W&6U÷&V6÷&B’—·G'—·&V6÷&CÒ†v—B’‚vvWBrÇ·&WVW7Eö–C§6÷W&6WÒ’’ç&Wf–Ws·Ö6F6‚†R—¶–b†Rç7FGW2ÓÓCB—F‡&÷rS·×Ğ¢–b†vVâÓÖvVæW&F–öâÇÂfW'6–öâÓ×&WVW7EfW'6–öâÇÂ&ö÷Bæ—46öææV7FVB—&WGW&ã°¢W#×¶–C§6÷W&6RÇ&V6÷&C§&V6÷&BÇ&W÷'G3¦FFç&Wf–Ww2ÆÖ÷&S¦FFæ†5öÖ÷&WÓ°¢–b‚—5&V6÷&B‡"’bbW"ç&W÷'G2ç6öÖR†gVæ7F–öâ‡‚—·&WGW&â‚ç&WVW7Eö–CÓÓ×"ç&WVW7Eö–C·Ò’—W"ç&W÷'G2çVç6†–gB‡"“°¢7FFRææÇ—6—5F#ÒwW'2s°¢Ö÷VçB‡·7V&¦V7C§"ç7V&¦V7BÆW†Õö–C§"æW†Õö–BÆG&gEö–C§"æG&gEö–BÇF—FÆS§"çF—FÆRÆ÷F–öç3§"æ÷F–öç7ÇÇ·×ÒÆ–B“°¢Ğ¢gVæ7F–öâVçFW"†öÆBÂ7V&¦V7BÂW†Ô6öçFW‡B’°¢öÆBç&Wf–÷W5vRÒ7FFRçvS²÷&–v–âÒöÆC²öÆBæÖöFÂç7G–ÆRæF—7Æ’ÒvæöæRs°¢6VVBÒ²7V&¦V7C¢7V&¦V7BÂW†Õö–C¢öÆBæW†ÒbböÆBæW†Òç66÷&W2bböÆBæW†Òç66÷&W5·7V&¦V7EÒòöÆBæW†Ô–B¢rrÂG&gEö–C¢öÆBæG&gD–BÂW†Ô6öçFW‡C¢W†Ô6öçFW‡BÂF—FÆS¢†öÆBæÖöFÂçVW'•6VÆV7F÷"‚r6W†ÔæÖRr’çfÇVRÇÂ~ˆ>ŠùRr’²r+rr²7V&¦V7BÂ÷&–v–äG&gC¢öÆBæW†Ô–BÓ²6VÆV7F–öâÒçVÆÃ°¢7FFRææÇ—6—5F"ÒwW'2s²7FFRçvRÒw7FG2s²&VæFW%vR‚“°¢Ğ¢gVæ7F–öâ&VæFW"†æöFR’°¢–b‚æöFR’&WGW&ã²vVæW&F–öâ²³²&ö÷BÒæöFS¶–b‡7FFRææÇ—6—5F#ÓÓÒv’r—7FFRææÇ—6—5F#ÒwW'2s°¢f"æW‡BÒ6öçFW‡B‚“²–b†7G‚bb7G‚çW6W"ÓÒæW‡BçW6W"’²6VVBÒçVÆÃ²6VÆV7F–öâÒçVÆÃ²&÷w2ÒµÓ²G&gG2ÒµÓ²÷&–v–âÒçVÆÃ²W"ÒçVÆÃ²Ò7G‚ÒæW‡C°¢6†VÆÂ‚“²–b‡VæF–ætæÇ—6—2’²f"&V6÷&C×VæF–ætæÇ—6—3²VæF–ætæÇ—6—3ÖçVÆÃ²æÇ—¦U&V6÷&B‡&V6÷&B“²ÒVÇ6R–b‡6VÆV7F–öâ’Ö÷VçB‡6VÆV7F–öâæFFÂ6VÆV7F–öâç&W÷'D–B“²VÇ6R–b‡6VVB’7&VFR‚’æ6F6‚†gVæ7F–öâ†R’²æ÷FR†RæÖW76vR“²Ò“²VÇ6RÆ—7B‚“°¢Ğ¢v–æF÷rå66÷&UW$‡V"Ò²F'3¢F'2Âæf–vF–öã¦æf–vF–öâÂ&VæFW#¢&VæFW"ÂVçFW#¢VçFW"Â÷Vã¦÷VâÂ6äÆVfS¦ÆVfTVF—F÷"À¢æÇ—¦S¦gVæ7F–öâ‡&÷r—·VæF–ætæÇ—6—3×&÷s·7FFRçvSÒw7FG2s·7FFRææÇ—6—5F#ÒwW'2s·6VÆV7F–öãÖçVÆÃ·6VVCÖçVÆÃ·&VæFW%vR‚“·ÒÓ°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“²7G–ÆRçFW‡D6öçFVçBÒ ¢ç‚×v÷&·76W¶Ö‚×v–GFƒ£ƒ¶Ö&v–ã£WFó·FF–æs£Cƒ¶6öÆ÷#§f"‚Ò×FW‡B—Òç‚×F'7¶F—7Æ“¦fÆWƒ¶v£gƒ¶Ö&v–ã£#Gƒ·FF–æs£Wƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£7ƒ·v–GFƒ¦f—BÖ6öçFVçGÒç‚×F'2'WGFöç¶&÷&FW#£¶&6¶w&÷VæC§G&ç7&VçC¶6öÆ÷#§f"‚ÒÖ×WFVB“·FF–æs£‚#'ƒ¶&÷&FW"×&F—W3£—ƒ¶föçC¦–æ†W&—C¶föçB×6—¦S£Gƒ¶7W'6÷#§ö–çFW'Òç‚×F'2¶&–×&W76VC×G'VU×¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6VVcfb“¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£sÒç‚Ö†VFW"Âç‚×6V7F–öâ×F—FÆW¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£‡ƒ¶Ö&v–âÖ&÷GFöÓ£#G‡Òç‚Ö†VFW"ƒ¶föçB×6—¦S£#gƒ¶Ö&v–ã£g‚Òç‚Ö†VFW"Âç‚×6V7F–öâ×F—FÆR¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£W‚Òç‚Ö†VFW#æF—c¦Æ7BÖ6†–ÆG¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶fÆW‚×w&§w&Òç‚Öf–ÇFW'7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"ãFg"g"ãfg"WFó¶v£'ƒ¶Æ–vâÖ—FV×3¦VæC¶Ö&v–ã£#‚Òç‚×v÷&·76RÆ&VÇ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç‚×v÷&·76R–çWC¦æ÷B…·G—SÖ6†V6¶&÷…Ò“¦æ÷B…·G—SÖf–ÆUÒ’Âç‚×v÷&·76R6VÆV7BÂç‚×v÷&·76RFW‡F&V¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ·v–GFƒ£S·FF–æs£‚ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçC¦–æ†W&—C¶föçB×6—¦S£Gƒ¶Ö&v–â×F÷£g‡Òç‚ÖÆ—7G¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£g‡Òç‚Ö6&G¶Ö–â×v–GFƒ£¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£gƒ·FF–æs£#ƒ¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖçÒç‚Ö6&Bƒ7¶föçB×6—¦S£wƒ¶Æ–æRÖ†V–v‡C£ãS¶Ö&v–ã£g‚wƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç‚Ö6&B¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£G‚‡‡Òç‚Ö6&B6ÖÆÇ¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç‚Ö6&B×F÷¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£‡ƒ¶föçB×6—¦S£'‡Òç‚×7V&¦V7G¶föçB×vV–v‡C£s¶6öÆ÷#§f"‚ÒÖ66VçB—Òç‚×7FGW7·FF–æs£7‚‡ƒ¶&÷&FW"×&F—W3£#ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶föçB×6—¦S£‡Òç‚×7V66VVFVG¶6öÆ÷#¢33ƒCf3¶&6¶w&÷VæC¢33ƒCf3WÒç‚Ö6&Bfö÷FW'¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶Ö&v–â×F÷¦WFó·FF–ær×F÷£‡‡Òç‚×&öw&W77·FF–ær×F÷£‡Òç‚ÖV×G—¶w&–BÖ6öÇVÖã£òÓ·FF–æs£SW‚‡ƒ·FW‡BÖÆ–vã¦6VçFW#¶&÷&FW#£‚F6†VBf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£g‡Òç‚ÖV×G’¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç‚ÖÖ÷&W·FW‡BÖÆ–vã¦6VçFW#¶Ö&v–ã£#‡Òç‚ÖÖW76vS¦V×G—¶F—7Æ“¦æöæWÒç‚ÖÖW76vW·FF–æs£'ƒ¶&÷&FW"×&F—W3£ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶föçB×6—¦S£7ƒ¶Ö&v–âÖ&÷GFöÓ£g‡Òç‚Ö7&VFW¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“·FF–æs£#gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡‡Òç‚Öf÷&ÒÖw&–G¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£‡‡Òç‚Ö7&VFRf–VÆG6WG¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£‡ƒ¶Ö&v–ã£#G‚Òç‚Ö7&VFRÆVvVæG¶föçB×6—¦S£Gƒ¶föçB×vV–v‡C£s·FF–æs£w‡Òç‚Ö7&VFRf–VÆG6WBÂç‚Ö†–çG¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ã‡Òç‚ÖÖöGVÆW7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2Ãg"“¶v£'‡Òç‚ÖÖöGVÆW2Æ&VÇ¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£‡ƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶föçB×6—¦S£7‡Òç‚ÖÖöGVÆW2–çWG¶66VçBÖ6öÆ÷#§f"‚ÒÖ66VçB—Òç‚Ö7&VFRf–VÆG6WC¦F—6&ÆVG¶÷6—G“¢ãWÒç‚Ö7F–öç7·FW‡BÖÆ–vã§&–v‡C·FF–ær×F÷£W‡Òç‚ÖVF—F÷"×FööÆ&'¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Æ–vâÖ—FV×3¦6VçFW#¶v£'ƒ¶föçB×6—¦S£7ƒ¶Ö&v–âÖ&÷GFöÓ£Wƒ¶fÆW‚×w&§w&Òç‚ÖÆ–æ²Öf÷&×¶F—7Æ“¦w&–C¶v£ƒ¶fÆWƒ£Òç"Ö–æÆ–æW·v–GFƒ£R–×÷'FçC¶Ö‚×v–GFƒ£R–×÷'FçC¶Ö‚Ö†V–v‡C¦æöæR–×÷'FçC¶†V–v‡C¦WFò–×÷'FçC¶Ö&v–ã£–×÷'FçC¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR’–×÷'FçC¶&÷&FW"×&F—W3£g‚–×÷'FçC¶&÷‚×6†F÷s¦æöæS¶÷fW&fÆ÷s§f—6–&ÆWÒç"Ö–æÆ–æRç"Ö†VG·÷6—F–öã§7FF–3¶&÷&FW"×&F—W3£g‚g‚Òç"Ö–æÆ–æRç"×F'7¶F—7Æ“¦æöæWÒç"Ö–æÆ–æRç"Ö6öçFVçG·FF–ær×F÷£#‡Òç"Ö–æÆ–æRç"ÖÖ–ç¶Ö‚×v–GFƒ£ƒSƒ¶Ö&v–ã¦WF÷Òç‚×v÷&·76R'WGFöã¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£7‡ÔÖVF–†Ö‚×v–GFƒ£ƒ‚—²ç‚ÖÆ—7G¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’—Òç‚Öf–ÇFW'7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g'Òç‚Öf–ÇFW'3æ'WGFöç¶§W7F–g’×6VÆc§7F'GÒç‚Ö†VFW'¶Æ–vâÖ—FV×3§7F'GÒç‚Ö†VFW"ƒ¶föçB×6—¦S£#'‡Òç‚ÖÖöGVÆW7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g'×ÔÖVF–†Ö‚×v–GFƒ£S#‚—²ç‚Ö†VFW"Âç‚×6V7F–öâ×F—FÆW¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶Æ–vâÖ—FV×3§7G&WF6‡Òç‚Ö†VFW#æF—c¦Æ7BÖ6†–ÆG¶§W7F–g’Ö6öçFVçC¦fÆW‚×7F'GÒç‚ÖÆ—7G¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç‚Ö7&VFW·FF–æs£‡‡Òç‚Öf÷&ÒÖw&–G¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç‚×F'7·v–GFƒ£S¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷‡Òç‚×F'2'WGFöç¶fÆWƒ£·FF–æs£—‚‡Òç‚×v÷&·76Rç"Ö†VG¶Æ–vâÖ—FV×3§7F'C¶v£‡‡Òç‚ÖVF—F÷"×FööÆ&'¶Æ–vâÖ—FV×3§7F'GÒç"Ö–æÆ–æRç"Ö6öçFVçG·FF–æs£'‚G‚#'‡Òç‚×v÷&·76W·FF–ærÖ&÷GFöÓ£c‡×Ö°¢7G–ÆRçFW‡D6öçFVçB³Ò ¢ò¢wV–FVB6WGWæB&VF&ÆR&W÷'B†–W&&6‡’â¢ğ¢ç‚Ö7&VFW·FF–æs£#‡‡Òç‚Ö7&VFRƒ'¶föçB×6—¦S£#gƒ¶Ö&v–ã£‡‡Òç‚Ö7&VFRç‚×6V7F–öâ×F—FÆRÂç‚×7FW¶föçB×6—¦S£Gƒ¶Æ–æRÖ†V–v‡C£ãwÒç‚×7FW¶F—7Æ“¦fÆWƒ¶v£Gƒ¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶Ö&v–ã£#g‚#‡Òç‚×7FWç7ç¶F—7Æ“¦w&–C·Æ6RÖ—FV×3¦6VçFW#¶Ö–â×v–GFƒ£3Gƒ¶†V–v‡C£3Gƒ¶&÷&FW"×&F—W3£ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚ÒÖ66VçB“¶föçB×vV–v‡C£s¶föçB×6—¦S£G‡Òç‚×7FWƒ7¶föçB×6—¦S£#‚–×÷'FçC¶Ö&v–ã£‚W‚–×÷'FçC¶Æ–æRÖ†V–v‡C£ãGÒç‚×7FW¶Ö&v–ã£¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç‚Ö7&VFRÆ&VÇ¶föçB×6—¦S£G‡Òç‚ÖæÖW¶Ö&v–â×F÷£‡‡Òç‚ÖæÖR7VÖÖ'—¶7W'6÷#§ö–çFW#¶föçB×6—¦S£G‡Òç‚ÖæÖR7VÖÖ'’7ç¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–âÖÆVgC£‡‡Òç‚ÖæÖRÆ&VÇ¶F—7Æ“¦&Æö6³¶Ö&v–â×F÷£'‡Òç‚Ö7&VFRç‚Ö7&VFRÖVF—F÷"ç"Ö–æÆ–æW¶&÷&FW#£–×÷'FçC¶&÷&FW"×&F—W3£–×÷'FçGÒç‚Ö7&VFRç‚Ö7&VF–ærç"Ö†VG¶F—7Æ“¦æöæWÒç‚Ö7&VFRç"Ö6öçFVçG·FF–æs£Òç‚Ö7&VFRç"ÖÖ–ç¶Ö‚×v–GFƒ¦æöæWÒç‚Ö7&VFRç"Ö–çG&÷·FF–æs£#ƒ¶Ö&v–ã£#'‚¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW"×&F—W3£'‡Òç‚Ö7&VFRç"Ö–çG&òƒ7¶föçB×6—¦S£‡‡Òç‚Ö7&VFRç"Ö–çG&òÂç‚Ö7&VFRç"×V÷F¶föçB×6—¦S£Gƒ¶Æ–æRÖ†V–v‡C£ãcWÒç‚Ö7&VFRç"×WÆöBÖw&÷W·FF–æs£#‚Òç‚Ö7&VFRç"×WÆöBÖw&÷Wƒ7¶föçB×6—¦S£w‡Òç‚Ö7&VFRç"×WÆöBÖw&÷Wç¶föçB×6—¦S£G‡Òç‚Ö7&VFRç"×v÷&²ÖÆö6F–öç¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£ƒ·FF–æs£¶&÷&FW#£¶Ö&v–ã£#‚Òç"×v÷&²ÖÆö6F–öâÆVvVæG¶föçB×6—¦S£gƒ¶föçB×vV–v‡C£cS¶Ö&v–âÖ&÷GFöÓ£'‡Òç"×v÷&²ÖÆö6F–öâÆ&VÂÂç‚Ö6†ö–6W¶F—7Æ“¦fÆW‚–×÷'FçC¶Æ–vâÖ—FV×3¦fÆW‚×7F'B–×÷'FçC¶v£—‚–×÷'FçC·FF–æs£W‚–×÷'FçC¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£ƒ¶7W'6÷#§ö–çFW#¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶Ö–â×v–GFƒ£Òç"×v÷&²ÖÆö6F–öâÆ&VÃ¦†2†–çWC¦6†V6¶VB’Âç‚Ö6†ö–6S¦†2†–çWC¦6†V6¶VB—¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖ66VçB“¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB—Òç‚Ö6†ö–6R–çWBÂç"×v÷&²ÖÆö6F–öâ–çWG¶Ö&v–ã£G‚¶fÆWƒ¦æöæS¶66VçBÖ6öÆ÷#§f"‚ÒÖ66VçB—Òç‚Ö6†ö–6R7G&öærÂç"×v÷&²ÖÆö6F–öâ7G&öæw¶F—7Æ“¦&Æö6³¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£cS¶Æ–æRÖ†V–v‡C£ãS¶6öÆ÷#§f"‚Ò×FW‡B—Òç‚Ö6†ö–6R6ÖÆÂÂç"×v÷&²ÖÆö6F–öâ6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãcS¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£W‡Òç‚Ö7&VFRç‚×&W6WG7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£ƒ¶&÷&FW#£·FF–æs£¶Ö&v–ã£Òç‚×7"ÖöæÇ—·÷6—F–öã¦'6öÇWFS·v–GFƒ£ƒ¶†V–v‡C£ƒ¶÷fW&fÆ÷s¦†–FFVã¶6Æ—×Fƒ¦–ç6WBƒSR—Òç‚Ö7&VFRç‚ÖÖöGVÆW7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶Ö&v–ã£g‚Òç‚×&VfW&Væ6W7¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶Ö&v–â×F÷£#‡‡Òç‚×&VfW&Væ6W2ç‚×7FW¦f—'7BÖ6†–ÆG¶Ö&v–â×F÷£#‡‡Òç‚Ö6÷&RÖæ÷FW¶föçB×6—¦S£G‚–×÷'FçC¶Æ–æRÖ†V–v‡C£ãƒ·FF–æs£7‚¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç‚Ö6öçFW‡BÂç‚Ö7W7Fö×¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£gƒ¶Ö&v–ã£G‚Òç‚Ö6öçFW‡Cç7VÖÖ'’Âç‚Ö7W7FöÓç7VÖÖ'—·FF–æs£g‚¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£c¶7W'6÷#§ö–çFW#¶Æ–æRÖ†V–v‡C£ãWÒç‚Ö6öçFW‡Cç7VÖÖ'’6ÖÆÇ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£7‡Òç‚Ö6öçFW‡E¶÷VåÒÂç‚Ö7W7FöÕ¶÷Vå×·FF–ærÖ&÷GFöÓ£g‡Òç‚Ö6öçFW‡CæÆ&VÂÂç‚Ö7W7FöÓæÆ&VÇ¶F—7Æ“¦&Æö6³¶Ö&v–â×F÷£G‡Òç‚Ö†–çG¶föçB×6—¦S£7‚–×÷'FçC¶Æ–æRÖ†V–v‡C£ã‡Òç‚ÖW†×ÆW¶föçB×6—¦S£Gƒ·FF–æs£Wƒ¶&÷&FW"×&F—W3£ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶Æ–æRÖ†V–v‡C£ãƒ¶Æ–vâ×6VÆc¦VæGÒç‚Ö7&VFRç‚×&–÷&—F–W7¶&÷&FW#£·FF–æs£¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£‡ƒ¶Ö&v–ã£#‚Òç‚×&–÷&—F–W2ÆVvVæG¶Ö&v–âÖ&÷GFöÓ£'‡Òç‚×7VÖÖ'—·FF–æs£‡ƒ¶&÷&FW"×&F—W3£'ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶Ö&v–ã£#‚¶föçB×6—¦S£W‡Òç‚×7VÖÖ'’¶föçB×6—¦S£Gƒ¶Æ–æRÖ†V–v‡C£ãƒ¶Ö&v–ã£‡‚Òç‚Ö7&VFRç"Öfö÷FW'·÷6—F–öã§7F–6·“¶&÷GFöÓ£sƒ·¢Ö–æFWƒ£C¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£Gƒ¶&÷‚×6†F÷s£G‚#‚3ƒ¶fÆW‚×w&§w&Òç‚Ö7&VFRç"Öfö÷FW"ç"Ö'WGFöç¶Ö–âÖ†V–v‡C£CGƒ¶föçB×6—¦S£G‡Òç‚Ö7&VFRç"Ö6öç6VçG¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãsS¶Ö&v–ã£#G‚g‡Òç‚Ö7&VFR¶†–FFVåÒÂç"ÖÖ–â¶†–FFVå×¶F—7Æ“¦æöæR–×÷'FçGÒç‚Ö7&VFRç"Ö†VÇ¶föçB×6—¦S£7‡Òç‚Ö7&VFRç‚Öf÷&ÒÖw&–G¶v£g‡Òç‚Ö7&VFRç"ÖÖW76vW¶föçB×6—¦S£G‡Òç‚Ö7&VFRç"Ö6†V6·¶föçB×6—¦S£G‡Ğ¢ç"ÖÖ–âç"×&W7VÇB×F÷ƒ7¶föçB×6—¦S£#wƒ¶Ö&v–â×F÷£‡‡Òç"ÖÖ–âç"Ö6†FW'¶Ö&v–ã£#'ƒ¶v£G‡Òç"ÖÖ–âç"Ö6†FW"ƒ7¶föçB×6—¦S£#'ƒ¶Æ–æRÖ†V–v‡C£ãGÒç"ÖÖ–âç"Ö6†FW"¶föçB×6—¦S£Gƒ¶Æ–æRÖ†V–v‡C£ãwÒç"ÖÖ–âç"×&VF–ær×6V7F–öç·FF–ær×F÷£#‡ƒ¶Ö&v–â×F÷£#‡ƒ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"ÖÖ–âç"Ö÷fW&ÆÂÖÖWG&–77¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒBÆÖ–æÖ‚ƒÃg"’“¶v£'ƒ¶Ö&v–ã£#G‡Òç"ÖÖWG&–7·FF–æs£gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶v£‡ƒ¶Ö–â×v–GFƒ£Òç"ÖÖWG&–3ç7ç¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖWG&–27G&öæw¶föçB×6—¦S£#Wƒ¶Æ–æRÖ†V–v‡C£ã3¶ÆWGFW"×76–æs¢Òãgƒ¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7Òç"ÖÖWG&–26ÖÆÇ¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãc¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç"ÖÖ–âç"Ö†VFÆ–æW¶föçB×6—¦S£—ƒ¶Æ–æRÖ†V–v‡C£ãcS¶föçB×vV–v‡C£s¶Ö&v–ã£#G‚'‡Òç"ÖÖ–âç"Ö÷fW'f–Wrç"×&÷6W¶föçB×6—¦S£gƒ¶Æ–æRÖ†V–v‡C£ã‡Òç"Ö÷fW&ÆÂÖf–æF–æw7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£gƒ¶Ö&v–ã£#G‚Òç"Ö÷fW&ÆÂÖf–æF–æw3ç6V7F–öç·FF–æs£‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶&÷&FW"×F÷£7‚6öÆ–B3C3“3vÒç"Ö÷fW&ÆÂÖf–æF–æw3âç"Ö÷fW&ÆÂÖv¶&÷&FW"×F÷Ö6öÆ÷#¢63“†3F7Òç"ÖÖ–âç"Ö÷fW&ÆÂÖf–æF–æw2ƒG¶föçB×6—¦S£gƒ¶Ö&v–ã£G‡Òç"Ö÷fW&ÆÂÖf–æF–æw2'F–6ÆW¶Ö&v–ã£G‚Òç"Ö÷fW&ÆÂÖf–æF–æw27G&öæw¶föçB×6—¦S£Wƒ¶Æ–æRÖ†V–v‡C£ãs¶F—7Æ“¦&Æö6·Òç"Öf—'7BÖ7F–öç·FF–æs£‡ƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW"×&F—W3£'ƒ¶Æ–æRÖ†V–v‡C£ãƒ¶föçB×6—¦S£W‡Òç"Öf—'7BÖ7F–öâç"Ö'WGFöç¶Ö&v–â×F÷£‡Òç"ÖÖ–âç"×&V6öÆÆV7F–öç¶föçB×6—¦S£Gƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãƒ¶Ö&v–â×F÷£‡‡Òç"ÖÖ–âç"×&÷6RÂç"ÖÖ–âç"×FW‡G¶föçB×6—¦S£Wƒ¶Æ–æRÖ†V–v‡C£ã‡Òç"ÖÖ–âç"Ö×WFVBÂç"ÖÖ–âç"ÖWf–FVæ6W¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãsWÒç"ÖÖ–âƒG¶föçB×6—¦S£gƒ¶Ö&v–â×F÷£#‡Òç"ÖÖ–âç"ÖföÆCç7VÖÖ'—¶föçB×6—¦S£Wƒ·FF–æs£W‚'‡Òç"ÖÖ–âç"×VW7F–öãç7VÖÖ'—¶föçB×6—¦S£gƒ¶Ö–âÖ†V–v‡C£S'‡Òç"ÖÖ–âç"×VW7F–öâ7VÖÖ'’6ÖÆÇ¶föçB×6—¦S£7‡Òç"ÖÖ–âç"Ö&FvW¶föçB×6—¦S£G‡Òç"ÖÖ–âç"×VW7F–öâÖ&öG’ƒG¶föçB×6—¦S£g‡Òç"ÖÖ–âç"Ö¶W’Öv2'F–6ÆW·FF–æs£g‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"Ö¶W’Öv27G&öæw¶föçB×6—¦S£w‡Òç"ÖÖ–âç"×GFW&âƒG¶föçB×6—¦S£w‡Òç"ÖÖ–âç"Ö7F–öâ×Æç¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR—Òç"ÖÖ–âç"Ö7F–öâƒG¶föçB×6—¦S£w‡Òç"ÖÖ–âç"×7V66W77¶föçB×6—¦S£Gƒ·FF–æs£'‚G‡Òç"ÖÖ–âç"×&W÷'BÖæbç"Ö'WGFöç¶fÆWƒ£WFó¶föçB×6—¦S£7ƒ¶Ö–âÖ†V–v‡C£CG‡Òç"ÖÖ–âç"Ö6÷'&V7B×&Vf—‡¶&÷&FW"ÖÆVgC£7‚6öÆ–B3C3“3v·FF–æs£'‚gƒ¶Ö&v–âÖ&÷GFöÓ£‡‡Òç"ÖÖ–âç"Ö6÷'&V7B×&Vf—‚ƒG¶Ö&v–â×F÷£Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆW¶föçB×6—¦S£G‡Òç"ÖÖ–âç"ÖÆ÷72ÖÖç7ç¶föçB×6—¦S£Gƒ·FF–æs£‡Òç"ÖÖ–âç"×v–âÖ6&BƒG¶föçB×6—¦S£G‡Òç"ÖÖ–âç"Ö6öçFW‡Cç7VÖÖ'—¶föçB×6—¦S£W‡Òç"ÖÖ–âç"×VW7F–öâç"Ö6†V6·¶föçB×6—¦S£7‡Ğ¤ÖVF–†Ö–â×v–GFƒ£ƒ‚—²ç‚×&VfW&Væ6W7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃg"’#3Wƒ¶v£#Gƒ¶Æ–vâÖ—FV×3§7F'GÒç‚×&VfW&Væ6W3â§¶w&–BÖ6öÇVÖã£¶Ö–â×v–GFƒ£Òç‚×&VfW&Væ6W3âç‚×7VÖÖ'—¶w&–BÖ6öÇVÖã£#¶w&–B×&÷s£ós·÷6—F–öã§7F–6·“·F÷£#Gƒ¶Ö&v–â×F÷£#‡‡Òç‚Ö7&VFRç‚×&W6WG7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç‚×&W6WG2ç‚Ö6†ö–6W·FF–æs£7‚g‚–×÷'FçG×Ğ¤ÖVF–†Ö‚×v–GFƒ£s‚—²ç‚Ö7&VFW·FF–æs£‡‡Òç‚Ö7&VFRç‚×&W6WG2Âç‚Ö7&VFRç"×v÷&²ÖÆö6F–öâÂç‚Ö7&VFRç‚×&–÷&—F–W7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç‚Ö7&VFRç‚ÖÖöGVÆW7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç‚Ö7&VFRç‚Öf÷&ÒÖw&–G¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç‚Ö7&VFRç"Öfö÷FW'¶&÷GFöÓ£sWƒ¶v£‡‡Òç‚Ö7&VFRç"Öfö÷FW#ç7ç·v–GFƒ£WÒç‚Ö7&VFRç"Öfö÷FW"ç"Ö'WGFöç¶fÆWƒ£Òç"ÖÖ–âç"Ö÷fW&ÆÂÖÖWG&–77¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£‡Òç"ÖÖWG&–7·FF–æs£7‡Òç"ÖÖWG&–27G&öæw¶föçB×6—¦S£#W‡Òç"Ö÷fW&ÆÂÖf–æF–æw7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òç"ÖÖ–âç"Ö6†FW"ƒ7¶föçB×6—¦S£#‡Òç"ÖÖ–âç"×&W÷'BÖæg¶v£g‡Òç"ÖÖ–âç"×&W÷'BÖæbç"Ö'WGFöç¶fÆWƒ£#‚S·FF–æs£‡‡Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRG'¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’—Òç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒ"“£¦&Vf÷&W¶6öçFVçC¢~™«î[ªbwÒç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒ2“£¦&Vf÷&W¶6öçFVçC¢~[é~XˆbwÒç"ÖÖ–âç"ÖF–ff–7VÇG’×F&ÆRFC¦çF‚Ö6†–ÆBƒB“£¦&Vf÷&W¶6öçFVçC¢~K‹¾Šh™«îx+’wÒç"ÖÖ–âç"×VW7F–öâÖ&öG—·FF–æs£G‡Òç‚Ö7&VFRƒ'¶föçB×6—¦S£#G‡×Ğ¦°¢7G–ÆRçFW‡D6öçFVçB³Òrç‚×v÷&·76Rç‚Ö7&VFR–çWE·G—S×&F–õ×·v–GFƒ£gƒ¶†V–v‡C£gƒ·FF–æs£¶Ö&v–ã£G‚¶&÷&FW#¦–æ—F–Ã¶&6¶w&÷VæC¦–æ—F–Ã¶fÆWƒ¦æöæWÒç‚×v÷&·76Rç‚Ö7&VFR–çWE·G—SÖ6†V6¶&÷…×·v–GFƒ£gƒ¶†V–v‡C£gƒ¶fÆWƒ¦æöæWÒs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒW"×&V6÷&G2æ§2ÓÓÓÓÒ¢ğ¢ò¢6†V6¶VBVW7F–öâÆVFvW"fVVG2Ö&·2æB÷F–öæÂ’&W÷'G2â¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"W62ÒgVæ7F–öâ‡b’²&WGW&âW66T‡FÖÂ…7G&–ær‡bÓÒçVÆÂòrr¢b’“²Ó°¢f"æÖW2Ò²7G&VæwF‡3¢~KÉX«şKˆî[é~XˆnjÚ^šªBrÂF–ff–7VÇG“¢~š)yºî™«î[ªbrÂ6W6W3¢~ZKXˆnXéşYºrÂ6öÇWF–öç3¢~X[>™JîŠz>zÙBrÂ&7F–6S¢~™(Zûh
~{¸>KšrÂGFW&ç3¢~‹zš)X[h
rrÂÆã¢~ZHŞKšZèhé"rÓ°¢gVæ7F–öâG&6²†WfVçBÂFF’²–b‡v–æF÷råõ÷66÷&UG&6¶W%G&6²’v–æF÷råõ÷66÷&UG&6¶W%G&6²†WfVçBÂFFÂw7FG2r“²Ğ¢gVæ7F–öâf–VÆG2‡Â2’°¢f"ÆWfVÂÒ2çVW7F–öåöF–ff–7VÇG’óòçVW7F–öåöF–ff–7VÇG’óòrs°¢&WGW&âsÆF—b6Æ73Ò'"×66÷&RÖf–VÆG2#ãÆÆ&VÃîš)Yè¾YŞz{Æ–çWBFFÖf–VÆCÒ'VW7F–öå÷G—R"Ö†ÆVæwFƒÒ#C"Æ6V†öÆFW#Ò.Zh.ûÉ®™ˆ^Šû¾ynŠz2òZ¾z›®š)‚"fÇVSÒ"r²W62†2çVW7F–öå÷G—RóòçVW7F–öå÷G—R’²r#ãÂöÆ&VÃãÆÆ&VÃîš)yºî™«î[ªnûÈ˜Z¾ûÈ“Ç6VÆV7BFFÖf–VÆCÒ'VW7F–öåöF–ff–7VÇG’#ãÆ÷F–öâfÇVSÒ"#îiÊ®j~k:ƒÂö÷F–öãâr²ö&¦V7Bæ¶W—2…66÷&UVW7F–öåG—TÖöFVÂæF–ff–7VÇF–W2’æÖ†gVæ7F–öâ†²’²&WGW&âsÆ÷F–öâfÇVSÒ"r²²²r"r²†²ÓÓÒÆWfVÂòr6VÆV7FVBr¢rr’²sâr²66÷&UVW7F–öåG—TÖöFVÂæF–ff–7VÇF–W5¶µÒ²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÂöF—câs°¢Ğ¢gVæ7F–öâfÇVTöb†2ÇÆ¶W’—·&WGW&âö&¦V7Bç&÷F÷G—Ræ†4÷vå&÷W'G’æ6ÆÂ†2Æ¶W’“ö5¶¶W•Ó§¶¶W•Ó·Ğ¢gVæ7F–öâVW7F–öå7FFR‡Â2’°¢f"&V6öç3ÕµÓ°¢–b‚‡fÇVTöb†2ÇÂw7FVÒr’ÇÂrr’çG&–Ò‚’’&V6öç2çW6‚‚~{Ë®[	š)[›"r“°¢–b‡fÇVTöb†2ÇÂwFV6†W%÷66÷&Rr’ÓÒçVÆÂ’&V6öç2çW6‚‚~{Ë®[	[é~Xˆbr“°¢–b‡fÇVTöb†2ÇÂvÖ…÷66÷&Rr’ÓÒçVÆÂ’&V6öç2çW6‚‚~{Ë®[	kºXˆbr“°¢–b‚‡fÇVTöb†2ÇÂwVW7F–öå÷G—Rr’ÇÂrr’çG&–Ò‚’’&V6öç2çW6‚‚~iÊ®Z¾š)Yè²r“°¢f"66÷&S×fÇVTöb†2ÇÂwFV6†W%÷66÷&Rr’ÆÖƒ×fÇVTöb†2ÇÂvÖ…÷66÷&Rr“°¢–b‡66÷&RÖçVÆÂbb‚çVÖ&W"æ—4f–æ—FR‡66÷&R—ÇÇ66÷&SÃ—ÇÆÖ‚ÖçVÆÂbb‚çVÖ&W"æ—4f–æ—FR†Ö‚—ÇÆÖƒÃÓ—ÇÇ66÷&RÖçVÆÂbfÖ‚ÖçVÆÂbg66÷&SæÖ‚—&V6öç2çW6‚‚~XˆnXÎ™Èj8iúRr“°¢–b‚2çfW&–f–VBbb‡ç66÷&U÷fW&–f–6F–öâÓÓÒv6öæfÆ–7BrÇÂç&Wf–Wu÷7FGW2ÓÓÒwFV6†W%ö6öæfÆ–7Br’’&V6öç2çW6‚‚~h›iKXˆniÈXk.z¨r“°¢–b‚2çfW&–f–VBbbæç7vW%÷fW&–f–6F–öâÓÓÒv6öæfÆ–7Br’&V6öç2çW6‚‚~KÙÎzÙNZÙYÊjÚ~K˜’r“°¢–b‚2çfW&–f–VBbb…²vÆ÷rrÂvÖVF—VÒuÒæ–æ6ÇVFW2‡æ6öæf–FVæ6R’ÇÂææÇ—6—5öÖöFRÓÓÒvæVVG5ö6öæf—&ÖF–öârÇÂç7FGW2ÓÓÒwVæ6ÆV"r’’&V6öç2çW6‚‚~ŠønXŠ¾Xh^Zë[è^zîŠêBr“°¢–b‚2çfW&–f–VBbb²w6–ævÆU÷&VBrÂv6öæfÆ–7BuÒæ–æ6ÇVFW2‡æÖ…÷fW&–f–6F–öâ’’&V6öç2çW6‚‚~kºXˆn[è^ZHŞj‚r“°¢–b‚2çfW&–f–VBbbç66÷&U÷fW&–f–6F–öâÓÓÒw6–ævÆU÷&VBr’&V6öç2çW6‚‚~h›iKXˆn[è^ZHŞj‚r“°¢–b‚2çfW&–f–VBbb‡çVæ6W'F–çF–W7ÇÅµÒ’ç6öÖR†gVæ7F–öâ‡2—·&WGW&â7G&–ær‡7ÇÂrr’çG&–Ò‚“·Ò’’&V6öç2çW6‚‚~iÈ[è^jZûZH~k:‚r“°¢&WGW&â²&V6öç3§&V6öç2ÂfW&–f–VC¢2çfW&–f–VBÓ°¢Ğ¢gVæ7F–öâÆ—fR†Ö–âÂ&÷r’°¢&WGW&â&÷rç&W7VÇBçVW7F–öç2æÖ†gVæ7F–öâ‡—°¢f"æöFSÔ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’æf–æB†gVæ7F–öâ†â—·&WGW&ââæFF6WBçVW7F–öãÓÓÕ7G&–ær‡æ–B“·Ò’ÆöÆCÒ‡&÷ræ6÷'&V7F–öç7ÇÅµÒ’æf–æB†gVæ7F–öâ†2—·&WGW&â2æ–CÓÓ×æ–C·Ò—ÇÇ·Ó°¢gVæ7F–öâfÇVR†²ÆfÆÆ&6²—·f"VÃÖæöFRbbæöFRçVW'•6VÆV7F÷"‚u¶FFÖf–VÆCÒ"r¶²²r%Òr“¶–b‚VÂ—&WGW&âfÆÆ&6³¶–b†VÂçG—SÓÓÒv6†V6¶&÷‚r—&WGW&âVÂæ6†V6¶VC¶–b†VÂçG—SÓÓÒvçVÖ&W"r—&WGW&âVÂçfÇVRçG&–Ò‚“ÓÓÒrsöçVÆÃ¤çVÖ&W"†VÂçfÇVR“·&WGW&âVÂçfÇVS·Ğ¢&WGW&â·§Æ3§·7FVÓ§fÇVR‚w7FVÒrÇfÇVTöb†öÆBÇÂw7FVÒr’’Æç7vW#§fÇVR‚vç7vW"rÇfÇVTöb†öÆBÇÂvç7vW"r’’ÇVW7F–öå÷G—S§fÇVR‚wVW7F–öå÷G—RrÇfÇVTöb†öÆBÇÂwVW7F–öå÷G—Rr’’ÇVW7F–öåöF–ff–7VÇG“§fÇVR‚wVW7F–öåöF–ff–7VÇG’rÇfÇVTöb†öÆBÇÂwVW7F–öåöF–ff–7VÇG’r’’ÇFV6†W%÷66÷&S§fÇVR‚wFV6†W%÷66÷&RrÇfÇVTöb†öÆBÇÂwFV6†W%÷66÷&Rr’’ÆÖ…÷66÷&S§fÇVR‚vÖ…÷66÷&RrÇfÇVTöb†öÆBÇÂvÖ…÷66÷&Rr’’ÇfW&–f–VC§fÇVR‚wfW&–f–VBrÂöÆBçfW&–f–VB—×Ó°¢Ò“°¢Ğ¢gVæ7F–öâF÷FÇ2†—FV×2’°¢f"w&÷W3ÖæWrÖ‚’ÇVçG—VCÓÇVçfW&–f–VCÓ°¢—FV×2æf÷$V6‚†gVæ7F–öâ†—FVÒ—·f"3Ö—FVÒæ2ÆæÖSÒ†2çVW7F–öå÷G—WÇÂrr’çG&–Ò‚“¶–b‚æÖR—·VçG—VB²³·&WGW&ã·Ö–b‚2çfW&–f–VB—VçfW&–f–VB²³°¢f"sÖw&÷W2ævWB†æÖR—ÇÇ¶æÖS¦æÖRÇ66÷&S£ÆÖƒ£ÆÆWfVÇ3¥µ×Ó°¢rç66÷&SÖrç66÷&SÓÖçVÆÇÇÆ2çFV6†W%÷66÷&SÓÖçVÆÃöçVÆÃ¤ÖF‚ç&÷VæB‚†rç66÷&R¶2çFV6†W%÷66÷&R’£’ó°¢ræÖƒÖræÖƒÓÖçVÆÇÇÆ2æÖ…÷66÷&SÓÖçVÆÃöçVÆÃ¤ÖF‚ç&÷VæB‚†ræÖ‚¶2æÖ…÷66÷&R’£’ó°¢ræÆWfVÇ2çW6‚†2çVW7F–öåöF–ff–7VÇG’“¶w&÷W2ç6WB†æÖRÆr“°¢Ò“°¢&WGW&â·&÷w3¤'&’æg&öÒ†w&÷W2çfÇVW2‚’’æÖ†gVæ7F–öâ†r—·f"ÆWfVÃÖræÆWfVÇ5³Ó·&WGW&â¶æÖS¦rææÖRÇ66÷&S¦rç66÷&RÆÖƒ¦ræÖ‚ÆF–ff–7VÇG“¦ÆWfVÂbfræÆWfVÇ2æWfW'’†gVæ7F–öâ‡‚—·&WGW&âƒÓÓÖÆWfVÃ·Ò“öÆWfVÃ¢rwÓ·Ò’ÇVçG—VC§VçG—VBÇVçfW&–f–VC§VçfW&–f–VGÓ°¢Ğ¢gVæ7F–öâW†—7F–ætf÷"‡&÷r’°¢f"W†ÓÒ‡7FFRæÆÄW†×7ÇÇ7FFRæW†×7ÇÅµÒ’æf–æB†gVæ7F–öâ†R—·&WGW&âRæ–CÓÓ×&÷ræW†Õö–C·Ò“·&WGW&âW†ÒbbW†ÒçVW7F–öå÷G—U÷66÷&W2bbW†ÒçVW7F–öå÷G—U÷66÷&W5·&÷rç7V&¦V7EÒÇÂµÓ°¢Ğ¢gVæ7F–öâG&u7–æ2‡æVÂÂFFÂÆ–æ¶VB’°¢æVÂæ–ææW$…DÔÃÒsÆƒ3îiÊÎYË®š)Yè¾[é~XˆcÂöƒ3ãÇ6Æ73Ò'"Ö×WFVB#îK¸^k~h¾KÚ[{.zîŠêNy¨NXÛ~™Ú.h›iKXˆn8#Â÷âr²†FFç&÷w2æÆVæwFƒòsÆF—b6Æ73Ò'"×G—R×F&ÆR#ãÇF&ÆSãÇF†VCãÇG#ãÇFƒîš)Yè³Â÷FƒãÇFƒî[é~XˆbòkºXˆcÂ÷FƒãÇFƒî™«î[ªcÂ÷FƒãÂ÷G#ãÂ÷F†VCãÇF&öG“âr¶FFç&÷w2æÖ†gVæ7F–öâ‡"—·&WGW&âsÇG#ãÇFCâr¶W62‡"ææÖR’²sÂ÷FCãÇFCâr¶W62‡"ç66÷&SÓÖçVÆÃò~[è^Š^XZ‚s§"ç66÷&R’²ròr¶W62‡"æÖƒÓÖçVÆÃò~[è^Š^XZ‚s§"æÖ‚’²sÂ÷FCãÇFCâr¶W62…66÷&UVW7F–öåG—TÖöFVÂæF–ff–7VÇF–W5·"æF–ff–7VÇG•×ÇÂ~iÊ®j~k:‚r’²sÂ÷FCãÂ÷G#âs·Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—câs¢sÇîZ¾Xiš)Yè¾YŞz{YîûÈÎ‹ù˜xÎKÉ®ˆz®Xªk~h¾8#Â÷âr’°¢sÇ6Æ73Ò'"Ö×WFVB#âr²†FFçVçG—VCöFFçVçG—VB²rš)iÊ®Z¾š)Yè¾ûÈÎKˆŞ{«>XZ^iÊÎjÊk~h¾8"s¢rr’²†FFçVçfW&–f–VCöFFçVçfW&–f–VB²rš)[	®iÊ®ZûxZ~XéşXÛ~jZû8"s¢rr’²~{Ë®[	[é~Xˆnh‰nkºXˆny¨Nš)Yè¾KùŞZÙK‹®[è^Š^XZûÈÎKˆŞXø.Kˆî{¹şŠê8#Â÷âr°¢†FFæW†—7F–æræÆVæwFƒòsÆFWF–Ç3ãÇ7VÖÖ'“îiú^yÈ¾iÊÎzy[{.iÈy¨Br¶FFæW†—7F–æræÆVæwF‚²ršš)Yè³Â÷7VÖÖ'“ãÇâr¶FFæW†—7F–æræÖ†gVæ7F–öâ‡"—·&WGW&âW62‡"ææÖR’²~ûÉ¢r¶W62‡"ç66÷&SÓÖçVÆÃò~(	Bs§"ç66÷&R’²ròr¶W62‡"æÖƒÓÖçVÆÃò~(	Bs§"æÖ‚“·Ò’æ¦ö–â‚~ûÉ²r’²sÂ÷ãÂöFWF–Ç3ãÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"FF×&WÆ6R×G—W3îyJKˆ®ikk~h¾i»şhÚ.iÊÎzy[{.iÈš)Yè¾[é~XˆcÂöÆ&VÃâs¢rr’°¢‚Æ–æ¶VCòsÇîX[>ˆNˆ>Šù^YîûÈÎXÛ>Xúşh¨®‹ù˜xÎy¨N[é~Xˆni»NikX‹š)Yè¾Xˆnié8#Â÷âs¢rr’°¢sÆF—b6Æ73Ò'"Öfö÷FW"#âr²†Æ–æ¶VCòsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"×&–Ö'’"FF×7–æ2×G—W3îKùŞZÙ[›ni»Nikš)Yè¾[é~XˆcÂö'WGFöãâs¢rr’²sÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FF×#Ò'6fR#îXú®KùŞZÙŠù^š)ƒÂö'WGFöããÂöF—cãÇ&öÆSÒ'7FGW2"FF×7–æ2Öæ÷FSãÂ÷âs°¢Ğ¢gVæ7F–öâFV6÷&FR†Ö–âÇ&÷rÆ7G‚Æ’Ææ÷FRÆ†öö·2’°¢f"Æ7D&F6ƒÕµÓ°¢f"÷fW'f–WsÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w6V7F–öâr“¶÷fW'f–Wræ6Æ74æÖSÒw"×&V6÷&BÖ÷fW'f–Wrs¶÷fW'f–Wrç6WDGG&–'WFR‚v&–ÖÆ&VÂrÂ~jZûjh.Šx‚r“°¢Ö–âçVW'•6VÆV7F÷"‚rç"×&W7VÇB×F÷r’ægFW"†÷fW'f–Wr“°¢f"æVÃÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w6V7F–öâr“·æVÂæ6Æ74æÖSÒw"×G—R×7–æ2"Ö–ç6–v‡Bs°¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×&W÷'B×6V7F–öãÒ'VW7F–öç2%Òâç"Öfö÷FW"r’ç&WÆ6Uv—F‚‡æVÂ“°¢gVæ7F–öâWFFR‚—°¢f"—FV×3ÖÆ—fR†Ö–âÇ&÷r’ÇVæF–æsÖ—FV×2æf–ÇFW"†gVæ7F–öâ†’—·&WGW&âVW7F–öå7FFR†’çÆ’æ2’ç&V6öç2æÆVæwFƒ·Ò’ÇfW&–f–VCÖ—FV×2æf–ÇFW"†gVæ7F–öâ†’—·&WGW&â’æ2çfW&–f–VC·Ò’æÆVæwFƒ°¢f"F÷FÃ×&÷rç&W7VÇBçF÷FÇÇÇ·Ó°¢÷fW'f–Wræ–ææW$…DÔÃÒsÆF—b6Æ73Ò'"Ö6†V6²ÖÖWG&–72#ãÆF—cãÆ#âr¶—FV×2æÆVæwF‚²sÂö#ãÇ7ãî[{.ŠønXŠ¾š)yºãÂ÷7ããÂöF—cãÆF—cãÆ#âr·VæF–æræÆVæwF‚²sÂö#ãÇ7ãîZHN™ÈŠhjZû“Â÷7ããÂöF—cãÆF—cãÆ#âr·fW&–f–VB²ròr¶—FV×2æÆVæwF‚²sÂö#ãÇ7ãî[{.ZûxZ~XéşXÛsÂ÷7ããÂöF—câr²‡F÷FÂç66÷&RÖçVÆÃòsÆF—cãÆ#âr¶W62‡F÷FÂç66÷&R’²‡F÷FÂæÖ‚ÖçVÆÃòròr¶W62‡F÷FÂæÖ‚“¢rr’²sÂö#ãÇ7ãîXÛ~™Ú.h›iKh¾XˆcÂ÷7ããÂöF—câs¢rr’²sÂöF—cãÇâr²‡VæF–æræÆVæwFƒò~XXj8iú^Kˆ¾ikj~X{®y¨N{Ë®ZKh‰nXk.z¨ûÈÎX[nKÙš)yºîK™şXúş[^[Èiú^yÈ¾8"s¢~iÊ®Xùxëiˆîi‹î{Ë®ZKh‰nXk.z¨ûÉ¾K¸ŞŠû~ZûxZ~XéşXÛ~zîŠêNYîi»Nikš)Yè¾[é~Xˆn8"r’²sÂ÷âs°¢f"VÆ–v–&ÆSÖ—FV×2æf–ÇFW"†gVæ7F–öâ†’—·&WGW&â’æ2çfW&–f–VBbbVW7F–öå7FFR†’çÆ’æ2’ç&V6öç2æÆVæwFƒ·Ò“°¢÷fW'f–Wræ–ç6W'DF¦6VçD…DÔÂ‚v&Vf÷&VVæBrÂsÆF—b6Æ73Ò'"Ö'VÆ²Ö7F–öç2#ãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"×&–Ö'’"FFÖ6öæf—&ÒÖ6ÆVâr²‚VÆ–v–&ÆRæÆVæwFƒòvF—6&ÆVBs¢rr’²sîzîŠêNXZ˜:iz[È.[‹š)ûÈ‚r¶VÆ–v–&ÆRæÆVæwF‚²~ûÈ“Âö'WGFöãâr²‡VæF–æræÆVæwFƒòsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FF×6†÷r×VæF–æsîiú^yÈ¾™ÈZHNyny¨Br·VæF–æræÆVæwF‚²rš)ƒÂö'WGFöãâs¢rr’²†Æ7D&F6‚æÆVæwFƒòsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FF×VæFòÖ&F6ƒîi*N™HiÊÎjÊh›˜xşzîŠêCÂö'WGFöãâs¢rr’²sÂöF—cãÇ6Æ73Ò'"Ö'VÆ²Ö†–çB#î[ú¾˜	şkXşŠxXéşš)KˆîKÙÎzÙNhŠ®Y»îYîûÈÎXúşKˆjÊzîŠêNiz{Ë®ZK8Xk.z¨h‰nŠønXŠ¾yix+y¨Nš)yºî8.[È.[‹š)K¸Ş™ÈXÙ^xºÎZHNynûÉ¾zîŠêNYîŠû~KùŞZÙ8#Â÷âr“°¢÷fW'f–WrçVW'•6VÆV7F÷"‚u¶FFÖ6öæf—&ÒÖ6ÆVåÒr’æöæ6Æ–6³ÖgVæ7F–öâ‚—°¢f"6†÷6VãÖÆ—fR†Ö–âÇ&÷r’æf–ÇFW"†gVæ7F–öâ†’—·&WGW&â’æ2çfW&–f–VBbbVW7F–öå7FFR†’çÆ’æ2’ç&V6öç2æÆVæwFƒ·Ò’Æf—'7C°¢Æ7D&F6ƒÖ6†÷6VâæÖ†gVæ7F–öâ†’—·&WGW&â7G&–ær†’çæ–B“·Ò“°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’æf÷$V6‚†gVæ7F–öâ†â—¶–b†Æ7D&F6‚æ–æ6ÇVFW2†âæFF6WBçVW7F–öâ’—·f"&÷ƒÖâçVW'•6VÆV7F÷"‚u¶FFÖf–VÆC×fW&–f–VEÒr“¶&÷‚æ6†V6¶VC×G'VS¶f—'7CÖf—'7GÇÆ&÷ƒ·×Ò“°¢–b†f—'7B–f—'7BæF—7F6„WfVçB†æWrWfVçB‚v–çWBrÇ¶'V&&ÆW3§G'VWÒ’“°¢æ÷FR‚~[{.h›˜xşzîŠêBr¶6†÷6VâæÆVæwF‚²rš)ûÉ¾[È.[‹š)KùŞyY[è^ZHNynûÈÎzîŠêN{¹>iéÎ[	®iÊ®KùŞZÙ8"r“°¢f"f–ÇFW#ÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×#Ò&f–ÇFW#¦6öæf—&Ò%Òr“¶–b‡VæF–æræÆVæwF‚bff–ÇFW"–f–ÇFW"æ6Æ–6²‚“°¢G&6²‚wW%ö6öæf—&Õö6ÆVârÇ¶6÷VçC¦6†÷6VâæÆVæwF‡Ò“°¢Ó°¢f"VæFóÖ÷fW'f–WrçVW'•6VÆV7F÷"‚u¶FF×VæFòÖ&F6…Òr“¶–b‡VæFò—VæFòæöæ6Æ–6³ÖgVæ7F–öâ‚—·f"–G3ÖÆ7D&F6‚ç6Æ–6R‚’Æf—'7C¶Æ7D&F6ƒÕµÓ¶Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’æf÷$V6‚†gVæ7F–öâ†â—¶–b†–G2æ–æ6ÇVFW2†âæFF6WBçVW7F–öâ’—·f"&÷ƒÖâçVW'•6VÆV7F÷"‚u¶FFÖf–VÆC×fW&–f–VEÒr“¶&÷‚æ6†V6¶VCÖfÇ6S¶f—'7CÖf—'7GÇÆ&÷ƒ·×Ò“¶–b†f—'7B–f—'7BæF—7F6„WfVçB†æWrWfVçB‚v–çWBrÇ¶'V&&ÆW3§G'VWÒ’“¶æ÷FR‚~[{.i*N™HiÊÎjÊh›˜xşzîŠêNûÈÎX[nK¹nš)yºîy¨NjZûx«nhKˆŞXù8"r“·Ó°¢f"6†÷sÖ÷fW'f–WrçVW'•6VÆV7F÷"‚u¶FF×6†÷r×VæF–æuÒr“¶–b‡6†÷r—6†÷ræöæ6Æ–6³ÖgVæ7F–öâ‚—·f"f–ÇFW#ÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×#Ò&f–ÇFW#¦6öæf—&Ò%Òr“¶–b†f–ÇFW"—¶f–ÇFW"æ6Æ–6²‚“¶f–ÇFW"ç67&öÆÄ–çFõf–Wr‡¶&Æö6³¢væV&W7BwÒ“·×Ó°¢—FV×2æf÷$V6‚†gVæ7F–öâ†—FVÒ—·f"–æfó×VW7F–öå7FFR†—FVÒçÆ—FVÒæ2’ÆæöFSÔ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’æf–æB†gVæ7F–öâ†â—·&WGW&ââæFF6WBçVW7F–öãÓÓÕ7G&–ær†—FVÒçæ–B“·Ò“¶–b‚æöFR—&WGW&ã°¢æöFRæFF6WBææVVG46öæf—&ÓÕ7G&–ær†–æfòç&V6öç2æÆVæwFƒã“¶æöFRæFF6WBçVçfW&–f–VCÕ7G&–ær‚–æfòçfW&–f–VB“°¢f"'&–VcÖæöFRçVW'•6VÆV7F÷"‚rç"×&V6÷&BÖ'&–Vbr“¶–b‚'&–Vb—¶'&–VcÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w6ÖÆÂr“¶'&–Vbæ6Æ74æÖSÒw"×&V6÷&BÖ'&–Vbs¶æöFRçVW'•6VÆV7F÷"‚w7VÖÖ'“ç7âr’æVæD6†–ÆB†'&–Vb“·Ğ¢'&–VbçFW‡D6öçFVçCÕ¶—FVÒæ2çVW7F–öå÷G—WÇÂ~iÊ®Xˆn{²rÆ–æfòç&V6öç2æÆVæwFƒö–æfòç&V6öç2æ¦ö–â‚r+rr“¦–æfòçfW&–f–VCò~[{.jZû’s¢~iÊ®ZûxZ~XéşXÛruÒæ¦ö–â‚r+rr“°¢Ò“°¢f"FF×F÷FÇ2†—FV×2“¶FFæW†—7F–æsÖW†—7F–ætf÷"‡&÷r“¶G&u7–æ2‡æVÂÆFFÂ&÷ræW†Õö–B“°¢f"7V&Ö—C×æVÂçVW'•6VÆV7F÷"‚u¶FF×7–æ2×G—W5Òr’Ç&WÆ6S×æVÂçVW'•6VÆV7F÷"‚u¶FF×&WÆ6R×G—W5Òr“°¢gVæ7F–öâVæ&ÆVB‚—¶–b‡7V&Ö—B—7V&Ö—BæF—6&ÆVCÒFFç&÷w2æÆVæwF‡ÇÆFFçVçfW&–f–VCãÇÂ&WÆ6Rbb&WÆ6Ræ6†V6¶VC·Ğ¢–b‡&WÆ6R—&WÆ6Ræöæ6†ævSÖVæ&ÆVC¶Væ&ÆVB‚“°¢–b‡7V&Ö—B—7V&Ö—Bæöæ6Æ–6³Ö7–æ2gVæ7F–öâ‚—°¢f"66WFVCÒ&WÆ6Rbg&WÆ6Ræ6†V6¶VC·7V&Ö—BæF—6&ÆVC×G'VS°¢G'—°¢f"6fVCÖv—B†öö·2ç6fR‚“¶–b‚6fVB—&WGW&ã°¢f"&Wf–WsÖv—B’†7G‚Âw&Wf–Wu÷G—W2rÇ·&WVW7Eö–C§6fVBç&WVW7Eö–BÇ&Wf—6–öã§6fVBç&Wf—6–öçÒ“°¢–b‚Ö–âæ—46öææV7FVB—&WGW&ã°¢f"7F—fSÖÖ–âçVW'•6VÆV7F÷"‚rç"×G—R×7–æ2r“°¢–b‡&Wf–WræW†—7F–æræÆVæwF‚bb66WFVB—µ·7FFRæW†×2Ç7FFRæÆÄW†×5Òæf÷$V6‚†gVæ7F–öâ†Æ—7B—²†Æ—7GÇÅµÒ’æf÷$V6‚†gVæ7F–öâ†R—¶–b†Ræ–CÓÓ×&÷ræW†Õö–B—¶RçVW7F–öå÷G—U÷66÷&W3ÖRçVW7F–öå÷G—U÷66÷&W7ÇÇ·Ó¶RçVW7F–öå÷G—U÷66÷&W5·&÷rç7V&¦V7EÓ×&Wf–WræW†—7F–æs·×Ò“·Ò“¶–b†7F—fRç&Vg&W6‚–7F—fRç&Vg&W6‚‚“¶7F—fRçVW'•6VÆV7F÷"‚u¶FF×7–æ2Öæ÷FUÒr’çFW‡D6öçFVçCÒ~Šù^š)[{.KùŞZÙûÉ¾iÊÎzyš)Yè¾[{.XùyIşXùXÉnûÈÎŠû~˜xŞikjZûYîzîŠêNi»şhÚ.8"s·&WGW&ã·Ğ¢–b‡&Wf–WrçVçfW&–f–VB—F‡&÷ræWrW'&÷"‚~Šû~XXZûxZ~XéşXÛ~jZû[{.Xˆn{¾š)yºâr“°¢f"6fVEG—W3Öv—B’†7G‚Âw7–æ5÷G—W2rÇ·&WVW7Eö–C§6fVBç&WVW7Eö–BÇ&Wf—6–öã§6fVBç&Wf—6–öâÆW†Õ÷fW'6–öã§&Wf–WræW†Õ÷fW'6–öâÇ&WÆ6S¦66WFVGÒ“°¢·7FFRæW†×2Ç7FFRæÆÄW†×5Òæf÷$V6‚†gVæ7F–öâ†Æ—7B—²†Æ—7GÇÅµÒ’æf÷$V6‚†gVæ7F–öâ†R—¶–b†Ræ–CÓÓ×6fVEG—W2æW†Õö–B–RçVW7F–öå÷G—U÷66÷&W3×6fVEG—W2çVW7F–öå÷G—U÷66÷&W3·Ò“·Ò“°¢–b‚Ö–âæ—46öææV7FVB—&WGW&ã°¢Ö–âçVW'•6VÆV7F÷"‚rç"×G—R×7–æ2r’æ–ææW$…DÔÃÒsÆƒ3îŠù^š)Kˆîš)Yè¾[é~Xˆn[{.KùŞZÙƒÂöƒ3ãÇî[{.i»NikiÊÎYË¢r¶W62‡&÷rç7V&¦V7B’²~y¨Br·&Wf–Wrç&÷w2æÆVæwF‚²ršš)Yè¾8.i[NzyY(Îh¾XˆnKùŞhÈXéşj~8#Â÷ãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FF×f–Wr×G—W3îiú^yÈ¾š)Yè¾XˆniéÂö'WGFöãâs°¢Ö–âçVW'•6VÆV7F÷"‚u¶FF×f–Wr×G—W5Òr’æöæ6Æ–6³ÖgVæ7F–öâ‚—¶–b†7G‚æ6äÆVfRbb7G‚æ6äÆVfR‚’—&WGW&ã¶–b†7G‚æF—7÷6R–7G‚æF—7÷6R‚“·v–æF÷rå66÷&UVW7F–öåG—TæÇ—6—2æ÷Vâ‡&÷rç7V&¦V7B“·Ó°¢æ÷FR‚~Šù^š)Kˆîš)Yè¾[é~Xˆn[{.KùŞZÙ‚r“·G&6²‚wW%÷G—U÷7–æ2rÇ·G—W3§&Wf–Wrç&÷w2æÆVæwF‚Ç&WÆ6VC§&Wf–WræW†—7F–æræÆVæwFƒãÒ“°¢Ö6F6‚†R—¶–b†Ö–âæ—46öææV7FVB—¶æ÷FR‚~š)Yè¾[é~XˆniÊ®i»NikûÉ¢r¶RæÖW76vRÇG'VR“·f"7F—fSÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×7–æ2×G—W5Òr“¶–b†7F—fR–7F—fRæF—6&ÆVCÖfÇ6S·×Ğ¢Ó°¢f"7F—fTf–ÇFW#ÖÖ–âçVW'•6VÆV7F÷"‚u¶FF×%ãÒ&f–ÇFW#¢%Õ¶&–×&W76VC×G'VUÒr“¶–b†7F—fTf–ÇFW"–7F—fTf–ÇFW"æ6Æ–6²‚“°¢Ğ¢æVÂç&Vg&W6ƒ×WFFS·WFFR‚“°¢–b‡v–æF÷rå66÷&UW$VçG'”öæÇ“ÓÓ×G'VR—&÷rç&W7VÇBçVW7F–öç2æf÷$V6‚†gVæ7F–öâ‡—°¢f"æöFSÔ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’æf–æB†gVæ7F–öâ†â—·&WGW&ââæFF6WBçVW7F–öãÓÓÕ7G&–ær‡æ–B“·Ò“°¢–b‚æöFR—&WGW&ã·f"6÷W&6SÖæöFRçVW'•6VÆV7F÷"‚rç"×6÷W&6Sâç"ÖföÆBÖ&öG’r“°¢–b‡ç&÷f–FVE÷&VfW&Væ6R—·f"&VfW&Væ6SÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“·&VfW&Væ6Ræ6Æ74æÖSÒw"ÖÆVv7’×&VfW&Væ6Rs·&VfW&Væ6Ræ–ææW$…DÔÃÒsÇ7VÖÖ'“î[{.ŠønXŠ¾y¨NXø.ˆ>zÙNjƒÂ÷7VÖÖ'“ãÇ6Æ73Ò'"×FW‡B#âr¶W62‡ç&÷f–FVE÷&VfW&Væ6R’²sÂ÷âs·6÷W&6RæVæD6†–ÆB‡&VfW&Væ6R“·Ğ¢–b‡çVæ6W'F–çF–W2bgçVæ6W'F–çF–W2æÆVæwF‚—·f"æ÷FW3ÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vFWF–Ç2r“¶æ÷FW2æ6Æ74æÖSÒw"ÖÆVv7’×&VfW&Væ6Rs¶æ÷FW2æ–ææW$…DÔÃÒsÇ7VÖÖ'“î[è^jZûZH~k:‚+rr·çVæ6W'F–çF–W2æÆVæwF‚²sÂ÷7VÖÖ'“ãÇVÃâr·çVæ6W'F–çF–W2æÖ†gVæ7F–öâ‡2—·&WGW&âsÆÆ“âr¶W62‡2’²sÂöÆ“âs·Ò’æ¦ö–â‚rr’²sÂ÷VÃâs·6÷W&6RæVæD6†–ÆB†æ÷FW2“·Ğ¢Ò“°¢Æ—fR†Ö–âÇ&÷r’æf÷$V6‚†gVæ7F–öâ†—FVÒ—·f"æöFSÔ'&’æg&öÒ†Ö–âçVW'•6VÆV7F÷$ÆÂ‚u¶FF×VW7F–öåÒr’’æf–æB†gVæ7F–öâ†â—·&WGW&ââæFF6WBçVW7F–öãÓÓÕ7G&–ær†—FVÒçæ–B“·Ò“¶–b†æöFRbgVW7F–öå7FFR†—FVÒçÆ—FVÒæ2’ç&V6öç2æÆVæwF‚—¶æöFRæ÷Vã×G'VS·f"VF—CÖæöFRçVW'•6VÆV7F÷"‚rç"ÖVF—Br“¶–b†VF—B–VF—Bæ÷Vã×G'VS·×Ò“°¢Ö–âçVW'•6VÆV7F÷$ÆÂ‚rç"×VW7F–öâ–çWBÂç"×VW7F–öâFW‡F&VÂç"×VW7F–öâ6VÆV7Br’æf÷$V6‚†gVæ7F–öâ†VÂ—¶VÂæFDWfVçDÆ—7FVæW"‚v–çWBrÆgVæ7F–öâ‚—°¢–b†VÂæFF6WBæf–VÆBÓÒwfW&–f–VBrbfVÂæFF6WBæf–VÆBÓÒv6÷'&V7FVBr—·f"fW&–f–VCÖVÂæ6Æ÷6W7B‚u¶FF×VW7F–öåÒr’çVW'•6VÆV7F÷"‚u¶FFÖf–VÆC×fW&–f–VEÒr“¶–b‡fW&–f–VB—fW&–f–VBæ6†V6¶VCÖfÇ6S·Ğ¢WFFR‚“°¢Ò“·Ò“°¢Ğ¢gVæ7F–öâ&VfW&Væ6W2‡W6W"—·G'—·&WGW&â¥4ôâç'6R†Æö6Å7F÷&vRævWD—FVÒ‚w7E÷W%öæÇ—6—5÷&VfW&Væ6W5÷còr·W6W"—ÇÂw·Òr“·Ö6F6‚…ò—·&WGW&â·Ó·×Ğ¢gVæ7F–öâ6öæf–wW&R††÷7BÇ&÷rÆ†öö·2’°¢–b‡v–æF÷rå66÷&UW$VçG'”öæÇ“ÓÓ×G'VR—¶†÷7BçFW‡D6öçFVçCÒ~Šù^XÛ~Xˆniéi¨.iÊ®[ÈiKîûÈÎŠû~‹ùNY¹îŠù^š)[Ù^XZ^8"s·&WGW&ã·Ğ¢f"W6W#Ö†öö·2çW6W'ÇÅ7G&–ær‡7FFRçW6W"bg7FFRçW6W"æ–GÇÂrr’Ç&WVW7D–CÖ7'—Fòç&æFöÕUT”B‚’ÆG&gD–CÖ7'—Fòç&æFöÕUT”B‚’ÆöÆC×&÷ræ÷F–öç7ÇÇ·ÒÇ6fVC×&VfW&Væ6W2‡W6W"’ÆFVfVÇG3Õ²w7G&VæwF‡2rÂvF–ff–7VÇG’rÂv6W6W2rÂw6öÇWF–öç2rÂwGFW&ç2uÓ°¢f"6VÆV7FVDÖöGVÆW3Ô'&’æ—4'&’‡6fVBæÖöGVÆW2“÷6fVBæÖöGVÆW2æf–ÇFW"†gVæ7F–öâ†²—·&WGW&âæÖW5¶µÓ·Ò“¦FVfVÇG3°¢†÷7Bæ–ææW$…DÔÃÒsÇ6V7F–öâ6Æ73Ò'‚Ö7&VFR#ãÆF—b6Æ73Ò'‚×6V7F–öâ×F—FÆR#ãÆF—cãÆƒ#îyIşh‰’XˆniéÂöƒ#ãÇâr¶W62‡&÷rç7V&¦V7B’²r+rr·&÷rç&W7VÇBçVW7F–öç2æÆVæwF‚²rš)‚+ry»Nhê^KÛşyJ[{.KùŞZÙy¨Nš)yºîKˆîKÙÎzÙN8#Â÷ãÂöF—cãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'"Ö'WGFöâ"FFÖ&6²×&V6÷&Cî‹ùNY¹îŠù^š)ƒÂö'WGFöããÂöF—cãÆf÷&Ò6Æ73Ò'"×&V6÷&BÖæÇ—6—2#ãÆÆ&VÃîXˆniéˆÈ>Y»CÇ6VÆV7BæÖSÒ'66÷R#ãÆ÷F–öâfÇVSÒ&ÆÂ#îi[N[ÊŠù^XÛsÂö÷F–öããÆ÷F–öâfÇVSÒ&Æ÷76W2#îZKXˆnš)KÉXXƒÂö÷F–öããÆ÷F–öâfÇVSÒ'6VÆV7FVB#îhÈ~Zé®š)yºãÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃãÆf–VÆG6WBFF×VW7F–öâ×–6·2†–FFVããÆÆVvVæCî˜hºš)yºãÂöÆVvVæCâr·&÷rç&W7VÇBçVW7F–öç2æÖ†gVæ7F–öâ‡—·&WGW&âsÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"æÖSÒ'VW7F–öâ"fÇVSÒ"r¶W62‡æÆ&VÂ’²r#îzÊÂr¶W62‡æÆ&VÂ’²rš)ƒÂöÆ&VÃâs·Ò’æ¦ö–â‚rr’²sÂöf–VÆG6WCãÆÆ&VÃîKÚx›XŠ¾h;>K¨nŠz>K¸K˜ûÉşûÈ˜Z¾ûÈ“ÇFW‡F&VæÖSÒ&vöÂ"Ö†ÆVæwFƒÒ#3"&÷w3Ò#""Æ6V†öÆFW#Ò.Kè¾Zh.ûÉ®i[ZÚnZJ~š)K‹¾ŠhKŠ.XˆnYÊY:®˜xÎûÉò#ãÂ÷FW‡F&VãÂöÆ&VÃãÆFWF–Ç26Æ73Ò'‚Ö6öçFW‡B#ãÇ7VÖÖ'“îi»NZI®Šëî{ÚãÂ÷7VÖÖ'“ãÆÆ&VÃîŠë.Šz>ŠúnyZSÇ6VÆV7BæÖSÒ&FWF–Â#ãÆ÷F–öâfÇVSÒ&'&–Vb#îXú®Šë.X[>™Jîx+“Âö÷F–öããÆ÷F–öâfÇVSÒ'7FæF&B#îŠë.kˆ^X[>™JîjÚ^šªCÂö÷F–öããÆ÷F–öâfÇVSÒ&FWF–ÆVB#îK¸îYû®zKˆjÚ^jÚ^Šë#Âö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃãÆF—b6Æ73Ò'‚ÖÖöGVÆW2#âr´ö&¦V7Bæ¶W—2†æÖW2’æÖ†gVæ7F–öâ†²—·&WGW&âsÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"æÖSÒ&ÖöGVÆR"fÇVSÒ"r¶²²r"r²‡6VÆV7FVDÖöGVÆW2æ–æ6ÇVFW2†²“òv6†V6¶VBs¢rr’²sâr¶æÖW5¶µÒ²sÂöÆ&VÃâs·Ò’æ¦ö–â‚rr’²sÂöF—cãÆÆ&VÃîXÙ^‹Úî‹ùŠÎKˆ®™™Ç6VÆV7BæÖSÒ&'VFvWB#ãÆ÷F–öâfÇVSÒ#2#ã2Xˆn™)óÂö÷F–öããÆ÷F–öâfÇVSÒ#‚#ã‚Xˆn™)óÂö÷F–öããÆ÷F–öâfÇVSÒ#R#ãRXˆn™)óÂö÷F–öããÆ÷F–öâfÇVSÒ#3#ã3Xˆn™)óÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃî[›N{ªsÆ–çWBæÖSÒ&w&FR"Ö†ÆVæwFƒÒ#C"fÇVSÒ"r¶W62‡6fVBæw&FSóööÆBæw&FR’²r#ãÂöÆ&VÃãÆÆ&VÃî[{.ZÚnˆÈ>Y»CÆ–çWBæÖSÒ'&ævR"Ö†ÆVæwFƒÒ##"fÇVSÒ"r¶W62‡6fVBæÆV&æ–æu÷&ævSóööÆBæÆV&æ–æu÷&ævR’²r#ãÂöÆ&VÃãÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"æÖSÒ'66ç2"6†V6¶VCî{¹>Y[{.KùŞZÙXéşY»îynŠz>Y»î[Ú#ÂöÆ&VÃãÆÆ&VÂ6Æ73Ò'"Ö6†V6²#ãÆ–çWBG—SÒ&6†V6¶&÷‚"æÖSÒ&†—7F÷'’"r²‡6fVBçW6Uö66÷VçEö†—7F÷'“ÓÓÖfÇ6Sòrs¢v6†V6¶VBr’²sî{¹>YiÊÎ‹JnXû~XènXû.h‰{º“ÂöÆ&VÃãÂöFWF–Ç3ãÇ6Æ73Ò'"Ö×WFVB#îŠønXŠ¾KˆîyIşh‰XˆniéYNkhˆ	rjÊûÉ¾iú^yÈ¾hª^Y®8h˜¾XªjZûY(Îi»Nikš)Yè¾[é~XˆnKˆŞkhˆ	~jÊi[8#Â÷ãÆÆ&VÂ6Æ73Ò'"Ö6†V6²"Ö6öç6VçB#ãÆ–çWBG—SÒ&6†V6¶&÷‚"æÖSÒ&6öç6VçB"&WV—&VCîYÎhHş[n[{.KùŞZÙy¨Nš)yºî8KÙÎzÙNKˆîh›iKXˆnûÈÎKº^Xø®XXŠëKÛşyJy¨NXéşY»îY(Îˆ>Šù^i[XÎXù˜{¹’’iÈŞXªyIşh‰Xˆnié8#ÂöÆ&VÃãÆF—b6Æ73Ò'"Öfö÷FW"#ãÇ7â&öÆSÒ'7FGW2"FFÖæÇ—6—2Öæ÷FSãÂ÷7ããÆ'WGFöâ6Æ73Ò'"Ö'WGFöâ"×&–Ö'’"G—SÒ'7V&Ö—B#î[ÈZx¾Xˆnié+rkhˆ	rjÊÂö'WGFöããÂöF—cãÂöf÷&ÓãÂ÷6V7F–öãâs°¢f"f÷&ÓÖ†÷7BçVW'•6VÆV7F÷"‚vf÷&Òr“¶f÷&ÒæVÆVÖVçG2æFWF–ÂçfÇVSÕ²v'&–VbrÂw7FæF&BrÂvFWF–ÆVBuÒæ–æ6ÇVFW2‡6fVBæFWF–Â“÷6fVBæFWF–Ã¢w7FæF&Bs¶f÷&ÒæVÆVÖVçG2æ'VFvWBçfÇVSÕ³2Ã‚ÃRÃ3Òæ–æ6ÇVFW2‡6fVBçF–ÖUö'VFvWEöÖ–çWFW2“õ7G&–ær‡6fVBçF–ÖUö'VFvWEöÖ–çWFW2“¢sRs°¢†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ&6²×&V6÷&EÒr’æöæ6Æ–6³ÖgVæ7F–öâ‚—¶†öö·2æ÷Vâ‡&÷rç&WVW7Eö–B“·Ó°¢f÷&ÒæVÆVÖVçG2ç66÷Ræöæ6†ævSÖgVæ7F–öâ‚—¶f÷&ÒçVW'•6VÆV7F÷"‚u¶FF×VW7F–öâ×–6·5Òr’æ†–FFVã×F†—2çfÇVRÓÒw6VÆV7FVBs·Ó°¢f÷&Òæöç7V&Ö—CÖ7–æ2gVæ7F–öâ†R—°¢Rç&WfVçDFVfVÇB‚“·f"7V&Ö—CÖf÷&ÒçVW'•6VÆV7F÷"‚u·G—S×7V&Ö—EÒr’Ç7FGW3Öf÷&ÒçVW'•6VÆV7F÷"‚u¶FFÖæÇ—6—2Öæ÷FUÒr“¶–b…7G&–ær‡7FFRçW6W"bg7FFRçW6W"æ–GÇÂrr’Ó×W6W"—·7FGW2çFW‡D6öçFVçCÒ~‹JnXû~[{.Xˆ~hÚ.ûÈÎŠû~˜xŞikh™>[ÈŠù^XÛrs·&WGW&ã·Ğ¢f"6VÆV7FVCÔ'&’æg&öÒ†f÷&ÒçVW'•6VÆV7F÷$ÆÂ‚u¶æÖS×VW7F–öåÓ¦6†V6¶VBr’’æÖ†gVæ7F–öâ†"—·&WGW&â"çfÇVS·Ò“°¢–b‚f÷&ÒæVÆVÖVçG2æ6öç6VçBæ6†V6¶VB—·7FGW2çFW‡D6öçFVçCÒ~Šû~XXzîŠêB’XˆniéŠûNiˆâs·&WGW&ã·Ğ¢–b†f÷&ÒæVÆVÖVçG2ç66÷RçfÇVSÓÓÒw6VÆV7FVBrbb6VÆV7FVBæÆVæwF‚—·7FGW2çFW‡D6öçFVçCÒ~Šû~ˆ{>[	˜hºKˆ˜>š)‚s·&WGW&ã·Ğ¢7V&Ö—BæF—6&ÆVC×G'VS·7FGW2çFW‡D6öçFVçCÒ~jÚ>YÊX‰¾[»®Xˆnié(
bs°¢G'—°¢f"÷F–öç3Ôö&¦V7Bæ76–vâ‡·ÒÆöÆBÇ¶6öæf–u÷fW'6–öã£"ÇW'÷6S¢væÇ—6—2rÇW6U÷6÷W&6U÷66ç3¦f÷&ÒæVÆVÖVçG2ç66ç2æ6†V6¶VBÇW6Uö66÷VçEö†—7F÷'“¦f÷&ÒæVÆVÖVçG2æ†—7F÷'’æ6†V6¶VBÇ&Wf–Wuö&Vf÷&UöæÇ—6—3¦fÇ6RÆæÇ—6—5÷66÷S¦f÷&ÒæVÆVÖVçG2ç66÷RçfÇVRÇ6VÆV7FVE÷VW7F–öç3§6VÆV7FVBÆFWF–Ã¦f÷&ÒæVÆVÖVçG2æFWF–ÂçfÇVRÇF–ÖUö'VFvWEöÖ–çWFW3¤çVÖ&W"†f÷&ÒæVÆVÖVçG2æ'VFvWBçfÇVR’Æw&FS¦f÷&ÒæVÆVÖVçG2æw&FRçfÇVRÆÆV&æ–æu÷&ævS¦f÷&ÒæVÆVÖVçG2ç&ævRçfÇVRÆvöÃ¦f÷&ÒæVÆVÖVçG2ævöÂçfÇVRÆÖöGVÆW3¤'&’æg&öÒ†f÷&ÒçVW'•6VÆV7F÷$ÆÂ‚u¶æÖSÖÖöGVÆUÓ¦6†V6¶VBr’’æÖ†gVæ7F–öâ†"—·&WGW&â"çfÇVS·Ò—Ò“°¢f"FFÖv—B†öö·2æ’‚væÇ—¦U÷&V6÷&BrÇ·&WVW7Eö–C§&WVW7D–BÆG&gEö–C¦G&gD–BÇ6÷W&6U÷&WVW7Eö–C§&÷rç&WVW7Eö–BÇ6÷W&6U÷&Wf—6–öã§&÷rç&Wf—6–öâÆ6öç6VçC§G'VRÆ÷F–öç3¦÷F–öç7Ò“°¢–b‚†÷7Bæ—46öææV7FVB—&WGW&ã°¢G'—¶Æö6Å7F÷&vRç6WD—FVÒ‚w7E÷W%öæÇ—6—5÷&VfW&Væ6W5÷còr·W6W"Ä¥4ôâç7G&–æv–g’‡¶FWF–Ã¦÷F–öç2æFWF–ÂÇF–ÖUö'VFvWEöÖ–çWFW3¦÷F–öç2çF–ÖUö'VFvWEöÖ–çWFW2Æw&FS¦÷F–öç2æw&FRÆÆV&æ–æu÷&ævS¦÷F–öç2æÆV&æ–æu÷&ævRÆÖöGVÆW3¦÷F–öç2æÖöGVÆW2ÇW6Uö66÷VçEö†—7F÷'“¦÷F–öç2çW6Uö66÷VçEö†—7F÷'—Ò’“·Ö6F6‚…ò—·Ğ¢G&6²‚wW%öæÇ—6—5ög&öÕ÷&V6÷&BrÇ·VW7F–öç3§&÷rç&W7VÇBçVW7F–öç2æÆVæwF‚Ç66÷S¦÷F–öç2ææÇ—6—5÷66÷WÒ“¶v—B†öö·2ç7F'FVB†FFç&WVW7Eö–B“°¢Ö6F6‚†W'"—¶–b††÷7Bæ—46öææV7FVB—·7FGW2çFW‡D6öçFVçCÖW'"æÖW76vR²~ûÉ¾˜xŞŠù^KˆŞ˜xŞZHŞŠêjÊ8"s·7V&Ö—BæF—6&ÆVCÖfÇ6S·×Ğ¢Ó°¢Ğ¢v–æF÷rå66÷&UW%&V6÷&G3×¶f–VÆG3¦f–VÆG2ÆFV6÷&FS¦FV6÷&FRÇVW7F–öå7FFS§VW7F–öå7FFRÆ6öæf–wW&S¦6öæf–wW&WÓ°¢f"7G–ÆSÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“°¢7G–ÆRçFW‡D6öçFVçCÒrç‚×v÷&·76Sâç‚Ö†VFW%¶†–FFVå×¶F—7Æ“¦æöæR–×÷'FçGÒç"×&V6÷&B×f–Wrç"×&W7VÇB×F÷¶&6¶w&÷VæC§G&ç7&VçC·FF–æs£¶Ö&v–ã£g‡Òç"×&V6÷&B×f–Wrç"×&W7VÇB×F÷ƒ7¶föçB×6—¦S£#'‚–×÷'FçC¶Ö&v–ã£g‚Òç"×&V6÷&B×f–Wrç"×&W÷'BÖæg¶F—7Æ“¦æöæWÒç"×&V6÷&B×f–Wrç"Öf—'7BÖ7F–öç·FF–æs£¶&6¶w&÷VæC¦æöæS¶Ö&v–ã£g‚Òç"×&V6÷&B×f–Wrç"Öf—'7BÖ7F–öâ¶Ö&v–ã£Òç"×&V6÷&B×f–Wrç"×&VF–ær×6V7F–öç·FF–ær×F÷£#‚–×÷'FçC¶Ö&v–â×F÷£#‚–×÷'FçGÒç"×G—R×F&ÆW¶÷fW&fÆ÷r×ƒ¦WF÷Òç"×G—R×F&ÆRF&ÆW·v–GFƒ£S¶&÷&FW"Ö6öÆÆ6S¦6öÆÆ6S¶föçB×6—¦S£G‡Òç"×G—R×F&ÆRF‚Âç"×G—R×F&ÆRFG·FF–æs£'‚‡ƒ¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“·FW‡BÖÆ–vã¦ÆVgGÒç"×G—R×F&ÆRFC¦f—'7BÖ6†–ÆG¶÷fW&fÆ÷r×w&¦ç—v†W&WÒç"×G—R×7–æ2ç"Öfö÷FW'¶fÆW‚×w&§w&Òç"×&V6÷&BÖæÇ—6—3æÆ&VÇ¶F—7Æ“¦&Æö6³¶Ö&v–ã£‡‚Òç"×&V6÷&BÖæÇ—6—2f–VÆG6WG¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡Òç"×&V6÷&BÖ÷fW'f–Ww·FF–æs£‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£Gƒ¶Ö&v–ã£‡‚¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B—Òç"Ö6†V6²ÖÖWG&–77¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒBÆÖ–æÖ‚ƒÃg"’“¶v£'‡Òç"Ö6†V6²ÖÖWG&–73æF—g¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶v£g‡Òç"Ö6†V6²ÖÖWG&–72'¶föçB×6—¦S£#7‡Òç"Ö6†V6²ÖÖWG&–727âÂç"×&V6÷&BÖ÷fW'f–WrÂç"×&V6÷&BÖ'&–Vg¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãwÒç"×&V6÷&BÖ'&–Vg¶F—7Æ“¦&Æö6³¶Ö&v–â×F÷£7‡Òç‚×W"Ö&'¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ¶fÆW‚×w&§w&¶Ö&v–âÖ&÷GFöÓ£g‡Òç‚×W"Ö&"æg¶F—7Æ“¦fÆWƒ¶v£‡‡Òç‚×W"Ö&"¶&–×&W76VC×G'VU×¶6öÆ÷#§f"‚ÒÖ66VçB“¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖ66VçB—Òç‚ÖÆ—7BÖf–ÇFW'7¶Ö&v–ã£G‚#‡Òç"×WÆöBÖW‡G&ç7VÖÖ'—·FF–æs£g‚¶7W'6÷#§ö–çFW#¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£cÒç‚ÖÆ—7BÖf–ÇFW'27VÖÖ'—¶7W'6÷#§ö–çFW#¶föçB×6—¦S£Gƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—Òç‚×v÷&·76Rç"Ö–æÆ–æRç"Ö†VG¶F—7Æ“¦æöæWÒç‚×&W÷'BÖÆ—7Cç¶Æ–æRÖ†V–v‡C£ãwÒç‚×&W÷'BÖÆ—7Câç‚ÖÆ—7G¶Ö&v–â×F÷£#‡Òç‚×&W÷'BÖÆ—7Câç"Ö'WGFöç¶Ö&v–ã£‡‚Òç‚×F'7¶fÆW‚×w&§w&Òç‚×F'2'WGFöç·v†—FR×76S¦æ÷w&Òç"×VW7F–öå¶FFÖæVVG2Ö6öæf—&Ó×G'VUÓç7VÖÖ'—¶&÷&FW"ÖÆVgC£7‚6öÆ–B6&v3&GÒç"×G—R×7–æ2ç"Ö6†V6·¶Ö&v–ã£g‚Òç"×&V6÷&BÖ÷fW'f–Wr¶Ö&v–âÖ&÷GFöÓ£Òç‚×v÷&·76Rç"×&V6÷&BÖæÇ—6—2–çWE·G—SÖ6†V6¶&÷…ÒÂç‚×v÷&·76Rç"×&V6÷&BÖæÇ—6—2–çWE·G—S×&F–õ×·v–GFƒ£gƒ¶†V–v‡C£gƒ¶fÆWƒ¦æöæWÒç"×&W÷'BÖW‡G&ç7VÖÖ'—·FF–æs£gƒ¶7W'6÷#§ö–çFW#¶föçB×vV–v‡C£c¶6öÆ÷#§f"‚ÒÖ66VçB—Òç"×&W÷'BÖW‡G&¶Ö&v–ã£#‚¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'‡Òç"×&W÷'BÖW‡G&âç"×&VF–ær×6V7F–öç¶Ö&v–ã£–×÷'FçC·FF–æs£#‚–×÷'FçC¶&÷&FW#£–×÷'FçGÔÖVF–†Ö‚×v–GFƒ£S#‚—²ç"Ö6†V6²ÖÖWG&–77¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g'Òç"×G—R×7–æ2ç"Ö'WGFöç·v–GFƒ£WÒç‚×W"Ö&"æg·v–GFƒ£WÒç‚×W"Ö&"æbç"Ö'WGFöç¶fÆWƒ£Òç‚×F'2'WGFöç¶fÆWƒ£WFó·FF–æs£—‚‡‡×Òs°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°¢f"'VÆµ7G–ÆSÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“¶'VÆµ7G–ÆRçFW‡D6öçFVçCÒrç"Ö'VÆ²Ö7F–öç7¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶fÆW‚×w&§w&¶Ö&v–â×F÷£G‡Òç"Ö'VÆ²Ö†–çG¶föçB×6—¦S£'‚–×÷'FçGÒç"Ö'VÆ²Ö7F–öç2ç"Ö'WGFöç·v†—FR×76S¦æ÷&ÖÇÔÖVF–†Ö‚×v–GFƒ£S#‚—²ç"Ö'VÆ²Ö7F–öç2ç"Ö'WGFöç¶fÆWƒ£W×Òs¶Fö7VÖVçBæ†VBæVæD6†–ÆB†'VÆµ7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒW†ÒÖFWF–Âæ§2ÓÓÓÓÒ¢ğ¢ò¢öæRW†ÒÂöæRÆ6RFò&VB—G266÷&W2Â&æ·2æB6fVBW'2â¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"f–WrÒçVÆÂÂVF—F÷"ÒçVÆÂÂvVæW&F–öâÒ°¢f"W62ÒgVæ7F–öâ‡b’²&WGW&âW66T‡FÖÂ‡bÓÒçVÆÂòrr¢7G&–ær‡b’“²Ó°¢gVæ7F–öâçVÖ&W"‡b’²&WGW&âbÓÒçVÆÂÇÂbÓÓÒrrÇÂçVÖ&W"æ—4f–æ—FR„çVÖ&W"‡b’’òçVÆÂ¢çVÖ&W"‡b“²Ğ¢gVæ7F–öâf×B‡b’²&WGW&âbÓÒçVÆÂò~(	Br¢7G&–ær„ÖF‚ç&÷VæB‡b¢’ò“²Ğ¢gVæ7F–öâ6–væVB‡b’²&WGW&â‡bâòr²r¢rr’²f×B‡b“²Ğ¢gVæ7F–öâ÷væW"‚’²&WGW&â7G&–ær‡7FFRçW6W"bb7FFRçW6W"æ–BÇÂrr“²Ğ¢gVæ7F–öâÆÄW†×2‚’²&WGW&â7FFRæÆÄW†×2ÇÂ7FFRæW†×2ÇÂµÓ²Ğ¢gVæ7F–öâ7W'&VçDW†Ò‚’²&WGW&âf–WrbbÆÄW†×2‚’æf–æB†gVæ7F–öâ†R’²&WGW&âRæ–BÓÓÒf–Wræ–C²Ò“²Ğ¢gVæ7F–öâ7F—fR‡b’²&WGW&âf–WrÓÓÒbbbbçW6W"ÓÓÒ÷væW"‚’bbbçFö¶VâÓÓÒ7FFRçFö¶Vâbb7FFRçvRÓÓÒw&V6÷&G2s²Ğ¢gVæ7F–öâG&6²†WfVçBÂÖWFFF’²G'’²f"fâÒv–æF÷råõ÷66÷&UG&6¶W%G&6²ÇÂv–æF÷råõ÷7EG&6³²–b‡G—VöbfâÓÓÒvgVæ7F–öâr’fâ†WfVçBÂÖWFFFÇÂ·Ò“²Ò6F6‚…ò’·ÒĞ¢gVæ7F–öâW%&Wf–Wtf–Æ&ÆR‚’²&WGW&â‡v–æF÷rå66÷&UW%&Wf–WrbbG—Vöbv–æF÷rå66÷&UW%&Wf–Wræ’ÓÓÒvgVæ7F–öârbbG—Vöbv–æF÷rå66÷&UW%&Wf–WræÖ÷VçBÓÓÒvgVæ7F–öâr“²Ğ¢gVæ7F–öâÆVfR‚’°¢–b‡v–æF÷rå66÷&TW†Õ&VfÆV7F–öâbbv–æF÷rå66÷&TW†Õ&VfÆV7F–öâæÆVfR‚’’&WGW&âfÇ6S°¢–b†VF—F÷"bbVF—F÷"æ6äÆVfRbbVF—F÷"æ6äÆVfR‚’’&WGW&âfÇ6S°¢–b†VF—F÷"bbVF—F÷"æF—7÷6R’VF—F÷"æF—7÷6R‚“°¢VF—F÷"ÒçVÆÃ²vVæW&F–öâ²³²&WGW&âG'VS°¢Ğ¢gVæ7F–öâ'WGFöâ†Æ&VÂÂ7F–öâÂW‡G&’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&VBÖ'WGFöâr²†W‡G&ÇÂrr’²r"FFÖVCÒ"r²W62†7F–öâ’²r#âr²W62†Æ&VÂ’²sÂö'WGFöãâs²Ğ¢gVæ7F–öâ&æ²†W†ÒÂ7V&¦V7BÂ66÷R’°¢f""Ò&æ´–æfô'•66÷Ucb†W†ÒÂ7V&¦V7BÂ66÷R’ÂâÒçVÖ&W"‡"ç&æ²’Â6÷VçBÒçVÖ&W"‡"ç'F–6—çG2“°¢–b‚†âãÒbbçVÖ&W"æ—4–çFVvW"†â’’’âÒçVÆÃ°¢–b‚†6÷VçBãÒbbçVÖ&W"æ—4–çFVvW"†6÷VçB’’’6÷VçBÒçVÆÃ°¢–b†âÓÒçVÆÂbb6÷VçBÓÒçVÆÂbbââ6÷VçB’&WGW&â²ã¢âÂ6÷VçC¢6÷VçBÂW&6VçC¢çVÆÂÂ–çfÆ–C¢G'VRÓ°¢f"F—&V7BÒ"æF—&V7EW&6VçBòçVÖ&W"‡"ç÷6—F–öåW&6VçB’¢çVÆÃ°¢&WGW&â²ã¢âÂ6÷VçC¢6÷VçBÂW&6VçC¢F—&V7BÓÒçVÆÂbbF—&V7BãÒbbF—&V7BÃÒòF—&V7B¢âÓÒçVÆÂbb6÷VçBÓÒçVÆÂòâò6÷VçB¢¢çVÆÂÓ°¢Ğ¢gVæ7F–öâ&æµFW‡B‡"’°¢&WGW&â"æâÓÒçVÆÂò~zÊÂr²f×B‡"æâ’²rYÒr¢"çW&6VçBÓÒçVÆÂò~X˜Òr²f×B‡"çW&6VçB’²rRr¢~iÊ®[Ù^XZRs°¢Ğ¢gVæ7F–öâ&æµ7V"‡"’°¢–b‡"æ–çfÆ–B’&WGW&â~YŞjÊZJ~K¨îXø.ˆ>K«®i[ûÈÎŠû~jZû’s°¢&WGW&â‡"æ6÷VçBÓÒçVÆÂò~X[r²f×B‡"æ6÷VçB’²rK«¢r¢"æâÓÒçVÆÂò~iÊ®Z¾Xø.ˆ>K«®i[r¢rr’²‡"çW&6VçBÓÒçVÆÂbb"æâÓÒçVÆÂòr+rX˜Òr²f×B‡"çW&6VçB’²rRr¢rr“°¢Ğ¢gVæ7F–öâÖöFVÂ†W†Ò’°¢f"ÖöGVÆTæÖW2ÒæWr6WB‚‡7FFRæÖöGVÆW5c‚ÇÂµÒ’æÖ†gVæ7F–öâ†Ò’²&WGW&âÒææÖS²Ò’“°¢f"&÷w2Òö&¦V7Bæ¶W—2†W†Òç66÷&W2ÇÂ·Ò’æf–ÇFW"†gVæ7F–öâ†æÖR’²&WGW&âÖöGVÆTæÖW2æ†2†æÖR“²Ò’æÖ†gVæ7F–öâ†æÖR’°¢f"2ÒW†Òç66÷&W5¶æÖUÒÂ7GVÂÒçVÖ&W"†W†Õ66÷&R†W†ÒÂæÖRÂv7GVÂr’’ÂÖ‚ÒçVÖ&W"†W†ÔÖ‚†W†ÒÂæÖR’“°¢&WGW&â²æÖS¢æÖRÂ7GVÃ¢7GVÂÂÖƒ¢Ö‚Â&s¢çVÖ&W"‡2ç&r’Â&tÖƒ¢çVÖ&W"‡2ç&tÖ‚’ÇÂÖ‚À¢fÆÆ&6³¢çVÖ&W"‡2æ7GVÂ’ÓÓÒçVÆÂbb7GVÂÓÒçVÆÂÂF&vWC¢çVÖ&W"‡2çF&vWB’ÂW†6ÇVFVC¢2æW†6ÇVFTg&öÕF÷FÂÀ¢&FS¢7GVÂÓÒçVÆÂbb7GVÂãÒbbÖ‚âbb7GVÂÃÒÖ‚ò7GVÂòÖ‚¢¢çVÆÂÀ¢–V#¢&æ²†W†ÒÂæÖRÂw–V"r’Â6Æ73¢&æ²†W†ÒÂæÖRÂv6Æ72r’Ó°¢Ò“°¢f"–æ6ÇVFVBÒ&÷w2æf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"æW†6ÇVFVC²Ò’Â66÷&VBÒ–æ6ÇVFVBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"æ7GVÂÓÒçVÆÃ²Ò“°¢f"ÖçVÂÒçVÖ&W"†W†ÒçF÷FÅö7GVÅ÷66÷&R’Â6ö×ÆWFRÒ–æ6ÇVFVBæÆVæwF‚âbb66÷&VBæÆVæwF‚ÓÓÒ–æ6ÇVFVBæÆVæwFƒ°¢f"Ö‚Ò–æ6ÇVFVBæWfW'’†gVæ7F–öâ‡"’²&WGW&â"æÖ‚â²Ò’ò–æ6ÇVFVBç&VGV6R†gVæ7F–öâ†âÂ"’²&WGW&ââ²"æÖƒ²ÒÂ’¢çVÆÃ°¢f"F÷FÂÒÖçVÂÓÒçVÆÂòÖçVÂ¢66÷&VBæÆVæwF‚ò66÷&VBç&VGV6R†gVæ7F–öâ†âÂ"’²&WGW&ââ²"æ7GVÃ²ÒÂ’¢çVÆÃ°¢f"F&vWBÒ–æ6ÇVFVBæÆVæwF‚bb–æ6ÇVFVBæWfW'’†gVæ7F–öâ‡"’²&WGW&â"çF&vWBÓÒçVÆÃ²Ò’ò–æ6ÇVFVBç&VGV6R†gVæ7F–öâ†âÂ"’²&WGW&ââ²"çF&vWC²ÒÂ’¢çVÆÃ°¢&WGW&â²&÷w3¢&÷w2Â–æ6ÇVFVC¢–æ6ÇVFVBÂ66÷&VC¢66÷&VBÂ6ö×ÆWFS¢6ö×ÆWFRÂÖçVÃ¢ÖçVÂÓÒçVÆÂÂÖƒ¢Ö‚ÂF÷FÃ¢F÷FÂÀ¢&FS¢ÖçVÂÓÓÒçVÆÂbb6ö×ÆWFRbbÖ‚âbb–æ6ÇVFVBæWfW'’†gVæ7F–öâ‡"’²&WGW&â"ç&FRÓÒçVÆÃ²Ò’òF÷FÂòÖ‚¢¢çVÆÂÀ¢v¢ÖçVÂÓÓÒçVÆÂbb6ö×ÆWFRbbF&vWBÓÒçVÆÂòF÷FÂÒF&vWB¢çVÆÂÀ¢–V#¢&æ²†W†ÒÂ~h¾XˆbrÂw–V"r’Â6Æ73¢&æ²†W†ÒÂ~h¾XˆbrÂv6Æ72r’Ó°¢Ğ¢f"VG&çG2Ò°¢7G&VæwFƒ¢²F—FÆS¢~KÉX«ş[zY»¢rÂFW‡C¢~[é~Xˆnxè~‹è>š¹ûÈÎhé.YŞK™ş‹è>™ÚX˜Ş8.KùŞyYiÈiXikk9^8"rÂ6öÆ÷#¢r3&#ƒƒfBrÒÀ¢÷FVçF–Ã¢²F—FÆS¢~hª.Xˆnz¨zBrÂFW‡C¢~hé.YŞ‹è>™ÚX˜ŞûÈÎXÛ~™Ú.K¸ŞiÈZKXˆnz›®™{N8.KÉXXh›îXúş‹ûŞY¹îy¨NXˆn8"rÂ6öÆ÷#¢r3C#v63BrÒÀ¢6ö×WFS¢²F—FÆS¢~z¹îK¨hùXØrrÂFW‡C¢~[é~Xˆnxè~‹è>š¹ûÈÎhé.YŞy»Zû™ÚYî8.X[>k:XË®Xˆn[ªn‹è>š¹y¨Nš)8"rÂ6öÆ÷#¢r6sc2rÒÀ¢7W÷'C¢²F—FÆS¢~KÉXXŠ^[Ë¢rÂFW‡C¢~[é~Xˆnxè~Y(Îhé.YŞ˜;Şy»Zû™ÚYî8.XXŠ^Yû®zKˆî[‹ŠxZKXˆn8"rÂ6öÆ÷#¢r6#Scƒc"rÒÀ¢æWWG&Ã¢²F—FÆS¢~hê^‹ùYØ~XÂrÂFW‡C¢~ˆ{>[	KˆšhÈ~j~KØŞK¨îYØ~XÎ{«şKˆ®ûÈÎ{¹>YX[~KÙ>Šù^š)XŠNijŞ8"rÂ6öÆ÷#¢r3v#ƒC“2rĞ¢Ó°¢gVæ7F–öâVG&çDFF†ÒÂ66÷R’°¢f"VÆ–v–&ÆRÒÒæ–æ6ÇVFVBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"ç&FRÓÒçVÆÂbb%·66÷UÒçW&6VçBÓÒçVÆÃ²Ò“°¢f"ÖVå&FRÒVÆ–v–&ÆRç&VGV6R†gVæ7F–öâ‡7VÒÂ"’²&WGW&â7VÒ²"ç&FS²ÒÂ’òVÆ–v–&ÆRæÆVæwFƒ°¢f"ÖVå÷6—F–öâÒVÆ–v–&ÆRç&VGV6R†gVæ7F–öâ‡7VÒÂ"’²&WGW&â7VÒ²%·66÷UÒçW&6VçC²ÒÂ’òVÆ–v–&ÆRæÆVæwFƒ°¢&WGW&â²ÖöFS¢wW&f÷&Öæ6RrÂÆWGFS¢VG&çG2Â&FS¢ÖVå&FRÂ÷6—F–öã¢ÖVå÷6—F–öâÂö–çG3¢VÆ–v–&ÆRæÖ†gVæ7F–öâ‡"Â’’°¢f"‚Ò"ç&FRÒÖVå&FRÂ’ÒÖVå÷6—F–öâÒ%·66÷UÒçW&6VçC°¢f"w&÷WÒÖF‚æ'2‡‚’ÂãÇÂÖF‚æ'2‡’’ÂãòvæWWG&Âr¢‚âò’âòw7G&VæwF‚r¢v6ö×WFRr¢’âòw÷FVçF–Âr¢w7W÷'Bs°¢&WGW&â²&÷s¢"Â–æFWƒ¢’²Âƒ¢‚Â“¢’Âw&÷W¢w&÷WÓ°¢Ò’Ó°¢Ğ¢f"Ö÷fVÖVçDw&÷W2Ò°¢7G&VæwFƒ¢²F—FÆS¢~KÉX«şKˆ®XØrrÂFW‡C¢~[Ù>X˜Şhé.YŞy»Zû™ÚX˜ŞûÈÎiÈ‹ùK™şYÊ‹ù¾jÚ^8.{º~{ºŞKùŞhÈiÈiXy¨Nikk9^8"rÂ6öÆ÷#¢r3&#ƒƒfBrÒÀ¢÷FVçF–Ã¢²F—FÆS¢~KÉX«şY¹î‰ÒrÂFW‡C¢~[Ù>X˜ŞK¸ŞiŠşy»ZûKÉX«şzyyºîûÈÎiÈ‹ùX{®xëY¹î‰Ş8.ZûxZ~Šù^š)h›îh›îZKXˆnXùXÉn8"rÂ6öÆ÷#¢r6sc2rÒÀ¢6ö×WFS¢²F—FÆS¢~[ËzyiKYhBrÂFW‡C¢~[Ù>X˜Şhé.YŞy»Zû™ÚYîûÈÎKØniÈ‹ùjÚ>YÊiKYhN8.{º~{ºŞŠx.ZùşiÈiXy¨N{¸>Kšikk9^8"rÂ6öÆ÷#¢r3C#v63BrÒÀ¢7W÷'C¢²F—FÆS¢~KÉXXX[>k:‚rÂFW‡C¢~[Ù>X˜Şhé.YŞy»Zû™ÚYîûÈÎiÈ‹ùK™şYÊY¹î‰Ş8.KÉXXjZûZKXˆnXéşYº8"rÂ6öÆ÷#¢r6#Scƒc"rÒÀ¢æWWG&Ã¢²F—FÆS¢~hÈ[›>h‰nK‹NyXÂrÂFW‡C¢~XùXÉnYû®iÊÎhÈ[›>ûÈÎh‰n[Ù>X˜Şhé.YŞKØŞK¨î[Ë®[ËzyXˆnyXÎ{«şKˆ®ûÈÎ{¹>YX[~KÙ>Šù^š)XŠNijŞ8"rÂ6öÆ÷#¢r3v#ƒC“2rĞ¢Ó°¢gVæ7F–öâÖVF–â‡fÇVW2’°¢–b‚fÇVW2æÆVæwF‚’&WGW&âçVÆÃ°¢f"6÷'FVBÒfÇVW2ç6Æ–6R‚’ç6÷'B†gVæ7F–öâ†Â"’²&WGW&âÒ#²Ò’ÂÖ–BÒÖF‚æfÆö÷"‡6÷'FVBæÆVæwF‚ò"“°¢&WGW&â6÷'FVBæÆVæwF‚R"ò6÷'FVE¶Ö–EÒ¢‡6÷'FVE¶Ö–BÒÒ²6÷'FVE¶Ö–EÒ’ò#°¢Ğ¢gVæ7F–öâfÆ–DFFR‡fÇVR’²&WGW&âG—VöbfÇVRÓÓÒw7G&–ærrbbõåÆG³GÒÕÆG³'ÒÕÆG³'ÒBòçFW7B‡fÇVR’bbçVÖ&W"æ—4f–æ—FR„FFRç'6R‡fÇVR’’bbæWrFFR‡fÇVR’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ’ÓÓÒfÇVS²Ğ¢gVæ7F–öâÖ÷fVÖVçDFF†W†ÒÂÒÂ66÷RÂv–æF÷u6—¦RÂ6ÖT6FVv÷'’’°¢f"7W'&VçBÒÒæ–æ6ÇVFVBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â%·66÷UÒçW&6VçBÓÒçVÆÃ²Ò“°¢f"F—f–FW"ÒÖVF–â†7W'&VçBæÖ†gVæ7F–öâ‡"’²&WGW&â%·66÷UÒçW&6VçC²Ò’“°¢f"6FVv÷'’Ò7G&–ær†W†Òæw&FUöÆWfVÂÇÂrr’çG&–Ò‚“°¢f"6æF–FFW2ÒfÆ–DFFR†W†ÒæW†ÕöFFR’òÆÄW†×2‚’æf–ÇFW"†gVæ7F–öâ†R’°¢&WGW&âRæ–BÓÒW†Òæ–BbbRæ—5ö†–FFVâbbfÆ–DFFR†RæW†ÕöFFR’bbRæW†ÕöFFRÂW†ÒæW†ÕöFFRbb‚6ÖT6FVv÷'’ÇÂ7G&–ær†Ræw&FUöÆWfVÂÇÂrr’çG&–Ò‚’ÓÓÒ6FVv÷'’“°¢Ò’ç6Æ–6R‚’ç6÷'B†gVæ7F–öâ†Â"’²&WGW&â"æW†ÕöFFRæÆö6ÆT6ö×&R†æW†ÕöFFR’ÇÂ7G&–ær†"æ7&VFVEöBÇÂrr’æÆö6ÆT6ö×&R…7G&–ær†æ7&VFVEöBÇÂrr’’ÇÂ7G&–ær†"æ–B’æÆö6ÆT6ö×&R…7G&–ær†æ–B’“²Ò’¢µÓ°¢f"ö–çG2ÒµÒÂÖ—76–ærÒµÒÂ&WV—&VBÒv–æF÷u6—¦RÓÓÒw&V6VçBrò"¢°¢Òæ–æ6ÇVFVBæf÷$V6‚†gVæ7F–öâ‡"’°¢–b‡%·66÷UÒçW&6VçBÓÓÒçVÆÂ’°¢Ö—76–ærçW6‚‡²&÷s¢"Â&V6öã¢%·66÷UÒæ–çfÆ–Bò~YŞjÊKˆîK«®i[KˆŞKˆˆ{Br¢~{Ë®[	iÊÎjÊKØŞjùNûÈŠû~Š^YŞjÊKˆîK«®i[ûÈ’rÒ“²&WGW&ã°¢Ğ¢òòW6R7GVÂW†ÒFFW2Âæ÷BF†RÖçVÆÇ’'&ævVB&V6÷&B÷&FW"â6ÖRÖF’&V6÷&G2Fòæ÷B–×Ç’6WVVæ6Rà¢f"FFW2ÒæWr6WB‚’Â†—7F÷'’ÒµÓ°¢6æF–FFW2æf÷$V6‚†gVæ7F–öâ†R’°¢f"&÷rÒRç66÷&W2bbRç66÷&W5·"ææÖUÓ²–b‚&÷rÇÂ&÷ræW†6ÇVFTg&öÕF÷FÂÇÂFFW2æ†2†RæW†ÕöFFR’’&WGW&ã°¢f"–æfòÒ&æ²†RÂ"ææÖRÂ66÷R“²–b†–æfòçW&6VçBÓÓÒçVÆÂ’&WGW&ã°¢FFW2æFB†RæW†ÕöFFR“²†—7F÷'’çW6‚‡²W†Ó¢RÂ–æfó¢–æfòÒ“°¢Ò“°¢–b††—7F÷'’æÆVæwF‚Â&WV—&VB’²Ö—76–ærçW6‚‡²&÷s¢"Â&V6öã¢&WV—&VBÓÓÒ"ò~‹ù>jÊ‹h¾X«ş™ÈŠhiÊÎjÊXø®K˜¾X˜Ó.jÊXúşjùNhé.YŞûÈÎyºîX˜ŞX[r²††—7F÷'’æÆVæwF‚²’²rjÊr¢~k*iÈi»Nizy¨Br²‡6ÖT6FVv÷'’ò~YÎXˆn{¾8r¢rr’²~YÎzyyºî8YÎhé.YŞˆÈ>Y»Ny¨NiÈiXhé.YÒrÒ“²&WGW&ã²Ğ¢f"ö'6W'fF–öç2Ò†—7F÷'’ç6Æ–6RƒÂ&WV—&VB’ç&WfW'6R‚’æ6öæ6B…·²W†Ó¢W†ÒÂ–æfó¢%·66÷UÒÕÒ“°¢f"ƒ°¢–b‡&WV—&VBÓÓÒ’‚Òö'6W'fF–öç5³Òæ–æfòçW&6VçBÒ%·66÷UÒçW&6VçC°¢VÇ6R°¢òòf—B'’W†Ò6WVVæ6RÂæWfW"'’F†R—'&VwVÆ"F—2&WGvVVâW†×2â÷6—F—fRÖVç2Ö÷f–ærf÷'v&Bà¢f"6VçFW"Ò†ö'6W'fF–öç2æÆVæwF‚Ò’ò"ÂÖVâÒö'6W'fF–öç2ç&VGV6R†gVæ7F–öâ†âÂò’²&WGW&ââ²òæ–æfòçW&6VçC²ÒÂ’òö'6W'fF–öç2æÆVæwFƒ°¢f"çVÖW&F÷"ÒÂFVæöÖ–æF÷"Ò°¢ö'6W'fF–öç2æf÷$V6‚†gVæ7F–öâ†òÂ’’²çVÖW&F÷"³Ò†’Ò6VçFW"’¢†òæ–æfòçW&6VçBÒÖVâ“²FVæöÖ–æF÷"³Ò†’Ò6VçFW"’¢†’Ò6VçFW"“²Ò“°¢‚ÒÖçVÖW&F÷"òFVæöÖ–æF÷#°¢Ğ¢f"’ÒF—f–FW"Ò%·66÷UÒçW&6VçC°¢f"w&÷WÒÖF‚æ'2‡‚’ÂãRÇÂÖF‚æ'2‡’’ÂãòvæWWG&Âr¢’âò‚âòw7G&VæwF‚r¢w÷FVçF–Âr¢‚âòv6ö×WFRr¢w7W÷'Bs°¢ö–çG2çW6‚‡²&÷s¢"Â–æFWƒ¢ö–çG2æÆVæwF‚²Âƒ¢‚Â“¢’Âw&÷W¢w&÷WÂö'6W'fF–öç3¢ö'6W'fF–öç2Ò“°¢Ò“°¢&WGW&â²ÖöFS¢vÖ÷fVÖVçBrÂÆWGFS¢Ö÷fVÖVçDw&÷W2Â÷6—F–öã¢F—f–FW"Â÷6—F–öç3¢7W'&VçBæÖ†gVæ7F–öâ‡"’²&WGW&â%·66÷UÒçW&6VçC²Ò’Â7W'&VçD6÷VçC¢7W'&VçBæÆVæwF‚Âö–çG3¢ö–çG2ÂÖ—76–æs¢Ö—76–ærÂv–æF÷u6—¦S¢v–æF÷u6—¦RÂ6ÖT6FVv÷'“¢6ÖT6FVv÷'’Ó°¢Ğ¢gVæ7F–öâf×D6†ævR‡fÇVR’²&WGW&â7G&–ær„ÖF‚ç&÷VæB‚‡fÇVR²çVÖ&W"äU4”Äôâ’¢’ò“²Ğ¢gVæ7F–öâ6†ævUFW‡B‡ö–çBÂ&V6VçB’²&WGW&âÖF‚æ'2‡ö–çBç‚’ÂãRò~Yû®iÊÎhÈ[›2r¢‡ö–çBç‚âò~‹ù¾jÚRr¢~˜jÚRr’²f×D6†ævR„ÖF‚æ'2‡ö–çBç‚’’²‡&V6VçBòrKŠ®y›îXˆnx+’òYË¢r¢rKŠ®y›îXˆnx+’r“²Ğ¢gVæ7F–öâÖWG&–2†Æ&VÂÂfÇVRÂ7V"’²&WGW&âsÆF—b6Æ73Ò&VBÖÖWG&–2#ãÇ7ãâr²W62†Æ&VÂ’²sÂ÷7ããÇ7G&öæsâr²W62‡fÇVR’²sÂ÷7G&öæsãÇ6ÖÆÃâr²W62‡7V"ÇÂrr’²sÂ÷6ÖÆÃãÂöF—câs²Ğ¢gVæ7F–öâ†VFW"†W†Ò’°¢&WGW&âsÆF—b6Æ73Ò&VB×F÷#âr²'WGFöâ‡f–Wrbbf–Wrç&WGW&åvRÓÓÒw7FG2rò~(i‹ùNY¹îš)Yè¾Xˆniér¢~(i‹ùNY¹îˆ>Šù^Šë[ÙRrÂv&6²r’²'WGFöâ‚~{Én‹éòŠ^[ÙRrÂvVF—Br’²sÂöF—cãÆ†VFW"6Æ73Ò&VBÖ†VF–ær#ãÇ7â6Æ73Ò&VBÖW–V'&÷r#îXÙ^jÊˆ>Šù^Šúnh8SÂ÷7ããÆƒF&–æFWƒÒ"Ó#âr²W62†W†ÒææÖR’²sÂöƒãÇâr²W62†f×E–V$FFR†W†ÒæW†ÕöFFR’²†W†ÒæVæEöFFRbbW†ÒæVæEöFFRÓÒW†ÒæW†ÕöFFRòr(	Br²f×E–V$FFR†W†ÒæVæEöFFR’¢rr’²r+rr²†W†Òæw&FUöÆWfVÂÇÂ~iÊ®Xˆn{²r’’²†W†Òæ—5ö†–FFVâòr+r[{.K¸î‹h¾X«şY»î™©‰xşûÈÎK¸ŞXúşiú^yÈ¾ZèÎi[NŠë[ÙRr¢rr’²sÂ÷ãÂö†VFW#âs°¢Ğ¢gVæ7F–öâ÷fW'f–Wr†W†ÒÂÒ’°¢f"F÷FÄÆ&VÂÒÒæÖçVÂò~[{.[Ù^XZ^h¾Xˆbr¢Òæ6ö×ÆWFRò~iÊÎjÊh¾Xˆbr¢~[{.[Ù^XZ^zyyºî[şŠês°¢f"F÷FÅ7V"ÒÒæÖçVÂò~KÛşyJh˜¾XªZ¾Xiy¨Nh¾Xˆbr¢~ŠêXZ^h¾Xˆny¨Br²Òç66÷&VBæÆVæwF‚²ròr²Òæ–æ6ÇVFVBæÆVæwF‚²rzy[{.X{®Xˆbs°¢f"&FU7V"ÒÒæÖçVÂò~h˜¾Xªh¾XˆnKˆŞhêzé~kºXˆnKˆî[é~Xˆnxèrr¢Òæ6ö×ÆWFRò~h¾Xˆb;riÊÎjÊYNzykºXˆnK˜¾Y(Âr¢~XZ˜:ŠêXˆnzyyºîX{®XˆnYîŠêzérs°¢f"W‡G&Òµ²v6—G•÷&æ²rÂv6—G•÷'F–6—çG2rÂ~[ˆ.hé.YÒuÒÅ²vF—7G&–7E÷&æ²rÂvF—7G&–7E÷'F–6—çG2rÂ~XË®hé.YÒuÕÒæÖ†gVæ7F–öâ‡—"’°¢f""ÒçVÖ&W"†W†Õ·—%³ÕÒ’ÂâÒçVÖ&W"†W†Õ·—%³ÕÒ“²&WGW&â"âòsÇ7ãâr²—%³%Ò²rÆ#îzÊÂr²f×B‡"’²rYÓÂö#âr²†ââòròr²f×B†â’²rK«¢r¢rr’²sÂ÷7ãâr¢rs°¢Ò’æ¦ö–â‚rr“°¢f"F&vWEFW‡BÒÒævÓÓÒçVÆÂòrr¢ÒævãÒò~[{.‹ëîX‹iÊÎjÊh¾yºîjrr²†Òævò~ûÈÎ‹h^X{¢r²f×B†Òæv’²rXˆbr¢rr’¢~‹yŞzk¾iÊÎjÊh¾yºîj~‹ù[zâr²f×B‚ÖÒæv’²rXˆbs°¢&WGW&âsÇ6V7F–öâ6Æ73Ò&VBÖ÷fW'f–Wr"&–ÖÆ&VÃÒ.ˆ>Šù^i[NKÙ>jh.XkR#ãÆF—b6Æ73Ò&VBÖÖWG&–72#âr°¢ÖWG&–2‡F÷FÄÆ&VÂÂf×B†ÒçF÷FÂ’ÂF÷FÅ7V"’²ÖWG&–2‚~h¾[é~XˆnxèrrÂÒç&FRÓÓÒçVÆÂò~(	Br¢f×B†Òç&FR’²rRrÂ&FU7V"’°¢ÖWG&–2‚~[›N{ª~hé.YÒrÂ&æµFW‡B†Òç–V"’Â&æµ7V"†Òç–V"’’²ÖWG&–2‚~xúŞ{ª~hé.YÒrÂ&æµFW‡B†Òæ6Æ72’Â&æµ7V"†Òæ6Æ72’’°¢sÂöF—câr²‡F&vWEFW‡BÇÂW‡G&òsÆF—b6Æ73Ò&VBÖ6öçFW‡B#âr²‡F&vWEFW‡BòsÇ7ãâr²F&vWEFW‡B²sÂ÷7ãâr¢rr’²W‡G&²sÂöF—câr¢rr’°¢sÆæb6Æ73Ò&VBÖæb"&–ÖÆ&VÃÒ.ˆ>Šù^Šúnh8^yºî[ÙR#âr²'WGFöâ‚~YNzyh‰{º’rÂv§V×§66÷&W2r’²'WGFöâ‚~iÊÎYË®XùXÉbrÂv§V×¦6†ævW2r’²'WGFöâ‚~[Ë®[ËzyY¹¾‹™™rÂv§V×§VG&çG2r’²'WGFöâ‚~ˆ>YîXøŞh	ÒrÂv§V×§&VfÆV7F–öâr’²‡W%&Wf–Wtf–Æ&ÆR‚’ò'WGFöâ‚~[{.[Ù^XZ^Šù^š)‚rÂv§V×§W'2r’¢rr’²sÂöæcãÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâ6VÆÂ†Æ&VÂÂFW‡B’²&WGW&âsÇFBFFÖÆ&VÃÒ"r²Æ&VÂ²r#âr²FW‡B²sÂ÷FCâs²Ğ¢gVæ7F–öâ&æ´6VÆÂ‡"’²&WGW&âsÇ7ãâr²W62‡&æµFW‡B‡"’’²sÂ÷7ããÇ6ÖÆÃâr²W62‡&æµ7V"‡"’’²sÂ÷6ÖÆÃâs²Ğ¢gVæ7F–öâfW&vT6VÆÂ†W†ÒÂ"’°¢&WGW&âµ²w–V"rÂ~[›N{ªruÒÅ²v6Æ72rÂ~xúŞ{ªruÕÒæÖ†gVæ7F–öâ‡—"’°¢f"bÒv–æF÷rå66÷&TfW&vW2bbv–æF÷rå66÷&TfW&vW2çfÇVR†W†ÒÂ"ææÖRÂ—%³ÒÂfÇ6R“°¢–b‡bÓÒçVÆÂ’&WGW&ârs°¢&WGW&âsÇ7ãâr²—%³Ò²rr²f×B‡b’²sÂ÷7ãâr²‡"æ7GVÂÓÒçVÆÂòsÇ6ÖÆÃâr²‡"æ7GVÂÓÓÒbò~KˆîYØ~XˆnhÈ[›2r¢‡"æ7GVÂâbò~š¹K¨âr¢~KØîK¨âr’²~YØ~Xˆbr²f×B„ÖF‚æ'2‡"æ7GVÂÒb’’²rXˆbr’²sÂ÷6ÖÆÃâr¢rr“°¢Ò’æ¦ö–â‚rr’ÇÂ~(	Bs°¢Ğ¢gVæ7F–öâ66÷&W2†W†ÒÂÒ’°¢f"†4fW&vW2ÒÒç&÷w2ç6öÖR†gVæ7F–öâ‡"’²&WGW&âfW&vT6VÆÂ†W†ÒÂ"’ÓÒ~(	Bs²Ò“°¢&WGW&âsÇ6V7F–öâ6Æ73Ò&VB×6V7F–öâ"–CÒ&VB×66÷&W2"F&–æFWƒÒ"Ó#ãÆF—b6Æ73Ò&VB×6V7F–öâÖ†VB#ãÆF—cãÇ7â6Æ73Ò&VBÖW–V'&÷r#ãòh‰{º“Â÷7ããÆƒ#îYNzy[é~XˆnKˆîhé.YÓÂöƒ#ãÇîiÈ{¸XˆnKˆîXéşZx¾XˆnXˆn[È[^zK®ûÈÎyºîj~[zîhÈiÈ{¸XˆnŠêzé~8#Â÷ãÂöF—cãÂöF—câr°¢†Òç&÷w2æÆVæwF‚òsÆF—b6Æ73Ò&VB×F&ÆR×w&#ãÇF&ÆR6Æ73Ò&VB×F&ÆR#ãÇF†VCãÇG#âr²²~zyyºârÂ~iÈ{¸XˆbòkºXˆbrÂ~XéşZx¾XˆbòkºXˆbrÂ~[é~XˆnxèrrÂ~yºîjrò[zîXÂrÂ~[›N{ª~hé.YÒrÂ~xúŞ{ª~hé.YÒuÒæ6öæ6B††4fW&vW2ò²~[›>YØ~XˆbuÒ¢µÒ’æÖ†gVæ7F–öâ‡2’²&WGW&âsÇF‚66÷SÒ&6öÂ#âr²2²sÂ÷Fƒâs²Ò’æ¦ö–â‚rr’²sÂ÷G#ãÂ÷F†VCãÇF&öG“âr²Òç&÷w2æÖ†gVæ7F–öâ‡"’°¢&WGW&âsÇG#ãÇF‚66÷SÒ'&÷r#âr²W62‡"ææÖR’²‡"æW†6ÇVFVBòsÇ6ÖÆÃî{¹şŠêš’+rKˆŞŠêh¾XˆcÂ÷6ÖÆÃâr¢rr’²sÂ÷Fƒâr°¢6VÆÂ‚~iÈ{¸XˆbrÂsÆ#âr²f×B‡"æ7GVÂ’²sÂö#âòr²f×B‡"æÖ‚’²‡"æfÆÆ&6²òsÇ6ÖÆÃîYÎkºXˆnXéşZx¾XˆcÂ÷6ÖÆÃâr¢rr’’°¢6VÆÂ‚~XéşZx¾XˆbrÂ"ç&rÓÓÒçVÆÂò~(	Br¢f×B‡"ç&r’²ròr²f×B‡"ç&tÖ‚’’²6VÆÂ‚~[é~XˆnxèrrÂ"ç&FRÓÓÒçVÆÂò~(	Br¢f×B‡"ç&FR’²rRr’°¢6VÆÂ‚~yºîjrrÂ"çF&vWBÓÓÒçVÆÂò~iÊ®Šëî{Úâr¢f×B‡"çF&vWB’²‡"æ7GVÂÓÒçVÆÂòsÇ6ÖÆÃâr²‡"æ7GVÂÓÓÒ"çF&vWBò~[{.‹ëîjrr¢6–væVB‡"æ7GVÂÒ"çF&vWB’²rXˆbr’²sÂ÷6ÖÆÃâr¢rr’’°¢6VÆÂ‚~[›N{ª~hé.YÒrÂ&æ´6VÆÂ‡"ç–V"’’²6VÆÂ‚~xúŞ{ª~hé.YÒrÂ&æ´6VÆÂ‡"æ6Æ72’’²††4fW&vW2ò6VÆÂ‚~[›>YØ~XˆbrÂfW&vT6VÆÂ†W†ÒÂ"’’¢rr’²sÂ÷G#âs°¢Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—câr¢sÇ6Æ73Ò&VBÖV×G’#î‹ùk*iÈzyyºîi[hÚîûÈÎx+X{¾(	Î{Én‹éòŠ^[Ù^(	Şk{¾Xªh‰{º8#Â÷âr’²‡v–æF÷rå66÷&UVW7F–öåG—W2òv–æF÷rå66÷&UVW7F–öåG—W2æFWF–Â†W†Ò’¢rr’²6öÖ&–æF–öç2†W†ÒÂÒ’²sÂ÷6V7F–öãâs°¢Ğ¢gVæ7F–öâ6öÖ&–æF–öç2†W†ÒÂÒ’°¢f"6VÆV7FVBÒ‡7FFRæÖöGVÆW5c‚ÇÂµÒ’æf–ÇFW"†gVæ7F–öâ†ÖöB’²&WGW&â†W†ÒæÖöGVÆT–G2ÇÂµÒ’æ–æ6ÇVFW2†ÖöBæ–B“²Ò“°¢–b‚6VÆV7FVBæÆVæwF‚’&WGW&ârs°¢f"&æ·2ÒW†ÒæÖöGVÆU&æ·2ÇÂ·Ó°¢–b‚ö&¦V7Bæ¶W—2‡&æ·2’æÆVæwF‚’²G'’²&æ·2Ò¥4ôâç'6R†Æö6Å7F÷&vRævWD—FVÒ‚w7EöÖöGVÆW&æ·5÷c#Uòr²‡7FFRçW6W"çW6W&æÖRÇÂvæöâr’’ÇÂw·Òr•¶W†ÒæW†ÕöFFR²wÂr²W†ÒææÖUÒÇÂ·Ó²Ò6F6‚…ò’·ÒĞ¢&WGW&âsÆFWF–Ç26Æ73Ò&VBÖ6öÖ&–æF–öç2#ãÇ7VÖÖ'“îzyyºî{¸NY‚Ç7ãâr²6VÆV7FVBæÆVæwF‚²r{¸CÂ÷7ããÂ÷7VÖÖ'“ãÆF—b6Æ73Ò&VBÖ6öÖ&òÖw&–B#âr²6VÆV7FVBæÖ†gVæ7F–öâ†ÖöB’°¢f"ÖVÖ&W'2ÒÖöBç7V&¦V7G2æÖ†gVæ7F–öâ‡2’²&WGW&âÒç&÷w2æf–æB†gVæ7F–öâ‡"’²&WGW&â"ææÖRÓÓÒ3²Ò“²Ò“°¢f"6ö×ÆWFRÒÖVÖ&W'2æÆVæwF‚âbbÖVÖ&W'2æWfW'’†gVæ7F–öâ‡"’²&WGW&â"bb"æ7GVÂÓÒçVÆÃ²Ò“°¢f"F÷FÂÒ6ö×ÆWFRòÖVÖ&W'2ç&VGV6R†gVæ7F–öâ†âÂ"’²&WGW&ââ²"æ7GVÃ²ÒÂ’¢çVÆÂÂ×"Ò&æ·5¶ÖöBæ–EÒÇÂ·Ó°¢&WGW&âsÆ'F–6ÆSãÆƒ3âr²W62†ÖöBææÖR’²sÂöƒ3ãÇâr²W62†ÖöBç7V&¦V7G2æ¦ö–â‚r²r’’²sÂ÷ãÆ#âr²‡F÷FÂÓÓÒçVÆÂò~zyyºîXˆni[[è^Š^›Ùr¢f×B‡F÷FÂ’²rXˆbr’²sÂö#âr²µ²w–V%&æ²rÂw–V%'F–6—çG2rÂ~[›Nhé"uÒÅ²v6Æ75&æ²rÂv6Æ75'F–6—çG2rÂ~xúŞhé"uÕÒæÖ†gVæ7F–öâ‡—"’°¢f"âÒçVÖ&W"†×%·—%³ÕÒ’ÂV÷ÆRÒçVÖ&W"†×%·—%³ÕÒ“²&WGW&ââÓÒçVÆÂòsÇ6ÖÆÃâr²—%³%Ò²rr²f×B†â’²‡V÷ÆRÓÒçVÆÂòròr²f×B‡V÷ÆR’²rK«¢r¢rr’²sÂ÷6ÖÆÃâr¢rs°¢Ò’æ¦ö–â‚rr’²sÂö'F–6ÆSâs°¢Ò’æ¦ö–â‚rr’²sÂöF—cãÂöFWF–Ç3âs°¢Ğ¢gVæ7F–öâÆ÷B†FF’°¢f"Ö÷fVÖVçBÒFFæÖöFRÓÓÒvÖ÷fVÖVçBrÂÆWGFRÒFFçÆWGFS°¢f"6ö×7BÒv–æF÷ræÖF6„ÖVF–bbv–æF÷ræÖF6„ÖVF–‚r†Ö‚×v–GFƒ£c#‚’r’æÖF6†W3°¢f"†÷7BÒFö7VÖVçBævWDVÆVÖVçD'”–B‚vVB×VG&çG2r’Â&÷‚Ò†÷7Bbbv–æF÷rævWD6ö×WFVE7G–ÆR††÷7B“°¢f"rÒ6ö×7BòÖF‚æÖ‚ƒ#CÂÖF‚ç&÷VæB††÷7Bæ6Æ–VçEv–GF‚Ò'6TfÆöB†&÷‚çFF–ætÆVgBÇÂ’Ò'6TfÆöB†&÷‚çFF–æu&–v‡BÇÂ’’’¢cc°¢f"‚Ò6ö×7Bò3¢C3ÂÆVgBÒ6ö×7BòCR¢ƒRÂ&–v‡BÒ6ö×7BòrÒ‚¢SsS°¢f"F÷Ò6ö×7Bò#"¢c"Â&÷GFöÒÒ6ö×7Bò#S"¢3CÂF–6µ’Ò6ö×7Bò#s‚¢3cS°¢f"ö–çG2ÒFFçö–çG2ÂÖ…‚ÒÖF‚æÖ‚ƒÂÖF‚æ6V–Â„ÖF‚æÖ‚æÇ’†çVÆÂÂö–çG2æÖ†gVæ7F–öâ‡’²&WGW&âÖF‚æ'2‡ç‚“²Ò’’ò’¢’ÂÖ…’ÒÖF‚æÖ‚ƒÂÖF‚æ6V–Â„ÖF‚æÖ‚æÇ’†çVÆÂÂö–çG2æÖ†gVæ7F–öâ‡’²&WGW&âÖF‚æ'2‡ç’“²Ò’’ò’¢“°¢f"Æ÷rÒÂ†–v‚Ò°¢–b†Ö÷fVÖVçB’°¢f"Ö–âÒÖF‚æÖ–âæÇ’†çVÆÂÂFFç÷6—F–öç2’ÂÖ‚ÒÖF‚æÖ‚æÇ’†çVÆÂÂFFç÷6—F–öç2’ÂBÒÖF‚æÖ‚ƒ"Â†Ö‚ÒÖ–â’¢ãR“°¢Æ÷rÒÖF‚æÖ‚ƒÂÖF‚æfÆö÷"‚†Ö–âÒB’òR’¢R“²†–v‚ÒÖF‚æÖ–âƒÂÖF‚æ6V–Â‚†Ö‚²B’òR’¢R“°¢–b††–v‚ÒÆ÷rÂ’²†–v‚ÒÖF‚æÖ–âƒÂÆ÷r²“²Æ÷rÒÖF‚æÖ‚ƒÂ†–v‚Ò“²Ğ¢Ğ¢gVæ7F–öâ÷6—F–öå’‡fÇVR’²&WGW&âF÷²‡fÇVRÒÆ÷r’ò††–v‚ÒÆ÷r’¢†&÷GFöÒÒF÷“²Ğ¢f"7‚Ò†ÆVgB²&–v‡B’ò"Â7’ÒÖ÷fVÖVçBò÷6—F–öå’†FFç÷6—F–öâ’¢‡F÷²&÷GFöÒ’ò#°¢f"7‚Ò‡&–v‡BÒÆVgB’ò"òÖ…‚Â7’Ò†&÷GFöÒÒF÷’ò"òÖ…’ÂÖ&·2Òrs°¢gVæ7F–öâ”f÷"‡’²&WGW&âÖ÷fVÖVçBò÷6—F–öå’‡ç&÷u·f–Wrç66÷UÒçW&6VçB’¢7’Òç’¢7“²Ğ¢²ÓÂÒãRÂãRÂÒæf÷$V6‚†gVæ7F–öâ‡B’°¢f"‚Ò7‚²B¢‡&–v‡BÒÆVgB’ò#°¢Ö&·2³ÒsÆÆ–æRƒÒ"r²‚²r"“Ò"r²F÷²r"ƒ#Ò"r²‚²r"“#Ò"r²&÷GFöÒ²r"6Æ73Ò&VBÖw&–BÖÆ–æR"óãÇFW‡BƒÒ"r²‚²r"“Ò"r²F–6µ’²r"FW‡BÖæ6†÷#Ò&Ö–FFÆR#âr²6–væVB‡B¢Ö…‚’²sÂ÷FW‡Câs°¢Ò“°¢†Ö÷fVÖVçBò³Âã#RÂãRÂãsRÂÒ¢²ÓÂÒãRÂÂãRÂÒ’æf÷$V6‚†gVæ7F–öâ‡B’°¢f"÷6—F–öâÒÆ÷r²B¢††–v‚ÒÆ÷r’Â’ÒÖ÷fVÖVçBò÷6—F–öå’‡÷6—F–öâ’¢7’ÒB¢†&÷GFöÒÒF÷’ò#°¢Ö&·2³ÒsÆÆ–æRƒÒ"r²ÆVgB²r"“Ò"r²’²r"ƒ#Ò"r²&–v‡B²r"“#Ò"r²’²r"6Æ73Ò&VBÖw&–BÖÆ–æR"óãÇFW‡BƒÒ"r²†ÆVgBÒ’’²r"“Ò"r²‡’²B’²r"FW‡BÖæ6†÷#Ò&VæB#âr²†Ö÷fVÖVçBòf×D6†ævR‡÷6—F–öâ’²rRr¢6–væVB‡B¢Ö…’’’²sÂ÷FW‡Câs°¢Ò“°¢f"w&÷W2ÒæWrÖ‚“²ö–çG2æf÷$V6‚†gVæ7F–öâ‡’²f"¶W’Òç‚çFôf—†VBƒb’²wÂr²ç’çFôf—†VBƒb“²–b‚w&÷W2æ†2†¶W’’’w&÷W2ç6WB†¶W’ÂµÒ“²w&÷W2ævWB†¶W’’çW6‚‡“²Ò“°¢f"F÷G2Ò'&’æg&öÒ†w&÷W2çfÇVW2‚’’æÖ†gVæ7F–öâ‡2’°¢f"Ò5³ÒÂÆ&VÂÒ2æÖ†gVæ7F–öâ‡’²&WGW&âç&÷rææÖS²Ò’æ¦ö–â‚~8r’Â‚Ò7‚²ç‚¢7‚Â’Ò”f÷"‡“°¢&WGW&âsÆr&öÆSÒ&'WGFöâ"F&–æFWƒÒ#"&–ÖÆ&VÃÒ"r²W62†Æ&VÂ²~ûÈÎiú^yÈ¾zyyºîŠxër’²r"FFÖVB×ö–çCÒ"r²æ–æFW‚²r#ãÇF—FÆSâr²W62†Æ&VÂ’²sÂ÷F—FÆSãÆ6—&6ÆR7ƒÒ"r²‚²r"7“Ò"r²’²r"#Ò"r²†6ö×7Bò¢2’²r"f–ÆÃÒ"r²ÆWGFU·æw&÷WÒæ6öÆ÷"²r"óãÇFW‡BƒÒ"r²‚²r"“Ò"r²’²r"FW‡BÖæ6†÷#Ò&Ö–FFÆR"FöÖ–æçBÖ&6VÆ–æSÒ&6VçG&Â"6Æ73Ò&VBÖF÷BÖçVÖ&W"#âr²‡2æÆVæwF‚âò2æÆVæwF‚²†6ö×7Bòrr¢~zyr’¢æ–æFW‚’²sÂ÷FW‡CãÂösâs°¢Ò’æ¦ö–â‚rr“°¢f"„Æ&VÂÒÖ÷fVÖVçBòFFçv–æF÷u6—¦RÓÓÒw&V6VçBrò~(i˜jÚRò‹ù¾jÚR(i.ûÈy›îXˆnx+’òYË®ûÈ’r¢~(i˜jÚRò‹ù¾jÚR(i.ûÈy›îXˆnx+ûÈ’r¢~[é~Xˆnxè~‹è>YØ~XÎûÈy›îXˆnx+ûÈ(i"s°¢f"66W76–&ÆRÒÖ÷fVÖVçBò~[Ù>X˜Şhé.YŞKˆîXùXÉnY¹¾‹™™8.Kˆ®ikhé.YŞ‹è>™ÚX˜ŞûÈÎXû>Kê~jÚ>YÊ‹ù¾jÚ^ûÈÎ[znKê~jÚ>YÊ˜jÚ^8"r¢~iÊÎjÊˆ>Šù^[Ë®[ËzyY¹¾‹™™8.Xû>Kê~[é~Xˆnxè~‹è>š¹ûÈÎKˆ®ikhé.YŞ‹è>™ÚX˜Ş8"s°¢f"&Vv–öç2ÒsÇ&V7BƒÒ"r²ÆVgB²r"“Ò"r²F÷²r"v–GFƒÒ"r²†7‚ÒÆVgB’²r"†V–v‡CÒ"r²†7’ÒF÷’²r"f–ÆÃÒ"r²ÆWGFRç÷FVçF–Âæ6öÆ÷"²s"óãÇ&V7BƒÒ"r²7‚²r"“Ò"r²F÷²r"v–GFƒÒ"r²‡&–v‡BÒ7‚’²r"†V–v‡CÒ"r²†7’ÒF÷’²r"f–ÆÃÒ"r²ÆWGFRç7G&VæwF‚æ6öÆ÷"²s"óãÇ&V7BƒÒ"r²ÆVgB²r"“Ò"r²7’²r"v–GFƒÒ"r²†7‚ÒÆVgB’²r"†V–v‡CÒ"r²†&÷GFöÒÒ7’’²r"f–ÆÃÒ"r²ÆWGFRç7W÷'Bæ6öÆ÷"²s"óãÇ&V7BƒÒ"r²7‚²r"“Ò"r²7’²r"v–GFƒÒ"r²‡&–v‡BÒ7‚’²r"†V–v‡CÒ"r²†&÷GFöÒÒ7’’²r"f–ÆÃÒ"r²ÆWGFRæ6ö×WFRæ6öÆ÷"²s"óâs°¢&WGW&âsÇ7fr6Æ73Ò&VB×VG&çB"FFÖÆ–÷WCÒ"r²†6ö×7Bòv6ö×7Br¢wv–FRr’²r"f–Wt&÷ƒÒ#r²r²rr²‚²r"&öÆSÒ&w&÷W"&–ÖÆ&VÃÒ"r²66W76–&ÆR²~Šún{¸ni[XÎŠxKˆ¾ikzyyºîhÈ™*î8"#âr²&Vv–öç2²Ö&·2²sÇF‚CÒ$Òr²ÆVgB²rr²7’²t‚r²&–v‡B²tÒr²7‚²rr²F÷²ubr²&÷GFöÒ²r"6Æ73Ò&VBÖ†—2"óãÇFW‡BƒÒ"r²7‚²r"“Ò"r²F–6µ’²r"FW‡BÖæ6†÷#Ò&Ö–FFÆR#ãÂ÷FW‡Câr°¢†6ö×7Bòrr¢sÇFW‡B6Æ73Ò&VBÖ†—2ÖÆ&VÂ"ƒÒ#33"“Ò#C"FW‡BÖæ6†÷#Ò&Ö–FFÆR#âr²„Æ&VÂ²sÂ÷FW‡CãÇFW‡B6Æ73Ò&VBÖ†—2ÖÆ&VÂ"G&ç6f÷&ÓÒ'G&ç6ÆFRƒb#’&÷FFR‚Ó“’"FW‡BÖæ6†÷#Ò&Ö–FFÆR#âr²†Ö÷fVÖVçBò~[Ù>X˜Şhé.YŞKØŞjùNûÈ‹h®Kˆ®‹h®Z[ŞûÈ’r¢~hé.YŞ‹è>YØ~XÎš(nXXûÈy›îXˆnx+ûÈ(i"r’²sÂ÷FW‡Câr’²F÷G2²sÂ÷7fsâs°¢Ğ¢gVæ7F–öâVG&çG4‡FÖÂ†ÒÂ66÷RÂB’°¢f"Ö÷fVÖVçBÒBæÖöFRÓÓÒvÖ÷fVÖVçBrÂ66÷TæÖRÒ66÷RÓÓÒw–V"rò~[›N{ªrr¢~xúŞ{ªrrÂÆWGFRÒBçÆWGFS°¢f"Ö—76–ærÒÖ÷fVÖVçBòBæÖ—76–ær¢Òæ–æ6ÇVFVBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&âBçö–çG2ç6öÖR†gVæ7F–öâ‡’²&WGW&âç&÷rÓÓÒ#²Ò“²Ò’æÖ†gVæ7F–öâ‡"’²&WGW&â²&÷s¢"Â&V6öã¢"ç&FRÓÓÒçVÆÂò~{Ë®[	iÈiXiÈ{¸Xˆnh‰nkºXˆbr¢%·66÷UÒæ–çfÆ–Bò~YŞjÊKˆîK«®i[KˆŞKˆˆ{Br¢~{Ë®[	r²66÷TæÖR²~KØŞjùNûÈŠû~Š^YŞjÊKˆîK«®i[ûÈ’rÓ²Ò“°¢f"&VG’ÒÖ÷fVÖVçBòBæ7W'&VçD6÷VçBãÒ"bbBçö–çG2æÆVæwF‚â¢Bçö–çG2æÆVæwF‚ãÒ#°¢f"ÖöFW2ÒsÆF—b6Æ73Ò&VB×66÷R"&öÆSÒ&w&÷W"&–ÖÆ&VÃÒ.Y¹¾‹™™ŠxnY»â#âr²µ²vÖ÷fVÖVçBrÂ~hé.YŞKˆîXùXÉbuÒÅ²wW&f÷&Öæ6RrÂ~iÊÎjÊŠxëuÕÒæÖ†gVæ7F–öâ‡—"’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"FFÖVBÖÖöFSÒ"r²—%³Ò²r"&–×&W76VCÒ"r²†BæÖöFRÓÓÒ—%³Ò’²r#âr²—%³Ò²sÂö'WGFöãâs²Ò’æ¦ö–â‚rr’²sÂöF—câs°¢f"&ævRÒsÆF—b6Æ73Ò&VB×66÷R"&öÆSÒ&w&÷W"&–ÖÆ&VÃÒ.Y¹¾‹™™hé.YŞˆÈ>Y»B#âr²²w–V"rÂv6Æ72uÒæÖ†gVæ7F–öâ‡2’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"FFÖVB×66÷SÒ"r²2²r"&–×&W76VCÒ"r²‡2ÓÓÒ66÷R’²r#âr²‡2ÓÓÒw–V"rò~hÈ[›N{ªrr¢~hÈxúŞ{ªrr’²sÂö'WGFöãâs²Ò’æ¦ö–â‚rr’²sÂöF—câs°¢f"ÖWF†öBÒÖ÷fVÖVçBò~{«^‹ÛNi‹îzK®iÊÎjÊr²66÷TæÖR²~KØŞjùNûÈÎKº^iÊÎjÊr²Bæ7W'&VçD6÷VçB²rzyKØŞjùNKŠŞKØŞi[Æ#îX˜Òr²f×B†Bç÷6—F–öâ’²rSÂö#âX‰.XˆnKŠ®K«®y»Zû[Ë®[Ë8.jŠ®‹ÛNKºRK‹®yXÎûÈÎXû>‹ù¾jÚ^8[zn˜jÚ^8"r²†Bçv–æF÷u6—¦RÓÓÒw&V6VçBrò~‹ù>jÊ‹h¾X«şXÈ^Y
¾iÊÎjÊûÈÎhÈˆ>Šù^YË®jÊŠêzé~[›>YØ~XùXÉnûÈÎKˆŞhÈ™{N™©NZJi[Šêzé~8"r¢~XùXÉbÒKˆ®KˆjÊXúşjùNˆ>Šù^KØŞjùB(‰"iÊÎjÊKØŞjùN8"r’²~Xú®jùN‹è>i»Niz8r²†Bç6ÖT6FVv÷'’ò~YÎXˆn{¾8r¢rr’²~YÎzyyºî8YÎhé.YŞˆÈ>Y»Ny¨NiÈiXhé.YŞûÉ¾[{.™©‰xşˆ>Šù^KˆŞXø.KˆîXènXû.jùN‹è>ûÈÎYÎKˆZJKˆŞhêijŞXXYî8.XùXÉnY¹¾ˆˆŞK©NXZ^X‹ãKŠ®y›îXˆnx+YîK‹¢ûÈÎj~K‹®Yû®iÊÎhÈ[›>8"r¢~Kº^‹ù’r²Bçö–çG2æÆVæwF‚²rzyy¨N[›>YØ~[é~XˆnxèrÆ#âr²f×B†Bç&FR’²rSÂö#î8[›>YØrr²66÷TæÖR²~KØŞjùBÆ#îX˜Òr²f×B†Bç÷6—F–öâ’²rSÂö#âK‹®XˆnyXÎ8.YNzyzØiØ>ûÈÎK¸^XøŞiŠiÊÎjÊˆ>Šù^Xh^y¨Ny»Zû[Ë®[ËûÈÎKˆŞKº>ŠŠù^XÛ~™«î[ªnh‰n™[şiÉşkN[›>8.YØ~XÎ{«şKˆ®y¨Nzyyºîj~K‹®(	Îhê^‹ùYØ~XÎ(	Ş8"s°¢f"V×G’ÒÖ÷fVÖVçBòBæ7W'&VçD6÷VçBÂ"ò~iÊÎjÊˆ{>[	™ÈŠh"™zzyyºîy¨NiÈiX‚r²66÷TæÖR²~KØŞjùNûÈÎh˜Şˆ;ŞX‰.XˆnKŠ®K«®y»Zû[Ë®[Ë8.Š^XX^YŞjÊKˆîXø.ˆ>K«®i[ûÈÎh‰ny»Nhê^Z¾XiKØŞjùNXÛ>Xúş8"r¢Bçv–æF÷u6—¦RÓÓÒw&V6VçBrò~‹ùk*iÈzyyºîX[~ZH~iÊÎjÊXø®K˜¾X˜Ó.jÊy¨NXúşjùNhé.YŞûÈÎXúşKº^XXXˆ~hÚ.(	Î‹è>Kˆ®jÊ(	ŞûÈÎh‰niú^yÈ¾(	ÎiÊÎjÊŠxë(	Ş8"r¢~‹ùk*iÈzyyºîX[~ZH~i»Nizy¨NXúşjùNhé.YŞûÈÎXúşKº^XXiú^yÈ¾(	ÎiÊÎjÊŠxë(	Ş8.{Ë®[	XènXû.KˆŞKÉ®ŠëKÙÎhÈ[›>8"r¢~ˆ{>[	™ÈŠh"™zzyyºîy¨NiÈiX[é~Xˆnxè~Y(Âr²66÷TæÖR²~KØŞjùN8.Š^XX^YŞjÊKˆîXø.ˆ>K«®i[ûÈÎh‰ny»Nhê^Z¾XiKØŞjùNXÛ>Xúş8"s°¢&WGW&âsÆF—b6Æ73Ò&VB×6V7F–öâÖ†VB#ãÆF—cãÇ7â6Æ73Ò&VBÖW–V'&÷r#ã2ò[Ë®[ËzyÂ÷7ããÆƒ#âr²†Ö÷fVÖVçBò~YNzyhé.YŞKˆîXùXÉbr¢~‹ùKˆYË®ûÈÎY:®K©¾zyyºîXÎ[é~˜xŞx+X[>k:‚r’²sÂöƒ#ãÇâr²†Ö÷fVÖVçBò~‹h®™ÚKˆ®ûÈÎ[Ù>X˜Şhé.YŞ‹h®™ÚX˜ŞûÉ¾‹h®™ÚXû>ûÈÎiÈ‹ù‹ù¾jÚ^‹h®iˆîi‹î8"r¢~‹h®™ÚXû>ûÈÎ[é~Xˆnxè~‹h®š¹ûÉ¾‹h®™ÚKˆ®ûÈÎYÊYÎˆÈ>Y»Nˆ>yIşKŠŞhé.YŞ‹h®™ÚX˜Ş8"r’²sÂ÷ãÂöF—cãÂöF—cãÆF—b6Æ73Ò&VBÖ6†'BÖ6öçG&öÇ2#âr²ÖöFW2²&ævR²†Ö÷fVÖVçBòsÆÆ&VÂ6Æ73Ò&VB×v–æF÷r#îjùN‹è>Xˆn{³Ç6VÆV7BFFÖVBÖ6FVv÷'’&–ÖÆ&VÃÒ.hé.YŞXùXÉnjùN‹è>Xˆn{²#ãÆ÷F–öâfÇVSÒ&ÆÂ"r²†Bç6ÖT6FVv÷'’òrr¢w6VÆV7FVBr’²sîXZ˜:Xˆn{³Âö÷F–öããÆ÷F–öâfÇVSÒ'6ÖR"r²†Bç6ÖT6FVv÷'’òw6VÆV7FVBr¢rr’²sîK¸^YÎXˆn{³Âö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÂ6Æ73Ò&VB×v–æF÷r#îjùN‹è>Xú>[èCÇ6VÆV7BFFÖVB×v–æF÷r&–ÖÆ&VÃÒ.hé.YŞXùXÉnjùN‹è>Xú>[èB#ãÆ÷F–öâfÇVSÒ'&Wf–÷W2"r²‡f–WrçG&VæEv–æF÷rÓÒw&V6VçBròw6VÆV7FVBr¢rr’²sî‹è>Kˆ®jÊXúşjùNˆ>ŠùSÂö÷F–öããÆ÷F–öâfÇVSÒ'&V6VçB"r²‡f–WrçG&VæEv–æF÷rÓÓÒw&V6VçBròw6VÆV7FVBr¢rr’²sî‹ù>jÊ‹h¾X«óÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃâr¢rr’²sÂöF—câr°¢‚&VG’òsÆF—b6Æ73Ò&VBÖV×G’#ãÆƒ3âr²†Ö÷fVÖVçBò~i¨.i{nizk9^jùN‹è>hé.YŞXùXÉbr¢~‹ù[zîKˆx+i[hÚîûÈÎ[ˆ;ŞjùN‹è>YNzyŠxër’²sÂöƒ3ãÇâr²V×G’²sÂ÷âr²†Ö÷fVÖVçBòsÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&VBÖ'WGFöâ"FFÖVBÖÖöFSÒ'W&f÷&Öæ6R#îiú^yÈ¾iÊÎjÊŠxëÂö'WGFöãâr¢'WGFöâ‚~Š^[Ù^h‰{ºKˆîhé.YÒrÂvVF—Br’’²sÂöF—câr ¢sÆF—b6Æ73Ò&VBÖ6†'BÖÆ–÷WB#ãÆF—câr²Æ÷B†B’²sÆF—b6Æ73Ò&VB×VG&çBÖ¶W’"&–ÖÆ&VÃÒ.Y¹¾‹™™XË®YùşŠûNiˆâ#âr²µ²w÷FVçF–ÂrÂ~[znKˆ¢uÒÅ²w7G&VæwF‚rÂ~Xû>Kˆ¢uÒÅ²w7W÷'BrÂ~[znKˆ²uÒÅ²v6ö×WFRrÂ~Xû>Kˆ²uÕÒæÖ†gVæ7F–öâ†—FVÒ’²&WGW&âsÇ7ããÆ’7G–ÆSÒ&&6¶w&÷VæC¢r²ÆWGFU¶—FVÕ³ÕÒæ6öÆ÷"²r#ãÂö“ãÇ6ÖÆÃâr²—FVÕ³Ò²sÂ÷6ÖÆÃâr²ÆWGFU¶—FVÕ³ÕÒçF—FÆR²sÂ÷7ãâs²Ò’æ¦ö–â‚rr’²sÂöF—cãÇ6Æ73Ò&VBÖ6†'BÖ6F–öâ#âr²†Ö÷fVÖVçBò~jŠ®‹ÛNûÉ®KØŞjùNXùXÉnûÈ‚r²†Bçv–æF÷u6—¦RÓÓÒw&V6VçBrò~y›îXˆnx+’òYË¢r¢~y›îXˆnx+’r’²~ûÈûÉ¾{«^‹ÛNûÉ®iÊÎjÊhé.YŞKØŞjùN8"r¢~jŠ®‹ÛNûÉ®[é~Xˆnxè~‹è>YØ~XÎûÉ¾{«^‹ÛNûÉ®hé.YŞKØŞjùNy»ZûYØ~XÎy¨Nš(nXXzˆ¾[ªn8"r’²sÂ÷ãÆF—b6Æ73Ò&VB×ö–çBÖÆ—7B#âr²Bçö–çG2æÖ†gVæ7F–öâ‡’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"FFÖVB×ö–çCÒ"r²æ–æFW‚²r"&–×&W76VCÒ&fÇ6R#ãÆ’7G–ÆSÒ&&6¶w&÷VæC¢r²ÆWGFU·æw&÷WÒæ6öÆ÷"²r#âr²æ–æFW‚²sÂö“âr²W62‡ç&÷rææÖR’²sÂö'WGFöãâs²Ò’æ¦ö–â‚rr’²sÂöF—cãÂöF—cãÆ6–FR6Æ73Ò&VBÖ–ç7V7B"&–ÖÆ—fSÒ'öÆ—FR#ãÂö6–FSãÂöF—câr°¢sÆF—b6Æ73Ò&VB×VG&çBÖw&÷W2#âr²²w7G&VæwF‚rÂw÷FVçF–ÂrÂv6ö×WFRrÂw7W÷'BuÒæÖ†gVæ7F–öâ†¶W’’²f"æÖW2ÒBçö–çG2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âæw&÷WÓÓÒ¶W“²Ò’æÖ†gVæ7F–öâ‡’²&WGW&âç&÷rææÖS²Ò“²&WGW&âsÆ'F–6ÆSãÆƒ3ãÆ’7G–ÆSÒ&&6¶w&÷VæC¢r²ÆWGFU¶¶W•Òæ6öÆ÷"²r#ãÂö“âr²ÆWGFU¶¶W•ÒçF—FÆR²sÂöƒ3ãÆ#âr²†æÖW2æÆVæwF‚òW62†æÖW2æ¦ö–â‚~8r’’¢~i¨.izzyyºâr’²sÂö#ãÇâr²ÆWGFU¶¶W•ÒçFW‡B²sÂ÷ãÂö'F–6ÆSâs²Ò’æ¦ö–â‚rr’²sÂöF—cãÆFWF–Ç26Æ73Ò&VBÖÖWF†öB#ãÇ7VÖÖ'“îXˆnyXÎKˆîjùN‹è>ŠûNiˆãÂ÷7VÖÖ'“ãÇâr²ÖWF†öB²sÂ÷ãÂöFWF–Ç3âr’°¢†Ö—76–æræÆVæwF‚òsÆFWF–Ç26Æ73Ò&VBÖÖ—76–ær#ãÇ7VÖÖ'“âr²Ö—76–æræÆVæwF‚²rzyi¨.iÊ®Xø.Kˆâr²†Ö÷fVÖVçBò~XùXÉnjùN‹è2r¢~Y¹¾‹™™r’²sÂ÷7VÖÖ'“ãÇVÃâr²Ö—76–æræÖ†gVæ7F–öâ†—FVÒ’²&WGW&âsÆÆ“âr²W62†—FVÒç&÷rææÖR’²~ûÉ¢r²W62†—FVÒç&V6öâ’²sÂöÆ“âs²Ò’æ¦ö–â‚rr’²sÂ÷VÃãÂöFWF–Ç3âr¢rr’°¢†Òç&÷w2ç6öÖR†gVæ7F–öâ‡"’²&WGW&â"æW†6ÇVFVC²Ò’òsÇ6Æ73Ò&VBÖÖWF†öB#î(	ÎKˆŞŠêh¾Xˆn(	Şy¨N{¹şŠêšKùŞyYYÊh‰{ºŠKŠŞûÈÎKˆŞXø.Kˆî[Ë®[ËzyjùN‹è>8#Â÷âr¢rr“°¢Ğ¢gVæ7F–öâ&–æEVG&çG2†W†ÒÂÒ’°¢f"†÷7BÒFö7VÖVçBçVW'•6VÆV7F÷"‚r6VB×VG&çG2r“²–b‚†÷7B’&WGW&ã°¢f"BÒf–Wræ6†'DÖöFRÓÓÒwW&f÷&Öæ6RròVG&çDFF†ÒÂf–Wrç66÷R’¢Ö÷fVÖVçDFF†W†ÒÂÒÂf–Wrç66÷RÂf–WrçG&VæEv–æF÷rÇÂw&Wf–÷W2rÂf–Wrç6ÖT6FVv÷'’ÓÓÒG'VR“°¢†÷7Bæ–ææW$…DÔÂÒVG&çG4‡FÖÂ†ÒÂf–Wrç66÷RÂB“°¢gVæ7F–öâ6VÆV7B†–æFW‚ÂW6W$–æ—F–FVB’°¢f"ÒBçö–çG2æf–æB†gVæ7F–öâ‡’²&WGW&âæ–æFW‚ÓÓÒçVÖ&W"†–æFW‚“²Ò’Â–ç7V7BÒ†÷7BçVW'•6VÆV7F÷"‚ræVBÖ–ç7V7Br“²–b‚ÇÂ–ç7V7B’&WGW&ã°¢f""Òç&÷rÂ66÷TæÖRÒf–Wrç66÷RÓÓÒw–V"rò~[›N{ªrr¢~xúŞ{ªrrÂÖ÷fVÖVçBÒBæÖöFRÓÓÒvÖ÷fVÖVçBs²f–Wrçö–çDæÖRÒ"ææÖS°¢–b‡W6W$–æ—F–FVB’G&6²‚vW†ÕöFWF–Å÷VG&çE÷7V&¦V7E÷6VÆV7FVBrÂ²ÖöFS¢BæÖöFRÂ66÷S¢f–Wrç66÷RÒ“°¢f"†—7F÷'’ÒÖ÷fVÖVçBòsÆöÂ6Æ73Ò&VBÖ†—7F÷'’#âr²æö'6W'fF–öç2æÖ†gVæ7F–öâ†òÂ’’²&WGW&âsÆÆ“ãÇ7ãâr²W62‚†’ÓÓÒæö'6W'fF–öç2æÆVæwF‚Òò~iÊÎjÊ+rr¢rr’²òæW†ÒææÖR’²sÂ÷7ããÇ6ÖÆÃâr²W62†f×E–V$FFR†òæW†ÒæW†ÕöFFR’’²sÂ÷6ÖÆÃãÆ#âr²W62‡&æµFW‡B†òæ–æfò’’²sÂö#âr²†òæ–æfòæâÓÒçVÆÂòsÇ6ÖÆÃâr²W62‡&æµ7V"†òæ–æfò’’²sÂ÷6ÖÆÃâr¢rr’²sÂöÆ“âs²Ò’æ¦ö–â‚rr’²sÂööÃâr¢rs°¢–ç7V7Bæ–ææW$…DÔÂÒsÇ7â6Æ73Ò&VBÖW–V'&÷r#îzyyºîŠx.ZùóÂ÷7ããÆƒ3âr²W62‡"ææÖR’²sÂöƒ3ãÇ7â6Æ73Ò&VB×Fr"7G–ÆSÒ&6öÆ÷#¢r²BçÆWGFU·æw&÷WÒæ6öÆ÷"²r#âr²BçÆWGFU·æw&÷WÒçF—FÆR²sÂ÷7ããÆFÃâr°¢†Ö÷fVÖVçBòsÆF—cãÆGCâr²66÷TæÖR²~hé.YÓÂöGCãÆFCâr²W62‡&æµFW‡B‡%·f–Wrç66÷UÒ’’²sÂöFCãÂöF—câr¢sÆF—cãÆGCîiÈ{¸XˆbòkºXˆcÂöGCãÆFCâr²f×B‡"æ7GVÂ’²ròr²f×B‡"æÖ‚’²sÂöFCãÂöF—cãÆF—cãÆGCî[é~XˆnxèsÂöGCãÆFCâr²f×B‡"ç&FR’²rSÂöFCãÂöF—câr’°¢sÆF—cãÆGCîiÊÎjÊr²66÷TæÖR²~KØŞjùCÂöGCãÆFCîX˜Òr²f×B‡%·f–Wrç66÷UÒçW&6VçB’²rSÂöFCãÂöF—câr²†Ö÷fVÖVçBòsÆF—cãÆGCâr²†Bçv–æF÷u6—¦RÓÓÒw&V6VçBrò~‹ù>jÊ‹h¾X«òr¢~‹è>Kˆ®jÊr’²sÂöGCãÆFB6Æ73Ò&VBÖ6†ævR#âr²6†ævUFW‡B‡ÂBçv–æF÷u6—¦RÓÓÒw&V6VçBr’²sÂöFCãÂöF—câr¢rr’²sÂöFÃãÇâr²BçÆWGFU·æw&÷WÒçFW‡B²sÂ÷âr²†—7F÷'’²sÇ6ÖÆÃâr²†Ö÷fVÖVçBò~[Ë®[ËzyhÈiÊÎjÊYNzyKØŞjùNKŠŞKØŞi[X‰.Xˆn8"r¢~y»ZûiÊÎjÊXø.KˆîjùN‹è>y¨NYNzyYØ~XÎ8"r’²sÂ÷6ÖÆÃâs°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚v'WGFöå¶FFÖVB×ö–çEÒr’æf÷$V6‚†gVæ7F–öâ†VÂ’²VÂç6WDGG&–'WFR‚v&–×&W76VBrÂ7G&–ær†VÂæFF6WBæVEö–çBÓÓÒ7G&–ær†–æFW‚’’“²Ò“°¢Ğ¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖVB×ö–çEÒr’æf÷$V6‚†gVæ7F–öâ†VÂ’²VÂæöæ6Æ–6²ÒgVæ7F–öâ‚’²6VÆV7B†VÂæFF6WBæVEö–çBÂG'VR“²Ó²–b†VÂçFtæÖRçFôÆ÷vW$66R‚’ÓÓÒvrr’VÂæöæ¶W–F÷vâÒgVæ7F–öâ†R’²–b†Ræ¶W’ÓÓÒtVçFW"rÇÂRæ¶W’ÓÓÒrr’²Rç&WfVçDFVfVÇB‚“²6VÆV7B†VÂæFF6WBæVEö–çBÂG'VR“²ÒÓ²Ò“°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖVB×66÷UÒr’æf÷$V6‚†gVæ7F–öâ†"’²"æöæ6Æ–6²ÒgVæ7F–öâ‚’²f–Wrç66÷RÒ"æFF6WBæVE66÷S²G&6²‚vW†ÕöFWF–Å÷VG&çE÷66÷Uö6†ævVBrÂ²66÷S¢f–Wrç66÷RÒ“²&–æEVG&çG2†W†ÒÂÒ“²Fö7VÖVçBçVW'•6VÆV7F÷"‚u¶FFÖVB×66÷SÒ"r²f–Wrç66÷R²r%Òr’æfö7W2‚“²Ó²Ò“°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖVBÖÖöFUÒr’æf÷$V6‚†gVæ7F–öâ†"’²"æöæ6Æ–6²ÒgVæ7F–öâ‚’²f–Wræ6†'DÖöFRÒ"æFF6WBæVDÖöFS²G&6²‚vW†ÕöFWF–Å÷VG&çEöÖöFUö6†ævVBrÂ²ÖöFS¢f–Wræ6†'DÖöFRÒ“²&–æEVG&çG2†W†ÒÂÒ“²†÷7BçVW'•6VÆV7F÷"‚u¶FFÖVBÖÖöFSÒ"r²f–Wræ6†'DÖöFR²r%Òr’æfö7W2‚“²Ó²Ò“°¢f"6FVv÷'•6VÆV7BÒ†÷7BçVW'•6VÆV7F÷"‚u¶FFÖVBÖ6FVv÷'•Òr“²–b†6FVv÷'•6VÆV7B’6FVv÷'•6VÆV7Bæöæ6†ævRÒgVæ7F–öâ‚’²f–Wrç6ÖT6FVv÷'’Ò6FVv÷'•6VÆV7BçfÇVRÓÓÒw6ÖRs²G&6²‚vW†ÕöFWF–Å÷VG&çEö6FVv÷'•÷66÷Uö6†ævVBrÂ²6ÖUö6FVv÷'“¢f–Wrç6ÖT6FVv÷'’Ò“²&–æEVG&çG2†W†ÒÂÒ“²†÷7BçVW'•6VÆV7F÷"‚u¶FFÖVBÖ6FVv÷'•Òr’æfö7W2‚“²Ó°¢f"v–æF÷u6VÆV7BÒ†÷7BçVW'•6VÆV7F÷"‚u¶FFÖVB×v–æF÷uÒr“²–b‡v–æF÷u6VÆV7B’v–æF÷u6VÆV7Bæöæ6†ævRÒgVæ7F–öâ‚’²f–WrçG&VæEv–æF÷rÒv–æF÷u6VÆV7BçfÇVS²G&6²‚vW†ÕöFWF–Å÷VG&çE÷v–æF÷uö6†ævVBrÂ²v–æF÷s¢f–WrçG&VæEv–æF÷rÒ“²&–æEVG&çG2†W†ÒÂÒ“²†÷7BçVW'•6VÆV7F÷"‚u¶FFÖVB×v–æF÷uÒr’æfö7W2‚“²Ó°¢f"f—'7BÒBçö–çG2æf–æB†gVæ7F–öâ‡’²&WGW&âç&÷rææÖRÓÓÒf–Wrçö–çDæÖS²Ò’ÇÂBçö–çG5³Ó²–b†f—'7B’6VÆV7B†f—'7Bæ–æFW‚ÂfÇ6R“°¢Ğ¢gVæ7F–öâW'4‡FÖÂ‡b’°¢f"7V&¦V7G2Ò'&’æg&öÒ†æWr6WB‡bçW'2æÖ†gVæ7F–öâ‡’²&WGW&âç7V&¦V7C²Ò’’“°¢f"f–ÇFW&VBÒbçW'2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âbç7V&¦V7BÇÂç7V&¦V7BÓÓÒbç7V&¦V7C²Ò“°¢&WGW&âsÆF—b6Æ73Ò&VB×W"×FööÇ2#ãÆÆ&VÃîzyyºãÇ6VÆV7BFFÖVB×7V&¦V7CãÆ÷F–öâfÇVSÒ"#îXZ˜:zyyºãÂö÷F–öãâr²7V&¦V7G2æÖ†gVæ7F–öâ‡2’²&WGW&âsÆ÷F–öâfÇVSÒ"r²W62‡2’²r"r²‡bç7V&¦V7BÓÓÒ2òw6VÆV7FVBr¢rr’²sâr²W62‡2’²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃâr²'WGFöâ‚~X‹~ikrÂw&Vg&W6‚×W'2r’²sÂöF—câr°¢†f–ÇFW&VBæÆVæwF‚òsÆF—b6Æ73Ò&VB×W"Öw&–B#âr²f–ÇFW&VBæÖ†gVæ7F–öâ‡"’°¢f"Æ&VÂÒ"ç7FGW2ÓÓÒw7V66VVFVBrò"æ÷F–öç2bb"æ÷F–öç2çW'÷6RÓÓÒw&V6÷&Brò~[{.[Ù^XZRr¢~XˆniéZèÎh‰r¢‡²'Vææ–æs¢~ZHNynKŠÒrÂW6VC¢~[è^{º~{ºÒrÂf–ÆVC¢~[è^h.ZHÒrÒ•·"ç7FGW5ÒÇÂ~[è^iú^yÈ²s°¢&WGW&âsÆ'F–6ÆR6Æ73Ò&VB×W"#ãÆF—cãÇ7â6Æ73Ò&VB×Fr#âr²W62‡"ç7V&¦V7B’²sÂ÷7ããÇ7â6Æ73Ò&VB×7FGW2#âr²Æ&VÂ²sÂ÷7ããÂöF—cãÆƒ3âr²W62‡"çF—FÆRÇÂ"ç7V&¦V7B²~Šù^XÛrr’²sÂöƒ3ãÇâr²W62‡"æ7&VFVEöBòæWrFFR‡"æ7&VFVEöB’çFôÆö6ÆU7G&–ær‚w¦‚Ô4âr’¢rr’²sÂ÷âr²‡"ç&öw&W72bb"ç7FGW2ÓÒw7V66VVFVBròsÇâr²W62‡"ç&öw&W72æÖW76vRÇÂrr’²sÂ÷âr¢rr’²sÆfö÷FW#âr²'WGFöâ‡"ç7FGW2ÓÓÒw7V66VVFVBrò~iú^yÈ¾[Ù^XZ^y¨Nš)‚r¢~iú^yÈ¾‹ù¾[ªbò[{.KùŞZÙš)yºârÂwW#¢r²"ç&WVW7Eö–BÂvVB×&–Ö'’r’²‡"ç7FGW2ÓÓÒw7V66VVFVBrbb‚"æ÷F–öç2ÇÂ"æ÷F–öç2çW'÷6RÓÒw&V6÷&Br’ò'WGFöâ‚~iú^yÈ¾XˆniérÂw&W÷'C¢r²"ç&WVW7Eö–B’¢rr’²sÂöfö÷FW#ãÂö'F–6ÆSâs°¢Ò’æ¦ö–â‚rr’²sÂöF—câr¢sÆF—b6Æ73Ò&VBÖV×G’#ãÆƒ3âr²‡bç7V&¦V7Bò~[Ù>X˜Ş[{.Xª‹ÛŞŠë[Ù^KŠŞk*iÈ‹ùzyy¨NŠù^š)‚r¢~‹ùjÊˆ>Šù^‹ùk*iÈ[{.[Ù^XZ^Šù^š)‚r’²sÂöƒ3ãÇîYÊ(	Î{Én‹éòŠ^[Ù^(	ŞKŠŞ˜hºzyyºî[Ù^XZ^Šù^XÛ~ûÈÎKùŞZÙYîKÉ®™¸nKŠŞi‹îzK®YÊ‹ù˜xÎ8.[{.iÈXˆniéK™şXúşKº^YÊXˆniéš^X[>ˆNX‹‹ùjÊˆ>Šù^8#Â÷âr²'WGFöâ‚~Xë¾[Ù^XZ^Šù^XÛrrÂvVF—Br’²sÂöF—câr’°¢sÆF—b6Æ73Ò&VB×W"×7FGW2"&öÆSÒ'7FGW2"&–ÖÆ—fSÒ'öÆ—FR#âr²W62‡bçW$W'&÷"ÇÂrr’²sÂöF—câr²‡bæÖ÷&Rò'WGFöâ‡bæÆöF–ærò~Šû¾XùnKŠŞ(
br¢~Xª‹ÛŞi»NZI®Šù^XÛrrÂvÖ÷&R×W'2r’¢rr“°¢Ğ¢gVæ7F–öâG&uW'2‡b’°¢f"†÷7BÒFö7VÖVçBçVW'•6VÆV7F÷"‚ræVB×W"Ö6öçFVçBr“²–b‚7F—fR‡b’ÇÂ†÷7B’&WGW&ã°¢†÷7Bæ–ææW$…DÔÂÒW'4‡FÖÂ‡b“°¢†÷7BçVW'•6VÆV7F÷"‚u¶FFÖVB×7V&¦V7EÒr’æöæ6†ævRÒgVæ7F–öâ†R’²bç7V&¦V7BÒRçF&vWBçfÇVS²G&6²‚vW†ÕöFWF–Å÷W'5öf–ÇFW&VBrÂ²f–ÇFW&VC¢bç7V&¦V7Bò¢Ò“²G&uW'2‡b“²Ó°¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖVCÒ'&Vg&W6‚×W'2%ÒÅ¶FFÖVCÒ&Ö÷&R×W'2%Òr’æf÷$V6‚†gVæ7F–öâ†"’²"æF—6&ÆVBÒbæÆöF–æs²Ò“°¢Ğ¢7–æ2gVæ7F–öâÆöEW'2‡bÂVæB’°¢f"vVâÒvVæW&F–öâÂ†÷7BÒFö7VÖVçBçVW'•6VÆV7F÷"‚ræVB×W"Ö6öçFVçBr“²–b‚†÷7BÇÂbæÆöF–ær’&WGW&ã°¢G&6²‚vW†ÕöFWF–Å÷W'5öÆöE÷7F'FVBrÂ²VæC¢VæBò¢Ò“°¢bæÆöF–ærÒG'VS²bçW$W'&÷"Òrs²–b‡bçW'2’G&uW'2‡b“²VÇ6R†÷7Bæ–ææW$…DÔÂÒsÇ6Æ73Ò&VBÖV×G’"&öÆSÒ'7FGW2#îjÚ>YÊŠû¾Xùn‹ùjÊˆ>Šù^y¨NŠù^š)(
cÂ÷âs°¢G'’°¢f"FFÒv—Bv–æF÷rå66÷&UW%&Wf–Wræ’‡bÂvÆ—7EöÆÂrÂ²W†Õö–C¢bæ–BÂöfg6WC¢VæBòbæöfg6WB¢Ò“°¢–b‚7F—fR‡b’ÇÂvVæW&F–öâÓÒvVâÇÂ†÷7Bæ—46öææV7FVB’&WGW&ã°¢f"&÷w2ÒFFç&Wf–Ww2ÇÂµÓ°¢bæöfg6WBÒ†VæBòbæöfg6WB¢’²&÷w2æÆVæwFƒ°¢bçW'2Ò†VæBòbçW'2¢µÒ’æ6öæ6B‡&÷w2æf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"æW†Õö–BÓÓÒbæ–C²Ò’“°¢bæÖ÷&RÒFFæ†5öÖ÷&S²bæÆöF–ærÒfÇ6S²G&uW'2‡b“°¢G&6²‚vW†ÕöFWF–Å÷W'5öÆöFVBrÂ²VæC¢VæBò¢Â6÷VçC¢&÷w2æÆVæwF‚ÂF÷FÃ¢bçW'2æÆVæwF‚Â†5öÖ÷&S¢bæÖ÷&Rò¢Ò“°¢Ò6F6‚†R’°¢–b‚7F—fR‡b’ÇÂvVæW&F–öâÓÒvVâÇÂ†÷7Bæ—46öææV7FVB’&WGW&ã°¢bæÆöF–ærÒfÇ6S²bçW$W'&÷"Ò~Šù^š)Šû¾XùniÊ®ZèÎh‰ûÉ¢r²RæÖW76vS°¢G&6²‚vW†ÕöFWF–Å÷W'5öÆöEöf–ÆVBrÂ²VæC¢VæBò¢Â7FGW3¢çVÖ&W"†RbbRç7FGW2’ÇÂÒ“°¢–b‡bçW'2’G&uW'2‡b“²VÇ6R†÷7Bæ–ææW$…DÔÂÒsÇ6Æ73Ò&VBÖV×G’"&öÆSÒ&ÆW'B#âr²W62‡bçW$W'&÷"’²sÂ÷âr²'WGFöâ‚~˜xŞikŠû¾XùbrÂw&Vg&W6‚×W'2r“°¢Ğ¢Ğ¢gVæ7F–öâ6†ævUfÇVR‡fÇVRÂÖWG&–2’°¢f"Ö÷VçBÒ7G&–ær„ÖF‚ç&÷VæB„ÖF‚æ'2‡fÇVR’¢’ò“°¢–b‚fÇVR’&WGW&â~hÈ[›2s°¢–b†ÖWG&–2ÓÓÒw&æ²r’&WGW&â‡fÇVRâò~X˜Ş‹ù²r¢~˜Yâr’²Ö÷VçB²rYÒs°¢–b†ÖWG&–2ÓÓÒw÷6—F–öâr’&WGW&â‡fÇVRâò~X˜Ş‹ù²r¢~˜Yâr’²Ö÷VçB²rKŠ®y›îXˆnx+’s°¢&WGW&â‡fÇVRâòr²r¢~(‰"r’²Ö÷VçB²†ÖWG&–2ÓÓÒw&FRròrKŠ®y›îXˆnx+’r¢rXˆbr“°¢Ğ¢gVæ7F–öâ6†ævT÷&–v–æÂ‡ö–çBÂÖWG&–2’°¢gVæ7F–öâfÇVR†â’²&WGW&â7G&–ær„ÖF‚ç&÷VæB†â¢’ò“²Ğ¢–b†ÖWG&–2ÓÓÒw&æ²r’&WGW&â~zÊÂr²fÇVR‡ö–çBæ&Vf÷&R’²r(i"r²fÇVR‡ö–çBægFW"’²rYÒs°¢–b†ÖWG&–2ÓÓÒw÷6—F–öâr’&WGW&â~X˜Òr²fÇVR‡ö–çBæ&Vf÷&R’²rR(i"X˜Òr²fÇVR‡ö–çBægFW"’²rRs°¢&WGW&âfÇVR‡ö–çBæ&Vf÷&R’²†ÖWG&–2ÓÓÒw&FRròrRr¢rr’²r(i"r²fÇVR‡ö–çBægFW"’²†ÖWG&–2ÓÓÒw&FRròrRr¢rXˆbr“°¢Ğ¢gVæ7F–öâ6†ævUV÷ÆR‡ö–çB’°¢–b‚ö–çBæöÆE&æ²’&WGW&ârs°¢f"Òö–çBæöÆE&æ²æ6÷VçBÂ"Òö–çBææWu&æ²æ6÷VçC°¢&WGW&âÓÒçVÆÂbb"ÓÒçVÆÂò~Xø.ˆ>K«®i[r²f×B†’²r(i"r²f×B†"’²rK«¢r¢~iÈXø.ˆ>K«®i[iÊ®Z¾XiûÈÎKØŞjùNŠû~Kº^iÈiXŠë[Ù^K‹®Xxbs°¢Ğ¢gVæ7F–öâG&t6†ævW2†W†Ò’°¢f"†÷7BÒFö7VÖVçBævWDVÆVÖVçD'”–B‚vVBÖ6†ævW2r“²–b‚†÷7B’&WGW&ã°¢f"÷F–öç2Òf–Wræ6†ævW2ÇÂ‡f–Wræ6†ævW2Ò²ÖWG&–3¢w66÷&RrÂ66÷S¢w–V"rÂ6ÖT6FVv÷'“¢fÇ6RÂ6ö×&T–C¢rrÒ“°¢f"FFÒv–æF÷rå66÷&TW†Ô6†ævW2æ'V–ÆB†W†ÒÂÆÄW†×2‚’Â÷F–öç2ÂÖöFVÂ’ÂÖWG&–4æÖRÒ²66÷&S¢~Xˆni[rÂ&FS¢~[é~XˆnxèrrÂ&æ³¢~YŞjÊrÂ÷6—F–öã¢~KØŞjùBrÓ°¢f"&æ´ÖöFRÒ÷F–öç2æÖWG&–2ÓÓÒw&æ²rÇÂ÷F–öç2æÖWG&–2ÓÓÒw÷6—F–öâs°¢f"F—FÆRÒsÆF—b6Æ73Ò&VB×6V7F–öâÖ†VB#ãÆF—cãÇ7â6Æ73Ò&VBÖW–V'&÷r#ã"òZûjùCÂ÷7ããÆƒ#îiÊÎYË®XùXÉcÂöƒ#ãÇî˜KˆYË®jÚNX˜Şy¨Nˆ>Šù^ûÈÎyÈ¾yÈ¾YNzyy¨NXˆni[Kˆîhé.YŞXùyIşK¨nK¸K˜XùXÉn8#Â÷ãÂöF—cãÂöF—câs°¢f"F'2ÒsÆF—b6Æ73Ò&VBÖ6†ævR×F'2"&öÆSÒ&w&÷W"&–ÖÆ&VÃÒ.XùXÉnhÈ~jr#âr²ö&¦V7Bæ¶W—2†ÖWG&–4æÖR’æÖ†gVæ7F–öâ†¶W’’²&WGW&âsÆ'WGFöâG—SÒ&'WGFöâ"FFÖ6†ævRÖÖWG&–3Ò"r²¶W’²r"&–×&W76VCÒ"r²†÷F–öç2æÖWG&–2ÓÓÒ¶W’’²r#âr²ÖWG&–4æÖU¶¶W•Ò²sÂö'WGFöãâs²Ò’æ¦ö–â‚rr’²sÂöF—câs°¢f"f–ÇFW'2ÒsÆF—b6Æ73Ò&VBÖ6†ævRÖf–ÇFW'2#ãÆÆ&VÃîZûjùNˆ>ŠùSÇ6VÆV7BFFÖ6†ævRÖW†Ò&–ÖÆ&VÃÒ.iÊÎYË®XùXÉnZûjùNˆ>ŠùR#ãÆ÷F–öâfÇVSÒ"#îˆz®Xª˜hºiÈ‹ùXúşjùNˆ>ŠùSÂö÷F–öãâr²FFæ†—7F÷'’æÖ†gVæ7F–öâ†R’²&WGW&âsÆ÷F–öâfÇVSÒ"r²W62†Ræ–B’²r"r²†÷F–öç2æ6ö×&T–BÓÓÒRæ–Bòw6VÆV7FVBr¢rr’²sâr²W62†RæW†ÕöFFR²r+rr²RææÖR’²sÂö÷F–öãâs²Ò’æ¦ö–â‚rr’²sÂ÷6VÆV7CãÂöÆ&VÃãÆÆ&VÃîXˆn{¾ˆÈ>Y»CÇ6VÆV7BFFÖ6†ævRÖ6FVv÷'’&–ÖÆ&VÃÒ.iÊÎYË®XùXÉnXˆn{¾ˆÈ>Y»B#ãÆ÷F–öâfÇVSÒ&ÆÂ"r²‚÷F–öç2ç6ÖT6FVv÷'’òw6VÆV7FVBr¢rr’²sîXZ˜:Xˆn{³Âö÷F–öããÆ÷F–öâfÇVSÒ'6ÖR"r²†÷F–öç2ç6ÖT6FVv÷'’òw6VÆV7FVBr¢rr’²sîK¸^YÎXˆn{³Âö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃâr°¢‡&æ´ÖöFRòsÆÆ&VÃîhé.YŞˆÈ>Y»CÇ6VÆV7BFFÖ6†ævR×66÷R&–ÖÆ&VÃÒ.iÊÎYË®XùXÉnhé.YŞˆÈ>Y»B#ãÆ÷F–öâfÇVSÒ'–V""r²†÷F–öç2ç66÷RÓÓÒw–V"ròw6VÆV7FVBr¢rr’²sî[›N{ªsÂö÷F–öããÆ÷F–öâfÇVSÒ&6Æ72"r²†÷F–öç2ç66÷RÓÓÒv6Æ72ròw6VÆV7FVBr¢rr’²sîxúŞ{ªsÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃâr¢rr’²sÂöF—câs°¢f"6†'C°¢–b‚FFç&Wf–÷W2’6†'BÒsÆF—b6Æ73Ò&VBÖV×G’#ãÆƒ3î‹ùk*iÈi»Nizy¨Br²†÷F–öç2ç6ÖT6FVv÷'’ò~YÎXˆn{²r¢rr’²~ˆ>ŠùSÂöƒ3ãÇîXXŠë[Ù^‹ùjÊh‰{ºKˆîXøŞh	ŞûÈÎK˜¾Yî[ˆ;ŞYÊ‹ù˜xÎZûxZ~XùXÉn8#Â÷ãÂöF—câs°¢VÇ6R°¢f"Æ–Ö—BÒÖF‚æÖ‚æÇ’„ÖF‚Â³Òæ6öæ6B†FFçö–çG2æÖ†gVæ7F–öâ‡’²&WGW&âÖF‚æ'2‡çfÇVR“²Ò’’“°¢f"÷6—F—fRÒFFçö–çG2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âçfÇVRâ²Ò’æÆVæwF‚ÂæVvF—fRÒFFçö–çG2æf–ÇFW"†gVæ7F–öâ‡’²&WGW&âçfÇVRÂ²Ò’æÆVæwFƒ°¢6†'BÒsÆF—b6Æ73Ò&VBÖ6†ævRÖ6öçFW‡B#ãÇ7ãîZûjùBÆ#âr²W62†FFç&Wf–÷W2ææÖR’²sÂö#ãÂ÷7ããÇF–ÖSâr²W62†FFç&Wf–÷W2æW†ÕöFFR’²sÂ÷F–ÖSãÂöF—câs°¢–b†FFçF÷FÂ’6†'B³ÒsÆF—b6Æ73Ò&VBÖ6†ævR×F÷FÂ#ãÆF—cãÇ7ãâr²‡&æ´ÖöFRò†÷F–öç2ç66÷RÓÓÒw–V"rò~[›N{ªrr¢~xúŞ{ªrr’¢rr’²W62†FFçF÷FÂææÖR’²sÂ÷7ããÇ7G&öær6Æ73Ò"r²†FFçF÷FÂçfÇVRâòvVBÖv–âr¢FFçF÷FÂçfÇVRÂòvVBÖÆ÷72r¢rr’²r#âr²W62†6†ævUfÇVR†FFçF÷FÂçfÇVRÂ÷F–öç2æÖWG&–2’’²sÂ÷7G&öæsãÂöF—cãÇâr²W62†6†ævT÷&–v–æÂ†FFçF÷FÂÂ÷F–öç2æÖWG&–2’’²‡&æ´ÖöFRòsÇ6ÖÆÃâr²W62†6†ævUV÷ÆR†FFçF÷FÂ’’²sÂ÷6ÖÆÃâr¢rr’²sÂ÷ãÂöF—câs°¢6†'B³ÒsÆF—b6Æ73Ò&VBÖ6†ævRÖ¶W’#ãÇ7ãâr²FFçö–çG2æÆVæwF‚²rzyXúşjùBr²†FFçö–çG2æÆVæwF‚òr+rr²÷6—F—fR²rzyr²‡&æ´ÖöFRò~X˜Ş‹ù²r¢~Kˆ®XØrr’²r+rr²æVvF—fR²rzyr²‡&æ´ÖöFRò~˜Yâr¢~Kˆ¾™˜Òr’¢rr’²sÂ÷7ããÇ7ãî(ir²‡&æ´ÖöFRò~˜Yâr¢~Kˆ¾™˜Òr’²~8ûÙÎ8r²‡&æ´ÖöFRò~X˜Ş‹ù²r¢~Kˆ®XØrr’²r(i#Â÷7ããÂöF—câs°¢6†'B³ÒsÆF—b6Æ73Ò&VBÖ6†ævRÖ&'2"&öÆSÒ&Æ—7B"&–ÖÆ&VÃÒ.YNzyr²ÖWG&–4æÖU¶÷F–öç2æÖWG&–5Ò²~XùXÉb#âr²FFçö–çG2æÖ†gVæ7F–öâ‡’°¢f"v–GF‚ÒÖF‚æ'2‡çfÇVR’òÆ–Ö—B¢C‚ÂF—&V7F–öâÒçfÇVRâòvVBÖv–âr¢çfÇVRÂòvVBÖÆ÷72r¢vVBÖfÆBs°¢&WGW&âsÆF—b6Æ73Ò&VBÖ6†ævR×&÷r"&öÆSÒ&Æ—7F—FVÒ#ãÆF—b6Æ73Ò&VBÖ6†ævRÖÆ&VÂ#ãÆ#âr²W62‡ææÖR’²sÂö#ãÇ7ãâr²W62†6†ævT÷&–v–æÂ‡Â÷F–öç2æÖWG&–2’’²sÂ÷7ãâr²‡&æ´ÖöFRòsÇ6ÖÆÃâr²W62†6†ævUV÷ÆR‡’’²sÂ÷6ÖÆÃâr¢rr’²sÂöF—cãÆF—b6Æ73Ò&VBÖ6†ævR×Æ÷B"&–Ö†–FFVãÒ'G'VR#ãÆ’6Æ73Ò&VBÖ6†ævR×¦W&ò#ãÂö“ãÆ’6Æ73Ò&VBÖ6†ævRÖ&"r²F—&V7F–öâ²r"7G–ÆSÒ"r²‡çfÇVRÂòw&–v‡Br¢vÆVgBr’²s£SS·v–GFƒ¢r²v–GF‚²rR#ãÂö“âr²‚çfÇVRòsÆ’6Æ73Ò&VBÖ6†ævR×F–R#ãÂö“âr¢rr’²sÂöF—cãÇ7G&öær6Æ73Ò&VBÖ6†ævRÖFVÇFr²F—&V7F–öâ²r#âr²W62†6†ævUfÇVR‡çfÇVRÂ÷F–öç2æÖWG&–2’’²sÂ÷7G&öæsãÂöF—câs°¢Ò’æ¦ö–â‚rr’²sÂöF—câs°¢–b‚FFçö–çG2æÆVæwF‚’6†'B³ÒsÇ6Æ73Ò&VBÖV×G’#î‹ùKŠNYË®i¨.izXúşjùNy¨Nzyyºâr²‡&æ´ÖöFRò~hé.YÒr¢~h‰{º’r’²~ûÈÎXúşXˆ~hÚ.hÈ~j~h‰nZûjùNˆ>Šù^8#Â÷âs°¢6†'B³ÒsÇ6Æ73Ò&VBÖ6†ævRÖæ÷FR#âr²‡&æ´ÖöFRò~hé.YŞKˆŞŠhk.KŠNYË®kºXˆny»YÎ8.YŞjÊ‹h®[ş‹h®™ÚX˜ŞûÉ¾KØŞjùNhÈYNYË®Xø.ˆ>K«®i[Šêzé~8.[›N{ª~Y(ÎxúŞ{ª~XˆnXŠ¾jùN‹è>ûÈÎXø.ˆ>{êNKÙ>XùXÉni{nŠû~{¹>YZéî™˜^h8^Xk^XŠNijŞ8"r¢~hÈiÈ{¸XˆnjùN‹è>ûÉ¾kºXˆnKˆŞYÎXúşXˆ~hÚ.[é~Xˆnxè~8.Šù^XÛ~™«î[ªnK™şKÉ®[ÛY8Şh‰{ºûÈÎXùXÉnKˆŞy»Nhê^Kº>Šˆ;ŞX©¾XùXÉn8"r’²‚FFçF÷FÂbbFFçF÷FÅ&V6öâòrr²W62†FFçF÷FÅ&V6öâ’¢rr’²sÂ÷âs°¢–b†FFæÖ—76–æræÆVæwF‚’6†'B³ÒsÆFWF–Ç26Æ73Ò&VBÖÖ—76–ær#ãÇ7VÖÖ'“âr²FFæÖ—76–æræÆVæwF‚²rzyi¨.iÊ®Xø.KˆîZûjùCÂ÷7VÖÖ'“ãÇVÃâr²FFæÖ—76–æræÖ†gVæ7F–öâ‡’²&WGW&âsÆÆ“ãÆ#âr²W62‡ææÖR’²sÂö#îûÉ¢r²W62‡ç&V6öâ’²sÂöÆ“âs²Ò’æ¦ö–â‚rr’²sÂ÷VÃãÂöFWF–Ç3âs°¢Ğ¢†÷7Bæ–ææW$…DÔÂÒF—FÆR²F'2²f–ÇFW'2²6†'C°¢gVæ7F–öâ6†ævVB†¶–æB’²G&6²‚vW†ÕöFWF–Åö6ö×&—6öåö6†ævVBrÂ²6öçG&öÃ¢¶–æBÂÖWG&–3¢÷F–öç2æÖWG&–2Â66÷S¢÷F–öç2ç66÷RÂ6FVv÷'“¢÷F–öç2ç6ÖT6FVv÷'’òw6ÖRr¢vÆÂrÒ“²G&t6†ævW2†W†Ò“²Ğ¢†÷7BçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖ6†ævRÖÖWG&–5Òr’æf÷$V6‚†gVæ7F–öâ†"’²"æöæ6Æ–6²ÒgVæ7F–öâ‚’²÷F–öç2æÖWG&–2Ò"æFF6WBæ6†ævTÖWG&–3²6†ævVB‚vÖWG&–2r“²f"7F—fT'WGFöâÒ†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævRÖÖWG&–3Ò"r²÷F–öç2æÖWG&–2²r%Òr“²–b†7F—fT'WGFöâ’7F—fT'WGFöâæfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²Ó²Ò“°¢†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævRÖW†ÕÒr’æöæ6†ævRÒgVæ7F–öâ†R’²÷F–öç2æ6ö×&T–BÒRçF&vWBçfÇVS²6†ævVB‚vW†Òr“²†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævRÖW†ÕÒr’æfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²Ó°¢†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævRÖ6FVv÷'•Òr’æöæ6†ævRÒgVæ7F–öâ†R’²÷F–öç2ç6ÖT6FVv÷'’ÒRçF&vWBçfÇVRÓÓÒw6ÖRs²÷F–öç2æ6ö×&T–BÒrs²6†ævVB‚v6FVv÷'’r“²†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævRÖ6FVv÷'•Òr’æfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²Ó°¢–b‡&æ´ÖöFR’†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævR×66÷UÒr’æöæ6†ævRÒgVæ7F–öâ†R’²÷F–öç2ç66÷RÒRçF&vWBçfÇVS²6†ævVB‚w66÷Rr“²†÷7BçVW'•6VÆV7F÷"‚u¶FFÖ6†ævR×66÷UÒr’æfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²Ó°¢Ğ ¢gVæ7F–öâ&VæFW$FWF–Â†W†Ò’°¢f"bÒf–WrÂÒÒÖöFVÂ†W†Ò’Â6öçFVçBÒFö7VÖVçBævWDVÆVÖVçD'”–B‚v6öçFVçBr“°¢vVæW&F–öâ²³²bæÆöF–ærÒfÇ6S°¢–b‚bç66÷R’bç66÷RÒÒæ–æ6ÇVFVBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"ç–V"çW&6VçBÓÒçVÆÃ²Ò’æÆVæwF‚Â"bbÒæ–æ6ÇVFVBæf–ÇFW"†gVæ7F–öâ‡"’²&WGW&â"æ6Æ72çW&6VçBÓÒçVÆÃ²Ò’æÆVæwF‚ãÒ"òv6Æ72r¢w–V"s°¢6öçFVçBæ–ææW$…DÔÂÒsÆF—b6Æ73Ò&VB×vR#âr²†VFW"†W†Ò’²‡bç&W÷'BòsÆF—b6Æ73Ò&VB×&VFW"#ãÂöF—câr¢÷fW'f–Wr†W†ÒÂÒ’²66÷&W2†W†ÒÂÒ’²sÇ6V7F–öâ6Æ73Ò&VB×6V7F–öâ"–CÒ&VBÖ6†ævW2"F&–æFWƒÒ"Ó#ãÂ÷6V7F–öããÇ6V7F–öâ6Æ73Ò&VB×6V7F–öâ"–CÒ&VB×VG&çG2"F&–æFWƒÒ"Ó#ãÂ÷6V7F–öããÇ6V7F–öâ6Æ73Ò&VB×6V7F–öâVB×&VfÆV7F–öâ"–CÒ&VB×&VfÆV7F–öâ"F&–æFWƒÒ"Ó#ãÂ÷6V7F–öãâr²‡W%&Wf–Wtf–Æ&ÆR‚’òsÇ6V7F–öâ6Æ73Ò&VB×6V7F–öâ"–CÒ&VB×W'2"F&–æFWƒÒ"Ó#ãÆF—b6Æ73Ò&VB×6V7F–öâÖ†VB#ãÆF—cãÇ7â6Æ73Ò&VBÖW–V'&÷r#ãRòŠù^š)KˆîKÙÎzÙCÂ÷7ããÆƒ#î‹ùjÊˆ>Šù^y¨NŠù^XÛsÂöƒ#ãÇîhÈzyyºîiú^yÈ¾[{.[Ù^XZ^y¨Nš)yºî8KÙÎzÙN8h›iKXˆnKˆîXéşZx¾hš¾høşK»n8.iú^yÈ¾[{.iÈXh^ZëKˆŞŠêXˆniéjÊi[8#Â÷ãÂöF—cãÂöF—cãÆF—b6Æ73Ò&VB×W"Ö6öçFVçB#ãÂöF—cãÂ÷6V7F–öãâr¢rr’’²sÂöF—câs°¢6öçFVçBçVW'•6VÆV7F÷"‚ræVB×vRr’æöæ6Æ–6²ÒgVæ7F–öâ†R’°¢f""ÒRçF&vWBæ6Æ÷6W7B‚u¶FFÖVEÒr“²–b‚"’&WGW&ã°¢f"7F–öâÒ"æFF6WBæVC°¢–b†7F–öâÓÓÒv&6²r’°¢–b‚ÆVfR‚’’&WGW&ã°¢G&6²‚vW†ÕöFWF–Åö6Æ÷6VBrÂ²&V6öã¢v&6²rÒ“°¢f"67&öÆÂÒbç67&öÆÃ²7FFRçvRÒbç&WGW&åvRÇÂw&V6÷&G2s²f–WrÒçVÆÃ²&VæFW"‚“²v–æF÷rç67&öÆÅFòƒÂ67&öÆÂ“°¢f"÷&–v–æÂÒ'&’æg&öÒ†Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖW†ÒÖFWF–ÅÒÅ¶FF×FÖW†ÕÒr’’æf–æB†gVæ7F–öâ†"’²&WGW&â†"æFF6WBæW†ÔFWF–ÂÇÂ"æFF6WBçFW†Ò’ÓÓÒW†Òæ–C²Ò“²–b†÷&–v–æÂ’÷&–v–æÂæfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“°¢ÒVÇ6R–b†7F–öâÓÓÒvVF—Br’°¢G&6²‚vW†ÕöFWF–ÅöVF—Eö÷VæVBr“°¢–b†VF—F÷"’²–b‚ÆVfR‚’’&WGW&ã²bç&W÷'BÒçVÆÃ²&VæFW%vR‚“²Ğ¢÷VäW†Ò†7W'&VçDW†Ò‚’“°¢Ğ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚v§V×¢r’’²f"6V7F–öäæÖRÒ7F–öâç6Æ–6RƒR’Â6V7F–öâÒFö7VÖVçBævWDVÆVÖVçD'”–B‚vVBÒr²6V7F–öäæÖR“²–b‡6V7F–öâ’²G&6²‚vW†ÕöFWF–Å÷6V7F–öåö§V×VBrÂ²6V7F–öã¢6V7F–öäæÖRÒ“²6V7F–öâæfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“²–b‡6V7F–öâç67&öÆÄ–çFõf–Wr’6V7F–öâç67&öÆÄ–çFõf–Wr‡²&Æö6³¢w7F'BrÒ“²ÒĞ¢VÇ6R–b†7F–öâÓÓÒw&Vg&W6‚×W'2rÇÂ7F–öâÓÓÒvÖ÷&R×W'2r’²G&6²‚vW†ÕöFWF–Å÷W'5ö7F–öârÂ²7F–öã¢7F–öâÓÓÒvÖ÷&R×W'2ròvÆöEöÖ÷&Rr¢w&Vg&W6‚rÒ“²ÆöEW'2‡bÂ7F–öâÓÓÒvÖ÷&R×W'2r“²Ğ¢VÇ6R–b†7F–öâç7F'G5v—F‚‚wW#¢r’ÇÂ7F–öâç7F'G5v—F‚‚w&W÷'C¢r’’°¢f""ÒbçW'2æf–æB†gVæ7F–öâ‡’²&WGW&âç&WVW7Eö–BÓÓÒ7F–öâç6Æ–6R†7F–öâæ–æFW„öb‚s¢r’²“²Ò“°¢–b‡"bbÆVfR‚’’²G&6²‚vW†ÕöFWF–Å÷W%ö÷VæVBrÂ²f–Ws¢7F–öâç7F'G5v—F‚‚wW#¢r’òwVW7F–öç2r¢w&W÷'BrÂ7FGW3¢"ç7FGW2ÇÂwVæ¶æ÷vârÒ“²bç&W÷'BÒ#²bçVW7F–öç4f—'7BÒ7F–öâç7F'G5v—F‚‚wW#¢r“²&VæFW%vR‚“²Ğ¢Ğ¢Ó°¢–b‡bç&W÷'B’°¢f""Òbç&W÷'C°¢VF—F÷"Ò²W6W#¢bçW6W"ÂFö¶Vã¢bçFö¶VâÂ†÷7C¢6öçFVçBçVW'•6VÆV7F÷"‚ræVB×&VFW"r’ÂW†Ó¢W†ÒÂW†Ô–C¢W†Òæ–BÂG&gD–C¢"æG&gEö–BÀ¢6W76–öç3¢·ÒÂ÷F–öç3¢"æ÷F–öç2Â–æ—F–Å&W÷'C¢"ç&WVW7Eö–BÂ–æ—F–Å6V7F–öã¢bçVW7F–öç4f—'7BòwVW7F–öç2r¢rrÂW‡V7FVDW†Ô–C¢W†Òæ–BÀ¢6Æ÷6TÆ&VÃ¢~(i‹ùNY¹îiÊÎjÊˆ>Šù^Šúnh8RrÂ—47F—fS¢gVæ7F–öâ‚’²&WGW&â7F—fR‡b’bbf–Wrç&W÷'BÓÓÒ#²ÒÀ¢öä6Æ÷6S¢gVæ7F–öâ‚’²VF—F÷"ÒçVÆÃ²bç&W÷'BÒçVÆÃ²bçW'2ÒçVÆÃ²&VæFW%vR‚“²ÒÓ°¢v–æF÷rå66÷&UW%&Wf–WræÖ÷VçB†VF—F÷"Â"ç7V&¦V7BÂçVÆÂ“°¢ÒVÇ6R²G&t6†ævW2†W†Ò“²&–æEVG&çG2†W†ÒÂÒ“²v–æF÷rå66÷&TW†Õ&VfÆV7F–öâæÖ÷VçB†Fö7VÖVçBævWDVÆVÖVçD'”–B‚vVB×&VfÆV7F–öâr’Â²W6W$–C¢bçW6W"ÂFö¶Vã¢bçFö¶VâÂW†Ô–C¢bæ–BÂ÷vç3¢gVæ7F–öâ‚’²&WGW&âbçW6W"ÓÓÒ÷væW"‚’bbbçFö¶VâÓÓÒ7FFRçFö¶Vã²ÒÒ“²–b‡bçW'2’G&uW'2‡b“²VÇ6RÆöEW'2‡bÂfÇ6R“²Ğ¢Ğ¢gVæ7F–öâ÷Vâ†–B’°¢f"W†ÒÒÆÄW†×2‚’æf–æB†gVæ7F–öâ†R’²&WGW&âRæ–BÓÓÒ–C²Ò“²–b‚W†ÒÇÂÆVfR‚’’&WGW&ã°¢f–WrÒ²–C¢–BÂ&WGW&åvS¢7FFRçvRÓÓÒw7FG2rbbv–æF÷rå66÷&UVW7F–öåG—TæÇ—6—2bbv–æF÷rå66÷&UVW7F–öåG—TæÇ—6—2æ7F—fR‚’òw7FG2r¢w&V6÷&G2rÂW6W#¢÷væW"‚’ÂFö¶Vã¢7FFRçFö¶VâÂ67&öÆÃ¢v–æF÷rç67&öÆÅ’ÇÂÂW'3¢çVÆÂÂöfg6WC¢ÂÖ÷&S¢fÇ6RÂÆöF–æs¢fÇ6RÂ7V&¦V7C¢rrÂ6†'DÖöFS¢vÖ÷fVÖVçBrÂG&VæEv–æF÷s¢w&Wf–÷W2rÂ6ÖT6FVv÷'“¢fÇ6RÓ°¢G&6²‚vW†ÕöFWF–Åö÷VæVBrÂ²6÷W&6S¢w&V6÷&G2rÒ“°¢7FFRçvRÒw&V6÷&G2s²&VæFW"‚“²v–æF÷rç67&öÆÅFòƒÂ“°¢f"†VF–ærÒFö7VÖVçBçVW'•6VÆV7F÷"‚ræVBÖ†VF–ærƒr“²–b††VF–ær’†VF–æræfö7W2‡²&WfVçE67&öÆÃ¢G'VRÒ“°¢Ğ¢f"&V6÷&D&Vf÷&RÒ&V6÷&D‡FÖÃ°¢&V6÷&D‡FÖÂÒgVæ7F–öâ†W†Ò’°¢&WGW&â&V6÷&D&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2’ç&WÆ6R‚òƒÆF—b6Æ73Ò'&V6÷&BÖ7F–öç5µåÂ%Ò¢#â’òÂrCÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'&V6÷&BÖ7F–öâÖ'Fâ×cVB×f–WrÖ'WGFöâ"FFÖW†ÒÖFWF–ÃÒ"r²W62†W†Òæ–B’²r#îiú^yÈ¾Šúnh8SÂö'WGFöãâr“°¢Ó°¢f"&–æD&Vf÷&RÒ&–æEvS°¢&–æEvRÒgVæ7F–öâ‚’²&–æD&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2“²Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚u¶FFÖW†ÒÖFWF–ÅÒr’æf÷$V6‚†gVæ7F–öâ†"’²"æöæ6Æ–6²ÒgVæ7F–öâ‚’²÷Vâ†"æFF6WBæW†ÔFWF–Â“²Ó²Ò“²Ó°¢f"&VæFW$&Vf÷&RÒ&VæFW%vS°¢&VæFW%vRÒgVæ7F–öâ‚’°¢–b‡f–Wrbb7F—fR‡f–Wr’’°¢f"W†ÒÒ7W'&VçDW†Ò‚“²–b†W†Ò’²&VæFW$&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2“²&VæFW$FWF–Â†W†Ò“²&WGW&ã²Ğ¢Ğ¢–b‡f–Wrbb‡f–WrçW6W"ÓÒ÷væW"‚’ÇÂf–WrçFö¶VâÓÒ7FFRçFö¶VâÇÂ7W'&VçDW†Ò‚’’’²–b†VF—F÷"bbVF—F÷"æF—7÷6R’VF—F÷"æF—7÷6R‚“²VF—F÷"ÒçVÆÃ²f–WrÒçVÆÃ²Ğ¢&WGW&â&VæFW$&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2“°¢Ó°¢f"æd&Vf÷&RÒ&–æDæc°¢&–æDæbÒgVæ7F–öâ‚’°¢æd&Vf÷&RæÇ’‡F†—2Â&wVÖVçG2“°¢Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚ræFW6·F÷Öæb¶FF×vUÒÂæ&÷GFöÒÖæb¶FF×vUÒr’æf÷$V6‚†gVæ7F–öâ†"’°¢f"&Wf–÷W2Ò"æöæ6Æ–6³²"æöæ6Æ–6²ÒgVæ7F–öâ†WfVçB’²–b‚ÆVfR‚’’&WGW&ã²–b‡f–Wrbb7F—fR‡f–Wr’’G&6²‚vW†ÕöFWF–Åö6Æ÷6VBrÂ²&V6öã¢væf–vF–öârÒ“²f–WrÒçVÆÃ²–b‡&Wf–÷W2’&Wf–÷W2æ6ÆÂ‡F†—2ÂWfVçB“²Ó°¢Ò“°¢Ó°¢v–æF÷rå66÷&TW†ÔFWF–ÂÒ²÷Vã¢÷VâÓ°¢f"7G–ÆRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“²7G–ÆRçFW‡D6öçFVçBÒ ¢æVB×vW¶Ö‚×v–GFƒ£cƒ¶Ö&v–ã£WFòcGƒ¶6öÆ÷#§f"‚Ò×FW‡B—ÒæVB×F÷¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£ƒ¶Ö&v–âÖ&÷GFöÓ£#G‡ÒæVBÖ'WGFöâÂæVB×66÷R'WGFöâÂæVB×ö–çBÖÆ—7B'WGFöç¶föçC¦–æ†W&—C¶föçB×6—¦S£7ƒ¶7W'6÷#§ö–çFW#¶Ö–âÖ†V–v‡C£3‡ƒ·FF–æs£‡‚7ƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW"×&F—W3£—‡ÒæVB×&–Ö'’ÂæVB×f–WrÖ'WGFöç¶6öÆ÷#§f"‚ÒÖ66VçB’–×÷'FçC¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB’–×÷'FçC¶&÷&FW"Ö6öÆ÷#§G&ç7&VçB–×÷'FçC¶föçB×vV–v‡C£cSÒæVBÖ'WGFöã¦F—6&ÆVG¶÷6—G“¢ãSS¶7W'6÷#§v—GÒæVB×vR'WGFöã¦fö7W2×f—6–&ÆRÂæVB×VG&çBs¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£7‡ÒæVBÖ†VF–æw¶Ö&v–âÖ&÷GFöÓ£#W‡ÒæVBÖW–V'&÷w¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£s¶ÆWGFW"×76–æs¢ã&VÓ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ†VF–ærƒ¶föçB×6—¦S£3ƒ¶Æ–æRÖ†V–v‡C£ãC¶Ö&v–ã£‡‚¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVBÖ†VF–ærÂæVB×6V7F–öâÖ†VB¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãsS¶Ö&v–ã£g‚ÒæVBÖ÷fW'f–Ww¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡ƒ·FF–æs£#Wƒ¶Ö&v–âÖ&÷GFöÓ£#‡‡ÒæVBÖÖWG&–77¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£ãVg"g"g"g#¶v£#G‡ÒæVBÖÖWG&–7¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶v£—ƒ¶Ö–â×v–GFƒ£ÒæVBÖÖWG&–3ç7ç¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖÖWG&–27G&öæw¶föçB×6—¦S£#‡ƒ¶ÆWGFW"×76–æs¢ÒãFVÓ¶Æ–æRÖ†V–v‡C£ãC¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×3¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVBÖÖWG&–3¦f—'7BÖ6†–ÆB7G&öæw¶föçB×6—¦S£3‡ƒ¶Æ–æRÖ†V–v‡C£ã3¶6öÆ÷#§f"‚ÒÖ66VçB—ÒæVBÖÖWG&–26ÖÆÇ¶föçB×6—¦S£ƒ¶Æ–æRÖ†V–v‡C£ãc¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ6öçFW‡G¶F—7Æ“¦fÆWƒ¶v£‚#Wƒ¶fÆW‚×w&§w&¶föçB×6—¦S£'ƒ·FF–ær×F÷£#'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖæg¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“¶F—7Æ“¦fÆWƒ¶v£—ƒ¶fÆW‚×w&§w&¶Ö&v–â×F÷£#7ƒ·FF–ær×F÷£‡‡ÒæVBÖæbæVBÖ'WGFöç¶&÷&FW#£¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚ÒÖ66VçB—ÒæVB×6V7F–öç¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£wƒ·FF–æs£#Wƒ¶Ö&v–ã£#'‚·67&öÆÂÖÖ&v–â×F÷£#'ƒ¶Ö–â×v–GFƒ£ÒæVB×6V7F–öâÖ†VG¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Æ–vâÖ—FV×3¦6VçFW#¶v£‡ƒ¶Ö&v–âÖ&÷GFöÓ£#'‡ÒæVB×6V7F–öâƒ'¶föçB×6—¦S£#ƒ¶Æ–æRÖ†V–v‡C£ãS¶Ö&v–ã£g‚ÒæVB×F&ÆR×w&¶÷fW&fÆ÷r×ƒ¦WF÷ÒæVB×F&ÆW·v–GFƒ£S¶&÷&FW"Ö6öÆÆ6S¦6öÆÆ6S¶föçB×6—¦S£7‡ÒæVB×F&ÆRF‚ÂæVB×F&ÆRFG·FF–æs£g‚ƒ·FW‡BÖÆ–vã¦ÆVgC·fW'F–6ÂÖÆ–vã§F÷¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×3¶Ö–â×v–GFƒ£s‡ÒæVB×F&ÆRF†VBF‡¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£S¶6öÆ÷#§f"‚ÒÖ×WFVB“·v†—FR×76S¦æ÷w&¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6c†c–f2—ÒæVB×F&ÆRF&öG’F‡¶Ö–â×v–GFƒ£ƒƒ¶föçB×6—¦S£Gƒ¶föçB×vV–v‡C£cSÒæVB×F&ÆRFB'¶föçB×6—¦S£g‡ÒæVB×F&ÆR6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£C¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãc¶Ö&v–â×F÷£W‡ÒæVBÖ6öÖ&–æF–öç7¶Ö&v–â×F÷£#'‡ÒæVBÖ6öÖ&–æF–öç27VÖÖ'’ÂæVBÖÖ—76–ær7VÖÖ'—¶föçB×6—¦S£7ƒ¶7W'6÷#§ö–çFW'ÒæVBÖ6öÖ&–æF–öç27VÖÖ'’7ç¶Ö&v–âÖÆVgC£‡ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ6öÖ&òÖw&–G¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£'ƒ¶Ö&v–â×F÷£g‡ÒæVBÖ6öÖ&òÖw&–B'F–6ÆW¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£g‡ÒæVBÖ6öÖ&òÖw&–Bƒ7¶föçB×6—¦S£Gƒ¶Ö&v–ã£ÒæVBÖ6öÖ&òÖw&–BÂæVBÖ6öÖ&òÖw&–B6ÖÆÇ¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãc¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ6öÖ&òÖw&–B6ÖÆÇ¶F—7Æ“¦&Æö6·ÒæVB×66÷W¶F—7Æ“¦fÆWƒ¶fÆWƒ¦æöæS·FF–æs£7ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£‡ÒæVB×66÷R'WGFöç¶&6¶w&÷VæC§G&ç7&VçC¶&÷&FW#£·FF–æs£w‚'‡ÒæVB×66÷R¶&–×&W76VC×G'VU×¶6öÆ÷#§f"‚ÒÖ66VçB“¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶föçB×vV–v‡C£cSÒæVBÖ6†'BÖÆ–÷WG¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃg"’#ƒ¶v£#Gƒ¶Æ–vâÖ—FV×3¦6VçFW'ÒæVB×VG&çG¶F—7Æ“¦&Æö6³·v–GFƒ£S¶†V–v‡C¦WFó¶÷fW&fÆ÷s§f—6–&ÆWÒæVB×VG&çBFW‡G¶föçBÖfÖ–Ç“¦–æ†W&—C¶föçB×6—¦S£ƒ¶f–ÆÃ§f"‚ÒÖ×WFVB—ÒæVB×VG&çBæVB×VG&çB×F—FÆW¶föçB×6—¦S£7ƒ¶föçB×vV–v‡C£cS¶f–ÆÃ§f"‚Ò×FW‡B—ÒæVB×VG&çBæVBÖF÷BÖçVÖ&W'¶f–ÆÃ¢6ffc¶föçB×6—¦S£ƒ¶föçB×vV–v‡C£s·ö–çFW"ÖWfVçG3¦æöæWÒæVB×VG&çBw¶7W'6÷#§ö–çFW'ÒæVBÖw&–BÖÆ–æW·7G&ö¶S§f"‚ÒÖÆ–æR“·7G&ö¶R×v–GFƒ¢ãcS·7G&ö¶RÖF6†'&“£2WÒæVBÖ†—7·7G&ö¶S§f"‚ÒÖ×WFVB“·7G&ö¶R×v–GFƒ£·7G&ö¶RÖF6†'&“£BC¶f–ÆÃ¦æöæWÒæVB×ö–çBÖÆ—7G¶F—7Æ“¦fÆWƒ¶v£wƒ¶fÆW‚×w&§w&¶§W7F–g’Ö6öçFVçC¦6VçFW#¶Ö&v–ã£G‚ÒæVB×ö–çBÖÆ—7B'WGFöç¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£wƒ¶föçB×6—¦S£'ƒ·FF–æs£g‚ƒ¶Ö–âÖ†V–v‡C£3g‡ÒæVB×ö–çBÖÆ—7B—¶F—7Æ“¦w&–C·Æ6RÖ—FV×3¦6VçFW#¶föçB×6—¦S£ƒ¶föçB×7G–ÆS¦æ÷&ÖÃ·v–GFƒ£—ƒ¶†V–v‡C£—ƒ¶&÷&FW"×&F—W3£SS¶6öÆ÷#¢6ffgÒæVB×ö–çBÖÆ—7B¶&–×&W76VC×G'VU×¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶&÷&FW"Ö6öÆ÷#§f"‚ÒÖ66VçB—ÒæVBÖ–ç7V7G·FF–æs£#'‚‡ƒ¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cvc–f2“¶&÷&FW"×&F—W3£Gƒ¶Ö–â×v–GFƒ£ÒæVBÖ–ç7V7Bƒ7¶föçB×6—¦S£#Gƒ¶Ö&v–ã£—‚Gƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVB×Fw¶F—7Æ“¦–æÆ–æRÖ&Æö6³¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£cS·FF–æs£G‚‡ƒ¶&÷&FW"×&F—W3£gƒ¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögB“¶6öÆ÷#§f"‚ÒÖ66VçB—ÒæVBÖ–ç7V7BFÇ¶Ö&v–ã£#‚ÒæVBÖ–ç7V7BFÃæF—g¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£ƒ¶Ö&v–ã£'‚¶föçB×6—¦S£'‡ÒæVBÖ–ç7V7BGG¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ–ç7V7BFG¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×3¶Ö&v–ã£·FW‡BÖÆ–vã§&–v‡GÒæVBÖ–ç7V7B¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãwÒæVBÖ–ç7V7B6ÖÆÇ¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVB×VG&çBÖw&÷W7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒBÆÖ–æÖ‚ƒÃg"’“¶v£Wƒ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–ær×F÷£#ƒ¶Ö&v–â×F÷£w‡ÒæVB×VG&çBÖw&÷W2ƒ7¶föçB×6—¦S£7ƒ¶Ö&v–ã£'ƒ¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£w‡ÒæVB×VG&çBÖw&÷W2—·v–GFƒ£wƒ¶†V–v‡C£wƒ¶&÷&FW"×&F—W3£SS¶fÆWƒ¦æöæWÒæVB×VG&çBÖw&÷W2'¶föçB×6—¦S£Gƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVB×VG&çBÖw&÷W2ÂæVBÖÖWF†öBÂæVBÖÖ—76–æw¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ã‡ÒæVBÖÖWF†öG¶Ö&v–ã£‡‚ÒæVBÖÖ—76–æw¶Ö&v–â×F÷£g‡ÒæVBÖÖ—76–ærVÇ·FF–ærÖÆVgC£#‡ÒæVBÖV×G—·FF–æs£#‡‚Wƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“·FW‡BÖÆ–vã¦6VçFW#¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ã‡ÒæVBÖV×G’ƒ7¶föçB×6—¦S£wƒ¶6öÆ÷#§f"‚Ò×FW‡B—ÒæVB×W"×FööÇ7¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ¶Æ–vâÖ—FV×3¦VæC¶Ö&v–âÖ&÷GFöÓ£‡‡ÒæVB×W"×FööÇ2Æ&VÇ¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£—ƒ¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVB×W"×FööÇ26VÆV7G¶föçC¦–æ†W&—C¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–æs£—ƒ¶&÷&FW"×&F—W3£—ƒ¶Ö‚×v–GFƒ£#‡ÒæVB×W"Öw&–G¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£G‡ÒæVB×W'¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£7ƒ·FF–æs£‡ƒ¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶Ö–â×v–GFƒ£ÒæVB×W#æF—g¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£‡ƒ¶Æ–vâÖ—FV×3¦6VçFW'ÒæVB×7FGW7¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVB×W"ƒ7¶föçB×6—¦S£wƒ¶Æ–æRÖ†V–v‡C£ãc¶Ö&v–ã£G‚wƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVB×W"¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Æ–æRÖ†V–v‡C£ãgÒæVB×W"fö÷FW'¶F—7Æ“¦fÆWƒ¶fÆW‚×w&§w&¶v£wƒ·FF–ær×F÷£Wƒ¶Ö&v–â×F÷¦WF÷ÒæVB×W"×7FGW7¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖFævW"“¶Ö&v–ã£'‚ÒæVB×&VFW"ç"ÖÖ–ç¶Ö‚×v–GFƒ£“‡ÒæVB×&VFW"ç"×F'7¶F—7Æ“¦æöæWÒæVB×&VFW"ç"Ö†VBƒ'¶föçB×6—¦S£#‡Òç&V6÷&BÖ7F–öç2ç&V6÷&BÖ7F–öç2×c¦†2‚æVB×f–WrÖ'WGFöâ—¶fÆW‚×w&§w&–×÷'FçGĞ¤ÖVF–†Ö‚×v–GFƒ£“‚—²æVBÖ6†'BÖÆ–÷WG¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃg"—ÒæVBÖ–ç7V7G¶F—7Æ“¦&Æö6·ÒæVBÖ–ç7V7BFÇ¶F—7Æ“¦fÆWƒ¶v£#Wƒ¶fÆW‚×w&§w&¶Ö&v–ã£‚ÒæVBÖ–ç7V7BFÃæF—g¶v£'ƒ¶Ö&v–ã£g‚ÒæVBÖ–ç7V7Bƒ7¶föçB×6—¦S£#ƒ¶F—7Æ“¦–æÆ–æRÖ&Æö6³¶Ö&v–â×&–v‡C£‡ÒæVBÖ–ç7V7CâæVBÖW–V'&÷w¶F—7Æ“¦&Æö6·ÒæVB×VG&çBÖw&÷W7¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’—ÒæVB×W"Öw&–G¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’—ÒæVBÖÖWG&–77¶v£‡‡ÒæVBÖÖWG&–27G&öæw¶föçB×6—¦S£#7‡×Ğ¤ÖVF–†Ö‚×v–GFƒ£c#‚—²æVBÖ†VF–ærƒ¶föçB×6—¦S£#W‡ÒæVBÖ†VF–ær¶föçB×6—¦S£'‡ÒæVBÖ÷fW'f–WrÂæVB×6V7F–öç·FF–æs£‡‚W‡ÒæVBÖÖWG&–77¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£#'‚G‡ÒæVBÖÖWG&–3¦f—'7BÖ6†–ÆB7G&öæw¶föçB×6—¦S£3G‡ÒæVB×6V7F–öâÖ†VG¶fÆW‚ÖF—&V7F–öã¦6öÇVÖã¶Æ–vâÖ—FV×3¦fÆW‚×7F'GÒæVB×6V7F–öâƒ'¶föçB×6—¦S£—‡ÒæVB×66÷W¶Æ–vâ×6VÆc¦fÆW‚×7F'GÒæVBÖæg¶v£W‡ÒæVBÖæbæVBÖ'WGFöç·FF–æs£‡ƒ¶föçB×6—¦S£'‡ÒæVB×F&ÆRÂæVB×F&ÆRF&öG—¶F—7Æ“¦&Æö6·ÒæVB×F&ÆRF†VG¶F—7Æ“¦æöæWÒæVB×F&ÆRG'¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£G‚gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£gƒ¶Ö&v–ã£'‚ÒæVB×F&ÆRF&öG’F‡¶w&–BÖ6öÇVÖã£òÓ¶föçB×6—¦S£wƒ¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“·FF–æs£'‡ÒæVB×F&ÆRFG¶F—7Æ“¦&Æö6³¶&÷&FW#£¶Ö–â×v–GFƒ£·FF–æs£¶föçB×6—¦S£7‡ÒæVB×F&ÆRFC¦&Vf÷&W¶6öçFVçC¦GG"†FFÖÆ&VÂ“¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–âÖ&÷GFöÓ£g‡ÒæVB×F&ÆR6ÖÆÇ¶föçB×6—¦S£‡ÒæVB×F&ÆR×w&¶÷fW&fÆ÷s§f—6–&ÆWÒæVB×W"Öw&–BÂæVBÖ6öÖ&òÖw&–G¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'ÒæVB×VG&çBÖw&÷W7¶v£‡‚'‡ÒæVBÖ6†'BÖÆ–÷WG¶v£'‡ÒæVB×VG&çG·v–GFƒ¦6Æ2ƒR²g‚“¶Ö&v–âÖÆVgC¢Ó‡‡ÒæVB×&VFW"ç"Ö†VG¶fÆW‚×w&§w&ÒæVB×&VFW"ç"ÖÖ–ç¶Ö–â×v–GFƒ£ÒæVBÖ–ç7V7G·FF–æs£w‡ÒæVBÖ–ç7V7BFÇ¶v£‡‚#‡ÒæVBÖ–ç7V7BFÃæF—g¶fÆW‚ÖF—&V7F–öã¦6öÇVÖçÒæVBÖ–ç7V7BFG·FW‡BÖÆ–vã¦ÆVgGÒæVB×F÷¶Ö&v–âÖ&÷GFöÓ£#‡ÒæVB×vW¶Ö&v–âÖ&÷GFöÓ£ƒ‡×Ğ¦°¢7G–ÆRçFW‡D6öçFVçB³ÒræVBÖ6†'BÖ6öçG&öÇ7¶F—7Æ“¦fÆWƒ¶v£'ƒ¶fÆW‚×w&§w&¶Æ–vâÖ—FV×3¦6VçFW#¶Ö&v–ã¢ÓG‚#G‡ÒæVB×v–æF÷w¶F—7Æ“¦fÆWƒ¶v£‡ƒ¶Æ–vâÖ—FV×3¦6VçFW#¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVB×v–æF÷r6VÆV7G¶föçC¦–æ†W&—C·FF–æs£ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£—ƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶Ö–âÖ†V–v‡C£3‡ƒ¶Ö‚×v–GFƒ£WÒæVBÖÖWF†öB7VÖÖ'—¶7W'6÷#§ö–çFW'ÒæVBÖÖWF†öB¶Ö&v–ã£‡‚ÒæVBÖ†—7F÷'—·FF–æs£¶Æ—7B×7G–ÆS¦æöæS¶Ö&v–ã£‡‚¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—ÒæVBÖ†—7F÷'’Æ—·FF–æs£'‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR“¶föçB×6—¦S£'ƒ¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVBÖ†—7F÷'’7âÂæVBÖ†—7F÷'’6ÖÆÂÂæVBÖ†—7F÷'’'¶F—7Æ“¦&Æö6·ÒæVBÖ†—7F÷'’6ÖÆÇ¶Ö&v–â×F÷£G‡ÒæVBÖ†—7F÷'’'¶föçB×6—¦S£7ƒ¶Ö&v–â×F÷£g‡ÒæVBÖ–ç7V7BæVBÖ6†ævW¶föçB×vV–v‡C£cS¶÷fW&fÆ÷r×w&¦ç—v†W&WÔÖVF–†Ö‚×v–GFƒ£c#‚—²æVBÖ6†'BÖ6öçG&öÇ7¶v£ƒ¶Ö&v–âÖ&÷GFöÓ£#‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷W·FF–æs£'‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷R'WGFöç¶föçB×6—¦S£'ƒ·FF–æs£w‚‡ÒæVB×v–æF÷w·v–GFƒ£WÒæVB×v–æF÷r6VÆV7G¶fÆWƒ£¶Ö–â×v–GFƒ£ÒæVBÖ–ç7V7BæVBÖ†—7F÷'—¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£'‡ÒæVBÖ–ç7V7BæVBÖ†—7F÷'’Æ—¶Ö–â×v–GFƒ£×Òs°¢òò6†&VB&VF–ær66ÆRf÷"F†—2FWF–ÂvS²&WF–âF†RÆ–6F–öâw27—7FVÒföçB7F6²à¢7G–ÆRçFW‡D6öçFVçB³Ò ¢æVB×vW²ÒÖ×WFVC¦6öÆ÷"ÖÖ—‚†–â7&v"Çf"‚Ò×FW‡B’s"RÇf"‚Ò×æVÂ×6öÆ–B’“²ÒÖVB×÷6—F—fS¦6öÆ÷"ÖÖ—‚†–â7&v"Çf"‚ÒÖw&VVâ’cRRÇf"‚Ò×FW‡B’“²ÒÖVBÖæVvF—fS¦6öÆ÷"ÖÖ—‚†–â7&v"Çf"‚ÒÖFævW"’sRÇf"‚Ò×FW‡B’“¶föçB×6—¦S£Wƒ¶Æ–æRÖ†V–v‡C£ãcWĞ¢æVBÖ†VF–ærƒ¶föçB×6—¦S£3ƒ¶föçB×vV–v‡C£cS¶ÆWGFW"×76–æs¢Òã&V×ÒæVBÖ†VF–ærÂæVB×6V7F–öâÖ†VB¶föçB×6—¦S£Gƒ¶Æ–æRÖ†V–v‡C£ãsWÒæVBÖW–V'&÷w¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£c¶ÆWGFW"×76–æs¢ãfV×ÒæVB×6V7F–öâƒ'¶föçB×6—¦S£#ƒ¶föçB×vV–v‡C£cSÒæVB×6V7F–öç·FF–æs£#gƒ¶Ö&v–ã£#G‚ÒæVB×6V7F–öâÖ†VG¶Ö&v–âÖ&÷GFöÓ£#‡ÒæVBÖ'WGFöâÂæVB×66÷R'WGFöç¶föçB×6—¦S£Gƒ¶Ö–âÖ†V–v‡C£C'‡ÒæVBÖÖWG&–27G&öæw¶föçB×vV–v‡C£cSÒæVBÖÖWG&–26ÖÆÂÂæVB×F&ÆR6ÖÆÂÂæVBÖ6öÖ&òÖw&–B6ÖÆÇ¶föçB×6—¦S£'‡ÒæVBÖÖWG&–3ç7ç¶föçB×6—¦S£G‡ÒæVBÖ6öçFW‡G¶föçB×6—¦S£G‡ÒæVB×F&ÆW¶föçB×6—¦S£G‡ÒæVB×F&ÆRF‚ÂæVB×F&ÆRFG·FF–æs£w‚—‡ÒæVB×F&ÆRF†VBF‡¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£SÒæVB×F&ÆRF&öG’F‡¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£cÒæVB×F&ÆRFB'¶föçB×6—¦S£‡ƒ¶föçB×vV–v‡C£cÒæVBÖ6öÖ&òÖw&–Bƒ7¶föçB×6—¦S£W‡ÒæVBÖ6öÖ&òÖw&–B¶föçB×6—¦S£G‡ÒæVBÖ–ç7V7B¶föçB×6—¦S£W‡ÒæVBÖ–ç7V7BFÃæF—bÂæVBÖ†—7F÷'’Æ—¶föçB×6—¦S£7‡ÒæVBÖ–ç7V7B6ÖÆÇ¶föçB×6—¦S£'‡ÒæVB×VG&çBÖw&÷W2ÂæVBÖÖWF†öBÂæVBÖÖ—76–æw¶föçB×6—¦S£7‡ÒæVB×ö–çBÖÆ—7B'WGFöç¶föçB×6—¦S£7‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×v–æF÷w¶föçB×6—¦S£7‡ÒæVBÖ6†'BÖ6öçG&öÇ26VÆV7G¶föçB×6—¦S£G‡ÒæVB×W"¶föçB×6—¦S£G‡ÒæVB×7FGW7¶föçB×6—¦S£'‡ÒæVBÖV×G—¶föçB×6—¦S£G‡ÒæVBÖv–ç¶6öÆ÷#§f"‚ÒÖVB×÷6—F—fR—ÒæVBÖÆ÷77¶6öÆ÷#§f"‚ÒÖVBÖæVvF—fR—Ğ¢æVBÖ6†ævR×F'7¶F—7Æ“¦fÆWƒ¶v£Gƒ·FF–æs£Gƒ¶&÷&FW"×&F—W3£'ƒ¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfcvf“·v–GFƒ¦f—BÖ6öçFVçC¶Ö&v–âÖ&÷GFöÓ£#'‡ÒæVBÖ6†ævR×F'2'WGFöç¶föçC¦–æ†W&—C¶föçB×6—¦S£Gƒ¶&÷&FW#£¶&÷&FW"×&F—W3£—ƒ¶&6¶w&÷VæC§G&ç7&VçC¶6öÆ÷#§f"‚ÒÖ×WFVB“·FF–æs£—‚‡ƒ¶Ö–âÖ†V–v‡C£C'‡ÒæVBÖ6†ævR×F'2¶&–×&W76VC×G'VU×¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶6öÆ÷#§f"‚Ò×FW‡B“¶föçB×vV–v‡C£c¶&÷‚×6†F÷s£'‚W‚3ƒ#&c7ÒæVBÖ6†ævRÖf–ÇFW'7¶F—7Æ“¦fÆWƒ¶v£Gƒ¶fÆW‚×w&§w&¶Ö&v–âÖ&÷GFöÓ£#G‡ÒæVBÖ6†ævRÖf–ÇFW'2Æ&VÇ¶F—7Æ“¦w&–C¶v£wƒ¶Ö–â×v–GFƒ£¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ6†ævRÖf–ÇFW'2Æ&VÃ¦f—'7BÖ6†–ÆG¶fÆWƒ£#S‡ÒæVBÖ6†ævRÖf–ÇFW'26VÆV7G·v–GFƒ£S¶Ö–â×v–GFƒ£¶Ö‚×v–GFƒ£S¶föçC¦–æ†W&—C¶föçB×6—¦S£Gƒ¶Ö–âÖ†V–v‡C£CGƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£ƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“·FF–æs£—‚3G‚—‚'ƒ·FW‡BÖ÷fW&fÆ÷s¦VÆÆ—6—7ÒæVBÖ6†ævRÖf–ÇFW'26VÆV7C¦fö7W2×f—6–&ÆRÂæVB×&VfÆV7F–öâFW‡F&V¦fö7W2×f—6–&ÆW¶÷WFÆ–æS£'‚6öÆ–Bf"‚ÒÖ66VçB“¶÷WFÆ–æRÖöfg6WC£7‡ÒæVBÖ6†ævRÖ6öçFW‡G¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£'ƒ¶fÆW‚×w&§w&¶föçB×6—¦S£Gƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“·FF–ær×F÷£#ƒ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—ÒæVBÖ6†ævRÖ6öçFW‡B'¶föçB×vV–v‡C£S¶6öÆ÷#§f"‚Ò×FW‡B—ÒæVBÖ6†ævRÖ6öçFW‡BF–ÖW¶föçB×6—¦S£7‡ÒæVBÖ6†ævR×F÷FÇ¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Æ–vâÖ—FV×3¦6VçFW#¶v£#ƒ¶Ö&v–ã£#'‚#g‡ÒæVBÖ6†ævR×F÷FÃæF—g¶F—7Æ“¦w&–C¶v£G‡ÒæVBÖ6†ævR×F÷FÂ7ç¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVBÖ6†ævR×F÷FÂ7G&öæw¶föçB×6—¦S£#‡ƒ¶Æ–æRÖ†V–v‡C£ãC¶föçB×vV–v‡C£c¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒæVBÖ6†ævR×F÷FÂ¶föçB×6—¦S£Wƒ·FW‡BÖÆ–vã§&–v‡C¶Ö&v–ã£¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒæVBÖ6†ævR×F÷FÂ6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£g‡ÒæVBÖ6†ævRÖ¶W—¶F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶v£‡ƒ¶fÆW‚×w&§w&¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£#'‚‡‡ÒæVBÖ6†ævRÖ&'7¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—ÒæVBÖ6†ævR×&÷w¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£s‚Ö–æÖ‚ƒ‚Ãg"’Sƒ¶v£#'ƒ¶Æ–vâÖ—FV×3¦6VçFW#·FF–æs£‡‚¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æR—ÒæVBÖ6†ævRÖÆ&VÇ¶Ö–â×v–GFƒ£ÒæVBÖ6†ævRÖÆ&VÂ'¶F—7Æ“¦&Æö6³¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£c¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVBÖ6†ævRÖÆ&VÂ7ç¶F—7Æ“¦&Æö6³¶föçB×6—¦S£7ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×7ÒæVBÖ6†ævRÖÆ&VÂ6ÖÆÇ¶F—7Æ“¦&Æö6³¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£7‡ÒæVBÖ6†ævR×Æ÷G·÷6—F–öã§&VÆF—fS¶†V–v‡C£#‡ƒ¶&6¶w&÷VæC¦Æ–æV"Öw&F–VçB‡Fò&–v‡BÇG&ç7&VçB#Bã’RÇf"‚ÒÖÆ–æR’#RRÇG&ç7&VçB#RãRÇG&ç7&VçBsBã’RÇf"‚ÒÖÆ–æR’sRRÇG&ç7&VçBsRãR—ÒæVBÖ6†ævR×¦W&÷·÷6—F–öã¦'6öÇWFS¶ÆVgC£SS·v–GFƒ£ƒ¶&6¶w&÷VæC§f"‚ÒÖ×WFVB“·F÷¢Ó7ƒ¶&÷GFöÓ¢Ó7ƒ¶÷6—G“¢ãWÒæVBÖ6†ævRÖ&'·÷6—F–öã¦'6öÇWFS·F÷£wƒ¶†V–v‡C£Gƒ¶Ö–â×v–GFƒ£¶&÷&FW"×&F—W3£7ƒ¶&6¶w&÷VæC¦7W'&VçD6öÆ÷#¶÷6—G“¢ãƒWÒæVBÖ6†ævR×F–W·÷6—F–öã¦'6öÇWFS·v–GFƒ£gƒ¶†V–v‡C£gƒ¶&÷&FW"×&F—W3£SS¶&6¶w&÷VæC§f"‚ÒÖ×WFVB“¶ÆVgC¦6Æ2ƒSRÒ"ãW‚“·F÷£‡ÒæVBÖ6†ævRÖFVÇF¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£c·FW‡BÖÆ–vã§&–v‡C¶föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×3¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVBÖ6†ævRÖæ÷FW¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£#‚Ğ¢æVB×&VfÆV7F–öâ×&—fFW¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶fÆW‚×6‡&–æ³£ÒæVB×&VfÆV7F–öâFW‡F&V¶F—7Æ“¦&Æö6³·v–GFƒ£S¶Ö–âÖ†V–v‡C£ƒƒ¶Ö‚Ö†V–v‡C£cƒ·&W6—¦S§fW'F–6Ã¶föçC¦–æ†W&—C¶föçB×6—¦S£gƒ¶Æ–æRÖ†V–v‡C£ãƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–B“¶6öÆ÷#§f"‚Ò×FW‡B“·FF–æs£w‚‡ƒ¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷‡ÒæVB×&VfÆV7F–öâFW‡F&V£§Æ6V†öÆFW'¶6öÆ÷#§f"‚ÒÖ×WFVB“¶÷6—G“£ÒæVB×&VfÆV7F–öâFW‡F&V¦F—6&ÆVG¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfcvf“¶÷6—G“£ÒæVB×&VfÆV7F–öâÖfö÷FW'¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£‚‡ƒ¶fÆW‚×w&§w&¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£7‡ÒæVB×&VfÆV7F–öâÖfö÷FW"¶FF×&VfÆV7F–öâ×7FGW5×¶fÆWƒ£##ƒ¶föçB×6—¦S£7‡ÒæVB×&VfÆV7F–öâÖW'&÷'¶6öÆ÷#§f"‚ÒÖVBÖæVvF—fR—ÒæVB×&VfÆV7F–öâÖ6öæfÆ–7G¶Ö&v–â×F÷£#ƒ·FF–æs£‡ƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfcvf“¶föçB×6—¦S£G‡ÒæVB×&VfÆV7F–öâÖ6öæfÆ–7B·v†—FR×76S§&R×w&¶÷fW&fÆ÷r×w&¦ç—v†W&S¶Ö‚Ö†V–v‡C£#ƒƒ¶÷fW&fÆ÷s¦WFó¶Æ–æRÖ†V–v‡C£ã‡ÒæVB×&VfÆV7F–öâÖ6öæfÆ–7CæF—g¶F—7Æ“¦fÆWƒ¶v£ƒ¶fÆW‚×w&§w&ÒæVB×&VfÆV7F–öâÖ6öæfÆ–7B6ÖÆÇ¶F—7Æ“¦&Æö6³¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£'ƒ¶föçB×6—¦S£'‡ÒæVB×vR¶†–FFVå×¶F—7Æ“¦æöæR–×÷'FçGĞ¤ÖVF–†Ö–â×v–GFƒ£c#‚’æB†Ö‚×v–GFƒ£S‚—²æVB×F&ÆRÂæVB×F&ÆRF&öG—¶F—7Æ“¦&Æö6·ÒæVB×F&ÆRF†VG¶F—7Æ“¦æöæWÒæVB×F&ÆRF&öG—¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£g‡ÒæVB×F&ÆRG'¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£‡‡ÒæVB×F&ÆRF&öG’F‡¶w&–BÖ6öÇVÖã£òÓ·FF–æs£'ƒ¶föçB×6—¦S£w‡ÒæVB×F&ÆRFG¶&÷&FW#£·FF–æs£¶Ö–â×v–GFƒ£¶F—7Æ“¦&Æö6³¶föçB×6—¦S£G‡ÒæVB×F&ÆRFC¦&Vf÷&W¶6öçFVçC¦GG"†FFÖÆ&VÂ“¶F—7Æ“¦&Æö6³¶6öÆ÷#§f"‚ÒÖ×WFVB“¶föçB×6—¦S£'ƒ¶Ö&v–âÖ&÷GFöÓ£W‡ÒæVB×F&ÆR×w&¶÷fW&fÆ÷s§f—6–&ÆW×Ğ¤ÖVF–†Ö‚×v–GFƒ£“‚—²æVBÖ6†ævR×&÷w¶w&–B×FV×ÆFRÖ6öÇVÖç3£C‚Ö–æÖ‚ƒƒ‚Ãg"’3ƒ¶v£g‡×Ğ¤ÖVF–†Ö‚×v–GFƒ£c#‚—²æVB×vW¶Ö&v–âÖ&÷GFöÓ£ƒW‡ÒæVBÖ†VF–ærƒ¶föçB×6—¦S£#g‡ÒæVBÖ†VF–ær¶föçB×6—¦S£7‡ÒæVB×6V7F–öç·FF–æs£#'‚w‡ÒæVBÖ÷fW'f–Ww·FF–æs£#'‚w‡ÒæVB×6V7F–öâƒ'¶föçB×6—¦S£—‡ÒæVBÖÖWG&–26ÖÆÇ¶föçB×6—¦S£'‡ÒæVBÖæbæVBÖ'WGFöç¶föçB×6—¦S£7ƒ·FF–æs£‡‚—‡ÒæVB×F&ÆRG'·FF–æs£wƒ¶v£‡‚G‡ÒæVB×F&ÆRFG¶föçB×6—¦S£G‡ÒæVB×F&ÆRFC¦&Vf÷&RÂæVB×F&ÆR6ÖÆÇ¶föçB×6—¦S£'‡ÒæVB×F&ÆRF&öG’F‡¶föçB×6—¦S£w‡ÒæVBÖ6†ævR×F'7·v–GFƒ£WÒæVBÖ6†ævR×F'2'WGFöç¶fÆWƒ£·FF–æs£—‚g‡ÒæVBÖ6†ævRÖf–ÇFW'7¶v£'‡ÒæVBÖ6†ævRÖf–ÇFW'2Æ&VÇ¶fÆWƒ£#‡ÒæVBÖ6†ævRÖf–ÇFW'2Æ&VÃ¦f—'7BÖ6†–ÆG¶fÆW‚Ö&6—3£WÒæVBÖ6†ævRÖf–ÇFW'26VÆV7G¶föçB×6—¦S£G‡ÒæVBÖ6†ævR×F÷FÇ¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶v£‡ÒæVBÖ6†ævR×F÷FÂ7G&öæw¶föçB×6—¦S£#G‡ÒæVBÖ6†ævR×F÷FÂ¶föçB×6—¦S£G‡ÒæVBÖ6†ævRÖ¶W—¶föçB×6—¦S£'ƒ¶v£‡ƒ¶Ö&v–â×F÷£#'‡ÒæVBÖ6†ævR×&÷w¶w&–B×FV×ÆFRÖ6öÇVÖç3¦Ö–æÖ‚ƒÃg"’WFó¶v£‚gƒ·FF–æs£‡‚ÒæVBÖ6†ævRÖÆ&VÇ¶w&–BÖ6öÇVÖã£¶w&–B×&÷s£ÒæVBÖ6†ævRÖFVÇF¶w&–BÖ6öÇVÖã£#¶w&–B×&÷s£¶Ö‚×v–GFƒ£3ƒ¶föçB×6—¦S£G‡ÒæVBÖ6†ævR×Æ÷G¶w&–BÖ6öÇVÖã£òÓ¶w&–B×&÷s£#·v–GFƒ£S¶†V–v‡C£#G‡ÒæVBÖ6†ævRÖ&'·F÷£W‡ÒæVBÖ6†ævR×F–W·F÷£—‡ÒæVBÖ6†ævRÖÆ&VÂ'¶föçB×6—¦S£W‡ÒæVB×&VfÆV7F–öâæVB×6V7F–öâÖ†VG¶v£‡‡ÒæVB×&VfÆV7F–öâFW‡F&V·FF–æs£Gƒ¶Ö–âÖ†V–v‡C£#‡ÒæVB×&VfÆV7F–öâÖfö÷FW"¶FF×&VfÆV7F–öâ×7FGW5×¶fÆW‚Ö&6—3£“‡ÒæVB×&VfÆV7F–öâÖ6öæfÆ–7G·FF–æs£G‡ÒæVB×F÷æVBÖ'WGFöç¶föçB×6—¦S£7ƒ·FF–æs£‡‚‡ÒæVBÖ–ç7V7BFÃæF—g¶föçB×6—¦S£7‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷R'WGFöç¶föçB×6—¦S£7‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×v–æF÷r6VÆV7G¶föçB×6—¦S£G‡×Ğ¦°¢7G–ÆRçFW‡D6öçFVçB³Ò ¢æVBÖ†VF–ærƒ¦fö7W2ÂæVB×6V7F–öã¦fö7W7¶÷WFÆ–æS¦æöæWÒæVBÖ6†'BÖ6F–öç¶F—7Æ“¦æöæWÒæVB×VG&çBæVBÖF÷BÖçVÖ&W'¶föçB×vV–v‡C£cÒæVB×VG&çBÖ¶W—¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£‡‚‡ƒ¶Ö&v–ã£‡‚#ƒ¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãs¶6öÆ÷#§f"‚ÒÖ×WFVB—ÒæVB×VG&çBÖ¶W’7ç¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£wƒ¶Ö–â×v–GFƒ£ÒæVB×VG&çBÖ¶W’—·v–GFƒ£gƒ¶†V–v‡C£gƒ¶&÷&FW"×&F—W3£SS¶fÆWƒ¦æöæS¶÷6—G“¢ã‡ÒæVB×VG&çBÖ¶W’6ÖÆÇ¶föçB×6—¦S£ƒ¶÷6—G“¢ã‡ÒæVB×ö–çBÖÆ—7G¶Ö&v–ã£‡‚#G‡ÒæVBÖ6†'BÖ6öçG&öÇ7¶v£gƒ¶Ö&v–â×F÷£‡ƒ¶Ö&v–âÖ&÷GFöÓ£#‡‡ÒæVB×VG&çG¶÷fW&fÆ÷s§f—6–&ÆWĞ¤ÖVF–†Ö–â×v–GFƒ£c#‚’æB†Ö‚×v–GFƒ£S‚—²æVB×F&ÆRG'¶Æ–vâÖ6öçFVçC§7F'G×Ğ¤ÖVF–†Ö‚×v–GFƒ£c#‚—²æVB×VG&çG·v–GFƒ£S¶Ö&v–ã£ÒæVB×VG&çE¶FFÖÆ–÷WCÖ6ö×7EÒFW‡G¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£CÒæVB×VG&çE¶FFÖÆ–÷WCÖ6ö×7EÒæVBÖF÷BÖçVÖ&W'¶föçB×6—¦S£ƒ¶f–ÆÃ¢6ffc¶föçB×vV–v‡C£cÒæVBÖ6†'BÖ6F–öç¶F—7Æ“¦&Æö6³¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–ã£g‚#'‡ÒæVB×VG&çBÖ¶W—¶föçB×6—¦S£'ƒ¶Ö&v–â×F÷£Gƒ¶Ö&v–âÖ&÷GFöÓ£¶v£‚G‡ÒæVBÖ6†'BÖ6öçG&öÇ7¶v£g‚'ƒ¶Ö&v–ã£#'‚#‡‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷W·FF–æs£7‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷R'WGFöç·FF–æs£‡‚ƒ¶föçB×vV–v‡C£S¶föçB×6—¦S£7ƒ¶Ö–âÖ†V–v‡C£C‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×v–æF÷w¶F—7Æ“¦w&–C¶v£wƒ¶fÆWƒ£3ƒ¶Ö–â×v–GFƒ£·v–GFƒ¦WFó¶föçB×6—¦S£'‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×v–æF÷r6VÆV7G·v–GFƒ£S¶Ö–â×v–GFƒ£¶Ö‚×v–GFƒ£S¶föçB×6—¦S£7ƒ·FF–æs£‚‡ƒ¶Ö–âÖ†V–v‡C£C'‡ÒæVB×ö–çBÖÆ—7G¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£—ƒ¶Ö&v–ã£#‚#g‡ÒæVB×ö–çBÖÆ—7B'WGFöç¶§W7F–g’Ö6öçFVçC¦fÆW‚×7F'C¶Ö–â×v–GFƒ£¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãc·FF–æs£w‚—ƒ¶Ö–âÖ†V–v‡C£3‡ƒ·FW‡BÖÆ–vã¦ÆVgC¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæVB×ö–çBÖÆ—7B—¶fÆWƒ¦æöæWÒæVBÖ–ç7V7G·FF–æs£#‚w‡ÒæVBÖ6†'BÖÆ–÷WG¶v£‡‡×Ğ¤ÖVF–†Ö‚×v–GFƒ£3c‚—²æVB×ö–çBÖÆ—7G¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’—ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷W·v–GFƒ£S¶F—7Æ“¦fÆW‡ÒæVBÖ6†'BÖ6öçG&öÇ2æVB×66÷R'WGFöç¶fÆWƒ£×Ğ¦°¢f"6†'E&W6—¦UF–ÖW#°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚w&W6—¦RrÂgVæ7F–öâ‚’²6ÆV%F–ÖV÷WB†6†'E&W6—¦UF–ÖW"“²6†'E&W6—¦UF–ÖW"Ò6WEF–ÖV÷WB†gVæ7F–öâ‚’²–b‡f–Wrbb7F—fR‡f–Wr’bbf–Wrç&W÷'B’²f"W†ÒÒ7W'&VçDW†Ò‚“²–b†W†Ò’&–æEVG&çG2†W†ÒÂÖöFVÂ†W†Ò’“²ÒÒÂ#“²Ò“°¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“° ¢ò¢ÓÓÓÓÒ7W&6RögVæ7F–öç2õ÷6†&VBö&6·WÖf÷&ÖBæ§2ÓÓÓÓÒ¢ğ¢ò¢öæRfÆ–FF÷"f÷"F†R'&÷w6W"&Wf–WræBF†RWF†VçF–6FVB–×÷'BVæGö–çBâ¢ğ¢†gVæ7F–öâ‡&ö÷B’°¢wW6R7G&–7Bs°¢f"÷vâÒgVæ7F–öâ†òÂ²’²&WGW&âö&¦V7Bç&÷F÷G—Ræ†4÷vå&÷W'G’æ6ÆÂ†òÂ²“²Ó°¢gVæ7F–öâö&¦V7B‡bÂÆ&VÂ’°¢–b‚bÇÂG—VöbbÓÒvö&¦V7BrÇÂ'&’æ—4'&’‡b’’F‡&÷ræWrW'&÷"†Æ&VÂ²~jÎ[ÈşKˆŞjÚ>zâr“°¢f÷"‡f"²öbö&¦V7Bæ¶W—2‡b’’–b…²uõ÷&÷FõõòrÂw&÷F÷G—RrÂv6öç7G'V7F÷"uÒæ–æ6ÇVFW2†²’’F‡&÷ræWrW'&÷"‚~ZH~K»ŞY
¾iÈKˆŞiJşhÈy¨NZÙ~jëRr“°¢&WGW&âc°¢Ğ¢gVæ7F–öâ7G"‡bÂÖ‚ÂÆ&VÂÂ&WV—&VB’°¢–b‡bÓÒçVÆÂ’bÒrs°¢–b‡G—VöbbÓÒw7G&–ærrÇÂbæÆVæwF‚âÖ‚ÇÂbæ–æ6ÇVFW2‚uÇSr’’F‡&÷ræWrW'&÷"†Æ&VÂ²~jÎ[Èşh‰n™[ş[ªnKˆŞjÚ>zâr“°¢bÒbçG&–Ò‚“²–b‡&WV—&VBbbb’F‡&÷ræWrW'&÷"†Æ&VÂ²~KˆŞˆ;ŞK‹®z›¢r“²&WGW&âc°¢Ğ¢gVæ7F–öâçVÖ&W"‡bÂÆ&VÂÂÖ‚ÂÖ–âÂ–çFVvW"’°¢–b‡bÓÓÒçVÆÂÇÂbÓÓÒVæFVf–æVBÇÂbÓÓÒrr’&WGW&âçVÆÃ°¢–b‚²vçVÖ&W"rÂw7G&–æruÒæ–æ6ÇVFW2‡G—Vöbb’ÇÂ‡G—VöbbÓÓÒw7G&–ærrbbbçG&–Ò‚’’’F‡&÷ræWrW'&÷"†Æ&VÂ²~[ø^š¾iŠşi[ZÙrr“°¢f"âÒçVÖ&W"‡b“°¢–b‚çVÖ&W"æ—4f–æ—FR†â’ÇÂâÂ†Ö–âÇÂ’ÇÂââ†Ö‚ÇÂ““““’’ÇÂ†–çFVvW"bbçVÖ&W"æ—4–çFVvW"†â’’ÇÂ‚–çFVvW"bbÖF‚æ'2†â¢ÒÖF‚ç&÷VæB†â¢’’âã’’F‡&÷ræWrW'&÷"†Æ&VÂ²~‹h^X{®ˆÈ>Y»Nh‰n{+î[ªnKˆŞjÚ>zâr“°¢&WGW&âã°¢Ğ¢gVæ7F–öâFFR‡bÂÆ&VÂÂ&WV—&VB’°¢f"2Ò7G"‡bÂÂÆ&VÂÂ&WV—&VB“°¢–b‚2’&WGW&âçVÆÃ°¢–b‚õåÆG³GÒÕÆG³'ÒÕÆG³'ÒBòçFW7B‡2’ÇÂçVÖ&W"æ—4f–æ—FR„FFRç'6R‡2’’ÇÂæWrFFR‡2’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ’ÓÒ2’F‡&÷ræWrW'&÷"†Æ&VÂ²~KˆŞiŠşiÈiXiz^iÉòr“°¢&WGW&â3°¢Ğ¢gVæ7F–öâ&ööÂ‡bÂÆ&VÂ’²–b‡bÓÒçVÆÂ’&WGW&âfÇ6S²–b‡G—VöbbÓÒv&ööÆVâr’F‡&÷ræWrW'&÷"†Æ&VÂ²~[ø^š¾K‹®[ˆ>[	NXÂr“²&WGW&âc²Ğ¢gVæ7F–öâÆ—7B‡bÂÖ‚ÂÆ&VÂ’²–b‚'&’æ—4'&’‡b’ÇÂbæÆVæwF‚âÖ‚’F‡&÷ræWrW'&÷"†Æ&VÂ²~š¾K‹®X‰~ŠûÈÎiÈZI¢r²Ö‚²rš’r“²&WGW&âc²Ğ¢gVæ7F–öâ&æ·2‡bÂÆ&VÂ’°¢bÒö&¦V7B‡bÇÂ·ÒÂÆ&VÂ“²f"òÒ·Ó°¢µ²w–V%&æ²rÂw–V%'F–6—çG2uÒÅ²v6Æ75&æ²rÂv6Æ75'F–6—çG2uÕÒæf÷$V6‚†gVæ7F–öâ‡—"’°¢—"æf÷$V6‚†gVæ7F–öâ†¶W’’²õ¶¶W•ÒÒçVÖ&W"‡e¶¶W•ÒÂÆ&VÂ²¶W’ÂÂÂG'VR“²Ò“°¢–b†õ·—%³ÕÒÒçVÆÂbbõ·—%³ÕÒÒçVÆÂbbõ·—%³ÕÒâõ·—%³ÕÒ’F‡&÷ræWrW'&÷"†Æ&VÂ²~hé.YŞZJ~K¨îK«®i[r“°¢Ò“°¢²w–V%÷6—F–öåW&6VçBrÂv6Æ75÷6—F–öåW&6VçBuÒæf÷$V6‚†gVæ7F–öâ†²’²–b†÷vâ‡bÂ²’’õ¶µÒÒçVÖ&W"‡e¶µÒÂÆ&VÂ²²Â“²Ò“°¢&WGW&âó°¢Ğ¢gVæ7F–öâ6æöæ–6Â‡fÇVR’°¢–b„'&’æ—4'&’‡fÇVR’’&WGW&âu²r²fÇVRæÖ†6æöæ–6Â’æ¦ö–â‚rÂr’²uÒs°¢–b‡fÇVRbbG—VöbfÇVRÓÓÒvö&¦V7Br’&WGW&âw²r²ö&¦V7Bæ¶W—2‡fÇVR’ç6÷'B‚’æÖ†gVæ7F–öâ†²’²&WGW&â¥4ôâç7G&–æv–g’†²’²s¢r²6æöæ–6Â‡fÇVU¶µÒ“²Ò’æ¦ö–â‚rÂr’²wÒs°¢&WGW&â¥4ôâç7G&–æv–g’‡fÇVR“°¢Ğ¢gVæ7F–öâ–FVçF—G’†W†Ò’²&WGW&â6æöæ–6Â…¶W†ÒææÖRÂW†ÒæW†ÕöFFRÂW†Òæw&FUöÆWfVÂÇÂrrÂö&¦V7Bæ¶W—2†W†Òç66÷&W2ÇÂ·Ò’ç6÷'B‚•Ò“²Ğ¢gVæ7F–öâæ÷&ÖÆ—¦R‡&r’°¢ö&¦V7B‡&rÂ~ZH~K»Òr“°¢–b‡&ræÓÒw66÷&R×G&6¶W"r’F‡&÷ræWrW'&÷"‚~Šû~˜hºh‰{º‹Ú‹ûZûÎX{®y¨N8ÎZèÎi[NZH~K»Ş8Ô¥4ôâih~K»br“°¢–b‡&ræ&6·WfW'6–öâÒçVÆÂbb&ræ&6·WfW'6–öâÓÒ"’F‡&÷ræWrW'&÷"‚~ZH~K»Şx˜iÊÎ‹è>ikûÈÎŠû~XXi»Nikh‰{º‹Ú‹û’r“°¢f"÷WBÒ²¢w66÷&R×G&6¶W"rÂ&6·WfW'6–öã¢"Â66÷VçC¢7G"‡&ræ÷&–v–æÅW6W&æÖRÇÂ&ræ66÷VçBÂÂ~ZH~K»Ş‹JnXûrr’ÂÖöGVÆW3¢µÒÂ7V&¦V7D6öæf–w3¢µÒÂW†×3¢µÒÂ6FVv÷'“¢çVÆÂÂvöÃ¢çVÆÂÂ'F–6—çDFVfVÇG3¢·ÒÂ&W7F÷&Tf–VÆG3§¶vöÃ¦÷vâ‡&rÂvvöÂr’Ç'F–6—çDFVfVÇG3¦÷vâ‡&rÂw'F–6—çDFVfVÇG2r—ÒÓ°¢f"ÖöG2ÒæWrÖ‚’ÂæÖW2ÒæWr6WB‚’Â–G2ÒæWr6WB‚“°¢Æ—7B‡&ræÖöGVÆW2ÇÂµÒÂCÂ~h‰{º{¸NY‚r’æf÷$V6‚†gVæ7F–öâ†Ò’°¢ö&¦V7B†ÒÂ~{¸NY‚r“²f"–BÒ7G"†Òæ–BÂÂ~{¸NY{ÉnXûrrÂG'VR’ÂæÖRÒ7G"†ÒææÖRÂ3Â~{¸NYYŞz{rÂG'VR“°¢–b†ÖöG2æ†2†–B’ÇÂæÖW2æ†2†æÖR’’F‡&÷ræWrW'&÷"‚~ZH~K»ŞKŠŞy¨N{¸NY{ÉnXû~h‰nYŞz{˜xŞZHÒr“°¢f"7V&¦V7G2ÒÆ—7B†Òç7V&¦V7G2ÂCÂ~{¸NYzyyºâr’æÖ†gVæ7F–öâ‡2’²&WGW&â7G"‡2ÂCÂ~{¸NYzyyºârÂG'VR“²Ò“°¢–b‡7V&¦V7G2æÆVæwF‚Â"ÇÂæWr6WB‡7V&¦V7G2’ç6—¦RÓÒ7V&¦V7G2æÆVæwF‚’F‡&÷ræWrW'&÷"‚~{¸NYš¾iÈˆ{>[	KŠN™zKˆŞ˜xŞZHŞzyyºâr“°¢f"&÷rÒ²–C¢–BÂæÖS¢æÖRÂ7V&¦V7G3¢7V&¦V7G2Â—4'V–ÇF–ã¢&ööÂ†Òæ—4'V–ÇF–âÂ~Xh^{Úî{¸NY‚r’Ó°¢ÖöG2ç6WB†–BÂ&÷r“²æÖW2æFB†æÖR“²÷WBæÖöGVÆW2çW6‚‡&÷r“°¢Ò“°¢æÖW2æ6ÆV"‚“°¢Æ—7B‡&rç7V&¦V7D6öæf–w2ÇÂµÒÂCÂ~zyyºîŠëî{Úâr’æf÷$V6‚†gVæ7F–öâ‡2’°¢ö&¦V7B‡2Â~zyyºîŠëî{Úâr“²f"æÖRÒ7G"‡2ææÖRÂCÂ~zyyºîYŞz{rÂG'VR’ÂÖ‚ÒçVÖ&W"‡2æFVfVÇDÖ‚Â~zyyºîkºXˆbrÂ““’Âã“°¢–b†Ö‚ÓÒçVÆÂÇÂæÖW2æ†2†æÖR’’F‡&÷ræWrW'&÷"‚~zyyºîYŞz{˜xŞZHŞh‰n{Ë®[	›¹ŠêNkºXˆbr“°¢æÖW2æFB†æÖR“²÷WBç7V&¦V7D6öæf–w2çW6‚‡²æÖS¢æÖRÂFVfVÇDÖƒ¢Ö‚Ò“°¢Ò“°¢f"W†×2ÒÆ—7B‡&ræW†×2ÂÂ~ˆ>ŠùRr“°¢–b‡&ræW†Ô6÷VçBÒçVÆÂbb&ræW†Ô6÷VçBÓÒW†×2æÆVæwF‚’F‡&÷ræWrW'&÷"‚~ZH~K»Şˆ>Šù^i[˜xşKˆîXh^ZëKˆŞKˆˆ{Br“°¢W†×2æf÷$V6‚†gVæ7F–öâ†W‚Â–æFW‚’°¢ö&¦V7B†W‚Â~ˆ>ŠùRr“²f"Æ&VÂÒ~zÊÂr²†–æFW‚²’²rYË®ˆ>Šù^ûÉ¢s°¢f"RÒ²æÖS¢7G"†W‚ææÖRÂÂÆ&VÂ²~YŞz{rÂG'VR’ÂW†ÕöFFS¢FFR†W‚æW†ÕöFFRÂÆ&VÂ²~iz^iÉòrÂG'VR’ÂVæEöFFS¢FFR†W‚æVæEöFFRÂÆ&VÂ²~{¹>iÙşiz^iÉòr’Âw&FUöÆWfVÃ¢7G"†W‚æw&FUöÆWfVÂÂ#ÂÆ&VÂ²~Xˆn{²r’ÇÂçVÆÂÂ—5ö†–FFVã¢&ööÂ†W‚æ—5ö†–FFVâÂÆ&VÂ²~™©‰xşx«nhr’Â&VfÆV7F–öã¢7G"†W‚ç&VfÆV7F–öâÂÂÆ&VÂ²~ˆ>YîXøŞh	Òr’Â66÷&W3¢·ÒÂÖöGVÆT–G3¢µÒÂÖöGVÆU&æ·3¢·ÒÂfW&vW3¢·ÒÂVW7F–öå÷G—U÷66÷&W3¢·ÒÓ°¢–b†RæVæEöFFRbbRæVæEöFFRÂRæW†ÕöFFR’F‡&÷ræWrW'&÷"†Æ&VÂ²~{¹>iÙşiz^iÉşizK¨î[ÈZx¾iz^iÉòr“°¢–b†W‚æ–BÒçVÆÂ’²Rç6÷W&6T–BÒ7G"†W‚æ–BÂÂÆ&VÂ²~{ÉnXûrrÂG'VR“²–b†–G2æ†2†Rç6÷W&6T–B’’F‡&÷ræWrW'&÷"‚~ZH~K»ŞKŠŞiÈ˜xŞZHŞˆ>Šù^{ÉnXûrr“²–G2æFB†Rç6÷W&6T–B“²Ğ¢µ²wF÷FÅ÷&æ²rÂwF÷FÅ÷'F–6—çG2uÒÅ²wF÷FÅö6Æ75÷&æ²rÂwF÷FÅö6Æ75÷'F–6—çG2uÒÅ²v6—G•÷&æ²rÂv6—G•÷'F–6—çG2uÒÅ²vF—7G&–7E÷&æ²rÂvF—7G&–7E÷'F–6—çG2uÕÒæf÷$V6‚†gVæ7F–öâ‡—"’°¢—"æf÷$V6‚†gVæ7F–öâ†²’²f"6ÖVÂÒ²ç&WÆ6R‚õò…¶×¥Ò’örÂgVæ7F–öâ…òÂ2’²&WGW&â2çFõWW$66R‚“²Ò“²U¶µÒÒçVÖ&W"†W…¶µÒÓÒçVÆÂòW…¶6ÖVÅÒ¢W…¶µÒÂÆ&VÂ²²ÂÂÂG'VR“²Ò“°¢–b†U·—%³ÕÒÒçVÆÂbbU·—%³ÕÒÒçVÆÂbbU·—%³ÕÒâU·—%³ÕÒ’F‡&÷ræWrW'&÷"†Æ&VÂ²~hé.YŞZJ~K¨îK«®i[r“°¢Ò“°¢²wF÷FÅö7GVÅ÷66÷&RrÂwF÷FÅ÷&u÷66÷&RuÒæf÷$V6‚†gVæ7F–öâ†²’²U¶µÒÒçVÖ&W"†W…¶µÒÂÆ&VÂ²²“²Ò“°¢²wF÷FÅ÷–V%÷÷6—F–öå÷W&6VçBrÂwF÷FÅö6Æ75÷÷6—F–öå÷W&6VçBuÒæf÷$V6‚†gVæ7F–öâ†²’²U¶µÒÒçVÖ&W"†W…¶µÒÂÆ&VÂ²²Â“²Ò“°¢ö&¦V7B†W‚ç66÷&W2ÂÆ&VÂ²~h‰{º’r“°¢–b„ö&¦V7Bæ¶W—2†W‚ç66÷&W2’æÆVæwF‚âC’F‡&÷ræWrW'&÷"†Æ&VÂ²~zyyºî‹ø~ZI¢r“°¢ö&¦V7Bæ¶W—2†W‚ç66÷&W2’æf÷$V6‚†gVæ7F–öâ†¶W’’°¢f"æÖRÒ7G"†¶W’ÂCÂÆ&VÂ²~zyyºârÂG'VR’Â"Òö&¦V7B†W‚ç66÷&W5¶¶W•ÒÂÆ&VÂ²æÖR’Â2Ò·Ó°¢²wF&vWBrÂv7GVÂrÂw&rrÂvÖ‚rÂw&tÖ‚uÒæf÷$V6‚†gVæ7F–öâ†²’²5¶µÒÒçVÖ&W"‡%¶µÒÂÆ&VÂ²æÖR²²Æ³ÓÓÒw&rsó““““£““““’“²Ò“°¢–b‡2æÖ‚ÓÒçVÆÂ’2æÖ‚Ò†÷WBç7V&¦V7D6öæf–w2æf–æB†gVæ7F–öâ†2’²&WGW&â2ææÖRÓÓÒæÖS²Ò’ÇÂ·Ò’æFVfVÇDÖ‚ÇÂ°¢–b‡2ç&tÖ‚ÓÒçVÆÂ’2ç&tÖ‚Ò2æÖƒ°¢–b‡2æÖ‚ÃÒÇÂ2ç&tÖ‚ÃÒÇÂ‡2æ7GVÂÒçVÆÂbb2æ7GVÂâ2æÖ‚’ÇÂ‡2çF&vWBÒçVÆÂbb2çF&vWBâ2æÖ‚’ÇÂ‡2ç&rÒçVÆÂbb2ç&râ2ç&tÖ‚’’F‡&÷ræWrW'&÷"†Æ&VÂ²æÖR²~h‰{º‹h^‹ø~kºXˆnh‰nkºXˆniziX‚r“°¢f"&æ²Ò&æ·2‡·–V%&æ³§"ç&æ²Ç–V%'F–6—çG3§"ç'F–6—çG2Æ6Æ75&æ³§"æ6Æ75&æ²Æ6Æ75'F–6—çG3§"æ6Æ75'F–6—çG7ÒÂÆ&VÂ²æÖR“°¢2ç&æ³×&æ²ç–V%&æ³²2ç'F–6—çG3×&æ²ç–V%'F–6—çG3²2æ6Æ75&æ³×&æ²æ6Æ75&æ³²2æ6Æ75'F–6—çG3×&æ²æ6Æ75'F–6—çG3°¢2ç–V%÷6—F–öåW&6VçCÖçVÖ&W"‡"ç–V%÷6—F–öåW&6VçBÆÆ&VÂ¶æÖR²~[›NKØŞjùBrÃ“²2æ6Æ75÷6—F–öåW&6VçCÖçVÖ&W"‡"æ6Æ75÷6—F–öåW&6VçBÆÆ&VÂ¶æÖR²~xúŞKØŞjùBrÃ“°¢2æW†6ÇVFTg&öÕF÷FÃÖ&ööÂ‡"æW†6ÇVFTg&öÕF÷FÂÆÆ&VÂ¶æÖR²~ŠêXˆnx«nhr“²Rç66÷&W5¶æÖUÓ×3°¢Ò“°¢Æ—7B†W‚æÖöGVÆT–G2ÇÂµÒÂCÂÆ&VÂ²~{¸NYX[>ˆBr’æf÷$V6‚†gVæ7F–öâ†–B’²–b‚ÖöG2æ†2†–B’ÇÂRæÖöGVÆT–G2æ–æ6ÇVFW2†–B’’F‡&÷ræWrW'&÷"†Æ&VÂ²~[É^yJK¨n{Ë®ZKh‰n˜xŞZHŞy¨N{¸NY‚r“²RæÖöGVÆT–G2çW6‚†–B“²Ò“°¢ö&¦V7BæVçG&–W2†ö&¦V7B†W‚æÖöGVÆU&æ·2ÇÂ·ÒÂÆ&VÂ²~{¸NYhé.YÒr’’æf÷$V6‚†gVæ7F–öâ†VçG'’’°¢–b‚RæÖöGVÆT–G2æ–æ6ÇVFW2†VçG'•³Ò’’F‡&÷ræWrW'&÷"†Æ&VÂ²~{¸NYhé.YŞk*iÈX[>ˆN{¸NY‚r“²RæÖöGVÆU&æ·5¶VçG'•³ÕÒÒ&æ·2†VçG'•³ÒÂÆ&VÂ²~{¸NY‚r“°¢Ò“°¢ö&¦V7BæVçG&–W2†ö&¦V7B†W‚æfW&vW2ÇÂ·ÒÂÆ&VÂ²~YØ~Xˆbr’’æf÷$V6‚†gVæ7F–öâ†VçG'’’°¢f"³ÖVçG'•³ÒÂ#Öö&¦V7B†VçG'•³ÒÆÆ&VÂ²~YØ~Xˆbr’Âfs×·Ó°¢–b†²ÓÒwF÷FÂrbb†²ç7F'G5v—F‚‚w3¢r’bb÷vâ†Rç66÷&W2Æ²ç6Æ–6Rƒ"’’’bb†²ç7F'G5v—F‚‚vÓ¢r’bbRæÖöGVÆT–G2æ–æ6ÇVFW2†²ç6Æ–6Rƒ"’’’’F‡&÷ræWrW'&÷"†Æ&VÂ²~YØ~Xˆn[É^yJK¨n{Ë®ZKy¨Nzyyºîh‰n{¸NY‚r“°¢²v6Æ72rÂw–V"uÒæf÷$V6‚†gVæ7F–öâ‡66÷R’²–b†÷vâ‡"Ç66÷R’’fu·66÷UÓÖçVÖ&W"‡%·66÷UÒÆÆ&VÂ²~YØ~Xˆbr“²Ò“°¢–b‡"æ&6—2ÒçVÆÂ’fræ&6—3×7G"‡"æ&6—2ÃSÆÆ&VÂ²~YØ~XˆnXú>[èBr“²RæfW&vW5¶µÓÖfs°¢Ò“°¢ö&¦V7BæVçG&–W2†ö&¦V7B†W‚çVW7F–öå÷G—U÷66÷&W2ÇÂ·ÒÂÆ&VÂ²~š)Yè²r’’æf÷$V6‚†gVæ7F–öâ†VçG'’’°¢–b‚÷vâ†Rç66÷&W2ÆVçG'•³Ò’’F‡&÷ræWrW'&÷"†Æ&VÂ²~š)Yè¾{Ë®[	h˜[îzyyºâr“°¢f"&÷w3ÖÆ—7B†VçG'•³ÒÃÆÆ&VÂ²~š)Yè²r’æÖ†gVæ7F–öâ‡"’°¢ö&¦V7B‡"ÆÆ&VÂ²~š)Yè²r“²f"&÷s×¶æÖS§7G"‡"ææÖRÃCÆÆ&VÂ²~š)Yè¾YŞz{rÇG'VR’Ç66÷&S¦çVÖ&W"‡"ç66÷&RÆÆ&VÂ²~š)Yè¾[é~Xˆbr’ÆÖƒ¦çVÖ&W"‡"æÖ‚ÆÆ&VÂ²~š)Yè¾kºXˆbr—Ó°¢–b‡&÷ræÖƒÓÓÓÇÂ‡&÷rç66÷&RÖçVÆÂbb&÷ræÖ‚ÖçVÆÂbb&÷rç66÷&Sç&÷ræÖ‚’’F‡&÷ræWrW'&÷"†Æ&VÂ²~š)Yè¾[é~Xˆn‹h^‹ø~kºXˆbr“°¢²w÷6—F–öârÂvF–ff–7VÇG’rÂv6W6RrÂw&V6öâuÒæf÷$V6‚†gVæ7F–öâ†²’²–b‡%¶µÒÖçVÆÂ’&÷u¶µÓ×7G"‡%¶µÒÃ#ÆÆ&VÂ²~š)Yè¾j~k:‚r“²Ò“²&WGW&â&÷s°¢Ò“²RçVW7F–öå÷G—U÷66÷&W5¶VçG'•³ÕÓ×&÷w3°¢Ò“°¢÷WBæW†×2çW6‚†R“°¢Ò“°¢–b‡&ræ6FVv÷'’ÒçVÆÂ’°¢ö&¦V7B‡&ræ6FVv÷'’Â~Xˆn{¾Šëî{Úâr“²f"÷F–öç3ÖÆ—7B‡&ræ6FVv÷'’æ÷F–öç2Ã"Â~Xˆn{¾˜š’r’æÖ†gVæ7F–öâ‡2’²&WGW&â7G"‡2Ã#Â~Xˆn{¾˜š’rÇG'VR“²Ò“°¢–b‚÷F–öç2æÆVæwF‚ÇÂæWr6WB†÷F–öç2’ç6—¦RÓÖ÷F–öç2æÆVæwF‚’F‡&÷ræWrW'&÷"‚~Xˆn{¾˜šK‹®z›®h‰n˜xŞZHÒr“°¢÷WBæ6FVv÷'“×¶Æ&VÃ§7G"‡&ræ6FVv÷'’æÆ&VÂÃbÂ~Xˆn{¾YŞz{rÇG'VR’Æ÷F–öç3¦÷F–öç7Ó°¢Ğ¢–b‡&rævöÂÒçVÆÂ’°¢f"sÖö&¦V7B‡&rævöÂÂ~™[şiÉşyºîjrr’ÂvöÇ3×·Ó°¢ö&¦V7BæVçG&–W2†ö&¦V7B†rç7V&¦V7G2ÇÂ·ÒÂ~zyyºîyºîjrr’’æf÷$V6‚†gVæ7F–öâ†VçG'’’²f"æÖS×7G"†VçG'•³ÒÃCÂ~yºîj~zyyºârÇG'VR’ÂãÖçVÖ&W"†VçG'•³ÒÂ~zyyºîyºîjrrÃ“²–b†ãÓÖçVÆÂ—F‡&÷ræWrW'&÷"‚~zyyºîyºîj~KˆŞˆ;ŞK‹®z›¢r“¶vöÇ5¶æÖUÓÖã²Ò“°¢–b„ö&¦V7Bæ¶W—2†vöÇ2’æÆVæwFƒãC’F‡&÷ræWrW'&÷"‚~zyyºîyºîj~‹ø~ZI¢r“°¢÷WBævöÃ×·7V&¦V7G3¦vöÇ2ÇF÷FÄvöÃ¦çVÖ&W"†rçF÷FÄvöÂÂ~h¾Xˆnyºîjrr’Ç66†ööÃ§7G"†rç66†ööÂÃCÂ~ynh;>ZÚnj
r’ÆFFS¦FFR†ræFFRÂ~yºîj~iz^iÉòr’ÆFFTæÖS§7G"†ræFFTæÖRÃ#Â~X	.Šêi{nYŞz{r—Ó°¢Ğ¢ö&¦V7BæVçG&–W2†ö&¦V7B‡&rç'F–6—çDFVfVÇG2ÇÂ·ÒÂ~›¹ŠêNK«®i[r’’æf÷$V6‚†gVæ7F–öâ†VçG'’’°¢f"³ÖVçG'•³ÒÇ#Öö&¦V7B†VçG'•³ÒÂ~›¹ŠêNK«®i[r’Çc×·Ó°¢–b†²ÓÒwF÷FÂrbbõç3¢ç³ÃCÒBòçFW7B†²’bb†²ç7F'G5v—F‚‚vÓ¢r’bfÖöG2æ†2†²ç6Æ–6Rƒ"’’’—F‡&÷ræWrW'&÷"‚~›¹ŠêNK«®i[[É^yJK¨n{Ë®ZKy¨N{¸NY‚r“°¢²v6Æ72rÂw–V"uÒæf÷$V6‚†gVæ7F–öâ‡66÷R’²–b†÷vâ‡"Ç66÷R’—e·66÷UÓÖçVÖ&W"‡%·66÷UÒÂ~›¹ŠêNK«®i[rÃÃÇG'VR“²Ò“¶÷WBç'F–6—çDFVfVÇG5¶µÓ×c°¢Ò“°¢–b„ö&¦V7Bæ¶W—2†÷WBç'F–6—çDFVfVÇG2’æÆVæwFƒã#—F‡&÷ræWrW'&÷"‚~›¹ŠêNK«®i[šyºî‹ø~ZI¢r“°¢&WGW&â÷WC°¢Ğ¢&ö÷Bå66÷&T&6·W×¶æ÷&ÖÆ—¦S¦æ÷&ÖÆ—¦RÆ6æöæ–6Ã¦6æöæ–6ÂÆ–FVçF—G“¦–FVçF—G’ÆÖ„'—FW3£‚£#B£#GÓ°¢–b‡G—VöbÖöGVÆRÓÒwVæFVf–æVBrbfÖöGVÆRæW‡÷'G2–ÖöGVÆRæW‡÷'G3×&ö÷Bå66÷&T&6·W°§Ò’†vÆö&ÅF†—2“° ¢ò¢ÓÓÓÓÒ&6·WÖ–×÷'Bæ§2ÓÓÓÓÒ¢ğ¢†gVæ7F–öâ‚’°¢wW6R7G&–7Bs°¢f"7F—fSÖçVÆÂÆW63ÖgVæ7F–öâ‡b—·&WGW&â7G&–ær‡cÓÖçVÆÃòrs§b’ç&WÆ6R‚õ²cÃâ"uÒörÆgVæ7F–öâ†2—·&WGW&â²rbs¢rf×²rÂsÂs¢rfÇC²rÂsâs¢rfwC²rÂr"s¢rgV÷C²rÂ"r#¢rb33“²wÕ¶5Ó·Ò“·Ó°¢gVæ7F–öâ÷væW"‚—·&WGW&â7G&–ær‡7FFRçW6W"bg7FFRçW6W"æ–GÇÂrr“·Ğ¢gVæ7F–öâG&6²†æÖRÆÖWF—·G'—¶–b‡v–æF÷råõ÷7EG&6²—v–æF÷råõ÷7EG&6²†æÖRÆÖWFÇÇ·Ò“·Ö6F6‚†R—·×Ğ¢gVæ7F–öâ÷Vâ‚—°¢–b†7F—fWÇÂ7FFRçFö¶VçÇÂ÷væW"‚’—&WGW&ã°¢f"÷&–v–ãÖFö7VÖVçBæ7F—fTVÆVÖVçBÆ&÷ƒÖFö7VÖVçBæ7&VFTVÆVÖVçB‚vF—br’Æ×¶&÷ƒ¦&÷‚Æ÷væW#¦÷væW"‚’ÇFö¶Vã§7FFRçFö¶VâÇfW'6–öã£Æ'W7“¦fÇ6RÇ&s¦çVÆÂÇ&Wf–Ws¦çVÆÇÓ¶7F—fSÖ°¢&÷‚æ6Æ74æÖSÒvW‡÷'BÖ÷fW&Æ’×c3&6·WÖ÷fW&Æ’s¶&÷‚æ–CÒv&6·W–×÷'D÷fW&Æ’s°¢&÷‚æ–ææW$…DÔÃÒsÇ6V7F–öâ6Æ73Ò&W‡÷'B×6†VWB×c3&6·W×6†VWB"&öÆSÒ&F–Æör"&–ÖÖöFÃÒ'G'VR"&–ÖÆ&VÆÆVF'“Ò&&6·WF—FÆR"F&–æFWƒÒ"Ó#âp¢²sÆF—b6Æ73Ò&W‡÷'BÖ†VB×c3#ãÆ"–CÒ&&6·WF—FÆR#îZûÎXZ^h.ZHÓÂö#ãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&6Æ÷6RÖ'Fâ"FFÖ&6·WÖ6Æ÷6R&–ÖÆ&VÃÒ.X[>™zÒ#ì9sÂö'WGFöããÂöF—câp¢²sÇ6Æ73Ò&6&B×7V"#î˜hºh‰{º‹Ú‹ûZûÎX{®y¨N8ÎZèÎi[NZH~K»Ş8Ô¥4ôâih~K»nûÈÎXXjZûûÈÎXhŞZûÎXZ^[Ù>X˜Ş‹JnXû~8#Â÷âp¢²sÆÆ&VÂ6Æ73Ò&&6·WÖf–ÆRÖÆ&VÂ#îZH~K»Şih~K»cÆ–çWB–CÒ&&6·Wf–ÆR"G—SÒ&f–ÆR"66WCÒ"æ§6öâÆÆ–6F–öâö§6öâ#ãÂöÆ&VÃâp¢²sÆF—b–CÒ&&6·W7FGW2"&öÆSÒ'7FGW2"&–ÖÆ—fSÒ'öÆ—FR#îiJşhÈiz~x˜ZH~K»ŞûÈÎih~K»nKˆŞ‹h^‹ør‚Ô.8#ÂöF—câp¢²sÆF—b–CÒ&&6·W&Wf–Wr#ãÂöF—câp¢²sÆÆ&VÂ6Æ73Ò&&6·W×6WGF–æw2"†–FFVããÆ–çWBG—SÒ&6†V6¶&÷‚"–CÒ&&6·W6WGF–æw2#îYÎi{nh.ZHŞzyyºîkºXˆn8Xˆn{¾8™[şiÉşyºîj~Y(Î›¹ŠêNXø.ˆ>K«®i[ûÈÎi»şhÚ.[Ù>X˜ŞZû[©NŠëî{ÚãÂöÆ&VÃâp¢²sÇ6Æ73Ò&&6·W×'VÆR#î[{.iÈˆ>Šù^KÉ®KùŞyY8.YÎKˆˆ>Šù^{ÉnXû~ûÈÎh‰nYÎYŞ8YÎiz^iÉş8YÎXˆn{¾K‰Nzyyºîy»YÎy¨Nˆ>Šù^KÉ®‹{>‹ø~ûÈÎKˆŞŠhny¹n[{.iÈh‰{º8.KˆŞYÎ˜zyy¨NYÎYŞ{¸NYKÉ®XˆnXŠ¾KùŞyY8#Â÷âp¢²sÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò'&–Ö'’W‡÷'BÖvò×c3"–CÒ&&6·W6öÖÖ—B"F—6&ÆVCî˜hºZH~K»ŞYîš(NŠxƒÂö'WGFöããÂ÷6V7F–öãâs°¢Fö7VÖVçBæ&öG’æVæD6†–ÆB†&÷‚“°¢f"7FGW3Ö&÷‚çVW'•6VÆV7F÷"‚r6&6·W7FGW2r’ÆvóÖ&÷‚çVW'•6VÆV7F÷"‚r6&6·W6öÖÖ—Br’Æf–ÆSÖ&÷‚çVW'•6VÆV7F÷"‚r6&6·Wf–ÆRr’Ç&Wf–WsÖ&÷‚çVW'•6VÆV7F÷"‚r6&6·W&Wf–Wrr’Ç6WGF–æw3Ö&÷‚çVW'•6VÆV7F÷"‚r6&6·W6WGF–æw2r“°¢gVæ7F–öâfÆ–B‚—·&WGW&â7F—fSÓÓÖbf&÷‚æ—46öææV7FVBbfæ÷væW#ÓÓÖ÷væW"‚’bfçFö¶VãÓÓ×7FFRçFö¶Vã·Ğ¢gVæ7F–öâ7FGW5FW‡B‡FW‡BÆW'&÷"—·7FGW2çFW‡D6öçFVçC×FW‡C·7FGW2æ6Æ74Æ—7BçFövvÆR‚v&6·WÖW'&÷"rÂW'&÷"“·Ğ¢gVæ7F–öâ6Æ÷6R‚—¶–b†æ'W7’—&WGW&ã¶6ÆVçW‚“¶–b†÷&–v–âbf÷&–v–âæ—46öææV7FVB–÷&–v–âæfö7W2‚“·Ğ¢gVæ7F–öâ6ÆVçW‚—¶–b†æ6öçG&öÆÆW"–æ6öçG&öÆÆW"æ&÷'B‚“¶6ÆV$–çFW'fÂ†çvF6‚“¶Fö7VÖVçBç&VÖ÷fTWfVçDÆ—7FVæW"‚v¶W–F÷vârÆ¶W—2“¶&÷‚ç&VÖ÷fR‚“¶–b†7F—fSÓÓÖ–7F—fSÖçVÆÃ·Ğ¢gVæ7F–öâ¶W—2†R—¶–b‚fÆ–B‚’—&WGW&ã¶–b†Ræ¶W“ÓÓÒtW66Rr—¶Rç&WfVçDFVfVÇB‚“¶6Æ÷6R‚“·Ö–b†Ræ¶W“ÓÓÒuF"r—·f"æöFW3Ô'&’æg&öÒ†&÷‚çVW'•6VÆV7F÷$ÆÂ‚v'WGFöã¦æ÷Bƒ¦F—6&ÆVB’Æ–çWC¦æ÷Bƒ¦F—6&ÆVB’Å·F&–æFWƒÒ#%Òr’’æf–ÇFW"†gVæ7F–öâ†â—·&WGW&ââæ6Æ÷6W7B‚u¶†–FFVåÒr“·Ò“·f"f—'7CÖæöFW5³ÒÆÆ7CÖæöFW5¶æöFW2æÆVæwF‚ÓÓ¶–b†Rç6†–gD¶W’bfFö7VÖVçBæ7F—fTVÆVÖVçCÓÓÖf—'7B—¶Rç&WfVçDFVfVÇB‚“¶Æ7Bæfö7W2‚“·ÖVÇ6R–b‚Rç6†–gD¶W’bfFö7VÖVçBæ7F—fTVÆVÖVçCÓÓÖÆ7B—¶Rç&WfVçDFVfVÇB‚“¶f—'7Bæfö7W2‚“·××Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v¶W–F÷vârÆ¶W—2“¶&÷‚çVW'•6VÆV7F÷"‚u¶FFÖ&6·WÖ6Æ÷6UÒr’æöæ6Æ–6³Ö6Æ÷6S°¢çvF6ƒ×6WD–çFW'fÂ†gVæ7F–öâ‚—¶–b‚fÆ–B‚’–6ÆVçW‚“·ÒÃ#S“°¢7–æ2gVæ7F–öâ&WVW7B†7F–öâ—°¢–b‚fÆ–B‚’—F‡&÷ræWrW'&÷"‚~‹JnXû~[{.Xˆ~hÚ.ûÈÎŠû~˜xŞik˜hºZH~K»Òr“°¢f"6öçG&öÆÆW#ÖæWr&÷'D6öçG&öÆÆW"‚“¶æ6öçG&öÆÆW#Ö6öçG&öÆÆW#·f"F–ÖV÷WC×6WEF–ÖV÷WB†gVæ7F–öâ‚—¶6öçG&öÆÆW"æ&÷'B‚“·ÒÃc“°¢G'—°¢f"&W7öç6SÖv—BfWF6‚‚rö’÷66÷&R×G&6¶W"Ö–×÷'BrÇ¶ÖWF†öC¢uõ5BrÆ†VFW'3§²t6öçFVçBÕG—Rs¢vÆ–6F–öâö§6öâwÒÇ6–væÃ¦6öçG&öÆÆW"ç6–væÂÆ&öG“¤¥4ôâç7G&–æv–g’‡¶7F–öã¦7F–öâÇFö¶Vã¦çFö¶VâÆ&6·W¦ç&rÆF–vW7C¦ç&Wf–Wrbfç&Wf–WræF–vW7BÆ6öæf—&ÖVC¦7F–öãÓÓÒv–×÷'BrÇ&W7F÷&U6WGF–æw3§6WGF–æw2æ6†V6¶VGÒ—Ò“°¢f"&W7VÇCÖv—B&W7öç6Ræ§6öâ‚’æ6F6‚†gVæ7F–öâ‚—·&WGW&â¶W'&÷#¢~iÈŞXªY8Ş[©N[È.[‹ûÈÎŠû~˜xŞŠùRwÓ·Ò“°¢–b‚&W7öç6Ræö²—F‡&÷ræWrW'&÷"‡&W7VÇBæW'&÷'ÇÂ~ZûÎXZ^Šû~k.ZK‹JRr“·&WGW&â&W7VÇC°¢Öf–æÆÇ—¶6ÆV%F–ÖV÷WB‡F–ÖV÷WB“·Ğ¢Ğ¢f–ÆRæöæ6†ævSÖ7–æ2gVæ7F–öâ‚—°¢f"fW'6–öãÒ²¶çfW'6–öâÆcÖf–ÆRæf–ÆW2bff–ÆRæf–ÆW5³Ó¶ç&sÖçVÆÃ¶ç&Wf–WsÖçVÆÃ·&Wf–WrçFW‡D6öçFVçCÒrs·6WGF–æw2æ6†V6¶VCÖfÇ6S¶&÷‚çVW'•6VÆV7F÷"‚ræ&6·W×6WGF–æw2r’æ†–FFVã×G'VS¶vòæF—6&ÆVC×G'VS°¢–b‚b—&WGW&â7FGW5FW‡B‚~Šû~˜hºZèÎi[NZH~K»Ò¥4ôâih~K»n8"r“°¢–b†bç6—¦Så66÷&T&6·WæÖ„'—FW2—&WGW&â7FGW5FW‡B‚~ih~K»n‹h^‹ør‚Ô.ûÈÎŠû~hÈXˆn{¾XˆnXŠ¾ZûÎX{®YîZûÎXZ^8"rÇG'VR“°¢vòçFW‡D6öçFVçCÒ~jÚ>YÊjZû(
bs·7FGW5FW‡B‚~jÚ>YÊŠû¾Xùn[›njZûZH~K»ŞûÈÎKˆŞKÉ®KúîiKh‰{º8"r“°¢G'—°¢f"6öçFVçCÖv—BbçFW‡B‚“¶–b‚fÆ–B‚—ÇÇfW'6–öâÓÖçfW'6–öâ—&WGW&ã°¢f"&s·G'—·&sÔ¥4ôâç'6R†6öçFVçBç&WÆ6R‚õåÇTdTdbòÂrr’“·Ö6F6‚†R—·F‡&÷ræWrW'&÷"‚~ih~K»nKˆŞiŠşiÈiXy¨B¥4ôîûÈÎŠû~˜hº8ÎZèÎi[NZH~K»Ş8ŞûÈÄ55bh‰bE…BKˆŞˆ;ŞyJK¨îh.ZHŞ8"r“·Ğ¢f"æ÷&ÖÆ—¦VCÕ66÷&T&6·Wææ÷&ÖÆ—¦R‡&r“¶ç&s×&s°¢f"&W7VÇCÖv—B&WVW7B‚w&Wf–Wrr“¶–b‚fÆ–B‚—ÇÇfW'6–öâÓÖçfW'6–öâ—&WGW&ã¶ç&Wf–Ws×&W7VÇC°¢f"FFW3Öæ÷&ÖÆ—¦VBæW†×2æÖ†gVæ7F–öâ†R—·&WGW&âRæW†ÕöFFS·Ò’ç6÷'B‚“°¢&Wf–Wræ–ææW$…DÔÃÒsÆF—b6Æ73Ò&&6·W×7VÖÖ'’#ãÆF—cãÇ7G&öæsâr·&W7VÇBæFFVB²sÂ÷7G&öæsãÇ7ãî[nikZ)îˆ>ŠùSÂ÷7ããÂöF—cãÆF—cãÇ7G&öæsâr·&W7VÇBç6¶—VB²sÂ÷7G&öæsãÇ7ãî˜xŞZHŞ[n‹{>‹øsÂ÷7ããÂöF—cãÆF—cãÇ7G&öæsâr·&W7VÇBç66÷&W2²sÂ÷7G&öæsãÇ7ãî[nikZ)îh‰{º“Â÷7ããÂöF—cãÂöF—câp¢²sÇ6Æ73Ò&&6·WÖÖWF#îZH~K»Ş‹JnXû~ûÉ¢r¶W62‡&ræ66÷VçGÇÇ&ræ÷&–v–æÅW6W&æÖWÇÂ~iÊ®Šë[ÙRr’²sÆ'#îZûÎXZ^‹JnXû~ûÉ¢r¶W62‡7FFRçW6W"çW6W&æÖWÇÂ~[Ù>X˜Ş‹JnXûrr’²†FFW2æÆVæwFƒòsÆ'#îˆ>Šù^iz^iÉşûÉ¢r¶W62†FFW5³Ò’²rûÙâr¶W62†FFW5¶FFW2æÆVæwF‚ÓÒ“¢rr’²sÂ÷âp¢²sÆFWF–Ç3ãÇ7VÖÖ'“îiú^yÈ¾ZH~K»Şˆ>Šù^ûÈX˜Ò#YË®ûÈ“Â÷7VÖÖ'“ãÇVÃâr¶æ÷&ÖÆ—¦VBæW†×2ç6Æ–6RƒÃ#’æÖ†gVæ7F–öâ†R—·&WGW&âsÆÆ“âr¶W62†RæW†ÕöFFR’²r+rr¶W62†RææÖR’²r+rr´ö&¦V7Bæ¶W—2†Rç66÷&W2’æÆVæwF‚²rzyr²†Ræ—5ö†–FFVãòr+r[{.™©‰xòs¢rr’²sÂöÆ“âs·Ò’æ¦ö–â‚rr’²sÂ÷VÃãÂöFWF–Ç3âp¢²‡&W7VÇBç6¶—VCòsÆFWF–Ç3ãÇ7VÖÖ'“îiú^yÈ¾˜xŞZHŞˆ>Šù^ûÈiÈZI¢YË®ûÈ“Â÷7VÖÖ'“ãÇVÃâr²‡&W7VÇBæGWÆ–6FW7ÇÅµÒ’æÖ†gVæ7F–öâ†R—·&WGW&âsÆÆ“âr¶W62†RæFFR’²r+rr¶W62†RææÖR’²sÂöÆ“âs·Ò’æ¦ö–â‚rr’²sÂ÷VÃãÂöFWF–Ç3âs¢rr“°¢&÷‚çVW'•6VÆV7F÷"‚ræ&6·W×6WGF–æw2r’æ†–FFVãÒ‡&rævöÇÇÇ&ræ6FVv÷'—ÇÇ&rç'F–6—çDFVfVÇG2“°¢7FGW5FW‡B‚~š(NŠxZèÎh‰8.zîŠêNYî[nXiXZ^[Ù>X˜Ş‹JnXû~ûÉ¾XéşiÈh‰{ºKùŞyY8"r“¶vòçFW‡D6öçFVçCÒ~zîŠêNZûÎXZRs¶vòæF—6&ÆVCÖfÇ6S°¢G&6²‚v&6·Wö–×÷'E÷&Wf–WrrÇ¶W†×3¦æ÷&ÖÆ—¦VBæW†×2æÆVæwF‚ÆFFVC§&W7VÇBæFFVBÇ6¶—VC§&W7VÇBç6¶—VGÒ“°¢Ö6F6‚†R—¶–b‚fÆ–B‚—ÇÇfW'6–öâÓÖçfW'6–öâ—&WGW&ã¶ç&sÖçVÆÃ¶ç&Wf–WsÖçVÆÃ·7FGW5FW‡B†RææÖSÓÓÒt&÷'DW'&÷"sò~jZû‹h^i{nûÈÎŠû~˜xŞik˜hºih~K»n8"s¦RæÖW76vRÇG'VR“¶vòçFW‡D6öçFVçCÒ~Šû~˜xŞik˜hºZH~K»Òs·Ğ¢Ó°¢vòæöæ6Æ–6³Ö7–æ2gVæ7F–öâ‚—°¢–b†æFöæR—¶6Æ÷6R‚“·&WGW&ã·Ğ¢–b†æ'W7—ÇÂç&Wf–WwÇÂfÆ–B‚’—&WGW&ã°¢æ'W7“×G'VS¶vòæF—6&ÆVC×G'VS¶f–ÆRæF—6&ÆVC×G'VS·6WGF–æw2æF—6&ÆVC×G'VS¶&÷‚çVW'•6VÆV7F÷"‚u¶FFÖ&6·WÖ6Æ÷6UÒr’æF—6&ÆVC×G'VS¶vòçFW‡D6öçFVçCÒ~jÚ>YÊZûÎXZ^(
bs·7FGW5FW‡B‚~jÚ>YÊKùŞZÙûÈÎŠû~zˆŞX	8"r“°¢G'—°¢f"&W7VÇCÖv—B&WVW7B‚v–×÷'Br“¶–b‚fÆ–B‚’—&WGW&ã¶æFöæS×G'VS°¢G&6²‚v&6·Wö–×÷'EöFöæRrÇ¶FFVC§&W7VÇBæFFVBÇ6¶—VC§&W7VÇBç6¶—VBÇ66÷&W3§&W7VÇBç66÷&W2Ç6WGF–æw3§&W7VÇBç6WGF–æw5&W7F÷&VGÒ“°¢7FGW5FW‡B‚~ZûÎXZ^ZèÎh‰ûÉ®ikZ)âr·&W7VÇBæFFVB²rYË®ˆ>Šù^8r·&W7VÇBç66÷&W2²riÚh‰{ºûÈÎ‹{>‹ørr·&W7VÇBç6¶—VB²rYË®˜xŞZHŞˆ>Šù^8"r“¶vòçFW‡D6öçFVçCÒ~ZèÎh‰s°¢G'—¶v—BÆöDW†×2‚“¶–b‡fÆ–B‚’—&VæFW"‚“·Ö6F6‚†R—¶–b‡fÆ–B‚’—7FGW5FW‡B‚~i[hÚî[{.ZûÎXZ^h‰X©şûÈÎKØnX‰~ŠX‹~ikZK‹J^8.X[>™zŞYîX‹~ikš^™Ú.XÛ>Xúşiú^yÈ¾ûÈÎŠû~X»ş˜xŞZHŞKúîiKih~K»n8"r“·Ğ¢Ö6F6‚†R—¶–b‡fÆ–B‚’—·7FGW5FW‡B‚†RææÖSÓÓÒt&÷'DW'&÷"sò~‹ùîhê^‹h^i{nûÈÎZûÎXZ^Xúşˆ;Ş[{.hùKªN8"s¦RæÖW76vR’²rXúşy»Nhê^˜xŞŠù^ûÈÎ˜xŞZHŞˆ>Šù^KÉ®ˆz®Xª‹{>‹ø~8"rÇG'VR“¶vòçFW‡D6öçFVçCÒ~˜xŞŠù^ZûÎXZRs·G&6²‚v&6·Wö–×÷'Eöf–ÆVBrÇ·Ò“·×Ğ¢f–æÆÇ—¶æ'W7“ÖfÇ6S¶–b‡fÆ–B‚’—¶vòæF—6&ÆVCÖfÇ6S¶&÷‚çVW'•6VÆV7F÷"‚u¶FFÖ&6·WÖ6Æ÷6UÒr’æF—6&ÆVCÖfÇ6S¶–b‚æFöæR—¶f–ÆRæF—6&ÆVCÖfÇ6S·6WGF–æw2æF—6&ÆVCÖfÇ6S·××Ğ¢Ó°¢&÷‚çVW'•6VÆV7F÷"‚ræ&6·W×6†VWBr’æfö7W2‚“·G&6²‚v&6·Wö–×÷'Eö÷VârÇ·Ò“°¢Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆgVæ7F–öâ†R—¶–b†RçF&vWBæ6Æ÷6W7BbfRçF&vWBæ6Æ÷6W7B‚r6–×÷'DFFc3r’–÷Vâ‚“·Ò“°¢f"7G–ÆSÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“·7G–ÆRçFW‡D6öçFVçCÒræ&6·W×6†VWG¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶6öÆ÷#§f"‚Ò×FW‡B“¶÷fW&fÆ÷r×w&¦ç—v†W&WÒæ&6·W×6†VWBæ6&B×7V'¶Æ–æRÖ†V–v‡C£ãcWÒæ&6·WÖf–ÆRÖÆ&VÇ¶F—7Æ“¦w&–C¶v£—ƒ¶föçB×6—¦S£7ƒ¶föçB×vV–v‡C£c¶Ö&v–ã£#‚'‡Òæ&6·WÖf–ÆRÖÆ&VÂ–çWG·v–GFƒ£S¶Ö–â×v–GFƒ£¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶&÷&FW#£‚F6†VBf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£G‚ƒ¶föçC¦–æ†W&—C¶6öÆ÷#§f"‚Ò×FW‡B“¶&6¶w&÷VæC§f"‚ÒÖ6VÆÂÂ6cfc†f2—Ò6&6·W7FGW7¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãcS¶Ö&v–ã£'‚¶6öÆ÷#§f"‚ÒÖ×WFVB—Ò6&6·W7FGW2æ&6·WÖW'&÷'¶6öÆ÷#§f"‚ÒÖFævW"Â63SF#Sr—Òæ&6·W×7VÖÖ'—¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’“¶v£‡ƒ¶Ö&v–ã£‡‚Òæ&6·W×7VÖÖ'“æF—g¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6cc6fb“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æR“¶&÷&FW"×&F—W3£'ƒ·FF–æs£7‚gƒ·FW‡BÖÆ–vã¦6VçFW'Òæ&6·W×7VÖÖ'’7G&öæw¶föçB×6—¦S£#gƒ¶F—7Æ“¦&Æö6³¶Æ–æRÖ†V–v‡C£ã'Òæ&6·W×7VÖÖ'’7ç¶F—7Æ“¦&Æö6³¶föçB×6—¦S£ƒ¶6öÆ÷#§f"‚ÒÖ×WFVB“¶Ö&v–â×F÷£w‡Òæ&6·WÖÖWFÂæ&6·W×'VÆRÂæ&6·W×6†VWBFWF–Ç7¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãsS¶6öÆ÷#§f"‚ÒÖ×WFVB—Òæ&6·W×'VÆW·FF–ær×F÷£'ƒ¶&÷&FW"×F÷£‚6öÆ–Bf"‚ÒÖÆ–æR—Òæ&6·W×6WGF–æw7¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦fÆW‚×7F'C¶v£‡ƒ¶föçB×6—¦S£'ƒ¶Æ–æRÖ†V–v‡C£ãs¶Ö&v–â×F÷£‡‡Òæ&6·W×6WGF–æw5¶†–FFVå×¶F—7Æ“¦æöæWÒæ&6·W×6WGF–æw2–çWG¶Ö&v–â×F÷£Gƒ¶fÆW‚×6‡&–æ³£Òæ&6·W×6†VWB'WGFöã¦F—6&ÆVG¶÷6—G“¢ãSS¶7W'6÷#¦FVfVÇGÒæ&6·W×6†VWBæW‡÷'BÖvò×c3¶Ö–âÖ†V–v‡C£Cg‡Òs¶Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°¢v–æF÷rå66÷&T&6·W–×÷'C×¶÷Vã¦÷VçÓ°§Ò’‚“° ¢ò¢ÓÓÓÓÒ66÷VçBÖw&÷wF‚æ§2ÓÓÓÓÒ¢ğ¢†gVæ7F–öâ‚—°¢wW6R7G&–7Bs°¢f"66†VCÖçVÆÂÆ66†VEFö¶VãÒrrÆÆöFVDCÓÇVæF–æsÖçVÆÃ°¢f"æÖW3×·&V6÷&C¢~Šë[Ù^iÈiXh‰{º’rÇV–6³¢~[ú¾˜	ş[Ù^XZ^YîKùŞZÙ‚rÇG&VæC¢~h‰{º‹h¾X«òrÇ&F#¢~ˆ;ŞX©¾™»~‹ëârÇv÷'Fƒ¢~h‰{ºY
¾˜y˜xòrÇG&¦V7F÷'“¢~‹Ú‹ûXË˜XÒrÆvöÃ¢~Šëî{ÚîyºîjrrÇ&VfÆV7F–öã¢~ˆ>Šù^XøŞh	ÒrÇG—W3¢~š)Yè¾{¹şŠêrÇW#¢~jZûŠù^š)‚rÇ&W÷'C¢~iú^yÈ¾[{.iÈXˆniéhª^Y¢rÆW‡÷'C¢~ZûÎX{®h‰{º’rÆV&æ6S¢~[©NyJZInŠx"rÆfVVF&6³¢~hùKªNXøŞšhh‰nh©^zZ‚rÇÆææW#¢~ZÚnKšŠxNX‰"wÓ°¢gVæ7F–öâW62‡b—·&WGW&â7G&–ær‡cÓÖçVÆÃòrs§b’ç&WÆ6R‚õ²cÃâ"uÒörÆgVæ7F–öâ†2—·&WGW&â²rbs¢rf×²rÂsÂs¢rfÇC²rÂsâs¢rfwC²rÂr"s¢rgV÷C²rÂ"r#¢rb33“²wÕ¶5Ó·Ò“·Ğ¢gVæ7F–öâçVÖ&W"‡b—·&WGW&âÖF‚æÖ‚ƒÄÖF‚æfÆö÷"„çVÖ&W"‡b—ÇÃ’’çFôÆö6ÆU7G&–ær‚“·Ğ¢7–æ2gVæ7F–öâ&WVW7B†7F–öâ—·f"Fö¶Vã×7FFRçFö¶VâÇ#Öv—BfWF6‚‚rö’÷66÷&R×G&6¶W"ÖFFÖ’rÇ¶ÖWF†öC¢uõ5BrÆ†VFW'3§²t6öçFVçBÕG—Rs¢vÆ–6F–öâö§6öâwÒÆ&öG“¤¥4ôâç7G&–æv–g’‡¶7F–öã¦7F–öâÇFö¶Vã§Fö¶VçÒ—Ò“·f"£Öv—B"æ§6öâ‚“¶–b‚"æö²—F‡&÷rW'&÷"†¢æW'&÷'ÇÂ~i¨.i{nizk9^Šû¾Xùbr“¶–b‡Fö¶VâÓ×7FFRçFö¶Vâ—F‡&÷rW'&÷"‚~y›¾[Ù^x«nh[{.XùXÉbr“·&WGW&â£·Ğ¢gVæ7F–öâf–Wr†—°¢f"sÖæw&÷wF‚Æ3Öæ7&VF—G2ÆæW‡CÒ†ræÆWfVÇ7ÇÅµÒ’æf–æB†gVæ7F–öâ†Â—·&WGW&âÂæÆWfVÃÓÓÖræÆWfVÂ³·Ò“°¢f"&WV—&VÖVçG3ÖæW‡Cõ²~h‰™[şXˆbr¶çVÖ&W"†rçö–çG2’²ròr¶çVÖ&W"†æW‡BçF‡&W6†öÆB’ÆæW‡BæÖ–åöF—3ò~k:XhÂr¶rç&Vv—7FW&VEöF—2²ròr¶æW‡BæÖ–åöF—2²rZJ’s¢rrÆæW‡BæÖ–åöÖöçF‡3ò~iÈiXKÛşyJ‚r¶ræ7F—fUöÖöçF‡2²ròr¶æW‡BæÖ–åöÖöçF‡2²rKŠ®iÈ‚s¢rrÂrçfÆ–EöW†×3ò~ˆ{>[	YË®iÈiXˆ>ŠùRs¢ruÒæf–ÇFW"„&ööÆVâ’æ¦ö–â‚r+rr“¢~[{.‹ëîX‹iÈš¹zØ{ªrs°¢f"ÆWfVÅF&ÆSÒsÆF—b6Æ73Ò&r×F&ÆR"F&–æFWƒÒ#"&öÆSÒ'&Vv–öâ"&–ÖÆ&VÃÒ.zØ{ª~Kˆâ’iÈš)Ş[ªb#ãÇF&ÆSãÇF†VCãÇG#ãÇFƒîzØ{ªsÂ÷FƒãÇFƒîh‰™[şXˆcÂ÷FƒãÇFƒîš)ŞZInŠhk#Â÷FƒãÇFƒîiÈzzşXˆcÂ÷FƒãÂ÷G#ãÂ÷F†VCãÇF&öG“âr²†ræÆWfVÇ7ÇÅµÒ’æÖ†gVæ7F–öâ†Â—·&WGW&âsÇG"r²†ÂæÆWfVÃÓÓÖræÆWfVÃòr6Æ73Ò&rÖ7W'&VçB"s¢rr’²sãÇFCäÇbâr¶ÂæÆWfVÂ²sÂ÷FCãÇFCâr¶ÂçF‡&W6†öÆB²sÂ÷FCãÇFCâr¶W62…¶ÂæÆWfVÃãò~iÈiXˆ>ŠùRs¢rrÆÂæÖ–åöF—3öÂæÖ–åöF—2²~ZJ’s¢rrÆÂæÖ–åöÖöçF‡3öÂæÖ–åöÖöçF‡2²~KŠ®iÈiXiÈ‚s¢ruÒæf–ÇFW"„&ööÆVâ’æ¦ö–â‚r+rr—ÇÂ~(	Br’²sÂ÷FCãÇFCâr¶ÂæÖöçF†Ç•ö7&VF—G2²sÂ÷FCãÂ÷G#âs·Ò’æ¦ö–â‚rr’²sÂ÷F&öG“ãÂ÷F&ÆSãÂöF—câs°¢&WGW&âsÆF—b6Æ73Ò&r×7VÖÖ'’#ãÆF—cãÇ7â6Æ73Ò&rÖÆWfVÂ#äÇbâr¶ræÆWfVÂ²sÂ÷7ããÇ7ãîh‰™[şXˆbÆ#âr¶çVÖ&W"†rçö–çG2’²sÂö#ãÂ÷7ããÂöF—cãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&r×&Vg&W6‚#îX‹~ikÂö'WGFöããÂöF—cãÇ6Æ73Ò&r×&öw&W72#âr¶W62‡&WV—&VÖVçG2’²sÂ÷ãÆF—b6Æ73Ò&r×vÆÆWB#ãÆF—cãÆ#âr¶çVÖ&W"†2æf–Æ&ÆR’²sÂö#ãÇ7ãîXúşyJ‚’zzşXˆcÂ÷7ããÂöF—cãÆF—cãÆ#âr¶çVÖ&W"†2æÖöçF†Ç’’²sÂö#ãÇ7ãîjøşiÈXùiKãÂ÷7ããÂöF—câr²†2æ†VÆCòsÆF—cãÆ#âr¶çVÖ&W"†2æ†VÆB’²sÂö#ãÇ7ãîK»¾Xªš(NyY“Â÷7ããÂöF—câs¢rr’²sÂöF—câr°¢‚æVæ&ÆVCòsÇ6Æ73Ò&rÖæ÷FR#î‹JnXû~zØ{ª~Zûh˜iÈ‹JnXû~i‹îzK®ûÉ´’X©şˆ;Şi¨.iÊ®[ÈiKî8#Â÷âs¦æ'VFvWE÷7FGW3ÓÓÒwW6VBsòsÇ6Æ73Ò&rÖæ÷FR#îiÊÎiÈ‚’š(Nzé~KˆŞ‹k>ûÈÎiÊ®hš>zzşXˆcÂ÷âs¢rr’°¢sÆFWF–Ç3ãÇ7VÖÖ'“îzzşXˆnhîK˜yJƒÂ÷7VÖÖ'“ãÆF—b6Æ73Ò&r×'VÆW2#ãÇãÆ#îhÈZéî™˜^yJ˜xşhš>XˆnûÈÎZK‹J^KˆŞhš>8#Âö#îh˜¾XªjZûKˆîKùŞZÙXXŞ‹K8#Â÷ãÆF—b6Æ73Ò&r×F&ÆR#ãÇF&ÆR&–ÖÆ&VÃÒ.ŠønXŠ¾˜šKˆî[ÈZx¾h˜™ÈzzşXˆb#ãÇF†VCãÇG#ãÇFƒîX©şˆ;Òòš^™Ú.˜š“Â÷FƒãÇFƒî[ÈZx¾™ÈXúşyJzzşXˆcÂ÷FƒãÂ÷G#ãÂ÷F†VCãÇF&öG“ãÇG#ãÇFCîh‰{ºY»îx˜~ŠønXŠ³Â÷FCãÇFCã2XˆnûÈ˜	®[‹{ªb2XˆbòjÊûÈ“Â÷FCãÂ÷G#ãÇG#ãÇFCîŠù^š)ŠønXŠ²+rK¸^Kˆ®KÊš)yºãÂ÷FCãÇFCãSXˆcÂ÷FCãÂ÷G#ãÇG#ãÇFCîŠù^š)ŠønXŠ²+rXiYÊŠù^XÛ~Kˆ£Â÷FCãÇFCãCXˆcÂ÷FCãÂ÷G#ãÇG#ãÇFCîŠù^š)ŠønXŠ²+rYÊzÙNš)XÚKˆ£Â÷FCãÇFCãCXˆcÂ÷FCãÂ÷G#ãÂ÷F&öG“ãÂ÷F&ÆSãÂöF—cãÇîŠKŠŞiŠş[ÈZx¾h˜™ÈKÙš)ŞûÈÎ[›n™ÙîY»®Zé®‹KyJ8.hùKªNi{nš(NyY˜:XˆnzzşXˆnûÈÎZèÎh‰Yî˜x®iKîKÙ˜xş8.Šù^XÛ~Xˆniéi¨.iÊ®[ÈiKî8#Â÷ãÇîšinjÊ‹Z˜Æ#âr¶çVÖ&W"†2çvVÆ6öÖR’²sÂö#âXˆnûÉ´Çbã"‹[~jøşiÈˆz®XªXùiKîûÈÎXØ~{ª~Š^[zî8.Xúş{Jşzzşˆ{2Æ#âr¶çVÖ&W"†2æ6’²sÂö#âXˆn8#Â÷ãÂöF—cãÂöFWF–Ç3âr°¢sÆFWF–Ç3ãÇ7VÖÖ'“îZh.KÙ^XØ~{ªsÂ÷7VÖÖ'“ãÆF—b6Æ73Ò&r×'VÆW2#ãÇVÃãÆÆ“îšinjÊiÈiXKÙ>š¨ÎûÉ®hÈX©şˆ;ŞXªXˆcÂöÆ“ãÆÆ“îiÈiXKÛşyJiÈûÉ£Æ#â³cÂö#îûÈÎiz™ÈjøşZJzÛîX‹ÂöÆ“ãÆÆ“îKˆŞYÎiz^iÉşy¨NiÈiXˆ>Šù^ûÉ®jøşYË¢Æ#â³#Âö#îûÈÎjøşiÈiÈZI¢2YË£ÂöÆ“ãÆÆ“î{¹>Yˆ>Šù^iú^yÈ¾‹h¾X«ş8™»~‹ëî8Y
¾˜y˜xşh‰nXË˜XŞûÉ®jøşYË®jøşiÈiÈZI¢Æ#â³Âö#îûÈÎXZ‹JnXû~jøşiÈiÈZI¢Æ#â³#Âö#ãÂöÆ“ãÂ÷VÃãÇî˜xŞZHŞx+X{¾KˆŞXªXˆnûÈÎzØ{ª~{JşŠêKùŞyY8#Â÷ãÆFWF–Ç3ãÇ7VÖÖ'“ã"{ª~™zjy¾KˆîiÈš)Ş[ªcÂ÷7VÖÖ'“âr¶ÆWfVÅF&ÆR²sÂöFWF–Ç3ãÆFWF–Ç3ãÇ7VÖÖ'“îšinjÊKÙ>š¨Îh‰™[şXˆcÂ÷7VÖÖ'“ãÆF—b6Æ73Ò&rÖfVGW&W2#âr²†ræfVGW&W7ÇÅµÒ’æf–ÇFW"†gVæ7F–öâ†b—·&WGW&âbæfVGW&RÓÒwÆææW"s·Ò’æÖ†gVæ7F–öâ†b—·&WGW&âsÇ7ãâr¶W62†æÖW5¶bæfVGW&U×ÇÆbæfVGW&R’²rÆ#â²r¶bçö–çG2²sÂö#âr²†bæV&æVCò~[{.ˆë~[érs¢rr’²sÂ÷7ãâs·Ò’æ¦ö–â‚rr’²sÂöF—cãÇîXènXû.K¸^hÈ[{.KùŞZÙy¨NiÈiXŠë[Ù^Š^Šë8#Â÷ãÂöFWF–Ç3ãÂöF—cãÂöFWF–Ç3ãÆ'WGFöâG—SÒ&'WGFöâ"6Æ73Ò&r×W6vR#îiÈ‹ù’yJ˜xóÂö'WGFöããÆF—b6Æ73Ò&rÖ†—7F÷'’"&–ÖÆ—fSÒ'öÆ—FR#ãÂöF—câs°¢Ğ¢gVæ7F–öâ–çB‚—·f"†÷7CÖFö7VÖVçBævWDVÆVÖVçD'”–B‚v66÷VçDw&÷wF‚r“¶–b‚†÷7GÇÆ66†VEFö¶VâÓ×7FFRçFö¶VçÇÂ66†VB—&WGW&ã¶†÷7Bæ–ææW$…DÔÃ×f–Wr†66†VB“¶†÷7BçVW'•6VÆV7F÷"‚rær×&Vg&W6‚r’æöæ6Æ–6³ÖgVæ7F–öâ‚—¶ÆöB‡G'VR“·Ó¶†÷7BçVW'•6VÆV7F÷"‚rær×W6vRr’æöæ6Æ–6³Ö7–æ2gVæ7F–öâ‚—·f"&÷ƒÖ†÷7BçVW'•6VÆV7F÷"‚rærÖ†—7F÷'’r“·F†—2æF—6&ÆVC×G'VS·G'—·f"£Öv—B&WVW7B‚v66÷VçE÷W6vRr“¶–b‚†÷7Bæ—46öææV7FVB—&WGW&ã¶&÷‚æ–ææW$…DÔÃÒ†¢çW6vWÇÅµÒ’æÖ†gVæ7F–öâ‡"—·f"fVGW&S×·f—6–öã¢~h‰{ºŠønY»ârÇW%öVçG'“¢~Šù^š)ŠønXŠ²rÇ&ö&S¢~‹ùîhê^kX¾ŠùRrÆFÖ–å÷FW7C¢~jŠYè¾kX¾ŠùRwÕ·"æfVGW&U×ÇÂt’‹>yJ‚s·&WGW&âsÇâr¶W62†fVGW&R’²r+rr¶W62†æWrFFR‡"æ7&VFVEöB’çFôÆö6ÆU7G&–ær‚’’²r+rr¶çVÖ&W"‡"æ6†&vVEö7&VF—G2’²rXˆb+rr¶W62‡¶7F—fS¢~‹ù¾ŠÎKŠÒrÇ7V66VVFVC¢~[{.ZèÎh‰rÆf–ÆVC¢~ZK‹J^iÊ®hš>XˆbrÆW‡—&VC¢~[{.˜x®iKîš(NyY’wÕ·"ç7FGW5×ÇÇ"ç7FGW2’²sÂ÷âs·Ò’æ¦ö–â‚rr—ÇÂsÇîi¨.iz’KÛşyJŠë[ÙSÂ÷âs·Ö6F6‚†R—¶&÷‚çFW‡D6öçFVçCÖRæÖW76vS·Öf–æÆÇ—·F†—2æF—6&ÆVCÖfÇ6S·×Ó·Ğ¢7–æ2gVæ7F–öâÆöB†f÷&6R—°¢–b‚7FFRçFö¶Vâ—&WGW&ã·f"Fö¶Vã×7FFRçFö¶VâÆ†÷7CÖFö7VÖVçBævWDVÆVÖVçD'”–B‚v66÷VçDw&÷wF‚r“°¢–b‚f÷&6Rbf66†VEFö¶VãÓÓ×Fö¶Vâbf66†VBbdFFRææ÷r‚’ÖÆöFVDCÃ3—·–çB‚“·&WGW&ã·Ğ¢–b‡VæF–ærbgVæF–ærçFö¶VãÓÓ×Fö¶Vâ—&WGW&âVæF–ærç&öÖ—6S°¢–b††÷7Bbb66†VB–†÷7BçFW‡D6öçFVçCÒ~jÚ>YÊŠû¾XùnzØ{ª~Kˆâ’zzşXˆn(
bs°¢f"&öÖ—6SÒ†7–æ2gVæ7F–öâ‚—·G'—·f"£Öv—B&WVW7B‚v66÷VçE÷7FGW2r“¶–b‡7FFRçFö¶VâÓ×Fö¶Vâ—&WGW&ã¶66†VCÖ¢æ66÷VçC¶66†VEFö¶Vã×Fö¶Vã¶ÆöFVDCÔFFRææ÷r‚“·–çB‚“·Ö6F6‚†R—¶–b††÷7Bbf†÷7Bæ—46öææV7FVBbg7FFRçFö¶VãÓÓ×Fö¶Vâ—¶†÷7BçFW‡D6öçFVçCÒ~zØ{ª~Kˆâ’zzşXˆni¨.KˆŞXúşyJ8"s·f"#ÖFö7VÖVçBæ7&VFTVÆVÖVçB‚v'WGFöâr“¶"çG—SÒv'WGFöâs¶"æ6Æ74æÖSÒvr×&Vg&W6‚s¶"çFW‡D6öçFVçCÒ~˜xŞŠùRs¶"æöæ6Æ–6³ÖgVæ7F–öâ‚—¶ÆöB‡G'VR“·Ó¶†÷7BæVæD6†–ÆB†"“·×Öf–æÆÇ—¶–b‡VæF–ærbgVæF–ærçFö¶VãÓÓ×Fö¶Vâ—VæF–æsÖçVÆÃ·×Ò’‚“·VæF–æs×·Fö¶Vã§Fö¶VâÇ&öÖ—6S§&öÖ—6WÓ·&WGW&â&öÖ—6S°¢Ğ¢f"öÆD66÷VçCÖ66÷VçD‡FÖÃ¶66÷VçD‡FÖÃÖgVæ7F–öâ‚—·f"‡FÖÃÖöÆD66÷VçB‚“¶–b‚7FFRçFö¶Vâ—&WGW&â‡FÖÃ·f"&Æö6³ÒsÇ6V7F–öâ6Æ73Ò&66÷VçBÖw&÷wF‚"–CÒ&66÷VçDw&÷wF‚"&–ÖÆ&VÃÒ.‹JnXû~zØ{ª~ûÈh˜iÈ‹JnXû~ûÈKˆâ’zzşXˆb"&–ÖÆ—fSÒ'öÆ—FR#îjÚ>YÊŠû¾Xùn‹JnXû~zØ{ª~Kˆâ’zzşXˆn(
cÂ÷6V7F–öãâs·&WGW&â‡FÖÂç&WÆ6R‚sÆF—b6Æ73Ò'W6W&æÖRÖ÷&–v–â×c’"rÆ&Æö6²²sÆF—b6Æ73Ò'W6W&æÖRÖ÷&–v–â×c’"r“·Ó°¢f"öÆD&–æCÖ&–æEvS¶&–æEvSÖgVæ7F–öâ‚—·f"&W7VÇCÖöÆD&–æBæÇ’‡F†—2Æ&wVÖVçG2“¶–b‡7FFRçvSÓÓÒv66÷VçBr–ÆöB†fÇ6R“·&WGW&â&W7VÇC·Ó°¢–b‡G—VöbFF•csÓÓÒvgVæ7F–öâr—·f"öÆD“ÖFF•cs¶FF•csÖ7–æ2gVæ7F–öâ†7F–öâÇ–ÆöB—¶–b†7F–öãÓÓÒw6fUöW†Òrbg7FFRæÖöFÂbg7FFRæÖöFÂæFF6WBbg7FFRæÖöFÂæFF6WBçV–6´VçG'”Æ–VB—–ÆöCÔö&¦V7Bæ76–vâ‡·ÒÇ–ÆöBÇ·V–6µöVçG'“§G'VWÒ“·f"#Öv—BöÆD’æ6ÆÂ‡F†—2Æ7F–öâÇ–ÆöB“¶–b‚õç6fU÷Åæ–×÷'BòçFW7B†7F–öâ’—¶ÆöFVDCÓ¶66†VCÖçVÆÃ·×&WGW&â#·Ó·Ğ¢v–æF÷rå66÷&T66÷VçD&VæVf—G3×·&Vg&W6ƒ¦gVæ7F–öâ‚—·&WGW&âÆöB‡G'VR“·ÒÆ–çfÆ–FFS¦gVæ7F–öâ‚—¶66†VCÖçVÆÃ¶ÆöFVDCÓ·×Ó°¢f"7G–ÆSÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w7G–ÆRr“·7G–ÆRçFW‡D6öçFVçCÒræ66÷VçBÖw&÷wF‡¶Ö&v–ã£'‚‡ƒ·FF–æs£gƒ¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æRÂ6S&S†c“¶&÷&FW"×&F—W3£Gƒ¶&6¶w&÷VæC§f"‚Ò×æVÂ×6öÆ–BÂ6ffb“¶föçB×6—¦S£7ƒ¶Æ–æRÖ†V–v‡C£ãs¶Ö‚×v–GFƒ£S¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷ƒ¶Ö–â×v–GFƒ£·FW‡BÖÆ–vã¦ÆVgGÒær×7VÖÖ'’Âær×7VÖÖ'“æF—g¶F—7Æ“¦fÆWƒ¶Æ–vâÖ—FV×3¦6VçFW#¶v£'ƒ¶fÆW‚×w&§w&Òær×7VÖÖ'—¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVçÒærÖÆWfVÇ¶föçB×6—¦S£Wƒ¶föçB×vV–v‡C£sS¶6öÆ÷#§f"‚ÒÖ66VçBÂ3S#c–C‚“¶&6¶w&÷VæC§f"‚ÒÖ66VçB×6ögBÂ6VFcfb“¶&÷&FW"×&F—W3£‡ƒ·FF–æs£'‚‡Òær×&öw&W72ÂærÖæ÷FW¶6öÆ÷#§f"‚ÒÖ×WFVBÂ3cƒs3ƒb“¶föçB×6—¦S£'ƒ¶Ö&v–ã£‚Òær×vÆÆWG¶F—7Æ“¦fÆWƒ¶v£#Gƒ¶fÆW‚×w&§w&¶Ö&v–ã£G‚Òær×vÆÆWCæF—g¶F—7Æ“¦fÆWƒ¶fÆW‚ÖF—&V7F–öã¦6öÇVÖçÒær×vÆÆWB'¶föçB×6—¦S£#Gƒ¶Æ–æRÖ†V–v‡C£ã'Òær×vÆÆWB7ç¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVBÂ3cƒs3ƒb“¶Ö&v–â×F÷£W‡Òæ66÷VçBÖw&÷wF‚7VÖÖ'—¶7W'6÷#§ö–çFW#¶6öÆ÷#§f"‚ÒÖ66VçBÂ3S#c–C‚“·FF–æs£w‚Òær×'VÆW7·FF–ær×F÷£G‡Òær×'VÆW2¶föçB×6—¦S£'ƒ¶6öÆ÷#§f"‚ÒÖ×WFVBÂ3cƒs3ƒb“¶Ö&v–ã£‡‚Òær×F&ÆW·v–GFƒ£S¶÷fW&fÆ÷s¦WF÷Òær×F&ÆRF&ÆW¶&÷&FW"Ö6öÆÆ6S¦6öÆÆ6S·v–GFƒ£S¶föçB×6—¦S£'‡Òær×F&ÆRF‚Âær×F&ÆRFG·FW‡BÖÆ–vã¦ÆVgC·FF–æs£‡‚Wƒ¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æRÂ6S&S†c—ÒærÖ7W'&VçG¶6öÆ÷#§f"‚ÒÖ66VçBÂ3S#c–C‚“¶föçB×vV–v‡C£cSÒærÖfVGW&W7¶F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3§&WVBƒ"ÆÖ–æÖ‚ƒÃg"’“¶v£‡‡ÒærÖfVGW&W27ç·FF–æs£gƒ¶&6¶w&÷VæC§f"‚Ò×6ögBÂ6cvc†f"“¶&÷&FW"×&F—W3£gƒ¶föçB×6—¦S£'‡Òær×&Vg&W6‚Âær×W6vW¶föçC¦–æ†W&—C·FF–æs£g‚ƒ¶6öÆ÷#§f"‚ÒÖ66VçBÂ3S#c–C‚“¶&÷&FW#£‚6öÆ–Bf"‚ÒÖÆ–æRÂ6S&S†c“¶&÷&FW"×&F—W3£‡ƒ¶&6¶w&÷VæC§G&ç7&VçC¶7W'6÷#§ö–çFW#¶Ö–âÖ†V–v‡C£3g‡Òær×W6vW¶Ö&v–â×F÷£'‡ÒærÖ†—7F÷'’¶&÷&FW"Ö&÷GFöÓ£‚6öÆ–Bf"‚ÒÖÆ–æRÂ6S&S†c“·FF–æs£‡‚¶÷fW&fÆ÷r×w&¦ç—v†W&WÔÖVF–†Ö‚×v–GFƒ£C#‚—²æ66÷VçBÖw&÷wF‡·FF–æs£'‡ÒærÖfVGW&W7¶w&–B×FV×ÆFRÖ6öÇVÖç3£g'Òær×F&ÆRF‚Âær×F&ÆRFG·FF–æs£w‚7‡×Òs¶Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ò’‚“°