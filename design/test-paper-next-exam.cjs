// Existing report -> local checklist -> source question; no live data or model requests.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const { harness, uid, input, rid } = require('./test-paper-review.cjs');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const scope = { window: {} }; vm.runInNewContext(read('paper-review-support.js'), scope);
const tips = report => JSON.parse(JSON.stringify(scope.window.ScorePaperSupport.nextExamTips(report)));
const question = (label, rule, extra = {}) => ({ label, answer: 'x=7', status: 'answered', analysis_mode: 'diagnosis', review_status: 'reviewed', teacher_score: 0, max_score: 5, transfer_rule: rule, ...extra });
const rules = ['设方程前先检查斜率是否存在、截距能否为零。', '写完方程后，把已知点代回检查。', '直方图先用高度乘组距得到频率。', '英语原因题先核对原文依据，再写原因句。'];
const report = { work_on_paper: true, questions: rules.map((rule, i) => question(String(i + 1), rule)), action_plan: [{ questions: ['4'] }, { questions: ['2'] }] };
const original = structuredClone(report);
assert.deepEqual(tips(report).map(t => t.questions[0]), ['4', '2', '1'], 'retain report priorities, maximum three distinct tips');
assert.deepEqual(report, original, 'reading never rewrites saved evidence or reports');
const duplicate = { ...report, action_plan: [], questions: [question('1', rules[0]), question('2', rules[0] + '\n'), question('3', rules[1])] };
assert.deepEqual(tips(duplicate), [{ text: rules[0], questions: ['1', '2'] }, { text: rules[1], questions: ['3'] }], 'merge identical advice and retain both source links');
for (const extra of [
  { analysis_mode: 'strength' }, { analysis_mode: 'ai_strength' }, { analysis_mode: 'needs_confirmation' }, { analysis_mode: 'question_guidance' },
  { review_status: 'unresolved' }, { review_status: 'teacher_conflict' }, { score_verification: 'conflict' }, { teacher_score: 5 },
  { answer: '', status: 'blank' }, { status: 'unclear' }, { record_only: true },
  { ai_grading: { status: 'confirmed', verdict: 'correct' } },
  { teacher_score: null, max_score: null, first_issue: { certainty: 'uncertain' } },
  { transfer_rule: '', suggestion: '重做第2题，答案是3', practice: '一道新练习' }
]) assert.deepEqual(tips({ ...report, questions: [question('1', rules[0], extra)] }), [], 'exclude unreliable, correct or exercise-only cases: ' + JSON.stringify(extra));
assert.equal(tips({ questions: [question('1', rules[0], { teacher_score: null, max_score: null, first_issue: { certainty: 'confirmed' } })] }).length, 1, 'unknown numeric marks do not suppress a confirmed visible issue');
assert.equal(tips({ questions: [question('1', rules[0], { teacher_score: null, max_score: null, ai_grading: { status: 'confirmed', verdict: 'partial' } })] }).length, 1, 'qualitative AI correctness is separate from numeric scoring');
assert.equal(tips({ questions: [question('1', rules[0], { status: 'unclear', subparts: [{ status: 'answered', answer: 'x=7' }] })] }).length, 1, 'readable subparts survive local uncertainty');
for (const extra of [{ record_only: true }, { analysis_stale: true }, { work_on_paper: false }]) assert.deepEqual(tips({ ...report, ...extra }), []);
assert.equal(tips({ ...report, work_on_paper: false, source_pages: [{ role: 'work' }] }).length, 3, 'separate answer cards count as student work');
assert.equal(tips({ ...report, options: { modules: ['solutions'] }, action_plan: [] }).length, 3, 'independent of optional practice and plans');
assert.deepEqual(tips({ questions: [question('1', rules[0], { review_status: undefined, analysis_mode: undefined })] })[0].text, rules[0], 'legacy report fields remain usable without regeneration');
assert.deepEqual(tips({}), []); assert.deepEqual(tips(null), []);
console.log('PASS: priority, max three, deduplication, ownership-neutral pure projection, old reports, subject-independent rules, local uncertainty and stale/record-only guards');

async function ui() {
  const h = harness(); await h.init();
  await h.call({ action: 'start', ...input }); await h.drain();
  const row = h.tables.score_tracker_paper_reviews[0], base = structuredClone(row.result.questions[1]);
  Object.assign(row.result, { work_on_paper: true, action_plan: [] });
  row.result.questions = rules.map((rule, i) => ({ ...structuredClone(base), ...question(String(i + 1), rule), id: String(i + 1) }));
  row.result.questions[0].transfer_rule = '先写 $x+2=5$，再做相同运算。<img src=x onerror=alert(1)>';
  const errors = [], calls = [], vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!e.message.includes('CSS')) errors.push(e.message); });
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://test.local/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.scrollTo = () => {}; w.setInterval = () => 1; w.confirm = () => true; w.AbortController = AbortController;
  w.fetch = async (url, options) => {
    const body = JSON.parse(options?.body || '{}');
    if (String(url).includes('paper-review')) { calls.push(body.action); return h.call(body); }
    return new Response(JSON.stringify({ ok: true, enabled: false, modules: [], exams: [], subjects: [], profile: { completed_at: '2026-10-01', school_prompted_at: '2026-10-01' } }));
  };
  const until = async fn => { for (let n = 0; n < 100; n++) { if (fn()) return; await new Promise(r => setTimeout(r, 20)); } throw new Error('UI wait expired: ' + d.querySelector('.pr-message')?.textContent); };
  try {
    w.eval(read('app-bundle.js') + '\nwindow.state=state;');
    Object.assign(w.state, { user: { id: uid }, token: 'test-token', page: 'stats', analysisTab: 'ai' });
    const host = d.createElement('main'); d.body.appendChild(host);
    const ctx = { user: uid, token: 'test-token', host, sessions: {}, initialReport: rid };
    const upstreamCount = h.upstream.length, writeCount = h.writes.length;
    w.ScorePaperReview.mount(ctx, '数学'); await until(() => d.querySelector('.pr-next-exam'));
    const section = d.querySelector('.pr-next-exam');
    assert.equal(section.querySelectorAll(':scope > ol > li').length, 3);
    assert.equal(section.closest('[data-report-section]').dataset.reportSection, 'highlights', 'checklist leads the report');
    assert(section.textContent.includes('不代表长期薄弱点'));
    assert.equal(section.querySelectorAll('img,script').length, 0, 'model text cannot execute HTML');
    assert(section.textContent.includes('$x+2=5$'), 'LaTeX source is preserved');
    d.querySelector('[data-pr="filter:confirm"]').click();
    section.querySelector('[data-pr="focus:1"]').click();
    assert.equal(d.querySelector('[data-question="1"]').open, true);
    assert.equal(d.querySelector('[data-question="1"]').hidden, false);
    assert.equal(d.querySelector('[data-pr="filter:all"]').getAttribute('aria-pressed'), 'true');
    assert(calls.every(action => ['get', 'sources'].includes(action)), 'checklist uses read-only report requests');
    assert.equal(h.upstream.length, upstreamCount, 'reading and following tips call no model');
    assert.equal(h.writes.length, writeCount, 'reading and following tips do not change usage or reports');
    async function reopen(extra, status = 'succeeded') {
      d.querySelector('[data-pr=close]').click(); Object.assign(row.result, { analysis_stale: false, record_only: false, work_on_paper: true, ...extra }); row.status = status;
      w.ScorePaperReview.mount(ctx, '数学'); await until(() => d.querySelector('.pr-result-top'));
    }
    await reopen({ analysis_stale: true }); assert.equal(d.querySelectorAll('.pr-next-exam li').length, 0); assert(d.querySelector('.pr-next-exam').textContent.includes('请先更新分析'));
    await reopen({}, 'running'); assert.equal(d.querySelectorAll('.pr-next-exam li').length, 0); assert(d.querySelector('.pr-next-exam').textContent.includes('正在更新分析'));
    await reopen({ work_on_paper: false, source_pages: [{ role: 'paper' }] }); assert(d.querySelector('.pr-next-exam').textContent.includes('补充考试时的作答'));
    await reopen({ record_only: true }); assert.equal(d.querySelector('.pr-next-exam'), null, 'record-only view stays record-only');
    assert.deepEqual(errors, []);
    console.log('PASS: actual bundle → owner-scoped Edge get → local checklist → source question/filter reset; no model/usage writes, safe HTML/LaTeX and stale/updating/record-only UI');
  } finally { dom.window.close(); }
}
ui().catch(e => { console.error(e); process.exitCode = 1; });
