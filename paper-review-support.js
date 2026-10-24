/* Local upload recovery and safely rendered report formulas. */
(function () {
  'use strict';
  var database, mathLoading;
  function openUploads() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (!database) database = new Promise(function (resolve) {
      var request = indexedDB.open('score-paper-uploads-v1', 1);
      request.onupgradeneeded = function () { request.result.createObjectStore('uploads', { keyPath: 'key' }); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = request.onblocked = function () { database = null; resolve(null); };
    }).catch(function () { database = null; return null; });
    return database;
  }
  async function uploads(operation, user, id, value) {
    var db = await openUploads(); if (!db) return null;
    return new Promise(function (resolve) {
      var tx = db.transaction('uploads', operation === 'get' ? 'readonly' : 'readwrite'), store = tx.objectStore('uploads'), result;
      var request = operation === 'put' ? store.put(Object.assign({}, value, { key: user + ':' + id, owner: user, id: id, at: Date.now() })) : operation === 'delete' ? store.delete(user + ':' + id) : operation === 'latest' ? store.getAll() : store.get(user + ':' + id);
      request.onsuccess = function () {
        result = request.result;
        if (operation === 'latest') (result || []).forEach(function (r) { if (Date.now() - r.at >= 7 * 86400000) store.delete(r.key); });
        if (operation === 'put') store.getAll().onsuccess = function (e) { e.target.result.filter(function (r) { return r.owner === user; }).sort(function (a, b) { return b.at - a.at; }).forEach(function (r, i) { if (i >= 8 || Date.now() - r.at >= 7 * 86400000) store.delete(r.key); }); };
      };
      tx.oncomplete = function () {
        if (operation === 'latest') result = (result || []).filter(function (r) { return r.owner === user && r.scope === id && Date.now() - r.at < 7 * 86400000; }).sort(function (a, b) { return b.at - a.at; })[0];
        if (operation === 'get' && result && (result.owner !== user || Date.now() - result.at > 7 * 86400000)) result = null;
        resolve(operation === 'put' || operation === 'delete' ? true : result || null);
      };
      tx.onerror = tx.onabort = function () { resolve(null); };
    }).catch(function () { return null; });
  }
  function script(src) {
    return new Promise(function (resolve, reject) { var el = document.createElement('script'); el.src = src; el.onload = resolve; el.onerror = reject; document.head.appendChild(el); });
  }
  function ensureMath() {
    if (window.katex && window.renderMathInElement) return Promise.resolve();
    if (!mathLoading) {
      var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = './vendor/katex/katex.min.css?v=0.19.0'; document.head.appendChild(link);
      mathLoading = script('./vendor/katex/katex.min.js?v=0.19.0').then(function () { return script('./vendor/katex/auto-render.min.js?v=0.19.0'); }).catch(function (e) { mathLoading = null; throw e; });
    }
    return mathLoading;
  }
  function legacyFormula(value) {
    var supers = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' }, subs = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
    var result = value.replace(/_{2,}/g, '\\underline{\\qquad}').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, function (s) { return '^{' + Array.from(s).map(function (c) { return supers[c]; }).join('') + '}'; }).replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, function (s) { return '_{' + Array.from(s).map(function (c) { return subs[c]; }).join('') + '}'; });
    result = result.replace(/_([A-Za-z]\d*|\d+)/g, '_{$1}').replace(/\^(-?\d+|[A-Za-z])/g, '^{$1}').replace(/([A-Za-z])([高低初末向弹绳底总始终])(\d*)/g, '$1_{\\text{$2}$3}').replace(/½/g, '\\frac{1}{2}').replace(/[−–]/g, '-').replace(/[·×]/g, '\\cdot ').replace(/π/g, '\\pi ').replace(/θ/g, '\\theta ').replace(/ω/g, '\\omega ').replace(/μ/g, '\\mu ').replace(/Δ/g, '\\Delta ').replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/√\(([^()]+)\)/g, '\\sqrt{$1}').replace(/√([A-Za-z0-9]+)/g, '\\sqrt{$1}');
    // Only local atoms become fractions; no change to the written order of operations.
    return result.replace(/([A-Za-z]+(?:[_^]\{[^{}]+\})*|\d+(?:\.\d+)?)\/([A-Za-z]+(?:[_^]\{[^{}]+\})*|\d+(?:\.\d+)?)/g, '\\frac{$1}{$2}');
  }
  function markLegacy(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], node;
    while ((node = walker.nextNode())) if (!node.parentElement.closest('textarea,input,select,script,style,code,pre,.katex,.pr-math-source') && node.parentElement.closest('.pr-text,.pr-evidence,.pr-wins,.pr-success')) nodes.push(node);
    nodes.forEach(function (node) {
      var original = node.nodeValue, protectedRanges = [], protectedMatch, protectedMath = /(?:\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
      while ((protectedMatch = protectedMath.exec(original))) protectedRanges.push([protectedMatch.index, protectedMatch.index + protectedMatch[0].length]);
      var re = /[A-Za-z0-9πθωμΔ½][A-Za-z0-9πθωμΔ√∛½高低初末向弹绳底总始终₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁻_^{}().=+*/−–<>≤≥×·-]*/g, last = 0, fragment = document.createDocumentFragment(), match, changed = false;
      while ((match = re.exec(original))) {
        if (protectedRanges.some(function (range) { return match.index >= range[0] && match.index < range[1]; })) continue;
        var value = match[0];
        if (!/[=≤≥<>²³⁴⁵⁶⁷⁸⁹⁰¹_^]/.test(value) || value.length < 3 || !/[A-Za-zπθωμΔ]/.test(value)) continue;
        var formula = legacyFormula(value);
        try { window.katex.renderToString(formula, { throwOnError: true, trust: false, maxExpand: 1000, maxSize: 12, strict: 'ignore' }); } catch (_) { continue; }
        fragment.appendChild(document.createTextNode(original.slice(last, match.index)));
        var span = document.createElement('span'); span.className = 'pr-math-source'; span.textContent = '\\(' + formula + '\\)'; fragment.appendChild(span);
        last = match.index + value.length; changed = true;
      }
      if (changed) { fragment.appendChild(document.createTextNode(original.slice(last))); node.replaceWith(fragment); }
    });
  }
  async function renderMath(root) {
    try {
      await ensureMath(); if (!root.isConnected) return;
      markLegacy(root);
      window.renderMathInElement(root, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }], ignoredTags: ['script', 'style', 'textarea', 'pre', 'code', 'option'], ignoredClasses: ['katex'], throwOnError: false, trust: false, maxExpand: 1000, maxSize: 12, strict: 'ignore' });
    } catch (_) { /* Keep readable source when the local math asset cannot be loaded. */ }
  }
  function wins(q) {
    return (q.wins || []).map(function (w) {
      if (w.basis === 'work' && /^(?:[A-H]{1,8}|[+-]?\d+(?:\.\d+)?(?:[A-Za-z/²³]+)?|大于|小于|等于|相等|不相等|正确|错误|是|否)$/.test(w.observed.trim())) return { skill: '已给出本小问的判断', observed: w.observed, significance: '把关键理由补充出来，可以形成完整的得分步骤。', basis: 'work_result' };
      return w;
    });
  }
  // A reading-time projection of existing advice, never a new diagnosis or model call.
  function nextExamTips(report) {
    if (!report || report.record_only || report.analysis_stale || report.work_on_paper === false && !(report.source_pages || []).some(function (p) { return p.role === 'work'; })) return [];
    var questions = (report.questions || []).filter(function (q) {
      if (q.record_only || q.review_status && q.review_status !== 'reviewed' || q.score_verification === 'conflict' || ['strength', 'ai_strength', 'needs_confirmation', 'question_guidance'].includes(q.analysis_mode)) return false;
      if (q.teacher_score != null && q.max_score != null && q.teacher_score >= q.max_score || q.ai_grading && q.ai_grading.status === 'confirmed' && q.ai_grading.verdict === 'correct') return false;
      var readable = typeof q.answer === 'string' && q.answer.trim() && q.status !== 'unclear' && q.status !== 'blank'
        || (q.subparts || []).some(function (p) { return p.status === 'answered' && p.answer; });
      var issue = q.first_issue && q.first_issue.certainty === 'confirmed';
      var loss = typeof q.teacher_score === 'number' && typeof q.max_score === 'number' && q.teacher_score < q.max_score;
      var graded = q.ai_grading && q.ai_grading.status === 'confirmed' && ['incorrect', 'partial'].includes(q.ai_grading.verdict);
      return readable && (issue || loss || graded) && typeof q.transfer_rule === 'string' && q.transfer_rule.trim();
    });
    var result = [], used = new Set();
    function ruleKey(value) { return value.normalize('NFKC').replace(/\s+/g, '').replace(/\*\*/g, '').replace(/[。.!！;；]+$/, ''); }
    function add(q) {
      var key = ruleKey(q.transfer_rule);
      var existing = result.find(function (tip) { return ruleKey(tip.text) === key; });
      if (existing) { if (!existing.questions.includes(q.label)) existing.questions.push(q.label); used.add(q.label); return; }
      if (result.length >= 3 || used.has(q.label)) return;
      result.push({ text: q.transfer_rule.trim(), questions: [q.label] }); used.add(q.label);
    }
    // Keep the report's learning priorities, but do not turn its practice questions,
    // solutions or speculative explanations into a generic exam checklist.
    (report.action_plan || []).forEach(function (action) {
      var q = (action.questions || []).map(function (label) { return questions.find(function (q) { return q.label === label; }); })
        .find(function (q) { return q && !used.has(q.label); });
      if (q) add(q);
    });
    questions.forEach(add);
    return result;
  }
  // Small, deliberately non-HTML renderer. Keep math opaque while formatting prose;
  // quotes and editable source transcripts never pass through this formatter.
  function prose(value) {
    var math = [], source = String(value == null ? '' : value).replace(/\r\n?/g, '\n');
    // Private-use markers supplied by model/user text must not impersonate placeholders.
    source = source.replace(/[\uE000\uE001]/g, '');
    source = source.replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$/g, function (s) { math.push(s); return '\uE000' + (math.length - 1) + '\uE001'; });
    function inline(s) {
      return escapeHtml(s).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\uE000(\d+)\uE001/g, function (_, n) { return escapeHtml(math[Number(n)] || ''); });
    }
    var html = '', paragraph = [], list = '', items = [];
    function flush() { if (paragraph.length) { html += '<p>' + inline(paragraph.join('\n')) + '</p>'; paragraph = []; } if (items.length) { html += '<' + list + '>' + items.join('') + '</' + list + '>'; items = []; list = ''; } }
    source.split('\n').forEach(function (line) {
      var item = line.match(/^\s*(?:(\d+)[.)、]|([-*•]))\s+(.+)$/), heading = line.match(/^\s*#{1,6}\s+(.+)$/);
      if (!line.trim()) { flush(); return; }
      if (heading) { flush(); html += '<p class="pr-prose-heading"><strong>' + inline(heading[1]) + '</strong></p>'; return; }
      if (item) { var kind = item[1] ? 'ol' : 'ul'; if (paragraph.length || list && list !== kind) flush(); list = kind; items.push('<li' + (item[1] ? ' value="' + Number(item[1]) + '"' : '') + '>' + inline(item[3]) + '</li>'); return; }
      if (items.length) flush(); paragraph.push(line);
    });
    flush(); return '<div class="pr-text pr-prose">' + html + '</div>';
  }
  window.ScorePaperSupport = { uploads: uploads, renderMath: renderMath, legacyFormula: legacyFormula, wins: wins, prose: prose, nextExamTips: nextExamTips };
})();
