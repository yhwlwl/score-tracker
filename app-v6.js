// v6: dynamic chart/radar axis ranges to improve visual separation on mobile
(function injectV6Styles() {
  if (document.getElementById('app-v6-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v6-extra-style';
  style.textContent = `
    .axis-caption-v6{font-size:11px;color:var(--muted);margin-top:8px}
    .radar-wrap{height:470px}
    .radar-wrap svg{display:block;width:100%;height:100%}
    @media(max-width:620px){.radar-wrap{height:430px}}
  `;
  document.head.appendChild(style);
})();

function calcDynamicAxisRangeV6(values, options = {}) {
  const nums = (values || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v))).map(Number);
  const minLimit = options.minLimit ?? 0;
  const maxLimit = options.maxLimit ?? 100;
  const step = options.step ?? 5;
  const minSpan = options.minSpan ?? 20;
  const padRatio = options.padRatio ?? 0.18;
  if (!nums.length) return { min: minLimit, max: maxLimit, ticks: 5 };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  const rawSpan = Math.max(max - min, minSpan * 0.4);
  const pad = Math.max(step, rawSpan * padRatio);
  min = Math.max(minLimit, Math.floor((min - pad) / step) * step);
  max = Math.min(maxLimit, Math.ceil((max + pad) / step) * step);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = Math.max(minLimit, Math.floor((mid - minSpan / 2) / step) * step);
    max = Math.min(maxLimit, Math.ceil((mid + minSpan / 2) / step) * step);
    if (max - min < minSpan) {
      if (min === minLimit) max = Math.min(maxLimit, min + minSpan);
      else min = Math.max(minLimit, max - minSpan);
    }
  }
  if (min === max) {
    max = Math.min(maxLimit, min + minSpan);
    min = Math.max(minLimit, max - minSpan);
  }
  return { min, max, ticks: 5 };
}

if (typeof overviewChartHtmlV4 === 'function') {
  overviewChartHtmlV4 = function overviewChartHtmlDynamicV6(series) {
    if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
    const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
    if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>还没有可用于总览图的真实成绩</div></div>`;

    const points = state.exams.map((exam) => ({
      name: exam.name,
      date: exam.exam_date,
      values: visible.map((item) => item.getValue(exam))
    }));
    const allValues = points.flatMap((point) => point.values).filter((v) => v !== null);
    const axis = calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 });

    const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46;
    const cw = W - L - R, ch = H - T - B;
    const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
    const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;

    let grid = '';
    for (let i = 0; i <= axis.ticks; i += 1) {
      const value = axis.max - ((axis.max - axis.min) * i / axis.ticks);
      const yy = T + (ch * i / axis.ticks);
      grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`;
    }

    const lines = visible.map((seriesItem, seriesIndex) => {
      let d = '';
      let started = false;
      let circles = '';
      points.forEach((point, pointIndex) => {
        const value = point.values[seriesIndex];
        if (value === null) {
          started = false;
          return;
        }
        const xx = x(pointIndex), yy = y(value);
        d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
        started = true;
        circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} · ${seriesItem.label} ${formatPercent(value)}"/>`;
      });
      return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    }).join('');
    const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div><div class="axis-caption-v6">纵轴已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
  };
}

if (typeof radarChartHtml === 'function') {
  radarCardHtml = function radarCardHtmlV6() {
    const available = radarAvailableExams();
    const selected = selectedRadarExams();
    return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。</p></div></div>
      <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加对比时，会自动只显示这些考试共同拥有数据的科目；纵轴会按当前选中的数据动态缩放，差异更清楚。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
      <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
  };

  radarChartHtml = function radarChartHtmlDynamicV6(selected) {
    if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
    const subjects = (typeof subjectsWithDataV4 === 'function' ? subjectsWithDataV4(selected, state.radarMode, 'all') : SUBJECTS.filter((subject) => selected.every((exam) => scoreRate(exam, subject, state.radarMode) !== null)));
    if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目数据，暂时无法叠加比较</div></div>`;

    const allValues = [];
    selected.forEach((exam) => subjects.forEach((subject) => allValues.push(scoreRate(exam, subject, state.radarMode))));
    const axis = calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 });

    const W = 620, H = 430;
    const cx = 310, cy = 210, radius = 190;
    const angleStep = (Math.PI * 2) / subjects.length;
    const angleAt = (i) => -Math.PI / 2 + i * angleStep;
    const pointAt = (ratio, i) => {
      const angle = angleAt(i);
      const r = radius * ratio;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    };
    const normalize = (value) => Math.max(0, Math.min(1, (value - axis.min) / (axis.max - axis.min)));

    let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">${Math.round(axis.min)}%</text>`;
    for (let i = 1; i <= axis.ticks; i += 1) {
      const ratio = i / axis.ticks;
      const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
      const labelValue = axis.min + ((axis.max - axis.min) * i / axis.ticks);
      grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
      grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(labelValue)}%</text>`;
    }
    subjects.forEach((subject, i) => {
      const [x, y] = pointAt(1, i);
      grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
      const labelPos = pointAt(1.11, i);
      grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
    });

    const polygons = selected.map((exam, index) => {
      const color = RADAR_COLORS[index % RADAR_COLORS.length];
      const points = subjects.map((subject, i) => pointAt(normalize(scoreRate(exam, subject, state.radarMode)), i).join(',')).join(' ');
      const circles = subjects.map((subject, i) => {
        const [x, y] = pointAt(normalize(scoreRate(exam, subject, state.radarMode)), i);
        return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
      }).join('');
      return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">纵轴已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
  };
}
