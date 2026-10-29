/* Theme studio: transactional local preferences and self-hosted appearance assets. */
(function () {
  "use strict";
  if (!window.__v29) return;
  const engine = window.__v29,
    root = document.documentElement,
    KEY = "st_studio_v1",
    SAVED = "st_studio_saved_v1";
  const themes = [
    {
      id: "cloud",
      name: "云间天蓝",
      desc: "浅蓝渐变 · 层叠云影",
      palette: "sky",
      bg: "#e8f4ff",
      ink: "#246b8a",
      panel: "#fff",
      card: "soft",
      deco: "cloud",
      font: "system",
      title: "system",
    },
    {
      id: "notebook",
      name: "方格笔记",
      desc: "浅灰蓝 · 细方格纹理",
      palette: "sky",
      bg: "#edf3f5",
      ink: "#376275",
      panel: "#fff",
      card: "outline",
      deco: "clip",
      font: "sans",
      title: "system",
    },
    {
      id: "garden",
      name: "薄荷花园",
      desc: "鼠尾草绿 · 柔和光晕",
      palette: "mint",
      bg: "#eef3eb",
      ink: "#3f7257",
      panel: "#fffef9",
      card: "soft",
      deco: "sprout",
      font: "system",
      title: "system",
    },
    {
      id: "dawn",
      name: "晨光奶油",
      desc: "暖米白 · 杏色渐变",
      palette: "paper",
      bg: "#f7f0e1",
      ink: "#8c6237",
      panel: "#fffdf8",
      card: "clean",
      deco: "sun",
      font: "system",
      title: "system",
    },
    {
      id: "night",
      name: "星河夜读",
      desc: "深海蓝 · 星点微光",
      palette: "night",
      bg: "#101927",
      ink: "#c7b88c",
      panel: "#1c2838",
      card: "outline",
      deco: "moon",
      font: "system",
      title: "system",
    },
    {
      id: "journal",
      name: "复古手账",
      desc: "暖纸色 · 细点纹理",
      palette: "paper",
      bg: "#f0e8da",
      ink: "#88664e",
      panel: "#fffaf0",
      card: "paper",
      deco: "tape",
      font: "serif",
      title: "wenkai",
    },
  ];
  const drawings = {
    cloud:
      '<path d="M14 43c-12-1-12-18-1-20 0-16 24-20 29-5 18-3 24 22 6 25Z"/><path d="m23 50-3 5m17-5-3 5"/>',
    sun: '<circle cx="32" cy="32" r="13"/><path d="M32 5v7m0 40v7M5 32h7m40 0h7M13 13l5 5m28 28 5 5M13 51l5-5m28-28 5-5"/>',
    moon: '<path d="M39 9A24 24 0 1 0 54 45 26 26 0 0 1 39 9Z"/><path d="m48 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>',
    star: '<path d="m32 8 7 15 17 3-12 12 3 17-15-8-15 8 3-17L8 26l17-3Z"/>',
    plane:
      '<path d="m7 27 50-16-16 45-12-19Z"/><path d="m29 37 28-26M29 37l-2 15 8-7"/>',
    sprout:
      '<path d="M32 56V30M32 36C7 37 8 13 8 13s27-4 24 23ZM32 28C33 7 56 9 56 9s2 22-24 24Z"/><path d="m13 19 15 13m20-15L35 29"/>',
    leaf: '<path d="M50 10C15 5 1 40 22 50c20 13 34-9 28-40Z"/><path d="M14 56 43 20M24 43l-2-15m12 5 12-2"/>',
    flower:
      '<path d="M32 56V35m0 15 13-8"/><path d="M25 16c-6-14 20-14 14 0 14-6 17 18 3 17 9 13-15 22-17 7-15 7-22-18-7-18-5-9 5-13 7-6Z"/><circle cx="31" cy="27" r="5"/>',
    clover:
      '<path d="M32 56V32M32 32C7 34 6 12 20 12c7-1 12 7 12 7s5-9 12-7c15 1 12 23-12 20Zm0 0C8 29 7 49 20 50c7 1 12-7 12-7s6 9 13 7c14-3 9-21-13-18Z"/>',
    cactus:
      '<path d="M25 45V16a7 7 0 0 1 14 0v29M25 34H15a5 5 0 0 1-5-5V19h6v9h9m14 8h10a5 5 0 0 0 5-5V21h-6v9h-9M20 45h24l-3 14H23Z"/>',
    clip: '<path fill="none" d="m22 43 21-24c9-11-3-21-11-12L12 32c-14 17 5 33 18 18l18-21M21 35l13-16c4-5 8-1 4 4L18 47"/>',
    tape: '<path d="m8 18 48-5-3 7 6 6-5 7 4 8-48 7 3-8-6-6 5-8Z"/><path d="m18 22 5 18m7-20 5 18m7-20 5 18" opacity=".4"/>',
    bookmark:
      '<path d="M20 8h24v49L32 47 20 57Z"/><path d="M26 19h12m-12 7h12"/>',
    pencil:
      '<path d="m12 43 30-31 12 12-30 31-16 4Z"/><path d="m35 19 12 12M12 43l12 12m-7-6 27-27M8 59l4-10"/>',
    book: '<path d="M32 17C19 8 7 14 7 14v37s12-6 25 2c13-8 25-2 25-2V14s-12-6-25 3Zv36"/><path d="m14 23 11 2m-11 8 11 2m14-10 11-2m-11 12 11-2"/>',
    ruler:
      '<path d="m9 44 35-35 13 13-35 35Z"/><path d="m38 15 5 5m-12 2 4 4m-11 3 5 5m-12 2 4 4m-10 3 5 5"/>',
    bulb: '<path d="M22 42c0-8-9-9-9-21a19 19 0 0 1 38 0c0 12-9 13-9 21Zm0 6h20m-17 6h14M32 41V26m-7-5 7 5 7-5"/>',
    mug: '<path d="M13 25h31v21c0 13-31 13-31 0Zm31 3h6c13 0 11 18-6 16M22 17c-7-7 7-7 0-14m12 14c-7-7 7-7 0-14"/>',
    cat: '<path d="m13 26 1-17 15 12h7L51 9l1 17c14 32-53 32-39 0Z"/><path d="M22 33v3m20-3v3m-13 5 3 3 3-3M9 38H3m52 0h6"/>',
    bird: '<path d="M9 49c27 0 40-13 40-27 0-15-23-17-25-2L9 15l6 16-6 18Z"/><path d="m49 21 11 5-12 4M20 38q13 4 18-10"/><circle cx="39" cy="19" r="1.5"/>',
    mountain:
      '<path d="m4 53 20-37 13 23 8-16 15 30Z"/><path d="m17 29 7 4 6-5m9 8 7 3 5-4"/>',
    heart:
      '<path d="M32 54S3 35 7 20c4-15 21-13 25-2 5-11 23-13 26 2 4 15-26 34-26 34Z"/>',
    bell: '<path d="M14 43h36l-5-8V23c0-17-26-17-26 0v12ZM26 49q6 12 12 0M32 5V1"/>',
    ribbon:
      '<circle cx="32" cy="25" r="17"/><path d="m19 37-5 23 12-5 6 7 4-21m7-4 7 23-12-5-6 7"/><path d="m32 15 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  };
  const names = [
    "云朵",
    "太阳",
    "月亮",
    "星星",
    "纸飞机",
    "嫩芽",
    "叶片",
    "花朵",
    "四叶草",
    "仙人掌",
    "回形针",
    "胶带",
    "书签",
    "铅笔",
    "书本",
    "直尺",
    "灯泡",
    "马克杯",
    "小猫",
    "小鸟",
    "远山",
    "爱心",
    "铃铛",
    "绶带",
  ];
  const charms = [
    ["exam-pony","马上上岸","粉色小马 · 轻快出发"],
    ["hello-puppy","小狗打招呼","软软耳朵 · 一声 Hi"],
    ["quiet-kitten","趴书小猫","奶油小猫 · 一本小书"],
    ["quiet-fox","晚安小狐","弯弯月牙 · 安静好梦"],
  ].map(([file,name,desc]) => ({id:"charm-"+file,name,desc,file,group:"charm",simple:true}));
  const legacyCharms = [
    ["reading-kitten","书香小猫","奶油绒毛 · 书本与花枝"],
    ["moon-fox","月光小狐","琉璃月牙 · 星星与绣球"],
    ["garden-bear","花园小熊","花瓷茶杯 · 缎带与雏菊"],
    ["cloud-whale","云海来信","珍珠云鲸 · 星瓶与花晶"],
  ].map(([file,name,desc]) => ({id:"charm-"+file,name,desc,file,group:"legacy"}));
  const isSimpleCharm = id => charms.some(d => d.id === id);
  const isCharm = id => isSimpleCharm(id) || legacyCharms.some(d => d.id === id);
  const decorKind = id => isCharm(id) ? "charm" : isSticker(id) ? "sticker" : "line";
  const stickers = [
    ["rain-window", "雨后窗边"], ["crescent", "晚安月牙"],
    ["butterfly", "橙色蝴蝶"], ["ginger-cat", "橘猫探头"],
    ["sunshine", "晴天心情"], ["blossom", "花开正好"],
    ["mushrooms", "林间蘑菇"], ["rainbow", "云上彩虹"],
    ["aquarium", "小鱼来信"], ["open-book", "翻开一页"],
    ["houseplant", "窗边绿植"], ["warm-mug", "热饮时光"],
  ].map(([id, name]) => ({id: "sticker-" + id, name, group: "sticker", file: id}));
  const isSticker = id => stickers.some(d => d.id === id);
  const scaleLimits = id => isSimpleCharm(id) ? [96, 144, 112] : isCharm(id) ? [80, 120, 96] : isSticker(id) ? [40, 72, 56] : [24, 40, 32];
  const decorations = Object.keys(drawings).map((id, i) => ({
    id,
    name: names[i],
    group: "line",
  })).concat(stickers, charms, legacyCharms);
  const photos = [
    {id:"sky-photo", name:"晴空", desc:"柔软云层 · 浅天蓝", file:"clouds", palette:"sky", bg:"#e8f4ff", panel:"#fff", ink:"#246b8a", category:"scenery", author:"Cuvii"},
    {id:"meadow-photo", name:"青草地", desc:"开阔草坡 · 清新绿", file:"meadow", palette:"mint", bg:"#eef3eb", panel:"#fffefb", ink:"#3f7257", category:"scenery", author:"Spencer DeMera"},
    {id:"coast-photo", name:"晚霞海岸", desc:"粉色晚霞 · 平静海面", file:"sea", palette:"sakura", bg:"#f9edf1", panel:"#fffafa", ink:"#a95d76", category:"scenery", author:"Veronica Moreno-Alvarez"},
  ];
  const legacyIllustrated = [
    {id:"flower-day", name:"花间晴日", desc:"奶油底色 · 彩色花园", category:"illustration", palette:"paper", bg:"#f8f4e6", panel:"#fffdf8", ink:"#817339", card:"soft", font:"system", title:"system"},
    {id:"moon-window", name:"月色窗边", desc:"雾蓝夜色 · 月牙星光", category:"illustration", palette:"sky", bg:"#e9edf6", panel:"#fcfcff", ink:"#657794", card:"soft", font:"system", title:"system"},
  ];
  legacyIllustrated.forEach(t => t.category = "legacy");
  const illustrated = [
    {id:"study-shore",name:"马上上岸",desc:"晴岸晨光 · 奶油蓝绿",category:"illustration",wallpaper:"study-shore",landscape:"study-shore-wide",palette:"sky",bg:"#edf4f1",panel:"#fffef9",ink:"#356763",card:"soft",font:"system",title:"system",charm:"charm-exam-pony",tokens:{
      "--text":"#263f3b","--muted":"#60756e","--line":"#dde6df","--accent":"#356763","--accent-soft":"#e8f1eb",
      "--green":"#387658","--green-soft":"#eaf4eb","--logo-a":"#6e9281","--logo-b":"#c3d8ba",
      "--nav-glass":"rgba(255,254,249,.96)","--navbg":"rgba(255,254,249,.96)","--nav-active":"#e7eee1","--nav-line":"#e5eade","--navline":"#e5eade",
      "--chip-bg":"#fffef9","--cell":"#f1f6ef","--line-soft":"#dbe5da","--axis":"#6d837a","--point-label":"#60756e","--grid":"#e1e9e4","--dotfill":"#fffef9",
      "--focus":"#356763","--focus-ring":"rgba(53,103,99,.18)","--sel-bg":"#d4e7db","--sel-text":"#263f3b",
      "--shadow":"0 8px 28px rgba(48,84,67,.07)","--nav-shadow":"0 8px 28px rgba(48,84,67,.10)"
    }},
    {id:"sakura-atelier",name:"樱风书屋",desc:"一枝樱花 · 开阔晴空",category:"illustration",wallpaper:"sakura-atelier-v2",palette:"paper",bg:"#edf3f4",panel:"#fffdf9",ink:"#916d54",card:"soft",font:"system",title:"system",charm:"charm-quiet-kitten"},
    {id:"starlit-tide",name:"星海夜航",desc:"弯月云海 · 轻柔留白",category:"illustration",wallpaper:"starlit-tide-v2",palette:"violet",bg:"#edf0fa",panel:"#fdfbff",ink:"#7665a0",card:"soft",font:"system",title:"system",charm:"charm-quiet-fox"},
  ];
  const presets = [...illustrated, ...themes];
  const backgrounds = [...illustrated, ...photos, ...themes.map(t => ({...t, category:"minimal"})), ...legacyIllustrated];
  const backgroundIds = ["none", ...backgrounds.map(t => t.id)];
  const decorationIds = ["none", ...decorations.map(d => d.id)];
  const fonts = [
    ["system", "系统默认"],
    ["sans", "清晰黑体"],
    ["serif", "书卷宋体"],
    ["wenkai", "霞鹜文楷"],
    ["fangsong", "朱雀仿宋"],
    ["smiley", "得意黑"],
    ["happy", "站酷快乐体"],
  ];
  const cardStyles = [
    ["clean", "纯净", "轻盈实底"],
    ["soft", "柔光", "柔和阴影"],
    ["outline", "描边", "清晰线条"],
    ["paper", "纸张", "温暖双层"],
  ];
  const base = {
    theme: "",
    background: "none",
    intensity: 75,
    card: "soft",
    deco: "none",
    decorMode: "custom",
    position: "right",
    scale: 32,
    title: "system",
    overrides: {},
    palette: null,
    reading: null,
  };
  let prefs = normalize(read(KEY, base)),
    saved = read(SAVED, []),
    draft = null,
    dialog = null,
    tab = "themes",
    undo = [],
    returnFocus = null,
    edit = false,
    rangeEditing = null,
    pagePreview = false,
    previousEdit = false,
    backgroundFilter = "all",
    decorationFilter = "charm",
    showPreview = false;
  if (prefs.palette) setPalette(prefs.palette);
  if (prefs.reading) setReading(prefs.reading.font, prefs.reading.size);
  if (!Array.isArray(saved)) saved = [];
  saved = saved
    .slice(0, 8)
    .filter((x) => x && typeof x.name === "string")
    .map((x) => ({
      name: x.name.slice(0, 24),
      prefs: normalize(x.prefs),
      palette: validPalette(x.palette),
      reading: validReading(x.reading),
    }));
  function read(k, f) {
    try {
      return JSON.parse(localStorage.getItem(k)) || f;
    } catch (e) {
      return f;
    }
  }
  function write(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  }
  function copy(v) {
    return JSON.parse(JSON.stringify(v));
  }
  function member(v, a, f) {
    return a.includes(v) ? v : f;
  }
  function bounded(v, min, max, f) {
    return Number.isFinite(Number(v))
      ? Math.max(min, Math.min(max, Number(v)))
      : f;
  }
  function validPalette(v) {
    return member(
      v,
      engine.THEMES.map((t) => t.id),
      "sunny",
    );
  }
  function validReading(v) {
    v = v || {};
    return {
      font: member(
        v.font,
        fonts.slice(0, 5).map((x) => x[0]),
        "system",
      ),
      size: member(v.size, ["compact", "standard", "large"], "standard"),
    };
  }
  function normalize(x) {
    x = x && typeof x === "object" ? x : {};
    const p = {
      theme: member(
        x.theme,
        backgrounds.map((t) => t.id),
        "",
      ),
      background: member(
        x.background,
        backgroundIds,
        "none",
      ),
      intensity: bounded(x.intensity, 0, 100, 75),
      card: member(
        x.card,
        cardStyles.map((x) => x[0]),
        "soft",
      ),
      deco: member(x.deco, decorationIds, "none"),
      // Older presets duplicated an ornament onto every card. Keep explicit
      // card choices, but never migrate that repetition into the new defaults.
      decorMode: member(x.decorMode, ["none", "custom", "accent"], "custom"),
      position: member(x.position, ["left", "right"], "right"),
      scale: bounded(x.scale, ...scaleLimits(x.deco)),
      title: member(
        x.title,
        fonts.map((x) => x[0]),
        "system",
      ),
      overrides: {},
      palette: typeof x.palette === "string" ? validPalette(x.palette) : null,
      reading:
        x.reading && typeof x.reading === "object"
          ? validReading(x.reading)
          : null,
    };
    if (x.overrides && typeof x.overrides === "object")
      Object.entries(x.overrides)
        .slice(0, 100)
        .forEach(([k, v]) => {
          if (
            !["__proto__", "prototype", "constructor"].includes(k) &&
            /^[a-z0-9:_-]{1,120}$/i.test(k) &&
            v &&
            typeof v === "object"
          )
            p.overrides[k] = {
              deco: member(v.deco, decorationIds, "none"),
              position: member(v.position, ["left", "right"], "right"),
              scale: bounded(v.scale, ...scaleLimits(v.deco)),
            };
        });
    return p;
  }
  function esc(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function svg(id) {
    const charm = [...charms, ...legacyCharms].find(d => d.id === id);
    if (charm) return '<img src="./assets/themes/charms/' + charm.file + '.webp" alt="" width="' + (charm.simple ? '768' : '640') + '" height="' + (charm.simple ? '512' : '640') + '" decoding="async">';
    const sticker = stickers.find(d => d.id === id);
    if (sticker) return '<img src="./assets/themes/stickers/' + sticker.file + '.webp" alt="" width="480" height="480" decoding="async">';
    return drawings[id]
      ? '<svg viewBox="0 0 64 64" fill="color-mix(in srgb,currentColor 14%,transparent)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          drawings[id] +
          "</svg>"
      : "";
  }
  function active() {
    return draft ? draft.prefs : prefs;
  }
  function setPalette(id) {
    engine.applyTheme(id, true, false);
  }
  function setReading(font, size) {
    engine.applyReading(font, size, false);
  }
  function snapshot() {
    return {
      prefs: copy(active()),
      palette: engine.currentTheme(),
      reading: engine.reading(),
    };
  }
  function setVisual(p) {
    root.dataset.stCard = p.card;
    root.dataset.stTitle = p.title;
    root.dataset.stBackground = p.background;
    root.dataset.stLook = p.theme;
    root.dataset.stArt = backgrounds.find(t => t.id === p.background)?.wallpaper ? "illustrated" : "basic";
    let backdrop = document.getElementById("stBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "stBackdrop";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.prepend(backdrop);
    }
    backdrop.dataset.scene = p.background;
    root.style.setProperty("--st-art-opacity", String(p.intensity / 100));
    root.style.setProperty("--st-deco-size", p.scale + "px");
    const theme = backgrounds.find((t) => t.id === p.theme);
    root.style.setProperty(
      "--st-ornament",
      theme ? theme.ink : "var(--accent)",
    );
    if (theme) {
      root.style.setProperty("--bg", theme.bg);
      root.style.setProperty("--panel-solid", theme.panel);
      root.style.setProperty("--panel", theme.panel);
      Object.entries(theme.tokens || {}).forEach(([key,value]) => root.style.setProperty(key,value));
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = theme.bg;
    }
    // No data requests, chart reconstruction or application re-render during preview.
    decorate();
  }
  function cardKey(el) {
    if (el.dataset.stKey) return el.dataset.stKey;
    let h = el.querySelector(".card-title,h2,h3");
    if (!h) return null;
    let title = h.textContent.trim();
    let hash = 0;
    for (const c of title) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    return (
      String(typeof state !== "undefined" ? state.page : "page") +
      ":" +
      (el.id || "card-" + hash.toString(36))
    );
  }
  function eligible() {
    return Array.from(
      document.querySelectorAll(".shell .card,.ed-page .card"),
    ).filter(
      (el) =>
        !el.closest("#appearanceCardV29,dialog,.modal,.st-preview") &&
        cardKey(el),
    );
  }
  function decorate() {
    const p = active();
    eligible().forEach((el, index) => {
      const key = cardKey(el);
      el.dataset.stKey = key;
      const o = p.decorMode === "none" ? { deco: "none" } :
        p.overrides[key] || (p.decorMode === "accent" && index === 0 ? p : { deco: "none" });
      if (p.overrides[key] && o.scale)
        el.style.setProperty("--st-deco-size", o.scale + "px");
      else el.style.removeProperty("--st-deco-size");
      let mark = el.querySelector(":scope > .st-ornament");
      if (o.deco === "none") {
        if (mark) mark.remove();
        el.classList.remove("st-decorated");
      } else {
        if (!mark) {
          mark = document.createElement("span");
          mark.className = "st-ornament";
          mark.setAttribute("aria-hidden", "true");
          el.appendChild(mark);
        }
        if (mark.dataset.id !== o.deco) {
          mark.innerHTML = svg(o.deco);
          mark.dataset.id = o.deco;
        }
        mark.dataset.position = o.position;
        mark.dataset.kind = decorKind(o.deco);
        mark.dataset.style = isSimpleCharm(o.deco) ? "simple" : "classic";
        el.classList.add("st-decorated");
      }
      let b = el.querySelector(":scope > .st-edit-card");
      if (edit && !b) {
        b = document.createElement("button");
        b.className = "st-edit-card";
        b.type = "button";
        b.textContent = "设置挂件";
        b.addEventListener("click", () => {
          if (pagePreview) {
            target = key;
            tab = "decor";
            resumePreview();
          } else open("decor", key);
        });
        el.appendChild(b);
      }
      if (!edit && b) b.remove();
    });
  }
  function button(value, label, attr, selected, extra = "") {
    return (
      '<button type="button" ' +
      attr +
      '="' +
      esc(value) +
      '" aria-pressed="' +
      (value === selected) +
      '" class="st-choice ' +
      (value === selected ? "is-on" : "") +
      '">' +
      extra +
      "<span>" +
      esc(label) +
      "</span></button>"
    );
  }
  function choices(items, attr, selected) {
    return items.map((x) => button(x[0], x[1], attr, selected)).join("");
  }
  function preview() {
    const art = backgrounds.find(t => t.id === active().background);
    const p = active(),
      ornament = target ? p.overrides[target] || { ...p, deco: "none" } :
        p.decorMode === "accent" ? p : { ...p, deco: "none" };
    return (
      '<div class="st-preview" style="--st-deco-size:' +
      ornament.scale +
      'px" aria-label="外观预览"><div class="st-preview-top"><span>效果预览</span><span>示例数据</span></div><div class="st-preview-scene" data-scene="' +
      p.background +
      '"><div class="st-preview-greeting"><h3>成绩概览</h3></div><div class="st-preview-card st-surface"><span class="st-preview-label">数学 · 阶段检测</span><div class="st-preview-score">128.5 <small>/ 150</small></div><span class="st-preview-gain">较上次 +6.5 分</span><span class="st-ornament" data-position="' +
      ornament.position +
      '" data-kind="' + decorKind(ornament.deco) + '" data-style="' + (isSimpleCharm(ornament.deco) ? 'simple' : 'classic') + '">' +
      svg(ornament.deco) +
      '</span><svg class="st-preview-chart" viewBox="0 0 260 65" role="img" aria-label="示例成绩有升有降的趋势"><path d="M0 55H260M0 25H260" stroke="var(--line)"/><path d="M5 50 48 34 90 42 132 15 175 28 218 9 255 18" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/><g fill="var(--panel-solid)" stroke="var(--accent)" stroke-width="2"><circle cx="48" cy="34" r="3"/><circle cx="132" cy="15" r="3"/><circle cx="218" cy="9" r="3"/></g></svg></div><div class="st-preview-note st-surface"><b>考后反思</b><p>本次计算失误较少，继续检查解题步骤。</p></div></div><p class="st-preview-foot">当前背景：' +
      (backgrounds.find(t => t.id === p.background)?.name || "纯色") +
      ' · <span data-preview-intensity>' + p.intensity + '</span>%</p>' + (art?.wallpaper ? '<button type="button" class="st-link st-art-link" data-view-art>查看完整背景</button>' : '') + '<button type="button" class="st-link st-page-preview" data-page-preview>在当前页面预览</button></div>'
    );
  }
  let target = null;
  function itemState(selected, committed) {
    return selected ? (committed ? "已使用" : "试用中") : "试用";
  }
  function wallpaperTile(t) {
    const selected = active().background === t.id;
    const attr = t.landscape && tab === "themes" ? "data-preset" : "data-bg";
    return '<button type="button" class="st-wallpaper ' + (selected ? 'is-on' : '') + '" ' + attr + '="' + t.id + '" aria-pressed="' + selected + '"><span class="st-wallpaper-art" data-scene="' + t.id + '" style="--tile-bg:' + (t.bg || 'var(--bg)') + '">' +
      (t.wallpaper ? '<img src="./assets/themes/art/' + (t.landscape || t.wallpaper) + '-thumb.webp" width="480" height="' + (t.landscape ? '300' : '720') + '" alt="" loading="lazy" decoding="async">' : t.file ? '<img src="./assets/themes/photos/' + t.file + '-thumb.webp" width="480" height="480" alt="" loading="lazy" decoding="async">' : '') +
      '<span class="st-material-label">' + (t.landscape && tab === "themes" ? '成套主题' : t.category === 'illustration' ? '插画' : t.file ? '风景' : '简约') + '</span></span><b>' + t.name + '</b><span class="st-item-action">' + itemState(selected, prefs.background === t.id) + '</span></button>';
  }
  function filters(items, attr, selected) {
    return '<div class="st-filters" aria-label="素材分类">' + choices(items, attr, selected) + '</div>';
  }
  function content() {
    const p = active();
    if (tab === "themes")
      return (
        '<div class="st-collection-banner"><div><span>背景 · 挂件 · 卡片</span><h3>外观主题</h3><p>背景与挂件，自由搭配。</p><button class="st-banner-link" data-tab="background">浏览背景 →</button></div></div><div class="st-section-intro"><h3>精选背景</h3><button class="st-link" data-tab="background">查看全部 →</button></div><div class="st-background-grid st-featured-wallpapers st-curated-wallpapers">' + illustrated.map(wallpaperTile).join('') + '</div><div class="st-section-intro"><h3>主题预设</h3><p>背景、卡片与字体的一套搭配</p></div><div class="st-theme-grid">' +
        presets
          .map(
            (t) =>
              '<button type="button" class="st-theme ' +
              (p.theme === t.id ? "is-on" : "") +
              '" data-preset="' +
              t.id +
              '" aria-pressed="' +
              (p.theme === t.id) +
              '"><span class="st-theme-art" data-scene="' + t.id + '" style="--tile-bg:' +
              t.bg +
              ";--tile-ink:" +
              t.ink +
              ";--tile-panel:" +
              t.panel +
              '"><span class="st-tile-card"><i></i><b></b><em></em></span></span><span class="st-theme-copy"><b>' +
              t.name +
              "</b><small>" +
              t.desc +
              '</small></span><span class="st-selected" aria-hidden="true">✓</span></button>',
          )
          .join("") +
        '</div><p class="st-hint">选中主题后，可以到其他选项里继续微调。字号沿用你的阅读习惯。</p>'
      );
    if (tab === "background")
      return (
        '<div class="st-section-intro"><h3>页面背景</h3><p>点选试用，保存后生效</p></div>' +
        filters([["all","全部"],["illustration","插画"],["scenery","风景"],["minimal","简约纹理"]], "data-background-filter", backgroundFilter) +
        '<div class="st-background-grid">' + backgrounds.filter(t => t.category !== 'legacy' && (backgroundFilter === 'all' || t.category === backgroundFilter)).map(wallpaperTile).join('') +
        '</div><button class="st-link" data-bg="none" aria-pressed="' + (p.background === 'none') + '">不使用背景图片</button><label class="st-range">背景浓度 <output>' +
        p.intensity +
        '%</output><input type="range" min="0" max="100" value="' +
        p.intensity +
        '" data-range="intensity"></label><h3>基础配色</h3><div class="st-options">' +
        engine.THEMES.map((t) =>
          button(
            t.id,
            t.name,
            "data-palette",
            engine.currentTheme(),
            '<i class="st-color" style="background:' + t.dot + '"></i>',
          ),
        ).join("") +
        '</div><p class="st-hint st-source">插画背景与可爱挂件为 AI 生成。简约插画：<a href="https://openstickers.craftwork.design/" target="_blank" rel="noopener noreferrer">Craftwork Open Stickers</a>。摄影：Cuvii、Spencer DeMera、Veronica Moreno-Alvarez / Unsplash。纹理：Steve Schoger / Hero Patterns。<a href="./assets/themes/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">素材来源</a></p>'
      );
    if (tab === "cards")
      return (
        '<h3>卡片质感</h3><p class="st-hint">同一套样式应用到各个板块，保持页面协调。</p><div class="st-options st-card-options">' +
        cardStyles
          .map((x) =>
            button(
              x[0],
              x[1],
              "data-card",
              p.card,
              '<span class="st-card-mini" data-kind="' +
                x[0] +
                '"><i></i><i></i></span><small>' +
                x[2] +
                "</small>",
            ),
          )
          .join("") +
        "</div>"
      );
    if (tab === "decor") {
      const o = target ? p.overrides[target] || { ...p, deco: "none" } : p;
      return (
        "<h3>" +
        (target ? "此卡片的挂件" : "卡片挂件") +
        '</h3><p class="st-hint">' +
        (target
          ? "此处只修改选中的板块。"
          : "精选主题配有一款挂件，也可以单独选择或关闭。每页最多自动点缀首张卡片。") +
        '</p>' + (target ? '' : '<div class="st-options">' + choices([["custom","手动指定卡片"],["accent","每页首张卡片"],["none","不显示挂件"]],"data-decor-mode",p.decorMode) + '</div><button class="st-link" data-pick-card>在页面上选择卡片</button>') +
        filters([["charm","可爱挂件"],["line","经典线条"],["sticker","简约插画"]], "data-decoration-filter", decorationFilter) +
        '<div class="st-deco-grid ' + (decorationFilter === 'charm' ? 'st-charm-grid' : decorationFilter === 'sticker' ? 'st-sticker-grid' : '') + '">' +
        button(
          "none",
          "不使用",
          "data-deco",
          o.deco,
          '<span class="st-none">—</span>',
        ) +
        decorations.filter(d => d.group === decorationFilter)
          .map((d) => button(d.id, d.name, "data-deco", o.deco, svg(d.id) + (d.desc ? '<small>' + esc(d.desc) + '</small>' : '')))
          .join("") +
        '</div><p class="st-hint st-source">可爱挂件为 AI 生成。简约插画：<a href="https://openstickers.craftwork.design/" target="_blank" rel="noopener noreferrer">Craftwork Open Stickers</a> · <a href="./assets/themes/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">素材来源</a></p><h3>挂件位置</h3><div class="st-options">' +
        choices(
          [
            ["left", "左侧"],
            ["right", "右侧"],
          ],
          "data-position",
          o.position,
        ) +
        '</div><label class="st-range">挂件大小 <output>' +
        o.scale +
        ' px</output><input type="range" min="' + scaleLimits(o.deco)[0] + '" max="' + scaleLimits(o.deco)[1] + '" value="' +
        o.scale +
        '" data-range="scale"></label>' +
        (target
          ? '<button class="st-link" data-inherit>清除此卡片的单独设置</button>'
          : '<p class="st-hint">选择挂件后，仅预览在每页首张卡片上。其他卡片保持简洁。</p>')
      );
    }
    if (tab === "fonts")
      return (
        '<h3>字体与字号</h3><p class="st-hint">正文和标题可分别设置。</p><h4>正文字体</h4><div class="st-font-grid">' +
        fonts
          .slice(0, 5)
          .map((f) =>
            button(
              f[0],
              f[1],
              "data-font",
              engine.reading().font,
              '<span class="st-font-sample" data-font-sample="' +
                f[0] +
                '">字 Aa</span>',
            ),
          )
          .join("") +
        '</div><h4>标题字体</h4><div class="st-font-grid">' +
        fonts
          .map((f) =>
            button(
              f[0],
              f[1],
              "data-title",
              p.title,
              '<span class="st-font-sample" data-font-sample="' +
                f[0] +
                '">字 Aa</span>',
            ),
          )
          .join("") +
        '</div><h4>字号</h4><div class="st-options">' +
        choices(
          [
            ["compact", "小字"],
            ["standard", "标准"],
            ["large", "大字"],
          ],
          "data-size",
          engine.reading().size,
        ) +
        "</div>"
      );
    return (
      '<h3>已保存的外观</h3><p class="st-hint">保存在当前设备，最多 8 套。</p><form class="st-save-form"><label for="stLookName">名称</label><div><input id="stLookName" maxlength="24" placeholder="例如：夜间阅读" required><button type="submit" class="st-primary">收藏当前设置</button></div></form><div class="st-saved">' +
      (saved.length
        ? saved
            .map(
              (s, i) =>
                "<div><span>" +
                esc(s.name) +
                '</span><button class="st-link" data-load="' +
                i +
                '">使用</button><button class="st-link" data-delete="' +
                i +
                '" aria-label="删除搭配 ' +
                esc(s.name) +
                '">删除</button></div>',
            )
            .join("")
        : '<p class="st-hint">暂无收藏。</p>') +
      "</div>"
    );
  }
  function draw() {
    if (!dialog) return;
    dialog.dataset.tab = tab;
    dialog.dataset.showPreview = String(showPreview);
    const scroll = dialog.querySelector(".st-workspace")?.scrollTop || 0;
    const controlsScroll = dialog.querySelector(".st-controls")?.scrollTop || 0;
    const focus = document.activeElement;
    const attr =
      focus &&
      [
        "data-range",
        "data-font",
        "data-title",
        "data-size",
        "data-deco",
        "data-position",
        "data-decor-mode",
        "data-bg",
        "data-card",
        "data-preset",
        "data-tab",
        "data-palette",
        "data-background-filter",
        "data-decoration-filter",
      ].find((a) => focus.hasAttribute(a));
    const val = attr ? focus.getAttribute(attr) : null;
    dialog.innerHTML =
      '<header class="st-studio-head"><div><h2>外观设置</h2></div><button class="st-close" aria-label="取消并关闭外观设置" data-close>×</button></header><nav class="st-tabs" aria-label="外观设置分类">' +
      [
        ["themes", "推荐"],
        ["background", "背景"],
        ["decor", "挂件"],
        ["cards", "卡片"],
        ["fonts", "字体"],
        ["saved", "收藏"],
      ]
        .map((x) => button(x[0], x[1], "data-tab", tab))
        .join("") +
      '</nav><div class="st-workspace"><div class="st-controls">' +
      content() +
      "</div><aside>" +
      preview() +
      '</aside></div><footer class="st-studio-footer"><span id="stStudioStatus" role="status" aria-live="polite">当前试用：' + (backgrounds.find(t => t.id === active().background)?.name || '纯色背景') + ' · 保存后生效</span><div><button class="st-link st-mobile-preview-toggle" data-toggle-preview aria-expanded="' + showPreview + '">' + (showPreview ? '收起预览' : '查看效果') + '</button><button class="st-link" data-reset>重置</button><button class="st-link" data-undo ' +
      (!undo.length ? "disabled" : "") +
      '>撤销</button><button class="st-primary" data-apply>保存装扮</button></div></footer>';
    dialog.querySelector(".st-workspace").scrollTop = scroll;
    dialog.querySelector(".st-controls").scrollTop = controlsScroll;
    if (attr) {
      const b = Array.from(dialog.querySelectorAll("[" + attr + "]")).find(
        (x) => x.getAttribute(attr) === val,
      );
      if (b) b.focus({ preventScroll: true });
    }
  }
  function change(fn) {
    undo.push(snapshot());
    if (undo.length > 30) undo.shift();
    fn();
    draft.prefs = normalize(draft.prefs);
    setVisual(draft.prefs);
    draw();
  }
  function status(msg) {
    const el = document.getElementById("stStudioStatus");
    if (el) el.textContent = msg;
  }
  function inspectPage(pick = false) {
    pagePreview = true;
    previousEdit = edit;
    edit = pick;
    dialog.close();
    document.body.classList.remove("st-studio-open");
    const bar = document.createElement("div");
    bar.className = "st-edit-bar st-inspect-bar";
    bar.innerHTML = '<span>' + (pick ? '选择一张卡片设置挂件' : '正在预览 · 尚未保存') + '</span><button type="button" data-return>返回设置</button><button type="button" data-save>保存</button><button type="button" data-cancel>取消</button>';
    bar.querySelector("[data-return]").onclick = resumePreview;
    bar.querySelector("[data-save]").onclick = () => { resumePreview(); close(true); };
    bar.querySelector("[data-cancel]").onclick = () => { resumePreview(); close(false); };
    document.body.appendChild(bar);
    decorate();
    bar.querySelector("[data-return]").focus();
  }
  function resumePreview() {
    document.querySelector(".st-inspect-bar")?.remove();
    edit = previousEdit;
    pagePreview = false;
    decorate();
    draw();
    document.body.classList.add("st-studio-open");
    dialog.showModal();
    dialog.querySelector(".st-close").focus();
  }
  function open(section = "themes", key = null) {
    if (dialog) return;
    target = key;
    tab = section;
    showPreview = Boolean(key);
    backgroundFilter = "all";
    decorationFilter = key ? decorKind(active().overrides[key]?.deco || "none") : "charm";
    returnFocus = document.activeElement;
    draft = { ...snapshot() };
    undo = [];
    dialog = document.createElement("dialog");
    dialog.className = "st-studio";
    dialog.setAttribute("aria-label", "外观设置");
    document.body.appendChild(dialog);
    draw();
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close(false);
    });
    dialog.addEventListener("click", onClick);
    dialog.addEventListener("change", onChange);
    dialog.addEventListener("input", (e) => {
      if (e.target.matches("[data-range]")) {
        if (!rangeEditing) {
          undo.push(snapshot());
          if (undo.length > 30) undo.shift();
        }
        rangeEditing = e.target.dataset.range;
        updateRange(rangeEditing, +e.target.value);
        setVisual(draft.prefs);
        // Keep the slider node alive while dragging; only redraw its preview.
        dialog.querySelector("aside").innerHTML = preview();
        e.target.previousElementSibling.textContent =
          e.target.value + (e.target.dataset.range === "scale" ? " px" : "%");
        dialog.querySelector("[data-undo]").disabled = false;
      }
    });
    dialog.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = dialog.querySelector("#stLookName").value.trim();
      if (!name) return;
      if (saved.length >= 8) {
        status("已收藏 8 套，请先删除一套再保存。");
        return;
      }
      const next = [...saved, { name, ...snapshot() }];
      if (!write(SAVED, next)) {
        status("设备暂时无法保存，请检查浏览器存储设置。");
        return;
      }
      saved = next;
      draw();
      status("已收藏「" + name + "」");
    });
    document.body.classList.add("st-studio-open");
    dialog.showModal();
    dialog.querySelector(".st-close").focus();
  }
  function close(commit) {
    if (!dialog) return;
    if (commit) {
      const next = normalize(draft.prefs);
      next.palette = engine.currentTheme();
      next.reading = engine.reading();
      if (!write(KEY, next)) {
        status("保存失败，当前仍为预览。请检查浏览器存储设置，或取消退出。");
        return;
      }
      prefs = next;
      engine.applyTheme(engine.currentTheme(), true);
      engine.applyReading(engine.reading().font, engine.reading().size);
    } else {
      setPalette(draft.palette, true);
      setReading(draft.reading.font, draft.reading.size);
    }
    dialog.close();
    dialog.remove();
    document.body.classList.remove("st-studio-open");
    dialog = null;
    draft = null;
    rangeEditing = null;
    setVisual(prefs);
    mount();
    if (commit && typeof render === "function" && !edit) {
      const y = scrollY;
      render();
      scrollTo(0, y);
      mount();
    }
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    else
      document.querySelector("[data-st-open]")?.focus({ preventScroll: true });
  }
  function updateRange(key, value) {
        const p = draft.prefs;
        if (target && key === "scale") {
          p.overrides[target] = p.overrides[target] || {
            deco: "none",
            position: p.position,
            scale: p.scale,
          };
          p.overrides[target].scale = value;
        } else p[key] = value;
  }
  function onChange(e) {
    const key = e.target.dataset.range;
    if (!key) return;
    if (rangeEditing) {
      updateRange(key, +e.target.value);
      rangeEditing = null;
      setVisual(draft.prefs);
      draw();
    } else change(() => updateRange(key, +e.target.value));
  }
  function viewArtwork() {
    const t = backgrounds.find(t => t.id === active().background);
    if (!t?.wallpaper) return;
    const viewer = document.createElement("dialog");
    viewer.className = "st-art-viewer"; viewer.setAttribute("aria-label", t.name + "完整背景");
    const painting = '<img src="./assets/themes/art/' + t.wallpaper + '.webp" alt="' + t.name + '完整背景原画">';
    viewer.innerHTML = '<button type="button" aria-label="关闭完整背景">×</button>' + (t.landscape ? '<picture><source media="(min-width:900px)" srcset="./assets/themes/art/' + t.landscape + '.webp">' + painting + '</picture>' : painting) + '<p><b>' + t.name + '</b><span>完整背景预览</span></p>';
    const close = () => {viewer.close();viewer.remove();dialog?.querySelector('[data-view-art]')?.focus();};
    viewer.querySelector('button').onclick = close;
    viewer.addEventListener('cancel', e => {e.preventDefault();close();});
    document.body.appendChild(viewer);viewer.showModal();viewer.querySelector('button').focus();
  }
  function onClick(e) {
    const b = e.target.closest("button");
    if (!b || (b.type === "submit" && b.closest("form"))) return;
    if (b.hasAttribute("data-view-art")) return viewArtwork();
    if (b.hasAttribute("data-close")) return close(false);
    if (b.hasAttribute("data-apply")) return close(true);
    if (b.hasAttribute("data-page-preview")) return inspectPage();
    if (b.hasAttribute("data-pick-card")) return inspectPage(true);
    if (b.hasAttribute("data-toggle-preview")) { showPreview = !showPreview; draw(); return; }
    if (b.dataset.decorationFilter) { decorationFilter = b.dataset.decorationFilter; draw(); return; }
    if (b.dataset.backgroundFilter) { backgroundFilter = b.dataset.backgroundFilter; draw(); return; }
    if (b.dataset.tab) {
      tab = b.dataset.tab;
      target = null;
      draw();
      dialog.querySelector(".st-workspace").scrollTop = 0;
      dialog.querySelector(".st-controls").scrollTop = 0;
      return;
    }
    if (b.hasAttribute("data-undo")) {
      const s = undo.pop();
      if (s) {
        draft.prefs = s.prefs;
        setPalette(s.palette, true);
        setReading(s.reading.font, s.reading.size);
        setVisual(draft.prefs);
        draw();
      }
      return;
    }
    if (b.hasAttribute("data-delete")) {
      const i = +b.dataset.delete,
        next = saved.filter((_, j) => j !== i);
      if (write(SAVED, next)) {
        saved = next;
        draw();
      } else status("删除失败，请检查浏览器存储设置。");
      return;
    }
    change(() => {
      const p = draft.prefs;
      if (b.dataset.preset) {
        const t = presets.find((t) => t.id === b.dataset.preset);
        if (!t) return;
        draft.prefs = {
          ...copy(base),
          theme: t.id,
          background: t.id,
          card: t.card,
          deco: t.charm || "none",
          decorMode: t.charm ? "accent" : "custom",
          scale: t.charm ? scaleLimits(t.charm)[2] : 32,
          title: t.title,
          intensity: t.wallpaper ? 100 : 75,
        };
        setPalette(t.palette, true);
        setReading(t.font, engine.reading().size);
      } else if (b.dataset.bg) {
        p.background = b.dataset.bg;
        const t = backgrounds.find(t => t.id === p.background);
        if (t) { p.theme = t.id; if (t.wallpaper) p.intensity = 100; setPalette(t.palette); }
        else { p.theme = ""; setPalette(engine.currentTheme()); }
        showPreview = true;
      }
      else if (b.dataset.decorMode) p.decorMode = b.dataset.decorMode;
      else if (b.dataset.card) p.card = b.dataset.card;
      else if (b.dataset.title) p.title = b.dataset.title;
      else if (b.dataset.font)
        setReading(b.dataset.font, engine.reading().size);
      else if (b.dataset.size)
        setReading(engine.reading().font, b.dataset.size);
      else if (b.dataset.palette) {
        setPalette(b.dataset.palette, true);
        p.theme = "";
      } else if (b.dataset.deco || b.dataset.position) {
        let o = p;
        if (target) {
          p.overrides[target] = p.overrides[target] || {
            deco: "none",
            position: p.position,
            scale: p.scale,
          };
          o = p.overrides[target];
          if (p.decorMode === "none") p.decorMode = "custom";
        }
        if (b.dataset.deco) {
          if (decorKind(o.deco) !== decorKind(b.dataset.deco)) o.scale = scaleLimits(b.dataset.deco)[2];
          o.deco = b.dataset.deco;
          showPreview = true;
        }
        if (b.dataset.deco && !target) p.decorMode = "accent";
        if (b.dataset.position) o.position = b.dataset.position;
      } else if (b.hasAttribute("data-inherit")) delete p.overrides[target];
      else if (b.hasAttribute("data-reset")) {
        draft.prefs = copy(base);
        setPalette("sunny", true);
        setReading("system", "standard");
      } else if (b.hasAttribute("data-load")) {
        const s = saved[+b.dataset.load];
        if (s) {
          draft.prefs = copy(s.prefs);
          setPalette(s.palette, true);
          setReading(s.reading.font, s.reading.size);
        }
      }
    });
  }
  function mount() {
    const card = document.getElementById("appearanceCardV29");
    if (card && !card.querySelector("[data-st-open]")) {
      const el = document.createElement("div");
      el.className = "st-entry";
      el.innerHTML =
        '<div><h3>外观主题</h3><p>主题预设、页面背景与字体设置</p></div><button type="button" class="st-primary" data-st-open>设置外观</button>';
      card.prepend(el);
      const old = document.createElement("details");
      old.className = "st-legacy";
      old.innerHTML = "<summary>基础配色与阅读设置</summary>";
      Array.from(card.children)
        .filter((x) => x !== el)
        .forEach((x) => old.appendChild(x));
      card.appendChild(old);
      el.querySelector("button").onclick = () => open();
    }
    if (edit && !pagePreview && !document.querySelector(".st-edit-bar")) {
      const b = document.createElement("div");
      b.className = "st-edit-bar";
      b.innerHTML =
        '<span>选择卡片设置挂件</span><button type="button">完成</button>';
      b.querySelector("button").onclick = () => {
        edit = false;
        b.remove();
        decorate();
      };
      document.body.appendChild(b);
    }
    if (card && !card.querySelector("[data-st-edit]")) {
      const b = document.createElement("button");
      b.className = "st-link st-edit-launch";
      b.dataset.stEdit = "";
      b.textContent = "单独设置卡片挂件";
      b.onclick = () => {
        edit = true;
        mount();
      };
      card.querySelector(".st-entry").appendChild(b);
    }
    decorate();
  }
  const oldBind = window.bindPage;
  if (typeof oldBind === "function")
    window.bindPage = function () {
      const result = oldBind.apply(this, arguments);
      mount();
      return result;
    };
  // Detail overlays and async cards are also decorated, without observing our own mutations.
  let queued = false;
  const observer = new MutationObserver((records) => {
    if (
      records.some((r) =>
        Array.from(r.addedNodes).some(
          (n) =>
            n.nodeType === 1 &&
            !n.matches(".st-ornament,.st-edit-card,.st-edit-bar") &&
            !n.closest("dialog,.st-ornament,.st-entry") &&
            (n.matches(".card,.shell,.ed-page") ||
              n.querySelector(".card,.account-grid")),
        ),
      ) &&
      !queued
    ) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        mount();
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-opt-v29]")) {
      prefs.theme = "";
      prefs.palette = engine.currentTheme();
      write(KEY, prefs);
      setVisual(prefs);
    }
    if (e.target.closest("[data-reading-font-v29],[data-reading-size-v29]")) {
      prefs.reading = engine.reading();
      write(KEY, prefs);
    }
    if (e.target.closest("[data-appearance-reset-v29]")) {
      prefs = copy(base);
      write(KEY, prefs);
      setVisual(prefs);
    }
  });
  window.ScoreAppearance = {
    open,
    normalize,
    themes: presets,
    decorations,
    backgrounds,
    get: () => copy(prefs),
  };
  setVisual(prefs);
  mount();
})();
