/* One-time, full-screen preference guide for every signed-in account. */
(function () {
  'use strict';
  if (window.__setupPreferencesGuide) return;
  window.__setupPreferencesGuide = true;

  const ENDPOINT = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-setup';
  const GUIDE_VERSION = 1;
  const THEME_IDS = ['sunny', 'sky', 'paper', 'night'];
  const FONT_IDS = ['system', 'sans', 'serif', 'wenkai', 'fangsong'];
  const FONT_NAMES = { system: '系统默认', sans: '清晰黑体', serif: '书卷宋体', wenkai: '霞鹜文楷', fangsong: '朱雀仿宋' };
  const SIZE_NAMES = { compact: '紧凑', standard: '标准', large: '大字' };
  const THEME_NAMES = { sunny: '晴白', sky: '天蓝', paper: '暖纸', night: '墨夜' };
  let active = null, owner = '', attemptOwner = '';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function user() { return state && state.user && state.token ? { id:String(state.user.id), token:state.token } : null; }
  function identity(u) { return u ? u.id + ':' + u.token : ''; }
  function current(u) { return identity(user()) === identity(u); }
  function pendingSetup(u) {
    try { return !!u && localStorage.getItem('st_setup_pending_' + u.id) === '1'; } catch (_) { return false; }
  }
  function track(event, metadata) {
    try { if (typeof window.__scoreTrackerTrack === 'function') window.__scoreTrackerTrack(event, metadata || {}, 'setup_guide'); } catch (_) {}
  }
  async function request(action, payload, u) {
    u = u || user();
    if (!u) throw new Error('请先登录');
    const response = await fetch(ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, cache:'no-store', body:JSON.stringify(Object.assign({ action:action, token:u.token }, payload || {})) });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || '设置服务暂时没响应');
    return data;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? {} : value)); }
  function appearance() {
    let theme = 'sunny', reading = {font:'system', size:'standard'};
    try {
      if (window.__v29) { theme = window.__v29.currentTheme() || theme; reading = window.__v29.reading() || reading; }
      else { theme = localStorage.getItem('st_theme') || theme; reading = JSON.parse(localStorage.getItem('st_reading_v1') || '{}') || reading; }
    } catch (_) {}
    if (!THEME_IDS.includes(theme)) theme = 'sunny';
    if (!FONT_IDS.includes(reading.font)) reading.font = 'system';
    if (!['compact','standard','large'].includes(reading.size)) reading.size = 'standard';
    return {theme:theme, font:reading.font, size:reading.size};
  }
  function applyAppearance(next, persist) {
    if (window.__v29) {
      window.__v29.applyTheme(next.theme, true, persist);
      window.__v29.applyReading(next.font, next.size, persist);
      return;
    }
    try {
      if (persist !== false) { localStorage.setItem('st_theme', next.theme); localStorage.setItem('st_reading_v1', JSON.stringify({font:next.font,size:next.size})); }
    } catch (_) {}
  }
  function number(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return null;
    const n = Number(raw);
    return /^\d+$/.test(raw) && Number.isInteger(n) && n > 0 && n <= 10000000 ? n : null;
  }
  function rows() {
    const result = [{key:'total', name:'整场考试', kind:'总人数'}], seen = {total:true};
    (state.subjectConfigs || []).forEach(function (item) {
      const name = String(item && item.name || '').trim(), key = 's:' + name;
      if (name && !seen[key]) { seen[key] = true; result.push({key:key,name:name,kind:'科目'}); }
    });
    (state.modulesV18 || []).forEach(function (item) {
      const id = String(item && item.id || '').trim(), name = String(item && item.name || '').trim(), key = 'm:' + id;
      if (id && name && !seen[key]) { seen[key] = true; result.push({key:key,name:name,kind:'组合'}); }
    });
    return result.slice(0, 40);
  }
  function defaultValue(values, key, scope) {
    const row = values && values[key];
    return row && row[scope] != null ? String(row[scope]) : '';
  }
  function visualButtons(root, next) {
    root.querySelectorAll('[data-guide-theme]').forEach(function (button) { button.classList.toggle('on', button.dataset.guideTheme === next.theme); button.setAttribute('aria-pressed', String(button.dataset.guideTheme === next.theme)); });
    root.querySelectorAll('[data-guide-font]').forEach(function (button) { button.classList.toggle('on', button.dataset.guideFont === next.font); button.setAttribute('aria-pressed', String(button.dataset.guideFont === next.font)); });
    root.querySelectorAll('[data-guide-size]').forEach(function (button) { button.classList.toggle('on', button.dataset.guideSize === next.size); button.setAttribute('aria-pressed', String(button.dataset.guideSize === next.size)); });
  }
  function showGuide(profile) {
    const u = user();
    if (!u || active || !profile || Number(profile.preference_guide_version || 0) >= GUIDE_VERSION) return;
    if (state.onboarding && state.onboarding.kind !== 'setup-guide') return;
    const previousOnboarding = state.onboarding || null;
    state.onboarding = previousOnboarding || {kind:'setup-guide'};
    const previousFocus = document.activeElement;
    const app = document.getElementById('app'), wasInert = !!(app && app.inert), oldOverflow = document.body.style.overflow;
    const root = document.createElement('div');
    root.className = 'setup-overlay setup-guide-overlay';
    root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-labelledby','setup-guide-title');
    document.body.appendChild(root); active = root; document.body.style.overflow = 'hidden'; if (app) app.inert = true;
    let visual = appearance(), initialVisual = clone(visual), values = clone(window.ScoreParticipantDefaults?.snapshot?.() || {}), list = [], busy = false, errorMessage = '', loading = true;
    function close(restore) {
      if (!active) return;
      if (restore) applyAppearance(initialVisual, true);
      root.remove(); active = null; document.body.style.overflow = oldOverflow; if (app) app.inert = wasInert;
      state.onboarding = previousOnboarding; previousFocus && previousFocus.isConnected && previousFocus.focus();
    }
    function bodyHtml() {
      const themeButtons = THEME_IDS.map(function (id) { return '<button type="button" class="setup-guide-theme' + (visual.theme === id ? ' on' : '') + '" data-guide-theme="' + id + '" aria-pressed="' + String(visual.theme === id) + '"><i class="setup-guide-swatch setup-guide-swatch-' + id + '"></i><b>' + THEME_NAMES[id] + '</b></button>'; }).join('');
      const fontButtons = FONT_IDS.map(function (id) { return '<button type="button" class="setup-guide-font' + (visual.font === id ? ' on' : '') + '" data-guide-font="' + id + '" aria-pressed="' + String(visual.font === id) + '">' + FONT_NAMES[id] + '</button>'; }).join('');
      const sizeButtons = ['standard','large'].map(function (id) { return '<button type="button" class="setup-guide-size' + (visual.size === id ? ' on' : '') + '" data-guide-size="' + id + '" aria-pressed="' + String(visual.size === id) + '"><b>' + SIZE_NAMES[id] + '</b><small>' + (id === 'standard' ? '15 px' : '17 px') + '</small></button>'; }).join('');
      const countRows = list.map(function (item) { return '<div class="setup-guide-count-row" data-guide-key="' + esc(item.key) + '"><div><b>' + esc(item.name) + '</b><small>' + esc(item.kind) + '</small></div><input type="number" min="1" max="10000000" step="1" inputmode="numeric" data-guide-scope="year" aria-label="' + esc(item.name) + '年级人数" placeholder="留空" value="' + esc(defaultValue(values,item.key,'year')) + '"><input type="number" min="1" max="10000000" step="1" inputmode="numeric" data-guide-scope="class" aria-label="' + esc(item.name) + '班级人数" placeholder="留空" value="' + esc(defaultValue(values,item.key,'class')) + '"></div>'; }).join('');
      return '<div class="setup-guide-head"><span>首次设置 · 偏好</span><div class="setup-guide-progress"><i></i></div></div><div class="setup-guide-body"><div class="setup-guide-kicker">成绩轨迹</div><h1 id="setup-guide-title">把常用设置先放好</h1><p class="setup-guide-lead">只出现这一次。外观保存在当前设备，参考人数会自动带入新考试；之后都能在账号页修改。</p>' + (loading ? '<p class="setup-note">正在读取你的科目和组合…</p>' : '<div class="setup-guide-columns"><section class="setup-guide-card"><div class="setup-guide-card-head"><div><h2>外观</h2><p>选一个你喜欢的阅读方式</p></div><span class="setup-guide-optional">可跳过</span></div><div class="setup-guide-theme-grid">' + themeButtons + '</div><div class="setup-guide-subhead">字体</div><div class="setup-guide-font-grid">' + fontButtons + '</div><div class="setup-guide-subhead">字号</div><div class="setup-guide-size-grid">' + sizeButtons + '</div></section><section class="setup-guide-card setup-guide-counts"><div class="setup-guide-card-head"><div><h2>默认参考人数</h2><p>新考试自动带入，留空即可沿用整场人数</p></div><span class="setup-guide-optional">可跳过</span></div><div class="setup-guide-count-head"><span>项目</span><span>年级</span><span>班级</span></div>' + (countRows || '<p class="setup-note">还没有科目或组合，可在账号页补充。</p>') + '</section></div>') + '</div><p class="setup-error" role="alert">' + esc(errorMessage) + '</p><footer class="setup-footer"><button type="button" class="setup-back" id="setup-guide-skip">跳过，之后再设置</button><button type="button" class="setup-next" id="setup-guide-save">保存并开始使用</button></footer>';
    }
    function setBusy(value) { busy = value; root.querySelectorAll('button,input').forEach(function (node) { node.disabled = value; }); const save = root.querySelector('#setup-guide-save'); if (save) save.textContent = value ? '正在保存…' : '保存并开始使用'; }
    function draw(focus) {
      root.innerHTML = '<div class="setup-shell setup-guide-shell"><aside class="setup-aside"><div class="setup-brand"><span class="setup-mark">↗</span>成绩轨迹</div><p>一次设置好，<br>以后录入更快。</p><ol class="setup-steps"><li class="current" aria-current="step"><span>1</span>外观</li><li class="current" aria-current="step"><span>2</span>默认人数</li><li><span>✓</span>完成</li></ol><small>账号页仍可随时修改</small></aside><div class="setup-main">' + bodyHtml() + '</div></div>';
      root.querySelectorAll('[data-guide-theme]').forEach(function (button) { button.onclick = function () { visual.theme = button.dataset.guideTheme; applyAppearance(visual, false); visualButtons(root, visual); track('preference_theme_selected', {theme:visual.theme}); }; });
      root.querySelectorAll('[data-guide-font]').forEach(function (button) { button.onclick = function () { visual.font = button.dataset.guideFont; applyAppearance(visual, false); visualButtons(root, visual); track('preference_font_selected', {font:visual.font}); }; });
      root.querySelectorAll('[data-guide-size]').forEach(function (button) { button.onclick = function () { visual.size = button.dataset.guideSize; applyAppearance(visual, false); visualButtons(root, visual); track('preference_size_selected', {size:visual.size}); }; });
      root.querySelector('#setup-guide-skip')?.addEventListener('click', function () { finish(true); });
      root.querySelector('#setup-guide-save')?.addEventListener('click', function () { finish(false); });
      setBusy(busy);
      if (focus) root.querySelector('#setup-guide-title')?.focus({preventScroll:true});
    }
    function collect() {
      const patch = {}, invalid = [];
      root.querySelectorAll('.setup-guide-count-row').forEach(function (row) {
        const key = row.dataset.guideKey, original = values[key] || {}, next = {};
        row.querySelectorAll('[data-guide-scope]').forEach(function (input) {
          const scope = input.dataset.guideScope, raw = input.value.trim(), n = raw ? number(raw) : null;
          input.removeAttribute('aria-invalid');
          if (raw && n === null) { input.setAttribute('aria-invalid','true'); invalid.push(input); return; }
          const old = original[scope] == null ? null : Number(original[scope]);
          if (n !== old) next[scope] = n;
        });
        if (Object.keys(next).length) patch[key] = next;
      });
      return {patch:patch, invalid:invalid};
    }
    async function finish(skip) {
      if (busy || !current(u)) return;
      const result = skip ? {patch:{},invalid:[]} : collect();
      if (result.invalid.length) { errorMessage = '人数请输入正整数，或留空'; draw(false); result.invalid[0]?.focus(); return; }
      setBusy(true); track(skip ? 'preference_guide_skipped' : 'preference_guide_save_started', {row_count:Object.keys(result.patch).length});
      try {
        if (!skip && Object.keys(result.patch).length) {
          if (typeof dataApiV7 !== 'function') throw new Error('默认人数服务暂时不可用，请稍后再试');
          const data = await dataApiV7('save_participant_defaults', {defaults:result.patch});
          values = clone(data.participantDefaults || values);
        }
        if (skip) applyAppearance(initialVisual, true); else applyAppearance(visual, true);
        const data = await request('save', {preference_guide_version:GUIDE_VERSION}, u);
        if (!current(u)) return;
        state.setupProfile = data.profile; state.setupGuideVersion = GUIDE_VERSION;
        try { localStorage.removeItem('st_setup_pending_' + u.id); } catch (_) {}
        const needsSchool = !state.setupProfile?.school;
        close(false); track(skip ? 'preference_guide_skipped' : 'preference_guide_completed', {row_count:Object.keys(result.patch).length});
        render();
        if (needsSchool && typeof showOnboarding === 'function') setTimeout(function () { if (state.user && !state.onboarding && !document.querySelector('.setup-overlay')) showOnboarding(state.setupProfile, true); }, 0);
        try { if (typeof toast === 'function') toast(skip ? '已跳过，之后可在账号页设置' : '设置已保存'); } catch (_) {}
      } catch (e) { if (current(u)) { errorMessage = e.message || '没有保存成功，请再试一次'; busy = false; draw(false); } }
    }
    draw(true);
    (async function prepare() {
      try {
        if ((!state.subjectConfigs || !state.subjectConfigs.length || !state.modulesV18) && typeof loadExams === 'function') await loadExams();
        if (!current(u)) return;
        list = rows(); values = clone(window.ScoreParticipantDefaults?.snapshot?.() || {}); loading = false; draw(false);
      } catch (e) { if (current(u)) { loading = false; errorMessage = e.message || '设置暂时没加载出来'; draw(false); } }
    })();
    track('preference_guide_shown', {has_school:!!profile.school, row_count:list.length});
  }
  async function maybe() {
    const u = user(), key = identity(u);
    if (key !== owner) { owner = key; attemptOwner = ''; if (active) return; }
    if (!u) { state.setupGuideLoading = false; return; }
    if (active || pendingSetup(u) || (state.onboarding && state.onboarding.kind !== 'setup-guide') || attemptOwner === key) { state.setupGuideLoading = false; return; }
    state.setupGuideLoading = true;
    attemptOwner = key;
    try {
      let response = await request('get', {}, u), profile = response.profile;
      if (!current(u)) return;
      if (!profile) { response = await request('start', {guide_only:true}, u); profile = response.profile; }
      state.setupProfile = profile;
      if (profile && profile.completed_at && Number(profile.preference_guide_version || 0) < GUIDE_VERSION) showGuide(profile);
    } catch (_) { attemptOwner = ''; }
    finally { if (current(u)) state.setupGuideLoading = false; }
  }
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); setTimeout(maybe, 0); return result; };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { attemptOwner = ''; maybe(); } });
  if (state.user && !state.onboarding) setTimeout(maybe, 60);
})();
