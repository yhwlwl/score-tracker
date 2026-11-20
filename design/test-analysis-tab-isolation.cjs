const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 80));
(async () => {
  const errors = [], vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!error.message.includes('CSS')) errors.push(error.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://fixture.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.scrollTo = () => {}; w.setInterval = () => 1; w.confirm = () => true; w.AbortController = AbortController;
  w.fetch = async (url, options) => {
    const body = JSON.parse(options?.body || '{}');
    const data = String(url).includes('paper-review') ? { reviews: [], drafts: [], has_more: false } : { ok: true, modules: [], exams: [], subjects: [], enabled: false };
    if (body.action === 'quota') data.quota = { enabled: true, remaining: 3, limit: 3, global_available: true };
    return new Response(JSON.stringify(data));
  };
  try {
    w.eval(read('app-bundle.js') + '\nwindow.state=state;');
    for (const name of ['app-v36.js', 'app-v37.js', 'app-v38.js']) w.eval(read(name));
    await settle();
    Object.assign(w.state, { user: { id: '00000000-0000-4000-8000-000000000001', username: 'fixture' }, token: 'fixture', exams: [], allExams: [], modulesV18: [], page: 'stats', analysisTab: 'ai' });
    w.render(); await settle();
    for (let i = 0; i < 3; i++) {
      assert(d.querySelector('.ph-workspace'));
      assert.equal(d.querySelectorAll('#dsbRoot').length, 0, 'AI tab must not mount legacy deep analysis');
      const unrelated = d.createElement('div'); d.body.appendChild(unrelated); unrelated.remove();
      await settle();
      assert.equal(d.querySelectorAll('#dsbRoot').length, 0, 'late mutation callbacks must respect the active subtab');
      d.querySelector('[data-analysis-tab="stats"]').click(); await settle();
      assert(d.querySelector('.sv31-page'));
      assert.equal(d.querySelectorAll('#dsbRoot').length, 1, 'score analysis keeps its existing deep-analysis module');
      assert.equal(d.querySelectorAll('.ph-workspace').length, 0);
      d.querySelector('[data-analysis-tab="ai"]').click(); await settle();
    }
    assert.equal(d.querySelectorAll('#dsbRoot').length, 0);
    assert.deepEqual(errors, []);
    console.log('PASS: AI/score tab isolation, deferred mounts, mutation callbacks, repeated switching and preserved deep analysis');
  } finally { w.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
