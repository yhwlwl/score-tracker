// Actual production scripts; exercise storage transactions, local card overrides and cancellation.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.resolve(__dirname, ".."),
  read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pause = () => new Promise((resolve) => setTimeout(resolve, 35));
const exam = {
  id: "studio-example",
  name: "阶段检测",
  exam_date: "2026-10-10",
  scores: {
    数学: { actual: 128, max: 150, rank: 12, participants: 100 },
    语文: { actual: 116, max: 150 },
    英语: { actual: 121, max: 150 },
  },
};
async function harness(storage = {}) {
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!e.message.includes("CSS")) errors.push(e.message);
  });
  const dom = new JSDOM(
      read("index.html").replace(/<script[\s\S]*?<\/script>/g, ""),
      {
        url: "https://studio.test/",
        runScripts: "outside-only",
        pretendToBeVisual: true,
        virtualConsole: vc,
      },
    ),
    w = dom.window,
    d = w.document;
  Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.requestAnimationFrame = (fn) => w.setTimeout(() => fn(0), 0);
  w.cancelAnimationFrame = (id) => w.clearTimeout(id);
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    addListener() {},
  });
  w.scrollTo = () => {};
  w.setInterval = () => 1;
  w.AbortController = AbortController;
  w.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        enabled: false,
        exams: [],
        subjects: [],
        modules: [],
        options: [],
        myVotes: [],
        suggestions: [],
        config: { enabled: false },
      }),
    );
  w.eval(read("app-bundle.js") + "\nwindow.state=state;");
  for (const f of [
    "feature-vote.js",
    "app-v36.js",
    "app-v37.js",
    "app-v38.js",
    "appearance-studio.js",
  ])
    w.eval(read(f));
  await pause();
  Object.assign(w.state, {
    user: { id: "synthetic", username: "界面示例" },
    token: "synthetic",
    page: "account",
    allExams: [exam],
    exams: [exam],
    unfilteredVisibleExamsV13: [exam],
    modulesV18: [],
    gradeFiltersV61: [],
  });
  w.applyExamSubjectsV10(w.state.exams, []);
  w.render();
  await pause();
  const click = (selector) => {
    const b = d.querySelector(selector);
    assert(b, "missing control " + selector);
    b.click();
  };
  const saved = () =>
    Object.fromEntries(
      Array.from({ length: w.localStorage.length }, (_, i) => {
        const k = w.localStorage.key(i);
        return [k, w.localStorage.getItem(k)];
      }),
    );
  return { w, d, errors, click, saved, close: () => w.close() };
}
(async () => {
  let h = await harness();
  try {
    const { w, d, click } = h,
      basePalette = w.__v29.currentTheme();
    assert.equal(w.ScoreAppearance.themes.length, 13);
    assert.equal(w.ScoreAppearance.decorations.length, 48);
    assert.equal(d.querySelectorAll("[data-st-open]").length, 1);
    click("[data-st-open]");
    for (const theme of w.ScoreAppearance.themes) {
      click("[data-preset=" + theme.id + "]");
      assert.equal(d.documentElement.dataset.stBackground, theme.id);
      assert.equal(d.querySelectorAll('.shell .st-ornament').length, theme.charm ? 1 : 0, 'paired presets decorate only one card');
      assert.equal(
        d
          .querySelector("[data-preset=" + theme.id + "]")
          .getAttribute("aria-pressed"),
        "true",
      );
    }
    assert.equal(
      w.localStorage.getItem("st_studio_v1"),
      null,
      "previews never persist",
    );
    assert.equal(w.localStorage.getItem("st_theme"), basePalette);
    click("[data-close]");
    assert.equal(w.__v29.currentTheme(), basePalette);
    assert.equal(d.documentElement.dataset.stBackground, "none");
    assert.equal(d.documentElement.dataset.stLook, "");
    assert.equal(d.querySelector(".st-studio"), null);
    click("[data-st-open]");
    click("[data-preset=garden]");
    click("[data-tab=decor]");
    click("[data-decoration-filter=line]");
    for (const id of ["cat", "plane", "flower"])
      click("[data-deco=" + id + "]");
    click("[data-position=left]");
    click("[data-undo]");
    assert.equal(
      d
        .querySelector("button[data-position=right]")
        .getAttribute("aria-pressed"),
      "true",
    );
    click("[data-tab=fonts]");
    click("[data-font=wenkai]");
    click("[data-title=smiley]");
    click("[data-size=large]");
    click("[data-tab=saved]");
    const input = d.getElementById("stLookName");
    input.value = "<img src=x onerror=alert(1)>";
    input.form.requestSubmit();
    assert.equal(d.querySelector(".st-saved img"), null);
    assert.equal(
      JSON.parse(w.localStorage.getItem("st_studio_saved_v1")).length,
      1,
    );
    click("[data-apply]");
    assert.equal(w.ScoreAppearance.get().theme, "garden");
    assert.equal(w.ScoreAppearance.get().deco, "flower");
    assert.equal(w.ScoreAppearance.get().title, "smiley");
    assert.equal(w.__v29.reading().font, "wenkai");
    click('[data-st-open]');
    click('[data-tab=decor]');
    click('[data-decoration-filter=sticker]');
    assert.equal(d.querySelectorAll('.st-sticker-grid img').length,12);
    click('[data-deco=sticker-open-book]');
    assert.equal(d.querySelectorAll('.shell .st-ornament').length,1);
    assert.equal(d.querySelector('.shell .st-ornament').dataset.kind,'sticker');
    assert.equal(d.querySelector('.st-preview .st-ornament').dataset.kind,'sticker');
    assert.equal(d.querySelector('[data-range=scale]').value,'56');
    click('[data-apply]');
    const reloaded = await harness(h.saved());
    assert.equal(reloaded.w.ScoreAppearance.get().deco,'sticker-open-book');
    assert.equal(reloaded.w.ScoreAppearance.get().scale,56);
    reloaded.close();
    click('[data-st-open]'); click('[data-tab=decor]'); click('[data-decoration-filter=line]'); click('[data-deco=flower]'); click('[data-apply]');
    click('[data-st-open]');click('[data-preset=starlit-tide]');
    assert.equal(d.documentElement.dataset.stArt,'illustrated');
    assert.equal(d.querySelector('.shell .st-ornament').dataset.kind,'charm');
    assert.equal(d.querySelectorAll('.shell .st-ornament').length,1);
    click('[data-view-art]');
    assert(d.querySelector('.st-art-viewer').open);
    assert(d.querySelector('.st-art-viewer img').src.endsWith('starlit-tide-v2.webp'));
    click('.st-art-viewer button');
    assert.equal(d.querySelector('.st-art-viewer'),null);
    click('[data-tab=decor]');
    assert.equal(d.querySelectorAll('.st-charm-grid img').length,8);
    click('[data-deco=charm-hello-puppy]');click('[data-apply]');
    const detailed = await harness(h.saved());
    assert.equal(detailed.w.ScoreAppearance.get().deco,'charm-hello-puppy');
    assert.equal(detailed.w.ScoreAppearance.get().scale,112);
    assert.equal(detailed.d.querySelector('.shell .st-ornament').dataset.style,'simple');
    detailed.close();
    click('[data-st-open]');click('[data-preset=garden]');click('[data-tab=decor]');click('[data-decoration-filter=line]');click('[data-deco=flower]');click('[data-tab=fonts]');click('[data-title=smiley]');click('[data-font=wenkai]');click('[data-size=large]');click('[data-apply]');
    let storage = h.saved();
    h.close();
    h = await harness(storage);
    assert.equal(h.w.ScoreAppearance.get().theme, "garden");
    assert.equal(h.w.__v29.reading().font, "wenkai");
    assert.equal(h.w.__v29.reading().size, "large");
    h.click("[data-st-open]");
    h.click("[data-preset=night]");
    h.d
      .querySelector("dialog")
      .dispatchEvent(new h.w.Event("cancel", { cancelable: true }));
    assert.equal(h.w.ScoreAppearance.get().theme, "garden");
    assert.equal(h.w.__v29.currentTheme(), "mint");
    assert.equal(h.w.__v29.reading().font, "wenkai");
    h.click("[data-st-edit]");
    const cards = Array.from(h.d.querySelectorAll("[data-st-key]"));
    assert(cards.length > 1);
    cards[0].querySelector(".st-edit-card").click();
    h.click("[data-deco=cat]");
    const range = h.d.querySelector("[data-range=scale]");
    range.value = "40";
    range.dispatchEvent(new h.w.Event("change", { bubbles: true }));
    assert(
      h.d
        .querySelector(".st-preview .st-ornament")
        .innerHTML.includes("m13 26"),
    );
    h.click("[data-apply]");
    assert.equal(cards[0].querySelector(".st-ornament").dataset.id, "cat");
    assert.equal(cards[1].querySelector(".st-ornament"), null);
    assert.equal(cards[0].style.getPropertyValue("--st-deco-size"), "40px");
    assert.equal(cards[1].style.getPropertyValue("--st-deco-size"), "");
    cards[0].querySelector(".st-edit-card").click();
    h.click("[data-inherit]");
    h.click("[data-apply]");
    assert.equal(cards[0].querySelector(".st-ornament").dataset.id, "flower");
    h.d.querySelector(".st-edit-bar button").click();
    assert.equal(h.d.querySelector(".st-edit-card"), null);
    h.click('[data-st-open]');
    h.click('[data-tab=background]');
    h.click('[data-bg=night]');
    const intensity = h.d.querySelector('[data-range=intensity]');
    intensity.value = '25';
    intensity.dispatchEvent(new h.w.Event('input', {bubbles:true}));
    assert.equal(h.d.documentElement.style.getPropertyValue('--st-art-opacity'), '0.25');
    intensity.dispatchEvent(new h.w.Event('change', {bubbles:true}));
    h.click('[data-page-preview]');
    assert(!h.d.querySelector('dialog').open);
    assert.equal(h.d.getElementById('stBackdrop').dataset.scene, 'night');
    h.click('[data-return]');
    assert(h.d.querySelector('dialog').open);
    h.click('[data-close]');
    assert.equal(h.d.documentElement.dataset.stBackground, 'garden');
    h.click('[data-st-open]');
    h.click('[data-tab=background]');
    h.click('[data-background-filter=scenery]');
    assert.equal(h.d.querySelectorAll('.st-wallpaper').length, 3);
    h.click('[data-bg=coast-photo]');
    assert.equal(h.d.getElementById('stBackdrop').dataset.scene, 'coast-photo');
    assert.equal(h.w.__v29.currentTheme(), 'sakura');
    assert.equal(h.d.querySelector('[data-bg=coast-photo] .st-item-action').textContent, '试用中');
    h.click('[data-tab=decor]');
    h.click('[data-decoration-filter=line]');
    h.click('[data-deco=leaf]');
    assert(h.d.querySelector('.st-preview .st-ornament svg'));
    assert.equal(h.d.querySelectorAll('.shell .st-ornament').length, 1);
    h.click('[data-apply]');
    assert.equal(h.w.ScoreAppearance.get().background, 'coast-photo');
    assert.equal(h.w.ScoreAppearance.normalize({deco:'fluent-books',scale:52}).deco, 'none');
    storage = h.saved(); h.close(); h = await harness(storage);
    assert.equal(h.d.getElementById('stBackdrop').dataset.scene, 'coast-photo');
    assert.equal(h.w.ScoreAppearance.get().deco, 'leaf');
    // Palette and body-font controls inherited from #47 remain compatible with the atomic preferences.
    h.click("[data-theme-opt-v29=night]");
    h.click("[data-reading-font-v29=serif]");
    storage = h.saved();
    h.close();
    h = await harness(storage);
    assert.equal(h.w.__v29.currentTheme(), "night");
    assert.equal(h.w.__v29.reading().font, "serif");
    // Failed writes leave preview open and cancellation returns to the saved look.
    h.click("[data-st-open]");
    h.click("[data-preset=cloud]");
    h.w.Storage.prototype.setItem = () => {
      throw Error("quota");
    };
    h.click("[data-apply]");
    assert(h.d.querySelector("dialog"));
    assert(
      h.d.getElementById("stStudioStatus").textContent.includes("保存失败"),
    );
    h.click("[data-close]");
    assert.equal(h.w.__v29.currentTheme(), "night");
    assert.deepEqual(h.errors, []);
    h.close();
    const shore = await harness();
    shore.click('[data-st-open]'); shore.click('[data-preset=study-shore]');
    assert.equal(shore.d.documentElement.style.getPropertyValue('--accent'),'#356763');
    assert.equal(shore.d.querySelector('.shell .st-ornament').dataset.id,'charm-exam-pony');
    shore.click('[data-view-art]');
    assert(shore.d.querySelector('.st-art-viewer picture source').srcset.endsWith('study-shore-wide.webp'));
    shore.click('.st-art-viewer button'); shore.click('[data-apply]');
    const shoreReloaded = await harness(shore.saved());
    assert.equal(shoreReloaded.w.ScoreAppearance.get().theme,'study-shore');
    assert.equal(shoreReloaded.w.ScoreAppearance.get().deco,'charm-exam-pony');
    assert.equal(shoreReloaded.w.ScoreAppearance.get().scale,112);
    assert.equal(shoreReloaded.d.documentElement.dataset.stLook,'study-shore');
    shoreReloaded.click('[data-st-open]');shoreReloaded.click('[data-preset=cloud]');
    assert.equal(shoreReloaded.d.documentElement.style.getPropertyValue('--accent'),'#096a9e','leaving the theme restores base palette');
    shoreReloaded.click('[data-close]');
    assert.equal(shoreReloaded.d.documentElement.style.getPropertyValue('--accent'),'#356763','cancel restores the complete palette');
    shoreReloaded.close();shore.close();
    for (const raw of [
      "null",
      "[]",
      "broken",
      '{"theme":"<img>","deco":"<svg>","scale":999,"intensity":-3,"overrides":{"__proto__":{"deco":"cat"}}}',
    ]) {
      h = await harness({ st_studio_v1: raw });
      assert.equal(h.w.ScoreAppearance.get().theme, "");
      assert.equal(h.d.querySelector("img[src=x]"), null);
      assert.equal(Object.prototype.deco, undefined);
      assert.deepEqual(h.errors, []);
      h.close();
    }
    console.log(
      "PASS: thirteen themes, eight simple charms, paired palettes and pony save/reload/cancel, compatible backgrounds, classic ornaments, galleries, preview, undo, favorites, local overrides and malformed storage.",
    );
  } finally {
    h.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
