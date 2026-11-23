// Analysis navigation owns the launcher. The conversation survives a stats-page redraw.
(function () {
  'use strict';
  const api = '/api/score-tracker-study-api';
  const starters = ['最近两场，哪科变化最大？', '画出我的得分率和排名走势', '下一场大概能排到哪里？'];
  let session, launcher, dialog;
  function current() { return typeof state !== 'undefined' && state.user && state.token; }
  function reset() {
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
    if (typeof window.__stTrack === 'function') window.__stTrack(event,{surface:'stats'});
  }
  async function request(s, data) {
    const response = await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...data,token:s.token})});
    const value = await response.json().catch(()=>null);
    if (!response.ok || !value) throw Object.assign(Error(value?.error || '暂时没加载出来'),{code:value?.code});
    return value;
  }
  function attach(page, anchor) {
    const token = current();
    if (session && token !== session.token) reset();
    if (!page || !anchor || !token) return;
    if (!session) {
      const s = session = {token,turns:[],charts:[],busy:false,cap:null,lastAttempt:null};
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
    dialog.querySelector('[type=submit]').disabled=session.busy || !input.value.trim();
    input.readOnly=session.busy;
    dialog.querySelectorAll('.sq-choice').forEach(b=>b.disabled=session.busy);
  }
  function addTurn(list, turn) {
    list.querySelector('.sq-welcome')?.remove();
    list.querySelector('.sq-next')?.remove();
    const article=element('article','sq-turn');
    article.append(element('p','sq-question',turn.question),element('p','sq-answer',turn.answer));
    const chart=window.ScoreStudyChart?.render(turn.chart);
    if (chart) {
      article.append(chart.figure);
      session.charts.push(chart.dispose);
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
    list.append(article);
    article.scrollIntoView?.({block:'start',behavior:'instant'});
  }
  async function ask(event) {
    event.preventDefault();
    const s=session, box=dialog;
    if (!s || s.busy || current()!==s.token) return;
    const input=box.querySelector('textarea'), question=input.value.trim();
    if (!question) return;
    const status=box.querySelector('[role=status]');
    const previous=s.turns.at(-1)?.id || null;
    if (s.lastAttempt?.question!==question || s.lastAttempt?.previous!==previous) {
      s.lastAttempt={question,previous,requestId:crypto.randomUUID()};
    }
    s.busy=true; status.textContent='正在看你的成绩…'; controls();
    try {
      const reply=await request(s,{action:'study_question',...s.lastAttempt});
      if (s!==session || s.token!==current() || box!==dialog) return;
      const turn={...reply,question};
      s.turns.push(turn);
      s.lastAttempt=null;
      input.value=''; input.placeholder='继续问…';
      status.textContent='';
      track('study_question_answered');
      addTurn(box.querySelector('.sq-thread'),turn);
    } catch (error) {
      if (s!==session || s.token!==current()) return;
      if (error.code==='retry' || error.code==='study_failed') s.lastAttempt=null;
      status.textContent=error.message || '暂时没加载出来，再试一次';
    } finally {
      s.busy=false;
      if (s===session && box===dialog) controls();
    }
  }
  function open() {
    if (!session || current()!==session.token) return;
    if (!dialog) {
      dialog=element('dialog','sq-dialog');
      dialog.setAttribute('aria-labelledby','sq-title');
      dialog.innerHTML='<header class="sq-header"><div><span class="sq-spark" aria-hidden="true">✦</span><h2 id="sq-title">问成绩</h2></div><button type="button" aria-label="关闭">×</button></header><div class="sq-thread"></div><form class="sq-composer"><label class="sq-sr-only" for="sq-input">你的问题</label><div class="sq-input-row"><textarea id="sq-input" rows="2" maxlength="300" placeholder="想问问哪科成绩？"></textarea><button type="submit">提问</button></div><footer><small></small><span role="status"></span></footer></form>';
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
