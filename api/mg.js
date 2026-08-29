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
  const c = metrics.counts || {};
  const p = metrics.period_counts || {};
  const value = (periodValue, countValue, legacyValue) => n(periodValue ?? countValue ?? legacyValue);
  const logs = value(undefined, c.logs, metrics.visit_rows_total || metrics.events_total);
  const visitors = value(p.visitors, c.visitors, metrics.visitors_24h);
  const sessions = value(p.sessions, c.sessions, metrics.sessions_24h);
  const users = value(undefined, c.users, metrics.users_total);
  const online = value(p.online, c.online, metrics.online_5m);
  const exams = value(undefined, c.exams, metrics.exams_total);
  const scores = value(undefined, c.scores, metrics.scores_total);
  const feedback = value(undefined, c.feedback, metrics.feedback_total);
  return {
    generated_at: metrics.generated_at || new Date().toISOString(),
    counts: {
      logs,
      visitors,
      sessions,
      users,
      online,
      exams,
      scores,
      feedback,
      active_users: value(p.active_users, c.active_users, 0),
      actors: value(p.actors, c.actors, 0),
    },
    period_counts: p,
    trend: metrics.trend || metrics.events_by_day || metrics.timeseries || [],
    activation_funnel: metrics.activation_funnel || [],
    time_to_activate: metrics.time_to_activate || [],
    retention: metrics.retention || { cohorts: [] },
    features: metrics.features || [],
    business: metrics.business || {},
    quality: metrics.quality || {},
    audience: { ...(metrics.audience || {}), ...(metrics.period_activity || {}) },
    period_activity: metrics.period_activity || {},
    active_days_distribution: metrics.active_days_distribution || [],
    source_quality: metrics.source_quality || [],
    browsers: metrics.browsers || [],
    pwa: metrics.pwa || [],
    screens: metrics.screens || [],
    feedback_aging: metrics.feedback_aging || [],
    feedback_status: metrics.feedback_status || [],
    depth: metrics.depth || metrics.depth_7d || [],
    events: metrics.events || metrics.events_7d || [],
    events_by_day: metrics.events_by_day || metrics.timeseries || metrics.trend || [],
    pages: metrics.pages || metrics.pages_7d || metrics.pages_all || [],
    sources: metrics.sources || metrics.sources_7d || metrics.sources_all || [],
    cities: metrics.cities || metrics.cities_7d || metrics.cities_all || [],
    devices: metrics.devices || metrics.devices_7d || metrics.devices_all || [],
    versions: metrics.versions || metrics.versions_7d || metrics.versions_all || [],
    feedback_types: metrics.feedback_types || metrics.feedback_types_all || [],
    analytics_window_days: Number(metrics.analytics_window_days || 7),
    exact_metrics: metrics,
    inventory: {
      score_tracker_users: { rows: users },
      score_tracker_exams: { rows: exams },
      score_tracker_scores: { rows: scores },
      score_tracker_visit_logs: { rows: logs },
      score_tracker_feedback_submissions: { rows: feedback },
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
      const metricUrl = new URL(METRICS_UPSTREAM);
      const days = Number(new URL(`https://local.invalid${req.url}`).searchParams.get('days') || 7);
      metricUrl.searchParams.set('days', String(Math.max(1, Math.min(90, Number.isFinite(days) ? Math.trunc(days) : 7))));
      const upstream = await fetch(metricUrl, {
        method: 'GET',
        headers: { 'x-score-token': String(req.headers['x-score-token'] || '') },
        signal: AbortSignal.timeout(60000),
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
