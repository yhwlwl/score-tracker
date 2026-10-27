// Full-app DOM regression: exam selection stays reachable without current-metric data.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
const exams = Array.from({ length: 6 }, (_, i) => ({
  id: 'radar-' + i, name: i === 5 ? '很长的考试名称 <img src=x> 用于窄屏换行验收' : '阶段考试 ' + (i + 1),
  exam_date: '2026-10-' + String(i + 1).padStart(2, '0'), grade_level: i % 2 ? '自定义分类' : '',
  scores: Object.fromEntries(['数学', '语文', '英语'].map((s, j) => [s, { actual: 90 + i + j, max: 150, target: 120, raw: 85 + i, rawMax: 150, rank: 30 + i + j, participants: 100, classRank: 3 + i + j, classParticipants: 40 }]))
}));
(async () => {
  const errors = [], calls = [], vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!error.message.includes('CSS')) errors.push(error.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://fixture.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.scrollTo = () => {}; w.setInterval = () => 1; w.AbortController = AbortController;
  w.fetch = async (url, opts) => { calls.push(JSON.parse(opts?.body || '{}')); return new Response(JSON.stringify({ ok: true, enabled: false, exams: [], subjects: [], modules: [], rows: [], reviews: [], drafts: [], profile: { completed_at: '2026-01-01', school_prompted_at: '2026-01-01' } })); };
  function seed(rows, selection = []) {
    Object.assign(w.state, { token: 'synthetic-radar-fixture', user: { id: 'radar-fixture', username: '回归测试' }, allExams: rows, exams: rows.filter(e => !e.is_hidden), unfilteredVisibleExamsV13: rows.filter(e => !e.is_hidden), page: 'home', radarMode: 'actual', radarSelection: selection, gradeFilter: '全部', gradeFiltersV61: [], modulesV18: [] });
    w.applyExamSubjectsV10(w.state.exams, []); w.render();
  }
  const click = selector => { const el = d.querySelector(selector); assert(el, 'control exists: ' + selector); el.click(); };
  const boxes = () => [...d.querySelectorAll('.radar-pick-option-v25 input')];
  const chart = () => d.querySelector('#radarChart svg');
  try {
    const bundle = process.env.RADAR_BUNDLE_PATH ? fs.readFileSync(process.env.RADAR_BUNDLE_PATH, 'utf8') : read('app-bundle.js');
    w.eval(bundle + '\nwindow.state=state;');
    for (const file of ['app-v36.js', 'app-v37.js', 'app-v38.js']) w.eval(read(file));
    await tick();
    // Rank-only accounts previously lost the entire selection entry in final-score mode.
    const rankOnly = structuredClone(exams.slice(0, 2));
    rankOnly.forEach(e => Object.values(e.scores).forEach(s => { delete s.actual; delete s.raw; delete s.target; }));
    seed(rankOnly);
    click('#radarPickV25'); assert.equal(boxes().length, 2);
    boxes()[0].click(); click('#radarPickOkV25'); assert.equal(w.state.radarSelection.length, 1);
    click('[data-radar-scope-v16="year"]'); assert(chart());
    click('[data-radar-mode="actual"]'); assert.equal(w.state.radarSelection.length, 1, 'metric switch preserves exams'); assert(!chart());
    const note = d.querySelector('.radar-selection-note-v25');
    assert(note.textContent.includes('当前查看项暂无数据'));
    assert.equal(w.getComputedStyle(note).display, 'block'); assert.equal(w.getComputedStyle(note).width, '100%');
    assert(!note.closest('.multi-select'), 'empty text must not enter the legacy two-column picker grid');
    assert.equal(w.getComputedStyle(d.querySelector('#radarChart')).height, '180px');
    seed([...exams, { ...exams[0], id: 'hidden', is_hidden: true }]);
    click('#radarPickV25'); assert.equal(boxes().length, 6, 'custom categories included and hidden exams excluded');
    assert(!d.querySelector('.radar-pick-group-v25 img'), 'exam names are escaped');
    for (let i = 0; i < 4; i++) boxes()[i].click();
    boxes()[4].click(); assert.equal(boxes()[4].checked, false, 'enforce four-exam cap');
    click('#radarPickOkV25'); assert.equal(w.state.radarSelection.length, 4); assert(chart());
    click('#radarPickV25'); boxes()[0].click(); boxes()[4].click();
    click('.cancel-btn'); assert.equal(w.state.radarSelection.length, 4, 'cancel preserves selection');
    click('#radarPickV25'); boxes()[0].click(); boxes()[4].click(); click('#radarPickOkV25');
    assert.equal(w.state.radarSelection.length, 4, 'adjust exams without clearing selection'); assert(chart());
    for (const mode of ['raw_score', 'target', 'actual']) {
      click('[data-radar-mode="' + mode + '"]'); assert.equal(w.state.radarSelection.length, 4); assert(chart());
    }
    for (const scope of ['year', 'class']) {
      click('[data-radar-scope-v16="' + scope + '"]');
      for (const mode of ['rank', 'rank_raw']) {
        click('[data-radar-mode="' + mode + '"]'); assert.equal(w.state.radarSelection.length, 4); assert(chart());
      }
    }
    click('[data-radar-unpick]'); assert.equal(w.state.radarSelection.length, 3); assert(d.querySelector('#radarPickV25'));
    seed(exams, [exams[5].id]); assert(!d.querySelector('.radar-picked-v25 img'));
    // Original and final scores may use different scales; do not fabricate final-score data.
    const rawOnly = structuredClone(exams.slice(0, 1));
    Object.values(rawOnly[0].scores).forEach(s => { delete s.actual; s.max = 100; s.rawMax = 150; });
    seed(rawOnly); click('#radarPickV25'); boxes()[0].click(); click('#radarPickOkV25'); assert(!chart());
    click('[data-radar-mode="raw_score"]'); assert(chart());
    // A category filter still bounds the selector and removes filtered-out selections.
    seed(exams, [exams[0].id]);
    w.state.gradeFiltersV61 = ['自定义分类']; w.applyGradeFilterV13(); w.render();
    assert.equal(w.state.radarSelection.length, 0); click('#radarPickV25'); assert.equal(boxes().length, 3); click('.cancel-btn');
    seed([]); assert.equal(d.querySelector('#radarPickV25').disabled, true);
    assert(d.querySelector('.radar-selection-v25').textContent.includes('当前筛选下暂无考试记录'));
    await tick(); assert.deepEqual(errors, []); assert(!calls.some(c => ['save_exam', 'delete_exam'].includes(c.action)));
    console.log('PASS: bundled app boots; rank-only/raw-only exams remain selectable; all score/rank modes, adjustment/cancel/removal, four-exam cap, categories/hidden exams, escaped names, full-width empty-note structure and compact empty states.');
  } finally { w.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
