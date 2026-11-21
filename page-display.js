/* Page display preferences: presentation only; never mutate exam or sharing data. */
(function () {
  'use strict';
  var groups = [
    { title: '首页', items: [
      ['home-goal', '我的目标', '#goalHeroV33,#goalBarV33'],
      ['home-radar', '学科雷达图', '.grid-main .radar-card'],
      ['home-summary', '这一年的记录', '.grid-main .quick-card'],
      ['home-recent', '最近考试', '.grid-main .recent-card']
    ] },
    { title: '统计分析', items: [
      ['stats-insights', '智能提醒', null, '智能提醒'],
      ['stats-structure', '学科结构', null, '学科结构'],
      ['stats-hall', '个人最佳', null, '个人最佳殿堂'],
      ['stats-worth', '成绩含金量', '#scoreWorthCard'],
      ['stats-calib', '目标校准', null, '目标校准'],
      ['stats-comp', '名次竞争力', null, '名次竞争力'],
      ['stats-matrix', '全量统计矩阵', '.sv31-page > .worth-matrix-card', '全量统计矩阵'],
      ['stats-deep', '深度分析', '#dsbRoot'],
      ['stats-peer', '相似轨迹与预测', '[data-peer-host]'],
      ['stats-quality', '数据与计算方法', '.sv31-page > .sv31-quality', '数据与计算方法']
    ] }
  ];
  var items = groups.reduce(function (out, group) { return out.concat(group.items); }, []);
  var ids = items.map(function (item) { return item[0]; });
  var labels = { simple: '简约', standard: '标准', full: '完整', custom: '自定义' };
  var presets = {
    simple: ['home-goal', 'home-recent', 'stats-structure'],
    standard: ['home-goal', 'home-radar', 'home-summary', 'home-recent', 'stats-insights', 'stats-structure', 'stats-hall', 'stats-worth', 'stats-calib', 'stats-comp'],
    full: ids.slice()
  };
  var charts = [
    ['quad','学科定位图','structure','#sv31Quad','stats-structure'],
    ['compare','班级与年级排名对比','comp','#sv31Scissor','stats-comp'],
    ['best','个人最佳','hall','.sv31-scroll','stats-hall'],
    ['speed','进步速度榜','trend','table',''],
    ['matrix','成绩矩阵','matrix','.worth-matrix-scroll','stats-matrix'],
    ['distribution','排名分布','matrix','.sv31-g2','stats-matrix']
  ];
  function chartFor(id){return charts.find(function(c){return c[0]===id;});}
  function normalizePins(a){return (Array.isArray(a)?a:[]).filter(function(id,i,list){return list.indexOf(id)===i&&!!chartFor(id);});}
  function setPin(a,id,on){var out=normalizePins(a);return on?normalizePins(out.concat(id)):out.filter(function(x){return x!==id;});}
  function movePin(a,id,step){var out=normalizePins(a),i=out.indexOf(id),j=i+step;if(i>=0&&j>=0&&j<out.length){var v=out[j];out[j]=id;out[i]=v;}return out;}
  // Pair adjacent compact cards only; never reorder user-selected charts to fill a hole.
  // Wide tables/primary trends occupy a full row; an unmatched compact card expands.
  function layoutSpans(kinds) {
    var spans=kinds.map(function(){return 2;});
    function group(k){return k==='quick'||k==='recent'?'summary':k==='radar'||k==='quad'||k==='compare'||k==='distribution'?'chart':null;}
    for(var i=0;i<kinds.length-1;i++){
      var g=group(kinds[i]);
      if(g&&g===group(kinds[i+1])){spans[i]=spans[i+1]=1;i++;}
    }
    return spans;
  }
  function normalize(value) {
    if (!value || !Array.isArray(value.hidden)) return [];
    return ids.filter(function (id) { return value.hidden.indexOf(id) !== -1; });
  }
  function presetHidden(mode) {
    if (!Object.prototype.hasOwnProperty.call(presets, mode)) return [];
    return ids.filter(function (id) { return presets[mode].indexOf(id) === -1; });
  }
  function currentMode(hidden) {
    return ['simple', 'standard', 'full'].find(function (mode) {
      return presetHidden(mode).join('|') === normalize({hidden:hidden}).join('|');
    }) || 'custom';
  }
  function toggle(hidden, id, show) {
    if (ids.indexOf(id) === -1) return normalize({hidden:hidden});
    return ids.filter(function (key) { return key === id ? !show : hidden.indexOf(key) !== -1; });
  }
  function titleKey(title) {
    return String(title || '').trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d.、\s]+/, '').trim();
  }
  function storageKey(owner) { return 'st_page_display_v1:' + owner; }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { groups:groups, ids:ids, presets:presets, normalize:normalize, presetHidden:presetHidden, currentMode:currentMode, toggle:toggle, titleKey:titleKey, storageKey:storageKey, charts:charts, normalizePins:normalizePins, setPin:setPin, movePin:movePin, layoutSpans:layoutSpans };
    return;
  }
  if (typeof bindPage !== 'function' || typeof state === 'undefined') return;
  var userKey = null, hidden = [], pins = [], queued = false, cache = null;
  function owner() { return String(state.user && (state.user.id || state.user.username) || 'guest'); }
  function hydrate() {
    var key = owner();
    if (key === userKey) return;
    userKey = key; hidden = []; pins=[]; cache=null;
    try {var saved=JSON.parse(localStorage.getItem(storageKey(key))||'null');hidden=normalize(saved);pins=normalizePins(saved&&saved.pins);} catch (_) {}
  }
  function save() {
    var saved = true;
    try { localStorage.setItem(storageKey(userKey), JSON.stringify({hidden:hidden,pins:pins})); } catch (_) { saved = false; }
    return saved;
  }
  function update(card) {
    var mode = currentMode(hidden);
    card.querySelectorAll('[data-display-preset]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.displayPreset === mode));
    });
    card.querySelectorAll('[data-display-toggle]').forEach(function (field) {
      field.checked = hidden.indexOf(field.dataset.displayToggle) === -1;
    });
    var status = card.querySelector('[data-display-summary]');
    var summary = labels[mode] + ' · 已显示 ' + (ids.length-hidden.length) + '/' + ids.length + ' 个可选板块';
    if (status.textContent !== summary) status.textContent = summary;
    pinSettings(card);
    groups.forEach(function (group, i) {
      var count = group.items.filter(function (item) { return hidden.indexOf(item[0]) === -1; }).length;
      var element = card.querySelector('[data-display-count="' + i + '"]');
      if (element && element.textContent !== count + '/' + group.items.length) element.textContent = count + '/' + group.items.length;
    });
  }
  function track(action, extra) {
    try { if (typeof window.__stTrack === 'function') window.__stTrack('page_display_changed', Object.assign({ action:action, mode:currentMode(hidden), visible_count:ids.length-hidden.length }, extra || {})); } catch (_) {}
  }
  function mountSettings(root) {
    var grid = root.querySelector('.account-grid');
    if (!grid) return;
    var card = grid.querySelector('#pageDisplaySettingsV1');
    if (!card) {
      card = document.createElement('section');
      card.id = 'pageDisplaySettingsV1';
      card.className = 'card account-card pd-card';
      card.innerHTML = '<details class="pd-disclosure"><summary class="pd-head"><span><strong>页面显示</strong><small data-display-summary></small></span><span aria-hidden="true" class="pd-arrow">›</span></summary>'
        + '<div class="pd-body"><p class="card-sub">隐藏不需要的板块，添加常用分析图表。</p><div class="pd-presets" role="group" aria-label="显示模式">'
        + [['simple','简约','核心功能'],['standard','标准','常用分析'],['full','完整','全部板块']].map(function (p) {
          return '<button type="button" data-display-preset="' + p[0] + '" aria-pressed="false"><b>' + p[1] + '</b><small>' + p[2] + '</small></button>';
        }).join('') + '</div><div class="pd-custom-head">自定义板块</div>'
        + groups.map(function (g,i) {
          return '<details class="pd-group"><summary><b>' + g.title + '</b><small data-display-count="' + i + '"></small></summary><div>'
            + g.items.map(function (item) {
              return '<label class="pd-row"><span>' + item[1] + '</span><input type="checkbox" data-display-toggle="' + item[0] + '" role="switch"></label>';
            }).join('') + '</div></details>';
        }).join('')
        + '<details class="pd-group"><summary><b>首页图表</b><small data-pin-count></small></summary><div data-pin-list></div></details>'
        + '<p class="pd-note">隐藏不删除成绩。核心趋势始终保留；设置仅在当前设备生效。</p><div class="pd-foot"><span data-display-save role="status"></span><button type="button" data-display-reset>恢复默认</button></div></div></details>';
      var first = grid.querySelector('.account-main-v39,.account-card');
      if (first) first.after(card); else grid.prepend(card);
    }
    update(card);
  }
  function pinSettings(card){
    var list=card.querySelector('[data-pin-list]'),count=card.querySelector('[data-pin-count]'),sig=pins.join('|');
    if(count&&count.textContent!==pins.length+' 个已添加')count.textContent=pins.length+' 个已添加';
    if(!list||list.dataset.signature===sig)return;
    list.dataset.signature=sig;
    list.innerHTML=pins.concat(charts.map(function(c){return c[0];}).filter(function(id){return !pins.includes(id);})).map(function(id){
      var c=chartFor(id),i=pins.indexOf(id),on=i>=0;
      return '<div class="pd-pin-row"><span>'+c[1]+'</span><div class="pd-pin-actions">'+(on?'<button type="button" data-pin-move="'+id+'" data-step="-1" aria-label="上移'+c[1]+'"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-pin-move="'+id+'" data-step="1" aria-label="下移'+c[1]+'"'+(i===pins.length-1?' disabled':'')+'>↓</button>':'')+'<button type="button" data-pin-toggle="'+id+'" aria-pressed="'+on+'">'+(on?'移除':'添加')+'</button></div></div>';
    }).join('');
  }
  function heading(root,prefix){return Array.from(root.querySelectorAll('b')).find(function(n){return n.textContent.trim().indexOf(prefix)===0;});}
  function anchor(root,id){
    if(id==='speed')return heading(root,'进步速度榜');
    if(id==='distribution')return heading(root,'你的总分常落在哪个区间');
    if(id==='best'){
      var card=Array.from(root.querySelectorAll('.sv31-page > .card')).find(function(n){var h=n.querySelector('.card-title');return h&&titleKey(h.textContent)==='个人最佳殿堂';});
      return card&&card.querySelector('.card-title-row');
    }
    return root.querySelector(chartFor(id)[3]);
  }
  function shortcuts(root){
    charts.forEach(function(c){
      var n=anchor(root,c[0]);if(!n)return;
      if(c[0]==='quad')n=n.previousElementSibling||n;
      if(c[0]==='compare'||c[0]==='matrix'){var card=n.closest('.card');n=card&&card.querySelector('.card-title-row')||n;}
      var b=root.querySelector('[data-pin-shortcut="'+c[0]+'"]');
      if(!b){b=document.createElement('button');b.type='button';b.className='pd-shortcut';b.dataset.pinShortcut=c[0];if(n.matches('.card-title-row'))n.appendChild(b);else n.after(b);}
      var on=pins.includes(c[0]),label=on?'已添加首页':'＋ 添加首页';if(b.textContent!==label)b.textContent=label;
      b.setAttribute('aria-pressed',String(on));b.title=on?'从首页移除':'添加到首页';
    });
  }
  function copyNode(n){
    var clone=n.cloneNode(true);clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(function(x){x.removeAttribute('id');});
    clone.querySelectorAll('button,a').forEach(function(x){var span=document.createElement('span');span.className=x.className;span.textContent=x.textContent;span.title=x.getAttribute('aria-label')||x.title||'';x.replaceWith(span);});
    clone.querySelectorAll('.sv31-evi,.sv31-evib,.sv31-evbody,.pd-shortcut').forEach(function(x){x.remove();});
    return clone;
  }
  function compact(id,source,mode){
    var out=document.createElement('div'),n;
    function add(x){if(x)out.appendChild(copyNode(x));}
    function note(t,cls){var p=document.createElement('p');p.className=cls||'pd-caption';p.textContent=t;out.appendChild(p);}
    if(id==='quad'){
      n=source.querySelector('#sv31Quad');add(n);
      if(n){note('点击科目查看排名与变化。','sv31-detail pd-point-detail');out.querySelectorAll('.sv31-qpt').forEach(function(x){x.setAttribute('tabindex','0');x.setAttribute('role','button');x.setAttribute('aria-label',x.dataset.n);});}
    }else if(id==='compare'){n=source.querySelector('#sv31Scissor');if(n){add(n.previousElementSibling);add(n);}}
    else if(id==='best'){n=source.querySelector('.sv31-scroll');add(n);}
    else if(id==='speed'){var h=heading(source,'进步速度榜');n=h&&h.parentElement.querySelector('.sv31-scroll');if(n){note('最近5次典型变化');add(n);}}
    else if(id==='matrix'){
      n=source.querySelector('.worth-matrix-scroll');
      if(n){var difficulty=!!source.querySelector('.worth-heat-legend');note(difficulty?'难度参考 · 50 为平均，非真实难度；† 粗略参考':mode==='rank'?'排名位置 · 数字越小越靠前':'得分率 · 难度信号仅供参考');add(source.querySelector('.worth-heat-legend,.sv31-nopalette'));add(n);}
    }else if(id==='distribution'){var h=heading(source,'你的总分常落在哪个区间');n=h&&h.parentElement.querySelector('.sv31-g2');add(n);}
    if(!n)note('当前筛选下暂无足够数据','pd-empty');
    return out;
  }
  function homeCharts(root){
    var grid=root.querySelector('.grid-main'),host=root.querySelector('#pdHomeCharts');
    if(!grid||!pins.length){if(host)host.remove();cache=null;return;}
    var api=window.__v32;if(!api||!api.buildFeatures)return;
    var exams=state.exams||[],matrix=(state.sv31||{}).matrixWorth||'original',sig=userKey+'|'+pins.join('|')+'|'+matrix;
    if(host&&cache&&cache.grid===grid&&cache.exams===exams&&cache.sig===sig)return;
    var chronological=function(a){return a.filter(function(e){return !e.is_hidden;}).slice().sort(function(a,b){return String(a.exam_date||'').localeCompare(String(b.exam_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''));});};
    var f;try{f=api.buildFeatures(chronological(exams));f.totalLabel='总分';f.worthHistoryExams=chronological(state.allExams||exams);}catch(e){console.warn('首页分析图表',e);return;}
    var mode=f.posCount>0?'rank':'score',sources={};
    if(!host){host=document.createElement('section');host.id='pdHomeCharts';host.className='pd-home-charts';grid.appendChild(host);}
    host.replaceChildren();
    pins.forEach(function(id){
      var c=chartFor(id),card=document.createElement('article');card.className='card pd-home-chart';card.dataset.pdHomeChart=id;
      card.innerHTML='<div class="pd-chart-head"><h3 class="card-title">'+c[1]+'</h3><button type="button" class="pd-remove" data-pin-toggle="'+id+'" aria-label="从首页移除'+c[1]+'" title="从首页移除">×</button></div>';
      try{if(!sources[c[2]]){var src=document.createElement('div');src.innerHTML=api[c[2]](f,mode);sources[c[2]]=src;}card.appendChild(compact(id,sources[c[2]],mode));}
      catch(e){var p=document.createElement('p');p.className='pd-empty';p.textContent='暂时无法显示，请前往分析页查看。';card.appendChild(p);console.warn('首页图表',id,e);}
      var foot=document.createElement('div');foot.className='pd-chart-foot';foot.innerHTML='<span>当前分类 · 全部科目</span><button type="button" data-pin-detail="'+id+'">详细分析 ›</button>';card.appendChild(foot);host.appendChild(card);
    });
    cache={grid:grid,exams:exams,sig:sig};
    requestAnimationFrame(function(){if(host.isConnected)host.querySelectorAll('.sv32-trend-scroll').forEach(function(n){n.scrollLeft=Math.max(0,n.scrollWidth-n.clientWidth);});});
  }
  var concise={
    '点「查看依据」可看计算过程':'',
    '再积累一场考试,这里就会开始告诉你很多事。':'再记录一场考试后查看提醒。',
    '当前考试只录了分数——分数仅在相同试卷范围内可比':'仅有分数记录，同卷可比。',
    '分数视角优先 · 名次仍随时可看':'',
    '排名是主指标,总分仅供参考':'排名为主，总分仅供参考。',
    '「比六科典型」为正 = 强于你六科的典型水平;总分排名会受强科影响,这里看的是你自己的内部结构':'正值表示强于自身典型水平。',
    '你在班里和全年级各排多少 · 哪科最能打':'',
    '建议以排名为准;参照分数来自你真正考过的场次':'排名为主，参考分数取自历史考试。',
    '格子显示排名位置，数字越小越好。点击单科格子，查看成绩含金量。':'数字越小，排名越靠前。点击格子查看含金量。',
    '格子显示得分率。点击单科格子，查看成绩含金量。':'得分率 · 点击格子查看含金量。',
    '颜色越浓，估计相对越难；50 表示这组考试的平均难度。':'颜色越深，估计越难；50 为平均。',
    '排名类结构分析需要每科的「名次 ÷ 人数」。当前考试都只有分数,所以这里是空的——其余模块已自动切换到分数口径。':'补录各科排名与人数，即可查看学科结构。',
    '点击任意科目圆点,这里会显示它的数据。':'点击科目查看数据。',
    '去「考试记录」填入成绩，就能在这里看趋势和强弱科。':'录入成绩后查看分析。'
  };
  function compactCopy(root){root.querySelectorAll('.sv31-page .card-sub,.sv31-page .sv31-detail').forEach(function(n){
    if(n.children.length)return;var t=n.textContent.trim();
    if(Object.prototype.hasOwnProperty.call(concise,t)&&t!==concise[t]){if(concise[t])n.textContent=concise[t];else{var wrap=n.closest('.explain-v38');if(wrap)wrap.remove();else n.remove();}}
  });}
  function setOff(node, off) {
    if (off) { if (!node.hasAttribute('data-display-off-v1')) node.setAttribute('data-display-off-v1',''); }
    else if (node.hasAttribute('data-display-off-v1')) node.removeAttribute('data-display-off-v1');
  }
  function apply(root) {
    if (state.page !== 'home' && state.page !== 'stats') return;
    var prefix = state.page + '-';
    items.filter(function (item) { return item[0].indexOf(prefix) === 0; }).forEach(function (item) {
      var nodes = item[2] ? Array.from(root.querySelectorAll(item[2])) : [];
      if (item[3]) root.querySelectorAll('.sv31-page > .card').forEach(function (card) {
        var title = card.querySelector('.card-title-row .card-title');
        if (title && titleKey(title.textContent) === item[3] && nodes.indexOf(card) === -1) nodes.push(card);
      });
      nodes.forEach(function (node) { setOff(node, hidden.indexOf(item[0]) !== -1); });
    });
    // For accounts without exam history, the peer feature is wrapped in a standalone card.
    if (state.page === 'stats') root.querySelectorAll('.sv31-page > .card').forEach(function (card) {
      var children = Array.from(card.children);
      if (card.querySelector(':scope > [data-peer-host]') && !card.querySelector('.card-title-row,.dsb-head')) setOff(card, hidden.indexOf('stats-peer') !== -1);
    });
    if(state.page==='stats'){compactCopy(root);shortcuts(root);}
    if(state.page==='home'){homeCharts(root);layoutHome(root);}
  }
  function layoutHome(root){
    var grid=root.querySelector('.grid-main');if(!grid)return;
    var stack=grid.querySelector(':scope > .stack-main'),side=grid.querySelector(':scope > .side-stack'),
        radar=grid.querySelector('.radar-card'),host=grid.querySelector('#pdHomeCharts');
    if(!stack||!side)return;
    // Keep the original bound nodes and wrappers; move the radar once so DOM,
    // visual and keyboard order agree. All cards then participate in one grid.
    if(radar && radar.parentElement!==grid)side.after(radar);
    if(host && host.parentElement!==grid)grid.appendChild(host);
    if(radar&&host&&radar.nextElementSibling!==host)host.before(radar);
    grid.classList.add('pd-unified');
    setOff(side,!Array.from(side.children).some(function(n){return !n.hasAttribute('data-display-off-v1');}));
    var entries=[];
    function add(n,k){if(n&&!n.hasAttribute('data-display-off-v1'))entries.push({node:n,kind:k});}
    Array.from(stack.children).forEach(function(n){add(n,'trend');});
    Array.from(side.children).forEach(function(n){add(n,n.classList.contains('quick-card')?'quick':n.classList.contains('recent-card')?'recent':'wide');});
    add(radar,'radar');
    if(host)Array.from(host.children).forEach(function(n){add(n,n.dataset.pdHomeChart||'wide');});
    var spans=layoutSpans(entries.map(function(e){return e.kind;}));
    entries.forEach(function(e,i){var value=String(spans[i]);if(e.node.dataset.pdSpan!==value)e.node.dataset.pdSpan=value;});
  }
  function sync() {
    hydrate();
    var root = document.getElementById('content');
    if (!root) return;
    if (state.page === 'account') mountSettings(root);
    else apply(root);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; sync(); });
  }
  function changed(card, action, extra) {
    var stored = save(); update(card);
    card.querySelector('[data-display-save]').textContent = stored ? '已保存' : '无法保存到此设备';
    track(action, extra);
  }
  function changePin(id,on,source){
    hydrate();pins=setPin(pins,id,on);var stored=save();sync();
    if(typeof toast==='function')toast(stored?(on?'已添加到首页':'已从首页移除'):'设置未能保存到此设备');
    track('home_chart',{chart:id,visible:on,source:source,pinned_count:pins.length});
  }
  function point(n){var detail=n.closest('.pd-home-chart').querySelector('.pd-point-detail'),d=n.dataset,v=Number(d.sp)||0;if(detail)detail.textContent=d.n+' · 当前年级前'+d.pos+'% · '+(d.flat==='1'?'近期变化较小':(v>=0?'每场前进约 ':'每场后退约 ')+Math.abs(v)+' 名');}
  document.addEventListener('keydown',function(e){var n=e.target.closest('.pd-home-chart .sv31-qpt');if(n&&(e.key==='Enter'||e.key===' ')){e.preventDefault();point(n);}});
  document.addEventListener('click', function (event) {
    var t=event.target,n=t.closest('.pd-home-chart .sv31-qpt');if(n){point(n);return;}
    var b=t.closest('[data-pin-shortcut]');if(b&&state.page==='stats'){hydrate();var id=b.dataset.pinShortcut;changePin(id,!pins.includes(id),'analysis');return;}
    b=t.closest('[data-pin-toggle]');if(b&&(state.page==='home'||state.page==='account')){hydrate();var id=b.dataset.pinToggle;changePin(id,state.page==='account'&&!pins.includes(id),state.page);return;}
    b=t.closest('[data-pin-detail]');if(b&&state.page==='home'){
      var id=b.dataset.pinDetail,c=chartFor(id),nav=document.querySelector('.desktop-nav [data-page="stats"],.bottom-nav [data-page="stats"]');
      if(nav){nav.click();requestAnimationFrame(function(){var r=document.getElementById('content'),n=r&&anchor(r,id);if(n&&!n.closest('[data-display-off-v1]')){var folded=n.closest('.fold-body-v38[hidden]');if(folded){var toggle=folded.parentElement.querySelector('.fold-toggle-v38');if(toggle)toggle.click();}n.scrollIntoView({block:'start',behavior:'smooth'});}else if(c&&c[4]&&hidden.includes(c[4])&&typeof toast==='function')toast('该分析板块已隐藏，可在账号中重新开启。');});}return;
    }
    if (state.page !== 'account') return;
    b=t.closest('[data-pin-move]');if(b){hydrate();pins=movePin(pins,b.dataset.pinMove,Number(b.dataset.step));save();sync();track('home_chart_order',{pinned_count:pins.length});return;}
    var button = event.target.closest('[data-display-preset],[data-display-reset]');
    if (!button) return;
    var card = button.closest('#pageDisplaySettingsV1');
    if (!card) return;
    hydrate();
    var mode = button.hasAttribute('data-display-reset') ? 'full' : button.dataset.displayPreset;
    if (!Object.prototype.hasOwnProperty.call(presets,mode)) return;
    hidden = presetHidden(mode); if(button.hasAttribute('data-display-reset'))pins=[]; changed(card, 'preset', {preset:mode});
  });
  document.addEventListener('change', function (event) {
    if (state.page !== 'account') return;
    var field = event.target;
    if (!field.matches('[data-display-toggle]')) return;
    var card = field.closest('#pageDisplaySettingsV1');
    if (!card) return;
    hydrate();
    var id = field.dataset.displayToggle;
    hidden = toggle(hidden,id,field.checked); changed(card,'toggle',{block:id,visible:field.checked});
  });
  var style = document.createElement('style');
  style.textContent = [
    '#content [data-display-off-v1]{display:none!important}',
    '#content .grid-main.pd-unified{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:stretch;grid-auto-flow:row}#content .pd-unified>.stack-main,#content .pd-unified>.side-stack,#content .pd-unified>.pd-home-charts{display:contents}#content .pd-unified [data-pd-span]{grid-column:1/-1;min-width:0;max-width:100%;width:100%;box-sizing:border-box;margin:0}#content .pd-unified>.radar-card[data-pd-span="2"] .radar-wrap{max-width:760px;margin-inline:auto}#content .pd-unified .pd-home-chart[data-pd-span="2"][data-pd-home-chart="quad"] .sv31-chart{max-width:760px;margin-inline:auto}#content .pd-unified .pd-home-chart{display:flex;flex-direction:column}#content .pd-unified .pd-chart-foot{margin-top:auto}#content .pd-unified .pd-home-chart>div:nth-child(2){padding-bottom:14px;min-width:0}#content .pd-unified .pd-home-chart .legend{gap:8px}#content .pd-unified .pd-home-chart .legend>span{min-width:0}#content .pd-unified .pd-home-chart .legend>span:last-child{margin-left:0!important}#content .pd-unified .pd-home-chart .sv32-trend-scroll{max-width:100%}#content .pd-unified .pd-home-chart[data-pd-home-chart="distribution"] .sv31-chart svg{max-width:480px;width:100%;height:auto}#content .pd-unified .pd-home-chart[data-pd-home-chart="distribution"] .sv31-chart{margin:0}#content .pd-unified .pd-home-chart[data-pd-home-chart="distribution"] .sv31-g2{align-items:center}#content .pd-unified .radar-card .radar-wrap:has(.empty-chart){height:180px} @media(min-width:900px){#content .grid-main.pd-unified{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}#content .pd-unified [data-pd-span="1"]{grid-column:span 1}#content .pd-unified .pd-home-chart[data-pd-span="2"][data-pd-home-chart="distribution"] .sv31-g2{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:20px}#content .pd-unified .pd-home-chart[data-pd-span="1"] .sv31-chart>svg{max-width:100%}} @media(max-width:620px){#content .grid-main.pd-unified{gap:12px}}',
    '.pd-card{grid-column:1/-1;min-width:0}',
    '.pd-head,.pd-group>summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none;color:var(--text)}',
    '.pd-head::-webkit-details-marker,.pd-group>summary::-webkit-details-marker{display:none}',
    '.pd-head strong{display:block;font-size:var(--ui-section,17px);font-weight:650}',
    '.pd-head small,.pd-group small,.pd-note,.pd-foot{display:block;color:var(--muted);font-size:var(--ui-caption,12px);line-height:1.6}',
    '.pd-head small{margin-top:5px}.pd-arrow{font-size:23px;color:var(--muted);transition:transform .15s}',
    '.pd-disclosure[open] .pd-arrow{transform:rotate(90deg)}.pd-body{padding-top:15px}.pd-body>.card-sub{margin:0 0 14px}',
    '.pd-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 20px}',
    '.pd-presets button{min-width:0;min-height:66px;padding:10px 4px;border:1px solid var(--line);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;cursor:pointer}',
    '.pd-presets b,.pd-presets small{display:block}.pd-presets small{font-size:12px;color:var(--muted);margin-top:4px}',
    '.pd-presets [aria-pressed=true]{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}',
    '.pd-custom-head{font-weight:650;margin-bottom:8px;font-size:14px}.pd-group{border-top:1px solid var(--line)}',
    '.pd-group>summary{min-height:44px;font-size:14px}.pd-group>summary:after{content:"›";color:var(--muted);font-size:18px}.pd-group[open]>summary:after{transform:rotate(90deg)}.pd-group>summary small{margin-left:auto}',
    '.pd-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:45px;padding:6px 0;font-size:14px;color:var(--text);cursor:pointer}',
    '.pd-row input{appearance:none;flex:none;position:relative;width:38px;height:23px;border-radius:20px;background:var(--line);border:1px solid var(--muted);margin:0;cursor:pointer;box-sizing:border-box}',
    '.pd-row input:before{content:"";position:absolute;left:3px;top:3px;width:15px;height:15px;border-radius:50%;background:var(--panel-solid,#fff);box-shadow:0 1px 3px #0002;transition:transform .15s}',
    '.pd-row input:checked{background:var(--accent);border-color:var(--accent)}.pd-row input:checked:before{transform:translateX(15px)}',
    '.pd-card :is(button,input,summary):focus-visible{outline:2px solid var(--accent);outline-offset:3px}',
    '.pd-home-charts{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:18px}.pd-home-chart{min-width:0;padding:20px 22px}.pd-chart-head,.pd-chart-foot,.pd-pin-row,.pd-pin-actions{display:flex;align-items:center;gap:8px;justify-content:space-between}.pd-chart-head{margin-bottom:8px}.pd-chart-foot{border-top:1px solid var(--line);margin-top:14px;padding-top:9px;color:var(--muted);font-size:12px}.pd-caption,.pd-empty{font-size:12px;color:var(--muted);margin:10px 0}.pd-empty{text-align:center;padding:20px 0}.pd-chart-foot button,.pd-shortcut,.pd-remove,.pd-pin-actions button{font:inherit;font-size:12px;color:var(--accent);background:var(--accent-soft);border:0;border-radius:7px;padding:7px 9px;cursor:pointer}.pd-remove{color:var(--muted);background:transparent;font-size:20px;padding:4px 10px}.pd-shortcut{margin:4px 0 4px 8px;white-space:nowrap;align-self:start}.pd-shortcut[aria-pressed=true]{color:var(--muted);background:var(--cell,#f6f7fa)}.pd-pin-row{min-height:45px;border-bottom:1px solid var(--line);font-size:14px}.pd-pin-row:last-child{border:0}.pd-pin-actions{flex:none}.pd-pin-actions button:disabled{opacity:.35;cursor:default}.pd-home-chart table{width:100%;border-collapse:collapse;font-size:12px}.pd-home-chart th,.pd-home-chart td{padding:8px;text-align:center;border-bottom:1px solid var(--line);white-space:nowrap;font-variant-numeric:tabular-nums}.pd-home-chart th{font-size:11px;color:var(--muted)}.pd-home-chart :is(th,td):first-child{text-align:left}.pd-home-chart .pill{padding:3px 6px;border-radius:6px;background:var(--cell,#f6f7fa);color:var(--muted)}.pd-home-chart .sv31-g2{grid-template-columns:1fr}.pd-home-chart .worth-matrix-scroll{max-height:340px;overflow:auto}.pd-home-chart .sv31-qpt:focus circle[stroke]{stroke-width:4}.pd-home-chart .sv31-chart{overflow:hidden}@media(max-width:620px){.pd-home-chart{padding:16px 14px}.pd-chart-foot{flex-wrap:wrap}.pd-shortcut{margin-left:0}}',
    '.pd-note{margin:14px 0 4px}.pd-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}.pd-foot button{font:inherit;color:var(--accent);background:none;border:0;padding:8px 0;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(style);
  var priorBind = bindPage;
  bindPage = function () { var result = priorBind.apply(this, arguments); sync(); return result; };
  // Modules such as goals and deep analysis may insert cards after the initial page render.
  function boot() {
    sync();
    new MutationObserver(function (records) {
      if (state.page !== 'home' && state.page !== 'stats' && state.page !== 'account') return;
      var root = document.getElementById('content');
      if (!root) return;
      if (records.some(function (record) {
        return root.contains(record.target) || Array.from(record.addedNodes).some(function (node) { return node.nodeType === 1 && (node === root || node.contains(root)); });
      })) schedule();
    }).observe(document.getElementById('app') || document.body,{childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
