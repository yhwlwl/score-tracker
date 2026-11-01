/* Account navigation reminder for unread replies to the user's own comments. */
(function(){
  'use strict';
  var identity='',generation=0,pending=null,lastPoll=0,count=0,rows=[],expanded=false;
  function user(){try{return state.user&&state.token?{id:String(state.user.id),token:state.token}:null;}catch(_){return null;}}
  function same(u){var current=user();return current&&u&&current.id===u.id&&current.token===u.token;}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var style=document.createElement('style');style.id='announcement-replies-style';style.textContent=
    '.bottom-nav [data-page="account"],.desktop-nav [data-page="account"]{position:relative}'+
    '.announcement-reply-dot{position:absolute;top:8px;left:calc(50% + 9px);width:7px;height:7px;border-radius:50%;background:#e34f61;box-shadow:0 0 0 2px var(--panel-solid,#fff);pointer-events:none}'+
    '.desktop-nav .announcement-reply-dot{left:auto;right:5px;top:6px}'+
    '.announcement-replies-guide{margin:18px 0;border-color:var(--accent,#5473de)}'+
    '.announcement-replies-guide .card-sub{line-height:1.7}.announcement-reply-list{display:grid;gap:9px;margin-top:15px}'+
    '.announcement-reply-entry{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;text-align:left;padding:13px 14px;border:1px solid var(--line,#e4e9f0);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;cursor:pointer}'+
    '.announcement-reply-entry span{min-width:0;overflow-wrap:anywhere}.announcement-reply-entry small{display:block;margin-bottom:5px;font-size:11px;color:var(--muted,#68758b)}'+
    '.announcement-reply-entry b{flex-shrink:0;color:var(--accent,#315efb);font-size:12px}.announcement-reply-entry:disabled{opacity:.6;cursor:wait}'+
    '.announcement-reply-entry:focus-visible{outline:2px solid var(--accent,#315efb);outline-offset:3px}.announcement-replies-status{font-size:12px;color:var(--muted,#68758b);margin:10px 0 0}.announcement-replies-status:empty{display:none}';
  document.head.appendChild(style);

  function paint(){
    document.querySelectorAll('.bottom-nav [data-page="account"],.desktop-nav [data-page="account"]').forEach(function(button){
      var dot=button.querySelector('.announcement-reply-dot');
      if(count>0){
        if(!dot){dot=document.createElement('span');dot.className='announcement-reply-dot';dot.setAttribute('aria-hidden','true');button.appendChild(dot);button.dataset.replyOriginalLabel=button.getAttribute('aria-label')||'';}
        button.setAttribute('aria-label','账号，有 '+count+' 条公告回复未读');
      }else if(dot){dot.remove();var original=button.dataset.replyOriginalLabel;if(original)button.setAttribute('aria-label',original);else button.removeAttribute('aria-label');delete button.dataset.replyOriginalLabel;}
    });
    var anchor=document.getElementById('announcementSettingsCard'),guide=document.getElementById('announcementReplyGuide');
    if(!anchor||!count){if(guide)guide.remove();return;}
    if(!guide){guide=document.createElement('section');guide.id='announcementReplyGuide';guide.className='card account-card announcement-replies-guide';var content=document.getElementById('content'),heading=content&&content.querySelector('.page-head');if(content&&content.contains(anchor)){if(heading&&heading.parentElement===content)heading.after(guide);else content.prepend(guide);}else anchor.before(guide);}
    // Do not replace the focused button during an unrelated background repaint.
    var signature=JSON.stringify([count,expanded,rows]);if(guide.dataset.signature===signature)return;
    guide.dataset.signature=signature;
    guide.innerHTML='<h3 class="card-title">公告有新回复</h3><p class="card-sub">你收到了作者的 '+count+' 条回复，点开可直接查看对应公告里的评论与回复。</p><div class="announcement-reply-list">'+rows.slice(0,expanded?20:3).map(function(row){return '<button type="button" class="announcement-reply-entry" data-announcement-reply="'+esc(row.id)+'"><span><small>关于你的评论</small>'+esc(row.comment_preview)+'</span><b>查看回复 →</b></button>';}).join('')+'</div>'+(rows.length>3?'<button class="secondary" type="button" id="expandAnnouncementReplies" style="margin-top:12px">'+(expanded?'收起':'查看更多回复')+'</button>':'')+'<p class="announcement-replies-status" role="status"></p>';
    guide.querySelectorAll('[data-announcement-reply]').forEach(function(button){button.onclick=async function(){
      var status=guide.querySelector('[role="status"]');button.disabled=true;status.textContent='正在打开回复…';
      try{if(!window.__releaseNotices?.openAnnouncementReply)throw Error('请刷新页面后再查看回复');await window.__releaseNotices.openAnnouncementReply(button.dataset.announcementReply);if(status.isConnected)status.textContent='';}
      catch(e){if(status.isConnected)status.textContent=e.message||'暂时无法读取回复，请稍后重试';}
      finally{if(button.isConnected)button.disabled=false;}
    };});
    var more=guide.querySelector('#expandAnnouncementReplies');if(more)more.onclick=function(){expanded=!expanded;paint();};
  }
  function sync(){
    var u=user(),key=u?u.id+':'+u.token:'';
    if(identity!==key){identity=key;++generation;pending=null;lastPoll=0;count=0;rows=[];expanded=false;}
    paint();if(u&&document.visibilityState==='visible'&&navigator.onLine!==false&&Date.now()-lastPoll>=60000)refresh();
  }
  async function refresh(){
    var u=user();if(!u||document.visibilityState!=='visible'||navigator.onLine===false)return;
    if(pending)return pending;
    var currentGeneration=generation,controller=new AbortController(),timer=setTimeout(function(){controller.abort();},10000);
    lastPoll=Date.now();
    var job=Promise.resolve().then(async function(){
      try{
        var response=await fetch('/api/score-tracker-notices',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({action:'announcement_reply_inbox',token:u.token})});
        if(!response.ok)return;var data=await response.json();
        if(!same(u)||generation!==currentGeneration)return;
        count=Math.max(0,Number(data.count)||0);rows=Array.isArray(data.rows)?data.rows:[];paint();
      }catch(_){/* Preserve existing reminders during a temporary network failure. */}
      finally{clearTimeout(timer);if(pending===job)pending=null;}
    });pending=job;return job;
  }
  function afterRead(){++generation;pending=null;lastPoll=0;sync();}
  ['render','renderLogin','bindPage'].forEach(function(name){var previous=window[name];if(typeof previous==='function')window[name]=function(){var result=previous.apply(this,arguments);sync();return result;};});
  window.addEventListener('announcement-replies-changed',afterRead);
  document.addEventListener('visibilitychange',sync);window.addEventListener('online',sync);
  window.addEventListener('storage',function(event){var u=user();if(u&&event.key==='st_announcement_reply_read:'+u.id)afterRead();else if(event.key==='st_token')sync();});
  setInterval(sync,60000);
  window.__announcementReplies={refresh:function(){lastPoll=0;sync();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
