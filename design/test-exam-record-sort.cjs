const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../exam-record-sort.js'), 'utf8');
const { sortedRecords, filteredRecords, validMode } = require('../exam-record-sort.js');
const exams = [
  { id: 'old', exam_date: '2026-07-01', created_at: '2026-11-21T08:00:00Z', grade_level: '高一' },
  { id: 'new', exam_date: '2026-11-12', created_at: '2026-11-13T08:00:00Z', grade_level: '高二', is_hidden: true },
  { id: 'tie', exam_date: '2026-11-12', created_at: '2026-11-13T09:00:00Z', grade_level: '高二' },
  { id: 'missing', exam_date: null, created_at: null, grade_level: null },
  { id: 'middle', exam_date: '2026-09-01', created_at: '2026-09-02T00:00:00Z', grade_level: '高二' }
];
const ids = list => list.map(e => e.id).join(',');
const original = JSON.stringify(exams);
assert.equal(ids(sortedRecords(exams, 'date-desc')), 'tie,new,middle,old,missing');
assert.equal(ids(sortedRecords(exams, 'date-asc')), 'old,middle,tie,new,missing');
assert.equal(ids(sortedRecords(exams, 'created-desc')), 'old,tie,new,middle,missing');
assert.equal(ids(filteredRecords(exams, 'category:高二', 'date-desc')), 'tie,new,middle');
assert.equal(ids(filteredRecords(exams, 'uncategorized', 'date-desc')), 'missing');
assert.equal(validMode('invalid'), 'date-desc');
assert.equal(JSON.stringify(exams), original);

const handlers = {}, storage = new Map();
let html = '';
const ctx = {
  window: { ExamGoalLifecycle: { pending: e => e.pending === true, pendingCard: e => '<div data-pending-id="' + e.id + '"></div>' } },
  recordsHtml: () => '',
  renderPage: () => { html = ctx.recordsHtml(); },
  state: { allExams: exams, exams: exams.filter(e => !e.is_hidden), page: 'records', user: { id: 'u1' } },
  categoryOptionsV14: () => ['高一', '高二', '高三'],
  categoryLabelV14: () => '年级',
  escapeHtml: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  recordHtml: e => '<div class="record-date"><b>' + e.id + '</b></div><button data-edit="' + e.id + '">编辑</button>',
  localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
  document: {
    addEventListener: (type, f) => { handlers[type] = f; },
    createElement: () => ({}),
    head: { appendChild: () => {} },
    getElementById: () => ({ focus: () => {} })
  }
};
vm.runInNewContext(source, ctx);
const pos = id => html.indexOf('data-edit="' + id + '"');
const change = (id, value) => handlers.change({ target: { id, value } });
ctx.renderPage();
assert(pos('tie') >= 0 && pos('tie') < pos('old'));
change('examRecordSortV1', 'created-desc');
assert(pos('old') >= 0 && pos('old') < pos('tie') && html.includes('录入于'));
assert.equal(storage.get('st_exam_record_sort_v1:u1'), 'created-desc');
change('examRecordCategoryV1', 'category:高二');
assert(pos('old') === -1 && pos('new') >= 0 && html.includes('共 3 场已记录'));
change('examRecordCategoryV1', 'category:高三');
assert(html.includes('examRecordResetV1'));
handlers.click({ target: { id: 'examRecordResetV1', closest: () => null } });
assert(pos('old') >= 0);
ctx.state.user = { id: 'u2' }; ctx.renderPage();
assert(pos('tie') < pos('old'));
ctx.state.user = { id: 'u1' }; ctx.renderPage();
assert(pos('old') < pos('tie'));
assert.equal(JSON.stringify(exams), original);
const emptyText = '暂时还没有待完成的考试';
const stage = value => handlers.click({ target: { closest: () => ({ dataset: { egStage: value } }) } });
assert(html.includes(emptyText));
assert(html.indexOf(emptyText) < html.indexOf('<h3>历史考试</h3>'));
stage('pending');
assert(html.includes(emptyText) && pos('old') === -1);
stage('history');
assert(!html.includes(emptyText) && pos('old') >= 0);
stage('all');
ctx.state.allExams = exams.concat({ id: 'plan', pending: true, grade_level: '高二' });
ctx.renderPage();
assert(!html.includes(emptyText) && html.includes('data-pending-id="plan"'));
assert(pos('old') >= 0 && pos('plan') === -1);
stage('pending');
assert(html.includes('data-pending-id="plan"') && pos('old') === -1);
stage('history');
assert(!html.includes('data-pending-id="plan"') && pos('old') >= 0);
console.log('PASS: record ordering, category filtering, hidden exams, saved preference and immutable data');
