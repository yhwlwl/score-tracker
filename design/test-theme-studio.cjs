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
    assert.equal(w.ScoreAppearance.themes.length, 6);
    assert.equal(w.ScoreAppearance.decorations.length, 24);
    assert.equal(d.querySelectorAll("[data-st-open]").length, 1);
    click("[data-st-open]");
    for (const theme of w.ScoreAppearance.themes) {
      click("[data-preset=" + theme.id + "]");
      assert.equal(d.documentElement.dataset.stBackground, theme.id);
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
    assert.equal(d.querySelector(".st-studio"), null);
    click("[data-st-open]");
    click("[data-preset=garden]");
    click("[data-tab=decor]");
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
    range.value = "52";
    range.dispatchEvent(new h.w.Event("change", { bubbles: true }));
    assert(
      h.d
        .querySelector(".st-preview .st-ornament")
        .innerHTML.includes("m13 26"),
    );
    h.click("[data-apply]");
    assert.equal(cards[0].querySelector(".st-ornament").dataset.id, "cat");
    assert.equal(cards[1].querySelector(".st-ornament").dataset.id, "flower");
    assert.equal(cards[0].style.getPropertyValue("--st-deco-size"), "52px");
    assert.equal(cards[1].style.getPropertyValue("--st-deco-size"), "");
    cards[0].querySelector(".st-edit-card").click();
    h.click("[data-inherit]");
    h.click("[data-apply]");
    assert.equal(cards[0].querySelector(".st-ornament").dataset.id, "flower");
    h.d.querySelector(".st-edit-bar button").click();
    assert.equal(h.d.querySelector(".st-edit-card"), null);
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
      "PASS: six themes, 24 decorations, transient preview, cancel/Escape, undo, save/reload, escaped favorites, local overrides/inheritance, legacy controls, blocked and malformed storage.",
    );
  } finally {
    h.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
