(() => {
  'use strict';
  const API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
  const APP_VERSION = 'score-tracker-v5-feedback';
  const nativeFetch = window.fetch.bind(window);
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uuid = () => crypto.randomUUID();
  const visitorId = localStorage.getItem('st_visitor_id') || uuid();
  const sessionId = sessionStorage.getItem('st_session_id') || uuid();
  const guestAccessToken = localStorage.getItem('st_feedback_guest') || `${uuid()}${uuid()}`;
  const firstSeenAt = localStorage.getItem('st_first_seen_at') || new Date().toISOString();
  const firstReferrer = localStorage.getItem('st_first_referrer') ?? document.referrer;
  const url = new URL(location.href);
  const utmSource = localStorage.getItem('st_utm_source') || url.searchParams.get('utm_source') || '';
  const utmCampaign = localStorage.getItem('st_utm_campaign') || url.searchParams.get('utm_campaign') || '';
  localStorage.setItem('st_visitor_id', visitorId);
  sessionStorage.setItem('st_session_id', sessionId);
  localStorage.setItem('st_feedback_guest', guestAccessToken);
  localStorage.setItem('st_first_seen_at', firstSeenAt);
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
    const response = await nativeFetch(...args);
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
