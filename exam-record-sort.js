/* Exam records: view-only chronological sorting and independent category filter. */
(function () {
  'use strict';
  var modes = [
    ['date-desc', '最新考试'],
    ['created-desc', '最近录入'],
    ['date-asc', '最早考试']
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
  var currentOwner = '', mode = 'date-desc', category = 'all', stage='all';
  function owner() {
    return String(state.user && (state.user.id || state.user.username) || 'guest');
  }
  function storageKey() { return 'st_exam_record_sort_v1:' + owner(); }
  function syncOwner() {
    if (currentOwner === owner()) return;
    currentOwner = owner(); category = 'all'; mode = 'date-desc'; stage='all';
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
    var lifecycle=window.ExamGoalLifecycle, pending=lifecycle?visible.filter(lifecycle.pending):[],history=lifecycle?visible.filter(function(e){return !lifecycle.pending(e);}):visible;
    var hidden = history.filter(function (e) { return e.is_hidden; }).length;
    var categoryLabel = typeof categoryLabelV14 === 'function' ? categoryLabelV14() : '分类';
    var head = '<div class="page-head"><div><h2>考试记录</h2></div><button class="primary" id="addExam">＋ 记录成绩</button></div>';
    options = options.map(function(item){return item[0]==='all'?['all','全部'+categoryLabel]:item;});
    var toolbar = '<div class="exam-record-tools-v1"><span class="exam-record-count-v1">共 ' + history.length + ' 场已记录' + (pending.length?' · '+pending.length+' 场待完成':'') + (hidden ? ' · ' + hidden + ' 场已隐藏' : '') + '</span>'
      + '<div class="exam-record-controls-v1"><label><span>' + escapeHtml(categoryLabel) + '</span><select id="examRecordCategoryV1" aria-label="' + escapeHtml(categoryLabel) + '">' + optionsHtml(options, category) + '</select></label>'
      + '<label><span>排序</span><select id="examRecordSortV1" aria-label="排序">' + optionsHtml(modes, mode) + '</select></label></div></div>';
    var stageBar=lifecycle?'<div class="eg-record-tabs" role="group" aria-label="考试状态">'+[['all','全部'],['pending','待完成'],['history','历史考试']].map(function(p){return '<button type="button" data-eg-stage="'+p[0]+'" class="'+(stage===p[0]?'active':'')+'" aria-pressed="'+(stage===p[0])+'">'+p[1]+'</button>';}).join('')+'</div>':'';
    var plan=lifecycle?'<div class="eg-section-head eg-record-section-head"><h3>'+(stage==='history'?'历史考试':'待完成考试'+(pending.length?' · '+pending.length:''))+'</h3><button type="button" class="secondary" data-eg-new>＋ 设置考试目标</button></div>'+(stage!=='history'?(pending.length?'<div class="eg-pending-grid">'+pending.map(lifecycle.pendingCard).join('')+'</div>':'<div class="eg-record-empty" role="status">暂时还没有待完成的考试</div>'):'')+(stage==='all'?'<div class="eg-section-head eg-record-section-head"><h3>历史考试</h3></div>':''):'';
    var list = history.length ? history.map(recordWithCreated).join('') : '<div class="empty-chart" style="height:260px"><div>' +
      (exams.length ? '此分类暂无考试<button class="secondary" id="examRecordResetV1" style="display:block;margin:14px auto 0">查看全部考试</button>' :
        '还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button>') + '</div></div>';
    return head + toolbar + stageBar + plan + (stage==='pending'&&lifecycle?'':'<section class="grade-section-v13 exam-record-list-v1"><div class="card records-card">' + list + '</div></section>');
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
    if(state.page==='records'&&event.target.closest('[data-eg-stage]')){syncOwner();stage=event.target.closest('[data-eg-stage]').dataset.egStage;refresh('examRecordCategoryV1');return;}
    if (state.page === 'records' && event.target.id === 'examRecordResetV1') {
      syncOwner(); category = 'all'; refresh('examRecordCategoryV1');
    }
  });
  var style = document.createElement('style');
  style.textContent = [
    '.exam-record-tools-v1{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:0 0 10px;color:var(--muted);font-size:13px}',
    '.exam-record-count-v1{font-variant-numeric:tabular-nums;line-height:1.5}',
    '.exam-record-controls-v1{display:flex;gap:4px;align-items:center;min-width:0;margin-left:auto}',
    '.exam-record-controls-v1 label{display:flex;align-items:center;min-width:0;margin:0;position:relative}',
    '.exam-record-controls-v1 label>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',
    '.exam-record-controls-v1 select{width:auto;min-width:0;max-width:100%;font:inherit;font-size:13px;color:var(--text);background:transparent;border:0;border-radius:8px;padding:6px 4px;min-height:36px}',
    '.exam-record-controls-v1 label+label{border-left:1px solid var(--line);padding-left:4px}',
    '.exam-record-controls-v1 select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '.exam-record-list-v1{margin-top:0}',
    '.eg-record-tabs{display:flex;gap:3px;align-items:center;padding:3px;background:var(--cell,var(--chip-bg,#f1f3f8));border:1px solid var(--line);border-radius:12px;margin:0 0 16px;max-width:460px}.eg-record-tabs button{flex:1;min-width:0;background:transparent;border:1px solid transparent;border-radius:9px;font:inherit;font-size:13px;color:var(--muted);padding:8px 4px;min-height:36px;cursor:pointer;white-space:nowrap}.eg-record-tabs button.active{color:var(--text);background:var(--panel-solid,#fff);border-color:var(--line);font-weight:650;box-shadow:0 1px 3px rgba(0,0,0,.05)}',
    '.eg-record-section-head{margin:16px 0 8px}.eg-record-section-head h3{margin:0}.eg-record-section-head [data-eg-new]{background:transparent;border:0;box-shadow:none;color:var(--accent);font-size:13px;padding:8px 0 8px 8px;min-height:36px}',
    '.eg-record-empty{padding:15px 12px;text-align:center;border:1px solid var(--line);border-radius:12px;background:var(--panel-solid,#fff);color:var(--muted);font-size:13px;line-height:1.5;margin:0 0 20px}',
    '.exam-record-created-v1{display:block;margin-top:5px;font-size:11px;font-weight:400;color:var(--muted);line-height:1.5}',
    '@media(max-width:620px){.exam-record-controls-v1{flex-wrap:wrap;max-width:100%}.exam-record-controls-v1 select{max-width:44vw}.eg-record-tabs{max-width:none}}'
  ].join('\n');
  document.head.appendChild(style);
})();
