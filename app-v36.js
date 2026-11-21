/* app-v36.js · 首页趋势卡紧凑模式 + 移动端纵向滚动修复
   - 给成绩趋势筛选区增加一个轻量折叠按钮，记住用户选择
   - 图表仍可横向浏览，同时允许手指从图表区域直接上下滚动页面 */
(function(){
  var STORAGE_KEY='st_trend_controls_collapsed_v36';
  var CONTROL_SELECTOR='.trend-metric-toggle-v7,.rank-view-v16,.score-basis-v13,.score-view-v25,.combo-chips-v25,.chips';

  var optionsOpen=false;
  function filterSummary(view,basis){
    return [view,basis==='赋分 / 最终分'?'最终分':basis].filter(Boolean).join(' · ');
  }
  if(typeof module==='object'&&module.exports){module.exports={filterSummary:filterSummary};return;}

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
      '.trend-controls-v36{max-height:1200px;opacity:1;transform:translateY(0);overflow:hidden;transition:max-height .26s cubic-bezier(.2,.75,.2,1),opacity .18s ease,transform .2s ease;margin-bottom:0}',
      '.chart-card.trend-controls-collapsed-v36 .trend-controls-v36{max-height:0;opacity:0;transform:translateY(-4px);pointer-events:none}',
      '.chart-card.trend-controls-collapsed-v36 .trend-actions-v25{margin-top:4px}',
      '@media(max-width:620px){.trend-collapse-v36{top:14px;right:14px;width:30px;height:30px}.chart-card>.card-title-row{padding-right:38px}}',
      "#content .chart-card .trend-controls-v36{display:grid;gap:8px;margin:0;min-width:0;max-height:none;overflow:visible;transition:none}\n#content .chart-card.trend-controls-collapsed-v36 .trend-controls-v36{display:none}\n#content .chart-card .trend-top-v36{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0}\n#content .chart-card .trend-top-v36>.trend-metric-toggle-v7{display:flex;align-items:center;flex:1 1 145px;gap:3px;min-width:0;margin:0;padding:3px;border:1px solid var(--line);background:var(--cell,var(--panel-solid));border-radius:12px;width:auto;flex-wrap:nowrap}\n#content .chart-card .trend-top-v36>.trend-metric-toggle-v7>.label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}\n#content .chart-card .trend-top-v36 .metric-btn-v7{flex:1 1 0;width:auto;min-width:0;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--muted);font-size:var(--ui-small,13px);white-space:nowrap;padding:6px 5px;min-height:33px;line-height:1.25}\n#content .chart-card .trend-top-v36 .metric-btn-v7.active{border-color:var(--line);background:var(--panel-solid);color:var(--accent);font-weight:650}\n#content .chart-card .trend-options-toggle-v36{display:flex;align-items:center;justify-content:center;gap:5px;min-height:39px;max-width:100%;padding:6px 9px;margin:0;background:var(--panel-solid);border:1px solid var(--line);border-radius:11px;color:var(--muted);font:inherit;font-size:var(--ui-caption,12px);line-height:1.35;cursor:pointer}\n#content .chart-card .trend-options-toggle-v36 span{min-width:0;overflow-wrap:anywhere}\n#content .chart-card .trend-options-toggle-v36 svg{flex:none;width:13px;height:13px}\n#content .chart-card .trend-options-toggle-v36[aria-expanded=true]{color:var(--accent);border-color:var(--accent)}\n#content .chart-card .trend-options-toggle-v36[aria-expanded=true] .trend-option-chevron-v36{transform:rotate(180deg)}\n#content .chart-card .trend-options-v36[hidden]{display:none!important}\n#content .chart-card .trend-options-v36{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:8px 10px;margin:0;border-radius:10px;background:var(--cell,var(--accent-soft));min-width:0}\n#content .chart-card .trend-options-v36>:is(.rank-view-v16,.score-view-v25,.score-basis-v13){display:flex;width:auto;flex:1 1 210px;gap:5px;align-items:center;flex-wrap:nowrap;min-width:0;margin:0}\n#content .chart-card .trend-options-v36 .label{flex:none;font-size:var(--ui-caption,12px);font-weight:500;white-space:nowrap;color:var(--muted);margin-right:2px}\n#content .chart-card .trend-options-v36 button{flex:1 1 0;width:auto;min-width:0;min-height:34px;font-size:var(--ui-caption,12px);padding:5px 7px;line-height:1.35;white-space:normal;border-radius:9px}\n#content .chart-card .trend-controls-v36>:is(.combo-chips-v25,.chips){display:flex;align-items:center;flex-wrap:nowrap;gap:5px;min-width:0;margin:0;padding:1px 0 2px;overflow-x:auto;scrollbar-width:none}\n#content .chart-card .trend-controls-v36>:is(.combo-chips-v25,.chips)>.label{flex:none;min-width:35px;margin:0;font-size:var(--ui-caption,12px);font-weight:500;white-space:nowrap;color:var(--muted)}\n#content .chart-card .trend-controls-v36>:is(.combo-chips-v25,.chips)>.chip{flex:none;min-height:34px;font-size:var(--ui-small,13px);padding:6px 11px;line-height:1.35;border-radius:10px;white-space:nowrap}\n#content .chart-card .trend-actions-v25{gap:6px;margin:8px 0 3px}\n#content .chart-card .trend-actions-v25 button{font-size:var(--ui-caption,12px);min-height:34px;padding:6px 10px;border-radius:9px}\n#content .chart-card .trend-options-toggle-v36:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n@media(min-width:881px){#content .chart-card .trend-top-v36>.trend-metric-toggle-v7{flex:0 1 280px}}\n@media(max-width:360px){#content .chart-card .trend-options-toggle-v36{padding:6px;gap:3px}#content .chart-card .trend-top-v36>.trend-metric-toggle-v7{flex-basis:125px}#content .chart-card .trend-controls-v36>:is(.combo-chips-v25,.chips)>.chip{padding:6px 8px}}\n",
      /* v31 曾把手机图表 touch-action 收窄成 pan-x，导致手指落在图表上时页面不能纵向滚动。 */
      '@media(max-width:720px){.chart-card .chart-wrap,.chart-card .rank-chart-stage-v7,.chart-card .overview-stage-v5{touch-action:pan-x pan-y!important;overscroll-behavior-y:auto}.chart-card .trend-scroll-v19,.chart-card .combo-chips-v25,.chart-card .chips,.chart-card .trend-legend-row-v25,.chart-card .rank-legend-v7,.chart-card .overview-legend{touch-action:pan-x pan-y!important}.full-trend-stage-v25{touch-action:pan-x pan-y!important}}'
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
    button.setAttribute('aria-controls','trendControlsV36');
    button.setAttribute('aria-label',collapsed?'展开趋势筛选':'折叠趋势筛选');
    button.title=collapsed?'展开趋势筛选':'折叠趋势筛选';
    var controls=card.querySelector('.trend-controls-v36');
    if(controls){controls.inert=collapsed;controls.setAttribute('aria-hidden',collapsed?'true':'false');}
  }
  // Move the original bound controls, not clones. Existing click handlers still
  // own score/rank/basis state and redraw the chart exactly as before.
  function compactControlsV36(controls){
    if(controls.querySelector('.trend-top-v36'))return;
    var scope=controls.querySelector('.trend-metric-toggle-v7');
    if(!scope)return;
    var viewButtons=Array.from(scope.querySelectorAll('[data-score-view-v25]'));
    var rank=controls.querySelector('.rank-view-v16'),basis=controls.querySelector('.score-basis-v13');
    var view=controls.querySelector('.score-view-v25');
    if(viewButtons.length){
      view=document.createElement('div');view.className='score-view-v25';
      var labels=Array.from(scope.querySelectorAll('.label'));
      var label=labels.find(function(n){return n.textContent.trim()==='查看';});
      if(!label){label=document.createElement('span');label.className='label';label.textContent='查看';}
      view.appendChild(label);viewButtons.forEach(function(b){view.appendChild(b);});
    }
    var top=document.createElement('div');top.className='trend-top-v36';
    controls.insertBefore(top,scope);top.appendChild(scope);
    var groups=[view,rank,basis].filter(Boolean);
    if(!groups.length)return;
    var panel=document.createElement('div');panel.className='trend-options-v36';panel.id='trendOptionsV36';
    controls.insertBefore(panel,top.nextSibling);
    groups.forEach(function(g){panel.appendChild(g);});
    var active=function(g){var n=g&&g.querySelector('button.active');return n?n.textContent.trim():'';};
    var summary=filterSummary(active(view)||active(rank),active(basis));
    var toggle=document.createElement('button');toggle.type='button';toggle.className='trend-options-toggle-v36';
    toggle.setAttribute('aria-controls',panel.id);
    toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg><span></span><svg class="trend-option-chevron-v36" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg>';
    toggle.querySelector('span').textContent=summary||'筛选';
    function update(){panel.hidden=!optionsOpen;toggle.setAttribute('aria-expanded',String(optionsOpen));toggle.setAttribute('aria-label',(optionsOpen?'收起':'展开')+'筛选'+(summary?'：'+summary:''));}
    toggle.addEventListener('click',function(){optionsOpen=!optionsOpen;update();});
    top.appendChild(toggle);update();
  }
  function enhanceTrendCardV36(){
    if(typeof state!=='undefined'&&state.page!=='home')return;
    var card=document.querySelector('#content .chart-card');
    if(!card)return;

    var controls=card.querySelector('.trend-controls-v36');
    if(!controls){
      var nodes=directControlsV36(card);
      if(nodes.length){
        controls=document.createElement('div');
        controls.className='trend-controls-v36';controls.id='trendControlsV36';
        card.insertBefore(controls,nodes[0]);
        nodes.forEach(function(node){controls.appendChild(node);});
      }
    }
    if(!controls)return;
    compactControlsV36(controls);

    var button=card.querySelector('.trend-collapse-v36');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='trend-collapse-v36';
      button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      card.insertBefore(button,controls);
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
