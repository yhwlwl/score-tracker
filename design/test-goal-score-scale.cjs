const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://goal.test/**', route => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta charset="utf-8"><style>body{margin:16px;font-family:sans-serif}*{box-sizing:border-box}</style><button class="active" data-page="home">概览</button><main id="content"><section class="hero">成绩轨迹</section></main>'
    }));
    await page.goto('https://goal.test/');
    await page.evaluate(() => {
      window.state = { subjectConfigs: [{ name: '数学', defaultMax: 130 }], exams: [] };
      window.fixtureGoal = { subjects: { 数学: 110.5 }, totalGoal: 110.5 };
      window.dataApiV7 = async () => ({ goal: window.fixtureGoal });
    });
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../app-v33.js'), 'utf8') });
    async function fixture(exams, configs, goal) {
      await page.evaluate(async ({ exams, configs, goal }) => {
        state.exams = exams;
        state.allExams = exams;
        if (configs) state.subjectConfigs = configs;
        if (goal) window.fixtureGoal = goal;
        await __v33.reload();
      }, { exams, configs, goal });
    }
    const exam = (actual, max, extra = {}) => ({ exam_date: '2026-11-01', scores: { 数学: { actual, max } }, ...extra });
    const chip = () => page.locator('.gh-chip[data-subject="数学"]');
    await fixture([exam(85, 100)]);
    assert.equal(await chip().locator('b').innerText(), '85%');
    assert.equal(await chip().locator('em').innerText(), '已达标');
    assert.match(await chip().innerText(), /目标 85%/);
    assert.doesNotMatch(await chip().innerText(), /折合|折算/);
    assert.equal(await page.locator('.gh-total > b').innerText(), '已达标');
    assert.equal((await page.evaluate(() => __v33.debug())).rec.rate, 85);
    if (process.env.GOAL_QA_DIR) {
      fs.mkdirSync(process.env.GOAL_QA_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.GOAL_QA_DIR, 'goal-mobile.png'), fullPage: true });
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.screenshot({ path: path.join(process.env.GOAL_QA_DIR, 'goal-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await fixture([exam(110.5, 130)]);
    assert.equal(await chip().locator('b').innerText(), '110.5');
    assert.match(await chip().innerText(), /目标 110.5/);
    assert.equal(await chip().locator('em').innerText(), '已达标');
    assert.doesNotMatch(await chip().innerText(), /折合/);
    await fixture([exam(100, 130)]);
    assert.equal(await chip().locator('em').innerText(), '还差 10.5 分');
    assert.equal(await page.locator('.gh-total > b').innerText(), '还差 10.5 分');
    assert.doesNotMatch(await page.locator('#goalHeroV33').innerText(), /%|百分点/);
    await fixture([exam(80, 100)]);
    assert.equal(await chip().locator('em').innerText(), '还差 5 个百分点');
    await fixture([exam(90, 100)]);
    assert.equal(await chip().locator('em').innerText(), '已超 5 个百分点');
    await fixture([exam(170, 200)]);
    assert.equal(await chip().locator('em').innerText(), '已达标');
    await fixture([exam(85, 100), exam(0, 100, { is_hidden: true, exam_date: '2026-11-02' })]);
    assert.equal(await chip().locator('em').innerText(), '已达标');
    await fixture([exam(0, 100)]);
    assert.equal(await chip().locator('b').innerText(), '0%');
    assert.equal(await chip().locator('em').innerText(), '还差 85 个百分点');
    for (const max of [0, -10, null, 'invalid']) {
      await fixture([exam(85, max)]);
      assert.equal(await chip().locator('em').innerText(), '待补满分');
      assert.match(await page.locator('.gh-total').innerText(), /缺少成绩或有效满分/);
    }
    await fixture([]);
    assert.equal(await chip().locator('b').innerText(), '—');
    await fixture([exam(85, 100, { scores: { 数学: { actual: 85, max: 100 }, 英语: { actual: 60, max: 75 } } })],
      [{ name: '数学', defaultMax: 130 }, { name: '英语', defaultMax: 150 }],
      { subjects: { 数学: 110.5, 英语: 120 }, totalGoal: 230.5 });
    assert(Math.abs((await page.evaluate(() => __v33.debug())).rec.rate - 230.5 / 280 * 100) < 1e-10);
    assert.equal(await page.locator('.gh-total > b').innerText(), '已达标');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => __v33.open());
    assert.match(await page.locator('.gm-grid').innerText(), /满分 130 · 最佳得分率 85%/);
    assert.match(await page.locator('.gm-label').first().innerText(), /按科目设置的满分/);
    await page.locator('.gm-x').click();
    // The statistics linkage must use the same normalized sum and peak achievement.
    await page.evaluate(() => {
      document.querySelector('[data-page]').dataset.page = 'stats';
      document.querySelector('#content').innerHTML = '<article class="card"><h3 class="card-title">目标校准</h3></article><article class="card"><h3 class="card-title">个人最佳殿堂</h3><table><tbody><tr><td>数学</td><td>85</td><td>85</td><td></td></tr></tbody></table></article>';
      __v33.refresh();
    });
    assert.match(await page.locator('#v33CalibRow').innerText(), /82.32%.*目标 82.32%.*已达标/);
    assert.equal(await page.locator('.tag-ok-v33').innerText(), '最佳已达标');
    assert.deepEqual(errors, []);
    console.log('PASS: goal percentage-point gaps, equal/above/below targets, scale down, zero, hidden/missing scores, invalid maxima, mixed totals, mobile layout, editor and statistics linkage');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
