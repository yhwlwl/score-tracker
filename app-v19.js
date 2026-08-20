// v19 / product v1.1: readable long trends + username rename while preserving original account name.
state.originalUsernameV19 = state.originalUsernameV19 || '';

var USERNAME_API_V19='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-username-api';

(function injectV19Styles(){
  if(document.getElementById('app-v19-style'))return;
  var style=document.createElement('style');
  style.id='app-v19-style';
  style.textContent=`
    .trend-scroll-v19{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;touch-action:pan-x pan-y}
    .trend-scroll-v19::-webkit-scrollbar{display:none}
    .trend-scroll-v19 svg{max-width:none!important;display:block}
    .trend-scroll-hint-v19{display:none;font-size:10px;color:var(--muted);margin-top:6px;text-align:right}
    .username-origin-v19{font-size:11px;color:var(--muted);line-height:1.55;margin-top:8px}
    .username-origin-v19 code{color:#596474}
    .account-chip-v19{justify-content:flex-start!important;flex-wrap:wrap}
    .account-chip-v19 code{margin-right:auto}
    .rename-username-v19{border:1px solid var(--line);background:#fff;color:var(--muted);padding:7px 9px;border-radius:9px;font-size:11px;flex:0 0 auto}
    .username-modal-note-v19{font-size:11px;line-height:1.65;color:var(--muted);margin-top:10px}
    @media(max-width:620px){
      .trend-scroll-hint-v19{display:block}
      .tooltip-card{max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis}
    }
  `;
  document.head.appendChild(style);
})();

async function usernameApiV19(action,payload){
  var response=await fetch(USERNAME_API_V19,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({action:action,token:state.token},payload||{}))
  });
  var data=await response.json().catch(function(){return{error:'网络响应异常'};});
  if(!response.ok)throw new Error(data.error||'用户名请求失败');
  return data;
}

function connectBrokenTrendPathsV19(stage){
  stage.querySelectorAll('svg path[fill="none"]').forEach(function(path){
    var d=path.getAttribute('d')||'';
    var seen=false;
    var next=d.replace(/\bM\b/g,function(){if(!seen){seen=true;return'M';}return'L';});
    if(next!==d)path.setAttribute('d',next);
  });
}

function enhanceTrendStageV19(stage){
  if(!stage||stage.dataset.v19Enhanced==='1')return;
  var svg=stage.querySelector('svg');
  if(!svg)return;
  stage.dataset.v19Enhanced='1';
  stage.classList.add('trend-scroll-v19');
  connectBrokenTrendPathsV19(stage);
  var examCount=Math.max(1,(state.exams||[]).length);
  var viewport=Math.max(280,stage.clientWidth||0);
  var desired=examCount>5?Math.max(viewport,110+examCount*72):viewport;
  svg.style.width=desired+'px';
  svg.style.minWidth=desired+'px';
  if(desired>viewport+4){
    var hint=document.createElement('div');
    hint.className='trend-scroll-hint-v19';
    hint.textContent='← 左右滑动查看全部考试 →';
    stage.insertAdjacentElement('afterend',hint);
    requestAnimationFrame(function(){stage.scrollLeft=Math.max(0,stage.scrollWidth-stage.clientWidth);});
  }
}

function enhanceTrendChartsV19(){
  var candidates=[];
  document.querySelectorAll('#chart,#overviewChart,.rank-chart-stage-v7').forEach(function(stage){
    if(stage.id==='chart'&&stage.querySelector('.rank-chart-stage-v7'))return;
    if(candidates.indexOf(stage)<0)candidates.push(stage);
  });
  candidates.forEach(enhanceTrendStageV19);
}

function clampTrendTooltipV19(point){
  var stage=point&&point.closest&&point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
  if(!stage)return;
  var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
  if(!tip||tip.style.display==='none')return;
  var sr=stage.getBoundingClientRect(),pr=point.getBoundingClientRect();
  tip.style.left=(pr.left-sr.left+stage.scrollLeft+pr.width/2)+'px';
  tip.style.top=(pr.top-sr.top+stage.scrollTop)+'px';
  var tr=tip.getBoundingClientRect();
  var minLeft=Math.max(8,sr.left+6),maxRight=Math.min(window.innerWidth-8,sr.right-6);
  var current=parseFloat(tip.style.left)||0;
  if(tr.left<minLeft)current+=minLeft-tr.left;
  if(tr.right>maxRight)current-=tr.right-maxRight;
  tip.style.left=current+'px';
}

document.addEventListener('click',function(event){
  var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
  if(point)setTimeout(function(){clampTrendTooltipV19(point);},0);
},false);
document.addEventListener('pointerover',function(event){
  var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
  if(point)setTimeout(function(){clampTrendTooltipV19(point);},0);
},false);

function usernameAccountPatchV19(html){
  var original=escapeHtml(state.originalUsernameV19||state.user?.username||'');
  return html.replace(/<div class="account-chip">([\s\S]*?)<\/div>/,function(match,inside){
    return `<div class="account-chip account-chip-v19">${inside}<button class="rename-username-v19" id="renameUsernameV19">修改</button></div><div class="username-origin-v19" id="usernameOriginV19">初始账号：<code>${original}</code> · 修改用户名不会改变原账号身份。</div>`;
  });
}

var accountHtmlBeforeV19=accountHtml;
accountHtml=function accountHtmlV19(){return usernameAccountPatchV19(accountHtmlBeforeV19());};

function openUsernameModalV19(){
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>修改用户名</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="field"><label>新用户名</label><input id="usernameInputV19" maxlength="24" autocomplete="username" value="${escapeHtml(state.user?.username||'')}" placeholder="2～24 位中文、字母或数字"></div><div class="username-modal-note-v19">保存时会自动查重。初始账号会作为内部账号标识保留，不会因为改名而丢失成绩或反馈记录。</div><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary" id="saveUsernameV19">保存用户名</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var close=function(){modal.remove();if(state.modal===modal)state.modal=null;};
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;
  modal.onclick=function(e){if(e.target===modal)close();};
  var input=modal.querySelector('#usernameInputV19');input.focus();input.select();
  modal.querySelector('#saveUsernameV19').onclick=async function(){
    var button=this,next=String(input.value||'').trim();
    if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(next))return toast('用户名请使用 2～24 位中文、字母、数字、横线或下划线');
    button.disabled=true;button.textContent='检查并保存…';
    try{
      var data=await usernameApiV19('rename',{username:next});
      state.user=Object.assign({},state.user,{username:data.user.username});
      state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username;
      close();render();toast('用户名已修改');
    }catch(e){toast(e&&e.message?e.message:'用户名修改失败');}
    finally{if(button.isConnected){button.disabled=false;button.textContent='保存用户名';}}
  };
}

async function refreshUsernameIdentityV19(){
  if(state.page!=='account'||!state.token)return;
  try{
    var data=await usernameApiV19('get');
    state.originalUsernameV19=data.user.originalUsername||data.user.username;
    if(state.user&&data.user.username)state.user.username=data.user.username;
    var note=document.getElementById('usernameOriginV19');
    if(note)note.innerHTML='初始账号：<code>'+escapeHtml(state.originalUsernameV19)+'</code> · 修改用户名不会改变原账号身份。';
  }catch(e){console.warn('username identity unavailable',e);}
}

var bindPageBeforeV19=bindPage;
bindPage=function bindPageV19(){
  bindPageBeforeV19();
  enhanceTrendChartsV19();
  var rename=document.getElementById('renameUsernameV19');
  if(rename)rename.onclick=openUsernameModalV19;
  refreshUsernameIdentityV19();
};
