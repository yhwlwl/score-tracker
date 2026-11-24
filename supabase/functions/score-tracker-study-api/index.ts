import { createClient } from 'npm:@supabase/supabase-js@2';
import { studyQuestion, studySettings } from './study-question.ts';
import { loadSnapshot, loadTrajectory } from './snapshot.ts';
import { studyEventResponse, type ProgressListener } from './study-events.ts';

const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'private, no-store',
};
const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
});

async function userFor(token: unknown) {
  if (typeof token !== 'string' || !token || token.length > 512) return null;
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const hash = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const { data, error } = await db.from('score_tracker_users')
    .select('id,session_expires_at').eq('session_token_hash', hash).maybeSingle();
  if (error) throw error;
  return data && new Date(data.session_expires_at).getTime() > Date.now() ? data.id : null;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return out({ error: '请求方式不正确' }, 405);
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return out({ error: '请求内容不正确' }, 400);
    const userId = await userFor(body.token);
    if (!userId) return out({ error: '登录已失效，请重新登录', code: 'UNAUTHORIZED' }, 401);
    if (body.action === 'study_status') return out((await studySettings(db)).public);
    if (body.action === 'study_question') {
      const run = (progress?: ProgressListener) =>
        studyQuestion(db, userId, body, () => loadSnapshot(db, userId), loadTrajectory(db, userId), progress);
      if (body.stream === true) {
        const runtime = (globalThis as typeof globalThis & {
          EdgeRuntime?: { waitUntil(task: Promise<void>): void };
        }).EdgeRuntime;
        return studyEventResponse(run, headers, task => runtime?.waitUntil(task));
      }
      const result = await run();
      return out(result.data, result.status);
    }
    return out({ error: '请求内容不正确' }, 400);
  } catch (error) {
    console.error('study_api_failed', error instanceof Error ? error.name : 'unknown');
    return out({ error: '学情问答暂时没加载出来' }, 503);
  }
});
