// v20 / product v1.1: mobile record polish, compact radar controls, fair latest metric, collapsible groups, raw-only score fallback.
state.collapsedRecordGroupsV20 = state.collapsedRecordGroupsV20 || new Set();

(function injectV20Styles(){
  if(document.getElementById('app-v20-style')) return;
  var style=document.createElement('style');
  style.id='app-v20-style';
  style.textContent=`
    .record-group-toggle-v20{
      border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;
      padding:6px 10px;font-size:10px;line-height:1;white-space:nowrap
    }
    .grade-section-head-v13{display:flex;align-items:center;gap:8px}
    .grade-section-head-v13 h3{margin-right:auto}
    @media(max-width:620px){
      .records-card{padding:4px 14px!important;overflow:hidden}
      .record{
        width:100%;min-width:0;display:grid!important;
        grid-template-columns:1fr!important;
        grid-template-areas:"date" "actions" "scores"!important;
        gap:10px!important;align-items:start!important;padding:16px 0!important
      }
      .record-date{grid-area:date;min-width:0;line-height:1.45}
      .record-date b{max-width:100%;overflow-wrap:anywhere}
      .record-actions,.record-actions-v10{
        grid-area:actions;width:100%;max-width:none!important;min-width:0;
        display:flex!important;flex-direction:row!important;align-items:center!important;
        justify-content:flex-start!important;gap:7px!important
      }
      .record-action-btn-v10{width:auto!important;min-width:58px!important;padding:7px 10px!important}
      .record-scores{
        grid-area:scores;width:100%;min-width:0;display:flex!important;flex-wrap:wrap!important;
        align-items:flex-start;gap:7px!important
      }
      .record-scores .score-tag{
        flex:0 1 auto;max-width:100%;min-width:0;white-space:normal!important;
        overflow-wrap:anywhere;word-break:normal;line-height:1.45
      }

      .radar-toolbar>.toggle-row:first-child{
        width:100%;display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:5px!important;align-items:center
      }
      .radar-toolbar>.toggle-row:first-child>.label{grid-column:1/-1}
      .radar-toolbar>.toggle-row:first-child>.chip{
        width:100%!important;min-width:0!important;padding:7px 2px!important;
        font-size:10.5px!important;text-align:center
      }
      .record-group-toggle-v20{padding:6px 9px}
    }
    @media(max-width:420px){
      .records-card{padding-left:12px!important;padding-right:12px!important}
      .record-action-btn-v10{min-width:54px!important;padding:7px 9px!important}
      .radar-toolbar>.toggle-row:first-child{gap:4px!important}
      .radar-toolbar>.toggle-row:first-child>.chip{font-size:10px!important;padding:6px 1px!important}
    }
  `;
  document.head.appendChild(style);
})();

function effectiveScoreSubjectsV20(exam){
  var moduleNames=typeof moduleNamesV18==='function'?moduleNamesV18():new Set();
  return Object.entries(exam?.scores||{}).filter(function(entry){
    var name=entry[0],row=entry[1]||{};
    return !moduleNames.has(name)&&!row.excludeFromTotal&&examScore(exam,name,'actual')!==null;
  }).map(function(entry){return entry[0];});
}

function sortedVisibleExamsV20(){
  return [...(state.exams||[])].sort(function(a,b){
    var d=String(a.exam_date||'').localeCompare(String(b.exam_date||''));
    if(d)return d;
    return String(a.created_at||'').localeCompare(String(b.created_at||''));
  });
}

function sameSubjectSetV20(a,b){
  if(a.length!==b.length)return false;
  var aa=[...a].sort(),bb=[...b].sort();
  return aa.every(function(x,i){return x===bb[i];});
}

function latestMetricV20(){
  var exams=sortedVisibleExamsV20();
  for(var i=exams.length-1;i>=0;i--){
    var latest=exams[i],subjects=effectiveScoreSubjectsV20(latest);
    if(!subjects.length)continue;

    if(subjects.length===1){
      var subject=subjects[0],value=examScore(latest,subject,'actual');
      var previous=null;
      for(var j=i-1;j>=0;j--){
        var pv=examScore(exams[j],subject,'actual');
        if(pv!==null){previous={exam:exams[j],value:pv};break;}
      }
      return {
        label:'最近一次'+subject+'成绩',
        value:value,
        exam:latest,
        delta:previous?value-previous.value:null,
        deltaLabel:'较上次同科'
      };
    }

    var value=totalFor(latest,'actual');
    if(value===null)continue;
    var previous=null;
    for(var j=i-1;j>=0;j--){
      var prevSubjects=effectiveScoreSubjectsV20(exams[j]);
      if(!sameSubjectSetV20(subjects,prevSubjects))continue;
      var pv=totalFor(exams[j],'actual');
      if(pv!==null){previous={exam:exams[j],value:pv};break;}
    }
    return {
      label:'最近一次真实总分',
      value:value,
      exam:latest,
      delta:previous?value-previous.value:null,
      deltaLabel:'较上次'
    };
  }
  return null;
}

function patchLatestHeroV20(){
  if(state.page!=='home')return;
  var card=document.querySelector('.hero-stat');
  if(!card)return;
  var metric=latestMetricV20();
  if(!metric)return;
  var delta=metric.delta;
  card.innerHTML=`<div><div class="stat-label">${escapeHtml(metric.label)}</div><div class="stat-value">${formatScore(metric.value)}</div><div class="stat-sub">${escapeHtml(metric.exam.name)} · ${fmtDate(metric.exam.exam_date)}</div></div>${delta===null?'':`<span class="trend-pill">${delta>=0?'↗':'↘'} ${metric.deltaLabel} ${delta>=0?'+':''}${formatScore(delta)} 分</span>`}`;
}

function decorateRecordGroupCollapseV20(){
  if(state.page!=='records')return;
  document.querySelectorAll('.grade-section-v13').forEach(function(section){
    var head=section.querySelector('.grade-section-head-v13');
    var card=section.querySelector('.records-card');
    var title=head?.querySelector('h3');
    if(!head||!card||!title)return;
    var key=String(title.textContent||'').trim();
    var button=head.querySelector('.record-group-toggle-v20');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='record-group-toggle-v20';
      head.appendChild(button);
    }
    function apply(){
      var collapsed=state.collapsedRecordGroupsV20.has(key);
      card.hidden=collapsed;
      button.textContent=collapsed?'展开':'收起';
      button.setAttribute('aria-expanded',collapsed?'false':'true');
    }
    button.onclick=function(){
      if(state.collapsedRecordGroupsV20.has(key))state.collapsedRecordGroupsV20.delete(key);
      else state.collapsedRecordGroupsV20.add(key);
      apply();
    };
    apply();
  });
}

var examScoreBeforeV20=examScore;
examScore=function examScoreV20(exam,subject,key){
  var value=examScoreBeforeV20(exam,subject,key);
  if(key==='actual'&&value===null){
    var raw=examScoreBeforeV20(exam,subject,'raw');
    if(raw!==null)return raw;
  }
  return value;
};

var saveExamBeforeV20=saveExam;
saveExam=async function saveExamV20(id,modal){
  modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
    var raw=card.querySelector('.raw-v16');
    var actual=card.querySelector('.actual-v16');
    if(raw&&actual&&String(actual.value||'').trim()===''&&String(raw.value||'').trim()!==''){
      actual.value=raw.value;
    }
  });
  return saveExamBeforeV20(id,modal);
};

var recordHtmlBeforeV20=recordHtml;
recordHtml=function recordHtmlV20(exam){
  var clone=Object.assign({},exam,{scores:{}});
  var fallbackRawValues=[];
  Object.entries(exam?.scores||{}).forEach(function(entry){
    var name=entry[0],row=entry[1]||{},next=Object.assign({},row);
    if(num(next.actual)===null&&num(next.raw)!==null){
      next.actual=next.raw;
      fallbackRawValues.push(formatScore(next.raw));
    }
    clone.scores[name]=next;
  });
  var html=recordHtmlBeforeV20(clone);
  fallbackRawValues.forEach(function(value){
    html=html.replace(`<span class="raw-final-inline-v13"> · 原始 <b>${value}</b></span>`,'');
  });
  var finalTotal=totalFor(clone,'actual'),rawTotal=typeof totalRawForV13==='function'?totalRawForV13(clone):null;
  if(finalTotal!==null&&rawTotal!==null&&Math.abs(Number(finalTotal)-Number(rawTotal))<0.000001){
    html=html.replace(` · 原始总分 ${formatScore(rawTotal)}`,'');
  }
  return html;
};

var bindPageBeforeV20=bindPage;
bindPage=function bindPageV20(){
  bindPageBeforeV20();
  patchLatestHeroV20();
  decorateRecordGroupCollapseV20();
};
