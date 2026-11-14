/* One paper workspace: upload, check questions, then read related reports. */
(function () {
  'use strict';
  var esc = function (s) { return escapeHtml(String(s == null ? '' : s)); };
  var names = { strengths: '找出做得好的地方', difficulty: '看懂试卷难在哪里', causes: '分析为什么丢分', solutions: '讲清关键解题步骤', practice: '生成针对性练习', patterns: '找出多道题的共同特点', plan: '安排接下来的复习' };
  var labels = { running: '分析中', paused: '可继续', succeeded: '已完成', failed: '待恢复', draft: '资料草稿' };
  var ctx, root, generation = 0, rows = [], drafts = [], more = false, origin = null, seed = null, selection = null, activeEditor = null, pendingAnalysis = null, paper = null, requestVersion = 0;
  function leaveEditor() { if (activeEditor && activeEditor.canLeave && !activeEditor.canLeave()) return false; if (activeEditor && activeEditor.dispose) activeEditor.dispose(); activeEditor = null; return true; }
  var filters = { subject: '', exam_id: '', status: '', search: '' };
  function user() { return String(state.user && state.user.id || ''); }
  function context() { return { user: user(), token: state.token }; }
  function api(action, body) { return window.ScorePaperReview.api(ctx, action, body); }
  function button(label, action, primary) { return '<button type="button" class="pr-button ' + (primary ? 'pr-primary' : '') + '" data-hub="' + action + '">' + label + '</button>'; }
  function exams() { return state.exams || []; }
  function examName(id) { var e = exams().find(function (e) { return e.id === id; }); return e ? e.name : id ? '已关联考试' : '未关联考试'; }
  function examOptions(id, subject) { return '<option value="">暂不关联考试</option>' + exams().filter(function (e) { return !subject || e.scores && e.scores[subject]; }).map(function (e) { return '<option value="' + esc(e.id) + '" ' + (id === e.id ? 'selected' : '') + '>' + esc(e.name + ' · ' + e.exam_date) + '</option>'; }).join(''); }
  function subjects() { return Array.from(new Set(['语文','数学','英语','物理','化学','生物','政治','历史','地理'].concat(exams().flatMap(function (e) { return Object.keys(e.scores || {}); }), rows.map(function (r) { return r.subject; })))); }
  function navigation() {
    var selected = state.analysisTab === 'ai' ? 'papers' : state.analysisTab || 'stats', labels = { stats:'成绩分析', types:'题型分析', papers:'试卷复盘' };
    return '<nav class="ph-tabs" aria-label="分析分类">' + Object.keys(labels).map(function(k){return '<button type="button" aria-pressed="'+(selected===k)+'" data-analysis-tab="'+k+'">'+labels[k]+'</button>';}).join('') + '</nav>';
  }
  function tabs(node) { if (node) node.insertAdjacentHTML('afterbegin', navigation()); }
  document.addEventListener('click', function(e) {
    var b=e.target.closest('[data-analysis-tab]'); if(!b || !leaveEditor())return;
    state.analysisTab=b.dataset.analysisTab; selection=null; seed=null; renderPage();
  });
  function analyzeRecord(row) {
    if (!leaveEditor()) return;
    state.analysisTab='papers'; selection=null; shell();root.querySelector('.ph-header').hidden=true;
    body().innerHTML = paperNavigation('reports') + '<div class="ph-analysis-setup"></div>';
    window.ScorePaperRecords.configure(body().querySelector('.ph-analysis-setup'), row, { api:api,
      user:ctx.user, open:async function(id){await open(id);},
      started:async function(id){await open(id);} });
    window.scrollTo(0,0);
  }
  function note(s) { var el = root && root.querySelector('.ph-message'); if (el) el.textContent = s || ''; }
  function shell() {
    root.innerHTML = '<div class="ph-workspace"><header class="ph-header"><div><span class="pr-eyebrow">学习复盘</span><h1>' + '试卷复盘' + '</h1><p>' + '上传试卷，核对得分，查看题型表现和 AI 分析。' + '</p></div><div>' + (origin && origin.modal.isConnected ? button('返回正在编辑的考试', 'return') : '') + button('上传试卷', 'new', true) + '</div></header><div class="ph-message" role="status" aria-live="polite"></div><div class="ph-body"></div></div>';
    tabs(root.firstElementChild);
    root.querySelector('.ph-workspace').onclick = async function (e) {
      var b = e.target.closest('[data-hub]'); if (!b) return;
      try {
        if (/^(new|list|return|open:|draft:|paper-)/.test(b.dataset.hub) && !leaveEditor()) return;
        if (b.dataset.hub === 'new') { selection = null; seed = null; state.analysisTab='papers'; shell(); await create(); }
        else if (b.dataset.hub === 'list') { paper=null; await list(); }
        else if (b.dataset.hub === 'paper-record' && paper && paper.record) await open(paper.record.request_id);
        else if (b.dataset.hub === 'paper-reports' && paper) showReports();
        else if (b.dataset.hub === 'paper-more-reports' && paper) await moreReports();
        else if (b.dataset.hub === 'paper-analyze' && paper && paper.record) analyzeRecord(paper.record);
        else if (b.dataset.hub === 'more') await list(true);
        else if (b.dataset.hub === 'return') { origin.modal.style.display = ''; state.page = origin.previousPage || 'exams'; state.analysisTab = 'ai'; renderPage(); }
        else if (b.dataset.hub.startsWith('open:')) await open(b.dataset.hub.slice(5));
        else if (b.dataset.hub.startsWith('draft:')) await create(drafts.find(function (r) { return r.request_id === b.dataset.hub.slice(6); }));
        else if (b.dataset.hub.startsWith('delete-draft:') && confirm('删除这份资料草稿及扫描件？')) { b.disabled = true; await api('delete_draft', { request_id: b.dataset.hub.slice(13) }); await list(); }
      } catch (err) { note(err.message); } finally { if (b.isConnected) b.disabled = false; }
    };
  }
  function body() { return root.querySelector('.ph-body'); }
  function sourceId(r) { return r.source_record && r.source_record.request_id || r.result && r.result.source_record && r.result.source_record.request_id || r.request_id; }
  function isRecord(r) { return r.options && r.options.purpose === 'record'; }
  function renderCards() {
    var host = root.querySelector('.ph-list'); if (!host) return;
    var groups = new Map();
    drafts.forEach(function(d){if((!filters.subject || d.subject===filters.subject)&&(!filters.exam_id || d.exam_id===filters.exam_id))groups.set(d.request_id,{record:Object.assign({},d,{status:'draft'}),reports:[]});});
    rows.forEach(function(r){var id=sourceId(r),g=groups.get(id)||{record:null,reports:[]};if(isRecord(r))g.record=r;else if(!g.reports.some(function(a){return a.request_id===r.request_id;}))g.reports.push(r);groups.set(id,g);});
    var cards=Array.from(groups.values()).map(function(g){
      g.reports.sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at));});
      var latest=g.reports[0],r=g.record||latest;
      var current=latest && ['running','paused','failed'].includes(latest.status)?latest:r;
      var status=current.status==='draft'?'待识别':current.status==='running'?(isRecord(current)?'识别中':'分析中'):current.status==='paused'?'待继续':current.status==='failed'?'待恢复':latest?'分析已完成':'已录入';
      var target=current.status==='draft'?current.request_id:latest?latest.request_id:r.request_id;
      var action=current.status==='draft'?'继续上传':['running','paused','failed'].includes(current.status)?'查看进度 / 继续':latest?'查看报告':'核对试题';
      return {g:g,row:r,status:status,target:target,action:action,current:current};
    }).filter(function(c){return (!filters.status || c.current.status===filters.status) && (!filters.search || [c.row.title,c.row.subject,examName(c.row.exam_id)].join(' ').toLowerCase().includes(filters.search.toLowerCase()));});
    host.innerHTML = cards.length ? cards.map(function(c){var r=c.row;return '<article class="ph-card"><div class="ph-card-top"><span class="ph-subject">'+esc(r.subject)+'</span><span class="ph-status">'+esc(c.status)+'</span></div><h3>'+esc(r.title||examName(r.exam_id)+' · '+r.subject)+'</h3><p>'+esc(examName(r.exam_id))+'</p><small>'+esc(new Date(r.created_at).toLocaleString('zh-CN'))+(c.g.reports.length?' · '+c.g.reports.length+' 份已加载报告':'')+'</small>'+(c.current.progress && c.current.status!=='succeeded'?'<p class="ph-progress">'+esc(c.current.progress.message||'进度已保存')+'</p>':'')+'<footer>'+button(c.action,(c.current.status==='draft'?'draft:':'open:')+c.target,true)+(c.g.record && c.g.reports.length?button('试题与得分','open:'+c.g.record.request_id):'')+(r.status==='draft'?button('删除草稿','delete-draft:'+r.request_id):'')+'</footer></article>';}).join('') : '<div class="ph-empty"><h3>'+(filters.subject||filters.exam_id||filters.status||filters.search?'没有符合条件的试卷':'从一张试卷开始')+'</h3><p>上传试卷与作答，核对后可查看题型表现，也可以稍后再生成 AI 分析。</p>'+button('上传试卷','new',true)+'</div>';
    root.querySelector('.ph-more').innerHTML=more?button('加载更多试卷','more'):'';
  }
  async function list(append) {
    selection = null; seed = null; paper = null; root.querySelector('.ph-header').hidden=false;var version=++requestVersion;
    if (!append) {
      body().innerHTML = '<details class="ph-list-filters"><summary>筛选试卷</summary><div class="ph-filters"><label>科目<select data-filter="subject"><option value="">全部科目</option>' + subjects().map(function (s) { return '<option ' + (filters.subject === s ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label><label>考试<select data-filter="exam_id">' + examOptions(filters.exam_id).replace('暂不关联考试','全部考试') + '</select></label><label>状态<select data-filter="status"><option value="">全部状态</option>' + Object.keys(labels).filter(function (k) { return k !== 'draft'; }).map(function (k) { return '<option value="' + k + '" ' + (filters.status === k ? 'selected' : '') + '>' + labels[k] + '</option>'; }).join('') + '</select></label><label>搜索已加载记录<input data-search value="' + esc(filters.search) + '" placeholder="试卷名称、科目或考试"></label>' + button('刷新', 'list') + '</div></details><div class="ph-list" aria-live="polite">正在读取试卷…</div><div class="ph-more"></div>';
      body().querySelectorAll('[data-filter]').forEach(function (el) { el.onchange = function () { filters[el.dataset.filter] = el.value; list().catch(function (e) { note(e.message); }); }; });
      body().querySelector('[data-search]').oninput = function (e) { filters.search = e.target.value; renderCards(); };
    }
    var gen = generation; note('');
    try { var data = await api('list_all', Object.assign({}, filters, { offset: append ? rows.length : 0, status:'' })); if (gen !== generation || version!==requestVersion || !root.isConnected) return; rows = append ? rows.concat(data.reviews.filter(function(r){return !rows.some(function(old){return old.request_id===r.request_id;});})) : data.reviews; if (!append) drafts = data.drafts || []; more = data.has_more; renderCards(); }
    catch (e) { note(e.message); var el = root.querySelector('.ph-list'); if (el) el.innerHTML = '<p>记录读取未完成，请点击刷新重试。</p>'; }
  }
  function optionSelect(key, label, values, chosen) { return '<label>' + label + '<select name="' + key + '">' + Object.keys(values).map(function (k) { return '<option value="' + k + '" ' + (String(chosen) === k ? 'selected' : '') + '>' + values[k] + '</option>'; }).join('') + '</select></label>'; }
  function choice(name, value, title, description, selected, type) {
    return '<label class="ph-choice"><input type="' + (type || 'radio') + '" name="' + name + '" value="' + esc(value) + '" ' + (selected ? 'checked' : '') + '><span><strong>' + title + '</strong><small>' + description + '</small></span></label>';
  }
  function step(n, title, description) { return '<div class="ph-step"><span>' + n + '</span><div><h3>' + title + '</h3><p>' + description + '</p></div></div>'; }
  async function create(draft) {
    root.querySelector('.ph-header').hidden=true;
    var gen=generation, data=draft || seed || {}, opts=Object.assign({},data.options || {}), selectedSubject=data.subject || '';
    selection=null;
    body().innerHTML='<div class="ph-create"><div class="ph-section-title"><div><h2>'+(draft?'继续试题录入':'上传试卷')+'</h2><p>先上传并识别，核对后可保存题型得分，也可以生成 AI 分析。</p></div>'+button('返回试卷列表','list')+'</div><form class="ph-basics">'+step('01','录入哪张试卷','可以先录入，之后再关联考试。')+'<div class="ph-form-grid"><label>科目<input name="subject" list="ph-subjects" maxlength="40" required placeholder="请选择或输入科目" value="'+esc(selectedSubject)+'"><datalist id="ph-subjects">'+subjects().map(function(n){return '<option value="'+esc(n)+'">';}).join('')+'</datalist></label><label>关联考试<select name="exam_id">'+examOptions(data.exam_id || '',selectedSubject)+'</select></label></div><details class="ph-name"><summary>试卷名称 <span data-title-preview></span></summary><label>自定义名称<input name="title" maxlength="100" value="'+esc(data.title || '')+'" placeholder="按考试和科目自动命名"></label></details>'+(data.originDraft?'<p class="ph-hint">保存正在编辑的考试后，试题会自动关联。</p>':'')+'</form><div class="ph-editor ph-create-editor"></div></div>';
    var basics=body().querySelector('form'), c=Object.assign(context(),{host:body().querySelector('.ph-editor'),draftId:data.draft_id || window.ScorePaperReview.draftFor(user(),'hub'),sessions:{},setup:true,onClose:list});
    function update(){
      var subject=basics.elements.subject.value.trim();
      c.title=basics.elements.title.value.trim() || (basics.elements.exam_id.value?examName(basics.elements.exam_id.value)+' · ':'')+(subject || '试卷')+' · 试题';
      basics.querySelector('[data-title-preview]').textContent=c.title;
      c.options=Object.assign({},opts,{config_version:2,purpose:'record',modules:[],review_before_analysis:false,analysis_scope:'all',selected_questions:[],use_account_history:false});
      c.examId=basics.elements.exam_id.value;c.exam=exams().find(function(e){return e.id===c.examId;});c.examContext=undefined;
    }
    basics.onsubmit=function(e){e.preventDefault();};basics.oninput=update;
    basics.elements.subject.onchange=function(){var id=basics.elements.exam_id.value;basics.elements.exam_id.innerHTML=examOptions(id,basics.elements.subject.value.trim());update();};
    c.beforeSubmit=async function(){if(!basics.reportValidity())throw new Error('请先选择科目');update();return basics.elements.subject.value.trim();};
    c.onUpload=function(){update();};c.onAnalyzeRecord=analyzeRecord;c.onRecorded=function(row){open(row.request_id).catch(function(e){note(e.message);});};
    c.onView=function(view){basics.hidden=view!=='upload';body().querySelector('.ph-section-title').hidden=view!=='upload';c.host.classList.toggle('ph-creating',view==='upload');};
    if(draft && !data.pages){
      note('正在恢复已保存的扫描件…');var source=await api('sources',{request_id:draft.request_id});
      data.pages=await Promise.all(source.pages.map(async function(p){var response=await fetch(p.url);if(!response.ok)throw new Error('扫描件读取失败，请重试');var prepared=await window.ScorePaperReview.prepare(await response.blob());return Object.assign(prepared,{role:p.role,name:'第'+p.page+'页'});}));
    }
    if(gen!==generation)return;
    if(data.pages)c.sessions[selectedSubject]={pages:data.pages,workOnPaper:data.workOnPaper!==undefined?data.workOnPaper:opts.work_location!=='none'&&opts.work_location!=='separate',workLocation:opts.work_location,consent:false,pending:null,cloudDraftId:draft&&draft.request_id};
    activeEditor=c;update();note('');window.ScorePaperReview.mount(c,selectedSubject,null);
  }
  function mount(data, reportId) {
    root.querySelector('.ph-header').hidden=true;
    selection = { data: data, reportId: reportId }; seed = null; note('');
    body().innerHTML = paperNavigation(data.options && data.options.purpose==='record'?'record':'reports') + '<div class="ph-editor-toolbar"><span>' + esc(data.title || data.subject + '试卷') + ' · ' + esc(examName(data.exam_id)) + '</span>' + (reportId ? button('关联考试 / 名称', 'link') : '<span class="pr-muted">每轮 ' + data.options.time_budget_minutes + ' 分钟 · ' + (data.options.purpose === 'record' ? '只录入' : data.options.modules.length + ' 项分析')) + '</div><div class="ph-editor"></div>';
    var host = body().querySelector('.ph-editor'), exam = exams().find(function (e) { return e.id === data.exam_id; });
    var c = Object.assign(context(), { host: host, exam: exam, examId: data.exam_id || '', draftId: data.draft_id, sessions: {}, title: data.title, options: data.options, examContext: data.examContext, initialReport: reportId, onClose: list });
    if (data.pages) c.sessions[data.subject] = { pages: data.pages, workOnPaper: true, consent: false, pending: null };
    if (data.request_id) c.sessions[data.subject].cloudDraftId = data.request_id;
    c.onAnalyzeRecord = analyzeRecord;
    c.onRecordChange=function(row){if(paper && paper.record && paper.record.request_id===row.request_id)paper.record=row;};
    activeEditor = c;
    window.ScorePaperReview.mount(c, data.subject, null);
    var link = body().querySelector('[data-hub=link]'); if (link) link.onclick = function () {
      if(activeEditor && activeEditor.canLeave && !activeEditor.canLeave())return;
      var panel = document.createElement('form'); panel.className = 'ph-link-form'; panel.innerHTML = '<label>报告名称<input name="title" maxlength="100" value="' + esc(data.title || '') + '"></label><label>关联到考试<select name="exam">' + examOptions(data.exam_id, data.subject) + '</select></label><p class="pr-muted">关联用于整理记录；报告保留开始分析时的考试数值。</p><button class="pr-button pr-primary" type="submit">保存关联</button>';
      link.replaceWith(panel); panel.onsubmit = async function (e) { e.preventDefault(); try { await api('link', { request_id: reportId, exam_id: panel.elements.exam.value || null, title: panel.elements.title.value }); await open(reportId); note('关联已保存'); } catch (err) { note(err.message); } };
    };
  }
  function paperNavigation(active) {
    if(!paper)return '';
    return '<div class="ph-paper-bar">'+button('所有试卷','list')+'<nav aria-label="本份试卷">'+(paper.record?'<button type="button" class="pr-button" aria-pressed="'+(active==='record')+'" data-hub="paper-record">试题与得分</button>':'')+'<button type="button" class="pr-button" aria-pressed="'+(active==='reports')+'" data-hub="paper-reports">AI 分析'+(paper.reports.length?' · '+paper.reports.length:'')+'</button></nav></div>';
  }
  function showReports() {
    selection=null;
    body().innerHTML=paperNavigation('reports')+'<section class="ph-report-list"><h2>这份试卷的 AI 分析</h2><p class="pr-muted">使用已保存的题目生成报告，不必重新上传或识别。</p>'+(paper.record && paper.record.status==='succeeded'?button(paper.reports.length?'重新生成分析 · 消耗 1 次':'生成 AI 分析 · 消耗 1 次','paper-analyze',true):'')+(!paper.record?'<p class="pr-muted">原始录入已移除，仍可查看已保存的报告。</p>':'')+'<div class="ph-list">'+(paper.reports.length?paper.reports.map(function(r){return '<article class="ph-card"><span class="ph-status">'+esc(labels[r.status])+'</span><h3>'+esc(r.title||r.subject+' · AI 分析')+'</h3><p>'+esc(new Date(r.created_at).toLocaleString('zh-CN'))+'</p>'+button(r.status==='succeeded'?'查看报告':'查看进度 / 继续','open:'+r.request_id,true)+'</article>';}).join(''):'<p>还没有分析报告。试题已保存，可以现在分析，也可以稍后继续。</p>')+'</div>'+(paper.more?button('加载更多报告','paper-more-reports'):'')+'</section>';
  }
  async function moreReports(){var current=paper,version=++requestVersion;var data=await api('list_all',{source_request_id:current.id,offset:current.reports.length});if(paper!==current||version!==requestVersion)return;current.reports=current.reports.concat(data.reviews.filter(function(r){return !current.reports.some(function(old){return old.request_id===r.request_id;});}));current.more=data.has_more;showReports();}
  async function open(id) {
    var version=++requestVersion,gen=generation,d=await api('get',{request_id:id}),r=d.review,source=sourceId(r),record=isRecord(r)?r:null;
    var data=await api('list_all',{source_request_id:source,offset:0});
    if(!record && (r.source_record || r.result && r.result.source_record)){try{record=(await api('get',{request_id:source})).review;}catch(e){if(e.status!==404)throw e;}}
    if(gen!==generation || version!==requestVersion || !root.isConnected)return;
    paper={id:source,record:record,reports:data.reviews,more:data.has_more};
    if(!isRecord(r) && !paper.reports.some(function(x){return x.request_id===r.request_id;}))paper.reports.unshift(r);
    state.analysisTab='papers';
    mount({subject:r.subject,exam_id:r.exam_id,draft_id:r.draft_id,title:r.title,options:r.options||{}},id);
  }
  function enter(old, subject, examContext) {
    old.previousPage = state.page; origin = old; old.modal.style.display = 'none';
    seed = { subject: subject, exam_id: old.exam && old.exam.scores && old.exam.scores[subject] ? old.examId : '', draft_id: old.draftId, examContext: examContext, title: (old.modal.querySelector('#examName').value || '考试') + ' · ' + subject, originDraft: !old.examId }; selection = null;
    state.analysisTab = 'papers'; state.page = 'stats'; renderPage();
  }
  function render(node) {
    if (!node) return; generation++; root = node;if(state.analysisTab==='ai')state.analysisTab='papers';
    var next = context(); if (ctx && ctx.user !== next.user) { seed = null; selection = null; rows = []; drafts = []; origin = null; paper = null; } ctx = next;
    shell(); if (pendingAnalysis) { var record=pendingAnalysis; pendingAnalysis=null; analyzeRecord(record); } else if (selection) mount(selection.data, selection.reportId); else if (seed) create().catch(function (e) { note(e.message); }); else list();
  }
  window.ScorePaperHub = { tabs: tabs, navigation:navigation, render: render, enter: enter, open:open, canLeave:leaveEditor,
    analyze:function(row){pendingAnalysis=row;state.page='stats';state.analysisTab='papers';selection=null;seed=null;renderPage();} };
  var style = document.createElement('style'); style.textContent = `
.ph-workspace{max-width:1100px;margin:0 auto;padding:0 0 40px;color:var(--text)}.ph-tabs{display:flex;gap:6px;margin:0 0 24px;padding:5px;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:13px;width:fit-content}.ph-tabs button{border:0;background:transparent;color:var(--muted);padding:10px 22px;border-radius:9px;font:inherit;font-size:14px;cursor:pointer}.ph-tabs [aria-pressed=true]{background:var(--accent-soft,#eef1ff);color:var(--accent);font-weight:700}.ph-header,.ph-section-title{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.ph-header h1{font-size:26px;margin:6px 0}.ph-header p,.ph-section-title p{font-size:13px;color:var(--muted);margin:5px 0}.ph-header>div:last-child{display:flex;gap:8px;flex-wrap:wrap}.ph-filters{display:grid;grid-template-columns:1fr 1.4fr 1fr 1.6fr auto;gap:12px;align-items:end;margin:20px 0}.ph-workspace label{font-size:12px;color:var(--muted)}.ph-workspace input:not([type=checkbox]):not([type=file]),.ph-workspace select,.ph-workspace textarea{box-sizing:border-box;width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;font-size:14px;margin-top:6px}.ph-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.ph-card{min-width:0;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:16px;padding:20px;display:flex;flex-direction:column}.ph-card h3{font-size:17px;line-height:1.5;margin:16px 0 7px;overflow-wrap:anywhere}.ph-card p{font-size:13px;color:var(--muted);margin:4px 0 8px}.ph-card small{font-size:11px;color:var(--muted)}.ph-card-top{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ph-subject{font-weight:700;color:var(--accent)}.ph-status{padding:3px 8px;border-radius:20px;background:var(--accent-soft);font-size:11px}.ph-succeeded{color:#31846c;background:#31846c15}.ph-card footer{display:flex;gap:8px;margin-top:auto;padding-top:18px}.ph-progress{padding-top:10px}.ph-empty{grid-column:1/-1;padding:55px 18px;text-align:center;border:1px dashed var(--line);border-radius:16px}.ph-empty p{font-size:13px;color:var(--muted)}.ph-more{text-align:center;margin:20px}.ph-message:empty{display:none}.ph-message{padding:12px;border-radius:10px;background:var(--accent-soft);font-size:13px;margin-bottom:16px}.ph-create{background:var(--panel-solid,#fff);padding:26px;border:1px solid var(--line);border-radius:18px}.ph-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ph-create fieldset{border:1px solid var(--line);border-radius:12px;padding:18px;margin:24px 0}.ph-create legend{font-size:14px;font-weight:700;padding:0 7px}.ph-create fieldset p,.ph-hint{font-size:12px;color:var(--muted);line-height:1.8}.ph-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ph-modules label{display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px}.ph-modules input{accent-color:var(--accent)}.ph-create fieldset:disabled{opacity:.5}.ph-actions{text-align:right;padding-top:15px}.ph-editor-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;margin-bottom:15px;flex-wrap:wrap}.ph-link-form{display:grid;gap:10px;flex:1}.pr-inline{width:100%!important;max-width:100%!important;max-height:none!important;height:auto!important;margin:0!important;border:1px solid var(--line)!important;border-radius:16px!important;box-shadow:none;overflow:visible}.pr-inline .pr-head{position:static;border-radius:16px 16px 0 0}.pr-inline .pr-tabs{display:none}.pr-inline .pr-content{padding-top:20px}.pr-inline .pr-main{max-width:850px;margin:auto}.ph-workspace button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:800px){.ph-list{grid-template-columns:repeat(2,minmax(0,1fr))}.ph-filters{grid-template-columns:1fr 1fr}.ph-filters>button{justify-self:start}.ph-header{align-items:start}.ph-header h1{font-size:22px}.ph-modules{grid-template-columns:1fr 1fr}}@media(max-width:520px){.ph-header,.ph-section-title{flex-direction:column;align-items:stretch}.ph-header>div:last-child{justify-content:flex-start}.ph-list{grid-template-columns:1fr}.ph-create{padding:18px}.ph-form-grid{grid-template-columns:1fr}.ph-tabs{width:100%;box-sizing:border-box}.ph-tabs button{flex:1;padding:9px 10px}.ph-workspace .pr-head{align-items:start;gap:8px}.ph-editor-toolbar{align-items:start}.pr-inline .pr-content{padding:12px 14px 22px}.ph-workspace{padding-bottom:60px}}`;
  style.textContent += `
/* Guided setup and readable report hierarchy. */
.ph-create{padding:28px}.ph-create h2{font-size:26px;margin:0 0 8px}.ph-create .ph-section-title p,.ph-step p{font-size:14px;line-height:1.7}.ph-step{display:flex;gap:14px;align-items:flex-start;margin:26px 0 20px}.ph-step>span{display:grid;place-items:center;min-width:34px;height:34px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:14px}.ph-step h3{font-size:20px!important;margin:1px 0 5px!important;line-height:1.4}.ph-step p{margin:0;color:var(--muted)}.ph-create label{font-size:14px}.ph-name{margin-top:18px}.ph-name summary{cursor:pointer;font-size:14px}.ph-name summary span{color:var(--muted);margin-left:8px}.ph-name label{display:block;margin-top:12px}.ph-create .ph-create-editor .pr-inline{border:0!important;border-radius:0!important}.ph-create .ph-creating .pr-head{display:none}.ph-create .pr-content{padding:0}.ph-create .pr-main{max-width:none}.ph-create .pr-intro{padding:20px;margin:22px 0;background:var(--accent-soft);border-radius:12px}.ph-create .pr-intro h3{font-size:18px}.ph-create .pr-intro p,.ph-create .pr-quota{font-size:14px;line-height:1.65}.ph-create .pr-upload-group{padding:20px 0}.ph-create .pr-upload-group h3{font-size:17px}.ph-create .pr-upload-group>p{font-size:14px}.ph-create .pr-work-location{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0;border:0;margin:20px 0}.pr-work-location legend{font-size:16px;font-weight:650;margin-bottom:12px}.pr-work-location label,.ph-choice{display:flex!important;align-items:flex-start!important;gap:9px!important;padding:15px!important;border:1px solid var(--line);border-radius:11px;cursor:pointer;background:var(--panel-solid);min-width:0}.pr-work-location label:has(input:checked),.ph-choice:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}.ph-choice input,.pr-work-location input{margin:4px 0 0;flex:none;accent-color:var(--accent)}.ph-choice strong,.pr-work-location strong{display:block;font-size:15px;font-weight:650;line-height:1.5;color:var(--text)}.ph-choice small,.pr-work-location small{display:block;font-size:13px;line-height:1.65;color:var(--muted);margin-top:5px}.ph-create .ph-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;border:0;padding:0;margin:0}.ph-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.ph-create .ph-modules{grid-template-columns:1fr 1fr;margin:16px 0}.ph-preferences{border-top:1px solid var(--line);margin-top:28px}.ph-preferences .ph-step:first-child{margin-top:28px}.ph-core-note{font-size:14px!important;line-height:1.8;padding:13px 0;color:var(--muted)}.ph-context,.ph-custom{border:1px solid var(--line);border-radius:12px;padding:0 16px;margin:14px 0}.ph-context>summary,.ph-custom>summary{padding:16px 0;font-size:15px;font-weight:600;cursor:pointer;line-height:1.5}.ph-context>summary small{font-weight:400;color:var(--muted);font-size:13px}.ph-context[open],.ph-custom[open]{padding-bottom:16px}.ph-context>label,.ph-custom>label{display:block;margin-top:14px}.ph-hint{font-size:13px!important;line-height:1.8}.ph-example{font-size:14px;padding:15px;border-radius:10px;background:var(--accent-soft);line-height:1.8;align-self:end}.ph-create .ph-priorities{border:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:20px 0}.ph-priorities legend{margin-bottom:12px}.ph-summary{padding:18px;border-radius:12px;background:var(--accent-soft);margin:20px 0;font-size:15px}.ph-summary p{font-size:14px;line-height:1.8;margin:8px 0 0}.ph-create .pr-footer{position:sticky;bottom:70px;z-index:4;background:var(--panel-solid);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:0 4px 20px #00000008;flex-wrap:wrap}.ph-create .pr-footer .pr-button{min-height:44px;font-size:14px}.ph-create .pr-consent{font-size:13px;line-height:1.75;margin:24px 0 16px}.ph-create [hidden],.pr-main [hidden]{display:none!important}.ph-create .pr-help{font-size:13px}.ph-create .ph-form-grid{gap:16px}.ph-create .pr-message{font-size:14px}.ph-create .pr-check{font-size:14px}
.pr-main .pr-result-top h3{font-size:27px;margin-top:8px}.pr-main .pr-chapter{margin:0 0 22px;gap:14px}.pr-main .pr-chapter h3{font-size:22px;line-height:1.4}.pr-main .pr-chapter p{font-size:14px;line-height:1.7}.pr-main .pr-reading-section{padding-top:28px;margin-top:28px;border-top:1px solid var(--line)}.pr-main .pr-overall-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 24px}.pr-metric{padding:16px;border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;gap:8px;min-width:0}.pr-metric>span{font-size:13px;color:var(--muted)}.pr-metric strong{font-size:25px;line-height:1.3;letter-spacing:-.6px;font-variant-numeric:tabular-nums}.pr-metric small{font-size:13px;line-height:1.6;color:var(--muted)}.pr-main .pr-headline{font-size:19px;line-height:1.65;font-weight:700;margin:24px 0 12px}.pr-main .pr-overview .pr-prose{font-size:16px;line-height:1.8}.pr-overall-findings{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}.pr-overall-findings>section{padding:18px;border:1px solid var(--line);border-radius:12px;border-top:3px solid #43937a}.pr-overall-findings>.pr-overall-gap{border-top-color:#c98c4c}.pr-main .pr-overall-findings h4{font-size:16px;margin:0 0 14px}.pr-overall-findings article{margin:14px 0 0}.pr-overall-findings strong{font-size:15px;line-height:1.7;display:block}.pr-first-action{padding:18px;background:var(--accent-soft);border-radius:12px;line-height:1.8;font-size:15px}.pr-first-action .pr-button{margin-top:10px}.pr-main .pr-recollection{font-size:14px;color:var(--muted);line-height:1.8;margin-top:18px}.pr-main .pr-prose,.pr-main .pr-text{font-size:15px;line-height:1.8}.pr-main .pr-muted,.pr-main .pr-evidence{font-size:13px;line-height:1.75}.pr-main h4{font-size:16px;margin-top:20px}.pr-main .pr-fold>summary{font-size:15px;padding:15px 2px}.pr-main .pr-question>summary{font-size:16px;min-height:52px}.pr-main .pr-question summary small{font-size:13px}.pr-main .pr-badge{font-size:14px}.pr-main .pr-question-body h4{font-size:16px}.pr-main .pr-key-gaps article{padding:16px 0;border-bottom:1px solid var(--line)}.pr-key-gaps strong{font-size:17px}.pr-main .pr-pattern h4{font-size:17px}.pr-main .pr-action-plan{background:var(--panel-solid);border:1px solid var(--line)}.pr-main .pr-action h4{font-size:17px}.pr-main .pr-success{font-size:14px;padding:12px 14px}.pr-main .pr-report-nav .pr-button{flex:0 1 auto;font-size:13px;min-height:44px}.pr-main .pr-correct-prefix{border-left:3px solid #43937a;padding:12px 16px;margin-bottom:18px}.pr-main .pr-correct-prefix h4{margin-top:0}.pr-main .pr-difficulty-table{font-size:14px}.pr-main .pr-loss-map>span{font-size:14px;padding:10px}.pr-main .pr-win-card h4{font-size:14px}.pr-main .pr-context>summary{font-size:15px}.pr-main .pr-question .pr-check{font-size:13px}
@media(min-width:1080px){.ph-preferences{display:grid;grid-template-columns:minmax(0,1fr) 235px;gap:0 24px;align-items:start}.ph-preferences>*{grid-column:1;min-width:0}.ph-preferences>.ph-summary{grid-column:2;grid-row:1/7;position:sticky;top:24px;margin-top:28px}.ph-create .ph-presets{grid-template-columns:1fr}.ph-presets .ph-choice{padding:13px 16px!important}}
@media(max-width:700px){.ph-create{padding:18px}.ph-create .ph-presets,.ph-create .pr-work-location,.ph-create .ph-priorities{grid-template-columns:1fr}.ph-create .ph-modules{grid-template-columns:1fr}.ph-create .ph-form-grid{grid-template-columns:1fr}.ph-create .pr-footer{bottom:75px;gap:8px}.ph-create .pr-footer>span{width:100%}.ph-create .pr-footer .pr-button{flex:1}.pr-main .pr-overall-metrics{grid-template-columns:1fr 1fr;gap:10px}.pr-metric{padding:13px}.pr-metric strong{font-size:25px}.pr-overall-findings{grid-template-columns:1fr}.pr-main .pr-chapter h3{font-size:20px}.pr-main .pr-report-nav{gap:6px}.pr-main .pr-report-nav .pr-button{flex:1 0 28%;padding:8px}.pr-main .pr-difficulty-table tr{grid-template-columns:repeat(3,minmax(0,1fr))}.pr-main .pr-difficulty-table td:nth-child(2)::before{content:'难度 '}.pr-main .pr-difficulty-table td:nth-child(3)::before{content:'得分 '}.pr-main .pr-difficulty-table td:nth-child(4)::before{content:'主要难点 '}.pr-main .pr-question-body{padding:14px}.ph-create h2{font-size:24px}}
`;
  style.textContent += '.ph-workspace .ph-create input[type=radio]{width:16px;height:16px;padding:0;margin:4px 0 0;border:initial;background:initial;flex:none}.ph-workspace .ph-create input[type=checkbox]{width:16px;height:16px;flex:none}';
  document.head.appendChild(style);
})();
