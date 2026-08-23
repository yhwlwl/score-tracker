/* app-v31.js · v4.1 交互与运营层
   1) 图例换色提示升级：一次性 toast → 手动关闭的提示条；图例旁常驻小灰字
   2) 版本落后检测：同源比对 meta 版本号，弹一句话更新条 + 立即刷新
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
window.__stTrack=function stTrackV31(eventType,metadata){
  try{
    var API='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
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
    '.tip-banner-v31{position:fixed;left:50%;transform:translateX(-50%);top:calc(14px + env(safe-area-inset-top));z-index:95;display:flex;align-items:center;gap:10px;background:var(--panel-solid,#fff);color:var(--text,#18212f);border:1px solid var(--line,#e6e9ef);border-radius:14px;padding:11px 12px 11px 14px;box-shadow:var(--nav-shadow,0 10px 35px rgba(28,39,63,.16));max-width:min(430px,calc(100vw - 24px));font-size:12.5px;animation:v31drop .25s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes v31drop{from{transform:translate(-50%,-14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}',
    '.tip-banner-v31 .t-ico{font-size:16px;flex:none}',
    '.tip-banner-v31 .t-x{flex:none;border:0;background:var(--cell,#f3f4f7);width:26px;height:26px;border-radius:8px;font-size:14px;color:var(--muted,#667085);cursor:pointer;font-family:inherit}',
    '.lg-hint-v31{font-size:10px;color:var(--muted,#98a1ae);opacity:.75;margin-left:2px;white-space:nowrap;pointer-events:none;-webkit-user-select:none;user-select:none}',
    '.update-bar-v31{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:96;display:flex;align-items:center;gap:10px;background:var(--panel-solid,#fff);color:var(--text,#18212f);border:1px solid var(--accent,#5d72e8);border-radius:14px;padding:11px 12px 11px 14px;box-shadow:var(--nav-shadow,0 10px 35px rgba(28,39,63,.2));max-width:min(470px,calc(100vw - 24px));font-size:12.5px;animation:v31rise .3s cubic-bezier(.2,.8,.25,1)}',
    '@keyframes v31rise{from{transform:translate(-50%,14px);opacity:0}to{transform:translate(-50%,0);opacity:1}}',
    '.update-bar-v31 .u-x{border:0;background:transparent;color:var(--muted,#98a1ae);font-size:15px;cursor:pointer;padding:2px 4px;font-family:inherit;flex:none}'
  ].join('\n');
  var st=document.createElement('style');
  st.id='app-v31-style';
  st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
}

/* ================= 提示条（手动关闭）================= */
function showColorTipBannerV31(){
  if(document.getElementById('colorTipBannerV31'))return;
  var b=document.createElement('div');
  b.className='tip-banner-v31';b.id='colorTipBannerV31';
  b.innerHTML='<span class="t-ico">🎨</span><span>点击图表下方的<b>图例</b>，可以更换每条线的颜色</span>'
    +'<button type="button" class="t-x" aria-label="关闭">×</button>';
  document.body.appendChild(b);
  b.querySelector('.t-x').addEventListener('click',function(){
    b.remove();
    try{localStorage.setItem('st_tip_colors_v31','dismissed');}catch(e){}
    window.__stTrack('tip_dismiss',{});
  });
}

/* ================= 图例旁小灰字 ================= */
function injectLegendHintsV31(){
  var sel='.legend,.overview-legend,.rank-legend-v7';
  document.querySelectorAll(sel+',#autoLegendV29').forEach(function(lg){
    if(lg.querySelector('.lg-hint-v31'))return;
    if(!lg.children.length&&!lg.textContent.trim())return;
    var hint=document.createElement('span');
    hint.className='lg-hint-v31';
    hint.textContent='点击可换颜色';
    lg.appendChild(hint);
  });
}

/* ================= 版本检测 ================= */
var RELEASE_NOTES_V31={
  'v4.1':'新增数据导出：Excel 表格 / TXT 成绩单 / JSON 备份 / PDF 打印报告'
};
function dismissKeyV31(v){return 'st_update_dismissed_'+v;}
function showUpdateBarV31(latest){
  if(document.getElementById('updateBarV31'))return;
  var note=RELEASE_NOTES_V31[latest]||'体验优化与新功能';
  var b=document.createElement('div');
  b.className='update-bar-v31';b.id='updateBarV31';
  b.innerHTML='<span>🚀</span><span><b>新版本 '+escV31(latest)+' 已发布</b>　'+escV31(note)+'</span>'
    +'<button type="button" class="primary u-go" style="flex:none">立即更新</button>'
    +'<button type="button" class="u-x" aria-label="关闭">×</button>';
  document.body.appendChild(b);
  window.__stTrack('update_prompt_shown',{from:appVersionV31(),to:latest});
  b.querySelector('.u-go').addEventListener('click',function(){
    window.__stTrack('update_apply',{from:appVersionV31(),to:latest});
    try{sessionStorage.setItem('st_force_reload','1');}catch(e){}
    location.replace(location.pathname+'?v='+Date.now()+location.hash);
  });
  b.querySelector('.u-x').addEventListener('click',function(){
    b.remove();
    try{localStorage.setItem(dismissKeyV31(latest),'1');}catch(e){}
  });
}
function checkUpdateV31(){
  try{
    var cur=appVersionV31();
    if(!cur)return;
    var f=window.fetch.bind(window);
    f('index.html?__cb='+Date.now(),{cache:'no-store'}).then(function(r){return r.text();}).then(function(txt){
      var m=txt.match(/application-version"\s*content="([^"]+)"/);
      if(!m)return;
      var latest=m[1];
      if(latest===cur)return;
      try{if(localStorage.getItem(dismissKeyV31(latest))==='1')return;}catch(e){}
      showUpdateBarV31(latest);
    }).catch(function(){});
  }catch(e){}
}

/* ================= 埋点挂接 ================= */
function installTrackingV31(){
  /* 打开取色器：点击任意图例项 */
  document.addEventListener('click',function(e){
    var hit=e.target.closest('.legend > *,.overview-legend > *,.rank-legend-v7 > *,#autoLegendV29 > *');
    if(!hit)return;
    var label=(hit.textContent||'').replace(/[🎨✎]/g,'').replace('点击可换颜色','').trim();
    window.__stTrack('legend_color_open',{subject:label});
  },true);
  /* 取色器内动作 */
  function popTrack(kind,extra){
    return function(e){
      var pop=e.target.closest('.picker-pop-v29');
      if(!pop)return;
      var subject=pop.dataset.subjectV29||pop.getAttribute('data-subject')||'';
      var payload={subject:subject};
      if(extra)for(var k in extra)payload[k]=extra[k];
      window.__stTrack(kind,payload);
    };
  }
  document.addEventListener('click',popTrack('legend_color_apply'),false);
  document.addEventListener('change',function(e){
    var pop=e.target.closest('.picker-pop-v29');
    if(pop&&e.target.tagName==='INPUT'&&e.target.type==='color'){
      window.__stTrack('legend_color_apply',{subject:pop.dataset.subjectV29||'',custom:true});
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

/* ================= 渲染钩子 ================= */
var bindPageBeforeV31=(typeof bindPage==='function')?bindPage:null;
bindPage=function bindPageV31(){
  if(bindPageBeforeV31)bindPageBeforeV31();
  try{
    /* 静默旧的一次性 toast，改由本层提示条负责 */
    try{localStorage.setItem('st_tip_colors_v29','1');}catch(e){}
    injectLegendHintsV31();
    installTrackingV31();
    if(!localStorage.getItem('st_tip_colors_v31'))showColorTipBannerV31();
    checkUpdateV31();
    setInterval(checkUpdateV31,30*60*1000);
  }catch(e){}
};
function escV31(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* 启动 */
injectStylesV31();

/* 测试钩子 */
window.__v31={
  showColorTipBanner:showColorTipBannerV31,
  injectLegendHints:injectLegendHintsV31,
  checkUpdate:checkUpdateV31,
  releaseNotes:RELEASE_NOTES_V31,
  track:window.__stTrack
};
})();
