/* One explicit historical exam per comparison; ranks do not depend on scores or maxima. */
(function () {
  'use strict';
  function date(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v; }
  function round(v) { return Math.round(v * 100) / 100 || 0; }
  function pair(now, before, metric, scope) {
    if (!before) return { reason: '对比考试未录入本科目' };
    if (before.excluded) return { reason: '对比考试中本科目不计总分' };
    if (metric === 'rank' || metric === 'position') {
      var a = now[scope], b = before[scope], key = metric === 'rank' ? 'n' : 'percent';
      if (a.invalid || b.invalid) return { reason: '名次与参考人数不一致，请先核对' };
      if (a[key] === null || b[key] === null) return { reason: metric === 'rank' ? '两场都需录入该范围的名次' : '两场都需有效位比，或名次与参考人数' };
      return { before: b[key], after: a[key], value: round(b[key] - a[key]), oldRank: b, newRank: a };
    }
    if (metric === 'rate') {
      if (now.rate === null || before.rate === null) return { reason: '两场都需有效最终分和满分' };
      return { before: before.rate, after: now.rate, value: round(now.rate - before.rate) };
    }
    if (now.actual === null || before.actual === null) return { reason: '有一场尚未录入最终分' };
    if (!(now.max > 0) || now.max !== before.max) return { reason: '最终满分不同，可切换得分率或排名查看' };
    if (now.rate === null || before.rate === null) return { reason: '分数超出有效范围，请先核对' };
    return { before: before.actual, after: now.actual, value: round(now.actual - before.actual) };
  }
  function build(exam, exams, options, model) {
    var metric = options.metric || 'score', scope = options.scope || 'year', current = model(exam);
    var history = date(exam.exam_date) ? exams.filter(function (e) {
      return e.id !== exam.id && !e.is_hidden && date(e.exam_date) && e.exam_date < exam.exam_date && (!options.sameCategory || String(e.grade_level || '').trim() === String(exam.grade_level || '').trim());
    }).slice().sort(function (a, b) { return b.exam_date.localeCompare(a.exam_date) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)); }) : [];
    function compare(previous) {
      var old = model(previous), points = [], missing = [];
      current.included.forEach(function (row) {
        var oldRow = old.rows.find(function (r) { return r.name === row.name; }), result = pair(row, oldRow, metric, scope);
        if (result.reason) missing.push({ name: row.name, reason: result.reason });
        else points.push(Object.assign({ name: row.name }, result));
      });
      var total = null, totalReason = '';
      if (metric === 'rank' || metric === 'position') {
        var p = pair(current, old, metric, scope);
        if (!p.reason) total = Object.assign({ name: '总排名' }, p); else totalReason = p.reason;
      } else {
        var sameSubjects = current.included.length > 0 && current.included.length === old.included.length && current.included.every(function (r) { return old.included.some(function (o) { return r.name === o.name && r.max === o.max; }); });
        if (sameSubjects && current.complete && old.complete && !current.manual && !old.manual && current.rate !== null && old.rate !== null) {
          total = metric === 'rate' ? { name: '总得分率', before: old.rate, after: current.rate, value: round(current.rate - old.rate) } : { name: '总分', before: old.total, after: current.total, value: round(current.total - old.total) };
        } else totalReason = current.manual || old.manual ? '使用手动总分，仅对比各科，不推算总分变化。' : '两场计分科目、满分或出分完整度不同，仅展示可比科目。';
      }
      return { points: points, missing: missing, total: total, totalReason: totalReason };
    }
    var selected = options.compareId ? history.find(function (e) { return e.id === options.compareId; }) : null;
    if (!selected) selected = history.find(function (e) { var c = compare(e); return c.points.length || c.total; }) || history[0];
    return Object.assign({ metric: metric, scope: scope, history: history, previous: selected || null }, selected ? compare(selected) : { points: [], missing: [], total: null, totalReason: '' });
  }
  window.ScoreExamChanges = { build: build };
})();
