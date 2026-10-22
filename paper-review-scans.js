/* Per-question scan regions and editable OCR records; no generated HTML is trusted. */
(function () {
  'use strict';
  var esc = function (s) { return escapeHtml(String(s == null ? '' : s)); };
  var roles = { paper: '原题', work: '作答', reference: '参考答案' };
  function btn(s, action) { return '<button type="button" class="pr-button" data-scan="' + action + '">' + s + '</button>'; }
  function cropEditor(parent, pages, current, save) {
    var editor = document.createElement('section'); editor.className = 'ps-editor';
    var page = pages.find(function (p) { return current && p.page === current.page; }) || pages[0], box = current ? current.box.slice() : [0,0,1,1], kind = current ? current.kind : page.role;
    editor.innerHTML = '<div class="ps-controls"><label>来源页<select data-page>' + pages.map(function (p) { return '<option value="' + p.page + '" ' + (p === page ? 'selected' : '') + '>第 ' + p.page + ' 页 · ' + roles[p.role] + '</option>'; }).join('') + '</select></label><label>区域内容<select data-kind>' + Object.keys(roles).map(function (k) { return '<option value="' + k + '" ' + (k === kind ? 'selected' : '') + '>' + roles[k] + '</option>'; }).join('') + '</select></label></div><p class="pr-muted">在图片上拖动框选完整题目或作答；也可以调整下面的百分比。跨页内容可继续添加区域。</p><div class="ps-stage"><img alt="待框选的扫描页" draggable="false"><div class="ps-selection"></div></div><div class="ps-coordinates">' + ['左边距','上边距','宽度','高度'].map(function (n, i) { return '<label>' + n + ' %<input type="number" min="0" max="100" step="0.1" data-coordinate="' + i + '"></label>'; }).join('') + '</div><div class="ps-actions">' + btn('整页','full') + btn('保存区域','save') + btn('取消','cancel') + '</div><p class="ps-error" role="status"></p>';
    parent.appendChild(editor); var stage = editor.querySelector('.ps-stage'), img = stage.querySelector('img'), selection = stage.querySelector('.ps-selection'), start;
    function paint() { selection.style.cssText = 'left:' + box[0]*100 + '%;top:' + box[1]*100 + '%;width:' + box[2]*100 + '%;height:' + box[3]*100 + '%'; editor.querySelectorAll('[data-coordinate]').forEach(function (el, i) { el.value = Math.round(box[i]*1000)/10; }); }
    img.src = page.url; paint();
    editor.querySelector('[data-page]').onchange = function (e) { page = pages.find(function (p) { return String(p.page) === e.target.value; }); img.src = page.url; box = [0,0,1,1]; paint(); };
    editor.querySelector('[data-kind]').onchange = function (e) { kind = e.target.value; };
    function point(e) { var r = stage.getBoundingClientRect(); return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]; }
    stage.onpointerdown = function (e) { if (!img.complete) return; e.preventDefault(); start = point(e); stage.setPointerCapture(e.pointerId); };
    stage.onpointermove = function (e) { if (!start) return; var end = point(e); box = [Math.min(start[0],end[0]),Math.min(start[1],end[1]),Math.max(.001,Math.abs(end[0]-start[0])),Math.max(.001,Math.abs(end[1]-start[1]))]; paint(); };
    stage.onpointerup = stage.onpointercancel = function () { start = null; };
    editor.querySelectorAll('[data-coordinate]').forEach(function (el, i) { el.onchange = function () { box[i] = Math.max(0,Math.min(1,Number(el.value)/100)); box[2] = Math.min(box[2],1-box[0]); box[3] = Math.min(box[3],1-box[1]); paint(); }; });
    editor.onclick = async function (e) { var b = e.target.closest('[data-scan]'); if (!b) return; e.stopPropagation();
      if (b.dataset.scan === 'cancel') editor.remove();
      if (b.dataset.scan === 'full') { box = [0,0,1,1]; paint(); }
      if (b.dataset.scan === 'save') { b.disabled = true; try { if (box[2] <= .01 || box[3] <= .01) throw new Error('请框选更完整的区域'); await save({ page: page.page, kind: kind, box: box }); editor.remove(); } catch (err) { editor.querySelector('.ps-error').textContent = err.message; } finally { b.disabled = false; } }
    };
    editor.scrollIntoView && editor.scrollIntoView({ block: 'nearest' });
  }
  function regionCard(region, page, index) {
    return '<figure class="ps-region" data-index="' + index + '"><figcaption>' + roles[region.kind] + ' · 第 ' + region.page + ' 页</figcaption><div class="ps-crop"><img loading="lazy" src="' + esc(page.url) + '" alt="' + roles[region.kind] + '扫描区域"></div><div>' + btn('调整','edit:' + index) + btn('移除区域','remove:' + index) + '</div></figure>';
  }
  async function decorate(main, r, ctx, hooks) {
    var generation = String(Number(main.dataset.scanGeneration || 0) + 1); main.dataset.scanGeneration = generation;
    var isPaused = r.status === 'paused', qs = r.result ? r.result.questions : r.recovery && r.recovery.questions || [];
    if (!qs.length) return;
    var api = function (action, payload) { return hooks.api(ctx, action, Object.assign({ request_id: r.request_id }, payload || {})); };
    if (isPaused) {
      var form = document.createElement('form'); form.className = 'ps-verify';
      form.innerHTML = '<h3>核对题目与作答</h3><p class="pr-muted">保留原有错误写法；修正识别文字和批改分，分析会使用保存后的内容。</p>' + qs.map(function (q, i) { return '<details class="pr-question" data-ocr="' + i + '"><summary>第 ' + esc(q.label) + ' 题</summary><div class="pr-question-body"><label>题目<textarea name="stem' + i + '" rows="4" maxlength="4500" required>' + esc(q.stem) + '</textarea></label><label>考试时的作答<textarea name="answer' + i + '" rows="4" maxlength="4000">' + esc(q.answer) + '</textarea></label><div class="pr-score-fields"><label>批改得分<input name="score' + i + '" type="number" min="0" max="9999" step=".01" value="' + esc(q.teacher_score) + '"></label><label>满分<input name="max' + i + '" type="number" min="0" max="9999" step=".01" value="' + esc(q.max_score) + '"></label></div></div></details>'; }).join('') + '<button class="pr-button pr-primary" type="submit">保存核对并继续</button>';
      main.appendChild(form);
      form.onsubmit = async function (e) { e.preventDefault(); var b = form.querySelector('[type=submit]'); b.disabled = true;
        try { var questions = qs.map(function (q, i) { function value(k) { return form.elements[k+i].value; } return { label: q.label, stem: value('stem'), answer: value('answer'), teacher_score: value('score') === '' ? null : Number(value('score')), max_score: value('max') === '' ? null : Number(value('max')) }; }); await api('confirm_input', { questions: questions }); await api('resume', { mode: 'saved' }); await hooks.load(r.request_id); } catch (err) { hooks.note(err.message, true); } finally { if (b.isConnected) b.disabled = false; }
      };
      if (r.input_review) main.querySelector('[data-pr=resume]').hidden = true;
    }
    var source;
    try { source = await api('sources'); } catch (err) { if (main.isConnected) hooks.note(err.message, true); return; }
    if (!main.isConnected || main.dataset.scanGeneration !== generation) return;
    var pages = source.pages || [], regions = source.regions || {}, panel = document.createElement('details'); panel.className = 'ps-library';
    panel.innerHTML = '<summary>扫描件 · ' + pages.length + ' 页</summary><p class="pr-muted">扫描件保存在当前账号。展开题目可查看或调整原题、作答区域。</p><div class="ps-pages">' + pages.map(function (p) { return '<a target="_blank" rel="noopener" href="' + esc(p.url) + '"><img loading="lazy" src="' + esc(p.url) + '" alt="第' + p.page + '页扫描件"><span>第' + p.page + '页 · ' + roles[p.role] + '</span></a>'; }).join('') + '</div>' + (r.status !== 'running' ? '<label>补充扫描件类别<select data-add-kind><option value="paper">原题</option><option value="work">作答</option><option value="reference">参考答案</option></select></label><label class="pr-check"><input type="checkbox" data-scan-consent>同意在账号中保存补充扫描件；裁掉姓名、考号等无关信息</label><label class="pr-button pr-file-label">补充扫描件<input type="file" accept="image/jpeg,image/png,image/webp" data-add-page></label>' : '') + '<p class="ps-upload-note" role="status"></p>';
    main.prepend(panel);
    var file = panel.querySelector('[data-add-page]'); if (file) file.onchange = async function () {
      if (!file.files.length) return; var message = panel.querySelector('.ps-upload-note'); file.disabled = true;
      try {
        if (!panel.querySelector('[data-scan-consent]').checked) throw new Error('请先确认保存扫描件');
        if (pages.length >= 8) throw new Error('本份报告已保存8页扫描件');
        message.textContent = '正在保存扫描件…'; var p = await window.ScorePaperReview.prepare(file.files[0]);
        await api('save_materials', { consent: true, subject: r.subject, draft_id: r.draft_id, exam_id: r.exam_id, title: r.title, options: r.options });
        await api('upload_page', { page: pages.length+1, role: panel.querySelector('[data-add-kind]').value, url: p.url });
        await hooks.load(r.request_id);
      } catch (err) { message.textContent = err.message; } finally { file.disabled = false; file.value = ''; }
    };
    qs.forEach(function (q, i) {
      var target = isPaused ? main.querySelector('[data-ocr="' + i + '"] .pr-question-body') : main.querySelector('[data-question="' + q.id + '"] .pr-question-body');
      if (!target) return;
      var zone = document.createElement('section'); zone.className = 'ps-question'; target.prepend(zone);
      var current = Object.prototype.hasOwnProperty.call(regions,q.label) ? regions[q.label] : q.source_regions || [];
      current = current.filter(function (r) { return pages.some(function (p) { return p.page === r.page; }); });
      function render() {
        zone.innerHTML = '<h4>原题与作答扫描</h4>' + (pages.length ? '<div class="ps-regions">' + current.map(function (r, j) { return regionCard(r,pages.find(function (p) { return p.page === r.page; }),j); }).join('') + '</div>' + btn('＋ 框选扫描区域','add') + (!current.length ? '<p class="pr-muted">从已保存图片中框选本题；可分别添加原题与作答。</p>' : '') : '<p class="pr-muted">在上方“扫描件”中补充图片后，可为本题框选原题和作答。</p>');
        zone.querySelectorAll('.ps-crop img').forEach(function (img, j) { var b = current[j].box; function layout() { img.parentElement.style.aspectRatio = (b[2]*img.naturalWidth)/(b[3]*img.naturalHeight); img.style.cssText = 'width:' + (100/b[2]) + '%;max-width:none;left:' + (-b[0]/b[2]*100) + '%;top:' + (-b[1]/b[3]*100) + '%'; } img.onload = layout; if (img.complete && img.naturalWidth) layout(); });
      }
      async function persist(next) { await api('save_regions', { label: q.label, regions: next }); current = next; render(); }
      zone.onclick = async function (e) { var b = e.target.closest('[data-scan]'); if (!b || b.closest('.ps-editor')) return; e.preventDefault(); e.stopPropagation();
        var a = b.dataset.scan, index = Number(a.split(':')[1]);
        try { if (a === 'add' || a.startsWith('edit:')) { var old = zone.querySelector('.ps-editor'); if (old) old.remove(); cropEditor(zone,pages,a === 'add' ? null : current[index],async function (r) { var next = current.slice(); if (a === 'add') next.push(r); else next[index] = r; await persist(next); }); }
          else if (a.startsWith('remove:')) await persist(current.filter(function (_, j) { return j !== index; }));
        } catch (err) { hooks.note(err.message,true); }
      };
      render();
    });
  }
  window.ScorePaperScans = { decorate: decorate };
  var style = document.createElement('style'); style.textContent = `.ps-library{padding:16px;border:1px solid var(--line);border-radius:12px;margin-bottom:18px}.ps-library summary{font-weight:700;cursor:pointer}.ps-pages{display:flex;gap:12px;overflow:auto;padding:15px 0}.ps-pages a{flex:none;width:90px;font-size:11px;color:var(--text);text-decoration:none}.ps-pages img{width:90px;height:110px;object-fit:contain;border:1px solid var(--line);border-radius:8px;display:block}.ps-library>label{display:block;margin:12px 0}.ps-library .pr-check{display:flex}.ps-library .pr-file-label{display:inline-block}.ps-library select{display:block}.ps-question{padding:12px 0;border-bottom:1px solid var(--line);margin-bottom:15px}.ps-regions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ps-region{margin:8px 0;border:1px solid var(--line);border-radius:10px;padding:10px;min-width:0}.ps-region figcaption{font-size:12px;color:var(--muted);margin-bottom:8px}.ps-crop{position:relative;overflow:hidden;background:#fff;aspect-ratio:1;max-height:600px}.ps-crop img{position:absolute;height:auto;display:block}.ps-region .pr-button{font-size:11px;padding:5px 8px;margin:10px 4px 0 0}.ps-editor{margin:15px 0;padding:12px;border:1px solid var(--accent);border-radius:12px}.ps-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ps-controls select{width:100%;padding:8px}.ps-stage{position:relative;touch-action:none;user-select:none;margin:12px auto;max-width:600px;line-height:0}.ps-stage>img{width:100%;height:auto;display:block}.ps-selection{position:absolute;box-sizing:border-box;border:2px solid #5264e8;background:#5264e820;pointer-events:none}.ps-coordinates{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ps-coordinates input{width:100%}.ps-actions{display:flex;gap:8px;margin-top:12px}.ps-error{color:var(--danger)}.ps-verify{margin-top:20px}.ps-upload-note{font-size:12px;color:var(--muted)}@media(max-width:520px){.ps-regions{grid-template-columns:1fr}.ps-coordinates{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(style);
})();
