const UPSTREAM_ROOT = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/';
export const API_ENDPOINTS = Object.freeze([
  'score-tracker-api',
  'score-tracker-data-api',
  'score-tracker-modules-api',
  'score-tracker-username-api',
  'score-tracker-notices',
  'score-tracker-recovery',
  'score-tracker-vision-preview',
]);

const NO_STORE = 'private, no-store, max-age=0';

const safeEdgeValue = (value, max) => {
  const text = String(value || '').trim();
  return text && text.length <= max && !/[\r\n]/.test(text) ? text : '';
};
const firstForwardedValue = (value) => String(value || '').split(',')[0].trim();

function getClientNetwork(request) {
  const cf = request.cf && typeof request.cf === 'object' ? request.cf : {};
  return {
    // CF-Connecting-IP is supplied by Cloudflare; the other values cover Vercel
    // and keep the existing recovery rate limit working through the proxy.
    ip: safeEdgeValue(
      request.headers.get('cf-connecting-ip')
      || firstForwardedValue(request.headers.get('x-forwarded-for'))
      || request.headers.get('x-real-ip'),
      80,
    ),
    country: safeEdgeValue(
      cf.country || request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country'),
      8,
    ),
    region: safeEdgeValue(
      cf.regionCode || cf.region || request.headers.get('x-vercel-ip-country-region'),
      80,
    ),
    city: safeEdgeValue(cf.city || request.headers.get('x-vercel-ip-city'), 160),
    timezone: safeEdgeValue(cf.timezone || request.headers.get('x-vercel-ip-timezone'), 120),
  };
}

export async function proxyApi(request, options = {}) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const requestId = request.headers.get('x-score-request-id');
  const id = requestId && /^[a-zA-Z0-9_-]{1,80}$/.test(requestId)
    ? requestId : 'st-proxy-' + crypto.randomUUID();
  const startedAt = Date.now();
  const baseHeaders = {
    'Cache-Control': NO_STORE,
    'CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Score-Request-Id': id,
  };
  function failure(status, code, message) {
    return new Response(JSON.stringify({ error: message, code, request_id: id }), {
      status, headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (!url.pathname.startsWith('/api/') || !API_ENDPOINTS.includes(endpoint)) {
    return failure(404, 'API_ROUTE_NOT_FOUND', '请求的服务不存在');
  }
  if (request.method !== 'POST') {
    const response = failure(405, 'API_METHOD_NOT_ALLOWED', '请求方式不受支持');
    response.headers.set('Allow', 'POST');
    return response;
  }
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return failure(415, 'API_CONTENT_TYPE_INVALID', '请使用 JSON 格式发送请求');
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (request.signal.aborted) abort();
  else request.signal.addEventListener('abort', abort, { once: true });
  const timeoutMs = options.timeoutMs ?? (endpoint === 'score-tracker-vision-preview' ? 58000 : 25000);
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const upstreamHeaders = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Score-Request-Id': id,
  });
  const clientNetwork = getClientNetwork(request);
  if (clientNetwork.ip) {
    // The Supabase edge may replace standard forwarding headers on a
    // cross-zone subrequest, so the application function reads this
    // explicit proxy header first and still receives standard headers for
    // endpoints that already understand them.
    upstreamHeaders.set('X-Score-Client-IP', clientNetwork.ip);
    upstreamHeaders.set('X-Forwarded-For', clientNetwork.ip);
    upstreamHeaders.set('X-Real-IP', clientNetwork.ip);
  }
  if (clientNetwork.country) {
    upstreamHeaders.set('X-Score-Client-Country', clientNetwork.country);
    upstreamHeaders.set('X-Vercel-IP-Country', clientNetwork.country);
  }
  if (clientNetwork.region) {
    upstreamHeaders.set('X-Score-Client-Region', clientNetwork.region);
    upstreamHeaders.set('X-Vercel-IP-Country-Region', clientNetwork.region);
  }
  if (clientNetwork.city) {
    upstreamHeaders.set('X-Score-Client-City', clientNetwork.city);
    upstreamHeaders.set('X-Vercel-IP-City', clientNetwork.city);
  }
  if (clientNetwork.timezone) {
    upstreamHeaders.set('X-Score-Client-Timezone', clientNetwork.timezone);
    upstreamHeaders.set('X-Vercel-IP-Timezone', clientNetwork.timezone);
  }

  try {
    // Buffer neither images nor credentials; forward the existing request body unchanged.
    const upstream = await (options.fetch || fetch)(UPSTREAM_ROOT + endpoint, {
      method: 'POST', headers: upstreamHeaders, body: request.body,
      signal: controller.signal, redirect: 'manual', duplex: 'half',
    });
    // A redirect must not expose the upstream URL or replay a credential-bearing POST.
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      return failure(502, 'API_UPSTREAM_REDIRECT', '登录服务暂时无法连接，请稍后重试');
    }
    // Read through completion so the timeout also covers a stalled response body.
    const body = await upstream.arrayBuffer();
    const headers = new Headers(baseHeaders);
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    headers.set('Server-Timing', 'upstream;dur=' + (Date.now() - startedAt));
    if (upstream.headers.has('retry-after')) headers.set('Retry-After', upstream.headers.get('retry-after'));
    if (!upstream.ok) {
      console.warn('[Score Tracker] API upstream error', JSON.stringify({
        request_id: id, endpoint, status: upstream.status, duration_ms: Date.now() - startedAt,
      }));
    }
    return new Response(upstream.status === 204 ? null : body, {
      status: upstream.status, statusText: upstream.statusText, headers,
    });
  } catch (error) {
    const code = timedOut ? 'API_UPSTREAM_TIMEOUT'
      : request.signal.aborted ? 'API_REQUEST_ABORTED' : 'API_UPSTREAM_UNAVAILABLE';
    console.warn('[Score Tracker] API proxy failed', JSON.stringify({
      request_id: id, endpoint, code, duration_ms: Date.now() - startedAt,
    }));
    return failure(timedOut ? 504 : 502, code, timedOut
      ? '服务响应超时，请稍后重试' : '暂时无法连接服务，请稍后重试');
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abort);
  }
}
