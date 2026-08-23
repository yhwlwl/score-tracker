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
      var r=ranks[mo.id];
      var cs=comboSumV30(ex,mo);
      var referenced=r||(ex.moduleIds||[]).some(function(x){return String(x)===String(mo.id);});
      if(!referenced&&cs.fin===null)return;
      var seg=['组合「'+mo.name+'」'];
      if(cs.fin!==null)seg.push('最终 '+cs.fin+(cs.fmax!==null?'/'+cs.fmax:' 分'));
      if(cs.raw!==null)seg.push('原始 '+cs.raw+(cs.rmax!==null?'/'+cs.rmax:''));
      var yr=rankTextV30(r&&r.yearRank,r&&r.yearParticipants);if(yr)seg.push('年排 '+yr);
      var cr=rankTextV30(r&&r.classRank,r&&r.classParticipants);if(cr)seg.push('班排 '+cr);
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

/* 通用折线图 SVG（打印内嵌，零依赖）
   opt:{n, xlabels[], yFmt(v), ptFmt(v), invert?, series:[{name,color,dash?,pts:[[i,v],…]}]} */
function lineChartV30(opt){
  var ptsAll=[];
  opt.series.forEach(function(s){s.pts.forEach(function(p){ptsAll.push(p[1]);});});
  if(!ptsAll.length||!opt.n)return '';
  var W=720,H=200,L=48,R=16,T=30,B=44;
  var lo=Math.min.apply(null,ptsAll),hi=Math.max.apply(null,ptsAll);
  var span=(hi-lo)||Math.max(1,Math.abs(hi)*0.1);
  lo-=span*0.18;hi+=span*0.18;
  function X(i){return L+(W-L-R)*(opt.n===1?0.5:i/(opt.n-1));}
  function Y(v){var f=(v-lo)/(hi-lo);return T+(H-T-B)*(opt.invert?f:1-f);}
  var grid='';
  for(var i=0;i<=4;i++){
    var tick=lo+(hi-lo)*i/4,yy=Y(tick);
    grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4" stroke-width="1"/>'
      +'<text x="'+(L-7)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9" fill="#98a1ae">'+opt.yFmt(tick)+'</text>';
  }
  var rot=opt.n>6;
  var xlab='';
  for(var k=0;k<opt.n;k++){
    var xx=X(k);
    xlab+='<text x="'+xx+'" y="'+(H-B+16)+'" text-anchor="'+(rot?'end':'middle')+'" font-size="9" fill="#98a1ae"'
      +(rot?' transform="rotate(-35 '+xx+' '+(H-B+16)+')"':'')+'>'+escV30(opt.xlabels[k]||'')+'</text>';
  }
  var body='';
  opt.series.forEach(function(s){
    if(s.pts.length<2)return;
    body+='<polyline points="'+s.pts.map(function(p){return X(p[0])+','+Y(p[1]);}).join(' ')
      +'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.main?2.6:1.9)+'" stroke-linecap="round" stroke-linejoin="round"'
      +(s.dash?' stroke-dasharray="'+s.dash+'"':'')+'/>';
  });
  opt.series.forEach(function(s){
    s.pts.forEach(function(p){
      body+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+(s.main?3.4:2.5)+'" fill="#fff" stroke="'+s.color+'" stroke-width="2"/>';
      if(s.main)body+='<text x="'+X(p[0])+'" y="'+(Y(p[1])-9)+'" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1c2430">'+escV30(opt.ptFmt(p[1]))+'</text>';
    });
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block" role="img">'
    +grid+body+xlab+'</svg>';
}
/* 各科·组合 得分率矩阵：行=系列，列=考试，色深=百分率（替代多线 spaghetti） */
function rateMatrixV30(exams){
  var mods=modulesV30(),modNames={};
  mods.forEach(function(m){modNames[m.name]=1;});
  var subjects=subjectsUnionV30(exams).filter(function(s){return !modNames[s];});
  /* 列：有任意得分率的考试（表头与表体共用同一列集） */
  var colExams=[];
  exams.forEach(function(ex){
    var has=subHasRateV30AnyV30(ex)||mods.some(function(m){return modHasRateV30(ex,m);});
    if(has)colExams.push(ex);
  });
  if(!colExams.length)return '';
  var cols=colExams.map(function(ex){return String(ex.exam_date||'').slice(5);});
  var rows=[{name:'最终总分',bold:true,rate:function(ex){var ft=sumTotalV30(ex,'actual'),fm=sumTotalV30(ex,'max');return rateOfTotalsV30(ft,fm);}}];
  subjects.forEach(function(s){
    rows.push({name:s,rate:function(ex){var r=(ex.scores||{})[s]||{},a=numV30(r.actual),m2=numV30(r.max);return (a!==null&&m2)?Math.round(a/m2*1000)/10:null;}});
  });
  mods.forEach(function(m){
    rows.push({name:m.name,rate:function(ex){var cs=comboSumV30(ex,m);return (cs.fin!==null&&cs.fmax)?Math.round(cs.fin/cs.fmax*1000)/10:null;}});
  });
  var head='<tr><th class="mh">科目</th>'+cols.map(function(c){return '<th>'+escV30(c)+'</th>';}).join('')+'</tr>';
  var body=rows.map(function(row){
    var tds=colExams.map(function(ex){
      var v=row.rate(ex);
      if(v===null)return '<td><span class="dim">—</span></td>';
      var alpha=Math.min(.82,.08+v/100*.74);
      return '<td><span class="cellp'+(row.bold?' boldp':'')+'" style="background:rgba(93,114,232,'+alpha.toFixed(2)+')">'+v+'</span></td>';
    }).join('');
    return '<tr><th class="rh'+(row.bold?' boldr':'')+'">'+escV30(row.name)+'</th>'+tds+'</tr>';
  }).join('');
  var cls='rate-mx'+(cols.length>8?' tight':'');
  return '<table class="'+cls+'"><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}
function subHasRateV30AnyV30(ex){
  return Object.values(ex.scores||{}).some(function(r){
    var a=numV30(r&&r.actual),m2=numV30(r&&r.max);
    return a!==null&&!!m2;
  });
}
function subHasRateV30(ex,s){
  var r=(ex.scores||{})[s]||{},a=numV30(r.actual),m2=numV30(r.max);
  return a!==null&&!!m2;
}
function modHasRateV30(ex,m){
  var cs=comboSumV30(ex,m);
  return cs.fin!==null&&!!cs.fmax;
}
/* 单序列排名小图（各自独立坐标轴） */
function rankLineChartV30(exams,key,title){
  var xs=[],pts=[];
  exams.forEach(function(ex){
    var v=numV30(ex[key]);
    if(v===null)return;
    xs.push(String(ex.exam_date||'').slice(5));
    pts.push([xs.length-1,v]);
  });
  if(!xs.length)return '';
  var svg=lineChartV30({
    n:xs.length,xlabels:xs,invert:true,
    yFmt:function(v){return String(Math.round(v));},
    ptFmt:function(v){return String(Math.round(v));},
    series:[{name:title,color:'#5d72e8',pts:pts,main:true}]
  });
  return '<div class="mini"><h4>'+escV30(title)+'</h4>'+svg+'</div>';
}
function rateOfTotalsV30(sum,num){
  return (sum!==null&&num!==null&&num>0)?Math.round(sum/num*1000)/10:null;
}
/* 总分得分率英雄图（单主线） */
function totalRateChartV30(exams){
  var xs=[],pts=[];
  exams.forEach(function(ex){
    var fr=rateOfTotalsV30(sumTotalV30(ex,'actual'),sumTotalV30(ex,'max'));
    if(fr===null)return;
    xs.push(String(ex.exam_date||'').slice(5));
    pts.push([xs.length-1,fr]);
  });
  if(!xs.length)return '';
  return lineChartV30({
    n:xs.length,xlabels:xs,
    yFmt:function(v){return Math.round(v)+'%';},
    ptFmt:function(v){return v+'%';},
    series:[{name:'最终总分',color:'#5d72e8',pts:pts,main:true}]
  });
}
function sumRawMaxV30(ex){
  var sum=null;
  Object.values(ex.scores||{}).forEach(function(row){
    if(!row||row.excludeFromTotal)return;
    var rm=numV30(row.rawMax);if(rm===null)rm=numV30(row.max);
    var rw=numV30(row.raw);
    if(rw!==null&&rm!==null)sum=(sum===null?rm:sum+rm);
  });
  return sum;
}

/* ================= 打印报告（PDF）· v2 排版 ================= */
function pctTextV30(a,m){
  var av=numV30(a),mv=numV30(m);
  if(av===null||!mv)return '';
  var p=Math.round(av/mv*1000)/10;
  return String(p);
}
/* 组合合计：按模块科目求和（最终/满分、原始/原始满分），无数据的科目跳过 */
function comboSumV30(ex,mo){
  var fin=null,fmax=null,raw=null,rmax=null;
  ((mo&&mo.subjects)||[]).forEach(function(s){
    var r=(ex.scores||{})[s];if(!r)return;
    var a=numV30(r.actual),mx=numV30(r.max);
    if(a!==null)fin=(fin===null?a:fin+a);
    if(mx!==null)fmax=(fmax===null?mx:fmax+mx);
    var rw=numV30(r.raw);
    if(rw!==null){
      raw=(raw===null?rw:raw+rw);
      var rm=numV30(r.rawMax);if(rm===null)rm=mx;
      if(rm!==null)rmax=(rmax===null?rm:rmax+rm);
    }
  });
  return {fin:fin,fmax:fmax,raw:raw,rmax:rmax};
}
function buildPrintHtmlV30(exams,scopeLabel){
  var account='';try{account=(state.user&&state.user.username)||'';}catch(e){}
  var dates=exams.map(function(e){return e.exam_date||'';}).filter(Boolean).sort();
  var span=dates.length?(dates[0]===dates[dates.length-1]?dates[0]:dates[0]+' ~ '+dates[dates.length-1]):'—';
  var last=[].concat(exams).sort(function(a,b){return String(b.exam_date||'').localeCompare(String(a.exam_date||''));})[0];
  var lastTotal=last?fmtV30(sumTotalV30(last,'actual')):'—';
  function logoSvg(size){
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 48 48" style="display:block">'
      +'<rect width="48" height="48" rx="13" fill="#1f2939"/>'
      +'<polyline points="8,37 20,26 27,31 41,16" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'
      +'<path d="M30.5 11.5H42 V23" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  /* —— 概览表行 —— */
  var overviewRows=exams.map(function(ex){
    return '<tr><td class="c-date">'+escV30(ex.exam_date||'—')+'</td>'
      +'<td><b>'+escV30(ex.name||'未命名')+'</b>'+(ex.is_hidden?'<span class="hid">已隐藏</span>':'')+'</td>'
      +'<td>'+(ex.grade_level?'<span class="pill">'+escV30(ex.grade_level)+'</span>':'<span class="dim">—</span>')+'</td>'
      +'<td class="num strong">'+(fmtV30(sumTotalV30(ex,'actual'))||'—')+'</td>'
      +'<td class="num">'+(fmtV30(sumTotalV30(ex,'raw'))||'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(ex.total_rank,ex.total_participants))||'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(ex.total_class_rank,ex.total_class_participants))||'—')+'</td></tr>';
  }).join('');
  /* —— 逐考试明细块 —— */
  function subjectRow(s,r){
    var a=numV30(r.actual),m=numV30(r.max);
    if(a===null&&numV30(r.target)===null&&numV30(r.rank)===null&&numV30(r.classRank)===null)return '';
    var p=pctTextV30(a,m);
    var reached=(a!==null&&numV30(r.target)!==null)?a>=numV30(r.target):null;
    var fill=reached===null?'#5d72e8':(reached?'#2f9d76':'#e59b45');
    return '<tr>'
      +'<td class="s-name"><b>'+escV30(s)+'</b>'+(r.excludeFromTotal?'<span class="dim">（不计总分）</span>':'')+'</td>'
      +'<td class="num">'+(fmtV30(numV30(r.target))||'—')+(reached!==null?(reached?' <i class="ok">达标</i>':' <i class="miss">差'+fmtV30(numV30(r.target)-a)+'</i>'):'')+'</td>'
      +'<td class="num strong">'+(a!==null?a:'—')+'<span class="dim">'+(m!==null?'/'+m:'')+'</span></td>'
      +'<td class="rate">'+(p?'<span class="track"><span class="fill" style="width:'+p+'%;background:'+fill+'"></span></span><span class="lab">'+p+'%</span>':'—')+'</td>'
      +'<td class="num">'+(r.raw!=='' && r.raw!=null?escV30(String(r.raw))+(numV30(r.rawMax)!==null?'<span class="dim">/'+r.rawMax+'</span>':''):'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(r.rank,r.participants))||'—')+'</td>'
      +'<td class="num">'+(escV30(rankTextV30(r.classRank,r.classParticipants))||'—')+'</td></tr>';
  }
  var blocks=exams.map(function(ex,i){
    var rows=subjectsUnionV30([ex]).map(function(s){return subjectRow(s,(ex.scores||{})[s]||{});}).filter(Boolean).join('');
    if(!rows)rows='<tr><td colspan="7" class="dim">本次考试暂无成绩数据</td></tr>';
    var comboLines='';
    var ranks=ex.moduleRanks||{};
    modulesV30().forEach(function(mo){
      var r=ranks[mo.id];
      var cs=comboSumV30(ex,mo);
      var referenced=r||(ex.moduleIds||[]).some(function(x){return String(x)===String(mo.id);});
      if(!referenced&&cs.fin===null)return;
      var seg=[];
      if(cs.fin!==null)seg.push('最终 '+cs.fin+(cs.fmax!==null?'/'+cs.fmax:' 分'));
      if(cs.raw!==null)seg.push('原始 '+cs.raw+(cs.rmax!==null?'/'+cs.rmax:''));
      var yr=rankTextV30(r&&r.yearRank,r&&r.yearParticipants);if(yr)seg.push('年排 '+escV30(yr));
      var cr=rankTextV30(r&&r.classRank,r&&r.classParticipants);if(cr)seg.push('班排 '+escV30(cr));
      if(seg.length)comboLines+='<div class="combo">组合「'+escV30(mo.name)+'」　'+seg.join('　·　')+'</div>';
    });
    var totBits=[];
    var ft=sumTotalV30(ex,'actual');if(ft!==null)totBits.push('总分 <b>'+ft+'</b>');
    var rt=sumTotalV30(ex,'raw');if(rt!==null)totBits.push('原始总分 '+rt);
    var yp=numV30(ex.total_year_position_percent);if(yp!==null)totBits.push('年位比 前'+yp+'%');
    var tcp=numV30(ex.total_class_position_percent);if(tcp!==null)totBits.push('班位比 前'+tcp+'%');
    return '<section class="exam-block">'
      +'<div class="block-head"><span class="idx">'+(i+1)+'</span>'
      +'<b class="b-name">'+escV30(ex.name||'未命名')+'</b>'
      +(ex.is_hidden?'<span class="hid">已隐藏</span>':'')
      +'<span class="b-date">'+escV30(ex.exam_date||'')+(ex.end_date?' ~ '+escV30(ex.end_date):'')+'</span>'
      +(ex.grade_level?'<span class="pill">'+escV30(ex.grade_level)+'</span>':'')
      +'</div>'
      +'<table><thead><tr><th>科目</th><th>目标</th><th>得分</th><th>得分率</th><th>原始分</th><th>年排</th><th>班排</th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
      +(comboLines||'')
      +(totBits.length?'<div class="totline">'+totBits.join('　·　')+'</div>':'')
      +'</section>';
  }).join('');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>成绩轨迹 · 成绩报告</title><style>'
    +'@page{size:A4;margin:13mm 12mm}'
    +'*,*::before,*::after{-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body{font:12px/1.55 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1c2430;margin:0;max-width:186mm}'
    +'.rep-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5d72e8;padding-bottom:12px}'
    +'.brand{display:flex;gap:11px;align-items:center}'
    +'.brand b{font-size:19px;display:block;letter-spacing:.5px}'
    +'.brand small{color:#6d7787;font-size:10px;display:block;margin-top:1px}'
    +'.meta{text-align:right;font-size:10.5px;color:#6d7787;line-height:1.8}'
    +'.meta b{color:#1c2430}'
    +'.stats{display:flex;gap:0;border:1px solid #e6eaf1;border-radius:10px;margin:14px 0 18px;overflow:hidden}'
    +'.stat{flex:1;text-align:center;padding:9px 4px;border-right:1px solid #e6eaf1}'
    +'.stat:last-child{border-right:0}'
    +'.stat b{font-size:15px;display:block}.stat span{font-size:9.5px;color:#6d7787}'
    +'h2.sec{font-size:13px;margin:20px 0 8px;color:#1c2430}'
    +'h2.sec::after{content:"";display:block;width:26px;height:3px;background:#5d72e8;border-radius:2px;margin-top:3px}'
    +'table{width:100%;border-collapse:collapse;font-size:11px}'
    +'th{text-align:left;font-size:9.5px;color:#6d7787;font-weight:600;border-bottom:1.5px solid #d8dde6;padding:4px 6px}'
    +'td{padding:6px;border-bottom:1px solid #edf0f4;vertical-align:middle}'
    +'tr:last-child td{border-bottom:0}'
    +'.ov td{padding:7px 6px}.ov td.c-date{color:#6d7787;font-size:10.5px;width:74px}'
    +'.num{font-variant-numeric:tabular-nums}.strong{font-weight:700;font-size:12px}'
    +'.dim{color:#98a1ae;font-weight:400;font-size:10px}'
    +'.hid{background:#fdeaea;color:#b3424a;font-size:9px;border-radius:5px;padding:1px 5px;margin-left:5px;vertical-align:1px}'
    +'.pill{display:inline-block;border:1px solid #c9d4f5;color:#4356c9;font-size:9.5px;border-radius:999px;padding:1px 8px}'
    +'.rate{white-space:nowrap;font-size:10px;color:#6d7787}'
    +'.rate .lab{display:inline-block;min-width:32px;text-align:left;vertical-align:1px}'
    +'.track{display:inline-block;width:52px;height:5px;background:#eef0f4;border-radius:3px;margin-right:5px;vertical-align:1px;overflow:hidden}'
    +'.fill{display:block;height:100%;border-radius:3px}'
    +'i.ok,i.miss{font-style:normal;font-size:9px;border-radius:4px;padding:0 4px;vertical-align:1px}'
    +'i.ok{color:#2f9d76;background:#e8f5ee}'
    +'i.miss{color:#b26a12;background:#fdf3e4}'
    +'.chart-wrap{border:1px solid #e6eaf1;border-radius:10px;padding:8px 6px 2px}'
    +'.chart-note{font-size:9.5px;color:#98a1ae;margin-top:4px}'
    +'.rate-mx{width:100%;border-collapse:collapse;font-size:9.5px}'
    +'.rate-mx th{font-weight:600;color:#6d7787;font-size:9px;border-bottom:1px solid #e6eaf1;padding:5px 6px;text-align:center}'
    +'.rate-mx .mh{text-align:left;width:76px}'
    +'.rate-mx td{border-bottom:1px solid #f0f2f6;padding:4px 6px;text-align:center;font-variant-numeric:tabular-nums}'
    +'.rate-mx .rh{text-align:left;color:#1c2430;font-weight:650;font-size:10px;white-space:nowrap}'
    +'.rate-mx .boldr{font-weight:800}'
    +'.rate-mx.tight th,.rate-mx.tight td{padding:4px 3px;font-size:8.5px}'
    +'.cellp{display:inline-block;min-width:30px;border-radius:5px;padding:1px 4px;color:#fff;font-size:9px}'
    +'.cellp.boldp{font-weight:800;font-size:9.5px}'
    +'.rank-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px}'
    +'.mini{border:1px solid #e6eaf1;border-radius:10px;padding:8px 8px 3px}'
    +'.mini h4{margin:0 0 2px;font-size:11px}'
    +'.exam-block{margin:0 0 16px;page-break-inside:avoid;border:1px solid #e6eaf1;border-radius:10px;padding:12px 13px 10px}'
    +'.block-head{display:flex;align-items:center;gap:7px;margin-bottom:8px;flex-wrap:wrap}'
    +'.idx{width:17px;height:17px;border-radius:6px;background:#eef1ff;color:#4356c9;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none}'
    +'.b-name{font-size:12.5px}.b-date{color:#6d7787;font-size:10.5px}'
    +'.combo{font-size:10px;color:#6d7787;margin-top:5px}'
    +'.totline{font-size:11px;margin-top:6px;color:#1c2430}.totline b{font-size:13px}'
    +'.foot{margin-top:22px;padding-top:10px;border-top:1px solid #e6eaf1;text-align:center;color:#98a1ae;font-size:9.5px}'
    +'</style></head><body>'
    +'<div class="rep-head">'
    +'<div class="brand">'+logoSvg(40)+'<div><b>成绩轨迹</b><small>成绩报告 · Score Report</small></div></div>'
    +'<div class="meta">账户 <b>'+escV30(account||'—')+'</b><br>范围 <b>'+escV30(scopeLabel||'全部')+'</b> ｜ 生成于 '+humanNowV30()+'</div>'
    +'</div>'
    +'<div class="stats">'
    +'<div class="stat"><b>'+exams.length+'</b><span>次考试</span></div>'
    +'<div class="stat"><b style="font-size:11.5px;line-height:22px">'+escV30(span)+'</b><span>时间跨度</span></div>'
    +'<div class="stat"><b>'+(lastTotal==='—'?'—':lastTotal)+'</b><span>最近总分</span></div>'
    +'<div class="stat"><b style="font-size:11.5px;line-height:22px">'+escV30((function(){var o=[];exams.forEach(function(e){if(e.grade_level&&o.indexOf(e.grade_level)<0)o.push(e.grade_level);});return o.length?o.join(' / '):'—';})())+'</b><span>包含分类</span></div>'
    +'</div>'
    +(function(){var c=totalRateChartV30(exams);return c?('<h2 class="sec">得分率趋势</h2><div class="chart-wrap">'+c+'</div>'):'';})()
    +(function(){var m=rateMatrixV30(exams);return m?('<h2 class="sec">各科 · 组合 得分率</h2><div class="mx-wrap">'+m+'</div><div class="chart-note">数值为得分率（%），色深代表高低；空白表示该次考试未填此科目。</div>'):'';})()
    +(function(){var a=rankLineChartV30(exams,'total_rank','年排'),b=rankLineChartV30(exams,'total_class_rank','班排');if(!a&&!b)return '';return '<h2 class="sec">排名趋势</h2><div class="rank-grid">'+a+b+'</div><div class="chart-note">名次越小越好 · 线向上表示进步；两图各自独立刻度。</div>';})()
    +(exams.length?('<h2 class="sec">成绩总览</h2>'
    +'<table class="ov"><thead><tr><th>日期</th><th>考试</th><th>分类</th><th>总分</th><th>原始总分</th><th>年排</th><th>班排</th></tr></thead><tbody>'+overviewRows+'</tbody></table>'
    +'<h2 class="sec">各科明细</h2>'+blocks)
    :'<div style="text-align:center;color:#98a1ae;padding:40px 0">该范围内暂无考试</div>')
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
  {id:'pdf', icon:'🖨️', name:'打印报告 PDF', sub:'A4 排版报告，浏览器打印对话框里存 PDF', who:'推荐 · 正式材料', ext:'pdf', mime:'', rec:true},
  {id:'csv', icon:'📄', name:'Excel 可开的表格', sub:'CSV 成绩宽表，双击即开不乱码', who:'表格', ext:'csv', mime:'text/csv;charset=utf-8'},
  {id:'txt', icon:'📃', name:'纯文本成绩单', sub:'逐考试分块，能直接粘贴进微信', who:'万能打开', ext:'txt', mime:'text/plain;charset=utf-8'},
  {id:'json',icon:'💾', name:'完整备份', sub:'全量保真，换机/存档，将来可导入恢复', who:'技术', ext:'json', mime:'application/json;charset=utf-8'}
];
var sheetStateV30={scope:'__all__',format:'pdf',el:null};

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
    var f=FORMATS_V30.filter(function(x){return x.id===b.getAttribute('data-fmt-v30');})[0];
    b.classList.toggle('on',f&&f.id===sheetStateV30.format);
    b.classList.toggle('rec',!!(f&&f.rec));
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
    if(window.__stTrack)window.__stTrack('export_done',{format:'pdf',scope:label,examCount:exams.length});
  }else{
    var content=f.id==='csv'?buildCsvV30(exams,label):f.id==='txt'?buildTxtV30(exams,label):buildJsonV30(exams,label);
    downloadV30(filenameV30(label,f.ext),content,f.mime);
    if(window.__stTrack)window.__stTrack('export_done',{format:f.id,scope:label,examCount:exams.length});
  }
  if(typeof toast==='function')toast(f.id==='pdf'?'已打开打印窗口，可选「另存为 PDF」':'已导出 '+filenameV30(label,f.ext));
}

function openExportSheetV30(){
  if(document.getElementById('exportOverlayV30'))return;
  if(window.__stTrack)window.__stTrack('export_open',{});
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
    '.export-fmt-v30.rec{border-color:var(--accent,#5d72e8);box-shadow:inset 0 0 0 1px var(--accent,#5d72e8)}',
    '.export-fmt-v30 .xf-ico-v30{font-size:17px;line-height:1.3}',
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
