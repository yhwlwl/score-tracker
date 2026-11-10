// 公告图片上传：验证成绩轨迹管理员会话后，把图片写入 notice-media 公共存储桶。
// 不依赖 supabase-js，全部用 fetch，避免部署时的 import map 问题。
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BUCKET = 'notice-media';
const MAX_BYTES = 5 * 1024 * 1024;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-admin-token, x-score-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function adminSession(token: string) {
  if (!token) return null;
  const query = `${SUPABASE_URL}/rest/v1/score_tracker_users?select=id,is_admin,session_expires_at&session_token_hash=eq.${await sha256(token)}&limit=1`;
  const response = await fetch(query, { headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY } });
  if (!response.ok) return null;
  const rows = await response.json();
  const user = Array.isArray(rows) ? rows[0] : null;
  if (!user || !user.is_admin) return null;
  if (!user.session_expires_at || new Date(user.session_expires_at).getTime() < Date.now()) return null;
  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  try {
    const token = req.headers.get('x-admin-token') || req.headers.get('x-score-token') || '';
    const admin = await adminSession(token);
    if (!admin) return json(401, { error: 'unauthorized' });

    const body = await req.json().catch(() => null);
    const data = String((body && body.data) || '');
    const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) return json(400, { error: 'bad_image' });

    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_BYTES) return json(400, { error: 'too_large' });

    const ext = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
    const path = 'notice/' + new Date().toISOString().slice(0, 10) + '/' + crypto.randomUUID() + '.' + ext;

    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'content-type': match[1],
        'x-upsert': 'false',
      },
      body: bytes,
    });
    if (!upload.ok) {
      const detail = await upload.text().catch(() => '');
      console.error('storage upload failed', upload.status, detail);
      return json(502, { error: 'storage_failed' });
    }

    return json(200, {
      ok: true,
      url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
      path,
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: 'upload_failed' });
  }
});
