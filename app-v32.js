/* app-v32.js · v5.0 统计分析页
   与「账号」同级的第四页:位比(排名)主轴 · 本地规则引擎 · 九大模块
   适配:语义变量主题(night 等)/ 自定义学科(subjectConfigs + 动态学科)/ 手动总分覆盖(total_actual_score)
   纯客户端计算,零后端改动。埋点复用 app-v31 的 window.__stTrack。 */
(function(){
"use strict";

/* ================= 小工具 ================= */
function n32(v){if(v===null||v===undefined||v==="")return null;var x=Number(v);return Number.isFinite(x)?x:null;}
function r32(x){return Math.round(x*10)/10;}
function esc32(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function median32(arr){if(!arr||!arr.length)return null;var a=arr.slice().sort(function(x,y){return x-y;});var m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function mad32(arr){if(!arr||!arr.length)return null;var m=median32(arr);return median32(arr.map(function(x){return Math.abs(x-m);}));}
function clamp32(x,a,b){return Math.max(a,Math.min(b,x));}
function fmtPos32(p){return (p===null||p===undefined)?"—":"前"+r32(p)+"%";}
function shortName32(name){return String(name||"").replace("高一下","一下").replace("高二下","二下").replace("高三下","三下").replace("高二上","二上").replace("高三上","三上").replace("高一","一上").replace("高二","二上").replace("高三","三上");}

/* ================= 数据访问层 ================= */
function allExamsV32(){try{return (typeof state!=="undefined"&&state.exams)||[];}catch(e){return [];}}
function byDate32(a,b){var d=String(a.exam_date||"").localeCompare(String(b.exam_date||""));return d||String(a.created_at||"").localeCompare(String(b.created_at||""));}
function visibleExamsV32(includeHidden){
  return allExamsV32().filter(function(e){return includeHidden?!0:!e.is_hidden;}).slice().sort(byDate32);
}
function configuredSubjectsV32(){
  var out=[];try{((typeof state!=="undefined"&&state.subjectConfigs)||[]).forEach(function(c){var nm=c&&(c.name||c);if(nm&&out.indexOf(nm)<0)out.push(nm);});}catch(e){}
  return out;
}
/* 学科清单:配置优先 + 各次考试里实际出现过的学科补尾(适配用户新增/修改的学科) */
function subjectListV32(exams){
  var out=configuredSubjectsV32(),seen={};out.forEach(function(s){seen[s]=1;});
  (exams||[]).forEach(function(e){Object.keys(e.scores||{}).forEach(function(s){if(s&&!seen[s]){seen[s]=1;out.push(s);}});});
  return out;
}
function rowV32(e,s){return (e&&e.scores&&e.scores[s])||{};}
/* 个人最佳状态标签:ok=在最好附近;warn=连续偏离待找回;acc 再按差距细分(≤5≈接近,>5=刚偏离) */
function pbLabelV32(st,gap){
  if(st==="ok")return "正处最好状态";
  if(st==="warn")return "待找回";
  return gap>5?"刚偏离":"接近最好";
}
/* 排名位置:显式位比字段优先,否则由 名次÷人数 现算;科目人数留空时回退总排名人数(v16 口径) */
function effYearN32(e,row){var n=n32(row.participants);return n!==null?n:n32(e.total_participants);}
function effClsN32(e,row){var n=n32(row.classParticipants);return n!==null?n:n32(e.total_class_participants);}
function posYearOf32(e,row){
  var p=n32(row.yearPositionPercent);if(p!==null)return r32(clamp32(p,0,100));
  var r=n32(row.rank),n=effYearN32(e,row);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
function posClassOf32(e,row){
  var p=n32(row.classPositionPercent);if(p!==null)return r32(clamp32(p,0,100));
  var r=n32(row.classRank),n=effClsN32(e,row);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
function totalPosYear32(e){
  var p=n32(e.total_year_position_percent);if(p!==null)return r32(p);
  var r=n32(e.total_rank),n=n32(e.total_participants);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
function totalPosClass32(e){
  var p=n32(e.total_class_position_percent);if(p!==null)return r32(p);
  var r=n32(e.total_class_rank),n=n32(e.total_class_participants);
  return (r!==null&&n)?r32(clamp32(r/n*100,0,100)):null;
}
/* 总分:手动覆盖优先(v24),否则按未排除科目求和 */
function sumSideV32(e,side){
  var sum=null;Object.keys(e.scores||{}).forEach(function(s){
    var row=e.scores[s];if(!row||row.excludeFromTotal)return;
    var v=n32(row[side]);if(v!==null)sum=(sum===null?v:sum+v);
  });return sum;
}
function totalActualV32(e){var o=n32(e.total_actual_score);return o!==null?o:sumSideV32(e,"actual");}
function totalTargetV32(e){var o=n32(e.total_target_score);return o!==null?o:sumSideV32(e,"target");}
function rateOf32(row){var a=n32(row.actual),m=n32(row.max);return (a!==null&&m)?clamp32(a/m*100,0,100):null;}
/* 整场加权得分率(排除不计总分的科目)——纯分数账号的降级指标 */
function examRateV32(e){
  var a=null,m=null;
  Object.keys(e.scores||{}).forEach(function(s){
    var r=e.scores[s];if(!r||r.excludeFromTotal)return;
    var av=n32(r.actual),mv=n32(r.max);
    if(av!==null)a=(a===null?av:a+av);
    if(mv!==null)m=(m===null?mv:m+mv);
  });
  return (a!==null&&m)?r32(a/m*100):null;
}
function catOptionsV32(exams){
  var opts=[];
  try{if(typeof categoryOptionsV14==="function")(categoryOptionsV14()||[]).forEach(function(v){if(opts.indexOf(v)<0)opts.push(v);});}catch(e){}
  (exams||allExamsV32()).forEach(function(e){if(e.grade_level&&opts.indexOf(e.grade_level)<0)opts.push(e.grade_level);});
  return opts;
}
function scopeFilterV32(exams,scope){
  if(!scope||scope==="__all__")return exams;
  if(scope==="__none__")return exams.filter(function(e){return !e.grade_level;});
  return exams.filter(function(e){return e.grade_level===scope;});
}

/* ================= 特征提取 ================= */
function buildFeaturesV32(exams){
  var subjects=subjectListV32(exams);
  var metas=exams.map(function(e,i){
    return {i:i,e:e,name:e.name||("第"+(i+1)+"次"),date:e.exam_date||"",
      totalPos:totalPosYear32(e),totalCls:totalPosClass32(e),score:totalActualV32(e)};
  });
  var series={},valid={},mom={},stab={},pb={},streaks={},tgt={},latestN={},cohSub={};
  subjects.forEach(function(s){
    var ser=[];
    exams.forEach(function(e,i){
      var row=rowV32(e,s);
      var has=n32(row.actual)!==null||n32(row.target)!==null||n32(row.rank)!==null;
      if(!has)return;
      ser.push({i:i,pos:posYearOf32(e,row),cls:posClassOf32(e,row),
        rate:rateOf32(row),target:n32(row.target),actual:n32(row.actual),
        max:n32(row.max),N:effYearN32(e,row)});
    });
    series[s]=ser;
    var vp=ser.filter(function(x){return x.pos!==null;});
    valid[s]=vp;
    latestN[s]=vp.length?vp[vp.length-1].N:null;
    /* 动量:最近最多5个相邻差的中位数(奇数窗口);|中位数| < 0.8×1.4826×MAD 时判为"起伏持平"
       —— 震荡型数据硬给方向会误导,宁缺毋滥。正=前进(pp/场);至少3个有效点才出结论 */
    var diffs=[],coh=[];
    for(var j=1;j<vp.length;j++){
      diffs.push(vp[j].pos-vp[j-1].pos);
      var N1=vp[j-1].N,N2=vp[j].N;
      /* 口径变化:参考人数变化≥30%且≥100人——跨场位比跳变可能只是范围变了,不是真实进退 */
      coh.push(!!(N1&&N2&&Math.abs(N2-N1)/Math.max(N1,N2)>=0.3&&Math.abs(N2-N1)>=100));
    }
    var recent=diffs.slice(-5);
    if(recent.length>=2){
      var med=median32(recent);
      var devs=recent.map(function(d){return Math.abs(d-med);});
      var sigm=diffs.length>=3?1.4826*median32(devs):0; /* 3 个相邻差(4 场)即启用 MAD 波动保护 */
      var pp=r32(-med);
      var flat=Math.abs(pp)<0.3||(sigm>0&&Math.abs(med)<sigm*.8);
      mom[s]={pp:pp,names:(latestN[s]?r32(Math.abs(pp)*latestN[s]/100):null),diffs:recent,flat:flat};
    }else mom[s]=null;
    /* 稳定性:差的 MAD 估计 */
    if(diffs.length>=3){
      var sg=1.4826*(mad32(diffs)||0);
      stab[s]={sigma:r32(sg),cls:sg<1.5?"ok":(sg<3?"mid":"bad")};
    }else stab[s]=null;
    /* 个人最佳与状态 */
    if(vp.length){
      var best=vp[0];vp.forEach(function(x){if(x.pos<best.pos)best=x;});
      var last=vp[vp.length-1],gap=r32(last.pos-best.pos);
      var st="acc";
      if(gap<=1)st="ok";
      else{
        var notClose=0;for(var k2=vp.length-1;k2>0;k2--){if(vp[k2].pos-best.pos>5)notClose++;else break;}
        if(gap>5&&notClose>=2)st="warn";
      }
      pb[s]={pos:best.pos,i:best.i,gap:gap,st:st,bestEntry:best};
    }else pb[s]=null;
    /* 连续前进/后退(尾部的连续计数 + 连续段累计幅度;口径变化的相邻对视为断点,不跨口径累计) */
    var up=0,dn=0,k3=diffs.length-1,upSum=0,dnSum=0;
    while(k3>=0&&!coh[k3]&&diffs[k3]<0){up++;upSum+=diffs[k3];k3--;}
    k3=diffs.length-1;
    while(k3>=0&&!coh[k3]&&diffs[k3]>0){dn++;dnSum+=diffs[k3];k3--;}
    streaks[s]={up:up,down:dn,cum:recent.reduce(function(a,b){return a+b;},0),upSum:upSum,dnSum:dnSum};
    cohSub[s]=coh;
    /* 目标连胜负(同卷口径) */
    var mets=[];ser.forEach(function(x){if(x.target!==null&&x.actual!==null)mets.push(x.actual>=x.target);});
    var tm=0,tn=0,j2=mets.length-1;
    while(j2>=0&&mets[j2]){tm++;j2--;}
    j2=mets.length-1;
    while(j2>=0&&!mets[j2]){tn++;j2--;}
    tgt[s]={met:tm,notMet:tn,mets:mets};
  });
  /* 科目级难度信号(分-位弹性):跨全历史拟合,标记到每场考试;θ 按参考人数自适应 */
  var flags={},events=[],flTheta={};
  subjects.forEach(function(s){
    var vp=valid[s],pairs=[],resids=[];
    var pr=[];
    for(var j=1;j<vp.length;j++){
      var a=vp[j-1],b=vp[j];
      if(a.rate===null||b.rate===null)continue;
      var dp=b.pos-a.pos,dr=b.rate-a.rate;
      if(Math.abs(dp)<0.5&&Math.abs(dr)<1)continue;
      pr.push({bi:b.i,dp:dp,dr:dr});
    }
    if(pr.length<2)return;
    pr.forEach(function(p){if(p.dp!==0)pairs.push(p.dr/(-p.dp));});
    var k=median32(pairs);if(k===null||!Number.isFinite(k))return;
    pr.forEach(function(p){var e=p.dr-(-p.dp*k);resids.push(e);p.e=e;});
    /* θ 随参考人数自适应:位比抽样噪声≈2√(p̄(100−p̄)/N̄),人越少单场波动越宽,阈值下限越高
       取 p̄=20 的简化式 2√(1600/N̄)+1,夹在 [3,14];再与残差离散度取大 */
    var Ns=vp.map(function(x){return x.N;}).filter(function(n){return n&&Number.isFinite(n);});
    var Nbar=Ns.length?median32(Ns):300;
    var floorN=clamp32(r32(2*Math.sqrt(1600/Math.max(Nbar||300,10))+1),3,14);
    var theta=Math.max(floorN,(resids.length>=3?1.2*1.4826*(mad32(resids)||0):floorN));
    flTheta[s]={theta:r32(theta),floor:floorN,N:Nbar||null};
    pr.forEach(function(p){
      var lvl=0;
      if(p.e<=-theta)lvl=(p.e<=-1.5*theta)?2:1;
      else if(p.e>=theta)lvl=-1;
      if(lvl!==0){
        var key=p.bi+"|"+s;
        var old=flags[key];
        if(!old||(lvl===2)||(old!==2&&lvl===-1))flags[key]={e:r32(p.e),lvl:lvl};
        if(lvl>0)events.push({i:p.bi,subj:s,e:r32(p.e),strong:lvl===2});
      }
    });
  });
  var totalSeries=metas.filter(function(m){return m.totalPos!==null;})
    .map(function(m){return {i:m.i,pos:m.totalPos,cls:m.totalCls,score:m.score,name:m.name,N:n32(m.e.total_participants)};});
  var cohTotal=[];
  for(var jt=1;jt<totalSeries.length;jt++){
    var TN1=totalSeries[jt-1].N,TN2=totalSeries[jt].N;
    cohTotal.push(!!(TN1&&TN2&&Math.abs(TN2-TN1)/Math.max(TN1,TN2)>=0.3&&Math.abs(TN2-TN1)>=100));
  }
  var cohortChange=0;
  Object.keys(cohSub).forEach(function(s){cohSub[s].forEach(function(b){if(b)cohortChange++;});});
  cohTotal.forEach(function(b){if(b)cohortChange++;});
  var scoredExams=exams.filter(function(e){return totalActualV32(e)!==null;}).length;
  /* 数据质量项 */
  var pending=exams.filter(function(e){return totalTargetV32(e)!==null&&totalActualV32(e)===null;});
  var missCls=exams.filter(function(e){
    var hasYear=false,hasCls=false;
    Object.keys(e.scores||{}).forEach(function(s){var r=e.scores[s];
      if(n32(r.rank)!==null)hasYear=true;if(n32(r.classRank)!==null)hasCls=true;});
    return hasYear&&!hasCls;
  });
  var smallSubs=subjects.filter(function(s){
    return series[s].filter(function(x){return x.actual!==null;}).length<3&&series[s].length>0;
  });
  var zeroRankSubs=subjects.filter(function(s){
    return series[s]&&series[s].length>0&&valid[s].length===0;
  });
  var smallCohort=exams.filter(function(e){
    return Object.keys(e.scores||{}).some(function(s){var n=n32(e.scores[s].participants);return n!==null&&n<=30;});
  });
  /* 数据形态覆盖:有多少场带位比、多少场带得分率(决定降级策略) */
  var posCount=0,rateCount=0,scoreSeries=[];
  metas.forEach(function(m){
    var e=m.e,anyPos=m.totalPos!==null,anyRate=false;
    Object.keys(e.scores||{}).forEach(function(s){
      var r=e.scores[s];
      if(posYearOf32(e,r)!==null)anyPos=true;
      if(rateOf32(r)!==null)anyRate=true;
    });
    if(anyPos)posCount++;
    if(anyRate)rateCount++;
    if(m.score!==null)scoreSeries.push({i:m.i,score:m.score,name:m.name,date:m.date});
  });
  var last3=totalSeries.slice(-3).map(function(x){return x.pos;});
  var prevBest=null;
  if(totalSeries.length>=2)prevBest=Math.min.apply(null,totalSeries.slice(0,-1).map(function(x){return x.pos;}));
  return {exams:exams,subjects:subjects,metas:metas,series:series,valid:valid,latestN:latestN,
    mom:mom,stab:stab,pb:pb,streaks:streaks,tgt:tgt,flags:flags,events:events,flTheta:flTheta,
    totalSeries:totalSeries,scoreSeries:scoreSeries,posCount:posCount,rateCount:rateCount,
    cohSub:cohSub,cohTotal:cohTotal,cohortChange:cohortChange,
    scoredExams:scoredExams,
    overallLatest:totalSeries.length?totalSeries[totalSeries.length-1].pos:null,
    overallMedian3:last3.length?median32(last3):null,
    prevBestTotal:prevBest,
    latestScore:metas.length?metas[metas.length-1].score:null,
    prevScore:(metas.length>1?metas[metas.length-2].score:null),
    quality:{pending:pending,missCls:missCls,smallSubs:smallSubs,zeroRankSubs:zeroRankSubs,smallCohort:smallCohort,cohortChange:cohortChange}};
}

/* ================= 规则引擎 ================= */
var ICON32={
  mile:'<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h11l-2.5 3.5L16 11H5"/></svg>',
  up:'<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="M12 3L2 21h20z"/><line x1="12" y1="10" x2="12" y2="15"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>',
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>',
  loop:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>'
};
function speedTextV32(f,s){
  var m=f.mom[s];if(!m||!Number.isFinite(m.pp))return null;
  if(m.flat)return {text:"近期有起有伏,整体持平",arrow:"↔",up:null};
  if(m.pp===0)return null;
  var dir=m.pp>0?"每场前进约 ":"每场后退约 ";
  var v=m.names!=null?Math.max(1,Math.round(Math.abs(m.names))):r32(Math.abs(m.pp));
  return {text:dir+v+(m.names!=null?"名":"个百分点"),arrow:m.pp>0?"↗":"↘",up:m.pp>0};
}
function buildInsightsV32(f){
  var out=[],n=f.exams.length,last=n-1;
  function add(o){o.key=o.type+"|"+(o.subj||"");out.push(o);}
  /* 里程碑:总分位比创新高 */
  var ts=f.totalSeries;
  if(ts.length>=2&&f.prevBestTotal!==null&&ts[ts.length-1].pos<f.prevBestTotal){
    add({sev:0,type:"mile",icon:"mile",title:"总分排名创个人新高",
      body:"年级"+fmtPos32(ts[ts.length-1].pos)+",比自己之前的最好("+fmtPos32(f.prevBestTotal)+")又进了一步。",
      ev:"依据:"+ts.map(function(x){return shortName32(x.name)+" "+fmtPos32(x.pos);}).join(";")});
  }
  /* 科目级难度信号(仅最近两场内的强信号成卡) */
  f.events.forEach(function(ev){
    if(ev.i<last-1)return;
    var m=f.metas[ev.i],prev=f.metas[ev.i-1];
    var rp=rowV32(prev.e,ev.subj),rc=rowV32(m.e,ev.subj);
    var pp0=posYearOf32(prev.e,rp),pc0=posYearOf32(m.e,rc);
    var dp0=(pp0!==null&&pc0!==null)?pc0-pp0:null;
    var dr0=(rp.max&&rc.max)?Math.round(n32(rc.actual)/rc.max*100)-Math.round(n32(rp.actual)/rp.max*100):null;
    /* 文案必须与数据方向一致:分数是否真降 × 名次是否真坚挺/真退,共四类 */
    var rateTxt=(rp.max?Math.round(n32(rp.actual)/rp.max*100):"?")+"%→"+Math.round(n32(rc.actual)/rc.max*100)+"%";
    var posTxt=(pp0===null?"?":fmtPos32(pp0))+" → "+(pc0===null?"?":fmtPos32(pc0));
    var fall=(dr0!==null&&dr0<0)
      ? (dp0===null?"scoreDown":(dp0<-1?"scoreDownRankUp":(dp0>5?"scoreDownRankDown":"scoreDownRankFlat")))
      : "scoreNotDown";
    var title,body;
    if(fall==="scoreDownRankUp"){
      title="那场"+esc32(ev.subj)+":分数降了,排名反而升了?";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",排名从"+posTxt+"——更像这科卷子偏难,不是你退步。同场其他科目正常与否见热力表圆点。";
    }else if(fall==="scoreDownRankFlat"){
      title="那场"+esc32(ev.subj)+":分数降了,排名基本没动";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",名次只小幅波动("+posTxt+")——更像这科卷面偏难,整场都在压分。";
    }else if(fall==="scoreDownRankDown"){
      title="那场"+esc32(ev.subj)+":分数下滑的同时,排名也在退";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",排名从"+posTxt+"——卷子整体偏难,但你的位次确实掉了,先盯失分点,别只归因运气。";
    }else if(fall==="scoreNotDown"){
      title="那场"+esc32(ev.subj)+":分数在涨,排名却没跟上预判";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",名次"+posTxt+"——按你历史的分-位弹性,这分数本应带来更好的名次,而这科的压分点就是拉分空间。";
    }else{
      title="那场"+esc32(ev.subj)+":这科的分数和名次对不上";
      body=shortName32(prev.name)+"→"+shortName32(m.name)+" 得分率 "+rateTxt+",名次"+posTxt+"——更像这科卷子偏难,不是你退步。";
    }
    add({sev:ev.strong?1:2,type:"hard",subj:ev.subj+(ev.i),icon:"search",
      title:title,body:body,
      ev:"口径:排名对难度免疫,分数不是;残差 "+ev.e+" 个百分点。"});
  });
  /* 连续后退预警 / 连续进步 */
  f.subjects.forEach(function(s){
    var st=f.streaks[s];if(!st)return;
    var sp=speedTextV32(f,s);
    if(st.down>=2&&sp&&!sp.up){
      var dropPts=st.dnSum!==undefined?Math.abs(Math.round(st.dnSum)):null;
      var tip=dropPts!==null&&dropPts>10
        ? "这一轮已经累计退了"+dropPts+"个百分点,幅度不小了——抽空重点复盘这科的失分点。"
        : "幅度还小的话注意即可,再退一场要重点找原因。";
      add({sev:2,type:"decline",subj:s,icon:"warn",
        title:esc32(s)+"连续"+st.down+"场退步",
        body:"已从"+fmtPos32((f.valid[s][f.valid[s].length-st.down]||{}).pos)+"退到当前"+fmtPos32(f.valid[s][f.valid[s].length-1].pos)+"。"+tip,
        ev:"依据:最近"+st.down+"个相邻场次排名连续变大"+(dropPts!==null?"(累计约"+dropPts+"个百分点)":"")+"。"});
    }
    if(st.up>=3&&st.upSum<=-6){
      add({sev:4,type:"progress",subj:s,icon:"up",
        title:esc32(s)+"连续"+st.up+"场前进",
        body:"累计前进约"+r32(Math.abs(st.upSum))+"个百分点"+(f.latestN[s]?",折合约"+Math.max(1,Math.round(Math.abs(st.upSum)*f.latestN[s]/100))+"名":"")+",势头很好。",
        ev:"依据:连续"+st.up+"场的累计位比变化。"});
    }
  });
  /* 目标校准 */
  f.subjects.forEach(function(s){
    var t=f.tgt[s];if(!t)return;
    var vp=f.valid[s],base=vp.length?median32(vp.slice(-3).map(function(x){return x.pos;})):null;
    if(t.notMet>=3&&base!==null){
      var pbPos=f.pb[s]?f.pb[s].pos:null;
      var sugRaw=clamp32(r32(base-10),5,80);
      /* 精度守则:建议不得比个人最佳更紧——够得着才叫目标 */
      var sug=pbPos!==null?clamp32(Math.max(sugRaw,r32(pbPos+1)),5,80):sugRaw;
      var atBest=pbPos!==null&&sug<=r32(pbPos+1.2);
      add({sev:3,type:"tcal",subj:s,icon:"target",
        title:esc32(s)+"的目标该调一调了",
        body:atBest
          ?"目标连续"+t.notMet+"次没够到,而且这个目标定得比你的最好成绩还高。下次先定「稳住年级前"+sug+"%」——站稳了再往下探。"
          :"目标连续"+t.notMet+"次没够到。下次建议改成「进年级前"+sug+"%」,先定个够得着的。",
        ev:"锚点:取该科近3场典型水平"+fmtPos32(base)+";且不紧于个人最佳"+(pbPos!==null?fmtPos32(pbPos):"")+"。"});
    }else if(t.met>=3&&base!==null&&f.pb[s]){
      var up2=clamp32(r32(Math.min(base,f.pb[s].pos)-4),5,80);
      add({sev:4,type:"tcal",subj:s,icon:"target",
        title:esc32(s)+"可以再进一步",
        body:"目标已连续"+t.met+"次达成。下次建议「进年级前"+up2+"%",ev:"依据:连续达成+当前典型水平。"});
    }
  });
  /* 纪录临近 */
  var close=[];
  f.subjects.forEach(function(s){
    var p=f.pb[s];if(!p||p.st!=="acc")return;
    var sp=speedTextV32(f,s);
    if(p.gap>1&&p.gap<=5&&sp&&sp.up)close.push({s:s,gap:p.gap,sp:sp,mom:f.mom[s]?f.mom[s].pp:0});
  });
  close.sort(function(a,b){return b.mom-a.mom;});
  close.slice(0,1).forEach(function(c){
    add({sev:4,type:"pbclose",subj:c.s,icon:"up",
      title:esc32(c.s)+"离个人最好只差一步",
      body:"现在是"+fmtPos32(f.valid[c.s][f.valid[c.s].length-1].pos)+",最好成绩是"+fmtPos32(c.s==="__total__"?c.s:f.pb[c.s].pos)+";"+c.sp.text.replace("每场","最近")+",下一场很有希望刷新纪录。",
      ev:"依据:殿堂差距+动量方向。"});
  });
  /* 回归均值提示 */
  if(ts.length>=3&&f.prevBestTotal!==null&&ts[ts.length-1].pos<=f.prevBestTotal){
    var line=clamp32(r32(f.prevBestTotal+2),3,90);
    add({sev:5,type:"reg",icon:"loop",title:"上次考得太好,下次回落属正常",
      body:"刚创个人最佳后,下一次略有下滑是普遍规律,不用慌;跌破"+fmtPos32(line)+"才需要认真找原因。",
      ev:"统计常识:极端表现后向个人常态回归。"});
  }
  /* 单场大跌:最近一对位比退≥15pp 且同口径;该场已有偏难卡(hard)或连续退步卡(decline)时不重复 */
  f.subjects.forEach(function(s){
    var vp2=f.valid[s];if(!vp2||vp2.length<2)return;
    var A=vp2[vp2.length-2],B=vp2[vp2.length-1];
    var drop=r32(B.pos-A.pos);if(drop<15)return; /* 正=位比变大=退;前进方向由 progress 类覆盖 */
    var cArr=f.cohSub&&f.cohSub[s];
    if(cArr&&cArr[cArr.length-1])return; /* 参考人数口径变了:跳变不可直接比 */
    if(f.streaks[s]&&f.streaks[s].down>=2)return; /* decline 卡已覆盖本段 */
    if(f.flags[B.i+"|"+s]&&f.flags[B.i+"|"+s].lvl>0)return; /* hard 卡已覆盖 */
    add({sev:2,type:"bigdrop",subj:s,icon:"warn",
      title:esc32(s)+"单场跌了近"+Math.round(drop)+"个百分点",
      body:shortName32(f.metas[A.i].name)+"→"+shortName32(f.metas[B.i].name)+" 位比从"+fmtPos32(A.pos)+"退到"+fmtPos32(B.pos)
        +(A.rate!==null&&B.rate!==null?"(得分率 "+Math.round(A.rate)+"%→"+Math.round(B.rate)+"%)":"")+"——先看这场哪里失分,再判断是发挥还是题型变化。",
      ev:"依据:相邻场位比 "+A.pos+"→"+B.pos+",单场跌幅≥15个百分点,两场参考人数口径一致。"});
  });
  /* 总分级连续进退(≥2场、累计≥8pp、同口径段) */
  if(ts.length>=3){
    var tDiffs=[],tCoh=f.cohTotal||[];
    for(var t1=1;t1<ts.length;t1++)tDiffs.push(ts[t1].pos-ts[t1-1].pos);
    var run3=0,sum3=0,start3=-1;
    for(var t2=tDiffs.length-1;t2>=0;t2--){
      if(!tCoh[t2]&&tDiffs[t2]>0){if(run3===0)start3=t2;run3++;sum3+=tDiffs[t2];}
      else break;
    }
    if(run3>=2&&sum3>=8&&start3>=0){
      add({sev:2,type:"tdecl",icon:"warn",
        title:"总分连续"+run3+"场退步",
        body:"总分位置从"+fmtPos32(ts[start3].pos)+"退到当前"+fmtPos32(ts[ts.length-1].pos)+",累计约"+Math.round(sum3)+"个百分点——看看是哪科拖了后腿(可回「学科结构」对比)。",
        ev:"依据:总分位比相邻场变化,连续"+run3+"场变大(累计约"+Math.round(sum3)+"pp),参考人数口径一致。"});
    }
    run3=0;sum3=0;start3=-1;
    for(var t3=tDiffs.length-1;t3>=0;t3--){
      if(!tCoh[t3]&&tDiffs[t3]<0){if(run3===0)start3=t3;run3++;sum3+=tDiffs[t3];}
      else break;
    }
    if(run3>=2&&sum3<=-8&&start3>=0){
      add({sev:4,type:"tprog",icon:"up",
        title:"总分连续"+run3+"场前进",
        body:"总分位置从"+fmtPos32(ts[start3].pos)+"进到当前"+fmtPos32(ts[ts.length-1].pos)+",累计约"+Math.round(Math.abs(sum3))+"个百分点,势头不错。",
        ev:"依据:总分位比相邻场变化,连续"+run3+"场变小(累计约"+Math.round(Math.abs(sum3))+"pp),参考人数口径一致。"});
    }
  }
  /* 口径变化提醒:最近一次考试与上一场之间,参考人数变化≥30%且≥100人 */
  var cohortMsg="";
  f.subjects.forEach(function(s){
    var cA=f.cohSub&&f.cohSub[s];
    if(!cA||!cA.length||!cA[cA.length-1])return;
    var vp3=f.valid[s],N1=vp3[vp3.length-2].N,N2=vp3[vp3.length-1].N;
    cohortMsg+=(cohortMsg?"、":"")+esc32(s)+"("+(N1||"?")+"→"+(N2||"?")+"人)";
  });
  if(ts.length>=2&&tCoh&&tCoh.length&&tCoh[tCoh.length-1]){
    var TN1=ts[ts.length-2].N,TN2=ts[ts.length-1].N;
    cohortMsg+=(cohortMsg?"、":"")+"总分("+(TN1||"?")+"→"+(TN2||"?")+"人)";
  }
  if(cohortMsg){
    add({sev:5,type:"cohort",icon:"search",
      title:"最近这场参考人数口径变了",
      body:cohortMsg+"——人数不同时,名次百分比不能直接和上次比,这场的跳变先别急着下结论。",
      ev:"依据:相邻场参考人数变化≥30%且≥100人时,位比跳变不可跨场直接比较。"});
  }
  /* 纯分数账号:引导补录名次 */
  if(f.posCount===0&&f.rateCount>=2){
    add({sev:5,type:"norank",icon:"search",title:"补一个数据,解锁全部排名分析",
      body:"目前的考试只录了分数。下次考完把「名次」和「总人数」填上(单科或总分都行),进步趋势、强弱科、个人最佳殿堂会立刻上线——分数受试卷难度影响,排名才是跨考试的硬通货。",
      ev:"排名类分析依赖 名次÷人数 的位比口径;不同试卷的分数不可直接比较,所以这里不强行下结论。"});
  }
  /* 去重 + 排序 + 截断 */
  var seen={};out=out.filter(function(o){if(seen[o.key])return false;seen[o.key]=1;return true;});
  out.sort(function(a,b){return a.sev-b.sev;});
  return {all:out,visible:out.slice(0,6),rest:Math.max(0,out.length-6)};
}

/* ================= SVG 构建器(返回字符串) ================= */
function accentRgbV32(){
  try{
    var v=(getComputedStyle(document.documentElement).getPropertyValue("--accent")||"").trim();
    var m=v.match(/^#?([0-9a-f]{6})$/i);
    if(m)return [parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4,6),16)];
    var m2=v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if(m2)return [+m2[1],+m2[2],+m2[3]];
  }catch(e){}
  return [93,114,232];
}
function rgba32(rgb,a){return "rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+a+")";}
/* 折线:lines=[{vals,color,dash}] labels=[...];tickLabel(v) 自定义纵轴刻度 */
function lineSvgV32(lines,labels,opts){
  opts=opts||{};
  var W=520,H=230,L=52,R=14,T=16,B=30,cw=W-L-R,chh=H-T-B;
  var all=[];
  lines.forEach(function(s){s.vals.forEach(function(v){if(v!==null&&v!==undefined&&v===v)all.push(v);});});
  if(!all.length)return "";
  var lo=Math.min.apply(null,all),hi=Math.max.apply(null,all);
  var pad=(hi-lo)*.25||10;lo=lo-pad;hi=hi+pad;
  var n=lines[0].vals.length;
  function X(i){return L+(n===1?cw/2:cw*i/(n-1));}
  function Y(v){return T+chh*(1-(v-lo)/(hi-lo));}
  var g="";
  for(var i=0;i<=4;i++){var v=lo+(hi-lo)*i/4,y=Y(v);
    var lbl=opts.tickLabel?opts.tickLabel(v):Math.round(v)+(opts.unit||"");
    g+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" stroke="var(--line,#e8ebf0)"/>'+
       '<text x="'+(L-6)+'" y="'+(y+3.5)+'" text-anchor="end" font-size="9.5" fill="var(--muted,#788392)">'+lbl+"</text>";}
  for(var j=0;j<n;j++){
    g+='<text x="'+X(j)+'" y="'+(H-8)+'" text-anchor="middle" font-size="9.5" fill="var(--muted,#788392)">'+esc32(labels[j]||"")+"</text>";
  }
  lines.forEach(function(s){
    /* null=该场没录这个口径:断线分段,绝不拿另一条线的值造假填充 */
    var segs=[],cur=[];
    s.vals.forEach(function(v,i){
      if(v===null||v===undefined||v!==v){if(cur.length>1)segs.push(cur);cur=[];}
      else cur.push({x:X(i),y:Y(v)});
    });
    if(cur.length>1)segs.push(cur);
    segs.forEach(function(seg){
      g+='<polyline points="'+seg.map(function(p){return p.x+","+p.y;}).join(" ")
        +'" fill="none" stroke="'+s.color+'" stroke-width="2.6" stroke-linecap="round"'
        +(s.dash?' stroke-dasharray="5 4"':"")+"></polyline>";
    });
    s.vals.forEach(function(v,i){
      if(v===null||v===undefined||v!==v)return;
      g+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.6" fill="var(--panel-solid,#fff)" stroke="'+s.color+'" stroke-width="2.2"/>';
    });
  });
  if(opts.marks)g+=opts.marks(X,Y,W,H,B);
  return '<svg viewBox="0 0 '+W+" "+H+'" style="width:100%;height:auto;display:block">'+g+"</svg>";
}
function sparkSvg32(vals,color){
  if(!vals||vals.length<2)return '<span style="font-size:10px;color:var(--muted)">数据不足</span>';
  var W=96,Hh=26,lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals),sp=(hi-lo)||1;
  var pts=vals.map(function(v,i){return (2+i*(W-4)/(vals.length-1)).toFixed(1)+","+(Hh-3-(v-lo)/sp*(Hh-6)).toFixed(1);}).join(" ");
  return '<svg width="'+W+'" height="'+Hh+'" viewBox="0 0 '+W+" "+Hh+'"><polyline points="'+pts+'" fill="none" stroke="'+(color||"var(--accent,#5d72e8)")+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/* 四象限散点:pts=[{n,sp(名次变化/场,正=前进),pos,c}] */
function quadSvgV32(pts,overallPos){
  var W=520,H=310,L=46,R=12,T=16,B=36,cw=W-L-R,chh=H-T-B;
  /* 横轴动态域:默认±24名/场,数据更猛时自动放宽 */
  var maxSp=24;pts.forEach(function(p){var a=Math.abs(Number(p.sp)||0);if(a>maxSp)maxSp=Math.ceil(a*1.2);});
  var X0=-maxSp,X1=maxSp;
  /* 纵轴动态域:覆盖全部科目当前位比与总分水平,余量≥18%,域宽至少12个百分点 */
  var ps=pts.map(function(p){return p.pos;});
  if(overallPos!==null&&overallPos!==undefined&&Number.isFinite(overallPos))ps.push(overallPos);
  var pMin=ps.length?Math.min.apply(null,ps):10,pMax=ps.length?Math.max.apply(null,ps):90;
  var vpad=Math.max((pMax-pMin)*.18,3);
  var P0=clamp32(pMin-vpad,2,60),P1=clamp32(pMax+vpad,P0+12,98);
  function X(v){return L+cw*(v-X0)/(X1-X0);}
  function Y(pos){return T+chh*(clamp32(pos,P0,P1)-P0)/(P1-P0);} /* 位比小=靠上 */
  var x0=X(0),yh=Y(overallPos===null||!Number.isFinite(overallPos)?P1:overallPos),s="";
  function rect(x1,y1,x2,y2,f){return '<rect x="'+Math.min(x1,x2)+'" y="'+Math.min(y1,y2)+'" width="'+Math.abs(x2-x1)+'" height="'+Math.abs(y2-y1)+'" fill="'+f+'"/>';}
  s+=rect(L,T,x0,yh,"rgba(93,114,232,.06)")+rect(x0,T,W-R,yh,"rgba(50,167,122,.07)")
    +rect(L,yh,x0,H-B,"rgba(217,92,92,.06)")+rect(x0,yh,W-R,H-B,"rgba(229,155,69,.07)");
  /* 横向刻度:在有效域内取整齐的位比值 */
  var step=P1-P0>40?20:(P1-P0>18?10:5);
  for(var tv=Math.ceil(P0/step)*step;tv<=P1;tv+=step){
    var yy=Y(tv);
    s+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="var(--line,#e8ebf0)"/>'+
       '<text x="'+(L-6)+'" y="'+(yy+3.5)+'" text-anchor="end" font-size="9.5" fill="var(--muted,#788392)">前'+tv+"%</text>";
  }
  s+='<line x1="'+x0+'" y1="'+T+'" x2="'+x0+'" y2="'+(H-B)+'" stroke="var(--line,#e8ebf0)" stroke-dasharray="4 3"/>'
    +'<line x1="'+L+'" y1="'+yh+'" x2="'+(W-R)+'" y2="'+yh+'" stroke="var(--muted,#98a1ae)"/>'
    +'<text x="'+(W-R)+'" y="'+Math.max(T+10,yh-5)+'" text-anchor="end" font-size="9" fill="var(--muted,#98a1ae)">你的总分水平 '+fmtPos32(overallPos)+"</text>"
    +'<text x="'+L+'" y="'+(H-B+17)+'" font-size="9.5" fill="var(--muted,#788392)">\u2190 每场在后退</text>'
    +'<text x="'+(W-R)+'" y="'+(H-B+17)+'" text-anchor="end" font-size="9.5" fill="var(--muted,#788392)">每场在前进 \u2192</text>'
    +'<text x="'+x0+'" y="'+(H-B+17)+'" text-anchor="middle" font-size="9.5" fill="var(--muted,#788392)">0</text>'
    +'<text x="'+(L+8)+'" y="'+(T+14)+'" font-size="10" font-weight="700" fill="rgba(93,114,232,.55)">优势守望</text>'
    +'<text x="'+(W-R-8)+'" y="'+(T+14)+'" text-anchor="end" font-size="10" font-weight="700" fill="rgba(50,167,122,.6)">强势上升</text>'
    +'<text x="'+(L+8)+'" y="'+(H-B-8)+'" font-size="10" font-weight="700" fill="rgba(217,92,92,.6)">重点警报</text>'
    +'<text x="'+(W-R-8)+'" y="'+(H-B-8)+'" text-anchor="end" font-size="10" font-weight="700" fill="rgba(229,155,69,.65)">快速爬升</text>';
  var boxes=[];
  function fits(x,y,w,hh){
    return !boxes.some(function(b){return x<b.x+b.w&&x+w>b.x&&y<b.y+b.h&&y+hh>b.y;});
  }
  var placedDots=[];
  pts.forEach(function(p){
    var x=X(clamp32(p.sp,-(maxSp-.5),maxSp-.5)),y=Y(p.pos);
    /* 重合避让:与其他圆点距离过近时沿横轴小步挪开——只挪视觉位置,data-* 里仍是真实值 */
    var k=0;
    while(k<6&&placedDots.some(function(q){return Math.abs(q.x-x)<15&&Math.abs(q.y-y)<17;})){
      k++;x+=(k%2?1:-1)*k*8;
      x=clamp32(x,L+8,W-R-8);
    }
    placedDots.push({x:x,y:y});
    var c=p.c||"var(--accent,#5d72e8)";
    s+='<g class="sv31-qpt" data-n="'+esc32(p.n)+'" data-sp="'+p.sp+'" data-pos="'+p.pos+'" style="cursor:pointer">'
      +'<circle cx="'+x+'" cy="'+y+'" r="13" fill="transparent"/>'
      +'<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="var(--panel-solid,#fff)" stroke="'+c+'" stroke-width="2.6"/>';
    var cands=[[9,4,"start"],[9,-7,"start"],[9,13,"start"],[-9,4,"end"],[-9,-7,"end"],[-9,13,"end"],[0,-12,"middle"],[0,18,"middle"]];
    for(var ci=0;ci<cands.length;ci++){
      var d=cands[ci],lw=(p.n.length*11+6);
      var lx=d[0]<0?x+d[0]-lw:(d[0]===0?x-lw/2:x+d[0]);
      var ly=y+d[1]-(d[1]>0?0:10);
      if(fits(lx-1,ly,lw+2,13)){boxes.push({x:lx-1,y:ly,w:lw+2,h:13});
        s+='<text x="'+(x+d[0])+'" y="'+(y+d[1])+'" text-anchor="'+d[2]+'" font-size="11" font-weight="700" fill="var(--text,#18212f)">'+esc32(p.n)+"</text>";break;}
    }
    s+="</g>";
  });
  return '<svg viewBox="0 0 '+W+" "+H+'" style="width:100%;height:auto;display:block">'+s+"</svg>";
}
function donutSvgV32(data,total,label){
  var cx=70,cy=70,r=52,ir=30,a0=-Math.PI/2,seg="",sum=total||data.reduce(function(a,b){return a+b.v;},0)||1;
  data.forEach(function(d){
    var a1=a0+(d.v/sum)*Math.PI*2,large=(a1-a0)>Math.PI?1:0;
    function pt(rad,a){return (cx+rad*Math.cos(a)).toFixed(2)+","+(cy+rad*Math.sin(a)).toFixed(2);}
    if(d.v>0)seg+='<path d="M '+pt(r,a0)+" A "+r+" "+r+" 0 "+large+" 1 "+pt(r,a1)+" L "+pt(ir,a1)+" A "+ir+" "+ir+" 0 "+large+" 0 "+pt(ir,a0)+' Z" fill="'+d.c+'" stroke="var(--panel-solid,#fff)" stroke-width="2"/>';
    a0=a1;
  });
  var leg=data.map(function(d,i){var y=62+i*20;
    return '<rect x="150" y="'+(y-8)+'" width="9" height="9" rx="2.5" fill="'+d.c+'"/><text x="165" y="'+y+'" font-size="11" fill="var(--text,#18212f)">'+esc32(d.l)+" · "+d.v+"次</text>";}).join("");
  return '<svg viewBox="0 0 300 140" style="width:100%;max-width:340px;height:auto">'+seg+
    '<text x="150" y="50" text-anchor="middle" font-size="11" fill="var(--muted,#788392)">'+esc32(label||"")+"</text>"+leg+"</svg>";
}

/* ================= 页面 HTML ================= */
function controlsHtmlV32(f){
  var cats=catOptionsV32(f.exams);
  var scope=(typeof state!=="undefined"&&state.sv31)||{};
  var cur=scope.scope||"__all__";
  var chips='<button class="chip'+(cur==="__all__"?" active":"")+'" data-sv31-scope="__all__">全部</button>';
  cats.forEach(function(c){chips+='<button class="chip'+(cur===c?" active":"")+'" data-sv31-scope="'+esc32(c)+'">'+esc32(c)+"</button>";});
  var mode=scope.mode||"rank";
  return '<div class="sv31-controls"><div class="chips sv31-scroll-x" id="sv31Scope">'+chips+"</div>"
    +'<div class="sv31-seg" id="sv31Mode">'
    +'<button class="'+(mode==="rank"?"active":"")+'" data-mode="rank">排名模式(推荐)</button>'
    +'<button class="'+(mode==="score"?"active":"")+'" data-mode="score">分数模式</button></div>'
    +(mode==="score"
      ?'<div class="sv31-warn">当前为<b>分数模式</b>:各科是不同试卷、各次考试难度不同,分数跨考试不可直接比较,仅供同卷阅读。结论以排名模式为准。</div>'
      :'<div class="sv31-modenote">排名模式 · 跨卷比较以名次为准;切「分数模式」可看各科卷面分与得分率</div>')
    +"</div>";
}
/* 名次口径模块在分数模式下打的标 */
function lockTagV32(mode){return mode==="score"?'<span class="sv31-tag">名次口径 · 不随模式切换</span>':"";}
function kpiHtmlV32(f,mode){
  function stat(lb,v,delta,cls){return '<div class="sv31-stat"><div class="lb">'+lb+'</div><div class="v">'+v+'</div>'+(delta?'<span class="d '+cls+'">'+delta+"</span>":"")+"</div>";}
  if(f.posCount===0){
    /* 纯分数形态:不硬凑位比,给同卷可比的指标 */
    var met=0,tot=0;
    f.exams.forEach(function(e){var t=totalTargetV32(e),a=totalActualV32(e);if(t!==null&&a!==null){tot++;if(a>=t)met++;}});
    var d=f.latestScore!==null&&f.prevScore!==null?f.latestScore-f.prevScore:null;
    var lr=f.exams.length?examRateV32(f.exams[f.exams.length-1]):null;
    var pr=f.exams.length>1?examRateV32(f.exams[f.exams.length-2]):null;
    var dd=(pr!==null&&lr!==null)?r32(lr-pr):null;
    return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">① 总览</h3>'
      +'<p class="card-sub">当前考试只录了分数——分数仅在相同试卷范围内可比</p></div>'
      +'<span class="sv31-tag">排名分析待补录名次后解锁</span></div>'
      +'<div class="sv31-kpi">'
      +stat("最近总分",f.latestScore===null?"—":String(Math.round(f.latestScore)),d===null?"":("较上次 "+(d>=0?"+":"")+Math.round(d)+" 分"),d===null?"flat":(d>=0?"up":"down"))
      +stat("整卷得分率 · 最近一次",lr===null?"—":lr+"<small>%</small>",dd===null?"":("较上次 "+(dd>=0?"+":"")+dd+" 个百分点"),dd===null?"flat":(dd>=0?"up":"down"))
      +stat("目标完成情况",(tot?met+"<small> / "+tot+" 次</small>":"—"),"按每张卷子各自算","flat")
      +"</div></div>";
  }
  var ts=f.totalSeries;
  var latestCls=null;for(var i=ts.length-1;i>=0;i--){if(ts[i].cls!==null){latestCls=ts[i].cls;break;}}
  var pbTotal=null,pbIsLast=false;
  if(ts.length){pbTotal=Math.min.apply(null,ts.map(function(x){return x.pos;}));pbIsLast=(ts[ts.length-1].pos<=pbTotal);}
  var stRankDelta=ts.length>=2?(pbIsLast?"个人历史最好":"较历史最好差 "+r32(Math.abs(ts[ts.length-1].pos-pbTotal))+" 个百分点"):"";
  var met=0,tot=0;
  f.exams.forEach(function(e){var t=totalTargetV32(e),a=totalActualV32(e);if(t!==null&&a!==null){tot++;if(a>=t)met++;}});
  var d=f.latestScore!==null&&f.prevScore!==null?f.latestScore-f.prevScore:null;
  var stRankLatest=stat("年级排名 · 最近一次",fmtPos32(f.overallLatest),stRankDelta,pbIsLast?"up":"info");
  var stMedian=stat("年级排名 · 最近3次典型水平",f.overallMedian3===null?"—":fmtPos32(f.overallMedian3),"","");
  var stCls=latestCls!==null?stat("班级排名 · 最近一次",fmtPos32(latestCls),"",""):"";
  var stGoal=stat("目标完成情况",(tot?met+"<small> / "+tot+" 次</small>":"—"),"按每张卷子各自算","flat");
  var stScore=stat("最近总分(仅参考)",f.latestScore===null?"—":String(Math.round(f.latestScore)),d===null?"":((d>=0?"+":"")+Math.round(d)+"分 · 受试卷难度影响"),d===null?"flat":(d>=0?"up":"down"));
  var kpis;
  if(mode==="score"){
    var lr=f.exams.length?examRateV32(f.exams[f.exams.length-1]):null;
    var prr=f.exams.length>1?examRateV32(f.exams[f.exams.length-2]):null;
    var ddr=(prr!==null&&lr!==null)?r32(lr-prr):null;
    var stRate=stat("整卷得分率 · 最近一次",lr===null?"—":lr+"<small>%</small>",ddr===null?"":("较上次 "+(ddr>=0?"+":"")+ddr+" 个百分点"),ddr===null?"flat":(ddr>=0?"up":"down"));
    kpis=stScore+stRate+stGoal+stRankLatest+(f.overallMedian3!==null?stMedian:"")+stCls;
  }else{
    kpis=stRankLatest+stMedian+stCls+stGoal+stScore;
  }
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">① 总览</h3><p class="card-sub">'
    +(mode==="score"?"分数视角优先 · 名次仍随时可看":"排名是主指标,总分仅供参考")+"</p></div></div>"
    +'<div class="sv31-kpi">'+kpis+"</div></div>";
}
function insightsHtmlV32(ins){
  if(!ins.all.length)return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">② 智能提醒</h3></div></div><p class="card-sub">再积累一场考试,这里就会开始告诉你很多事。</p></div>';
  var tone={0:"i-mile",1:"i-risk",2:"i-warn",3:"i-warn",4:"i-up",5:"i-info"};
  var cards=ins.visible.map(function(o,idx){
    return '<div class="sv31-insight '+tone[o.sev]+'"><div class="ico">'+ICON32[o.icon]+"</div><div><b>"+o.title+"</b><p>"+o.body+"</p>"
      +(o.ev?'<span class="ev" data-sv31-ev="'+idx+'">查看依据</span>':"")+"</div>"
      +(o.ev?'<div class="sv31-evbody" hidden>'+esc32(o.ev)+"</div>":"")+"</div>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">② 智能提醒</h3><p class="card-sub">点「查看依据」可看计算过程</p></div><span class="sv31-tag">今天 '+ins.visible.length+" 条</span></div>"+cards
    +(ins.rest?'<p class="card-sub">还有 '+ins.rest+' 条较弱的提醒已折叠。</p>':"")+"</div>";
}
function trendHtmlV32(f,mode){
  var ts=f.totalSeries;
  var sub=mode==="rank"?"试卷难度不同,排名依然公平":"圆点 = 该科这张卷偏难。看分数起伏时请结合圆点。";
  var paneRank="",paneScore="";
  if(ts.length>=2){
    var labels=ts.map(function(x){return shortName32(x.name);});
    var lines=[{vals:ts.map(function(x){return 100-x.pos;}),color:"var(--accent,#5d72e8)"}];
    if(ts.some(function(x){return x.cls!==null;}))lines.push({vals:ts.map(function(x){return x.cls===null?null:100-x.cls;}),color:"var(--green,#32a77a)",dash:true});
    paneRank=lineSvgV32(lines,labels,{tickLabel:function(v){return "前"+clamp32(Math.round(100-v),0,99)+"%";}});
    var sc=ts.filter(function(x){return x.score!==null;});
    if(sc.length>=2){
      var idxMap={};sc.forEach(function(x,k){idxMap[x.i]=k;});
      var hardByExam={};
      Object.keys(f.flags).forEach(function(key){
        var parts=key.split("|"),lvl=f.flags[key].lvl;
        if(lvl>0)(hardByExam[parts[0]]=hardByExam[parts[0]]||[]).push({s:parts[1],lvl:lvl});
      });
      var marks=function(X,Y,W,H,B){
        var out="";
        Object.keys(hardByExam).forEach(function(i){
          if(idxMap[i]===undefined)return;
          var x=X(idxMap[i]),y=H-B-6,col=hardByExam[i].some(function(z){return z.lvl===2;})?"#d95c5c":"#e59b45";
          out+='<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="'+col+'"/>';
        });
        return out;
      };
      paneScore=lineSvgV32([{vals:sc.map(function(x){return x.score;}).map(function(v){return Math.round(v);}),color:"var(--accent,#5d72e8)"}],
        sc.map(function(x){return shortName32(x.name);}),{unit:"分",marks:marks});
    }
  }
  return '<div class="card"><div class="card-title-row">'
    +'<div><h3 class="card-title">③ 趋势与进步</h3><p class="card-sub">'+sub+"</p></div>"
    +'<div class="sv31-seg sv31-tabs"><button class="'+(mode==="rank"?"active":"")+'" data-sv31-tab="rank">排名走势</button>'
    +'<button class="'+(mode==="score"?"active":"")+'" data-sv31-tab="score">分数参考</button></div></div>'
    +'<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--accent,#5d72e8)"></i>年级排名</span>'
    +(ts.some(function(x){return x.cls!==null;})?'<span><i style="background:var(--green,#32a77a)"></i>班级排名</span>':"")+"</div>"
    +'<div class="sv31-pane'+(mode==="rank"?" on":"")+'" data-pane="rank">'+(paneRank||(f.posCount===0
      ?'<p class="card-sub">这些考试没录名次,排名走势暂时是空的——已自动切到「分数参考」。下次补录「名次 + 总人数」即可解锁。</p>'
      :'<p class="card-sub">出分满 2 次后显示走势。</p>'))+"</div>"
    +'<div class="sv31-pane'+(mode==="score"?" on":"")+'" data-pane="score">'+(paneScore||'<p class="card-sub">出分满 2 次后显示分数走势。</p>')+"</div>"
    +speedTableHtmlV32(f)+"</div>";
}
function speedTableHtmlV32(f){
  var rows=[];
  f.subjects.forEach(function(s){
    var m=f.mom[s],vp=f.valid[s];
    if(!m||!vp||vp.length<3)return;
    var sp=speedTextV32(f,s);
    var st=f.stab[s];
    var pill=st?(st.cls==="ok"?'<span class="pill ok">稳</span>':st.cls==="mid"?'<span class="pill flat">有起伏</span>':'<span class="pill warn">不稳</span>'):'<span class="pill flat">数据少</span>';
    rows.push({s:s,text:sp.text,arrow:sp.arrow,up:sp.up,st:pill,pos:vp[vp.length-1].pos,n:m.names});
  });
  if(!rows.length)return "";
  rows.sort(function(a,b){
    var ra=a.up===true?0:(a.up===null?1:2),rb=b.up===true?0:(b.up===null?1:2);
    if(ra!==rb)return ra-rb;
    return Math.abs(b.n||0)-Math.abs(a.n||0);
  });
  var body=rows.map(function(r){
    var col=r.up===true?"var(--green,#32a77a)":(r.up===false?"var(--danger,#d95c5c)":"var(--muted,#788392)");
    return "<tr><td>"+esc32(r.s)+"</td><td class=\"num\" style=\"color:"+col+"\"><b>"+r.text+" "+r.arrow+"</b></td><td>"+r.st+'</td><td class="num">'+fmtPos32(r.pos)+"</td></tr>";
  }).join("");
  return '<div style="margin-top:14px"><b style="font-size:13px">进步速度榜 <span style="color:var(--muted);font-weight:600">(最近5次典型)</span></b>'
    +'<div class="sv31-scroll"><table style="margin-top:6px"><thead><tr><th>科目</th><th style="text-align:right">速度</th><th>发挥</th><th style="text-align:right">当前排名</th></tr></thead><tbody>'+body+"</tbody></table></div></div>";
}

/* ---------- ④ 学科结构 ---------- */
function structureHtmlV32(f,mode){
  var ov=f.overallLatest;
  var rows=[],quad=[],catchBars=[];
  /* 第一遍:收集各科当前位比 → 基准=六科中位数(比"和总分比"更公平:总分会被强科抬高/拉低) */
  var tmp=[];
  f.subjects.forEach(function(s){
    var vp=f.valid[s];if(vp.length<3)return; /* 与 ⑨「不足 3 次不给趋势判断」一致:2 场定不了强弱 */
    var cur=vp[vp.length-1].pos,m=f.mom[s];
    tmp.push({s:s,cur:cur,sp:(m&&!m.flat)?m.pp:null});
  });
  var medSub=tmp.length>=3?median32(tmp.map(function(x){return x.cur;})):null;
  var maxAdv=null;
  if(medSub!==null)tmp.forEach(function(x){var a=r32(medSub-x.cur);if(maxAdv===null||a>maxAdv)maxAdv=a;});
  /* 第二遍:出信号。adv=中位基准−当前,为正=强于自己的六科典型水平 */
  tmp.forEach(function(x){
    var s=x.s,cur=x.cur,sp=x.sp,m=f.mom[s];
    var namesTxt=(m&&m.flat)?"近期有起有伏,整体持平":(x.sp!==null?((x.sp>0?"前进约":"后退约")+r32(Math.abs(x.sp))+"个百分点"+(m&&m.names!=null?"("+Math.max(1,Math.round(Math.abs(m.names)))+"名)":"")):"数据少");
    var diff=ov===null?null:r32(ov-cur);
    var adv=medSub===null?null:r32(medSub-cur);
    var sig,sigCls="flat";
    var stUp=sp!==null&&sp>=4;
    var isTrump=(adv!==null&&adv>=8)||(adv!==null&&maxAdv!==null&&adv===maxAdv&&adv>=3);
    if(isTrump){sig="相对强项";sigCls="acc";}
    else if(cur>=50||(adv!==null&&adv<=-8)||(diff!==null&&diff<=-25)){sig="第一优先补";sigCls="bad";}
    else if(stUp&&Math.abs(f.streaks[s].cum)>=6){sig="进步最快";sigCls="acc";}
    else if(sp!==null&&Math.abs(sp)<1){sig="基本持平";sigCls="ok";}
    else{sig="稳步跟上";sigCls="flat";}
    rows.push({s:s,pos:cur,namesTxt:namesTxt,up:sp!==null&&sp>0,diff:diff,adv:adv,sig:sig,sigCls:sigCls});
    var reg=cur<=(ov===null?999:ov)?(sp!==null&&sp<0?"tl":"tr"):(sp!==null&&sp<0?"bl":"br");
    quad.push({s:s,pos:cur,
      c:reg==="tl"?"#5b6bd5":reg==="tr"?"#32a77a":reg==="bl"?"#d95c5c":"#e59b45"});
    /* 追赶地图:落后整体≥10个百分点的科,先收窄35%差距 */
    if(diff!==null&&diff<=-10){
      var target=r32(clamp32(cur+diff*0.35,5,90));
      var N=f.latestN[s];
      catchBars.push({s:s,from:cur,to:target,students:N?Math.max(1,Math.round((cur-target)*N/100)):null});
    }
  });
  rows.sort(function(a,b){return a.pos-b.pos;});
  var rowHtml=rows.map(function(r){
    return "<tr><td>"+esc32(r.s)+"</td><td class=\"num\" style=\"font-weight:800\">"+fmtPos32(r.pos)+"</td>"
      +'<td class="num" style="color:var('+(r.up?"--green,#32a77a":"--muted,#788392")+")\">"+r.namesTxt+"</td>"
      +'<td class="num">'+(r.adv===null?"—":(r.adv>=0?"+":"")+r.adv)+"</td>"
      +'<td><span class="pill '+r.sigCls+'">'+r.sig+"</span></td></tr>";
  }).join("");
  /* 四象限散点:横轴=名次变化/场(正为前进),纵轴=当前位比 */
  var quadPts=quad.map(function(q){
    var m=f.mom[q.s],N=f.latestN[q.s]||300;
    return {n:q.s,sp:(m&&!m.flat)?r32(m.pp*N/100):0,pos:q.pos,c:q.c}; /* 正=前进=右 */
  });
  var catchHtml=catchBars.sort(function(a,b){return b.from-a.from;}).slice(0,2).map(function(c){
    var stu=c.students?(" · 约需超过"+c.students+"名同学"):"";
    var pct=Math.round(clamp32((c.from-c.to)/50*100,8,92));
    return '<div class="sv31-catch"><div class="h"><b>'+esc32(c.s)+" · 从前"+r32(c.from)+"% 追到 前"+r32(c.to)+"%</b>"
      +'<span class="dim">差'+r32(c.from-c.to)+"个百分点</span></div>"
      +'<div class="track"><div class="fill" style="width:'+pct+'%"></div></div>'
      +'<div class="sub">第一步先收窄三分之一差距'+stu+"</div></div>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">④ 学科结构</h3>'
    +'<p class="card-sub">「比六科典型」为正 = 强于你六科的典型水平;总分排名会受强科影响,这里看的是你自己的内部结构</p></div>'
    +lockTagV32(mode)+"</div>"
    +(rows.length?'<div class="sv31-scroll"><table><thead><tr><th>科目</th><th style="text-align:right">当前排名</th><th style="text-align:right">进步速度</th><th style="text-align:right">比六科典型</th><th>一句话点评</th></tr></thead><tbody>'+rowHtml+"</tbody></table></div>"
      +'<div class="sv31-g2" style="margin-top:16px">'
      +"<div><b style=\"font-size:13px\">六科定位图 <span style=\"color:var(--muted);font-weight:600\">(上下=排名好坏 · 左右=进步快慢 · 点圆点看详情)</span></b>"
      +'<div class="sv31-chart" id="sv31Quad">'+quadSvgV32(quadPts,ov)+"</div>"
      +'<div class="sv31-detail" id="sv31QuadDetail">点击任意科目圆点,这里会显示它的数据。</div></div>'
      +"<div>"+(catchHtml?'<b style="font-size:13px">还差多远 <span style="color:var(--muted);font-weight:600">(先收窄到常见水平)</span></b><div style="margin-top:8px">'+catchHtml+"</div>":"")+"</div></div>"
      :'<p class="card-sub">排名类结构分析需要每科的「名次 ÷ 人数」。当前考试都只有分数,所以这里是空的——其余模块已自动切换到分数口径。</p>')
    +"</div>";
}
/* ---------- ⑤ 个人最佳殿堂 ---------- */
function hallHtmlV32(f,mode){
  var rows=[],fallback=false;
  function push(name,vals,bestTxt,at,gapTxt,pill){rows.push({name:name,vals:vals,bestTxt:bestTxt,at:at,gapTxt:gapTxt,pill:pill});}
  if(f.totalSeries.length>=1){
    var best=Math.min.apply(null,f.totalSeries.map(function(x){return x.pos;}));
    var lastP=f.totalSeries[f.totalSeries.length-1].pos,gap=r32(lastP-best);
    var bestEntry=f.totalSeries.filter(function(x){return x.pos===best;})[0];
    var st=gap<=1?"ok":"acc";
    if(gap>5){
      var ncT=0;for(var kT=f.totalSeries.length-1;kT>0;kT--){if(f.totalSeries[kT].pos-best>5)ncT++;else break;}
      if(ncT>=2)st="warn";
    }
    push("总分",f.totalSeries.map(function(x){return 100-x.pos;}),fmtPos32(best),f.exams[bestEntry.i].name,
      gap<=0.05?"0":r32(Math.abs(gap))+"个百分点",
      '<span class="pill '+(st==="ok"?"ok":(st==="warn"?"warn":"acc"))+'" title="依据:距个人最佳 '+r32(Math.abs(gap))+' 个百分点">'+pbLabelV32(st,gap)+"</span>");
  }else if(f.scoreSeries&&f.scoreSeries.length>=1){
    var bS=f.scoreSeries[0];f.scoreSeries.forEach(function(x){if(x.score>bS.score)bS=x;});
    fallback=true;
    push("总分",f.scoreSeries.map(function(x){return x.score;}),Math.round(bS.score)+"分",f.exams[bS.i].name,"—",
      '<span class="pill flat">分数参考</span>');
  }
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    if(vp.length){
      var p=f.pb[s],lastP=vp[vp.length-1].pos;
      var cls=p.st==="ok"?"ok":(p.st==="warn"?"warn":"acc");
      push(s,vp.map(function(x){return 100-x.pos;}),fmtPos32(p.pos),f.exams[p.i].name,
        p.gap<=0.05?"0":r32(Math.abs(p.gap))+"个百分点",
        '<span class="pill '+cls+'" title="依据:距个人最佳 '+r32(Math.abs(p.gap))+' 个百分点">'+pbLabelV32(p.st,p.gap)+"</span>");
    }else{
      var rr=f.series[s].filter(function(x){return x.rate!==null;});
      if(rr.length>=2){
        fallback=true;
        var b=rr[0];rr.forEach(function(x){if(x.rate>b.rate)b=x;});
        push(s,rr.map(function(x){return x.rate;}),Math.round(b.rate)+"%",f.exams[b.i].name,"—",
          '<span class="pill flat">仅同卷可比</span>');
      }
    }
  });
  if(!rows.length)return "";
  var body=rows.map(function(r){
    return "<tr><td>"+esc32(r.name)+"</td><td>"+sparkSvg32(r.vals)+"</td>"
      +'<td class="num" style="font-weight:800">'+r.bestTxt+"</td>"
      +'<td style="color:var(--muted)">'+esc32(shortName32(r.at))+"</td>"
      +'<td class="num">'+r.gapTxt+"</td>"
      +"<td>"+r.pill+"</td></tr>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">⑤ 个人最佳殿堂</h3>'
    +'<p class="card-sub">每科历史上最好的一次 · 现在离它还有多远'
    +(fallback?' · <b>标「分数参考」的行没有名次数据,走势只在同卷内可比</b>':"")+"</p></div>"
    +lockTagV32(mode)+"</div>"
    +'<div class="sv31-scroll"><table><thead><tr><th>科目</th><th>历次小走势</th><th style="text-align:right">历史最好</th><th>考到于</th><th style="text-align:right">现在差</th><th>状态</th></tr></thead><tbody>'
    +body+"</tbody></table></div></div>";
}
/* ---------- ⑥ 目标校准 ---------- */
function calibHtmlV32(f,mode){
  var rows=[];
  f.subjects.forEach(function(s){
    var t=f.tgt[s];if(!t||!t.mets.length)return;
    var last=null;
    f.series[s].forEach(function(x){if(x.target!==null&&x.actual!==null)last=x;});
    if(!last)return;
    var vp=f.valid[s],base=vp.length?median32(vp.slice(-3).map(function(x){return x.pos;})):null;
    var sug,cls="flat",label="维持";
    if(t.notMet>=3&&base!==null){sug=clamp32(r32(base-10),5,80);cls="bad";label="下调至前"+sug+"%";}
    else if(t.met>=3){var b=f.pb[s]?f.pb[s].pos:base;sug=clamp32(r32(b-4),5,80);cls="ok";label="上调至前"+sug+"%";}
    else{sug=base!==null?r32(base):null;label=sug!==null?"维持前"+sug+"%":"—";}
    /* 历史类比:找一次排名接近建议线的真实场次 */
    var ref="—";
    if(sug!==null){
      var best=null;
      vp.forEach(function(x){var d=Math.abs(x.pos-sug);if(best===null||d<best.d)best={d:d,x:x};});
      if(best&&best.d<=6)ref=esc32(shortName32(f.exams[best.x.i].name))+"(前"+r32(best.x.pos)+"%≈"+Math.round(best.x.actual)+"分)";
    }
    var streak=t.notMet>=2?'<span class="pill bad">未达×'+t.notMet+"</span>":t.met>=2?'<span class="pill ok">达成×'+t.met+"</span>":'<span class="pill flat">刚起步</span>';
    rows.push({s:s,tg:last.target,ac:last.actual,streak:streak,label:label,cls:cls,ref:ref});
  });
  if(!rows.length)return "";
  var body=rows.map(function(r){
    return "<tr><td>"+esc32(r.s)+"</td><td class=\"num\">"+(r.tg===null?"—":Math.round(r.tg))+" / "+(r.ac===null?"—":Math.round(r.ac))+"</td>"
      +"<td>"+r.streak+'</td><td><span class="pill '+r.cls+'">'+r.label+'</span></td><td style="color:var(--muted)">'+r.ref+"</td></tr>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">⑥ 目标校准</h3>'
    +'<p class="card-sub">建议以排名为准;参照分数来自你真正考过的场次</p></div>'
    +lockTagV32(mode)+"</div>"
    +'<div class="sv31-scroll"><table><thead><tr><th>科目</th><th style="text-align:right">目标/实际</th><th>最近战绩</th><th>下次建议</th><th>参照(你考过的场次)</th></tr></thead><tbody>'
    +body+"</tbody></table></div></div>";
}

/* ---------- ⑦ 名次竞争力 ---------- */
function compHtmlV32(f,mode){
  var ts=f.totalSeries;
  if(ts.length<2)return "";
  var labels=ts.map(function(x){return shortName32(x.name);});
  var lines=[{vals:ts.map(function(x){return 100-x.pos;}),color:"var(--accent,#5d72e8)"}];
  var hasCls=ts.some(function(x){return x.cls!==null;});
  if(hasCls){
    var yl=null;
    lines.push({vals:ts.map(function(x){return x.cls===null?null:100-x.cls;}),color:"var(--green,#32a77a)",dash:true});
  }
  var chart=lineSvgV32(lines,labels,{tickLabel:function(v){return "前"+clamp32(Math.round(100-v),0,99)+"%";}});
  var lastCls=null;for(var i=ts.length-1;i>=0;i--){if(ts[i].cls!==null){lastCls=ts[i].cls;break;}}
  var diffStat="",diffCard="";
  if(lastCls!==null&&f.overallLatest!==null){
    var d=r32(f.overallLatest-lastCls),dAbs=Math.abs(d);
    diffStat='<span style="margin-left:auto;font-weight:700;color:var(--text,#18212f)">班里比年级'+(d>=0?"靠前":"靠后")+" "+dAbs+" 个百分点</span>";
    diffCard=d>2?'<div class="sv31-insight i-info"><div class="ico">'+ICON32.shield+"</div><div><b>你的主要对手在外班</b><p>班里的名次一直比全年级更靠前——班内你已是头部,真正拉开差距的是外班同学。</p></div></div>"
      :(d<-2?'<div class="sv31-insight i-warn"><div class="ico">'+ICON32.shield+'</div><div><b>班内竞争更激烈</b><p>全年级里你的位置比班里更靠前——同班同学整体更强。先把班内名次提上来,年级位次自然会跟着走。</p></div></div>'
      :'<div class="sv31-insight i-info"><div class="ico">'+ICON32.search+'</div><div><b>班里家外基本同步</b><p>班级与年级的相对位置接近,说明班级整体水平与年级差距不大。</p></div></div>');
  }
  /* 哪科最能打:基准=各科最新位比的中位数(总分会被强科拉偏,内部结构更公平) */
  var curs=[];
  f.subjects.forEach(function(s){var vp=f.valid[s];if(vp.length>=3)curs.push(vp[vp.length-1].pos);});
  var medAll=curs.length>=3?median32(curs):null;
  var chips=[];
  f.subjects.forEach(function(s){
    var vp=f.valid[s];if(vp.length<3)return; /* 与 ⑨「不足 3 次不给趋势判断」一致 */
    var cur=vp[vp.length-1].pos;
    var adv=medAll===null?(f.overallLatest===null?null:r32(f.overallLatest-cur)):r32(medAll-cur);
    chips.push({s:s,adv:adv});
  });
  chips.sort(function(a,b){return (b.adv===null?-999:b.adv)-(a.adv===null?-999:a.adv);});
  var chipHtml=chips.map(function(c,idx){
    var v=c.adv===null?0:c.adv;
    var cls=v>=8?"acc":(v<=-8?"bad":(idx===0?"ok":"flat"));
    var txt=c.adv===null?"数据不足":(v>=2?"最能打(+"+v+")":(v<=-8?"最大短板("+v+")":(v<=-2?"慢"+Math.abs(v):"与典型相当")));
    return '<span class="pill '+cls+'" style="font-size:11px;padding:6px 10px">'+esc32(c.s)+" "+txt+"</span>";
  }).join("");
  return '<div class="card"><div class="card-title-row"><div><h3 class="card-title">⑦ 名次竞争力</h3>'
    +'<p class="card-sub">你在班里和全年级各排多少 · 哪科最能打</p></div>'
    +lockTagV32(mode)+"</div>"
    +'<div class="sv31-g2"><div>'
    +'<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--accent,#5d72e8)"></i>年级排名</span>'
    +(hasCls?'<span><i style="background:var(--green,#32a77a)"></i>班级排名</span>':"")+diffStat+"</div>"
    +'<div class="sv31-chart" id="sv31Scissor">'+chart+"</div>"+diffCard+"</div>"
    +"<div><b style=\"font-size:13px\">哪科最能打? <span style=\"color:var(--muted);font-weight:600\">(比你的六科典型水平)</span></b>"
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+chipHtml+"</div></div></div></div>";
}
/* ---------- ⑧ 热力矩阵 + 分布带 + 个人纪录 ---------- */
function matrixSectionHtmlV32(f,mode){
  var rgb=accentRgbV32();
  var subs=f.subjects.filter(function(s){
    return f.series[s]&&f.series[s].some(function(x){return mode==="rank"?x.pos!==null:x.rate!==null;});
  });
  var rowsHtml="";
  f.exams.forEach(function(e,i){
    var cells=subs.map(function(s){
      var key=i+"|"+s,fl=f.flags[key];
      var dot=fl?'<span class="sv31-dot" style="background:'+(fl.lvl===2?"#d95c5c":fl.lvl===1?"#e59b45":"#32a77a")+'"></span>':"";
      if(mode==="rank"){
        var p=posYearOf32(e,rowV32(e,s));
        if(p===null)return "<td>—</td>";
        return '<td style="background:'+rgba32(rgb,clamp32(0.82-(p-8)/46*0.62,0.14,0.85))+';color:#fff">'+r32(p)+dot+"</td>";
      }else{
        var rt=rateOf32(rowV32(e,s));
        if(rt===null)return "<td>—</td>";
        var hl=fl&&fl.lvl>0?"background:#fdf3e4;":"";
        return '<td style="'+hl+'border-radius:6px">'+Math.round(rt)+"%"+dot+"</td>";
      }
    }).join("");
    var tp=totalPosYear32(e);
    var totCell=tp===null?"<td class='sv31-tot'>—</td>"
      :mode==="rank"?'<td class="sv31-tot" style="background:'+rgba32(rgb,clamp32(0.82-(tp-8)/46*0.62,0.14,0.85))+';color:#fff">'+r32(tp)+"</td>"
      :'<td class="sv31-tot"><b>'+(examRateV32(e)===null?"—":Math.round(examRateV32(e))+"%")+"</b></td>";
    rowsHtml+="<tr><td>"+esc32(shortName32(e.name))+"</td>"+cells+totCell+"</tr>";
  });
  var head="<tr><th>考试</th>"+subs.map(function(s){return "<th>"+esc32(s)+"</th>";}).join("")+"<th>总分</th></tr>";
  /* 分布带 */
  var bands=[{l:"前10%内",a:0,b:10,c:"rgba(93,114,232,.9)"},{l:"前10–20%",a:10,b:20,c:"rgba(93,114,232,.7)"},
    {l:"前20–30%",a:20,b:30,c:"rgba(93,114,232,.5)"},{l:"前30–50%",a:30,b:50,c:"rgba(93,114,232,.32)"},
    {l:"50%之后",a:50,b:101,c:"rgba(93,114,232,.16)"}];
  var donutData=[];
  bands.forEach(function(b){
    var cnt=f.totalSeries.filter(function(x){return x.pos>b.a&&x.pos<=b.b;}).length;
    if(cnt>0)donutData.push({l:b.l,v:cnt,c:b.c});
  });
  var dom="";
  if(donutData.length){
    var most=donutData.slice().sort(function(a,b){return b.v-a.v;})[0];
    dom='<b style="font-size:13px">你的总分常落在哪个区间 <span style="color:var(--muted);font-weight:600">(共'+f.totalSeries.length+'次出分)</span></b>'
      +'<div class="sv31-g2" style="margin-top:8px;align-items:center"><div class="sv31-chart">'+donutSvgV32(donutData,f.totalSeries.length,"出分落档")+"</div>"
      +'<div><div class="sv31-ext"><div class="t">最常见的水平</div><div class="v">'+esc32(most.l)+"</div>"
      +'<div class="s">'+f.totalSeries.length+"次里有"+most.v+"次在这个区间</div></div></div></div>";
  }
  /* 个人纪录 */
  var recs=[];
  var diffs=[];for(var j=1;j<f.totalSeries.length;j++)diffs.push(f.totalSeries[j].pos-f.totalSeries[j-1].pos);
  var bestRun=0,bestSum=0,run=0,sum=0;
  diffs.forEach(function(d){if(d<0){run++;sum+=d;}else{run=0;sum=0;}if(run>bestRun||(run===bestRun&&sum<bestSum)){bestRun=run;bestSum=sum;}});
  if(bestRun>=2&&bestSum<=-3)recs.push({t:"连续进步",v:bestRun+" 场 · 累计前进"+r32(Math.abs(bestSum))+"个百分点",s:"总分排名一段时间内没回过头的连续段"});
  var jump=null;
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    for(var k=1;k<vp.length;k++){
      var imp=vp[k-1].pos-vp[k].pos,namesN=vp[k].N?imp*vp[k].N/100:null;
      if(!jump||imp>jump.imp)jump={s:s,imp:imp,names:namesN,from:vp[k-1],to:vp[k]};
    }
  });
  if(jump&&jump.imp>2)recs.push({t:"单场最大进步",v:esc32(jump.s)+" · "+(jump.names!=null?"约"+Math.round(jump.names)+"名":"前"+jump.imp+"个百分点"),
    s:shortName32(f.exams[jump.from.i].name)+" → "+shortName32(f.exams[jump.to.i].name)});
  var hi=null;
  f.subjects.forEach(function(s){f.series[s].forEach(function(x){
    if(x.actual!==null&&x.max!==null&&(!hi||x.actual>hi.a))hi={s:s,a:x.actual,m:x.max,x:x};});});
  if(hi)recs.push({t:"单科最高分",v:esc32(hi.s)+" "+Math.round(hi.a)+"/"+Math.round(hi.m),
    s:shortName32(f.exams[hi.x.i].name)+" · 仅该卷内可比"});
  var drop=null;
  f.subjects.forEach(function(s){
    var vp=f.valid[s];
    for(var k=1;k<vp.length;k++){
      var dp2=vp[k].pos-vp[k-1].pos;
      if(!drop||dp2>drop.d)drop={d:dp2,s:s,to:vp[k],N:vp[k].N};
    }
  });
  if(drop&&drop.d>2)recs.push({t:"单场最大退步",v:esc32(drop.s)+" · 后退"+(drop.N?Math.round(drop.d*drop.N/100)+"名":r32(drop.d)+"个百分点"),
    s:shortName32(f.exams[drop.to.i].name)+(f.flags[drop.to.i+"|"+drop.s]&&f.flags[drop.to.i+"|"+drop.s].lvl>0?" · 那场这科偏难":"")});
  var extHtml=recs.map(function(r){
    return '<div class="sv31-ext"><div class="t">'+r.t+'</div><div class="v">'+r.v+'</div><div class="s">'+r.s+"</div></div>";
  }).join("");
  return '<div class="card"><div class="card-title-row">'
    +'<div><h3 class="card-title">⑧ 全量统计矩阵</h3><p class="card-sub" id="sv31HeatSub">'
    +(mode==="rank"?"数字越小、颜色越深 = 名次越好":"得分率仅在同一张卷子内可比;圆点 = 这科这次偏难/偏易")
    +'</p></div><div class="legend"><span><span class="sv31-dot" style="background:#d95c5c"></span>这科这次偏难</span>'
    +'<span><span class="sv31-dot" style="background:#e59b45"></span>偏难(关注)</span>'
    +'<span><span class="sv31-dot" style="background:#32a77a"></span>偏易</span></div></div>'
    +(rowsHtml?'<div class="sv31-scroll"><table class="sv31-heat"><thead>'+head+"</thead><tbody>"+rowsHtml+"</tbody></table></div>"
      +'<p class="card-sub" style="margin-top:8px">圆点由「分-位弹性」模型推断,详见页底方法论。</p>':'<p class="card-sub">还没有可展示的成绩。</p>')
    +(dom?'<div style="margin-top:18px">'+dom+"</div>":"")
    +(extHtml?'<div style="margin-top:18px"><b style="font-size:13px">个人纪录 <span style="color:var(--muted);font-weight:600">(分数项只和自己那张卷子比)</span></b>'
      +'<div class="sv31-ext-grid" style="margin-top:8px">'+extHtml+"</div></div>":"")
    +"</div>";
}
/* ---------- ⑨ 数据质量 + 方法论 ---------- */
var METHOD_MATH_V32='<div class="formula">'
  +'排名位置:<span class="mth"><i>p</i><sub>i</sub> = <span class="frac"><span class="num"><i>r</i><sub>i</sub></span><span class="den"><i>N</i><sub>i</sub></span></span> × 100</span>(第 r<sub>i</sub> 名 / 共 N<sub>i</sub> 人,记作「前 p<sub>i</sub>%」)<br>'
  +'进步速度:<span class="mth"><i>v</i> = med<sub>j</sub>(<i>p</i><sub>j</sub> − <i>p</i><sub>j+1</sub>)</span>,正为前进;折算名次 = <span class="mth"><i>v</i>·N/100</span><br>'
  +'局部弹性:<span class="mth"><i>k</i> = med<sub>j</sub> <span class="frac"><span class="num">Δrate<sub>j</sub></span><span class="den">−Δ<i>p</i><sub>j</sub></span></span></span><br>'
  +'难度残差:<span class="mth"><i>e</i><sub>i</sub> = rate<sub>i</sub> − (rate<sub>i−1</sub> + <i>k</i>·(<i>p</i><sub>i−1</sub> − <i>p</i><sub>i</sub>))</span><br>'
  +'判定:<span class="mth"><i>e</i><sub>i</sub> ≤ −θ<sub>s</sub></span> → 偏难;<span class="mth"><i>e</i><sub>i</sub> ≥ +θ<sub>s</sub></span> → 偏易;阈值按科自适应 <span class="mth">θ<sub>s</sub> = max( 2√(1600/N̄<sub>s</sub>)+1 , 1.2 × 1.4826 × MAD )</span>,前项夹在 [3,14] —— 参考人数 N̄ 越少,单场位比噪声越大,门槛自动放宽</div>';
function qualityHtmlV32(f){
  var q=f.quality,items=[];
  q.pending.forEach(function(e){items.push("<li>有 1 场还没录成绩:"+esc32(shortName32(e.name))+' <a href="javascript:void(0)" data-sv31-edit="'+esc32(e.id||"")+'" data-date="'+esc32(e.exam_date||"")+'" data-name="'+esc32(e.name||"")+'">去补录</a></li>');});
  if(q.missCls.length)items.push("<li>"+q.missCls.length+" 次考试没填班级排名:班级对比会自动跳过它们</li>");
  if(q.zeroRankSubs.length)items.push("<li>"+esc32(q.zeroRankSubs.join("、"))+" 还没录过排名:排名类分析暂缺这一科</li>");
  if(q.smallSubs.length)items.push("<li>数据太少不下结论:"+esc32(q.smallSubs.join("、"))+"不足 3 次成绩,不给趋势判断</li>");
  if(q.smallCohort.length)items.push("<li>"+q.smallCohort.length+" 次考试参考人数很少(30人以内):相关说法自动更保守</li>");
  if(q.cohortChange>0)items.push("<li>"+q.cohortChange+" 处相邻考试的参考人数变化≥30%:跨场名次跳变可能由范围变化引起,相关结论已自动谨慎处理</li>");
  return '<div class="card sv31-quality"><div class="card-title-row"><div><h3 class="card-title">⑨ 数据质量说明</h3>'
    +'<p class="card-sub">缺什么、弱在哪,明明白白告诉你</p></div></div>'
    +(items.length?'<ul style="margin:0;padding-left:18px">'+items.join("")+"</ul>":'<p class="card-sub">当前范围内没有发现缺口,数据很完整。</p>')
    +'<details class="sv31-method"><summary>这些结论是怎么算出来的?(方法论与局限声明)</summary><div class="m-body">'
    +'<b>名词对照</b>:「排名」指名次÷参考人数(第57名/310人=前18%,专业术语叫位比);「个百分点」即 pp。<br>'
    +'<b>口径纪律</b>:跨考试比较一律使用排名位置;分数与得分率只在同一张卷子内使用。手动填写过总分时以手动值为准;不计总分的科目不参与总分口径。<br>'
    +'<b>序数性声明</b>:排名位置是序数指标,前10%区每1个百分点的难度大于中段,规则阈值按分段收紧。<br>'
    +'<b>科目级难度信号(分-位弹性)</b>:排名对卷面难度天然免疫,分数不是。对每科用自身历史拟合「排名变化 ↔ 得分率变化」的局部弹性,某场得分率显著低于其排名所隐含的水平 → 该科本场偏难信号;显著高于 → 偏易。需≥2组有效相邻场次;门槛随历史波动自适应。'
    +METHOD_MATH_V32
    +'<b>局限声明</b>:① 难度信号是推断,也可能是临场失误,仅用于解读,不改变排名结论;② 无法区分「卷易」与「你该科突然开窍」;③ 无他人分数,分布类结论仅基于你自己的等位线。<br>'
    +'<b>样本门槛</b>:进步速度与稳定性≥3场;离群检测≥5场,不足时降级措辞。</div></details></div>';
}
/* ---------- 页面装配 ---------- */
function statsPageV32(f){
  var scope=(typeof state!=="undefined"&&state.sv31)||{};
  var mode=scope.mode||"rank";
  var head='<div class="page-head"><div><h2>统计分析</h2><p>'+f.exams.length+" 次考试 · "+Math.max(f.scoredExams,f.totalSeries.length,f.rateCount)+" 场可分析</p></div>"
    +'<span class="sv31-tag">本地实时计算 · 数据不出你的设备</span></div>';
  if(f.scoredExams<1){
    return '<div class="sv31-page">'+head+controlsHtmlV32(f)
      +'<div class="card"><div class="card-title-row"><div><h3 class="card-title">先从一次考试开始</h3></div></div>'
      +'<p class="card-sub">这里会用排名帮你回答三个问题:我在进步吗?强弱科在哪?目标定得合理吗?现在还没有已出分的考试——去「考试记录」录入第一场吧。</p></div>'
      +qualityHtmlV32(f)+"</div>";
  }
  var ins=buildInsightsV32(f);
  return '<div class="sv31-page">'+head+controlsHtmlV32(f)
    +kpiHtmlV32(f,mode)
    +insightsHtmlV32(ins)
    +trendHtmlV32(f,mode)
    +structureHtmlV32(f,mode)
    +hallHtmlV32(f,mode)
    +calibHtmlV32(f,mode)
    +compHtmlV32(f,mode)
    +matrixSectionHtmlV32(f,mode)
    +qualityHtmlV32(f)
    +'</div>';
}

/* ================= 样式(全部走语义变量 + 夜色主题覆盖) ================= */
function injectStylesV32(){
  if(document.getElementById("app-v32-style"))return;
  var css=[
    ".sv31-page .card{padding:20px 22px;margin-bottom:16px}",
    "@media(max-width:620px){.sv31-page .card{padding:15px 14px;margin-bottom:12px}}",
    ".sv31-chart{margin-top:10px}",
    ".sv31-page table{width:100%;border-collapse:collapse;font-size:12px}",
    ".sv31-page th{text-align:center;font-size:10.5px;color:var(--muted,#788392);font-weight:700;border-bottom:1.5px solid var(--line,#e8ebf0);padding:7px 8px;white-space:nowrap}",
    ".sv31-page th:first-child{text-align:left}",
    ".sv31-page td{padding:9px 8px;border-bottom:1px solid var(--line,#e8ebf0);text-align:center;font-weight:700;font-variant-numeric:tabular-nums}",
    ".sv31-page tr:last-child td{border-bottom:0}",
    ".sv31-page td:first-child{text-align:left;font-weight:600}",
    ".sv31-page td.num{text-align:right}",
    ".sv31-tot{outline:2px solid var(--accent-soft,#eef1ff);outline-offset:-2px;border-radius:6px}",
    ".sv31-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}",
    ".sv31-scroll-x{overflow-x:auto;max-width:100%;scrollbar-width:none}.sv31-scroll-x::-webkit-scrollbar{display:none}",
    ".sv31-seg{display:flex;background:var(--panel-solid,#fff);border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:4px;gap:4px;margin-left:auto;flex:none}",
    ".sv31-seg button{border:0;background:transparent;color:var(--muted,#788392);padding:8px 14px;border-radius:9px;font-size:12.5px;cursor:pointer;font-family:inherit;font-weight:600}",
    ".sv31-seg button.active{background:var(--accent,#5d72e8);color:#fff}",
    ".sv31-warn{display:none;background:#fdf3e4;border:1px solid #f2ddb8;color:#7a5a20;font-size:12.5px;line-height:1.6;border-radius:13px;padding:11px 14px;margin-bottom:16px}",
    "html[data-theme='night'] .sv31-warn{background:rgba(229,155,69,.12);border-color:rgba(229,155,69,.35);color:#e8c07d}",
    "body.mode-score .sv31-warn,.sv31-page.mode-score .sv31-warn{display:block}",
    ".sv31-modenote{font-size:12px;line-height:1.5;color:var(--muted,#788392);margin:-4px 0 14px}",
    ".sv31-kpi{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(min-width:760px){.sv31-kpi{grid-template-columns:repeat(3,1fr)}}",
    ".sv31-stat{padding:15px;border:1px solid var(--line,#e8ebf0);border-radius:15px;background:var(--panel-solid,#fff)}",
    ".sv31-stat .lb{font-size:11.5px;color:var(--muted,#788392);font-weight:600}",
    ".sv31-stat .v{font-size:26px;font-weight:800;margin:7px 0 4px;font-variant-numeric:tabular-nums}.sv31-stat .v small{font-size:13px;color:var(--muted,#788392);font-weight:600}",
    ".sv31-stat .d{font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px;display:inline-block}",
    ".sv31-stat .d.up{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}.sv31-stat .d.down{background:rgba(217,92,92,.12);color:var(--danger,#d95c5c)}",
    ".sv31-stat .d.flat{background:var(--chip-bg,#f1f3f8);color:var(--muted,#788392)}.sv31-stat .d.info,.sv31-stat .d.warn{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}",
    ".sv31-insight{display:flex;gap:12px;border:1px solid var(--line,#e8ebf0);border-left-width:4px;border-radius:14px;padding:13px 15px;background:var(--panel-solid,#fff);margin-bottom:10px;flex-wrap:wrap}",
    ".sv31-insight .ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}",
    ".sv31-insight .ico svg{width:17px;height:17px;stroke-width:2;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}",
    ".sv31-insight b{font-size:13.5px}.sv31-insight p{margin:4px 0 0;font-size:12.5px;color:var(--muted,#667085);line-height:1.7;width:100%}",
    ".sv31-insight .ev{cursor:pointer;font-size:10.5px;color:var(--muted,#98a1ae);background:var(--chip-bg,#f4f6fa);border-radius:7px;padding:2px 7px}",
    ".sv31-insight .ev:hover{color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff)}",
    ".sv31-evbody{width:100%;font-size:11px;color:var(--muted,#788392);background:var(--chip-bg,#f4f6fa);border-radius:8px;padding:7px 10px;line-height:1.7;margin-top:9px}",
    ".i-mile{border-left-color:var(--green,#32a77a)}.i-mile .ico{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}",
    ".i-up{border-left-color:var(--accent,#5d72e8)}.i-up .ico{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}",
    ".i-warn{border-left-color:#e59b45}.i-warn .ico{background:#fdf3e4;color:#a06a1c}",
    ".i-risk{border-left-color:var(--danger,#d95c5c)}.i-risk .ico{background:rgba(217,92,92,.12);color:var(--danger,#d95c5c)}",
    ".i-info{border-left-color:#8b9af0}.i-info .ico{background:var(--accent-soft,#eef1ff);color:#5b6bd5}",
    "html[data-theme='night'] .i-warn .ico{background:rgba(229,155,69,.16);color:#e8c07d}",
    "html[data-theme='night'] .i-risk .ico{background:rgba(217,92,92,.18);color:#f0a3a3}",
    ".sv31-pane{display:none}.sv31-pane.on{display:block}",
    ".sv31-tabs{margin-left:0}",
    ".sv31-scroll{overflow-x:auto}.sv31-scroll table{min-width:430px}",
    ".sv31-page .pill{display:inline-block;font-size:10px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap}",
    ".sv31-page .pill.ok{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}",
    ".sv31-page .pill.acc{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8)}",
    ".sv31-page .pill.warn{background:#fdf3e4;color:#a06a1c}.sv31-page .pill.bad{background:rgba(217,92,92,.12);color:var(--danger,#d95c5c)}",
    ".sv31-page .pill.flat{background:var(--chip-bg,#f1f3f8);color:var(--muted,#788392)}",
    "html[data-theme='night'] .sv31-page .pill.warn{background:rgba(229,155,69,.14);color:#e8c07d}",
    "html[data-theme='night'] .sv31-page .pill.bad{background:rgba(217,92,92,.18);color:#f0a3a3}",
    ".sv31-catch{margin-bottom:13px}.sv31-catch .h{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:5px;flex-wrap:wrap}",
    ".sv31-catch .h .dim{color:var(--muted,#98a1ae)}.sv31-catch .track{height:9px;background:var(--chip-bg,#eef0f5);border-radius:5px;overflow:hidden}",
    ".sv31-catch .fill{height:100%;border-radius:5px;background:var(--accent,#5d72e8)}.sv31-catch .sub{font-size:10.5px;color:var(--muted,#98a1ae);margin-top:4px}",
    ".sv31-detail{margin-top:9px;font-size:12px;color:var(--muted,#667085);background:var(--chip-bg,#fbfcfe);border:1px dashed var(--line,#cfd6e4);border-radius:11px;padding:8px 12px}",
    ".sv31-qpt:hover circle[stroke]{stroke-width:4}",
    ".sv31-tag{font-size:11px;font-weight:800;color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);border-radius:999px;padding:5px 10px;white-space:nowrap}",
    ".sv31-g2{display:grid;grid-template-columns:1fr;gap:16px}@media(min-width:900px){.sv31-g2{grid-template-columns:1fr 1fr}}",
    ".sv31-ext-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}@media(min-width:760px){.sv31-ext-grid{grid-template-columns:repeat(4,1fr)}}",
    ".sv31-ext{border:1px solid var(--line,#e8ebf0);border-radius:14px;padding:13px;background:var(--panel-solid,#fff)}",
    ".sv31-ext .t{font-size:10.5px;color:var(--muted,#788392);font-weight:700}.sv31-ext .v{font-size:15.5px;font-weight:800;margin-top:5px}.sv31-ext .s{font-size:10.5px;color:var(--muted,#98a1ae);margin-top:3px;line-height:1.5}",
    ".sv31-dot{display:inline-block;width:7px;height:7px;border-radius:50%;vertical-align:2px;margin-left:3px}",
    ".sv31-quality ul li{font-size:12.5px;color:var(--muted,#4d5868);line-height:1.9;margin-bottom:4px}",
    ".sv31-quality a{color:var(--accent,#5d72e8);font-weight:700;text-decoration:none}",
    ".sv31-method{border:1px dashed var(--line,#cfd6e4);border-radius:13px;padding:12px 15px;background:var(--chip-bg,#fbfcfe);margin-top:14px}",
    ".sv31-method summary{cursor:pointer;font-size:12.5px;font-weight:800;color:var(--accent,#5d72e8)}",
    ".sv31-method .m-body{font-size:12px;color:var(--muted,#4d5868);line-height:1.85;margin-top:9px}",
    ".sv31-method b{color:var(--text,#18212f)}",
    ".sv31-method .formula{background:var(--cell,#f1f3f9);border-radius:8px;padding:10px 13px;font-size:12px;margin:7px 0;line-height:2.1}",
    ".formula .mth{font-family:Georgia,'Times New Roman',serif;white-space:nowrap}",
    ".formula i{font-family:Georgia,'Times New Roman',serif;font-style:italic}.formula sub{font-size:.7em}",
    ".formula .frac{display:inline-block;vertical-align:middle;text-align:center;margin:0 3px}",
    ".formula .frac .num{display:block;border-bottom:1px solid currentColor;padding:0 5px}.formula .frac .den{display:block;padding:0 5px}"
  ].join("\n");
  var st=document.createElement("style");
  st.id="app-v32-style";st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 路由与导航接线 ================= */
function routeStatsV32(){
  try{window.__stTrack&&window.__stTrack("stats_open",{});}catch(e){}
  var cfg=(typeof state!=="undefined"&&state.sv31)||(state.sv31={scope:"__all__",mode:"rank"});
  var exams=scopeFilterV32(visibleExamsV32(cfg.includeHidden),cfg.scope);
  var f=buildFeaturesV32(exams);
  /* 数据形态自适应:没有任何位比时,默认落在分数模式(用户手动切换后记忆选择) */
  if(!cfg.modeChosen&&f.posCount===0&&f.rateCount>0)cfg.mode="score";
  try{document.body.classList.toggle("mode-score",cfg.mode==="score");}catch(e){}
  var c=document.getElementById("content");if(!c)return;
  var sy=window.pageYOffset||0;
  c.innerHTML=statsPageV32(f);
  try{bindStatsV32(f,c.firstElementChild);}catch(e){}
  window.scrollTo(0,sy);
}
function rerenderStatsV32(){
  if(typeof state!=="undefined"&&state.page==="stats")routeStatsV32();
}
function bindStatsV32(f,root){
  root.addEventListener("click",function(e){
    var t=e.target;
    var sc=t.closest("[data-sv31-scope]");
    if(sc){state.sv31.scope=sc.getAttribute("data-sv31-scope");rerenderStatsV32();return;}
    var md=t.closest("#sv31Mode button,[data-sv31-tab]");
    if(md){
      var m=md.getAttribute("data-mode")||md.getAttribute("data-sv31-tab");
      state.sv31.mode=m;
      state.sv31.modeChosen=true;
      document.body.classList.toggle("mode-score",m==="score");
      rerenderStatsV32();return;
    }
    var ev=t.closest("[data-sv31-ev]");
    if(ev){
      var icard=ev.closest(".sv31-insight"),ibody=icard&&icard.querySelector(".sv31-evbody");
      if(ibody){ibody.hidden=!ibody.hidden;ev.textContent=ibody.hidden?"查看依据":"收起";}
      return;
    }
    var pt=t.closest(".sv31-qpt");
    if(pt){
      var d=pt.dataset,detail=document.getElementById("sv31QuadDetail");
      if(detail)detail.textContent=d.n+" · 当前年级前"+d.pos+"% · "+(Number(d.sp)>=0?"最近4次平均每场前进约":"最近4次平均每场后退约")+Math.abs(Math.round(d.sp))+"名";
      return;
    }
    var ed=t.closest("[data-sv31-edit]");
    if(ed){
      var id=ed.getAttribute("data-sv31-edit"),date=ed.getAttribute("data-date"),name=ed.getAttribute("data-name");
      var exam=allExamsV32().find(function(x){return (id&&x.id===id)||(!id&&x.exam_date===date&&x.name===name);});
      if(exam&&typeof openExam==="function"){closeStatsFallbackV32();openExam(exam);}
      return;
    }
  });
}
function closeStatsFallbackV32(){}
function ensureNavV32(){
  var page=(typeof state!=="undefined"&&state.page)||"home";
  var dn=document.querySelector(".desktop-nav");
  if(dn&&!dn.querySelector('[data-page="stats"]')){
    var acc=dn.querySelector('[data-page="account"]');
    var b=document.createElement("button");
    b.className="nav-btn";b.setAttribute("data-page","stats");b.textContent="统计分析";
    acc?dn.insertBefore(b,acc):dn.appendChild(b);
  }
  var bn=document.querySelector(".bottom-nav");
  if(bn&&!bn.querySelector('[data-page="stats"]')){
    var accB=bn.querySelector('[data-page="account"]');
    var bb=document.createElement("button");
    bb.className="";bb.setAttribute("data-page","stats");
    bb.innerHTML='<span>▦</span><span>分析</span>';
    accB?bn.insertBefore(bb,accB):bn.appendChild(bb);
  }
  document.querySelectorAll('.desktop-nav [data-page],.bottom-nav [data-page]').forEach(function(el){
    el.classList.toggle("active",el.getAttribute("data-page")===page);
  });
}
/* 包装渲染入口:注入导航 + 拦截 stats 页 */
var rpPrevV32=(typeof window.renderPage==="function")?window.renderPage:null;
window.renderPage=function sv32RenderPage(){
  try{ensureNavV32();}catch(e){}
  if(typeof state!=="undefined"&&state.page==="stats"){routeStatsV32();return;}
  if(rpPrevV32)rpPrevV32();
};

/* ================= 启动与测试钩子 ================= */
function bootV32(){try{injectStylesV32();}catch(e){}}
if(typeof document!=="undefined"&&document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bootV32);
}else{bootV32();}
window.__v32={
  n:n32,posYearOf:posYearOf32,posClassOf:posClassOf32,
  totalPosYear:totalPosYear32,totalActual:totalActualV32,totalTarget:totalTargetV32,
  rateOf:rateOf32,subjectList:subjectListV32,configuredSubjects:configuredSubjectsV32,
  visibleExams:visibleExamsV32,scopeFilter:scopeFilterV32,catOptions:catOptionsV32,
  median:median32,mad:mad32,
  buildFeatures:buildFeaturesV32,buildInsights:buildInsightsV32,
  lineSvg:lineSvgV32,quadSvg:quadSvgV32,donut:donutSvgV32,spark:sparkSvg32,
  speedText:speedTextV32,rerender:rerenderStatsV32,
  kpi:kpiHtmlV32,trend:trendHtmlV32,structure:structureHtmlV32,hall:hallHtmlV32,
  calib:calibHtmlV32,comp:compHtmlV32,matrix:matrixSectionHtmlV32,quality:qualityHtmlV32
};
})();
