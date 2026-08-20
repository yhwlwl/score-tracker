const UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin';
const METRICS_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin-metrics';
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
      const r = await fetch(METRICS_UPSTREAM, { method: 'GET', headers: { 'x-score-token': String(req.headers['x-score-token'] || '') }, signal: AbortSignal.timeout(12000) });
      const data = await r.json().catch(() => ({ error: 'metrics_unavailable' }));
      res.status(r.status).setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Cache-Control', 'private, no-store, max-age=0');
      return res.send(JSON.stringify(r.ok ? overviewFromMetrics(data) : data));
    }
    const target = action === 'feedback_reply' && req.method === 'POST' ? REPLY_UPSTREAM : UPSTREAM + query;
    const upstream = await fetch(target, { method: req.method, headers, body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined, signal: AbortSignal.timeout(20000) });
    res.status(upstream.status);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');res.setHeader('X-Content-Type-Options', 'nosniff');res.setHeader('Referrer-Policy', 'same-origin');
    if (isHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      let html = await upstream.text();html = html.replace('</head>', MOBILE_PATCH + '</head>').replace('</body>', CLIENT_PATCH + '</body>');return res.send(html);
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    return res.status(502).json({ error: error?.name === 'TimeoutError' ? 'mg_upstream_timeout' : 'mg_upstream_unavailable' });
  }
}
