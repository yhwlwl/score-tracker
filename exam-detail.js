/* One exam, one place to read its scores, ranks and saved papers. */
(function () {
  'use strict';
  var view = null, editor = null, generation = 0;
  var esc = function (v) { return escapeHtml(v == null ? '' : String(v)); };
  function number(v) { return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v); }
  function fmt(v) { return v == null ? '—' : String(Math.round(v * 10) / 10); }
  function signed(v) { return (v > 0 ? '+' : '') + fmt(v); }
  function owner() { return String(state.user && state.user.id || ''); }
  function allExams() { return state.allExams || state.exams || []; }
  function currentExam() { return view && allExams().find(function (e) { return e.id === view.id; }); }
  function active(v) { return view === v && v.user === owner() && v.token === state.token && state.page === 'records'; }
  function track(event, metadata) { try { var fn = window.__scoreTrackerTrack || window.__stTrack; if (typeof fn === 'function') fn(event, metadata || {}); } catch (_) {} }
  function paperReviewAvailable() { return !!(window.ScorePaperReview && typeof window.ScorePaperReview.api === 'function' && typeof window.ScorePaperReview.mount === 'function'); }
  function leave() {
    if (editor && editor.canLeave && !editor.canLeave()) return false;
    if (editor && editor.dispose) editor.dispose();
    editor = null; generation++; return true;
  }
  function button(label, action, extra) { return '<button type="button" class="ed-button ' + (extra || '') + '" data-ed="' + esc(action) + '">' + esc(label) + '</button>'; }
  function rank(exam, subject, scope) {
    var r = rankInfoByScopeV16(exam, subject, scope), n = number(r.rank), count = number(r.participants);
    if (!(n >= 1 && Number.isInteger(n))) n = null;
    if (!(count >= 1 && Number.isInteger(count))) count = null;
    if (n !== null && count !== null && n > count) return { n: n, count: count, percent: null, invalid: true };
    var direct = r.directPercent ? number(r.positionPercent) : null;
    return { n: n, count: count, percent: direct !== null && direct >= 0 && direct <= 100 ? direct : n !== null && count !== null ? n / count * 100 : null };
  }
  function rankText(r) {
    return r.n !== null ? '第 ' + fmt(r.n) + ' 名' : r.percent !== null ? '前 ' + fmt(r.percent) + '%' : '未录入';
  }
  function rankSub(r) {
    if (r.invalid) return '名次大于参考人数，请核对';
    return (r.count !== null ? '共 ' + fmt(r.count) + ' 人' : r.n !== null ? '未填参考人数' : '') + (r.percent !== null && r.n !== null ? ' · 前 ' + fmt(r.percent) + '%' : '');
  }
  function model(exam) {
    var moduleNames = new Set((state.modulesV18 || []).map(function (m) { return m.name; }));
    var rows = Object.keys(exam.scores || {}).filter(function (name) { return !moduleNames.has(name); }).map(function (name) {
      var s = exam.scores[name], actual = number(examScore(exam, name, 'actual')), max = number(examMax(exam, name));
      return { name: name, actual: actual, max: max, raw: number(s.raw), rawMax: number(s.rawMax) || max,
        fallback: number(s.actual) === null && actual !== null, target: number(s.target), excluded: !!s.excludeFromTotal,
        rate: actual !== null && actual >= 0 && max > 0 && actual <= max ? actual / max * 100 : null,
        year: rank(exam, name, 'year'), class: rank(exam, name, 'class') };
    });
    var included = rows.filter(function (r) { return !r.excluded; }), scored = included.filter(function (r) { return r.actual !== null; });
    var manual = number(exam.total_actual_score), complete = included.length > 0 && scored.length === included.length;
    var max = included.every(function (r) { return r.max > 0; }) ? included.reduce(function (n, r) { return n + r.max; }, 0) : null;
    var total = manual !== null ? manual : scored.length ? scored.reduce(function (n, r) { return n + r.actual; }, 0) : null;
    var target = included.length && included.every(function (r) { return r.target !== null; }) ? included.reduce(function (n, r) { return n + r.target; }, 0) : null;
    return { rows: rows, included: included, scored: scored, complete: complete, manual: manual !== null, max: max, total: total,
      rate: manual === null && complete && max > 0 && included.every(function (r) { return r.rate !== null; }) ? total / max * 100 : null,
      gap: manual === null && complete && target !== null ? total - target : null,
      year: rank(exam, '总分', 'year'), class: rank(exam, '总分', 'class') };
  }
  var quadrants = {
    strength: { title: '优势巩固', text: '得分率较高，排名也较靠前。保留有效方法。', color: '#2b886d' },
    potential: { title: '抢分突破', text: '排名较靠前，卷面仍有失分空间。优先找可追回的分。', color: '#427cc4' },
    compete: { title: '竞争提升', text: '得分率较高，排名相对靠后。关注区分度较高的题。', color: '#aa761c' },
    support: { title: '优先补强', text: '得分率和排名都相对靠后。先补基础与常见失分。', color: '#b56862' },
    neutral: { title: '接近均值', text: '至少一项指标位于均值线上，结合具体试题判断。', color: '#7b8493' }
  };
  function quadrantData(m, scope) {
    var eligible = m.included.filter(function (r) { return r.rate !== null && r[scope].percent !== null; });
    var meanRate = eligible.reduce(function (sum, r) { return sum + r.rate; }, 0) / eligible.length;
    var meanPosition = eligible.reduce(function (sum, r) { return sum + r[scope].percent; }, 0) / eligible.length;
    return { mode: 'performance', palette: quadrants, rate: meanRate, position: meanPosition, points: eligible.map(function (r, i) {
      var x = r.rate - meanRate, y = meanPosition - r[scope].percent;
      var group = Math.abs(x) < 0.000001 || Math.abs(y) < 0.000001 ? 'neutral' : x > 0 ? y > 0 ? 'strength' : 'compete' : y > 0 ? 'potential' : 'support';
      return { row: r, index: i + 1, x: x, y: y, group: group };
    }) };
  }
  var movementGroups = {
    strength: { title: '优势上升', text: '当前排名相对靠前，最近也在进步。继续保持有效的方法。', color: '#2b886d' },
    potential: { title: '优势回落', text: '当前仍是相对优势科目，最近出现回落。对照试题找找失分变化。', color: '#aa761c' },
    compete: { title: '弱科改善', text: '当前排名相对靠后，但最近正在改善。继续观察有效的练习方法。', color: '#427cc4' },
    support: { title: '优先关注', text: '当前排名相对靠后，最近也在回落。优先核对失分原因。', color: '#b56862' },
    neutral: { title: '持平或临界', text: '变化基本持平，或当前排名位于强弱科分界线上，结合具体试题判断。', color: '#7b8493' }
  };
  function median(values) {
    if (!values.length) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; }), mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
  function movementData(exam, m, scope, windowSize, sameCategory) {
    var current = m.included.filter(function (r) { return r[scope].percent !== null; });
    var divider = median(current.map(function (r) { return r[scope].percent; }));
    var category = String(exam.grade_level || '').trim();
    var candidates = validDate(exam.exam_date) ? allExams().filter(function (e) {
      return e.id !== exam.id && !e.is_hidden && validDate(e.exam_date) && e.exam_date < exam.exam_date && (!sameCategory || String(e.grade_level || '').trim() === category);
    }).slice().sort(function (a, b) { return b.exam_date.localeCompare(a.exam_date) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)); }) : [];
    var points = [], missing = [], required = windowSize === 'recent' ? 2 : 1;
    m.included.forEach(function (r) {
      if (r[scope].percent === null) {
        missing.push({ row: r, reason: r[scope].invalid ? '名次与人数不一致' : '缺少本次位比（请补名次与人数）' }); return;
      }
      // Use actual exam dates, not the manually arranged record order. Same-day records do not imply a sequence.
      var dates = new Set(), history = [];
      candidates.forEach(function (e) {
        var row = e.scores && e.scores[r.name]; if (!row || row.excludeFromTotal || dates.has(e.exam_date)) return;
        var info = rank(e, r.name, scope); if (info.percent === null) return;
        dates.add(e.exam_date); history.push({ exam: e, info: info });
      });
      if (history.length < required) { missing.push({ row: r, reason: required === 2 ? '近3次趋势需要本次及之前2次可比排名，目前共 ' + (history.length + 1) + ' 次' : '没有更早的' + (sameCategory ? '同分类、' : '') + '同科目、同排名范围的有效排名' }); return; }
      var observations = history.slice(0, required).reverse().concat([{ exam: exam, info: r[scope] }]);
      var x;
      if (required === 1) x = observations[0].info.percent - r[scope].percent;
      else {
        // Fit by exam sequence, never by the irregular days between exams. Positive means moving forward.
        var center = (observations.length - 1) / 2, mean = observations.reduce(function (n, o) { return n + o.info.percent; }, 0) / observations.length;
        var numerator = 0, denominator = 0;
        observations.forEach(function (o, i) { numerator += (i - center) * (o.info.percent - mean); denominator += (i - center) * (i - center); });
        x = -numerator / denominator;
      }
      var y = divider - r[scope].percent;
      var group = Math.abs(x) < 0.005 || Math.abs(y) < 0.000001 ? 'neutral' : y > 0 ? x > 0 ? 'strength' : 'potential' : x > 0 ? 'compete' : 'support';
      points.push({ row: r, index: points.length + 1, x: x, y: y, group: group, observations: observations });
    });
    return { mode: 'movement', palette: movementGroups, position: divider, positions: current.map(function (r) { return r[scope].percent; }), currentCount: current.length, points: points, missing: missing, windowSize: windowSize, sameCategory: !!sameCategory };
  }
  function fmtChange(value) { return String(Math.round((value + Number.EPSILON) * 100) / 100); }
  function changeText(point, recent) { return Math.abs(point.x) < 0.005 ? '基本持平' : (point.x > 0 ? '进步 ' : '退步 ') + fmtChange(Math.abs(point.x)) + (recent ? ' 个百分点 / 场' : ' 个百分点'); }
  function metric(label, value, sub) { return '<div class="ed-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(sub || '') + '</small></div>'; }
  function header(exam) {
    return '<div class="ed-top">' + button('← 返回考试记录', 'back') + button('编辑 / 补录', 'edit') + '</div><header class="ed-heading"><span class="ed-eyebrow">单次考试详情</span><h1 tabindex="-1">' + esc(exam.name) + '</h1><p>' + esc(fmtYearDate(exam.exam_date) + (exam.end_date && exam.end_date !== exam.exam_date ? ' — ' + fmtYearDate(exam.end_date) : '') + ' · ' + (exam.grade_level || '未分类')) + (exam.is_hidden ? ' · 已从趋势图隐藏，仍可查看完整记录' : '') + '</p></header>';
  }
  function overview(exam, m) {
    var totalLabel = m.manual ? '已录入总分' : m.complete ? '本次总分' : '已录入科目小计';
    var totalSub = m.manual ? '使用手动填写的总分' : '计入总分的 ' + m.scored.length + ' / ' + m.included.length + ' 科已出分';
    var rateSub = m.manual ? '手动总分不推算满分与得分率' : m.complete ? '总分 ÷ 本次各科满分之和' : '全部计分科目出分后计算';
    var extra = [['city_rank','city_participants','市排名'],['district_rank','district_participants','区排名']].map(function (pair) {
      var r = number(exam[pair[0]]), n = number(exam[pair[1]]); return r > 0 ? '<span>' + pair[2] + ' <b>第 ' + fmt(r) + ' 名</b>' + (n > 0 ? ' / ' + fmt(n) + ' 人' : '') + '</span>' : '';
    }).join('');
    var targetText = m.gap === null ? '' : m.gap >= 0 ? '已达到本次总目标' + (m.gap ? '，超出 ' + fmt(m.gap) + ' 分' : '') : '距离本次总目标还差 ' + fmt(-m.gap) + ' 分';
    return '<section class="ed-overview" aria-label="考试整体概况"><div class="ed-metrics">' +
      metric(totalLabel, fmt(m.total), totalSub) + metric('总得分率', m.rate === null ? '—' : fmt(m.rate) + '%', rateSub) +
      metric('年级排名', rankText(m.year), rankSub(m.year)) + metric('班级排名', rankText(m.class), rankSub(m.class)) +
      '</div>' + (targetText || extra ? '<div class="ed-context">' + (targetText ? '<span>' + targetText + '</span>' : '') + extra + '</div>' : '') +
      '<nav class="ed-nav" aria-label="考试详情目录">' + button('各科成绩', 'jump:scores') + button('强弱科四象限', 'jump:quadrants') + (paperReviewAvailable() ? button('已录入试题', 'jump:papers') : '') + '</nav></section>';
  }
  function cell(label, text) { return '<td data-label="' + label + '">' + text + '</td>'; }
  function rankCell(r) { return '<span>' + esc(rankText(r)) + '</span><small>' + esc(rankSub(r)) + '</small>'; }
  function averageCell(exam, r) {
    return [['year','年级'],['class','班级']].map(function (pair) {
      var v = window.ScoreAverages && window.ScoreAverages.value(exam, r.name, pair[0], false);
      if (v == null) return '';
      return '<span>' + pair[1] + ' ' + fmt(v) + '</span>' + (r.actual !== null ? '<small>' + (r.actual === v ? '与均分持平' : (r.actual > v ? '高于' : '低于') + '均分 ' + fmt(Math.abs(r.actual - v)) + ' 分') + '</small>' : '');
    }).join('') || '—';
  }
  function scores(exam, m) {
    var hasAverages = m.rows.some(function (r) { return averageCell(exam, r) !== '—'; });
    return '<section class="ed-section" id="ed-scores" tabindex="-1"><div class="ed-section-head"><div><span class="ed-eyebrow">01 / 成绩</span><h2>各科得分与排名</h2><p>最终分与原始分分开展示，目标差按最终分计算。</p></div></div>' +
      (m.rows.length ? '<div class="ed-table-wrap"><table class="ed-table"><thead><tr>' + ['科目','最终分 / 满分','原始分 / 满分','得分率','目标 / 差值','年级排名','班级排名'].concat(hasAverages ? ['平均分'] : []).map(function (s) { return '<th scope="col">' + s + '</th>'; }).join('') + '</tr></thead><tbody>' + m.rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.name) + (r.excluded ? '<small>统计项 · 不计总分</small>' : '') + '</th>' +
          cell('最终分', '<b>' + fmt(r.actual) + '</b> / ' + fmt(r.max) + (r.fallback ? '<small>同满分原始分</small>' : '')) +
          cell('原始分', r.raw === null ? '—' : fmt(r.raw) + ' / ' + fmt(r.rawMax)) + cell('得分率', r.rate === null ? '—' : fmt(r.rate) + '%') +
          cell('目标', r.target === null ? '未设置' : fmt(r.target) + (r.actual !== null ? '<small>' + (r.actual === r.target ? '已达标' : signed(r.actual - r.target) + ' 分') + '</small>' : '')) +
          cell('年级排名', rankCell(r.year)) + cell('班级排名', rankCell(r.class)) + (hasAverages ? cell('平均分', averageCell(exam, r)) : '') + '</tr>';
      }).join('') + '</tbody></table></div>' : '<p class="ed-empty">还没有科目数据，点击“编辑 / 补录”添加成绩。</p>') + combinations(exam, m) + '</section>';
  }
  function combinations(exam, m) {
    var selected = (state.modulesV18 || []).filter(function (mod) { return (exam.moduleIds || []).includes(mod.id); });
    if (!selected.length) return '';
    var ranks = exam.moduleRanks || {};
    if (!Object.keys(ranks).length) { try { ranks = JSON.parse(localStorage.getItem('st_moduleranks_v25_' + (state.user.username || 'anon')) || '{}')[exam.exam_date + '|' + exam.name] || {}; } catch (_) {} }
    return '<details class="ed-combinations"><summary>科目组合 <span>' + selected.length + ' 组</span></summary><div class="ed-combo-grid">' + selected.map(function (mod) {
      var members = mod.subjects.map(function (s) { return m.rows.find(function (r) { return r.name === s; }); });
      var complete = members.length > 0 && members.every(function (r) { return r && r.actual !== null; });
      var total = complete ? members.reduce(function (n, r) { return n + r.actual; }, 0) : null, mr = ranks[mod.id] || {};
      return '<article><h3>' + esc(mod.name) + '</h3><p>' + esc(mod.subjects.join(' + ')) + '</p><b>' + (total === null ? '科目分数待补齐' : fmt(total) + ' 分') + '</b>' + [['yearRank','yearParticipants','年排'],['classRank','classParticipants','班排']].map(function (pair) {
        var n = number(mr[pair[0]]), people = number(mr[pair[1]]); return n !== null ? '<small>' + pair[2] + ' ' + fmt(n) + (people !== null ? ' / ' + fmt(people) + ' 人' : '') + '</small>' : '';
      }).join('') + '</article>';
    }).join('') + '</div></details>';
  }
  function plot(data) {
    var movement = data.mode === 'movement', palette = data.palette;
    var points = data.points, maxX = Math.max(10, Math.ceil(Math.max.apply(null, points.map(function (p) { return Math.abs(p.x); })) / 10) * 10), maxY = Math.max(10, Math.ceil(Math.max.apply(null, points.map(function (p) { return Math.abs(p.y); })) / 10) * 10);
    var low = 0, high = 100;
    if (movement) {
      var min = Math.min.apply(null, data.positions), max = Math.max.apply(null, data.positions), pad = Math.max(2, (max - min) * .15);
      low = Math.max(0, Math.floor((min - pad) / 5) * 5); high = Math.min(100, Math.ceil((max + pad) / 5) * 5);
      if (high - low < 10) { high = Math.min(100, low + 10); low = Math.max(0, high - 10); }
    }
    function positionY(value) { return 62 + (value - low) / (high - low) * 278; }
    var cx = 330, cy = movement ? positionY(data.position) : 201, sx = 245 / maxX, sy = 139 / maxY, marks = '';
    function yFor(p) { return movement ? positionY(p.row[view.scope].percent) : cy - p.y * sy; }
    [-1, -.5, .5, 1].forEach(function (t) {
      var x = cx + t * 245;
      marks += '<line x1="' + x + '" y1="62" x2="' + x + '" y2="340" class="ed-grid-line"/><text x="' + x + '" y="365" text-anchor="middle">' + signed(t * maxX) + '</text>';
    });
    (movement ? [0, .25, .5, .75, 1] : [-1, -.5, 0, .5, 1]).forEach(function (t) {
      var position = low + t * (high - low), y = movement ? positionY(position) : cy - t * 139;
      marks += '<line x1="85" y1="' + y + '" x2="575" y2="' + y + '" class="ed-grid-line"/><text x="73" y="' + (y + 4) + '" text-anchor="end">' + (movement ? '前' + fmtChange(position) + '%' : signed(t * maxY)) + '</text>';
    });
    // Coincident points retain their true coordinate; the subject buttons remain individually selectable.
    var groups = new Map(); points.forEach(function (p) { var key = p.x.toFixed(6) + '|' + p.y.toFixed(6); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(p); });
    var dots = Array.from(groups.values()).map(function (ps) {
      var p = ps[0], label = ps.map(function (p) { return p.row.name; }).join('、'), x = cx + p.x * sx, y = yFor(p);
      return '<g role="button" tabindex="0" aria-label="' + esc(label + '，查看科目表现') + '" data-ed-point="' + p.index + '"><title>' + esc(label) + '</title><circle cx="' + x + '" cy="' + y + '" r="13" fill="' + palette[p.group].color + '"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" class="ed-dot-number">' + (ps.length > 1 ? ps.length + '科' : p.index) + '</text></g>';
    }).join('');
    var top = 47, bottom = 354;
    var xLabel = movement ? data.windowSize === 'recent' ? '← 退步 / 进步 →（百分点 / 场）' : '← 退步 / 进步 →（百分点）' : '得分率较均值（百分点）→';
    var accessible = movement ? '当前排名与变化四象限。上方排名较靠前，右侧正在进步，左侧正在退步。' : '本次考试强弱科四象限。右侧得分率较高，上方排名较靠前。';
    return '<svg class="ed-quadrant" viewBox="0 0 660 430" role="group" aria-label="' + accessible + '详细数值见下方科目按钮。"><rect x="70" y="' + top + '" width="260" height="' + (cy - top) + '" fill="' + palette.potential.color + '10"/><rect x="330" y="' + top + '" width="260" height="' + (cy - top) + '" fill="' + palette.strength.color + '10"/><rect x="70" y="' + cy + '" width="260" height="' + (bottom - cy) + '" fill="' + palette.support.color + '10"/><rect x="330" y="' + cy + '" width="260" height="' + (bottom - cy) + '" fill="' + palette.compete.color + '10"/>' + marks +
      '<path d="M70 ' + cy + 'H590M330 47V354" class="ed-axis"/><text x="330" y="365" text-anchor="middle">0</text><text x="85" y="32" class="ed-quadrant-title">' + palette.potential.title + '</text><text x="575" y="32" text-anchor="end" class="ed-quadrant-title">' + palette.strength.title + '</text><text x="85" y="393" class="ed-quadrant-title">' + palette.support.title + '</text><text x="575" y="393" text-anchor="end" class="ed-quadrant-title">' + palette.compete.title + '</text><text x="330" y="420" text-anchor="middle">' + xLabel + '</text><text transform="translate(16 201) rotate(-90)" text-anchor="middle">' + (movement ? '当前排名位比（越上越好）' : '排名较均值领先（百分点）→') + '</text>' + dots + '</svg>';
  }
  function quadrantsHtml(m, scope, d) {
    var movement = d.mode === 'movement', scopeName = scope === 'year' ? '年级' : '班级', palette = d.palette;
    var missing = movement ? d.missing : m.included.filter(function (r) { return !d.points.some(function (p) { return p.row === r; }); }).map(function (r) { return { row: r, reason: r.rate === null ? '缺少有效最终分或满分' : r[scope].invalid ? '名次与人数不一致' : '缺少' + scopeName + '位比（请补名次与人数）' }; });
    var ready = movement ? d.currentCount >= 2 && d.points.length > 0 : d.points.length >= 2;
    var modes = '<div class="ed-scope" role="group" aria-label="四象限视图">' + [['movement','排名与变化'],['performance','本次表现']].map(function (pair) { return '<button type="button" data-ed-mode="' + pair[0] + '" aria-pressed="' + (d.mode === pair[0]) + '">' + pair[1] + '</button>'; }).join('') + '</div>';
    var range = '<div class="ed-scope" role="group" aria-label="四象限排名范围">' + ['year','class'].map(function (s) { return '<button type="button" data-ed-scope="' + s + '" aria-pressed="' + (s === scope) + '">' + (s === 'year' ? '按年级' : '按班级') + '</button>'; }).join('') + '</div>';
    var method = movement ? '纵轴显示本次' + scopeName + '位比，以本次 ' + d.currentCount + ' 科位比中位数 <b>前 ' + fmt(d.position) + '%</b> 划分个人相对强弱。横轴以 0 为界，右进步、左退步。' + (d.windowSize === 'recent' ? '近3次趋势包含本次，按考试场次计算平均变化，不按间隔天数计算。' : '变化 = 上一次可比考试位比 − 本次位比。') + '只比较更早、' + (d.sameCategory ? '同分类、' : '') + '同科目、同排名范围的有效排名；已隐藏考试不参与历史比较，同一天不推断先后。变化四舍五入到 0.01 个百分点后为 0，标为基本持平。' : '以这 ' + d.points.length + ' 科的平均得分率 <b>' + fmt(d.rate) + '%</b>、平均' + scopeName + '位比 <b>前 ' + fmt(d.position) + '%</b> 为分界。各科等权，仅反映本次考试内的相对强弱，不代表试卷难度或长期水平。均值线上的科目标为“接近均值”。';
    var empty = movement ? d.currentCount < 2 ? '本次至少需要 2 门科目的有效' + scopeName + '位比，才能划分个人相对强弱。补充名次与参考人数，或直接填写位比即可。' : d.windowSize === 'recent' ? '还没有科目具备本次及之前2次的可比排名，可以先切换“较上次”，或查看“本次表现”。' : '还没有科目具备更早的可比排名，可以先查看“本次表现”。缺少历史不会记作持平。' : '至少需要 2 门科目的有效得分率和' + scopeName + '位比。补充名次与参考人数，或直接填写位比即可。';
    return '<div class="ed-section-head"><div><span class="ed-eyebrow">02 / 强弱科</span><h2>' + (movement ? '各科排名与变化' : '这一场，哪些科目值得重点关注') + '</h2><p>' + (movement ? '越靠上，当前排名越靠前；越靠右，最近进步越明显。' : '越靠右，得分率越高；越靠上，在同范围考生中排名越靠前。') + '</p></div></div><div class="ed-chart-controls">' + modes + range + (movement ? '<label class="ed-window">比较分类<select data-ed-category aria-label="排名变化比较分类"><option value="all" ' + (d.sameCategory ? '' : 'selected') + '>全部分类</option><option value="same" ' + (d.sameCategory ? 'selected' : '') + '>仅同分类</option></select></label><label class="ed-window">比较口径<select data-ed-window aria-label="排名变化比较口径"><option value="previous" ' + (view.trendWindow !== 'recent' ? 'selected' : '') + '>较上次可比考试</option><option value="recent" ' + (view.trendWindow === 'recent' ? 'selected' : '') + '>近3次趋势</option></select></label>' : '') + '</div>' +
      (!ready ? '<div class="ed-empty"><h3>' + (movement ? '暂时无法比较排名变化' : '还差一点数据，就能比较各科表现') + '</h3><p>' + empty + '</p>' + (movement ? '<button type="button" class="ed-button" data-ed-mode="performance">查看本次表现</button>' : button('补录成绩与排名', 'edit')) + '</div>' :
        '<div class="ed-chart-layout"><div>' + plot(d) + '<div class="ed-point-list">' + d.points.map(function (p) { return '<button type="button" data-ed-point="' + p.index + '" aria-pressed="false"><i style="background:' + palette[p.group].color + '">' + p.index + '</i>' + esc(p.row.name) + '</button>'; }).join('') + '</div></div><aside class="ed-inspect" aria-live="polite"></aside></div>' +
        '<div class="ed-quadrant-groups">' + ['strength','potential','compete','support'].map(function (key) { var names = d.points.filter(function (p) { return p.group === key; }).map(function (p) { return p.row.name; }); return '<article><h3><i style="background:' + palette[key].color + '"></i>' + palette[key].title + '</h3><b>' + (names.length ? esc(names.join('、')) : '暂无科目') + '</b><p>' + palette[key].text + '</p></article>'; }).join('') + '</div><details class="ed-method"><summary>分界与比较说明</summary><p>' + method + '</p></details>') +
      (missing.length ? '<details class="ed-missing"><summary>' + missing.length + ' 科暂未参与' + (movement ? '变化比较' : '四象限') + '</summary><ul>' + missing.map(function (item) { return '<li>' + esc(item.row.name) + '：' + esc(item.reason) + '</li>'; }).join('') + '</ul></details>' : '') +
      (m.rows.some(function (r) { return r.excluded; }) ? '<p class="ed-method">“不计总分”的统计项保留在成绩表中，不参与强弱科比较。</p>' : '');
  }
  function bindQuadrants(exam, m) {
    var host = document.querySelector('#ed-quadrants'); if (!host) return;
    var d = view.chartMode === 'performance' ? quadrantData(m, view.scope) : movementData(exam, m, view.scope, view.trendWindow || 'previous', view.sameCategory === true);
    host.innerHTML = quadrantsHtml(m, view.scope, d);
    function select(index, userInitiated) {
      var p = d.points.find(function (p) { return p.index === Number(index); }), inspect = host.querySelector('.ed-inspect'); if (!p || !inspect) return;
      var r = p.row, scopeName = view.scope === 'year' ? '年级' : '班级', movement = d.mode === 'movement'; view.pointName = r.name;
      if (userInitiated) track('exam_detail_quadrant_subject_selected', { mode: d.mode, scope: view.scope });
      var history = movement ? '<ol class="ed-history">' + p.observations.map(function (o, i) { return '<li><span>' + esc((i === p.observations.length - 1 ? '本次 · ' : '') + o.exam.name) + '</span><small>' + esc(fmtYearDate(o.exam.exam_date)) + '</small><b>' + esc(rankText(o.info)) + '</b>' + (o.info.n !== null ? '<small>' + esc(rankSub(o.info)) + '</small>' : '') + '</li>'; }).join('') + '</ol>' : '';
      inspect.innerHTML = '<span class="ed-eyebrow">科目观察</span><h3>' + esc(r.name) + '</h3><span class="ed-tag" style="color:' + d.palette[p.group].color + '">' + d.palette[p.group].title + '</span><dl>' +
        (movement ? '<div><dt>' + scopeName + '排名</dt><dd>' + esc(rankText(r[view.scope])) + '</dd></div>' : '<div><dt>最终分 / 满分</dt><dd>' + fmt(r.actual) + ' / ' + fmt(r.max) + '</dd></div><div><dt>得分率</dt><dd>' + fmt(r.rate) + '%</dd></div>') +
        '<div><dt>本次' + scopeName + '位比</dt><dd>前 ' + fmt(r[view.scope].percent) + '%</dd></div>' + (movement ? '<div><dt>' + (d.windowSize === 'recent' ? '近3次趋势' : '较上次') + '</dt><dd class="ed-change">' + changeText(p, d.windowSize === 'recent') + '</dd></div>' : '') + '</dl><p>' + d.palette[p.group].text + '</p>' + history + '<small>' + (movement ? '强弱科按本次各科位比中位数划分。' : '相对本次参与比较的各科均值。') + '</small>';
      host.querySelectorAll('button[data-ed-point]').forEach(function (el) { el.setAttribute('aria-pressed', String(el.dataset.edPoint === String(index))); });
    }
    host.querySelectorAll('[data-ed-point]').forEach(function (el) { el.onclick = function () { select(el.dataset.edPoint, true); }; if (el.tagName.toLowerCase() === 'g') el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el.dataset.edPoint, true); } }; });
    host.querySelectorAll('[data-ed-scope]').forEach(function (b) { b.onclick = function () { view.scope = b.dataset.edScope; track('exam_detail_quadrant_scope_changed', { scope: view.scope }); bindQuadrants(exam, m); document.querySelector('[data-ed-scope="' + view.scope + '"]').focus(); }; });
    host.querySelectorAll('[data-ed-mode]').forEach(function (b) { b.onclick = function () { view.chartMode = b.dataset.edMode; track('exam_detail_quadrant_mode_changed', { mode: view.chartMode }); bindQuadrants(exam, m); host.querySelector('[data-ed-mode="' + view.chartMode + '"]').focus(); }; });
    var categorySelect = host.querySelector('[data-ed-category]'); if (categorySelect) categorySelect.onchange = function () { view.sameCategory = categorySelect.value === 'same'; track('exam_detail_quadrant_category_scope_changed', { same_category: view.sameCategory }); bindQuadrants(exam, m); host.querySelector('[data-ed-category]').focus(); };
    var windowSelect = host.querySelector('[data-ed-window]'); if (windowSelect) windowSelect.onchange = function () { view.trendWindow = windowSelect.value; track('exam_detail_quadrant_window_changed', { window: view.trendWindow }); bindQuadrants(exam, m); host.querySelector('[data-ed-window]').focus(); };
    var first = d.points.find(function (p) { return p.row.name === view.pointName; }) || d.points[0]; if (first) select(first.index, false);
  }
  function papersHtml(v) {
    var subjects = Array.from(new Set(v.papers.map(function (p) { return p.subject; })));
    var filtered = v.papers.filter(function (p) { return !v.subject || p.subject === v.subject; });
    return '<div class="ed-paper-tools"><label>科目<select data-ed-subject><option value="">全部科目</option>' + subjects.map(function (s) { return '<option value="' + esc(s) + '" ' + (v.subject === s ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label>' + button('刷新', 'refresh-papers') + '</div>' +
      (filtered.length ? '<div class="ed-paper-grid">' + filtered.map(function (r) {
        var label = r.status === 'succeeded' ? r.options && r.options.purpose === 'record' ? '已录入' : '分析完成' : ({ running: '处理中', paused: '待继续', failed: '待恢复' })[r.status] || '待查看';
        return '<article class="ed-paper"><div><span class="ed-tag">' + esc(r.subject) + '</span><span class="ed-status">' + label + '</span></div><h3>' + esc(r.title || r.subject + '试卷') + '</h3><p>' + esc(r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '') + '</p>' + (r.progress && r.status !== 'succeeded' ? '<p>' + esc(r.progress.message || '') + '</p>' : '') + '<footer>' + button(r.status === 'succeeded' ? '查看录入的题' : '查看进度 / 已保存题目', 'paper:' + r.request_id, 'ed-primary') + (r.status === 'succeeded' && (!r.options || r.options.purpose !== 'record') ? button('查看分析', 'report:' + r.request_id) : '') + '</footer></article>';
      }).join('') + '</div>' : '<div class="ed-empty"><h3>' + (v.subject ? '当前已加载记录中没有这科的试题' : '这次考试还没有已录入试题') + '</h3><p>在“编辑 / 补录”中选择科目录入试卷，保存后会集中显示在这里。已有分析也可以在分析页关联到这次考试。</p>' + button('去录入试卷', 'edit') + '</div>') +
      '<div class="ed-paper-status" role="status" aria-live="polite">' + esc(v.paperError || '') + '</div>' + (v.more ? button(v.loading ? '读取中…' : '加载更多试卷', 'more-papers') : '');
  }
  function drawPapers(v) {
    var host = document.querySelector('.ed-paper-content'); if (!active(v) || !host) return;
    host.innerHTML = papersHtml(v);
    host.querySelector('[data-ed-subject]').onchange = function (e) { v.subject = e.target.value; track('exam_detail_papers_filtered', { filtered: v.subject ? 1 : 0 }); drawPapers(v); };
    host.querySelectorAll('[data-ed="refresh-papers"],[data-ed="more-papers"]').forEach(function (b) { b.disabled = !!v.loading; });
  }
  async function loadPapers(v, append) {
    var gen = generation, host = document.querySelector('.ed-paper-content'); if (!host || v.loading) return;
    track('exam_detail_papers_load_started', { append: append ? 1 : 0 });
    v.loading = true; v.paperError = ''; if (v.papers) drawPapers(v); else host.innerHTML = '<p class="ed-empty" role="status">正在读取这次考试的试题…</p>';
    try {
      var data = await window.ScorePaperReview.api(v, 'list_all', { exam_id: v.id, offset: append ? v.offset : 0 });
      if (!active(v) || generation !== gen || !host.isConnected) return;
      var rows = data.reviews || [];
      v.offset = (append ? v.offset : 0) + rows.length;
      v.papers = (append ? v.papers : []).concat(rows.filter(function (r) { return r.exam_id === v.id; }));
      v.more = !!data.has_more; v.loading = false; drawPapers(v);
      track('exam_detail_papers_loaded', { append: append ? 1 : 0, count: rows.length, total: v.papers.length, has_more: v.more ? 1 : 0 });
    } catch (e) {
      if (!active(v) || generation !== gen || !host.isConnected) return;
      v.loading = false; v.paperError = '试题读取未完成：' + e.message;
      track('exam_detail_papers_load_failed', { append: append ? 1 : 0, status: Number(e && e.status) || 0 });
      if (v.papers) drawPapers(v); else host.innerHTML = '<p class="ed-empty" role="alert">' + esc(v.paperError) + '</p>' + button('重新读取', 'refresh-papers');
    }
  }
  function renderDetail(exam) {
    var v = view, m = model(exam), content = document.getElementById('content');
    generation++; v.loading = false;
    if (!v.scope) v.scope = m.included.filter(function (r) { return r.year.percent !== null; }).length < 2 && m.included.filter(function (r) { return r.class.percent !== null; }).length >= 2 ? 'class' : 'year';
    content.innerHTML = '<div class="ed-page">' + header(exam) + (v.report ? '<div class="ed-reader"></div>' : overview(exam, m) + scores(exam, m) + '<section class="ed-section" id="ed-quadrants" tabindex="-1"></section>' + (paperReviewAvailable() ? '<section class="ed-section" id="ed-papers" tabindex="-1"><div class="ed-section-head"><div><span class="ed-eyebrow">03 / 试题与作答</span><h2>这次考试的试卷</h2><p>按科目查看已录入的题目、作答、批改分与原始扫描件。查看已有内容不计分析次数。</p></div></div><div class="ed-paper-content"></div></section>' : '')) + '</div>';
    content.querySelector('.ed-page').onclick = function (e) {
      var b = e.target.closest('[data-ed]'); if (!b) return;
      var action = b.dataset.ed;
      if (action === 'back') {
        if (!leave()) return;
        track('exam_detail_closed', { reason: 'back' });
        var scroll = v.scroll; view = null; render(); window.scrollTo(0, scroll);
        var original = Array.from(document.querySelectorAll('[data-exam-detail]')).find(function (b) { return b.dataset.examDetail === exam.id; }); if (original) original.focus({ preventScroll: true });
      } else if (action === 'edit') {
        track('exam_detail_edit_opened');
        if (editor) { if (!leave()) return; v.report = null; renderPage(); }
        openExam(currentExam());
      }
      else if (action.startsWith('jump:')) { var sectionName = action.slice(5), section = document.getElementById('ed-' + sectionName); if (section) { track('exam_detail_section_jumped', { section: sectionName }); section.focus({ preventScroll: true }); if (section.scrollIntoView) section.scrollIntoView({ block: 'start' }); } }
      else if (action === 'refresh-papers' || action === 'more-papers') { track('exam_detail_papers_action', { action: action === 'more-papers' ? 'load_more' : 'refresh' }); loadPapers(v, action === 'more-papers'); }
      else if (action.startsWith('paper:') || action.startsWith('report:')) {
        var r = v.papers.find(function (p) { return p.request_id === action.slice(action.indexOf(':') + 1); });
        if (r && leave()) { track('exam_detail_paper_opened', { view: action.startsWith('paper:') ? 'questions' : 'report', status: r.status || 'unknown' }); v.report = r; v.questionsFirst = action.startsWith('paper:'); renderPage(); }
      }
    };
    if (v.report) {
      var r = v.report;
      editor = { user: v.user, token: v.token, host: content.querySelector('.ed-reader'), exam: exam, examId: exam.id, draftId: r.draft_id,
        sessions: {}, options: r.options, initialReport: r.request_id, initialSection: v.questionsFirst ? 'questions' : '', expectedExamId: exam.id,
        closeLabel: '← 返回本次考试详情', isActive: function () { return active(v) && view.report === r; },
        onClose: function () { editor = null; v.report = null; v.papers = null; renderPage(); } };
      window.ScorePaperReview.mount(editor, r.subject, null);
    } else { bindQuadrants(exam, m); if (v.papers) drawPapers(v); else loadPapers(v, false); }
  }
  function open(id) {
    var exam = allExams().find(function (e) { return e.id === id; }); if (!exam || !leave()) return;
    view = { id: id, user: owner(), token: state.token, scroll: window.scrollY || 0, papers: null, offset: 0, more: false, loading: false, subject: '', chartMode: 'movement', trendWindow: 'previous', sameCategory: false };
    track('exam_detail_opened', { source: 'records' });
    state.page = 'records'; render(); window.scrollTo(0, 0);
    var heading = document.querySelector('.ed-heading h1'); if (heading) heading.focus({ preventScroll: true });
  }
  var recordBefore = recordHtml;
  recordHtml = function (exam) {
    return recordBefore.apply(this, arguments).replace(/(<div class="record-actions[^\"]*">)/, '$1<button type="button" class="record-action-btn-v10 ed-view-button" data-exam-detail="' + esc(exam.id) + '">查看详情</button>');
  };
  var bindBefore = bindPage;
  bindPage = function () { bindBefore.apply(this, arguments); document.querySelectorAll('[data-exam-detail]').forEach(function (b) { b.onclick = function () { open(b.dataset.examDetail); }; }); };
  var renderBefore = renderPage;
  renderPage = function () {
    if (view && active(view)) {
      var exam = currentExam(); if (exam) { renderBefore.apply(this, arguments); renderDetail(exam); return; }
    }
    if (view && (view.user !== owner() || view.token !== state.token || !currentExam())) { if (editor && editor.dispose) editor.dispose(); editor = null; view = null; }
    return renderBefore.apply(this, arguments);
  };
  var navBefore = bindNav;
  bindNav = function () {
    navBefore.apply(this, arguments);
    document.querySelectorAll('.desktop-nav [data-page],.bottom-nav [data-page]').forEach(function (b) {
      var previous = b.onclick; b.onclick = function (event) { if (!leave()) return; if (view && active(view)) track('exam_detail_closed', { reason: 'navigation' }); view = null; if (previous) previous.call(this, event); };
    });
  };
  window.ScoreExamDetail = { open: open };
  var style = document.createElement('style'); style.textContent = `
.ed-page{max-width:1160px;margin:0 auto 64px;color:var(--text)}.ed-top{display:flex;justify-content:space-between;gap:10px;margin-bottom:24px}.ed-button,.ed-scope button,.ed-point-list button{font:inherit;font-size:13px;cursor:pointer;min-height:38px;padding:8px 13px;color:var(--text);border:1px solid var(--line);background:var(--panel-solid,#fff);border-radius:9px}.ed-primary,.ed-view-button{color:var(--accent)!important;background:var(--accent-soft)!important;border-color:transparent!important;font-weight:650}.ed-button:disabled{opacity:.55;cursor:wait}.ed-page button:focus-visible,.ed-quadrant g:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.ed-heading{margin-bottom:25px}.ed-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--muted)}.ed-heading h1{font-size:30px;line-height:1.4;margin:8px 0;overflow-wrap:anywhere}.ed-heading p,.ed-section-head p{color:var(--muted);font-size:13px;line-height:1.75;margin:6px 0}.ed-overview{background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:18px;padding:25px;margin-bottom:28px}.ed-metrics{display:grid;grid-template-columns:1.15fr 1fr 1fr 1fr;gap:24px}.ed-metric{display:flex;flex-direction:column;gap:9px;min-width:0}.ed-metric>span{font-size:13px;color:var(--muted)}.ed-metric strong{font-size:28px;letter-spacing:-.04em;line-height:1.4;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.ed-metric:first-child strong{font-size:38px;line-height:1.03;color:var(--accent)}.ed-metric small{font-size:11px;line-height:1.6;color:var(--muted)}.ed-context{display:flex;gap:10px 25px;flex-wrap:wrap;font-size:12px;padding-top:22px;color:var(--muted)}.ed-nav{border-top:1px solid var(--line);display:flex;gap:9px;flex-wrap:wrap;margin-top:23px;padding-top:18px}.ed-nav .ed-button{border:0;background:var(--accent-soft);color:var(--accent)}.ed-section{background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:17px;padding:25px;margin:22px 0;scroll-margin-top:22px;min-width:0}.ed-section-head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:22px}.ed-section h2{font-size:21px;line-height:1.5;margin:6px 0}.ed-table-wrap{overflow-x:auto}.ed-table{width:100%;border-collapse:collapse;font-size:13px}.ed-table th,.ed-table td{padding:16px 10px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums;min-width:70px}.ed-table thead th{font-size:11px;font-weight:500;color:var(--muted);white-space:nowrap;background:var(--cell,#f8f9fc)}.ed-table tbody th{min-width:80px;font-size:14px;font-weight:650}.ed-table td b{font-size:16px}.ed-table small{display:block;font-size:11px;font-weight:400;color:var(--muted);line-height:1.6;margin-top:5px}.ed-combinations{margin-top:22px}.ed-combinations summary,.ed-missing summary{font-size:13px;cursor:pointer}.ed-combinations summary span{margin-left:8px;color:var(--muted)}.ed-combo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.ed-combo-grid article{border:1px solid var(--line);border-radius:12px;padding:16px}.ed-combo-grid h3{font-size:14px;margin:0}.ed-combo-grid p,.ed-combo-grid small{font-size:12px;line-height:1.6;color:var(--muted)}.ed-combo-grid small{display:block}.ed-scope{display:flex;flex:none;padding:3px;border:1px solid var(--line);border-radius:10px}.ed-scope button{background:transparent;border:0;padding:7px 12px}.ed-scope [aria-pressed=true]{color:var(--accent);background:var(--accent-soft);font-weight:650}.ed-chart-layout{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:24px;align-items:center}.ed-quadrant{display:block;width:100%;height:auto;overflow:visible}.ed-quadrant text{font-family:inherit;font-size:11px;fill:var(--muted)}.ed-quadrant .ed-quadrant-title{font-size:13px;font-weight:650;fill:var(--text)}.ed-quadrant .ed-dot-number{fill:#fff;font-size:11px;font-weight:700;pointer-events:none}.ed-quadrant g{cursor:pointer}.ed-grid-line{stroke:var(--line);stroke-width:.65;stroke-dasharray:3 5}.ed-axis{stroke:var(--muted);stroke-width:1;stroke-dasharray:4 4;fill:none}.ed-point-list{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin:14px 0}.ed-point-list button{display:flex;align-items:center;gap:7px;font-size:12px;padding:6px 10px;min-height:36px}.ed-point-list i{display:grid;place-items:center;font-size:10px;font-style:normal;width:19px;height:19px;border-radius:50%;color:#fff}.ed-point-list [aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent)}.ed-inspect{padding:22px 18px;background:var(--cell,#f7f9fc);border-radius:14px;min-width:0}.ed-inspect h3{font-size:24px;margin:9px 0 14px;overflow-wrap:anywhere}.ed-tag{display:inline-block;font-size:12px;font-weight:650;padding:4px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent)}.ed-inspect dl{margin:20px 0}.ed-inspect dl>div{display:flex;justify-content:space-between;gap:10px;margin:12px 0;font-size:12px}.ed-inspect dt{color:var(--muted)}.ed-inspect dd{font-variant-numeric:tabular-nums;margin:0;text-align:right}.ed-inspect p{font-size:13px;line-height:1.7}.ed-inspect small{font-size:11px;color:var(--muted)}.ed-quadrant-groups{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;border-top:1px solid var(--line);padding-top:20px;margin-top:17px}.ed-quadrant-groups h3{font-size:13px;margin:0 0 12px;display:flex;align-items:center;gap:7px}.ed-quadrant-groups i{width:7px;height:7px;border-radius:50%;flex:none}.ed-quadrant-groups b{font-size:14px;overflow-wrap:anywhere}.ed-quadrant-groups p,.ed-method,.ed-missing{font-size:12px;color:var(--muted);line-height:1.8}.ed-method{margin:18px 0 0}.ed-missing{margin-top:16px}.ed-missing ul{padding-left:20px}.ed-empty{padding:28px 15px;color:var(--muted);text-align:center;font-size:13px;line-height:1.8}.ed-empty h3{font-size:17px;color:var(--text)}.ed-paper-tools{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:18px}.ed-paper-tools label{display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted)}.ed-paper-tools select{font:inherit;font-size:13px;color:var(--text);background:var(--panel-solid,#fff);border:1px solid var(--line);padding:9px;border-radius:9px;max-width:200px}.ed-paper-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ed-paper{border:1px solid var(--line);border-radius:13px;padding:18px;display:flex;flex-direction:column;min-width:0}.ed-paper>div{display:flex;justify-content:space-between;gap:8px;align-items:center}.ed-status{font-size:11px;color:var(--muted)}.ed-paper h3{font-size:17px;line-height:1.6;margin:14px 0 7px;overflow-wrap:anywhere}.ed-paper p{font-size:12px;color:var(--muted);line-height:1.6}.ed-paper footer{display:flex;flex-wrap:wrap;gap:7px;padding-top:15px;margin-top:auto}.ed-paper-status{font-size:13px;color:var(--danger);margin:12px 0}.ed-reader .pr-main{max-width:900px}.ed-reader .pr-tabs{display:none}.ed-reader .pr-head h2{font-size:21px}.record-actions.record-actions-v10:has(.ed-view-button){flex-wrap:wrap!important}
@media(max-width:900px){.ed-chart-layout{grid-template-columns:minmax(0,1fr)}.ed-inspect{display:block}.ed-inspect dl{display:flex;gap:25px;flex-wrap:wrap;margin:10px 0}.ed-inspect dl>div{gap:12px;margin:6px 0}.ed-inspect h3{font-size:20px;display:inline-block;margin-right:10px}.ed-inspect>.ed-eyebrow{display:block}.ed-quadrant-groups{grid-template-columns:repeat(2,minmax(0,1fr))}.ed-paper-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ed-metrics{gap:18px}.ed-metric strong{font-size:23px}}
@media(max-width:620px){.ed-heading h1{font-size:25px}.ed-heading p{font-size:12px}.ed-overview,.ed-section{padding:18px 15px}.ed-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 14px}.ed-metric:first-child strong{font-size:34px}.ed-section-head{flex-direction:column;align-items:flex-start}.ed-section h2{font-size:19px}.ed-scope{align-self:flex-start}.ed-nav{gap:5px}.ed-nav .ed-button{padding:8px;font-size:12px}.ed-table,.ed-table tbody{display:block}.ed-table thead{display:none}.ed-table tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}.ed-table tbody th{grid-column:1/-1;font-size:17px;border-bottom:1px solid var(--line);padding:0 0 12px}.ed-table td{display:block;border:0;min-width:0;padding:0;font-size:13px}.ed-table td:before{content:attr(data-label);display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.ed-table small{font-size:11px}.ed-table-wrap{overflow:visible}.ed-paper-grid,.ed-combo-grid{grid-template-columns:1fr}.ed-quadrant-groups{gap:18px 12px}.ed-chart-layout{gap:12px}.ed-quadrant{width:calc(100% + 16px);margin-left:-8px}.ed-reader .pr-head{flex-wrap:wrap}.ed-reader .pr-main{min-width:0}.ed-inspect{padding:17px}.ed-inspect dl{gap:8px 20px}.ed-inspect dl>div{flex-direction:column}.ed-inspect dd{text-align:left}.ed-top{margin-bottom:20px}.ed-page{margin-bottom:80px}}
`;
  style.textContent += '.ed-chart-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:-4px 0 24px}.ed-window{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}.ed-window select{font:inherit;padding:10px;border:1px solid var(--line);border-radius:9px;color:var(--text);background:var(--panel-solid,#fff);min-height:38px;max-width:100%}.ed-method summary{cursor:pointer}.ed-method p{margin:8px 0}.ed-history{padding:0;list-style:none;margin:18px 0;border-top:1px solid var(--line)}.ed-history li{padding:12px 0;border-bottom:1px solid var(--line);font-size:12px;overflow-wrap:anywhere}.ed-history span,.ed-history small,.ed-history b{display:block}.ed-history small{margin-top:4px}.ed-history b{font-size:13px;margin-top:6px}.ed-inspect .ed-change{font-weight:650;overflow-wrap:anywhere}@media(max-width:620px){.ed-chart-controls{gap:10px;margin-bottom:20px}.ed-chart-controls .ed-scope{padding:2px}.ed-chart-controls .ed-scope button{font-size:12px;padding:7px 10px}.ed-window{width:100%}.ed-window select{flex:1;min-width:0}.ed-inspect .ed-history{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ed-inspect .ed-history li{min-width:0}}';
  document.head.appendChild(style);
})();
