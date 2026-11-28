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
  const fallbackInk = {'--muted':'#6b7280','--line':'#e2e8f0','--accent':'#5066d3','--green':'#218461','--warn':'#ac6924','--text':'#222b38','--danger':'#b74562'};
  const rankMetrics = ['rank','classRank','cityRank','districtRank'];
  const percentMetrics = ['rate', 'difficulty', ...rankMetrics];
  const isChange = metric => metric.endsWith('Change') || metric === 'averageGap';
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const rounded = n => Math.round(n * 100) / 100;
  const labelFor = series => series.label + ' · ' + metrics[series.metric][0];
  const colorFor = series => colors[series.colorIndex] || 'hsl(' + (222 + series.colorIndex * 137.5) % 360 + ' 56% 48%)';
  const colorCss = series => {
    const color = colorFor(series);
    return color.startsWith('--') ? 'var(' + color + ', ' + fallbackInk[color] + ')' : color;
  };

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
  function buildTable(series, axes, selectCell) {
    const wrapper = node('div', 'sq-chart-table');
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', selectCell ? '考试热力图' : '图表数据');
    if (selectCell) wrapper.classList.add('sq-chart-heatmap');
    const table = node('table');
    const headers = table.createTHead().insertRow();
    for (const label of [dimensionNames[series[0].dimension] || '考试', ...series.map(s => selectCell ? s.label : labelFor(s))]) {
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
      for (const s of series) {
        const cell = row.insertCell();
        const point = s.byKey.get(axis.key);
        if (!selectCell || !finite(point?.value) || point.forecast) {
          cell.textContent = valueText(s, point);
          continue;
        }
        const hit = button(valueText(s, point), 'sq-heat-cell', () => selectCell(s, axis, hit));
        hit.setAttribute('aria-label', axis.label + '，' + labelFor(s) + '，' + valueText(s, point));
        hit.setAttribute('aria-pressed', 'false');
        hit.dataset.row = row.rowIndex - 1;
        hit.dataset.column = cell.cellIndex - 1;
        const value = Math.max(0, Math.min(100, point.value));
        hit.style.setProperty('--heat', 8 + Math.round((rankMetrics.includes(s.metric) ? 100 - value : value) / 2) + '%');
        hit.addEventListener('focus', () => selectCell(s, axis, hit));
        hit.addEventListener('keydown', event => {
          const shifts = { ArrowLeft:[0,-1], ArrowRight:[0,1], ArrowUp:[-1,0], ArrowDown:[1,0] };
          const shift = shifts[event.key];
          if (!shift) return;
          event.preventDefault();
          const i = Number(hit.dataset.row), j = Number(hit.dataset.column);
          for (let a = i + shift[0], b = j + shift[1]; a >= 0 && b >= 0 && a < axes.length && b < series.length; a += shift[0], b += shift[1]) {
            const next = body.rows[a]?.cells[b + 1]?.querySelector('button');
            if (next) { next.focus(); break; }
          }
        });
        cell.append(hit);
      }
    }
    wrapper.append(table);
    return wrapper;
  }

  function pairedAxes(pair, axes) {
    return axes.filter(axis => pair.every(s => {
      const point = s.byKey.get(axis.key);
      return finite(point?.value) && !point.forecast;
    }));
  }
  function scatterPairs(series, axes) {
    if ((series[0].dimension || 'exams') !== 'exams') return [];
    const pairs = [];
    for (let i = 0; i < series.length; i++) {
      for (const second of series.slice(i + 1)) {
        const first = series[i];
        const pair = rankMetrics.includes(first.metric) && !rankMetrics.includes(second.metric) ? [second, first] : [first, second];
        if (pairedAxes(pair, axes).length >= 3) pairs.push(pair);
        if (pairs.length === 12) return pairs;
      }
    }
    return pairs;
  }
  function chartCanvas(canvas) {
    const width = Math.round(canvas.clientWidth), height = Math.round(canvas.clientHeight);
    const ctx = width && height && canvas.getContext('2d');
    if (!ctx) return null;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    const theme = getComputedStyle(canvas);
    const ink = color => color.startsWith('--') ? theme.getPropertyValue(color).trim() || fallbackInk[color] : color;
    ctx.font = '11px ' + theme.fontFamily;
    return { ctx, width, height, theme, ink };
  }
  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  function placeTarget(target, x, y) {
    target.style.left=x+'px';
    target.style.top=y+'px';
  }
  function drawScatter(canvas, pair, axes, active, targets) {
    const chart = chartCanvas(canvas);
    if (!chart) return;
    const { ctx, width, height, ink } = chart;
    const [xs,ys] = pair.map(series => axes.map(axis => series.byKey.get(axis.key).value));
    function domain(series, values) {
      const min=Math.min(...values), max=Math.max(...values);
      const pad=Math.max(percentMetrics.includes(series.metric)?2:1,(max-min)*.09);
      return percentMetrics.includes(series.metric) && min >= 0 && max <= 100 ?
        [Math.max(0,min-pad),Math.min(100,max+pad)] : [min-pad,max+pad];
    }
    const [minX,maxX]=domain(pair[0],xs), [minY,maxY]=domain(pair[1],ys);
    const left=45, right=width-15, top=14, bottom=height-26;
    const x=n=>left+(n-minX)/(maxX-minX)*(right-left);
    const y=n=>top+(rankMetrics.includes(pair[1].metric)?n-minY:maxY-n)/(maxY-minY)*(bottom-top);
    ctx.textBaseline='middle';
    for (let i=0;i<=4;i++) {
      const vx=minX+(maxX-minX)*i/4, vy=minY+(maxY-minY)*i/4;
      const px=x(vx), py=y(vy);
      ctx.strokeStyle=ink('--line');
      line(ctx,px,top,px,bottom);
      line(ctx,left,py,right,py);
      ctx.fillStyle=ink('--muted');
      ctx.textAlign='center';
      ctx.fillText(Math.round(vx*10)/10,px,bottom+17);
      ctx.textAlign='right';
      ctx.fillText(Math.round(vy*10)/10,left-6,py,36);
    }
    for (let i=0;i<axes.length;i++) {
      const px=x(xs[i]), py=y(ys[i]);
      placeTarget(targets.children[i],px,py);
      if (i===active) {
        ctx.strokeStyle=ink('--muted');
        ctx.setLineDash([3,4]);line(ctx,left,py,px,py);line(ctx,px,py,px,bottom);ctx.setLineDash([]);
      }
      ctx.fillStyle=ink('--accent');
      ctx.globalAlpha=i===active?1:.62;
      ctx.beginPath();ctx.arc(px,py,i===active?5:3.8,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
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
    series.forEach(s=>{
      const values=axes.map(a=>s.byKey.get(a.key)?.value);
      const points=values.map((v,i)=>finite(v)?at(i,count,Math.max(0,Math.min(1,rankMetrics.includes(s.metric)?1-v/100:v/100))):null);
      ctx.fillStyle=ctx.strokeStyle=ink(colorFor(s));
      ctx.lineWidth=1.8;
      if (points.every(Boolean)) {
        trace(points);ctx.globalAlpha=.09;ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      }
      points.forEach((p,i)=>{if(p){ctx.beginPath();ctx.arc(p[0],p[1],i===active?4:2.7,0,Math.PI*2);ctx.fill();}});
    });
  }
  function draw(canvas, series, axes, type, active, targets) {
    if (type === 'scatter') { drawScatter(canvas,series,axes,active,targets); return; }
    const chart = chartCanvas(canvas);
    if (!chart) return;
    const { ctx, width, height, ink, theme } = chart;
    const metric = series[0].metric;
    const rank = rankMetrics.includes(metric);
    if (type === 'radar') {
      drawRadar(ctx,series,axes,active,width,height,ink);
      const at=radarGeometry(width,height);
      Array.from(targets.children).forEach((button,i)=>{
        placeTarget(button,...at(i,axes.length,1.18));
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
    const stroke = (x1, y1, x2, y2) => line(ctx,x1,y1,x2,y2);
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
      const color = ink(colorFor(s));
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
          if (p.forecast) {
            if (finite(p.low) && finite(p.high)) {
              ctx.globalAlpha=.10;
              ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(px,y(p.low));ctx.lineTo(px,y(p.high));ctx.closePath();ctx.fill();
              ctx.globalAlpha=1;
            }
            ctx.setLineDash([5, 4]);
          }
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

  function pointLabel(axis) {
    const label = node('div', 'sq-chart-point-label', axis.label);
    if (axis.detail) label.append(node('small', '', axis.detail));
    return label;
  }
  function readout(axis, series, includeMetrics) {
    const values = node('div', 'sq-chart-values');
    for (const s of series) {
      const value = node('span', '', includeMetrics ? labelFor(s) : s.label);
      value.style.setProperty('--series-color', colorCss(s));
      value.append(node('b', '', valueText(s, s.byKey.get(axis.key))));
      values.append(value);
    }
    return [pointLabel(axis), values];
  }
  function selectBox(label, values, onChange) {
    const select = node('select', 'sq-chart-select');
    select.setAttribute('aria-label',label);
    for (const [value, caption] of values) {
      const option=node('option','',caption);
      option.value=String(value);
      select.append(option);
    }
    select.addEventListener('change',()=>onChange(Number(select.value)));
    return select;
  }
  function render(chart) {
    const series = (Array.isArray(chart?.series) ? chart.series : [])
      .filter(s => Object.hasOwn(metrics,s.metric) && Array.isArray(s.points))
      .map((s,i) => ({ ...s, colorIndex:i, byKey:new Map(s.points.map(p => [p.key,p])) }));
    if (!series.length) return null;
    const axes = [...new Map(series.flatMap(s => s.points.map(p => [p.key, p]))).values()];
    if (!axes.length) return null;
    // A second series can fill gaps in the first one. Keep the merged rows chronological.
    if (!series[0].dimension || series[0].dimension === 'exams') {
      const ordinal = key => /^\d+$/.test(key) ? Number(key) : /^\d+:\d+$/.test(key) ? Number(key.split(':')[1]) : Infinity;
      axes.sort((a,b)=>ordinal(a.key)-ordinal(b.key));
    }
    const groups = [...new Set(series.map(s => s.metric))];
    const seriesByMetric = new Map(groups.map(metric=>[metric,series.filter(s=>s.metric===metric)]));
    const enabled = new Set([...seriesByMetric.values()].flatMap(group=>group.slice(0,8)).map(s=>s.colorIndex));
    const heatGroups = groups.filter(key=>percentMetrics.includes(key) && seriesByMetric.get(key).length>1);
    const timeline = (series[0].dimension || 'exams')==='exams';
    const pairs = scatterPairs(series,axes);
    const forecastAxes=axes.filter(axis=>axis.key.startsWith('next:'));
    const historyAxes=axes.filter(axis=>!axis.key.startsWith('next:'));
    const defaultView = {table:'table',scatter:pairs.length?'scatter':'plot',heatmap:heatGroups.length && timeline?'heatmap':'table'};
    // Prefer the requested valid metric, otherwise the one that compares the most subjects.
    const coverage=m=>new Set(seriesByMetric.get(m).filter(s=>s.points.some(p=>finite(p.value))).map(s=>s.label.replace(/(?:年级位置|得分率)$/,''))).size;
    const best=groups.slice().sort((a,b)=>coverage(b)-coverage(a)||Number(percentMetrics.includes(b))-Number(percentMetrics.includes(a)))[0];
    const initial=groups.includes(chart.defaultMetric)?chart.defaultMetric:best;
    let view=defaultView[chart.type] || 'plot', metric=initial, heatMetric=heatGroups.includes(initial)?initial:heatGroups[0];
    let range=0, pairIndex=0, observer, activeKey=axes.at(-1).key, activeHeat;
    const figure = node('figure', 'sq-chart');
    const heading = node('div', 'sq-chart-heading');
    const title = node('figcaption', '', chart.title);
    const views = node('div', 'sq-chart-switch');
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', '展示方式');
    const options = [['plot','图表'],...(pairs.length?[['scatter','散点']]:[]),
      ...(heatGroups.length && timeline?[['heatmap','热力图']]:[]),['table','数据']];
    const viewButtons = new Map(options.map(([key,label])=>[key,button(label,'',()=>{
      view=key; refresh();
    })]));
    views.append(...viewButtons.values());
    heading.append(title, views);
    const toolbar=node('div','sq-chart-toolbar');
    const filters = node('div', 'sq-chart-metrics');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', '图表指标');
    toolbar.append(filters);
    const rangeSelect = timeline && historyAxes.length>5 ? selectBox('考试范围',[
      [0,'全部考试'],[5,'最近 5 场'],...(historyAxes.length>10?[[10,'最近 10 场']]:[]),
    ],value=>{range=value;refresh();}) : null;
    if (rangeSelect) toolbar.append(rangeSelect);
    const legend=node('div','sq-chart-legend');
    legend.setAttribute('role','group');
    legend.setAttribute('aria-label','显示或隐藏系列');
    const plotHost=node('div','sq-chart-display');
    figure.append(heading,toolbar,legend,plotHost);

    function updateControls() {
      for (const [key,control] of viewButtons) control.setAttribute('aria-pressed',String(view===key));
      filters.replaceChildren();
      const group = view==='heatmap' ? heatGroups : view==='plot' ? groups : [];
      for (const key of group.length>1 ? group : []) {
        const control=button(metrics[key][0],'',()=>{
          if (view==='heatmap') heatMetric=key; else metric=key;
          refresh();
          filters.querySelector('[aria-pressed=true]')?.focus();
        });
        control.setAttribute('aria-pressed',String(key===(view==='heatmap'?heatMetric:metric)));
        filters.append(control);
      }
      if (view==='scatter' && pairs.length>1) {
        const pairBox=selectBox('散点对照',pairs.map((pair,i)=>[i,pair.map(labelFor).join(' ↔ ')]),value=>{
          pairIndex=value;refresh();filters.querySelector('select')?.focus();
        });
        pairBox.value=String(pairIndex);
        filters.append(pairBox);
      }
      filters.hidden=!filters.childElementCount;
      toolbar.hidden=filters.hidden && !rangeSelect;
      legend.replaceChildren();
      const entries = view==='plot' ? seriesByMetric.get(metric) : [];
      if (entries.length>1) for (const s of entries) {
        const control=button(s.label,'',()=>{
          if (enabled.has(s.colorIndex)) {
            if (entries.filter(v=>enabled.has(v.colorIndex)).length===1) return;
            enabled.delete(s.colorIndex);
          } else enabled.add(s.colorIndex);
          refresh();
          legend.querySelector('[data-series="' + s.colorIndex + '"]')?.focus();
        });
        control.dataset.series=s.colorIndex;
        control.style.setProperty('--series-color',colorCss(s));
        control.setAttribute('aria-pressed',String(enabled.has(s.colorIndex)));
        legend.append(control);
      }
      legend.hidden=!legend.childElementCount;
    }

    function showHeatmap(rows) {
      const columns=seriesByMetric.get(heatMetric);
      const focus=node('div','sq-chart-focused sq-heat-readout');
      let pressed;
      function choose(s,axis,hit) {
        if (pressed) { pressed.tabIndex=-1; pressed.setAttribute('aria-pressed','false'); }
        pressed=hit; hit.tabIndex=0; hit.setAttribute('aria-pressed','true');
        activeHeat=s.colorIndex;activeKey=axis.key;
        focus.replaceChildren(...readout(axis,[s],true));
      }
      const count=rows.length;
      rows=rows.slice(-120);
      const table=buildTable(columns,rows,choose);
      const cells=Array.from(table.querySelectorAll('.sq-heat-cell'));
      cells.forEach(cell=>cell.tabIndex=-1);
      const current=cells.find(c=>rows[Number(c.dataset.row)]?.key===activeKey && columns[Number(c.dataset.column)]?.colorIndex===activeHeat)
        || cells.filter(c=>rows[Number(c.dataset.row)]?.key===activeKey).at(-1) || cells.at(-1);
      if (current) choose(columns[Number(current.dataset.column)],rows[Number(current.dataset.row)],current);
      else focus.append(node('span','','这段没有记录'));
      const scale=node('div','sq-heat-scale');
      const captions=rankMetrics.includes(heatMetric)?['靠后','靠前']:heatMetric==='difficulty'?['偏易','偏难']:['低','高'];
      scale.append(node('b','',metrics[heatMetric][0]),node('span','',captions[0]),node('i'),node('span','',captions[1]));
      plotHost.replaceChildren(scale,table,focus);
      if (count>rows.length) plotHost.append(node('small','sq-chart-limit','图中显示最近 '+rows.length+' 场，完整记录见「数据」。'));
    }

    function buildPlot(visible, matching, type) {
      const rows = matching.slice(-120);
      if (!rows.length) return;
      const scroll = node('div', 'sq-chart-scroll');
      const frame = node('div', 'sq-chart-frame');
      const canvas = node('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const targets = node('div', 'sq-chart-targets');
      if (type==='radar' || type==='scatter') frame.classList.add('is-'+type);
      else {
        frame.style.minWidth = Math.max(0, rows.length * 36 + 52) + 'px';
        targets.style.gridTemplateColumns = 'repeat(' + rows.length + ', minmax(0, 1fr))';
      }
      const focused = node('div', 'sq-chart-focused');
      const read=node('div','sq-chart-readout');
      const stepper=node('div','sq-chart-stepper');
      let index=0;
      let positioned=false;
      const paint=()=>draw(canvas,visible,rows,type,index,targets);
      function revealPoint() {
        const target=targets.children[index];
        if (!target || scroll.scrollWidth<=scroll.clientWidth) return;
        const x=targets.offsetLeft+target.offsetLeft+target.offsetWidth/2;
        if (x<scroll.scrollLeft+20 || x>scroll.scrollLeft+scroll.clientWidth-20) scroll.scrollLeft=x-scroll.clientWidth/2;
      }
      function move(delta) {
        const next=index+delta;
        if (next<0 || next>=rows.length) return;
        choose(next);
        revealPoint();
      }
      const back=button('‹','',()=>move(-1)), forward=button('›','',()=>move(1));
      back.setAttribute('aria-label','上一条数据');
      forward.setAttribute('aria-label','下一条数据');
      stepper.append(back,forward);
      focused.append(read);
      if (rows.length>1) focused.append(stepper);
      function choose(i) {
        index = i;
        const axis = rows[i];
        activeKey=axis.key;
        back.disabled=i===0;
        forward.disabled=i===rows.length-1;
        for (const [j, target] of Array.from(targets.children).entries()) {
          target.setAttribute('aria-pressed', String(j === i));
          target.tabIndex=j===i?0:-1;
        }
        read.replaceChildren(...readout(axis,visible,type==='scatter'));
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
      const captions=type==='scatter' ? node('div','sq-chart-axes') : null;
      if (captions) for (const [i,s] of visible.entries()) {
        captions.append(node('span','',(i===0?'横轴 ':'纵轴 ')+labelFor(s)+' ('+metrics[s.metric][1]+')'));
      }
      plotHost.replaceChildren(...[captions,scroll,focused,summary].filter(Boolean));
      const previous=rows.findIndex(axis=>axis.key===activeKey);
      choose(previous>=0?previous:rows.length-1);
      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(()=>{
          paint();
          if (!positioned && scroll.clientWidth) {
            positioned=true;
            revealPoint();
          }
        });
        observer.observe(frame);
      }
    }
    function refresh() {
      observer?.disconnect();
      updateControls();
      const rows = range ? [...historyAxes.slice(-range),...forecastAxes] : axes;
      if (view==='table') plotHost.replaceChildren(buildTable(series,rows));
      else if (view==='heatmap') showHeatmap(rows);
      else if (view==='scatter') {
        const pair=pairs[pairIndex], points=pairedAxes(pair,rows);
        if (points.length>=3) buildPlot(pair,points,'scatter');
        else plotHost.replaceChildren(node('p','sq-chart-empty','这段只有 '+points.length+' 组配对。可以选更长的范围。'));
      } else {
        const visible=seriesByMetric.get(metric).filter(s=>enabled.has(s.colorIndex));
        const style=chart.type==='radar' && rows.length>=3 ? 'radar' :
          chart.type==='bar' || isChange(metric) || !timeline ? 'bar' : 'line';
        if (rows.some(row=>visible.some(s=>finite(s.byKey.get(row.key)?.value)))) buildPlot(visible,rows,style);
        else plotHost.replaceChildren(node('p','sq-chart-empty','这段没有这个指标的记录。'));
      }
    }
    refresh();
    return { figure, dispose: () => observer?.disconnect() };
  }
  window.ScoreStudyChart = { render };
})();
