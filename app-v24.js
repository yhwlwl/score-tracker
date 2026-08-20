// v24 / product v2.0: explicit subject settings mapping, manual weighted totals, and bundled read requests.
(function(){
  var PRODUCT_VERSION_V24='v2.0';

  function syncVersionV24(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V24);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V24;
  }
  syncVersionV24();

  var style=document.createElement('style');
  style.id='app-v24-style';
  style.textContent=`
    .manual-total-v24{border-top:1px dashed var(--line);margin-top:10px;padding-top:11px}
    .manual-total-title-v24{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
    .manual-total-title-v24 b{font-size:12px;color:var(--text)}
    .manual-total-title-v24 span{font-size:9px;border:1px solid #dfe4ee;background:#fff;border-radius:999px;padding:3px 7px;color:var(--muted)}
    .manual-total-grid-v24{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .manual-total-field-v24{display:grid;gap:5px}
    .manual-total-field-v24 label{font-size:10px;color:var(--muted);font-weight:700}
    .manual-total-field-v24 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}
    .manual-total-field-v24 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .manual-total-note-v24{font-size:10px;color:var(--muted);line-height:1.6;margin-top:7px}
    .manual-total-note-v24 b{color:var(--text)}
    .subject-sync-note-v24{margin-top:10px;padding:10px 12px;border:1px solid #e2e7f0;background:#f8faff;border-radius:12px;font-size:11px;color:#667085;line-height:1.6}
    .subject-sync-note-v24 b{color:var(--text)}
    @media(max-width:620px){
      .manual-total-grid-v24{grid-template-columns:1fr}
      .manual-total-v24{margin-top:9px;padding-top:10px}
    }
  `;
  document.head.appendChild(style);

  // One list_exams response now also carries modules and account identity. Reuse it instead of issuing
  // a second modules request and a separate username identity read.
  if(typeof dataApiV7==='function'){
    var dataApiBeforeV24=dataApiV7;
    dataApiV7=async function dataApiV24(action,payload={}){
      if(action==='save_exam'&&payload&&payload.exam){
        var modal=state.modal&&state.modal.isConnected?state.modal:document.querySelector('.modal-backdrop');
        var finalInput=modal&&modal.querySelector('.total-actual-override-v24');
        var rawInput=modal&&modal.querySelector('.total-raw-override-v24');
        if(finalInput)payload.exam.total_actual_score=String(finalInput.value||'').trim();
        if(rawInput)payload.exam.total_raw_score=String(rawInput.value||'').trim();
      }
      var data=await dataApiBeforeV24(action,payload);
      if((action==='list_exams'||action==='bootstrap')&&data){
        if(Array.isArray(data.modules)){
          state.modulesV18=data.modules;
          state._modulesBundledV24=true;
        }
        if(data.user){
          state.user=Object.assign({},state.user||{},data.user);
          state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username||'';
          state._identityBundledV24=true;
        }
      }
      return data;
    };
  }
  if(typeof modulesApiV18==='function'){
    var modulesApiBeforeV24=modulesApiV18;
    modulesApiV18=async function modulesApiV24(action,payload={}){
      if(action==='list_modules'&&state._modulesBundledV24)return{modules:state.modulesV18||[]};
      var data=await modulesApiBeforeV24(action,payload);
      if(action==='save_modules'&&data&&Array.isArray(data.modules)){
        state.modulesV18=data.modules;
        state._modulesBundledV24=true;
      }
      return data;
    };
  }
  if(typeof usernameApiV19==='function'){
    var usernameApiBeforeV24=usernameApiV19;
    usernameApiV19=async function usernameApiV24(action,payload){
      if(action==='get'&&state._identityBundledV24&&state.user){
        return{user:{username:state.user.username,originalUsername:state.originalUsernameV19||state.user.username}};
      }
      return usernameApiBeforeV24(action,payload);
    };
  }

  // Manual total overrides are nullable. Null means "use automatic sum".
  var totalForBeforeV24=totalFor;
  totalFor=function totalForV24(exam,key){
    if(key==='actual'){
      var override=num(exam?.total_actual_score);
      if(override!==null)return override;
    }
    return totalForBeforeV24(exam,key);
  };
  if(typeof totalRawForV13==='function'){
    var totalRawBeforeV24=totalRawForV13;
    totalRawForV13=function totalRawForV24(exam){
      var override=num(exam?.total_raw_score);
      return override!==null?override:totalRawBeforeV24(exam);
    };
  }

  // If a user explicitly supplies a weighted final total, treat it as the exam's authoritative
  // headline even when the component subject rows are incomplete.
  if(typeof latestMetricV20==='function'){
    var latestMetricBeforeV24=latestMetricV20;
    latestMetricV20=function latestMetricV24(){
      var exams=typeof sortedVisibleExamsV20==='function'?sortedVisibleExamsV20():[...(state.exams||[])];
      for(var i=exams.length-1;i>=0;i--){
        var exam=exams[i],override=num(exam?.total_actual_score);
        if(override===null)continue;
        var subjects=typeof effectiveScoreSubjectsV20==='function'?effectiveScoreSubjectsV20(exam):[];
        var previous=null;
        for(var j=i-1;j>=0;j--){
          var prevSubjects=typeof effectiveScoreSubjectsV20==='function'?effectiveScoreSubjectsV20(exams[j]):[];
          if(subjects.length&&typeof sameSubjectSetV20==='function'&&!sameSubjectSetV20(subjects,prevSubjects))continue;
          var pv=totalFor(exams[j],'actual');
          if(pv!==null){previous=pv;break;}
        }
        return{label:'最近一次真实总分',value:override,exam:exam,delta:previous===null?null:override-previous,deltaLabel:'较上次'};
      }
      return latestMetricBeforeV24();
    };
  }

  function modalAutoTotalsV24(modal){
    var finalSum=0,rawSum=0,finalCount=0,rawCount=0;
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      var excluded=!!card.querySelector('.exclude-total-check-v17')?.checked;
      if(excluded)return;
      var actual=num(card.querySelector('.actual-v16')?.value);
      var raw=num(card.querySelector('.raw-v16')?.value);
      var finalMax=num(card.querySelector('.max-v16')?.value);
      var rawMax=num(card.querySelector('.rawmax-v16')?.value)??finalMax;
      if(actual===null&&raw!==null&&finalMax!==null&&rawMax===finalMax)actual=raw;
      if(actual!==null){finalSum+=actual;finalCount++;}
      var rawEffective=raw!==null?raw:actual;
      if(rawEffective!==null){rawSum+=rawEffective;rawCount++;}
    });
    return{final:finalCount?Math.round(finalSum*100)/100:null,raw:rawCount?Math.round(rawSum*100)/100:null};
  }

  function decorateManualTotalsV24(exam,modal){
    if(!modal||modal.dataset.v24Totals==='1')return;
    var totalCard=modal.querySelector('.combo-total-v21')||modal.querySelector('.score-total-preview-v13')?.parentElement;
    if(!totalCard)return;
    modal.dataset.v24Totals='1';
    var box=document.createElement('div');
    box.className='manual-total-v24';
    box.innerHTML=`<div class="manual-total-title-v24"><b>总分计算</b><span>可选手动值</span></div><div class="manual-total-grid-v24"><div class="manual-total-field-v24"><label>最终 / 赋分总分</label><input class="total-actual-override-v24" inputmode="decimal" value="${exam?.total_actual_score??''}" placeholder="自动计算"></div><div class="manual-total-field-v24"><label>原始总分</label><input class="total-raw-override-v24" inputmode="decimal" value="${exam?.total_raw_score??''}" placeholder="自动计算"></div></div><div class="manual-total-note-v24">留空时按本次科目自动汇总；如当地规则需要加权，可直接填写学校给出的总分。<b>手动值会用于记录、趋势和首页最近成绩。</b></div>`;
    var head=totalCard.querySelector('.combo-head-v21');
    if(head)head.insertAdjacentElement('afterend',box);else totalCard.insertBefore(box,totalCard.firstChild);
    var finalInput=box.querySelector('.total-actual-override-v24'),rawInput=box.querySelector('.total-raw-override-v24');
    function refresh(){
      var x=modalAutoTotalsV24(modal);
      finalInput.placeholder=x.final===null?'自动计算':'自动 '+formatScore(x.final);
      rawInput.placeholder=x.raw===null?'自动计算':'自动 '+formatScore(x.raw);
    }
    modal.addEventListener('input',function(e){if(!e.target.matches('.total-actual-override-v24,.total-raw-override-v24'))refresh();});
    refresh();
  }

  var openExamBeforeV24=openExam;
  openExam=function openExamV24(exam=null){
    var result=openExamBeforeV24(exam);
    if(state.modal)decorateManualTotalsV24(exam,state.modal);
    return result;
  };

  // Make the settings -> entry-list relationship explicit. The underlying picker already reads
  // state.subjectConfigs; this wording makes the source of truth obvious to users.
  var accountHtmlBeforeV24=accountHtml;
  accountHtml=function accountHtmlV24(){
    var html=accountHtmlBeforeV24();
    html=html.replace(/(<h3 class="card-title">科目设置<\/h3><p class="card-sub">)[\s\S]*?(<\/p>)/,
      '$1在这里添加、改名、删除科目并设置默认满分；保存后会立即同步到“记录考试 → 选择科目”的列表。$2');
    html=html.replace(/(<div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。<\/div>)/,
      '$1<div class="subject-sync-note-v24"><b>科目设置就是录入时的选择列表。</b> 这里没有的科目不会作为新考试的可选项；历史考试仍保留原数据。</div>');
    return html;
  };
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV24=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV24(){
      var result=openSubjectManagerBeforeV24();
      var modal=state.modal;if(!modal)return result;
      var info=modal.querySelector('.info-box');
      if(info)info.innerHTML='<b>这里维护录分科目列表。</b> 可以新增、改名、移除并设置默认满分；保存后，新建/编辑考试里的“选择科目”会直接读取这里。最多 20 个。';
      return result;
    };
  }

  syncVersionV24();
})();
