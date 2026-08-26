// 构建 Cloudflare Pages 部署目录 deploy/
// 先运行 node design/build-bundles.js（确保 app-bundle.js 最新），再运行本脚本
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "deploy");
const FILES = [
  "index.html",
  "styles.css",
  "mobile-fix.css",
  "app-bundle.js",
  "study-planner-promo.webp",
  "robots.txt",
  "_headers",
  "_redirects",
];

const missing = FILES.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) {
  console.error("缺失文件，先运行 node design/build-bundles.js：", missing.join(", "));
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "functions"), { recursive: true });
fs.mkdirSync(path.join(OUT, "api"), { recursive: true });

for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.copyFileSync(path.join(ROOT, "functions/mg.js"), path.join(OUT, "functions/mg.js"));
fs.copyFileSync(path.join(ROOT, "api/mg.mjs"), path.join(OUT, "api/mg.mjs"));

console.log("deploy/ 已生成：" + FILES.length + " 个静态文件 + functions/mg.js + api/mg.mjs");
