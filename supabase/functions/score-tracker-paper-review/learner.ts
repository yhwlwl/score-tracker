import { text, number } from "./model.ts";

export const CAUSE_KINDS = ["time", "idea", "execution", "reading", "expression", "uncertain"];
export function examContext(value: any, source = "user_entry") {
  if (!value || typeof value !== "object") return undefined;
  const result: any = { source };
  for (const key of ["score", "max", "raw_score", "raw_max", "target", "year_rank", "year_count", "class_rank", "class_count", "total_year_rank", "total_year_count", "total_class_rank", "total_class_count"]) {
    const n = number(value[key]);
    if (n !== null && (!/rank|count/.test(key) || n >= 1 && Number.isInteger(n))) result[key] = n;
  }
  for (const prefix of ["year", "class", "total_year", "total_class"]) if (result[prefix + "_rank"] > result[prefix + "_count"]) delete result[prefix + "_rank"];
  if (text(value.exam_date, 10).match(/^\d{4}-\d{2}-\d{2}$/)) result.exam_date = value.exam_date.slice(0, 10);
  return Object.keys(result).length > 1 ? result : undefined;
}
export function fullCredit(q: any) { return typeof q.teacher_score === "number" && typeof q.max_score === "number" && q.teacher_score === q.max_score; }
export function answerCorrect(q: any) { return q.teacher_score === null && q.ai_grading?.status === 'confirmed' && q.ai_grading.verdict === 'correct' && q.ai_grading.score === q.max_score; }
export function needsConfirmation(q: any) {
  // A missing grade is independent of whether the student's work can be analysed.
  const readablePart = q.subparts?.some((s: any) => s.status === "answered" && text(s.answer, 2200));
  const answer = text(q.answer, 4000);
  return q.status === "unclear" && !readablePart && (!answer || /^(?:选项读取存在歧义|题号不可辨|作答未读清|无法识别|\[待确认\])/.test(answer));
}
export function analysisQueue(evidence: any) {
  // Positive evidence can be read together; difficult losses retain an individual budget.
  const positive = (q: any) => fullCredit(q) || answerCorrect(q);
  return [...evidence.questions.filter(positive), ...evidence.questions.filter((q: any) => !positive(q) && needsConfirmation(q)), ...evidence.questions.filter((q: any) => !positive(q) && !needsConfirmation(q))];
}
const learnerQuote = (v: string) => v.normalize("NFKC").replace(/[\s，。；：、,;:"'“”‘’_\^]/g, "").toLowerCase();
export function learnerFields(raw: any, fact: any, hasStudent = true) {
  const written = learnerQuote([fact.answer, ...(fact.subparts || []).map((s: any) => s.answer)].join(" "));
  const wins = hasStudent && Array.isArray(raw.wins) ? raw.wins.slice(0, 4).map((w: any) => ({ skill: text(w.skill, 160), observed: text(w.observed, 500), significance: text(w.significance, 700), basis: w.basis === "teacher_mark" ? "teacher_mark" : "work" }))
    .filter((w: any) => w.skill && w.observed && w.significance && (w.basis === "teacher_mark" ? fullCredit(fact) : written.includes(learnerQuote(w.observed))))
    .map((w: any) => w.basis === "work" && /^(?:[A-H]{1,8}|[+-]?\d+(?:\.\d+)?(?:[A-Za-z/²³]+)?|大于|小于|等于|相等|不相等|正确|错误|是|否)$/.test(w.observed) ? { ...w, basis: "work_result", skill: "已给出本小问的判断", significance: "把关键理由补充出来，可以形成完整的得分步骤。" } : w) : [];
  const d = raw.difficulty || {}, quote = text(d.evidence_quote, 700);
  // Unchanged diagnoses from older reports keep their original scale during a targeted update.
  const scale = d.scale === 5 || (!d.scale && d.source === 'ai_judgment') ? 5 : 10;
  const rating = (v: any) => Number.isInteger(v) && v >= 1 && v <= scale ? v : null;
  const dimensions: any = {};
  for (const axis of ["thinking", "calculation", "reading", "expression"]) {
    const item = d.dimensions?.[axis];
    dimensions[axis] = { score: rating(item?.score), reason: text(item?.reason, 300) };
    if (!dimensions[axis].reason) dimensions[axis].score = null;
  }
  const difficulty = rating(d.overall) && quote && learnerQuote(fact.stem || "").includes(learnerQuote(quote)) ? { scale, overall: rating(d.overall), evidence_quote: quote, reason: text(d.reason, 700), dimensions, source: "ai_judgment" } : null;
  const c = raw.cause_analysis || {};
  const hypotheses = hasStudent && !fullCredit(fact) && !answerCorrect(fact) && !needsConfirmation(fact) && Array.isArray(c.hypotheses) ? c.hypotheses.slice(0, 3).map((h: any) => ({ kind: CAUSE_KINDS.includes(h.kind) ? h.kind : "uncertain", explanation: text(h.explanation, 800), evidence: text(h.evidence, 700), counter_evidence: text(h.counter_evidence, 700), check: text(h.check, 600), if_confirmed: text(h.if_confirmed, 800), status: "hypothesis" }))
    .filter((h: any) => h.explanation && h.evidence && h.check && h.if_confirmed) : [];
  return { analysis_mode: fullCredit(fact) ? "strength" : answerCorrect(fact) ? 'ai_strength' : needsConfirmation(fact) ? "needs_confirmation" : "diagnosis", wins, difficulty,
    cause_analysis: { observation: hasStudent && !fullCredit(fact) && !answerCorrect(fact) ? text(c.observation, 800) : "", hypotheses, question: hypotheses.length ? text(c.question, 400) : "" } };
}
export function paperProfile(questions: any[]) {
  const rated = questions.filter(q => q.difficulty), counts = [1,2,3,4,5,6,7,8,9,10].map(level => ({ level, count: rated.filter(q => q.difficulty.scale === 10 && q.difficulty.overall === level).length }));
  return { source: "ai_judgment", rated_questions: rated.length, total_questions: questions.length, distribution: counts,
    legacy_rated_questions: rated.filter(q => q.difficulty.scale !== 10).length,
    challenging_wins: questions.filter(q => q.difficulty?.overall >= (q.difficulty?.scale === 5 ? 4 : 7) && q.wins.length).map(q => ({ label: q.label, partial: !fullCredit(q), wins: q.wins })),
    note: "按题目要求估计挑战程度，满分10：1–2为直接应用，3–4为常规模型，5–6为多步组合，7–8为多条件迁移，9–10为复杂约束与创新；不是全体考生实测难度，也不代表做题者能力。" + (rated.some(q => q.difficulty.scale !== 10) ? " 部分旧题沿用五分制，具体标尺见各题。" : "") };
}
