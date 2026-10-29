/* Device/account presentation preference. Exam fields are never removed or disabled. */
(function () {
  'use strict';
  if (window.ScoreInterfaceMode) return;
  const root = document.documentElement;
  let mode = 'full', identity = null, dialog = null, returnFocus = null, applying = false, queued = false;
  const user = () => typeof state !== 'undefined' && state.user;
  const key = () => user() ? 'st_interface_mode_v1_' + String(user().id || user().originalUsername || user().username) : null;
  const valid = v => v === 'simple' || v === 'full';
  const name = () => mode === 'simple' ? '简单模式' : '完整模式';
  function read() { try { const v = localStorage.getItem(key()); return valid(v) ? v : 'full'; } catch (_) { return 'full'; } }
  function hydrate() {
    const next = key();
    if (identity !== next) { identity = next; mode = next ? read() : 'full'; if (dialog) dismiss(); }
    root.dataset.interfaceMode = mode;
  }
  function button(label, className, action) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = className; el.textContent = label; el.onclick = action;
    return el;
  }
  function dismiss() {
    if (!dialog) return;
    dialog.close(); dialog.remove(); dialog = null;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function select(next) {
    if (!valid(next) || !key()) return false;
    try { localStorage.setItem(key(), next); }
    catch (_) { if (dialog) dialog.querySelector('[role=status]').textContent = '暂时无法保存模式，请检查浏览器存储设置。'; return false; }
    mode = next;
    // Keep an open editor intact. Leaving the analysis page is safe when no editor is open.
    if (next === 'simple' && typeof state !== 'undefined' && state.page === 'stats' && !state.modal && !document.querySelector('.modal-backdrop')) { state.page = 'home'; render(); }
    apply();
    dismiss();
    if (typeof toast === 'function') toast('已切换到' + name() + '，成绩数据保持不变');
    return true;
  }
  function open() {
    hydrate(); if (dialog || !user()) return;
    returnFocus = document.activeElement;
    dialog = document.createElement('dialog'); dialog.className = 'im-dialog'; dialog.setAttribute('aria-labelledby', 'imTitle');
    dialog.innerHTML = '<header><div><h2 id="imTitle">选择使用模式</h2><p>按需要调整页面内容，随时可以切换。</p></div><button type="button" class="im-close" aria-label="关闭模式设置">×</button></header><div class="im-options">' + ['simple','full'].map(v =>
      '<button type="button" data-interface-choice="' + v + '" aria-pressed="' + (mode === v) + '"><span class="im-mode-art im-art-' + v + '" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span><b>' + (v === 'simple' ? '简单模式' : '完整模式') + '</b><span>' + (v === 'simple' ? '记录成绩，查看基础趋势' : '使用全部图表和分析工具') + '</span><small>' + (v === 'simple' ? '录入以得分、满分为主<br>排名、均分等按需展开<br>首页保留常用信息' : '完整录入与科目对比<br>成绩含金量、目标与排名分析<br>全部设置与数据工具') + '</small><em>' + (mode === v ? '当前使用' : '使用' + (v === 'simple' ? '简单' : '完整') + '模式') + '</em></button>').join('') + '</div><p class="im-footnote">两种模式共用同一份数据，已有成绩、排名和补充信息都会保留。偏好保存在本设备的当前账号。</p><p role="status" aria-live="polite"></p>';
    document.body.appendChild(dialog);
    dialog.querySelector('.im-close').onclick = dismiss;
    dialog.querySelectorAll('[data-interface-choice]').forEach(el => el.onclick = () => select(el.dataset.interfaceChoice));
    dialog.addEventListener('cancel', e => { e.preventDefault(); dismiss(); });
    dialog.showModal(); dialog.querySelector('[aria-pressed=true]').focus();
  }
  function advanced(el, group = 'page') { if (el && el.dataset.imAdvanced !== group) el.dataset.imAdvanced = group; }
  function shortcut() {
    const topbar = document.querySelector('.topbar'); if (!topbar) return;
    let el = topbar.querySelector('.im-shortcut');
    if (!el) { el = button(name(), 'im-shortcut', open); topbar.appendChild(el); }
    if (el.textContent !== name()) el.textContent = name();
    el.setAttribute('aria-label', '当前' + name() + '，切换使用模式');
  }
  function account() {
    const grid = document.querySelector('.account-grid'); if (!grid) return;
    const content = document.getElementById('content');
    let card = document.getElementById('interfaceModeCard');
    if (!card) {
      card = document.createElement('section'); card.id = 'interfaceModeCard'; card.className = 'card account-card im-account';
      card.innerHTML = '<div><h3 class="card-title">使用模式</h3><p class="card-sub">根据需要显示常用功能或全部功能。</p><span class="im-current"></span></div>';
      card.appendChild(button('切换模式', 'secondary', open));
      const first = grid.querySelector(':scope > .account-card'); if (first) first.after(card); else grid.prepend(card);
    }
    const label = card.querySelector('.im-current'); if (label.textContent !== name()) label.textContent = name();
    content.querySelectorAll('.module-settings-v18,.module-settings-v21,.school-card,.community-card,.fv36-account,#communityAccountCard,#v33AccountCard,.author-support-card').forEach(el => advanced(el, 'settings'));
    if (content.querySelector('[data-im-advanced=settings]') && !grid.querySelector('.im-more-settings')) {
      const more = button('展开更多设置与交流', 'im-more-settings secondary', () => {
        const expanded = content.classList.toggle('im-settings-expanded'); more.setAttribute('aria-expanded', String(expanded));
        more.textContent = expanded ? '收起更多设置与交流' : '展开更多设置与交流';
      });
      more.setAttribute('aria-expanded', 'false'); card.after(more);
    }
  }
  function page() {
    const content = document.getElementById('content'); if (!content) return;
    content.querySelectorAll('.radar-card,.quick-card,.goal-hero-v33,.goal-bar-v33').forEach(el => advanced(el));
    document.querySelectorAll('.desktop-nav [data-page=stats],.bottom-nav [data-page=stats]').forEach(el => advanced(el));
    const hero = content.querySelector('.hero-main');
    if (hero && !hero.querySelector('.im-home-title')) {
      const h = document.createElement('h2'); h.className = 'im-home-title'; h.textContent = '成绩概览'; hero.prepend(h);
    }
    content.querySelectorAll('.sv31-page > .card').forEach((el, i) => { if (i > 0 && !el.matches('.sv31-trend-card,.sv31-quality')) advanced(el); });
    content.querySelectorAll('#scoreWorthCard,.trajectory-forecast-card,.trajectory-card,.similar-trajectories-card,[data-stats-view]').forEach(el => advanced(el));
    if (typeof state !== 'undefined' && ['home','stats'].includes(state.page) && !content.querySelector('.im-full-entry')) {
      const entry = document.createElement('div'); entry.className = 'im-full-entry';
      entry.innerHTML = '<div><b>需要更多分析？</b><p>完整模式提供科目对比、排名和目标等分析工具。</p></div>';
      entry.appendChild(button('切换完整模式', 'secondary', () => select('full'))); content.appendChild(entry);
    }
  }
  function toggleSubject(card) {
    if (card.querySelector(':scope > .im-subject-toggle')) return;
    card.classList.add('im-subject');
    const toggle = button('补充信息', 'im-subject-toggle', () => {
      const expanded = card.classList.toggle('im-expanded'); toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? '收起补充信息' : '补充信息';
    });
    toggle.setAttribute('aria-expanded', 'false'); card.appendChild(toggle);
    const values = card.querySelectorAll('.target-v16,.raw-v16,.year-rank-v16,.class-rank-v16,.position-percent-v17,[data-average-row],.total-actual-override-v24,.total-raw-override-v24,#totalRankV16,#totalClassRankV16');
    if (Array.from(values).some(el => el.value.trim() !== '')) toggle.textContent = '补充信息 · 已有内容';
  }
  function editor() {
    document.querySelectorAll('.modal:has(#examName)').forEach(modal => {
      const body = modal.querySelector('.modal-body'); if (!body) return;
      if (!body.querySelector('.im-editor-note')) {
        const note = document.createElement('div'); note.className = 'im-editor-note'; note.innerHTML = '<span>先填写得分与满分，其他信息按需补充。</span>';
        const toggle = button('显示完整录入', 'im-editor-toggle', () => {
          const expanded = modal.classList.toggle('im-editor-full'); toggle.setAttribute('aria-expanded', String(expanded));
          toggle.textContent = expanded ? '收起完整录入' : '显示完整录入';
        });
        toggle.setAttribute('aria-expanded','false'); note.appendChild(toggle); body.prepend(note);
      }
      modal.querySelectorAll('.exam-subject-card-v10,.combo-total-v21').forEach(card => {
        card.querySelectorAll('.target-box-v14,.raw-box-v14,.exclude-total-v17,.exam-averages,.subject-ranks-v16,.total-ranks-v16,.manual-total-v24').forEach(el => el.classList.add('im-field-extra'));
        toggleSubject(card);
      });
      modal.querySelectorAll('.end-date-field-v25,.rank-entry-top-v21,.combo-section-v21,.combo-list-v21,.combo-picker-v21,.visibility-box-v10,#v33cityBox').forEach(el => el.classList.add('im-editor-extra'));
    });
  }
  function apply() {
    if (applying) return; applying = true;
    try { hydrate(); if (!user()) return; shortcut(); account(); page(); editor(); }
    finally { applying = false; }
  }
  for (const method of ['render','renderPage','bindPage','openExam']) {
    const before = window[method];
    if (typeof before === 'function') window[method] = function () { const result = before.apply(this, arguments); apply(); return result; };
  }
  const observer = new MutationObserver(records => {
    if (queued || !records.some(r => Array.from(r.addedNodes).some(n => n.nodeType === 1 && !n.matches('[class^="im-"],.toast') && !n.closest('.im-dialog') && (n.matches('.shell,.card,.modal,.exam-subject-card-v10,.account-grid,.sv31-page') || n.querySelector('.card,.exam-subject-card-v10'))))) return;
    queued = true; requestAnimationFrame(() => { queued = false; apply(); });
  });
  observer.observe(document.body, {childList:true,subtree:true});
  window.addEventListener('storage', e => { if (e.key === key() || e.key === null) { mode = read(); apply(); } });
  window.ScoreInterfaceMode = {open, select, apply, get:() => { hydrate(); return mode; }};
  apply();
})();
