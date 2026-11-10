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

  // 换成插画/照片背景后，页脚直接压在风景上看不清，这里给它一个半透明底
  function injectStyle() {
    if (document.getElementById('version-policy-v40-style')) return;
    var style = document.createElement('style');
    style.id = 'version-policy-v40-style';
    style.textContent = [
      'html[data-st-art="illustrated"] #app-version-v17{width:max-content;margin-left:auto;margin-right:auto;padding:7px 16px!important;margin-top:16px;margin-bottom:0;border-radius:999px;text-decoration:none;background:rgba(255,255,255,.86);background:color-mix(in srgb,var(--panel-solid,#fff) 88%,transparent);color:var(--text,#26303f);font-weight:600;box-shadow:0 2px 10px rgba(27,37,58,.08);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}',
      '@media(max-width:880px){html[data-st-art="illustrated"] #app-version-v17{margin-bottom:calc(88px + env(safe-area-inset-bottom))}}'
    ].join('');
    document.head.appendChild(style);
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
    injectStyle();
    attach();
    if (bodyObserver) {
      try { bodyObserver.observe(document.body, { childList: true }); } catch (error) {}
    }
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });

  window.__versionPolicyV40 = { display: displayVersion };
})();
