// app-v29 / product v3.3: GUI 视觉提升
// A) 主题引擎：五套主题（晴白/暖纸/雾蓝/墨夜/青屿）。styles.css 与各版本注入样式的
//    硬编码色在此统一重映射为语义变量；每套主题 = <html data-theme> 上的一组变量值，
//    账号页新增「外观」入口，选择持久化到 localStorage 并同步 meta theme-color。
// B) 图例取色：点击折线图图例项（趋势的真实/目标、总览各科、排名各科）弹出取色板
//    （10 预设色 + 自定义 + 恢复默认），按科目名持久化，渲染后把颜色回写到对应
//    折线路径与数据点（SVG 子元素按 path+后续circle 分组，与图例顺序天然一致）。
// C) 手感补齐：全局按钮按压缩放(0.96)、精确属性过渡、:focus-visible 焦点环。
(function(){
  var PRODUCT_VERSION_V29='v3.3';

  /* ================= 版本号 ================= */
  function syncVersionV29(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V29);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V29;
    var tc=document.querySelector('meta[name="theme-color"]');
    if(tc)tc.setAttribute('content',themeMetaColorV29(currentThemeV29()));
  }

  /* ================= 样式注入 ================= */
  var CSS_V29=[
    /* ---- 基础表面重映射（默认回退值 = 现状，主题只覆盖变量） ---- */
    'body{background:radial-gradient(circle at 8% 0%,var(--glow1,#eef0ff) 0,transparent 28%),radial-gradient(circle at 92% 8%,var(--glow2,#eff9f5) 0,transparent 24%),var(--bg)}',
    '.logo{background:linear-gradient(145deg,var(--logo-a,#1f2939),var(--logo-b,#48546a))}',
    '.primary{color:var(--on-surface,#fff)}',
    '.chip.active{color:var(--on-surface,#fff)}',
    '.desktop-nav{background:var(--nav-glass,rgba(255,255,255,.65));border-color:var(--nav-line,rgba(255,255,255,.9))}',
    '.nav-btn.active{background:var(--nav-active,#fff)}',
    '.bottom-nav{background:var(--navbg,rgba(255,255,255,.92));border-color:var(--navline,rgba(255,255,255,.95))}',
    '.bottom-nav button.active{background:var(--nav-active,#f1f3f8)}',
    '.chip,.secondary,.icon-btn,.copy-btn,.mini-stat{background:var(--chip-bg,#fff)}',
    '.score-tag{background:var(--cell,#f6f7fa);border-color:var(--line-soft,#edf0f3);color:var(--muted)}',
    '.account-chip,.credential{background:var(--cell,#f7f8fb)}',
    '.info-box{background:var(--info-bg,#f4f6ff);border-color:var(--info-line,#e4e8ff);color:var(--info-text,#55627a)}',
    '.modal{background:var(--modal-bg,#fff)}',
    '.modal-head{background:var(--head-bg,rgba(255,255,255,.96))}',
    '.field input,.score-row input{background:var(--input-bg,#fff);border-color:var(--input-line,#dfe3e9);color:var(--text)}',
    '.field label{color:var(--label,#4d5868)}',
    '.field input:focus{border-color:var(--focus,#98a6f2);box-shadow:0 0 0 3px var(--focus-ring,#eef0ff)}',
    /* ---- 图表 SVG 内联色的类化适配 ---- */
    '.axis-label{fill:var(--axis,#98a1ae)}',
    '.point-label{fill:var(--point-label,#6e7887)}',
    '.chart-wrap svg line{stroke:var(--grid,#edf0f4)}',
    '.chart-wrap svg circle{fill:var(--dotfill,#fff)}',
    /* ---- 各版本注入样式的硬编码色重映射 ---- */
    '.score-total-strip-v26{background:var(--accent-soft)}',
    '.score-total-strip-v26 .t-label{color:var(--accent)}',
    '.score-total-strip-v26 .t-sub{color:var(--muted)}',
    '.score-total-strip-v26 .t-pill{background:var(--pill-bg,#fff);border-color:var(--pill-line,#e3eaf8);color:var(--muted)}',
    '.score-cell-v26{background:var(--cell,#f6f7fa)}',
    '.score-cell-v26.combo{background:var(--combo-cell,#f6f9ff);border-color:var(--combo-line,#d8e4fd)}',
    '.score-cell-v26.combo .sc-name-v26{color:var(--accent)}',
    '.sc-sub-v26,.sc-rank-v26{color:var(--muted)}',
    '.trend-actions-v25 button,.order-btn-v25{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.trend-actions-v25 button:hover,.order-btn-v25:hover,.radar-pick-chip-v25:hover{color:var(--text)}',
    '.radar-pick-chip-v25{background:var(--cell,#f7f8fb);color:var(--muted)}',
    '.full-trend-stage-v25{background:var(--bg)}',
    '.subject-picker-v21 select,.combo-picker-v21 select{background:var(--chip-bg,#fff);color:var(--text)}',
    '.combo-total-v21,.combo-card-v21{background:var(--panel-solid,#fafbfe)}',
    '.rank-entry-top-v21{background:var(--cell,#f8f9fc)}',
    '.rank-entry-mode-v17 button{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.stat-badge-v17{background:var(--cell,#f4f7fb);border-color:var(--line-soft,#d9e3f3);color:var(--muted)}',
    '#app-version-v17{color:var(--muted)}',
    '.grade-chip-v13,.basis-btn-v13{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.basis-btn-v13.active{background:var(--accent-soft);color:var(--accent);border-color:transparent}',
    '.grade-select-v13{background:var(--chip-bg,#fff);color:var(--text)}',
    '.raw-field-v13{background:var(--raw-field,#fffaf2)}',
    '.final-field-v13{background:var(--final-field,#f4fbf8)}',
    '.score-total-box-v13{background:var(--panel-solid,#fafbfe)}',
    '.grade-badge-v13{background:var(--cell,#f5f7fb);border-color:var(--line-soft,#dce2ee);color:var(--muted)}',
    '.exam-subject-card-v10{background:var(--panel-solid,#fbfcfe)}',
    '.exam-subject-name-v10{background:var(--input-bg,#fff)}',
    '.visibility-box-v10{background:var(--cell,#f7f8fb)}',
    '.hidden-record-v10{background:var(--cell,#fafafa)}',
    '.hidden-badge-v10{background:var(--cell,#f2f4f7);border-color:var(--line-soft,#dfe3ea);color:var(--muted)}',
    '.record-action-btn-v10{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.combo-remove-v21,.remove-exam-subject-v10{color:var(--danger)}',
    /* ---- C) 手感：按压反馈 + 精确过渡 + 键盘焦点 ---- */
    'button{transition-property:transform,opacity,box-shadow,color,background-color,border-color;transition-duration:.15s;transition-timing-function:ease}',
    'button:active{transform:scale(.96)}',
    'button:disabled{transform:none}',
    ':focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:2px}',
    /* ---- 图例取色交互 ---- */
    '.legend span,.overview-legend .overview-pill,.rank-legend-v7 span{cursor:pointer}',
    '.legend span:hover,.overview-legend .overview-pill:hover,.rank-legend-v7 span:hover{background:var(--accent-soft)}',
    '.overview-legend .overview-pill:hover,.rank-legend-v7 span:hover{border-color:var(--accent)}',
    '.lg-custom-v29::after{content:"✎";font-size:9px;color:var(--muted);margin-left:2px}',
    '.picker-pop-v29{position:fixed;z-index:300;background:var(--modal-bg,#fff);border:1px solid var(--line,#e6e9ef);border-radius:14px;box-shadow:0 16px 44px rgba(15,22,40,.2);padding:12px;display:none;width:230px}',
    '.picker-pop-v29.show{display:block}',
    '.picker-pop-v29 b{display:block;font-size:12px;margin-bottom:9px;color:var(--text)}',
    '.pk-swatches-v29{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:10px}',
    '.pk-swatches-v29 button{width:32px;height:32px;border-radius:9px;border:2px solid transparent;padding:0}',
    '.pk-swatches-v29 button.on{border-color:var(--text)}',
    '.pk-row-v29{display:flex;gap:8px;align-items:center;justify-content:space-between}',
    '.pk-row-v29 input[type=color]{width:46px;height:31px;border:1px solid var(--line,#dfe3ec);border-radius:8px;padding:2px;background:var(--chip-bg,#fff);cursor:pointer}',
    '.pk-reset-v29{border:1px solid var(--line,#dfe3ec);background:var(--chip-bg,#fff);border-radius:8px;padding:6px 10px;font-size:11px;color:var(--muted)}',
    /* ---- 外观入口（账号页） ---- */
    '.appearance-card-v29{grid-column:1/-1}',
    '.theme-opts-v29{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}',
    '.theme-opt-v29{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--chip-bg);border-radius:999px;padding:7px 13px 7px 8px;font-size:12px;font-weight:650;color:var(--muted)}',
    '.theme-opt-v29.on{border-color:var(--accent);color:var(--text);background:var(--accent-soft)}',
    '.theme-opt-v29 i{width:16px;height:16px;border-radius:999px;display:inline-block;border:1px solid rgba(0,0,0,.08)}'
  ].join('\n');

  function injectStylesV29(){
    if(document.getElementById('app-v29-style'))return;
    var s=document.createElement('style');
    s.id='app-v29-style';
    s.textContent=CSS_V29;
    (document.head||document.documentElement).appendChild(s);
  }

  /* ================= A) 主题引擎 ================= */
  var THEME_KEY_V29='st_theme';
  var THEMES_V29=[
    {id:'sunny',name:'晴白 · 默认',dot:'linear-gradient(135deg,#5d72e8,#f5f7fb)',meta:'#f5f7fb'},
    {id:'paper',name:'暖纸',dot:'linear-gradient(135deg,#bc6b3c,#f6f1e8)',meta:'#f6f1e8'},
    {id:'mist', name:'雾蓝',dot:'linear-gradient(135deg,#3466e0,#eef1f6)',meta:'#eef1f6'},
    {id:'night',name:'墨夜 · 暗',dot:'linear-gradient(135deg,#8b9dff,#10141b)',meta:'#10141b'},
    {id:'mint', name:'青屿',dot:'linear-gradient(135deg,#2f8f6b,#eef3ef)',meta:'#eef3ef'}
  ];
  var THEME_CSS={
    sunny:[],
    paper:[
      '--bg:#f6f1e8','--panel:rgba(255,253,248,.94)','--panel-solid:#fffdf8','--text:#33302a','--muted:#8b8172',
      '--line:#e9e0d1','--accent:#bc6b3c','--accent-soft:#f7ece0','--green:#5e8c61','--green-soft:#ecf3ea','--danger:#c25e52',
      '--glow1:#fdf3e2','--glow2:#f2ecdc','--logo-a:#6f5a38','--logo-b:#a98c60',
      '--nav-glass:rgba(255,253,248,.7)','--nav-line:#f3ead9','--nav-active:#f1e8d8','--navbg:rgba(255,253,248,.94)','--navline:#f3ead9',
      '--chip-bg:#fffdf8','--cell:#f5efe3','--line-soft:#e6dbc8',
      '--axis:#a3967f','--point-label:#8a7f6c','--grid:#ece3d3','--dotfill:#fffdf8',
      '--info-bg:#f7efe2','--info-line:#eadfc9','--info-text:#6d6046',
      '--raw-field:#faf3e6','--final-field:#f0f6ee','--combo-cell:#f9f2e6','--combo-line:#e6d8bd'
    ],
    mist:[
      '--bg:#eef1f6','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#222c3a','--muted:#76828f',
      '--line:#e0e6ee','--accent:#3466e0','--accent-soft:#e9efff','--green:#2f9d76','--green-soft:#e6f5ef','--danger:#d95c66',
      '--glow1:#e7edff','--glow2:#e9f3fb','--logo-a:#2c3950','--logo-b:#5a6c8c',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#eef2f8','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f3f6fa','--line-soft:#dbe2ec',
      '--axis:#93a0b4','--point-label:#8090a4','--grid:#e4e9f1','--dotfill:#ffffff',
      '--info-bg:#eaf0fd','--info-line:#d8e2fa','--info-text:#4d5c7d',
      '--raw-field:#fdf6ea','--final-field:#eef7f2','--combo-cell:#f0f5ff','--combo-line:#d5e0f7'
    ],
    night:[
      '--bg:#10141b','--panel:rgba(22,28,38,.92)','--panel-solid:#161c26','--text:#e7eaf1','--muted:#97a1b4',
      '--line:#27303f','--accent:#8b9dff','--accent-soft:#212a44','--green:#43bd8a','--green-soft:#17302a','--orange:#d38429','--danger:#ef7078',
      '--shadow:0 14px 44px rgba(0,0,0,.45)',
      '--glow1:#1a2130','--glow2:#131f29','--logo-a:#2c3654','--logo-b:#5566c9',
      '--nav-glass:rgba(22,28,38,.7)','--nav-line:#2a3342','--nav-active:#232c3b','--navbg:rgba(22,28,38,.94)','--navline:#2a3342',
      '--chip-bg:#1d2431','--cell:#1d2431','--line-soft:#323d52','--on-surface:#10141b',
      '--axis:#7e8899','--point-label:#8b96ab','--grid:#232c3b','--dotfill:#161c26',
      '--modal-bg:#161c26','--head-bg:rgba(22,28,38,.96)','--input-bg:#10141b','--input-line:#323d52','--label:#aab4c8',
      '--focus:#8b9dff','--focus-ring:rgba(139,157,255,.18)',
      '--info-bg:#1c2438','--info-line:#2c3854','--info-text:#a9b4d0',
      '--raw-field:#241f16','--final-field:#15251d','--combo-cell:#1a2333','--combo-line:#2c3854',
      '--pill-bg:#232c3b','--pill-line:#323d52'
    ],
    mint:[
      '--bg:#eef3ef','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#24312a','--muted:#7d8a80',
      '--line:#dee8e0','--accent:#2f8f6b','--accent-soft:#e4f3ec','--green:#3a8f5f','--green-soft:#e6f3ea','--danger:#cf6058',
      '--glow1:#e6f2e9','--glow2:#edf6f0','--logo-a:#24513c','--logo-b:#4d8a68',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#e9f2ec','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f1f6f2','--line-soft:#d3e2d8',
      '--axis:#90a096','--point-label:#7e8f84','--grid:#e2ebe4','--dotfill:#ffffff',
      '--info-bg:#e9f3ec','--info-line:#d4e6da','--info-text:#48604f',
      '--raw-field:#faf5ea','--final-field:#ecf6ee','--combo-cell:#ebf5ee','--combo-line:#cfe4d6'
    ]
  };
  function currentThemeV29(){
    var t=document.documentElement&&document.documentElement.dataset?document.documentElement.dataset.theme:'';
    return t||'sunny';
  }
  function themeMetaColorV29(id){
    var t=THEMES_V29.find(function(x){return x.id===id;});
    return t?t.meta:'#f5f7fb';
  }
  function applyThemeV29(id,silent){
    if(!THEME_CSS.hasOwnProperty(id))id='sunny';
    var root=document.documentElement;
    Object.keys(THEME_CSS).forEach(function(key){
      THEME_CSS[key].forEach(function(v){
        var name=v.split(':')[0];
        root.style.removeProperty(name);
      });
    });
    if(id!=='sunny'){
      THEME_CSS[id].forEach(function(v){
        var i=v.indexOf(':');
        root.style.setProperty(v.slice(0,i),v.slice(i+1));
      });
      root.dataset.theme=id;
    }else{
      delete root.dataset.theme;
    }
    try{localStorage.setItem(THEME_KEY_V29,id);}catch(e){}
    var tc=document.querySelector('meta[name="theme-color"]');
    if(tc)tc.setAttribute('content',themeMetaColorV29(id));
    document.querySelectorAll('.theme-opt-v29').forEach(function(b){
      b.classList.toggle('on',b.getAttribute('data-theme-opt-v29')===id);
    });
  }
  function initThemeV29(){
    var saved='sunny';
    try{saved=localStorage.getItem(THEME_KEY_V29)||'sunny';}catch(e){}
    applyThemeV29(saved,true);
  }

  /* ================= B) 图例取色 ================= */
  var LS_COLORS_V29='st_line_colors_v29';
  var CUSTOM_V29=(function(){try{return JSON.parse(localStorage.getItem(LS_COLORS_V29)||'{}')||{};}catch(e){return{};}})();
  var SWATCHES_V29=['#5d72e8','#2f9d76','#e59b45','#df5f68','#8f62db','#22a6b3','#e0567e','#6c87ff','#b8860b','#18212f'];
  var LEGEND_CONTAINERS_V29='.legend,.overview-legend,.rank-legend-v7';

  function saveColorsV29(){try{localStorage.setItem(LS_COLORS_V29,JSON.stringify(CUSTOM_V29));}catch(e){}}

  /* 把一个图表 SVG 的子元素按「path + 其后相邻的 circle」分组，组序与图例序一致 */
  function groupSvgSeriesV29(svg){
    var groups=[],cur=null;
    Array.prototype.forEach.call(svg.children,function(node){
      var t=String(node.tagName||'').toLowerCase();
      if(t==='path'||t==='polyline'){cur={line:node,dots:[]};groups.push(cur);}
      else if(t==='circle'&&cur)cur.dots.push(node);
    });
    return groups;
  }

  /* stroke 恢复：首次覆盖前缓存原值，取消自定义时可还原 */
  function setStrokeV29(el,c){
    if(el.getAttribute('data-orig-stroke')===null)el.setAttribute('data-orig-stroke',el.getAttribute('stroke')||'');
    el.setAttribute('stroke',c||el.getAttribute('data-orig-stroke')||'');
  }

  function applyCustomLineColorsV29(){
    document.querySelectorAll(LEGEND_CONTAINERS_V29).forEach(function(lg){
      var card=lg.closest('.card');
      if(!card)return;
      var svg=card.querySelector('.chart-wrap svg');
      if(!svg)return;
      var groups=groupSvgSeriesV29(svg);
      var items=Array.prototype.filter.call(lg.children,function(n){return String(n.tagName||'').toUpperCase()==='SPAN';});
      items.forEach(function(item,idx){
        var label=(item.textContent||'').replace('✎','').trim();
        var c=CUSTOM_V29[label];
        var i=item.querySelector('i');
        if(c){
          item.classList.add('lg-custom-v29');
          if(i){
            if(i.__origBg===undefined)i.__origBg=i.style.background||'';
            i.style.background=c;
          }
          var g=groups[idx];
          if(g){
            setStrokeV29(g.line,c);
            g.dots.forEach(function(d){setStrokeV29(d,c);});
          }
        }else if(item.classList.contains('lg-custom-v29')){
          /* 取消自定义：还原缓存的原色 */
          item.classList.remove('lg-custom-v29');
          if(i&&i.__origBg!==undefined)i.style.background=i.__origBg;
          var g2=groups[idx];
          if(g2){
            setStrokeV29(g2.line,null);
            g2.dots.forEach(function(d){setStrokeV29(d,null);});
          }
        }
      });
    });
  }

  /* 取色 popover（全局唯一实例） */
  var popElV29=null,popLabelV29=null;
  function ensurePickerV29(){
    if(popElV29)return;
    popElV29=document.createElement('div');
    popElV29.className='picker-pop-v29';
    popElV29.id='v29ColorPop';
    popElV29.innerHTML='<b></b><div class="pk-swatches-v29">'
      +SWATCHES_V29.map(function(c){return '<button type="button" data-c="'+c+'" style="background:'+c+'"></button>';}).join('')
      +'</div><div class="pk-row-v29"><input type="color" value="#5d72e8" title="自定义颜色"><button type="button" class="pk-reset-v29">恢复默认</button></div>';
    document.body.appendChild(popElV29);
    popElV29.addEventListener('click',function(e){
      var sw=e.target.closest('.pk-swatches-v29 button');
      if(sw&&popLabelV29){pickColorV29(sw.getAttribute('data-c'));return;}
      if(e.target.closest('.pk-reset-v29')&&popLabelV29){
        delete CUSTOM_V29[popLabelV29];saveColorsV29();applyCustomLineColorsV29();closePickerV29();
      }
    });
    popElV29.querySelector('input[type=color]').addEventListener('input',function(){pickColorV29(this.value);});
    document.addEventListener('click',function(e){
      if(!popElV29.classList.contains('show'))return;
      if(e.target.closest('.picker-pop-v29')||e.target.closest(LEGEND_CONTAINERS_V29+' > *'))return;
      closePickerV29();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closePickerV29();});
  }
  function pickColorV29(c){
    if(!popLabelV29)return;
    CUSTOM_V29[popLabelV29]=c;saveColorsV29();applyCustomLineColorsV29();
    popElV29.querySelectorAll('.pk-swatches-v29 button').forEach(function(b){
      b.classList.toggle('on',(b.getAttribute('data-c')||'').toLowerCase()===String(c).toLowerCase());
    });
  }
  function openPickerV29(item,label){
    ensurePickerV29();
    popLabelV29=label;
    popElV29.querySelector('b').textContent='「'+label+'」的颜色';
    var cur=CUSTOM_V29[label]||'#5d72e8';
    popElV29.querySelector('input[type=color]').value=cur.length===7?cur:'#5d72e8';
    popElV29.querySelectorAll('.pk-swatches-v29 button').forEach(function(b){
      b.classList.toggle('on',(b.getAttribute('data-c')||'').toLowerCase()===String(cur).toLowerCase());
    });
    popElV29.classList.add('show');
    var r=item.getBoundingClientRect(),pw=230,ph=180;
    var left=Math.min(Math.max(8,r.left),(window.innerWidth||1200)-pw-8);
    var top=r.bottom+8;
    if(top+ph>(window.innerHeight||800)-8)top=r.top-ph-8;
    popElV29.style.left=left+'px';
    popElV29.style.top=Math.max(8,top)+'px';
  }
  function closePickerV29(){if(popElV29)popElV29.classList.remove('show');popLabelV29=null;}

  function bindPickerV29(){
    if(bindPickerV29.done)return;
    bindPickerV29.done=true;
    document.addEventListener('click',function(e){
      var hit=e.target.closest('.legend > *,.overview-legend > *,.rank-legend-v7 > *');
      if(!hit)return;
      var label=(hit.textContent||'').replace('✎','').trim();
      if(label)openPickerV29(hit,label);
    });
  }

  /* ================= 外观入口（账号页卡片） ================= */
  function injectAppearanceCardV29(){
    var grid=document.querySelector('.account-grid');
    if(!grid||document.getElementById('appearanceCardV29'))return;
    var card=document.createElement('div');
    card.className='card account-card appearance-card-v29';
    card.id='appearanceCardV29';
    var cur=currentThemeV29();
    card.innerHTML='<h3 class="card-title">外观</h3><p class="card-sub">主题保存在本设备上，不影响其他设备。</p>'
      +'<div class="theme-opts-v29">'+THEMES_V29.map(function(t){
        return '<button type="button" class="theme-opt-v29'+(t.id===cur?' on':'')+'" data-theme-opt-v29="'+t.id+'"><i style="background:'+t.dot+'"></i>'+t.name+'</button>';
      }).join('')+'</div>';
    grid.appendChild(card);
    card.addEventListener('click',function(e){
      var b=e.target.closest('[data-theme-opt-v29]');
      if(b)applyThemeV29(b.getAttribute('data-theme-opt-v29'));
    });
  }

  /* ================= 渲染后钩子 ================= */
  function afterRenderV29(){
    applyCustomLineColorsV29();
    injectAppearanceCardV29();
  }

  var bindPageBeforeV29=(typeof bindPage==='function')?bindPage:null;
  bindPage=function bindPageV29(){
    if(bindPageBeforeV29)bindPageBeforeV29();
    try{ensurePickerV29();bindPickerV29();afterRenderV29();}catch(e){}
  };

  /* ================= 启动 ================= */
  injectStylesV29();
  initThemeV29();
  syncVersionV29();

  /* 测试钩子 */
  window.__v29={
    THEMES:THEMES_V29,
    THEME_CSS:THEME_CSS,
    applyTheme:applyThemeV29,
    currentTheme:currentThemeV29,
    themeMetaColor:themeMetaColorV29,
    groupSvgSeries:groupSvgSeriesV29,
    applyCustomLineColors:applyCustomLineColorsV29,
    custom:function(){return CUSTOM_V29;},
    setCustom:function(k,v){if(v===null)delete CUSTOM_V29[k];else CUSTOM_V29[k]=v;saveColorsV29();}
  };
})();
