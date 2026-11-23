// Analysis navigation owns the launcher. The conversation survives a stats-page redraw.
(function () {
  'use strict';
  const api = '/api/score-tracker-data-api';
  const starters = ['最近两场，哪科变化最大？', '这次哪科离目标最远？', '我的分数和年级排名变化一致吗？'];
  let session, launcher, dialog;
  function current() { return typeof state !== 'undefined' && state.user && state.token; }
  function reset() {
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
    const endpoint = api + (data.action==='study_question' ? '?task=study-question' : '');
    const response = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...data,token:s.token})});
    const value = await response.json();
    if (!response.ok) throw Object.assign(Error(value.error || '暂时没加载出来'),{code:value.code});
    return value;
  }
  function attach(host) {
    const token = current();
    if (session && token !== session.token) reset();
    if (!host || !token) return;
    if (!session) {
      const s = session = {token,turns:[],busy:false,cap:null,lastAttempt:null};
      request(s,{action:'study_status'}).then(value=>{
        if (s!==session || token!==current() || !value.enabled) return;
        s.cap=value.cap;
        attach(document.querySelector('#content .an-secondary-row'));
      }).catch(()=>{ if (s===session) s.unavailableAt=Date.now(); });
    }
    if (session.unavailableAt && Date.now()-session.unavailableAt>60000) { reset(); attach(host); return; }
    if (session.cap==null || launcher?.parentNode===host) return;
    launcher = button('问成绩','an-study-open',open);
    host.prepend(launcher);
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
  function draw() {
    const list=dialog.querySelector('.sq-thread');
    list.replaceChildren();
    if (!session.turns.length) {
      const choices=element('div','sq-choices');
      starters.forEach(q=>choices.append(button(q,'sq-choice',()=>pick(q))));
      list.append(choices);
    }
    session.turns.forEach((turn,index)=>{
      const article=element('article','sq-turn');
      article.append(element('p','sq-question',turn.question),element('p','sq-answer',turn.answer));
      const changes=turn.evidence.filter(row=>row.kind==='change').slice(0,3);
      if (changes.length) {
        const strip=element('div','sq-changes');
        for (const row of changes) {
          const cell=element('div');
          cell.append(element('small','',row.label),element('strong','',row.value));
          strip.append(cell);
        }
        article.append(strip);
      }
      if (turn.evidence.length) {
        const details=element('details','sq-evidence');
        details.append(element('summary','','查看依据 · '+turn.evidence.length+' 条'));
        for (const row of turn.evidence) {
          const fact=element('div','sq-fact');
          fact.append(element('small','',row.source),element('b','',row.label),element('span','',row.value));
          details.append(fact);
        }
        article.append(details);
      }
      article.append(element('small','sq-charge','本次 '+turn.charged+' 积分'));
      if (index===session.turns.length-1 && turn.next) article.append(button(turn.next,'sq-choice',()=>pick(turn.next)));
      list.append(article);
    });
    list.scrollTop=list.scrollHeight;
    controls();
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
    s.busy=true; status.textContent='正在查看考试记录…'; controls();
    try {
      const reply=await request(s,{action:'study_question',...s.lastAttempt});
      if (s!==session || s.token!==current() || box!==dialog) return;
      s.turns.push({...reply,question});
      s.lastAttempt=null;
      input.value=''; input.placeholder='继续问…';
      status.textContent='';
      track('study_question_answered');
      draw();
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
      dialog.innerHTML='<header><h2 id="sq-title">学情问答</h2><button type="button" aria-label="关闭">×</button></header><div class="sq-thread"></div><form><label for="sq-input">你的问题</label><textarea id="sq-input" rows="2" maxlength="300" placeholder="想看看哪次考试、哪门科目？"></textarea><div role="status"></div><footer><small></small><button type="submit">提问</button></footer></form>';
      dialog.querySelector('header button').onclick=()=>dialog.close();
      dialog.querySelector('footer small').textContent='近 60 场内 · 每问最多 '+session.cap+' 积分';
      dialog.querySelector('textarea').addEventListener('input',controls);
      dialog.querySelector('form').addEventListener('submit',ask);
      document.body.append(dialog);
      draw();
    }
    if (!dialog.open) dialog.showModal();
    track('study_question_open');
  }
  window.ScoreStudyQuestions={attach};
  const root=document.getElementById('app') || document.body;
  new MutationObserver(()=>{if(session && current()!==session.token)reset();}).observe(root,{childList:true,subtree:true});
})();
