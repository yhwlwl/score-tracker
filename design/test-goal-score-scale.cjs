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
    assert.match(await chip().innerText(), /目标 85% · 110\.5\/130/);
    assert.equal(await chip().locator('.gh-raw-v33').innerText(), '实际 85/100');
    const summary = () => page.locator('.gh-total');
    assert.equal(await summary().locator('.gh-summary-item').count(), 2);
    assert.equal(await page.locator('.gh-title').innerText(),'我的目标');
    assert.equal(await summary().locator('.gh-summary-head').innerText(),'总分');
    assert.equal(await summary().locator('.gh-summary-note').count(),0);
    assert.equal(await summary().locator('.gh-summary-raw').first().innerText(), '原始 85/100 分');
    assert.equal(await summary().locator('.gh-summary-raw').last().innerText(), '110.5/130 分');
    assert.doesNotMatch(await summary().innerText(), /折算|变化/);
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
    assert.equal(await summary().locator('.gh-summary-value').first().innerText(), '100 分');
    assert.equal(await summary().locator('.gh-summary-value').last().innerText(), '110.5 分');
    assert.equal(await summary().locator('b.no').count(), 1);
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
      assert.match(await page.locator('.gh-total').innerText(), /待补成绩或满分/);
    }
    await fixture([]);
    assert.equal(await chip().locator('b').innerText(), '—');
    await fixture([exam(85, 100, { scores: { 数学: { actual: 85, max: 100 }, 英语: { actual: 60, max: 75 } } })],
      [{ name: '数学', defaultMax: 130 }, { name: '英语', defaultMax: 150 }],
      { subjects: { 数学: 110.5, 英语: 120 }, totalGoal: 230.5 });
    assert(Math.abs((await page.evaluate(() => __v33.debug())).rec.rate - 230.5 / 280 * 100) < 1e-10);
    assert.equal(await page.locator('.gh-total > b').innerText(), '已达标');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await summary().locator('.gh-summary-raw').first().innerText(), '原始 145/175 分');
    assert.equal(await summary().locator('b.ok').count(), 1);
    // Theme tokens are resolved at render time, including dark themes and font scale.
    await page.evaluate(() => document.documentElement.style.cssText = '--panel-solid:rgb(22,30,40);--text:rgb(232,239,245);--muted:rgb(168,178,188);--line:rgb(70,80,90);--green:rgb(93,203,153);--danger:rgb(243,122,122);--ui-scale:1.25');
    assert.equal(await summary().locator('.gh-summary-item').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(22, 30, 40)');
    assert.equal(await summary().locator('.gh-summary-value').first().evaluate(e=>getComputedStyle(e).color),'rgb(232, 239, 245)');
    assert.equal(await summary().locator('b.ok').evaluate(e=>getComputedStyle(e).color),'rgb(93, 203, 153)');
    for (const width of [320, 390, 768, 1200]) {
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => document.documentElement.removeAttribute('style'));
    await page.evaluate(() => __v33.open());
    assert.match(await page.locator('.gm-grid').innerText(), /满分 130 · 最高分 85\/100/);
    assert.match(await page.locator('.gm-label').first().innerText(), /按科目设置的满分/);
    await page.locator('.gm-x').click();
    // Tablet regression: six evenly distributed subject cards, balanced editor rows,
    // and an always-visible save footer on shorter landscape viewports.
    const names = ['语文','数学','英语','物理','化学','生物'];
    const configs = names.map(name => ({name,defaultMax:100}));
    await fixture([{exam_date:'2026-11-01',scores:Object.fromEntries(names.map(name=>[name,{actual:80,max:name==='生物'?90:100}]))}], configs,
      {subjects:Object.fromEntries(names.map(name=>[name,85])),totalGoal:510,school:'示例学校',date:'2027-01-15',dateName:'期末考试'});
    for (const width of [768, 1024, 1180, 1366]) {
      await page.setViewportSize({width,height:700});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const cards=await page.locator('.gh-chip').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().width));
      assert.equal(cards.length,6);
      assert.equal(await page.locator('.gh-chips').evaluate(e=>getComputedStyle(e).alignItems),'flex-start');
      assert.equal(await page.locator('.gh-chip em').first().evaluate(e=>getComputedStyle(e).marginTop),'0px');
      assert(Math.max(...cards)-Math.min(...cards)<2,'tablet subject cards should share width');
      await page.evaluate(()=>__v33.open());
      assert.equal(await page.locator('.gm-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
      const footer=await page.locator('#gv33Save').boundingBox();
      assert(footer&&footer.y>=0&&footer.y+footer.height<=700,'save must remain in viewport');
      assert.equal(await page.locator('.gm-body').evaluate(e=>getComputedStyle(e).overflowY),'auto');
      await page.locator('.gm-x').click();
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>__v33.open());
    assert.equal(await page.locator('.gm-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2);
    await page.locator('.gm-x').click();
    await fixture([exam(85,100,{scores:{数学:{actual:85,max:100},英语:{actual:60,max:75}}})],
      [{name:'数学',defaultMax:130},{name:'英语',defaultMax:150}],
      {subjects:{数学:110.5,英语:120},totalGoal:230.5});
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
