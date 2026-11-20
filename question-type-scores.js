/* Optional per-subject raw-score breakdowns, never counted again in exam totals. */
(function () {
  'use strict';
  var model = window.ScoreQuestionTypeModel;
  var presets = {
    '英语': ['听力', '阅读理解', '七选五', '完形填空', '语法填空', '短文改错', '应用文', '读后续写', '作文'],
    '语文': ['现代文阅读', '文言文阅读', '古诗词鉴赏', '名篇名句默写', '语言文字运用', '作文'],
    '数学': ['单项选择题', '多项选择题', '填空题', '解答题'],
    '物理': ['单项选择题', '多项选择题', '实验题', '计算题'],
    '化学': ['选择题', '实验题', '原理综合题', '有机推断题'],
    '生物': ['选择题', '非选择题'], '政治': ['选择题', '材料分析题'], '历史': ['选择题', '材料分析题', '论述题'], '地理': ['选择题', '综合题']
  };
  function esc(v) { return escapeHtml(String(v == null ? '' : v)); }
  function fmt(v) { return v == null ? '—' : String(v); }
  function cardName(card) { return card.querySelector('.exam-subject-name-v10').value.trim(); }
  function value(card, selector) { var input = card.querySelector(selector); return model.number(input ? input.value : null); }
  function rawScore(card) { var raw = value(card, '.raw-v16'); return raw === null && value(card, '.rawmax-v16') === value(card, '.max-v16') ? value(card, '.actual-v16') : raw; }
  function track(event, metadata) { if (window.__scoreTrackerTrack) window.__scoreTrackerTrack(event, metadata, 'record'); }
  function metadata(r, i, subject) {
    var prefix = esc(subject) + '题型' + (i + 1);
    function select(field, title, options) { return '<label><span>' + title + '</span><select data-qt-field="' + field + '" aria-label="' + prefix + title + '"><option value="">未标注</option>' + Object.keys(options).map(function (k) { return '<option value="' + k + '"' + (r[field] === k ? ' selected' : '') + '>' + options[k] + '</option>'; }).join('') + '</select></label>'; }
    return '<details class="qt-meta"' + (r.position || r.difficulty || r.cause ? ' open' : '') + '><summary>位置、难度与原因 <small>选填</small></summary><div><label><span>题号 / 位置</span><input data-qt-field="position" maxlength="24" value="' + esc(r.position) + '" aria-label="' + prefix + '题号位置" placeholder="如：第 21 题 / 阅读 A"></label>' + select('difficulty','难度',model.difficulties) + select('cause','主要失分原因',model.causes) + '</div><p class="qt-help">按本题实际情况填写；难度不确定可以留空，得分低不一定代表题目难。</p></details>';
  }
  function mount(modal, card) {
    if (card.querySelector('.qt-editor')) return;
    var name = cardName(card); if (!name) return;
    var draft = modal._questionTypeDraft;
    if (!Object.prototype.hasOwnProperty.call(draft, name)) draft[name] = [];
    var box = document.createElement('details'); box.className = 'qt-editor'; box.open = draft[name].length > 0;
    box.innerHTML = '<summary><span>题型得分 <small>选填</small></span><span class="qt-summary"></span></summary><div class="qt-body"><p class="qt-help">按卷面原始分记录，可只填部分题型。可填题型合计，或用题号区分同一题型的小题；同一部分不要重复录入。</p><div class="qt-rows"></div><div class="qt-toolbar"><label><span class="qt-sr">添加常用题型</span><select class="qt-preset" aria-label="' + esc(name) + '添加常用题型"><option value="">＋ 常用题型</option>' + (presets[name] || ['选择题','填空题','解答题']).map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></label><button type="button" class="qt-add">＋ 自定义题型</button></div><div class="qt-status" aria-live="polite"></div><button type="button" class="qt-use" hidden>用合计填入原始分</button></div>';
    card.appendChild(box);
    var rows = box.querySelector('.qt-rows'), status = box.querySelector('.qt-status');
    function update() {
      box.querySelector('.qt-summary').textContent = draft[name].length ? draft[name].length + ' 项' : '展开录入';
      var use = box.querySelector('.qt-use'); use.hidden = true; status.classList.remove('qt-error');
      try {
        var clean = model.clean(draft[name]), sum = model.sum(clean), max = value(card,'.rawmax-v16');
        model.validate(clean, max, null);
        use.hidden = !(sum.complete && max !== null && Math.abs(sum.max - max) < 0.000001);
        status.textContent = clean.length ? '已录得分 ' + sum.score + ' 分 · ' + sum.scored + '/' + clean.length + ' 项已填得分' + (sum.complete && sum.max === max ? ' · 已覆盖卷面满分' : ' · 仅统计已录题型') : '可从常用题型开始，也可以直接添加自己的题型。';
        var raw = rawScore(card);
        if (raw !== null && sum.score > raw) { status.textContent += '。合计超过当前原始分，请核对。'; status.classList.add('qt-error'); }
        else if (sum.complete && sum.max === max && raw !== null && sum.score !== raw) status.textContent += '。与当前原始分相差 ' + Math.round((sum.score - raw)*100)/100 + ' 分，请核对。';
      } catch (e) { status.textContent = e.message; status.classList.add('qt-error'); }
    }
    function draw() {
      rows.innerHTML = draft[name].map(function (r,i) { return '<div class="qt-row"><label class="qt-name"><span>题型</span><input data-qt-field="name" maxlength="40" value="' + esc(r.name) + '" aria-label="' + esc(name) + '题型' + (i+1) + '名称" placeholder="如：完形填空"></label><label><span>得分</span><input data-qt-field="score" type="number" min="0" max="99999" step="0.01" inputmode="decimal" value="' + esc(r.score) + '" aria-label="' + esc(name) + '题型' + (i+1) + '得分" placeholder="待补"></label><label><span>满分</span><input data-qt-field="max" type="number" min="0.01" max="99999" step="0.01" inputmode="decimal" value="' + esc(r.max) + '" aria-label="' + esc(name) + '题型' + (i+1) + '满分" placeholder="待补"></label><button type="button" class="qt-remove" aria-label="删除题型' + (i+1) + '">×</button>' + metadata(r,i,name) + '</div>'; }).join('');
      rows.querySelectorAll('.qt-row').forEach(function (row,i) {
        row.querySelectorAll('input,select').forEach(function (input) { input.oninput = input.onchange = function () { draft[name][i][input.dataset.qtField] = input.validity.badInput ? 'invalid' : input.value; update(); }; });
        row.querySelector('button').onclick = function () { draft[name].splice(i,1); draw(); };
      }); update();
    }
    function add(label) {
      if (draft[name].length >= 30) return toast('每科最多记录 30 个题型');
      if (label && draft[name].some(function (r) { return r.name.trim() === label; })) return toast('这个题型已添加');
      draft[name].push({name:label,score:null,max:null}); draw();
      var added = rows.lastElementChild; added.querySelector(label ? '[data-qt-field="score"]' : 'input').focus();
    }
    box.querySelector('.qt-add').onclick = function () { add(''); };
    box.querySelector('.qt-preset').onchange = function () { var label = this.value; this.value = ''; if (label) add(label); };
    box.querySelector('.qt-use').onclick = function () {
      try {
        var sum = model.validate(model.clean(draft[name]),value(card,'.rawmax-v16'),null);
        if (!sum.complete || Math.abs(sum.max - value(card,'.rawmax-v16')) > 0.000001) return;
        var input = card.querySelector('.raw-v16'); input.value = sum.score; input.dispatchEvent(new Event('input',{bubbles:true}));
        if (value(card,'.max-v16') === sum.max && value(card,'.actual-v16') === null) { var final = card.querySelector('.actual-v16'); final.value = sum.score; final.dispatchEvent(new Event('input',{bubbles:true})); }
        update();
      } catch (e) { toast(e.message); }
    };
    card.addEventListener('input',function (e) { if (!box.contains(e.target)) update(); });
    box._refresh = draw; draw();
  }
  function decorate(modal) { modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) { mount(modal,card); }); }
  var beforeOpen = openExam;
  openExam = function (exam) {
    var result = beforeOpen.apply(this,arguments), modal = state.modal;
    if (!modal || !modal.querySelector('#examSubjectsV16') || modal._questionTypeDraft) return result;
    modal._questionTypeDraft = Object.assign(Object.create(null), JSON.parse(JSON.stringify(exam && exam.question_type_scores || {})));
    modal._questionTypeExam = String(exam && exam.id || ''); modal._questionTypeOwner = state.token;
    decorate(modal);
    var observer = new MutationObserver(function () { if (!modal.isConnected) { observer.disconnect(); return; } decorate(modal); });
    observer.observe(modal.querySelector('#examSubjectsV16'),{childList:true,subtree:true});
    return result;
  };
  var beforeApi = dataApiV7;
  dataApiV7 = function (action,payload) {
    var modal = state.modal;
    if (action === 'save_exam' && payload && payload.exam && modal && modal._questionTypeDraft && modal._questionTypeExam === String(payload.exam.id || '')) {
      if (modal._questionTypeOwner !== state.token) throw new Error('账号已切换，请重新打开考试');
      var map = Object.create(null), count = 0;
      modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
        var name = cardName(card);
        try {
          var rows = model.clean(modal._questionTypeDraft[name] || [],name);
          model.validate(rows,value(card,'.rawmax-v16'),rawScore(card));
          if (rows.length) { map[name] = rows; count += rows.length; }
        } catch (e) { var box = card.querySelector('.qt-editor'); box.open = true; box.querySelector('.qt-status').textContent = e.message; box.querySelector('.qt-status').classList.add('qt-error'); box.scrollIntoView({block:'center'}); throw e; }
      });
      payload = Object.assign({},payload,{exam:Object.assign({},payload.exam,{question_type_scores:map})});
      return Promise.resolve(beforeApi.call(this,action,payload)).then(function (r) { if (count) track('question_type_scores_saved',{subject_count:Object.keys(map).length,type_count:count}); return r; });
    }
    return beforeApi.call(this,action,payload);
  };
  function apply(modal, card, rows) {
    if (!modal._questionTypeDraft || modal._questionTypeOwner !== state.token) throw new Error('请重新打开考试录入表');
    var name = cardName(card), incoming = model.clean(rows,name), current = JSON.parse(JSON.stringify(modal._questionTypeDraft[name] || []));
    // Recognition fills missing cells only; existing manual marks always win.
    incoming.forEach(function (r) { var found = current.find(function (x) { return model.key(x) === model.key(r); }); if (!found) current.push(r); else ['score','max','position','difficulty','cause'].forEach(function (key) { if (found[key] == null || found[key] === '') if (r[key] != null) found[key] = r[key]; }); });
    if (current.length > 30) throw new Error('合并后题型超过 30 项，请分批核对');
    modal._questionTypeDraft[name] = current; mount(modal,card); var box = card.querySelector('.qt-editor'); box.open = true; box._refresh();
    return incoming.length;
  }
  function text(exam, subject) { return ((exam.question_type_scores || {})[subject] || []).map(function (r) { return model.label(r) + ' ' + fmt(r.score) + '/' + fmt(r.max) + (r.difficulty ? '（' + model.difficulties[r.difficulty] + '）' : '') + (r.cause ? ' · ' + model.causes[r.cause] : ''); }).join('；'); }
  function detail(exam) {
    var map = exam.question_type_scores || {}, names = Object.keys(exam.scores || {}).filter(function (name) { return Array.isArray(map[name]) && map[name].length; });
    if (!names.length) return '';
    return '<div class="qt-detail"><h3>题型得分</h3><p class="qt-help">卷面原始分 · 只统计已录入的题型</p><div class="qt-detail-grid">' + names.map(function (name) { return '<article><h4>' + esc(name) + '</h4>' + map[name].map(function (r) { var rate = r.score != null && r.max > 0 ? Math.round(r.score/r.max*1000)/10 : null; return '<div class="qt-detail-row"><span>' + esc(model.label(r)) + (r.difficulty ? '<small class="qt-difficulty">' + model.difficulties[r.difficulty] + '</small>' : '') + '</span><b>' + esc(fmt(r.score)) + ' <small>/ ' + esc(fmt(r.max)) + '</small></b><small>' + (rate == null ? '待补全' : rate + '%') + '</small></div>'; }).join('') + '</article>'; }).join('') + '</div></div>';
  }
  window.ScoreQuestionTypes = { apply:apply, detail:detail, text:text };
  var style = document.createElement('style');
  style.textContent = '.qt-editor{border-top:1px solid var(--line);margin-top:16px;padding-top:4px}.qt-editor summary{display:flex;justify-content:space-between;gap:12px;cursor:pointer;padding:13px 0;font-size:14px;list-style:none}.qt-editor summary::-webkit-details-marker{display:none}.qt-editor summary small,.qt-summary{color:var(--muted);font-size:12px;font-weight:400}.qt-editor summary small{margin-left:6px}.qt-editor summary:after{content:"＋";color:var(--muted)}.qt-editor[open]>summary:after{content:"−"}.qt-summary{margin-left:auto}.qt-help{font-size:13px!important;color:var(--muted);line-height:1.7;margin:0 0 14px}.qt-rows{display:grid;gap:12px}.qt-row{display:grid;grid-template-columns:minmax(100px,1.5fr) minmax(65px,1fr) minmax(65px,1fr) 32px;gap:9px;align-items:end}.qt-row label{min-width:0;display:grid;gap:5px;font-size:12px;color:var(--muted)}.qt-row input,.qt-toolbar select{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--line);border-radius:9px;background:var(--input-bg,var(--panel-solid,#fff));color:var(--text);font:inherit;font-size:14px;min-height:42px;padding:9px}.qt-row button,.qt-toolbar button,.qt-use{font:inherit;font-size:13px;min-height:40px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text);padding:8px 10px;cursor:pointer}.qt-row .qt-remove{padding:0;color:var(--muted);font-size:20px}.qt-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.qt-toolbar label{flex:1;min-width:130px}.qt-toolbar button{flex:1;white-space:nowrap}.qt-status{font-size:12px;line-height:1.7;color:var(--muted);margin-top:13px}.qt-error{color:var(--danger)!important}.qt-use{margin-top:10px;color:var(--accent)}.qt-use[hidden]{display:none!important}.qt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.qt-editor :focus-visible{outline:2px solid var(--accent);outline-offset:2px}.qt-detail{margin-top:26px;padding-top:22px;border-top:1px solid var(--line)}.qt-detail h3{font-size:18px;margin:0 0 8px}.qt-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.qt-detail h4{font-size:15px;margin:0 0 6px}.qt-detail-row{display:grid;grid-template-columns:minmax(0,1fr) auto 64px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);font-size:14px;font-variant-numeric:tabular-nums}.qt-detail-row>span{overflow-wrap:anywhere}.qt-detail-row b{font-weight:600}.qt-detail-row small{font-size:12px;color:var(--muted)}.qt-detail-row>small{text-align:right}@media(max-width:620px){.qt-detail-grid{grid-template-columns:1fr}.qt-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 36px;gap:9px}.qt-row .qt-name{grid-column:1/3}.qt-row .qt-remove{grid-column:3;grid-row:1/3;align-self:center}.qt-row{padding-bottom:14px;border-bottom:1px solid var(--line)}.qt-row label:nth-child(2){grid-column:1;grid-row:2}.qt-row label:nth-child(3){grid-column:2;grid-row:2}.qt-row input{font-size:16px}}';
  style.textContent += '.qt-row select{width:100%;min-width:0;box-sizing:border-box;min-height:42px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--input-bg,var(--panel-solid,#fff));color:var(--text);font:inherit;font-size:13px}.qt-row .qt-meta{grid-column:1/-1}.qt-meta>summary{padding:4px 0 10px;font-size:12px;color:var(--muted);justify-content:flex-start}.qt-meta>summary:after{margin-left:auto;content:"＋"}.qt-meta[open]>summary:after{content:"−"}.qt-meta>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.qt-meta .qt-help{margin:8px 0 0;font-size:12px!important}.qt-difficulty{display:block;margin-top:3px}@media(max-width:620px){.qt-meta>div{grid-template-columns:repeat(2,minmax(0,1fr))}.qt-meta>div>label:first-child{grid-column:1/-1}.qt-row .qt-meta label{grid-column:auto;grid-row:auto}.qt-row select{font-size:16px}}';
  document.head.appendChild(style);
})();
