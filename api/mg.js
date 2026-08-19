const UPSTREAM = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-admin';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const headers = { Accept: query.includes('action=') ? 'application/json' : 'text/html' };
  if (req.headers['x-score-token']) headers['x-score-token'] = String(req.headers['x-score-token']);
  if (req.method === 'POST') headers['content-type'] = 'application/json';
  try {
    const upstream = await fetch(UPSTREAM + query, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    const isHtml = !query.includes('action=');
    res.status(upstream.status);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (isHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.send(body);
  } catch (error) {
    res.status(502).json({ error: error?.name === 'TimeoutError' ? 'mg_upstream_timeout' : 'mg_upstream_unavailable' });
  }
}
