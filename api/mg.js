const UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin';
const METRICS_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin-metrics';
const CLIENT_PATCH_V13 = `<script id="mg-client-v13">
(function(){
  if(window.__mgV13)return;window.__mgV13=1;
  var DEPTH13={},DEPTH13_READY=false; /* READY=true 且映射非空才覆盖显示,避免把旧值顶成「-」 */
  function loadDepth13(){
    var call=(typeof api==='function')?api('users'):Promise.resolve({rows:[]});
    return call.then(function(u){
      DEPTH13={};
      (u.rows||[]).forEach(function(r){
        ['username','original_username','name','display_name','nickname','user_name'].forEach(function(k){
          if(r&&r[k])DEPTH13[String(r[k])]=r;
        });
      });
      DEPTH13_READY=true;
    }).catch(function(e){console.warn('[mg-v13] users 数据加载失败,深度分保持原值:',e&&e.message||e);});
  }
  function depthOf13(name){var r=DEPTH13[name];if(!r)return '';return String(r.depth_score!=null?r.depth_score:'');}
  function setDepthTd(td,uname){
    if(!td||!DEPTH13_READY)return;                 /* 源数据未就绪:不覆盖(保留上游原值)   */
    var v=uname?depthOf13(uname):'';
    td.title='深度分 = 创建考试数×3 + 活跃天数×2';
    if(v)td.textContent=v;
    else if(td.textContent===''||td.textContent==='—')td.textContent='-';
  }
  function enhanceFeedback13(){
    var zone=document.querySelector('#v-feedback');if(!zone)return;
    var thead=zone.querySelector('.t thead');
    if(thead&&!thead.querySelector('th.fb-depth-v13')){
      var userTh=null;
      thead.querySelectorAll('th').forEach(function(th){if(!userTh&&(th.textContent||'').indexOf('用户')>-1)userTh=th;});
      if(userTh){var dth=document.createElement('th');dth.className='fb-depth-v13';dth.textContent='深度分';userTh.insertAdjacentElement('afterend',dth);}
    }
    zone.querySelectorAll('.t tbody tr').forEach(function(tr){
      var tds=tr.querySelectorAll('td');if(!tds.length)return;
      var userTd=null;
      tds.forEach(function(td){var lb=td.getAttribute('data-label')||'';if(!userTd&&lb.indexOf('用户')>-1)userTd=td;});
      if(!userTd)userTd=tds[3]||tds[0];
      var uname=(userTd.textContent||'').trim();
      /* 游客行保持可见(只留空深度分)——此前隐藏游客导致"63/63 条却显示不完" */
      var cell=tr.querySelector('.fb-depth-v13');
      if(cell){setDepthTd(cell,uname);return;}
      if(!DEPTH13_READY)return; /* 数据没就绪不补列,避免满屏「-」 */
      var ntd=document.createElement('td');ntd.className='fb-depth-v13';ntd.setAttribute('data-label','深度分');ntd.title='深度分 = 创建考试数×3 + 活跃天数×2';
      ntd.textContent=uname?(depthOf13(uname)||'-'):'-';
      userTd.insertAdjacentElement('afterend',ntd);
    });
  }
  if(typeof rf==='function'&&!(rfBase13)){var rfBase13=rf;rf=function(){
    var args=arguments;
    return loadDepth13().then(function(){return rfBase13.apply(this,args);}).then(function(p){try{enhanceFeedback13();}catch(e){}return p;});
  };}
  var fbObs=null;
  function watchFeedback13(){
    var zone=document.querySelector('#v-feedback');if(!zone)return;
    if(fbObs)fbObs.disconnect();
    fbObs=new MutationObserver(function(){clearTimeout(window.__fbT13);window.__fbT13=setTimeout(function(){try{enhanceFeedback13();}catch(e){}},60);});
    fbObs.observe(zone,{childList:true,subtree:true});
    try{enhanceFeedback13();}catch(e){}
  }
  var USER13={q:'',sort:'default'};
  function colIndex13(thead,re){var i=-1;thead.querySelectorAll('th').forEach(function(th,j){if(i<0&&re.test(th.textContent||''))i=j;});return i;}
  function num13(tr,i){var c=tr.children[i];var m=(c?c.textContent:'').match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):0;}
  function ts13(tr,i){var c=tr.children[i];var t=c?c.textContent.trim():'';var p=Date.parse(t.replace(/年|月/g,'-').replace(/日/g,' '));return isNaN(p)?0:p;}
  function depthVal13(n){var r=DEPTH13[String(n||'').trim()];return (r&&r.depth_score!=null)?Number(r.depth_score)||0:0;}
  /* 用户表「深度分」列:无列则补列;已有列则覆盖数值为同源口径(列表=反馈=同一来源,排序才一致) */
  function enhanceUsersColumns(){
    var z=document.querySelector('#v-users');if(!z)return;
    var thead=z.querySelector('.t thead'),tb=z.querySelector('.t tbody');if(!thead||!tb)return;
    var hasDepth=colIndex13(thead,/深度/)>-1;
    if(hasDepth){
      var depI=colIndex13(thead,/深度/),nI=colIndex13(thead,/用户|昵称/);
      [].slice.call(tb.querySelectorAll('tr')).forEach(function(tr){
        var td=tr.children[depI];if(!td)return;
        var uname=null;
        if(nI>-1)uname=(tr.children[nI]?tr.children[nI].textContent:'').trim();
        if(!uname)tr.querySelectorAll('td').forEach(function(c){var lb=String(c.getAttribute('data-label')||'');if(!uname&&/用户|昵称/.test(lb))uname=(c.textContent||'').trim();});
        setDepthTd(td,uname);
      });
      return;
    }
    var userTh=null;
    thead.querySelectorAll('th').forEach(function(th){if(!userTh&&/用户|昵称/.test(th.textContent||''))userTh=th;});
    if(userTh){var dth=document.createElement('th');dth.className='fb-depth-v13';dth.textContent='深度分';userTh.insertAdjacentElement('afterend',dth);}
    z.querySelectorAll('.t tbody tr').forEach(function(tr){
      var tds=tr.querySelectorAll('td');if(!tds.length)return;
      var userTd=null;
      tds.forEach(function(td){var lb=String(td.getAttribute('data-label')||'');if(!userTd&&/用户|昵称/.test(lb))userTd=td;});
      if(!userTd)tds.forEach(function(td){var nm=String(td.textContent||'').trim();if(!userTd&&DEPTH13[nm])userTd=td;});
      if(!userTd)userTd=tds[1]||tds[0];
      if(tr.querySelector('.fb-depth-v13'))return;
      var uname=(userTd.textContent||'').trim();
      var ntd=document.createElement('td');ntd.className='fb-depth-v13';ntd.setAttribute('data-label','深度分');ntd.title='深度分 = 创建考试数×3 + 活跃天数×2';
      ntd.textContent=uname?(depthOf13(uname)||'-'):'-';
      userTd.insertAdjacentElement('afterend',ntd);
    });
  }
  function applyUsers13(){
    var z=document.querySelector('#v-users');if(!z)return;
    var tb=z.querySelector('.t tbody'),thead=z.querySelector('.t thead');if(!tb||!thead)return;
    var nameI=colIndex13(thead,/用户|昵称/),depI=colIndex13(thead,/深度/),seenI=colIndex13(thead,/上线|last/i);
    var trs=[].slice.call(tb.querySelectorAll('tr'));
    if(USER13.sort==='depth'){
      if(depI>-1)trs.sort(function(a,b){return num13(b,depI)-num13(a,depI);});
      else{ /* 兜底:无深度列时按用户名从映射取深度分 */
        var nI=nameI>-1?nameI:0;
        trs.sort(function(a,b){return depthVal13(b.children[nI]?b.children[nI].textContent:'')-depthVal13(a.children[nI]?a.children[nI].textContent:'');});
      }
    }
    else if(USER13.sort==='seen'&&seenI>-1)trs.sort(function(a,b){return ts13(b,seenI)-ts13(a,seenI);});
    trs.forEach(function(tr){tb.appendChild(tr);});
    trs.forEach(function(tr){
      var show=true;
      if(USER13.q){var nc=tr.children[nameI>-1?nameI:0];show=((nc?nc.textContent:'')+tr.textContent).toLowerCase().indexOf(USER13.q.toLowerCase())>-1;}
      tr.style.display=show?'':'none';
    });
  }
  function enhanceUsers13(){
    var z=document.querySelector('#v-users');if(!z)return;
    try{enhanceUsersColumns();}catch(e){}
    if(z.querySelector('.u-toolbar-v13'))return;
    var bar=document.createElement('div');bar.className='mg-filter-v12 u-toolbar-v13';
    bar.innerHTML='<input class="u-search-v13" placeholder="查找用户…" style="min-width:150px;padding:8px 9px">'
      +'<select class="u-sort-v13" style="padding:8px 9px"><option value="default">默认顺序</option><option value="depth">按深度分</option><option value="seen">最近上线</option></select>';
    var t=z.querySelector('.t');
    if(t)t.insertAdjacentElement('beforebegin',bar);else z.insertBefore(bar,z.firstChild);
    bar.querySelector('.u-search-v13').addEventListener('input',function(e){USER13.q=e.target.value.trim();applyUsers13();});
    bar.querySelector('.u-sort-v13').addEventListener('change',function(e){USER13.sort=e.target.value;applyUsers13();});
    USER13.q='';USER13.sort='default';
  }
  if(typeof ru==='function'&&!window.__ruBase13){window.__ruBase13=ru;ru=function(){
    var args=arguments;
    return window.__ruBase13.apply(this,args).then(function(p){try{enhanceUsers13();applyUsers13();}catch(e){}return p;});
  };}
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav button'))setTimeout(watchFeedback13,400);
  },true);
  setTimeout(function(){try{watchFeedback13();}catch(e){}},1200);
})();
</script>`;

const REPLY_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin-reply';

const MOBILE_PATCH = `<style id="mg-mobile-v12">
html.mg-phone body{overflow-x:hidden!important}html.mg-phone .app{display:block!important;min-height:100vh;width:100%!important;max-width:100vw!important}html.mg-phone .nav{position:sticky!important;top:0!important;display:flex!important;gap:6px!important;overflow-x:auto!important;white-space:nowrap!important;padding:max(8px,env(safe-area-inset-top)) 8px 8px!important;z-index:40!important}html.mg-phone .nav button{flex:0 0 auto!important;min-height:42px!important;padding:8px 12px!important}html.mg-phone .main{width:100%!important;max-width:100vw!important;min-width:0!important;overflow:hidden!important;padding:12px 10px calc(24px + env(safe-area-inset-bottom))!important}html.mg-phone .top{position:static!important;width:100%!important;margin:0 0 10px!important;padding:4px 0 8px!important;gap:8px!important}html.mg-phone .top h1{font-size:19px!important}html.mg-phone .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}html.mg-phone .g2{grid-template-columns:1fr!important}html.mg-phone .tw{border:0!important;overflow:visible!important;width:100%!important}html.mg-phone .t{min-width:0!important;width:100%!important;border-collapse:separate!important;border-spacing:0!important}html.mg-phone .t thead{display:none!important}html.mg-phone .t tbody,html.mg-phone .t tr,html.mg-phone .t td{display:block!important;width:100%!important}html.mg-phone .t tr{margin-bottom:10px!important;padding:8px 10px!important;background:var(--p)!important;border:1px solid var(--l)!important;border-radius:12px!important}html.mg-phone .t td{display:grid!important;grid-template-columns:84px minmax(0,1fr)!important;gap:8px!important;align-items:start!important;border:0!important;padding:5px 2px!important;white-space:normal!important;word-break:break-word!important}html.mg-phone .t td:before{content:attr(data-label)!important;color:var(--m)!important;font-size:10px!important;font-weight:600!important}html.mg-phone .t td:empty{display:none!important}html.mg-phone .wrap,html.mg-phone .feedback-content{max-width:none!important}html.mg-phone .feedback-action{flex-wrap:wrap!important}html.mg-phone .feedback-action .btn{width:100%!important;min-height:42px!important}html.mg-phone .overlay{place-items:stretch!important}html.mg-phone .drawer{width:100vw!important;max-width:none!important;border-left:0!important;padding:0 12px calc(18px + env(safe-area-inset-bottom))!important}html.mg-phone .status-toolbar{grid-template-columns:1fr!important}@media(max-width:430px){html.mg-phone .grid{grid-template-columns:1fr!important}}
.mg-filter-v12{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 10px}.mg-filter-v12 select{width:auto;min-width:120px;padding:8px 9px}.mg-filter-count-v12{font-size:10px;color:var(--m)}.mg-reply-files-v12{margin-top:8px;padding:9px;border:1px dashed #35506f;border-radius:10px}.mg-reply-files-v12 input{padding:7px;font-size:11px}.mg-reply-preview-v12{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.mg-reply-preview-v12 img{width:64px;height:50px;object-fit:cover;border-radius:7px;border:1px solid var(--l)}.msg.pending-v12{opacity:.72}.msg.failed-v12{border:1px solid var(--danger)}
</style>`;

const CLIENT_PATCH = `<script id="mg-client-v12">
(function(){
  var isPhone=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||window.innerWidth<760;if(isPhone)document.documentElement.classList.add('mg-phone');
  var fbFilters={type:'all',status:'all',reply:'all'},fbRows=[],drawerEpoch=0,currentFeedback='';
  function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  ro=function(){var d=O,z=document.querySelector('#v-overview');if(!z)return;z.innerHTML='<div class="grid">'+m('累计访问',d.counts.logs,'visit 表总行数')+m('近24h Visitor',d.counts.visitors,'过去 24 小时去重')+m('近24h Session',d.counts.sessions,'过去 24 小时去重')+m('注册用户',d.counts.users,'非管理员')+m('近 5 分钟在线',d.counts.online,'行为 / 心跳')+m('考试记录',d.counts.exams,'数据库精确计数')+m('成绩行',d.counts.scores,'数据库精确计数')+m('反馈',d.counts.feedback,'数据库精确计数')+'</div><div class="section g2"><div class="card"><div class="title"><h2>近7天用户深度</h2></div>'+bars(d.depth)+'</div><div class="card"><div class="title"><h2>近7天核心行为</h2></div>'+bars(d.events)+'</div></div><div class="section note">口径：近期用户深度 / 核心行为 = 过去 7 天；Visitor / Session = 过去 24 小时；在线 = 过去 5 分钟；“分析”页 = 全部历史数据。</div>'};
  ra=function(){var d=O,z=document.querySelector('#v-analytics');if(!z)return;z.innerHTML='<div class="note" style="margin-bottom:10px">以下统计均为 visit 表全部历史数据，不再截取“最近 2500 条”。</div><div class="g2"><div class="card"><div class="title"><h2>应用页面 · 全量</h2></div>'+bars(d.pages)+'</div><div class="card"><div class="title"><h2>来源 · 全量 Session</h2></div>'+bars(d.sources)+'</div><div class="card"><div class="title"><h2>城市 · 全量</h2></div>'+bars(d.cities)+'</div><div class="card"><div class="title"><h2>设备 · 全量</h2></div>'+bars(d.devices)+'</div><div class="card"><div class="title"><h2>版本 · 全量</h2></div>'+bars(d.versions)+'</div><div class="card"><div class="title"><h2>反馈类型 · 全量</h2></div>'+bars(d.feedback_types)+'</div></div>'};
  function renderFeedbackV12(){var z=document.querySelector('#v-feedback');if(!z)return;var rows=fbRows.filter(function(x){return(fbFilters.type==='all'||x.feedback_type===fbFilters.type)&&(fbFilters.status==='all'||x.status===fbFilters.status)&&(fbFilters.reply==='all'||(fbFilters.reply==='needs'&&x.needs_reply)||(fbFilters.reply==='done'&&!x.needs_reply))});var types=[...new Set(fbRows.map(function(x){return x.feedback_type}).filter(Boolean))];z.innerHTML='<div class="mg-filter-v12"><select id="mgTypeV12"><option value="all">全部类型</option>'+types.map(function(x){return'<option value="'+esc2(x)+'" '+(fbFilters.type===x?'selected':'')+'>'+esc2(typeLabels[x]||x)+'</option>'}).join('')+'</select><select id="mgStatusV12"><option value="all">全部状态</option>'+['new','reviewing','planned','resolved','closed'].map(function(x){return'<option value="'+x+'" '+(fbFilters.status===x?'selected':'')+'>'+esc2(statusLabels[x]||x)+'</option>'}).join('')+'</select><select id="mgReplyV12"><option value="all">全部回复状态</option><option value="needs" '+(fbFilters.reply==='needs'?'selected':'')+'>待回复</option><option value="done" '+(fbFilters.reply==='done'?'selected':'')+'>已跟进</option></select><span class="mg-filter-count-v12">'+rows.length+' / '+fbRows.length+' 条</span></div>'+tbl(['时间','状态','类型','用户','内容','回复','附件','页面','版本','操作'],rows.map(function(x){return[dt(x.created_at),'<div class="feedback-action"><span class="pill status-'+esc2(x.status)+'">'+esc2(statusLabels[x.status]||x.status)+'</span>'+(x.needs_reply?'<span class="pill needs-reply">待回复</span>':'')+'</div>',esc2(typeLabels[x.feedback_type]||x.feedback_type),esc2(x.username||'游客'),'<div class="feedback-content">'+esc2(x.content)+'</div>',f(x.reply_count),f(x.attachment_count),esc2(x.page_path||'—'),esc2(x.app_version||'—'),'<button class="btn primary" data-fb="'+x.id+'">查看 / 回复</button>']}),true);['mgTypeV12','mgStatusV12','mgReplyV12'].forEach(function(id){var el=document.getElementById(id);if(el)el.onchange=function(){fbFilters[id==='mgTypeV12'?'type':id==='mgStatusV12'?'status':'reply']=this.value;renderFeedbackV12()}});document.querySelectorAll('[data-fb]').forEach(function(b){b.onclick=function(){fbDetail(b.dataset.fb)}})}
  rf=async function(){var d=await api('feedback');fbRows=d.rows||[];renderFeedbackV12()};
  function readFileV12(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(String(r.result||''))};r.onerror=reject;r.readAsDataURL(file)})}
  function loadImageV12(src){return new Promise(function(resolve,reject){var i=new Image();i.onload=function(){resolve(i)};i.onerror=reject;i.src=src})}
  async function imagePayloadV12(file){var src=await readFileV12(file),img=await loadImageV12(src),max=1400,scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height)),w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale)),c=document.createElement('canvas');c.width=w;c.height=h;var cx=c.getContext('2d');cx.drawImage(img,0,0,w,h);var q=.82,url=c.toDataURL('image/jpeg',q);function size(u){return Math.ceil((u.length-u.indexOf(',')-1)*.75)}while(size(url)>900000&&q>.45){q-=.1;url=c.toDataURL('image/jpeg',q)}return{name:String(file.name||'reply.jpg').replace(/\.[^.]+$/, '')+'.jpg',mime_type:'image/jpeg',data:url.slice(url.indexOf(',')+1),preview:url}}
  var fbDetailBase=fbDetail;
  fbDetail=async function(id){var requestEpoch=drawerEpoch;currentFeedback=String(id);await fbDetailBase(id);if(requestEpoch!==drawerEpoch||currentFeedback!==String(id))return;var w=document.querySelector('#drawer'),drawer=w&&w.querySelector('.drawer');if(!drawer)return;drawer.dataset.feedbackId=String(id);var close=drawer.querySelector('#close');if(close)close.onclick=function(){drawerEpoch++;currentFeedback='';w.innerHTML='';rf().catch(function(){})};var replyBox=drawer.querySelector('.reply-box'),send=drawer.querySelector('#send');if(!replyBox||!send)return;var filesWrap=document.createElement('div');filesWrap.className='mg-reply-files-v12';filesWrap.innerHTML='<input id="replyImagesV12" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple><div class="muted">可附 1～3 张图片；发送前会自动压缩。</div><div class="mg-reply-preview-v12" id="replyPreviewV12"></div>';replyBox.insertBefore(filesWrap,send);var input=filesWrap.querySelector('input'),chosen=[];input.onchange=async function(){chosen=[...this.files].slice(0,3);var preview=filesWrap.querySelector('#replyPreviewV12');preview.innerHTML='';for(var f0 of chosen){try{var s=await readFileV12(f0);preview.insertAdjacentHTML('beforeend','<img src="'+s+'" alt="预览">')}catch(e){}}};var statusBtn=drawer.querySelector('#saveStatus');if(statusBtn)statusBtn.onclick=async function(){var next=drawer.querySelector('#status').value,badge=document.querySelector('[data-fb="'+id+'"]')?.closest('tr')?.querySelector('.pill[class*="status-"]'),oldText=badge?badge.textContent:'';if(badge){badge.className='pill status-'+next;badge.textContent=statusLabels[next]||next}this.disabled=true;this.textContent='已更新';try{await api('feedback_status',{id:id,status:next},'POST');if(this.isConnected)this.textContent='已保存'}catch(err){if(badge)badge.textContent=oldText;alert(err.message||'更新失败')}finally{var b=this;setTimeout(function(){if(b.isConnected){b.disabled=false;b.textContent='更新状态'}},400)}};
    send.onclick=async function(){var box=drawer.querySelector('#reply'),content=String(box&&box.value||'').trim();if(!content&&!chosen.length)return;var myEpoch=drawerEpoch,myId=String(id),thread=drawer.querySelector('#thread'),temp=document.createElement('div');temp.className='msg admin pending-v12';temp.innerHTML='<div class="msg-head"><b>管理员</b><span>发送中…</span></div>'+esc2(content)+(chosen.length?'<div class="muted" style="margin-top:5px">图片 '+chosen.length+' 张 · 正在压缩上传</div>':'');if(thread)thread.appendChild(temp);if(box)box.value='';send.disabled=true;send.textContent='已发送';try{var images=[];for(var f1 of chosen)images.push(await imagePayloadV12(f1));if(drawerEpoch===myEpoch&&currentFeedback===myId&&temp.isConnected&&images.length){temp.querySelector('.muted')?.remove();var im=document.createElement('div');im.className='imgs';im.innerHTML=images.map(function(x){return'<img src="'+x.preview+'" alt="回复图片">'}).join('');temp.appendChild(im)}await api('feedback_reply',{id:id,content:content,images:images.map(function(x){return{name:x.name,mime_type:x.mime_type,data:x.data}})},'POST');if(drawerEpoch===myEpoch&&currentFeedback===myId&&temp.isConnected){temp.classList.remove('pending-v12');var sp=temp.querySelector('.msg-head span');if(sp)sp.textContent='刚刚';chosen=[];input.value='';filesWrap.querySelector('#replyPreviewV12').innerHTML='';send.disabled=false;send.textContent='发送管理员回复'}}catch(err){if(drawerEpoch===myEpoch&&currentFeedback===myId&&temp.isConnected){temp.classList.remove('pending-v12');temp.classList.add('failed-v12');var sp2=temp.querySelector('.msg-head span');if(sp2)sp2.textContent='发送失败';if(box)box.value=content;send.disabled=false;send.textContent='重新发送'}alert(err.message||'发送失败')}};
  };
  window.fbDetail=fbDetail;
})();
</script>`;

function adminHeaders(req, isHtml) {
  const headers = { Accept: isHtml ? 'text/html' : 'application/json' };
  if (req.headers['x-score-token']) headers['x-score-token'] = String(req.headers['x-score-token']);
  if (req.method === 'POST') headers['content-type'] = 'application/json';
  return headers;
}

function overviewFromMetrics(metrics) {
  const n = (v) => Number(v || 0);
  return {
    generated_at: new Date().toISOString(),
    counts: {
      logs: n(metrics.visit_rows_total || metrics.events_total),
      visitors: n(metrics.visitors_24h),
      sessions: n(metrics.sessions_24h),
      users: n(metrics.users_total),
      online: n(metrics.online_5m),
      exams: n(metrics.exams_total),
      scores: n(metrics.scores_total),
      feedback: n(metrics.feedback_total),
    },
    depth: metrics.depth_7d || [],
    events: metrics.events_7d || [],
    pages: metrics.pages_all || [],
    sources: metrics.sources_all || [],
    cities: metrics.cities_all || [],
    devices: metrics.devices_all || [],
    versions: metrics.versions_all || [],
    feedback_types: metrics.feedback_types_all || [],
    exact_metrics: metrics,
    inventory: {
      score_tracker_users: { rows: n(metrics.users_total) },
      score_tracker_exams: { rows: n(metrics.exams_total) },
      score_tracker_scores: { rows: n(metrics.scores_total) },
      score_tracker_visit_logs: { rows: n(metrics.visit_rows_total || metrics.events_total) },
      score_tracker_feedback_submissions: { rows: n(metrics.feedback_total) },
    },
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const isHtml = !query.includes('action=');
  const action = isHtml ? '' : new URL(`https://local.invalid${req.url}`).searchParams.get('action') || '';
  const headers = adminHeaders(req, isHtml);
  try {
    if (action === 'overview' && req.method === 'GET') {
      /* 7451 用户/几十万日志规模下 admin-metrics 的精确计数聚合较慢(-metrics 函数在 Supabase 侧执行),超时放宽避免 502 */
      const r = await fetch(METRICS_UPSTREAM, { method: 'GET', headers: { 'x-score-token': String(req.headers['x-score-token'] || '') }, signal: AbortSignal.timeout(25000) });
      const data = await r.json().catch(() => ({ error: 'metrics_unavailable' }));
      res.status(r.status).setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Cache-Control', 'private, no-store, max-age=0');
      return res.send(JSON.stringify(r.ok ? overviewFromMetrics(data) : data));
    }
    const target = action === 'feedback_reply' && req.method === 'POST' ? REPLY_UPSTREAM : UPSTREAM + query;
    const upstream = await fetch(target, { method: req.method, headers, body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined, signal: AbortSignal.timeout(30000) });
    res.status(upstream.status);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');res.setHeader('X-Content-Type-Options', 'nosniff');res.setHeader('Referrer-Policy', 'same-origin');
    if (isHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      let html = await upstream.text();html = html.replace('</head>', MOBILE_PATCH + '</head>').replace('</body>', CLIENT_PATCH + CLIENT_PATCH_V13 + '</body>');return res.send(html);
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    return res.status(502).json({ error: error?.name === 'TimeoutError' ? 'mg_upstream_timeout' : 'mg_upstream_unavailable' });
  }
}
