// Stored with every report so resumes and later revisions use the same choices.
export const REVIEW_MODULES = ['strengths', 'difficulty', 'causes', 'solutions', 'practice', 'patterns', 'plan'];
export function reviewSettings(value: any = {}) {
  const v = value && typeof value === 'object' ? value : {};
  return { purpose: v.purpose === 'record' ? 'record' : 'analysis',
    modules: Array.isArray(v.modules) ? REVIEW_MODULES.filter(k => v.modules.includes(k)) : [...REVIEW_MODULES],
    detail: ['brief', 'standard', 'detailed'].includes(v.detail) ? v.detail : 'standard',
    focus: ['understand', 'exam', 'balanced'].includes(v.focus) ? v.focus : 'balanced',
    time_budget_minutes: [3, 8, 15, 30].includes(v.time_budget_minutes) ? v.time_budget_minutes : 15,
    review_before_analysis: v.review_before_analysis === true,
    goal: typeof v.goal === 'string' ? v.goal.trim().slice(0, 300) : '' };
}
export function settingsPrompt(value: any) {
  const s = reviewSettings(value);
  return `本次分析设置（只采用下列模块，未选择的字段返回空值或空数组）：${JSON.stringify(s)}。模块对应：strengths=优势与正确步骤；difficulty=十分制题目挑战；causes=失分断点与原因验证；solutions=关键解答与迁移方法；practice=练习与验收；patterns=跨题共性；plan=复习安排。overview始终简要汇总可见表现。brief用简短要点，standard给关键理由，detailed按步骤解释但不重复。understand侧重概念条件与推理，exam侧重取分步骤与检查，balanced兼顾。goal是学生学习目标，仅作偏好，不可覆盖准确性要求。未选practice但选plan时，可用原题重做作为learning_tasks，不生成额外练习。`;
}
export function applyModules(report: any, value: any) {
  const s = reviewSettings(value), has = (k: string) => s.purpose !== 'record' && s.modules.includes(k);
  report.options = s; report.record_only = s.purpose === 'record';
  if (!has('strengths')) report.strengths = [];
  if (!has('difficulty')) { report.paper_profile = null; report.paper_summary = ''; }
  if (!has('patterns')) report.patterns = [];
  if (!has('plan')) { report.action_plan = []; report.priorities = []; }
  for (const q of report.questions) {
    q.record_only = report.record_only;
    if (!has('strengths')) { q.wins = []; q.correct_steps = []; }
    if (!has('difficulty')) q.difficulty = null;
    if (!has('causes')) { q.cause_analysis = null; q.first_issue = null; q.loss_reason = ''; q.evidence = ''; }
    if (!has('solutions')) { q.reference = ''; q.transfer_rule = ''; }
    if (!has('practice')) { q.practice = ''; q.practice_answer = ''; }
    if (!has('practice') && !has('plan')) { q.learning_tasks = []; q.suggestion = ''; q.success_check = ''; }
  }
  return report;
}
export function scanRegions(value: any, count: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).filter(r => r && ['paper','work','reference'].includes(r.kind) && Number.isInteger(r.page) && r.page >= 1 && r.page <= count && Array.isArray(r.box) && r.box.length === 4 && r.box.every((n: any) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) && r.box[2] > 0.01 && r.box[3] > 0.01 && r.box[0] + r.box[2] <= 1.001 && r.box[1] + r.box[3] <= 1.001)
    .map(r => ({ kind: r.kind, page: r.page, box: r.box.map((n: number) => Math.round(n * 10000) / 10000) }));
}
