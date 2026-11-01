/* Public artwork only. Private uploads and application requests never use this host. */
(function () {
  'use strict';
  var HOST = 'https://assets.tantantan.tech';
  var FILES = {"/assets/announcements/beta-appearance.svg":{"remote":"/v1/6d9533821e7edbee/beta-appearance.svg","sha256":"6d9533821e7edbee96131b0b1c3b01fffe7d015bde484ca3beb41aab9bc610aa","bytes":107752},"/assets/announcements/beta-paper-review.svg":{"remote":"/v1/142515b99068c618/beta-paper-review.svg","sha256":"142515b99068c618998f74e159bc6917494178949269a2d20d6fa6d52acbd9dd","bytes":94188},"/assets/announcements/beta-question-entry.svg":{"remote":"/v1/0b08e0a3b9ef2892/beta-question-entry.svg","sha256":"0b08e0a3b9ef2892ae842c021bd5d69a103075dc41bcec302264f09a493d1f2d","bytes":62144},"/assets/announcements/beta-question-analysis.svg":{"remote":"/v1/7919a14a4f85f14c/beta-question-analysis.svg","sha256":"7919a14a4f85f14ce552ecb43ad4bfca5a2fc6554e02ba94e7d423625224f6e6","bytes":114256},"/study-planner-promo.webp":{"remote":"/v1/c09ce61ea3a7d657/study-planner-promo.webp","sha256":"c09ce61ea3a7d65747f8842bf4ae3d6356896255aa972e6f460604cf255f182a","bytes":4792},"/community-qr-20261024.jpg":{"remote":"/v1/0c59b644f7faa666/community-qr-20261024.jpg","sha256":"0c59b644f7faa66655b9696d54d584c1de456dc118ae60c0df5974bbe5a1a8c6","bytes":268370},"/pwa-icon-192.png":{"remote":"/v1/1b9292f5b4e0b254/pwa-icon-192.png","sha256":"1b9292f5b4e0b2541f12d6783d6ba2bea2fa7694bbe39b517848e3a0f572c315","bytes":974},"/pwa-icon-512.png":{"remote":"/v1/612a7cedd99d598b/pwa-icon-512.png","sha256":"612a7cedd99d598b28349388677c6ca7e8015366ca4949bb8b6feba2efa4d83e","bytes":2974},"/assets/community/community-qr-662a653885569ef4.jpg":{"remote":"/v1/662a653885569ef4/community-qr-662a653885569ef4.jpg","sha256":"662a653885569ef4087170b58a6f98dc18885c5387f7ca18f1c79b09aa1f3f85","bytes":296379},"/assets/community/support-qr-8f3b6b302c8e6cf8.jpg":{"remote":"/v1/8f3b6b302c8e6cf8/support-qr-8f3b6b302c8e6cf8.jpg","sha256":"8f3b6b302c8e6cf87b0a7cf77334abe19821600f00e7885092b7edf25252cdd2","bytes":103619}};
  var timers = new WeakMap();
  function local(value) {
    try {
      var url = new URL(value, location.href);
      return url.origin === location.origin && !url.search && !url.hash && Object.prototype.hasOwnProperty.call(FILES, url.pathname) ? url.pathname : '';
    } catch (_) { return ''; }
  }
  function url(value) { var key = local(value); return key ? HOST + FILES[key].remote : value; }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function attributes(value) {
    var key = local(value);
    return key ? 'src="' + escape(url(key)) + '" data-st-asset-local="' + escape(key) + '" crossorigin="anonymous" referrerpolicy="no-referrer"' : 'src="' + escape(value) + '"';
  }
  function clear(image) { clearTimeout(timers.get(image)); timers.delete(image); }
  function fallback(image) {
    var key = image.getAttribute('data-st-asset-local');
    if (!FILES[key] || image.getAttribute('data-st-asset-retried') || image.getAttribute('src') !== url(key)) return false;
    clear(image);
    image.setAttribute('data-st-asset-retried', '1');
    image.removeAttribute('crossorigin');
    image.src = key;
    return true;
  }
  // Capture before a feature's error handler so it sees an error only if both sources fail.
  window.addEventListener('error', function (event) {
    var image = event.target;
    if (image && image.tagName === 'IMG' && fallback(image)) event.stopImmediatePropagation();
  }, true);
  window.addEventListener('load', function (event) { if (event.target && event.target.tagName === 'IMG') clear(event.target); }, true);
  function watch(root) {
    var images = root.querySelectorAll ? Array.from(root.querySelectorAll('img[data-st-asset-local]')) : [];
    if (root.matches && root.matches('img[data-st-asset-local]')) images.push(root);
    images.forEach(function (image) {
      if (timers.has(image) || image.hasAttribute('data-st-asset-retried') || image.complete && image.naturalWidth) return;
      // Lazy gallery shots should retain native lazy loading; use their error fallback.
      if (image.loading === 'lazy') return;
      timers.set(image, setTimeout(function () { clear(image); if (image.isConnected && !image.naturalWidth) fallback(image); }, 4000));
    });
  }
  new MutationObserver(function (records) { records.forEach(function (record) { record.addedNodes.forEach(watch); }); }).observe(document.documentElement, {childList:true, subtree:true});
  watch(document);
  function clickDownload(href, filename) {
    var link = document.createElement('a'); link.href = href; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
  }
  async function fetchImage(target, external) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 5000);
    try {
      var response = await fetch(target, {credentials:external ? 'omit' : 'same-origin', mode:external ? 'cors' : 'same-origin', referrerPolicy:'no-referrer', signal:controller.signal});
      if (!response.ok || !/^image\/(?:png|jpeg|webp)(?:;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('image unavailable');
      var blob = await response.blob();
      if (!blob.size || blob.size > 500000) throw new Error('invalid image size');
      return blob;
    } finally { clearTimeout(timer); }
  }
  async function save(value, filename) {
    var key = local(value);
    if (!key) { clickDownload(value, filename); return; }
    var blob;
    try { blob = await fetchImage(url(key), true); } catch (_) { blob = await fetchImage(key, false); }
    var objectUrl = URL.createObjectURL(blob);
    clickDownload(objectUrl, filename);
    setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
  }
  window.__scoreTrackerAssets = {url:url, attributes:attributes, save:save};
})();
