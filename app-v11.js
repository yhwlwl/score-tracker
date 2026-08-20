// v11: add direct raw-rank views beside normalized rank percentile
state.trendMetric = state.trendMetric || 'score';

(function injectV11Styles() {
  if ($('#app-v11-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v11-extra-style';
  style.textContent = `
    .raw-rank-note-v11{font-size:11px;line-height:1.6;color:var(--muted);margin-top:8px}
    .raw-rank-note-v11 b{color:var(--text)}
  `;
  document.head.appendChild(style);
})();

function rawRankValueV11(exam, subject) {
  if (!exam) return null;
  if (subject === '总分') return num(exam.total_rank);
  return num(exam.scores?.[subject]?.rank);
}

function niceRankStepV11(rough) {
  if (!Number.isFinite(rough) || rough <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return Math.max(1, nice * power);
}

function rawRankAxisV11(values) {
  const nums = (values || []).filter((v) => v !== null && Number.isFinite(Number(v))).map(Number);
  if (!nums.length) return { min: 1, max: 100, step: 20, ticks: 5 };
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const span = Math.max(hi - lo, Math.max(8, hi * 0.08));
  const pad = Math.max(2, span * 0.14);
  const step = niceRankStepV11((span + pad * 2) / 5);
  let min = Math.max(1, Math.floor((lo - pad) / step) * step);
  let max = Math.ceil((hi + pad) / step) * step;
  if (min < 1) min = 1;
  if (max <= min) max = min + step * 4;
  let ticks = Math.round((max - min) / step);
  if (ticks < 3) { max = min + step * 4; ticks = 4; }
  if (ticks > 6) ticks = 6;
  return { min, max, step: (max - min) / ticks, ticks };
}

function rawRankChartHtmlV11() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>记录名次后，这里会显示原始名次趋势</div></div>`;
  const colors = typeof rankSeriesColorsV7 === 'function' ? rankSeriesColorsV7() : ['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
  const subjects = state.subject === '总览' ? ['总分', ...SUBJECTS] : [state.subject];
  const series = subjects.map((subject, index) => ({ subject, color: colors[index % colors.length] }));
  const visible = series.filter((item) => state.exams.some((exam) => rawRankValueV11(exam, item.subject) !== null));
  if (!visible.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>这个项目还没有名次数据</div></div>`;

  const points = state.exams.map((exam) => ({ exam, values: visible.map((item) => rawRankValueV11(exam, item.subject)) }));
  const axis = rawRankAxisV11(points.flatMap((point) => point.values));
  const W = 760, H = 310, L = 56, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  // Raw rank is intentionally inverted: rank 1 stays at the top, larger/worse ranks go downward.
  const y = (v) => T + (v - axis.min) / (axis.max - axis.min) * ch;

  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) {
    const value = axis.min + ((axis.max - axis.min) * i / axis.ticks);
    const yy = T + (ch * i / axis.ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="axis-label">第${Math.max(1, Math.round(value))}</text>`;
  }

  const lines = visible.map((item, seriesIndex) => {
    let d = '', started = false, circles = '';
    points.forEach((point, pointIndex) => {
      const value = point.values[seriesIndex];
      if (value === null) { started = false; return; }
      const xx = x(pointIndex), yy = y(value);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} · ${escapeHtml(item.subject)} 第${value}名"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === '总览' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = state.subject === '总览' ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>` : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="raw-rank-note-v11"><b>原始名次模式：</b>直接显示第几名，不换算百分位；纵轴越高越好，第 1 名在最上方。总览叠加时，最好保证各科使用相同的排名口径和相近的参考人数。</div>`;
}

const chartHtmlBeforeV11 = chartHtml;
chartHtml = function chartHtmlV11() {
  if (state.trendMetric === 'rank_raw') return rawRankChartHtmlV11();
  return chartHtmlBeforeV11();
};

const homeHtmlBeforeV11 = homeHtml;
homeHtml = function homeHtmlV11() {
  let html = homeHtmlBeforeV11();
  html = html.replace(/<button class="metric-btn-v7 [^"]*" data-trend-metric="rank">排名<\/button>/,
    `<button class="metric-btn-v7 ${state.trendMetric === 'rank_raw' ? 'active' : ''}" data-trend-metric="rank_raw">名次</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">排名百分位</button>`);
  if (state.trendMetric === 'rank_raw') {
    html = html.replace('<h3 class="card-title">成绩趋势</h3>', '<h3 class="card-title">名次趋势</h3>');
    html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">直接看原始第几名；纵轴反向显示，第 1 名在最上方</p>');
    html = html.replace('<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>', '<p class="card-sub">总分与各科直接叠加原始名次；越靠上代表名次越好</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">原始名次 · 第 1 名最好</div>');
    html = html.replace('<div class="subtle-note">真实成绩 · 得分率</div>', '<div class="subtle-note">原始名次 · 越小越好</div>');
    html = html.replace('<div class="chart-wrap" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
    html = html.replace('<div class="chart-wrap overview-mode-v5" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
  }
  return html;
};

const radarValueBeforeV11 = radarValueV9;
radarValueV9 = function radarValueV11(exam, subject, mode = state.radarMode) {
  if (mode === 'rank_raw') return rawRankValueV11(exam, subject);
  return radarValueBeforeV11(exam, subject, mode);
};

const radarChartBeforeV11 = radarChartHtml;
radarChartHtml = function radarChartHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarChartBeforeV11(selected);
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择有名次数据的考试后，这里会直接显示各科原始名次</div></div>`;
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目名次，暂时无法叠加比较</div></div>`;

  const allValues = [];
  selected.forEach((exam) => subjects.forEach((subject) => allValues.push(rawRankValueV11(exam, subject))));
  const axis = rawRankAxisV11(allValues);
  const W = 620, H = 430, cx = 310, cy = 210, radius = 190;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i), r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  // Smaller/better rank is farther out, preserving the radar-chart meaning: outward = better.
  const normalize = (rank) => Math.max(0, Math.min(1, (axis.max - rank) / (axis.max - axis.min)));

  let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">第${Math.round(axis.max)}</text>`;
  for (let i = 1; i <= axis.ticks; i += 1) {
    const ratio = i / axis.ticks;
    const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
    const rankValue = axis.max - ((axis.max - axis.min) * ratio);
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">第${Math.max(1, Math.round(rankValue))}</text>`;
  }
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i), labelPos = pointAt(1.11, i);
    const label = SUBJECT_SHORT[subject] || (typeof subjectShortV7 === 'function' ? subjectShortV7(subject) : String(subject).slice(0, 2));
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${escapeHtml(label)}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(normalize(rawRankValueV11(exam, subject)), i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const value = rawRankValueV11(exam, subject), [x, y] = pointAt(normalize(value), i);
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${escapeHtml(exam.name)} · ${escapeHtml(subject)} 第${value}名"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">原始名次动态缩放（外圈名次更好：第${Math.round(axis.min)} ～ 第${Math.round(axis.max)}）</div>`;
};

const radarSummaryBeforeV11 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarSummaryBeforeV11(selected);
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前名次较弱科目</h4><div class="subtle-note">所选考试没有共同名次数据。</div></div></div>`;
  const latest = selected.at(-1), earliest = selected[0];
  const weakness = subjects.map((subject) => ({ subject, rank: rawRankValueV11(latest, subject) })).sort((a, b) => b.rank - a.rank).slice(0, 3);
  const comparisons = subjects.map((subject) => ({
    subject,
    before: rawRankValueV11(earliest, subject),
    after: rawRankValueV11(latest, subject),
    improvement: rawRankValueV11(earliest, subject) - rawRankValueV11(latest, subject)
  })).sort((a, b) => b.improvement - a.improvement);
  const best = comparisons[0] || null, worst = comparisons.at(-1) || null;
  return `<div class="radar-summary"><div class="summary-card"><h4>当前名次较弱科目</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>第${item.rank}名</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '名次变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.improvement >= 0 ? '↑' : '↓'}${Math.abs(best.improvement)}名</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.improvement >= 0 ? '↑' : '↓'}${Math.abs(worst.improvement)}名</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div class="subtle-note">再选择一次考试，就能直接比较各科前进或后退了多少名。</div></div>`}</div></div>`;
};

const radarCardBeforeV11 = radarCardHtml;
radarCardHtml = function radarCardHtmlV11() {
  let html = radarCardBeforeV11();
  html = html.replace(/<button class="chip [^"]*" data-radar-mode="rank">排名百分位<\/button>/,
    `<button class="chip ${state.radarMode === 'rank_raw' ? 'active' : ''}" data-radar-mode="rank_raw">名次</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">排名百分位</button>`);
  if (state.radarMode === 'rank_raw') {
    html = html.replace('按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。', '直接按原始名次绘制：外圈代表更好的名次，第 1 名方向最外；不做参考人数百分位换算。');
    html = html.replace('最多可叠加 4 次考试。叠加时只显示所选考试共同拥有数据的科目；坐标轴会按当前数据动态缩放。', '最多可叠加 4 次考试。只显示共同拥有名次的科目；原始名次会动态缩放，外圈名次更好。');
  }
  return html;
};
