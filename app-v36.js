/* app-v36.js · 首页趋势卡紧凑模式 + 移动端纵向滚动修复
   - 给成绩趋势筛选区增加一个轻量折叠按钮，记住用户选择
   - 图表仍可横向浏览，同时允许手指从图表区域直接上下滚动页面 */
(function(){
  var STORAGE_KEY='st_trend_controls_collapsed_v36';
  var CONTROL_SELECTOR='.trend-metric-toggle-v7,.rank-view-v16,.score-basis-v13,.score-view-v25,.combo-chips-v25,.chips';

  function injectStyleV36(){
    if(document.getElementById('app-v36-style'))return;
    var style=document.createElement('style');
    style.id='app-v36-style';
    style.textContent=[
      '.chart-card{position:relative}',
      '.trend-collapse-v36{position:absolute;top:16px;right:16px;z-index:3;width:31px;height:31px;padding:0;border:1px solid var(--line,#e8ebf0);border-radius:10px;background:color-mix(in srgb,var(--panel-solid,#fff) 92%,transparent);color:var(--muted,#788392);display:grid;place-items:center;box-shadow:0 2px 8px rgba(24,33,47,.035);transition:background .16s,border-color .16s,color .16s,transform .16s;backdrop-filter:blur(8px)}',
      '.trend-collapse-v36:hover{background:var(--cell,#f6f7fa);border-color:color-mix(in srgb,var(--muted,#788392) 34%,var(--line,#e8ebf0));color:var(--text,#18212f)}',
      '.trend-collapse-v36:active{transform:scale(.94)}',
      '.trend-collapse-v36:focus-visible{outline:2px solid color-mix(in srgb,var(--accent,#5d72e8) 42%,transparent);outline-offset:2px}',
      '.trend-collapse-v36 svg{width:15px;height:15px;display:block;transition:transform .2s ease}',
      '.trend-collapse-v36[aria-expanded="true"] svg{transform:rotate(180deg)}',
      '.chart-card>.card-title-row{padding-right:39px}',
      '.trend-controls-v36{max-height:720px;opacity:1;transform:translateY(0);overflow:hidden;transition:max-height .26s cubic-bezier(.2,.75,.2,1),opacity .18s ease,transform .2s ease;margin-bottom:0}',
      '.chart-card.trend-controls-collapsed-v36 .trend-controls-v36{max-height:0;opacity:0;transform:translateY(-4px);pointer-events:none}',
      '.chart-card.trend-controls-collapsed-v36 .trend-actions-v25{margin-top:4px}',
      '@media(max-width:620px){.trend-collapse-v36{top:14px;right:14px;width:30px;height:30px}.chart-card>.card-title-row{padding-right:38px}}',
      /* v31 曾把手机图表 touch-action 收窄成 pan-x，导致手指落在图表上时页面不能纵向滚动。 */
      '@media(max-width:720px){.chart-card .chart-wrap,.chart-card .rank-chart-stage-v7,.chart-card .overview-stage-v5{touch-action:pan-x pan-y!important;overscroll-behavior-y:auto}.chart-card .trend-scroll-v19{touch-action:pan-x pan-y!important}.full-trend-stage-v25{touch-action:pan-x pan-y!important}}'
    ].join('\n');
    (document.head||document.documentElement).appendChild(style);
  }

  function readCollapsedV36(){
    try{return localStorage.getItem(STORAGE_KEY)==='1';}catch(e){return false;}
  }
  function writeCollapsedV36(v){
    try{localStorage.setItem(STORAGE_KEY,v?'1':'0');}catch(e){}
  }
  function directControlsV36(card){
    return Array.prototype.filter.call(card.children,function(el){return el.matches&&el.matches(CONTROL_SELECTOR);});
  }
  function updateCollapseButtonV36(card,button,collapsed){
    card.classList.toggle('trend-controls-collapsed-v36',collapsed);
    button.setAttribute('aria-expanded',collapsed?'false':'true');
    button.setAttribute('aria-label',collapsed?'展开趋势筛选':'折叠趋势筛选');
    button.title=collapsed?'展开趋势筛选':'折叠趋势筛选';
  }
  function enhanceTrendCardV36(){
    var card=document.querySelector('.chart-card');
    if(!card)return;

    var controls=card.querySelector('.trend-controls-v36');
    if(!controls){
      var nodes=directControlsV36(card);
      if(nodes.length){
        controls=document.createElement('div');
        controls.className='trend-controls-v36';
        card.insertBefore(controls,nodes[0]);
        nodes.forEach(function(node){controls.appendChild(node);});
      }
    }
    if(!controls)return;

    var button=card.querySelector('.trend-collapse-v36');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='trend-collapse-v36';
      button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      card.appendChild(button);
      button.addEventListener('click',function(){
        var collapsed=!card.classList.contains('trend-controls-collapsed-v36');
        updateCollapseButtonV36(card,button,collapsed);
        writeCollapsedV36(collapsed);
        try{if(typeof window.__stTrack==='function')window.__stTrack('trend_controls_toggle',{collapsed:collapsed});}catch(e){}
      });
    }
    updateCollapseButtonV36(card,button,readCollapsedV36());
  }

  injectStyleV36();

  var bindBeforeV36=(typeof bindPage==='function')?bindPage:null;
  if(bindBeforeV36){
    bindPage=function bindPageV36(){
      bindBeforeV36();
      enhanceTrendCardV36();
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){requestAnimationFrame(enhanceTrendCardV36);},{once:true});
  }else{
    requestAnimationFrame(enhanceTrendCardV36);
  }

  window.__v36={enhance:enhanceTrendCardV36,readCollapsed:readCollapsedV36};
})();
