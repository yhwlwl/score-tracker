/* Real browser + production assets; synthetic account and HTTP responses only. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { seed, pre } = require('./build-exam-detail-visual.cjs');
const root = path.resolve(__dirname, '..');
const output = process.env.QUICK_ENTRY_QA_OUTPUT || path.resolve(root, '../qa-quick-entry');
fs.mkdirSync(output, { recursive: true });
const modules = [
  { id: 'core', name: '语数外', subjects: ['语文', '数学', '英语'], isBuiltin: true },
  { id: 'four', name: '语数外 + 物理/历史（四科）', subjects: ['语文', '数学', '英语', '物理'], isBuiltin: true },
  { id: 'custom', name: '理科重点', subjects: ['物理', '化学'], isBuiltin: false }
];
const state = { ...seed, modulesV18: modules, subjectConfigs: ['语文', '数学', '英语', '物理', '化学', '历史', '地理'].map(name => ({ name, defaultMax: ['语文', '数学', '英语'].includes(name) ? 150 : 100 })) };
const api = `<script>
window.qaCalls=[];window.qaModules=${JSON.stringify(modules)};window.qaFailSave=false;
var oldFetch=window.fetch;window.fetch=async function(url,options){var b=JSON.parse(options&&options.body||'{}');qaCalls.push(b);var result;
if(b.action==='list_modules')result={modules:qaModules};
if(['bootstrap','list_exams'].includes(b.action))result={exams:${JSON.stringify(state.allExams)},subjects:${JSON.stringify(state.subjectConfigs)},modules:qaModules,user:${JSON.stringify(state.user)}};
if(b.action==='save_modules'){if(qaFailSave)return new Response(JSON.stringify({error:'模拟创建失败'}),{status:500});qaModules=b.modules.map((m,i)=>({...m,id:m.id||'new-'+i}));result={modules:qaModules};}
if(b.action==='beta_status')result={enabled:true,beta_only:false};
if(b.action==='quota')result={enabled:true,eligible:true,quota:{limit:20,used:0,remaining:20,global_remaining:100,service_enabled:true,retry_after_seconds:0}};
if(b.action==='readiness')result={ok:true,check:'service_readiness'};
if(b.action==='recognize')result={exam:{},subjects:[{name:'语数英物',components:['语文','数学','英语','物理'],yearRank:17,yearParticipants:620},{name:'数学',finalScore:133},{name:'任意组合标题',components:['英语','数学','语文'],yearRank:22},{name:'学科组合总分',components:['语文','数学','英语','物理','化学','生物'],yearRank:31}],warnings:[]};
if(b.action==='save_exam')result={ok:true,id:'saved',created:false};
return result?new Response(JSON.stringify(result)):oldFetch(url,options);};
</script>`;
const post = `<script>document.addEventListener('DOMContentLoaded',function(){Object.assign(state,${JSON.stringify(state)});localStorage.setItem('st_token',state.token);window.qaState=state;render();window.__stVisionImages={prepare:async()=>({images:['data:image/png;base64,AAAA'],parts:[],stats:[]})};});</script>`;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<head>', '<head>' + pre + api).replace('</body>', post + '</body>');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://fixture').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(html); }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
async function editor(page, saved = false) {
  await page.evaluate(saved => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    openExam(saved ? JSON.parse(JSON.stringify(qaState.allExams[0])) : null);
  }, saved);
  await page.locator('.nl-entry-trigger').click();
  await page.locator('[data-entry-tab="text"]').click();
}
async function natural(page, value) {
  await page.locator('.nl-entry-text').fill(value);
  await page.locator('.nl-entry-submit').click();
}
async function confirm(page, mode) {
  await page.waitForSelector('.nl-entry-review');
  if (mode) await page.locator('input[name="nl-fill-mode"][value="' + mode + '"]').check();
  await page.locator('.nl-review-confirm').click();
  await page.waitForSelector('.nl-entry-backdrop', { state: 'detached' });
}
async function values(page) {
  return page.evaluate(() => {
    const m = qaState.modal, math = [...m.querySelectorAll('.exam-subject-card-v10')].find(c => c.querySelector('.exam-subject-name-v10').value === '数学');
    return { math: math.querySelector('.actual-v16').value, target: math.querySelector('.target-v16').value, rank: math.querySelector('.year-rank-v16').value, name: m.querySelector('#examName').value, total: m.querySelector('#totalRankV16').value,
      combos: [...m.querySelectorAll('.combo-card-v21')].map(c => ({ id: c.dataset.comboId, rank: c.querySelector('.combo-yr-v25').value, people: c.querySelector('.combo-yp-v25').value })) };
  });
}
module.exports = { html, server, modules };
if (require.main === module) (async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => window.qaState);
    await editor(page);
    const parsed = await page.evaluate(() => {
      const parse = raw => window.__naturalEntryStudent.parse(raw, qaState.modal);
      return [
        parse('语数外物：年排17/620，班排3/48\n数学：真实128/150\n总分年排：50/620'),
        parse('语文、数学、英语：年排11/620\n语数外：班排2/48'),
        parse('理科重点：年排30/620\n物化地：年排8/200'),
        parse('语数外物：年级总排名17/620，参考人数620\n数学：年排30/620'),
        parse('数学：校次32/620\n总分年排：42/620'),
        parse('语数外物：年排2/620；语数外：年排4/620；总分年排：40/620'),
        parse('语数英物：校次18/620\n语数外史：年排9/300')
      ];
    });
    assert.equal(parsed[0].modules[modules[1].name].yearRank, '17');
    assert.equal(parsed[0].subjects['数学'].actual, '128');
    assert.equal(parsed[0].total.yearRank, '50');
    assert.equal(parsed[1].modules['语数外'].yearRank, '11');
    assert.equal(parsed[1].modules['语数外'].classRank, '2');
    assert.equal(Object.keys(parsed[1].subjects).length, 0);
    assert.equal(parsed[2].modules['理科重点'].yearRank, '30');
    assert.deepEqual(parsed[2].moduleDefinitions['物化地'].subjects, ['物理', '化学', '地理']);
    assert.equal(parsed[3].total.yearRank, '');
    assert.equal(parsed[3].total.yearParticipants, '');
    assert.equal(parsed[4].subjects['数学'].actual, undefined);
    assert.equal(parsed[4].subjects['数学'].rank, '32');
    assert.equal(parsed[5].modules[modules[1].name].yearRank, '2');
    assert.equal(parsed[5].modules['语数外'].yearRank, '4');
    assert.equal(parsed[5].total.yearRank, '40');
    assert.equal(parsed[6].moduleDefinitions['语数外史'].id, '');
    console.log('PASS: composition aliases, existing/custom combinations, longest match, duplicate field merge, and total/subject isolation');

    await natural(page, '数学：真实128/150\n语数外物：年排17/620');
    await page.waitForSelector('.nl-entry-backdrop', { state: 'detached' });
    let result = await values(page);
    assert.equal(result.math, '128'); assert.deepEqual(result.combos, [{ id: 'four', rank: '17', people: '620' }]);
    assert.equal(result.total, '');
    assert.equal(await page.evaluate(() => qaCalls.filter(b => b.action === 'save_modules').length), 0);

    await page.locator('.nl-entry-trigger').click(); await page.locator('[data-entry-tab="text"]').click();
    await natural(page, '数学：真实140/150，目标145\n语数外：年排20/620');
    await confirm(page, 'supplement'); result = await values(page);
    assert.equal(result.math, '128'); assert.equal(result.target, '145');
    assert.equal(result.combos.find(c => c.id === 'four').rank, '17');
    assert.equal(result.combos.find(c => c.id === 'core').rank, '20');

    await page.locator('.nl-entry-trigger').click(); await page.locator('[data-entry-tab="text"]').click();
    await natural(page, '数学：真实0/150\n语数外物：年排10/620');
    await confirm(page, 'overwrite'); result = await values(page);
    assert.equal(result.math, '0'); assert.equal(result.target, '145');
    assert.equal(result.combos.find(c => c.id === 'core').rank, '20');
    assert.equal(result.combos.find(c => c.id === 'four').rank, '10');
    console.log('PASS: existing built-in reused, supplement preserves old values and fills blanks, overwrite preserves absent fields and accepts zero');

    await editor(page, true); const before = await values(page);
    await natural(page, '数学：真实140/150\n物化地：年排8/200');
    await page.waitForSelector('.nl-entry-review');
    assert.equal(await page.evaluate(() => qaCalls.filter(b => b.action === 'save_modules').length), 0);
    await page.screenshot({ path: path.join(output, 'confirm-390.png') });
    await page.locator('.nl-review-cancel').click(); assert.deepEqual(await values(page), before);
    assert(await page.locator('.nl-entry-text').isVisible());
    await natural(page, '数学：真实140/150\n物化地：年排8/200');
    await confirm(page, 'supplement'); result = await values(page);
    assert.equal(result.math, before.math);
    assert(result.combos.some(c => c.id.startsWith('new-') && c.rank === '8'));
    assert.equal(await page.evaluate(() => qaCalls.filter(b => b.action === 'save_modules').length), 1);
    await page.evaluate(() => saveExam(qaState.allExams[0].id, qaState.modal));
    const saved = await page.evaluate(() => qaCalls.find(b => b.action === 'save_exam').exam);
    const createdId = result.combos.find(c => c.id.startsWith('new-')).id;
    assert(saved.moduleIds.includes(createdId)); assert.equal(String(saved.moduleRanks[createdId].yearRank), '8');
    console.log('PASS: creation requires confirmation, cancellation changes nothing, confirmed combination and its ranking use the existing exam-save payload');

    await editor(page, true); await page.evaluate(() => { qaFailSave = true; });
    const failureBefore = await values(page);
    await natural(page, '数学：真实99/150\n语数外史：年排9/300');
    await page.locator('.nl-review-confirm').click();
    await page.waitForFunction(() => document.querySelector('.nl-entry-error').textContent.includes('模拟创建失败'));
    assert.deepEqual(await values(page), failureBefore);
    await page.evaluate(() => { qaFailSave = false; });
    await natural(page, '数学：真实99/150\n语数外史：年排9/300');
    await page.locator('[data-new-module]').uncheck(); await confirm(page, 'overwrite');
    assert.equal((await values(page)).math, '99');
    assert.equal(await page.evaluate(() => qaModules.some(m => m.name === '语数外史')), false);
    console.log('PASS: failed creation leaves form untouched; users may skip a new combination and still apply scores');

    await editor(page, true); await page.locator('[data-entry-tab="image"]').click();
    await page.locator('.nl-entry-files').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture') });
    await page.locator('.nl-entry-vision-submit').click();
    await page.waitForSelector('.nl-entry-vision-output', { state: 'visible' });
    await page.locator('.nl-entry-vision-submit').click(); await confirm(page, 'supplement');
    assert.equal((await values(page)).math, '128');
    assert.equal((await values(page)).combos.find(c => c.id === 'four').rank, '17');
    assert.equal(await page.evaluate(() => qaCalls.filter(b => b.action === 'recognize').length), 1);
    console.log('PASS: image result → common confirmation → supplement, without a second recognition/quota call');

    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await editor(page, true); await natural(page, '数学：真实140/150\n语数外史地：年排8/200');
      await page.waitForSelector('.nl-entry-review');
      assert(await page.evaluate(() => { const m = document.querySelector('.nl-entry-review .modal'); return m.scrollWidth <= m.clientWidth + 1 && m.getBoundingClientRect().right <= innerWidth; }));
      await page.screenshot({ path: path.join(output, 'confirm-' + width + '.png') });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: no browser errors; confirmation fits 320/390/1280px. Screenshots:', output);
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
