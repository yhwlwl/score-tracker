/* Private exam notes: local draft, cloud CAS, explicit conflict resolution. */
(function () {
  'use strict';
  var current = null;
  function sameOwner(c) { return !c.disposed && c.options.owns(); }
  function valid(data) { return data && typeof data.reflection === 'string' && Number.isSafeInteger(data.reflection_revision) && data.reflection_revision >= 0; }
  function dirty(c) { return c.text !== c.base || !!(c.saving && c.text !== c.sent); }
  function draft(c) {
    try {
      if (dirty(c)) localStorage.setItem(c.key, JSON.stringify({ text: c.text, base: c.base, revision: c.revision, at: Date.now() }));
      else {
        // Do not remove a newer draft another tab has written meanwhile.
        var saved = JSON.parse(localStorage.getItem(c.key) || 'null');
        if (!saved || saved.text === c.text) localStorage.removeItem(c.key);
      }
      c.local = true;
    } catch (_) { c.local = false; }
  }
  function status(c) {
    if (c.loading) return '正在读取已保存的反思…';
    if (c.conflict) return '另一处有新内容，请先选择要保留的版本。';
    if (c.error) return c.error + (dirty(c) ? c.local ? ' · 草稿已留在本机' : ' · 请暂勿关闭页面' : '');
    if (c.saving) return '正在保存…';
    if (dirty(c)) return c.local ? '草稿已保留，稍后自动同步' : '等待同步，请暂勿关闭页面';
    return c.updated ? '已保存 · ' + new Date(c.updated).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '自动保存 · 可随时继续补充';
  }
  function paint(c) {
    if (!c.host || !c.host.isConnected || !sameOwner(c)) return;
    var field = c.host.querySelector('textarea');
    if (!field) return;
    field.disabled = c.loading || (!c.ready && !c.restored);
    if (field.value !== c.text) field.value = c.text;
    var live = c.host.querySelector('[data-reflection-status]');
    live.textContent = status(c); live.classList.toggle('ed-reflection-error', !!c.error || !!c.conflict || (!c.local && dirty(c)));
    c.host.querySelector('[data-reflection-count]').textContent = c.text.length + ' / 10000';
    var retry = c.host.querySelector('[data-reflection-save]');
    retry.hidden = c.loading || c.saving || !!c.conflict || (!dirty(c) && !c.error); retry.textContent = c.ready ? '立即保存' : '重新读取';
    var conflict = c.host.querySelector('[data-reflection-conflict]');
    conflict.hidden = !c.conflict;
    if (c.conflict) conflict.querySelector('p').textContent = c.conflict.reflection || '（云端内容为空）';
  }
  function updateExam(c, data) {
    (state.allExams || state.exams || []).forEach(function (exam) { if (exam.id === c.options.examId) Object.assign(exam, data); });
    (state.exams || []).forEach(function (exam) { if (exam.id === c.options.examId) Object.assign(exam, data); });
  }
  async function request(c, action, payload) {
    if (!sameOwner(c)) throw new Error('账号已切换');
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 15000);
    c.abort = controller;
    try {
      var response = await fetch('/api/score-tracker-data-api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, keepalive: true,
        body: JSON.stringify(Object.assign({ action: action, token: c.options.token, examId: c.options.examId }, payload || {})) });
      var data = await response.json();
      if (!response.ok) { var error = new Error(response.status === 401 ? '登录已失效，请重新登录后继续同步' : data.error || '暂时无法同步，请重试'); error.status = response.status; error.current = data.current; throw error; }
      if (!valid(data)) throw new Error('返回内容不完整，请重试');
      return data;
    } finally { clearTimeout(timer); if (c.abort === controller) c.abort = null; }
  }
  function schedule(c) {
    clearTimeout(c.timer);
    if (dirty(c) && !c.composing && !c.conflict) c.timer = setTimeout(function () { save(c); }, 1000);
  }
  async function save(c) {
    clearTimeout(c.timer);
    if (!sameOwner(c) || !c.ready || c.saving || c.loading || c.composing || c.conflict || !dirty(c)) return;
    var sent = c.text; c.sent = sent; c.saving = true; c.error = ''; draft(c); paint(c);
    try {
      var data = await request(c, 'save_exam_reflection', { text: sent, revision: c.revision });
      if (!sameOwner(c)) return;
      c.base = data.reflection; c.revision = data.reflection_revision; c.updated = data.reflection_updated_at;
      updateExam(c, data); draft(c);
      try { if (window.__scoreTrackerTrack) window.__scoreTrackerTrack('exam_reflection_saved', { source: 'exam_detail' }); } catch (_) {}
    } catch (e) {
      if (!sameOwner(c)) return;
      if (e.status === 409 && valid(e.current)) c.conflict = e.current;
      else c.error = e.name === 'AbortError' ? '同步超时，请重试' : e.message || '暂时无法同步，请重试';
      draft(c);
    } finally {
      c.saving = false; paint(c);
      if (sameOwner(c) && !c.error && !c.conflict) schedule(c);
    }
  }
  async function load(c) {
    if (c.loading || !sameOwner(c)) return;
    c.loading = true; c.error = ''; paint(c);
    try {
      var data = await request(c, 'get_exam_reflection');
      if (!sameOwner(c)) return;
      c.ready = true; c.updated = data.reflection_updated_at;
      updateExam(c, data);
      if (c.restored && c.text !== data.reflection && c.base !== data.reflection && c.revision !== data.reflection_revision) c.conflict = data;
      else { if (!c.restored || c.text === data.reflection) c.text = data.reflection; c.base = data.reflection; c.revision = data.reflection_revision; }
      c.restored = false; draft(c);
    } catch (e) { if (sameOwner(c)) c.error = e.name === 'AbortError' ? '读取超时，请重试' : e.message || '读取失败，请重试'; }
    finally { c.loading = false; paint(c); if (sameOwner(c) && !c.error) schedule(c); }
  }
  function mount(host, options) {
    var key = 'st_exam_reflection_v1_' + options.userId + '_' + options.examId, c = current;
    if (!c || c.key !== key || c.options.token !== options.token || !sameOwner(c)) {
      if (c) { clearTimeout(c.timer); c.disposed = true; if (c.abort) c.abort.abort(); }
      c = { key: key, options: options, text: '', base: '', revision: 0, updated: null, local: true, ready: false };
      try { var saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && typeof saved.text === 'string' && typeof saved.base === 'string' && Number.isSafeInteger(saved.revision)) { c.text = saved.text; c.base = saved.base; c.revision = saved.revision; c.restored = true; } } catch (_) { c.local = false; }
      current = c;
    }
    c.host = host;
    host.innerHTML = '<div class="ed-section-head"><div><span class="ed-eyebrow">04 / 复盘</span><h2 id="ed-reflection-title">考后反思</h2><p id="ed-reflection-hint">记下这次做得好的地方、卡住的原因，或下次想尝试的方法。</p></div><span class="ed-reflection-private">个人记录</span></div>' +
      '<textarea aria-labelledby="ed-reflection-title" aria-describedby="ed-reflection-hint" maxlength="10000" rows="5" placeholder="比如：数学最后两题没来得及做，下次想先把有把握的题做完。\n英语这次先看问题再读文章，感觉更顺了。" disabled></textarea>' +
      '<div class="ed-reflection-footer"><span data-reflection-status role="status" aria-live="polite"></span><span data-reflection-count></span><button type="button" class="ed-button" data-reflection-save hidden>立即保存</button></div>' +
      '<div class="ed-reflection-conflict" data-reflection-conflict hidden><strong>另一处保存的内容</strong><p></p><div><button type="button" class="ed-button" data-reflection-cloud>使用云端内容</button><button type="button" class="ed-button" data-reflection-mine>保留我的修改</button></div><small>上方输入框保留着你的修改，也可以先合并两段内容。</small></div>';
    var field = host.querySelector('textarea');
    field.addEventListener('input', function () { c.text = field.value; c.error = ''; draft(c); paint(c); schedule(c); });
    field.addEventListener('compositionstart', function () { c.composing = true; clearTimeout(c.timer); });
    field.addEventListener('compositionend', function () { c.composing = false; c.text = field.value; draft(c); schedule(c); });
    field.addEventListener('blur', function () { save(c); });
    host.querySelector('[data-reflection-save]').onclick = function () { if (c.ready) save(c); else load(c); };
    host.querySelector('[data-reflection-cloud]').onclick = function () {
      if (!c.conflict || !window.confirm('使用云端内容会替换上方尚未同步的修改，确定吗？')) return;
      c.text = c.conflict.reflection; c.base = c.text; c.revision = c.conflict.reflection_revision; c.updated = c.conflict.reflection_updated_at; updateExam(c, c.conflict); c.conflict = null; c.error = ''; draft(c); paint(c);
    };
    host.querySelector('[data-reflection-mine]').onclick = function () {
      if (!c.conflict) return;
      c.base = c.conflict.reflection; c.revision = c.conflict.reflection_revision; c.updated = c.conflict.reflection_updated_at; c.conflict = null; c.error = ''; draft(c); paint(c); save(c);
    };
    paint(c); if (!c.ready) load(c);
  }
  function leave() {
    var c = current; if (!c || !sameOwner(c)) return true;
    draft(c); save(c);
    if (dirty(c) && !c.local && !window.confirm('反思还未同步，且本机无法保留草稿。离开可能丢失修改，仍要离开吗？')) return false;
    c.host = null; return true;
  }
  window.addEventListener('beforeunload', function (e) { if (current && sameOwner(current) && dirty(current)) { draft(current); if (!current.local) { e.preventDefault(); e.returnValue = ''; } } });
  window.addEventListener('online', function () { if (current && sameOwner(current)) { if (current.ready) save(current); else load(current); } });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && current) save(current); });
  window.ScoreExamReflection = { mount: mount, leave: leave };
})();
