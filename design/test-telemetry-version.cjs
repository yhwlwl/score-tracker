// NODE_PATH=<directory containing jsdom> node design/test-telemetry-version.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
async function bundled() {
  const calls = [], errors = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const html = read('index.html').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, {url:'https://version.test/', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole:vc});
  const w = dom.window;
  w.matchMedia = () => ({matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}});
  w.scrollTo = () => {}; w.setInterval = () => 1;
  let releaseConfig;
  const configReady = new Promise(resolve => { releaseConfig = resolve; });
  w.fetch = async (url, options = {}) => {
    if (String(url).includes('__cb')) return {ok:true, text:async () => '<meta name="application-version" content="v8.0">'};
    const body = JSON.parse(options.body || '{}'); calls.push(body);
    if (body.action === 'notice_public') {
      await configReady;
      return new Response(JSON.stringify({config:{version:'v8.1', enabled:false, title:'新版', content:'新版说明'}}));
    }
    return new Response(JSON.stringify({ok:true, feedback:[], modules:[], exams:[], subjects:[]}));
  };
  w.eval(read('app-bundle.js') + '\nwindow.state=state;');
  assert.equal(w.document.querySelector('meta[name="application-version"]').content, 'v8.0');
  await w.__scoreTrackerTrack('version_before_check');
  assert.equal(calls.find(c => c.eventType === 'version_before_check').context.appVersion, 'v8.0');
  releaseConfig();
  for (let i=0; i<20 && w.__releaseNotices.currentVersion() !== 'v8.1'; i++) await tick();
  assert.equal(w.__releaseNotices.currentVersion(), 'v8.1');
  assert.equal(w.document.querySelector('meta[name="application-version"]').content, 'v8.1');
  await w.__scoreTrackerTrack('version_after_check');
  await w.__stTrack('version_feature_event');
  w.trackStudyPlannerV18(); await tick();
  for (const event of ['version_after_check','version_feature_event','study_planner_opened']) {
    assert.equal(calls.find(c => c.eventType === event).context.appVersion, 'v8.1', event);
  }
  const notices = w.__releaseNotices; delete w.__releaseNotices;
  await w.__scoreTrackerTrack('version_without_notices');
  assert.equal(calls.find(c => c.eventType === 'version_without_notices').context.appVersion, 'v8.1', 'fallback reads the live meta, not a captured 7.0');
  w.__releaseNotices = notices;
  w.__scoreTrackerFeedback.open();
  w.document.querySelector('#stFbContent').value = '版本回归测试';
  w.document.querySelector('#stFbSubmit').click(); await tick();
  assert.equal(calls.find(c => c.action === 'feedback_submit').context.appVersion, 'v8.1');
  assert.equal(calls.find(c => c.eventType === 'version_before_check').context.appVersion, 'v8.0', 'never relabel already-created events');
  assert.deepEqual(errors, []); w.close();
  console.log('PASS: actual bundle initial version, release/meta sync, feature and legacy events, live fallback and feedback');
}
async function staleAssets() {
  const dom = new JSDOM('<meta name="application-version" content="v7.0"><script src="/old.js"></script><footer id="app-version-v17"></footer>', {url:'https://version.test/', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window; w.state={}; w.setInterval=()=>1; w.__scoreTrackerTrack=()=>Promise.resolve();
  w.fetch = async (url, options={}) => String(url).includes('__cb')
    ? {ok:true, text:async()=>'<meta name="application-version" content="v8.0"><script src="/new.js"></script>'}
    : {ok:true, json:async()=>({config:{version:'v8.0',enabled:false,content:'新版'}})};
  w.eval(read('release-notices.js')); await tick(); await w.__releaseNotices.check('boot');
  assert.equal(w.__releaseNotices.currentVersion(), 'v7.0');
  assert.equal(w.document.querySelector('meta[name="application-version"]').content, 'v7.0');
  assert(w.document.querySelector('footer').textContent.includes('v7.0')); w.close();
  console.log('PASS: genuinely stale assets remain the old version; publishing a newer release does not relabel an old client');
}
(async()=>{ await bundled(); await staleAssets(); })().catch(e=>{console.error(e);process.exitCode=1;});
