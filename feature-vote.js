/* feature-vote.js · v6.2 dynamic feature-priority voting */
(function () {
  'use strict';
  if (window.__featureVoteV36) return;
  window.__featureVoteV36 = 1;

  var DATA_API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-data-api';
  var activeUserKey = '';
  var overviewCache = null;
  var overviewPromise = null;
  var autoDismissed = false;
  var openTimer = null;
  var accountViewTrackedFor = '';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function track(eventType, metadata) {
    try {
      if (typeof window.__stTrack === 'function') window.__stTrack(eventType, metadata || {});
    } catch (e) {}
  }
  function userKey() {
    try {
      if (!state || !state.user || !state.token) return '';
      return String(state.user.id || state.user.username || '');
    } catch (e) {
      return '';
    }
  }
  function syncUserState() {
    var key = userKey();
    if (!key) {
      activeUserKey = '';
      overviewCache = null;
      overviewPromise = null;
      autoDismissed = false;
      accountViewTrackedFor = '';
      return '';
    }
    if (key !== activeUserKey) {
      activeUserKey = key;
      overviewCache = null;
      overviewPromise = null;
      autoDismissed = false;
      accountViewTrackedFor = '';
    }
    return key;
  }
  async function voteApi(action, payload) {
    var response = await fetch(DATA_API, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({
        action: action,
        token: (typeof state !== 'undefined' && state.token) || localStorage.getItem('st_token') || ''
      }, payload || {}))
    });
    var data = await response.json().catch(function () { return {error:'网络响应异常'}; });
    if (!response.ok) {
      var err = new Error(data.error || '请求失败');
      err.status = response.status;
      throw err;
    }
    return data;
  }
  function invalidateOverview() {
    overviewCache = null;
    overviewPromise = null;
  }
  function loadOverview(force) {
    if (!syncUserState()) return Promise.reject(new Error('未登录'));
    if (!force && overviewCache) return Promise.resolve(overviewCache);
    if (!force && overviewPromise) return overviewPromise;
    overviewPromise = voteApi('feature_vote_overview').then(function (data) {
      overviewCache = data || {};
      return overviewCache;
    }).finally(function () {
      overviewPromise = null;
    });
    return overviewPromise;
  }

  function injectStyle() {
    if (document.getElementById('feature-vote-v36-style')) return;
    var style = document.createElement('style');
    style.id = 'feature-vote-v36-style';
    style.textContent = [
      '.fv36-back{position:fixed;inset:0;z-index:170;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.42);backdrop-filter:blur(9px)}',
      '.fv36-modal{width:min(540px,100%);max-height:min(780px,90vh);overflow:auto;border:1px solid var(--line,#e7eaf0);border-radius:24px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 30px 90px rgba(17,24,39,.26)}',
      '.fv36-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:21px 22px 13px}',
      '.fv36-kicker{font-size:11px;font-weight:750;letter-spacing:.08em;color:var(--accent,#5d72e8);margin-bottom:7px}',
      '.fv36-head h2{font-size:21px;line-height:1.28;letter-spacing:-.25px;margin:0}',
      '.fv36-sub{margin:7px 0 0;color:var(--muted,#7a8494);font-size:12px;line-height:1.6}',
      '.fv36-close{flex:0 0 auto;width:34px;height:34px;border:0;border-radius:11px;background:var(--cell,#f3f5f8);color:var(--muted,#6f7988);font-size:20px;line-height:1;cursor:pointer}',
      '.fv36-body{padding:7px 22px 22px}.fv36-options{display:grid;gap:9px}',
      '.fv36-option{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 14px;border:1px solid var(--line,#e3e7ee);border-radius:15px;background:var(--panel-solid,#fff);color:var(--text,#18212f);cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease}',
      '.fv36-option:active{transform:scale(.995)}.fv36-option.selected{border-color:var(--accent,#5d72e8);background:var(--accent-soft,#eef1ff)}',
      '.fv36-option.voted{cursor:default;background:var(--cell,#f7f8fb);opacity:.76}.fv36-option.voted:active{transform:none}',
      '.fv36-check{width:20px;height:20px;flex:0 0 auto;border-radius:7px;border:1.5px solid #cbd2de;display:grid;place-items:center;font-size:13px;font-weight:800;color:transparent;background:var(--panel-solid,#fff)}',
      '.fv36-option.selected .fv36-check{border-color:var(--accent,#5d72e8);background:var(--accent,#5d72e8);color:#fff}.fv36-option.voted .fv36-check{border-color:var(--green,#32a77a);background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}',
      '.fv36-option-main{min-width:0;flex:1}.fv36-label{display:block;font-size:13.5px;font-weight:680;line-height:1.48}.fv36-count{display:block;margin-top:3px;font-size:10.5px;color:var(--muted,#7b8696)}',
      '.fv36-state{font-size:10.5px;color:var(--green,#32a77a);font-weight:750;white-space:nowrap}',
      '.fv36-other{margin-top:17px;padding-top:16px;border-top:1px solid var(--line,#e7eaf0)}.fv36-other label{display:block;font-size:12px;font-weight:720;margin-bottom:8px}',
      '.fv36-other input{width:100%;border:1px solid var(--line,#e1e5ec);border-radius:13px;background:var(--panel-solid,#fff);color:var(--text,#18212f);padding:11px 12px;outline:none;font:inherit;font-size:13px}',
      '.fv36-actions{display:flex;justify-content:flex-end;margin-top:16px}.fv36-submit{border:0;border-radius:12px;background:var(--text,#18212f);color:#fff;padding:11px 18px;font-weight:720;cursor:pointer}.fv36-submit:disabled{opacity:.5;cursor:not-allowed}',
      '.fv36-error{min-height:17px;margin-top:9px;color:var(--danger,#d9534f);font-size:11.5px;line-height:1.45}',
      '.fv36-account{grid-column:1/-1;padding:20px}.fv36-account-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.fv36-account-head h3{margin:0}.fv36-account-head p{margin:5px 0 0}',
      '.fv36-account-metrics{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.fv36-metric{border:1px solid var(--line,#e5e9ef);background:var(--cell,#f8f9fb);border-radius:12px;padding:9px 11px;min-width:94px}.fv36-metric b{display:block;font-size:18px}.fv36-metric span{font-size:10.5px;color:var(--muted,#7a8494)}',
      '.fv36-account-list{display:grid;gap:8px;margin-top:14px}.fv36-account-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line,#e5e9ef);border-radius:13px;padding:10px 12px}.fv36-account-row-main{min-width:0;flex:1}.fv36-account-row b{display:block;font-size:12.5px;line-height:1.45}.fv36-account-row small{color:var(--muted,#7a8494);font-size:10.5px}',
      '.fv36-badge{border-radius:999px;padding:4px 8px;font-size:10px;font-weight:750;background:var(--cell,#f4f6f8);color:var(--muted,#6f7a89);white-space:nowrap}.fv36-badge.mine{background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}',
      '.fv36-suggestions{margin-top:14px;border-top:1px solid var(--line,#e7eaf0);padding-top:12px}.fv36-suggestions-title{font-size:11px;font-weight:750;margin-bottom:7px}.fv36-suggestion{font-size:11px;color:var(--muted,#748091);line-height:1.55;margin-top:4px}',
      '@media(max-width:620px){.fv36-back{padding:12px}.fv36-modal{border-radius:21px}.fv36-head{padding:19px 17px 12px}.fv36-body{padding:6px 17px 18px}.fv36-head h2{font-size:19px}.fv36-option{padding:12px 13px}.fv36-account{padding:16px}.fv36-account-head{align-items:center}}'
    ].join('');
    document.head.appendChild(style);
  }

  function hasBlockingModal() {
    try { if (state && state.onboarding) return true; } catch (e) {}
    return !!document.querySelector('.modal.onboard,.modal-backdrop .onboard');
  }
  function queueAutoCheck(delay) {
    clearTimeout(openTimer);
    openTimer = setTimeout(checkAndAutoOpen, delay == null ? 160 : delay);
  }
  async function checkAndAutoOpen() {
    if (!syncUserState() || autoDismissed) return;
    if (hasBlockingModal()) {
      queueAutoCheck(320);
      return;
    }
    try {
      var data = await loadOverview(false);
      if (Number(data.availableCount || 0) > 0) openVoteModal('auto', data);
    } catch (e) {}
  }

  function optionHtml(item) {
    var voted = !!item.votedByMe;
    return '<button class="fv36-option ' + (voted ? 'voted' : '') + '" type="button" data-feature-id="' + esc(item.id) + '" data-feature-key="' + esc(item.key || '') + '" ' + (voted ? 'disabled aria-pressed="true"' : 'aria-pressed="false"') + '>' +
      '<span class="fv36-check">✓</span>' +
      '<span class="fv36-option-main"><span class="fv36-label">' + esc(item.label) + '</span><span class="fv36-count">' + Number(item.votes || 0) + ' 人已投</span></span>' +
      (voted ? '<span class="fv36-state">已投</span>' : '') +
    '</button>';
  }

  async function openVoteModal(source, prefetched) {
    if (!syncUserState() || document.getElementById('featureVoteV36')) return;
    injectStyle();
    var data;
    try { data = prefetched || await loadOverview(false); }
    catch (e) {
      try { if (typeof toast === 'function') toast(e.message || '投票暂时无法打开'); } catch (_) {}
      return;
    }
    var options = Array.isArray(data.options) ? data.options : [];
    var back = document.createElement('div');
    back.id = 'featureVoteV36';
    back.className = 'fv36-back';
    back.dataset.source = source || 'manual';
    back.innerHTML =
      '<div class="fv36-modal" role="dialog" aria-modal="true" aria-labelledby="fv36Title">' +
        '<div class="fv36-head"><div><div class="fv36-kicker">功能投票</div><h2 id="fv36Title">下一步，你更希望先做什么？</h2><p class="fv36-sub">每个功能每个账号只能投 1 票；以后新增选项还可以继续投</p></div><button class="fv36-close" type="button" aria-label="关闭">×</button></div>' +
        '<div class="fv36-body"><div class="fv36-options">' + options.map(optionHtml).join('') + '</div>' +
        '<div class="fv36-other"><label for="fv36Other">新增需求</label><input id="fv36Other" maxlength="300" placeholder="写下你希望增加的功能"></div>' +
        '<div class="fv36-error" id="fv36Error"></div><div class="fv36-actions"><button class="fv36-submit" id="fv36Submit" type="button">提交投票</button></div></div>' +
      '</div>';
    document.body.appendChild(back);
    track('feature_vote_modal_open', {source: source || 'manual', available_count: Number(data.availableCount || 0), total_voters: Number(data.totalVoters || 0)});

    var close = function () {
      if ((source || '') === 'auto') autoDismissed = true;
      back.remove();
    };
    back.querySelector('.fv36-close').onclick = close;
    back.addEventListener('click', function (event) { if (event.target === back) close(); });
    back.querySelectorAll('[data-feature-id]:not(.voted)').forEach(function (button) {
      button.onclick = function () {
        var selected = button.classList.toggle('selected');
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        track('feature_vote_option_click', {
          option_id: button.dataset.featureId,
          option_key: button.dataset.featureKey || '',
          selected: selected,
          source: source || 'manual'
        });
        var err = back.querySelector('#fv36Error');
        if (err) err.textContent = '';
      };
    });
    back.querySelector('#fv36Submit').onclick = function () { submitVote(back); };
  }

  async function submitVote(back) {
    var source = back.dataset.source || 'manual';
    var ids = Array.prototype.slice.call(back.querySelectorAll('[data-feature-id].selected')).map(function (button) {
      return button.dataset.featureId;
    });
    var custom = String(back.querySelector('#fv36Other').value || '').trim();
    var err = back.querySelector('#fv36Error');
    var button = back.querySelector('#fv36Submit');
    if (!ids.length && !custom) {
      err.textContent = '请选择至少一项，或填写一个新增需求';
      return;
    }
    track('feature_vote_submit_click', {source:source, option_count:ids.length, has_custom:!!custom});
    button.disabled = true;
    button.textContent = '提交中…';
    err.textContent = '';
    try {
      var result = await voteApi('feature_vote_submit', {optionIds:ids, customRequest:custom});
      overviewCache = result.overview || null;
      autoDismissed = true;
      track('feature_vote_submit_success', {source:source, option_count:Number(result.addedVotes || 0), has_custom:!!custom});
      back.remove();
      hydrateAccountCard(true);
      try { if (typeof toast === 'function') toast('投票已提交'); } catch (e) {}
    } catch (e) {
      track('feature_vote_submit_error', {source:source, message:String(e && e.message || '').slice(0,120)});
      err.textContent = e && e.message ? e.message : '投票暂时无法提交';
      button.disabled = false;
      button.textContent = '提交投票';
    }
  }

  function accountCardShell() {
    return '<div class="card fv36-account" id="featureVoteCardV36"><div class="fv36-account-head"><div><h3 class="card-title">功能投票</h3><p class="card-sub">查看你的投票和当前票数。</p></div><button class="secondary" id="featureVoteOpenV36">投票</button></div><div id="featureVoteAccountBodyV36" class="subtle-note" style="margin-top:14px">读取中…</div></div>';
  }
  function renderAccountData(root, data) {
    if (!root || !data) return;
    var options = Array.isArray(data.options) ? data.options : [];
    var myVotes = Array.isArray(data.myVotes) ? data.myVotes : options.filter(function (x) { return x.votedByMe; });
    var archivedMine = myVotes.filter(function (x) { return x.isActive === false; });
    var suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    var body = root.querySelector('#featureVoteAccountBodyV36');
    if (!body) return;
    body.className = '';
    body.innerHTML =
      '<div class="fv36-account-list">' + options.map(function (item) {
        return '<div class="fv36-account-row"><div class="fv36-account-row-main"><b>' + esc(item.label) + '</b><small>' + Number(item.votes || 0) + ' 人已投</small></div><span class="fv36-badge ' + (item.votedByMe ? 'mine' : '') + '">' + (item.votedByMe ? '我已投' : '可投') + '</span></div>';
      }).join('') + archivedMine.map(function (item) {
        return '<div class="fv36-account-row"><div class="fv36-account-row-main"><b>' + esc(item.label) + '</b><small>' + Number(item.votes || 0) + ' 人投过</small></div><span class="fv36-badge">已结束</span></div>';
      }).join('') + '</div>' +
      (suggestions.length ? '<div class="fv36-suggestions"><div class="fv36-suggestions-title">我的新增需求</div>' + suggestions.slice(0,4).map(function (s) {
        var st = s.status === 'promoted' ? '已加入投票' : s.status === 'dismissed' ? '已处理' : '已提交';
        return '<div class="fv36-suggestion">' + esc(s.content) + ' · ' + st + '</div>';
      }).join('') + '</div>' : '');
    var open = root.querySelector('#featureVoteOpenV36');
    if (open) {
      open.textContent = Number(data.availableCount || 0) > 0 ? '继续投票' : '新增需求';
      open.onclick = function () {
        track('feature_vote_open_click', {source:'account', available_count:Number(data.availableCount || 0)});
        openVoteModal('account', data);
      };
    }
  }
  async function hydrateAccountCard(force) {
    try {
      if (typeof state === 'undefined' || state.page !== 'account') return;
      var root = document.getElementById('featureVoteCardV36');
      if (!root) return;
      var key = syncUserState();
      if (key && accountViewTrackedFor !== key) {
        accountViewTrackedFor = key;
        track('feature_vote_account_view', {});
      }
      var data = await loadOverview(!!force);
      if (!root.isConnected) return;
      renderAccountData(root, data);
    } catch (e) {
      var body = document.getElementById('featureVoteAccountBodyV36');
      if (body) body.textContent = '投票数据暂时无法读取';
    }
  }

  injectStyle();
  try {
    if (window.__v31 && window.__v31.releaseNotes) {
      window.__v31.releaseNotes['v6.2'] = '新增功能投票、用户需求收集与管理端投票管理。';
    }
  } catch (e) {}

  var accountHtmlBefore = (typeof accountHtml === 'function') ? accountHtml : null;
  if (accountHtmlBefore) {
    accountHtml = function featureVoteAccountHtmlV36() {
      var html = accountHtmlBefore.apply(this, arguments);
      if (html.indexOf('featureVoteCardV36') === -1) html += accountCardShell();
      return html;
    };
  }

  var bindPageBefore = (typeof bindPage === 'function') ? bindPage : null;
  if (bindPageBefore) {
    bindPage = function featureVoteBindPageV36() {
      var result = bindPageBefore.apply(this, arguments);
      if (typeof state !== 'undefined' && state.page === 'account') setTimeout(function () { hydrateAccountCard(true); }, 0);
      return result;
    };
  }

  var renderBefore = (typeof render === 'function') ? render : null;
  if (renderBefore) {
    render = function featureVoteRenderV36() {
      var result = renderBefore.apply(this, arguments);
      syncUserState();
      queueAutoCheck(170);
      return result;
    };
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (target && target.id === 'savedBtn') queueAutoCheck(120);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { queueAutoCheck(700); }, {once:true});
  } else {
    queueAutoCheck(700);
  }

  window.__featureVote = {
    open: function () { return openVoteModal('manual'); },
    refresh: function () { invalidateOverview(); return hydrateAccountCard(true); }
  };
})();
