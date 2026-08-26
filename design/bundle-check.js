// 打包守卫：检查 app-bundle.js 与 index.html 的 ?v= 是否与当前源码一致。
// 用法：改完源码后运行 node design/bundle-check.js（不一致会以退出码 1 报错提示）
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const ORDER = require("./bundle-order.json");

const missing = ORDER.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) {
  console.error("缺失源文件：", missing.join(", "));
  process.exit(1);
}

const parts = ORDER.map((f) => {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  return "/* ===== " + f + " ===== */\n" + src;
});
const bundle =
  "/*! app-bundle.js · 自动生成,勿手改 —— 改源码后运行: node design/build-bundles.js\n" +
  "   来源顺序: " + ORDER.join(", ") + " */\n" +
  parts.join("\n");
const expectHash = crypto.createHash("md5").update(bundle).digest("hex").slice(0, 10);

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const m = html.match(/app-bundle\.js\?v=([0-9a-f]+)/);
let ok = true;
if (!m) { console.error("❌ index.html 里找不到 app-bundle.js?v= 引用"); ok = false; }
else if (m[1] !== expectHash) { console.error("❌ index.html ?v=" + m[1] + " 与源码指纹 " + expectHash + " 不一致 —— 先运行 node design/build-bundles.js"); ok = false; }
try {
  if (fs.readFileSync(path.join(ROOT, "app-bundle.js"), "utf8") !== bundle) {
    console.error("❌ app-bundle.js 内容与当前源码不一致 —— 先运行 node design/build-bundles.js"); ok = false;
  }
} catch (e) { console.error("❌ 读不到 app-bundle.js"); ok = false; }

if (ok) { console.log("✅ bundle 与源码一致（v=" + expectHash + "），可以提交"); process.exit(0); }
process.exit(1);
