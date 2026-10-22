import { UUID, validateStart, text, number } from './model.ts';
import { reviewSettings, scanRegions } from './options.ts';
const MATERIALS = 'score_tracker_paper_materials', SCAN_BUCKET = 'score-tracker-paper-scans';
export class WorkspaceError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
async function materialQuery(op: PromiseLike<any>) { const r = await op; if (r.error) throw new WorkspaceError('资料保存未完成，请重试', 503); return r.data; }
export async function materialFor(db: any, user: string, id: string) {
  if (!UUID.test(id || '')) throw new WorkspaceError('分析编号无效');
  return materialQuery(db.from(MATERIALS).select('*').eq('request_id', id).eq('user_id', user).maybeSingle());
}
export async function storedPages(db: any, user: string, id: string) {
  const m = await materialFor(db, user, id);
  if (!m?.pages?.length) throw new WorkspaceError('请先添加试卷图片');
  return Promise.all(m.pages.map(async (p: any) => {
    const { data, error } = await db.storage.from(SCAN_BUCKET).download(p.path);
    if (error || !data) throw new WorkspaceError('扫描件读取未完成，请重试', 503);
    const bytes = new Uint8Array(await data.arrayBuffer()); let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return { role: p.role, page: p.page, url: `data:${p.mime};base64,${btoa(binary)}` };
  }));
}
export async function deleteMaterials(db: any, user: string, id: string) {
  const m = await materialFor(db, user, id); if (!m) return;
  if (m.pages.length) { const r = await db.storage.from(SCAN_BUCKET).remove(m.pages.map((p: any) => p.path)); if (r.error) throw new WorkspaceError('扫描件删除未完成，请重试', 503); }
  await materialQuery(db.from(MATERIALS).delete().eq('request_id', id).eq('user_id', user));
}
export async function workspaceAction(db: any, user: string, body: any, ownedExam: (user: string, id: string) => Promise<any>) {
  const action = body.action, reviews = 'score_tracker_paper_reviews';
  if (action === 'list_all') {
    const offset = Math.max(0, Math.min(10000, Number.isInteger(body.offset) ? body.offset : 0));
    let q = db.from(reviews).select('request_id,draft_id,exam_id,subject,title,status,created_at,progress,options').eq('user_id', user);
    if (body.subject) q = q.eq('subject', text(body.subject, 40));
    if (body.exam_id) { await ownedExam(user, body.exam_id); q = q.eq('exam_id', body.exam_id); }
    if (['running','paused','succeeded','failed'].includes(body.status)) q = q.eq('status', body.status);
    const rows = await materialQuery(q.order('created_at', { ascending: false }).range(offset, offset + 49));
    const drafts = offset === 0 ? await materialQuery(db.from(MATERIALS).select('request_id,draft_id,exam_id,subject,title,options,created_at,submitted').eq('user_id', user).eq('submitted', false).order('created_at', { ascending: false }).limit(20)) : [];
    return { reviews: rows, drafts, has_more: rows.length === 50 };
  }
  if (action === 'preferences') {
    if (body.settings) await materialQuery(db.from('score_tracker_paper_preferences').upsert({ user_id: user, settings: reviewSettings(body.settings) }));
    const r = await materialQuery(db.from('score_tracker_paper_preferences').select('settings').eq('user_id', user).maybeSingle());
    return { settings: reviewSettings(r?.settings) };
  }
  if (!['save_materials','upload_page','sources','save_regions','link','pause','confirm_input','delete_draft'].includes(action)) return undefined;
  if (!UUID.test(body.request_id || '')) throw new WorkspaceError('分析编号无效');
  const row = await materialQuery(db.from(reviews).select('*').eq('request_id', body.request_id).eq('user_id', user).maybeSingle());
  const m = await materialFor(db, user, body.request_id);
  if (action === 'save_materials') {
    if (row?.status === 'running') throw new WorkspaceError('分析进行中，完成后可补充扫描件', 409);
    if (body.consent !== true) throw new WorkspaceError('请确认保存扫描件并发送给 AI 识别');
    const subject = text(body.subject, 40); if (!subject) throw new WorkspaceError('请选择科目');
    if (body.exam_id) await ownedExam(user, body.exam_id);
    if (!UUID.test(body.draft_id || '')) throw new WorkspaceError('草稿编号无效');
    if (!m) {
      if (!row && await materialQuery(db.from(reviews).select('request_id').eq('request_id', body.request_id).maybeSingle())) throw new WorkspaceError('分析编号已使用，请重新新建', 409);
      const drafts = await materialQuery(db.from(MATERIALS).select('request_id').eq('user_id', user).eq('submitted', false).limit(20));
      if (drafts.length >= 20) throw new WorkspaceError('先完成或删除已有草稿，再新建分析');
      // INSERT only: a colliding ID must never replace another account's material.
      await materialQuery(db.from(MATERIALS).insert({ request_id: body.request_id, user_id: user, draft_id: body.draft_id, exam_id: row?.exam_id || body.exam_id || null, subject: row?.subject || subject,
        title: text(body.title, 100), options: reviewSettings(body.options), pages: [], submitted: !!row }));
    } else if (!row) {
      const count = body.page_count;
      const pages = Number.isInteger(count) && count >= 1 && count <= 8 ? m.pages.slice(0, count) : m.pages;
      const changed = await materialQuery(db.from(MATERIALS).update({ title: text(body.title, 100), subject, exam_id: body.exam_id || null, options: reviewSettings(body.options), pages, revision: m.revision + 1 }).eq('request_id', body.request_id).eq('user_id', user).eq('revision', m.revision).select('request_id').maybeSingle());
      if (!changed) throw new WorkspaceError('资料已在另一处更新，请刷新后重试', 409);
      const removed = m.pages.slice(pages.length);
      if (removed.length) await db.storage.from(SCAN_BUCKET).remove(removed.map((p: any) => p.path));
    }
    return { ok: true };
  }
  if (!row && !m) throw new WorkspaceError('记录不存在或无权访问', 404);
  if (action === 'upload_page') {
    if (!m || row?.status === 'running') throw new WorkspaceError('请先保存资料信息，或等待分析完成', 409);
    const n = body.page; if (!Number.isInteger(n) || n < 1 || n > 8 || n > m.pages.length + 1) throw new WorkspaceError('请按页序上传，最多8页');
    // Apply the same byte/signature checks used by analysis without allowing URLs.
    let p: any; try { p = validateStart({ request_id: body.request_id, draft_id: m.draft_id, subject: m.subject, consent: true, pages: [{ role: 'paper', url: body.url }] }).pages[0]; } catch (e) { throw new WorkspaceError((e as Error).message); }
    if (!['paper','work','reference'].includes(body.role)) throw new WorkspaceError('图片类别无效');
    if (row && m.pages[n - 1]) throw new WorkspaceError('已分析的原图保留原样，请追加扫描页', 409);
    const mime = p.url.slice(5, p.url.indexOf(';')), binary = atob(p.url.split(',')[1]), bytes = Uint8Array.from(binary, (c: string) => c.charCodeAt(0));
    const path = `${user}/${body.request_id}/${n}-${crypto.randomUUID()}`;
    const pages = [...m.pages]; const previous = pages[n - 1];
    pages[n - 1] = { page: n, role: body.role, path, mime, bytes: bytes.length };
    if (pages.reduce((sum: number, p: any) => sum + p.bytes, 0) > 8800000) throw new WorkspaceError('本份资料较大，请压缩图片或减少页数');
    const r = await db.storage.from(SCAN_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
    if (r.error) throw new WorkspaceError('图片上传未完成，请重试', 503);
    try {
      const saved = await materialQuery(db.from(MATERIALS).update({ pages, revision: m.revision + 1 }).eq('request_id', body.request_id).eq('user_id', user).eq('revision', m.revision).select('request_id').maybeSingle());
      if (!saved) throw new WorkspaceError('资料已在另一处更新，请刷新后重试', 409);
    } catch (e) { await db.storage.from(SCAN_BUCKET).remove([path]); throw e; }
    if (previous) await db.storage.from(SCAN_BUCKET).remove([previous.path]);
    return { ok: true, page: n };
  }
  if (action === 'sources') {
    let pages: any[] = [];
    if (m?.pages.length) {
      const { data, error } = await db.storage.from(SCAN_BUCKET).createSignedUrls(m.pages.map((p: any) => p.path), 900);
      if (error) throw new WorkspaceError('扫描件读取未完成，请重试', 503);
      pages = m.pages.map((p: any, i: number) => ({ page: p.page, role: p.role, url: data[i]?.signedUrl }));
    }
    return { pages, regions: m?.regions || {}, material: m ? { request_id: m.request_id, draft_id: m.draft_id, subject: m.subject, exam_id: m.exam_id, title: m.title, options: m.options } : null };
  }
  if (action === 'save_regions') {
    if (!m) throw new WorkspaceError('请先添加扫描件');
    const label = text(body.label, 40);
    const questions = row?.result?.questions || row?.analysis_state?.evidence?.questions || [];
    if (!questions.some((q: any) => q.label === label)) throw new WorkspaceError('题号不存在');
    const regions = scanRegions(body.regions, m.pages.length);
    if (!Array.isArray(body.regions) || regions.length !== body.regions.length) throw new WorkspaceError('请在图片范围内框选');
    const updated = await materialQuery(db.from(MATERIALS).update({ regions: { ...m.regions, [label]: regions }, revision: m.revision + 1 }).eq('request_id', body.request_id).eq('user_id', user).eq('revision', m.revision).select('request_id').maybeSingle());
    if (!updated) throw new WorkspaceError('扫描区域已更新，请刷新后重试', 409);
    return { ok: true };
  }
  if (action === 'link') {
    if (!row) throw new WorkspaceError('请先开始分析后关联');
    if (body.exam_id) {
      await ownedExam(user, body.exam_id);
      const s = await materialQuery(db.from('score_tracker_scores').select('id').eq('user_id', user).eq('exam_id', body.exam_id).eq('subject', row.subject).maybeSingle());
      if (!s) throw new WorkspaceError('这次考试没有该科目，请先在考试中添加');
    }
    await materialQuery(db.from(reviews).update({ exam_id: body.exam_id || null, title: text(body.title ?? row.title, 100) }).eq('request_id', row.request_id).eq('user_id', user));
    if (m) await materialQuery(db.from(MATERIALS).update({ exam_id: body.exam_id || null }).eq('request_id', row.request_id).eq('user_id', user));
    return { ok: true };
  }
  if (action === 'pause') {
    if (!row || row.status !== 'running') throw new WorkspaceError('任务已经停止，请刷新查看', 409);
    await materialQuery(db.from(reviews).update({ pause_requested: true }).eq('request_id', row.request_id).eq('user_id', user).eq('status', 'running'));
    return { ok: true };
  }
  if (action === 'confirm_input') {
    if (!row || row.status !== 'paused' || !row.analysis_state?.evidence) throw new WorkspaceError('请在资料核对阶段保存', 409);
    const state = structuredClone(row.analysis_state), qs = state.evidence.questions;
    if (!Array.isArray(body.questions) || body.questions.length !== qs.length) throw new WorkspaceError('请保留所有题目');
    for (const q of qs) {
      const v = body.questions.find((v: any) => v.label === q.label); if (!v || !text(v.stem, 4500)) throw new WorkspaceError('题干不能为空');
      const score = number(v.teacher_score), max = number(v.max_score);
      if (score !== null && max !== null && score > max) throw new WorkspaceError('得分不能高于满分');
      if (q.answer !== text(v.answer, 4000)) { q.subparts = []; q.answer_verification = 'user_corrected'; }
      q.stem = text(v.stem, 4500); q.answer = text(v.answer, 4000); q.teacher_score = score; q.max_score = max; q.status = q.answer ? 'answered' : 'blank';
      q.score_verification = 'user_corrected'; q.evidence_verified = true;
    }
    state.input_confirmed = true; state.diagnoses = []; state.phase = 'diagnose'; state.verification_done = true;
    await materialQuery(db.from(reviews).update({ analysis_state: state }).eq('request_id', row.request_id).eq('user_id', user).eq('status', 'paused').eq('analysis_state->>claim', row.analysis_state.claim));
    return { ok: true };
  }
  if (action === 'delete_draft') {
    if (row) throw new WorkspaceError('请从报告页删除此记录');
    await deleteMaterials(db, user, body.request_id); return { ok: true };
  }
}
