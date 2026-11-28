// v26 / product v3.0: 记录页分数显示重设计。
// 胶囊 pill（宽度随内容、换行锯齿）→ 总分强调条 + 等宽分数格（auto-fill 网格，任意宽度都排满整行）。
// 组合分与科目共用同一网格（浅蓝底区分），层级：总分条 > 科目格 > 组合格。
// 仅重写 recordHtml 的展示层；数据读取全部复用既有全局链（examScore/totalFor/rankInfoByScopeV16 等），
// 按钮 markup 与 data-* 属性保持不变，排序/编辑/隐藏/删除等既有绑定不受影响。
(function(){
  var PRODUCT_VERSION_V26='v3.0';
  function syncVersionV26(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v26-style')){
    var style=document.createElement('style');
    style.id='app-v26-style';
    style.textContent=`
      /* Full-width record blocks; size the score grid from its own container. */
      .record.record[data-record-structured-v26]{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"date" "scores" "actions"!important;align-items:start!important;gap:10px!important;min-width:0;width:100%;box-sizing:border-box}
      .record[data-record-structured-v26]>.record-date{grid-area:date;min-width:0;overflow-wrap:anywhere}
      .record[data-record-structured-v26]>.record-date b{margin-top:2px;overflow-wrap:anywhere}
      .record[data-record-structured-v26]>.record-scores-v26{grid-area:scores;display:block!important;min-width:0;width:100%;container:record-scores / inline-size}
      .record[data-record-structured-v26]>.record-actions.record-actions-v10{grid-area:actions;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:wrap!important;max-width:none!important;width:100%;min-width:0;gap:6px!important}
      .record[data-record-structured-v26] .record-action-btn-v10{width:auto!important;min-width:0!important;padding:6px 10px!important}
      .record[data-record-structured-v26] .order-btn-v25{flex:none}
      .score-total-strip-v26{display:grid;gap:10px;background:var(--accent-soft,#eef4ff);border-radius:13px;padding:11px 13px;min-width:0}
      .record-total-head-v26{display:flex;align-items:baseline;flex-wrap:wrap;gap:3px 9px;min-width:0}
      .score-total-strip-v26 .t-label{font-weight:650;color:var(--accent,#5d72e8)}
      .score-total-strip-v26 .t-big{font-size:calc(24px * var(--ui-scale,1));line-height:1.2;color:var(--text);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;min-width:0}
      .score-total-strip-v26 .t-sub{margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;min-width:0}
      .record-total-ranks-v26{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;padding-top:9px;border-top:1px solid var(--line)}
      .score-grid-v26{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,calc(148px * var(--ui-scale,1))),1fr));gap:8px;min-width:0}
      .score-total-strip-v26+.score-grid-v26:not(:empty){margin-top:8px}
      .score-cell-v26{background:var(--cell,#f6f7fa);border:1px solid transparent;border-radius:12px;padding:10px;min-width:0;display:flex;flex-direction:column;gap:5px}
      .score-cell-v26.combo{background:var(--combo-cell,#f6f9ff);border-color:var(--combo-line,#d8e4fd)}
      .sc-name-v26{display:flex;align-items:center;flex-wrap:wrap;gap:3px;font-weight:600;color:var(--muted);min-width:0;overflow-wrap:anywhere}
      .score-cell-v26.combo .sc-name-v26{color:var(--accent,#5d72e8)}
      .sc-name-v26 .stat-badge-v17{flex:none;margin-left:2px}
      .score-cell-v26 .sc-val-v26{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 2px;font-size:calc(21px * var(--ui-scale,1));font-weight:650;line-height:1.25;color:var(--text);font-variant-numeric:tabular-nums;min-width:0;overflow-wrap:anywhere}
      .score-cell-v26 .sc-val-v26 small{font-size:calc(12px * var(--ui-scale,1));font-weight:400;color:var(--muted);white-space:nowrap;max-width:100%}
      .record-subgrid-v26,.record-rankgrid-v26{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 8px;min-width:0;align-items:start}
      .record-subgrid-v26{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;min-height:0}.record-subgrid-v26 .record-metric-v26{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 4px}
      .record-rankgrid-v26{border-top:1px solid var(--line);padding-top:7px;margin-top:auto}.score-cell-v26 .record-rankgrid-v26{margin-top:auto}.record-rankgrid-v26:has(>.record-metric-v26:only-child),.record-total-ranks-v26:has(>.record-metric-v26:only-child){grid-template-columns:minmax(0,1fr)}
      .record-metric-v26{display:grid;gap:1px;min-width:0}
      .record-metric-label-v26{font-size:calc(11px * var(--ui-scale,1));line-height:1.35;color:var(--muted);overflow-wrap:anywhere}
      .record-metric-value-v26{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 1px;font-size:calc(14px * var(--ui-scale,1));line-height:1.35;font-variant-numeric:tabular-nums;color:var(--text);min-width:0}
      .record-metric-value-v26 strong{font-weight:650;min-width:0;overflow-wrap:anywhere}
      .record-metric-value-v26 small{font-size:calc(11px * var(--ui-scale,1));color:var(--muted);font-weight:400;white-space:normal;overflow-wrap:anywhere;min-width:0}
      .record-subgrid-v26 .record-metric-value-v26{font-size:calc(13px * var(--ui-scale,1));font-weight:500;color:var(--muted)}
      .record-total-ranks-v26 .record-metric-value-v26{font-size:calc(17px * var(--ui-scale,1))}
      .records-empty-v26{font-size:var(--ui-caption,12px);color:var(--muted)}
      @container record-scores (min-width:500px){
        .record-total-ranks-v26{grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(96px * var(--ui-scale,1))),1fr))}
      }
      @media(min-width:900px){
        .record.record[data-record-structured-v26]{grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"date actions" "scores scores"!important}
      }
      @media(max-width:620px){
        .record[data-record-structured-v26] .order-btn-v25{width:28px!important;height:28px!important}
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
  function presentV26(v){return v!==null&&v!==undefined&&v!=='';}
  function metricV26(label,value,denominator){
    return '<div class="record-metric-v26"><span class="record-metric-label-v26">'+escapeHtml(label)+'</span><span class="record-metric-value-v26"><strong>'+escapeHtml(value)+'</strong>'+(presentV26(denominator)?'<small>/'+escapeHtml(denominator)+'</small>':'')+'</span></div>';
  }
  function rankMetricV26(info,label){
    if(info&&info.directPercent&&presentV26(info.positionPercent))return metricV26(label+'位比','前 '+formatPercent(info.positionPercent),null);
    if(info&&presentV26(info.rank))return metricV26(label+'排名',formatScore(info.rank),presentV26(info.participants)?formatScore(info.participants):null);
    return '';
  }
  function rankPairV26(year,cls){
    var ranks=rankMetricV26(year,'年级')+rankMetricV26(cls,'班级');
    return ranks?'<div class="record-rankgrid-v26">'+ranks+'</div>':'';
  }
  function subGridV26(raw,target,single){
    var metrics=(!single&&presentV26(raw)?metricV26('原始',formatScore(raw),null):'')+(presentV26(target)?metricV26('目标',formatScore(target),null):'');
    return metrics?'<div class="record-subgrid-v26">'+metrics+'</div>':'';
  }
  function scoreValueV26(value,max){
    if(!presentV26(value))return '';
    return '<div class="sc-val-v26"><span>'+escapeHtml(formatScore(value))+'</span>'+(presentV26(max)&&Number(max)>0?'<small>/'+escapeHtml(formatScore(max))+'</small>':'')+'</div>';
  }
  function subjectCellV26(exam,name){
    var row=(exam.scores&&exam.scores[name])||{};
    var a=num(row.actual),raw=num(row.raw),t=num(row.target);
    var eff=(a!==null)?a:raw; // 记录页沿用 v20 口径：actual 缺失时以原始分呈现
    var year=rankInfoByScopeV16(exam,name,'year'),cls=rankInfoByScopeV16(exam,name,'class');
    var rank=rankPairV26(year,cls);
    if(eff===null&&raw===null&&t===null&&!rank)return '';
    var single=finalOnlySubjectV62(name),rawShown=raw!==null&&(a===null||Number(raw)!==Number(a))?raw:null;
    return '<div class="score-cell-v26">'
      +'<div class="sc-name-v26" title="'+escapeHtml(name)+'">'+escapeHtml(name)+(row.excludeFromTotal?'<span class="stat-badge-v17">统计项</span>':'')+'</div>'
      +scoreValueV26(eff,a===null?(num(row.rawMax)??num(row.max)):num(row.max))
      +subGridV26(rawShown,t,single)
      +rank
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
    var shown=fin!==null?fin:raw;
    var rawShown=raw!==null&&(fin===null||Number(raw)!==Number(fin))?raw:null;
    var rank=rankPairV26({rank:yr,participants:yp},{rank:cr,participants:cp});
    return '<div class="score-cell-v26 combo">'
      +'<div class="sc-name-v26" title="'+escapeHtml(m.name)+'">'+escapeHtml(m.name)+'</div>'
      +scoreValueV26(shown,fin!==null?max:null)
      +subGridV26(rawShown,tgt,finalOnlyGroupV62(m.subjects))
      +rank
      +'</div>';
  }
  function totalStripV26(exam){
    var fin=totalFor(exam,'actual');
    var raw=(typeof totalRawForV13==='function')?totalRawForV13(exam):null;
    if(finalOnlyExamV62(exam)||(raw!==null&&fin!==null&&Math.abs(Number(fin)-Number(raw))<0.000001))raw=null;
    var year=rankInfoByScopeV16(exam,'总分','year'),cls=rankInfoByScopeV16(exam,'总分','class');
    var city=typeof window.ScoreRecordCityRanksV33==='function'?window.ScoreRecordCityRanksV33(exam):{};
    var ranks=rankMetricV26(year,'年级')+rankMetricV26(cls,'班级')
      +rankMetricV26({rank:num(city.cityRank),participants:num(city.cityParticipants)},'市级')
      +rankMetricV26({rank:num(city.districtRank),participants:num(city.districtParticipants)},'区级');
    if(fin===null&&raw===null&&!ranks)return '';
    return '<div class="score-total-strip-v26"><div class="record-total-head-v26"><span class="t-label">总分</span>'
      +(presentV26(fin)?'<span class="t-big">'+escapeHtml(formatScore(fin))+'</span>':'')
      +(raw!==null?'<span class="t-sub">原始总分 '+escapeHtml(formatScore(raw))+'</span>':'')
      +'</div>'+(ranks?'<div class="record-total-ranks-v26">'+ranks+'</div>':'')+'</div>';
  }

  // ---------- rewrite recordHtml ----------
  if(typeof recordHtml!=='function')return syncVersionV26();
  recordHtml=function recordHtmlV26(exam){
    var modules=state.modulesV18||[];
    var modNames=moduleNamesV26();
    var selected=new Set((exam.moduleIds||[]).map(String));
    var ranksMap=moduleRanksForV26(exam);
    var rawNames=Object.keys(exam.scores||{}).filter(function(n){return !modNames.has(n);});
    var orderFallback=['语文','数学','英语','物理','历史','化学','生物','地理','政治'];
    var names=(typeof window!=='undefined'&&typeof window.sortSubjectNames==='function')
      ?window.sortSubjectNames(rawNames)
      :rawNames.slice().sort(function(a,b){
        var ai=orderFallback.indexOf(a),bi=orderFallback.indexOf(b);
        return (ai>=0?ai:1000+rawNames.indexOf(a))-(bi>=0?bi:1000+rawNames.indexOf(b));
      });
    var cells=names.map(function(n){return subjectCellV26(exam,n);}).filter(Boolean).join('');
    var combos=modules.filter(function(m){return m&&m.name&&selected.has(String(m.id));})
      .map(function(m){return comboCellV26(exam,m,ranksMap);}).filter(Boolean).join('');
    var strip=totalStripV26(exam);
    var zone=(cells||combos||strip)
      ?(strip+'<div class="score-grid-v26">'+cells+combos+'</div>')
      :'<div class="records-empty-v26">尚未填写分数或排名</div>';
    var dateHtml=fmtYearDate(exam.exam_date)+(exam.end_date?(' - '+fmtYearDate(exam.end_date)):'');
    return '<div class="record '+(exam.is_hidden?'hidden-record-v10':'')+'" data-record-structured-v26="1">'
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
