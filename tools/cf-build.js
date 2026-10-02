// 构建 Cloudflare Pages 部署目录 deploy/
// 先运行 node design/build-bundles.js
// api/mg.js 为 Vercel 与 Cloudflare 共用;勿在 api/ 下新增同名异后缀文件(如 mg.mjs)——Vercel 函数路由会报路径冲突（确保 app-bundle.js 最新），再运行本脚本
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "deploy");
const FILES = [
  "index.html",
  "styles.css",
  "mobile-fix.css",
  "pwa-install.js",
  "pwa-install.css",
  "manifest.webmanifest",
  "sw.js",
  "pwa-icon-192.png",
  "pwa-icon-512.png",
  "app-bundle.js",
  "vision-image-prep.js",
  "natural-entry.js",
  "feature-vote.js",
  "app-v36.js",
  "app-v37.js",
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
fs.copyFileSync(path.join(ROOT, "api/mg.js"), path.join(OUT, "api/mg.js"));
fs.copyFileSync(path.join(ROOT, "api/mg-ui.js"), path.join(OUT, "api/mg-ui.js"));
fs.mkdirSync(path.join(OUT, "functions/api"), { recursive: true });
fs.mkdirSync(path.join(OUT, "server"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "functions/api/[endpoint].js"), path.join(OUT, "functions/api/[endpoint].js"));
fs.copyFileSync(path.join(ROOT, "server/same-origin-api.js"), path.join(OUT, "server/same-origin-api.js"));
fs.writeFileSync(path.join(OUT, "_routes.json"), JSON.stringify({
  version: 1, include: ["/api/*", "/mg", "/mg/*"], exclude: [],
}, null, 2) + "\n");

console.log("deploy/ 已生成：" + FILES.length + " 个静态文件 + /mg 和 /api 同域函数");
