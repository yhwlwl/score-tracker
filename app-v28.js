// app-v28 / product v3.2: 
// A) 折线图配色去重：原始分总览（v13）依赖 OVERVIEW_COLORS、排名图（v7/v11/v25）依赖
//    OVERVIEW_COLORS_V4，但两者此前均未定义 → 回退到小调色板按 index 取模
//    （RADAR_COLORS 仅 4 色 / 排名 10 色），科目一多颜色必然重复。
//    现提供确定性扩展调色板：前几项与现有观感完全一致，超出的用黄金角 HSL 唯一生成，
//    避开基础色相、互不重复；白底可读（S62% L46%）。
// B) 注册/请求网络失败：此前浏览器原样抛英文 "Failed to fetch" 且无任何记录。
//    现将 api/dataApiV7 的网络层错误翻译为可操作的中文提示；
//    失败事件改由 telemetry-feedback.js 上报（api_fetch_error），从此可在服务端排查。
(function(){
  var PRODUCT_VERSION_V28='v3.2';
  function syncVersionV28(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
  }

  // ---------- A) palettes ----------
  function hexToHueV28(hex){
    var v=String(hex||'').replace('#','');
    if(v.length===3)v=v[0]+v[0]+v[1]+v[1]+v[2]+v[2];
    var r=parseInt(v.slice(0,2),16)/255,g=parseInt(v.slice(2,4),16)/255,b=parseInt(v.slice(4,6),16)/255;
    var max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0;
    if(d>0){
      if(max===r)h=((g-b)/d+6)%6;
      else if(max===g)h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h=h*60;if(h>=360)h-=360;
    }
    return h;
  }
  function angDistV28(a,b){var d=Math.abs(a-b)%360;return d>180?360-d:d;}
  (function buildPalettesV28(){
    var total='#18212f';
    var radar=['#5d72e8','#32a77a','#e59b45','#df5f68'];
    var rankTail=['#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
    var avoided=radar.concat(rankTail).map(hexToHueV28);
    // 两段式生成：先严后宽，保证凑满目标数量且互不近似
    function collect(target,minAvoid,minGen){
      var out=[],hop=0;
      while(out.length<target&&hop<900){
        var h=(15+137.508*hop++)%360;
        var clash=avoided.some(function(a){return angDistV28(a,h)<minAvoid;})
          ||out.some(function(g){return angDistV28(g,h)<minGen;});
        if(!clash)out.push(h);
      }
      return out;
    }
    var gen=collect(26,10,9);
    if(gen.length<26){
      collect(26,6,7).forEach(function(h){
        if(gen.length<26&&!gen.some(function(g){return angDistV28(g,h)<7;}))gen.push(h);
      });
    }
    function hsl(h){return 'hsl('+Math.round(h)+',62%,46%)';}
    var ov=[total].concat(radar);gen.slice(0,25).forEach(function(h){ov.push(hsl(h));});
    var v4=[total].concat(radar,rankTail);gen.forEach(function(h){v4.push(hsl(h));});
    window.OVERVIEW_COLORS=ov;      // v13 原始分总览：总分色 + 每科一色
    window.OVERVIEW_COLORS_V4=v4;   // v7/v11/v25 排名折线系列色
  })();

  // ---------- B) network errors: translate to actionable Chinese ----------
  function isNetworkErrorV28(e){
    var msg=String((e&&e.message)||'');
    return (e instanceof TypeError)||/failed to fetch|networkerror|load failed|network request failed/i.test(msg);
  }
  function friendlyNetErrorV28(e){
    if(!isNetworkErrorV28(e))return e;
    try{
      if(navigator.onLine===false)return new Error('当前无网络连接，请联网后重试');
    }catch(_){}
    return new Error('网络连接失败：请检查网络后重试；如果浏览器安装了广告拦截类插件，请允许本站请求后再试');
  }
  var apiBeforeV28=(typeof api==='function')?api:null;
  if(apiBeforeV28){
    api=function(){ // 注册/登录等走这里
      return apiBeforeV28.apply(this,arguments).catch(function(e){throw friendlyNetErrorV28(e);});
    };
  }
  var dataApiBeforeV28=(typeof dataApiV7==='function')?dataApiV7:null;
  if(dataApiBeforeV28){
    dataApiV7=function(){
      return dataApiBeforeV28.apply(this,arguments).catch(function(e){throw friendlyNetErrorV28(e);});
    };
  }

  syncVersionV28();
})();
