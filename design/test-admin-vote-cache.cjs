const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM, VirtualConsole} = require('jsdom');

const html = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../api/mg-ui.js'), 'utf8')
  .replace('export const MG_HTML', 'const MG_HTML') + ';MG_HTML');
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function until(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await tick(); }
  throw Error('Timed out waiting for admin UI');
}
const fixture = () => ({
  total_votes: 1, total_voters: 1,
  options: [{id: 'existing', label: '现有选项', is_active: true, votes: 1}],
  users: [{user_id: 'u0', username: '现有用户', votes: [{option_id: 'existing', label: '现有选项', is_active: true}]}],
  suggestions: Array.from({length: 7}, (_, i) => ({
    id: 's' + i, user_id: i === 2 ? 'u0' : 'u' + i,
    username: '用户 ' + i, content: '需求 ' + i, status: 'new'
  }))
});

(async () => {
  let serverData = fixture(), blocked = '', fail = '', clock = Date.now();
  const pending = {}, calls = [], errors = [], vc = new VirtualConsole();
  vc.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, {url: 'https://fixture.test/mg?view=featurevotes',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc});
  const w = dom.window, d = w.document;
  w.Date.now = () => clock;
  w.localStorage.setItem('st_admin_token', 'fixture-admin');
  w.fetch = async (url, init) => {
    const action = new URL(url, w.location.href).searchParams.get('action');
    const body = init.body && JSON.parse(init.body);
    calls.push({action, body});
    // Capture before blocking to simulate a read started before a successful write.
    let result = action === 'feature_votes' ? structuredClone(serverData)
      : action === 'feedback' ? {rows: [], total_count: 0}
      : action === 'feedback_detail' ? {feedback: {id: 'feedback-1', content: '需求 3'}, replies: []}
      : action === 'feature_suggestion_convert' ? {ok: true, feedback_id: 'feedback-1'}
      : action === 'feature_suggestion_promote' ? {ok: true, option_id: 'promoted-' + body.id}
      : action === 'feature_option_add' ? {ok: true, id: 'added'} : {ok: true};
    if (action === blocked) await new Promise(resolve => pending[action] = resolve);
    return {ok: action !== fail, status: action === fail ? 503 : 200,
      json: async () => action === fail ? {error: 'fixture failure'} : result};
  };
  w.eval(d.querySelector('script').textContent);
  await until(() => d.querySelector('[data-fv-dismiss="s0"]'));
  const reads = () => calls.filter(x => x.action === 'feature_votes').length;
  const nav = view => d.querySelector('[data-view="' + view + '"]').click();
  const row = id => Array.from(d.querySelectorAll('tr')).find(x => x.children.length === 5 && x.textContent.includes('需求 ' + id));
  const stateSearch = value => {
    const search = d.getElementById('globalSearch'); search.value = value;
    search.dispatchEvent(new w.Event('input'));
  };
  const initialReads = reads();
  clock += 180000; // Revisiting after three minutes still uses the vote cache.
  nav('feedback'); await until(() => d.getElementById('refreshFeedback'));
  nav('featurevotes'); assert(d.querySelector('[data-fv-dismiss="s0"]'));
  assert.equal(reads(), initialReads, 'fresh tab revisit must not fetch');

  // No extra GET, no skeleton, unchanged search/page/scroll/draft after handling a row.
  stateSearch('现有用户');
  d.getElementById('fvNewOption').value = '未提交的选项草稿';
  w.scrollY = 480;
  d.querySelector('[data-fv-dismiss="s0"]').click();
  await until(() => row(0).textContent.includes('已处理'));
  assert.equal(reads(), initialReads);
  assert.equal(d.getElementById('fvNewOption').value, '未提交的选项草稿');
  assert.equal(d.getElementById('globalSearch').value, '现有用户');
  assert.equal(d.documentElement.scrollTop, 480);
  assert(!d.querySelector('.skeleton'));

  d.querySelector('[data-fv-promote="s1"]').click();
  await until(() => row(1).textContent.includes('已加入投票'));
  assert(d.querySelector('[data-fv-active="promoted-s1"]'));
  stateSearch(''); await new Promise(resolve => setTimeout(resolve, 280));
  // Inspect rendered metrics and the user table rather than an implementation mirror.
  assert.deepEqual(Array.from(d.querySelectorAll('.metric-value')).map(x => x.textContent), ['2', '2', '2', '5']);
  assert(d.getElementById('featureVoteUsers').textContent.includes('用户 1'));
  d.querySelector('[data-fv-promote="s2"]').click();
  await until(() => row(2).textContent.includes('已加入投票'));
  assert.equal(d.querySelectorAll('#featureVoteUsers tbody tr').length, 2, 'existing voter is not duplicated');
  assert.deepEqual(Array.from(d.querySelectorAll('.metric-value')).map(x => x.textContent), ['2', '3', '3', '4']);
  assert.equal(reads(), initialReads);

  d.getElementById('fvNewOption').value = '<新选项>';
  d.getElementById('fvAddOption').click();
  await until(() => d.querySelector('[data-fv-active="added"]'));
  assert.equal(d.getElementById('fvNewOption').value, '');
  assert(d.getElementById('page').textContent.includes('<新选项>'));
  assert(!d.querySelector('新选项'));
  d.querySelector('[data-fv-active="existing"]').click();
  await until(() => d.querySelector('[data-fv-active="existing"]').dataset.active === '1');
  assert(!Array.from(d.querySelectorAll('#featureVoteUsers .pill')).find(x => x.textContent === '现有选项').classList.contains('green'));
  d.querySelector('[data-fv-active="existing"]').click();
  await until(() => d.querySelector('[data-fv-active="existing"]').dataset.active === '0');
  d.querySelector('[data-fv-complete="existing"]').click();
  await until(() => !d.querySelector('[data-fv-complete="existing"]'));
  assert(d.getElementById('page').textContent.includes('已完成'));
  assert.equal(reads(), initialReads);

  stateSearch('现有用户'); w.scrollY = 720;
  d.querySelector('[data-fv-convert="s3"]').click();
  await until(() => d.getElementById('replyText'));
  nav('featurevotes');
  assert(row(3).textContent.includes('已转为反馈'));
  assert(d.querySelector('[data-fv-feedback="feedback-1"]'));
  assert.equal(d.getElementById('globalSearch').value, '现有用户');
  assert.equal(d.documentElement.scrollTop, 720);
  assert.equal(reads(), initialReads, 'returning from converted feedback uses updated cache');

  fail = 'feature_suggestion_dismiss';
  d.querySelector('[data-fv-dismiss="s4"]').click();
  await until(() => d.querySelector('[data-fv-dismiss="s4"]')?.disabled === false);
  assert(row(4).textContent.includes('待处理'));
  assert.equal(reads(), initialReads, 'failed write retains the usable cache'); fail = '';

  // A refresh which began before a mutation must not revert that mutation.
  blocked = 'feature_votes'; d.getElementById('refreshFeatureVotes').click();
  await until(() => pending.feature_votes);
  assert(d.querySelector('[data-fv-dismiss="s4"]'), 'refresh keeps content visible');
  d.querySelector('[data-fv-dismiss="s4"]').click();
  await until(() => row(4).textContent.includes('已处理'));
  pending.feature_votes(); await tick(); await tick(); blocked = '';
  assert(row(4).textContent.includes('已处理'), 'late read cannot restore old status');

  // A write finishing on another tab updates its cache without replacing the active tab.
  blocked = 'feature_suggestion_dismiss';
  d.querySelector('[data-fv-dismiss="s5"]').click();
  await until(() => pending.feature_suggestion_dismiss);
  nav('feedback'); pending.feature_suggestion_dismiss(); await tick(); await tick(); blocked = '';
  assert(d.getElementById('refreshFeedback'));
  const beforeReturn = reads(); nav('featurevotes');
  assert(row(5).textContent.includes('已处理')); assert.equal(reads(), beforeReturn);

  // Expired cache refreshes in the background and keeps old data if the refresh fails.
  clock += 601000; fail = 'feature_votes';
  nav('feedback'); nav('featurevotes');
  assert(row(5).textContent.includes('已处理')); await tick(); await tick();
  assert.equal(reads(), beforeReturn + 1); assert(row(5).textContent.includes('已处理')); fail = '';
  serverData = fixture(); serverData.suggestions[6].status = 'dismissed';
  d.getElementById('refreshFeatureVotes').click();
  await until(() => row(6).textContent.includes('已处理'));

  // A successful old-session write cannot repopulate data after logout.
  blocked = 'feature_suggestion_dismiss';
  d.querySelector('[data-fv-dismiss="s0"]').click();
  await until(() => pending.feature_suggestion_dismiss);
  d.getElementById('logout').click(); pending.feature_suggestion_dismiss();
  await tick(); await tick(); assert(d.getElementById('loginForm'));
  assert.equal(w.localStorage.getItem('st_admin_token'), null);
  assert.deepEqual(errors, []); w.close();
  console.log('PASS: vote cache reuse, all write actions without refetch, counts/users, conversion return, draft/search/scroll, failed writes, stale reads, background refresh, cross-tab writes and logout isolation');
})().catch(error => {console.error(error); process.exitCode = 1;});
