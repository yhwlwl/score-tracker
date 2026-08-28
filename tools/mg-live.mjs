import http from 'node:http';
import handler from '../api/mg.js';

const port = Number(process.env.MG_LIVE_PORT || 4180);

function readBody(req) {
  return new Promise((resolve) => {
    if (req.method !== 'POST') return resolve(undefined);
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve({}); }
    });
  });
}

http.createServer(async (incoming, nodeRes) => {
  const headers = {};
  for (const [key, value] of Object.entries(incoming.headers)) headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  const req = { method: incoming.method, url: incoming.url, headers, body: await readBody(incoming) };
  let status = 200;
  const outHeaders = {};
  let payload = '';
  const res = {
    status(code) { status = code; return this; },
    setHeader(key, value) { outHeaders[key] = String(value); return this; },
    json(value) { payload = JSON.stringify(value); return this; },
    send(value) { payload = value; return this; },
  };
  await handler(req, res);
  nodeRes.writeHead(status, outHeaders);
  nodeRes.end(payload);
}).listen(port, '127.0.0.1', () => {
  console.log(`Score Tracker /mg live data server: http://127.0.0.1:${port}/mg`);
  console.log('This local server calls the deployed Supabase functions and still requires an administrator login.');
});
