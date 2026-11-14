/* A checked question ledger feeds marks and optional AI reports. */
(function () {
  'use strict';
  var esc = function (v) { return escapeHtml(String(v == null ? '' : v)); };
  var names = { strengths:'优势与得分步骤', difficulty:'题目难度', causes:'失分原因', solutions:'关键解答', practice:'针对性练习', patterns:'跨题共性', plan:'复习安排' };
  function track(event, data) { if (window.__scoreTrackerTrack) window.__scoreTrackerTrack(event, data, 'stats'); }
  function fields(q, c) {
    var level = c.question_difficulty ?? q.question_difficulty ?? '';
    return '<div class="pr-score-fields"><label>题型名称<input data-field="question_type" maxlength="40" placeholder="如：阅读理解 / 填空题" value="' + esc(c.question_type ?? q.question_type) + '"></label><label>题目难度（选填）<select data-field="question_difficulty"><option value="">未标注</option>' + Object.keys(ScoreQuestionTypeModel.difficulties).map(function (k) { return '<option value="' + k + '"' + (k === level ? ' selected' : '') + '>' + ScoreQuestionTypeModel.difficulties[k] + '</option>'; }).join('') + '</select></label></div>';
  }
  function valueOf(c,q,key){return Object.prototype.hasOwnProperty.call(c,key)?c[key]:q[key];}
  function questionState(q, c) {
    var reasons=[];
    if (!(valueOf(c,q,'stem') || '').trim()) reasons.push('缺少题干');
    if (valueOf(c,q,'teacher_score') == null) reasons.push('缺少得分');
    if (valueOf(c,q,'max_score') == null) reasons.push('缺少满分');
    if (!(valueOf(c,q,'question_type') || '').trim()) reasons.push('未填题型');
    if (!c.verified && (q.score_verification === 'conflict' || q.review_status === 'teacher_conflict')) reasons.push('批改分有冲突');
    if (!c.verified && (q.confidence === 'low' || q.analysis_mode === 'needs_confirmation')) reasons.push('识别内容待确认');
    return { reasons:reasons, verified:!!c.verified };
  }
  function live(main, row) {
    return row.result.questions.map(function(q){
      var node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(q.id);}),old=(row.corrections||[]).find(function(c){return c.id===q.id;})||{};
      function value(k,fallback){var el=node && node.querySelector('[data-field="'+k+'"]');if(!el)return fallback;if(el.type==='checkbox')return el.checked;if(el.type==='number')return el.value.trim()===''?null:Number(el.value);return el.value;}
      return {q:q,c:{stem:value('stem',valueOf(old,q,'stem')),answer:value('answer',valueOf(old,q,'answer')),question_type:value('question_type',valueOf(old,q,'question_type')),question_difficulty:value('question_difficulty',valueOf(old,q,'question_difficulty')),teacher_score:value('teacher_score',valueOf(old,q,'teacher_score')),max_score:value('max_score',valueOf(old,q,'max_score')),verified:value('verified',!!old.verified)}};
    });
  }
  function totals(items) {
    var groups=new Map(),untyped=0,unverified=0;
    items.forEach(function(item){var c=item.c,name=(c.question_type||'').trim();if(!name){untyped++;return;}if(!c.verified)unverified++;
      var g=groups.get(name)||{name:name,score:0,max:0,levels:[]};
      g.score=g.score==null||c.teacher_score==null?null:Math.round((g.score+c.teacher_score)*100)/100;
      g.max=g.max==null||c.max_score==null?null:Math.round((g.max+c.max_score)*100)/100;
      g.levels.push(c.question_difficulty);groups.set(name,g);
    });
    return {rows:Array.from(groups.values()).map(function(g){var level=g.levels[0];return {name:g.name,score:g.score,max:g.max,difficulty:level&&g.levels.every(function(x){return x===level;})?level:''};}),untyped:untyped,unverified:unverified};
  }
  function existingFor(row) {
    var exam=(state.allExams||state.exams||[]).find(function(e){return e.id===row.exam_id;});return exam && exam.question_type_scores && exam.question_type_scores[row.subject] || [];
  }
  function drawSync(panel, data, linked) {
    panel.innerHTML='<h3>本场题型得分</h3><p class="pr-muted">按已录题型合计卷面批改分；AI 估分不计入。</p>'+(data.rows.length?'<div class="pr-type-table"><table><thead><tr><th>题型</th><th>得分 / 满分</th><th>难度</th></tr></thead><tbody>'+data.rows.map(function(r){return '<tr><td>'+esc(r.name)+'</td><td>'+esc(r.score==null?'待补全':r.score)+' / '+esc(r.max==null?'待补全':r.max)+'</td><td>'+esc(ScoreQuestionTypeModel.difficulties[r.difficulty]||'未标注')+'</td></tr>';}).join('')+'</tbody></table></div>':'<p>填写题型名称后，这里会自动汇总。</p>')+
      '<p class="pr-muted">'+(data.untyped?data.untyped+' 题未填题型，不纳入本次汇总。':'')+(data.unverified?data.unverified+' 题尚未对照原卷核对。':'')+'缺少得分或满分的题型保存为待补全，不参与统计。</p>'+
      (data.existing.length?'<details><summary>查看本科已有的 '+data.existing.length+' 项题型</summary><p>'+data.existing.map(function(r){return esc(r.name)+'：'+esc(r.score==null?'—':r.score)+' / '+esc(r.max==null?'—':r.max);}).join('；')+'</p></details><label class="pr-check"><input type="checkbox" data-replace-types>用上方汇总替换本科已有题型得分</label>':'')+
      (!linked?'<p>关联考试后，即可把这里的得分更新到题型分析。</p>':'')+
      '<div class="pr-footer">'+(linked?'<button type="button" class="pr-button pr-primary" data-sync-types>保存并更新题型得分</button>':'')+'<button type="button" class="pr-button" data-pr="save">只保存试题</button></div><p role="status" data-sync-note></p>';
  }
  function decorate(main,row,ctx,api,note,hooks) {
    var overview=document.createElement('section');overview.className='pr-record-overview';overview.setAttribute('aria-label','核对概览');
    main.querySelector('.pr-result-top').after(overview);
    var panel=document.createElement('section');panel.className='pr-type-sync pr-insight';
    main.querySelector('[data-report-section="questions"] > .pr-footer').replaceWith(panel);
    function update(){
      var items=live(main,row),pending=items.filter(function(i){return questionState(i.q,i.c).reasons.length;}),verified=items.filter(function(i){return i.c.verified;}).length;
      var total=row.result.total||{};
      overview.innerHTML='<div class="pr-check-metrics"><div><b>'+items.length+'</b><span>已识别题目</span></div><div><b>'+pending.length+'</b><span>处需要核对</span></div><div><b>'+verified+' / '+items.length+'</b><span>已对照原卷</span></div>'+(total.score!=null?'<div><b>'+esc(total.score)+(total.max!=null?' / '+esc(total.max):'')+'</b><span>卷面批改总分</span></div>':'')+'</div><p>'+ (pending.length?'先检查下方标出的缺失或冲突，其余题目也可展开查看。':'未发现明显缺失或冲突；仍请对照原卷确认后更新题型得分。')+'</p>';
      items.forEach(function(item){var info=questionState(item.q,item.c),node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(item.q.id);});if(!node)return;
        node.dataset.needsConfirm=String(info.reasons.length>0);node.dataset.unverified=String(!info.verified);
        var brief=node.querySelector('.pr-record-brief');if(!brief){brief=document.createElement('small');brief.className='pr-record-brief';node.querySelector('summary>span').appendChild(brief);}
        brief.textContent=[item.c.question_type||'未分类',info.reasons.length?info.reasons.join(' · '):info.verified?'已核对':'未对照原卷'].join(' · ');
      });
      var data=totals(items);data.existing=existingFor(row);drawSync(panel,data,!!row.exam_id);
      var submit=panel.querySelector('[data-sync-types]'),replace=panel.querySelector('[data-replace-types]');
      function enabled(){if(submit)submit.disabled=!data.rows.length||data.unverified>0||!!replace&&!replace.checked;}
      if(replace)replace.onchange=enabled;enabled();
      if(submit)submit.onclick=async function(){
        var accepted=!!replace&&replace.checked;submit.disabled=true;
        try{
          var saved=await hooks.save();if(!saved)return;
          var preview=await api(ctx,'preview_types',{request_id:saved.request_id,revision:saved.revision});
          if(!main.isConnected)return;
          var active=main.querySelector('.pr-type-sync');
          if(preview.existing.length&&!accepted){[state.exams,state.allExams].forEach(function(list){(list||[]).forEach(function(e){if(e.id===row.exam_id){e.question_type_scores=e.question_type_scores||{};e.question_type_scores[row.subject]=preview.existing;}});});if(active.refresh)active.refresh();active.querySelector('[data-sync-note]').textContent='试题已保存；本科题型已发生变化，请重新核对后确认替换。';return;}
          if(preview.unverified)throw new Error('请先对照原卷核对已分类题目');
          var savedTypes=await api(ctx,'sync_types',{request_id:saved.request_id,revision:saved.revision,exam_version:preview.exam_version,replace:accepted});
          [state.exams,state.allExams].forEach(function(list){(list||[]).forEach(function(e){if(e.id===savedTypes.exam_id)e.question_type_scores=savedTypes.question_type_scores;});});
          if(!main.isConnected)return;
          main.querySelector('.pr-type-sync').innerHTML='<h3>试题与题型得分已保存</h3><p>已更新本场'+esc(row.subject)+'的 '+preview.rows.length+' 项题型。整科和总分保持原样。</p><button type="button" class="pr-button" data-view-types>查看题型分析</button>';
          main.querySelector('[data-view-types]').onclick=function(){if(ctx.canLeave&&!ctx.canLeave())return;if(ctx.dispose)ctx.dispose();window.ScoreQuestionTypeAnalysis.open(row.subject);};
          note('试题与题型得分已保存');track('paper_type_sync',{types:preview.rows.length,replaced:preview.existing.length>0});
        }catch(e){if(main.isConnected){note('题型得分未更新：'+e.message,true);var active=main.querySelector('[data-sync-types]');if(active)active.disabled=false;}}
      };
      var activeFilter=main.querySelector('[data-pr^="filter:"][aria-pressed=true]');if(activeFilter)activeFilter.click();
    }
    panel.refresh=update;update();
    live(main,row).forEach(function(item){var node=Array.from(main.querySelectorAll('[data-question]')).find(function(n){return n.dataset.question===String(item.q.id);});if(node&&questionState(item.q,item.c).reasons.length){node.open=true;var edit=node.querySelector('.pr-edit');if(edit)edit.open=true;}});
    main.querySelectorAll('.pr-question input,.pr-question textarea,.pr-question select').forEach(function(el){el.addEventListener('input',function(){
      if(el.dataset.field!=='verified'&&el.dataset.field!=='corrected'){var verified=el.closest('[data-question]').querySelector('[data-field=verified]');if(verified)verified.checked=false;}
      update();
    });});
  }
  function preferences(user){try{return JSON.parse(localStorage.getItem('st_paper_analysis_preferences_v1_'+user)||'{}');}catch(_){return {};}}
  function configure(host,row,hooks) {
    var user=hooks.user||String(state.user&&state.user.id||''),requestId=crypto.randomUUID(),draftId=crypto.randomUUID(),old=row.options||{},saved=preferences(user),defaults=['strengths','difficulty','causes','solutions','patterns'];
    var selectedModules=Array.isArray(saved.modules)?saved.modules.filter(function(k){return names[k];}):defaults;
    host.innerHTML='<section class="ph-create"><div class="ph-section-title"><div><h2>生成 AI 分析</h2><p>'+esc(row.subject)+' · '+row.result.questions.length+' 题 · 直接使用已保存的题目与作答。</p></div><button type="button" class="pr-button" data-back-record>返回试题</button></div><form class="pr-record-analysis"><label>分析范围<select name="scope"><option value="all">整张试卷</option><option value="losses">失分题优先</option><option value="selected">指定题目</option></select></label><fieldset data-question-picks hidden><legend>选择题目</legend>'+row.result.questions.map(function(q){return '<label class="pr-check"><input type="checkbox" name="question" value="'+esc(q.label)+'">第 '+esc(q.label)+' 题</label>';}).join('')+'</fieldset><label>你特别想了解什么？（选填）<textarea name="goal" maxlength="300" rows="2" placeholder="例如：数学大题主要丢分在哪里？"></textarea></label><details class="ph-context"><summary>更多设置</summary><label>讲解详略<select name="detail"><option value="brief">只讲关键点</option><option value="standard">讲清关键步骤</option><option value="detailed">从基础一步步讲</option></select></label><div class="ph-modules">'+Object.keys(names).map(function(k){return '<label class="pr-check"><input type="checkbox" name="module" value="'+k+'" '+(selectedModules.includes(k)?'checked':'')+'>'+names[k]+'</label>';}).join('')+'</div><label>单轮运行上限<select name="budget"><option value="3">3 分钟</option><option value="8">8 分钟</option><option value="15">15 分钟</option><option value="30">30 分钟</option></select></label><label>年级<input name="grade" maxlength="40" value="'+esc(saved.grade??old.grade)+'"></label><label>已学范围<input name="range" maxlength="200" value="'+esc(saved.learning_range??old.learning_range)+'"></label><label class="pr-check"><input type="checkbox" name="scans" checked>结合已保存原图理解图形</label><label class="pr-check"><input type="checkbox" name="history" '+(saved.use_account_history===false?'':'checked')+'>结合本账号历史成绩</label></details><p class="pr-muted">识别与生成分析各消耗 1 次；查看报告、手动核对和更新题型得分不消耗次数。</p><label class="pr-check pr-consent"><input type="checkbox" name="consent" required>同意将已保存的题目、作答与批改分，以及允许使用的原图和考试数值发送给 AI 服务生成分析。</label><div class="pr-footer"><span role="status" data-analysis-note></span><button class="pr-button pr-primary" type="submit">开始分析 · 消耗 1 次</button></div></form></section>';
    var form=host.querySelector('form');form.elements.detail.value=['brief','standard','detailed'].includes(saved.detail)?saved.detail:'standard';form.elements.budget.value=[3,8,15,30].includes(saved.time_budget_minutes)?String(saved.time_budget_minutes):'15';
    host.querySelector('[data-back-record]').onclick=function(){hooks.open(row.request_id);};
    form.elements.scope.onchange=function(){form.querySelector('[data-question-picks]').hidden=this.value!=='selected';};
    form.onsubmit=async function(e){
      e.preventDefault();var submit=form.querySelector('[type=submit]'),status=form.querySelector('[data-analysis-note]');if(String(state.user&&state.user.id||'')!==user){status.textContent='账号已切换，请重新打开试卷';return;}
      var selected=Array.from(form.querySelectorAll('[name=question]:checked')).map(function(b){return b.value;});
      if(!form.elements.consent.checked){status.textContent='请先确认 AI 分析说明';return;}
      if(form.elements.scope.value==='selected'&&!selected.length){status.textContent='请至少选择一道题';return;}
      submit.disabled=true;status.textContent='正在创建分析…';
      try{
        var options=Object.assign({},old,{config_version:2,purpose:'analysis',use_source_scans:form.elements.scans.checked,use_account_history:form.elements.history.checked,review_before_analysis:false,analysis_scope:form.elements.scope.value,selected_questions:selected,detail:form.elements.detail.value,time_budget_minutes:Number(form.elements.budget.value),grade:form.elements.grade.value,learning_range:form.elements.range.value,goal:form.elements.goal.value,modules:Array.from(form.querySelectorAll('[name=module]:checked')).map(function(b){return b.value;})});
        var data=await hooks.api('analyze_record',{request_id:requestId,draft_id:draftId,source_request_id:row.request_id,source_revision:row.revision,consent:true,options:options});
        if(!host.isConnected)return;
        try{localStorage.setItem('st_paper_analysis_preferences_v1_'+user,JSON.stringify({detail:options.detail,time_budget_minutes:options.time_budget_minutes,grade:options.grade,learning_range:options.learning_range,modules:options.modules,use_account_history:options.use_account_history}));}catch(_){}
        track('paper_analysis_from_record',{questions:row.result.questions.length,scope:options.analysis_scope});await hooks.started(data.request_id);
      }catch(err){if(host.isConnected){status.textContent=err.message+'；重试不重复计次。';submit.disabled=false;}}
    };
  }
  window.ScorePaperRecords={fields:fields,decorate:decorate,questionState:questionState,configure:configure};
  var style=document.createElement('style');
  style.textContent='.ph-workspace>.ph-header[hidden]{display:none!important}.pr-record-view .pr-result-top{background:transparent;padding:0;margin:0 0 16px}.pr-record-view .pr-result-top h3{font-size:22px!important;margin:6px 0}.pr-record-view .pr-report-nav{display:none}.pr-record-view .pr-first-action{padding:0;background:none;margin:16px 0}.pr-record-view .pr-first-action p{margin:0}.pr-record-view .pr-reading-section{padding-top:20px!important;margin-top:20px!important}.pr-type-table{overflow-x:auto}.pr-type-table table{width:100%;border-collapse:collapse;font-size:14px}.pr-type-table th,.pr-type-table td{padding:12px 8px;border-bottom:1px solid var(--line);text-align:left}.pr-type-table td:first-child{overflow-wrap:anywhere}.pr-type-sync .pr-footer{flex-wrap:wrap}.pr-record-analysis>label{display:block;margin:18px 0}.pr-record-analysis fieldset{border:1px solid var(--line);border-radius:10px}.pr-record-overview{padding:18px;border:1px solid var(--line);border-radius:14px;margin:18px 0;background:var(--panel-solid)}.pr-check-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pr-check-metrics>div{display:flex;flex-direction:column;gap:6px}.pr-check-metrics b{font-size:23px}.pr-check-metrics span,.pr-record-overview p,.pr-record-brief{font-size:13px;color:var(--muted);line-height:1.7}.pr-record-brief{display:block;margin-top:3px}.ph-paper-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}.ph-paper-bar nav{display:flex;gap:8px}.ph-paper-bar [aria-pressed=true]{color:var(--accent);background:var(--accent-soft);border-color:var(--accent)}.ph-list-filters{margin:14px 0 20px}.pr-upload-extra>summary{padding:16px 0;cursor:pointer;font-size:15px;font-weight:600}.ph-list-filters summary{cursor:pointer;font-size:14px;color:var(--muted)}.ph-workspace .pr-inline .pr-head{display:none}.ph-report-list>p{line-height:1.7}.ph-report-list>.ph-list{margin-top:20px}.ph-report-list>.pr-button{margin:8px 0}.ph-tabs{flex-wrap:wrap}.ph-tabs button{white-space:nowrap}.pr-question[data-needs-confirm=true]>summary{border-left:3px solid #ba7c2d}.pr-type-sync .pr-check{margin:16px 0}.pr-record-overview p{margin-bottom:0}.ph-workspace .pr-record-analysis input[type=checkbox],.ph-workspace .pr-record-analysis input[type=radio]{width:16px;height:16px;flex:none}.pr-report-extra>summary{padding:16px;cursor:pointer;font-weight:600;color:var(--accent)}.pr-report-extra{margin:20px 0;border:1px solid var(--line);border-radius:12px}.pr-report-extra>.pr-reading-section{margin:0!important;padding:20px!important;border:0!important}@media(max-width:520px){.pr-check-metrics{grid-template-columns:1fr 1fr}.pr-type-sync .pr-button{width:100%}.ph-paper-bar nav{width:100%}.ph-paper-bar nav .pr-button{flex:1}.ph-tabs button{flex:1 1 auto;padding:9px 8px}}';
  document.head.appendChild(style);
})();
