/* Responsive analysis navigation. Presentation only: keep original card nodes,
   event handlers, global filters, calculation and export sources intact. */
(function () {
  'use strict';
  var groups = [
    { id:'overview', label:'总览', icon:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
    { id:'trend', label:'趋势', icon:'<path d="M3 3v18h18M6 15l5-5 4 3 6-7"/>' },
    { id:'subject', label:'学科', icon:'<path d="M12 5v15M3 4c3-2 6-2 9 1 3-3 6-3 9-1v16c-3-2-6-2-9 0-3-2-6-2-9 0z"/>' },
    { id:'forecast', label:'目标与预测', icon:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>' }
  ];
  var valid = groups.map(function(g){return g.id;}).concat(['all','methods']);
  function classify(title, key) {
    if (key === 'speed') return 'subject';
    if (key === 'peer' || key === 'deep') return 'forecast';
    if (key === 'distribution' || key === 'worth' || key === 'trend') return 'trend';
    if (key === 'matrix' || key === 'kpi') return 'overview';
    if (key === 'quality') return 'methods';
    if (/学科结构|学科定位|进步速度榜|学科雷达|题型分析/.test(title)) return 'subject';
    if (/目标校准|目标分析|深度分析|学习状态预测|相似轨迹/.test(title)) return 'forecast';
    if (/成绩含金量|趋势与进步|成绩与排名|名次竞争力|排名分布/.test(title)) return 'trend';
    if (/数据与计算方法/.test(title)) return 'methods';
    return 'overview';
  }
  function normalize(value){return valid.indexOf(value)>=0?value:'overview';}
  if(typeof module!=='undefined'&&module.exports){module.exports={classify:classify,normalize:normalize,groups:groups};return;}
  if(typeof document==='undefined')return;
  var active='overview', lastPrimary='overview', owner=null, reveal=false, queued=false, lastPage=null, viewed=false;
  function hydrate(){
    var next='guest';try{next=String(state.user&&(state.user.id||state.user.username)||'guest');}catch(_){}
    if(next===owner)return;owner=next;reveal=false;viewed=false;active='overview';lastPrimary='overview';
    try{active=normalize(sessionStorage.getItem('st_analysis_nav_v1:'+owner));}catch(_){}
    if(active!=='methods')lastPrimary=active;
  }
  function save(){if(active==='methods')return;try{sessionStorage.setItem('st_analysis_nav_v1:'+owner,active);}catch(_){}}
  function track(name,extra){try{if(typeof window.__stTrack==='function')window.__stTrack(name,Object.assign({section:active,surface:'stats',layout:window.matchMedia('(min-width:881px)').matches?'sidebar':'tabs'},extra||{}));}catch(_){}}
  function svg(g){return '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+g.icon+'</svg>';}
  function button(id,label,icon,primary){
    var b=document.createElement('button');b.type='button';b.dataset.analysisNav=id;
    if(primary)b.className='an-primary';
    b.innerHTML=(icon||'')+'<span>'+label+'</span>';return b;
  }
  function mountNav(page){
    var nav=page.querySelector(':scope > .an-navigation');if(nav)return nav;
    nav=document.createElement('nav');nav.className='an-navigation';nav.setAttribute('aria-label','统计分析分类');
    var inner=document.createElement('div');inner.className='an-navigation-inner';
    var primary=document.createElement('div');primary.className='an-primary-row';primary.setAttribute('role','group');primary.setAttribute('aria-label','分析分类');
    groups.forEach(function(g){primary.append(button(g.id,g.label,svg(g),true));});
    var secondary=document.createElement('div');secondary.className='an-secondary-row';
    secondary.append(button('all','全部',null,false),button('methods','计算说明',null,false));
    inner.append(primary,secondary);nav.append(inner);
    var header=page.querySelector(':scope > .page-head');
    if(header)header.after(nav);else page.prepend(nav);
    return nav;
  }
  function makeCard(page,node,key,title,reference){
    if(!node||node.closest('[data-an-split]'))return;
    var card=document.createElement('section');card.className='card an-split-card';card.dataset.anSplit=key;
    // Keep original subtree and handlers. Its own title/controls are retained.
    if(title){var head=document.createElement('div');head.className='card-title-row';var h=document.createElement('h3');h.className='card-title';h.textContent=title;head.append(h);card.append(head);}
    card.append(node);if(reference&&reference.parentElement===page)reference.after(card);else page.append(card);
  }
  function split(page){
    var trend=page.querySelector(':scope > .sv31-trend-card');
    if(trend){
      var speed=Array.from(trend.querySelectorAll('b')).find(function(b){return b.textContent.trim().indexOf('进步速度榜')===0;});
      if(speed&&speed.parentElement&&speed.parentElement!==trend&&speed.parentElement.querySelector('table')){
        makeCard(page,speed.parentElement,'speed',null,trend);
      }
      var peer=trend.querySelector('[data-peer-host]');
      if(peer)makeCard(page,peer,'peer',null,page.querySelector(':scope > #dsbRoot')||trend);
    }
    // The distribution is generated in the matrix and shares its selected metric.
    // Move only its containing block; do not duplicate or recompute it.
    var matrix=page.querySelector(':scope > .worth-matrix-card');
    if(matrix){
      var title=matrix.querySelector('[data-matrix-distribution-heading]');
      var head=title&&title.parentElement, block=head&&head.parentElement;
      if(block&&block!==matrix&&block.querySelector('.matrix-distribution-v60')&&
         !block.querySelector('.worth-matrix-scroll'))makeCard(page,block,'distribution',null,matrix);
    }
  }
  function keyFor(card){
    if(card.dataset.anSplit)return card.dataset.anSplit;
    if(card.id==='dsbRoot')return 'deep';
    if(card.id==='scoreWorthCard')return 'worth';
    if(card.classList.contains('sv31-trend-card'))return 'trend';
    if(card.classList.contains('worth-matrix-card'))return 'matrix';
    if(card.classList.contains('sv31-quality'))return 'quality';
    if(card.querySelector('.sv31-kpi'))return 'kpi';
    if(card.querySelector('[data-peer-host]')&&!card.querySelector('.card-title,.dsb-head'))return 'peer';
    return '';
  }
  function cardTitle(card){
    var h=card.querySelector('.card-title,.dsb-head');return h?h.textContent.trim():'';
  }
  function isPreferenceHidden(card,page){
    if(card.hasAttribute('data-display-off-v1'))return true;
    if(card.dataset.anSplit==='distribution'){
      var m=page.querySelector(':scope > .worth-matrix-card');return !!(m&&m.hasAttribute('data-display-off-v1'));
    }
    if(card.dataset.anSplit==='peer'){
      var p=card.querySelector('[data-peer-host]');return !!(p&&p.hasAttribute('data-display-off-v1'));
    }
    return false;
  }
  function updateNotice(page,count,visible){
    var n=page.querySelector(':scope > .an-notice');
    if(!count&&!(!visible&&active!=='overview')){if(n)n.remove();return;}
    if(!n){
      n=document.createElement('div');n.className='an-notice';
      var label=document.createElement('span');label.className='an-notice-text';
      var b=document.createElement('button');b.type='button';b.dataset.anReveal='1';
      n.append(label,b);page.append(n);
    }
    var text=count?(reveal?'正在临时显示隐藏板块':count+' 个板块已按显示设置隐藏'):'当前范围暂无此类分析，录入更多考试后可查看。';
    var label=n.querySelector('span'),b=n.querySelector('button');
    if(label.textContent!==text)label.textContent=text;
    var bt=reveal?'恢复显示设置':'查看隐藏板块';if(b.textContent!==bt)b.textContent=bt;
    b.hidden=!count;b.setAttribute('aria-pressed',String(reveal));
  }
  function sync(){
    var page=document.querySelector('#content > .sv31-page')||document.querySelector('#content .sv31-page');
    try{if(state.page!=='stats')page=null;}catch(_){}
    if(!page){lastPage=null;viewed=false;return;}
    hydrate();lastPage=page;
    page.classList.add('an-layout');
    var nav=mountNav(page);split(page);
    var count=0,visible=0;
    Array.from(page.children).filter(function(c){return c.classList.contains('card');}).forEach(function(c){
      var group=classify(cardTitle(c),keyFor(c));
      var selected=active==='all'||group===active;
      // Keep empty-state information discoverable in every category.
      if(/当前范围暂无可分析成绩/.test(cardTitle(c)))selected=true;
      var pref=isPreferenceHidden(c,page);
      if(selected){if(pref)count++;if(!pref||reveal)visible++;}
      c.toggleAttribute('data-an-off',!selected);
      c.toggleAttribute('data-an-pref-off',pref&&!reveal);
      c.toggleAttribute('data-an-show-pref',selected&&reveal&&pref);
      // Remove original whole-page sequence numbers from visible titles only,
      // retaining the numbering in generated export sources. Preserve original DOM.
      var h=c.querySelector('.card-title');
      if(h&&h.firstChild&&h.firstChild.nodeType===3&&/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/.test(h.firstChild.nodeValue)){
        h.firstChild.nodeValue=h.firstChild.nodeValue.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/,'');
      }
    });
    page.toggleAttribute('data-an-reveal',reveal);
    nav.querySelectorAll('[data-analysis-nav]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.dataset.analysisNav===active));
      b.classList.toggle('is-active',b.dataset.analysisNav===active);
    });
    updateNotice(page,count,visible);
    if(!viewed){viewed=true;track('analysis_section_view');}
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;sync();});}
  function scrollToNav(page){
    var nav=page.querySelector('.an-navigation'),header=page.querySelector('.page-head');
    // Preserve the page's own scroll container; avoid jumping the entire app.
    if(header&&header.getBoundingClientRect().top<0)header.scrollIntoView({block:'start',behavior:'instant'});
    else if(nav&&nav.getBoundingClientRect().top<0)nav.scrollIntoView({block:'start',behavior:'instant'});
  }
  function choose(id,doScroll){
    var page=document.querySelector('#content .sv31-page');if(!page)return;
    hydrate();var next=normalize(id),previous=active;if(next===active)return;
    active=next;if(next!=='methods')lastPrimary=next;reveal=false;save();sync();
    if(doScroll)scrollToNav(page);
    track('analysis_section_switch',{from:previous,to:next});
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-analysis-nav],[data-an-reveal]');
    if(!b||!b.closest('.an-layout'))return;
    if(b.hasAttribute('data-an-reveal')){reveal=!reveal;sync();track('analysis_hidden_toggle',{show:reveal});return;}
    var id=b.dataset.analysisNav;
    choose(id===active&&id==='methods'?lastPrimary:id,true);
  });
  // If a matrix cell opens the existing worth card, reveal its classification
  // without interfering with the original delegated click/scroll handlers.
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-worth-matrix]')&&e.target.closest('.an-layout')&&active!=='all'){
      choose('trend',false);
      var worth=document.querySelector('#scoreWorthCard');
      if(worth&&worth.hasAttribute('data-display-off-v1')){reveal=true;sync();}
    }
  },true);
  var css=document.createElement('style');css.id='analysis-navigation-v1';
  css.textContent=[
    '#content .an-layout>[data-an-off],#content .an-layout>[data-an-pref-off]{display:none!important}',
    '#content .an-layout>[data-an-show-pref][data-display-off-v1],#content .an-layout>[data-an-show-pref] [data-display-off-v1]{display:revert!important}',
    '.an-layout{min-width:0}.an-layout>.card{min-width:0}',
    '.an-navigation{position:sticky;top:0;z-index:12;margin:0 0 12px;background:var(--panel-solid,var(--bg,#fff));border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:5px 6px}',
    '.an-primary-row,.an-secondary-row{display:flex;gap:3px;align-items:center}',
    '.an-navigation button{font:inherit;color:var(--muted,#788392);border:0;background:transparent;cursor:pointer;border-radius:8px;padding:9px 6px;font-size:13px;font-weight:600;min-width:0;white-space:nowrap}',
    '.an-primary-row button{flex:1;display:flex;justify-content:center;align-items:center;gap:6px}',
    '.an-navigation button.is-active{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font-weight:700}',
    '.an-navigation button:focus-visible,.an-notice button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:2px}',
    '.an-secondary-row{justify-content:flex-end;border-top:1px solid var(--line,#e8ebf0);margin-top:4px;padding-top:2px}',
    '.an-secondary-row button{font-size:11px;padding:5px 8px}',
    '.an-primary-row svg{display:none;flex:none}',
    '.an-notice{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 0;margin-bottom:12px;color:var(--muted,#788392);font-size:12px}',
    '.an-notice button{font:inherit;color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);border:0;border-radius:8px;padding:7px 10px;cursor:pointer}',
    '.an-notice button[hidden]{display:none!important}',
    '.an-split-card>div:first-child{margin-top:0!important}',
    '@media(min-width:881px){.an-layout{display:grid;grid-template-columns:146px minmax(0,1fr);column-gap:16px;align-items:start;align-content:start;grid-auto-rows:min-content}.an-layout>*{grid-column:2;min-width:0}.an-layout>.page-head{grid-column:1/-1}.an-layout>.an-navigation{grid-column:1;grid-row:2/span 24;position:static;align-self:stretch;background:transparent;border:0;padding:0;margin:0}.an-navigation-inner{position:sticky;top:12px;border-radius:12px;border:1px solid var(--line,#e8ebf0);padding:6px;background:var(--panel-solid,var(--bg,#fff))}.an-primary-row,.an-secondary-row{flex-direction:column;align-items:stretch}.an-primary-row button{justify-content:flex-start;padding:12px 9px}.an-primary-row svg{display:block}.an-secondary-row{margin-top:7px;padding-top:6px}.an-secondary-row button{text-align:left;padding:8px 9px}.an-layout>.sv31-controls{grid-column:2}}',
    '@media(max-width:380px){.an-primary-row button{font-size:12px;padding:9px 3px}}',
    '@media print{#content .an-layout{display:block}.an-layout>.an-navigation,.an-layout>.an-notice{display:none!important}}'
  ].join('\n');
  document.head.append(css);
  function boot(){
    sync();
    var root=document.getElementById('content');
    if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-display-off-v1']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
