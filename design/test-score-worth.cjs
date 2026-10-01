/* NODE_PATH=<directory containing jsdom> node design/test-score-worth.cjs */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8'), tick = () => new Promise(r => setTimeout(r, 35));
const logistic = x => 1 / (1 + Math.exp(-x)), logOdds = p => Math.log(p / (1 - p));
// Independent normal CDF values (not obtained from the production inverse-normal helper).
const positions = [84.134474607, 69.146246127, 50, 30.853753873, 15.865525393], zValues = [-1, -0.5, 0, 0.5, 1];
function exam(i, score = 88, position = 50.05, max = 100, extra = {}) {
  return { id: 'e' + i, name: '第' + i + '次月考', exam_date: new Date(Date.UTC(2026, 0, i * 7 + 1)).toISOString().slice(0, 10), grade_level: '高二', total_participants: 1000,
    scores: { 物理: { actual: score, max, yearPositionPercent: position, participants: 1000 }, 数学: { actual: max * 0.8, max, yearPositionPercent: position, participants: 1000 } }, ...extra };
}
function balanced(repeat = 1) {
  const a = []; for (let t = 0; t < repeat; t++) for (let i = 0; i < zValues.length; i++) for (const d of [-0.25, 0, 0.25]) {
    const max = a.length % 2 ? 150 : 100, e = exam(a.length, max * logistic(1 + 0.75 * zValues[i] - d), positions[i] + 0.05, max);
    e.truth = { z: zValues[i], difficulty: d }; a.push(e);
  } return a;
}
function isolated() {
  const dom = new JSDOM('<main></main>', { runScripts: 'outside-only', url: 'https://worth.test/' }), w = dom.window;
  w.state = { user: { id: 'test' } }; w.eval(read('score-worth-model.js')); w.eval(read('score-worth.js'));
  return { w, api: w.__stScoreWorth, model: w.__stScoreWorthModel, close: () => w.close() };
}
function check(title, fn) { fn(); console.log('PASS: ' + title); }
async function run() {
  const h = isolated(), c = h.model.compare;
  check('no nearby-rank requirement; uses the full score/rank scale across different full marks', () => {
    const a = balanced(); const r = c(a, '物理', 14); assert.equal(r.kind, 'estimate'); assert.equal(r.modelN, 15); assert.equal(r.references.length, 15);
    assert(Math.abs(r.model.b - 0.75) < 0.003); assert(Math.abs(r.referenceDifficulty - 50) < 1e-9);
    const spaced = [exam(0, 50, 90), exam(1, 60, 70), exam(2, 72, 50), exam(3, 82, 30), exam(4, 90, 10)];
    assert.equal(c(spaced, '物理', 2).kind, 'estimate'); assert(!spaced.some((e, i) => i !== 2 && Math.abs(e.scores.物理.yearPositionPercent - 50) <= 2));
  });
  check('independent known-difficulty simulation recovers reference scores, directions and the scale', () => {
    const a = balanced(2);
    for (let i = 0; i < a.length; i++) {
      const r = c(a, '物理', i), expected = a[i].scores.物理.max * logistic(1 + 0.75 * a[i].truth.z);
      assert(Math.abs(r.value - expected) < 0.15, JSON.stringify({ i, value: r.value, expected }));
      assert(Math.abs(r.difficulty - 100 * logistic(a[i].truth.difficulty)) < 0.15);
      assert(r.low <= r.value && r.value <= r.high);
    }
  });
  check('72 converts to 88 on the selected exam, without pretending the actual score changed', () => {
    const a = [exam(0, 80), exam(1, 88), exam(2, 90), exam(3, 72)], r = c(a, '物理', 3, { mode: 'exam', exam: 1 });
    assert.equal(r.kind, 'estimate'); assert(Math.abs(r.value - 88) < 1e-9); assert.equal(r.current.score, 72); assert(r.difficulty > r.referenceDifficulty); assert.equal(r.quality, 'limited');
  });
  check('period boundaries are inclusive; average difficulty is not an arithmetic average of scores', () => {
    const a = [exam(0, 80), exam(1, 90), exam(2, 72), exam(3, 88)];
    const r = c(a, '物理', 2, { mode: 'period', start: a[0].exam_date, end: a[1].exam_date });
    const expected = 100 * logistic((logOdds(0.8) + logOdds(0.9)) / 2);
    assert.equal(r.references.length, 2); assert(Math.abs(r.value - expected) < 1e-9); assert(Math.abs(r.value - 85) > 0.5);
    for (const options of [{ start: '', end: a[1].exam_date }, { start: '2026-02-30', end: '2026-03-01' }, { start: a[1].exam_date, end: a[0].exam_date }, { start: '2030-01-01', end: '2030-02-01' }]) assert.equal(c(a, '物理', 2, { mode: 'period', ...options }).kind, 'empty');
  });
  check('one ruler: identity, conversion signs, exam reference units and log-odds transitivity', () => {
    const a = balanced(), i = 2, j = 6, k = 10;
    for (const x of [i, j, k]) { const r = c(a, '物理', x, { mode: 'exam', exam: x }); assert.equal(r.value, a[x].scores.物理.actual); assert.equal(r.low, r.high); }
    const ij = c(a, '物理', i, { mode: 'exam', exam: j }), jk = c(a, '物理', j, { mode: 'exam', exam: k }), ik = c(a, '物理', i, { mode: 'exam', exam: k });
    assert.equal(ij.targetMax, a[j].scores.物理.max); assert(Math.abs(ij.offset + jk.offset - ik.offset) < 1e-10);
    assert(Math.abs(logOdds(ij.value / ij.targetMax) - logOdds(a[i].scores.物理.actual / a[i].scores.物理.max) - ij.offset) < 1e-10);
    const cells = h.model.cells(a, ['物理']); assert(Math.abs(cells[i + '|物理'].index - ij.difficulty) < 1e-9);
  });
  check('zero/full scores stay bounded; self-comparison keeps exact endpoints even without ranks', () => {
    for (const value of [0, 100]) {
      const a = [exam(0, 80), exam(1, 88), exam(2, value)]; const r = c(a, '物理', 2); assert(r.value >= 0 && r.value <= r.targetMax); assert.equal(r.quality, 'limited');
      delete a[2].scores.物理.yearPositionPercent; assert.equal(c(a, '物理', 2).kind, 'empty'); assert.equal(c(a, '物理', 2, { mode: 'exam', exam: 2 }).value, value);
    }
  });
  check('Huber fitting limits an abnormal exam; weak/negative relationships remain visibly qualified', () => {
    const points = Array.from({ length: 25 }, (_, i) => ({ z: (i - 12) / 8, y: 1 + 0.7 * (i - 12) / 8 })); points[18].y = -5;
    const fit = h.model.fit(points); assert(Math.abs(fit.b - 0.7) < 0.03, fit.b);
    const weak = [exam(0, 90, 80), exam(1, 80, 60), exam(2, 70, 40), exam(3, 60, 20)]; const r = c(weak, '物理', 3);
    assert.equal(r.quality, 'limited'); assert.equal(r.model.b, 0); assert(r.warnings.some(x => x.includes('关系较弱')));
  });
  check('categories and a clear cohort break get separate rulers and cannot serve as cross-group references', () => {
    const a = [exam(0), exam(1), exam(2), exam(3), exam(4), exam(5)]; for (let i = 3; i < 6; i++) a[i].scores.物理.participants = 500;
    assert.equal(c(a, '物理', 5).modelN, 3); assert.equal(c(a, '物理', 5, { mode: 'exam', exam: 0 }).kind, 'empty');
    a[2].grade_level = '高一'; assert.equal(c(a, '物理', 0).kind, 'empty');
  });
  check('invalid input is not clamped, total rank is not used as a subject rank; missing population can fall back', () => {
    for (const fields of [{ actual: null }, { actual: false }, { actual: ' ' }, { actual: -1 }, { actual: 101 }, { max: 0 }, { participants: 'bad' }, { participants: true }, { participants: 1e20 }, { participants: 0 }, { participants: 29 }, { participants: 1000.5 }, { yearPositionPercent: 'bad', rank: 50 }, { yearPositionPercent: 0 }, { yearPositionPercent: -1 }, { yearPositionPercent: 101 }]) {
      const a = [exam(0), exam(1), exam(2, 72)]; Object.assign(a[2].scores.物理, fields); assert.equal(c(a, '物理', 2).kind, 'empty', JSON.stringify(fields));
    }
    const a = [exam(0), exam(1), exam(2)]; delete a[2].scores.物理.yearPositionPercent; a[2].total_rank = 100; assert.equal(c(a, '物理', 2).kind, 'empty');
    a[2].scores.物理.rank = 500; delete a[2].scores.物理.participants; assert.equal(c(a, '物理', 2).kind, 'estimate');
  });
  check('duplicate exams are not extra evidence; cache invalidates when any measured field changes', () => {
    const a = [exam(0), exam(1), exam(2), exam(2, 72)]; assert.equal(c(a, '物理', 3).modelN, 3); assert.equal(c(a, '物理', 2).kind, 'empty');
    const ctx = h.model.context(a, '物理'); assert.equal(h.model.context(a, '物理'), ctx);
    a[3].scores.物理.actual = 70; assert.notEqual(h.model.context(a, '物理'), ctx); const before = JSON.stringify(a); c(a, '物理', 3); assert.equal(JSON.stringify(a), before);
  });
  check('retrospective scale is order invariant and historical reference can explicitly use newer recorded exams', () => {
    const a = balanced(), b = a.slice().reverse(), i = 4;
    const one = c(a, '物理', i), two = c(b, '物理', b.findIndex(e => e.id === a[i].id)); assert(Math.abs(one.value - two.value) < 1e-9);
    assert(one.references.some(p => p.day > one.current.day)); assert.equal(c(a, '物理', 0, { mode: 'exam', exam: 14 }).kind, 'estimate');
  });
  check('large histories use bounded sensitivity work, with all records still in the fitted scale', () => {
    const a = balanced(14), start = Date.now(), r = c(a, '物理', 100); assert.equal(r.modelN, 210); assert.equal(r.references.length, 210); assert.equal(r.sensitivityRuns, 80);
    assert(Number.isFinite(r.value)); assert.equal(h.model.context(a, '物理').byIndex[100].group.slopes.length, 80); console.log('  210-exam scale + sensitivity: ' + (Date.now() - start) + 'ms');
  });
  h.close();

  const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://worth.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc }), w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} }); w.setInterval = () => 1; w.scrollTo = () => {};
  w.fetch = async () => new Response(JSON.stringify({ config: { enabled: false }, seen: [] })); w.eval(read('app-bundle.js') + '\nwindow.state=state;'); await tick();
  const events = []; w.__stTrack = (name, metadata) => events.push({ name, metadata }); const a = balanced();
  Object.assign(w.state, { user: { id: 'fixture' }, exams: a, allExams: a, unfilteredVisibleExamsV13: a, page: 'stats', sv31: { scope: '__all__', mode: 'rank' } });
  d.getElementById('app').innerHTML = '<div id="content"></div>'; w.__v32.rerender(); await tick();
  function change(name, value) { const control = d.querySelector('[data-worth-control="' + name + '"]'); assert(control, name); control.value = value; control.dispatchEvent(new w.Event('change', { bubbles: true })); }
  check('actual bundle mounts a single card in the original position, with history as the default', () => {
    const card = d.getElementById('scoreWorthCard'); assert.equal(card.dataset.worthResult, 'estimate'); assert.equal(d.querySelectorAll('#scoreWorthCard').length, 1);
    assert(d.querySelector('.sv31-kpi').compareDocumentPosition(card) & w.Node.DOCUMENT_POSITION_FOLLOWING); assert.equal(d.querySelector('[data-worth-mode="history"]').getAttribute('aria-pressed'), 'true');
    assert(card.textContent.includes('不是预测区间或置信区间')); assert(card.textContent.includes('实际成绩不会改变'));
  });
  check('history, period and specific-exam controls affect the real displayed result and preserve focus', () => {
    const history = d.querySelector('.worth-reference strong').textContent;
    d.querySelector('[data-worth-mode="exam"]').click(); change('reference', '0'); assert.notEqual(d.querySelector('.worth-reference strong').textContent, history); assert.equal(d.activeElement.dataset.worthControl, 'reference');
    d.querySelector('[data-worth-mode="period"]').click(); change('start', a[0].exam_date); change('end', a[2].exam_date); assert(d.querySelector('.worth-difficulty').textContent.includes('3'));
    change('start', ''); assert.equal(d.getElementById('scoreWorthCard').dataset.worthResult, 'empty'); assert.equal(d.querySelector('[data-worth-control="start"]').value, '');
    change('start', a[0].exam_date); assert.equal(d.getElementById('scoreWorthCard').dataset.worthResult, 'estimate'); assert.equal(w.state.sv31.scope, '__all__');
    d.querySelector('[data-worth-reference="1"]').click(); assert.equal(d.querySelector('[data-worth-control="reference"]').value, '1');
  });
  check('matrix difficulty view uses exactly the card ruler, marks weak cells, and retains the original view', () => {
    d.querySelector('[data-worth-matrix-mode="difficulty"]').click(); const button = d.querySelector('[data-worth-matrix="14"][data-worth-subject="物理"]'); assert(button);
    assert.equal(d.activeElement.dataset.worthMatrixMode, 'difficulty');
    const expected = w.__stScoreWorthModel.cells(a, ['物理'])['14|物理'].index; assert(button.textContent.startsWith(String(Math.round(expected * 10) / 10)));
    assert.equal(Number(button.parentElement.dataset.worthHeat), expected); assert(button.parentElement.style.background.includes('rgb')); assert(!button.querySelector('.worth-difficulty-meter'));
    assert(button.getAttribute('aria-label').includes('物理，难度参考')); assert(d.querySelector('.worth-heat-labels').textContent.includes('50 · 平均'));
    button.click(); assert.equal(d.querySelector('[data-worth-control="exam"]').value, '14'); assert.equal(d.activeElement.id, 'scoreWorthCard'); assert.equal(d.querySelector('.worth-difficulty b').textContent, String(Math.round(expected * 10) / 10));
    d.querySelector('[data-worth-matrix-mode="original"]').click(); assert(!d.querySelector('.sv31-heat').textContent.includes('参考较弱')); assert(d.querySelector('[data-worth-matrix="14"]'));
  });
  change('subject', '数学'); change('exam', '0'); d.querySelector('[data-worth-mode="history"]').click();
  const details = d.querySelector('.worth-evidence'); details.open = true; await tick();
  d.querySelector('.worth-method').open = true; await tick();
  check('telemetry covers all new controls without scores, dates, exam/subject names or IDs', () => {
    for (const name of ['score_worth_view', 'score_worth_selection', 'score_worth_reference_mode', 'score_worth_reference_selected', 'score_worth_matrix_metric', 'score_worth_matrix_open', 'score_worth_evidence_open']) assert(events.some(e => e.name === name), name);
    for (const source of ['records', 'method']) assert(events.some(e => e.name === 'score_worth_evidence_open' && e.metadata.source === source));
    const allowed = ['source', 'result', 'reference_mode', 'model_count', 'reference_count', 'quality', 'version', 'control', 'mode', 'view'];
    for (const e of events.filter(e => e.name.startsWith('score_worth'))) assert(Object.keys(e.metadata).every(k => allowed.includes(k)));
    const text = JSON.stringify(events.filter(e => e.name.startsWith('score_worth'))); for (const secret of ['物理', '数学', '月考', '2026-', 'fixture']) assert(!text.includes(secret));
  });
  check('six themes, score mode, subject/category scope and mobile CSS rules remain supported', () => {
    for (const theme of ['sunny', 'paper', 'sakura', 'violet', 'mint', 'night']) {
      w.__v29.applyTheme(theme, true); assert.equal(w.__v29.currentTheme(), theme); assert.equal(d.querySelectorAll('#scoreWorthCard').length, 1);
      assert.notEqual(w.__stScoreWorth.heatColor(47).background, w.__stScoreWorth.heatColor(68).background);
    }
    w.state.sv31.mode = 'score'; w.state.sv31.matrixWorth = 'difficulty'; w.__v32.rerender(); assert(d.querySelector('[data-worth-matrix="14"]'));
    w.state.sv31.subjMod = ['数学']; w.__v32.rerender(); assert.equal(d.querySelector('[data-worth-control="subject"]').options.length, 1); assert.equal(d.querySelector('[data-worth-control="subject"]').value, '数学');
    w.state.sv31.scope = '高一'; w.__v32.rerender(); assert(!d.querySelector('#scoreWorthCard')); assert.deepEqual(errors, []);
    const css = d.getElementById('score-worth-style').textContent; assert(css.includes('@media(max-width:480px)')); assert(!css.includes('#fff')); assert(css.includes('minmax(0,1fr)')); assert(css.includes('max-height:280px'));
  }); dom.window.close();

  const simple = isolated();
  check('small-history warning is plain language; recomputation range stays inside closed evidence', () => {
    const main = simple.w.document.querySelector('main');
    main.innerHTML = simple.api.html({ exams: [exam(0, 80), exam(1, 88), exam(2, 72)], subjects: ['物理'] });
    assert.equal(main.querySelector('.worth-stability').textContent, '仅 3 场记录，先作参考。');
    assert(!main.querySelector('.worth-stability').textContent.includes('77–'));
    assert(!main.querySelector('.worth-stability').textContent.includes('预测区间'));
    const evidence = main.querySelector('.worth-method'); assert(!evidence.open); assert(evidence.querySelector('.worth-sensitivity').textContent.includes('不说明分数一定准确'));
    const records = main.querySelector('.worth-records'); assert(!records.open); assert(!records.querySelector('.worth-note')); assert(records.querySelector('table'));
    assert.equal(main.querySelectorAll('.worth-card > .worth-difficulty').length, 0);
    assert(Array.from(main.querySelectorAll('p')).filter(p => !p.closest('details')).every(p => p.textContent.length < 45));
    assert(!main.querySelector('.worth-stability').textContent.includes('斜率'));
  });
  check('fixed 0–100 heat scale stays monotonic with readable numbers across six live themes', () => {
    const palettes = { sunny: ['#5d72e8', '#ffffff'], paper: ['#8c713e', '#fffdf6'], sakura: ['#c06b8e', '#fff8fb'], violet: ['#735bb6', '#faf8ff'], mint: ['#278875', '#f5fffb'], night: ['#92a6ff', '#172033'] };
    function luma(rgb) { const v = rgb.map(n => { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return .2126*v[0]+.7152*v[1]+.0722*v[2]; }
    const main = simple.w.document.querySelector('main'); main.innerHTML = '<td data-worth-heat="50"></td><div data-worth-heat="50"></div><div data-worth-heat-ramp></div>';
    for (const [accent, panel] of Object.values(palettes)) {
      const style = simple.w.document.documentElement.style; style.setProperty('--accent', accent); style.setProperty('--panel-solid', panel);
      let previousDistance = -1;
      const p = panel.slice(1).match(/../g).map(h => parseInt(h, 16));
      for (let v = 0; v <= 100; v++) {
        const c = simple.api.heatColor(v), channels = c.background.match(/\d+/g).map(Number);
        const distance = channels.reduce((sum, n, i) => sum + Math.abs(n-p[i]), 0); assert(distance >= previousDistance); previousDistance = distance;
        const lum = luma(channels), foreground = c.color === '#000000' ? 0 : 1; assert((Math.max(lum, foreground)+.05)/(Math.min(lum, foreground)+.05) >= 4.5);
      }
      assert.notEqual(simple.api.heatColor(47).background, simple.api.heatColor(68).background);
      assert(simple.api.heatRamp().startsWith('linear-gradient(90deg,'));
    }
  });
  await tick();
  assert.equal(simple.w.document.querySelector('[data-worth-heat]').style.background, simple.api.heatColor(50).background.replaceAll(',', ', '));
  assert(simple.w.document.querySelector('[data-worth-heat-ramp]').style.background.includes('linear-gradient'));
  simple.close();

  const denseDom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://worth.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const dense = denseDom.window; dense.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); dense.setInterval = () => 1; dense.scrollTo = () => {};
  dense.fetch = async () => new Response(JSON.stringify({ config: { enabled: false }, seen: [] })); dense.eval(read('app-bundle.js')+'\nwindow.state=state;'); await tick();
  check('54-exam matrix retains every row, full names, sticky axes and missing cells without repeated warning text', () => {
    const all = balanced(4).slice(0, 54); all[0].name = '十二月份阶段性测试（非常长的考试名称，用于手机显示检查）'; delete all[10].scores.物理;
    Object.assign(dense.state, { user: { id: 'dense' }, exams: all, allExams: all, unfilteredVisibleExamsV13: all, page: 'stats', sv31: { scope: '__all__', mode: 'rank', matrixWorth: 'difficulty' } });
    dense.document.getElementById('app').innerHTML = '<div id="content"></div>'; dense.__v32.rerender();
    const table = dense.document.querySelector('.worth-matrix-table'); assert.equal(table.tBodies[0].rows.length, 54);
    assert.equal(table.querySelector('.worth-exam-name').title, all[0].name); assert.equal(table.querySelector('.worth-exam-name').textContent, all[0].name);
    assert.equal(table.querySelector('col').style.width, '136px'); assert.equal(table.querySelectorAll('thead th').length, 3); assert(table.style.minWidth.endsWith('px'));
    assert.equal(table.querySelector('[data-worth-matrix="10"][data-worth-subject="物理"]').textContent, '—');
    assert(!table.textContent.includes('参考较弱')); assert(!table.textContent.includes('先作参考'));
    assert(new Set(Array.from(table.querySelectorAll('[data-worth-heat]'), cell => cell.style.background)).size > 3);
    const css = dense.document.getElementById('score-worth-style').textContent;
    for (const rule of ['table-layout:fixed', 'left:0', 'top:0', '-webkit-line-clamp:2', 'overflow:auto', 'max-height:420px', 'min-height:44px']) assert(css.includes(rule), rule);
    assert(!css.includes('touch-action:pan-x')); assert.equal(table.parentElement.getAttribute('tabindex'), '0');
    dense.state.exams = all.slice(0, 5); dense.state.allExams = dense.state.exams; dense.state.unfilteredVisibleExamsV13 = dense.state.exams; dense.__v32.rerender();
    assert(dense.document.querySelector('.worth-heat-limited')); assert(dense.document.querySelector('.worth-heat-limited').closest('button').getAttribute('aria-label').includes('粗略参考'));
  }); denseDom.window.close();

  const v = isolated(), views = [], observers = []; v.w.__stTrack = (name, metadata) => views.push({ name, metadata });
  v.w.IntersectionObserver = class { constructor(cb) { this.cb = cb; this.disconnected = false; observers.push(this); } observe(node) { this.node = node; } disconnect() { this.disconnected = true; } };
  const feature = { exams: [exam(0), exam(1), exam(2, 72)], subjects: ['物理'] }, page = v.w.document.querySelector('main');
  page.innerHTML = '<div>' + v.api.html(feature) + '</div>'; v.api.bind(page.firstElementChild, feature); assert.equal(views.length, 0);
  observers[0].cb([{ isIntersecting: false }]); assert.equal(views.length, 0); observers[0].cb([{ isIntersecting: true }]); assert.equal(views.length, 1); assert(observers[0].disconnected);
  page.innerHTML = '<div>' + v.api.html(feature) + '</div>'; v.api.bind(page.firstElementChild, feature); page.innerHTML = ''; await tick(); assert(observers[1].disconnected);
  check('offscreen exposure and observer cleanup; escaped text, pending default and separate accounts', () => {
    v.w.state.user.id = 'escape'; const ex = [exam(0), exam(1), exam(2, 72, 50.05, 100, { name: '<img src=x onerror=alert(1)>' }), exam(3)]; ex[3].scores = {};
    page.innerHTML = v.api.html({ exams: ex, subjects: ['物理'] }); assert(!page.querySelector('img')); assert.equal(page.querySelector('[data-worth-control="exam"]').value, '2');
    v.w.state.user.id = 'another'; page.innerHTML = v.api.html({ exams: [exam(0)], subjects: ['数学'] }); assert.equal(page.querySelector('[data-worth-control="subject"]').value, '数学');
  }); v.close();
  console.log('All model and DOM checks passed. These do not establish population difficulty accuracy or mobile visual acceptance.');
}
run().catch(e => { console.error(e); process.exitCode = 1; });
