// Render only the numbered datasets returned by the analysis tools.
(function () {
  'use strict';
  const metrics = {
    score: ['分数', '分'], rate: ['得分率', '%'], rank: ['年级位置', '%'],
    classRank: ['班级位置', '%'], cityRank: ['市排名位置', '%'], districtRank: ['区排名位置', '%'],
    scoreChange: ['分数变化', '分'], rateChange: ['得分率变化', '百分点'], rankChange: ['年级位置变化', '百分点'],
    difficulty: ['难度参考', '/ 100'], averageGap: ['较年级均分', '分'], count: ['场数', '场'], lost: ['失分', '分'],
  };
  const dimensionNames = { exams:'考试', subjects:'科目', bands:'排名区间', types:'题型', questions:'题号' };
  const colors = ['--accent', '--green', '--warn', '--text', '--danger'];
  const rankMetrics = ['rank','classRank','cityRank','districtRank'];
  const percentMetrics = ['rate', 'difficulty', ...rankMetrics];
  const isChange = metric => metric.endsWith('Change') || metric === 'averageGap';
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const rounded = n => Math.round(n * 100) / 100;

  function node(tag, name, text) {
    const el = document.createElement(tag);
    if (name) el.className = name;
    if (text != null) el.textContent = text;
    return el;
  }
  function button(text, name, handler) {
    const el = node('button', name, text);
    el.type = 'button';
    el.addEventListener('click', handler);
    return el;
  }
  function format(metric, value) {
    if (!finite(value)) return '—';
    const unit = metrics[metric][1];
    if (rankMetrics.includes(metric)) return '前 ' + value + '%';
    if (metric === 'rankChange') return value === 0 ? '持平' : (value > 0 ? '前进 ' : '后退 ') + Math.abs(value) + ' 个百分点';
    return (isChange(metric) && value > 0 ? '+' : '') + value + (unit === '%' ? '%' : ' ' + unit);
  }
  function valueText(series, point) {
    if (!point) return '—';
    const value = format(series.metric, point.value);
    return point.forecast && finite(point.low) && finite(point.high)
      ? value + ' · 范围 ' + format(series.metric, point.low) + '～' + format(series.metric, point.high) : value;
  }
  function buildTable(series, axes) {
    const wrapper = node('div', 'sq-chart-table');
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', '图表数据');
    const table = node('table');
    const headers = table.createTHead().insertRow();
    for (const label of [dimensionNames[series[0].dimension] || '考试', ...series.map(s => s.label + ' · ' + metrics[s.metric][0])]) {
      const cell = node('th', '', label);
      cell.scope = 'col';
      headers.append(cell);
    }
    const body = table.createTBody();
    for (const axis of axes) {
      const row = body.insertRow();
      const heading = node('th', '', axis.label);
      heading.scope = 'row';
      if (axis.detail) heading.append(node('small', '', axis.detail));
      row.append(heading);
      for (const s of series) row.insertCell().textContent = valueText(s, s.byKey.get(axis.key));
    }
    wrapper.append(table);
    return wrapper;
  }

  function radarGeometry(width,height) {
    const center = [width/2,height/2], radius = Math.min(width*.36,height*.35);
    return (index, count, scale) => {
      const a = index / count * Math.PI * 2 - Math.PI / 2;
      return [center[0]+Math.cos(a)*radius*scale,center[1]+Math.sin(a)*radius*scale];
    };
  }
  function drawRadar(ctx, series, axes, active, width, height, ink) {
    const at = radarGeometry(width,height), count = axes.length;
    const trace = points => {
      ctx.beginPath();
      points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();
    };
    ctx.strokeStyle=ink('--line');
    for (const level of [.25,.5,.75,1]) { trace(axes.map((_,i)=>at(i,count,level)));ctx.stroke(); }
    ctx.textBaseline='middle';ctx.textAlign='center';
    axes.forEach((axis,i)=>{
      const origin=at(i,count,0),position=at(i,count,1);
      ctx.strokeStyle=ink(i===active?'--muted':'--line');
      ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(...position);ctx.stroke();
      ctx.fillStyle=ink(i===active?'--text':'--muted');
      ctx.fillText(axis.label.slice(0,6),...at(i,count,1.21),64);
    });
    series.forEach((s,j)=>{
      const values=axes.map(a=>s.byKey.get(a.key)?.value);
      const points=values.map((v,i)=>finite(v)?at(i,count,Math.max(0,Math.min(1,rankMetrics.includes(s.metric)?1-v/100:v/100))):null);
      ctx.fillStyle=ctx.strokeStyle=ink(colors[j%colors.length]);
      ctx.lineWidth=1.8;
      if (points.every(Boolean)) {
        trace(points);ctx.globalAlpha=.09;ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      }
      points.forEach((p,i)=>{if(p){ctx.beginPath();ctx.arc(p[0],p[1],i===active?4:2.7,0,Math.PI*2);ctx.fill();}});
    });
  }
  function draw(canvas, series, axes, type, active, targets) {
    const width = Math.round(canvas.clientWidth), height = Math.round(canvas.clientHeight);
    const ctx = width && height && canvas.getContext('2d');
    if (!ctx) return;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    const theme = getComputedStyle(canvas);
    const ink = name => theme.getPropertyValue(name).trim() || ({'--muted':'#6b7280','--line':'#e2e8f0','--accent':'#5066d3','--green':'#218461','--warn':'#ac6924','--text':'#222b38','--danger':'#b74562'})[name];
    const metric = series[0].metric;
    const rank = rankMetrics.includes(metric);
    ctx.font = '11px ' + theme.fontFamily;
    if (type === 'radar') {
      drawRadar(ctx,series,axes,active,width,height,ink);
      const at=radarGeometry(width,height);
      Array.from(targets.children).forEach((button,i)=>{
        const [x,y]=at(i,axes.length,1.18);
        button.style.left=x+'px';button.style.top=y+'px';
      });
      return;
    }
    const values = series.flatMap(s => axes.flatMap(axis => {
      const p = s.byKey.get(axis.key);
      return [p?.value, p?.low, p?.high].filter(finite);
    }));
    if (!values.length) return;
    let low = Math.min(...values), high = Math.max(...values);
    if (percentMetrics.includes(metric)) { low = Math.min(0, low); high = Math.max(100, high); }
    else {
      if (type === 'bar' || isChange(metric)) { low = Math.min(0, low); high = Math.max(0, high); }
      const step = Math.max(1, 10 ** Math.floor(Math.log10(Math.max(1, high - low) / 3)));
      low = Math.floor(low / step) * step;
      high = Math.ceil(high / step) * step;
    }
    if (high === low) high = low + 1;
    const top = 12, bottom = height - 27, left = 42, right = width - 10;
    const column = (right - left) / Math.max(1, axes.length);
    const x = index => left + (index + .5) * column;
    const y = value => top + (rank ? (value - low) : (high - value)) / (high - low) * (bottom - top);
    const stroke = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = low + (high - low) * i / 4;
      const py = y(value);
      ctx.strokeStyle = ink('--line');
      ctx.fillStyle = ink('--muted');
      stroke(left, py, right, py);
      ctx.fillText(rounded(value) + (rank || metric === 'rate' ? '%' : ''), left - 5, py, left - 5);
    }
    if (isChange(metric) && low < 0 && high > 0) {
      ctx.strokeStyle = ink('--muted');
      ctx.setLineDash([3, 4]); stroke(left, y(0), right, y(0)); ctx.setLineDash([]);
    }
    if (active >= 0) {
      ctx.strokeStyle = ink('--muted');
      ctx.setLineDash([3, 4]); stroke(x(active), top, x(active), bottom); ctx.setLineDash([]);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = ink('--muted');
    const labelStep = Math.max(1, Math.ceil(50 / column));
    axes.forEach((axis, index) => {
      if (index % labelStep !== 0 && index !== axes.length - 1) return;
      if (index !== axes.length - 1 && axes.length - 1 - index < labelStep && index !== 0) return;
      const date = /^\d{4}-(\d\d)-(\d\d)/.exec(axis.detail || '');
      const label = date ? Number(date[1]) + '/' + Number(date[2]) : axis.label;
      ctx.fillText(label.length > 5 ? label.slice(0, 4) + '…' : label, x(index), bottom + 14, Math.max(25, labelStep * column - 4));
    });
    series.forEach((s, j) => {
      const color = ink(colors[j % colors.length]);
      ctx.strokeStyle = ctx.fillStyle = color;
      ctx.lineWidth = 2;
      let last = null;
      axes.forEach((axis, i) => {
        const p = s.byKey.get(axis.key);
        if (!finite(p?.value)) { last = null; return; }
        const py = y(p.value);
        const px = x(i);
        if (type === 'bar') {
          const bar = Math.min(24, .72 * column / series.length);
          const base = y(rank ? high : 0);
          ctx.globalAlpha = active === i ? 1 : .72;
          ctx.fillRect(px + (j - (series.length - 1) / 2) * bar - bar / 2, Math.min(py, base), Math.max(1, bar - 1), Math.max(1, Math.abs(py - base)));
          ctx.globalAlpha = 1;
          return;
        }
        if (last) {
          if (p.forecast) ctx.setLineDash([5, 4]);
          stroke(last[0], last[1], px, py);
          ctx.setLineDash([]);
        }
        if (p.forecast && finite(p.high) && finite(p.low)) {
          const lo = y(p.low), hi = y(p.high);
          ctx.globalAlpha = .55;
          stroke(px, lo, px, hi); stroke(px - 5, lo, px + 5, lo); stroke(px - 5, hi, px + 5, hi);
          ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.arc(px, py, i === active ? 4.6 : 3, 0, Math.PI * 2);
        if (p.forecast) { ctx.fillStyle = theme.backgroundColor; ctx.fill(); ctx.stroke(); ctx.fillStyle = color; }
        else ctx.fill();
        last = [px, py];
      });
    });
  }

  function render(chart) {
    const series = (chart?.series || []).filter(s => metrics[s.metric] && Array.isArray(s.points))
      .map(s => ({ ...s, byKey: new Map(s.points.map(p => [p.key, p])) }));
    if (!series.length) return null;
    const axes = [...new Map(series.flatMap(s => s.points.map(p => [p.key, p]))).values()];
    if (!axes.length) return null;
    // A second series can fill gaps in the first one. Keep the merged rows chronological.
    if (!series[0].dimension || series[0].dimension === 'exams') {
      const ordinal = key => /^\d+$/.test(key) ? Number(key) : /^\d+:\d+$/.test(key) ? Number(key.split(':')[1]) : Infinity;
      axes.sort((a,b)=>ordinal(a.key)-ordinal(b.key));
    }
    const groups = [...new Set(series.map(s => s.metric))];
    let metric = groups[0], view = chart.type === 'table' ? 'table' : 'plot', index = 0, observer;
    const figure = node('figure', 'sq-chart');
    const heading = node('div', 'sq-chart-heading');
    const title = node('figcaption', '', chart.title);
    const views = node('div', 'sq-chart-switch');
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', '展示方式');
    const plotView = button('图表', '', () => changeView('plot'));
    const tableView = button('数据', '', () => changeView('table'));
    views.append(plotView, tableView);
    heading.append(title, views);
    const filters = node('div', 'sq-chart-metrics');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', '图表指标');
    if (groups.length > 1) groups.forEach(key => {
      const filter = button(metrics[key][0], '', () => { metric = key; buildPlot(); });
      filter.dataset.metric = key;
      filters.append(filter);
    });
    const plotHost = node('div', 'sq-chart-display');
    const table = buildTable(series, axes);
    figure.append(heading, filters, plotHost, table);

    function buildPlot() {
      observer?.disconnect();
      const visible = series.filter(s => s.metric === metric).slice(0,5);
      const matching = axes.filter(axis => visible.some(s => s.byKey.has(axis.key)));
      const rows = matching.slice(-120);
      if (!rows.length) return;
      for (const filter of filters.children) filter.setAttribute('aria-pressed', String(filter.dataset.metric === metric));
      const scroll = node('div', 'sq-chart-scroll');
      const frame = node('div', 'sq-chart-frame');
      const canvas = node('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const targets = node('div', 'sq-chart-targets');
      const type = chart.type === 'radar' && rows.length >= 3 ? 'radar' :
        chart.type === 'bar' || isChange(metric) || (series[0].dimension && series[0].dimension !== 'exams') ? 'bar' : 'line';
      if (type === 'radar') frame.classList.add('is-radar');
      else {
        frame.style.minWidth = Math.max(0, rows.length * 36 + 52) + 'px';
        targets.style.gridTemplateColumns = 'repeat(' + rows.length + ', minmax(0, 1fr))';
      }
      const focused = node('div', 'sq-chart-focused');
      const paint=()=>draw(canvas,visible,rows,type,index,targets);
      function choose(i) {
        index = i;
        const axis = rows[i];
        for (const [j, target] of Array.from(targets.children).entries()) {
          target.setAttribute('aria-pressed', String(j === i));
          target.tabIndex=j===i?0:-1;
        }
        const label = node('div', 'sq-chart-point-label', axis.label);
        if (axis.detail) label.append(node('small', '', axis.detail));
        const values = node('div', 'sq-chart-values');
        visible.forEach((s, j) => {
          const value = node('span', '', s.label);
          value.style.setProperty('--series-color', 'var(' + colors[j % colors.length] + ')');
          value.append(node('b', '', valueText(s, s.byKey.get(axis.key))));
          values.append(value);
        });
        focused.replaceChildren(label, values);
        paint();
      }
      rows.forEach((axis, i) => {
        const control = button('', '', () => choose(i));
        control.setAttribute('aria-label', axis.label + '，' + visible.map(s => valueText(s, s.byKey.get(axis.key))).join('，'));
        control.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') choose(i); });
        control.addEventListener('focus', () => choose(i));
        control.addEventListener('keydown',event=>{
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
          event.preventDefault();
          const next=event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(event.key==='ArrowRight'?1:-1)));
          targets.children[next]?.focus();
        });
        targets.append(control);
      });
      frame.append(canvas, targets);
      scroll.append(frame);
      const summary = matching.length > rows.length ? node('small','sq-chart-limit','图中显示最近 '+rows.length+' 条，完整记录见「数据」。') : null;
      plotHost.replaceChildren(...[scroll, focused, summary].filter(Boolean));
      choose(rows.length - 1);
      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(paint);
        observer.observe(frame);
      }
    }
    function changeView(next) {
      view = next;
      table.hidden = view !== 'table';
      plotHost.hidden = filters.hidden = view !== 'plot';
      plotView.setAttribute('aria-pressed', String(view === 'plot'));
      tableView.setAttribute('aria-pressed', String(view === 'table'));
      if (view === 'plot' && !plotHost.childElementCount) buildPlot();
    }
    changeView(view);
    return { figure, dispose: () => observer?.disconnect() };
  }
  window.ScoreStudyChart = { render };
})();
