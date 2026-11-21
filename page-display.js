/* Page display preferences: presentation only; never mutate exam or sharing data. */
(function () {
  'use strict';
  var groups = [
    { title: '首页内容', items: [
      ['home-goal', '我的目标', '#goalHeroV33,#goalBarV33'],
      ['home-radar', '学科雷达图', '.grid-main .radar-card'],
      ['home-summary', '这一年的记录', '.grid-main .quick-card,.hero .quick-card'],
      ['home-recent', '最近考试列表', '.grid-main .recent-card'],
      ['home-latest-subjects', '最近考试各科成绩', '.pd-recent-subjects']
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
    simple: ['home-goal', 'home-recent', 'home-latest-subjects', 'stats-structure'],
    standard: ['home-goal', 'home-radar', 'home-summary', 'home-recent', 'home-latest-subjects', 'stats-insights', 'stats-structure', 'stats-hall', 'stats-worth', 'stats-calib', 'stats-comp'],
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
  function chartHasSubjectFilter(id){return id==='compare'||id==='distribution';}
  function chartDefaultLabel(id){return chartHasSubjectFilter(id)?'总分':'全部科目';}
  function normalizeChartScopes(value){
    var out=Object.create(null);
    charts.forEach(function(c){var n=value&&value[c[0]];if(chartHasSubjectFilter(c[0])&&typeof n==='string'&&n.indexOf('s:')===0&&n.length>2)out[c[0]]=n;});
    return out;
  }
  function chartSubjects(f){
    return f.subjects.filter(function(s){return (f.series[s]||[]).some(function(x){return x.pos!=null||x.rate!=null||x.actual!=null;});});
  }
  function chartSelection(value,subjects){
    return typeof value==='string'&&value.indexOf('s:')===0&&subjects.includes(value.slice(2))?value:'';
  }
  // Keep the original exam list and feature object unchanged. Rank charts use the selected subject's actual rank series, not the exam total.
  function rankChartScope(f,subject){
    var ts=(f.valid[subject]||[]).filter(function(x){return x.pos!=null;}).map(function(x){
      var exam=f.exams[x.i]||{};return {i:x.i,pos:x.pos,cls:x.cls==null?null:x.cls,N:x.N,score:x.actual,name:exam.name||('第'+(x.i+1)+'次'),date:exam.exam_date||''};
    });
    return Object.assign({},f,{subjects:[subject],totalSeries:ts,totalLabel:subject,overallLatest:ts.length?ts[ts.length-1].pos:null,scopeMissing:!ts.length});
  }
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
  function recentNumber(v){return v==null||(typeof v==='string'&&!v.trim())||!Number.isFinite(Number(v))?null:Number(v);}
  function recentEscape(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  // The headline, ranks, averages and subject scores must refer to the same exam.
  function recentModel(metric,api){
    var exam=metric.exam,rows=exam.scores||{},effective=api.effective(exam),modules=api.modules();
    var subject=effective.length===1&&recentNumber(exam.total_actual_score)===null?effective[0]:'总分';
    var ranks=[['class','班级'],['year','年级']].map(function(pair){
      var info=api.rank(exam,subject,pair[0])||{},rank=recentNumber(info.rank),total=recentNumber(info.participants);
      if(!(rank>0))rank=null;if(!(total>0))total=null;
      var direct=info.directPercent?recentNumber(info.positionPercent):null;
      if(direct!==null&&(direct<0||direct>100))direct=null;
      var percent=rank!==null&&total!==null&&rank<=total?rank*100/total:direct;
      var avg=metric.comparison?recentNumber(api.average(exam,subject,pair[0])):null;
      var top=api.highest?recentNumber(api.highest(exam,subject,pair[0])):null;
      return {name:pair[1],rank:rank,total:total,percent:percent,diff:avg===null?null:Math.round((metric.value-avg)*100)/100,topGap:top===null||top<metric.value?null:Math.round((top-metric.value)*100)/100};
    }).filter(function(r){return r.rank!==null||r.percent!==null||r.diff!==null||r.topGap!==null;});
    var subjects=Object.keys(rows).filter(function(name){return !modules.has(name);}).map(function(name){
      var row=rows[name]||{},actual=recentNumber(row.actual),value=recentNumber(api.score(exam,name));
      if(value===null)return null;
      var raw=actual===null&&recentNumber(row.raw)!==null;
      var max=raw?(recentNumber(row.rawMax)??recentNumber(row.max)):recentNumber(row.max);
      if(max===null)max=recentNumber(api.max(exam,name));
      return {name:name,value:value,max:max>0?max:null,raw:raw,excluded:!!row.excludeFromTotal};
    }).filter(Boolean);
    if(subject!=='总分'&&subjects.length===1&&!subjects[0].raw&&!subjects[0].excluded)subjects=[];
    return {subject:subject,ranks:ranks,subjects:subjects};
  }
  function recentHtml(metric,model,api){
    var e=recentEscape,fmt=function(v){return e(api.format(v));},delta=recentNumber(metric.delta);
    var signed=function(v){return (v>0?'+':'')+fmt(v);};
    var semantic=function(v){return v<0?'pd-recent-down':v>0?'pd-recent-up':'';};
    var pct=function(v){return e(String(Math.round(v*10)/10))+'%';};
    var h='<div class="pd-recent-header"><span>最近一次考试</span><time>'+e(api.date(metric.exam.exam_date))+'</time></div>'
      +'<div class="pd-recent-name">'+e(metric.exam.name||'未命名考试')+'</div>'
      +'<div class="pd-recent-main"><div><div class="pd-recent-label">'+e(metric.label.replace(/^最近一次/,''))+'</div><div class="stat-value">'+fmt(metric.value)+'<small> 分</small></div></div>'
      +(delta===null?'':'<div class="pd-recent-delta"><strong class="'+semantic(delta)+'">'+(delta>0?'↗ ':delta<0?'↘ ':'')+signed(delta)+' 分</strong><small>'+e(metric.deltaLabel||'较上次同口径')+'</small></div>')+'</div>';
    if(model.ranks.length)h+='<div class="pd-recent-ranks">'+model.ranks.map(function(r){
      var hasRank=r.rank!==null,hasPercent=r.percent!==null;
      return '<div class="pd-recent-rank"><div class="pd-recent-label">'+r.name+(hasRank?'排名':hasPercent?'位比':'表现')+'</div>'
        +(hasRank?'<div class="pd-recent-position"><strong>'+fmt(r.rank)+(r.total!==null?'<small> / '+fmt(r.total)+'</small>':'')+'</strong>'+(hasPercent?'<small>前 '+pct(r.percent)+'</small>':'')+'</div>':hasPercent?'<div class="pd-recent-position"><strong>前 '+pct(r.percent)+'</strong></div>':'')
        +(hasPercent?'<div class="pd-recent-track" role="img" aria-label="'+r.name+'前 '+pct(r.percent)+'"><i style="width:'+Math.min(100,Math.max(0,r.percent))+'%"></i></div>':'')
        +(r.diff===null?'':'<div class="pd-recent-average">较均分 <strong class="'+semantic(r.diff)+'">'+(r.diff>0?'+':'')+e(String(r.diff))+' 分</strong></div>')+(r.topGap==null?'':'<div class="pd-recent-average">距最高分 <strong>'+fmt(r.topGap)+' 分</strong></div>')+'</div>';
    }).join('')+'</div>';
    if(model.subjects.length)h+='<div class="pd-recent-subjects" aria-label="各科成绩">'+model.subjects.map(function(s){
      return '<div class="pd-recent-subject"><div class="pd-recent-label">'+e(s.name)+(s.raw?' <small>原始</small>':'')+(s.excluded?' <small>统计项</small>':'')+'</div><div class="pd-recent-subscore">'+fmt(s.value)+(s.max===null?'':'<small>/'+fmt(s.max)+'</small>')+'</div></div>';
    }).join('')+'</div>';
    return h;
  }
  var defaultSlogan='看见起伏，也看见自己在进步。';
  // Curated literary mottos, short sayings and public-domain classical lines.
  // Rotate the styles; prefer quality over an arbitrary corpus size.
  var dailySlogans=[
    "山有来路，海有归途，努力亦有回响。","没有一朵花从一开始就是花。","长风破浪会有时，直挂云帆济沧海。","不必急于盛放，岁月自有花期。",
    "不为盛名而来，不为低谷而去。","山重水复疑无路，柳暗花明又一村。","前路未必坦荡，却始终值得期待。","花会沿路盛开，你以后的路也是。",
    "行到水穷处，坐看云起时。","山川尚远，前路自有万般可能。","不必把自己活成标准答案。","莫听穿林打叶声，何妨吟啸且徐行。",
    "行至半山，不妨也看看沿途的风景。","愿你心中有方向，脚下有自己的节奏。","两岸猿声啼不住，轻舟已过万重山。","山高路远，亦可从容向前。",
    "你今天学会的东西，会成为明天选择的底气。","欲穷千里目，更上一层楼。","纵有云雾遮眼，山路仍在脚下。","未来不是等来的答案，而是可以亲手写下的故事。",
    "悟已往之不谏，知来者之可追。","起伏是山的形状，也是成长的模样。","理想可以很远，今天要做的事可以很小。","潮平两岸阔，风正一帆悬。",
    "窗外的晨光，照见尚未写完的故事。","有些答案，不在原地，而在尝试之后。","会当凌绝顶，一览众山小。","暂时的阴雨，不能定义整片天空。",
    "有些日子适合赶路，有些日子适合整理行囊。","纸上得来终觉浅，绝知此事要躬行。","心中有远方，也别错过眼前的春光。","眼下的一场考试，不是未来的全部。",
    "问渠那得清如许？为有源头活水来。","旧页可以合上，新章仍待落笔。","成绩是一份记录，不是全部的你。","博观而约取，厚积而薄发。",
    "冬日的枝头，也藏着来年春天的消息。","愿你对明天的期待，落在今天的行动里。","大鹏一日同风起，扶摇直上九万里。","路上的弯曲，并不妨碍远方辽阔。",
    "每个人的花期不同，不必急着与春天赴同一场约。","路漫漫其修远兮，吾将上下而求索。","河流绕过山石，依然有自己的去向。","慢也好，步子小也好，是在往前走就好。",
    "千磨万击还坚劲，任尔东西南北风。","愿把眼前的微光，走成心中的远方。","愿你有追寻理想的勇气，也有改变方向的自由。","不积跬步，无以至千里；不积小流，无以成江海。",
    "走过风雨，仍愿相信晴天。","不是每一次落笔都能写下答案，但每一页都是新的开始。","沉舟侧畔千帆过，病树前头万木春。","山水有相逢，来日亦可期。",
    "迎着晨光出发，带着自己的故事归来。","天行健，君子以自强不息。","花开有时，远行有期。","从山脚望见远方，从脚下开始奔赴。"
  ];
  function limitSlogan(v){return Array.from(String(v==null?'':v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')).slice(0,80).join('');}
  function normalizeSlogan(v){v=v||{};return {mode:['default','daily','custom','off'].includes(v.mode)?v.mode:'default',text:limitSlogan(v.text).trim(),offset:Number.isInteger(v.offset)?((v.offset%dailySlogans.length)+dailySlogans.length)%dailySlogans.length:0};}
  function sloganText(v,date){v=normalizeSlogan(v);if(v.mode==='off')return '';if(v.mode==='custom')return v.text||defaultSlogan;if(v.mode==='daily'){date=date||new Date();var day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);return dailySlogans[((day+v.offset)%dailySlogans.length+dailySlogans.length)%dailySlogans.length];}return defaultSlogan;}
  // Shared presentation for the actual welcome card and the settings preview.
  // Do not recreate nodes during observation or interpret a custom motto as markup.
  function renderQuote(node,value,animate){
    var text=node.querySelector('.pd-quote-text'),mark=node.querySelector('.pd-quote-mark');
    var previous=text?text.textContent:null;
    if(!text||!mark){
      var doc=node.ownerDocument;mark=doc.createElement('span');text=doc.createElement('span');
      mark.className='pd-quote-mark';mark.setAttribute('aria-hidden','true');mark.textContent='“';
      text.className='pd-quote-text';node.replaceChildren(mark,text);
    }
    node.classList.add('pd-quote');
    node.toggleAttribute('data-quote-long',Array.from(value).length>36);
    node.hidden=!value;
    if(text.textContent!==value){
      text.textContent=value;
      if(animate&&previous!==null&&value&&typeof text.animate==='function'&&!(node.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches)){
        if(text.getAnimations)text.getAnimations().forEach(function(a){a.cancel();});
        text.animate([{opacity:.55,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
      }
    }
  }
  // Small static sample diagrams match the actual chart types; no private exam data in settings.
  function previewArt(id){
    var aliases={'home-goal':'goal','home-radar':'radar','home-summary':'summary','home-recent':'recent','home-latest-subjects':'subjects','stats-insights':'insights','stats-structure':'quad','stats-hall':'best','stats-worth':'worth','stats-calib':'calib','stats-comp':'compare','stats-matrix':'matrix','stats-deep':'deep','stats-peer':'peer','stats-quality':'quality'};
    var key=aliases[id]||id, a='var(--accent)',m='var(--muted)',l='var(--line)',Green='var(--green,#32a77a)',red='var(--danger,#d9534f)';
    function rect(x,y,w,h,fill,op){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="1.5" fill="'+fill+'" opacity="'+(op==null?1:op)+'"/>';}
    function line(d,col,dash){return '<path d="'+d+'" stroke="'+col+'" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"'+(dash?' stroke-dasharray="3 2"':'')+'/>';}
    function dot(x,y,r,c){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'"/>';}
    function label(x,y,t,c,size){return '<text x="'+x+'" y="'+y+'" font-size="'+(size||5)+'" fill="'+(c||m)+'" font-weight="600">'+t+'</text>';}
    function table(spark){var out=rect(5,5,54,5,l)+label(8,9,'科目')+label(37,9,spark?'最好':'变化');for(var i=0;i<3;i++){var y=15+i*8;out+=label(8,y+4,['语','数','英'][i])+ (spark?line('M19 '+(y+3)+' l4 -2 4 1 4 -4',a):label(19,y+4,['+2','−1','+3'][i],i===1?red:Green))+label(40,y+4,['92','85','96'][i])+line('M5 '+(y+6)+' H59',l);}return out;}
    function miniGrid(cols,rows){var out='';for(var i=0;i<rows;i++)for(var j=0;j<cols;j++){var x=6+j*(52/cols),y=7+i*(29/rows);out+=rect(x,y,49/cols,25/rows,a,.08);out+=label(x+2,y+4,['语','数','英','物','化','地'][i*cols+j]||'分');out+=label(x+2,y+10,['115','146','111','58','81','52'][i*cols+j]||'86',a,5.6);}return out;}
    var axis=line('M7 5 V34 H59',l)+line('M7 15 H59 M7 24 H59',l),body='';
    switch(key){
      case 'goal':body=[['语文','115','−5'],['数学','146','+1'],['英语','111','−14']].map(function(v,i){var x=5+i*18;return rect(x,8,17,26,l,.65)+label(x+2,14,v[0])+label(x+2,22,v[1],a,6)+label(x+2,29,v[2],i===1?Green:red);}).join('');break;
      case 'subjects':body=miniGrid(3,2).replace(/<rect[^>]*opacity="0.08"[^>]*\/>/g,'');break;
      case 'summary':body=[['考试','12'],['得分率','75%'],['达标','8/12'],['目标差','5']].map(function(v,i){var x=5+i%2*28,y=6+Math.floor(i/2)*16;return rect(x,y,26,14,l,.65)+label(x+3,y+5,v[0])+label(x+3,y+11,v[1],a,6);}).join('');break;
      case 'recent':body=[0,1,2].map(function(i){var y=7+i*11;return rect(5,y,8,8,a,.16)+label(7,y+5,String(i+1),a)+rect(17,y+1,24,2,m,.65)+rect(17,y+5,14,2,l)+label(46,y+5,['563','572','541'][i],a,6);}).join('');break;
      case 'radar':body=line('M32 4 L51 14 51 29 32 38 13 29 13 14 Z M32 11 L44 17 44 26 32 32 20 26 20 17 Z M32 4 V38 M13 14 L51 29 M51 14 L13 29',l)+'<path d="M32 7 L47 16 43 26 32 34 17 26 22 16 Z" fill="'+a+'" fill-opacity=".16" stroke="'+a+'" stroke-width="1.5"/>';break;
      case 'quad':body=rect(6,5,53,30,a,.045)+line('M6 20 H59 M32 5 V35',m,true)+[[13,12],[25,22],[39,13],[46,9],[36,29],[19,31]].map(function(p,i){return dot(p[0],p[1],i%2?3:2.5,i<3?a:Green);}).join('');break;
      case 'compare':body=axis+line('M8 25 L18 21 30 26 43 12 58 10',a)+line('M8 30 L18 24 30 19 43 20 58 15',Green,true);break;
      case 'best':body=table(true);break;
      case 'speed':body=table(false);break;
      case 'matrix':body=[0,1,2,3].map(function(i){return [0,1,2,3,4].map(function(j){return rect(6+j*10.6,6+i*8,9.2,6.6,a,[.18,.4,.65,.85,.3][(i*2+j*3)%5]);}).join('');}).join('');break;
      case 'distribution':body='<circle cx="20" cy="20" r="11" fill="none" stroke="'+l+'" stroke-width="7"/><circle cx="20" cy="20" r="11" fill="none" stroke="'+a+'" stroke-width="7" stroke-dasharray="29 69" transform="rotate(-90 20 20)"/><circle cx="20" cy="20" r="11" fill="none" stroke="'+a+'" opacity=".54" stroke-width="7" stroke-dasharray="21 69" stroke-dashoffset="-30" transform="rotate(-90 20 20)"/>'+label(17,22,'6',m,6)+rect(39,10,17,3,a,.6)+label(39,21,'前 20%',a,6)+rect(39,27,15,2,l);break;
      case 'insights':body=[0,1,2].map(function(i){var y=5+i*11;return rect(5,y,54,9,l,.55)+dot(11,y+4.5,2.6,i===1?Green:a)+rect(17,y+2,23,2,m,.7)+rect(17,y+5,34,1.5,m,.3);}).join('');break;
      case 'worth':body=rect(5,8,26,24,l,.7)+rect(33,8,26,24,a,.12)+label(8,15,'实际成绩')+label(36,15,'参考分')+label(8,25,'115',m,9)+label(36,25,'120',a,9);break;
      case 'calib':body=rect(5,5,54,5,l)+label(7,9,'科目')+label(20,9,'目标/实际')+label(44,9,'建议')+[0,1,2].map(function(i){var y=15+i*8;return label(7,y+4,['语','数','英'][i])+label(20,y+4,['120/115','145/146','125/111'][i])+rect(44,y,12,5,i===1?Green:a,.2)+line('M5 '+(y+6)+' H59',l);}).join('');break;
      case 'deep':body=axis+'<path d="M8 27 L20 23 32 14 43 15 59 5 L59 22 43 27 32 25 20 33 8 34 Z" fill="'+a+'" opacity=".16"/>'+line('M8 30 L20 28 32 20 43 21 59 13',a)+[ [12,30],[24,22],[36,24],[46,16] ].map(function(p){return dot(p[0],p[1],2,m);}).join('');break;
      case 'peer':body=axis+'<path d="M36 14 L59 6 L59 25 L36 19 Z" fill="'+a+'" opacity=".15"/>'+line('M8 29 L18 25 29 27 36 17',a)+line('M36 17 L47 14 58 12',a,true)+line('M8 24 L18 28 29 20 36 18',m,true);break;
      case 'quality':body=[0,1,2].map(function(i){var y=7+i*11;return dot(10,y+2.5,2.8,i===2?m:Green)+rect(17,y,28,2.5,m,.7)+rect(17,y+4,37,2,l);}).join('');break;
    }
    return '<svg class="pd-thumb" viewBox="0 0 64 42" aria-hidden="true" focusable="false">'+body+'</svg>';
  }
  function storageKey(owner) { return 'st_page_display_v1:' + owner; }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { chartHasSubjectFilter:chartHasSubjectFilter,chartDefaultLabel:chartDefaultLabel,normalizeChartScopes:normalizeChartScopes,chartSubjects:chartSubjects,chartSelection:chartSelection,rankChartScope:rankChartScope,renderQuote:renderQuote,normalizeSlogan:normalizeSlogan,sloganText:sloganText,limitSlogan:limitSlogan,dailySlogans:dailySlogans,previewArt:previewArt,recentModel:recentModel,recentHtml:recentHtml,groups:groups, ids:ids, presets:presets, normalize:normalize, presetHidden:presetHidden, currentMode:currentMode, toggle:toggle, titleKey:titleKey, storageKey:storageKey, charts:charts, normalizePins:normalizePins, setPin:setPin, movePin:movePin, layoutSpans:layoutSpans };
    return;
  }
  if (typeof bindPage !== 'function' || typeof state === 'undefined') return;
  var userKey = null, hidden = [], pins = [], chartScopes=normalizeChartScopes(), slogan=normalizeSlogan(), queued = false, cache = null;
  function owner() { return String(state.user && (state.user.id || state.user.username) || 'guest'); }
  function hydrate() {
    var key = owner();
    if (key === userKey) return;
    userKey = key; hidden = []; pins=[]; chartScopes=normalizeChartScopes(); slogan=normalizeSlogan(); cache=null;
    try {var saved=JSON.parse(localStorage.getItem(storageKey(key))||'null');hidden=normalize(saved);pins=normalizePins(saved&&saved.pins);chartScopes=normalizeChartScopes(saved&&saved.chartScopes);slogan=normalizeSlogan(saved&&saved.slogan);} catch (_) {}
  }
  function save() {
    var saved = true;
    try { localStorage.setItem(storageKey(userKey), JSON.stringify({hidden:hidden,pins:pins,chartScopes:chartScopes,slogan:slogan})); } catch (_) { saved = false; }
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
    var summary = labels[mode] + ' · 已显示 ' + (ids.length-hidden.length+pins.length) + '/' + (ids.length+charts.length) + ' 个板块';
    if (status.textContent !== summary) status.textContent = summary;
    pinSettings(card);
    groups.forEach(function (group, i) {
      var count = group.items.filter(function (item) { return hidden.indexOf(item[0]) === -1; }).length+(i===0?pins.length:0);
      var element = card.querySelector('[data-display-count="' + i + '"]');
      var total=group.items.length+(i===0?charts.length:0);if (element && element.textContent !== count + '/' + total) element.textContent = count + '/' + total;
    });
    updateSlogan(card);
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
        + '<div class="pd-body"><div class="pd-presets" role="group" aria-label="显示模式">'
        + [['simple','简约','核心功能'],['standard','标准','常用分析'],['full','完整','全部板块']].map(function (p) {
          return '<button type="button" data-display-preset="' + p[0] + '" aria-pressed="false"><b>' + p[1] + '</b><small>' + p[2] + '</small></button>';
        }).join('') + '</div><div class="pd-custom-head">自定义板块</div>'
        + groups.map(function (g,i) {
          return '<details class="pd-group"><summary><b>' + g.title + '</b><small data-display-count="' + i + '"></small></summary><div>'
            + (i===0?'<div class="pd-subhead">基础板块</div>':'')+g.items.map(function (item) {
              return '<label class="pd-row"><span class="pd-item">'+previewArt(item[0])+'<span>' + item[1] + '</span></span><input type="checkbox" data-display-toggle="' + item[0] + '" role="switch" aria-label="'+item[1]+'"></label>';
            }).join('')+(i===0?'<div class="pd-subhead">分析图表 <small data-pin-count></small></div><div data-pin-list></div>'+sloganSettingsHtml():'') + '</div></details>';
        }).join('')
        + '<p class="pd-note">示意图仅供预览。核心趋势始终保留，设置仅在当前设备生效。</p><div class="pd-foot"><span data-display-save role="status"></span><button type="button" data-display-reset>恢复默认</button></div></div></details>';
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
      return '<div class="pd-pin-row"><span class="pd-item">'+previewArt(id)+'<span>'+c[1]+'</span></span><div class="pd-pin-actions">'+(on?'<button type="button" data-pin-move="'+id+'" data-step="-1" aria-label="上移'+c[1]+'"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-pin-move="'+id+'" data-step="1" aria-label="下移'+c[1]+'"'+(i===pins.length-1?' disabled':'')+'>↓</button>':'')+'<button type="button" data-pin-toggle="'+id+'" aria-label="'+(on?'移除':'添加')+c[1]+'" aria-pressed="'+on+'">'+(on?'移除':'添加')+'</button></div></div>';
    }).join('');
  }
  function sloganSettingsHtml(){
    return '<div class="pd-slogan-settings"><div class="pd-slogan-head"><b>首页寄语</b><select data-slogan-mode aria-label="首页寄语模式"><option value="default">默认</option><option value="daily">每日寄语</option><option value="custom">自定义</option><option value="off">不显示</option></select></div><div class="pd-slogan-preview" data-slogan-preview aria-live="polite"></div><button type="button" data-slogan-next hidden>换一句</button><div data-slogan-custom hidden><label class="pd-slogan-field"><span class="pd-sr-only">自定义寄语</span><textarea data-slogan-text rows="2" placeholder="写一句送给自己的话"></textarea></label><div class="pd-slogan-foot"><small data-slogan-count></small><button type="button" data-slogan-save>保存</button></div></div></div>';
  }
  function updateSlogan(card){
    var box=card.querySelector('.pd-slogan-settings');if(!box)return;
    var signature=JSON.stringify([userKey,slogan]);
    if(box.dataset.signature===signature){if(slogan.mode==='daily')updateSloganPreview(box);return;}
    box.dataset.signature=signature;
    var field=box.querySelector('[data-slogan-mode]'),input=box.querySelector('[data-slogan-text]');
    field.value=slogan.mode;input.value=slogan.text;
    box.querySelector('[data-slogan-custom]').hidden=slogan.mode!=='custom';
    box.querySelector('[data-slogan-next]').hidden=slogan.mode!=='daily';
    updateSloganPreview(box);
  }
  function updateSloganPreview(box){
    var input=box.querySelector('[data-slogan-text]'),v=limitSlogan(input.value);
    if(input.value!==v)input.value=v;
    var preview=box.querySelector('[data-slogan-preview]'),line=sloganText(Object.assign({},slogan,{text:v}));
    renderQuote(preview,line,slogan.mode==='daily');
    var count=box.querySelector('[data-slogan-count]'),label=Array.from(v).length+'/80';if(count.textContent!==label)count.textContent=label;
  }
  function openSloganSettings(){
    var nav=document.querySelector('.desktop-nav [data-page="account"],.bottom-nav [data-page="account"]');
    if(!nav)return;nav.click();
    requestAnimationFrame(function(){var card=document.getElementById('pageDisplaySettingsV1');if(!card)return;card.querySelector('.pd-disclosure').open=true;card.querySelector('.pd-group').open=true;var target=card.querySelector('.pd-slogan-settings');if(target){target.scrollIntoView({block:'center',behavior:'smooth'});target.querySelector('select').focus({preventScroll:true});}});
  }
  function heading(root,prefix){return Array.from(root.querySelectorAll('b')).find(function(n){return n.textContent.trim().indexOf(prefix)===0;});}
  function anchor(root,id){
    if(id==='speed')return heading(root,'进步速度榜');
    if(id==='distribution')return root.querySelector('[data-matrix-distribution-heading]')||heading(root,'你的总分常落在哪个区间');
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
      if(n){var difficulty=!!source.querySelector('.worth-heat-legend');note(difficulty?'难度参考 · 50 为平均，非真实难度；† 粗略参考':mode==='rank'?'排名位置 · 数字越小越靠前':'得分率');add(source.querySelector('.worth-heat-legend'));add(n);}
    }else if(id==='distribution'){var h=source.querySelector('[data-matrix-distribution-heading]')||heading(source,'你的总分常落在哪个区间');n=h&&(h.closest('.matrix-distribution-head-v60')?.nextElementSibling||h.parentElement.querySelector('.sv31-g2'));add(n);}
    if(!n){out.replaceChildren();note('当前筛选下暂无足够数据','pd-empty');}
    return out;
  }
  function paintHomeChart(card,id,f,api,sources){
    var c=chartFor(id),field=card.querySelector('[data-pd-chart-subject]'),subject=field&&field.value?field.value.slice(2):'';
    var scoped=f,mode=f.posCount>0?'rank':'score';
    if(subject&&chartHasSubjectFilter(id)){scoped=rankChartScope(f,subject);mode='rank';}
    var body;
    try{
      var key=JSON.stringify([c[2],scoped===f?'':subject,mode,id==='distribution'&&scoped!==f?'distribution':'']);
      if(!sources[key]){var src=document.createElement('div');src.innerHTML=api[c[2]](scoped,mode);sources[key]=src;}
      body=compact(id,sources[key],mode);
    }catch(e){body=document.createElement('div');var p=document.createElement('p');p.className='pd-empty';p.textContent='暂时无法显示，请前往分析页查看。';body.appendChild(p);console.warn('首页图表',id,e);}
    body.className='pd-chart-body';
    var previous=card.querySelector('.pd-chart-body'),foot=card.querySelector('.pd-chart-foot');
    if(previous)previous.replaceWith(body);else card.insertBefore(body,foot);
    foot.querySelector('span').textContent='当前分类 · '+(subject||chartDefaultLabel(id));
  }
  function homeCharts(root){
    var grid=root.querySelector('.grid-main'),host=root.querySelector('#pdHomeCharts');
    if(!grid||!pins.length){if(host)host.remove();cache=null;return;}
    var api=window.__v32;if(!api||!api.buildFeatures)return;
    var exams=state.exams||[],matrix=(state.sv31||{}).matrixWorth||'original',sig=userKey+'|'+pins.join('|')+'|'+matrix;
    if(host&&cache&&cache.grid===grid&&cache.exams===exams&&cache.sig===sig)return;
    var chronological=function(a){return a.filter(function(e){return !e.is_hidden;}).slice().sort(function(a,b){return String(a.exam_date||'').localeCompare(String(b.exam_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''));});};
    var f;try{f=api.buildFeatures(chronological(exams));f.totalLabel='总分';f.worthHistoryExams=chronological(state.allExams||exams);}catch(e){console.warn('首页分析图表',e);return;}
    var sources={},subjects=chartSubjects(f);
    if(!host){host=document.createElement('section');host.id='pdHomeCharts';host.className='pd-home-charts';grid.appendChild(host);}
    host.replaceChildren();
    pins.forEach(function(id){
      var c=chartFor(id),card=document.createElement('article');card.className='card pd-home-chart';card.dataset.pdHomeChart=id;
      card.innerHTML='<div class="pd-chart-head"><h3 class="card-title">'+c[1]+'</h3><div class="pd-chart-controls">'+(chartHasSubjectFilter(id)?'<select data-pd-chart-subject aria-label="'+c[1]+'科目"></select>':'')+'<button type="button" class="pd-remove" data-pin-toggle="'+id+'" aria-label="从首页移除'+c[1]+'" title="从首页移除">×</button></div></div>';
      var field=card.querySelector('[data-pd-chart-subject]');
      function option(value,label){var n=document.createElement('option');n.value=value;n.textContent=label;field.appendChild(n);}
      if(field){option('',chartDefaultLabel(id));subjects.forEach(function(s){option('s:'+s,s);});
      field.value=chartSelection(chartScopes[id],subjects);field.disabled=!subjects.length;}
      var foot=document.createElement('div');foot.className='pd-chart-foot';foot.innerHTML='<span></span><button type="button" data-pin-detail="'+id+'">详细分析 ›</button>';card.appendChild(foot);
      paintHomeChart(card,id,f,api,sources);host.appendChild(card);
    });
    cache={grid:grid,exams:exams,sig:sig,features:f,api:api,sources:sources};
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
  function mountLatestHero(root){
    var card=root.querySelector('.hero-stat');
    if(!card||typeof latestMetricV20!=='function')return;
    try{
      var metric=latestMetricV20();if(!metric)return;
      var api={effective:effectiveScoreSubjectsV20,modules:moduleNamesV18,rank:rankInfoByScopeV16,
        score:function(exam,name){return examScore(exam,name,'actual');},max:examMax,
        average:function(exam,subject,scope){return window.ScoreAverages?window.ScoreAverages.value(exam,subject,scope,false):null;},
        highest:function(exam,subject,scope){return window.ScoreAverages?window.ScoreAverages.value(exam,subject,scope+'Max',false):null;},
        format:formatScore,date:fmtDate};
      var model=recentModel(metric,api);var order=(typeof SUBJECTS!=='undefined'&&Array.isArray(SUBJECTS))?SUBJECTS:[];model.subjects.sort(function(a,b){var ai=order.indexOf(a.name),bi=order.indexOf(b.name);return (ai<0?Infinity:ai)-(bi<0?Infinity:bi)||0;});
      var markup=recentHtml(metric,model,api);
      if(card._pdRecentHtml!==markup||!card.querySelector('.pd-recent-header')){
        card.innerHTML=markup;card._pdRecentHtml=markup;
      }
      card.classList.add('pd-recent-hero');
    }catch(err){console.warn('最近考试速览',err);}
  }
  function apply(root) {
    if (state.page !== 'home' && state.page !== 'stats') return;
    if(state.page==='home'){mountLatestHero(root);mountWelcome(root);}
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
    if(state.page==='home'){layoutTop(root);mountGoalLayout(root);homeCharts(root);layoutHome(root);}
  }
  function mountWelcome(root){
    var welcome=root.querySelector('.hero-main'),headline=welcome&&welcome.querySelector('h2');if(!headline)return;
    var value=sloganText(slogan);renderQuote(headline,value,true);
    var edit=welcome.querySelector('[data-slogan-edit]');
    if(!edit){edit=document.createElement('button');edit.type='button';edit.className='pd-slogan-edit';edit.dataset.sloganEdit='';edit.setAttribute('aria-label','编辑首页寄语');edit.title='编辑首页寄语';edit.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z"/></svg>';var eyebrow=welcome.querySelector('.eyebrow');if(eyebrow)eyebrow.after(edit);else welcome.prepend(edit);}
  }
  function layoutTop(root){
    var hero=root.querySelector('section.hero'),quick=root.querySelector('.quick-card');if(!hero)return;
    // Reuse the existing card; it stays a single DOM node, with its existing data and settings.
    var side=root.querySelector('.grid-main>.side-stack'),wide=window.matchMedia('(min-width:881px)').matches;
    if(quick&&wide&&quick.parentElement!==hero)hero.appendChild(quick);
    if(quick&&!wide&&side&&quick.parentElement!==side)side.prepend(quick);
    hero.classList.add('pd-top');
    hero.classList.toggle('pd-with-summary',!!quick&&wide&&!quick.hasAttribute('data-display-off-v1'));
  }
  function mountGoalLayout(root){
    var card=root.querySelector('#goalHeroV33');
    if(!card||card.hasAttribute('data-display-off-v1'))return;
    var chips=card.querySelector('.gh-chips'),hint=card.querySelector('.gh-hint');
    if(!chips||!hint)return;
    var swipe=window.matchMedia('(max-width:639px)').matches&&chips.scrollWidth>chips.clientWidth+6;
    var label=swipe?'左右滑看各科 · 点卡片编辑':'点击编辑';
    if(hint.textContent!==label)hint.textContent=label;
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
    if(t.closest('[data-slogan-edit]')){openSloganSettings();return;}
    var b=t.closest('[data-pin-shortcut]');if(b&&state.page==='stats'){hydrate();var id=b.dataset.pinShortcut;changePin(id,!pins.includes(id),'analysis');return;}
    b=t.closest('[data-pin-toggle]');if(b&&(state.page==='home'||state.page==='account')){hydrate();var id=b.dataset.pinToggle;changePin(id,state.page==='account'&&!pins.includes(id),state.page);return;}
    b=t.closest('[data-pin-detail]');if(b&&state.page==='home'){
      var id=b.dataset.pinDetail,c=chartFor(id),nav=document.querySelector('.desktop-nav [data-page="stats"],.bottom-nav [data-page="stats"]');
      if(nav){track('home_chart_detail',{chart:id});nav.click();requestAnimationFrame(function(){var r=document.getElementById('content'),n=r&&anchor(r,id);if(n&&!n.closest('[data-display-off-v1]')){var folded=n.closest('.fold-body-v38[hidden]');if(folded){var toggle=folded.parentElement.querySelector('.fold-toggle-v38');if(toggle)toggle.click();}n.scrollIntoView({block:'start',behavior:'smooth'});}else if(c&&c[4]&&hidden.includes(c[4])&&typeof toast==='function')toast('该分析板块已隐藏，可在账号中重新开启。');});}return;
    }
    if (state.page !== 'account') return;
    b=t.closest('[data-slogan-next],[data-slogan-save]');if(b){hydrate();var sloganCard=b.closest('#pageDisplaySettingsV1');if(!sloganCard)return;if(b.hasAttribute('data-slogan-next'))slogan=normalizeSlogan(Object.assign({},slogan,{offset:slogan.offset+1}));else slogan=normalizeSlogan(Object.assign({},slogan,{text:sloganCard.querySelector('[data-slogan-text]').value}));changed(sloganCard,'slogan',{slogan_mode:slogan.mode});return;}
    b=t.closest('[data-pin-move]');if(b){hydrate();pins=movePin(pins,b.dataset.pinMove,Number(b.dataset.step));save();sync();track('home_chart_order',{pinned_count:pins.length});return;}
    var button = event.target.closest('[data-display-preset],[data-display-reset]');
    if (!button) return;
    var card = button.closest('#pageDisplaySettingsV1');
    if (!card) return;
    hydrate();
    var mode = button.hasAttribute('data-display-reset') ? 'full' : button.dataset.displayPreset;
    if (!Object.prototype.hasOwnProperty.call(presets,mode)) return;
    hidden = presetHidden(mode); if(button.hasAttribute('data-display-reset')){pins=[];chartScopes=normalizeChartScopes();slogan=normalizeSlogan();} changed(card, 'preset', {preset:mode});
  });
  document.addEventListener('change', function (event) {
    var field = event.target;
    if(state.page==='home'&&field.matches('[data-pd-chart-subject]')){
      var chart=field.closest('.pd-home-chart'),id=chart&&chart.dataset.pdHomeChart;
      if(!id||!chartHasSubjectFilter(id)||!cache)return;
      var value=chartSelection(field.value,chartSubjects(cache.features));
      field.value=value;
      if(value)chartScopes[id]=value;else delete chartScopes[id];
      var stored=save();
      paintHomeChart(chart,id,cache.features,cache.api,cache.sources);
      if(!stored&&typeof toast==='function')toast('设置未能保存到此设备');
      track('home_chart_subject',{chart:id,scope:value?'subject':'default'});
      return;
    }
    if (state.page !== 'account') return;
    if(field.matches('[data-slogan-mode]')){var sloganCard=field.closest('#pageDisplaySettingsV1');if(!sloganCard)return;hydrate();slogan=normalizeSlogan(Object.assign({},slogan,{mode:field.value}));changed(sloganCard,'slogan',{slogan_mode:slogan.mode});return;}
    if (!field.matches('[data-display-toggle]')) return;
    var card = field.closest('#pageDisplaySettingsV1');
    if (!card) return;
    hydrate();
    var id = field.dataset.displayToggle;
    hidden = toggle(hidden,id,field.checked); changed(card,'toggle',{block:id,visible:field.checked});
  });
  document.addEventListener('input',function(e){if(state.page==='account'&&e.target.matches('[data-slogan-text]'))updateSloganPreview(e.target.closest('.pd-slogan-settings'));});
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
    '#content .hero-stat.pd-recent-hero{display:grid;gap:10px;min-height:0;align-content:start;justify-content:stretch;min-width:0;container-type:inline-size}.pd-recent-header,.pd-recent-main,.pd-recent-position{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}.pd-recent-header,.pd-recent-label,.pd-recent-delta small,.pd-recent-position small,.pd-recent-average{font-size:var(--ui-caption,12px);color:var(--muted);line-height:1.4}.pd-recent-header time{white-space:nowrap}.pd-recent-name{font-size:var(--ui-section,17px);font-weight:650;line-height:1.35;overflow-wrap:anywhere}.pd-recent-main{align-items:end}.pd-recent-main .stat-value{font-variant-numeric:tabular-nums;margin:2px 0 0;line-height:1.13}.pd-recent-main .stat-value small{font-size:14px;font-weight:500;color:var(--muted);letter-spacing:0}.pd-recent-delta{display:grid;gap:3px;text-align:right;min-width:0;font-variant-numeric:tabular-nums}.pd-recent-delta strong{font-size:16px;font-weight:650;white-space:nowrap}.pd-recent-up{color:var(--green,#32a77a)}.pd-recent-down{color:var(--danger,#d9534f)}.pd-recent-ranks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pd-recent-rank{display:grid;align-content:start;gap:4px;background:var(--accent-soft);padding:9px 10px;border-radius:12px;min-width:0}.pd-recent-rank:only-child{grid-column:1/-1}.pd-recent-position{flex-wrap:wrap;gap:2px 5px;align-items:baseline;font-variant-numeric:tabular-nums}.pd-recent-position strong{font-size:19px;line-height:1.2;color:var(--text);font-weight:650}.pd-recent-position strong small{font-weight:400;white-space:nowrap}.pd-recent-track{height:4px;border-radius:6px;background:var(--line);overflow:hidden}.pd-recent-track i{display:block;height:100%;background:var(--accent);border-radius:6px}.pd-recent-average strong{font-weight:650;white-space:nowrap}.pd-recent-subjects{border-top:1px solid var(--line);padding-top:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 4px;text-align:center}.pd-recent-subject{min-width:0}.pd-recent-subject .pd-recent-label{overflow-wrap:anywhere}.pd-recent-subject .pd-recent-label small{font-size:10px}.pd-recent-subscore{font-size:17px;line-height:1.4;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.pd-recent-subscore small{font-size:11px;color:var(--muted);font-weight:400}@container(min-width:540px){.pd-recent-subjects{grid-template-columns:repeat(6,minmax(0,1fr))}}@container(max-width:265px){.pd-recent-rank{padding:7px 6px}.pd-recent-position strong{font-size:17px}.pd-recent-subscore{font-size:15px}.pd-recent-main .stat-value{font-size:34px}}',
    '#content .hero.pd-top{grid-template-columns:minmax(0,1fr);grid-template-areas:"welcome" "latest";gap:14px;align-items:start;align-content:start}#content .pd-top>.hero-main{grid-area:welcome;position:relative;min-height:0;padding:20px 22px}#content .pd-top>.hero-stat{grid-area:latest;min-width:0}#content .pd-top>.quick-card{grid-area:summary;min-width:0;padding:16px 20px}#content .pd-top>.hero-main h2{font-size:clamp(22px,2.5vw,30px);line-height:1.3;letter-spacing:-.3px;margin:10px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}#content .pd-top>.hero-main h2[hidden]{display:none!important}#content .pd-top .hero-actions{margin-top:14px}#content .pd-top .quick-grid{gap:8px;margin-top:10px}#content .pd-top .quick-card .mini-stat{padding:8px 10px}#content .pd-top .quick-card .mini-stat b{font-size:calc(19px * var(--ui-scale,1));margin-bottom:2px}.pd-slogan-edit{display:inline-grid;place-items:center;width:30px;height:30px;padding:0;margin-left:7px;vertical-align:middle;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}.pd-slogan-edit:hover{background:var(--accent-soft);color:var(--accent)}@media(min-width:881px){#content .hero.pd-top.pd-with-summary{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);grid-template-areas:"welcome latest" "summary latest";grid-template-rows:auto 1fr;column-gap:18px;row-gap:12px}#content .pd-top:not(.pd-with-summary)>.hero-main{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:16px}#content .pd-top:not(.pd-with-summary)>.hero-main .eyebrow{justify-self:start;grid-column:1;grid-row:1}#content .pd-top:not(.pd-with-summary)>.hero-main .pd-slogan-edit{position:absolute;top:14px;right:12px}#content .pd-top:not(.pd-with-summary)>.hero-main h2{grid-column:1;grid-row:2}#content .pd-top:not(.pd-with-summary)>.hero-main .hero-actions{grid-column:2;grid-row:1/span 2;margin:0 22px 0 0}#content .pd-top:not(.pd-with-summary)>.hero-stat.pd-recent-hero{grid-template-columns:repeat(2,minmax(0,1fr));align-items:center}#content .pd-top:not(.pd-with-summary) .pd-recent-header,#content .pd-top:not(.pd-with-summary) .pd-recent-name,#content .pd-top:not(.pd-with-summary) .pd-recent-subjects{grid-column:1/-1}#content .pd-top:not(.pd-with-summary) .pd-recent-hero:not(:has(.pd-recent-ranks)) .pd-recent-main{grid-column:1/-1}}@media(max-width:620px){#content .pd-top>.hero-main,#content .pd-top>.quick-card{padding:16px 15px}#content .pd-top>.hero-main h2{font-size:23px}#content .pd-top{gap:12px}}',
    '.pd-subhead{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:12px;padding:10px 0 4px}.pd-item{display:flex;align-items:center;gap:12px;min-width:0}.pd-item>span{min-width:0;overflow-wrap:anywhere}.pd-thumb{display:block;flex:none;width:70px;height:46px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--panel-solid);box-sizing:border-box}.pd-row,.pd-pin-row{min-height:56px;padding:5px 0;box-sizing:border-box}.pd-pin-row{gap:8px}.pd-pin-actions button{white-space:nowrap}.pd-slogan-settings{border-top:1px solid var(--line);margin-top:10px;padding:14px 0 5px;display:grid;gap:8px}.pd-slogan-head,.pd-slogan-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px}.pd-slogan-head select,.pd-slogan-field textarea{font:inherit;font-size:13px;color:var(--text);background:var(--panel-solid);border:1px solid var(--line);border-radius:9px;padding:8px;min-width:0}.pd-slogan-preview{padding:10px 0 8px}.pd-slogan-settings [hidden]{display:none!important}.pd-slogan-field textarea{width:100%;box-sizing:border-box;resize:vertical}.pd-slogan-settings button{justify-self:end;font:inherit;font-size:12px;color:var(--accent);background:var(--accent-soft);border:0;border-radius:7px;padding:7px 12px;cursor:pointer}.pd-sr-only{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media(min-width:881px){.pd-group>div,[data-pin-list]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28px}.pd-subhead,[data-pin-list],.pd-slogan-settings{grid-column:1/-1}.pd-group>div>.pd-row{border-bottom:1px solid var(--line)}}@media(max-width:400px){.pd-thumb{width:56px;height:39px}.pd-item{gap:8px}.pd-pin-actions{gap:3px}.pd-pin-actions button{padding:7px 6px}}',
    ".pd-quote{--pd-quote-color:var(--text);--pd-quote-mark:var(--accent);display:grid;grid-template-columns:18px minmax(0,1fr);column-gap:9px;align-items:start;min-width:0;color:var(--pd-quote-color);text-align:left}\n@supports(color:color-mix(in srgb,black,white)){.pd-quote{--pd-quote-color:color-mix(in srgb,var(--accent) 58%,var(--text));--pd-quote-mark:color-mix(in srgb,var(--accent) 58%,var(--muted))}}\n.pd-quote[hidden]{display:none!important}\n.pd-quote-mark{font-family:Georgia,\"Times New Roman\",serif;font-size:42px;font-weight:400;line-height:.9;letter-spacing:-.1em;color:var(--pd-quote-mark);opacity:.65;user-select:none;height:.52em;display:block;padding-top:1px}\n.pd-quote-text{display:block;min-width:0;max-width:100%;font-family:\"Songti SC\",\"Noto Serif CJK SC\",\"Noto Serif SC\",\"STSong\",\"SimSun\",Georgia,serif;font-weight:500;letter-spacing:.035em;line-height:1.58;white-space:pre-wrap;line-break:strict;overflow-wrap:anywhere;text-wrap:balance}\nhtml[data-st-title]:not([data-st-title=\"system\"]) .pd-quote-text{font-family:var(--st-title-font,var(--ui-font))}\n.pd-quote[data-quote-long] .pd-quote-text{text-wrap:pretty;letter-spacing:.015em}\n#content .pd-top>.hero-main h2.pd-quote{font-size:clamp(calc(22px * var(--ui-scale,1)),calc(2.15vw * var(--ui-scale,1)),calc(29px * var(--ui-scale,1)));font-weight:500;line-height:1.58;letter-spacing:normal;margin:13px 0 0;min-width:0;align-self:start;color:var(--pd-quote-color)}\n#content .pd-top>.hero-main h2.pd-quote[data-quote-long]{font-size:clamp(calc(20px * var(--ui-scale,1)),calc(1.9vw * var(--ui-scale,1)),calc(25px * var(--ui-scale,1)))}\n#content .pd-top>.hero-main h2.pd-quote:not([hidden])+.hero-actions{margin-top:15px}\n.pd-slogan-preview.pd-quote{font-size:calc(21px * var(--ui-scale,1));font-weight:500}\n.pd-slogan-preview.pd-quote[data-quote-long]{font-size:calc(18px * var(--ui-scale,1))}\n.pd-slogan-preview .pd-quote-mark{font-size:36px;opacity:.65}\n.pd-slogan-edit:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n#content .pd-top>.hero-main.st-decorated>.eyebrow{max-width:calc(100% - var(--st-deco-size,40px) - 48px)}\n@media(min-width:881px){#content .pd-top:not(.pd-with-summary)>.hero-main:not(.st-decorated) h2.pd-quote{margin-top:8px}#content .pd-top:not(.pd-with-summary)>.hero-main:not(.st-decorated) h2.pd-quote+.hero-actions{margin-top:0}#content .pd-top:not(.pd-with-summary)>.hero-main.st-decorated{display:block}#content .pd-top:not(.pd-with-summary)>.hero-main.st-decorated .pd-slogan-edit{position:static}#content .pd-top:not(.pd-with-summary)>.hero-main.st-decorated .hero-actions{margin:14px 0 0}}\n@media(max-width:620px){#content .pd-top>.hero-main h2.pd-quote{font-size:calc(22px * var(--ui-scale,1));column-gap:6px;grid-template-columns:15px minmax(0,1fr);margin-top:10px}#content .pd-top>.hero-main h2.pd-quote[data-quote-long]{font-size:calc(20px * var(--ui-scale,1))}#content .pd-top>.hero-main .pd-quote-mark{font-size:36px}.pd-slogan-preview.pd-quote{font-size:calc(19px * var(--ui-scale,1))}}\n@media(forced-colors:active){.pd-quote{--pd-quote-color:CanvasText;--pd-quote-mark:CanvasText}}",
    '.pd-chart-head{min-width:0;flex-wrap:wrap}.pd-chart-head .card-title{flex:1 1 100px;min-width:0}.pd-chart-controls{display:flex;align-items:center;gap:4px;min-width:0;max-width:100%}.pd-chart-controls select{font:inherit;font-size:var(--ui-caption,12px);color:var(--text);background:var(--cell,var(--panel-solid));border:1px solid var(--line);border-radius:9px;padding:5px 7px;min-height:34px;max-width:140px;cursor:pointer}.pd-chart-controls select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.pd-chart-controls .pd-remove{flex:none}.pd-chart-body{min-width:0}.pd-chart-controls select:disabled{opacity:.6;cursor:default}',
    '.pd-note{margin:14px 0 4px}.pd-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}.pd-foot button{font:inherit;color:var(--accent);background:none;border:0;padding:8px 0;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(style);
  var priorBind = bindPage;
  bindPage = function () { var result = priorBind.apply(this, arguments); sync(); return result; };
  // Modules such as goals and deep analysis may insert cards after the initial page render.
  function boot() {
    sync();
    var mq=window.matchMedia('(min-width:881px)');if(mq.addEventListener)mq.addEventListener('change',schedule);else if(mq.addListener)mq.addListener(schedule);
    var goalMq=window.matchMedia('(min-width:640px)');if(goalMq.addEventListener)goalMq.addEventListener('change',schedule);else if(goalMq.addListener)goalMq.addListener(schedule);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule();});
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
