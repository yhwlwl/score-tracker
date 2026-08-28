import { MG_HTML } from './mg-ui.js';

const ADMIN_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin';
const METRICS_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin-metrics';
const REPLY_UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin-reply';

function requestHeaders(req) {
  const headers = { Accept: 'application/json' };
  if (req.headers['x-score-token']) headers['x-score-token'] = String(req.headers['x-score-token']);
  if (req.method === 'POST') headers['content-type'] = 'application/json';
  return headers;
}

function secureHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  return res;
}

function overviewFromMetrics(metrics) {
  const n = (value) => Number(value || 0);
  return {
    generated_at: new Date().toISOString(),
    counts: {
      logs: n(metrics.visit_rows_total || metrics.events_total),
      visitors: n(metrics.visitors_24h),
      sessions: n(metrics.sessions_24h),
      users: n(metrics.users_total),
      online: n(metrics.online_5m),
      exams: n(metrics.exams_total),
      scores: n(metrics.scores_total),
      feedback: n(metrics.feedback_total),
    },
    depth: metrics.depth_7d || [],
    events: metrics.events_7d || [],
    events_by_day: metrics.events_by_day || metrics.timeseries || [],
    pages: metrics.pages_7d || metrics.pages_all || [],
    sources: metrics.sources_7d || metrics.sources_all || [],
    cities: metrics.cities_7d || metrics.cities_all || [],
    devices: metrics.devices_7d || metrics.devices_all || [],
    versions: metrics.versions_7d || metrics.versions_all || [],
    feedback_types: metrics.feedback_types_all || metrics.feedback_types || [],
    exact_metrics: metrics,
    inventory: {
      score_tracker_users: { rows: n(metrics.users_total) },
      score_tracker_exams: { rows: n(metrics.exams_total) },
      score_tracker_scores: { rows: n(metrics.scores_total) },
      score_tracker_visit_logs: { rows: n(metrics.visit_rows_total || metrics.events_total) },
      score_tracker_feedback_submissions: { rows: n(metrics.feedback_total) },
    },
  };
}

function sendHtml(res) {
  secureHeaders(res).status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  return res.send(MG_HTML);
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });

  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const isHtml = !query.includes('action=');
  if (isHtml) return sendHtml(res);

  const action = new URL(`https://local.invalid${req.url}`).searchParams.get('action') || '';
  const headers = requestHeaders(req);

  try {
    if (action === 'overview' && req.method === 'GET') {
      const upstream = await fetch(METRICS_UPSTREAM, {
        method: 'GET',
        headers: { 'x-score-token': String(req.headers['x-score-token'] || '') },
        signal: AbortSignal.timeout(25000),
      });
      const data = await upstream.json().catch(() => ({ error: 'metrics_unavailable' }));
      secureHeaders(res).status(upstream.status).setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify(upstream.ok ? overviewFromMetrics(data) : data));
    }

    const target = action === 'feedback_reply' && req.method === 'POST' ? REPLY_UPSTREAM : ADMIN_UPSTREAM + query;
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    secureHeaders(res).status(upstream.status).setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    return secureHeaders(res).status(502).json({
      error: error?.name === 'TimeoutError' ? 'mg_upstream_timeout' : 'mg_upstream_unavailable',
    });
  }
}
