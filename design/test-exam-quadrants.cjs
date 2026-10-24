// Validate the delivered chart through its controls and displayed comparison evidence.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
(async () => {
  const errors = [], calls = [], events = [], vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!error.message.includes('CSS')) errors.push(error.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://fixture.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.scrollTo = () => {}; w.setInterval = () => 1;
  w.requestAnimationFrame = cb => w.setTimeout(() => cb(w.performance.now()), 16); w.cancelAnimationFrame = id => w.clearTimeout(id);
  w.AbortController = AbortController;
  w.fetch = async (url, opts) => { const body = JSON.parse(opts?.body || '{}'); calls.push(body); return new Response(JSON.stringify(String(url).includes('paper-review') ? { reviews: [], drafts: [], has_more: false } : { ok: true, exams: [], subjects: [], modules: [], enabled: false })); };
  const current = { id: 'current', name: '本次期中', exam_date: '2026-10-20', grade_level: '高二', scores: {
    数学: { actual: 120, max: 150, rank: 20, participants: 100, classRank: 5, classParticipants: 50 },
    语文: { actual: 110, max: 150, rank: 30, participants: 100, classRank: 10, classParticipants: 50 },
    英语: { actual: 100, max: 150, rank: 60, participants: 100, classRank: 35, classParticipants: 50 },
    物理: { rank: 80, participants: 100, classRank: 40, classParticipants: 50 }, // rank-only data can participate
    统计项: { excludeFromTotal: true, yearPositionPercent: 100 }
  } };
  const previous = { id: 'previous', name: '上次可比考试 <img src=x>', exam_date: '2026-10-10', grade_level: '高二', scores: {
    数学: { rank: 200, participants: 500, classRank: 4, classParticipants: 50 },
    语文: { yearPositionPercent: 10, classRank: 15, classParticipants: 50 },
    英语: { rank: 400, participants: 500, classRank: 40, classParticipants: 50 },
    物理: { yearPositionPercent: 60, classRank: 30, classParticipants: 50 }
  } };
  const older = { id: 'older', name: '更早考试', exam_date: '2026-10-01', grade_level: '高二', scores: {
    数学: { yearPositionPercent: 60 }, 语文: { yearPositionPercent: 20 }, 英语: { yearPositionPercent: 100 }, 物理: { yearPositionPercent: 40 }
  } };
  const trapScores = Object.fromEntries(['数学','语文','英语','物理'].map(s => [s, { yearPositionPercent: 1 }]));
  const traps = [
    { id: 'hidden', name: '应排除的隐藏考试', exam_date: '2026-10-19', grade_level: '高二', is_hidden: true, scores: trapScores },
    { id: 'category', name: '应排除的其他分类', exam_date: '2026-10-18', grade_level: '高一', scores: trapScores },
    { id: 'same-day', name: '应排除的同日考试', exam_date: '2026-10-20', grade_level: '高二', scores: trapScores },
    { id: 'future', name: '应排除的未来考试', exam_date: '2026-10-21', grade_level: '高二', scores: trapScores },
    { id: 'invalid-date', name: '无效日期', exam_date: '2026-02-30', grade_level: '高二', scores: trapScores },
    { id: 'missing-count', name: '无人数不能算位比', exam_date: '2026-10-17', grade_level: '高二', scores: { 数学: { rank: 1 } } },
    { id: 'wrong-scope', name: '班级不能混入年级', exam_date: '2026-10-16', grade_level: '高二', scores: { 数学: { classRank: 10, classParticipants: 50 } } },
    { id: 'stats', name: '历史统计项不参与', exam_date: '2026-10-15', grade_level: '高二', scores: { 数学: { yearPositionPercent: 1, excludeFromTotal: true } } }
  ];
  const groups = () => Object.fromEntries(Array.from(d.querySelectorAll('.ed-quadrant-groups article')).map(el => [el.querySelector('h3').textContent, el.querySelector('b').textContent]));
  const pick = name => { const button = Array.from(d.querySelectorAll('.ed-point-list button')).find(b => b.textContent.endsWith(name)); assert(button, 'subject button: ' + name); button.click(); };
  const categoryMode = value => { const select = d.querySelector('[data-ed-category]'); select.value = value; select.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const windowMode = value => { const select = d.querySelector('[data-ed-window]'); select.value = value; select.dispatchEvent(new w.Event('change', { bubbles: true })); };
  try {
    w.eval(read('app-bundle.js') + '\nwindow.state=state;');
    for (const file of ['app-v36.js','app-v37.js','app-v38.js']) w.eval(read(file)); await tick();
    w.__scoreTrackerTrack = (type, data) => events.push({ type, data }); w.__stTrack = w.__scoreTrackerTrack;
    Object.assign(w.state, { user: { id: 'fixture', username: 'fixture' }, token: 'fixture', allExams: [previous, ...traps, current, older], exams: [current], page: 'records', modulesV18: [], scoreBasis: 'raw', rankScopeV16: 'class' });
    w.ScoreExamDetail.open('current'); await tick();
    assert.equal(d.querySelector('[data-ed-mode="movement"]').getAttribute('aria-pressed'), 'true');
    assert.equal(d.querySelector('[data-ed-category]').value, 'all');
    assert.equal(d.querySelector('[data-ed-window]').value, 'previous');
    assert.deepEqual(groups(), { 优势上升: '暂无科目', 优势回落: '数学、语文', 弱科改善: '暂无科目', 优先关注: '英语、物理' });
    assert.equal(d.querySelectorAll('.ed-point-list button').length, 4);
    assert(d.querySelector('.ed-method').textContent.includes('前 45%'), 'current median excludes statistical items');
    assert(d.querySelector('.ed-quadrant').textContent.includes('当前排名位比'));
    pick('数学'); assert.equal(d.querySelector('.ed-change').textContent, '退步 19 个百分点');
    assert(d.querySelector('.ed-history').textContent.includes('应排除的其他分类'));
    assert(!d.querySelector('.ed-history').textContent.includes('应排除的隐藏考试')); assert(!d.querySelector('.ed-history').textContent.includes('应排除的同日考试')); assert(!d.querySelector('.ed-history').textContent.includes('应排除的未来考试'));
    assert(!d.querySelector('.ed-history').textContent.includes('无人数')); assert(!d.querySelector('.ed-history img'));
    categoryMode('same');
    assert.equal(d.querySelector('[data-ed-category]').value, 'same');
    pick('数学'); assert.equal(d.querySelector('.ed-change').textContent, '进步 20 个百分点');
    assert(d.querySelector('.ed-history').textContent.includes('第 200 名')); assert(d.querySelector('.ed-history').textContent.includes('第 20 名'));
    assert(d.querySelector('.ed-history').textContent.includes('上次可比考试 <img src=x>')); assert(!d.querySelector('.ed-history img'));
    assert(!d.querySelector('.ed-history').textContent.includes('应排除的其他分类')); assert(events.some(e => e.type === 'exam_detail_quadrant_category_scope_changed' && e.data.same_category === true));
    const mathCircle = d.querySelector('.ed-quadrant [data-ed-point="1"] circle');
    const physicsCircle = d.querySelector('.ed-quadrant [data-ed-point="4"] circle');
    assert(Number(mathCircle.getAttribute('cx')) > 330); assert(Number(mathCircle.getAttribute('cy')) < Number(physicsCircle.getAttribute('cy')));
    w.state.allExams.reverse(); w.renderPage(); pick('数学'); assert.equal(d.querySelector('.ed-change').textContent, '进步 20 个百分点', 'manual record order never changes comparison');
    windowMode('recent'); pick('语文'); assert.equal(d.querySelector('.ed-change').textContent, '退步 5 个百分点 / 场');
    assert(events.some(e => e.type === 'exam_detail_quadrant_window_changed' && e.data.window === 'recent'));
    assert.equal(d.querySelectorAll('.ed-history li').length, 3); assert(d.querySelector('.ed-history').textContent.includes('更早考试'));
    assert(!d.querySelector('.ed-quadrant').outerHTML.match(/NaN|Infinity/));
    delete older.scores.数学; w.renderPage(); assert.equal(d.querySelectorAll('.ed-point-list button').length, 3);
    assert(d.querySelector('.ed-missing').textContent.includes('目前共 2 次')); windowMode('previous'); pick('数学');
    d.querySelector('[data-ed-scope="class"]').click(); pick('数学');
    assert(events.some(e => e.type === 'exam_detail_quadrant_scope_changed' && e.data.scope === 'class'));
    assert.equal(d.querySelector('.ed-change').textContent, '进步 10 个百分点', 'nearest class-only exam is used for class comparisons');
    assert(d.querySelector('.ed-history').textContent.includes('班级不能混入年级'));
    assert.equal(w.state.rankScopeV16, 'class'); assert.equal(w.state.scoreBasis, 'raw');
    d.querySelector('[data-ed-scope="year"]').click(); pick('数学'); assert.equal(d.querySelector('.ed-change').textContent, '进步 20 个百分点');
    current.scores.生物 = { yearPositionPercent: 50 }; w.renderPage(); assert.equal(d.querySelectorAll('.ed-point-list button').length, 4);
    assert(d.querySelector('.ed-missing').textContent.includes('生物：没有更早'));
    d.querySelector('[data-ed-mode="performance"]').click(); assert(d.querySelector('.ed-quadrant').getAttribute('aria-label').includes('得分率')); assert(events.some(e => e.type === 'exam_detail_quadrant_mode_changed' && e.data.mode === 'performance')); assert(events.some(e => e.type === 'exam_detail_quadrant_subject_selected'));
    assert(!d.querySelector('[data-ed-window]')); assert.equal(d.querySelectorAll('.ed-point-list button').length, 3);
    d.querySelector('[data-ed-mode="movement"]').click(); assert.equal(d.querySelector('[data-ed-window]').value, 'previous');
    // A subject without any history is omitted, never placed at zero. Current rank-only data remains valid.
    w.state.allExams = [current]; w.renderPage(); assert(!d.querySelector('.ed-quadrant'));
    assert(d.querySelector('#ed-quadrants').textContent.includes('缺少历史不会记作持平'));
    d.querySelector('[data-ed-mode="performance"]').click(); assert(d.querySelector('.ed-quadrant'));
    // Two genuinely unchanged subjects at equal positions stay individually selectable, including direct 0%.
    const tied = { id: 'tied', name: '持平考试', exam_date: '2026-10-22', scores: { 数学: { yearPositionPercent: 0 }, 英语: { yearPositionPercent: 0 } } };
    const tiedBefore = { id: 'tied-before', name: '持平上次', exam_date: '2026-10-21', scores: { 数学: { yearPositionPercent: 0 }, 英语: { yearPositionPercent: 0 } } };
    w.state.allExams = [tied, tiedBefore]; w.state.exams = [tied]; w.ScoreExamDetail.open('tied'); await tick();
    assert.equal(d.querySelectorAll('.ed-quadrant g').length, 1); assert.equal(d.querySelectorAll('.ed-point-list button').length, 2);
    pick('英语'); assert.equal(d.querySelector('.ed-change').textContent, '基本持平'); assert.equal(d.querySelector('.ed-inspect h3').textContent, '英语');
    assert(!/NaN|Infinity/.test(d.querySelector('.ed-quadrant').outerHTML));
    windowMode('recent'); assert(!d.querySelector('.ed-quadrant')); assert(d.querySelector('.ed-missing').textContent.includes('目前共 2 次'));
    assert(!calls.some(c => ['start','resume','correct','save_exam'].includes(c.action)));
    await tick(); assert.deepEqual(errors, []);
    console.log('PASS: current rank × previous/three-exam movement, four directions, median split, population normalization, default all-category comparison with optional same-category filtering, strict date/scope matching, rank-only and missing history, true ties/zero, retained performance view and read-only controls');
  } finally { w.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
