const API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
const SUBJECTS = ['语文','数学','英语','物理','化学','生物'];
const SUBJECT_SHORT = {语文:'语',数学:'数',英语:'英',物理:'物',化学:'化',生物:'生'};
const state = { token: localStorage.getItem('st_token') || '', user:null, exams:[], page:'home', subject:'总分', modal:null, onboarding:null };
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

async function api(action, payload={}) {
  const res = await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action, token:state.token, ...payload})});
  const data = await res.json().catch(()=>({error:'网络响应异常'}));
  if(!res.ok){
    if(res.status===401 && action!=='login'){ localStorage.removeItem('st_token'); state.token=''; state.user=null; renderLogin(); }
    throw new Error(data.error||'请求失败');
  }
  return data;
}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function fmtDate(d){ if(!d) return ''; const x=new Date(d+'T00:00:00'); return `${x.getMonth()+1}月${x.getDate()}日`; }
function fmtYearDate(d){ if(!d) return ''; const x=new Date(d+'T00:00:00'); return `${x.getFullYear()}.${String(x.getMonth()+1).padStart(2,'0')}.${String(x.getDate()).padStart(2,'0')}`; }
function num(v){ return v===null||v===undefined||v===''?null:Number(v); }
function toast(msg){ let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);} t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),1800); }
function totalFor(exam, key){ let sum=0,count=0; SUBJECTS.forEach(s=>{const v=num(exam.scores?.[s]?.[key]);if(v!==null){sum+=v;count++;}}); return count?sum:null; }
function latestActualTotal(){ const valid=[...state.exams].reverse().map(e=>({e,v:totalFor(e,'actual')})).find(x=>x.v!==null); return valid?.v??null; }
function latestTargetTotal(){ const valid=[...state.exams].reverse().map(e=>({e,v:totalFor(e,'target')})).find(x=>x.v!==null); return valid?.v??null; }
function trendDelta(){ const vals=state.exams.map(e=>totalFor(e,'actual')).filter(v=>v!==null); return vals.length>1?vals.at(-1)-vals.at(-2):null; }
function recordedCount(){ return state.exams.filter(e=>SUBJECTS.some(s=>num(e.scores?.[s]?.actual)!==null)).length; }

async function init(){
  if(state.token){
    try{ const me=await api('me');state.user=me.user;await loadExams();render();return; }catch(e){}
  }
  if(localStorage.getItem('st_known_user')) renderLogin(); else await autoRegister();
}
async function autoRegister(){
  document.querySelector('#app').innerHTML='<div class="splash"><div class="brand-mark">↗</div><div>正在创建你的专属账号</div><small>只需要几秒钟</small></div>';
  try{
    const data=await api('register');state.token=data.token;state.user=data.user;localStorage.setItem('st_token',data.token);localStorage.setItem('st_known_user','1');state.onboarding={username:data.user.username,password:data.password};await loadExams();render();
  }catch(e){ renderLogin(e.message); }
}
async function loadExams(){ const data=await api('list_exams');state.exams=data.exams||[]; }

function render(){
  const app=$('#app');
  app.innerHTML=`<div class="shell">
    <header class="topbar"><div class="brand"><div class="logo">↗</div><div><h1>成绩轨迹</h1><p>把每一次努力，连成一条向上的线</p></div></div>
    <nav class="desktop-nav">${navButton('home','概览')}${navButton('records','考试记录')}${navButton('account','账号')}</nav></header>
    <main id="content"></main></div>
    <nav class="bottom-nav">${bottomButton('home','⌂','概览')}${bottomButton('records','▤','记录')}${bottomButton('account','○','账号')}</nav>`;
  renderPage();bindNav();
  if(state.onboarding) showOnboarding();
}
function navButton(p,label){return `<button class="nav-btn ${state.page===p?'active':''}" data-page="${p}">${label}</button>`}
function bottomButton(p,icon,label){return `<button class="${state.page===p?'active':''}" data-page="${p}"><span>${icon}</span><span>${label}</span></button>`}
function bindNav(){ $$('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();}); }
function renderPage(){ const c=$('#content'); if(state.page==='home') c.innerHTML=homeHtml(); if(state.page==='records') c.innerHTML=recordsHtml(); if(state.page==='account') c.innerHTML=accountHtml(); bindPage(); }

function homeHtml(){
  const actual=latestActualTotal(),target=latestTargetTotal(),delta=trendDelta();
  const last=state.exams.at(-1);
  return `<section class="hero">
    <div class="card hero-main"><span class="eyebrow">✦ 本学年成长记录</span><h2>${state.exams.length?'看见起伏，也看见自己在进步。':'从下一次考试开始，记录你的上升轨迹。'}</h2><p class="hero-desc">记录语数英物化生每次考试的目标与真实成绩，趋势会自动汇成折线图。期中先写目标，考完再补真实成绩也可以。</p><div class="hero-actions"><button class="primary" id="addExamHome">＋ 记录一次考试</button><button class="secondary" data-page="records">查看全部记录</button></div></div>
    <div class="card hero-stat"><div><div class="stat-label">最近一次真实总分</div><div class="stat-value">${actual===null?'—':actual}</div><div class="stat-sub">${last?escapeHtml(last.name)+' · '+fmtDate(last.exam_date):'还没有真实成绩记录'}</div></div>${delta===null?'':`<span class="trend-pill">${delta>=0?'↗':'↘'} 较上次 ${delta>=0?'+':''}${delta.toFixed(0)} 分</span>`}</div>
  </section>
  <section class="grid-main"><div class="card chart-card"><div class="card-title-row"><div><h3 class="card-title">成绩趋势</h3><p class="card-sub">真实成绩与目标成绩放在同一张图里</p></div><div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div></div><div class="chips">${['总分',...SUBJECTS].map(s=>`<button class="chip ${state.subject===s?'active':''}" data-subject="${s}">${s}</button>`).join('')}</div><div class="chart-wrap" id="chart">${chartHtml()}</div></div>
  <div class="side-stack"><div class="card quick-card"><h3 class="card-title">这一年的记录</h3><div class="quick-grid"><div class="mini-stat"><b>${state.exams.length}</b><span>次考试</span></div><div class="mini-stat"><b>${recordedCount()}</b><span>次已出分</span></div><div class="mini-stat"><b>${target===null?'—':target}</b><span>最近目标总分</span></div><div class="mini-stat"><b>${delta===null?'—':(delta>=0?'+':'')+delta.toFixed(0)}</b><span>最近变化</span></div></div></div>
  <div class="card recent-card"><div class="card-title-row"><div><h3 class="card-title">最近考试</h3><p class="card-sub">点击可编辑或补录成绩</p></div></div>${recentHtml()}</div></div></section>`;
}
function recentHtml(){ if(!state.exams.length)return `<div class="empty-chart" style="height:150px"><div><div class="empty-icon">✎</div>第一条记录，会成为你的起点</div></div>`; return [...state.exams].reverse().slice(0,4).map((e,i)=>{const a=totalFor(e,'actual');return `<div class="exam-item clickable" data-edit="${e.id}"><div class="exam-dot">${i+1}</div><div class="exam-info"><b>${escapeHtml(e.name)}</b><span>${fmtYearDate(e.exam_date)}</span></div><div class="exam-score">${a===null?'待补录':a}</div></div>`}).join(''); }
function chartHtml(){
  if(!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>`;
  const points=state.exams.map(e=>({name:e.name,date:e.exam_date,actual:state.subject==='总分'?totalFor(e,'actual'):num(e.scores?.[state.subject]?.actual),target:state.subject==='总分'?totalFor(e,'target'):num(e.scores?.[state.subject]?.target)}));
  const vals=points.flatMap(p=>[p.actual,p.target]).filter(v=>v!==null); if(!vals.length)return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>`;
  let max=Math.max(...vals),min=Math.min(...vals); const pad=Math.max(10,(max-min)*.18); max=Math.ceil((max+pad)/10)*10;min=Math.max(0,Math.floor((min-pad)/10)*10);if(max===min)max=min+100;
  const W=760,H=300,L=46,R=18,T=20,B=46, cw=W-L-R,ch=H-T-B; const x=i=>points.length===1?L+cw/2:L+(i/(points.length-1))*cw; const y=v=>T+(max-v)/(max-min)*ch;
  const ticks=5; let grid='';for(let i=0;i<=ticks;i++){const v=max-(max-min)*i/ticks;const yy=T+ch*i/ticks;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`}
  const line=(key,color,dash='')=>{let d='',started=false,circles='';points.forEach((p,i)=>{const v=p[key];if(v===null){started=false;return;}const xx=x(i),yy=y(v);d+=`${started?'L':'M'} ${xx} ${yy} `;started=true;circles+=`<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="${color}" stroke-width="3" data-tip="${escapeHtml(p.name)} · ${key==='actual'?'真实':'目标'} ${v}"/>`;});return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${dash?`stroke-dasharray="${dash}"`:''}/>${circles}`};
  const labels=points.map((p,i)=>`<text x="${x(i)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(p.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${line('target','#32a77a','7 7')}${line('actual','#5d72e8')}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

function recordsHtml(){ return `<div class="page-head"><div><h2>考试记录</h2><p>按时间整理目标成绩与真实成绩，任何时候都可以回来补录。</p></div><button class="primary" id="addExam">＋ 新建</button></div><div class="card records-card">${state.exams.length?state.exams.map(recordHtml).join(''):`<div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div>`}</div>`; }
function recordHtml(e){const actual=totalFor(e,'actual'),target=totalFor(e,'target');return `<div class="record"><div class="record-date">${fmtYearDate(e.exam_date)}<b>${escapeHtml(e.name)}</b></div><div class="record-scores">${SUBJECTS.map(s=>{const a=num(e.scores?.[s]?.actual),t=num(e.scores?.[s]?.target);if(a===null&&t===null)return '';return `<span class="score-tag">${s} ${a===null?'—':a}<span style="color:#a1a9b5"> / ${t===null?'—':t}</span></span>`}).join('')||'<span class="score-tag">尚未填写分数</span>'}<span class="score-tag"><b>总分 ${actual===null?'—':actual}</b> / 目标 ${target===null?'—':target}</span></div><div class="record-actions"><button class="icon-btn" title="编辑" data-edit="${e.id}">✎</button><button class="icon-btn danger" title="删除" data-delete="${e.id}">⌫</button></div></div>`}
function accountHtml(){ return `<div class="page-head"><div><h2>账号</h2><p>这个账号让你的成绩记录可以一直保存在云端。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><p class="card-sub">用户名可以用于以后重新登录</p><div class="account-chip"><code>${escapeHtml(state.user?.username||'')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username||'')}">复制</button></div><div class="info-box" style="margin-top:15px"><b>ⓘ 关于密码</b><br>为了安全，密码只在账号创建时展示一次，服务器只保存经过加密处理的密码摘要，无法再显示原密码。</div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">所有考试与成绩都保存在 Supabase 中，并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div>`; }

function bindPage(){
  $$('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();});
  $('#addExamHome')?.addEventListener('click',()=>openExam()); $('#addExam')?.addEventListener('click',()=>openExam()); $('#emptyAdd')?.addEventListener('click',()=>openExam());
  $$('[data-edit]').forEach(b=>b.onclick=()=>openExam(state.exams.find(e=>e.id===b.dataset.edit)));
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteExam(b.dataset.delete));
  $$('[data-subject]').forEach(b=>b.onclick=()=>{state.subject=b.dataset.subject;render();});
  $$('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);toast('已复制')}catch(e){toast('复制失败，请手动选择')}});
  $('#logoutBtn')?.addEventListener('click',logout);
  const chart=$('#chart'); if(chart){ $$('[data-tip]',chart).forEach(p=>{const show=e=>{const tip=$('#chartTip');tip.textContent=p.dataset.tip;tip.style.display='block';const rect=chart.getBoundingClientRect(),cr=p.getBoundingClientRect();tip.style.left=`${cr.left-rect.left+cr.width/2}px`;tip.style.top=`${cr.top-rect.top}px`;};p.addEventListener('mouseenter',show);p.addEventListener('click',show);p.addEventListener('mouseleave',()=>{$('#chartTip').style.display='none'});}); }
}

function openExam(exam=null){
  const editing=!!exam; const today=new Date().toISOString().slice(0,10); const scores=exam?.scores||{};
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：高二上学期期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div></div><div class="score-table"><div class="score-row header"><span>科目</span><span>目标成绩</span><span>真实成绩</span><span>满分</span></div>${SUBJECTS.map(s=>`<div class="score-row" data-score-row="${s}"><span class="subject-name">${s}</span><input inputmode="decimal" class="target-input" placeholder="目标" value="${scores[s]?.target??''}"><input inputmode="decimal" class="actual-input" placeholder="考后补录" value="${scores[s]?.actual??''}"><input inputmode="decimal" class="max-input" value="${scores[s]?.max??100}"></div>`).join('')}</div><p class="form-note">可以先只填写目标成绩，考完之后再回来补录真实成绩。未填写的科目不会计入总分。</p><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  const close=()=>{modal.remove();state.modal=null}; $('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
}
async function saveExam(id,modal){
  const btn=$('.save-btn',modal); const exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,scores:{}};
  $$('[data-score-row]',modal).forEach(r=>{exam.scores[r.dataset.scoreRow]={target:$('.target-input',r).value,actual:$('.actual-input',r).value,max:$('.max-input',r).value}});
  if(!exam.name||!exam.exam_date){toast('请填写考试名称和日期');return} btn.disabled=true;btn.textContent='保存中…';
  try{await api('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);btn.disabled=false;btn.textContent=id?'保存修改':'保存考试';}
}
async function deleteExam(id){ const exam=state.exams.find(e=>e.id===id);if(!confirm(`确定删除「${exam?.name||'这次考试'}」？`))return;try{await api('delete_exam',{examId:id});await loadExams();render();toast('已删除');}catch(e){toast(e.message)} }

function showOnboarding(){
  const d=state.onboarding; const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal onboard"><div class="big-icon">✓</div><h2>账号已经准备好了</h2><p>以后换手机或清除浏览器数据时，可以用下面的用户名和密码重新登录。</p><div class="credential"><small>用户名</small><div class="credential-row"><code>${escapeHtml(d.username)}</code><button class="copy-btn" data-copy="${escapeHtml(d.username)}">复制</button></div></div><div class="credential"><small>密码</small><div class="credential-row"><code>${escapeHtml(d.password)}</code><button class="copy-btn" data-copy="${escapeHtml(d.password)}">复制</button></div></div><div class="save-warning"><span class="i">i</span><div><b>请现在截图保存。</b><br>为了安全，密码关闭此窗口后将不会再次显示，我们也无法从服务器取回原密码。</div></div><button class="primary full" id="savedBtn">我已截图保存，开始记录</button></div>`;document.body.appendChild(modal);$$('[data-copy]',modal).forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.dataset.copy);toast('已复制')});$('#savedBtn',modal).onclick=()=>{state.onboarding=null;modal.remove();};
}
function renderLogin(error=''){
  $('#app').innerHTML=`<div class="auth-page"><div class="card auth-card"><div class="logo">↗</div><h2>欢迎回来</h2><p>输入创建账号时截图保存的用户名和密码，继续查看你的成绩轨迹。</p>${error?`<div class="info-box" style="margin-bottom:15px">${escapeHtml(error)}</div>`:''}<div class="field"><label>用户名</label><input id="loginUser" autocomplete="username" placeholder="例如 bright-panda-4821"></div><div class="field"><label>密码</label><input id="loginPass" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" placeholder="输入10位数字密码"></div><div class="auth-actions"><button class="primary" id="loginBtn">登录</button><button class="secondary" id="newAccountBtn">我没有账号，创建新账号</button></div><div class="auth-help">新账号会自动生成用户名和10位纯数字密码，请按提示截图保存。</div></div></div>`;
  $('#loginBtn').onclick=login;$('#newAccountBtn').onclick=()=>{localStorage.removeItem('st_known_user');autoRegister();};$('#loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
}
async function login(){const btn=$('#loginBtn');btn.disabled=true;btn.textContent='登录中…';try{const data=await api('login',{username:$('#loginUser').value.trim(),password:$('#loginPass').value});state.token=data.token;state.user=data.user;localStorage.setItem('st_token',data.token);localStorage.setItem('st_known_user','1');await loadExams();state.page='home';render();}catch(e){toast(e.message);btn.disabled=false;btn.textContent='登录';}}
async function logout(){if(!confirm('确定退出登录？请确认你已经保存好用户名和密码。'))return;try{await api('logout');}catch(e){}localStorage.removeItem('st_token');state.token='';state.user=null;renderLogin();}

init();
