import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.101.0";

const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-score-token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const bytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const b64 = (a: Uint8Array) => btoa(String.fromCharCode(...a));
const random = () => b64(bytes(32)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
async function sha(v: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function passwordHash(p: string) { const salt = bytes(16), k = await crypto.subtle.importKey('raw', new TextEncoder().encode(p), 'PBKDF2', false, ['deriveBits']); return { hash: b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, k, 256))), salt: b64(salt) }; }
function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
const text = (v: unknown, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const uuid = (v: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
async function rpc(name: string, params: Record<string, unknown>) { const { data, error } = await db.rpc(name, params); if (error) throw error; return data; }
async function rate(scope: string, seconds: number, max: number) { if (!await rpc('score_tracker_recovery_rate', { p_scope: scope, p_seconds: seconds, p_max: max })) fail('操作较频繁，请稍后再试。', 429); }
function evidence(raw: Record<string, unknown>) {
  const e = { exam_name: text(raw.exam_name, 100), exam_date: text(raw.exam_date, 10), subject: text(raw.subject, 40), score: text(raw.score, 10), school: text(raw.school, 100), details: text(raw.details, 4000) };
  if (e.exam_date && (!/^\d{4}-\d{2}-\d{2}$/.test(e.exam_date) || !Number.isFinite(Date.parse(e.exam_date)))) fail('请填写有效的考试日期。');
  if (e.score) { const n = Number(e.score); if (!Number.isFinite(n) || n < 0 || n > 9999) fail('请填写有效的分数。'); e.score = String(n); if (!e.subject) fail('填写分数时，请同时填写科目或选择总分。'); }
  return e;
}
const safeColumns = 'id,ticket_no,mode,username_hint,evidence,status,history,created_at,updated_at,claim_until,copy_summary,new_user_id';
async function ticket(body: Record<string, unknown>) {
  const no = text(body.ticket_no, 30).toUpperCase(), key = text(body.key, 80);
  if (!/^ST-[A-F0-9]{12}$/.test(no) || !/^[A-Za-z0-9_-]{43}$/.test(key)) fail('工单号或查询密钥不正确。', 404);
  const kh = await sha(key), { data, error } = await db.from('score_tracker_recovery_tickets').select(safeColumns).eq('ticket_no', no).eq('key_hash', kh).maybeSingle();
  if (error) throw error; if (!data) fail('工单号或查询密钥不正确。', 404);
  return { data, kh };
}
async function publicTicket(row: Record<string, any>) {
  const { new_user_id, ...safe } = row;
  if (new_user_id) { const { data, error } = await db.from('score_tracker_users').select('username').eq('id', new_user_id).maybeSingle(); if (error) throw error; safe.new_username = data?.username || ''; }
  return safe;
}
const errors: Record<string, string> = { ticket_not_found: '工单不存在。', ticket_closed: '这张工单已结束处理。', ticket_changed: '用户刚补充了信息，请刷新后重新核对。', source_not_found: '无法使用这个原账号。', review_note_required: '请填写审核说明。', invalid_source_links: '原账号的数据关联异常，请先检查。', message_limit: '这张工单的消息已达到上限。', not_claimable: '新账号已领取或工单尚未通过审核。', claim_expired: '领取期限已过，请重新提交找回申请。', username_taken: '这个用户名已被使用，请换一个。', invalid_username: '用户名请使用 2～24 位中文、字母、数字、横线或下划线。', unauthorized: 'unauthorized' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return out({ ok: true });
  if (!['GET', 'POST'].includes(req.method)) return out({ error: 'method_not_allowed' }, 405);
  try {
    const q = new URL(req.url).searchParams;
    if (Number(req.headers.get('content-length') || 0) > 16384) fail('提交的内容过长。', 413);
    const raw = req.method === 'POST' ? await req.text() : '{}';
    if (raw.length > 16384) fail('提交的内容过长。', 413);
    let body: Record<string, any>; try { body = JSON.parse(raw); } catch { fail('请求格式不正确。'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('请求格式不正确。');
    const action = text(q.get('action') || body.action, 40);
    if (action.startsWith('recovery_admin_')) {
      const token = req.headers.get('x-score-token') || '', adminHash = await sha(token);
      const { data: admin, error } = await db.from('score_tracker_users').select('id').eq('session_token_hash', adminHash).eq('is_admin', true).gt('session_expires_at', new Date().toISOString()).maybeSingle();
      if (error) throw error; if (!token || !admin) fail('unauthorized', 401);
      if (action === 'recovery_admin_list') {
        const page = Math.max(1, Math.min(100000, Number(q.get('page')) || 1)), size = [30,50,100].includes(Number(q.get('page_size'))) ? Number(q.get('page_size')) : 30, status = text(q.get('status'), 20), search = text(q.get('search'), 100);
        let query = db.from('score_tracker_recovery_tickets').select('id,ticket_no,mode,username_hint,status,created_at,updated_at,review_note', { count: 'exact' });
        if (['pending', 'reviewing', 'needs_info', 'approved', 'rejected', 'claimed'].includes(status)) query = query.eq('status', status);
        // PostgREST filter syntax never receives unescaped user input.
        if (search) query = query.ilike(search.toUpperCase().startsWith('ST-') ? 'ticket_no' : 'username_hint', '%' + search.replace(/[%_\\]/g, '\\$&') + '%');
        const { data, count, error } = await query.order('updated_at', { ascending: false }).range((page - 1) * size, page * size - 1); if (error) throw error;
        return out({ rows: data, total_count: count, page, page_size: size });
      }
      const id = q.get('id') || body.id; if (!uuid(id)) fail('工单不存在。', 404);
      if (action === 'recovery_admin_detail') {
        const { data, error } = await db.from('score_tracker_recovery_tickets').select(safeColumns + ',source_user_id,reviewed_by,review_note').eq('id', id).maybeSingle(); if (error) throw error; if (!data) fail('工单不存在。', 404);
        const candidates = await rpc('score_tracker_recovery_candidates', { p_ticket: id, p_query: text(q.get('query'), 100) });
        return out({ ticket: await publicTicket(data), candidates });
      }
      if (action === 'recovery_admin_review' && req.method === 'POST') {
        const status = text(body.status, 20); if (!['reviewing', 'needs_info', 'rejected', 'approved'].includes(status)) fail('请选择有效的处理状态。');
        if (status === 'approved' && (!uuid(body.source_user_id) || body.verified !== true)) fail('请先选择原账号并确认已核验账号归属。');
        if (text(body.note, 4000).length < 2) fail('请填写审核说明。');
        if (!Number.isFinite(Date.parse(body.version))) fail('请刷新工单后再处理。');
        const placeholder = await passwordHash(random());
        const result = await rpc('score_tracker_recovery_review', { p_ticket: id, p_admin_hash: adminHash, p_status: status, p_source: status === 'approved' ? body.source_user_id : null, p_note: text(body.note, 4000), p_version: body.version, p_username: 'recover-' + random().slice(0, 16).toLowerCase(), p_password_hash: placeholder.hash, p_password_salt: placeholder.salt });
        return out(result);
      }
      fail('unknown_action', 404);
    }
    if (req.method !== 'POST') fail('method_not_allowed', 405);
    // Use the platform's forwarded client IP, hash it, and enforce shared DB limits.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const ipHash = await sha('score-recovery:' + ip);
    await rate('request:' + ipHash, 600, 120);
    if (action === 'submit') {
      const mode = body.mode; if (!['password', 'account'].includes(mode)) fail('请选择找回方式。');
      const hint = text(body.username, 100).toLowerCase(), e = evidence(body.evidence || {});
      if (mode === 'password' && !hint) fail('请填写记得的用户名。');
      const hasEvidence = Boolean(e.exam_name || e.exam_date || e.subject || e.score || e.school || e.details);
      if (!hasEvidence) fail('请至少填写一项能帮助核验的信息，考试名称、日期、分数、学校或补充说明都可以。');
      await rate('submit:' + ipHash, 86400, 3);
      const key = random(), no = 'ST-' + (await sha(random())).slice(0, 12).toUpperCase();
      const { data, error } = await db.from('score_tracker_recovery_tickets').insert({ ticket_no: no, key_hash: await sha(key), mode, username_hint: hint, evidence: e, history: [{ author: 'system', content: '已收到申请，等待管理员核验。', at: new Date().toISOString() }] }).select('ticket_no,status,created_at').single();
      if (error) throw error; return out({ ...data, key });
    }
    const { data, kh } = await ticket(body);
    if (action === 'lookup') return out({ ticket: await publicTicket(data) });
    if (action === 'supplement') {
      await rate('supplement:' + data.id, 3600, 10);
      const content = text(body.content, 4000); if (content.length < 2) fail('请填写需要补充的信息。');
      await rpc('score_tracker_recovery_supplement', { p_ticket: data.id, p_key_hash: kh, p_content: content });
      return out({ ok: true });
    }
    if (action === 'claim') {
      await rate('claim:' + data.id, 600, 5);
      const p = typeof body.password === 'string' ? body.password : '';
      if (p.length < 6 || p.length > 20 || /\s/.test(p)) fail('新密码需为 6～20 位，且不能包含空格。');
      const username = text(body.username, 24).toLowerCase();
      if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(username)) fail('invalid_username');
      const h = await passwordHash(p), token = random();
      const result = await rpc('score_tracker_recovery_claim', { p_ticket: data.id, p_key_hash: kh, p_hash: h.hash, p_salt: h.salt, p_token_hash: await sha(token), p_username: username });
      return out({ ...result, token });
    }
    fail('unknown_action', 404);
  } catch (e: any) {
    const code = Object.keys(errors).find(k => String(e.message || '').includes(k));
    const status = e.status || (code === 'unauthorized' ? 401 : code === 'ticket_changed' || code === 'ticket_closed' || code === 'not_claimable' ? 409 : code ? 400 : 500);
    // Never log account credentials, lookup keys, evidence or request bodies.
    if (status === 500) console.error('recovery_request_failed', e.code || e.name || 'unknown');
    return out({ error: errors[code || ''] || (e.status ? e.message : '暂时无法处理，请稍后再试。') }, status);
  }
});
