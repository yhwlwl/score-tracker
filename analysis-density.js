/* Analysis density is independent of card visibility. Keep every source node and
 * its event handlers; only supplemental, independently intelligible content is folded. */
(function(){
  'use strict';
  var modes=['simple','standard','full'];
  function normalized(mode){return modes.includes(mode)?mode:'standard';}
  function defaultOpen(mode,level){return modes.indexOf(normalized(mode))>=modes.indexOf(level);}
  function layerDefault(mode){return normalized(mode)==='full';}
  function suppressSupplement(mode,expanded,level){return normalized(mode)==='simple'&&!expanded&&level!=='simple';}
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
  if(typeof module!=='undefined'&&module.exports){module.exports={normalized:normalized,defaultOpen:defaultOpen,insightCuts:insightCuts,columnIndices:columnIndices,suppressSupplement:suppressSupplement,layerDefault:layerDefault};return;}
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
      if(!card.querySelector('.ad-chart-reading'))inlineNote(tip,'参考位置与波动范围来自不同方法，均仅供参考。记录少时范围更不稳定。');
      var goalBox=card.querySelector('.dsb-goal-box');
      if(goalBox){
        write(goalBox.querySelector('.dsb-summary-label'),'进入目标排名的可能性');
        var input=goalBox.querySelector('#dsbGoalPct');
        if(input&&!input.hasAttribute('data-ad-unit')){
          var pre=document.createElement('span'),post=document.createElement('span');pre.textContent='前';post.textContent='%';pre.className=post.className='ad-goal-unit';
          input.before(pre);input.after(post);input.setAttribute('data-ad-unit','');
        }
        write(goalBox.querySelector('#dsbGoalBtn'),'查看概率');
      }
      var helpers=card.querySelectorAll('.dsb-summary-help');
      if(!card.querySelector('.ad-chart-reading'))helpers.forEach(function(n){n.classList.add('ad-redundant');});
      card.querySelectorAll('.dsb-level-head').forEach(function(n){
        if(/^(近期表现|变化与依据)$/.test(n.textContent.trim()))n.classList.add('ad-redundant');
      });
      write(card.querySelector('.dsb-block-title'),'近期提醒');
      var privacy=card.querySelector('.dsb-privacy-note');
      if(privacy&&!privacy.dataset.adPrivacy)write(privacy,'为改进预测，系统会统计匿名使用数据，不记录密码等敏感信息。');
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
      if(cap&&!card.querySelector('.ad-chart-reading')){
        var old=cap.textContent,hit=old.match(/命中\s*(\d+\/\d+)/)||old.match(/落入范围\s*(\d+\/\d+)/);
        inlineNote(cap,'灰点：实际排名；蓝线：较稳定的水平；灰带：当前水平的大致范围（不是下次预测）。右侧颜色越深，模型认为越可能落在附近。绿圈和红叉表示历史实际成绩是否落入当时预测范围，竖线为当时范围，蓝点为当时预测中心。'+(hit?' 历史落入范围 '+hit[1]+'。':''));
      }
      var dist=card.querySelector('#dsbDistWrap .dsb-fig-cap');
      if(dist&&/柱子 = 该名次段/.test(dist.textContent)){
        var goal=dist.textContent.match(/命中前\s*(\d+)%\s*的概率\s*≈\s*(\d+)%/);
        inlineNote(dist,'柱子越高，落在该段排名的估计机会越大。例：前10%～15%的柱子为20%，即估计有20%的机会落在这一段。蓝色曲线表示模型更集中的位置。'+(goal?' 进入前'+goal[1]+'%的参考概率约'+goal[2]+'%。':''));
      }else if(dist&&/累计命中概率/.test(dist.textContent)){
        var cum=dist.textContent.match(/考进前(\d+)%\s*≈\s*(\d+)%/), mid=dist.textContent.match(/状态模型中心（([^）]+)）/);
        inlineNote(dist,'在横轴找到目标排名，再向上找到曲线，向左读概率。'+(cum?'例如按当前模型，进入前'+cum[1]+'%的机会约为'+cum[2]+'%。':'例如前20%处读到60%，表示估计有60%的机会进入前20%。')+(mid?' 曲线到50%的位置：'+mid[1]+'。':''));
      }else if(dist&&/发挥距离.*标尺/.test(dist.textContent)){
        var tgt=dist.textContent.match(/目标前(\d+)%/), bins=dist.textContent.match(/分为\s*(\d+)\s*格/);
        inlineNote(dist,'越靠前，进一步提升排名通常越难。此图按相等的发挥幅度分组，柱越高，落入这段的估计机会越大。'+(tgt?'蓝色柱表示达到前'+tgt[1]+'%的区域。':'')+(bins?'当前'+bins[1]+'格；调整格数只改变图的细度。':''));
      }
      var views=card.querySelector('[data-dsb-view-select]');
      if(views)Array.from(views.options).forEach(function(o){var names={band:'排名区间',zmap:'发挥水平',cum:'目标达成概率'};if(names[o.value])write(o,names[o.value]);});
      var why=Array.from(card.querySelectorAll('details')).find(function(d){return d.querySelector('.dsb-why-grid');});
      if(why){
        write(why.querySelector('summary'),'判断依据');
        var spans=why.querySelectorAll('.dsb-why-grid > div > span');
        if(spans.length===4){
          write(spans[0],'例如100人中第20名、200人中第40名，都是前20%。');
          write(spans[1],'一次没考好，不一定说明长期退步。');
          var plain=spans[2].textContent.replace('暂未看出稳定的长期方向','暂时看不出持续进步或退步').replace('多场记录共同支持整体向好','近几场整体进步').replace('多场记录共同支持整体回落','近几场整体回落').replace('近期可能出现了较明显的状态切换','最近表现可能与之前明显不同').replace('近期没有发现明确的突然换挡','最近没有明显的突然变化').replace('连续几场的小幅偏移已经累积成提醒','连续几场小幅变化，值得关注').replace('连续小幅偏移尚未达到提醒条件','连续小幅变化还不明显');
          write(spans[2],plain);
          write(spans[3],'参考过去的起伏估计下次范围；例如前10%～20%，并不保证下次一定落在其中。');
          var heads=why.querySelectorAll('.dsb-why-grid > div > b');
          ['统一排名','减少偶然波动影响','观察近期变化','估计下次范围'].forEach(function(v,i){write(heads[i],v);});
        }
      }
    }
    if(k==='structure'){
      var h=card.querySelector('.card-title-row .card-sub');
      if(h&&!h.classList.contains('ad-redundant')&&!h.classList.contains('ad-readable-note'))inlineNote(h,'比六科典型：例如你各科通常在前30%，数学在前20%，则数学比典型水平靠前10个百分点（+10）。');
    }
    if(k==='calib'){
      var calibSub=card.querySelector('.card-title-row .card-sub');if(calibSub&&!calibSub.classList.contains('ad-keyline'))inlineNote(calibSub,'下次建议以排名为准，例如前20%就是100人中约第20名。参考分取自你以前考过的试卷。');
    }
    if(k==='hall'){
      var hallSub=card.querySelector('.card-title-row .card-sub');if(hallSub&&!hallSub.classList.contains('ad-keyline'))inlineNote(hallSub,'满分不同时比较得分率，例如90/100与135/150都是90%。');
    }
    if(k==='worth'){
      var d=card.querySelector('.worth-method');
      if(d)write(d.querySelector('summary'),'计算依据');
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
  function node(tag,cls,copy){var n=document.createElement(tag);if(cls)n.className=cls;if(copy)n.textContent=copy;return n;}
  var sketches={
    trend:'<path d="M4 34L19 15L34 27L49 7L64 16" fill="none" stroke="currentColor" opacity=".35"/><path d="M4 29Q34 25 64 13" fill="none" stroke="var(--accent,#5d72e8)" stroke-width="2.5"/>',
    band:'<path d="M4 12L34 5L64 10V29L34 24L4 34Z" fill="currentColor" opacity=".13"/><path d="M4 23L34 15L64 20" stroke="var(--accent,#5d72e8)" stroke-width="2" fill="none"/>',
    future:'<rect x="21" y="4" width="28" height="30" rx="3" fill="var(--accent,#5d72e8)" opacity=".12"/><rect x="21" y="12" width="28" height="13" fill="var(--accent,#5d72e8)" opacity=".36"/><path d="M5 18H64" stroke="var(--accent,#5d72e8)" stroke-dasharray="3 3"/>',
    rank:'<rect x="4" y="15" width="60" height="10" rx="5" fill="currentColor" opacity=".12"/><rect x="4" y="15" width="12" height="10" rx="5" fill="var(--accent,#5d72e8)"/><path d="M16 10V30" stroke="var(--accent,#5d72e8)" stroke-width="2"/><text x="16" y="8" text-anchor="middle" font-size="8" fill="currentColor">20%</text>',
    score:'<rect x="4" y="7" width="60" height="9" rx="3" fill="currentColor" opacity=".1"/><rect x="4" y="7" width="54" height="9" rx="3" fill="var(--accent,#5d72e8)" opacity=".7"/><rect x="4" y="24" width="60" height="9" rx="3" fill="currentColor" opacity=".1"/><rect x="4" y="24" width="54" height="9" rx="3" fill="var(--accent,#5d72e8)" opacity=".7"/>',
    difficulty:'<rect x="4" y="15" width="20" height="10" rx="2" fill="var(--accent,#5d72e8)" opacity=".15"/><rect x="24" y="15" width="20" height="10" fill="var(--accent,#5d72e8)" opacity=".4"/><rect x="44" y="15" width="20" height="10" rx="2" fill="var(--accent,#5d72e8)" opacity=".8"/><path d="M58 7L54 12H62Z" fill="var(--accent,#5d72e8)"/><text x="58" y="6" font-size="7" text-anchor="middle" fill="currentColor">90</text>',
    quad:'<path d="M34 3V36M4 20H64" stroke="currentColor" opacity=".3" stroke-dasharray="3 2"/><rect x="34" y="3" width="30" height="17" fill="var(--green,#32a77a)" opacity=".13"/><circle cx="53" cy="10" r="4" fill="var(--green,#32a77a)"/><path d="M57 29L61 25L65 29M61 25V36" stroke="var(--accent,#5d72e8)" fill="none"/>',
    pair:'<path d="M4 30L22 24L43 15L64 9M4 34L22 28L43 19L64 13" stroke="var(--accent,#5d72e8)" fill="none" stroke-width="2"/><path d="M43 19L64 13" stroke="currentColor" stroke-dasharray="3 2" fill="none"/>',
    history:'<path d="M15 9V30M34 5V32M53 12V32" stroke="#2e9e6b" stroke-width="1.7"/><circle cx="15" cy="20" r="4" fill="none" stroke="#2e9e6b"/><circle cx="34" cy="14" r="4" fill="none" stroke="#2e9e6b"/><path d="M49 3L57 11M57 3L49 11" stroke="#d4574e" stroke-width="1.7"/>',
    donut:'<circle cx="34" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="8" opacity=".12"/><circle cx="34" cy="20" r="13" fill="none" stroke="var(--accent,#5d72e8)" stroke-width="8" stroke-dasharray="32.7 81.7" transform="rotate(-90 34 20)"/><text x="34" y="23" text-anchor="middle" font-size="8" fill="currentColor">40%</text>',
    bars:'<rect x="6" y="24" width="13" height="12" rx="2" fill="var(--accent,#5d72e8)" opacity=".3"/><rect x="26" y="7" width="13" height="29" rx="2" fill="var(--accent,#5d72e8)" opacity=".8"/><rect x="46" y="18" width="13" height="18" rx="2" fill="var(--accent,#5d72e8)" opacity=".45"/>',
    compare:'<path d="M5 31L25 24L43 20L64 11" stroke="var(--accent,#5d72e8)" stroke-width="2" fill="none"/><path d="M5 35L25 28L43 30L64 20" stroke="var(--green,#32a77a)" stroke-width="2" stroke-dasharray="3 2" fill="none"/>'
  };
  function help(target,id,entries,label){
    if(!target)return null;
    var old=target.querySelector(':scope > [data-ad-guide="'+id+'"]');if(old)return old;
    var d=node('details','ad-guide');d.dataset.adGuide=id;
    d.append(node('summary','',label||'怎么看'));
    var list=node('div','ad-guide-list');
    entries.forEach(function(e){
      var row=node('div','ad-guide-item'),pic=node('div','ad-guide-pic'),copy=node('div','ad-guide-copy');
      pic.innerHTML='<svg viewBox="0 0 68 40" aria-hidden="true" focusable="false">'+(sketches[e[0]]||sketches.rank)+'</svg>';
      copy.append(node('strong','',e[1]),node('p','',e[2]));row.append(pic,copy);list.append(row);
    });
    d.append(list);target.append(d);return d;
  }
  function retire(n){if(!n)return;var d=n.closest('details.explain-v38');(d||n).classList.add('ad-redundant');}
  function markerLegend(entries){
    var row=node('div','ad-legend');
    entries.forEach(function(e){var item=node('span','ad-legend-item'),symbol=node('i','ad-symbol '+e[0]);symbol.setAttribute('aria-hidden','true');item.append(symbol,node('span','',e[1]));row.append(item);});
    return row;
  }
  function deepVisual(card){
    var title=card.querySelector('.dsb-head'),hint=title&&title.querySelector('.an-model-hint');
    retire(hint);
    var privacy=card.querySelector('.dsb-privacy-note');
    if(privacy&&!privacy.dataset.adPrivacy){
      privacy.dataset.adPrivacy='1';var pd=node('details','ad-privacy'),summary=node('summary');
      privacy.before(pd);summary.append(privacy);pd.append(summary,node('p','','为改进预测，系统统计经过匿名化处理的使用数据，不记录密码等敏感信息。'));
      // Keep the privacy observation target visible in the summary itself.
      privacy.textContent='匿名统计用于改进预测';
    }
    var scope=card.querySelector('.dsb-caliber');
    if(scope&&!scope.dataset.adScope){
      scope.dataset.adScope='1';var raw=scope.textContent,warning=/疑似|注意/.test(raw);
      var d=node('details','ad-scope'),h=node('summary','',warning?'排名范围可能不一致':'组合排名来源');
      if(warning){
        var m=raw.match(/总分参与人数\((\d+)\).*单科最大池\((\d+)\)/);
        write(scope,(m?'总分参考人数 '+m[1]+' 人，人数最多的单科 '+m[2]+' 人。':'')+' 人数关系不能确认是否为全年级排名。系统按录入的排名分析，请确认比较的是同一群体。');
      }else{
        var m2=raw.match(/组合「([^」]+)」/);
        write(scope,(m2?'当前组合：'+m2[1]+'。':'')+'优先使用组合排名；如果总分恰好由这个组合的科目组成，也可使用总分排名。');
      }
      scope.before(d);d.append(h,scope);
    }
    var helpers=card.querySelectorAll('.dsb-summary-help');
    if(helpers[0]){helpers[0].classList.remove('ad-redundant');write(helpers[0],'近期成绩影响更大');}
    if(helpers[1]){helpers[1].classList.remove('ad-redundant');write(helpers[1],'考虑平时发挥起伏');}
    var tip=card.querySelector('.dsb-tip');
    inlineNote(tip,'参考位置与波动范围来自不同方法，均仅供参考。记录少时范围更不稳定。');
    var summary=card.querySelector('.dsb-summary-row');
    if(summary&&!summary.querySelector(':scope > .ad-ruler')&&!card.querySelector('.ad-ruler')){
      var vals=summary.querySelectorAll('.dsb-summary-item'),a=vals[0]&&vals[0].querySelector('.dsb-summary-value'),b=vals[1]&&vals[1].textContent;
      var point=a&&a.textContent.match(/前\s*(\d+(?:\.\d+)?)%/),range=b&&b.match(/前\s*(\d+(?:\.\d+)?)%\s*[~～–-]\s*前\s*(\d+(?:\.\d+)?)%/);
      if(point&&range){
        var p=+point[1],lo=+range[1],hi=+range[2];
        if([p,lo,hi].every(function(n){return n>=0&&n<=100;})&&lo<=hi){
          var ruler=node('div','ad-ruler'),scale=node('div','ad-ruler-scale');
          scale.innerHTML='<span>前0%</span><span>前25%</span><span>前50%</span><span>前75%</span><span>前100%</span>';
          [['近期参考',p,p],['波动范围',lo,hi]].forEach(function(v){
            var line=node('div','ad-ruler-row'),bar=node('div','ad-ruler-track'),mark=node('i',v[1]===v[2]?'ad-ruler-point':'ad-ruler-band');
            mark.style.left=v[1]+'%';if(v[1]!==v[2])mark.style.width=(v[2]-v[1])+'%';
            bar.append(mark);line.append(node('span','',v[0]),bar);ruler.append(line);
          });ruler.append(scale);summary.after(ruler);
        }
      }
    }
    var fig=Array.from(card.querySelectorAll('.dsb-fig')).find(function(n){return !n.querySelector('#dsbDistWrap')&&n.querySelector('.dsb-scroll svg');});
    if(!fig)return;
    var cap=fig.querySelector('.dsb-fig-cap'),svg=fig.querySelector('.dsb-scroll svg'),ui=fig.querySelector(':scope > .ad-chart-reading');
    if(!ui&&cap&&svg){
      var rawCap=cap.textContent,hit=rawCap.match(/(?:命中|落入范围)\s*(\d+)\s*\/\s*(\d+)/);
      ui=node('div','ad-chart-reading');
      ui.append(markerLegend([['dot','实际排名'],['line','稳定水平'],['area','当前水平范围'],['future','下次预测']]));
      var row=node('div','ad-history-row'),label=node('label','ad-history-label'),check=node('input');
      check.type='checkbox';label.append(check,node('span','','显示历史预测记录'));row.append(label);
      if(hit)row.append(node('span','ad-hit','历史落入范围 '+hit[1]+'/'+hit[2]));
      ui.append(row);
      var historyNodes=Array.from(svg.querySelectorAll('line[stroke="#2e9e6b"],line[stroke="#d4574e"],circle[stroke="#2e9e6b"],circle[r="2.3"][fill="#4a90d9"]')).concat(Array.from(svg.querySelectorAll('text')).filter(function(n){return /竖须=/.test(n.textContent);}));
      historyNodes.forEach(function(n){n.setAttribute('data-ad-history-layer','');});
      Array.from(svg.querySelectorAll('text')).filter(function(n){return /阴影带=/.test(n.textContent);}).forEach(function(n){n.setAttribute('data-ad-inline-legend','');});
      // Axis numbers are percentile positions, not exam marks.
      Array.from(svg.querySelectorAll('text[text-anchor="end"]')).filter(function(n){return /^(0|25|50|75|100)$/.test(n.textContent.trim());}).forEach(function(n){n.textContent=n.textContent+'%';});
      var histLegend=markerLegend([['history','当时预测范围'],['hit','实际在范围内'],['miss','实际在范围外'],['pastpoint','当时预测中心']]);histLegend.classList.add('ad-history-legend');ui.append(histLegend);
      if(!historyNodes.length)row.hidden=true;
      check.addEventListener('change',function(){preference.set(settingKey('deep-history-layer'),check.checked);apply();});
      fig.append(ui);
      help(fig,'deep-trajectory',[
        ['trend','蓝线：较稳定的水平','一次考差、蓝线变化不大，表示整体水平可能没有明显下降。'],
        ['band','灰带：当前水平范围','灰带越宽，越难确定当前的稳定水平。它不是下一场的预测范围。'],
        ['future','右侧蓝色：下一场预测','颜色越深，模型估计越可能靠近这里；并不保证考到这个排名。'],
        ['history','历史记录：检验过去预测','竖线是当时的预测范围，蓝点是当时预测中心。绿圈表示实际在范围内，红叉表示在范围外。']
      ]);
      retire(cap);
    }
    if(ui){
      var check=ui.querySelector('input'),key=settingKey('deep-history-layer'),show=preference.has(key)?preference.get(key):layerDefault(mode);
      if(check)check.checked=show;
      svg.toggleAttribute('data-ad-hide-history',!show);
      var legend=ui.querySelector('.ad-history-legend');if(legend)legend.hidden=!show||!svg.querySelector('[data-ad-history-layer]');
    }
  }
  function readingVisual(card,k){
    if(k==='deep'){deepVisual(card);return;}
    if(k==='structure'){
      var quad=card.querySelector('#sv31Quad'),p=quad&&quad.parentElement;
      if(p){help(p,'quad',[['quad','越上越靠前，越右进步越快','例如右上方的英语，表示当前排名靠前且近期有进步。'],['rank','比自身典型水平','各科通常在前30%，数学在前20%，就是比典型水平靠前10个百分点（+10）。']]);retire(card.querySelector('.card-title-row .card-sub'));var b=p.querySelector(':scope > b > span');write(b,'（点科目看详情）');}
    }
    if(k==='matrix'){
      var toolbar=card.querySelector('.matrix-meta-v60');
      if(toolbar){
        var old=toolbar.querySelector('.matrix-reading-v60'),active=card.querySelector('[data-analysis-matrix-v60][aria-pressed="true"]');
        // Keep current-mode scale and missing-value key visible; use examples in guide.
        if(old&&active)write(old,active.dataset.analysisMatrixV60==='difficulty'?'50＝平均 · † 粗略参考 · — 缺少数据':active.dataset.analysisMatrixV60==='score'?'数字越高，得分比例越高 · — 缺少数据':'数字越小，排名越靠前 · — 缺少数据');
        help(toolbar,'matrix',[['rank','排名数字 20','表示前20%，例如100人里约第20名。'],['score','得分率 90%','90/100与135/150都是90%。'],['difficulty','难度参考 90','50是平均，90表示估计偏难，不是90%的试卷难度。']]);
      }
    }
    if(k==='worth'){
      var cmp=card.querySelector('.worth-compare');
      if(cmp){
        var box=cmp.parentElement;
        retire(card.querySelector('.ad-worth-example'));
        help(box,'worth',[['score','示例：90分 → 95分','实际考90分，换到所选参照难度，估计相当于95分。不是实际加分。'],['difficulty','怎么看难度参考','50为平均，90表示估计偏难；只是根据个人历史成绩推算。']]);
        var limit=card.querySelector('.worth-limit');if(limit)write(limit,'估算仅供比较，不是下次考试预测。');
      }
    }
    if(k==='peer'){
      var chart=card.querySelector('.st-peer-chart'),cap=card.querySelector('.st-peer-chart-caption');
      if(chart&&cap&&!cap.dataset.adLegend){
        cap.dataset.adLegend='1';
        var entries=[['line','实线：已有成绩'],['dash','虚线：参考对象后续']];if(chart.querySelector('.st-peer-forecast-mark'))entries.push(['diamond','菱形：下次预测'],['area','预测参考范围']);var l=markerLegend(entries);
        cap.after(l);
        write(cap,/走势已对齐/.test(cap.textContent)?'走势已对齐 · 日期是你的实际考试日期':'参考轨迹按考试次序对齐 · 日期是你的考试日期');
        var h=card.querySelector('.st-peer-help');if(h){
          help(h.parentElement,'peer',[['pair','走势相似与轨迹重合','走势相似看变化方向，如前30%→20%与前50%→40%；轨迹重合还要求成绩水平接近。'],['future','预测不是保证','主要参考你最近三场成绩，并结合相似用户后续表现；相似度90%不等于预测准确率90%。']]);
          write(h.querySelector('summary'),'匹配与预测依据');
        }
      }
    }
    if(k==='hall'){var hallHelp=help(card.querySelector('.sv31-scroll')?.parentElement,'hall',[['score','不同满分怎么比较','90/100与135/150都是90%。以得分率比较，最佳分数仍保留原卷满分。']]);if(hallHelp){var hallNote=card.querySelector('.card-title-row .card-sub');if(hallNote&&!hallNote.classList.contains('ad-keyline')){inlineNote(hallNote,'满分不同时按得分率比较，原卷分数仅供参考。');hallNote.classList.add('ad-keyline');}}}
    if(k==='calib'){var calibHelp=help(card.querySelector('.sv31-scroll')?.parentElement,'calib',[['rank','排名目标怎么看','前20%就是100人里约第20名。建议的参考分取自自己以前考过的试卷。']]);if(calibHelp){var calibNote=card.querySelector('.card-title-row .card-sub');if(calibNote&&!calibNote.classList.contains('ad-keyline')){inlineNote(calibNote,'建议以排名为准，参考分来自历史考试。');calibNote.classList.add('ad-keyline');}}}
    if(k==='trend')help(card.querySelector(':scope > .fold-body-v38')||card,'trend',[['trend','看连续变化','排名图越靠上越靠前，一次起伏不等于整体趋势变化。'],['score','不同考试的分数','满分与难度不同时，不能只凭分数高低判断进退。']]);
    if(k==='comp')help(card.querySelector('.sv31-g2')?.parentElement,'comp',[['compare','班级和年级一起看','例如班级前10%、年级前30%，表示在班内的位置更靠前。人数不同，不能直接比较名次数字。']]);
    if(k==='speed')help(card.querySelector('.sv31-scroll')?.parentElement,'speed',[['trend','每场进步速度','例如每场前进约5名，表示最近几场的变化速度估计，不保证下一次也前进5名。']]);
    if(k==='distribution')help(card.querySelector('.matrix-distribution-v60')?.parentElement,'distribution',[['donut','排名分布怎么看','例如10场考试中有4场在前10%～20%，该区间占40%。区间占比不是下次预测概率。']]);
    if(k==='quality'){
      var method=card.querySelector('.sv31-method');if(method){help(method.parentElement,'quality',[['rank','排名位置','57名 / 310人 ≈ 前18%。'],['score','得分率与百分点','70%升到80%，是增加10个百分点。']]);write(method.querySelector('summary'),'详细计算方法');}
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
    ds.forEach(function(d){d.toggleAttribute('data-ad-suppressed',suppressSupplement(mode,expanded,d.dataset.adLevel));});
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
      if(k!=='deep'||!card.querySelector('.ad-chart-reading'))readable(card,k);else{
        // Distribution subview can repaint independently; its captions still need processing.
        var fresh=card.querySelector('#dsbDistWrap .dsb-fig-cap');if(fresh&&!fresh.classList.contains('ad-readable-note'))readable(card,k);
      }
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
          installDisclosure(why,'deep-why','full');
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
      readingVisual(card,k);
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
    '.sv31-page .ad-goal-unit{font-size:12px;color:var(--muted,#788392)}.sv31-page #dsbRoot .dsb-tip.ad-readable-note{background:none;border:0;padding:0;font-size:11px!important}.sv31-page #dsbRoot .dsb-plain-insights{margin:5px 0 8px}.sv31-page #dsbRoot .dsb-plain-insights li{line-height:1.6;margin:3px 0}',
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
    '.sv31-page .ad-guide{margin:9px 0 2px;font-size:12px}.sv31-page .ad-guide>summary{cursor:pointer;color:var(--accent,#5d72e8);font-weight:600;width:fit-content;padding:4px 0}.sv31-page .ad-guide-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:8px;margin:7px 0}.sv31-page .ad-guide-item{display:flex;gap:10px;align-items:center;padding:9px;border:1px solid var(--line,#e8ebf0);border-radius:9px;min-width:0}.sv31-page .ad-guide-pic{flex:0 0 68px;color:var(--text,#18212f)}.sv31-page .ad-guide-pic svg{width:68px;display:block}.sv31-page .ad-guide-copy{min-width:0}.sv31-page .ad-guide-copy strong{font-size:12px;color:var(--text,#18212f)}.sv31-page .ad-guide-copy p{font-size:12px;line-height:1.55;margin:3px 0 0;color:var(--text,#18212f);opacity:.82}',
    '.ad-legend{display:flex;flex-wrap:wrap;align-items:center;gap:7px 15px;margin:8px 0;color:var(--text,#18212f)}.ad-legend-item{display:inline-flex;align-items:center;gap:5px;font-size:11px;white-space:nowrap}.ad-symbol{width:16px;height:10px;flex:none;display:inline-block;position:relative}.ad-symbol.dot:after,.ad-symbol.pastpoint:after{content:"";position:absolute;left:5px;top:2px;width:6px;height:6px;background:currentColor;opacity:.65;border-radius:50%}.ad-symbol.pastpoint:after{background:#4a90d9;opacity:1}.ad-symbol.line:after,.ad-symbol.dash:after{content:"";position:absolute;left:0;right:0;top:4px;border-top:2px solid #4a90d9}.ad-symbol.dash:after{border-top-style:dashed}.ad-symbol.area{background:currentColor;opacity:.13;border-radius:2px}.ad-symbol.future{background:linear-gradient(0deg,transparent,#4a90d9aa,transparent)}.ad-symbol.diamond:after{content:"";position:absolute;left:5px;top:1px;width:7px;height:7px;border:2px solid var(--accent,#5d72e8);transform:rotate(45deg)}.ad-symbol.history:after{content:"";position:absolute;left:7px;top:0;bottom:0;border-left:2px solid #2e9e6b}.ad-symbol.hit:after{content:"";position:absolute;left:5px;top:0;width:8px;height:8px;border:1.5px solid #2e9e6b;border-radius:50%}.ad-symbol.miss:after{content:"×";position:absolute;left:5px;top:-4px;font-size:16px;color:#d4574e}',
    '.ad-chart-reading{margin:8px 0}.ad-history-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:12px}.ad-history-label{display:flex;align-items:center;gap:6px;cursor:pointer}.ad-history-label input{accent-color:var(--accent,#5d72e8)}.ad-hit{font-variant-numeric:tabular-nums;color:var(--muted,#788392)}.ad-history-legend[hidden],.ad-history-row[hidden],svg[data-ad-hide-history] [data-ad-history-layer],svg [data-ad-inline-legend]{display:none!important}',
    '.ad-privacy,.ad-scope{font-size:12px;line-height:1.6;margin:7px 0}.ad-privacy>summary .dsb-privacy-note{display:inline;font-size:12px!important;margin:0!important}.ad-privacy>p{margin:6px 0;color:var(--muted,#788392)}.ad-privacy>summary,.ad-scope>summary{cursor:pointer;color:var(--muted,#788392);font-weight:500;width:fit-content}.ad-scope{border-left:2px solid var(--line,#e8ebf0);padding-left:9px}.ad-scope>summary{color:var(--text,#18212f)}.ad-scope .dsb-caliber,.ad-privacy .dsb-privacy-note{margin:5px 0!important;opacity:1!important}.ad-ruler{margin:8px 0 10px}.ad-ruler-row{display:grid;grid-template-columns:66px minmax(0,1fr);align-items:center;gap:10px;margin:6px 0;font-size:11px;color:var(--muted,#788392)}.ad-ruler-track{position:relative;height:8px;background:var(--line,#e8ebf0);border-radius:5px}.ad-ruler-point{position:absolute;top:-2px;width:12px;height:12px;border-radius:50%;transform:translateX(-50%);background:var(--accent,#5d72e8)}.ad-ruler-band{position:absolute;top:0;height:8px;border-radius:4px;background:var(--accent,#5d72e8);opacity:.38}.ad-ruler-scale{display:flex;justify-content:space-between;margin-left:76px;color:var(--muted,#788392);font-size:10px}',
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
