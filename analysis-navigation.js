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
  function displayTitle(title,key){var clean=String(title||'').trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]+\s*/,'');return key==='deep'&&clean==='深度分析'?'学习状态预测':clean;}
  function cardOrder(title,key){
    var group=classify(title,key),g=['overview','trend','subject','forecast','methods'].indexOf(group)*100;
    if(key==='kpi')return g;
    if(/智能提醒/.test(title))return g+10;
    if(key==='matrix')return g+20;
    if(/个人最佳/.test(title))return g+30;
    if(key==='trend')return g;
    if(key==='worth')return g+10;
    if(/名次竞争力/.test(title))return g+20;
    if(key==='distribution')return g+30;
    if(/学科结构/.test(title))return g;
    if(key==='speed')return g+10;
    if(/目标校准|目标分析/.test(title))return g;
    if(key==='peer')return g+10;
    if(key==='deep')return g+20;
    return g+40;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={classify:classify,normalize:normalize,groups:groups,displayTitle:displayTitle,cardOrder:cardOrder};return;}
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
      if(peer)makeCard(page,peer,'peer',null,trend);
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
  function tidyTitle(card,key){
    var h=key==='deep'?card.querySelector('.dsb-head > span'):card.querySelector('.card-title');
    if(h){
      Array.from(h.childNodes).filter(function(n){return n.nodeType===3;}).forEach(function(n){
        var raw=n.nodeValue, next=displayTitle(raw,key);
        if(raw.trim()&&next!==raw.trim())n.nodeValue=next;
      });
      var fold=card.querySelector('.fold-toggle-v38');
      if(fold&&key==='deep'){
        var label=(fold.getAttribute('aria-expanded')==='false'?'展开':'收起')+'学习状态预测';
        if(fold.getAttribute('aria-label')!==label)fold.setAttribute('aria-label',label);
        if(fold.title!==label)fold.title=label;
      }
    }
    if(key==='deep'){
      var head=card.querySelector('.dsb-head');
      if(head&&!head.querySelector('.an-model-hint')){
        var hint=document.createElement('small');hint.className='an-model-hint';hint.textContent='根据个人历史估计稳定水平与未来表现';head.append(hint);
      }
    }
    if(key==='peer'){
      var heading=card.querySelector('.st-peer-heading > div'), title=heading&&heading.querySelector('h4');
      if(title&&!heading.querySelector('.an-model-hint')){
        var hint=document.createElement('small');hint.className='an-model-hint';hint.textContent='参考相似历史轨迹的后续表现';title.after(hint);
      }
      var notice=card.querySelector('.st-peer-notice > span');
      var copy='已参与匿名匹配。其他用户只能看到匿名成绩趋势，不会看到用户名、学校或考试名称。可随时关闭共享。';
      if(notice&&notice.textContent!==copy)notice.textContent=copy;
    }
  }
  function orderCards(page,cards){
    var sorted=cards.slice().sort(function(a,b){return cardOrder(cardTitle(a),keyFor(a))-cardOrder(cardTitle(b),keyFor(b));});
    if(sorted.every(function(c,i){return c===cards[i];}))return sorted;
    var cursor=page.querySelector(':scope > .an-notice');
    for(var i=sorted.length-1;i>=0;i--){
      var c=sorted[i];if(c.nextElementSibling!==cursor)page.insertBefore(c,cursor);cursor=c;
    }
    return sorted;
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
    var cards=orderCards(page,Array.from(page.children).filter(function(c){return c.classList.contains('card');}));
    cards.forEach(function(c){
      var key=keyFor(c), group=classify(cardTitle(c),key);
      if(c.dataset.anKind!==key)c.dataset.anKind=key;
      tidyTitle(c,key);
      var selected=active==='all'||group===active;
      // Keep empty-state information discoverable in every category.
      if(/当前范围暂无可分析成绩/.test(cardTitle(c)))selected=true;
      var pref=isPreferenceHidden(c,page);
      if(selected){if(pref)count++;if(!pref||reveal)visible++;}
      c.toggleAttribute('data-an-off',!selected);
      c.toggleAttribute('data-an-pref-off',pref&&!reveal);
      c.toggleAttribute('data-an-show-pref',selected&&reveal&&pref);

    });
    page.toggleAttribute('data-an-reveal',reveal);
    nav.querySelectorAll('[data-analysis-nav]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.dataset.analysisNav===active));
      b.classList.toggle('is-active',b.dataset.analysisNav===active);
    });
    updateNotice(page,count,visible);
    var rows=Math.max(2,1+visible+(page.querySelector(':scope > .an-notice')?1:0));
    var span='span '+rows;if(nav.style.gridRowEnd!==span)nav.style.gridRowEnd=span;
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
    '.an-layout>.card[data-an-kind="peer"] .st-peer{margin-top:0!important;padding-top:0!important;border-top:0!important}',
    '.an-layout .st-peer-heading{gap:6px}.an-layout .st-peer-heading h4,.an-layout #dsbRoot .dsb-head>span{font-size:16px!important;font-weight:700;line-height:1.45}',
    '.an-model-hint{display:block;color:var(--muted,#788392);font-size:11px;line-height:1.6;font-weight:400;margin-top:3px}',
    '.an-layout #dsbRoot .dsb-head{margin-bottom:10px;gap:6px}.an-layout #dsbRoot .dsb-head .an-model-hint{flex-basis:100%;margin-top:0;order:3}',
    '.an-layout #dsbRoot{margin-top:0!important}.an-layout .st-peer-heading p{margin:6px 0 0}.an-layout .st-peer-count{margin-top:3px}',
    '.an-layout .st-peer-notice{padding:8px 10px;margin-top:10px;background:var(--chip-bg,var(--cell,#f6f7fa));border-radius:8px;align-items:center}.an-layout .st-peer-notice button{flex:none;white-space:nowrap}',
    '.an-layout .st-peer-controls{margin:12px 0 8px;gap:8px}.an-layout .st-peer-modes{margin-top:8px}.an-layout .st-peer-settings{margin:10px 0 12px}.an-layout .st-peer-qualification{margin:10px 0}',
    '.an-navigation .an-secondary-row button:not(.is-active){font-weight:400;color:var(--muted,#788392)}',
    '.an-layout .an-split-card[data-an-kind="speed"]>div>b,.an-layout .an-split-card[data-an-kind="distribution"] [data-matrix-distribution-heading]{font-size:16px!important;font-weight:700}',
    '@media(max-width:620px){.an-layout .st-peer-notice{align-items:flex-start}.an-layout .st-peer-heading h4,.an-layout #dsbRoot .dsb-head>span{font-size:15px!important}}',
    '@media(min-width:881px){.an-layout{display:grid;grid-template-columns:146px minmax(0,1fr);column-gap:16px;align-items:start;align-content:start;grid-auto-rows:min-content}.an-layout>*{grid-column:2;min-width:0}.an-layout>.page-head{grid-column:1/-1}.an-layout>.an-navigation{grid-column:1;grid-row:2/span 24;position:static;align-self:stretch;background:transparent;border:0;padding:0;margin:0}.an-navigation-inner{position:sticky;top:12px;border-radius:12px;border:1px solid var(--line,#e8ebf0);padding:6px;background:var(--panel-solid,var(--bg,#fff))}.an-primary-row,.an-secondary-row{flex-direction:column;align-items:stretch}.an-primary-row button{justify-content:flex-start;padding:12px 9px}.an-primary-row svg{display:block}.an-secondary-row{margin-top:7px;padding-top:6px}.an-secondary-row button{text-align:left;padding:8px 9px}.an-layout>.sv31-controls{grid-column:2}}',
    '@media(max-width:380px){.an-primary-row button{font-size:12px;padding:9px 3px}}',
    '@media print{#content .an-layout{display:block}.an-layout>.an-navigation,.an-layout>.an-notice{display:none!important}}'
  ].join('\n');
  document.head.append(css);
  function boot(){
    // #content is created after sign-in and replaced by render() on navigation.
    // #app is the persistent shell; observe it even while the login screen is open.
    var root=document.getElementById('app')||document.body;
    if(root&&typeof MutationObserver==='function'){
      new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-display-off-v1']});
    }
    // Run immediately on statistics render, including filter-driven rebuilds.
    if(typeof window.renderPage==='function'){
      var previous=window.renderPage;
      window.renderPage=function(){
        var result=previous.apply(this,arguments);
        sync();return result;
      };
    }
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
