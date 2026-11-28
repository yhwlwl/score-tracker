// Shared, contextual study-question entry points. The conversation survives page redraws.
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
  let session, launcher, dialog, queued=false, recentSave=null;
  function current() { return typeof state !== 'undefined' && state.user && state.token; }
  function reset() {
    session?.pending?.controller?.abort();
    session?.charts.forEach(dispose=>dispose());
    if (dialog?.open) dialog.close();
    dialog?.remove();
    dialog = null;
    session = null;
    recentSave = null;
    document.querySelectorAll('[data-sq-entry]').forEach(el=>el.remove());
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
  function track(event, surface) {
    try { window.__stTrack?.(event,{surface:surface || session?.surface || 'stats'}); } catch (_) {}
  }
  function sparkle() {
    const el=element('span','sq-entry-spark');
    el.setAttribute('aria-hidden','true');
    el.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.5 2.5c1.2 5.4 2.8 7 8.3 8.3-5.5 1.2-7.1 2.8-8.3 8.3-1.3-5.5-2.9-7.1-8.3-8.3 5.4-1.3 7-2.9 8.3-8.3Z"/><path opacity=".6" d="M19 2c.5 2.4 1.3 3.2 3.7 3.7C20.3 6.2 19.5 7 19 9.4c-.5-2.4-1.3-3.2-3.7-3.7C17.7 5.2 18.5 4.4 19 2Z"/></svg>';
    return el;
  }
  function records() { return Array.isArray(state.allExams)?state.allExams:(Array.isArray(state.exams)?state.exams:[]); }
  function hasScore(e) {
    return Object.values(e?.scores||{}).some(s=>s?.actual!=null && s.actual!=='' && Number.isFinite(Number(s.actual))) ||
      (e?.total_score!=null && e.total_score!=='' && Number.isFinite(Number(e.total_score)));
  }
  function homePrompts() {
    const exams=records().filter(hasScore).sort((a,b)=>String(b.exam_date||'').localeCompare(String(a.exam_date||'')));
    if(!exams.length)return [];
    if(exams.length===1)return ['这次考试表现如何？','我的优势科目是什么？'];
    const a=exams[0],b=exams[1];
    const same=Object.keys(a.scores||{}).filter(k=>[a,b].every(e=>e.scores?.[k]?.actual!=null && e.scores[k].actual!=='' && Number.isFinite(Number(e.scores[k].actual)) && Number(e.scores[k].max)>0));
    const moves=same.map(k=>({k,d:100*(Number(a.scores[k].actual)/Number(a.scores[k].max)-Number(b.scores[k].actual)/Number(b.scores[k].max))})).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
    const top=moves.find(x=>/^[\u4e00-\u9fa5]{1,5}$/.test(x.k) && Math.abs(x.d)>=5);
    return [top?('最近'+top.k+'有什么变化？'):'最近进步了吗？',exams.length>=3?'下一场表现预测':'哪科最值得关注？'];
  }
  function entryButton(label, cls, surface, question) {
    const b=button('',cls,()=>open(surface,typeof question==='function'?question():question));
    b.append(sparkle(),element('span','',label));
    b.dataset.sqEntry=surface;
    return b;
  }
  function ensureSession() {
    const token=current();
    if(session && token!==session.token)reset();
    if(!token)return false;
    if(session?.unavailableAt && Date.now()-session.unavailableAt>60000)reset();
    if(!session) {
      const s=session={token,charts:[],pending:null,lastAnswer:null,cap:null,thinking:'standard',thinkingModes:null,surface:'stats'};
      request(s,{action:'study_status'}).then(value=>{
        if(s!==session||token!==current())return;
        if(!value.enabled){s.unavailableAt=Date.now();return;}
        s.cap=value.cap;
        if(value.thinkingModes&&Object.keys(thinkingLabels).every(k=>Number.isFinite(value.thinkingModes[k])&&value.thinkingModes[k]>0)){
          s.thinkingModes=value.thinkingModes;s.thinking=savedThinking();
        }
        scheduleEntries();
      }).catch(()=>{if(s===session)s.unavailableAt=Date.now();});
    }
    return session.cap!=null;
  }
  function examQuestion(name,date) {
    return ('请分析'+(date?date+'的':'')+'「'+String(name||'本次考试').slice(0,100)+'」表现，结合历史成绩、排名与考试难度。').slice(0,300);
  }
  function homeEntry(content) {
    const prompts=homePrompts();
    const key=prompts.join('|');
    let host=content.querySelector('[data-sq-entry="home"]');
    if(!prompts.length){host?.remove();return;}
    if(host?.dataset.key===key)return;
    host?.remove();
    host=element('section','sq-home-entry');host.dataset.sqEntry='home';host.dataset.key=key;
    const heading=element('div','sq-home-heading');
    heading.append(sparkle(),element('strong','','AI 学情助手'));
    const start=button('','sq-home-input',()=>open('home'));
    start.append(element('span','','关于成绩，想问点什么？'),element('span','sq-home-arrow','↑'));
    const suggestions=element('div','sq-home-suggestions');
    prompts.forEach(q=>{const b=button(q,'sq-home-prompt',()=>open('home_suggestion',q));suggestions.append(b);});
    host.append(heading,start,suggestions);
    const hero=content.querySelector(':scope > .hero');
    if(hero)hero.after(host);else content.prepend(host);
    track('study_entry_mounted','home');
  }
  const chartPrompts=[
    [/成绩含金量/,'请解读我的成绩含金量，实际分数与历史难度等效成绩有什么区别？'],
    [/学习状态预测/,'结合我的历史记录，解读下一场考试的预测及波动范围。'],
    [/相似轨迹/,'请解读我的相似轨迹，有哪些值得参考的信息？'],
    [/目标校准|目标分析/,'请分析我的目标达成情况，哪些目标值得调整？'],
    [/趋势与进步|成绩与排名|成绩趋势/,'请解读我的成绩和排名趋势，有哪些值得关注的变化？'],
    [/学科定位|学科结构/,'请解读我的学科表现，哪些科目是优势或值得关注？']
  ];
  function chartQuestion(card,prompt) {
    const selected=[...card.querySelectorAll('select')].filter(e=>!e.disabled&&e.offsetParent!==null).map(e=>e.selectedOptions?.[0]?.textContent?.trim()).filter(Boolean);
    const chips=[...card.querySelectorAll('.chip.active, .chip[aria-pressed="true"]')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim()).filter(Boolean);
    const scope=[...new Set([...selected,...chips])].slice(0,6).join('、').slice(0,100);
    return scope?prompt+' 当前图表筛选：'+scope+'。':prompt;
  }
  function chartEntries(page) {
    if(!page)return;
    for(const card of page.querySelectorAll(':scope > .card, :scope > section.card')) {
      const title=card.querySelector('.card-title,.dsb-head > span,.dsb-head');
      if(!title||card.querySelector('[data-sq-entry="chart"]'))continue;
      const titleText=title.textContent.trim();
      const match=chartPrompts.find(([rx])=>rx.test(titleText));
      if(!match)continue;
      const b=entryButton('解读','sq-chart-entry','chart',()=>chartQuestion(card,match[1]));
      b.setAttribute('aria-label','AI 解读 '+titleText);
      title.after(b);
    }
  }
  function syncEntries() {
    if(!ensureSession())return;
    const content=document.getElementById('content');
    if(!content)return;
    const page=state.page;
    const detail=content.querySelector('.ed-page');
    const top=document.querySelector('#app .topbar');
    const existingTop=top?.querySelector('[data-sq-entry="global"]');
    if(page==='home'||page==='stats'||detail){existingTop?.remove();}
    else if(top&&!existingTop){
      const b=entryButton('问 AI','sq-global-entry','global');
      b.setAttribute('aria-label','问 AI');
      const nav=top.querySelector('.desktop-nav');
      if(nav)nav.before(b);else top.append(b);
      track('study_entry_mounted','global');
    }
    if(page==='home')homeEntry(content);
    if(page==='stats'){
      const analysis=content.querySelector('.an-layout');
      attach(analysis,analysis?.querySelector(':scope > .an-navigation'));
      chartEntries(analysis);
    }
    if(detail&&!detail.querySelector('[data-sq-entry="exam_detail"]')){
      const overview=detail.querySelector('.ed-overview');
      const heading=detail.querySelector('.ed-heading h1');
      if(overview&&heading){
        const b=entryButton('这次考得怎么样？','sq-context-entry','exam_detail',()=>examQuestion(heading.textContent.trim(),detail.querySelector('.ed-heading p')?.textContent.trim().split(' · ')[0]));
        b.append(element('small','','结合历史表现分析'),element('span','sq-context-arrow','›'));
        overview.after(b);
        track('study_entry_mounted','exam_detail');
      }
    }
    const existingSave=content.querySelector('[data-sq-entry="saved"]');
    if(recentSave && recentSave.token===current() && recentSave.until>Date.now() && !detail && (page==='home'||page==='records')){
      if(!existingSave){
        const el=element('div','sq-saved-entry');el.dataset.sqEntry='saved';
        el.append(entryButton('看看这次考试有哪些变化','sq-saved-action','saved_action',()=>examQuestion(recentSave.exam.name,recentSave.exam.exam_date)),button('×','sq-saved-dismiss',()=>{recentSave=null;el.remove();}));
        el.lastChild.setAttribute('aria-label','关闭本次考试分析建议');
        content.prepend(el);track('study_entry_mounted','saved');
      }
    }else existingSave?.remove();
  }
  function scheduleEntries(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;syncEntries();});
  }
  // Observe only successful new records, never draft edits or failed saves.
  if(typeof saveExam==='function'){
    const saveBefore=saveExam;
    saveExam=async function(id,modal){
      const token=current(),before=new Set(records().map(e=>String(e.id)));
      const result=await saveBefore.apply(this,arguments);
      if(!id&&token&&token===current()&&modal&&!modal.isConnected){
        const added=records().filter(e=>!before.has(String(e.id))&&hasScore(e));
        if(added.length===1){
          recentSave={token,exam:added[0],until:Date.now()+120000};
          scheduleEntries();
        }
      }
      return result;
    };
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
  function attach(page,anchor) {
    if(!page||!anchor||!ensureSession()||launcher?.parentNode===page)return;
    launcher=entryButton('问 AI','an-study-open','stats');
    // Retain the existing accessible label for compatibility with the current layout tests.
    launcher.setAttribute('aria-label','问成绩');
    const label=launcher.querySelector('span:last-child');
    label.className='sq-launch-copy';
    label.textContent='';
    label.append(element('strong','','问 AI'),element('small','','趋势、排名、下一场，都可以问'));
    launcher.append(element('span','sq-launch-arrow','›'));
    anchor.after(launcher);
    track('study_entry_mounted','stats');
  }
  function pick(text) {
    const input = dialog.querySelector('textarea');
    input.value=text;
    resizeComposer(input);
    input.focus();
    controls();
  }
  function resizeComposer(input){input.style.height='auto';input.style.height=Math.min(112,Math.max(44,input.scrollHeight))+'px';}
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
  function richerWidget(spec){
    if(!['baseline','change','goal','forecast'].includes(spec?.type))return null;
    const frame=element('section','sq-compact sq-rich-'+spec.type);
    if(spec.title)frame.append(element('strong','sq-compact-title',String(spec.title).slice(0,32)));
    const pct=n=>Math.max(0,Math.min(100,n))+'%';
    const fmt=n=>String(Math.round(n*100)/100);
    const legend=(text)=>element('small','sq-rich-legend',text);
    if(spec.type==='forecast'){
      const cards=(Array.isArray(spec.cards)?spec.cards:[]).filter(c=>c&&['rate','rank'].includes(c.metric)&&Number.isFinite(c.value)&&c.value>=0&&c.value<=100).slice(0,6);
      if(!cards.length)return null;
      const grid=element('div','sq-forecast-grid');
      for(const c of cards){
        const card=element('div','sq-forecast-card'),rank=c.metric==='rank',hasMax=!rank&&Number.isFinite(c.scoreMax)&&c.scoreMax>0;
        card.append(element('small','',String(c.label)+' · '+(rank?'年级位置':'预计成绩')));
        card.append(element('b','sq-forecast-value',hasMax?fmt(c.value*c.scoreMax/100)+' / '+c.scoreMax:miniFormat(c.metric,c.value)));
        if(hasMax)card.append(legend('预计得分率 '+fmt(c.value)+'%'));
        if(Number.isFinite(c.low)&&Number.isFinite(c.high)&&c.low>=0&&c.high<=100&&c.low<=c.high){
          const track=element('div','sq-range-track'),band=element('span','sq-range-band'),dot=element('i','sq-range-dot');
          band.style.left=pct(c.low);band.style.width=pct(c.high-c.low);dot.style.left=pct(c.value);track.append(band,dot);
          track.setAttribute('role','img');track.setAttribute('aria-label','参考范围 '+miniFormat(c.metric,c.low)+' 至 '+miniFormat(c.metric,c.high));
          const labels=element('div','sq-range-labels');labels.append(element('span','',miniFormat(c.metric,c.low)),element('span','',miniFormat(c.metric,c.high)));
          card.append(track,labels,legend('预测参考范围'));
        }else card.append(legend('未提供预测区间'));
        if(Number.isFinite(c.recent))card.append(legend('最近记录 '+miniFormat(c.metric,c.recent)));
        if(c.source)card.append(legend(String(c.source).slice(0,160)));
        grid.append(card);
      }
      frame.append(grid);
      const charts=(Array.isArray(spec.charts)?spec.charts:[]).filter(Boolean).slice(0,6);
      if(charts.length){
        const details=element('details','sq-rich-details');details.append(element('summary','','展开完整预测趋势'));
        details.addEventListener('toggle',()=>{if(!details.open||details.dataset.loaded)return;details.dataset.loaded='1';for(const spec of charts){const chart=window.ScoreStudyChart?.render(spec);if(chart){details.append(chart.figure);session.charts.push(chart.dispose);}}});
        frame.append(details);
      }
    }else{
      const items=(Array.isArray(spec.items)?spec.items:[]).slice(0,6);
      let valid=0;
      if(spec.type==='baseline')frame.append(legend('色条：本次 · 竖线：历史中位数（0–100%）'));
      for(const i of items){
        if(!i||typeof i.label!=='string'||!Number.isFinite(i.current))continue;
        const row=element('div','sq-rich-row'),head=element('div','sq-rich-row-head');
        head.append(element('b','',i.label));
        if(spec.type==='goal'){
          if(!Number.isFinite(i.target)||i.target<=0||i.current<0||i.current>i.target)continue;
          head.append(element('span','',fmt(i.current)+' / '+fmt(i.target)+' 分'));
          const track=element('div','sq-rich-track'),fill=element('span','sq-rich-fill');fill.style.width=pct(i.current/i.target*100);track.append(fill);
          row.append(head,track,legend('距目标 '+fmt(i.target-i.current)+' 分'));
        }else{
          if(!['rate','rank'].includes(i.metric)||!Number.isFinite(i.previous)||i.current<0||i.current>100||i.previous<0||i.previous>100)continue;
          const delta=Math.round((i.metric==='rank'?i.previous-i.current:i.current-i.previous)*100)/100;
          head.append(element('span','sq-rich-delta'+(delta>0?' is-up':delta<0?' is-down':''),(delta>0?'+':'')+fmt(delta)+' 个百分点'));
          if(spec.type==='change'){
            const numbers=element('div','sq-change-numbers');numbers.append(element('span','',miniFormat(i.metric,i.previous)),element('span','sq-change-arrow','→'),element('b','',miniFormat(i.metric,i.current)));
            row.append(head,numbers,legend('此前中位数 → 本次'));
          }else{
            const track=element('div','sq-rich-track'),fill=element('span','sq-rich-fill'),marker=element('i','sq-rich-marker');
            fill.style.width=pct(i.current);marker.style.left=pct(i.previous);track.append(fill,marker);
            row.append(head,track,legend('本次 '+miniFormat(i.metric,i.current)+' · 历史 '+miniFormat(i.metric,i.previous)+(i.metric==='rank'?'（越低越靠前）':'')));
          }
        }
        frame.append(row);valid++;
      }
      if(!valid)return null;
    }
    if(spec.caption)frame.append(element('p','sq-compact-caption',String(spec.caption).slice(0,120)));
    return frame;
  }
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
      const bounded=['rate','rank','classRank','cityRank','districtRank','difficulty'].includes(s.metric)&&points.every(p=>p.value>=0&&p.value<=100);
      const min=bounded?0:Math.min(0,...points.map(p=>p.value)),max=bounded?100:Math.max(0,...points.map(p=>p.value)),span=max-min||1,zero=-min/span*100;
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
    const inline=(node,text)=>{
      for(const part of String(text||'').split(/(\*\*[^*\n]+\*\*)/g)){
        if(part.startsWith('**')&&part.endsWith('**')&&part.length>4)node.append(element('strong','',part.slice(2,-2)));
        else node.append(document.createTextNode(part));
      }
      return node;
    };
    const appendText=text=>{
      const lines=String(text||'').split(/\r?\n/);
      let list=null,paragraph=[];
      const flush=()=>{if(paragraph.length)article.append(inline(element('p','sq-answer'),paragraph.join('\n')));paragraph=[];};
      for(const line of lines){
        const heading=line.match(/^#{2,3}\s+(.+)$/);
        const bullet=line.match(/^\s*(?:[-•]\s*|(\d+)[.、]\s+)(.+)$/);
        if(heading){flush();list=null;article.append(inline(element('h3','sq-answer-heading'),heading[1]));}
        else if(bullet){flush();const tag=bullet[1]?'ol':'ul';if(!list||list.tagName.toLowerCase()!==tag){list=element(tag,'sq-answer-list');article.append(list);}list.append(inline(element('li',''),bullet[2]));}
        else if(/^>\s?/.test(line)){flush();list=null;article.append(inline(element('blockquote','sq-answer-quote'),line.replace(/^>\s?/,'')));}
        else if(!line.trim()){flush();list=null;}
        else{list=null;paragraph.push(line);}
      }
      flush();
    };
    const appendChart=spec=>{
      const chart=window.ScoreStudyChart?.render(spec);
      if(chart){article.append(chart.figure);session.charts.push(chart.dispose);}
    };
    const widgets=Array.isArray(turn.widgets)?turn.widgets.slice(0,4):[];
    const appendWidgets=i=>widgets.filter(w=>Math.max(1,Number(w.after)||1)===i).forEach(w=>{const node=w.type==='relations'?relationsWidget(w):w.type==='aggregate'?aggregateWidget(w):['metric','compare'].includes(w.type)?metricWidget(w):['sparkline','bars','actions'].includes(w.type)?compactWidget(w):['baseline','change','goal','forecast'].includes(w.type)?richerWidget(w):scenarioWidget(w);if(node)article.append(node);});
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
      track('study_question_answered',pending.surface);
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
    resizeComposer(input);
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
    const pending=s.pending={article,feedback,status,surface:s.surface,payload:{question,previous:s.lastAnswer,requestId:crypto.randomUUID(),...(s.thinkingModes?{thinking:s.thinking}:{})}};
    track('study_question_sent',s.surface);
    send(s,pending);
    article.scrollIntoView?.({block:'nearest',behavior:'instant'});
  }
  function open(surface='stats',question='') {
    if (!session || current()!==session.token || session.cap==null) return;
    session.surface=surface;
    if (!dialog) {
      dialog=element('dialog','sq-dialog');
      dialog.setAttribute('aria-labelledby','sq-title');
      dialog.innerHTML='<header class="sq-header"><div><span class="sq-spark" aria-hidden="true">✦</span><h2 id="sq-title">问成绩</h2></div><button type="button" aria-label="关闭">×</button></header><div class="sq-thread"></div><form class="sq-composer"><label class="sq-sr-only" for="sq-input">你的问题</label><div class="sq-input-row"><textarea id="sq-input" rows="1" maxlength="300" placeholder="想问问哪科成绩？"></textarea><button type="submit">提问</button></div><footer><label class="sq-thinking" hidden><span>思考</span><select aria-label="思考强度"><option value="low">低</option><option value="standard">标准</option><option value="high">高</option></select></label><small class="sq-cap"></small></footer></form>';
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
      dialog.querySelector('textarea').addEventListener('input',event=>{resizeComposer(event.currentTarget);controls();});
      dialog.querySelector('form').addEventListener('submit',ask);
      document.body.append(dialog);
      const welcome=element('section','sq-welcome');
      welcome.append(element('h3','','想聊哪门成绩？'));
      const choices=element('div','sq-choices');
      const recommended=homePrompts();
      [...new Set([...recommended,...starters])].slice(0,3).forEach(q=>choices.append(button(q,'sq-choice',()=>pick(q))));
      welcome.append(choices);
      dialog.querySelector('.sq-thread').append(welcome);
      controls();
    }
    if (!dialog.open) dialog.showModal();
    if(question && !session.pending?.running)pick(String(question).slice(0,300));
    track('study_question_open',surface);
  }
  window.ScoreStudyQuestions={attach,open};
  const root=document.getElementById('app') || document.body;
  new MutationObserver(scheduleEntries).observe(root,{childList:true,subtree:true});
  scheduleEntries();
})();
