/* ===== pdf-export-v40.js ===== */
// iOS（尤其“添加到主屏幕”的 Web App）里没有可用的 window.print，
// 原来用隐藏 iframe + print() 的「导出 PDF」点了没反应。
// 这里在 iOS / standalone 下接管导出面板的“导出”按钮：
// 把报告逐页渲染成图片，合成真正的 PDF，再交给系统分享面板保存到「文件」或直接打印。
(function () {
  'use strict';
  var exporter = window.__v30;
  if (!exporter || typeof exporter.buildPrintHtml !== 'function' || typeof exporter.collect !== 'function') return;

  var PAGE_W = 794; // A4 @96dpi
  var PAGE_H = 1123;
  var PAD = 42;
  var VENDOR = './vendor/';
  var libsPromise = null;
  var busy = false;

  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  }
  function isStandalone() {
    try {
      if (navigator.standalone === true) return true;
      return ['standalone', 'fullscreen', 'minimal-ui'].some(function (mode) {
        return window.matchMedia && window.matchMedia('(display-mode: ' + mode + ')').matches;
      });
    } catch (error) {
      return false;
    }
  }
  // 只有「添加到主屏幕」的 Web App 走 PDF 文件；普通网页保留原来的打印（更快）
  function needsPdf() { return isStandalone(); }

  function track(event, payload) {
    try {
      var fn = window.__stTrack || window.__scoreTrackerTrack;
      if (typeof fn === 'function') fn(event, payload || {});
    } catch (error) {}
  }

  /* ---------- 依赖按需加载（不进首屏） ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('组件加载失败，请检查网络后重试')); };
      document.head.appendChild(script);
    });
  }
  function ensureLibs() {
    if (libsPromise) return libsPromise;
    libsPromise = (function () {
      var chain = Promise.resolve();
      if (!window.html2canvas) chain = chain.then(function () { return loadScript(VENDOR + 'html2canvas.min.js'); });
      if (!(window.jspdf && window.jspdf.jsPDF)) chain = chain.then(function () { return loadScript(VENDOR + 'jspdf.umd.min.js'); });
      return chain.then(function () {
        if (!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)) throw new Error('PDF 组件没有加载成功');
        return { h2c: window.html2canvas, jsPDF: window.jspdf.jsPDF };
      }).catch(function (error) {
        libsPromise = null;
        throw error;
      });
    })();
    return libsPromise;
  }

  /* ---------- 样式 ---------- */
  function injectStyle() {
    if (document.getElementById('pdf-export-v40-style')) return;
    var style = document.createElement('style');
    style.id = 'pdf-export-v40-style';
    style.textContent = [
      '.pv40-back{position:fixed;inset:0;z-index:320;display:grid;place-items:center;padding:18px;background:rgba(17,24,39,.42);backdrop-filter:blur(6px)}',
      '.pv40-card{width:min(360px,100%);background:var(--panel-solid,#fff);color:var(--text,#18212f);border-radius:20px;padding:22px 20px 18px;box-shadow:0 24px 70px rgba(15,20,35,.28);text-align:center}',
      '.pv40-card h3{margin:0 0 6px;font-size:16px}',
      '.pv40-card p{margin:0;font-size:12.5px;line-height:1.7;color:var(--muted,#788392)}',
      '.pv40-spin{width:30px;height:30px;margin:0 auto 12px;border-radius:50%;border:3px solid var(--line,#e8ebf0);border-top-color:var(--accent,#5d72e8);animation:pv40-spin .8s linear infinite}',
      '@keyframes pv40-spin{to{transform:rotate(360deg)}}',
      '.pv40-actions{display:grid;gap:9px;margin-top:16px}',
      '.pv40-actions button{width:100%}',
      '.pv40-hint{margin-top:12px!important;font-size:11px!important;opacity:.85}',
      '.pv40-error{color:var(--danger,#d9534f)}'
    ].join('');
    document.head.appendChild(style);
  }

  /* ---------- 报告渲染成一个离屏 iframe ---------- */
  function mountReport(html) {
    return new Promise(function (resolve, reject) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('tabindex', '-1');
      // 打标记：下面的 iframe 监听会跳过它，否则会把自己正在渲染的报告吃掉
      iframe.setAttribute('data-pv40-report', '1');
      iframe.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + PAGE_W + 'px;height:' + PAGE_H + 'px;border:0;pointer-events:none;';
      var settled = false;
      function done() {
        if (settled) return;
        settled = true;
        try {
          if (!iframe.contentDocument || !iframe.contentDocument.body) throw new Error('报告没有渲染出来');
          resolve({ iframe: iframe, doc: iframe.contentDocument, view: iframe.contentWindow });
        } catch (error) {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          reject(error);
        }
      }
      iframe.addEventListener('load', function () { setTimeout(done, 30); }, { once: true });
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
      setTimeout(done, 5000);
    });
  }

  // 离屏 iframe 里的 rAF 在 iOS 上会被暂停，不能用它等待，直接延时即可
  function settle() {
    return new Promise(function (resolve) { setTimeout(resolve, 60); });
  }

  // 把测量好的块装进 A4 页面：块不拆开，超出就换页；单块超过一页时独占一页
  function paginateBlocks(measured, limit) {
    var pages = [];
    var current = [];
    var currentHeight = 0;
    measured.forEach(function (item) {
      if (current.length && currentHeight + item.height > limit) {
        pages.push(current);
        current = [];
        currentHeight = 0;
      }
      current.push(item);
      currentHeight += item.height;
    });
    if (current.length) pages.push(current);
    return pages;
  }

  /* ---------- 分页 + 逐页截图 ---------- */
  function buildPageImages(html, onProgress) {
    return mountReport(html).then(function (frame) {
      var doc = frame.doc;
      var view = frame.view;
      var body = doc.body;

      body.style.maxWidth = 'none';
      body.style.width = (PAGE_W - PAD * 2) + 'px';
      body.style.margin = '0';
      body.style.background = '#fff';

      return settle().then(function () {
        var nodes = [];
        for (var i = 0; i < body.children.length; i++) {
          var el = body.children[i];
          if (/^(SCRIPT|STYLE|LINK|META|TITLE)$/.test(el.tagName)) continue;
          nodes.push(el);
        }

        // 小节标题和它后面的内容绑在一起，避免标题单独落在页脚
        var groups = [];
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.tagName === 'H2' && nodes[j + 1]) { groups.push([node, nodes[j + 1]]); j++; }
          else groups.push([node]);
        }

        var limit = PAGE_H - PAD * 2;
        var measured = groups.map(function (group) {
          var rects = group.map(function (el) { return el.getBoundingClientRect(); });
          var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
          var bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
          var margin = parseFloat(view.getComputedStyle(group[group.length - 1]).marginBottom) || 0;
          return { group: group, height: Math.max(0, bottom - top) + margin };
        });

        var pages = paginateBlocks(measured, limit);
        if (!pages.length) pages.push([]);

        var shots = [];
        var h2c = window.html2canvas;
        var index = 0;

        function nextPage() {
          if (index >= pages.length) {
            if (frame.iframe.parentNode) frame.iframe.parentNode.removeChild(frame.iframe);
            return Promise.resolve(shots);
          }
          var page = doc.createElement('div');
          page.setAttribute('data-pdf-page', '1');
          page.style.cssText = 'width:' + PAGE_W + 'px;min-height:' + PAGE_H + 'px;padding:' + PAD + 'px;box-sizing:border-box;background:#fff;';
          pages[index].forEach(function (item) {
            item.group.forEach(function (el) { page.appendChild(el); });
          });
          body.appendChild(page);
          return settle().then(function () {
            return withTimeout(h2c(page, {
              scale: 2,
              backgroundColor: '#ffffff',
              width: PAGE_W,
              windowWidth: PAGE_W,
              logging: false,
              useCORS: true
            }), 20000, '第 ' + (index + 1) + ' 页渲染超时');
          }).then(function (canvas) {
            shots.push({ data: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height });
            // 及时释放画布，避免 iPhone 上内存堆积
            canvas.width = 1;
            canvas.height = 1;
            if (page.parentNode) page.parentNode.removeChild(page);
            index += 1;
            if (onProgress) onProgress(index, pages.length);
            return nextPage();
          });
        }

        return nextPage();
      });
    });
  }

  /* ---------- 合成 PDF ---------- */
  function imagesToPdf(images, jsPDF) {
    var pdf = null;
    images.forEach(function (image) {
      var width = 210; // mm
      var height = 210 * (image.height / image.width);
      if (!pdf) pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, height], compress: true });
      else pdf.addPage([width, height], 'portrait');
      pdf.addImage(image.data, 'JPEG', 0, 0, width, height, undefined, 'FAST');
    });
    if (!pdf) throw new Error('没有可导出的页面');
    return pdf;
  }

  /* ---------- 提示界面 ---------- */
  function overlay(html) {
    injectStyle();
    var back = document.createElement('div');
    back.className = 'pv40-back';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.innerHTML = '<div class="pv40-card">' + html + '</div>';
    document.body.appendChild(back);
    return {
      root: back,
      close: function () { if (back.parentNode) back.parentNode.removeChild(back); }
    };
  }

  function progressUi() {
    var ui = overlay('<div class="pv40-spin" aria-hidden="true"></div><h3>正在生成 PDF…</h3><p data-pv40-status>正在排版第 1 页</p>');
    var status = ui.root.querySelector('[data-pv40-status]');
    return {
      set: function (done, total) {
        if (status) status.textContent = '正在排版第 ' + Math.min(done, total) + ' / ' + total + ' 页';
      },
      close: ui.close
    };
  }

  function sizeText(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function escapeHtmlV40(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  // 和 CSV / TXT / JSON 三种导出一样：直接下载文件
  function finishPdf(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    if (typeof toast === 'function') toast('PDF 已生成，正在保存…');
  }

  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error(message || '生成超时，请重试')); }, ms);
      promise.then(function (value) { clearTimeout(timer); resolve(value); }, function (error) { clearTimeout(timer); reject(error); });
    });
  }

  function errorUi(error, retry) {
    var ui = overlay(
      '<h3>PDF 生成失败</h3>' +
      '<p class="pv40-error">' + escapeHtmlV40(error && error.message || '未知错误') + '</p>' +
      '<div class="pv40-actions">' +
      '<button type="button" class="primary" data-pv40-retry>再试一次</button>' +
      '<button type="button" class="secondary" data-pv40-close>关闭</button>' +
      '</div>' +
      '<p class="pv40-hint">如果反复失败，可以先导出 CSV/Excel 版本，或稍后再试。</p>'
    );
    var retryButton = ui.root.querySelector('[data-pv40-retry]');
    if (retryButton) retryButton.onclick = function () { ui.close(); retry(); };
    var closeButton = ui.root.querySelector('[data-pv40-close]');
    if (closeButton) closeButton.onclick = ui.close;
  }

  function fileNameFor(label) {
    var now = new Date();
    var stamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    var scope = String(label || '全部').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 24);
    return '成绩轨迹-成绩报告-' + scope + '-' + stamp + '.pdf';
  }

  /* ---------- 主流程 ---------- */
  function exportPdf(html, label, examCount) {
    if (busy) return;
    busy = true;
    var ui = progressUi();
    withTimeout(ensureLibs(), 20000, 'PDF 组件加载超时，请检查网络后重试').then(function (libs) {
      return buildPageImages(html, function (done, total) { ui.set(done, total); }).then(function (images) {
        var pdf = imagesToPdf(images, libs.jsPDF);
        var blob = pdf.output('blob');
        ui.close();
        track('export_pdf_generated', { pages: images.length, bytes: blob.size, exams: examCount });
        finishPdf(blob, fileNameFor(label));
      });
    }).catch(function (error) {
      ui.close();
      track('export_pdf_failed', { message: String(error && error.message || error).slice(0, 120) });
      errorUi(error, function () { exportPdf(html, label, examCount); });
    }).then(function () {
      busy = false;
    });
  }

  /* ---------- 接管导出面板 ---------- */
  function selectedFormat(ov) {
    var button = ov.querySelector('[data-fmt-v30].on');
    return button ? button.getAttribute('data-fmt-v30') : 'pdf';
  }
  function selectedScope(ov) {
    var button = ov.querySelector('[data-scope-v30].on');
    return button ? button.getAttribute('data-scope-v30') : '__all__';
  }
  function selectedLabel(ov) {
    var button = ov.querySelector('[data-scope-v30].on');
    var text = button ? String(button.textContent || '').trim() : '';
    return text || '全部';
  }

  function patchSheet(ov) {
    if (!ov || !needsPdf()) return;
    var go = ov.querySelector('.export-go-v30');
    var isPdf = selectedFormat(ov) === 'pdf';
    if (go && isPdf && go.textContent !== '📄 生成 PDF') go.textContent = '📄 生成 PDF';
    var sub = ov.querySelector('[data-fmt-v30="pdf"] small');
    if (sub && String(sub.textContent).indexOf('A4 报告') !== 0) sub.textContent = 'A4 报告，生成后可保存到「文件」或分享';
  }

  function startExport(ov) {
    var scope = selectedScope(ov);
    var label = selectedLabel(ov);
    var exams;
    try { exams = exporter.collect(scope); } catch (error) { exams = []; }
    if (!exams || !exams.length) {
      if (typeof toast === 'function') toast('该范围内还没有考试');
      return;
    }
    var html;
    try { html = exporter.buildPrintHtml(exams, label); } catch (error) {
      if (typeof toast === 'function') toast('报告生成失败，请重试');
      return;
    }
    try { exporter.closeSheet(); } catch (error) { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    track('export_start', { format: 'pdf', mode: 'pdf-file', scope: label, examCount: exams.length });
    exportPdf(html, label, exams.length);
  }

  var lastStart = 0;
  function claimStart() {
    var now = Date.now();
    if (now - lastStart < 1500) return false;
    lastStart = now;
    return true;
  }

  // 面板里的「导出」按钮：点自己这一层就能拦下，不依赖事件捕获顺序
  function bindSheet(ov) {
    patchSheet(ov);
    var go = ov.querySelector('.export-go-v30');
    if (!go || go.dataset.pv40Bound) return;
    go.dataset.pv40Bound = '1';
    go.addEventListener('click', function (event) {
      if (!needsPdf() || selectedFormat(ov) !== 'pdf') return;
      event.preventDefault();
      event.stopPropagation();
      if (!claimStart()) return;
      startExport(ov);
    });
    ov.addEventListener('click', function () { setTimeout(function () { patchSheet(ov); }, 0); });
  }

  // 兜底 1：捕获阶段先于面板自己的点击处理
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var go = target.closest('.export-go-v30');
    if (!go || !needsPdf()) return;
    var ov = document.getElementById('exportOverlayV30');
    if (!ov || selectedFormat(ov) !== 'pdf') return;
    if (!claimStart()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startExport(ov);
  }, true);

  // 兜底 2：老逻辑一定会创建一个带 srcdoc 的打印 iframe，直接接住它
  function isReportFrame(frame) {
    try {
      var html = frame.getAttribute('srcdoc') || '';
      return html.indexOf('成绩报告') >= 0;
    } catch (error) {
      return false;
    }
  }
  function takeOverPrintFrame(frame) {
    if (frame.hasAttribute('data-pv40-report')) return;
    if (frame.dataset.pv40Taken) return;
    frame.dataset.pv40Taken = '1';
    var html = frame.getAttribute('srcdoc') || '';
    if (!claimStart()) {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      return;
    }
    if (frame.parentNode) frame.parentNode.removeChild(frame);
    var ov = document.getElementById('exportOverlayV30');
    var label = ov ? selectedLabel(ov) : '全部';
    if (ov) {
      try { exporter.closeSheet(); } catch (error) { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    }
    track('export_start', { format: 'pdf', mode: 'pdf-file-frame', scope: label });
    exportPdf(html, label, 0);
  }

  var MO = window.MutationObserver || window.WebKitMutationObserver;
  if (MO) {
    new MO(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === 'IFRAME' && isReportFrame(node)) takeOverPrintFrame(node);
          else if (node.id === 'exportOverlayV30') bindSheet(node);
        }
      }
    }).observe(document.body, { childList: true });
  }

  var openedSheet = document.getElementById('exportOverlayV30');
  if (openedSheet) bindSheet(openedSheet);

  track('export_pdf_ready', { mode: needsPdf() ? 'pdf-file' : 'print' });

  // 便于排查导出问题
  window.__pdfExportV40 = { needsPdf: needsPdf, isIOS: isIOS, isStandalone: isStandalone, paginate: paginateBlocks };
})();
