// v16: split rankings into year-grade rank and class rank while preserving all old rank data as year-grade rank.
state.rankScopeV16 = state.rankScopeV16 || 'year';

(function injectV16Styles(){
  if (document.getElementById('app-v16-style')) return;
  var style=document.createElement('style');
  style.id='app-v16-style';
  style.textContent=`
    .rank-scope-v16,.rank-view-v16{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
    .rank-scope-v16 .label,.rank-view-v16 .label{font-size:12px;font-weight:700;color:var(--muted)}
    .rank-view-v16{margin-top:-2px}
    .rank-view-v16 .metric-btn-v7{padding:6px 10px;font-size:11px}
    .total-ranks-v16{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .rank-scope-card-v16{border:1px solid var(--line);border-radius:14px;padding:11px;background:#fafbfe}
    .rank-scope-card-v16 b{display:block;font-size:12px;margin-bottom:8px}
    .rank-pair-v16{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .rank-pair-v16 label{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .rank-pair-v16 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;background:#fff;outline:none}
    .subject-ranks-v16{display:grid;gap:7px;margin-top:8px}
    .subject-rank-row-v16{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(0,1fr);gap:7px;align-items:center}
    .subject-rank-row-v16>span{font-size:11px;font-weight:700;color:#596474}
    .subject-rank-row-v16 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:8px 7px;background:#fff;outline:none;font-size:12px}
    .rank-compat-v16{font-size:11px;line-height:1.6;color:var(--muted);margin-top:9px}
    .record-ranks-v16{display:inline-flex;gap:6px;flex-wrap:wrap}
    @media(max-width:620px){
      .rank-scope-v16{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}
      .rank-scope-v16 .label{grid-column:1/-1}.rank-scope-v16 .metric-btn-v7{width:100%}
      .rank-view-v16{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .rank-view-v16 .label{grid-column:1/-1}.rank-view-v16 .metric-btn-v7{width:100%}
      .total-ranks-v16{grid-template-columns:1fr}
      .subject-rank-row-v16{grid-template-columns:44px minmax(0,1fr) minmax(0,1fr)}
    }
  `;
  document.head.appendChild(style);
})();

function rankScopeLabelV16(scope){ return scope === 'class' ? '班排' : '年排'; }
function rankScopeLongLabelV16(scope){ return scope === 'class' ? '班级排名' : '年级排名'; }
function rankInfoByScopeV16(exam, subject, scope){
  if (!exam) return { rank:null, participants:null, performance:null };
  var isClass = scope === 'class';
  if (subject === '总分') {
    var rank = num(isClass ? exam.total_class_rank : exam.total_rank);
    var participants = num(isClass ? exam.total_class_participants : exam.total_participants);
    return { rank:rank, participants:participants, performance:rankPerformanceV7(rank,participants) };
  }
  var row = exam.scores?.[subject] || {};
  var rank = num(isClass ? row.classRank : row.rank);
  var participants = num(isClass ? row.classParticipants : row.participants);
  if (participants === null) participants = num(isClass ? exam.total_class_participants : exam.total_participants);
  return { rank:rank, participants:participants, performance:rankPerformanceV7(rank,participants) };
}

rankInfoV7 = function rankInfoV16(exam,subject){ return rankInfoByScopeV16(exam,subject,state.rankScopeV16); };
rawRankValueV11 = function rawRankValueV16(exam,subject){ return rankInfoByScopeV16(exam,subject,state.rankScopeV16).rank; };

var rawRankChartBeforeV16 = rawRankChartHtmlV11;
rawRankChartHtmlV11 = function rawRankChartHtmlV16(){
  var html=rawRankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/原始名次模式/g, label+'模式')
    .replace(/原始名次/g, label)
    .replace(/这个项目还没有名次数据/g, '这个项目还没有'+label+'数据')
    .replace(/记录名次后/g, '记录'+label+'后');
};

var rankChartBeforeV16 = rankChartHtmlV7;
rankChartHtmlV7 = function rankChartHtmlV16(){
  var html=rankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/排名趋势分析/g, label+'百分位趋势分析')
    .replace(/这个科目还没有排名数据/g, '这个科目还没有'+label+'数据')
    .replace(/排名表现/g, label+'百分位');
};

var homeHtmlBeforeV16 = homeHtml;
homeHtml = function homeHtmlV16(){
  var html=homeHtmlBeforeV16();
  var isRank=state.trendMetric==='rank_raw'||state.trendMetric==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var toggle=`<div class="trend-metric-toggle-v7 rank-scope-v16"><span class="label">趋势类型</span><button class="metric-btn-v7 ${!isRank&&state.trendMetric==='score'?'active':''}" data-trend-scope-v16="score">成绩</button><button class="metric-btn-v7 ${isRank&&scope==='year'?'active':''}" data-trend-scope-v16="year">年排</button><button class="metric-btn-v7 ${isRank&&scope==='class'?'active':''}" data-trend-scope-v16="class">班排</button></div>${isRank?`<div class="rank-view-v16"><span class="label">查看</span><button class="metric-btn-v7 ${state.trendMetric==='rank_raw'?'active':''}" data-trend-metric="rank_raw">名次</button><button class="metric-btn-v7 ${state.trendMetric==='rank'?'active':''}" data-trend-metric="rank">百分位</button></div>`:''}`;
  html=html.replace(/<div class="trend-metric-toggle-v7">[\s\S]*?<\/div>/,toggle);
  if(isRank){
    var title=state.trendMetric==='rank_raw'?scopeLabel+'趋势':scopeLabel+'百分位趋势';
    html=html.replace(/<h3 class="card-title">(?:成绩趋势|名次趋势|排名趋势)<\/h3>/,`<h3 class="card-title">${title}</h3>`);
    if(state.trendMetric==='rank_raw'){
      html=html.replace('直接看原始第几名；纵轴反向显示，第 1 名在最上方',`直接看${scopeLabel}第几名；纵轴越高越好，第 1 名在最上方`);
      html=html.replace('总分与各科直接叠加原始名次；越靠上代表名次越好',`总分与各科叠加${scopeLabel}；越靠上代表名次越好`);
    }else{
      html=html.replace('用参考人数把名次转换成可比较的“排名表现”，避免考试难度和人数变化干扰判断',`${scopeLabel}结合对应参考人数换算成百分位，方便不同考试之间比较`);
      html=html.replace('总分与各科排名统一换算为排名表现；参考人数不同也能放在一起比较',`总分与各科${scopeLabel}统一换算成百分位；参考人数变化时也更可比`);
    }
  }
  return html;
};

var radarChartBeforeV16 = radarChartHtml;
radarChartHtml = function radarChartHtmlV16(selected){
  var html=radarChartBeforeV16(selected);
  if(state.radarMode==='rank_raw'){
    var label=rankScopeLongLabelV16(state.rankScopeV16);
    html=html.replace(/原始名次/g,label).replace(/名次数据/g,label+'数据');
  }
  if(state.radarMode==='rank'){
    var p=rankScopeLabelV16(state.rankScopeV16)+'百分位';
    html=html.replace(/排名百分位/g,p);
  }
  return html;
};
var radarSummaryBeforeV16 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV16(selected){
  var html=radarSummaryBeforeV16(selected);
  if(state.radarMode==='rank_raw') html=html.replace(/名次/g,rankScopeLabelV16(state.rankScopeV16));
  if(state.radarMode==='rank') html=html.replace(/排名百分位/g,rankScopeLabelV16(state.rankScopeV16)+'百分位');
  return html;
};
radarCardHtml = function radarCardHtmlV16(){
  var available=radarAvailableExams();
  var selected=selectedRadarExams();
  var isRank=state.radarMode==='rank_raw'||state.radarMode==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var sub=state.radarMode==='rank_raw'
    ? `直接按${scopeLabel}绘制：越靠外代表名次越好，第 1 名方向最外。`
    : state.radarMode==='rank'
      ? `按${scopeLabel}百分位绘制：越靠外代表相对排名越好。`
      : state.radarMode==='raw_score'
        ? '按原始得分率绘制，方便比较赋分前后的学科结构。'
        : '按得分率绘制；没有数据的科目会自动隐藏，6 科就显示六边形。';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">${sub}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode==='actual'?'active':''}" data-radar-mode="actual">最终分</button><button class="chip ${state.radarMode==='raw_score'?'active':''}" data-radar-mode="raw_score">原始分</button><button class="chip ${state.radarMode==='target'?'active':''}" data-radar-mode="target">目标</button><button class="chip ${isRank&&scope==='year'?'active':''}" data-radar-scope-v16="year">年排</button><button class="chip ${isRank&&scope==='class'?'active':''}" data-radar-scope-v16="class">班排</button></div>${isRank?`<div class="rank-view-v16"><span class="label">查看</span><button class="metric-btn-v7 ${state.radarMode==='rank_raw'?'active':''}" data-radar-mode="rank_raw">名次</button><button class="metric-btn-v7 ${state.radarMode==='rank'?'active':''}" data-radar-mode="rank">百分位</button></div>`:''}<div><div class="subtle-note">最多叠加 4 次考试，只显示所选考试共同拥有数据的科目；坐标会自动缩放。</div>${isRank?`<div class="rank-compat-v16">${scopeLabel}和${scopeLabel}人数都可按科目单独填写；科目人数留空时自动使用总${scopeLabel}人数。</div>`:''}<div class="multi-select" style="margin-top:8px">${available.length?available.map(function(exam){return `<button class="select-pill ${state.radarSelection.includes(exam.id)?'active':''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`;}).join(''):`<span class="subtle-note">当前还没有可用于${isRank?scopeLabel+'雷达图':'雷达图'}的数据</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

function seedRowsV16(exam){
  if(exam) return Object.entries(exam.scores||{}).map(function(entry){
    var name=entry[0],row=entry[1]||{};
    return {name:name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??'',classRank:row.classRank??'',classParticipants:row.classParticipants??''};
  });
  var source=state.exams&&state.exams.length?state.exams[state.exams.length-1]:((state.unfilteredVisibleExamsV13||[]).length?state.unfilteredVisibleExamsV13[state.unfilteredVisibleExamsV13.length-1]:null);
  if(source&&Object.keys(source.scores||{}).length) return Object.entries(source.scores).map(function(entry){
    var name=entry[0],row=entry[1]||{};
    return {name:name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:'',classRank:'',classParticipants:''};
  });
  var templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(function(name){return {name:name,defaultMax:defaultMax(name)};});
  return templates.map(function(item){return {name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:'',classRank:'',classParticipants:''};});
}

openExam = function openExamV16(exam=null){
  var editing=!!exam;
  var today=new Date().toISOString().slice(0,10);
  var rows=seedRowsV16(exam);
  var options=categoryOptionsV14();
  var previous=(state.unfilteredVisibleExamsV13||[]);
  var last=previous.length?previous[previous.length-1]:null;
  var selected=exam?.grade_level||(!editing?(last?.grade_level||''):'');
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">未分类</option>${options.map(function(v){return `<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`;}).join('')}</select></div></div>
  <div class="section-head-v7"><div><h4>本次考试科目</h4><p>科目可自由增减；原始分和最终分可以使用不同满分。</p></div></div><div class="exam-subjects-v10" id="examSubjectsV16"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV16">＋ 添加科目 / 模块</button></div>
  <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV16">—</b></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV16">—</b></div></div>
  <div class="section-head-v7"><div><h4>排名（可选）</h4><p>旧版“名次”已统一视为年排；班排是新增字段，不会改动已有数据。</p></div></div><div class="total-ranks-v16"><div class="rank-scope-card-v16"><b>年级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_rank??''}" placeholder="如 36"></div><div><label>年级人数</label><input id="totalParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_participants??''}" placeholder="如 620"></div></div></div><div class="rank-scope-card-v16"><b>班级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalClassRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_rank??''}" placeholder="如 8"></div><div><label>班级人数</label><input id="totalClassParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_participants??''}" placeholder="如 45"></div></div></div></div>
  <div class="rank-compat-v16">各科的年级/班级人数可以留空，分别自动沿用上面的总年级人数 / 总班级人数。</div>
  <div class="visibility-box-v10"><div><b>图表显示</b><span>${exam?.is_hidden?'已隐藏，不参与图表。':'正常参与图表。'}</span></div><button class="secondary" id="toggleHiddenV16">${exam?.is_hidden?'恢复显示':'隐藏'}</button><input type="hidden" id="examHiddenV16" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV16">删除这次考试</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('examSubjectsV16');
  function sync(){
    var next=$$('.exam-subject-card-v10',list).map(function(card){return {
      name:$('.exam-subject-name-v10',card).value,
      target:$('.target-v16',card).value,
      raw:$('.raw-v16',card).value,
      actual:$('.actual-v16',card).value,
      rawMax:$('.rawmax-v16',card).value,
      max:$('.max-v16',card).value,
      rank:$('.year-rank-v16',card).value,
      participants:$('.year-participants-v16',card).value,
      classRank:$('.class-rank-v16',card).value,
      classParticipants:$('.class-participants-v16',card).value
    };});
    rows.splice(0,rows.length,...next);
  }
  function totals(){sync();document.getElementById('rawTotalV16').textContent=formatScore(rawTotalFromRowsV13(rows));document.getElementById('finalTotalV16').textContent=formatScore(finalTotalFromRowsV13(rows));}
  function card(row){return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v16" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>赋分 / 最终分</label><div class="score-with-max-v14"><input class="actual-v16" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v16" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v16" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v16" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="subject-ranks-v16"><div class="subject-rank-row-v16"><span>年排</span><input class="year-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.rank??''}" placeholder="名次"><input class="year-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.participants??''}" placeholder="年级人数"></div><div class="subject-rank-row-v16"><span>班排</span><input class="class-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classRank??''}" placeholder="名次"><input class="class-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classParticipants??''}" placeholder="班级人数"></div></div></div>`;}
  function renderRows(){
    list.innerHTML=rows.map(card).join('');
    $$('.remove-exam-subject-v10',list).forEach(function(button,index){button.onclick=function(){sync();rows.splice(index,1);renderRows();totals();};});
    $$('input',list).forEach(function(input){input.addEventListener('input',totals);});
  }
  renderRows();totals();
  function close(){modal.remove();state.modal=null;}
  $('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=function(event){if(event.target===modal)close();};
  document.getElementById('addExamSubjectV16').onclick=function(){sync();if(rows.length>=40)return toast('最多 40 个科目 / 模块');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:'',classRank:'',classParticipants:''});renderRows();var inputs=list.querySelectorAll('.exam-subject-name-v10');if(inputs.length)inputs[inputs.length-1].focus();};
  document.getElementById('toggleHiddenV16').onclick=function(){var input=document.getElementById('examHiddenV16'),next=input.value!=='1';input.value=next?'1':'0';this.textContent=next?'恢复显示':'隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后不参与图表。':'保存后正常参与图表。';};
  document.getElementById('deleteExamV16')?.addEventListener('click',async function(){if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=function(){saveExam(exam?.id||null,modal);};
};

validateExam = function validateExamV16(exam){
  function validatePair(rankValue,participantsValue,label){
    var r=num(rankValue),p=num(participantsValue);
    if(r!==null&&(!Number.isInteger(r)||r<1))return label+'请输入正整数';
    if(p!==null&&(!Number.isInteger(p)||p<1))return label.replace('排名','人数')+'请输入正整数';
    if(r!==null&&p!==null&&r>p)return label+'不能大于参考人数';
    return '';
  }
  var error=validatePair(exam.total_rank,exam.total_participants,'年级总排名');if(error)return error;
  error=validatePair(exam.total_class_rank,exam.total_class_participants,'班级总排名');if(error)return error;
  var yearTotal=num(exam.total_participants),classTotal=num(exam.total_class_participants);
  for(var entry of Object.entries(exam.scores||{})){
    var name=entry[0],row=entry[1]||{},max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual);
    if(max<=0||rawMax<=0)return `${name} 的满分必须大于 0`;
    if(target!==null&&target>max)return `${name}目标不能超过最终满分 ${formatScore(max)}`;
    if(actual!==null&&actual>max)return `${name}赋分/最终分不能超过最终满分 ${formatScore(max)}`;
    if(raw!==null&&raw>rawMax)return `${name}原始分不能超过原始满分 ${formatScore(rawMax)}`;
    var yr=num(row.rank),yp=num(row.participants),cr=num(row.classRank),cp=num(row.classParticipants);
    if(yr!==null&&(!Number.isInteger(yr)||yr<1))return `${name}年排请输入正整数`;
    if(yp!==null&&(!Number.isInteger(yp)||yp<1))return `${name}年级人数请输入正整数`;
    if(cr!==null&&(!Number.isInteger(cr)||cr<1))return `${name}班排请输入正整数`;
    if(cp!==null&&(!Number.isInteger(cp)||cp<1))return `${name}班级人数请输入正整数`;
    var yEffective=yp??yearTotal,cEffective=cp??classTotal;
    if(yr!==null&&yEffective!==null&&yr>yEffective)return `${name}年排不能大于年级人数`;
    if(cr!==null&&cEffective!==null&&cr>cEffective)return `${name}班排不能大于班级人数`;
  }
  return '';
};

saveExam = async function saveExamV16(id,modal){
  var button=$('.save-btn',modal);
  var exam={id:id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV16',modal)?.value||'',total_participants:$('#totalParticipantsV16',modal)?.value||'',total_class_rank:$('#totalClassRankV16',modal)?.value||'',total_class_participants:$('#totalClassParticipantsV16',modal)?.value||'',is_hidden:$('#examHiddenV16',modal)?.value==='1',scores:{}};
  var seen=new Set();
  for(var card of $$('.exam-subject-card-v10',modal)){
    var name=$('.exam-subject-name-v10',card).value.trim();
    if(!name)return toast('请填写科目名称，或删除空白科目');
    if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);
    exam.scores[name]={target:$('.target-v16',card).value,raw:$('.raw-v16',card).value,actual:$('.actual-v16',card).value,rawMax:$('.rawmax-v16',card).value,max:$('.max-v16',card).value,rank:$('.year-rank-v16',card).value,participants:$('.year-participants-v16',card).value,classRank:$('.class-rank-v16',card).value,classParticipants:$('.class-participants-v16',card).value};
  }
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');
  var error=validateExam(exam);if(error)return toast(error);
  button.disabled=true;button.textContent='保存中…';
  try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}
  catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}
};

var recordHtmlBeforeV16=recordHtml;
recordHtml=function recordHtmlV16(exam){
  var html=recordHtmlBeforeV16(exam);
  html=html.replace(/<span class="score-tag"><b>总排名[\s\S]*?<\/span>/g,'');
  var year=rankInfoByScopeV16(exam,'总分','year');
  var cls=rankInfoByScopeV16(exam,'总分','class');
  var badges='';
  if(year.rank!==null)badges+=`<span class="score-tag"><b>年排 ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;
  if(cls.rank!==null)badges+=`<span class="score-tag"><b>班排 ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;
  if(badges)html=html.replace('</div><div class="record-actions">',`${badges}</div><div class="record-actions">`);
  return html;
};

var bindPageBeforeV16=bindPage;
bindPage=function bindPageV16(){
  bindPageBeforeV16();
  $$('[data-trend-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.trendScopeV16;if(scope==='score'){state.trendMetric='score';}else{state.rankScopeV16=scope;if(state.trendMetric!=='rank_raw'&&state.trendMetric!=='rank')state.trendMetric='rank_raw';}render();};});
  $$('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){state.rankScopeV16=button.dataset.radarScopeV16;if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';state.radarSelection=[];ensureRadarSelection();render();};});
};