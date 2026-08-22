/* app-v30.js · v4.1 数据导出
   账号页「数据」卡 → 全屏导出面板（范围 + 形式）
   形式：CSV 宽表 / TXT 纯文本 / JSON 完整备份 / 打印报告(PDF)
   全部客户端完成，不含密码与登录凭证。 */
(function(){

/* ================= 小工具 ================= */
function numV30(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return Number.isFinite(n)?n:null;}
function fmtV30(n){return n===null?'':String(n);}
function escV30(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pad2V30(n){return (n<10?'0':'')+n;}
function stampV30(d){d=d||new Date();return ''+d.getFullYear()+pad2V30(d.getMonth()+1)+pad2V30(d.getDate())+'-'+pad2V30(d.getHours())+pad2V30(d.getMinutes());}
function humanNowV30(){var d=new Date();return d.getFullYear()+'-'+pad2V30(d.getMonth()+1)+'-'+pad2V30(d.getDate())+' '+pad2V30(d.getHours())+':'+pad2V30(d.getMinutes());}
function appVersionV30(){var m=document.querySelector('meta[name="application-version"]');return (m&&m.getAttribute('content'))||'';}

function allExamsV30(){return (typeof state!=='undefined'&&state.allExams)||[];}
function categoryOptionsV30(){
  try{ if(typeof categoryOptionsV14==='function')return (categoryOptionsV14()||[]).slice(); }catch(e){}
  return [];
}
function modulesV30(){try{return (state.modulesV18||[]).slice();}catch(e){return [];}}
function subjectOrderV30(){
  var base=[];
  try{ (state.subjectConfigs||[]).forEach(function(c){base.push(c.name);}); }catch(e){}
  return base;
}
/* 范围过滤 + 时间正序（含隐藏考试，导出是完整数据） */
function collectV30(scope){
  var list=allExamsV30().filter(function(ex){
    if(scope==='__all__')return true;
    if(scope==='__none__')return !ex.grade_level;
    return ex.grade_level===scope;
  });
  list=list.slice().sort(function(a,b){
    var d=String(a.exam_date||'').localeCompare(String(b.exam_date||''));
    if(d)return d;
    return String(a.created_at||'').localeCompare(String(b.created_at||''));
  });
  return list;
}
function subjectsUnionV30(exams){
  var seen={},out=subjectOrderV30().slice();
  out.forEach(function(n){seen[n]=1;});
  exams.forEach(function(ex){Object.keys(ex.scores||{}).forEach(function(n){
    if(!seen[n]){seen[n]=1;out.push(n);}
  });});
  return out;
}
function sumTotalV30(ex,field){
  var sum=null;
  Object.values(ex.scores||{}).forEach(function(row){
    if(row&&row.excludeFromTotal)return;
    var v=numV30(row&&row[field]);
    if(v!==null)sum=(sum===null?v:sum+v);
  });
  return sum;
}

/* ================= 文件名 ================= */
function filenameV30(scopeLabel,ext){
  return '成绩轨迹_'+stampV30()+'_'+(scopeLabel||'全部')+'.'+ext;
}

/* ================= CSV 宽表 ================= */
function csvCellV30(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function buildCsvV30(exams,scopeLabel){
  var subjects=subjectsUnionV30(exams),mods=modulesV30();
  var head=['日期','考试名称','分类','结束日期'];
  subjects.forEach(function(s){head.push(s+' 目标',s+' 最终分',s+' 最终满分',s+' 原始分',s+' 原始满分',s+' 年排',s+' 年级人数',s+' 班排',s+' 班级人数',s+' 年位比%',s+' 班位比%',s+' 不计总分');});
  head.push('总分','原始总分','总排名(年)','年级人数(总)','总班排','班级人数(总)','总年位比%','总班位比%');
  mods.forEach(function(m){head.push(m.name+' 年排',m.name+' 年人数',m.name+' 班排',m.name+' 班人数');});
  var lines=[head.map(csvCellV30).join(',')];
  exams.forEach(function(ex){
    var row=[ex.exam_date||'',ex.name||'',ex.grade_level||'',ex.end_date||''];
    subjects.forEach(function(s){
      var r=(ex.scores||{})[s]||{};
      row.push(fmtV30(numV30(r.target)),fmtV30(numV30(r.actual)),r.max===''||r.max==null?'':fmtV30(numV30(r.max)),fmtV30(numV30(r.raw)),r.rawMax===''||r.rawMax==null?'':fmtV30(numV30(r.rawMax)),fmtV30(numV30(r.rank)),fmtV30(numV30(r.participants)),fmtV30(numV30(r.classRank)),fmtV30(numV30(r.classParticipants)),fmtV30(numV30(r.yearPositionPercent)),fmtV30(numV30(r.classPositionPercent)),r.excludeFromTotal?'是':'');
    });
    row.push(fmtV30(sumTotalV30(ex,'actual')),fmtV30(sumTotalV30(ex,'raw')),
      fmtV30(numV30(ex.total_rank)),fmtV30(numV30(ex.total_participants)),fmtV30(numV30(ex.total_class_rank)),fmtV30(numV30(ex.total_class_participants)),fmtV30(numV30(ex.total_year_position_percent)),fmtV30(numV30(ex.total_class_position_percent)));
    var ranks=(ex.moduleRanks)||{};
    mods.forEach(function(m){
      var r=ranks[m.id]||{};
      row.push(fmtV30(numV30(r.yearRank)),fmtV30(numV30(r.yearParticipants)),fmtV30(numV30(r.classRank)),fmtV30(numV30(r.classParticipants)));
    });
    lines.push(row.map(csvCellV30).join(','));
  });
  return '\uFEFF'+lines.join('\r\n')+'\r\n';
}

/* ================= TXT 纯文本 ================= */
function rankTextV30(rank,participants){
  var r=numV30(rank);if(r===null)return '';
  var p=numV30(participants);
  return r+(p!==null?'/'+p:'');
}
function buildTxtV30(exams,scopeLabel){
  var out=[];
  var account='';try{account=(state.user&&state.user.username)||'';}catch(e){}
  out.push('成绩轨迹 · 数据导出');
  out.push('账户 '+(account||'—')+' ｜ 范围 '+(scopeLabel||'全部')+' ｜ 共 '+exams.length+' 次考试');
  out.push('生成于 '+humanNowV30()+' · '+appVersionV30());
  if(!exams.length){out.push('');out.push('（该范围内暂无考试）');return out.join('\r\n')+'\r\n';}
  exams.forEach(function(ex,i){
    var bits=[ex.name||'未命名',ex.exam_date||''];
    if(ex.end_date)bits.push('至 '+ex.end_date);
    if(ex.grade_level)bits.push(ex.grade_level);
    if(ex.is_hidden)bits.push('已隐藏');
    out.push('');out.push('【'+(i+1)+'】'+bits.join(' · '));
    subjectsUnionV30([ex]).forEach(function(s){
      var r=(ex.scores||{})[s]||{},seg=[s];
      var a=numV30(r.actual),m=numV30(r.max);
      seg.push(a!==null?('最终 '+a+(m!==null?'/'+m:' 分')):'最终 —');
      var raw=numV30(r.raw);
      if(raw!==null){var rm=numV30(r.rawMax);seg.push('原始 '+raw+(rm!==null?'/'+rm:''));}
      var t=numV30(r.target);if(t!==null)seg.push('目标 '+t);
      var yr=rankTextV30(r.rank,r.participants);if(yr)seg.push('年排 '+yr);
      var cr=rankTextV30(r.classRank,r.classParticipants);if(cr)seg.push('班排 '+cr);
      var yp=numV30(r.yearPositionPercent);if(yp!==null)seg.push('年位比 前'+yp+'%');
      var cp=numV30(r.classPositionPercent);if(cp!==null)seg.push('班位比 前'+cp+'%');
      if(r.excludeFromTotal)seg.push('不计入总分');
      out.push('  '+seg.join(' ｜ '));
    });
    var ranks=ex.moduleRanks||{};
    modulesV30().forEach(function(mo){
      var r=ranks[mo.id];if(!r)return;
      var seg=['组合「'+mo.name+'」'],yr=rankTextV30(r.yearRank,r.yearParticipants),cr=rankTextV30(r.classRank,r.classParticipants);
      if(yr)seg.push('年排 '+yr);
      if(cr)seg.push('班排 '+cr);
      if(seg.length>1)out.push('  '+seg.join(' ｜ '));
    });
    var tot=['—— 总分 '+fmtV30(sumTotalV30(ex,'actual')||'—')];
    var rawT=sumTotalV30(ex,'raw');if(rawT!==null)tot.push('原始总分 '+rawT);
    var tr=rankTextV30(ex.total_rank,ex.total_participants);if(tr)tot.push('年排 '+tr);
    var tcr=rankTextV30(ex.total_class_rank,ex.total_class_participants);if(tcr)tot.push('班排 '+tcr);
    var typ=numV30(ex.total_year_position_percent);if(typ!==null)tot.push('年位比 前'+typ+'%');
    var tcp=numV30(ex.total_class_position_percent);if(tcp!==null)tot.push('班位比 前'+tcp+'%');
    out.push('  '+tot.join(' ｜ '));
  });
  out.push('');out.push('由 成绩轨迹 导出 · 把每一次努力，连成一条向上的线');
  return out.join('\r\n')+'\r\n';
}

/* ================= JSON 完整备份 ================= */
function buildJsonV30(exams,scopeLabel){
  var account='',original='';
  try{account=(state.user&&state.user.username)||'';original=state.originalUsernameV19||account;}catch(e){}
  var payload={
    app:'score-tracker',
    version:appVersionV30(),
    exportedAt:new Date().toISOString(),
    account:account,
    originalUsername:original,
    scope:scopeLabel||'全部',
    examCount:exams.length,
    subjectConfigs:(typeof state!=='undefined'&&state.subjectConfigs)||[],
    category:(function(){try{return {label:categoryLabelV14(),options:categoryOptionsV14()};}catch(e){return null;}})(),
    modules:modulesV30(),
    exams:exams
  };
  return JSON.stringify(payload,null,2);
}

/* ================= 打印报告（PDF） ================= */
function buildPrintHtmlV30(exams,scopeLabel){
  var account='';try{account=(state.user&&state.user.username)||'';}catch(e){}
  var rows=exams.map(function(ex){
    var subj=subjectsUnionV30([ex]).map(function(s){
      var r=(ex.scores||{})[s]||{},a=numV30(r.actual);
      if(a===null&&numV30(r.target)===null&&numV30(r.rank)===null&&numV30(r.classRank)===null)return '';
      var line='<b>'+escV30(s)+'</b> '+(a!==null?a:'—')+(numV30(r.max)!==null?'/'+r.max:'');
      if(numV30(r.raw)!==null)line+='（原始 '+r.raw+'）';
      if(numV30(r.target)!==null)line+=' 目标 '+r.target;
      var yr=rankTextV30(r.rank,r.participants);if(yr)line+=' · 年排 '+escV30(yr);
      var cr=rankTextV30(r.classRank,r.classParticipants);if(cr)line+=' · 班排 '+escV30(cr);
      if(r.excludeFromTotal)line+=' · 不计总分';
      return '<div class="s">'+line+'</div>';
    }).filter(Boolean).join('');
    var yr=rankTextV30(ex.total_rank,ex.total_participants);
    var cr2=rankTextV30(ex.total_class_rank,ex.total_class_participants);
    return '<tr><td>'+escV30(ex.exam_date||'')+(ex.end_date?'<br><span class="dim">~ '+escV30(ex.end_date)+'</span>':'')+'</td>'
      +'<td><b>'+escV30(ex.name||'')+'</b>'+(ex.is_hidden?'<span class="dim">（已隐藏）</span>':'')+'</td>'
      +'<td>'+escV30(ex.grade_level||'—')+'</td>'
      +'<td class="subj">'+(subj||'<span class="dim">—</span>')+'</td>'
      +'<td>'+(fmtV30(sumTotalV30(ex,'actual'))||'—')+'</td>'
      +'<td>'+(escV30(yr)||'—')+'</td><td>'+(escV30(cr2)||'—')+'</td></tr>';
  }).join('');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>成绩轨迹 · 报告</title><style>'
    +'body{font:12px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1c2430;margin:28px 34px}'
    +'h1{font-size:19px;margin:0 0 2px}.meta{color:#6d7787;font-size:11px;margin-bottom:18px}'
    +'table{width:100%;border-collapse:collapse;font-size:11px}'
    +'th,td{border:1px solid #dfe3ea;padding:7px 8px;vertical-align:top;text-align:left}'
    +'th{background:#f4f6fa;font-size:10.5px}tr:nth-child(even) td{background:#fafbfd}'
    +'td.subj .s{margin:1px 0}.dim{color:#98a1ae;font-size:10px}'
    +'.foot{margin-top:16px;color:#98a1ae;font-size:10px;text-align:center}'
    +'</style></head><body>'
    +'<h1>成绩轨迹 · 成绩报告</h1>'
    +'<div class="meta">账户 '+escV30(account)+' ｜ 范围 '+escV30(scopeLabel||'全部')+' ｜ '+exams.length+' 次考试 ｜ 生成于 '+humanNowV30()+'</div>'
    +'<table><thead><tr><th style="width:86px">日期</th><th style="width:130px">考试</th><th style="width:56px">分类</th><th>各科明细</th><th style="width:52px">总分</th><th style="width:70px">年排</th><th style="width:70px">班排</th></tr></thead><tbody>'
    +(rows||'<tr><td colspan="7">该范围内暂无考试</td></tr>')
    +'</tbody></table>'
    +'<div class="foot">来自 成绩轨迹 '+escV30(appVersionV30())+' · 把每一次努力，连成一条向上的线</div>'
    +'</body></html>';
}

/* ================= 下载 ================= */
function downloadV30(name,content,mime){
  try{
    var blob=new Blob([content],{type:mime||'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){a.parentNode&&a.parentNode.removeChild(a);URL.revokeObjectURL(url);},1200);
    return;
  }catch(e){}
  try{
    var a2=document.createElement('a');
    a2.href='data:'+(mime||'text/plain')+';charset=utf-8,'+encodeURIComponent(content);
    a2.download=name;document.body.appendChild(a2);a2.click();
    a2.parentNode&&a2.parentNode.removeChild(a2);
  }catch(e2){}
}

/* ================= 打印 ================= */
function printReportV30(html){
  var frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc=html;
  frame.onload=function(){
    try{frame.contentWindow.focus();frame.contentWindow.print();}catch(e){}
    setTimeout(function(){frame.parentNode&&frame.parentNode.removeChild(frame);},60000);
  };
  document.body.appendChild(frame);
}

/* ================= 导出面板 ================= */
var FORMATS_V30=[
  {id:'csv', icon:'📄', name:'Excel 可开的表格', sub:'CSV 成绩宽表，双击即开不乱码', who:'表格', ext:'csv', mime:'text/csv;charset=utf-8'},
  {id:'txt', icon:'📃', name:'纯文本成绩单', sub:'逐考试分块，能直接粘贴进微信', who:'万能打开', ext:'txt', mime:'text/plain;charset=utf-8'},
  {id:'json',icon:'💾', name:'完整备份', sub:'全量保真，换机/存档，将来可导入恢复', who:'技术', ext:'json', mime:'application/json;charset=utf-8'},
  {id:'pdf', icon:'🖨️', name:'打印报告', sub:'A4 版式，浏览器打印对话框里存 PDF', who:'正式材料', ext:'pdf', mime:''}
];
var sheetStateV30={scope:'__all__',format:'csv',el:null};

function scopeOptionsV30(){
  var opts=[{v:'__all__',label:'全部'}];
  categoryOptionsV30().forEach(function(v){opts.push({v:v,label:v});});
  if(allExamsV30().some(function(e){return !e.grade_level;}))opts.push({v:'__none__',label:'未分类'});
  return opts;
}
function scopeLabelV30(v){
  var hit=scopeOptionsV30().filter(function(o){return o.v===v;})[0];
  return hit?hit.label:'全部';
}

function renderSheetV30(){
  var el=sheetStateV30.el;if(!el)return;
  el.querySelectorAll('[data-scope-v30]').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('data-scope-v30')===sheetStateV30.scope);
  });
  el.querySelectorAll('[data-fmt-v30]').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('data-fmt-v30')===sheetStateV30.format);
  });
  var f=FORMATS_V30.filter(function(x){return x.id===sheetStateV30.format;})[0]||FORMATS_V30[0];
  var note=el.querySelector('#exportNoteV30');
  if(note)note.textContent='将导出：'+scopeLabelV30(sheetStateV30.scope)+' · '+f.name+' · 文件名 '+filenameV30(scopeLabelV30(sheetStateV30.scope),f.ext);
  var go=el.querySelector('.export-go-v30');
  if(go)go.textContent=f.id==='pdf'?'🖨️ 打开打印报告':'⬇︎ 导出 '+f.ext.toUpperCase();
}

function doExportV30(){
  var scope=sheetStateV30.scope,label=scopeLabelV30(scope);
  var exams=collectV30(scope);
  var f=FORMATS_V30.filter(function(x){return x.id===sheetStateV30.format;})[0];
  if(!f)return;
  if(!exams.length&&typeof toast==='function'){toast('该范围内还没有考试');return;}
  if(f.id==='pdf'){
    printReportV30(buildPrintHtmlV30(exams,label));
  }else{
    var content=f.id==='csv'?buildCsvV30(exams,label):f.id==='txt'?buildTxtV30(exams,label):buildJsonV30(exams,label);
    downloadV30(filenameV30(label,f.ext),content,f.mime);
  }
  if(typeof toast==='function')toast(f.id==='pdf'?'已打开打印窗口，可选「另存为 PDF」':'已导出 '+filenameV30(label,f.ext));
}

function openExportSheetV30(){
  if(document.getElementById('exportOverlayV30'))return;
  var ov=document.createElement('div');
  ov.className='export-overlay-v30';ov.id='exportOverlayV30';
  var chips=scopeOptionsV30().map(function(o){
    return '<button type="button" class="chip" data-scope-v30="'+escV30(o.v)+'">'+escV30(o.label)+'</button>';
  }).join('');
  var fmts=FORMATS_V30.map(function(f){
    return '<button type="button" class="export-fmt-v30" data-fmt-v30="'+f.id+'">'
      +'<span class="xf-ico-v30">'+f.icon+'</span><span class="xf-body-v30"><b>'+f.name+'</b><small>'+f.sub+'</small><span class="xf-who-v30">'+f.who+'</span></span></button>';
  }).join('');
  ov.innerHTML='<div class="export-sheet-v30" role="dialog" aria-modal="true" aria-label="导出数据">'
    +'<div class="export-head-v30"><b>导出数据</b><button type="button" class="close-btn export-close-v30" aria-label="关闭">×</button></div>'
    +'<div class="export-grp-v30">范围</div><div class="export-chips-v30">'+chips+'</div>'
    +'<div class="export-grp-v30">导出形式</div><div class="export-fmts-v30">'+fmts+'</div>'
    +'<div class="export-note-v30" id="exportNoteV30"></div>'
    +'<button type="button" class="primary export-go-v30">⬇︎ 导出</button>'
    +'<p class="export-foot-v30">全程在你的设备上完成，不经服务器；导出内容不含密码与登录凭证。</p>'
    +'</div>';
  document.body.appendChild(ov);
  sheetStateV30.el=ov;
  ov.addEventListener('click',function(e){
    if(e.target===ov)return closeExportSheetV30();
    var sc=e.target.closest('[data-scope-v30]');
    if(sc){sheetStateV30.scope=sc.getAttribute('data-scope-v30');return renderSheetV30();}
    var fm=e.target.closest('[data-fmt-v30]');
    if(fm){sheetStateV30.format=fm.getAttribute('data-fmt-v30');return renderSheetV30();}
    if(e.target.closest('.export-close-v30'))return closeExportSheetV30();
    if(e.target.closest('.export-go-v30'))return doExportV30();
  });
  document.addEventListener('keydown',escListenerV30);
  renderSheetV30();
}
function escListenerV30(e){if(e.key==='Escape')closeExportSheetV30();}
function closeExportSheetV30(){
  var ov=document.getElementById('exportOverlayV30');
  if(ov)ov.remove();
  sheetStateV30.el=null;
  document.removeEventListener('keydown',escListenerV30);
}

/* ================= 账号页「数据」卡 ================= */
function injectDataCardV30(){
  var grid=document.querySelector('.account-grid');
  if(!grid||document.getElementById('dataCardV30'))return;
  var card=document.createElement('div');
  card.className='card account-card data-card-v30';
  card.id='dataCardV30';
  card.innerHTML='<h3 class="card-title">数据</h3><p class="card-sub">导出成绩与设置，全部在本机完成。</p>'
    +'<div class="data-actions-v30">'
    +'<button type="button" class="secondary" id="exportDataV30">⬇︎ 导出数据</button>'
    +'<button type="button" class="secondary" id="importDataV30" disabled title="即将支持">⬆︎ 导入恢复<span class="soon-v30">即将支持</span></button>'
    +'</div>';
  grid.appendChild(card);
  card.addEventListener('click',function(e){
    if(e.target.closest('#exportDataV30'))openExportSheetV30();
  });
}

/* ================= 样式 ================= */
function injectStylesV30(){
  if(document.getElementById('app-v30-style'))return;
  var css=[
    '.export-overlay-v30{position:fixed;inset:0;background:rgba(15,20,31,.45);z-index:90;display:flex;align-items:flex-end;justify-content:center;animation:expFadeV30 .18s ease}',
    '@keyframes expFadeV30{from{opacity:0}to{opacity:1}}',
    '.export-sheet-v30{width:min(520px,100%);max-height:92vh;overflow:auto;background:var(--panel-solid,#fff);border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));animation:expUpV30 .22s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes expUpV30{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}',
    '@media(min-width:720px){.export-overlay-v30{align-items:center}.export-sheet-v30{border-radius:20px;padding:22px 24px}}',
    '.export-head-v30{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}',
    '.export-head-v30 b{font-size:16px}',
    '.export-grp-v30{font-size:11px;font-weight:800;color:var(--muted,#788392);margin:14px 0 7px}',
    '.export-chips-v30{display:flex;gap:7px;flex-wrap:wrap}',
    '.export-chips-v30 .chip.on{background:var(--text,#18212f);border-color:var(--text,#18212f);color:var(--on-surface,#fff)}',
    '.export-fmts-v30{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '@media(max-width:380px){.export-fmts-v30{grid-template-columns:1fr}}',
    '.export-fmt-v30{display:flex;gap:10px;align-items:flex-start;text-align:left;border:1.5px solid var(--line,#e6e9ef);background:var(--chip-bg,#fff);border-radius:13px;padding:11px 12px;cursor:pointer;font-family:inherit;color:var(--text,#18212f)}',
    '.export-fmt-v30.on{border-color:var(--accent,#5d72e8);background:var(--accent-soft,#f6f7ff)}',
    '.xf-ico-v30{font-size:17px;line-height:1.3}',
    '.xf-body-v30{min-width:0}',
    '.xf-body-v30 b{display:block;font-size:12.5px;margin-bottom:1px}',
    '.xf-body-v30 small{display:block;font-size:10.5px;color:var(--muted,#88919f);line-height:1.45}',
    '.xf-who-v30{display:inline-block;font-size:9px;font-weight:700;color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);border-radius:5px;padding:1px 6px;margin-top:5px}',
    '.export-note-v30{background:var(--cell,#f6f8fc);border:1px dashed var(--line-soft,#d7dde8);border-radius:11px;padding:9px 11px;font-size:11px;color:var(--muted,#5a6478);margin-top:13px;overflow-wrap:anywhere}',
    '.export-go-v30{width:100%;margin-top:11px;padding:12px;font-size:14px;border-radius:12px}',
    '.export-foot-v30{text-align:center;font-size:10px;color:var(--muted,#b3bcc9);margin:9px 0 0}',
    '.data-card-v30 .data-actions-v30{display:grid;gap:8px;margin-top:13px}',
    '.data-card-v30 .secondary{width:100%}',
    '.soon-v30{float:right;font-size:10px;color:var(--muted,#98a1ae);font-weight:400}',
    'html[data-theme="night"] .export-fmt-v30 .xf-who-v30{filter:brightness(1.15)}'
  ].join('\n');
  var st=document.createElement('style');
  st.id='app-v30-style';
  st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 接线 ================= */
var bindPageBeforeV30=(typeof bindPage==='function')?bindPage:null;
bindPage=function bindPageV30(){
  if(bindPageBeforeV30)bindPageBeforeV30();
  try{injectDataCardV30();}catch(e){}
};

/* 启动 */
injectStylesV30();

/* 测试钩子 */
window.__v30={
  collect:collectV30,
  buildCsv:buildCsvV30,
  buildTxt:buildTxtV30,
  buildJson:buildJsonV30,
  buildPrintHtml:buildPrintHtmlV30,
  filename:filenameV30,
  openSheet:openExportSheetV30,
  closeSheet:closeExportSheetV30,
  injectDataCard:injectDataCardV30,
  formats:FORMATS_V30
};
})();
