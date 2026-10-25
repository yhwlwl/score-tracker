/* Shared by the browser bundle and Edge handlers. All breakdowns use raw marks. */
(function (root) {
  'use strict';
  function number(value) {
    if (value === null || value === undefined || value === '') return null;
    if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return NaN;
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 99999 && Math.abs(n * 100 - Math.round(n * 100)) < 0.000001 ? n : NaN;
  }
  function clean(rows, label) {
    if (!Array.isArray(rows) || rows.length > 30) throw new Error((label || '') + '题型须为列表，每科最多 30 项');
    var seen = new Set();
    return rows.filter(function (r) { return !(r && r.name === '' && (r.score == null || r.score === '') && (r.max == null || r.max === '')); }).map(function (r) {
      if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('题型条目格式不正确');
      var name = typeof r.name === 'string' ? r.name.trim() : '';
      if (!name || name.length > 40) throw new Error('题型名称请填写 1～40 个字符');
      if (seen.has(name)) throw new Error('题型「' + name + '」重复了，请合并或区分名称');
      seen.add(name);
      var score = number(r.score), max = number(r.max);
      if (Number.isNaN(score) || Number.isNaN(max) || max === 0) throw new Error(name + '的得分须为非负数、满分须大于 0，最多两位小数');
      if (max !== null && score !== null && score > max) throw new Error(name + '的得分不能超过满分');
      return { name: name, score: score, max: max };
    });
  }
  function sum(rows) {
    var score = 0, max = 0, scored = 0, complete = rows.length > 0;
    rows.forEach(function (r) { if (r.score !== null) { score += r.score; scored++; } if (r.max !== null) max += r.max; if (r.score === null || r.max === null) complete = false; });
    return { score: Math.round(score * 100) / 100, max: Math.round(max * 100) / 100, scored: scored, complete: complete };
  }
  function validate(rows, rawMax, rawScore) {
    var s = sum(rows);
    if (rawMax != null && s.max > rawMax + 0.000001) throw new Error('题型满分合计超过卷面原始满分，请检查是否重复录入');
    if (rawMax != null && s.score > rawMax + 0.000001) throw new Error('题型得分合计超过卷面原始满分');
    if (rawScore != null && s.score > rawScore + 0.000001) throw new Error('题型得分合计超过原始分，请核对后保存');
    return s;
  }
  var api = { number: number, clean: clean, sum: sum, validate: validate };
  root.ScoreQuestionTypeModel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
