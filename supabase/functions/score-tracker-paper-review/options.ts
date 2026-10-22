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
  return `本次分析设置（只采用下列模块，未选择的字段返回空值或空数组）：${JSON.stringify(s)}。模块对应：strengths=优势与正确步骤；difficulty=十分制题目挑战；causes=失分断点与原因验证；solutions=关键解答与迁移方法；practice=练习与验收；patterns=跨题共性；plan=复习安排。overview始终用2～3句、80～150字说清已做到什么和先改哪里；完整解题过程放在逐题reference，不在overview、wins、suggestion反复展开。brief每个解释1～2句；standard先结论再给一个关键理由；detailed在reference中分步骤讲透，其他层仍简短。understand侧重概念条件与推理，exam侧重取分步骤与检查，balanced兼顾。goal是学生学习目标，仅作偏好，不可覆盖准确性要求。未选practice但选plan时，可用原题重做作为learning_tasks，不生成额外练习。
写作要求：像老师坐在学生旁边讲一道题，用自然、具体、完整的短句。说“你这一步已经列对了”“这里漏了哪个条件”“接下来先做什么”，不要写成评审报告或能力标签。避免在学生可见文本里堆叠“正确前缀、高价值步骤、能力结构、最小验证、可迁移规则、验收标准、证据链、闭环、抓手”等术语；直接写出对应的动作和理由。必要的学科术语要保留，并在首次出现时顺带解释，不用生硬同义替换损害准确性。不居高临下，不泛泛表扬，不用“你一定能提高”等承诺。
title和skill用约8～18字点明具体做法；observation只说卷面事实；explanation只解释为什么不成立；correction写正确的这一步；suggestion从修正后继续，不重复correction；significance一句话说明这步的作用。每段只讲一件事，长解答按小问分段，用换行或编号组织；公式按LaTeX规范输出，不用长串箭头代替解释。不为了简洁删去影响结论的条件、单位和边界。原题、学生原文和引文必须原样保留，不按上述文风润色。`;
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
