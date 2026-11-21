/* Unified setup. User-scoped checkpoints; credentials stay in memory. */
(function () {
  'use strict';
  const VERSION = 2;
  const STEPS = ['欢迎','账号','科目','选科与组合','考试分类','学校','目标','外观','等级'];
  const CORE = ['语文','数学','英语'], EXTRAS = ['物理','历史','化学','生物','政治','地理','技术'];
  const BUILTINS = ['语数外','语数外 + 物理/历史（四科）','语数外 + 所选科（六科）'];
  const clone = v => JSON.parse(JSON.stringify(v));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const identity = () => state.user && state.token ? state.user.id + ':' + state.token : '';
  let active = null, attempted = '', loadingOwner = '', lastOwner = '';
  function track(event, step, extra={}) { try { window.__scoreTrackerTrack?.(event, {step,guide_version:VERSION,...extra}, 'setup'); } catch (_) {} }
  async function call(endpoint, action, payload, token) {
    const response = await fetch('/api/' + endpoint, {method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({action,token:token || state.token,...payload})});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {const e=Error(data.error || '暂时没有保存成功，请重试');e.status=response.status;throw e;}
    return data;
  }
  const setup = (action,payload,token) => call('score-tracker-setup',action,payload,token);
  function visual() { return {theme:window.__v29?.currentTheme() || 'sunny',...(window.__v29?.reading() || {font:'system',size:'standard'})}; }
  function applyVisual(v,persist) { window.__v29?.applyTheme(v.theme,true,persist);window.__v29?.applyReading(v.font,v.size,persist); }
  function input(name,value,label,attrs) { return '<label class="sg-field"><span>'+esc(label)+'</span><input data-field="'+esc(name)+'" value="'+esc(value)+'" '+(attrs || '')+'></label>'; }
  function choice(label,attr,selected) { return '<button type="button" class="sg-choice" '+attr+' aria-pressed="'+!!selected+'">'+esc(label)+(selected?'<span aria-hidden="true">✓</span>':'')+'</button>'; }
  function validation(code,message) { const e=Error(message);e.guideValidation=code;return e; }
  function failureMeta(error,stage) {
    const status=Number(error?.status ?? error?.requestStatus ?? 0);
    const category=error?.guideValidation?'validation':stage==='appearance'?'appearance':error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout_or_abort':status>=400&&status<=499?'request_rejected':status>=500&&status<=599?'server_error':stage==='checkpoint'||stage.endsWith('_save')?'request_error':'unexpected';
    return {failure_kind:category,failure_stage:stage,...(error?.guideValidation?{failure_code:error.guideValidation}:{}),...(status>=400&&status<=599?{http_status:status}:{})};
  }
  function recommendedGroups(selected, subjects) {
    const available=new Set(subjects.map(s=>s.name));
    if(!CORE.every(n=>available.has(n))||selected.length!==3||new Set(selected).size!==3||selected.some(n=>CORE.includes(n)||!available.has(n)))return [];
    const primary=selected.includes('物理')?'物理':selected.includes('历史')?'历史':null;
    return [[0,CORE.slice()],...(primary?[[1,CORE.concat(primary)]]:[]),[2,CORE.concat(selected)]];
  }
  function validateModule(m,modules,subjects) {
    const n=m.subjects.length,i=BUILTINS.indexOf(m.name),unique=new Set(m.subjects);
    if(!m.name||new Set(modules.map(m=>m.name)).size!==modules.length)throw validation('module_name','请填写组合名称，且不要重复');
    if(n<2||unique.size!==n||m.subjects.some(s=>!subjects.some(x=>x.name===s)))throw validation('module_members','请检查组合科目，至少选择 2 门现有科目');
    if(i>=0&&(n!==[3,4,6][i]||!CORE.every(s=>unique.has(s))))throw validation('builtin_members',m.name+'需要包含语文、数学、英语及对应选科');
    if(i===1&&!['物理','历史'].some(s=>unique.has(s)))throw validation('four_subject','四科组合只能选择物理或历史之一');
  }
  function number(raw,label,max,integer) {
    if (String(raw ?? '').trim()==='') return null;
    const n=Number(raw);
    if (!Number.isFinite(n)||n<(integer?1:0)||n>max||integer&&!Number.isInteger(n))throw validation(integer?'invalid_integer':'invalid_score',label+(integer?'请输入正整数':'请填写有效分数'));
    return n;
  }
  function open(options = {}) {
    if (!identity() || active) return;
    const key=identity(),token=state.token,user=clone(state.user);
    let credentials=options.credentials || null,isNew=!!credentials,credentialSaved=!credentials;
    let profile=options.profile || null,ready=false,busy=false,message='',step=0;
    let subjects=[],modules=[],selected=[],counts={},classification={label:'年级',options:['高一','高二','高三']},grade='';
    let school=null,schoolQuery='',schoolMatches=[],searchTimer,searchSeq=0,schoolSearching=false;
    let goal={subjects:{},totalGoal:null,targetRank:null,school:'',date:'',dateName:''};
    let initial={},appearance=visual(),initialVisual=clone(appearance),benefits=null,benefitError='';
    let shownStep=-1,stepStarted=performance.now();const runId=crypto.randomUUID();
    function emit(event,n=step,extra={}){track(event,n,{account_kind:isNew?'new':'existing',guide_run_id:runId,duration_ms:Math.round(performance.now()-stepStarted),...extra});}
    let rename=user.username,password='',confirmation='',showPassword=false;
    const root=document.createElement('div');root.className='setup-overlay sg-root';
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','账号设置引导');
    const app=document.getElementById('app'),inert=app?.inert,overflow=document.body.style.overflow,focus=document.activeElement;
    state.onboarding={kind:'unified-setup'};state.setupGuideLoading=true;
    document.body.appendChild(root);document.body.style.overflow='hidden';if(app)app.inert=true;
    const current=()=>identity()===key && active?.root===root;
    function close(restore) {
      clearTimeout(searchTimer);searchSeq++;
      if(restore)applyVisual(initialVisual,false);
      root.remove();document.body.style.overflow=overflow;if(app)app.inert=inert;
      credentials=null;password=confirmation='';active=null;
      if(identity()===key){state.onboarding=null;state.setupGuideLoading=false;}
      if(focus?.isConnected)focus.focus();
    }
    active={root,close,key};
    function countFields(key) {
      const row=counts[key] || {};
      return '<div class="sg-counts" data-count="'+esc(key)+'">'+['year','class'].map(s=>input(s,row[s],s==='year'?'年级人数':'班级人数','type="number" min="1" max="10000000" inputmode="numeric" placeholder="'+(key==='total'?'选填':'沿用总人数')+'"')).join('')+'</div>';
    }
    function heading(title,subtitle,completed) { return '<header class="sg-heading">'+(completed?'<span class="sg-done">✓ 已设置</span>':'')+'<h1 id="sg-title" tabindex="-1">'+title+'</h1>'+(subtitle?'<p>'+subtitle+'</p>':'')+'</header>'; }
    function account() {
      if(isNew&&!credentialSaved)return heading('先保存你的账号','请复制或截图保存。')+'<div class="sg-credentials">'+['username','password'].map((k,i)=>'<div><span>'+(i?'初始密码':'用户名')+'</span><code>'+esc(credentials[k])+'</code><button type="button" data-copy="'+k+'">复制</button></div>').join('')+'</div><p class="sg-note">初始密码只在这里显示。</p>';
      return heading('你的账号',isNew?'可以修改，也可以直接继续。':'',!isNew)+'<div class="sg-form">'+input('username',rename,'用户名','maxlength="24" autocomplete="username"')+'<details class="sg-fold"'+(isNew?' open':'')+'><summary>修改密码</summary><div class="sg-password">'+input('password',password,'新密码','type="'+(showPassword?'text':'password')+'" maxlength="20" autocomplete="new-password" placeholder="6～20 位字母、数字或符号"')+'<button type="button" data-reveal aria-label="'+(showPassword?'隐藏密码':'显示密码')+'">'+(showPassword?'隐藏':'显示')+'</button></div>'+input('confirmation',confirmation,'确认密码','type="password" maxlength="20" autocomplete="new-password"')+'</details></div>';
    }
    function subjectPage() {
      return heading('你的考试科目','满分和人数，以后自动带入。',!isNew&&subjects.length)+'<section class="sg-total"><b>整场默认人数</b>'+countFields('total')+'</section><div class="sg-subjects">'+subjects.map((s,i)=>'<section class="sg-subject" data-subject-row="'+i+'"><div class="sg-subject-top">'+input('name',s.name,'科目','maxlength="40" aria-label="科目名称"')+input('max',s.defaultMax,'满分','type="number" min="1" max="9999" inputmode="decimal"')+'<button type="button" class="sg-remove" data-remove-subject="'+i+'" aria-label="删除'+esc(s.name)+'">×</button></div>'+countFields('s:'+i)+'</section>').join('')+'</div><button type="button" class="sg-text" data-add-subject>＋ 添加科目</button>';
    }
    function combinationPage() {
      const options=Array.from(new Set(subjects.map(s=>s.name).filter(n=>!CORE.includes(n))));
      selected=selected.filter(n=>options.includes(n));
      return heading('选科与组合','选好科目，再看看组合。',!isNew&&modules.length)+'<div class="sg-chips" aria-label="所选科目">'+options.map(n=>choice(n,'data-elective="'+esc(n)+'"',selected.includes(n))).join('')+'</div><div class="sg-section-line"><span>成绩组合</span><button type="button" class="sg-text" data-recommend>应用推荐组合</button></div><div class="sg-combinations">'+modules.map((m,i)=>'<section class="sg-combination" data-module-row="'+i+'"><div class="sg-combination-title">'+(m.isBuiltin?'<b>'+esc(m.name===BUILTINS[0]?'三科组合':m.name===BUILTINS[1]?'四科组合':m.name===BUILTINS[2]?'六科组合':m.name)+'</b>':input('module-name',m.name,'名称','maxlength="30"'))+(!m.isBuiltin?'<button type="button" class="sg-remove" data-remove-module="'+i+'" aria-label="删除组合">×</button>':'')+'</div><p class="sg-members">'+esc(m.subjects.join(' · '))+'</p>'+countFields('m:'+i)+'<details class="sg-fold"><summary>调整科目</summary><div class="sg-chips">'+subjects.filter(s=>m.name!==BUILTINS[1]||CORE.includes(s.name)||['物理','历史'].includes(s.name)).map(s=>choice(s.name,'data-member="'+esc(s.name)+'" data-module="'+i+'"',m.subjects.includes(s.name))).join('')+'</div></details></section>').join('')+'</div><button type="button" class="sg-text" data-add-module>＋ 添加组合</button>';
    }
    function classificationPage() {
      const preset=classification.label==='年级'&&same(classification.options,['初一','初二','初三'])?'junior':classification.label==='年级'&&same(classification.options,['高一','高二','高三'])?'senior':'custom';
      return heading('按年级整理考试','当前年级会作为新考试的默认分类。',!isNew&&initial.classification?.options?.length)+'<div class="sg-presets">'+[['junior','初中','初一 · 初二 · 初三'],['senior','高中','高一 · 高二 · 高三']].map(([id,title,sub])=>'<button type="button" class="sg-preset" data-preset="'+id+'" aria-pressed="'+(preset===id)+'"><strong>'+title+'</strong><span>'+sub+'</span>'+(preset===id?'<i class="sg-preset-check" aria-hidden="true">✓</i>':'')+'</button>').join('')+'</div><label class="sg-field"><span>当前'+esc(classification.label)+'</span><select data-field="grade"><option value="">暂不选择</option>'+classification.options.map(n=>'<option '+(n===grade?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label><section class="sg-category-editor">'+input('category-label',classification.label,'分类名称','maxlength="16"')+'<div class="sg-section-line"><span>分类选项</span></div><div class="sg-category-list">'+classification.options.map((n,i)=>'<div class="sg-category-row">'+input('category-option:'+i,n,'分类 '+(i+1),'maxlength="20"')+'<button type="button" class="sg-remove" data-remove-category="'+i+'" aria-label="删除分类">×</button></div>').join('')+'</div><button type="button" class="sg-text" data-add-category>＋ 添加分类</button></section>';
    }
    function schoolResults() { return (schoolSearching?'<p class="sg-note">查找中…</p>':'')+schoolMatches.map((s,i)=>'<button type="button" data-school="'+i+'" class="sg-school-option"><b>'+esc(s[0])+'</b><small>'+esc(s.slice(1,4).filter(Boolean).join(' · '))+'</small></button>').join('')+(schoolQuery&&!schoolSearching&&!schoolMatches.length?'<p class="sg-note">将保存：'+esc(schoolQuery)+'</p>':''); }
    function schoolPage() { return heading('你的学校','搜索，或直接填写。',!!initial.school)+'<label class="sg-field sg-school-search"><span class="sg-sr">学校名称</span><input data-field="school" value="'+esc(schoolQuery)+'" maxlength="100" autocomplete="off" placeholder="输入学校名称"></label><div class="sg-school-results" aria-live="polite">'+schoolResults()+'</div>'; }
    function goalPage() {
      return heading('给自己一个目标','先定一个小目标，也可以之后再填。',!!initial.goal&&(initial.goal.totalGoal!=null||Object.keys(initial.goal.subjects||{}).length||initial.goal.targetRank!=null))+'<div class="sg-goal-grid">'+input('goal-total',goal.totalGoal,'目标总分','type="number" min="0" max="9999" step="0.01" inputmode="decimal" placeholder="例如 600"')+input('goal-rank',goal.targetRank,'目标年级名次','type="number" min="1" max="10000000" inputmode="numeric" placeholder="例如 100"')+'</div>'+input('goal-school',goal.school,'理想学校','maxlength="40" placeholder="选填"')+'<details class="sg-fold"><summary>单科目标</summary><div class="sg-goal-grid">'+subjects.map(s=>input('goal-subject:'+s.name,goal.subjects[s.name],s.name,'type="number" min="0" max="1000" step="0.01" inputmode="decimal" placeholder="满分 '+esc(s.defaultMax)+'"')).join('')+'</div></details>';
    }
    function appearancePage() {
      return heading('选一种喜欢的样子','点选，即刻预览。',!isNew)+'<section class="sg-appearance appearance-card-v29">'+(window.__v29?.appearanceHtml?.(appearance.theme)||'')+'</section>';
    }
    function levelPage() {
      if(!benefits)return heading('你的成长，从这里继续','')+'<div class="sg-level-empty"><p>'+esc(benefitError||'正在读取账号等级…')+'</p><button type="button" class="sg-text" data-retry-level>重新读取</button></div>';
      const g=benefits.growth,c=benefits.credits,next=(g.levels||[]).find(l=>l.level===g.level+1),progress=next?Math.min(100,Math.max(0,100*g.points/next.threshold)):100;
      return heading(isNew?'准备好了。':'欢迎继续，'+esc(state.user.username)+'。','每一次有效记录，都会积累成长。')+'<div class="sg-level-orbit"><span>ACCOUNT LEVEL</span><strong><small>Lv.</small>'+g.level+'</strong><span>'+Number(g.points).toLocaleString()+' 成长分</span></div><div class="sg-level-progress"><i style="width:'+progress+'%"></i></div><p class="sg-note sg-center">'+(next?'距 Lv.'+next.level+' 还需 '+Math.max(0,next.threshold-g.points)+' 成长分'+(next.min_days||next.min_months?' · 需满足使用时长':''):'已达到最高等级')+'</p><div class="sg-benefits"><div><b>'+Number(c.available).toLocaleString()+'</b><span>可用 AI 积分</span></div><div><b>'+Number(c.monthly).toLocaleString()+'</b><span>每月积分</span></div></div>';
    }
    function content() {
      if(step===0)return '<div class="sg-welcome"><div class="sg-welcome-mark logo" aria-hidden="true">'+(window.__v29?.logoSvg||'')+'</div><span class="sg-kicker">SCORE TRACKER</span><h1 id="sg-title" tabindex="-1"><span class="sg-hi">Hi </span><span class="sg-welcome-name">'+esc(state.user.username)+'，</span></h1><p>'+(isNew?'欢迎使用 Score Tracker！':'欢迎回来！')+'</p>'+(isNew?'':'<div class="sg-existing-note"><p>这次引导主要帮助你完善个人设置。</p><p>已有设置会自动保留，不会被清空，考试记录也不受影响。</p></div>')+'</div>';
      if(step===1&&isNew&&!credentialSaved)return account();
      if(!ready)return heading('正在准备你的设置',message||'稍等片刻…')+'<button type="button" class="sg-text" data-retry>重新加载</button>';
      return [null,account,subjectPage,combinationPage,classificationPage,schoolPage,goalPage,appearancePage,levelPage][step]();
    }
    function draw(animate=true) {
      if(!current())return;
      if(shownStep!==step){shownStep=step;stepStarted=performance.now();emit('setup_step_shown');}
      root.innerHTML='<div class="sg-shell"><header class="sg-top"><span class="sg-brand"><span class="sg-product-logo logo" aria-hidden="true">'+(window.__v29?.logoSvg||'')+'</span><span>Score Tracker</span></span><span class="sg-position">'+(step===0?'让进步有迹可循':STEPS[step]+' <span>'+step+' / 8</span>')+'</span></header><div class="sg-progress" role="progressbar" aria-label="设置进度" aria-valuenow="'+step+'" aria-valuemin="0" aria-valuemax="8"><i style="width:'+(step/8*100)+'%"></i></div><main class="sg-main '+(step===0?'sg-intro ':'')+(animate?'sg-enter':'')+'">'+content()+'</main><footer class="sg-footer"><div><button type="button" class="sg-back" data-back '+(step===0?'hidden':'')+'>← 上一步</button></div><div class="sg-footer-right">'+(step>1&&step<8?'<button type="button" class="sg-skip" data-skip>稍后设置</button>':'')+'<button type="button" class="sg-next" data-next '+(busy||step>0&&!ready?'disabled':'')+'>'+(busy?'保存中…':step===0?'开始':step===1&&!credentialSaved?'已保存，继续':step===8?'开始记录':'继续')+' <span aria-hidden="true">→</span></button></div><p class="sg-error" role="alert">'+esc(message)+'</p></footer></div>';
      bind();if(step>0&&animate)root.querySelector('#sg-title')?.focus({preventScroll:true});
    }
    function valueIn(row,name) { return row.querySelector('[data-field="'+name+'"]')?.value || ''; }
    function capture() {
      if(!ready)return;
      const value=n=>root.querySelector('[data-field="'+n+'"]')?.value;
      root.querySelectorAll('[data-count]').forEach(row=>{counts[row.dataset.count]={year:valueIn(row,'year'),class:valueIn(row,'class')};});
      if(step===1&&credentialSaved){rename=value('username');password=value('password')||'';confirmation=value('confirmation')||'';}
      if(step===2)root.querySelectorAll('[data-subject-row]').forEach(row=>{const s=subjects[+row.dataset.subjectRow];s.name=valueIn(row,'name').trim();s.defaultMax=valueIn(row,'max');});
      if(step===3)root.querySelectorAll('[data-module-row]').forEach(row=>{const name=row.querySelector('[data-field="module-name"]');if(name)modules[+row.dataset.moduleRow].name=name.value.trim();});
      if(step===4){classification={label:value('category-label').trim(),options:[...root.querySelectorAll('[data-field^="category-option:"]')].map(el=>el.value.trim())};grade=value('grade')||'';}
      if(step===6){goal.totalGoal=value('goal-total');goal.targetRank=value('goal-rank');goal.school=value('goal-school').trim();subjects.forEach(s=>{goal.subjects[s.name]=value('goal-subject:'+s.name);});}
    }
    async function checkpoint(next,extra={}) {
      if(!current())return;
      const result=await setup('save',{guide_step:next,...extra},token);
      if(!current())return;
      profile=result.profile;state.setupProfile=profile;
    }
    function clearCounts(prefix) {
      Object.keys(counts).forEach(key=>{if(key.startsWith(prefix))delete counts[key];});
    }
    function reindexCounts(prefix, length, removed) {
      const old=clone(counts);
      clearCounts(prefix);
      for(let n=0;n<length;n++)counts[prefix+n]=old[prefix+(n>=removed?n+1:n)]||{};
    }
    function validateCounts(keys) {
      keys.forEach(key=>['year','class'].forEach(scope=>number((counts[key]||{})[scope],'人数',10000000,true)));
    }
    async function saveCounts(items) {
      const defaults={};
      items.forEach(([draftKey,savedKey])=>{const row=counts[draftKey]||{},prev=initial.defaults[savedKey]||{},patch={};['year','class'].forEach(scope=>{const n=number(row[scope],'人数',10000000,true);if(n!==(prev[scope]??null))patch[scope]=n;});if(Object.keys(patch).length)defaults[savedKey]=patch;});
      if(Object.keys(defaults).length){await dataApiV7('save_participant_defaults',{defaults});if(!current())return;Object.entries(defaults).forEach(([key,row])=>initial.defaults[key]={...initial.defaults[key],...row});}
    }
    function recommend() {
      const groups=recommendedGroups(selected,subjects);
      if(!groups.length)throw validation('recommend_subjects','请先配置语数英和 3 门选科');
      groups.forEach(([i,names])=>{let m=modules.find(m=>m.name===BUILTINS[i]);if(m)m.subjects=names.slice();else {counts['m:'+modules.length]={};modules.push({name:BUILTINS[i],subjects:names.slice(),isBuiltin:true});}});
    }
    async function advance(skip) {
      if(busy||!current())return;
      message='';capture();
      if(step===0){step=1;draw();return;}
      if(step===1&&!credentialSaved){credentialSaved=true;draw();return;}
      if(!ready)return;
      if(skip){
        if(step===2){clearCounts('s:');subjects=clone(initial.subjects);counts.total=clone(initial.defaults.total||{});subjects.forEach((s,i)=>counts['s:'+i]=clone(initial.defaults['s:'+s.name]||{}));}
        if(step===3){clearCounts('m:');modules=clone(initial.modules);selected=clone(profile.selected_subjects||[]);modules.forEach((m,i)=>counts['m:'+i]=clone(initial.defaults['m:'+m.id]||{}));}
        if(step===4){classification=clone(initial.classification);grade=profile.current_grade||'';}
        if(step===5){school=clone(initial.school);schoolQuery=school?.name||'';}
        if(step===6)goal=clone(initial.goal);
      }
      busy=true;draw(false);
      let failureStage='validation';
      try {
        if(!skip&&step===1){
          if(rename!==state.user.username&&!/^[\p{L}\p{N}_-]{2,24}$/u.test(rename))throw validation('username_format','用户名需为 2～24 位中文、字母、数字、横线或下划线');
          if(password||confirmation){if(!/^[\x21-\x7e]{6,20}$/.test(password))throw validation('password_format','密码需为 6～20 位字母、数字或符号');if(password!==confirmation)throw validation('password_mismatch','两次密码不一致');}
          if(rename!==state.user.username){failureStage='username_save';const r=await usernameApiV19('rename',{username:rename});if(!current())return;state.user.username=r.user.username;if(credentials)credentials.username=r.user.username;}
          if(password){failureStage='password_save';await changePasswordApiV15(password);if(!current())return;if(credentials)credentials.password=password;password=confirmation='';}
        }
        if(!skip&&step===2){
          if(!subjects.length||subjects.some(s=>!s.name)||new Set(subjects.map(s=>s.name)).size!==subjects.length)throw validation('subject_name','请填写科目名称，且不要重复');
          subjects.forEach(s=>{s.defaultMax=number(s.defaultMax,'满分',9999,false);if(!s.defaultMax)throw validation('subject_max','满分需大于 0');});
          validateCounts(['total',...subjects.map((_,i)=>'s:'+i)]);
          if(!same(subjects,initial.subjects)){failureStage='subjects_save';const d=await dataApiV7('save_subjects',{subjects});if(!current())return;state.subjectConfigs=d.subjects;subjects=clone(d.subjects);initial.subjects=clone(subjects);}
          failureStage='counts_save';await saveCounts([['total','total'],...subjects.map((s,i)=>['s:'+i,'s:'+s.name])]);if(!current())return;
        }
        if(!skip&&step===3){
          const allowed=selected.filter(n=>subjects.some(s=>s.name===n)&&!CORE.includes(n));
          if(!same(modules,initial.modules))modules.forEach(m=>validateModule(m,modules,subjects));
          validateCounts(modules.map((_,i)=>'m:'+i));
          if(!same(modules,initial.modules)){failureStage='modules_save';const d=await modulesApiV18('save_modules',{modules});if(!current())return;state.modulesV18=d.modules;modules=clone(d.modules);initial.modules=clone(modules);}
          failureStage='counts_save';await saveCounts(modules.map((m,i)=>['m:'+i,'m:'+m.id]));if(!current())return;
          failureStage='checkpoint';await checkpoint(4,{selected_subjects:allowed});
        }
        if(!skip&&step===4){
          if(!classification.label||!classification.options.length||new Set(classification.options).size!==classification.options.length)throw validation('classification','请填写分类名称和不重复的选项');
          if(!same(classification,initial.classification)){failureStage='classification_save';const d=await dataApiV7('save_classification',{classification});if(!current())return;state.classification=d.classification;classification=clone(d.classification);initial.classification=clone(classification);}
          grade=classification.options.includes(grade)?grade:'';failureStage='checkpoint';await checkpoint(5,{current_grade:grade});
        }
        if(!skip&&step===5&&schoolQuery.trim()){
          const next=school||{name:schoolQuery.trim(),source:'manual'};
          if(!same(next,initial.school)){failureStage='school_save';const d=await setup('school_save',{school:next},token);if(!current())return;profile=d.profile;state.setupProfile=profile;initial.school=clone(next);}
        }
        if(!skip&&step===6){
          goal.totalGoal=number(goal.totalGoal,'目标总分',9999,false);goal.targetRank=number(goal.targetRank,'目标名次',10000000,true);
          const gs={};Object.entries(goal.subjects).forEach(([n,v])=>{const score=number(v,n+'目标',1000,false);if(score!==null)gs[n]=score;});goal.subjects=gs;
          if(!same(goal,initial.goal)){failureStage='goal_save';await dataApiV7('save_goal',{goal});if(!current())return;initial.goal=clone(goal);window.__v33?.reload();}
        }
        if(step===7){failureStage='appearance';if(skip){appearance=clone(initialVisual);applyVisual(appearance,true);}else{applyVisual(appearance,true);initialVisual=clone(appearance);}}
        if(step===8){failureStage='checkpoint';await checkpoint(8,{preference_guide_version:VERSION,completed:true,step:6});if(!current())return;attempted=key;emit('setup_step_completed',8);emit('setup_completed',8);close(false);render();return;}
        if(!current())return;
        if(step!==3&&step!==4||skip){failureStage='checkpoint';await checkpoint(step+1);}
        if(!current())return;
        emit(skip?'setup_step_skipped':'setup_step_completed',step);step++;busy=false;message='';draw();if(step===8)loadBenefits();
      }catch(error){if(current()){emit('setup_step_failed',step,failureMeta(error,failureStage));message=error.message||'暂时没有保存成功';busy=false;draw(false);}}
    }
    async function loadBenefits() {
      benefitError='';
      try{const d=await dataApiV7('account_status');if(current()){benefits=d.account;if(step===8)draw(false);}}
      catch(_){if(current()){benefitError='等级暂时未能读取，稍后可在账号页查看。';if(step===8)draw(false);}}
    }
    function searchSchool() {
      clearTimeout(searchTimer);const seq=++searchSeq;school=null;schoolMatches=[];
      if(!schoolQuery.trim()){schoolSearching=false;root.querySelector('.sg-school-results').innerHTML='';return;}
      schoolSearching=true;
      searchTimer=setTimeout(async()=>{try{const d=await setup('school_search',{query:schoolQuery.trim()},token);if(current()&&seq===searchSeq)schoolMatches=d.schools||[];}catch(_){}finally{if(current()&&seq===searchSeq){schoolSearching=false;const host=root.querySelector('.sg-school-results');if(host){host.innerHTML=schoolResults();bindSchools();}}}},250);
    }
    function bindSchools(){root.querySelectorAll('[data-school]').forEach(b=>b.onclick=()=>{school={name:schoolMatches[+b.dataset.school][0],province:schoolMatches[+b.dataset.school][1],city:schoolMatches[+b.dataset.school][2],area:schoolMatches[+b.dataset.school][3],source:'github'};schoolQuery=school.name;schoolMatches=[];draw(false);});}
    function bind() {
      root.querySelector('[data-next]').onclick=()=>advance(false);
      root.querySelector('[data-skip]')?.addEventListener('click',()=>advance(true));
      root.querySelector('[data-back]').onclick=()=>{if(busy)return;capture();emit('setup_step_back');message='';step=Math.max(0,step-1);draw();};
      root.querySelector('[data-retry]')?.addEventListener('click',prepare);
      root.querySelector('[data-retry-level]')?.addEventListener('click',loadBenefits);
      root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(credentials[b.dataset.copy]);if(current())b.textContent='已复制';}catch(_){message='请长按复制，或截图保存';draw(false);}});
      root.querySelector('[data-reveal]')?.addEventListener('click',()=>{capture();showPassword=!showPassword;draw(false);});
      root.querySelector('[data-add-subject]')?.addEventListener('click',()=>{capture();if(subjects.length>=20)return;counts['s:'+subjects.length]={};subjects.push({name:'',defaultMax:100});draw(false);root.querySelector('[data-subject-row="'+(subjects.length-1)+'"] input')?.focus();});
      root.querySelectorAll('[data-remove-subject]').forEach(b=>b.onclick=()=>{capture();if(subjects.length<=1)return;const i=+b.dataset.removeSubject;subjects.splice(i,1);reindexCounts('s:',subjects.length,i);draw(false);});
      root.querySelectorAll('[data-elective]').forEach(b=>b.onclick=()=>{capture();const name=b.dataset.elective;if(selected.includes(name))selected=selected.filter(n=>n!==name);else if(selected.length<3)selected.push(name);else{message='最多选择 3 门';draw(false);return;}if(isNew&&selected.length===3){try{recommend();}catch(_){}}message='';draw(false);});
      root.querySelector('[data-recommend]')?.addEventListener('click',()=>{capture();try{recommend();message='';}catch(e){message=e.message;}draw(false);});
      root.querySelector('[data-add-module]')?.addEventListener('click',()=>{capture();if(modules.length>=12)return;counts['m:'+modules.length]={};modules.push({name:'',subjects:[],isBuiltin:false});draw(false);});
      root.querySelectorAll('[data-remove-module]').forEach(b=>b.onclick=()=>{capture();const i=+b.dataset.removeModule;modules.splice(i,1);reindexCounts('m:',modules.length,i);draw(false);});
      root.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{capture();const m=modules[+b.dataset.module],n=b.dataset.member,i=BUILTINS.indexOf(m.name);if(i>=0&&CORE.includes(n))return;if(i===0)return;if(i===1){if(!['物理','历史'].includes(n))return;m.subjects=CORE.concat(n);}else if(i===2){const extras=m.subjects.filter(s=>!CORE.includes(s));if(!extras.includes(n)&&extras.length>=3){message='六科组合最多选择 3 门选科';draw(false);return;}m.subjects=CORE.concat(extras.includes(n)?extras.filter(s=>s!==n):extras.concat(n));}else m.subjects=m.subjects.includes(n)?m.subjects.filter(s=>s!==n):m.subjects.concat(n);message='';draw(false);});
      root.querySelector('[data-add-category]')?.addEventListener('click',()=>{capture();if(classification.options.length<12){classification.options.push('');draw(false);root.querySelector('[data-field="category-option:'+(classification.options.length-1)+'"]')?.focus();}});
      root.querySelectorAll('[data-remove-category]').forEach(b=>b.onclick=()=>{capture();if(classification.options.length>1){classification.options.splice(+b.dataset.removeCategory,1);draw(false);}});
      root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{classification={label:'年级',options:b.dataset.preset==='junior'?['初一','初二','初三']:['高一','高二','高三']};grade=classification.options.includes(grade)?grade:'';draw(false);});
      root.querySelector('[data-field="school"]')?.addEventListener('input',e=>{schoolQuery=e.target.value;searchSchool();});bindSchools();
      const visualHost=root.querySelector('.sg-appearance');
      if(visualHost)window.__v29?.bindAppearance?.(visualHost,{silent:true,persist:false,theme:appearance.theme,onChange:function(next){appearance=next;draw(false);}});
      root.querySelectorAll('button,input,select').forEach(el=>{if(busy)el.disabled=true;});
    }
    root.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const els=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary')].filter(el=>!el.hidden&&el.getClientRects().length),first=els[0],last=els[els.length-1];
      if(e.shiftKey&&(document.activeElement===first||!els.includes(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    });
    async function prepare() {
      if(!current())return;ready=false;message='';
      try {
        if(!profile){const d=await setup('get',{},token);if(!current())return;profile=d.profile;}
        if(!profile){const d=await setup('start',{guide_only:true},token);if(!current())return;profile=d.profile;}
        await loadExams();if(!current())return;
        const g=await dataApiV7('get_goal');if(!current())return;
        subjects=clone(state.subjectConfigs||[]);modules=clone(state.modulesV18||[]);classification=clone(state.classification||classification);
        if(!subjects.length)throw Error('科目尚未加载，请重试');
        selected=clone(profile.selected_subjects||[]);grade=profile.current_grade||'';
        if(!selected.length&&!isNew){const m=modules.find(m=>m.name===BUILTINS[2]);selected=(m?.subjects||[]).filter(n=>subjects.some(s=>s.name===n)&&!CORE.includes(n));}
        school=clone(profile.school||null);schoolQuery=school?.name||'';
        goal={subjects:{},totalGoal:null,targetRank:null,school:'',date:'',dateName:'',...g.goal};
        const savedDefaults=window.ScoreParticipantDefaults?.snapshot?.()||{};
        clearCounts('s:');clearCounts('m:');counts.total=clone(savedDefaults.total||{});subjects.forEach((s,i)=>counts['s:'+i]=clone(savedDefaults['s:'+s.name]||{}));modules.forEach((m,i)=>counts['m:'+i]=clone(savedDefaults['m:'+m.id]||{}));
        initial={subjects:clone(subjects),modules:clone(modules),classification:clone(classification),school:clone(school),goal:clone(goal),defaults:clone(savedDefaults)};
        state.setupProfile=profile;ready=true;state.setupGuideLoading=false;draw(false);loadBenefits();
      }catch(e){if(current()){message=e.message||'设置加载失败';draw(false);}}
    }
    draw();emit('setup_shown',0);prepare();
  }
  async function maybe() {
    const key=identity();
    if(key!==lastOwner){lastOwner=key;attempted='';if(active&&active.key!==key)active.close(true);}
    if(!key){state.setupGuideLoading=false;return;}
    if(active||attempted===key||loadingOwner===key)return;
    state.setupGuideLoading=true;loadingOwner=key;
    try{
      const credentials=state.onboarding?.password?clone(state.onboarding):null;
      const d=await setup('guide_claim',{},state.token);
      if(identity()!==key)return;
      state.setupProfile=d.profile;attempted=key;
      if(d.claimed)open({profile:d.profile,credentials});
    }
    catch(_){/* Next render retries; an unseen guide is never marked complete. */}
    finally{if(identity()===key){loadingOwner='';if(!active)state.setupGuideLoading=false;}}
  }
  window.ScoreSetupGuide={open};
  const previousRender=render;
  render=function(){const result=previousRender.apply(this,arguments);maybe();return result;};
  const previousOpen=openExam;
  openExam=function(exam){const result=previousOpen.apply(this,arguments);if(!exam){const grade=state.setupProfile?.current_grade,input=state.modal?.querySelector('#gradeLevelV14');if(input&&grade&&[...input.options].some(o=>o.value===grade))input.value=grade;}return result;};
  if(identity())maybe();
})();
