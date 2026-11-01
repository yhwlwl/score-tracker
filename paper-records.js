/* The recorded question ledger feeds both statistical and AI analysis. */
(function () {
  'use strict';
  var esc = function (v) { return escapeHtml(String(v == null ? '' : v)); };
  var names = { strengths:'优势与得分步骤', difficulty:'题目难度', causes:'失分原因', solutions:'关键解答', practice:'针对性练习', patterns:'跨题共性', plan:'复习安排' };
  function track(event, data) { if (window.__scoreTrackerTrack) window.__scoreTrackerTrack(event, data, 'stats'); }
  function fields(q, c) {
    var level = c.question_difficulty ?? q.question_difficulty ?? '';
    return '<div class="pr-score-fields"><label>题型名称<input data-field="question_type" maxlength="40" placeholder="如：阅读理解 / 填空题" value="' + esc(c.question_type ?? q.question_type) + '"></label><label>题目难度（选填）<select data-field="question_difficulty"><option value="">未标注</option>' + Object.keys(ScoreQuestionTypeModel.difficulties).map(function (k) { return '<option value="' + k + '"' + (k === level ? ' selected' : '') + '>' + ScoreQuestionTypeModel.difficulties[k] + '</option>'; }).join('') + '</select></label></div><p class="pr-muted">同名题型会合计。难度按题目实际要求标注；AI 估分不进入题型统计。</p>';
  }
  async function preview(main, row, ctx, api, note) {
    var previous = main.querySelector('.pr-type-sync'); if (previous) previous.remove();
    var result = await api(ctx, 'preview_types', { request_id: row.request_id, revision: row.revision });
    if (!main.isConnected) return;
    var panel = document.createElement('section'); panel.className = 'pr-type-sync pr-insight';
    panel.innerHTML = '<h3>确认题型得分</h3><p>从已保存且已核对的教师得分汇总，使用卷面原始分。</p><div class="pr-type-table"><table><thead><tr><th>题型</th><th>得分 / 满分</th><th>难度</th></tr></thead><tbody>' + result.rows.map(function (r) { return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.score == null ? '待补全' : r.score) + ' / ' + esc(r.max == null ? '待补全' : r.max) + '</td><td>' + esc(ScoreQuestionTypeModel.difficulties[r.difficulty] || '未标注') + '</td></tr>'; }).join('') + '</tbody></table></div><p class="pr-muted">' + (result.untyped ? result.untyped + ' 题未填题型，不纳入本次同步。' : '') + (result.unverified ? result.unverified + ' 题尚未核对，请保存核对后再同步。' : '') + '得分或满分缺失的题型会保存为待补全，暂不参与统计。</p>' + (result.existing.length ? '<details><summary>本科已录 ' + result.existing.length + ' 项题型</summary><p>' + result.existing.map(function (r) { return esc(r.name) + '：' + esc(r.score == null ? '—' : r.score) + '/' + esc(r.max == null ? '—' : r.max); }).join('；') + '</p></details><label class="pr-check"><input type="checkbox" data-replace-types>确认用上方预览替换本科已有题型得分。其他科目和考试成绩不变。</label>' : '') + '<div class="pr-footer"><button type="button" class="pr-button" data-cancel-types>取消</button><button type="button" class="pr-button pr-primary" data-sync-types>确认同步到题型分析</button></div><p role="status" data-sync-note></p>';
    main.prepend(panel); panel.scrollIntoView && panel.scrollIntoView({ block:'start' });
    track('paper_type_preview', { types: result.rows.length, untyped: result.untyped, unverified: result.unverified });
    var submit = panel.querySelector('[data-sync-types]'), replace = panel.querySelector('[data-replace-types]');
    function enabled() { submit.disabled = !result.rows.length || result.unverified > 0 || !!replace && !replace.checked; }
    if (replace) replace.onchange = enabled; enabled();
    panel.querySelector('[data-cancel-types]').onclick = function () { panel.remove(); };
    submit.onclick = async function () {
      submit.disabled = true;
      try {
        var saved = await api(ctx, 'sync_types', { request_id: row.request_id, revision: row.revision, exam_version: result.exam_version, replace: !!replace && replace.checked });
        if (String(state.user && state.user.id || '') !== ctx.user || state.token !== ctx.token) return;
        [state.exams, state.allExams].forEach(function (list) { (list || []).forEach(function (exam) { if (exam.id === saved.exam_id) exam.question_type_scores = saved.question_type_scores; }); });
        track('paper_type_sync', { types: result.rows.length, replaced: result.existing.length > 0 });
        panel.innerHTML = '<h3>题型得分已同步</h3><p>已保存 ' + result.rows.length + ' 项，打开题型分析即可查看本场及历次变化。</p><button type="button" class="pr-button pr-primary" data-view-types>查看题型分析</button>';
        panel.querySelector('[data-view-types]').onclick = function () { if (ctx.canLeave && !ctx.canLeave()) return; if (ctx.dispose) ctx.dispose(); window.ScoreQuestionTypeAnalysis.open(row.subject); };
      } catch (e) { if (panel.isConnected) { panel.querySelector('[data-sync-note]').textContent = e.message + '；可取消后重新预览。'; enabled(); } else note(e.message, true); }
    };
  }
  function configure(host, row, hooks) {
    var requestId = crypto.randomUUID(), draftId = crypto.randomUUID(), old = row.options || {};
    host.innerHTML = '<section class="ph-create"><div class="ph-section-title"><div><h2>使用已录试题生成 AI 分析</h2><p>' + esc(row.subject) + ' · ' + row.result.questions.length + ' 题 · 使用已保存的文字、作答与批改分。</p></div><button type="button" class="pr-button" data-back-record>返回试题</button></div><p class="pr-muted">本次分析保存独立快照；之后修改录入资料，不会改变已有报告。直接复用录入结果，可选用原图辅助理解图形。</p><form class="pr-record-analysis"><div class="ph-form-grid"><label>详细分析范围<select name="scope"><option value="all">全部适用题目</option><option value="losses">失分题优先</option><option value="selected">我选择的题目</option></select></label><label>讲解详略<select name="detail"><option value="brief">只讲关键点</option><option value="standard" selected>讲清关键步骤</option><option value="detailed">从基础一步步讲</option></select></label></div><fieldset data-question-picks hidden><legend>选择题目</legend>' + row.result.questions.map(function (q) { return '<label class="pr-check"><input type="checkbox" name="question" value="' + esc(q.label) + '">第 ' + esc(q.label) + ' 题</label>'; }).join('') + '</fieldset><details class="ph-context"><summary>分析内容与更多设置</summary><div class="ph-modules">' + Object.keys(names).map(function (k) { return '<label class="pr-check"><input type="checkbox" name="module" value="' + k + '" checked>' + names[k] + '</label>'; }).join('') + '</div><label>单轮运行上限<select name="budget"><option value="3">3 分钟</option><option value="8">8 分钟</option><option value="15" selected>15 分钟</option><option value="30">30 分钟</option></select></label><label>年级<input name="grade" maxlength="40" value="' + esc(old.grade) + '"></label><label>已学范围<input name="range" maxlength="200" value="' + esc(old.learning_range) + '"></label><label>特别想问的问题<textarea name="goal" maxlength="300" rows="2"></textarea></label><label class="pr-check"><input type="checkbox" name="scans" checked>结合已保存原图辅助理解图形与版式</label><label class="pr-check"><input type="checkbox" name="history" checked>允许结合同账号本次及历史成绩</label></details><label class="pr-check pr-consent"><input type="checkbox" name="consent" required>确认使用保存的题目、作答和批改分，以及允许调用的考试数值发送给 AI 分析。开始后计一次分析次数。</label><div class="pr-footer"><span role="status" data-analysis-note></span><button class="pr-button pr-primary" type="submit">生成 AI 分析</button></div></form></section>';
    var form = host.querySelector('form');
    host.querySelector('[data-back-record]').onclick = function () { hooks.open(row.request_id); };
    form.elements.scope.onchange = function () { form.querySelector('[data-question-picks]').hidden = this.value !== 'selected'; };
    form.onsubmit = async function (e) {
      e.preventDefault(); var submit = form.querySelector('[type=submit]'), status = form.querySelector('[data-analysis-note]');
      var selected = Array.from(form.querySelectorAll('[name=question]:checked')).map(function (b) { return b.value; });
      if (form.elements.scope.value === 'selected' && !selected.length) { status.textContent = '请至少选择一道题'; return; }
      submit.disabled = true; status.textContent = '正在创建分析…';
      try {
        var options = Object.assign({}, old, { config_version:2, purpose:'analysis', use_source_scans:form.elements.scans.checked, use_account_history:form.elements.history.checked, review_before_analysis:false, analysis_scope:form.elements.scope.value, selected_questions:selected,
          detail:form.elements.detail.value, time_budget_minutes:Number(form.elements.budget.value), grade:form.elements.grade.value, learning_range:form.elements.range.value, goal:form.elements.goal.value,
          modules:Array.from(form.querySelectorAll('[name=module]:checked')).map(function (b) { return b.value; }) });
        var data = await hooks.api('analyze_record', { request_id:requestId, draft_id:draftId, source_request_id:row.request_id, source_revision:row.revision, consent:form.elements.consent.checked, options:options });
        if (!host.isConnected) return;
        track('paper_analysis_from_record', { questions:row.result.questions.length, scope:options.analysis_scope });
        await hooks.started(data.request_id);
      } catch (err) { if (host.isConnected) { status.textContent = err.message + '；重试会使用同一请求，不重复计次。'; submit.disabled = false; } }
    };
  }
  window.ScorePaperRecords = { fields:fields, preview:preview, configure:configure };
  var style = document.createElement('style');
  style.textContent = '.pr-type-table{overflow-x:auto}.pr-type-table table{width:100%;border-collapse:collapse;font-size:14px}.pr-type-table th,.pr-type-table td{padding:12px 8px;border-bottom:1px solid var(--line);text-align:left}.pr-type-table td:first-child{overflow-wrap:anywhere}.pr-type-sync .pr-footer{flex-wrap:wrap}.pr-record-analysis fieldset{border:1px solid var(--line);border-radius:10px}.ph-tabs{flex-wrap:wrap}.ph-tabs button{white-space:nowrap}@media(max-width:520px){.ph-tabs button{flex:1 1 40%}.pr-type-sync .pr-button{width:100%}}';
  document.head.appendChild(style);
})();
