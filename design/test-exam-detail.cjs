// Exercise the shipped app and actual paper handler; synthetic data, no real account or model calls.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { IDBFactory } = require('fake-indexeddb');
const { harness, uid, examId, input, rid } = require('./test-paper-review.cjs');
const root = path.resolve(__dirname, '..'), read = name => fs.readFileSync(path.join(root, name), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 25));
async function until(fn) { for (let n = 0; n < 150; n++) { if (fn()) return; await tick(); } throw new Error('UI did not settle'); }
(async () => {
  const h = harness(); await h.init();
  assert.equal((await h.call({ action: 'start', ...input, exam_id: examId, options: { purpose: 'record' } })).status, 202);
  await h.drain();
  const paper = h.tables.score_tracker_paper_reviews[0]; assert.equal(paper.status, 'succeeded');
  paper.title = '数学试卷 <img src=x onerror=alert(1)>'; paper.created_at = '2026-10-22T09:00:00Z';
  const extraId = '00000000-0000-4000-8000-000000000088';
  h.tables.score_tracker_exams.push({ id: extraId, user_id: uid });
  for (let n = 0; n < 50; n++) h.tables.score_tracker_paper_reviews.push({ ...structuredClone(paper), request_id: '10000000-0000-4000-8000-' + String(n).padStart(12, '0'), title: '历次核对 ' + n });
  h.tables.score_tracker_paper_reviews.push({ ...structuredClone(paper), request_id: extraId, exam_id: extraId, title: '另一场考试的试题' });
  const exam = { id: examId, name: '高二期中 <script>bad()</script>', exam_date: '2026-10-20', end_date: '2026-10-22', grade_level: '高二', is_hidden: true,
    total_rank: 25, total_participants: 500, total_class_rank: 3, total_class_participants: 50, city_rank: 60, city_participants: 1000,
    scores: {
      数学: { actual: 135, raw: 120, max: 150, rawMax: 150, target: 140, rank: 10, participants: 500, classRank: 2, classParticipants: 50 },
      语文: { actual: 120, max: 150, target: 115, rank: 300, participants: 500, classRank: 5, classParticipants: 50 },
      物理: { actual: 50, max: 100, target: 60, rank: 20, participants: 500, classRank: 30, classParticipants: 50 },
      英语: { actual: 60, max: 150, target: 90, rank: 450, participants: 500, classRank: 40, classParticipants: 50 },
      附加统计: { actual: 100, max: 100, rank: 1, participants: 500, excludeFromTotal: true }
    }, moduleIds: ['combo'], moduleRanks: { combo: { yearRank: 40, yearParticipants: 500 } } };
  const second = { id: extraId, name: '第二场考试', exam_date: '2026-10-23', scores: {} };
  const calls = [], errors = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://fixture.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  w.requestAnimationFrame = callback => w.setTimeout(() => callback(w.performance.now()), 16);
  w.cancelAnimationFrame = id => w.clearTimeout(id);
  w.setInterval = () => 1; w.confirm = () => true; w.AbortController = AbortController; w.indexedDB = new IDBFactory();
  let failList = false, delayList = false, release;
  w.fetch = async (url, opts) => {
    const body = JSON.parse(opts && opts.body || '{}'); calls.push(body);
    if (String(url).includes('paper-review')) {
      if (body.action === 'list_all' && failList) { failList = false; return new Response(JSON.stringify({ error: 'fixture connection lost' }), { status: 503 }); }
      const response = await h.handler(new Request('https://fixture.test/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
      if (body.action === 'list_all' && delayList) { delayList = false; await new Promise(resolve => { release = resolve; }); }
      return response;
    }
    return new Response(JSON.stringify({ ok: true, exams: [], subjects: [], modules: [], enabled: false }));
  };
  try {
    w.eval(read('app-bundle.js') + '\nwindow.state=state;');
    for (const name of ['app-v36.js','app-v37.js','app-v38.js']) w.eval(read(name));
    await tick();
    Object.assign(w.state, { user: { id: uid, username: 'fixture' }, token: 'test-token', page: 'records', allExams: [exam, second], exams: [second],
      subjectConfigs: Object.keys(exam.scores).map(name => ({ name, defaultMax: exam.scores[name].max })), modulesV18: [{ id: 'combo', name: '语数', subjects: ['语文','数学'] }],
      scoreBasis: 'raw', subject: '英语', rankScopeV16: 'class', scoreViewV25: 'percent' });
    exam.averages = { 's:数学': { year: 100, class: 110, basis: w.ScoreAverages.basis(exam, '数学') } };
    w.render();
    assert.equal(d.querySelectorAll('[data-exam-detail]').length, 2);
    assert.equal(d.querySelectorAll('[data-edit]').length, 2); assert.equal(d.querySelectorAll('[data-hidden-toggle]').length, 2);
    d.querySelector('[data-exam-detail="' + examId + '"]').click();
    try { await until(() => d.querySelectorAll('.ed-paper').length === 50); }
    catch (e) { throw new Error(e.message + '; page=' + d.querySelector('#content')?.textContent.slice(-1400) + '; errors=' + JSON.stringify(errors) + '; calls=' + calls.map(c => c.action).join(',')); }
    assert.equal(d.querySelector('.ed-heading h1').textContent, exam.name); assert(!d.querySelector('.ed-heading script'));
    assert(d.querySelector('.ed-heading').textContent.includes('已从趋势图隐藏'));
    assert(d.querySelector('.desktop-nav [data-page="stats"]'), 'analysis navigation remains present');
    assert(d.querySelector('.desktop-nav [data-page="records"]').classList.contains('active'));
    assert.equal(d.querySelector('.ed-metric strong').textContent, '365');
    assert.equal(d.querySelectorAll('.ed-metric strong')[1].textContent, '66.4%');
    assert(d.querySelector('.ed-context').textContent.includes('还差 40 分'));
    assert.equal(d.querySelectorAll('.ed-table tbody tr').length, 5);
    const math = d.querySelector('.ed-table tbody tr'); assert(math.textContent.includes('135')); assert(math.textContent.includes('120')); assert(math.textContent.includes('高于均分 35 分'));
    assert(d.querySelector('.ed-combinations').textContent.includes('255 分'));
    const groups = () => Object.fromEntries(Array.from(d.querySelectorAll('.ed-quadrant-groups article')).map(el => [el.querySelector('h3').textContent, el.querySelector('b').textContent]));
    assert.deepEqual(groups(), { 优势巩固: '数学', 抢分突破: '物理', 竞争提升: '语文', 优先补强: '英语' });
    assert.equal(d.querySelectorAll('.ed-point-list button').length, 4, 'statistical items do not distort subject comparison');
    d.querySelector('.ed-point-list [data-ed-point="3"]').click(); assert.equal(d.querySelector('.ed-inspect h3').textContent, '物理');
    d.querySelector('[data-ed-scope="class"]').click(); assert.notDeepEqual(groups(), { 优势巩固: '数学', 抢分突破: '物理', 竞争提升: '语文', 优先补强: '英语' });
    assert.equal(w.state.rankScopeV16, 'class'); assert.equal(w.state.scoreBasis, 'raw'); assert.equal(w.state.subject, '英语');
    d.querySelector('[data-ed="edit"]').click(); assert.equal(w.state.modal.querySelector('#examName').value, exam.name);
    w.state.modal.querySelector('.close-btn').click(); assert(d.querySelector('.ed-page'), 'closing exam editor returns to details');
    assert(!d.querySelector('.ed-paper-grid').textContent.includes('另一场考试')); assert(!d.querySelector('.ed-paper img'));
    d.querySelector('[data-ed="more-papers"]').click(); await until(() => d.querySelectorAll('.ed-paper').length === 51);
    assert.equal(calls.filter(c => c.action === 'list_all').at(-1).offset, 50);
    d.querySelector('[data-ed="paper:' + rid + '"]').click();
    await until(() => d.querySelectorAll('.pr-question').length === 2);
    assert.equal(d.activeElement.dataset.reportSection, 'questions', 'view questions lands on the question section');
    assert(d.querySelector('.ed-reader').textContent.includes('x + 2 = 5'));
    assert(d.querySelector('[data-pr="close"]').textContent.includes('本次考试详情'));
    assert(!calls.some(c => ['start','resume','correct','delete','save_exam'].includes(c.action)), 'viewing never writes data or consumes an analysis');
    const answer = d.querySelector('textarea[data-field="answer"]'); answer.value = '未保存的修改'; answer.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.confirm = () => false; d.querySelector('.desktop-nav [data-page="records"]').click(); assert(d.querySelector('.ed-reader'), 'unsaved corrections can cancel navigation');
    w.confirm = () => true; d.querySelector('[data-pr="close"]').click(); await until(() => d.querySelectorAll('.ed-paper').length === 50);
    paper.exam_id = extraId; d.querySelector('[data-ed="paper:' + rid + '"]').click();
    await until(() => d.querySelector('.pr-message')?.textContent.includes('已移出当前考试'));
    assert(!d.querySelector('.pr-question'), 'a moved paper is not rendered under its former exam');
    paper.exam_id = examId; d.querySelector('[data-pr="close"]').click(); await until(() => d.querySelectorAll('.ed-paper').length === 50);
    d.querySelector('[data-ed="back"]').click(); assert(!d.querySelector('.ed-page')); assert.equal(d.activeElement.dataset.examDetail, examId);

    // Partial, assigned/raw scales, zero, missing ranks and manual total must not imply complete results.
    const sparse = { id: extraId, name: '缺分测试', exam_date: '2026-10-23', total_participants: null, scores: {
      数学: { actual: 0, target: 0, max: 150, rank: 20 },
      化学: { raw: 60, rawMax: 100, max: 70, target: 60 },
      生物: { raw: 80, rawMax: 100, max: 100, yearPositionPercent: 0 },
      历史: { actual: 80, max: 100, rank: 10, participants: 5 }
    } };
    w.state.allExams = [sparse]; w.state.exams = [sparse]; w.ScoreExamDetail.open(extraId);
    await until(() => d.querySelector('.ed-paper-tools'));
    assert.equal(d.querySelector('.ed-metric strong').textContent, '160');
    assert(d.querySelector('.ed-metric').textContent.includes('小计')); assert.equal(d.querySelectorAll('.ed-metric strong')[1].textContent, '—');
    assert(!d.querySelector('.ed-quadrant')); assert(d.querySelector('#ed-quadrants').textContent.includes('名次与人数不一致'));
    assert(d.querySelector('.ed-table tbody tr').textContent.includes('已达标')); assert(d.querySelector('.ed-table').textContent.includes('同满分原始分'));
    sparse.total_actual_score = 999; w.renderPage(); assert.equal(d.querySelector('.ed-metric strong').textContent, '999'); assert.equal(d.querySelectorAll('.ed-metric strong')[1].textContent, '—');
    delete sparse.total_actual_score;
    sparse.scores = { 数学: { actual: 0, max: 150, yearPositionPercent: 0 }, 物理: { actual: 0, max: 100, yearPositionPercent: 0 } };
    w.renderPage(); assert.equal(d.querySelectorAll('.ed-point-list button').length, 2);
    assert.equal(d.querySelectorAll('.ed-quadrant g').length, 1, 'equal coordinates are not misleadingly jittered');
    assert(d.querySelector('.ed-inspect').textContent.includes('接近均值')); assert(!/NaN|Infinity/.test(d.querySelector('.ed-quadrant').outerHTML));
    sparse.scores = {}; w.renderPage(); assert(d.querySelector('#ed-scores').textContent.includes('还没有科目数据'));

    // Failed reads are not misrepresented as no papers; retries and stale responses are safe.
    d.querySelector('[data-ed="back"]').click(); failList = true; w.ScoreExamDetail.open(extraId);
    await until(() => d.querySelector('.ed-paper-content [role="alert"]'));
    assert(d.querySelector('.ed-paper-content').textContent.includes('试题读取未完成'));
    d.querySelector('[data-ed="refresh-papers"]').click(); await until(() => d.querySelector('.ed-paper'));
    d.querySelector('[data-ed="back"]').click(); delayList = true; w.ScoreExamDetail.open(extraId); await until(() => release);
    d.querySelector('.desktop-nav [data-page="records"]').click(); release(); await tick(); assert(!d.querySelector('.ed-page'));
    w.ScoreExamDetail.open(extraId); await until(() => d.querySelector('.ed-paper'));
    w.state.user = { id: 'another-user', username: 'another' }; w.state.token = 'another-token'; w.state.allExams = []; w.state.exams = []; w.render();
    assert(!d.querySelector('.ed-page')); assert(!d.querySelector('.ed-paper'));
    await tick(); assert.deepEqual(errors, []);
    console.log('PASS: exam details, hidden exams, normalized quadrants, independent scopes, totals/zero/raw-scale boundaries, combinations/averages, real paper pagination/viewing, no quota writes, unsaved edits, retry and account/navigation isolation');
  } finally { w.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
