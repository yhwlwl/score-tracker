import '../_shared/question-types.js';
import { UUID, text } from './model.ts';
import { reviewSettings } from './options.ts';
import { revisionInput, revisionState } from './pipeline.ts';
import { WorkspaceError } from './workspace.ts';

// Records are the source ledger. Analyses receive a snapshot, never another OCR run.
export function analysisFromRecord(row: any, body: any) {
  if (row.status !== 'succeeded' || !row.result?.questions?.length) throw new WorkspaceError('请先完成试题录入', 409);
  if (body.source_revision !== row.revision) throw new WorkspaceError('录入内容已更新，请重新打开后分析', 409);
  if (!UUID.test(body.request_id || '') || body.request_id === row.request_id || !UUID.test(body.draft_id || '')) throw new WorkspaceError('分析编号无效');
  if (body.consent !== true) throw new WorkspaceError('请确认使用已保存的题目与作答生成分析');
  const options: any = reviewSettings({ ...body.options, config_version: 2, purpose: 'analysis', review_before_analysis: false });
  const evidence = revisionState(row.result, row.corrections || []).evidence;
  if (options.analysis_scope === 'selected' && (!options.selected_questions.length || options.selected_questions.some((label: string) => !evidence.questions.some((q: any) => q.label === label)))) throw new WorkspaceError('请选择至少一道已有题目');
  const input: any = { ...revisionInput(row), request_id: body.request_id, draft_id: body.draft_id, options,
    source_record: { request_id: row.request_id, revision: row.revision }, update_count: 0, score_refresh_count: 0, analysis_revision: 0 };
  const state: any = { ...revisionState(row.result, row.corrections || []), flow: 'record_analysis', diagnoses: [],
    has_work: input.work_on_paper, input_confirmed: true, text_recovery: true, score_read_complete: true, source_record: input.source_record,
    source_input: { work_on_paper: input.work_on_paper, pages: input.pages }, options, original_exam_id: row.exam_id };
  return { input, state };
}

export function recordTypeRows(row: any) {
  const groups = new Map<string, any[]>();
  let untyped = 0, unverified = 0;
  for (const q of row.result.questions) {
    const c = (row.corrections || []).find((c: any) => c.id === q.id);
    const name = text(c?.question_type ?? q.question_type, 40);
    if (!name) { untyped++; continue; }
    if (!c?.verified) unverified++;
    const values = groups.get(name) || [];
    values.push({ score: c?.verified ? c.teacher_score : null, max: c?.verified ? c.max_score : null,
      difficulty: c?.question_difficulty ?? q.question_difficulty ?? '' });
    groups.set(name, values);
  }
  const rows = [...groups].map(([name, qs]) => {
    const total = (key: string) => qs.every(q => typeof q[key] === 'number') ? Math.round(qs.reduce((n, q) => n + q[key], 0) * 100) / 100 : null;
    const difficulty = qs[0].difficulty;
    return { name, score: total('score'), max: total('max'), ...(difficulty && qs.every(q => q.difficulty === difficulty) ? { difficulty } : {}) };
  });
  const model = (globalThis as any).ScoreQuestionTypeModel;
  try { return { rows: model.clean(rows, row.subject), untyped, unverified, questions: row.result.questions.length }; }
  catch (e) { throw new WorkspaceError((e as Error).message); }
}

export async function recordTypesAction(db: any, user: string, body: any, row: any) {
  if (!row || row.status !== 'succeeded' || !row.result?.questions?.length) throw new WorkspaceError('请先完成试题录入', 409);
  if (body.revision !== row.revision) throw new WorkspaceError('题目已更新，请重新核对预览', 409);
  if (!row.exam_id) throw new WorkspaceError('请先关联一场包含本科目的考试');
  const read = async (op: PromiseLike<any>) => { const r = await op; if (r.error) throw new WorkspaceError('题型数据读取或保存失败，请重试', 503); return r.data; };
  const exam = await read(db.from('score_tracker_exams').select('id,question_type_scores,updated_at').eq('id', row.exam_id).eq('user_id', user).maybeSingle());
  const score = await read(db.from('score_tracker_scores').select('raw_score,raw_max_score,actual_score,max_score').eq('exam_id', row.exam_id).eq('user_id', user).eq('subject', row.subject).maybeSingle());
  if (!exam || !score) throw new WorkspaceError('关联考试或科目已移除，请重新关联', 404);
  const preview = recordTypeRows(row), model = (globalThis as any).ScoreQuestionTypeModel;
  try { model.validate(preview.rows, score.raw_max_score, score.raw_score ?? (score.raw_max_score === score.max_score ? score.actual_score : null)); }
  catch (e) { throw new WorkspaceError((e as Error).message); }
  const existing = exam.question_type_scores?.[row.subject] || [];
  if (body.action === 'preview_types') return { ...preview, existing, exam_id: row.exam_id, exam_version: exam.updated_at };
  if (!preview.rows.length) throw new WorkspaceError('请先填写题型名称并保存核对');
  if (preview.unverified) throw new WorkspaceError('请先核对已分类题目的文字与分数，并保存核对');
  if (body.exam_version !== exam.updated_at) throw new WorkspaceError('考试已在另一处更新，请重新预览', 409);
  if (existing.length && body.replace !== true) throw new WorkspaceError('已有本科题型记录，请先确认替换；其他科目保持原样', 409);
  // Replace one subject in a single conditional write. Never add totals to items,
  // change score rows, or overwrite a concurrent edit to another subject.
  const questionTypes = { ...(exam.question_type_scores || {}), [row.subject]: preview.rows };
  const updated = await read(db.from('score_tracker_exams').update({ question_type_scores: questionTypes, updated_at: new Date().toISOString() })
    .eq('id', row.exam_id).eq('user_id', user).eq('updated_at', exam.updated_at).select('id').maybeSingle());
  if (!updated) throw new WorkspaceError('考试已更新，请重新预览后同步', 409);
  return { ok: true, exam_id: row.exam_id, subject: row.subject, question_type_scores: questionTypes };
}
