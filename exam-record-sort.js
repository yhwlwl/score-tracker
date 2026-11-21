/* Exam records: view-only chronological sorting and independent category filter. */
(function () {
  'use strict';
  var modes = [
    ['date-desc', '考试日期 · 最新优先'],
    ['created-desc', '最近录入优先'],
    ['date-asc', '考试日期 · 最早优先']
  ];
  function validMode(value) {
    return modes.some(function (m) { return m[0] === value; }) ? value : 'date-desc';
  }
  function timestamp(value) {
    if (!value) return null;
    var n = Date.parse(value);
    return Number.isFinite(n) ? n : null;
  }
  function compareTime(a, b, direction) {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return (a - b) * direction;
  }
  function sortedRecords(exams, mode) {
    mode = validMode(mode);
    return exams.slice().sort(function (a, b) {
      var dateA = timestamp(a.exam_date), dateB = timestamp(b.exam_date);
      var createdA = timestamp(a.created_at), createdB = timestamp(b.created_at);
      var result = mode === 'created-desc'
        ? compareTime(createdA, createdB, -1) || compareTime(dateA, dateB, -1)
        : compareTime(dateA, dateB, mode === 'date-asc' ? 1 : -1) || compareTime(createdA, createdB, -1);
      return result || String(a.id || '').localeCompare(String(b.id || ''));
    });
  }
  function categoryKey(exam) {
    var value = String(exam.grade_level || '').trim();
    return value ? 'category:' + value : 'uncategorized';
  }
  function filteredRecords(exams, category, mode) {
    return sortedRecords(category === 'all' ? exams : exams.filter(function (e) { return categoryKey(e) === category; }), mode);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sortedRecords: sortedRecords, filteredRecords: filteredRecords, categoryKey: categoryKey, validMode: validMode };
    return;
  }
  if (typeof recordsHtml !== 'function' || typeof renderPage !== 'function') return;
  var currentOwner = '', mode = 'date-desc', category = 'all';
  function owner() {
    return String(state.user && (state.user.id || state.user.username) || 'guest');
  }
  function storageKey() { return 'st_exam_record_sort_v1:' + owner(); }
  function syncOwner() {
    if (currentOwner === owner()) return;
    currentOwner = owner(); category = 'all'; mode = 'date-desc';
    try { mode = validMode(localStorage.getItem(storageKey())); } catch (_) {}
  }
  function optionsHtml(list, selected) {
    return list.map(function (item) {
      return '<option value="' + escapeHtml(item[0]) + '"' + (item[0] === selected ? ' selected' : '') + '>' + escapeHtml(item[1]) + '</option>';
    }).join('');
  }
  function categories(exams) {
    var seen = new Set(), options = [['all', '全部']];
    var configured = typeof categoryOptionsV14 === 'function' ? categoryOptionsV14() : [];
    function add(value) {
      value = String(value || '').trim();
      if (!value || seen.has(value)) return;
      seen.add(value); options.push(['category:' + value, value]);
    }
    configured.forEach(add);
    exams.forEach(function (e) { add(e.grade_level); });
    if (exams.some(function (e) { return categoryKey(e) === 'uncategorized'; })) options.push(['uncategorized', '未分类']);
    return options;
  }
  function recordWithCreated(exam) {
    var html = recordHtml(exam);
    if (mode !== 'created-desc' || timestamp(exam.created_at) === null) return html;
    var date = new Date(exam.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    return html.replace(/(<div class="record-date">[\s\S]*?<\/b>)/, function (_, head) {
      return head + '<span class="exam-record-created-v1">录入于 ' + escapeHtml(date) + '</span>';
    });
  }
  recordsHtml = function recordsHtmlSorted() {
    syncOwner();
    var exams = state.allExams || state.exams || [], options = categories(exams);
    if (!options.some(function (item) { return item[0] === category; })) category = 'all';
    var visible = filteredRecords(exams, category, mode);
    var hidden = visible.filter(function (e) { return e.is_hidden; }).length;
    var categoryLabel = typeof categoryLabelV14 === 'function' ? categoryLabelV14() : '分类';
    var head = '<div class="page-head"><div><h2>考试记录</h2></div><button class="primary" id="addExam">＋ 新建</button></div>';
    var toolbar = '<div class="exam-record-tools-v1"><span class="exam-record-count-v1">共 ' + visible.length + ' 场考试' + (hidden ? ' · ' + hidden + ' 场已隐藏' : '') + '</span>'
      + '<div class="exam-record-controls-v1"><label><span>' + escapeHtml(categoryLabel) + '</span><select id="examRecordCategoryV1">' + optionsHtml(options, category) + '</select></label>'
      + '<label><span>排序</span><select id="examRecordSortV1">' + optionsHtml(modes, mode) + '</select></label></div></div>';
    var list = visible.length ? visible.map(recordWithCreated).join('') : '<div class="empty-chart" style="height:260px"><div>' +
      (exams.length ? '此分类暂无考试<button class="secondary" id="examRecordResetV1" style="display:block;margin:14px auto 0">查看全部考试</button>' :
        '还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button>') + '</div></div>';
    return head + toolbar + '<section class="grade-section-v13 exam-record-list-v1"><div class="card records-card">' + list + '</div></section>';
  };
  function refresh(id) {
    renderPage();
    var el = document.getElementById(id);
    if (el) el.focus({ preventScroll: true });
  }
  document.addEventListener('change', function (event) {
    if (state.page !== 'records') return;
    var el = event.target;
    if (el.id === 'examRecordSortV1') {
      syncOwner(); mode = validMode(el.value);
      try { localStorage.setItem(storageKey(), mode); } catch (_) {}
      refresh(el.id);
    } else if (el.id === 'examRecordCategoryV1') {
      syncOwner(); category = el.value; refresh(el.id);
    }
  });
  document.addEventListener('click', function (event) {
    if (state.page === 'records' && event.target.id === 'examRecordResetV1') {
      syncOwner(); category = 'all'; refresh('examRecordCategoryV1');
    }
  });
  var style = document.createElement('style');
  style.textContent = [
    '.exam-record-tools-v1{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px 16px;margin:0 0 14px;color:var(--muted);font-size:13px}',
    '.exam-record-count-v1{font-variant-numeric:tabular-nums}',
    '.exam-record-controls-v1{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;min-width:0}',
    '.exam-record-controls-v1 label{display:flex;gap:6px;align-items:center;min-width:0;margin:0;color:var(--muted);font-size:12px}',
    '.exam-record-controls-v1 select{min-width:0;max-width:100%;font:inherit;font-size:13px;color:var(--text);background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:9px;padding:9px 8px;min-height:38px}',
    '.exam-record-controls-v1 select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '.exam-record-list-v1{margin-top:0}',
    '.exam-record-created-v1{display:block;margin-top:5px;font-size:11px;font-weight:400;color:var(--muted);line-height:1.5}',
    '@media(max-width:620px){.exam-record-controls-v1{width:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:8px}.exam-record-controls-v1 label{display:grid;gap:4px}.exam-record-controls-v1 select{width:100%;min-height:42px;font-size:13px}}'
  ].join('\n');
  document.head.appendChild(style);
})();
