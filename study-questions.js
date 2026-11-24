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
    statistics:'指标关联', scenario:'分数模拟',
  };
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
      const s = session = {token,charts:[],pending:null,lastAnswer:null,cap:null};
      request(s,{action:'study_status'}).then(value=>{
        if (s!==session || token!==current() || !value.enabled) return;
        s.cap=value.cap;
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
    if(Array.isArray(turn.chartAfter)&&turn.chartAfter.length===specs.length) {
      const paragraphs=String(turn.answer||'').split(/\n\s*\n/).filter(p=>p.trim());
      const positions=specs.map((_,i)=>Number.isInteger(turn.chartAfter[i])?Math.max(1,Math.min(paragraphs.length,turn.chartAfter[i])):paragraphs.length);
      paragraphs.forEach((paragraph,i)=>{
        appendText(paragraph);
        specs.forEach((spec,j)=>{if(positions[j]===i+1)appendChart(spec);});
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
    if (turn.charged != null) meta.append(element('small','sq-charge',Number(turn.charged)+' 积分'));
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
    if (s.pending?.payload.question===question) {
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
    const pending=s.pending={article,feedback,status,payload:{question,previous:s.lastAnswer,requestId:crypto.randomUUID()}};
    send(s,pending);
    article.scrollIntoView?.({block:'nearest',behavior:'instant'});
  }
  function open() {
    if (!session || current()!==session.token) return;
    if (!dialog) {
      dialog=element('dialog','sq-dialog');
      dialog.setAttribute('aria-labelledby','sq-title');
      dialog.innerHTML='<header class="sq-header"><div><span class="sq-spark" aria-hidden="true">✦</span><h2 id="sq-title">问成绩</h2></div><button type="button" aria-label="关闭">×</button></header><div class="sq-thread"></div><form class="sq-composer"><label class="sq-sr-only" for="sq-input">你的问题</label><div class="sq-input-row"><textarea id="sq-input" rows="2" maxlength="300" placeholder="想问问哪科成绩？"></textarea><button type="submit">提问</button></div><footer><small></small></footer></form>';
      dialog.querySelector('header button').onclick=()=>dialog.close();
      dialog.querySelector('footer small').textContent='每问最多 '+session.cap+' 积分';
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
