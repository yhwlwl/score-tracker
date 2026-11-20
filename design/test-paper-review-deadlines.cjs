const assert = require('node:assert/strict'), vm = require('node:vm');
const { harness, input, raw } = require('./test-paper-review.cjs');

async function runtimeFailure(kind) {
  const h = harness(); await h.init();
  let now = Date.now();
  class Clock extends Date { constructor(...args) { if (args.length) super(...args); else super(now); } static now() { return now; } }
  h.scope.Date = Clock;
  h.scope.setTimeout = (fn, ms) => setTimeout(() => { now += ms; fn(); }, 1);
  h.transport = (_url, options) => kind === 'timeout'
    ? new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
    : (now += 125000, Promise.resolve(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'bad-json-response' } }] }))));
  const marks = [];
  h.scope.runtimeInput = { config: { model: 'test', api_key: 'fixture-only-key', base_url: 'https://model.test/v1', stage_deadline: now + 140000 },
    requestId: input.request_id, stage: 'diagnose_16', content: [], validate: x => x, mark: (phase, attempt) => marks.push({ phase, ...attempt }) };
  const result = await vm.runInContext('reviewModel(runtimeInput)', h.scope);
  assert.equal(result.code, kind === 'timeout' ? 'upstream_timeout' : 'invalid_model_output');
  assert.equal(result.deadline_limited, true, 'budget exhaustion does not replace the actual model failure');
  assert.equal(h.upstream.length, 1, 'an exhausted instance does not retry the model locally');
  assert.equal(marks[0].deadline_limited, true); assert.equal(marks[0].outcome, result.code);
  if (kind !== 'timeout') assert.equal(result.raw_output, 'bad-json-response', 'the actual failed response stays available for diagnostics');
}

async function checkpointRecovery(legacy) {
  const h = harness(); await h.init(); await h.call({ action: 'start', ...input }); await h.drain();
  const row = h.tables.score_tracker_paper_reviews[0]; assert.equal(row.status, 'succeeded');
  const source = structuredClone(row.result), template = source.questions[1];
  const questions = Array.from({ length: 19 }, (_, i) => ({ ...structuredClone(template), id: 'q' + (i + 1), label: String(i + 1), teacher_score: 0, max_score: 5, subparts: [] }));
  const diagnoses = questions.slice(0, 16).map(q => ({ ...structuredClone(q), reference: '已保存的第' + q.label + '题讲解' }));
  const saved = diagnoses.map(q => [q.label, q.reference]);
  h.reply = { ...raw, questions };
  row.status = legacy ? 'failed' : 'paused'; row.result = null; row.error_code = legacy ? 'worker_deadline' : null; row.error_stage = 'diagnose_16';
  row.attempts = [{ stage: 'diagnose_16', outcome: 'upstream_timeout' }];
  row.analysis_state = { ...vm.runInContext('initialState(true)', h.scope), phase: 'diagnose', flow: 'split_reading', text_recovery: true,
    evidence: { ...source, questions }, diagnoses, verification_done: true, has_work: true, deadline_handoffs: 3, resume_count: legacy ? 1 : 0,
    source_input: { work_on_paper: true, pages: [{ page: 1, role: 'paper' }] } };
  const original = h.scope.reviewModel, batches = []; let fail = !legacy;
  h.scope.reviewModel = async options => {
    if (options.stage.startsWith('diagnose_')) {
      const batch = JSON.parse(options.content[0].text.split('本批事实：')[1].split('\n')[0]); batches.push(batch.map(q => q.label));
      assert.equal(row.analysis_state.deadline_handoffs, undefined, 'manual resume receives a fresh, bounded worker-handoff allowance');
      if (fail) { fail = false; return { ok: false, code: 'upstream_timeout', stage: options.stage, deadline_limited: true }; }
    }
    return original(options);
  };
  const reservations = h.calls.filter(x => x === 'score_tracker_paper_reserve').length;
  const response = await h.call({ action: 'resume', request_id: input.request_id, mode: 'saved' });
  assert.equal(response.status, 202, await response.text()); await h.drain();
  assert.equal(row.status, 'succeeded'); assert.equal(row.result.questions.length, 19);
  assert.deepEqual(row.result.questions.slice(0, 16).map(q => [q.label, q.reference]), saved, 'the first 16 analyses are retained');
  assert.deepEqual(batches, legacy ? [['17'], ['18'], ['19']] : [['17', '18', '19'], ['17'], ['18'], ['19']]);
  assert.equal(h.calls.filter(x => x === 'score_tracker_paper_reserve').length, reservations, 'resume and split deliveries do not reserve more quota');
  assert.equal(h.tables.score_tracker_paper_reviews.length, 1);
  if (!legacy) assert(h.logs.some(l => JSON.stringify(l).includes('smaller_batch_recovery')));
}

(async () => {
  const h = harness(); await h.init();
  h.scope.written = ['17', '18', '19'].map(label => ({ label, max_score: null, teacher_score: 11, subparts: [{}, {}], stem: '一道含两问的数学大题', status: 'answered', answer: '已写出的步骤' }));
  assert.deepEqual(Array.from(vm.runInContext('nextBatch(written, 0)', h.scope), q => q.label), ['17']);
  h.scope.written.forEach(q => { q.teacher_score = null; });
  assert.equal(vm.runInContext('nextBatch(written, 0).length', h.scope), 1, 'two subquestions are enough even if both scores are unreadable');
  h.scope.written.forEach(q => { q.subparts = []; q.teacher_score = 11; });
  assert.equal(vm.runInContext('nextBatch(written, 0).length', h.scope), 1, 'a large confirmed teacher mark implies a substantial written question');
  h.scope.simple = Array.from({ length: 8 }, (_, i) => ({ label: String(i + 1), max_score: 5, teacher_score: 0, stem: '小题', answer: '1', status: 'answered', subparts: [] }));
  assert.equal(vm.runInContext('nextBatch(simple, 0).length', h.scope), 4);
  h.scope.simple.forEach(q => { q.teacher_score = 5; });
  assert.equal(vm.runInContext('nextBatch(simple, 0).length', h.scope), 8, 'full-credit efficiency and routing are preserved');
  await runtimeFailure('timeout'); await runtimeFailure('invalid-json');
  await checkpointRecovery(false); await checkpointRecovery(true);
  console.log('PASS: missing-max written-question batching, model failures near worker deadline, 16/19 checkpoint retained, timeout splits instead of replay, legacy recovery, unchanged full-credit routing and no extra quota');
})().catch(error => { console.error(error); process.exitCode = 1; });
