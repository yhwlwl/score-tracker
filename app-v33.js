/* app-v33.js · v5.1 长期目标系统 + 市/区排名(总分层面)
   蓝本:design/goal-system.html(四场景 + 统计页联动 + 六项科学加固)
   铁律:①一种目标一个名字 ②没有数据就没有界面 ③每屏一个主动作
        ④分析页位比主轴不动 ⑤口径写明 ⑥埋点只记行为不记内容 */
(function(){
"use strict";
if(window.__v33)return;
window.__v33=1;

/* ================= 基础 ================= */
function $(s,r){return (r||document).querySelector(s)}
function $all(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}
function track(ev,meta){try{if(typeof window.__stTrack==="function")window.__stTrack(ev,meta||{})}catch(e){}}
var LS_DISMISS="st_goal_v33_dismissed";

/* ================= 目标档案 ================= */
var G={data:null,loaded:false};
function hasGoal(){
  var d=G.data;if(!d)return false;
  var n=0;for(var k in (d.subjects||{}))n++;
  return !!(n>0||d.totalGoal!=null||d.school||d.date);
}
function goalSubjects(){return G.data&&G.data.subjects?G.data.subjects:{}}
/* 顶层 const state 不会挂到 window 上,必须经词法作用域安全取用 */
function ST(){try{return state}catch(e){return null}}
function examSource(){
  var s=ST();
  var a=s&&Array.isArray(s.allExams)?s.allExams:null;
  var b=s&&Array.isArray(s.exams)?s.exams:null;
  return (a&&a.length?a:b)||[];
}
function scoreOf(sc){
  if(sc==null)return null;
  if(typeof sc==="number")return sc;
  var v=sc.actual!=null?sc.actual:(sc.final!=null?sc.final:(sc.score!=null?sc.score:null));
  return v==null?null:Number(v);
}
function maxOf(sc,dft){return sc&&sc.max!=null?Number(sc.max):(dft||0)}
function activeSubjects(){
  var seen={},out=[];
  function push(n,max){if(n&&!seen[n]){seen[n]=1;out.push({name:n,max:max||0})}}
  (Array.isArray(state.subjectConfigs)?state.subjectConfigs:[]).forEach(function(s){
    if(typeof s==="string")push(s);else push(s&&s.name,s&&(s.defaultMax||s.max));
  });
  (Array.isArray(window.SUBJECTS)?window.SUBJECTS:[]).forEach(function(n){push(typeof n==="string"?n:n&&n.name)});
  var st=ST();
  ((st&&Array.isArray(st.exams))?st.exams:[]).forEach(function(e){
    ["scores","subjects"].forEach(function(k){
      var o=e[k];if(!o||typeof o!=="object")return;
      Object.keys(o).forEach(function(n){
        var sc=o[n],m=typeof sc==="object"&&sc?(sc.max||(sc.defaultMax||0)):0;
        push(n,m);
      });
    });
  });
  return out;
}
function latestScore(name){
  var ex=examSource().slice().sort(function(a,b){
    return String(b.exam_date).localeCompare(String(a.exam_date));
  });
  for(var i=0;i<ex.length;i++){
    if(ex[i].is_hidden)continue;
    var sc=(ex[i].scores&&ex[i].scores[name])||(ex[i].subjects&&ex[i].subjects[name]);
    var v=scoreOf(sc);
    if(v!=null)return {v:v,max:maxOf(sc,0),exam:ex[i]};
  }
  return null;
}
function totalGoalValue(){
  if(!G.data)return null;
  if(G.data.totalGoal!=null)return Number(G.data.totalGoal);
  var sum=null;var gs=goalSubjects();
  for(var k in gs){sum=(sum||0)+Number(gs[k])}
  return sum;
}

/* ================= 数据读写 ================= */
function apiCall(action,payload){
  /* list/bootstrap 已顺路携带 goal:优先消费缓存,省一次边缘调用 */
  if(action==="get_goal"&&window.__v33GoalCache){
    var c=window.__v33GoalCache;window.__v33GoalCache=null;
    return Promise.resolve(c);
  }
  if(typeof dataApiV7==="function")return dataApiV7(action,payload);
  return Promise.reject(new Error("dataApiV7 缺失"));
}
/* 拦截 list/bootstrap 响应,把顺路的 goal 存入缓存 */
var dApiBeforeV33=(typeof dataApiV7==="function")?dataApiV7:null;
if(dApiBeforeV33){
  dataApiV7=function(action,payload){
    var p=dApiBeforeV33.apply(this,arguments);
    if(action==="bootstrap"||action==="list_exams"){
      try{Promise.resolve(p).then(function(r){try{if(r&&r.goal!==undefined)window.__v33GoalCache=r}catch(e){}},function(){})}catch(e){}
    }
    return p;
  };
}
function loadGoal(){
  return apiCall("get_goal",{}).then(function(r){
    var g=(r&&r.goal)||null;
    G.data=g?{
      subjects:g.subjects||{},
      totalGoal:g.totalGoal!=null?Number(g.totalGoal):null,
      school:g.school||g.dream_school||"",
      date:g.date||g.exam_date||"",
      dateName:g.dateName||g.date_name||""
    }:{subjects:{},totalGoal:null,school:"",date:"",dateName:""};
    G.loaded=true;refreshGoalUI();
    setTimeout(function(){try{refreshGoalUI()}catch(e){}},1200);
    setTimeout(function(){try{refreshGoalUI()}catch(e){}},3000);
    setTimeout(function(){try{if(!examSource().length)refreshGoalUI()}catch(e){}},6000);
  }).catch(function(){G.loaded=true;});
}
function persistGoal(){
  var d=G.data||{};
  return apiCall("save_goal",{goal:{
    subjects:d.subjects||{},totalGoal:d.totalGoal??null,
    school:d.school||"",date:d.date||"",dateName:d.dateName||""
  }});
}

/* ================= 样式 ================= */
(function css(){
  if(document.getElementById("app-v33-style"))return; /* index.html 已静态内置 */
  var st=document.createElement("style");st.id="app-v33-style";
  st.textContent=
  ".goal-hero-v33{display:flex;gap:18px;background:linear-gradient(145deg,var(--panel-solid,#fff),var(--accent-soft,#eef1ff));border:1px solid var(--line,#e8ebf0);border-radius:20px;box-shadow:var(--shadow,0 10px 35px rgba(27,37,58,.08));padding:16px 18px;margin:14px 0;cursor:pointer}"
  ".goal-hero-v33:active{transform:translateY(1px)}"
  ".gh-main-v33{flex:1;min-width:0}.gh-title-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}"
  ".gh-title{font-size:13.5px;font-weight:750}.gh-hint{font-size:11px;color:var(--muted,#788392)}"
  ".gh-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;touch-action:pan-x;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;cursor:grab}.gh-chips::-webkit-scrollbar{display:none}"
  ".gh-chip{flex:0 0 auto;border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:13px;padding:8px 11px;min-width:84px;cursor:pointer}"
  ".gh-chip small{display:block;font-size:10.5px;color:var(--muted,#788392)}.gh-chip b{font-size:15px;font-variant-numeric:tabular-nums}.gh-chip em{display:block;font-style:normal;font-size:10.5px;margin-top:1px}"
  ".gh-chip.ok em{color:var(--green,#32a77a)}.gh-chip.no em{color:var(--danger,#d9534f)}.gh-chip.na{opacity:.55}.gh-chip.na em{color:var(--muted,#788392)}"
  ".gh-total{margin-top:10px;display:flex;align-items:baseline;gap:8px;font-variant-numeric:tabular-nums}.gh-total b{font-size:23px;letter-spacing:-.5px}.gh-total span{font-size:11.5px;color:var(--muted,#788392)}"
  ".gh-side{flex:0 0 168px;display:flex;flex-direction:column;gap:10px;justify-content:center}"
  ".gh-cd{background:var(--accent,#5d72e8);color:#fff;border-radius:16px;padding:13px;text-align:center}.gh-cd small{display:block;font-size:11px;opacity:.85}.gh-cd b{display:block;font-size:29px;font-variant-numeric:tabular-nums;line-height:1.15}"
  ".gh-cd.expired{background:var(--warn,#b97f24)}"
  ".gh-school{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);border-radius:14px;padding:9px 12px;font-size:12px;color:var(--muted,#788392)}.gh-school b{display:block;color:var(--text,#18212f);font-size:14px;margin-top:2px}"
  ".goal-bar-v33{border:1.5px dashed var(--line,#e8ebf0);border-radius:16px;padding:12px 14px;font-size:12.5px;color:var(--muted,#788392);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0;background:transparent;width:100%;text-align:left}"
  ".goal-bar-v33 b{color:var(--accent,#5d72e8)}"
  ".bar-x-v33{border:0;background:transparent;color:var(--muted,#788392);font-size:16px;padding:4px 7px;border-radius:8px;cursor:pointer;flex:0 0 auto}"
  ".gmodal-backdrop{position:fixed;inset:0;background:rgba(22,28,39,.42);backdrop-filter:blur(6px);display:none;place-items:center;padding:18px;z-index:120}"
  ".gmodal-backdrop.open{display:grid}"
  ".gmodal{width:min(600px,100%);max-height:min(88vh,840px);overflow:auto;background:var(--panel-solid,#fff);border-radius:22px;box-shadow:0 30px 90px rgba(15,20,35,.3);color:var(--text,#18212f)}"
  ".gm-head{position:sticky;top:0;background:var(--panel-solid,#fff);display:flex;justify-content:space-between;align-items:center;padding:17px 20px 11px;border-bottom:1px solid var(--line,#e8ebf0)}"
  ".gm-head h3{margin:0;font-size:16px}.gm-head small{display:block;font-weight:400;color:var(--muted,#788392);font-size:11.5px;margin-top:3px}"
  ".gm-x{border:0;background:var(--line,#e8ebf0);width:32px;height:32px;border-radius:10px;font-size:16px;cursor:pointer;color:inherit}"
  ".gm-body{padding:15px 20px 21px}"
  ".gm-label{font-size:12px;font-weight:750;margin:15px 0 8px}.gm-label:first-child{margin-top:0}.gm-label span{font-weight:400;color:var(--muted,#788392);font-size:11.5px;margin-left:6px}"
  ".gm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}"
  ".gm-sf{border:1px solid var(--line,#e8ebf0);border-radius:13px;padding:7px 10px;background:var(--panel-solid,#fff)}"
  ".gm-sf label{display:block;font-size:10.5px;color:var(--muted,#788392);margin-bottom:3px}"
  ".gm-sf input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:15px;font-weight:700;color:var(--text,#18212f);font-variant-numeric:tabular-nums}"
  ".gm-input{width:100%;border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:10px 12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;outline:0}"
  ".gm-total{display:flex;align-items:center;gap:10px;border:1px solid var(--line,#e8ebf0);border-radius:13px;padding:9px 12px;background:var(--accent-soft,#eef1ff);margin-bottom:6px}"
  ".gm-total b{font-size:19px;font-variant-numeric:tabular-nums}.gm-total .an{font-size:11px;color:var(--muted,#788392);margin-left:auto}"
  ".gm-mini{border:1px solid var(--line,#e8ebf0);background:var(--panel-solid,#fff);color:var(--muted,#788392);border-radius:10px;padding:7px 11px;font-size:11.5px;cursor:pointer}"
  ".gm-mini.on{border-color:var(--accent,#5d72e8);color:var(--accent,#5d72e8);font-weight:700}"
  ".gm-foot{display:flex;justify-content:space-between;gap:10px;margin-top:18px}"
  ".gm-save{border:0;background:var(--text,#18212f);color:#fff;border-radius:12px;padding:11px 18px;font-weight:700;cursor:pointer}"
  ".gm-clear{border:1px solid var(--line,#e8ebf0);background:transparent;color:var(--danger,#d9534f);border-radius:12px;padding:11px 14px;cursor:pointer;font-size:12.5px}"
  ".gm-hint{font-size:11px;color:var(--warn,#b97f24);margin:6px 2px 0;min-height:14px}"
  /* 统计页联动 */
  ".v33-goal-line{border-top:1px dashed var(--line,#e8ebf0);margin-top:10px;padding-top:9px;font-size:12.5px;line-height:1.75}"
  ".tag-ok-v33{font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 8px;background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a);margin-left:6px;white-space:nowrap}"
  ".v33-entry{font-size:11.5px;color:var(--muted,#788392)}.v33-entry a,.v33-entry button{color:var(--accent,#5d72e8);background:none;border:0;padding:0;font-size:11.5px;cursor:pointer}"
  /* 市/区排名 */
  "#v33cityBox{max-width:100%;overflow:hidden}#v33cityBox details{border-top:1px solid var(--line,#e8ebf0)}#v33cityBox summary{list-style:none;cursor:pointer;padding:10px 2px;font-size:12.5px;color:var(--muted,#788392);display:flex;justify-content:space-between}#v33cityBox summary::-webkit-details-marker{display:none}"
  ".v33-citygrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px 0 6px}.v33-citygrid>div{min-width:0}.v33-lab{display:block;font-size:11px;color:var(--muted,#788392);margin-bottom:4px}.v33-pair{display:flex;gap:6px}.v33-pair input{flex:1;width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line,#e8ebf0);border-radius:10px;padding:8px;background:var(--panel-solid,#fff);font:inherit;color:var(--text,#18212f)}"
  "@media(max-width:520px){.v33-citygrid{grid-template-columns:1fr}}"
  "@media(max-width:760px){.goal-hero-v33{flex-direction:column;gap:14px}.gh-side{flex:none;flex-direction:row;width:100%;gap:8px}.gh-side>*{flex:1;min-width:0}.gh-cd{padding:10px 12px}.gh-cd b{font-size:24px}.gh-school{display:flex;flex-direction:column;justify-content:center}.gh-title-row{margin-bottom:8px}.gh-total{flex-wrap:wrap;row-gap:3px;margin-top:9px}.gh-total b{white-space:nowrap;font-size:20px;line-height:1.25}.gh-total span{flex:1 1 100%;line-height:1.65}}";
  document.head.appendChild(st);
})();

/* ================= 首页通栏卡 ================= */
function daysLeft(){
  if(!G.data||!G.data.date)return null;
  var d=Math.ceil((new Date(G.data.date+"T00:00:00")-new Date())/86400000);
  return isNaN(d)?null:d;
}
function chipHtml(s){
  var g=goalSubjects(),sc=latestScore(s.name);
  var goal=g[s.name];
  var v=sc?sc.v:null,diff=(goal!=null&&v!=null)?v-goal:null;
  var cls,tail;
  if(goal==null){cls="na";tail="未设目标"}
  else if(diff==null){cls="na";tail="待考试"}
  else{cls=diff>=0?"ok":"no";tail=diff>=0?"已超 "+diff:"还差 "+(-diff)}
  if(goal!=null&&v==null&&!examSource().length)tail="成绩读取中…";
  return '<span class="gh-chip '+cls+'" data-subject="'+esc(s.name)+'" onclick="event.stopPropagation();__v33.jump(\''+esc(s.name).replace(/'/g,"")+'\')" title="查看统计分析">'
    +"<small>"+esc(s.name)+" · "+(goal==null?"—":"目标 "+goal)+"</small><b>"+(v==null?"—":v)+"</b><em>"+tail+"</em></span>";
}
function renderHomeCard(mount){
  var hero=heroAnchor();if(!hero)return;
  var old=$("#goalHeroV33");if(old)old.remove();
  var bar=$("#goalBarV33");if(bar)bar.remove();
  if(!hasGoal()){
    if(localStorage.getItem(LS_DISMISS)==="1"){return;}
    var b=document.createElement("div");b.id="goalBarV33";b.className="goal-bar-v33";
    b.innerHTML='<span>为这一学年设一个<b>长期目标</b> —— 各科分数、理想学校、倒计时（选填，不影响任何现有功能）</span>'
      +'<button class="bar-x-v33" aria-label="不再显示" onclick="event.stopPropagation();__v33.dismiss()">×</button>';
    b.onclick=function(){openEditor("prompt_bar")};
    hero.insertAdjacentElement("afterend",b);
    try{if(!sessionStorage.getItem("st_goal_prompt_seen")){sessionStorage.setItem("st_goal_prompt_seen","1");track("goal_prompt_shown");}}catch(e){}
    return;
  }
  var subs=activeSubjects();
  var chips=subs.map(chipHtml).join("");
  var recent=SUB_TOTALS();
  var tg=totalGoalValue();
  var tDiff=(tg!=null&&recent.has)?recent.sum-tg:null;
  var side="";
  var dl=daysLeft();
  if(dl!=null){
    side+=dl<0
      ?'<div class="gh-cd expired"><small>'+esc(G.data.dateName||"目标")+'已到期</small><b>更新日期</b></div>'
      :'<div class="gh-cd"><small>'+esc(G.data.dateName||"目标")+"倒计时</small><b>"+dl+" 天</b></div>";
  }
  if(G.data.school)side+='<div class="gh-school">理想学校<b>'+esc(G.data.school)+"</b></div>";
  var card=document.createElement("div");card.id="goalHeroV33";card.className="goal-hero-v33";
  card.onclick=function(){openEditor("card")};
  card.innerHTML='<div class="gh-main-v33"><div class="gh-title-row"><span class="gh-title">我的目标 · '+esc(G.data.name||"本学期")
    +'</span><span class="gh-hint">点击编辑</span></div>'
    +'<div class="gh-chips">'+chips+'</div>'
    +'<div class="gh-total"><b>'+(tDiff==null||!recent.has?"—":(tDiff>=0?"超 ":"差 ")+Math.abs(tDiff)+" 分")+"</b><span>"
    +(recent.has?("最近总分 "+recent.sum+(tg!=null?" / 目标 "+tg:"")+" · 取各科最近成绩合计（缺考科目不计）"):"尚未有出分记录")+"</span></div></div>"
    +(side?'<div class="gh-side">'+side+"</div>":"");
  hero.insertAdjacentElement("afterend",card);
  try{
    /* 手机端:chips 超出即提示可左右滑(并保证横滑不会被整体点击吃掉) */
    var cw=$(".gh-chips",card);
    if(cw&&cw.scrollWidth>cw.clientWidth+6){
      var ht=$(".gh-hint",card);if(ht)ht.textContent="左右滑看各科 · 点卡片编辑";
      cw.scrollLeft=0;
    }
  }catch(e){
    /* 提示可有可无,不阻塞渲染 */
  }
}
function SUB_TOTALS(){
  var subs=activeSubjects(),sum=0,has=false;
  subs.forEach(function(s){var r=latestScore(s.name);if(r){sum+=r.v;has=true}});
  return {sum:sum,has:has};
}

/* ================= 编辑弹窗 ================= */
var EDIT={mode:"auto"};
function openEditor(via){
  track("goal_editor_open",{via:via||"unknown"});
  var bk=$("#goalBkV33");
  if(!bk){
    bk=document.createElement("div");bk.id="goalBkV33";bk.className="gmodal-backdrop";
    bk.innerHTML='<div class="gmodal" role="dialog" aria-modal="true"><div class="gm-head"><h3>编辑长期目标<small>改动即时生效；随时可以回来修改</small></h3><button class="gm-x" aria-label="关闭">×</button></div><div class="gm-body"></div></div>';
    document.body.appendChild(bk);
    bk.addEventListener("click",function(e){if(e.target===bk)closeEditor()});
    $(".gm-x",bk).onclick=closeEditor;
  }
  var d=G.data=G.data||{subjects:{},totalGoal:null,school:"",date:"",dateName:""};
  var grid=activeSubjects().map(function(s){
    var g=d.subjects[s.name];var best=bestOf(s.name);
    return '<div class="gm-sf"><label>'+esc(s.name)+(s.max?" · 满分 "+s.max:"")+" · 最佳 "+(best==null?"—":best)
      +'</label><input inputmode="decimal" data-gsubject="'+esc(s.name)+'" value="'+(g==null?"":g)+'"/></div>';
  }).join("");
  if(!grid)grid='<p class="gm-hint" style="color:var(--muted,#788392)">还没有科目数据——先去添加一次考试,或检查科目设置。</p>';
  var dateOpts=["高考","中考","期末考试","自定义…"].map(function(o){
    return '<option'+((o===d.dateName)||(o==="自定义…"&&!d.dateName)?' selected':"")+">"+o+"</option>";
  }).join("");
  $(".gm-body",bk).innerHTML=
    '<div class="gm-label">① 各科目标分数 <span>按正式（最终 / 赋分）成绩填写 · 留空表示暂不定</span></div>'
    +'<div class="gm-grid">'+grid+'</div>'
    +'<div class="gm-label">② 总分与理想学校</div>'
    +'<div class="gm-total"><span style="font-size:12px;color:var(--muted,#788392)">总分目标</span><b id="gv33Total">—</b><span class="an" id="gv33ModeTxt"></span></div>'
    +'<p class="gm-hint" id="gv33Hint"></p>'
    +'<div style="display:flex;gap:8px;margin-bottom:10px"><button class="gm-mini" id="gv33Auto">自动求和</button><button class="gm-mini" id="gv33Manu">手动指定</button>'
    +'<input class="gm-input" id="gv33Manual" style="display:none;max-width:140px" inputmode="decimal" placeholder="如 675"/></div>'
    +'<input class="gm-input" id="gv33School" style="width:100%" maxlength="40" placeholder="理想学校（选填），例如 浙江大学"/>'
    +'<div class="gm-label">③ 目标日期 <span>用于首页倒计时，可不填</span></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><select class="gm-input" id="gv33DateName" style="max-width:150px">'+dateOpts+'</select>'
    +'<input class="gm-input" id="gv33Custom" style="display:none;max-width:150px" maxlength="20" placeholder="名称，如 一模"/>'
    +'<input class="gm-input" id="gv33Date" type="date" style="max-width:190px"/></div>'
    +'<div class="gm-foot"><button class="gm-clear" id="gv33Clear">清除全部目标</button><button class="gm-save" id="gv33Save">保存</button></div>';
  $("#gv33School").value=d.school||"";
  $("#gv33Date").value=d.date||"";
  EDIT.mode=d.totalGoal!=null?"manu":"auto";
  $("#gv33Manual").value=d.totalGoal==null?"":d.totalGoal;
  syncModeUI();refreshTotalPreview();
  $("#gv33Auto").onclick=function(){EDIT.mode="auto";syncModeUI();refreshTotalPreview()};
  $("#gv33Manu").onclick=function(){EDIT.mode="manu";syncModeUI();refreshTotalPreview()};
  $("#gv33Manual").oninput=refreshTotalPreview;
  $all(".gm-grid input",bk).forEach(function(inp){inp.oninput=refreshTotalPreview});
  $("#gv33DateName").onchange=function(){$("#gv33Custom").style.display=this.value==="自定义…"?"":"none"};
  var dnFixed=["高考","中考","期末考试","自定义…"];
  if(d.dateName&&dnFixed.indexOf(d.dateName)<0){$("#gv33DateName").value="自定义…";$("#gv33Custom").style.display="";$("#gv33Custom").value=d.dateName;}
  else{$("#gv33DateName").value=d.dateName||"高考";if(d.dateName==="自定义…"){$("#gv33Custom").style.display="";}}
  $("#gv33Save").onclick=saveEditor;
  $("#gv33Clear").onclick=clearEditor;
  bk.classList.add("open");
}
function bestOf(name){
  var best=null;
  examSource().forEach(function(e){
    if(e.is_hidden)return;var sc=e.scores&&e.scores[name];
    if(sc&&sc.actual!=null){var v=Number(sc.actual);if(best==null||v>best)best=v;}
  });
  return best;
}
function collectInputs(){
  var g={};$all('#goalBkV33 [data-gsubject]').forEach(function(i){var v=i.value.trim();if(v!=="")g[i.dataset.gsubject]=v});
  return g;
}
function refreshTotalPreview(){
  var t;
  if(EDIT.mode==="auto"){
    t=0;var has=false,g=collectInputs();
    for(var k in g){t+=+g[k];has=true}
    $("#gv33Total").textContent=has?t:"—";
    $("#gv33ModeTxt").textContent="= 各科之和（可手动指定）";
    $("#gv33Hint").textContent="";
  }else{
    t=parseInt($("#gv33Manual").value,10);
    $("#gv33Total").textContent=$("#gv33Manual").value||"—";
    $("#gv33ModeTxt").textContent="手动指定";
    var sum=0,has=false,g=collectInputs();
    for(var k in g){sum+=+g[k];has=true}
    if(has&&t&&t!==sum){$("#gv33Hint").textContent="注意：手动总分 "+t+" 与各科目标之和 "+sum+" 相差 "+Math.abs(t-sum)+" 分（各科差距仍按单科目标计算）";}
    else $("#gv33Hint").textContent="";
  }
}
function syncModeUI(){
  $("#gv33Auto").className="gm-mini"+(EDIT.mode==="auto"?" on":"");
  $("#gv33Manu").className="gm-mini"+(EDIT.mode==="manu"?" on":"");
  $("#gv33Manual").style.display=EDIT.mode==="auto"?"none":"";
}
function closeEditor(){var b=$("#goalBkV33");if(b)b.classList.remove("open")}
function saveEditor(){
  var d=G.data=G.data||{};
  d.subjects=collectInputs();
  var school=$("#gv33School").value.trim();
  var date=$("#gv33Date").value||"";
  var dn=$("#gv33DateName").value;
  d.dateName=dn==="自定义…"?(($("#gv33Custom").value.trim())||"目标"):dn;
  d.school=school;d.date=date;
  if(EDIT.mode==="manu"){var m=parseInt($("#gv33Manual").value,10);d.totalGoal=isNaN(m)?null:m;}
  else{var s=0,h=false;for(var k in d.subjects){s+=+d.subjects[k];h=true}d.totalGoal=h?s:null;}
  try{__stTrack("goal_saved",{subjects_set:Object.keys(d.subjects).length,has_school:d.school?1:0,has_date:d.date?1:0,total_mode:EDIT.mode==="manu"?"manual":"auto"})}catch(e){}
  persistGoal().then(function(){refreshGoalUI()}).catch(function(){});
  closeEditor();refreshGoalUI();
}
function clearEditor(){
  track("goal_cleared");
  G.data={subjects:{},totalGoal:null,school:"",date:"",dateName:""};
  persistGoal().then(function(){refreshGoalUI()}).catch(function(){});
  closeEditor();refreshGoalUI();
}
function dismissPrompt(){
  track("goal_prompt_dismiss");
  try{localStorage.setItem(LS_DISMISS,"1")}catch(e){}
  refreshGoalUI();
}

/* ================= 刷新入口 ================= */
function currentPage(){
  try{var a=$('[data-page].active');if(a&&a.dataset.page)return a.dataset.page}catch(e){}
  return "unknown";
}
function heroAnchor(){return $("#content section.hero")||$("#app section.hero")||document.querySelector("section.hero")}
function accountGrid(){return $("#content .account-grid")||$("#app .account-grid")}
function refreshGoalUI(){
  if(currentPage()==="home"){var h=heroAnchor();if(h)renderHomeCard("#content section.hero,#app section.hero,section.hero");}
  injectAccountEntry();
  try{injectStatsLinkage()}catch(e){window.__v33LastErr=(e&&(e.message||String(e)))||"linkage-error"}
}

/* ================= 账号页入口 ================= */
function injectAccountEntry(){
  if(currentPage()!=="account")return;
  var grid=accountGrid();if(!grid)return;
  var old=$("#v33AccountCard");if(old)old.remove();
  if(hasGoal())return; /* 已设目标:账号页不需要入口 */
  var c=document.createElement("div");c.id="v33AccountCard";c.className="card";c.style.padding="16px 18px";
  c.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h3 class="card-title" style="margin:0;font-size:15px">长期目标</h3><p class="card-sub" style="margin:3px 0 0">各科分数、理想学校、倒计时；首页会显示与目标的差距</p></div><button class="secondary" style="flex:none">'+(localStorage.getItem(LS_DISMISS)==="1"||G.loaded?"设置 ›":"设置 ›")+"</button></div>";
  $("button",c).onclick=function(){openEditor("account")};
  grid.appendChild(c);
}

/* ================= 统计页联动 ================= */
function findStatCard(kw){
  var cards=$all("#content .card");
  for(var i=0;i<cards.length;i++){var h=$("h3.card-title",cards[i]);if(h&&(h.textContent||"").indexOf(kw)>-1)return cards[i]}
  return null;
}
function injectStatsLinkage(){
  if(currentPage()!=="stats")return;
  /* ⑥ 目标校准:追加长期目标进度行(稳健口径说明见方法论) */
  var cal=findStatCard("目标校准");
  if(cal&&!$("#v33CalibRow",cal)){
    var row=document.createElement("div");row.id="v33CalibRow";row.className="v33-goal-line";
    cal.appendChild(row);
    fillCalib(row);
  }else if(cal&&$("#v33CalibRow",cal)){fillCalib($("#v33CalibRow",cal));}
  /* ⑤ 个人最佳殿堂:达标徽记 + 汇总 */
  var hall=findStatCard("个人最佳殿堂");
  if(hall)$all(".tag-ok-v33",hall).forEach(function(x){x.remove()});
  var sumEl=$("#v33HallSum");if(sumEl)sumEl.remove();
  if(hall&&hasGoal()){
    var g=goalSubjects(),hit=0,tried=0;
    $all("tbody tr",hall).forEach(function(tr){
      var tds=$("td",tr)?tr.children:null;if(!tds||!tds.length)return;
      var name=(tds[0].textContent||"").trim();
      if(!(name in g))return;
      tried++;
      var m=(tds[2]?(tds[2].textContent||""):"").match(/(\d+(?:\.\d+)?)/);
      var best=m?parseFloat(m[1]):null;
      if(best!=null&&best>=g[name]){
        hit++;var pill=document.createElement("span");pill.className="tag-ok-v33";pill.textContent="最佳已达标";
        tds[tds.length-1].appendChild(pill);
      }
    });
    if(tried){
      var sm=document.createElement("p");sm.id="v33HallSum";sm.className="card-sub";sm.style.margin="8px 2px 0";
      sm.innerHTML="长期目标进度：最佳成绩已有 <b>"+hit+" / "+tried+"</b> 科达到目标。「最佳已达标」只陈述峰值触达。";
      hall.appendChild(sm);
    }
  }
  /* 未设目标时:校准模块给一行小字入口(统计页唯一曝光点) */
  if(cal&&!hasGoal()){
    var en=$("#v33CalibEntry",cal);
    if(!en){en=document.createElement("div");en.id="v33CalibEntry";en.className="v33-goal-line v33-entry";
      en.innerHTML='设定长期目标后，此处会显示进度与逐科差距 · <button type="button">去设定</button>';
      $("button",en).onclick=function(){openEditor("stats_module")};
      cal.appendChild(en);}
  }else if(cal){var e2=$("#v33CalibEntry",cal);if(e2)e2.remove();}
}
function fillCalib(row){
  if(!hasGoal()){row.innerHTML="";return;}
  var rec=SUB_TOTALS(),tg=totalGoalValue();
  if(tg==null){row.innerHTML="";return;}
  var diff=rec.has?rec.sum-tg:null;
  row.innerHTML='<div style="color:var(--muted,#788392)">长期目标进度（口径：最近一次合计）</div>'
    +"中位参考见首页 · 最近总分 <b>"+(rec.has?rec.sum:"—")+"</b> / 目标 "+tg
    +" · "+(diff==null?"等待出分":(diff>=0?'<b style="color:var(--green,#32a77a)">已超 '+diff+"</b> 分":'还差 <b style="color:var(--danger,#d9534f)">'+(-diff)+"</b> 分"))
    +'　<button type="button" style="color:var(--accent,#5d72e8);background:none;border:0;padding:0;font-size:12px;cursor:pointer" onclick="__v33.editFromStats()">回首页看逐科差距</button>';
}

/* ================= 市/区排名录入(仅新增/编辑弹窗,显式应用防覆盖) ================= */
var cityObs=null;
function watchExamModal(){
  if(cityObs||typeof MutationObserver!=="function")return;
  cityObs=new MutationObserver(function(){
    /* 遍历全部 backdrop(防残留弹窗挡道);只认「记录/编辑考试」弹窗 */
    var backs=$all(".modal-backdrop");
    for(var i=0;i<backs.length;i++){
      var b=backs[i];
      if(!$("#examName",b)||!$("#examDate",b))continue;
      /* v16+ 排名区是 .total-ranks-v16(年级/班级卡);老版本兜底 .rank-table-v7 */
      var anchor=$(".total-ranks-v16",b)||$(".rank-table-v7",b);
      if(!anchor||b.querySelector("#v33cityBox"))continue;
      var host=document.createElement("div");host.id="v33cityBox";
    host.innerHTML='<details><summary>市 / 区排名（选填，仅总分层面）<span>展开</span></summary>'
      +'<div class="v33-citygrid">'
      +'<div><label class="v33-lab">市名次 / 市人数</label><div class="v33-pair"><input id="v33CityR" inputmode="numeric" placeholder="名次"/><input id="v33CityN" inputmode="numeric" placeholder="人数"/></div></div>'
      +'<div><label class="v33-lab">区名次 / 区人数</label><div class="v33-pair"><input id="v33DistR" inputmode="numeric" placeholder="名次"/><input id="v33DistN" inputmode="numeric" placeholder="人数"/></div></div>'
      +'<label style="display:flex;gap:7px;align-items:center;font-size:11.5px;color:var(--muted,#788392)"><input type="checkbox" id="v33ApplyCity"/> 保存时应用以上市/区排名（勾选才会写入；编辑旧考试时不勾选则保持原值）</label>'
      +"</div></details>";
      anchor.insertAdjacentElement("afterend",host);
    }
  });
  cityObs.observe(document.body,{childList:true,subtree:true});
}
var apiBeforeV33=(typeof api==="function")?api:null;
if(apiBeforeV33){
  api=function(action,payload){
    if(action==="save_exam"&&payload&&payload.exam&&document.getElementById("v33cityBox")){
      var apply=document.getElementById("v33ApplyCity");
      if(apply&&apply.checked){
        payload.exam.city_rank=$("#v33CityR").value.trim();
        payload.exam.city_participants=$("#v33CityN").value.trim();
        payload.exam.district_rank=$("#v33DistR").value.trim();
        payload.exam.district_participants=$("#v33DistN").value.trim();
      }
    }
    return apiBeforeV33.apply(this,arguments);
  };
}

/* ================= 折线目标横线(得分率单科趋势,v25 几何复刻) ================= */
function fmtPct(v){return Math.round(v*10)/10+"%"}
function annotateTrendV33(html){
  if(!hasGoal()||html.indexOf('<svg viewBox="0 0 760 300"')<0||html.indexOf('stroke-dasharray="7 7"')<0)return html;
  var s33=ST();
  if(!s33||!s33.subject||s33.subject==="总览"||s33.subject==="总分")return html;
  var goal=goalSubjects()[s33.subject];
  if(goal==null)return html;
  var max=100,cfg=Array.isArray(s33.subjectConfigs)?s33.subjectConfigs:[];
  for(var i=0;i<cfg.length;i++){var c=cfg[i],n=typeof c==="string"?c:c.name;if(n===s33.subject){max=(typeof c==="string")?100:(c.defaultMax||c.max||100);break}}
  var exams=(s33.exams||[]).filter(function(e){return !e.is_hidden});
  var vals=[],any=false;
  exams.forEach(function(e){
    var sc=e.scores&&e.scores[s33.subject];if(!sc)return;
    if(sc.actual!=null){vals.push(sc.actual/max*100);any=true}
    if(sc.target!=null)vals.push(sc.target/max*100);
  });
  if(!any)return html;
  var gr=goal/max*100;vals.push(gr);
  var axis=(typeof fullTrendAxisV25==="function")?fullTrendAxisV25(vals,"scoreFinal"):{min:0,max:100,ticks:5};
  if(!axis||axis.max<=axis.min)return html;
  var T=20,B=46,ch=H0-T-B,y=T+(axis.max-gr)/(axis.max-axis.min)*ch;
  if(y<T-2||y>T+ch+2)return html;
  var L=46,R=18,cw=760-L-R,n=exams.length;
  var x1=n===1?L+cw/2:L,x2=n===1?L+cw/2:760-R;
  var tag='<line x1="'+x1+'" y1="'+y.toFixed(1)+'" x2="'+x2+'" y2="'+y.toFixed(1)+'" stroke="#16a085" stroke-width="2" stroke-dasharray="3 4"/>'
    +'<text x="'+(760-R)+'" y="'+(y-6).toFixed(1)+'" text-anchor="end" style="font-size:11px;fill:#16a085">长期目标 '+fmtPct(gr)+"</text>";
  return html.replace("</svg>",tag+"</svg>");
}
var H0=300;
var chartHtmlBeforeV33=(typeof chartHtml==="function")?chartHtml:null;
if(chartHtmlBeforeV33){
  chartHtml=function(){try{return annotateTrendV33(chartHtmlBeforeV33.apply(this,arguments))}catch(e){return chartHtmlBeforeV33.apply(this,arguments)}};
}

/* ================= 启动 ================= */
/* 考试数据晚到:loadExams 完成后立即重绘目标卡,消除「待考试/读取中」竞态 */
var leBeforeV33=(typeof loadExams==="function")?window.loadExams:null;
if(leBeforeV33){
  window.loadExams=function(){
    var p=leBeforeV33.apply(this,arguments);
    try{Promise.resolve(p).then(function(){setTimeout(function(){try{refreshGoalUI()}catch(e){}},60)},function(){})}catch(e){}
    return p;
  };
}
var bindPageBeforeV33=(typeof bindPage==="function")?bindPage:null;
if(bindPageBeforeV33){
  bindPage=function(){
    var r=bindPageBeforeV33.apply(this,arguments);
    setTimeout(function(){try{refreshGoalUI()}catch(e){}},0);
    setTimeout(function(){try{injectStatsLinkage()}catch(e){}},260);
    return r;
  };
}
watchExamModal();
loadGoal();

window.__v33={
  jump:function(subject){track("goal_chip_jump",{subject:subject});var b=$('[data-page="stats"]');if(b)b.click();},
  editFromStats:function(){
    try{var hb=$('[data-page="home"]');if(hb)hb.click();}catch(e){}
    setTimeout(function(){openEditor("stats_module")},120);
  },
  dismiss:dismissPrompt,
  open:function(){openEditor("demo")},
  refresh:refreshGoalUI,
  state:function(){return {loaded:G.loaded,data:G.data,dismissed:localStorage.getItem(LS_DISMISS)}},
  debug:function(){
    var sd=ST();
    var ex=(sd&&Array.isArray(sd.exams))?sd.exams:[];
    return {exams:ex.length,sampleKeys:ex[0]?Object.keys(ex[0]):[],subs:activeSubjects().map(function(s){return s.name}),
      rec:SUB_TOTALS(),latest:ex[0]?latestScore(activeSubjects()[0]?activeSubjects()[0].name:"")||"null":null};
  },
  reload:loadGoal
};
})();
