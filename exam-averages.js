/* Exam-specific final-score references; reuse the existing chart legend. */
(function () {
  'use strict';
  function number(v) { return v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v); }
  function moduleFor(subject) { return (state.modulesV18 || []).find(function (m) { return m.name === subject; }); }
  function keyFor(subject) { var m = moduleFor(subject); return subject === '总分' ? 'total' : m ? 'm:' + m.id : 's:' + subject; }
  function namesFor(exam, subject) {
    if (subject === '总分') return Object.keys(exam.scores || {}).filter(function (s) { return !exam.scores[s].excludeFromTotal && !moduleFor(s); }).sort();
    var m = moduleFor(subject); return m ? m.subjects.slice().sort() : [subject];
  }
  function basis(exam, subject) { return JSON.stringify(namesFor(exam, subject).map(function (s) { return [s, number(exam.scores && exam.scores[s] && exam.scores[s].max) || 100]; })); }
  function finalScore(exam, subject) {
    if (subject === '总分' && number(exam.total_actual_score) !== null) return number(exam.total_actual_score);
    var names = namesFor(exam, subject), sum = 0;
    if (!names.length) return null;
    for (var s of names) {
      var r = (exam.scores || {})[s]; if (!r) return null;
      var v = number(r.actual);
      if (v === null && number(r.rawMax == null ? r.max : r.rawMax) === number(r.max)) v = number(r.raw);
      if (v === null) return null;
      sum += v;
    }
    return Math.round(sum * 100) / 100;
  }
  function value(exam, subject, scope, percent) {
    var r = exam.averages && exam.averages[keyFor(subject)];
    if (!r || r.basis !== basis(exam, subject)) return null;
    var shown = subject === '总分' ? totalFor(exam,'actual') : examScore(exam,subject,'actual');
    var complete = finalScore(exam,subject);
    if (shown !== null && (complete === null || Math.abs(shown - complete) > 0.000001)) return null;
    var v = number(r[scope]); if (v === null) return null;
    if (!percent) return v;
    // A weighted manual total has no known denominator.
    if (subject === '总分' && number(exam.total_actual_score) !== null) return null;
    var max = 0;
    for (var s of namesFor(exam, subject)) { var row = (exam.scores || {})[s]; if (!row || !(number(row.max) > 0)) return null; max += number(row.max); }
    return max > 0 ? v / max * 100 : null;
  }
  function series() {
    if (state.trendMetric !== 'score' || state.scoreBasis === 'raw' || state.subject === '总览') return [];
    var subject = state.subject, percent = state.scoreViewV25 === 'percent';
    return [{label:'班级均分',scope:'class',color:'#d38429'},{label:'年级均分',scope:'year',color:'#8f62db'}].map(function (s) {
      return {label:s.label,color:s.color,dash:'3 5',value:function (e) { return value(e,subject,s.scope,percent); }};
    }).filter(function (s) { return (state.exams || []).some(function (e) { return s.value(e) !== null; }); });
  }
  function format(v) { return String(Math.round(v * 100) / 100); }
  function comparison(exam, subject, actual) {
    var complete = finalScore(exam,subject);
    if (actual == null || complete === null || Math.abs(complete - actual) > 0.000001) return '';
    var parts = [];
    [['class','班级均分'],['year','年级均分']].forEach(function (pair) {
      var avg = value(exam,subject,pair[0],false); if (avg === null) return;
      var d = Math.round((actual - avg) * 100) / 100;
      parts.push(d === 0 ? '持平' + pair[1] : (d > 0 ? '高于' : '低于') + pair[1] + ' ' + format(Math.abs(d)) + ' 分');
    });
    return parts.join(' · ');
  }
  window.ScoreAverages = {key:keyFor,basis:basis,value:value,series:series,comparison:comparison,format:format};

  var openBefore = openExam;
  openExam = function (exam) {
    var result = openBefore.apply(this,arguments), modal = state.modal;
    if (!modal || !modal.querySelector('#examSubjectsV16') || modal._averageDraft) return result;
    modal._averagesForExam = String(exam && exam.id || '');
    modal._averageOwner = state.token;
    modal._averageDraft = JSON.parse(JSON.stringify(exam && exam.averages || {}));
    function decorate(card,key,name,anchor) {
      var block = card.querySelector('.exam-averages');
      if (block && block.dataset.averageKey === key) return;
      if (block) block.remove();
      block = document.createElement('div'); block.className = 'exam-averages'; block.dataset.averageKey = key;
      ['class','year'].forEach(function (scope) {
        var label = document.createElement('label'); label.className = 'average-field';
        var title = document.createElement('span'); title.textContent = scope === 'class' ? '班级均分' : '年级均分'; label.appendChild(title);
        var input = document.createElement('input'); input.dataset.averageRow = key; input.dataset.averageScope = scope;
        input.type = 'number'; input.min = '0'; input.max = '99999'; input.step = '0.01'; input.inputMode = 'decimal'; input.placeholder = '选填 · 最终分';
        input.setAttribute('aria-label',name + title.textContent);
        var saved = modal._averageDraft[key]; input.value = saved && saved[scope] != null ? saved[scope] : '';
        input.oninput = function () { var draft = modal._averageDraft[key] || (modal._averageDraft[key] = {}); draft[scope] = input.value; input.removeAttribute('aria-invalid'); };
        label.appendChild(input); block.appendChild(label);
      });
      var score = card.querySelector(anchor);
      if (score) score.insertAdjacentElement('afterend',block); else card.appendChild(block);
    }
    function sync() {
      var total = modal.querySelector('.combo-total-v21');
      if (total) decorate(total,'total','总分','.score-total-preview-v13');
      modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
        var name = card.querySelector('.exam-subject-name-v10').value.trim();
        if (name) decorate(card,'s:' + name,name,'.score-compact-v14');
      });
      modal.querySelectorAll('.combo-card-v21').forEach(function (card) {
        var m = (state.modulesV18 || []).find(function (m) { return String(m.id) === card.dataset.comboId; });
        if (m) decorate(card,'m:' + m.id,m.name,'.combo-score-v21');
      });
    }
    sync();
    var observer = new MutationObserver(function () { if (!modal.isConnected) { observer.disconnect(); return; } sync(); });
    ['#examSubjectsV16','#comboListV21'].forEach(function (sel) { var el = modal.querySelector(sel); if (el) observer.observe(el,{childList:true,subtree:true}); });
    modal.addEventListener('input',function (e) { if (e.target.matches('.exam-subject-name-v10')) sync(); });
    return result;
  };
  var apiBefore = dataApiV7;
  dataApiV7 = function (action,payload) {
    var modal = state.modal;
    if (action === 'save_exam' && payload && payload.exam && modal && modal._averageDraft && modal._averagesForExam === String(payload.exam.id || '')) {
      if (modal._averageOwner !== state.token) throw new Error('账号已切换，请重新打开考试');
      var averages = {};
      modal.querySelectorAll('input[data-average-row]').forEach(function (input) {
        var raw = input.value.trim(); if (!raw && !input.validity.badInput) return;
        var n = number(raw);
        if (n === null || n < 0 || n > 99999 || !input.validity.valid) {
          input.setAttribute('aria-invalid','true'); input.focus(); throw new Error(input.getAttribute('aria-label') + '请输入 0～99999，最多两位小数');
        }
        var row = averages[input.dataset.averageRow] || (averages[input.dataset.averageRow] = {}); row[input.dataset.averageScope] = n;
      });
      payload = Object.assign({},payload,{exam:Object.assign({},payload.exam,{averages:averages})});
    }
    return apiBefore.call(this,action,payload);
  };
  var homeBefore = homeHtml;
  homeHtml = function () {
    var html = homeBefore.apply(this,arguments), extra = series();
    if (extra.length) html = html.replace(/(<div class="legend">)([\s\S]*?)(<\/div>)/,function (_,a,b,c) { return a + b + extra.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.label + '</span>'; }).join('') + c; });
    return html;
  };
  var metricBefore = latestMetricV20;
  latestMetricV20 = function () {
    var metric = metricBefore.apply(this,arguments); if (!metric) return metric;
    var subjects = effectiveScoreSubjectsV20(metric.exam), subject = subjects.length === 1 && number(metric.exam.total_actual_score) === null ? subjects[0] : '总分';
    return Object.assign({},metric,{comparison:comparison(metric.exam,subject,metric.value)});
  };
  var style = document.createElement('style');
  style.textContent = '.exam-averages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.average-field{display:grid;gap:5px;min-width:0;font-size:11px;color:var(--muted)}.average-field input{width:100%;min-width:0;box-sizing:border-box;min-height:38px;border:1px solid var(--input-line,var(--line));border-radius:10px;padding:9px 8px;background:var(--input-bg,#fff);color:var(--text);font:inherit;font-size:12px}.average-field input:focus-visible{outline:2px solid var(--focus,var(--accent));outline-offset:1px}.average-field [aria-invalid=true]{border-color:var(--danger)}.hero-average{font-size:11px;color:var(--muted);line-height:1.7}';
  document.head.appendChild(style);
})();
