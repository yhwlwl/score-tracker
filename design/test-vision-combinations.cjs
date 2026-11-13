const assert = require('node:assert/strict'), vm = require('node:vm');
const { backendHarness } = require('./vision-harness.cjs');
const image = 'data:image/png;base64,AAAA';
const core = ['语文', '数学', '英语'], four = [...core, '物理'], six = [...four, '化学', '生物'];
const payload = {
  exam: { finalTotal: 570, yearRank: 50, yearRankSource: '学科组合总分级序', classRank: 5, classRankSource: '学科组合总分班序', yearParticipants: 600, yearParticipantsSource: '学科组合参考人数' },
  subjects: [
    { name: '语文', finalScore: 100, classRank: 3, questionTypes: [{ name: '客观', score: 20 }] },
    { name: '语数英', components: ['语', '数', '英'], finalScore: 330, yearRank: 30 },
    { name: '语数英物', components: four, finalScore: 400, yearRank: 40 },
    { name: '学科组合总分', components: six, finalScore: 570, yearRank: 50, yearParticipants: 600, classRank: 5 }
  ]
};
(async () => {
  const h = backendHarness();
  h.reply = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(payload) } }] };
  const response = await h.call({ images: [image], context: { combinations: [{ name: '自定义四科', subjects: four }] } });
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.subjects.length, 4);
  assert.deepEqual(result.subjects[1].components, core);
  assert.deepEqual(result.subjects[2].components, four);
  assert.deepEqual(result.subjects[3].components, six);
  assert.equal(result.subjects[3].yearParticipants, 600); assert.equal(result.exam.yearRank, 50); assert.equal(result.exam.yearParticipants, 600);
  assert.equal(result.subjects[0].questionTypes[0].score, 20, 'existing question-type extraction is preserved');
  const prompt = h.upstream[0].body.messages[0].content[0].text;
  for (const text of ['组合', 'components', 'yearRankSource', '禁止将相邻列数字左移或右移', '自定义四科']) assert(prompt.includes(text));
  await h.drain(); assert.equal([...h.records.values()][0].result.subjects[3].components.length, 6);
  h.scope.raw = { exam: { yearRank: 100, yearRankSource: '语数英历级序', classRank: 7, classRankSource: '语文班级排名', yearParticipants: 700, yearParticipantsSource: '数学参考人数' }, subjects: [] };
  const guarded = vm.runInContext('normalize(raw,{})', h.scope);
  assert.equal(guarded.exam.yearRank, null); assert.equal(guarded.exam.classRank, null); assert.equal(guarded.exam.yearParticipants, null); assert.equal(guarded.warnings.length, 3);
  h.scope.raw = { exam: {}, combinations: [{ name: '另一组合', components: ['英', '数', '语'], yearRank: 14 }] };
  const separate = vm.runInContext('normalize(raw,{})', h.scope);
  assert.equal(separate.subjects[0].yearRank, 14); assert.equal(separate.subjects[0].components.length, 3);
  const empty = backendHarness(); empty.reply = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ exam: {}, subjects: [{ name: '空组合', components: core }] }) } }] };
  assert.equal((await empty.call({ images: [image] })).status, 422, 'composition metadata alone is not a usable result');
  console.log('PASS: deployed handler → combination components/ranks → audit; column-source guard; existing question types; metadata-only rejection');
})().catch(error => { console.error(error); process.exitCode = 1; });
