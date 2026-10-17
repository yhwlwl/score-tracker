(function () {
  'use strict';
  var owner = '', values = {};
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  function account() { return String(state.user && state.user.id || state.token || ''); }
  function defaults() { if (owner !== account()) { owner = account(); values = {}; } return values; }
  function receive(data, token) {
    if (token !== state.token || !data || !data.participantDefaults) return;
    owner = String(data.user && data.user.id || account()); values = data.participantDefaults;
  }
  function number(v) { var s = String(v == null ? '' : v).trim(), n = Number(s); return s && Number.isInteger(n) && n > 0 && n <= 10000000 ? n : null; }
  function value(key, scope) { var row = defaults()[key]; return row && number(row[scope]); }
  function fields(modal) {
    var out = [];
    function add(input, key, scope) { if (input) out.push({input:input,key:key,scope:scope}); }
    add(modal.querySelector('#totalParticipantsV16'), 'total', 'year');
    add(modal.querySelector('#totalClassParticipantsV16'), 'total', 'class');
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
      var name = card.querySelector('.exam-subject-name-v10'); if (!name || !name.value.trim()) return;
      add(card.querySelector('.year-participants-v16'), 's:' + name.value.trim(), 'year');
      add(card.querySelector('.class-participants-v16'), 's:' + name.value.trim(), 'class');
    });
    modal.querySelectorAll('.combo-card-v21').forEach(function (card) {
      add(card.querySelector('.combo-yp-v25'), 'm:' + card.dataset.comboId, 'year');
      add(card.querySelector('.combo-cp-v25'), 'm:' + card.dataset.comboId, 'class');
    });
    return out;
  }
  var apiBefore = dataApiV7;
  dataApiV7 = async function (action, payload) {
    var token = state.token;
    if (action === 'save_exam' && payload && payload.exam && !payload.exam.id && state.modal && state.modal._participantDraft) {
      payload = Object.assign({}, payload, {participantDefaults:state.modal._participantDraft});
    }
    var data = await apiBefore.call(this, action, payload);
    receive(data, token);
    if (token === state.token && data && data.participantDefaultsWarning) setTimeout(function () { toast(data.participantDefaultsWarning); }, 100);
    return data;
  };
  var openBefore = openExam;
  openExam = function (exam) {
    var result = openBefore.apply(this, arguments), modal = state.modal;
    // Saved exams and restored drafts retain their own values, including intentional blanks.
    if (!modal || exam || modal.dataset.participantDefaults) return result;
    modal.dataset.participantDefaults = '1'; modal._participantDraft = {};
    var touched = new WeakSet(), initialOwner = account();
    [['.pt-year-v25','year'],['.pt-class-v25','class']].forEach(function (pair) {
      var input = modal.querySelector(pair[0]), n = value('total', pair[1]);
      if (input && n) input.value = String(n);
    });
    function fill() {
      if (!modal.isConnected || initialOwner !== account()) return;
      fields(modal).forEach(function (field) {
        var input = field.input;
        if (touched.has(input)) return;
        var n = value(field.key, field.scope);
        if (n) {
          if (!input.value || input.dataset.autoV25 === '1') {
            input.value = String(n); input.dataset.userSetV25 = '1'; delete input.dataset.autoV25;
          }
        } else if (!input.value || input.dataset.autoV25 === '1') {
          var total = modal.querySelector(field.scope === 'year' ? '.pt-year-v25' : '.pt-class-v25');
          if (total && number(total.value)) { input.value = total.value; input.dataset.autoV25 = '1'; }
        }
      });
    }
    modal.addEventListener('input', function (event) {
      var input = event.target;
      var field = fields(modal).find(function (f) { return f.input === input; });
      if (!field && input.matches('.pt-year-v25,.pt-class-v25')) field = {key:'total',scope:input.matches('.pt-year-v25')?'year':'class'};
      if (field) {
        touched.add(input);
        var n = number(input.value);
        if (n) { var row = modal._participantDraft[field.key] || {}; row[field.scope] = n; modal._participantDraft[field.key] = row; }
        else if (modal._participantDraft[field.key]) delete modal._participantDraft[field.key][field.scope];
      }
      if (input.matches('.exam-subject-name-v10')) fill();
    });
    var observer = new MutationObserver(fill); observer.observe(modal, {childList:true,subtree:true});
    var detach = new MutationObserver(function () { if (!modal.isConnected) { observer.disconnect(); detach.disconnect(); } });
    detach.observe(modal.parentNode, {childList:true}); fill();
    return result;
  };
  function settings() {
    if (state.page !== 'account') return;
    var host = document.querySelector('.subject-settings-v7'); if (!host || host.querySelector('.participant-settings')) return;
    var items = [{key:'total',name:'整场考试'}];
    (state.subjectConfigs || []).forEach(function (s) { items.push({key:'s:'+s.name,name:s.name}); });
    (state.modulesV18 || []).forEach(function (m) { items.push({key:'m:'+m.id,name:m.name}); });
    var box = document.createElement('details'); box.className = 'participant-settings';
    box.innerHTML = '<summary>默认参考人数</summary><p class="card-sub">新考试自动带入；本场临时修改不影响默认值。科目和组合留空时沿用整场人数。</p>' +
      '<div class="participant-head"><span>科目 / 组合</span><span>年级人数</span><span>班级人数</span></div>' + items.map(function (item) {
        var row = defaults()[item.key] || {};
        return '<div class="participant-row" data-participant-key="'+esc(item.key)+'"><span>'+esc(item.name)+'</span>' + ['year','class'].map(function (scope) {
          return '<input type="number" min="1" max="10000000" step="1" inputmode="numeric" data-participant-scope="'+scope+'" aria-label="'+esc(item.name)+(scope==='year'?'年级人数':'班级人数')+'" placeholder="'+(item.key==='total'?'选填':'沿用总人数')+'" value="'+esc(row[scope])+'">';
        }).join('')+'</div>';
      }).join('') + '<div class="participant-actions"><span role="status"></span><button type="button" class="secondary">保存人数</button></div>';
    host.appendChild(box);
    var initialOwner = account(), snapshot = JSON.parse(JSON.stringify(defaults()));
    box.querySelector('button').onclick = async function () {
      if (initialOwner !== account()) return;
      var patch = {}, invalid = false, button = this, status = box.querySelector('[role="status"]');
      box.querySelectorAll('[data-participant-key]').forEach(function (row) {
        var key = row.dataset.participantKey;
        row.querySelectorAll('input').forEach(function (input) {
          var raw = input.value.trim(), n = number(raw), scope = input.dataset.participantScope;
          if (raw && n === null) { invalid = true; input.setAttribute('aria-invalid','true'); }
          else input.removeAttribute('aria-invalid');
          var old = snapshot[key] && snapshot[key][scope];
          if (n !== (old == null ? null : old)) { patch[key] = patch[key] || {}; patch[key][scope] = n; }
        });
      });
      if (invalid) { status.textContent = '人数请输入正整数，或留空'; return; }
      if (!Object.keys(patch).length) { status.textContent = '已保存'; return; }
      button.disabled = true; status.textContent = '保存中…';
      try {
        await dataApiV7('save_participant_defaults', {defaults:patch});
        if (initialOwner === account() && box.isConnected) { snapshot = JSON.parse(JSON.stringify(defaults())); status.textContent = '已保存'; }
      } catch (e) { if (initialOwner === account() && box.isConnected) status.textContent = e.message || '保存失败，请重试'; }
      finally { button.disabled = false; }
    };
  }
  var bindBefore = bindPage;
  bindPage = function () { var result = bindBefore.apply(this, arguments); settings(); return result; };
  var style = document.createElement('style');
  style.textContent = '.participant-settings{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.participant-settings summary{cursor:pointer;font-size:13px;font-weight:700}.participant-settings .card-sub{margin:10px 0}.participant-head,.participant-row{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:center}.participant-head{font-size:10px;color:var(--muted);padding:8px 0}.participant-row{padding:7px 0;border-top:1px solid var(--line);font-size:12px}.participant-row>span{overflow-wrap:anywhere}.participant-row input{width:100%;min-width:0;box-sizing:border-box;padding:9px 7px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text);font:inherit}.participant-row input[aria-invalid=true]{border-color:var(--danger,#d44)}.participant-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.participant-actions span{font-size:12px;color:var(--muted)}';
  document.head.appendChild(style);
})();
