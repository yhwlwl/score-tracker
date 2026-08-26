// Cloudflare Pages Function 适配层：/mg 管理后台
// 业务逻辑与 Vercel 版共用同一文件 api/mg.js（导入语法由云端构建按 ESM 处理）
import handler from "../api/mg.js";

// Workers 运行时没有 Buffer；原 handler 用 Buffer.from(ArrayBuffer) 中转，这里给最小 polyfill
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = {
    from: (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v)),
  };
}

export async function onRequest(context) {
  const original = context.request;
  const headers = {};
  original.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  let body;
  if (original.method === "POST") {
    body = await original.json().catch(() => ({}));
  }

  let status = 200;
  const outHeaders = new Headers();
  let payload = null;
  const res = {
    status(code) { status = code; return this; },
    setHeader(k, v) { outHeaders.set(k, String(v)); return this; },
    json(obj) { if (payload === null) payload = JSON.stringify(obj); return this; },
    send(data) { if (payload === null) payload = data; return this; },
  };

  const req = { method: original.method, url: original.url, headers, body };
  await handler(req, res);
  if (payload === null) payload = "";

  const init = { status, headers: outHeaders };
  return payload instanceof Uint8Array || payload instanceof ArrayBuffer
    ? new Response(payload, init)
    : new Response(String(payload), init);
}
