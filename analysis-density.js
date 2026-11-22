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
  function write(n,copy){if(n&&n.textContent!==copy)n.textContent=copy;}
  function inlineNote(n,copy){
    if(!n)return;
    var d=n.closest('details.explain-v38');
    n.dataset.explainV38='1';
    if(d&&d.parentElement){d.before(n);d.remove();}
    write(n,copy);n.classList.add('ad-readable-note');
  }
  function readable(card,k){
    // Short explanations cover what a novice needs to read a result, not the
    // engineering implementation. Preserve original calculation tables.
    if(k==='deep'){
      var tip=card.querySelector('.dsb-tip');
      inlineNote(tip,'参考位置主要看近期成绩，波动范围还考虑平时起伏。两者算法不同，均不保证下次成绩。');
      var helpers=card.querySelectorAll('.dsb-summary-help');
      helpers.forEach(function(n){n.classList.add('ad-redundant');});
      card.querySelectorAll('.dsb-level-head').forEach(function(n){
        if(/^(近期表现|变化与依据)$/.test(n.textContent.trim()))n.classList.add('ad-redundant');
      });
      write(card.querySelector('.dsb-block-title'),'近期提醒');
      var privacy=card.querySelector('.dsb-privacy-note');
      write(privacy,'为改进预测，系统会统计匿名使用数据，不记录密码等敏感信息。');
      var map=[
        ['多场记录共同支持整体向好，不是只看最近一次成绩','近几场整体呈上升趋势。'],
        ['多场记录共同支持整体回落，建议结合近期学习和考试情况查看','近期整体有所回落，可结合复习情况查看。'],
        ['最近的表现可能出现了明显换挡，旧记录的参考价值正在下降','近期表现变化较大，早期成绩的参考价值可能降低。'],
        ['连续几场的小幅变化已经累积成提醒，建议关注是否存在持续原因','连续几场出现同方向的小幅变化，值得关注。'],
        ['目前以正常波动为主，没有发现需要特别提醒的长期方向或连续异动','近期以正常波动为主。']
      ];
      card.querySelectorAll('.dsb-plain-insights li').forEach(function(n){
        var t=n.textContent.trim();
        map.forEach(function(x){if(t===x[0])write(n,x[1]);});
        if(/^参考范围结合了近/.test(t))n.classList.add('ad-redundant');
        var m=t.match(/^有 (\d+) 场得分低于个人在相近排名下的通常水平/);
        if(m)write(n,'有 '+m[1]+' 场排名相近，但得分比平时低。');
        m=t.match(/^有 (\d+) 场得分高于个人在相近排名下的通常水平/);
        if(m)write(n,'有 '+m[1]+' 场排名相近，但得分比平时高。');
      });
      var cap=Array.from(card.querySelectorAll('.dsb-fig-cap')).find(function(n){return !n.closest('#dsbDistWrap')&&(/阴影带|灰点|蓝线/.test(n.textContent));});
      if(cap){
        var old=cap.textContent,hit=old.match(/命中\s*(\d+\/\d+)/)||old.match(/落入范围\s*(\d+\/\d+)/);
        inlineNote(cap,'灰点：实际排名；蓝线：较稳定的水平；灰带：当前水平的大致范围（不是下次预测）。右侧颜色越深，模型认为越可能落在附近。绿圈和红叉表示历史实际成绩是否落入当时预测范围，竖线为当时范围，蓝点为当时预测中心。'+(hit?' 历史落入范围 '+hit[1]+'。':''));
      }
      var dist=card.querySelector('#dsbDistWrap .dsb-fig-cap');
      if(dist&&/柱子 = 该名次段/.test(dist.textContent)){
        var goal=dist.textContent.match(/命中前\s*(\d+)%\s*的概率\s*≈\s*(\d+)%/);
        inlineNote(dist,'柱子越高，模型认为落入这段排名的可能性越大；例如前10%到15%的柱子为20%，表示估计有20%的可能落在这一段。蓝线表示模型估计的集中位置。'+(goal?' 进入前'+goal[1]+'%的参考概率约'+goal[2]+'%。':''));
      }
      var why=Array.from(card.querySelectorAll('details')).find(function(d){return d.querySelector('.dsb-why-grid');});
      if(why){
        write(why.querySelector('summary'),'怎么看');
        var spans=why.querySelectorAll('.dsb-why-grid > div > span');
        if(spans.length===4){
          write(spans[0],'例如100人中第20名、200人中第40名，都是前20%。');
          write(spans[1],'一次没考好，不一定说明长期退步。');
          write(spans[3],'参考过去的起伏估计下次范围；例如前10%～20%，并不保证下次一定落在其中。');
          var heads=why.querySelectorAll('.dsb-why-grid > div > b');
          ['统一排名','减少偶然波动影响','观察近期变化','估计下次范围'].forEach(function(v,i){write(heads[i],v);});
        }
      }
    }
    if(k==='matrix'){
      var note=card.querySelector('.matrix-reading-v60'),active=card.querySelector('[data-analysis-matrix-v60][aria-pressed="true"]');
      if(note&&active){
        var m=active.dataset.analysisMatrixV60;
        write(note,m==='difficulty'?'50为平均难度，90表示估计偏难，并非90%的难度。† 为粗略参考；— 为缺少数据。':m==='score'?'例如90%：满分100得90分，满分150得135分。— 为缺少数据。':'例如20：排名前20%，即100人中约第20名。数字越小越靠前；— 为缺少数据。');
      }
    }
    if(k==='structure'){
      var h=card.querySelector('.card-title-row .card-sub');
      inlineNote(h,'比六科典型：例如你各科通常在前30%，数学在前20%，则数学比典型水平靠前10个百分点（+10）。');
    }
    if(k==='worth'){
      var d=card.querySelector('.worth-method');
      if(d)write(d.querySelector('summary'),'怎么看与计算依据');
      var hint=card.querySelector('.ad-worth-example');
      if(!hint&&card.querySelector('.worth-compare')){
        hint=document.createElement('p');hint.className='ad-worth-example ad-readable-note';
        hint.textContent='例如实际90分、换算95分，表示在所选参照难度下估计约95分，不是加分或下次预测。';
        card.querySelector('.worth-compare').after(hint);
      }
    }
    if(k==='peer'){
      var help=card.querySelector('.st-peer-help');
      if(help&&!help.dataset.adPlain){
        help.dataset.adPlain='1';
        write(help.querySelector('summary'),'怎么看');
        var paras=help.querySelectorAll(':scope > p');
        if(paras.length>=4){
          var overlap=/重合模式/.test(paras[0].textContent);
          write(paras[0],overlap?'轨迹重合：找排名或得分水平与你接近的人，直接参考他们后来的成绩。':'走势相似：例如你从前30%进到前20%，另一人从前50%进到前40%，变化方向相近。系统先对齐最近水平，再比较后续变化。超出0～100%的部分按边界显示。');
          write(paras[1],'预测主要参考你最近三次有效成绩的中间水平（75%），再结合相似用户后续表现（25%）。越相似、记录越多，默认参考价值越高。最多参考20人，图中默认展示3条。');
          write(paras[2],'有2次有效记录可看初步参考，满3次才可预测。相似度90%不代表预测有90%的准确率。缺少所选指标的记录会跳过。');
          write(paras[3],'仅匹配同分类只限制参考对象。不同学校、考试难度可能不同，预测仅供参考。');
        }
      }
    }
  }
  function simpleMore(card,k){
    if(!k)return;
    var ds=Array.from(card.querySelectorAll('details[data-ad-level]')).filter(function(d){
      return d.dataset.adLevel!=='simple'&&!d.parentElement.closest('details[data-ad-level]');
    });
    var tabs=Array.from(card.querySelectorAll('table[data-ad-table]'));
    var old=card.querySelector('[data-ad-more]');
    if(!ds.length&&!tabs.length){if(old)old.remove();return;}
    var key='more:'+k,expanded=!!preference.get(settingKey(key));
    // One lightweight entry per card in simple mode; no stack of closed panels.
    // Detailed calculations remain individually expandable after opening it.
    ds.forEach(function(d){d.toggleAttribute('data-ad-suppressed',mode==='simple'&&!expanded);});
    card.querySelectorAll('[data-ad-columns]').forEach(function(b){b.hidden=mode==='simple'||(b.getAttribute('aria-expanded')==='true');});
    if(!old){
      old=document.createElement('button');old.type='button';old.className='ad-more-link';old.dataset.adMore=k;
      var body=card.querySelector(':scope > .fold-body-v38')||card;
      body.append(old);
      old.addEventListener('click',function(){
        var on=!preference.get(settingKey(key));preference.set(settingKey(key),on);
        Array.from(card.querySelectorAll('details[data-ad-level]')).filter(function(d){
          return d.dataset.adLevel!=='simple'&&!d.parentElement.closest('details[data-ad-level]');
        }).forEach(function(d){
          var technical=/deep-calc|worth-method/.test(d.dataset.adToken||'');
          d.open=on&&!technical;preference.set(d.dataset.adToken,d.open);
        });
        card.querySelectorAll('table[data-ad-table]').forEach(function(t){preference.set(settingKey('columns:'+t.dataset.adTable),on);});
        apply();
      });
    }
    old.hidden=mode!=='simple';old.setAttribute('aria-expanded',String(expanded));
    write(old,expanded?'收起补充分析  ↑':'更多分析  ↓');
  }
  function apply(){
    var page=document.querySelector('#content .sv31-page');
    if(!page||typeof state!=='undefined'&&state.page!=='stats')return;
    loadMode();
    var old=page.dataset.adDensity;if(old!==mode)page.dataset.adDensity=mode;
    var cards=Array.from(page.children).filter(function(c){return c.classList.contains('card');});
    cards.forEach(function(card){
      var k=kind(card);
      readable(card,k);
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
      simpleMore(card,k);
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
    '.sv31-page [data-ad-suppressed],.sv31-page .ad-redundant,.sv31-page .ad-more-link[hidden]{display:none!important}',
    '.sv31-page .ad-more-link{display:block;margin:8px 0 0 auto;border:0;background:transparent;padding:6px 2px;color:var(--accent,#5d72e8);font:inherit;font-size:12px;cursor:pointer}',
    '.sv31-page .ad-readable-note{font-size:12px!important;line-height:1.65!important;color:var(--muted,#788392);opacity:1!important;margin:7px 0!important}',
    '.sv31-page #dsbRoot .dsb-tip.ad-readable-note{background:none;border:0;padding:0;font-size:11px!important}.sv31-page #dsbRoot .dsb-plain-insights{margin:5px 0 8px}.sv31-page #dsbRoot .dsb-plain-insights li{line-height:1.6;margin:3px 0}',
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
    '.sv31-page .ad-section[open]{border:0;background:none;border-radius:0}.sv31-page .ad-section[open]>summary{border:0;padding:5px 0}.sv31-page .ad-section[open]>:not(summary){margin:5px 0!important;max-width:100%}',
    '.sv31-page .ad-section:not([open]){border:0;border-radius:0;margin:5px 0}.sv31-page .ad-section:not([open])>summary{padding:6px 0;color:var(--accent,#5d72e8);font-weight:500}',
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
