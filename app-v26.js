// v26 / product v3.0: 记录页分数显示重设计。
// 胶囊 pill（宽度随内容、换行锯齿）→ 总分强调条 + 等宽分数格（auto-fill 网格，任意宽度都排满整行）。
// 组合分与科目共用同一网格（浅蓝底区分），层级：总分条 > 科目格 > 组合格。
// 仅重写 recordHtml 的展示层；数据读取全部复用既有全局链（examScore/totalFor/rankInfoByScopeV16 等），
// 按钮 markup 与 data-* 属性保持不变，排序/编辑/隐藏/删除等既有绑定不受影响。
(function(){
  var PRODUCT_VERSION_V26='v3.0';
  function syncVersionV26(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V26);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V26;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v26-style')){
    var style=document.createElement('style');
    style.id='app-v26-style';
    style.textContent=`
      .record-scores.record-scores-v26{display:block!important;min-width:0}
      .score-total-strip-v26{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;background:#eef4ff;border-radius:11px;padding:9px 13px}
      .score-total-strip-v26 .t-label{font-size:11px;font-weight:700;color:#2f6bff;letter-spacing:.02em}
      .score-total-strip-v26 .t-big{font-size:20px;font-weight:800;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums}
      .score-total-strip-v26 .t-sub{font-size:11px;color:#6b7a99;font-variant-numeric:tabular-nums}
      .score-total-strip-v26 .t-pill{font-size:10px;font-weight:700;color:#41506b;background:#fff;border-radius:999px;padding:3px 9px;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 1px #e3eaf8}
      .score-grid-v26{display:grid;grid-template-columns:repeat(auto-fill,minmax(97px,1fr));gap:6px;min-width:0}
      .score-total-strip-v26+.score-grid-v26{margin-top:7px}
      .score-cell-v26{background:#f6f7fa;border-radius:10px;padding:8px 10px 7px;min-width:0}
      .score-cell-v26.combo{background:#f6f9ff;box-shadow:inset 0 0 0 1px #d8e4fd}
      .sc-name-v26{display:flex;align-items:center;font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden}
      .score-cell-v26.combo .sc-name-v26{color:#2f6bff}
      .sc-name-v26 .stat-badge-v17{flex:none;margin-left:5px}
      .sc-val-v26{font-size:17px;font-weight:700;color:var(--text);line-height:1.35;margin-top:1px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sc-sub-v26,.sc-rank-v26{font-size:10px;color:#98a2b3;line-height:1.55;font-variant-numeric:tabular-nums;overflow-wrap:break-word}
      .records-empty-v26{font-size:11px;color:var(--muted)}
      /* 手机端操作区：右侧竖列 → 独立底行横排（日期/分数/按钮三段式）。
         双类名 + !important 用于稳定覆盖 mobile-fix.css 的竖排规则 */
      @media(max-width:620px){
        .record.record{grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"date" "scores" "actions";gap:12px 10px!important}
        .record-actions.record-actions-v10{grid-area:actions;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end;flex-wrap:nowrap;max-width:none!important}
        .record-action-btn-v10.record-action-btn-v10{width:auto;min-width:0;padding:6px 10px!important}
        .order-btn-v25.order-btn-v25{width:28px!important;height:28px!important}
      }
      @media(max-width:420px){
        .record.record{gap:10px 8px!important}
        .record-action-btn-v10.record-action-btn-v10{padding:6px 9px!important}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function moduleNamesV26(){
    try{return (typeof moduleNameSetV21==='function')?moduleNameSetV21():new Set();}catch(e){return new Set();}
  }
  // 与 v25 examRanksForV25 同口径：云端 moduleRanks 优先，本机缓存兜底
  function moduleRanksForV26(exam){
    if(exam&&exam.moduleRanks&&typeof exam.moduleRanks==='object'&&Object.keys(exam.moduleRanks).length)return exam.moduleRanks;
    if(!exam||!exam.exam_date||!exam.name)return{};
    try{
      var raw=localStorage.getItem('st_moduleranks_v25_'+(((state&&state.user)&&state.user.username)||'anon'))||'';
      var d=raw?JSON.parse(raw):null;
      return (d&&typeof d==='object')?(d[exam.exam_date+'|'+exam.name]||{}):{};
    }catch(e){return{};}
  }
  // 单个 scope 的排名文案；prefix 为「年」或「班」。紧凑分数写法（12/450）减少窄格换行
  function scopeTextV26(info,prefix){
    if(!info)return '';
    if(info.directPercent)return prefix+'位比 前'+formatPercent(info.positionPercent);
    if(info.rank!==null&&info.rank!==undefined){
      return prefix+'排 '+formatScore(info.rank)+(info.participants!==null&&info.participants!==undefined?('/'+formatScore(info.participants)):'');
    }
    return '';
  }
  function subjectCellV26(exam,name){
    var row=(exam.scores&&exam.scores[name])||{};
    var a=num(row.actual),raw=num(row.raw),t=num(row.target);
    var eff=(a!==null)?a:raw; // 记录页沿用 v20 口径：actual 缺失时以原始分呈现
    var year=rankInfoByScopeV16(exam,name,'year'),cls=rankInfoByScopeV16(exam,name,'class');
    var rank=[scopeTextV26(year,'年'),scopeTextV26(cls,'班')].filter(Boolean).join(' · ');
    if(eff===null&&raw===null&&t===null&&!rank)return '';
    var sub=[];
    if(raw!==null&&(eff===null||Number(raw)!==Number(eff)))sub.push('原始 '+formatScore(raw));
    if(t!==null)sub.push('目标 '+(t===null?'—':formatScore(t)));
    var subText=sub.join(' · ');
    return '<div class="score-cell-v26">'
      +'<div class="sc-name-v26" title="'+escapeHtml(name)+'">'+escapeHtml(name)+(row.excludeFromTotal?'<span class="stat-badge-v17">统计项</span>':'')+'</div>'
      +'<div class="sc-val-v26">'+(eff===null?'—':formatScore(eff))+'</div>'
      +(subText?'<div class="sc-sub-v26" title="'+escapeHtml(subText)+'">'+subText+'</div>':'')
      +(rank?'<div class="sc-rank-v26" title="'+escapeHtml(rank)+'">'+rank+'</div>':'')
      +'</div>';
  }
  function comboCellV26(exam,m,ranksMap){
    var fin=examScore(exam,m.name,'actual');
    var raw=(typeof examRawScoreV13==='function')?examRawScoreV13(exam,m.name):null;
    var tgt=examScore(exam,m.name,'target');
    var max=examMax(exam,m.name);
    var r=(ranksMap&&ranksMap[String(m.id)])||{};
    var yr=num(r.yearRank),yp=num(r.yearParticipants),cr=num(r.classRank),cp=num(r.classParticipants);
    if(fin===null&&raw===null&&tgt===null&&yr===null&&cr===null)return '';
    var val=(fin!==null)?(formatScore(fin)+(max?'/'+formatScore(max):'')):(raw!==null?formatScore(raw):'—');
    var sub=[];
    if(raw!==null&&(fin===null||Number(raw)!==Number(fin)))sub.push('原始 '+formatScore(raw));
    if(tgt!==null)sub.push('目标 '+formatScore(tgt));
    var rank=[];
    if(yr!==null)rank.push('年排 '+formatScore(yr)+(yp!==null?('/'+formatScore(yp)):''));
    if(cr!==null)rank.push('班排 '+formatScore(cr)+(cp!==null?('/'+formatScore(cp)):''));
    var subText=sub.join(' · ');
    var rankText=rank.join(' · ');
    return '<div class="score-cell-v26 combo">'
      +'<div class="sc-name-v26" title="'+escapeHtml(m.name)+'">'+escapeHtml(m.name)+'</div>'
      +'<div class="sc-val-v26">'+val+'</div>'
      +(subText?'<div class="sc-sub-v26" title="'+escapeHtml(subText)+'">'+subText+'</div>':'')
      +(rankText?'<div class="sc-rank-v26" title="'+escapeHtml(rankText)+'">'+rankText+'</div>':'')
      +'</div>';
  }
  function totalStripV26(exam){
    var fin=totalFor(exam,'actual');
    var raw=(typeof totalRawForV13==='function')?totalRawForV13(exam):null;
    if(raw!==null&&fin!==null&&Math.abs(Number(fin)-Number(raw))<0.000001)raw=null;
    var year=rankInfoByScopeV16(exam,'总分','year'),cls=rankInfoByScopeV16(exam,'总分','class');
    var pills=[scopeTextV26(year,'年'),scopeTextV26(cls,'班')].filter(Boolean)
      .map(function(x){return '<span class="t-pill">'+x+'</span>';}).join('');
    if(fin===null&&raw===null&&!pills)return '';
    // 标签用中性「总分」：无赋分学段只见一个数，零歧义；有原始总分时并列展示自然区分口径
    return '<div class="score-total-strip-v26"><span class="t-label">总分</span>'
      +'<span class="t-big">'+(fin===null?'—':formatScore(fin))+'</span>'
      +(raw!==null?'<span class="t-sub">原始总分 '+formatScore(raw)+'</span>':'')
      +pills+'</div>';
  }

  // ---------- rewrite recordHtml ----------
  if(typeof recordHtml!=='function')return syncVersionV26();
  recordHtml=function recordHtmlV26(exam){
    var modules=state.modulesV18||[];
    var modNames=moduleNamesV26();
    var selected=new Set((exam.moduleIds||[]).map(String));
    var ranksMap=moduleRanksForV26(exam);
    var names=Object.keys(exam.scores||{}).filter(function(n){return !modNames.has(n);});
    var cells=names.map(function(n){return subjectCellV26(exam,n);}).filter(Boolean).join('');
    var combos=modules.filter(function(m){return m&&m.name&&selected.has(String(m.id));})
      .map(function(m){return comboCellV26(exam,m,ranksMap);}).filter(Boolean).join('');
    var strip=totalStripV26(exam);
    var zone=(cells||combos||strip)
      ?(strip+'<div class="score-grid-v26">'+cells+combos+'</div>')
      :'<div class="records-empty-v26">尚未填写分数或排名</div>';
    var dateHtml=fmtYearDate(exam.exam_date)+(exam.end_date?(' - '+fmtYearDate(exam.end_date)):'');
    return '<div class="record '+(exam.is_hidden?'hidden-record-v10':'')+'">'
      +'<div class="record-date">'+dateHtml
      +'<b>'+escapeHtml(exam.name)
      +'<span class="grade-badge-v13">'+escapeHtml(exam.grade_level||'未分类')+'</span>'
      +(exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':'')
      +'</b></div>'
      +'<div class="record-scores record-scores-v26">'+zone+'</div>'
      +'<div class="record-actions record-actions-v10">'
      +'<button class="record-action-btn-v10" data-edit="'+exam.id+'">编辑</button>'
      +'<button class="record-action-btn-v10" data-hidden-toggle="'+exam.id+'">'+(exam.is_hidden?'恢复显示':'隐藏')+'</button>'
      +'<button class="record-action-btn-v10 danger" data-delete="'+exam.id+'">删除</button>'
      +'</div></div>';
  };

  syncVersionV26();
})();
