/* Unified setup. User-scoped checkpoints; credentials stay in memory. */
(function () {
  'use strict';
  const VERSION = 2;
  const STEPS = ['欢迎','账号','科目','选科与组合','考试分类','学校','目标','外观','隐私','等级'];
  const CORE = ['语文','数学','英语'], EXTRAS = ['物理','历史','化学','生物','政治','地理','技术'];
  const BUILTINS = ['语数外','语数外 + 物理/历史（四科）','语数外 + 所选科（六科）'];
  const THEMES = {sunny:'晴白',sky:'天蓝',paper:'暖纸',night:'墨夜'};
  const FONTS = {system:'系统默认',sans:'清晰黑体',serif:'书卷宋体',wenkai:'霞鹜文楷',fangsong:'朱雀仿宋'};
  const clone = v => JSON.parse(JSON.stringify(v));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const identity = () => state.user && state.token ? state.user.id + ':' + state.token : '';
  let active = null, attempted = '', loadingOwner = '', lastOwner = '';
  function track(event, step) { try { window.__scoreTrackerTrack?.(event, {step}, 'setup'); } catch (_) {} }
  async function call(endpoint, action, payload, token) {
    const response = await fetch('/api/' + endpoint, {method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({action,token:token || state.token,...payload})});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || '暂时没有保存成功，请重试');
    return data;
  }
  const setup = (action,payload,token) => call('score-tracker-setup',action,payload,token);
  function visual() { return {theme:window.__v29?.currentTheme() || 'sunny',...(window.__v29?.reading() || {font:'system',size:'standard'})}; }
  function applyVisual(v,persist) { window.__v29?.applyTheme(v.theme,true,persist);window.__v29?.applyReading(v.font,v.size,persist); }
  function input(name,value,label,attrs) { return '<label class="sg-field"><span>'+esc(label)+'</span><input data-field="'+esc(name)+'" value="'+esc(value)+'" '+(attrs || '')+'></label>'; }
  function choice(label,attr,selected) { return '<button type="button" class="sg-choice" '+attr+' aria-pressed="'+!!selected+'">'+esc(label)+(selected?'<span aria-hidden="true">✓</span>':'')+'</button>'; }
  function number(raw,label,max,integer) {
    if (String(raw ?? '').trim()==='') return null;
    const n=Number(raw);
    if (!Number.isFinite(n)||n<(integer?1:0)||n>max||integer&&!Number.isInteger(n))throw Error(label+(integer?'请输入正整数':'请填写有效分数'));
    return n;
  }
  function open(options = {}) {
    if (!identity() || active) return;
    const key=identity(),token=state.token,user=clone(state.user);
    let credentials=options.credentials || null,isNew=!!credentials,credentialSaved=!credentials;
    let profile=options.profile || null,ready=false,busy=false,message='',step=0;
    let subjects=[],modules=[],selected=[],counts={},classification={label:'年级',options:['高一','高二','高三']},grade='';
    let school=null,schoolQuery='',schoolMatches=[],searchTimer,searchSeq=0,schoolSearching=false;
    let goal={subjects:{},totalGoal:null,targetRank:null,school:'',date:'',dateName:''},sharing=false,sharingConfigured=false;
    let initial={},appearance=visual(),initialVisual=clone(appearance),benefits=null,benefitError='';
    let rename=user.username,password='',confirmation='',showPassword=false,privacyLoaded=false;
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
      const options=Array.from(new Set(EXTRAS.concat(subjects.map(s=>s.name).filter(n=>!CORE.includes(n)))));
      return heading('选科与组合','选好科目，再看看组合。',!isNew&&modules.length)+'<div class="sg-chips" aria-label="所选科目">'+options.map(n=>choice(n,'data-elective="'+esc(n)+'"',selected.includes(n))).join('')+'</div><div class="sg-section-line"><span>成绩组合</span><button type="button" class="sg-text" data-recommend>应用推荐组合</button></div><div class="sg-combinations">'+modules.map((m,i)=>'<section class="sg-combination" data-module-row="'+i+'"><div class="sg-combination-title">'+(m.isBuiltin?'<b>'+esc(m.name===BUILTINS[0]?'三科组合':m.name===BUILTINS[1]?'四科组合':m.name===BUILTINS[2]?'六科组合':m.name)+'</b>':input('module-name',m.name,'名称','maxlength="30"'))+(!m.isBuiltin?'<button type="button" class="sg-remove" data-remove-module="'+i+'" aria-label="删除组合">×</button>':'')+'</div><p class="sg-members">'+esc(m.subjects.join(' · '))+'</p>'+countFields('m:'+i)+'<details class="sg-fold"><summary>调整科目</summary><div class="sg-chips">'+subjects.map(s=>choice(s.name,'data-member="'+esc(s.name)+'" data-module="'+i+'"',m.subjects.includes(s.name))).join('')+'</div></details></section>').join('')+'</div><button type="button" class="sg-text" data-add-module>＋ 添加组合</button>';
    }
    function classificationPage() {
      const preset=classification.label==='年级'&&same(classification.options,['初一','初二','初三'])?'junior':classification.label==='年级'&&same(classification.options,['高一','高二','高三'])?'senior':'custom';
      return heading('按年级整理考试','当前年级会作为新考试的默认分类。',!isNew&&initial.classification?.options?.length)+'<div class="sg-presets">'+[['junior','初中','初一 · 初二 · 初三'],['senior','高中','高一 · 高二 · 高三']].map(([id,title,sub])=>'<button type="button" class="sg-preset" data-preset="'+id+'" aria-pressed="'+(preset===id)+'"><strong>'+title+'</strong><span>'+sub+'</span></button>').join('')+'</div><label class="sg-field"><span>当前'+esc(classification.label)+'</span><select data-field="grade"><option value="">暂不选择</option>'+classification.options.map(n=>'<option '+(n===grade?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label><details class="sg-fold"'+(preset==='custom'?' open':'')+'><summary>自定义分类</summary>'+input('category-label',classification.label,'分类名称','maxlength="16"')+input('category-options',classification.options.join('、'),'分类选项','placeholder="用顿号分隔" maxlength="250"')+'</details>';
    }
    function schoolResults() { return (schoolSearching?'<p class="sg-note">查找中…</p>':'')+schoolMatches.map((s,i)=>'<button type="button" data-school="'+i+'" class="sg-school-option"><b>'+esc(s[0])+'</b><small>'+esc(s.slice(1,4).filter(Boolean).join(' · '))+'</small></button>').join('')+(schoolQuery&&!schoolSearching&&!schoolMatches.length?'<p class="sg-note">将保存：'+esc(schoolQuery)+'</p>':''); }
    function schoolPage() { return heading('你的学校','搜索，或直接填写。',!!initial.school)+'<label class="sg-field sg-school-search"><span class="sg-sr">学校名称</span><input data-field="school" value="'+esc(schoolQuery)+'" maxlength="100" autocomplete="off" placeholder="输入学校名称"></label><div class="sg-school-results" aria-live="polite">'+schoolResults()+'</div>'; }
    function goalPage() {
      return heading('给自己一个目标','先定一个小目标，也可以之后再填。',!!initial.goal&&(initial.goal.totalGoal!=null||Object.keys(initial.goal.subjects||{}).length||initial.goal.targetRank!=null))+'<div class="sg-goal-grid">'+input('goal-total',goal.totalGoal,'目标总分','type="number" min="0" max="9999" step="0.01" inputmode="decimal" placeholder="例如 600"')+input('goal-rank',goal.targetRank,'目标年级名次','type="number" min="1" max="10000000" inputmode="numeric" placeholder="例如 100"')+'</div>'+input('goal-school',goal.school,'理想学校','maxlength="40" placeholder="选填"')+'<details class="sg-fold"><summary>单科目标</summary><div class="sg-goal-grid">'+subjects.map(s=>input('goal-subject:'+s.name,goal.subjects[s.name],s.name,'type="number" min="0" max="1000" step="0.01" inputmode="decimal" placeholder="满分 '+esc(s.defaultMax)+'"')).join('')+'</div></details>';
    }
    function appearancePage() {
      return heading('选一种喜欢的样子','点选，即刻预览。',!isNew)+'<div class="sg-appearance-preview"><span>每一步，都算数。</span><p>记录今天，看见自己的进步。</p><div class="sg-preview-chart" aria-hidden="true"><svg viewBox="0 0 400 70"><path d="M0 60 C40 60 40 15 80 28 S140 65 180 39 S250 50 280 20 S350 32 400 6"/></svg></div></div><div class="sg-themes">'+Object.entries(THEMES).map(([id,name])=>'<button type="button" data-theme="'+id+'" aria-pressed="'+(appearance.theme===id)+'"><i class="sg-swatch sg-swatch-'+id+'"></i>'+name+'</button>').join('')+'</div><div class="sg-section-line"><span>字体</span></div><div class="sg-chips">'+Object.entries(FONTS).map(([id,name])=>choice(name,'data-font="'+id+'"',appearance.font===id)).join('')+'</div><div class="sg-section-line"><span>字号</span></div><div class="sg-chips">'+[['compact','紧凑'],['standard','标准'],['large','大字']].map(([id,name])=>choice(name,'data-size="'+id+'"',appearance.size===id)).join('')+'</div>';
    }
    function privacyPage() {
      return heading('你的数据，你来决定','使用前，了解这几件事。')+'<div class="sg-privacy-list"><section><span class="sg-privacy-icon">01</span><div><h2>成绩与设置</h2><p>保存在账号下，用于记录、统计和跨设备同步。</p></div></section><section><span class="sg-privacy-icon">02</span><div><h2>AI 图片识别</h2><p>使用时，图片会发送给配置的 AI 服务处理；上传资料与识别记录会保存。</p></div></section><section><span class="sg-privacy-icon">03</span><div><h2>运行记录</h2><p>记录访问、操作和错误信息，用于排错与改进。</p></div></section></div><section class="sg-sharing"><div><h2>参与匿名轨迹匹配</h2><p>让其他用户匹配你的匿名成绩走势，不显示用户名。可随时关闭。</p></div><label class="sg-switch"><input type="checkbox" id="sg-sharing" '+(sharing?'checked':'')+' '+(!privacyLoaded?'disabled':'')+'><span aria-hidden="true"></span><b class="sg-sr">参与匿名轨迹匹配</b></label></section>'+(sharingConfigured?'<p class="sg-note">已沿用你现有的选择。</p>':'')+'<details class="sg-fold"><summary>查看详细说明</summary><p>成绩、目标、学校与设置用于提供对应功能。图片识别仅在你主动提交时调用 AI；上传前可遮盖姓名、学号等无关信息。服务会保存必要的使用记录。匿名匹配不会向匹配用户展示你的账号名称，但不应视为无法被关联的保证。你可以在设置中修改授权，也可以导出或删除自己的成绩。</p></details>';
    }
    function levelPage() {
      if(!benefits)return heading('你的成长，从这里继续','')+'<div class="sg-level-empty"><p>'+esc(benefitError||'正在读取账号等级…')+'</p><button type="button" class="sg-text" data-retry-level>重新读取</button></div>';
      const g=benefits.growth,c=benefits.credits,next=(g.levels||[]).find(l=>l.level===g.level+1),progress=next?Math.min(100,Math.max(0,100*g.points/next.threshold)):100;
      return heading(isNew?'准备好了。':'欢迎继续，'+esc(state.user.username)+'。','每一次有效记录，都会积累成长。')+'<div class="sg-level-orbit"><span>ACCOUNT LEVEL</span><strong><small>Lv.</small>'+g.level+'</strong><span>'+Number(g.points).toLocaleString()+' 成长分</span></div><div class="sg-level-progress"><i style="width:'+progress+'%"></i></div><p class="sg-note sg-center">'+(next?'距 Lv.'+next.level+' 还需 '+Math.max(0,next.threshold-g.points)+' 成长分'+(next.min_days||next.min_months?' · 需满足使用时长':''):'已达到最高等级')+'</p><div class="sg-benefits"><div><b>'+Number(c.available).toLocaleString()+'</b><span>可用 AI 积分</span></div><div><b>'+Number(c.monthly).toLocaleString()+'</b><span>每月积分</span></div></div>';
    }
    function content() {
      if(step===0)return '<div class="sg-welcome"><div class="sg-welcome-mark" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M22 74L46 50L58 61L79 27M56 27H79V50"/></svg></div><span class="sg-kicker">SCORE TRACKER</span><h1 id="sg-title" tabindex="-1">Hi '+esc(state.user.username)+'，</h1><p>'+(isNew?'欢迎使用 Score Tracker！':'欢迎回来！')+'</p></div>';
      if(step===1&&isNew&&!credentialSaved)return account();
      if(!ready)return heading('正在准备你的设置',message||'稍等片刻…')+'<button type="button" class="sg-text" data-retry>重新加载</button>';
      return [null,account,subjectPage,combinationPage,classificationPage,schoolPage,goalPage,appearancePage,privacyPage,levelPage][step]();
    }
    function draw(animate=true) {
      if(!current())return;
      root.innerHTML='<div class="sg-shell"><header class="sg-top"><span class="sg-brand">↗ <span>Score Tracker</span></span><span class="sg-position">'+(step===0?'让进步有迹可循':STEPS[step]+' <span>'+step+' / 9</span>')+'</span></header><div class="sg-progress" role="progressbar" aria-label="设置进度" aria-valuenow="'+step+'" aria-valuemin="0" aria-valuemax="9"><i style="width:'+(step/9*100)+'%"></i></div><main class="sg-main '+(step===0?'sg-intro ':'')+(animate?'sg-enter':'')+'">'+content()+'</main><footer class="sg-footer"><div><button type="button" class="sg-back" data-back '+(step===0?'hidden':'')+'>← 上一步</button></div><div class="sg-footer-right">'+(step>1&&step<8?'<button type="button" class="sg-skip" data-skip>稍后设置</button>':'')+'<button type="button" class="sg-next" data-next '+(busy||step>0&&!ready||step===8&&!privacyLoaded?'disabled':'')+'>'+(busy?'保存中…':step===0?'开始':step===1&&!credentialSaved?'已保存，继续':step===8?'知道了，继续':step===9?'开始记录':'继续')+' <span aria-hidden="true">→</span></button></div><p class="sg-error" role="alert">'+esc(message)+'</p></footer></div>';
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
      if(step===4){classification={label:value('category-label').trim(),options:value('category-options').split(/[、,，\n]/).map(s=>s.trim()).filter(Boolean)};grade=value('grade')||'';}
      if(step===6){goal.totalGoal=value('goal-total');goal.targetRank=value('goal-rank');goal.school=value('goal-school').trim();subjects.forEach(s=>{goal.subjects[s.name]=value('goal-subject:'+s.name);});}
      if(step===8&&privacyLoaded)sharing=root.querySelector('#sg-sharing').checked;
    }
    async function checkpoint(next,extra={}) {
      if(!current())return;
      const result=await setup('save',{guide_step:next,...extra},token);
      if(!current())return;
      profile=result.profile;state.setupProfile=profile;
    }
    async function saveCounts(items) {
      const defaults={};
      items.forEach(([draftKey,savedKey])=>{const row=counts[draftKey]||{},prev=initial.defaults[savedKey]||{},patch={};['year','class'].forEach(scope=>{const n=number(row[scope],'人数',10000000,true);if(n!==(prev[scope]??null))patch[scope]=n;});if(Object.keys(patch).length)defaults[savedKey]=patch;});
      if(Object.keys(defaults).length){await dataApiV7('save_participant_defaults',{defaults});if(!current())return;Object.entries(defaults).forEach(([key,row])=>initial.defaults[key]={...initial.defaults[key],...row});}
    }
    function recommend() {
      if(selected.length!==3)throw Error('请选择 3 门选科');
      const primary=selected.includes('物理')?'物理':selected.includes('历史')?'历史':selected[0];
      [CORE,CORE.concat(primary),CORE.concat(selected)].forEach((names,i)=>{let m=modules.find(m=>m.name===BUILTINS[i]);if(m)m.subjects=names.slice();else modules.push({name:BUILTINS[i],subjects:names.slice(),isBuiltin:true});});
    }
    async function advance(skip) {
      if(busy||!current())return;
      message='';capture();
      if(step===0){step=1;draw();return;}
      if(step===1&&!credentialSaved){credentialSaved=true;draw();return;}
      if(!ready)return;
      if(skip){
        if(step===2){subjects=clone(initial.subjects);counts.total=clone(initial.defaults.total||{});subjects.forEach((s,i)=>counts['s:'+i]=clone(initial.defaults['s:'+s.name]||{}));}
        if(step===3){modules=clone(initial.modules);selected=clone(profile.selected_subjects||[]);modules.forEach((m,i)=>counts['m:'+i]=clone(initial.defaults['m:'+m.id]||{}));}
        if(step===4){classification=clone(initial.classification);grade=profile.current_grade||'';}
        if(step===5){school=clone(initial.school);schoolQuery=school?.name||'';}
        if(step===6)goal=clone(initial.goal);
      }
      busy=true;draw(false);
      try {
        if(!skip&&step===1){
          if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(rename))throw Error('用户名需为 2～24 位中文、字母、数字、横线或下划线');
          if(password||confirmation){if(!/^[\x21-\x7e]{6,20}$/.test(password))throw Error('密码需为 6～20 位字母、数字或符号');if(password!==confirmation)throw Error('两次密码不一致');}
          if(rename!==state.user.username){const r=await usernameApiV19('rename',{username:rename});if(!current())return;state.user.username=r.user.username;if(credentials)credentials.username=r.user.username;}
          if(password){await changePasswordApiV15(password);if(!current())return;if(credentials)credentials.password=password;password=confirmation='';}
        }
        if(!skip&&step===2){
          if(!subjects.length||subjects.some(s=>!s.name)||new Set(subjects.map(s=>s.name)).size!==subjects.length)throw Error('请填写科目名称，且不要重复');
          subjects.forEach(s=>{s.defaultMax=number(s.defaultMax,'满分',9999,false);if(!s.defaultMax)throw Error('满分需大于 0');});
          Object.entries(counts).filter(([k])=>k==='total'||k.startsWith('s:')).forEach(([,r])=>['year','class'].forEach(k=>number(r[k],'人数',10000000,true)));
          if(!same(subjects,initial.subjects)){const d=await dataApiV7('save_subjects',{subjects});if(!current())return;state.subjectConfigs=d.subjects;subjects=clone(d.subjects);initial.subjects=clone(subjects);}
          await saveCounts([['total','total'],...subjects.map((s,i)=>['s:'+i,'s:'+s.name])]);if(!current())return;
        }
        if(!skip&&step===3){
          const allowed=selected.filter(n=>EXTRAS.includes(n));if(allowed.length&&allowed.length!==3)throw Error('请选择 3 门选科，或取消选择');
          modules.forEach(m=>{if(!m.name||new Set(modules.map(m=>m.name)).size!==modules.length)throw Error('请填写组合名称，且不要重复');const n=m.subjects.length,i=BUILTINS.indexOf(m.name);if(n<2||i>=0&&n!==[3,4,6][i])throw Error(m.name+'需要 '+(i>=0?[3,4,6][i]:'至少 2')+' 门科目');});
          Object.entries(counts).filter(([k])=>k.startsWith('m:')).forEach(([,r])=>['year','class'].forEach(k=>number(r[k],'人数',10000000,true)));
          if(!same(modules,initial.modules)){const d=await modulesApiV18('save_modules',{modules});if(!current())return;state.modulesV18=d.modules;modules=clone(d.modules);initial.modules=clone(modules);}
          await saveCounts(modules.map((m,i)=>['m:'+i,'m:'+m.id]));if(!current())return;
          await checkpoint(4,{selected_subjects:allowed});
        }
        if(!skip&&step===4){
          if(!classification.label||!classification.options.length||new Set(classification.options).size!==classification.options.length)throw Error('请填写分类名称和不重复的选项');
          if(!same(classification,initial.classification)){const d=await dataApiV7('save_classification',{classification});if(!current())return;state.classification=d.classification;classification=clone(d.classification);initial.classification=clone(classification);}
          grade=classification.options.includes(grade)?grade:'';await checkpoint(5,{current_grade:grade});
        }
        if(!skip&&step===5&&schoolQuery.trim()){
          const next=school||{name:schoolQuery.trim(),source:'manual'};
          if(!same(next,initial.school)){const d=await setup('school_save',{school:next},token);if(!current())return;profile=d.profile;state.setupProfile=profile;initial.school=clone(next);}
        }
        if(!skip&&step===6){
          goal.totalGoal=number(goal.totalGoal,'目标总分',9999,false);goal.targetRank=number(goal.targetRank,'目标名次',10000000,true);
          const gs={};Object.entries(goal.subjects).forEach(([n,v])=>{const score=number(v,n+'目标',1000,false);if(score!==null)gs[n]=score;});goal.subjects=gs;
          if(!same(goal,initial.goal)){await dataApiV7('save_goal',{goal});if(!current())return;initial.goal=clone(goal);window.__v33?.reload();}
        }
        if(step===7){if(skip){appearance=clone(initialVisual);applyVisual(appearance,true);}else{applyVisual(appearance,true);initialVisual=clone(appearance);}}
        if(step===8){
          if(!privacyLoaded)throw Error('隐私设置尚未读取，请重试');
          await call('score-tracker-trajectories','sharing',{enabled:sharing},token);if(!current())return;
          await checkpoint(9,{privacy_notice_version:1});
        }
        if(step===9){await checkpoint(9,{preference_guide_version:VERSION,completed:true,step:6});if(!current())return;attempted=key;close(false);render();track('setup_completed',9);return;}
        if(!current())return;
        if(step!==3&&step!==4&&step!==8||skip)await checkpoint(step+1);
        if(!current())return;
        track(skip?'setup_step_skipped':'setup_step_completed',step);step++;busy=false;message='';draw();if(step===9)loadBenefits();
      }catch(error){if(current()){message=error.message||'暂时没有保存成功';busy=false;draw(false);}}
    }
    async function loadBenefits() {
      benefitError='';
      try{const d=await dataApiV7('account_status');if(current()){benefits=d.account;if(step===9)draw(false);}}
      catch(_){if(current()){benefitError='等级暂时未能读取，稍后可在账号页查看。';if(step===9)draw(false);}}
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
      root.querySelector('[data-back]').onclick=()=>{if(busy)return;capture();message='';step=Math.max(0,step-1);draw();};
      root.querySelector('[data-retry]')?.addEventListener('click',prepare);
      root.querySelector('[data-retry-level]')?.addEventListener('click',loadBenefits);
      root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(credentials[b.dataset.copy]);if(current())b.textContent='已复制';}catch(_){message='请长按复制，或截图保存';draw(false);}});
      root.querySelector('[data-reveal]')?.addEventListener('click',()=>{capture();showPassword=!showPassword;draw(false);});
      root.querySelector('[data-add-subject]')?.addEventListener('click',()=>{capture();if(subjects.length>=20)return;subjects.push({name:'',defaultMax:100});draw(false);root.querySelector('[data-subject-row="'+(subjects.length-1)+'"] input')?.focus();});
      root.querySelectorAll('[data-remove-subject]').forEach(b=>b.onclick=()=>{capture();if(subjects.length<=1)return;const i=+b.dataset.removeSubject;subjects.splice(i,1);const old=clone(counts);subjects.forEach((s,n)=>counts['s:'+n]=old['s:'+(n>=i?n+1:n)]||{});draw(false);});
      root.querySelectorAll('[data-elective]').forEach(b=>b.onclick=()=>{capture();const name=b.dataset.elective;if(selected.includes(name))selected=selected.filter(n=>n!==name);else if(selected.length<3)selected.push(name);else{message='最多选择 3 门';draw(false);return;}if(isNew&&selected.length===3){try{recommend();}catch(_){}}message='';draw(false);});
      root.querySelector('[data-recommend]')?.addEventListener('click',()=>{capture();try{recommend();message='';}catch(e){message=e.message;}draw(false);});
      root.querySelector('[data-add-module]')?.addEventListener('click',()=>{capture();if(modules.length>=12)return;modules.push({name:'',subjects:[],isBuiltin:false});draw(false);});
      root.querySelectorAll('[data-remove-module]').forEach(b=>b.onclick=()=>{capture();const i=+b.dataset.removeModule;modules.splice(i,1);const old=clone(counts);modules.forEach((m,n)=>counts['m:'+n]=old['m:'+(n>=i?n+1:n)]||{});draw(false);});
      root.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{capture();const m=modules[+b.dataset.module],n=b.dataset.member;m.subjects=m.subjects.includes(n)?m.subjects.filter(s=>s!==n):m.subjects.concat(n);draw(false);});
      root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{classification={label:'年级',options:b.dataset.preset==='junior'?['初一','初二','初三']:['高一','高二','高三']};grade=classification.options.includes(grade)?grade:'';draw(false);});
      root.querySelector('[data-field="school"]')?.addEventListener('input',e=>{schoolQuery=e.target.value;searchSchool();});bindSchools();
      root.querySelectorAll('[data-theme],[data-font],[data-size]').forEach(b=>b.onclick=()=>{appearance[b.hasAttribute('data-theme')?'theme':b.hasAttribute('data-font')?'font':'size']=b.dataset.theme||b.dataset.font||b.dataset.size;applyVisual(appearance,false);draw(false);});
      root.querySelector('#sg-sharing')?.addEventListener('change',e=>{sharing=e.target.checked;});
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
        const status=await call('score-tracker-trajectories','privacy_status',{},token);if(!current())return;
        subjects=clone(state.subjectConfigs||[]);modules=clone(state.modulesV18||[]);classification=clone(state.classification||classification);
        if(!subjects.length)throw Error('科目尚未加载，请重试');
        selected=clone(profile.selected_subjects||[]);grade=profile.current_grade||'';
        if(!selected.length&&!isNew){const m=modules.find(m=>m.name===BUILTINS[2]);selected=(m?.subjects||[]).filter(n=>EXTRAS.includes(n));}
        school=clone(profile.school||null);schoolQuery=school?.name||'';
        goal={subjects:{},totalGoal:null,targetRank:null,school:'',date:'',dateName:'',...g.goal};
        sharing=!!status.enabled;sharingConfigured=!!status.configured;privacyLoaded=true;
        const savedDefaults=window.ScoreParticipantDefaults?.snapshot?.()||{};
        counts.total=clone(savedDefaults.total||{});subjects.forEach((s,i)=>counts['s:'+i]=clone(savedDefaults['s:'+s.name]||{}));modules.forEach((m,i)=>counts['m:'+i]=clone(savedDefaults['m:'+m.id]||{}));
        initial={subjects:clone(subjects),modules:clone(modules),classification:clone(classification),school:clone(school),goal:clone(goal),defaults:clone(savedDefaults)};
        state.setupProfile=profile;ready=true;state.setupGuideLoading=false;draw(false);loadBenefits();
      }catch(e){if(current()){message=e.message||'设置加载失败';draw(false);}}
    }
    draw();track('setup_shown',0);prepare();
  }
  async function maybe() {
    const key=identity();
    if(key!==lastOwner){lastOwner=key;attempted='';if(active&&active.key!==key)active.close(true);}
    if(!key){state.setupGuideLoading=false;return;}
    if(active||attempted===key||loadingOwner===key)return;
    if(state.onboarding?.password){open({credentials:state.onboarding});return;}
    state.setupGuideLoading=true;loadingOwner=key;
    try{const d=await setup('get',{},state.token);if(identity()!==key)return;state.setupProfile=d.profile;attempted=key;if(Number(d.profile?.preference_guide_version||0)<VERSION)open({profile:d.profile});}
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
