// Verify the exam-only PR without the optional AI reader or backend fixtures.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), read = name => fs.readFileSync(path.join(root, name), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 35));
(async () => {
  const errors = [], calls = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://fixture.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  w.requestAnimationFrame = cb => w.setTimeout(() => cb(w.performance.now()), 16); w.cancelAnimationFrame = id => w.clearTimeout(id);
  w.setInterval = () => 1; w.confirm = () => true; w.AbortController = AbortController;
  w.fetch = async (url, opts) => { calls.push({ url: String(url), body: JSON.parse(opts?.body || '{}') }); return new Response(JSON.stringify({ ok: true, exams: [], subjects: [], modules: [], enabled: false })); };
  try {
    w.eval(read('app-bundle.js') + '\nwindow.state=state;');
    for (const file of ['app-v36.js','app-v37.js','app-v38.js']) w.eval(read(file));
    await tick(); delete w.ScorePaperReview;
    const exam = { id: 'exam-one', name: '期中 <script>bad()</script>', exam_date: '2026-10-20', is_hidden: true,
      total_rank: 25, total_participants: 500, total_class_rank: 3, total_class_participants: 50,
      scores: { 数学: { actual: 135, raw: 120, max: 150, rawMax: 150, target: 140, rank: 10, participants: 500 },
        语文: { actual: 120, max: 150, target: 115, rank: 300, participants: 500 },
        物理: { actual: 50, max: 100, target: 60, rank: 20, participants: 500 },
        英语: { actual: 60, max: 150, target: 90, rank: 450, participants: 500 },
        附加统计: { actual: 100, max: 100, rank: 1, participants: 500, excludeFromTotal: true } },
      moduleIds: ['combo'], moduleRanks: { combo: { yearRank: 40, yearParticipants: 500 } } };
    const sparse = { id: 'exam-two', name: '缺分', exam_date: '2026-10-23', scores: {
      数学: { actual: 0, target: 0, max: 150, rank: 20 }, 化学: { raw: 60, rawMax: 100, max: 70, target: 60 },
      生物: { raw: 80, rawMax: 100, max: 100, yearPositionPercent: 0 }, 历史: { actual: 80, max: 100, rank: 10, participants: 5 } } };
    Object.assign(w.state, { user: { id: 'fixture-owner', username: 'fixture' }, token: 'fixture-token', page: 'records',
      allExams: [exam, sparse], exams: [sparse], subjectConfigs: Object.keys(exam.scores).map(name => ({ name, defaultMax: exam.scores[name].max })),
      modulesV18: [{ id: 'combo', name: '语数', subjects: ['语文','数学'] }], scoreBasis: 'raw', subject: '英语', rankScopeV16: 'class', scoreViewV25: 'percent' });
    exam.averages = { 's:数学': { year: 100, class: 110, basis: w.ScoreAverages.basis(exam, '数学') } };
    w.render();
    assert.equal(d.querySelectorAll('[data-exam-detail]').length, 2); assert.equal(d.querySelectorAll('[data-edit]').length, 2);
    assert.equal(d.querySelectorAll('[data-hidden-toggle]').length, 2);
    d.querySelector('[data-exam-detail="exam-one"]').click(); await tick();
    assert.equal(d.querySelector('.ed-heading h1').textContent, exam.name); assert(!d.querySelector('.ed-heading script'));
    assert(d.querySelector('.ed-heading').textContent.includes('已从趋势图隐藏'));
    assert(d.querySelector('.desktop-nav [data-page="records"]').classList.contains('active'));
    assert.equal(d.querySelector('.ed-metric strong').textContent, '365');
    assert.equal(d.querySelectorAll('.ed-metric strong')[1].textContent, '66.4%');
    assert(d.querySelector('.ed-context').textContent.includes('还差 40 分'));
    assert.equal(d.querySelectorAll('.ed-table tbody tr').length, 5);
    assert(d.querySelector('.ed-table tbody tr').textContent.includes('高于均分 35 分'));
    assert(d.querySelector('.ed-combinations').textContent.includes('255 分'));
    assert(!d.querySelector('#ed-papers')); assert(!d.querySelector('[data-ed="jump:papers"]'));
    assert(!calls.some(c => c.url.includes('paper-review')), 'exam-only viewing never calls the optional AI service');
    d.querySelector('[data-ed-mode="performance"]').click();
    assert.equal(d.querySelectorAll('.ed-point-list button').length, 4);
    assert.equal(w.state.scoreBasis, 'raw'); assert.equal(w.state.rankScopeV16, 'class'); assert.equal(w.state.subject, '英语');
    d.querySelector('[data-ed="back"]').click();
    assert(!d.querySelector('.ed-page')); assert.equal(d.activeElement.dataset.examDetail, 'exam-one');
    w.ScoreExamDetail.open('exam-two');
    assert.equal(d.querySelector('.ed-metric strong').textContent, '160'); assert(d.querySelector('.ed-metric').textContent.includes('小计'));
    assert.equal(d.querySelectorAll('.ed-metric strong')[1].textContent, '—');
    assert(d.querySelector('.ed-table').textContent.includes('同满分原始分'));
    assert(d.querySelector('.ed-table tbody tr').textContent.includes('已达标'));
    assert(d.querySelector('#ed-quadrants').textContent.includes('名次与人数不一致'));
    sparse.total_actual_score = 999; w.renderPage();
    assert.equal(d.querySelector('.ed-metric strong').textContent, '999'); assert.equal(d.querySelectorAll('.ed-metric strong')[1].textContent, '—');
    delete sparse.total_actual_score; sparse.scores = {}; w.renderPage(); assert(d.querySelector('#ed-scores').textContent.includes('还没有科目数据'));
    w.state.user = { id: 'other-owner' }; w.state.token = 'other-token'; w.state.allExams = []; w.state.exams = []; w.render();
    assert(!d.querySelector('.ed-page')); await tick(); assert.deepEqual(errors, []);
    assert(!calls.some(c => ['start','resume','correct','save_exam'].includes(c.body.action)));
    console.log('PASS: standalone exam records, hidden exams, scores/ranks/averages/combinations, partial/zero/raw/manual totals, safe navigation and account changes without AI modules or writes');
  } finally { w.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
