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
export function needsConfirmation(q: any) {
  return q.status === "unclear" && !q.subparts?.length || q.teacher_score === null && ["single_choice", "multiple_choice"].includes(q.kind) && !q.provided_reference;
}
export function analysisQueue(evidence: any) {
  // Positive evidence can be read together; difficult losses retain an individual budget.
  return [...evidence.questions.filter(fullCredit), ...evidence.questions.filter((q: any) => !fullCredit(q) && needsConfirmation(q)), ...evidence.questions.filter((q: any) => !fullCredit(q) && !needsConfirmation(q))];
}
const learnerQuote = (v: string) => v.normalize("NFKC").replace(/[\s，。；：、,;:"'“”‘’_\^]/g, "").toLowerCase();
export function learnerFields(raw: any, fact: any, hasStudent = true) {
  const written = learnerQuote([fact.answer, ...(fact.subparts || []).map((s: any) => s.answer)].join(" "));
  const wins = hasStudent && Array.isArray(raw.wins) ? raw.wins.slice(0, 4).map((w: any) => ({ skill: text(w.skill, 160), observed: text(w.observed, 500), significance: text(w.significance, 700), basis: w.basis === "teacher_mark" ? "teacher_mark" : "work" }))
    .filter((w: any) => w.skill && w.observed && w.significance && (w.basis === "teacher_mark" ? fullCredit(fact) : written.includes(learnerQuote(w.observed)))) : [];
  const d = raw.difficulty || {}, quote = text(d.evidence_quote, 700);
  const rating = (v: any) => Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  const dimensions: any = {};
  for (const axis of ["thinking", "calculation", "reading", "expression"]) {
    const item = d.dimensions?.[axis];
    dimensions[axis] = { score: rating(item?.score), reason: text(item?.reason, 300) };
    if (!dimensions[axis].reason) dimensions[axis].score = null;
  }
  const difficulty = rating(d.overall) && quote && learnerQuote(fact.stem || "").includes(learnerQuote(quote)) ? { overall: rating(d.overall), evidence_quote: quote, reason: text(d.reason, 700), dimensions, source: "ai_judgment" } : null;
  const c = raw.cause_analysis || {};
  const hypotheses = hasStudent && !fullCredit(fact) && !needsConfirmation(fact) && Array.isArray(c.hypotheses) ? c.hypotheses.slice(0, 3).map((h: any) => ({ kind: CAUSE_KINDS.includes(h.kind) ? h.kind : "uncertain", explanation: text(h.explanation, 800), evidence: text(h.evidence, 700), counter_evidence: text(h.counter_evidence, 700), check: text(h.check, 600), if_confirmed: text(h.if_confirmed, 800), status: "hypothesis" }))
    .filter((h: any) => h.explanation && h.evidence && h.check && h.if_confirmed) : [];
  return { analysis_mode: fullCredit(fact) ? "strength" : needsConfirmation(fact) ? "needs_confirmation" : "diagnosis", wins, difficulty,
    cause_analysis: { observation: hasStudent && !fullCredit(fact) ? text(c.observation, 800) : "", hypotheses, question: hypotheses.length ? text(c.question, 400) : "" } };
}
export function paperProfile(questions: any[]) {
  const rated = questions.filter(q => q.difficulty), counts = [1, 2, 3, 4, 5].map(level => ({ level, count: rated.filter(q => q.difficulty.overall === level).length }));
  return { source: "ai_judgment", rated_questions: rated.length, total_questions: questions.length, distribution: counts,
    challenging_wins: questions.filter(q => q.difficulty?.overall >= 4 && q.wins.length).map(q => ({ label: q.label, partial: !fullCredit(q), wins: q.wins })),
    note: "按题目要求估计挑战程度，1为直接应用，3为多步组合，5为复杂迁移；不是全体考生实测难度，也不代表做题者能力。" };
}
