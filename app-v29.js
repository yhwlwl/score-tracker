// app-v29 / product v3.3: GUI 视觉提升
// A) 主题引擎：五套主题（晴白/暖纸/雾蓝/墨夜/青屿）。styles.css 与各版本注入样式的
//    硬编码色在此统一重映射为语义变量；每套主题 = <html data-theme> 上的一组变量值，
//    账号页新增「外观」入口，选择持久化到 localStorage 并同步 meta theme-color。
// B) 图例取色：点击折线图图例项（趋势的真实/目标、总览各科、排名各科）弹出取色板
//    （10 预设色 + 自定义 + 恢复默认），按科目名持久化，渲染后把颜色回写到对应
//    折线路径与数据点（SVG 子元素按 path+后续circle 分组，与图例顺序天然一致）。
// C) 手感补齐：全局按钮按压缩放(0.96)、精确属性过渡、:focus-visible 焦点环。
(function(){
  var PRODUCT_VERSION_V29='v4.1';

  /* ================= 版本号 ================= */
  function syncVersionV29(){
    /* 只读 meta(版本唯一来源是 index.html),不再覆写;theme-color 仍由主题引擎管理 */
    var meta=document.querySelector('meta[name="application-version"]');
    var v=(meta&&meta.getAttribute('content'))||'';
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+v;
    var tc=document.querySelector('meta[name="theme-color"]');
    if(tc)tc.setAttribute('content',themeMetaColorV29(currentThemeV29()));
  }

  /* ================= 样式注入 ================= */
  var CSS_V29=[
    /* ---- 基础表面重映射（默认回退值 = 现状，主题只覆盖变量） ---- */
    'body{background:radial-gradient(circle at 8% 0%,var(--glow1,#eef0ff) 0,transparent 28%),radial-gradient(circle at 92% 8%,var(--glow2,#eff9f5) 0,transparent 24%),var(--bg)}',
    '.logo{background:linear-gradient(145deg,var(--logo-a,#1f2939),var(--logo-b,#48546a))}',
    '.primary{color:var(--on-surface,#fff)}',
    '.chip.chip.active{background:var(--accent-soft)!important;color:var(--accent)!important;border-color:var(--accent)!important}',
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
    '.theme-opt-v29 i{width:16px;height:16px;border-radius:999px;display:inline-block;border:1px solid rgba(0,0,0,.08)}',
    /* ---- 首页两张特殊卡：hero 与 Study Planner 推广卡（此前硬编码浅色渐变） ---- */
    '.hero-main{background:var(--hero-bg,linear-gradient(145deg,rgba(255,255,255,.94),rgba(247,248,255,.9)))}',
    '.study-tool-v18{background:var(--promo-bg,linear-gradient(135deg,#fbfcff,#f7f9fc));border-color:var(--line)}',
    '.study-tool-v18:hover{border-color:var(--promo-line,#cfd7e6)}',
    '.study-tool-kicker-v18{color:var(--muted)}',
    '.study-tool-open-v18{color:var(--accent)}',
    '.study-tool-thumb-v18{border-color:var(--line-soft,#e5e9f0);background:var(--chip-bg,#fff)}',
    /* ---- 其余零散表面 ---- */
    '.close-btn{background:var(--cell,#f3f4f7)}',
    '.score-row.header{background:var(--cell,#f7f8fb)}',
    '.bottom-nav{box-shadow:var(--nav-shadow,0 10px 35px rgba(27,37,58,.14))}',
    '.modal-backdrop{background:var(--backdrop,rgba(22,28,39,.42))}',
    '.toast{border:1px solid var(--toast-line,transparent)}',
    '::selection{background:var(--sel-bg,#cdd6ff);color:var(--sel-text,#18212f)}',
    /* ---- 反馈悬浮窗随主题 ---- */
    'html[data-theme="night"] .st-fb-btn{background:var(--chip-bg);color:var(--text);border-color:var(--line)}',
    'html[data-theme="night"] .st-fb-modal{background:var(--modal-bg);color:var(--text)}',
    'html[data-theme="night"] .st-fb-head{border-color:var(--line)}',
    'html[data-theme="night"] .st-fb-close{background:var(--cell);color:var(--text)}',
    'html[data-theme="night"] .st-fb-tabs button{background:var(--chip-bg);border-color:var(--line);color:var(--muted)}',
    'html[data-theme="night"] .st-fb-tabs button.active{background:var(--nav-active);color:var(--text)}',
    'html[data-theme="night"] .st-fb-field textarea,html[data-theme="night"] .st-fb-field select{background:var(--input-bg);border-color:var(--input-line);color:var(--text)}',
    'html[data-theme="night"] .st-fb-secondary{background:var(--chip-bg);border-color:var(--line);color:var(--text)}',
    'html[data-theme="night"] .st-fb-item{border-color:var(--line)}',
    'html[data-theme="night"] .st-fb-item:hover{background:var(--cell)}',
    'html[data-theme="night"] .study-tool-thumb-v18 img{filter:saturate(.8) contrast(.95) brightness(.85)}',
    'html[data-theme="night"] .splash .brand-mark{color:#10141b}',
    /* ---- 分段选择按钮：全部统一为「外观」卡的选中语言（accent-soft 底 + accent 描边） ---- */
    '.metric-btn-v7.metric-btn-v7.active,.basis-btn-v13.basis-btn-v13.active,.grade-chip-v13.grade-chip-v13.active,.rank-entry-mode-v17.rank-entry-mode-v17 button.active,.select-pill.select-pill.active,.module-subject-v18.module-subject-v18.active{background:var(--accent-soft)!important;color:var(--accent)!important;border-color:var(--accent)!important}',
    /* ---- 未选中态的硬编码浅色收编 ---- */
    '.metric-btn-v7{background:var(--chip-bg,#fff);color:var(--muted)}',
    '.select-pill{background:var(--chip-bg,#fff)}',
    '.subject-chip-v7,.category-chip-v14,.module-chip-v18,.legend-pill{background:var(--cell,#f7f8fb);color:var(--muted)}',
    '.module-badge-v18{background:var(--cell,#f4f7fb);border-color:var(--line-soft,#d9e3f3);color:var(--muted)}',
    '.module-editor-v18{background:var(--panel-solid,#fbfcfe)}',
    '.module-editor-head-v18 input{background:var(--input-bg,#fff);color:var(--text)}',
    '.module-editor-head-v18 input[readonly]{background:var(--cell,#f5f7fa);color:var(--muted)}',
    '.module-delete-v18{background:var(--chip-bg,#fff)}',
    '.module-subject-v18{background:var(--chip-bg,#fff);color:var(--muted)}',
    /* ---- 图例可点击的可见暗示 ---- */
    '.legend span::after,.overview-legend .overview-pill::after,.rank-legend-v7 span::after{content:"🎨";font-size:9px;margin-left:4px;opacity:.45;transition:opacity .15s ease}',
    '.legend span:hover::after,.overview-legend .overview-pill:hover::after,.rank-legend-v7 span:hover::after{opacity:1}',
    '.lg-custom-v29::after{content:"✎";font-size:9px;color:var(--muted);margin-left:2px;opacity:.95}'
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
    {id:'sakura',name:'樱粉',dot:'linear-gradient(135deg,#cf5f83,#faf4f6)',meta:'#faf4f6'},
    {id:'violet',name:'淡紫',dot:'linear-gradient(135deg,#8a70d6,#f4f2fa)',meta:'#f4f2fa'},
    {id:'mint',name:'青屿',dot:'linear-gradient(135deg,#2f8f6b,#eef3ef)',meta:'#eef3ef'},
    {id:'night',name:'墨夜 · 暗',dot:'linear-gradient(135deg,#8b9dff,#10141b)',meta:'#10141b'}
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
      '--raw-field:#faf3e6','--final-field:#f0f6ee','--combo-cell:#f9f2e6','--combo-line:#e6d8bd',
      '--shadow:0 12px 40px rgba(90,72,44,.10)','--focus:#bc6b3c','--focus-ring:rgba(188,107,60,.15)',
      '--sel-bg:#f2ddca','--sel-text:#4a3423',
      '--hero-bg:linear-gradient(145deg,rgba(255,252,244,.97),rgba(250,243,230,.93))',
      '--promo-bg:linear-gradient(135deg,#fdf8ec,#f8f0dd)','--promo-line:#dcc9a4',
      '--nav-shadow:0 10px 35px rgba(90,72,44,.14)'
    ],
    sakura:[
      '--bg:#faf4f6','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#382a33','--muted:#94828f',
      '--line:#f0dfe7','--accent:#cf5f83','--accent-soft:#fbe8ee','--green:#3fa17c','--green-soft:#e7f6ef','--danger:#d25e68',
      '--glow1:#fdeef3','--glow2:#f5eefa','--logo-a:#8f3a58','--logo-b:#d98ba6',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#faeef2','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f9eff3','--line-soft:#ecd2de',
      '--axis:#ab95a1','--point-label:#967f8d','--grid:#f2e4ea','--dotfill:#ffffff',
      '--info-bg:#fdecf2','--info-line:#f4d7e2','--info-text:#7c5566',
      '--raw-field:#fdf3e7','--final-field:#ebf6f0','--combo-cell:#fceef3','--combo-line:#f0d7e1',
      '--shadow:0 12px 40px rgba(120,60,90,.10)','--focus:#cf5f83','--focus-ring:rgba(207,95,131,.15)',
      '--sel-bg:#f7d3df','--sel-text:#57283a',
      '--hero-bg:linear-gradient(145deg,rgba(255,236,243,.75) 0%,rgba(255,255,255,.97) 55%)',
      '--promo-bg:linear-gradient(135deg,#fef1f5,#fbe9f0)','--promo-line:#eec3d3',
      '--nav-shadow:0 10px 35px rgba(120,60,90,.13)'
    ],
    violet:[
      '--bg:#f4f2fa','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#2f2a3d','--muted:#8b8499',
      '--line:#e6e1f0','--accent:#8a70d6','--accent-soft:#edeafb','--green:#3aa07e','--green-soft:#e6f5ef','--danger:#d75f76',
      '--glow1:#ece7fb','--glow2:#f6ecf5','--logo-a:#4c3d80','--logo-b:#9c8ae0',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#efeaf8','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f1eef8','--line-soft:#dbd3ec',
      '--axis:#9c93b3','--point-label:#867d9c','--grid:#e8e3f2','--dotfill:#ffffff',
      '--info-bg:#edebfa','--info-line:#dcd6f4','--info-text:#5b5378',
      '--raw-field:#faf3e7','--final-field:#ecf6f1','--combo-cell:#f0edf9','--combo-line:#ded5f2',
      '--shadow:0 12px 40px rgba(80,64,130,.10)','--focus:#8a70d6','--focus-ring:rgba(138,112,214,.15)',
      '--sel-bg:#ddd4f6','--sel-text:#2e2650',
      '--hero-bg:linear-gradient(145deg,rgba(238,232,251,.65) 0%,rgba(255,255,255,.97) 55%)',
      '--promo-bg:linear-gradient(135deg,#f3effc,#ebe5f9)','--promo-line:#cfc4ee',
      '--nav-shadow:0 10px 35px rgba(80,64,130,.13)'
    ],
    night:[
      '--bg:#10141b','--panel:rgba(22,28,38,.92)','--panel-solid:#161c26','--text:#e7eaf1','--muted:#97a1b4',
      '--line:#27303f','--accent:#8b9dff','--accent-soft:#212a44','--green:#43bd8a','--green-soft:#17302a','--orange:#d38429','--danger:#ef7078',
      '--shadow:0 14px 44px rgba(0,0,0,.45)',
      '--glow1:#1a2130','--glow2:#131f29','--logo-a:#2c3654','--logo-b:#5566c9',
      '--nav-glass:rgba(22,28,38,.7)','--nav-line:#2a3342','--nav-active:#1d2431','--navbg:rgba(22,28,38,.94)','--navline:#2a3342',
      '--chip-bg:#1d2431','--cell:#1d2431','--line-soft:#323d52','--on-surface:#10141b',
      '--axis:#7e8899','--point-label:#8b96ab','--grid:#232c3b','--dotfill:#161c26',
      '--modal-bg:#161c26','--head-bg:rgba(22,28,38,.96)','--input-bg:#10141b','--input-line:#323d52','--label:#aab4c8',
      '--focus:#8b9dff','--focus-ring:rgba(139,157,255,.18)',
      '--info-bg:#1d2431','--info-line:#323d52','--info-text:#a9b4d0',
      '--raw-field:#241f16','--final-field:#15251d','--combo-cell:#1d2431','--combo-line:#323d52',
      '--pill-bg:#1d2431','--pill-line:#323d52',
      '--hero-bg:linear-gradient(145deg,rgba(30,38,54,.96),rgba(23,30,43,.94))',
      '--promo-bg:linear-gradient(135deg,#181f2b,#141a24)','--promo-line:#394561',
      '--nav-shadow:0 12px 40px rgba(0,0,0,.5)',
      '--backdrop:rgba(4,7,12,.62)','--toast-line:#333f55','--sel-bg:#33406b','--sel-text:#e7eaf1'
    ],
    mint:[
      '--bg:#eef3ef','--panel:rgba(255,255,255,.93)','--panel-solid:#ffffff','--text:#24312a','--muted:#7d8a80',
      '--line:#dee8e0','--accent:#2f8f6b','--accent-soft:#e4f3ec','--green:#3a8f5f','--green-soft:#e6f3ea','--danger:#cf6058',
      '--glow1:#e6f2e9','--glow2:#edf6f0','--logo-a:#24513c','--logo-b:#4d8a68',
      '--nav-glass:rgba(255,255,255,.66)','--nav-line:#ffffff','--nav-active:#e9f2ec','--navbg:rgba(255,255,255,.93)','--navline:#ffffff',
      '--chip-bg:#ffffff','--cell:#f1f6f2','--line-soft:#d3e2d8',
      '--axis:#90a096','--point-label:#7e8f84','--grid:#e2ebe4','--dotfill:#ffffff',
      '--info-bg:#e9f3ec','--info-line:#d4e6da','--info-text:#48604f',
      '--raw-field:#faf5ea','--final-field:#ecf6ee','--combo-cell:#ebf5ee','--combo-line:#cfe4d6',
      '--shadow:0 12px 40px rgba(38,72,56,.09)','--focus:#2f8f6b','--focus-ring:rgba(47,143,107,.15)',
      '--sel-bg:#c4e6d4','--sel-text:#12301f',
      '--hero-bg:linear-gradient(145deg,rgba(255,255,255,.96),rgba(240,247,241,.92))',
      '--promo-bg:linear-gradient(135deg,#f2f9f4,#e9f4ec)','--promo-line:#bcd9c6',
      '--nav-shadow:0 10px 35px rgba(38,72,56,.13)'
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

  /* ---- 暗色专用图表系列色：折线/数据点在夜里提亮保持对比 ---- */
  function buildDarkPalettesV29(){
    function toDark(c){
      if(typeof c==='string'&&c.indexOf('hsl(')===0)return c.replace(/,\s*62%,\s*46%\)/,',64%,62%)');
      var map={'#18212f':'#dfe4f5','#5d72e8':'#8b9dff','#32a77a':'#43bd8a','#e59b45':'#f0ae5e','#df5f68':'#ef7078',
        '#8f62db':'#b39af0','#22a6b3':'#39c9bd','#f06a8b':'#f4849f','#6c87ff':'#93a7ff','#7a8a9a':'#98a5b8'};
      return map[String(c).toLowerCase()]||c;
    }
    if(Array.isArray(window.OVERVIEW_COLORS))window.OVERVIEW_COLORS_DARK=window.OVERVIEW_COLORS.map(toDark);
    if(Array.isArray(window.OVERVIEW_COLORS_V4))window.OVERVIEW_COLORS_V4_DARK=window.OVERVIEW_COLORS_V4.map(toDark);
  }
  function themedPaletteProxyV29(light,dark){
    return new Proxy(light,{
      get:function(t,k){var src=(currentThemeV29()==='night'&&dark)?dark:t;return src[k];},
      has:function(t,k){return k in t;}
    });
  }
  function installThemedPalettesV29(){
    if(typeof Proxy==='undefined'||!Array.isArray(window.OVERVIEW_COLORS))return;
    window.OVERVIEW_COLORS=themedPaletteProxyV29(window.OVERVIEW_COLORS,window.OVERVIEW_COLORS_DARK);
    if(Array.isArray(window.OVERVIEW_COLORS_V4)){
      window.OVERVIEW_COLORS_V4=themedPaletteProxyV29(window.OVERVIEW_COLORS_V4,window.OVERVIEW_COLORS_V4_DARK);
    }
  }

  /* ---- 主题切换后重绘（保持滚动位置），让图表系列色即时跟随 ---- */
  function rerenderPreservingScrollV29(){
    if(typeof render!=='function')return;
    try{
      var y=window.scrollY||0;
      render();
      if(y)try{window.scrollTo(0,y);}catch(e){}
    }catch(e){}
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
    if(!silent)rerenderPreservingScrollV29();
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
  function escV29(s){return String(s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}

  /* 单科排名/原始分等模式没有图例 → 自动补一枚可点击的科目图例，让换色能力一致 */
  function ensureLegendV29(card){
    if(card.querySelector('.legend,.overview-legend,.rank-legend-v7'))return card.querySelector('.legend,.overview-legend,.rank-legend-v7');
    var stage=card.querySelector('.chart-wrap');
    if(!stage)return null;
    var svg=stage.querySelector('svg');
    if(!svg)return null;
    var line=svg.querySelector('path,polyline');
    if(!line)return null;
    var existing=document.getElementById('autoLegendV29');
    if(existing)return existing;
    var label=(typeof state!=='undefined'&&state&&state.subject)?String(state.subject):'';
    if(!label)return null;
    var row=document.createElement('div');
    row.className='rank-legend-v7';
    row.id='autoLegendV29';
    var stroke=line.getAttribute('stroke')||'#18212f';
    var span=document.createElement('span');
    var dot=document.createElement('i');
    dot.setAttribute('style','background:'+escV29(stroke));
    span.appendChild(dot);
    span.appendChild(document.createTextNode(label));
    row.appendChild(span);
    stage.insertAdjacentElement('afterend',row);
    return row;
  }

  function applyCustomLineColorsV29(){
    document.querySelectorAll('.card').forEach(function(card){
      if(!card.querySelector('.chart-wrap svg'))return;
      var lg=ensureLegendV29(card);
      if(!lg)return;
      var svg=card.querySelector('.chart-wrap svg');
      var groups=groupSvgSeriesV29(svg);
      var items=Array.prototype.filter.call(lg.children,function(n){return String(n.tagName||'').toUpperCase()==='SPAN';});
      items.forEach(function(item,idx){
        var label=(item.textContent||'').replace('✎','').replace('🎨','').trim();
        item.title='点击更换颜色';
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

  /* ================= 产品 Logo ================= */
  var LOGO_SVG_V29='<svg viewBox="0 0 48 48" aria-hidden="true" style="width:58%;height:58%;display:block">'
    +'<polyline points="8,37 20,26 27,31 41,16" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<path d="M30.5 11.5 H42 V23" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'</svg>';
  function swapLogosV29(root){
    root=root||document;
    ['.logo','.brand-mark'].forEach(function(sel){
      root.querySelectorAll(sel).forEach(function(el){
        if((el.textContent||'').trim()==='↗'){
          el.textContent='';
          el.insertAdjacentHTML('beforeend',LOGO_SVG_V29);
        }
      });
    });
  }
  function injectFaviconV29(){
    if(document.getElementById('faviconV29'))return;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="13" fill="#1f2939"/><polyline points="8,37 20,26 27,31 41,16" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30.5 11.5H42V23" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var link=document.createElement('link');
    link.id='faviconV29';
    link.rel='icon';
    link.type='image/svg+xml';
    link.href='data:image/svg+xml,'+encodeURIComponent(svg);
    (document.head||document.documentElement).appendChild(link);
  }

  /* 科目行只保留真科目：历史版本把组合名 push 进了 SUBJECTS，这里在展示层剔除 */
  function pruneComboFromSubjectRowV29(){
    var modSet=null;
    try{
      var names=(typeof moduleNameSetV21==='function')?moduleNameSetV21():[];
      modSet=new Set(names||[]);
    }catch(e){return;}
    if(!modSet.size)return;
    document.querySelectorAll('.combo-chips-v25').forEach(function(rowEl){
      var label=rowEl.querySelector('.label');
      if(!label||String(label.textContent||'').indexOf('科目：')!==0)return;
      rowEl.querySelectorAll('button[data-subject]').forEach(function(b){
        if(modSet.has(b.getAttribute('data-subject'))&&b.parentNode)b.parentNode.removeChild(b);
      });
    });
  }

  /* ================= 渲染后钩子 ================= */
  function afterRenderV29(){
    applyCustomLineColorsV29();
    pruneComboFromSubjectRowV29();
    injectAppearanceCardV29();
    swapLogosV29();
    /* 旧的图例一次性 toast 已移除:v31 的可关闭提示条(带 ×)是唯一图例提示,
       避免新用户首日同时看到两条提示 */
  }

  var bindPageBeforeV29=(typeof bindPage==='function')?bindPage:null;
  bindPage=function bindPageV29(){
    if(bindPageBeforeV29)bindPageBeforeV29();
    try{ensurePickerV29();bindPickerV29();afterRenderV29();}catch(e){}
  };
  /* 登录页不经过 bindPage，单独包一层让 Logo 也生效 */
  var renderLoginBeforeV29=(typeof renderLogin==='function')?renderLogin:null;
  if(renderLoginBeforeV29){
    renderLogin=function renderLoginV29(){
      var r=renderLoginBeforeV29.apply(this,arguments);
      try{swapLogosV29();}catch(e){}
      return r;
    };
  }

  /* ================= 启动 ================= */
  injectStylesV29();
  injectFaviconV29();
  buildDarkPalettesV29();
  installThemedPalettesV29();
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
    swapLogos:swapLogosV29,
    afterRender:afterRenderV29,
    custom:function(){return CUSTOM_V29;},
    setCustom:function(k,v){if(v===null)delete CUSTOM_V29[k];else CUSTOM_V29[k]=v;saveColorsV29();},
    seriesPalette:function(){return window.OVERVIEW_COLORS?{total:window.OVERVIEW_COLORS[0],first:window.OVERVIEW_COLORS[1]}:null;}
  };
})();
