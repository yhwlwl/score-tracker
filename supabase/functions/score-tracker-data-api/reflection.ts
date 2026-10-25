/* Called only after the application's existing session authentication. */
export async function examReflection(db: any, uid: string, body: any) {
  const id = body.examId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { status: 400, data: { error: '考试编号不正确' } };
  const columns = 'reflection,reflection_revision,reflection_updated_at';
  const read = () => db.from('score_tracker_exams').select(columns).eq('id', id).eq('user_id', uid).maybeSingle();
  const before = await read();
  if (before.error) throw before.error;
  if (!before.data) return { status: 404, data: { error: '没有找到这次考试' } };
  if (body.action === 'get_exam_reflection') return { status: 200, data: before.data };
  if (typeof body.text !== 'string' || body.text.length > 10000 || body.text.includes('\u0000') || !Number.isSafeInteger(body.revision) || body.revision < 0 || body.revision >= 2147483647) {
    return { status: 400, data: { error: '反思最多 10000 字，请检查内容后重试' } };
  }
  // An acknowledged response may have been lost; replaying the same text is harmless.
  if (before.data.reflection === body.text) return { status: 200, data: before.data };
  if (before.data.reflection_revision !== body.revision) return { status: 409, data: { error: '这段反思已在另一处更新，请选择要保留的内容', current: before.data } };
  const saved = await db.from('score_tracker_exams').update({ reflection: body.text, reflection_revision: body.revision + 1, reflection_updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', uid).eq('reflection_revision', body.revision).select(columns).maybeSingle();
  if (saved.error) throw saved.error;
  if (saved.data) return { status: 200, data: saved.data };
  const latest = await read();
  if (latest.error) throw latest.error;
  return latest.data ? { status: 409, data: { error: '这段反思已在另一处更新，请选择要保留的内容', current: latest.data } } : { status: 404, data: { error: '没有找到这次考试' } };
}
