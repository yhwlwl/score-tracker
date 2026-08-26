// 自动生成 app-bundle.js，并同步 index.html 的 ?v= 版本号（内容变则 hash 变）。
// 用法：修改任何 app-vN.js / compat / telemetry 等源码后运行：node design/build-bundles.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const ORDER = require("./bundle-order.json");

const missing = ORDER.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) {
  console.error("缺失源文件，中止：", missing.join(", "));
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

const hash = crypto.createHash("md5").update(bundle).digest("hex").slice(0, 10);
fs.writeFileSync(path.join(ROOT, "app-bundle.js"), bundle);

const htmlPath = path.join(ROOT, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(/<script src="\.\/app-bundle\.js\?v=[0-9a-f]+"/, '<script src="./app-bundle.js?v=' + hash + '"');
fs.writeFileSync(htmlPath, html);

console.log("app-bundle.js 已生成 (" + Math.round(bundle.length / 1024) + " KB)，hash=" + hash);
console.log("index.html 的 ?v= 已同步");
