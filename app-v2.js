const API='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
const SUBJECTS=['语文','数学','英语','物理','化学','生物','历史','地理','政治'];
const MAX_SCORE={语文:150,数学:150,英语:150,物理:100,化学:100,生物:100,历史:100,地理:100,政治:100};
const state={token:localStorage.getItem('st_token')||'',user:null,exams:[],page:'home',subject:'总分',onboarding:null};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const num=v=>v===null||v===undefined||v===''?null:Number(v);
const fmtDate=d=>{if(!d)return'';const x=new Date(d+'T00:00:00');return`${x.getMonth()+1}月${x.getDate()}日`};
const fmtYear=d=>{if(!d)return'';const x=new Date(d+'T00:00:00');return`${x.getFullYear()}.${String(x.getMonth()+1).padStart(2,'0')}.${String(x.getDate()).padStart(2,'0')}`};
function toast(msg){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),1800)}
async function api(action,payload={}){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:state.token,...payload})});const d=await r.json().catch(()=>({error:'网络响应异常'}));if(!r.ok){if(r.status===401&&action!=='login'){localStorage.removeItem('st_token');state.token='';state.user=null;renderLogin()}throw new Error(d.error||'请求失败')}return d}
function totalFor(e,key){let sum=0,count=0;for(const s of SUBJECTS){const v=num(e.scores?.[s]?.[key]);if(v!==null){sum+=v;count++}}return count?sum:null}
function latest(key){return[...state.exams].reverse().map(e=>totalFor(e,key)).find(v=>v!==null)??null}
function delta(){const a=state.exams.map(e=>totalFor(e,'actual')).filter(v=>v!==null);return a.length>1?a.at(-1)-a.at(-2):null}
function recordedCount(){return state.exams.filter(e=>SUBJECTS.some(s=>num(e.scores?.[s]?.actual)!==null)).length}

async function init(){
  if(state.token){try{state.user=(await api('me')).user;await loadExams();render();return}catch{}}
  renderLogin();
}
async function loadExams(){state.exams=(await api('list_exams')).exams||[]}
async function createAccount(){
  $('#app').innerHTML='<div class="splash"><div class="brand-mark">↗</div><div>正在创建你的专属账号</div><small>只需要几秒钟</small></div>';
  try{const d=await api('register');state.token=d.token;state.user=d.user;localStorage.setItem('st_token',d.token);state.onboarding={username:d.user.username,password:d.password};await loadExams();render()}catch(e){renderLogin(e.message)}
}

function renderLogin(error=''){
  $('#app').innerHTML=`<div class="auth-page"><div class="card auth-card"><div class="logo">↗</div><h2>成绩轨迹</h2><p>登录已有账号，或创建一个新账号开始记录。新用户不会自动注册。</p>${error?`<div class="info-box" style="margin-bottom:15px">${esc(error)}</div>`:''}<div class="field"><label>用户名</label><input id="loginUser" autocomplete="username" autocapitalize="none" placeholder="例如 bright-panda-4821"></div><div class="field"><label>密码</label><input id="loginPass" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="current-password" placeholder="10位数字密码"></div><div class="auth-actions"><button class="primary" id="loginBtn">登录</button><button class="secondary" id="createBtn">注册新账号</button></div><div class="auth-help">注册后会自动生成用户名和10位纯数字密码，请按提示截图保存。</div></div></div>`;
  $('#loginBtn').onclick=login;$('#createBtn').onclick=createAccount;$('#loginPass').onkeydown=e=>{if(e.key==='Enter')login()};
}
async function login(){const b=$('#loginBtn');b.disabled=true;b.textContent='登录中…';try{const d=await api('login',{username:$('#loginUser').value.trim(),password:$('#loginPass').value});state.token=d.token;state.user=d.user;localStorage.setItem('st_token',d.token);await loadExams();state.page='home';render()}catch(e){toast(e.message);b.disabled=false;b.textContent='登录'}}

function render(){
  $('#app').innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><div class="logo">↗</div><div><h1>成绩轨迹</h1><p>把每一次努力，连成一条向上的线</p></div></div><nav class="desktop-nav">${nav('home','概览')}${nav('records','考试记录')}${nav('account','账号')}</nav></header><main id="content"></main></div><nav class="bottom-nav">${bottom('home','⌂','概览')}${bottom('records','▤','记录')}${bottom('account','○','账号')}</nav>`;
  renderPage();bindNav();if(state.onboarding)showOnboarding();
}
const nav=(p,l)=>`<button class="nav-btn ${state.page===p?'active':''}" data-page="${p}">${l}</button>`;
const bottom=(p,i,l)=>`<button class="${state.page===p?'active':''}" data-page="${p}"><span>${i}</span><span>${l}</span></button>`;
function bindNav(){$$('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()})}
function renderPage(){const c=$('#content');c.innerHTML=state.page==='home'?homeHtml():state.page==='records'?recordsHtml():accountHtml();bindPage()}

function homeHtml(){
  const actual=latest('actual'),target=latest('target'),d=delta(),last=state.exams.at(-1);
  return `<section class="hero"><div class="card hero-main"><span class="eyebrow">✦ 本学年成长记录</span><h2>${state.exams.length?'看见起伏，也看见自己在进步。':'从下一次考试开始，记录你的上升轨迹。'}</h2><p class="hero-desc">记录语数外物化生史地政九科的目标与真实成绩。语文、数学、英语默认满分150，其余科目默认100；考前可先填目标，考后再补真实成绩。</p><div class="hero-actions"><button class="primary" id="addExamHome">＋ 记录一次考试</button><button class="secondary" data-page="records">查看全部记录</button></div></div><div class="card hero-stat"><div><div class="stat-label">最近一次真实总分</div><div class="stat-value">${actual??'—'}</div><div class="stat-sub">${last?esc(last.name)+' · '+fmtDate(last.exam_date):'还没有真实成绩记录'}</div></div>${d===null?'':`<span class="trend-pill">${d>=0?'↗':'↘'} 较上次 ${d>=0?'+':''}${d.toFixed(0)} 分</span>`}</div></section>
  <section class="grid-main"><div class="card chart-card"><div class="card-title-row"><div><h3 class="card-title">成绩趋势</h3><p class="card-sub">真实成绩与目标成绩放在同一张图里</p></div><div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div></div><div class="chips">${['总分',...SUBJECTS].map(s=>`<button class="chip ${state.subject===s?'active':''}" data-subject="${s}">${s}</button>`).join('')}</div><div class="chart-wrap" id="chart">${chartHtml()}</div></div><div class="side-stack"><div class="card quick-card"><h3 class="card-title">这一年的记录</h3><div class="quick-grid"><div class="mini-stat"><b>${state.exams.length}</b><span>次考试</span></div><div class="mini-stat"><b>${recordedCount()}</b><span>次已出分</span></div><div class="mini-stat"><b>${target??'—'}</b><span>最近目标总分</span></div><div class="mini-stat"><b>${d===null?'—':(d>=0?'+':'')+d.toFixed(0)}</b><span>最近变化</span></div></div></div><div class="card recent-card"><div class="card-title-row"><div><h3 class="card-title">最近考试</h3><p class="card-sub">点击可编辑或补录成绩</p></div></div>${recentHtml()}</div></div></section>`;
}
function recentHtml(){if(!state.exams.length)return`<div class="empty-chart" style="height:150px"><div><div class="empty-icon">✎</div>第一条记录，会成为你的起点</div></div>`;return[...state.exams].reverse().slice(0,4).map((e,i)=>`<div class="exam-item clickable" data-edit="${e.id}"><div class="exam-dot">${i+1}</div><div class="exam-info"><b>${esc(e.name)}</b><span>${fmtYear(e.exam_date)}</span></div><div class="exam-score">${totalFor(e,'actual')??'待补录'}</div></div>`).join('')}
function chartHtml(){
  if(!state.exams.length)return`<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>`;
  const pts=state.exams.map(e=>({name:e.name,date:e.exam_date,actual:state.subject==='总分'?totalFor(e,'actual'):num(e.scores?.[state.subject]?.actual),target:state.subject==='总分'?totalFor(e,'target'):num(e.scores?.[state.subject]?.target)}));
  const vals=pts.flatMap(p=>[p.actual,p.target]).filter(v=>v!==null);if(!vals.length)return`<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>`;
  let max=Math.max(...vals),min=Math.min(...vals),pad=Math.max(10,(max-min)*.18);max=Math.ceil((max+pad)/10)*10;min=Math.max(0,Math.floor((min-pad)/10)*10);if(max===min)max=min+100;
  const W=760,H=300,L=46,R=18,T=20,B=46,cw=W-L-R,ch=H-T-B,x=i=>pts.length===1?L+cw/2:L+i/(pts.length-1)*cw,y=v=>T+(max-v)/(max-min)*ch;
  let grid='';for(let i=0;i<=5;i++){const v=max-(max-min)*i/5,yy=T+ch*i/5;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`}
  const line=(key,color,dash='')=>{let d='',on=false,c='';pts.forEach((p,i)=>{const v=p[key];if(v===null){on=false;return}const xx=x(i),yy=y(v);d+=`${on?'L':'M'} ${xx} ${yy} `;on=true;c+=`<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="${color}" stroke-width="3" data-tip="${esc(p.name)} · ${key==='actual'?'真实':'目标'} ${v}"/>`});return`<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${dash?`stroke-dasharray="${dash}"`:''}/>${c}`};
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${line('target','#32a77a','7 7')}${line('actual','#5d72e8')}${pts.map((p,i)=>`<text x="${x(i)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(p.date)}</text>`).join('')}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

function recordsHtml(){return`<div class="page-head"><div><h2>考试记录</h2><p>按时间整理目标成绩与真实成绩，任何时候都可以回来补录。</p></div><button class="primary" id="addExam">＋ 新建</button></div><div class="card records-card">${state.exams.length?state.exams.map(recordHtml).join(''):`<div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div>`}</div>`}
function recordHtml(e){const a=totalFor(e,'actual'),t=totalFor(e,'target');return`<div class="record"><div class="record-date">${fmtYear(e.exam_date)}<b>${esc(e.name)}</b></div><div class="record-scores">${SUBJECTS.map(s=>{const av=num(e.scores?.[s]?.actual),tv=num(e.scores?.[s]?.target);return av===null&&tv===null?'':`<span class="score-tag">${s} ${av??'—'}<span style="color:#a1a9b5"> / ${tv??'—'}</span></span>`}).join('')||'<span class="score-tag">尚未填写分数</span>'}<span class="score-tag"><b>总分 ${a??'—'}</b> / 目标 ${t??'—'}</span></div><div class="record-actions"><button class="icon-btn" data-edit="${e.id}" title="编辑">✎</button><button class="icon-btn danger" data-delete="${e.id}" title="删除">⌫</button></div></div>`}
function accountHtml(){return`<div class="page-head"><div><h2>账号</h2><p>这个账号让你的成绩记录可以一直保存在云端。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><p class="card-sub">用户名可以用于以后重新登录</p><div class="account-chip"><code>${esc(state.user?.username||'')}</code><button class="copy-btn" data-copy="${esc(state.user?.username||'')}">复制</button></div><div class="info-box" style="margin-top:15px"><b>ⓘ 关于密码</b><br>密码只在账号创建时展示一次，服务器只保存加密摘要。</div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">所有考试与成绩都保存在 Supabase 中，并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div>`}

function bindPage(){
  $$('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});
  $('#addExamHome')?.addEventListener('click',()=>openExam());$('#addExam')?.addEventListener('click',()=>openExam());$('#emptyAdd')?.addEventListener('click',()=>openExam());
  $$('[data-edit]').forEach(b=>b.onclick=()=>openExam(state.exams.find(e=>e.id===b.dataset.edit)));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteExam(b.dataset.delete));
  $$('[data-subject]').forEach(b=>b.onclick=()=>{state.subject=b.dataset.subject;renderPage()});
  $$('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);toast('已复制')}catch{toast('复制失败，请手动选择')}});
  $('#logoutBtn')?.addEventListener('click',logout);
  const chart=$('#chart');if(chart)$$('[data-tip]',chart).forEach(p=>{const show=()=>{const tip=$('#chartTip'),rect=chart.getBoundingClientRect(),cr=p.getBoundingClientRect();tip.textContent=p.dataset.tip;tip.style.display='block';tip.style.left=`${cr.left-rect.left+cr.width/2}px`;tip.style.top=`${cr.top-rect.top}px`};p.addEventListener('mouseenter',show);p.addEventListener('click',show);p.addEventListener('mouseleave',()=>{$('#chartTip').style.display='none'})});
}

function openExam(exam=null){
  const today=new Date().toISOString().slice(0,10),scores=exam?.scores||{},modal=document.createElement('div');modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${exam?'编辑考试':'记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${esc(exam?.name||'')}" placeholder="例如：高二上学期期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div></div><div class="score-table"><div class="score-row header"><span>科目</span><span>目标成绩</span><span>真实成绩</span><span>满分</span></div>${SUBJECTS.map(s=>`<div class="score-row" data-score-row="${s}"><span class="subject-name">${s}</span><input inputmode="decimal" class="target-input" placeholder="目标" value="${scores[s]?.target??''}"><input inputmode="decimal" class="actual-input" placeholder="考后补录" value="${scores[s]?.actual??''}"><input inputmode="decimal" class="max-input" value="${scores[s]?.max??MAX_SCORE[s]}"></div>`).join('')}</div><p class="form-note">语文、数学、英语默认满分150；物理、化学、生物、历史、地理、政治默认100。满分仍可按具体考试修改。未填写的科目不会计入总分。</p><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${exam?'保存修改':'保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);const close=()=>modal.remove();$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
}
async function saveExam(id,modal){
  const exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,scores:{}};let invalid='';
  $$('[data-score-row]',modal).forEach(r=>{const s=r.dataset.scoreRow,target=$('.target-input',r).value,actual=$('.actual-input',r).value,max=$('.max-input',r).value||MAX_SCORE[s];exam.scores[s]={target,actual,max};const m=Number(max),t=num(target),a=num(actual);if(!Number.isFinite(m)||m<=0)invalid=`${s}满分不正确`;else if(t!==null&&(t<0||t>m))invalid=`${s}目标成绩不能超过满分`;else if(a!==null&&(a<0||a>m))invalid=`${s}真实成绩不能超过满分`});
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');if(invalid)return toast(invalid);
  const b=$('.save-btn',modal);b.disabled=true;b.textContent='保存中…';try{await api('save_exam',{exam});await loadExams();modal.remove();render();toast(id?'已保存修改':'考试已记录')}catch(e){toast(e.message);b.disabled=false;b.textContent=id?'保存修改':'保存考试'}
}
async function deleteExam(id){const e=state.exams.find(x=>x.id===id);if(!confirm(`确定删除「${e?.name||'这次考试'}」？`))return;try{await api('delete_exam',{examId:id});await loadExams();render();toast('已删除')}catch(err){toast(err.message)}}

function showOnboarding(){
  const d=state.onboarding,m=document.createElement('div');m.className='modal-backdrop';m.innerHTML=`<div class="modal onboard"><div class="big-icon">✓</div><h2>账号已经准备好了</h2><p>以后换手机或清除浏览器数据时，可以用下面的用户名和密码重新登录。</p><div class="credential"><small>用户名</small><div class="credential-row"><code>${esc(d.username)}</code><button class="copy-btn" data-copy="${esc(d.username)}">复制</button></div></div><div class="credential"><small>密码</small><div class="credential-row"><code>${esc(d.password)}</code><button class="copy-btn" data-copy="${esc(d.password)}">复制</button></div></div><div class="save-warning"><span class="i">i</span><div><b>请现在截图保存。</b><br>密码关闭此窗口后不会再次显示，服务器也无法取回原密码。</div></div><button class="primary full" id="savedBtn">我已截图保存，开始记录</button></div>`;document.body.appendChild(m);$$('[data-copy]',m).forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.dataset.copy);toast('已复制')});$('#savedBtn',m).onclick=()=>{state.onboarding=null;m.remove()};
}
async function logout(){if(!confirm('确定退出登录？请确认你已经保存好用户名和密码。'))return;try{await api('logout')}catch{}localStorage.removeItem('st_token');state.token='';state.user=null;renderLogin()}
init();
