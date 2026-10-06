/* 账号设置里的公告入口：与底部版本号入口共用公告读取和历史记录。 */
(function(){
  'use strict';
  if(typeof accountHtml!=='function'||typeof bindPage!=='function')return;
  var previousAccountHtml=accountHtml;
  accountHtml=function accountHtmlWithAnnouncements(){
    return previousAccountHtml.apply(this,arguments)+'<section class="card account-card announcement-settings-card" id="announcementSettingsCard"><div><h3 class="card-title">公告</h3><p class="card-sub">重新查看当前公告，也可以切换到之前发布过的公告。</p></div><button class="secondary" type="button" id="openAnnouncementSettings">打开公告</button><p class="announcement-settings-status" id="announcementSettingsStatus" role="status"></p></section>';
  };
  var previousBindPage=bindPage;
  bindPage=function bindPageWithAnnouncements(){
    previousBindPage.apply(this,arguments);
    var button=document.getElementById('openAnnouncementSettings');
    if(!button)return;
    button.onclick=async function(){
      var status=document.getElementById('announcementSettingsStatus');
      if(!window.__releaseNotices||typeof window.__releaseNotices.openAnnouncement!=='function'){if(status)status.textContent='公告暂时无法读取，请刷新后重试';return;}
      button.disabled=true;button.textContent='正在读取…';if(status)status.textContent='';
      try{await window.__releaseNotices.openAnnouncement();}
      catch(e){if(status)status.textContent=e&&e.message||'公告暂时无法读取，请稍后重试';}
      finally{if(button.isConnected){button.disabled=false;button.textContent='打开公告';}}
    };
  };
})();
