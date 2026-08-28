/*! app-bundle.js · 自动生成,勿手改 —— 改源码后运行: node design/build-bundles.js
   来源顺序: compat.js, request-budget-v24.js, telemetry-feedback.js, feedback-statuses.js, app-v3.js, app-v4.js, app-v5.js, app-v6.js, app-v7.js, app-v8.js, app-v9.js, app-v10.js, app-v11.js, feedback-unread-dot.js, app-v12.js, app-v13.js, app-v14.js, app-v15.js, app-v16.js, app-v17.js, app-v18.js, app-v19.js, app-v20.js, app-v21.js, app-v22.js, app-v23.js, app-v24.js, app-v25.js, app-v26.js, app-v27.js, app-v28.js, app-v29.js, app-v30.js, app-v31.js, app-v32.js, app-v33.js, app-v34.js */
/* ===== compat.js ===== */
// Compatibility helpers for older iOS Safari/WebViews.
// Keep this file tiny and load it before the application scripts.
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
  var API='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
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
    if(!target.startsWith(API)||!init||!init.body)return nativeFetch(input,init);
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
  const API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
  const APP_VERSION = (document.querySelector('meta[name="application-version"]') || {}).content || 'unknown';
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
    isPwa: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true, appVersion: APP_VERSION,
  });
  async function call(action, payload = {}) {
    const r = await nativeFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: localStorage.getItem('st_token') || '', ...payload }) });
    const j = await r.json().catch(() => ({ error: '网络响应异常' }));
    if (!r.ok) throw new Error(j.error || '请求失败');
    return j;
  }
  function track(eventType, metadata = {}, overridePage) {
    const c = context(); if (overridePage) c.appPage = overridePage;
    return nativeFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ action: 'track_event', token: localStorage.getItem('st_token') || '', eventType, context: c, metadata }) }).catch(() => undefined);
  }

  window.fetch = async (...args) => {
    let action = '', body = null;
    try {
      const target = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (target.startsWith(API) && args[1]?.body) { body = JSON.parse(String(args[1].body)); action = body?.action || ''; }
    } catch {}
    let response;
    try {
      response = await nativeFetch(...args);
    } catch (err) {
      // 网络层失败（断网/被插件拦截/DNS 等）此前完全不可观测：这里上报后原样抛出
      if (action && action !== 'track_event' && !String(action).startsWith('feedback_')) {
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
    const b = document.createElement('button'); b.id = 'stFeedbackBtn'; b.className = 'st-fb-btn'; b.innerHTML = '建议反馈 <b>0</b>'; b.onclick = openFeedback; document.body.appendChild(b);
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
  async function openFeedback() {
    track('feedback_opened');
    const back = modalBase('建议与反馈'), body = $('.st-fb-body', back);
    body.innerHTML = `<div class="st-fb-tabs"><button class="active" data-tab="new">提交反馈</button><button data-tab="history">我的反馈</button></div><div id="stFbPane"></div>`;
    const showNew = () => { $$('.st-fb-tabs button', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'new')); $('#stFbPane', back).innerHTML = `<div class="st-fb-field"><label>类型</label><select id="stFbType"><option value="suggestion">功能建议</option><option value="bug">问题 / Bug</option><option value="experience">体验反馈</option><option value="other">其他</option></select></div><div class="st-fb-field"><label>内容</label><textarea id="stFbContent" maxlength="5000" placeholder="请尽量描述发生了什么、你希望怎样改进…"></textarea></div><div class="st-fb-field st-fb-files"><label>截图（可选，最多 3 张，每张 ≤ 5MB）</label><input id="stFbFiles" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></div><div class="st-fb-note">会自动附带版本、页面、设备、访问来源、使用深度和成绩记录统计，方便定位问题；不会上传你的密码。</div><div class="st-fb-actions" style="margin-top:16px"><button class="st-fb-primary" id="stFbSubmit">提交</button></div>`; $('#stFbSubmit', back).onclick = submitFeedback; };
    const showHistory = async () => { $$('.st-fb-tabs button', back).forEach(x => x.classList.toggle('active', x.dataset.tab === 'history')); const pane = $('#stFbPane', back); pane.innerHTML = '<div class="st-fb-empty">读取中…</div>'; try { const d = await call('feedback_list', { guestAccessToken }); pane.innerHTML = (d.feedback || []).length ? `<div class="st-fb-list">${d.feedback.map(x => `<div class="st-fb-item" data-feedback-id="${x.id}"><div class="st-fb-meta"><span>${new Date(x.created_at).toLocaleString('zh-CN')} · <span class="st-fb-pill">${statusText[x.status] || x.status}</span></span>${x.unread ? `<span class="st-fb-unread">${x.unread} 条新回复</span>` : ''}</div><div class="st-fb-content">${escapeHtml(x.content)}</div></div>`).join('')}</div>` : '<div class="st-fb-empty">还没有提交过反馈</div>'; $$('[data-feedback-id]', pane).forEach(x => x.onclick = () => openThread(x.dataset.feedbackId, back)); } catch (e) { pane.innerHTML = `<div class="st-fb-empty">${escapeHtml(e.message)}</div>`; } };
    $$('[data-tab]', back).forEach(x => x.onclick = () => x.dataset.tab === 'new' ? showNew() : showHistory()); showNew();
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
const API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
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
    throw new Error(data.error || '请求失败');
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
    <nav class="bottom-nav">${bottomButton('home', '⌂', '概览')}${bottomButton('records', '▤', '记录')}${bottomButton('account', '○', '账号')}</nav>`;
  renderPage();
  bindNav();
  if (state.onboarding) showOnboarding();
}
function navButton(p, label) {
  return `<button class="nav-btn ${state.page === p ? 'active' : ''}" data-page="${p}">${label}</button>`;
}
function bottomButton(p, icon, label) {
  return `<button class="${state.page === p ? 'active' : ''}" data-page="${p}"><span>${icon}</span><span>${label}</span></button>`;
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
    name: e.name,
    date: e.exam_date,
    actual: state.subject === '总分' ? totalFor(e, 'actual') : examScore(e, state.subject, 'actual'),
    target: state.subject === '总分' ? totalFor(e, 'target') : examScore(e, state.subject, 'target')
  }));
  const vals = points.flatMap((p) => [p.actual, p.target]).filter((v) => v !== null);
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
  const line = (key, color, dash = '') => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((p, i) => {
      const v = p[key];
      if (v === null) {
        started = false;
        return;
      }
      const xx = x(i), yy = y(v);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="${color}" stroke-width="3" data-tip="${escapeHtml(p.name)} · ${key === 'actual' ? '真实' : '目标'} ${formatScore(v)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${circles}`;
  };
  const labels = points.map((p, i) => `<text x="${x(i)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(p.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${/* 线序与图例一致:真实(蓝)在前,目标(绿虚线)在后——v29 图例换色按位置配对,顺序相反会把颜色套到错误的线上 */
  line('actual', '#5d72e8')}${line('target', '#32a77a', '7 7')}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
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
    state.radarSelection = [];
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
  btn.disabled = true;
  btn.textContent = '登录中…';
  try {
    const data = await api('login', { username: $('#loginUser').value.trim(), password: $('#loginPass').value });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_known_user', '1');
    await loadExams();
    state.page = 'home';
    render();
  } catch (e) {
    // v2 自定义密码登录回退：旧密码体系查不到时，尝试 data-api 的 v2 口令
    try {
      const v2res = await fetch('https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-data-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login_v2', username: $('#loginUser').value.trim(), password: $('#loginPass').value })
      });
      const v2 = await v2res.json().catch(() => null);
      if (v2res.ok && v2 && v2.token) {
        state.token = v2.token;
        state.user = v2.user;
        localStorage.setItem('st_token', v2.token);
        localStorage.setItem('st_known_user', '1');
        await loadExams();
        state.page = 'home';
        render();
        return;
      }
    } catch (_) {}
    toast(e.message);
    btn.disabled = false;
    btn.textContent = '登录';
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
const DATA_API_V7 = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-data-api';
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
    throw new Error(data.error || '请求失败');
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
    .final-box-v14{background:#f4fbf8;border:1px solid #dbeee6;border-radius:12px;padding:8px}
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
  const card=row=>`<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v14" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>赋分 / 最终分</label><div class="score-with-max-v14"><input class="actual-v14" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v14" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v14" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v14" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>名次</label><input class="rank-v14" inputmode="numeric" value="${row.rank??''}" placeholder="可留空"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v14" inputmode="numeric" value="${row.participants??''}" placeholder="留空=总人数"></div></div></div>`;
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

var PASSWORD_API_V15='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-data-api';

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
  function card(row){return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v16" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>赋分 / 最终分</label><div class="score-with-max-v14"><input class="actual-v16" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v16" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v16" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v16" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="subject-ranks-v16"><div class="subject-rank-row-v16"><span>年排</span><input class="year-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.rank??''}" placeholder="名次"><input class="year-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.participants??''}" placeholder="年级人数"></div><div class="subject-rank-row-v16"><span>班排</span><input class="class-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classRank??''}" placeholder="名次"><input class="class-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classParticipants??''}" placeholder="班级人数"></div></div></div>`;}
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
  $$('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){state.rankScopeV16=button.dataset.radarScopeV16;if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';state.radarSelection=[];ensureRadarSelection();render();};});
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

recordsHtml=function recordsHtmlV17(){var exams=state.allExams||[],hidden=exams.filter(function(e){return e.is_hidden;}).length,order=categoryOptionsV14();function recentFirst(a,b){var d=String(b.exam_date||'').localeCompare(String(a.exam_date||''));if(d)return d;return String(b.created_at||'').localeCompare(String(a.created_at||''));}var groups=[...order.map(function(v){return{name:v,exams:exams.filter(function(e){return e.grade_level===v;}).sort(recentFirst)};}),{name:'未分类',exams:exams.filter(function(e){return !e.grade_level;}).sort(recentFirst)}].filter(function(g){return g.exams.length;});return `<div class="page-head"><div><h2>考试记录</h2><p>按${escapeHtml(categoryLabelV14())}分组，每组按考试时间从近到远。${hidden?` ${hidden} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map(function(g){return `<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} 次</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`;}).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;};

var bindPageBeforeV17=bindPage;
bindPage=function bindPageV17(){bindPageBeforeV17();document.querySelectorAll('[data-trend-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.trendScopeV16;if(scope==='score'){state.trendMetric='score';}else{state.rankScopeV16=scope;if(hasDirectPercentV17(scope)&&!hasRawRankV17(scope))state.trendMetric='rank';else if(state.trendMetric!=='rank_raw'&&state.trendMetric!=='rank')state.trendMetric='rank_raw';}render();};});document.querySelectorAll('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.radarScopeV16;state.rankScopeV16=scope;if(hasDirectPercentV17(scope)&&!hasRawRankV17(scope))state.radarMode='rank';else if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';state.radarSelection=[];ensureRadarSelection();render();};});};
/* ===== app-v18.js ===== */
// v18 / product v1.1: score modules, subtle Study Planner cross-link, optional ranking stays optional.
state.modulesV18 = state.modulesV18 || [];

var MODULE_API_V18='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-modules-api';
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
  fetch('https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({action:'track_event',token:state.token||'',eventType:'study_planner_opened',context:context,metadata:{source:'home_tool_card',destination:'https://study-planner.yhwlwl.xyz/'}})}).catch(function(){});
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

var USERNAME_API_V19='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-username-api';

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
  if(!stage||stage.dataset.v19Enhanced==='1')return;
  var svg=stage.querySelector('svg');
  if(!svg)return;
  stage.dataset.v19Enhanced='1';
  stage.classList.add('trend-scroll-v19');
  connectBrokenTrendPathsV19(stage);
  var examCount=Math.max(1,(state.exams||[]).length);
  var viewport=Math.max(280,stage.clientWidth||0);
  var desired=examCount>5?Math.max(viewport,110+examCount*72):viewport;
  svg.style.width=desired+'px';
  svg.style.minWidth=desired+'px';
  if(desired>viewport+4){
    var hint=document.createElement('div');
    hint.className='trend-scroll-hint-v19';
    hint.textContent='← 左右滑动查看全部考试 →';
    stage.insertAdjacentElement('afterend',hint);
    requestAnimationFrame(function(){stage.scrollLeft=Math.max(0,stage.scrollWidth-stage.clientWidth);});
  }
}

function enhanceTrendChartsV19(){
  var candidates=[];
  document.querySelectorAll('#chart,#overviewChart,.rank-chart-stage-v7').forEach(function(stage){
    if(stage.id==='chart'&&stage.querySelector('.rank-chart-stage-v7'))return;
    if(candidates.indexOf(stage)<0)candidates.push(stage);
  });
  candidates.forEach(enhanceTrendStageV19);
}

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

function latestMetricV20(){
  var exams=sortedVisibleExamsV20();
  for(var i=exams.length-1;i>=0;i--){
    var latest=exams[i],subjects=effectiveScoreSubjectsV20(latest);
    if(!subjects.length)continue;

    if(subjects.length===1){
      var subject=subjects[0],value=examScore(latest,subject,'actual');
      var previous=null;
      for(var j=i-1;j>=0;j--){
        var pv=examScore(exams[j],subject,'actual');
        if(pv!==null){previous={exam:exams[j],value:pv};break;}
      }
      return {
        label:'最近一次'+subject+'成绩',
        value:value,
        exam:latest,
        delta:previous?value-previous.value:null,
        deltaLabel:'较上次同科'
      };
    }

    var value=totalFor(latest,'actual');
    if(value===null)continue;
    var previous=null;
    for(var j=i-1;j>=0;j--){
      var prevSubjects=effectiveScoreSubjectsV20(exams[j]);
      if(!sameSubjectSetV20(subjects,prevSubjects))continue;
      var pv=totalFor(exams[j],'actual');
      if(pv!==null){previous={exam:exams[j],value:pv};break;}
    }
    return {
      label:'最近一次真实总分',
      value:value,
      exam:latest,
      delta:previous?value-previous.value:null,
      deltaLabel:'较上次'
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
  card.innerHTML=`<div><div class="stat-label">${escapeHtml(metric.label)}</div><div class="stat-value">${formatScore(metric.value)}</div><div class="stat-sub">${escapeHtml(metric.exam.name)} · ${fmtDate(metric.exam.exam_date)}</div></div>${delta===null?'':`<span class="trend-pill">${delta>=0?'↗':'↘'} ${metric.deltaLabel} ${delta>=0?'+':''}${formatScore(delta)} 分</span>`}`;
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
      for(var i=exams.length-1;i>=0;i--){
        var exam=exams[i],override=num(exam?.total_actual_score);
        if(override===null)continue;
        var subjects=typeof effectiveScoreSubjectsV20==='function'?effectiveScoreSubjectsV20(exam):[];
        var previous=null;
        for(var j=i-1;j>=0;j--){
          var prevSubjects=typeof effectiveScoreSubjectsV20==='function'?effectiveScoreSubjectsV20(exams[j]):[];
          if(subjects.length&&typeof sameSubjectSetV20==='function'&&!sameSubjectSetV20(subjects,prevSubjects))continue;
          var pv=totalFor(exams[j],'actual');
          if(pv!==null){previous=pv;break;}
        }
        return{label:'最近一次真实总分',value:override,exam:exam,delta:previous===null?null:override-previous,deltaLabel:'较上次'};
      }
      return latestMetricBeforeV24();
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
              classParticipants:(card.querySelector('.combo-cp-v25')?.value||'').trim()
            };
          });
          if(has){
            var err=validateComboRanksV25(ranks);
            if(err)throw new Error(err);
            payload.exam.moduleRanks=ranks;
            rememberRanksV25(payload.exam.exam_date,payload.exam.name,ranks); // 本地兜底
          }
          var endInput=modal.querySelector('#examEndDateV25');
          if(endInput)payload.exam.end_date=String(endInput.value||'').trim();
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
    if(!exams.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>';
    var isTotal=state.subject==='总分';
    var points=exams.map(function(e){return{
      name:e.name,date:e.exam_date,
      actual:isTotal?totalRate(e,'actual'):scoreRate(e,state.subject,'actual'),
      target:isTotal?totalRate(e,'target'):scoreRate(e,state.subject,'target')
    };});
    var vals=[];
    points.forEach(function(p){if(p.actual!==null)vals.push(p.actual);if(p.target!==null)vals.push(p.target);});
    if(!vals.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>';
    // 动态纵轴，与主成绩图同算法（v3 chartHtml）
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
    function line(key,color,dash){
      var d='',started=false,circles='';
      points.forEach(function(p,i){
        var v=p[key];if(v===null){started=false;return;}
        var xx=x(i),yy=y(v);
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+color+'" stroke-width="3" data-tip="'+escapeHtml(p.name)+' · '+(key==='actual'?'真实':'目标')+' '+formatPercent(v)+'"/>';
      });
      return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'+circles;
    }
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-17)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+line('target','#32a77a','7 7')+line('actual','#5d72e8')+labels+'</svg><div class="tooltip-card" id="chartTip"></div>';
  }

  var chartHtmlBeforeV25=(typeof chartHtml==='function')?chartHtml:null;
  chartHtml=function chartHtmlV25(){
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      return percentTrendSingleV25();
    }
    return chartHtmlBeforeV25?chartHtmlBeforeV25():'';
  };

  // ---------- D) home page: view row, two-row chips, toolbar buttons ----------
  var homeHtmlBeforeV25=homeHtml;
  homeHtml=function homeHtmlV25(){
    var html=homeHtmlBeforeV25();
    // 1) 英雄区问候语：Hi，用户名！
    html=html.replace(/<span class="eyebrow">[^<]*<\/span>/,'<span class="eyebrow">Hi，'+escapeHtml((state.user&&state.user.username)||'')+'！</span>');
    // 查看：分数/百分比，与「趋势类型」同级（插入趋势类型行内末尾；仅成绩+最终分模式）
    if(state.trendMetric==='score'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      var viewBtns='<span class="label">查看</span><button class="basis-btn-v13 '+(state.scoreViewV25==='score'?'active':'')+'" data-score-view-v25="score">分数</button><button class="basis-btn-v13 '+(state.scoreViewV25==='percent'?'active':'')+'" data-score-view-v25="percent">百分比</button>';
      html=html.replace(/(<div class="trend-metric-toggle-v7[^"]*">)([\s\S]*?)(<\/div>)/,'$1$2'+viewBtns+'$3');
    }
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      html=html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>','<p class="card-sub">按得分率（百分比）查看真实与目标走势，不同满分的项目也能直接比较</p>');
    }
    // 3) chips 重排：组合行（组合：总览 总分 组合分）+ 科目行（科目：语文 数学 …）
    var combos=(state.modulesV18||[]).filter(function(m){return m&&m.name&&(m.subjects||[]).length>0;});
    var chip=function(s){var active=state.subject===s;return '<button class="chip '+(active?'active':'')+'" data-subject="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>';};
    var comboRow=(combos.length?'<span class="label">组合：</span>':'')+chip('总览')+chip('总分')+combos.map(function(c){return chip(c.name);}).join('');
    var subjectRow='<span class="label">科目：</span>'+(SUBJECTS||[]).map(function(s){return chip(s);}).join('');
    html=html.replace(/<div class="chips">([\s\S]*?)<\/div>/,function(m,inner){
      return '<div class="combo-chips-v25">'+comboRow+'</div><div class="combo-chips-v25">'+subjectRow+'</div>';
    });
    // 侧栏「这一年的记录」：只留最有信息量的指标（次数/最高分/平均分/最近目标；删「次已出分」和与 Hero 重复的「最近变化」）
    var qs=quickStatsV25();
    var quickGrid='<div class="quick-grid">'
      +'<div class="mini-stat"><b>'+qs.count+'</b><span>次考试</span></div>'
      +'<div class="mini-stat"><b>'+(qs.avg===null?'—':formatPercent(qs.avg))+'</b><span>平均得分率</span></div>'
      +'<div class="mini-stat"><b>'+(qs.targetExams?(qs.met+'/'+qs.targetExams):'—')+'</b><span>次达成目标</span></div>'
      +'<div class="mini-stat"><b>'+(qs.gap===null?'—':(qs.gap<=0?'✓':formatScore(Math.abs(qs.gap))))+'</b><span>'+(qs.gap===null?'最近目标':(qs.gap<=0?'已达成目标':'分 · 距目标'))+'</span></div>'
      +'</div>';
    html=html.replace(/<div class="quick-grid">[\s\S]*?<\/div><\/div>/,quickGrid);
    // 完整趋势 / 保存图片
    html=html.replace(/<div class="chart-wrap[^"]*" id="chart">/,
      '<div class="trend-actions-v25"><button type="button" id="trendFullV25">⛶ 完整趋势</button><button type="button" id="trendSaveV25">⭳ 保存图片</button></div><div class="chart-wrap" id="chart">');
    // C1) 精简文案
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
    if(typeof chartHtml!=='function')return null;
    var html=chartHtml();
    var m=html.match(/<svg[\s\S]*?<\/svg>/);
    return m?m[0]:null;
  }
  function downloadSvgAsPngV25(svgText,filename){
    try{
      var finalSvg=finalizeExportSvgV25(svgText);
      if(!finalSvg)return toast('当前图表无法导出');
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
            toast('图片已保存');
          }
          if(typeof canvas.toBlob==='function'){
            canvas.toBlob(function(png){
              if(png){var u2=URL.createObjectURL(png);finish(u2,true);}
              else finish(canvas.toDataURL('image/png'),false);
            },'image/png');
          }else finish(canvas.toDataURL('image/png'),false);
        }catch(e2){toast('导出失败');}
        try{URL.revokeObjectURL(url);}catch(e3){}
      };
      img.onerror=function(){
        try{URL.revokeObjectURL(url);}catch(e4){}
        // 兜底：换 data: URL 再试一次
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
            toast('图片已保存');
          };
          img2.onerror=function(){toast('图片渲染失败，请稍后再试');};
          img2.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(finalSvg);
        }catch(e5){toast('图片渲染失败，请稍后再试');}
      };
      img.src=url;
    }catch(e){toast('导出失败');}
  }
  function trendFileNameV25(label){return '成绩趋势-'+label+'-'+new Date().toISOString().slice(0,10)+'.png';}

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

  function fullTrendSvgV25(){
    var exams=state.exams||[];
    var subject=state.subject||'总分';
    var metric=state.trendMetric||'score';
    var basis=state.scoreBasis||'final';
    var scope=state.rankScopeV16||'year';
    var n=Math.max(1,exams.length);
    var W=Math.max(760,150+n*78),H=340,L=58,R=24,T=20,B=54;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return n===1?L+cw/2:L+(i/(n-1))*cw;};
    var colors=(typeof rankSeriesColorsV7==='function')?rankSeriesColorsV7():['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
    var isPercent=metric==='rank',isRawRank=metric==='rank_raw';
    var scorePercent=!isRawRank&&!isPercent&&basis!=='raw'&&subject!=='总览'&&state.scoreViewV25==='percent';
    var series;
    if(isRawRank||isPercent){
      var rankSubjects=subject==='总览'?['总分'].concat(SUBJECTS):[subject];
      series=rankSubjects.map(function(s,i){
        return{label:s,color:colors[i%colors.length],value:function(e){return isRawRank?rawRankValueV11(e,s):rankInfoV7(e,s).performance;}};
      });
    }else if(basis==='raw'){
      if(subject==='总览'){
        series=['总分'].concat(SUBJECTS).map(function(s,i){return{label:s,color:colors[i%colors.length],value:function(e){return rawScoreRateV13(e,s);}};});
      }else{
        series=[{label:subject==='总分'?'原始总分':subject,color:'#d38429',value:function(e){return subject==='总分'?totalRawForV13(e):examRawScoreV13(e,subject);}}];
      }
    }else if(scorePercent){
      series=[
        {label:'真实',color:'#5d72e8',value:function(e){return subject==='总分'?totalRate(e,'actual'):scoreRate(e,subject,'actual');}},
        {label:'目标',color:'#32a77a',dash:'7 7',value:function(e){return subject==='总分'?totalRate(e,'target'):scoreRate(e,subject,'target');}}
      ];
    }else{
      if(subject==='总览'){
        series=['总分'].concat(SUBJECTS).map(function(s,i){return{label:s,color:colors[i%colors.length],value:function(e){return scoreRate(e,s,'actual');}};});
      }else{
        series=[
          {label:'真实',color:'#5d72e8',dash:'',value:function(e){return subject==='总分'?totalFor(e,'actual'):examScore(e,subject,'actual');}},
          {label:'目标',color:'#32a77a',dash:'7 7',value:function(e){return subject==='总分'?totalFor(e,'target'):examScore(e,subject,'target');}}
        ];
      }
    }
    var visible=series.filter(function(s){return exams.some(function(e){return s.value(e)!==null;});});
    if(!visible.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>当前还没有可用于完整趋势的数据</div></div>';
    var points=exams.map(function(e){return{exam:e,values:visible.map(function(s){return s.value(e);})};});
    var flat=[];
    points.forEach(function(p){p.values.forEach(function(v){if(v!==null)flat.push(v);});});
    var axisKind = scorePercent?'scoreFinal':(subject==='总览'
      ? (isRawRank?'rankRaw':(isPercent?'rankPercent':'rate'))
      : (isRawRank?'rankRaw':(isPercent?'rankPercent':(basis==='raw'?'scoreRaw':'scoreFinal'))));
    var axis=fullTrendAxisV25(flat,axisKind);
    var isRate = axisKind==='rate';
    var grid='';
    for(var g=0;g<=axis.ticks;g++){
      var value=axis.max-(axis.max-axis.min)*g/axis.ticks;
      if(isRawRank)value=axis.min+(axis.max-axis.min)*g/axis.ticks;
      var yy=T+ch*g/axis.ticks;
      var lbl=isRawRank?('第'+Math.max(1,Math.round(value))):(isPercent||isRate||scorePercent?Math.round(value)+'%':Math.round(value));
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
        if(isRawRank)tip='第'+v+'名';
        else if(isPercent)tip=scopeLabelV25()+'百分位 '+formatPercent(v);
        else tip=formatScore(v);
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+item.color+'" stroke-width="3" data-tip="'+escapeHtml(points[pi].exam.name)+' · '+escapeHtml(item.label)+' '+tip+'"/>';
      }
      return '<path d="'+d+'" fill="none" stroke="'+item.color+'" stroke-width="'+(sidx===0&&subject==='总览'?'3.2':'2.8')+'" stroke-linecap="round" stroke-linejoin="round"'+(item.dash?' stroke-dasharray="'+item.dash+'"':'')+'/>'+circles;
    }).join('');
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-18)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.exam.exam_date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+lines+labels+'</svg>';
  }

  function openFullTrendV25(){
    var exams=state.exams||[];
    if(!exams.length)return toast('还没有考试记录');
    var subject=state.subject||'总分';
    var svgText=fullTrendSvgV25();
    var modal=document.createElement('div');
    modal.className='modal-backdrop full-trend-modal-v25';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>完整趋势 · '+escapeHtml(subject)+'</h3><button class="close-btn" type="button">×</button></div><div class="modal-body"><div class="full-trend-stage-v25" id="ftStageV25">'+svgText+'</div><div class="full-trend-scroll-hint-v25">全部考试都会显示在这里；图表较长时左右滑动查看。保存到手机的图片为完整宽度。</div><div class="full-trend-actions-v25"><button class="secondary" id="ftCloseV25" type="button">关闭</button><button class="primary" id="ftSaveV25" type="button">⭳ 保存图片</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('#ftCloseV25').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelector('#ftSaveV25').onclick=function(){
      var m=String(svgText||'').match(/<svg[\s\S]*?<\/svg>/);
      if(!m)return toast('图形还没准备好');
      downloadSvgAsPngV25(m[0],trendFileNameV25(subject));
    };
  }

  // ---------- F2) 雷达图考试选择器：选择最近考试 → 分类勾选弹窗 → 只显示所选 ----------
  // 不再自动预选最近考试：初始为「选择最近考试」按钮，用户勾选后才显示所选
  var ensureRadarBeforeV25=(typeof ensureRadarSelection==='function')?ensureRadarSelection:null;
  if(ensureRadarBeforeV25){
    ensureRadarSelection=function ensureRadarSelectionV25(){
      var ids=state.radarSelection||[];
      var availableIds=new Set((typeof radarAvailableExams==='function'?radarAvailableExams():[]).map(function(e){return e.id;}));
      state.radarSelection=ids.filter(function(id){return availableIds.has(id);}).slice(0,4);
    };
  }
  var radarCardHtmlBeforeV25=(typeof radarCardHtml==='function')?radarCardHtml:null;
  if(radarCardHtmlBeforeV25){
    radarCardHtml=function radarCardHtmlV25(){
      var html=radarCardHtmlBeforeV25();
      var available=typeof radarAvailableExams==='function'?radarAvailableExams():[];
      var selected=state.radarSelection||[];
      var picker;
      if(!available.length){
        picker='<div class="multi-select" style="margin-top:8px"><span class="subtle-note">当前还没有可用于雷达图的数据</span></div>';
      }else if(selected.length){
        picker='<div class="radar-picked-v25">'+selected.map(function(id){
          var e=(state.exams||[]).find(function(x){return x.id===id;});
          return e?'<span class="radar-pick-chip-v25" data-radar-unpick="'+escapeHtml(id)+'">'+escapeHtml(e.name)+' · '+fmtDate(e.exam_date)+' ✕</span>':'';
        }).join('')+'</div>';
      }else{
        picker='<div class="radar-pick-v25"><button class="secondary" id="radarPickV25" type="button">选择最近考试</button></div>';
      }
      html=html.replace(/<div class="multi-select"[^>]*>[\s\S]*?<\/div>/,picker);
      return html;
    };
  }
  function openRadarPickerV25(){
    var available=typeof radarAvailableExams==='function'?radarAvailableExams():[];
    if(!available.length)return toast('暂无可用考试');
    var cats=typeof categoryOptionsV14==='function'?categoryOptionsV14():[];
    var groups=[].concat(
      cats.map(function(c){return{name:c,list:available.filter(function(e){return e.grade_level===c;})};}),
      [{name:'未分类',list:available.filter(function(e){return !e.grade_level;})}]
    ).filter(function(g){return g.list.length;});
    groups.forEach(function(g){g.list.sort(function(a,b){return String(a.exam_date||'').localeCompare(String(b.exam_date||''));});});
    var picked=new Set((state.radarSelection||[]).map(String));
    var modal=document.createElement('div');
    modal.className='modal-backdrop';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>选择考试（最多 4 次）</h3><button class="close-btn" type="button">×</button></div><div class="modal-body">'
      +groups.map(function(g){
        return '<div class="radar-pick-group-v25"><h4>'+escapeHtml(g.name)+'</h4>'
          +g.list.map(function(e){
            return '<label class="radar-pick-option-v25"><input type="checkbox" value="'+escapeHtml(e.id)+'"'+(picked.has(String(e.id))?' checked':'')+'> '+escapeHtml(e.name)+' · '+fmtDate(e.exam_date)+'</label>';
          }).join('')
          +'</div>';
      }).join('')
      +'<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary" id="radarPickOkV25">确定</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('.cancel-btn').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelectorAll('input[type="checkbox"]').forEach(function(b){
      b.addEventListener('change',function(){
        if(modal.querySelectorAll('input[type="checkbox"]:checked').length>4){toast('最多选择 4 次考试');b.checked=false;}
      });
    });
    modal.querySelector('#radarPickOkV25').onclick=function(){
      state.radarSelection=[].slice.call(modal.querySelectorAll('input[type="checkbox"]:checked')).map(function(b){return b.value;});
      if(state.radarSelection.length&&typeof ensureRadarSelection==='function')ensureRadarSelection();
      close();render();
    };
  }

  // ---------- G) tooltip: fixed viewport positioning, never overflows the card ----------
  var tipPointV25=null;
  function hideChartTipsV25(){
    document.querySelectorAll('#chart .tooltip-card,#overviewChart .tooltip-card,.rank-chart-stage-v7 .tooltip-card').forEach(function(t){
      if(t.style.display!=='none')t.style.display='none';
    });
  }
  function positionChartTooltipV25(point){
    if(!point)return;
    var stage=point.closest&&point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!stage)return;
    var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
    if(!tip||tip.style.display==='none')return;
    if(!tip.textContent&&point.dataset&&point.dataset.tip)tip.textContent=point.dataset.tip;
    var pr=point.getBoundingClientRect();
    var wv=window.innerWidth,hv=window.innerHeight;
    tip.style.position='fixed';
    tip.style.transform='none';
    var w=Math.min(tip.offsetWidth||240,300,wv-16),h=tip.offsetHeight||40;
    if(w<40)w=40;
    var x=Math.round(pr.left+pr.width/2-w/2);
    x=Math.max(8,Math.min(wv-8-w,x));
    var y=Math.round(pr.top-12-h);
    if(y<8)y=Math.round(pr.bottom+12);
    y=Math.max(8,Math.min(hv-8-h,y));
    tip.style.left=x+'px';tip.style.top=y+'px';
    tipPointV25=point;
  }
  if(typeof clampTrendTooltipV19==='function'){
    clampTrendTooltipV19=function clampTrendTooltipV25(point){positionChartTooltipV25(point);};
  }
  // 统一接管：任何一个折线图数据点，点击/悬停都显示详情（并限制在屏幕内）
  function handleTipPointerV25(event){
    var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
    if(!point)return;
    var stage=point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!stage)return;
    var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
    if(!tip)return;
    tip.textContent=point.dataset.tip||'';
    tip.style.display='block';
    positionChartTooltipV25(point);
  }
  document.addEventListener('pointerover',handleTipPointerV25,false);
  document.addEventListener('click',handleTipPointerV25,false);
  document.addEventListener('pointerover',function(e){
    var inChart=e.target&&e.target.closest&&e.target.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!inChart)hideChartTipsV25();
  },false);
  window.addEventListener('scroll',function(){if(tipPointV25)setTimeout(function(){positionChartTooltipV25(tipPointV25);},0);},true);
  window.addEventListener('resize',function(){if(tipPointV25)setTimeout(function(){positionChartTooltipV25(tipPointV25);},0);});

  // ---------- H) records / group ordering (local persistence, up/down buttons) ----------
  function orderKeyV25(){return 'st_order_v25_'+(state.user&&state.user.username||'anon');}
  function orderDataV25(){
    var raw=localStorage.getItem(orderKeyV25())||'';
    var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    if(!d||typeof d!=='object')d={groups:[],exams:{}};
    if(!Array.isArray(d.groups))d.groups=[];
    if(!d.exams||typeof d.exams!=='object')d.exams={};
    return d;
  }
  function saveOrderV25(d){localStorage.setItem(orderKeyV25(),JSON.stringify(d));}
  function sectionTitleV25(section){return String((section.querySelector('.grade-section-head-v13 h3')||{}).textContent||'').trim();}
  function recordIdV25(record){var el=record.querySelector('[data-edit]');return el?String(el.dataset.edit):'';}

  function applyStoredOrderV25(){
    if(state.page!=='records')return;
    var d=orderDataV25();
    var sections=[].slice.call(document.querySelectorAll('.grade-section-v13'));
    if(!sections.length)return;
    // 组顺序
    if(d.groups.length){
      var byTitle={};sections.forEach(function(s){byTitle[sectionTitleV25(s)]=s;});
      var ordered=d.groups.map(function(t){return byTitle[t];}).filter(Boolean);
      var rest=sections.filter(function(s){return d.groups.indexOf(sectionTitleV25(s))===-1;});
      var parent=sections[0].parentNode;
      ordered.concat(rest).forEach(function(s){if(s.parentNode===parent)parent.appendChild(s);});
    }
    // 组内考试顺序
    [].slice.call(document.querySelectorAll('.grade-section-v13')).forEach(function(section){
      var card=section.querySelector('.records-card');
      if(!card)return;
      var records=[].slice.call(card.querySelectorAll('.record'));
      var ord=d.exams&&d.exams[sectionTitleV25(section)];
      if(ord&&ord.length){
        var byId={};records.forEach(function(r){byId[recordIdV25(r)]=r;});
        var ordered=ord.map(function(id){return byId[id];}).filter(Boolean);
        var restR=records.filter(function(r){return ord.indexOf(recordIdV25(r))===-1;});
        ordered.concat(restR).forEach(function(r){card.appendChild(r);});
      }
    });
  }

  function addOrderButtonsV25(){
    if(state.page!=='records')return;
    // 组头 ↑↓
    [].slice.call(document.querySelectorAll('.grade-section-head-v13')).forEach(function(head){
      if(head.querySelector('.order-grp-btn-v25'))return;
      var up=document.createElement('button');
      up.type='button';up.className='order-btn-v25 order-grp-btn-v25';up.title='上移分组';up.textContent='↑';up.dataset.grpUp='1';
      var down=document.createElement('button');
      down.type='button';down.className='order-btn-v25 order-grp-btn-v25';down.title='下移分组';down.textContent='↓';down.dataset.grpDown='1';
      head.appendChild(up);head.appendChild(down);
    });
    // 记录 ↑↓
    [].slice.call(document.querySelectorAll('.record-actions, .record-actions-v10')).forEach(function(actions){
      var record=actions.closest('.record');
      var id=recordIdV25(record);
      if(!record||!id||actions.querySelector('.order-rcd-btn-v25'))return;
      var up=document.createElement('button');
      up.type='button';up.className='order-btn-v25 order-rcd-btn-v25';up.title='上移';up.textContent='↑';up.dataset.id=id;up.dataset.rcdUp='1';
      var down=document.createElement('button');
      down.type='button';down.className='order-btn-v25 order-rcd-btn-v25';down.title='下移';down.textContent='↓';down.dataset.id=id;down.dataset.rcdDown='1';
      actions.appendChild(up);actions.appendChild(down);
    });
  }

  function moveRecordV25(id,dir){
    var d=orderDataV25();
    var section=[].slice.call(document.querySelectorAll('.grade-section-v13')).find(function(s){return s.querySelector('[data-edit="'+id+'"]');});
    if(!section)return;
    var g=sectionTitleV25(section);
    var card=section.querySelector('.records-card');if(!card)return;
    var records=[].slice.call(card.querySelectorAll('.record'));
    var curIds=records.map(recordIdV25);
    var ord=d.exams[g]=(d.exams[g]||[]).slice();
    curIds.forEach(function(x){if(x&&ord.indexOf(x)===-1)ord.push(x);});
    var a=ord.indexOf(id);if(a===-1)return;
    var b=a+dir;
    if(b<0||b>=ord.length)return toast(dir<0?'已经在最上面了':'已经在最下面了');
    var tmp=ord[a];ord[a]=ord[b];ord[b]=tmp;
    d.exams[g]=ord;
    saveOrderV25(d);
    applyStoredOrderV25();
  }

  function moveGroupV25(name,dir){
    var d=orderDataV25();
    var sections=[].slice.call(document.querySelectorAll('.grade-section-v13'));
    var titles=sections.map(sectionTitleV25);
    var a=titles.indexOf(name);
    if(a===-1)return;
    var b=a+dir;
    if(b<0||b>=titles.length)return toast(dir<0?'这组已经在最上面了':'这组已经在最下面了');
    if(!d.groups.length)d.groups=titles.slice();
    var ga=d.groups.indexOf(name);
    var gb=ga+dir;
    if(ga===-1){d.groups=titles.slice();ga=titles.indexOf(name);gb=ga+dir;}
    if(gb<0||gb>=d.groups.length)return;
    var tmp=d.groups[ga];d.groups[ga]=d.groups[gb];d.groups[gb]=tmp;
    saveOrderV25(d);
    applyStoredOrderV25();
  }

  if(!document._v25OrderWired){
    document._v25OrderWired=true;
    document.addEventListener('click',function(e){
      var up=e.target.closest&&e.target.closest('[data-rcd-up]');
      var down=e.target.closest&&e.target.closest('[data-rcd-down]');
      if(up)return moveRecordV25(up.dataset.id,-1);
      if(down)return moveRecordV25(down.dataset.id,1);
      var gup=e.target.closest&&e.target.closest('[data-grp-up]');
      var gdn=e.target.closest&&e.target.closest('[data-grp-down]');
      if(gup){var s1=gup.closest('.grade-section-v13');if(s1)moveGroupV25(sectionTitleV25(s1),-1);return;}
      if(gdn){var s2=gdn.closest('.grade-section-v13');if(s2)moveGroupV25(sectionTitleV25(s2),1);return;}
    },false);
  }

  // ---------- I) password rule: 6-20 chars, letters/digits/symbols; login input fits ----------
  var renderLoginBeforeV25=(typeof renderLogin==='function')?renderLogin:null;
  if(renderLoginBeforeV25){
    renderLogin=function renderLoginV25(error){
      renderLoginBeforeV25(error);
      var p=document.getElementById('loginPass');
      if(p){p.removeAttribute('inputmode');p.removeAttribute('pattern');p.placeholder='密码';}
      var help=document.querySelector('.auth-help');
      if(help)help.textContent='密码 6～20 位，可使用大小写字母、数字和符号；新注册账号会生成初始密码，登录后可在账号页修改。';
    };
  }

  // ---------- I2) 记录页/账号页：精简文案 + 时间段展示 ----------
  var recordHtmlBeforeV25=(typeof recordHtml==='function')?recordHtml:null;
  if(recordHtmlBeforeV25){
    recordHtml=function recordHtmlV25(exam){
      var html=recordHtmlBeforeV25(exam);
      if(exam&&exam.end_date){
        html=html.replace(/(<div class="record-date">)[^<]*(<b[^>]*>)/,function(m,a,b){
          return a+fmtYearDate(exam.exam_date)+' - '+fmtYearDate(exam.end_date)+b;
        });
      }
      return html;
    };
  }
  var recordsHtmlBeforeV25=(typeof recordsHtml==='function')?recordsHtml:null;
  if(recordsHtmlBeforeV25){
    recordsHtml=function recordsHtmlV25(){return stripVerboseV25(recordsHtmlBeforeV25());};
  }
  var accountHtmlBeforeV25=(typeof accountHtml==='function')?accountHtml:null;
  if(accountHtmlBeforeV25){
    accountHtml=function accountHtmlV25(){
      var html=accountHtmlBeforeV25();
      // 修改密码：源头去掉纯数字限制（inputmode/pattern），支持字母数字符号
      html=html.replace(/<input id="newPasswordV15"[^>]*>/,
        '<input id="newPasswordV15" type="password" autocomplete="new-password" placeholder="6～20位，可含字母数字符号">');
      html=html.replace(/<input id="confirmPasswordV15"[^>]*>/,
        '<input id="confirmPasswordV15" type="password" autocomplete="new-password" placeholder="再次输入新密码">');
      return stripVerboseV25(html);
    };
  }

  // ---------- J) bind page ----------
  function moveLegendBelowChartV25(){
    var wrap=document.getElementById('chart');
    if(!wrap||state.page!=='home')return;
    var legend=document.querySelector('.chart-card .legend');
    if(!legend)return;
    var row=legend.parentNode&&legend.parentNode.classList&&legend.parentNode.classList.contains('trend-legend-row-v25')
      ?legend.parentNode:null;
    if(!row){
      row=document.createElement('div');
      row.className='trend-legend-row-v25';
      legend.parentNode&&legend.parentNode.removeChild(legend);
      wrap.insertAdjacentElement('afterend',row);
      row.appendChild(legend);
    }
    var hint=document.querySelector('.trend-scroll-hint-v19');
    if(hint&&hint.parentNode!==row)row.appendChild(hint);
  }
  var bindPageBeforeV25=bindPage;
  bindPage=function bindPageV25(){
    bindPageBeforeV25();
    // 图例移到图表下方，与「左右滑动查看全部考试」同行
    moveLegendBelowChartV25();
    // 查看：分数/百分比
    $$('[data-score-view-v25]').forEach(function(b){b.onclick=function(){state.scoreViewV25=b.dataset.scoreViewV25;render();};});
    // 雷达图：选择考试/移除所选
    var pick=document.getElementById('radarPickV25');
    if(pick)pick.onclick=openRadarPickerV25;
    $$('[data-radar-unpick]').forEach(function(c){c.onclick=function(){state.radarSelection=(state.radarSelection||[]).filter(function(id){return id!==c.dataset.radarUnpick;});render();};});
    // 完整趋势 / 保存图片
    var full=document.getElementById('trendFullV25');
    if(full)full.onclick=openFullTrendV25;
    var save=document.getElementById('trendSaveV25');
    if(save)save.onclick=function(){
      var svgText=extractChartSvgV25();
      if(!svgText)return toast('当前还没有图表可保存');
      downloadSvgAsPngV25(svgText,trendFileNameV25(state.subject||'趋势'));
    };
    // 考试记录排序
    applyStoredOrderV25();
    addOrderButtonsV25();
    // 修改密码：6～20 位，可含大小写字母数字符号（覆盖 v15 纯数字规则）
    var pwBtn=document.getElementById('changePasswordV15');
    if(pwBtn){
      pwBtn.onclick=async function(){
        var first=(document.getElementById('newPasswordV15')||{}).value||'';
        var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
        if(!/^[\x21-\x7E]{6,20}$/.test(first))return toast('新密码请设置为 6～20 位，可使用大小写字母、数字和符号');
        if(first!==second)return toast('两次输入的密码不一致');
        pwBtn.disabled=true;pwBtn.textContent='保存中…';
        try{
          await changePasswordApiV15(first);
          document.getElementById('newPasswordV15').value='';
          document.getElementById('confirmPasswordV15').value='';
          toast('密码已修改，请记住新密码');
        }catch(e){toast(e&&e.message?e.message:'密码修改失败');}
        finally{if(pwBtn.isConnected){pwBtn.disabled=false;pwBtn.textContent='保存新密码';}}
      };
      var np=document.getElementById('newPasswordV15'),cp=document.getElementById('confirmPasswordV15');
      if(np){np.removeAttribute('inputmode');np.removeAttribute('pattern');np.placeholder='6～20位，可含字母数字符号';}
      if(cp){cp.removeAttribute('inputmode');cp.removeAttribute('pattern');cp.placeholder='再次输入新密码';}
      var note=document.querySelector('.password-note-v15');
      if(note)note.textContent='建议设置 6～20 位，可使用大写字母、小写字母、数字和符号；保存后当前设备不会退出，以后登录请使用新密码。';
    }
  };

  // ---------- K) 记录页组合汇总：分数与排名独立展示（成员缺分时排名仍显示） ----------
  if(typeof moduleSummaryV18==='function'){
    moduleSummaryV18=function moduleSummaryV25(exam){
      if(!state.modulesV18||!exam)return '';
      var selected=new Set((exam.moduleIds||[]).map(String));
      if(!selected.size)return '';
      var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m&&m.id));}).map(function(m){
        if(!m||!m.name)return '';
        var final=examScore(exam,m.name,'actual');
        var raw=(typeof examRawScoreV13==='function')?examRawScoreV13(exam,m.name):null;
        var target=examScore(exam,m.name,'target');
        var max=(typeof examMax==='function')?examMax(exam,m.name):null;
        var parts=[];
        if(final!==null)parts.push(formatScore(final)+(max?('/'+formatScore(max)):''));
        if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));
        if(target!==null)parts.push('目标 '+formatScore(target));
        var ranksMap=examRanksForV25(exam);
        var r=ranksMap&&ranksMap[String(m.id)];
        if(r){
          if(num(r.yearRank)!==null)parts.push('年排 '+formatScore(r.yearRank)+(num(r.yearParticipants)!==null?('/'+formatScore(r.yearParticipants)):''));
          if(num(r.classRank)!==null)parts.push('班排 '+formatScore(r.classRank)+(num(r.classParticipants)!==null?('/'+formatScore(r.classParticipants)):''));
        }
        if(!parts.length)return '';
        return '<span class="module-chip-v18"><b>'+escapeHtml(m.name)+'</b> '+parts.join(' · ')+'</span>';
      }).filter(Boolean);
      return items.length?'<div class="record-module-summary-v18">'+items.join('')+'</div>':'';
    };
  }

  syncVersionV25();
})();
/* ===== app-v26.js ===== */
// v26 / product v3.0: 记录页分数显示重设计。
// 胶囊 pill（宽度随内容、换行锯齿）→ 总分强调条 + 等宽分数格（auto-fill 网格，任意宽度都排满整行）。
// 组合分与科目共用同一网格（浅蓝底区分），层级：总分条 > 科目格 > 组合格。
// 仅重写 recordHtml 的展示层；数据读取全部复用既有全局链（examScore/totalFor/rankInfoByScopeV16 等），
// 按钮 markup 与 data-* 属性保持不变，排序/编辑/隐藏/删除等既有绑定不受影响。
(function(){
  var PRODUCT_VERSION_V26='v3.0';
  function syncVersionV26(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v26-style')){
    var style=document.createElement('style');
    style.id='app-v26-style';
    style.textContent=`
      .record-scores.record-scores-v26{display:block!important;min-width:0}
      .score-total-strip-v26{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;background:#eef4ff;border-radius:11px;padding:9px 13px}
      .score-total-strip-v26 .t-label{font-size:11px;font-weight:700;color:#2f6bff;letter-spacing:.02em}
      .score-total-strip-v26 .t-big{font-size:20px;font-weight:800;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums}
      .score-total-strip-v26 .t-sub{font-size:11px;color:#6b7a99;font-variant-numeric:tabular-nums}
      .score-total-strip-v26 .t-pill{font-size:10px;font-weight:700;color:#41506b;background:#fff;border-radius:999px;padding:3px 9px;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 1px #e3eaf8}
      .score-grid-v26{display:grid;grid-template-columns:repeat(auto-fill,minmax(97px,1fr));gap:6px;min-width:0}
      .score-total-strip-v26+.score-grid-v26{margin-top:7px}
      .score-cell-v26{background:#f6f7fa;border-radius:10px;padding:8px 10px 7px;min-width:0}
      .score-cell-v26.combo{background:#f6f9ff;box-shadow:inset 0 0 0 1px #d8e4fd}
      .sc-name-v26{display:flex;align-items:center;font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden}
      .score-cell-v26.combo .sc-name-v26{color:#2f6bff}
      .sc-name-v26 .stat-badge-v17{flex:none;margin-left:5px}
      .sc-val-v26{font-size:17px;font-weight:700;color:var(--text);line-height:1.35;margin-top:1px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sc-sub-v26,.sc-rank-v26{font-size:10px;color:#98a2b3;line-height:1.55;font-variant-numeric:tabular-nums;overflow-wrap:break-word}
      .records-empty-v26{font-size:11px;color:var(--muted)}
      /* 手机端操作区：右侧竖列 → 独立底行横排（日期/分数/按钮三段式）。
         双类名 + !important 用于稳定覆盖 mobile-fix.css 的竖排规则 */
      @media(max-width:620px){
        .record.record{grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"date" "scores" "actions";gap:12px 10px!important}
        .record-actions.record-actions-v10{grid-area:actions;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end;flex-wrap:nowrap;max-width:none!important}
        .record-action-btn-v10.record-action-btn-v10{width:auto;min-width:0;padding:6px 10px!important}
        .order-btn-v25.order-btn-v25{width:28px!important;height:28px!important}
      }
      @media(max-width:420px){
        .record.record{gap:10px 8px!important}
        .record-action-btn-v10.record-action-btn-v10{padding:6px 9px!important}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function moduleNamesV26(){
    try{return (typeof moduleNameSetV21==='function')?moduleNameSetV21():new Set();}catch(e){return new Set();}
  }
  // 与 v25 examRanksForV25 同口径：云端 moduleRanks 优先，本机缓存兜底
  function moduleRanksForV26(exam){
    if(exam&&exam.moduleRanks&&typeof exam.moduleRanks==='object'&&Object.keys(exam.moduleRanks).length)return exam.moduleRanks;
    if(!exam||!exam.exam_date||!exam.name)return{};
    try{
      var raw=localStorage.getItem('st_moduleranks_v25_'+(((state&&state.user)&&state.user.username)||'anon'))||'';
      var d=raw?JSON.parse(raw):null;
      return (d&&typeof d==='object')?(d[exam.exam_date+'|'+exam.name]||{}):{};
    }catch(e){return{};}
  }
  // 单个 scope 的排名文案；prefix 为「年」或「班」。紧凑分数写法（12/450）减少窄格换行
  function scopeTextV26(info,prefix){
    if(!info)return '';
    if(info.directPercent)return prefix+'位比 前'+formatPercent(info.positionPercent);
    if(info.rank!==null&&info.rank!==undefined){
      return prefix+'排 '+formatScore(info.rank)+(info.participants!==null&&info.participants!==undefined?('/'+formatScore(info.participants)):'');
    }
    return '';
  }
  function subjectCellV26(exam,name){
    var row=(exam.scores&&exam.scores[name])||{};
    var a=num(row.actual),raw=num(row.raw),t=num(row.target);
    var eff=(a!==null)?a:raw; // 记录页沿用 v20 口径：actual 缺失时以原始分呈现
    var year=rankInfoByScopeV16(exam,name,'year'),cls=rankInfoByScopeV16(exam,name,'class');
    var rank=[scopeTextV26(year,'年'),scopeTextV26(cls,'班')].filter(Boolean).join(' · ');
    if(eff===null&&raw===null&&t===null&&!rank)return '';
    var sub=[];
    if(raw!==null&&(eff===null||Number(raw)!==Number(eff)))sub.push('原始 '+formatScore(raw));
    if(t!==null)sub.push('目标 '+(t===null?'—':formatScore(t)));
    var subText=sub.join(' · ');
    return '<div class="score-cell-v26">'
      +'<div class="sc-name-v26" title="'+escapeHtml(name)+'">'+escapeHtml(name)+(row.excludeFromTotal?'<span class="stat-badge-v17">统计项</span>':'')+'</div>'
      +'<div class="sc-val-v26">'+(eff===null?'—':formatScore(eff))+'</div>'
      +(subText?'<div class="sc-sub-v26" title="'+escapeHtml(subText)+'">'+subText+'</div>':'')
      +(rank?'<div class="sc-rank-v26" title="'+escapeHtml(rank)+'">'+rank+'</div>':'')
      +'</div>';
  }
  function comboCellV26(exam,m,ranksMap){
    var fin=examScore(exam,m.name,'actual');
    var raw=(typeof examRawScoreV13==='function')?examRawScoreV13(exam,m.name):null;
    var tgt=examScore(exam,m.name,'target');
    var max=examMax(exam,m.name);
    var r=(ranksMap&&ranksMap[String(m.id)])||{};
    var yr=num(r.yearRank),yp=num(r.yearParticipants),cr=num(r.classRank),cp=num(r.classParticipants);
    if(fin===null&&raw===null&&tgt===null&&yr===null&&cr===null)return '';
    var val=(fin!==null)?(formatScore(fin)+(max?'/'+formatScore(max):'')):(raw!==null?formatScore(raw):'—');
    var sub=[];
    if(raw!==null&&(fin===null||Number(raw)!==Number(fin)))sub.push('原始 '+formatScore(raw));
    if(tgt!==null)sub.push('目标 '+formatScore(tgt));
    var rank=[];
    if(yr!==null)rank.push('年排 '+formatScore(yr)+(yp!==null?('/'+formatScore(yp)):''));
    if(cr!==null)rank.push('班排 '+formatScore(cr)+(cp!==null?('/'+formatScore(cp)):''));
    var subText=sub.join(' · ');
    var rankText=rank.join(' · ');
    return '<div class="score-cell-v26 combo">'
      +'<div class="sc-name-v26" title="'+escapeHtml(m.name)+'">'+escapeHtml(m.name)+'</div>'
      +'<div class="sc-val-v26">'+val+'</div>'
      +(subText?'<div class="sc-sub-v26" title="'+escapeHtml(subText)+'">'+subText+'</div>':'')
      +(rankText?'<div class="sc-rank-v26" title="'+escapeHtml(rankText)+'">'+rankText+'</div>':'')
      +'</div>';
  }
  function totalStripV26(exam){
    var fin=totalFor(exam,'actual');
    var raw=(typeof totalRawForV13==='function')?totalRawForV13(exam):null;
    if(raw!==null&&fin!==null&&Math.abs(Number(fin)-Number(raw))<0.000001)raw=null;
    var year=rankInfoByScopeV16(exam,'总分','year'),cls=rankInfoByScopeV16(exam,'总分','class');
    var pills=[scopeTextV26(year,'年'),scopeTextV26(cls,'班')].filter(Boolean)
      .map(function(x){return '<span class="t-pill">'+x+'</span>';}).join('');
    if(fin===null&&raw===null&&!pills)return '';
    // 标签用中性「总分」：无赋分学段只见一个数，零歧义；有原始总分时并列展示自然区分口径
    return '<div class="score-total-strip-v26"><span class="t-label">总分</span>'
      +'<span class="t-big">'+(fin===null?'—':formatScore(fin))+'</span>'
      +(raw!==null?'<span class="t-sub">原始总分 '+formatScore(raw)+'</span>':'')
      +pills+'</div>';
  }

  // ---------- rewrite recordHtml ----------
  if(typeof recordHtml!=='function')return syncVersionV26();
  recordHtml=function recordHtmlV26(exam){
    var modules=state.modulesV18||[];
    var modNames=moduleNamesV26();
    var selected=new Set((exam.moduleIds||[]).map(String));
    var ranksMap=moduleRanksForV26(exam);
    var names=Object.keys(exam.scores||{}).filter(function(n){return !modNames.has(n);});
    var cells=names.map(function(n){return subjectCellV26(exam,n);}).filter(Boolean).join('');
    var combos=modules.filter(function(m){return m&&m.name&&selected.has(String(m.id));})
      .map(function(m){return comboCellV26(exam,m,ranksMap);}).filter(Boolean).join('');
    var strip=totalStripV26(exam);
    var zone=(cells||combos||strip)
      ?(strip+'<div class="score-grid-v26">'+cells+combos+'</div>')
      :'<div class="records-empty-v26">尚未填写分数或排名</div>';
    var dateHtml=fmtYearDate(exam.exam_date)+(exam.end_date?(' - '+fmtYearDate(exam.end_date)):'');
    return '<div class="record '+(exam.is_hidden?'hidden-record-v10':'')+'">'
      +'<div class="record-date">'+dateHtml
      +'<b>'+escapeHtml(exam.name)
      +'<span class="grade-badge-v13">'+escapeHtml(exam.grade_level||'未分类')+'</span>'
      +(exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':'')
      +'</b></div>'
      +'<div class="record-scores record-scores-v26">'+zone+'</div>'
      +'<div class="record-actions record-actions-v10">'
      +'<button class="record-action-btn-v10" data-edit="'+exam.id+'">编辑</button>'
      +'<button class="record-action-btn-v10" data-hidden-toggle="'+exam.id+'">'+(exam.is_hidden?'恢复显示':'隐藏')+'</button>'
      +'<button class="record-action-btn-v10 danger" data-delete="'+exam.id+'">删除</button>'
      +'</div></div>';
  };

  syncVersionV26();
})();

/* ===== app-v27.js ===== */
// app-v27 / product v3.1: 修复首页趋势卡「多科彩色图例」被裁切的问题。
// 根因：总览模式下 .overview-legend 生成在 #chart 容器内部（SVG 之后），而 v19 给 #chart
// 加了 .trend-scroll-v19{overflow-y:hidden!important}，叠加 .chart-wrap 固定高度
// （桌面 330px / 手机 285px）且 SVG 占满高度 → 图例溢出容器被下边缘切掉：
// 桌面露出上半截、手机几乎完全不可见。排名模式的 .rank-legend-v7 同样挤在定高容器内。
// 修法：渲染后将图例搬迁到 #chart 之后（容器外），脱离裁切与横向滚动上下文；
// 图例本身样式不变，仅外层提供排版。幂等，可重复 render。
(function(){
  var PRODUCT_VERSION_V27='v3.1';
  function syncVersionV27(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v27-style')){
    var style=document.createElement('style');
    style.id='app-v27-style';
    style.textContent=`
      .legend-outside-v27{margin-top:10px;min-width:0}
      .legend-outside-v27 .overview-legend,.legend-outside-v27 .rank-legend-v7{margin-top:0}
    `;
    document.head.appendChild(style);
  }

  // ---------- move legends out of the clipped/fixed-height chart container ----------
  function moveLegendsOutV27(){
    ['chart','overviewChart'].forEach(function(id){
      var stage=document.getElementById(id);
      if(!stage)return;
      stage.querySelectorAll('.overview-legend,.rank-legend-v7').forEach(function(legend){
        if(legend.closest('.legend-outside-v27'))return; // 已搬迁
        var row=document.createElement('div');
        row.className='legend-outside-v27';
        stage.insertAdjacentElement('afterend',row);
        row.appendChild(legend);
      });
    });
  }

  var bindPageBeforeV27=(typeof bindPage==='function')?bindPage:null;
  if(bindPageBeforeV27){
    bindPage=function bindPageV27(){
      bindPageBeforeV27();
      try{moveLegendsOutV27();}catch(e){}
    };
  }

  syncVersionV27();
})();

/* ===== app-v28.js ===== */
// app-v28 / product v3.2: 
// A) 折线图配色去重：原始分总览（v13）依赖 OVERVIEW_COLORS、排名图（v7/v11/v25）依赖
//    OVERVIEW_COLORS_V4，但两者此前均未定义 → 回退到小调色板按 index 取模
//    （RADAR_COLORS 仅 4 色 / 排名 10 色），科目一多颜色必然重复。
//    现提供确定性扩展调色板：前几项与现有观感完全一致，超出的用黄金角 HSL 唯一生成，
//    避开基础色相、互不重复；白底可读（S62% L46%）。
// B) 注册/请求网络失败：此前浏览器原样抛英文 "Failed to fetch" 且无任何记录。
//    现将 api/dataApiV7 的网络层错误翻译为可操作的中文提示；
//    失败事件改由 telemetry-feedback.js 上报（api_fetch_error），从此可在服务端排查。
(function(){
  var PRODUCT_VERSION_V28='v3.2';
  function syncVersionV28(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
  }

  // ---------- A) palettes ----------
  function hexToHueV28(hex){
    var v=String(hex||'').replace('#','');
    if(v.length===3)v=v[0]+v[0]+v[1]+v[1]+v[2]+v[2];
    var r=parseInt(v.slice(0,2),16)/255,g=parseInt(v.slice(2,4),16)/255,b=parseInt(v.slice(4,6),16)/255;
    var max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0;
    if(d>0){
      if(max===r)h=((g-b)/d+6)%6;
      else if(max===g)h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h=h*60;if(h>=360)h-=360;
    }
    return h;
  }
  function angDistV28(a,b){var d=Math.abs(a-b)%360;return d>180?360-d:d;}
  (function buildPalettesV28(){
    var total='#18212f';
    var radar=['#5d72e8','#32a77a','#e59b45','#df5f68'];
    var rankTail=['#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
    var avoided=radar.concat(rankTail).map(hexToHueV28);
    // 两段式生成：先严后宽，保证凑满目标数量且互不近似
    function collect(target,minAvoid,minGen){
      var out=[],hop=0;
      while(out.length<target&&hop<900){
        var h=(15+137.508*hop++)%360;
        var clash=avoided.some(function(a){return angDistV28(a,h)<minAvoid;})
          ||out.some(function(g){return angDistV28(g,h)<minGen;});
        if(!clash)out.push(h);
      }
      return out;
    }
    var gen=collect(26,10,9);
    if(gen.length<26){
      collect(26,6,7).forEach(function(h){
        if(gen.length<26&&!gen.some(function(g){return angDistV28(g,h)<7;}))gen.push(h);
      });
    }
    function hsl(h){return 'hsl('+Math.round(h)+',62%,46%)';}
    var ov=[total].concat(radar);gen.slice(0,25).forEach(function(h){ov.push(hsl(h));});
    var v4=[total].concat(radar,rankTail);gen.forEach(function(h){v4.push(hsl(h));});
    window.OVERVIEW_COLORS=ov;      // v13 原始分总览：总分色 + 每科一色
    window.OVERVIEW_COLORS_V4=v4;   // v7/v11/v25 排名折线系列色
  })();

  // ---------- B) network errors: translate to actionable Chinese ----------
  function isNetworkErrorV28(e){
    var msg=String((e&&e.message)||'');
    return (e instanceof TypeError)||/failed to fetch|networkerror|load failed|network request failed/i.test(msg);
  }
  function friendlyNetErrorV28(e){
    if(!isNetworkErrorV28(e))return e;
    try{
      if(navigator.onLine===false)return new Error('当前无网络连接，请联网后重试');
    }catch(_){}
    return new Error('网络连接失败：请检查网络后重试；如果浏览器安装了广告拦截类插件，请允许本站请求后再试');
  }
  var apiBeforeV28=(typeof api==='function')?api:null;
  if(apiBeforeV28){
    api=function(){ // 注册/登录等走这里
      return apiBeforeV28.apply(this,arguments).catch(function(e){throw friendlyNetErrorV28(e);});
    };
  }
  var dataApiBeforeV28=(typeof dataApiV7==='function')?dataApiV7:null;
  if(dataApiBeforeV28){
    dataApiV7=function(){
      return dataApiBeforeV28.apply(this,arguments).catch(function(e){throw friendlyNetErrorV28(e);});
    };
  }

  syncVersionV28();
})();

/* ===== app-v29.js ===== */
// app-v29 / product v3.3: GUI 视觉提升
// A) 主题引擎：五套主题（晴白/暖纸/雾蓝/墨夜/青屿）。styles.css 与各版本注入样式的
//    硬编码色在此统一重映射为语义变量；每套主题 = <html data-theme> 上的一组变量值，
//    账号页新增「外观」入口，选择持久化到 localStorage 并同步 meta theme-color。
// B) 图例取色：点击折线图图例项（趋势的真实/目标、总览各科、排名各科）弹出取色板
//    （10 预设色 + 自定义 + 恢复默认），按科目名持久化，渲染后把颜色回写到对应
//    折线路径与数据点（SVG 子元素按 path+后续circle 分组，与图例顺序天然一致）。
// C) 手感补齐：全局按钮按压缩放(0.96)、精确属性过渡、:focus-visible 焦点环。
(function(){
  var PRODUCT_VERSION_V29='v4.1';

  /* ================= 版本号 ================= */
  function syncVersionV29(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写;theme-color 仍由主题引擎管理 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
    var tc=document.querySelector('meta[name="theme-color"]');
    if(tc)tc.setAttribute('content',themeMetaColorV29(currentThemeV29()));
  }

  /* ================= 样式注入 ================= */
  var CSS_V29=[
    /* ---- 基础表面重映射（默认回退值 = 现状，主题只覆盖变量） ---- */
    'body{background:radial-gradient(circle at 8% 0%,var(--glow1,#eef0ff) 0,transparent 28%),radial-gradient(circle at 92% 8%,var(--glow2,#eff9f5) 0,transparent 24%),var(--bg)}',
    '.logo{background:linear-gradient(145deg,var(--logo-a,#1f2939),var(--logo-b,#48546a))}',
    '.primary{color:var(--on-surface,#fff)}',
    '.chip.chip.active{background:var(--accent-soft)!important;color:var(--accent)!important;border-color:var(--accent)!important}',
    '.desktop-nav{background:var(--nav-glass,rgba(255,255,255,.65));border-color:var(--nav-line,rgba(255,255,255,.9))}',
    '.nav-btn.active{background:var(--nav-active,#fff)}',
    '.bottom-nav{background:var(--navbg,rgba(255,255,255,.92));border-color:var(--navline,rgba(255,255,255,.95))}',
    '.bottom-nav button.active{background:var(--nav-active,#f1f3f8)}',
    '.chip,.secondary,.icon-btn,.copy-btn,.mini-stat{background:var(--chip-bg,#fff)}',
    '.score-tag{background:var(--cell,#f6f7fa);border-color:var(--line-soft,#edf0f3);color:var(--muted)}',
    '.account-chip,.credential{background:var(--cell,#f7f8fb)}',
    '.info-box{background:var(--info-bg,#f4f6ff);border-color:var(--info-line,#e4e8ff);color:var(--info-text,#55627a)}',
    '.modal{background:var(--modal-bg,#fff)}',
    '.modal-head{background:var(--head-bg,rgba(255,255,255,.96))}',
    '.field input,.score-row input{background:var(--input-bg,#fff);border-color:var(--input-line,#dfe3e9);color:var(--text)}',
    '.field label{color:var(--label,#4d5868)}',
    '.field input:focus{border-color:var(--focus,#98a6f2);box-shadow:0 0 0 3px var(--focus-ring,#eef0ff)}',
    /* ---- 图表 SVG 内联色的类化适配 ---- */
    '.axis-label{fill:var(--axis,#98a1ae)}',
    '.point-label{fill:var(--point-label,#6e7887)}',
    '.chart-wrap svg line{stroke:var(--grid,#edf0f4)}',
    '.chart-wrap svg circle{fill:var(--dotfill,#fff)}',
    /* ---- 各版本注入样式的硬编码色重映射 ---- */
    '.score-total-strip-v26{background:var(--accent-soft)}',
    '.score-total-strip-v26 .t-label{color:var(--accent)}',
    '.score-total-strip-v26 .t-sub{color:var(--muted)}',
    '.score-total-strip-v26 .t-pill{background:var(--pill-bg,#fff);border-color:var(--pill-line,#e3eaf8);color:var(--muted)}',
    '.score-cell-v26{background:var(--cell,#f6f7fa)}',
    '.score-cell-v26.combo{background:var(--combo-cell,#f6f9ff);border-color:var(--combo-line,#d8e4fd)}',
    '.score-cell-v26.combo .sc-name-v26{color:var(--accent)}',
    '.sc-sub-v26,.sc-rank-v26{color:var(--muted)}',
    '.trend-actions-v25 button,.order-btn-v25{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.trend-actions-v25 button:hover,.order-btn-v25:hover,.radar-pick-chip-v25:hover{color:var(--text)}',
    '.radar-pick-chip-v25{background:var(--cell,#f7f8fb);color:var(--muted)}',
    '.full-trend-stage-v25{background:var(--bg)}',
    '.subject-picker-v21 select,.combo-picker-v21 select{background:var(--chip-bg,#fff);color:var(--text)}',
    '.combo-total-v21,.combo-card-v21{background:var(--panel-solid,#fafbfe)}',
    '.rank-entry-top-v21{background:var(--cell,#f8f9fc)}',
    '.rank-entry-mode-v17 button{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.stat-badge-v17{background:var(--cell,#f4f7fb);border-color:var(--line-soft,#d9e3f3);color:var(--muted)}',
    '#app-version-v17{color:var(--muted)}',
    '.grade-chip-v13,.basis-btn-v13{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.basis-btn-v13.active{background:var(--accent-soft);color:var(--accent);border-color:transparent}',
    '.grade-select-v13{background:var(--chip-bg,#fff);color:var(--text)}',
    '.raw-field-v13{background:var(--raw-field,#fffaf2)}',
    '.final-field-v13{background:var(--final-field,#f4fbf8)}',
    '.score-total-box-v13{background:var(--panel-solid,#fafbfe)}',
    '.grade-badge-v13{background:var(--cell,#f5f7fb);border-color:var(--line-soft,#dce2ee);color:var(--muted)}',
    '.exam-subject-card-v10{background:var(--panel-solid,#fbfcfe)}',
    '.exam-subject-name-v10{background:var(--input-bg,#fff)}',
    '.visibility-box-v10{background:var(--cell,#f7f8fb)}',
    '.hidden-record-v10{background:var(--cell,#fafafa)}',
    '.hidden-badge-v10{background:var(--cell,#f2f4f7);border-color:var(--line-soft,#dfe3ea);color:var(--muted)}',
    '.record-action-btn-v10{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.combo-remove-v21,.remove-exam-subject-v10{color:var(--danger)}',
    /* ---- C) 手感：按压反馈 + 精确过渡 + 键盘焦点 ---- */
    'button{transition-property:transform,opacity,box-shadow,color,background-color,border-color;transition-duration:.15s;transition-timing-function:ease}',
    'button:active{transform:scale(.96)}',
    'button:disabled{transform:none}',
    ':focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:2px}',
    /* ---- 图例取色交互 ---- */
    '.legend span,.overview-legend .overview-pill,.rank-legend-v7 span{cursor:pointer}',
    '.legend span:hover,.overview-legend .overview-pill:hover,.rank-legend-v7 span:hover{background:var(--accent-soft)}',
    '.overview-legend .overview-pill:hover,.rank-legend-v7 span:hover{border-color:var(--accent)}',
    '.picker-pop-v29{position:fixed;z-index:300;background:var(--modal-bg,#fff);border:1px solid var(--line,#e6e9ef);border-radius:14px;box-shadow:0 16px 44px rgba(15,22,40,.2);padding:12px;display:none;width:230px}',
    '.picker-pop-v29.show{display:block}',
    '.picker-pop-v29 b{display:block;font-size:12px;margin-bottom:9px;color:var(--text)}',
    '.pk-swatches-v29{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:10px}',
    '.pk-show-v29{display:flex;gap:6px;align-items:center;font-size:11px;color:var(--muted,#788392);margin:2px 0 10px;padding-top:9px;border-top:1px dashed var(--line,#e6e9ef);cursor:pointer;user-select:none}',
    '.pk-show-v29 input{width:14px;height:14px;accent-color:var(--accent,#5d72e8)}',
    '.lg-hide-v29{opacity:.4}',
    '.pk-swatches-v29 button{width:32px;height:32px;border-radius:9px;border:2px solid transparent;padding:0}',
    '.pk-swatches-v29 button.on{border-color:var(--text)}',
    '.pk-row-v29{display:flex;gap:8px;align-items:center;justify-content:space-between}',
    '.pk-row-v29 input[type=color]{width:46px;height:31px;border:1px solid var(--line,#dfe3ec);border-radius:8px;padding:2px;background:var(--chip-bg,#fff);cursor:pointer}',
    '.pk-reset-v29{border:1px solid var(--line,#dfe3ec);background:var(--chip-bg,#fff);border-radius:8px;padding:6px 10px;font-size:11px;color:var(--muted)}',
    /* ---- 外观入口（账号页） ---- */
    '.appearance-card-v29{grid-column:1/-1}',
    '.theme-opts-v29{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}',
    '.theme-opt-v29{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--chip-bg);border-radius:999px;padding:7px 13px 7px 8px;font-size:12px;font-weight:650;color:var(--muted)}',
    '.theme-opt-v29.on{border-color:var(--accent);color:var(--text);background:var(--accent-soft)}',
    '.theme-opt-v29 i{width:16px;height:16px;border-radius:999px;display:inline-block;border:1px solid rgba(0,0,0,.08)}',
    /* ---- 首页两张特殊卡：hero 与 Study Planner 推广卡（此前硬编码浅色渐变） ---- */
    '.hero-main{background:var(--hero-bg,linear-gradient(145deg,rgba(255,255,255,.94),rgba(247,248,255,.9)))}',
    '.study-tool-v18{background:var(--promo-bg,linear-gradient(135deg,#fbfcff,#f7f9fc));border-color:var(--line)}',
    '.study-tool-v18:hover{border-color:var(--promo-line,#cfd7e6)}',
    '.study-tool-kicker-v18{color:var(--muted)}',
    '.study-tool-open-v18{color:var(--accent)}',
    '.study-tool-thumb-v18{border-color:var(--line-soft,#e5e9f0);background:var(--chip-bg,#fff)}',
    /* ---- 其余零散表面 ---- */
    '.close-btn{background:var(--cell,#f3f4f7)}',
    '.score-row.header{background:var(--cell,#f7f8fb)}',
    '.bottom-nav{box-shadow:var(--nav-shadow,0 10px 35px rgba(27,37,58,.14))}',
    '.modal-backdrop{background:var(--backdrop,rgba(22,28,39,.42))}',
    '.toast{border:1px solid var(--toast-line,transparent)}',
    '::selection{background:var(--sel-bg,#cdd6ff);color:var(--sel-text,#18212f)}',
    /* ---- 反馈悬浮窗随主题 ---- */
    'html[data-theme="night"] .st-fb-btn{background:var(--chip-bg);color:var(--text);border-color:var(--line)}',
    'html[data-theme="night"] .st-fb-modal{background:var(--modal-bg);color:var(--text)}',
    'html[data-theme="night"] .st-fb-head{border-color:var(--line)}',
    'html[data-theme="night"] .st-fb-close{background:var(--cell);color:var(--text)}',
    'html[data-theme="night"] .st-fb-tabs button{background:var(--chip-bg);border-color:var(--line);color:var(--muted)}',
    'html[data-theme="night"] .st-fb-tabs button.active{background:var(--nav-active);color:var(--text)}',
    'html[data-theme="night"] .st-fb-field textarea,html[data-theme="night"] .st-fb-field select{background:var(--input-bg);border-color:var(--input-line);color:var(--text)}',
    'html[data-theme="night"] .st-fb-secondary{background:var(--chip-bg);border-color:var(--line);color:var(--text)}',
    'html[data-theme="night"] .st-fb-item{border-color:var(--line)}',
    'html[data-theme="night"] .st-fb-item:hover{background:var(--cell)}',
    'html[data-theme="night"] .study-tool-thumb-v18 img{filter:saturate(.8) contrast(.95) brightness(.85)}',
    'html[data-theme="night"] .splash .brand-mark{color:#10141b}',
    /* ---- 分段选择按钮：全部统一为「外观」卡的选中语言（accent-soft 底 + accent 描边） ---- */
    '.metric-btn-v7.metric-btn-v7.active,.basis-btn-v13.basis-btn-v13.active,.grade-chip-v13.grade-chip-v13.active,.rank-entry-mode-v17.rank-entry-mode-v17 button.active,.select-pill.select-pill.active,.module-subject-v18.module-subject-v18.active{background:var(--accent-soft)!important;color:var(--accent)!important;border-color:var(--accent)!important}',
    /* ---- 未选中态的硬编码浅色收编 ---- */
    '.metric-btn-v7{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.select-pill{background:var(--chip-bg,#fff)}',
    '.subject-chip-v7,.category-chip-v14,.module-chip-v18,.legend-pill{background:var(--cell,#f7f8fb);color:var(--muted)}',
    '.module-badge-v18{background:var(--cell,#f4f7fb);border-color:var(--line-soft,#d9e3f3);color:var(--muted)}',
    '.module-editor-v18{background:var(--panel-solid,#fbfcfe)}',
    '.module-editor-head-v18 input{background:var(--input-bg,#fff);color:var(--text)}',
    '.module-editor-head-v18 input[readonly]{background:var(--cell,#f5f7fa);color:var(--muted)}',
    '.module-delete-v18{background:var(--chip-bg,#fff)}',
    '.module-subject-v18{background:var(--chip-bg,#fff);color:var(--muted)}',
    /* ---- 图例可点击的可见暗示 ---- */
    '.legend span::after,.overview-legend .overview-pill::after,.rank-legend-v7 span::after{content:"🎨";font-size:9px;margin-left:4px;opacity:.45;transition:opacity .15s ease}',
    '.legend span:hover::after,.overview-legend .overview-pill:hover::after,.rank-legend-v7 span:hover::after{opacity:1}',
    '.lg-custom-v29::after{content:"✎";font-size:9px;color:var(--muted);margin-left:2px;opacity:.95}'
  ].join('\n');

  function injectStylesV29(){
    if(document.getElementById('app-v29-style'))return;
    var s=document.createElement('style');
    s.id='app-v29-style';
    s.textContent=CSS_V29;
    (document.head||document.documentElement).appendChild(s);
  }

  /* ================= A) 主题引擎 ================= */
  var THEME_KEY_V29='st_theme';
  var THEMES_V29=[
    {id:'sunny',name:'晴白 · 默认',dot:'linear-gradient(135deg,#5d72e8,#f5f7fb)',meta:'#f5f7fb'},
    {id:'paper',name:'暖纸',dot:'linear-gradient(135deg,#bc6b3c,#f6f1e8)',meta:'#f6f1e8'},
    {id:'sakura',name:'樱粉',dot:'linear-gradient(135deg,#cf5f83,#faf4f6)',meta:'#faf4f6'},
    {id:'violet',name:'淡紫',dot:'linear-gradient(135deg,#8a70d6,#f4f2fa)',meta:'#f4f2fa'},
    {id:'mint',name:'青屿',dot:'linear-gradient(135deg,#2f8f6b,#eef3ef)',meta:'#eef3ef'},
    {id:'night',name:'墨夜 · 暗',dot:'linear-gradient(135deg,#8b9dff,#10141b)',meta:'#10141b'}
  ];
  var THEME_CSS={
    sunny:[],
    paper:[
      '--bg:#f6f1e8','--panel:rgba(255,253,248,.94)','--panel-solid:#fffdf8','--text:#33302a','--muted:#8b8172',
      '--line:#e9e0d1','--accent:#bc6b3c','--accent-soft:#f7ece0','--green:#5e8c61','--green-soft:#ecf3ea','--danger:#c25e52',
      '--glow1:#fdf3e2','--glow2:#f2ecdc','--logo-a:#6f5a38','--logo-b:#a98c60',
      '--nav-glass:rgba(255,253,248,.7)','--nav-line:#f3ead9','--nav-active:#f1e8d8','--navbg:rgba(255,253,248,.94)','--navline:#f3ead9',
      '--chip-bg:#fffdf8','--cell:#f5efe3','--line-soft:#e6dbc8',
      '--axis:#a3967f','--point-label:#8a7f6c','--grid:#ece3d3','--dotfill:#fffdf8',
      '--info-bg:#f7efe2','--info-line:#eadfc9','--info-text:#6d6046',
      '--raw-field:#faf3e6','--final-field:#f0f6ee','--combo-cell:#f9f2e6','--combo-line:#e6d8bd',
      '--shadow:0 12px 40px rgba(90,72,44,.10)','--focus:#bc6b3c','--focus-ring:rgba(188,107,60,.15)',
      '--sel-bg:#f2ddca','--sel-text:#4a3423',
      '--hero-bg:linear-gradient(145deg,rgba(255,252,244,.97),rgba(250,243,230,.93))',
      '--promo-bg:linear-gradient(135deg,#fdf8ec,#f8f0dd)','--promo-line:#dcc9a4',
      '--nav-shadow:0 10px 35px rgba(90,72,44,.14)'
    ],
    sakura:[
      '--bg:#faf4f6','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#382a33','--muted:#94828f',
      '--line:#f0dfe7','--accent:#cf5f83','--accent-soft:#fbe8ee','--green:#3fa17c','--green-soft:#e7f6ef','--danger:#d25e68',
      '--glow1:#fdeef3','--glow2:#f5eefa','--logo-a:#8f3a58','--logo-b:#d98ba6',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#faeef2','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f9eff3','--line-soft:#ecd2de',
      '--axis:#ab95a1','--point-label:#967f8d','--grid:#f2e4ea','--dotfill:#ffffff',
      '--info-bg:#fdecf2','--info-line:#f4d7e2','--info-text:#7c5566',
      '--raw-field:#fdf3e7','--final-field:#ebf6f0','--combo-cell:#fceef3','--combo-line:#f0d7e1',
      '--shadow:0 12px 40px rgba(120,60,90,.10)','--focus:#cf5f83','--focus-ring:rgba(207,95,131,.15)',
      '--sel-bg:#f7d3df','--sel-text:#57283a',
      '--hero-bg:linear-gradient(145deg,rgba(255,236,243,.75) 0%,rgba(255,255,255,.97) 55%)',
      '--promo-bg:linear-gradient(135deg,#fef1f5,#fbe9f0)','--promo-line:#eec3d3',
      '--nav-shadow:0 10px 35px rgba(120,60,90,.13)'
    ],
    violet:[
      '--bg:#f4f2fa','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#2f2a3d','--muted:#8b8499',
      '--line:#e6e1f0','--accent:#8a70d6','--accent-soft:#edeafb','--green:#3aa07e','--green-soft:#e6f5ef','--danger:#d75f76',
      '--glow1:#ece7fb','--glow2:#f6ecf5','--logo-a:#4c3d80','--logo-b:#9c8ae0',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#efeaf8','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f1eef8','--line-soft:#dbd3ec',
      '--axis:#9c93b3','--point-label:#867d9c','--grid:#e8e3f2','--dotfill:#ffffff',
      '--info-bg:#edebfa','--info-line:#dcd6f4','--info-text:#5b5378',
      '--raw-field:#faf3e7','--final-field:#ecf6f1','--combo-cell:#f0edf9','--combo-line:#ded5f2',
      '--shadow:0 12px 40px rgba(80,64,130,.10)','--focus:#8a70d6','--focus-ring:rgba(138,112,214,.15)',
      '--sel-bg:#ddd4f6','--sel-text:#2e2650',
      '--hero-bg:linear-gradient(145deg,rgba(238,232,251,.65) 0%,rgba(255,255,255,.97) 55%)',
      '--promo-bg:linear-gradient(135deg,#f3effc,#ebe5f9)','--promo-line:#cfc4ee',
      '--nav-shadow:0 10px 35px rgba(80,64,130,.13)'
    ],
    night:[
      '--bg:#10141b','--panel:rgba(22,28,38,.92)','--panel-solid:#161c26','--text:#e7eaf1','--muted:#97a1b4',
      '--line:#27303f','--accent:#8b9dff','--accent-soft:#212a44','--green:#43bd8a','--green-soft:#17302a','--orange:#d38429','--danger:#ef7078',
      '--shadow:0 14px 44px rgba(0,0,0,.45)',
      '--glow1:#1a2130','--glow2:#131f29','--logo-a:#2c3654','--logo-b:#5566c9',
      '--nav-glass:rgba(22,28,38,.7)','--nav-line:#2a3342','--nav-active:#1d2431','--navbg:rgba(22,28,38,.94)','--navline:#2a3342',
      '--chip-bg:#1d2431','--cell:#1d2431','--line-soft:#323d52','--on-surface:#10141b',
      '--axis:#7e8899','--point-label:#8b96ab','--grid:#232c3b','--dotfill:#161c26',
      '--modal-bg:#161c26','--head-bg:rgba(22,28,38,.96)','--input-bg:#10141b','--input-line:#323d52','--label:#aab4c8',
      '--focus:#8b9dff','--focus-ring:rgba(139,157,255,.18)',
      '--info-bg:#1d2431','--info-line:#323d52','--info-text:#a9b4d0',
      '--raw-field:#241f16','--final-field:#15251d','--combo-cell:#1d2431','--combo-line:#323d52',
      '--pill-bg:#1d2431','--pill-line:#323d52',
      '--hero-bg:linear-gradient(145deg,rgba(30,38,54,.96),rgba(23,30,43,.94))',
      '--promo-bg:linear-gradient(135deg,#181f2b,#141a24)','--promo-line:#394561',
      '--nav-shadow:0 12px 40px rgba(0,0,0,.5)',
      '--backdrop:rgba(4,7,12,.62)','--toast-line:#333f55','--sel-bg:#33406b','--sel-text:#e7eaf1'
    ],
    mint:[
      '--bg:#eef3ef','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#24312a','--muted:#7d8a80',
      '--line:#dee8e0','--accent:#2f8f6b','--accent-soft:#e4f3ec','--green:#3a8f5f','--green-soft:#e6f3ea','--danger:#cf6058',
      '--glow1:#e6f2e9','--glow2:#edf6f0','--logo-a:#24513c','--logo-b:#4d8a68',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#e9f2ec','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f1f6f2','--line-soft:#d3e2d8',
      '--axis:#90a096','--point-label:#7e8f84','--grid:#e2ebe4','--dotfill:#ffffff',
      '--info-bg:#e9f3ec','--info-line:#d4e6da','--info-text:#48604f',
      '--raw-field:#faf5ea','--final-field:#ecf6ee','--combo-cell:#ebf5ee','--combo-line:#cfe4d6',
      '--shadow:0 12px 40px rgba(38,72,56,.09)','--focus:#2f8f6b','--focus-ring:rgba(47,143,107,.15)',
      '--sel-bg:#c4e6d4','--sel-text:#12301f',
      '--hero-bg:linear-gradient(145deg,rgba(255,255,255,.96),rgba(240,247,241,.92))',
      '--promo-bg:linear-gradient(135deg,#f2f9f4,#e9f4ec)','--promo-line:#bcd9c6',
      '--nav-shadow:0 10px 35px rgba(38,72,56,.13)'
    ]
  };
  function currentThemeV29(){
    var t=document.documentElement&&document.documentElement.dataset?document.documentElement.dataset.theme:'';
    return t||'sunny';
  }
  function themeMetaColorV29(id){
    var t=THEMES_V29.find(function(x){return x.id===id;});
    return t?t.meta:'#f5f7fb';
  }

  /* ---- 暗色专用图表系列色：折线/数据点在夜里提亮保持对比 ---- */
  function buildDarkPalettesV29(){
    function toDark(c){
      if(typeof c==='string'&&c.indexOf('hsl(')===0)return c.replace(/,\s*62%,\s*46%\)/,',64%,62%)');
      var map={'#18212f':'#dfe4f5','#5d72e8':'#8b9dff','#32a77a':'#43bd8a','#e59b45':'#f0ae5e','#df5f68':'#ef7078',
        '#8f62db':'#b39af0','#22a6b3':'#39c9bd','#f06a8b':'#f4849f','#6c87ff':'#93a7ff','#7a8a9a':'#98a5b8'};
      return map[String(c).toLowerCase()]||c;
    }
    if(Array.isArray(window.OVERVIEW_COLORS))window.OVERVIEW_COLORS_DARK=window.OVERVIEW_COLORS.map(toDark);
    if(Array.isArray(window.OVERVIEW_COLORS_V4))window.OVERVIEW_COLORS_V4_DARK=window.OVERVIEW_COLORS_V4.map(toDark);
  }
  function themedPaletteProxyV29(light,dark){
    return new Proxy(light,{
      get:function(t,k){var src=(currentThemeV29()==='night'&&dark)?dark:t;return src[k];},
      has:function(t,k){return k in t;}
    });
  }
  function installThemedPalettesV29(){
    if(typeof Proxy==='undefined'||!Array.isArray(window.OVERVIEW_COLORS))return;
    window.OVERVIEW_COLORS=themedPaletteProxyV29(window.OVERVIEW_COLORS,window.OVERVIEW_COLORS_DARK);
    if(Array.isArray(window.OVERVIEW_COLORS_V4)){
      window.OVERVIEW_COLORS_V4=themedPaletteProxyV29(window.OVERVIEW_COLORS_V4,window.OVERVIEW_COLORS_V4_DARK);
    }
  }

  /* ---- 主题切换后重绘（保持滚动位置），让图表系列色即时跟随 ---- */
  function rerenderPreservingScrollV29(){
    if(typeof render!=='function')return;
    try{
      var y=window.scrollY||0;
      render();
      if(y)try{window.scrollTo(0,y);}catch(e){}
    }catch(e){}
  }

  function applyThemeV29(id,silent){
    if(!THEME_CSS.hasOwnProperty(id))id='sunny';
    var root=document.documentElement;
    Object.keys(THEME_CSS).forEach(function(key){
      THEME_CSS[key].forEach(function(v){
        var name=v.split(':')[0];
        root.style.removeProperty(name);
      });
    });
    if(id!=='sunny'){
      THEME_CSS[id].forEach(function(v){
        var i=v.indexOf(':');
        root.style.setProperty(v.slice(0,i),v.slice(i+1));
      });
      root.dataset.theme=id;
    }else{
      delete root.dataset.theme;
    }
    try{localStorage.setItem(THEME_KEY_V29,id);}catch(e){}
    var tc=document.querySelector('meta[name="theme-color"]');
    if(tc)tc.setAttribute('content',themeMetaColorV29(id));
    document.querySelectorAll('.theme-opt-v29').forEach(function(b){
      b.classList.toggle('on',b.getAttribute('data-theme-opt-v29')===id);
    });
    if(!silent)rerenderPreservingScrollV29();
  }
  function initThemeV29(){
    var saved='sunny';
    try{saved=localStorage.getItem(THEME_KEY_V29)||'sunny';}catch(e){}
    applyThemeV29(saved,true);
  }

  /* ================= B) 图例取色 ================= */
  var LS_COLORS_V29='st_line_colors_v29';
  var CUSTOM_V29=(function(){try{return JSON.parse(localStorage.getItem(LS_COLORS_V29)||'{}')||{};}catch(e){return{};}})();
  var SWATCHES_V29=['#5d72e8','#2f9d76','#e59b45','#df5f68','#8f62db','#22a6b3','#e0567e','#6c87ff','#b8860b','#18212f'];
  /* sv31-nopalette(矩阵圆点等固定语义)不进入取色 */
  var LEGEND_CONTAINERS_V29='.legend:not(.sv31-nopalette),.overview-legend:not(.sv31-nopalette),.rank-legend-v7:not(.sv31-nopalette)';

  function saveColorsV29(){try{localStorage.setItem(LS_COLORS_V29,JSON.stringify(CUSTOM_V29));}catch(e){}}
  /* 显示/隐藏状态(只从取色框的勾选改,不在点击图例时直接切换,避免误触) */
  var LS_HIDE_V29='st_legend_hidden_v31';
  var HIDDEN_V29=(function(){try{return JSON.parse(localStorage.getItem(LS_HIDE_V29)||'{}')||{};}catch(e){return{};}})();
  function saveHiddenV29(){try{localStorage.setItem(LS_HIDE_V29,JSON.stringify(HIDDEN_V29));}catch(e){}}

  /* 把一个图表 SVG 的子元素按「path + 其后相邻的 circle」分组，组序与图例序一致 */
  function groupSvgSeriesV29(svg){
    var groups=[],cur=null;
    Array.prototype.forEach.call(svg.children,function(node){
      var t=String(node.tagName||'').toLowerCase();
      if(t==='path'||t==='polyline'){cur={line:node,dots:[]};groups.push(cur);}
      else if(t==='circle'&&cur)cur.dots.push(node);
    });
    return groups;
  }

  /* stroke 恢复：首次覆盖前缓存原值，取消自定义时可还原 */
  function setStrokeV29(el,c){
    if(el.getAttribute('data-orig-stroke')===null)el.setAttribute('data-orig-stroke',el.getAttribute('stroke')||'');
    el.setAttribute('stroke',c||el.getAttribute('data-orig-stroke')||'');
  }
  function escV29(s){return String(s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}

  /* 单科排名/原始分等模式没有图例 → 自动补一枚可点击的科目图例，让换色能力一致 */
  function ensureLegendV29(card){
    if(card.querySelector('.legend,.overview-legend,.rank-legend-v7'))return card.querySelector('.legend,.overview-legend,.rank-legend-v7');
    /* 统计页等其它页不自动造图例(只有首页单科模式需要),避免误加「总览」标签 */
    try{if(typeof state!=="undefined"&&state.page!=="home")return null;}catch(e){}
    var stage=card.querySelector('.chart-wrap');
    if(!stage)return null;
    var svg=stage.querySelector('svg');
    if(!svg)return null;
    var line=svg.querySelector('path,polyline');
    if(!line)return null;
    var existing=document.getElementById('autoLegendV29');
    if(existing)return existing;
    var label=(typeof state!=='undefined'&&state&&state.subject)?String(state.subject):'';
    if(!label)return null;
    var row=document.createElement('div');
    row.className='rank-legend-v7';
    row.id='autoLegendV29';
    var stroke=line.getAttribute('stroke')||'#18212f';
    var span=document.createElement('span');
    var dot=document.createElement('i');
    dot.setAttribute('style','background:'+escV29(stroke));
    span.appendChild(dot);
    span.appendChild(document.createTextNode(label));
    row.appendChild(span);
    stage.insertAdjacentElement('afterend',row);
    return row;
  }

  function applyCustomLineColorsV29(){
    document.querySelectorAll('.card').forEach(function(card){
      var svg=card.querySelector('.chart-wrap svg,.sv31-chart svg');
      if(!svg)return;
      var lg=ensureLegendV29(card);
      if(!lg)return;
      if(lg.classList&&lg.classList.contains('sv31-nopalette'))return; /* 固定语义图例(矩阵圆点):不换色不显隐 */
      var groups=groupSvgSeriesV29(svg);
      var items=Array.prototype.filter.call(lg.children,function(n){return String(n.tagName||'').toUpperCase()==='SPAN';});
      items.forEach(function(item,idx){
        var label=(item.textContent||'').replace('✎','').replace('🎨','').trim();
        item.title='点击更换颜色 / 显示';
        var c=CUSTOM_V29[label];
        var i=item.querySelector('i');
        if(c){
          item.classList.add('lg-custom-v29');
          if(i){
            if(i.__origBg===undefined)i.__origBg=i.style.background||'';
            i.style.background=c;
          }
          var g=groups[idx];
          if(g){
            setStrokeV29(g.line,c);
            g.dots.forEach(function(d){setStrokeV29(d,c);});
          }
        }else if(item.classList.contains('lg-custom-v29')){
          /* 取消自定义：还原缓存的原色 */
          item.classList.remove('lg-custom-v29');
          if(i&&i.__origBg!==undefined)i.style.background=i.__origBg;
          var g2=groups[idx];
          if(g2){
            setStrokeV29(g2.line,null);
            g2.dots.forEach(function(d){setStrokeV29(d,null);});
          }
        }
        /* 显示/隐藏:只由取色框「在图表中显示这条线」勾选驱动 */
        var hid=HIDDEN_V29[label]===true;
        item.classList.toggle('lg-hide-v29',hid);
        var g3=groups[idx];
        if(g3){
          var disp=hid?'none':'';
          g3.line.style.display=disp;
          g3.dots.forEach(function(d){d.style.display=disp;});
        }
      });
    });
  }

  /* 取色 popover（全局唯一实例） */
  var popElV29=null,popLabelV29=null;
  function ensurePickerV29(){
    if(popElV29)return;
    popElV29=document.createElement('div');
    popElV29.className='picker-pop-v29';
    popElV29.id='v29ColorPop';
    popElV29.innerHTML='<b></b><div class="pk-swatches-v29">'
      +SWATCHES_V29.map(function(c){return '<button type="button" data-c="'+c+'" style="background:'+c+'"></button>';}).join('')
      +'</div><label class="pk-show-v29"><input type="checkbox"> 在图表中显示这条线</label>'
      +'<div class="pk-row-v29"><input type="color" value="#5d72e8" title="自定义颜色"><button type="button" class="pk-reset-v29">恢复默认</button></div>';
    document.body.appendChild(popElV29);
    popElV29.addEventListener('click',function(e){
      var sw=e.target.closest('.pk-swatches-v29 button');
      if(sw&&popLabelV29){pickColorV29(sw.getAttribute('data-c'));closePickerV29();return;} /* 选色后自动关闭 */
      if(e.target.closest('.pk-reset-v29')&&popLabelV29){
        delete CUSTOM_V29[popLabelV29];saveColorsV29();applyCustomLineColorsV29();closePickerV29();
      }
    });
    /* 显示/隐藏勾选(不随选色关闭,由用户点×/外点收起) */
    popElV29.querySelector('.pk-show-v29 input').addEventListener('change',function(){
      if(!popLabelV29)return;
      HIDDEN_V29[popLabelV29]=!this.checked;
      saveHiddenV29();applyCustomLineColorsV29();
    });
    popElV29.querySelector('input[type=color]').addEventListener('change',function(){
      if(this.value)pickColorV29(this.value);
      closePickerV29(); /* 自定义取色后自动关闭 */
    });
    document.addEventListener('click',function(e){
      if(!popElV29.classList.contains('show'))return;
      if(e.target.closest('.picker-pop-v29')||e.target.closest(LEGEND_CONTAINERS_V29+' > *'))return;
      closePickerV29();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closePickerV29();});
  }
  function pickColorV29(c){
    if(!popLabelV29)return;
    CUSTOM_V29[popLabelV29]=c;saveColorsV29();applyCustomLineColorsV29();
    popElV29.querySelectorAll('.pk-swatches-v29 button').forEach(function(b){
      b.classList.toggle('on',(b.getAttribute('data-c')||'').toLowerCase()===String(c).toLowerCase());
    });
  }
  function openPickerV29(item,label){
    ensurePickerV29();
    popLabelV29=label;
    popElV29.querySelector('b').textContent='「'+label+'」的颜色';
    var sb=popElV29.querySelector('.pk-show-v29 input');
    if(sb)sb.checked=!(HIDDEN_V29[label]===true);
    var cur=CUSTOM_V29[label]||'#5d72e8';
    popElV29.querySelector('input[type=color]').value=cur.length===7?cur:'#5d72e8';
    popElV29.querySelectorAll('.pk-swatches-v29 button').forEach(function(b){
      b.classList.toggle('on',(b.getAttribute('data-c')||'').toLowerCase()===String(cur).toLowerCase());
    });
    popElV29.classList.add('show');
    var r=item.getBoundingClientRect(),pw=230,ph=180;
    var left=Math.min(Math.max(8,r.left),(window.innerWidth||1200)-pw-8);
    var top=r.bottom+8;
    if(top+ph>(window.innerHeight||800)-8)top=r.top-ph-8;
    popElV29.style.left=left+'px';
    popElV29.style.top=Math.max(8,top)+'px';
  }
  function closePickerV29(){if(popElV29)popElV29.classList.remove('show');popLabelV29=null;}

  function bindPickerV29(){
    if(bindPickerV29.done)return;
    bindPickerV29.done=true;
    document.addEventListener('click',function(e){
      var hit=e.target.closest('.legend > *,.overview-legend > *,.rank-legend-v7 > *');
      if(!hit)return;
      var label=(hit.textContent||'').replace('✎','').trim();
      if(label)openPickerV29(hit,label);
    });
  }

  /* ================= 外观入口（账号页卡片） ================= */
  function injectAppearanceCardV29(){
    var grid=document.querySelector('.account-grid');
    if(!grid||document.getElementById('appearanceCardV29'))return;
    var card=document.createElement('div');
    card.className='card account-card appearance-card-v29';
    card.id='appearanceCardV29';
    var cur=currentThemeV29();
    card.innerHTML='<h3 class="card-title">外观</h3><p class="card-sub">主题保存在本设备上，不影响其他设备。</p>'
      +'<div class="theme-opts-v29">'+THEMES_V29.map(function(t){
        return '<button type="button" class="theme-opt-v29'+(t.id===cur?' on':'')+'" data-theme-opt-v29="'+t.id+'"><i style="background:'+t.dot+'"></i>'+t.name+'</button>';
      }).join('')+'</div>';
    grid.appendChild(card);
    card.addEventListener('click',function(e){
      var b=e.target.closest('[data-theme-opt-v29]');
      if(b)applyThemeV29(b.getAttribute('data-theme-opt-v29'));
    });
  }

  /* ================= 产品 Logo ================= */
  var LOGO_SVG_V29='<svg viewBox="0 0 48 48" aria-hidden="true" style="width:58%;height:58%;display:block">'
    +'<polyline points="8,37 20,26 27,31 41,16" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<path d="M30.5 11.5 H42 V23" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'</svg>';
  function swapLogosV29(root){
    root=root||document;
    ['.logo','.brand-mark'].forEach(function(sel){
      root.querySelectorAll(sel).forEach(function(el){
        if((el.textContent||'').trim()==='↗'){
          el.textContent='';
          el.insertAdjacentHTML('beforeend',LOGO_SVG_V29);
        }
      });
    });
  }
  function injectFaviconV29(){
    if(document.getElementById('faviconV29'))return;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="13" fill="#1f2939"/><polyline points="8,37 20,26 27,31 41,16" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30.5 11.5H42V23" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var link=document.createElement('link');
    link.id='faviconV29';
    link.rel='icon';
    link.type='image/svg+xml';
    link.href='data:image/svg+xml,'+encodeURIComponent(svg);
    (document.head||document.documentElement).appendChild(link);
  }

  /* 科目行只保留真科目：历史版本把组合名 push 进了 SUBJECTS，这里在展示层剔除 */
  function pruneComboFromSubjectRowV29(){
    var modSet=null;
    try{
      var names=(typeof moduleNameSetV21==='function')?moduleNameSetV21():[];
      modSet=new Set(names||[]);
    }catch(e){return;}
    if(!modSet.size)return;
    document.querySelectorAll('.combo-chips-v25').forEach(function(rowEl){
      var label=rowEl.querySelector('.label');
      if(!label||String(label.textContent||'').indexOf('科目：')!==0)return;
      rowEl.querySelectorAll('button[data-subject]').forEach(function(b){
        if(modSet.has(b.getAttribute('data-subject'))&&b.parentNode)b.parentNode.removeChild(b);
      });
    });
  }

  /* ================= 渲染后钩子 ================= */
  function afterRenderV29(){
    applyCustomLineColorsV29();
    pruneComboFromSubjectRowV29();
    injectAppearanceCardV29();
    swapLogosV29();
    /* 旧的图例一次性 toast 已移除:v31 的可关闭提示条(带 ×)是唯一图例提示,
       避免新用户首日同时看到两条提示 */
  }

  var bindPageBeforeV29=(typeof bindPage==='function')?bindPage:null;
  bindPage=function bindPageV29(){
    if(bindPageBeforeV29)bindPageBeforeV29();
    try{ensurePickerV29();bindPickerV29();afterRenderV29();}catch(e){}
  };
  /* 登录页不经过 bindPage，单独包一层让 Logo 也生效 */
  var renderLoginBeforeV29=(typeof renderLogin==='function')?renderLogin:null;
  if(renderLoginBeforeV29){
    renderLogin=function renderLoginV29(){
      var r=renderLoginBeforeV29.apply(this,arguments);
      try{swapLogosV29();}catch(e){}
      return r;
    };
  }

  /* ================= 启动 ================= */
  injectStylesV29();
  injectFaviconV29();
  buildDarkPalettesV29();
  installThemedPalettesV29();
  initThemeV29();
  syncVersionV29();

  /* 测试钩子 */
  window.__v29={
    THEMES:THEMES_V29,
    THEME_CSS:THEME_CSS,
    applyTheme:applyThemeV29,
    currentTheme:currentThemeV29,
    themeMetaColor:themeMetaColorV29,
    groupSvgSeries:groupSvgSeriesV29,
    applyCustomLineColors:applyCustomLineColorsV29,
    swapLogos:swapLogosV29,
    afterRender:afterRenderV29,
    custom:function(){return CUSTOM_V29;},
    setCustom:function(k,v){if(v===null)delete CUSTOM_V29[k];else CUSTOM_V29[k]=v;saveColorsV29();},
    seriesPalette:function(){return window.OVERVIEW_COLORS?{total:window.OVERVIEW_COLORS[0],first:window.OVERVIEW_COLORS[1]}:null;}
  };
})();

/* ===== app-v30.js ===== */
/* app-v30.js · v4.1 数据导出
   账号页「数据」卡 → 全屏导出面板（范围 + 形式）
   形式：CSV 宽表 / TXT 纯文本 / JSON 完整备份 / 打印报告(PDF)
   全部客户端完成，不含密码与登录凭证。 */
(function(){

/* ================= 小工具 ================= */
function numV30(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return Number.isFinite(n)?n:null;}
function fmtV30(n){return n===null?'':String(n);}
function escV30(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pad2V30(n){return (n<10?'0':'')+n;}
function stampV30(d){d=d||new Date();return ''+d.getFullYear()+pad2V30(d.getMonth()+1)+pad2V30(d.getDate())+'-'+pad2V30(d.getHours())+pad2V30(d.getMinutes());}
function humanNowV30(){var d=new Date();return d.getFullYear()+'-'+pad2V30(d.getMonth()+1)+'-'+pad2V30(d.getDate())+' '+pad2V30(d.getHours())+':'+pad2V30(d.getMinutes());}
function appVersionV30(){var m=document.querySelector('meta[name="application-version"]');return (m&&m.getAttribute('content'))||'';}

function allExamsV30(){return (typeof state!=='undefined'&&state.allExams)||[];}
function categoryOptionsV30(){
  try{ if(typeof categoryOptionsV14==='function')return (categoryOptionsV14()||[]).slice(); }catch(e){}
  return [];
}
function modulesV30(){try{return (state.modulesV18||[]).slice();}catch(e){return [];}}
function subjectOrderV30(){
  var base=[];
  try{ (state.subjectConfigs||[]).forEach(function(c){base.push(c.name);}); }catch(e){}
  return base;
}
/* 范围过滤 + 时间正序（含隐藏考试，导出是完整数据） */
function collectV30(scope){
  var list=allExamsV30().filter(function(ex){
    if(scope==='__all__')return true;
    if(scope==='__none__')return !ex.grade_level;
    return ex.grade_level===scope;
  });
  list=list.slice().sort(function(a,b){
    var d=String(a.exam_date||'').localeCompare(String(b.exam_date||''));
    if(d)return d;
    return String(a.created_at||'').localeCompare(String(b.created_at||''));
  });
  return list;
}
function subjectsUnionV30(exams){
  var seen={},out=subjectOrderV30().slice();
  out.forEach(function(n){seen[n]=1;});
  exams.forEach(function(ex){Object.keys(ex.scores||{}).forEach(function(n){
    if(!seen[n]){seen[n]=1;out.push(n);}
  });});
  return out;
}
function sumTotalV30(ex,field){
  var sum=null;
  Object.values(ex.scores||{}).forEach(function(row){
    if(row&&row.excludeFromTotal)return;
    var v=numV30(row&&row[field]);
    if(v!==null)sum=(sum===null?v:sum+v);
  });
  return sum;
}

/* ================= 文件名 ================= */
function filenameV30(scopeLabel,ext){
  return '成绩轨迹_'+stampV30()+'_'+(scopeLabel||'全部')+'.'+ext;
}

/* ================= CSV 宽表 ================= */
function csvCellV30(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function buildCsvV30(exams,scopeLabel){
  var subjects=subjectsUnionV30(exams),mods=modulesV30();
  var head=['日期','考试名称','分类','结束日期'];
  subjects.forEach(function(s){head.push(s+' 目标',s+' 最终分',s+' 最终满分',s+' 原始分',s+' 原始满分',s+' 年排',s+' 年级人数',s+' 班排',s+' 班级人数',s+' 年位比%',s+' 班位比%',s+' 不计总分');});
  head.push('总分','原始总分','总排名(年)','年级人数(总)','总班排','班级人数(总)','总年位比%','总班位比%');
  mods.forEach(function(m){head.push(m.name+' 年排',m.name+' 年人数',m.name+' 班排',m.name+' 班人数');});
  var lines=[head.map(csvCellV30).join(',')];
  exams.forEach(function(ex){
    var row=[ex.exam_date||'',ex.name||'',ex.grade_level||'',ex.end_date||''];
    subjects.forEach(function(s){
      var r=(ex.scores||{})[s]||{};
      row.push(fmtV30(numV30(r.target)),fmtV30(numV30(r.actual)),r.max===''||r.max==null?'':fmtV30(numV30(r.max)),fmtV30(numV30(r.raw)),r.rawMax===''||r.rawMax==null?'':fmtV30(numV30(r.rawMax)),fmtV30(numV30(r.rank)),fmtV30(numV30(r.participants)),fmtV30(numV30(r.classRank)),fmtV30(numV30(r.classParticipants)),fmtV30(numV30(r.yearPositionPercent)),fmtV30(numV30(r.classPositionPercent)),r.excludeFromTotal?'是':'');
    });
    row.push(fmtV30(sumTotalV30(ex,'actual')),fmtV30(sumTotalV30(ex,'raw')),
      fmtV30(numV30(ex.total_rank)),fmtV30(numV30(ex.total_participants)),fmtV30(numV30(ex.total_class_rank)),fmtV30(numV30(ex.total_class_participants)),fmtV30(numV30(ex.total_year_position_percent)),fmtV30(numV30(ex.total_class_position_percent)));
    var ranks=(ex.moduleRanks)||{};
    mods.forEach(function(m){
      var r=ranks[m.id]||{};
      row.push(fmtV30(numV30(r.yearRank)),fmtV30(numV30(r.yearParticipants)),fmtV30(numV30(r.classRank)),fmtV30(numV30(r.classParticipants)));
    });
    lines.push(row.map(csvCellV30).join(','));
  });
  return '\uFEFF'+lines.join('\r\n')+'\r\n';
}

/* ================= TXT 纯文本 ================= */
function rankTextV30(rank,participants){
  var r=numV30(rank);if(r===null)return '';
  var p=numV30(participants);
  return r+(p!==null?'/'+p:'');
}
function buildTxtV30(exams,scopeLabel){
  var out=[];
  var account='';try{account=(state.user&&state.user.username)||'';}catch(e){}
  out.push('成绩轨迹 · 数据导出');
  out.push('账户 '+(account||'—')+' ｜ 范围 '+(scopeLabel||'全部')+' ｜ 共 '+exams.length+' 次考试');
  out.push('生成于 '+humanNowV30()+' · '+appVersionV30());
  if(!exams.length){out.push('');out.push('（该范围内暂无考试）');return out.join('\r\n')+'\r\n';}
  exams.forEach(function(ex,i){
    var bits=[ex.name||'未命名',ex.exam_date||''];
    if(ex.end_date)bits.push('至 '+ex.end_date);
    if(ex.grade_level)bits.push(ex.grade_level);
    if(ex.is_hidden)bits.push('已隐藏');
    out.push('');out.push('【'+(i+1)+'】'+bits.join(' · '));
    subjectsUnionV30([ex]).forEach(function(s){
      var r=(ex.scores||{})[s]||{},seg=[s];
      var a=numV30(r.actual),m=numV30(r.max);
      seg.push(a!==null?('最终 '+a+(m!==null?'/'+m:' 分')):'最终 —');
      var raw=numV30(r.raw);
      if(raw!==null){var rm=numV30(r.rawMax);seg.push('原始 '+raw+(rm!==null?'/'+rm:''));}
      var t=numV30(r.target);if(t!==null)seg.push('目标 '+t);
      var yr=rankTextV30(r.rank,r.participants);if(yr)seg.push('年排 '+yr);
      var cr=rankTextV30(r.classRank,r.classParticipants);if(cr)seg.push('班排 '+cr);
      var yp=numV30(r.yearPositionPercent);if(yp!==null)seg.push('年位比 前'+yp+'%');
      var cp=numV30(r.classPositionPercent);if(cp!==null)seg.push('班位比 前'+cp+'%');
      if(r.excludeFromTotal)seg.push('不计入总分');
      out.push('  '+seg.join(' ｜ '));
    });
    var ranks=ex.moduleRanks||{};
    modulesV30().forEach(function(mo){
      var r=ranks[mo.id];
      var cs=comboSumV30(ex,mo);
      var referenced=r||(ex.moduleIds||[]).some(function(x){return String(x)===String(mo.id);});
      if(!referenced&&cs.fin===null)return;
      var seg=['组合「'+mo.name+'」'];
      if(cs.fin!==null)seg.push('最终 '+cs.fin+(cs.fmax!==null?'/'+cs.fmax:' 分'));
      if(cs.raw!==null)seg.push('原始 '+cs.raw+(cs.rmax!==null?'/'+cs.rmax:''));
      var yr=rankTextV30(r&&r.yearRank,r&&r.yearParticipants);if(yr)seg.push('年排 '+yr);
      var cr=rankTextV30(r&&r.classRank,r&&r.classParticipants);if(cr)seg.push('班排 '+cr);
      if(seg.length>1)out.push('  '+seg.join(' ｜ '));
    });
    var tot=['—— 总分 '+fmtV30(sumTotalV30(ex,'actual')||'—')];
    var rawT=sumTotalV30(ex,'raw');if(rawT!==null)tot.push('原始总分 '+rawT);
    var tr=rankTextV30(ex.total_rank,ex.total_participants);if(tr)tot.push('年排 '+tr);
    var tcr=rankTextV30(ex.total_class_rank,ex.total_class_participants);if(tcr)tot.push('班排 '+tcr);
    var typ=numV30(ex.total_year_position_percent);if(typ!==null)tot.push('年位比 前'+typ+'%');
    var tcp=numV30(ex.total_class_position_percent);if(tcp!==null)tot.push('班位比 前'+tcp+'%');
    out.push('  '+tot.join(' ｜ '));
  });
  out.push('');out.push('由 成绩轨迹 导出 · 把每一次努力，连成一条向上的线');
  return out.join('\r\n')+'\r\n';
}

/* ================= JSON 完整备份 ================= */
function buildJsonV30(exams,scopeLabel){
  var account='',original='';
  try{account=(state.user&&state.user.username)||'';original=state.originalUsernameV19||account;}catch(e){}
  var payload={
    app:'score-tracker',
    version:appVersionV30(),
    exportedAt:new Date().toISOString(),
    account:account,
    originalUsername:original,
    scope:scopeLabel||'全部',
    examCount:exams.length,
    subjectConfigs:(typeof state!=='undefined'&&state.subjectConfigs)||[],
    category:(function(){try{return {label:categoryLabelV14(),options:categoryOptionsV14()};}catch(e){return null;}})(),
    modules:modulesV30(),
    exams:exams
  };
  return JSON.stringify(payload,null,2);
}

/* 通用折线图 SVG（打印内嵌，零依赖）
   opt:{n, xlabels[], yFmt(v), ptFmt(v), invert?, series:[{name,color,dash?,pts:[[i,v],…]}]} */
function lineChartV30(opt){
  var ptsAll=[];
  opt.series.forEach(function(s){s.pts.forEach(function(p){ptsAll.push(p[1]);});});
  if(!ptsAll.length||!opt.n)return '';
  var W=720,H=200,L=48,R=16,T=30,B=44;
  var lo=Math.min.apply(null,ptsAll),hi=Math.max.apply(null,ptsAll);
  var span=(hi-lo)||Math.max(1,Math.abs(hi)*0.1);
  lo-=span*0.18;hi+=span*0.18;
  function X(i){return L+(W-L-R)*(opt.n===1?0.5:i/(opt.n-1));}
  function Y(v){var f=(v-lo)/(hi-lo);return T+(H-T-B)*(opt.invert?f:1-f);}
  var grid='';
  for(var i=0;i<=4;i++){
    var tick=lo+(hi-lo)*i/4,yy=Y(tick);
    grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4" stroke-width="1"/>'
      +'<text x="'+(L-7)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9" fill="#98a1ae">'+opt.yFmt(tick)+'</text>';
  }
  var rot=opt.n>6;
  var xlab='';
  for(var k=0;k<opt.n;k++){
    var xx=X(k);
    xlab+='<text x="'+xx+'" y="'+(H-B+16)+'" text-anchor="'+(rot?'end':'middle')+'" font-size="9" fill="#98a1ae"'
      +(rot?' transform="rotate(-35 '+xx+' '+(H-B+16)+')"':'')+'>'+escV30(opt.xlabels[k]||'')+'</text>';
  }
  var body='';
  opt.series.forEach(function(s){
    if(s.pts.length<2)return;
    body+='<polyline points="'+s.pts.map(function(p){return X(p[0])+','+Y(p[1]);}).join(' ')
      +'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.main?2.6:1.9)+'" stroke-linecap="round" stroke-linejoin="round"'
      +(s.dash?' stroke-dasharray="'+s.dash+'"':'')+'/>';
  });
  opt.series.forEach(function(s){
    s.pts.forEach(function(p){
      body+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+(s.main?3.4:2.5)+'" fill="#fff" stroke="'+s.color+'" stroke-width="2"/>';
      if(s.main)body+='<text x="'+X(p[0])+'" y="'+(Y(p[1])-9)+'" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1c2430">'+escV30(opt.ptFmt(p[1]))+'</text>';
    });
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block" role="img">'
    +grid+body+xlab+'</svg>';
}
/* 各科·组合 得分率矩阵：行=系列，列=考试，色深=百分率（替代多线 spaghetti） */
function rateMatrixV30(exams){
  var mods=modulesV30(),modNames={};
  mods.forEach(function(m){modNames[m.name]=1;});
  var subjects=subjectsUnionV30(exams).filter(function(s){return !modNames[s];});
  /* 列：有任意得分率的考试（表头与表体共用同一列集） */
  var colExams=[];
  exams.forEach(function(ex){
    var has=subHasRateV30AnyV30(ex)||mods.some(function(m){return modHasRateV30(ex,m);});
    if(has)colExams.push(ex);
  });
  if(!colExams.length)return '';
  var cols=colExams.map(function(ex){return String(ex.exam_date||'').slice(5);});
  var rows=[{name:'最终总分',bold:true,rate:function(ex){var ft=sumTotalV30(ex,'actual'),fm=sumTotalV30(ex,'max');return rateOfTotalsV30(ft,fm);}}];
  subjects.forEach(function(s){
    rows.push({name:s,rate:function(ex){var r=(ex.scores||{})[s]||{},a=numV30(r.actual),m2=numV30(r.max);return (a!==null&&m2)?Math.round(a/m2*1000)/10:null;}});
  });
  mods.forEach(function(m){
    rows.push({name:m.name,rate:function(ex){var cs=comboSumV30(ex,m);return (cs.fin!==null&&cs.fmax)?Math.round(cs.fin/cs.fmax*1000)/10:null;}});
  });
  var head='<tr><th class="mh">科目</th>'+cols.map(function(c){return '<th>'+escV30(c)+'</th>';}).join('')+'</tr>';
  var body=rows.map(function(row){
    var tds=colExams.map(function(ex){
      var v=row.rate(ex);
      if(v===null)return '<td><span class="dim">—</span></td>';
      var alpha=Math.min(.82,.08+v/100*.74);
      return '<td><span class="cellp'+(row.bold?' boldp':'')+'" style="background:rgba(93,114,232,'+alpha.toFixed(2)+')">'+v+'</span></td>';
    }).join('');
    return '<tr><th class="rh'+(row.bold?' boldr':'')+'">'+escV30(row.name)+'</th>'+tds+'</tr>';
  }).join('');
  var cls='rate-mx'+(cols.length>8?' tight':'');
  return '<table class="'+cls+'"><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}
function subHasRateV30AnyV30(ex){
  return Object.values(ex.scores||{}).some(function(r){
    var a=numV30(r&&r.actual),m2=numV30(r&&r.max);
    return a!==null&&!!m2;
  });
}
function subHasRateV30(ex,s){
  var r=(ex.scores||{})[s]||{},a=numV30(r.actual),m2=numV30(r.max);
  return a!==null&&!!m2;
}
function modHasRateV30(ex,m){
  var cs=comboSumV30(ex,m);
  return cs.fin!==null&&!!cs.fmax;
}
/* 单序列排名小图（各自独立坐标轴） */
function rankLineChartV30(exams,key,title){
  var xs=[],pts=[];
  exams.forEach(function(ex){
    var v=numV30(ex[key]);
    if(v===null)return;
    xs.push(String(ex.exam_date||'').slice(5));
    pts.push([xs.length-1,v]);
  });
  if(!xs.length)return '';
  var svg=lineChartV30({
    n:xs.length,xlabels:xs,invert:true,
    yFmt:function(v){return String(Math.round(v));},
    ptFmt:function(v){return String(Math.round(v));},
    series:[{name:title,color:'#5d72e8',pts:pts,main:true}]
  });
  return '<div class="mini"><h4>'+escV30(title)+'</h4>'+svg+'</div>';
}
function rateOfTotalsV30(sum,num){
  return (sum!==null&&num!==null&&num>0)?Math.round(sum/num*1000)/10:null;
}
/* 总分得分率英雄图（单主线） */
function totalRateChartV30(exams){
  var xs=[],pts=[];
  exams.forEach(function(ex){
    var fr=rateOfTotalsV30(sumTotalV30(ex,'actual'),sumTotalV30(ex,'max'));
    if(fr===null)return;
    xs.push(String(ex.exam_date||'').slice(5));
    pts.push([xs.length-1,fr]);
  });
  if(!xs.length)return '';
  return lineChartV30({
    n:xs.length,xlabels:xs,
    yFmt:function(v){return Math.round(v)+'%';},
    ptFmt:function(v){return v+'%';},
    series:[{name:'最终总分',color:'#5d72e8',pts:pts,main:true}]
  });
}
function sumRawMaxV30(ex){
  var sum=null;
  Object.values(ex.scores||{}).forEach(function(row){
    if(!row||row.excludeFromTotal)return;
    var rm=numV30(row.rawMax);if(rm===null)rm=numV30(row.max);
    var rw=numV30(row.raw);
    if(rw!==null&&rm!==null)sum=(sum===null?rm:sum+rm);
  });
  return sum;
}

/* ================= 打印报告（PDF）· v2 排版 ================= */
function pctTextV30(a,m){
  var av=numV30(a),mv=numV30(m);
  if(av===null||!mv)return '';
  var p=Math.round(av/mv*1000)/10;
  return String(p);
}
/* 组合合计：按模块科目求和（最终/满分、原始/原始满分），无数据的科目跳过 */
function comboSumV30(ex,mo){
  var fin=null,fmax=null,raw=null,rmax=null;
  ((mo&&mo.subjects)||[]).forEach(function(s){
    var r=(ex.scores||{})[s];if(!r)return;
    var a=numV30(r.actual),mx=numV30(r.max);
    if(a!==null)fin=(fin===null?a:fin+a);
    if(mx!==null)fmax=(fmax===null?mx:fmax+mx);
    var rw=numV30(r.raw);
    if(rw!==null){
      raw=(raw===null?rw:raw+rw);
      var rm=numV30(r.rawMax);if(rm===null)rm=mx;
      if(rm!==null)rmax=(rmax===null?rm:rmax+rm);
    }
  });
  return {fin:fin,fmax:fmax,raw:raw,rmax:rmax};
}
function buildPrintHtmlV30(exams,scopeLabel){
  var account='';try{account=(state.user&&state.user.username)||'';}catch(e){}
  var dates=exams.map(function(e){return e.exam_date||'';}).filter(Boolean).sort();
  var span=dates.length?(dates[0]===dates[dates.length-1]?dates[0]:dates[0]+' ~ '+dates[dates.length-1]):'—';
  var last=[].concat(exams).sort(function(a,b){return String(b.exam_date||'').localeCompare(String(a.exam_date||''));})[0];
  var lastTotal=last?fmtV30(sumTotalV30(last,'actual')):'—';
  function logoSvg(size){
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 48 48" style="display:block">'
      +'<rect width="48" height="48" rx="13" fill="#1f2939"/>'
      +'<polyline points="8,37 20,26 27,31 41,16" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'
      +'<path d="M30.5 11.5H42 V23" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  /* —— 概览表行 —— */
  var overviewRows=exams.map(function(ex){
    return '<tr><td class="c-date">'+escV30(ex.exam_date||'—')+'</td>'
      +'<td><b>'+escV30(ex.name||'未命名')+'</b>'+(ex.is_hidden?'<span class="hid">已隐藏</span>':'')+'</td>'
      +'<td>'+(ex.grade_level?'<span class="pill">'+escV30(ex.grade_level)+'</span>':'<span class="dim">—</span>')+'</td>'
      +'<td class="num strong">'+(fmtV30(sumTotalV30(ex,'actual'))||'—')+'</td>'
      +'<td class="num">'+(fmtV30(sumTotalV30(ex,'raw'))||'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(ex.total_rank,ex.total_participants))||'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(ex.total_class_rank,ex.total_class_participants))||'—')+'</td></tr>';
  }).join('');
  /* —— 逐考试明细块 —— */
  function subjectRow(s,r){
    var a=numV30(r.actual),m=numV30(r.max);
    if(a===null&&numV30(r.target)===null&&numV30(r.rank)===null&&numV30(r.classRank)===null)return '';
    var p=pctTextV30(a,m);
    var reached=(a!==null&&numV30(r.target)!==null)?a>=numV30(r.target):null;
    var fill=reached===null?'#5d72e8':(reached?'#2f9d76':'#e59b45');
    return '<tr>'
      +'<td class="s-name"><b>'+escV30(s)+'</b>'+(r.excludeFromTotal?'<span class="dim">（不计总分）</span>':'')+'</td>'
      +'<td class="num">'+(fmtV30(numV30(r.target))||'—')+(reached!==null?(reached?' <i class="ok">达标</i>':' <i class="miss">差'+fmtV30(numV30(r.target)-a)+'</i>'):'')+'</td>'
      +'<td class="num strong">'+(a!==null?a:'—')+'<span class="dim">'+(m!==null?'/'+m:'')+'</span></td>'
      +'<td class="rate">'+(p?'<span class="track"><span class="fill" style="width:'+p+'%;background:'+fill+'"></span></span><span class="lab">'+p+'%</span>':'—')+'</td>'
      +'<td class="num">'+(r.raw!=='' && r.raw!=null?escV30(String(r.raw))+(numV30(r.rawMax)!==null?'<span class="dim">/'+r.rawMax+'</span>':''):'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(r.rank,r.participants))||'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(r.classRank,r.classParticipants))||'—')+'</td></tr>';
  }
  var blocks=exams.map(function(ex,i){
    var rows=subjectsUnionV30([ex]).map(function(s){return subjectRow(s,(ex.scores||{})[s]||{});}).filter(Boolean).join('');
    if(!rows)rows='<tr><td colspan="7" class="dim">本次考试暂无成绩数据</td></tr>';
    var comboLines='';
    var ranks=ex.moduleRanks||{};
    modulesV30().forEach(function(mo){
      var r=ranks[mo.id];
      var cs=comboSumV30(ex,mo);
      var referenced=r||(ex.moduleIds||[]).some(function(x){return String(x)===String(mo.id);});
      if(!referenced&&cs.fin===null)return;
      var seg=[];
      if(cs.fin!==null)seg.push('最终 '+cs.fin+(cs.fmax!==null?'/'+cs.fmax:' 分'));
      if(cs.raw!==null)seg.push('原始 '+cs.raw+(cs.rmax!==null?'/'+cs.rmax:''));
      var yr=rankTextV30(r&&r.yearRank,r&&r.yearParticipants);if(yr)seg.push('年排 '+escV30(yr));
      var cr=rankTextV30(r&&r.classRank,r&&r.classParticipants);if(cr)seg.push('班排 '+escV30(cr));
      if(seg.length)comboLines+='<div class="combo">组合「'+escV30(mo.name)+'」　'+seg.join('　·　')+'</div>';
    });
    var totBits=[];
    var ft=sumTotalV30(ex,'actual');if(ft!==null)totBits.push('总分 <b>'+ft+'</b>');
    var rt=sumTotalV30(ex,'raw');if(rt!==null)totBits.push('原始总分 '+rt);
    var yp=numV30(ex.total_year_position_percent);if(yp!==null)totBits.push('年位比 前'+yp+'%');
    var tcp=numV30(ex.total_class_position_percent);if(tcp!==null)totBits.push('班位比 前'+tcp+'%');
    return '<section class="exam-block">'
      +'<div class="block-head"><span class="idx">'+(i+1)+'</span>'
      +'<b class="b-name">'+escV30(ex.name||'未命名')+'</b>'
      +(ex.is_hidden?'<span class="hid">已隐藏</span>':'')
      +'<span class="b-date">'+escV30(ex.exam_date||'')+(ex.end_date?' ~ '+escV30(ex.end_date):'')+'</span>'
      +(ex.grade_level?'<span class="pill">'+escV30(ex.grade_level)+'</span>':'')
      +'</div>'
      +'<table><thead><tr><th>科目</th><th>目标</th><th>得分</th><th>得分率</th><th>原始分</th><th>年排</th><th>班排</th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
      +(comboLines||'')
      +(totBits.length?'<div class="totline">'+totBits.join('　·　')+'</div>':'')
      +'</section>';
  }).join('');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>成绩轨迹 · 成绩报告</title><style>'
    +'@page{size:A4;margin:13mm 12mm}'
    +'*,*::before,*::after{-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body{font:12px/1.55 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1c2430;margin:0;max-width:186mm}'
    +'.rep-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5d72e8;padding-bottom:12px}'
    +'.brand{display:flex;gap:11px;align-items:center}'
    +'.brand b{font-size:19px;display:block;letter-spacing:.5px}'
    +'.brand small{color:#6d7787;font-size:10px;display:block;margin-top:1px}'
    +'.meta{text-align:right;font-size:10.5px;color:#6d7787;line-height:1.8}'
    +'.meta b{color:#1c2430}'
    +'.stats{display:flex;gap:0;border:1px solid #e6eaf1;border-radius:10px;margin:14px 0 18px;overflow:hidden}'
    +'.stat{flex:1;text-align:center;padding:9px 4px;border-right:1px solid #e6eaf1}'
    +'.stat:last-child{border-right:0}'
    +'.stat b{font-size:15px;display:block}.stat span{font-size:9.5px;color:#6d7787}'
    +'h2.sec{font-size:13px;margin:20px 0 8px;color:#1c2430}'
    +'h2.sec::after{content:"";display:block;width:26px;height:3px;background:#5d72e8;border-radius:2px;margin-top:3px}'
    +'table{width:100%;border-collapse:collapse;font-size:11px}'
    +'th{text-align:left;font-size:9.5px;color:#6d7787;font-weight:600;border-bottom:1.5px solid #d8dde6;padding:4px 6px}'
    +'td{padding:6px;border-bottom:1px solid #edf0f4;vertical-align:middle}'
    +'tr:last-child td{border-bottom:0}'
    +'.ov td{padding:7px 6px}.ov td.c-date{color:#6d7787;font-size:10.5px;width:74px}'
    +'.num{font-variant-numeric:tabular-nums}.strong{font-weight:700;font-size:12px}'
    +'.dim{color:#98a1ae;font-weight:400;font-size:10px}'
    +'.hid{background:#fdeaea;color:#b3424a;font-size:9px;border-radius:5px;padding:1px 5px;margin-left:5px;vertical-align:1px}'
    +'.pill{display:inline-block;border:1px solid #c9d4f5;color:#4356c9;font-size:9.5px;border-radius:999px;padding:1px 8px}'
    +'.rate{white-space:nowrap;font-size:10px;color:#6d7787}'
    +'.rate .lab{display:inline-block;min-width:32px;text-align:left;vertical-align:1px}'
    +'.track{display:inline-block;width:52px;height:5px;background:#eef0f4;border-radius:3px;margin-right:5px;vertical-align:1px;overflow:hidden}'
    +'.fill{display:block;height:100%;border-radius:3px}'
    +'i.ok,i.miss{font-style:normal;font-size:9px;border-radius:4px;padding:0 4px;vertical-align:1px}'
    +'i.ok{color:#2f9d76;background:#e8f5ee}'
    +'i.miss{color:#b26a12;background:#fdf3e4}'
    +'.chart-wrap{border:1px solid #e6eaf1;border-radius:10px;padding:8px 6px 2px}'
    +'.chart-note{font-size:9.5px;color:#98a1ae;margin-top:4px}'
    +'.rate-mx{width:100%;border-collapse:collapse;font-size:9.5px}'
    +'.rate-mx th{font-weight:600;color:#6d7787;font-size:9px;border-bottom:1px solid #e6eaf1;padding:5px 6px;text-align:center}'
    +'.rate-mx .mh{text-align:left;width:76px}'
    +'.rate-mx td{border-bottom:1px solid #f0f2f6;padding:4px 6px;text-align:center;font-variant-numeric:tabular-nums}'
    +'.rate-mx .rh{text-align:left;color:#1c2430;font-weight:650;font-size:10px;white-space:nowrap}'
    +'.rate-mx .boldr{font-weight:800}'
    +'.rate-mx.tight th,.rate-mx.tight td{padding:4px 3px;font-size:8.5px}'
    +'.cellp{display:inline-block;min-width:30px;border-radius:5px;padding:1px 4px;color:#fff;font-size:9px}'
    +'.cellp.boldp{font-weight:800;font-size:9.5px}'
    +'.rank-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px}'
    +'.mini{border:1px solid #e6eaf1;border-radius:10px;padding:8px 8px 3px}'
    +'.mini h4{margin:0 0 2px;font-size:11px}'
    +'.exam-block{margin:0 0 16px;page-break-inside:avoid;border:1px solid #e6eaf1;border-radius:10px;padding:12px 13px 10px}'
    +'.block-head{display:flex;align-items:center;gap:7px;margin-bottom:8px;flex-wrap:wrap}'
    +'.idx{width:17px;height:17px;border-radius:6px;background:#eef1ff;color:#4356c9;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none}'
    +'.b-name{font-size:12.5px}.b-date{color:#6d7787;font-size:10.5px}'
    +'.combo{font-size:10px;color:#6d7787;margin-top:5px}'
    +'.totline{font-size:11px;margin-top:6px;color:#1c2430}.totline b{font-size:13px}'
    +'.foot{margin-top:22px;padding-top:10px;border-top:1px solid #e6eaf1;text-align:center;color:#98a1ae;font-size:9.5px}'
    +'</style></head><body>'
    +'<div class="rep-head">'
    +'<div class="brand">'+logoSvg(40)+'<div><b>成绩轨迹</b><small>成绩报告 · Score Report</small></div></div>'
    +'<div class="meta">账户 <b>'+escV30(account||'—')+'</b><br>范围 <b>'+escV30(scopeLabel||'全部')+'</b> ｜ 生成于 '+humanNowV30()+'</div>'
    +'</div>'
    +'<div class="stats">'
    +'<div class="stat"><b>'+exams.length+'</b><span>次考试</span></div>'
    +'<div class="stat"><b style="font-size:11.5px;line-height:22px">'+escV30(span)+'</b><span>时间跨度</span></div>'
    +'<div class="stat"><b>'+(lastTotal==='—'?'—':lastTotal)+'</b><span>最近总分</span></div>'
    +'<div class="stat"><b style="font-size:11.5px;line-height:22px">'+escV30((function(){var o=[];exams.forEach(function(e){if(e.grade_level&&o.indexOf(e.grade_level)<0)o.push(e.grade_level);});return o.length?o.join(' / '):'—';})())+'</b><span>包含分类</span></div>'
    +'</div>'
    +(function(){var c=totalRateChartV30(exams);return c?('<h2 class="sec">得分率趋势</h2><div class="chart-wrap">'+c+'</div>'):'';})()
    +(function(){var m=rateMatrixV30(exams);return m?('<h2 class="sec">各科 · 组合 得分率</h2><div class="mx-wrap">'+m+'</div><div class="chart-note">数值为得分率（%），色深代表高低；空白表示该次考试未填此科目。</div>'):'';})()
    +(function(){var a=rankLineChartV30(exams,'total_rank','年排'),b=rankLineChartV30(exams,'total_class_rank','班排');if(!a&&!b)return '';return '<h2 class="sec">排名趋势</h2><div class="rank-grid">'+a+b+'</div><div class="chart-note">名次越小越好 · 线向上表示进步；两图各自独立刻度。</div>';})()
    +(exams.length?('<h2 class="sec">成绩总览</h2>'
    +'<table class="ov"><thead><tr><th>日期</th><th>考试</th><th>分类</th><th>总分</th><th>原始总分</th><th>年排</th><th>班排</th></tr></thead><tbody>'+overviewRows+'</tbody></table>'
    +'<h2 class="sec">各科明细</h2>'+blocks)
    :'<div style="text-align:center;color:#98a1ae;padding:40px 0">该范围内暂无考试</div>')
    +'<div class="foot">来自 成绩轨迹 '+escV30(appVersionV30())+' · 把每一次努力，连成一条向上的线</div>'
    +'</body></html>';
}

/* ================= 下载 ================= */
function downloadV30(name,content,mime){
  try{
    var blob=new Blob([content],{type:mime||'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){a.parentNode&&a.parentNode.removeChild(a);URL.revokeObjectURL(url);},1200);
    return;
  }catch(e){}
  try{
    var a2=document.createElement('a');
    a2.href='data:'+(mime||'text/plain')+';charset=utf-8,'+encodeURIComponent(content);
    a2.download=name;document.body.appendChild(a2);a2.click();
    a2.parentNode&&a2.parentNode.removeChild(a2);
  }catch(e2){}
}

/* ================= 打印 ================= */
function printReportV30(html){
  var frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc=html;
  frame.onload=function(){
    try{frame.contentWindow.focus();frame.contentWindow.print();}catch(e){}
    setTimeout(function(){frame.parentNode&&frame.parentNode.removeChild(frame);},60000);
  };
  document.body.appendChild(frame);
}

/* ================= 导出面板 ================= */
var FORMATS_V30=[
  {id:'pdf', icon:'🖨️', name:'打印报告 PDF', sub:'A4 排版报告，浏览器打印对话框里存 PDF', who:'推荐 · 正式材料', ext:'pdf', mime:'', rec:true},
  {id:'csv', icon:'📄', name:'Excel 可开的表格', sub:'CSV 成绩宽表，双击即开不乱码', who:'表格', ext:'csv', mime:'text/csv;charset=utf-8'},
  {id:'txt', icon:'📃', name:'纯文本成绩单', sub:'逐考试分块，能直接粘贴进微信', who:'万能打开', ext:'txt', mime:'text/plain;charset=utf-8'},
  {id:'json',icon:'💾', name:'完整备份', sub:'全量保真，换机/存档，将来可导入恢复', who:'技术', ext:'json', mime:'application/json;charset=utf-8'}
];
var sheetStateV30={scope:'__all__',format:'pdf',el:null};

function scopeOptionsV30(){
  var opts=[{v:'__all__',label:'全部'}];
  categoryOptionsV30().forEach(function(v){opts.push({v:v,label:v});});
  if(allExamsV30().some(function(e){return !e.grade_level;}))opts.push({v:'__none__',label:'未分类'});
  return opts;
}
function scopeLabelV30(v){
  var hit=scopeOptionsV30().filter(function(o){return o.v===v;})[0];
  return hit?hit.label:'全部';
}

function renderSheetV30(){
  var el=sheetStateV30.el;if(!el)return;
  el.querySelectorAll('[data-scope-v30]').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('data-scope-v30')===sheetStateV30.scope);
  });
  el.querySelectorAll('[data-fmt-v30]').forEach(function(b){
    var f=FORMATS_V30.filter(function(x){return x.id===b.getAttribute('data-fmt-v30');})[0];
    b.classList.toggle('on',f&&f.id===sheetStateV30.format);
    b.classList.toggle('rec',!!(f&&f.rec));
  });
  var f=FORMATS_V30.filter(function(x){return x.id===sheetStateV30.format;})[0]||FORMATS_V30[0];
  var note=el.querySelector('#exportNoteV30');
  if(note)note.textContent='将导出：'+scopeLabelV30(sheetStateV30.scope)+' · '+f.name+' · 文件名 '+filenameV30(scopeLabelV30(sheetStateV30.scope),f.ext);
  var go=el.querySelector('.export-go-v30');
  if(go)go.textContent=f.id==='pdf'?'🖨️ 打开打印报告':'⬇︎ 导出 '+f.ext.toUpperCase();
}

function doExportV30(){
  var scope=sheetStateV30.scope,label=scopeLabelV30(scope);
  var exams=collectV30(scope);
  var f=FORMATS_V30.filter(function(x){return x.id===sheetStateV30.format;})[0];
  if(!f)return;
  if(!exams.length&&typeof toast==='function'){toast('该范围内还没有考试');return;}
  if(f.id==='pdf'){
    printReportV30(buildPrintHtmlV30(exams,label));
    if(window.__stTrack)window.__stTrack('export_done',{format:'pdf',scope:label,examCount:exams.length});
  }else{
    var content=f.id==='csv'?buildCsvV30(exams,label):f.id==='txt'?buildTxtV30(exams,label):buildJsonV30(exams,label);
    downloadV30(filenameV30(label,f.ext),content,f.mime);
    if(window.__stTrack)window.__stTrack('export_done',{format:f.id,scope:label,examCount:exams.length});
  }
  if(typeof toast==='function')toast(f.id==='pdf'?'已打开打印窗口，可选「另存为 PDF」':'已导出 '+filenameV30(label,f.ext));
}

function openExportSheetV30(){
  if(document.getElementById('exportOverlayV30'))return;
  if(window.__stTrack)window.__stTrack('export_open',{});
  var ov=document.createElement('div');
  ov.className='export-overlay-v30';ov.id='exportOverlayV30';
  var chips=scopeOptionsV30().map(function(o){
    return '<button type="button" class="chip" data-scope-v30="'+escV30(o.v)+'">'+escV30(o.label)+'</button>';
  }).join('');
  var fmts=FORMATS_V30.map(function(f){
    return '<button type="button" class="export-fmt-v30" data-fmt-v30="'+f.id+'">'
      +'<span class="xf-ico-v30">'+f.icon+'</span><span class="xf-body-v30"><b>'+f.name+'</b><small>'+f.sub+'</small><span class="xf-who-v30">'+f.who+'</span></span></button>';
  }).join('');
  ov.innerHTML='<div class="export-sheet-v30" role="dialog" aria-modal="true" aria-label="导出数据">'
    +'<div class="export-head-v30"><b>导出数据</b><button type="button" class="close-btn export-close-v30" aria-label="关闭">×</button></div>'
    +'<div class="export-grp-v30">范围</div><div class="export-chips-v30">'+chips+'</div>'
    +'<div class="export-grp-v30">导出形式</div><div class="export-fmts-v30">'+fmts+'</div>'
    +'<div class="export-note-v30" id="exportNoteV30"></div>'
    +'<button type="button" class="primary export-go-v30">⬇︎ 导出</button>'
    +'<p class="export-foot-v30">全程在你的设备上完成，不经服务器；导出内容不含密码与登录凭证。</p>'
    +'</div>';
  document.body.appendChild(ov);
  sheetStateV30.el=ov;
  ov.addEventListener('click',function(e){
    if(e.target===ov)return closeExportSheetV30();
    var sc=e.target.closest('[data-scope-v30]');
    if(sc){sheetStateV30.scope=sc.getAttribute('data-scope-v30');return renderSheetV30();}
    var fm=e.target.closest('[data-fmt-v30]');
    if(fm){sheetStateV30.format=fm.getAttribute('data-fmt-v30');return renderSheetV30();}
    if(e.target.closest('.export-close-v30'))return closeExportSheetV30();
    if(e.target.closest('.export-go-v30'))return doExportV30();
  });
  document.addEventListener('keydown',escListenerV30);
  renderSheetV30();
}
function escListenerV30(e){if(e.key==='Escape')closeExportSheetV30();}
function closeExportSheetV30(){
  var ov=document.getElementById('exportOverlayV30');
  if(ov)ov.remove();
  sheetStateV30.el=null;
  document.removeEventListener('keydown',escListenerV30);
}

/* ================= 账号页「数据」卡 ================= */
function injectDataCardV30(){
  var grid=document.querySelector('.account-grid');
  if(!grid||document.getElementById('dataCardV30'))return;
  var card=document.createElement('div');
  card.className='card account-card data-card-v30';
  card.id='dataCardV30';
  card.innerHTML='<h3 class="card-title">数据</h3><p class="card-sub">导出成绩与设置，全部在本机完成。</p>'
    +'<div class="data-actions-v30">'
    +'<button type="button" class="secondary" id="exportDataV30">⬇︎ 导出数据</button>'
    +'<button type="button" class="secondary" id="importDataV30" disabled title="即将支持">⬆︎ 导入恢复<span class="soon-v30">即将支持</span></button>'
    +'</div>';
  grid.appendChild(card);
  card.addEventListener('click',function(e){
    if(e.target.closest('#exportDataV30'))openExportSheetV30();
  });
}

/* ================= 样式 ================= */
function injectStylesV30(){
  if(document.getElementById('app-v30-style'))return;
  var css=[
    '.export-overlay-v30{position:fixed;inset:0;background:rgba(15,20,31,.45);z-index:90;display:flex;align-items:flex-end;justify-content:center;animation:expFadeV30 .18s ease}',
    '@keyframes expFadeV30{from{opacity:0}to{opacity:1}}',
    '.export-sheet-v30{width:min(520px,100%);max-height:92vh;overflow:auto;background:var(--panel-solid,#fff);border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));animation:expUpV30 .22s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes expUpV30{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}',
    '@media(min-width:720px){.export-overlay-v30{align-items:center}.export-sheet-v30{border-radius:20px;padding:22px 24px}}',
    '.export-head-v30{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}',
    '.export-head-v30 b{font-size:16px}',
    '.export-grp-v30{font-size:11px;font-weight:800;color:var(--muted,#788392);margin:14px 0 7px}',
    '.export-chips-v30{display:flex;gap:7px;flex-wrap:wrap}',
    '.export-chips-v30 .chip.on{background:var(--text,#18212f);border-color:var(--text,#18212f);color:var(--on-surface,#fff)}',
    '.export-fmts-v30{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '@media(max-width:380px){.export-fmts-v30{grid-template-columns:1fr}}',
    '.export-fmt-v30{display:flex;gap:10px;align-items:flex-start;text-align:left;border:1.5px solid var(--line,#e6e9ef);background:var(--chip-bg,#fff);border-radius:13px;padding:11px 12px;cursor:pointer;font-family:inherit;color:var(--text,#18212f)}',
    '.export-fmt-v30.on{border-color:var(--accent,#5d72e8);background:var(--accent-soft,#f6f7ff)}',
    '.export-fmt-v30.rec{border-color:var(--accent,#5d72e8);box-shadow:inset 0 0 0 1px var(--accent,#5d72e8)}',
    '.export-fmt-v30 .xf-ico-v30{font-size:17px;line-height:1.3}',
    '.xf-body-v30{min-width:0}',
    '.xf-body-v30 b{display:block;font-size:12.5px;margin-bottom:1px}',
    '.xf-body-v30 small{display:block;font-size:10.5px;color:var(--muted,#88919f);line-height:1.45}',
    '.xf-who-v30{display:inline-block;font-size:9px;font-weight:700;color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);border-radius:5px;padding:1px 6px;margin-top:5px}',
    '.export-note-v30{background:var(--cell,#f6f8fc);border:1px dashed var(--line-soft,#d7dde8);border-radius:11px;padding:9px 11px;font-size:11px;color:var(--muted,#5a6478);margin-top:13px;overflow-wrap:anywhere}',
    '.export-go-v30{width:100%;margin-top:11px;padding:12px;font-size:14px;border-radius:12px}',
    '.export-foot-v30{text-align:center;font-size:10px;color:var(--muted,#b3bcc9);margin:9px 0 0}',
    '.data-card-v30 .data-actions-v30{display:grid;gap:8px;margin-top:13px}',
    '.data-card-v30 .secondary{width:100%}',
    '.soon-v30{float:right;font-size:10px;color:var(--muted,#98a1ae);font-weight:400}',
    'html[data-theme="night"] .export-fmt-v30 .xf-who-v30{filter:brightness(1.15)}'
  ].join('\n');
  var st=document.createElement('style');
  st.id='app-v30-style';
  st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 接线 ================= */
var bindPageBeforeV30=(typeof bindPage==='function')?bindPage:null;
bindPage=function bindPageV30(){
  if(bindPageBeforeV30)bindPageBeforeV30();
  try{injectDataCardV30();}catch(e){}
};

/* 启动 */
injectStylesV30();

/* 测试钩子 */
window.__v30={
  collect:collectV30,
  buildCsv:buildCsvV30,
  buildTxt:buildTxtV30,
  buildJson:buildJsonV30,
  buildPrintHtml:buildPrintHtmlV30,
  filename:filenameV30,
  openSheet:openExportSheetV30,
  closeSheet:closeExportSheetV30,
  injectDataCard:injectDataCardV30,
  formats:FORMATS_V30
};
})();

/* ===== app-v31.js ===== */
/* app-v31.js · v4.1 交互与运营层
   1) 图例换色提示升级：一次性 toast → 手动关闭的提示条；图例旁常驻小灰字
   2) 版本落后检测：同源比对 meta 版本号，弹一句话更新条 + 立即刷新
   3) 关键行为埋点：换色/主题/导出/更新，复用 track_event 通道 */
(function(){

/* ================= 埋点 ================= */
function appVersionV31(){var m=document.querySelector('meta[name="application-version"]');return (m&&m.getAttribute('content'))||'';}
function currentPageV31(){
  try{
    var act=document.querySelector('[data-page].active');
    if(act&&act.dataset.page)return act.dataset.page;
    if(document.querySelector('.auth-page'))return 'login';
  }catch(e){}
  return 'unknown';
}
/* 委托优先:telemetry-feedback 已提供富上下文追踪器(visitor/utm/屏幕等),直接复用;
   仅当其不存在时才用这里的精简兜底。此前本文件直接覆盖 __stTrack,导致埋点上下文变瘦 */
var __stTrackPrevV31=(typeof window.__stTrack==='function')?window.__stTrack:null;
window.__stTrack=function stTrackV31(eventType,metadata){
  if(__stTrackPrevV31){try{return __stTrackPrevV31(eventType,metadata);}catch(e){}}
  try{
    var API='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
    var c={
      eventId:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),
      sessionId:sessionStorage.getItem('st_session_id')||'',
      visitorId:localStorage.getItem('st_visitor_id')||'',
      clientTime:new Date().toISOString(),
      pathname:location.pathname,
      appPage:currentPageV31(),
      appVersion:appVersionV31()
    };
    var body=JSON.stringify({action:'track_event',token:localStorage.getItem('st_token')||'',eventType:eventType,context:c,metadata:metadata||{}});
    var f=window.fetch.bind(window);
    f(API,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:body}).catch(function(){});
  }catch(e){}
};

/* ================= 样式 ================= */
function injectStylesV31(){
  if(document.getElementById('app-v31-style'))return;
  var css=[
    '.tip-banner-v31{position:fixed;left:50%;transform:translateX(-50%);top:calc(14px + env(safe-area-inset-top));z-index:95;display:flex;align-items:center;gap:10px;background:var(--panel-solid,#fff);color:var(--text,#18212f);border:1px solid var(--line,#e6e9ef);border-radius:14px;padding:11px 12px 11px 14px;box-shadow:var(--nav-shadow,0 10px 35px rgba(28,39,63,.16));max-width:min(430px,calc(100vw - 24px));font-size:12.5px;animation:v31drop .25s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes v31drop{from{transform:translate(-50%,-14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}',
    '.tip-banner-v31 .t-ico{font-size:16px;flex:none}',
    '.tip-banner-v31 .t-x{flex:none;border:0;background:var(--cell,#f3f4f7);width:26px;height:26px;border-radius:8px;font-size:14px;color:var(--muted,#667085);cursor:pointer;font-family:inherit}',
    '.lg-hint-v31{font-size:10px;color:var(--muted,#98a1ae);opacity:.75;margin-left:2px;white-space:nowrap;pointer-events:none;-webkit-user-select:none;user-select:none}',
    '.stat-rank-v31{font-size:11px;color:var(--muted,#98a1ae);margin-top:3px;font-weight:600;font-variant-numeric:tabular-nums}',
    '.update-bar-v31{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:96;display:flex;align-items:center;gap:10px;background:var(--panel-solid,#fff);color:var(--text,#18212f);border:1px solid var(--accent,#5d72e8);border-radius:14px;padding:11px 12px 11px 14px;box-shadow:var(--nav-shadow,0 10px 35px rgba(28,39,63,.2));max-width:min(470px,calc(100vw - 24px));font-size:12.5px;animation:v31rise .3s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes v31rise{from{transform:translate(-50%,14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}',
    '.update-bar-v31 .u-x{border:0;background:transparent;color:var(--muted,#98a1ae);font-size:15px;cursor:pointer;padding:2px 4px;font-family:inherit;flex:none}',
    /* 首页趋势图例行:手机端可左右滑动(含惯性滚动),不改布局不加滚动条 */
    '.trend-legend-row-v25{display:flex;gap:8px;overflow-x:auto;padding:0 0 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain;cursor:grab}',
    '.trend-legend-row-v25::-webkit-scrollbar{display:none}',
    '.trend-legend-row-v25 .legend{flex-wrap:nowrap;white-space:nowrap;margin-top:0}',
    '.trend-legend-row-v25 .lg-hint-v31{margin-left:4px}',
    '.overview-legend{display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;padding-bottom:2px}',
    '.overview-legend::-webkit-scrollbar{display:none}',
    '.overview-legend .lg-hint-v31{margin-left:2px;flex:none}'
  ].join('\n');
  var st=document.createElement('style');
  st.id='app-v31-style';
  st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 提示条（手动关闭）================= */
function showColorTipBannerV31(){
  if(document.getElementById('colorTipBannerV31'))return;
  var b=document.createElement('div');
  b.className='tip-banner-v31';b.id='colorTipBannerV31';
  b.innerHTML='<span class="t-ico">🎨</span><span>点击图表下方的<b>图例</b>，可以更换每条线的颜色</span>'
    +'<button type="button" class="t-x" aria-label="关闭">×</button>';
  document.body.appendChild(b);
  b.querySelector('.t-x').addEventListener('click',function(){
    b.remove();
    try{localStorage.setItem('st_tip_colors_v31','dismissed');}catch(e){}
    window.__stTrack('tip_dismiss',{});
  });
}

/* ================= 图例旁小灰字 ================= */
function injectLegendHintsV31(){
  var sel='.legend:not(.sv31-nopalette),.overview-legend:not(.sv31-nopalette),.rank-legend-v7:not(.sv31-nopalette)';
  document.querySelectorAll(sel+',#autoLegendV29').forEach(function(lg){
    if(lg.querySelector('.lg-hint-v31'))return;
    if(!lg.children.length&&!lg.textContent.trim())return;
    var hint=document.createElement('span');
    hint.className='lg-hint-v31';
    hint.textContent='点击可换颜色';
    lg.appendChild(hint);
  });
}

/* ================= 版本检测 ================= */
var RELEASE_NOTES_V31={
  'v4.1':'新增数据导出：Excel 表格 / TXT 成绩单 / JSON 备份 / PDF 打印报告',
  'v5.0':'全新「统计分析」页：排名走势、强弱科定位、个人最佳殿堂、目标校准与试卷难度信号',
  'v5.1':'长期目标系统：各科目标分数、理想学校与考试倒计时；首页逐科差距卡、趋势图目标线与统计页联动；新增市/区排名（总分层面，选填）；修复成绩加载与移动端排版问题；全部脚本合并单文件，打开更快更省流量',
  'v5.2':'统计分析页增强：单场大跌自动提醒、总分连续进退提醒、参考人数口径变化提醒（人数不同的考试不再直接比名次）；修复个人最佳、连续退步等文案口径与样本门槛',
  'v6.0':'统计分析页 v6.0：「深度分析」Beta 板块——下场名次预测与95%区间、趋势/变点检验、试卷难度推断,附每步计算过程；分布图支持三视图(名次段/发挥标尺/累计概率,最可能点直接标出)；顶部科目/组合口径全页联动,组合排名只认你填写的「组合年排/班排」,六科组合直接沿用总分排名,没填排名不显示合成数据；①总览「最近一次」标注考试；趋势图例可点击显隐；修复组合chip与板块顺序'
};
function dismissKeyV31(v){return 'st_update_dismissed_'+v;}
function showUpdateBarV31(latest){
  if(document.getElementById('updateBarV31'))return;
  var note=RELEASE_NOTES_V31[latest]||'体验优化与新功能';
  var b=document.createElement('div');
  b.className='update-bar-v31';b.id='updateBarV31';
  b.innerHTML='<span>🚀</span><span><b>新版本 '+escV31(latest)+' 已发布</b>　'+escV31(note)+'</span>'
    +'<button type="button" class="primary u-go" style="flex:none">立即更新</button>'
    +'<button type="button" class="u-x" aria-label="关闭">×</button>';
  document.body.appendChild(b);
  window.__stTrack('update_prompt_shown',{from:appVersionV31(),to:latest});
  b.querySelector('.u-go').addEventListener('click',function(){
    window.__stTrack('update_apply',{from:appVersionV31(),to:latest});
    try{sessionStorage.setItem('st_force_reload','1');}catch(e){}
    location.replace(location.pathname+'?v='+Date.now()+location.hash);
  });
  b.querySelector('.u-x').addEventListener('click',function(){
    b.remove();
    try{localStorage.setItem(dismissKeyV31(latest),'1');}catch(e){}
  });
}
function checkUpdateV31(){
  try{
    var cur=appVersionV31();
    if(!cur)return;
    var f=window.fetch.bind(window);
    f('index.html?__cb='+Date.now(),{cache:'no-store'}).then(function(r){return r.text();}).then(function(txt){
      var m=txt.match(/application-version"\s*content="([^"]+)"/);
      if(!m)return;
      var latest=m[1];
      if(latest===cur)return;
      try{if(localStorage.getItem(dismissKeyV31(latest))==='1')return;}catch(e){}
      showUpdateBarV31(latest);
    }).catch(function(){});
  }catch(e){}
}

/* ================= 埋点挂接 ================= */
function installTrackingV31(){
  /* 打开取色器：点击任意图例项 */
  document.addEventListener('click',function(e){
    var hit=e.target.closest('.legend > *,.overview-legend > *,.rank-legend-v7 > *,#autoLegendV29 > *');
    if(!hit)return;
    var label=(hit.textContent||'').replace(/[🎨✎]/g,'').replace('点击可换颜色','').trim();
    window.__stTrack('legend_color_open',{subject:label});
  },true);
  /* 取色器内动作 */
  function popTrack(kind,extra){
    return function(e){
      var pop=e.target.closest('.picker-pop-v29');
      if(!pop)return;
      var subject=pop.dataset.subjectV29||pop.getAttribute('data-subject')||'';
      var payload={subject:subject};
      if(extra)for(var k in extra)payload[k]=extra[k];
      window.__stTrack(kind,payload);
    };
  }
  document.addEventListener('click',popTrack('legend_color_apply'),false);
  document.addEventListener('change',function(e){
    var pop=e.target.closest('.picker-pop-v29');
    if(pop&&e.target.tagName==='INPUT'&&e.target.type==='color'){
      window.__stTrack('legend_color_apply',{subject:pop.dataset.subjectV29||'',custom:true});
    }
  },false);
  /* 主题切换：包装 v29 的 applyTheme（切换前取旧主题，仅真实变化才上报） */
  try{
    if(window.__v29&&typeof window.__v29.applyTheme==='function'){
      var before=window.__v29.applyTheme;
      window.__v29.applyTheme=function(t,silent){
        var prev=null;
        try{prev=window.__v29.currentTheme();}catch(e){}
        var r=before.apply(this,arguments);
        try{if(!silent&&t!==prev)window.__stTrack('theme_change',{from:prev,to:t});}catch(e2){}
        return r;
      };
    }
  }catch(e){}
}

/* ================= 最近一次成绩卡：补排名 ================= */
function fmtRankV31(v,p){
  if(v===null||v===undefined||v==='')return null;
  var n=Number(v);
  if(isNaN(n))return null;
  return p?n+'/'+p:String(n);
}
function rankLineV31(exam,subject){
  var parts=[];
  if(subject){
    var r=((exam&&exam.scores)||{})[subject]||{};
    var cr=fmtRankV31(r.classRank,r.classParticipants),yr=fmtRankV31(r.rank,r.participants);
    if(cr)parts.push('班 '+cr);
    if(yr)parts.push('年 '+yr);
  }else{
    var cr2=fmtRankV31(exam.total_class_rank,exam.total_class_participants),yr2=fmtRankV31(exam.total_rank,exam.total_participants);
    if(cr2)parts.push('班 '+cr2);
    if(yr2)parts.push('年 '+yr2);
  }
  return parts.join(' · ');
}
var patchHeroV20Base=(typeof patchLatestHeroV20==='function')?patchLatestHeroV20:null;
patchLatestHeroV20=function(){
  if(state.page!=='home'||!document.querySelector('.hero-stat')){if(patchHeroV20Base)patchHeroV20Base();return;}
  var card=document.querySelector('.hero-stat');
  var metric=(typeof latestMetricV20==='function')?latestMetricV20():null;
  if(!metric){if(patchHeroV20Base)patchHeroV20Base();return;}
  var subjects=(typeof effectiveScoreSubjectsV20==='function')?effectiveScoreSubjectsV20(metric.exam):[];
  var rank=subjects.length===1?rankLineV31(metric.exam,subjects[0]):rankLineV31(metric.exam,null);
  var delta=metric.delta;
  card.innerHTML='<div><div class="stat-label">'+escapeHtml(metric.label)+'</div>'
    +'<div class="stat-value">'+formatScore(metric.value)+'</div>'
    +'<div class="stat-sub">'+escapeHtml(metric.exam.name)+' · '+fmtDate(metric.exam.exam_date)+'</div>'
    +(rank?'<div class="stat-rank-v31">🏆 '+escV31(rank)+'</div>':'')
    +'</div>'
    +(delta===null?'':'<span class="trend-pill">'+(delta>=0?'↗':'↘')+' '+metric.deltaLabel+' '+(delta>=0?'+':'')+formatScore(delta)+' 分</span>');
};

/* ================= 渲染钩子 ================= */
var bindPageBeforeV31=(typeof bindPage==='function')?bindPage:null;
bindPage=function bindPageV31(){
  if(bindPageBeforeV31)bindPageBeforeV31();
  try{
    injectLegendHintsV31();
    installTrackingV31();
    if(!localStorage.getItem('st_tip_colors_v31'))showColorTipBannerV31();
    checkUpdateV31();
    setInterval(checkUpdateV31,30*60*1000);
  }catch(e){}
};
function escV31(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* 启动 */
injectStylesV31();

/* 测试钩子 */
window.__v31={
  showColorTipBanner:showColorTipBannerV31,
  injectLegendHints:injectLegendHintsV31,
  checkUpdate:checkUpdateV31,
  releaseNotes:RELEASE_NOTES_V31,
  rankLine:rankLineV31,
  track:window.__stTrack
};
})();

/* ===== app-v32.js ===== */
/* app-v32.js · v5.0 统计分析页
   与「账号」同级的第四页:位比(排名)主轴 · 本地规则引擎 · 九大模块
   适配:语义变量主题(night 等)/ 自定义学科(subjectConfigs + 动态学科)/ 手动总分覆盖(total_actual_score)
   纯客户端计算,零后端改动。埋点复用 app-v31 的 window.__stTrack。 */
(function(){
"use strict";

/* ================= 小工具 ================= */
function n32(v){if(v===null||v===undefined||v==="")return null;var x=Number(v);return Number.isFinite(x)?x:null;}
function r32(x){return Math.round(x*10)/10;}
function esc32(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function median32(arr){if(!arr||!arr.length)return null;var a=arr.slice().sort(function(x,y){return x-y;});var m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function mad32(arr){if(!arr||!arr.length)return null;var m=median32(arr);return median32(arr.map(function(x){return Math.abs(x-m);}));}
function clamp32(x,a,b){return Math.max(a,Math.min(b,x));}
function fmtPos32(p){return (p===null||p===undefined)?"—":"前"+r32(p)+"%";}
function shortName32(name){return String(name||"").replace("高一下","一下").replace("高二下","二下").replace("高三下","三下").replace("高二上","二上").replace("高三上","三上").replace("高一","一上").replace("高二","二上").replace("高三","三上");}

/* ================= 数据访问层 ================= */
function allExamsV32(){try{return (typeof state!=="undefined"&&state.exams)||[];}catch(e){return [];}}
function byDate32(a,b){var d=String(a.exam_date||"").localeCompare(String(b.exam_date||""));return d||String(a.created_at||"").localeCompare(String(b.created_at||""));}
function visibleExamsV32(includeHidden){
  return allExamsV32().filter(function(e){return includeHidden?!0:!e.is_hidden;}).slice().sort(byDate32);
}
function configuredSubjectsV32(){
  var out=[];try{((typeof state!=="undefined"&&state.subjectConfigs)||[]).forEach(function(c){var nm=c&&(c.name||c);if(nm&&out.indexOf(nm)<0)out.push(nm);});}catch(e){}
  return out;
}
/* 学科清单:配置优先 + 各次考试里实际出现过的学科补尾(适配用户新增/修改的学科) */
function subjectListV32(exams){
  var out=configuredSubjectsV32(),seen={};out.forEach(function(s){seen[s]=1;});
  (exams||[]).forEach(function(e){Object.keys(e.scores||{}).forEach(function(s){if(s&&!seen[s]){seen[s]=1;out.push(s);}});});
  return out;
}
function rowV32(e,s){return (e&&e.scores&&e.scores[s])||{};}
/* 个人最佳状态标签:ok=在最好附近;warn=连续偏离待找回;acc 再按差距细分(≤5≈接近,>5=刚偏离) */
function pbLabelV32(st,gap){
  if(st==="ok")return "正处最好状态";
  if(st==="warn")return "待找回";
  return gap>5?"刚偏离":"接近最好";
}
/* 排名位置:显式位比字段优先,否则由 名次÷人数 现算;科目人数留空时回退总排名人数(v16 口径) */
function effYearN32(e,row){var n=n32(row.participants);return n!==null?n:n32(e.total_participants);}
function effClsN32(e,row){var n=n32(row.classParticipants);return n!==null?n:n32(e.total_class_participants);}
function posYearOf32(e,row){
  var p=n32(row.yearPositionPercent);if(p!==null)return r32(clamp32(p,0,100));
  var r=n32(row.rank),n=effYearN32(e,row);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
function posClassOf32(e,row){
  var p=n32(row.classPositionPercent);if(p!==null)return r32(clamp32(p,0,100));
  var r=n32(row.classRank),n=effClsN32(e,row);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
function totalPosYear32(e){
  var p=n32(e.total_year_position_percent);if(p!==null)return r32(p);
  var r=n32(e.total_rank),n=n32(e.total_participants);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
function totalPosClass32(e){
  var p=n32(e.total_class_position_percent);if(p!==null)return r32(p);
  var r=n32(e.total_class_rank),n=n32(e.total_class_participants);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
/* 总分:手动覆盖优先(v24),否则按未排除科目求和 */
function sumSideV32(e,side){
  var sum=null;Object.keys(e.scores||{}).forEach(function(s){
    var row=e.scores[s];if(!row||row.excludeFromTotal)return;
    var v=n32(row[side]);if(v!==null)sum=(sum===null?v:sum+v);
  });return sum;
}
function totalActualV32(e){var o=n32(e.total_actual_score);return o!==null?o:sumSideV32(e,"actual");}
function totalTargetV32(e){var o=n32(e.total_target_score);return o!==null?o:sumSideV32(e,"target");}
function rateOf32(row){var a=n32(row.actual),m=n32(row.max);return (a!==null&&m)?clamp32(a/m*100,0,100):null;}
/* 整场加权得分率(排除不计总分的科目)——纯分数账号的降级指标 */
function examRateV32(e){
  var a=null,m=null;
  Object.keys(e.scores||{}).forEach(function(s){
    var r=e.scores[s];if(!r||r.excludeFromTotal)return;
    var av=n32(r.actual),mv=n32(r.max);
    if(av!==null)a=(a===null?av:a+av);
    if(mv!==null)m=(m===null?mv:m+mv);
  });
  return (a!==null&&m)?r32(a/m*100):null;
}
function catOptionsV32(exams){
  var opts=[];
  try{if(typeof categoryOptionsV14==="function")(categoryOptionsV14()||[]).forEach(function(v){if(opts.indexOf(v)<0)opts.push(v);});}catch(e){}
  (exams||allExamsV32()).forEach(function(e){if(e.grade_level&&opts.indexOf(e.grade_level)<0)opts.push(e.grade_level);});
  return opts;
}
function scopeFilterV32(exams,scope){
  if(!scope||scope==="__all__")return exams;
  if(scope==="__none__")return exams.filter(function(e){return !e.grade_level;});
  return exams.filter(function(e){return e.grade_level===scope;});
}

/* ================= 特征提取 ================= */
function buildFeaturesV32(exams){
  var subjects=subjectListV32(exams);
  var metas=exams.map(function(e,i){
    return {i:i,e:e,name:e.name||("第"+(i+1)+"次"),date:e.exam_date||"",
      totalPos:totalPosYear32(e),totalCls:totalPosClass32(e),score:totalActualV32(e)};
  });
  var series={},valid={},mom={},stab={},pb={},streaks={},tgt={},latestN={},cohSub={};
  subjects.forEach(function(s){
    var ser=[];
    exams.forEach(function(e,i){
      var row=rowV32(e,s);
      var has=n32(row.actual)!==null||n32(row.target)!==null||n32(row.rank)!==null;
      if(!has)return;
      ser.push({i:i,pos:posYearOf32(e,row),cls:posClassOf32(e,row),
        rate:rateOf32(row),target:n32(row.target),actual:n32(row.actual),
        max:n32(row.max),N:effYearN32(e,row)});
    });
    series[s]=ser;
    var vp=ser.filter(function(x){return x.pos!==null;});
    valid[s]=vp;
    latestN[s]=vp.length?vp[vp.length-1].N:null;
    /* 动量:优先用最近 3 个相邻差的中位数(近期方向感);仅当窗口≥3 且 |pp|≥1pp 才给方向,
       否则一律"持平"——旧版用 MAD 噪声支配规则,在震荡序列上会误杀全部信号(二三象限永远为空)。
       正=前进(pp/场);至少 3 个有效点才出结论 */
    var diffs=[],coh=[];
    for(var j=1;j<vp.length;j++){
      diffs.push(vp[j].pos-vp[j-1].pos);
      var N1=vp[j-1].N,N2=vp[j].N;
      /* 口径变化:参考人数变化≥30%且≥100人——跨场位比跳变可能只是范围变了,不是真实进退 */
      coh.push(!!(N1&&N2&&Math.abs(N2-N1)/Math.max(N1,N2)>=0.3&&Math.abs(N2-N1)>=100));
    }
    var recent=diffs.slice(-5);
    if(recent.length>=2){
      var r3=diffs.slice(-3);
      var win=r3.length>=3?r3:recent;
      var med=median32(win);
      var pp=r32(-med);
      var flat=(win.length<3)||Math.abs(pp)<1; /* <1pp/场 或样本不足 → 不给方向 */
      mom[s]={pp:pp,names:(latestN[s]?r32(Math.abs(pp)*latestN[s]/100):null),diffs:recent,flat:flat};
    }else mom[s]=null;
    /* 稳定性:差的 MAD 估计 */
    if(diffs.length>=3){
      var sg=1.4826*(mad32(diffs)||0);
      stab[s]={sigma:r32(sg),cls:sg<1.5?"ok":(sg<3?"mid":"bad")};
    }else stab[s]=null;
    /* 个人最佳与状态 */
    if(vp.length){
      var best=vp[0];vp.forEach(function(x){if(x.pos<best.pos)best=x;});
      var last=vp[vp.length-1],gap=r32(last.pos-best.pos);
      var st="acc";
      if(gap<=1)st="ok";
      else{
        var notClose=0;for(var k2=vp.length-1;k2>0;k2--){if(vp[k2].pos-best.pos>5)notClose++;else break;}
        if(gap>5&&notClose>=2)st="warn";
      }
      pb[s]={pos:best.pos,i:best.i,gap:gap,st:st,bestEntry:best};
    }else pb[s]=null;
    /* 连续前进/后退(尾部的连续计数 + 连续段累计幅度;口径变化的相邻对视为断点,不跨口径累计) */
    var up=0,dn=0,k3=diffs.length-1,upSum=0,dnSum=0;
    while(k3>=0&&!coh[k3]&&diffs[k3]<0){up++;upSum+=diffs[k3];k3--;}
    k3=diffs.length-1;
    while(k3>=0&&!coh[k3]&&diffs[k3]>0){dn++;dnSum+=diffs[k3];k3--;}
    streaks[s]={up:up,down:dn,cum:recent.reduce(function(a,b){return a+b;},0),upSum:upSum,dnSum:dnSum};
    cohSub[s]=coh;
    /* 目标连胜负(同卷口径) */
    var mets=[];ser.forEach(function(x){if(x.target!==null&&x.actual!==null)mets.push(x.actual>=x.target);});
    var tm=0,tn=0,j2=mets.length-1;
    while(j2>=0&&mets[j2]){tm++;j2--;}
    j2=mets.length-1;
    while(j2>=0&&!mets[j2]){tn++;j2--;}
    tgt[s]={met:tm,notMet:tn,mets:mets};
  });
  /* 科目级难度信号(统一版):优先调用研究级 detectDifficulty(贝叶斯分档,带P(难)/P(易)校准),
     与深度分析板块完全同源;内核未加载时退回旧的分-位弹性启发式。
     输出形状与旧版一致:{flags:{examIdx|subj:{e,lvl}},events,flTheta},下游(矩阵圆点/难度卡/退步卡)零改动 */
  var flags={},events=[],flTheta={};
  var KDIFF=(typeof window!=="undefined"&&window.PAL2&&window.PAL2.difficulty)?window.PAL2.difficulty:
            (typeof window!=="undefined"&&window.PAL&&window.PAL.difficulty)?window.PAL.difficulty:null;
  subjects.forEach(function(s){
    var vp=valid[s];
    if(!(KDIFF&&vp.length>=3)){
      /* ---- 回退:分-位弹性启发式(旧算法,仅在无内核时使用) ---- */
      var pairs=[],resids=[];
      var pr=[];
      for(var j=1;j<vp.length;j++){
        var a=vp[j-1],b=vp[j];
        if(a.rate===null||b.rate===null)continue;
        var dp=b.pos-a.pos,dr=b.rate-a.rate;
        if(Math.abs(dp)<0.5&&Math.abs(dr)<1)continue;
        pr.push({bi:b.i,dp:dp,dr:dr});
      }
      if(pr.length<2)return;
      pr.forEach(function(p){if(p.dp!==0)pairs.push(p.dr/(-p.dp));});
      var k=median32(pairs);if(k===null||!Number.isFinite(k))return;
      pr.forEach(function(p){var e=p.dr-(-p.dp*k);resids.push(e);p.e=e;});
      var Ns=vp.map(function(x){return x.N;}).filter(function(n){return n&&Number.isFinite(n);});
      var Nbar=Ns.length?median32(Ns):300;
      var floorN=clamp32(r32(2*Math.sqrt(1600/Math.max(Nbar||300,10))+1),3,14);
      var theta=Math.max(floorN,(resids.length>=3?1.2*1.4826*(mad32(resids)||0):floorN));
      flTheta[s]={theta:r32(theta),floor:floorN,N:Nbar||null,model:"legacy"};
      pr.forEach(function(p){
        var lvl=0;
        if(p.e<=-theta)lvl=(p.e<=-1.5*theta)?2:1;
        else if(p.e>=theta)lvl=-1;
        if(lvl!==0){
          var key=p.bi+"|"+s;
          var old=flags[key];
          if(!old||(lvl===2)||(old!==2&&lvl===-1))flags[key]={e:r32(p.e),lvl:lvl};
          if(lvl>0)events.push({i:p.bi,subj:s,e:r32(p.e),strong:lvl===2});
        }
      });
      return;
    }
    /* ---- 统一版:研究级难度内核(签名: [{mainZ:{z,se}, rate:0~1, max}] 按时间序) ---- */
    try{
      var MEAS=(window.PAL2&&window.PAL2.measurement)||window.PAL.measurement;
      var obs=vp.map(function(x){
        var N=x.N||300,rk=Math.max(1,Math.round(x.pos/100*N));
        var mz=MEAS.positionToZ(rk,N);
        return {mainZ:{z:mz.z,se:mz.se},
          rate:(x.rate!=null&&x.rate!==undefined)?x.rate/100:null,max:100};
      });
      var arr=KDIFF.detectDifficulty(obs);
      if(!Array.isArray(arr))return;
      flTheta[s]={model:"kernel-v2",n:obs.length};
      arr.forEach(function(d,jj){
        var x=vp[jj];if(!x||!d||!d.valid)return;
        var lvl=0;
        if(d.pHard>=0.6)lvl=2;
        else if(d.pHard>=0.4)lvl=1;
        else if(d.pEasy>=0.4)lvl=-1;
        if(lvl===0)return;
        /* 延续旧符号语义:负值=偏难。置信差 = −100×(P难−P易) */
        var e=-Math.round((d.pHard-d.pEasy)*100);
        var key=x.i+"|"+s;
        var old=flags[key];
        if(!old||(lvl===2))flags[key]={e:e,lvl:lvl,pH:r32(d.pHard),pE:r32(d.pEasy)};
        if(lvl>0)events.push({i:x.i,subj:s,e:e,strong:lvl===2,pH:r32(d.pHard)});
      });
    }catch(err){ /* 内核异常时静默降级为无信号 */ }
  });
  var totalSeries=metas.filter(function(m){return m.totalPos!==null;})
    .map(function(m){return {i:m.i,pos:m.totalPos,cls:m.totalCls,score:m.score,name:m.name,N:n32(m.e.total_participants)};});
  var cohTotal=[];
  for(var jt=1;jt<totalSeries.length;jt++){
    var TN1=totalSeries[jt-1].N,TN2=totalSeries[jt].N;
    cohTotal.push(!!(TN1&&TN2&&Math.abs(TN2-TN1)/Math.max(TN1,TN2)>=0.3&&Math.abs(TN2-TN1)>=100));
  }
  var cohortChange=0;
  Object.keys(cohSub).forEach(function(s){cohSub[s].forEach(function(b){if(b)cohortChange++;});});
  cohTotal.forEach(function(b){if(b)cohortChange++;});
  var scoredExams=exams.filter(function(e){return totalActualV32(e)!==null;}).length;
  /* 数据质量项 */
  var pending=exams.filter(function(e){return totalTargetV32(e)!==null&&totalActualV32(e)===null;});
  var missCls=exams.filter(function(e){
    var hasYear=false,hasCls=false;
    Object.keys(e.scores||{}).forEach(function(s){var r=e.scores[s];
      if(n32(r.rank)!==null)hasYear=true;if(n32(r.classRank)!==null)hasCls=true;});
    return hasYear&&!hasCls;
  });
  var smallSubs=subjects.filter(function(s){
    return series[s].filter(function(x){return x.actual!==null;}).length<3&&series[s].length>0;
  });
  var zeroRankSubs=subjects.filter(function(s){
    return series[s]&&series[s].length>0&&valid[s].length===0;
  });
  var smallCohort=exams.filter(function(e){
    return Object.keys(e.scores||{}).some(function(s){var n=n32(e.scores[s].participants);return n!==null&&n<=30;});
  });
  /* 数据形态覆盖:有多少场带位比、多少场带得分率(决定降级策略) */
  var posCount=0,rateCount=0,scoreSeries=[];
  metas.forEach(function(m){
    var e=m.e,anyPos=m.totalPos!==null,anyRate=false;
    Object.keys(e.scores||{}).forEach(function(s){
      var r=e.scores[s];
      if(posYearOf32(e,r)!==null)anyPos=true;
      if(rateOf32(r)!==null)anyRate=true;
    });
    if(anyPos)posCount++;
    if(anyRate)rateCount++;
    if(m.score!==null)scoreSeries.push({i:m.i,score:m.score,name:m.name,date:m.date});
  });
  var last3=totalSeries.slice(-3).map(function(x){return x.pos;});
  var prevBest=null;
  if(totalSeries.length>=2)prevBest=Math.min.apply(null,totalSeries.slice(0,-1).map(function(x){return x.pos;}));
  return {exams:exams,subjects:subjects,metas:metas,series:series,valid:valid,latestN:latestN,
    mom:mom,stab:stab,pb:pb,streaks:streaks,tgt:tgt,flags:flags,events:events,flTheta:flTheta,
    totalSeries:totalSeries,scoreSeries:scoreSeries,posCount:posCount,rateCount:rateCount,
    cohSub:cohSub,cohTotal:cohTotal,cohortChange:cohortChange,
    scoredExams:scoredExams,
    overallLatest:totalSeries.length?totalSeries[totalSeries.length-1].pos:null,
    overallMedian3:last3.length?median32(last3):null,
    prevBestTotal:prevBest,
    latestScore:metas.length?metas[metas.length-1].score:null,
    prevScore:(metas.length>1?metas[metas.length-2].score:null),
    quality:{pending:pending,missCls:missCls,smallSubs:smallSubs,zeroRankSubs:zeroRankSubs,smallCohort:smallCohort,cohortChange:cohortChange}};
}

/* ================= 规则引擎 ================= */
var ICON32={
  mile:'<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h11l-2.5 3.5L16 11H5"/></svg>',
  up:'<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="M12 3L2 21h20z"/><line x1="12" y1="10" x2="12" y2="15"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>',
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>',
  loop:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>'
};
/* ⓘ 折叠依据组件:默认只显示一行提示,点圆圈i展开完整依据(考试/数据/计算/判断) */
function eviHtmlV32(lines){
  if(!lines||!lines.length)return "";
  return '<i class="sv31-evi" data-sv31-evi title="查看依据">i</i>'+
    '<span class="sv31-evib" hidden>'+esc32(lines.join("\n"))+"</span>";
}
function speedTextV32(f,s){
  var m=f.mom[s];if(!m||!Number.isFinite(m.pp))return null;
  if(m.flat)return {text:"近期有起有伏,整体持平",arrow:"↔",up:null};
  if(m.pp===0)return null;
  var dir=m.pp>0?"每场前进约 ":"每场后退约 ";
  var v=m.names!=null?Math.max(1,Math.round(Math.abs(m.names))):r32(Math.abs(m.pp));
  return {text:dir+v+(m.names!=null?"名":"个百分点"),arrow:m.pp>0?"↗":"↘",up:m.pp>0};
}
function buildInsightsV32(f){
  var out=[],n=f.exams.length,last=n-1;
  function add(o){o.key=o.type+"|"+(o.subj||"");out.push(o);}
  /* 里程碑:总分位比创新高 */
  var ts=f.totalSeries;
  if(ts.length>=2&&f.prevBestTotal!==null&&ts[ts.length-1].pos<f.prevBestTotal){
    add({sev:0,type:"mile",icon:"mile",title:"总分排名创个人新高",
      body:"年级"+fmtPos32(ts[ts.length-1].pos)+",比自己之前的最好("+fmtPos32(f.prevBestTotal)+")又进了一步。",
      ev:"依据:"+ts.map(function(x){return shortName32(x.name)+" "+fmtPos32(x.pos);}).join(";")});
  }
  /* 科目级难度信号(仅最近两场内的强信号成卡) */
  f.events.forEach(function(ev){
    if(ev.i<last-1)return;
    var m=f.metas[ev.i],prev=f.metas[ev.i-1];
    var rp=rowV32(prev.e,ev.subj),rc=rowV32(m.e,ev.subj);
    var pp0=posYearOf32(prev.e,rp),pc0=posYearOf32(m.e,rc);
    var dp0=(pp0!==null&&pc0!==null)?pc0-pp0:null;
    var dr0=(rp.max&&rc.max)?Math.round(n32(rc.actual)/rc.max*100)-Math.round(n32(rp.actual)/rp.max*100):null;
    /* 文案必须与数据方向一致:分数是否真降 × 名次是否真坚挺/真退,共四类 */
    var rateTxt=(rp.max?Math.round(n32(rp.actual)/rp.max*100):"?")+"%→"+Math.round(n32(rc.actual)/rc.max*100)+"%";
    var posTxt=(pp0===null?"?":fmtPos32(pp0))+" → "+(pc0===null?"?":fmtPos32(pc0));
    var fall=(dr0!==null&&dr0<0)
      ? (dp0===null?"scoreDown":(dp0<-1?"scoreDownRankUp":(dp0>5?"scoreDownRankDown":"scoreDownRankFlat")))
      : "scoreNotDown";
    var title,body;
    if(fall==="scoreDownRankUp"){
      title="那场"+esc32(ev.subj)+":分数降了,排名反而升了?";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",排名从"+posTxt+"——更像这科卷子偏难,不是你退步。同场其他科目正常与否见热力表圆点。";
    }else if(fall==="scoreDownRankFlat"){
      title="那场"+esc32(ev.subj)+":分数降了,排名基本没动";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",名次只小幅波动("+posTxt+")——更像这科卷面偏难,整场都在压分。";
    }else if(fall==="scoreDownRankDown"){
      title="那场"+esc32(ev.subj)+":分数下滑的同时,排名也在退";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",排名从"+posTxt+"——卷子整体偏难,但你的位次确实掉了,先盯失分点,别只归因运气。";
    }else if(fall==="scoreNotDown"){
      title="那场"+esc32(ev.subj)+":分数在涨,排名却没跟上预判";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",名次"+posTxt+"——按你历史的分-位弹性,这分数本应带来更好的名次,而这科的压分点就是拉分空间。";
    }else{
      title="那场"+esc32(ev.subj)+":这科的分数和名次对不上";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",名次"+posTxt+"——更像这科卷子偏难,不是你退步。";
    }
    add({sev:ev.strong?1:2,type:"hard",subj:ev.subj+(ev.i),icon:"search",
      title:title,body:body,
      ev:["相关考试: "+shortName32(prev.name)+" → "+shortName32(m.name),
        "数据: 得分率 "+rateTxt+" · 位比 "+posTxt,
        "计算: 统一难度模型(与深度分析同源) P(难)="+(ev.pH!=null?Math.round(ev.pH*100)+"%":"—")+" · 置信差 "+ev.e+"(负=偏难)",
        "判断: 排名对卷面难度免疫,分数不是;该场得分率显著低于位比所隐含的水平 → 判为卷面偏难"+(ev.strong?"(强信号)":"")+",不记为个人退步"].join("\n")});
  });
  /* 连续后退预警 / 连续进步 */
  f.subjects.forEach(function(s){
    var st=f.streaks[s];if(!st)return;
    var sp=speedTextV32(f,s);
    if(st.down>=2&&sp&&!sp.up){
      var dropPts=st.dnSum!==undefined?Math.abs(Math.round(st.dnSum)):null;
      var tip=dropPts!==null&&dropPts>10
        ? "这一轮已经累计退了"+dropPts+"个百分点,幅度不小了——抽空重点复盘这科的失分点。"
        : "幅度还小的话注意即可,再退一场要重点找原因。";
      var dNames=[],dPos=[];
      f.valid[s].slice(-(st.down+1)).forEach(function(x){dNames.push(shortName32(f.exams[x.i].name));dPos.push(fmtPos32(x.pos));});
      add({sev:2,type:"decline",subj:s,icon:"warn",
        title:esc32(s)+"连续"+st.down+"场退步",
        body:"已从"+fmtPos32((f.valid[s][f.valid[s].length-st.down]||{}).pos)+"退到当前"+fmtPos32(f.valid[s][f.valid[s].length-1].pos)+"。"+tip,
        ev:["相关考试: "+dNames.join(" → "),
          "数据: 位比 "+dPos.join(" → "),
          "计算: 最近"+st.down+"个相邻场次位比连续变大"+(dropPts!==null?",累计约"+dropPts+"个百分点":""),
          "判断: 趋势性退步(非单场波动),建议复盘该科失分点"].join("\n")});
    }
    if(st.up>=3&&st.upSum<=-6){
      var uNames=[];
      f.valid[s].slice(-(st.up+1)).forEach(function(x){uNames.push(shortName32(f.exams[x.i].name));});
      add({sev:4,type:"progress",subj:s,icon:"up",
        title:esc32(s)+"连续"+st.up+"场前进",
        body:"累计前进约"+r32(Math.abs(st.upSum))+"个百分点"+(f.latestN[s]?",折合约"+Math.max(1,Math.round(Math.abs(st.upSum)*f.latestN[s]/100))+"名":"")+",势头很好。",
        ev:["相关考试: "+uNames.join(" → "),
          "数据: 连续"+st.up+"场位比逐场变小",
          "计算: 累计位比变化 "+r32(st.upSum)+"pp"+(f.latestN[s]?" × "+f.latestN[s]+"人 ≈ "+Math.max(1,Math.round(Math.abs(st.upSum)*f.latestN[s]/100))+"名":""),
          "判断: 持续性进步段,当前势头可保持"].join("\n")});
    }
  });
  /* 目标校准 */
  f.subjects.forEach(function(s){
    var t=f.tgt[s];if(!t)return;
    var vp=f.valid[s],base=vp.length?median32(vp.slice(-3).map(function(x){return x.pos;})):null;
    if(t.notMet>=3&&base!==null){
      var pbPos=f.pb[s]?f.pb[s].pos:null;
      var sugRaw=clamp32(r32(base-10),5,80);
      /* 精度守则:建议不得比个人最佳更紧——够得着才叫目标 */
      var sug=pbPos!==null?clamp32(Math.max(sugRaw,r32(pbPos+1)),5,80):sugRaw;
      var atBest=pbPos!==null&&sug<=r32(pbPos+1.2);
      add({sev:3,type:"tcal",subj:s,icon:"target",
        title:esc32(s)+"的目标该调一调了",
        body:atBest
          ?"目标连续"+t.notMet+"次没够到,而且这个目标定得比你的最好成绩还高。下次先定「稳住年级前"+sug+"%」——站稳了再往下探。"
          :"目标连续"+t.notMet+"次没够到。下次建议改成「进年级前"+sug+"%」,先定个够得着的。",
        ev:"锚点:取该科近3场典型水平"+fmtPos32(base)+";且不紧于个人最佳"+(pbPos!==null?fmtPos32(pbPos):"")+"。"});
    }else if(t.met>=3&&base!==null&&f.pb[s]){
      var up2=clamp32(r32(Math.min(base,f.pb[s].pos)-4),5,80);
      add({sev:4,type:"tcal",subj:s,icon:"target",
        title:esc32(s)+"可以再进一步",
        body:"目标已连续"+t.met+"次达成。下次建议「进年级前"+up2+"%",ev:"依据:连续达成+当前典型水平。"});
    }
  });
  /* 纪录临近 */
  var close=[];
  f.subjects.forEach(function(s){
    var p=f.pb[s];if(!p||p.st!=="acc")return;
    var sp=speedTextV32(f,s);
    if(p.gap>1&&p.gap<=5&&sp&&sp.up)close.push({s:s,gap:p.gap,sp:sp,mom:f.mom[s]?f.mom[s].pp:0});
  });
  close.sort(function(a,b){return b.mom-a.mom;});
  close.slice(0,1).forEach(function(c){
    add({sev:4,type:"pbclose",subj:c.s,icon:"up",
      title:esc32(c.s)+"离个人最好只差一步",
      body:"现在是"+fmtPos32(f.valid[c.s][f.valid[c.s].length-1].pos)+",最好成绩是"+fmtPos32(c.s==="__total__"?c.s:f.pb[c.s].pos)+";"+c.sp.text.replace("每场","最近")+",下一场很有希望刷新纪录。",
      ev:"依据:殿堂差距+动量方向。"});
  });
  /* 回归均值提示 */
  if(ts.length>=3&&f.prevBestTotal!==null&&ts[ts.length-1].pos<=f.prevBestTotal){
    var line=clamp32(r32(f.prevBestTotal+2),3,90);
    add({sev:5,type:"reg",icon:"loop",title:"上次考得太好,下次回落属正常",
      body:"刚创个人最佳后,下一次略有下滑是普遍规律,不用慌;跌破"+fmtPos32(line)+"才需要认真找原因。",
      ev:"统计常识:极端表现后向个人常态回归。"});
  }
  /* 单场大跌:最近一对位比退≥15pp 且同口径;该场已有偏难卡(hard)或连续退步卡(decline)时不重复 */
  f.subjects.forEach(function(s){
    var vp2=f.valid[s];if(!vp2||vp2.length<2)return;
    var A=vp2[vp2.length-2],B=vp2[vp2.length-1];
    var drop=r32(B.pos-A.pos);if(drop<15)return; /* 正=位比变大=退;前进方向由 progress 类覆盖 */
    var cArr=f.cohSub&&f.cohSub[s];
    if(cArr&&cArr[cArr.length-1])return; /* 参考人数口径变了:跳变不可直接比 */
    if(f.streaks[s]&&f.streaks[s].down>=2)return; /* decline 卡已覆盖本段 */
    if(f.flags[B.i+"|"+s]&&f.flags[B.i+"|"+s].lvl>0)return; /* hard 卡已覆盖 */
    add({sev:2,type:"bigdrop",subj:s,icon:"warn",
      title:esc32(s)+"单场跌了近"+Math.round(drop)+"个百分点",
      body:shortName32(f.metas[A.i].name)+"→"+shortName32(f.metas[B.i].name)+" 位比从"+fmtPos32(A.pos)+"退到"+fmtPos32(B.pos)
        +(A.rate!==null&&B.rate!==null?"(得分率 "+Math.round(A.rate)+"%→"+Math.round(B.rate)+"%)":"")+"——先看这场哪里失分,再判断是发挥还是题型变化。",
      ev:"依据:相邻场位比 "+A.pos+"→"+B.pos+",单场跌幅≥15个百分点,两场参考人数口径一致。"});
  });
  /* 总分级连续进退(≥2场、累计≥8pp、同口径段) */
  if(ts.length>=3){
    var tDiffs=[],tCoh=f.cohTotal||[];
    for(var t1=1;t1<ts.length;t1++)tDiffs.push(ts[t1].pos-ts[t1-1].pos);
    var run3=0,sum3=0,start3=-1;
    for(var t2=tDiffs.length-1;t2>=0;t2--){
      if(!tCoh[t2]&&tDiffs[t2]>0){if(run3===0)start3=t2;run3++;sum3+=tDiffs[t2];}
      else break;
    }
    if(run3>=2&&sum3>=8&&start3>=0){
      add({sev:2,type:"tdecl",icon:"warn",
        title:"总分连续"+run3+"场退步",
        body:"总分位置从"+fmtPos32(ts[start3].pos)+"退到当前"+fmtPos32(ts[ts.length-1].pos)+",累计约"+Math.round(sum3)+"个百分点——看看是哪科拖了后腿(可回「学科结构」对比)。",
        ev:"依据:总分位比相邻场变化,连续"+run3+"场变大(累计约"+Math.round(sum3)+"pp),参考人数口径一致。"});
    }
    run3=0;sum3=0;start3=-1;
    for(var t3=tDiffs.length-1;t3>=0;t3--){
      if(!tCoh[t3]&&tDiffs[t3]<0){if(run3===0)start3=t3;run3++;sum3+=tDiffs[t3];}
      else break;
    }
    if(run3>=2&&sum3<=-8&&start3>=0){
      add({sev:4,type:"tprog",icon:"up",
        title:"总分连续"+run3+"场前进",
        body:"总分位置从"+fmtPos32(ts[start3].pos)+"进到当前"+fmtPos32(ts[ts.length-1].pos)+",累计约"+Math.round(Math.abs(sum3))+"个百分点,势头不错。",
        ev:"依据:总分位比相邻场变化,连续"+run3+"场变小(累计约"+Math.round(Math.abs(sum3))+"pp),参考人数口径一致。"});
    }
  }
  /* 口径变化提醒:最近一次考试与上一场之间,参考人数变化≥30%且≥100人 */
  var cohortMsg="";
  f.subjects.forEach(function(s){
    var cA=f.cohSub&&f.cohSub[s];
    if(!cA||!cA.length||!cA[cA.length-1])return;
    var vp3=f.valid[s],N1=vp3[vp3.length-2].N,N2=vp3[vp3.length-1].N;
    cohortMsg+=(cohortMsg?"、":"")+esc32(s)+"("+(N1||"?")+"→"+(N2||"?")+"人)";
  });
  if(ts.length>=2&&tCoh&&tCoh.length&&tCoh[tCoh.length-1]){
    var TN1=ts[ts.length-2].N,TN2=ts[ts.length-1].N;
    cohortMsg+=(cohortMsg?"、":"")+"总分("+(TN1||"?")+"→"+(TN2||"?")+"人)";
  }
  if(cohortMsg){
    add({sev:5,type:"cohort",icon:"search",
      title:"最近这场参考人数口径变了",
      body:cohortMsg+"——人数不同时,名次百分比不能直接和上次比,这场的跳变先别急着下结论。",
      ev:"依据:相邻场参考人数变化≥30%且≥100人时,位比跳变不可跨场直接比较。"});
  }
  /* 纯分数账号:引导补录名次 */
  if(f.posCount===0&&f.rateCount>=2){
    add({sev:5,type:"norank",icon:"search",title:"补一个数据,解锁全部排名分析",
      body:"目前的考试只录了分数。下次考完把「名次」和「总人数」填上(单科或总分都行),进步趋势、强弱科、个人最佳殿堂会立刻上线——分数受试卷难度影响,排名才是跨考试的硬通货。",
      ev:"排名类分析依赖 名次÷人数 的位比口径;不同试卷的分数不可直接比较,所以这里不强行下结论。"});
  }
  /* 去重 + 排序 + 截断 */
  var seen={};out=out.filter(function(o){if(seen[o.key])return false;seen[o.key]=1;return true;});
  out.sort(function(a,b){return a.sev-b.sev;});
  return {all:out,visible:out.slice(0,6),rest:Math.max(0,out.length-6)};
}

/* ================= SVG 构建器(返回字符串) ================= */
function accentRgbV32(){
  try{
    var v=(getComputedStyle(document.documentElement).getPropertyValue("--accent")||"").trim();
    var m=v.match(/^#?([0-9a-f]{6})$/i);
    if(m)return [parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4,6),16)];
    var m2=v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if(m2)return [+m2[1],+m2[2],+m2[3]];
  }catch(e){}
  return [93,114,232];
}
function rgba32(rgb,a){return "rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+a+")";}
/* 折线:lines=[{vals,color,dash}] labels=[...];tickLabel(v) 自定义纵轴刻度 */
function lineSvgV32(lines,labels,opts){
  opts=opts||{};
  var W=520,H=230,L=52,R=14,T=16,B=30,cw=W-L-R,chh=H-T-B;
  var all=[];
  lines.forEach(function(s){s.vals.forEach(function(v){if(v!==null&&v!==undefined&&v===v)all.push(v);});});
  if(!all.length)return "";
  var lo=Math.min.apply(null,all),hi=Math.max.apply(null,all);
  var pad=(hi-lo)*.25||10;lo=lo-pad;hi=hi+pad;
  var n=lines[0].vals.length;
  function X(i){return L+(n===1?cw/2:cw*i/(n-1));}
  function Y(v){return T+chh*(1-(v-lo)/(hi-lo));}
  var g="";
  for(var i=0;i<=4;i++){var v=lo+(hi-lo)*i/4,y=Y(v);
    var lbl=opts.tickLabel?opts.tickLabel(v):Math.round(v)+(opts.unit||"");
    g+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" stroke="var(--line,#e8ebf0)"/>'+
       '<text x="'+(L-6)+'" y="'+(y+3.5)+'" text-anchor="end" font-size="9.5" fill="var(--muted,#788392)">'+lbl+"</text>";}
  for(var j=0;j<n;j++){
    g+='<text x="'+X(j)+'" y="'+(H-8)+'" text-anchor="middle" font-size="9.5" fill="var(--muted,#788392)">'+esc32(labels[j]||"")+"</text>";
  }
  lines.forEach(function(s){
    /* null=该场没录这个口径:断线分段,绝不拿另一条线的值造假填充 */
    var segs=[],cur=[];
    s.vals.forEach(function(v,i){
      if(v===null||v===undefined||v!==v){if(cur.length>1)segs.push(cur);cur=[];}
      else cur.push({x:X(i),y:Y(v)});
    });
    if(cur.length>1)segs.push(cur);
    segs.forEach(function(seg){
      g+='<polyline points="'+seg.map(function(p){return p.x+","+p.y;}).join(" ")
        +'" fill="none" stroke="'+s.color+'" stroke-width="2.6" stroke-linecap="round"'
        +(s.dash?' stroke-dasharray="5 4"':"")+"></polyline>";
    });
    s.vals.forEach(function(v,i){
      if(v===null||v===undefined||v!==v)return;
      g+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.6" fill="var(--panel-solid,#fff)" stroke="'+s.color+'" stroke-width="2.2"/>';
    });
  });
  if(opts.marks)g+=opts.marks(X,Y,W,H,B);
  return '<svg viewBox="0 0 '+W+" "+H+'" style="width:100%;height:auto;display:block">'+g+"</svg>";
}
function sparkSvg32(vals,color){
  if(!vals||vals.length<2)return '<span style="font-size:10px;color:var(--muted)">数据不足</span>';
  var W=96,Hh=26,lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals),sp=(hi-lo)||1;
  var pts=vals.map(function(v,i){return (2+i*(W-4)/(vals.length-1)).toFixed(1)+","+(Hh-3-(v-lo)/sp*(Hh-6)).toFixed(1);}).join(" ");
  return '<svg width="'+W+'" height="'+Hh+'" viewBox="0 0 '+W+" "+Hh+'"><polyline points="'+pts+'" fill="none" stroke="'+(color||"var(--accent,#5d72e8)")+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/* 四象限散点:pts=[{n,sp(名次变化/场,正=前进),pos,c}] */
function quadSvgV32(pts,overallPos){
  var W=520,H=310,L=46,R=12,T=16,B=36,cw=W-L-R,chh=H-T-B;
  /* 横轴动态域:默认±24名/场,数据更猛时自动放宽 */
  var maxSp=24;pts.forEach(function(p){var a=Math.abs(Number(p.sp)||0);if(a>maxSp)maxSp=Math.ceil(a*1.2);});
  var X0=-maxSp,X1=maxSp;
  /* 纵轴动态域:覆盖全部科目当前位比与总分水平,余量≥18%,域宽至少12个百分点 */
  var ps=pts.map(function(p){return p.pos;});
  if(overallPos!==null&&overallPos!==undefined&&Number.isFinite(overallPos))ps.push(overallPos);
  var pMin=ps.length?Math.min.apply(null,ps):10,pMax=ps.length?Math.max.apply(null,ps):90;
  var vpad=Math.max((pMax-pMin)*.18,3);
  var P0=clamp32(pMin-vpad,2,60),P1=clamp32(pMax+vpad,P0+12,98);
  function X(v){return L+cw*(v-X0)/(X1-X0);}
  function Y(pos){return T+chh*(clamp32(pos,P0,P1)-P0)/(P1-P0);} /* 位比小=靠上 */
  var x0=X(0),yh=Y(overallPos===null||!Number.isFinite(overallPos)?P1:overallPos),s="";
  function rect(x1,y1,x2,y2,f){return '<rect x="'+Math.min(x1,x2)+'" y="'+Math.min(y1,y2)+'" width="'+Math.abs(x2-x1)+'" height="'+Math.abs(y2-y1)+'" fill="'+f+'"/>';}
  s+=rect(L,T,x0,yh,"rgba(93,114,232,.06)")+rect(x0,T,W-R,yh,"rgba(50,167,122,.07)")
    +rect(L,yh,x0,H-B,"rgba(217,92,92,.06)")+rect(x0,yh,W-R,H-B,"rgba(229,155,69,.07)");
  /* 横向刻度:在有效域内取整齐的位比值 */
  var step=P1-P0>40?20:(P1-P0>18?10:5);
  for(var tv=Math.ceil(P0/step)*step;tv<=P1;tv+=step){
    var yy=Y(tv);
    s+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="var(--line,#e8ebf0)"/>'+
       '<text x="'+(L-6)+'" y="'+(yy+3.5)+'" text-anchor="end" font-size="9.5" fill="var(--muted,#788392)">前'+tv+"%</text>";
  }
  s+='<line x1="'+x0+'" y1="'+T+'" x2="'+x0+'" y2="'+(H-B)+'" stroke="var(--line,#e8ebf0)" stroke-dasharray="4 3"/>'
    +'<line x1="'+L+'" y1="'+yh+'" x2="'+(W-R)+'" y2="'+yh+'" stroke="var(--muted,#98a1ae)"/>'
    +'<text x="'+(W-R)+'" y="'+Math.max(T+10,yh-5)+'" text-anchor="end" font-size="9" fill="var(--muted,#98a1ae)">你的总分水平 '+fmtPos32(overallPos)+"</text>"
    +'<text x="'+L+'" y="'+(H-B+17)+'" font-size="9.5" fill="var(--muted,#788392)">\u2190 每场在后退</text>'
    +'<text x="'+(W-R)+'" y="'+(H-B+17)+'" text-anchor="end" font-size="9.5" fill="var(--muted,#788392)">每场在前进 \u2192</text>'
    +'<text x="'+x0+'" y="'+(H-B+17)+'" text-anchor="middle" font-size="9.5" fill="var(--muted,#788392)">0</text>'
    +'<text x="'+(L+8)+'" y="'+(T+14)+'" font-size="10" font-weight="700" fill="rgba(93,114,232,.55)">优势守望</text>'
    +'<text x="'+(W-R-8)+'" y="'+(T+14)+'" text-anchor="end" font-size="10" font-weight="700" fill="rgba(50,167,122,.6)">强势上升</text>'
    +'<text x="'+(L+8)+'" y="'+(H-B-8)+'" font-size="10" font-weight="700" fill="rgba(217,92,92,.6)">重点警报</text>'
    +'<text x="'+(W-R-8)+'" y="'+(H-B-8)+'" text-anchor="end" font-size="10" font-weight="700" fill="rgba(229,155,69,.65)">快速爬升</text>';
  var boxes=[];
  function fits(x,y,w,hh){
    return !boxes.some(function(b){return x<b.x+b.w&&x+w>b.x&&y<b.y+b.h&&y+hh>b.y;});
  }
  var placedDots=[];
  pts.forEach(function(p){
    var x=X(clamp32(p.sp,-(maxSp-.5),maxSp-.5)),y=Y(p.pos);
    /* 重合避让:与其他圆点距离过近时沿横轴小步挪开——只挪视觉位置,data-* 里仍是真实值 */
    var k=0;
    while(k<6&&placedDots.some(function(q){return Math.abs(q.x-x)<15&&Math.abs(q.y-y)<17;})){
      k++;x+=(k%2?1:-1)*k*8;
      x=clamp32(x,L+8,W-R-8);
    }
    placedDots.push({x:x,y:y});
    var c=p.c||"var(--accent,#5d72e8)";
    s+='<g class="sv31-qpt" data-n="'+esc32(p.n)+'" data-sp="'+p.sp+'" data-pos="'+p.pos+'" data-flat="'+(p.flat?1:0)+'" style="cursor:pointer">'
      +'<circle cx="'+x+'" cy="'+y+'" r="13" fill="transparent"/>'
      +'<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="var(--panel-solid,#fff)" stroke="'+c+'" stroke-width="2.6"/>';
    var cands=[[9,4,"start"],[9,-7,"start"],[9,13,"start"],[-9,4,"end"],[-9,-7,"end"],[-9,13,"end"],[0,-12,"middle"],[0,18,"middle"]];
    for(var ci=0;ci<cands.length;ci++){
      var d=cands[ci],lw=(p.n.length*11+6);
      var lx=d[0]<0?x+d[0]-lw:(d[0]===0?x-lw/2:x+d[0]);
      var ly=y+d[1]-(d[1]>0?0:10);
      if(fits(lx-1,ly,lw+2,13)){boxes.push({x:lx-1,y:ly,w:lw+2,h:13});
        s+='<text x="'+(x+d[0])+'" y="'+(y+d[1])+'" text-anchor="'+d[2]+'" font-size="11" font-weight="700" fill="var(--text,#18212f)">'+esc32(p.n)+"</text>";break;}
    }
    s+="</g>";
  });
  return '<svg viewBox="0 0 '+W+" "+H+'" style="width:100%;height:auto;display:block">'+s+"</svg>";
}
function donutSvgV32(data,total,label){
  var cx=70,cy=70,r=52,ir=30,a0=-Math.PI/2,seg="",sum=total||data.reduce(function(a,b){return a+b.v;},0)||1;
  data.forEach(function(d){
    var a1=a0+(d.v/sum)*Math.PI*2,large=(a1-a0)>Math.PI?1:0;
    function pt(rad,a){return (cx+rad*Math.cos(a)).toFixed(2)+","+(cy+rad*Math.sin(a)).toFixed(2);}
    if(d.v>0)seg+='<path d="M '+pt(r,a0)+" A "+r+" "+r+" 0 "+large+" 1 "+pt(r,a1)+" L "+pt(ir,a1)+" A "+ir+" "+ir+" 0 "+large+" 0 "+pt(ir,a0)+' Z" fill="'+d.c+'" stroke="var(--panel-solid,#fff)" stroke-width="2"/>';
    a0=a1;
  });
  var leg=data.map(function(d,i){var y=62+i*20;
    return '<rect x="150" y="'+(y-8)+'" width="9" height="9" rx="2.5" fill="'+d.c+'"/><text x="165" y="'+y+'" font-size="11" fill="var(--text,#18212f)">'+esc32(d.l)+" · "+d.v+"次</text>";}).join("");
  return '<svg viewBox="0 0 300 140" style="width:100%;max-width:340px;height:auto">'+seg+
    '<text x="150" y="50" text-anchor="middle" font-size="11" fill="var(--muted,#788392)">'+esc32(label||"")+"</text>"+leg+"</svg>";
}

/* ================= 页面 HTML ================= */
function controlsHtmlV32(f){
  var cats=catOptionsV32(f.exams);
  var scope=(typeof state!=="undefined"&&state.sv31)||{};
  var cur=scope.scope||"__all__";
  var chips='<button class="chip'+(cur==="__all__"?" active":"")+'" data-sv31-scope="__all__">全部</button>';
  cats.forEach(function(c){chips+='<button class="chip'+(cur===c?" active":"")+'" data-sv31-scope="'+esc32(c)+'">'+esc32(c)+"</button>";});
  var mode=scope.mode||"rank";
  return '<div class="sv31-controls"><div class="chips sv31-scroll-x" id="sv31Scope">'+chips+"</div>"
    +'<div class="sv31-seg" id="sv31Mode">'
    +'<button class="'+(mode==="rank"?"active":"")+'" data-mode="rank">排名模式(推荐)</button>'
    +'<button class="'+(mode==="score"?"active":"")+'" data-mode="score">分数模式</button></div>'
    +(mode==="score"
      ?'<div class="sv31-warn">当前为<b>分数模式</b>:各科是不同试卷、各次考试难度不同,分数跨考试不可直接比较,仅供同卷阅读。结论以排名模式为准。</div>'
      :'<div class="sv31-modenote">排名模式 · 跨卷比较以名次为准;切「分数模式」可看各科卷面分与得分率</div>')
    +"</div>";
}
/* 名次口径模块在分数模式下打的标 */
function lockTagV32(mode){return mode==="score"?'<span class="sv31-tag">名次口径 · 不随模式切换</span>':"";}
/* 「最近一次」小注:第几次考试 + 日期(行里缺 date 时从 exams[i].exam_date 补) */
function exNoteV32(x,f){
  if(!x)return "";
  var name=esc32(shortName32(x.name||""));
  var date=x.date||(f.exams&&f.exams[x.i]&&f.exams[x.i].exam_date)||"";
  return name+(date?" · "+esc32(date):"");
}
function kpiHtmlV32(f,mode){
  /* note:可选「哪一次」小注(如 月考5 · 2026-05-01),让「最近一次」类指标可溯源 */
  function stat(lb,v,delta,cls,note){return '<div class="sv31-stat"><div class="lb">'+lb+'</div><div class="v">'+v+'</div>'+(delta?'<span class="d '+cls+'">'+delta+"</span>":"")+(note?'<div style="font-size:10px;opacity:.55;margin-top:3px">'+note+"</div>":"")+"</div>";}
  if(f.posCount===0){
    /* 纯分数形态:不硬凑位比,给同卷可比的指标 */
    var met=0,tot=0;
    f.exams.forEach(function(e){var t=totalTargetV32(e),a=totalActualV32(e);if(t!==null&&a!==null){tot++;if(a>=t)met++;}});
    var d=f.latestScore!==null&&f.prevScore!==null?f.latestScore-f.prevScore:null;
    var lr=f.exams.length?examRateV32(f.exams[f.exams.length-1]):null;
    var pr=f.exams.length>1?examRateV32(f.exams[f.exams.length-2]):null;
    var dd=(pr!==null&&lr!==null)?r32(lr-pr):null;
    return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">① 总览</h3>'
      +'<p class="card-sub">当前考试只录了分数——分数仅在相同试卷范围内可比</p></div>'
      +'<span class="sv31-tag">排名分析待补录名次后解锁</span></div>'
      +'<div class="sv31-kpi">'
      +stat("最近总分",f.latestScore===null?"—":String(Math.round(f.latestScore)),d===null?"":("较上次 "+(d>=0?"+":"")+Math.round(d)+" 分"),d===null?"flat":(d>=0?"up":"down"))
      +stat("整卷得分率 · 最近一次",lr===null?"—":lr+"<small>%</small>",dd===null?"":("较上次 "+(dd>=0?"+":"")+dd+" 个百分点"),dd===null?"flat":(dd>=0?"up":"down"))
      +stat("目标完成情况",(tot?met+"<small> / "+tot+" 次</small>":"—"),"按每张卷子各自算","flat")
      +"</div></div>";
  }
  var ts=f.totalSeries;
  var scopeSubj=(f.totalSynthetic&&f.scopeSubject)?f.scopeSubject:null;
  var latestCls=null,clsEx=null;for(var i=ts.length-1;i>=0;i--){if(ts[i].cls!==null){latestCls=ts[i].cls;clsEx=ts[i];break;}}
  var pbTotal=null,pbIsLast=false;
  if(ts.length){pbTotal=Math.min.apply(null,ts.map(function(x){return x.pos;}));pbIsLast=(ts[ts.length-1].pos<=pbTotal);}
  var stRankDelta=ts.length>=2?(pbIsLast?"个人历史最好":"较历史最好差 "+r32(Math.abs(ts[ts.length-1].pos-pbTotal))+" 个百分点"):"";
  var met=0,tot=0;
  f.exams.forEach(function(e){var t=totalTargetV32(e),a=totalActualV32(e);if(t!==null&&a!==null){tot++;if(a>=t)met++;}});
  var d=f.latestScore!==null&&f.prevScore!==null?f.latestScore-f.prevScore:null;
  var tsLast=ts.length?ts[ts.length-1]:null;
  var lastNote=exNoteV32(tsLast,f);
  var stRankLatest=stat("年级排名 · 最近一次",fmtPos32(f.overallLatest),stRankDelta,pbIsLast?"up":"info",(f.overallLatest!==null&&tsLast)?lastNote:"");
  var stMedian=stat("年级排名 · 最近3次典型水平",f.overallMedian3===null?"—":fmtPos32(f.overallMedian3),"","");
  var stCls=latestCls!==null?stat("班级排名 · 最近一次",fmtPos32(latestCls),"","",clsEx?exNoteV32(clsEx,f):""):"";
  if(f.scopeMissing){stRankLatest="";stMedian="";stCls="";} /* 没填过排名:排名类统计直接不显示 */
  var stGoal,stScore;
  if(scopeSubj){
    /* 单科口径:目标/得分按该科每场单独算,不再显示全校总分 */
    var sr=f.series[scopeSubj]||[],scLast=null,scPrev=null;
    sr.forEach(function(x){var a=n32(x.actual);if(a!==null){scPrev=scLast;scLast=a;}});
    var sd=(scPrev!==null&&scLast!==null)?r32(scLast-scPrev):null;
    met=0;tot=0;
    sr.forEach(function(x){var t=n32(x.target),a=n32(x.actual);if(t!==null&&a!==null){tot++;if(a>=t)met++;}});
    stGoal=stat("目标完成情况 · "+esc32(scopeSubj),(tot?met+"<small> / "+tot+" 场</small>":"—"),"按该科每场目标单独算","flat");
    stScore=stat(esc32(scopeSubj)+" 最近得分",scLast===null?"—":String(Math.round(scLast)),sd===null?"":((sd>=0?"+":"")+Math.round(sd)+"分 · 受试卷难度影响"),sd===null?"flat":(sd>=0?"up":"down"));
  }else{
    stGoal=stat("目标完成情况",(tot?met+"<small> / "+tot+" 次</small>":"—"),"按每张卷子各自算","flat");
    stScore=stat("最近总分(仅参考)",f.latestScore===null?"—":String(Math.round(f.latestScore)),d===null?"":((d>=0?"+":"")+Math.round(d)+"分 · 受试卷难度影响"),d===null?"flat":(d>=0?"up":"down"));
  }
  var kpis;
  if(mode==="score"){
    var lr=f.exams.length?examRateV32(f.exams[f.exams.length-1]):null;
    var prr=f.exams.length>1?examRateV32(f.exams[f.exams.length-2]):null;
    var ddr=(prr!==null&&lr!==null)?r32(lr-prr):null;
    var stRate=stat("整卷得分率 · 最近一次",lr===null?"—":lr+"<small>%</small>",ddr===null?"":("较上次 "+(ddr>=0?"+":"")+ddr+" 个百分点"),ddr===null?"flat":(ddr>=0?"up":"down"));
    kpis=stScore+stRate+stGoal+stRankLatest+(f.overallMedian3!==null?stMedian:"")+stCls;
  }else{
    kpis=stRankLatest+stMedian+stCls+stGoal+stScore;
  }
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">① 总览</h3><p class="card-sub">'
    +(mode==="score"?"分数视角优先 · 名次仍随时可看":"排名是主指标,总分仅供参考")+"</p></div>"
    +(f.totalSynthetic?'<span class="sv31-tag">口径: '+esc32(f.totalLabel||"总分")+'</span>':"")
    +'</div>'
    +'<div class="sv31-kpi">'+kpis+"</div>"
    +(f.scopeMissing?'<p class="card-sub" style="margin-top:8px">当前口径没有填写过排名数据,排名类统计暂不显示 —— 在考试录入弹窗补填「组合年排/班排」或科目排名后立即出现。</p>':"")
    +"</div>";
}
function insightsHtmlV32(ins){
  if(!ins.all.length)return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">② 智能提醒</h3></div></div><p class="card-sub">再积累一场考试,这里就会开始告诉你很多事。</p></div>';
  var tone={0:"i-mile",1:"i-risk",2:"i-warn",3:"i-warn",4:"i-up",5:"i-info"};
  var cards=ins.visible.map(function(o,idx){
    return '<div class="sv31-insight '+tone[o.sev]+'"><div class="ico">'+ICON32[o.icon]+"</div><div><b>"+o.title+"</b><p>"+o.body+"</p>"
      +(o.ev?'<span class="ev" data-sv31-ev="'+idx+'">查看依据</span>':"")+"</div>"
      +(o.ev?'<div class="sv31-evbody" hidden>'+esc32(o.ev)+"</div>":"")+"</div>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">② 智能提醒</h3><p class="card-sub">点「查看依据」可看计算过程</p></div><span class="sv31-tag">今天 '+ins.visible.length+" 条</span></div>"+cards
    +(ins.rest?'<p class="card-sub">还有 '+ins.rest+' 条较弱的提醒已折叠。</p>':"")+"</div>";
}
function trendHtmlV32(f,mode){
  var ts=f.totalSeries;
  var sub=mode==="rank"?"试卷难度不同,排名依然公平":"圆点 = 该科这张卷偏难。看分数起伏时请结合圆点。";
  var hasCls=ts.some(function(x){return x.cls!==null;});
  var paneRank="",paneScore="";
  if(f.scopeMissing){
    paneRank='<p class="card-sub">该口径没有填写过排名,排名走势线暂不显示 —— 在考试录入弹窗补填「组合年排/班排」或科目排名后出现。</p>';
  }else if(ts.length>=2){
    var labels=ts.map(function(x){return shortName32(x.name);});
    var lines=[];
    lines.push({vals:ts.map(function(x){return 100-x.pos;}),color:"var(--accent,#5d72e8)"});
    if(hasCls)lines.push({vals:ts.map(function(x){return x.cls===null?null:100-x.cls;}),color:"var(--green,#32a77a)",dash:true});
    paneRank='<div class="sv31-chart">'+lineSvgV32(lines,labels,{tickLabel:function(v){return "前"+clamp32(Math.round(100-v),0,99)+"%";}})+"</div>";
    var sc=ts.filter(function(x){return x.score!==null;});
    if(sc.length>=2){
      var idxMap={};sc.forEach(function(x,k){idxMap[x.i]=k;});
      var hardByExam={};
      Object.keys(f.flags).forEach(function(key){
        var parts=key.split("|"),lvl=f.flags[key].lvl;
        if(lvl>0)(hardByExam[parts[0]]=hardByExam[parts[0]]||[]).push({s:parts[1],lvl:lvl});
      });
      var marks=function(X,Y,W,H,B){
        var out="";
        Object.keys(hardByExam).forEach(function(i){
          if(idxMap[i]===undefined)return;
          var x=X(idxMap[i]),y=H-B-6,col=hardByExam[i].some(function(z){return z.lvl===2;})?"#d95c5c":"#e59b45";
          out+='<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="'+col+'"/>';
        });
        return out;
      };
      paneScore=lineSvgV32([{vals:sc.map(function(x){return x.score;}).map(function(v){return Math.round(v);}),color:"var(--accent,#5d72e8)"}],
        sc.map(function(x){return shortName32(x.name);}),{unit:"分",marks:marks});
    }
  }
  return '<div class="card"><div class="card-title-row">'
    +'<div><h3 class="card-title">③ 趋势与进步</h3><p class="card-sub">'+sub+"</p></div>"
    +'<span class="sv31-tag" title="当前分析的总分/序列口径，随顶部组合选择联动">数据口径: '+esc32(f.totalLabel||"总分")+"</span>"
    +'<div class="sv31-seg sv31-tabs"><button class="'+(mode==="rank"?"active":"")+'" data-sv31-tab="rank">排名走势</button>'
    +'<button class="'+(mode==="score"?"active":"")+'" data-sv31-tab="score">分数参考</button></div></div>'
    +'<div class="legend" style="margin-bottom:8px">'
    +'<span class="sv31-legend-t" title="点击打开:显示/颜色">'
    +'<i style="background:var(--accent,#5d72e8)"></i>年级排名</span>'
    +(hasCls?'<span class="sv31-legend-t" title="点击打开:显示/颜色">'
      +'<i style="background:var(--green,#32a77a)"></i>班级排名</span>':"")+"</div>"
    +'<div class="sv31-pane'+(mode==="rank"?" on":"")+'" data-pane="rank">'+(paneRank||(f.posCount===0
      ?'<p class="card-sub">这些考试没录名次,排名走势暂时是空的——已自动切到「分数参考」。下次补录「名次 + 总人数」即可解锁。</p>'
      :'<p class="card-sub">出分满 2 次后显示走势。</p>'))+"</div>"
    +'<div class="sv31-pane'+(mode==="score"?" on":"")+'" data-pane="score">'+(paneScore||'<p class="card-sub">出分满 2 次后显示分数走势。</p>')+"</div>"
    +speedTableHtmlV32(f)+"</div>";
}
function speedTableHtmlV32(f){
  var rows=[];
  f.subjects.forEach(function(s){
    var m=f.mom[s],vp=f.valid[s];
    if(!m||!vp||vp.length<3)return;
    var sp=speedTextV32(f,s);
    var st=f.stab[s];
    var pill=st?(st.cls==="ok"?'<span class="pill ok">稳</span>':st.cls==="mid"?'<span class="pill flat">有起伏</span>':'<span class="pill warn">不稳</span>'):'<span class="pill flat">数据少</span>';
    rows.push({s:s,text:sp.text,arrow:sp.arrow,up:sp.up,st:pill,pos:vp[vp.length-1].pos,n:m.names});
  });
  if(!rows.length)return "";
  rows.sort(function(a,b){
    var ra=a.up===true?0:(a.up===null?1:2),rb=b.up===true?0:(b.up===null?1:2);
    if(ra!==rb)return ra-rb;
    return Math.abs(b.n||0)-Math.abs(a.n||0);
  });
  var body=rows.map(function(r){
    var col=r.up===true?"var(--green,#32a77a)":(r.up===false?"var(--danger,#d95c5c)":"var(--muted,#788392)");
    return "<tr><td>"+esc32(r.s)+"</td><td class=\"num\" style=\"color:"+col+"\"><b>"+r.text+" "+r.arrow+"</b></td><td>"+r.st+'</td><td class="num">'+fmtPos32(r.pos)+"</td></tr>";
  }).join("");
  return '<div style="margin-top:14px"><b style="font-size:13px">进步速度榜 <span style="color:var(--muted);font-weight:600">(最近5次典型)</span></b>'
    +'<div class="sv31-scroll"><table style="margin-top:6px"><thead><tr><th>科目</th><th style="text-align:right">速度</th><th>发挥</th><th style="text-align:right">当前排名</th></tr></thead><tbody>'+body+"</tbody></table></div></div>";
}

/* ---------- ④ 学科结构 ---------- */
function structureHtmlV32(f,mode){
  var ov=f.overallLatest;
  var rows=[],quad=[],catchBars=[];
  /* 第一遍:收集各科当前位比 → 基准=六科中位数(比"和总分比"更公平:总分会被强科抬高/拉低) */
  var tmp=[];
  f.subjects.forEach(function(s){
    var vp=f.valid[s];if(vp.length<3)return; /* 与 ⑨「不足 3 次不给趋势判断」一致:2 场定不了强弱 */
    var cur=vp[vp.length-1].pos,m=f.mom[s];
    tmp.push({s:s,cur:cur,sp:(m&&!m.flat)?m.pp:null});
  });
  var medSub=tmp.length>=3?median32(tmp.map(function(x){return x.cur;})):null;
  var maxAdv=null;
  if(medSub!==null)tmp.forEach(function(x){var a=r32(medSub-x.cur);if(maxAdv===null||a>maxAdv)maxAdv=a;});
  /* 第二遍:出信号。adv=中位基准−当前,为正=强于自己的六科典型水平 */
  tmp.forEach(function(x){
    var s=x.s,cur=x.cur,sp=x.sp,m=f.mom[s];
    var namesTxt=(m&&m.flat)?"近期有起有伏,整体持平":(x.sp!==null?((x.sp>0?"前进约":"后退约")+r32(Math.abs(x.sp))+"个百分点"+(m&&m.names!=null?"("+Math.max(1,Math.round(Math.abs(m.names)))+"名)":"")):"数据少");
    var diff=ov===null?null:r32(ov-cur);
    var adv=medSub===null?null:r32(medSub-cur);
    var sig,sigCls="flat";
    var stUp=sp!==null&&sp>=4;
    var isTrump=(adv!==null&&adv>=8)||(adv!==null&&maxAdv!==null&&adv===maxAdv&&adv>=3);
    if(isTrump){sig="相对强项";sigCls="acc";}
    else if(cur>=50||(adv!==null&&adv<=-8)||(diff!==null&&diff<=-25)){sig="第一优先补";sigCls="bad";}
    else if(stUp&&Math.abs(f.streaks[s].cum)>=6){sig="进步最快";sigCls="acc";}
    else if(sp!==null&&Math.abs(sp)<1){sig="基本持平";sigCls="ok";}
    else{sig="稳步跟上";sigCls="flat";}
    rows.push({s:s,pos:cur,namesTxt:namesTxt,up:sp!==null&&sp>0,diff:diff,adv:adv,sig:sig,sigCls:sigCls});
    var reg=cur<=(ov===null?999:ov)?(sp!==null&&sp<0?"tl":"tr"):(sp!==null&&sp<0?"bl":"br");
    quad.push({s:s,pos:cur,
      c:reg==="tl"?"#5b6bd5":reg==="tr"?"#32a77a":reg==="bl"?"#d95c5c":"#e59b45"});
    /* 追赶地图:落后整体≥10个百分点的科,先收窄35%差距 */
    if(diff!==null&&diff<=-10){
      var target=r32(clamp32(cur+diff*0.35,5,90));
      var N=f.latestN[s];
      catchBars.push({s:s,from:cur,to:target,students:N?Math.max(1,Math.round((cur-target)*N/100)):null});
    }
  });
  rows.sort(function(a,b){return a.pos-b.pos;});
  var rowHtml=rows.map(function(r){
    return "<tr><td>"+esc32(r.s)+"</td><td class=\"num\" style=\"font-weight:800\">"+fmtPos32(r.pos)+"</td>"
      +'<td class="num" style="color:var('+(r.up?"--green,#32a77a":"--muted,#788392")+")\">"+r.namesTxt+"</td>"
      +'<td class="num">'+(r.adv===null?"—":(r.adv>=0?"+":"")+r.adv)+"</td>"
      +'<td><span class="pill '+r.sigCls+'">'+r.sig+"</span></td></tr>";
  }).join("");
  /* 四象限散点:横轴=名次变化/场(正为前进),纵轴=当前位比 */
  var quadPts=quad.map(function(q){
    var m=f.mom[q.s],N=f.latestN[q.s]||300;
    return {n:q.s,sp:(m&&!m.flat)?r32(m.pp*N/100):0,pos:q.pos,c:q.c,
      flat:(m&&m.flat)?1:0}; /* 正=前进=右 */
  });
  var catchHtml=catchBars.sort(function(a,b){return b.from-a.from;}).slice(0,2).map(function(c){
    var stu=c.students?(" · 约需超过"+c.students+"名同学"):"";
    var pct=Math.round(clamp32((c.from-c.to)/50*100,8,92));
    return '<div class="sv31-catch"><div class="h"><b>'+esc32(c.s)+" · 从前"+r32(c.from)+"% 追到 前"+r32(c.to)+"%</b>"
      +'<span class="dim">差'+r32(c.from-c.to)+"个百分点</span></div>"
      +'<div class="track"><div class="fill" style="width:'+pct+'%"></div></div>'
      +'<div class="sub">第一步先收窄三分之一差距'+stu+"</div></div>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">④ 学科结构</h3>'
    +'<p class="card-sub">「比六科典型」为正 = 强于你六科的典型水平;总分排名会受强科影响,这里看的是你自己的内部结构</p></div>'
    +lockTagV32(mode)+"</div>"
    +(rows.length?'<div class="sv31-scroll"><table><thead><tr><th>科目</th><th style="text-align:right">当前排名</th><th style="text-align:right">进步速度</th><th style="text-align:right">比六科典型</th><th>一句话点评</th></tr></thead><tbody>'+rowHtml+"</tbody></table></div>"
      +'<div class="sv31-g2" style="margin-top:16px">'
      +"<div><b style=\"font-size:13px\">六科定位图 <span style=\"color:var(--muted);font-weight:600\">(上下=排名好坏 · 左右=进步快慢 · 点圆点看详情)</span></b>"
      +'<div class="sv31-chart" id="sv31Quad">'+quadSvgV32(quadPts,ov)+"</div>"
      +'<div class="sv31-detail" id="sv31QuadDetail">点击任意科目圆点,这里会显示它的数据。</div></div>'
      +"<div>"+(catchHtml?'<b style="font-size:13px">还差多远 <span style="color:var(--muted);font-weight:600">(先收窄到常见水平)</span></b><div style="margin-top:8px">'+catchHtml+"</div>":"")+"</div></div>"
      :'<p class="card-sub">排名类结构分析需要每科的「名次 ÷ 人数」。当前考试都只有分数,所以这里是空的——其余模块已自动切换到分数口径。</p>')
    +"</div>";
}
/* ---------- ⑤ 个人最佳殿堂 ---------- */
function hallHtmlV32(f,mode){
  var rows=[],fallback=false;
  function push(name,vals,bestTxt,at,gapTxt,pill){rows.push({name:name,vals:vals,bestTxt:bestTxt,at:at,gapTxt:gapTxt,pill:pill});}
  if(f.totalSeries.length>=1){
    var best=Math.min.apply(null,f.totalSeries.map(function(x){return x.pos;}));
    var lastP=f.totalSeries[f.totalSeries.length-1].pos,gap=r32(lastP-best);
    var bestEntry=f.totalSeries.filter(function(x){return x.pos===best;})[0];
    var st=gap<=1?"ok":"acc";
    if(gap>5){
      var ncT=0;for(var kT=f.totalSeries.length-1;kT>0;kT--){if(f.totalSeries[kT].pos-best>5)ncT++;else break;}
      if(ncT>=2)st="warn";
    }
    push((f.totalLabel||"总分")+(f.totalSynthetic?"*":""),f.totalSeries.map(function(x){return 100-x.pos;}),fmtPos32(best),f.exams[bestEntry.i].name,
      gap<=0.05?"0":r32(Math.abs(gap))+"个百分点",
      '<span class="pill '+(st==="ok"?"ok":(st==="warn"?"warn":"acc"))+'" title="依据:距个人最佳 '+r32(Math.abs(gap))+' 个百分点">'+pbLabelV32(st,gap)+"</span>");
  }else if(!f.scopeMissing&&f.scoreSeries&&f.scoreSeries.length>=1){
    var bS=f.scoreSeries[0];f.scoreSeries.forEach(function(x){if(x.score>bS.score)bS=x;});
    fallback=true;
    push("总分",f.scoreSeries.map(function(x){return x.score;}),Math.round(bS.score)+"分",f.exams[bS.i].name,"—",
      '<span class="pill flat">分数参考</span>');
  }
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    if(vp.length){
      var p=f.pb[s],lastP=vp[vp.length-1].pos;
      var cls=p.st==="ok"?"ok":(p.st==="warn"?"warn":"acc");
      push(s,vp.map(function(x){return 100-x.pos;}),fmtPos32(p.pos),f.exams[p.i].name,
        p.gap<=0.05?"0":r32(Math.abs(p.gap))+"个百分点",
        '<span class="pill '+cls+'" title="依据:距个人最佳 '+r32(Math.abs(p.gap))+' 个百分点">'+pbLabelV32(p.st,p.gap)+"</span>");
    }else{
      var rr=f.series[s].filter(function(x){return x.rate!==null;});
      if(rr.length>=2){
        fallback=true;
        var b=rr[0];rr.forEach(function(x){if(x.rate>b.rate)b=x;});
        push(s,rr.map(function(x){return x.rate;}),Math.round(b.rate)+"%",f.exams[b.i].name,"—",
          '<span class="pill flat">仅同卷可比</span>');
      }
    }
  });
  if(!rows.length)return "";
  var body=rows.map(function(r){
    return "<tr><td>"+esc32(r.name)+"</td><td>"+sparkSvg32(r.vals)+"</td>"
      +'<td class="num" style="font-weight:800">'+r.bestTxt+"</td>"
      +'<td style="color:var(--muted)">'+esc32(shortName32(r.at))+"</td>"
      +'<td class="num">'+r.gapTxt+"</td>"
      +"<td>"+r.pill+"</td></tr>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">⑤ 个人最佳殿堂</h3>'
    +'<p class="card-sub">每科历史上最好的一次 · 现在离它还有多远'
    +(fallback?' · <b>标「分数参考」的行没有名次数据,走势只在同卷内可比</b>':"")+"</p></div>"
    +lockTagV32(mode)+"</div>"
    +'<div class="sv31-scroll"><table><thead><tr><th>科目</th><th>历次小走势</th><th style="text-align:right">历史最好</th><th>考到于</th><th style="text-align:right">现在差</th><th>状态</th></tr></thead><tbody>'
    +body+"</tbody></table></div></div>";
}
/* ---------- ⑥ 目标校准 ---------- */
function calibHtmlV32(f,mode){
  var rows=[];
  f.subjects.forEach(function(s){
    var t=f.tgt[s];if(!t||!t.mets.length)return;
    var last=null;
    f.series[s].forEach(function(x){if(x.target!==null&&x.actual!==null)last=x;});
    if(!last)return;
    var vp=f.valid[s],base=vp.length?median32(vp.slice(-3).map(function(x){return x.pos;})):null;
    var sug,cls="flat",label="维持";
    if(t.notMet>=3&&base!==null){sug=clamp32(r32(base-10),5,80);cls="bad";label="下调至前"+sug+"%";}
    else if(t.met>=3){var b=f.pb[s]?f.pb[s].pos:base;sug=clamp32(r32(b-4),5,80);cls="ok";label="上调至前"+sug+"%";}
    else{sug=base!==null?r32(base):null;label=sug!==null?"维持前"+sug+"%":"—";}
    /* 历史类比:找一次排名接近建议线的真实场次 */
    var ref="—";
    if(sug!==null){
      var best=null;
      vp.forEach(function(x){var d=Math.abs(x.pos-sug);if(best===null||d<best.d)best={d:d,x:x};});
      if(best&&best.d<=6)ref=esc32(shortName32(f.exams[best.x.i].name))+"(前"+r32(best.x.pos)+"%≈"+Math.round(best.x.actual)+"分)";
    }
    var streak=t.notMet>=2?'<span class="pill bad">未达×'+t.notMet+"</span>":t.met>=2?'<span class="pill ok">达成×'+t.met+"</span>":'<span class="pill flat">刚起步</span>';
    rows.push({s:s,tg:last.target,ac:last.actual,streak:streak,label:label,cls:cls,ref:ref});
  });
  if(!rows.length)return "";
  var body=rows.map(function(r){
    return "<tr><td>"+esc32(r.s)+"</td><td class=\"num\">"+(r.tg===null?"—":Math.round(r.tg))+" / "+(r.ac===null?"—":Math.round(r.ac))+"</td>"
      +"<td>"+r.streak+'</td><td><span class="pill '+r.cls+'">'+r.label+'</span></td><td style="color:var(--muted)">'+r.ref+"</td></tr>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">⑥ 目标校准</h3>'
    +'<p class="card-sub">建议以排名为准;参照分数来自你真正考过的场次</p></div>'
    +lockTagV32(mode)+"</div>"
    +'<div class="sv31-scroll"><table><thead><tr><th>科目</th><th style="text-align:right">目标/实际</th><th>最近战绩</th><th>下次建议</th><th>参照(你考过的场次)</th></tr></thead><tbody>'
    +body+"</tbody></table></div></div>";
}

/* ---------- ⑦ 名次竞争力 ---------- */
function compHtmlV32(f,mode){
  var ts=f.totalSeries;
  if(ts.length<2)return "";
  var labels=ts.map(function(x){return shortName32(x.name);});
  var lines=[{vals:ts.map(function(x){return 100-x.pos;}),color:"var(--accent,#5d72e8)"}];
  var hasCls=ts.some(function(x){return x.cls!==null;});
  if(hasCls){
    var yl=null;
    lines.push({vals:ts.map(function(x){return x.cls===null?null:100-x.cls;}),color:"var(--green,#32a77a)",dash:true});
  }
  var chart=lineSvgV32(lines,labels,{tickLabel:function(v){return "前"+clamp32(Math.round(100-v),0,99)+"%";}});
  var lastCls=null;for(var i=ts.length-1;i>=0;i--){if(ts[i].cls!==null){lastCls=ts[i].cls;break;}}
  var diffStat="",diffCard="";
  if(lastCls!==null&&f.overallLatest!==null){
    var d=r32(f.overallLatest-lastCls),dAbs=Math.abs(d);
    diffStat='<span style="margin-left:auto;font-weight:700;color:var(--text,#18212f)">班里比年级'+(d>=0?"靠前":"靠后")+" "+dAbs+" 个百分点</span>";
    diffCard=d>2?'<div class="sv31-insight i-info"><div class="ico">'+ICON32.shield+"</div><div><b>你的主要对手在外班</b><p>班里的名次一直比全年级更靠前——班内你已是头部,真正拉开差距的是外班同学。</p></div></div>"
      :(d<-2?'<div class="sv31-insight i-warn"><div class="ico">'+ICON32.shield+'</div><div><b>班内竞争更激烈</b><p>全年级里你的位置比班里更靠前——同班同学整体更强。先把班内名次提上来,年级位次自然会跟着走。</p></div></div>'
      :'<div class="sv31-insight i-info"><div class="ico">'+ICON32.search+'</div><div><b>班里家外基本同步</b><p>班级与年级的相对位置接近,说明班级整体水平与年级差距不大。</p></div></div>');
  }
  /* 哪科最能打:基准=各科最新位比的中位数(总分会被强科拉偏,内部结构更公平) */
  var curs=[];
  f.subjects.forEach(function(s){var vp=f.valid[s];if(vp.length>=3)curs.push(vp[vp.length-1].pos);});
  var medAll=curs.length>=3?median32(curs):null;
  var chips=[];
  f.subjects.forEach(function(s){
    var vp=f.valid[s];if(vp.length<3)return; /* 与 ⑨「不足 3 次不给趋势判断」一致 */
    var cur=vp[vp.length-1].pos;
    var adv=medAll===null?(f.overallLatest===null?null:r32(f.overallLatest-cur)):r32(medAll-cur);
    chips.push({s:s,adv:adv});
  });
  chips.sort(function(a,b){return (b.adv===null?-999:b.adv)-(a.adv===null?-999:a.adv);});
  var chipHtml=chips.map(function(c,idx){
    var v=c.adv===null?0:c.adv;
    var cls=v>=8?"acc":(v<=-8?"bad":(idx===0?"ok":"flat"));
    var txt=c.adv===null?"数据不足":(v>=2?"最能打(+"+v+")":(v<=-8?"最大短板("+v+")":(v<=-2?"慢"+Math.abs(v):"与典型相当")));
    return '<span class="pill '+cls+'" style="font-size:11px;padding:6px 10px">'+esc32(c.s)+" "+txt+"</span>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">⑦ 名次竞争力</h3>'
    +'<p class="card-sub">你在班里和全年级各排多少 · 哪科最能打</p></div>'
    +lockTagV32(mode)+"</div>"
    +'<div class="sv31-g2"><div>'
    +'<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--accent,#5d72e8)"></i>年级排名</span>'
    +(hasCls?'<span><i style="background:var(--green,#32a77a)"></i>班级排名</span>':"")+diffStat+"</div>"
    +'<div class="sv31-chart" id="sv31Scissor">'+chart+"</div>"+diffCard+"</div>"
    +"<div><b style=\"font-size:13px\">哪科最能打? <span style=\"color:var(--muted);font-weight:600\">(比你的六科典型水平)</span></b>"
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+chipHtml+"</div></div></div></div>";
}
/* ---------- ⑧ 热力矩阵 + 分布带 + 个人纪录 ---------- */
function matrixSectionHtmlV32(f,mode){
  var rgb=accentRgbV32();
  var subs=f.subjects.filter(function(s){
    return f.series[s]&&f.series[s].some(function(x){return mode==="rank"?x.pos!==null:x.rate!==null;});
  });
  var rowsHtml="";
  f.exams.forEach(function(e,i){
    var cells=subs.map(function(s){
      var key=i+"|"+s,fl=f.flags[key];
      /* 难度分标注:P(难)/P(易) 百分数,与深度分析板块同源 */
      var dot="";
      if(fl){
        var col=fl.lvl===2?"#d95c5c":fl.lvl===1?"#e59b45":"#32a77a";
        dot='<span class="sv31-dot" style="background:'+col+'"></span>';
        if(fl.pH!=null){
          var isHard=fl.lvl>0,pv=Math.round((isHard?fl.pH:fl.pE)*100);
          dot+='<span style="font-size:9px;font-weight:700;opacity:.85;margin-left:3px;'+
            'vertical-align:1px;color:'+(isHard?"#ffd9d9":"#d6f5e5")+'">'+
            (isHard?"难":"易")+pv+"%</span>";
        }
      }
      if(mode==="rank"){
        var p=posYearOf32(e,rowV32(e,s));
        if(p===null)return "<td>—</td>";
        return '<td style="background:'+rgba32(rgb,clamp32(0.82-(p-8)/46*0.62,0.14,0.85))+';color:#fff">'+r32(p)+dot+"</td>";
      }else{
        var rt=rateOf32(rowV32(e,s));
        if(rt===null)return "<td>—</td>";
        var hl=fl&&fl.lvl>0?"background:#fdf3e4;":"";
        return '<td style="'+hl+'border-radius:6px">'+Math.round(rt)+"%"+dot+"</td>";
      }
    }).join("");
    var totCell;
    if(f.totalSynthetic){
      /* 合成口径:列值=所选科目位比中位数(与趋势线一致),分数模式=成员得分率中位 */
      var hit=f.totalSeries.filter(function(x){return x.i===i;})[0];
      if(mode==="rank"){
        totCell=hit?'<td class="sv31-tot" style="background:'+rgba32(rgb,clamp32(0.82-(hit.pos-8)/46*0.62,0.14,0.85))+';color:#fff">'+r32(hit.pos)+"</td>"
          :"<td class='sv31-tot'>—</td>";
      }else{
        var rs=[];subs.forEach(function(s){var rr=rateOf32(rowV32(e,s));if(rr!==null)rs.push(rr);});
        var mr=rs.length?median32(rs):null;
        totCell='<td class="sv31-tot"><b>'+(mr===null?"—":Math.round(mr)+"%")+"</b></td>";
      }
    }else{
      var tp=totalPosYear32(e);
      totCell=tp===null?"<td class='sv31-tot'>—</td>"
        :mode==="rank"?'<td class="sv31-tot" style="background:'+rgba32(rgb,clamp32(0.82-(tp-8)/46*0.62,0.14,0.85))+';color:#fff">'+r32(tp)+"</td>"
        :'<td class="sv31-tot"><b>'+(examRateV32(e)===null?"—":Math.round(examRateV32(e))+"%")+"</b></td>";
    }
    rowsHtml+="<tr><td>"+esc32(shortName32(e.name))+"</td>"+cells+totCell+"</tr>";
  });
  var head="<tr><th>考试</th>"+subs.map(function(s){return "<th>"+esc32(s)+"</th>";}).join("")+"<th>"+esc32(f.totalLabel||"总分")+"</th></tr>";
  /* 分布带 */
  var bands=[{l:"前10%内",a:0,b:10,c:"rgba(93,114,232,.9)"},{l:"前10–20%",a:10,b:20,c:"rgba(93,114,232,.7)"},
    {l:"前20–30%",a:20,b:30,c:"rgba(93,114,232,.5)"},{l:"前30–50%",a:30,b:50,c:"rgba(93,114,232,.32)"},
    {l:"50%之后",a:50,b:101,c:"rgba(93,114,232,.16)"}];
  var donutData=[];
  bands.forEach(function(b){
    var cnt=f.totalSeries.filter(function(x){return x.pos>b.a&&x.pos<=b.b;}).length;
    if(cnt>0)donutData.push({l:b.l,v:cnt,c:b.c});
  });
  var dom="";
  if(donutData.length){
    var most=donutData.slice().sort(function(a,b){return b.v-a.v;})[0];
    dom='<b style="font-size:13px">你的总分常落在哪个区间 <span style="color:var(--muted);font-weight:600">(共'+f.totalSeries.length+'次出分)</span></b>'
      +'<div class="sv31-g2" style="margin-top:8px;align-items:center"><div class="sv31-chart">'+donutSvgV32(donutData,f.totalSeries.length,"出分落档")+"</div>"
      +'<div><div class="sv31-ext"><div class="t">最常见的水平</div><div class="v">'+esc32(most.l)+"</div>"
      +'<div class="s">'+f.totalSeries.length+"次里有"+most.v+"次在这个区间</div></div></div></div>";
  }
  /* 个人纪录 */
  var recs=[];
  var diffs=[];for(var j=1;j<f.totalSeries.length;j++)diffs.push(f.totalSeries[j].pos-f.totalSeries[j-1].pos);
  var bestRun=0,bestSum=0,run=0,sum=0;
  diffs.forEach(function(d){if(d<0){run++;sum+=d;}else{run=0;sum=0;}if(run>bestRun||(run===bestRun&&sum<bestSum)){bestRun=run;bestSum=sum;}});
  if(bestRun>=2&&bestSum<=-3){
    var runNames=[];
    f.totalSeries.slice(-(bestRun+1)).forEach(function(x){runNames.push(shortName32(x.name)+" "+fmtPos32(x.pos));});
    recs.push({t:"连续进步",v:bestRun+" 场 · 累计前进"+r32(Math.abs(bestSum))+"个百分点",s:"总分排名连续段",
      ev:["相关考试: "+runNames.join(" → "),
        "数据: 口径="+(f.totalLabel||"总分")+",位比连续变小",
        "计算: 累计位比变化 "+r32(Math.abs(bestSum))+"pp",
        "判断: "+bestRun+" 场连续进步段,非单场爆发"]});
  }
  /* 单场最大进步/退步:同质池校验(相邻两场参考人数差≥30% → 跨池不可比,剔除候选) */
  function poolHomog(a,b){return !(a.N&&b.N&&Math.abs(b.N-a.N)/Math.max(a.N,b.N)>=0.3);}
  function pairEvidence(from,to,impPP){
    var f1=from.N?from.pos.toFixed(1)+"%(第"+Math.round(from.pos*from.N/100)+"名/"+from.N+")":"前"+from.pos.toFixed(1)+"%";
    var f2=to.N?to.pos.toFixed(1)+"%(第"+Math.round(to.pos*to.N/100)+"名/"+to.N+")":"前"+to.pos.toFixed(1)+"%";
    return shortName32(f.exams[from.i].name)+"("+f1+") → "+shortName32(f.exams[to.i].name)+"("+f2+
      ") · 位比差"+impPP.toFixed(1)+"pp"+(to.N?" × "+to.N+"人≈"+Math.round(impPP*to.N/100)+"名":"");
  }
  var jump=null;
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    for(var k=1;k<vp.length;k++){
      if(!poolHomog(vp[k-1],vp[k]))continue; /* 换池:位比不可比 */
      var imp=vp[k-1].pos-vp[k].pos,namesN=vp[k].N?imp*vp[k].N/100:null;
      if(!jump||imp>jump.imp)jump={s:s,imp:imp,names:namesN,from:vp[k-1],to:vp[k]};
    }
  });
  if(jump&&jump.imp>2)recs.push({t:"单场最大进步",v:esc32(jump.s)+" · "+(jump.names!=null?"约"+Math.round(jump.names)+"名":"前"+jump.imp+"个百分点"),
    s:"两场人数相近，位比可直接比较",
    ev:["相关考试: "+shortName32(f.exams[jump.from.i].name)+" → "+shortName32(f.exams[jump.to.i].name),
      "数据: "+(jump.from.N?"前"+jump.from.pos.toFixed(1)+"%(第"+Math.round(jump.from.pos*jump.from.N/100)+"名/"+jump.from.N+")":"前"+jump.from.pos.toFixed(1)+"%")+
        " → "+(jump.to.N?"前"+jump.to.pos.toFixed(1)+"%(第"+Math.round(jump.to.pos*jump.to.N/100)+"名/"+jump.to.N+")":"前"+jump.to.pos.toFixed(1)+"%"),
      "计算: 位比差 "+jump.imp.toFixed(1)+"pp"+(jump.to.N?" × "+jump.to.N+"人 ≈ "+Math.round(jump.imp*jump.to.N/100)+"名":""),
      "判断: 同池比较(人数差<30%),计入进步纪录"]});
  var hi=null;
  f.subjects.forEach(function(s){f.series[s].forEach(function(x){
    if(x.actual!==null&&x.max!==null&&(!hi||x.actual>hi.a))hi={s:s,a:x.actual,m:x.max,x:x};});});
  if(hi)recs.push({t:"单科最高分",v:esc32(hi.s)+" "+Math.round(hi.a)+"/"+Math.round(hi.m),
    s:"仅该卷内可比",
    ev:["相关考试: "+shortName32(f.exams[hi.x.i].name),
      "数据: "+esc32(hi.s)+" 得分 "+Math.round(hi.a)+"/"+Math.round(hi.m),
      "计算: 得分率 "+Math.round(hi.a/hi.m*100)+"%",
      "判断: 分数受卷面难度影响,只在同一张卷子内比较,不跨场排名"]});
  var drop=null;
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    for(var k=1;k<vp.length;k++){
      if(!poolHomog(vp[k-1],vp[k]))continue; /* 换池:如选科分层,位比暴跌多半是人群变化 */
      var dp2=vp[k].pos-vp[k-1].pos;
      if(!drop||dp2>drop.d)drop={d:dp2,s:s,from:vp[k-1],to:vp[k],N:vp[k].N};
    }
  });
  if(drop&&drop.d>2)recs.push({t:"单场最大退步",v:esc32(drop.s)+" · 后退"+(drop.N?Math.round(drop.d*drop.N/100)+"名":r32(drop.d)+"个百分点"),
    s:(f.flags[drop.to.i+"|"+drop.s]&&f.flags[drop.to.i+"|"+drop.s].lvl>0)?"该场难度信号为偏难":"同池比较，位比可直接比较",
    ev:["相关考试: "+shortName32(f.exams[drop.from.i].name)+" → "+shortName32(f.exams[drop.to.i].name),
      "数据: "+(drop.from.N?"前"+drop.from.pos.toFixed(1)+"%(第"+Math.round(drop.from.pos*drop.from.N/100)+"名/"+drop.from.N+")":"前"+drop.from.pos.toFixed(1)+"%")+
        " → "+(drop.to.N?"前"+drop.to.pos.toFixed(1)+"%(第"+Math.round(drop.to.pos*drop.to.N/100)+"名/"+drop.to.N+")":"前"+drop.to.pos.toFixed(1)+"%"),
      "计算: 位比差 "+drop.d.toFixed(1)+"pp"+(drop.to.N?" × "+drop.to.N+"人 ≈ "+Math.round(drop.d*drop.to.N/100)+"名":""),
      "判断: "+((f.flags[drop.to.i+"|"+drop.s]&&f.flags[drop.to.i+"|"+drop.s].lvl>0)
        ?"该场难度信号偏难,退步幅度含卷面因素,先复盘再下结论"
        :"同池比较(人数差<30%),位比变化真实可信")]});
  /* 换池提示卡:被同质池规则剔除的最大落差,如实说明而非冒充退步 */
  var poolNote=null;
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    for(var k=1;k<vp.length;k++){
      if(poolHomog(vp[k-1],vp[k]))continue;
      var dp3=vp[k].pos-vp[k-1].pos;
      if(dp3>2&&(!poolNote||dp3>poolNote.d))
        poolNote={d:dp3,s:s,from:vp[k-1],to:vp[k]};
    }
  });
  if(poolNote)recs.push({t:"考试人群变化提示",
    v:esc32(poolNote.s)+" · 参考人数"+poolNote.from.N+"→"+poolNote.to.N,
    s:"两场人群不同，位比不可比，不计入进步/退步",
    ev:["相关考试: "+shortName32(f.exams[poolNote.from.i].name)+" → "+shortName32(f.exams[poolNote.to.i].name),
      "数据: 前"+poolNote.from.pos.toFixed(1)+"%(第"+Math.round(poolNote.from.pos*poolNote.from.N/100)+"名/"+poolNote.from.N+") → 前"+poolNote.to.pos.toFixed(1)+"%(第"+Math.round(poolNote.to.pos*poolNote.to.N/100)+"名/"+poolNote.to.N+")",
      "计算: 位比差 "+poolNote.d.toFixed(1)+"pp,但参考人数差 "+Math.round(Math.abs(poolNote.to.N-poolNote.from.N)/Math.max(poolNote.from.N,poolNote.to.N)*100)+"% ≥ 30%",
      "判断: 跨池比较(如选科分层/范围变化),位比暴跌不代表真实退步,已从进步/退步候选中剔除"]});
  var extHtml=recs.map(function(r){
    return '<div class="sv31-ext"><div class="t">'+r.t+'</div><div class="v">'+r.v+'</div><div class="s">'+r.s+"</div>"+eviHtmlV32(r.ev)+"</div>";
  }).join("");
  return '<div class="card"><div class="card-title-row">'
    +'<div><h3 class="card-title">⑧ 全量统计矩阵</h3><p class="card-sub" id="sv31HeatSub">'
    +(mode==="rank"?"数字越小、颜色越深 = 名次越好":"得分率仅在同一张卷子内可比;圆点 = 这科这次偏难/偏易")
    +'</p></div><div class="legend sv31-nopalette"><span><span class="sv31-dot" style="background:#d95c5c"></span>这科这次偏难</span>'
    +'<span><span class="sv31-dot" style="background:#e59b45"></span>偏难(关注)</span>'
    +'<span><span class="sv31-dot" style="background:#32a77a"></span>偏易</span></div></div>'
    +(rowsHtml?'<div class="sv31-scroll"><table class="sv31-heat"><thead>'+head+"</thead><tbody>"+rowsHtml+"</tbody></table></div>"
      +'<p class="card-sub" style="margin-top:8px">圆点由「难度贝叶斯分档」模型推断（与深度分析板块同一算法），详见页底方法论。</p>':'<p class="card-sub">还没有可展示的成绩。</p>')
    +(dom?'<div style="margin-top:18px">'+dom+"</div>":"")
    +(extHtml?'<div style="margin-top:18px"><b style="font-size:13px">个人纪录 <span style="color:var(--muted);font-weight:600">(分数项只和自己那张卷子比)</span></b>'
      +'<div class="sv31-ext-grid" style="margin-top:8px">'+extHtml+"</div></div>":"")
    +"</div>";
}
/* ---------- ⑨ 数据质量 + 方法论 ---------- */
var METHOD_MATH_V32='<div class="formula">'
  +'排名位置:<span class="mth"><i>p</i><sub>i</sub> = <span class="frac"><span class="num"><i>r</i><sub>i</sub></span><span class="den"><i>N</i><sub>i</sub></span></span> × 100</span>(第 r<sub>i</sub> 名 / 共 N<sub>i</sub> 人,记作「前 p<sub>i</sub>%」)<br>'
  +'进步速度:<span class="mth"><i>v</i> = med<sub>j</sub>(<i>p</i><sub>j</sub> − <i>p</i><sub>j+1</sub>)</span>,正为前进;折算名次 = <span class="mth"><i>v</i>·N/100</span>;单场进步/退步卡仅在两场参考人数相近(差&lt;30%)时入选,并附前后位比与折算式<br>'
  +'难度信号(与深度分析板块统一):对每科位比序列做<b>贝叶斯分档推断</b>——把「这场卷子偏难/偏易」当作隐变量,用逐场位比的意外幅度 + 参考人数的抽样噪声宽度联合推断,输出每场 P(难) / P(易);P(难)≥0.6 → 偏难(红点),0.4~0.6 → 关注(橙点),P(易)≥0.4 → 偏易(绿点)<br>'
  +'难度置信差: <span class="mth">e = −100×(P(难)−P(易))</span>,负值越负越像难卷;该概率已按参考人数自动校准——小池子的位比波动天然更宽,不会误报</div>';
function qualityHtmlV32(f){
  var q=f.quality,items=[];
  q.pending.forEach(function(e){items.push("<li>有 1 场还没录成绩:"+esc32(shortName32(e.name))+' <a href="javascript:void(0)" data-sv31-edit="'+esc32(e.id||"")+'" data-date="'+esc32(e.exam_date||"")+'" data-name="'+esc32(e.name||"")+'">去补录</a></li>');});
  if(q.missCls.length)items.push("<li>"+q.missCls.length+" 次考试没填班级排名:班级对比会自动跳过它们</li>");
  if(q.zeroRankSubs.length)items.push("<li>"+esc32(q.zeroRankSubs.join("、"))+" 还没录过排名:排名类分析暂缺这一科</li>");
  if(q.smallSubs.length)items.push("<li>数据太少不下结论:"+esc32(q.smallSubs.join("、"))+"不足 3 次成绩,不给趋势判断</li>");
  if(q.smallCohort.length)items.push("<li>"+q.smallCohort.length+" 次考试参考人数很少(30人以内):相关说法自动更保守</li>");
  if(q.cohortChange>0)items.push("<li>"+q.cohortChange+" 处相邻考试的参考人数变化≥30%:跨场名次跳变可能由范围变化引起,相关结论已自动谨慎处理</li>");
  return '<div class="card sv31-quality"><div class="card-title-row"><div><h3 class="card-title">⑩ 数据质量与方法论</h3>'
    +'<p class="card-sub">缺什么、弱在哪,明明白白告诉你</p></div></div>'
    +(items.length?'<ul style="margin:0;padding-left:18px">'+items.join("")+"</ul>":'<p class="card-sub">当前范围内没有发现缺口,数据很完整。</p>')
    +'<details class="sv31-method"><summary>这些结论是怎么算出来的?(方法论与局限声明)</summary><div class="m-body">'
    +'<b>名词对照</b>:「排名」指名次÷参考人数(第57名/310人=前18%,专业术语叫位比);「个百分点」即 pp。<br>'
    +'<b>口径纪律</b>:跨考试比较一律使用排名位置;分数与得分率只在同一张卷子内使用。手动填写过总分时以手动值为准;不计总分的科目不参与总分口径。<br>'
    +'<b>序数性声明</b>:排名位置是序数指标,前10%区每1个百分点的难度大于中段,规则阈值按分段收紧。<br>'
    +'<b>科目级难度信号(统一版)</b>:排名对卷面难度天然免疫,分数不是。与「深度分析」板块使用同一难度算法(贝叶斯分档推断,输出 P(难)/P(易)),矩阵圆点、难度卡、退步卡三处结论同源;需≥3场有效位比,不足时自动降级为旧启发式或不出点。'
    +METHOD_MATH_V32
    +'<b>局限声明</b>:① 难度信号是推断,也可能是临场失误,仅用于解读,不改变排名结论;② 无法区分「卷易」与「你该科突然开窍」;③ 无他人分数,分布类结论仅基于你自己的等位线。<br>'
    +'<b>样本门槛</b>:进步速度与稳定性≥3场;离群检测≥5场,不足时降级措辞。</div></details></div>';
}
/* ---------- 页面装配 ---------- */
function statsPageV32(f){
  var scope=(typeof state!=="undefined"&&state.sv31)||{};
  var mode=scope.mode||"rank";
  /* 组合+单科选择条(样式与全站 .chip 统一,主题可变;数据源=账户组合设置 state.modulesV18) */
  var mods=(function(){try{return state.modulesV18||[];}catch(e){return[];}})();
  var allSubs=(typeof window!=="undefined"&&window.__v32AllSubjects)||f.subjects;
  var sel=scope.subjMod||null;
  function selIs(arr){return sel&&arr&&sel.length===arr.length&&sel.slice().sort().join("|")===arr.slice().sort().join("|");}
  function chipBtn(val,label,on,extra){
    return '<button data-sv31-combo="'+esc32(val)+'" class="chip'+(on?" active":"")+'"'+
      (extra?' title="'+esc32(extra)+'"':"")+'>'+label+"</button>";
  }
  var comboRow=mods.length
    ?'<div class="combo-chips-v25"><span class="label">组合：</span>'+
      chipBtn("__all__","全部",!sel)+
      mods.map(function(m){return chipBtn(esc32(m.id),esc32(m.name),selIs(m.subjects),m.subjects.join(" / "));}).join("")+
      "</div>"
    :'';
  var subjRow='<div class="combo-chips-v25"><span class="label">单科：</span>'+
    allSubs.map(function(s){
      return chipBtn("__sub:"+s,s,!!(sel&&sel.length===1&&sel[0]===s),"只看这一科");
    }).join("")+"</div>";
  var modBar=(comboRow||subjRow)?'<div style="margin-top:2px" '+
    'title="与账户「组合设置」联动；选中后，下方所有板块只分析该组合/科目">'+comboRow+subjRow+"</div>":"";
  var head='<div class="page-head"><div><h2>统计分析</h2><p>'+f.exams.length+" 次考试 · "+Math.max(f.scoredExams,f.totalSeries.length,f.rateCount)+" 场可分析</p></div>"
    +'<span class="sv31-tag">本地实时计算 · 数据不出你的设备</span></div>';
  if(f.scoredExams<1){
    return '<div class="sv31-page">'+head+modBar+controlsHtmlV32(f)
      +'<div class="card"><div class="card-title-row"><div><h3 class="card-title">先从一次考试开始</h3></div></div>'
      +'<p class="card-sub">这里会用排名帮你回答三个问题:我在进步吗?强弱科在哪?目标定得合理吗?现在还没有已出分的考试——去「考试记录」录入第一场吧。</p></div>'
      +qualityHtmlV32(f)+"</div>";
  }
  var ins=buildInsightsV32(f);
  return '<div class="sv31-page">'+head+modBar+controlsHtmlV32(f)
    +kpiHtmlV32(f,mode)
    +insightsHtmlV32(ins)
    +trendHtmlV32(f,mode)
    +structureHtmlV32(f,mode)
    +hallHtmlV32(f,mode)
    +calibHtmlV32(f,mode)
    +compHtmlV32(f,mode)
    +matrixSectionHtmlV32(f,mode)
    +qualityHtmlV32(f)
    +'</div>';
}

/* ================= 样式(全部走语义变量 + 夜色主题覆盖) ================= */
function injectStylesV32(){
  if(document.getElementById("app-v32-style"))return;
  var css=[
    ".sv31-page .card{padding:20px 22px;margin-bottom:16px}",
    "@media(max-width:620px){.sv31-page .card{padding:15px 14px;margin-bottom:12px}}",
    ".sv31-chart{margin-top:10px}",
    ".sv31-page table{width:100%;border-collapse:collapse;font-size:12px}",
    ".sv31-page th{text-align:center;font-size:10.5px;color:var(--muted,#788392);font-weight:700;border-bottom:1.5px solid var(--line,#e8ebf0);padding:7px 8px;white-space:nowrap}",
    ".sv31-page th:first-child{text-align:left}",
    ".sv31-page td{padding:9px 8px;border-bottom:1px solid var(--line,#e8ebf0);text-align:center;font-weight:700;font-variant-numeric:tabular-nums}",
    ".sv31-page tr:last-child td{border-bottom:0}",
    ".sv31-page td:first-child{text-align:left;font-weight:600}",
    ".sv31-page td.num{text-align:right}",
    ".sv31-tot{outline:2px solid var(--accent-soft,#eef1ff);outline-offset:-2px;border-radius:6px}",
    ".sv31-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}",
    ".sv31-scroll-x{overflow-x:auto;max-width:100%;scrollbar-width:none}.sv31-scroll-x::-webkit-scrollbar{display:none}",
    ".sv31-seg{display:flex;background:var(--panel-solid,#fff);border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:4px;gap:4px;margin-left:auto;flex:none}",
    ".sv31-seg button{border:0;background:transparent;color:var(--muted,#788392);padding:8px 14px;border-radius:9px;font-size:12.5px;cursor:pointer;font-family:inherit;font-weight:600}",
    ".sv31-seg button.active{background:var(--accent,#5d72e8);color:#fff}",
    ".sv31-warn{display:none;background:#fdf3e4;border:1px solid #f2ddb8;color:#7a5a20;font-size:12.5px;line-height:1.6;border-radius:13px;padding:11px 14px;margin-bottom:16px}",
    "html[data-theme='night'] .sv31-warn{background:rgba(229,155,69,.12);border-color:rgba(229,155,69,.35);color:#e8c07d}",
    "body.mode-score .sv31-warn,.sv31-page.mode-score .sv31-warn{display:block}",
    ".sv31-modenote{font-size:12px;line-height:1.5;color:var(--muted,#788392);margin:-4px 0 14px}",
    ".sv31-kpi{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(min-width:760px){.sv31-kpi{grid-template-columns:repeat(3,1fr)}}",
    ".sv31-stat{padding:15px;border:1px solid var(--line,#e8ebf0);border-radius:15px;background:var(--panel-solid,#fff)}",
    ".sv31-stat .lb{font-size:11.5px;color:var(--muted,#788392);font-weight:600}",
    ".sv31-stat .v{font-size:26px;font-weight:800;margin:7px 0 4px;font-variant-numeric:tabular-nums}.sv31-stat .v small{font-size:13px;color:var(--muted,#788392);font-weight:600}",
    ".sv31-stat .d{font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px;display:inline-block}",
    ".sv31-stat .d.up{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}.sv31-stat .d.down{background:rgba(217,92,92,.12);color:var(--danger,#d95c5c)}",
    ".sv31-stat .d.flat{background:var(--chip-bg,#f1f3f8);color:var(--muted,#788392)}.sv31-stat .d.info,.sv31-stat .d.warn{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}",
    ".sv31-insight{display:flex;gap:12px;border:1px solid var(--line,#e8ebf0);border-left-width:4px;border-radius:14px;padding:13px 15px;background:var(--panel-solid,#fff);margin-bottom:10px;flex-wrap:wrap}",
    ".sv31-insight .ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}",
    ".sv31-insight .ico svg{width:17px;height:17px;stroke-width:2;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}",
    ".sv31-insight b{font-size:13.5px}.sv31-insight p{margin:4px 0 0;font-size:12.5px;color:var(--muted,#667085);line-height:1.7;width:100%}",
    ".sv31-insight .ev{cursor:pointer;font-size:10.5px;color:var(--muted,#98a1ae);background:var(--chip-bg,#f4f6fa);border-radius:7px;padding:2px 7px}",
    ".sv31-insight .ev:hover{color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff)}",
    ".sv31-evbody{width:100%;font-size:11px;color:var(--muted,#788392);background:var(--chip-bg,#f4f6fa);border-radius:8px;padding:7px 10px;line-height:1.7;margin-top:9px;white-space:pre-line}",
    /* ⓘ 折叠依据:圆圈i默认收起,点击展开结构化依据(考试/数据/计算/判断) */
    ".sv31-evi{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;border:1px solid rgba(127,127,127,.55);font-size:9.5px;font-style:normal;font-weight:700;cursor:pointer;opacity:.5;vertical-align:-3px;margin-left:5px;user-select:none;flex:none}",
    ".sv31-evi:hover{opacity:1;border-color:var(--accent,#5d72e8);color:var(--accent,#5d72e8)}",
    ".sv31-evib{display:block;margin-top:7px;padding:8px 11px;border-left:3px solid var(--accent,#5d72e8);background:var(--chip-bg,#f4f6fa);border-radius:0 8px 8px 0;font-size:11px;line-height:1.85;color:var(--muted,#788392);white-space:pre-line}",
    ".i-mile{border-left-color:var(--green,#32a77a)}.i-mile .ico{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}",
    ".i-up{border-left-color:var(--accent,#5d72e8)}.i-up .ico{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}",
    ".i-warn{border-left-color:#e59b45}.i-warn .ico{background:#fdf3e4;color:#a06a1c}",
    ".i-risk{border-left-color:var(--danger,#d95c5c)}.i-risk .ico{background:rgba(217,92,92,.12);color:var(--danger,#d95c5c)}",
    ".i-info{border-left-color:#8b9af0}.i-info .ico{background:var(--accent-soft,#eef1ff);color:#5b6bd5}",
    "html[data-theme='night'] .i-warn .ico{background:rgba(229,155,69,.16);color:#e8c07d}",
    "html[data-theme='night'] .i-risk .ico{background:rgba(217,92,92,.18);color:#f0a3a3}",
    ".sv31-pane{display:none}.sv31-pane.on{display:block}",
    ".sv31-tabs{margin-left:0}",
    ".sv31-scroll{overflow-x:auto}.sv31-scroll table{min-width:430px}",
    ".sv31-page .pill{display:inline-block;font-size:10px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap}",
    ".sv31-page .pill.ok{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}",
    ".sv31-page .pill.acc{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}",
    ".sv31-page .pill.warn{background:#fdf3e4;color:#a06a1c}.sv31-page .pill.bad{background:rgba(217,92,92,.12);color:var(--danger,#d95c5c)}",
    ".sv31-page .pill.flat{background:var(--chip-bg,#f1f3f8);color:var(--muted,#788392)}",
    "html[data-theme='night'] .sv31-page .pill.warn{background:rgba(229,155,69,.14);color:#e8c07d}",
    "html[data-theme='night'] .sv31-page .pill.bad{background:rgba(217,92,92,.18);color:#f0a3a3}",
    ".sv31-catch{margin-bottom:13px}.sv31-catch .h{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:5px;flex-wrap:wrap}",
    ".sv31-catch .h .dim{color:var(--muted,#98a1ae)}.sv31-catch .track{height:9px;background:var(--chip-bg,#eef0f5);border-radius:5px;overflow:hidden}",
    ".sv31-catch .fill{height:100%;border-radius:5px;background:var(--accent,#5d72e8)}.sv31-catch .sub{font-size:10.5px;color:var(--muted,#98a1ae);margin-top:4px}",
    ".sv31-detail{margin-top:9px;font-size:12px;color:var(--muted,#667085);background:var(--chip-bg,#fbfcfe);border:1px dashed var(--line,#cfd6e4);border-radius:11px;padding:8px 12px}",
    ".sv31-qpt:hover circle[stroke]{stroke-width:4}",
    ".sv31-tag{font-size:11px;font-weight:800;color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);border-radius:999px;padding:5px 10px;white-space:nowrap}",
    ".sv31-legend-t{cursor:pointer;user-select:none;padding:2px 7px;border-radius:7px;transition:opacity .15s}",
    ".sv31-legend-t:hover{background:var(--chip-bg,#f1f3f8)}",
    ".sv31-legend-t.lg-hide-v29{text-decoration:line-through}",
    ".sv31-evib[hidden],.sv31-evbody[hidden]{display:none!important}",
    ".sv31-g2{display:grid;grid-template-columns:1fr;gap:16px}@media(min-width:900px){.sv31-g2{grid-template-columns:1fr 1fr}}",
    ".sv31-ext-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}@media(min-width:760px){.sv31-ext-grid{grid-template-columns:repeat(4,1fr)}}",
    ".sv31-ext{border:1px solid var(--line,#e8ebf0);border-radius:14px;padding:13px;background:var(--panel-solid,#fff)}",
    ".sv31-ext .t{font-size:10.5px;color:var(--muted,#788392);font-weight:700}.sv31-ext .v{font-size:15.5px;font-weight:800;margin-top:5px}.sv31-ext .s{font-size:10.5px;color:var(--muted,#98a1ae);margin-top:3px;line-height:1.5}",
    ".sv31-dot{display:inline-block;width:7px;height:7px;border-radius:50%;vertical-align:2px;margin-left:3px}",
    ".sv31-quality ul li{font-size:12.5px;color:var(--muted,#4d5868);line-height:1.9;margin-bottom:4px}",
    ".sv31-quality a{color:var(--accent,#5d72e8);font-weight:700;text-decoration:none}",
    ".sv31-method{border:1px dashed var(--line,#cfd6e4);border-radius:13px;padding:12px 15px;background:var(--chip-bg,#fbfcfe);margin-top:14px}",
    ".sv31-method summary{cursor:pointer;font-size:12.5px;font-weight:800;color:var(--accent,#5d72e8)}",
    ".sv31-method .m-body{font-size:12px;color:var(--muted,#4d5868);line-height:1.85;margin-top:9px}",
    ".sv31-method b{color:var(--text,#18212f)}",
    ".sv31-method .formula{background:var(--cell,#f1f3f9);border-radius:8px;padding:10px 13px;font-size:12px;margin:7px 0;line-height:2.1}",
    ".formula .mth{font-family:Georgia,'Times New Roman',serif;white-space:nowrap}",
    ".formula i{font-family:Georgia,'Times New Roman',serif;font-style:italic}.formula sub{font-size:.7em}",
    ".formula .frac{display:inline-block;vertical-align:middle;text-align:center;margin:0 3px}",
    ".formula .frac .num{display:block;border-bottom:1px solid currentColor;padding:0 5px}.formula .frac .den{display:block;padding:0 5px}"
  ].join("\n");
  var st=document.createElement("style");
  st.id="app-v32-style";st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 路由与导航接线 ================= */
/* 学科模块过滤:勾选后删除未选科目的全部派生数据,下游板块自动只看所选;
   部分选择时总分口径切换为「所选科目合成位比」——不再混用未选科目的9科总分 */
function applySubjectModuleV32(f){
  var sel=(typeof state!=="undefined"&&state.sv31&&state.sv31.subjMod)||null;
  if(!sel||!sel.length){f.totalLabel="总分";delete f.scopeSubject;return f;}
  var orig=f.subjects.slice();
  var keep={};sel.forEach(function(s){keep[s]=1;});
  f.subjects=f.subjects.filter(function(s){return keep[s];});
  ["series","valid","latestN","mom","stab","pb","streaks","tgt"].forEach(function(k){
    var m=f[k];if(!m)return;
    Object.keys(m).forEach(function(s){if(!keep[s])delete m[s];});
  });
  var nf={};Object.keys(f.flags).forEach(function(k){var p=k.split("|");if(keep[p[1]])nf[k]=f.flags[k];});
  f.flags=nf;
  f.events=f.events.filter(function(e){return keep[e.subj];});
  f.scopeSubject=sel.length===1?sel[0]:null;
  f.scopeMissing=false;
  f.totalLabel="总分";
  /* 组合=全部科目(如六科组合)时也要进组合分支:总分排名可直接充当组合排名 */
  if(f.subjects.length>=1&&(Object.keys(keep).length<orig.length||sel.length>1)){
    f.totalLabel=f.subjects.length===1?f.subjects[0]:"所选"+f.subjects.length+"科";
    if(!f.scopeSubject){
      /* 组合口径:排名只用「考试录入时为组合填写的排名」(exam.moduleRanks[组合id],含本地兜底)——
         没填就跳过该场、全部没填就不显示,绝不拿成员科目位比中位数去合成年排/班排 */
      var modId=(typeof state!=="undefined"&&state.sv31&&state.sv31.subjModule)||null;
      var mod=null;
      if(modId){try{mod=(state.modulesV18||[]).filter(function(m){return String(m&&m.id)===String(modId);})[0]||null;}catch(e){}}
      var comSel={},comSelN=sel.length;
      f.subjects.forEach(function(s){comSel[s]=1;});
      var syn=[];
      f.exams.forEach(function(e,i){
        var mr=moduleRanksForExamV32(e,modId);
        if(mr){
          var rk=n32(mr.yearRank),N=n32(mr.yearParticipants);
          if(rk===null||rk<1)return;                    /* 年排没填 → 该场不计入 */
          if(N===null)N=n32(e&&e.total_participants);   /* 与全站同:人数缺省回退该场总人数 */
          if(!N)return;
          var cls=null;
          var ck=n32(mr.classRank),cN=n32(mr.classParticipants);
          if(ck!==null&&ck>=1){                         /* 班排同理:只认填过的 */
            if(cN===null)cN=n32(e&&e.total_class_participants);
            if(cN)cls=ck/cN*100;
          }
          syn.push({i:i,pos:r32(rk/N*100),cls:cls!==null?r32(cls):null,N:N,score:null,
            name:(e&&e.name)||("#"+(i+1)),date:(e&&e.exam_date)||""});
          return;
        }
        /* 没在组合填年排:若该场「计入总分的科目」=组合科目(如六科组合,总分即组合) → 直接用总分排名 */
        if(examTotalMatchesCombo(e,comSel,comSelN)){
          var tp=totalPosYear32(e);if(tp===null)return;
          var tN=n32(e&&e.total_participants);if(!tN)return;
          var tCls=totalPosClass32(e);
          syn.push({i:i,pos:tp,cls:tCls,N:tN,score:null,
            name:(e&&e.name)||("#"+(i+1)),date:(e&&e.exam_date)||""});
        }
      });
      if(syn.length){
        f.totalSeries=syn;f.totalSynthetic=true;f.totalLabel=(mod&&mod.name)||f.totalLabel;
        var last=syn[syn.length-1];
        f.overallLatest=last.pos;
        var l3=syn.slice(-3).map(function(x){return x.pos;});
        f.overallMedian3=l3.length?median32(l3):null;
        var mn=null;syn.forEach(function(x){mn=(mn===null||x.pos<mn)?x.pos:mn;});
        f.prevBestTotal=mn;
      }else{
        /* 组合没有填过任何年排 → 排名类一律不显示(不再混用原口径数据) */
        f.totalSeries=[];f.totalSynthetic=true;f.scopeMissing=true;f.totalLabel=(mod&&mod.name)||f.totalLabel;
        f.overallLatest=null;f.overallMedian3=null;f.prevBestTotal=null;
      }
    }else{
      /* 单科:序列=该科自身真实位比(直接填写数据,无合成) */
      var byExam={};
      f.subjects.forEach(function(s){
        (f.valid[s]||[]).forEach(function(v){
          if(!v.N)return;
          (byExam[v.i]=byExam[v.i]||[]).push({pos:v.pos,N:v.N,cls:v.cls});
        });
      });
      var syn=[];
      Object.keys(byExam).map(Number).sort(function(a,b){return a-b;}).forEach(function(i){
        var arr=byExam[i];
        var pos=median32(arr.map(function(x){return x.pos;}));
        var N=Math.round(median32(arr.map(function(x){return x.N;})));
        var cls=null;
        var cvs=arr.map(function(x){return x.cls;}).filter(function(c){return c!==null&&c!==undefined;});
        if(cvs.length)cls=median32(cvs);
        var src=f.exams[i];
        syn.push({i:i,pos:r32(pos),cls:cls!==null?r32(cls):null,N:N,score:null,
          name:(src&&src.name)||("#"+(i+1)),date:(src&&src.exam_date)||""});
      });
      if(syn.length>=1){
        f.totalSeries=syn;f.totalSynthetic=true;
        var last=syn[syn.length-1];
        f.overallLatest=last?last.pos:f.overallLatest;
        var l3=syn.slice(-3).map(function(x){return x.pos;});
        f.overallMedian3=l3.length?median32(l3):f.overallMedian3;
        var mn=null;syn.forEach(function(x){mn=(mn===null||x.pos<mn)?x.pos:mn;});
        f.prevBestTotal=mn;
      }else{
        f.totalSeries=[];f.totalSynthetic=true;f.scopeMissing=true;
        f.overallLatest=null;f.overallMedian3=null;f.prevBestTotal=null;
      }
    }
  }
  return f;
}
/* 该场「计入总分的科目」与所选组合完全一致?(如六科组合且总分=这六科 → 总分排名即组合排名) */
function examTotalMatchesCombo(e,set,selN){
  if(!e||!set||!selN)return false;
  var n=0,inc=0;
  Object.keys(e.scores||{}).forEach(function(s){
    var r=e.scores[s]||{};
    var has=n32(r.actual)!==null||n32(r.target)!==null||n32(r.rank)!==null||n32(r.classRank)!==null;
    if(!has||r.excludeFromTotal)return;
    n++;if(set[s])inc++;
  });
  return selN>=2&&n===selN&&inc===n;
}
/* 组合排名的取数:exam.moduleRanks(云端字段)优先,其次本机兜底缓存(与 v25 首页同一套数据源,避免两处口径不一致) */
function moduleRanksForExamV32(e,modId){
  if(!e||!modId)return null;
  try{
    var mr=(e.moduleRanks&&typeof e.moduleRanks==="object"&&Object.keys(e.moduleRanks).length)?e.moduleRanks:null;
    if(mr&&(mr[String(modId)]||mr[modId]))return mr[String(modId)]||mr[modId];
  }catch(err){}
  try{
    var u=(typeof state!=="undefined"&&state.user&&state.user.username)||"anon";
    var cache=JSON.parse(localStorage.getItem("st_moduleranks_v25_"+u)||"{}");
    var row=cache[(e.exam_date||"")+"|"+(e.name||"")];
    if(row&&typeof row==="object")return row;
  }catch(err){}
  return null;
}
function routeStatsV32(){
  try{window.__stTrack&&window.__stTrack("stats_open",{});}catch(e){}
  var cfg=(typeof state!=="undefined"&&state.sv31)||(state.sv31={scope:"__all__",mode:"rank"});
  var exams=scopeFilterV32(visibleExamsV32(cfg.includeHidden),cfg.scope);
  var f=buildFeaturesV32(exams);
  window.__v32AllSubjects=f.subjects.slice(); /* 选择器需要全量学科清单(先于过滤) */
  f=applySubjectModuleV32(f);
  /* 数据形态自适应:没有任何位比时,默认落在分数模式(用户手动切换后记忆选择) */
  if(!cfg.modeChosen&&f.posCount===0&&f.rateCount>0)cfg.mode="score";
  try{document.body.classList.toggle("mode-score",cfg.mode==="score");}catch(e){}
  var c=document.getElementById("content");if(!c)return;
  var sy=window.pageYOffset||0;
  c.innerHTML=statsPageV32(f);
  try{bindStatsV32(f,c.firstElementChild);}catch(e){}
  /* 渲染后让 v29 图例取色/显隐对统计页图表生效(图二/图三换色与勾选显示) */
  try{if(window.__v29&&window.__v29.afterRender)window.__v29.afterRender();}catch(e){}
  window.scrollTo(0,sy);
}
function rerenderStatsV32(){
  if(typeof state!=="undefined"&&state.page==="stats")routeStatsV32();
}
function bindStatsV32(f,root){
  root.addEventListener("click",function(e){
    var t=e.target;
    var sc=t.closest("[data-sv31-scope]");
    if(sc){state.sv31.scope=sc.getAttribute("data-sv31-scope");rerenderStatsV32();return;}
    var evi=t.closest("[data-sv31-evi]");
    if(evi){
      var eb=evi.nextElementSibling;
      if(eb){eb.hidden=!eb.hidden;evi.style.opacity=eb.hidden?".5":"1";}
      return;
    }
    var cb=t.closest("[data-sv31-combo]");
    if(cb){
      var cv=cb.getAttribute("data-sv31-combo");
      if(cv==="__all__"){state.sv31.subjMod=null;state.sv31.subjModule=null;}
      else if(cv.indexOf("__sub:")===0){state.sv31.subjMod=[cv.slice(6)];state.sv31.subjModule=null;}
      else{
        var mod=(state.modulesV18||[]).filter(function(m){return String(m&&m.id)===cv;})[0];
        state.sv31.subjMod=(mod&&mod.subjects&&mod.subjects.length)?mod.subjects.slice():null;
        state.sv31.subjModule=mod?String(mod.id):null;
      }
      rerenderStatsV32();return;
    }
    var md=t.closest("#sv31Mode button,[data-sv31-tab]");
    if(md){
      var m=md.getAttribute("data-mode")||md.getAttribute("data-sv31-tab");
      state.sv31.mode=m;
      state.sv31.modeChosen=true;
      document.body.classList.toggle("mode-score",m==="score");
      rerenderStatsV32();return;
    }
    var ev=t.closest("[data-sv31-ev]");
    if(ev){
      var icard=ev.closest(".sv31-insight"),ibody=icard&&icard.querySelector(".sv31-evbody");
      if(ibody){ibody.hidden=!ibody.hidden;ev.textContent=ibody.hidden?"查看依据":"收起";}
      return;
    }
    var pt=t.closest(".sv31-qpt");
    if(pt){
      var d=pt.dataset,detail=document.getElementById("sv31QuadDetail");
      if(detail){
        var msg;
        if(d.flat==="1"){
          msg="近期有起有伏，整体持平（最近几场的位比变化都在噪声范围内）";
        }else{
          var v=Number(d.sp)||0,av=Math.abs(v);
          msg="最近4次平均每场"+(v>=0?"前进约 ":"后退约 ")+(av>=10?String(Math.round(av)):av.toFixed(1))+"名"+
            (d.names?"（约"+d.names+"名的位次）":"");
        }
        detail.textContent=d.n+" · 当前年级前"+d.pos+"% · "+msg;
      }
      return;
    }
    var ed=t.closest("[data-sv31-edit]");
    if(ed){
      var id=ed.getAttribute("data-sv31-edit"),date=ed.getAttribute("data-date"),name=ed.getAttribute("data-name");
      var exam=allExamsV32().find(function(x){return (id&&x.id===id)||(!id&&x.exam_date===date&&x.name===name);});
      if(exam&&typeof openExam==="function"){closeStatsFallbackV32();openExam(exam);}
      return;
    }
  });
}
function closeStatsFallbackV32(){}
function ensureNavV32(){
  var page=(typeof state!=="undefined"&&state.page)||"home";
  var dn=document.querySelector(".desktop-nav");
  if(dn&&!dn.querySelector('[data-page="stats"]')){
    var acc=dn.querySelector('[data-page="account"]');
    var b=document.createElement("button");
    b.className="nav-btn";b.setAttribute("data-page","stats");b.textContent="统计分析";
    acc?dn.insertBefore(b,acc):dn.appendChild(b);
  }
  var bn=document.querySelector(".bottom-nav");
  if(bn&&!bn.querySelector('[data-page="stats"]')){
    var accB=bn.querySelector('[data-page="account"]');
    var bb=document.createElement("button");
    bb.className="";bb.setAttribute("data-page","stats");
    bb.innerHTML='<span>▦</span><span>分析</span>';
    accB?bn.insertBefore(bb,accB):bn.appendChild(bb);
  }
  document.querySelectorAll('.desktop-nav [data-page],.bottom-nav [data-page]').forEach(function(el){
    el.classList.toggle("active",el.getAttribute("data-page")===page);
  });
}
/* 包装渲染入口:注入导航 + 拦截 stats 页 */
var rpPrevV32=(typeof window.renderPage==="function")?window.renderPage:null;
window.renderPage=function sv32RenderPage(){
  try{ensureNavV32();}catch(e){}
  if(typeof state!=="undefined"&&state.page==="stats"){routeStatsV32();return;}
  if(rpPrevV32)rpPrevV32();
};

/* ================= 启动与测试钩子 ================= */
function bootV32(){try{injectStylesV32();}catch(e){}}
if(typeof document!=="undefined"&&document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bootV32);
}else{bootV32();}
window.__v32={
  n:n32,posYearOf:posYearOf32,posClassOf:posClassOf32,
  totalPosYear:totalPosYear32,totalActual:totalActualV32,totalTarget:totalTargetV32,
  rateOf:rateOf32,subjectList:subjectListV32,configuredSubjects:configuredSubjectsV32,
  visibleExams:visibleExamsV32,scopeFilter:scopeFilterV32,catOptions:catOptionsV32,
  median:median32,mad:mad32,
  buildFeatures:buildFeaturesV32,buildInsights:buildInsightsV32,
  applySubjectModule:applySubjectModuleV32,
  lineSvg:lineSvgV32,quadSvg:quadSvgV32,donut:donutSvgV32,spark:sparkSvg32,
  speedText:speedTextV32,rerender:rerenderStatsV32,
  kpi:kpiHtmlV32,trend:trendHtmlV32,structure:structureHtmlV32,hall:hallHtmlV32,
  calib:calibHtmlV32,comp:compHtmlV32,matrix:matrixSectionHtmlV32,quality:qualityHtmlV32
};
})();

/* ===== app-v33.js ===== */
/* app-v33.js · v5.1 长期目标系统 + 市/区排名(总分层面)
   蓝本:design/goal-system.html(四场景 + 统计页联动 + 六项科学加固)
   铁律:①一种目标一个名字 ②没有数据就没有界面 ③每屏一个主动作
        ④分析页位比主轴不动 ⑤口径写明 ⑥埋点只记行为不记内容 */
(function(){
"use strict";
if(window.__v33)return;
window.__v33=1;

/* ================= 基础 ================= */
function $(s,r){return (r||document).querySelector(s)}
function $all(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}
function track(ev,meta){try{if(typeof window.__stTrack==="function")window.__stTrack(ev,meta||{})}catch(e){}}
var LS_DISMISS="st_goal_v33_dismissed";

/* ================= 目标档案 ================= */
var G={data:null,loaded:false};
function hasGoal(){
  var d=G.data;if(!d)return false;
  var n=0;for(var k in (d.subjects||{}))n++;
  return !!(n>0||d.totalGoal!=null||d.school||d.date);
}
function goalSubjects(){return G.data&&G.data.subjects?G.data.subjects:{}}
/* 顶层 const state 不会挂到 window 上,必须经词法作用域安全取用 */
function ST(){try{return state}catch(e){return null}}
function examSource(){
  var s=ST();
  var a=s&&Array.isArray(s.allExams)?s.allExams:null;
  var b=s&&Array.isArray(s.exams)?s.exams:null;
  return (a&&a.length?a:b)||[];
}
function scoreOf(sc){
  if(sc==null)return null;
  if(typeof sc==="number")return sc;
  var v=sc.actual!=null?sc.actual:(sc.final!=null?sc.final:(sc.score!=null?sc.score:null));
  return v==null?null:Number(v);
}
function maxOf(sc,dft){return sc&&sc.max!=null?Number(sc.max):(dft||0)}
function activeSubjects(){
  var seen={},out=[];
  function push(n,max){if(n&&!seen[n]){seen[n]=1;out.push({name:n,max:max||0})}}
  (Array.isArray(state.subjectConfigs)?state.subjectConfigs:[]).forEach(function(s){
    if(typeof s==="string")push(s);else push(s&&s.name,s&&(s.defaultMax||s.max));
  });
  (Array.isArray(window.SUBJECTS)?window.SUBJECTS:[]).forEach(function(n){push(typeof n==="string"?n:n&&n.name)});
  var st=ST();
  ((st&&Array.isArray(st.exams))?st.exams:[]).forEach(function(e){
    ["scores","subjects"].forEach(function(k){
      var o=e[k];if(!o||typeof o!=="object")return;
      Object.keys(o).forEach(function(n){
        var sc=o[n],m=typeof sc==="object"&&sc?(sc.max||(sc.defaultMax||0)):0;
        push(n,m);
      });
    });
  });
  return out;
}
function latestScore(name){
  var ex=examSource().slice().sort(function(a,b){
    return String(b.exam_date).localeCompare(String(a.exam_date));
  });
  for(var i=0;i<ex.length;i++){
    if(ex[i].is_hidden)continue;
    var sc=(ex[i].scores&&ex[i].scores[name])||(ex[i].subjects&&ex[i].subjects[name]);
    var v=scoreOf(sc);
    if(v!=null)return {v:v,max:maxOf(sc,0),exam:ex[i]};
  }
  return null;
}
function totalGoalValue(){
  if(!G.data)return null;
  if(G.data.totalGoal!=null)return Number(G.data.totalGoal);
  var sum=null;var gs=goalSubjects();
  for(var k in gs){sum=(sum||0)+Number(gs[k])}
  return sum;
}

/* ================= 数据读写 ================= */
function apiCall(action,payload){
  /* list/bootstrap 已顺路携带 goal:优先消费缓存,省一次边缘调用 */
  if(action==="get_goal"&&window.__v33GoalCache){
    var c=window.__v33GoalCache;window.__v33GoalCache=null;
    return Promise.resolve(c);
  }
  if(typeof dataApiV7==="function")return dataApiV7(action,payload);
  return Promise.reject(new Error("dataApiV7 缺失"));
}
/* 拦截 list/bootstrap 响应,把顺路的 goal 存入缓存 */
var dApiBeforeV33=(typeof dataApiV7==="function")?dataApiV7:null;
if(dApiBeforeV33){
  dataApiV7=function(action,payload){
    var p=dApiBeforeV33.apply(this,arguments);
    if(action==="bootstrap"||action==="list_exams"){
      try{Promise.resolve(p).then(function(r){try{if(r&&r.goal!==undefined)window.__v33GoalCache=r}catch(e){}},function(){})}catch(e){}
    }
    return p;
  };
}
function loadGoal(){
  return apiCall("get_goal",{}).then(function(r){
    var g=(r&&r.goal)||null;
    G.data=g?{
      subjects:g.subjects||{},
      totalGoal:g.totalGoal!=null?Number(g.totalGoal):null,
      school:g.school||g.dream_school||"",
      date:g.date||g.exam_date||"",
      dateName:g.dateName||g.date_name||""
    }:{subjects:{},totalGoal:null,school:"",date:"",dateName:""};
    G.loaded=true;refreshGoalUI();
    setTimeout(function(){try{refreshGoalUI()}catch(e){}},1200);
    setTimeout(function(){try{refreshGoalUI()}catch(e){}},3000);
    setTimeout(function(){try{if(!examSource().length)refreshGoalUI()}catch(e){}},6000);
  }).catch(function(){G.loaded=true;});
}
function persistGoal(){
  var d=G.data||{};
  return apiCall("save_goal",{goal:{
    subjects:d.subjects||{},totalGoal:d.totalGoal??null,
    school:d.school||"",date:d.date||"",dateName:d.dateName||""
  }});
}

/* ================= 样式 ================= */
(function css(){
  if(document.getElementById("app-v33-style"))return; /* index.html 已静态内置 */
  var st=document.createElement("style");st.id="app-v33-style";
  st.textContent=
  ".goal-hero-v33{display:flex;gap:18px;background:linear-gradient(145deg,var(--panel-solid,#fff),var(--accent-soft,#eef1ff));border:1px solid var(--line,#e8ebf0);border-radius:20px;box-shadow:var(--shadow,0 10px 35px rgba(27,37,58,.08));padding:16px 18px;margin:14px 0;cursor:pointer}"
  ".goal-hero-v33:active{transform:translateY(1px)}"
  ".gh-main-v33{flex:1;min-width:0}.gh-title-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}"
  ".gh-title{font-size:13.5px;font-weight:750}.gh-hint{font-size:11px;color:var(--muted,#788392)}"
  ".gh-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;touch-action:pan-x;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;cursor:grab}.gh-chips::-webkit-scrollbar{display:none}"
  ".gh-chip{flex:0 0 auto;border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:13px;padding:8px 11px;min-width:84px;cursor:pointer}"
  ".gh-chip small{display:block;font-size:10.5px;color:var(--muted,#788392)}.gh-chip b{font-size:15px;font-variant-numeric:tabular-nums}.gh-chip em{display:block;font-style:normal;font-size:10.5px;margin-top:1px}"
  ".gh-chip.ok em{color:var(--green,#32a77a)}.gh-chip.no em{color:var(--danger,#d9534f)}.gh-chip.na{opacity:.55}.gh-chip.na em{color:var(--muted,#788392)}"
  ".gh-total{margin-top:10px;display:flex;align-items:baseline;gap:8px;font-variant-numeric:tabular-nums}.gh-total b{font-size:23px;letter-spacing:-.5px}.gh-total span{font-size:11.5px;color:var(--muted,#788392)}"
  ".gh-side{flex:0 0 168px;display:flex;flex-direction:column;gap:10px;justify-content:center}"
  ".gh-cd{background:var(--accent,#5d72e8);color:#fff;border-radius:16px;padding:13px;text-align:center}.gh-cd small{display:block;font-size:11px;opacity:.85}.gh-cd b{display:block;font-size:29px;font-variant-numeric:tabular-nums;line-height:1.15}"
  ".gh-cd.expired{background:var(--warn,#b97f24)}"
  ".gh-school{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:14px;padding:9px 12px;font-size:12px;color:var(--muted,#788392)}.gh-school b{display:block;color:var(--text,#18212f);font-size:14px;margin-top:2px}"
  ".goal-bar-v33{border:1.5px dashed var(--line,#e8ebf0);border-radius:16px;padding:12px 14px;font-size:12.5px;color:var(--muted,#788392);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0;background:transparent;width:100%;text-align:left}"
  ".goal-bar-v33 b{color:var(--accent,#5d72e8)}"
  ".bar-x-v33{border:0;background:transparent;color:var(--muted,#788392);font-size:16px;padding:4px 7px;border-radius:8px;cursor:pointer;flex:0 0 auto}"
  ".gmodal-backdrop{position:fixed;inset:0;background:rgba(22,28,39,.42);backdrop-filter:blur(6px);display:none;place-items:center;padding:18px;z-index:120}"
  ".gmodal-backdrop.open{display:grid}"
  ".gmodal{width:min(600px,100%);max-height:min(88vh,840px);overflow:auto;background:var(--panel-solid,#fff);border-radius:22px;box-shadow:0 30px 90px rgba(15,20,35,.3);color:var(--text,#18212f)}"
  ".gm-head{position:sticky;top:0;background:var(--panel-solid,#fff);display:flex;justify-content:space-between;align-items:center;padding:17px 20px 11px;border-bottom:1px solid var(--line,#e8ebf0)}"
  ".gm-head h3{margin:0;font-size:16px}.gm-head small{display:block;font-weight:400;color:var(--muted,#788392);font-size:11.5px;margin-top:3px}"
  ".gm-x{border:0;background:var(--line,#e8ebf0);width:32px;height:32px;border-radius:10px;font-size:16px;cursor:pointer;color:inherit}"
  ".gm-body{padding:15px 20px 21px}"
  ".gm-label{font-size:12px;font-weight:750;margin:15px 0 8px}.gm-label:first-child{margin-top:0}.gm-label span{font-weight:400;color:var(--muted,#788392);font-size:11.5px;margin-left:6px}"
  ".gm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}"
  ".gm-sf{border:1px solid var(--line,#e8ebf0);border-radius:13px;padding:7px 10px;background:var(--panel-solid,#fff)}"
  ".gm-sf label{display:block;font-size:10.5px;color:var(--muted,#788392);margin-bottom:3px}"
  ".gm-sf input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:15px;font-weight:700;color:var(--text,#18212f);font-variant-numeric:tabular-nums}"
  ".gm-input{width:100%;border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px 12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;outline:0}"
  ".gm-total{display:flex;align-items:center;gap:10px;border:1px solid var(--line,#e8ebf0);border-radius:13px;padding:9px 12px;background:var(--accent-soft,#eef1ff);margin-bottom:6px}"
  ".gm-total b{font-size:19px;font-variant-numeric:tabular-nums}.gm-total .an{font-size:11px;color:var(--muted,#788392);margin-left:auto}"
  ".gm-mini{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--muted,#788392);border-radius:10px;padding:7px 11px;font-size:11.5px;cursor:pointer}"
  ".gm-mini.on{border-color:var(--accent,#5d72e8);color:var(--accent,#5d72e8);font-weight:700}"
  ".gm-foot{display:flex;justify-content:space-between;gap:10px;margin-top:18px}"
  ".gm-save{border:0;background:var(--text,#18212f);color:#fff;border-radius:12px;padding:11px 18px;font-weight:700;cursor:pointer}"
  ".gm-clear{border:1px solid var(--line,#e8ebf0);background:transparent;color:var(--danger,#d9534f);border-radius:12px;padding:11px 14px;cursor:pointer;font-size:12.5px}"
  ".gm-hint{font-size:11px;color:var(--warn,#b97f24);margin:6px 2px 0;min-height:14px}"
  /* 统计页联动 */
  ".v33-goal-line{border-top:1px dashed var(--line,#e8ebf0);margin-top:10px;padding-top:9px;font-size:12.5px;line-height:1.75}"
  ".tag-ok-v33{font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 8px;background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a);margin-left:6px;white-space:nowrap}"
  ".v33-entry{font-size:11.5px;color:var(--muted,#788392)}.v33-entry a,.v33-entry button{color:var(--accent,#5d72e8);background:none;border:0;padding:0;font-size:11.5px;cursor:pointer}"
  /* 市/区排名 */
  "#v33cityBox{max-width:100%;overflow:hidden}#v33cityBox details{border-top:1px solid var(--line,#e8ebf0)}#v33cityBox summary{list-style:none;cursor:pointer;padding:10px 2px;font-size:12.5px;color:var(--muted,#788392);display:flex;justify-content:space-between}#v33cityBox summary::-webkit-details-marker{display:none}"
  ".v33-citygrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px 0 6px}.v33-citygrid>div{min-width:0}.v33-lab{display:block;font-size:11px;color:var(--muted,#788392);margin-bottom:4px}.v33-pair{display:flex;gap:6px}.v33-pair input{flex:1;width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line,#e8ebf0);border-radius:10px;padding:8px;background:var(--panel-solid,#fff);font:inherit;color:var(--text,#18212f)}"
  "@media(max-width:520px){.v33-citygrid{grid-template-columns:1fr}}"
  "@media(max-width:760px){.goal-hero-v33{flex-direction:column;gap:14px}.gh-side{flex:none;flex-direction:row;width:100%;gap:8px}.gh-side>*{flex:1;min-width:0}.gh-cd{padding:10px 12px}.gh-cd b{font-size:24px}.gh-school{display:flex;flex-direction:column;justify-content:center}.gh-title-row{margin-bottom:8px}.gh-total{flex-wrap:wrap;row-gap:3px;margin-top:9px}.gh-total b{white-space:nowrap;font-size:20px;line-height:1.25}.gh-total span{flex:1 1 100%;line-height:1.65}}";
  document.head.appendChild(st);
})();

/* ================= 首页通栏卡 ================= */
function daysLeft(){
  if(!G.data||!G.data.date)return null;
  var d=Math.ceil((new Date(G.data.date+"T00:00:00")-new Date())/86400000);
  return isNaN(d)?null:d;
}
function chipHtml(s){
  var g=goalSubjects(),sc=latestScore(s.name);
  var goal=g[s.name];
  var v=sc?sc.v:null,diff=(goal!=null&&v!=null)?v-goal:null;
  var cls,tail;
  if(goal==null){cls="na";tail="未设目标"}
  else if(diff==null){cls="na";tail="待考试"}
  else{cls=diff>=0?"ok":"no";tail=diff>=0?"已超 "+diff:"还差 "+(-diff)}
  if(goal!=null&&v==null&&!examSource().length)tail="成绩读取中…";
  return '<span class="gh-chip '+cls+'" data-subject="'+esc(s.name)+'" onclick="event.stopPropagation();__v33.jump(\''+esc(s.name).replace(/'/g,"")+'\')" title="查看统计分析">'
    +"<small>"+esc(s.name)+" · "+(goal==null?"—":"目标 "+goal)+"</small><b>"+(v==null?"—":v)+"</b><em>"+tail+"</em></span>";
}
function renderHomeCard(mount){
  var hero=heroAnchor();if(!hero)return;
  var old=$("#goalHeroV33");if(old)old.remove();
  var bar=$("#goalBarV33");if(bar)bar.remove();
  if(!hasGoal()){
    if(localStorage.getItem(LS_DISMISS)==="1"){return;}
    var b=document.createElement("div");b.id="goalBarV33";b.className="goal-bar-v33";
    b.innerHTML='<span>为这一学年设一个<b>长期目标</b> —— 各科分数、理想学校、倒计时（选填，不影响任何现有功能）</span>'
      +'<button class="bar-x-v33" aria-label="不再显示" onclick="event.stopPropagation();__v33.dismiss()">×</button>';
    b.onclick=function(){openEditor("prompt_bar")};
    hero.insertAdjacentElement("afterend",b);
    try{if(!sessionStorage.getItem("st_goal_prompt_seen")){sessionStorage.setItem("st_goal_prompt_seen","1");track("goal_prompt_shown");}}catch(e){}
    return;
  }
  var subs=activeSubjects();
  var chips=subs.map(chipHtml).join("");
  var recent=SUB_TOTALS();
  var tg=totalGoalValue();
  var tDiff=(tg!=null&&recent.has)?recent.sum-tg:null;
  var side="";
  var dl=daysLeft();
  if(dl!=null){
    side+=dl<0
      ?'<div class="gh-cd expired"><small>'+esc(G.data.dateName||"目标")+'已到期</small><b>更新日期</b></div>'
      :'<div class="gh-cd"><small>'+esc(G.data.dateName||"目标")+"倒计时</small><b>"+dl+" 天</b></div>";
  }
  if(G.data.school)side+='<div class="gh-school">理想学校<b>'+esc(G.data.school)+"</b></div>";
  var card=document.createElement("div");card.id="goalHeroV33";card.className="goal-hero-v33";
  card.onclick=function(){openEditor("card")};
  card.innerHTML='<div class="gh-main-v33"><div class="gh-title-row"><span class="gh-title">我的目标 · '+esc(G.data.name||"本学期")
    +'</span><span class="gh-hint">点击编辑</span></div>'
    +'<div class="gh-chips">'+chips+'</div>'
    +'<div class="gh-total"><b>'+(tDiff==null||!recent.has?"—":(tDiff>=0?"超 ":"差 ")+Math.abs(tDiff)+" 分")+"</b><span>"
    +(recent.has?("最近总分 "+recent.sum+(tg!=null?" / 目标 "+tg:"")+" · 取各科最近成绩合计（缺考科目不计）"):"尚未有出分记录")+"</span></div></div>"
    +(side?'<div class="gh-side">'+side+"</div>":"");
  hero.insertAdjacentElement("afterend",card);
  try{
    /* 手机端:chips 超出即提示可左右滑(并保证横滑不会被整体点击吃掉) */
    var cw=$(".gh-chips",card);
    if(cw&&cw.scrollWidth>cw.clientWidth+6){
      var ht=$(".gh-hint",card);if(ht)ht.textContent="左右滑看各科 · 点卡片编辑";
      cw.scrollLeft=0;
    }
  }catch(e){
    /* 提示可有可无,不阻塞渲染 */
  }
}
function SUB_TOTALS(){
  var subs=activeSubjects(),sum=0,has=false;
  subs.forEach(function(s){var r=latestScore(s.name);if(r){sum+=r.v;has=true}});
  return {sum:sum,has:has};
}

/* ================= 编辑弹窗 ================= */
var EDIT={mode:"auto"};
function openEditor(via){
  track("goal_editor_open",{via:via||"unknown"});
  var bk=$("#goalBkV33");
  if(!bk){
    bk=document.createElement("div");bk.id="goalBkV33";bk.className="gmodal-backdrop";
    bk.innerHTML='<div class="gmodal" role="dialog" aria-modal="true"><div class="gm-head"><h3>编辑长期目标<small>改动即时生效；随时可以回来修改</small></h3><button class="gm-x" aria-label="关闭">×</button></div><div class="gm-body"></div></div>';
    document.body.appendChild(bk);
    bk.addEventListener("click",function(e){if(e.target===bk)closeEditor()});
    $(".gm-x",bk).onclick=closeEditor;
  }
  var d=G.data=G.data||{subjects:{},totalGoal:null,school:"",date:"",dateName:""};
  var grid=activeSubjects().map(function(s){
    var g=d.subjects[s.name];var best=bestOf(s.name);
    return '<div class="gm-sf"><label>'+esc(s.name)+(s.max?" · 满分 "+s.max:"")+" · 最佳 "+(best==null?"—":best)
      +'</label><input inputmode="decimal" data-gsubject="'+esc(s.name)+'" value="'+(g==null?"":g)+'"/></div>';
  }).join("");
  if(!grid)grid='<p class="gm-hint" style="color:var(--muted,#788392)">还没有科目数据——先去添加一次考试,或检查科目设置。</p>';
  var dateOpts=["高考","中考","期末考试","自定义…"].map(function(o){
    return '<option'+((o===d.dateName)||(o==="自定义…"&&!d.dateName)?' selected':"")+">"+o+"</option>";
  }).join("");
  $(".gm-body",bk).innerHTML=
    '<div class="gm-label">① 各科目标分数 <span>按正式（最终 / 赋分）成绩填写 · 留空表示暂不定</span></div>'
    +'<div class="gm-grid">'+grid+'</div>'
    +'<div class="gm-label">② 总分与理想学校</div>'
    +'<div class="gm-total"><span style="font-size:12px;color:var(--muted,#788392)">总分目标</span><b id="gv33Total">—</b><span class="an" id="gv33ModeTxt"></span></div>'
    +'<p class="gm-hint" id="gv33Hint"></p>'
    +'<div style="display:flex;gap:8px;margin-bottom:10px"><button class="gm-mini" id="gv33Auto">自动求和</button><button class="gm-mini" id="gv33Manu">手动指定</button>'
    +'<input class="gm-input" id="gv33Manual" style="display:none;max-width:140px" inputmode="decimal" placeholder="如 675"/></div>'
    +'<input class="gm-input" id="gv33School" style="width:100%" maxlength="40" placeholder="理想学校（选填），例如 浙江大学"/>'
    +'<div class="gm-label">③ 目标日期 <span>用于首页倒计时，可不填</span></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><select class="gm-input" id="gv33DateName" style="max-width:150px">'+dateOpts+'</select>'
    +'<input class="gm-input" id="gv33Custom" style="display:none;max-width:150px" maxlength="20" placeholder="名称，如 一模"/>'
    +'<input class="gm-input" id="gv33Date" type="date" style="max-width:190px"/></div>'
    +'<div class="gm-foot"><button class="gm-clear" id="gv33Clear">清除全部目标</button><button class="gm-save" id="gv33Save">保存</button></div>';
  $("#gv33School").value=d.school||"";
  $("#gv33Date").value=d.date||"";
  EDIT.mode=d.totalGoal!=null?"manu":"auto";
  $("#gv33Manual").value=d.totalGoal==null?"":d.totalGoal;
  syncModeUI();refreshTotalPreview();
  $("#gv33Auto").onclick=function(){EDIT.mode="auto";syncModeUI();refreshTotalPreview()};
  $("#gv33Manu").onclick=function(){EDIT.mode="manu";syncModeUI();refreshTotalPreview()};
  $("#gv33Manual").oninput=refreshTotalPreview;
  $all(".gm-grid input",bk).forEach(function(inp){inp.oninput=refreshTotalPreview});
  $("#gv33DateName").onchange=function(){$("#gv33Custom").style.display=this.value==="自定义…"?"":"none"};
  var dnFixed=["高考","中考","期末考试","自定义…"];
  if(d.dateName&&dnFixed.indexOf(d.dateName)<0){$("#gv33DateName").value="自定义…";$("#gv33Custom").style.display="";$("#gv33Custom").value=d.dateName;}
  else{$("#gv33DateName").value=d.dateName||"高考";if(d.dateName==="自定义…"){$("#gv33Custom").style.display="";}}
  $("#gv33Save").onclick=saveEditor;
  $("#gv33Clear").onclick=clearEditor;
  bk.classList.add("open");
}
function bestOf(name){
  var best=null;
  examSource().forEach(function(e){
    if(e.is_hidden)return;var sc=e.scores&&e.scores[name];
    if(sc&&sc.actual!=null){var v=Number(sc.actual);if(best==null||v>best)best=v;}
  });
  return best;
}
function collectInputs(){
  var g={};$all('#goalBkV33 [data-gsubject]').forEach(function(i){var v=i.value.trim();if(v!=="")g[i.dataset.gsubject]=v});
  return g;
}
function refreshTotalPreview(){
  var t;
  if(EDIT.mode==="auto"){
    t=0;var has=false,g=collectInputs();
    for(var k in g){t+=+g[k];has=true}
    $("#gv33Total").textContent=has?t:"—";
    $("#gv33ModeTxt").textContent="= 各科之和（可手动指定）";
    $("#gv33Hint").textContent="";
  }else{
    t=parseInt($("#gv33Manual").value,10);
    $("#gv33Total").textContent=$("#gv33Manual").value||"—";
    $("#gv33ModeTxt").textContent="手动指定";
    var sum=0,has=false,g=collectInputs();
    for(var k in g){sum+=+g[k];has=true}
    if(has&&t&&t!==sum){$("#gv33Hint").textContent="注意：手动总分 "+t+" 与各科目标之和 "+sum+" 相差 "+Math.abs(t-sum)+" 分（各科差距仍按单科目标计算）";}
    else $("#gv33Hint").textContent="";
  }
}
function syncModeUI(){
  $("#gv33Auto").className="gm-mini"+(EDIT.mode==="auto"?" on":"");
  $("#gv33Manu").className="gm-mini"+(EDIT.mode==="manu"?" on":"");
  $("#gv33Manual").style.display=EDIT.mode==="auto"?"none":"";
}
function closeEditor(){var b=$("#goalBkV33");if(b)b.classList.remove("open")}
function saveEditor(){
  var d=G.data=G.data||{};
  d.subjects=collectInputs();
  var school=$("#gv33School").value.trim();
  var date=$("#gv33Date").value||"";
  var dn=$("#gv33DateName").value;
  d.dateName=dn==="自定义…"?(($("#gv33Custom").value.trim())||"目标"):dn;
  d.school=school;d.date=date;
  if(EDIT.mode==="manu"){var m=parseInt($("#gv33Manual").value,10);d.totalGoal=isNaN(m)?null:m;}
  else{var s=0,h=false;for(var k in d.subjects){s+=+d.subjects[k];h=true}d.totalGoal=h?s:null;}
  try{__stTrack("goal_saved",{subjects_set:Object.keys(d.subjects).length,has_school:d.school?1:0,has_date:d.date?1:0,total_mode:EDIT.mode==="manu"?"manual":"auto"})}catch(e){}
  persistGoal().then(function(){refreshGoalUI()}).catch(function(){});
  closeEditor();refreshGoalUI();
}
function clearEditor(){
  track("goal_cleared");
  G.data={subjects:{},totalGoal:null,school:"",date:"",dateName:""};
  persistGoal().then(function(){refreshGoalUI()}).catch(function(){});
  closeEditor();refreshGoalUI();
}
function dismissPrompt(){
  track("goal_prompt_dismiss");
  try{localStorage.setItem(LS_DISMISS,"1")}catch(e){}
  refreshGoalUI();
}

/* ================= 刷新入口 ================= */
function currentPage(){
  try{var a=$('[data-page].active');if(a&&a.dataset.page)return a.dataset.page}catch(e){}
  return "unknown";
}
function heroAnchor(){return $("#content section.hero")||$("#app section.hero")||document.querySelector("section.hero")}
function accountGrid(){return $("#content .account-grid")||$("#app .account-grid")}
function refreshGoalUI(){
  if(currentPage()==="home"){var h=heroAnchor();if(h)renderHomeCard("#content section.hero,#app section.hero,section.hero");}
  injectAccountEntry();
  try{injectStatsLinkage()}catch(e){window.__v33LastErr=(e&&(e.message||String(e)))||"linkage-error"}
}

/* ================= 账号页入口 ================= */
function injectAccountEntry(){
  if(currentPage()!=="account")return;
  var grid=accountGrid();if(!grid)return;
  var old=$("#v33AccountCard");if(old)old.remove();
  if(hasGoal())return; /* 已设目标:账号页不需要入口 */
  var c=document.createElement("div");c.id="v33AccountCard";c.className="card";c.style.padding="16px 18px";
  c.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h3 class="card-title" style="margin:0;font-size:15px">长期目标</h3><p class="card-sub" style="margin:3px 0 0">各科分数、理想学校、倒计时；首页会显示与目标的差距</p></div><button class="secondary" style="flex:none">'+(localStorage.getItem(LS_DISMISS)==="1"||G.loaded?"设置 ›":"设置 ›")+"</button></div>";
  $("button",c).onclick=function(){openEditor("account")};
  grid.appendChild(c);
}

/* ================= 统计页联动 ================= */
function findStatCard(kw){
  var cards=$all("#content .card");
  for(var i=0;i<cards.length;i++){var h=$("h3.card-title",cards[i]);if(h&&(h.textContent||"").indexOf(kw)>-1)return cards[i]}
  return null;
}
function injectStatsLinkage(){
  if(currentPage()!=="stats")return;
  /* ⑥ 目标校准:追加长期目标进度行(稳健口径说明见方法论) */
  var cal=findStatCard("目标校准");
  if(cal&&!$("#v33CalibRow",cal)){
    var row=document.createElement("div");row.id="v33CalibRow";row.className="v33-goal-line";
    cal.appendChild(row);
    fillCalib(row);
  }else if(cal&&$("#v33CalibRow",cal)){fillCalib($("#v33CalibRow",cal));}
  /* ⑤ 个人最佳殿堂:达标徽记 + 汇总 */
  var hall=findStatCard("个人最佳殿堂");
  if(hall)$all(".tag-ok-v33",hall).forEach(function(x){x.remove()});
  var sumEl=$("#v33HallSum");if(sumEl)sumEl.remove();
  if(hall&&hasGoal()){
    var g=goalSubjects(),hit=0,tried=0;
    $all("tbody tr",hall).forEach(function(tr){
      var tds=$("td",tr)?tr.children:null;if(!tds||!tds.length)return;
      var name=(tds[0].textContent||"").trim();
      if(!(name in g))return;
      tried++;
      var m=(tds[2]?(tds[2].textContent||""):"").match(/(\d+(?:\.\d+)?)/);
      var best=m?parseFloat(m[1]):null;
      if(best!=null&&best>=g[name]){
        hit++;var pill=document.createElement("span");pill.className="tag-ok-v33";pill.textContent="最佳已达标";
        tds[tds.length-1].appendChild(pill);
      }
    });
    if(tried){
      var sm=document.createElement("p");sm.id="v33HallSum";sm.className="card-sub";sm.style.margin="8px 2px 0";
      sm.innerHTML="长期目标进度：最佳成绩已有 <b>"+hit+" / "+tried+"</b> 科达到目标。「最佳已达标」只陈述峰值触达。";
      hall.appendChild(sm);
    }
  }
  /* 未设目标时:校准模块给一行小字入口(统计页唯一曝光点) */
  if(cal&&!hasGoal()){
    var en=$("#v33CalibEntry",cal);
    if(!en){en=document.createElement("div");en.id="v33CalibEntry";en.className="v33-goal-line v33-entry";
      en.innerHTML='设定长期目标后，此处会显示进度与逐科差距 · <button type="button">去设定</button>';
      $("button",en).onclick=function(){openEditor("stats_module")};
      cal.appendChild(en);}
  }else if(cal){var e2=$("#v33CalibEntry",cal);if(e2)e2.remove();}
}
function fillCalib(row){
  if(!hasGoal()){row.innerHTML="";return;}
  var rec=SUB_TOTALS(),tg=totalGoalValue();
  if(tg==null){row.innerHTML="";return;}
  var diff=rec.has?rec.sum-tg:null;
  row.innerHTML='<div style="color:var(--muted,#788392)">长期目标进度（口径：最近一次合计）</div>'
    +"中位参考见首页 · 最近总分 <b>"+(rec.has?rec.sum:"—")+"</b> / 目标 "+tg
    +" · "+(diff==null?"等待出分":(diff>=0?'<b style="color:var(--green,#32a77a)">已超 '+diff+"</b> 分":'还差 <b style="color:var(--danger,#d9534f)">'+(-diff)+"</b> 分"))
    +'　<button type="button" style="color:var(--accent,#5d72e8);background:none;border:0;padding:0;font-size:12px;cursor:pointer" onclick="__v33.editFromStats()">回首页看逐科差距</button>';
}

/* ================= 市/区排名录入(仅新增/编辑弹窗,显式应用防覆盖) ================= */
var cityObs=null;
function watchExamModal(){
  if(cityObs||typeof MutationObserver!=="function")return;
  cityObs=new MutationObserver(function(){
    /* 遍历全部 backdrop(防残留弹窗挡道);只认「记录/编辑考试」弹窗 */
    var backs=$all(".modal-backdrop");
    for(var i=0;i<backs.length;i++){
      var b=backs[i];
      if(!$("#examName",b)||!$("#examDate",b))continue;
      /* v16+ 排名区是 .total-ranks-v16(年级/班级卡);老版本兜底 .rank-table-v7 */
      var anchor=$(".total-ranks-v16",b)||$(".rank-table-v7",b);
      if(!anchor||b.querySelector("#v33cityBox"))continue;
      var host=document.createElement("div");host.id="v33cityBox";
    host.innerHTML='<details><summary>市 / 区排名（选填，仅总分层面）<span>展开</span></summary>'
      +'<div class="v33-citygrid">'
      +'<div><label class="v33-lab">市名次 / 市人数</label><div class="v33-pair"><input id="v33CityR" inputmode="numeric" placeholder="名次"/><input id="v33CityN" inputmode="numeric" placeholder="人数"/></div></div>'
      +'<div><label class="v33-lab">区名次 / 区人数</label><div class="v33-pair"><input id="v33DistR" inputmode="numeric" placeholder="名次"/><input id="v33DistN" inputmode="numeric" placeholder="人数"/></div></div>'
      +'<label style="display:flex;gap:7px;align-items:center;font-size:11.5px;color:var(--muted,#788392)"><input type="checkbox" id="v33ApplyCity"/> 保存时应用以上市/区排名（勾选才会写入；编辑旧考试时不勾选则保持原值）</label>'
      +"</div></details>";
      anchor.insertAdjacentElement("afterend",host);
    }
  });
  cityObs.observe(document.body,{childList:true,subtree:true});
}
var apiBeforeV33=(typeof api==="function")?api:null;
if(apiBeforeV33){
  api=function(action,payload){
    if(action==="save_exam"&&payload&&payload.exam&&document.getElementById("v33cityBox")){
      var apply=document.getElementById("v33ApplyCity");
      if(apply&&apply.checked){
        payload.exam.city_rank=$("#v33CityR").value.trim();
        payload.exam.city_participants=$("#v33CityN").value.trim();
        payload.exam.district_rank=$("#v33DistR").value.trim();
        payload.exam.district_participants=$("#v33DistN").value.trim();
      }
    }
    return apiBeforeV33.apply(this,arguments);
  };
}

/* ================= 折线目标横线(得分率单科趋势,v25 几何复刻) ================= */
function fmtPct(v){return Math.round(v*10)/10+"%"}
function annotateTrendV33(html){
  if(!hasGoal()||html.indexOf('<svg viewBox="0 0 760 300"')<0||html.indexOf('stroke-dasharray="7 7"')<0)return html;
  var s33=ST();
  if(!s33||!s33.subject||s33.subject==="总览"||s33.subject==="总分")return html;
  var goal=goalSubjects()[s33.subject];
  if(goal==null)return html;
  var max=100,cfg=Array.isArray(s33.subjectConfigs)?s33.subjectConfigs:[];
  for(var i=0;i<cfg.length;i++){var c=cfg[i],n=typeof c==="string"?c:c.name;if(n===s33.subject){max=(typeof c==="string")?100:(c.defaultMax||c.max||100);break}}
  var exams=(s33.exams||[]).filter(function(e){return !e.is_hidden});
  var vals=[],any=false;
  exams.forEach(function(e){
    var sc=e.scores&&e.scores[s33.subject];if(!sc)return;
    if(sc.actual!=null){vals.push(sc.actual/max*100);any=true}
    if(sc.target!=null)vals.push(sc.target/max*100);
  });
  if(!any)return html;
  var gr=goal/max*100;vals.push(gr);
  var axis=(typeof fullTrendAxisV25==="function")?fullTrendAxisV25(vals,"scoreFinal"):{min:0,max:100,ticks:5};
  if(!axis||axis.max<=axis.min)return html;
  var T=20,B=46,ch=H0-T-B,y=T+(axis.max-gr)/(axis.max-axis.min)*ch;
  if(y<T-2||y>T+ch+2)return html;
  var L=46,R=18,cw=760-L-R,n=exams.length;
  var x1=n===1?L+cw/2:L,x2=n===1?L+cw/2:760-R;
  var tag='<line x1="'+x1+'" y1="'+y.toFixed(1)+'" x2="'+x2+'" y2="'+y.toFixed(1)+'" stroke="#16a085" stroke-width="2" stroke-dasharray="3 4"/>'
    +'<text x="'+(760-R)+'" y="'+(y-6).toFixed(1)+'" text-anchor="end" style="font-size:11px;fill:#16a085">长期目标 '+fmtPct(gr)+"</text>";
  return html.replace("</svg>",tag+"</svg>");
}
var H0=300;
var chartHtmlBeforeV33=(typeof chartHtml==="function")?chartHtml:null;
if(chartHtmlBeforeV33){
  chartHtml=function(){try{return annotateTrendV33(chartHtmlBeforeV33.apply(this,arguments))}catch(e){return chartHtmlBeforeV33.apply(this,arguments)}};
}

/* ================= 启动 ================= */
/* 考试数据晚到:loadExams 完成后立即重绘目标卡,消除「待考试/读取中」竞态 */
var leBeforeV33=(typeof loadExams==="function")?window.loadExams:null;
if(leBeforeV33){
  window.loadExams=function(){
    var p=leBeforeV33.apply(this,arguments);
    try{Promise.resolve(p).then(function(){setTimeout(function(){try{refreshGoalUI()}catch(e){}},60)},function(){})}catch(e){}
    return p;
  };
}
var bindPageBeforeV33=(typeof bindPage==="function")?bindPage:null;
if(bindPageBeforeV33){
  bindPage=function(){
    var r=bindPageBeforeV33.apply(this,arguments);
    setTimeout(function(){try{refreshGoalUI()}catch(e){}},0);
    setTimeout(function(){try{injectStatsLinkage()}catch(e){}},260);
    return r;
  };
}
watchExamModal();
loadGoal();

window.__v33={
  jump:function(subject){track("goal_chip_jump",{subject:subject});var b=$('[data-page="stats"]');if(b)b.click();},
  editFromStats:function(){
    try{var hb=$('[data-page="home"]');if(hb)hb.click();}catch(e){}
    setTimeout(function(){openEditor("stats_module")},120);
  },
  dismiss:dismissPrompt,
  open:function(){openEditor("demo")},
  refresh:refreshGoalUI,
  state:function(){return {loaded:G.loaded,data:G.data,dismissed:localStorage.getItem(LS_DISMISS)}},
  debug:function(){
    var sd=ST();
    var ex=(sd&&Array.isArray(sd.exams))?sd.exams:[];
    return {exams:ex.length,sampleKeys:ex[0]?Object.keys(ex[0]):[],subs:activeSubjects().map(function(s){return s.name}),
      rec:SUB_TOTALS(),latest:ex[0]?latestScore(activeSubjects()[0]?activeSubjects()[0].name:"")||"null":null};
  },
  reload:loadGoal
};
})();

/* ===== app-v34.js ===== */
/* app-v34.js · 深度分析(Beta) —— 自动生成,勿手改
   来源: research/analytics-page/prod/deep-beta-main.js + research/paper-analytics-lab/src/{core.js,measurement.js,trend-test.js,dynamics.js,bocpd.js,ewma.js,difficulty.js,alerts.js,goals.js,pipeline.js}
   重build: node design/build-deep-beta.js && node design/build-bundles.js */
(function () {
"use strict";
if (window.__v34kernel) return;
window.__v34kernel = 1;
var global = window; /* research 内核以 global.PAL 挂载,浏览器下指向 window */
var PAL2NS = (window.PAL = window.PAL || {});

/* ---- PAL2 kernel: core.js ---- */
/* ============================================================
 * core.js — 基础数值工具（零依赖，浏览器/Node 双端）
 * 论文级实现：逆正态变换、稳健统计、精确分位数
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 确定性随机（仿真可复现） ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var next = mulberry32(seed == null ? 0x9E3779B9 : seed);
    var cached = null;
    return {
      uniform: function () { return next(); },
      norm: function () {
        if (cached !== null) { var v = cached; cached = null; return v; }
        var u1 = next(), u2 = next();
        if (u1 < 1e-300) u1 = 1e-300;
        var r = Math.sqrt(-2 * Math.log(u1)), th = 2 * Math.PI * u2;
        cached = r * Math.sin(th);
        return r * Math.cos(th);
      },
      binomial: function (n, p) {
        if (p <= 0) return 0;
        if (p >= 1) return n;
        // 小 n 直接枚举；大 n 用正态近似 + 取整修正
        if (n <= 64) {
          var c = 0;
          for (var i = 0; i < n; i++) if (next() < p) c++;
          return c;
        }
        var mu = n * p, sd = Math.sqrt(n * p * (1 - p));
        var x = Math.max(0, Math.min(n, Math.round(mu + sd * this.norm())));
        return x;
      },
      int: function (nInclusive) {
        return Math.floor(next() * (nInclusive + 1));
      }
    };
  }

  /* ---------- 正态分布 ---------- */
  function erf(x) {
    // Abramowitz & Stegun 7.1.26，最大绝对误差 1.5e-7
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCdfHigh(z) {
    // Φ(z) = z≥0 ? 1 − ½·Q(½, z²/2) : ½·Q(½, z²/2)，相对精度 ~1e-14
    var q = gammq(0.5, z * z / 2);
    return z >= 0 ? 1 - 0.5 * q : 0.5 * q;
  }
  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }

  /* Acklam 逆正态 + 牛顿精修（相对误差 < 1e-12） */
  function invNorm(p) {
    if (!(p > 0 && p < 1)) throw new Error('invNorm: p 必须在 (0,1)，收到 ' + p);
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01,
             2.445134137142996e+00, 3.754408661907416e+00];
    var pLow = 0.02425, q, r, x;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - pLow) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
          (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    // 两步牛顿精修：x ← x − (Φ(x) − p)/φ(x)
    for (var k = 0; k < 2; k++) {
      var e = normCdfHigh(x) - p;
      var u = e * Math.sqrt(2 * Math.PI) * Math.exp(0.5 * x * x);
      x = x - u;
    }
    return x;
  }

  /* Student-t CDF（通过不完全贝塔函数），df 为正整数或一般正数 */
  function logGamma(z) {
    // Lanczos g=7, n=9
    var g = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = g[0];
    for (var i = 1; i < g.length; i++) x += g[i] / (z + i);
    var t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  /* 不完全伽马：P(a,x) 级数 与 Q(a,x) 连分式（Numerical Recipes §6.2，~机器精度） */
  function gser(a, x) {
    var ITMAX = 300, EPS = 3e-14;
    if (x <= 0) return 0;
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 1; n <= ITMAX; n++) {
      ap++; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPS) break;
    }
    var gln = logGamma(a);
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  function gcf(a, x) {
    var ITMAX = 300, EPS = 3e-14, FPMIN = 1e-300;
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (var i = 1; i <= ITMAX; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    var gln = logGamma(a);
    return Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  function gammp(a, x) { return x < a + 1 ? gser(a, x) : 1 - gcf(a, x); }
  function gammq(a, x) { return x < a + 1 ? 1 - gser(a, x) : gcf(a, x); }
  function betacf(a, b, x) {
    var MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d; var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function betainc(a, b, x) { // 正则化不完全贝塔 I_x(a,b)
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function tCdf(t, df) {
    var x = df / (df + t * t);
    var p = 0.5 * betainc(df / 2, 0.5, x);
    return t > 0 ? 1 - p : p;
  }
  /* 标准化 Student-t 的双侧 p 值 */
  function tSf2(t, df) { return betainc(df / 2, 0.5, df / (df + t * t)); }

  /* ---------- 描述统计 ---------- */
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function median(a) { return quantile(a, 0.5); }
  function quantile(a, q) {
    // Type-7（R 默认）线性插值
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; });
    var pos = (b.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return b[lo];
    return b[lo] + (pos - lo) * (b[hi] - b[lo]);
  }
  function variance(a, sample) {
    var n = a.length; if (n < 2) return sample ? NaN : 0;
    var m = mean(a), s = 0;
    for (var i = 0; i < n; i++) s += (a[i] - m) * (a[i] - m);
    return s / (sample ? n - 1 : n);
  }
  function sd(a, sample) { return Math.sqrt(variance(a, sample)); }
  function mad(a) {
    var m = median(a);
    var dev = a.map(function (x) { return Math.abs(x - m); });
    return median(dev); // 未乘 1.4826，由调用方决定尺度系数
  }
  function madSigma(a) { return 1.4826 * mad(a); } // MAD→σ 一致估计

  function logSumExp(arr) {
    var mx = -Infinity;
    for (var i = 0; i < arr.length; i++) if (arr[i] > mx) mx = arr[i];
    var s = 0;
    for (i = 0; i < arr.length; i++) s += Math.exp(arr[i] - mx);
    return mx + Math.log(s);
  }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  /* ---------- 保序回归（PAVA，权重版）：单调递增拟合 ---------- */
  function isotonic(xy) {
    // xy: [{x,y,w}]；返回同长数组 fitted（按 x 排序后单调不减）
    var pts = xy.slice().sort(function (a, b) { return a.x - b.x; });
    var vals = [], wts = [], idx = [];
    for (var i = 0; i < pts.length; i++) {
      vals.push(pts[i].y); wts.push(pts[i].w == null ? 1 : pts[i].w); idx.push(i);
      while (vals.length > 1 && vals[vals.length - 2] > vals[vals.length - 1]) {
        // 合并两个相邻块：值、权、索引三者必须同步弹出各一个，
        // 否则 idx 与 vals 失步，重建时尾部出现空洞(undefined)
        var v2 = vals.pop(), w2 = wts.pop(), i2 = idx.pop();
        var v1 = vals.pop(), w1 = wts.pop(), i1 = idx.pop();
        vals.push((v1 * w1 + v2 * w2) / (w1 + w2));
        wts.push(w1 + w2); idx.push(i2); // 块的“最后原始下标”用于重建计数
      }
    }
    var out = new Array(pts.length);
    var pos = 0;
    for (var b = 0; b < vals.length; b++) {
      var cnt = b === 0 ? idx[b] + 1 : idx[b] - idx[b - 1];
      while (cnt-- > 0) out[pos++] = vals[b];
    }
    // out 与排序后的 pts 对齐；再映射回原顺序
    var result = new Array(pts.length);
    for (var j = 0; j < pts.length; j++) result[j] = out[j]; // 已按 x 排序的拟合值
    return { sortedX: pts.map(function (p) { return p.x; }), sortedFit: result };
  }
  function interpAt(xs, ys, x0) {
    if (x0 <= xs[0]) return ys[0];
    if (x0 >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (var i = 1; i < xs.length; i++) {
      if (x0 <= xs[i]) {
        var t = (x0 - xs[i - 1]) / (xs[i] - xs[i - 1]);
        return ys[i - 1] + t * (ys[i] - ys[i - 1]);
      }
    }
    return ys[ys.length - 1];
  }

  global.PAL = global.PAL || {};
  PAL.core = {
    makeRng: makeRng, mulberry32: mulberry32,
    normCdf: normCdfHigh, normPdf: normPdf, invNorm: invNorm, erf: erf,
    tCdf: tCdf, tSf2: tSf2, logGamma: logGamma, gammp: gammp, gammq: gammq, betainc: betainc,
    mean: mean, median: median, quantile: quantile, sd: sd, variance: variance,
    mad: mad, madSigma: madSigma, logSumExp: logSumExp, sigmoid: sigmoid, clamp: clamp,
    isotonic: isotonic, interpAt: interpAt
  };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: measurement.js ---- */
/* ============================================================
 * measurement.js — 测量层：位比 → 潜在标准分（含不确定度传播）
 *
 * 核心思想：
 *   名次 r/N 是序数信息，但若假设同考群体能力分布近似正态，
 *   则位比可经 Blom 逆正态变换嵌入到公共潜变量 z 轴上，
 *   使不同考试、不同科目的成绩获得可比性。
 *   且由二项抽样方差经 delta 法传播，得到每个观测的
 *   解析标准误 —— 排名越靠两端 / 参考人数越少，噪声越大。
 *
 * 参考：Blom (1958); rank-based inverse normal transformation
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /**
   * 位比 → 潜分 z + 标准误（约定：z 越大越好，年级第一 → z 最大）
   * @param rank 名次（1 为第一）
   * @param N    参考人数
   * @returns {z, se, p}  p 为位比(0,1)，越小名次越靠前
   */
  function positionToZ(rank, N) {
    if (!(N >= 2) || !(rank >= 1 && rank <= N)) return null;
    var p = (rank - 0.375) / (N + 0.25);          // Blom 平移
    var q = 1 - p;                                 // 领先比例
    var z = C.invNorm(q);                          // 越大越好
    var dp = Math.sqrt(p * (1 - p) / N);           // 位比二项抽样 se
    var dz = dp / Math.max(C.normPdf(z), 1e-12);   // delta 法过 Φ⁻¹（对称）
    return { z: z, se: dz, p: p };
  }

  /**
   * 双通道一致性检验：年级位 vs 班级位
   * 若两通道显著背离 → 提示「群体构成变化」（如走班重排），
   * 该场观测在动态建模中应降权。
   * @returns null 或 {gapZ, flag}
   */
  function channelConsistency(yearPos, classPos) {
    if (!yearPos || !classPos) return null;
    var gapZ = yearPos.z - classPos.z;
    var se = Math.sqrt(yearPos.se * yearPos.se + classPos.se * classPos.se);
    if (!(se > 0)) return null;
    return { gapZ: gapZ, se: se, flag: Math.abs(gapZ) > 2.5 * se };
  }

  /* 把应用数据行规范化为统一观测格式 */
  function observe(row, opts) {
    opts = opts || {};
    var o = {};
    var y = positionToZ(row.rank, row.participants);
    if (y) { o.zYear = y; }
    var c = row.classRank ? positionToZ(row.classRank, row.classParticipants || Math.round((row.classParticipantsRatio || 45))) : null;
    if (c && c.z === c.z) o.zClass = c;
    if (o.zYear && o.zClass) {
      o.consistency = channelConsistency(o.zYear, o.zClass);
    }
    // 主通道：优先年级；仅班级时以班级为代理（标注口径）
    o.main = o.zYear || o.zClass || null;
    o.mainScope = o.zYear ? 'year' : (o.zClass ? 'class' : null);
    if (opts.rate !== undefined && opts.rate !== null && opts.max > 0) {
      o.rate = opts.rate; o.max = opts.max;
    }
    return o;
  }

  global.PAL = global.PAL || {};
  PAL.measurement = {
    positionToZ: positionToZ,
    channelConsistency: channelConsistency,
    observe: observe
  };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: trend-test.js ---- */
/* ============================================================
 * trend-test.js — 非参数趋势检验：Mann–Kendall + Sen 斜率
 *
 * 用途：对位比/潜分轨迹做「是否真实存在单调趋势」的假设检验，
 *       并给出稳健斜率（每场平均变化）及其置信区间。
 * 小样本（n≤9）：精确置换 p 值；n≥10：含结点修正的正态近似。
 * 参考：Mann (1945); Kendall (1975); Sen (1968); Gilbert (1987)
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  function sStat(x) {
    var n = x.length, s = 0;
    for (var i = 0; i < n - 1; i++)
      for (var j = i + 1; j < n; j++)
        s += Math.sign(x[j] - x[i]);
    return s;
  }

  function tieCorrection(x) {
    var counts = {}, vals = [];
    for (var i = 0; i < x.length; i++) {
      if (counts[x[i]] === undefined) { counts[x[i]] = 0; vals.push(x[i]); }
      counts[x[i]]++;
    }
    var term = 0, hasTies = false;
    for (i = 0; i < vals.length; i++) {
      var t = counts[vals[i]];
      if (t > 1) { hasTies = true; term += t * (t - 1) * (2 * t + 5); }
    }
    return { hasTies: hasTies, term: term };
  }

  /* 精确零分布：枚举全排列 |S| ≥ |S_obs| 的比例 */
  function exactP(x, nMax) {
    var n = x.length;
    if (n > nMax) return null;
    var idx = [], i;
    for (i = 0; i < n; i++) idx.push(i);
    var count = 0, total = 0, sObs = Math.abs(sStat(x));
    function permute(k) {
      if (k === n) {
        total++;
        // 对当前排列求 S
        var arr = [];
        for (var m = 0; m < n; m++) arr.push(x[idx[m]]);
        if (Math.abs(sStat(arr)) >= sObs) count++;
        return;
      }
      for (var kk = k; kk < n; kk++) {
        var tmp = idx[k]; idx[k] = idx[kk]; idx[kk] = tmp;
        permute(k + 1);
        tmp = idx[k]; idx[k] = idx[kk]; idx[kk] = tmp;
      }
    }
    permute(0);
    return count / total; // 含观测本身，保守
  }

  /**
   * Mann–Kendall 检验
   * @param x 数值序列（按时间序）
   * @param alpha 显著性水平
   */
  function mannKendall(x, alpha) {
    alpha = alpha || 0.05;
    var n = x.length;
    if (n < 4) return { valid: false, reason: 'n<4' };
    var S = sStat(x);
    var tc = tieCorrection(x);
    var varS = (n * (n - 1) * (2 * n + 5) - tc.term) / 18;
    var z, p;
    var exact = n <= 9 ? exactP(x, 9) : null;
    if (exact !== null && !tc.hasTies) {
      p = exact;
      z = null; // 精确检验无需 z
    } else {
      if (S > 0) z = (S - 1) / Math.sqrt(varS);
      else if (S < 0) z = (S + 1) / Math.sqrt(varS);
      else z = 0;
      p = 2 * (1 - C.normCdf(Math.abs(z)));
    }
    var sen = senSlope(x);
    return {
      valid: true, n: n, S: S, varS: varS,
      z: z, p: p, exact: exact !== null,
      significant: p < alpha,
      direction: S > 0 ? 'up' : (S < 0 ? 'down' : 'flat'),
      senSlope: sen.slope, senLo: sen.lo, senHi: sen.hi
    };
  }

  /* Sen 斜率 + Gilbert (1987) 置信区间 */
  function senSlope(x, alpha) {
    alpha = alpha || 0.05;
    var n = x.length, slopes = [];
    for (var i = 0; i < n - 1; i++)
      for (var j = i + 1; j < n; j++)
        if (j - i > 0) slopes.push((x[j] - x[i]) / (j - i));
    if (!slopes.length) return { slope: 0, lo: 0, hi: 0 };
    slopes.sort(function (a, b) { return a - b; });
    var N = slopes.length;
    var slope = N % 2 ? slopes[(N - 1) / 2] : (slopes[N / 2 - 1] + slopes[N / 2]) / 2;
    // 置信区间
    var S = sStat(x), tc = tieCorrection(x);
    var varS = (n * (n - 1) * (2 * n + 5) - tc.term) / 18;
    var Cα = 1.959963984540054 * Math.sqrt(varS); // z_{0.975}
    var M1 = (N - Cα) / 2, M2 = (N + Cα) / 2;
    function rankPick(M) {
      if (M <= 0) return slopes[0];
      if (M >= N - 1) return slopes[N - 1];
      var lo = Math.floor(M), hi = Math.ceil(M);
      return lo === hi ? slopes[lo] : slopes[lo] + (M - lo) * (slopes[hi] - slopes[lo]);
    }
    var lo = rankPick(M1), hi = rankPick(M2 + 1);
    return { slope: slope, lo: lo, hi: hi };
  }

  /* 基线对照：OLS 斜率 t 检验（论文对比用） */
  function olsTrend(x, alpha) {
    alpha = alpha || 0.05;
    var n = x.length;
    if (n < 4) return { valid: false, reason: 'n<4' };
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sx += i; sy += x[i]; sxx += i * i; sxy += i * x[i];
    }
    var b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    var a = (sy - b * sx) / n;
    var rss = 0;
    for (i = 0; i < n; i++) { var e = x[i] - (a + b * i); rss += e * e; }
    var seB = Math.sqrt(rss / (n - 2) / (sxx - sx * sx / n));
    var t = b / seB;
    var df = n - 2;
    var p = C.tSf2(Math.abs(t), df);
    return { valid: true, slope: b, se: seB, t: t, df: df, p: p, significant: p < alpha };
  }

  global.PAL = global.PAL || {};
  PAL.trendTest = {
    mannKendall: mannKendall, senSlope: senSlope, olsTrend: olsTrend, sStat: sStat
  };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: dynamics.js ---- */
/* ============================================================
 * dynamics.js — 动态层：稳健局部线性趋势模型（贝叶斯动态线性模型）
 *
 *   状态:  θ_t = [μ_t, β_t]'   （潜分水平 / 趋势斜率）
 *   演化:  μ_t = μ_{t-1} + β_{t-1} + w_μ     （折扣因子 δ_μ）
 *          β_t = β_{t-1} + w_β               （折扣因子 δ_β）
 *   观测:  z_t ~ StudentT(ν, μ_t, σ_t²)      σ_t 为测量层解析标准误
 *
 * Student-t 噪声 → 对「失常场」（生病/失误）自动降权的鲁棒滤波。
 * 实现：IRLS 迭代加权 Kalman 滤波（West, 1981; West & Harrison, 1997）。
 * 输出：μ̂_t ± 95%CI、趋势后验、下一场后验预测分布（目标达成概率的基础）。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  function kalmanPass(obs, params, weights) {
    // obs: [{z, se}]; weights: 数组或 null
    // params.interventions[t]=true 时在演化步执行 DLM 干预
    // （协方差膨胀 + 趋势归零）：与 BOCPD 触发的体制切换对齐
    var dm = params.discountMu, db = params.discountBeta, nu = params.df;
    var inflate = params.interventionInflate || 40;
    var m = [obs[0].z], b = [0];
    var Cmat = [[params.sigma0Sq || 0.25, 0], [0, params.betaVar0 || 0.02]];
    var means = [obs[0].z], lows = [], highs = [], bmeans = [0];
    var oneStepPreds = [];
    var Chist = []; // 每步更新后的状态协方差 [c00,c01,c11]，供前向预测尺度用
    for (var t = 1; t < obs.length; t++) {
      /* 演化 */
      var intervened = params.interventions && params.interventions[t];
      var aMu = m[t - 1] + b[t - 1], aBeta = b[t - 1];
      var R00 = Cmat[0][0] / dm + Cmat[0][1] / db + Cmat[1][0] / db + Cmat[1][1] / db;
      var R01 = Cmat[0][1] / db + Cmat[1][1] / db;
      var R11 = Cmat[1][1] / db;
      R00 += 1e-6;
      if (intervened) {
        R00 = Math.max(R00 * inflate, inflate * (params.minSeSq || 0.0025));
        R01 = 0;
        R11 = Math.max(R11 * inflate, params.betaVar0 || 0.02);
        aMu = m[t - 1]; aBeta = 0; // 允许水平自由跳变，趋势重置
      }
      /* 预测分布（一步向前） */
      var f = aMu;
      var qBase = Math.max(obs[t].se * obs[t].se, params.minSeSq || 0.0025);
      oneStepPreds.push({ f: f, q: R00 + qBase });
      /* 更新：观测方差按 Student-t 权重缩放 */
      var w = weights ? weights[t] : 1;
      var Qt = (R00 + qBase) / w;
      var A00 = R00 / Qt;
      var e = obs[t].z - f;
      var newM = aMu + A00 * e;
      var newB = aBeta + (R01 / Qt) * e;
      var c00 = R00 - A00 * R00;
      var c01 = R01 - A00 * R01;
      var c11 = R11 - (R01 * R01) / Qt;
      m.push(newM); b.push(newB);
      Cmat = [[c00, c01], [c01, c11]];
      Chist.push([c00, c01, c11]);
      var sdMu = Math.min(Math.sqrt(Math.max(c00 + qBase / Math.max(w, 0.05), 1e-12)), 3);
      means.push(newM); bmeans.push(newB);
      lows.push(newM - 1.959964 * sdMu); highs.push(newM + 1.959964 * sdMu);
    }
    return { mu: means, beta: bmeans, lo: [means[0]].concat(lows), hi: [means[0]].concat(highs), preds: oneStepPreds, C: Cmat, Chist: Chist };
  }

  /**
   * 稳健滤波主入口
   * @param zs [{z, se}] 时间序
   * @param opts {discountMu=0.96, discountBeta=0.90, df=6, iters=3,
   *              interventions=[bool]（BOCPD 触发的 DLM 干预标记）}
   */
  function robustFilter(zs, opts) {
    if (!zs || zs.length < 2) {
      return zs && zs.length === 1
        ? { valid: true, singlePoint: true, mu: [zs[0].z], lo: [zs[0].z - 1.96 * zs[0].se], hi: [zs[0].z + 1.96 * zs[0].se], beta: [0] }
        : { valid: false };
    }
    var p = {
      discountMu: opts && opts.discountMu || 0.96,
      discountBeta: opts && opts.discountBeta || 0.90,
      df: opts && opts.df || 6,
      iters: opts && opts.iters || 3,
      interventions: opts && opts.interventions || null,
      interventionInflate: opts && opts.interventionInflate || 40,
      /* 趋势阻尼：预测中心 = μ̂ + damping·β。
         由调用方按趋势证据门控传入（pipeline 用一阶滤波水平的
         Mann–Kendall 显著性自适应选择）；未传时 1 = 不阻尼 */
      damping: opts && opts.damping != null ? opts.damping : 1,
      sigma0Sq: 0.25, betaVar0: 0.02, minSeSq: 0.0025
    };
    /* --- 方差学习（经验贝叶斯式调谐）---
       测量层解析 se 只覆盖位比抽样噪声；日间发挥波动会表现为
       一步预测残差。用其稳健方差超出模型方差的部分估计 σ²_day。
       第二次学习时剔除被 Student-t 强降权的点（失常/突变残差
       不应计为日常噪声），部分回灌到观测噪声下限，
       全额（六折）计入后验预测。 */
    function learnDayVar(f, wts) {
      var es = [], qs = [];
      for (var t = 1; t < zs.length; t++) {
        if (wts && wts[t] !== undefined && wts[t] < 0.55) continue;
        var pr = f.preds[t - 1];
        if (!pr || !isFinite(pr.q)) continue;
        es.push(zs[t].z - pr.f);
        qs.push(pr.q);
      }
      if (es.length < 4) return 0;
      var md = C.madSigma(es);
      if (!isFinite(md)) return 0;
      return Math.max(md * md - C.mean(qs), 0);
    }

    var fit0 = kalmanPass(zs, p, null);
    var dayVar = learnDayVar(fit0);
    p.minSeSq = p.minSeSq + 0.4 * Math.min(dayVar, 1);

    var weights = null, fit = null, pass;
    for (pass = 0; pass < p.iters; pass++) {
      fit = kalmanPass(zs, p, weights);
      // 由标准化残差更新 Student-t 权重（夹紧防下溢）
      weights = [];
      for (var t = 0; t < zs.length; t++) {
        if (t === 0 || !fit.preds[t - 1]) { weights.push(1); continue; }
        var pr = fit.preds[t - 1];
        var r2 = (zs[t].z - pr.f); r2 = r2 * r2 / Math.max(pr.q, 1e-9);
        var wgt = (p.df + 1) / (p.df + r2);
        weights.push(Math.min(1, Math.max(wgt, 0.05)));
      }
    }
    dayVar = learnDayVar(fit, weights); // 用最终拟合与稳健权重重估
    // 下一场后验预测（Student-t，df=p.df）
    // 向前多演化一步：q_{n+1} = [G·C·Gᵀ]_{00} + 观测噪声 + 日间波动
    // （日间波动打六折计入：minSeSq 膨胀已吸收约四成，避免重复计数）
    var nT = zs.length;
    var nextMu = fit.mu[nT - 1] + p.damping * fit.beta[nT - 1];
    var Cf = fit.C;
    var lastSe = zs[nT - 1].se;
    var qNext = (Cf[0][0] + 2 * Cf[0][1] + Cf[1][1]) / p.discountMu +
      Math.max(lastSe * lastSe, p.minSeSq) +
      Math.min(Math.max(dayVar * 0.6, 0), 1.0);
    if (!isFinite(qNext) || qNext <= 0) qNext = 0.09;
    qNext = Math.min(qNext, 4);
    var predSd = Math.sqrt(qNext);
    /* 每步的「前向预测尺度」：从 ≤t−1 预测第 t 场时会用的尺度。
       与最终预测同公式，供共形校准使用（参照系一致） */
    var predScales = [null];
    for (var tt = 1; tt < nT; tt++) {
      var cH = fit.Chist[tt - 1];
      var qF = (cH[0] + 2 * cH[1] + cH[2]) / p.discountMu +
        Math.max(zs[tt].se * zs[tt].se, p.minSeSq) +
        Math.min(Math.max(dayVar * 0.6, 0), 1.0);
      if (!isFinite(qF) || qF <= 0) qF = 0.09;
      predScales.push(Math.sqrt(Math.min(qF, 4)));
    }
    return {
      valid: true, singlePoint: false,
      mu: fit.mu, lo: fit.lo, hi: fit.hi, beta: fit.beta,
      weights: weights,
      preds: fit.preds,
      dayVarSd: Math.sqrt(Math.max(dayVar, 0)),
      predictive: { location: nextMu, scale: predSd, df: p.df },
      predScales: predScales,
      params: p
    };
  }

  /* P(下一场潜分 ≥ x) —— 用于目标达成概率 */
  function probReach(pred, x) {
    // z_next ~ t_df(loc, scale)；P(z ≥ x) = 1 − F_t((x−loc)/scale)
    var tval = (x - pred.location) / pred.scale;
    return 1 - C.tCdf(tval, pred.df);
  }

  /* 后验预测分位数（数值求逆） */
  function predQuantile(pred, prob) {
    var lo = pred.location - 12 * pred.scale, hi = pred.location + 12 * pred.scale;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if ((1 - C.tCdf((mid - pred.location) / pred.scale, pred.df)) > prob) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  global.PAL = global.PAL || {};
  PAL.dynamics = { robustFilter: robustFilter, probReach: probReach, predQuantile: predQuantile };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: bocpd.js ---- */
/* ============================================================
 * bocpd.js — 贝叶斯在线变点检测（BOCPD）
 *
 *   Adams & MacKay (2007): Bayesian online changepoint detection.
 *   观测模型：NIG 共轭的 Gaussian（均值/方差均未知）
 *   输出：每场考试处于「新体制」的后验概率 r_t（run length 分布），
 *         以及 MAP run length —— 突变（如状态骤降/骤升）的形式化检测。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /* NIG 充分统计量的 Student-t 预测对数密度 */
  function studentTLogPdfNIG(x, s) {
    // s: {mu0, kappa, alpha, beta}
    var df = 2 * s.alpha;
    var scale2 = (s.beta * (s.kappa + 1)) / (s.alpha * s.kappa);
    var lg = C.logGamma((df + 1) / 2) - C.logGamma(df / 2) -
      0.5 * Math.log(df * Math.PI * scale2) - ((df + 1) / 2) * Math.log(1 + (x - s.mu0) * (x - s.mu0) / (df * scale2));
    return lg;
  }
  function nigUpdate(s, x) {
    return {
      mu0: (s.kappa * s.mu0 + x) / (s.kappa + 1),
      kappa: s.kappa + 1,
      alpha: s.alpha + 0.5,
      beta: s.beta + 0.5 * (s.kappa / (s.kappa + 1)) * (x - s.mu0) * (x - s.mu0)
    };
  }

  /**
   * @param x 数值序列
   * @param opts {hazard=1/20, mu0=null, kappa=1, alpha=2, beta=var prior}
   * @returns {r: 每点 MAP run length, pChange: 变点后验概率序列}
   */
  function bocpd(x, opts) {
    opts = opts || {};
    var h = opts.hazard || 1 / 30;
    var n = x.length;
    if (!n) return { valid: false };
    // 先验：以首个观测为中心的弱信息 NIG（避免全样本均值造成的信息泄漏与钝化）
    // κ0=1 抑制短序列上的过分割（控制平稳段误报）
    var varAll = Math.max(C.variance(x, true) || 0.25, 0.01);
    var base = {
      mu0: opts.mu0 !== undefined ? opts.mu0 : x[0],
      kappa: opts.kappa !== undefined ? opts.kappa : 1,
      alpha: opts.alpha || 2,
      beta: opts.beta !== undefined ? opts.beta : Math.max(0.5 * varAll * (opts.kappa || 1), 1e-4)
    };
    var MAXR = 250, PRUNE = 1e-8;
    // R[t][k] = P(run length = k | data up to t)
    var stats = [base];
    var Rprev = new Array(1); Rprev[0] = 1;
    var mapRL = [], pChange = [], recentChange = [];
    for (var t = 0; t < n; t++) {
      var maxLen = Math.min(Rprev.length, MAXR);
      var logPred = new Array(maxLen);
      for (var k = 0; k < maxLen; k++) logPred[k] = studentTLogPdfNIG(x[t], stats[k]);
      var logJoint = new Array(maxLen + 1);
      var growthAccum = [];
      for (k = 0; k < maxLen; k++) {
        growthAccum.push(logPred[k] + Math.log(Math.max(1 - h, 1e-12)) + Math.log(Rprev[k]));
      }
      // 新体制概率
      var logChangepointTerms = [];
      for (k = 0; k < maxLen; k++) logChangepointTerms.push(logPred[k] + Math.log(Rprev[k]) + Math.log(Math.max(h, 1e-12)));
      logJoint[0] = C.logSumExp(logChangepointTerms);
      for (k = 0; k < maxLen; k++) logJoint[k + 1] = growthAccum[k];
      var norm = C.logSumExp(logJoint);
      var Rnew = new Array(logJoint.length);
      for (k = 0; k < logJoint.length; k++) Rnew[k] = Math.exp(logJoint[k] - norm);
      // 近期体制变化概率：P(run length ≤ K | data)，变点后数场内保持高值
      var recent = 0;
      var KCAP = 4;
      for (k = 0; k < Math.min(Rnew.length, KCAP + 1); k++) recent += Rnew[k];
      // 剪枝
      var keep = [], cum = 0;
      for (k = 0; k < Rnew.length; k++) { if (Rnew[k] > PRUNE) keep.push(k); }
      var Rkeep = keep.map(function (kk) { return Rnew[kk]; });
      var sKeep = keep.map(function (kk) { return kk === 0 ? base : stats[kk - 1]; });
      // 更新充分统计量：每个 run length 候选都吃进当前观测
      var statsNew = [base];
      for (k = 0; k < sKeep.length; k++) statsNew.push(nigUpdate(sKeep[k], x[t]));
      var mapK = 0;
      for (k = 1; k < Rkeep.length; k++) if (Rkeep[k] > Rkeep[mapK]) mapK = k;
      mapRL.push(keep[mapK]);
      pChange.push(Rkeep[0]);
      recentChange.push(recent);
      Rprev = Rkeep;
      stats = statsNew;
    }
    return { valid: true, mapRunLength: mapRL, changeProb: pChange, recentChangeProb: recentChange };
  }

  global.PAL = global.PAL || {};
  PAL.bocpd = { run: bocpd };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: ewma.js ---- */
/* ============================================================
 * ewma.js — EWMA 指数加权移动平均控制图（SPC 早期预警）
 *
 *   Roberts (1959); Hunter (1986, J. Quality Technology)。
 *   对「连续小退步」这类渐进劣化，EWMA 比 Shewhart 单点规则
 *   灵敏得多；控制限由 ARL（平均运行长度）理论给出，
 *   误报预算 ARL0 显式可控 —— 论文中用蒙特卡洛实测 ARL0。
 * ============================================================ */
(function (global) {
  'use strict';

  /**
   * @param x 标准化残差序列（均值 0 方差 1 尺度）
   * @param opts {lambda=0.3, L=2.815}  L·λ 组合决定 ARL0
   * @returns {z: EWMA统计量路径, violations: 违限索引}
   */
  function ewma(x, opts) {
    var lambda = (opts && opts.lambda) || 0.3;
    var L = (opts && opts.L) || 2.815;
    if (!x || !x.length) return { valid: false };
    var z = [0];
    for (var t = 0; t < x.length; t++) {
      z.push(lambda * x[t] + (1 - lambda) * z[t]);
    }
    var violations = [];
    for (t = 1; t < z.length; t++) {
      // 控制限随 i 收紧：Lσ√(λ(1−(1−λ)^{2i})/(2−λ))
      var lim = L * Math.sqrt(lambda * (1 - Math.pow(1 - lambda, 2 * t)) / (2 - lambda));
      if (Math.abs(z[t]) > lim) violations.push(t - 1);
    }
    return { valid: true, z: z.slice(1), lambda: lambda, L: L, violations: violations };
  }

  /* 蒙特卡洛实测 ARL0：在标准正态白噪声下估计误报前平均场数 */
  function simulateArl0(opts, reps, rngSeedBase) {
    reps = reps || 400;
    var C = global.PAL.core;
    var rng = C.makeRng(rngSeedBase || 20260101);
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
  PAL.ewma = { ewmaChart: ewma, simulateArl0: simulateArl0 };
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
  var S = { cur: "__total__", goalPct: 20, distBin: 5, view: "band" };
  var REP = null; /* 当前报告缓存,供交互处理器使用 */

  /* ---------- 历史滚动预测回显 ---------- */
  function walkForward(obs) {
    var out = [];
    for (var k = 4; k < obs.length; k++) {
      try {
        var r = P2.pipeline.analyzeSeries(obs.slice(0, k));
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
    /* 最可能点(中位)与目标的虚线标注 */
    var md = rep.nextExam ? rep.nextExam.medianPercentile : null;
    var out = "";
    if (md != null && md > 0.3 && md < 99.7) {
      var mx = xOf(md);
      out += '<line x1="' + mx.toFixed(1) + '" y1="4" x2="' + mx.toFixed(1) +
        '" y2="' + (20 + ihG) + '" stroke="#4a90d9" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>' +
        '<text x="' + (mx + 4).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">最可能 前' +
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
      var NB = 20, zBin = zRange / NB;
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
          '<text x="' + Math.min(mdX + 4, W - 90).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">最可能 前' +
          pct1(md) + '%</text>';
      }
      var gxZ = clampX(xOfP(S.goalPct));
      marksZ += '<line x1="' + gxZ.toFixed(1) + '" y1="4" x2="' + gxZ.toFixed(1) +
        '" y2="' + (20 + ih) + '" stroke="#d4574e" stroke-width="1.4" stroke-dasharray="4 3"/>' +
        '<text x="' + (gxZ + 4).toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' +
        S.goalPct + '%</text>';
      svg = barsZ + labelsZ + marksZ;
      caption = '横轴=「发挥距离」标尺：同样 2 个名次点，越靠前对应的发挥距离越大（名次刻度按真实位置标注）。' +
        '每根柱宽度 = <b>相等的一段发挥距离</b>，柱高 = 该发挥段的命中概率 —— 柱与柱完全可比，' +
        '<span style="color:#4a90d9">最高柱=最可能点</span>。蓝色柱=达成目标前' + S.goalPct + '% 的区域';
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
          '曲线过半点 = 最可能 前' + pct1(md) + '%</text>';
      }
      var labelsCum = "";
      [0, 10, 20, 25, 50, 75, 90, 100].forEach(function (tk) {
        labelsCum += '<text x="' + (padL + iw * tk / 100).toFixed(1) + '" y="' + (H - 4) +
          '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">前' + tk + '%</text>';
      });
      svg = cumSvg + labelsCum + marksCum;
      caption = '曲线 = 「落到前X%以内」的累计命中概率：在横轴找目标名次、沿竖线到曲线、再横着读概率（如考进前' + S.goalPct +
        '% ≈ <b>' + Math.round(cumGoal * 100) + '%</b>）。曲线爬过 50% 横线的点 = 最可能点（' + (md != null ? '前' + pct1(md) + '%' : '—') + '）。';
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
      caption = '柱子 = 该名次段的命中概率（柱高=柱顶数字）；<b style="color:#4a90d9">蓝色曲线</b> = 概率密度，峰即<b>最可能点</b>（蓝色虚线处）。' +
        '命中前' + S.goalPct + '% 的概率 ≈ <b>' + Math.round(pGoal * 100) + '%</b>';
    }
    var binChips = view === "band"
      ? [2, 3, 5, 10].map(function (bn) {
        return '<button type="button" class="' + chipCls(bin === bn) +
          '" data-dsb-bin="' + bn + '">每格' + bn + '%</button>';
      }).join('')
      : "";
    return '<div class="combo-chips-v25" style="margin-bottom:8px">' + dViewChips() +
      (view === "band"
        ? '<span class="label">细度：</span>' + binChips
        : '<span class="label" style="opacity:.55">视图间可切换</span>') +
      '</div>' +
      '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:760px;display:block;color:inherit">' +
      svg + "</svg>" +
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
      '▸ ' + title + '</summary>' +
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
    return details('趋势检验（通过才算数的那个）',
      '<div style="font-size:14px;font-weight:600">' + verdict + '</div>' +
      '<div style="font-size:12px;opacity:.75;margin-top:4px">Mann–Kendall 检验 p = ' +
      (mk.valid ? mk.p.toFixed(3) : '—') + '（α=0.05）' + senTxt +
      '<br>口径说明：「动量」是描述性规则；这里只陈述通过统计检验的结论。</div>');
  }

  function signalsDetails(rep) {
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    var ev = rep.ewma || {};
    var evTxt = (ev.violations && ev.violations.length)
      ? '⚠ 第 ' + ev.violations.map(function (v) { return v + 2; }).join('、') + ' 场出现异动信号'
      : '无异动信号';
    var nInterv = rep.interventions.filter(Boolean).length;
    return details('体制信号（变点 + 渐进预警）',
      '<div style="font-size:13px;line-height:1.7">' +
      '近期体制变化概率：<b>' + cpLast.toFixed(2) + '</b>' +
      (cpLast > 0.5 ? '（偏高——最近的成绩结构可能已切换）' : '') +
      '；历史触发重估 ' + nInterv + ' 次<br>' +
      'EWMA 渐进劣化监测：' + evTxt + '</div>');
  }

  function difficultyDetails(rep) {
    var darr = rep.difficulty;
    if (!Array.isArray(darr) || !darr.length) return '';
    var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
    var ne2 = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
    return details('试卷难度推断',
      '<div style="font-size:13px">逐卷检验：判为难卷 <b>' + nh + '</b> 场、易卷 <b>' + ne2 +
      '</b> 场。难卷场次的位比波动已在模型中自动降权。</div>');
  }

  /* ---------- 计算过程:「计算收据」三层 ---------- */
  /* 第二层主体:用用户真实数据把整笔账算一遍 */
  function receiptInner(rep, obs) {
    var ne = rep.nextExam;
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
      var flag = w < 0.7 ? ' <span style="color:#d4574e;font-size:10px">⚠失常降权</span>' : "";
      rows += '<tr>' +
        '<td style="padding:3px 8px;opacity:.8">#' + (i + 1) + '</td>' +
        '<td style="padding:3px 8px">前' + pct0(o.rank / o.N * 100) + '%（' + o.rank + '/' + o.N + '）</td>' +
        '<td style="padding:3px 8px">' + (z != null ? z.toFixed(2) : "—") + '</td>' +
        '<td style="padding:3px 8px">' + w.toFixed(2) + flag + '</td></tr>';
    }
    var dampNote = (Math.abs(beta) > 1e-9 && Math.abs(effShift - beta) > 1e-9)
      ? '原始势头 ' + fs2(beta) + '，历史证明势头不常延续，只采纳 → ' + fs2(effShift)
      : '采纳全部趋势 ' + fs2(beta);
    var stepStyle = 'font-size:12.5px;line-height:1.9';
    return '<div style="' + stepStyle + '">' +
      '<div style="font-weight:600;margin-bottom:4px">第 1 步 · 你的每场比赛换算成标准分</div>' +
      '<table style="border-collapse:collapse;width:100%;font-size:12px">' +
      '<tr style="opacity:.55"><th style="text-align:left;padding:3px 8px">场次</th>' +
      '<th style="text-align:left;padding:3px 8px">位比</th>' +
      '<th style="text-align:left;padding:3px 8px">标准分 z</th>' +
      '<th style="text-align:left;padding:3px 8px">该场权重</th></tr>' + rows + "</table>" +
      '<div style="font-size:11px;opacity:.6;margin:2px 0 10px">权重低 = 这场被视为发挥失常/异常，几乎不影响后面的估计。</div>' +

      '<div style="font-weight:600;margin-top:10px">第 2 步 · 合成你的真实水平</div>' +
      '<div>加权稳定点 μ̂ = <b>' + lastMu.toFixed(2) + '</b></div>' +

      '<div style="font-weight:600;margin-top:10px">第 3 步 · 走到下一场</div>' +
      '<div>' + lastMu.toFixed(2) + ' <b>' + fs2(effShift) + '</b> = <b>' +
      pred.location.toFixed(2) + '</b>　<span style="font-size:11px;opacity:.65">' + dampNote + '</span></div>' +

      '<div style="font-weight:600;margin-top:10px">第 4 步 · 定波动范围</div>' +
      '<div>你平时的起伏 ±' + (pred.scaleRaw || pred.scale).toFixed(2) +
      (pred.conformalK != null ? '，按你历史误差放大 ×' + pred.conformalK.toFixed(2) +
        ' ⇒ ±<b>' + pred.scale.toFixed(2) + '</b>' : '') + '</div>' +

      '<div style="font-weight:600;margin-top:10px">第 5 步 · 换回名次，得到最终答案</div>' +
      '<div style="font-size:14px">最可能 <b>前' + pct1(ne.medianPercentile) + '%</b>；95%区间 ' +
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
      '· 测量层：位比 <i style="' + mth + '">r/N</i> 经 Blom 分数 <span style="' + mth + '">z = Φ<sup>−1</sup>((r−0.375)/(N+0.25))</span> 嵌入，解析 <span style="' + mth + '">se ≈ √(p(1−p)/N)</span><br>' +
      '· 动态层：局部线性 DLM（折扣 <span style="' + mth + '">δ<sub>μ</sub>=0.96, δ<sub>β</sub>=0.90</span>），观测噪声 Student-t(<i style="' + mth + '">ν</i>=6) IRLS 稳健加权；σ²<sub>day</sub> 由一步残差 MAD 学习、六折计入预测<br>' +
      '· 变点层：BOCPD(NIG) 体制切换概率 &gt;0.5 且 MAP 游程≥5 时，下一场协方差膨胀干预 ×40<br>' +
      '· 趋势门控：原始 z 序列 MK 检验显著 → μ̂+0.7β，否则 φ=0<br>' +
      '· 共形校准：前向尺度参照残差取 Q95，先验 K=6 收缩 W=8，除以 t<sub>0.975,6</sub> 换算标准尺度<br>' +
      '· 推断层：MK+Sen 主检验、EWMA(λ=.3, L=2.815)、BH-FDR q=0.10 统一预算<br>' +
      '· 区间：t(df=6) 后验分位数</div>');
    return details('📋 怎么算的？', inner + l3);
  }

  /* ---------- 默认可见区:预测主卡 ---------- */
  function mainCard(rep, obsN) {
    var ne = rep.nextExam;
    if (!ne) return '';
    var pred = rep.filter.predictive;
    var mu = rep.filter.mu[rep.filter.mu.length - 1];
    var pc = function (z) { return 100 * (1 - C.normCdf(z)); };
    var calib = pred.conformalK != null
      ? '×' + pred.conformalK.toFixed(2) + (pred.calibrated ? '' : '（先验主导）')
      : '未启用';
    return '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end">' +
      '<div><div style="font-size:11px;opacity:.6">下场最有可能</div>' +
      '<div style="font-size:20px;font-weight:700">前 ' + pct1(ne.medianPercentile) + '%</div>' +
      '<div style="font-size:11px;opacity:.55">由稳定水平 前' + pct1(pc(mu)) + '% 推算</div>' +
      '<div style="font-size:10px;opacity:.45;margin-top:3px">↑ 已剔除失常场次的影响</div></div>' +
      '<div><div style="font-size:11px;opacity:.6">下场预测（95%区间）</div>' +
      '<div style="font-size:20px;font-weight:700">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</div>' +
      '<div style="font-size:11px;opacity:.55">最可能 前' + pct1(ne.medianPercentile) +
      '% · 区间校准 ' + calib + '</div>' +
      '<div style="font-size:10px;opacity:.45;margin-top:3px">↑ 水平 ± 平时起伏' +
      (pred.conformalK != null ? ' × 你的历史误差' : '') + '</div></div>' +
      '<div style="flex:1;min-width:200px">' +
      '<div style="font-size:11px;opacity:.6;margin-bottom:4px">下次考进前 X%？</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<input id="dsbGoalPct" type="number" min="1" max="99" step="1" value="20" ' +
      'style="width:56px;padding:3px 8px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font-size:13px">' +
      '<button id="dsbGoalBtn" style="padding:4px 12px;font-size:12.5px;border-radius:8px;' +
      'border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer">算概率</button>' +
      '<span id="dsbGoalOut" style="font-size:15px;font-weight:700"></span></div></div>' +
      '</div>' +
      '<div class="dsb-tip"><b>怎么读这张卡：</b>你的稳定水平大约在<b>前 ' + pct1(pc(mu)) + '%</b>；下次考试大概率落在' +
      '<span style="color:#4a90d9">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</span>之间。下方竖须就是过去每次「当时预测 vs 实际结果」；' +
      '点开「📋 怎么算的？」可查看本页每个数字的计算过程。</div>';
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
    var xlbl = '<text x="' + xOf(0) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" opacity=".45">#1</text>' +
      '<text x="' + xOf(n - 1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">#' + n + '</text>' +
      '<text x="' + (fx1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="end" fill="#4a90d9" opacity=".8">下场</text>';
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
      items.push({ t: mk.s > 0 ? "整体呈显著上升趋势" : "整体呈显著下降趋势",
        ev: "Mann–Kendall p=" + mk.p.toFixed(3) });
    }
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    if (cpLast > 0.5) items.push({ t: "最近的成绩结构可能已切换（如难度/状态突变）", ev: "体制变化概率 " + cpLast.toFixed(2) });
    var ev = rep.ewma || {};
    if (ev.violations && ev.violations.length) {
      items.push({ t: "第 " + ev.violations.map(function (v) { return v + 2; }).join("、") +
        " 场出现渐进异动信号", ev: "EWMA 控制图违限" });
    }
    var darr = rep.difficulty;
    if (Array.isArray(darr) && darr.length) {
      var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
      var nea = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
      if (nh || nea) items.push({ t: "有 " + nh + " 场难卷、" + nea + " 场易卷被判出（位比波动已降权处理）", ev: "逐卷检验 P>0.4" });
    }
    if (!items.length) items.push({ t: "成绩以正常波动为主，无显著趋势或异动信号", ev: "全部检验未触发" });
    items.push({ t: "预测区间按你近 " + obsN + " 场的波动幅度校准，真实回测覆盖94.9%", ev: "滚动共形" });
    return '<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.85">' +
      items.slice(0, 4).map(function (it) {
        return "<li>" + esc(it.t) + ' <span style="font-size:10.5px;opacity:.5">[' + esc(it.ev) + "]</span></li>";
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
        '⚠ 总分参与人数(' + caliber.totalN + ') ≤ 单科最大池(' + caliber.maxSubN +
        ')——疑似<b>组合内排名</b>而非全年级。组合口径衡量你在同选科群体中的位置，与年级口径含义不同；' +
        '系统按录入原样分析，解读时注意口径。</p>';
    }

    var body;
    if (obs.length < 4) {
      body = '<div style="font-size:13px;opacity:.75;padding:6px 0 2px">' +
        (combo ? '组合「' + esc(combo.name) + '」没有填写过「组合年排」，' : '该序列') +
        '有效位比观测不足 4 场，暂无法建模。' +
        (combo ? '在考试录入弹窗为组合填写「组合年排名次/年级人数」后即可解锁。' : '') + '</div>';
    } else {
      var rep = P2.pipeline.analyzeSeries(obs);
      if (!rep.valid) {
        body = '<div style="font-size:13px;opacity:.75">数据未通过有效性检查。</div>';
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
            hitN + '/' + hist.length + '）· 竖须上蓝点=当时认为最可能的位置 · '
          : '';
        var trajCap = '灰点=每场实际位比（<span style="color:#2e9e6b">绿圈</span>=落在当时预测区间内） · 蓝线=滤波真实水平 · ' +
          '阴影带=水平估计的可信范围（<b>不是</b>预测区间，预测区间是更宽的竖须） · ' +
          '右侧色阶扇区=下场落点概率密度（越深越接近最可能点，即蓝色虚线处） · ' + histNote;
        body = '<div class="dsb-block-title">下一场预测（主结论）</div>' +
          mainCard(rep, obs.length) +
          '<div class="dsb-block-title">本 期 洞 察</div>' +
          insightsList(rep, obs.length) +
          '<div class="dsb-fig" style="margin-top:14px"><div class="dsb-fig-title">排名轨迹与预测区间</div>' +
          trajectorySvg(rep, obs, hist) +
          '<div class="dsb-fig-cap">' + trajCap + '</div></div>' +
          '<div class="dsb-fig" style="margin-top:12px"><div class="dsb-fig-title">下一场落点分布</div>' +
          '<div id="dsbDistWrap">' + distBlock(rep) + '</div></div>' +
          '<div class="dsb-block-title">算法细节（点开查看各自推导）</div>' +
          '<div class="dsb-grid2">' +
          trendDetails(rep) + signalsDetails(rep) + difficultyDetails(rep) +
          calcDetails(rep, obs) + '</div>';
      }
    }

    return '<div id="dsbRoot" class="card" style="padding:16px 18px;margin-top:14px">' +
      '<div class="dsb-head">' +
      '<span style="font-size:15px;font-weight:700">⑨ 深度分析</span>' +
      '<sup style="font-size:9.5px;opacity:.55">Beta</sup>' +
      '<span class="dsb-note">研究版统计算法 · 所有数字都可展开看推导 · ⓘ 数据实时在本机计算</span></div>' +
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
    try { return P2.pipeline.analyzeSeries(obs); } catch (e) { return null; }
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
      if (!rep || !rep.filter.predictive) { out.textContent = "—"; return; }
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
      '#dsbRoot .dsb-block-title{font-size:12.5px;font-weight:700;margin:14px 0 8px;letter-spacing:1px;opacity:.85}' +
      '#dsbRoot .dsb-grid2{display:grid;gap:12px}' +
      '@media(min-width:900px){#dsbRoot .dsb-grid2{grid-template-columns:1fr 1fr}}' +
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
  function mountIfMissing() {
    if (!pageIsStats()) return;
    var c = document.getElementById("content");
    if (!c) return;
    if ($("#dsbRoot", c)) return;           /* 已挂载 */
    if (!c.firstElementChild) return;        /* 统计页还没渲染好 */
    /* 插在「数据质量与方法论」(⑩)之前 → 深度分析=⑨ 紧随全量矩阵(⑧)。
       注意: quality 卡位于 .sv31-page 内部,不能要求它是 #content 的直接子级,
       否则整块会被追加到页面末尾,出现「⑩ 排到 ⑨ 前面」 */
    var q = c.querySelector(".sv31-quality");
    if (q) q.insertAdjacentHTML("beforebegin", sectionHtml());
    else c.insertAdjacentHTML("beforeend", sectionHtml());
  }
  function refresh() {
    var root = $("#dsbRoot");
    if (!root) { mountIfMissing(); return; }
    root.outerHTML = sectionHtml();
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
    analyze: function (obs) { return P2.pipeline.analyzeSeries(obs); },
    sectionHtml: sectionHtml,
    refresh: refresh,
    mountIfMissing: mountIfMissing,
    setSubject: function (s) { S.cur = s; },
    shadowKey: LS_SHADE
  };
})();


window.PAL2 = PAL2NS; /* 主源码经 window.PAL2 取内核 */
})();

