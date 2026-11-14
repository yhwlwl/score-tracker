import "../_shared/score-worth-model.js";
import { readDatabase } from "../score-tracker-vision-preview/reliability.ts";

const finite = (v: any) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
const rounded = (v: any) => finite(v) === null ? null : Math.round(Number(v) * 100) / 100;
// Matches the deep-analysis EWMA point estimator; regression-tested against PAL2.
export function priorPrediction(values: number[]) {
  if (!values.length) return null;
  return values.slice(1).reduce((n, v) => 0.4 * v + 0.6 * n, values[0]);
}
export function accountSnapshot(exams: any[], scores: any[], input: any) {
  const M = (globalThis as any).__stScoreWorthModel;
  const frames = exams.filter(e => !e.is_hidden).map(e => {
    const s = scores.find(s => s.exam_id === e.id && s.subject === input.subject);
    return { id: e.id, exam_date: e.exam_date, grade_level: e.grade_level || "", total_participants: e.total_participants,
      scores: { [input.subject]: { actual: s?.actual_score, max: s?.max_score, rank: s?.rank_position,
        participants: s?.participant_count, yearPositionPercent: s?.year_position_percent } } };
  }).sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)) || a.id.localeCompare(b.id));
  const index = frames.findIndex(e => e.id === input.exam_id);
  if (index < 0) return { enabled: true, status: "unlinked", note: "关联本次考试后，可以对照账号中的同科历史成绩与预测。" };
  const ctx = M.context(frames, input.subject), point = ctx.byIndex[index];
  const worth = M.compare(frames, input.subject, index, { mode: "history" });
  const base: any = { enabled: true, status: "available", source: "own_account", as_of: new Date().toISOString(),
    subject: input.subject, current_date: frames[index].exam_date,
    difficulty: worth.kind === "estimate" ? { source: "score_page_model", index: rounded(worth.difficulty), reference: 50,
      equivalent_score: rounded(worth.value), max: rounded(worth.targetMax), sample_count: worth.modelN, quality: worth.quality,
      warnings: worth.warnings, note: "与成绩页的历史平均难度使用同一模型，50为组内平均；使用当前已有记录回看，不是全体考生实测难度。" }
      : { source: "score_page_model", status: "insufficient", note: worth.reason || "可比较的记录不足。" },
    trajectory: [], prediction: { status: "insufficient", note: "缺少可比较的考前排名记录，暂不对照预测。" } };
  if (!point) { base.note = "本次成绩、满分、日期或年级排名尚不完整，历史对照暂不充分。"; return base; }
  const before = point.group.points.filter((p: any) => p.day < point.day);
  const sequence = [...before, point];
  base.trajectory = sequence.slice(-12).map((p: any) => ({ date: p.e.exam_date, score: p.score, max: p.max,
    rank: finite(p.e.scores[input.subject].rank), participants: p.N, position_percent: rounded(p.pos), current: p === point }));
  if (before.length >= 2) {
    const predicted = priorPrediction(before.map((p: any) => p.pos))!;
    base.prediction = { status: "available", source: "reconstructed_before_exam", estimator: "deep_analysis_ewma", alpha: 0.4,
      cutoff: before[before.length - 1].e.exam_date, history_count: before.length,
      predicted_position_percent: rounded(predicted), actual_position_percent: rounded(point.pos),
      improvement_points: rounded(predicted - point.pos),
      note: "只用考试日期严格早于本次的同组记录，按深度分析的点预测方法重算；没有当时预测快照，不冒充当时页面原值。排名位置越小越靠前，不是预测准确率。" };
  }
  const previous = before[before.length - 1];
  if (previous) base.change = { previous_date: previous.e.exam_date, score_rate_change_points: rounded((point.score / point.max - previous.score / previous.max) * 100),
    position_improvement_points: rounded(previous.pos - point.pos), note: "跨卷先比较排名位置和得分率，裸分变化不能直接解释为能力变化。" };
  return base;
}
export async function loadAccountSnapshot(db: any, user: string, input: any) {
  if (input.options?.use_account_history === false) return { enabled: false, status: "disabled" };
  if (!input.exam_id) return { enabled: true, status: "unlinked", note: "关联本次考试后，可对照同科历史记录。" };
  try {
    const [exams, scores] = await Promise.all([
      readDatabase(() => db.from("score_tracker_exams").select("id,exam_date,grade_level,total_participants,is_hidden").eq("user_id", user).order("exam_date", { ascending: false }).limit(500)),
      readDatabase(() => db.from("score_tracker_scores").select("exam_id,subject,actual_score,max_score,rank_position,participant_count,year_position_percent").eq("user_id", user).eq("subject", input.subject).limit(500)),
    ]);
    if (exams.error || scores.error) throw new Error("account_context_unavailable");
    return accountSnapshot(exams.data || [], scores.data || [], input);
  } catch (_) { return { enabled: true, status: "unavailable", note: "本次未能读取历史记录，报告继续依据上传资料分析。" }; }
}
