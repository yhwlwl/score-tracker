/* Compact analysis and selective report export. */
(function () {
  'use strict';
  var serial = 0, pending = false, opener = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var arrow = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function pref(key, value) {
    try {
      var k = 'st_folds_v38:' + key;
      if (arguments.length > 1) localStorage.setItem(k, value ? '1' : '0');
      var saved=localStorage.getItem(k);
      return saved === null ? key === 'analysis-filters' : saved === '1';
    } catch (_) { return false; }
  }
  function fold(host, nodes, key, label, head) {
    if (!nodes.length || host.dataset.foldV38) return;
    host.dataset.foldV38 = '1';
    var body = document.createElement('div'); body.className = 'fold-body-v38'; body.id = 'fold-v38-' + (++serial);
    host.insertBefore(body, nodes[0]); nodes.forEach(function (n) { body.appendChild(n); });
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fold-toggle-v38';
    b.innerHTML = arrow; b.setAttribute('aria-controls', body.id);
    (head || host).appendChild(b);
    function update(closed) {
      body.hidden = closed; b.setAttribute('aria-expanded', String(!closed));
      b.setAttribute('aria-label', (closed ? '展开' : '收起') + label); b.title = b.getAttribute('aria-label');
    }
    b.addEventListener('click', function () { var closed = !body.hidden; update(closed); pref(key, closed); });
    update(pref(key)); return body;
  }
  function explain(node) {
    if (node.closest('details') || node.dataset.explainV38 || !node.textContent.trim()) return;
    node.dataset.explainV38 = '1';
    var d = document.createElement('details'); d.className = 'explain-v38';
    var summary = document.createElement('summary'); summary.textContent = '怎么看';
    node.before(d); d.appendChild(summary); d.appendChild(node);
  }
  function enhance() {
    var page = document.querySelector('.sv31-page');
    if (page) {
      // Explanations remain available without interrupting the first view.
      page.querySelectorAll('.card-sub,.dsb-fig-cap,.dsb-tip').forEach(function (n) {
        if (n.textContent.trim().length > 45) explain(n);
      });
      page.querySelectorAll('.card-title-row .card-sub').forEach(function(n) {
        if (n.textContent.trim().length > 20) explain(n);
      });
      var head = page.querySelector('.page-head');
      if (head && !page.dataset.foldV38) {
        var controls = Array.from(page.children).filter(function(n) { return n.classList.contains('sv31-controls') || (!n.classList.contains('card') && n.querySelector('.combo-chips-v25')); });
        fold(page, controls, 'analysis-filters', '分析筛选', head);
        var current=Array.from(page.querySelectorAll('[data-sv31-combo].active,[data-sv31-scope].active,#sv31Mode .active')).map(function(n){return n.textContent.trim();}).filter(function(t){return t!=='全部';}).join(' · ');
        var hint=document.createElement('span');hint.className='filter-summary-v38';hint.textContent=current||'筛选';head.insertBefore(hint,head.lastElementChild);
      }
      page.querySelectorAll(':scope > .card').forEach(function (card) {
        var title = card.querySelector('.card-title-row,.dsb-head'); if (!title) return;
        var name = (title.querySelector('.card-title') || title.querySelector('span') || title).textContent.trim();
        var nodes = Array.from(card.children).filter(function(n) { return n !== title; });
        fold(card, nodes, 'section:' + name, name, title);
      });
    }
    // Other dense chip groups get the same small toggle as the home trend.
    document.querySelectorAll('#content .combo-chips-v25,#content .chips,#content .dsb-controls').forEach(function(row) {
      if (row.dataset.denseV38 || row.closest('.trend-controls-v36,.sv31-page > .fold-body-v38') || row.querySelectorAll('button').length < 6) return;
      row.dataset.denseV38 = '1';
      var host = document.createElement('div'); host.className = 'dense-v38'; row.before(host);
      var title = document.createElement('div'); title.className = 'dense-head-v38';
      var label = document.createElement('span'); label.textContent = '筛选'; title.appendChild(label); host.appendChild(title); host.appendChild(row);
      var labels = Array.from(row.querySelectorAll('button')).map(function(b){return b.textContent.trim();}).join('|');
      var key = 'chips:' + (row.id || row.className) + ':' + labels;
      fold(host, [row], key, '筛选', title);
      function selected() { label.textContent = Array.from(row.querySelectorAll('.active,.on,[aria-pressed="true"]')).map(function(b){return b.textContent.trim();}).join(' · ') || '筛选'; }
      selected();
    });
  }
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; enhance(); }); }

  var sections = [
    ['kpi','总览'],['worth','成绩含金量'],['insights','近期提醒'],['trend','趋势分析'],['structure','科目结构'],
    ['hall','个人最佳'],['calib','目标分析'],['comp','名次竞争力'],['matrix','成绩矩阵与个人纪录'],['deep','深度分析'],['quality','数据与计算方法']
  ];
  var charts = [['rate','得分率趋势'],['matrix','各科与组合得分率'],['year','年级排名趋势'],['class','班级排名趋势']];
  function newest(a,b) { return String(b.exam_date || '').localeCompare(String(a.exam_date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id || '').localeCompare(String(a.id || '')); }
  function choices(list, group, selected) {
    return list.map(function (x) { return '<label class="export-choice-v38"><input type="checkbox" data-choice="' + group + '" value="' + esc(x[0]) + '"' + (selected.has(String(x[0])) ? ' checked' : '') + '><span>' + esc(x[1]) + '</span></label>'; }).join('');
  }
  function group(title, key, content, open) {
    return '<details class="export-group-v38" data-group="' + key + '"' + (open ? ' open' : '') + '><summary>' + title + '<small data-count="' + key + '"></small></summary><div class="export-group-body-v38"><div class="export-select-v38"><button type="button" data-all="' + key + '">全选</button><button type="button" data-none="' + key + '">清空</button></div>' + content + '</div></details>';
  }
  function openExport() {
    if (document.getElementById('customExportV38')) return;
    var exams = ((typeof state !== 'undefined' && state.allExams) || []).slice().sort(newest);
    if (!exams.length) { if (typeof toast === 'function') toast('先记录一次考试吧'); return; }
    opener = document.activeElement;
    var selection = {exams:new Set(exams.map(function(e){return String(e.id);})),records:new Set(['overview','details']),charts:new Set(charts.map(function(x){return x[0];})),analysis:new Set()};
    var format = 'pdf', category = '__all__';
    var overlay = document.createElement('div'); overlay.id = 'customExportV38'; overlay.className = 'export-overlay-v30';
    var cats = Array.from(new Set(exams.map(function(e){return e.grade_level || '未分类';})));
    var examContent = '<label class="export-category-v38">分类<select id="exportCategoryV38"><option value="__all__">全部</option>' + cats.map(function(c,i){return '<option value="' + i + '">' + esc(c) + '</option>';}).join('') + '</select></label><div class="export-exams-v38">' + exams.map(function(e) {
      return '<label class="export-choice-v38" data-exam-category="' + esc(e.grade_level || '未分类') + '"><input type="checkbox" data-choice="exams" value="' + esc(e.id) + '" checked><span>' + esc(e.name || '未命名考试') + '<small>' + esc(e.exam_date) + (e.is_hidden ? ' · 已隐藏' : '') + '</small></span></label>';
    }).join('') + '</div>';
    overlay.innerHTML = '<div class="export-sheet-v30 export-sheet-v38" role="dialog" aria-modal="true" aria-labelledby="exportTitleV38"><div class="export-head-v30"><b id="exportTitleV38">导出</b><button type="button" class="close-btn" data-close-v38 aria-label="关闭">×</button></div>' +
      '<div class="export-format-v38" role="group" aria-label="文件格式">' + [['pdf','PDF 报告'],['csv','表格'],['txt','文本'],['json','数据备份']].map(function(x){return '<button type="button" data-format="'+x[0]+'">'+x[1]+'</button>';}).join('') + '</div>' +
      group('选择考试','exams',examContent,true) +
      '<div data-report-options>' + group('考试记录','records','<div class="export-options-v38">'+choices([['overview','成绩总览'],['details','各科明细']],'records',selection.records)+'</div>') +
      group('图表','charts','<div class="export-options-v38">'+choices(charts,'charts',selection.charts)+'</div>') +
      group('分析板块','analysis','<div class="export-options-v38">'+choices(sections,'analysis',selection.analysis)+'</div><p class="export-hint-v38">按所选考试重新分析，沿用分析页的科目和模式。</p>') + '</div>' +
      '<p class="export-hint-v38" data-format-hint></p><div class="export-bottom-v38"><span data-total aria-live="polite"></span><button type="button" class="primary" data-download-v38>导出 PDF</button></div></div>';
    document.body.appendChild(overlay);
    var oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    function close() { overlay.remove(); document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keyboard); if(opener && opener.isConnected) opener.focus(); }
    function keyboard(e) {
      if(e.key === 'Escape') { e.preventDefault(); close(); }
      if(e.key === 'Tab') {
        var items = Array.from(overlay.querySelectorAll('button,input,select,summary')).filter(function(n){return !n.disabled && n.getClientRects().length;});
        var first=items[0],last=items[items.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }
    }
    document.addEventListener('keydown', keyboard);
    function visibleExam(e) { return category === '__all__' || (e.grade_level || '未分类') === cats[Number(category)]; }
    function selectedExams() { return exams.filter(function(e){return visibleExam(e) && selection.exams.has(String(e.id));}); }
    function update() {
      overlay.querySelectorAll('[data-format]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.format===format));});
      overlay.querySelector('[data-report-options]').hidden = format !== 'pdf';
      overlay.querySelector('[data-format-hint]').textContent = {pdf:'保存为 PDF，方便打印或分享。',csv:'导出所选考试的成绩表，可用 Excel 打开。',txt:'导出所选考试的文字成绩单。',json:'保存所选考试和账户设置，不含密码。'}[format];
      overlay.querySelectorAll('[data-exam-category]').forEach(function(n){n.hidden = category !== '__all__' && n.dataset.examCategory !== cats[Number(category)];});
      Object.keys(selection).forEach(function(k){overlay.querySelector('[data-count="'+k+'"]').textContent = (k==='exams'?selectedExams().length:selection[k].size)+' 项';});
      var count=selection.records.size+selection.charts.size+selection.analysis.size;
      overlay.querySelector('[data-total]').textContent=selectedExams().length+' 次考试'+(format==='pdf'?' · '+count+' 项内容':'');
      var go=overlay.querySelector('[data-download-v38]');go.disabled=!selectedExams().length||(format==='pdf'&&!count);go.textContent='导出 '+format.toUpperCase();
    }
    overlay.addEventListener('change',function(e){var n=e.target;if(n.dataset.choice){var set=selection[n.dataset.choice];n.checked?set.add(n.value):set.delete(n.value);}if(n.id==='exportCategoryV38')category=n.value;update();});
    overlay.addEventListener('click',function(e){
      var b=e.target.closest('button');
      if(e.target===overlay || (b && b.hasAttribute('data-close-v38')))return close();
      if(!b)return;
      if(b.dataset.format){format=b.dataset.format;update();return;}
      var key=b.dataset.all||b.dataset.none;
      if(key){overlay.querySelectorAll('[data-choice="'+key+'"]').forEach(function(n){if(n.closest('[hidden]'))return;n.checked=!!b.dataset.all;n.checked?selection[key].add(n.value):selection[key].delete(n.value);});update();return;}
      if(b.hasAttribute('data-download-v38')){
        var chosen=selectedExams();
        try {
          if(format==='pdf')window.__v30.printReport(buildReport(chosen,selection));
          else {
            var api=window.__v30,content=format==='csv'?api.buildCsv(chosen,'所选考试'):format==='txt'?api.buildTxt(chosen,'所选考试'):api.buildJson(chosen,'所选考试');
            api.download(api.filename('所选考试',format),content,format==='json'?'application/json;charset=utf-8':format==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8');
          }
          if(window.__stTrack)window.__stTrack('export_done',{format:format,examCount:chosen.length,chartCount:format==='pdf'?selection.charts.size:0,analysisCount:format==='pdf'?selection.analysis.size:0});
        } catch(err) { if(typeof toast==='function')toast('暂时没能导出，请再试一次'); console.error(err); }
      }
    });
    update();overlay.querySelector('[data-close-v38]').focus();
    if(window.__stTrack)window.__stTrack('export_open',{});
  }

  function analysisHtml(exams, selected) {
    if(!selected.size)return '';
    var api=window.__v32, chronological=exams.slice().sort(function(a,b){return -newest(a,b);});
    var f=api.applySubjectModule(api.buildFeatures(chronological));
    var mode=(state.sv31||{}).mode||'rank';
    var scopeLabel=(f.totalLabel||'总分')+' · '+(mode==='score'?'分数模式':'排名模式');
    return '<div class="report-analysis"><h2>成绩分析</h2><p>'+esc(scopeLabel)+' · '+exams.length+' 次考试</p>'+sections.filter(function(s){return selected.has(s[0]);}).map(function(s){
      var html=s[0]==='deep'?window.__v34.sectionHtml(chronological):s[0]==='worth'?window.__stScoreWorth.html(f):api[s[0]](f,mode);
      var box=document.createElement('div');box.innerHTML=html;
      // Keep chart labels and evidence; omit interactive controls in the printed report.
      box.querySelectorAll('.worth-controls,.worth-reference-choice,.combo-chips-v25,.dsb-privacy-note,.dsb-note,.sv31-seg,.dsb-level-head small,input,select,.sv31-evi,.ev').forEach(function(n){n.remove();});
      box.querySelectorAll('button,a').forEach(function(n){var span=document.createElement('span');span.innerHTML=n.innerHTML;n.replaceWith(span);});
      box.querySelectorAll('details').forEach(function(n){n.open=true;});
      box.querySelectorAll('.sv31-pane').forEach(function(n){n.style.display='block';});
      box.querySelectorAll('[hidden]').forEach(function(n){n.removeAttribute('hidden');});
      box.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id');});
      box.querySelectorAll('svg').forEach(function(n){n.style.width='100%';n.style.minWidth='0';n.style.height='auto';});
      box.querySelectorAll('.sv31-insight .ico').forEach(function(n){n.style.width='28px';n.style.height='28px';n.style.display='grid';n.style.placeItems='center';n.style.flex='none';});
      box.querySelectorAll('.sv31-insight .ico svg').forEach(function(n){n.setAttribute('width','16');n.setAttribute('height','16');n.setAttribute('fill','none');n.setAttribute('stroke','currentColor');n.setAttribute('stroke-width','2');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');n.style.width='16px';n.style.height='16px';n.style.minWidth='0';n.style.display='block';});
      return '<section class="analysis-section-v38">'+box.innerHTML+'</section>';
    }).join('')+'</div>';
  }
  function buildReport(exams, selected) {
    // The existing report draws trends in chronological order; record lists are reversed separately.
    var chronological=exams.slice().sort(function(a,b){return -newest(a,b);});
    var doc=new DOMParser().parseFromString(window.__v30.buildPrintHtml(chronological,'所选考试'),'text/html');
    var heads=Array.from(doc.querySelectorAll('h2.sec'));
    var keep={'得分率趋势':selected.charts.has('rate'),'各科 · 组合 得分率':selected.charts.has('matrix'),'排名趋势':selected.charts.has('year')||selected.charts.has('class'),'成绩总览':selected.records.has('overview'),'各科明细':selected.records.has('details')};
    heads.forEach(function(h){if(keep[h.textContent.trim()])return;var n=h.nextElementSibling;while(n&&!n.matches('h2.sec,.foot')){var next=n.nextElementSibling;n.remove();n=next;}h.remove();});
    doc.querySelectorAll('.rank-grid .mini').forEach(function(n){if(!selected.charts.has(n.querySelector('h4').textContent==='年排'?'year':'class'))n.remove();});
    if(!selected.records.has('overview'))doc.querySelector('.stats').remove();
    var tbody=doc.querySelector('.ov tbody');if(tbody)Array.from(tbody.children).reverse().forEach(function(n){tbody.appendChild(n);});
    var blocks=Array.from(doc.querySelectorAll('.exam-block'));if(blocks.length){var before=blocks[blocks.length-1].nextSibling;blocks.reverse().forEach(function(n,i){n.querySelector('.idx').textContent=i+1;before.parentNode.insertBefore(n,before);});}
    doc.querySelector('.foot').insertAdjacentHTML('beforebegin',analysisHtml(exams,selected.analysis));
    var style=doc.createElement('style');style.textContent=reportStyles;doc.head.appendChild(style);
    return '<!doctype html>'+doc.documentElement.outerHTML;
  }
  var reportStyles=':root{--text:#18212f;--muted:#667085;--accent:#5d72e8;--panel-solid:#fff;--line:#e8ebf0;--accent-soft:#eef1ff;--cell:#f6f7fa;--green:#32a77a;--danger:#d9534f;--chip-bg:#f4f6fa}body{margin:auto}.report-analysis h2{font-size:17px;break-after:avoid-page;page-break-after:avoid}.analysis-section-v38{margin:20px 0;border-top:1px solid #ddd;padding-top:12px}.report-analysis .card-title{font-size:15px}.report-analysis .card-sub,.report-analysis .dsb-fig-cap{font-size:10px;color:#667085}.report-analysis svg{max-width:100%;height:auto}.report-analysis table{table-layout:auto;font-size:9px}.report-analysis th,.report-analysis td{overflow-wrap:anywhere;padding:4px}.report-analysis .sv31-kpi,.report-analysis .dsb-summary-row{display:flex;flex-wrap:wrap;gap:12px}.report-analysis .sv31-stat,.report-analysis .dsb-summary-item{flex:1 1 28%;padding:10px;background:#f6f7fa}.report-analysis .v,.report-analysis .dsb-summary-value{font-size:20px;font-weight:700}.report-analysis details{margin:8px 0}.report-analysis .sv31-scroll,.report-analysis .dsb-scroll{overflow:visible}.report-analysis .sv31-heat{min-width:0!important;width:100%!important}.report-analysis .sv31-insight{display:flex;gap:9px;align-items:flex-start;border:1px solid #e6eaf1;border-left-width:3px;border-radius:10px;padding:8px 10px;background:#fff;margin:8px 0;break-inside:avoid;page-break-inside:avoid}.report-analysis .sv31-insight .ico{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex:none}.report-analysis .sv31-insight .ico svg{width:16px;height:16px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.report-analysis .sv31-insight>div:last-child{min-width:0;flex:1}.report-analysis .sv31-insight b{font-size:12px}.report-analysis .sv31-insight p{margin:3px 0 0;font-size:10.5px;line-height:1.65;color:#667085}.report-analysis .i-mile{border-left-color:#32a77a}.report-analysis .i-mile .ico{background:#e9f8f2;color:#2f9d76}.report-analysis .i-up{border-left-color:#5d72e8}.report-analysis .i-up .ico{background:#eef1ff;color:#5d72e8}.report-analysis .i-warn{border-left-color:#e59b45}.report-analysis .i-warn .ico{background:#fdf3e4;color:#a06a1c}.report-analysis .i-risk{border-left-color:#d95c5c}.report-analysis .i-risk .ico{background:#fceeee;color:#c54d4d}.report-analysis .i-info{border-left-color:#8b9af0}.report-analysis .i-info .ico{background:#eef1ff;color:#5b6bd5}.report-analysis .chart-wrap,.report-analysis .mx-wrap,.report-analysis .rank-grid,.report-analysis .dsb-fig,.report-analysis .dsb-grid2,.report-analysis .dsb-summary-row,.exam-block{break-inside:avoid;page-break-inside:avoid}.report-analysis .dsb-fig-title{font-weight:700;margin:10px 0}.report-analysis .worth-result{padding:12px;background:#f6f7fa}.report-analysis .sv31-evbody,.report-analysis .sv31-evib{white-space:pre-line;font-size:10px}.report-analysis .sv31-evi{display:none}.rank-grid{break-inside:avoid;page-break-inside:avoid}.foot{margin-top:6px;padding-top:5px;font-size:8px;break-before:avoid-page;page-break-before:avoid}svg,tr{break-inside:avoid}';
  reportStyles += '.report-analysis .sv31-insight{flex-wrap:wrap;width:100%;box-sizing:border-box;min-height:0}.report-analysis .sv31-insight>div:nth-child(2){min-width:0;flex:1 1 calc(100% - 38px)}.report-analysis .sv31-insight .sv31-evbody{display:block;flex:0 0 100%;width:100%;box-sizing:border-box;min-width:0;margin:5px 0 0;padding:7px 0 0 37px;border-top:1px solid #edf0f4;white-space:pre-line;overflow-wrap:anywhere;word-break:normal;line-height:1.55;color:#667085;font-size:10px}';
  var css=document.createElement('style');css.textContent=[
    '.fold-body-v38[hidden],[data-report-options][hidden],[data-exam-category][hidden]{display:none!important}',
    '.fold-toggle-v38{flex:none;width:32px;height:32px;border:1px solid var(--line,#e8ebf0);border-radius:10px;background:var(--panel-solid,#fff);color:var(--muted,#788392);padding:7px;cursor:pointer;margin-left:auto}.fold-toggle-v38 svg{width:16px;height:16px;display:block}.fold-toggle-v38[aria-expanded="true"] svg{transform:rotate(180deg)}.fold-toggle-v38:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}',
    '.filter-summary-v38{font-size:11px;color:var(--muted,#788392);margin-left:auto}.sv31-page>.page-head{gap:10px}.sv31-page>.page-head>.fold-toggle-v38{margin-left:0}',
    '.sv31-page>.card>.card-title-row,.dsb-head{display:flex;gap:8px;align-items:center}.sv31-page .card-title-row>div{min-width:0}.sv31-page .card-title-row:has(>.fold-toggle-v38[aria-expanded="false"]){margin-bottom:0}.sv31-page>.fold-body-v38{margin-bottom:12px}',
    '@media(max-width:620px){.sv31-page>.sv31-trend-card>.card-title-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:9px}.sv31-page>.sv31-trend-card>.card-title-row>div:first-child{grid-column:1;grid-row:1;min-width:0}.sv31-page>.sv31-trend-card>.card-title-row>.sv31-tag{grid-column:1;grid-row:2;justify-self:start;margin-top:1px}.sv31-page>.sv31-trend-card>.card-title-row>.sv31-tabs{grid-column:1 / -1;grid-row:3;width:100%;box-sizing:border-box;margin:2px 0 0}.sv31-page>.sv31-trend-card>.card-title-row>.sv31-tabs button{flex:1;min-width:0}.sv31-page>.sv31-trend-card>.card-title-row>.fold-toggle-v38{grid-column:2;grid-row:1;width:32px;height:32px;margin-left:0}}',
    '.explain-v38{margin:6px 0;font-size:12px;color:var(--muted,#788392)}.explain-v38 summary{cursor:pointer;width:fit-content}.explain-v38[open]{margin-bottom:10px}.explain-v38 p{line-height:1.7}',
    '.dense-v38{min-width:0;margin:5px 0}.dense-head-v38{display:flex;align-items:center;gap:8px;color:var(--muted,#788392);font-size:11px}.dense-head-v38 .fold-toggle-v38{width:28px;height:28px;padding:5px}.dense-head-v38:has([aria-expanded="true"])>span{visibility:hidden}.dense-v38 .chips{max-width:100%}',
    '.export-sheet-v38{width:min(620px,100%);box-sizing:border-box}.export-format-v38{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:16px 0}.export-format-v38 button{padding:10px 4px;border:1px solid var(--line,#e8ebf0);border-radius:10px;background:transparent;color:var(--text,#18212f);font-size:12px}.export-format-v38 [aria-pressed="true"]{background:var(--accent-soft,#eef1ff);border-color:var(--accent,#5d72e8);color:var(--accent,#5d72e8)}',
    '.export-group-v38{border:1px solid var(--line,#e8ebf0);border-radius:13px;margin:10px 0}.export-group-v38>summary{padding:13px;cursor:pointer;font-size:13px;font-weight:650}.export-group-v38>summary small{float:right;color:var(--muted,#788392);font-weight:400}.export-group-body-v38{padding:0 13px 13px}.export-select-v38{display:flex;gap:14px;justify-content:flex-end;margin-bottom:8px}.export-select-v38 button{border:0;background:transparent;color:var(--accent,#5d72e8);font-size:12px;padding:4px}.export-options-v38{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}',
    '.export-choice-v38{display:flex;gap:9px;align-items:center;padding:9px 0;min-width:0;font-size:12px;cursor:pointer}.export-choice-v38 span{overflow-wrap:anywhere;min-width:0}.export-choice-v38 input{width:16px;height:16px;flex:none;accent-color:var(--accent,#5d72e8)}.export-choice-v38 small{display:block;color:var(--muted,#788392);margin-top:3px}.export-exams-v38{max-height:220px;overflow:auto;overscroll-behavior:contain}.export-category-v38{display:flex;align-items:center;gap:10px;font-size:12px;margin-bottom:8px}.export-category-v38 select{min-width:0;max-width:75%;padding:6px 10px;border:1px solid var(--line,#e8ebf0);border-radius:8px;color:inherit;background:var(--panel-solid,#fff)}',
    '.export-hint-v38{font-size:11px;line-height:1.7;color:var(--muted,#788392);margin:10px 0}.export-bottom-v38{position:sticky;bottom:-18px;display:flex;gap:10px;align-items:center;justify-content:space-between;background:var(--panel-solid,#fff);padding:14px 0 max(14px,env(safe-area-inset-bottom));font-size:12px}.export-bottom-v38 button:disabled{opacity:.4;cursor:default}.export-head-v30 button{flex:none}',
    '@media(max-width:400px){.export-options-v38{grid-template-columns:1fr}.export-sheet-v38{padding:16px}.export-bottom-v38{bottom:-16px}.sv31-page .sv31-tag{white-space:normal}}'
  ].join('\n');document.head.appendChild(css);
  document.addEventListener('click',function(e){if(e.target.closest('#exportDataV30,[data-custom-export-v38]')){e.preventDefault();e.stopImmediatePropagation();openExport();}},true);
  function boot(){new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});schedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  if(window.__v30)window.__v30.openSheet=openExport;
  window.__v38={enhance:enhance,openExport:openExport,buildReport:buildReport,analysisHtml:analysisHtml,newest:newest};
})();

