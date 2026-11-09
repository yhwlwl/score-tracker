/* ===== version-policy-v40.js ===== */
// 第三位（补丁）版本只作为内部构建号：
// 页脚只向用户展示 major.minor（例如 v9.0），补丁版本不进入更新提示与公告。
(function () {
  'use strict';
  var FOOTER_ID = 'app-version-v17';
  var MO = window.MutationObserver || window.WebKitMutationObserver;
  var footerObserver = MO ? new MO(function () { paint(); }) : null;
  var bodyObserver = MO ? new MO(function () { attach(); }) : null;

  function shortVersion() {
    var meta = document.querySelector('meta[name="application-version"]');
    var raw = String((meta && meta.getAttribute('content')) || '').trim().replace(/^v/i, '');
    var parts = raw.split('.').filter(function (part) { return part !== ''; });
    if (!parts.length) return 'v9.0';
    if (parts.length < 2) parts.push('0');
    return 'v' + parts[0] + '.' + parts[1];
  }

  function ensureFooter() {
    var footer = document.getElementById(FOOTER_ID);
    if (!footer) {
      footer = document.createElement('footer');
      footer.id = FOOTER_ID;
      document.body.appendChild(footer);
    }
    return footer;
  }

  function paint() {
    if (!document.body) return null;
    var footer = ensureFooter();
    var text = 'Score Tracker · ' + shortVersion();
    if (footer.textContent !== text) footer.textContent = text;
    return footer;
  }

  function attach() {
    var footer = paint();
    if (!footer || !footerObserver) return;
    try {
      footerObserver.disconnect();
      footerObserver.observe(footer, { childList: true, characterData: true, subtree: true });
    } catch (error) {}
  }

  function boot() {
    attach();
    if (bodyObserver) {
      try { bodyObserver.observe(document.body, { childList: true }); } catch (error) {}
    }
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });

  window.__versionPolicyV40 = { display: shortVersion };
})();
