// v21 / product v1.1: separate subjects from score combinations and make combinations exam-specific.
(function injectV21Styles(){
  if(document.getElementById('app-v21-style'))return;
  var style=document.createElement('style');style.id='app-v21-style';style.textContent=`
    .subject-fixed-v21{display:flex;align-items:center;min-height:38px;padding:0 4px;font-size:14px;font-weight:800;color:var(--text)}
    .subject-history-v21{font-size:9px;border:1px solid var(--line);border-radius:999px;padding:2px 6px;color:var(--muted);margin-left:7px;font-weight:700}
    .subject-picker-v21,.combo-picker-v21{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
    .subject-picker-v21 select,.combo-picker-v21 select{width:auto;min-width:180px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:9px 11px;color:#556070}
    .combo-section-v21{margin-top:18px}
    .combo-total-v21,.combo-card-v21{border:1px solid var(--line);border-radius:16px;background:#fafbfe;padding:13px;margin-top:10px}
    .combo-head-v21{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
    .combo-head-v21 b{font-size:13px}.combo-head-v21 span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.5}
    .combo-remove-v21{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:9px;padding:6px 9px;font-size:10px}
    .combo-list-v21{display:grid;gap:9px}.combo-card-v21{margin-top:0}
    .combo-score-v21{display:flex;gap:8px;flex-wrap:wrap}.combo-score-v21 span{font-size:11px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:#657083}
    .combo-score-v21 b{color:var(--text)}
    .rank-entry-top-v21{margin:12px 0 4px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#f8f9fc}
    .rank-entry-top-v21 .rank-entry-mode-v17{margin:0}
    .exam-subject-head-v10 .exam-subject-name-v10{display:none!important}
    .exam-subject-card-v10 .exclude-total-v17{display:none!important}
    @media(max-width:620px){
      .subject-picker-v21 select,.combo-picker-v21 select{width:100%;min-width:0}
      .combo-total-v21,.combo-card-v21{padding:11px}.combo-head-v21{margin-bottom:8px}
      .rank-entry-top-v21{padding:9px 10px}
    }
  `;document.head.appendChild(style);
})();

function moduleIdSetV21(){return new Set((state.modulesV18||[]).map(function(m){return String(m.id)}));}
function moduleNameSetV21(){return new Set((state.modulesV18||[]).map(function(m){return m.name}));}
function cleanSubjectAxisV21(){
  var moduleNames=moduleNameSetV21(),out=[],seen=new Set();
  function add(name){name=String(name||'').trim();if(!name||moduleNames.has(name)||seen.has(name))return;seen.add(name);out.push(name);}
  (state.subjectConfigs||[]).forEach(function(x){add(x.name)});
  (state.allExams||[]).forEach(function(exam){Object.keys(exam.scores||{}).forEach(add)});
  SUBJECTS.splice(0,SUBJECTS.length,...out);
  if(!['总览','总分',...SUBJECTS].includes(state.subject))state.subject='总分';
}
var loadExamsBeforeV21=loadExams;
loadExams=async function loadExamsV21(){await loadExamsBeforeV21();cleanSubjectAxisV21();};

moduleSummaryV18=function moduleSummaryV21(exam){
  var selected=new Set((exam?.moduleIds||[]).map(String));
  if(!selected.size)return'';
  var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m.id));}).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target'),max=examMax(exam,m.name),parts=[];
    if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));
    if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));
    if(target!==null)parts.push('目标 '+formatScore(target));
    return parts.length?`<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' · ')}</span>`:'';
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
};

var accountHtmlBeforeV21=accountHtml;
accountHtml=function accountHtmlV21(){return accountHtmlBeforeV21().replace('成绩模块','组合设置').replace('自动汇总常用组合，不重复计入总分。内置语数外、四科和六科，也可以新增自己的模块。','先在这里定义常用组合；每次考试只显示你在“组合分”里主动添加的组合。');};
if(typeof openModuleManagerV18==='function'){
  var openModuleManagerBeforeV21=openModuleManagerV18;
  openModuleManagerV18=function openModuleManagerV21(){openModuleManagerBeforeV21();var modal=state.modal;if(!modal)return;var h=modal.querySelector('.modal-head h3');if(h)h.textContent='组合设置';var note=modal.querySelector('.form-note');if(note)note.textContent='这里只定义组合由哪些科目组成；不会自动出现在每场考试里。录成绩时可在“组合分”中按需添加。';var add=modal.querySelector('#addModuleV18');if(add)add.textContent='＋ 自定义组合';modal.querySelectorAll('.module-editor-note-v18').forEach(function(x){x.textContent=x.textContent.replaceAll('模块','组合')});};
}

function configuredSubjectsV21(){return (state.subjectConfigs||[]).map(function(x){return x.name}).filter(Boolean);}
function subjectDefaultV21(name){var x=(state.subjectConfigs||[]).find(function(s){return s.name===name});return Number(x?.defaultMax??defaultMax(name)??100);}
function cardNameV21(card){return card.querySelector('.exam-subject-name-v10')?.value.trim()||'';}
function selectedNamesV21(modal){return [...modal.querySelectorAll('.exam-subject-card-v10')].map(cardNameV21).filter(Boolean);}

function decorateExamV21(exam,modal){
  var list=modal.querySelector('#examSubjectsV16');if(!list||modal.dataset.v21Ready==='1')return;modal.dataset.v21Ready='1';
  var configured=new Set(configuredSubjectsV21());
  if(!exam){[...list.querySelectorAll('.exam-subject-card-v10')].forEach(function(card){var name=cardNameV21(card);if(name&&!configured.has(name))card.remove();});}
  var subjectHead=list.previousElementSibling;
  if(subjectHead?.classList.contains('section-head-v7')){var p=subjectHead.querySelector('p');if(p)p.textContent='科目统一在“账号 → 科目设置”维护；这里仅选择本次考试实际参加的科目。';}

  var entry=modal.querySelector('.rank-entry-mode-v17');
  var form=modal.querySelector('.form-grid');
  if(entry&&form){var box=document.createElement('div');box.className='rank-entry-top-v21';form.insertAdjacentElement('afterend',box);box.appendChild(entry);}

  var addOld=modal.querySelector('#addExamSubjectV16'),addOldFn=addOld?.onclick;
  if(addOld){addOld.style.display='none';var picker=document.createElement('div');picker.className='subject-picker-v21';picker.innerHTML='<select id="subjectPickerV21"><option value="">＋ 选择科目</option>'+configuredSubjectsV21().map(function(n){return `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`}).join('')+'</select><span class="template-note-v10">新增科目请到账号设置。</span>';addOld.parentNode.insertBefore(picker,addOld);var select=picker.querySelector('select');select.onchange=function(){var name=this.value;if(!name)return;if(selectedNamesV21(modal).includes(name)){toast('本次考试已选择「'+name+'」');this.value='';return;}if(typeof addOldFn==='function')addOldFn.call(addOld);setTimeout(function(){var cards=modal.querySelectorAll('.exam-subject-card-v10'),card=cards[cards.length-1],input=card?.querySelector('.exam-subject-name-v10');if(input){input.value=name;var max=subjectDefaultV21(name),m=card.querySelector('.max-v16'),rm=card.querySelector('.rawmax-v16');if(m)m.value=max;if(rm)rm.value=max;input.dispatchEvent(new Event('input',{bubbles:true}));}decorateCards();select.value='';},0);};}

  function decorateCards(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var input=card.querySelector('.exam-subject-name-v10');if(!input)return;var name=input.value.trim();var head=card.querySelector('.exam-subject-head-v10');var label=head?.querySelector('.subject-fixed-v21');if(!label&&head){label=document.createElement('div');label.className='subject-fixed-v21';head.insertBefore(label,input);}if(label)label.innerHTML=escapeHtml(name||'未选择')+(!configured.has(name)&&name?'<span class="subject-history-v21">历史项目</span>':'');input.readOnly=true;var ex=card.querySelector('.exclude-total-check-v17');if(ex&&configured.has(name))ex.checked=false;});}

  var totalRanks=modal.querySelector('.total-ranks-v16'),rankNote=modal.querySelector('.rank-compat-v16'),positionNote=modal.querySelector('.position-note-v17'),preview=modal.querySelector('.score-total-preview-v13');
  var rankHead=totalRanks?.previousElementSibling;
  while(rankHead&&(!rankHead.classList||!rankHead.classList.contains('section-head-v7')))rankHead=rankHead.previousElementSibling;
  if(rankHead){var h=rankHead.querySelector('h4'),p=rankHead.querySelector('p');if(h)h.textContent='组合分';if(p)p.textContent='总分自动汇总；下面可按需添加你在设置里定义的组合。';rankHead.classList.add('combo-section-v21');}
  if(totalRanks&&rankHead){var totalCard=document.createElement('div');totalCard.className='combo-total-v21';totalCard.innerHTML='<div class="combo-head-v21"><div><b>总分</b><span>自动汇总本次科目；排名/位比均可留空。</span></div></div>';rankHead.insertAdjacentElement('afterend',totalCard);if(preview)totalCard.appendChild(preview);totalCard.appendChild(totalRanks);if(positionNote)totalCard.appendChild(positionNote);if(rankNote)totalCard.appendChild(rankNote);
    var comboList=document.createElement('div');comboList.className='combo-list-v21';comboList.id='comboListV21';totalCard.insertAdjacentElement('afterend',comboList);
    var comboPicker=document.createElement('div');comboPicker.className='combo-picker-v21';comboPicker.innerHTML='<select id="comboPickerV21"><option value="">＋ 添加组合</option>'+ (state.modulesV18||[]).map(function(m){return `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`}).join('') +'</select><span class="template-note-v10">组合内容在账号设置里维护。</span>';comboList.insertAdjacentElement('afterend',comboPicker);
    modal._moduleIdsV21=[...(exam?.moduleIds||[])].map(String).filter(function(id){return moduleIdSetV21().has(id)});
    function renderCombos(){comboList.innerHTML=modal._moduleIdsV21.map(function(id){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===String(id)});if(!m)return'';return `<div class="combo-card-v21" data-combo-id="${escapeHtml(id)}"><div class="combo-head-v21"><div><b>${escapeHtml(m.name)}</b><span>${(m.subjects||[]).map(escapeHtml).join(' + ')}</span></div><button type="button" class="combo-remove-v21">移除</button></div><div class="combo-score-v21"><span>最终分 <b data-combo-final>—</b></span><span>原始分 <b data-combo-raw>—</b></span></div></div>`;}).join('');comboList.querySelectorAll('.combo-remove-v21').forEach(function(btn){btn.onclick=function(){var id=this.closest('[data-combo-id]').dataset.comboId;modal._moduleIdsV21=modal._moduleIdsV21.filter(function(x){return x!==id});renderCombos();};});updateComboScores();}
    function currentValue(name,klass){var card=[...modal.querySelectorAll('.exam-subject-card-v10')].find(function(c){return cardNameV21(c)===name});if(!card)return null;return num(card.querySelector(klass)?.value);}
    function comboSum(m,klass){var sum=0;for(var s of m.subjects||[]){var v=currentValue(s,klass);if(v===null)return null;sum+=v;}return sum;}
    function updateComboScores(){comboList.querySelectorAll('[data-combo-id]').forEach(function(card){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===card.dataset.comboId});if(!m)return;var final=comboSum(m,'.actual-v16'),raw=comboSum(m,'.raw-v16');card.querySelector('[data-combo-final]').textContent=formatScore(final);card.querySelector('[data-combo-raw]').textContent=formatScore(raw);});}
    comboPicker.querySelector('select').onchange=function(){var id=this.value;if(!id)return;if(modal._moduleIdsV21.includes(id)){toast('这个组合已经添加了');this.value='';return;}modal._moduleIdsV21.push(id);renderCombos();this.value='';};modal.addEventListener('input',function(){setTimeout(updateComboScores,0)});renderCombos();
  }
  decorateCards();var obs=new MutationObserver(function(){decorateCards();});obs.observe(list,{childList:true,subtree:true});
}

var openExamBeforeV21=openExam;
openExam=function openExamV21(exam=null){openExamBeforeV21(exam);if(state.modal)decorateExamV21(exam,state.modal);};

saveExam=async function saveExamV21(id,modal){
  modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var raw=card.querySelector('.raw-v16'),actual=card.querySelector('.actual-v16'),rawMax=num(card.querySelector('.rawmax-v16')?.value),finalMax=num(card.querySelector('.max-v16')?.value);if(raw&&actual&&String(actual.value||'').trim()===''&&String(raw.value||'').trim()!==''&&rawMax!==null&&finalMax!==null&&rawMax===finalMax)actual.value=raw.value;});
  var button=modal.querySelector('.save-btn'),mode=modal.dataset.rankEntryModeV17||'rank';
  var exam={id:id,name:modal.querySelector('#examName').value.trim(),exam_date:modal.querySelector('#examDate').value,grade_level:modal.querySelector('#gradeLevelV14')?.value||'',total_rank:mode==='rank'?(modal.querySelector('#totalRankV16')?.value||''):'',total_participants:mode==='rank'?(modal.querySelector('#totalParticipantsV16')?.value||''):'',total_class_rank:mode==='rank'?(modal.querySelector('#totalClassRankV16')?.value||''):'',total_class_participants:mode==='rank'?(modal.querySelector('#totalClassParticipantsV16')?.value||''):'',total_year_position_percent:mode==='percent'?(modal.querySelector('.total-year-position-v17')?.value||''):'',total_class_position_percent:mode==='percent'?(modal.querySelector('.total-class-position-v17')?.value||''):'',is_hidden:modal.querySelector('#examHiddenV16')?.value==='1',moduleIds:[...(modal._moduleIdsV21||[])],scores:{}};
  var configured=new Set(configuredSubjectsV21()),seen=new Set();
  for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=cardNameV21(card);if(!name)return toast('请选择科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);var historical=!configured.has(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:historical?!!card.querySelector('.exclude-total-check-v17')?.checked:false};}
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='保存中…';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}
};
