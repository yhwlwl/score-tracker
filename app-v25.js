// v25 / product v2.4: combo ranks, combo trends, score/percent view, full-trend PNG export,
// tooltip clamping, record/group reordering, password rule update, overview redesign.
(function(){
  var PRODUCT_VERSION_V25='v2.4';

  function syncVersionV25(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V25);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V25;
  }
  syncVersionV25();

  state.scoreViewV25 = state.scoreViewV25 || 'score';

  // ---------- styles ----------
  if(typeof document!=='undefined'){
    var style=document.createElement('style');
    style.id='app-v25-style';
    style.textContent=`
      .combo-rank-v25{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
      .combo-rank-v25>div{min-width:0}
      .combo-rank-v25 b{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:5px}
      .combo-rank-pair-v25{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .combo-rank-pair-v25 input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;padding:8px 7px;background:#fff;outline:none;font-size:12px}
      .trend-actions-v25{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px}
      .trend-actions-v25 button{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:7px 12px;font-size:11px;cursor:pointer;transition:border-color .15s,color .15s}
      .trend-actions-v25 button:hover{border-color:#a9b4c8;color:#2c3648}
      .trend-actions-v25 button:active{transform:scale(.97)}
      .full-trend-modal-v25 .modal{max-width:920px}
      .full-trend-stage-v25{overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px 12px}
      .full-trend-scroll-hint-v25{font-size:10px;color:var(--muted);margin-top:7px}
      .full-trend-actions-v25{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      .score-view-v25{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;margin:0 0 4px}
      .score-view-v25 .label{font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap}
      .score-view-v25 .basis-btn-v13{flex:0 1 auto;width:auto;padding:7px 11px;white-space:nowrap}
      .combo-chips-v25{display:flex;gap:8px;overflow:auto;padding:0 0 8px;margin-top:6px;scrollbar-width:none}
      .combo-chips-v25::-webkit-scrollbar{display:none}
      .order-btn-v25{border:1px solid var(--line);background:#fff;color:#667085;border-radius:8px;width:28px;height:28px;font-size:12px;line-height:1;padding:0;flex:0 0 auto;cursor:pointer}
      .order-btn-v25:hover, .order-btn-v25:active{border-color:#a9b4c8;color:#2c3648}
      .grade-section-head-v13 .order-btn-v25{width:30px;height:26px}
      .tooltip-card{white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:min(300px,calc(100vw - 16px))}
      .people-total-v25{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 10px}
      .people-total-v25>div{display:grid;gap:5px;min-width:0}
      .people-total-v25 label{font-size:10px;color:var(--muted);font-weight:700}
      .people-total-v25 input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}
      .end-date-field-v25{min-width:0}
      .combo-chips-v25 .label{font-size:12px;color:var(--muted);font-weight:700;white-space:nowrap}
      .basis-btn-v13.active{background:var(--text);color:#fff;border-color:var(--text)}
      .score-basis-v13{margin:0 0 10px}
      .radar-pick-v25{margin-top:8px}
      .radar-pick-v25 .secondary{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:8px 13px;font-size:12px;cursor:pointer}
      .radar-picked-v25{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .radar-pick-chip-v25{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;color:#556070;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}
      .radar-pick-chip-v25:hover{border-color:#a9b4c8}
      .radar-pick-group-v25{margin:0 0 12px}
      .radar-pick-group-v25 h4{font-size:12px;color:var(--muted);margin:0 0 4px}
      .radar-pick-option-v25{display:flex;align-items:center;gap:8px;padding:9px 2px;font-size:13px;color:var(--text);border-bottom:1px solid var(--line);cursor:pointer}
      .radar-pick-option-v25 input{width:16px;height:16px;accent-color:#5d72e8}
      .trend-legend-row-v25{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}
      .trend-legend-row-v25 .legend{margin:0}
      .trend-legend-row-v25 .trend-scroll-hint-v19{margin:0;margin-left:auto;text-align:right}
      .quick-card .mini-stat span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rank-entry-mode-v17{gap:6px;margin:2px 0 28px}
      .rank-entry-mode-v17 button{padding:5px 9px;font-size:10.5px}
      .rank-entry-top-v21{margin:10px 0 14px;padding:9px 12px}
      .people-total-v25{margin-top:10px}
      @media(max-width:620px){
        .combo-rank-v25{grid-template-columns:1fr;gap:8px;padding-top:9px}
        .full-trend-stage-v25{padding:10px 8px}
        .order-btn-v25{width:32px;height:32px}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function moduleByIdV25(id){return(state.modulesV18||[]).find(function(m){return String(m&&m.id)===String(id);})||null;}
  function comboIdV25(name){var m=(state.modulesV18||[]).find(function(x){return x&&x.name===name;});return m?String(m.id):null;}
  function isComboSubjectV25(s){return comboIdV25(s)!==null;}
  function comboRankInfoV25(exam,name,scope){
    if(!exam||!name)return{rank:null,participants:null,performance:null};
    var id=comboIdV25(name);if(!id)return{rank:null,participants:null,performance:null};
    var ranksMap=examRanksForV25(exam);
    var row=(ranksMap&&ranksMap[id])||{};
    var isClass=scope==='class';
    var rank=num(isClass?row.classRank:row.yearRank);
    var participants=num(isClass?row.classParticipants:row.yearParticipants);
    if(participants===null)participants=num(isClass?exam.total_class_participants:exam.total_participants);
    var performance=rank===null?null:(typeof rankPerformanceV7==='function'?rankPerformanceV7(rank,participants):null);
    return{rank:rank,participants:participants,performance:performance};
  }
  function scopeLabelV25(){return(state.rankScopeV16==='class')?'班排':'年排';}

  // A) 年级/班级总人数的本机记忆与自动填充
  function peopleKeyV25(){return 'st_people_v25_'+(state.user&&state.user.username||'anon');}
  function peopleLoadV25(){
    var raw=localStorage.getItem(peopleKeyV25())||'';var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    return(d&&typeof d==='object')?d:{};
  }
  function peopleSaveV25(d){try{localStorage.setItem(peopleKeyV25(),JSON.stringify(d||{}));}catch(e){}}

  // 首页侧栏概况：次数 / 平均得分率 / 达成目标次数 / 距最近目标分差
  // 得分率用于「平均」（科目数不同可比）；目标达成与差距按同一场考试的原始总分比较（同一场满分相同，分差最直观）
  function quickStatsV25(){
    var exams=state.exams||[];
    var rates=[];
    exams.forEach(function(e){var r=totalRate(e,'actual');if(r!==null)rates.push({rate:r,exam:e});});
    var sum=0;rates.forEach(function(x){sum+=x.rate;});
    var avg=rates.length?Math.round(sum/rates.length*10)/10:null;
    var met=0,targetExams=0,gap=null;
    for(var i=0;i<exams.length;i++){
      var e=exams[i],a=totalFor(e,'actual'),t=totalFor(e,'target');
      if(t===null)continue;
      targetExams++;
      if(a!==null&&a>=t)met++;
      if(gap===null&&a!==null)gap=Math.round((t-a)*10)/10;
    }
    return{count:exams.length,avg:avg,met:met,targetExams:targetExams,gap:gap};
  }

  // 组合排名：云端优先，本地兜底（后端 Edge Function 支持 moduleRanks 前先存在本机）
  function comboRanksKeyV25(){return 'st_moduleranks_v25_'+(state.user&&state.user.username||'anon');}
  function comboRanksCacheV25(){
    try{var raw=localStorage.getItem(comboRanksKeyV25())||'';var d=raw?JSON.parse(raw):null;return d&&typeof d==='object'?d:{};}catch(e){return{};}
  }
  function examRanksForV25(exam){
    if(exam&&exam.moduleRanks&&typeof exam.moduleRanks==='object'&&Object.keys(exam.moduleRanks).length)return exam.moduleRanks;
    if(!exam||!exam.exam_date||!exam.name)return{};
    return comboRanksCacheV25()[exam.exam_date+'|'+exam.name]||{};
  }
  function rememberRanksV25(examDate,examName,ranks){
    try{var c=comboRanksCacheV25();c[String(examDate||'')+'|'+String(examName||'')]=ranks||{};localStorage.setItem(comboRanksKeyV25(),JSON.stringify(c));}catch(e){}
  }
  function fillPeopleDownV25(modal,year,cls){
    if(!modal)return;
    function fill(input,val){
      if(!input||!val)return;
      if(input.dataset.userSetV25==='1')return;                 // 用户改过：以用户为准
      if(input.dataset.autoV25!=='1'&&String(input.value||'')!=='')return; // 已有保存值（编辑旧考试）
      input.value=val;input.dataset.autoV25='1';
    }
    fill(modal.querySelector('#totalParticipantsV16'),year);
    fill(modal.querySelector('#totalClassParticipantsV16'),cls);
    modal.querySelectorAll('.year-participants-v16').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.class-participants-v16').forEach(function(i){fill(i,cls);});
    // 组合分的人数空同样自动填（用户改过的不覆盖）
    modal.querySelectorAll('.combo-yp-v25').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.combo-cp-v25').forEach(function(i){fill(i,cls);});
  }
  // C1) 弹窗内文案精简：删纯说明文字，保留必要提示（防误删、状态说明）
  function declutterModalV25(modal){
    if(!modal)return;
    modal.querySelectorAll('.rank-science-box-v7,.rank-compat-v16,.position-note-v17,.template-note-v10').forEach(function(el){el.remove();});
    modal.querySelectorAll('.section-head-v7 p').forEach(function(p){p.remove();});
    // 科目设置弹窗里的「移除不删历史成绩」是必要提示，保留
    if(!modal.querySelector('#subjectConfigList')){
      modal.querySelectorAll('p.form-note').forEach(function(p){p.remove();});
    }
  }
  // C1) 页面文案精简：删冗余介绍，保留必要提示（防误删、功能前缀、空态、图例）
  function stripVerboseV25(html){
    return String(html||'')
      .replace(/<p class="card-sub">[\s\S]*?<\/p>/g,'')
      .replace(/<p class="hero-desc">[\s\S]*?<\/p>/g,'')
      .replace(/<div class="axis-caption-v6">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-method-v7">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="raw-rank-note-v11">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-science-box-v7">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-compat-v16">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="position-note-v17">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="subject-sync-note-v24">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="username-origin-v19">[\s\S]*?<\/div>/g,'')
      .replace(/<span class="template-note-v10">[\s\S]*?<\/span>/g,'')
      .replace(/<div class="subtle-note"([^>]*)>([\s\S]*?)<\/div>/g,function(m,attrs,inner){
        if(inner.indexOf('移除科目')!==-1||inner.indexOf('不会删除历史成绩')!==-1||inner.indexOf('组合：')!==-1)return m;
        return '';
      })
      .replace(/(<div class="card hero-main">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/,'$1看见起伏，也看见自己在进步。$2')
      .replace(/(<div class="page-head">[\s\S]*?<h2>[^<]*<\/h2>)<p>[\s\S]*?<\/p>/g,'$1');
  }

  // ---------- A) optional ranks per combo in the exam modal ----------
  var openExamBeforeV25=openExam;
  openExam=function openExamV25(exam){
    openExamBeforeV25(exam);
    var modal=state.modal;if(!modal)return;

    // A) 年级/班级总人数：一行设置，本机记住，自动填到下面所有人数空（用户改过的不覆盖）
    var entry=modal.querySelector('.rank-entry-mode-v17');
    if(entry&&!modal.querySelector('.people-total-v25')){
      var peopleBox=document.createElement('div');
      peopleBox.className='people-total-v25';
      peopleBox.innerHTML='<div><label>年级总人数</label><input class="pt-year-v25" inputmode="numeric" pattern="[0-9]*" placeholder="如 620"></div><div><label>班级总人数</label><input class="pt-class-v25" inputmode="numeric" pattern="[0-9]*" placeholder="如 45"></div>';
      entry.insertAdjacentElement('afterend',peopleBox);
      var pYear=peopleBox.querySelector('.pt-year-v25'),pClass=peopleBox.querySelector('.pt-class-v25');
      var savedPeople=peopleLoadV25();
      pYear.value=savedPeople.year??(modal.querySelector('#totalParticipantsV16')?.value||'');
      pClass.value=savedPeople.class??(modal.querySelector('#totalClassParticipantsV16')?.value||'');
      function fillDown(){fillPeopleDownV25(modal,pYear.value.trim(),pClass.value.trim());}
      pYear.addEventListener('input',function(){peopleSaveV25({year:pYear.value.trim(),class:pClass.value.trim()});fillDown();});
      pClass.addEventListener('input',function(){peopleSaveV25({year:pYear.value.trim(),class:pClass.value.trim()});fillDown();});
      modal.querySelectorAll('#totalParticipantsV16,#totalClassParticipantsV16,.year-participants-v16,.class-participants-v16').forEach(function(input){
        input.addEventListener('input',function(){input.dataset.userSetV25='1';delete input.dataset.autoV25;});
      });
      fillDown();
    }

    // B) 结束日期（时间段，可选；仅考试记录页展示，趋势图仍用开始日期）
    var dateField=modal.querySelector('#examDate')?.closest('.field');
    if(dateField&&!modal.querySelector('#examEndDateV25')){
      var endField=document.createElement('div');
      endField.className='field end-date-field-v25';
      endField.innerHTML='<label>结束日期（可选）</label><input id="examEndDateV25" type="date" value="'+escapeHtml(exam&&exam.end_date?exam.end_date:'')+'">';
      dateField.insertAdjacentElement('afterend',endField);
    }

    // C1) 弹窗文案精简
    declutterModalV25(modal);

    var list=modal.querySelector('#comboListV21');if(!list)return;
    var saved={};Object.entries(exam&&exam.moduleRanks?exam.moduleRanks:examRanksForV25(exam)).forEach(function(entry){saved[entry[0]]=entry[1]||{};});
    function decorateCard(card){
      if(card.querySelector('.combo-rank-v25'))return;
      var id=card.dataset.comboId;
      modal._comboRankCacheV25=modal._comboRankCacheV25||{};
      var s=(modal._comboRankCacheV25&&modal._comboRankCacheV25[id])||saved[id]||{};
      var block=document.createElement('div');
      block.className='combo-rank-v25';
      block.innerHTML=
        '<div><b>年排（可选）</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-yr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="'+escapeHtml(s.yearRank??'')+'">'+
        '<input class="combo-yp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="年级人数" value="'+escapeHtml(s.yearParticipants??'')+'">'+
        '</div></div>'+
        '<div><b>班排（可选）</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-cr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="'+escapeHtml(s.classRank??'')+'">'+
        '<input class="combo-cp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="班级人数" value="'+escapeHtml(s.classParticipants??'')+'">'+
        '</div></div>';
      card.appendChild(block);
      // 输入即缓存：组合卡被重建（增删组合）时已填排名不丢失；用户改过的人数不再被自动填充覆盖
      block.querySelectorAll('input').forEach(function(inp){
        inp.dataset.userSetV25=(String(inp.value||'').trim()!=='')?'1':'';
        inp.addEventListener('input',function(){
          inp.dataset.userSetV25='1';
          delete inp.dataset.autoV25;
          var c={};
          c.yearRank=(card.querySelector('.combo-yr-v25')?.value||'').trim();
          c.yearParticipants=(card.querySelector('.combo-yp-v25')?.value||'').trim();
          c.classRank=(card.querySelector('.combo-cr-v25')?.value||'').trim();
          c.classParticipants=(card.querySelector('.combo-cp-v25')?.value||'').trim();
          modal._comboRankCacheV25[id]=c;
        });
      });
    }
    function decorateAll(){list.querySelectorAll('.combo-card-v21').forEach(decorateCard);}
    decorateAll();
    try{
      var obs=new MutationObserver(function(){
        decorateAll();
        var ptY=modal.querySelector('.pt-year-v25'),ptC=modal.querySelector('.pt-class-v25');
        if(ptY)fillPeopleDownV25(modal,ptY.value.trim(),ptC?ptC.value.trim():'');
      });
      obs.observe(list,{childList:true,subtree:true});
      modal._comboRankObserverV25=obs;
    }catch(e){}
  };

  function validateComboRanksV25(ranks){
    function chkPair(rankValue,peopleValue,rLabel,pLabel){
      var r=num(rankValue),p=num(peopleValue);
      if(r!==null&&(!Number.isInteger(r)||r<1))return rLabel+'请输入正整数';
      if(p!==null&&(!Number.isInteger(p)||p<1))return pLabel+'请输入正整数';
      if(r!==null&&p!==null&&r>p)return rLabel+'不能大于'+pLabel;
      return '';
    }
    for(var id in ranks){
      var r=ranks[id],e=chkPair(r.yearRank,r.yearParticipants,'组合年排名次','年级人数');if(e)return e;
      e=chkPair(r.classRank,r.classParticipants,'组合班排名次','班级人数');if(e)return e;
    }
    return '';
  }

  if(typeof dataApiV7==='function'){
    var dataApiV25Before=dataApiV7;
    dataApiV7=async function dataApiV25(action,payload){
      if(action==='save_exam'&&payload&&payload.exam){
        var modal=state.modal&&state.modal.isConnected?state.modal:document.querySelector('.modal-backdrop');
        if(modal){
          var ranks={},has=false;
          modal.querySelectorAll('.combo-card-v21').forEach(function(card){
            var id=card.dataset.comboId;if(!id)return;
            has=true;
            ranks[id]={
              yearRank:(card.querySelector('.combo-yr-v25')?.value||'').trim(),
              yearParticipants:(card.querySelector('.combo-yp-v25')?.value||'').trim(),
              classRank:(card.querySelector('.combo-cr-v25')?.value||'').trim(),
              classParticipants:(card.querySelector('.combo-cp-v25')?.value||'').trim()
            };
          });
          if(has){
            var err=validateComboRanksV25(ranks);
            if(err)throw new Error(err);
            payload.exam.moduleRanks=ranks;
            rememberRanksV25(payload.exam.exam_date,payload.exam.name,ranks); // 本地兜底
          }
          var endInput=modal.querySelector('#examEndDateV25');
          if(endInput)payload.exam.end_date=String(endInput.value||'').trim();
        }
      }
      return dataApiV25Before(action,payload);
    };
  }

  // ---------- B) combo rank trend accessors ----------
  if(typeof rawRankValueV11==='function'){
    var rawRankValueBeforeV25=rawRankValueV11;
    rawRankValueV11=function rawRankValueV25(exam,subject){
      if(isComboSubjectV25(subject))return comboRankInfoV25(exam,subject,state.rankScopeV16||'year').rank;
      return rawRankValueBeforeV25(exam,subject);
    };
  }
  if(typeof rankInfoV7==='function'){
    var rankInfoBeforeV25=rankInfoV7;
    rankInfoV7=function rankInfoV25(exam,subject){
      if(isComboSubjectV25(subject))return comboRankInfoV25(exam,subject,state.rankScopeV16||'year');
      return rankInfoBeforeV25(exam,subject);
    };
  }

  if(typeof cleanSubjectAxisV21==='function'){
    var cleanSubjectAxisBeforeV25=cleanSubjectAxisV21;
    cleanSubjectAxisV21=function cleanSubjectAxisV25(){
      var combo=isComboSubjectV25(state.subject)?state.subject:null;
      cleanSubjectAxisBeforeV25();
      if(combo&&isComboSubjectV25(combo))state.subject=combo;
    };
  }

  // ---------- C) score/percent view chart ----------
  function percentTrendSingleV25(){
    var exams=state.exams||[];
    if(!exams.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>';
    var isTotal=state.subject==='总分';
    var points=exams.map(function(e){return{
      name:e.name,date:e.exam_date,
      actual:isTotal?totalRate(e,'actual'):scoreRate(e,state.subject,'actual'),
      target:isTotal?totalRate(e,'target'):scoreRate(e,state.subject,'target')
    };});
    var vals=[];
    points.forEach(function(p){if(p.actual!==null)vals.push(p.actual);if(p.target!==null)vals.push(p.target);});
    if(!vals.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>';
    // 动态纵轴，与主成绩图同算法（v3 chartHtml）
    var axis=fullTrendAxisV25(vals,'scoreFinal');
    var W=760,H=300,L=46,R=18,T=20,B=46;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return points.length===1?L+cw/2:L+(i/(points.length-1))*cw;};
    var y=function(v){return T+(axis.max-v)/(axis.max-axis.min)*ch;};
    var grid='';
    for(var i=0;i<=axis.ticks;i++){
      var v=axis.max-(axis.max-axis.min)*i/axis.ticks,yy=T+ch*i/axis.ticks;
      grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4"/><text x="'+(L-9)+'" y="'+(yy+4)+'" text-anchor="end" class="axis-label">'+Math.round(v)+'%</text>';
    }
    function line(key,color,dash){
      var d='',started=false,circles='';
      points.forEach(function(p,i){
        var v=p[key];if(v===null){started=false;return;}
        var xx=x(i),yy=y(v);
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+color+'" stroke-width="3" data-tip="'+escapeHtml(p.name)+' · '+(key==='actual'?'真实':'目标')+' '+formatPercent(v)+'"/>';
      });
      return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'+circles;
    }
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-17)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+line('target','#32a77a','7 7')+line('actual','#5d72e8')+labels+'</svg><div class="tooltip-card" id="chartTip"></div>';
  }

  var chartHtmlBeforeV25=(typeof chartHtml==='function')?chartHtml:null;
  chartHtml=function chartHtmlV25(){
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      return percentTrendSingleV25();
    }
    return chartHtmlBeforeV25?chartHtmlBeforeV25():'';
  };

  // ---------- D) home page: view row, two-row chips, toolbar buttons ----------
  var homeHtmlBeforeV25=homeHtml;
  homeHtml=function homeHtmlV25(){
    var html=homeHtmlBeforeV25();
    // 1) 英雄区问候语：Hi，用户名！
    html=html.replace(/<span class="eyebrow">[^<]*<\/span>/,'<span class="eyebrow">Hi，'+escapeHtml((state.user&&state.user.username)||'')+'！</span>');
    // 查看：分数/百分比，与「趋势类型」同级（插入趋势类型行内末尾；仅成绩+最终分模式）
    if(state.trendMetric==='score'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      var viewBtns='<span class="label">查看</span><button class="basis-btn-v13 '+(state.scoreViewV25==='score'?'active':'')+'" data-score-view-v25="score">分数</button><button class="basis-btn-v13 '+(state.scoreViewV25==='percent'?'active':'')+'" data-score-view-v25="percent">百分比</button>';
      html=html.replace(/(<div class="trend-metric-toggle-v7[^"]*">)([\s\S]*?)(<\/div>)/,'$1$2'+viewBtns+'$3');
    }
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      html=html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>','<p class="card-sub">按得分率（百分比）查看真实与目标走势，不同满分的项目也能直接比较</p>');
    }
    // 3) chips 重排：组合行（组合：总览 总分 组合分）+ 科目行（科目：语文 数学 …）
    var combos=(state.modulesV18||[]).filter(function(m){return m&&m.name&&(m.subjects||[]).length>0;});
    var chip=function(s){var active=state.subject===s;return '<button class="chip '+(active?'active':'')+'" data-subject="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>';};
    var comboRow=(combos.length?'<span class="label">组合：</span>':'')+chip('总览')+chip('总分')+combos.map(function(c){return chip(c.name);}).join('');
    var subjectRow='<span class="label">科目：</span>'+(SUBJECTS||[]).map(function(s){return chip(s);}).join('');
    html=html.replace(/<div class="chips">([\s\S]*?)<\/div>/,function(m,inner){
      return '<div class="combo-chips-v25">'+comboRow+'</div><div class="combo-chips-v25">'+subjectRow+'</div>';
    });
    // 侧栏「这一年的记录」：只留最有信息量的指标（次数/最高分/平均分/最近目标；删「次已出分」和与 Hero 重复的「最近变化」）
    var qs=quickStatsV25();
    var quickGrid='<div class="quick-grid">'
      +'<div class="mini-stat"><b>'+qs.count+'</b><span>次考试</span></div>'
      +'<div class="mini-stat"><b>'+(qs.avg===null?'—':formatPercent(qs.avg))+'</b><span>平均得分率</span></div>'
      +'<div class="mini-stat"><b>'+(qs.targetExams?(qs.met+'/'+qs.targetExams):'—')+'</b><span>次达成目标</span></div>'
      +'<div class="mini-stat"><b>'+(qs.gap===null?'—':(qs.gap<=0?'✓':formatScore(Math.abs(qs.gap))))+'</b><span>'+(qs.gap===null?'最近目标':(qs.gap<=0?'已达成目标':'分 · 距目标'))+'</span></div>'
      +'</div>';
    html=html.replace(/<div class="quick-grid">[\s\S]*?<\/div><\/div>/,quickGrid);
    // 完整趋势 / 保存图片
    html=html.replace(/<div class="chart-wrap[^"]*" id="chart">/,
      '<div class="trend-actions-v25"><button type="button" id="trendFullV25">⛶ 完整趋势</button><button type="button" id="trendSaveV25">⭳ 保存图片</button></div><div class="chart-wrap" id="chart">');
    // C1) 精简文案
    return stripVerboseV25(html);
  };

  // ---------- E) PNG export (string-based: no DOM serialization quirks, blob URL + data URL fallback) ----------
  function finalizeExportSvgV25(svgText){
    var text=String(svgText||'').replace(/class="axis-label"/g,'style="font-size:11px;fill:#98a1ae"');
    var m=text.match(/^<svg[^>]*>/);
    if(!m)return null;
    var head=m[0];
    if(head.indexOf('xmlns')===-1)head=head.replace(/^<svg/,'<svg xmlns="http://www.w3.org/2000/svg"');
    var vb=(head.match(/viewBox="([^"]+)"/)||['','0 0 760 300'])[1].trim().split(/\s+/).map(Number);
    var w=vb[2]||760,h=vb[3]||300;
    if(head.indexOf('width=')===-1)head=head.replace(/(<svg[^>]*?)\/?>$/,'$1 width="'+w+'" height="'+h+'">');
    head=head.replace(/>\s*$/,'><rect width="100%" height="100%" fill="#ffffff"/>');
    return head+text.slice(m[0].length);
  }
  function extractChartSvgV25(){
    if(typeof chartHtml!=='function')return null;
    var html=chartHtml();
    var m=html.match(/<svg[\s\S]*?<\/svg>/);
    return m?m[0]:null;
  }
  function downloadSvgAsPngV25(svgText,filename){
    try{
      var finalSvg=finalizeExportSvgV25(svgText);
      if(!finalSvg)return toast('当前图表无法导出');
      var vb=(finalSvg.match(/viewBox="([^"]+)"/)||['','0 0 760 300'])[1].trim().split(/\s+/).map(Number);
      var w=vb[2]||760,h=vb[3]||300;
      var blob=new Blob([finalSvg],{type:'image/svg+xml;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var img=new Image();
      img.onload=function(){
        try{
          var scale=Math.min(2,2048/Math.max(w,h));
          var cw=Math.max(1,Math.round(w*scale)),chh=Math.max(1,Math.round(h*scale));
          var canvas=document.createElement('canvas');
          canvas.width=cw;canvas.height=chh;
          var ctx=canvas.getContext('2d');
          ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,chh);
          ctx.drawImage(img,0,0,cw,chh);
          function finish(href,isBlobUrl){
            var a=document.createElement('a');
            a.href=href;a.download=filename||('score-tracker-'+Date.now()+'.png');
            document.body.appendChild(a);a.click();a.remove();
            if(isBlobUrl)setTimeout(function(){URL.revokeObjectURL(href);},1500);
            toast('图片已保存');
          }
          if(typeof canvas.toBlob==='function'){
            canvas.toBlob(function(png){
              if(png){var u2=URL.createObjectURL(png);finish(u2,true);}
              else finish(canvas.toDataURL('image/png'),false);
            },'image/png');
          }else finish(canvas.toDataURL('image/png'),false);
        }catch(e2){toast('导出失败');}
        try{URL.revokeObjectURL(url);}catch(e3){}
      };
      img.onerror=function(){
        try{URL.revokeObjectURL(url);}catch(e4){}
        // 兜底：换 data: URL 再试一次
        try{
          var img2=new Image();
          img2.onload=function(){
            var scale=Math.min(2,2048/Math.max(w,h));
            var cw=Math.max(1,Math.round(w*scale)),chh=Math.max(1,Math.round(h*scale));
            var canvas=document.createElement('canvas');
            canvas.width=cw;canvas.height=chh;
            var ctx=canvas.getContext('2d');
            ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,chh);
            ctx.drawImage(img2,0,0,cw,chh);
            var href=canvas.toDataURL('image/png');
            var a=document.createElement('a');
            a.href=href;a.download=filename||('score-tracker-'+Date.now()+'.png');
            document.body.appendChild(a);a.click();a.remove();
            toast('图片已保存');
          };
          img2.onerror=function(){toast('图片渲染失败，请稍后再试');};
          img2.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(finalSvg);
        }catch(e5){toast('图片渲染失败，请稍后再试');}
      };
      img.src=url;
    }catch(e){toast('导出失败');}
  }
  function trendFileNameV25(label){return '成绩趋势-'+label+'-'+new Date().toISOString().slice(0,10)+'.png';}

  // ---------- F) full-trend wide chart + modal ----------
  function fullTrendAxisV25(vals,kind){
    var nums=vals.filter(function(v){return v!==null&&v!==undefined&&!Number.isNaN(Number(v));}).map(Number);
    if(!nums.length)return{min:0,max:100,ticks:5};
    var min=Math.min.apply(null,nums),max=Math.max.apply(null,nums),pad;
    if(kind==='scoreFinal'){
      pad=Math.max(10,(max-min)*0.18);
      max=Math.ceil((max+pad)/10)*10;
      min=Math.max(0,Math.floor((min-pad)/10)*10);
      if(max===min)max=min+100;
      return{min:min,max:max,ticks:5};
    }
    if(kind==='scoreRaw'){
      pad=Math.max(5,(max-min)*0.18);
      min=Math.max(0,Math.floor((min-pad)/5)*5);
      max=Math.ceil((max+pad)/5)*5;
      if(max-min<20){var mid=(max+min)/2;min=Math.max(0,Math.floor((mid-10)/5)*5);max=Math.ceil((mid+10)/5)*5;}
      if(max===min)max=min+20;
      return{min:min,max:max,ticks:5};
    }
    if(kind==='rate'){
      return (typeof calcDynamicAxisRangeV6==='function')
        ?calcDynamicAxisRangeV6(nums,{minLimit:0,maxLimit:100,step:5,minSpan:20,padRatio:.16})
        :{min:0,max:100,ticks:5};
    }
    if(kind==='rankRaw'){
      return (typeof rawRankAxisV11==='function')?rawRankAxisV11(nums):{min:Math.min.apply(null,nums),max:Math.max.apply(null,nums),ticks:5};
    }
    return{min:0,max:100,ticks:5};
  }

  function fullTrendSvgV25(){
    var exams=state.exams||[];
    var subject=state.subject||'总分';
    var metric=state.trendMetric||'score';
    var basis=state.scoreBasis||'final';
    var scope=state.rankScopeV16||'year';
    var n=Math.max(1,exams.length);
    var W=Math.max(760,150+n*78),H=340,L=58,R=24,T=20,B=54;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return n===1?L+cw/2:L+(i/(n-1))*cw;};
    var colors=(typeof rankSeriesColorsV7==='function')?rankSeriesColorsV7():['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
    var isPercent=metric==='rank',isRawRank=metric==='rank_raw';
    var scorePercent=!isRawRank&&!isPercent&&basis!=='raw'&&subject!=='总览'&&state.scoreViewV25==='percent';
    var series;
    if(isRawRank||isPercent){
      var rankSubjects=subject==='总览'?['总分'].concat(SUBJECTS):[subject];
      series=rankSubjects.map(function(s,i){
        return{label:s,color:colors[i%colors.length],value:function(e){return isRawRank?rawRankValueV11(e,s):rankInfoV7(e,s).performance;}};
      });
    }else if(basis==='raw'){
      if(subject==='总览'){
        series=['总分'].concat(SUBJECTS).map(function(s,i){return{label:s,color:colors[i%colors.length],value:function(e){return rawScoreRateV13(e,s);}};});
      }else{
        series=[{label:subject==='总分'?'原始总分':subject,color:'#d38429',value:function(e){return subject==='总分'?totalRawForV13(e):examRawScoreV13(e,subject);}}];
      }
    }else if(scorePercent){
      series=[
        {label:'真实',color:'#5d72e8',value:function(e){return subject==='总分'?totalRate(e,'actual'):scoreRate(e,subject,'actual');}},
        {label:'目标',color:'#32a77a',dash:'7 7',value:function(e){return subject==='总分'?totalRate(e,'target'):scoreRate(e,subject,'target');}}
      ];
    }else{
      if(subject==='总览'){
        series=['总分'].concat(SUBJECTS).map(function(s,i){return{label:s,color:colors[i%colors.length],value:function(e){return scoreRate(e,s,'actual');}};});
      }else{
        series=[
          {label:'真实',color:'#5d72e8',dash:'',value:function(e){return subject==='总分'?totalFor(e,'actual'):examScore(e,subject,'actual');}},
          {label:'目标',color:'#32a77a',dash:'7 7',value:function(e){return subject==='总分'?totalFor(e,'target'):examScore(e,subject,'target');}}
        ];
      }
    }
    var visible=series.filter(function(s){return exams.some(function(e){return s.value(e)!==null;});});
    if(!visible.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>当前还没有可用于完整趋势的数据</div></div>';
    var points=exams.map(function(e){return{exam:e,values:visible.map(function(s){return s.value(e);})};});
    var flat=[];
    points.forEach(function(p){p.values.forEach(function(v){if(v!==null)flat.push(v);});});
    var axisKind = scorePercent?'scoreFinal':(subject==='总览'
      ? (isRawRank?'rankRaw':(isPercent?'rankPercent':'rate'))
      : (isRawRank?'rankRaw':(isPercent?'rankPercent':(basis==='raw'?'scoreRaw':'scoreFinal'))));
    var axis=fullTrendAxisV25(flat,axisKind);
    var isRate = axisKind==='rate';
    var grid='';
    for(var g=0;g<=axis.ticks;g++){
      var value=axis.max-(axis.max-axis.min)*g/axis.ticks;
      if(isRawRank)value=axis.min+(axis.max-axis.min)*g/axis.ticks;
      var yy=T+ch*g/axis.ticks;
      var lbl=isRawRank?('第'+Math.max(1,Math.round(value))):(isPercent||isRate||scorePercent?Math.round(value)+'%':Math.round(value));
      grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end" class="axis-label">'+lbl+'</text>';
    }
    var lines=visible.map(function(item,sidx){
      var d='',started=false,circles='';
      for(var pi=0;pi<points.length;pi++){
        var v=points[pi].values[sidx];
        if(v===null){started=false;continue;}
        var xx=x(pi);
        var yy=isRawRank?T+(v-axis.min)/(axis.max-axis.min)*ch:T+(axis.max-v)/(axis.max-axis.min)*ch;
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        var tip;
        if(isRawRank)tip='第'+v+'名';
        else if(isPercent)tip=scopeLabelV25()+'百分位 '+formatPercent(v);
        else tip=formatScore(v);
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+item.color+'" stroke-width="3" data-tip="'+escapeHtml(points[pi].exam.name)+' · '+escapeHtml(item.label)+' '+tip+'"/>';
      }
      return '<path d="'+d+'" fill="none" stroke="'+item.color+'" stroke-width="'+(sidx===0&&subject==='总览'?'3.2':'2.8')+'" stroke-linecap="round" stroke-linejoin="round"'+(item.dash?' stroke-dasharray="'+item.dash+'"':'')+'/>'+circles;
    }).join('');
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-18)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.exam.exam_date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+lines+labels+'</svg>';
  }

  function openFullTrendV25(){
    var exams=state.exams||[];
    if(!exams.length)return toast('还没有考试记录');
    var subject=state.subject||'总分';
    var svgText=fullTrendSvgV25();
    var modal=document.createElement('div');
    modal.className='modal-backdrop full-trend-modal-v25';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>完整趋势 · '+escapeHtml(subject)+'</h3><button class="close-btn" type="button">×</button></div><div class="modal-body"><div class="full-trend-stage-v25" id="ftStageV25">'+svgText+'</div><div class="full-trend-scroll-hint-v25">全部考试都会显示在这里；图表较长时左右滑动查看。保存到手机的图片为完整宽度。</div><div class="full-trend-actions-v25"><button class="secondary" id="ftCloseV25" type="button">关闭</button><button class="primary" id="ftSaveV25" type="button">⭳ 保存图片</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('#ftCloseV25').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelector('#ftSaveV25').onclick=function(){
      var m=String(svgText||'').match(/<svg[\s\S]*?<\/svg>/);
      if(!m)return toast('图形还没准备好');
      downloadSvgAsPngV25(m[0],trendFileNameV25(subject));
    };
  }

  // ---------- F2) 雷达图考试选择器：选择最近考试 → 分类勾选弹窗 → 只显示所选 ----------
  // 不再自动预选最近考试：初始为「选择最近考试」按钮，用户勾选后才显示所选
  var ensureRadarBeforeV25=(typeof ensureRadarSelection==='function')?ensureRadarSelection:null;
  if(ensureRadarBeforeV25){
    ensureRadarSelection=function ensureRadarSelectionV25(){
      var ids=state.radarSelection||[];
      var availableIds=new Set((typeof radarAvailableExams==='function'?radarAvailableExams():[]).map(function(e){return e.id;}));
      state.radarSelection=ids.filter(function(id){return availableIds.has(id);}).slice(0,4);
    };
  }
  var radarCardHtmlBeforeV25=(typeof radarCardHtml==='function')?radarCardHtml:null;
  if(radarCardHtmlBeforeV25){
    radarCardHtml=function radarCardHtmlV25(){
      var html=radarCardHtmlBeforeV25();
      var available=typeof radarAvailableExams==='function'?radarAvailableExams():[];
      var selected=state.radarSelection||[];
      var picker;
      if(!available.length){
        picker='<div class="multi-select" style="margin-top:8px"><span class="subtle-note">当前还没有可用于雷达图的数据</span></div>';
      }else if(selected.length){
        picker='<div class="radar-picked-v25">'+selected.map(function(id){
          var e=(state.exams||[]).find(function(x){return x.id===id;});
          return e?'<span class="radar-pick-chip-v25" data-radar-unpick="'+escapeHtml(id)+'">'+escapeHtml(e.name)+' · '+fmtDate(e.exam_date)+' ✕</span>':'';
        }).join('')+'</div>';
      }else{
        picker='<div class="radar-pick-v25"><button class="secondary" id="radarPickV25" type="button">选择最近考试</button></div>';
      }
      html=html.replace(/<div class="multi-select"[^>]*>[\s\S]*?<\/div>/,picker);
      return html;
    };
  }
  function openRadarPickerV25(){
    var available=typeof radarAvailableExams==='function'?radarAvailableExams():[];
    if(!available.length)return toast('暂无可用考试');
    var cats=typeof categoryOptionsV14==='function'?categoryOptionsV14():[];
    var groups=[].concat(
      cats.map(function(c){return{name:c,list:available.filter(function(e){return e.grade_level===c;})};}),
      [{name:'未分类',list:available.filter(function(e){return !e.grade_level;})}]
    ).filter(function(g){return g.list.length;});
    groups.forEach(function(g){g.list.sort(function(a,b){return String(a.exam_date||'').localeCompare(String(b.exam_date||''));});});
    var picked=new Set((state.radarSelection||[]).map(String));
    var modal=document.createElement('div');
    modal.className='modal-backdrop';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>选择考试（最多 4 次）</h3><button class="close-btn" type="button">×</button></div><div class="modal-body">'
      +groups.map(function(g){
        return '<div class="radar-pick-group-v25"><h4>'+escapeHtml(g.name)+'</h4>'
          +g.list.map(function(e){
            return '<label class="radar-pick-option-v25"><input type="checkbox" value="'+escapeHtml(e.id)+'"'+(picked.has(String(e.id))?' checked':'')+'> '+escapeHtml(e.name)+' · '+fmtDate(e.exam_date)+'</label>';
          }).join('')
          +'</div>';
      }).join('')
      +'<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary" id="radarPickOkV25">确定</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('.cancel-btn').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelectorAll('input[type="checkbox"]').forEach(function(b){
      b.addEventListener('change',function(){
        if(modal.querySelectorAll('input[type="checkbox"]:checked').length>4){toast('最多选择 4 次考试');b.checked=false;}
      });
    });
    modal.querySelector('#radarPickOkV25').onclick=function(){
      state.radarSelection=[].slice.call(modal.querySelectorAll('input[type="checkbox"]:checked')).map(function(b){return b.value;});
      if(state.radarSelection.length&&typeof ensureRadarSelection==='function')ensureRadarSelection();
      close();render();
    };
  }

  // ---------- G) tooltip: fixed viewport positioning, never overflows the card ----------
  var tipPointV25=null;
  function hideChartTipsV25(){
    document.querySelectorAll('#chart .tooltip-card,#overviewChart .tooltip-card,.rank-chart-stage-v7 .tooltip-card').forEach(function(t){
      if(t.style.display!=='none')t.style.display='none';
    });
  }
  function positionChartTooltipV25(point){
    if(!point)return;
    var stage=point.closest&&point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!stage)return;
    var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
    if(!tip||tip.style.display==='none')return;
    if(!tip.textContent&&point.dataset&&point.dataset.tip)tip.textContent=point.dataset.tip;
    var pr=point.getBoundingClientRect();
    var wv=window.innerWidth,hv=window.innerHeight;
    tip.style.position='fixed';
    tip.style.transform='none';
    var w=Math.min(tip.offsetWidth||240,300,wv-16),h=tip.offsetHeight||40;
    if(w<40)w=40;
    var x=Math.round(pr.left+pr.width/2-w/2);
    x=Math.max(8,Math.min(wv-8-w,x));
    var y=Math.round(pr.top-12-h);
    if(y<8)y=Math.round(pr.bottom+12);
    y=Math.max(8,Math.min(hv-8-h,y));
    tip.style.left=x+'px';tip.style.top=y+'px';
    tipPointV25=point;
  }
  if(typeof clampTrendTooltipV19==='function'){
    clampTrendTooltipV19=function clampTrendTooltipV25(point){positionChartTooltipV25(point);};
  }
  // 统一接管：任何一个折线图数据点，点击/悬停都显示详情（并限制在屏幕内）
  function handleTipPointerV25(event){
    var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
    if(!point)return;
    var stage=point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!stage)return;
    var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
    if(!tip)return;
    tip.textContent=point.dataset.tip||'';
    tip.style.display='block';
    positionChartTooltipV25(point);
  }
  document.addEventListener('pointerover',handleTipPointerV25,false);
  document.addEventListener('click',handleTipPointerV25,false);
  document.addEventListener('pointerover',function(e){
    var inChart=e.target&&e.target.closest&&e.target.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!inChart)hideChartTipsV25();
  },false);
  window.addEventListener('scroll',function(){if(tipPointV25)setTimeout(function(){positionChartTooltipV25(tipPointV25);},0);},true);
  window.addEventListener('resize',function(){if(tipPointV25)setTimeout(function(){positionChartTooltipV25(tipPointV25);},0);});

  // ---------- H) records / group ordering (local persistence, up/down buttons) ----------
  function orderKeyV25(){return 'st_order_v25_'+(state.user&&state.user.username||'anon');}
  function orderDataV25(){
    var raw=localStorage.getItem(orderKeyV25())||'';
    var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    if(!d||typeof d!=='object')d={groups:[],exams:{}};
    if(!Array.isArray(d.groups))d.groups=[];
    if(!d.exams||typeof d.exams!=='object')d.exams={};
    return d;
  }
  function saveOrderV25(d){localStorage.setItem(orderKeyV25(),JSON.stringify(d));}
  function sectionTitleV25(section){return String((section.querySelector('.grade-section-head-v13 h3')||{}).textContent||'').trim();}
  function recordIdV25(record){var el=record.querySelector('[data-edit]');return el?String(el.dataset.edit):'';}

  function applyStoredOrderV25(){
    if(state.page!=='records')return;
    var d=orderDataV25();
    var sections=[].slice.call(document.querySelectorAll('.grade-section-v13'));
    if(!sections.length)return;
    // 组顺序
    if(d.groups.length){
      var byTitle={};sections.forEach(function(s){byTitle[sectionTitleV25(s)]=s;});
      var ordered=d.groups.map(function(t){return byTitle[t];}).filter(Boolean);
      var rest=sections.filter(function(s){return d.groups.indexOf(sectionTitleV25(s))===-1;});
      var parent=sections[0].parentNode;
      ordered.concat(rest).forEach(function(s){if(s.parentNode===parent)parent.appendChild(s);});
    }
    // 组内考试顺序
    [].slice.call(document.querySelectorAll('.grade-section-v13')).forEach(function(section){
      var card=section.querySelector('.records-card');
      if(!card)return;
      var records=[].slice.call(card.querySelectorAll('.record'));
      var ord=d.exams&&d.exams[sectionTitleV25(section)];
      if(ord&&ord.length){
        var byId={};records.forEach(function(r){byId[recordIdV25(r)]=r;});
        var ordered=ord.map(function(id){return byId[id];}).filter(Boolean);
        var restR=records.filter(function(r){return ord.indexOf(recordIdV25(r))===-1;});
        ordered.concat(restR).forEach(function(r){card.appendChild(r);});
      }
    });
  }

  function addOrderButtonsV25(){
    if(state.page!=='records')return;
    // 组头 ↑↓
    [].slice.call(document.querySelectorAll('.grade-section-head-v13')).forEach(function(head){
      if(head.querySelector('.order-grp-btn-v25'))return;
      var up=document.createElement('button');
      up.type='button';up.className='order-btn-v25 order-grp-btn-v25';up.title='上移分组';up.textContent='↑';up.dataset.grpUp='1';
      var down=document.createElement('button');
      down.type='button';down.className='order-btn-v25 order-grp-btn-v25';down.title='下移分组';down.textContent='↓';down.dataset.grpDown='1';
      head.appendChild(up);head.appendChild(down);
    });
    // 记录 ↑↓
    [].slice.call(document.querySelectorAll('.record-actions, .record-actions-v10')).forEach(function(actions){
      var record=actions.closest('.record');
      var id=recordIdV25(record);
      if(!record||!id||actions.querySelector('.order-rcd-btn-v25'))return;
      var up=document.createElement('button');
      up.type='button';up.className='order-btn-v25 order-rcd-btn-v25';up.title='上移';up.textContent='↑';up.dataset.id=id;up.dataset.rcdUp='1';
      var down=document.createElement('button');
      down.type='button';down.className='order-btn-v25 order-rcd-btn-v25';down.title='下移';down.textContent='↓';down.dataset.id=id;down.dataset.rcdDown='1';
      actions.appendChild(up);actions.appendChild(down);
    });
  }

  function moveRecordV25(id,dir){
    var d=orderDataV25();
    var section=[].slice.call(document.querySelectorAll('.grade-section-v13')).find(function(s){return s.querySelector('[data-edit="'+id+'"]');});
    if(!section)return;
    var g=sectionTitleV25(section);
    var card=section.querySelector('.records-card');if(!card)return;
    var records=[].slice.call(card.querySelectorAll('.record'));
    var curIds=records.map(recordIdV25);
    var ord=d.exams[g]=(d.exams[g]||[]).slice();
    curIds.forEach(function(x){if(x&&ord.indexOf(x)===-1)ord.push(x);});
    var a=ord.indexOf(id);if(a===-1)return;
    var b=a+dir;
    if(b<0||b>=ord.length)return toast(dir<0?'已经在最上面了':'已经在最下面了');
    var tmp=ord[a];ord[a]=ord[b];ord[b]=tmp;
    d.exams[g]=ord;
    saveOrderV25(d);
    applyStoredOrderV25();
  }

  function moveGroupV25(name,dir){
    var d=orderDataV25();
    var sections=[].slice.call(document.querySelectorAll('.grade-section-v13'));
    var titles=sections.map(sectionTitleV25);
    var a=titles.indexOf(name);
    if(a===-1)return;
    var b=a+dir;
    if(b<0||b>=titles.length)return toast(dir<0?'这组已经在最上面了':'这组已经在最下面了');
    if(!d.groups.length)d.groups=titles.slice();
    var ga=d.groups.indexOf(name);
    var gb=ga+dir;
    if(ga===-1){d.groups=titles.slice();ga=titles.indexOf(name);gb=ga+dir;}
    if(gb<0||gb>=d.groups.length)return;
    var tmp=d.groups[ga];d.groups[ga]=d.groups[gb];d.groups[gb]=tmp;
    saveOrderV25(d);
    applyStoredOrderV25();
  }

  if(!document._v25OrderWired){
    document._v25OrderWired=true;
    document.addEventListener('click',function(e){
      var up=e.target.closest&&e.target.closest('[data-rcd-up]');
      var down=e.target.closest&&e.target.closest('[data-rcd-down]');
      if(up)return moveRecordV25(up.dataset.id,-1);
      if(down)return moveRecordV25(down.dataset.id,1);
      var gup=e.target.closest&&e.target.closest('[data-grp-up]');
      var gdn=e.target.closest&&e.target.closest('[data-grp-down]');
      if(gup){var s1=gup.closest('.grade-section-v13');if(s1)moveGroupV25(sectionTitleV25(s1),-1);return;}
      if(gdn){var s2=gdn.closest('.grade-section-v13');if(s2)moveGroupV25(sectionTitleV25(s2),1);return;}
    },false);
  }

  // ---------- I) password rule: 6-20 chars, letters/digits/symbols; login input fits ----------
  var renderLoginBeforeV25=(typeof renderLogin==='function')?renderLogin:null;
  if(renderLoginBeforeV25){
    renderLogin=function renderLoginV25(error){
      renderLoginBeforeV25(error);
      var p=document.getElementById('loginPass');
      if(p){p.removeAttribute('inputmode');p.removeAttribute('pattern');p.placeholder='密码';}
      var help=document.querySelector('.auth-help');
      if(help)help.textContent='密码 6～20 位，可使用大小写字母、数字和符号；新注册账号会生成初始密码，登录后可在账号页修改。';
    };
  }

  // ---------- I2) 记录页/账号页：精简文案 + 时间段展示 ----------
  var recordHtmlBeforeV25=(typeof recordHtml==='function')?recordHtml:null;
  if(recordHtmlBeforeV25){
    recordHtml=function recordHtmlV25(exam){
      var html=recordHtmlBeforeV25(exam);
      if(exam&&exam.end_date){
        html=html.replace(/(<div class="record-date">)[^<]*(<b[^>]*>)/,function(m,a,b){
          return a+fmtYearDate(exam.exam_date)+' - '+fmtYearDate(exam.end_date)+b;
        });
      }
      return html;
    };
  }
  var recordsHtmlBeforeV25=(typeof recordsHtml==='function')?recordsHtml:null;
  if(recordsHtmlBeforeV25){
    recordsHtml=function recordsHtmlV25(){return stripVerboseV25(recordsHtmlBeforeV25());};
  }
  var accountHtmlBeforeV25=(typeof accountHtml==='function')?accountHtml:null;
  if(accountHtmlBeforeV25){
    accountHtml=function accountHtmlV25(){
      var html=accountHtmlBeforeV25();
      // 修改密码：源头去掉纯数字限制（inputmode/pattern），支持字母数字符号
      html=html.replace(/<input id="newPasswordV15"[^>]*>/,
        '<input id="newPasswordV15" type="password" autocomplete="new-password" placeholder="6～20位，可含字母数字符号">');
      html=html.replace(/<input id="confirmPasswordV15"[^>]*>/,
        '<input id="confirmPasswordV15" type="password" autocomplete="new-password" placeholder="再次输入新密码">');
      return stripVerboseV25(html);
    };
  }

  // ---------- J) bind page ----------
  function moveLegendBelowChartV25(){
    var wrap=document.getElementById('chart');
    if(!wrap||state.page!=='home')return;
    var legend=document.querySelector('.chart-card .legend');
    if(!legend)return;
    var row=legend.parentNode&&legend.parentNode.classList&&legend.parentNode.classList.contains('trend-legend-row-v25')
      ?legend.parentNode:null;
    if(!row){
      row=document.createElement('div');
      row.className='trend-legend-row-v25';
      legend.parentNode&&legend.parentNode.removeChild(legend);
      wrap.insertAdjacentElement('afterend',row);
      row.appendChild(legend);
    }
    var hint=document.querySelector('.trend-scroll-hint-v19');
    if(hint&&hint.parentNode!==row)row.appendChild(hint);
  }
  var bindPageBeforeV25=bindPage;
  bindPage=function bindPageV25(){
    bindPageBeforeV25();
    // 图例移到图表下方，与「左右滑动查看全部考试」同行
    moveLegendBelowChartV25();
    // 查看：分数/百分比
    $$('[data-score-view-v25]').forEach(function(b){b.onclick=function(){state.scoreViewV25=b.dataset.scoreViewV25;render();};});
    // 雷达图：选择考试/移除所选
    var pick=document.getElementById('radarPickV25');
    if(pick)pick.onclick=openRadarPickerV25;
    $$('[data-radar-unpick]').forEach(function(c){c.onclick=function(){state.radarSelection=(state.radarSelection||[]).filter(function(id){return id!==c.dataset.radarUnpick;});render();};});
    // 完整趋势 / 保存图片
    var full=document.getElementById('trendFullV25');
    if(full)full.onclick=openFullTrendV25;
    var save=document.getElementById('trendSaveV25');
    if(save)save.onclick=function(){
      var svgText=extractChartSvgV25();
      if(!svgText)return toast('当前还没有图表可保存');
      downloadSvgAsPngV25(svgText,trendFileNameV25(state.subject||'趋势'));
    };
    // 考试记录排序
    applyStoredOrderV25();
    addOrderButtonsV25();
    // 修改密码：6～20 位，可含大小写字母数字符号（覆盖 v15 纯数字规则）
    var pwBtn=document.getElementById('changePasswordV15');
    if(pwBtn){
      pwBtn.onclick=async function(){
        var first=(document.getElementById('newPasswordV15')||{}).value||'';
        var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
        if(!/^[\x21-\x7E]{6,20}$/.test(first))return toast('新密码请设置为 6～20 位，可使用大小写字母、数字和符号');
        if(first!==second)return toast('两次输入的密码不一致');
        pwBtn.disabled=true;pwBtn.textContent='保存中…';
        try{
          await changePasswordApiV15(first);
          document.getElementById('newPasswordV15').value='';
          document.getElementById('confirmPasswordV15').value='';
          toast('密码已修改，请记住新密码');
        }catch(e){toast(e&&e.message?e.message:'密码修改失败');}
        finally{if(pwBtn.isConnected){pwBtn.disabled=false;pwBtn.textContent='保存新密码';}}
      };
      var np=document.getElementById('newPasswordV15'),cp=document.getElementById('confirmPasswordV15');
      if(np){np.removeAttribute('inputmode');np.removeAttribute('pattern');np.placeholder='6～20位，可含字母数字符号';}
      if(cp){cp.removeAttribute('inputmode');cp.removeAttribute('pattern');cp.placeholder='再次输入新密码';}
      var note=document.querySelector('.password-note-v15');
      if(note)note.textContent='建议设置 6～20 位，可使用大写字母、小写字母、数字和符号；保存后当前设备不会退出，以后登录请使用新密码。';
    }
  };

  // ---------- K) 记录页组合汇总：分数与排名独立展示（成员缺分时排名仍显示） ----------
  if(typeof moduleSummaryV18==='function'){
    moduleSummaryV18=function moduleSummaryV25(exam){
      if(!state.modulesV18||!exam)return '';
      var selected=new Set((exam.moduleIds||[]).map(String));
      if(!selected.size)return '';
      var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m&&m.id));}).map(function(m){
        if(!m||!m.name)return '';
        var final=examScore(exam,m.name,'actual');
        var raw=(typeof examRawScoreV13==='function')?examRawScoreV13(exam,m.name):null;
        var target=examScore(exam,m.name,'target');
        var max=(typeof examMax==='function')?examMax(exam,m.name):null;
        var parts=[];
        if(final!==null)parts.push(formatScore(final)+(max?('/'+formatScore(max)):''));
        if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));
        if(target!==null)parts.push('目标 '+formatScore(target));
        var ranksMap=examRanksForV25(exam);
        var r=ranksMap&&ranksMap[String(m.id)];
        if(r){
          if(num(r.yearRank)!==null)parts.push('年排 '+formatScore(r.yearRank)+(num(r.yearParticipants)!==null?('/'+formatScore(r.yearParticipants)):''));
          if(num(r.classRank)!==null)parts.push('班排 '+formatScore(r.classRank)+(num(r.classParticipants)!==null?('/'+formatScore(r.classParticipants)):''));
        }
        if(!parts.length)return '';
        return '<span class="module-chip-v18"><b>'+escapeHtml(m.name)+'</b> '+parts.join(' · ')+'</span>';
      }).filter(Boolean);
      return items.length?'<div class="record-module-summary-v18">'+items.join('')+'</div>':'';
    };
  }

  syncVersionV25();
})();