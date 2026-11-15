const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../setup-preferences-guide.js'), 'utf8');
const wait = () => new Promise(resolve => setTimeout(resolve, 45));

function harness(initialProfile) {
  const dom = new JSDOM('<!doctype html><body><main id="app"><div>首页</div></main></body>', {url:'https://fixture.test/', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window, calls = [], events = [];
  let profile = initialProfile === undefined ? {step:6,completed_at:'2026-11-15T00:00:00Z',preference_guide_version:0,school:{name:'测试学校'}} : initialProfile;
  let defaults = {total:{year:620,class:45},'s:数学':{year:620,class:45}};
  let visual = {theme:'sunny',font:'system',size:'standard'};
  w.state = {user:{id:'u1',username:'tester'}, token:'token-u1', page:'home', onboarding:null,
    subjectConfigs:[{name:'数学',defaultMax:150},{name:'英语',defaultMax:150}],
    modulesV18:[{id:'11111111-1111-4111-8111-111111111111',name:'语数外',subjects:['数学','英语']} ]};
  w.render = () => {};
  w.loadExams = async () => {};
  w.dataApiV7 = async (action, payload) => { calls.push({action,payload}); if (action === 'save_participant_defaults') { Object.entries(payload.defaults).forEach(([key,row]) => { defaults[key] = Object.assign({}, defaults[key], row); }); return {participantDefaults:defaults}; } throw new Error('unexpected data action'); };
  w.ScoreParticipantDefaults = {snapshot:() => JSON.parse(JSON.stringify(defaults))};
  w.__v29 = {currentTheme:() => visual.theme, reading:() => ({font:visual.font,size:visual.size}), applyTheme:(id,_silent,persist) => {visual.theme=id; if (persist) calls.push({action:'persist_theme',id});}, applyReading:(font,size,persist) => {visual.font=font; visual.size=size; if (persist) calls.push({action:'persist_reading',font,size})}};
  w.__scoreTrackerTrack = (event, metadata) => events.push({event,metadata});
  w.toast = () => {};
  w.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); calls.push({action:body.action,payload:body});
    if (body.action === 'get') return {ok:true,json:async()=>({profile})};
    if (body.action === 'start') { profile = profile || {step:6,completed_at:'now',preference_guide_version:0}; return {ok:true,json:async()=>({profile})}; }
    if (body.action === 'save') { profile = Object.assign({},profile,{preference_guide_version:body.preference_guide_version}); return {ok:true,json:async()=>({profile})}; }
    throw new Error('unknown setup action '+body.action);
  };
  w.eval(source);
  return {w, calls, events, get profile(){return profile;}, get defaults(){return defaults;}, get visual(){return visual;}, close:()=>dom.window.close()};
}

(async()=>{
  let h = harness();
  h.w.render(); await wait(); await wait();
  assert(h.w.document.querySelector('.setup-guide-overlay'),'every completed account gets the guide');
  assert.equal(h.w.document.querySelectorAll('.setup-guide-theme').length,4);
  assert(h.w.document.querySelector('[data-guide-key="s:数学"]'));
  h.w.document.querySelector('[data-guide-theme="night"]').click();
  const math = h.w.document.querySelector('[data-guide-key="s:数学"] [data-guide-scope="year"]');
  math.value = '700';
  h.w.document.querySelector('#setup-guide-save').click(); await wait(); await wait();
  assert.equal(h.profile.preference_guide_version,1);
  assert.equal(h.defaults['s:数学'].year,700);
  assert.equal(h.visual.theme,'night');
  assert(!h.w.document.querySelector('.setup-guide-overlay'),'guide closes after save');
  assert.equal(h.w.state.onboarding,null);
  h.w.render(); await wait(); assert(!h.w.document.querySelector('.setup-guide-overlay'),'guide is one-time per account');
  h.close();

  h = harness(null); h.w.render(); await wait(); await wait();
  assert(h.w.document.querySelector('.setup-guide-overlay'),'accounts without a setup profile also get the guide');
  h.w.document.querySelector('#setup-guide-skip').click(); await wait(); await wait();
  assert.equal(h.profile.preference_guide_version,1); assert(!h.w.document.querySelector('.setup-guide-overlay'));
  h.close();
  console.log('PASS: full-screen preference guide, appearance choices, subject defaults, one-time completion and profile bootstrap');
})().catch(error => { console.error(error); process.exitCode = 1; });
