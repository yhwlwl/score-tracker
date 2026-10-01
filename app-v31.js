/* app-v31.js · v4.1 交互与运营层
   1) 图例换色提示升级：一次性 toast → 手动关闭的提示条；图例旁常驻小灰字
   2) 版本通知由 release-notices.js 管理
   3) 关键行为埋点：换色/主题/导出/更新，复用 track_event 通道 */
(function(){

/* ================= 埋点 ================= */
function appVersionV31(){var m=document.querySelector('meta[name="application-version"]');return (m&&m.getAttribute('content'))||'';}
function currentPageV31(){
  try{
    var act=document.querySelector('[data-page].active');
    if(act&&act.dataset.page)return act.dataset.page;
    if(document.querySelector('.auth-page'))return 'login';
  }catch(e){}
  return 'unknown';
}
/* 委托优先:telemetry-feedback 已提供富上下文追踪器(visitor/utm/屏幕等),直接复用;
   仅当其不存在时才用这里的精简兜底。此前本文件直接覆盖 __stTrack,导致埋点上下文变瘦 */
var __stTrackPrevV31=window.__scoreTrackerTrack||window.__stTrack||null;
window.__stTrack=function stTrackV31(eventType,metadata){
  if(__stTrackPrevV31){try{return __stTrackPrevV31(eventType,metadata);}catch(e){}}
  try{
    var API='/api/score-tracker-api';
    var c={
      eventId:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),
      sessionId:sessionStorage.getItem('st_session_id')||'',
      visitorId:localStorage.getItem('st_visitor_id')||'',
      clientTime:new Date().toISOString(),
      pathname:location.pathname,
      appPage:currentPageV31(),
      appVersion:appVersionV31()
    };
    var body=JSON.stringify({action:'track_event',token:localStorage.getItem('st_token')||'',eventType:eventType,context:c,metadata:metadata||{}});
    var f=window.fetch.bind(window);
    f(API,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:body}).catch(function(){});
  }catch(e){}
};

/* ================= 样式 ================= */
function injectStylesV31(){
  if(document.getElementById('app-v31-style'))return;
  var css=[
    '.tip-banner-v31{position:fixed;left:50%;transform:translateX(-50%);top:calc(14px + env(safe-area-inset-top));z-index:95;display:flex;align-items:center;gap:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);border:1px solid var(--line,#e6e9ef);border-radius:16px;padding:12px 14px;box-sizing:border-box;width:min(620px,calc(100vw - 24px));box-shadow:var(--nav-shadow,0 10px 35px rgba(28,39,63,.16));font-size:12.5px;line-height:1.55;animation:v31drop .25s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes v31drop{from{transform:translate(-50%,-14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}',
    '.tip-banner-v31 .t-ico{font-size:16px;flex:none}',
    '.tip-banner-v31 .t-x{flex:none;border:0;background:var(--cell,#f3f4f7);width:26px;height:26px;border-radius:8px;font-size:14px;color:var(--muted,#667085);cursor:pointer;font-family:inherit}',
    '.lg-hint-v31{font-size:10px;color:var(--muted,#98a1ae);opacity:.75;margin-left:2px;white-space:nowrap;pointer-events:none;-webkit-user-select:none;user-select:none}',
    '.stat-rank-v31{font-size:11px;color:var(--muted,#98a1ae);margin-top:3px;font-weight:600;font-variant-numeric:tabular-nums}',
    '.update-bar-v31{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:96;display:flex;align-items:center;gap:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);border:1px solid var(--accent,#5d72e8);border-radius:16px;padding:12px 14px;box-sizing:border-box;width:min(620px,calc(100vw - 24px));box-shadow:var(--nav-shadow,0 10px 35px rgba(28,39,63,.2));font-size:12.5px;line-height:1.55;animation:v31rise .3s cubic-bezier(.2,.8,.25,1)}',
    '.update-bar-v31>span:nth-child(2){min-width:0;flex:1;overflow-wrap:anywhere}',
    '.update-copy-v31{min-width:0;flex:1;line-height:1.55}',
    '.update-copy-v31>b{display:block;font-size:14px;line-height:1.35;margin-bottom:5px}',
    '.update-section-v31{display:block;margin-top:7px}',
    '.update-section-v31>b{display:block;color:var(--accent,#5d72e8);font-size:11.5px;margin-bottom:2px}',
    '.update-items-v31{display:block;line-height:1.55}',
    '#app-version-v17.version-trigger-v31{cursor:pointer;text-decoration:underline;text-underline-offset:3px;transition:color .15s,opacity .15s}',
    '#app-version-v17.version-trigger-v31:hover{color:var(--accent,#5d72e8)}',
    '.update-bar-v31 .u-go{white-space:nowrap;flex:none}',
    '@keyframes v31rise{from{transform:translate(-50%,14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}',
    '.update-bar-v31 .u-x{border:0;background:transparent;color:var(--muted,#98a1ae);font-size:15px;cursor:pointer;padding:2px 4px;font-family:inherit;flex:none}',
    /* 首页趋势图例行:手机端可左右滑动(含惯性滚动),不改布局不加滚动条 */
    '.trend-legend-row-v25{display:flex;gap:8px;overflow-x:auto;padding:0 0 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain;cursor:grab}',
    '.trend-legend-row-v25::-webkit-scrollbar{display:none}',
    '.trend-legend-row-v25 .legend{flex-wrap:nowrap;white-space:nowrap;margin-top:0}',
    '.trend-legend-row-v25 .lg-hint-v31{margin-left:4px}',
    '.overview-legend{display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;padding-bottom:2px}',
    '.overview-legend::-webkit-scrollbar{display:none}',
    '.overview-legend .lg-hint-v31{margin-left:2px;flex:none}',
    /* 手机端:图表容器统一可横滑(与其它视图一致;覆盖 mobile-fix 的 overflow:hidden) */
    '@media(max-width:720px){' +
      '.chart-wrap,.rank-chart-stage-v7,.overview-stage-v5{overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior-x:contain}' +
      '.chart-wrap svg,.rank-chart-stage-v7 svg,.overview-stage-v5 svg{min-width:560px}' +
      '.rank-legend-v7{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding:0 0 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain}' +
      '.rank-legend-v7::-webkit-scrollbar{display:none}' +
      '.rank-legend-v7 .label{margin-left:14px}' +
    '}'
  ].join('\n');
  var st=document.createElement('style');
  st.id='app-v31-style';
  st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 图例旁小灰字 ================= */
function injectLegendHintsV31(){
  var sel='.legend:not(.sv31-nopalette),.overview-legend:not(.sv31-nopalette),.rank-legend-v7:not(.sv31-nopalette)';
  document.querySelectorAll(sel+',#autoLegendV29').forEach(function(lg){
    if(lg.querySelector('.lg-hint-v31'))return;
    if(!lg.children.length&&!lg.textContent.trim())return;
    var hint=document.createElement('span');
    hint.className='lg-hint-v31';
    hint.textContent='点击可换颜色';
    lg.appendChild(hint);
  });
}

/* ================= 埋点挂接 ================= */
var trackingInstalledV31=false;
function installTrackingV31(){
  /* bindPage 会在每次渲染后执行；document 级监听器只能安装一次。 */
  if(trackingInstalledV31)return;
  trackingInstalledV31=true;
  /* 打开取色器：点击任意图例项 */
  document.addEventListener('click',function(e){
    var hit=e.target.closest('.legend:not(.sv31-nopalette) > *,.overview-legend:not(.sv31-nopalette) > *,.rank-legend-v7:not(.sv31-nopalette) > *,#autoLegendV29 > *');
    if(!hit)return;
    var label=(hit.textContent||'').replace(/[🎨✎]/g,'').replace('点击可换颜色','').trim();
    window.__stTrack('legend_color_open',{subject:label});
  },true);
  /* 只把真正改变颜色的控件记作 apply；popover 内的普通点击不再误报。 */
  document.addEventListener('click',function(e){
    var pop=e.target.closest('.picker-pop-v29');
    if(!pop)return;
    var swatch=e.target.closest('.pk-swatches-v29 button');
    var reset=e.target.closest('.pk-reset-v29');
    if(!swatch&&!reset)return;
    window.__stTrack('legend_color_apply',{
      subject:pop.dataset.subjectV29||'',
      custom:false,
      reset:!!reset
    });
  },false);
  document.addEventListener('change',function(e){
    var pop=e.target.closest('.picker-pop-v29');
    if(pop&&e.target.tagName==='INPUT'&&e.target.type==='color'){
      window.__stTrack('legend_color_apply',{subject:pop.dataset.subjectV29||'',custom:true,reset:false});
    }
  },false);
  /* 主题切换：包装 v29 的 applyTheme（切换前取旧主题，仅真实变化才上报） */
  try{
    if(window.__v29&&typeof window.__v29.applyTheme==='function'){
      var before=window.__v29.applyTheme;
      window.__v29.applyTheme=function(t,silent){
        var prev=null;
        try{prev=window.__v29.currentTheme();}catch(e){}
        var r=before.apply(this,arguments);
        try{if(!silent&&t!==prev)window.__stTrack('theme_change',{from:prev,to:t});}catch(e2){}
        return r;
      };
    }
  }catch(e){}
}

/* ================= 最近一次成绩卡：补排名 ================= */
function fmtRankV31(v,p){
  if(v===null||v===undefined||v==='')return null;
  var n=Number(v);
  if(isNaN(n))return null;
  return p?n+'/'+p:String(n);
}
function rankLineV31(exam,subject){
  var parts=[];
  if(subject){
    var r=((exam&&exam.scores)||{})[subject]||{};
    var cr=fmtRankV31(r.classRank,r.classParticipants),yr=fmtRankV31(r.rank,r.participants);
    if(cr)parts.push('班 '+cr);
    if(yr)parts.push('年 '+yr);
  }else{
    var cr2=fmtRankV31(exam.total_class_rank,exam.total_class_participants),yr2=fmtRankV31(exam.total_rank,exam.total_participants);
    if(cr2)parts.push('班 '+cr2);
    if(yr2)parts.push('年 '+yr2);
  }
  return parts.join(' · ');
}
var patchHeroV20Base=(typeof patchLatestHeroV20==='function')?patchLatestHeroV20:null;
patchLatestHeroV20=function(){
  if(state.page!=='home'||!document.querySelector('.hero-stat')){if(patchHeroV20Base)patchHeroV20Base();return;}
  var card=document.querySelector('.hero-stat');
  var metric=(typeof latestMetricV20==='function')?latestMetricV20():null;
  if(!metric){if(patchHeroV20Base)patchHeroV20Base();return;}
  var subjects=(typeof effectiveScoreSubjectsV20==='function')?effectiveScoreSubjectsV20(metric.exam):[];
  var rank=subjects.length===1?rankLineV31(metric.exam,subjects[0]):rankLineV31(metric.exam,null);
  var delta=metric.delta;
  card.innerHTML='<div><div class="stat-label">'+escapeHtml(metric.label)+'</div>'
    +'<div class="stat-value">'+formatScore(metric.value)+'</div>'
    +'<div class="stat-sub">'+escapeHtml(metric.exam.name)+' · '+fmtDate(metric.exam.exam_date)+'</div>'
    +(rank?'<div class="stat-rank-v31">🏆 '+escV31(rank)+'</div>':'')
    +'</div>'
    +(delta===null?'':'<span class="trend-pill">'+(delta>=0?'↗':'↘')+' '+metric.deltaLabel+' '+(delta>=0?'+':'')+formatScore(delta)+' 分</span>');
};

/* ================= 渲染钩子 ================= */
var bindPageBeforeV31=(typeof bindPage==='function')?bindPage:null;
bindPage=function bindPageV31(){
  if(bindPageBeforeV31)bindPageBeforeV31();
  try{
    installTrackingV31();
  }catch(e){}
};
function escV31(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* 启动 */
injectStylesV31();

/* 测试钩子 */
window.__v31={
  injectLegendHints:injectLegendHintsV31,
  rankLine:rankLineV31,
  track:window.__stTrack
};
})();
