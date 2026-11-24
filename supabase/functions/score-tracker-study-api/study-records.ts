import '../_shared/exam-goals.js';

const goals = (globalThis as any).ScoreExamGoals;
const n = (value: unknown): number | null => goals.num(value);
const real = (value: unknown) => n(value) !== null;

export const includedSubjects = (exam: any) => Object.keys(exam.scores || {}).filter(name => {
  const score = exam.scores[name];
  return !score.excludeFromTotal && ['actual','raw','rank','classRank','target'].some(field => real(score[field]));
});

const sameSubjects = (names: string[], other: string[]) =>
  names.length > 0 && other.length === names.length && names.every(name => other.includes(name));

export function measure(exam: any, key: string, modules: any[]) {
  const actual = goals.measured(exam, key, modules);
  if (!key.startsWith('m:')) return actual;
  const id = key.slice(2);
  const group = modules.find(row => String(row.id) === id);
  if (!group?.subjects?.length) return actual;
  const totalsMatch = sameSubjects(includedSubjects(exam), group.subjects);
  const members = group.subjects.map((name: string) => goals.measured(exam,'s:' + name,modules));
  const allScores = members.every((row: any) => real(row.score) && n(row.max)! > 0);
  const rank = exam.moduleRanks?.[id];
  return {
    ...actual,
    scope: 'module:' + key + ':' + group.subjects.slice().sort().join('|'),
    score: actual.score ?? (totalsMatch && real(exam.total_actual_score) ? n(exam.total_actual_score) :
      allScores ? members.reduce((sum: number, row: any) => sum + row.score, 0) : null),
    max: actual.max ?? (allScores ? members.reduce((sum: number, row: any) => sum + row.max, 0) : null),
    rank: n(rank?.yearRank) ?? (!rank && totalsMatch ? n(exam.total_rank) : null),
    people: n(rank?.yearParticipants) ?? n(exam.total_participants),
    percent: n(rank?.yearPositionPercent) ?? (!rank && totalsMatch ? n(exam.total_year_position_percent) : null),
  };
}

export function otherRanks(exam: any, key: string, modules: any[]) {
  const totalClass = { rank: n(exam.total_class_rank), people: n(exam.total_class_participants), percent: n(exam.total_class_position_percent) };
  if (key === 'total') return {
    class: totalClass, city: { rank: n(exam.city_rank), people: n(exam.city_participants) },
    district: { rank: n(exam.district_rank), people: n(exam.district_participants) },
  };
  if (key.startsWith('s:')) {
    const row = exam.scores[key.slice(2)];
    return { class: { rank: n(row?.classRank), people: n(row?.classParticipants) ?? totalClass.people, percent: n(row?.classPositionPercent) } };
  }
  const id = key.slice(2);
  const rank = exam.moduleRanks?.[id];
  const group = modules.find(row => String(row.id) === id);
  return { class: rank ? { rank: n(rank.classRank), people: n(rank.classParticipants) ?? totalClass.people, percent: n(rank.classPositionPercent) } :
    group?.subjects && sameSubjects(includedSubjects(exam), group.subjects) ? totalClass : {} };
}

export function rawMark(exam: any, key: string, modules: any[]) {
  const names = key === 'total' ? includedSubjects(exam) : key.startsWith('s:') ? [key.slice(2)] :
    modules.find(row => String(row.id) === key.slice(2))?.subjects || [];
  const parts = names.map((name: string) => {
    const row = exam.scores[name] || {};
    const max = n(row.rawMax ?? row.max);
    return { max, score: n(row.raw) ?? (max === n(row.max) ? n(row.actual) : null) };
  });
  const max = parts.length && parts.every((part: any) => part.max > 0) ?
    parts.reduce((sum: number, part: any) => sum + part.max, 0) : null;
  const score = key === 'total' && real(exam.total_raw_score) ? n(exam.total_raw_score) :
    parts.length && parts.every((part: any) => real(part.score)) ? parts.reduce((sum: number, part: any) => sum + part.score, 0) : null;
  return { score, max };
}

export function verifiedQuestions(paper: any): { name: string; type: string; score: number; max: number }[] {
  const corrections = new Map((Array.isArray(paper.corrections) ? paper.corrections : []).map((row: any) => [row.id, row]));
  return (Array.isArray(paper.questions) ? paper.questions : []).flatMap((question: any) => {
    const correction = corrections.get(question.id) as any;
    if (!correction || !(correction.verified === true || question.screenshot_only && correction.accepted === true)) return [];
    const score = n(correction.teacher_score ?? question.teacher_score);
    const max = n(correction.max_score ?? question.max_score);
    if (score === null || max === null || max <= 0 || score < 0 || score > max) return [];
    return [{ name: String(question.label || question.id || '未标题号').slice(0, 32), type: String(correction.question_type ?? question.question_type ?? '').slice(0, 40), score, max }];
  });
}
