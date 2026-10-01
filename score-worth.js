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
