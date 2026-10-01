/* A retrospective, personal score/rank scale. Not population test equating. */
(function () {
  'use strict';
  var cache = new WeakMap();
  function present(v) { return v != null && !(typeof v === 'string' && v.trim() === ''); }
  function num(v) { if (!present(v) || (typeof v !== 'string' && typeof v !== 'number')) return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var i = a.length >> 1; return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2; }
  function sigmoid(y) { return y >= 0 ? 1 / (1 + Math.exp(-y)) : Math.exp(y) / (1 + Math.exp(y)); }
  function logit(p) { p = clamp(p, 0.005, 0.995); return Math.log(p / (1 - p)); }
  function day(e) { var s = String(e.exam_date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; var t = Date.parse(s + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? t / 86400000 : null; }
  function key(e) { return e.id != null && e.id !== '' ? 'id:' + e.id : JSON.stringify([e.exam_date || '', e.name || '', e.grade_level || '']); }
  function invNormal(p) {
    // Reuse the application's tested statistical kernel when it is present.
    var core = window.PAL2 && window.PAL2.core || window.PAL && window.PAL.core;
    if (core && core.invNorm) return core.invNorm(p);
    // Standalone fallback: invert an Abramowitz–Stegun normal CDF approximation.
    function cdf(x) {
      var a = Math.abs(x), t = 1 / (1 + 0.2316419 * a), tail = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI) * t *
        (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
      return x >= 0 ? 1 - tail : tail;
    }
    var lo = -8, hi = 8;
    for (var i = 0; i < 48; i++) { var m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function observation(e, subject, index) {
    var r = e && e.scores && e.scores[subject] || {}, score = num(r.actual), max = num(r.max);
    var N = present(r.participants) ? num(r.participants) : num(e.total_participants);
    var rank = num(r.rank), pos = num(r.yearPositionPercent);
    if (present(r.yearPositionPercent)) { if (pos === null || pos <= 0 || pos > 100) pos = null; }
    else if (rank !== null && N !== null && Number.isInteger(rank) && rank >= 1 && rank <= N) pos = rank / N * 100;
    var o = { e: e, index: index, score: score, max: max, N: N, pos: pos, day: day(e),
      scoreValid: score !== null && max !== null && max > 0 && score >= 0 && score <= max,
      rankValid: pos !== null && N !== null && Number.isSafeInteger(N) && N >= 30 };
    o.valid = o.scoreValid && o.rankValid && o.day !== null;
    if (o.valid) { var edge = Math.max(0.5 / N, 1e-8); o.z = invNormal(1 - clamp(pos / 100 - 0.5 / N, edge, 1 - edge)); o.y = logit(score / max); }
    return o;
  }
  function fit(points) {
    var mx = mean(points.map(function (p) { return p.z; })), my = mean(points.map(function (p) { return p.y; }));
    var cx = median(points.map(function (p) { return p.z; })), sx = Math.max(0.15, 1.4826 * median(points.map(function (p) { return Math.abs(p.z - cx); })));
    var weights = points.map(function (p) { return Math.min(1, 2.5 * sx / Math.max(Math.abs(p.z - cx), 1e-9)); });
    var b = 0, a = my, raw = 0;
    for (var t = 0; t < 24; t++) {
      var sw = 0, x = 0, y = 0;
      points.forEach(function (p, i) { sw += weights[i]; x += weights[i] * p.z; y += weights[i] * p.y; }); x /= sw; y /= sw;
      var xx = 0, xy = 0; points.forEach(function (p, i) { xx += weights[i] * (p.z - x) * (p.z - x); xy += weights[i] * (p.z - x) * (p.y - y); });
      raw = xx > 1e-10 ? xy / xx : 0; var nextB = Math.max(0, raw), nextA = y - nextB * x;
      var residuals = points.map(function (p) { return p.y - nextA - nextB * p.z; }), rm = median(residuals);
      var scale = Math.max(0.03, 1.4826 * median(residuals.map(function (v) { return Math.abs(v - rm); })));
      weights = points.map(function (p, i) { return Math.min(1, 2.5 * sx / Math.max(Math.abs(p.z - cx), 1e-9)) * Math.min(1, 1.345 * scale / Math.max(Math.abs(residuals[i]), 1e-9)); });
      if (Math.abs(nextB - b) + Math.abs(nextA - a) < 1e-9) { a = nextA; b = nextB; break; } a = nextA; b = nextB;
    }
    var residual = points.map(function (p) { return p.y - a - b * p.z; }), med = median(residual);
    var dispersion = 1.4826 * median(residual.map(function (v) { return Math.abs(v - med); }));
    return { b: b, rawSlope: raw, meanZ: mx, meanY: my, dispersion: dispersion,
      spreadZ: Math.sqrt(mean(points.map(function (p) { return (p.z - mx) * (p.z - mx); }))) };
  }
  function hardness(p, model, slope) { var b = slope == null ? model.b : slope; return b * (p.z - model.meanZ) - (p.y - model.meanY); }
  function difficultyIndex(h) { return 100 * sigmoid(h); }
  function context(exams, subject) {
    var observations = exams.map(function (e, i) { return observation(e, subject, i); });
    var signature = JSON.stringify(observations.map(function (o) { return [key(o.e), o.day, o.e.grade_level || '', o.score, o.max, o.pos, o.N]; }));
    var perSubject = cache.get(exams); if (!perSubject) { perSubject = Object.create(null); cache.set(exams, perSubject); }
    if (perSubject[subject] && perSubject[subject].signature === signature) return perSubject[subject];
    var seen = Object.create(null), unique = [];
    // Duplicate IDs are one exam; keep the final supplied record.
    observations.slice().reverse().forEach(function (o) { var k = key(o.e); if (!seen[k]) { seen[k] = true; if (o.valid) unique.push(o); } });
    unique.sort(function (a, b) { return a.day - b.day || key(a.e).localeCompare(key(b.e)); });
    var categories = Object.create(null), groups = [], byIndex = Object.create(null);
    unique.forEach(function (o) {
      var category = String(o.e.grade_level || ''), group = categories[category];
      if (!group || Math.abs(o.N - median(group.points.map(function (p) { return p.N; }))) / Math.max(o.N, median(group.points.map(function (p) { return p.N; }))) >= 0.3) {
        group = { points: [], category: category }; groups.push(group); categories[category] = group;
      }
      group.points.push(o); o.group = group; byIndex[o.index] = o;
    });
    groups.forEach(function (group) { if (group.points.length >= 3) group.model = fit(group.points); });
    var result = { signature: signature, observations: observations, groups: groups, byIndex: byIndex };
    perSubject[subject] = result; return result;
  }
  function scoreOnScale(cur, delta, max) {
    if (Math.abs(delta) < 1e-10) return cur.score / cur.max * max;
    return max * sigmoid(cur.y + delta);
  }
  function compare(exams, subject, index, options) {
    options = options || { mode: 'history' };
    var e = exams[index], out = { kind: 'empty', referenceMode: options.mode || 'history', references: [] };
    if (!e) { out.reason = '先录入一次考试，就可以建立你的成绩参考尺子。'; return out; }
    var cur = observation(e, subject, index); out.current = cur;
    if (!cur.scoreValid) { out.reason = '补齐这次的成绩和满分，就能开始比较。'; return out; }
    if (out.referenceMode === 'exam' && Number(options.exam) === index) {
      out.kind = 'identity'; out.value = cur.score; out.targetMax = cur.max; out.low = cur.score; out.high = cur.score; out.references = [cur]; out.referenceLabel = e.name || '本次考试'; out.quality = 'identity';
      var self = context(exams, subject).byIndex[index];
      if (self && self.group.model) { out.modelN = self.group.points.length; out.difficulty = out.referenceDifficulty = difficultyIndex(hardness(self, self.group.model)); }
      return out;
    }
    if (!cur.rankValid) { out.reason = '还需要这科的年级排名（或排名位置）和参考人数。少于 30 人时，暂不估计难度。'; return out; }
    if (cur.day === null) { out.reason = '补齐有效的考试日期，就能建立参考尺子。'; return out; }
    var ctx = context(exams, subject), point = ctx.byIndex[index];
    if (!point) { out.reason = '这场考试有重复记录，已避免重复计入参考尺子。'; return out; }
    var group = point.group, model = group.model; out.modelN = group.points.length;
    if (!model) { out.reason = '这组可比较的记录还不足 3 场。补齐成绩、满分和年级排名后，就能估计相对难度。'; return out; }
    var refs = group.points, max = cur.max, label = '历史平均';
    if (out.referenceMode === 'period') {
      var start = day({ exam_date: options.start }), end = day({ exam_date: options.end });
      if (start === null || end === null || start > end) { out.reason = '选一个完整的日期范围，开始日期要早于或等于结束日期。'; return out; }
      refs = refs.filter(function (p) { return p.day >= start && p.day <= end; }); label = options.start + ' 至 ' + options.end;
    } else if (out.referenceMode === 'exam') {
      var ref = ctx.byIndex[Number(options.exam)];
      if (!ref || ref.group !== group) { out.reason = '参照考试需要有完整的单科成绩和排名，并属于同一分类、同一参考人群阶段。'; return out; }
      refs = [ref]; max = ref.max; label = ref.e.name || '参照考试';
    }
    if (!refs.length) { out.reason = '这个时间段内没有可用的参照考试，试试扩大日期范围。'; return out; }
    var h = hardness(point, model), refH = mean(refs.map(function (p) { return hardness(p, model); }));
    out.kind = 'estimate'; out.referenceLabel = label; out.references = refs; out.targetMax = max;
    out.value = scoreOnScale(point, h - refH, max); out.difficulty = difficultyIndex(h); out.referenceDifficulty = difficultyIndex(refH);
    out.sameMaxValue = scoreOnScale(point, h - refH, point.max); out.offset = h - refH;
    if (!group.slopes) {
      var count = Math.min(80, group.points.length), slopes = [];
      for (var i = 0; i < count; i++) {
        var omit = count === 1 ? 0 : Math.round(i * (group.points.length - 1) / (count - 1));
        slopes.push(fit(group.points.filter(function (_, j) { return j !== omit; })).b);
      }
      group.slopes = slopes;
    }
    // Sensitivity of the fitted slope: fixed full-history centering and fixed reference inputs.
    var values = group.slopes.map(function (b) {
      var delta = hardness(point, model, b) - mean(refs.map(function (p) { return hardness(p, model, b); }));
      return scoreOnScale(point, delta, max);
    }).concat(out.value);
    out.low = Math.min.apply(null, values); out.high = Math.max.apply(null, values); out.sensitivityRuns = group.slopes.length;
    var reasons = [];
    if (group.points.length < 8) reasons.push('历史记录还少');
    if (model.spreadZ < 0.15) reasons.push('历史排名变化较小，尺子的斜率还不明确');
    if (model.rawSlope <= 0 && model.spreadZ >= 0.15) reasons.push('分数与排名的历史关系较弱，换算更接近参照范围的平均得分率');
    if (model.dispersion > 0.5) reasons.push('历史分数与排名关系波动较大');
    if (out.high - out.low > max * 0.1) reasons.push('少用一场历史记录，换算结果就会明显变化');
    if (point.score === 0 || point.score === point.max || refs.some(function (p) { return p.score === 0 || p.score === p.max; })) reasons.push('含零分或满分，边界附近的换算更不确定');
    if (refs.length === 1) reasons.push('参照仅有一场考试，个人状态可能影响其难度估计');
    out.quality = reasons.length ? 'limited' : 'supported'; out.warnings = reasons; out.model = model;
    return out;
  }
  function cells(exams, subjects) {
    var result = Object.create(null);
    subjects.forEach(function (subject) {
      var ctx = context(exams, subject);
      Object.keys(ctx.byIndex).forEach(function (i) {
        var p = ctx.byIndex[i], m = p.group.model;
        if (m) result[i + '|' + subject] = { index: difficultyIndex(hardness(p, m)), n: p.group.points.length,
          limited: p.group.points.length < 8 || m.spreadZ < 0.15 || m.rawSlope <= 0 || m.dispersion > 0.5 };
      });
    }); return result;
  }
  window.__stScoreWorthModel = { observation: observation, compare: compare, cells: cells, fit: fit, context: context, day: day, key: key, difficultyIndex: difficultyIndex };
})();
