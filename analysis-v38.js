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
      compareIds: Array.isArray(saved.compareIds) ? saved.compareIds : null,
      structureView: saved.structureView === 'history' ? 'history' : 'same',
      matrixSort: saved.matrixSort || 'date',
      matrixQuery: saved.matrixQuery || '',
      matrixKind: saved.matrixKind || 'current',
      reviewAll: !!saved.reviewAll
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
      rankScope: c.rankScope, focus: c.focus, compareIds: c.compareIds,
      structureView: c.structureView, matrixSort: c.matrixSort, matrixQuery: c.matrixQuery, matrixKind: c.matrixKind || 'current', reviewAll: !!c.reviewAll
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
      return !isAbsent(r) && !isNotApplicable(r) && (num(r.actual) !== null || num(r.raw) !== null);
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
      if (override !== null && !isExamAbsent(exam)) return override;
    }
    var names = focus && focus.indexOf('__combo:') === 0 ? comboById(focus.slice(8)).subjects : null;
    if (focus && focus.indexOf('__sub:') === 0) {
      var one = rowOf(exam, focus.slice(6));
      return isAbsent(one) || isNotApplicable(one) ? null : rowScore(one, basis);
    }
    var sum = null;
    Object.keys(exam && exam.scores || {}).forEach(function (subject) {
      if (names && names.indexOf(subject) < 0) return;
      var row = rowOf(exam, subject);
      if (row.excludeFromTotal || isAbsent(row) || isNotApplicable(row)) return;
      var value = rowScore(row, basis);
      if (value !== null) sum = sum === null ? value : sum + value;
    });
    return sum;
  }
  function sumMax(exam, focus, basis) {
    if (focus === '__total__') {
      var direct = num(basis === 'raw' ? (exam && (exam.total_raw_max || exam.total_raw_score_max)) : (exam && (exam.total_actual_max || exam.total_score_max)));
      if (direct !== null) return direct;
    }
    var names = focus && focus.indexOf('__combo:') === 0 ? comboById(focus.slice(8)).subjects : null;
    if (focus && focus.indexOf('__sub:') === 0) { var one = rowOf(exam, focus.slice(6)); return isAbsent(one) || isNotApplicable(one) ? null : rowMax(one, basis); }
    var sum = null;
    Object.keys(exam && exam.scores || {}).forEach(function (subject) {
      if (names && names.indexOf(subject) < 0) return;
      var row = rowOf(exam, subject);
      if (row.excludeFromTotal || isAbsent(row) || isNotApplicable(row)) return;
      var value = rowMax(row, basis);
      if (value !== null) sum = sum === null ? value : sum + value;
    });
    return sum;
  }
  function isNotApplicable(row) {
    if (!row) return false;
    if (row.notApplicable === true || row.not_applicable === true || row.exempt === true) return true;
    var status = String(row.status || row.result_status || '').toLowerCase();
    return status === 'not_applicable' || status === 'not-applicable' || status === '不适用' || status === '未考' || status === '不考';
  }
  function scoreComplete(exam, focus, basis) {
    if (!exam) return false;
    if (focus && focus.indexOf('__sub:') === 0) {
      var one = rowOf(exam, focus.slice(6));
      return !isNotApplicable(one) && rowScore(one, basis) !== null && rowMax(one, basis) !== null;
    }
    var names = focus && focus.indexOf('__combo:') === 0 ? comboById(focus.slice(8)).subjects.slice() : [];
    if (!names.length) {
      var configured = subjectsFor([exam]);
      names = configured.length ? configured : Object.keys(exam.scores || {});
    }
    if (!names.length) return false;
    return names.every(function (subject) {
      var row = rowOf(exam, subject);
      if (row.excludeFromTotal) return true;
      return !isNotApplicable(row) && !isAbsent(row) && rowScore(row, basis) !== null && rowMax(row, basis) !== null;
    });
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
  function firstNumber(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var value = num(obj && obj[keys[i]]);
      if (value !== null) return value;
    }
    return null;
  }
  function comboMatchesTotal(exam, id) {
    var combo = comboById(id), names = combo.subjects || [], included = [];
    if (!names.length || !exam || !exam.scores) return false;
    Object.keys(exam.scores).forEach(function (subject) {
      var row = rowOf(exam, subject);
      if (row.excludeFromTotal) return;
      var hasData = [row.actual, row.raw, row.max, row.rawMax, row.rank, row.classRank, row.yearPositionPercent, row.classPositionPercent].some(function (v) { return num(v) !== null; });
      if (hasData) included.push(subject);
    });
    return included.length === names.length && names.every(function (subject) { return included.indexOf(subject) >= 0; });
  }
  function rankInfo(exam, focus, scope) {
    var rank = null, people = null, percent = null, source = 'missing', explicit = false;
    function assign(rawRank, rawPeople, rawPercent, origin) {
      var p = num(rawPercent), r = num(rawRank), n = num(rawPeople);
      if (p !== null && p >= 0 && p <= 100) { percent = round(p, 1); source = 'explicit'; explicit = true; return; }
      rank = r; people = n; source = origin || source;
      if (rank !== null && people !== null && rank >= 1 && people >= 1 && rank <= people) percent = round(clamp(rank / people * 100, 0, 100), 1);
    }
    if (focus && focus.indexOf('__combo:') === 0) {
      var comboId = focus.slice(8), mr = moduleRank(exam, comboId);
      if (mr) assign(scope === 'class' ? mr.classRank : mr.yearRank, scope === 'class' ? mr.classParticipants : mr.yearParticipants,
        scope === 'class' ? firstNumber(mr, ['classPositionPercent', 'class_position_percent']) : firstNumber(mr, ['yearPositionPercent', 'year_position_percent']), 'combo');
      if (percent === null && rank === null && scope === 'year' && comboMatchesTotal(exam, comboId)) {
        assign(exam && exam.total_rank, exam && exam.total_participants, exam && exam.total_year_position_percent, 'total');
      }
    } else if (focus && focus.indexOf('__sub:') === 0) {
      var row = rowOf(exam, focus.slice(6));
      if (scope === 'class') assign(row.classRank, row.classParticipants, firstNumber(row, ['classPositionPercent', 'class_position_percent']), 'subject');
      else assign(row.rank, row.participants, firstNumber(row, ['yearPositionPercent', 'year_position_percent']), 'subject');
    } else if (scope === 'class') {
      assign(exam && exam.total_class_rank, exam && exam.total_class_participants, exam && exam.total_class_position_percent, 'total');
    } else {
      assign(exam && (exam.total_rank != null ? exam.total_rank : exam.year_rank), exam && (exam.total_participants != null ? exam.total_participants : exam.year_participants), exam && exam.total_year_position_percent, 'total');
    }
    return { rank: rank, people: people, percent: percent, source: source, explicit: explicit, complete: percent !== null && (explicit || people !== null) };
  }
  function rankPercent(exam, focus, scope) { return rankInfo(exam, focus, scope).percent; }
  function rankText(exam, focus, scope) {
    var info = rankInfo(exam, focus, scope);
    if (info.percent !== null) return '前' + info.percent + '%';
    if (info.rank !== null) return '第' + info.rank + '名' + (info.people !== null ? ' / ' + info.people + '人' : ' · 缺参考人数');
    return '—';
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
      return score !== null && max && scoreComplete(exam, focus, basis) ? round(clamp(score / max * 100, 0, 100), 1) : null;
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
  function rankCoverage(exams, focus, scope) {
    var available = 0, complete = 0, missingPeople = 0;
    (exams || []).forEach(function (exam) {
      var info = rankInfo(exam, focus, scope);
      if (info.rank !== null || info.percent !== null) available++;
      if (info.percent !== null) complete++;
      else if (info.rank !== null) missingPeople++;
    });
    return { available: available, complete: complete, missingPeople: missingPeople };
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
    var rankScope = c.rankScope === 'class' ? 'class' : 'year';
    var coverage = rankCoverage(exams, focus, rankScope);
    return {
      exams: exams, allFilter: allFilterExams(), raw: rawExams(), subjects: subjects, focus: focus,
      focusLabel: focusLabel(focus), metric: metric, latest: latest, records: records, valid: valid,
      yearRankCount: yearRankCount, classRankCount: classRankCount, scoreCount: scoreCount,
      rankScope: rankScope, rankLabel: rankScope === 'class' ? '班级位比' : '年级位比', rankCoverage: coverage,
      latestRecord: valid.length ? valid[valid.length - 1] : null,
      previousRecords: valid.length > 1 ? valid.slice(0, -1) : [],
      latestYearRank: latest ? rankPercent(latest, focus, 'year') : null,
      latestClassRank: latest ? rankPercent(latest, focus, 'class') : null
    };
  }
  function previousMedian(data, count) {
    var records = comparableRecords(data);
    var prev = records.slice(0, -1).slice(-(count || 3)).map(function (r) { return r.value; });
    return median(prev);
  }
  function sameScoreScale(a, b) {
    return a && b && a.max !== null && a.max !== undefined && b.max !== null && b.max !== undefined && Math.abs(a.max - b.max) < 1e-9;
  }
  function scoreSubjects(exam, focus, basis) {
    if (focus && focus.indexOf('__sub:') === 0) return [focus.slice(6)];
    if (focus && focus.indexOf('__combo:') === 0) return comboById(focus.slice(8)).subjects.slice().sort();
    return Object.keys(exam && exam.scores || {}).filter(function (subject) {
      var row = rowOf(exam, subject);
      return !row.excludeFromTotal && !isAbsent(row) && !isNotApplicable(row) && (rowScore(row, basis) !== null || rowMax(row, basis) !== null);
    }).sort();
  }
  function scoreComparable(a, b, focus, basis) {
    if (!a || !b) return false;
    var am = sumMax(a, focus, basis), bm = sumMax(b, focus, basis);
    return am !== null && bm !== null && Math.abs(am - bm) < 1e-9 && scoreSubjects(a, focus, basis).join('|') === scoreSubjects(b, focus, basis).join('|');
  }
  function comparableRecords(data) {
    var records = data.valid.slice();
    if (data.metric !== 'score_final' && data.metric !== 'score_raw') return records;
    var latest = data.latestRecord;
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    return latest && latest.max !== null && latest.max !== undefined ? records.filter(function (r) { return scoreComparable(r.exam, latest.exam, data.focus, basis); }) : [];
  }
  function hasScaleChange(data) {
    if (data.metric !== 'score_final' && data.metric !== 'score_raw') return false;
    var latest = data.latestRecord;
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    return !!(latest && data.valid.length > 1 && (latest.max === null || latest.max === undefined || data.valid.some(function (r) { return !scoreComparable(r.exam, latest.exam, data.focus, basis); })));
  }
  function scaleChangeText(data) {
    if (!hasScaleChange(data)) return '';
    var latest = data.latestRecord, basis = data.metric === 'score_raw' ? 'raw' : 'final', changed = data.valid.filter(function (r) { return !scoreComparable(r.exam, latest.exam, data.focus, basis); });
    var from = changed.length ? changed[changed.length - 1].max : null, to = latest && latest.max;
    return from !== null && to !== null && Math.abs(from - to) > 1e-9 ? '分数口径或科目集合发生变化（满分 ' + from + ' → ' + to + '），暂不直接判断分数改善；可切换得分率查看。' : '分数满分、科目集合或计分口径发生变化或不完整，暂不直接判断分数改善；可切换得分率查看。';
  }
  function improvement(data) {
    if (!data.latestRecord) return null;
    if (hasScaleChange(data)) return null;
    var previous = previousMedian(data, 3);
    if (previous === null) return null;
    return metricIsRank(data.metric) ? round(previous - data.latestRecord.value, 1) :
      round(data.latestRecord.value - previous, 1);
  }
  function directionText(data) {
    if (hasScaleChange(data)) return scaleChangeText(data);
    var delta = improvement(data);
    if (delta === null) return '有效记录不足，暂不判断变化方向。';
    if (Math.abs(delta) < 1) return '最近一次与此前几次的中位水平接近，暂不把它判为明显变化。';
    var n = comparableRecords(data).slice(0, -1).slice(-3).length;
    return (delta > 0 ? '最近一次相对此前 ' + n + ' 次中位水平有所改善' : '最近一次相对此前 ' + n + ' 次中位水平有所回落') +
      '（' + (metricIsRank(data.metric) ? Math.abs(delta) + ' 个百分点' : (delta > 0 ? '+' : '') + delta + (data.metric === 'rate' ? ' 个百分点' : ' 分')) + '）。';
  }
  function volatility(data) {
    var records = comparableRecords(data), vals = records.map(function (r) { return r.value; });
    if (hasScaleChange(data)) return scaleChangeText(data);
    if (vals.length < 3) return '当前只有 ' + vals.length + ' 次同口径有效记录，暂不判断波动大小。';
    var diffs = [];
    for (var i = 1; i < vals.length; i++) diffs.push(Math.abs(vals[i] - vals[i - 1]));
    var med = median(diffs);
    return '相邻有效记录变化的中位幅度约为 ' + round(med, 1) + (metricIsRank(data.metric) || data.metric === 'rate' ? ' 个百分点' : ' 分') + '。';
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
    if (value === null) {
      var currentExam = selectedBaseExams().slice(-1)[0];
      if (currentExam) {
        if (focus && focus.indexOf('__sub:') === 0) value = num(rowOf(currentExam, focus.slice(6)).target);
        else if (focus === '__total__') value = num(currentExam.total_target_score);
        else if (focus && focus.indexOf('__combo:') === 0) {
          var combo = comboById(focus.slice(8)), sum = 0, found = false;
          (combo.subjects || []).forEach(function (subject) { var target = num(rowOf(currentExam, subject).target); if (target !== null) { sum += target; found = true; } });
          value = found ? sum : null;
        }
      }
    }
    return { value: value, label: label, unit: '最终分' };
  }
  function goalProgress(data, focus) {
    var goal = goalFor(focus), attempted = 0, reached = 0;
    data.exams.forEach(function (exam) {
      var actual = scoreComplete(exam, focus, 'final') ? valueFor(exam, focus, 'score_final', data.rankScope) : null;
      var target = goal.value;
      if (actual !== null && target !== null) { attempted++; if (actual >= target) reached++; }
    });
    var current = data.latest && scoreComplete(data.latest, focus, 'final') ? valueFor(data.latest, focus, 'score_final', data.rankScope) : null;
    var currentMax = data.latest ? sumMax(data.latest, focus, 'final') : null;
    return { goal: goal, current: current, currentMax: currentMax, attempted: attempted, reached: reached };
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
    var subjects = Object.keys(exam.scores || {});
    return subjects.length > 0 && subjects.every(function (subject) { return isAbsent(rowOf(exam, subject)); });
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
      rankAvailable: data.rankCoverage.available, rankComplete: data.rankCoverage.complete,
      rankMissingPeople: data.rankCoverage.missingPeople,
      rankScope: rankScope,
      scoreCount: data.scoreCount
    };
  }
  function rankParticipants(exam, focus, scope) {
    return rankInfo(exam, focus, scope).people;
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
  function partialRateText(exam, focus, basis) {
    if (!exam || (focus !== '__total__' && !(focus && focus.indexOf('__combo:') === 0))) return '';
    var names = focus.indexOf('__combo:') === 0 ? comboById(focus.slice(8)).subjects.slice() : subjectsFor([exam]).filter(function (subject) { return !rowOf(exam, subject).excludeFromTotal; });
    var entered = 0, score = 0, max = 0;
    names.forEach(function (subject) {
      var row = rowOf(exam, subject);
      if (isAbsent(row) || isNotApplicable(row)) return;
      var s = rowScore(row, basis), m = rowMax(row, basis);
      if (s !== null && m !== null) { entered++; score += s; max += m; }
    });
    if (!entered || entered >= names.length || !max) return '';
    return '已录入 ' + entered + '/' + names.length + ' 科；已录入科目得分率 ' + round(score / max * 100, 1) + '%，不代表本次总分表现。';
  }
  function lineChart(exams, focus, metric, rankScope, compact) {
    var series = seriesFor(exams, focus, metric, rankScope);
    var values = series.map(function (x) { return x.plot; });
    var labels = series.map(function (x) { return x.label; });
    var valid = values.some(function (x) { return x !== null; });
    if (!valid) {
      var partial = metric === 'rate' ? (exams || []).map(function (exam) { return partialRateText(exam, focus, 'final'); }).filter(Boolean)[0] : '';
      return '<div class="a38-empty">当前范围没有可用于“' + esc(metricLabel(metric)) + '”的完整记录。' + (partial ? '<br>' + esc(partial) : '') + '</div>';
    }
    var lines = [{ vals: values, color: 'var(--accent,#5d72e8)' }];
    var target = targetSeries(exams, focus, metric, rankScope), scaleMismatch = false;
    if (metric === 'score_final' || metric === 'score_raw') {
      var allScales = exams.map(function (exam) { return sumMax(exam, focus, metric === 'score_raw' ? 'raw' : 'final'); });
      var scales = allScales.filter(function (v) { return v !== null; });
      var uniqueScales = scales.filter(function (v, i) { return scales.indexOf(v) === i; });
      var basis = metric === 'score_raw' ? 'raw' : 'final', refExam = exams.filter(function (exam) { return valueFor(exam, focus, metric, rankScope) !== null; }).slice(-1)[0];
      scaleMismatch = uniqueScales.length > 1 || allScales.some(function (v) { return v === null; }) || (refExam && exams.some(function (exam) { return !scoreComparable(exam, refExam, focus, basis); }));
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
      (missing ? '<span class="a38-muted">缺少 ' + missing + ' 个点，图线断开，不按 0 处理</span>' : '') + '</div>' +
      '<div class="a38-point-strip">' + series.map(function (item) { return '<button type="button" class="a38-point-button ' + (item.value === null ? 'missing' : '') + '" data-a38-point-exam="' + esc(item.key) + '">' + esc(item.label) + '</button>'; }).join('') + '</div><div class="a38-point-detail" data-a38-point-detail>点击考试点查看日期、数值、名次和参考人数。</div>';
  }
  function deltaChart(data) {
    var values = data.valid;
    if (values.length < 2) return '<div class="a38-empty">至少需要 2 次有效记录才能查看相邻变化。</div>';
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var scaleChanged = (data.metric === 'score_final' || data.metric === 'score_raw') && !scoreComparable(values[i - 1].exam, values[i].exam, data.focus, data.metric === 'score_raw' ? 'raw' : 'final');
      var delta = scaleChanged ? null : metricIsRank(data.metric) ? values[i - 1].value - values[i].value : values[i].value - values[i - 1].value;
      rows.push({ label: values[i].label, delta: delta, scaleChanged: scaleChanged });
    }
    var max = Math.max.apply(null, rows.filter(function (r) { return r.delta !== null; }).map(function (r) { return Math.abs(r.delta); }).concat([1]));
    return '<div class="a38-delta-list">' + rows.slice(-8).map(function (r) {
      var width = r.delta === null ? 0 : Math.round(Math.abs(r.delta) / max * 100);
      var positive = r.delta === null || r.delta >= 0;
      var style = positive ? 'width:' + (width / 2) + '%;margin-left:50%' : 'width:' + (width / 2) + '%;margin-left:' + (50 - width / 2) + '%';
      return '<div class="a38-delta-row"><span>' + esc(r.label) + '</span><div class="a38-delta-track"><i class="' +
        (positive ? 'positive' : 'negative') + '" style="' + style + '"></i></div><b class="' +
        (r.scaleChanged ? '' : positive ? 'positive' : 'negative') + '">' + (r.scaleChanged ? '满分变化' : (r.delta > 0 ? '+' : '') + r.delta +
        (data.metric === 'rate' ? ' 个百分点' : metricIsRank(data.metric) ? ' 个百分点' : ' 分')) + '</b></div>';
    }).join('') + '</div>' + (data.valid.length < data.records.length ? '<p class="a38-caption">缺失点不会补成 0；跨过缺失时，标签写作“相邻有效记录”，不等同于相邻考试。</p>' : '');
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
      rows.push({ subject: subject, pos: pos, rate: rate, score: score, current: current, change: change,
        n: rankRecords.length, rankLabel: data.rankLabel, max: sumMax(exam, focus, 'final') });
    });
    return rows;
  }
  function barChart(rows, mode) {
    var valid = rows.filter(function (r) { return r.current !== null; });
    if (!valid.length) return '<div class="a38-empty">最新一场没有完整的同场科目数据。</div>';
    return '<div class="a38-bars">' + valid.map(function (r) {
      var width = mode === 'rank' ? clamp(100 - r.current, 3, 100) : mode === 'rate' ? clamp(r.current, 3, 100) : r.max ? clamp(r.score / r.max * 100, 3, 100) : 0;
      var text = mode === 'rank' ? '前' + round(r.current, 1) + '%' : mode === 'rate' ? round(r.current, 1) + '%' : r.max ? round(r.score, 1) + '/' + round(r.max, 1) : round(r.score, 1) + '分 · 缺满分';
      var tone = mode === 'rank' ? (r.current <= 20 ? 'good' : r.current <= 50 ? 'mid' : 'watch') : '';
      return '<div class="a38-bar-row"><span>' + esc(r.subject) + '</span><div><i class="' + tone + '" style="width:' + width + '%"></i></div><b>' + esc(text) + '</b></div>';
    }).join('') + '</div>';
  }
  function radarChart(data) {
    var exam = data.latest;
    if (!exam) return '<div class="a38-empty">还没有最新考试。</div>';
    var radarMetric = metricIsRank(data.metric) ? 'rank' : data.metric === 'rate' ? 'rate' : 'score';
    var values = data.subjects.map(function (subject) {
      var focus = '__sub:' + subject;
      var p = rankPercent(exam, focus, data.rankScope);
      var rate = valueFor(exam, focus, 'rate', data.rankScope);
      var score = valueFor(exam, focus, 'score_final', data.rankScope), max = sumMax(exam, focus, 'final');
      if (radarMetric === 'rank') return { subject: subject, value: p === null ? null : 100 - p, label: p === null ? '—' : '前' + round(p, 1) + '%' };
      if (radarMetric === 'rate') return { subject: subject, value: rate, label: rate === null ? '—' : round(rate, 1) + '%' };
      return { subject: subject, value: score !== null && max ? clamp(score / max * 100, 0, 100) : null,
        label: score === null || !max ? '—' : round(score, 1) + '/' + round(max, 1) };
    });
    var missing = values.filter(function (x) { return x.value === null; }).map(function (x) { return x.subject; });
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
      labels += '<text x="' + label.x.toFixed(1) + '" y="' + (label.y + 3).toFixed(1) + '" text-anchor="middle" font-size="10" fill="var(--muted,#788392)">' + esc(item.subject + (item.value === null ? ' · —' : '')) + '</text>';
    });
    var poly = missing.length ? '' : '<polygon points="' + values.map(function (item, i) {
      var p = point(radius * clamp(item.value / 100, 0.03, 1), i);
      return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ') + '" fill="var(--accent-soft,#eef1ff)" stroke="var(--accent,#5d72e8)" stroke-width="2" />';
    var dots = values.filter(function (item) { return item.value !== null; }).map(function (item) {
      var i = values.indexOf(item);
      var p = point(radius * clamp(item.value / 100, 0.03, 1), i);
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.5" fill="var(--accent,#5d72e8)" />';
    }).join('');
    return '<div class="a38-radar-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="同场科目结构雷达图">' +
      rings + axes + poly + dots + labels +
      '</svg><p class="a38-caption">同一场考试 · 统一口径：' + esc(radarMetric === 'rank' ? data.rankLabel : radarMetric === 'rate' ? '得分率' : '按各科满分归一化的最终分') + '。' + (missing.length ? '缺少' + esc(missing.join('、')) + '的该指标，保留为空，不用其他单位补位。' : '') + '</p></div>';
  }
  function quadrant(data) {
    var exam = data.latest, rows = subjectRows(data).filter(function (r) { return r.pos !== null && r.change !== null; });
    if (!exam || rows.length < 2) return '<div class="a38-empty">至少需要 2 个科目各有 2 次年级排名，才能判断“当前位置 × 近期变化”。</div>';
    var W = 520, H = 280, L = 48, R = 18, T = 20, B = 40;
    var xMax = Math.max(5, Math.max.apply(null, rows.map(function (r) { return Math.abs(r.change); })));
    var x0 = L + (W - L - R) / 2;
    var yMin = 0, yMax = 100;
    function x(v) { return L + (v + xMax) / (xMax * 2) * (W - L - R); }
    function y(v) { return T + (v - yMin) / Math.max(1, yMax - yMin) * (H - T - B); }
    var s = '<line x1="' + x0 + '" y1="' + T + '" x2="' + x0 + '" y2="' + (H - B) + '" stroke="var(--line,#e8ebf0)" stroke-dasharray="4 3" />' +
      '<line x1="' + L + '" y1="' + y(50) + '" x2="' + (W - R) + '" y2="' + y(50) + '" stroke="var(--line,#e8ebf0)" stroke-dasharray="4 3" />' +
      '<text x="' + L + '" y="' + (H - 10) + '" font-size="10" fill="var(--muted,#788392)">近期回落 ←</text>' +
      '<text x="' + (W - R) + '" y="' + (H - 10) + '" text-anchor="end" font-size="10" fill="var(--muted,#788392)">近期改善 →</text>' +
      '<text x="' + (L - 6) + '" y="' + (T + 4) + '" text-anchor="end" font-size="9" fill="var(--muted,#788392)">前0%</text>' +
      '<text x="' + (L - 6) + '" y="' + (H - B) + '" text-anchor="end" font-size="9" fill="var(--muted,#788392)">前100%</text>';
    rows.forEach(function (r) {
      var px = x(r.change), py = y(r.pos);
      s += '<g class="a38-q-point"><circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="11" fill="transparent" />' +
        '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" fill="var(--panel-solid,#fff)" stroke="var(--accent,#5d72e8)" stroke-width="2" />' +
        '<text x="' + px.toFixed(1) + '" y="' + (py - 9).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text,#18212f)">' + esc(r.subject) + '</text></g>';
    });
    return '<div class="a38-chart-scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;min-width:500px;height:auto">' + s + '</svg></div>' +
      '<p class="a38-caption">横轴为近期' + esc(data.rankLabel) + '改善/回落的百分点，纵轴为本次' + esc(data.rankLabel) + '（越靠上越好）。分界线为前50%，这里只表示变化组合，不表示提分优先级。</p>';
  }
  function goalRows(data) {
    var g = longGoalData(), rows = [];
    function addRow(label, focus, goal) {
      var current = data.latest && scoreComplete(data.latest, focus, 'final') ? valueFor(data.latest, focus, 'score_final', data.rankScope) : null;
      var currentMax = data.latest ? sumMax(data.latest, focus, 'final') : null;
      var values = data.exams.map(function (e) {
        if (!scoreComplete(e, focus, 'final')) return null;
        var value = valueFor(e, focus, 'score_final', data.rankScope), max = sumMax(e, focus, 'final');
        if (value === null || max === null || (currentMax !== null && Math.abs(max - currentMax) > 1e-9)) return null;
        return value;
      }).filter(function (v) { return v !== null; });
      var attempts = 0, hit = 0;
      data.exams.forEach(function (e) {
        var a = scoreComplete(e, focus, 'final') ? valueFor(e, focus, 'score_final', data.rankScope) : null, t = goal;
        if (a !== null && t !== null) { attempts++; if (a >= t) hit++; }
      });
      if (goal !== null || current !== null || attempts) rows.push({ subject: label, focus: focus, goal: goal, current: current,
        max: currentMax, attempts: attempts, hit: hit, values: values, median: median(values), best: values.length ? Math.max.apply(null, values) : null,
        min: values.length ? Math.min.apply(null, values) : null });
    }
    var selected = goalFor(data.focus);
    addRow(data.focusLabel, data.focus, selected.value);
    data.subjects.forEach(function (subject) {
      var subjectGoal = num((g.subjects || {})[subject]);
      if (subjectGoal === null) subjectGoal = goalFor('__sub:' + subject).value;
      addRow(subject, '__sub:' + subject, subjectGoal);
    });
    return rows;
  }
  function goalBar(row) {
    if (row.goal === null && row.current === null) return '';
    var scale = Math.max(row.max || 0, row.goal || 0, row.current || 0, 1);
    var width = row.current !== null ? clamp(row.current / scale * 100, 0, 100) : 0;
    var targetWidth = row.goal !== null ? clamp(row.goal / scale * 100, 0, 100) : null;
    var valueText = row.current === null ? '暂无当前最终分' : round(row.current, 1) + (row.max !== null ? '/' + round(row.max, 1) : ' 分');
    var targetText = row.goal === null ? '未设置目标' : '目标 ' + round(row.goal, 1) + (row.max !== null ? '/' + round(row.max, 1) : ' 分');
    var gapText = row.goal !== null && row.current !== null ? (row.current >= row.goal ? '已达到目标' : '还差 ' + round(row.goal - row.current, 1) + ' 分') : '';
    var ref = row.values && row.values.length ? '近期中位数 ' + round(row.median, 1) + ' · 最好 ' + round(row.best, 1) + ' · 范围 ' + round(row.min, 1) + '–' + round(row.best, 1) : '暂无同满分可比较历史';
    return '<div class="a38-goal-row"><div class="a38-goal-head"><b>' + esc(row.subject) + '</b><span>' +
      valueText + (row.goal !== null ? ' · ' + targetText : '') + '</span></div><div class="a38-goal-track"><i style="width:' + width + '%"></i>' +
      (targetWidth !== null ? '<em style="left:' + targetWidth + '%"></em>' : '') +
      '</div><small>' + (row.goal === null ? '未设置长期目标 · ' : gapText + ' · ') + '按当前目标回看：最近 ' + row.attempts + ' 次中达成 ' + row.hit + ' 次' +
      '</small><p class="a38-caption">' + esc(ref) + '</p></div>';
  }
  function compareIds(data) {
    var c = config(), available = data.exams.map(examId);
    var chosen = Array.isArray(c.compareIds) ? c.compareIds.filter(function (id) { return available.indexOf(String(id)) >= 0; }) : [];
    if (chosen.length < 2) chosen = data.exams.slice(-2).map(examId);
    return data.exams.filter(function (exam) { return chosen.indexOf(examId(exam)) >= 0; }).map(examId);
  }
  function compareData(data) {
    var ids = compareIds(data), exams = ids.map(function (id) { return data.exams.filter(function (e) { return examId(e) === String(id); })[0]; }).filter(Boolean);
    return { ids: ids, exams: exams };
  }
  function contributionChart(data, from, to) {
    if ((data.metric !== 'score_final' && data.metric !== 'score_raw') || data.focus !== '__total__') return '';
    var basis = data.metric === 'score_raw' ? 'raw' : 'final', rows = [], sumA = 0, sumB = 0;
    var fromSubjects = Object.keys(from && from.scores || {}).filter(function (subject) { var r = rowOf(from, subject); return !r.excludeFromTotal && rowScore(r, basis) !== null; });
    var toSubjects = Object.keys(to && to.scores || {}).filter(function (subject) { var r = rowOf(to, subject); return !r.excludeFromTotal && rowScore(r, basis) !== null; });
    if (fromSubjects.length !== toSubjects.length || fromSubjects.some(function (subject) { return toSubjects.indexOf(subject) < 0; })) return '';
    if (sumMax(from, '__total__', basis) === null || sumMax(to, '__total__', basis) === null ||
      Math.abs(sumMax(from, '__total__', basis) - sumMax(to, '__total__', basis)) > 1e-9) return '';
    for (var i = 0; i < fromSubjects.length; i++) {
      var subject = fromSubjects[i], aRow = rowOf(from, subject), bRow = rowOf(to, subject);
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
  function contributionReason(data, from, to) {
    if (data.metric !== 'score_final' && data.metric !== 'score_raw') return '当前指标不是分数，贡献图只解释分数构成。';
    if (data.focus !== '__total__') return '当前分析对象不是总分，贡献图只在总分对比中显示。';
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    var a = Object.keys(from && from.scores || {}).filter(function (s) { var r = rowOf(from, s); return !r.excludeFromTotal && rowScore(r, basis) !== null; });
    var b = Object.keys(to && to.scores || {}).filter(function (s) { var r = rowOf(to, s); return !r.excludeFromTotal && rowScore(r, basis) !== null; });
    if (a.length !== b.length || a.some(function (s) { return b.indexOf(s) < 0; })) return '两场的实际计分科目集合不同。';
    if (sumMax(from, '__total__', basis) === null || sumMax(to, '__total__', basis) === null || Math.abs(sumMax(from, '__total__', basis) - sumMax(to, '__total__', basis)) > 1e-9) return '两场总分满分或计分口径不同。';
    for (var i = 0; i < a.length; i++) {
      var ar = rowOf(from, a[i]), br = rowOf(to, a[i]);
      if (rowMax(ar, basis) === null || rowMax(br, basis) === null || Math.abs(rowMax(ar, basis) - rowMax(br, basis)) > 1e-9) return a[i] + '的满分或数据不完整。';
    }
    return '两场数据尚未满足完整分解条件。';
  }
  function compareTable(data) {
    var cmp = compareData(data);
    if (cmp.exams.length < 2) return '<div class="a38-empty">选择至少 2 次考试后查看对比。</div>';
    var from = cmp.exams[cmp.exams.length - 2], to = cmp.exams[cmp.exams.length - 1], rows = [];
    var subjects = data.subjects.slice();
    subjects.unshift('__focus__');
    subjects.forEach(function (subject) {
      var focus = subject === '__focus__' ? data.focus : '__sub:' + subject;
      var values = cmp.exams.map(function (exam) { return valueFor(exam, focus, data.metric, data.rankScope); });
      if (!values.some(function (v) { return v !== null; })) return;
      var a = values[values.length - 2], b = values[values.length - 1];
      var delta = a !== null && b !== null ? (metricIsRank(data.metric) ? a - b : b - a) : null;
      var maxChanged = (data.metric === 'score_final' || data.metric === 'score_raw') && !scoreComparable(from, to, focus, data.metric === 'score_raw' ? 'raw' : 'final');
      rows.push({ label: subject === '__focus__' ? data.focusLabel : subject, focus: focus, values: values, delta: delta, maxChanged: maxChanged });
    });
    var head = cmp.exams.map(function (exam) { return '<th>' + esc(shortName(exam.name || dateText(exam.exam_date))) + '<small>' + esc(dateText(exam.exam_date)) + '</small></th>'; }).join('');
    var chart = contributionChart(data, from, to), reason = chart ? '' : contributionReason(data, from, to);
    return '<div class="a38-compare-meta">按日期从早到晚展示 ' + cmp.exams.length + ' 场；最后两场为“相邻变化”基准：' + esc(shortName(from.name)) + ' → ' + esc(shortName(to.name)) +
      ' · 当前指标：' + esc(metricLabel(data.metric)) + '</div><div class="a38-scroll"><table class="a38-table"><thead><tr><th>项目</th>' + head + '<th>相邻变化</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td>' + r.values.map(function (value, i) {
          return '<td>' + (value === null ? '—' : metricValueText(value, data.metric, cmp.exams[i], r.focus)) + '</td>';
        }).join('') + '<td class="' + (r.delta === null || r.maxChanged ? '' : r.delta >= 0 ? 'a38-positive' : 'a38-negative') + '">' +
          (r.maxChanged ? '满分变化' : r.delta === null ? '—' : (r.delta > 0 ? '+' : '') + round(r.delta, 1) + (metricIsRank(data.metric) || data.metric === 'rate' ? '个百分点' : '分')) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (chart || '<p class="a38-caption">贡献图暂不可用：' + esc(reason) + '</p>') + '<p class="a38-caption">贡献图只分解数值从哪些科目变化而来，不解释原因，也不代表能力提升比例。</p>';
  }
  function multiRadarChart(data) {
    var cmp = compareData(data);
    if (cmp.exams.length < 3) return '<div class="a38-empty">选择至少 3 场考试后查看多考试雷达。</div>';
    var metric = data.metric, subjects = data.subjects.slice(), series = [];
    for (var i = 0; i < cmp.exams.length; i++) {
      var exam = cmp.exams[i], vals = [];
      for (var j = 0; j < subjects.length; j++) {
        var focus = '__sub:' + subjects[j], value = valueFor(exam, focus, metric, data.rankScope), max = sumMax(exam, focus, metric === 'score_raw' ? 'raw' : 'final');
        if (value === null || (!metricIsRank(metric) && metric !== 'rate' && !max)) return '<div class="a38-empty">多考试雷达需要每场都具备统一的' + esc(metricLabel(metric)) + '和科目满分。</div>';
        vals.push(metricIsRank(metric) ? 100 - value : metric === 'rate' ? value : clamp(value / max * 100, 0, 100));
      }
      series.push({ exam: exam, vals: vals });
    }
    var W = 380, H = 310, cx = 190, cy = 142, radius = 96, n = subjects.length;
    if (n < 3) return '<div class="a38-empty">至少需要 3 个科目才能绘制多考试雷达。</div>';
    function point(r, k) { var angle = -Math.PI / 2 + k * Math.PI * 2 / n; return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }; }
    var grid = '';
    [0.25, 0.5, 0.75, 1].forEach(function (scale) { grid += '<polygon points="' + subjects.map(function (_, k) { var p = point(radius * scale, k); return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ') + '" fill="none" stroke="var(--line,#e8ebf0)" />'; });
    var axes = '', labels = '';
    subjects.forEach(function (subject, k) { var outer = point(radius, k), label = point(radius + 19, k); axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + outer.x.toFixed(1) + '" y2="' + outer.y.toFixed(1) + '" stroke="var(--line,#e8ebf0)" />'; labels += '<text x="' + label.x.toFixed(1) + '" y="' + (label.y + 3).toFixed(1) + '" text-anchor="middle" font-size="10" fill="var(--muted,#788392)">' + esc(subject) + '</text>'; });
    var colors = ['#5d72e8', '#32a77a', '#e59b45', '#b65de8'];
    var polygons = series.map(function (item, si) { var color = colors[si % colors.length], pts = item.vals.map(function (value, k) { var p = point(radius * clamp(value / 100, 0.03, 1), k); return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '); return '<polygon points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" />'; }).join('');
    return '<div class="a38-radar-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="多考试科目雷达图">' + grid + axes + polygons + labels + '</svg><div class="a38-chart-legend">' + series.map(function (item, i) { return '<span><i class="a38-dot" style="background:' + colors[i % colors.length] + '"></i>' + esc(shortName(item.exam.name || dateText(item.exam.exam_date))) + '</span>'; }).join('') + '</div><p class="a38-caption">统一口径：' + esc(metricLabel(metric)) + '；按日期排序，雷达只用于形状对照。</p></div>';
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
        valid = valid.filter(function (r) { return scoreComparable(r.exam, data.latestRecord.exam, data.focus, data.metric === 'score_raw' ? 'raw' : 'final'); });
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
      var counts = nums.length && hi === lo ? [{ label: String(round(lo, 1)), count: nums.length }] : [0, 1, 2, 3, 4].map(function (i) {
        var a = lo + i * step, b = i === 4 ? hi + 0.001 : lo + (i + 1) * step;
        return { label: round(a, 1) + '–' + round(b, 1), count: valid.filter(function (r) { return r.value >= a && r.value < b; }).length };
      });
    }
    var max = Math.max.apply(null, counts.map(function (x) { return x.count; }).concat([1]));
    var best = valid.length ? valid.slice().sort(function (a, b) { return metricIsRank(data.metric) ? a.value - b.value : b.value - a.value; })[0] : null;
    var current = valid.length ? valid[valid.length - 1] : null;
    var bestRun = 0, run = 0, bestEnd = -1, streakRows = [];
    for (var ri = 1; ri < data.records.length; ri++) {
      var prev = data.records[ri - 1], curr = data.records[ri];
      var sameScale = data.metric !== 'score_final' && data.metric !== 'score_raw' || scoreComparable(prev.exam, curr.exam, data.focus, data.metric === 'score_raw' ? 'raw' : 'final');
      var step = prev.value !== null && curr.value !== null && sameScale ? (metricIsRank(data.metric) ? prev.value - curr.value : curr.value - prev.value) : null;
      if (step !== null && step > 0) { run++; if (run > bestRun) { bestRun = run; bestEnd = ri; } }
      else run = 0;
    }
    var streak = bestRun >= 2 ? '连续改善：' + bestRun + ' 次变化（' + shortName(data.records[bestEnd - bestRun].exam.name) + ' → ' + shortName(data.records[bestEnd].exam.name) + '）' :
      '连续改善：当前范围没有至少两次且中间无缺失的连续段';
    var nums = valid.map(function (r) { return r.value; });
    var medianText = nums.length ? metricValueText(median(nums), data.metric, current && current.exam, data.focus) : '—';
    var rangeText = nums.length ? metricValueText(Math.min.apply(null, nums), data.metric, current && current.exam, data.focus) + '–' + metricValueText(Math.max.apply(null, nums), data.metric, current && current.exam, data.focus) : '—';
    return '<div class="a38-history-summary"><div><b>' + valid.length + '</b><span>同口径有效记录</span></div><div><b>' +
      (best ? metricValueText(best.value, data.metric, best.exam, data.focus) : '—') + '</b><span>个人最好</span></div><div><b>' +
      (current ? metricValueText(current.value, data.metric, current.exam, data.focus) : '—') + '</b><span>当前同口径最新</span></div><div><b>' + medianText + '</b><span>历史中位数</span></div><div><b>' + rangeText + '</b><span>历史范围</span></div></div>' +
      '<div class="a38-histogram">' + counts.map(function (x) {
        return '<div><i style="height:' + (x.count ? Math.max(4, Math.round(x.count / max * 100)) : 0) + '%"></i><span>' + esc(x.label) + '</span><b>' + x.count + '</b></div>';
      }).join('') + '</div><div class="a38-history-record">' + esc(streak) + '<br>' + esc(targetStreak(data)) + '</div><p class="a38-caption">' + (metricIsRank(data.metric) ? '这里比较的是你自己的历史位比，不是全体同学的分布。' :
      '原始分 / 最终分只在同一计分口径、科目集合与相同满分的记录中比较；不同满分不会共用同一热力尺度。') + '</p>' +
      (best ? '<button type="button" class="a38-link" data-a38-focus-exam="' + esc(best.key) + '">定位个人最好：' + esc(shortName(best.exam.name)) + '</button>' : '');
  }
  function targetValueFor(exam, focus) {
    if (!exam) return null;
    if (focus && focus.indexOf('__sub:') === 0) {
      var subjectTarget = num(rowOf(exam, focus.slice(6)).target);
      return subjectTarget === null ? goalFor(focus).value : subjectTarget;
    }
    if (focus && focus.indexOf('__combo:') === 0) {
      var sum = 0, found = false;
      (comboById(focus.slice(8)).subjects || []).forEach(function (subject) { var value = num(rowOf(exam, subject).target); if (value !== null) { sum += value; found = true; } });
      return found ? sum : goalFor(focus).value;
    }
    var direct = firstNumber(exam, ['total_target_score', 'target_score']);
    return direct === null ? goalFor(focus).value : direct;
  }
  function targetStreak(data) {
    var goal = goalFor(data.focus).value;
    if (goal === null) return '连续达标：未设置当前目标';
    var best = 0, bestStart = -1, run = 0, start = -1;
    data.exams.forEach(function (exam, index) {
      var actual = scoreComplete(exam, data.focus, 'final') ? valueFor(exam, data.focus, 'score_final', data.rankScope) : null;
      if (actual !== null && actual >= goal) { if (!run) start = index; run++; if (run > best) { best = run; bestStart = start; } }
      else { run = 0; start = -1; }
    });
    if (!best) return '连续达标：当前范围没有达标记录';
    var end = bestStart + best - 1;
    return '连续达标：' + best + ' 场（' + shortName(data.exams[bestStart].name || dateText(data.exams[bestStart].exam_date)) + ' → ' + shortName(data.exams[end].name || dateText(data.exams[end].exam_date)) + '）';
  }
  function matrixText(value, kind, exam, focus, data) {
    if (value === null || value === undefined) return '—';
    if (kind === 'rank') return '第' + value + '名';
    if (kind === 'people') return value + '人';
    return metricValueText(value, kind === 'target' ? 'score_final' : data.metric, exam, focus);
  }
  function missingCellText(exam, focus, kind, data) {
    if (kind === 'target') return '未设置目标';
    if (kind === 'rank') {
      var ri = rankInfo(exam, focus, data.rankScope);
      return ri.rank !== null ? '第' + ri.rank + '名 · 缺人数' : '—';
    }
    if (kind === 'people') return '—';
    if (focus && focus.indexOf('__sub:') === 0) {
      var row = rowOf(exam, focus.slice(6));
      if (isAbsent(row)) return '缺考';
      if (isNotApplicable(row) || row.excludeFromTotal) return '不适用';
      if (!Object.keys(row).length) return '未录入';
      return '未录入';
    }
    if (isExamAbsent(exam) && !hasAnyScore(exam)) return '缺考';
    if (!hasAnyScore(exam)) return '未录入';
    return scoreComplete(exam, focus, 'final') ? '—' : '科目未齐';
  }
  function matrix(data) {
    var metric = data.metric, subjects = data.subjects, c = config(), kind = ['current', 'target', 'rank', 'people'].indexOf(c.matrixKind) >= 0 ? c.matrixKind : 'current', matrixLabel = kind === 'current' ? metricLabel(metric) : kind === 'target' ? '目标最终分' : kind === 'rank' ? '名次' : '参考人数', exams = data.exams.filter(function (exam) {
      return !c.matrixQuery || String(exam.name || '').toLowerCase().indexOf(String(c.matrixQuery).toLowerCase()) >= 0 || dateText(exam.exam_date).indexOf(c.matrixQuery) >= 0;
    }).slice();
    function valueForMatrix(exam, focus) { if (kind === 'target') return targetValueFor(exam, focus); if (kind === 'rank') return rankInfo(exam, focus, data.rankScope).rank; if (kind === 'people') return rankInfo(exam, focus, data.rankScope).people; return valueFor(exam, focus, metric, data.rankScope); }
    if (c.matrixSort === 'value') exams.sort(function (a, b) { var av = valueForMatrix(a, data.focus), bv = valueForMatrix(b, data.focus); return (bv === null ? -Infinity : bv) - (av === null ? -Infinity : av); });
    else if (c.matrixSort === 'name') exams.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    var rows = exams.map(function (exam) {
      var cells = subjects.map(function (subject) {
        var val = valueForMatrix(exam, '__sub:' + subject);
        var max = metric === 'score_raw' ? sumMax(exam, '__sub:' + subject, 'raw') : sumMax(exam, '__sub:' + subject, 'final');
        var ratio = kind === 'current' && val !== null ? (metric === 'rate' ? clamp(val / 100, 0, 1) : max ? clamp(val / max, 0, 1) : null) : null;
        var heatValue = kind === 'current' && metricIsRank(metric) ? (val === null ? null : clamp(1 - val / 100, 0, 1)) : ratio;
        var heat = heatValue !== null ? ' style="--heat:' + Math.round(heatValue * 100) + '%"' : '';
        var cellClass = val === null ? 'missing' : kind === 'rank' ? 'rank-cell' : kind === 'people' ? 'people-cell' : kind === 'target' ? 'target-cell' : metricIsRank(metric) ? 'rank-cell' : metric === 'rate' ? 'rate-cell' : 'score-cell';
        if (val !== null && ratio !== null && ratio < 0.6 && !metricIsRank(metric)) cellClass += ' low-cell';
        return '<td class="' + cellClass + '"' + heat + '>' +
          (val === null ? missingCellText(exam, '__sub:' + subject, kind, data) : matrixText(val, kind, exam, '__sub:' + subject, data)) + '</td>';
      }).join('');
      var total = valueForMatrix(exam, '__total__'), focusValue = data.focus === '__total__' ? null : valueForMatrix(exam, data.focus);
      return '<tr data-a38-matrix-row="' + esc(examId(exam)) + '"><th>' + esc(shortName(exam.name || dateText(exam.exam_date))) +
        '<small>' + esc(dateText(exam.exam_date)) + '</small><button type="button" class="a38-link matrix-open" data-a38-matrix-open="' + esc(examId(exam)) + '">查看记录</button></th>' + cells + '<td class="focus-cell">' +
        (total === null ? missingCellText(exam, '__total__', kind, data) : matrixText(total, kind, exam, '__total__', data)) + '</td>' + (data.focus === '__total__' ? '' : '<td class="focus-cell">' + (focusValue === null ? missingCellText(exam, data.focus, kind, data) : matrixText(focusValue, kind, exam, data.focus, data)) + '</td>') + '</tr>';
    }).join('');
    if (!rows) return '<div class="a38-empty">当前范围没有可展示的记录。</div>';
    return '<div class="a38-matrix-tools"><label>矩阵指标<select data-a38-matrix-kind><option value="current"' + (kind === 'current' ? ' selected' : '') + '>' + esc(metricLabel(metric)) + '</option><option value="target"' + (kind === 'target' ? ' selected' : '') + '>目标最终分</option><option value="rank"' + (kind === 'rank' ? ' selected' : '') + '>名次</option><option value="people"' + (kind === 'people' ? ' selected' : '') + '>参考人数</option></select></label><label>筛选考试<input type="search" data-a38-matrix-query value="' + esc(c.matrixQuery || '') + '" placeholder="名称或日期"></label><label>排序<select data-a38-matrix-sort><option value="date"' + (c.matrixSort === 'date' ? ' selected' : '') + '>按日期</option><option value="value"' + (c.matrixSort === 'value' ? ' selected' : '') + '>' + esc(data.focusLabel) + '</option><option value="name"' + (c.matrixSort === 'name' ? ' selected' : '') + '>按名称</option></select></label><span class="a38-muted">可左右滑动；点击考试可查看原始记录。</span></div><div class="a38-matrix-scroll"><table class="a38-table a38-matrix"><thead><tr><th>考试</th>' +
      subjects.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '<th>总分</th>' + (data.focus === '__total__' ? '' : '<th>当前对象 · ' + esc(data.focusLabel) + '</th>') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div><p class="a38-caption">' +
      (kind === 'rank' ? '名次只在有名次时显示，位比需要另行切换查看；名次越小越靠前。' : kind === 'people' ? '参考人数表示当场记录的排名范围，不等于全体同学人数。' : kind === 'target' ? '目标按最终分显示；未设置目标的单元格留空。' : metricIsRank(metric) ? '颜色越深代表位比更靠前；位比统一为 0–100%，越小越好。' :
        metric === 'rate' ? '颜色越深代表得分率更高，不把不同科目的得分率直接解释为试卷难度或薄弱程度。' :
          '分数颜色只按该科该场的满分换算，不跨不同满分共用刻度；橙色只提示相对满分较低，不等于学习优先级；缺失值不会补成 0。') + '</p>';
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
    var rows = data.exams.map(function (exam) {
      var year = rankInfo(exam, data.focus, 'year'), cls = rankInfo(exam, data.focus, 'class');
      return '<tr><td>' + esc(shortName(exam.name || dateText(exam.exam_date))) + '<small>' + esc(dateText(exam.exam_date)) + '</small></td><td>' +
        (year.percent === null ? (year.rank === null ? '—' : '第' + year.rank + '名 · 缺人数') : '前' + year.percent + '%') + '</td><td>' +
        (cls.percent === null ? (cls.rank === null ? '—' : '第' + cls.rank + '名 · 缺人数') : '前' + cls.percent + '%') + '</td><td>' +
        (year.people === null ? '—' : year.people) + ' / ' + (cls.people === null ? '—' : cls.people) + '</td><td>' + esc(year.source + (cls.source !== 'missing' ? ' / ' + cls.source : '')) + '</td></tr>';
    }).filter(function (row) { return row.indexOf('<td>—</td><td>—</td><td>—</td>') < 0; }).join('');
    if (!rows) return '<div class="a38-empty">当前范围没有可用的参考人数记录。</div>';
    return '<div class="a38-subsection"><b>排名来源与参考人数</b><div class="a38-scroll"><table class="a38-table"><thead><tr><th>考试</th><th>年级位置</th><th>班级位置</th><th>参考人数（年 / 班）</th><th>来源（年 / 班）</th></tr></thead><tbody>' + rows +
      '</tbody></table></div><p class="a38-caption">“位置”由当前记录的名次、人数或明确录入的位比得到；只有名次没有人数时只显示名次，不进入位比计算。表格展示当前范围全部考试。</p></div>';
  }
  function systemInsights(data) {
    var out = [], vals = data.records.map(function (r) { return r.value; });
    if (vals.length >= 3 && metricIsRank(data.metric)) {
      var tailRecords = data.records.slice(-3), tail = tailRecords.map(function (r) { return r.value; });
      if (tail.every(function (v) { return v !== null; })) {
        var declining = tail[1] > tail[0] && tail[2] > tail[1], improving = tail[1] < tail[0] && tail[2] < tail[1];
        if (declining) out.push({ tone: 'warn', title: '最近 3 次' + data.rankLabel + '逐次回落', body: tailRecords.map(function (r) { return shortName(r.exam.name || dateText(r.exam.exam_date)); }).join(' → ') + '；这里只描述位置变化，不推断原因。' });
        if (improving) out.push({ tone: 'good', title: '最近 3 次' + data.rankLabel + '逐次靠前', body: tailRecords.map(function (r) { return shortName(r.exam.name || dateText(r.exam.exam_date)); }).join(' → ') + '；这里只描述位置变化，不推断原因。' });
      }
    }
    if (metricIsRank(data.metric)) {
      data.subjects.forEach(function (subject) {
        if (out.length >= 3) return;
        var rows = data.exams.slice(-3).map(function (exam) { return { exam: exam, value: rankPercent(exam, '__sub:' + subject, data.rankScope) }; });
        var sv = rows.map(function (r) { return r.value; });
        if (sv.length === 3 && sv.every(function (v) { return v !== null; })) {
          if (sv[1] < sv[0] && sv[2] < sv[1]) out.push({ tone: 'good', title: subject + '最近 3 次' + data.rankLabel + '逐次靠前', body: rows.map(function (r) { return shortName(r.exam.name || dateText(r.exam.exam_date)); }).join(' → ') + '；共 3 次有效记录。' });
          else if (sv[1] > sv[0] && sv[2] > sv[1]) out.push({ tone: 'warn', title: subject + '最近 3 次' + data.rankLabel + '逐次回落', body: rows.map(function (r) { return shortName(r.exam.name || dateText(r.exam.exam_date)); }).join(' → ') + '；共 3 次有效记录。' });
        }
      });
    }
    var q = quality(data);
    if (q.missingTotal.length) out.push({ tone: 'info', title: '有 ' + q.missingTotal.length + ' 场没有可用成绩', body: '这些场次不按 0 分进入总分或得分率；缺考只有在记录里明确标记时才单独计数。' });
    if (q.rankMissingPeople) out.push({ tone: 'info', title: q.rankMissingPeople + ' 场只有名次，缺参考人数', body: '这些场次显示名次，但不进入位比趋势或位比预测。' });
    var goal = goalProgress(data, data.focus);
    if (goal.goal.value !== null && goal.current !== null && goal.current < goal.goal.value) {
      var gap = goal.goal.value - goal.current;
      if (gap <= Math.max(5, goal.goal.value * 0.05)) out.push({ tone: 'info', title: '当前接近目标', body: '还差 ' + round(gap, 1) + ' 分；这是距离描述，不代表下一次一定能达到。' });
    }
    if (q.poolChanges) out.push({ tone: 'warn', title: '有 ' + q.poolChanges + ' 处参考人数变化较大', body: '这些相邻场次的位比不宜直接当作同一竞争池内的进退。' });
    if (!out.length) out.push({ tone: 'neutral', title: '暂无需要特别关注的变化', body: '当前范围内没有检测到连续变化、明显数据缺口或接近目标的记录。' });
    return out.slice(0, 3);
  }
  function reviews() { return readJson(REVIEW_KEY + userKey(), []); }
  function saveReviews(list) { writeJson(REVIEW_KEY + userKey(), list); }
  function reviewForm(data) {
    var latestId = data.latest ? examId(data.latest) : '';
    return '<div class="a38-review-form" data-a38-review-form hidden><label>关联考试<select class="a38-review-exam">' +
      data.raw.slice().reverse().map(function (e) { return '<option value="' + esc(examId(e)) + '"' + (examId(e) === latestId ? ' selected' : '') + '>' + esc(e.name || dateText(e.exam_date)) + '</option>'; }).join('') +
      '</select></label><label>我观察到的失分 / 变化<textarea class="a38-review-note" rows="3" placeholder="例如：英语阅读第二篇时间不够"></textarea></label>' +
      '<label>我的下一步计划<textarea class="a38-review-plan" rows="3" placeholder="例如：下次先做完阅读再检查"></textarea></label>' +
      '<label class="a38-review-done-label"><input type="checkbox" class="a38-review-done">已完成</label>' +
      '<div class="a38-form-actions"><button type="button" class="a38-button primary" data-a38-review-save>保存复盘</button><button type="button" class="a38-button" data-a38-review-cancel>取消</button></div></div>';
  }
  function reviewList(data) {
    var all = reviews(), ids = data.exams.map(examId), c = config(), list = all.filter(function (item) { return c.reviewAll || ids.indexOf(String(item.examId)) >= 0; }).slice().reverse();
    if (!list.length) return '<p class="a38-muted">当前范围还没有复盘记录。记录保存在当前设备的浏览器中，不会自动跨设备同步。</p>' + (all.length ? '<button type="button" class="a38-link" data-a38-review-scope>查看全部已保存记录</button>' : '');
    return '<div class="a38-review-scope-row"><span>' + (c.reviewAll ? '全部已保存记录' : '当前分析范围') + ' · 共 ' + list.length + ' 条</span><button type="button" class="a38-link" data-a38-review-scope>' + (c.reviewAll ? '只看当前范围' : '查看全部') + '</button></div><div class="a38-review-list">' + list.map(function (item) {
      var exam = data.raw.filter(function (e) { return examId(e) === String(item.examId); })[0];
      var examNote = exam && (exam.note || exam.notes || exam.remark || exam.comment);
      return '<article><div class="a38-review-head"><b>' + esc(item.examName || (exam && exam.name) || '未命名考试') +
        '</b><time>' + esc(dateText(item.createdAt)) + '</time><label class="a38-review-status"><input type="checkbox" data-a38-review-done="' + esc(item.id) + '"' + (item.done ? ' checked' : '') + '>已完成</label><button type="button" class="a38-icon-button" data-a38-review-edit="' + esc(item.id) + '">编辑</button><button type="button" class="a38-icon-button" data-a38-review-delete="' + esc(item.id) + '">删除</button></div>' +
        (examNote ? '<p><strong>考试备注：</strong>' + esc(examNote) + '</p>' : '') + (item.note ? '<p><strong>观察：</strong>' + esc(item.note) + '</p>' : '') +
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
        var modelExams = modelScopeExams();
        var html = window.__v34.sectionHtml(modelExams);
        html = html.replace(/发挥失常\/异常/g, '偏离历史模式的观测')
          .replace(/发挥失常/g, '偏离历史模式')
          .replace(/真实水平/g, '历史状态估计')
          .replace(/异常降权/g, '观测权重较低')
          .replace(/难度推断/g, '得分与排名关系偏离')
          .replace(/难度分析/g, '得分与排名关系偏离')
          .replace(/试卷难度概率/g, '关系偏离分值');
        return '<div class="a38-model-scope">模型当前使用：年级位比 · 有效观测 ' + modelExams.filter(function (exam) { return modelRankReady(exam, data.focus); }).length + ' 场。全局切换到班级范围不会改变此模型的排名口径。</div>' + html.replace('id="dsbRoot"', 'id="dsbRoot" data-a38-deep="1"');
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
    var latest = data.latestRecord, priorRecords = comparableRecords(data).slice(0, -1).slice(-3), prior = median(priorRecords.map(function (r) { return r.value; })), goal = goalProgress(data, data.focus), q = quality(data);
    var currentText = latest ? (metricIsRank(data.metric) ? rankText(latest.exam, data.focus, data.rankScope) : metricValueText(latest.value, data.metric, latest.exam, data.focus)) : '—';
    var currentLabel = latest ? (data.latest && latest.key === examId(data.latest) ? '本次 · ' : '最近一次有该指标 · ') + shortName(latest.exam.name || dateText(latest.exam.exam_date)) : '当前范围暂无有效记录';
    var change = improvement(data), n = priorRecords.length;
    var changeText = hasScaleChange(data) ? '满分口径变化' : change === null ? '数据不足' : change > 0 ? (metricIsRank(data.metric) ? '靠前 ' : '增加 ') + Math.abs(change) + (metricIsRank(data.metric) || data.metric === 'rate' ? ' 个百分点' : ' 分') : change < 0 ? (metricIsRank(data.metric) ? '回落 ' : '减少 ') + Math.abs(change) + (metricIsRank(data.metric) || data.metric === 'rate' ? ' 个百分点' : ' 分') : '接近近期水平';
    var coverageText = q.rankComplete + ' / ' + data.exams.length + ' 次有完整' + data.rankLabel;
    var goalText = goal.goal.value === null ? coverageText : goal.current === null ? '等待成绩' : goal.current >= goal.goal.value ? '已达到' : '还差 ' + round(goal.goal.value - goal.current, 1) + ' 分';
    var goalNote = goal.goal.value === null ? '当前范围的排名覆盖' : (data.focusLabel + ' · 最终分目标 ' + round(goal.goal.value, 1));
    return '<div class="a38-stat-grid">' +
      statCard('本次表现', currentText, currentLabel + ' · ' + metricLabel(data.metric), 'accent') +
      statCard('相比近期', changeText, n ? '比此前 ' + n + ' 次中位水平' : '至少需要 2 次同口径有效记录', change > 0 ? 'good' : change < 0 ? 'warn' : '') +
      statCard(goal.goal.value === null ? '数据覆盖' : '目标距离', goalText, goalNote, goal.goal.value === null || goal.current === null ? '' : goal.current >= goal.goal.value ? 'good' : 'warn') +
      '</div>';
  }
  function rangeSummary(data) {
    var q = quality(data), c = config(), hidden = c.includeHidden ? ' · 含隐藏考试' : '';
    return '<div class="a38-range-summary"><b>已选 ' + data.exams.length + ' 次考试</b><span>其中 ' + q.rankComplete +
      ' 次有完整' + data.rankLabel + '，' + q.rankAvailable + ' 次有名次或位比' + hidden + '</span><small>当前图表统一使用：' + esc(data.rankLabel) + '。只有名次没有参考人数的记录不进入位比计算。</small></div>';
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
  function controls(data, includeView) {
    var c = config(), cats = categories(data.raw), all = c.range === 'all' ? '全部考试' : c.range === 'recent5' ? '最近 5 次' : c.range === 'recent10' ? '最近 10 次' : '自定义集合';
    var scopeOptions = '<option value="__all__">全部年级</option>' + cats.map(function (value) {
      return '<option value="' + esc(value) + '"' + (c.scope === value ? ' selected' : '') + '>' + esc(value === '__none__' ? '未分类' : value) + '</option>';
    }).join('');
    var checks = allFilterExams().map(function (exam) {
      var checked = c.range !== 'custom' || !Array.isArray(c.selectedIds) || c.selectedIds.indexOf(examId(exam)) >= 0;
      return '<label class="a38-exam-check"><input type="checkbox" data-a38-exam-check="' + esc(examId(exam)) + '"' + (checked ? ' checked' : '') +
        '><span>' + esc(exam.name || dateText(exam.exam_date)) + '<small>' + esc(dateText(exam.exam_date)) + '</small></span></label>';
    }).join('');
    var html = '<div class="a38-controls"><div class="a38-control-row"><label>考试范围<select data-a38-range>' +
      '<option value="all"' + (c.range === 'all' ? ' selected' : '') + '>全部考试</option><option value="recent5"' + (c.range === 'recent5' ? ' selected' : '') +
      '>最近 5 次</option><option value="recent10"' + (c.range === 'recent10' ? ' selected' : '') + '>最近 10 次</option><option value="custom"' +
      (c.range === 'custom' ? ' selected' : '') + '>自定义集合</option></select></label><label>年级<select data-a38-scope>' + scopeOptions +
      '</select></label><label>排名范围<select data-a38-rank-scope><option value="year"' + (c.rankScope === 'year' ? ' selected' : '') +
      '>校内年级</option><option value="class"' + (c.rankScope === 'class' ? ' selected' : '') + '>班级</option></select></label>' +
      '<label class="a38-check-label"><input type="checkbox" data-a38-hidden' + (c.includeHidden ? ' checked' : '') + '>包含隐藏考试</label></div>' +
      '<div class="a38-control-row a38-date-row"><label>开始日期<input type="date" data-a38-start value="' + esc(c.start) + '"></label>' +
      '<label>结束日期<input type="date" data-a38-end value="' + esc(c.end) + '"></label><span class="a38-control-help">日期范围与考试集合叠加生效</span></div>' +
      '<details class="a38-filter-details"' + (c.range === 'custom' ? ' open' : '') + '><summary>选择考试集合 · 当前 ' + esc(all) + '</summary>' +
      '<div class="a38-exam-grid">' + (checks || '<span class="a38-muted">当前筛选下没有考试</span>') + '</div></details>';
    if (includeView !== false) html += '<details class="a38-filter-details"><summary>显示设置 · 当前 ' + esc(metricLabel(data.metric)) + '</summary><div class="a38-setting-row">' +
      '<label>指标<select data-a38-metric><option value="rank_year"' + (data.metric === 'rank_year' ? ' selected' : '') + '>年级位比</option>' +
      '<option value="rank_class"' + (data.metric === 'rank_class' ? ' selected' : '') + '>班级位比</option><option value="score_final"' + (data.metric === 'score_final' ? ' selected' : '') +
      '>最终分</option><option value="score_raw"' + (data.metric === 'score_raw' ? ' selected' : '') + '>原始分</option><option value="rate"' + (data.metric === 'rate' ? ' selected' : '') + '>得分率</option></select></label>' +
      '<span class="a38-control-help">原始分 / 最终分 / 得分率只按各自单位解读；排名越小代表位比越靠前。</span></div></details>' +
      '<div class="a38-focus-row"><span>分析对象</span><div class="a38-pill-scroll">' + focusChips(data) + '</div></div>';
    return html + '</div>';
  }
  function simpleTrendControls(data) {
    return '<div class="a38-simple-trend-controls"><label>查看<select data-a38-metric><option value="rank_year"' + (data.metric === 'rank_year' ? ' selected' : '') + '>年级位比</option><option value="rank_class"' + (data.metric === 'rank_class' ? ' selected' : '') + '>班级位比</option><option value="score_final"' + (data.metric === 'score_final' ? ' selected' : '') + '>最终分</option><option value="score_raw"' + (data.metric === 'score_raw' ? ' selected' : '') + '>原始分</option><option value="rate"' + (data.metric === 'rate' ? ' selected' : '') + '>得分率</option></select></label><span>对象</span><div class="a38-pill-scroll">' + focusChips(data) + '</div><button type="button" class="a38-link" data-a38-more="trend">显示设置</button></div>';
  }
  function simpleTrend(data) {
    return '<div class="a38-block-body">' + simpleTrendControls(data) + '<div class="a38-chart-title"><b>' + esc(data.focusLabel) + ' · ' + esc(metricLabel(data.metric)) + '</b><span>' +
      (metricIsRank(data.metric) ? '越靠前越好' : '目标线仅在同一单位下显示') + '</span></div>' + lineChart(data.exams, data.focus, data.metric, config().rankScope, true) +
      '<div class="a38-fact-lines"><p><b>变化方向：</b>' + esc(directionText(data)) + '</p><p><b>波动情况：</b>' + esc(volatility(data)) + '</p></div>' +
      '<button type="button" class="a38-link" data-a38-more="trend">查看详细趋势与波动分析 →</button></div>';
  }
  function subjectHistoryList(data) {
    var rows = subjectRows(data), ranked = rows.filter(function (r) { return r.change !== null; }).sort(function (a, b) { return b.change - a.change; });
    if (!ranked.length) return '<div class="a38-empty">至少需要 2 次同一' + esc(data.rankLabel) + '记录，才能比较各科自身变化。</div>';
    return '<div class="a38-subject-history-list">' + ranked.map(function (r) {
      return '<div><b>' + esc(r.subject) + '</b><span>本次 ' + (r.pos === null ? '—' : '前' + round(r.pos, 1) + '%') + ' · 相对近期 ' + (r.change > 0 ? '靠前 ' : r.change < 0 ? '回落 ' : '接近 ') + Math.abs(r.change) + ' 个百分点</span><small>' + r.n + ' 次有效' + esc(data.rankLabel) + '</small></div>';
    }).join('') + '</div>';
  }
  function simpleStructure(data) {
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    var rows = subjectRows(data).map(function (r) { r.max = sumMax(data.latest || {}, '__sub:' + r.subject, basis); return r; });
    var mode = metricIsRank(data.metric) ? 'rank' : data.metric === 'rate' ? 'rate' : 'score';
    var c = config(), warning = rows.some(function (r) { return r.rate !== null && r.pos === null; }) && metricIsRank(data.metric) ? '部分科目缺少' + data.rankLabel + '，图中保留缺失，不用得分率补位。' : '本次表现只取同一场考试；“相比自身近期”单独比较各科自己的历史。';
    var view = c.structureView === 'history' ? subjectHistoryList(data) : barChart(rows, mode);
    return '<div class="a38-block-body"><div class="a38-inline-note">本次考试：' + esc(data.latest ? data.latest.name : '暂无') + ' · ' + esc(metricLabel(data.metric)) + '</div><div class="a38-view-switch"><button type="button" class="a38-pill ' + (c.structureView === 'same' ? 'active' : '') + '" data-a38-structure-view="same">本次表现</button><button type="button" class="a38-pill ' + (c.structureView === 'history' ? 'active' : '') + '" data-a38-structure-view="history">相比自身近期</button></div>' +
      view + '<p class="a38-note">' + esc(warning) + '</p><button type="button" class="a38-link" data-a38-more="structure">查看雷达图、变化和象限 →</button></div>';
  }
  function simpleGoals(data) {
    var progress = goalProgress(data, data.focus);
    if (progress.goal.value === null) return '<div class="a38-block-body"><p class="a38-note">还没有设置' + esc(data.focusLabel) + '的长期目标。目标会区分为最终分，不会与位比或得分率混用。</p><button type="button" class="a38-button" data-a38-goal-open>去设置目标</button><button type="button" class="a38-link" data-a38-more="goal">查看目标进度 →</button></div>';
    var row = goalRows(data).filter(function (item) { return item.focus === data.focus; })[0] || { subject: data.focusLabel, goal: progress.goal.value, current: progress.current, max: progress.currentMax, attempts: progress.attempted, hit: progress.reached, values: [] };
    return '<div class="a38-block-body">' + goalBar(row) + '<p class="a38-note">目标达成只统计有实际成绩且目标口径一致的记录；当前范围共 ' + progress.reached + ' / ' + progress.attempted + ' 次达成。</p><button type="button" class="a38-link" data-a38-more="goal">查看目标校准与参考 →</button></div>';
  }
  function simpleCompareFacts(data) {
    var cmp = compareData(data);
    if (cmp.exams.length < 2) return '<div class="a38-empty">至少选择 2 次考试后查看变化。</div>';
    var from = cmp.exams[cmp.exams.length - 2], to = cmp.exams[cmp.exams.length - 1], facts = [];
    var crossChanges = data.subjects.map(function (subject) {
      var focus = '__sub:' + subject, sa = valueFor(from, focus, 'score_final', data.rankScope), sb = valueFor(to, focus, 'score_final', data.rankScope), ra = rankPercent(from, focus, data.rankScope), rb = rankPercent(to, focus, data.rankScope);
      return { subject: subject, scoreDelta: sa !== null && sb !== null && scoreComparable(from, to, focus, 'final') ? sb - sa : null, rankDelta: ra !== null && rb !== null ? ra - rb : null };
    }).filter(function (item) { return item.scoreDelta !== null && item.rankDelta !== null && ((item.scoreDelta < 0 && item.rankDelta > 0) || (item.scoreDelta > 0 && item.rankDelta < 0)); });
    if (crossChanges.length) { var cross = crossChanges[0]; facts.push(cross.subject + '分数' + (cross.scoreDelta < 0 ? '下降 ' : '增加 ') + Math.abs(round(cross.scoreDelta, 1)) + ' 分，但' + data.rankLabel + (cross.rankDelta > 0 ? '改善 ' : '回落 ') + Math.abs(round(cross.rankDelta, 1)) + ' 个百分点。'); }
    var scoreA = valueFor(from, data.focus, 'score_final', data.rankScope), scoreB = valueFor(to, data.focus, 'score_final', data.rankScope);
    var scoreMaxA = sumMax(from, data.focus, 'final'), scoreMaxB = sumMax(to, data.focus, 'final');
    if (scoreA !== null && scoreB !== null) facts.push(scoreComparable(from, to, data.focus, 'final') ? data.focusLabel + '分数' + (scoreB - scoreA >= 0 ? '增加 ' : '减少 ') + Math.abs(round(scoreB - scoreA, 1)) + ' 分。' : scoreMaxA !== null && scoreMaxB !== null ? data.focusLabel + '分数变化 ' + (scoreB - scoreA >= 0 ? '+' : '') + round(scoreB - scoreA, 1) + ' 分，但满分或科目集合从 ' + scoreMaxA + ' 变为 ' + scoreMaxB + '，暂不判断表现改善。' : data.focusLabel + '分数变化，但满分或科目集合信息不完整，暂不判断表现改善。');
    var rankA = rankPercent(from, data.focus, data.rankScope), rankB = rankPercent(to, data.focus, data.rankScope);
    if (rankA !== null && rankB !== null) facts.push(data.rankLabel + (rankB < rankA ? '前进 ' : rankB > rankA ? '回落 ' : '接近 ') + Math.abs(round(rankA - rankB, 1)) + ' 个百分点。');
    var subjectChanges = data.subjects.map(function (subject) {
      var a = valueFor(from, '__sub:' + subject, 'score_final', data.rankScope), b = valueFor(to, '__sub:' + subject, 'score_final', data.rankScope), am = sumMax(from, '__sub:' + subject, 'final'), bm = sumMax(to, '__sub:' + subject, 'final');
      return { subject: subject, a: a, b: b, am: am, bm: bm, delta: a !== null && b !== null && scoreComparable(from, to, '__sub:' + subject, 'final') ? b - a : null };
    }).filter(function (r) { return r.delta !== null; }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    if (subjectChanges.length) { var top = subjectChanges[0]; facts.push(top.subject + '分数' + (top.delta >= 0 ? '增加 ' : '减少 ') + Math.abs(round(top.delta, 1)) + ' 分，是本次科目分数变化中幅度最大的一项。'); }
    return '<div class="a38-compare-meta">对照考试：' + esc(shortName(from.name || dateText(from.exam_date))) + ' → ' + esc(shortName(to.name || dateText(to.exam_date))) + ' · 同时查看分数与' + esc(data.rankLabel) + '</div><ul class="a38-fact-list">' + (facts.slice(0, 3).map(function (fact) { return '<li>' + esc(fact) + '</li>'; }).join('') || '<li>两场没有足够的同口径数据可直接比较。</li>') + '</ul>' + compareChooser(data);
  }
  function simpleCompare(data) {
    return '<div class="a38-block-body">' + simpleCompareFacts(data) + '<button type="button" class="a38-button" data-a38-review-open>记录本次复盘</button><button type="button" class="a38-link" data-a38-more="compare">查看完整对比 →</button>' + reviewForm(data) + '</div>';
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
    var q = quality(data), c = config(), rankScope = c.rankScope === 'class' ? 'class' : 'year', goal = goalProgress(data, data.focus), vals = data.valid.map(function (r) { return r.value; }), latest = data.latestRecord;
    var items = [];
    if (q.missingTotal.length) items.push('有 ' + q.missingTotal.length + ' 场没有成绩，不当作 0 分。');
    if (q.absent) items.push('记录中明确标记为缺考的场次：' + q.absent + '；未填写成绩但没有缺考标记的仍归为未录入。');
    if (q.partial) items.push('有 ' + q.partial + ' 场只录入部分科目，总分 / 得分率可能不完整。');
    if (q.noRank) items.push('有 ' + q.noRank + ' 场没有可用的' + data.rankLabel + '，相关位比分析只使用其余记录。');
    if (q.rankMissingPeople) items.push('有 ' + q.rankMissingPeople + ' 场只有名次没有参考人数；这些记录不计算位比。');
    if (q.poolChanges) items.push('有 ' + q.poolChanges + ' 处参考人数变化达到 30% 以上，跨场位比需要谨慎。');
    if (!items.length) items.push('已检查的成绩、满分、名次和人数字段当前未发现缺失。');
    var best = vals.length ? (metricIsRank(data.metric) ? Math.min.apply(null, vals) : Math.max.apply(null, vals)) : null;
    var worst = vals.length ? (metricIsRank(data.metric) ? Math.max.apply(null, vals) : Math.min.apply(null, vals)) : null;
    return '<div class="a38-stat-grid">' + statCard('考试数量', String(data.exams.length), data.exams.length ? dateText(data.exams[0].exam_date) + ' → ' + dateText(data.exams[data.exams.length - 1].exam_date) : '暂无范围', 'accent') +
      statCard('最新有效表现', latest ? (metricIsRank(data.metric) ? rankText(latest.exam, data.focus, data.rankScope) : metricValueText(latest.value, data.metric, latest.exam, data.focus)) : '—', latest ? shortName(latest.exam.name || dateText(latest.exam.exam_date)) : '暂无有效记录', latest ? 'good' : 'warn') +
      statCard('近期中位水平', vals.length ? metricValueText(median(vals), data.metric, latest && latest.exam, data.focus) : '—', vals.length + ' 次同口径有效记录', '') +
      statCard('最好 / 最差', best === null ? '—' : metricValueText(best, data.metric, latest && latest.exam, data.focus) + ' / ' + metricValueText(worst, data.metric, latest && latest.exam, data.focus), '个人历史范围内', '') +
      statCard('完整' + data.rankLabel, q.rankComplete + ' / ' + data.exams.length, q.rankAvailable + ' 次有名次或位比', q.rankComplete ? 'good' : 'warn') +
      statCard('目标达成', goal.goal.value === null ? '—' : goal.reached + ' / ' + goal.attempted, goal.goal.value === null ? '未设置目标' : '按当前目标回看 · 最终分', goal.goal.value === null ? '' : 'good') + '</div>' +
      '<div class="a38-quality-list"><b>当前数据质量</b><ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }
  function detailTrend(data) {
    return '<div class="a38-subsection"><b>实际趋势 · ' + esc(metricLabel(data.metric)) + '</b><p class="a38-caption">' + data.valid.length + ' 次有效记录 / ' + data.exams.length + ' 次已选考试。实际值为主；目标线只在同一计分单位下显示。图中没有平滑线，因此不额外解释平滑。</p>' +
      lineChart(data.exams, data.focus, data.metric, config().rankScope, false) + '</div><div class="a38-two-col"><div><b>相邻变化幅度</b>' + deltaChart(data) +
      '</div><div><b>方向与波动摘要</b><p class="a38-note">' + esc(directionText(data)) + '</p><p class="a38-note">' + esc(volatility(data)) +
      '</p><p class="a38-note">这里分别报告方向、相邻变化幅度和是否逐次一致，不合并成一个“稳定”标签。</p></div></div>';
  }
  function detailStructure(data) {
    var basis = data.metric === 'score_raw' ? 'raw' : 'final';
    var rows = subjectRows(data).map(function (r) { r.max = sumMax(data.latest || {}, '__sub:' + r.subject, basis); return r; });
    var mode = metricIsRank(data.metric) ? 'rank' : data.metric === 'rate' ? 'rate' : 'score';
    var table = '<div class="a38-scroll"><table class="a38-table"><thead><tr><th>科目</th><th>本次' + esc(metricLabel(data.metric)) + '</th><th>近期变化（' + esc(data.rankLabel) + '）</th><th>有效' + esc(data.rankLabel) + '场数</th><th>说明</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td>' + esc(r.subject) + '</td><td>' + (r.current === null ? '—' : metricValueText(r.current, data.metric, data.latest, '__sub:' + r.subject)) +
        '</td><td class="' + (r.change === null ? '' : r.change >= 0 ? 'a38-positive' : 'a38-negative') + '">' + (r.change === null ? '数据不足' : (r.change > 0 ? '靠前 ' : r.change < 0 ? '回落 ' : '接近 ') + Math.abs(r.change) + ' 个百分点') +
        '</td><td>' + r.n + '</td><td>' + (r.pos === null ? '本次缺少' + data.rankLabel : r.change === null ? '至少需要 2 次同口径排名' : r.change > 0 ? '相对自身近期水平改善' : r.change < 0 ? '相对自身近期水平回落' : '变化接近 0') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return '<div class="a38-subsection"><b>同场结构 · ' + esc(data.latest ? data.latest.name : '暂无') + '</b>' + table + barChart(rows, mode) + '</div>' +
      '<details class="a38-more-views"><summary>更多视图：雷达图与表现 × 变化</summary><div class="a38-two-col"><div><b>全科雷达图</b>' + radarChart(data) + '</div><div><b>表现与变化象限</b>' + quadrant(data) + '</div></div></details>' +
      '<p class="a38-caption">“值得关注”只表示数据出现变化，不等同于“最容易提分”。学习优先级还需要考试权重、具体失分原因和后续复盘。</p>';
  }
  function detailGoal(data) {
    var rows = goalRows(data);
    if (!rows.length) return '<p class="a38-note">尚未设置长期目标，也没有足够的逐次目标记录。可以先设置目标，或在考试记录中填写单次目标。</p><button type="button" class="a38-button" data-a38-goal-open>去设置目标</button>';
    var g = longGoalData(), hasHistory = Array.isArray(g.history) && g.history.length;
    return '<div class="a38-goal-list">' + rows.map(goalBar).join('') + '</div><p class="a38-caption">目标参考显示近期中位数、最好成绩和同满分范围；它是参考信息，不宣称某个固定公式能算出“最合理目标”。当前达成率按当前目标回看；' + (hasHistory ? '页面保存了目标修改历史，可进一步按当时目标统计。' : '当前没有目标修改历史，因此不按当时目标计算历史达成率。') + '</p>';
  }
  function detailRank(data) {
    var currentYear = data.latestYearRank, currentClass = data.latestClassRank;
    var latestYear = data.latest ? rankInfo(data.latest, data.focus, 'year') : null, latestClass = data.latest ? rankInfo(data.latest, data.focus, 'class') : null;
    var refText = !latestYear && !latestClass ? '—' : (latestYear && latestYear.people === null ? '年级缺人数' : '年级 ' + latestYear.people) + (latestClass && latestClass.people !== null ? ' · 班级 ' + latestClass.people : latestClass ? ' · 班级缺人数' : '');
    return '<div class="a38-two-col"><div><b>年级位比趋势</b>' + rankChart(data, 'year') + '</div><div><b>班级位比趋势</b>' + rankChart(data, 'class') + '</div></div>' +
      '<div class="a38-rank-pair"><div><span>本次年级位置</span><b>' + (data.latest ? rankText(data.latest, data.focus, 'year') : '—') + '</b></div><div><span>本次班级位置</span><b>' +
      (data.latest ? rankText(data.latest, data.focus, 'class') : '—') + '</b></div><div><span>本次参考人数</span><b>' + refText + '</b></div></div>' +
      rankCountsTable(data) + '<p class="a38-caption">这里比较个人在年级和班级两个范围中的位置，不代表班级整体水平，也不能据此判断主要竞争对手来自哪里。</p>';
  }
  function detailCompare(data) {
    return compareChooser(data) + compareTable(data) + '<details class="a38-more-views"><summary>更多视图：多考试雷达</summary>' + multiRadarChart(data) + '</details>';
  }
  function detailReview(data) {
    var insights = systemInsights(data);
    return '<div class="a38-subsection"><b>系统发现</b><div class="a38-insight-list">' + insights.map(function (x) {
      return '<div class="a38-insight ' + x.tone + '"><b>' + esc(x.title) + '</b><p>' + esc(x.body) + '</p></div>';
    }).join('') + '</div></div><div class="a38-subsection"><b>我的计划</b>' + reviewList(data) + '<button type="button" class="a38-button" data-a38-review-open>记录复盘</button>' + reviewForm(data) + '</div>';
  }
  function methods() {
    return '<div class="a38-method-grid"><div><b>指标定义</b><p>位比 = 名次 ÷ 参考人数 × 100%，越小越靠前；明确录入的位比可以直接使用，但标记其来源。分数、得分率和位比不互换。</p></div><div><b>缺失与状态</b><p>未录入、缺考和不适用分开处理；缺失科目不补成 0，只有名次没有参考人数时不计算位比。</p></div><div><b>可比性规则</b><p>组合排名只有在科目集合与计分口径和总分一致时才借用总分排名；原始分 / 最终分、满分、排名范围不一致时分别标出。</p></div><div><b>窗口与结论</b><p>近期中位数使用当前范围内真实有效记录；缺失会打断连续纪录。页面描述变化、波动和位置，不把它包装成原因或学习时长建议。</p></div><div><b>总分得分率</b><p>只有科目齐全且每科有成绩与满分时才计算完整总分得分率；部分录入可以单独显示已录入科目得分率，不能代表整场总分表现。</p></div><div><b>模型边界</b><p>模型单独标注使用的排名范围、有效样本和回测结果；“历史状态估计”不等于真实能力，“偏离历史模式的观测”不等于发挥失常。</p></div></div>';
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
      '.a38-compare-chooser{display:flex;gap:6px;align-items:center;overflow-x:auto;white-space:nowrap;margin-bottom:12px;padding-bottom:3px}.a38-compare-chooser>span{font-size:11px;color:var(--muted,#788392);font-weight:750}.a38-compare-meta{font-size:11px;color:var(--muted,#788392);margin-bottom:8px}.a38-history-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.a38-history-summary>div{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px}.a38-history-summary b{display:block;font-size:17px}.a38-history-summary span{display:block;font-size:10.5px;color:var(--muted,#788392);margin-top:4px}.a38-histogram{height:170px;display:flex;align-items:end;gap:8px;border-bottom:1px solid var(--line,#e8ebf0);padding:12px 6px 0;margin-top:17px}.a38-histogram>div{display:grid;grid-template-rows:1fr auto auto;gap:4px;align-items:end;text-align:center;flex:1;height:100%;min-width:0}.a38-histogram i{display:block;min-height:0;background:var(--accent,#5d72e8);border-radius:7px 7px 0 0}.a38-histogram span{font-size:9px;color:var(--muted,#788392);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a38-histogram b{font-size:10px}',
      '.a38-quality-list{margin-top:15px;padding:11px 13px;border:1px dashed var(--line,#cfd6e4);border-radius:12px;background:var(--chip-bg,#fbfcfe)}.a38-quality-list>b{font-size:12px}.a38-quality-list ul{margin:7px 0 0;padding-left:18px}.a38-quality-list li{font-size:11.5px;line-height:1.75;color:var(--muted,#788392)}.a38-method-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.a38-method-grid>div{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:11px}.a38-method-grid b{font-size:11.5px}.a38-method-grid p{font-size:10.5px;line-height:1.7;color:var(--muted,#788392);margin:5px 0 0}',
      '.a38-review-form{border:1px solid var(--line,#e8ebf0);background:var(--chip-bg,#fbfcfe);border-radius:13px;padding:12px;margin-top:10px}.a38-review-form[hidden]{display:none}.a38-review-form label{display:grid;gap:5px;font-size:11px;font-weight:750;margin-bottom:9px}.a38-review-form select,.a38-review-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--line,#e8ebf0);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text,#18212f);padding:8px;font:inherit;font-size:11.5px;resize:vertical}.a38-form-actions{display:flex;align-items:center;gap:8px}.a38-review-list{display:grid;gap:9px;margin:9px 0}.a38-review-list article{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px}.a38-review-head{display:flex;align-items:center;gap:8px}.a38-review-head b{font-size:11.5px}.a38-review-head time{font-size:10px;color:var(--muted,#788392);margin-left:auto}.a38-icon-button{border:0;background:transparent;color:var(--muted,#788392);font-size:10px}.a38-review-list p{margin:7px 0 0;font-size:11px;line-height:1.65;color:var(--muted,#788392)}.a38-review-list strong{color:var(--text,#18212f)}',
      '.a38-empty{border:1px dashed var(--line,#cfd6e4);border-radius:12px;padding:16px;text-align:center;font-size:11.5px;color:var(--muted,#788392);margin:8px 0}.a38-deep-mode #dsbRoot{display:block}.a38-simple-mode #dsbRoot{display:none!important}.a38-page svg{max-width:100%}',
      '.a38-detail-mode #dsbRoot .combo-chips-v25{display:none!important}',
      '@media(max-width:820px){.a38-page{padding-bottom:28px}.a38-answer-grid{grid-template-columns:1fr}.a38-two-col{grid-template-columns:1fr}.a38-goal-list{grid-template-columns:1fr}.a38-page-head{align-items:center}.a38-range-summary small{width:100%;margin-left:0}.a38-top{padding-bottom:10px}.a38-detail-nav{top:104px}}',
      '@media(max-width:620px){.a38-page-head{gap:10px}.a38-page h2{font-size:22px}.a38-mode-switch button{padding:7px 9px;font-size:11px}.a38-controls{padding:10px}.a38-control-row label{flex:1 1 130px}.a38-date-row label{flex-basis:130px}.a38-control-help{width:100%}.a38-stat-grid{gap:6px}.a38-stat{padding:9px 8px}.a38-stat b{font-size:15px}.a38-stat span,.a38-stat small{font-size:9.5px}.a38-answer-card{padding:14px}.a38-answer-card h3{font-size:15px}.a38-section>summary{padding:14px}.a38-section-body{padding:14px}.a38-rank-pair{grid-template-columns:1fr 1fr}.a38-rank-pair>div:last-child{grid-column:span 2}.a38-method-grid{grid-template-columns:1fr}.a38-matrix-scroll{max-height:none}.a38-chart-scroll svg{min-width:480px}}',
      'html[data-theme="night"] .a38-controls,html[data-theme="night"] .a38-answer-card,html[data-theme="night"] .a38-section,html[data-theme="night"] .a38-stat,html[data-theme="night"] .a38-goal-row,html[data-theme="night"] .a38-review-form,html[data-theme="night"] .a38-review-list article{box-shadow:none}',
      'html[data-theme="night"] .a38-insight,html[data-theme="night"] .a38-quality-list,html[data-theme="night"] .a38-review-form{background:rgba(255,255,255,.035)}',
      '.a38-matrix td.rate-cell,.a38-matrix td.score-cell{background:linear-gradient(90deg,color-mix(in srgb,var(--accent,#5d72e8) var(--heat),transparent),transparent)}.a38-matrix td.low-cell{box-shadow:inset 0 -2px 0 var(--orange,#e59b45)}.a38-matrix td.missing{box-shadow:inset 0 -2px 0 var(--line,#cfd6e4)}',
      '.a38-detail-nav{position:sticky;top:112px;z-index:20;display:flex;align-items:center;gap:6px;overflow-x:auto;white-space:nowrap;padding:6px 1px 9px;margin-bottom:5px;background:color-mix(in srgb,var(--bg,#f5f7fb) 88%,transparent);backdrop-filter:blur(12px);scrollbar-width:none}.a38-detail-nav::-webkit-scrollbar{display:none}.a38-detail-nav>span{font-size:10.5px;color:var(--muted,#788392);font-weight:800;margin-right:3px}.a38-detail-nav a{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--muted,#788392);border-radius:999px;padding:5px 9px;text-decoration:none;font-size:10.5px}.a38-detail-nav a:active{color:var(--accent,#5d72e8);border-color:var(--accent,#5d72e8)}',
      '.a38-contribution{border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:11px;margin-top:12px}.a38-contribution>b{font-size:12px}.a38-contribution-row{display:grid;grid-template-columns:52px minmax(0,1fr) 48px;gap:8px;align-items:center;margin-top:8px;font-size:10.5px}.a38-contribution-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a38-contribution-row>div{height:7px;border-radius:99px;background:var(--chip-bg,#eef0f5);overflow:hidden}.a38-contribution-row i{display:block;height:100%;border-radius:99px}.a38-contribution-row i.positive{background:var(--green,#32a77a)}.a38-contribution-row i.negative{background:var(--danger,#d95c5c)}.a38-contribution-row>b{text-align:right;font-variant-numeric:tabular-nums}',
      '.a38-matrix .matrix-col-selected{box-shadow:inset 2px 0 0 var(--accent,#5d72e8),inset -2px 0 0 var(--accent,#5d72e8)}',
      '.a38-simple-mode .a38-top{position:relative}.a38-simple-mode .a38-range-summary{position:sticky;top:0;z-index:35;box-shadow:0 3px 10px rgba(24,33,47,.05)}.a38-simple-filter{margin-top:4px}.a38-simple-filter>summary{display:inline-flex;cursor:pointer;border:1px solid var(--line,#e8ebf0);border-radius:10px;background:var(--panel-solid,#fff);color:var(--accent,#5d72e8);padding:7px 11px;font-size:11.5px;font-weight:750}.a38-simple-filter[open]>summary{margin-bottom:8px}.a38-simple-filter .a38-controls{box-shadow:none}.a38-simple-trend-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:4px 0 10px;padding:7px 8px;border:1px solid var(--line,#e8ebf0);border-radius:11px;background:var(--chip-bg,#fbfcfe)}.a38-simple-trend-controls label{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:750;color:var(--muted,#788392)}.a38-simple-trend-controls select,.a38-matrix-tools input,.a38-matrix-tools select{border:1px solid var(--line,#e8ebf0);border-radius:8px;background:var(--panel-solid,#fff);color:var(--text,#18212f);padding:5px 7px;font:inherit;font-size:11px}.a38-simple-trend-controls>span{font-size:10.5px;color:var(--muted,#788392);font-weight:750}.a38-simple-trend-controls .a38-pill-scroll{flex:1}.a38-view-switch{display:flex;gap:6px;overflow-x:auto;margin:9px 0 6px}.a38-subject-history-list{display:grid;gap:8px;margin:10px 0}.a38-subject-history-list>div{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:8px;align-items:center;border-bottom:1px solid var(--line,#e8ebf0);padding:6px 0;font-size:11px}.a38-subject-history-list span{color:var(--muted,#788392)}.a38-subject-history-list small{font-size:10px;color:var(--muted,#788392)}.a38-fact-list{margin:8px 0 12px;padding-left:19px}.a38-fact-list li{font-size:11.5px;line-height:1.7;margin:3px 0}.a38-more-views{margin-top:14px;border-top:1px dashed var(--line,#e8ebf0);padding-top:9px}.a38-more-views>summary{cursor:pointer;color:var(--accent,#5d72e8);font-size:11.5px;font-weight:750}.a38-detail-stage{margin:20px 0 9px;font-size:11px;letter-spacing:.08em;color:var(--accent,#5d72e8);font-weight:850}.a38-detail-stage+.a38-mode-content{margin-top:0}.a38-matrix-tools{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin-bottom:10px}.a38-matrix-tools label{display:grid;gap:4px;font-size:10.5px;font-weight:750;color:var(--muted,#788392)}.a38-matrix-tools input{min-width:140px}.a38-matrix-tools>span{font-size:10.5px;margin-left:auto}.a38-matrix th .matrix-open{display:block;font-size:9px;margin-top:4px}.a38-model-scope{border:1px solid var(--line,#e8ebf0);background:var(--accent-soft,#eef1ff);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:var(--muted,#788392)}.a38-review-scope-row{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:8px 0;font-size:10.5px;color:var(--muted,#788392)}.a38-review-status,.a38-review-done-label{display:flex!important;align-items:center;gap:4px!important;font-size:10px!important;color:var(--muted,#788392);font-weight:500!important}.a38-review-status{margin-left:auto}.a38-review-status input,.a38-review-done-label input{accent-color:var(--accent,#5d72e8)}.a38-delta-track{position:relative;background:linear-gradient(90deg,transparent 49.7%,var(--line,#bfc7d6) 49.7%,var(--line,#bfc7d6) 50.3%,transparent 50.3%)}',
      '.a38-point-strip{display:flex;gap:5px;overflow-x:auto;margin-top:7px;padding-bottom:2px}.a38-point-button{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--muted,#788392);border-radius:8px;padding:4px 7px;font:inherit;font-size:9.5px;white-space:nowrap;cursor:pointer}.a38-point-button.active{border-color:var(--accent,#5d72e8);color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff)}.a38-point-button.missing{opacity:.55}.a38-point-detail{font-size:10.5px;color:var(--muted,#788392);margin-top:5px;min-height:1.4em}',
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
    }).join('') + '</div><div class="a38-detail-stage">先了解表现</div><div class="a38-mode-content a38-detail">' +
      section('overview', '1 · 整体概览与数据质量', '先确认范围、样本和缺口', overviewDetail(data), sectionOpen('overview', true)) +
      section('trend', '2 · 趋势与波动分析', '看方向、相邻变化和波动', detailTrend(data), sectionOpen('trend', true)) +
      section('structure', '3 · 科目结构与相对表现', '同场结构、各科变化和当前 × 方向', detailStructure(data), sectionOpen('structure', true)) +
      section('goal', '4 · 目标进度与目标校准', '当前差距、历史达成和参考依据', detailGoal(data), sectionOpen('goal', true)) +
      '</div><div class="a38-detail-stage">再核对依据</div><div class="a38-mode-content a38-detail a38-detail-later">' +
      section('rank', '5 · 排名位置与竞争环境', '分开看年级、班级和参考人数', detailRank(data), sectionOpen('rank', false)) +
      section('compare', '6 · 单次考试与跨考试对比', '选择两次或多次考试，保留选择状态', detailCompare(data), sectionOpen('compare', false)) +
      section('history', '7 · 历史纪录与成绩分布', '只在同口径个人历史中比较', history(data), sectionOpen('history', false)) +
      section('matrix', '8 · 全量统计矩阵', '作为核对与探索工具', matrix(data), sectionOpen('matrix', false)) +
      '</div><div class="a38-detail-stage">最后深入探索</div><div class="a38-mode-content a38-detail a38-detail-later">' +
      section('deep', '9 · 深度模型与预测', '先看结果，再看证据，最后看模型细节', deepHtml(data), sectionOpen('deep', false)) +
      section('review', '10 · 复盘记录与分析方法', '把系统事实与自己的行动分开', detailReview(data) + methods(), sectionOpen('review', false)) +
      '</div>';
  }
  function topHtml(data) {
    var c = config();
    return '<div class="a38-top"><div class="a38-page-head"><div><span class="a38-eyebrow">分析工作台</span><h2>分析</h2><p>先回答“发生了什么”，再查看依据与方法。</p></div><div class="a38-mode-switch" role="tablist" aria-label="分析模式">' +
      '<button type="button" class="' + (c.view === 'simple' ? 'active' : '') + '" data-a38-view="simple">简洁模式</button><button type="button" class="' + (c.view === 'detail' ? 'active' : '') + '" data-a38-view="detail">详细模式</button></div></div>' +
      '<div class="a38-global-label">全局分析范围</div>' + (c.view === 'simple' ? '<details class="a38-simple-filter"><summary>调整范围</summary>' + controls(data, false) + '</details>' : controls(data, true)) + rangeSummary(data) + '</div>';
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
  function modelScopeExams() {
    return selectedBaseExams().map(function (exam) {
      var clone = {};
      Object.keys(exam || {}).forEach(function (key) { clone[key] = exam[key]; });
      clone.is_hidden = false;
      clone.scores = {};
      Object.keys(exam && exam.scores || {}).forEach(function (subject) {
        var row = {}, source = rowOf(exam, subject);
        Object.keys(source).forEach(function (key) { row[key] = source[key]; });
        if (num(row.rank) !== null && num(row.participants) === null) row.rank = null;
        if (num(row.classRank) !== null && num(row.classParticipants) === null) row.classRank = null;
        clone.scores[subject] = row;
      });
      if (num(clone.total_rank) !== null && num(clone.total_participants) === null) clone.total_rank = null;
      if (num(clone.year_rank) !== null && num(clone.year_participants) === null) clone.year_rank = null;
      if (clone.moduleRanks && typeof clone.moduleRanks === 'object') {
        clone.moduleRanks = JSON.parse(JSON.stringify(clone.moduleRanks));
        Object.keys(clone.moduleRanks).forEach(function (id) {
          var mr = clone.moduleRanks[id] || {};
          if (num(mr.yearRank) !== null && num(mr.yearParticipants) === null) mr.yearRank = null;
          if (num(mr.classRank) !== null && num(mr.classParticipants) === null) mr.classRank = null;
        });
      }
      return clone;
    });
  }
  function modelRankReady(exam, focus) {
    if (focus && focus.indexOf('__sub:') === 0) { var row = rowOf(exam, focus.slice(6)); return num(row.rank) !== null && num(row.participants) !== null; }
    if (focus && focus.indexOf('__combo:') === 0) {
      var mr = moduleRank(exam, focus.slice(8));
      if (mr && num(mr.yearRank) !== null && num(mr.yearParticipants) !== null) return true;
      return comboMatchesTotal(exam, focus.slice(8)) && num(exam.total_rank) !== null && num(exam.total_participants) !== null;
    }
    return num(exam.total_rank) !== null && num(exam.total_participants) !== null;
  }
  function installModelExamScope() {
    if (window.__a38ModelExamScopeInstalled || typeof window.allExamsV32 !== 'function') return;
    var original = window.allExamsV32;
    window.allExamsV32 = function () {
      if (isStats()) return modelScopeExams();
      return original.apply(this, arguments);
    };
    window.__a38ModelExamScopeInstalled = true;
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
      var structureView = target.closest('[data-a38-structure-view]');
      if (structureView) { setConfig('structureView', structureView.getAttribute('data-a38-structure-view') === 'history' ? 'history' : 'same'); renderStats(); return; }
      if (target.closest('[data-a38-review-scope]')) { setConfig('reviewAll', !config().reviewAll); renderStats(); return; }
      var point = target.closest('[data-a38-point-exam]');
      if (point) {
        var pointExam = data.exams.filter(function (exam) { return examId(exam) === point.getAttribute('data-a38-point-exam'); })[0], pointValue = pointExam ? valueFor(pointExam, data.focus, data.metric, data.rankScope) : null, pointInfo = pointExam ? (metricIsRank(data.metric) ? rankText(pointExam, data.focus, data.rankScope) : metricValueText(pointValue, data.metric, pointExam, data.focus)) : '—';
        var detail = point.closest('.a38-block-body,.a38-section-body') && point.closest('.a38-block-body,.a38-section-body').querySelector('[data-a38-point-detail]');
        if (detail) detail.textContent = pointExam ? dateText(pointExam.exam_date) + ' · ' + (pointExam.name || '未命名考试') + ' · ' + metricLabel(data.metric) + '：' + pointInfo : '当前点位没有完整数据。';
        root.querySelectorAll('.a38-point-button.active').forEach(function (button) { button.classList.remove('active'); });
        point.classList.add('active');
        return;
      }
      if (target.closest('[data-a38-review-open]')) {
        var form = root.querySelector('[data-a38-review-form]');
        if (form) { form.removeAttribute('data-a38-edit-id'); form.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        return;
      }
      var editReview = target.closest('[data-a38-review-edit]');
      if (editReview) {
        var editItem = reviews().filter(function (item) { return String(item.id) === String(editReview.getAttribute('data-a38-review-edit')); })[0], editForm = root.querySelector('[data-a38-review-form]');
        if (editItem && editForm) {
          editForm.hidden = false; editForm.setAttribute('data-a38-edit-id', editItem.id);
          var editSelect = editForm.querySelector('.a38-review-exam'), editNote = editForm.querySelector('.a38-review-note'), editPlan = editForm.querySelector('.a38-review-plan'), editDone = editForm.querySelector('.a38-review-done');
          if (editSelect) editSelect.value = editItem.examId || ''; if (editNote) editNote.value = editItem.note || ''; if (editPlan) editPlan.value = editItem.plan || ''; if (editDone) editDone.checked = !!editItem.done;
          editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      if (target.closest('[data-a38-review-cancel]')) { var cancelForm = target.closest('[data-a38-review-form]'); if (cancelForm) { cancelForm.hidden = true; cancelForm.removeAttribute('data-a38-edit-id'); } return; }
      var save = target.closest('[data-a38-review-save]');
      if (save) {
        var formSave = target.closest('[data-a38-review-form]'), examSelect = formSave && formSave.querySelector('.a38-review-exam');
        var note = formSave && formSave.querySelector('.a38-review-note'), plan = formSave && formSave.querySelector('.a38-review-plan'), done = formSave && formSave.querySelector('.a38-review-done');
        if (examSelect && ((note && note.value.trim()) || (plan && plan.value.trim()))) {
          var exam = data.raw.filter(function (e) { return examId(e) === examSelect.value; })[0];
          var list = reviews(), editId = formSave.getAttribute('data-a38-edit-id'), next = { id: editId || 'r-' + Date.now().toString(36), examId: examSelect.value, examName: exam && exam.name, note: note.value.trim(), plan: plan.value.trim(), done: !!(done && done.checked), createdAt: new Date().toISOString() };
          if (editId) { list = list.map(function (item) { return String(item.id) === String(editId) ? next : item; }); }
          else list.push(next);
          saveReviews(list); track('analysis_review_saved', {}); renderStats();
        } else if (formSave) formSave.querySelector('.a38-review-note').focus();
        return;
      }
      var del = target.closest('[data-a38-review-delete]');
      if (del) { saveReviews(reviews().filter(function (x) { return String(x.id) !== String(del.getAttribute('data-a38-review-delete')); })); renderStats(); return; }
      var matrixOpen = target.closest('[data-a38-matrix-open]');
      if (matrixOpen) {
        var openId = matrixOpen.getAttribute('data-a38-matrix-open'), openExamData = data.raw.filter(function (e) { return examId(e) === openId; })[0];
        if (openExamData && typeof window.openExam === 'function') { window.openExam(openExamData); }
        else { matrixOpen.closest('[data-a38-matrix-row]').classList.add('selected'); }
        return;
      }
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
      if (t.matches('[data-a38-matrix-query]')) { c.matrixQuery = t.value || ''; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-matrix-sort]')) { c.matrixSort = t.value || 'date'; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-matrix-kind]')) { c.matrixKind = ['current', 'target', 'rank', 'people'].indexOf(t.value) >= 0 ? t.value : 'current'; persistConfig(); renderStats(); return; }
      if (t.matches('[data-a38-review-done]')) {
        var reviewId = t.getAttribute('data-a38-review-done'), list = reviews();
        list.forEach(function (item) { if (String(item.id) === String(reviewId)) item.done = !!t.checked; });
        saveReviews(list); return;
      }
    });
    root.querySelectorAll('[data-a38-section]').forEach(function (details) {
      details.addEventListener('toggle', function () { updateSection(details.getAttribute('data-a38-section'), details.open); });
    });
  }
  function installDeepObserver() {
    installModelExamScope();
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
    installModelExamScope();
    injectStyles();
    ensureNav();
    var top = window.pageYOffset || 0, data;
    try { data = buildData(); } catch (e) { data = { exams: [], allFilter: [], raw: rawExams(), subjects: [], focus: '__total__', focusLabel: '总分', metric: 'score_final', records: [], valid: [], previousRecords: [], yearRankCount: 0, classRankCount: 0, scoreCount: 0, latest: null, latestRecord: null, rankScope: config().rankScope === 'class' ? 'class' : 'year', rankLabel: config().rankScope === 'class' ? '班级位比' : '年级位比', rankCoverage: { available: 0, complete: 0, missingPeople: 0 } }; }
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
