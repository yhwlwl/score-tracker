const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const origin = 'https://scores.test';
const privateBody = JSON.stringify({ action: 'login', username: 'fixture-user', password: 'fixture-password', token: 'fixture-token' });
const post = (endpoint = 'score-tracker-api', body = privateBody, extra = {}) => new Request(origin + '/api/' + endpoint, {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-score-request-id': 'st-fixture-1', cookie: 'private-cookie', authorization: 'private-header' }, body, ...extra,
});

async function run() {
  const { proxyApi, API_ENDPOINTS } = await import(pathToFileURL(path.join(root, 'server/same-origin-api.js')));
  const { onRequest } = await import(pathToFileURL(path.join(root, 'functions/api/[endpoint].js')));
  const { default: worker } = await import(pathToFileURL(path.join(root, 'worker.js')));
  const logs = [], warn = console.warn;
  console.warn = (...args) => logs.push(args.join(' '));
  try {
    for (const endpoint of API_ENDPOINTS) {
      let calls = 0;
      const response = await proxyApi(post(endpoint), { fetch: async (url, init) => {
        calls++;
        assert.equal(url, 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/' + endpoint);
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'manual');
        assert.equal(init.body instanceof ReadableStream, true);
        assert.equal(await new Response(init.body).text(), privateBody);
        assert.equal(init.headers.get('cookie'), null);
        assert.equal(init.headers.get('authorization'), null);
        assert.equal(init.headers.get('x-score-request-id'), 'st-fixture-1');
        return new Response('{"ok":true}', { headers: { 'cache-control': 'public,max-age=9999', 'set-cookie': 'upstream-private' } });
      }});
      assert.equal(calls, 1);
      assert.equal(await response.text(), '{"ok":true}');
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
      assert.equal(response.headers.get('set-cookie'), null);
      assert.equal(response.headers.get('x-score-request-id'), 'st-fixture-1');
    }
    console.log('PASS: every endpoint forwards existing JSON unchanged, without browser cookies or privileged headers; responses are never cached');

    const failIfCalled = () => { throw Error('must not call upstream'); };
    for (const endpoint of ['score-tracker-admin', 'unknown', 'score-tracker-api/extra', '%2Fscore-tracker-api']) {
      assert.equal((await proxyApi(post(endpoint), { fetch: failIfCalled })).status, 404);
    }
    assert.equal((await proxyApi(new Request(origin + '/api/score-tracker-api'), { fetch: failIfCalled })).status, 405);
    assert.equal((await proxyApi(post('score-tracker-api', privateBody, { headers: { 'content-type': 'text/plain' } }), { fetch: failIfCalled })).status, 415);
    let response = await proxyApi(post('score-tracker-api', privateBody, { headers: { 'content-type': 'application/json', 'x-score-request-id': 'invalid id' } }), {
      fetch: async () => new Response('{}'),
    });
    assert.match(response.headers.get('x-score-request-id'), /^st-proxy-/);
    console.log('PASS: unknown/admin/path-injection routes, invalid methods and content types are rejected; invalid request IDs are replaced');

    for (const status of [400, 401, 403, 422, 429, 500]) {
      response = await proxyApi(post(), { fetch: async () => new Response('{"error":"fixture","code":"original_code"}', { status, headers: { 'retry-after': '30' } }) });
      assert.equal(response.status, status);
      assert.equal((await response.json()).code, 'original_code');
      assert.equal(response.headers.get('retry-after'), '30');
    }
    response = await proxyApi(post(), { fetch: async () => new Response(null, { status: 204 }) });
    assert.equal(response.status, 204);
    response = await proxyApi(post(), { fetch: async () => new Response('', { status: 307, headers: { location: 'https://untrusted.test' } }) });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'API_UPSTREAM_REDIRECT');
    assert.equal(response.headers.get('location'), null);
    console.log('PASS: business/auth errors and retry-after survive unchanged; redirects never expose or replay credential-bearing requests');

    response = await proxyApi(post(), { fetch: async () => { throw Error('private-password-in-upstream-error'); } });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'API_UPSTREAM_UNAVAILABLE');
    const abortingFetch = async (url, init) => new Promise((resolve, reject) => {
      if (init.signal.aborted) reject(new DOMException('aborted', 'AbortError'));
      else init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    });
    response = await proxyApi(post(), { timeoutMs: 5, fetch: abortingFetch });
    assert.equal(response.status, 504);
    assert.equal((await response.json()).code, 'API_UPSTREAM_TIMEOUT');
    response = await proxyApi(post(), { timeoutMs: 5, fetch: async (url, init) => new Response(new ReadableStream({
      start(controller) { init.signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true }); },
    })) });
    assert.equal(response.status, 504, 'timeout covers response body reads');
    const controller = new AbortController();
    const pending = proxyApi(post('score-tracker-api', privateBody, { signal: controller.signal }), { fetch: abortingFetch });
    controller.abort();
    assert.equal((await (await pending).json()).code, 'API_REQUEST_ABORTED');
    assert(!logs.join('\n').includes('fixture-password'));
    assert(!logs.join('\n').includes('fixture-token'));
    assert(!logs.join('\n').includes('private-password-in-upstream-error'));
    console.log('PASS: connection failure, timeouts and client cancellation are distinguished; credentials and raw upstream errors never enter logs');

    const nativeFetch = global.fetch;
    try {
      global.fetch = async (url, init) => {
        assert(url.startsWith('https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/'));
        const body = await new Response(init.body).text();
        return new Response(JSON.stringify({ length: body.length }));
      };
      const large = JSON.stringify({ images: ['data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024)], token: 'fixture-token' });
      assert.equal((await (await onRequest({ request: post('score-tracker-vision-preview', large) })).json()).length, large.length);
      assert.equal((await worker.fetch(post(), {})).status, 200);
      assert.equal(await (await worker.fetch(new Request(origin + '/styles.css'), { ASSETS: { fetch: async () => new Response('asset') } })).text(), 'asset');
      assert.equal((await worker.fetch(new Request(origin + '/mg'), {})).status, 200);
    } finally { global.fetch = nativeFetch; }
    console.log('PASS: real Pages and Workers adapters, large image uploads, static assets and existing admin route');

    const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json')));
    const frontend = [...JSON.parse(fs.readFileSync(path.join(root, 'design/bundle-order.json'))), 'natural-entry.js', 'feature-vote.js', 'app-v37.js'];
    const used = new Set();
    for (const file of frontend) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert(!source.includes('supabase.co/functions/v1/'), file + ' must not connect directly to Supabase');
      for (const match of source.matchAll(/\/api\/(score-tracker-[a-z-]+)/g)) used.add(match[1]);
    }
    assert.deepEqual([...used].sort(), [...API_ENDPOINTS].sort());
    for (const endpoint of used) assert(config.rewrites.some(x => x.source === '/api/' + endpoint && x.destination.endsWith('/functions/v1/' + endpoint)));
    assert(config.rewrites.some(x => x.source === '/mg' && x.destination === '/api/mg'));
    const headerRule = config.headers.find(x => x.source === '/api/score-tracker-:path*');
    assert(headerRule.headers.some(x => x.key === 'x-vercel-enable-rewrite-caching' && x.value === '0'));
    console.log('PASS: every loaded frontend endpoint has a fixed Cloudflare/Vercel route and rewrite caching is disabled');

    const records = [], calls = [];
    let mode = 'http';
    const scope = { URL, Headers, Date, Promise, navigator: { onLine: true }, location: new URL(origin),
      document: { querySelector: () => ({ content: 'v7.0' }) }, localStorage: { getItem: () => '' }, console: { warn() {} },
      fetch: async (input, init) => {
        calls.push({ input, init });
        if (mode === 'network') throw new TypeError('Load failed');
        return new Response('{"error":"服务响应超时","code":"API_UPSTREAM_TIMEOUT"}', { status: 504, headers: { 'x-score-request-id': new Headers(init.headers).get('x-score-request-id') } });
      }, __scoreTrackerTrack: (type, record) => { records.push({ ...record }); return Promise.resolve(); },
    };
    scope.window = scope;
    scope.__releaseNotices = { currentVersion: () => 'v7.1' };
    scope.api = async function(action) { const r = await scope.fetch('/api/score-tracker-api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({action}) }); throw Error((await r.json()).error); };
    vm.createContext(scope);
    vm.runInContext(fs.readFileSync(path.join(root, 'app-v37.js'), 'utf8'), scope);
    await assert.rejects(scope.api('login'), e => e.code === 'API_UPSTREAM_TIMEOUT' && e.status === 504 && e.requestId === new Headers(calls.at(-1).init.headers).get('x-score-request-id'));
    assert.equal(records.at(-1).error_code, 'API_UPSTREAM_TIMEOUT');
    assert.equal(records.at(-1).app_version, 'v7.1');
    mode = 'network';
    await assert.rejects(scope.fetch(new URL('/api/score-tracker-data-api', origin).href, { method: 'POST', body: '{"action":"login_v2"}' }));
    assert.equal(records.at(-1).request_state, 'network_error');
    assert.equal(records.at(-1).request_id, new Headers(calls.at(-1).init.headers).get('x-score-request-id'));
    const count = records.length;
    await assert.rejects(scope.fetch('https://unrelated.test/api/score-tracker-api', { method: 'POST', body: '{"action":"login"}' }));
    assert.equal(records.length, count);
    console.log('PASS: diagnostics recognize relative and absolute same-origin URLs, correlate frontend/proxy IDs and preserve proxy error codes');

    // Run the real login/API functions through the real Pages adapter with a fixture backend.
    const stored = new Map(), backendCalls = [], nodes = {
      '#loginBtn': { disabled: false, textContent: '登录' },
      '#loginUser': { value: 'fixture-user' }, '#loginPass': { value: 'fixture-password' },
    };
    const storage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, String(value)), removeItem: key => stored.delete(key) };
    const app = { URL, Headers, Date, Promise, console: { warn() {} }, location: new URL(origin), navigator: { onLine: true },
      localStorage: storage, document: { querySelector: key => nodes[key] || null, createElement: () => ({}), head: { appendChild() {} } },
      __scoreTrackerTrack: () => Promise.resolve(),
    };
    app.window = app;
    app.fetch = async (input, init) => {
      const response = await onRequest({ request: new Request(new URL(String(input), origin), init) });
      return response;
    };
    vm.createContext(app);
    const appSource = fs.readFileSync(path.join(root, 'app-v3.js'), 'utf8').replace(/\ninit\(\);\s*$/, '\n');
    vm.runInContext(appSource, app);
    vm.runInContext('loadExams = async function(){ state.exams = (await api("list_exams")).exams || []; }; render = function(){ window.rendered = true; }; toast = function(message){ window.lastToast = message; };', app);
    vm.runInContext(fs.readFileSync(path.join(root, 'app-v37.js'), 'utf8'), app);
    const originalFetch = global.fetch;
    let customPassword = false, upstreamOffline = false;
    try {
      global.fetch = async (url, init) => {
        if (upstreamOffline) throw Error('fixture network failure');
        const body = await new Response(init.body).json();
        backendCalls.push({ url, body });
        if (body.action === 'login' && customPassword) return new Response('{"error":"用户名或密码不正确"}', { status: 401 });
        if (body.action === 'login' || body.action === 'login_v2') return new Response('{"token":"fixture-session","user":{"id":"fixture-user","username":"fixture-user"}}');
        if (body.action === 'list_exams') return new Response('{"exams":[{"id":"fixture-exam","name":"月考"}]}');
        if (body.action === 'save_exam') return new Response('{"ok":true,"id":"fixture-exam"}');
        throw Error('unexpected action ' + body.action);
      };
      await app.login();
      assert.equal(storage.getItem('st_token'), 'fixture-session');
      assert(app.rendered);
      assert.equal(vm.runInContext('state.exams[0].name', app), '月考');
      assert.equal(backendCalls.filter(x => x.body.action === 'login').length, 1);
      assert.equal(backendCalls.filter(x => x.body.action === 'login_v2').length, 0);
      customPassword = true;
      await app.login();
      assert.equal(backendCalls.filter(x => x.body.action === 'login_v2').length, 1);
      const saved = await app.api('save_exam', { exam: { id: 'fixture-exam', name: '月考' } });
      assert.equal(saved.id, 'fixture-exam');
      assert.equal(backendCalls.filter(x => x.body.action === 'save_exam').length, 1, 'writes are never automatically replayed');
      assert.equal(backendCalls.at(-1).body.token, 'fixture-session');
      upstreamOffline = true;
      await assert.rejects(app.api('list_exams'), e => e.status === 502 && e.code === 'API_UPSTREAM_UNAVAILABLE');
      assert.equal(storage.getItem('st_token'), 'fixture-session', 'network errors do not log users out');
    } finally { global.fetch = originalFetch; }
    console.log('PASS: actual frontend login, custom-password fallback, session persistence, exam reads/saves and network-error handling through the Pages proxy');
  } finally { console.warn = warn; }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
