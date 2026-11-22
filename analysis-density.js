/* Analysis density is independent of card visibility. Keep every source node and
 * its event handlers; only supplemental, independently intelligible content is folded. */
(function(){
  'use strict';
  var modes=['simple','standard','full'];
  function normalized(mode){return modes.includes(mode)?mode:'standard';}
  function defaultOpen(mode,level){return modes.indexOf(normalized(mode))>=modes.indexOf(level);}
  function insightCuts(important, count){
    var last=0;important.forEach(function(v,i){if(v)last=i+1;});
    return {simple:Math.min(count,Math.max(4,last)),standard:Math.min(count,Math.max(6,last))};
  }
  // Table columns are selected by header, not by position alone. Never hide
  // current value, direction, score/rank units, recommendations or warnings.
  var extraColumns={
    hall:['历次小走势','考到于'],
    structure:['比六科典型'],
    calib:['参照(你考过的场次)']
  };
  function columnIndices(key,headers){return headers.map(function(h,i){return (extraColumns[key]||[]).includes(String(h).trim())?i:-1;}).filter(function(i){return i>=0;});}
  if(typeof module!=='undefined'&&module.exports){module.exports={normalized:normalized,defaultOpen:defaultOpen,insightCuts:insightCuts,columnIndices:columnIndices};return;}
  if(typeof document==='undefined')return;
  var preference=new Map(),queued=false,currentOwner='',mode='standard';
  function loadMode(){
    var api=window.ScoreDisplayDensity;mode=normalized(api&&api.get());var owner=api?api.owner():'guest';
    if(owner!==currentOwner){currentOwner=owner;preference.clear();}
    return mode;
  }
  function settingKey(key){return mode+':'+key;}
  function targetOpen(key,level){var k=settingKey(key);return preference.has(k)?preference.get(k):defaultOpen(mode,level);}
  function installDisclosure(d,key,level){
    if(!d)return;
    var token=settingKey(key);
    if(d.dataset.adToken===token)return;
    d.dataset.adToken=token;
    d.dataset.adLevel=level;
    d.open=targetOpen(key,level);
    // Only a user activation records an override. Programmatic open/close and
    // async toggle events caused by re-render must not overwrite preferences.
    if(!d._adBound){
      d._adBound=true;
      d.addEventListener('click',function(e){
        var summary=e.target.closest('summary');
        if(summary&&summary.parentElement===d)preference.set(d.dataset.adToken,!d.open);
      });
    }
  }
  function wrap(nodes,key,label,level){
    nodes=nodes.filter(Boolean);if(!nodes.length)return null;
    var first=nodes[0],p=first.parentElement;
    if(!p)return null;
    var existing=first.closest('details[data-ad-group]');
    if(existing&&existing.dataset.adGroup===key){installDisclosure(existing,key,level);return existing;}
    if(nodes.some(function(n){return n.parentElement!==p;}))return null;
    var d=document.createElement('details');d.className='ad-section';d.dataset.adGroup=key;
    var h=document.createElement('summary');h.textContent=label;
    d.append(h);p.insertBefore(d,first);nodes.forEach(function(n){d.append(n);});
    installDisclosure(d,key,level);
    return d;
  }
  function group(card,key,label,level,find){
    var existing=card.querySelector('details[data-ad-group="'+key+'"]');
    if(existing){installDisclosure(existing,key,level);return existing;}
    return wrap(find(card),key,label,level);
  }
  function existing(card,selector,key,level){
    installDisclosure(card.querySelector(selector),key,level);
  }
  function table(card,key){
    var t=card.querySelector('.sv31-scroll table');
    if(!t||!t.tHead||!t.tHead.rows.length)return;
    var heads=Array.from(t.tHead.rows[0].cells).map(function(h){return h.textContent.trim();});
    var indices=columnIndices(key,heads);if(!indices.length)return;
    var box=t.closest('.sv31-scroll');
    if(!box)return;
    if(!t.hasAttribute('data-ad-table')){
      // Don't apply column rules to merged or changed table schemas.
      if(Array.from(t.rows).some(function(r){return r.cells.length!==heads.length||Array.from(r.cells).some(function(c){return c.colSpan!==1||c.rowSpan!==1;});}))return;
      Array.from(t.rows).forEach(function(r){indices.forEach(function(i){r.cells[i].setAttribute('data-ad-extra-col','');});});
      t.dataset.adTable=key;
    }
    var b=box.nextElementSibling;
    if(!b||b.dataset.adColumns!==key){
      b=document.createElement('button');b.type='button';b.className='ad-columns';b.dataset.adColumns=key;box.after(b);
      b.addEventListener('click',function(){
        var k=settingKey('columns:'+key);preference.set(k,t.hasAttribute('data-ad-compact'));apply();
      });
    }
    var expanded=targetOpen('columns:'+key,'standard');
    t.toggleAttribute('data-ad-compact',!expanded);
    b.setAttribute('aria-expanded',String(expanded));
    var label=expanded?'收起补充列':'展开补充列';
    if(b.textContent!==label)b.textContent=label;
    b.hidden=mode!=='simple'&&expanded;
  }
  function title(card){var h=card.querySelector('.card-title');return h?h.textContent.trim():'';}
  function kind(card){
    var k=card.dataset.anKind||'';
    if(k)return k;
    var t=title(card);
    if(/智能提醒/.test(t))return 'insights';
    if(/学科结构/.test(t))return 'structure';
    if(/个人最佳/.test(t))return 'hall';
    if(/目标校准/.test(t))return 'calib';
    if(/名次竞争力/.test(t))return 'comp';
    return '';
  }
  function insights(card){
    var all=Array.from(card.querySelectorAll('.sv31-insight'));
    if(!all.length)return;
    var cut=insightCuts(all.map(function(n){return n.matches('.i-mile,.i-risk,.i-warn');}),all.length);
    group(card,'insights-full','其余提醒','full',function(){return all.slice(cut.standard);});
    group(card,'insights-standard','更多提醒','standard',function(){return all.slice(cut.simple,cut.standard);});
  }
  function apply(){
    var page=document.querySelector('#content .sv31-page');
    if(!page||typeof state!=='undefined'&&state.page!=='stats')return;
    loadMode();
    var old=page.dataset.adDensity;if(old!==mode)page.dataset.adDensity=mode;
    var cards=Array.from(page.children).filter(function(c){return c.classList.contains('card');});
    cards.forEach(function(card){
      var k=kind(card);
      switch(k){
        case'insights':insights(card);break;
        case'hall':case'calib':table(card,k);break;
        case'structure':
          table(card,k);
          group(card,'structure-catch','追赶参考','standard',function(c){
            var n=c.querySelector('.sv31-catch'),g=n&&n.closest('.sv31-g2');return g&&g.children.length===2?[g.children[1]]:[];
          });break;
        case'trend':
          group(card,'trend-gap','最高分差距','standard',function(c){
            var n=Array.from(c.querySelectorAll('.card-sub')).find(function(v){return /最高分差距/.test(v.textContent);});
            return n?[n.closest('.explain-v38')||n]:[];
          });break;
        case'matrix':
          group(card,'matrix-records','个人纪录','standard',function(c){
            var n=c.querySelector('.sv31-ext-grid');return n&&n.parentElement?[n.parentElement]:[];
          });break;
        case'comp':
          group(card,'comp-subject','各科相对表现','standard',function(c){
            var g=c.querySelector('.sv31-g2');return g&&g.children.length===2?[g.children[1]]:[];
          });break;
        case'worth':
          existing(card,'.worth-records','worth-records','full');
          // Lift the numerical difficulty summary and its scale explanation out
          // of the long method text. Keep them together so the scale is readable.
          var method=card.querySelector('.worth-method'),diff=method&&method.querySelector('.worth-difficulty');
          if(diff){
            var next=diff.nextElementSibling;
            var moved=[diff];if(next&&next.matches('.worth-note')&&/平均难度/.test(next.textContent))moved.push(next);
            moved.forEach(function(n){method.before(n);});
            wrap(moved,'worth-difficulty','参照难度详情','standard');
          }
          var diffGroup=card.querySelector('details[data-ad-group="worth-difficulty"]');
          if(diffGroup)installDisclosure(diffGroup,'worth-difficulty','standard');
          // Keep all score/benchmark selectors, both estimates, current difficulty,
          // low-confidence warnings and the limit notice visible in every mode.
          existing(card,'.worth-method','worth-method','full');
          break;
        case'peer':
          // The reference selection buttons double as the chart legend. Do not hide
          // them, qualification notices, scope, interval or privacy controls.
          existing(card,'.st-peer-details','peer-history','full');
          break;
        case'deep':
          group(card,'deep-distribution','下一场落点分布','standard',function(c){
            var n=c.querySelector('#dsbDistWrap');return n&&n.closest('.dsb-fig')?[n.closest('.dsb-fig')]:[];
          });
          group(card,'deep-calc','计算细节','full',function(c){
            var n=c.querySelector('.dsb-grid2');if(!n)return [];
            var h=n.previousElementSibling;
            return h&&h.matches('.dsb-level-head')?[h,n]:[n];
          });
          var why=Array.from(card.querySelectorAll('details')).find(function(d){return d.querySelector('.dsb-why-grid');});
          installDisclosure(why,'deep-why','standard');
          var calc=card.querySelector('.dsb-grid2');
          if(calc)Array.from(calc.querySelectorAll(':scope > details')).forEach(function(d){
            var summary=d.querySelector('summary'),name=summary&&summary.textContent.trim();
            if(['长期方向检验','突然变化与连续偏移','分数与排名是否一致'].includes(name))installDisclosure(d,'deep-detail:'+name,'full');
          });
          // The main trajectory caption explains interval semantics and colors,
          // so it must remain available without an extra click by default.
          var caption=Array.from(card.querySelectorAll('.dsb-fig-cap')).find(function(n){return /阴影带|排名位置/.test(n.textContent);});
          if(caption)installDisclosure(caption.closest('details.explain-v38'),'deep-chart-legend','simple');
          break;
      }
    });
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;apply();});}
  // Render all actual reminders through the original renderer. The presentation
  // layer folds lower-priority tails; the existing evidence buttons remain bound.
  if(typeof window.insightsHtmlV32==='function'){
    var renderInsights=window.insightsHtmlV32;
    window.insightsHtmlV32=function(ins){
      return renderInsights.call(this,ins&&Array.isArray(ins.all)?Object.assign({},ins,{visible:ins.all,rest:0}):ins);
    };
  }
  var style=document.createElement('style');style.id='analysis-density-style';
  style.textContent=[
    '.sv31-page .ad-section{margin:10px 0 0;padding:0;border:1px solid var(--line,#e8ebf0);border-radius:10px;background:transparent;min-width:0}',
    '.sv31-page .ad-section>summary{padding:10px 12px;cursor:pointer;color:var(--muted,#788392);font-size:12px;font-weight:600;line-height:1.5}',
    '.sv31-page .ad-section[open]>summary{border-bottom:1px solid var(--line,#e8ebf0)}',
    '.sv31-page .ad-section[open]>:not(summary){margin:8px 10px!important;max-width:calc(100% - 20px);min-width:0}',
    '.sv31-page .ad-section>summary:focus-visible,.sv31-page .ad-columns:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:2px}',
    '.sv31-page table[data-ad-compact] [data-ad-extra-col]{display:none!important}',
    '.sv31-page .ad-columns{display:block;margin:7px 0 0 auto;padding:6px 9px;border:0;border-radius:7px;color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff);cursor:pointer;font:inherit;font-size:11px}',
    '.sv31-page .ad-columns[hidden]{display:none!important}',
    '.sv31-page .sv31-g2:has(>details.ad-section:not([open])){grid-template-columns:minmax(0,1fr)!important}',
    '.sv31-page .ad-section[data-ad-group="matrix-records"]>div>b{display:block;color:var(--muted,#788392);font-weight:500;font-size:12px!important}.sv31-page .ad-section[data-ad-group="deep-calc"]>.dsb-level-head,.sv31-page .ad-section[data-ad-group="deep-distribution"] .dsb-fig-title{display:none}',
    '@media print{.sv31-page table[data-ad-compact] [data-ad-extra-col]{display:table-cell!important}.sv31-page .ad-columns{display:none!important}}'
  ].join('\n');
  document.head.append(style);
  function boot(){
    var app=document.getElementById('app')||document.body;
    if(app&&typeof MutationObserver==='function')new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    document.addEventListener('st:analysis-density-change',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
