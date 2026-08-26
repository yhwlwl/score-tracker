// Cloudflare Workers 静态资产模式的入口（wrangler.jsonc assets.directory="./" 配套）
// /mg* 走管理后台转发(复用 functions/mg.js 的适配层);其余路径由静态资产服务
// 部署:在仓库根运行 wrangler deploy
import { onRequest } from "./functions/mg.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/mg" || url.pathname.startsWith("/mg/")) {
      return onRequest({ request });
    }
    return env.ASSETS.fetch(request);
  },
};
