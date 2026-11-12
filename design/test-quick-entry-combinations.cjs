/* Production scripts and DOM events, with a synthetic account and isolated HTTP fixture. */
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { html, server, modules } = require('./test-quick-entry-combinations-browser.cjs');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await wait(20); } throw new Error('UI did not reach expected state'); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const errors = [], timers = [], vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!/CSS|Not implemented/.test(error.message)) errors.push(error.message); });
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:' + server.address().port, resources: 'usable', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.Response = Response; w.Request = Request; w.fetch = fetch; w.AbortController = AbortController;
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} });
      w.scrollTo = () => {};
      const timeout = w.setTimeout.bind(w); w.setTimeout = (...args) => { const id = timeout(...args); timers.push(id); return id; }; w.setInterval = () => 1;
    }
  });
  const w = dom.window, d = w.document, $ = selector => d.querySelector(selector);
  const type = (input, value) => { input.value = value; input.dispatchEvent(new w.Event('input', { bubbles: true })); };
  function editor(saved = false) { d.querySelectorAll('.modal-backdrop').forEach(el => el.remove()); w.openExam(saved ? JSON.parse(JSON.stringify(w.qaState.allExams[0])) : null); $('.nl-entry-trigger').click(); $('[data-entry-tab="text"]').click(); }
  function natural(raw) { type($('.nl-entry-text'), raw); $('.nl-entry-submit').click(); }
  async function confirm(mode) { await until(() => $('.nl-entry-review')); if (mode) $('input[name="nl-fill-mode"][value="' + mode + '"]').checked = true; $('.nl-review-confirm').click(); await until(() => !$('.nl-entry-backdrop')); }
  function values() {
    const m = w.qaState.modal, math = [...m.querySelectorAll('.exam-subject-card-v10')].find(c => c.querySelector('.exam-subject-name-v10').value === '数学');
    return { math: math.querySelector('.actual-v16').value, max: math.querySelector('.max-v16').value, target: math.querySelector('.target-v16').value, rank: math.querySelector('.year-rank-v16').value, total: m.querySelector('#totalRankV16').value,
      combos: [...m.querySelectorAll('.combo-card-v21')].map(c => ({ id: c.dataset.comboId, rank: c.querySelector('.combo-yr-v25').value, people: c.querySelector('.combo-yp-v25').value })) };
  }
  try {
    await until(() => w.qaState); editor();
    const parse = raw => JSON.parse(JSON.stringify(w.__naturalEntryStudent.parse(raw, w.qaState.modal)));
    let p = parse('语数外物：年排17/620，班排3/48\n数学：真实128/150\n总分年排：50/620');
    assert.equal(p.modules[modules[1].name].yearRank, '17'); assert.equal(p.subjects['数学'].actual, '128'); assert.equal(p.total.yearRank, '50');
    p = parse('语文、数学、英语：年排11/620\n语数外：班排2/48');
    assert.equal(p.modules['语数外'].yearRank, '11'); assert.equal(p.modules['语数外'].classRank, '2'); assert.deepEqual(p.subjects, {});
    p = parse('理科重点：年排30/620\n物化地：年排8/200');
    assert.equal(p.modules['理科重点'].yearRank, '30'); assert.deepEqual(p.moduleDefinitions['物化地'].subjects, ['物理', '化学', '地理']);
    p = parse('语数外物：年级总排名17/620，参考人数620\n数学：年排30/620');
    assert.equal(p.total.yearRank, ''); assert.equal(p.total.yearParticipants, '');
    p = parse('数学：校次32/620\n总分年排：42/620'); assert.equal(p.subjects['数学'].actual, undefined); assert.equal(p.subjects['数学'].rank, '32');
    p = parse('语数外物：年排2/620；语数外：年排4/620；总分年排：40/620');
    assert.equal(p.modules[modules[1].name].yearRank, '2'); assert.equal(p.modules['语数外'].yearRank, '4'); assert.equal(p.total.yearRank, '40');
    p = parse('语数英物：校次18/620\n语数外史：年排9/300');
    assert.equal(p.modules[modules[1].name].yearRank, '18'); assert.equal(p.moduleDefinitions['语数外史'].id, '');
    const originalFour = w.qaState.modulesV18.find(m => m.id === 'four');
    originalFour.subjects = ['英语', '历史', '数学', '语文'];
    p = parse('语数外物：年排12/620\n语数英史：年排9/300');
    assert.equal(p.moduleDefinitions['语数外物'].id, '', 'changed built-in must not capture a different composition');
    assert.equal(p.moduleDefinitions[modules[1].name].id, 'four', 'same composition matches despite a different order');
    originalFour.subjects = ['语文', '数学', '英语', '物理'];
    console.log('PASS: composition aliases, custom combinations, longest match, duplicate merge, subject/total isolation');

    natural('数学：真实128/150\n语数外物：年排17/620'); await until(() => !$('.nl-entry-backdrop'));
    let result = values(); assert.equal(result.math, '128'); assert.deepEqual(result.combos, [{ id: 'four', rank: '17', people: '620' }]); assert.equal(result.total, '');
    assert.equal(w.qaCalls.filter(b => b.action === 'save_modules').length, 0);
    $('.nl-entry-trigger').click(); $('[data-entry-tab="text"]').click(); natural('数学：真实140/200，目标145\n物理：真实90/120\n语数外：年排20/620');
    await confirm('supplement'); result = values(); assert.equal(result.math, '128'); assert.equal(result.max, '150'); assert.equal(result.target, '145'); assert.equal(result.combos.find(c => c.id === 'four').rank, '17');
    assert.equal([...w.qaState.modal.querySelectorAll('.exam-subject-card-v10')].find(c => c.querySelector('.exam-subject-name-v10').value === '物理').querySelector('.max-v16').value, '120');
    $('.nl-entry-trigger').click(); $('[data-entry-tab="text"]').click(); natural('数学：真实0/150\n语数外物：年排10/620');
    await confirm('overwrite'); result = values(); assert.equal(result.math, '0'); assert.equal(result.target, '145'); assert.equal(result.combos.find(c => c.id === 'core').rank, '20');
    console.log('PASS: built-in reuse, supplement/overwrite, zero score, unaffected fields and combo rebuild cache');

    editor(true); const before = values(); natural('数学：真实140/150\n物化地：年排8/200');
    await until(() => $('.nl-entry-review')); assert.equal(w.qaCalls.filter(b => b.action === 'save_modules').length, 0);
    $('.nl-review-cancel').click(); assert.deepEqual(values(), before); assert($('.nl-entry-text').isConnected); await until(() => !$('.nl-entry-submit').disabled);
    natural('数学：真实140/150\n物化地：年排8/200'); await confirm('supplement'); result = values();
    assert.equal(result.math, before.math); assert(result.combos.some(c => c.id.startsWith('new-') && c.rank === '8'));
    const created = result.combos.find(c => c.id.startsWith('new-')).id;
    await w.saveExam(w.qaState.allExams[0].id, w.qaState.modal);
    const saved = w.qaCalls.find(b => b.action === 'save_exam').exam;
    assert(saved.moduleIds.includes(created)); assert.equal(String(saved.moduleRanks[created].yearRank), '8');
    console.log('PASS: explicit creation confirmation, cancellation preserves form, created combo ranking reaches exam-save payload');

    editor(true); w.qaFailSave = true; const failureBefore = values(); natural('数学：真实99/150\n语数外史：年排9/300');
    await until(() => $('.nl-entry-review')); $('.nl-review-confirm').click(); await until(() => $('.nl-entry-error').textContent.includes('模拟创建失败'));
    assert.deepEqual(values(), failureBefore); w.qaFailSave = false;
    natural('数学：真实99/150\n语数外史：年排9/300'); await until(() => $('[data-new-module]')); $('[data-new-module]').checked = false; await confirm('overwrite');
    assert.equal(values().math, '99'); assert.equal(w.qaModules.some(m => m.name === '语数外史'), false);
    console.log('PASS: creation failure is recoverable; users may skip a combination');

    editor(true); await until(() => !$('[data-entry-tab="image"]').hidden); $('[data-entry-tab="image"]').click();
    const file = $('.nl-entry-files'); Object.defineProperty(file, 'files', { value: [new w.File(['fixture'], 'fixture.png', { type: 'image/png' })] }); file.dispatchEvent(new w.Event('change'));
    await until(() => !$('.nl-entry-vision-submit').disabled); $('.nl-entry-vision-submit').click(); await until(() => !$('.nl-entry-vision-output').hidden);
    $('.nl-entry-vision-submit').click(); await confirm('supplement');
    assert.equal(values().math, '128'); assert.equal(values().combos.find(c => c.id === 'four').rank, '17'); assert.equal(w.qaCalls.filter(b => b.action === 'recognize').length, 1);
    console.log('PASS: image recognition uses the same supplement flow without a second recognition request');
    assert.deepEqual(errors, []);
  } catch (error) { console.error(error, $('.nl-entry-error')?.textContent, w.qaCalls.slice(-4)); throw error;
  } finally { await wait(300); timers.forEach(id => w.clearTimeout(id)); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
