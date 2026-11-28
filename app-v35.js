/* app-v35.js · v6.1 usability fixes: multi-category trends, safe drafts and viewport stability. */
(function(){
  'use strict';
  if(window.__v35)return;window.__v35=1;

  function esc61(v){return typeof escapeHtml==='function'?escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function userKey61(){return String(state&&state.user&&(state.user.id||state.user.username)||'guest');}
  function filterKey61(){return 'st_category_filters_v61_'+userKey61();}
  function draftKey61(){return 'st_exam_draft_v61_'+userKey61();}
  function categoryValues61(){var a=[];try{a=(categoryOptionsV14()||[]).slice();}catch(e){}if((state.allExams||[]).some(function(x){return !x.grade_level;}))a.push('未分类');return Array.from(new Set(a));}
  function hydrateFilters61(){
    var key=filterKey61();if(state._v61FilterKey===key)return;state._v61FilterKey=key;
    var saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]');}catch(e){}
    if(!Array.isArray(saved))saved=[];
    if(!saved.length&&state.gradeFilter&&state.gradeFilter!=='全部')saved=[state.gradeFilter];
    state.gradeFiltersV61=saved;
  }
  function cleanFilters61(){hydrateFilters61();var allowed=categoryValues61();state.gradeFiltersV61=(state.gradeFiltersV61||[]).filter(function(x){return allowed.indexOf(x)>-1;});}
  function saveFilters61(){try{localStorage.setItem(filterKey61(),JSON.stringify(state.gradeFiltersV61||[]));}catch(e){}}

  applyGradeFilterV13=function applyGradeFilterV61(){
    cleanFilters61();
    var source=state.unfilteredVisibleExamsV13||[],selected=state.gradeFiltersV61||[];
    state.exams=!selected.length?source.slice():source.filter(function(exam){var value=exam.grade_level||'未分类';return selected.indexOf(value)>-1;});
    state.gradeFilter=selected.length===1?selected[0]:'全部';
    if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams,state.subjectConfigs||[]);
    state.radarSelection=(state.radarSelection||[]).filter(function(id){return state.exams.some(function(e){return e.id===id;});});
    if(typeof ensureRadarSelection==='function')ensureRadarSelection();
  };

  function normalizeHomeCategories61(values,allowed){return Array.from(new Set((values||[]).filter(function(x){return allowed.indexOf(x)>=0;})));}
  function homeScopeHtml61(selected,opts){
    var summary=selected.length===0?'全部考试':selected.length===1?selected[0]:'已选 '+selected.length+' 类';
    return '<details class="home-scope-v60"><summary aria-label="首页考试范围" title="'+esc61(selected.length?selected.join('、'):'全部考试')+'"><span class="home-scope-icon-v60" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg></span><span>考试范围 · <b>'+esc61(summary)+'</b></span><span aria-hidden="true" class="home-scope-arrow-v60">⌄</span></summary><form data-home-scope-form-v60><div class="home-scope-options-v60" role="group" aria-label="选择考试分类">'+opts.map(function(v){return '<label><input type="checkbox" name="home-category" value="'+esc61(v)+'"'+(selected.includes(v)?' checked':'')+'><span>'+esc61(v)+'</span></label>';}).join('')+'</div><div class="home-scope-actions-v60"><button type="button" data-home-scope-all-v60>全部考试</button><button type="submit" class="primary">应用</button></div></form></details>';
  }
  var homeBefore61=homeHtml;
  homeHtml=function homeHtmlV61(){
    cleanFilters61();var html=homeBefore61(),selected=state.gradeFiltersV61||[],opts=categoryValues61();
    var oldBar=/<div class="grade-filter-v13[^"]*">[\s\S]*?<\/div>/;
    return oldBar.test(html)?html.replace(oldBar,homeScopeHtml61(selected,opts)):html;
  };
  function applyHomeScope61(values){
    cleanFilters61();state.gradeFiltersV61=normalizeHomeCategories61(values,categoryValues61());
    saveFilters61();state.radarSelection=[];applyGradeFilterV13();render();
  }
  function bindHomeScope61(){
    if(state.page!=='home')return;
    var root=document.getElementById('content'),actions=root&&root.querySelector('.hero-main .hero-actions');if(!root||!actions)return;
    var panel=root.querySelector('.home-scope-v60');
    if(!panel){actions.insertAdjacentHTML('beforeend',homeScopeHtml61(state.gradeFiltersV61||[],categoryValues61()));panel=actions.querySelector('.home-scope-v60');}
    if(panel.parentElement!==actions)actions.appendChild(panel);
    root.querySelectorAll('.grade-filter-v13').forEach(function(n){n.remove();});
    var form=panel.querySelector('[data-home-scope-form-v60]');
    form.onsubmit=function(ev){ev.preventDefault();applyHomeScope61(Array.from(form.querySelectorAll('input[name="home-category"]:checked')).map(function(n){return n.value;}));};
    form.querySelector('[data-home-scope-all-v60]').onclick=function(){applyHomeScope61([]);};
    panel.addEventListener('toggle',function(){if(!panel.open)form.querySelectorAll('input[name="home-category"]').forEach(function(n){n.checked=(state.gradeFiltersV61||[]).includes(n.value);});});
  }

  function cityDraft61(modal){
    var box=modal.querySelector('#v33cityBox');if(!box)return{};
    var apply=box.querySelector('#v33ApplyCity');if(!apply||!apply.checked)return{};
    return{city_rank:(box.querySelector('#v33CityR')||{}).value||'',city_participants:(box.querySelector('#v33CityN')||{}).value||'',district_rank:(box.querySelector('#v33DistR')||{}).value||'',district_participants:(box.querySelector('#v33DistN')||{}).value||''};
  }
  function captureExam61(modal){
    var mode=modal.dataset.rankEntryModeV17||'rank',exam={
      id:null,name:(modal.querySelector('#examName')||{}).value||'',exam_date:(modal.querySelector('#examDate')||{}).value||'',
      end_date:(function(){var end=modal.querySelector('#examEndDateV25');return end&&end.dataset.autoV61!=='1'?end.value||'':'';})(),grade_level:(modal.querySelector('#gradeLevelV14')||{}).value||'',
      is_hidden:(modal.querySelector('#examHiddenV16')||{}).value==='1',moduleIds:[].slice.call(modal._moduleIdsV21||[]),scores:{},moduleRanks:{},
      total_actual_score:(modal.querySelector('.total-actual-override-v24')||{}).value||'',total_raw_score:(modal.querySelector('.total-raw-override-v24')||{}).value||''
    };
    var reflection=modal.querySelector('[data-entry-reflection]');if(reflection)exam.reflection=reflection.value;
    var city=cityDraft61(modal);for(var k in city)exam[k]=city[k];
    if(mode==='rank'){
      exam.total_rank=(modal.querySelector('#totalRankV16')||{}).value||'';exam.total_participants=(modal.querySelector('#totalParticipantsV16')||{}).value||'';
      exam.total_class_rank=(modal.querySelector('#totalClassRankV16')||{}).value||'';exam.total_class_participants=(modal.querySelector('#totalClassParticipantsV16')||{}).value||'';
    }else{
      exam.total_year_position_percent=(modal.querySelector('.total-year-position-v17')||{}).value||'';exam.total_class_position_percent=(modal.querySelector('.total-class-position-v17')||{}).value||'';
    }
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      var name=(card.querySelector('.exam-subject-name-v10')||{}).value||'';name=name.trim();if(!name)return;
      exam.scores[name]={target:(card.querySelector('.target-v16')||{}).value||'',raw:(card.querySelector('.raw-v16')||{}).value||'',actual:(card.querySelector('.actual-v16')||{}).value||'',rawMax:(card.querySelector('.rawmax-v16')||{}).value||'',max:(card.querySelector('.max-v16')||{}).value||'',rank:mode==='rank'?((card.querySelector('.year-rank-v16')||{}).value||''):'',participants:mode==='rank'?((card.querySelector('.year-participants-v16')||{}).value||''):'',classRank:mode==='rank'?((card.querySelector('.class-rank-v16')||{}).value||''):'',classParticipants:mode==='rank'?((card.querySelector('.class-participants-v16')||{}).value||''):'',yearPositionPercent:mode==='percent'?((card.querySelector('.year-position-v17')||{}).value||''):'',classPositionPercent:mode==='percent'?((card.querySelector('.class-position-v17')||{}).value||''):'',excludeFromTotal:!!(card.querySelector('.exclude-total-check-v17')||{}).checked};
    });
    modal.querySelectorAll('.combo-card-v21').forEach(function(card){var id=card.dataset.comboId;if(!id)return;exam.moduleRanks[id]={yearRank:(card.querySelector('.combo-yr-v25')||{}).value||'',yearParticipants:(card.querySelector('.combo-yp-v25')||{}).value||'',classRank:(card.querySelector('.combo-cr-v25')||{}).value||'',classParticipants:(card.querySelector('.combo-cp-v25')||{}).value||''};});
    exam.averages={};
    modal.querySelectorAll('input[data-average-row]').forEach(function(input){if(input.value==='')return;var key=input.dataset.averageRow,scope=input.dataset.averageScope;var row=exam.averages[key]||(exam.averages[key]={});row[scope]=input.value;});
    if(window.ExamGoalLifecycle&&modal._egItems){try{exam.exam_goals=window.ExamGoalLifecycle.metadata(modal,exam);}catch(_) {exam.exam_goals={planned:!!modal._egSource?.exam_goals?.planned,items:modal._egItems};}}
    return exam;
  }
  function readDraft61(){try{var d=JSON.parse(localStorage.getItem(draftKey61())||'null');return d&&d.exam?d:null;}catch(e){return null;}}
  function saveDraft61(modal){try{localStorage.setItem(draftKey61(),JSON.stringify({saved_at:new Date().toISOString(),exam:captureExam61(modal)}));}catch(e){}}
  function clearDraft61(){try{localStorage.removeItem(draftKey61());}catch(e){}}
  function decorateDraft61(modal,restored){
    if(!modal||modal.dataset.draftV61==='1')return;modal.dataset.draftV61='1';var dirty=false,timer=null;
    var actions=modal.querySelector('.modal-actions');
    if(actions){var clear=document.createElement('button');clear.type='button';clear.className='secondary text-danger draft-clear-v61';clear.textContent='一键清空';actions.insertBefore(clear,actions.firstChild);clear.onclick=function(){clearDraft61();modal.remove();if(state.modal===modal)state.modal=null;openExam(null);toast('未保存内容已清空');};}
    var note=document.createElement('div');note.className='draft-note-v61';note.textContent=restored?'已恢复上次未保存的内容；保存成功后草稿会自动删除。':'填写内容会自动留在本机；误关后再次打开即可继续。';
    var body=modal.querySelector('.modal-body');if(body)body.insertBefore(note,body.firstChild);
    function schedule(){dirty=true;clearTimeout(timer);timer=setTimeout(function(){if(modal.isConnected&&state.modal===modal)saveDraft61(modal);},220);}
    modal.addEventListener('input',schedule);modal.addEventListener('change',schedule);
    modal.addEventListener('click',function(e){if(dirty&&(e.target===modal||e.target.closest('.close-btn,.cancel-btn')))saveDraft61(modal);},true);
  }

  var openExamBefore61=openExam;
  openExam=function openExamV61(exam){
    var draft=!exam?readDraft61():null,result=openExamBefore61(draft?draft.exam:exam),modal=state.modal;
    if(draft&&modal){
      modal._restoredExamV61=draft.exam;
      var title=modal.querySelector('.modal-head h3');if(title)title.textContent='继续未保存的考试';
      modal.querySelectorAll('.delete-exam-v10,#deleteExamV16,#deleteExamModalV13').forEach(function(x){var row=x.closest('.modal-danger-row-v10');(row||x).remove();});
      var save=modal.querySelector('.save-btn');if(save)save.textContent='保存考试';
      setTimeout(function(){toast('已恢复上次未保存的内容');},0);
    }
    decorateDraft61(modal,!!draft);return result;
  };

  var dataApiBefore61=typeof dataApiV7==='function'?dataApiV7:null;
  if(dataApiBefore61)dataApiV7=async function dataApiV61(action,payload){var result=await dataApiBefore61.apply(this,arguments);if(action==='save_exam')clearDraft61();return result;};

  var saveExamBefore61=saveExam;
  saveExam=async function saveExamV61(id,modal){
    var scroller=document.scrollingElement||document.documentElement,y=scroller.scrollTop||window.pageYOffset||0;
    var result=await saveExamBefore61.apply(this,arguments);
    function restore(){try{window.scrollTo({top:y,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,y);}}
    restore();requestAnimationFrame(restore);setTimeout(restore,80);setTimeout(restore,220);return result;
  };

  var bindBefore61=bindPage;
  bindPage=function bindPageV61(){
    bindBefore61();
    bindHomeScope61();
    document.querySelectorAll('[data-grade-filter-v61]').forEach(function(button){button.onclick=function(){
      var value=button.dataset.gradeFilterV61;cleanFilters61();
      if(value==='全部')state.gradeFiltersV61=[];
      else{var i=state.gradeFiltersV61.indexOf(value);if(i>-1)state.gradeFiltersV61.splice(i,1);else state.gradeFiltersV61.push(value);}
      saveFilters61();state.radarSelection=[];applyGradeFilterV13();render();
    };});
  };

  var style=document.createElement('style');style.id='app-v35-style';style.textContent='.grade-filter-v61{align-items:center}.grade-filter-v61 .label{white-space:nowrap}.draft-note-v61{border:1px solid var(--line,#e5e9ef);background:var(--cell,#f7f9fc);color:var(--muted,#687386);border-radius:11px;padding:9px 11px;margin-bottom:12px;font-size:11px;line-height:1.6}.draft-clear-v61{margin-right:auto}.gh-chips{touch-action:pan-y!important}';document.head.appendChild(style);
  window.__v61={captureDraft:captureExam61,readDraft:readDraft61,clearDraft:clearDraft61,filters:function(){return(state.gradeFiltersV61||[]).slice();},normalizeHomeCategories:normalizeHomeCategories61,homeScopeHtml:homeScopeHtml61};
})();
