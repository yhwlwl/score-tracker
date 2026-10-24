Warning: truncated output (original token count: 265178)
... 12133 bytes omitted ...

/*! app-bundle.js · 自动生成,勿手改 —— 改源码后运行: node design/build-bundles.js
   来源顺序: compat.js, request-budget-v24.js, telemetry-feedback.js, feedback-statuses.js, app-v3.js, app-v4.js, app-v5.js, app-v6.js, app-v7.js, app-v8.js, app-v9.js, app-v10.js, app-v11.js, feedback-unread-dot.js, app-v12.js, app-v13.js, app-v14.js, app-v15.js, app-v16.js, app-v17.js, app-v18.js, app-v19.js, app-v20.js, app-v21.js, app-v22.js, app-v23.js, app-v24.js, app-v25.js, app-v26.js, app-v27.js, app-v28.js, app-v29.js, app-v30.js, app-v31.js, app-v32.js, app-v33.js, app-v34.js, app-v35.js, score-worth-model.js, score-worth.js, release-notices.js, account-recovery.js, trajectory-forecast.js, similar-trajectories.js, school-settings.js, announcement-settings.js, author-support.js, community.js, participant-defaults.js, exam-averages.js, exam-detail.js */
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
  const names=new Set();for(const[name,row]of Object.entries(exam.scores||{})){if(!name||name.length>40)return'科目名称不能为空且不能超过 40 个字符';if(names.has(name))return`科目「${name}」重复了`;names.add(name);const max=num(row.max)??defaultMax(name),target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??totalParticipants;if(!Number.isFinite(max)||max<=0)return`${name} 的满分必须大于 0`;if(target!==null&&target>max)return`${name} 的目标成绩不能超过满分 ${formatScore(max)}`;if(raw!==null&&raw>max)return`${name} 的原始分不能超过满分 ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name} 的赋分/最终分不能超过满分 ${formatScore(max)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}排名请输入正整数`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}参考人数请输入正整数`;if(rank!==null&&effective!==null&&rank>effective)return`${name}排名不能大于参考人数`;}
  return'';
};

saveExam = async function saveExamV13(id, modal) {
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV13',modal)?.value||'',total_rank:$('#totalRankV13',modal)?.value||'',total_participants:$('#totalParticipantsV13',modal)?.value||'',is_hidden:$('#examHiddenV13',modal)?.value==='1',scores:{}};
  const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:$('.target-v13',card).value,raw:$('.raw-v13',card).value,actual:$('.actual-v13',card).value,max:$('.max-v13',card).value,rank:$('.rank-v13',card).value,participants:$('.participants-v13',card).value};}
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='保存中…';
  try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(error){toast(error.message);btn.disabled=false;btn.textContent=id?'保存修改':'保存考试';}
};

recordHtml = function recordHtmlV13(exam) {
  const subjects=Object.keys(exam.scores||{}),rank=rankInfoV7(exam,'总分');
  const finalValues=subjects.map((s)=>examScore(exam,s,'actual')).filter((v)=>v!==null),finalTotal=finalValues.length?finalValues.reduce((a,b)=>a+b,0):null,rawTotal=totalRawForV13(exam);
  return `<div class="record ${exam.is_hidden?'hidden-record-v10':''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}<span class="grade-badge-v13">${escapeHtml(gradeLabelV13(exam))}</span>${exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':''}</b></div><div class="record-scores">${subjects.map((subject)=>{const row=exam.scores[subject]||{},a=num(row.actual),raw=num(row.raw),t=num(row.target),r=num(row.rank),n=num(row.participants)??num(exam.total_participants);if(a===null&&raw===null&&t===null&&r===null)return'';return `<span class="score-tag">${escapeHtml(subject)} ${a===null?'—':formatScore(a)}${raw!==null?`<span class="raw-final-inline-v13"> · 原始 <b>${formatScore(raw)}</b></span>`:''}<span style="color:#a1a9b5"> / 目标 ${t===null?'—':formatScore(t)}</span>${r===null?'':`<span style="color:#667085"> · 第${r}${n?`/${n}`:''}</span>`}</span>`;}).join('')||'<span class="score-tag">尚未填写分数或排名</span>'}<span class="score-tag"><b>赋分总分 ${finalTotal===null?'—':formatScore(finalTotal)}</b>${rawTotal!==null?` · 原始总分 ${formatScore(rawTotal)}`:''}</span>${rank.rank!==null?`<span class="score-tag"><b>总排名 ${rank.rank}${rank.participants?` / ${rank.participants}`:''}</b>${rank.performance!==null?` · ${formatPercent(rank.performance)}`:''}</span>`:''}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">编辑</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden?'恢复显示':'隐藏'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">删除</button></div></div>`;
};

recordsHtml = function recordsHtmlV13() {
  const exams=state.allExams||[],hiddenCount=exams.filter((exam)=>exam.is_hidden).length;
  const groups=[...GRADE_LEVELS_V13,'未分类'].map((grade)=>({grade,exams:exams.filter((exam)=>grade==='未分类'?!exam.grade_level:exam.grade_level===grade)})).filter((group)=>group.exams.length);
  return `<div class="page-head"><div><h2>考试记录</h2><p>按高一、高二、高三分类整理；每次考试仍可拥有自己的科目。${hiddenCount?` 当前有 ${hiddenCount} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map((group)=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${group.grade}</h3><span>${group.exams.length} 次考试</span></div><div class="card records-card">${group.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;
};

const bindPageBeforeV13 = bindPage;
bindPage = function bindPageV13() {
  bindPageBeforeV13();
  $$('[data-grade-filter-v13]').forEach((button)=>button.onclick=()=>{state.gradeFilter=button.dataset.gradeFilterV13;state.radarSelection=[];applyGradeFilterV13();render();});
  $$('[data-score-basis-v13]').forEach((button)=>button.onclick=()=>{state.scoreBasis=button.dataset.scoreBasisV13;render();});
};

const renderLoginBeforeV13 = renderLogin;
renderLogin = function renderLoginV13(error='') { renderLoginBeforeV13(error); const help=$('.auth-help'); if(help) help.textContent='支持每次考试自由增减科目、原始分/赋分、名次/百分位，以及高一高二高三分类。'; };

/* ===== app-v14.js ===== */
// v14: customizable exam categories + separate raw/final full marks, kept intentionally simple
state.classification = state.classification || { label: '年级', options: ['高一', '高二', '高三'] };

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
function categoryLabelV14(){ return String(state.classification?.label||'分类').trim() || '分类'; }
function rawMaxV14(exam,subject){ const row=exam?.scores?.[subject]||{}; return num(row.rawMax) ?? num(row.max) ?? defaultMax(subject); }
rawScoreRateV13=function rawScoreRateV14(exam,subject){ const score=examRawScoreV13(exam,subject),max=rawMaxV14(exam,subject); return score===null||!max?null:Math.max(0,Math.min(100,score/max*100)); };
totalRawMaxV13=function totalRawMaxV14(exam){ const names=Object.keys(exam?.scores||{});let sum=0,count=0;names.forEach(subject=>{const value=examRawScoreV13(exam,subject);if(value!==null){sum+=rawMaxV14(exam,subject);count++;}});return count?sum:null; };

applyGradeFilterV13=function applyCategoryFilterV14(){
  const source=state.unfilteredVisibleExamsV13||[];
  state.exams=state.gradeFilter==='全部'?[...source]:state.gradeFilter==='未分类'?source.filter(e=>!e.grade_level):source.filter(e=>e.grade_level===state.gradeFilter);
  if(typeof applyExamSubjectsV10==='function') applyExamSubjectsV10(state.exams,state.subjectConfigs||[]);
  state.radarSelection=(state.radarSelection||[]).filter(id=>state.exams.some(e=>e.id===id)); ensureRadarSelection();
};

loadExams=async function loadExamsV14(){
  const data=await dataApiV7('list_exams');
  state.allExams=data.exams||[]; state.subjectConfigs=data.subjects||[];
  state.classification=data.classification||state.classification||{label:'年级',options:['高一','高二','高三']};
  state.unfilteredVisibleExamsV13=state.allExams.filter(e=>!e.is_hidden);
  if(state.gradeFilter!=='全部'&&state.gradeFilter!=='未分类'&&!categoryOptionsV14().includes(state.gradeFilter)) state.gradeFilter='全部';
  applyGradeFilterV13();
};

const homeHtmlBeforeV14=homeHtml;
homeHtml=function homeHtmlV14(){
  let html=homeHtmlBeforeV14();
  const opts=categoryOptionsV14();
  const bar=`<div class="grade-filter-v13"><span class="label">${escapeHtml(categoryLabelV14())}</span>${['全部',...opts,'未分类'].map(v=>`<button class="grade-chip-v13 ${state.gradeFilter===v?'active':''}" data-grade-filter-v13="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join('')}</div>`;
  html=html.replace(/<div class="grade-filter-v13">[\s\S]*?<\/div><section class="grid-main">/,`${bar}<section class="grid-main">`);
  return html;
};

accountHtml=function accountHtmlV14(){
  const c=state.classification||{label:'年级',options:['高一','高二','高三']};
  return `<div class="page-head"><div><h2>账号</h2><p>账号与少量偏好设置。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><div class="account-chip"><code>${escapeHtml(state.user?.username||'')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username||'')}">复制</button></div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">考试与成绩保存在云端并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div><div class="card category-settings-v14"><div class="category-head-v14"><div><h3 class="card-title">考试分类</h3><p class="card-sub">只保留一个分类维度，名称和选项都可以自定义，例如“年级：高一/高二/高三”或“阶段：一轮/二轮/冲刺”。</p></div><button class="secondary" id="manageCategoriesV14">设置</button></div><div class="category-chips-v14"><span class="category-chip-v14"><b>${escapeHtml(c.label||'分类')}</b></span>${(c.options||[]).map(v=>`<span class="category-chip-v14">${escapeHtml(v)}</span>`).join('')}</div></div>`;
};

function openCategoryManagerV14(){
  const draft={label:categoryLabelV14(),options:[...(state.classification?.options||['高一','高二','高三'])]};
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>考试分类设置</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="field"><label>分类名称</label><input class="category-label-v14" id="categoryLabelV14" maxlength="16" value="${escapeHtml(draft.label)}" placeholder="例如：年级 / 阶段 / 学期"></div><div class="category-list-v14" id="categoryListV14"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addCategoryV14">＋ 添加选项</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveCategoryV14">保存</button></div></div><p class="form-note">修改分类设置不会改动历史考试已有的分类值，避免误改旧数据；历史分类仍会正常显示。</p></div></div>`;document.body.appendChild(modal);state.modal=modal;
  const list=$('#categoryListV14',modal);const renderRows=()=>{list.innerHTML=draft.options.map(v=>`<div class="category-row-v14"><input maxlength="20" value="${escapeHtml(v)}" placeholder="分类选项"><button type="button">×</button></div>`).join('');$$('.category-row-v14 button',list).forEach((b,i)=>b.onclick=()=>{if(draft.options.length<=1)return toast('至少保留 1 个分类');sync();draft.options.splice(i,1);renderRows();});};
  const sync=()=>{draft.options=$$('.category-row-v14 input',list).map(i=>i.value.trim());}; renderRows();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  $('#addCategoryV14',modal).onclick=()=>{sync();if(draft.options.length>=12)return toast('最多 12 个分类');draft.options.push('');renderRows();$('.category-row-v14:last-child input',list)?.focus();};
  $('#saveCategoryV14',modal).onclick=async()=>{sync();draft.label=$('#categoryLabelV14',modal).value.trim();if(!draft.label)return toast('请填写分类名称');if(draft.options.some(v=>!v))return toast('请填写完整的分类选项');if(new Set(draft.options).size!==draft.options.length)return toast('分类名称不能重复');const btn=$('#saveCategoryV14',modal);btn.disabled=true;btn.textContent='保存中…';try{const data=await dataApiV7('save_classification',{classification:draft});state.classification=data.classification;close();render();toast('分类设置已保存');}catch(e){toast(e.message);btn.disabled=false;btn.textContent='保存';}};
}

function seedRowsV14(exam){
  if(exam)return Object.entries(exam.scores||{}).map(([name,row])=>({name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??''}));
  const last=state.exams.at(-1)||state.unfilteredVisibleExamsV13.at(-1);if(last&&Object.keys(last.scores||{}).length)return Object.entries(last.scores).map(([name,row])=>({name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:''}));
  const templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(name=>({name,defaultMax:defaultMax(name)}));return templates.map(item=>({name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:''}));
}

openExam=function openExamV14(exam=null){
  const editing=!!exam,today=new Date().toISOString().slice(0,10),rows=seedRowsV14(exam),options=categoryOptionsV14(),selected=exam?.grade_level||(!editing?(state.unfilteredVisibleExamsV13.at(-1)?.grade_level||''):'');
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">未分类</option>${options.map(v=>`<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div></div><div class="section-head-v7"><div><h4>本次考试科目</h4><p>原始分和赋分/最终分使用各自的满分；例如上海小科可填“原始 85 / 100，赋分 61 / 70”。</p></div></div><div class="exam-subjects-v10" id="examSubjectsV14"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV14">＋ 添加科目 / 模块</button></div><div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV14">—</b></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV14">—</b></div></div><div class="section-head-v7"><div><h4>总排名（可选）</h4></div></div><div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span>总分</span><input id="totalRankV14" inputmode="numeric" value="${exam?.total_rank??''}"><input id="totalParticipantsV14" inputmode="numeric" value="${exam?.total_participants??''}"></div></div><div class="visibility-box-v10"><div><b>图表显示</b><span>${exam?.is_hidden?'已隐藏，不参与图表。':'正常参与图表。'}</span></div><button class="secondary" id="toggleHiddenV14">${exam?.is_hidden?'恢复显示':'隐藏'}</button><input type="hidden" id="examHiddenV14" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV14">删除这次考试</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV14',modal);
  const sync=()=>{const next=$$('.exam-subject-card-v10',list).map(card=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value}));rows.splice(0,rows.length,...next);};
  const totals=()=>{sync();$('#rawTotalV14',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV14',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const card=row=>`<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v14" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>最终分（赋分后）<span class="score-entry-tip-v16">无赋分也填这里</span></label><div class="score-with-max-v14"><input class="actual-v14" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v14" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v14" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v14" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>名次</label><input class="rank-v14" inputmode="numeric" value="${row.rank??''}" placeholder="可留空"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v14" inputmode="numeric" value="${row.participants??''}" placeholder="留空=总人数"></div></div></div>`;
  const renderRows=()=>{list.innerHTML=rows.map(card).join('');$$('.remove-exam-subject-v10',list).forEach((b,i)=>b.onclick=()=>{sync();rows.splice(i,1);renderRows();totals()});$$('input',list).forEach(i=>i.addEventListener('input',totals));};renderRows();totals();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('#addExamSubjectV14',modal).onclick=()=>{sync();if(rows.length>=40)return toast('最多 40 个科目 / 模块');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};$('#toggleHiddenV14',modal).onclick=()=>{const input=$('#examHiddenV14',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenV14',modal).textContent=next?'恢复显示':'隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后不参与图表。':'保存后正常参与图表。';};$('#deleteExamV14',modal)?.addEventListener('click',async()=>{if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(e){toast(e.message)}});$('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam=function validateExamV14(exam){
  const tr=num(exam.total_rank),tp=num(exam.total_participants);if(tr!==null&&(!Number.isInteger(tr)||tr<1))return'总排名请输入正整数';if(tp!==null&&(!Number.isInteger(tp)||tp<1))return'参考人数请输入正整数';if(tr!==null&&tp!==null&&tr>tp)return'总排名不能大于参考人数';
  for(const[name,row]of Object.entries(exam.scores||{})){const max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??tp;if(max<=0||rawMax<=0)return`${name} 的满分必须大于 0`;if(target!==null&&target>max)return`${name}目标不能超过最终满分 ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name}赋分/最终分不能超过最终满分 ${formatScore(max)}`;if(raw!==null&&raw>rawMax)return`${name}原始分不能超过原始满分 ${formatScore(rawMax)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}排名请输入正整数`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}参考人数请输入正整数`;if(rank!==null&&effective!==null&&rank>effective)return`${name}排名不能大于参考人数`;}
  return'';
};

saveExam=async function saveExamV14(id,modal){
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV14',modal)?.value||'',total_participants:$('#totalParticipantsV14',modal)?.value||'',is_hidden:$('#examHiddenV14',modal)?.value==='1',scores:{}};const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value};}if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='保存中…';try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);btn.disabled=false;btn.textContent=id?'保存修改':'保存考试';}
};

recordsHtml=function recordsHtmlV14(){
  const exams=state.allExams||[],hidden=exams.filter(e=>e.is_hidden).length,order=categoryOptionsV14(),groups=[...order.map(v=>({name:v,exams:exams.filter(e=>e.grade_level===v)})),{name:'未分类',exams:exams.filter(e=>!e.grade_level)}].filter(g=>g.exams.length);
  return `<div class="page-head"><div><h2>考试记录</h2><p>按${escapeHtml(categoryLabelV14())}分组；每次考试的科目彼此独立。${hidden?` ${hidden} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map(g=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} 次</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;
};

const recordHtmlBeforeV14=recordHtml;
recordHtml=function recordHtmlV14(exam){let html=recordHtmlBeforeV14(exam);html=html.replace(/<span class="grade-badge-v13">[\s\S]*?<\/span>/,`<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'未分类')}</span>`);return html;};

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
  var data=await response.json().catch(function(){return {error:'网络响应异常'};});
  if(!response.ok) throw new Error(data.error||'密码修改失败');
  return data;
}

var accountHtmlBeforeV15=accountHtml;
accountHtml=function accountHtmlV15(){
  var html=accountHtmlBeforeV15();
  return html+`<div class="card password-card-v15"><div><h3 class="card-title">修改密码</h3><p class="card-sub">已登录时可直接设置一个更好记的新密码。</p></div><div class="password-grid-v15"><div class="field"><label>新密码</label><input id="newPasswordV15" type="password" autocomplete="new-password" placeholder="6～20位，可含字母数字符号"></div><div class="field"><label>再次输入</label><input id="confirmPasswordV15" type="password" autocomplete="new-password" placeholder="再次输入新密码"></div><button class="primary" id="changePasswordV15">保存新密码</button></div><div class="password-note-v15">修改成功后当前设备不会退出，以后重新登录请使用新密码。建议设置 6～20 位，可使用大小写字母、数字和符号。</div></div>`;
};

var bindPageBeforeV15=bindPage;
bindPage=function bindPageV15(){
  bindPageBeforeV15();
  var button=document.getElementById('changePasswordV15');
  if(button){
    button.onclick=async function(){
      var first=(document.getElementById('newPasswordV15')||{}).value||'';
      var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
      if(!/^[\x21-\x7E]{6,20}$/.test(first)) return toast('新密码请设置 6～20 位，可使用大小写字母、数字和符号');
      if(first!==second) return toast('两次输入的密码不一致');
      button.disabled=true;
      button.textContent='保存中…';
      try{
        await changePasswordApiV15(first);
        document.getElementById('newPasswordV15').value='';
        document.getElementById('confirmPasswordV15').value='';
        toast('密码已修改，请记住新密码');
      }catch(e){
        toast(e&&e.message?e.message:'密码修改失败');
      }finally{
        button.disabled=false;
        button.textContent='保存新密码';
      }
    };
  }
};

var renderLoginBeforeV15=renderLogin;
renderLogin=function renderLoginV15(error){
  renderLoginBeforeV15(error);
  var passwordInput=document.getElementById('loginPass');
  if(passwordInput) passwordInput.placeholder='输入密码';
  var help=document.querySelector('.auth-help');
  if(help) help.textContent='新账号会生成 10 位数字密码；登录后可在账号页改成自己的 6～20 位数字密码。';
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

function rankScopeLabelV16(scope){ return scope === 'class' ? '班排' : '年排'; }
function rankScopeLongLabelV16(scope){ return scope === 'class' ? '班级排名' : '年级排名'; }
function rankInfoByScopeV16(exam, subject, scope){
  if (!exam) return { rank:null, participants:null, performance:null };
  var isClass = scope === 'class';
  if (subject === '总分') {
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
    .replace(/原始名次模式/g, label+'模式')
    .replace(/原始名次/g, label)
    .replace(/这个项目还没有名次数据/g, '这个项目还没有'+label+'数据')
    .replace(/记录名次后/g, '记录'+label+'后');
};

var rankChartBeforeV16 = rankChartHtmlV7;
rankChartHtmlV7 = function rankChartHtmlV16(){
  var html=rankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/排名趋势分析/g, label+'百分位趋势分析')
    .replace(/这个科目还没有排名数据/g, '这个科目还没有'+label+'数据')
    .replace(/排名表现/g, label+'百分位');
};

var homeHtmlBeforeV16 = homeHtml;
homeHtml = function homeHtmlV16(){
  var html=homeHtmlBeforeV16();
  var isRank=state.trendMetric==='rank_raw'||state.trendMetric==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var toggle=`<div class="trend-metric-toggle-v7 rank-scope-v16"><span class="label">趋势类型</span><button class="metric-btn-v7 ${!isRank&&state.trendMetric==='score'?'active':''}" data-trend-scope-v16="score">成绩</button><button class="metric-btn-v7 ${isRank&&scope==='year'?'active':''}" data-trend-scope-v16="year">年排</button><button class="metric-btn-v7 ${isRank&&scope==='class'?'active':''}" data-trend-scope-v16="class">班排</button></div>${isRank?`<div class="rank-view-v16"><span class="label">查看</span><button class="metric-btn-v7 ${state.trendMetric==='rank_raw'?'active':''}" data-trend-metric="rank_raw">名次</button><button class="metric-btn-v7 ${state.trendMetric==='rank'?'active':''}" data-trend-metric="rank">百分位</button></div>`:''}`;
  html=html.replace(/<div class="trend-metric-toggle-v7">[\s\S]*?<\/div>/,toggle);
  if(isRank){
    var title=state.trendMetric==='rank_raw'?scopeLabel+'趋势':scopeLabel+'百分位趋势';
    html=html.replace(/<h3 class="card-title">(?:成绩趋势|名次趋势|排名趋势)<\/h3>/,`<h3 class="card-title">${title}</h3>`);
    if(state.trendMetric==='rank_raw'){
      html=html.replace('直接看原始第几名；纵轴反向显示，第 1 名在最上方',`直接看${scopeLabel}第几名；纵轴越高越好，第 1 名在最上方`);
      html=html.replace('总分与各科直接叠加原始名次；越靠上代表名次越好',`总分与各科叠加${scopeLabel}；越靠上代表名次越好`);
    }else{
      html=html.replace('用参考人数把名次转换成可比较的“排名表现”，避免考试难度和人数变化干扰判断',`${scopeLabel}结合对应参考人数换算成百分位，方便不同考试之间比较`);
      html=html.replace('总分与各科排名统一换算为排名表现；参考人数不同也能放在一起比较',`总分与各科${scopeLabel}统一换算成百分位；参考人数变化时也更可比`);
    }
  }
  return html;
};

var radarChartBeforeV16 = radarChartHtml;
radarChartHtml = function radarChartHtmlV16(selected){
  var html=radarChartBeforeV16(selected);
  if(state.radarMode==='rank_raw'){
    var label=rankScopeLongLabelV16(state.rankScopeV16);
    html=html.replace(/原始名次/g,label).replace(/名次数据/g,label+'数据');
  }
  if(state.radarMode==='rank'){
    var p=rankScopeLabelV16(state.rankScopeV16)+'百分位';
    html=html.replace(/排名百分位/g,p);
  }
  return html;
};
var radarSummaryBeforeV16 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV16(selected){
  var html=radarSummaryBeforeV16(selected);
  if(state.radarMode==='rank_raw') html=html.replace(/名次/g,rankScopeLabelV16(state.rankScopeV16));
  if(state.radarMode==='rank') html=html.replace(/排名百分位/g,rankScopeLabelV16(state.rankScopeV16)+'百分位');
  return html;
};
radarCardHtml = function radarCardHtmlV16(){
  var available=radarAvailableExams();
  var selected=selectedRadarExams();
  var isRank=state.radarMode==='rank_raw'||state.radarMode==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var sub=state.radarMode==='rank_raw'
    ? `直接按${scopeLabel}绘制：越靠外代表名次越好，第 1 名方向最外。`
    : state.radarMode==='rank'
      ? `按${scopeLabel}百分位绘制：越靠外代表相对排名越好。`
      : state.radarMode==='raw_score'
        ? '按原始得分率绘制，方便比较赋分前后的学科结构。'
        : '按得分率绘制；没有数据的科目会自动隐藏，6 科就显示六边形。';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">${sub}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode==='actual'?'active':''}" data-radar-mode="actual">最终分</button><button class="chip ${state.radarMode==='raw_score'?'active':''}" data-radar-mode="raw_score">原始分</button><button class="chip ${state.radarMode==='target'?'active':''}" data-radar-mode="target">目标</button><button class="chip ${isRank&&scope==='year'?'active':''}" data-radar-scope-v16="year">年排</button><button class="chip ${isRank&&scope==='class'?'active':''}" data-radar-scope-v16="class">班排</button></div>${isRank?`<div class="rank-view-v16"><span class="label">查看</span><button class="metric-btn-v7 ${state.radarMode==='rank_raw'?'active':''}" data-radar-mode="rank_raw">名次</button><button class="metric-btn-v7 ${state.radarMode==='rank'?'active':''}" data-radar-mode="rank">百分位</button></div>`:''}<div><div class="subtle-note">最多叠加 4 次考试，只显示所选考试共同拥有数据的科目；坐标会自动缩放。</div>${isRank?`<div class="rank-compat-v16">${scopeLabel}和${scopeLabel}人数都可按科目单独填写；科目人数留空时自动使用总${scopeLabel}人数。</div>`:''}<div class="multi-select" style="margin-top:8px">${available.length?available.map(function(exam){return `<button class="select-pill ${state.radarSelection.includes(exam.id)?'active':''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`;}).join(''):`<span class="subtle-note">当前还没有可用于${isRank?scopeLabel+'雷达图':'雷达图'}的数据</span>`}</div></div></div>
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
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">未分类</option>${options.map(function(v){return `<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`;}).join('')}</select></div></div>
  <div class="section-head-v7"><div><h4>本次考试科目</h4><p>科目可自由增减；原始分和最终分可以使用不同满分。</p></div></div><div class="exam-subjects-v10" id="examSubjectsV16"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV16">＋ 添加科目 / 模块</button></div>
  <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV16">—</b></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV16">—</b></div></div>
  <div class="section-head-v7"><div><h4>排名（可选）</h4><p>旧版“名次”已统一视为年排；班排是新增字段，不会改动已有数据。</p></div></div><div class="total-ranks-v16"><div class="rank-scope-card-v16"><b>年级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_rank??''}" placeholder="如 36"></div><div><label>年级人数</label><input id="totalParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_participants??''}" placeholder="如 620"></div></div></div><div class="rank-scope-card-v16"><b>班级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalClassRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_rank??''}" placeholder="如 8"></div><div><label>班级人数</label><input id="totalClassParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_participants??''}" placeholder="如 45"></div></div></div></div>
  <div class="rank-compat-v16">各科的年级/班级人数可以留空，分别自动沿用上面的总年级人数 / 总班级人数。</div>
  <div class="visibility-box-v10"><div><b>图表显示</b><span>${exam?.is_hidden?'已隐藏，不参与图表。':'正常参与图表。'}</span></div><button class="secondary" id="toggleHiddenV16">${exam?.is_hidden?'恢复显示':'隐藏'}</button><input type="hidden" id="examHiddenV16" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV16">删除这次考试</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;
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
  function card(row){return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v16" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>最终分（赋分后）<span class="score-entry-tip-v16">无赋分也填这里</span></label><div class="score-with-max-v14"><input class="actual-v16" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v16" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v16" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v16" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="subject-ranks-v16"><div class="subject-rank-row-v16"><span>年排</span><input class="year-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.rank??''}" placeholder="名次"><input class="year-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.participants??''}" placeholder="年级人数"></div><div class="subject-rank-row-v16"><span>班排</span><input class="class-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classRank??''}" placeholder="名次"><input class="class-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classParticipants??''}" placeholder="班级人数"></div></div></div>`;}
  function renderRows(){
    list.innerHTML=rows.map(card).join('');
    $$('.remove-exam-subject-v10',list).forEach(function(button,index){button.onclick=function(){sync();rows.splice(index,1);renderRows();totals();};});
    $$('input',list).forEach(function(input){input.addEventListener('input',totals);});
  }
  renderRows();totals();
  function close(){modal.remove();state.modal=null;}
  $('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=function(event){if(event.target===modal)close();};
  document.getElementById('addExamSubjectV16').onclick=function(){sync();if(rows.length>=40)return toast('最多 40 个科目 / 模块');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:'',classRank:'',classParticipants:''});renderRows();var inputs=list.querySelectorAll('.exam-subject-name-v10');if(inputs.length)inputs[inputs.length-1].focus();};
  document.getElementById('toggleHiddenV16').onclick=function(){var input=document.getElementById('examHiddenV16'),next=input.value!=='1';input.value=next?'1':'0';this.textContent=next?'恢复显示':'隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后不参与图表。':'保存后正常参与图表。';};
  document.getElementById('deleteExamV16')?.addEventListener('click',async function(){if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=function(){saveExam(exam?.id||null,modal);};
};

validateExam = function validateExamV16(exam){
  function validatePair(rankValue,participantsValue,label){
    var r=num(rankValue),p=num(participantsValue);
    if(r!==null&&(!Number.isInteger(r)||r<1))return label+'请输入正整数';
    if(p!==null&&(!Number.isInteger(p)||p<1))return label.replace('排名','人数')+'请输入正整数';
    if(r!==null&&p!==null&&r>p)return label+'不能大于参考人数';
    return '';
  }
  var error=validatePair(exam.total_rank,exam.total_participants,'年级总排名');if(error)return error;
  error=validatePair(exam.total_class_rank,exam.total_class_participants,'班级总排名');if(error)return error;
  var yearTotal=num(exam.total_participants),classTotal=num(exam.total_class_participants);
  for(var entry of Object.entries(exam.scores||{})){
    var name=entry[0],row=entry[1]||{},max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual);
    if(max<=0||rawMax<=0)return `${name} 的满分必须大于 0`;
    if(target!==null&&target>max)return `${name}目标不能超过最终满分 ${formatScore(max)}`;
    if(actual!==null&&actual>max)return `${name}赋分/最终分不能超过最终满分 ${formatScore(max)}`;
    if(raw!==null&&raw>rawMax)return `${name}原始分不能超过原始满分 ${formatScore(rawMax)}`;
    var yr=num(row.rank),yp=num(row.participants),cr=num(row.classRank),cp=num(row.classParticipants);
    if(yr!==null&&(!Number.isInteger(yr)||yr<1))return `${name}年排请输入正整数`;
    if(yp!==null&&(!Number.isInteger(yp)||yp<1))return `${name}年级人数请输入正整数`;
    if(cr!==null&&(!Number.isInteger(cr)||cr<1))return `${name}班排请输入正整数`;
    if(cp!==null&&(!Number.isInteger(cp)||cp<1))return `${name}班级人数请输入正整数`;
    var yEffective=yp??yearTotal,cEffective=cp??classTotal;
    if(yr!==null&&yEffective!==null&&yr>yEffective)return `${name}年排不能大于年级人数`;
    if(cr!==null&&cEffective!==null&&cr>cEffective)return `${name}班排不能大于班级人数`;
  }
  return '';
};

saveExam = async function saveExamV16(id,modal){
  var button=$('.save-btn',modal);
  var exam={id:id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV16',modal)?.value||'',total_participants:$('#totalParticipantsV16',modal)?.value||'',total_class_rank:$('#totalClassRankV16',modal)?.value||'',total_class_participants:$('#totalClassParticipantsV16',modal)?.value||'',is_hidden:$('#examHiddenV16',modal)?.value==='1',scores:{}};
  var seen=new Set();
  for(var card of $$('.exam-subject-card-v10',modal)){
    var name=$('.exam-subject-name-v10',card).value.trim();
    if(!name)return toast('请填写科目名称，或删除空白科目');
    if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);
    exam.scores[name]={target:$('.target-v16',card).value,raw:$('.raw-v16',card).value,actual:$('.actual-v16',card).value,rawMax:$('.rawmax-v16',card).value,max:$('.max-v16',card).value,rank:$('.year-rank-v16',card).value,participants:$('.year-participants-v16',card).value,classRank:$('.class-rank-v16',card).value,classParticipants:$('.class-participants-v16',card).value};
  }
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');
  var error=validateExam(exam);if(error)return toast(error);
  button.disabled=true;button.textContent='保存中…';
  try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}
  catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}
};

var recordHtmlBeforeV16=recordHtml;
recordHtml=function recordHtmlV16(exam){
  var html=recordHtmlBeforeV16(exam);
  html=html.replace(/<span class="score-tag"><b>总排名[\s\S]*?<\/span>/g,'');
  var year=rankInfoByScopeV16(exam,'总分','year');
  var cls=rankInfoByScopeV16(exam,'总分','class');
  var badges='';
  if(year.rank!==null)badges+=`<span class="score-tag"><b>年排 ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;
  if(cls.rank!==null)badges+=`<span class="score-tag"><b>班排 ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;
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
  var footer=document.createElement('footer');footer.id='app-version-v17';footer.textContent='Score Tracker · v1.1';document.body.appendChild(footer);
})();

function positionPerformanceV17(positionPercent){var p=num(positionPercent);if(p===null||p<0||p>100)return null;return Math.max(0,Math.min(100,100-p));}
var rankInfoByScopeBeforeV17=rankInfoByScopeV16;
rankInfoByScopeV16=function rankInfoByScopeV17(exam,subject,scope){if(!exam)return{rank:null,participants:null,performance:null,positionPercent:null,directPercent:false};var isClass=scope==='class';var direct=subject==='总分'?num(isClass?exam.total_class_position_percent:exam.total_year_position_percent):num(exam.scores?.[subject]?.[isClass?'classPositionPercent':'yearPositionPercent']);var base=rankInfoByScopeBeforeV17(exam,subject,scope);if(direct!==null&&direct>=0&&direct<=100)return{...base,performance:positionPerformanceV17(direct),positionPercent:direct,directPercent:true};return{...base,positionPercent:null,directPercent:false};};
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
  if(totalRanks&&!modal.querySelector('.rank-entry-mode-v17')){var switcher=document.createElement('div');switcher.className='rank-entry-mode-v17';switcher.innerHTML='<span class="label">录入方式</span><button type="button" data-entry-mode-v17="rank">名次</button><button type="button" data-entry-mode-v17="percent">位比</button>';totalRanks.parentNode.insertBefore(switcher,totalRanks);var cards=totalRanks.querySelectorAll('.rank-scope-card-v16');cards.forEach(function(card,index){var wrap=document.createElement('div');wrap.className='position-total-v17';var value=index===0?(exam?.total_year_position_percent??''):(exam?.total_class_position_percent??'');wrap.innerHTML='<label>位比（前 %）</label><input class="'+(index===0?'total-year-position-v17':'total-class-position-v17')+'" inputmode="decimal" value="'+escapeHtml(value)+'" placeholder="如 12.5">';card.appendChild(wrap);});var note=document.createElement('div');note.className='position-note-v17';note.textContent='位比按成绩单“前 x%”原样填写；趋势图会自动换算成越高越好的百分位。';totalRanks.insertAdjacentElement('afterend',note);}
  function snapshotCustom(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var name=card.querySelector('.exam-subject-name-v10')?.value.trim();if(!name)return;customState[name]={excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked,yearPositionPercent:card.querySelector('.year-position-v17')?.value??'',classPositionPercent:card.querySelector('.class-position-v17')?.value??''};});}
  function decorate(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){if(card.dataset.v17Decorated==='1')return;card.dataset.v17Decorated='1';var name=card.querySelector('.exam-subject-name-v10')?.value.trim()||'',saved=customState[name]||initial[name]||{excludeFromTotal:false,yearPositionPercent:'',classPositionPercent:''};var head=card.querySelector('.exam-subject-head-v10');if(head){var label=document.createElement('label');label.className='exclude-total-v17';label.innerHTML='<input type="checkbox" class="exclude-total-check-v17" '+(saved.excludeFromTotal?'checked':'')+'> <span>统计项，不计入总分</span>';head.insertAdjacentElement('afterend',label);}var rankRows=card.querySelectorAll('.subject-rank-row-v16');rankRows.forEach(function(row,index){var input=document.createElement('input');input.className='position-percent-v17 '+(index===0?'year-position-v17':'class-position-v17');input.inputMode='decimal';input.placeholder='位比（前%）';input.value=index===0?(saved.yearPositionPercent??''):(saved.classPositionPercent??'');row.appendChild(input);});});}
  function updateMode(){var current=modal.dataset.rankEntryModeV17||'rank';modal.classList.toggle('rank-entry-percent-v17',current==='percent');modal.querySelectorAll('[data-entry-mode-v17]').forEach(function(button){button.classList.toggle('active',button.dataset.entryModeV17===current);});}
  function updateTotals(){var rows=[...modal.querySelectorAll('.exam-subject-card-v10')].map(function(card){return{raw:card.querySelector('.raw-v16')?.value,actual:card.querySelector('.actual-v16')?.value,excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked};});var rawEl=modal.querySelector('#rawTotalV16'),finalEl=modal.querySelector('#finalTotalV16');if(rawEl)rawEl.textContent=formatScore(rawTotalFromRowsV13(rows));if(finalEl)finalEl.textContent=formatScore(finalTotalFromRowsV13(rows));}
  decorate();updateMode();updateTotals();modal.querySelectorAll('[data-entry-mode-v17]').forEach(function(button){button.onclick=function(){snapshotCustom();modal.dataset.rankEntryModeV17=button.dataset.entryModeV17;updateMode();};});modal.addEventListener('input',function(){snapshotCustom();setTimeout(updateTotals,0);});modal.addEventListener('change',function(){snapshotCustom();setTimeout(updateTotals,0);});modal.addEventListener('click',function(event){if(event.target.closest('#addExamSubjectV16,.remove-exam-subject-v10'))snapshotCustom();},true);var observer=new MutationObserver(function(){decorate();updateMode();updateTotals();});var list=modal.querySelector('#examSubjectsV16');if(list)observer.observe(list,{childList:true,subtree:true});
};

var validateExamBeforeV17=validateExam;
validateExam=function validateExamV17(exam){var base=validateExamBeforeV17(exam);if(base)return base;function check(v,label){if(v===null||v===undefined||v==='')return'';var n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?'':label+'请输入 0～100';}var e=check(exam.total_year_position_percent,'年级位比');if(e)return e;e=check(exam.total_class_position_percent,'班级位比');if(e)return e;for(var entry of Object.entries(exam.scores||{})){var name=entry[0],row=entry[1]||{};e=check(row.yearPositionPercent,name+'年级位比');if(e)return e;e=check(row.classPositionPercent,name+'班级位比');if(e)return e;}return'';};

saveExam=async function saveExamV17(id,modal){var button=modal.querySelector('.save-btn'),mode=modal.dataset.rankEntryModeV17||'rank';var exam={id:id,name:modal.querySelector('#examName').value.trim(),exam_date:modal.querySelector('#examDate').value,grade_level:modal.querySelector('#gradeLevelV14')?.value||'',total_rank:mode==='rank'?(modal.querySelector('#totalRankV16')?.value||''):'',total_participants:mode==='rank'?(modal.querySelector('#totalParticipantsV16')?.value||''):'',total_class_rank:mode==='rank'?(modal.querySelector('#totalClassRankV16')?.value||''):'',total_class_participants:mode==='rank'?(modal.querySelector('#totalClassParticipantsV16')?.value||''):'',total_year_position_percent:mode==='percent'?(modal.querySelector('.total-year-position-v17')?.value||''):'',total_class_position_percent:mode==='percent'?(modal.querySelector('.total-class-position-v17')?.value||''):'',is_hidden:modal.querySelector('#examHiddenV16')?.value==='1',scores:{}};var seen=new Set();for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=card.querySelector('.exam-subject-name-v10').value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked};}if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='保存中…';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}};

recordHtml=function recordHtmlV17(exam){var subjects=Object.keys(exam.scores||{}),finalTotal=totalFor(exam,'actual'),rawTotal=totalRawForV13(exam);var tags=subjects.map(function(subject){var row=exam.scores[subject]||{},a=num(row.actual),raw=num(row.raw),t=num(row.target),year=rankInfoByScopeV16(exam,subject,'year'),cls=rankInfoByScopeV16(exam,subject,'class');if(a===null&&raw===null&&t===null&&year.rank===null&&year.positionPercent===null&&cls.rank===null&&cls.positionPercent===null)return'';var rankText='';if(year.directPercent)rankText+=` · 年位比 前${formatPercent(year.positionPercent)}`;else if(year.rank!==null)rankText+=` · 年排 ${year.rank}${year.participants?`/${year.participants}`:''}`;if(cls.directPercent)rankText+=` · 班位比 前${formatPercent(cls.positionPercent)}`;else if(cls.rank!==null)rankText+=` · 班排 ${cls.rank}${cls.participants?`/${cls.participants}`:''}`;return `<span class="score-tag">${escapeHtml(subject)}${row.excludeFromTotal?'<span class="stat-badge-v17">统计项</span>':''} ${a===null?'—':formatScore(a)}${raw!==null?`<span class="raw-final-inline-v13"> · 原始 <b>${formatScore(raw)}</b></span>`:''}<span style="color:#a1a9b5"> / 目标 ${t===null?'—':formatScore(t)}</span>${rankText?`<span style="color:#667085">${rankText}</span>`:''}</span>`;}).join('');var year=rankInfoByScopeV16(exam,'总分','year'),cls=rankInfoByScopeV16(exam,'总分','class'),badges='';if(year.directPercent)badges+=`<span class="score-tag"><b>年位比 前${formatPercent(year.positionPercent)}</b></span>`;else if(year.rank!==null)badges+=`<span class="score-tag"><b>年排 ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;if(cls.directPercent)badges+=`<span class="score-tag"><b>班位比 前${formatPercent(cls.positionPercent)}</b></span>`;else if(cls.rank!==null)badges+=`<span class="score-tag"><b>班排 ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;return `<div class="record ${exam.is_hidden?'hidden-record-v10':''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'未分类')}</span>${exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':''}</b></div><div class="record-scores">${tags||'<span class="score-tag">尚未填写分数或排名</span>'}<span class="score-tag"><b>赋分总分 ${finalTotal===null?'—':formatScore(finalTotal)}</b>${rawTotal!==null?` · 原始总分 ${formatScore(rawTotal)}`:''}</span>${badges}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">编辑</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden?'恢复显示':'隐藏'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">删除</button></div></div>`;};

recordsHtml=function recordsHtmlV17(){var exams=state.allExams||[],hidden=exams.filter(function(e){return e.is_hidden;}).length,order=categoryOptionsV14();function byDateDesc(a,b){var d=String(b.exam_date||'').localeCompare(String(a.exam_date||''));if(d)return d;return String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||''));}var groups=[...order.map(function(v){return{name:v,exams:exams.filter(function(e){return e.grade_level===v;}).sort(byDateDesc)};}),{name:'未分类',exams:exams.filter(function(e){return !e.grade_level;}).sort(byDateDesc)}].filter(function(g){return g.exams.length;}).sort(function(a,b){return byDateDesc(a.exams[0],b.exams[0]);});return `<div class="page-head"><div><h2>考试记录</h2><p>最近的考试排在前面。${hidden?` ${hidden} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map(function(g){return `<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} 次</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`;}).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;};

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
  var data=await res.json().catch(function(){return{error:'网络响应异常'}});
  if(!res.ok)throw new Error(data.error||'模块设置请求失败');
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
  ['语文','数学','英语','物理','历史','化学','生物','政治','地理'].forEach(add);
  return out;
}
function appendModulesV18(){
  (state.modulesV18||[]).forEach(function(m){
    if(!m||!m.name)return;
    if(!SUBJECTS.includes(m.name))SUBJECTS.push(m.name);
    SUBJECT_SHORT[m.name]=m.name.length<=4?m.name:('模'+((state.modulesV18||[]).indexOf(m)+1));
  });
  if(!['总览','总分',...SUBJECTS].includes(state.subject))state.subject='总分';
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
  return `<div class="card module-settings-v18"><div class="module-settings-head-v18"><div><h3 class="card-title">成绩模块</h3><p class="card-sub">自动汇总常用组合，不重复计入总分。内置语数外、四科和六科，也可以新增自己的模块。</p></div><button class="secondary" id="manageModulesV18">设置</button></div><div class="module-chips-v18">${state.modulesV18.map(function(m){return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b>${m.isBuiltin?'<span class="module-badge-v18">内置</span>':''} · ${(m.subjects||[]).map(escapeHtml).join(' / ')}</span>`}).join('')}</div></div>`;
}
var accountHtmlBeforeV18=accountHtml;
accountHtml=function accountHtmlV18(){return accountHtmlBeforeV18()+moduleCardHtmlV18();};

function normalizeBuiltinV18(module){
  var core=['语文','数学','英语'],subjects=[...(module.subjects||[])],extras=subjects.filter(function(s){return !core.includes(s)});
  if(module.name==='语数外')return core;
  if(module.name==='语数外 + 物理/历史（四科）')return core.concat(extras.slice(0,1));
  if(module.name==='语数外 + 所选科（六科）')return core.concat(extras.slice(0,3));
  return subjects;
}
function openModuleManagerV18(){
  var options=moduleSubjectOptionsV18(),draft=(state.modulesV18||[]).map(function(m){return{id:m.id,name:m.name,subjects:[...(m.subjects||[])],isBuiltin:!!m.isBuiltin}});
  var modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>成绩模块设置</h3><button class="close-btn">×</button></div><div class="modal-body"><p class="form-note">模块只做汇总展示，不会再次加入总分。内置四科请选择物理或历史之一；六科请选择 3 门选科。</p><div class="module-manager-list-v18" id="moduleListV18"></div><div class="module-manager-actions-v18"><button class="secondary" id="addModuleV18">＋ 自定义模块</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveModulesV18">保存</button></div></div></div></div>`;document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('moduleListV18');
  function syncNames(){list.querySelectorAll('.module-editor-v18').forEach(function(card,i){var input=card.querySelector('.module-name-v18');if(input&&!draft[i].isBuiltin)draft[i].name=input.value.trim();});}
  function toggleSubject(index,name){
    var m=draft[index],core=['语文','数学','英语'];
    if(m.isBuiltin&&core.includes(name))return;
    var has=m.subjects.includes(name);
    if(m.name==='语数外')return;
    if(m.name==='语数外 + 物理/历史（四科）'){
      if(!core.includes(name)&&!['物理','历史'].includes(name))return toast('四科模块只能选择物理或历史');
      if(has)m.subjects=core.slice();else m.subjects=core.concat([name]);
    }else if(m.name==='语数外 + 所选科（六科）'){
      var extras=m.subjects.filter(function(s){return !core.includes(s)});
      if(has)extras=extras.filter(function(s){return s!==name});else{if(extras.length>=3)return toast('六科模块最多选择 3 门选科');extras.push(name);}m.subjects=core.concat(extras);
    }else{if(has)m.subjects=m.subjects.filter(function(s){return s!==name});else m.subjects.push(name);}
    renderRows();
  }
  function renderRows(){
    list.innerHTML=draft.map(function(m,i){m.subjects=normalizeBuiltinV18(m);var note=m.name==='语数外'?'固定汇总语文、数学、英语。':m.name==='语数外 + 物理/历史（四科）'?'语数外 + 物理/历史，四科。':m.name==='语数外 + 所选科（六科）'?'语数外 + 3 门选科，六科。':'至少选择 2 个科目。';return `<div class="module-editor-v18" data-module-index="${i}"><div class="module-editor-head-v18"><input class="module-name-v18" maxlength="30" value="${escapeHtml(m.name||'')}" ${m.isBuiltin?'readonly':''} placeholder="模块名称">${m.isBuiltin?'<span class="module-badge-v18">内置</span>':`<button type="button" class="module-delete-v18">删除</button>`}</div><div class="module-subjects-v18">${options.map(function(name){if(m.name==='语数外 + 物理/历史（四科）'&&!['语文','数学','英语','物理','历史'].includes(name))return '';var active=m.subjects.includes(name),locked=m.isBuiltin&&['语文','数学','英语'].includes(name);return `<button type="button" class="module-subject-v18 ${active?'active':''} ${locked?'locked':''}" data-module-subject="${escapeHtml(name)}">${escapeHtml(name)}</button>`}).join('')}</div><div class="module-editor-note-v18">${note}</div></div>`}).join('');
    list.querySelectorAll('.module-editor-v18').forEach(function(card,index){
      card.querySelectorAll('[data-module-subject]').forEach(function(button){button.onclick=function(){syncNames();toggleSubject(index,button.dataset.moduleSubject)}});
      var del=card.querySelector('.module-delete-v18');if(del)del.onclick=function(){syncNames();draft.splice(index,1);renderRows();};
    });
  }
  renderRows();
  function close(){modal.remove();state.modal=null;}
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;modal.onclick=function(e){if(e.target===modal)close()};
  document.getElementById('addModuleV18').onclick=function(){syncNames();if(draft.length>=12)return toast('最多 12 个模块');draft.push({id:null,name:'',subjects:[],isBuiltin:false});renderRows();list.querySelector('.module-editor-v18:last-child .module-name-v18')?.focus();};
  document.getElementById('saveModulesV18').onclick=async function(){
    syncNames();var names=new Set();
    for(var i=0;i<draft.length;i++){var m=draft[i];m.subjects=normalizeBuiltinV18(m);if(!m.name)return toast('请填写模块名称');if(names.has(m.name))return toast('模块名称不能重复');names.add(m.name);if(m.name==='语数外'&&m.subjects.length!==3)return toast('语数外模块应为 3 科');if(m.name==='语数外 + 物理/历史（四科）'&&m.subjects.length!==4)return toast('四科模块请选择物理或历史之一');if(m.name==='语数外 + 所选科（六科）'&&m.subjects.length!==6)return toast('六科模块请选择 3 门选科');if(!m.isBuiltin&&m.subjects.length<2)return toast(`模块「${m.name}」至少选择 2 个科目`);}
    var button=document.getElementById('saveModulesV18');button.disabled=true;button.textContent='保存中…';
    try{var data=await modulesApiV18('save_modules',{modules:draft});state.modulesV18=data.modules||[];if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);close();render();toast('模块设置已保存');}
    catch(e){toast(e.message);button.disabled=false;button.textContent='保存';}
  };
}

function moduleSummaryV18(exam){
  var items=(state.modulesV18||[]).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target');
    if(final===null&&raw===null&&target===null)return'';
    var max=examMax(exam,m.name),parts=[];if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));if(target!==null)parts.push('目标 '+formatScore(target));
    return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' · ')}</span>`;
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
}
var recordHtmlBeforeV18=recordHtml;
recordHtml=function recordHtmlV18(exam){var html=recordHtmlBeforeV18(exam),summary=moduleSummaryV18(exam);return summary?html.replace('<div class="record-actions record-actions-v10">',summary+'<div class="record-actions record-actions-v10">'):html;};

function studyPlannerCardV18(){
  return `<a class="study-tool-v18" id="studyPlannerToolV18" href="${STUDY_PLANNER_URL_V18}" target="_blank" rel="noopener noreferrer"><div class="study-tool-copy-v18"><span class="study-tool-kicker-v18">另一个学习工具</span><h3>Study Planner · 自动学习规划</h3><p>把目标、任务和可用时间交给它，自动排进日历。适合和成绩轨迹一起用：这里看结果，那里安排下一步。</p><span class="study-tool-open-v18">打开学习规划器 ↗</span></div><div class="study-tool-thumb-v18"><img src="${STUDY_PLANNER_PROMO_V18}" alt="Study Planner 月视图"></div></a>`;
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
  var data=await response.json().catch(function(){return{error:'网络响应异常'};});
  if(!response.ok)throw new Error(data.error||'用户名请求失败');
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
  stage.setAttribute('tabindex','0');stage.setAttribute('role','region');stage.setAttribute('aria-label','成绩趋势，可左右滚动查看考试');
  if(!stage._trendHintV19){
    var hint=document.createElement('div');stage._trendHintV19=hint;
    hint.className='trend-scroll-hint-v19';
    hint.textContent='← 左右滑动查看全部考试 →';
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
    return `<div class="account-chip account-chip-v19">${inside}<button class="rename-username-v19" id="renameUsernameV19">修改</button></div><div class="username-origin-v19" id="usernameOriginV19">初始账号：<code>${original}</code> · 修改用户名不会改变原账号身份。</div>`;
  });
}

var accountHtmlBeforeV19=accountHtml;
accountHtml=function accountHtmlV19(){return usernameAccountPatchV19(accountHtmlBeforeV19());};

function openUsernameModalV19(){
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>修改用户名</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="field"><label>新用户名</label><input id="usernameInputV19" maxlength="24" autocomplete="username" value="${escapeHtml(state.user?.username||'')}" placeholder="2～24 位中文、字母或数字"></div><div class="username-modal-note-v19">保存时会自动查重。初始账号会作为内部账号标识保留，不会因为改名而丢失成绩或反馈记录。</div><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary" id="saveUsernameV19">保存用户名</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var close=function(){modal.remove();if(state.modal===modal)state.modal=null;};
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;
  modal.onclick=function(e){if(e.target===modal)close();};
  var input=modal.querySelector('#usernameInputV19');input.focus();input.select();
  modal.querySelector('#saveUsernameV19').onclick=async function(){
    var button=this,next=String(input.value||'').trim();
    if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(next))return toast('用户名请使用 2～24 位中文、字母、数字、横线或下划线');
    button.disabled=true;button.textContent='检查并保存…';
    try{
      var data=await usernameApiV19('rename',{username:next});
      state.user=Object.assign({},state.user,{username:data.user.username});
      state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username;
      close();render();toast('用户名已修改');
    }catch(e){toast(e&&e.message?e.message:'用户名修改失败');}
    finally{if(button.isConnected){button.disabled=false;button.textContent='保存用户名';}}
  };
}

async function refreshUsernameIdentityV19(){
  if(state.page!=='account'||!state.token)return;
  try{
    var data=await usernameApiV19('get');
    state.originalUsernameV19=data.user.originalUsername||data.user.username;
    if(state.user&&data.user.username)state.user.username=data.user.username;
    var note=document.getElementById('usernameOriginV19');
    if(note)note.innerHTML='初始账号：<code>'+escapeHtml(state.originalUsernameV19)+'</code> · 修改用户名不会改变原账号身份。';
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
        label:'最近一次'+subject+'成绩',
        value:value,
        exam:latest,
        delta:previousSubjectDeltaV20(exams,i,subject,value),
        deltaLabel:'较上次同科'
      };
    }

    var value=totalFor(latest,'actual');
    if(value===null)continue;
    return {
      label:'最近一次真实总分',
      value:value,
      exam:latest,
      delta:previousTotalDeltaV20(exams,i,latest,value,subjects),
      deltaLabel:'较上次同口径'
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
  card.innerHTML=`<div><div class="stat-label">${escapeHtml(metric.label)}</div><div class="stat-value">${formatScore(metric.value)}</div><div class="stat-sub">${escapeHtml(metric.exam.name)} · ${fmtDate(metric.exam.exam_date)}</div></div>${delta===null||delta===undefined?'':`<span class="trend-pill${delta<0?' down':''}">${delta>=0?'↗':'↘'} ${escapeHtml(metric.deltaLabel||'较上次同口径')} ${delta>=0?'+':''}${formatScore(delta)} 分</span>`}${metric.comparison?`<span class="hero-average">${escapeHtml(metric.comparison)}</span>`:''}`;
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
      button.textContent=collapsed?'展开':'收起';
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
    html=html.replace(`<span class="raw-final-inline-v13"> · 原始 <b>${value}</b></span>`,'');
  });
  var finalTotal=totalFor(clone,'actual'),rawTotal=typeof totalRawForV13==='function'?totalRawForV13(clone):null;
  if(finalTotal!==null&&rawTotal!==null&&Math.abs(Number(finalTotal)-Number(rawTotal))<0.000001){
    html=html.replace(` · 原始总分 ${formatScore(rawTotal)}`,'');
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
  if(!['总览','总分',...SUBJECTS].includes(state.subject))state.subject='总分';
}
var loadExamsBeforeV21=loadExams;
loadExams=async function loadExamsV21(){await loadExamsBeforeV21();cleanSubjectAxisV21();};

moduleSummaryV18=function moduleSummaryV21(exam){
  var selected=new Set((exam?.moduleIds||[]).map(String));
  if(!selected.size)return'';
  var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m.id));}).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target'),max=examMax(exam,m.name),parts=[];
    if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));
    if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));
    if(target!==null)parts.push('目标 '+formatScore(target));
    return parts.length?`<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' · ')}</span>`:'';
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
};

var accountHtmlBeforeV21=accountHtml;
accountHtml=function accountHtmlV21(){return accountHtmlBeforeV21().replace('成绩模块','组合设置').replace('自动汇总常用组合，不重复计入总分。内置语数外、四科和六科，也可以新增自己的模块。','先在这里定义常用组合；每次考试只显示你在“组合分”里主动添加的组合。');};
if(typeof openModuleManagerV18==='function'){
  var openModuleManagerBeforeV21=openModuleManagerV18;
  openModuleManagerV18=function openModuleManagerV21(){openModuleManagerBeforeV21();var modal=state.modal;if(!modal)return;var h=modal.querySelector('.modal-head h3');if(h)h.textContent='组合设置';var note=modal.querySelector('.form-note');if(note)note.textContent='这里只定义组合由哪些科目组成；不会自动出现在每场考试里。录成绩时可在“组合分”中按需添加。';var add=modal.querySelector('#addModuleV18');if(add)add.textContent='＋ 自定义组合';modal.querySelectorAll('.module-editor-note-v18').forEach(function(x){x.textContent=x.textContent.replaceAll('模块','组合')});};
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
  if(subjectHead?.classList.contains('section-head-v7')){var p=subjectHead.querySelector('p');if(p)p.textContent='科目统一在“账号 → 科目设置”维护；这里仅选择本次考试实际参加的科目。';}

  var entry=modal.querySelector('.rank-entry-mode-v17');
  var form=modal.querySelector('.form-grid');
  if(entry&&form){var box=document.createElement('div');box.className='rank-entry-top-v21';form.insertAdjacentElement('afterend',box);box.appendChild(entry);}

  var addOld=modal.querySelector('#addExamSubjectV16'),addOldFn=addOld?.onclick;
  if(addOld){addOld.style.display='none';var picker=document.createElement('div');picker.className='subject-picker-v21';picker.innerHTML='<select id="subjectPickerV21"><option value="">＋ 选择科目</option>'+configuredSubjectsV21().map(function(n){return `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`}).join('')+'</select><span class="template-note-v10">新增科目请到账号设置。</span>';addOld.parentNode.insertBefore(picker,addOld);var select=picker.querySelector('select');select.onchange=function(){var name=this.value;if(!name)return;if(selectedNamesV21(modal).includes(name)){toast('本次考试已选择「'+name+'」');this.value='';return;}if(typeof addOldFn==='function')addOldFn.call(addOld);setTimeout(function(){var cards=modal.querySelectorAll('.exam-subject-card-v10'),card=cards[cards.length-1],input=card?.querySelector('.exam-subject-name-v10');if(input){input.value=name;var max=subjectDefaultV21(name),m=card.querySelector('.max-v16'),rm=card.querySelector('.rawmax-v16');if(m)m.value=max;if(rm)rm.value=max;input.dispatchEvent(new Event('input',{bubbles:true}));}decorateCards();select.value='';},0);};}

  function decorateCards(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var input=card.querySelector('.exam-subject-name-v10');if(!input)return;var name=input.value.trim();var head=card.querySelector('.exam-subject-head-v10');var label=head?.querySelector('.subject-fixed-v21');if(!label&&head){label=document.createElement('div');label.className='subject-fixed-v21';head.insertBefore(label,input);}if(label)label.innerHTML=escapeHtml(name||'未选择')+(!configured.has(name)&&name?'<span class="subject-history-v21">历史项目</span>':'');input.readOnly=true;var ex=card.querySelector('.exclude-total-check-v17');if(ex&&configured.has(name))ex.checked=false;});}

  var totalRanks=modal.querySelector('.total-ranks-v16'),rankNote=modal.querySelector('.rank-compat-v16'),positionNote=modal.querySelector('.position-note-v17'),preview=modal.querySelector('.score-total-preview-v13');
  var rankHead=totalRanks?.previousElementSibling;
  while(rankHead&&(!rankHead.classList||!rankHead.classList.contains('section-head-v7')))rankHead=rankHead.previousElementSibling;
  if(rankHead){var h=rankHead.querySelector('h4'),p=rankHead.querySelector('p');if(h)h.textContent='组合分';if(p)p.textContent='总分自动汇总；下面可按需添加你在设置里定义的组合。';rankHead.classList.add('combo-section-v21');}
  if(totalRanks&&rankHead){var totalCard=document.createElement('div');totalCard.className='combo-total-v21';totalCard.innerHTML='<div class="combo-head-v21"><div><b>总分</b><span>自动汇总本次科目；排名/位比均可留空。</span></div></div>';rankHead.insertAdjacentElement('afterend',totalCard);if(preview)totalCard.appendChild(preview);totalCard.appendChild(totalRanks);if(positionNote)totalCard.appendChild(positionNote);if(rankNote)totalCard.appendChild(rankNote);
    var comboList=document.createElement('div');comboList.className='combo-list-v21';comboList.id='comboListV21';totalCard.insertAdjacentElement('afterend',comboList);
    var comboPicker=document.createElement('div');comboPicker.className='combo-picker-v21';comboPicker.innerHTML='<select id="comboPickerV21"><option value="">＋ 添加组合</option>'+ (state.modulesV18||[]).map(function(m){return `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`}).join('') +'</select><span class="template-note-v10">组合内容在账号设置里维护。</span>';comboList.insertAdjacentElement('afterend',comboPicker);
    modal._moduleIdsV21=[...(exam?.moduleIds||[])].map(String).filter(function(id){return moduleIdSetV21().has(id)});
    function renderCombos(){comboList.innerHTML=modal._moduleIdsV21.map(function(id){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===String(id)});if(!m)return'';return `<div class="combo-card-v21" data-combo-id="${escapeHtml(id)}"><div class="combo-head-v21"><div><b>${escapeHtml(m.name)}</b><span>${(m.subjects||[]).map(escapeHtml).join(' + ')}</span></div><button type="button" class="combo-remove-v21">移除</button></div><div class="combo-score-v21"><span>最终分 <b data-combo-final>—</b></span><span>原始分 <b data-combo-raw>—</b></span></div></div>`;}).join('');comboList.querySelectorAll('.combo-remove-v21').forEach(function(btn){btn.onclick=function(){var id=this.closest('[data-combo-id]').dataset.comboId;modal._moduleIdsV21=modal._moduleIdsV21.filter(function(x){return x!==id});renderCombos();};});updateComboScores();}
    function currentValue(name,klass){var card=[...modal.querySelectorAll('.exam-subject-card-v10')].find(function(c){return cardNameV21(c)===name});if(!card)return null;return num(card.querySelector(klass)?.value);}
    function comboSum(m,klass){var sum=0;for(var s of m.subjects||[]){var v=currentValue(s,klass);if(v===null)return null;sum+=v;}return sum;}
    function updateComboScores(){comboList.querySelectorAll('[data-combo-id]').forEach(function(card){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===card.dataset.comboId});if(!m)return;var final=comboSum(m,'.actual-v16'),raw=comboSum(m,'.raw-v16');card.querySelector('[data-combo-final]').textContent=formatScore(final);card.querySelector('[data-combo-raw]').textContent=formatScore(raw);});}
    comboPicker.querySelector('select').onchange=function(){var id=this.value;if(!id)return;if(modal._moduleIdsV21.includes(id)){toast('这个组合已经添加了');this.value='';return;}modal._moduleIdsV21.push(id);renderCombos();this.value='';};modal.addEventListener('input',function(){setTimeout(updateComboScores,0)});renderCombos();
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
  for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=cardNameV21(card);if(!name)return toast('请选择科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);var historical=!configured.has(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:historical?!!card.querySelector('.exclude-total-check-v17')?.checked:false};}
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='保存中…';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}
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
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
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
        return '<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="100" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>';
      }
      function bindRemove(){
        list.querySelectorAll('.remove-subject-v7').forEach(function(button){
          button.onclick=function(){
            var rows=list.querySelectorAll('.subject-config-row-v7');
            if(rows.length<=1)return toast('至少保留 1 个科目');
            var row=button.closest('.subject-config-row-v7');
            if(row)row.remove();
          };
        });
      }
      bindRemove();
      add.onclick=function(){
        var count=list.querySelectorAll('.subject-config-row-v7').length;
        if(count>=20)return toast('最多设置 20 个科目');
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
    /* 版本唯一来源是 index.html 的 meta;此处只读不写(旧逻辑会把 meta 覆写成 v2.0) */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
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
        manual={label:'最近一次真实总分',value:override,exam:exam,delta:previousTotalDeltaV20(exams,i,exam,override,totalScopeSubjectsV20(exam)),deltaLabel:'较上次同口径'};
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
    box.innerHTML=`<div class="manual-total-title-v24"><b>总分计算</b><span>可选手动值</span></div><div class="manual-total-grid-v24"><div class="manual-total-field-v24"><label>最终 / 赋分总分</label><input class="total-actual-override-v24" inputmode="decimal" value="${exam?.total_actual_score??''}" placeholder="自动计算"></div><div class="manual-total-field-v24"><label>原始总分</label><input class="total-raw-override-v24" inputmode="decimal" value="${exam?.total_raw_score??''}" placeholder="自动计算"></div></div><div class="manual-total-note-v24">留空时按本次科目自动汇总；如当地规则需要加权，可直接填写学校给出的总分。<b>手动值会用于记录、趋势和首页最近成绩。</b></div>`;
    var head=totalCard.querySelector('.combo-head-v21');
    if(head)head.insertAdjacentElement('afterend',box);else totalCard.insertBefore(box,totalCard.firstChild);
    var finalInput=box.querySelector('.total-actual-override-v24'),rawInput=box.querySelector('.total-raw-override-v24');
    function refresh(){
      var x=modalAutoTotalsV24(modal);
      finalInput.placeholder=x.final===null?'自动计算':'自动 '+formatScore(x.final);
      rawInput.placeholder=x.raw===null?'自动计算':'自动 '+formatScore(x.raw);
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
    return '<div class="card subject-settings-v7"><div class="subject-settings-head-v7"><div><h3 class="card-title">科目设置</h3><p class="card-sub">在这里添加、改名、删除科目并设置默认满分；保存后会立即同步到“记录考试 → 选择科目”的列表。</p></div><button class="secondary" id="manageSubjectsBtn">管理科目</button></div><div class="subject-chip-list-v7">'+subjects.map(function(item){return '<span class="subject-chip-v7"><b>'+escapeHtml(item.name)+'</b> · 满分 '+formatScore(item.defaultMax)+'</span>';}).join('')+'</div><div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。</div><div class="subject-sync-note-v24"><b>科目设置就是录入时的选择列表。</b> 这里没有的科目不会作为新考试的可选项；历史考试仍保留原数据。</div></div>';
  }

  // Make the settings -> entry-list relationship explicit. The underlying picker already reads
  // state.subjectConfigs; this wording makes the source of truth obvious to users.
  var accountHtmlBeforeV24=accountHtml;
  accountHtml=function accountHtmlV24(){
    var html=accountHtmlBeforeV24();
    if(html.indexOf('subject-settings-v7')===-1){
      // The account page dropped the subject settings card back in v10/v14; restore it here so
      // “账号 → 科目设置” exists again and the manager modal keeps its entry point.
      var card=subjectSettingsCardV24();
      var anchor='<div class="card category-settings-v14">';
      if(html.indexOf(anchor)!==-1)html=html.replace(anchor,card+anchor);
      else html+=card;
    }else{
      html=html.replace(/(<h3 class="card-title">科目设置<\/h3><p class="card-sub">)[\s\S]*?(<\/p>)/,
        '$1在这里添加、改名、删除科目并设置默认满分；保存后会立即同步到“记录考试 → 选择科目”的列表。$2');
      html=html.replace(/(<div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。<\/div>)/,
        '$1<div class="subject-sync-note-v24"><b>科目设置就是录入时的选择列表。</b> 这里没有的科目不会作为新考试的可选项；历史考试仍保留原数据。</div>');
    }
    return html;
  };
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV24=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV24(){
      var result=openSubjectManagerBeforeV24();
      var modal=state.modal;if(!modal)return result;
      var info=modal.querySelector('.info-box');
      if(info)info.innerHTML='<b>这里维护录分科目列表。</b> 可以新增、改名、移除并设置默认满分；保存后，新建/编辑考试里的“选择科目”会直接读取这里。最多 20 个。';
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
    /* 版本唯一来源是 index.html 的 meta;此处只读不写(旧逻辑会把 meta 覆写成 v2.4) */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
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
      .radar-pick-v25 .secondary{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:8px 13px;font-size:12px;cursor:pointer}
      .radar-picked-v25{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .radar-pick-chip-v25{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;color:#556070;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}
      .radar-pick-chip-v25:hover{border-color:#a9b4c8}
      .radar-pick-group-v25{margin:0 0 12px}
      .radar-pick-group-v25 h4{font-size:12px;color:var(--muted);margin:0 0 4px}
      .radar-pick-option-v25{display:flex;align-items:center;gap:8px;padding:9px 2px;font-size:13px;color:var(--text);border-bottom:1px solid var(--line);cursor:pointer}
      .radar-pick-option-v25 input{width:16px;height:16px;accent-color:#5d72e8}
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
  function scopeLabelV25(){return(state.rankScopeV16==='class')?'班排':'年排';}

  // A) 年级/班级总人数的本机记忆与自动填充
  function peopleKeyV25(){return 'st_people_v25_'+(state.user&&state.user.username||'anon');}
  function peopleLoadV25(){
    var raw=localStorage.getItem(peopleKeyV25())||'';var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    return(d&&typeof d==='object')?d:{};
  }
  function peopleSaveV25(d){try{localStorage.setItem(peopleKeyV25(),JSON.stringify(d||{}));}catch(e){}}

  // 首页侧栏概况：次数 / 平均得分率 / 达成目标次数 / 距最近目标分差
  // 得分率用于「平均」（科目数不同可比）；目标达成与差距按同一场考试的原始总分比较（同一场满分相同，分差最直观）
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

  // 组合排名：云端优先，本地兜底（后端 Edge Function 支持 moduleRanks 前先存在本机）
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
      if(input.dataset.userSetV25==='1')return;                 // 用户改过：以用户为准
      if(input.dataset.autoV25!=='1'&&String(input.value||'')!=='')return; // 已有保存值（编辑旧考试）
      input.value=val;input.dataset.autoV25='1';
    }
    fill(modal.querySelector('#totalParticipantsV16'),year);
    fill(modal.querySelector('#totalClassParticipantsV16'),cls);
    modal.querySelectorAll('.year-participants-v16').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.class-participants-v16').forEach(function(i){fill(i,cls);});
    // 组合分的人数空同样自动填（用户改过的不覆盖）
    modal.querySelectorAll('.combo-yp-v25').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.combo-cp-v25').forEach(function(i){fill(i,cls);});
  }
  // C1) 弹窗内文案精简：删纯说明文字，保留必要提示（防误删、状态说明）
  function declutterModalV25(modal){
    if(!modal)return;
    modal.querySelectorAll('.rank-science-box-v7,.rank-compat-v16,.position-note-v17,.template-note-v10').forEach(function(el){el.remove();});
    modal.querySelectorAll('.section-head-v7 p').forEach(function(p){p.remove();});
    // 科目设置弹窗里的「移除不删历史成绩」是必要提示，保留
    if(!modal.querySelector('#subjectConfigList')){
      modal.querySelectorAll('p.form-note').forEach(function(p){p.remove();});
    }
  }
  // C1) 页面文案精简：删冗余介绍，保留必要提示（防误删、功能前缀、空态、图例）
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
        if(inner.indexOf('移除科目')!==-1||inner.indexOf('不会删除历史成绩')!==-1||inner.indexOf('组合：')!==-1)return m;
        return '';
      })
      .replace(/(<div class="card hero-main">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/,'$1看见起伏，也看见自己在进步。$2')
      .replace(/(<div class="page-head">[\s\S]*?<h2>[^<]*<\/h2>)<p>[\s\S]*?<\/p>/g,'$1');
  }

  // ---------- A) optional ranks per combo in the exam modal ----------
  var openExamBeforeV25=openExam;
  openExam=function openExamV25(exam){
    openExamBeforeV25(exam);
    var modal=state.modal;if(!modal)return;

    // A) 年级/班级总人数：一行设置，本机记住，自动填到下面所有人数空（用户改过的不覆盖）
    var entry=modal.querySelector('.rank-entry-mode-v17');
    if(entry&&!modal.querySelector('.people-total-v25')){
      var peopleBox=document.createElement('div');
      peopleBox.className='people-total-v25';
      peopleBox.innerHTML='<div><label>年级总人数</label><input class="pt-year-v25" inputmode="numeric" pattern="[0-9]*" placeholder="如 620"></div><div><label>班级总人数</label><input class="pt-class-v25" inputmode="numeric" pattern="[0-9]*" placeholder="如 45"></div>';
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

    // B) 结束日期（时间段，可选；仅考试记录页展示，趋势图仍用开始日期）
    var dateField=modal.querySelector('#examDate')?.closest('.field');
    if(dateField&&!modal.querySelector('#examEndDateV25')){
      var endField=document.createElement('div');
      endField.className='field end-date-field-v25';
      endField.innerHTML='<label>结束日期（可选）</label><input id="examEndDateV25" type="date" value="'+escapeHtml(exam&&exam.end_date?exam.end_date:'')+'">';
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

    // C1) 弹窗文案精简
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
        '<div><b>年排（可选）</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-yr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="'+escapeHtml(s.yearRank??'')+'">'+
        '<input class="combo-yp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="年级人数" value="'+escapeHtml(s.yearParticipants??'')+'">'+
        '</div></div>'+
        '<div><b>班排（可选）</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-cr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="'+escapeHtml(s.classRank??'')+'">'+
        '<input class="combo-cp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="班级人数" value="'+escapeHtml(s.classParticipants??'')+'">'+
        '</div></div>';
      card.appendChild(block);
      // 输入即缓存：组合卡被重建（增删组合）时已填排名不丢失；用户改过的人数不再被自动填充覆盖
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
      if(r!==null&&(!Number.isInteger(r)||r<1))return rLabel+'请输入正整数';
      if(p!==null&&(!Number.isInteger(p)||p<1))return pLabel+'请输入正整数';
      if(r!==null&&p!==null&&r>p)return rLabel+'不能大于'+pLabel;
      return '';
    }
    for(var id in ranks){
      var r=ranks[id],e=chkPair(r.yearRank,r.yearParticipants,'组合年排名次','年级人数');if(e)return e;
      e=chkPair(r.classRank,r.classParticipants,'组合班排名次','班级人数');if(e)return e;
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
       …82152 tokens truncated…    var rng = C.makeRng(rngSeedBase || 20260101);
    var arls = [];
    for (var r = 0; r < reps; r++) {
      var series = [];
      for (var t = 0; t < 200; t++) series.push(rng.norm());
      var res = ewma(series, opts);
      var firstViol = res.violations.length ? res.violations[0] + 2 : 201;
      arls.push(firstViol);
    }
    return { meanArl0: C.mean(arls), medianArl0: C.median(arls), q10: C.quantile(arls, 0.1) };
  }

  global.PAL = global.PAL || {};
  PAL.ewma = { forecast: forecast, ewmaChart: ewma, simulateArl0: simulateArl0 };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: difficulty.js ---- */
/* ============================================================
 * difficulty.js — 难度推断层：分-位联合的试卷难度形式化检测
 *
 * 问题：排名对卷面难度免疫（严格单调变换不变），分数不是。
 *       某场得分率显著低于「该潜分位所隐含的历史水平」→ 偏难信号。
 *
 * 方法（相对现有产品启发式的三重升级）：
 *  1. 映射曲线 m̂(z)：保序回归 + 线性回归的收缩混合
 *     （κ = n/(n+4)，样本少自动退向全局线性，避免过拟合）；
 *  2. 噪声模型：σ_total² = σ_binomial²(rate) + σ_personal²
 *     其中 σ_personal 由历史残差的 MAD 一致估计 —— 两类噪声源
 *     正交合成，替代原产品的单一自适应阈值；
 *  3. 判定输出为连续 evidence score（证据分数），而非把单学生
 *     数据包装成“试卷难度概率”。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /**
   * 用历史 (z, rate) 对拟合个人映射曲线
   */
  function fitMapping(pairs) {
    var n = pairs.length;
    var iso = C.isotonic(pairs.map(function (p) { return { x: p.z, y: p.rate, w: 1 }; }));
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) { sx += pairs[i].z; sy += pairs[i].rate; sxx += pairs[i].z * pairs[i].z; sxy += pairs[i].z * pairs[i].rate; }
    var den = n * sxx - sx * sx;
    var b = Math.abs(den) > 1e-12 ? (n * sxy - sx * sy) / den : 0;
    var a = sy / n - b * (sx / n);
    function linearAt(z) { return a + b * z; }
    var kappa = n / (n + 4);
    return {
      n: n, kappa: kappa,
      at: function (z) {
        var isoV = iso.sortedX.length > 1 ? C.interpAt(iso.sortedX, iso.sortedFit, z) : NaN;
        // 双保险：保序分支任何非有限值都退回全局线性（保守但绝不输出 NaN）
        if (!isFinite(isoV)) isoV = linearAt(z);
        var v = kappa * isoV + (1 - kappa) * linearAt(z);
        return isFinite(v) ? v : linearAt(z);
      }
    };
  }

  function binomSe(rate, M) {
    return Math.sqrt(Math.max(rate * (1 - rate), 1e-6) / Math.max(M || 100, 10));
  }

  /**
   * 序贯（因果、无泄漏）难度检测：
   * 对每个考试 t，仅用 t 之前的历史拟合映射与噪声尺度。
   * 方差分解：σ_total² = σ_binom² + σ_personal² + σ_map²
   *   σ_map² = σ_personal²·(1−κ)/κ · 外推因子 —— 映射曲线参数
   *   不确定性随历史长度 κ=n/(n+4) 收缩，避免早期过窄的伪显著。
   * @param series [{mainZ:{z,se}, rate, max}] 按时间序
   * @param opts {threshold=1.7, slope=1.1}
   */
  function detectDifficulty(series, opts) {
    opts = opts || {};
    var thr = opts.threshold || 1.7;
    var slopeK = opts.slope || 1.1;
    var out = [];
    var hist = [];
    var pastResid = [];
    for (var t = 0; t < series.length; t++) {
      var cur = series[t];
      if (!cur.mainZ || cur.rate == null || !(cur.max > 0)) { out.push({ valid: false }); continue; }
      if (hist.length >= 3) {
        var map = fitMapping(hist);
        var expected = map.at(cur.mainZ.z);
        var resid = cur.rate - expected;
        // 个人波动尺度：最近 ≤4 个残差的 RMSD（局部、低偏），下限为保守先验。
        // 首个评估点尚无历史残差 → 直接用先验下限（绝不做 0/0）
        var recent = pastResid.slice(-4);
        var personalSd = 0.035;
        if (recent.length > 0) {
          var rss0 = 0;
          for (var rr = 0; rr < recent.length; rr++) rss0 += recent[rr] * recent[rr];
          personalSd = Math.max(Math.sqrt(rss0 / recent.length), 0.035);
        }
        if (!isFinite(personalSd)) personalSd = 0.035;
        var sdTot = Math.sqrt(binomSe(cur.rate, cur.max) ** 2 + personalSd * personalSd);
        var finalZ = resid / sdTot;
        // 偏难：得分率低于潜分位隐含水平 → resid<0 → finalZ 负
        var pHard = C.sigmoid(-slopeK * (finalZ + thr));
        var pEasy = C.sigmoid(slopeK * (finalZ - thr));
        out.push({
          valid: true,
          expectedRate: expected,
          rate: cur.rate,
          resid: resid,
          sdTotal: sdTot,
          personalSd: personalSd,
          z: finalZ,
          pHard: pHard,
          pEasy: pEasy,
          evidenceHard: pHard,
          evidenceEasy: pEasy,
          verdict: pHard > 0.6 ? 'hard' : (pEasy > 0.6 ? 'easy' : 'normal'),
          mappingN: hist.length,
          shrinkage: map.kappa
        });
        pastResid.push(resid);
      } else {
        out.push({ valid: false, reason: 'insufficient-history' });
      }
      hist.push({ z: cur.mainZ.z, rate: cur.rate });
    }
    return out;
  }

  global.PAL = global.PAL || {};
  PAL.difficulty = { fitMapping: fitMapping, detectDifficulty: detectDifficulty, binomSe: binomSe };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: alerts.js ---- */
/* ============================================================
 * alerts.js — 推断层：洞察流的 FDR 多重检验控制
 *
 * 产品每次生成 N 条「提醒」（趋势/退步/难度/失常），若各自按
 * α=0.05 判定，族错误率随 N 线性膨胀。Benjamini–Hochberg (1995)
 * step-up 过程控制错误发现率（FDR）≤ q，让洞察流拥有显式的
 * 「误报预算」—— 这是把规则引擎升级为统计推断的关键一步。
 * ============================================================ */
(function (global) {
  'use strict';

  /**
   * BH step-up
   * @param tests [{id, p, ...}]  p 缺失的项直接放行（不参与校正）
   * @param q 目标 FDR 水平（默认 0.10）
   * @returns {rejected: Set(id), adjusted: Map(id→q_adj)}
   */
  function bhFdr(tests, q) {
    q = q == null ? 0.10 : q;
    var valid = tests.filter(function (t) { return typeof t.p === 'number' && t.p === t.p; });
    var sorted = valid.slice().sort(function (a, b) { return a.p - b.p; });
    var m = sorted.length;
    var rejected = {}, kMax = -1, adj = {};
    if (m) {
      for (var k = m - 1; k >= 0; k--) {
        var crit = (k + 1) / m * q;
        if (sorted[k].p <= crit) { kMax = k; break; }
      }
      // step-up：所有 ≤ kMax 的都拒绝
      var prev = 1;
      for (k = m - 1; k >= 0; k--) {
        var raw = sorted[k].p * m / (k + 1);
        prev = Math.min(prev, raw);
        adj[sorted[k].id] = Math.min(prev, 1);
        if (k <= kMax) rejected[sorted[k].id] = true;
      }
    }
    return { rejected: rejected, adjusted: adj, m: m };
  }

  global.PAL = global.PAL || {};
  PAL.alerts = { bhFdr: bhFdr };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: goals.js ---- */
/* ============================================================
 * goals.js — 决策层：概率化目标校准
 *
 * 把「下次要进前 X%」从口号变成带概率的决策问题：
 *   可达性  = P(z_next ≥ z_target | 历史轨迹, 测量噪声)
 *   推荐目标 = 后验预测分布的 (1−aspiration) 分位对应的位次
 *   分数换算 = 经个人映射曲线 m̂(z) + 难度中性化
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /**
   * @param pred   dynamics.robustFilter 的 predictive
   * @param targetPctile 目标位比百分数（如 20 表示前 20%）
   */
  function feasibility(pred, targetPctile) {
    // 约定：潜分 z 越大越好。前 x% ⇔ cohort 中领先比例 ≥ 1−x/100 ⇔ z ≥ Φ⁻¹(1−x/100)
    var zTarget = C.invNorm(1 - targetPctile / 100);
    return {
      zTarget: zTarget,
      prob: PAL.dynamics.probReach(pred, zTarget)
    };
  }

  /* 给定抱负水平（如 0.6），推荐「六成把握冲得到」的目标位比：
     目标达成概率 = 后验预测生存函数，解 survival(z*) = aspiration，
     z* 位于预测中位之下（比典型水平略松、跳一跳够得着） */
  function recommend(pred, aspiration) {
    aspiration = aspiration == null ? 0.6 : aspiration;
    var zStar = PAL.dynamics.predQuantile(pred, aspiration);
    // z → 位比：P(cohort ≥ z)，正态假设下
    var pctile = 100 * (1 - C.normCdf(zStar));
    return { aspiration: aspiration, z: zStar, targetPercentile: pctile };
  }

  /* 目标分数换算：经个人映射曲线 + 该场难度中性化 */
  function scoreForTarget(mappingFit, targetPctile, difficultyOffset) {
    if (!mappingFit || mappingFit.n < 3) return null;
    var z = C.invNorm(1 - targetPctile / 100);
    var rate = mappingFit.at(z) + (difficultyOffset || 0);
    return { z: z, expectedRate: Math.min(Math.max(rate, 0), 1) };
  }

  global.PAL = global.PAL || {};
  PAL.goals = { feasibility: feasibility, recommend: recommend, scoreForTarget: scoreForTarget };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: pipeline.js ---- */
/* ============================================================
 * pipeline.js — 端到端分析流水线
 *
 * 输入：某学生某科（或总分）的时间序列观测
 *   [{ date, rank, N, classRank, classN, score, max }]
 * 输出：结构化分析报告 —— 每条结论都携带方法、统计量与不确定性，
 *       并经 BH-FDR 统一控制误报预算。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  function analyzeSeries(observations, opts) {
    opts = opts || {};
    var report = { n: observations.length, valid: observations.length >= 2 };
    /* t 分布分位数（二分求逆）：展示区间与目标概率同用 Student-t 参照 */
    function tQuant(df, prob) {
      var lo = -12, hi = 12;
      for (var b = 0; b < 60; b++) {
        var mid = (lo + hi) / 2;
        if (PAL.core.tCdf(mid, df) < prob) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    /* 1. 测量层 */
    var zs = [];
    for (var i = 0; i < observations.length; i++) {
      var o = observations[i];
      var pos = PAL.measurement.positionToZ(o.rank, o.N);
      if (!pos) continue;
      zs.push({
        z: pos.z, se: pos.se, p: pos.p,
        rate: o.max ? o.score / o.max : null,
        max: o.max || null,
        date: o.date, label: o.label || ('#' + (i + 1))
      });
    }
    if (zs.length < 2) { report.valid = false; report.reason = '有效位比观测不足'; return report; }
    report.series = zs;

    /* 透明点预测基线：直接平滑原始位比。它只回答“下一场参考落点”，
       与后面的状态模型、区间和目标概率保持职责分离。 */
    report.ewmaForecast = PAL.ewma.forecast(observations.map(function (d) {
      return 100 * d.rank / d.N;
    }), opts.ewmaForecastAlpha == null ? 0.40 : opts.ewmaForecastAlpha);

    /* 2. 动态层：稳健滤波（第一遍）+ BOCPD + 干预后重滤波
       机制：BOCPD 判定体制切换的场次的下一场，对 DLM 执行协方差膨胀干预，
       使水平估计快速跳到新体制，消除突变后的滞后偏差（West & Harrison 干预分析） */
    /* 消融开关仅用于 research 回测：seWeighting=false 时给所有观测
       相同标准误，检验参考人数带来的异方差权重是否真正有贡献。 */
    var commonSe = opts.commonSe != null ? opts.commonSe : 0.10;
    var zObs = zs.map(function (d) {
      return { z: d.z, se: opts.seWeighting === false ? commonSe : d.se };
    });
    var filt1 = PAL.dynamics.robustFilter(zObs, opts.filter);
    var cp = PAL.bocpd.run(zs.map(function (d) { return d.z; }), opts.bocpd);
    /* 干预门控：仅当「疑似断点之前存在已确立的体制」（MAP 游程≥5）
       且越过预热期时才触发，避免冷启动期 rc≡1 造成伪干预 */
    var interventions = zs.map(function (_, t) {
      if (t < 6) return false;
      return cp.recentChangeProb[t - 1] > (opts.interventionThreshold || 0.5) &&
        cp.mapRunLength[t - 2] >= 5;
    });
    /* 趋势检验（原始 z 序列）——同时作为趋势阻尼的证据门控 */
    var zVals = zs.map(function (d) { return d.z; });
    var mkRaw = PAL.trendTest.mannKendall(zVals);
    var filt = PAL.dynamics.robustFilter(zObs, {
      filter: null,
      discountMu: opts.filter && opts.filter.discountMu,
      discountBeta: opts.filter && opts.filter.discountBeta,
      df: opts.filter && opts.filter.df,
      iters: opts.filter && opts.filter.iters,
      interventions: interventions,
      /* 证据门控趋势阻尼：仅当原始 z 序列存在显著趋势（E2 验证的
         Mann–Kendall 检验）时保留外推，否则完全放弃——真实回测显示
         无证据动量在均值回归下反向，φ=0 的 MAE 与方向均最优（§4.5） */
      damping: opts.trend === false ? 0 :
        (mkRaw.valid && mkRaw.significant ? 0.7 : 0)
    });
    report.filter = filt;
    report.filterFirstPass = filt1;
    report.interventions = interventions;
    report.changepoint = cp;
    report.trend = {
      mk: mkRaw,
      ols: PAL.trendTest.olsTrend(zVals)
    };

    /* 5. EWMA 渐进劣化预警：用一步预测标准化残差 */
    var stdResid = [];
    for (i = 0; i < zs.length; i++) {
      if (i === 0 || !filt.preds || !filt.preds[i - 1]) { stdResid.push(0); continue; }
      var pr = filt.preds[i - 1];
      var r = zs[i].z - pr.f;
      stdResid.push(r / Math.sqrt(Math.max(pr.q, 1e-9)));
    }
    report.stdResiduals = stdResid;
    report.ewma = PAL.ewma.ewmaChart(stdResid.slice(1), opts.ewma);

    /* 5b. 滚动共形校准 + 先验收缩（真实回测 §4.5 的修复，默认开启）
       残差以前向预测尺度为参照（与部署预测同一参照系）。
       k̂ = 序列过去 |残差| 的 Q(conformalQ) 分位数；历史 <5 时向
       保守总体先验 conformalPriorK 收缩：k = (m·k_m + W·K_p)/(m+W)。
       只放宽不收紧（k≥1）。合成实验可用 opts.conformal=false 关闭 */
    var pred = filt.predictive;
    var absR = [];
    if (pred && filt.predScales && filt.preds) {
      for (i = 1; i < zs.length; i++) {
        if (!filt.preds[i - 1] || !filt.predScales[i]) continue;
        var eC = zs[i].z - filt.preds[i - 1].f;
        if (isFinite(eC)) absR.push(Math.abs(eC) / filt.predScales[i]);
      }
    }
    if (pred && opts.conformal !== false && absR.length >= 1) {
      absR.sort(function (a, b) { return a - b; });
      var cq = opts.conformalQ || 0.95;
      var qIdx = Math.min(absR.length - 1, Math.floor(cq * absR.length));
      /* 先验来自 database0 全库回测的经验定标（用户已知情同意）：
         达到名义95%覆盖需要的尺度因子中位约 6；收缩权重 W=8 */
      var W = opts.conformalPriorW != null ? opts.conformalPriorW : 8;
      var Kp = opts.conformalPriorK != null ? opts.conformalPriorK : 6;
      var m0 = absR.length;
      var kq = (m0 * absR[qIdx] + W * Kp) / (m0 + W);
      kq = Math.max(1, Math.min(kq, 14));
      if (isFinite(kq)) {
        /* kq 是「半宽倍数」：目标半宽 = kq·scaleRaw。
           消费者约定 scale 配标准 t 分位数使用，
           故换算 scaleNew = kq/t_{0.975,df} · scaleRaw，
           并限制收缩幅度（最多收到原尺度的 0.8 倍） */
        var tqLo = -8, tqHi = 8;
        for (var bi = 0; bi < 50; bi++) {
          var bm = (tqLo + tqHi) / 2;
          if (C.tCdf(bm, pred.df) < 0.975) tqLo = bm; else tqHi = bm;
        }
        var tq = (tqLo + tqHi) / 2;
        var ratio = kq / tq;
        ratio = Math.max(ratio, 0.8);
        pred.scaleRaw = pred.scale;
        pred.scale = pred.scale * ratio;
        pred.conformalK = kq;
        pred.calibrated = m0 >= 5; // 达到完全校准门槛（未达=先验主导）
      }
    }

    /* 6. 下一场后验预测的展示量（用校准后的尺度；t 分位与推断层一致） */
    if (pred) {
      var tq95 = tQuant(pred.df, 0.975);
      report.nextExam = {
        medianZ: pred.location,
        ci95: [
          pred.location - tq95 * pred.scale,
          pred.location + tq95 * pred.scale
        ],
        medianPercentile: 100 * (1 - C.normCdf(pred.location)),
        ci95Percentile: [
          100 * (1 - C.normCdf(pred.location + tq95 * pred.scale)),
          100 * (1 - C.normCdf(pred.location - tq95 * pred.scale))
        ]
      };
    }

    /* 7. 难度推断（有分数时） */
    if (zs.some(function (d) { return d.rate != null; })) {
      report.difficulty = PAL.difficulty.detectDifficulty(
        zs.map(function (d) { return { mainZ: { z: d.z, se: d.se }, rate: d.rate, max: d.max }; })
      );
    }

    /* 8. 目标校准 */
    if (filt.predictive && opts.targetPercentile != null) {
      report.goal = PAL.goals.feasibility(filt.predictive, opts.targetPercentile);
      report.recommendedGoal = PAL.goals.recommend(filt.predictive, opts.aspiration);
    }

    return report;
  }

  /**
   * 组合级分析：多科报告 + FDR 控制的洞察流
   * @param bySubject { 科目名: observations[] }
   * @param targets { 科目名: 目标前% } 可选
   */
  function analyzePortfolio(bySubject, targets, opts) {
    opts = opts || {};
    var reports = {}, tests = [];
    Object.keys(bySubject).forEach(function (s) {
      var rep = analyzeSeries(bySubject[s], { targetPercentile: targets && targets[s] });
      reports[s] = rep;
      if (!rep.valid) return;
      if (rep.trend.mk.valid) tests.push({ id: 'trend:' + s, kind: 'trend', subject: s, p: rep.trend.mk.p, direction: rep.trend.mk.direction });
      rep.changepoint.changeProb.forEach(function (pc, t) {
        if (t > 0 && pc > 0.35) tests.push({ id: 'cp:' + s + ':' + t, kind: 'changepoint', subject: s, index: t, p: Math.min(pc, 0.999), prob: pc });
      });
      if (rep.ewma.violations.length) {
        // EWMA 违限的近似 p：正态尾（保守）
        rep.ewma.violations.forEach(function (v) {
          var zz = rep.ewma.z[v] / (rep.ewma.L / 3);
          var pv = 2 * (1 - C.normCdf(Math.abs(zz)));
          tests.push({ id: 'ewma:' + s + ':' + v, kind: 'decline-early-warning', subject: s, index: v, p: Math.max(pv, 1e-6), ewmaZ: rep.ewma.z[v] });
        });
      }
      if (rep.difficulty) {
        rep.difficulty.forEach(function (d, t) {
          if (d.valid && d.verdict !== 'normal') {
            // 单侧检验：H0=正常卷 → 残差 z 服从 N(0,1)。
            // p = Φ(z)（偏难）或 Φ(−z)（偏易），与 E4 操作曲线度量一致；
            // 校准概率 pHard/pEasy 仅作为展示层输出，不参与检验换算。
            var pvDiff = d.verdict === 'hard' ? C.normCdf(d.z) : 1 - C.normCdf(d.z);
            tests.push({ id: 'diff:' + s + ':' + t, kind: 'difficulty', subject: s, index: t, p: Math.min(Math.max(pvDiff, 1e-6), 0.999), verdict: d.verdict, pHard: d.pHard, pEasy: d.pEasy, z: d.z });
          }
        });
      }
    });
    var fdr = PAL.alerts.bhFdr(tests, opts.fdrQ);
    var insights = tests.map(function (t) {
      var copy = {};
      for (var k in t) copy[k] = t[k];
      copy.passesFdr = !!fdr.rejected[t.id];
      copy.qAdj = fdr.adjusted[t.id];
      return copy;
    });
    return { reports: reports, insights: insights, fdrQ: opts.fdrQ || 0.10, nTests: tests.length };
  }

  global.PAL = global.PAL || {};
  PAL.pipeline = { analyzeSeries: analyzeSeries, analyzePortfolio: analyzePortfolio };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* deep-beta-main.js · 深度分析(Beta) 主源码 —— 由 build-deep-beta.js 与 research 内核合成 app-v34.js
   挂载方式:不占一级导航;作为区块追加在现有「统计分析」页底部,
   用 MutationObserver 跟随统计页内部重渲染自愈。
   算法细节默认折叠(<details>),用户点开才展开 */
"use strict";
(function () {
  if (window.__v34main) return;
  window.__v34main = 1;

  var P2 = window.PAL2 || window.PAL;
  var C = P2.core;

  /* ---------- 基础 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function n34(v) { var x = typeof v === "string" ? parseFloat(v) : v; return (typeof x === "number" && isFinite(x)) ? x : null; }
  function track(ev, meta) { try { if (typeof window.__stTrack === "function") window.__stTrack(ev, meta || {}); } catch (e) { } }

  /* ---------- 数据适配(对齐 app-v32 字段口径) ---------- */
  function prodExams() {
    try { if (typeof allExamsV32 === "function") return allExamsV32() || []; } catch (e) { }
    try { var s = state; if (s && s.exams) return s.exams || []; } catch (e) { }
    return [];
  }
  function obsTotal(exams) {
    var out = [];
    (exams || []).forEach(function (e) {
      if (e.is_hidden) return;
      var r = n34(e.total_rank), n = n34(e.total_participants);
      if (r === null || !n || r < 1) return;
      out.push({ rank: r, N: n, date: e.exam_date || "", label: e.name || "" });
    });
    return out;
  }
  function obsSubject(exams, subj) {
    var out = [];
    (exams || []).forEach(function (e) {
      if (e.is_hidden) return;
      var row = (e.scores || {})[subj];
      if (!row) return;
      var r = n34(row.rank);
      var n = n34(row.participants); if (n === null) n = n34(e.total_participants);
      if (r === null || !n || r < 1) return;
      var o = { rank: r, N: n, date: e.exam_date || "", label: e.name || "" };
      var a = n34(row.actual), m = n34(row.max);
      if (a !== null && m) { o.score = a; o.max = m; }
      out.push(o);
    });
    return out;
  }
  function subjectList(exams) {
    var seen = {}, out = [];
    (exams || []).forEach(function (e) {
      Object.keys(e.scores || {}).forEach(function (s) {
        if (!seen[s]) {
          var ok = obsSubject([e], s).length > 0;
          if (ok) { seen[s] = 1; out.push(s); }
        }
      });
    });
    return out;
  }

  /* ---------- 数学小件 ---------- */
  function probit(p) { /* Acklam 逆正态 */
    if (p <= 0) return -8; if (p >= 1) return 8;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
        b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
        c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
        d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00],
        pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /* ---------- 影子日志 ---------- */
  var LS_SHADE = "st_deep_beta_log";
  function pushShadow(rec) {
    try {
      var arr = [];
      try { arr = JSON.parse(localStorage.getItem(LS_SHADE) || "[]"); } catch (e) { }
      rec.t = Date.now();
      arr.push(rec);
      while (arr.length > 200) arr.shift();
      localStorage.setItem(LS_SHADE, JSON.stringify(arr));
    } catch (e) { }
  }

  /* ---------- 状态 ---------- */
  var S = { cur: "__total__", goalPct: 20, distBin: 5, zmapBins: 20, view: "band" };
  var REP = null; /* 当前报告缓存,供交互处理器使用 */

  /* 生产冻结配置。区间先验取五折 user-level 校准中 no-SE 版本的
     Kp95 均值，W 在五折中均选择 4。研究代码仍保留 SE 消融入口，
     生产默认采用当前真实回测中区间效率更好的 no-SE 配置。 */
  var PROD_ANALYSIS_OPTS = {
    seWeighting: false,
    ewmaForecastAlpha: 0.40,
    conformalPriorK: 4.539237871385978,
    conformalPriorW: 4
  };
  function analyzeProd(obs) {
    return P2.pipeline.analyzeSeries(obs, PROD_ANALYSIS_OPTS);
  }

  /* ---------- 历史滚动预测回显 ---------- */
  function walkForward(obs) {
    var out = [];
    for (var k = 4; k < obs.length; k++) {
      try {
        var r = analyzeProd(obs.slice(0, k));
        if (!r || !r.valid || !r.nextExam) continue;
        var ne = r.nextExam;
        var act = obs[k].rank / obs[k].N * 100;
        out.push({ k: k, mid: ne.medianPercentile,
          lo: ne.ci95Percentile[0], hi: ne.ci95Percentile[1],
          act: act, inside: act >= ne.ci95Percentile[0] && act <= ne.ci95Percentile[1] });
      } catch (e) { }
    }
    return out;
  }

  /* ---------- 下场位置概率分布(视图:名次段 / 发挥标尺 / 累计) ---------- */
  function dViewChips() {
    var views = [
      { k: "band", t: "名次段" }, { k: "zmap", t: "发挥标尺" }, { k: "cum", t: "累计概率" }
    ];
    return '<span class="label">视图：</span>' +
      views.map(function (v) {
        return '<button type="button" class="' + chipCls(S.view === v.k) +
          '" data-dsb-view="' + v.k + '">' + v.t + '</button>';
      }).join('');
  }
  function dModeAndGoalMarks(rep, xOf, ihG) {
    /* 状态模型中心(中位)与目标的虚线标注 */
    var md = rep.nextExam ? rep.nextExam.medianPercentile : null;
    var out = "";
    if (md != null && md > 0.3 && md < 99.7) {
      var mx = xOf(md);
      out += '<line x1="' + mx.toFixed(1) + '" y1="4" x2="' + mx.toFixed(1) +
        '" y2="' + (20 + ihG) + '" stroke="#4a90d9" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>' +
        '<text x="' + (mx + 4).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">模型中心 前' +
        pct1(md) + '%</text>';
    }
    var gx = xOf(S.goalPct);
    out += '<line x1="' + gx.toFixed(1) + '" y1="4" x2="' + gx.toFixed(1) +
      '" y2="' + (20 + ihG) + '" stroke="#d4574e" stroke-width="1.4" stroke-dasharray="4 3"/>' +
      '<text x="' + (gx + 4).toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' +
      S.goalPct + '%</text>';
    return out;
  }
  function distBlock(rep) {
    var pred = rep.filter.predictive;
    var W = 720, H = 158, padL = 30, padR = 10, padB = 18;
    var iw = W - padL - padR, ih = H - padB - 14;
    var view = S.view || "band";
    var bin = S.distBin || 5;
    var B = Math.round(100 / bin), bw = iw / B;
    var svg = "", caption = "";
    var zT = probit(1 - S.goalPct / 100);
    var pGoal = P2.dynamics.probReach(pred, zT);
    var md = rep.nextExam ? rep.nextExam.medianPercentile : null;

    if (view === "zmap") {
      /* 发挥标尺视图:横轴=标准分标尺,每根柱=相等的一段「发挥距离」,
         柱高=该发挥段命中概率 → 柱与柱完全可比,峰即最可能点 */
      var zTop = 4, zBot = -4, zRange = zTop - zBot;
      var NB = S.zmapBins || 20, zBin = zRange / NB;
      var xOfZ = function (z) { return padL + iw * (zTop - z) / zRange; };
      var xOfP = function (p) {
        var z = probit(1 - p / 100);
        return clampX(xOfZ(z));
      };
      function clampX(x) { return Math.max(padL, Math.min(padL + iw, x)); }
      var maxP2 = 0, zbars = [];
      for (var kz = 0; kz < NB; kz++) {
        var zA = zTop - kz * zBin, zB = zA - zBin; /* zA(高位) > zB(低位) */
        var pMass = Math.max(0, C.tCdf((zA - pred.location) / pred.scale, pred.df) -
          C.tCdf((zB - pred.location) / pred.scale, pred.df));
        zbars.push({ p: pMass, x0: xOfZ(zA), x1: xOfZ(zB) });
        if (pMass > maxP2) maxP2 = pMass;
      }
      var barsZ = "";
      var goalZ = probit(1 - S.goalPct / 100);
      for (kz = 0; kz < NB; kz++) {
        var hg = ih * (zbars[kz].p / (maxP2 || 1));
        var isGoal = zbars[kz].x1 >= xOfZ(goalZ) - .5; /* 柱的右侧(更好侧)达到目标线 */
        barsZ += '<rect x="' + (zbars[kz].x0 + .5).toFixed(1) + '" y="' + (20 + ih - hg).toFixed(1) +
          '" width="' + Math.max(zbars[kz].x1 - zbars[kz].x0 - 1, .8).toFixed(1) +
          '" height="' + Math.max(hg, .6).toFixed(1) +
          '" rx="1.5" fill="' + (isGoal ? '#4a90d9' : 'currentColor') +
          '" opacity="' + (isGoal ? '.6' : '.22') + '"/>';
        var pvZ = zbars[kz].p * 100;
        if (pvZ >= 3.5) barsZ += '<text x="' + ((zbars[kz].x0 + zbars[kz].x1) / 2).toFixed(1) +
          '" y="' + (16 + ih - hg).toFixed(1) + '" font-size="8" text-anchor="middle" ' +
          'fill="currentColor" opacity=".6">' + pvZ.toFixed(1) + '%</text>';
      }
      /* 名次刻度:按各自在"发挥标尺"上的真实位置标注 */
      var ticks = [0, 0.5, 1, 2.5, 5, 10, 20, 30, 50, 70, 90, 99.5, 100];
      var labelsZ = "", prevX = null;
      ticks.forEach(function (tk) {
        var px = xOfP(tk);
        if (px <= padL - .5 || px >= padL + iw + .5) return;
        if (prevX !== null && px - prevX < 12) { prevX = px; return; }
        prevX = px;
        labelsZ += '<text x="' + px.toFixed(1) + '" y="' + (H - 4) +
          '" font-size="8.2" text-anchor="middle" fill="currentColor" opacity=".45">前' +
          (tk < 1 ? String(tk) : Math.round(tk)) + '%</text>';
      });
      var mdX = md != null ? clampX(xOfP(md)) : null;
      var marksZ = "";
      if (mdX !== null) {
        marksZ += '<line x1="' + mdX.toFixed(1) + '" y1="4" x2="' + mdX.toFixed(1) +
          '" y2="' + (20 + ih) + '" stroke="#4a90d9" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>' +
          '<text x="' + Math.min(mdX + 4, W - 90).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">模型中心 前' +
          pct1(md) + '%</text>';
      }
      var gxZ = clampX(xOfP(S.goalPct));
      marksZ += '<line x1="' + gxZ.toFixed(1) + '" y1="4" x2="' + gxZ.toFixed(1) +
        '" y2="' + (20 + ih) + '" stroke="#d4574e" stroke-width="1.4" stroke-dasharray="4 3"/>' +
        '<text x="' + (gxZ + 4).toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' +
        S.goalPct + '%</text>';
      svg = barsZ + labelsZ + marksZ;
      caption = '横轴=「发挥距离」标尺：同样 2 个名次点，越靠前对应的发挥距离越大（名次刻度按真实位置标注）。' +
        '每根柱宽度 = <b>相等的一段发挥距离</b>，柱高 = 该发挥段的命中概率；柱与柱完全可比，' +
        '<span style="color:#4a90d9">最高柱=状态模型中心</span>。蓝色柱=达成目标前' + S.goalPct +
        '% 的区域。当前分为 <b>' + NB + ' 格</b>；调细只会显示更多局部起伏，不会改变预测结果';
    } else if (view === "cum") {
      /* 累计概率视图:曲线=「落到前X%以内」的总概率,直接读数 */
      var cumPts = "", cumY = [], midY = null;
      for (var cp = 0; cp <= 100; cp += 1) {
        var zC = probit(1 - cp / 100);
        var cum = 1 - C.tCdf((zC - pred.location) / pred.scale, pred.df);
        var cyY = 20 + ih - ih * Math.min(Math.max(cum, 0), 1);
        cumPts += (cp ? " L" : "M") + (padL + iw * cp / 100).toFixed(1) + "," + cyY.toFixed(1);
        cumY.push(cum);
      }
      var cumSvg = '<path d="' + cumPts + '" fill="none" stroke="#4a90d9" stroke-width="1.8" opacity=".9"/>';
      var gxCum = padL + iw * (S.goalPct / 100);
      var cumGoal = cumY[S.goalPct];
      var yGCum = 20 + ih - ih * cumGoal;
      var gxC = gxCum + 4;
      var marksCum =
        '<line x1="' + gxCum.toFixed(1) + '" y1="4" x2="' + gxCum.toFixed(1) +
        '" y2="' + (20 + ih) + '" stroke="#d4574e" stroke-width="1.3" stroke-dasharray="4 3"/>' +
        '<line x1="' + gxCum.toFixed(1) + '" y1="' + yGCum.toFixed(1) + '" x2="' + (padL + iw + 30) +
        '" y2="' + yGCum.toFixed(1) + '" stroke="#d4574e" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>' +
        '<text x="' + gxC.toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' + S.goalPct +
        '% → ' + Math.round(cumGoal * 100) + '%</text>';
      if (md != null) {
        var mXC = padL + iw * md / 100;
        var y50 = 20 + ih - ih * 0.5;
        marksCum += '<line x1="' + mXC.toFixed(1) + '" y1="' + y50.toFixed(1) + '" x2="' + (padL + iw + 30) +
          '" y2="' + y50.toFixed(1) + '" stroke="#4a90d9" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>' +
          '<line x1="' + mXC.toFixed(1) + '" y1="4" x2="' + mXC.toFixed(1) + '" y2="' + (20 + ih) +
          '" stroke="#4a90d9" stroke-width="1.1" stroke-dasharray="3 3" opacity=".8"/>' +
          '<text x="' + (mXC + 4).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">' +
          '曲线过半点 = 模型中心 前' + pct1(md) + '%</text>';
      }
      var labelsCum = "";
      [0, 10, 20, 25, 50, 75, 90, 100].forEach(function (tk) {
        labelsCum += '<text x="' + (padL + iw * tk / 100).toFixed(1) + '" y="' + (H - 4) +
          '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">前' + tk + '%</text>';
      });
      svg = cumSvg + labelsCum + marksCum;
      caption = '曲线 = 「落到前X%以内」的累计命中概率：在横轴找目标名次、沿竖线到曲线、再横着读概率（如考进前' + S.goalPct +
        '% ≈ <b>' + Math.round(cumGoal * 100) + '%</b>）。曲线爬过 50% 横线的点 = 状态模型中心（' + (md != null ? '前' + pct1(md) + '%' : '暂无') + '）。';
    } else {
      /* 名次段视图(默认):柱=该名次段命中概率,柱高=柱顶数字;蓝色密度曲线峰=最可能点 */
      var bars = "", labelsB = "", curve = "";
      var maxP = 0, probs = [], dens = [];
      for (var j = 0; j < B; j++) {
        var a = j * bin, b = a + bin;
        var za = probit(1 - b / 100), zb = probit(1 - a / 100);
        var zw = Math.max(zb - za, 1e-9);
        var p = Math.max(0, C.tCdf((zb - pred.location) / pred.scale, pred.df) -
          C.tCdf((za - pred.location) / pred.scale, pred.df));
        probs.push(p); dens.push({ d: p / zw, p: p });
        if (p > maxP) maxP = p;
      }
      var cs = 1, maxCd = 0, cys = [];
      for (var cj = 0; cj < 100 / cs; cj++) {
        var ca = cj * cs, cb = ca + cs;
        var cza = probit(1 - cb / 100), czb = probit(1 - ca / 100);
        var cw = Math.max(czb - cza, 1e-9);
        var cp2 = Math.max(0, C.tCdf((czb - pred.location) / pred.scale, pred.df) -
          C.tCdf((cza - pred.location) / pred.scale, pred.df));
        var cd = cp2 / cw;
        cys.push(cd);
        if (cd > maxCd) maxCd = cd;
      }
      for (cj = 0; cj < cys.length; cj++) {
        var cyy = 20 + ih - ih * (cys[cj] / (maxCd || 1));
        curve += (cj ? " L" : "M") + (padL + iw * ((cj * cs + cs / 2) / 100)).toFixed(1) + "," + cyy.toFixed(1);
      }
      var curveSvg = '<path d="' + curve + '" fill="none" stroke="#4a90d9" ' +
        'stroke-width="1.6" opacity=".85"/>';
      for (j = 0; j < B; j++) {
        var hgt = ih * (probs[j] / (maxP || 1));
        var bx = (padL + j * bw + 1).toFixed(1);
        bars += '<rect x="' + bx + '" y="' + (20 + ih - hgt).toFixed(1) +
          '" width="' + (bw - 2).toFixed(1) + '" height="' + Math.max(hgt, .5).toFixed(1) +
          '" rx="2" fill="currentColor" opacity=".22"/>';
        var pv = probs[j] * 100;
        if (bw >= 22 || pv >= maxP * 100 * 0.35) {
          var txt = (pv >= 9.95 ? pv.toFixed(0) : pv.toFixed(1)) + "%";
          bars += '<text x="' + (padL + j * bw + bw / 2).toFixed(1) + '" y="' +
            (16 + ih - hgt).toFixed(1) + '" font-size="8.2" text-anchor="middle" ' +
            'fill="currentColor" opacity=".62">' + txt + "</text>";
        }
      }
      var stepLbl = Math.max(bin, 10);
      for (j = 0; j <= B; j += stepLbl / bin) {
        labelsB += '<text x="' + (padL + j * bw).toFixed(1) + '" y="' + (H - 4) +
          '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">前' +
          Math.round(j * bin) + '%</text>';
      }
      var xOfPct = function (p) { return padL + iw * p / 100; };
      svg = bars + curveSvg + labelsB + dModeAndGoalMarks(rep, xOfPct, ih);
      caption = '柱子 = 该名次段的命中概率（柱高=柱顶数字）；<b style="color:#4a90d9">蓝色曲线</b> = 状态模型概率密度，峰值对应<b>模型中心</b>（蓝色虚线处）。' +
        '命中前' + S.goalPct + '% 的概率 ≈ <b>' + Math.round(pGoal * 100) + '%</b>';
    }
    var binChips = view === "band"
      ? [2, 3, 5, 10].map(function (bn) {
        return '<button type="button" class="' + chipCls(bin === bn) +
          '" data-dsb-bin="' + bn + '">每格' + bn + '%</button>';
      }).join('')
      : "";
    var zBinChips = view === "zmap"
      ? [
        { n: 10, t: "较粗", tip: "10格，轮廓更平滑" },
        { n: 20, t: "标准", tip: "20格，兼顾轮廓和细节" },
        { n: 40, t: "较细", tip: "40格，显示更多局部细节" }
      ].map(function (opt) {
        return '<button type="button" class="' + chipCls((S.zmapBins || 20) === opt.n) +
          '" data-dsb-zbins="' + opt.n + '" aria-pressed="' + ((S.zmapBins || 20) === opt.n) +
          '" title="' + opt.tip + '">' + opt.t + '</button>';
      }).join('')
      : "";
    return '<div class="combo-chips-v25" style="margin-bottom:8px">' + dViewChips() +
      (view === "band"
        ? '<span class="label">细度：</span>' + binChips
        : view === "zmap"
          ? '<span class="label">细度：</span>' + zBinChips
          : '<span class="label" style="opacity:.55">视图间可切换</span>') +
      '</div>' +
      '<div class="dsb-scroll"><svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:760px;display:block;color:inherit">' +
      svg + "</svg></div>" +
      '<div class="dsb-fig-cap">' + caption + '</div>';
  }
  function renderDistInto() {
    var wrap = $("#dsbDistWrap");
    if (wrap && REP) wrap.innerHTML = distBlock(REP);
  }

  /* ---------- 格式化 ---------- */
  function pct1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function pct0(v) { return Math.round(v).toFixed(0); }
  function fs2(v) { return (v >= 0 ? "+" : "") + v.toFixed(2); }

  function details(title, bodyHtml, open) {
    return '<details' + (open ? ' open' : '') + ' style="margin-top:10px">' +
      '<summary style="cursor:pointer;font-size:13px;opacity:.72;user-select:none">' +
      title + '</summary>' +
      '<div style="padding:8px 2px 2px">' + bodyHtml + '</div></details>';
  }

  /* ---------- 卡片(全部收进 details 的算法区) ---------- */
  function trendDetails(rep) {
    var mk = rep.trend.mk;
    var senTxt = "";
    if (mk.valid && mk.senSlope != null) {
      senTxt = '；Sen 斜率 ' + fs2(mk.senSlope) + 'σ/场 [' + mk.senLo.toFixed(3) + ', ' + mk.senHi.toFixed(3) + ']';
    }
    var verdict = !mk.valid ? '场次不足' :
      mk.significant ? (mk.s > 0 ? '存在显著上升趋势' : '存在显著下降趋势') : '无统计显著趋势';
    return details('长期方向检验',
      '<div style="font-size:14px;font-weight:600">' + verdict + '</div>' +
      '<div style="font-size:12px;opacity:.75;margin-top:4px">Mann-Kendall 检验 p = ' +
      (mk.valid ? mk.p.toFixed(3) : '暂无') + '（α=0.05）' + senTxt +
      '<br>口径说明：「动量」是描述性规则；这里只陈述通过统计检验的结论。</div>');
  }

  function signalsDetails(rep) {
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    var ev = rep.ewma || {};
    var evTxt = (ev.violations && ev.violations.length)
      ? '第 ' + ev.violations.map(function (v) { return v + 2; }).join('、') + ' 场出现连续偏移信号'
      : '无异动信号';
    var nInterv = rep.interventions.filter(Boolean).length;
    return details('突然变化与连续偏移',
      '<div style="font-size:13px;line-height:1.7">' +
      '近期体制变化概率：<b>' + cpLast.toFixed(2) + '</b>' +
      (cpLast > 0.5 ? '（偏高，最近的成绩结构可能已切换）' : '') +
      '；历史触发重估 ' + nInterv + ' 次<br>' +
      'EWMA 残差监测：' + evTxt + '</div>');
  }

  function difficultyDetails(rep) {
    var darr = rep.difficulty;
    if (!Array.isArray(darr) || !darr.length) return '';
    var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
    var ne2 = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
    return details('分数与排名是否一致',
      '<div style="font-size:13px;line-height:1.75">有 <b>' + nh +
      '</b> 场得分低于个人在相近排名下的通常水平，有 <b>' + ne2 +
      '</b> 场高于通常水平。这里只说明个人历史关系出现偏离，不判断试卷客观难易。</div>');
  }

  /* 第二层：只解释判断逻辑，不要求用户理解统计名词。 */
  function whyDetails(rep, obsN) {
    var mk = rep.trend.mk;
    var direction = !mk.valid || !mk.significant ? '暂未看出稳定的长期方向' :
      (mk.s > 0 ? '多场记录共同支持整体向好' : '多场记录共同支持整体回落');
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    var shift = cpLast > 0.5 ? '近期可能出现了较明显的状态切换' : '近期没有发现明确的突然换挡';
    var ev = rep.ewma || {};
    var drift = ev.violations && ev.violations.length
      ? '连续几场的小幅偏移已经累积成提醒'
      : '连续小幅偏移尚未达到提醒条件';
    return details('为什么得到这些结论',
      '<div class="dsb-why-grid">' +
      '<div><b>先统一比较口径</b><span>不同参考人数的名次先换到同一把尺子上。</span></div>' +
      '<div><b>再降低偶发失常影响</b><span>单次异常不会直接被解释成长期进步或退步。</span></div>' +
      '<div><b>分别检查三类变化</b><span>' + esc(direction) + '；' + esc(shift) + '；' + esc(drift) + '。</span></div>' +
      '<div><b>最后给出参考范围</b><span>范围结合当前状态与近 ' + obsN +
      ' 场预测误差。它表达可能波动，不是成绩保证。</span></div>' +
      '</div>');
  }

  /* ---------- 计算过程:「计算收据」三层 ---------- */
  /* 第二层主体:用用户真实数据把整笔账算一遍 */
  function receiptInner(rep, obs) {
    var ne = rep.nextExam;
    var ewf = rep.ewmaForecast;
    var pred = rep.filter.predictive;
    var lastMu = rep.filter.mu[rep.filter.mu.length - 1];
    var effShift = pred.location - lastMu;
    var beta = rep.filter.beta[rep.filter.beta.length - 1];
    var weights = rep.filter.weights || [];
    var M = PAL2posToZ();
    /* 数据底表:最近最多6场 */
    var startI = Math.max(0, obs.length - 6);
    var rows = "";
    for (var i = startI; i < obs.length; i++) {
      var o = obs[i];
      var z = M ? M.positionToZ(o.rank, o.N).z : null;
      var w = weights[i] != null ? weights[i] : 1;
      var flag = w < 0.7 ? ' <span style="color:#d4574e;font-size:10px">异常降权</span>' : "";
      rows += '<tr>' +
        '<td style="padding:3px 8px;opacity:.8">#' + (i + 1) + '</td>' +
        '<td style="padding:3px 8px">前' + pct0(o.rank / o.N * 100) + '%（' + o.rank + '/' + o.N + '）</td>' +
        '<td style="padding:3px 8px">' + (z != null ? z.toFixed(2) : "暂无") + '</td>' +
        '<td style="padding:3px 8px">' + w.toFixed(2) + flag + '</td></tr>';
    }
    var dampNote = (Math.abs(beta) > 1e-9 && Math.abs(effShift - beta) > 1e-9)
      ? '原始势头 ' + fs2(beta) + '，历史证明势头不常延续，只采纳 → ' + fs2(effShift)
      : '采纳全部趋势 ' + fs2(beta);
    var stepStyle = 'font-size:12.5px;line-height:1.9';
    return '<div style="' + stepStyle + '">' +
      '<div style="font-weight:600;margin-bottom:4px">第 1 步 · 你的每场考试换算成标准分</div>' +
      '<table style="border-collapse:collapse;width:100%;font-size:12px">' +
      '<tr style="opacity:.55"><th style="text-align:left;padding:3px 8px">场次</th>' +
      '<th style="text-align:left;padding:3px 8px">位比</th>' +
      '<th style="text-align:left;padding:3px 8px">标准分 z</th>' +
      '<th style="text-align:left;padding:3px 8px">该场权重</th></tr>' + rows + "</table>" +
      '<div style="font-size:11px;opacity:.6;margin:2px 0 10px">权重低 = 这场被视为发挥失常/异常，几乎不影响后面的估计。</div>' +

      '<div style="font-weight:600;margin-top:10px">第 2 步 · 合成你的真实水平</div>' +
      '<div>加权稳定点 μ̂ = <b>' + lastMu.toFixed(2) + '</b></div>' +

      '<div style="font-weight:600;margin-top:10px">第 3 步 · 状态模型走到下一场</div>' +
      '<div>' + lastMu.toFixed(2) + ' <b>' + fs2(effShift) + '</b> = <b>' +
      pred.location.toFixed(2) + '</b>　<span style="font-size:11px;opacity:.65">' + dampNote + '</span></div>' +

      '<div style="font-weight:600;margin-top:10px">第 4 步 · 近期成绩单独做平滑参考</div>' +
      '<div>最近一场占 40%，更早记录逐渐衰减，得到 <b>前' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : '未知') + '%</b></div>' +

      '<div style="font-weight:600;margin-top:10px">第 5 步 · 定状态模型的波动范围</div>' +
      '<div>你平时的起伏 ±' + (pred.scaleRaw || pred.scale).toFixed(2) +
      (pred.conformalK != null ? '，按你历史误差放大 ×' + pred.conformalK.toFixed(2) +
        ' ⇒ ±<b>' + pred.scale.toFixed(2) + '</b>' : '') + '</div>' +

      '<div style="font-weight:600;margin-top:10px">第 6 步 · 分开阅读两个结果</div>' +
      '<div style="font-size:14px">近期平滑参考 <b>前' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : '未知') + '%</b>；状态模型参考范围 ' +
      '<b>[前' + pct0(ne.ci95Percentile[0]) + '%, 前' + pct0(ne.ci95Percentile[1]) + '%]</b></div>' +
      "</div>";
  }
  function PAL2posToZ() { return P2.measurement || null; }
  function calcDetails(rep, obs) {
    var inner = receiptInner(rep, obs);
    if (!inner) return '';
    var mth = 'font-family:Georgia,serif;font-style:italic';
    var l3 = details('方法与参数',
      '<div style="font-size:12px;line-height:2;opacity:.85">' +
      '· 点预测：EWMA Forecast 直接平滑原始位比，α=0.40，仅输出下一场参考点<br>' +
      '· 测量层：位比 <i style="' + mth + '">r/N</i> 经 Blom 分数 <span style="' + mth + '">z = Φ<sup>−1</sup>((r−0.375)/(N+0.25))</span> 嵌入；参考人数 SE 仅保留研究诊断，生产状态模型使用等权观测<br>' +
      '· 动态层：局部线性 DLM（折扣 <span style="' + mth + '">δ<sub>μ</sub>=0.96, δ<sub>β</sub>=0.90</span>），观测噪声 Student-t(<i style="' + mth + '">ν</i>=6) IRLS 稳健加权；σ²<sub>day</sub> 由一步残差 MAD 学习、六折计入预测<br>' +
      '· 变点层：BOCPD(NIG) 体制切换概率 &gt;0.5 且 MAP 游程≥5 时，下一场协方差膨胀干预 ×40<br>' +
      '· 趋势门控：原始 z 序列 MK 检验显著 → μ̂+0.7β，否则 φ=0<br>' +
      '· 历史残差校准：前向尺度参照残差取 Q95，no-SE 五折先验 K=4.54、收缩 W=4，除以 t<sub>0.975,6</sub> 换算标准尺度<br>' +
      '· 推断层：MK+Sen 主检验、EWMA Residual Monitor(λ=.3, L=2.815)、BH-FDR q=0.10 统一预算<br>' +
      '· 区间：t(df=6) 后验分位数</div>');
    return details('查看完整计算过程', inner + l3);
  }

  /* ---------- 默认可见区:预测主卡 ---------- */
  function mainCard(rep, obsN) {
    var ne = rep.nextExam;
    if (!ne) return '';
    var ewf = rep.ewmaForecast;
    return '<div class="dsb-summary-row">' +
      '<div class="dsb-summary-item"><div class="dsb-summary-label">下一场参考位置</div>' +
      '<div class="dsb-summary-value">前 ' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : pct1(ne.medianPercentile)) + '%</div>' +
      '<div class="dsb-summary-help">最近的考试影响更大，适合作为下一场的简单参考</div></div>' +
      '<div class="dsb-summary-item"><div class="dsb-summary-label">可能波动范围</div>' +
      '<div style="font-size:20px;font-weight:700">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</div>' +
      '<div class="dsb-summary-help">状态模型综合稳定水平、平时起伏和偶发失常</div></div>' +
      '<div class="dsb-summary-item dsb-goal-box">' +
      '<div class="dsb-summary-label">达到目标的参考把握</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<input id="dsbGoalPct" type="number" min="1" max="99" step="1" value="20" ' +
      'aria-label="目标年级位置，填写1到99" ' +
      'style="width:56px;padding:3px 8px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font-size:13px">' +
      '<button id="dsbGoalBtn" style="padding:4px 12px;font-size:12.5px;border-radius:8px;' +
      'border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer">查看把握</button>' +
      '<span id="dsbGoalOut" style="font-size:15px;font-weight:700"></span></div></div>' +
      '</div>' +
      '<div class="dsb-tip"><b>一句话理解：</b>近期成绩推算的参考点是<b>前 ' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : pct1(ne.medianPercentile)) + '%</b>。考虑正常发挥起伏后，状态模型给出的参考范围是' +
      '<span style="color:#4a90d9">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</span>。参考点和范围来自不同方法，应分开阅读；它们都不是成绩保证。</div>';
  }

  /* ---------- 轨迹图(SVG):原始位比点 + 滤波带 + 预测扇区 + 历史预测回显 ---------- */
  function trajectorySvg(rep, obs, hist) {
    var W = 720, H = 220, padL = 34, padR = 86, padT = 12, padB = 22;
    var n = obs.length, futW = 46; /* 预测区宽度 */
    var iw = W - padL - padR, ih = H - padT - padB;
    var yOf = function (pct) { return padT + ih * (pct / 100); }; /* 前0%在顶 */
    var xOf = function (i) { return padL + iw * i / Math.max(n - 1, 1); };
    var pc = function (z) { return Math.max(0, Math.min(100, 100 * (1 - C.normCdf(z)))); };
    var pts = "", dots = "";
    obs.forEach(function (o, i) {
      pts += (i ? " L" : "M") + xOf(i).toFixed(1) + "," + yOf(o.rank / o.N * 100).toFixed(1);
      dots += '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + yOf(o.rank / o.N * 100).toFixed(1) +
        '" r="2.6" fill="currentColor" opacity=".55"/>';
    });
    /* 滤波带:上边顺序 + 下边逆序,闭合为正规缎带(避免蝴蝶结自交割裂) */
    var bandUp = "", bandDn = "";
    rep.filter.mu.forEach(function (m, i) {
      bandUp += (i ? " L" : "M") + xOf(i).toFixed(1) + "," + yOf(pc(rep.filter.hi[i])).toFixed(1);
    });
    for (var bi = rep.filter.mu.length - 1; bi >= 0; bi--) {
      bandDn += " L" + xOf(bi).toFixed(1) + "," + yOf(pc(rep.filter.lo[bi])).toFixed(1);
    }
    var band = '<path d="' + bandUp + bandDn + ' Z" fill="currentColor" opacity=".08"/>';
    var muPath = "";
    rep.filter.mu.forEach(function (m, i) {
      muPath += (i ? " L" : "M") + xOf(i).toFixed(1) + "," + yOf(pc(m)).toFixed(1);
    });
    /* 历史预测回显:竖须=当时95%预测区间;圆点=当时认为最可能的位置(中性蓝);
       判定色套在"实际结果"上——绿圈=实际落区间内,红叉=失手 */
    var histSvg = "", actMarks = "";
    (hist || []).forEach(function (h) {
      var x = xOf(h.k).toFixed(1), col = h.inside ? "#2e9e6b" : "#d4574e";
      histSvg += '<line x1="' + x + '" y1="' + yOf(h.lo).toFixed(1) +
        '" x2="' + x + '" y2="' + yOf(h.hi).toFixed(1) +
        '" stroke="' + col + '" stroke-width="1.6" opacity=".9"/>' +
        '<circle cx="' + x + '" cy="' + yOf(h.mid).toFixed(1) +
        '" r="2.3" fill="#4a90d9"/>';
      var ax = xOf(h.k), ay = yOf(h.act);
      if (h.inside) {
        actMarks += '<circle cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) +
          '" r="4.6" fill="none" stroke="#2e9e6b" stroke-width="1.4" opacity=".85"/>';
      } else {
        var s = 3;
        actMarks += '<line x1="' + (ax - s).toFixed(1) + '" y1="' + (ay - s).toFixed(1) +
          '" x2="' + (ax + s).toFixed(1) + '" y2="' + (ay + s).toFixed(1) +
          '" stroke="#d4574e" stroke-width="1.6"/>' +
          '<line x1="' + (ax - s).toFixed(1) + '" y1="' + (ay + s).toFixed(1) +
          '" x2="' + (ax + s).toFixed(1) + '" y2="' + (ay - s).toFixed(1) +
          '" stroke="#d4574e" stroke-width="1.6"/>';
      }
    });
    /* 内联标注:第一次出现处直接点名,不靠底部图例 */
    var inlineLbl = "";
    if ((hist || []).length) {
      var hx = xOf(hist[0].k);
      inlineLbl = '<text x="' + (hx + 5).toFixed(1) + '" y="' + (padT + 9) +
        '" font-size="8.6" fill="#2e9e6b" opacity=".85">竖须=当时的预测区间</text>';
    }
    if (n >= 2) {
      inlineLbl += '<text x="' + (padL + 4) + '" y="' + (padT + ih - 4) +
        '" font-size="8.6" fill="currentColor" opacity=".45">阴影带=水平估计范围(非预测区间)</text>';
    }
    /* 预测扇区:按概率密度(每格概率÷该格换算宽度)分档着色,越接近最可能点越深 */
    var ne = rep.nextExam;
    var pred = rep.filter.predictive;
    var fx0 = xOf(n - 1), fx1 = xOf(n - 1) + futW, fw = futW - 4;
    var fanBins = 24, fanHtml = "";
    var yLo = Math.max(0.5, ne.ci95Percentile[0] - 8), yHi = Math.min(99.5, ne.ci95Percentile[1] + 8);
    var spanB = (yHi - yLo) / fanBins, maxPb = 0, probs2 = [], zw2 = [];
    for (var fb = 0; fb < fanBins; fb++) {
      var pa = yLo + fb * spanB, pb = pa + spanB;
      var za = probit(1 - pb / 100), zb = probit(1 - pa / 100);
      var zw = Math.max(zb - za, 1e-9);
      var pp = Math.max(0, C.tCdf((zb - pred.location) / pred.scale, pred.df) -
        C.tCdf((za - pred.location) / pred.scale, pred.df));
      probs2.push(pp); zw2.push(zw);
      var dd2 = pp / zw;
      if (dd2 > maxPb) maxPb = dd2;
    }
    for (fb = 0; fb < fanBins; fb++) {
      var rel = maxPb > 0 ? (probs2[fb] / zw2[fb]) / maxPb : 0;
      if (rel < 0.04) continue;
      var ya = padT + ih * ((yLo + fb * spanB) / 100);
      var yb = padT + ih * ((yLo + (fb + 1) * spanB) / 100);
      fanHtml += '<rect x="' + (fx0 + 3).toFixed(1) + '" y="' + ya.toFixed(1) +
        '" width="' + fw.toFixed(1) + '" height="' + Math.max(yb - ya, .6).toFixed(1) +
        '" fill="#4a90d9" opacity="' + (0.07 + 0.45 * rel).toFixed(3) + '"/>';
    }
    var fan = '<line x1="' + fx0.toFixed(1) + '" y1="' + yOf(ne.medianPercentile).toFixed(1) +
      '" x2="' + fx1.toFixed(1) + '" y2="' + yOf(ne.medianPercentile).toFixed(1) +
      '" stroke="#4a90d9" stroke-width="1.6" stroke-dasharray="5 4"/>' + fanHtml;
    var grid = "", lbl = "";
    [0, 25, 50, 75, 100].forEach(function (p) {
      grid += '<line x1="' + padL + '" y1="' + yOf(p) + '" x2="' + (padL + iw + futW) +
        '" y2="' + yOf(p) + '" stroke="currentColor" opacity=".07"/>';
      lbl += '<text x="' + (padL - 6) + '" y="' + (yOf(p) + 3.5) +
        '" font-size="9" text-anchor="end" fill="currentColor" opacity=".45">' + p + '</text>';
    });
    /* x 轴:真实考试名称(超长截断;考试多时每隔一场标一次,保持可读) */
    var xlbl = "";
    var xStep = n > 8 ? 2 : 1;
    for (var xi = 0; xi < n; xi += xStep) {
      var xnm = String(obs[xi].label || obs[xi].date || "").trim();
      if (xnm.length > 5) xnm = xnm.slice(0, 5) + "…";
      xlbl += '<text x="' + xOf(xi).toFixed(1) + '" y="' + (H - 6) +
        '" font-size="8.6" text-anchor="middle" fill="currentColor" opacity=".45">' +
        esc(xnm) + '</text>';
    }
    xlbl += '<text x="' + (fx1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="end" fill="#4a90d9" opacity=".8">下场</text>';
    return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:760px;display:block;color:inherit">' +
      grid + lbl + xlbl + band + histSvg +
      '<path d="' + muPath + '" fill="none" stroke="#4a90d9" stroke-width="2"/>' +
      '<path d="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/>' +
      dots + fan + actMarks + inlineLbl + "</svg>";
  }

  /* ---------- 洞察流(默认可见,≤3条,每条带依据标签) ---------- */
  function insightsList(rep, obsN) {
    var items = [];
    var mk = rep.trend.mk;
    if (mk.valid && mk.significant) {
      items.push(mk.s > 0
        ? "多场记录共同支持整体向好，不是只看最近一次成绩"
        : "多场记录共同支持整体回落，建议结合近期学习和考试情况查看");
    }
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    if (cpLast > 0.5) items.push("最近的表现可能出现了明显换挡，旧记录的参考价值正在下降");
    var ev = rep.ewma || {};
    if (ev.violations && ev.violations.length) {
      items.push("连续几场的小幅变化已经累积成提醒，建议关注是否存在持续原因");
    }
    var darr = rep.difficulty;
    if (Array.isArray(darr) && darr.length) {
      var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
      var nea = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
      if (nh) items.push("有 " + nh + " 场得分低于个人在相近排名下的通常水平，原因需要结合试卷和临场情况判断");
      if (nea) items.push("有 " + nea + " 场得分高于个人在相近排名下的通常水平");
    }
    if (!items.length) items.push("目前以正常波动为主，没有发现需要特别提醒的长期方向或连续异动");
    items.push("参考范围结合了近 " + obsN + " 场的历史误差；记录越少，范围通常越不稳定");
    return '<ul class="dsb-plain-insights">' +
      items.slice(0, 4).map(function (it) {
        return "<li>" + esc(it) + "</li>";
      }).join("") + "</ul>";
  }

  /* ---------- 组合(module)支持:下拉选组合,序列=成员科目位比中位数 ---------- */
  function comboList() {
    try { return ((typeof state !== 'undefined' && state.modulesV18) || []); } catch (e) { return []; }
  }
  /* 组合排名的取数:exam.moduleRanks(云端字段)优先,其次本机兜底缓存(与 v25 首页同一套数据源) */
  function moduleRanksForExam(e, modId) {
    if (!e || modId == null) return null;
    try {
      var mr = (e.moduleRanks && typeof e.moduleRanks === 'object' && Object.keys(e.moduleRanks).length)
        ? e.moduleRanks : null;
      if (mr && (mr[String(modId)] || mr[modId])) return mr[String(modId)] || mr[modId];
    } catch (err) { }
    try {
      var u = (typeof state !== 'undefined' && state.user && state.user.username) || 'anon';
      var cache = JSON.parse(localStorage.getItem('st_moduleranks_v25_' + u) || '{}');
      var row = cache[(e.exam_date || '') + '|' + (e.name || '')];
      if (row && typeof row === 'object') return row;
    } catch (err) { }
    return null;
  }
  /* 该场「计入总分的科目」与所选组合完全一致?(如六科组合且总分=这六科 → 总分排名即组合排名) */
  function examTotalMatchesCombo(e, set, selN) {
    if (!e || !set || !selN) return false;
    var n = 0, inc = 0;
    Object.keys(e.scores || {}).forEach(function (s) {
      var r = e.scores[s] || {};
      var has = n34(r.actual) != null || n34(r.target) != null ||
        n34(r.rank) != null || n34(r.classRank) != null;
      if (!has || r.excludeFromTotal) return;
      n++; if (set[s]) inc++;
    });
    return selN >= 2 && n === selN && inc === n;
  }
  /* 组合(module)口径:序列=用户在考试录入时为组合填写的「组合年排」(exam.moduleRanks)。
     没填排名的场次:若该场总分=组合(科目完全一致,如六科组合)则直接沿用总分排名;
     否则跳过,绝不拿成员科目位比中位数去合成年排/班排 */
  function obsCombo(exams, mod) {
    var out = [];
    var set = {}, selN = (mod && mod.subjects && mod.subjects.length) || 0;
    (mod && mod.subjects || []).forEach(function (s) { set[s] = 1; });
    (exams || []).forEach(function (e) {
      var mr = moduleRanksForExam(e, mod.id);
      if (mr) {
        var rk = n34(mr.yearRank), N = n34(mr.yearParticipants);
        if (rk == null || rk < 1) return;              /* 年排没填 → 该场不计入 */
        if (N == null) N = n34(e.total_participants);  /* 与全站一致:人数缺省时用该场总人数 */
        if (!N) return;
        out.push({ rank: rk, N: N, date: e.exam_date || '', label: e.name || '' });
        return;
      }
      if (examTotalMatchesCombo(e, set, selN)) {
        var rk2 = n34(e.total_rank), N2 = n34(e.total_participants);
        if (rk2 == null || rk2 < 1 || !N2) return;
        out.push({ rank: rk2, N: N2, date: e.exam_date || '', label: e.name || '' });
      }
    });
    return out;
  }
  function curCombo() {
    if (S.cur && S.cur.indexOf('__combo:') === 0) {
      var id = S.cur.slice(8);
      /* id 可能存成数字或字符串,统一按字符串比 */
      var hit = comboList().filter(function (m) { return String(m.id) === String(id); })[0];
      if (hit) return hit;
    }
    return null;
  }
  /* 统一 chip 样式(与全站 .chip 一致,主题可变) */
  function chipCls(on) { return 'chip' + (on ? ' active' : ''); }
  function comboChipsHtml(combo) {
    var mods = comboList();
    if (!mods.length) return '';
    return '<span class="label">组合：</span>' +
      (combo ? '<button type="button" class="chip" data-dsb-combo="__exit__">退出</button>' : '') +
      mods.map(function (m) {
        return '<button type="button" class="' + chipCls(combo && String(combo.id) === String(m.id)) +
          '" data-dsb-combo="' + esc(String(m.id)) + '" title="成员: ' +
          esc((m.subjects || []).join(' / ')) + '">' + esc(m.name) + '</button>';
      }).join('');
  }

  /* ---------- 总分口径检测:年级池 vs 组合/小池 ---------- */
  function totalCaliber(exams) {
    var ev = null;
    for (var i = exams.length - 1; i >= 0; i--) {
      if (!exams[i].is_hidden && n34(exams[i].total_participants)) { ev = exams[i]; break; }
    }
    if (!ev) return null;
    var tN = n34(ev.total_participants);
    var subNs = [];
    Object.keys(ev.scores || {}).forEach(function (s) {
      var row = ev.scores[s] || {};
      var n = n34(row.participants);
      if (n) subNs.push(n);
    });
    if (!subNs.length || !tN) return null;
    var maxS = Math.max.apply(null, subNs);
    /* 总分人数 ≥ 单科最大池的1.15倍 → 年级口径;否则疑似组合/分层口径 */
    return { totalN: tN, maxSubN: maxS,
      kind: tN >= maxS * 1.15 ? "grade" : "combo" };
  }

  /* ---------- 整个板块的 HTML(单一根节点,便于事件绑定与自愈挂载) ---------- */
  function sectionHtml(examsOverride) {
    var exams = examsOverride || prodExams();
    var combo = curCombo();
    var obs = combo ? obsCombo(exams, combo)
      : (S.cur === '__total__' ? obsTotal(exams) : obsSubject(exams, S.cur));

    /* 学科 chips:按有效场数排序;不足4场的折叠置灰并说明原因 */
    var caliber = totalCaliber(exams);
    var totalLabel = '总分';
    if (caliber) totalLabel += caliber.kind === 'grade' ? ' · 年级口径' : ' · 组合口径?';
    var entries = subjectList(exams).map(function (s) {
      return { key: s, label: s, n: obsSubject(exams, s).length };
    }).sort(function (a, b) { return b.n - a.n; });
    var chipsOk = [{ key: '__total__', label: totalLabel, n: obsTotal(exams).length }]
      .concat(entries.filter(function (e) { return e.n >= 4; }));
    var chipsPoor = entries.filter(function (e) { return e.n < 4; });
    var chipBtn = function (e) {
      var act = !combo && S.cur === e.key;
      return '<button type="button" class="' + chipCls(act) + '" data-dsb-subj="' +
        esc(e.key) + '" title="' + esc(e.n + ' 场有效位比') + '">' +
        esc(e.label) + ' <span style="font-size:9.5px;opacity:.6">' + e.n + '</span></button>';
    };
    var chips = chipsOk.map(chipBtn).join('');
    if (chipsPoor.length) {
      chips += '<span style="font-size:10px;opacity:.45;white-space:nowrap">数据不足(需≥4场):</span>' +
        chipsPoor.map(function (e) {
          return '<button type="button" disabled title="仅 ' + e.n +
            ' 场有效位比，样本太少无法建模，且可能混有换池/旧数据干扰" class="chip" style="opacity:.32">' +
            esc(e.label) + ' <span style="font-size:9.5px">' + e.n + '</span></button>';
        }).join('');
    }
    var caliberNote = '';
    if (combo) {
      caliberNote = '<p class="dsb-caliber" style="margin:-4px 0 10px">当前口径：组合「<b>' +
        esc(combo.name) + '</b>」 · 序列=你为组合填写的「组合年排」；未填写时若该场总分=该组合（如六科组合），则沿用总分排名</p>';
    } else if (S.cur === '__total__' && caliber && caliber.kind === 'combo') {
      caliberNote = '<p class="dsb-caliber" style="margin:-4px 0 10px">' +
        '<b>注意：</b>总分参与人数(' + caliber.totalN + ') ≤ 单科最大池(' + caliber.maxSubN +
        ')，疑似<b>组合内排名</b>而非全年级。组合口径衡量你在同选科群体中的位置，与年级口径含义不同；' +
        '系统按录入原样分析，解读时注意口径。</p>';
    }

    var body;
    if (obs.length < 4) {
      body = '<div style="font-size:13px;opacity:.75;padding:6px 0 2px">' +
        (combo ? '组合「' + esc(combo.name) + '」没有填写过「组合年排」，' : '当前成绩') +
        '还需要至少 4 次有效排名。' +
        (combo ? '在考试录入弹窗为组合填写「组合年排名次/年级人数」后即可解锁。' : '') + '</div>';
    } else {
      var rep = analyzeProd(obs);
      if (!rep.valid) {
        body = '<div style="font-size:13px;opacity:.75">暂时没有足够的有效记录。</div>';
      } else {
        pushShadow({ subj: S.cur, n: obs.length,
          mid: +rep.nextExam.medianPercentile.toFixed(1),
          lo: +rep.nextExam.ci95Percentile[0].toFixed(1),
          hi: +rep.nextExam.ci95Percentile[1].toFixed(1),
          k: rep.filter.predictive.conformalK != null
            ? +rep.filter.predictive.conformalK.toFixed(2) : null });
        REP = rep;
        var hist = walkForward(obs);
        var hitN = hist.filter(function (h) { return h.inside; }).length;
        var histNote = hist.length
          ? '竖须=过去每场「当时的预测区间」（绿=实际落内、<span style="color:#d4574e">红叉</span>=失手，命中 ' +
            hitN + '/' + hist.length + '）· 竖须上蓝点=当时的状态模型中心 · '
          : '';
        var trajCap = '灰点=每场实际排名位置（<span style="color:#2e9e6b">绿圈</span>=落在当时预测区间内） · 蓝线=综合多场记录后的稳定水平 · ' +
          '阴影带=当前水平可能范围（<b>不是</b>下一场预测区间，下一场范围通常更宽） · ' +
          '右侧色阶扇区=状态模型的下场落点概率密度（越深越接近模型中心） · ' + histNote;
        body = '<div class="dsb-level-head"><b>近期表现</b></div>' +
          mainCard(rep, obs.length) +
          '<div class="dsb-block-title">本期提醒</div>' +
          insightsList(rep, obs.length) +
          '<div class="dsb-level-head"><b>变化与依据</b></div>' +
          whyDetails(rep, obs.length) +
          '<div class="dsb-fig" style="margin-top:14px"><div class="dsb-fig-title">排名轨迹与预测区间</div>' +
          '<div class="dsb-scroll">' + trajectorySvg(rep, obs, hist) + '</div>' +
          '<div class="dsb-fig-cap">' + trajCap + '</div></div>' +
          '<div class="dsb-fig" style="margin-top:12px"><div class="dsb-fig-title">下一场落点分布</div>' +
          '<div id="dsbDistWrap">' + distBlock(rep) + '</div></div>' +
          '<div class="dsb-level-head"><b>计算细节</b></div>' +
          '<div class="dsb-grid2">' +
          trendDetails(rep) + signalsDetails(rep) + difficultyDetails(rep) +
          calcDetails(rep, obs) + '</div>';
      }
    }

    return '<div id="dsbRoot" class="card" style="padding:16px 18px;margin-top:14px">' +
      '<div class="dsb-head">' +
      '<span style="font-size:15px;font-weight:700">⑨ 深度分析</span>' +
      '<sup style="font-size:9.5px;opacity:.55">Beta</sup>' +
      '</div>' +
      '<div class="dsb-privacy-note" role="note">为改进预测质量，本模块会使用经匿名化、去标识化处理的使用数据进行统计分析；不会记录密码等敏感内容。</div>' +
      '<div style="margin:2px 0 10px">' +
      (comboList().length ? '<div class="combo-chips-v25">' + comboChipsHtml(combo) + '</div>' : '') +
      '<div class="combo-chips-v25"><span class="label">单科：</span>' + chips + '</div>' +
      '</div>' +
      caliberNote +
      body +
      '</div>';
  }

  /* ---------- 文档级事件委托(chips 与目标按钮在重渲染后依然可用) ---------- */
  function curReport() {
    var exams = prodExams();
    var cob = curCombo();
    var obs = cob ? obsCombo(exams, cob)
      : (S.cur === '__total__' ? obsTotal(exams) : obsSubject(exams, S.cur));
    if (obs.length < 4) return null;
    try { return analyzeProd(obs); } catch (e) { return null; }
  }
  function onDocClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var binChip = t.closest("[data-dsb-bin]");
    if (binChip) {
      S.distBin = parseInt(binChip.getAttribute("data-dsb-bin"), 10) || 5;
      renderDistInto();
      return;
    }
    var zBinChip = t.closest("[data-dsb-zbins]");
    if (zBinChip) {
      var nextBins = parseInt(zBinChip.getAttribute("data-dsb-zbins"), 10);
      S.zmapBins = [10, 20, 40].indexOf(nextBins) >= 0 ? nextBins : 20;
      renderDistInto();
      return;
    }
    var viewChip = t.closest("[data-dsb-view]");
    if (viewChip) {
      S.view = viewChip.getAttribute("data-dsb-view") || "band";
      renderDistInto();
      return;
    }
    var chip = t.closest("[data-dsb-subj]");
    if (chip) {
      S.cur = chip.getAttribute("data-dsb-subj");
      refresh();
      track("deep_beta_switch", { subject: S.cur });
      return;
    }
    var coc = t.closest("[data-dsb-combo]");
    if (coc) {
      var cid = coc.getAttribute("data-dsb-combo");
      if (cid === "__exit__") { S.cur = S.lastScope || "__total__"; }
      else {
        if (S.cur.indexOf("__combo:") !== 0) S.lastScope = S.cur;
        S.cur = "__combo:" + cid;
      }
      refresh();
      track("deep_beta_combo", { id: cid });
      return;
    }
    if (t.closest("#dsbGoalBtn")) {
      var out = $("#dsbGoalOut");
      var inp = $("#dsbGoalPct");
      if (!out || !inp) return;
      var v = parseFloat(inp.value);
      if (!(v >= 1 && v <= 99)) { out.textContent = "1~99"; return; }
      var rep = curReport();
      if (!rep || !rep.filter.predictive) { out.textContent = "暂无"; return; }
      var zTarget = probit(1 - v / 100);
      S.goalPct = Math.round(v);
      var pr = P2.dynamics.probReach(rep.filter.predictive, zTarget);
      out.textContent = '≈ ' + Math.round(pr * 100) + '%';
      renderDistInto();
      track("deep_beta_goal", { target: v, p: Math.round(pr * 100) });
    }
  }

  /* ---------- 自愈挂载:跟随统计页的重渲染 ---------- */
  var STYLE_ID = "dsb-style";
  function injectStyle() {
    if ($("#" + STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      '#dsbRoot summary{list-style:none;cursor:pointer;font-size:13px;opacity:.78;' +
      'user-select:none;padding:7px 0;font-weight:500}' +
      '#dsbRoot summary:hover{opacity:1}' +
      '#dsbRoot details{border-top:1px dashed rgba(127,127,127,.22)}' +
      '#dsbRoot details[open]>summary:before{content:"▾ "}' +
      '#dsbRoot summary:before{content:"▸ "}' +
      '/* ---- 排版(与统计页卡片体系统一,主题可变) ---- */' +
      '#dsbRoot .dsb-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}' +
      '#dsbRoot .dsb-note{margin-left:auto;font-size:10.5px;opacity:.5;text-align:right}' +
      '#dsbRoot .dsb-privacy-note{font-size:10.5px;line-height:1.6;opacity:.52;margin:-5px 0 11px;color:var(--muted,#667085)}' +
      '#dsbRoot .dsb-block-title{font-size:12.5px;font-weight:700;margin:14px 0 8px;letter-spacing:1px;opacity:.85}' +
      '#dsbRoot .dsb-level-head{display:flex;align-items:baseline;gap:8px;margin:18px 0 9px;' +
      'padding-top:12px;border-top:1px solid var(--line,#e8ebf0)}' +
      '#dsbRoot .dsb-level-head:first-of-type{margin-top:10px;padding-top:0;border-top:0}' +
      '#dsbRoot .dsb-level-head span{font-size:10px;font-weight:700;color:#4a90d9}' +
      '#dsbRoot .dsb-level-head b{font-size:14px}' +
      '#dsbRoot .dsb-level-head small{font-size:10.5px;opacity:.5}' +
      '#dsbRoot .dsb-summary-row{display:grid;grid-template-columns:minmax(150px,.9fr) minmax(190px,1.15fr) minmax(210px,1fr);' +
      'gap:18px;align-items:end}' +
      '#dsbRoot .dsb-summary-item{min-width:0}' +
      '#dsbRoot .dsb-summary-label{font-size:11px;opacity:.62;margin-bottom:3px}' +
      '#dsbRoot .dsb-summary-value{font-size:20px;font-weight:700}' +
      '#dsbRoot .dsb-summary-help{font-size:10.5px;opacity:.52;margin-top:4px;line-height:1.55}' +
      '#dsbRoot .dsb-plain-insights{margin:0;padding-left:18px;font-size:13px;line-height:1.85}' +
      '#dsbRoot .dsb-why-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;font-size:12.5px;line-height:1.65}' +
      '#dsbRoot .dsb-why-grid div{display:grid;gap:2px}' +
      '#dsbRoot .dsb-why-grid span{opacity:.7}' +
      '#dsbRoot .dsb-grid2{display:grid;gap:12px}' +
      '@media(min-width:900px){#dsbRoot .dsb-grid2{grid-template-columns:1fr 1fr}}' +
      '@media(max-width:760px){#dsbRoot .dsb-summary-row{grid-template-columns:1fr 1fr;gap:14px 12px}' +
      '#dsbRoot .dsb-goal-box{grid-column:1/-1}#dsbRoot .dsb-why-grid{grid-template-columns:1fr}' +
      '#dsbRoot .dsb-level-head{align-items:flex-start;flex-wrap:wrap}#dsbRoot .dsb-level-head small{width:100%;margin-left:42px}}' +
      '#dsbRoot .dsb-fig{border:1px solid var(--line,#e8ebf0);border-radius:14px;padding:12px 14px;' +
      'background:var(--panel-solid,#fff);min-width:0}' +
      '#dsbRoot .dsb-fig-title{font-size:12.5px;font-weight:700;margin-bottom:6px;opacity:.9}' +
      '#dsbRoot .dsb-fig-cap{font-size:10.5px;opacity:.55;margin-top:4px;line-height:1.65}' +
      '#dsbRoot .dsb-tip{font-size:12.5px;line-height:1.85;opacity:.78;margin-top:12px;' +
      'border:1px dashed var(--line,#cfd6e4);border-radius:12px;padding:10px 13px;background:var(--chip-bg,#fbfcfe)}' +
      '#dsbRoot .combo-chips-v25 .label{font-size:12px;font-weight:700;color:var(--muted,#667085);' +
      'white-space:nowrap;align-self:center}' +
      '#dsbRoot .combo-chips-v25 .chip{flex:0 0 auto}' +
      '#dsbRoot .dsb-caliber{font-size:11px;opacity:.6;margin:-4px 0 10px;line-height:1.7}' +
      '/* ---- 手机端:图表露一部分+横滑(与首页图表一致) ---- */' +
      '#dsbRoot .dsb-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x;' +
      'overscroll-behavior-x:contain;padding:2px 1px 4px}' +
      '#dsbRoot .dsb-scroll svg{min-width:640px;height:auto}' +
      '/* ---- 暗色主题:同款结构提亮,避免颜色过深 ---- */' +
      'html[data-theme="night"] #dsbRoot .dsb-fig{background:var(--panel-solid,#161c26)}' +
      'html[data-theme="night"] #dsbRoot .dsb-tip{background:rgba(29,36,49,.5);border-color:rgba(140,150,170,.3)}' +
      'html[data-theme="night"] #dsbRoot .combo-chips-v25 .label{color:#aab4c8}' +
      'html[data-theme="night"] #dsbRoot .dsb-fig-cap,html[data-theme="night"] #dsbRoot .dsb-note{opacity:.7}';
    document.head.appendChild(st);
  }
  function pageIsStats() {
    try { return state.page === "stats"; } catch (e) { return false; }
  }
  /* ---------- 可见性埋点:只在板块/隐私说明真正进入视口时触发 ---------- */
  var deepBetaViewTracked = false;
  var privacyNoticeViewTracked = false;
  var deepBetaVisibilityObserver = null;
  var privacyNoticeVisibilityObserver = null;
  var visibilityFallbackBound = false;
  function trackDeepBetaView() {
    if (deepBetaViewTracked) return;
    deepBetaViewTracked = true;
    track("deep_beta_view", { surface: "stats" });
  }
  function trackPrivacyNoticeView() {
    if (privacyNoticeViewTracked) return;
    privacyNoticeViewTracked = true;
    track("privacy_notice_view", { surface: "deep_beta", notice_version: "v1" });
  }
  function isInViewport(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.right > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) &&
      r.left < (window.innerWidth || document.documentElement.clientWidth);
  }
  function checkVisibilityFallback() {
    if (!pageIsStats()) return;
    var root = $("#dsbRoot");
    if (!root) return;
    if (isInViewport(root)) trackDeepBetaView();
    var note = root.querySelector(".dsb-privacy-note");
    if (isInViewport(note)) trackPrivacyNoticeView();
  }
  function disconnectVisibilityObservers() {
    try { if (deepBetaVisibilityObserver) deepBetaVisibilityObserver.disconnect(); } catch (e) { }
    try { if (privacyNoticeVisibilityObserver) privacyNoticeVisibilityObserver.disconnect(); } catch (e) { }
    deepBetaVisibilityObserver = null;
    privacyNoticeVisibilityObserver = null;
  }
  function observeSectionVisibility(root) {
    if (!root || root.getAttribute("data-dsb-visibility-observed") === "1") return;
    root.setAttribute("data-dsb-visibility-observed", "1");
    if (typeof window.IntersectionObserver === "function") {
      disconnectVisibilityObservers();
      deepBetaVisibilityObserver = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) trackDeepBetaView();
      }, { threshold: 0.1 });
      deepBetaVisibilityObserver.observe(root);
      var note = root.querySelector(".dsb-privacy-note");
      if (note) {
        privacyNoticeVisibilityObserver = new IntersectionObserver(function (entries) {
          if (entries[0] && entries[0].isIntersecting) trackPrivacyNoticeView();
        }, { threshold: 0.1 });
        privacyNoticeVisibilityObserver.observe(note);
      }
    } else {
      if (!visibilityFallbackBound) {
        visibilityFallbackBound = true;
        window.addEventListener("scroll", checkVisibilityFallback, { passive: true });
        window.addEventListener("resize", checkVisibilityFallback, { passive: true });
      }
      setTimeout(checkVisibilityFallback, 0);
    }
  }
  function resetVisibilityTrackingIfOutsideStats() {
    if (pageIsStats()) return;
    deepBetaViewTracked = false;
    privacyNoticeViewTracked = false;
    disconnectVisibilityObservers();
  }
  function mountIfMissing() {
    if (!pageIsStats()) { resetVisibilityTrackingIfOutsideStats(); return; }
    var c = document.getElementById("content");
    if (!c) return;
    var existing = $("#dsbRoot", c);
    if (existing) { observeSectionVisibility(existing); return; }           /* 已挂载 */
    if (!c.firstElementChild) return;        /* 统计页还没渲染好 */
    /* 插在「数据质量与方法论」(⑩)之前 → 深度分析=⑨ 紧随全量矩阵(⑧)。
       注意: quality 卡位于 .sv31-page 内部,不能要求它是 #content 的直接子级,
       否则整块会被追加到页面末尾,出现「⑩ 排到 ⑨ 前面」 */
    var q = c.querySelector(".sv31-quality");
    if (q) q.insertAdjacentHTML("beforebegin", sectionHtml());
    else c.insertAdjacentHTML("beforeend", sectionHtml());
    observeSectionVisibility($("#dsbRoot", c));
  }
  function refresh() {
    var root = $("#dsbRoot");
    if (!root) { mountIfMissing(); return; }
    root.outerHTML = sectionHtml();
    observeSectionVisibility($("#dsbRoot"));
  }
  var mountTimer = null;
  function scheduleMount() {
    if (mountTimer) return;
    mountTimer = setTimeout(function () {
      mountTimer = null;
      try { mountIfMissing(); } catch (e) { }
    }, 0);
  }
  function boot() {
    try { injectStyle(); } catch (e) { }
    document.addEventListener("click", onDocClick, false);
    /* 目标输入实时联动分布图 */
    document.addEventListener("input", function (ev) {
      var t = ev.target;
      if (!t || t.id !== "dsbGoalPct") return;
      var v = parseFloat(t.value);
      if (v >= 1 && v <= 99) { S.goalPct = Math.round(v); renderDistInto(); }
    }, false);
    /* 兜底1:包装渲染入口链——每次页面路由后检查挂载 */
    var prevRender = (typeof window.renderPage === "function") ? window.renderPage : null;
    window.renderPage = function v34RenderPage() {
      if (prevRender) { try { prevRender(); } catch (e) { } }
      scheduleMount();
    };
    /* 兜底2:全树观察(#content 本身是动态创建的,不能只盯固定节点) */
    try {
      var mo = new MutationObserver(function () { scheduleMount(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) { }
    /* 兜底3:导航点击后延迟检查 */
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.closest && t.closest('[data-page="stats"]')) {
        setTimeout(function () { try { mountIfMissing(); } catch (e) { } }, 60);
      }
    }, false);
    scheduleMount();
  }
  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }

  /* ---------- 测试钩子 ---------- */
  window.__v34 = {
    obsTotal: obsTotal,
    obsSubject: obsSubject,
    subjectList: subjectList,
    probit: probit,
    analyze: function (obs) { return analyzeProd(obs); },
    sectionHtml: sectionHtml,
    refresh: refresh,
    mountIfMissing: mountIfMissing,
    setSubject: function (s) { S.cur = s; },
    analysisOptions: {
      seWeighting: PROD_ANALYSIS_OPTS.seWeighting,
      ewmaForecastAlpha: PROD_ANALYSIS_OPTS.ewmaForecastAlpha,
      conformalPriorK: PROD_ANALYSIS_OPTS.conformalPriorK,
      conformalPriorW: PROD_ANALYSIS_OPTS.conformalPriorW
    },
    shadowKey: LS_SHADE
  };
})();


window.PAL2 = PAL2NS; /* 主源码经 window.PAL2 取内核 */
})();





/* ===== app-v35.js ===== */
/* app-v35.js · v6.1 usability fixes: multi-category trends, safe drafts and viewport stability. */
(function(){
  'use strict';
  if(window.__v35)return;window.__v35=1;

  function esc61(v){return typeof escapeHtml==='function'?escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function userKey61(){return String(state&&state.user&&(state.user.id||state.user.username)||'guest');}
  function filterKey61(){return 'st_category_filters_v61_'+userKey61();}
  function draftKey61(){return 'st_exam_draft_v61_'+userKey61();}
  function categoryValues61(){var a=[];try{a=(categoryOptionsV14()||[]).slice();}catch(e){}if((state.allExams||[]).some(function(x){return !x.grade_level;}))a.push('未分类');return Array.from(new Set(a));}
  function hydrateFilters61(){
    var key=filterKey61();if(state._v61FilterKey===key)return;state._v61FilterKey=key;
    var saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]');}catch(e){}
    if(!Array.isArray(saved))saved=[];
    if(!saved.length&&state.gradeFilter&&state.gradeFilter!=='全部')saved=[state.gradeFilter];
    state.gradeFiltersV61=saved;
  }
  function cleanFilters61(){hydrateFilters61();var allowed=categoryValues61();state.gradeFiltersV61=(state.gradeFiltersV61||[]).filter(function(x){return allowed.indexOf(x)>-1;});}
  function saveFilters61(){try{localStorage.setItem(filterKey61(),JSON.stringify(state.gradeFiltersV61||[]));}catch(e){}}

  applyGradeFilterV13=function applyGradeFilterV61(){
    cleanFilters61();
    var source=state.unfilteredVisibleExamsV13||[],selected=state.gradeFiltersV61||[];
    state.exams=!selected.length?source.slice():source.filter(function(exam){var value=exam.grade_level||'未分类';return selected.indexOf(value)>-1;});
    state.gradeFilter=selected.length===1?selected[0]:'全部';
    if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams,state.subjectConfigs||[]);
    state.radarSelection=(state.radarSelection||[]).filter(function(id){return state.exams.some(function(e){return e.id===id;});});
    if(typeof ensureRadarSelection==='function')ensureRadarSelection();
  };

  var homeBefore61=homeHtml;
  homeHtml=function homeHtmlV61(){
    cleanFilters61();var html=homeBefore61(),selected=state.gradeFiltersV61||[],opts=categoryValues61();
    var bar='<div class="grade-filter-v13 grade-filter-v61"><span class="label">'+esc61(categoryLabelV14())+'（可多选）</span>'
      +'<button class="grade-chip-v13 '+(!selected.length?'active':'')+'" data-grade-filter-v61="全部">全部</button>'
      +opts.map(function(v){return'<button class="grade-chip-v13 '+(selected.indexOf(v)>-1?'active':'')+'" data-grade-filter-v61="'+esc61(v)+'">'+esc61(v)+'</button>';}).join('')+'</div>';
    return html.replace(/<div class="grade-filter-v13[^"]*">[\s\S]*?<\/div><section class="grid-main">/,bar+'<section class="grid-main">');
  };

  function cityDraft61(modal){
    var box=modal.querySelector('#v33cityBox');if(!box)return{};
    var apply=box.querySelector('#v33ApplyCity');if(!apply||!apply.checked)return{};
    return{city_rank:(box.querySelector('#v33CityR')||{}).value||'',city_participants:(box.querySelector('#v33CityN')||{}).value||'',district_rank:(box.querySelector('#v33DistR')||{}).value||'',district_participants:(box.querySelector('#v33DistN')||{}).value||''};
  }
  function captureExam61(modal){
    var mode=modal.dataset.rankEntryModeV17||'rank',exam={
      id:null,name:(modal.querySelector('#examName')||{}).value||'',exam_date:(modal.querySelector('#examDate')||{}).value||'',
      end_date:(function(){var end=modal.querySelector('#examEndDateV25');return end&&end.dataset.autoV61!=='1'?end.value||'':'';})(),grade_level:(modal.querySelector('#gradeLevelV14')||{}).value||'',
      is_hidden:(modal.querySelector('#examHiddenV16')||{}).value==='1',moduleIds:[].slice.call(modal._moduleIdsV21||[]),scores:{},moduleRanks:{},
      total_actual_score:(modal.querySelector('.total-actual-override-v24')||{}).value||'',total_raw_score:(modal.querySelector('.total-raw-override-v24')||{}).value||''
    };
    var city=cityDraft61(modal);for(var k in city)exam[k]=city[k];
    if(mode==='rank'){
      exam.total_rank=(modal.querySelector('#totalRankV16')||{}).value||'';exam.total_participants=(modal.querySelector('#totalParticipantsV16')||{}).value||'';
      exam.total_class_rank=(modal.querySelector('#totalClassRankV16')||{}).value||'';exam.total_class_participants=(modal.querySelector('#totalClassParticipantsV16')||{}).value||'';
    }else{
      exam.total_year_position_percent=(modal.querySelector('.total-year-position-v17')||{}).value||'';exam.total_class_position_percent=(modal.querySelector('.total-class-position-v17')||{}).value||'';
    }
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      var name=(card.querySelector('.exam-subject-name-v10')||{}).value||'';name=name.trim();if(!name)return;
      exam.scores[name]={target:(card.querySelector('.target-v16')||{}).value||'',raw:(card.querySelector('.raw-v16')||{}).value||'',actual:(card.querySelector('.actual-v16')||{}).value||'',rawMax:(card.querySelector('.rawmax-v16')||{}).value||'',max:(card.querySelector('.max-v16')||{}).value||'',rank:mode==='rank'?((card.querySelector('.year-rank-v16')||{}).value||''):'',participants:mode==='rank'?((card.querySelector('.year-participants-v16')||{}).value||''):'',classRank:mode==='rank'?((card.querySelector('.class-rank-v16')||{}).value||''):'',classParticipants:mode==='rank'?((card.querySelector('.class-participants-v16')||{}).value||''):'',yearPositionPercent:mode==='percent'?((card.querySelector('.year-position-v17')||{}).value||''):'',classPositionPercent:mode==='percent'?((card.querySelector('.class-position-v17')||{}).value||''):'',excludeFromTotal:!!(card.querySelector('.exclude-total-check-v17')||{}).checked};
    });
    modal.querySelectorAll('.combo-card-v21').forEach(function(card){var id=card.dataset.comboId;if(!id)return;exam.moduleRanks[id]={yearRank:(card.querySelector('.combo-yr-v25')||{}).value||'',yearParticipants:(card.querySelector('.combo-yp-v25')||{}).value||'',classRank:(card.querySelector('.combo-cr-v25')||{}).value||'',classParticipants:(card.querySelector('.combo-cp-v25')||{}).value||''};});
    return exam;
  }
  function readDraft61(){try{var d=JSON.parse(localStorage.getItem(draftKey61())||'null');return d&&d.exam?d:null;}catch(e){return null;}}
  function saveDraft61(modal){try{localStorage.setItem(draftKey61(),JSON.stringify({saved_at:new Date().toISOString(),exam:captureExam61(modal)}));}catch(e){}}
  function clearDraft61(){try{localStorage.removeItem(draftKey61());}catch(e){}}
  function decorateDraft61(modal,restored){
    if(!modal||modal.dataset.draftV61==='1')return;modal.dataset.draftV61='1';var dirty=false,timer=null;
    var actions=modal.querySelector('.modal-actions');
    if(actions){var clear=document.createElement('button');clear.type='button';clear.className='secondary text-danger draft-clear-v61';clear.textContent='一键清空';actions.insertBefore(clear,actions.firstChild);clear.onclick=function(){clearDraft61();modal.remove();if(state.modal===modal)state.modal=null;openExam(null);toast('未保存内容已清空');};}
    var note=document.createElement('div');note.className='draft-note-v61';note.textContent=restored?'已恢复上次未保存的内容；保存成功后草稿会自动删除。':'填写内容会自动留在本机；误关后再次打开即可继续。';
    var body=modal.querySelector('.modal-body');if(body)body.insertBefore(note,body.firstChild);
    function schedule(){dirty=true;clearTimeout(timer);timer=setTimeout(function(){saveDraft61(modal);},220);}
    modal.addEventListener('input',schedule);modal.addEventListener('change',schedule);
    modal.addEventListener('click',function(e){if(dirty&&(e.target===modal||e.target.closest('.close-btn,.cancel-btn')))saveDraft61(modal);},true);
  }

  var openExamBefore61=openExam;
  openExam=function openExamV61(exam){
    var draft=!exam?readDraft61():null,result=openExamBefore61(draft?draft.exam:exam),modal=state.modal;
    if(draft&&modal){
      var title=modal.querySelector('.modal-head h3');if(title)title.textContent='继续未保存的考试';
      modal.querySelectorAll('.delete-exam-v10,#deleteExamV16,#deleteExamModalV13').forEach(function(x){var row=x.closest('.modal-danger-row-v10');(row||x).remove();});
      var save=modal.querySelector('.save-btn');if(save)save.textContent='保存考试';
      setTimeout(function(){toast('已恢复上次未保存的内容');},0);
    }
    decorateDraft61(modal,!!draft);return result;
  };

  var dataApiBefore61=typeof dataApiV7==='function'?dataApiV7:null;
  if(dataApiBefore61)dataApiV7=async function dataApiV61(action,payload){var result=await dataApiBefore61.apply(this,arguments);if(action==='save_exam')clearDraft61();return result;};

  var saveExamBefore61=saveExam;
  saveExam=async function saveExamV61(id,modal){
    var scroller=document.scrollingElement||document.documentElement,y=scroller.scrollTop||window.pageYOffset||0;
    var result=await saveExamBefore61.apply(this,arguments);
    function restore(){try{window.scrollTo({top:y,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,y);}}
    restore();requestAnimationFrame(restore);setTimeout(restore,80);setTimeout(restore,220);return result;
  };

  var bindBefore61=bindPage;
  bindPage=function bindPageV61(){
    bindBefore61();
    document.querySelectorAll('[data-grade-filter-v61]').forEach(function(button){button.onclick=function(){
      var value=button.dataset.gradeFilterV61;cleanFilters61();
      if(value==='全部')state.gradeFiltersV61=[];
      else{var i=state.gradeFiltersV61.indexOf(value);if(i>-1)state.gradeFiltersV61.splice(i,1);else state.gradeFiltersV61.push(value);}
      saveFilters61();state.radarSelection=[];applyGradeFilterV13();render();
    };});
  };

  var style=document.createElement('style');style.id='app-v35-style';style.textContent='.grade-filter-v61{align-items:center}.grade-filter-v61 .label{white-space:nowrap}.draft-note-v61{border:1px solid var(--line,#e5e9ef);background:var(--cell,#f7f9fc);color:var(--muted,#687386);border-radius:11px;padding:9px 11px;margin-bottom:12px;font-size:11px;line-height:1.6}.draft-clear-v61{margin-right:auto}.gh-chips{touch-action:pan-y!important}';document.head.appendChild(style);
  window.__v61={captureDraft:captureExam61,readDraft:readDraft61,clearDraft:clearDraft61,filters:function(){return(state.gradeFiltersV61||[]).slice();}};
})();

/* ===== score-worth-model.js ===== */
/* A retrospective, personal score/rank scale. Not population test equating. */
(function () {
  'use strict';
  var cache = new WeakMap();
  function present(v) { return v != null && !(typeof v === 'string' && v.trim() === ''); }
  function num(v) { if (!present(v) || (typeof v !== 'string' && typeof v !== 'number')) return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var i = a.length >> 1; return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2; }
  function sigmoid(y) { return y >= 0 ? 1 / (1 + Math.exp(-y)) : Math.exp(y) / (1 + Math.exp(y)); }
  function logit(p) { p = clamp(p, 0.005, 0.995); return Math.log(p / (1 - p)); }
  function day(e) { var s = String(e.exam_date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; var t = Date.parse(s + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? t / 86400000 : null; }
  function key(e) { return e.id != null && e.id !== '' ? 'id:' + e.id : JSON.stringify([e.exam_date || '', e.name || '', e.grade_level || '']); }
  function invNormal(p) {
    // Reuse the application's tested statistical kernel when it is present.
    var core = window.PAL2 && window.PAL2.core || window.PAL && window.PAL.core;
    if (core && core.invNorm) return core.invNorm(p);
    // Standalone fallback: invert an Abramowitz–Stegun normal CDF approximation.
    function cdf(x) {
      var a = Math.abs(x), t = 1 / (1 + 0.2316419 * a), tail = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI) * t *
        (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
      return x >= 0 ? 1 - tail : tail;
    }
    var lo = -8, hi = 8;
    for (var i = 0; i < 48; i++) { var m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function observation(e, subject, index) {
    var r = e && e.scores && e.scores[subject] || {}, score = num(r.actual), max = num(r.max);
    var N = present(r.participants) ? num(r.participants) : num(e.total_participants);
    var rank = num(r.rank), pos = num(r.yearPositionPercent);
    if (present(r.yearPositionPercent)) { if (pos === null || pos <= 0 || pos > 100) pos = null; }
    else if (rank !== null && N !== null && Number.isInteger(rank) && rank >= 1 && rank <= N) pos = rank / N * 100;
    var o = { e: e, index: index, score: score, max: max, N: N, pos: pos, day: day(e),
      scoreValid: score !== null && max !== null && max > 0 && score >= 0 && score <= max,
      rankValid: pos !== null && N !== null && Number.isSafeInteger(N) && N >= 30 };
    o.valid = o.scoreValid && o.rankValid && o.day !== null;
    if (o.valid) { var edge = Math.max(0.5 / N, 1e-8); o.z = invNormal(1 - clamp(pos / 100 - 0.5 / N, edge, 1 - edge)); o.y = logit(score / max); }
    return o;
  }
  function fit(points) {
    var mx = mean(points.map(function (p) { return p.z; })), my = mean(points.map(function (p) { return p.y; }));
    var cx = median(points.map(function (p) { return p.z; })), sx = Math.max(0.15, 1.4826 * median(points.map(function (p) { return Math.abs(p.z - cx); })));
    var weights = points.map(function (p) { return Math.min(1, 2.5 * sx / Math.max(Math.abs(p.z - cx), 1e-9)); });
    var b = 0, a = my, raw = 0;
    for (var t = 0; t < 24; t++) {
      var sw = 0, x = 0, y = 0;
      points.forEach(function (p, i) { sw += weights[i]; x += weights[i] * p.z; y += weights[i] * p.y; }); x /= sw; y /= sw;
      var xx = 0, xy = 0; points.forEach(function (p, i) { xx += weights[i] * (p.z - x) * (p.z - x); xy += weights[i] * (p.z - x) * (p.y - y); });
      raw = xx > 1e-10 ? xy / xx : 0; var nextB = Math.max(0, raw), nextA = y - nextB * x;
      var residuals = points.map(function (p) { return p.y - nextA - nextB * p.z; }), rm = median(residuals);
      var scale = Math.max(0.03, 1.4826 * median(residuals.map(function (v) { return Math.abs(v - rm); })));
      weights = points.map(function (p, i) { return Math.min(1, 2.5 * sx / Math.max(Math.abs(p.z - cx), 1e-9)) * Math.min(1, 1.345 * scale / Math.max(Math.abs(residuals[i]), 1e-9)); });
      if (Math.abs(nextB - b) + Math.abs(nextA - a) < 1e-9) { a = nextA; b = nextB; break; } a = nextA; b = nextB;
    }
    var residual = points.map(function (p) { return p.y - a - b * p.z; }), med = median(residual);
    var dispersion = 1.4826 * median(residual.map(function (v) { return Math.abs(v - med); }));
    return { b: b, rawSlope: raw, meanZ: mx, meanY: my, dispersion: dispersion,
      spreadZ: Math.sqrt(mean(points.map(function (p) { return (p.z - mx) * (p.z - mx); }))) };
  }
  function hardness(p, model, slope) { var b = slope == null ? model.b : slope; return b * (p.z - model.meanZ) - (p.y - model.meanY); }
  function difficultyIndex(h) { return 100 * sigmoid(h); }
  function context(exams, subject) {
    var observations = exams.map(function (e, i) { return observation(e, subject, i); });
    var signature = JSON.stringify(observations.map(function (o) { return [key(o.e), o.day, o.e.grade_level || '', o.score, o.max, o.pos, o.N]; }));
    var perSubject = cache.get(exams); if (!perSubject) { perSubject = Object.create(null); cache.set(exams, perSubject); }
    if (perSubject[subject] && perSubject[subject].signature === signature) return perSubject[subject];
    var seen = Object.create(null), unique = [];
    // Duplicate IDs are one exam; keep the final supplied record.
    observations.slice().reverse().forEach(function (o) { var k = key(o.e); if (!seen[k]) { seen[k] = true; if (o.valid) unique.push(o); } });
    unique.sort(function (a, b) { return a.day - b.day || key(a.e).localeCompare(key(b.e)); });
    var categories = Object.create(null), groups = [], byIndex = Object.create(null);
    unique.forEach(function (o) {
      var category = String(o.e.grade_level || ''), group = categories[category];
      if (!group || Math.abs(o.N - median(group.points.map(function (p) { return p.N; }))) / Math.max(o.N, median(group.points.map(function (p) { return p.N; }))) >= 0.3) {
        group = { points: [], category: category }; groups.push(group); categories[category] = group;
      }
      group.points.push(o); o.group = group; byIndex[o.index] = o;
    });
    groups.forEach(function (group) { if (group.points.length >= 3) group.model = fit(group.points); });
    var result = { signature: signature, observations: observations, groups: groups, byIndex: byIndex };
    perSubject[subject] = result; return result;
  }
  function scoreOnScale(cur, delta, max) {
    if (Math.abs(delta) < 1e-10) return cur.score / cur.max * max;
    return max * sigmoid(cur.y + delta);
  }
  function compare(exams, subject, index, options) {
    options = options || { mode: 'history' };
    var e = exams[index], out = { kind: 'empty', referenceMode: options.mode || 'history', references: [] };
    if (!e) { out.reason = '先录入一次考试，就可以建立你的成绩参考尺子。'; return out; }
    var cur = observation(e, subject, index); out.current = cur;
    if (!cur.scoreValid) { out.reason = '补齐这次的成绩和满分，就能开始比较。'; return out; }
    if (out.referenceMode === 'exam' && Number(options.exam) === index) {
      out.kind = 'identity'; out.value = cur.score; out.targetMax = cur.max; out.low = cur.score; out.high = cur.score; out.references = [cur]; out.referenceLabel = e.name || '本次考试'; out.quality = 'identity';
      var self = context(exams, subject).byIndex[index];
      if (self && self.group.model) { out.modelN = self.group.points.length; out.difficulty = out.referenceDifficulty = difficultyIndex(hardness(self, self.group.model)); }
      return out;
    }
    if (!cur.rankValid) { out.reason = '还需要这科的年级排名（或排名位置）和参考人数。少于 30 人时，暂不估计难度。'; return out; }
    if (cur.day === null) { out.reason = '补齐有效的考试日期，就能建立参考尺子。'; return out; }
    var ctx = context(exams, subject), point = ctx.byIndex[index];
    if (!point) { out.reason = '这场考试有重复记录，已避免重复计入参考尺子。'; return out; }
    var group = point.group, model = group.model; out.modelN = group.points.length;
    if (!model) { out.reason = '这组可比较的记录还不足 3 场。补齐成绩、满分和年级排名后，就能估计相对难度。'; return out; }
    var refs = group.points, max = cur.max, label = '历史平均';
    if (out.referenceMode === 'period') {
      var start = day({ exam_date: options.start }), end = day({ exam_date: options.end });
      if (start === null || end === null || start > end) { out.reason = '选一个完整的日期范围，开始日期要早于或等于结束日期。'; return out; }
      refs = refs.filter(function (p) { return p.day >= start && p.day <= end; }); label = options.start + ' 至 ' + options.end;
    } else if (out.referenceMode === 'exam') {
      var ref = ctx.byIndex[Number(options.exam)];
      if (!ref || ref.group !== group) { out.reason = '参照考试需要有完整的单科成绩和排名，并属于同一分类、同一参考人群阶段。'; return out; }
      refs = [ref]; max = ref.max; label = ref.e.name || '参照考试';
    }
    if (!refs.length) { out.reason = '这个时间段内没有可用的参照考试，试试扩大日期范围。'; return out; }
    var h = hardness(point, model), refH = mean(refs.map(function (p) { return hardness(p, model); }));
    out.kind = 'estimate'; out.referenceLabel = label; out.references = refs; out.targetMax = max;
    out.value = scoreOnScale(point, h - refH, max); out.difficulty = difficultyIndex(h); out.referenceDifficulty = difficultyIndex(refH);
    out.sameMaxValue = scoreOnScale(point, h - refH, point.max); out.offset = h - refH;
    if (!group.slopes) {
      var count = Math.min(80, group.points.length), slopes = [];
      for (var i = 0; i < count; i++) {
        var omit = count === 1 ? 0 : Math.round(i * (group.points.length - 1) / (count - 1));
        slopes.push(fit(group.points.filter(function (_, j) { return j !== omit; })).b);
      }
      group.slopes = slopes;
    }
    // Sensitivity of the fitted slope: fixed full-history centering and fixed reference inputs.
    var values = group.slopes.map(function (b) {
      var delta = hardness(point, model, b) - mean(refs.map(function (p) { return hardness(p, model, b); }));
      return scoreOnScale(point, delta, max);
    }).concat(out.value);
    out.low = Math.min.apply(null, values); out.high = Math.max.apply(null, values); out.sensitivityRuns = group.slopes.length;
    var reasons = [];
    if (group.points.length < 8) reasons.push('历史记录还少');
    if (model.spreadZ < 0.15) reasons.push('历史排名变化较小，尺子的斜率还不明确');
    if (model.rawSlope <= 0 && model.spreadZ >= 0.15) reasons.push('分数与排名的历史关系较弱，换算更接近参照范围的平均得分率');
    if (model.dispersion > 0.5) reasons.push('历史分数与排名关系波动较大');
    if (out.high - out.low > max * 0.1) reasons.push('少用一场历史记录，换算结果就会明显变化');
    if (point.score === 0 || point.score === point.max || refs.some(function (p) { return p.score === 0 || p.score === p.max; })) reasons.push('含零分或满分，边界附近的换算更不确定');
    if (refs.length === 1) reasons.push('参照仅有一场考试，个人状态可能影响其难度估计');
    out.quality = reasons.length ? 'limited' : 'supported'; out.warnings = reasons; out.model = model;
    return out;
  }
  function cells(exams, subjects) {
    var result = Object.create(null);
    subjects.forEach(function (subject) {
      var ctx = context(exams, subject);
      Object.keys(ctx.byIndex).forEach(function (i) {
        var p = ctx.byIndex[i], m = p.group.model;
        if (m) result[i + '|' + subject] = { index: difficultyIndex(hardness(p, m)), n: p.group.points.length,
          limited: p.group.points.length < 8 || m.spreadZ < 0.15 || m.rawSlope <= 0 || m.dispersion > 0.5 };
      });
    }); return result;
  }
  window.__stScoreWorthModel = { observation: observation, compare: compare, cells: cells, fit: fit, context: context, day: day, key: key, difficultyIndex: difficultyIndex };
})();

/* ===== score-worth.js ===== */
(function () {
  'use strict';
  var M = window.__stScoreWorthModel, selections = Object.create(null);
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(v) { return String(Math.round(v * 10) / 10); }
  function plainWarnings(r) {
    var messages = {
      '历史记录还少': '目前只有 ' + r.modelN + ' 场可比较的记录，先把这个分数当作大致参考。',
      '历史排名变化较小，尺子的斜率还不明确': '这些考试的排名很接近，还不容易看清分数和排名之间的关系。',
      '分数与排名的历史关系较弱，换算更接近参照范围的平均得分率': '你的分数和排名没有明显一起变化，这次换算更接近参照考试的平均得分水平。',
      '历史分数与排名关系波动较大': '历史表现波动较大，换算分数只能作粗略参考。',
      '少用一场历史记录，换算结果就会明显变化': '换一组历史记录，参考分就会变化不少，暂时不要太看重这个数字。',
      '含零分或满分，边界附近的换算更不确定': '记录里有零分或满分，这类成绩不容易准确换算。',
      '参照仅有一场考试，个人状态可能影响其难度估计': '只和一场考试比较，也会受到那次发挥的影响。'
    };
    return (r.warnings || []).map(function (warning) { return messages[warning] || warning + '。'; });
  }
  function briefWarning(r) {
    if (r.modelN < 8) return '仅 ' + r.modelN + ' 场记录，先作参考。';
    var hints = {
      '历史排名变化较小，尺子的斜率还不明确': '历史排名太接近，先作参考。',
      '分数与排名的历史关系较弱，换算更接近参照范围的平均得分率': '分数与排名关系不明显，先作参考。',
      '历史分数与排名关系波动较大': '历史表现波动较大，先作参考。',
      '少用一场历史记录，换算结果就会明显变化': '换用历史记录后变化较大，先作参考。',
      '含零分或满分，边界附近的换算更不确定': '含零分或满分，先作参考。',
      '参照仅有一场考试，个人状态可能影响其难度估计': '只参照一场考试，先作参考。'
    };
    return hints[(r.warnings || [])[0]] || '换算结果仅供参考。';
  }
  function rgb(value, fallback) {
    var hex = /^#([\da-f]{6}|[\da-f]{3})$/i.exec(String(value).trim());
    if (hex) { var s = hex[1]; if (s.length === 3) s = s.replace(/./g, function (c) { return c + c; }); return [0, 2, 4].map(function (i) { return parseInt(s.slice(i, i + 2), 16); }); }
    var numbers = String(value).match(/[\d.]+/g);
    return /^rgba?\(/.test(String(value).trim()) && numbers && numbers.length >= 3 ? numbers.slice(0, 3).map(Number) : fallback;
  }
  function heatColor(value) {
    var theme = getComputedStyle(document.documentElement), accent = rgb(theme.getPropertyValue('--accent'), [93, 114, 232]);
    var panel = rgb(theme.getPropertyValue('--panel-solid'), [255, 255, 255]);
    // One fixed, continuous 0–100 scale; never rescale to a row or the visible range.
    var amount = 0.08 + 0.84 * Math.max(0, Math.min(100, Number(value))) / 100;
    var fill = panel.map(function (v, i) { return Math.round(v + (accent[i] - v) * amount); });
    var linear = fill.map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    return { background: 'rgb(' + fill.join(',') + ')', color: (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff' };
  }
  function heatStyle(value) { var c = heatColor(value); return 'background:' + c.background + ';color:' + c.color; }
  function heatRamp() { return 'linear-gradient(90deg,' + [0, 25, 50, 75, 100].map(function (v) { return heatColor(v).background; }).join(',') + ')'; }
  function paintHeatmap() {
    document.querySelectorAll('[data-worth-heat]').forEach(function (cell) { var c = heatColor(cell.dataset.worthHeat); cell.style.background = c.background; cell.style.color = c.color; });
    document.querySelectorAll('[data-worth-heat-ramp]').forEach(function (ramp) { ramp.style.background = heatRamp(); });
  }
  function selection(f) {
    var user = typeof state !== 'undefined' && state.user || {}, uk = String(user.id || user.username || 'guest');
    var s = selections[uk] || (selections[uk] = { mode: 'history' }), subjects = f.subjects || [], exams = f.exams || [];
    if (subjects.indexOf(s.subject) < 0) s.subject = subjects[0] || '';
    var index = exams.findIndex(function (e) { return M.key(e) === s.exam; });
    if (index < 0) {
      index = exams.length - 1;
      for (var i = exams.length - 1; i >= 0; i--) { if (subjects.some(function (sub) { return M.observation(exams[i], sub).scoreValid; })) { index = i; break; } }
      s.exam = index >= 0 ? M.key(exams[index]) : '';
      var scored = subjects.filter(function (sub) { return index >= 0 && M.observation(exams[index], sub).scoreValid; });
      if (scored.length && scored.indexOf(s.subject) < 0) s.subject = scored[0];
    }
    s.index = index;
    var p = M.context(exams, s.subject).byIndex[index], candidates = p ? p.group.points : [];
    var reference = candidates.find(function (o) { return M.key(o.e) === s.refExam; });
    if (!reference) {
      var previous = candidates.filter(function (o) { return o.day < p.day; });
      reference = previous[previous.length - 1] || candidates[candidates.length - 1]; s.refExam = reference ? M.key(reference.e) : '';
    }
    s.refIndex = reference ? reference.index : index;
    if (s.start === undefined || s.end === undefined) {
      var date = exams[index] && M.day(exams[index]);
      if (date !== null && date !== undefined) { s.end = exams[index].exam_date; s.start = new Date((date - 90) * 86400000).toISOString().slice(0, 10); }
    }
    return s;
  }
  function result(f, s) { return M.compare(f.exams, s.subject, s.index, { mode: s.mode, exam: s.refIndex, start: s.start, end: s.end }); }
  function examOptions(exams, index, indices) {
    return exams.map(function (e, i) {
      if (indices && indices.indexOf(i) < 0) return '';
      return '<option value="' + i + '"' + (i === index ? ' selected' : '') + '>' + esc((e.exam_date || '') + ' · ' + (e.name || '未命名考试')) + '</option>';
    }).reverse().join('');
  }
  function html(f) {
    var s = selection(f), r = result(f, s), cur = r.current;
    var p = M.context(f.exams, s.subject).byIndex[s.index], candidates = p ? p.group.points.map(function (o) { return o.index; }) : [s.index];
    var reference = '<div class="worth-ref-modes" role="group" aria-label="选择参照难度">' + [ ['history', '历史平均'], ['period', '一段时间'], ['exam', '某次考试'] ].map(function (pair) {
      return '<button type="button" class="chip' + (s.mode === pair[0] ? ' active' : '') + '" data-worth-mode="' + pair[0] + '" aria-pressed="' + (s.mode === pair[0]) + '">' + pair[1] + '</button>';
    }).join('') + '</div>';
    if (s.mode === 'period') reference += '<div class="worth-controls worth-dates"><label>开始日期<input type="date" value="' + esc(s.start || '') + '" data-worth-control="start"></label><label>结束日期<input type="date" value="' + esc(s.end || '') + '" data-worth-control="end"></label></div>';
    if (s.mode === 'exam') reference += '<label class="worth-ref-exam">参照考试<select data-worth-control="reference">' + examOptions(f.exams, s.refIndex, candidates) + '</select></label>';
    var body = '';
    if (cur && cur.scoreValid) {
      body = '<div class="worth-compare"><div class="worth-number"><span>本次实际成绩</span><strong>' + fmt(cur.score) + '<small> / ' + fmt(cur.max) + '</small></strong><p>' + (cur.rankValid ? '年级前 ' + fmt(cur.pos) + '%' : '还没有可比较的排名') + '</p></div>';
      body += '<div class="worth-number worth-reference"><span>换算参考分 <small>估计</small></span><strong>' + (r.kind === 'empty' ? '—' : '约 ' + fmt(r.value) + '<small> / ' + fmt(r.targetMax) + '</small>') + '</strong><p>' + (r.kind === 'empty' ? '还需要一些数据' : esc(r.referenceLabel)) + '</p></div></div>';
    }
    if (r.kind === 'empty') body += '<p class="worth-message" role="status">' + esc(r.reason) + '</p>';
    else {
      body += '<p class="worth-message">' + (r.kind === 'identity' ? '参照就是本次考试，成绩不变。' : '按' + (s.mode === 'history' ? '历史平均难度' : s.mode === 'period' ? '这段时间的平均难度' : '这场考试的难度') + '，约相当于 <b>' + fmt(r.value) + ' 分</b>。') + '</p>';
      if (r.kind !== 'identity' && r.quality === 'limited') body += '<div class="worth-stability"><p>' + esc(briefWarning(r)) + '</p></div>';
      var rows = r.references.slice().sort(function (a, b) { return b.day - a.day; });
      var model = p && p.group.model, difficultyCells = model ? M.cells(f.exams, [s.subject]) : {};
      body += '<details class="worth-evidence worth-records"><summary>参考考试 · ' + rows.length + ' 场</summary>';
      body += '<div class="worth-table-scroll" tabindex="0" role="region" aria-label="参照考试依据"><table class="worth-table"><thead><tr><th>考试</th><th>实际成绩</th><th>年级排名</th><th>难度参考</th><th></th></tr></thead><tbody>' + rows.map(function (o) {
        var cell = difficultyCells[o.index + '|' + s.subject];
        return '<tr><td>' + esc(o.e.name || '未命名考试') + '<small>' + esc(o.e.exam_date || '') + '</small></td><td>' + fmt(o.score) + ' / ' + fmt(o.max) + '</td><td>' + (o.rankValid ? '前 ' + fmt(o.pos) + '%<small>' + o.N + ' 人</small>' : '—') + '</td><td>' + (cell ? fmt(cell.index) : '—') + '</td><td><button type="button" class="worth-link" data-worth-reference="' + o.index + '">用作参照</button></td></tr>';
      }).join('') + '</tbody></table></div></details>';
      body += '<details class="worth-evidence worth-method"><summary>怎么算的？</summary>';
      if (r.difficulty != null) body += '<div class="worth-difficulty"><div><span>本次难度参考</span><b>' + fmt(r.difficulty) + '</b></div><div><span>参照难度参考</span><b>' + fmt(r.referenceDifficulty) + '</b></div><div><span>参考记录</span><b>' + rows.length + '<small> 场</small></b></div></div><p class="worth-note">50 为这组考试的平均难度，数字越大，估计相对越难；不是难度概率。</p>';
      body += '<p class="worth-note">用 ' + (r.modelN || 1) + ' 场可比较的分数与年级排名估算难度，再换到你选择的参照难度。分类不同或人数明显变化时分开计算。</p><p class="worth-note">历史平均和时间段平均包含范围内的本次考试。回看旧考试也会用到后来录入的记录，不是当时的预测。指定考试按它的满分换算，其他参照按本次满分。</p>';
      if (r.kind !== 'identity') {
        body += plainWarnings(r).map(function (warning) { return '<p class="worth-note">' + esc(warning) + '</p>'; }).join('');
        body += '<p class="worth-note worth-sensitivity">每次少用一场记录重算，结果为 ' + fmt(r.low) + '–' + fmt(r.high) + ' 分。结果相近不说明分数一定准确；不是预测区间或置信区间，也不是下次考试的分数范围。</p>';
      }
      body += '<p class="worth-note">个人发挥、赋分和参考人群变化都可能影响估算，不能当作试卷的真实难度或正式等值分。</p></details>';
    }
    return '<section class="card worth-card" id="scoreWorthCard" aria-labelledby="scoreWorthTitle" data-worth-result="' + r.kind + '" data-worth-quality="' + (r.quality || 'missing') + '"><div class="card-title-row"><h3 class="card-title" id="scoreWorthTitle">成绩含金量</h3></div><div class="worth-controls"><label>科目<select data-worth-control="subject">' + f.subjects.map(function (sub) { return '<option' + (sub === s.subject ? ' selected' : '') + '>' + esc(sub) + '</option>'; }).join('') + '</select></label><label>本次考试<select data-worth-control="exam">' + examOptions(f.exams, s.index) + '</select></label></div><div class="worth-reference-choice"><span>参照难度</span>' + reference + '</div>' + body + '<p class="worth-note worth-limit">估算仅供参考，实际成绩不会改变。</p></section>';
  }
  function track(name, metadata) { try { if (window.__stTrack) window.__stTrack(name, metadata); } catch (_) {} }
  function report(f, source) { var s = selection(f), r = result(f, s); track('score_worth_view', { source: source, result: r.kind, reference_mode: s.mode, model_count: r.modelN || 0, reference_count: r.references.length, quality: r.quality || 'missing', version: 2 }); }
  function bind(root, f) {
    var card = root.querySelector('#scoreWorthCard'); if (!card) return;
    function watch(node) { node.querySelectorAll('details').forEach(function (details) { details.addEventListener('toggle', function () { if (details.open) track('score_worth_evidence_open', { source: details.classList.contains('worth-method') ? 'method' : 'records', version: 2 }); }); }); }
    function replace(source, selector) {
      card.outerHTML = html(f); card = root.querySelector('#scoreWorthCard'); watch(card); report(f, source);
      var control = selector && card.querySelector(selector); if (control) control.focus({ preventScroll: true });
    }
    watch(card);
    if (typeof IntersectionObserver === 'function') {
      var watched = card, cleanup;
      var observer = new IntersectionObserver(function (entries) { if (entries.some(function (e) { return e.isIntersecting; })) { report(f, 'analysis'); observer.disconnect(); if (cleanup) cleanup.disconnect(); } }, { threshold: 0.25 });
      cleanup = new MutationObserver(function () { if (!watched.isConnected) { observer.disconnect(); cleanup.disconnect(); } }); cleanup.observe(root.parentNode, { childList: true, subtree: true }); observer.observe(watched);
    } else report(f, 'analysis');
    root.addEventListener('change', function (ev) {
      var control = ev.target.closest('[data-worth-control]'); if (!control) return;
      var s = selection(f), type = control.dataset.worthControl;
      if (type === 'subject' && f.subjects.indexOf(control.value) >= 0) s.subject = control.value;
      else if (type === 'exam' && f.exams[Number(control.value)]) s.exam = M.key(f.exams[Number(control.value)]);
      else if (type === 'reference' && f.exams[Number(control.value)]) s.refExam = M.key(f.exams[Number(control.value)]);
      else if (type === 'start' || type === 'end') s[type] = control.value;
      track('score_worth_selection', { control: type, version: 2 }); replace('selection', '[data-worth-control="' + type + '"]');
    });
    root.addEventListener('click', function (ev) {
      var mode = ev.target.closest('[data-worth-mode]');
      if (mode) { var s = selection(f); s.mode = mode.dataset.worthMode; track('score_worth_reference_mode', { mode: s.mode, version: 2 }); replace('reference', '[data-worth-mode="' + s.mode + '"]'); return; }
      var ref = ev.target.closest('[data-worth-reference]');
      if (ref && f.exams[Number(ref.dataset.worthReference)]) { var s = selection(f); s.mode = 'exam'; s.refExam = M.key(f.exams[Number(ref.dataset.worthReference)]); track('score_worth_reference_selected', { source: 'evidence', version: 2 }); replace('reference', '[data-worth-control="reference"]'); return; }
      var metric = ev.target.closest('[data-worth-matrix-mode]');
      if (metric) {
        state.sv31.matrixWorth = metric.dataset.worthMatrixMode; track('score_worth_matrix_metric', { view: state.sv31.matrixWorth, version: 2 }); window.__v32.rerender();
        var selectedMetric = document.querySelector('[data-worth-matrix-mode="' + state.sv31.matrixWorth + '"]'); if (selectedMetric) selectedMetric.focus({ preventScroll: true });
        return;
      }
      var button = ev.target.closest('[data-worth-matrix]'); if (!button) return;
      var i = Number(button.dataset.worthMatrix), subject = button.dataset.worthSubject;
      if (!f.exams[i] || f.subjects.indexOf(subject) < 0) return;
      var s = selection(f); s.subject = subject; s.exam = M.key(f.exams[i]);
      track('score_worth_matrix_open', { version: 2 }); replace('matrix'); card.setAttribute('tabindex', '-1'); card.focus({ preventScroll: true });
      if (card.scrollIntoView) card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  }
  var style = document.createElement('style'); style.id = 'score-worth-style';
  style.textContent = '.worth-card{scroll-margin-top:24px;min-width:0}.worth-tag{display:inline-block;font-size:10px;font-weight:600;color:var(--accent);background:var(--accent-soft);padding:4px 8px;border-radius:999px;vertical-align:middle}.worth-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:12px;margin:14px 0}.worth-controls label,.worth-ref-exam{display:block;min-width:0;font-size:12px;color:var(--muted)}.worth-controls select,.worth-controls input,.worth-ref-exam select{box-sizing:border-box;display:block;width:100%;min-width:0;max-width:100%;margin-top:6px;border:1px solid var(--line);border-radius:12px;padding:10px;color:var(--text);background:var(--panel-solid);font:inherit;min-height:42px}.worth-reference-choice{margin:16px 0}.worth-reference-choice>span{font-size:12px;color:var(--muted)}.worth-ref-modes{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.worth-ref-exam{margin-top:12px}.worth-dates{grid-template-columns:repeat(2,minmax(0,1fr))}.worth-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.worth-number{padding:16px;border:1px solid var(--line);border-radius:15px;min-width:0;background:var(--panel-solid)}.worth-reference{background:var(--accent-soft)}.worth-number>span,.worth-number p{font-size:12px;color:var(--muted)}.worth-number strong{display:block;font-size:32px;line-height:1.3;letter-spacing:-.5px;margin-top:8px;font-variant-numeric:tabular-nums;color:var(--text)}.worth-reference strong{color:var(--accent)}.worth-number small{font-size:13px;font-weight:500;letter-spacing:0}.worth-number p{margin:6px 0 0;overflow-wrap:anywhere}.worth-message{font-size:14px;line-height:1.8;margin:16px 0 8px;overflow-wrap:anywhere}.worth-note{color:var(--muted);font-size:12px;line-height:1.8;overflow-wrap:anywhere}.worth-limit{border-top:1px solid var(--line);padding-top:12px;margin-bottom:0}.worth-difficulty{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:16px 0 8px}.worth-difficulty>div{border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0}.worth-difficulty span{font-size:11px;color:var(--muted)}.worth-difficulty b{display:block;font-size:22px;margin-top:7px;font-variant-numeric:tabular-nums}.worth-difficulty small{font-size:12px;font-weight:500}.worth-stability{border-left:3px solid var(--accent);padding:10px 12px;background:var(--chip-bg);border-radius:10px;margin:14px 0}.worth-stability p{margin:7px 0 0;font-size:12px;line-height:1.8;color:var(--muted)}.worth-evidence{margin:14px 0}.worth-evidence summary{cursor:pointer;font-size:12px;color:var(--accent);padding:6px 0}.worth-table-scroll{overflow:auto;max-height:280px;border:1px solid var(--line);border-radius:12px}.worth-table{width:100%;min-width:530px;border-collapse:collapse;font-size:12px}.worth-table th{position:sticky;top:0;background:var(--panel-solid);text-align:left;font-weight:600;z-index:1}.worth-table td,.worth-table th{padding:10px;border-bottom:1px solid var(--line)}.worth-table small{display:block;color:var(--muted);font-size:10px;margin-top:5px}.worth-table td:first-child{max-width:180px;overflow-wrap:anywhere}.worth-link{border:0;padding:7px;background:transparent;color:var(--accent);cursor:pointer;font:inherit;white-space:nowrap}.worth-matrix-button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;display:block;width:100%;min-height:32px;padding:4px;border-radius:5px}.worth-matrix-button:focus-visible{outline:2px solid currentColor;outline-offset:2px}.worth-card:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.worth-matrix-controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.worth-matrix-weak{display:block;font-size:9px;opacity:.8;margin-top:2px}@media(max-width:480px){.worth-controls{grid-template-columns:minmax(0,1fr)}.worth-dates{grid-template-columns:minmax(0,1fr)}.worth-number{padding:12px}.worth-number strong{font-size:28px}.worth-difficulty>div{padding:10px}.worth-difficulty span{font-size:10px}}';
  document.head.appendChild(style);
  style.textContent += '.worth-matrix-card{min-width:0}.worth-matrix-scroll{width:100%;max-width:100%;overflow:auto;max-height:480px;border:1px solid var(--line);border-radius:12px;-webkit-overflow-scrolling:touch}.worth-matrix-scroll:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.worth-matrix-table{table-layout:fixed;border-collapse:separate;border-spacing:0;width:100%;font-size:13px;font-variant-numeric:tabular-nums}.worth-matrix-table th,.worth-matrix-table td{box-sizing:border-box;padding:8px 6px;height:62px;border:0;border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:center;vertical-align:middle;white-space:normal;word-break:normal;overflow-wrap:normal}.worth-matrix-table thead th{position:sticky;top:0;z-index:2;height:42px;background:var(--panel-solid);color:var(--muted);font-weight:600}.worth-matrix-table tr>:first-child{position:sticky;left:0;z-index:1;background:var(--panel-solid);color:var(--text);text-align:left;padding:10px 12px;box-shadow:2px 0 0 var(--line)}.worth-matrix-table thead tr>:first-child{z-index:3;color:var(--muted)}.worth-exam-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.4;max-height:2.8em;font-weight:600;overflow-wrap:anywhere}.worth-exam-date{display:block;font-size:10px;line-height:1.4;font-weight:400;color:var(--muted);margin-top:4px;white-space:nowrap}.worth-matrix-table .worth-matrix-button{min-height:44px;padding:6px 0;position:relative;white-space:nowrap;font-weight:600;font-size:14px;border-radius:4px}.worth-heat-limited{display:inline-block;font-size:11px;margin-left:3px;vertical-align:super;line-height:1}.worth-heat-legend{max-width:320px;margin:0 0 12px;color:var(--muted);font-size:11px}.worth-heat-ramp{height:10px;border-radius:5px;position:relative;overflow:hidden}.worth-heat-ramp:after{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:2px solid var(--panel-solid)}.worth-heat-labels{display:flex;justify-content:space-between;margin-top:5px;gap:8px}.worth-matrix-hint{font-size:11px;color:var(--muted);line-height:1.7;margin:8px 0 12px}@media(max-width:480px){.worth-matrix-scroll{max-height:420px}.worth-matrix-table th,.worth-matrix-table td{height:60px}.worth-matrix-card .card-title-row{flex-wrap:wrap;gap:8px}.worth-matrix-card .legend{flex-wrap:wrap;gap:8px}}';
  // A single theme watcher reads the current DOM, so page switches retain no old cards.
  if (typeof MutationObserver === 'function') new MutationObserver(paintHeatmap).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] });
  window.__stScoreWorth = { html: html, bind: bind, compare: M.compare, observation: M.observation, difficultyCells: M.cells, heatStyle: heatStyle, heatRamp: heatRamp, heatColor: heatColor };
})();

/* ===== release-notices.js ===== */
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
  function anonymousName(v) { var s=String(v||'用户').trim()||'用户'; return s.length<=1?s:s[0]+'*'+s[s.length-1]; }
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
    s.textContent+='.rn-support-link{border:0;padding:0;background:transparent;color:var(--accent,#5d72e8);font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.rn-support-link[hidden]{display:none}';
    s.textContent+='.rn-history{display:flex;align-items:center;gap:12px;margin:0 0 18px;font-size:12px;color:var(--muted)}.rn-history select{flex:1;min-width:0;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel-solid);color:var(--text);font:inherit}';
  }
  function close(reason) {
    if(!modal)return;var old=modal;modal=null;
    track(old.kind==='release'?'update_prompt_dismissed':'announcement_dismissed',{target_version:old.id,source:old.source,reason:reason,duration_ms:Date.now()-old.started,needs_update:old.outdated});
    old.back.remove();document.body.style.overflow=old.overflow;
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
    back.innerHTML='<section class="rn-modal" role="dialog" aria-modal="true" aria-labelledby="rnTitle" aria-describedby="rnContent"><div class="rn-head"><div class="rn-icon" aria-hidden="true">'+(item.kind==='release'?'✦':'↗')+'</div><button class="rn-close" type="button" aria-label="关闭">×</button></div><div class="rn-kicker">'+(item.kind==='release'?'成绩轨迹 · '+esc(item.id):'成绩轨迹')+'</div><h2 class="rn-title" id="rnTitle">'+esc(item.title)+'</h2><div class="rn-content" id="rnContent">'+noticeMarkup(item.content)+'</div>'+(item.kind==='release'?'<div class="rn-status">'+(outdated?'你正在使用 '+esc(CURRENT)+'，更新后就能体验新功能。':'你已经在使用 '+esc(CURRENT)+'，快去试试吧。')+'</div>':'')+'<div class="rn-actions"><button class="rn-action" type="button">'+(outdated?'现在更新':'我知道了')+'</button></div></section>';
    lastFocus=document.activeElement;modal=Object.assign({},item,{back:back,outdated:outdated,started:Date.now(),overflow:document.body.style.overflow});document.body.style.overflow='hidden';document.body.appendChild(back);
    if(item.manual&&item.releases&&item.releases.length>1){
      var history=document.createElement('label');history.className='rn-history';history.innerHTML='更新记录<select aria-label="选择更新版本">'+item.releases.map(function(r){return '<option value="'+esc(r.version)+'"'+(r.version===item.id?' selected':'')+'>'+esc(r.version)+(r.version===item.releases[0].version?' · 最新':'')+'</option>';}).join('')+'</select>';back.querySelector('.rn-title').before(history);
      history.querySelector('select').onchange=function(){var selected=item.releases.find(function(r){return r.version===history.querySelector('select').value;});if(!selected)return;track('version_history_selected',{target_version:selected.version,source:'manual'});close('history_selected');show(Object.assign({},item,{id:selected.version,title:selected.title,content:selected.content}));};
    }
    if(item.manual&&item.kind==='announcement'&&item.announcements&&item.announcements.length>1){
      var announcementHistory=document.createElement('label');announcementHistory.className='rn-history';announcementHistory.innerHTML='公告记录<select aria-label="选择公告">'+item.announcements.map(function(r){return '<option value="'+esc(r.id)+'"'+(r.id===item.id?' selected':'')+'>'+esc(r.title||'公告')+(r.id===item.announcements[0].id?' · 最新':'')+'</option>';}).join('')+'</select>';back.querySelector('.rn-title').before(announcementHistory);
      announcementHistory.querySelector('select').onchange=function(){var selected=item.announcements.find(function(r){return r.id===announcementHistory.querySelector('select').value;});if(!selected)return;track('announcement_history_selected',{notice_id:selected.id,source:'settings'});close('history_selected');show(Object.assign({},item,selected,{manual:true,commentsEnabled:selected.id!==item.announcements[0].id||selected.comments_enabled===true,commentsReadOnly:selected.id!==item.announcements[0].id,commentsPublic:selected.comments_public!==false,commentTitle:selected.comment_title||'想听听大家的意见'}));};
    }
    mountComments(item,back);
    if(item.manual&&item.kind==='release'&&latestConfig.announcement_enabled&&latestConfig.announcement_content){var open=document.createElement('button');open.type='button';open.className='rn-more';open.textContent='查看公告';back.querySelector('.rn-actions').before(open);open.onclick=function(){var c=latestConfig;close('open_announcement');show({user:item.user,kind:'announcement',id:c.announcement_id,title:c.announcement_title,content:c.announcement_content,commentsEnabled:c.announcement_comments_enabled,commentsPublic:c.announcement_comments_public!==false,commentTitle:c.announcement_comment_title,announcements:item.announcements||[],manual:true,source:'manual'});};}
    mark(item.user,item.kind,item.id);
    if(item.manual&&item.user.id!=='guest')call('notice_claim',{kind:item.kind,notice_id:item.id},item.user).catch(function(e){track('notice_claim_failed',{kind:item.kind,notice_id:item.id,status:e.status||0});});
    track(item.kind==='release'?'update_prompt_shown':'announcement_shown',{target_version:item.id,source:item.source,manual:item.manual,needs_update:outdated});
    var button=back.querySelector('.rn-actions > .rn-action');button.focus();back.querySelector('.rn-close').onclick=function(){close('close_button');};back.onclick=function(e){if(e.target===back)close('backdrop');};
    back.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close('escape');}if(e.key==='Tab'){var buttons=back.querySelectorAll('button:not([disabled]):not([hidden]),textarea,input,select'),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    button.onclick=async function(){if(!outdated){track(item.kind==='release'?'update_acknowledged':'announcement_acknowledged',{target_version:item.id,source:item.source});close('acknowledged');return;}button.disabled=true;button.textContent='正在更新…';try{sessionStorage.setItem('st_notice_update_pending',JSON.stringify({user_id:item.user.id,from:CURRENT,to:item.id}));}catch(_){}await Promise.race([Promise.resolve(track('update_apply',{from:CURRENT,to:item.id,source:item.source})),new Promise(function(resolve){setTimeout(resolve,500);})]);var url=new URL(location.href);url.searchParams.set('__update',Date.now());location.replace(url.href);};
    mountSupport(back,modal);
  }
  function mountComments(item,back) {
    if(item.kind!=='announcement'||!item.commentsEnabled)return;
    var section=document.createElement('section');section.className='rn-comments';
    section.innerHTML='<h3>'+esc(item.commentTitle||'想听听大家的意见')+'</h3>'+(item.commentsPublic===false?'<div class="rn-comments-hint">这里只显示你自己的评论，其他用户的评论对你不可见。</div>':'')+'<div class="rn-comment-list"></div><button type="button" class="rn-more" hidden>查看更多评论</button><form class="rn-comment-form"><label for="rnComment">你的想法</label><textarea id="rnComment" maxlength="1000" rows="3" placeholder="说说你的想法吧" required></textarea><div class="rn-comment-bottom"><span role="status" class="rn-comment-status"></span><button type="submit" class="rn-action">发表评论</button></div></form>';
    back.querySelector('.rn-actions').before(section);
    var list=section.querySelector('.rn-comment-list'),more=section.querySelector('.rn-more'),form=section.querySelector('form'),status=section.querySelector('[role="status"]'),submit=form.querySelector('button'),input=form.querySelector('textarea'),next=null,loading=false;
    function archiveComments(){item.commentsReadOnly=true;form.hidden=true;section.insertBefore(status,form);if(!section.querySelector('.rn-comment-archive')){var archived=document.createElement('p');archived.className='rn-comments-hint rn-comment-archive';archived.textContent='这条公告已归档，可查看当时的评论。';section.querySelector('h3').after(archived);}}
    if(item.commentsReadOnly)archiveComments();
    function current(){var u=user();return back.isConnected&&u&&u.id===item.user.id&&u.token===item.user.token;}
    async function load(append){if(loading)return;loading=true;more.disabled=true;status.textContent='正在加载评论…';try{var data=await call('announcement_comments',{notice_id:item.id,before:append?next:null},item.user);if(!current())return;if(data.read_only===true)archiveComments();if(!append)list.innerHTML='';(data.rows||[]).forEach(function(row){var article=document.createElement('article');article.className='rn-comment';article.innerHTML='<div class="rn-comment-meta"><b>'+esc(anonymousName(row.author))+'</b><time>'+esc(new Date(row.created_at).toLocaleString())+'</time>'+(row.can_delete&&!item.commentsReadOnly?'<button type="button">删除</button>':'')+'</div><div class="rn-comment-text">'+esc(row.content)+'</div>';var del=article.querySelector('button');if(del)del.onclick=async function(){del.disabled=true;try{await call('announcement_comment_delete',{notice_id:item.id,id:row.id},item.user);if(current())await load(false);}catch(e){status.textContent=e.message;}finally{del.disabled=false;}};list.appendChild(article);});if(!list.children.length)list.textContent=item.commentsReadOnly?'这条公告还没有评论。':'还没有评论，欢迎说说你的想法。';next=data.next;more.hidden=!next;status.textContent='';}catch(e){if(current())status.textContent=e.message;}finally{loading=false;more.disabled=false;}}
    more.onclick=function(){load(true);};
    form.onsubmit=async function(e){e.preventDefault();if(!current()||item.commentsReadOnly)return;var content=input.value.trim();if(!content){status.textContent='写点内容再发送吧';return;}submit.disabled=true;status.textContent='正在发送…';try{await call('announcement_comment_add',{notice_id:item.id,content:content},item.user);if(!current())return;input.value='';await load(false);if(!status.textContent)status.textContent='评论已发送';}catch(e){if(current())status.textContent=e.message;}finally{submit.disabled=false;}};
    if(item.user.id==='guest'){form.hidden=true;list.textContent=item.commentsReadOnly?'登录后可以查看当时的评论':'登录后可以查看和发表评论';return;}load(false);
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
      releases=releases.filter(function(r){return r&&/^v?\d+(\.\d+){0,2}$/i.test(r.version)&&typeof r.title==='string'&&typeof r.content==='string';}).map(function(r){return {version:version(r.version),title:r.title,content:r.content};}).filter(function(r,i,a){return a.findIndex(function(x){return x.version===r.version;})===i;});
      releases=releases.filter(function(r){return r.version!==target;}).sort(function(a,b){return compare(b.version,a.version);});releases.unshift({version:target,title:title,content:content});
      var announcements=manual&&results[0].status==='fulfilled'&&Array.isArray(results[0].value.announcements)?results[0].value.announcements:[];
      announcements=announcements.filter(function(r){return r&&typeof r.id==='string'&&r.id.length===24&&typeof r.title==='string'&&typeof r.content==='string';}).map(function(r){return {id:r.id,title:r.title,content:r.content,updated_at:r.updated_at||null,comments_enabled:r.id===c.announcement_id&&c.announcement_enabled===true&&r.comments_enabled===true,comments_public:r.comments_public!==false,comment_title:r.comment_title||'想听听大家的意见'};});
      if(c.announcement_content&&c.announcement_id&&!announcements.some(function(r){return r.id===c.announcement_id;}))announcements.unshift({id:c.announcement_id,title:c.announcement_title,content:c.announcement_content,updated_at:c.updated_at,comments_enabled:c.announcement_enabled===true&&c.announcement_comments_enabled===true,comments_public:c.announcement_comments_public!==false,comment_title:c.announcement_comment_title||'想听听大家的意见'});
      announcements=announcements.filter(function(r,i,a){return a.findIndex(function(x){return x.id===r.id;})===i;});
      if(manual&&manualKind==='announcement'){
        if(announcements.length){var announcement=announcements[0];enqueue({user:u,kind:'announcement',id:announcement.id,title:announcement.title,content:announcement.content,commentsEnabled:announcement.comments_enabled,commentsPublic:announcement.comments_public,commentTitle:announcement.comment_title,announcements:announcements,source:source,manual:true});}
        return;
      }
      if(!manual){pending=pending.filter(function(item){return item.kind!=='release'||item.manual||item.id===target;});if(modal&&modal.kind==='release'&&!modal.manual&&modal.id!==target)close('superseded');}
      if(manual||(u.id!=='guest'&&c.enabled!==false)){if(manual||!seen(u,'release',target))enqueue({user:u,kind:'release',id:target,title:title,content:content,source:source,manual:!!manual,releases:manual?releases:null,announcements:manual?announcements:null});else track('notice_suppressed',{kind:'release',notice_id:target,reason:'already_seen',source:source});}
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
  window.__releaseNotices={check:check,compareVersions:compare,currentVersion:function(){return CURRENT;},refreshSupport:function(){if(modal)mountSupport(modal.back,modal);},openAnnouncement:function(){track('announcement_manual_opened',{source:'settings'});return check('manual_announcement',true,'announcement');}};
})();

/* ===== account-recovery.js ===== */
/* Account recovery: anonymous tickets, private lookup, and new-account pickup. */
(function () {
  'use strict';
  var ENDPOINT = '/api/score-tracker-recovery';
  var LABELS = {pending:'等待审核',reviewing:'正在核验',needs_info:'需要补充信息',approved:'审核通过',rejected:'未通过审核',claimed:'已领取新账号'};
  var STATUS_HINTS = {pending:'已提交，等待管理员开始核验。',reviewing:'管理员正在核对账号归属，暂时不需要你补充信息。',needs_info:'管理员需要更多线索，请按工单中的问题补充后再提交。',approved:'已确认账号归属，新账号已经准备好，可以在有效期内领取。',rejected:'当前线索不足以确认归属，这张工单已结束，可以重新提交申请。',claimed:'新账号已经领取，可以用新用户名和密码登录。'};
  var active = null, draft = {}, mode = 'password', screen = 'apply', current = null, updateTimer = null, updatePromptOpen = false;
  function esc(v) { return escapeHtml(String(v == null ? '' : v)); }
  function recent() { try { var a=JSON.parse(localStorage.getItem('st_recovery_tickets')||'[]');return Array.isArray(a)?a.slice(0,5):[]; } catch (_) { return []; } }
  function recoveryClientId(){try{var key='st_recovery_client_id',value=localStorage.getItem(key);if(value&&/^[A-Za-z0-9_-]{20,80}$/.test(value))return value;var bytes=new Uint8Array(18);if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(bytes);else for(var i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);value=Array.prototype.map.call(bytes,function(b){return b.toString(16).padStart(2,'0')}).join('');localStorage.setItem(key,value);return value;}catch(_){return '';}}
  function remember(t,options) { try { var old=recent().find(function(x){return x.ticket_no===t.ticket_no}),history=Array.isArray(t.history)?t.history:[],next={ticket_no:t.ticket_no,key:t.key||(old&&old.key)||'',updated_at:t.updated_at||'',status:t.status||'',history_length:history.length||Number(t.history_length)||0,unseen_update:!!(old&&old.unseen_update),seen_updated_at:(old&&old.seen_updated_at)||''},changed=!!(old&&((old.updated_at&&next.updated_at&&old.updated_at!==next.updated_at)||(old.status&&next.status&&old.status!==next.status)));if(changed&&!options?.markSeen)next.unseen_update=true;if(options?.markSeen){next.unseen_update=false;next.seen_updated_at=next.updated_at||'';}localStorage.setItem('st_recovery_tickets',JSON.stringify([next].concat(recent().filter(function(x){return x.ticket_no!==t.ticket_no})).slice(0,5)));updateForgotBadge();return true; } catch (_) { return false; } }
  function unseenTickets() { return recent().filter(function(t){return t.unseen_update}); }
  function updateForgotBadge() { var b=document.getElementById('forgotPassword');if(!b)return;var count=unseenTickets().length;b.classList.toggle('has-updates',count>0);b.title=count?'有工单新进展，点击查看':'忘记密码？';b.setAttribute('aria-label',count?'忘记密码？有工单新进展':'忘记密码？'); }
  function latestHistory(t) { var h=Array.isArray(t&&t.history)?t.history:[];return h.length?h[h.length-1].content||'状态已更新':'状态已更新'; }
  function closeUpdatePrompt() { var m=document.getElementById('recoveryUpdatePrompt');if(m)m.remove();updatePromptOpen=false; }
  function showUpdatePrompt(updates) { if(updatePromptOpen||document.body.classList.contains('st-recovery-active')||document.querySelector('.modal-backdrop'))return;var m=document.createElement('div');m.id='recoveryUpdatePrompt';m.className='modal-backdrop recovery-update-backdrop';m.innerHTML='<div class="modal recovery-update-modal" role="dialog" aria-modal="true" aria-labelledby="recoveryUpdateTitle"><div class="modal-head"><h3 id="recoveryUpdateTitle">找回工单有新进展</h3><button class="close-btn" type="button" aria-label="稍后查看">×</button></div><div class="modal-body"><p class="recovery-intro">你保存的工单中有管理员回复或状态变化，记得及时查看。</p><div class="recovery-update-list">'+updates.map(function(t){return'<div class="recovery-update-item"><div><b>'+esc(t.ticket_no)+'</b><span class="pill">'+esc(LABELS[t.status]||'状态更新')+'</span></div><p>'+esc(latestHistory(t))+'</p></div>'}).join('')+'</div><div class="modal-actions"><button class="secondary cancel-btn" type="button">稍后查看</button><button class="primary" type="button" id="recoveryUpdateOpen">查看工单</button></div></div></div>';document.body.appendChild(m);updatePromptOpen=true;m.querySelector('.close-btn').onclick=closeUpdatePrompt;m.querySelector('.cancel-btn').onclick=closeUpdatePrompt;m.onclick=function(e){if(e.target===m)closeUpdatePrompt()};m.querySelector('#recoveryUpdateOpen').onclick=function(){var t=updates[0];closeUpdatePrompt();screen='query';renderRecovery();lookup(t)}; }
  async function checkRecentUpdates() { var items=recent(),updates=[];if(!items.length){updateForgotBadge();return;}for(var i=0;i<items.length;i++){var item=items[i];try{var result=await request('lookup',item),t=result.ticket||{},changed=!!(item.updated_at&&t.updated_at&&item.updated_at!==t.updated_at)||!!(item.status&&t.status&&item.status!==t.status);remember(Object.assign({},t,{key:item.key}),{markSeen:false});if(changed&&(!item.seen_updated_at||item.seen_updated_at!==t.updated_at))updates.push(Object.assign({},t,{key:item.key}));}catch(_){} }updateForgotBadge();if(updates.length&&!document.hidden)showUpdatePrompt(updates); }
  function startUpdateMonitor() { if(updateTimer)return;setTimeout(checkRecentUpdates,900);updateTimer=setInterval(checkRecentUpdates,5*60*1000); }
  async function request(action, payload) {
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},25000),body=Object.assign({},payload||{});
    if(action==='submit')body.client_id=recoveryClientId();
    if(action==='claim'&&!body.username){var claimInput=document.getElementById('recoveryUsername');if(claimInput)body.username=claimInput.value.trim();}
    try {var res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},body)),signal:controller.signal});var data=await res.json().catch(function(){return {error:'暂时无法读取，请稍后重试。'}});if(!res.ok)throw Error(data.error||'请求失败');return data;}
    catch(e){if(e.name==='AbortError')throw Error('请求超时，请稍后重试。');throw e;}finally{clearTimeout(timer)}
  }
  function msg(value) { var m=document.getElementById('recoveryMessage');if(m){m.textContent=value||'';m.hidden=!value;} }
  function base(title,sub,body) {
    document.body.classList.add('st-recovery-active');
    document.getElementById('app').innerHTML='<div class="auth-page recovery-page"><section class="card recovery-card"><button class="recovery-back" id="recoveryBack" type="button">‹ 返回登录</button><div class="recovery-mark" aria-hidden="true">↗</div><h2 tabindex="-1">'+esc(title)+'</h2><p class="recovery-intro">'+esc(sub)+'</p>'+body+'<div id="recoveryMessage" class="recovery-error" role="alert" hidden></div></section></div>';
    document.getElementById('recoveryBack').onclick=function(){renderLogin()};
    var h=document.querySelector('.recovery-card h2');if(h)h.focus();
  }
  function field(name,label,placeholder,type) { return '<div class="field"><label for="rc-'+name+'">'+label+'</label><input id="rc-'+name+'" name="'+name+'" type="'+(type||'text')+'" value="'+esc(draft[name]||'')+'" placeholder="'+esc(placeholder||'')+'" '+(type==='number'?'step="0.01" min="0" max="9999" inputmode="decimal"':type==='date'?'':'maxlength="'+(name==='subject'?40:100)+'"')+'></div>'; }
  function capture(){var f=document.getElementById('recoveryForm');if(f)new FormData(f).forEach(function(v,k){draft[k]=String(v)});}
  function tabs(){return '<div class="recovery-tabs" role="group" aria-label="找回方式"><button type="button" data-screen="apply" class="'+(screen==='apply'?'active':'')+'">申请找回</button><button type="button" data-screen="query" class="'+(screen==='query'?'active':'')+'">查询工单</button></div>';}
  function bindTabs(){document.querySelectorAll('[data-screen]').forEach(function(b){b.onclick=function(){capture();screen=b.dataset.screen;renderRecovery()}});}
  function renderRecovery(){current=null;if(screen==='query'){queryScreen();return;}
    base('找回你的成绩轨迹','记得多少就填多少。管理员核验后，会把原账号的成绩和设置恢复到新账号。',tabs()+'<form id="recoveryForm"><div class="recovery-modes"><button type="button" data-mode="password" aria-pressed="'+(mode==='password')+'" class="'+(mode==='password'?'active':'')+'"><b>记得用户名</b><span>忘记了密码</span></button><button type="button" data-mode="account" aria-pressed="'+(mode==='account')+'" class="'+(mode==='account'?'active':'')+'"><b>都不记得了</b><span>用录入过的信息找回</span></button></div>'+field('username',mode==='password'?'原用户名':'可能的用户名（选填）','你之前使用的用户名')+'<div class="recovery-section"><h3>你录入过的考试</h3><p>例如一次月考的名称、日期，或某科的分数。分数请注明科目，总分也可以。</p><div class="recovery-grid">'+field('exam_name','考试名称','例如：高二上学期第一次月考')+field('exam_date','考试日期（选填）','','date')+field('subject','科目（选填）','例如：数学、总分')+field('score','对应分数（选填）','例如：128.5','number')+'</div></div>'+field('school','学校（选填）','你在账号中设置的学校')+'<div class="field"><label for="rc-details">'+(mode==='account'?'再补充一些线索':'其他线索（选填）')+'</label><textarea id="rc-details" name="details" maxlength="4000" rows="4" placeholder="还记得哪些考试、选科、目标分数或使用时间？请写下能帮助核验的信息。无需提供原密码或证件。">'+esc(draft.details||'')+'</textarea></div><button class="primary full" id="recoverySubmit">提交找回申请</button><p class="recovery-foot">提交后请保存工单号和查询密钥，用它们查看回复、补充信息和领取新账号。</p></form>');
    bindTabs();document.querySelectorAll('[data-mode]').forEach(function(b){b.onclick=function(){capture();mode=b.dataset.mode;renderRecovery()}});
    document.getElementById('rc-username').required=mode==='password';document.getElementById('rc-username').autocomplete='username';document.getElementById('rc-username').autocapitalize='none';
    document.getElementById('recoveryForm').onsubmit=async function(ev){ev.preventDefault();capture();var b=document.getElementById('recoverySubmit');b.disabled=true;b.textContent='正在提交…';msg('');try{var result=await request('submit',{mode:mode,username:draft.username||'',evidence:draft});active={ticket_no:result.ticket_no,key:result.key};remember(active);draft={};receipt();}catch(e){msg(e.message)}finally{b.disabled=false;b.textContent='提交找回申请'}};
  }
  function credentials(t){return '<div class="recovery-credentials"><div><small>工单号</small><div><code>'+esc(t.ticket_no)+'</code><button class="copy-btn" type="button" data-rc-copy="no">复制</button></div></div><div><small>查询密钥</small><div><code class="recovery-key">'+esc(t.key)+'</code><button class="copy-btn" type="button" data-rc-copy="key">复制</button></div></div></div>';}
  function bindCredentials(){document.querySelectorAll('[data-rc-copy]').forEach(function(b){b.onclick=async function(){try{await navigator.clipboard.writeText(b.dataset.rcCopy==='no'?active.ticket_no:active.key);b.textContent='已复制';}catch(_){msg('复制失败，请长按文字复制或保存工单。')}}});var save=document.getElementById('recoverySave');if(save)save.onclick=function(){var blob=new Blob(['成绩轨迹 · 账号找回工单\n工单号：'+active.ticket_no+'\n查询密钥：'+active.key+'\n\n请在登录页 → 忘记密码 → 查询工单中使用。查询密钥用于领取账号，请妥善保管，不要分享。'],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=active.ticket_no+'.txt';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1000)};}
  function receipt(){base('申请已收到','请保存这张工单。管理员的回复和审核结果都会显示在这里。','<div class="recovery-success">✓ <span>等待管理员核验</span></div>'+credentials(active)+'<div class="recovery-callout">查询密钥用于领取账号，请妥善保存。换设备时，需要工单号和密钥一起查询。</div><div class="auth-actions"><button class="secondary" id="recoverySave">保存工单</button><button class="primary" id="recoveryCheck">查看进度</button></div>');bindCredentials();document.getElementById('recoveryCheck').onclick=function(){lookup(active)};}
  function queryScreen(){var items=recent();base('查询找回进度','输入工单号和查询密钥，查看管理员回复。',tabs()+'<form id="recoveryQuery"><div class="field"><label for="recoveryNo">工单号</label><input id="recoveryNo" required maxlength="30" autocomplete="off" placeholder="ST-…" value="'+esc(active&&active.ticket_no||'')+'"></div><div class="field"><label for="recoveryKey">查询密钥</label><input id="recoveryKey" type="password" required autocomplete="off" maxlength="80" value="'+esc(active&&active.key||'')+'" placeholder="提交申请后获得的查询密钥"></div><button class="primary full" id="recoveryQueryBtn">查询进度</button></form>'+(items.length?'<div class="recovery-section"><h3>本机保存的工单</h3><div class="recovery-recent">'+items.map(function(t,i){return '<button class="secondary recovery-recent-ticket" type="button" data-recent="'+i+'"><span><b>'+esc(t.ticket_no)+'</b><small>'+esc(LABELS[t.status]||'等待查询')+(t.unseen_update?' · 有新进展':'')+'</small></span><span>查看 →</span></button>'}).join('')+'</div></div>':''));bindTabs();document.getElementById('recoveryQuery').onsubmit=function(ev){ev.preventDefault();lookup({ticket_no:document.getElementById('recoveryNo').value.trim().toUpperCase(),key:document.getElementById('recoveryKey').value.trim()})};document.querySelectorAll('[data-recent]').forEach(function(b){b.onclick=function(){lookup(items[Number(b.dataset.recent)])}});}
  async function lookup(t){var b=document.getElementById('recoveryQueryBtn')||document.getElementById('recoveryCheck')||document.getElementById('recoveryRefresh');if(b)b.disabled=true;msg('');try{var result=await request('lookup',t),ticket=Object.assign({},result.ticket,{key:t.key,ticket_no:t.ticket_no});active={ticket_no:t.ticket_no,key:t.key};remember(ticket,{markSeen:true});current=result.ticket;ticketScreen();}catch(e){msg(e.message)}finally{if(b)b.disabled=false}}
  function stamp(v){return new Date(v).toLocaleString('zh-CN',{hour12:false})}
  function ticketScreen(){var t=current,closed=['approved','claimed','rejected'].includes(t.status),expired=t.claim_until&&Date.parse(t.claim_until)<Date.now(),ev=t.evidence||{};
    base(LABELS[t.status]||'工单进度',t.ticket_no,'<div class="recovery-status '+(t.status==='approved'||t.status==='claimed'?'done':'')+'"><span></span>'+esc(LABELS[t.status])+'<button type="button" class="recovery-back" id="recoveryRefresh">刷新</button></div><details class="recovery-details"><summary>查看申请信息与查询密钥</summary>'+credentials(active)+'<p>'+esc([t.username_hint,ev.exam_name,ev.exam_date,ev.subject,ev.score,ev.school].filter(Boolean).join(' · '))+'</p><p>'+esc(ev.details||'')+'</p><button class="secondary" type="button" id="recoverySave">保存工单</button></details><div class="recovery-thread">'+(t.history||[]).map(function(h){return '<article class="recovery-message '+(h.author==='admin'?'admin':'')+'"><div><b>'+({admin:'管理员',user:'你',system:'进度更新'}[h.author]||'进度更新')+'</b><time>'+esc(stamp(h.at))+'</time></div><p>'+esc(h.content)+'</p></article>'}).join('')+'</div>'+(t.status==='approved'?'<section class="recovery-callout"><b>你的新账号已准备好</b><p>用户名：<code>'+esc(t.new_username)+'</code></p><p>已恢复 '+esc(t.copy_summary&&t.copy_summary.exams||0)+' 次考试和 '+esc(t.copy_summary&&t.copy_summary.scores||0)+' 条成绩，以及科目、模块和账号设置。</p><p>请在 '+esc(stamp(t.claim_until))+' 前领取。</p></section>'+(expired?'<p class="recovery-error">领取期限已过，请重新提交申请。</p><button class="secondary full" id="recoveryAgain">重新申请</button>':'<form id="recoveryClaim"><div class="field"><label for="recoveryPassword">设置新密码</label><input id="recoveryPassword" type="password" autocomplete="new-password" minlength="6" maxlength="20" required placeholder="6～20 位，可使用字母、数字和符号"></div><div class="field"><label for="recoveryConfirm">再次输入新密码</label><input id="recoveryConfirm" type="password" autocomplete="new-password" minlength="6" maxlength="20" required></div><button class="primary full" id="recoveryClaimBtn">领取新账号</button></form>'):t.status==='claimed'?'<div class="recovery-callout">新账号：<code>'+esc(t.new_username)+'</code><p>使用这个用户名和领取时设置的密码登录。</p></div><button class="primary full" id="recoveryLogin">前往登录</button>':t.status==='rejected'?'<button class="secondary full" id="recoveryAgain">重新申请</button>':!closed?'<form id="recoverySupplement"><div class="field"><label for="recoveryMore">补充信息</label><textarea id="recoveryMore" rows="4" maxlength="4000" minlength="2" required placeholder="继续补充你录入过的信息，或回答管理员的问题。"></textarea></div><button class="primary full" id="recoveryMoreBtn">发送补充信息</button></form>':''));
    bindCredentials();document.getElementById('recoveryRefresh').onclick=function(){lookup(active)};
    var again=document.getElementById('recoveryAgain');if(again)again.onclick=function(){screen='apply';renderRecovery()};
    var login=document.getElementById('recoveryLogin');if(login)login.onclick=function(){renderLogin();document.getElementById('loginUser').value=t.new_username};
    var supplement=document.getElementById('recoverySupplement');if(supplement)supplement.onsubmit=async function(ev){ev.preventDefault();var b=document.getElementById('recoveryMoreBtn'),value=document.getElementById('recoveryMore').value;b.disabled=true;try{await request('supplement',Object.assign({},active,{content:value}));await lookup(active)}catch(e){msg(e.message)}finally{b.disabled=false}};
    var claim=document.getElementById('recoveryClaim');if(claim)claim.onsubmit=async function(ev){ev.preventDefault();var p=document.getElementById('recoveryPassword').value;if(p!==document.getElementById('recoveryConfirm').value){msg('两次输入的密码不一致。');return;}var b=document.getElementById('recoveryClaimBtn');b.disabled=true;msg('');try{var result=await request('claim',Object.assign({},active,{password:p}));state.user=result.user;state.token=result.token;try{localStorage.setItem('st_token',result.token);localStorage.setItem('st_known_user','1')}catch(_){}claimed(result.user.username,p);}catch(e){msg(e.message+' 如果已领取，可用新用户名和刚设置的密码登录。');}finally{b.disabled=false}};
  }
  function claimed(username,password){base('欢迎回来','成绩已经恢复。请保存新账号和刚设置的密码。','<div class="recovery-success">✓ <span>恢复完成</span></div><div class="recovery-credentials"><div><small>新用户名</small><code>'+esc(username)+'</code></div><div><small>新密码</small><code>'+esc(password)+'</code></div></div><p class="recovery-foot">建议现在截图保存，也可以在账号页修改用户名和密码。</p><button class="primary full" id="recoveryEnter">我已保存，进入我的成绩</button>');document.getElementById('recoveryEnter').onclick=async function(){var b=this;b.disabled=true;try{await loadExams();document.body.classList.remove('st-recovery-active');state.page='home';render();}catch(e){msg('账号已恢复，成绩暂时无法加载。请重试。');b.disabled=false}};}
  function validRecoveryUsername(value){return /^[\p{L}\p{N}_-]{2,24}$/u.test(String(value||'').trim());}
  function enhanceClaimForm(){var form=document.getElementById('recoveryClaim'),password=document.getElementById('recoveryPassword');if(!form||!password||document.getElementById('recoveryUsername'))return;var wrap=document.createElement('div');wrap.className='field';wrap.innerHTML='<label for="recoveryUsername">新用户名</label><input id="recoveryUsername" type="text" autocomplete="username" maxlength="24" required value="'+esc(current&&current.new_username||'')+'" placeholder="2～24 位中文、字母、数字、横线或下划线"><p class="recovery-foot recovery-username-note">可以保留系统生成的用户名，也可以改成自己更容易记住的名字。</p>';password.closest('.field').insertAdjacentElement('beforebegin',wrap);form.addEventListener('submit',function(e){var value=document.getElementById('recoveryUsername').value.trim();if(!validRecoveryUsername(value)){e.preventDefault();e.stopImmediatePropagation();msg('用户名请使用 2～24 位中文、字母、数字、横线或下划线。');}},true);}
  function enhanceTicketStatus(){var status=document.querySelector('.recovery-status');if(!status||!current||document.querySelector('.recovery-status-hint'))return;var hint=document.createElement('p');hint.className='recovery-foot recovery-status-hint';hint.textContent=STATUS_HINTS[current.status]||'';status.insertAdjacentElement('afterend',hint);}
  function attachForgot(){var actions=document.querySelector('.auth-actions');if(actions&&document.getElementById('loginPass')&&!document.getElementById('forgotPassword')){var b=document.createElement('button');b.type='button';b.id='forgotPassword';b.className='recovery-link';b.textContent='忘记密码？';b.onclick=function(){screen=unseenTickets().length?'query':'apply';renderRecovery()};actions.insertAdjacentElement('beforebegin',b);}updateForgotBadge();}
  var before=renderLogin;
  renderLogin=function(){document.body.classList.remove('st-recovery-active');var result=before.apply(this,arguments);attachForgot();return result;};
  var ticketScreenBeforeClaimEnhance=ticketScreen;
  ticketScreen=function(){var result=ticketScreenBeforeClaimEnhance.apply(this,arguments);enhanceClaimForm();enhanceTicketStatus();return result;};
  attachForgot();startUpdateMonitor();window.addEventListener('storage',updateForgotBadge);document.addEventListener('visibilitychange',function(){if(!document.hidden)checkRecentUpdates()});window.__accountRecovery={open:function(){screen='apply';renderRecovery()},checkUpdates:checkRecentUpdates};
})();

/* ===== trajectory-forecast.js ===== */
/* A descriptive estimate from anonymous references, not a calibrated probability. */
(function () {
  'use strict';
  var defaults={similarity:1,history:0.5,width:1};
  function settings(input) {
    input=input||{};var out={};
    [['similarity',0,3],['history',0,2],['width',0.5,2]].forEach(function(spec){
      var v=input[spec[0]];out[spec[0]]=typeof v==='number'&&Number.isFinite(v)&&v>=spec[1]&&v<=spec[2]?v:defaults[spec[0]];
    });return out;
  }
  function clamp(v) {return Math.max(0,Math.min(100,v));}
  function median(values) {
    var sorted=values.slice().sort(function(a,b){return a-b;}),middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }
  function align(own,peer,mode) {
    var offset=mode==='shape'?own[own.length-1]-peer.history[peer.history.length-1]:0;
    return {offset:offset,history:peer.history.map(function(v){return clamp(v+offset);}),future:peer.future.map(function(v){return clamp(v+offset);})};
  }
  function estimate(own,peers,mode,input) {
    if(!own.length||!Number.isFinite(own[own.length-1]))return null;
    var cfg=settings(input),samples=[];
    peers.forEach(function(peer){
      if(!peer.history.length||!Number.isFinite(peer.history[peer.history.length-1])||!Number.isFinite(peer.future[0]))return;
      var aligned=align(own,peer,mode),score=typeof peer.match_score==='number'&&Number.isFinite(peer.match_score)&&peer.match_score>=0&&peer.match_score<=100?Math.max(0.01,peer.match_score/100):1;
      samples.push({value:aligned.future[0],weight:Math.pow(score,cfg.similarity)*Math.pow(peer.history.length,cfg.history)});
    });
    if(!samples.length)return null;
    var total=samples.reduce(function(sum,s){return sum+s.weight;},0),mean=0,variance=0;
    samples.forEach(function(s){s.weight/=total;mean+=s.value*s.weight;});
    samples.forEach(function(s){variance+=s.weight*Math.pow(s.value-mean,2);});
    var changes=[];for(var j=Math.max(1,own.length-5);j<own.length;j++)if(Number.isFinite(own[j])&&Number.isFinite(own[j-1]))changes.push(Math.abs(own[j]-own[j-1]));
    changes.sort(function(a,b){return a-b;});
    var volatility=changes.length?changes[Math.floor(changes.length/2)]:0;
    // Shared Gaussian bandwidth includes recent own volatility, so agreement does not imply certainty.
    // A robust own-history baseline protects against a single unusual exam.
    // The fixed 25% reference contribution was selected on earlier rolling-origin
    // cases, excluding showcase/admin1, before evaluating later held-out cases.
    var recent=own.slice(-3).filter(Number.isFinite),baseline=median(recent);
    var center=clamp(0.75*baseline+0.25*mean),bandwidth=Math.max(0.5,0.35*Math.sqrt(variance),0.35*volatility),density=[],area=[0];
    // Integrate only the valid 0–100 domain, at 0.1 percentage-point resolution.
    for(var i=0;i<=1000;i++){
      var x=i/10,p=0;samples.forEach(function(s){p+=s.weight*Math.exp(-0.5*Math.pow((x-s.value)/bandwidth,2));});density.push(p);
      if(i)area.push(area[i-1]+(density[i-1]+p)*0.05);
    }
    function quantile(q){
      var target=area[1000]*q;for(var k=1;k<=1000;k++)if(area[k]>=target){var span=area[k]-area[k-1];return (k-1+(span?(target-area[k-1])/span:0))/10;}return 100;
    }
    // Preserve both reference disagreement and own-history variability. This is
    // a descriptive reference range, not a calibrated confidence interval.
    var ownSpread=Math.max(0.5,volatility);
    var low=Math.min(center,quantile(0.1),clamp(baseline-ownSpread)),high=Math.max(center,quantile(0.9),clamp(baseline+ownSpread));
    var latest=own[own.length-1];
    // Ignore differences below the displayed precision when describing disagreement.
    var disagreement=samples.some(function(s){return s.value<latest-0.05;})&&samples.some(function(s){return s.value>latest+0.05;});
    return {center:center,ownCenter:baseline,referenceCenter:mean,low:clamp(center-(center-low)*cfg.width),high:clamp(center+(high-center)*cfg.width),count:samples.length,disagreement:disagreement,bandwidth:bandwidth,samples:samples};
  }
  window.__stTrajectoryForecast={settings:settings,align:align,estimate:estimate};
})();

/* ===== similar-trajectories.js ===== */
/* Anonymous peer trajectories, on by default with a clear opt-out. Results are never persisted in browser storage. */
(function () {
  'use strict';
  var host, filters, generation = 0, owner = '', enabled = null, defaulted = false, noticeVisible = false, result = null, selected = [], expandedReferences = false, busy = false, message = '', metricChoice = '', matchChoice = 'shape', policyChoice = 'balanced', minChoice = 3, categoryChoice = '__all__', sameCategoryChoice = false, matchedCount = 0, confirmAction = null, exposureSent = false, exposureObserver = null;
  var colors = ['var(--green,#32a77a)','var(--warn,#b97f24)','#b17ac9'], forecast=window.__stTrajectoryForecast, forecastChoice=forecast.settings();
  function esc(v) { return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function identity() { return typeof state!=='undefined' && state.user && state.token ? state.user.id+'|'+state.token : ''; }
  function track(event,meta) { try { if(window.__stTrack)window.__stTrack(event,meta||{}); } catch(_) {} }
  function requestMeta(error,startedAt) {
    var timedOut=error&&error.name==='AbortError';
    return {duration_ms:Math.max(0,Date.now()-startedAt),status:Number(error&&error.status)||0,error_type:(timedOut?'timeout':String(error&&error.name||'unknown')).slice(0,40),error_code:String(error&&error.code||'').slice(0,40),error_message:String(error&&error.message||'').slice(0,120)};
  }
  function watchExposure() {
    exposureSent=false;
    if(exposureObserver){exposureObserver.disconnect();exposureObserver=null;}
    if(!host)return;
    var emit=function(){if(exposureSent)return;exposureSent=true;track('trajectory_view',{logged_in:!!owner});if(exposureObserver){exposureObserver.disconnect();exposureObserver=null;}};
    if(typeof IntersectionObserver==='function'){
      exposureObserver=new IntersectionObserver(function(entries){for(var i=0;i<entries.length;i++)if(entries[i].isIntersecting&&entries[i].intersectionRatio>=0.25){emit();break;}},{threshold:[0.25]});
      exposureObserver.observe(host);
    } else emit();
  }
  function preferenceKey() { return state.user&&state.user.id?'st.trajectory.preferences.v1:'+state.user.id:''; }
  function noticeKey() { return state.user&&state.user.id?'st.trajectory.notice.v2:'+state.user.id:''; }
  function noticeSeen() { try { var key=noticeKey();return !!key&&localStorage.getItem(key)==='seen'; } catch(_) { return false; } }
  function rememberNotice() { try { var key=noticeKey();if(key)localStorage.setItem(key,'seen'); } catch(_) {} }
  function remember() { try { var key=preferenceKey();if(key)localStorage.setItem(key,JSON.stringify({mode:matchChoice,policy:policyChoice,min:minChoice,category:categoryChoice,sameCategory:sameCategoryChoice,forecast:forecastChoice})); } catch(_) {} }
  function trajectoryCategoryChoices() {
    var values=[];
    try { if(typeof categoryOptionsV14==='function')values=values.concat(categoryOptionsV14()||[]); } catch(_) {}
    try { if(state.classification&&Array.isArray(state.classification.options))values=values.concat(state.classification.options); } catch(_) {}
    try { (state.allExams||[]).forEach(function(exam){if(exam&&exam.grade_level)values.push(exam.grade_level);}); } catch(_) {}
    values=values.map(function(value){return String(value||'').trim();}).filter(Boolean);
    values=Array.from(new Set(values));
    var choices=[{value:'__all__',label:'全部分类'}];
    values.forEach(function(value){choices.push({value:value,label:value});});
    var hasUncategorized=false;try { hasUncategorized=(state.allExams||[]).some(function(exam){return !exam||!String(exam.grade_level||'').trim();}); } catch(_) {}
    if(hasUncategorized||!values.length)choices.push({value:'__none__',label:'未分类'});
    return choices;
  }
  function trajectoryCategoryLabel(value) {
    var choices=trajectoryCategoryChoices(),found=choices.find(function(choice){return choice.value===value;});
    return found?found.label:(value==='__none__'?'未分类':'全部分类');
  }
  function validTrajectoryCategory(value) { return trajectoryCategoryChoices().some(function(choice){return choice.value===value;}); }
  function countCopy() {
    var count=Math.max(0,Number(matchedCount)||0);
    if(count)return '已有 '+count+' 位用户匹配过你的匿名轨迹'+(enabled===false?' · 关闭后不会继续新增':'');
    return enabled===false?'关闭后不会继续新增匹配':'暂时还没有用户匹配过你的匿名轨迹';
  }
  function reset() {
    expandedReferences=false;generation++; if(host&&host.isConnected)host.innerHTML=''; owner=identity(); enabled=null; defaulted=false; noticeVisible=false; result=null; busy=false; message=''; metricChoice=''; matchChoice='shape';policyChoice='balanced';minChoice=3;categoryChoice='__all__';sameCategoryChoice=false;matchedCount=0;confirmAction=null;
    forecastChoice=forecast.settings();
    try { var key=preferenceKey(),p=key?JSON.parse(localStorage.getItem(key)||'null'):null;if(p){if(['shape','overlap'].indexOf(p.mode)>=0)matchChoice=p.mode;if(['balanced','long','recent'].indexOf(p.policy)>=0)policyChoice=p.policy;if(Number.isInteger(p.min)&&p.min>=3&&p.min<=1000)minChoice=p.min;if(typeof p.category==='string'&&p.category.length<=40&&validTrajectoryCategory(p.category))categoryChoice=p.category;if(typeof p.sameCategory==='boolean')sameCategoryChoice=p.sameCategory;forecastChoice=forecast.settings(p.forecast);} } catch(_) {}
  }
  function policyNote() { return policyChoice==='long'?'在足够相近的轨迹里，先看参考场次更多的人。':policyChoice==='recent'?'侧重最近 '+(minChoice>=5?minChoice:minChoice+'～5')+' 次考试的变化。':'兼顾相似程度和参考场次，相近时优先长轨迹。'; }
  function fmt(v) { return (filters.metric==='score'?'':'前')+(Math.round(v*10)/10)+'%'; }
  function hasScore(m) { return typeof m.match_score==='number'&&Number.isFinite(m.match_score)&&m.match_score>=0&&m.match_score<=100; }
  function scoreBadge(m) { return hasScore(m)?'<span class="st-peer-fit">走势贴合度 '+Math.round(m.match_score)+'%</span>':''; }
  async function api(action,payload) {
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},20000);
    try {
      var response=await fetch('/api/score-tracker-trajectories',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify(Object.assign({action:action,token:state.token},payload||{}))});
      var data=await response.json().catch(function(){return {};});
      if(!response.ok){var error=new Error(data.error||'暂时没能加载，请再试一次');error.status=response.status;error.code=typeof data.code==='string'?data.code:'';throw error;}
      return data;
    } finally {clearTimeout(timer);}
  }
  function current(seq,key) {return seq===generation&&key===identity()&&host&&host.isConnected;}
  async function load() {
    var startedAt=Date.now(),seq=++generation,key=owner;busy=true;message='';result=null;paint();
    try {
      var data=await api('match',filters);
      if(!current(seq,key))return;
      enabled=data.enabled;result=data;selected=(data.matches||[]).map(function(){return true;});expandedReferences=false;if(Number.isFinite(Number(data.matched_count)))matchedCount=Math.max(0,Number(data.matched_count));
      track('trajectory_match_result',{category:filters.category,metric:filters.metric,match_mode:filters.match_mode,reference_policy:filters.reference_policy,min_history:filters.min_history,count:(data.matches||[]).length,matched_count:matchedCount,reason:data.reason,duration_ms:Date.now()-startedAt,status:200});
    } catch(e) {if(current(seq,key)){message=e.name==='AbortError'?'这次加载有点久，请再试一次':e.message;track('trajectory_match_error',requestMeta(e,startedAt));}}
    finally {if(current(seq,key)){busy=false;paint();}}
  }
  async function status() {
    var startedAt=Date.now(),seq=++generation,key=owner;busy=true;paint();
    try {var data=await api('status');if(!current(seq,key))return;enabled=data.enabled;defaulted=data.defaulted===true;if(Number.isFinite(Number(data.matched_count)))matchedCount=Math.max(0,Number(data.matched_count));noticeVisible=enabled===true&&!noticeSeen();if(noticeVisible)track('trajectory_sharing_notice_view',{defaulted:defaulted,duration_ms:Date.now()-startedAt,status:200});track('trajectory_status_result',{enabled:!!enabled,defaulted:defaulted,matched_count:matchedCount,duration_ms:Date.now()-startedAt,status:200});busy=false;paint();if(enabled){load();return;}}
    catch(e){if(current(seq,key)){busy=false;message='暂时没能加载，请再试一次';track('trajectory_status_error',requestMeta(e,startedAt));paint();}}
  }
  async function sharing(value) {
    var startedAt=Date.now(),seq=++generation,key=owner;busy=true;message='';result=null;paint();
    try {
      var data=await api('sharing',{enabled:value});if(!current(seq,key))return;
      enabled=data.enabled;defaulted=false;noticeVisible=false;if(Number.isFinite(Number(data.matched_count)))matchedCount=Math.max(0,Number(data.matched_count));track('trajectory_sharing_change',{enabled:enabled,source:'user',matched_count:matchedCount,duration_ms:Date.now()-startedAt,status:200});busy=false;
      if(enabled){load();return;}paint();
    } catch(e){if(current(seq,key)){busy=false;message='设置还没有保存，请再试一次';track('trajectory_sharing_error',requestMeta(e,startedAt));paint();}}
  }
  function peerColor(i) {return colors[i]||'hsl('+((i*137.508)%360)+',48%,48%)';}
  function visibleMatches() {return expandedReferences?result.matches:result.matches.slice(0,3);}
  function prediction() {return result&&!result.preliminary&&result.history.length>=3?forecast.estimate(result.history,result.matches.filter(function(m,i){return selected[i];}),filters.match_mode,forecastChoice):null;}
  function qualificationMarkup(data) {
    var count=Math.max(0,Number(data.history_count)||0),stage=count>=3?'正式预测条件已满足':count>=2?'已达到初步参考条件':'暂未达到初步参考条件';
    var out='<div class="st-peer-qualification"><strong>'+stage+'</strong><span> · 当前已纳入 '+count+' 次有效记录（初步参考需 2 次，正式预测需 3 次）</span>';
    if(count>=2&&count<=3)out+='<p>当前只有 '+count+' 次可比较的历史，不同匹配偏好可能找到相同的参考轨迹。</p>';
    if(Number(data.skipped_count)>0)out+='<p>另有 '+Number(data.skipped_count)+' 场考试未纳入这条轨迹，可能是未考所选科目、缺少当前指标或总分科目组合不同；图表保留有效考试的真实日期。</p>';
    if(Number(data.combination_excluded_count)>0)out+='<p>其中 '+Number(data.combination_excluded_count)+' 场总分科目组合不同，未与当前总分轨迹合并。</p>';
    return out+'</div>';
  }
  function chart(estimate) {
    var own=result.history,matches=visibleMatches().map(function(m){return forecast.align(own,m,filters.match_mode);}),n=own.length,horizon=Math.max.apply(null,matches.map(function(m){return m.future.length;})),count=n+horizon;
    var W=Math.max(560,count*76),H=250,L=55,R=26,T=24,B=40;
    var values=own.slice();matches.forEach(function(m,i){if(selected[i])values=values.concat(m.history,m.future);});if(estimate)values=values.concat([estimate.low,estimate.high,estimate.center]);
    var low=Math.max(0,Math.floor((Math.min.apply(null,values)-5)/5)*5),high=Math.min(100,Math.ceil((Math.max.apply(null,values)+5)/5)*5);if(high===low)high=low+1;
    function X(i){return L+i*(W-L-R)/(count-1);}
    function Y(v){return T+(filters.metric==='score'?(high-v):(v-low))*(H-T-B)/(high-low);}
    function line(vals,offset,color,dash,label,span){
      var step=span==null?1:span/(vals.length-1);
      var points=vals.map(function(v,i){return X(offset+i*step)+','+Y(v);}).join(' ');
      return '<polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="'+(label==='我'?3:2)+'"'+(dash?' stroke-dasharray="5 5"':'')+'/>'+vals.map(function(v,i){return '<circle cx="'+X(offset+i*step)+'" cy="'+Y(v)+'" r="3.5" fill="'+color+'"><title>'+esc(label)+' · '+(dash?(i===0?'参考段末次':'后续第 '+i+' 次'):'参考段第 '+(i+1)+' 次')+' · '+fmt(v)+'</title></circle>';}).join('');
    }
    var svg='<rect x="'+X(n-1)+'" y="'+T+'" width="'+(W-R-X(n-1))+'" height="'+(H-T-B)+'" fill="var(--accent,#5d72e8)" opacity=".025"/>',overlay='';
    for(var j=0;j<=4;j++){var v=low+(high-low)*j/4,y=Y(v);svg+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line,#e8ebf0)"/><text x="'+(L-8)+'" y="'+(y+4)+'" text-anchor="end">'+fmt(v)+'</text>';}
    for(var k=0;k<count;k++){
      if(k<n){var date=result.history_dates&&result.history_dates[k]||'';var shortDate=date.length>=10?date.slice(5).replace('-','/'):(k===n-1?'最近一次':'前 '+(n-1-k)+' 次');svg+='<text x="'+X(k)+'" y="'+(H-14)+'" text-anchor="middle">'+esc(shortDate)+(date?'<title>本人考试日期 '+esc(date)+'</title>':'')+'</text>';}
      else svg+='<text x="'+X(k)+'" y="'+(H-14)+'" text-anchor="middle">'+(estimate&&k===n?'下次有效考试':'参考后续 '+(k-n+1))+'</text>';
    }
    matches.forEach(function(m,i){if(!selected[i])return;svg+=line(m.history,n-m.history.length,peerColor(i),false,'轨迹 '+(i+1))+line([m.history[m.history.length-1]].concat(m.future),n-1,peerColor(i),true,'轨迹 '+(i+1));});
    if(estimate){
      var x=X(n),cy=Y(estimate.center),ly=Y(estimate.low),hy=Y(estimate.high),anchorY=Y(own[n-1]),labelTop=Math.max(2,Math.min(ly,hy)-30);
      svg+='<g class="st-peer-forecast-mark"><path d="M '+X(n-1)+' '+anchorY+' L '+x+' '+ly+' L '+x+' '+hy+' Z" fill="var(--accent,#5d72e8)" opacity=".075"/><line x1="'+X(n-1)+'" y1="'+anchorY+'" x2="'+x+'" y2="'+cy+'" stroke="var(--accent,#5d72e8)" stroke-width="2" stroke-dasharray="2 4"/><path d="M '+(x-5)+' '+ly+' H '+(x+5)+' M '+x+' '+ly+' V '+hy+' M '+(x-5)+' '+hy+' H '+(x+5)+'" fill="none" stroke="var(--accent,#5d72e8)" stroke-width="2"/><g data-peer-forecast-toggle style="cursor:pointer"><rect x="'+(x-22)+'" y="'+(cy-22)+'" width="44" height="44" fill="transparent"/><path class="st-peer-forecast-center" d="M '+x+' '+(cy-6)+' L '+(x+6)+' '+cy+' L '+x+' '+(cy+6)+' L '+(x-6)+' '+cy+' Z" fill="var(--panel-solid,#fff)" stroke="var(--accent,#5d72e8)" stroke-width="2.5"><title>下次预测中心 · '+fmt(estimate.center)+'</title></path></g></g>';
      overlay='<button type="button" class="st-peer-forecast-label" data-peer-forecast-toggle aria-expanded="false" aria-controls="st-peer-forecast-tip" style="left:'+(x-38)+'px;top:'+labelTop+'px">下次预测</button><div id="st-peer-forecast-tip" class="st-peer-forecast-tip" hidden style="left:'+Math.max(L,Math.min(W-230,x-110))+'px;top:'+Math.min(H-174,labelTop+34)+'px"><button type="button" data-peer-forecast-close aria-label="收起预测详情">×</button><div><span>预测中心</span><strong>'+fmt(estimate.center)+'</strong></div><div><span>参考范围</span><b>'+fmt(estimate.low)+' ～ '+fmt(estimate.high)+'</b></div><small>'+estimate.count+' 条轨迹参考 · 仅供参考</small></div>';
    }
    svg+=line(own,0,'var(--accent,#5d72e8)',false,'我');
    return '<div class="st-peer-chart" tabindex="0" role="region" aria-label="相似轨迹对比，可左右滑动"><div class="st-peer-chart-canvas" style="width:'+W+'px"><svg role="img" aria-label="实线为匹配段，虚线为参考后续；蓝色空心菱形和色带为下次预测中心及范围" viewBox="0 0 '+W+' '+H+'">'+svg+'</svg>'+overlay+'</div></div><p class="st-peer-chart-caption">'+(filters.match_mode==='shape'?'走势已对齐 · ':'')+'横轴日期是你的实际考试日期；参考轨迹按考试次序对齐，虚线是参考对象的后续成绩。</p>';
  }
  function toggleForecast(show) {
    var tip=host.querySelector('.st-peer-forecast-tip');if(!tip)return;
    var open=!tip.hidden,next=show==null?!open:!!show;if(open===next)return;
    tip.hidden=!next;
    var label=host.querySelector('.st-peer-forecast-label');if(label)label.setAttribute('aria-expanded',String(!tip.hidden));
    track('trajectory_forecast_detail',{action:next?'open':'close'});
  }
  function paint() {
    if(!host||!host.isConnected)return;
    var body='';
    if(enabled===false){
      body='<div class="st-peer-off"><span>匿名匹配已关闭</span><button type="button" class="st-peer-link" data-peer-enable '+(busy?'disabled':'')+'>重新开启</button></div>';
    }else if(enabled===true){
      body='<div class="st-peer-controls"><div role="group" aria-label="相似轨迹比较方式">'+[['year','年级排名'],['class','班级排名'],['score','得分率']].map(function(o){return '<button type="button" class="chip'+(filters.metric===o[0]?' active':'')+'" data-peer-metric="'+o[0]+'" aria-pressed="'+(filters.metric===o[0])+'" '+(busy?'disabled':'')+'>'+o[1]+'</button>';}).join('')+'</div><button type="button" class="st-peer-link" data-peer-disable '+(busy?'disabled':'')+'>关闭共享</button></div>';
      body+='<div class="st-peer-modes" role="group" aria-label="轨迹匹配方式">'+[['shape','走势相似'],['overlap','轨迹重合']].map(function(o){return '<button type="button" class="chip'+(filters.match_mode===o[0]?' active':'')+'" data-peer-mode="'+o[0]+'" aria-pressed="'+(filters.match_mode===o[0])+'" '+(busy?'disabled':'')+'>'+o[1]+'</button>';}).join('')+'</div>';
      var settingsOpen=host.querySelector('.st-peer-settings');
      var advancedOpen=host.querySelector('.st-peer-advanced');
      var choices=trajectoryCategoryChoices(),categoryOptions=choices.map(function(choice){return '<option value="'+esc(choice.value)+'"'+(categoryChoice===choice.value?' selected':'')+'>'+esc(choice.label)+'</option>';}).join('');
      body+='<details class="st-peer-settings"'+(settingsOpen&&settingsOpen.open?' open':'')+'><summary>匹配设置 · 我的历史：'+(categoryChoice==='__all__'?'全部分类':trajectoryCategoryLabel(categoryChoice))+' · 参考：'+(sameCategoryChoice?'仅同分类':'不限分类')+' · '+(policyChoice==='long'?'长轨迹优先':policyChoice==='recent'?'近期变化优先':'综合匹配')+' · 参考历史至少 '+minChoice+' 次</summary><form data-peer-settings><div class="st-peer-fields"><label>我的历史分类<select name="category" '+(busy?'disabled':'')+'>'+categoryOptions+'</select></label><label>参考轨迹分类<select name="same_category" '+(busy?'disabled':'')+'><option value="false"'+(!sameCategoryChoice?' selected':'')+'>不限分类</option><option value="true"'+(sameCategoryChoice?' selected':'')+'>仅匹配同分类</option></select></label><label>匹配偏好<select name="reference_policy" '+(busy?'disabled':'')+'>'+[['balanced','综合匹配'],['long','长轨迹优先'],['recent','近期变化优先']].map(function(o){return '<option value="'+o[0]+'"'+(policyChoice===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label><label>参考轨迹至少有几次历史<input name="min_history" type="number" min="3" max="1000" step="1" inputmode="numeric" required value="'+minChoice+'" '+(busy?'disabled':'')+'></label></div><p class="st-peer-note">全部分类会连接你自己的有效历史；“仅匹配同分类”只筛选其他人的参考轨迹。分类名称由用户自定义，不一定等同实际年级。'+policyNote()+'</p><details class="st-peer-advanced"'+(advancedOpen&&advancedOpen.open?' open':'')+'><summary>高级设置</summary><div class="st-peer-fields">'+[['similarity','匹配度权重',0,3],['history','场次权重',0,2],['width','范围宽度',0.5,2]].map(function(o){return '<label>'+o[1]+'<input name="forecast_'+o[0]+'" type="number" min="'+o[2]+'" max="'+o[3]+'" step="0.1" inputmode="decimal" required value="'+forecastChoice[o[0]]+'" '+(busy?'disabled':'')+'></label>';}).join('')+'</div><p class="st-peer-note">权重越大，越偏向匹配度高或场次多的轨迹；设为 0 则不考虑。范围宽度 1 为默认，越大越宽。</p></details><div class="st-peer-setting-actions"><button type="submit" class="chip active" '+(busy?'disabled':'')+'>应用设置</button><button type="button" class="st-peer-link" data-peer-default '+(busy?'disabled':'')+'>恢复默认</button></div></form></details>';
      if(!busy&&result){
        body+=qualificationMarkup(result);
        var matches=visibleMatches()||[];
        if(matches.length){
          var estimate=prediction();
          body+='<div class="st-peer-summary" aria-live="polite">'+(estimate?'<div class="st-peer-center"><span>下一次有有效'+(filters.metric==='score'?'得分率':'排名')+'的考试预测中心</span><strong>'+fmt(estimate.center)+'</strong></div><div class="st-peer-range"><span>参考范围</span><b>'+fmt(estimate.low)+' ～ '+fmt(estimate.high)+'</b></div><small>'+estimate.count+' 条轨迹参与计算'+(estimate.disagreement?' · 走势有分歧':'')+(estimate.count<10?' · 参考样本较少':'')+'</small>':result.preliminary?'<div><strong>初步相似参考</strong><small>目前只有两次有效记录；暂不生成预测中心。有效记录达到三次后才会启动正式预测。</small></div>':'<div><strong>选择参考轨迹</strong><small>选择至少一条参考，查看正式预测中心。</small></div>')+'</div>';
          body+='<div class="st-peer-options"><span class="st-peer-mine">● 我的轨迹</span>'+matches.map(function(m,i){return '<button type="button" class="st-peer-option" style="--peer-color:'+peerColor(i)+'" data-peer-index="'+i+'" aria-pressed="'+selected[i]+'"><span class="st-peer-option-title"><span>● 相似轨迹 '+(i+1)+'</span>'+scoreBadge(m)+'</span><small>'+(Number(m.history_length)||m.history.length)+' 次历史</small></button>';}).join('')+'</div>'+(result.matches.length>3?'<p class="st-peer-note">'+(estimate?'预测使用全部已选参考；':'初步参考不计算预测中心；')+'默认展示前三条。<button type="button" class="st-peer-link" data-peer-expand aria-expanded="'+expandedReferences+'">'+(expandedReferences?'收起其余参考':'展开全部 '+result.matches.length+' 条参考')+'</button></p>':'')+chart(estimate);
          var helpOpen=host.querySelector('.st-peer-help');
          body+='<details class="st-peer-help"'+(helpOpen&&helpOpen.open?' open':'')+'><summary>预测与匹配说明</summary><p>'+ (filters.match_mode==='shape'?'相似走势先平移到你最近一次的水平，再参考他们后续的变化；图中也已对齐。':'重合模式保留对方的成绩水平，直接参考他们的后续成绩。')+'超出 0～100% 的部分按边界显示。</p><p>正式预测中心以你最近三次有效成绩的中位水平为主（75%），结合参考轨迹后续的加权平均（25%）。参考轨迹默认按走势贴合度 × 参考场次的平方根加权，最多使用 20 位不同用户；图表默认只展示三条。正式目标是下一次有有效'+(filters.metric==='score'?'得分率':'排名')+'的考试。</p><p class="st-peer-fit-note">两次历史只提供初步相似参考，不显示预测中心；走势贴合度不是预测准确率。缺少该指标的考试会跳过，不会截断有效历史。</p><p>“全部分类”会连接你自己的有效历史；“仅匹配同分类”只筛选参考轨迹。排名群体和考试难度仍可能不同，预测仅供参考。</p></details>';
          body+='<details class="st-peer-details"><summary>查看每次成绩</summary><div class="st-peer-table"><table><thead><tr><th>考试</th><th>我</th>'+matches.map(function(m,i){return '<th>轨迹 '+(i+1)+'</th>';}).join('')+'</tr></thead><tbody>';
          var n=result.history.length,max=Math.max.apply(null,matches.map(function(m){return m.future.length;}));
          for(var j=0;j<n;j++){var ownDate=result.history_dates&&result.history_dates[j]||'考试 '+(j+1);body+='<tr><th><time datetime="'+esc(ownDate)+'">'+esc(ownDate)+'</time></th><td>'+fmt(result.history[j])+'</td>'+matches.map(function(m){var idx=j-(n-m.history.length);return '<td>'+(idx>=0?fmt(m.history[idx]):'—')+'</td>';}).join('')+'</tr>';}
          for(var k=0;k<max;k++)body+='<tr><th>后续 '+(k+1)+'</th><td>—</td>'+matches.map(function(m){return '<td>'+(k<m.future.length?fmt(m.future[k]):'—')+'</td>';}).join('')+'</tr>';
          body+='</tbody></table></div><p class="st-peer-note">这里保留本人每次有效考试的真实日期；参考轨迹按距最近一次的场次对齐。</p></details>';
        }else if(result.reason==='need_history')body+='<div class="st-peer-empty">当前有效记录还不够<p>目前有 '+Math.max(0,Number(result.history_count)||0)+' 次；达到 2 次可看初步参考，达到 3 次可使用正式预测。请补全所选科目的有效'+(filters.metric==='score'?'分数与满分':filters.metric==='class'?'班排':'年排')+'，或再录入一次考试。</p><button type="button" class="st-peer-link" data-peer-retry>重新匹配</button></div>';
        else if(result.preliminary)body+='<div class="st-peer-empty">已满足初步参考条件<p>目前只有两次有效记录，暂时没有足够合适的参考轨迹。补充一次有效成绩后可进入正式预测匹配。</p><button type="button" class="st-peer-link" data-peer-retry>重新匹配</button></div>';
        else body+='<div class="st-peer-empty">历史条件已满足，暂时没有合适参考<p>你的有效历史足以进行正式匹配，但当前设置下没有找到合适轨迹。可以试试允许跨分类参考，或稍后再看。</p><button type="button" class="st-peer-link" data-peer-retry>重新匹配</button></div>';
      }
    }
    if(busy)body+='<p class="st-peer-loading" role="status">'+(enabled===true?'正在寻找与你相近的轨迹…':'正在加载…')+'</p>';
    if(message)body+='<p class="st-peer-error" role="alert">'+esc(message)+' <button type="button" class="st-peer-link" data-peer-retry>重试</button></p>';
    var notice=noticeVisible&&enabled===true?'<div class="st-peer-notice" role="status"><span>已参与匿名匹配：其他用户只能看到匿名成绩趋势，看不到用户名、学校或考试名称。你可以随时关闭。</span><button type="button" class="st-peer-link" data-peer-notice-dismiss>知道了</button></div>':'';
    var confirm='';
    if(confirmAction!==null){
      var opening=confirmAction===true;
      confirm='<div class="st-peer-confirm" role="presentation"><div class="st-peer-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="stPeerConfirmTitle"><h4 id="stPeerConfirmTitle">'+(opening?'开启匿名匹配？':'关闭匿名匹配？')+'</h4><p>'+(opening?'开启后，其他用户可以匹配到你的匿名成绩趋势，你也可以使用相似轨迹。不会展示用户名、学校或考试名称。':'关闭后，其他用户将无法再匹配到你的匿名成绩趋势，你也无法使用相似轨迹。')+'</p><div class="st-peer-confirm-actions"><button type="button" class="chip" data-peer-confirm-cancel>先不'+(opening?'开启':'关闭')+'</button><button type="button" class="chip active" data-peer-confirm-ok>确认'+(opening?'开启':'关闭')+'</button></div></div></div>';
    }
    host.innerHTML='<div class="st-peer-heading"><div><h4>相似轨迹</h4><p>'+esc(filters.label)+'</p><small class="st-peer-count">'+esc(countCopy())+'</small></div><span class="sv31-tag">默认展示 3 条</span></div>'+notice+body+confirm;
    var form=host.querySelector('[data-peer-settings]');if(form)form.noValidate=true;
    var chartHost=host.querySelector('.st-peer-chart');if(chartHost)chartHost.scrollLeft=Math.max(0,chartHost.scrollWidth-chartHost.clientWidth);
  }
  function bind(root,f) {
    host=root.querySelector('[data-peer-host]');if(!host)return;
    if(owner!==identity())reset();
    if(!owner){watchExposure();host.innerHTML='<p class="card-sub">登录后，看看与你相似的轨迹。</p>';return;}
    generation++;result=null;busy=false;message='';
    var cfg=state.sv31||{},subjects=cfg.subjMod&&cfg.subjMod.length?cfg.subjMod.slice():null;
    if(!validTrajectoryCategory(categoryChoice))categoryChoice='__all__';
    filters={reference_limit:20,match_mode:matchChoice,reference_policy:policyChoice,min_history:minChoice,subjects:subjects,metric:metricChoice||(cfg.mode==='score'?'score':'year'),category:categoryChoice,same_category:sameCategoryChoice,label:subjects?subjects.join('、'):'总分'};
    watchExposure();
    host.onclick=function(event){
      var summary=event.target.closest('summary');
      if(summary&&host.contains(summary)){var details=summary.parentElement,section=details.classList.contains('st-peer-settings')?'settings':details.classList.contains('st-peer-advanced')?'advanced':details.classList.contains('st-peer-help')?'help':details.classList.contains('st-peer-details')?'details':'other';setTimeout(function(){track('trajectory_details_toggle',{section:section,open:!!details.open});},0);}
      if(event.target.closest('[data-peer-forecast-toggle]')){toggleForecast();return;}
      if(event.target.closest('[data-peer-forecast-close]')){toggleForecast(false);host.querySelector('.st-peer-forecast-label').focus({preventScroll:true});return;}
      if(!event.target.closest('.st-peer-forecast-tip'))toggleForecast(false);
      var b=event.target.closest('button');if(!b||b.disabled)return;
      if(b.hasAttribute('data-peer-notice-dismiss')){noticeVisible=false;rememberNotice();track('trajectory_sharing_notice_dismiss',{status:200});paint();return;}
      if(b.hasAttribute('data-peer-confirm-cancel')){track('trajectory_sharing_confirm_cancel',{enabled:confirmAction===true});confirmAction=null;paint();return;}
      if(b.hasAttribute('data-peer-confirm-ok')){var confirmedValue=confirmAction===true;confirmAction=null;track('trajectory_sharing_confirm_accept',{enabled:confirmedValue});sharing(confirmedValue);return;}
      if(b.hasAttribute('data-peer-enable')){confirmAction=true;track('trajectory_sharing_confirm_view',{enabled:true});paint();return;}
      if(b.hasAttribute('data-peer-disable')){confirmAction=false;track('trajectory_sharing_confirm_view',{enabled:false});paint();return;}
      if(b.hasAttribute('data-peer-retry')){track('trajectory_retry',{kind:enabled===true?'match':'status'});if(enabled===true)load();else status();}
      if(b.hasAttribute('data-peer-metric')){var previous=filters.metric;metricChoice=b.getAttribute('data-peer-metric');filters.metric=metricChoice;track('trajectory_filter_change',{filter:'metric',from:previous,to:metricChoice});load();}
      if(b.hasAttribute('data-peer-mode')){var previousMode=filters.match_mode;matchChoice=b.getAttribute('data-peer-mode');filters.match_mode=matchChoice;remember();track('trajectory_filter_change',{filter:'match_mode',from:previousMode,to:matchChoice});load();}
      if(b.hasAttribute('data-peer-default')){matchChoice='shape';policyChoice='balanced';minChoice=3;categoryChoice='__all__';sameCategoryChoice=false;forecastChoice=forecast.settings();filters.match_mode=matchChoice;filters.reference_policy=policyChoice;filters.min_history=minChoice;filters.category=categoryChoice;filters.same_category=sameCategoryChoice;remember();track('trajectory_settings_reset',{category:categoryChoice,same_category:sameCategoryChoice,reference_policy:policyChoice,min_history:minChoice,forecast_similarity:forecastChoice.similarity,forecast_history:forecastChoice.history,forecast_width:forecastChoice.width});load();}
      if(b.hasAttribute('data-peer-expand')){expandedReferences=!expandedReferences;paint();track('trajectory_references_expand',{expanded:expandedReferences,count:result.matches.length});return;}
      if(b.hasAttribute('data-peer-index')){var i=Number(b.getAttribute('data-peer-index'));selected[i]=!selected[i];paint();track('trajectory_select',{index:i+1,selected:selected[i]});}
    };
    host.onkeydown=function(event){if(event.key!=='Escape')return;if(confirmAction!==null){track('trajectory_sharing_confirm_cancel',{enabled:confirmAction===true,source:'escape'});confirmAction=null;paint();event.preventDefault();return;}if(host.querySelector('.st-peer-forecast-tip:not([hidden])')){toggleForecast(false);host.querySelector('.st-peer-forecast-label').focus({preventScroll:true});event.preventDefault();}};
    host.oninput=function(event){if(event.target.matches('input[type="number"]'))event.target.setCustomValidity('');};
    host.onsubmit=function(event){
      var form=event.target;if(!form.hasAttribute('data-peer-settings'))return;event.preventDefault();if(busy)return;
      var input=form.elements.min_history,value=Number(input.value),policy=form.elements.reference_policy.value,category=form.elements.category.value,sameCategory=form.elements.same_category.value==='true';
      if(!Number.isInteger(value)||value<3||value>1000){input.setCustomValidity('请输入 3～1000 之间的整数');input.reportValidity();return;}
      if(['balanced','long','recent'].indexOf(policy)<0)return;
      if(!validTrajectoryCategory(category))return;
      var nextForecast={},specs=[['similarity',0,3],['history',0,2],['width',0.5,2]];
      for(var j=0;j<specs.length;j++){var spec=specs[j],field=form.elements['forecast_'+spec[0]],v=Number(field.value);if(field.value.trim()===''||!Number.isFinite(v)||v<spec[1]||v>spec[2]){field.closest('details').open=true;field.setCustomValidity('请输入 '+spec[1]+'～'+spec[2]+' 之间的数值');field.reportValidity();return;}nextForecast[spec[0]]=v;}
      var rematch=minChoice!==value||policyChoice!==policy||categoryChoice!==category||sameCategoryChoice!==sameCategory;
      minChoice=value;policyChoice=policy;categoryChoice=category;sameCategoryChoice=sameCategory;forecastChoice=nextForecast;filters.min_history=value;filters.reference_policy=policy;filters.category=category;filters.same_category=sameCategory;remember();track('trajectory_settings_change',{category:category,same_category:sameCategory,reference_policy:policy,min_history:value,forecast_similarity:forecastChoice.similarity,forecast_history:forecastChoice.history,forecast_width:forecastChoice.width,rematch:rematch});if(rematch)load();else paint();
    };
    status();
  }
  var style=document.createElement('style');style.textContent=
    '.st-peer-option-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.st-peer-fit{font-size:11px;line-height:1.4;padding:3px 7px;border-radius:999px;background:var(--cell,#f6f7fa);color:var(--text,#18212f);white-space:nowrap;font-variant-numeric:tabular-nums}'+
    '.st-peer-settings{margin:12px 0 16px;border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:11px 13px;font-size:12px}.st-peer-settings summary{cursor:pointer;color:var(--muted,#788392);line-height:1.7}.st-peer-settings form{margin-top:14px}.st-peer-fields{display:flex;flex-wrap:wrap;gap:12px}.st-peer-fields label{display:flex;flex:1;min-width:130px;flex-direction:column;gap:7px;color:var(--muted,#788392)}.st-peer-fields select,.st-peer-fields input{box-sizing:border-box;width:100%;min-height:40px;padding:8px 10px;border:1px solid var(--line,#e8ebf0);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:16px}.st-peer-setting-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:12px}.st-peer-setting-actions span{font-size:11px;color:var(--muted,#788392)}.st-peer-settings select:focus-visible,.st-peer-settings input:focus-visible,.st-peer-settings summary:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}'+
    '.st-peer{margin-top:22px;padding-top:22px;border-top:1px solid var(--line,#e8ebf0);color:var(--text,#18212f)}.st-peer-heading,.st-peer-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.st-peer h4{font-size:16px;margin:0}.st-peer-heading p,.st-peer-invite p,.st-peer-empty p{font-size:12px;color:var(--muted,#788392);line-height:1.8;margin:6px 0 0}.st-peer-invite{padding:20px;background:var(--accent-soft,#eef1ff);border-radius:16px;margin-top:16px;display:flex;align-items:center;gap:24px}.st-peer-invite b{font-size:14px}.st-peer-invite button{flex-shrink:0;padding:11px 16px;border-radius:12px;border:0;background:var(--accent,#5d72e8);color:white;font:inherit;font-size:12px;cursor:pointer}.st-peer-controls{margin:16px 0}.st-peer-controls>div,.st-peer-modes{display:flex;gap:6px;flex-wrap:wrap}.st-peer-modes{margin-top:12px}.st-peer-link{background:none;border:0;color:var(--muted,#788392);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.st-peer-summary{padding:16px 18px;border-radius:14px;background:var(--cell,#f6f7fa);display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}.st-peer-summary span,.st-peer-summary small{font-size:12px;color:var(--muted,#788392)}.st-peer-summary strong{font-size:22px;font-variant-numeric:tabular-nums}.st-peer-summary small{margin-left:auto}.st-peer-options{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0}.st-peer-mine{font-size:12px;color:var(--accent,#5d72e8);margin-right:8px}.st-peer-option{display:flex;flex-direction:column;gap:5px;padding:10px 14px;border-radius:12px;border:1px solid var(--peer-color);color:var(--peer-color);background:var(--panel-solid,#fff);font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:opacity .18s,transform .18s}.st-peer-option small{font-size:11px;color:var(--muted,#788392)}.st-peer-option[aria-pressed=false]{opacity:.45;border-color:var(--line,#e8ebf0)}.st-peer-option:active{transform:scale(.97)}.st-peer-chart{overflow:auto;touch-action:pan-x pan-y;max-width:100%}.st-peer-chart svg{display:block;width:100%;height:auto}.st-peer-chart text{font-size:11px;fill:var(--muted,#788392)}.st-peer-note{font-size:11px;line-height:1.8;color:var(--muted,#788392);margin:10px 0 0}.st-peer-empty{padding:24px 10px;text-align:center;font-size:14px}.st-peer-empty button{margin-top:12px}.st-peer-loading,.st-peer-error{font-size:13px;padding:20px 0;color:var(--muted,#788392)}.st-peer-loading{animation:st-peer-pulse 1.3s ease-in-out infinite}.st-peer-details{font-size:12px;color:var(--muted,#788392);margin-top:12px}.st-peer-details summary{cursor:pointer}.st-peer-table{overflow:auto;margin-top:10px}.st-peer-table table{width:100%;border-collapse:collapse;white-space:nowrap}.st-peer-table th,.st-peer-table td{padding:9px;text-align:left;border-bottom:1px solid var(--line,#e8ebf0)}.st-peer button:focus-visible,.st-peer-chart:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}.st-peer button:disabled{opacity:.55;cursor:wait}@keyframes st-peer-pulse{50%{opacity:.5}}@media(max-width:620px){.st-peer-invite{flex-direction:column;align-items:stretch;gap:14px;padding:16px}.st-peer-summary strong{font-size:19px}.st-peer-summary small{width:100%;margin:0}.st-peer-option{flex:1;min-width:90px;padding:9px}.st-peer-mine{width:100%}}@media(prefers-reduced-motion:reduce){.st-peer *{animation:none!important;transition:none!important}}';document.head.appendChild(style);
  style.textContent+='.st-peer-notice{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11px;line-height:1.6;color:var(--muted,#788392)}.st-peer-notice span{flex:1;min-width:0}.st-peer-count{display:block;margin-top:6px;font-size:11px;line-height:1.5;color:var(--muted,#788392)}.st-peer-off{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;font-size:12px;color:var(--muted,#788392)}.st-peer-confirm{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.4);backdrop-filter:blur(7px)}.st-peer-confirm-dialog{width:min(390px,100%);box-sizing:border-box;padding:22px;border:1px solid var(--line,#e8ebf0);border-radius:18px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 20px 70px rgba(17,24,39,.24)}.st-peer-confirm-dialog h4{margin:0;font-size:17px}.st-peer-confirm-dialog p{margin:11px 0 0;font-size:13px;line-height:1.8;color:var(--muted,#788392)}.st-peer-confirm-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:19px}.st-peer-confirm-actions .chip{min-height:38px;padding:8px 13px}.st-peer-confirm button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}@media(max-width:620px){.st-peer-notice{align-items:flex-start}.st-peer-confirm{padding:12px}.st-peer-confirm-dialog{padding:19px 17px;border-radius:16px}.st-peer-confirm-actions{display:grid;grid-template-columns:1fr 1fr}.st-peer-confirm-actions .chip{width:100%}}';
  style.textContent+='.st-peer-settings summary,.st-peer-fields label,.st-peer-link,.st-peer-option small{color:var(--text,#18212f)}.st-peer-settings summary{font-weight:500}.st-peer-advanced{margin-top:16px;border-top:1px solid var(--line,#e8ebf0);padding-top:12px}.st-peer-advanced .st-peer-fields{margin-top:12px}.st-peer-summary{position:relative;align-items:center;gap:10px 28px;padding:20px}.st-peer-center,.st-peer-range{display:flex;flex-direction:column;gap:6px}.st-peer-summary span{color:var(--text,#18212f)}.st-peer-summary strong{font-size:28px;line-height:1.2;color:var(--accent,#5d72e8)}.st-peer-summary b{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}.st-peer-summary small{align-self:flex-end;font-size:11px}.st-peer-chart-caption{margin:8px 0 14px;font-size:11px;color:var(--text,#18212f)}.st-peer-help,.st-peer-details{margin:0;font-size:12px;line-height:1.8;color:var(--text,#18212f)}.st-peer-help summary,.st-peer-details summary{cursor:pointer;padding:9px 0}.st-peer-help p{margin:8px 0 12px}.st-peer-help summary:focus-visible,.st-peer-details summary:focus-visible,.st-peer-advanced summary:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}.st-peer-table .st-peer-note{color:var(--text,#18212f)}@media(max-width:620px){.st-peer-summary{gap:14px 20px;padding:18px}.st-peer-summary strong{font-size:26px}.st-peer-summary small{width:100%;margin:0}.st-peer-summary b{font-size:14px}.st-peer-option{min-width:0}.st-peer-option-title{gap:5px}.st-peer-fit{font-size:10px}.st-peer-advanced .st-peer-fields label{min-width:110px}}';
  style.textContent+='.st-peer-chart-canvas{position:relative;min-width:100%}.st-peer-forecast-label{position:absolute;box-sizing:border-box;width:76px;min-height:28px;padding:4px 7px;border:0;border-radius:7px;background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}.st-peer-forecast-label::before{content:"";position:absolute;inset:-8px 0}.st-peer-forecast-tip{position:absolute;z-index:2;box-sizing:border-box;width:220px;padding:14px;border:1px solid var(--line,#e8ebf0);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 8px 24px rgba(20,30,60,.12);font-size:12px}.st-peer-forecast-tip[hidden]{display:none}.st-peer-forecast-tip>button{position:absolute;right:3px;top:3px;width:32px;height:32px;border:0;background:none;color:var(--text,#18212f);font-size:20px;cursor:pointer}.st-peer-forecast-tip>div{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.st-peer-forecast-tip strong{font-size:19px;color:var(--accent,#5d72e8)}.st-peer-forecast-tip b{font-size:13px;font-weight:500}.st-peer-forecast-tip small{font-size:10px}';
  style.textContent+='.st-peer-qualification{margin:12px 0;padding:12px 14px;border:1px solid var(--line,#e8ebf0);border-radius:12px;background:var(--cell,#f6f7fa);font-size:12px;line-height:1.7}.st-peer-qualification strong{font-weight:650}.st-peer-qualification p{margin:5px 0 0;color:var(--muted,#788392)}';
  window.__stTrajectories={html:function(){return '<section class="st-peer" data-peer-host aria-label="相似轨迹"></section>';},bind:bind};
  // Keep the canvas coordinates identical to SVG coordinates, including on wide screens.
  style.textContent+='.st-peer-chart-canvas{min-width:0}.st-peer-forecast-tip{line-height:1.5}.st-peer-forecast-label{padding:0;background:transparent;border-radius:0;min-height:20px;font-size:10px;font-weight:400}';
  document.addEventListener('click',function(event){if(host&&!host.contains(event.target))toggleForecast(false);});
  // Invalidate in-flight results as soon as navigation or sign-out removes the host.
  new MutationObserver(function(){if(host&&!host.isConnected){generation++;host=null;result=null;}if(owner!==identity())reset();}).observe(document.body,{childList:true,subtree:true});
})();

/* ===== school-settings.js ===== */
/* School preferences are independent of registration and first-run setup. */
(function () {
  'use strict';
  const API = '/api/score-tracker-setup';
  let owner = '', profile = null, loaded = false, failed = false, fetching = false;
  let claiming = false, claimed = false, retryAt = 0, modal = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function user() { return state.user && state.token ? { id: String(state.user.id), token: state.token } : null; }
  const identity = u => u ? u.id + ':' + u.token : '';
  const current = u => identity(user()) === identity(u);
  function track(event, data) { try { window.__scoreTrackerTrack?.(event, data || {}); } catch (_) {} }
  async function call(action, payload, u, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: controller.signal, body: JSON.stringify({ ...payload, action, token: u.token }) });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error || '暂时没能加载，请稍后再试');
        error.status = response.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  function blocked() {
    return state.onboarding || document.visibilityState !== 'visible' || document.querySelector('.modal-backdrop,.rn-back,.fv36-back,.st-fb-back,.pwa-back,.gmodal-backdrop.open');
  }
  function refreshCard() { if (state.user && state.page === 'account') renderPage(); }
  async function load(u) {
    if (fetching || !u) return;
    fetching = true; failed = false;
    try {
      const data = await call('get', {}, u);
      if (!current(u)) return;
      profile = data.profile; loaded = true; retryAt = 0;
    } catch (_) { if (current(u)) { failed = true; retryAt = Date.now() + 30000; } }
    finally { if (current(u)) { fetching = false; refreshCard(); } }
  }
  async function tick() {
    const u = user(), key = identity(u);
    if (key !== owner) {
      if (modal) modal.close(true);
      owner = key; profile = null; loaded = failed = fetching = claiming = claimed = false; retryAt = 0;
      refreshCard();
    }
    if (!u) return;
    if (!loaded && !fetching && Date.now() >= retryAt) { load(u); return; }
    if (!loaded || claiming || modal || blocked() || profile?.school) return;
    if (claimed) { open(u, true); return; }
    if (profile?.school_prompted_at || profile?.completed_at || profile?.step === 6 || Date.now() < retryAt) return;
    claiming = true;
    try {
      const data = await call('school_prompt_claim', {}, u);
      if (!current(u)) return;
      profile = data.profile; claimed = data.claimed && !modal; refreshCard();
      if (claimed && !blocked() && !modal) open(u, true);
    } catch (_) { if (current(u)) retryAt = Date.now() + 30000; }
    finally { if (current(u)) claiming = false; }
  }
  function styles() {
    if (document.getElementById('school-settings-style')) return;
    const style = document.createElement('style'); style.id = 'school-settings-style';
    style.textContent = `
      .school-card{margin-top:18px}.school-card p{overflow-wrap:anywhere}
      .school-back{position:fixed;inset:0;z-index:171;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.42);backdrop-filter:blur(9px)}
      .school-dialog{width:min(520px,100%);max-height:90vh;max-height:90dvh;overflow:auto;padding:24px;border:1px solid var(--line);border-radius:24px;background:var(--panel-solid,#fff);color:var(--text);box-shadow:0 30px 90px rgba(17,24,39,.26)}
      .school-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.school-head h2{margin:0;font-size:22px}.school-close{border:0;background:var(--cell);color:var(--muted);border-radius:10px;width:34px;height:34px;font-size:22px}
      .school-intro,.school-hint{color:var(--muted);font-size:13px;line-height:1.7}.school-filters{display:grid;grid-template-columns:1fr 1fr;gap:12px}.school-dialog label{display:block;font-size:13px;margin-top:12px}
      .school-dialog input,.school-dialog select{width:100%;min-width:0;box-sizing:border-box;margin-top:7px;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--cell,#f7f8fb);color:var(--text);font:inherit}
      .school-results{display:grid;gap:6px;max-height:240px;overflow:auto;margin-top:12px}.school-result{display:block;width:100%;text-align:left;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;cursor:pointer;overflow-wrap:anywhere}.school-result[aria-pressed=true]{border-color:var(--accent);background:var(--accent-soft)}
      .school-result small{display:block;margin-top:4px;color:var(--muted);font-size:11px}.school-error{color:var(--danger,#c24141);font-size:13px;line-height:1.6;margin-top:12px}.school-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.school-dialog button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.school-dialog button:disabled{opacity:.55;cursor:default}
      @media(max-width:620px){.school-back{padding:12px}.school-dialog{padding:20px 18px;border-radius:21px}.school-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }
  function open(u, automatic) {
    if (modal || !current(u) || blocked()) return;
    styles(); claimed = false;
    const saved = profile?.school;
    let selected = saved || null, query = saved?.name || '', province = saved?.province || '', city = saved?.city || '';
    let regions = [], rows = [], sequence = 0, searchTimer, controller, busy = false, alive = true;
    const back = document.createElement('div'); back.className = 'school-back';
    const focus = document.activeElement, overflow = document.body.style.overflow;
    back.innerHTML = '<section class="school-dialog" role="dialog" aria-modal="true" aria-labelledby="schoolTitle" aria-describedby="schoolIntro"><div class="school-head"><h2 id="schoolTitle">'+(saved ? '修改学校' : '你在哪所学校？')+'</h2><button class="school-close" type="button" aria-label="关闭">×</button></div><p class="school-intro" id="schoolIntro">选好学校后，随时都能在设置里修改。现在不选也没关系。</p><div class="school-filters"><label>省份<select id="schoolProvince" aria-label="省份"><option value="">全部省份</option></select></label><label>城市<select id="schoolCity" aria-label="城市"><option value="">全部城市</option></select></label></div><label for="schoolQuery">学校名称</label><input id="schoolQuery" maxlength="100" autocomplete="off" placeholder="输入学校名称"><div id="schoolRegionStatus" class="school-hint" role="status"></div><div id="schoolResults" class="school-results" aria-label="学校搜索结果"></div><p id="schoolSearchStatus" class="school-hint" role="status"></p><div id="schoolError" class="school-error" role="alert"></div><div class="school-actions"><button type="button" class="secondary" id="schoolLater">'+(automatic ? '以后再选' : '取消')+'</button><button type="button" class="primary" id="schoolSave">保存学校</button></div></section>';
    const el = id => back.querySelector('#'+id);
    el('schoolQuery').value = query;
    const valid = () => alive && current(u);
    const close = (force, reason = 'close_button') => {
      if (!alive || busy && !force) return;
      alive = false; clearTimeout(searchTimer); controller?.abort(); back.remove();
      document.body.style.overflow = overflow;
      if (focus?.isConnected) focus.focus();
      modal = null;
      if (!force) track('school_picker_dismissed', { source: automatic ? 'prompt' : 'settings', reason });
    };
    modal = { close }; document.body.appendChild(back); document.body.style.overflow = 'hidden';
    // Opening the picker from Settings counts as seeing it too.
    if (!automatic && !profile?.school_prompted_at && !profile?.school) {
      call('school_prompt_claim', {}, u).then(data => {
        if (current(u)) { profile = data.profile; refreshCard(); }
      }).catch(() => {});
    }
    function filters() {
      const provinces = [...new Set(regions.map(r => r[0]))];
      if (province && !provinces.includes(province)) provinces.push(province);
      el('schoolProvince').innerHTML = '<option value="">全部省份</option>'+provinces.map(p => '<option'+(p === province ? ' selected' : '')+'>'+esc(p)+'</option>').join('');
      const cities = [...new Set(regions.filter(r => !province || r[0] === province).map(r => r[1]))];
      if (city && !cities.includes(city)) cities.push(city);
      el('schoolCity').innerHTML = '<option value="">全部城市</option>'+cities.map(c => '<option'+(c === city ? ' selected' : '')+'>'+esc(c)+'</option>').join('');
    }
    function results() {
      el('schoolResults').innerHTML = rows.map((s,i) => '<button type="button" class="school-result" data-school="'+i+'" aria-pressed="'+String(!!selected && s[0] === selected.name && s[1] === selected.province && s[2] === selected.city && s[3] === selected.area)+'">'+esc(s[0])+'<small>'+esc([s[1],s[2],s[3]].filter(Boolean).join(' · '))+'</small></button>').join('');
      back.querySelectorAll('[data-school]').forEach(button => button.onclick = () => {
        const s = rows[Number(button.dataset.school)];
        selected = { name:s[0], province:s[1], city:s[2], area:s[3], source:'github' };
        query = s[0]; el('schoolQuery').value = query; results();
        el('schoolSearchStatus').textContent = '已选：'+s[0];
        track('school_picker_selection_changed', { source: automatic ? 'prompt' : 'settings', selection: 'github', result_rank: Number(button.dataset.school) + 1 });
      });
    }
    function search(delay = 250) {
      clearTimeout(searchTimer); controller?.abort(); const version = ++sequence;
      rows = []; results(); el('schoolSearchStatus').textContent = '正在查找学校…';
      searchTimer = setTimeout(async () => {
        controller = new AbortController();
        try {
          track('school_search_started', { source: automatic ? 'prompt' : 'settings', query_length: query.trim().length, has_province: !!province, has_city: !!city });
          const data = await call('school_search', { query, province, city }, u, controller.signal);
          if (!valid() || version !== sequence) return;
          rows = data.schools || []; results();
          el('schoolSearchStatus').textContent = data.has_more ? '还有更多学校，试试完整校名或选一下地区。' : rows.length ? '点选你的学校；没找到也可以直接保存输入的名称。' : '没找到？可以直接保存你输入的学校名称。';
          track('school_search_completed', { source: automatic ? 'prompt' : 'settings', result_count: rows.length, has_more: !!data.has_more, query_length: query.trim().length });
        } catch (error) {
          if (!valid() || version !== sequence || error.name === 'AbortError') return;
          el('schoolSearchStatus').textContent = '学校列表暂时没加载出来，可以重试，也可以直接保存校名。';
          track('school_search_failed', { source: automatic ? 'prompt' : 'settings', status: Number(error.status) || 0 });
          const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'secondary'; retry.textContent = '重试'; retry.onclick = () => search(0); el('schoolResults').appendChild(retry);
        }
      }, delay);
    }
    async function loadRegions() {
      el('schoolRegionStatus').textContent = '正在加载地区…';
      try {
        const data = await call('school_regions', {}, u);
        if (!valid()) return; regions = data.regions || []; filters(); el('schoolRegionStatus').textContent = '';
        track('school_regions_loaded', { source: automatic ? 'prompt' : 'settings', region_count: regions.length });
      } catch (error) {
        if (!valid()) return;
        el('schoolRegionStatus').textContent = '地区暂时没加载出来，仍可按校名查找。';
        track('school_regions_failed', { source: automatic ? 'prompt' : 'settings', status: Number(error.status) || 0 });
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'secondary'; retry.textContent = '重试'; retry.onclick = loadRegions; el('schoolRegionStatus').appendChild(retry);
      }
    }
    el('schoolProvince').onchange = e => { province = e.target.value; city = ''; selected = null; filters(); search(0); };
    el('schoolCity').onchange = e => { city = e.target.value; selected = null; search(0); };
    let manualEntryTracked = false;
    el('schoolQuery').oninput = e => {
      query = e.target.value; selected = null; el('schoolError').textContent = '';
      if (query.trim() && !manualEntryTracked) { manualEntryTracked = true; track('school_picker_selection_changed', { source: automatic ? 'prompt' : 'settings', selection: 'manual' }); }
      search();
    };
    back.querySelector('.school-close').onclick = () => close(false, 'close_button');
    el('schoolLater').onclick = () => close(false, automatic ? 'later' : 'cancel_button');
    back.onclick = e => { if (e.target === back) close(false, 'backdrop'); };
    back.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(false, 'escape'); }
      if (e.key !== 'Tab') return;
      if (busy) { e.preventDefault(); return; }
      const nodes = [...back.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
      const first = nodes[0], last = nodes[nodes.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el('schoolSave').onclick = async () => {
      if (busy || !valid()) return;
      if (!query.trim()) {
        el('schoolError').textContent = '先输入或选择你的学校吧';
        el('schoolQuery').focus();
        track('school_save_validation_failed', { source: automatic ? 'prompt' : 'settings', reason: 'empty_name' });
        return;
      }
      const school = selected || { name:query.trim(), province, city, area:'', source:'manual' };
      clearTimeout(searchTimer); controller?.abort(); sequence++;
      busy = true; el('schoolError').textContent = ''; el('schoolSave').textContent = '正在保存…';
      back.querySelectorAll('button,input,select').forEach(node => node.disabled = true);
      try {
        const data = await call('school_save', { school }, u);
        if (!valid()) return;
        profile = data.profile; loaded = true; close(true); refreshCard(); toast('学校已保存');
        track('school_saved', { source:automatic ? 'prompt' : 'settings', selection:school.source });
      } catch (error) {
        if (valid()) el('schoolError').textContent = error.message || '没有保存成功，请再试一次';
        if (valid()) track('school_save_failed', { source: automatic ? 'prompt' : 'settings', selection: school.source, status: Number(error.status) || 0 });
      } finally {
        busy = false;
        if (valid()) { back.querySelectorAll('button,input,select').forEach(node => node.disabled = false); el('schoolSave').textContent = '保存学校'; }
      }
    };
    filters(); loadRegions(); search(0); el('schoolQuery').focus();
    track('school_picker_shown', { source:automatic ? 'prompt' : 'settings' });
  }
  styles();
  const previousAccount = accountHtml;
  accountHtml = function () {
    const school = profile?.school;
    return previousAccount()+'<section class="card account-card school-card"><h3 class="card-title">我的学校</h3><p class="card-sub">'+esc(school ? [school.province,school.city,school.area].filter(Boolean).join(' · ') || '随时可以修改' : '选一下你现在就读的学校')+'</p><p>'+esc(school?.name || (failed ? '学校暂时没加载出来' : loaded ? '还没有选择学校' : '正在加载学校…'))+'</p><button type="button" class="secondary" id="schoolEdit"'+(!loaded && !failed ? ' disabled' : '')+'>'+(!loaded ? failed ? '重新加载' : '正在加载…' : school ? '修改学校' : '选择学校')+'</button></section>';
  };
  const previousBind = bindPage;
  bindPage = function () {
    previousBind();
    document.getElementById('schoolEdit')?.addEventListener('click', () => {
      const u = user(); if (!u) return;
      track('school_settings_entry_clicked', { loaded, has_school: !!profile?.school, retry: !loaded });
      if (!loaded) load(u); else open(u, false);
    });
  };
  const previousRender = render;
  render = function () { previousRender(); tick(); };
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('storage', e => { if (e.key === 'st_token' && modal && e.newValue !== user()?.token) modal.close(true); });
  setInterval(tick, 1000);
  tick();
})();

/* ===== announcement-settings.js ===== */
/* 账号设置里的公告入口：与底部版本号入口共用公告读取和历史记录。 */
(function(){
  'use strict';
  if(typeof accountHtml!=='function'||typeof bindPage!=='function')return;
  if(!document.getElementById('announcement-settings-style')){
    var style=document.createElement('style');style.id='announcement-settings-style';
    style.textContent='.announcement-settings-card{margin-top:18px;display:flex;flex-direction:column;align-items:flex-start;gap:16px}.announcement-settings-card .card-sub{line-height:1.7}.announcement-settings-status{margin:0;font-size:12px;line-height:1.6;color:var(--muted)}.announcement-settings-status:empty{display:none}';
    document.head.appendChild(style);
  }
  var previousAccountHtml=accountHtml;
  accountHtml=function accountHtmlWithAnnouncements(){
    return previousAccountHtml.apply(this,arguments)+'<section class="card account-card announcement-settings-card" id="announcementSettingsCard"><div><h3 class="card-title">公告</h3><p class="card-sub">重新查看当前公告，也可以切换到之前发布过的公告。</p></div><button class="secondary" type="button" id="openAnnouncementSettings">打开公告</button><p class="announcement-settings-status" id="announcementSettingsStatus" role="status"></p></section>';
  };
  var previousBindPage=bindPage;
  bindPage=function bindPageWithAnnouncements(){
    previousBindPage.apply(this,arguments);
    var button=document.getElementById('openAnnouncementSettings');
    if(!button)return;
    button.onclick=async function(){
      var status=document.getElementById('announcementSettingsStatus');
      if(!window.__releaseNotices||typeof window.__releaseNotices.openAnnouncement!=='function'){if(status)status.textContent='公告暂时无法读取，请刷新后重试';return;}
      button.disabled=true;button.textContent='正在读取…';if(status)status.textContent='';
      try{await window.__releaseNotices.openAnnouncement();}
      catch(e){if(status)status.textContent=e&&e.message||'公告暂时无法读取，请稍后重试';}
      finally{if(button.isConnected){button.disabled=false;button.textContent='打开公告';}}
    };
  };
})();

/* ===== author-support.js ===== */
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

/* ===== community.js ===== */
/* Optional, account-only WeChat community. No chat SDK or third-party image requests. */
(function () {
  'use strict';
  var config=null, identity='', loading=null, generation=0, lastLoad=0, modal=null, expiryTimer, entryTracked='';
  var esc=function(v){return escapeHtml(String(v==null?'':v));};
  function track(event, metadata) { try { var fn=window.__scoreTrackerTrack||window.__stTrack; if(typeof fn==='function')fn(event,metadata||{}); } catch (_) {} }
  function owner(){return state.user&&state.token?String(state.user.id)+'|'+state.token:'';}
  function available(){return !!(owner()&&owner()===identity&&config&&config.enabled&&config.qr_image&&(!config.expires_at||Date.parse(config.expires_at)>Date.now()));}
  function safeImage(value){return typeof value==='string' && value.length<=500000 && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)||/^\.?\/?[a-zA-Z0-9_\-./]+\.(png|jpe?g|webp)$/i.test(value)&&!value.startsWith('//')&&!value.includes('..'));}
  function safeLink(value){try{var u=new URL(value);return u.protocol==='https:'&&['weixin.qq.com','work.weixin.qq.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:'';}catch(_){return '';}}
  function close(reason){
    if(!modal)return;var old=modal;modal=null;track('community_closed',{reason:reason||'unknown'});old.back.remove();document.body.style.overflow=old.overflow;
    old.background.forEach(function(pair){if(pair[0].isConnected&&!pair[1])pair[0].removeAttribute('inert');});
    if(old.focus&&old.focus.isConnected)old.focus.focus();
  }
  function reset(){generation++;loading=null;lastLoad=0;config=null;identity=owner();entryTracked='';clearTimeout(expiryTimer);close('account_changed');}
  function refresh(){
    if(owner()!==identity)reset();
    if(!available())close('unavailable');
    var card=document.getElementById('communityAccountCard'),first=state.page==='account'&&document.querySelector('.account-grid > .account-card');
    if(!available()||!first){if(card)card.remove();}
    else if(!card){
      card=document.createElement('section');card.id='communityAccountCard';card.className='account-card community-card';
      card.innerHTML='<div><h3>交流与反馈</h3><p>一起交流使用心得，也欢迎提出建议。加入自愿，原反馈入口照常保留。</p></div><button type="button" class="community-button" data-community-open>加入微信交流群 <span aria-hidden="true">›</span></button>';
      first.after(card);
      if(entryTracked!==identity){entryTracked=identity;track('community_entry_shown',{source:'account'});}
    }
    window.__releaseNotices?.refreshSupport?.();
    if(identity&&!loading&&(!lastLoad||(state.page==='account'||modal||document.querySelector('[data-notice-community]'))&&Date.now()-lastLoad>5*60000))load(false,'refresh');
  }
  async function load(force,source){
    if(owner()!==identity)reset();if(!identity)return;
    if(loading)return loading;if(!force&&Date.now()-lastLoad<5*60000)return;
    source=source||'refresh';
    var who=identity,seq=++generation,controller=new AbortController(),timer=setTimeout(function(){controller.abort();},8000);
    lastLoad=Date.now();
    loading=(async function(){
      try{
        var res=await fetch('/api/score-tracker-notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'community_public',token:state.token}),cache:'no-store',signal:controller.signal});
        if(!res.ok){var status=res.status;var error=new Error('config unavailable');error.status=status;throw error;}var c=(await res.json()).config;
        if(seq!==generation||owner()!==who)return;
        if(!c||c.enabled!==true||!safeImage(c.qr_image)||typeof c.title!=='string'||typeof c.intro!=='string'||c.expires_at&&!Number.isFinite(Date.parse(c.expires_at)))c=null;
        if(modal&&JSON.stringify(config)!==JSON.stringify(c))close('config_changed');config=c;clearTimeout(expiryTimer);
        if(c&&c.expires_at){var remaining=Date.parse(c.expires_at)-Date.now();if(remaining>0)expiryTimer=setTimeout(refresh,Math.min(remaining+20,2147483647));}
      }catch(error){if(seq===generation&&owner()===who){track('community_config_load_failed',{source:source,status:Number(error&&error.status)||0});config=null;close('load_failed');}}
      finally{clearTimeout(timer);if(seq===generation){loading=null;refresh();}}
    })();return loading;
  }
  async function open(source){
    source=source||'api';
    if(!owner()||state.onboarding)return false;
    await load(true,'open');
    if(!available()){track('community_open_unavailable',{source:source});if(typeof toast==='function')toast('交流群暂未开放或二维码已到期，请稍后再试。');return false;}
    if(modal)return true;
    if(document.querySelector('.modal-backdrop,.rn-back,.support-back,.st-fb-back'))return false;
    track('community_opened',{source:source});
    var c=config,back=document.createElement('div');back.className='community-back modal-backdrop';
    var url=safeLink(c.join_url);
    back.innerHTML='<section class="community-panel" role="dialog" aria-modal="true" aria-labelledby="communityTitle"><header><h2 id="communityTitle">'+esc(c.title)+'</h2><button type="button" data-community-close aria-label="关闭交流群面板">×</button></header><p>'+esc(c.intro)+'</p><button type="button" class="community-qr" aria-label="放大微信群二维码" aria-pressed="false"><img src="'+esc(c.qr_image)+'" alt="微信群入群二维码"></button><p class="community-help">电脑上可用微信扫一扫；手机上可保存图片，再从微信扫一扫的相册中识别。点击二维码可放大，也可长按保存。</p>'+(c.expires_at?'<p class="community-help">二维码有效至 '+esc(new Date(c.expires_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}))+'（北京时间）</p>':'')+'<button type="button" class="community-button" data-community-save>保存群二维码</button>'+(url?'<a class="community-button" data-community-join href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">前往微信加群</a>':'')+'<p class="community-status" role="status" aria-live="polite"></p><p class="community-help">加群完全自愿，不影响任何功能。群满或二维码失效时，仍可使用原有反馈入口联系我。</p></section>';
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
    save.onclick=function(){if(!available()){close('unavailable');return;}track('community_qr_save_requested');var a=document.createElement('a');a.href=c.qr_image;a.download='成绩轨迹-微信群二维码.'+(c.qr_image.startsWith('data:')?c.qr_image.slice(11).split(';')[0]:c.qr_image.split('.').pop());document.body.appendChild(a);a.click();a.remove();back.querySelector('.community-status').textContent='已发起保存。如果没有保存成功，可以长按二维码保存。';};
    var join=back.querySelector('[data-community-join]');if(join)join.onclick=function(){track('community_join_link_clicked');};
    back.querySelector('[data-community-close]').focus();return true;
  }
  var style=document.createElement('style');style.textContent='.community-card{display:flex;align-items:center;justify-content:space-between;gap:18px}.community-card h3{margin:0 0 6px;font-size:16px}.community-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.8}.community-button{display:inline-block;text-align:center;border:1px solid var(--line);border-radius:10px;background:var(--accent-soft);color:var(--accent);font:inherit;font-size:13px;padding:11px 15px;cursor:pointer;text-decoration:none;flex-shrink:0}.community-back{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:16px;background:#101a3070;backdrop-filter:blur(6px)}.community-panel{box-sizing:border-box;width:min(460px,100%);max-height:90dvh;overflow:auto;border-radius:20px;background:var(--panel-solid,#fff);color:var(--text);padding:24px;line-height:1.8}.community-panel header{display:flex;justify-content:space-between;align-items:center;gap:12px}.community-panel h2{margin:0;font-size:19px;overflow-wrap:anywhere}.community-panel p{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.community-panel header button{border:0;background:transparent;color:var(--muted);font-size:26px;cursor:pointer}.community-qr{display:block;max-width:100%;width:230px;margin:20px auto 12px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:zoom-in}.community-qr img{display:block;width:100%;height:auto}.community-qr.is-large{width:100%;cursor:zoom-out}.community-panel .community-help{font-size:12px;color:var(--muted)}.community-panel>.community-button{box-sizing:border-box;width:100%;margin-top:10px}.community-button:disabled{opacity:.5;cursor:default}.community-panel button:focus-visible,.community-button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:520px){.community-card{flex-direction:column;align-items:stretch}.community-panel{padding:20px}.community-qr{width:210px}}';document.head.appendChild(style);
  document.addEventListener('click',function(e){if(e.target.closest?.('[data-community-open]'))open('account');});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')refresh();});
  window.addEventListener('online',function(){load(true);});
  setInterval(function(){if(document.visibilityState==='visible')refresh();},60000);
  var previousRender=render;render=function(){var r=previousRender.apply(this,arguments);refresh();return r;};
  var previousBind=bindPage;bindPage=function(){var r=previousBind.apply(this,arguments);refresh();return r;};
  new MutationObserver(function(){if(owner()!==identity)refresh();}).observe(document.body,{childList:true});
  window.__scoreTrackerCommunity={available:available,open:open,refresh:refresh,load:load};refresh();
})();

/* ===== participant-defaults.js ===== */
(function () {
  'use strict';
  var owner = '', values = {};
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  function account() { return String(state.user && state.user.id || state.token || ''); }
  function defaults() { if (owner !== account()) { owner = account(); values = {}; } return values; }
  function receive(data, token) {
    if (token !== state.token || !data || !data.participantDefaults) return;
    owner = String(data.user && data.user.id || account()); values = data.participantDefaults;
  }
  function number(v) { var s = String(v == null ? '' : v).trim(), n = Number(s); return s && Number.isInteger(n) && n > 0 && n <= 10000000 ? n : null; }
  function value(key, scope) { var row = defaults()[key]; return row && number(row[scope]); }
  function fields(modal) {
    var out = [];
    function add(input, key, scope) { if (input) out.push({input:input,key:key,scope:scope}); }
    add(modal.querySelector('#totalParticipantsV16'), 'total', 'year');
    add(modal.querySelector('#totalClassParticipantsV16'), 'total', 'class');
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
      var name = card.querySelector('.exam-subject-name-v10'); if (!name || !name.value.trim()) return;
      add(card.querySelector('.year-participants-v16'), 's:' + name.value.trim(), 'year');
      add(card.querySelector('.class-participants-v16'), 's:' + name.value.trim(), 'class');
    });
    modal.querySelectorAll('.combo-card-v21').forEach(function (card) {
      add(card.querySelector('.combo-yp-v25'), 'm:' + card.dataset.comboId, 'year');
      add(card.querySelector('.combo-cp-v25'), 'm:' + card.dataset.comboId, 'class');
    });
    return out;
  }
  var apiBefore = dataApiV7;
  dataApiV7 = async function (action, payload) {
    var token = state.token;
    if (action === 'save_exam' && payload && payload.exam && !payload.exam.id && state.modal && state.modal._participantDraft) {
      payload = Object.assign({}, payload, {participantDefaults:state.modal._participantDraft});
    }
    var data = await apiBefore.call(this, action, payload);
    receive(data, token);
    if (token === state.token && data && data.participantDefaultsWarning) setTimeout(function () { toast(data.participantDefaultsWarning); }, 100);
    return data;
  };
  var openBefore = openExam;
  openExam = function (exam) {
    var result = openBefore.apply(this, arguments), modal = state.modal;
    // Saved exams and restored drafts retain their own values, including intentional blanks.
    if (!modal || exam || modal.dataset.participantDefaults) return result;
    modal.dataset.participantDefaults = '1'; modal._participantDraft = {};
    var touched = new WeakSet(), initialOwner = account();
    [['.pt-year-v25','year'],['.pt-class-v25','class']].forEach(function (pair) {
      var input = modal.querySelector(pair[0]), n = value('total', pair[1]);
      if (input && n) input.value = String(n);
    });
    function fill() {
      if (!modal.isConnected || initialOwner !== account()) return;
      fields(modal).forEach(function (field) {
        var input = field.input;
        if (touched.has(input)) return;
        var n = value(field.key, field.scope);
        if (n) {
          if (!input.value || input.dataset.autoV25 === '1') {
            input.value = String(n); input.dataset.userSetV25 = '1'; delete input.dataset.autoV25;
          }
        } else if (!input.value || input.dataset.autoV25 === '1') {
          var total = modal.querySelector(field.scope === 'year' ? '.pt-year-v25' : '.pt-class-v25');
          if (total && number(total.value)) { input.value = total.value; input.dataset.autoV25 = '1'; }
        }
      });
    }
    modal.addEventListener('input', function (event) {
      var input = event.target;
      var field = fields(modal).find(function (f) { return f.input === input; });
      if (!field && input.matches('.pt-year-v25,.pt-class-v25')) field = {key:'total',scope:input.matches('.pt-year-v25')?'year':'class'};
      if (field) {
        touched.add(input);
        var n = number(input.value);
        if (n) { var row = modal._participantDraft[field.key] || {}; row[field.scope] = n; modal._participantDraft[field.key] = row; }
        else if (modal._participantDraft[field.key]) delete modal._participantDraft[field.key][field.scope];
      }
      if (input.matches('.exam-subject-name-v10')) fill();
    });
    var observer = new MutationObserver(fill); observer.observe(modal, {childList:true,subtree:true});
    var detach = new MutationObserver(function () { if (!modal.isConnected) { observer.disconnect(); detach.disconnect(); } });
    detach.observe(modal.parentNode, {childList:true}); fill();
    return result;
  };
  function settings() {
    if (state.page !== 'account') return;
    var host = document.querySelector('.subject-settings-v7'); if (!host || host.querySelector('.participant-settings')) return;
    var items = [{key:'total',name:'整场考试'}];
    (state.subjectConfigs || []).forEach(function (s) { items.push({key:'s:'+s.name,name:s.name}); });
    (state.modulesV18 || []).forEach(function (m) { items.push({key:'m:'+m.id,name:m.name}); });
    var box = document.createElement('details'); box.className = 'participant-settings';
    box.innerHTML = '<summary>默认参考人数</summary><p class="card-sub">新考试自动带入；本场临时修改不影响默认值。科目和组合留空时沿用整场人数。</p>' +
      '<div class="participant-head"><span>科目 / 组合</span><span>年级人数</span><span>班级人数</span></div>' + items.map(function (item) {
        var row = defaults()[item.key] || {};
        return '<div class="participant-row" data-participant-key="'+esc(item.key)+'"><span>'+esc(item.name)+'</span>' + ['year','class'].map(function (scope) {
          return '<input type="number" min="1" max="10000000" step="1" inputmode="numeric" data-participant-scope="'+scope+'" aria-label="'+esc(item.name)+(scope==='year'?'年级人数':'班级人数')+'" placeholder="'+(item.key==='total'?'选填':'沿用总人数')+'" value="'+esc(row[scope])+'">';
        }).join('')+'</div>';
      }).join('') + '<div class="participant-actions"><span role="status"></span><button type="button" class="secondary">保存人数</button></div>';
    host.appendChild(box);
    var initialOwner = account(), snapshot = JSON.parse(JSON.stringify(defaults()));
    box.querySelector('button').onclick = async function () {
      if (initialOwner !== account()) return;
      var patch = {}, invalid = false, button = this, status = box.querySelector('[role="status"]');
      box.querySelectorAll('[data-participant-key]').forEach(function (row) {
        var key = row.dataset.participantKey;
        row.querySelectorAll('input').forEach(function (input) {
          var raw = input.value.trim(), n = number(raw), scope = input.dataset.participantScope;
          if (raw && n === null) { invalid = true; input.setAttribute('aria-invalid','true'); }
          else input.removeAttribute('aria-invalid');
          var old = snapshot[key] && snapshot[key][scope];
          if (n !== (old == null ? null : old)) { patch[key] = patch[key] || {}; patch[key][scope] = n; }
        });
      });
      if (invalid) { status.textContent = '人数请输入正整数，或留空'; return; }
      if (!Object.keys(patch).length) { status.textContent = '已保存'; return; }
      button.disabled = true; status.textContent = '保存中…';
      try {
        await dataApiV7('save_participant_defaults', {defaults:patch});
        if (initialOwner === account() && box.isConnected) { snapshot = JSON.parse(JSON.stringify(defaults())); status.textContent = '已保存'; }
      } catch (e) { if (initialOwner === account() && box.isConnected) status.textContent = e.message || '保存失败，请重试'; }
      finally { button.disabled = false; }
    };
  }
  var bindBefore = bindPage;
  bindPage = function () { var result = bindBefore.apply(this, arguments); settings(); return result; };
  var style = document.createElement('style');
  style.textContent = '.participant-settings{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.participant-settings summary{cursor:pointer;font-size:13px;font-weight:700}.participant-settings .card-sub{margin:10px 0}.participant-head,.participant-row{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:center}.participant-head{font-size:10px;color:var(--muted);padding:8px 0}.participant-row{padding:7px 0;border-top:1px solid var(--line);font-size:12px}.participant-row>span{overflow-wrap:anywhere}.participant-row input{width:100%;min-width:0;box-sizing:border-box;padding:9px 7px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text);font:inherit}.participant-row input[aria-invalid=true]{border-color:var(--danger,#d44)}.participant-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.participant-actions span{font-size:12px;color:var(--muted)}';
  document.head.appendChild(style);
})();

/* ===== exam-averages.js ===== */
/* Exam-specific final-score references; reuse the existing chart legend. */
(function () {
  'use strict';
  function number(v) { return v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v); }
  function moduleFor(subject) { return (state.modulesV18 || []).find(function (m) { return m.name === subject; }); }
  function keyFor(subject) { var m = moduleFor(subject); return subject === '总分' ? 'total' : m ? 'm:' + m.id : 's:' + subject; }
  function namesFor(exam, subject) {
    if (subject === '总分') return Object.keys(exam.scores || {}).filter(function (s) { return !exam.scores[s].excludeFromTotal && !moduleFor(s); }).sort();
    var m = moduleFor(subject); return m ? m.subjects.slice().sort() : [subject];
  }
  function basis(exam, subject) { return JSON.stringify(namesFor(exam, subject).map(function (s) { return [s, number(exam.scores && exam.scores[s] && exam.scores[s].max) || 100]; })); }
  function finalScore(exam, subject) {
    if (subject === '总分' && number(exam.total_actual_score) !== null) return number(exam.total_actual_score);
    var names = namesFor(exam, subject), sum = 0;
    if (!names.length) return null;
    for (var s of names) {
      var r = (exam.scores || {})[s]; if (!r) return null;
      var v = number(r.actual);
      if (v === null && number(r.rawMax == null ? r.max : r.rawMax) === number(r.max)) v = number(r.raw);
      if (v === null) return null;
      sum += v;
    }
    return Math.round(sum * 100) / 100;
  }
  function value(exam, subject, scope, percent) {
    var r = exam.averages && exam.averages[keyFor(subject)];
    if (!r || r.basis !== basis(exam, subject)) return null;
    var shown = subject === '总分' ? totalFor(exam,'actual') : examScore(exam,subject,'actual');
    var complete = finalScore(exam,subject);
    if (shown !== null && (complete === null || Math.abs(shown - complete) > 0.000001)) return null;
    var v = number(r[scope]); if (v === null) return null;
    if (!percent) return v;
    // A weighted manual total has no known denominator.
    if (subject === '总分' && number(exam.total_actual_score) !== null) return null;
    var max = 0;
    for (var s of namesFor(exam, subject)) { var row = (exam.scores || {})[s]; if (!row || !(number(row.max) > 0)) return null; max += number(row.max); }
    return max > 0 ? v / max * 100 : null;
  }
  function series() {
    if (state.trendMetric !== 'score' || state.scoreBasis === 'raw' || state.subject === '总览') return [];
    var subject = state.subject, percent = state.scoreViewV25 === 'percent';
    return [{label:'班级均分',scope:'class',color:'#d38429'},{label:'年级均分',scope:'year',color:'#8f62db'}].map(function (s) {
      return {label:s.label,color:s.color,dash:'3 5',value:function (e) { return value(e,subject,s.scope,percent); }};
    }).filter(function (s) { return (state.exams || []).some(function (e) { return s.value(e) !== null; }); });
  }
  function format(v) { return String(Math.round(v * 100) / 100); }
  function comparison(exam, subject, actual) {
    var complete = finalScore(exam,subject);
    if (actual == null || complete === null || Math.abs(complete - actual) > 0.000001) return '';
    var parts = [];
    [['class','班级均分'],['year','年级均分']].forEach(function (pair) {
      var avg = value(exam,subject,pair[0],false); if (avg === null) return;
      var d = Math.round((actual - avg) * 100) / 100;
      parts.push(d === 0 ? '持平' + pair[1] : (d > 0 ? '高于' : '低于') + pair[1] + ' ' + format(Math.abs(d)) + ' 分');
    });
    return parts.join(' · ');
  }
  window.ScoreAverages = {key:keyFor,basis:basis,value:value,series:series,comparison:comparison,format:format};

  var openBefore = openExam;
  openExam = function (exam) {
    var result = openBefore.apply(this,arguments), modal = state.modal;
    if (!modal || !modal.querySelector('#examSubjectsV16') || modal._averageDraft) return result;
    modal._averagesForExam = String(exam && exam.id || '');
    modal._averageOwner = state.token;
    modal._averageDraft = JSON.parse(JSON.stringify(exam && exam.averages || {}));
    function decorate(card,key,name,anchor) {
      var block = card.querySelector('.exam-averages');
      if (block && block.dataset.averageKey === key) return;
      if (block) block.remove();
      block = document.createElement('div'); block.className = 'exam-averages'; block.dataset.averageKey = key;
      ['class','year'].forEach(function (scope) {
        var label = document.createElement('label'); label.className = 'average-field';
        var title = document.createElement('span'); title.textContent = scope === 'class' ? '班级均分' : '年级均分'; label.appendChild(title);
        var input = document.createElement('input'); input.dataset.averageRow = key; input.dataset.averageScope = scope;
        input.type = 'number'; input.min = '0'; input.max = '99999'; input.step = '0.01'; input.inputMode = 'decimal'; input.placeholder = '选填 · 最终分';
        input.setAttribute('aria-label',name + title.textContent);
        var saved = modal._averageDraft[key]; input.value = saved && saved[scope] != null ? saved[scope] : '';
        input.oninput = function () { var draft = modal._averageDraft[key] || (modal._averageDraft[key] = {}); draft[scope] = input.value; input.removeAttribute('aria-invalid'); };
        label.appendChild(input); block.appendChild(label);
      });
      var score = card.querySelector(anchor);
      if (score) score.insertAdjacentElement('afterend',block); else card.appendChild(block);
    }
    function sync() {
      var total = modal.querySelector('.combo-total-v21');
      if (total) decorate(total,'total','总分','.score-total-preview-v13');
      modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
        var name = card.querySelector('.exam-subject-name-v10').value.trim();
        if (name) decorate(card,'s:' + name,name,'.score-compact-v14');
      });
      modal.querySelectorAll('.combo-card-v21').forEach(function (card) {
        var m = (state.modulesV18 || []).find(function (m) { return String(m.id) === card.dataset.comboId; });
        if (m) decorate(card,'m:' + m.id,m.name,'.combo-score-v21');
      });
    }
    sync();
    var observer = new MutationObserver(function () { if (!modal.isConnected) { observer.disconnect(); return; } sync(); });
    ['#examSubjectsV16','#comboListV21'].forEach(function (sel) { var el = modal.querySelector(sel); if (el) observer.observe(el,{childList:true,subtree:true}); });
    modal.addEventListener('input',function (e) { if (e.target.matches('.exam-subject-name-v10')) sync(); });
    return result;
  };
  var apiBefore = dataApiV7;
  dataApiV7 = function (action,payload) {
    var modal = state.modal;
    if (action === 'save_exam' && payload && payload.exam && modal && modal._averageDraft && modal._averagesForExam === String(payload.exam.id || '')) {
      if (modal._averageOwner !== state.token) throw new Error('账号已切换，请重新打开考试');
      var averages = {};
      modal.querySelectorAll('input[data-average-row]').forEach(function (input) {
        var raw = input.value.trim(); if (!raw && !input.validity.badInput) return;
        var n = number(raw);
        if (n === null || n < 0 || n > 99999 || !input.validity.valid) {
          input.setAttribute('aria-invalid','true'); input.focus(); throw new Error(input.getAttribute('aria-label') + '请输入 0～99999，最多两位小数');
        }
        var row = averages[input.dataset.averageRow] || (averages[input.dataset.averageRow] = {}); row[input.dataset.averageScope] = n;
      });
      payload = Object.assign({},payload,{exam:Object.assign({},payload.exam,{averages:averages})});
    }
    return apiBefore.call(this,action,payload);
  };
  var homeBefore = homeHtml;
  homeHtml = function () {
    var html = homeBefore.apply(this,arguments), extra = series();
    if (extra.length) html = html.replace(/(<div class="legend">)([\s\S]*?)(<\/div>)/,function (_,a,b,c) { return a + b + extra.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.label + '</span>'; }).join('') + c; });
    return html;
  };
  var metricBefore = latestMetricV20;
  latestMetricV20 = function () {
    var metric = metricBefore.apply(this,arguments); if (!metric) return metric;
    var subjects = effectiveScoreSubjectsV20(metric.exam), subject = subjects.length === 1 && number(metric.exam.total_actual_score) === null ? subjects[0] : '总分';
    return Object.assign({},metric,{comparison:comparison(metric.exam,subject,metric.value)});
  };
  var style = document.createElement('style');
  style.textContent = '.exam-averages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.average-field{display:grid;gap:5px;min-width:0;font-size:11px;color:var(--muted)}.average-field input{width:100%;min-width:0;box-sizing:border-box;min-height:38px;border:1px solid var(--input-line,var(--line));border-radius:10px;padding:9px 8px;background:var(--input-bg,#fff);color:var(--text);font:inherit;font-size:12px}.average-field input:focus-visible{outline:2px solid var(--focus,var(--accent));outline-offset:1px}.average-field [aria-invalid=true]{border-color:var(--danger)}.hero-average{font-size:11px;color:var(--muted);line-height:1.7}';
  document.head.appendChild(style);
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
    return '<div class="ed-top">' + button('← 返回考试记录', 'back') + button('编辑 / 补录', 'edit') + '</div><header class="ed-heading"><span class="ed-eyebrow">单次考试详情</span><h1 tabindex="-1">' + esc(exam.name) + '</h1><p>' + esc(fmtYearDate(exam.exam_date) + (exam.end_date && exam.end_date !== exam.exam_date ? ' — ' + fmtYearDate(exam.end_date) : '') + ' · ' + (exam.grade_level || '未分类')) + (exam.is_hidden ? ' · 已从趋势图隐藏，仍可查看完整记录' : '') + '</p></header>';
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
      '<nav class="ed-nav" aria-label="考试详情目录">' + button('各科成绩', 'jump:scores') + button('强弱科四象限', 'jump:quadrants') + (paperReviewAvailable() ? button('已录入试题', 'jump:papers') : '') + '</nav></section>';
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
      }).join('') + '</tbody></table></div>' : '<p class="ed-empty">还没有科目数据，点击“编辑 / 补录”添加成绩。</p>') + combinations(exam, m) + '</section>';
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
    var points = data.points, maxX = Math.max(10, Math.ceil(Math.max.apply(null, points.map(function (p) { return Math.abs(p.x); })) / 10) * 10), maxY = Math.max(10, Math.ceil(Math.max.apply(null, points.map(function (p) { return Math.abs(p.y); })) / 10) * 10);
    var low = 0, high = 100;
    if (movement) {
      var min = Math.min.apply(null, data.positions), max = Math.max.apply(null, data.positions), pad = Math.max(2, (max - min) * .15);
      low = Math.max(0, Math.floor((min - pad) / 5) * 5); high = Math.min(100, Math.ceil((max + pad) / 5) * 5);
      if (high - low < 10) { high = Math.min(100, low + 10); low = Math.max(0, high - 10); }
    }
    function positionY(value) { return 62 + (value - low) / (high - low) * 278; }
    var cx = 330, cy = movement ? positionY(data.position) : 201, sx = 245 / maxX, sy = 139 / maxY, marks = '';
    function yFor(p) { return movement ? positionY(p.row[view.scope].percent) : cy - p.y * sy; }
    [-1, -.5, .5, 1].forEach(function (t) {
      var x = cx + t * 245;
      marks += '<line x1="' + x + '" y1="62" x2="' + x + '" y2="340" class="ed-grid-line"/><text x="' + x + '" y="365" text-anchor="middle">' + signed(t * maxX) + '</text>';
    });
    (movement ? [0, .25, .5, .75, 1] : [-1, -.5, 0, .5, 1]).forEach(function (t) {
      var position = low + t * (high - low), y = movement ? positionY(position) : cy - t * 139;
      marks += '<line x1="85" y1="' + y + '" x2="575" y2="' + y + '" class="ed-grid-line"/><text x="73" y="' + (y + 4) + '" text-anchor="end">' + (movement ? '前' + fmtChange(position) + '%' : signed(t * maxY)) + '</text>';
    });
    // Coincident points retain their true coordinate; the subject buttons remain individually selectable.
    var groups = new Map(); points.forEach(function (p) { var key = p.x.toFixed(6) + '|' + p.y.toFixed(6); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(p); });
    var dots = Array.from(groups.values()).map(function (ps) {
      var p = ps[0], label = ps.map(function (p) { return p.row.name; }).join('、'), x = cx + p.x * sx, y = yFor(p);
      return '<g role="button" tabindex="0" aria-label="' + esc(label + '，查看科目表现') + '" data-ed-point="' + p.index + '"><title>' + esc(label) + '</title><circle cx="' + x + '" cy="' + y + '" r="13" fill="' + palette[p.group].color + '"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" class="ed-dot-number">' + (ps.length > 1 ? ps.length + '科' : p.index) + '</text></g>';
    }).join('');
    var top = 47, bottom = 354;
    var xLabel = movement ? data.windowSize === 'recent' ? '← 退步 / 进步 →（百分点 / 场）' : '← 退步 / 进步 →（百分点）' : '得分率较均值（百分点）→';
    var accessible = movement ? '当前排名与变化四象限。上方排名较靠前，右侧正在进步，左侧正在退步。' : '本次考试强弱科四象限。右侧得分率较高，上方排名较靠前。';
    return '<svg class="ed-quadrant" viewBox="0 0 660 430" role="group" aria-label="' + accessible + '详细数值见下方科目按钮。"><rect x="70" y="' + top + '" width="260" height="' + (cy - top) + '" fill="' + palette.potential.color + '10"/><rect x="330" y="' + top + '" width="260" height="' + (cy - top) + '" fill="' + palette.strength.color + '10"/><rect x="70" y="' + cy + '" width="260" height="' + (bottom - cy) + '" fill="' + palette.support.color + '10"/><rect x="330" y="' + cy + '" width="260" height="' + (bottom - cy) + '" fill="' + palette.compete.color + '10"/>' + marks +
      '<path d="M70 ' + cy + 'H590M330 47V354" class="ed-axis"/><text x="330" y="365" text-anchor="middle">0</text><text x="85" y="32" class="ed-quadrant-title">' + palette.potential.title + '</text><text x="575" y="32" text-anchor="end" class="ed-quadrant-title">' + palette.strength.title + '</text><text x="85" y="393" class="ed-quadrant-title">' + palette.support.title + '</text><text x="575" y="393" text-anchor="end" class="ed-quadrant-title">' + palette.compete.title + '</text><text x="330" y="420" text-anchor="middle">' + xLabel + '</text><text transform="translate(16 201) rotate(-90)" text-anchor="middle">' + (movement ? '当前排名位比（越上越好）' : '排名较均值领先（百分点）→') + '</text>' + dots + '</svg>';
  }
  function quadrantsHtml(m, scope, d) {
    var movement = d.mode === 'movement', scopeName = scope === 'year' ? '年级' : '班级', palette = d.palette;
    var missing = movement ? d.missing : m.included.filter(function (r) { return !d.points.some(function (p) { return p.row === r; }); }).map(function (r) { return { row: r, reason: r.rate === null ? '缺少有效最终分或满分' : r[scope].invalid ? '名次与人数不一致' : '缺少' + scopeName + '位比（请补名次与人数）' }; });
    var ready = movement ? d.currentCount >= 2 && d.points.length > 0 : d.points.length >= 2;
    var modes = '<div class="ed-scope" role="group" aria-label="四象限视图">' + [['movement','排名与变化'],['performance','本次表现']].map(function (pair) { return '<button type="button" data-ed-mode="' + pair[0] + '" aria-pressed="' + (d.mode === pair[0]) + '">' + pair[1] + '</button>'; }).join('') + '</div>';
    var range = '<div class="ed-scope" role="group" aria-label="四象限排名范围">' + ['year','class'].map(function (s) { return '<button type="button" data-ed-scope="' + s + '" aria-pressed="' + (s === scope) + '">' + (s === 'year' ? '按年级' : '按班级') + '</button>'; }).join('') + '</div>';
    var method = movement ? '纵轴显示本次' + scopeName + '位比，以本次 ' + d.currentCount + ' 科位比中位数 <b>前 ' + fmt(d.position) + '%</b> 划分个人相对强弱。横轴以 0 为界，右进步、左退步。' + (d.windowSize === 'recent' ? '近3次趋势包含本次，按考试场次计算平均变化，不按间隔天数计算。' : '变化 = 上一次可比考试位比 − 本次位比。') + '只比较更早、' + (d.sameCategory ? '同分类、' : '') + '同科目、同排名范围的有效排名；已隐藏考试不参与历史比较，同一天不推断先后。变化四舍五入到 0.01 个百分点后为 0，标为基本持平。' : '以这 ' + d.points.length + ' 科的平均得分率 <b>' + fmt(d.rate) + '%</b>、平均' + scopeName + '位比 <b>前 ' + fmt(d.position) + '%</b> 为分界。各科等权，仅反映本次考试内的相对强弱，不代表试卷难度或长期水平。均值线上的科目标为“接近均值”。';
    var empty = movement ? d.currentCount < 2 ? '本次至少需要 2 门科目的有效' + scopeName + '位比，才能划分个人相对强弱。补充名次与参考人数，或直接填写位比即可。' : d.windowSize === 'recent' ? '还没有科目具备本次及之前2次的可比排名，可以先切换“较上次”，或查看“本次表现”。' : '还没有科目具备更早的可比排名，可以先查看“本次表现”。缺少历史不会记作持平。' : '至少需要 2 门科目的有效得分率和' + scopeName + '位比。补充名次与参考人数，或直接填写位比即可。';
    return '<div class="ed-section-head"><div><span class="ed-eyebrow">02 / 强弱科</span><h2>' + (movement ? '各科排名与变化' : '这一场，哪些科目值得重点关注') + '</h2><p>' + (movement ? '越靠上，当前排名越靠前；越靠右，最近进步越明显。' : '越靠右，得分率越高；越靠上，在同范围考生中排名越靠前。') + '</p></div></div><div class="ed-chart-controls">' + modes + range + (movement ? '<label class="ed-window">比较分类<select data-ed-category aria-label="排名变化比较分类"><option value="all" ' + (d.sameCategory ? '' : 'selected') + '>全部分类</option><option value="same" ' + (d.sameCategory ? 'selected' : '') + '>仅同分类</option></select></label><label class="ed-window">比较口径<select data-ed-window aria-label="排名变化比较口径"><option value="previous" ' + (view.trendWindow !== 'recent' ? 'selected' : '') + '>较上次可比考试</option><option value="recent" ' + (view.trendWindow === 'recent' ? 'selected' : '') + '>近3次趋势</option></select></label>' : '') + '</div>' +
      (!ready ? '<div class="ed-empty"><h3>' + (movement ? '暂时无法比较排名变化' : '还差一点数据，就能比较各科表现') + '</h3><p>' + empty + '</p>' + (movement ? '<button type="button" class="ed-button" data-ed-mode="performance">查看本次表现</button>' : button('补录成绩与排名', 'edit')) + '</div>' :
        '<div class="ed-chart-layout"><div>' + plot(d) + '<div class="ed-point-list">' + d.points.map(function (p) { return '<button type="button" data-ed-point="' + p.index + '" aria-pressed="false"><i style="background:' + palette[p.group].color + '">' + p.index + '</i>' + esc(p.row.name) + '</button>'; }).join('') + '</div></div><aside class="ed-inspect" aria-live="polite"></aside></div>' +
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
  function renderDetail(exam) {
    var v = view, m = model(exam), content = document.getElementById('content');
    generation++; v.loading = false;
    if (!v.scope) v.scope = m.included.filter(function (r) { return r.year.percent !== null; }).length < 2 && m.included.filter(function (r) { return r.class.percent !== null; }).length >= 2 ? 'class' : 'year';
    content.innerHTML = '<div class="ed-page">' + header(exam) + (v.report ? '<div class="ed-reader"></div>' : overview(exam, m) + scores(exam, m) + '<section class="ed-section" id="ed-quadrants" tabindex="-1"></section>' + (paperReviewAvailable() ? '<section class="ed-section" id="ed-papers" tabindex="-1"><div class="ed-section-head"><div><span class="ed-eyebrow">03 / 试题与作答</span><h2>这次考试的试卷</h2><p>按科目查看已录入的题目、作答、批改分与原始扫描件。查看已有内容不计分析次数。</p></div></div><div class="ed-paper-content"></div></section>' : '')) + '</div>';
    content.querySelector('.ed-page').onclick = function (e) {
      var b = e.target.closest('[data-ed]'); if (!b) return;
      var action = b.dataset.ed;
      if (action === 'back') {
        if (!leave()) return;
        track('exam_detail_closed', { reason: 'back' });
        var scroll = v.scroll; view = null; render(); window.scrollTo(0, scroll);
        var original = Array.from(document.querySelectorAll('[data-exam-detail]')).find(function (b) { return b.dataset.examDetail === exam.id; }); if (original) original.focus({ preventScroll: true });
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
    } else { bindQuadrants(exam, m); if (v.papers) drawPapers(v); else loadPapers(v, false); }
  }
  function open(id) {
    var exam = allExams().find(function (e) { return e.id === id; }); if (!exam || !leave()) return;
    view = { id: id, user: owner(), token: state.token, scroll: window.scrollY || 0, papers: null, offset: 0, more: false, loading: false, subject: '', chartMode: 'movement', trendWindow: 'previous', sameCategory: false };
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
  document.head.appendChild(style);
})();
