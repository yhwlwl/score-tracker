/* First-run setup. Credentials stay in memory; only confirmed settings reach the APIs. */
(function () {
  'use strict';
  const ENDPOINT = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-setup';
  const CORE = ['语文', '数学', '英语'];
  const EXTRAS = ['物理', '历史', '化学', '生物', '政治', '地理', '技术'];
  const NAMES = ['语数外', '语数外 + 物理/历史（四科）', '语数外 + 所选科（六科）'];
  const STEPS = ['保存账号', '账号与密码', '选择选科', '成绩模块', '考试科目', '考试分类', '我的学校'];
  const TITLES = ['账号准备好了', '换成更好记的账号', '你在学哪几科？', '把相关科目放在一起', '看看你的考试科目', '考试怎么分类？', '你在哪所学校？'];
  const LEADS = ['先保存用户名和密码，以后用它们登录。', '可以只改一项，也可以先用现在的。', '语文、数学、英语已选好，再选 3 门。', '已按你的选科准备好，也可以调整。', '科目和满分都能改，以后也能再调整。', '按年级整理，或换成你习惯的方式。', '搜索学校名称，或直接填写。'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => escapeHtml(String(value ?? ''));
  let active = null, checkedUser = '', schoolData = null, schoolPromise = null, schoolIndex = [];
  const pendingKey = () => 'st_setup_pending_' + state.user.id;
  function pending(value) { try { if (value) localStorage.setItem(pendingKey(), '1'); else localStorage.removeItem(pendingKey()); } catch (_) {} }
  function isPending() { try { return localStorage.getItem(pendingKey()) === '1'; } catch (_) { return false; } }
  async function setupApi(action, payload = {}) {
    const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: state.token, ...payload }), signal: AbortSignal.timeout(20000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '暂时没有保存成功，请再试一次');
    return data.profile;
  }
  function track(event, step) { if (typeof window.__scoreTrackerTrack === 'function') window.__scoreTrackerTrack(event, { step }, 'account'); }
  function schoolText(value) { return String(value).normalize('NFKC').toLowerCase().replace(/[\s·•()_-]/g, ''); }
  function schoolSearchKey(value) {
    const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    const units = { 十: 10, 百: 100, 千: 1000 };
    return schoolText(value).replace(/[零〇一二两三四五六七八九十百千]+/g, number => {
      if (!/[十百千]/.test(number)) return [...number].map(n => digits[n]).join('');
      let total = 0, digit = 0;
      for (const n of number) { if (units[n]) { total += (digit || 1) * units[n]; digit = 0; } else digit = digits[n]; }
      return String(total + digit);
    }).replace(/第(?=\d)/g, '').replace(/附属中(?:学校|学)/g, '附中').replace(/中(?:学校|學校|学|學)/g, '中').replace(/[省市]/g, '');
  }
  function matchingSchools(query, province, city) {
    const text = schoolText(query), key = schoolSearchKey(query);
    const found = [];
    for (const entry of schoolIndex) {
      const s = entry.school;
      if ((province && s[1] !== province) || (city && s[2] !== city)) continue;
      const direct = text && entry.text.includes(text), abbreviated = key && entry.key.includes(key);
      if (text && !direct && !abbreviated) continue;
      const rank = entry.text === text ? 0 : entry.key === key ? 1 : direct ? 2 : 3;
      found.push({ school: s, rank });
    }
    if (text) found.sort((a, b) => a.rank - b.rank);
    return { total: found.length, matches: found.slice(0, 30).map(entry => entry.school) };
  }
  async function schools() {
    if (schoolData) return schoolData;
    if (!schoolPromise) schoolPromise = fetch('./data/high-schools.json?v=schools-v2', { signal: AbortSignal.timeout(12000) }).then(r => { if (!r.ok) throw new Error('学校列表暂时没加载出来，可以直接填写'); return r.json(); }).then(d => { schoolIndex = d.schools.map(school => ({ school, text: schoolText(school[0]), key: schoolSearchKey(school[0]) })); schoolData = d.schools; return schoolData; }).finally(() => { schoolPromise = null; });
    return schoolPromise;
  }
  startRegister = async function () {
    if (state.setupRegisterBusy) return;
    state.setupRegisterBusy = true;
    document.querySelector('#app').innerHTML = '<div class="splash"><div class="brand-mark">↗</div><div>正在准备你的账号</div></div>';
    try {
      const data = await api('register');
      state.token = data.token; state.user = data.user;
      localStorage.setItem('st_token', data.token); localStorage.setItem('st_known_user', '1');
      state.onboarding = { username: data.user.username, password: data.password };
      state.page = 'home'; pending(true); checkedUser = state.user.id;
      // Show credentials before any additional network request can fail.
      showOnboarding();
    } catch (error) { renderLogin(error.message); }
    finally { state.setupRegisterBusy = false; }
  };
  showOnboarding = function (profile, schoolOnly = false) {
    if (active) return;
    const credentials = state.onboarding;
    let step = schoolOnly ? 6 : credentials ? 0 : Math.max(1, Number(profile?.step || 1));
    let selected = [...(profile?.selected_subjects || [])], subjectDraft = [], moduleDraft = [], categoryDraft = null;
    let savedProfile = profile || null, loaded = false, busy = false, loadingError = '', schoolError = '';
    let username = state.user.username, password = '', confirmPassword = '', showPassword = false;
    let school = clone(profile?.school || null), schoolQuery = school?.name || '', province = school?.province || '', city = school?.city || '';
    let pickedKey = selected.join('|');
    const previousFocus = document.activeElement, root = document.createElement('div');
    root.className = 'setup-overlay'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'setup-title');
    document.body.appendChild(root); active = root;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const app = document.getElementById('app'); const wasInert = app.inert; app.inert = true;
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape' && schoolOnly && !busy) { close(); return; }
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
    function close() { root.remove(); active = null; app.inert = wasInert; document.body.style.overflow = oldOverflow; password = confirmPassword = ''; state.onboarding = null; previousFocus?.isConnected && previousFocus.focus(); }
    function error(message) { const node = root.querySelector('.setup-error'); if (node) node.textContent = message; }
    function bodyHtml() {
      if (step === 0) return '<div class="setup-icon" aria-hidden="true">✓</div>' + heading() + ['username', 'password'].map((key, i) => '<div class="setup-credential"><small>' + (i ? '密码' : '用户名') + '</small><div><code>' + esc(credentials?.[key] || '') + '</code><button class="setup-text-btn" data-copy-credential="' + key + '">复制</button></div></div>').join('') + '<p class="setup-note">请截图或复制保存。关闭后，密码不会再显示。</p>';
      if (step === 1) return heading() + '<label class="setup-field">用户名<input id="setup-username" maxlength="24" autocomplete="username" value="' + esc(username) + '"></label><label class="setup-field">新密码<div class="setup-password-wrap"><input id="setup-password" type="' + (showPassword ? 'text' : 'password') + '" maxlength="20" autocomplete="new-password" placeholder="6～20 位字母、数字或符号" value="' + esc(password) + '"><button type="button" class="setup-text-btn" id="setup-reveal" aria-label="' + (showPassword ? '隐藏密码' : '显示密码') + '">' + (showPassword ? '隐藏' : '显示') + '</button></div></label><label class="setup-field">再输一次新密码<input id="setup-confirm" type="password" autocomplete="new-password" maxlength="20" value="' + esc(confirmPassword) + '" placeholder="确认新密码"></label>';
      if (!loaded) return heading() + '<p class="setup-note">' + esc(loadingError || '正在准备你的设置…') + '</p>' + (loadingError ? '<button class="setup-text-btn" id="setup-retry">重新加载</button>' : '');
      if (step === 2) return heading() + '<div class="setup-core">' + CORE.map(n => '<span>' + n + '</span>').join('') + '</div><div class="setup-grid">' + EXTRAS.map(n => '<button class="setup-choice" data-subject="' + n + '" aria-pressed="' + selected.includes(n) + '">' + n + '</button>').join('') + '</div><p class="setup-note" id="setup-selection-count">已选 ' + selected.length + ' / 3</p>';
      if (step === 3) return heading() + moduleDraft.map((m, i) => '<section class="setup-card"><div class="setup-card-head">' + (m.isBuiltin ? '<b>' + (i === 0 ? '语数外' : i === 1 ? '四科组合' : '六科组合') + '</b>' : '<input aria-label="模块名称" data-module-name="' + i + '" maxlength="30" value="' + esc(m.name) + '"><button class="setup-remove" data-remove-module="' + i + '" aria-label="删除模块">×</button>') + '</div><div class="setup-chips">' + [...new Set([...CORE, ...EXTRAS, ...subjectDraft.map(s => s.name)])].filter(n => m.name !== NAMES[1] || CORE.includes(n) || ['物理', '历史'].includes(n)).map(n => '<button class="setup-chip" data-module="' + i + '" data-member="' + esc(n) + '" aria-pressed="' + m.subjects.includes(n) + '" ' + (m.isBuiltin && (CORE.includes(n) || m.name === NAMES[0]) ? 'disabled' : '') + '>' + esc(n) + '</button>').join('') + '</div></section>').join('') + '<button class="setup-text-btn" id="setup-add-module">＋ 添加模块</button>';
      if (step === 4) return heading() + '<div class="setup-row setup-row-label"><span>科目</span><span>默认满分</span><span></span></div>' + subjectDraft.map((s, i) => '<div class="setup-row"><input data-subject-name="' + i + '" aria-label="科目 ' + (i + 1) + '" maxlength="40" value="' + esc(s.name) + '"><input data-subject-max="' + i + '" aria-label="' + esc(s.name) + '满分" type="number" min="1" max="99999" step="0.01" inputmode="decimal" value="' + esc(s.defaultMax) + '"><button class="setup-remove" data-remove-subject="' + i + '" aria-label="删除' + esc(s.name) + '">×</button></div>').join('') + '<button class="setup-text-btn" id="setup-add-subject">＋ 添加科目</button>';
      if (step === 5) return heading() + '<label class="setup-field">分类名称<input id="setup-category-label" maxlength="16" value="' + esc(categoryDraft.label) + '"></label>' + categoryDraft.options.map((n, i) => '<div class="setup-row category"><input data-category="' + i + '" aria-label="分类 ' + (i + 1) + '" maxlength="20" value="' + esc(n) + '"><button class="setup-remove" data-remove-category="' + i + '" aria-label="删除分类">×</button></div>').join('') + '<button class="setup-text-btn" id="setup-add-category">＋ 添加分类</button>';
      return heading() + '<div class="setup-school-filters"><select id="setup-province" aria-label="省份"><option value="">全部省份</option>' + [...new Set((schoolData || []).map(s => s[1]))].map(n => '<option ' + (n === province ? 'selected' : '') + '>' + esc(n) + '</option>').join('') + '</select><select id="setup-city" aria-label="城市"><option value="">全部城市</option>' + [...new Set((schoolData || []).filter(s => !province || s[1] === province).map(s => s[2]))].map(n => '<option ' + (n === city ? 'selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div><label class="setup-field">学校名称<input id="setup-school-query" maxlength="100" autocomplete="off" placeholder="搜索或填写学校名称" value="' + esc(schoolQuery) + '"></label><div id="setup-school-results" class="setup-school-list"></div><p class="setup-inline-note">找不到？直接填写学校全名即可。<a href="https://github.com/pg7go/The-Location-Data-of-Schools-in-China" target="_blank" rel="noopener">名单来源</a></p>';
    }
    function heading() { return '<h2 id="setup-title" tabindex="-1">' + TITLES[step] + '</h2><p class="setup-lead">' + LEADS[step] + '</p>'; }
    function draw(focus = true) {
      root.innerHTML = '<div class="setup-shell"><aside class="setup-aside"><div class="setup-brand"><span class="setup-mark">↗</span>成绩轨迹</div><p>从这里开始，<br>记录你的每一次进步。</p><ol class="setup-steps">' + STEPS.map((s, i) => '<li class="' + (i === step ? 'current' : i < step ? 'done' : '') + '" ' + (i === step ? 'aria-current="step"' : '') + '><span>' + (i < step ? '✓' : i + 1) + '</span>' + s + '</li>').join('') + '</ol><small>以后也可以在账号页调整</small></aside><div class="setup-main"><div class="setup-top"><span>' + (schoolOnly ? '我的学校' : '首次设置 · ' + (step + 1) + ' / 7') + '</span><div class="setup-track"><i style="width:' + ((step + 1) / 7 * 100) + '%"></i></div></div><div class="setup-body">' + bodyHtml() + '</div><p class="setup-error" role="alert"></p><footer class="setup-footer">' + ((step > 0 && !schoolOnly) ? '<button class="setup-back" id="setup-back">← 上一步</button>' : schoolOnly ? '<button class="setup-back" id="setup-cancel">取消</button>' : '') + ([1, 2, 6].includes(step) && !schoolOnly ? '<button class="setup-text-btn" id="setup-skip">' + (step === 6 ? '跳过并完成' : '先跳过') + '</button>' : '') + '<button class="setup-next" id="setup-next">' + (step === 0 ? '已保存，继续 →' : step === 6 ? schoolOnly ? '保存学校' : '完成设置 →' : step === 1 ? '保存并继续 →' : '下一步 →') + '</button></footer></div></div>';
      if (!loaded && step < 2) {
        const note = document.createElement('p'); note.className = 'setup-note'; note.textContent = loadingError || '正在准备设置…'; root.querySelector('.setup-body').appendChild(note);
        if (loadingError) { const retry = document.createElement('button'); retry.className = 'setup-text-btn'; retry.id = 'setup-retry'; retry.textContent = '重新加载'; root.querySelector('.setup-body').appendChild(retry); }
      }
      bind();
      if (step === 6 && loaded) { showResults(); if (!schoolData) schools().then(() => { if (active === root && step === 6) draw(false); }).catch(e => { schoolError = e.message; if (active === root && step === 6) showResults(); }); }
      setBusy(busy);
      if (focus) root.querySelector('#setup-title')?.focus({ preventScroll: true });
    }
    function setBusy(value) {
      busy = value;
      root.querySelectorAll('button,input,select').forEach(el => { if (!el.hasAttribute('data-member') || !(moduleDraft[Number(el.dataset.module)]?.isBuiltin && (CORE.includes(el.dataset.member) || moduleDraft[Number(el.dataset.module)]?.name === NAMES[0]))) el.disabled = value; });
      const skip = root.querySelector('#setup-skip'); if (skip && !loaded) skip.disabled = true;
      const next = root.querySelector('#setup-next');
      if (next) { next.disabled = value || (!loaded && step > 0); if (value) next.textContent = '正在保存…'; }
    }
    function showResults() {
      const list = root.querySelector('#setup-school-results'); if (!list) return;
      const q = schoolQuery.trim();
      const { matches, total } = matchingSchools(q, province, city);
      list.innerHTML = (school ? '<div class="setup-success">已选择：' + esc(school.name) + '</div>' : '') + (!schoolData ? '<p class="setup-note">' + esc(schoolError || '正在加载学校…') + '</p>' : '') + matches.map((s, i) => '<button class="setup-school" data-school-index="' + i + '" aria-pressed="' + (school?.name === s[0] && school?.province === s[1] && school?.city === s[2] && school?.area === s[3]) + '"><strong>' + esc(s[0]) + '</strong><small>' + esc([s[1], s[2], s[3]].filter(Boolean).join(' · ')) + '</small></button>').join('') + (total > 30 ? '<p class="setup-note">还有更多结果，试试学校全名或选择省市。</p>' : '') + (q && schoolData && !matches.length ? '<p class="setup-note">可以直接保存「' + esc(q) + '」</p>' : '');
      list.querySelectorAll('[data-school-index]').forEach(b => b.onclick = () => { const s = matches[Number(b.dataset.schoolIndex)]; school = { name: s[0], province: s[1], city: s[2], area: s[3], source: 'github' }; schoolQuery = s[0]; root.querySelector('#setup-school-query').value = schoolQuery; showResults(); });
    }
    function capture() {
      if (step === 1) { username = root.querySelector('#setup-username').value.trim(); password = root.querySelector('#setup-password').value; confirmPassword = root.querySelector('#setup-confirm').value; }
      root.querySelectorAll('[data-module-name]').forEach(el => { moduleDraft[Number(el.dataset.moduleName)].name = el.value.trim(); });
      root.querySelectorAll('[data-subject-name]').forEach(el => { subjectDraft[Number(el.dataset.subjectName)].name = el.value.trim(); });
      root.querySelectorAll('[data-subject-max]').forEach(el => { subjectDraft[Number(el.dataset.subjectMax)].defaultMax = Number(el.value); });
      if (step === 5 && loaded) { categoryDraft.label = root.querySelector('#setup-category-label').value.trim(); root.querySelectorAll('[data-category]').forEach(el => { categoryDraft.options[Number(el.dataset.category)] = el.value.trim(); }); }
    }
    function bind() {
      root.querySelector('#setup-next').onclick = () => advance(false);
      root.querySelector('#setup-skip')?.addEventListener('click', () => advance(true));
      root.querySelector('#setup-back')?.addEventListener('click', () => { capture(); if (step === 1 && !credentials) return; step--; draw(); });
      if (step === 1 && !credentials) root.querySelector('#setup-back')?.remove();
      root.querySelector('#setup-cancel')?.addEventListener('click', close);
      root.querySelector('#setup-retry')?.addEventListener('click', prepare);
      root.querySelectorAll('[data-copy-credential]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(credentials[b.dataset.copyCredential]); b.textContent = '已复制'; } catch (_) { error('复制未成功，请长按账号或截图保存'); } });
      root.querySelector('#setup-reveal')?.addEventListener('click', () => { capture(); showPassword = !showPassword; draw(false); root.querySelector('#setup-password').focus(); });
      root.querySelectorAll('[data-subject]').forEach(b => b.onclick = () => { const n = b.dataset.subject; if (selected.includes(n)) selected = selected.filter(x => x !== n); else if (selected.length < 3) selected.push(n); else return error('最多选择 3 门，也可以先跳过'); b.setAttribute('aria-pressed', selected.includes(n)); root.querySelector('#setup-selection-count').textContent = '已选 ' + selected.length + ' / 3'; error(''); });
      root.querySelectorAll('[data-member]').forEach(b => b.onclick = () => { capture(); const m = moduleDraft[Number(b.dataset.module)], n = b.dataset.member; if (m.name === NAMES[1]) m.subjects = CORE.concat(n); else if (m.subjects.includes(n)) m.subjects = m.subjects.filter(s => s !== n); else { if (m.subjects.length >= (m.isBuiltin ? 6 : 12)) return error('这个模块的科目已经选满了'); m.subjects.push(n); } draw(false); });
      root.querySelector('#setup-add-module')?.addEventListener('click', () => { capture(); if (moduleDraft.length >= 12) return error('最多 12 个模块'); moduleDraft.push({ name: '', subjects: [], isBuiltin: false }); draw(false); root.querySelector('[data-module-name="' + (moduleDraft.length - 1) + '"]').focus(); });
      root.querySelectorAll('[data-remove-module]').forEach(b => b.onclick = () => { capture(); moduleDraft.splice(Number(b.dataset.removeModule), 1); draw(false); });
      root.querySelector('#setup-add-subject')?.addEventListener('click', () => { capture(); if (subjectDraft.length >= 20) return error('最多 20 个科目'); subjectDraft.push({ name: '', defaultMax: 100 }); draw(false); root.querySelector('[data-subject-name="' + (subjectDraft.length - 1) + '"]').focus(); });
      root.querySelectorAll('[data-remove-subject]').forEach(b => b.onclick = () => { capture(); if (subjectDraft.length <= 1) return error('至少保留 1 个科目'); subjectDraft.splice(Number(b.dataset.removeSubject), 1); draw(false); });
      root.querySelector('#setup-add-category')?.addEventListener('click', () => { capture(); if (categoryDraft.options.length >= 12) return error('最多 12 个分类'); categoryDraft.options.push(''); draw(false); root.querySelector('[data-category="' + (categoryDraft.options.length - 1) + '"]').focus(); });
      root.querySelectorAll('[data-remove-category]').forEach(b => b.onclick = () => { capture(); if (categoryDraft.options.length <= 1) return error('至少保留 1 个分类'); categoryDraft.options.splice(Number(b.dataset.removeCategory), 1); draw(false); });
      root.querySelector('#setup-province')?.addEventListener('change', e => { province = e.target.value; city = ''; school = null; draw(false); });
      root.querySelector('#setup-city')?.addEventListener('change', e => { city = e.target.value; school = null; showResults(); });
      root.querySelector('#setup-school-query')?.addEventListener('input', e => { schoolQuery = e.target.value; school = null; showResults(); });
    }
    function applySelection() {
      if (pickedKey === selected.join('|')) return;
      pickedKey = selected.join('|');
      if (!selected.length) { subjectDraft = clone(state.subjectConfigs); moduleDraft = clone(state.modulesV18); return; }
      const names = CORE.concat(selected);
      subjectDraft = names.map(name => ({ name, defaultMax: state.subjectConfigs.find(s => s.name === name)?.defaultMax || (CORE.includes(name) ? 150 : 100) }));
      moduleDraft = clone(state.modulesV18);
      moduleDraft.forEach(m => { if (m.name === NAMES[1]) m.subjects = CORE.concat(selected.includes('物理') ? '物理' : selected.includes('历史') ? '历史' : m.subjects.find(s => !CORE.includes(s)) || '物理'); if (m.name === NAMES[2]) m.subjects = names.slice(); });
    }
    function validateRows(rows, nameKey, label) {
      if (!rows.length || rows.some(s => !s[nameKey])) throw new Error('请填写' + label + '名称');
      if (new Set(rows.map(s => s[nameKey])).size !== rows.length) throw new Error(label + '名称不能重复');
    }
    async function advance(skip) {
      if (busy) return; capture(); error('');
      if (!loaded && step > 0) return;
      setBusy(true);
      try {
        if (!savedProfile) savedProfile = await setupApi('start', { school_only: schoolOnly });
        if (step === 1 && !skip) {
          if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(username)) throw new Error('用户名请用 2～24 位中文、字母、数字、横线或下划线');
          if (password || confirmPassword) { if (!/^[\x21-\x7E]{6,20}$/.test(password)) throw new Error('密码请用 6～20 位字母、数字或符号'); if (password !== confirmPassword) throw new Error('两次密码不一样，请再检查一下'); }
          if (username !== state.user.username) { const d = await usernameApiV19('rename', { username }); state.user.username = d.user.username; if (credentials) credentials.username = d.user.username; }
          if (password) { await changePasswordApiV15(password); if (credentials) credentials.password = password; password = confirmPassword = ''; }
        }
        if (step === 1 && skip) { username = state.user.username; password = confirmPassword = ''; }
        if (step === 2) { if (skip) selected = []; else if (selected.length !== 3) throw new Error('请选择 3 门，或点「先跳过」'); applySelection(); }
        if (step === 3) {
          validateRows(moduleDraft, 'name', '模块');
          for (const m of moduleDraft) { const count = m.subjects.length; if (m.name === NAMES[0] && count !== 3 || m.name === NAMES[1] && count !== 4 || m.name === NAMES[2] && count !== 6 || !m.isBuiltin && count < 2) throw new Error('请选好「' + m.name + '」的科目'); }
          const data = await modulesApiV18('save_modules', { modules: moduleDraft }); state.modulesV18 = data.modules; moduleDraft = clone(data.modules);
        }
        if (step === 4) {
          validateRows(subjectDraft, 'name', '科目');
          if (subjectDraft.some(s => !Number.isFinite(s.defaultMax) || s.defaultMax <= 0 || s.defaultMax > 99999)) throw new Error('满分请填 0～99999 之间的正数');
          const data = await dataApiV7('save_subjects', { subjects: subjectDraft }); state.subjectConfigs = data.subjects; subjectDraft = clone(data.subjects);
          applyExamSubjectsV10(state.exams || [], state.subjectConfigs);
        }
        if (step === 5) { if (!categoryDraft.label) throw new Error('请填写分类名称'); validateRows(categoryDraft.options.map(name => ({ name })), 'name', '分类'); const data = await dataApiV7('save_classification', { classification: categoryDraft }); state.classification = data.classification; }
        const update = schoolOnly ? {} : { step: Math.min(6, step + 1), selected_subjects: step === 2 ? selected : savedProfile.selected_subjects || [] };
        if (step === 6) {
          if (!skip && !schoolQuery.trim()) throw new Error('请输入学校，或点「跳过并完成」');
          update.school = skip ? null : school || { name: schoolQuery.trim(), province, city, area: '', source: 'manual' };
          if (!schoolOnly) update.completed = true;
        }
        savedProfile = await setupApi('save', update); state.setupProfile = savedProfile;
        track(skip ? 'setup_step_skipped' : 'setup_step_completed', step + 1);
        if (step === 6) { pending(false); close(); state.page = schoolOnly ? 'account' : 'home'; render(); toast(schoolOnly ? '学校已保存' : '准备好了，开始记录吧'); return; }
        step++; busy = false; draw();
      } catch (e) { busy = false; draw(false); error(e.message || '没有保存成功，请再试一次'); }
    }
    async function prepare() {
      loadingError = ''; loaded = false;
      try {
        if (!savedProfile) savedProfile = await setupApi('start', { school_only: schoolOnly });
        await loadExams();
        moduleDraft = clone(state.modulesV18 || []); subjectDraft = clone(state.subjectConfigs || []); categoryDraft = clone(state.classification);
        if (!moduleDraft.length || !subjectDraft.length) throw new Error('设置暂时没加载完整，请再试一次');
        if (selected.length && step <= 4) { const savedModules = clone(moduleDraft); pickedKey = ''; applySelection(); if (step === 4) moduleDraft = savedModules; }
        loaded = true; if (active === root) draw(false);
      } catch (e) { loadingError = e.message; if (active === root) { draw(false); error('设置暂时没加载完成，可以重试'); } }
    }
    draw(); prepare();
  };
  const previousRender = render;
  render = function () {
    previousRender();
    if (!state.user) { checkedUser = ''; state.setupProfile = null; return; }
    if (active || checkedUser === state.user.id) return;
    checkedUser = state.user.id;
    const userId = state.user.id;
    setupApi('get').then(profile => { if (state.user?.id !== userId) return; state.setupProfile = profile; if (profile && !profile.completed_at || isPending()) showOnboarding(profile); else if (state.page === 'account') renderPage(); }).catch(() => { if (state.user?.id === userId && isPending()) showOnboarding(); else checkedUser = ''; });
  };
  const previousAccount = accountHtml;
  accountHtml = function () { return previousAccount() + '<section class="card setup-school-account"><h3 class="card-title">我的学校</h3><p>' + esc(state.setupProfile?.school?.name || '还没有选择学校') + '</p><button class="secondary" id="setup-edit-school">' + (state.setupProfile?.school ? '修改学校' : '选择学校') + '</button></section>'; };
  const previousBind = bindPage;
  bindPage = function () { previousBind(); document.getElementById('setup-edit-school')?.addEventListener('click', () => showOnboarding(state.setupProfile, true)); };
  // compat.js has a DOMContentLoaded fallback for older builds. Reclaim the
  // registration entry after that fallback runs so this flow stays active.
  const firstRunRegister = startRegister;
  const reclaimRegister = () => { window.startRegister = firstRunRegister; };
  if (document.readyState === 'complete') reclaimRegister();
  else window.addEventListener('DOMContentLoaded', reclaimRegister, { once: true });
  if (state.user && !state.onboarding) render();
})();
