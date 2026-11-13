const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the actual feature source; expose private rendering functions only in this test VM.
const source = fs.readFileSync(path.join(__dirname, '../app-v33.js'), 'utf8')
  .replace('window.__v33={', 'window.__goalTest={chipHtml:chipHtml,bestOf:bestOf,fillCalib:fillCalib};window.__v33={');
const context = {
  state: { subjectConfigs: [{ name: '数学', defaultMax: 130 }], exams: [] },
  document: { getElementById: () => ({}), querySelector: () => null, querySelectorAll: () => [] },
  localStorage: { getItem: () => null }, setTimeout: () => {},
  dataApiV7: async () => ({ goal: context.goal })
};
context.window = context;
context.goal = { subjects: { 数学: 110.5 }, totalGoal: 110.5 };
vm.createContext(context);
vm.runInContext(source, context);
const exam = (actual, max, extra = {}) => ({ exam_date: '2026-11-01', scores: { 数学: { actual, max } }, ...extra });
async function fixture(exams, configs, goal) {
  context.state.exams = context.state.allExams = exams;
  if (configs) context.state.subjectConfigs = configs;
  if (goal) context.goal = goal;
  await context.__v33.reload();
}
const chip = () => context.__goalTest.chipHtml({ name: '数学', max: 130 });
const calib = () => { const row = {}; context.__goalTest.fillCalib(row); return row.innerHTML; };
(async () => {
  await fixture([exam(85, 100)]);
  assert.match(chip(), /<b>85%<\/b>/);
  assert.match(chip(), /目标 85%/);
  assert.doesNotMatch(chip(), /折合|折算/);
  assert.match(chip(), /<em>已达标<\/em>/);
  assert.equal(context.__v33.debug().rec.rate, 85);
  assert.match(calib(), /已达标/);
  for (const [score, max, expected] of [[110.5, 130, '已达标'], [170, 200, '已达标'], [80, 100, '还差 5 个百分点'], [90, 100, '已超 5 个百分点'], [0, 100, '还差 85 个百分点']]) {
    await fixture([exam(score, max)]);
    assert.match(chip(), new RegExp('<em>' + expected + '</em>'));
  }
  for (const [score, expected] of [[100, '还差 10.5 分'], [120, '已超 9.5 分'], [110.5, '已达标'], [0, '还差 110.5 分']]) {
    await fixture([exam(score, '130')]);
    assert.match(chip(), new RegExp('<b>' + score + '</b>'));
    assert.match(chip(), /目标 110.5<\/small>/);
    assert.match(chip(), new RegExp('<em>' + expected + '</em>'));
    assert.doesNotMatch(chip(), /%|百分点/);
    assert.equal(context.__v33.debug().rec.asScore, true);
    assert.equal(context.__v33.debug().rec.comparison.gap, expected);
    assert.match(calib(), /最近总分/);
    assert.doesNotMatch(calib(), /%|百分点/);
  }
  await fixture([exam(85, 100), exam(0, 100, { is_hidden: true, exam_date: '2026-11-02' })]);
  assert.match(chip(), /<em>已达标<\/em>/);
  for (const max of [0, -10, null, 'invalid']) {
    await fixture([exam(85, max)]);
    assert.match(chip(), /待补满分/);
    assert.equal(context.__v33.debug().rec.comparable, false);
    assert.match(calib(), /待补成绩或有效满分/);
  }
  await fixture([]);
  assert.match(chip(), /<b>—<\/b>/);
  assert.equal(context.__v33.debug().rec.has, false);
  await fixture([exam(85, 100, { scores: { 数学: { actual: 85, max: 100 }, 英语: { actual: 60, max: 75 } } })],
    [{ name: '数学', defaultMax: 130 }, { name: '英语', defaultMax: 150 }],
    { subjects: { 数学: 110.5, 英语: 120 }, totalGoal: 230.5 });
  assert(Math.abs(context.__v33.debug().rec.rate - 230.5 / 280 * 100) < 1e-10);
  assert.match(calib(), /已达标/);
  assert.equal(context.__goalTest.bestOf('数学'), 85);
  await fixture([exam(100, 130, { scores: { 数学: { actual: 100, max: 130 }, 英语: { actual: 110, max: 150 } } })]);
  assert.equal(context.__v33.debug().rec.asScore, true);
  assert.equal(context.__v33.debug().rec.comparison.gap, '还差 20.5 分');
  assert.match(calib(), /最近总分 <b>210<\/b> \/ 目标 230.5/);
  await fixture([exam(100, 150, { scores: { 数学: { actual: 100, max: 150 }, 英语: { actual: 110, max: 130 } } })]);
  assert.equal(context.__v33.debug().rec.asScore, false, 'matching aggregate maxima must not mask different subject scales');
  assert.match(calib(), /百分点/);
  await fixture([exam(170, 200, { scores: { 数学: { actual: 170, max: 200 }, 英语: { actual: 120, max: 150 } } })]);
  assert(Math.abs(context.__v33.debug().rec.rate - 230.5 / 280 * 100) < 1e-10, 'changing an exam scale does not change the weighted rate');
  assert.match(calib(), /已达标/);
  await fixture([exam(85, 100)]);
  assert.equal(context.__v33.debug().rec.comparable, false, 'partial subjects must not be compared to a complete total target');
  assert.match(calib(), /待补成绩或有效满分/);
  // Peak achievement must use rates even when the highest raw score came from a larger scale.
  await fixture([exam(100, 150), exam(85, 100, { exam_date: '2026-10-01' })]);
  assert.equal(context.__goalTest.bestOf('数学'), 85);
  await fixture([exam(0.1, 0.3)], [{ name: '数学', defaultMax: 130 }], { subjects: { 数学: 43.33 }, totalGoal: 43.33 });
  assert.match(chip(), /<b>33.33%<\/b>/);
  assert.match(chip(), /<em>已达标<\/em>/);
  assert.doesNotMatch(calib(), /0\.00000/);
  console.log('PASS: actual goal source, percentage-point gaps, zero/equal/above/below targets, scale down, hidden/missing records, invalid maxima, mixed totals, peak achievement, statistics linkage and decimal precision');
})().catch(error => { console.error(error); process.exitCode = 1; });
