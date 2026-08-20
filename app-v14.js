// v14: customizable exam categories + separate raw/final full marks, kept intentionally simple
state.classification = state.classification || { label: '年级', options: ['高一', '高二', '高三'] };

(function injectV14Styles(){
  if ($('#app-v14-style')) return;
  const style=document.createElement('style'); style.id='app-v14-style'; style.textContent=`
    .category-settings-v14{margin-top:18px;padding:22px}
    .category-head-v14{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .category-chips-v14{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .category-chip-v14{border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:12px;color:#596474}
    .category-list-v14{display:grid;gap:8px;margin-top:14px}
    .category-row-v14{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:8px}
    .category-row-v14 input,.category-label-v14{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;outline:none;background:#fff}
    .category-row-v14 button{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:10px;font-size:17px}
    .score-compact-v14{display:grid;grid-template-columns:1fr 1.35fr 1.35fr;gap:8px}
    .score-with-max-v14{display:grid;grid-template-columns:minmax(0,1fr) auto 68px;gap:5px;align-items:center}
    .score-with-max-v14 span{font-size:11px;color:var(--muted)}
    .raw-box-v14{background:#fff9f1;border:1px solid #f3e2cb;border-radius:12px;padding:8px}
    .final-box-v14{background:#f4fbf8;border:1px solid #dbeee6;border-radius:12px;padding:8px}
    .target-box-v14{padding:8px}
    @media(max-width:620px){
      .category-settings-v14{padding:18px 16px}.category-head-v14{display:block}.category-head-v14 button{margin-top:10px}
      .score-compact-v14{grid-template-columns:1fr 1fr}.target-box-v14{grid-column:1/-1}.score-with-max-v14{grid-template-columns:minmax(0,1fr) auto 64px}
    }
  `; document.head.appendChild(style);
})();

function categoryOptionsV14(){
  const configured=(state.classification?.options||[]).map(v=>String(v||'').trim()).filter(Boolean);
  const used=(state.allExams||[]).map(e=>String(e.grade_level||'').trim()).filter(Boolean);
  return [...new Set([...configured,...used])];
}
function categoryLabelV14(){ return String(state.classification?.label||'分类').trim() || '分类'; }
function rawMaxV14(exam,subject){ const row=exam?.scores?.[subject]||{}; return num(row.rawMax) ?? num(row.max) ?? defaultMax(subject); }
rawScoreRateV13=function rawScoreRateV14(exam,subject){ const score=examRawScoreV13(exam,subject),max=rawMaxV14(exam,subject); return score===null||!max?null:Math.max(0,Math.min(100,score/max*100)); };
totalRawMaxV13=function totalRawMaxV14(exam){ const names=Object.keys(exam?.scores||{});let sum=0,count=0;names.forEach(subject=>{const value=examRawScoreV13(exam,subject);if(value!==null){sum+=rawMaxV14(exam,subject);count++;}});return count?sum:null; };

applyGradeFilterV13=function applyCategoryFilterV14(){
  const source=state.unfilteredVisibleExamsV13||[];
  state.exams=state.gradeFilter==='全部'?[...source]:state.gradeFilter==='未分类'?source.filter(e=>!e.grade_level):source.filter(e=>e.grade_level===state.gradeFilter);
  if(typeof applyExamSubjectsV10==='function') applyExamSubjectsV10(state.exams,state.subjectConfigs||[]);
  state.radarSelection=(state.radarSelection||[]).filter(id=>state.exams.some(e=>e.id===id)); ensureRadarSelection();
};

loadExams=async function loadExamsV14(){
  const data=await dataApiV7('list_exams');
  state.allExams=data.exams||[]; state.subjectConfigs=data.subjects||[];
  state.classification=data.classification||state.classification||{label:'年级',options:['高一','高二','高三']};
  state.unfilteredVisibleExamsV13=state.allExams.filter(e=>!e.is_hidden);
  if(state.gradeFilter!=='全部'&&state.gradeFilter!=='未分类'&&!categoryOptionsV14().includes(state.gradeFilter)) state.gradeFilter='全部';
  applyGradeFilterV13();
};

const homeHtmlBeforeV14=homeHtml;
homeHtml=function homeHtmlV14(){
  let html=homeHtmlBeforeV14();
  const opts=categoryOptionsV14();
  const bar=`<div class="grade-filter-v13"><span class="label">${escapeHtml(categoryLabelV14())}</span>${['全部',...opts,'未分类'].map(v=>`<button class="grade-chip-v13 ${state.gradeFilter===v?'active':''}" data-grade-filter-v13="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join('')}</div>`;
  html=html.replace(/<div class="grade-filter-v13">[\s\S]*?<\/div><section class="grid-main">/,`${bar}<section class="grid-main">`);
  return html;
};

accountHtml=function accountHtmlV14(){
  const c=state.classification||{label:'年级',options:['高一','高二','高三']};
  return `<div class="page-head"><div><h2>账号</h2><p>账号与少量偏好设置。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><div class="account-chip"><code>${escapeHtml(state.user?.username||'')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username||'')}">复制</button></div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">考试与成绩保存在云端并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div><div class="card category-settings-v14"><div class="category-head-v14"><div><h3 class="card-title">考试分类</h3><p class="card-sub">只保留一个分类维度，名称和选项都可以自定义，例如“年级：高一/高二/高三”或“阶段：一轮/二轮/冲刺”。</p></div><button class="secondary" id="manageCategoriesV14">设置</button></div><div class="category-chips-v14"><span class="category-chip-v14"><b>${escapeHtml(c.label||'分类')}</b></span>${(c.options||[]).map(v=>`<span class="category-chip-v14">${escapeHtml(v)}</span>`).join('')}</div></div>`;
};

function openCategoryManagerV14(){
  const draft={label:categoryLabelV14(),options:[...(state.classification?.options||['高一','高二','高三'])]};
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>考试分类设置</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="field"><label>分类名称</label><input class="category-label-v14" id="categoryLabelV14" maxlength="16" value="${escapeHtml(draft.label)}" placeholder="例如：年级 / 阶段 / 学期"></div><div class="category-list-v14" id="categoryListV14"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addCategoryV14">＋ 添加选项</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveCategoryV14">保存</button></div></div><p class="form-note">修改分类设置不会改动历史考试已有的分类值，避免误改旧数据；历史分类仍会正常显示。</p></div></div>`;document.body.appendChild(modal);state.modal=modal;
  const list=$('#categoryListV14',modal);const renderRows=()=>{list.innerHTML=draft.options.map(v=>`<div class="category-row-v14"><input maxlength="20" value="${escapeHtml(v)}" placeholder="分类选项"><button type="button">×</button></div>`).join('');$$('.category-row-v14 button',list).forEach((b,i)=>b.onclick=()=>{if(draft.options.length<=1)return toast('至少保留 1 个分类');sync();draft.options.splice(i,1);renderRows();});};
  const sync=()=>{draft.options=$$('.category-row-v14 input',list).map(i=>i.value.trim());}; renderRows();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  $('#addCategoryV14',modal).onclick=()=>{sync();if(draft.options.length>=12)return toast('最多 12 个分类');draft.options.push('');renderRows();$('.category-row-v14:last-child input',list)?.focus();};
  $('#saveCategoryV14',modal).onclick=async()=>{sync();draft.label=$('#categoryLabelV14',modal).value.trim();if(!draft.label)return toast('请填写分类名称');if(draft.options.some(v=>!v))return toast('请填写完整的分类选项');if(new Set(draft.options).size!==draft.options.length)return toast('分类名称不能重复');const btn=$('#saveCategoryV14',modal);btn.disabled=true;btn.textContent='保存中…';try{const data=await dataApiV7('save_classification',{classification:draft});state.classification=data.classification;close();render();toast('分类设置已保存');}catch(e){toast(e.message);btn.disabled=false;btn.textContent='保存';}};
}

function seedRowsV14(exam){
  if(exam)return Object.entries(exam.scores||{}).map(([name,row])=>({name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??''}));
  const last=state.exams.at(-1)||state.unfilteredVisibleExamsV13.at(-1);if(last&&Object.keys(last.scores||{}).length)return Object.entries(last.scores).map(([name,row])=>({name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:''}));
  const templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(name=>({name,defaultMax:defaultMax(name)}));return templates.map(item=>({name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:''}));
}

openExam=function openExamV14(exam=null){
  const editing=!!exam,today=new Date().toISOString().slice(0,10),rows=seedRowsV14(exam),options=categoryOptionsV14(),selected=exam?.grade_level||(!editing?(state.unfilteredVisibleExamsV13.at(-1)?.grade_level||''):'');
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">未分类</option>${options.map(v=>`<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div></div><div class="section-head-v7"><div><h4>本次考试科目</h4><p>原始分和赋分/最终分使用各自的满分；例如上海小科可填“原始 85 / 100，赋分 61 / 70”。</p></div></div><div class="exam-subjects-v10" id="examSubjectsV14"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV14">＋ 添加科目 / 模块</button></div><div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV14">—</b></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV14">—</b></div></div><div class="section-head-v7"><div><h4>总排名（可选）</h4></div></div><div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span>总分</span><input id="totalRankV14" inputmode="numeric" value="${exam?.total_rank??''}"><input id="totalParticipantsV14" inputmode="numeric" value="${exam?.total_participants??''}"></div></div><div class="visibility-box-v10"><div><b>图表显示</b><span>${exam?.is_hidden?'已隐藏，不参与图表。':'正常参与图表。'}</span></div><button class="secondary" id="toggleHiddenV14">${exam?.is_hidden?'恢复显示':'隐藏'}</button><input type="hidden" id="examHiddenV14" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV14">删除这次考试</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV14',modal);
  const sync=()=>{const next=$$('.exam-subject-card-v10',list).map(card=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value}));rows.splice(0,rows.length,...next);};
  const totals=()=>{sync();$('#rawTotalV14',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV14',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const card=row=>`<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v14" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>赋分 / 最终分</label><div class="score-with-max-v14"><input class="actual-v14" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v14" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v14" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v14" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>名次</label><input class="rank-v14" inputmode="numeric" value="${row.rank??''}" placeholder="可留空"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v14" inputmode="numeric" value="${row.participants??''}" placeholder="留空=总人数"></div></div></div>`;
  const renderRows=()=>{list.innerHTML=rows.map(card).join('');$$('.remove-exam-subject-v10',list).forEach((b,i)=>b.onclick=()=>{sync();rows.splice(i,1);renderRows();totals()});$$('input',list).forEach(i=>i.addEventListener('input',totals));};renderRows();totals();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('#addExamSubjectV14',modal).onclick=()=>{sync();if(rows.length>=40)return toast('最多 40 个科目 / 模块');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};$('#toggleHiddenV14',modal).onclick=()=>{const input=$('#examHiddenV14',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenV14',modal).textContent=next?'恢复显示':'隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后不参与图表。':'保存后正常参与图表。';};$('#deleteExamV14',modal)?.addEventListener('click',async()=>{if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(e){toast(e.message)}});$('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam=function validateExamV14(exam){
  const tr=num(exam.total_rank),tp=num(exam.total_participants);if(tr!==null&&(!Number.isInteger(tr)||tr<1))return'总排名请输入正整数';if(tp!==null&&(!Number.isInteger(tp)||tp<1))return'参考人数请输入正整数';if(tr!==null&&tp!==null&&tr>tp)return'总排名不能大于参考人数';
  for(const[name,row]of Object.entries(exam.scores||{})){const max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??tp;if(max<=0||rawMax<=0)return`${name} 的满分必须大于 0`;if(target!==null&&target>max)return`${name}目标不能超过最终满分 ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name}赋分/最终分不能超过最终满分 ${formatScore(max)}`;if(raw!==null&&raw>rawMax)return`${name}原始分不能超过原始满分 ${formatScore(rawMax)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}排名请输入正整数`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}参考人数请输入正整数`;if(rank!==null&&effective!==null&&rank>effective)return`${name}排名不能大于参考人数`;}
  return'';
};

saveExam=async function saveExamV14(id,modal){
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV14',modal)?.value||'',total_participants:$('#totalParticipantsV14',modal)?.value||'',is_hidden:$('#examHiddenV14',modal)?.value==='1',scores:{}};const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value};}if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='保存中…';try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);btn.disabled=false;btn.textContent=id?'保存修改':'保存考试';}
};

recordsHtml=function recordsHtmlV14(){
  const exams=state.allExams||[],hidden=exams.filter(e=>e.is_hidden).length,order=categoryOptionsV14(),groups=[...order.map(v=>({name:v,exams:exams.filter(e=>e.grade_level===v)})),{name:'未分类',exams:exams.filter(e=>!e.grade_level)}].filter(g=>g.exams.length);
  return `<div class="page-head"><div><h2>考试记录</h2><p>按${escapeHtml(categoryLabelV14())}分组；每次考试的科目彼此独立。${hidden?` ${hidden} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map(g=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} 次</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;
};

const recordHtmlBeforeV14=recordHtml;
recordHtml=function recordHtmlV14(exam){let html=recordHtmlBeforeV14(exam);html=html.replace(/<span class="grade-badge-v13">[\s\S]*?<\/span>/,`<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'未分类')}</span>`);return html;};

const bindPageBeforeV14=bindPage;
bindPage=function bindPageV14(){bindPageBeforeV14();$('#manageCategoriesV14')?.addEventListener('click',openCategoryManagerV14);$$('[data-grade-filter-v13]').forEach(button=>button.onclick=()=>{state.gradeFilter=button.dataset.gradeFilterV13;state.radarSelection=[];applyGradeFilterV13();render();});};
