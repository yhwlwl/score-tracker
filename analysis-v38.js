/* analysis-v38.js · 完整升级版分析页
 *
 * 目标：
 * - 简洁 / 详细两种阅读模式，共用一套筛选与计算口径。
 * - 保留趋势、雷达、象限、目标、排名、矩阵、深度模型等能力。
 * - 结论只描述数据支持的事实；样本不足、排名范围变化和缺失值就地说明。
 * - 不改动现有记录页与 API；复盘记录先保存在当前设备，避免新增数据库迁移。
 */
(function () {
  'use strict';

  if (window.__analysisV38) return;
  window.__analysisV38 = true;

  var PREVIOUS_RENDER = window.renderPage;
  var STORAGE_KEY = 'st_analysis_v38_';
  var SECTION_KEY = 'st_analysis_v38_sections_';
  var REVIEW_KEY = 'st_analysis_v38_reviews_';
  var observer = null;
  var observerBusy = false;

  function getState() {
    try { return state; } catch (e) { return window.state || null; }
  }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function round(v, digits) {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
    var p = Math.pow(10, digits == null ? 1 : digits);
    return Math.round(Number(v) * p) / p;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function median(values) {
    var a = (values || []).filter(function (v) { return Number.isFinite(Number(v)); })
      .map(Number).sort(function (a, b) { return a - b; });
    if (!a.length) return null;
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function track(name, meta) {
    try { if (typeof window.__stTrack === 'function') window.__stTrack(name, meta || {}); } catch (e) {}
  }
  function userKey() {
    var s = getState() || {};
    var u = s.user || {};
    return String(u.username || u.id || u.email || 'local').replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) || fallback) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function defaultConfig() {
    var saved = readJson(STORAGE_KEY + userKey(), {});
    return {
      view: saved.view === 'detail' ? 'detail' : 'simple',
      scope: saved.scope || '__all__',
      includeHidden: !!saved.includeHidden,
      range: saved.range || 'all',
      start: saved.start || '',
      end: saved.end || '',
      selectedIds: Array.isArray(saved.selectedIds) ? saved.selectedIds : null,
      metric: saved.metric || '',
      rankScope: saved.rankScope === 'class' ? 'class' : 'year',
      focus: saved.focus || '__total__',
      compareIds: Array.isArray(saved.compareIds) ? saved.compareIds : null
    };
  }
  function config() {
    var s = getState();
    if (!s) return defaultConfig();
    if (!s.analysisV38) s.analysisV38 = defaultConfig();
    return s.analysisV38;
  }
  function persistConfig() {
    var c = config();
    writeJson(STORAGE_KEY + userKey(), {
      view: c.view, scope: c.scope, includeHidden: !!c.includeHidden, range: c.range,
      start: c.start, end: c.end, selectedIds: c.selectedIds, metric: c.metric,
      rankScope: c.rankScope, focus: c.focus, compareIds: c.compareIds
    });
  }
  function setConfig(key, value) {
    var c = config();
    c[key] = value;
    persistConfig();
  }
  function sortExams(a, b) {
    var d = String(a.exam_date || '').localeCompare(String(b.exam_date || ''));
    return d || String(a.created_at || '').localeCompare(String(b.created_at || ''));
  }
  function rawExams() {
    var s = getState() || {};
    var source = Array.isArray(s.allExams) && s.allExams.length ? s.allExams : (s.exams || []);
    return source.slice().sort(sortExams);
  }
  function examId(exam) {
    return String(exam && (exam.id || ((exam.exam_date || '') + '|' + (exam.name || '') + '|' + (exam.created_at || ''))));
  }
  function dateText(v) {
    var s = String(v || '');
    return s.length > 10 ? s.slice(0, 10) : (s || '未标日期');
  }
  function shortName(v) {
    var s = String(v || '');
    return s.length > 10 ? s.slice(0, 9) + '…' : s;
  }
  function subjectsFor(exams) {
    var out = [];
    var seen = {};
    var s = getState() || {};
    (Array.isArray(s.subjectConfigs) ? s.subjectConfigs : []).forEach(function (item) {
      var name = typeof item === 'string' ? item : item && item.name;
      if (name && !seen[name]) { seen[name] = true; out.push(name); }
    });
    (exams || []).forEach(function (exam) {
      Object.keys(exam.scores || {}).forEach(function (name) {
        if (name && !seen[name]) { seen[name] = true; out.push(name); }
      });
    });
    return out;
  }
  function rowOf(exam, subject) {
    return (exam && exam.scores && exam.scores[subject]) || {};
  }
  function hasAnyScore(exam) {
    if (!exam) return false;
    if (num(exam.total_actual_score) !== null || num(exam.total_raw_score) !== null) return true;
    return Object.keys(exam.scores || {}).some(function (s) {
      var r = rowOf(exam, s);
      return num(r.actual) !== null || num(r.raw) !== null;
    });
  }
  function rowScore(row, basis) {
    if (!row) return null;
    if (basis === 'raw') return num(row.raw);
    return num(row.actual);
  }
  function rowMax(row, basis) {
    if (!row) return null;
    return num(basis === 'raw' ? (row.rawMax != null ? row.rawMax : row.max) : row.max);
  }
  function sumScore(exam, focus, basis) {
    var totalKey = basis === 'raw' ? 'total_raw_score' : 'total_actual_score';
    if (focus === '__total__') {
      var override = num(exam && exam[totalKey]);
      if (override !== null) return override;
    }
    var names = focus && focus.indexOf('__combo:') === 0 ? comboById(focus.slice(8)).subjects : null;
    if (focus && focus.indexOf('__sub:') === 0) {
      return rowScore(rowOf(exam, focus.slice(6)), basis);
    }
    var sum = null;
    Object.keys(exam && exam.scores || {}).forEach(function (subject) {
      if (names && names.indexOf(subject) < 0) return;
      var row = rowOf(exam, subject);
      if (row.excludeFromTotal) return;
      var value = rowScore(row, basis);
      if (value !== null) sum = sum === null ? value : sum + value;
    });
    return sum;
  }
  function sumMax(exam, focus, basis) {
    var names = focus && focus.indexOf('__combo:') === 0 ? comboById(focus.slice(8)).subjects : null;
    if (focus && focus.indexOf('__sub:') === 0) return rowMax(rowOf(exam, focus.slice(6)), basis);
    var sum = null;
    Object.keys(exam && exam.scores || {}).forEach(function (subject) {
      if (names && names.indexOf(subject) < 0) return;
      var row = rowOf(exam, subject);
      if (row.excludeFromTotal) return;
      var value = rowMax(row, basis);
      if (value !== null) sum = sum === null ? value : sum + value;
    });
    return sum;
  }
  function moduleRank(exam, id) {
    var mr = exam && exam.moduleRanks;
    if (mr && (mr[String(id)] || mr[id])) return mr[String(id)] || mr[id];
    try {
      var cache = readJson('st_moduleranks_v25_' + userKey(), {});
      var row = cache[(exam && exam.exam_date || '') + '|' + (exam && exam.name || '')];
      if (row && typeof row === 'object') return row;
    } catch (e) {}
    return null;
  }
  function comboById(id) {
    var s = getState() || {};
    var list = Array.isArray(s.modulesV18) ? s.modulesV18 : [];
    return list.filter(function (m) { return String(m && m.id) === String(id); })[0] || { id: id, name: '所选组合', subjects: [] };
  }
  function rankPercent(exam, focus, scope) {
    var rank = null, people = null, row = null;
    if (focus && focus.indexOf('__combo:') === 0) {
      var mr = moduleRank(exam, focus.slice(8));
      if (mr) {
        rank = num(scope === 'class' ? mr.classRank : mr.yearRank);
        people = num(scope === 'class' ? mr.classParticipants : mr.yearParticipants);
      }
      if (rank === null && scope === 'year') {
        rank = num(exam && exam.total_rank); people = num(exam && exam.total_participants);
      }
    } else if (focus && focus.indexOf('__sub:') === 0) {
      row = rowOf(exam, focus.slice(6));
      var explicitPercent = scope === 'class' ? row.classPositionPercent != null : row.yearPositionPercent != null;
      rank = num(scope === 'class' ? (explicitPercent ? row.classPositionPercent : row.classRank) :
        (explicitPercent ? row.yearPositionPercent : row.rank));
      people = num(scope === 'class' ? (explicitPercent ? null : row.classParticipants) :
        (explicitPercent ? null : row.participants));
      if (!explicitPercent && people === null) people = num(scope === 'class' ? exam && exam.total_class_participants : exam && exam.total_participants);
    } else {
      if (scope === 'class') {
        rank = num(exam && exam.total_class_position_percent != null ? exam.total_class_position_percent : exam && exam.total_class_rank);
        people = num(exam && exam.total_class_position_percent != null ? null : exam && exam.total_class_participants);
      } else {
        rank = num(exam && exam.total_year_position_percent != null ? exam.total_year_position_percent :
          exam && (exam.total_rank != null ? exam.total_rank : exam.year_rank));
        people = num(exam && exam.total_year_position_percent != null ? null :
          exam && (exam.total_participants != null ? exam.total_participants : exam.year_participants));
      }
    }
    if (rank === null) return null;
    if (people !== null) {
      if (rank < 1 || people < 1 || rank > people) return null;
      return round(clamp(rank / people * 100, 0, 100), 1);
    }
    return rank >= 0 && rank <= 100 ? round(rank, 1) : null;
  }
  function focusLabel(focus) {
    if (focus === '__total__') return '总分';
    if (focus && focus.indexOf('__sub:') === 0) return focus.slice(6);
    if (focus && focus.indexOf('__combo:') === 0) return comboById(focus.slice(8)).name || '组合';
    return '总分';
  }
  function focusSubjects(focus, subjects) {
    if (focus && focus.indexOf('__sub:') === 0) return [focus.slice(6)];
    if (focus && focus.indexOf('__combo:') === 0) return comboById(focus.slice(8)).subjects || [];
    return subjects || [];
  }
  function valueFor(exam, focus, metric, rankScope) {
    if (metric === 'rank_year' || metric === 'rank_class') return rankPercent(exam, focus, metric === 'rank_class' ? 'class' : 'year');
    var basis = metric === 'score_raw' ? 'raw' : 'final';
    var score = sumScore(exam, focus, basis);
    if (metric === 'rate') {
      var max = sumMax(exam, focus, basis);
      return score !== null && max ? round(clamp(score / max * 100, 0, 100), 1) : null;
    }
    return score;
  }
  function metricLabel(metric) {
    return metric === 'rank_year' ? '年级位比' :
      metric === 'rank_class' ? '班级位比' :
      metric === 'score_raw' ? '原始分' : metric === 'rate' ? '得分率' : '最终分';
  }
  function metricUnit(metric) {
    return metric === 'rank_year' || metric === 'rank_class' ? '位比' :
      metric === 'rate' ? '%' : '分';
  }
  function metricIsRank(metric) { return metric === 'rank_year' || metric === 'rank_class'; }
  function metricValueText(value, metric, exam, focus) {
    if (value === null || value === undefined) return '—';
    if (metricIsRank(metric)) return '前' + round(value, 1) + '%';
    if (metric === 'rate') return round(value, 1) + '%';
    var max = sumMax(exam || {}, focus || '__total__', metric === 'score_raw' ? 'raw' : 'final');
    return round(value, 1) + (max !== null ? ' / ' + round(max, 1) : ' 分');
  }
  function selectedBaseExams() {
    var c = config();
    var exams = rawExams().filter(function (exam) {
      if (!c.includeHidden && exam.is_hidden) return false;
      if (c.scope && c.scope !== '__all__') {
        if (c.scope === '__none__') { if (exam.grade_level) return false; }
        else if (exam.grade_level !== c.scope) return false;
      }
      return true;
    });
    if (c.start) exams = exams.filter(function (e) { return String(e.exam_date || '') >= c.start; });
    if (c.end) exams = exams.filter(function (e) { return String(e.exam_date || '') <= c.end; });
    if (c.range === 'recent5') exams = exams.slice(-5);
    if (c.range === 'recent10') exams = exams.slice(-10);
    if (c.range === 'custom' && Array.isArray(c.selectedIds)) {
      var set = {};
      c.selectedIds.forEach(function (id) { set[String(id)] = true; });
      exams = exams.filter(function (e) { return !!set[examId(e)]; });
    }
    return exams;
  }
  function allFilterExams() {
    var c = config();
    return rawExams().filter(function (exam) {
      if (!c.includeHidden && exam.is_hidden) return false;
      if (c.scope && c.scope !== '__all__') {
        if (c.scope === '__none__') return !exam.grade_level;
        return exam.grade_level === c.scope;
      }
      return true;
    });
  }
  function categories(exams) {
    var out = [], seen = {};
    (exams || []).forEach(function (e) {
      var value = e.grade_level || '__none__';
      if (!seen[value]) { seen[value] = true; out.push(value); }
    });
    return out;
  }
  function defaultMetric(exams, focus) {
    var rankScope = config().rankScope === 'class' ? 'class' : 'year';
    var rankCount = (exams || []).filter(function (e) { return rankPercent(e, focus, rankScope) !== null; }).length;
    if (rankCount) return rankScope === 'class' ? 'rank_class' : 'rank_year';
    var scoreCount = (exams || []).filter(function (e) { return valueFor(e, focus, 'score_final', 'year') !== null; }).length;
    return scoreCount ? 'score_final' : 'rate';
  }
  function getMetric() {
    var c = config();
    var exams = selectedBaseExams();
    var metric = c.metric || defaultMetric(exams, c.focus || '__total__');
    if (metricIsRank(metric) && !exams.some(function (e) { return valueFor(e, c.focus, metric, c.rankScope) !== null; })) {
      return defaultMetric(exams, c.focus || '__total__');
    }
    return metric;
  }
  function buildData() {
    var c = config();
    var exams = selectedBaseExams();
    var subjects = subjectsFor(exams.length ? exams : rawExams());
    var focus = c.focus || '__total__';
    var metric = getMetric();
    var latest = exams.length ? exams[exams.length - 1] : null;
    var records = exams.map(function (exam, index) {
      var value = valueFor(exam, focus, metric, c.rankScope);
      return { exam: exam, index: index, key: examId(exam), value: value,
        max: metric === 'score_raw' ? sumMax(exam, focus, 'raw') : metric === 'score_final' ? sumMax(exam, focus, 'final') : null,
        label: shortName(exam.name || ('第' + (index + 1) + '次')), date: exam.exam_date || '' };
    });
    var valid = records.filter(function (r) { return r.value !== null; });
    var yearRankCount = exams.filter(function (e) { return rankPercent(e, focus, 'year') !== null; }).length;
    var classRankCount = exams.filter(function (e) { return rankPercent(e, focus, 'class') !== null; }).length;
    var scoreCount = exams.filter(function (e) { return valueFor(e, focus, 'score_final', c.rankScope) !== null; }).length;
    return {
      exams: exams, allFilter: allFilterExams(), raw: rawExams(), subjects: subjects, focus: focus,
      focusLabel: focusLabel(focus), metric: metric, latest: latest, records: records, valid: valid,
      yearRankCount: yearRankCount, classRankCount: classRankCount, scoreCount: scoreCount,
      latestRecord: valid.length ? valid[valid.length - 1] : null,
      previousRecords: valid.length > 1 ? valid.slice(0, -1) : [],
      latestYearRank: latest ? rankPercent(latest, focus, 'year') : null,
      latestClassRank: latest ? rankPercent(latest, focus, 'class') : null
    };
  }
  function previousMedian(data, count) {
    var prev = data.previousRecords.slice(-(count || 3)).map(function (r) { return r.value; });
    return median(prev);
  }
  function improvement(data) {
    if (!data.latestRecord) return null;
    var previous = previousMedian(data, 3);
    if (previous === null) return null;
    return metricIsRank(data.metric) ? round(previous - data.latestRecord.value, 1) :
      round(data.latestRecord.value - previous, 1);
  }
  function directionText(data) {
    var delta = improvement(data);
    if (delta === null) return '有效记录不足，暂不判断变化方向。';
    if (Math.abs(delta) < 1) return '最近一次与此前几次的中位水平接近，暂不把它判为明显变化。';
    return (delta > 0 ? '最近一次相对此前几次中位水平有所改善' : '最近一次相对此前几次中位水平有所回落') +
      '（' + (metricIsRank(data.metric) ? Math.abs(delta) + ' 个百分点' : (delta > 0 ? '+' : '') + delta + (data.metric === 'rate' ? ' 个百分点' : ' 分')) + '）。';
  }
  function volatility(data) {
    var vals = data.valid.map(function (r) { return r.value; });
    if (vals.length < 3) return '有效记录少于 3 次，暂不判断波动大小。';
    var diffs = [];
    for (var i = 1; i < vals.length; i++) diffs.push(Math.abs(vals[i] - vals[i - 1]));
    var med = median(diffs);
    return '相邻变化的中位幅度约为 ' + round(med, 1) + (metricIsRank(data.metric) || data.metric === 'rate' ? ' 个百分点' : ' 分') + '；这是波动描述，不等于未来预测。';
  }
  function longGoalData() {
    try {
      var d = window.__v33 && window.__v33.state && window.__v33.state().data;
      return d || { subjects: {}, totalGoal: null };
    } catch (e) { return { subjects: {}, totalGoal: null }; }
  }
  function goalFor(focus) {
    var g = longGoalData(), value = null, label = focusLabel(focus);
    if (focus && focus.indexOf('__sub:') === 0) value = num((g.subjects || {})[focus.slice(6)]);
    else if (focus && focus.indexOf('__combo:') === 0) {
      var combo = comboById(focus.slice(8));
      var sum = 0, found = false;
      (combo.subjects || []).forEach(function (s) { var v = num((g.subjects || {})[s]); if (v !== null) { sum += v; found = true; } });
      value = found ? sum : null;
    } else value = num(g.totalGoal);
    if (value === null && focus === '__total__') {
      var total = 0, has = false;
      Object.keys(g.subjects || {}).forEach(function (s) { var v = num(g.subjects[s]); if (v !== null) { total += v; has = true; } });
      value = has ? total : null;
    }
    return { value: value, label: label, unit: '最终分' };
  }
  function goalProgress(data, focus) {
    var goal = goalFor(focus), attempted = 0, reached = 0;
    data.exams.forEach(function (exam) {
      var actual = valueFor(exam, focus, 'score_final', data.rankScope);
      var target = null;
      if (focus && focus.indexOf('__sub:') === 0) target = num(rowOf(exam, focus.slice(6)).target);
      else if (focus === '__total__') target = num(exam.total_target_score);
      if (target === null) target = goal.value;
      if (actual !== null && target !== null) { attempted++; if (actual >= target) reached++; }
    });
    var current = data.latest ? valueFor(data.latest, focus, 'score_final', data.rankScope) : null;
    return { goal: goal, current: current, attempted: attempted, reached: reached };
  }
  function isAbsent(row) {
    if (!row) return false;
    if (row.absent === true || row.is_absent === true || row.isAbsent === true) return true;
    var status = String(row.status || row.result_status || '').toLowerCase();
    return status === 'absent' || status === '缺考';
  }
  function isExamAbsent(exam) {
    if (!exam) return false;
    if (exam.absent === true || exam.is_absent === true || exam.isAbsent === true) return true;
    var status = String(exam.status || exam.result_status || '').toLowerCase();
    if (status === 'absent' || status === '缺考') return true;
    return Object.keys(exam.scores || {}).some(function (subject) { return isAbsent(rowOf(exam, subject)); });
  }
  function quality(data) {
    var missingTotal = data.exams.filter(function (e) { return !hasAnyScore(e) && !isExamAbsent(e); });
    var absent = 0, partial = 0, noRank = 0, hidden = 0, poolChanges = 0;
    var rankScope = config().rankScope === 'class' ? 'class' : 'year';
    data.exams.forEach(function (e, i) {
      if (e.is_hidden) hidden++;
      var rows = Object.keys(e.scores || {}).map(function (s) { return rowOf(e, s); });
      if (isExamAbsent(e)) absent++;
      var subjectCount = data.subjects.length;
      var filled = rows.filter(function (r) { return rowScore(r, 'final') !== null; }).length;
      var presentSubjects = Object.keys(e.scores || {}).filter(function (subject) { return data.subjects.indexOf(subject) >= 0; });
      if (presentSubjects.length && filled > 0 && filled < presentSubjects.length) partial++;
      if (rankPercent(e, data.focus, rankScope) === null) noRank++;
      if (i > 0) {
        var a = rankParticipants(data.exams[i - 1], data.focus, 'year');
        var b = rankParticipants(e, data.focus, 'year');
        if (a && b && Math.abs(a - b) / Math.max(a, b) >= 0.3) poolChanges++;
      }
    });
    return {
      missingTotal: missingTotal, absent: absent, partial: partial, noRank: noRank,
      hidden: hidden, poolChanges: poolChanges,
      validRank: data.yearRankCount, validClass: data.classRankCount,
      rankScope: rankScope,
      scoreCount: data.scoreCount
    };
  }
  function rankParticipants(exam, focus, scope) {
    var row, mr, value = null;
    if (focus && focus.indexOf('__combo:') === 0) {
      mr = moduleRank(exam, focus.slice(8));
      if (mr) value = num(scope === 'class' ? mr.classParticipants : mr.yearParticipants);
      if (value === null && scope === 'year') value = num(exam.total_participants);
      return value;
    }
    if (focus && focus.indexOf('__sub:') === 0) {
      row = rowOf(exam, focus.slice(6));
      value = num(scope === 'class' ? row.classParticipants : row.participants);
      if (value === null) value = num(scope === 'class' ? (exam && exam.total_class_participants) : (exam && exam.total_participants));
      return value;
    }
    return num(scope === 'class' ? (exam && exam.total_class_participants) : (exam && exam.total_participants));
  }
  function seriesFor(exams, focus, metric, rankScope) {
    return (exams || []).map(function (exam, index) {
      var value = valueFor(exam, focus, metric, rankScope);
      var plot = metricIsRank(metric) && value !== null ? 100 - value : value;
      return { exam: exam, index: index, key: examId(exam), value: value, plot: plot, label: shortName(exam.name || ('第' + (index + 1) + '次')), date: exam.exam_date || '' };
    });
  }
  function targetSeries(exams, focus, metric, rankScope) {
    if (metricIsRank(metric) || metric === 'score_raw') return [];
    var goal = goalFor(focus).value;
    return (exams || []).map(function (exam) {
      var target = null;
      if (focus && focus.indexOf('__sub:') === 0) target = num(rowOf(exam, focus.slice(6)).target);
      else if (focus === '__total__') target = num(exam.total_target_score);
      if (target === null) target = goal;
      if (target === null) return null;
      if (metric === 'rate') {
        var max = sumMax(exam, focus, 'final');
        return max ? round(target / max * 100, 1) : null;
      }
      return target;
    });
  }
  function lineChart(exams, focus, metric, rankScope, compact) {
    var series = seriesFor(exams, focus, metric, rankScope);
    var values = series.map(function (x) { return x.plot; });
    var labels = series.map(function (x) { return x.label; });
    var valid = values.some(function (x) { return x !== null; });
    if (!valid) return '<div class="a38-empty">当前范围没有可用于“' + esc(metricLabel(metric)) + '”的记录。</div>';
    var lines = [{ vals: values, color: 'var(--accent,#5d72e8)' }];
    var target = targetSeries(exams, focus, metric, rankScope), scaleMismatch = false;
    if (metric === 'score_final') {
      var scales = exams.map(function (exam) { return sumMax(exam, focus, 'final'); }).filter(function (v) { return v !== null; });
      var uniqueScales = scales.filter(function (v, i) { return scales.indexOf(v) === i; });
      scaleMismatch = uniqueScales.length > 1;
      if (scaleMismatch) target = [];
    }
    if (target.some(function (x) { return x !== null; })) {
      lines.push({ vals: target.map(function (x) { return metricIsRank(metric) ? null : x; }), color: 'var(--green,#32a77a)', dash: true });
    }
    var v32 = window.__v32 || {};
    if (typeof v32.lineSvg !== 'function') return '<div class="a38-empty">图表暂不可用，请查看下方数据表。</div>';
    var svg = v32.lineSvg(lines, labels, {
      unit: metricUnit(metric),
      tickLabel: function (v) {
        if (metricIsRank(metric)) return '前' + round(clamp(100 - v, 0, 100), 0) + '%';
        return round(v, 0) + (metric === 'rate' ? '%' : '分');
      }
    });
    var missing = series.filter(function (x) { return x.value === null; }).length;
    return '<div class="a38-chart-scroll">' + svg + '</div>' +
      '<div class="a38-chart-legend"><span><i class="a38-dot actual"></i>实际值</span>' +
      (target.some(function (x) { return x !== null; }) ? '<span><i class="a38-dot target"></i>目标线</span>' : '') +
      (scaleMismatch ? '<span class="a38-muted">满分口径变化，目标线已隐藏</span>' : '') +
      (missing ? '<span class="a38-muted">缺少 ' + missing + ' 个点，图线断开，不按 0 处理</span>' : '') + '</div>';
  }
  function deltaChart(data) {
    var values = data.valid;
    if (values.length < 2) return '<div class="a38-empty">至少需要 2 次有效记录才能查看相邻变化。</div>';
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var delta = metricIsRank(data.metric) ? values[i - 1].value - values[i].value : values[i].value - values[i - 1].value;
      rows.push({ label: values[i].label, delta: round(delta, 1) });
    }
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.delta); }).concat([1]));
    return '<div class="a38-delta-list">' + rows.slice(-8).map(function (r) {
      var width = Math.round(Math.abs(r.delta) / max * 100);
      var positive = r.delta >= 0;
      return '<div class="a38-delta-row"><span>' + esc(r.label) + '</span><div class="a38-delta-track"><i class="' +
        (positive ? 'positive' : 'negative') + '" style="width:' + width + '%"></i></div><b class="' +
        (positive ? 'positive' : 'negative') + '">' + (r.delta > 0 ? '+' : '') + r.delta +
        (data.metric === 'rate' ? 'pp' : metricIsRank(data.metric) ? 'pp' : '分') + '</b></div>';
    }).join('') + '</div>';
  }
  function subjectRows(data) {
    var exam = data.latest, rows = [];
    if (!exam) return rows;
    data.subjects.forEach(function (subject) {
      var focus = '__sub:' + subject;
      var pos = rankPercent(exam, focus, data.rankScope);
      var rate = valueFor(exam, focus, 'rate', data.rankScope);
      var score = valueFor(exam, focus, data.metric, data.rankScope);
      var rankRecords = data.exams.map(function (e) { return rankPercent(e, focus, data.rankScope); }).filter(function (v) { return v !== null; });
      var current = data.metric === 'rate' ? rate : metricIsRank(data.metric) ? pos : score;
      var prior = rankRecords.length > 1 ? median(rankRecords.slice(0, -1).slice(-3)) : null;
      var change = pos !== null && prior !== null ? round(prior - pos, 1) : null;
      rows.push({ subject: subject, pos: pos, rate: rate, score: score, current: current, change: change, n: rankRecords.length });
    });
    return rows;
  }
  function barChart(rows, mode) {
    var valid = rows.filter(function (r) { return r.current !== null; });
    if (!valid.length) return '<div class="a38-empty">最新一场没有完整的同场科目数据。</div>';
    return '<div class="a38-bars">' + valid.map(function (r) {
      var width = mode === 'rank' ? clamp(100 - r.current, 3, 100) : clamp(mode === 'rate' ? r.current : (r.score / (r.max || 100) * 100), 3, 100);
      var text = mode === 'rank' ? '前' + round(r.current, 1) + '%' : mode === 'rate' ? round(r.current, 1) + '%' : round(r.score, 1) + '分';
      var tone = mode === 'rank' ? (r.current <= 20 ? 'good' : r.current <= 50 ? 'mid' : 'watch') : '';
      return '<div class="a38-bar-row"><span>' + esc(r.subject) + '</span><div><i class="' + tone + '" style="width:' + width + '%"></i></div><b>' + text + '</b></div>';
    }).join('') + '</div>';
  }
  function radarChart(data) {
    var exam = data.latest;
    if (!exam) return '<div class="a38-empty">还没有最新考试。</div>';
    var values = data.subjects.map(function (subject) {
      var focus = '__sub:' + subject;
      var p = rankPercent(exam, focus, data.rankScope);
      var rate = valueFor(exam, focus, 'rate', data.rankScope);
      return { subject: subject, value: p !== null ? (100 - p) : rate, label: p !== null ? '前' + round(p, 1) + '%' : (rate === null ? '—' : round(rate, 1) + '%') };
    }).filter(function (x) { return x.value !== null; });
    if (values.length < 3) return '<div class="a38-empty">至少需要 3 个科目的同场数据才能绘制雷达图。</div>';
    var W = 340, H = 290, cx = 170, cy = 132, radius = 90, n = values.length;
    function point(r, i) {
      var angle = -Math.PI / 2 + i * Math.PI * 2 / n;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }
    var rings = '';
    [0.25, 0.5, 0.75, 1].forEach(function (scale) {
      var pts = values.map(function (_, i) { var p = point(radius * scale, i); return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      rings += '<polygon points="' + pts + '" fill="none" stroke="var(--line,#e8ebf0)" />'; 
    });
    var axes = '', labels = '';
    values.forEach(function (item, i) {
      var outer = point(radius, i), label = point(radius + 19, i);
      axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + outer.x.toFixed(1) + '" y2="' + outer.y.toFixed(1) + '" stroke="var(--line,#e8ebf0)" />';
      labels += '<text x="' + label.x.toFixed(1) + '" y="' + (label.y + 3).toFixed(1) + '" text-anchor="middle" font-size="10" fill="var(--muted,#788392)">' + esc(item.subject) + '</text>';
    });
    var poly = values.map(function (item, i) {
      var p = point(radius * clamp(item.value / 100, 0.03, 1), i);
      return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
    var dots = values.map(function (item, i) {
      var p = point(radius * clamp(item.value / 100, 0.03, 1), i);
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.5" fill="var(--accent,#5d72e8)" />';
    }).join('');
    return '<div class="a38-radar-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="同场科目结构雷达图">' +
      rings + axes + '<polygon points="' + poly + '" fill="var(--accent-soft,#eef1ff)" stroke="var(--accent,#5d72e8)" stroke-width="2" />' + dots + labels +
      '</svg><p class="a38-caption">同一场考试内比较；若图中使用得分率，不代表不同科目的试卷难度相同。</p></div>';
  }
  function quadrant(data) {
    var exam = data.latest, rows = subjectRows(data).filter(function (r) { return r.pos !== null && r.change !== null; });
    if (!exam || rows.length < 2) return '<div class="a38-empty">至少需要 2 个科目各有 2 次年级排名，才能判断“当前位置 × 近期变化”。</div>';
    var W = 520, H = 280, L = 48, R = 18, T = 20, B = 40;
    var xMax = Math.max(5, Math.max.apply(null, rows.map(function (r) { return Math.abs(r.change); })));
    var x0 = L + (W - L - R) / 2;
    var yMin = Math.min.apply(null, rows.map(function (r) { return r.pos; })), yMax = Math.max.apply(null, rows.map(function (r) { return r.pos; }));
    yMin = clamp(yMin - 8, 0, 80); yMax = clamp(yMax + 8, 20, 100);
    function x(v) { return L + (v + xMax) / (xMax * 2) * (W - L - R); }
    function y(v) { return T + (v - yMin) / Math.max(1, yMax - yMin) * (H - T - B); }
    var s = '<line x1="' + x0 + '" y1="' + T + '" x2="' + x0 + '" y2="' + (H - B) + '" stroke="var(--line,#e8ebf0)" stroke-dasharray="4 3" />' +
      '<line x1="' + L + '" y1="' + y(50) + '" x2="' + (W - R) + '" y2="' + y(50) + '" stroke="var(--line,#e8ebf0)" stroke-dasharray="4 3" />' +
      '<text x="' + L + '" y="' + (H - 10) + '" font-size="10" fill="var(--muted,#788392)">近期回落 ←</text>' +
      '<text x="' + (W - R) + '" y="' + (H - 10) + '" text-anchor="end" font-size="10" fill="var(--muted,#788392)">近期改善 →</text>' +
      '<text x="' + (L - 6) + '" y="' + (T + 4) + '" text-anchor="end" font-size="9" fill="var(--muted,#788392)">前' + round(yMin, 0) + '%</text>' +
      '<text x="' + (L - 6) + '" y="' + (H - B) + '" text-anchor="end" font-size="9" fill="var(--muted,#788392)">前' + round(yMax, 0) + '%</text>';
    rows.forEach(function (r) {
      var px = x(r.change), py = y(r.pos);
      s += '<g class="a38-q-point"><circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="11" fill="transparent" />' +
        '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" fill="var(--panel-solid,#fff)" stroke="var(--accent,#5d72e8)" stroke-width="2" />' +
        '<text x="' + px.toFixed(1) + '" y="' + (py - 9).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text,#18212f)">' + esc(r.subject) + '</text></g>';
    });
    return '<div class="a38-chart-scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;min-width:500px;height:auto">' + s + '</svg></div>' +
      '<p class="a38-caption">横轴为近期位比改善/回落的百分点，纵轴为本次年级位比（越靠上越好）。这里只表示变化组合，不表示提分优先级。</p>';
  }
  function goalRows(data) {
    var g = longGoalData(), rows = [];
    data.subjects.forEach(function (subject) {
      var focus = '__sub:' + subject, goal = num((g.subjects || {})[subject]), current = data.latest ? valueFor(data.latest, focus, 'score_final', data.rankScope) : null;
      var attempts = 0, hit = 0;
      data.exams.forEach(function (e) {
        var a = valueFor(e, focus, 'score_final', data.rankScope), t = num(rowOf(e, subject).target);
        if (t === null) t = goal;
        if (a !== null && t !== null) { attempts++; if (a >= t) hit++; }
      });
      if (goal !== null || current !== null || attempts) rows.push({ subject: subject, goal: goal, current: current, attempts: attempts, hit: hit });
    });
    return rows;
  }
  function goalBar(row) {
    if (row.goal === null && row.current === null) return '';
    var width = row.goal !== null && row.current !== null ? clamp(row.current / Math.max(row.goal, 1) * 100, 0, 125) : 0;
    return '<div class="a38-goal-row"><div class="a38-goal-head"><b>' + esc(row.subject) + '</b><span>' +
      (row.current === null ? '暂无当前最终分' : round(row.current, 1) + (row.goal === null ? ' 分' : ' / ' + round(row.goal, 1) + ' 分')) +
      '</span></div><div class="a38-goal-track"><i style="width:' + Math.min(width, 100) + '%"></i>' +
      (row.goal !== null ? '<em style="left:' + clamp(row.goal / Math.max(row.goal, row.current || row.goal) * 100, 0, 100) + '%"></em>' : '') +
      '</div><small>' + (row.goal === null ? '未设置长期目标' : (row.current === null ? '目标单位：最终分' :
        (row.current >= row.goal ? '已达到目标' : '还差 ' + round(row.goal - row.current, 1) + ' 分')) + ' · 最近 ' + row.attempts + ' 次中达成 ' + row.hit + ' 次') + '</small></div>';
  }
  function compareIds(data) {
    var c = config(), available = data.exams.map(examId);
    var chosen = Array.isArray(c.compareIds) ? c.compareIds.filter(function (id) { return available.indexOf(String(id)) >= 0; }) : [];
    if (chosen.length < 2) chosen = data.exams.slice(-2).map(examId);
    return chosen;
  }
  function compareData(data) {
    var ids = compareIds(data), exams = ids.map(function (id) { return data.exams.filter(function (e) { return examId(e) === String(id); })[0]; }).filter(Boolean);
    return { ids: ids, exams: exams };
  }
  function contributionChart(data, from, to) {
    if ((data.metric !== 'score_final' && data.metric !== 'score_raw') || data.focus !== '__total__') return '';
    var basis = data.metric === 'score_raw' ? 'raw' : 'final', rows = [], sumA = 0, sumB = 0;
    if (sumMax(from, '__total__', basis) === null || sumMax(to, '__total__', basis) === null ||
      Math.abs(sumMax(from, '__total__', basis) - sumMax(to, '__total__', basis)) > 1e-9) return '';
    for (var i = 0; i < data.subjects.length; i++) {
      var subject = data.subjects[i], aRow = rowOf(from, subject), bRow = rowOf(to, subject);
      if (aRow.excludeFromTotal || bRow.excludeFromTotal) return '';
      var a = rowScore(aRow, basis), b = rowScore(bRow, basis), aMax = rowMax(aRow, basis), bMax = rowMax(bRow, basis);
      if (a === null || b === null || aMax === null || bMax === null || Math.abs(aMax - bMax) > 1e-9) return '';
      rows.push({ subject: subject, delta: round(b - a, 1) }); sumA += a; sumB += b;
    }
    var totalA = valueFor(from, '__total__', data.metric, data.rankScope), totalB = valueFor(to, '__total__', data.metric, data.rankScope);
    if (rows.length < 2 || totalA === null || totalB === null || Math.abs(totalA - sumA) > 1e-9 || Math.abs(totalB - sumB) > 1e-9) return '';
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.delta); }).concat([1]));
    return '<div class="a38-contribution"><b>总分变化贡献 · 数值构成</b><p class="a38-caption">仅在科目集合、计分口径、满分和数据完整时显示。这里解释分数变化来自哪些科目，不表示原因或能力提升比例。</p>' +
      rows.map(function (r) {
        return '<div class="a38-contribution-row"><span>' + esc(r.subject) + '</span><div><i class="' + (r.delta >= 0 ? 'positive' : 'negative') + '" style="width:' + Math.round(Math.abs(r.delta) / max * 100) + '%"></i></div><b class="' + (r.delta >= 0 ? 'positive' : 'negative') + '">' + (r.delta > 0 ? '+' : '') + r.delta + '分</b></div>';
      }).join('') + '</div>';
  }
  function compareTable(data) {
    var cmp = compareData(data);
    if (cmp.exams.length < 2) return '<div class="a38-empty">选择至少 2 次考试后查看对比。</div>';
    var from = cmp.exams[cmp.exams.length - 2], to = cmp.exams[cmp.exams.length - 1], rows = [];
    var subjects = data.subjects.slice();
    subjects.unshift('__focus__');
    subjects.forEach(function (subject) {
      var focus = subject === '__focus__' ? data.focus : '__sub:' + subject;
      var a = valueFor(from, focus, data.metric, data.rankScope), b = valueFor(to, focus, data.metric, data.rankScope);
      if (a === null && b === null) return;
      var delta = a !== null && b !== null ? (metricIsRank(data.metric) ? a - b : b - a) : null;
      rows.push({ label: subject === '__focus__' ? data.focusLabel : subject, focus: focus, a: a, b: b, delta: delta });
    });
    return '<div class="a38-compare-meta">默认比较：' + esc(shortName(from.name)) + ' → ' + esc(shortName(to.name)) +
      ' · 切换图表或指标时保留选择</div><div class="a38-scroll"><table class="a38-table"><thead><tr><th>项目</th><th>' + esc(shortName(from.name)) +
      '</th><th>' + esc(shortName(to.name)) + '</th><th>变化</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td><td>' + (r.a === null ? '—' : metricValueText(r.a, data.metric, from, r.focus)) +
          '</td><td>' + (r.b === null ? '—' : metricValueText(r.b, data.metric, to, r.focus)) + '</td><td class="' +
          (r.delta === null ? '' : r.delta >= 0 ? 'a38-positive' : 'a38-negative') + '">' +
          (r.delta === null ? '—' : (r.delta > 0 ? '+' : '') + round(r.delta, 1) + (metricIsRank(data.metric) || data.metric === 'rate' ? 'pp' : '分')) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + contributionChart(data, from, to) + '<p class="a38-caption">变化分解只说明数值从哪些科目变化而来，不解释原因，也不代表能力提升比例。</p>';
  }
  function compareChooser(data) {
    var ids = compareIds(data);
    return '<div class="a38-compare-chooser"><span>对比考试：</span>' + data.exams.map(function (exam) {
      var on = ids.indexOf(examId(exam)) >= 0;
      return '<button type="button" class="a38-pill ' + (on ? 'active' : '') + '" data-a38-compare="' + esc(examId(exam)) + '">' +
        esc(shortName(exam.name || dateText(exam.exam_date))) + '</button>';
    }).join('') + '</div>';
  }
  function history(data) {
    var valid = data.valid.slice();
    if (data.metric === 'score_final' || data.metric === 'score_raw') {
      var currentMax = data.latestRecord && data.latestRecord.max;
      if (currentMax !== null && currentMax !== undefined) {
        valid = valid.filter(function (r) { return r.max !== null && r.max !== undefined && Math.abs(r.max - currentMax) < 1e-9; });
      } else {
        valid = [];
      }
    }
    if (metricIsRank(data.metric)) {
      var bins = [{ label: '前10%', a: 0, b: 10 }, { label: '前10–20%', a: 10, b: 20 }, { label: '前20–30%', a: 20, b: 30 },
        { label: '前30–50%', a: 30, b: 50 }, { label: '50%之后', a: 50, b: 101 }];
      var counts = bins.map(function (bin) { return { label: bin.label, count: valid.filter(function (r) { return r.value > bin.a && r.value <= bin.b; }).length }; });
    } else {
      var nums = valid.map(function (r) { return r.value; }), lo = nums.length ? Math.min.apply(null, nums) : 0, hi = nums.length ? Math.max.apply(null, nums) : 1;
      var step = (hi - lo) / 5 || 1;
      var counts = [0, 1, 2, 3, 4].map(function (i) {
        var a = lo + i * step, b = i === 4 ? hi + 0.001 : lo + (i + 1) * step;
        return { label: round(a, 1) + '–' + round(b, 1), count: valid.filter(function (r) { return r.value >= a && r.value < b; }).length };
      });
    }
    var max = Math.max.apply(null, counts.map(function (x) { return x.count; }).concat([1]));
    var best = valid.length ? valid.slice().sort(function (a, b) { return metricIsRank(data.metric) ? a.value - b.value : b.value - a.value; })[0] : null;
    var current = valid.length ? valid[valid.length - 1] : null;
    var bestRun = 0, run = 0, bestEnd = -1;
    for (var ri = 1; ri < valid.length; ri++) {
      var step = metricIsRank(data.metric) ? valid[ri - 1].value - valid[ri].value : valid[ri].value - valid[ri - 1].value;
      if (step > 0) { run++; if (run > bestRun) { bestRun = run; bestEnd = ri; } } else run = 0;
    }
    var streak = bestRun >= 2 ? '连续改善：' + bestRun + ' 次变化（' + shortName(valid[bestEnd - bestRun].exam.name) + ' → ' + shortName(valid[bestEnd].exam.name) + '）' :
      '连续改善：当前范围没有至少两次的连续段';
    return '<div class="a38-history-summary"><div><b>' + valid.length + '</b><span>同口径有效记录</span></div><div><b>' +
      (best ? metricValueText(best.value, data.metric, best.exam, data.focus) : '—') + '</b><span>个人最好</span></div><div><b>' +
      (current ? metricValueText(current.value, data.metric, current.exam, data.focus) : '—') + '</b><span>当前同口径最新</span></div></div>' +
      '<div class="a38-histogram">' + counts.map(function (x) {
        return '<div><i style="height:' + Math.max(4, Math.round(x.count / max * 100)) + '%"></i><span>' + esc(x.label) + '</span><b>' + x.count + '</b></div>';
      }).join('') + '</div><div class="a38-history-record">' + esc(streak) + '</div><p class="a38-caption">' + (metricIsRank(data.metric) ? '这里比较的是你自己的历史位比，不是全体同学的分布。' :
      '原始分 / 最终分只在同一计分口径与相同满分的记录中比较；不同满分不会共用同一热力尺度。') + '</p>' +
      (best ? '<button type="button" class="a38-link" data-a38-focus-exam="' + esc(best.key) + '">定位个人最好：' + esc(shortName(best.exam.name)) + '</button>' : '');
  }
  function matrix(data) {
    var metric = data.metric, subjects = data.subjects, rows = data.exams.map(function (exam) {
      var cells = subjects.map(function (subject) {
        var val = valueFor(exam, '__sub:' + subject, metric, data.rankScope);
        var max = metric === 'score_raw' ? sumMax(exam, '__sub:' + subject, 'raw') : sumMax(exam, '__sub:' + subject, 'final');
        var ratio = val !== null ? (metric === 'rate' ? clamp(val / 100, 0, 1) : max ? clamp(val / max, 0, 1) : null) : null;
        var heatValue = metricIsRank(metric) ? (val === null ? null : clamp(1 - val / 100, 0, 1)) : ratio;
        var heat = heatValue !== null ? ' style="--heat:' + Math.round(heatValue * 100) + '%"' : '';
        var cellClass = val === null ? 'missing' : metricIsRank(metric) ? 'rank-cell' : metric === 'rate' ? 'rate-cell' : 'score-cell';
        if (val !== null && ratio !== null && ratio < 0.6) cellClass += ' low-cell';
        return '<td class="' + cellClass + '"' + heat + '>' +
          (val === null ? '—' : metricValueText(val, metric, exam, '__sub:' + subject)) + '</td>';
      }).join('');
      var total = valueFor(exam, data.focus, metric, data.rankScope);
      return '<tr data-a38-matrix-row="' + esc(examId(exam)) + '"><th>' + esc(shortName(exam.name || dateText(exam.exam_date))) +
        '<small>' + esc(dateText(exam.exam_date)) + '</small></th>' + cells + '<td class="focus-cell">' +
        (total === null ? '—' : metricValueText(total, metric, exam, data.focus)) + '</td></tr>';
    }).join('');
    if (!rows) return '<div class="a38-empty">当前范围没有可展示的记录。</div>';
    return '<div class="a38-matrix-scroll"><table class="a38-table a38-matrix"><thead><tr><th>考试</th>' +
      subjects.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '<th>' + esc(data.focusLabel) +
      '</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="a38-caption">' +
      (metricIsRank(metric) ? '颜色越深代表位比更靠前；位比统一为 0–100%，越小越好。' :
        metric === 'rate' ? '颜色越深代表得分率更高，不把不同科目的得分率直接解释为试卷难度或薄弱程度。' :
          '分数颜色只按该科该场的满分换算，不跨不同满分共用刻度；低分单元格另作提示，缺失值不会补成 0。') + '</p>';
  }
  function rankChart(data, scope) {
    var series = seriesFor(data.exams, data.focus, scope === 'class' ? 'rank_class' : 'rank_year', data.rankScope);
    if (!series.some(function (x) { return x.value !== null; })) return '<div class="a38-empty">当前范围没有完整的' + (scope === 'class' ? '班级' : '年级') + '排名。</div>';
    var v32 = window.__v32 || {};
    var svg = typeof v32.lineSvg === 'function' ? v32.lineSvg([{ vals: series.map(function (x) { return x.plot; }), color: scope === 'class' ? 'var(--green,#32a77a)' : 'var(--accent,#5d72e8)' }],
      series.map(function (x) { return x.label; }), { tickLabel: function (v) { return '前' + round(clamp(100 - v, 0, 100), 0) + '%'; } }) : '';
    return '<div class="a38-chart-scroll">' + svg + '</div><div class="a38-chart-legend"><span><i class="a38-dot ' +
      (scope === 'class' ? 'class' : 'actual') + '"></i>' + (scope === 'class' ? '班级位比' : '年级位比') + '</span></div>';
  }
  function rankCountsTable(data) {
    var rows = data.exams.slice(-8).map(function (exam) {
      var year = rankParticipants(exam, data.focus, 'year'), cls = rankParticipants(exam, data.focus, 'class');
      return '<tr><td>' + esc(shortName(exam.name || dateText(exam.exam_date))) + '<small>' + esc(dateText(exam.exam_date)) + '</small></td><td>' +
        (year === null ? '—' : year) + '</td><td>' + (cls === null ? '—' : cls) + '</td></tr>';
    }).filter(function (row) { return row.indexOf('<td>—</td><td>—</td>') < 0; }).join('');
    if (!rows) return '<div class="a38-empty">当前范围没有可用的参考人数记录。</div>';
    return '<div class="a38-subsection"><b>参考人数变化</b><div class="a38-scroll"><table class="a38-table"><thead><tr><th>考试</th><th>年级人数</th><th>班级人数</th></tr></thead><tbody>' + rows +
      '</tbody></table></div><p class="a38-caption">人数变化会影响位比的可比性；本表只展示每场记录的参考池，不据此推断群体强弱。</p></div>';
  }
  function systemInsights(data) {
    var out = [], vals = data.valid.map(function (r) { return r.value; });
    if (vals.length >= 3 && metricIsRank(data.metric)) {
      var tail = vals.slice(-3), declining = tail[1] > tail[0] && tail[2] > tail[1], improving = tail[1] < tail[0] && tail[2] < tail[1];
      if (declining) out.push({ tone: 'warn', title: '最近 3 次位比连续变大', body: '这是连续变化事实；是否与试卷、范围或发挥有关，需要结合考试记录复盘。' });
      if (improving) out.push({ tone: 'good', title: '最近 3 次位比连续变小', body: '连续改善出现在当前选择范围内；不把它自动解释成某个原因。' });
    }
    var q = quality(data);
    if (q.missingTotal.length) out.push({ tone: 'info', title: '有 ' + q.missingTotal.length + ' 场没有可用成绩', body: '这些场次不按 0 分进入总分或得分率；缺考只有在记录里明确标记时才单独计数。' });
    var goal = goalProgress(data, data.focus);
    if (goal.goal.value !== null && goal.current !== null && goal.current < goal.goal.value) {
      var gap = goal.goal.value - goal.current;
      if (gap <= Math.max(5, goal.goal.value * 0.05)) out.push({ tone: 'info', title: '当前接近目标', body: '还差 ' + round(gap, 1) + ' 分；这是距离描述，不代表下一次一定能达到。' });
    }
    if (q.poolChanges) out.push({ tone: 'warn', title: '有 ' + q.poolChanges + ' 处参考人数变化较大', body: '这些相邻场次的位比不宜直接当作同一竞争池内的进退。' });
    if (!out.length) out.push({ tone: 'neutral', title: '当前没有足够证据生成强提醒', body: '先继续记录同一口径的考试，页面会在样本充分时补充事实性提示。' });
    return out;
  }
  function reviews() { return readJson(REVIEW_KEY + userKey(), []); }
  function saveReviews(list) { writeJson(REVIEW_KEY + userKey(), list.slice(-50)); }
  function reviewForm(data) {
    return '<div class="a38-review-form" data-a38-review-form hidden><label>关联考试<select class="a38-review-exam">' +
      data.exams.map(function (e) { return '<option value="' + esc(examId(e)) + '">' + esc(e.name || dateText(e.exam_date)) + '</option>'; }).join('') +
      '</select></label><label>我观察到的失分 / 变化<textarea class="a38-review-note" rows="3" placeholder="例如：英语阅读第二篇时间不够"></textarea></label>' +
      '<label>我的下一步计划<textarea class="a38-review-plan" rows="3" placeholder="例如：下次先做完阅读再检查"></textarea></label>' +
      '<div class="a38-form-actions"><button type="button" class="a38-button primary" data-a38-review-save>保存复盘</button><button type="button" class="a38-button" data-a38-review-cancel>取消</button></div></div>';
  }
  function reviewList(data) {
    var list = reviews().slice().reverse();
    if (!list.length) return '<p class="a38-muted">还没有复盘记录。系统发现与我的计划会分开显示。</p>';
    return '<div class="a38-review-list">' + list.slice(0, 6).map(function (item) {
      var exam = data.raw.filter(function (e) { return examId(e) === String(item.examId); })[0];
      return '<article><div class="a38-review-head"><b>' + esc(item.examName || (exam && exam.name) || '未命名考试') +
        '</b><time>' + esc(dateText(item.createdAt)) + '</time><button type="button" class="a38-icon-button" data-a38-review-delete="' + esc(item.id) + '">删除</button></div>' +
        (item.note ? '<p><strong>观察：</strong>' + esc(item.note) + '</p>' : '') +
        (item.plan ? '<p><strong>我的计划：</strong>' + esc(item.plan) + '</p>' : '') + '</article>';
    }).join('') + '</div>';
  }
  function deepHtml(data) {
    try {
      if (window.__v34 && typeof window.__v34.setSubject === 'function') {
        var focus = data.focus;
        window.__v34.setSubject(focus === '__total__' ? '__total__' : focus.indexOf('__sub:') === 0 ? focus.slice(6) : focus);
      }
      if (window.__v34 && typeof window.__v34.sectionHtml === 'function') {
        var modelExams = data.exams.map(function (exam) {
          if (config().includeHidden && exam.is_hidden) {
            var clone = {};
            Object.keys(exam).forEach(function (key) { clone[key] = exam[key]; });
            clone.is_hidden = false;
            return clone;
          }
          return exam;
        });
        var html = window.__v34.sectionHtml(modelExams);
        return html.replace('id="dsbRoot"', 'id="dsbRoot" data-a38-deep="1"');
      }
    } catch (e) {}
    return '<div id="dsbRoot" data-a38-deep="1" class="card"><p class="a38-empty">深度模型暂不可用；基础趋势和历史统计仍可正常使用。</p></div>';
  }
  function section(key, title, use, body, open) {
    return '<details id="a38-' + key + '" class="a38-section" data-a38-section="' + key + '"' + (open ? ' open' : '') +
      '><summary><span><b>' + esc(title) + '</b><small>' + esc(use) + '</small></span><i>展开</i></summary><div class="a38-section-body">' + body + '</div></details>';
  }
  function sectionOpen(key, defaultOpen) {
    var saved = readJson(SECTION_KEY + userKey(), {});
    return Object.prototype.hasOwnProperty.call(saved, key) ? !!saved[key] : !!defaultOpen;
  }
  function updateSection(key, value) {
    var saved = readJson(SECTION_KEY + userKey(), {});
    saved[key] = !!value;
    writeJson(SECTION_KEY + userKey(), saved);
  }
  function statCard(label, value, note, tone) {
    return '<div class="a38-stat ' + (tone || '') + '"><span>' + esc(label) + '</span><b>' + value + '</b><small>' + esc(note || '') + '</small></div>';
  }
  function summaryCards(data) {
    var latest = data.latestRecord, prior = previousMedian(data, 3), goal = goalProgress(data, data.focus), q = quality(data);
    var currentText = latest ? metricValueText(latest.value, data.metric, latest.exam, data.focus) : '—';
    var change = improvement(data);
    var changeText = change === null ? '数据不足' : (change > 0 ? '改善 ' : change < 0 ? '回落 ' : '接近 ') +
      Math.abs(change) + (metricIsRank(data.metric) || data.metric === 'rate' ? 'pp' : '分');
    var goalText = goal.goal.value === null ? q.scoreCount + ' 场有成绩' : goal.current === null ? '等待成绩' :
      goal.current >= goal.goal.value ? '已达到' : '还差 ' + round(goal.goal.value - goal.current, 1) + ' 分';
    return '<div class="a38-stat-grid">' +
      statCard('最新表现', currentText, latest ? shortName(latest.exam.name) + ' · ' + metricLabel(data.metric) : '当前范围暂无有效记录', 'accent') +
      statCard('近期变化', changeText, prior === null ? '至少需要 2 次有效记录' : '相对此前 3 次中位水平', change > 0 ? 'good' : change < 0 ? 'warn' : '') +
      statCard('目标距离', goalText, goal.goal.value === null ? '尚未设置目标，显示数据覆盖' : '目标单位：最终分', goal.goal.value === null || goal.current === null ? '' : goal.current >= goal.goal.value ? 'good' : 'warn') +
      '</div>';
  }
  function rangeSummary(data) {
    var q = quality(data), c = config(), hidden = c.includeHidden ? ' · 含隐藏考试' : '';
    var rankScope = c.rankScope === 'class' ? 'class' : 'year';
    var rankCount = rankScope === 'class' ? q.validClass : q.validRank;
    return '<div class="a38-range-summary"><b>已选 ' + data.exams.length + ' 次考试</b><span>其中 ' + rankCount +
      ' 次具备' + (rankScope === 'class' ? '班级' : '年级') + '排名 · ' + data.focusLabel + ' · ' + metricLabel(data.metric) + hidden +
      '</span><small>排名范围：' + (rankScope === 'class' ? '班级' : '校内年级') + '。不同范围不混用。</small></div>';
  }
  function focusChips(data) {
    var c = config(), s = getState() || {}, modules = Array.isArray(s.modulesV18) ? s.modulesV18 : [];
    var options = ['<button type="button" class="a38-pill ' + (c.focus === '__total__' ? 'active' : '') + '" data-a38-focus="__total__">总分</button>'];
    data.subjects.forEach(function (subject) {
      var value = '__sub:' + subject;
      options.push('<button type="button" class="a38-pill ' + (c.focus === value ? 'active' : '') + '" data-a38-focus="' + esc(value) + '">' + esc(subject) + '</button>');
    });
    modules.forEach(function (m) {
      var value = '__combo:' + m.id;
      options.push('<button type="button" class="a38-pill ' + (c.focus === value ? 'active' : '') + '" data-a38-focus="' + esc(value) + '">' + esc(m.name || '组合') + '</button>');
    });
    return options.join('');
  }
  function controls(data) {
    var c = config(), cats = categories(data.raw), all = c.range === 'all' ? '全部考试' : c.range === 'recent5' ? '最近 5 次' : c.range === 'recent10' ? '最近 10 次' : '自定义集合';
    var scopeOptions = '<option value="__all__">全部年级</option>' + cats.map(function (value) {
      return '<option value="' + esc(value) + '"' + (c.scope === value ? ' selected' : '') + '>' + esc(value === '__none__' ? '未分类' : value) + '</option>';
    }).join('');
    var checks = allFilterExams().map(function (exam) {
      var checked = c.range !== 'custom' || !Array.isArray(c.selectedIds) || c.selectedIds.indexOf(examId(exam)) >= 0;
      return '<label class="a38-exam-check"><input type="checkbox" data-a38-exam-check="' + esc(examId(exam)) + '"' + (checked ? ' checked' : '') +
        '><span>' + esc(exam.name || dateText(exam.exam_date)) + '<small>' + esc(dateText(exam.exam_date)) + '</small></span></label>';
    }).join('');
    return '<div class="a38-controls"><div class="a38-control-row"><label>考试范围<select data-a38-range>' +
      '<option value="all"' + (c.range === 'all' ? ' selected' : '') + '>全部考试</option><option value="recent5"' + (c.range === 'recent5' ? ' selected' : '') +
      '>最近 5 次</option><option value="recent10"' + (c.range === 'recent10' ? ' selected' : '') + '>最近 10 次</option><option value="custom"' +
      (c.range === 'custom' ? ' selected' : '') + '>自定义集合</option></select></label><label>年级<select data-a38-scope>' + scopeOptions +
      '</select></label><label>排名范围<select data-a38-rank-scope><option value="year"' + (c.rankScope === 'year' ? ' selected' : '') +
      '>校内年级</option><option value="class"' + (c.rankScope === 'class' ? ' selected' : '') + '>班级</option></select></label>' +
      '<label class="a38-check-label"><input type="checkbox" data-a38-hidden' + (c.includeHidden ? ' checked' : '') + '>包含隐藏考试</label></div>' +
      '<div class="a38-control-row a38-date-row"><label>开始日期<input type="date" data-a38-start value="' + esc(c.start) + '"></label>' +
      '<label>结束日期<input type="date" data-a38-end value="' + esc(c.end) + '"></label><span class="a38-control-help">日期范围与考试集合叠加生效</span></div>' +
      '<details class="a38-filter-details"' + (c.range === 'custom' ? ' open' : '') + '><summary>选择考试集合 · 当前 ' + esc(all) + '</summary>' +
      '<div class="a38-exam-grid">' + (checks || '<span class="a38-muted">当前筛选下没有考试</span>') + '</div></details>' +
      '<details class="a38-filter-details"><summary>显示设置 · 当前 ' + esc(metricLabel(data.metric)) + '</summary><div class="a38-setting-row">' +
      '<label>指标<select data-a38-metric><option value="rank_year"' + (data.metric === 'rank_year' ? ' selected' : '') + '>年级位比</option>' +
      '<option value="rank_class"' + (data.metric === 'rank_class' ? ' selected' : '') + '>班级位比</option><option value="score_final"' + (data.metric === 'score_final' ? ' selected' : '') +
      '>最终分</option><option value="score_raw"' + (data.metric === 'score_raw' ? ' selected' : '') + '>原始分</option><option value="rate"' + (data.metric === 'rate' ? ' selected' : '') + '>得分率</option></select></label>' +
      '<span class="a38-control-help">原始分 / 最终分 / 得分率只按各自单位解读；排名越小代表位比越靠前。</span></div></details>' +
      '<div class="a38-focus-row"><span>分析对象</span><div class="a38-pill-scroll">' + focusChips(data) + '</div></div></div>';
  }
  function simpleTrend(data) {
    return '<div class="a38-block-body"><div class="a38-chart-title"><b>' + esc(data.focusLabel) + ' · ' + esc(metricLabel(data.metric)) + '</b><span>' +
      (metricIsRank(data.metric) ? '越靠前越好' : '目标线仅在同一单位下显示') + '</span></div>' + lineChart(data.exams, data.focus, data.metric, config().rankScope, true) +
      '<div class="a38-fact-lines"><p><b>变化方向：</b>' + esc(directionText(data)) + '</p><p><b>波动情况：</b>' + esc(volatility(data)) + '</p></div>' +
      '<button type="button" class="a38-link" data-a38-more="trend">查看详细趋势与波动分析 →</button></div>';
  }
  function simpleStructure(data) {
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    var rows = subjectRows(data).map(function (r) { r.max = sumMax(data.latest || {}, '__sub:' + r.subject, basis); return r; });
    var mode = metricIsRank(data.metric) ? 'rank' : data.metric === 'rate' ? 'rate' : 'score';
    var warning = rows.some(function (r) { return r.rate !== null && r.pos === null; }) ? '有些科目只有得分率，没有同场排名；不把它直接判为最薄弱。' : '同场表现与各科自身近期变化分开看，避免把不同日期的最新成绩拼成本次考试。';
    return '<div class="a38-block-body"><div class="a38-inline-note">本次考试：' + esc(data.latest ? data.latest.name : '暂无') + ' · ' + esc(metricLabel(data.metric)) + '</div>' +
      barChart(rows, mode) + '<p class="a38-note">' + esc(warning) + '</p><button type="button" class="a38-link" data-a38-more="structure">查看雷达图、变化和象限 →</button></div>';
  }
  function simpleGoals(data) {
    var progress = goalProgress(data, data.focus);
    if (progress.goal.value === null) return '<div class="a38-block-body"><p class="a38-note">还没有设置' + esc(data.focusLabel) + '的长期目标。目标会区分为最终分，不会与位比或得分率混用。</p><button type="button" class="a38-button" data-a38-goal-open>去设置目标</button><button type="button" class="a38-link" data-a38-more="goal">查看目标进度 →</button></div>';
    var row = { subject: data.focusLabel, goal: progress.goal.value, current: progress.current, attempts: progress.attempted, hit: progress.reached };
    return '<div class="a38-block-body">' + goalBar(row) + '<p class="a38-note">目标达成只统计有实际成绩且目标口径一致的记录；当前范围共 ' + progress.reached + ' / ' + progress.attempted + ' 次达成。</p><button type="button" class="a38-link" data-a38-more="goal">查看目标校准与参考 →</button></div>';
  }
  function simpleCompare(data) {
    return '<div class="a38-block-body">' + compareTable(data) + '<button type="button" class="a38-button" data-a38-review-open>记录本次复盘</button><button type="button" class="a38-link" data-a38-more="compare">查看完整对比 →</button>' + reviewForm(data) + '</div>';
  }
  function simpleAttention(data) {
    var insights = systemInsights(data), list = reviews();
    return '<div class="a38-block-body"><div class="a38-insight-list">' + insights.slice(0, 3).map(function (x) {
      return '<div class="a38-insight ' + x.tone + '"><b>' + esc(x.title) + '</b><p>' + esc(x.body) + '</p></div>';
    }).join('') + '</div><div class="a38-my-plan"><b>我的计划</b>' + (list.length ? '<span>最近一条：' + esc(list[list.length - 1].plan || list[list.length - 1].note || '已记录复盘') + '</span>' : '<span>还没有填写计划</span>') + '</div><button type="button" class="a38-link" data-a38-more="review">查看系统发现与复盘时间线 →</button></div>';
  }
  function simpleHtml(data) {
    return '<div class="a38-mode-content a38-simple"><div class="a38-answer-grid">' +
      '<article class="a38-answer-card"><div class="a38-section-kicker">1 · 近期表现摘要</div><h3>最近整体怎么样？</h3>' + summaryCards(data) + '<p class="a38-note">' + esc(directionText(data)) + '</p><button type="button" class="a38-link" data-a38-more="overview">查看数据质量与依据 →</button></article>' +
      '<article class="a38-answer-card" id="a38-simple-trend"><div class="a38-section-kicker">2 · 成绩变化趋势</div><h3>是在持续改善，还是单次变化？</h3>' + simpleTrend(data) + '</article>' +
      '<article class="a38-answer-card"><div class="a38-section-kicker">3 · 各科表现与结构</div><h3>各科表现有什么差异？</h3>' + simpleStructure(data) + '</article>' +
      '<article class="a38-answer-card"><div class="a38-section-kicker">4 · 目标与达成情况</div><h3>离目标多远，达成是否持续？</h3>' + simpleGoals(data) + '</article>' +
      '<article class="a38-answer-card"><div class="a38-section-kicker">5 · 本次考试复盘</div><h3>这一次具体变在哪里？</h3>' + simpleCompare(data) + '</article>' +
      '<article class="a38-answer-card"><div class="a38-section-kicker">6 · 重点关注与复盘记录</div><h3>接下来我想关注什么？</h3>' + simpleAttention(data) + '</article>' +
      '</div></div>';
  }
  function overviewDetail(data) {
    var q = quality(data), c = config(), rankScope = c.rankScope === 'class' ? 'class' : 'year', goal = goalProgress(data, data.focus);
    var items = [];
    if (q.missingTotal.length) items.push('有 ' + q.missingTotal.length + ' 场没有成绩，不当作 0 分。');
    if (q.absent) items.push('记录中明确标记为缺考的场次：' + q.absent + '；未填写成绩但没有缺考标记的仍归为未录入。');
    if (q.partial) items.push('有 ' + q.partial + ' 场只录入部分科目，总分 / 得分率可能不完整。');
    if (q.noRank) items.push('有 ' + q.noRank + ' 场没有可用的' + (rankScope === 'class' ? '班级' : '年级') + '排名，相关位比分析只使用其余记录。');
    if (q.poolChanges) items.push('有 ' + q.poolChanges + ' 处参考人数变化达到 30% 以上，跨场位比需要谨慎。');
    if (!items.length) items.push('当前筛选下没有发现会改变主要结论的数据缺口。');
    return '<div class="a38-stat-grid">' + statCard('考试数量', String(data.exams.length), data.exams.length ? dateText(data.exams[0].exam_date) + ' → ' + dateText(data.exams[data.exams.length - 1].exam_date) : '暂无范围', 'accent') +
      statCard('有效排名', (rankScope === 'class' ? q.validClass : q.validRank) + ' / ' + data.exams.length, (rankScope === 'class' ? '班级' : '年级') + '位比 · ' + data.focusLabel, (rankScope === 'class' ? q.validClass : q.validRank) ? 'good' : 'warn') +
      statCard('目标达成', goal.goal.value === null ? '—' : goal.reached + ' / ' + goal.attempted, goal.goal.value === null ? '未设置目标' : '按最终分统计', goal.goal.value === null ? '' : 'good') + '</div>' +
      '<div class="a38-quality-list"><b>当前数据质量</b><ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }
  function detailTrend(data) {
    return '<div class="a38-subsection"><b>完整趋势图</b><p class="a38-caption">实际值为主；目标线只在同一计分单位下显示。平滑观察不作为未来预测。</p>' +
      lineChart(data.exams, data.focus, data.metric, config().rankScope, false) + '</div><div class="a38-two-col"><div><b>相邻变化幅度</b>' + deltaChart(data) +
      '</div><div><b>方向与波动摘要</b><p class="a38-note">' + esc(directionText(data)) + '</p><p class="a38-note">' + esc(volatility(data)) +
      '</p><p class="a38-note">“走势方向”“波动幅度”“相邻变化是否一致”是三个不同概念，本页不合并成一个“稳定”标签。</p></div></div>';
  }
  function detailStructure(data) {
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    var rows = subjectRows(data).map(function (r) { r.max = sumMax(data.latest || {}, '__sub:' + r.subject, basis); return r; });
    var mode = metricIsRank(data.metric) ? 'rank' : data.metric === 'rate' ? 'rate' : 'score';
    var table = '<div class="a38-scroll"><table class="a38-table"><thead><tr><th>科目</th><th>本次</th><th>近期变化</th><th>有效排名场数</th><th>说明</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td>' + esc(r.subject) + '</td><td>' + (r.current === null ? '—' : metricValueText(r.current, data.metric, data.latest, '__sub:' + r.subject)) +
        '</td><td class="' + (r.change === null ? '' : r.change >= 0 ? 'a38-positive' : 'a38-negative') + '">' + (r.change === null ? '数据不足' : (r.change > 0 ? '+' : '') + r.change + 'pp') +
        '</td><td>' + r.n + '</td><td>' + (r.pos === null ? '本次无排名，改看得分率 / 分数' : r.change === null ? '至少需要 2 次同口径排名' : r.change > 0 ? '相对自身近期水平改善' : r.change < 0 ? '相对自身近期水平回落' : '变化接近 0') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return '<div class="a38-subsection"><b>同场结构 · ' + esc(data.latest ? data.latest.name : '暂无') + '</b>' + table + barChart(rows, mode) + '</div>' +
      '<div class="a38-two-col"><div><b>全科雷达图</b>' + radarChart(data) + '</div><div><b>表现与变化象限</b>' + quadrant(data) + '</div></div>' +
      '<p class="a38-caption">“值得关注”只表示数据出现变化，不等同于“最容易提分”。学习优先级还需要考试权重、具体失分原因和后续复盘。</p>';
  }
  function detailGoal(data) {
    var rows = goalRows(data);
    if (!rows.length) return '<p class="a38-note">尚未设置长期目标，也没有足够的逐次目标记录。可以先设置目标，或在考试记录中填写单次目标。</p><button type="button" class="a38-button" data-a38-goal-open>去设置目标</button>';
    return '<div class="a38-goal-list">' + rows.map(goalBar).join('') + '</div><p class="a38-caption">目标校准参考历史中位数、最好成绩和近期范围；它是参考信息，不宣称某个固定公式能算出“最合理目标”。如果当前目标高于最近所有记录，可以把它保留为挑战目标，也可另设阶段目标。</p>';
  }
  function detailRank(data) {
    var currentYear = data.latestYearRank, currentClass = data.latestClassRank;
    var lastYearN = rankParticipants(data.latest, data.focus, 'year'), lastClassN = rankParticipants(data.latest, data.focus, 'class');
    var refText = lastYearN === null && lastClassN === null ? '—' : (lastYearN === null ? '班级 ' + lastClassN : '年级 ' + lastYearN) + (lastClassN === null || lastYearN === null ? '' : ' · 班级 ' + lastClassN);
    return '<div class="a38-two-col"><div><b>年级位比趋势</b>' + rankChart(data, 'year') + '</div><div><b>班级位比趋势</b>' + rankChart(data, 'class') + '</div></div>' +
      '<div class="a38-rank-pair"><div><span>本次年级位置</span><b>' + (currentYear === null ? '—' : '前' + currentYear + '%') + '</b></div><div><span>本次班级位置</span><b>' +
      (currentClass === null ? '—' : '前' + currentClass + '%') + '</b></div><div><span>本次参考人数</span><b>' + refText + '</b></div></div>' +
      rankCountsTable(data) + '<p class="a38-caption">可以描述“本次班级前 10%、年级前 20%”，但不能仅凭个人两条位比断言班级整体更强或主要竞争对手在外班。</p>';
  }
  function detailCompare(data) {
    return compareChooser(data) + compareTable(data);
  }
  function detailReview(data) {
    var insights = systemInsights(data);
    return '<div class="a38-subsection"><b>系统发现</b><div class="a38-insight-list">' + insights.map(function (x) {
      return '<div class="a38-insight ' + x.tone + '"><b>' + esc(x.title) + '</b><p>' + esc(x.body) + '</p></div>';
    }).join('') + '</div></div><div class="a38-subsection"><b>我的计划</b>' + reviewList(data) + '<button type="button" class="a38-button" data-a38-review-open>记录复盘</button>' + reviewForm(data) + '</div>';
  }
  function methods() {
    return '<div class="a38-method-grid"><div><b>指标定义</b><p>位比 = 名次 ÷ 参考人数 × 100%，越小越靠前；分数、得分率和位比不互换。</p></div><div><b>缺失值</b><p>没有成绩的场次保留为空；缺失值不会作为 0 分进入总分或得分率。</p></div><div><b>可比性</b><p>跨考试优先比较同一排名范围；原始分和最终分需要相同口径，满分不同不能直接共用一条分数结论。</p></div><div><b>自动结论边界</b><p>页面描述变化、波动和位置，不把相关关系包装成因果，也不会根据“值得关注”自动分配学习时长。</p></div></div>';
  }
  function injectStyles() {
    if (document.getElementById('analysis-v38-style')) return;
    var css = [
      '.a38-page{max-width:1120px;margin:0 auto;padding:0 0 42px;color:var(--text,#18212f)}',
      '.a38-top{position:sticky;top:0;z-index:30;padding:4px 0 14px;background:color-mix(in srgb,var(--bg,#f5f7fb) 88%,transparent);backdrop-filter:blur(14px)}',
      '.a38-page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:8px 0 12px}',
      '.a38-eyebrow{font-size:11px;letter-spacing:.08em;color:var(--accent,#5d72e8);font-weight:800}',
      '.a38-page h2{margin:3px 0 3px;font-size:25px;letter-spacing:-.02em}.a38-page-head p{margin:0;color:var(--muted,#788392);font-size:12px}',
      '.a38-mode-switch{display:flex;gap:4px;padding:4px;border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:13px;flex:none}',
      '.a38-mode-switch button,.a38-pill,.a38-button,.a38-link,.a38-icon-button{font:inherit;cursor:pointer}',
      '.a38-mode-switch button{border:0;background:transparent;color:var(--muted,#788392);padding:8px 13px;border-radius:9px;font-size:12px;font-weight:700}',
      '.a38-mode-switch button.active{background:var(--accent,#5d72e8);color:#fff}',
      '.a38-global-label{font-size:11px;font-weight:800;color:var(--muted,#788392);margin:1px 0 6px}',
      '.a38-controls{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:16px;padding:11px 13px;box-shadow:0 5px 18px rgba(24,33,47,.04)}',
      '.a38-control-row,.a38-setting-row{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.a38-control-row+ .a38-control-row{margin-top:8px}',
      '.a38-controls label{display:grid;gap:4px;font-size:10.5px;color:var(--muted,#788392);font-weight:700}',
      '.a38-controls select,.a38-controls input[type=date]{min-height:32px;border:1px solid var(--line,#e8ebf0);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text,#18212f);padding:6px 9px;font:inherit;font-size:12px;outline:0}',
      '.a38-controls select:focus,.a38-controls input:focus,.a38-review-form textarea:focus{border-color:var(--accent,#5d72e8);box-shadow:0 0 0 3px var(--accent-soft,#eef1ff)}',
      '.a38-check-label{display:flex!important;align-items:center;gap:6px;min-height:32px;white-space:nowrap}.a38-check-label input{accent-color:var(--accent,#5d72e8)}',
      '.a38-control-help{font-size:10.5px;color:var(--muted,#788392);line-height:1.55;align-self:center}',
      '.a38-filter-details{margin-top:9px;border-top:1px solid var(--line,#e8ebf0);padding-top:8px}.a38-filter-details summary{cursor:pointer;font-size:11.5px;color:var(--accent,#5d72e8);font-weight:750}',
      '.a38-exam-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px;margin-top:8px;max-height:190px;overflow:auto}',
      '.a38-exam-check{display:flex!important;grid-template-columns:none!important;gap:7px!important;align-items:center!important;border:1px solid var(--line,#e8ebf0);border-radius:10px;padding:7px 8px;color:var(--text,#18212f)!important;font-weight:600!important;background:var(--panel-solid,#fff)}',
      '.a38-exam-check input{accent-color:var(--accent,#5d72e8)}.a38-exam-check span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a38-exam-check small{display:block;color:var(--muted,#788392);font-weight:400;font-size:10px;margin-top:2px}',
      '.a38-focus-row{display:flex;align-items:center;gap:9px;margin-top:11px;min-width:0}.a38-focus-row>span{font-size:11px;color:var(--muted,#788392);font-weight:800;white-space:nowrap}.a38-pill-scroll{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:1px 1px 3px;min-width:0}.a38-pill-scroll::-webkit-scrollbar{display:none}',
      '.a38-pill{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--muted,#788392);border-radius:999px;padding:6px 10px;font-size:11px;white-space:nowrap}.a38-pill.active{border-color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font-weight:800}',
      '.a38-range-summary{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;margin:9px 1px 0;padding:9px 11px;border-radius:12px;background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}.a38-range-summary b{font-size:12px}.a38-range-summary span,.a38-range-summary small{font-size:10.5px;color:var(--muted,#788392)}.a38-range-summary small{margin-left:auto}',
      '.a38-answer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.a38-answer-card,.a38-section{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:18px;box-shadow:0 7px 24px rgba(24,33,47,.045);min-width:0}',
      '.a38-answer-card{padding:18px}.a38-answer-card h3{margin:4px 0 12px;font-size:16px;letter-spacing:-.01em}.a38-section-kicker{font-size:10.5px;color:var(--accent,#5d72e8);font-weight:850;letter-spacing:.06em}.a38-block-body{min-width:0}',
      '.a38-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.a38-stat{border:1px solid var(--line,#e8ebf0);border-radius:13px;padding:11px;background:var(--panel-solid,#fff);min-width:0}.a38-stat span,.a38-stat small{display:block;font-size:10.5px;color:var(--muted,#788392)}.a38-stat b{display:block;font-size:18px;margin:6px 0 4px;line-height:1.2;font-variant-numeric:tabular-nums}.a38-stat.accent b{color:var(--accent,#5d72e8)}.a38-stat.good b{color:var(--green,#32a77a)}.a38-stat.warn b{color:var(--danger,#d95c5c)}',
      '.a38-note,.a38-caption,.a38-muted{font-size:11.5px;line-height:1.75;color:var(--muted,#788392)}.a38-note{margin:10px 0}.a38-caption{margin:9px 0 0;font-size:10.5px}.a38-muted{opacity:.8}',
      '.a38-link{border:0;background:transparent;padding:0;color:var(--accent,#5d72e8);font-size:11.5px;font-weight:750}.a38-button{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--text,#18212f);border-radius:10px;padding:8px 12px;font-size:11.5px;font-weight:750;margin:5px 7px 0 0}.a38-button.primary{border-color:var(--accent,#5d72e8);background:var(--accent,#5d72e8);color:#fff}',
      '.a38-chart-title{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:3px 0 4px}.a38-chart-title span{font-size:10.5px;color:var(--muted,#788392)}.a38-chart-scroll{overflow-x:auto;touch-action:pan-y;overscroll-behavior-x:contain}.a38-chart-scroll svg{display:block;width:100%;min-width:500px;height:auto}.a38-chart-legend{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:5px 0 0;font-size:10.5px;color:var(--muted,#788392)}.a38-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent,#5d72e8);margin-right:4px}.a38-dot.target{background:var(--green,#32a77a)}.a38-dot.class{background:var(--green,#32a77a)}',
      '.a38-fact-lines{border-top:1px dashed var(--line,#e8ebf0);margin:11px 0 9px;padding-top:8px}.a38-fact-lines p{font-size:11.5px;line-height:1.65;color:var(--muted,#788392);margin:4px 0}.a38-fact-lines b{color:var(--text,#18212f)}',
      '.a38-bars{display:grid;gap:9px;margin:11px 0}.a38-bar-row{display:grid;grid-template-columns:48px minmax(0,1fr) 64px;align-items:center;gap:8px;font-size:11px}.a38-bar-row>span{font-weight:750;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a38-bar-row>div{height:9px;background:var(--chip-bg,#eef0f5);border-radius:99px;overflow:hidden}.a38-bar-row i{display:block;height:100%;background:var(--accent,#5d72e8);border-radius:99px}.a38-bar-row i.good{background:var(--green,#32a77a)}.a38-bar-row i.mid{background:var(--accent,#5d72e8)}.a38-bar-row i.watch{background:var(--orange,#e59b45)}.a38-bar-row b{text-align:right;font-size:10.5px;font-variant-numeric:tabular-nums}',
      '.a38-answer-card:nth-child(5),.a38-answer-card:nth-child(6){grid-column:span 1}.a38-insight-list{display:grid;gap:8px}.a38-insight{border-left:3px solid var(--line,#cfd6e4);background:var(--chip-bg,#f7f8fb);border-radius:10px;padding:9px 11px}.a38-insight b{font-size:12px}.a38-insight p{margin:4px 0 0;font-size:11px;line-height:1.6;color:var(--muted,#788392)}.a38-insight.good{border-left-color:var(--green,#32a77a)}.a38-insight.warn{border-left-color:var(--orange,#e59b45)}.a38-insight.info{border-left-color:var(--accent,#5d72e8)}.a38-my-plan{display:flex;gap:9px;align-items:baseline;margin-top:12px;padding-top:10px;border-top:1px dashed var(--line,#e8ebf0);font-size:11.5px}.a38-my-plan b{white-space:nowrap}.a38-my-plan span{color:var(--muted,#788392);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.a38-section{margin-bottom:14px;overflow:hidden}.a38-section>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:16px 19px}.a38-section>summary::-webkit-details-marker{display:none}.a38-section>summary>span{display:grid;gap:3px}.a38-section>summary b{font-size:15px}.a38-section>summary small{font-size:11px;color:var(--muted,#788392);font-weight:400}.a38-section>summary i{font-style:normal;color:var(--muted,#788392);font-size:10.5px}.a38-section[open]>summary{border-bottom:1px solid var(--line,#e8ebf0)}.a38-section[open]>summary i{color:var(--accent,#5d72e8)}.a38-section-body{padding:17px 19px 20px}.a38-subsection{margin-bottom:18px}.a38-subsection>b{display:block;font-size:13px;margin-bottom:8px}.a38-two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:18px}.a38-scroll,.a38-matrix-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x}.a38-table{width:100%;border-collapse:collapse;font-size:11.5px;min-width:520px}.a38-table th,.a38-table td{padding:8px 8px;border-bottom:1px solid var(--line,#e8ebf0);text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}.a38-table th:first-child,.a38-table td:first-child{text-align:left}.a38-table th{font-size:10.5px;color:var(--muted,#788392);font-weight:800}.a38-table td{font-weight:650}.a38-table td.a38-positive{color:var(--green,#32a77a)}.a38-table td.a38-negative{color:var(--danger,#d95c5c)}.a38-table th small{display:block;color:var(--muted,#788392);font-weight:400;font-size:9.5px;margin-top:2px}.a38-matrix-scroll{max-height:560px}.a38-matrix th:first-child{position:sticky;left:0;z-index:2;background:var(--panel-solid,#fff)}.a38-matrix td.rank-cell{background:linear-gradient(90deg,color-mix(in srgb,var(--accent,#5d72e8) var(--heat),transparent),transparent)}.a38-matrix td.focus-cell{font-weight:850;background:var(--accent-soft,#eef1ff)}.a38-matrix td.missing{color:var(--muted,#788392);background:var(--chip-bg,#f7f8fb)}.a38-matrix tr.selected th,.a38-matrix tr.selected td{outline:2px solid var(--accent,#5d72e8);outline-offset:-2px}',
      '.a38-delta-list{display:grid;gap:8px;margin-top:9px}.a38-delta-row{display:grid;grid-template-columns:72px minmax(0,1fr) 48px;gap:7px;align-items:center;font-size:10.5px}.a38-delta-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted,#788392)}.a38-delta-track{height:8px;border-radius:99px;background:var(--chip-bg,#eef0f5);overflow:hidden}.a38-delta-track i{display:block;height:100%;border-radius:99px}.a38-delta-track i.positive{background:var(--green,#32a77a)}.a38-delta-track i.negative{background:var(--danger,#d95c5c)}.a38-delta-row b{text-align:right;font-size:10px}.positive{color:var(--green,#32a77a)}.negative{color:var(--danger,#d95c5c)}',
      '.a38-radar-wrap{text-align:center}.a38-radar-wrap svg{max-width:360px;width:100%;height:auto}.a38-chart-scroll svg,.a38-radar-wrap svg{touch-action:pan-y}.a38-rank-pair{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:16px}.a38-rank-pair>div{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px}.a38-rank-pair span{display:block;color:var(--muted,#788392);font-size:10.5px}.a38-rank-pair b{display:block;font-size:18px;margin-top:5px}',
      '.a38-goal-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.a38-goal-row{border:1px solid var(--line,#e8ebf0);border-radius:13px;padding:11px}.a38-goal-head{display:flex;justify-content:space-between;gap:8px;font-size:11.5px}.a38-goal-head span{font-variant-numeric:tabular-nums;color:var(--muted,#788392)}.a38-goal-track{height:10px;background:var(--chip-bg,#eef0f5);border-radius:99px;margin:10px 0 6px;position:relative;overflow:visible}.a38-goal-track i{display:block;height:100%;border-radius:99px;background:var(--accent,#5d72e8)}.a38-goal-track em{position:absolute;top:-3px;width:2px;height:16px;background:var(--green,#32a77a);font-style:normal}.a38-goal-row small{font-size:10.5px;color:var(--muted,#788392)}',
      '.a38-compare-chooser{display:flex;gap:6px;align-items:center;overflow-x:auto;white-space:nowrap;margin-bottom:12px;padding-bottom:3px}.a38-compare-chooser>span{font-size:11px;color:var(--muted,#788392);font-weight:750}.a38-compare-meta{font-size:11px;color:var(--muted,#788392);margin-bottom:8px}.a38-history-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.a38-history-summary>div{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px}.a38-history-summary b{display:block;font-size:17px}.a38-history-summary span{display:block;font-size:10.5px;color:var(--muted,#788392);margin-top:4px}.a38-histogram{height:170px;display:flex;align-items:end;gap:8px;border-bottom:1px solid var(--line,#e8ebf0);padding:12px 6px 0;margin-top:17px}.a38-histogram>div{display:grid;grid-template-rows:1fr auto auto;gap:4px;align-items:end;text-align:center;flex:1;height:100%;min-width:0}.a38-histogram i{display:block;min-height:4px;background:var(--accent,#5d72e8);border-radius:7px 7px 0 0}.a38-histogram span{font-size:9px;color:var(--muted,#788392);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a38-histogram b{font-size:10px}',
      '.a38-quality-list{margin-top:15px;padding:11px 13px;border:1px dashed var(--line,#cfd6e4);border-radius:12px;background:var(--chip-bg,#fbfcfe)}.a38-quality-list>b{font-size:12px}.a38-quality-list ul{margin:7px 0 0;padding-left:18px}.a38-quality-list li{font-size:11.5px;line-height:1.75;color:var(--muted,#788392)}.a38-method-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.a38-method-grid>div{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:11px}.a38-method-grid b{font-size:11.5px}.a38-method-grid p{font-size:10.5px;line-height:1.7;color:var(--muted,#788392);margin:5px 0 0}',
      '.a38-review-form{border:1px solid var(--line,#e8ebf0);background:var(--chip-bg,#fbfcfe);border-radius:13px;padding:12px;margin-top:10px}.a38-review-form[hidden]{display:none}.a38-review-form label{display:grid;gap:5px;font-size:11px;font-weight:750;margin-bottom:9px}.a38-review-form select,.a38-review-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--line,#e8ebf0);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text,#18212f);padding:8px;font:inherit;font-size:11.5px;resize:vertical}.a38-form-actions{display:flex;align-items:center;gap:8px}.a38-review-list{display:grid;gap:9px;margin:9px 0}.a38-review-list article{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px}.a38-review-head{display:flex;align-items:center;gap:8px}.a38-review-head b{font-size:11.5px}.a38-review-head time{font-size:10px;color:var(--muted,#788392);margin-left:auto}.a38-icon-button{border:0;background:transparent;color:var(--muted,#788392);font-size:10px}.a38-review-list p{margin:7px 0 0;font-size:11px;line-height:1.65;color:var(--muted,#788392)}.a38-review-list strong{color:var(--text,#18212f)}',
      '.a38-empty{border:1px dashed var(--line,#cfd6e4);border-radius:12px;padding:16px;text-align:center;font-size:11.5px;color:var(--muted,#788392);margin:8px 0}.a38-deep-mode #dsbRoot{display:block}.a38-simple-mode #dsbRoot{display:none!important}.a38-page svg{max-width:100%}',
      '@media(max-width:820px){.a38-page{padding-bottom:28px}.a38-answer-grid{grid-template-columns:1fr}.a38-two-col{grid-template-columns:1fr}.a38-goal-list{grid-template-columns:1fr}.a38-page-head{align-items:center}.a38-range-summary small{width:100%;margin-left:0}.a38-top{padding-bottom:10px}.a38-detail-nav{top:104px}}',
      '@media(max-width:620px){.a38-page-head{gap:10px}.a38-page h2{font-size:22px}.a38-mode-switch button{padding:7px 9px;font-size:11px}.a38-controls{padding:10px}.a38-control-row label{flex:1 1 130px}.a38-date-row label{flex-basis:130px}.a38-control-help{width:100%}.a38-stat-grid{gap:6px}.a38-stat{padding:9px 8px}.a38-stat b{font-size:15px}.a38-stat span,.a38-stat small{font-size:9.5px}.a38-answer-card{padding:14px}.a38-answer-card h3{font-size:15px}.a38-section>summary{padding:14px}.a38-section-body{padding:14px}.a38-rank-pair{grid-template-columns:1fr 1fr}.a38-rank-pair>div:last-child{grid-column:span 2}.a38-method-grid{grid-template-columns:1fr}.a38-matrix-scroll{max-height:none}.a38-chart-scroll svg{min-width:480px}}',
      'html[data-theme="night"] .a38-controls,html[data-theme="night"] .a38-answer-card,html[data-theme="night"] .a38-section,html[data-theme="night"] .a38-stat,html[data-theme="night"] .a38-goal-row,html[data-theme="night"] .a38-review-form,html[data-theme="night"] .a38-review-list article{box-shadow:none}',
      'html[data-theme="night"] .a38-insight,html[data-theme="night"] .a38-quality-list,html[data-theme="night"] .a38-review-form{background:rgba(255,255,255,.035)}',
      '.a38-matrix td.rate-cell,.a38-matrix td.score-cell{background:linear-gradient(90deg,color-mix(in srgb,var(--accent,#5d72e8) var(--heat),transparent),transparent)}.a38-matrix td.low-cell{box-shadow:inset 0 -2px 0 var(--orange,#e59b45)}.a38-matrix td.missing{box-shadow:inset 0 -2px 0 var(--line,#cfd6e4)}',
      '.a38-detail-nav{position:sticky;top:112px;z-index:20;display:flex;align-items:center;gap:6px;overflow-x:auto;white-space:nowrap;padding:6px 1px 9px;margin-bottom:5px;background:color-mix(in srgb,var(--bg,#f5f7fb) 88%,transparent);backdrop-filter:blur(12px);scrollbar-width:none}.a38-detail-nav::-webkit-scrollbar{display:none}.a38-detail-nav>span{font-size:10.5px;color:var(--muted,#788392);font-weight:800;margin-right:3px}.a38-detail-nav a{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--muted,#788392);border-radius:999px;padding:5px 9px;text-decoration:none;font-size:10.5px}.a38-detail-nav a:active{color:var(--accent,#5d72e8);border-color:var(--accent,#5d72e8)}',
      '.a38-contribution{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:11px;margin-top:12px}.a38-contribution>b{font-size:12px}.a38-contribution-row{display:grid;grid-template-columns:52px minmax(0,1fr) 48px;gap:8px;align-items:center;margin-top:8px;font-size:10.5px}.a38-contribution-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a38-contribution-row>div{height:7px;border-radius:99px;background:var(--chip-bg,#eef0f5);overflow:hidden}.a38-contribution-row i{display:block;height:100%;border-radius:99px}.a38-contribution-row i.positive{background:var(--green,#32a77a)}.a38-contribution-row i.negative{background:var(--danger,#d95c5c)}.a38-contribution-row>b{text-align:right;font-variant-numeric:tabular-nums}',
      '.a38-matrix .matrix-col-selected{box-shadow:inset 2px 0 0 var(--accent,#5d72e8),inset -2px 0 0 var(--accent,#5d72e8)}',
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'analysis-v38-style';
    style.textContent = css;
    document.head.appendChild(style);
  }
  function detailedHtml(data) {
    var nav = [['overview', '概览'], ['trend', '趋势'], ['structure', '科目'], ['goal', '目标'], ['rank', '排名'], ['compare', '对比'], ['history', '纪录'], ['matrix', '矩阵'], ['deep', '模型'], ['review', '复盘']];
    return '<div class="a38-detail-nav" aria-label="详细分析目录"><span>详细目录</span>' + nav.map(function (item) {
      return '<a href="#a38-' + item[0] + '">' + item[1] + '</a>';
    }).join('') + '</div><div class="a38-mode-content a38-detail">' +
      section('overview', '1 · 整体概览与数据质量', '先确认范围、样本和缺口', overviewDetail(data), sectionOpen('overview', true)) +
      section('trend', '2 · 趋势与波动分析', '看方向、相邻变化和波动，不把一次变化当趋势', detailTrend(data), sectionOpen('trend', true)) +
      section('structure', '3 · 科目结构与相对表现', '同场结构、各科变化和当前 × 方向', detailStructure(data), sectionOpen('structure', true)) +
      section('goal', '4 · 目标进度与目标校准', '当前差距、历史达成和参考依据', detailGoal(data), sectionOpen('goal', true)) +
      section('rank', '5 · 排名位置与竞争环境', '分开看年级、班级和参考人数', detailRank(data), sectionOpen('rank', true)) +
      section('compare', '6 · 单次考试与跨考试对比', '选择两次或多次考试，保留选择状态', detailCompare(data), sectionOpen('compare', true)) +
      section('history', '7 · 历史纪录与成绩分布', '只在同口径个人历史中比较', history(data), sectionOpen('history', true)) +
      section('matrix', '8 · 全量统计矩阵', '作为核对与探索工具', matrix(data), sectionOpen('matrix', true)) +
      section('deep', '9 · 深度模型与预测', '先看结果，再看证据，最后看模型细节', deepHtml(data), sectionOpen('deep', false)) +
      section('review', '10 · 复盘记录与分析方法', '把系统事实与自己的行动分开', detailReview(data) + methods(), sectionOpen('review', true)) +
      '</div>';
  }
  function topHtml(data) {
    var c = config();
    return '<div class="a38-top"><div class="a38-page-head"><div><span class="a38-eyebrow">分析工作台</span><h2>分析</h2><p>先回答“发生了什么”，再查看依据与方法。</p></div><div class="a38-mode-switch" role="tablist" aria-label="分析模式">' +
      '<button type="button" class="' + (c.view === 'simple' ? 'active' : '') + '" data-a38-view="simple">简洁模式</button><button type="button" class="' + (c.view === 'detail' ? 'active' : '') + '" data-a38-view="detail">详细模式</button></div></div>' +
      '<div class="a38-global-label">全局分析范围</div>' + controls(data) + rangeSummary(data) + '</div>';
  }
  function pageHtml(data) {
    var c = config();
    return '<div class="a38-page">' + topHtml(data) + (c.view === 'detail' ? detailedHtml(data) : simpleHtml(data)) + '</div>';
  }
  function ensureNav() {
    var s = getState() || {}, page = s.page || 'home';
    var desktop = document.querySelector('.desktop-nav');
    if (desktop && !desktop.querySelector('[data-page="stats"]')) {
      var account = desktop.querySelector('[data-page="account"]'), b = document.createElement('button');
      b.className = 'nav-btn'; b.setAttribute('data-page', 'stats'); b.textContent = '统计分析';
      account ? desktop.insertBefore(b, account) : desktop.appendChild(b);
    }
    var bottom = document.querySelector('.bottom-nav');
    if (bottom && !bottom.querySelector('[data-page="stats"]')) {
      var accountB = bottom.querySelector('[data-page="account"]'), bb = document.createElement('button');
      bb.setAttribute('data-page', 'stats'); bb.innerHTML = '<span>▦</span><span>分析</span>';
      accountB ? bottom.insertBefore(bb, accountB) : bottom.appendChild(bb);
    }
    document.querySelectorAll('.desktop-nav [data-page],.bottom-nav [data-page]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-page') === page);
    });
  }
  function isStats() {
    var s = getState();
    return !!(s && s.page === 'stats');
  }
  function openGoal() {
    try {
      if (window.__v33 && typeof window.__v33.open === 'function') window.__v33.open();
      else if (typeof window.openEditor === 'function') window.openEditor('stats_module');
    } catch (e) {}
  }
  function bind(root, data) {
    root.addEventListener('click', function (event) {
      var target = event.target;
      var view = target.closest('[data-a38-view]');
      if (view) {
        setConfig('view', view.getAttribute('data-a38-view') === 'detail' ? 'detail' : 'simple');
        renderStats();
        track('analysis_mode_change', { mode: config().view });
        return;
      }
      var more = target.closest('[data-a38-more]');
      if (more) {
        setConfig('view', 'detail');
        renderStats();
        var id = 'a38-' + more.getAttribute('data-a38-more');
        setTimeout(function () { var el = document.getElementById(id); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 20);
        return;
      }
      var focus = target.closest('[data-a38-focus]');
      if (focus) { setConfig('focus', focus.getAttribute('data-a38-focus')); renderStats(); return; }
      var compare = target.closest('[data-a38-compare]');
      if (compare) {
        var id = compare.getAttribute('data-a38-compare'), ids = compareIds(data), at = ids.indexOf(id);
        if (at >= 0) { if (ids.length > 2) ids.splice(at, 1); }
        else if (ids.length < 4) ids.push(id);
        setConfig('compareIds', ids); renderStats(); return;
      }
      if (target.closest('[data-a38-goal-open]')) { openGoal(); return; }
      if (target.closest('[data-a38-review-open]')) {
        var form = root.querySelector('[data-a38-review-form]');
        if (form) { form.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        return;
      }
      if (target.closest('[data-a38-review-cancel]')) { var cancelForm = target.closest('[data-a38-review-form]'); if (cancelForm) cancelForm.hidden = true; return; }
      var save = target.closest('[data-a38-review-save]');
      if (save) {
        var formSave = target.closest('[data-a38-review-form]'), examSelect = formSave && formSave.querySelector('.a38-review-exam');
        var note = formSave && formSave.querySelector('.a38-review-note'), plan = formSave && formSave.querySelector('.a38-review-plan');
        if (examSelect && ((note && note.value.trim()) || (plan && plan.value.trim()))) {
          var exam = data.raw.filter(function (e) { return examId(e) === examSelect.value; })[0];
          var list = reviews();
          list.push({ id: 'r-' + Date.now().toString(36), examId: examSelect.value, examName: exam && exam.name, note: note.value.trim(), plan: plan.value.trim(), createdAt: new Date().toISOString() });
          saveReviews(list); track('analysis_review_saved', {}); renderStats();
        } else if (formSave) formSave.querySelector('.a38-review-note').focus();
        return;
      }
      var del = target.closest('[data-a38-review-delete]');
      if (del) { saveReviews(reviews().filter(function (x) { return String(x.id) !== String(del.getAttribute('data-a38-review-delete')); })); renderStats(); return; }
      var matrixRow = target.closest('[data-a38-matrix-row]');
      if (matrixRow) {
        root.querySelectorAll('.a38-matrix tr.selected').forEach(function (row) { row.classList.remove('selected'); });
        root.querySelectorAll('.a38-matrix .matrix-col-selected').forEach(function (cell) { cell.classList.remove('matrix-col-selected'); });
        matrixRow.classList.add('selected');
        var cell = target.closest('th,td'), table = matrixRow.closest('.a38-matrix');
        if (cell && table) Array.prototype.forEach.call(table.rows, function (row) {
          if (row.cells[cell.cellIndex]) row.cells[cell.cellIndex].classList.add('matrix-col-selected');
        });
        return;
      }
      var focusExam = target.closest('[data-a38-focus-exam]');
      if (focusExam) {
        var focusId = focusExam.getAttribute('data-a38-focus-exam'), row = null;
        root.querySelectorAll('[data-a38-matrix-row]').forEach(function (candidate) {
          if (candidate.getAttribute('data-a38-matrix-row') === focusId) row = candidate;
        });
        if (row) { row.classList.add('selected'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
    });
    root.addEventListener('change', function (event) {
      var t = event.target, c = config();
      if (t.matches('[data-a38-range]')) { c.range = t.value; if (t.value !== 'custom') c.selectedIds = null; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-scope]')) { c.scope = t.value; c.selectedIds = null; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-rank-scope]')) {
        c.rankScope = t.value === 'class' ? 'class' : 'year';
        if (c.metric === 'rank_year' || c.metric === 'rank_class') c.metric = c.rankScope === 'class' ? 'rank_class' : 'rank_year';
        persistConfig(); renderStats(); return;
      }
      if (t.matches('[data-a38-hidden]')) { c.includeHidden = !!t.checked; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-start]')) { c.start = t.value; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-end]')) { c.end = t.value; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-metric]')) {
        c.metric = t.value;
        if (t.value === 'rank_class') c.rankScope = 'class';
        if (t.value === 'rank_year') c.rankScope = 'year';
        persistConfig(); renderStats(); return;
      }
      if (t.matches('[data-a38-exam-check]')) {
        c.range = 'custom';
        var ids = Array.prototype.slice.call(root.querySelectorAll('[data-a38-exam-check]:checked')).map(function (x) { return x.getAttribute('data-a38-exam-check'); });
        c.selectedIds = ids; persistConfig(); renderStats(); return;
      }
    });
    root.querySelectorAll('[data-a38-section]').forEach(function (details) {
      details.addEventListener('toggle', function () { updateSection(details.getAttribute('data-a38-section'), details.open); });
    });
  }
  function installDeepObserver() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function () {
      if (observerBusy || !isStats()) return;
      var root = document.getElementById('dsbRoot');
      if (!root || root.getAttribute('data-a38-deep') === '1') return;
      observerBusy = true;
      try {
        var data = buildData();
        root.outerHTML = deepHtml(data);
      } catch (e) {} 
      observerBusy = false;
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function renderStats() {
    if (!isStats()) return;
    var content = document.getElementById('content');
    if (!content) return;
    injectStyles();
    ensureNav();
    var top = window.pageYOffset || 0, data;
    try { data = buildData(); } catch (e) { data = { exams: [], allFilter: [], raw: rawExams(), subjects: [], focus: '__total__', focusLabel: '总分', metric: 'score_final', records: [], valid: [], previousRecords: [], yearRankCount: 0, classRankCount: 0, scoreCount: 0, latest: null, latestRecord: null }; }
    document.body.classList.toggle('a38-detail-mode', config().view === 'detail');
    document.body.classList.toggle('a38-simple-mode', config().view !== 'detail');
    content.innerHTML = pageHtml(data);
    var root = content.querySelector('.a38-page');
    if (root) bind(root, data);
    installDeepObserver();
    try { window.scrollTo(0, top); } catch (e) {}
  }
  window.renderPage = function analysisV38RenderPage() {
    if (isStats()) { renderStats(); return; }
    if (PREVIOUS_RENDER) PREVIOUS_RENDER();
  };
  window.__analysisV38Api = {
    render: renderStats, buildData: buildData, selectedExams: selectedBaseExams,
    reviews: reviews, metric: getMetric
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { installDeepObserver(); }); 
  else installDeepObserver();
})();
