/* ===== version-policy-v40.js ===== */
// 第三位（补丁）版本只作为内部构建号：
// 页脚只向用户展示 major.minor（例如 v9.0），补丁版本不进入更新提示与公告。
(function () {
  'use strict';
  var FOOTER_ID = 'app-version-v17';
  var MO = window.MutationObserver || window.WebKitMutationObserver;
  var footerObserver = MO ? new MO(function () { paint(); }) : null;
  var bodyObserver = MO ? new MO(function () { attach(); }) : null;

  function sourceVersion() {
    // 版本号以云端发布配置为准；拿不到时才退回 index.html 的 meta
    try {
      var current = window.__releaseNotices && window.__releaseNotices.currentVersion;
      if (typeof current === 'function') {
        var value = String(current() || '').trim();
        if (value) return value;
      }
    } catch (error) {}
    var meta = document.querySelector('meta[name="application-version"]');
    return String((meta && meta.getAttribute('content')) || '').trim();
  }

  function displayVersion() {
    // 直接使用云端发布的版本号，不做裁剪、不写死
    var raw = sourceVersion().replace(/^v/i, '');
    return raw ? 'v' + raw : '';
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
    var version = displayVersion();
    if (!version) return footer; // 拿不到版本就保持原样，不写成空
    var text = 'Score Tracker · ' + version;
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

  window.__versionPolicyV40 = { display: displayVersion };
})();
