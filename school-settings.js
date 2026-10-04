/* School preferences are independent of registration and first-run setup. */
(function () {
  'use strict';
  const API = '/api/score-tracker-setup';
  let owner = '', profile = null, loaded = false, failed = false, fetching = false;
  let claiming = false, claimed = false, retryAt = 0, modal = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function user() { return state.user && state.token ? { id: String(state.user.id), token: state.token } : null; }
  const identity = u => u ? u.id + ':' + u.token : '';
  const current = u => identity(user()) === identity(u);
  function track(event, data) { try { window.__scoreTrackerTrack?.(event, data || {}); } catch (_) {} }
  async function call(action, payload, u, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: controller.signal, body: JSON.stringify({ ...payload, action, token: u.token }) });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error || '暂时没能加载，请稍后再试');
        error.status = response.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  function blocked() {
    return state.onboarding || document.visibilityState !== 'visible' || document.querySelector('.modal-backdrop,.rn-back,.fv36-back,.st-fb-back,.pwa-back,.gmodal-backdrop.open');
  }
  function refreshCard() { if (state.user && state.page === 'account') renderPage(); }
  async function load(u) {
    if (fetching || !u) return;
    fetching = true; failed = false;
    try {
      const data = await call('get', {}, u);
      if (!current(u)) return;
      profile = data.profile; loaded = true; retryAt = 0;
    } catch (_) { if (current(u)) { failed = true; retryAt = Date.now() + 30000; } }
    finally { if (current(u)) { fetching = false; refreshCard(); } }
  }
  async function tick() {
    const u = user(), key = identity(u);
    if (key !== owner) {
      if (modal) modal.close(true);
      owner = key; profile = null; loaded = failed = fetching = claiming = claimed = false; retryAt = 0;
      refreshCard();
    }
    if (!u) return;
    if (!loaded && !fetching && Date.now() >= retryAt) { load(u); return; }
    if (!loaded || claiming || modal || blocked() || profile?.school) return;
    if (claimed) { open(u, true); return; }
    if (profile?.school_prompted_at || profile?.completed_at || profile?.step === 6 || Date.now() < retryAt) return;
    claiming = true;
    try {
      const data = await call('school_prompt_claim', {}, u);
      if (!current(u)) return;
      profile = data.profile; claimed = data.claimed && !modal; refreshCard();
      if (claimed && !blocked() && !modal) open(u, true);
    } catch (_) { if (current(u)) retryAt = Date.now() + 30000; }
    finally { if (current(u)) claiming = false; }
  }
  function styles() {
    if (document.getElementById('school-settings-style')) return;
    const style = document.createElement('style'); style.id = 'school-settings-style';
    style.textContent = `
      .school-card{margin-top:18px}.school-card p{overflow-wrap:anywhere}
      .school-back{position:fixed;inset:0;z-index:171;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.42);backdrop-filter:blur(9px)}
      .school-dialog{width:min(520px,100%);max-height:90vh;max-height:90dvh;overflow:auto;padding:24px;border:1px solid var(--line);border-radius:24px;background:var(--panel-solid,#fff);color:var(--text);box-shadow:0 30px 90px rgba(17,24,39,.26)}
      .school-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.school-head h2{margin:0;font-size:22px}.school-close{border:0;background:var(--cell);color:var(--muted);border-radius:10px;width:34px;height:34px;font-size:22px}
      .school-intro,.school-hint{color:var(--muted);font-size:13px;line-height:1.7}.school-filters{display:grid;grid-template-columns:1fr 1fr;gap:12px}.school-dialog label{display:block;font-size:13px;margin-top:12px}
      .school-dialog input,.school-dialog select{width:100%;min-width:0;box-sizing:border-box;margin-top:7px;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--cell,#f7f8fb);color:var(--text);font:inherit}
      .school-results{display:grid;gap:6px;max-height:240px;overflow:auto;margin-top:12px}.school-result{display:block;width:100%;text-align:left;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-solid,#fff);color:var(--text);font:inherit;cursor:pointer;overflow-wrap:anywhere}.school-result[aria-pressed=true]{border-color:var(--accent);background:var(--accent-soft)}
      .school-result small{display:block;margin-top:4px;color:var(--muted);font-size:11px}.school-error{color:var(--danger,#c24141);font-size:13px;line-height:1.6;margin-top:12px}.school-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.school-dialog button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.school-dialog button:disabled{opacity:.55;cursor:default}
      @media(max-width:620px){.school-back{padding:12px}.school-dialog{padding:20px 18px;border-radius:21px}.school-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }
  function open(u, automatic) {
    if (modal || !current(u) || blocked()) return;
    styles(); claimed = false;
    const saved = profile?.school;
    let selected = saved || null, query = saved?.name || '', province = saved?.province || '', city = saved?.city || '';
    let regions = [], rows = [], sequence = 0, searchTimer, controller, busy = false, alive = true;
    const back = document.createElement('div'); back.className = 'school-back';
    const focus = document.activeElement, overflow = document.body.style.overflow;
    back.innerHTML = '<section class="school-dialog" role="dialog" aria-modal="true" aria-labelledby="schoolTitle" aria-describedby="schoolIntro"><div class="school-head"><h2 id="schoolTitle">'+(saved ? '修改学校' : '你在哪所学校？')+'</h2><button class="school-close" type="button" aria-label="关闭">×</button></div><p class="school-intro" id="schoolIntro">选好学校后，随时都能在设置里修改。现在不选也没关系。</p><div class="school-filters"><label>省份<select id="schoolProvince" aria-label="省份"><option value="">全部省份</option></select></label><label>城市<select id="schoolCity" aria-label="城市"><option value="">全部城市</option></select></label></div><label for="schoolQuery">学校名称</label><input id="schoolQuery" maxlength="100" autocomplete="off" placeholder="输入学校名称"><div id="schoolRegionStatus" class="school-hint" role="status"></div><div id="schoolResults" class="school-results" aria-label="学校搜索结果"></div><p id="schoolSearchStatus" class="school-hint" role="status"></p><div id="schoolError" class="school-error" role="alert"></div><div class="school-actions"><button type="button" class="secondary" id="schoolLater">'+(automatic ? '以后再选' : '取消')+'</button><button type="button" class="primary" id="schoolSave">保存学校</button></div></section>';
    const el = id => back.querySelector('#'+id);
    el('schoolQuery').value = query;
    const valid = () => alive && current(u);
    const close = (force, reason = 'close_button') => {
      if (!alive || busy && !force) return;
      alive = false; clearTimeout(searchTimer); controller?.abort(); back.remove();
      document.body.style.overflow = overflow;
      if (focus?.isConnected) focus.focus();
      modal = null;
      if (!force) track('school_picker_dismissed', { source: automatic ? 'prompt' : 'settings', reason });
    };
    modal = { close }; document.body.appendChild(back); document.body.style.overflow = 'hidden';
    // Opening the picker from Settings counts as seeing it too.
    if (!automatic && !profile?.school_prompted_at && !profile?.school) {
      call('school_prompt_claim', {}, u).then(data => {
        if (current(u)) { profile = data.profile; refreshCard(); }
      }).catch(() => {});
    }
    function filters() {
      const provinces = [...new Set(regions.map(r => r[0]))];
      if (province && !provinces.includes(province)) provinces.push(province);
      el('schoolProvince').innerHTML = '<option value="">全部省份</option>'+provinces.map(p => '<option'+(p === province ? ' selected' : '')+'>'+esc(p)+'</option>').join('');
      const cities = [...new Set(regions.filter(r => !province || r[0] === province).map(r => r[1]))];
      if (city && !cities.includes(city)) cities.push(city);
      el('schoolCity').innerHTML = '<option value="">全部城市</option>'+cities.map(c => '<option'+(c === city ? ' selected' : '')+'>'+esc(c)+'</option>').join('');
    }
    function results() {
      el('schoolResults').innerHTML = rows.map((s,i) => '<button type="button" class="school-result" data-school="'+i+'" aria-pressed="'+String(!!selected && s[0] === selected.name && s[1] === selected.province && s[2] === selected.city && s[3] === selected.area)+'">'+esc(s[0])+'<small>'+esc([s[1],s[2],s[3]].filter(Boolean).join(' · '))+'</small></button>').join('');
      back.querySelectorAll('[data-school]').forEach(button => button.onclick = () => {
        const s = rows[Number(button.dataset.school)];
        selected = { name:s[0], province:s[1], city:s[2], area:s[3], source:'github' };
        query = s[0]; el('schoolQuery').value = query; results();
        el('schoolSearchStatus').textContent = '已选：'+s[0];
        track('school_picker_selection_changed', { source: automatic ? 'prompt' : 'settings', selection: 'github', result_rank: Number(button.dataset.school) + 1 });
      });
    }
    function search(delay = 250) {
      clearTimeout(searchTimer); controller?.abort(); const version = ++sequence;
      rows = []; results(); el('schoolSearchStatus').textContent = '正在查找学校…';
      searchTimer = setTimeout(async () => {
        controller = new AbortController();
        try {
          track('school_search_started', { source: automatic ? 'prompt' : 'settings', query_length: query.trim().length, has_province: !!province, has_city: !!city });
          const data = await call('school_search', { query, province, city }, u, controller.signal);
          if (!valid() || version !== sequence) return;
          rows = data.schools || []; results();
          el('schoolSearchStatus').textContent = data.has_more ? '还有更多学校，试试完整校名或选一下地区。' : rows.length ? '点选你的学校；没找到也可以直接保存输入的名称。' : '没找到？可以直接保存你输入的学校名称。';
          track('school_search_completed', { source: automatic ? 'prompt' : 'settings', result_count: rows.length, has_more: !!data.has_more, query_length: query.trim().length });
        } catch (error) {
          if (!valid() || version !== sequence || error.name === 'AbortError') return;
          el('schoolSearchStatus').textContent = '学校列表暂时没加载出来，可以重试，也可以直接保存校名。';
          track('school_search_failed', { source: automatic ? 'prompt' : 'settings', status: Number(error.status) || 0 });
          const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'secondary'; retry.textContent = '重试'; retry.onclick = () => search(0); el('schoolResults').appendChild(retry);
        }
      }, delay);
    }
    async function loadRegions() {
      el('schoolRegionStatus').textContent = '正在加载地区…';
      try {
        const data = await call('school_regions', {}, u);
        if (!valid()) return; regions = data.regions || []; filters(); el('schoolRegionStatus').textContent = '';
        track('school_regions_loaded', { source: automatic ? 'prompt' : 'settings', region_count: regions.length });
      } catch (error) {
        if (!valid()) return;
        el('schoolRegionStatus').textContent = '地区暂时没加载出来，仍可按校名查找。';
        track('school_regions_failed', { source: automatic ? 'prompt' : 'settings', status: Number(error.status) || 0 });
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'secondary'; retry.textContent = '重试'; retry.onclick = loadRegions; el('schoolRegionStatus').appendChild(retry);
      }
    }
    el('schoolProvince').onchange = e => { province = e.target.value; city = ''; selected = null; filters(); search(0); };
    el('schoolCity').onchange = e => { city = e.target.value; selected = null; search(0); };
    let manualEntryTracked = false;
    el('schoolQuery').oninput = e => {
      query = e.target.value; selected = null; el('schoolError').textContent = '';
      if (query.trim() && !manualEntryTracked) { manualEntryTracked = true; track('school_picker_selection_changed', { source: automatic ? 'prompt' : 'settings', selection: 'manual' }); }
      search();
    };
    back.querySelector('.school-close').onclick = () => close(false, 'close_button');
    el('schoolLater').onclick = () => close(false, automatic ? 'later' : 'cancel_button');
    back.onclick = e => { if (e.target === back) close(false, 'backdrop'); };
    back.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(false, 'escape'); }
      if (e.key !== 'Tab') return;
      if (busy) { e.preventDefault(); return; }
      const nodes = [...back.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
      const first = nodes[0], last = nodes[nodes.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el('schoolSave').onclick = async () => {
      if (busy || !valid()) return;
      if (!query.trim()) {
        el('schoolError').textContent = '先输入或选择你的学校吧';
        el('schoolQuery').focus();
        track('school_save_validation_failed', { source: automatic ? 'prompt' : 'settings', reason: 'empty_name' });
        return;
      }
      const school = selected || { name:query.trim(), province, city, area:'', source:'manual' };
      clearTimeout(searchTimer); controller?.abort(); sequence++;
      busy = true; el('schoolError').textContent = ''; el('schoolSave').textContent = '正在保存…';
      back.querySelectorAll('button,input,select').forEach(node => node.disabled = true);
      try {
        const data = await call('school_save', { school }, u);
        if (!valid()) return;
        profile = data.profile; loaded = true; close(true); refreshCard(); toast('学校已保存');
        track('school_saved', { source:automatic ? 'prompt' : 'settings', selection:school.source });
      } catch (error) {
        if (valid()) el('schoolError').textContent = error.message || '没有保存成功，请再试一次';
        if (valid()) track('school_save_failed', { source: automatic ? 'prompt' : 'settings', selection: school.source, status: Number(error.status) || 0 });
      } finally {
        busy = false;
        if (valid()) { back.querySelectorAll('button,input,select').forEach(node => node.disabled = false); el('schoolSave').textContent = '保存学校'; }
      }
    };
    filters(); loadRegions(); search(0); el('schoolQuery').focus();
    track('school_picker_shown', { source:automatic ? 'prompt' : 'settings' });
  }
  styles();
  const previousAccount = accountHtml;
  accountHtml = function () {
    const school = profile?.school;
    return previousAccount()+'<section class="card account-card school-card"><h3 class="card-title">我的学校</h3><p class="card-sub">'+esc(school ? [school.province,school.city,school.area].filter(Boolean).join(' · ') || '随时可以修改' : '选一下你现在就读的学校')+'</p><p>'+esc(school?.name || (failed ? '学校暂时没加载出来' : loaded ? '还没有选择学校' : '正在加载学校…'))+'</p><button type="button" class="secondary" id="schoolEdit"'+(!loaded && !failed ? ' disabled' : '')+'>'+(!loaded ? failed ? '重新加载' : '正在加载…' : school ? '修改学校' : '选择学校')+'</button></section>';
  };
  const previousBind = bindPage;
  bindPage = function () {
    previousBind();
    document.getElementById('schoolEdit')?.addEventListener('click', () => {
      const u = user(); if (!u) return;
      track('school_settings_entry_clicked', { loaded, has_school: !!profile?.school, retry: !loaded });
      if (!loaded) load(u); else open(u, false);
    });
  };
  const previousRender = render;
  render = function () { previousRender(); tick(); };
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('storage', e => { if (e.key === 'st_token' && modal && e.newValue !== user()?.token) modal.close(true); });
  setInterval(tick, 1000);
  tick();
})();
