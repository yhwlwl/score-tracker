const UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin';
const METRICS_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin-metrics';

const MOBILE_PATCH = `<style id="mg-mobile-v11">
html.mg-phone body{overflow-x:hidden!important}html.mg-phone .app{display:block!important;min-height:100vh;width:100%!important;max-width:100vw!important}html.mg-phone .side{position:sticky!important;top:0!important;height:auto!important;min-height:0!important;width:100%!important;padding:max(8px,env(safe-area-inset-top)) 8px 8px!important;border-right:0!important;border-bottom:1px solid var(--l)!important;z-index:40!important;box-shadow:0 7px 24px #0005}html.mg-phone .brand{display:none!important}html.mg-phone .nav{display:flex!important;gap:6px!important;overflow-x:auto!important;white-space:nowrap!important;scrollbar-width:none!important}html.mg-phone .nav::-webkit-scrollbar{display:none!important}html.mg-phone .nav button{flex:0 0 auto!important;min-height:42px!important;padding:8px 12px!important;text-align:center!important}html.mg-phone .main{width:100%!important;max-width:100vw!important;min-width:0!important;overflow:hidden!important;padding:12px 10px calc(24px + env(safe-area-inset-bottom))!important}html.mg-phone .top{position:static!important;width:100%!important;margin:0 0 10px!important;padding:4px 0 8px!important;gap:8px!important}html.mg-phone .top>div{min-width:0!important}html.mg-phone .top h1{font-size:19px!important}html.mg-phone .top .btn{flex:0 0 auto!important;min-height:40px!important;padding:8px 11px!important}html.mg-phone .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}html.mg-phone .g2{grid-template-columns:1fr!important}html.mg-phone .tw{border:0!important;overflow:visible!important;width:100%!important}html.mg-phone .t{min-width:0!important;width:100%!important;border-collapse:separate!important;border-spacing:0!important}html.mg-phone .t thead{display:none!important}html.mg-phone .t tbody,html.mg-phone .t tr,html.mg-phone .t td{display:block!important;width:100%!important}html.mg-phone .t tr{margin-bottom:10px!important;padding:8px 10px!important;background:var(--p)!important;border:1px solid var(--l)!important;border-radius:12px!important}html.mg-phone .t td{display:grid!important;grid-template-columns:84px minmax(0,1fr)!important;gap:8px!important;align-items:start!important;border:0!important;padding:5px 2px!important;white-space:normal!important;word-break:break-word!important}html.mg-phone .t td:before{content:attr(data-label)!important;color:var(--m)!important;font-size:10px!important;font-weight:600!important}html.mg-phone .t td:empty{display:none!important}html.mg-phone .wrap,html.mg-phone .feedback-content{max-width:none!important}html.mg-phone .feedback-action{flex-wrap:wrap!important}html.mg-phone .feedback-action .btn{width:100%!important;min-height:42px!important}html.mg-phone .overlay{place-items:stretch!important}html.mg-phone .drawer{width:100vw!important;max-width:none!important;border-left:0!important;padding:0 12px calc(18px + env(safe-area-inset-bottom))!important}html.mg-phone .status-toolbar{grid-template-columns:1fr!important}html.mg-phone .status-toolbar .btn{min-height:44px!important}@media(max-width:430px){html.mg-phone .grid{grid-template-columns:1fr!important}}
</style>`;

const OPTIMISTIC_PATCH = `<script id="mg-optimistic-v11">
(function(){
  var isPhone=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||window.innerWidth<760;
  if(isPhone)document.documentElement.classList.add('mg-phone');
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  var currentFeedback=null, originalFbDetail=window.fbDetail;
  if(typeof originalFbDetail==='function')window.fbDetail=async function(id){currentFeedback=id;return originalFbDetail(id)};
  function statusBadge(id){var btn=document.querySelector('[data-fb="'+id+'"]');return btn&&btn.closest('tr')?btn.closest('tr').querySelector('.pill[class*="status-"]'):null}
  function setBadge(badge,status){if(!badge)return;Array.from(badge.classList).filter(function(x){return x.indexOf('status-')===0}).forEach(function(x){badge.classList.remove(x)});badge.classList.add('status-'+status);badge.textContent=({new:'已收到',reviewing:'处理中',planned:'已计划',resolved:'已解决',closed:'已关闭'})[status]||status}
  document.addEventListener('click',function(ev){
    var target=ev.target;
    if(target&&target.id==='saveStatus'){
      ev.preventDefault();ev.stopImmediatePropagation();
      var id=currentFeedback,select=document.querySelector('#status');if(!id||!select)return;
      var next=select.value,badge=statusBadge(id),oldClass=badge?Array.from(badge.classList).find(function(x){return x.indexOf('status-')===0}):null,oldStatus=oldClass?oldClass.slice(7):null,button=target;
      setBadge(badge,next);button.disabled=true;button.textContent='已更新';
      Promise.resolve(window.api('feedback_status',{id:id,status:next},'POST')).then(function(){button.textContent='已保存';setTimeout(function(){if(button.isConnected){button.disabled=false;button.textContent='更新状态'}},500)}).catch(function(err){if(oldStatus){select.value=oldStatus;setBadge(badge,oldStatus)}button.disabled=false;button.textContent='更新状态';alert(err.message||'更新失败')});
      return;
    }
    if(target&&target.id==='send'){
      ev.preventDefault();ev.stopImmediatePropagation();
      var id2=currentFeedback,box=document.querySelector('#reply'),content=box?box.value.trim():'';if(!id2||!content)return;
      var button2=target,replyBox=button2.closest('.reply-box'),thread=replyBox&&replyBox.previousElementSibling,temp=document.createElement('div');
      temp.className='msg admin';temp.dataset.optimistic='1';temp.innerHTML='<div class="msg-head"><b>管理员</b><span>刚刚</span></div>'+esc(content);
      if(thread)thread.appendChild(temp);box.value='';button2.disabled=true;button2.textContent='已发送';
      Promise.resolve(window.api('feedback_reply',{id:id2,content:content},'POST')).then(function(){setTimeout(function(){if(typeof window.fbDetail==='function')window.fbDetail(id2)},0)}).catch(function(err){temp.remove();box.value=content;button2.disabled=false;button2.textContent='发送管理员回复';alert(err.message||'发送失败')});
    }
  },true);
})();
</script>`;

function adminHeaders(req, isHtml) {
  const headers = { Accept: isHtml ? 'text/html' : 'application/json' };
  if (req.headers['x-score-token']) headers['x-score-token'] = String(req.headers['x-score-token']);
  if (req.method === 'POST') headers['content-type'] = 'application/json';
  return headers;
}

function mergeExactMetrics(data, metrics) {
  if (!data || !metrics) return data;
  data.counts = Object.assign({}, data.counts || {}, {
    logs: Number(metrics.visitors_total || 0),
    visitors: Number(metrics.visitors_24h || 0),
    sessions: Number(metrics.sessions_24h || 0),
    users: Number(metrics.users_total || 0),
    online: Number(metrics.online_5m || 0),
    exams: Number(metrics.exams_total || 0),
    scores: Number(metrics.scores_total || 0),
    feedback: Number(metrics.feedback_total || 0),
  });
  if (data.inventory) {
    if (data.inventory.score_tracker_users) data.inventory.score_tracker_users.rows = Number(metrics.users_total || 0);
    if (data.inventory.score_tracker_exams) data.inventory.score_tracker_exams.rows = Number(metrics.exams_total || 0);
    if (data.inventory.score_tracker_scores) data.inventory.score_tracker_scores.rows = Number(metrics.scores_total || 0);
    if (data.inventory.score_tracker_visit_logs) data.inventory.score_tracker_visit_logs.rows = Number(metrics.events_total || 0);
    if (data.inventory.score_tracker_feedback_submissions) data.inventory.score_tracker_feedback_submissions.rows = Number(metrics.feedback_total || 0);
  }
  data.exact_metrics = metrics;
  return data;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const isHtml = !query.includes('action=');
  const headers = adminHeaders(req, isHtml);
  const action = isHtml ? '' : new URL(`https://local.invalid${req.url}`).searchParams.get('action') || '';
  try {
    const upstreamPromise = fetch(UPSTREAM + query, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const metricsPromise = action === 'overview' && req.method === 'GET'
      ? fetch(METRICS_UPSTREAM, { method: 'GET', headers: { 'x-score-token': String(req.headers['x-score-token'] || '') }, signal: AbortSignal.timeout(8000) }).catch(() => null)
      : Promise.resolve(null);
    const [upstream, metricsResponse] = await Promise.all([upstreamPromise, metricsPromise]);
    res.status(upstream.status);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (isHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      let html = await upstream.text();
      html = html
        .replace('累计访问事件', '累计访客')
        .replace('近期 Visitor', '近24h Visitor')
        .replace('近期 Session', '近24h Session')
        .replaceAll('最近事件窗口', '过去 24 小时精确去重')
        .replace('</head>', MOBILE_PATCH + '</head>')
        .replace('</body>', OPTIMISTIC_PATCH + '</body>');
      res.send(html);
    } else if (action === 'overview' && upstream.ok) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const data = await upstream.json();
      let metrics = null;
      if (metricsResponse && metricsResponse.ok) metrics = await metricsResponse.json().catch(() => null);
      res.send(JSON.stringify(mergeExactMetrics(data, metrics)));
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch (error) {
    res.status(502).json({ error: error?.name === 'TimeoutError' ? 'mg_upstream_timeout' : 'mg_upstream_unavailable' });
  }
}
