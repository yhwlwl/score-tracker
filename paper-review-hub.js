/* The analysis page has two peer tabs; AI reports are account-wide. */
(function () {
  'use strict';
  var esc = function (s) { return escapeHtml(String(s == null ? '' : s)); };
  var names = { strengths: '优势与得分步骤', difficulty: '题目难度', causes: '失分诊断', solutions: '关键解答', practice: '针对性练习', patterns: '跨题共性', plan: '复习计划' };
  var labels = { running: '分析中', paused: '可继续', succeeded: '已完成', failed: '待恢复', draft: '资料草稿' };
  var ctx, root, generation = 0, rows = [], drafts = [], more = false, origin = null, seed = null, selection = null, activeEditor = null;
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
  function tabs(node) {
    var nav = document.createElement('div'); nav.className = 'ph-tabs'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', '分析类型');
    nav.innerHTML = ['stats','ai'].map(function (k) { return '<button role="tab" aria-selected="' + ((state.analysisTab || 'stats') === k) + '" data-analysis-tab="' + k + '">' + (k === 'stats' ? '成绩分析' : 'AI 试卷分析') + '</button>'; }).join('');
    nav.onclick = function (e) { var b = e.target.closest('[data-analysis-tab]'); if (!b || !leaveEditor()) return; state.analysisTab = b.dataset.analysisTab; renderPage(); };
    node.prepend(nav);
  }
  function note(s) { var el = root && root.querySelector('.ph-message'); if (el) el.textContent = s || ''; }
  function shell() {
    root.innerHTML = '<div class="ph-workspace"><header class="ph-header"><div><span class="pr-eyebrow">学习复盘</span><h1>AI 试卷分析</h1><p>所有考试、所有科目，在这里录入、复盘与继续学习。</p></div><div>' + (origin && origin.modal.isConnected ? button('返回正在编辑的考试', 'return') : '') + button('新建分析', 'new', true) + '</div></header><div class="ph-message" role="status" aria-live="polite"></div><div class="ph-body"></div></div>';
    tabs(root.firstElementChild);
    root.querySelector('.ph-workspace').onclick = async function (e) {
      var b = e.target.closest('[data-hub]'); if (!b) return;
      try {
        if (/^(new|list|return|open:|draft:)/.test(b.dataset.hub) && !leaveEditor()) return;
        if (b.dataset.hub === 'new') { selection = null; seed = null; await create(); }
        else if (b.dataset.hub === 'list') await list();
        else if (b.dataset.hub === 'more') await list(true);
        else if (b.dataset.hub === 'return') { origin.modal.style.display = ''; state.page = origin.previousPage || 'exams'; state.analysisTab = 'ai'; renderPage(); }
        else if (b.dataset.hub.startsWith('open:')) await open(b.dataset.hub.slice(5));
        else if (b.dataset.hub.startsWith('draft:')) await create(drafts.find(function (r) { return r.request_id === b.dataset.hub.slice(6); }));
        else if (b.dataset.hub.startsWith('delete-draft:') && confirm('删除这份资料草稿及扫描件？')) { b.disabled = true; await api('delete_draft', { request_id: b.dataset.hub.slice(13) }); await list(); }
      } catch (err) { note(err.message); } finally { if (b.isConnected) b.disabled = false; }
    };
  }
  function body() { return root.querySelector('.ph-body'); }
  function renderCards() {
    var host = root.querySelector('.ph-list'); if (!host) return;
    var all = drafts.filter(function (d) { return (!filters.subject || d.subject === filters.subject) && (!filters.exam_id || d.exam_id === filters.exam_id) && !filters.status; }).map(function (d) { return Object.assign({}, d, { status: 'draft' }); }).concat(rows);
    var matched = all.filter(function (r) { return !filters.search || [r.title, r.subject, examName(r.exam_id)].join(' ').toLowerCase().includes(filters.search.toLowerCase()); });
    host.innerHTML = matched.length ? matched.map(function (r) { return '<article class="ph-card"><div class="ph-card-top"><span class="ph-subject">' + esc(r.subject) + '</span><span class="ph-status ph-' + r.status + '">' + labels[r.status] + '</span></div><h3>' + esc(r.title || examName(r.exam_id) + ' · ' + r.subject) + '</h3><p>' + esc(examName(r.exam_id)) + '</p><small>' + esc(new Date(r.created_at).toLocaleString('zh-CN')) + '</small>' + (r.progress && r.status !== 'succeeded' ? '<p class="ph-progress">' + esc(r.progress.message || '') + (r.progress.total_questions ? ' · ' + (r.progress.completed_questions || 0) + '/' + r.progress.total_questions + ' 题' : '') + '</p>' : '') + '<footer>' + button(r.status === 'draft' ? '继续录入' : r.status === 'succeeded' ? '查看报告' : '查看进度 / 恢复', (r.status === 'draft' ? 'draft:' : 'open:') + r.request_id) + (r.status === 'draft' ? button('删除', 'delete-draft:' + r.request_id) : '') + '</footer></article>'; }).join('') : '<div class="ph-empty"><h3>' + (all.length || filters.subject || filters.exam_id || filters.status || filters.search ? '没有符合条件的记录' : '从一张试卷开始复盘') + '</h3><p>上传原卷和作答，保存题目，找到值得保留的方法和下一步练习。</p>' + button('新建分析', 'new', true) + '</div>';
    root.querySelector('.ph-more').innerHTML = more ? button('加载更多记录', 'more') : '';
  }
  async function list(append) {
    selection = null; seed = null;
    if (!append) {
      body().innerHTML = '<div class="ph-filters"><label>科目<select data-filter="subject"><option value="">全部科目</option>' + subjects().map(function (s) { return '<option ' + (filters.subject === s ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label><label>考试<select data-filter="exam_id">' + examOptions(filters.exam_id).replace('暂不关联考试','全部考试') + '</select></label><label>状态<select data-filter="status"><option value="">全部状态</option>' + Object.keys(labels).filter(function (k) { return k !== 'draft'; }).map(function (k) { return '<option value="' + k + '" ' + (filters.status === k ? 'selected' : '') + '>' + labels[k] + '</option>'; }).join('') + '</select></label><label>搜索已加载记录<input data-search value="' + esc(filters.search) + '" placeholder="报告名称、科目或考试"></label>' + button('刷新', 'list') + '</div><div class="ph-list" aria-live="polite">正在读取全部分析…</div><div class="ph-more"></div>';
      body().querySelectorAll('[data-filter]').forEach(function (el) { el.onchange = function () { filters[el.dataset.filter] = el.value; list().catch(function (e) { note(e.message); }); }; });
      body().querySelector('[data-search]').oninput = function (e) { filters.search = e.target.value; renderCards(); };
    }
    var gen = generation; note('');
    try { var data = await api('list_all', Object.assign({}, filters, { offset: append ? rows.length : 0 })); if (gen !== generation || !root.isConnected) return; rows = append ? rows.concat(data.reviews) : data.reviews; if (!append) drafts = data.drafts || []; more = data.has_more; renderCards(); }
    catch (e) { note(e.message); var el = root.querySelector('.ph-list'); if (el) el.innerHTML = '<p>记录读取未完成，请点击刷新重试。</p>'; }
  }
  function optionSelect(key, label, values, chosen) { return '<label>' + label + '<select name="' + key + '">' + Object.keys(values).map(function (k) { return '<option value="' + k + '" ' + (String(chosen) === k ? 'selected' : '') + '>' + values[k] + '</option>'; }).join('') + '</select></label>'; }
  async function create(draft) {
    var gen = generation, settings = draft && draft.options;
    if (!settings) { var pref = await api('preferences'); settings = pref.settings; }
    if (gen !== generation) return;
    var data = draft || seed || {}, selectedSubject = data.subject || '物理';
    var opts = settings || {}; selection = null;
    body().innerHTML = '<form class="ph-create"><div class="ph-section-title"><div><h2>' + (draft ? '继续录入资料' : '新建分析') + '</h2><p>先选复盘目标，再添加原卷、作答和参考答案。</p></div>' + button('返回记录', 'list') + '</div><div class="ph-form-grid"><label>报告名称<input name="title" maxlength="100" placeholder="例如：期中物理复盘" value="' + esc(data.title || '') + '"></label><label>科目<input name="subject" list="ph-subjects" maxlength="40" required value="' + esc(selectedSubject) + '"><datalist id="ph-subjects">' + subjects().map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist></label><label>关联考试<select name="exam_id">' + examOptions(data.exam_id || '', selectedSubject) + '</select></label>' + optionSelect('purpose','这次要做什么',{ analysis:'录入并生成学习分析', record:'只录入题目、作答和批改' },opts.purpose) + '</div>' + (data.originDraft ? '<p class="ph-hint">已带入正在编辑的考试。保存考试后，本份分析会自动关联。</p>' : '') + '<fieldset><legend>需要的分析内容</legend><div class="ph-modules">' + Object.keys(names).map(function (k) { return '<label><input type="checkbox" name="modules" value="' + k + '" ' + ((!opts.modules || opts.modules.includes(k)) ? 'checked' : '') + '><span>' + names[k] + '</span></label>'; }).join('') + '</div><p>题目、作答和批改分始终保留。只生成勾选的分析内容。</p></fieldset><div class="ph-form-grid">' + optionSelect('detail','讲解详细程度',{ brief:'简洁 · 关键结论与一步行动',standard:'标准 · 关键步骤与理由',detailed:'详细 · 分步骤讲解' }, opts.detail) + optionSelect('focus','复盘重点',{ balanced:'理解与考试兼顾',understand:'理解概念与推理',exam:'考试取分与检查' },opts.focus) + optionSelect('time_budget_minutes','每轮分析时间预算',{3:'3 分钟',8:'8 分钟',15:'15 分钟',30:'30 分钟'}, opts.time_budget_minutes) + '<label>我的学习目标（可选）<textarea name="goal" rows="2" maxlength="300" placeholder="例如：重点看大题第一处错误，给我可独立完成的小练习">' + esc(opts.goal || '') + '</textarea></label></div><p class="ph-hint">达到时间预算后，完成当前步骤并保存进度；可以继续下一轮。具体耗时随题量和复杂程度变化。</p><label class="pr-check"><input type="checkbox" name="review_before_analysis" ' + (opts.review_before_analysis ? 'checked' : '') + '>识别后先让我核对题目和作答，再开始分析</label><label class="pr-check"><input type="checkbox" name="remember" checked>记住这些分析偏好，下次自动填入</label><footer class="ph-actions"><button class="pr-button pr-primary" type="submit">下一步：添加资料</button></footer></form>';
    var form = body().querySelector('form');
    form.elements.subject.onchange = function () { form.elements.exam_id.innerHTML = examOptions(form.elements.exam_id.value, form.elements.subject.value.trim()); };
    function purpose() { form.querySelector('fieldset').disabled = form.elements.purpose.value === 'record'; }
    form.elements.purpose.onchange = purpose; purpose();
    form.onsubmit = async function (e) {
      e.preventDefault(); var b = form.querySelector('[type=submit]'); b.disabled = true;
      try {
        var options = { purpose: form.elements.purpose.value, modules: Array.from(form.querySelectorAll('[name=modules]:checked')).map(function (x) { return x.value; }), detail: form.elements.detail.value, focus: form.elements.focus.value, time_budget_minutes: Number(form.elements.time_budget_minutes.value), goal: form.elements.goal.value, review_before_analysis: form.elements.review_before_analysis.checked };
        if (options.purpose === 'analysis' && !options.modules.length) throw new Error('请选择至少一项分析内容，或切换为只录入');
        if (form.elements.remember.checked) await api('preferences', { settings: options });
        var subject = form.elements.subject.value.trim(), exam_id = form.elements.exam_id.value;
        var setup = { subject: subject, exam_id: exam_id, title: form.elements.title.value.trim(), options: options, draft_id: data.draft_id || window.ScorePaperReview.draftFor(user(), 'hub'), examContext: subject === data.subject ? data.examContext : undefined, originDraft: data.originDraft };
        if (draft) {
          note('正在恢复已保存的扫描件…'); var source = await api('sources', { request_id: draft.request_id });
          setup.pages = await Promise.all(source.pages.map(async function (p) { var response = await fetch(p.url); if (!response.ok) throw new Error('扫描件读取失败，请重试'); var blob = await response.blob(); var url = await new Promise(function (resolve, reject) { var fr = new FileReader(); fr.onload = function () { resolve(fr.result); }; fr.onerror = reject; fr.readAsDataURL(blob); }); return { url: url, role: p.role, name: '第' + p.page + '页', regions: [] }; }));
          setup.request_id = draft.request_id;
        }
        mount(setup);
      } catch (err) { note(err.message); } finally { if (b.isConnected) b.disabled = false; }
    };
  }
  function mount(data, reportId) {
    selection = { data: data, reportId: reportId }; seed = null; note('');
    body().innerHTML = '<div class="ph-editor-toolbar"><span>' + esc(data.title || data.subject + '试卷') + ' · ' + esc(examName(data.exam_id)) + '</span>' + (reportId ? button('关联考试 / 名称', 'link') : '<span class="pr-muted">每轮 ' + data.options.time_budget_minutes + ' 分钟 · ' + (data.options.purpose === 'record' ? '只录入' : data.options.modules.length + ' 项分析')) + '</div><div class="ph-editor"></div>';
    var host = body().querySelector('.ph-editor'), exam = exams().find(function (e) { return e.id === data.exam_id; });
    var c = Object.assign(context(), { host: host, exam: exam, examId: data.exam_id || '', draftId: data.draft_id, sessions: {}, title: data.title, options: data.options, examContext: data.examContext, initialReport: reportId, onClose: list });
    if (data.pages) c.sessions[data.subject] = { pages: data.pages, workOnPaper: true, consent: false, pending: null };
    if (data.request_id) c.sessions[data.subject].cloudDraftId = data.request_id;
    activeEditor = c;
    window.ScorePaperReview.mount(c, data.subject, null);
    var link = body().querySelector('[data-hub=link]'); if (link) link.onclick = function () {
      var panel = document.createElement('form'); panel.className = 'ph-link-form'; panel.innerHTML = '<label>报告名称<input name="title" maxlength="100" value="' + esc(data.title || '') + '"></label><label>关联到考试<select name="exam">' + examOptions(data.exam_id, data.subject) + '</select></label><p class="pr-muted">关联用于整理记录；报告保留开始分析时的考试数值。</p><button class="pr-button pr-primary" type="submit">保存关联</button>';
      link.replaceWith(panel); panel.onsubmit = async function (e) { e.preventDefault(); try { await api('link', { request_id: reportId, exam_id: panel.elements.exam.value || null, title: panel.elements.title.value }); await open(reportId); note('关联已保存'); } catch (err) { note(err.message); } };
    };
  }
  async function open(id) { var d = await api('get', { request_id: id }), r = d.review; mount({ subject: r.subject, exam_id: r.exam_id, draft_id: r.draft_id, title: r.title, options: r.options }, id); }
  function enter(old, subject, examContext) {
    old.previousPage = state.page; origin = old; old.modal.style.display = 'none';
    seed = { subject: subject, exam_id: old.exam && old.exam.scores && old.exam.scores[subject] ? old.examId : '', draft_id: old.draftId, examContext: examContext, title: (old.modal.querySelector('#examName').value || '考试') + ' · ' + subject, originDraft: !old.examId }; selection = null;
    state.analysisTab = 'ai'; state.page = 'stats'; renderPage();
  }
  function render(node) {
    if (!node) return; generation++; root = node;
    var next = context(); if (ctx && ctx.user !== next.user) { seed = null; selection = null; rows = []; drafts = []; origin = null; } ctx = next;
    shell(); if (selection) mount(selection.data, selection.reportId); else if (seed) create().catch(function (e) { note(e.message); }); else list();
  }
  window.ScorePaperHub = { tabs: tabs, render: render, enter: enter };
  var style = document.createElement('style'); style.textContent = `
.ph-workspace{max-width:1100px;margin:0 auto;padding:0 0 40px;color:var(--text)}.ph-tabs{display:flex;gap:6px;margin:0 0 24px;padding:5px;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:13px;width:fit-content}.ph-tabs button{border:0;background:transparent;color:var(--muted);padding:10px 22px;border-radius:9px;font:inherit;font-size:14px;cursor:pointer}.ph-tabs [aria-selected=true]{background:var(--accent-soft,#eef1ff);color:var(--accent);font-weight:700}.ph-header,.ph-section-title{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.ph-header h1{font-size:26px;margin:6px 0}.ph-header p,.ph-section-title p{font-size:13px;color:var(--muted);margin:5px 0}.ph-header>div:last-child{display:flex;gap:8px;flex-wrap:wrap}.ph-filters{display:grid;grid-template-columns:1fr 1.4fr 1fr 1.6fr auto;gap:12px;align-items:end;margin:20px 0}.ph-workspace label{font-size:12px;color:var(--muted)}.ph-workspace input:not([type=checkbox]):not([type=file]),.ph-workspace select,.ph-workspace textarea{box-sizing:border-box;width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;font-size:14px;margin-top:6px}.ph-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.ph-card{min-width:0;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:16px;padding:20px;display:flex;flex-direction:column}.ph-card h3{font-size:17px;line-height:1.5;margin:16px 0 7px;overflow-wrap:anywhere}.ph-card p{font-size:13px;color:var(--muted);margin:4px 0 8px}.ph-card small{font-size:11px;color:var(--muted)}.ph-card-top{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ph-subject{font-weight:700;color:var(--accent)}.ph-status{padding:3px 8px;border-radius:20px;background:var(--accent-soft);font-size:11px}.ph-succeeded{color:#31846c;background:#31846c15}.ph-card footer{display:flex;gap:8px;margin-top:auto;padding-top:18px}.ph-progress{padding-top:10px}.ph-empty{grid-column:1/-1;padding:55px 18px;text-align:center;border:1px dashed var(--line);border-radius:16px}.ph-empty p{font-size:13px;color:var(--muted)}.ph-more{text-align:center;margin:20px}.ph-message:empty{display:none}.ph-message{padding:12px;border-radius:10px;background:var(--accent-soft);font-size:13px;margin-bottom:16px}.ph-create{background:var(--panel-solid,#fff);padding:26px;border:1px solid var(--line);border-radius:18px}.ph-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ph-create fieldset{border:1px solid var(--line);border-radius:12px;padding:18px;margin:24px 0}.ph-create legend{font-size:14px;font-weight:700;padding:0 7px}.ph-create fieldset p,.ph-hint{font-size:12px;color:var(--muted);line-height:1.8}.ph-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ph-modules label{display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px}.ph-modules input{accent-color:var(--accent)}.ph-create fieldset:disabled{opacity:.5}.ph-actions{text-align:right;padding-top:15px}.ph-editor-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;margin-bottom:15px;flex-wrap:wrap}.ph-link-form{display:grid;gap:10px;flex:1}.pr-inline{width:100%!important;max-width:100%!important;max-height:none!important;height:auto!important;margin:0!important;border:1px solid var(--line)!important;border-radius:16px!important;box-shadow:none;overflow:visible}.pr-inline .pr-head{position:static;border-radius:16px 16px 0 0}.pr-inline .pr-tabs{display:none}.pr-inline .pr-content{padding-top:20px}.pr-inline .pr-main{max-width:850px;margin:auto}.ph-workspace button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:800px){.ph-list{grid-template-columns:repeat(2,minmax(0,1fr))}.ph-filters{grid-template-columns:1fr 1fr}.ph-filters>button{justify-self:start}.ph-header{align-items:start}.ph-header h1{font-size:22px}.ph-modules{grid-template-columns:1fr 1fr}}@media(max-width:520px){.ph-header,.ph-section-title{flex-direction:column;align-items:stretch}.ph-header>div:last-child{justify-content:flex-start}.ph-list{grid-template-columns:1fr}.ph-create{padding:18px}.ph-form-grid{grid-template-columns:1fr}.ph-tabs{width:100%;box-sizing:border-box}.ph-tabs button{flex:1;padding:9px 10px}.ph-workspace .pr-head{align-items:start;gap:8px}.ph-editor-toolbar{align-items:start}.pr-inline .pr-content{padding:12px 14px 22px}.ph-workspace{padding-bottom:60px}}`;
  document.head.appendChild(style);
})();
