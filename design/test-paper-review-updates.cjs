// Regressions for sparse reading, subpart tasks and correction -> analysis updates.
const assert = require('node:assert/strict'), vm = require('node:vm');
const { harness, input, raw, stagedReply } = require('./test-paper-review.cjs');
const respond = value => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }));
(async () => {
  const h = harness(); await h.init(); const run = expression => vm.runInContext(expression, h.scope);
  h.scope.fact = { label: '1', stem: '判断选项', answer: 'B', status: 'answered', subparts: [], max_score: 4, teacher_score: 4, score_mark: { page: 1, quote: '4分', scope: 'question', label: '1' }, uncertainties: [] };
  h.scope.e = { questions: [h.scope.fact], total: { score: 4, max: 4 }, complete: true, warnings: [] };
  h.scope.i = { ...input, pages: [{ ...input.pages[0], page: 1 }] };
  h.scope.reading = { questions: [{ label: '1', kind: 'single_choice', answer: '', teacher_score: null }] };
  let e = run('reconcileEvidence(reading,e,i)').evidence;
  assert.equal(e.questions[0].teacher_score, 4, 'missing independent reading does not erase a valid first mark');
  assert.equal(e.questions[0].answer, 'B'); assert.equal(e.warnings.length, 0);
  h.scope.fact.teacher_score = null; h.scope.fact.score_mark = null;
  h.scope.reading.questions[0] = { label: '1', kind: 'single_choice', answer: 'B', teacher_score: 4, score_mark: { page: 1, quote: '4分', scope: 'question', label: '1', location: '第一栏第1题' } };
  e = run('reconcileEvidence(reading,e,i)').evidence; assert.equal(e.questions[0].teacher_score, 4, 'second reading can fill a missing mark');
  h.scope.fact.teacher_score = 4; h.scope.reading.questions[0].teacher_score = 3; h.scope.reading.questions[0].score_mark.quote = '3分';
  e = run('reconcileEvidence(reading,e,i)').evidence; assert.equal(e.questions[0].teacher_score, null); assert.equal(e.questions[0].score_candidates.join(','), '4,3'); assert.equal(e.questions[0].answer, 'B');
  h.scope.reading.questions[0].answer = 'C'; h.scope.fact.subparts = [{ status: 'answered', answer: 'B' }];
  e = run('reconcileEvidence(reading,e,i)').evidence; h.scope.choice = e.questions[0]; assert(run('needsConfirmation(choice)'), 'conflicting choices cannot use the obsolete subpart to bypass clarification');
  h.scope.fact.status = 'answered'; h.scope.fact.teacher_score = null; h.scope.fact.subparts = []; assert.equal(run('needsConfirmation(fact)'), false, 'readable work without grades still gets analysis');
  h.scope.tasks = [{ label: '15', learning_tasks: [{ id: '15#1', part: '15(1)', title: '分离条件', task: '重写分离时的约束', success_check: '能解释何时接触力为零' }, { id: '15#2', part: '15(3)', title: '落地后分段', task: '列出落地前后的约束', success_check: '能解释绳松后模型的变化' }] }];
  h.scope.actions = [{ title: '错误标题不能覆盖任务', questions: ['15'], task_ids: ['15#1'] }, { title: '两个小问', questions: ['15'], task_ids: ['15#1', '15#2'] }, { title: '捏造任务', questions: ['15'], task_ids: ['15#99'] }];
  const tasks = run('groundActions(actions,tasks)'); assert.equal(tasks.length, 2); assert.equal(tasks[0].title, '分离条件'); assert.equal(tasks[1].title, '落地后分段'); assert(!tasks[1].task.includes('接触力')); assert(tasks[1].task.includes('落地'));

  await h.call({ action: 'start', ...input }); await h.drain();
  let row = h.tables.score_tracker_paper_reviews[0]; const original = structuredClone(row.result), calls = h.upstream.length;
  const c = { id: '2', answer: 'x=5-2=3', teacher_score: 0, max_score: 5, verified: true, corrected: false, reflection: { cause: 'time', note: '最后一分钟补上了这一步' } };
  h.transport = (url, options) => {
    const request = JSON.parse(options.body), prompt = request.messages[0].content[0].text;
    if (prompt.includes('阶段二：')) {
      const batch = JSON.parse(prompt.split('本批事实：')[1].split('\n')[0]);
      assert.equal(batch.length, 1); assert.equal(batch[0].label, '2'); assert.equal(batch[0].answer, c.answer);
      assert.equal(batch[0].student_reflection.source, 'student_recollection'); assert.equal(batch[0].student_reflection.note, c.reflection.note);
      assert(prompt.includes('没有重新读取图片')); assert(!('first_issue' in batch[0]), 'old diagnosis is not fed back as source evidence');
      assert.equal(request.messages[0].content.filter(x => x.type === 'image_url').length, 0);
      const d = stagedReply(raw, request).questions[0];
      return respond({ questions: [{ ...d, first_issue: { certainty: 'none' }, loss_reason: '已补全等式变形', suggestion: '根据你的时间回忆，限时独立重做一道方程', success_check: '能独立完成并记录耗时', review_status: 'reviewed', reference: 'x=3' }] });
    }
    assert(prompt.includes('阶段三：'));
    return respond({ overview: '根据你补充的步骤，等式变形已写对，下一步验证限时完成情况。', strengths: [], action_plan: [{ title: '限时重做', questions: ['2'] }] });
  };
  const response = await h.call({ action: 'correct', request_id: input.request_id, revision: 0, corrections: [c], reanalyze: true });
  assert.equal(response.status, 202); const pending = (await response.json()).review;
  assert.equal(pending.result.analysis_stale, true); assert.equal(pending.result.questions[1].answer, original.questions[1].answer, 'previous analysis stays visible during update');
  assert.equal(pending.progress.flow, 'revision'); assert(!('analysis_state' in pending));
  assert.equal((await h.call({ action: 'correct', request_id: input.request_id, revision: 0, corrections: [c], reanalyze: true })).status, 409);
  await h.drain(); row = h.tables.score_tracker_paper_reviews[0];
  assert.equal(row.status, 'succeeded'); assert.equal(h.upstream.length - calls, 2, 'only changed question and synthesis rerun');
  assert.equal(row.result.questions[1].answer, c.answer); assert(row.result.questions[1].suggestion.includes('限时'));
  assert(row.result.overview.includes('已写对')); assert(row.result.action_plan[0].task.includes('限时'));
  assert.deepEqual(row.result.questions[0], original.questions[0], 'unaffected question retains its analysis');
  assert.equal(row.result.update_count, 1); assert(!row.result.analysis_stale); assert.equal(row.result.original_readings[1].answer, original.questions[1].answer, 'original transcription is retained separately');
  assert.equal(h.calls.filter(x => x === 'score_tracker_paper_reserve').length, 1, 'revision does not create another exam analysis reservation');
  assert(h.writes.every(x => x === 'score_tracker_paper_reviews'));
  const beforeFlags = h.upstream.length;
  assert.equal((await h.call({ action: 'correct', request_id: input.request_id, revision: 1, corrections: [{ ...c, corrected: true }], reanalyze: true })).status, 200);
  await h.drain(); assert.equal(h.upstream.length, beforeFlags, 'checkbox-only changes do not call the model'); assert.equal(row.result.update_count, 1);

  const lastGood = row.result.overview;
  h.transport = () => new Response(JSON.stringify({ error: { message: 'unauthorized' } }), { status: 401 });
  const c2 = { ...c, reflection: { cause: 'execution', note: '发现自己中间算错了' } };
  assert.equal((await h.call({ action: 'correct', request_id: input.request_id, revision: 2, corrections: [c2], reanalyze: true })).status, 202);
  await h.drain(); assert.equal(row.status, 'failed'); assert.equal(row.result.overview, lastGood); assert.equal(row.result.analysis_stale, true); assert.equal(row.corrections[0].reflection.note, c2.reflection.note);
  h.transport = (url, options) => respond(stagedReply(raw, JSON.parse(options.body)));
  assert.equal((await h.call({ action: 'resume', request_id: input.request_id })).status, 202, 'text-only revision resumes without uploading images');
  await h.drain(); assert.equal(row.status, 'succeeded'); assert.equal(row.result.questions[1].student_reflection.note, c2.reflection.note); assert.equal(row.result.update_count, 2);
  row.result.update_count = 5;
  assert.equal((await h.call({ action: 'correct', request_id: input.request_id, revision: 3, corrections: [c], reanalyze: true })).status, 409, 'model updates are bounded');
  assert.equal((await h.call({ action: 'correct', request_id: input.request_id, revision: 3, corrections: [c], reanalyze: false })).status, 200, 'correction records remain editable');
  assert.equal(row.result.analysis_stale, true);
  row.user_id = '00000000-0000-4000-8000-000000000002';
  assert.equal((await h.call({ action: 'correct', request_id: input.request_id, revision: 4, corrections: [c], reanalyze: true })).status, 404);
  console.log('PASS: missing vs conflicting readings, readable ungraded work, subpart-specific tasks, targeted updates, student recollection, no-op saves, concurrency, stale-result recovery, update budget and ownership');
})().catch(e => { console.error(e); process.exitCode = 1; });
