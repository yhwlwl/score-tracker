// v18 / product v1.1: score modules, subtle Study Planner cross-link, optional ranking stays optional.
state.modulesV18 = state.modulesV18 || [];

var MODULE_API_V18='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-modules-api';
var STUDY_PLANNER_URL_V18='https://study-planner.yhwlwl.xyz/?utm_source=score-tracker&utm_campaign=tool-crosslink';
var STUDY_PLANNER_PROMO_V18='./study-planner-promo.webp';

(function injectV18Styles(){
  if(document.getElementById('app-v18-style'))return;
  var style=document.createElement('style');style.id='app-v18-style';style.textContent=`
    .module-settings-v18{margin-top:18px;padding:22px}
    .module-settings-head-v18{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .module-chips-v18{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .module-chip-v18{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:11px;color:#596474}
    .module-chip-v18 b{color:var(--text)}
    .module-badge-v18{font-size:9px;border:1px solid #d9e3f3;background:#f4f7fb;color:#6b7890;border-radius:999px;padding:2px 6px}
    .module-manager-list-v18{display:grid;gap:12px;margin-top:12px}
    .module-editor-v18{border:1px solid var(--line);border-radius:16px;padding:13px;background:#fbfcfe}
    .module-editor-head-v18{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .module-editor-head-v18 input{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;background:#fff;outline:none;font-weight:700}
    .module-editor-head-v18 input[readonly]{background:#f5f7fa;color:#4d596b}
    .module-delete-v18{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:10px;padding:8px 10px}
    .module-subjects-v18{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .module-subject-v18{border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;padding:7px 9px;font-size:11px}
    .module-subject-v18.active{background:var(--text);border-color:var(--text);color:#fff}
    .module-subject-v18.locked{background:#eef1f5;color:#5c6675;border-color:#dfe4eb;cursor:default}
    .module-editor-note-v18{font-size:10px;color:var(--muted);line-height:1.55;margin-top:8px}
    .module-manager-actions-v18{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}
    .record-module-summary-v18{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .record-module-summary-v18 .module-chip-v18{background:#fbfcff}
    .study-tool-v18{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:16px;align-items:stretch;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:20px;background:linear-gradient(135deg,#fbfcff,#f7f9fc);padding:16px;margin:0 0 18px;overflow:hidden;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    .study-tool-v18:hover{transform:translateY(-1px);border-color:#cfd7e6;box-shadow:0 10px 28px #25304a0d}
    .study-tool-copy-v18{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:3px 2px}
    .study-tool-kicker-v18{font-size:10px;font-weight:800;letter-spacing:.08em;color:#7b8798;text-transform:uppercase}
    .study-tool-v18 h3{font-size:16px;margin:6px 0 5px;color:var(--text)}
    .study-tool-v18 p{font-size:12px;line-height:1.65;color:var(--muted);margin:0;max-width:520px}
    .study-tool-open-v18{margin-top:10px;font-size:11px;font-weight:700;color:#586781}
    .study-tool-thumb-v18{height:116px;border-radius:14px;overflow:hidden;border:1px solid #e5e9f0;background:#fff}
    .study-tool-thumb-v18 img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;display:block;filter:saturate(.78) contrast(.96)}
    @media(max-width:620px){
      .module-settings-v18{padding:18px 16px}.module-settings-head-v18{display:block}.module-settings-head-v18 button{margin-top:10px}
      .study-tool-v18{grid-template-columns:minmax(0,1fr) 96px;gap:10px;padding:13px;border-radius:17px;margin-bottom:14px}
      .study-tool-v18 h3{font-size:14px}.study-tool-v18 p{font-size:11px;line-height:1.55}.study-tool-open-v18{margin-top:7px}
      .study-tool-thumb-v18{height:104px;border-radius:12px}
    }
  `;document.head.appendChild(style);
})();

async function modulesApiV18(action,payload={}){
  var res=await fetch(MODULE_API_V18,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,token:state.token,...payload})});
  var data=await res.json().catch(function(){return{error:'网络响应异常'}});
  if(!res.ok)throw new Error(data.error||'模块设置请求失败');
  return data;
}
async function loadModulesV18(){
  try{var data=await modulesApiV18('list_modules');state.modulesV18=data.modules||[];}
  catch(e){console.warn('module settings unavailable',e);state.modulesV18=state.modulesV18||[];}
}
function moduleNamesV18(){return new Set((state.modulesV18||[]).map(function(m){return m.name}));}
function moduleByNameV18(name){return(state.modulesV18||[]).find(function(m){return m.name===name})||null;}
function moduleSubjectOptionsV18(){
  var moduleNames=moduleNamesV18(),out=[],seen=new Set();
  function add(name){name=String(name||'').trim();if(!name||moduleNames.has(name)||seen.has(name))return;seen.add(name);out.push(name);}
  (state.subjectConfigs||[]).forEach(function(x){add(x.name)});
  (state.allExams||[]).forEach(function(exam){Object.keys(exam.scores||{}).forEach(add)});
  ['语文','数学','英语','物理','历史','化学','生物','政治','地理'].forEach(add);
  return out;
}
function appendModulesV18(){
  (state.modulesV18||[]).forEach(function(m){
    if(!m||!m.name)return;
    if(!SUBJECTS.includes(m.name))SUBJECTS.push(m.name);
    SUBJECT_SHORT[m.name]=m.name.length<=4?m.name:('模'+((state.modulesV18||[]).indexOf(m)+1));
  });
  if(!['总览','总分',...SUBJECTS].includes(state.subject))state.subject='总分';
}
if(typeof applyExamSubjectsV10==='function'){
  var applyExamSubjectsBeforeV18=applyExamSubjectsV10;
  applyExamSubjectsV10=function applyExamSubjectsV18(exams,templates){applyExamSubjectsBeforeV18(exams,templates);appendModulesV18();};
}
var loadExamsBeforeV18=loadExams;
loadExams=async function loadExamsV18(){await loadExamsBeforeV18();await loadModulesV18();if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);else appendModulesV18();};

function moduleCompleteSumV18(exam,module,key,reader){
  if(!module||!Array.isArray(module.subjects)||module.subjects.length<2)return null;
  var sum=0;
  for(var i=0;i<module.subjects.length;i++){var v=reader(exam,module.subjects[i],key);if(v===null||v===undefined||Number.isNaN(Number(v)))return null;sum+=Number(v);}
  return Math.round(sum*100)/100;
}
var examScoreBeforeV18=examScore;
examScore=function examScoreV18(exam,subject,key){
  var direct=examScoreBeforeV18(exam,subject,key);if(direct!==null)return direct;
  var module=moduleByNameV18(subject);if(!module)return direct;
  return moduleCompleteSumV18(exam,module,key,function(e,s,k){return examScoreBeforeV18(e,s,k);});
};
var examMaxBeforeV18=examMax;
examMax=function examMaxV18(exam,subject){
  var module=moduleByNameV18(subject);if(!module)return examMaxBeforeV18(exam,subject);
  var explicit=num(exam?.scores?.[subject]?.max);if(explicit!==null)return explicit;
  var sum=0;for(var i=0;i<module.subjects.length;i++){var v=examMaxBeforeV18(exam,module.subjects[i]);if(v===null||!Number.isFinite(Number(v)))return null;sum+=Number(v);}return sum;
};
if(typeof examRawScoreV13==='function'){
  var examRawScoreBeforeV18=examRawScoreV13;
  examRawScoreV13=function examRawScoreV18(exam,subject){
    var direct=examRawScoreBeforeV18(exam,subject);if(direct!==null)return direct;
    var module=moduleByNameV18(subject);if(!module)return direct;
    return moduleCompleteSumV18(exam,module,'raw',function(e,s){return examRawScoreBeforeV18(e,s);});
  };
}
if(typeof rawMaxV14==='function'){
  var rawMaxBeforeV18=rawMaxV14;
  rawMaxV14=function rawMaxV18(exam,subject){
    var module=moduleByNameV18(subject);if(!module)return rawMaxBeforeV18(exam,subject);
    var explicit=num(exam?.scores?.[subject]?.rawMax);if(explicit!==null)return explicit;
    var sum=0;for(var i=0;i<module.subjects.length;i++){var v=rawMaxBeforeV18(exam,module.subjects[i]);if(v===null||!Number.isFinite(Number(v)))return null;sum+=Number(v);}return sum;
  };
}
if(typeof totalSubjectsV17==='function'){
  var totalSubjectsBeforeV18=totalSubjectsV17;
  totalSubjectsV17=function totalSubjectsV18(exam){var names=moduleNamesV18();return totalSubjectsBeforeV18(exam).filter(function(name){return !names.has(name)});};
}

function moduleCardHtmlV18(){
  if(!(state.modulesV18||[]).length)return'';
  return `<div class="card module-settings-v18"><div class="module-settings-head-v18"><div><h3 class="card-title">成绩模块</h3><p class="card-sub">自动汇总常用组合，不重复计入总分。内置语数外、四科和六科，也可以新增自己的模块。</p></div><button class="secondary" id="manageModulesV18">设置</button></div><div class="module-chips-v18">${state.modulesV18.map(function(m){return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b>${m.isBuiltin?'<span class="module-badge-v18">内置</span>':''} · ${(m.subjects||[]).map(escapeHtml).join(' / ')}</span>`}).join('')}</div></div>`;
}
var accountHtmlBeforeV18=accountHtml;
accountHtml=function accountHtmlV18(){return accountHtmlBeforeV18()+moduleCardHtmlV18();};

function normalizeBuiltinV18(module){
  var core=['语文','数学','英语'],subjects=[...(module.subjects||[])],extras=subjects.filter(function(s){return !core.includes(s)});
  if(module.name==='语数外')return core;
  if(module.name==='语数外 + 首选科')return core.concat(extras.slice(0,1));
  if(module.name==='语数外 + 所选科')return core.concat(extras.slice(0,3));
  return subjects;
}
function openModuleManagerV18(){
  var options=moduleSubjectOptionsV18(),draft=(state.modulesV18||[]).map(function(m){return{id:m.id,name:m.name,subjects:[...(m.subjects||[])],isBuiltin:!!m.isBuiltin}});
  var modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>成绩模块设置</h3><button class="close-btn">×</button></div><div class="modal-body"><p class="form-note">模块只做汇总展示，不会再次加入总分。内置四科请选择物理或历史之一；六科请选择 3 门选科。</p><div class="module-manager-list-v18" id="moduleListV18"></div><div class="module-manager-actions-v18"><button class="secondary" id="addModuleV18">＋ 自定义模块</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveModulesV18">保存</button></div></div></div></div>`;document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('moduleListV18');
  function syncNames(){list.querySelectorAll('.module-editor-v18').forEach(function(card,i){var input=card.querySelector('.module-name-v18');if(input&&!draft[i].isBuiltin)draft[i].name=input.value.trim();});}
  function toggleSubject(index,name){
    var m=draft[index],core=['语文','数学','英语'];
    if(m.isBuiltin&&core.includes(name))return;
    var has=m.subjects.includes(name);
    if(m.name==='语数外')return;
    if(m.name==='语数外 + 首选科'){
      if(has)m.subjects=core.slice();else m.subjects=core.concat([name]);
    }else if(m.name==='语数外 + 所选科'){
      var extras=m.subjects.filter(function(s){return !core.includes(s)});
      if(has)extras=extras.filter(function(s){return s!==name});else{if(extras.length>=3)return toast('六科模块最多选择 3 门选科');extras.push(name);}m.subjects=core.concat(extras);
    }else{if(has)m.subjects=m.subjects.filter(function(s){return s!==name});else m.subjects.push(name);}
    renderRows();
  }
  function renderRows(){
    list.innerHTML=draft.map(function(m,i){m.subjects=normalizeBuiltinV18(m);var note=m.name==='语数外'?'固定汇总语文、数学、英语。':m.name==='语数外 + 首选科'?'语数外 + 物理/历史，四科。':m.name==='语数外 + 所选科'?'语数外 + 3 门选科，六科。':'至少选择 2 个科目。';return `<div class="module-editor-v18" data-module-index="${i}"><div class="module-editor-head-v18"><input class="module-name-v18" maxlength="30" value="${escapeHtml(m.name||'')}" ${m.isBuiltin?'readonly':''} placeholder="模块名称">${m.isBuiltin?'<span class="module-badge-v18">内置</span>':`<button type="button" class="module-delete-v18">删除</button>`}</div><div class="module-subjects-v18">${options.map(function(name){var active=m.subjects.includes(name),locked=m.isBuiltin&&['语文','数学','英语'].includes(name);return `<button type="button" class="module-subject-v18 ${active?'active':''} ${locked?'locked':''}" data-module-subject="${escapeHtml(name)}">${escapeHtml(name)}</button>`}).join('')}</div><div class="module-editor-note-v18">${note}</div></div>`}).join('');
    list.querySelectorAll('.module-editor-v18').forEach(function(card,index){
      card.querySelectorAll('[data-module-subject]').forEach(function(button){button.onclick=function(){syncNames();toggleSubject(index,button.dataset.moduleSubject)}});
      var del=card.querySelector('.module-delete-v18');if(del)del.onclick=function(){syncNames();draft.splice(index,1);renderRows();};
    });
  }
  renderRows();
  function close(){modal.remove();state.modal=null;}
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;modal.onclick=function(e){if(e.target===modal)close()};
  document.getElementById('addModuleV18').onclick=function(){syncNames();if(draft.length>=12)return toast('最多 12 个模块');draft.push({id:null,name:'',subjects:[],isBuiltin:false});renderRows();list.querySelector('.module-editor-v18:last-child .module-name-v18')?.focus();};
  document.getElementById('saveModulesV18').onclick=async function(){
    syncNames();var names=new Set();
    for(var i=0;i<draft.length;i++){var m=draft[i];m.subjects=normalizeBuiltinV18(m);if(!m.name)return toast('请填写模块名称');if(names.has(m.name))return toast('模块名称不能重复');names.add(m.name);if(m.name==='语数外'&&m.subjects.length!==3)return toast('语数外模块应为 3 科');if(m.name==='语数外 + 首选科'&&m.subjects.length!==4)return toast('四科模块请选择物理或历史之一');if(m.name==='语数外 + 所选科'&&m.subjects.length!==6)return toast('六科模块请选择 3 门选科');if(!m.isBuiltin&&m.subjects.length<2)return toast(`模块「${m.name}」至少选择 2 个科目`);}
    var button=document.getElementById('saveModulesV18');button.disabled=true;button.textContent='保存中…';
    try{var data=await modulesApiV18('save_modules',{modules:draft});state.modulesV18=data.modules||[];if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);close();render();toast('模块设置已保存');}
    catch(e){toast(e.message);button.disabled=false;button.textContent='保存';}
  };
}

function moduleSummaryV18(exam){
  var items=(state.modulesV18||[]).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target');
    if(final===null&&raw===null&&target===null)return'';
    var max=examMax(exam,m.name),parts=[];if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));if(target!==null)parts.push('目标 '+formatScore(target));
    return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' · ')}</span>`;
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
}
var recordHtmlBeforeV18=recordHtml;
recordHtml=function recordHtmlV18(exam){var html=recordHtmlBeforeV18(exam),summary=moduleSummaryV18(exam);return summary?html.replace('<div class="record-actions record-actions-v10">',summary+'<div class="record-actions record-actions-v10">'):html;};

function studyPlannerCardV18(){
  return `<a class="study-tool-v18" id="studyPlannerToolV18" href="${STUDY_PLANNER_URL_V18}" target="_blank" rel="noopener noreferrer"><div class="study-tool-copy-v18"><span class="study-tool-kicker-v18">另一个学习工具</span><h3>Study Planner · 自动学习规划</h3><p>把目标、任务和可用时间交给它，自动排进日历。适合和成绩轨迹一起用：这里看结果，那里安排下一步。</p><span class="study-tool-open-v18">打开学习规划器 ↗</span></div><div class="study-tool-thumb-v18"><img src="${STUDY_PLANNER_PROMO_V18}" alt="Study Planner 月视图"></div></a>`;
}
var homeHtmlBeforeV18=homeHtml;
homeHtml=function homeHtmlV18(){
  var html=homeHtmlBeforeV18(),card=studyPlannerCardV18();
  if(html.includes('<section class="grid-main">'))return html.replace('<section class="grid-main">',card+'<section class="grid-main">');
  return card+html;
};

function uuidV18(){try{return crypto.randomUUID()}catch(e){return 'v18-'+Date.now()+'-'+Math.random().toString(16).slice(2)}}
function trackStudyPlannerV18(){
  var context={eventId:uuidV18(),sessionId:sessionStorage.getItem('st_session_id')||'',visitorId:localStorage.getItem('st_visitor_id')||'',clientTime:new Date().toISOString(),pathname:location.pathname,appPage:'home',referrerOrigin:document.referrer||'',firstReferrer:localStorage.getItem('st_first_referrer')||'',utmSource:localStorage.getItem('st_utm_source')||'',utmCampaign:localStorage.getItem('st_utm_campaign')||'',userAgent:navigator.userAgent,browserLanguage:navigator.language,clientTimezone:(Intl.DateTimeFormat().resolvedOptions().timeZone||''),screenWidth:screen.width,screenHeight:screen.height,viewportWidth:innerWidth,viewportHeight:innerHeight,isPwa:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,appVersion:'v1.1'};
  fetch('https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({action:'track_event',token:state.token||'',eventType:'study_planner_opened',context:context,metadata:{source:'home_tool_card',destination:'https://study-planner.yhwlwl.xyz/'}})}).catch(function(){});
}
var bindPageBeforeV18=bindPage;
bindPage=function bindPageV18(){
  bindPageBeforeV18();
  var manage=document.getElementById('manageModulesV18');if(manage)manage.onclick=openModuleManagerV18;
  var tool=document.getElementById('studyPlannerToolV18');if(tool)tool.addEventListener('click',trackStudyPlannerV18,{capture:true});
};
