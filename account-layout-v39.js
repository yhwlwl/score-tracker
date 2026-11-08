/* ===== account-layout-v39.js ===== */
// 账号页布局整理：
// 1) 去掉页面顶部的“账号”标题块，页面直接从“我的账号”开始；
// 2) 把“修改密码”折叠进第一个卡片，“退出登录”也移进第一个卡片，删掉空的“数据与安全”卡片；
// 3) 修掉主题挂件（小鸭子等）给卡片标题撑出的 96px 空白。
(function () {
  'use strict';
  if (typeof accountHtml !== 'function' || typeof bindPage !== 'function') return;

  var STYLE_ID = 'account-layout-v39-style';
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      // 挂件不再用标题的 min-height 撑出空白；账号卡里把挂件缩小到 48px，标题只留横向避让
      '.account-card.st-decorated>:is(.card-title,h2,h3):first-child{min-height:0!important}',
      '.account-card.st-decorated:has(>.st-ornament)>:is(.card-title,h2,h3):first-child{padding-right:calc(48px + 14px)!important}',
      '.account-card>.st-ornament{width:48px!important;height:48px!important;top:10px!important;right:16px!important}',
      // 账号页
      '.account-main-v39{grid-column:1/-1}',
      '.account-secure-v39{margin-top:14px;border-top:1px solid var(--line,#e8ebf0);padding-top:2px}',
      '.account-secure-v39>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 0;font-size:14px;font-weight:700;color:var(--text,#18212f);cursor:pointer;list-style:none}',
      '.account-secure-v39>summary::-webkit-details-marker{display:none}',
      '.account-secure-v39>summary:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px;border-radius:8px}',
      '.account-secure-arrow-v39{font-size:18px;line-height:1;color:var(--muted,#788392);transition:transform .16s ease}',
      '.account-secure-v39[open]>.account-secure-arrow-v39,.account-secure-v39[open]>summary .account-secure-arrow-v39{transform:rotate(90deg)}',
      '.account-secure-v39 .password-grid-v15{grid-template-columns:1fr!important;margin-top:2px}',
      '.account-secure-v39 .password-grid-v15 button{width:100%}',
      '.account-secure-v39 .password-note-v15{margin-bottom:6px}',
      '.account-logout-v39{width:100%;margin-top:14px;border-top:1px solid var(--line,#e8ebf0);border-radius:0;padding:14px 0 0;justify-content:flex-start;background:transparent}',
      '.account-note-v39{margin:10px 0 0;font-size:11.5px;line-height:1.7;color:var(--muted,#788392)}'
    ].join('');
    document.head.appendChild(style);
  }

  // 1) 直接从 HTML 源头去掉顶部标题块，避免渲染后再删造成闪动
  var previousAccountHtml = accountHtml;
  accountHtml = function accountHtmlV39() {
    var html = previousAccountHtml.apply(this, arguments);
    return String(html).replace(/<div class="page-head"><div><h2>账号<\/h2>[\s\S]*?<\/p><\/div><\/div>/, '');
  };

  function restructure() {
    try {
      if (typeof state === 'undefined' || !state || state.page !== 'account') return;
      var content = document.getElementById('content');
      if (!content) return;
      var head = content.querySelector('.page-head');
      if (head) head.remove();
      var grid = content.querySelector('.account-grid');
      if (!grid) return;
      var first = grid.querySelector('.account-card');
      if (!first || first.classList.contains('account-main-v39')) return;
      first.classList.add('account-main-v39');

      var logout = document.getElementById('logoutBtn');
      var dataCard = logout ? logout.closest('.account-card') : null;
      var cloudNote = dataCard ? dataCard.querySelector('.card-sub') : null;
      var cloudText = cloudNote ? String(cloudNote.textContent || '').trim() : '';
      var pwd = content.querySelector('.password-card-v15');

      // 2) 修改密码：折叠进第一个卡片
      if (pwd && !first.querySelector('#changePasswordV15')) {
        var details = document.createElement('details');
        details.className = 'account-secure-v39';
        details.innerHTML = '<summary>修改密码<span class="account-secure-arrow-v39" aria-hidden="true">›</span></summary>';
        var pwGrid = pwd.querySelector('.password-grid-v15');
        var pwNote = pwd.querySelector('.password-note-v15');
        if (pwGrid) details.appendChild(pwGrid);
        if (pwNote) details.appendChild(pwNote);
        first.appendChild(details);
        if (pwd.parentNode) pwd.parentNode.removeChild(pwd);
      }

      // 3) 退出登录：移到第一个卡片底部
      if (logout && logout.parentElement !== first) {
        logout.classList.add('account-logout-v39');
        first.appendChild(logout);
      }

      if (cloudText && !first.querySelector('.account-note-v39')) {
        var note = document.createElement('p');
        note.className = 'account-note-v39';
        note.textContent = cloudText;
        if (logout && logout.parentElement === first) first.insertBefore(note, logout);
        else first.appendChild(note);
      }

      // 4) “数据与安全”卡片此时只剩标题，直接删掉
      if (dataCard && dataCard !== first && !dataCard.querySelector('button,input,a,code')) {
        if (dataCard.parentNode) dataCard.parentNode.removeChild(dataCard);
      }
    } catch (error) {
      try { console.warn('account layout v39', error); } catch (_) {}
    }
  }

  var previousBindPage = bindPage;
  bindPage = function bindPageV39() {
    previousBindPage.apply(this, arguments);
    restructure();
  };

  // 已经停在账号页时（例如热更新后）补一次
  if (typeof state !== 'undefined' && state && state.page === 'account') restructure();
})();
