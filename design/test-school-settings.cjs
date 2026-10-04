const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../school-settings.js'), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
function harness(options = {}) {
  const dom = new JSDOM('<!doctype html><main id="content"></main>', {url:'https://score.test', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window, requests = [], events = [], profiles = options.profiles || new Map();
  let interval, saveError = false, searchError = false, regionError = false, deferredGet;
  w.state = {user:options.guest ? null : {id:'A'}, token:options.guest ? '' : 'A', page:'account', onboarding:options.onboarding || null};
  w.__scoreTrackerTrack = (event, metadata) => events.push({event, metadata});
  const register = () => {}; const onboard = () => {};
  w.startRegister = register; w.showOnboarding = onboard;
  w.toast = () => {}; w.accountHtml = () => '<div>既有设置</div>'; w.bindPage = () => {};
  w.renderPage = () => { w.document.getElementById('content').innerHTML = w.accountHtml(); w.bindPage(); };
  w.render = () => w.renderPage(); w.setInterval = fn => {interval = fn;};
  w.fetch = async (url, init) => {
    const b = JSON.parse(init.body); requests.push(b); assert.equal(url,'/api/score-tracker-setup');
    const p = profiles.get(b.token) || null;
    let data, error;
    if (b.action === 'get') { if (deferredGet) return deferredGet(b); data = {profile:p}; }
    if (b.action === 'school_prompt_claim') {
      const claimed = !p?.school && !p?.school_prompted_at && !p?.completed_at && p?.step !== 6;
      const next = claimed ? {...p, school_prompted_at:'once'} : p;
      profiles.set(b.token,next); data = {claimed,profile:next};
    }
    if (b.action === 'school_regions') { data = {regions:[['浙江省','杭州市'],['江苏省','南京市']]}; if(regionError) error='地区不可用'; }
    if (b.action === 'school_search') { data = {schools:[['杭州第二中学','浙江省','杭州市','滨江区']], has_more:false}; if(searchError) error='搜索不可用'; }
    if (b.action === 'school_save') {
      if(saveError) error='暂时无法保存';
      else { const next = {...p, school:b.school,school_prompted_at:'saved'}; profiles.set(b.token,next); data = {profile:next}; }
    }
    return {ok:!error,json:async()=>error ? {error} : data};
  };
  w.eval(source); w.renderPage();
  assert.equal(w.startRegister,register); assert.equal(w.showOnboarding,onboard);
  return {w,d:w.document,requests,events,profiles,tick:()=>interval(),close:()=>w.close(),setSaveError:v=>saveError=v,setSearchError:v=>searchError=v,setRegionError:v=>regionError=v,setDeferredGet:fn=>deferredGet=fn};
}
async function ready(h) { await settle(); h.tick(); await settle(); }
(async () => {
  let h = harness(); await ready(h);
  assert(h.d.querySelector('.school-back')); assert.equal(h.requests.filter(r=>r.action==='school_prompt_claim').length,1);
  assert(h.events.some(e=>e.event==='school_picker_shown'&&e.metadata.source==='prompt'));
  h.d.querySelector('#schoolLater').click(); h.tick(); await settle(); assert(!h.d.querySelector('.school-back'));
  assert(h.events.some(e=>e.event==='school_picker_dismissed'&&e.metadata.reason==='later'));
  const profiles = h.profiles; h.close();
  h = harness({profiles}); await ready(h); assert(!h.d.querySelector('.school-back'));
  h.d.querySelector('#schoolEdit').click(); await settle(); assert(h.d.querySelector('.school-back'));
  assert(h.events.some(e=>e.event==='school_settings_entry_clicked'&&e.metadata.has_school===false));
  assert(h.events.some(e=>e.event==='school_picker_shown'&&e.metadata.source==='settings'));
  h.d.querySelector('#schoolQuery').value = '自填高中'; h.d.querySelector('#schoolQuery').dispatchEvent(new h.w.Event('input'));
  h.setSaveError(true); h.d.querySelector('#schoolSave').click(); await settle();
  assert.equal(h.d.querySelector('#schoolQuery').value,'自填高中'); assert.match(h.d.querySelector('#schoolError').textContent,/暂时无法保存/);
  assert.equal(h.d.querySelector('#schoolSave').disabled,false);
  assert(h.events.some(e=>e.event==='school_save_failed'&&e.metadata.selection==='manual'));
  h.setSaveError(false); h.d.querySelector('#schoolSave').click(); await settle();
  assert(!h.d.querySelector('.school-back')); assert.match(h.d.querySelector('.school-card').textContent,/自填高中/);
  assert.equal(h.profiles.get('A').school.source,'manual');
  assert(h.events.some(e=>e.event==='school_saved'&&e.metadata.selection==='manual'&&e.metadata.source==='settings'));
  h.d.querySelector('#schoolEdit').click(); await settle(); h.d.querySelector('[data-school="0"]').click();
  assert(h.events.some(e=>e.event==='school_picker_selection_changed'&&e.metadata.selection==='github'));
  h.d.querySelector('#schoolSave').click(); await settle();
  assert.equal(h.profiles.get('A').school.name,'杭州第二中学'); assert.equal(h.profiles.get('A').school.area,'滨江区');
  assert(h.events.some(e=>e.event==='school_saved'&&e.metadata.selection==='github'));
  h.close();
  for (const profile of [{school:{name:'已有学校'}},{school_prompted_at:'once'},{step:6},{completed_at:'done'}]) {
    h = harness({profiles:new Map([['A',profile]])}); await ready(h); assert(!h.d.querySelector('.school-back')); assert(!h.requests.some(r=>r.action==='school_prompt_claim')); h.close();
  }
  h = harness({guest:true}); await ready(h); assert.equal(h.requests.length,0); h.close();
  const shared=new Map(); const tab1=harness({profiles:shared}),tab2=harness({profiles:shared});
  await settle();tab1.tick();tab2.tick();await settle();
  assert.equal(Number(!!tab1.d.querySelector('.school-back'))+Number(!!tab2.d.querySelector('.school-back')),1);tab1.close();tab2.close();
  h=harness();await settle();h.d.querySelector('#schoolEdit').click();await settle();h.d.querySelector('#schoolLater').click();await ready(h);assert(!h.d.querySelector('.school-back'));h.close();
  h = harness({onboarding:{username:'A'}}); await ready(h); assert(!h.d.querySelector('.school-back'));
  h.w.state.onboarding=null; await ready(h); assert(h.d.querySelector('.school-back')); h.close();
  for (const cls of ['modal-backdrop','rn-back','fv36-back','st-fb-back','pwa-back']) {
    h = harness(); const b=h.d.createElement('div'); b.className=cls; h.d.body.appendChild(b); await ready(h);
    assert(!h.d.querySelector('.school-back')); assert(!h.requests.some(r=>r.action==='school_prompt_claim'));
    b.remove(); await ready(h); assert(h.d.querySelector('.school-back')); h.close();
  }
  h = harness(); await ready(h); h.w.state.user={id:'B'}; h.w.state.token='B'; h.w.render(); await settle();
  assert(!h.d.querySelector('.school-back')); h.tick(); await settle(); assert(h.d.querySelector('.school-back'));
  h.d.querySelector('#schoolQuery').value='B学校'; h.d.querySelector('#schoolQuery').dispatchEvent(new h.w.Event('input')); h.d.querySelector('#schoolSave').click(); await settle();
  assert.equal(h.profiles.get('B').school.name,'B学校'); assert.equal(h.profiles.get('A').school,undefined); h.close();
  h = harness(); h.setSearchError(true); h.setRegionError(true); await ready(h);
  assert.match(h.d.querySelector('#schoolSearchStatus').textContent,/暂时/); assert.match(h.d.querySelector('#schoolRegionStatus').textContent,/暂时/);
  assert(h.events.some(e=>e.event==='school_search_failed')); assert(h.events.some(e=>e.event==='school_regions_failed'));
  h.setSearchError(false); h.d.querySelector('#schoolResults button').click(); await settle(); assert(h.d.querySelector('[data-school]'));
  h.d.querySelector('#schoolProvince').value=''; h.d.querySelector('#schoolQuery').focus();
  const last=h.d.querySelector('#schoolSave'); last.focus(); last.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})); assert.equal(h.d.activeElement,h.d.querySelector('.school-close'));
  last.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); assert(!h.d.querySelector('.school-back')); assert.equal(h.d.body.style.overflow,''); h.close();
  // A delayed response for a logged-out account must not populate the next account.
  h=harness({guest:true}); let release;
  h.setDeferredGet(b=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({profile:{school:{name:'A私有学校'}}})});}));
  h.w.state.user={id:'A'};h.w.state.token='A';h.tick(); h.w.state.user=null;h.w.state.token='';h.tick();release();await settle();
  assert(!h.d.querySelector('.school-back'));assert(!h.w.accountHtml().includes('A私有学校'));h.close();
  // Settings do not import or resume the first-run wizard.
  assert(!source.includes('selected_subjects')); assert(!source.includes("call('start'")); assert(!source.includes("call('save'"));
  console.log('School settings: one-time prompt, existing profiles, manual/directory save, retry, blockers, focus and account isolation passed.');
})().catch(e=>{console.error(e);process.exit(1)});
