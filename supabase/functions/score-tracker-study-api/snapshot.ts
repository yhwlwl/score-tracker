import '../_shared/exam-goals.js';

const goals = (globalThis as any).ScoreExamGoals;
const number = (value: unknown) => goals.num(value);
const examFields = [
  'id,name,exam_date,end_date,grade_level,is_hidden,created_at,total_actual_score,total_raw_score',
  'total_rank,total_participants,total_year_position_percent,total_class_rank,total_class_participants,total_class_position_percent',
  'city_rank,city_participants,district_rank,district_participants,exam_goals,averages',
  'scoreRows:score_tracker_scores!score_tracker_scores_exam_id_fkey(subject,actual_score,raw_score,target_score,max_score,raw_max_score,rank_position,participant_count,year_position_percent,class_rank_position,class_participant_count,class_position_percent,exclude_from_total)',
  'links:score_tracker_exam_modules!score_tracker_exam_modules_exam_id_fkey(module_id,ranks)',
].join(',');

function shapeExam({ scoreRows = [], links = [], ...exam }: any) {
  return {
    ...exam,
    total_rank: number(exam.total_rank),
    total_participants: number(exam.total_participants),
    total_year_position_percent: number(exam.total_year_position_percent),
    total_actual_score: number(exam.total_actual_score),
    scores: Object.fromEntries(scoreRows.map((row: any) => [row.subject, {
      actual: number(row.actual_score), raw: number(row.raw_score), target: number(row.target_score),
      max: number(row.max_score) ?? 100, rawMax: number(row.raw_max_score ?? row.max_score) ?? 100,
      rank: number(row.rank_position), participants: number(row.participant_count),
      yearPositionPercent: number(row.year_position_percent), classRank: number(row.class_rank_position),
      classParticipants: number(row.class_participant_count), classPositionPercent: number(row.class_position_percent),
      excludeFromTotal: !!row.exclude_from_total,
    }])),
    moduleIds: links.map((row: any) => row.module_id),
    moduleRanks: Object.fromEntries(links.map((row: any) => [row.module_id, row.ranks])),
  };
}

export async function loadSnapshot(db: any, userId: string) {
  const pageSize = 80;
  const page = (start: number) => db.from('score_tracker_exams').select(examFields).eq('user_id', userId)
    .eq('scoreRows.user_id', userId).eq('links.user_id', userId)
    .or('is_hidden.is.false,is_hidden.is.null,exam_goals->>planned.eq.true')
    .order('exam_date').order('created_at').order('id').range(start, start + pageSize - 1);
  const [history, modules] = await Promise.all([
    page(0),
    db.from('score_tracker_modules').select('id,name,subjects').eq('user_id', userId).order('sort_order'),
  ]);
  if (history.error || modules.error) throw history.error || modules.error;
  const records = history.data || [];
  for (let next = records.length; next && next % pageSize === 0;) {
    const result = await page(next);
    if (result.error) throw result.error;
    const batch = result.data || [];
    records.push(...batch);
    if (batch.length < pageSize) break;
    next += batch.length;
  }
  const exams = [];
  const plans = [];
  for (const record of records) {
    const exam = shapeExam(record);
    if (goals.pending(exam)) plans.push(exam);
    else if (!exam.is_hidden && goals.actual(exam)) exams.push(exam);
  }
  const ownedExamIds = new Set(exams.map(exam => exam.id));

  async function details(kind: 'reflection' | 'types' | 'paper', examIds: string[], subjects: string[]) {
    const ids = examIds.filter(id => ownedExamIds.has(id));
    if (!ids.length) return [];
    if (kind === 'paper') {
      let request = db.from('score_tracker_paper_reviews').select('exam_id,subject,questions:result->questions,corrections')
        .eq('user_id',userId).eq('status','succeeded').in('exam_id',ids)
        .order('created_at',{ascending:false}).limit(20);
      if (subjects.length) request = request.in('subject',subjects);
      const result = await request;
      if (result.error) throw result.error;
      return result.data || [];
    }
    const field = kind === 'reflection' ? 'reflection' : 'question_type_scores';
    const rows = [];
    for (let i = 0; i < ids.length; i += 60) {
      const result = await db.from('score_tracker_exams').select('id,' + field).eq('user_id',userId)
        .not('is_hidden','is',true).in('id',ids.slice(i,i+60));
      if (result.error) throw result.error;
      rows.push(...(result.data || []));
    }
    return rows;
  }
  async function longGoal() {
    const [goal, subjects] = await Promise.all([
      db.from('score_tracker_user_goals').select('subject_goals,total_goal,target_rank,dream_school,exam_date,date_name').eq('user_id',userId).maybeSingle(),
      db.from('score_tracker_subjects').select('name,default_max').eq('user_id',userId),
    ]);
    if (goal.error || subjects.error) throw goal.error || subjects.error;
    return { goal: goal.data, subjects: subjects.data || [] };
  }
  return { exams, plans, modules: modules.data || [], details, longGoal };
}

export function loadTrajectory(db: any, userId: string) {
  return async (subjects: string[] | null, metric: 'score' | 'year', category: string) => {
    // The same RPC enforces the existing trajectory-sharing setting. Only the
    // calculated summary travels from the study tool to the model.
    const { data, error } = await db.rpc('score_tracker_trajectory_match_v2', {
      p_user_id: userId, p_subjects: subjects, p_metric: metric, p_category: category,
      p_same_category: false, p_match_mode: 'shape', p_reference_policy: 'balanced',
      p_min_history: 3, p_reference_limit: 20,
    });
    if (error) throw error;
    return data;
  };
}
