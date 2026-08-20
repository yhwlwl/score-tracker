// v9: add normalized rank percentile to radar comparison
(function injectV9Styles() {
  if ($('#app-v9-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v9-extra-style';
  style.textContent = `
    .radar-mode-note-v9{font-size:11px;line-height:1.6;color:var(--muted);margin-top:7px}
    .radar-mode-note-v9 b{color:var(--text)}
  `;
  document.head.appendChild(style);
})();

function radarValueV9(exam, subject, mode = state.radarMode) {
  if (mode === 'rank') {
    return typeof rankInfoV7 === 'function' ? rankInfoV7(exam, subject).performance : null;
  }
  return scoreRate(exam, subject, mode);
}

function radarSubjectsV9(exams, mode = state.radarMode) {
  if (!exams.length) return [];
  return SUBJECTS.filter((subject) => exams.every((exam) => radarValueV9(exam, subject, mode) !== null));
}

radarAvailableExams = function radarAvailableExamsV9(mode = state.radarMode) {
  return state.exams.filter((exam) => SUBJECTS.some((subject) => radarValueV9(exam, subject, mode) !== null));
};

radarCardHtml = function radarCardHtmlV9() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  const rankMode = state.radarMode === 'rank';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">${rankMode ? '按排名百分位绘制：越靠外代表相对排名越好；可叠加多次考试观察竞争力变化。' : '按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。'}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">排名百分位</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加时只显示所选考试共同拥有数据的科目；坐标轴会按当前数据动态缩放。</div>${rankMode ? '<div class="radar-mode-note-v9"><b>排名百分位不是直接用“第几名”：</b>会结合参考人数标准化。第 1 名接近 100%，越高越好；不同考试人数变化时也更可比。</div>' : ''}<div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : `<span class="subtle-note">${rankMode ? '当前还没有同时填写“名次 + 参考人数”的科目排名数据' : '当前还没有可用于雷达图的数据'}</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV9(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>${state.radarMode === 'rank' ? '选择有排名数据的考试后，这里会显示各科排名百分位' : '选择 1 次或多次考试后，这里会显示全部科目的结构变化'}</div></div>`;
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>${state.radarMode === 'rank' ? '所选考试没有共同且完整的排名数据，请检查各科名次和参考人数' : '所选考试没有共同的科目数据，暂时无法叠加比较'}</div></div>`;

  const allValues = [];
  selected.forEach((exam) => subjects.forEach((subject) => allValues.push(radarValueV9(exam, subject))));
  const axis = typeof calcDynamicAxisRangeV6 === 'function'
    ? calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 })
    : { min: 0, max: 100, ticks: 5 };

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
    const label = SUBJECT_SHORT[subject] || subjectShortV7?.(subject) || String(subject).slice(0, 2);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${escapeHtml(label)}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(normalize(radarValueV9(exam, subject)), i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const value = radarValueV9(exam, subject);
      const [x, y] = pointAt(normalize(value), i);
      let tip = `${escapeHtml(exam.name)} · ${escapeHtml(subject)} ${formatPercent(value)}`;
      if (state.radarMode === 'rank' && typeof rankInfoV7 === 'function') {
        const info = rankInfoV7(exam, subject);
        tip = `${escapeHtml(exam.name)} · ${escapeHtml(subject)} 第${info.rank}/${info.participants}名 · 排名百分位 ${formatPercent(value)}`;
      }
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${tip}"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  const label = state.radarMode === 'rank' ? '排名百分位' : '纵轴';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">${label}已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
};

radarSummaryHtml = function radarSummaryHtmlV9(selected) {
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="subtle-note">所选考试没有共同完整的数据，暂时无法计算。</div></div><div class="summary-card"><h4>对比说明</h4><div class="subtle-note">请减少叠加考试，或补齐相同科目的${state.radarMode === 'rank' ? '名次和参考人数' : '成绩'}。</div></div></div>`;

  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = subjects
    .map((subject) => ({ subject, value: radarValueV9(latest, subject) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);
  const comparisons = subjects
    .map((subject) => ({
      subject,
      delta: radarValueV9(latest, subject) - radarValueV9(earliest, subject),
      latest: radarValueV9(latest, subject)
    }))
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const average = subjects.reduce((sum, subject) => sum + radarValueV9(latest, subject), 0) / subjects.length;
  const isRank = state.radarMode === 'rank';

  return `<div class="radar-summary"><div class="summary-card"><h4>${isRank ? '当前排名相对薄弱科目' : '当前薄弱科目'}</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>${formatPercent(item.value)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与对比科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? '平均排名百分位' : '整体平均得分率'}：<span class="comparison-strong">${formatPercent(average)}</span></div><div>${isRank ? '排名提升最大' : '进步最大'}：${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? '平均排名百分位' : '平均得分率'}：<span class="comparison-strong">${formatPercent(average)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到${isRank ? '各科相对排名' : '弱项'}改善了多少。</div></div>`}</div></div>`;
};

// Radar points also support tap/hover tooltips in v9.
const bindPageBeforeV9 = bindPage;
bindPage = function bindPageV9() {
  bindPageBeforeV9();
  const radar = $('#radarChart');
  if (!radar) return;
  let tip = $('.tooltip-card', radar);
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip-card';
    radar.appendChild(tip);
  }
  $$('[data-tip]', radar).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = radar.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
};
