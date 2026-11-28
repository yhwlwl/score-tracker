// Analysis navigation owns the launcher. The conversation survives a stats-page redraw.
(function () {
  'use strict';
  const api = '/api/score-tracker-study-api';
  const starters = ['最近两场，哪科变化最大？', '画出我的得分率和排名走势', '下一场大概能排到哪里？'];
  const stages = {
    records:'正在查看考试记录…', planning:'正在找相关数据…', analysis:'正在整理分析…',
  };
  const toolLabels = {
    results:'成绩变化', examList:'考试记录', matrix:'考试矩阵', structure:'学科对比', profile:'历史表现',
    difficulty:'难度参考', forecast:'成绩预测', trajectory:'相似轨迹', goals:'考试目标', longGoal:'长期目标',
    plan:'预设目标', benchmarks:'均分和最高分', types:'题型表现', paper:'逐题得分', reflection:'考试反思',
    statistics:'指标关联', aggregate:'统计计算', baseline:'历史常态与总分', scenario:'分数模拟',
  };
  const thinkingLabels={low:'低',standard:'标准',high:'高'};
  const thinkingKey=()=> 'st.study.thinking.'+String(state.user?.id||'local');
  function savedThinking(){try{const v=localStorage.getItem(thinkingKey());if(Object.hasOwn(thinkingLabels,v))return v;}catch(_){}return 'standard';}
  let session, launcher, dialog;
  function current() { return typeof state !== 'undefined' && state.user && state.token; }
  function reset() {
    session?.pending?.controller?.abort();
    session?.charts.forEach(dispose=>dispose());
    if (dialog?.open) dialog.close();
    dialog?.remove();
    dialog = null;
    session = null;
    launcher?.remove();
    launcher = null;
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function button(text, className, handler) {
    const el = element('button',className,text);
    el.type = 'button';
    el.addEventListener('click',handler);
    return el;
  }
  function track(event) {
    try { window.__stTrack?.(event,{surface:'stats'}); } catch (_) {}
  }
  function apiResult(ok, value) {
    if (!ok || !value) {
      throw Object.assign(Error(value?.error || '暂时没加载出来，再试一次'),{code:value?.code,shown:true});
    }
    return value;
  }
  async function readEvents(body, progress) {
    if (!body) throw Error('missing_stream');
    const reader=body.getReader(), decoder=new TextDecoder();
    let buffer='';
    try {
      while (true) {
        const {done,value}=await reader.read();
        buffer+=decoder.decode(value,{stream:!done});
        let boundary;
        while ((boundary=/\r?\n\r?\n/.exec(buffer))) {
          const frame=buffer.slice(0,boundary.index);
          buffer=buffer.slice(boundary.index+boundary[0].length);
          const lines=frame.split(/\r?\n/);
          const event=lines.find(line=>line.startsWith('event:'))?.slice(6).trim();
          if (event!=='progress' && event!=='result') continue;
          const payload=JSON.parse(lines.filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n'));
          if (event==='progress') progress(payload);
          else return apiResult(payload.status>=200 && payload.status<300,payload.data);
        }
        if (done) throw Error('incomplete_stream');
      }
    } finally {
      await reader.cancel().catch(()=>{});
      reader.releaseLock();
    }
  }
  async function request(s, data, progress, signal) {
    const response = await fetch(api,{method:'POST',
      headers:{'Content-Type':'application/json',Accept:progress?'text/event-stream, application/json':'application/json'},
      signal, body:JSON.stringify({...data,token:s.token,...(progress?{stream:true}:{})})});
    if (progress && response.ok && response.headers.get('Content-Type')?.startsWith('text/event-stream')) {
      return readEvents(response.body,progress);
    }
    const value = await response.json().catch(()=>null);
    return apiResult(response.ok,value);
  }
  function attach(page, anchor) {
    const token = current();
    if (session && token !== session.token) reset();
    if (!page || !anchor || !token) return;
    if (!session) {
      const s = session = {token,charts:[],pending:null,lastAnswer:null,cap:null,thinking:'standard',thinkingModes:null};
      request(s,{action:'study_status'}).then(value=>{
        if (s!==session || token!==current() || !value.enabled) return;
        s.cap=value.cap;
        if(value.thinkingModes&&Object.keys(thinkingLabels).every(k=>Number.isFinite(value.thinkingModes[k])&&value.thinkingModes[k]>0)){
          s.thinkingModes=value.thinkingModes;s.thinking=savedThinking();
        }
        const mounted=document.querySelector('#content .an-layout');
        attach(mounted,mounted?.querySelector(':scope > .an-navigation'));
      }).catch(()=>{ if (s===session) s.unavailableAt=Date.now(); });
    }
    if (session.unavailableAt && Date.now()-session.unavailableAt>60000) { reset(); attach(page,anchor); return; }
    if (session.cap==null || launcher?.parentNode===page) return;
    launcher = button('','an-study-open',open);
    launcher.setAttribute('aria-label','问成绩');
    const icon=element('span','sq-spark','✦');
    const arrow=element('span','sq-launch-arrow','→');
    icon.setAttribute('aria-hidden','true');
    arrow.setAttribute('aria-hidden','true');
    const copy=element('span','sq-launch-copy');
    copy.append(element('strong','','问成绩'),element('small','','趋势、排名、下一场，都可以问'));
    launcher.append(icon,copy,arrow);
    anchor.after(launcher);
  }
  function pick(text) {
    const input = dialog.querySelector('textarea');
    input.value=text;
    input.focus();
    controls();
  }
  function controls() {
    const input=dialog.querySelector('textarea');
    dialog.querySelector('[type=submit]').disabled=!!session.pending?.running || !input.value.trim();
    const select=dialog.querySelector('.sq-thinking select');if(select)select.disabled=!!session.pending?.running;
    const notice=dialog.querySelector('.sq-cap');if(notice)notice.textContent='每问最多 '+(session.thinkingModes?.[session.thinking]??session.cap)+' 积分';
  }
  function scenarioWidget(spec) {
    if(spec?.type!=='scenario'||!Array.isArray(spec.subjects)||!spec.subjects.length||spec.subjects.length>24)return null;
    const valid=spec.subjects.every(s=>typeof s.label==='string'&&[s.actual,s.max,s.value].every(Number.isFinite)&&s.max>0&&s.actual>=0&&s.actual<=s.max&&s.value>=0&&s.value<=s.max);
    if(!valid||!Number.isFinite(spec.actual)||!Number.isFinite(spec.max)||Math.abs(spec.subjects.reduce((a,s)=>a+s.actual,0)-spec.actual)>.01||Math.abs(spec.subjects.reduce((a,s)=>a+s.max,0)-spec.max)>.01)return null;
    const frame=element('section','sq-simulator');
    const header=element('div','sq-simulator-header');
    const reset=button('重置','sq-simulator-reset',()=>{controls.forEach((c,i)=>{c.input.value=spec.subjects[i].actual;c.update();});refresh();});
    header.append(element('strong','','总分情景模拟'),reset);
    const metrics=element('div','sq-simulator-metrics'),current=element('div',''),delta=element('div','');
    metrics.append(current,delta);
    const total=element('b',''),difference=element('b','');
    current.append(element('small','','模拟总分'),total);delta.append(element('small','','较本次实际'),difference);
    frame.append(header,metrics,element('small','',String(spec.exam||'')+' · 实际 '+spec.actual+'/'+spec.max+' 分'));
    const fmt=n=>String(Math.round(n*100)/100);
    const controls=[];
    const refresh=()=>{const n=controls.reduce((sum,c)=>sum+Number(c.input.value),0);total.textContent=fmt(n)+' / '+spec.max;difference.textContent=(n>=spec.actual?'+':'')+fmt(n-spec.actual)+' 分';};
    for(const s of spec.subjects){
      const row=element('label','sq-simulator-row'),caption=element('span','sq-simulator-caption'),value=element('b','');
      caption.append(element('span','',s.label),value);
      const input=element('input','');input.type='range';input.min='0';input.max=String(s.max);input.step='.01';input.value=String(s.value);
      input.setAttribute('aria-label',s.label+'模拟分数');
      const update=()=>{value.textContent=fmt(Number(input.value))+'/'+s.max;};
      input.addEventListener('input',()=>{update();refresh();});
      controls.push({input,update});update();row.append(caption,input);frame.append(row);
    }
    frame.append(element('small','','仅模拟总分，不预测排名；调整不扣 AI 积分。'));
    refresh();return frame;
  }
  function relationsWidget(spec) {
    if(spec?.type!=='relations'||!Array.isArray(spec.subjects)||spec.subjects.length<2||spec.subjects.length>16||!spec.subjects.every(s=>typeof s==='string')||!Array.isArray(spec.pairs))return null;
    const frame=element('section','sq-relations');
    const header=element('div','sq-simulator-header'),tabs=element('div','sq-relations-tabs');
    header.append(element('strong','','学科相关性'),tabs);frame.append(header);
    const detail=element('div','sq-relations-detail','点击两门科目的交叉格，查看计算依据。');
    const scroll=element('div','sq-relations-scroll'),table=element('table','');scroll.append(table);
    const note=element('small','','');let mode=spec.mode==='change'?'change':'level',active=null;
    const pair=(a,b)=>spec.pairs.find(p=>p&&((p.a===a&&p.b===b)||(p.a===b&&p.b===a)));
    const show=(p,a,b)=>{
      if(!p){detail.textContent='没有足够的共同有效记录。';return;}
      const n=p[mode];detail.textContent=a+' × '+b+'：'+(Number.isFinite(n)?n.toFixed(2):'无法计算')+' · '+(mode==='change'?p.steps+' 组变化，同向 '+p.same+' 次，反向 '+p.opposite+' 次':p.n+' 场共同有效考试');
    };
    const draw=()=>{
      table.replaceChildren();const head=element('tr','');head.append(element('th','','科目'));
      spec.subjects.forEach(s=>head.append(element('th','',s)));table.append(head);
      spec.subjects.forEach(a=>{const row=element('tr','');row.append(element('th','',a));
        spec.subjects.forEach(b=>{const cell=element('td','');
          if(a===b){cell.textContent='—';row.append(cell);return;}
          const p=pair(a,b),n=p?.[mode],valid=Number.isFinite(n)&&Math.abs(n)<=1;
          const btn=button(valid?n.toFixed(2):'—','sq-relations-cell',()=>{active=[a,b];show(p,a,b);});
          btn.setAttribute('aria-label',a+'与'+b+'：'+(valid?n.toFixed(2):'无数据'));
          if(valid){btn.style.setProperty('--sq-strength',String(Math.round(Math.abs(n)*24))+'%');btn.classList.add(n<0?'is-negative':'is-positive');}
          cell.append(btn);row.append(cell);
        });table.append(row);
      });
      for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
      note.textContent=(spec.metric==='rank'?'指标：年级位置。':'指标：得分率。')+(mode==='change'?'比较相邻共同有效考试的进退变化。':'比较同场考试的成绩水平。')+'样本较少时结果不稳定；相关不代表因果。';
      if(active)show(pair(...active),...active);else detail.textContent='点击交叉格，查看配对场次与相关系数。';
    };
    for(const [id,label] of [['change','进退同步'],['level','水平相关']]){
      const b=button(label,'sq-relations-tab',()=>{mode=id;draw();});b.dataset.mode=id;tabs.append(b);
    }
    frame.append(scroll,detail,note);draw();return frame;
  }
  function metricWidget(spec){
    if(!['metric','compare'].includes(spec?.type)||!Array.isArray(spec.items))return null;
    const items=spec.items.slice(0,4).filter(i=>i&&typeof i.label==='string'&&typeof i.value==='string');
    if(!items.length)return null;
    const grid=element('section','sq-metrics'+(spec.type==='compare'?' is-compare':''));
    for(const i of items){
      const parts=i.value.split(' · '),card=element('div','sq-metric');
      card.append(element('small','',i.label),element('b','',parts[0]));
      if(parts.length>1)card.append(element('span','sq-metric-detail',parts.slice(1).join(' · ')));
      if(i.source){const details=element('details','sq-metric-source');details.append(element('summary','','依据'),element('span','',String(i.source)));card.append(details);}
      grid.append(card);
    }
    return grid;
  }
  function aggregateWidget(spec){
    if(spec?.type!=='aggregate'||!Array.isArray(spec.columns)||!Array.isArray(spec.rows))return null;
    const cols=spec.columns.filter(c=>c&&typeof c.key==='string'&&typeof c.label==='string').slice(0,6);
    const rows=spec.rows.filter(r=>r&&typeof r.scope==='string'&&r.values&&typeof r.values==='object').slice(0,32);
    if(!cols.length||!rows.length)return null;
    const frame=element('section','sq-aggregate'),heading=element('div','sq-simulator-header');
    heading.append(element('strong','','统计对比 · '+String(spec.metric||'')));
    const scroll=element('div','sq-relations-scroll'),table=element('table',''),detail=element('div','sq-relations-detail','点击行名称查看计算范围。');
    scroll.append(table);frame.append(heading,scroll,detail,element('small','','点击表头排序；缺失值不参与计算。'));
    let sort=null,ascending=true;
    const draw=()=>{
      table.replaceChildren();const header=element('tr','');header.append(element('th','','范围'));
      cols.forEach(c=>{const th=element('th',''),b=button(c.label+(sort===c.key?(ascending?' ↑':' ↓'):''),'sq-sort',()=>{ascending=sort===c.key?!ascending:Boolean(c.ascending);sort=c.key;draw();});th.append(b);header.append(th);});
      table.append(header);
      const ordered=rows.slice().sort((a,b)=>{if(!sort)return 0;const x=a.values[sort],y=b.values[sort];if(!Number.isFinite(x))return Number.isFinite(y)?1:0;if(!Number.isFinite(y))return -1;return (ascending?1:-1)*(x-y);});
      for(const r of ordered){
        const tr=element('tr',''),th=element('th','');
        th.append(button(r.scope+(r.group&&r.group!=='全部'?' · '+r.group:''),'sq-sort',()=>{detail.textContent=String(r.source||'')+' · 有效 '+r.count+' 场';}));
        tr.append(th);
        for(const c of cols){const v=r.values[c.key];tr.append(element('td','',Number.isFinite(v)?(c.rank?'前 ':'')+v+String(c.unit||''):'—'));}
        table.append(tr);
      }
    };
    draw();return frame;
  }
  const miniMetrics={score:['分数','分'],rate:['得分率','%'],rank:['年级位置','%'],classRank:['班级位置','%'],cityRank:['市排名位置','%'],districtRank:['区排名位置','%'],scoreChange:['分数变化','分'],rateChange:['得分率变化','个百分点'],rankChange:['年级位置变化','个百分点'],difficulty:['难度','/100'],averageGap:['较年级均分','分'],count:['场数','场'],lost:['失分','分']};
  const rankMetric=m=>['rank','classRank','cityRank','districtRank'].includes(m);
  const miniFormat=(m,v)=>!Number.isFinite(v)?'—':(rankMetric(m)?'前 ':m==='rankChange'?(v>0?'前进 ':v<0?'后退 ':''):m.endsWith('Change')&&v>0?'+':'')+Math.round((m==='rankChange'?Math.abs(v):v)*100)/100+miniMetrics[m][1];
  function compactWidget(spec){
    if(!['sparkline','bars','actions'].includes(spec?.type))return null;
    const frame=element('section','sq-compact sq-compact-'+spec.type);
    if(spec.title)frame.append(element('strong','sq-compact-title',String(spec.title).slice(0,32)));
    if(spec.type==='actions'){
      const items=(Array.isArray(spec.items)?spec.items:[]).slice(0,4).filter(i=>i&&typeof i.label==='string'&&i.label.trim());
      if(!items.length)return null;
      const list=element('ol','sq-action-list');
      items.forEach((i,k)=>{const li=element('li','sq-action-item'),n=element('span','sq-action-number',String(k+1)),copy=element('div','sq-action-copy');
        copy.append(element('b','',i.label.slice(0,48)));if(i.detail)copy.append(element('span','',String(i.detail).slice(0,160)));li.append(n,copy);list.append(li);});
      frame.append(list);return frame;
    }
    const series=(Array.isArray(spec.series)?spec.series:[]).slice(0,6).filter(s=>s&&Object.hasOwn(miniMetrics,s.metric)&&typeof s.label==='string'&&Array.isArray(s.points)&&s.points.filter(p=>p&&Number.isFinite(p.value)&&!p.forecast).length>=2);
    if(!series.length)return null;
    const pointsFor=s=>s.points.filter(p=>p&&!p.forecast).slice(-12);
    const dataRows=(s,points)=>{
      const details=element('details','sq-mini-data');details.append(element('summary','','查看数据'));
      const list=element('div','sq-mini-values');points.forEach(p=>{const row=element('div','sq-mini-value');row.append(element('span','',String(p.label||p.key||'').slice(0,48)),element('b','',miniFormat(s.metric,p.value)));list.append(row);});details.append(list);return details;
    };
    if(spec.type==='sparkline'){
      const grid=element('div','sq-spark-grid');
      const ns='http://www.w3.org/2000/svg';
      const svgEl=(tag,attrs)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el;};
      for(const s of series){
        const points=pointsFor(s),valid=points.filter(p=>Number.isFinite(p.value));
        if(valid.length<2)continue;
        const first=valid[0],last=valid.at(-1),values=valid.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
        const card=element('div','sq-mini-card'),head=element('div','sq-mini-heading');
        head.append(element('small','',s.label+' · '+miniMetrics[s.metric][0]),element('b','',miniFormat(s.metric,last.value)));
        const svg=svgEl('svg',{viewBox:'0 0 150 48',role:'img','aria-label':s.label+'近期走势：'+miniFormat(s.metric,first.value)+' 至 '+miniFormat(s.metric,last.value)});
        svg.append(svgEl('path',{d:'M4 44 H146',class:'sq-mini-axis'}));
        const y=v=>max===min?24:4+(rankMetric(s.metric)?v-min:max-v)/span*38;
        let path='',pen=false;points.forEach((p,j)=>{if(!Number.isFinite(p.value)){pen=false;return;}const x=4+j*142/Math.max(1,points.length-1);path+=(pen?' L':' M')+x.toFixed(2)+' '+y(p.value).toFixed(2);pen=true;});
        svg.append(svgEl('path',{d:path.trim(),class:'sq-mini-line','fill':'none'}));
        const lastIndex=points.lastIndexOf(last);svg.append(svgEl('circle',{cx:4+lastIndex*142/Math.max(1,points.length-1),cy:y(last.value),r:3,class:'sq-mini-dot'}));
        const foot=element('div','sq-mini-foot');foot.append(element('span','',String(first.label||'').slice(0,18)),element('span','',String(last.label||'').slice(0,18)));
        card.append(head,svg,foot,dataRows(s,points));grid.append(card);
      }
      if(!grid.childElementCount)return null;frame.append(grid);
    }else{
      const s=series[0],points=pointsFor(s).filter(p=>Number.isFinite(p.value));if(points.length<2)return null;
      const min=Math.min(0,...points.map(p=>p.value)),max=Math.max(0,...points.map(p=>p.value)),span=max-min||1,zero=-min/span*100;
      const bars=element('div','sq-mini-bars');bars.append(element('small','sq-bars-unit',s.label+' · '+miniMetrics[s.metric][0]));
      for(const p of points){const row=element('div','sq-bar-row'),track=element('div','sq-bar-track'),fill=element('span','sq-bar-fill'+(p.value<0?' is-negative':''));
        fill.style.left=Math.min(zero,(p.value-min)/span*100)+'%';fill.style.width=Math.abs(p.value)/span*100+'%';
        if(min<0&&max>0){const axis=element('i','sq-bar-zero');axis.style.left=zero+'%';track.append(axis);}track.append(fill);
        row.append(element('span','sq-bar-label',String(p.label||p.key||'').slice(0,48)),track,element('b','sq-bar-value',miniFormat(s.metric,p.value)));bars.append(row);}
      frame.append(bars);
    }
    if(spec.caption)frame.append(element('p','sq-compact-caption',String(spec.caption).slice(0,120)));
    return frame;
  }
  function showAnswer(article, turn) {
    article.querySelector('.sq-feedback').remove();
    const specs=Array.isArray(turn.charts)&&turn.charts.length ? turn.charts.slice(0,3) : [turn.chart];
    const appendText=text=>{
      const p=element('p','sq-answer');
      // Only paired bold markers are supported. No HTML interpretation.
      const parts=String(text||'').split(/(\*\*[^*\n]+\*\*)/g);
      for(const part of parts) {
        if(part.startsWith('**')&&part.endsWith('**')&&part.length>4) p.append(element('strong','',part.slice(2,-2)));
        else p.append(document.createTextNode(part));
      }
      article.append(p);
    };
    const appendChart=spec=>{
      const chart=window.ScoreStudyChart?.render(spec);
      if(chart){article.append(chart.figure);session.charts.push(chart.dispose);}
    };
    const widgets=Array.isArray(turn.widgets)?turn.widgets.slice(0,4):[];
    const appendWidgets=i=>widgets.filter(w=>Math.max(1,Number(w.after)||1)===i).forEach(w=>{const node=w.type==='relations'?relationsWidget(w):w.type==='aggregate'?aggregateWidget(w):['metric','compare'].includes(w.type)?metricWidget(w):['sparkline','bars','actions'].includes(w.type)?compactWidget(w):scenarioWidget(w);if(node)article.append(node);});
    if(Array.isArray(turn.chartAfter)&&turn.chartAfter.length===specs.length || widgets.length) {
      const paragraphs=String(turn.answer||'').split(/\n\s*\n/).filter(p=>p.trim());
      const positions=specs.map((_,i)=>Number.isInteger(turn.chartAfter?.[i])?Math.max(1,Math.min(paragraphs.length,turn.chartAfter[i])):paragraphs.length);
      paragraphs.forEach((paragraph,i)=>{
        appendText(paragraph);
        specs.forEach((spec,j)=>{if(positions[j]===i+1)appendChart(spec);});
        appendWidgets(i+1);
      });
      if(!paragraphs.length)specs.forEach(appendChart);
    } else {
      appendText(turn.answer);
      specs.forEach(appendChart);
    }
    if (turn.takeaway) {
      article.append(element('p','sq-takeaway',turn.takeaway));
    }
    const evidence=Array.isArray(turn.evidence) ? turn.evidence : [];
    const meta=element('div','sq-meta');
    if (evidence.length) {
      const details=element('details','sq-evidence');
      details.append(element('summary','','查看依据 · '+evidence.length+' 条'));
      for (const row of evidence) {
        const fact=element('div','sq-fact');
        fact.append(element('small','',row.source),element('b','',row.label),element('span','',row.value));
        details.append(fact);
      }
      meta.append(details);
    }
    if (turn.charged != null) meta.append(element('small','sq-charge',(Object.hasOwn(thinkingLabels,turn.thinking)?'思考·'+thinkingLabels[turn.thinking]+' · ':'')+Number(turn.charged)+' 积分'));
    article.append(meta);
    if (turn.next) article.append(button(turn.next,'sq-choice sq-next',()=>pick(turn.next)));
  }
  function progressMessage(progress) {
    if (progress.stage==='tools') {
      const labels=(progress.tools || []).map(tool=>Object.hasOwn(toolLabels,tool)?toolLabels[tool]:'').filter(Boolean).slice(0,2);
      return labels.length ? '正在查看'+labels.join('和')+'…' : '正在查看相关分析…';
    }
    return Object.hasOwn(stages,progress.stage)?stages[progress.stage]:'';
  }
  async function send(s, pending) {
    if (s!==session || pending!==s.pending || pending.running || current()!==s.token) return;
    const {article,feedback,status}=pending;
    const list=article.parentElement;
    pending.running=true;
    pending.controller=new AbortController();
    feedback.classList.add('is-working');
    feedback.querySelector('.sq-retry')?.remove();
    status.textContent='正在发送…';
    controls();
    const active=()=>s===session && pending===s.pending && current()===s.token;
    try {
      const reply=await request(s,{action:'study_question',...pending.payload},progress=>{
        if (!active()) return;
        const label=progressMessage(progress);
        if (label && label!==status.textContent) status.textContent=label;
      },pending.controller.signal);
      if (!active()) return;
      const following=list.scrollHeight-list.scrollTop-list.clientHeight<48;
      showAnswer(article,reply);
      s.lastAnswer=reply.id;
      s.pending=null;
      if (following) article.scrollIntoView?.({block:'start',behavior:'instant'});
      track('study_question_answered');
    } catch (error) {
      if (!active()) return;
      if (error.code==='retry' || error.code==='study_failed') pending.payload.requestId=crypto.randomUUID();
      feedback.classList.remove('is-working');
      status.textContent=error.shown?error.message:'连接断开了，可以重试';
      if (error.code!=='UNAUTHORIZED') feedback.append(button('重试','sq-retry',()=>send(s,pending)));
    } finally {
      pending.running=false;
      pending.controller=null;
      if (s===session) controls();
    }
  }
  function ask(event) {
    event.preventDefault();
    const s=session;
    if (!s || s.pending?.running || current()!==s.token) return;
    const input=dialog.querySelector('textarea'), question=input.value.trim();
    if (!question) return;
    input.value='';
    input.placeholder='继续问…';
    if (s.pending?.payload.question===question && (s.pending.payload.thinking??'standard')===s.thinking) {
      send(s,s.pending);
      return;
    }
    s.pending?.feedback.querySelector('.sq-retry')?.remove();
    const list=dialog.querySelector('.sq-thread');
    list.querySelector('.sq-welcome')?.remove();
    list.querySelector('.sq-next')?.remove();
    const article=element('article','sq-turn');
    const feedback=element('div','sq-feedback');
    const status=element('span');
    status.setAttribute('role','status');
    feedback.append(status);
    article.append(element('p','sq-question',question),feedback);
    list.append(article);
    const pending=s.pending={article,feedback,status,payload:{question,previous:s.lastAnswer,requestId:crypto.randomUUID(),...(s.thinkingModes?{thinking:s.thinking}:{})}};
    send(s,pending);
    article.scrollIntoView?.({block:'nearest',behavior:'instant'});
  }
  function open() {
    if (!session || current()!==session.token) return;
    if (!dialog) {
      dialog=element('dialog','sq-dialog');
      dialog.setAttribute('aria-labelledby','sq-title');
      dialog.innerHTML='<header class="sq-header"><div><span class="sq-spark" aria-hidden="true">✦</span><h2 id="sq-title">问成绩</h2></div><button type="button" aria-label="关闭">×</button></header><div class="sq-thread"></div><form class="sq-composer"><label class="sq-sr-only" for="sq-input">你的问题</label><div class="sq-input-row"><textarea id="sq-input" rows="2" maxlength="300" placeholder="想问问哪科成绩？"></textarea><button type="submit">提问</button></div><footer><label class="sq-thinking" hidden><span>思考</span><select aria-label="思考强度"><option value="low">低</option><option value="standard">标准</option><option value="high">高</option></select></label><small class="sq-cap"></small></footer></form>';
      dialog.querySelector('header button').onclick=()=>dialog.close();
      const thinking=dialog.querySelector('.sq-thinking'),select=thinking.querySelector('select');
      if(session.thinkingModes){
        thinking.hidden=false;select.value=session.thinking;
        select.addEventListener('change',()=>{
          if(!Object.hasOwn(thinkingLabels,select.value)||session.pending?.running)return;
          session.thinking=select.value;
          try{localStorage.setItem(thinkingKey(),select.value);}catch(_){}
          controls();
        });
      }
      dialog.querySelector('textarea').addEventListener('input',controls);
      dialog.querySelector('form').addEventListener('submit',ask);
      document.body.append(dialog);
      const welcome=element('section','sq-welcome');
      welcome.append(element('h3','','想聊哪门成绩？'));
      const choices=element('div','sq-choices');
      starters.forEach(q=>choices.append(button(q,'sq-choice',()=>pick(q))));
      welcome.append(choices);
      dialog.querySelector('.sq-thread').append(welcome);
      controls();
    }
    if (!dialog.open) dialog.showModal();
    track('study_question_open');
  }
  window.ScoreStudyQuestions={attach};
  const root=document.getElementById('app') || document.body;
  new MutationObserver(()=>{if(session && current()!==session.token)reset();}).observe(root,{childList:true,subtree:true});
})();
