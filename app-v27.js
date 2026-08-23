// app-v27 / product v3.1: 修复首页趋势卡「多科彩色图例」被裁切的问题。
// 根因：总览模式下 .overview-legend 生成在 #chart 容器内部（SVG 之后），而 v19 给 #chart
// 加了 .trend-scroll-v19{overflow-y:hidden!important}，叠加 .chart-wrap 固定高度
// （桌面 330px / 手机 285px）且 SVG 占满高度 → 图例溢出容器被下边缘切掉：
// 桌面露出上半截、手机几乎完全不可见。排名模式的 .rank-legend-v7 同样挤在定高容器内。
// 修法：渲染后将图例搬迁到 #chart 之后（容器外），脱离裁切与横向滚动上下文；
// 图例本身样式不变，仅外层提供排版。幂等，可重复 render。
(function(){
  var PRODUCT_VERSION_V27='v3.1';
  function syncVersionV27(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v27-style')){
    var style=document.createElement('style');
    style.id='app-v27-style';
    style.textContent=`
      .legend-outside-v27{margin-top:10px;min-width:0}
      .legend-outside-v27 .overview-legend,.legend-outside-v27 .rank-legend-v7{margin-top:0}
    `;
    document.head.appendChild(style);
  }

  // ---------- move legends out of the clipped/fixed-height chart container ----------
  function moveLegendsOutV27(){
    ['chart','overviewChart'].forEach(function(id){
      var stage=document.getElementById(id);
      if(!stage)return;
      stage.querySelectorAll('.overview-legend,.rank-legend-v7').forEach(function(legend){
        if(legend.closest('.legend-outside-v27'))return; // 已搬迁
        var row=document.createElement('div');
        row.className='legend-outside-v27';
        stage.insertAdjacentElement('afterend',row);
        row.appendChild(legend);
      });
    });
  }

  var bindPageBeforeV27=(typeof bindPage==='function')?bindPage:null;
  if(bindPageBeforeV27){
    bindPage=function bindPageV27(){
      bindPageBeforeV27();
      try{moveLegendsOutV27();}catch(e){}
    };
  }

  syncVersionV27();
})();
