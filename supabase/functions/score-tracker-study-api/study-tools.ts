import '../_shared/exam-goals.js';
import '../_shared/learning-state-model.js';
import '../_shared/score-worth-model.js';
import '../_shared/trajectory-forecast.js';
import '../_shared/question-type-analysis-model.js';
import { measure, otherRanks, rawMark, verifiedQuestions } from './study-records.ts';

const { ScoreExamGoals: goals, PAL2: pal, __stScoreWorthModel: worth, __stTrajectoryForecast: trajectory } = globalThis as any;
const questionTypes = (globalThis as any).ScoreQuestionTypeAnalysisModel;
const round = (n: number) => Math.round(n * 100) / 100;
const signed = (n: number) => (round(n) > 0 ? '+' : '') + round(n);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const percentage = (n: unknown): n is number => finite(n) && n >= 0 && n <= 100;
const position = (result: any) => {
  if (!result) return null;
  const value = goals.rankValue(result, 'percent');
  return percentage(value) ? value : null;
};
const rate = (result: any) => result.max > 0 && finite(result.score) ? 100 * result.score / result.max : null;
const median = (values: number[]) => goals.quantile(values, .5);
const examName = (exam: any) => String(exam.name || '未命名考试').slice(0, 100);
const source = (exam: any) => [examName(exam), exam.exam_date].filter(Boolean).join(' · ');

export type Evidence = { label: string; value: string; source: string; kind?: 'change' };
export type Metric = 'score' | 'rate' | 'rank' | 'classRank' | 'cityRank' | 'districtRank' |
  'scoreChange' | 'rateChange' | 'rankChange' | 'difficulty' | 'averageGap' | 'count' | 'lost';
type Dimension = 'exams' | 'subjects' | 'bands' | 'types' | 'questions';
type Axis = { key: string; label: string; detail?: string };
type Row = { id: number; exam: any; actual: any; axis: Axis };
type Point = Axis & { value: number | null; low?: number; high?: number; forecast?: true };
type Series = { id: number; label: string; metric: Metric; points: Point[]; dimension: Dimension };
type Chart = { type: 'line' | 'bar' | 'table' | 'radar'; title: string; series: Series[] };
type Snapshot = {
  exams: any[]; modules: any[]; plans?: any[];
  details?: (kind: 'reflection' | 'types' | 'paper', ids: string[], subjects: string[]) => Promise<any[]>;
  longGoal?: () => Promise<{ goal: any; subjects: any[] }>;
};
export type TrajectoryLoader = (subjects: string[] | null, metric: 'score' | 'year', category: string) => Promise<any>;

const point = (axis: Axis, n: number | null): Point => ({ ...axis, value: finite(n) ? round(n) : null });
const changeName = (change: number) => change === 0 ? '持平' : (change > 0 ? '前进 ' : '后退 ') + Math.abs(round(change)) + ' 个百分点';
const sameScope = (a: Row, b: Row) => a.actual.scope && a.actual.scope === b.actual.scope;
const observed = (row: Row) => finite(row.actual.score) || finite(row.actual.rank) || position(row.actual) != null;
const candidate = (arg: any): unknown[] => Array.isArray(arg) ? arg.slice(0, 60) : [];
const dateArg = (value: unknown) => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value) ? value : '';
const fmtMark = (score: number | null, max: number | null) => score == null ? '未录入' :
  round(score) + (max && max > 0 ? '/' + max : '') + ' 分';
const rankDetails = (r: any) => r ? [finite(r.rank) ? '第 ' + r.rank + ' 名' + (r.people ? ' / ' + r.people + ' 人' : '') : '',
  position(r) != null ? '前 ' + round(position(r)!) + '%' : ''].filter(Boolean).join(' · ') : '';
const rankMetrics = { class: 'classRank', city: 'cityRank', district: 'districtRank' } as const;
const rankNames = { class: '班级', city: '市', district: '区' } as const;

export function studyTools({ exams, modules, plans = [], details, longGoal }: Snapshot, loadTrajectory?: TrajectoryLoader) {
  const scopes = new Map<string, string>([['total', '总分']]);
  for (const exam of exams) for (const name of Object.keys(exam.scores)) scopes.set('s:' + name, name);
  for (const module of modules) scopes.set('m:' + module.id, module.name);
  const groups = modules.map(module => ({ key: 'm:' + module.id, subjects: module.subjects }));
  const metadata = exams.map((exam, index) => ({ id: index + 1, name: examName(exam), date: exam.exam_date, category: exam.grade_level }));
  const categories = Object.entries(metadata.reduce((counts: Record<string,number>, exam) => {
    const key = exam.category || '__none__';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, Object.create(null)));
  const catalog = {
    exams: metadata.slice(-30),
    history: { count: exams.length, from: exams[0]?.exam_date, to: exams.at(-1)?.exam_date, categories },
    planned: plans.length, scopes: Object.fromEntries(scopes), groups,
  };
  const rowsByScope = new Map<string, Row[]>();
  const facts: Evidence[] = [];
  const series: Series[] = [];
  const refs = new Map<string, number>();
  const seriesRefs = new Map<string, number>();
  let trajectoryUsed = false;

  function scopeRows(key: string) {
    if (!rowsByScope.has(key)) {
      rowsByScope.set(key, exams.map((exam, index) => ({
        id: index + 1, exam, actual: measure(exam, key, modules),
        axis: { key: String(index + 1), label: examName(exam), detail: [exam.exam_date, exam.grade_level].filter(Boolean).join(' · ') },
      })));
    }
    return rowsByScope.get(key)!;
  }

  async function query(args: any) {
    const found = new Set<number>();
    const datasets = new Set<number>();
    const notes: string[] = [];
    function add(label: string, value: string, citation: string, kind?: 'change') {
      const fact = { label, value, source: citation, kind };
      const hash = JSON.stringify(fact);
      if (!refs.has(hash)) refs.set(hash, facts.push(fact));
      found.add(refs.get(hash)!);
    }
    function addSeries(label: string, metric: Metric, points: Point[], dimension: Dimension = 'exams') {
      if (!points.some(p => p.value !== null)) return;
      const hash = JSON.stringify([label, metric, dimension, points]);
      if (!seriesRefs.has(hash)) {
        const id = series.length + 1;
        series.push({ id, label, metric, dimension, points });
        seriesRefs.set(hash, id);
      }
      datasets.add(seriesRefs.get(hash)!);
    }

    const ids = new Set(candidate(args.exams).filter((id): id is number => Number.isInteger(id) && exams[(id as number) - 1] != null));
    if (candidate(args.exams).length && !ids.size) return { facts: [], series: [], notes: ['没有找到指定的考试。'] };
    const requestedScopes = candidate(args.scopes);
    const keyLimit = args.tool === 'matrix' || args.tool === 'structure' ? 24 : 8;
    const keys = (requestedScopes.includes('*') ? [...scopes.keys()].filter(k => k.startsWith('s:')) :
      [...new Set(requestedScopes.filter((k): k is string => typeof k === 'string' && scopes.has(k)))]).slice(0, keyLimit);
    const category = typeof args.category === 'string' && args.category.length <= 40 ? args.category : '__all__';
    const from = dateArg(args.from), to = dateArg(args.to);
    const name = typeof args.name === 'string' ? args.name.trim().slice(0, 100) : '';
    const matchExam = (exam: any) => (category === '__all__' ||
      (category === '__none__' ? !exam.grade_level : exam.grade_level === category)) &&
      (!from || exam.exam_date >= from) && (!to || exam.exam_date <= to) && (!name || examName(exam).includes(name));
    const inCategory = (row: Row) => matchExam(row.exam);
    const maxExams = args.range === 'all' ? Infinity :
      Number.isInteger(args.limit) ? Math.min(30, Math.max(1, args.limit)) : 6;
    const extraRanks = [...new Set(candidate(args.ranks).filter((g): g is keyof typeof rankMetrics =>
      typeof g === 'string' && Object.hasOwn(rankMetrics, g)))];
    const select = (key: string) => {
      const rows = scopeRows(key).filter(row => inCategory(row) && (ids.size ? ids.has(row.id) :
        observed(row) || extraRanks.some(g => rankDetails(otherRanks(row.exam,key,modules)[g])) ||
        (args.basis === 'raw' && rawMark(row.exam,key,modules).score !== null)));
      return ids.size || maxExams === Infinity ? rows : rows.slice(-maxExams);
    };
    const matching = () => scopeRows('total').filter(row => inCategory(row) && (!ids.size || ids.has(row.id)));
    if (args.tool === 'examList') {
      const matches = matching();
      add('考试记录', matches.length + ' 场', '所选考试范围');
      for (const row of matches.slice(-20)) {
        const e = row.exam;
        add('考试 #' + row.id, [e.grade_level, e.end_date && e.end_date !== e.exam_date ? '结束 ' + e.end_date : '', Object.keys(e.scores).join('、')].filter(Boolean).join(' · ') || '已录入', source(e));
      }
    } else if (args.tool === 'plan') {
      const show = plans.filter(matchExam).slice(-6);
      for (const exam of show) {
        for (const key of keys.length ? keys : scopes.keys()) {
          const goal = goals.goalFor(exam,key,modules,false);
          const parts = [
            finite(goal?.score) ? fmtMark(goal.score,goal.max) : '',
            finite(goal?.rank) ? goal.rankType === 'percent' ? '前 ' + goal.rank + '%' : '第 ' + goal.rank + ' 名' : '',
          ].filter(Boolean);
          if (parts.length) add(scopes.get(key)! + '预设目标', parts.join(' · '), source(exam));
        }
      }
    } else if (args.tool === 'longGoal' && longGoal) {
      const { goal, subjects } = await longGoal();
      if (goal) {
        const context = [goal.date_name, goal.exam_date].filter(Boolean).join(' · ') || '长期目标';
        const configured = new Map(subjects.map(s => [s.name, goals.num(s.default_max)]));
        if (goal.dream_school) add('理想学校', String(goal.dream_school).slice(0,40), context);
        if (goal.exam_date) add('目标日期', goal.exam_date, context);
        const targets = Object.entries(goal.subject_goals || {}).filter(([,v]) => finite(goals.num(v)));
        for (const [subject, value] of targets) {
          if (keys.length && !keys.includes('s:' + subject)) continue;
          const target = Number(value), max = configured.get(subject) || null;
          const last = select('s:' + subject).filter(row => finite(row.actual.score)).at(-1);
          const actualRate = last ? rate(last.actual) : null;
          const gap = max && actualRate !== null ? round(actualRate - target / max * 100) : null;
          const status = gap === null ? '' : gap >= 0 ? ' · 已达标' : ' · 差 ' + Math.abs(gap) + ' 个百分点';
          add(subject + '长期目标', fmtMark(target,max) + (last ? ' · 最近 ' + fmtMark(last.actual.score,last.actual.max) : '') + status,
            context + (last ? ' · ' + source(last.exam) : ''));
        }
        if (!keys.length || keys.includes('total')) {
          const last = select('total').at(-1);
          const totalGoal = goals.num(goal.total_goal) ?? (targets.length ? targets.reduce((sum,[,v])=>sum+Number(v),0) : null);
          if (totalGoal !== null) {
            const relevant = targets.length > 0 && last && targets.length === Object.keys(last.exam.scores).filter(s=>!last.exam.scores[s].excludeFromTotal).length &&
              targets.every(([s])=>last.exam.scores[s] && !last.exam.scores[s].excludeFromTotal && configured.get(s) === last.exam.scores[s].max);
            const value = relevant && finite(last?.actual.score) ?
              fmtMark(totalGoal,last.actual.max) + ' · 最近 ' + fmtMark(last.actual.score,last.actual.max) + ' · 相差 ' + signed(last.actual.score - totalGoal) + ' 分' :
              fmtMark(totalGoal,null);
            add('长期总分目标',value,context + (relevant && last ? ' · ' + source(last.exam) : ''));
          }
          const targetRank = goals.num(goal.target_rank);
          if (targetRank !== null) {
            const rank = last?.actual.rank;
            add('长期年级排名目标','第 ' + targetRank + ' 名' + (finite(rank) ? ' · 最近第 ' + rank + ' 名 · ' + (rank <= targetRank ? '已达标' : '差 ' + (rank - targetRank) + ' 名') : ''),
              context + (last && finite(rank) ? ' · ' + source(last.exam) : ''));
          }
        }
      } else notes.push('还没有设置长期目标。');
    } else if (args.tool === 'reflection' && details) {
      const selected = matching().slice(-6);
      const saved = new Map((await details('reflection', selected.map(row => row.exam.id), [])).map(row => [row.id, row.reflection]));
      for (const row of selected) {
        const content = saved.get(row.exam.id);
        if (typeof content === 'string' && content.trim()) add('本人考试反思', content.trim().slice(0,1000), source(row.exam));
      }
      if (!found.size) notes.push('所选考试没有已保存的复盘文字。');
    } else if (args.tool === 'types' && details) {
      const candidates = matching().slice(-maxExams);
      const byExam = new Map((await details('types', candidates.map(row => row.exam.id), [])).map(row => [row.id,row.question_type_scores]));
      const subjects = keys.filter(key => key.startsWith('s:')).map(key => key.slice(2));
      const base = candidates.map(row => ({ ...row.exam, question_type_scores: byExam.get(row.exam.id) }));
      const entries = subjects.length ? subjects : [...new Set(base.flatMap(exam => Object.keys(exam.question_type_scores || {})))].slice(0,8);
      const causes: Record<string,string> = { knowledge:'知识点',method:'方法',careless:'粗心',time:'时间分配' };
      const labels: Record<string,string> = { easy:'基础',medium:'中档',hard:'偏难',mixed:'难度混合' };
      for (const subject of entries) {
        const data = questionTypes.analyze(base,{subject,group:args.group === 'position' ? 'position' : 'type'});
        const typeName = typeof args.typeName === 'string' ? args.typeName.slice(0,40) : '';
        const rows = data.rows.filter((item: any) => item.count && (!typeName || item.name.includes(typeName) || item.position.includes(typeName)))
          .sort((a: any,b: any)=>b.lost-a.lost);
        if (!rows.length) continue;
        add(subject + '题型记录', data.recorded + ' / ' + data.exams.length + ' 场 · 已录题型共失 ' + round(data.totalLost) + ' 分', '题型分析');
        const components: Point[] = [];
        for (const item of rows.slice(0,12)) {
          const label = item.position ? item.name + ' · ' + item.position : item.name;
          const copy = [fmtMark(item.score,item.max), '失 ' + round(item.lost) + ' 分', '得分率 ' + round(item.rate*100) + '%',
            item.contribution == null ? '' : '占已录失分 ' + round(item.contribution*100) + '%',
            item.change == null ? '' : '近期变化 ' + signed(item.change*100) + ' 个百分点',
            labels[item.difficulty], item.cause ? '已标记错因 ' + causes[item.cause] : ''].filter(Boolean);
          add(subject + ' · ' + label,copy.join(' · '),'题型分析 · ' + item.count + ' 场有效记录');
          components.push(point({key:item.key,label},item.lost));
          if (components.length <= 4) {
            const points = data.exams.map((exam: any,i: number)=>{
              const row = candidates.find(r=>r.exam.id===exam.id);
              return row ? point(row.axis, item.cells[i]?.complete ? item.cells[i].rate*100 : null) : null;
            }).filter(Boolean);
            addSeries(subject + ' · ' + label,'rate',points);
          }
        }
        addSeries(subject,'lost',components,'types');
      }
      if (!found.size) notes.push('所选考试中没有完整的题型得分和满分记录。');
    } else if (args.tool === 'paper' && details) {
      const selected = matching().slice(-3);
      const owners = new Map(selected.map(row => [row.exam.id,row]));
      const papers = await details('paper',[...owners.keys()],keys.filter(key=>key.startsWith('s:')).map(key=>key.slice(2)));
      const shown = new Set<string>();
      for (const paper of papers) {
        const row = owners.get(paper.exam_id);
        const key = paper.exam_id + ':' + paper.subject;
        if (!row || shown.has(key)) continue;
        const qs = verifiedQuestions(paper).sort((a,b)=>(b.max-b.score)-(a.max-a.score));
        if (!qs.length) continue;
        shown.add(key);
        for (const q of qs.slice(0,15)) {
          add(paper.subject + ' · ' + q.name, [q.type, fmtMark(q.score,q.max),'失 ' + round(q.max-q.score) + ' 分'].filter(Boolean).join(' · '),
            source(row.exam) + ' · 已核对试题');
        }
        addSeries(paper.subject + ' · ' + row.axis.label,'lost', qs.map(q=>point({key:q.name,label:q.name,detail:q.type},q.max-q.score)),'questions');
      }
      if (!found.size) notes.push('所选考试没有已核对的逐题分数。');
    } else if (args.tool === 'structure') {
      for (const row of matching().slice(-Math.min(maxExams,5))) {
        const subjects = (keys.length ? keys : Object.keys(row.exam.scores).map(name=>'s:'+name)).filter(key=>key.startsWith('s:'));
        const measured = subjects.map(key=>({key,label:scopes.get(key)!,actual:measure(row.exam,key,modules)}));
        const positions = measured.map(m=>position(m.actual)).filter(finite);
        const typical = positions.length >= 3 ? median(positions) : null;
        for (const m of measured) {
          const r = m.actual, pct = position(r);
          const value = [finite(r.score) ? fmtMark(r.score,r.max) : '', rankDetails(r),
            typical !== null && pct !== null ? '相对本科目组中位 ' + changeName(round(typical-pct)) : ''].filter(Boolean);
          if (value.length) add(m.label,value.join(' · '), source(row.exam));
        }
        for (const metric of ['rate','rank'] as const) {
          addSeries(row.axis.label,metric,measured.map(m=>point({key:m.key,label:m.label},metric==='rank'?position(m.actual):rate(m.actual))),'subjects');
        }
      }
    }
    for (const key of keys) {
      const label = scopes.get(key)! + (args.tool === 'results' && args.basis === 'raw' ? '原始分' : '');
      const history = select(key);
      const rows = args.tool === 'results' && args.basis === 'raw' ?
        history.map(row=>({ ...row, actual: { ...row.actual, ...rawMark(row.exam,key,modules) } })) : history;
      if (args.tool === 'results') {
        const records = rows.length * keys.length <= 24 ? rows : [rows[0], ...rows.slice(-3)].filter(Boolean);
        for (const { exam, actual: r } of records) {
          const pct = position(r);
          const details = [];
          if (finite(r.score)) details.push(r.max > 0 ? round(r.score) + '/' + r.max + ' 分' : round(r.score) + ' 分');
          if (rate(r) != null) details.push('得分率 ' + round(rate(r)!) + '%');
          if (finite(r.rank)) details.push('年级第 ' + r.rank + ' 名' + (r.people ? ' / ' + r.people + ' 人' : ''));
          if (pct != null) details.push('年级前 ' + round(pct) + '%');
          if (details.length) add(label, details.join(' · '), source(exam));
          const known = otherRanks(exam,key,modules);
          for (const kind of extraRanks) {
            const value = rankDetails(known[kind]);
            if (value) add(scopes.get(key)! + rankNames[kind] + '排名',value,source(exam));
          }
          const cls = extraRanks.includes('class') ? position(known.class) : null;
          if (cls !== null && pct !== null)
            add(scopes.get(key)! + '班级与年级位置差', pct === cls ? '两者一致' :
              '班级位置更' + (cls < pct ? '靠前 ' : '靠后 ') + round(Math.abs(pct-cls)) + ' 个百分点',source(exam));
        }
        if (rows.length === 0) continue;
        const last = rows.at(-1)!;
        const comparable = rows.map(row => sameScope(row, last) ? row.actual : null);
        const recordedMaxima = new Set(comparable.filter(r => r && finite(r.score)).map(r => r.max));
        if (recordedMaxima.size === 1 && Number([...recordedMaxima][0]) > 0) {
          addSeries(label, 'score', rows.map((row, i) => point(row.axis, comparable[i]?.score)));
        }
        addSeries(label, 'rate', rows.map((row, i) => point(row.axis, comparable[i] ? rate(comparable[i]) : null)));
        addSeries(label, 'rank', rows.map((row, i) => point(row.axis, comparable[i] ? position(comparable[i]) : null)));
        for (const kind of extraRanks) {
          const points = rows.map((row, i) => {
            const rank = comparable[i] && otherRanks(row.exam,key,modules)[kind];
            return point(row.axis,rank ? position(rank) : null);
          });
          if (!points.some(p=>p.value !== null)) notes.push(label + '没有可画成位置趋势的' + rankNames[kind] + '排名数据。');
          addSeries(scopes.get(key)!,rankMetrics[kind],points);
        }
        const changes: { axis: Axis; from: Row; to: Row; score: number | null; rate: number | null; rank: number | null }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const from = rows[i - 1], to = rows[i];
          const a = from.actual, b = to.actual;
          if (!sameScope(from, to)) continue;
          const ar = rate(a), br = rate(b), ap = position(a), bp = position(b);
          const rateDelta = ar !== null && br !== null ? round(br - ar) : null;
          const rankDelta = ap !== null && bp !== null ? round(ap - bp) : null;
          const scoreDelta = rateDelta !== null && a.max === b.max ? round(b.score - a.score) : null;
          const axis = { key: from.id + ':' + to.id, label: to.axis.label, detail: from.axis.label + ' → ' + to.axis.label + ' · ' + (to.exam.exam_date || '') };
          changes.push({ axis, from, to, score: scoreDelta, rate: rateDelta, rank: rankDelta });
        }
        for (const change of changes.length * keys.length <= 12 ? changes : changes.slice(-3)) {
          const citation = source(change.from.exam) + ' → ' + source(change.to.exam);
          if (change.score !== null) add(label + '分差', signed(change.score) + ' 分', citation, 'change');
          if (change.rate !== null && change.score === null) add(label + '得分率变化', signed(change.rate) + ' 个百分点', citation, 'change');
          if (change.rank !== null) add(label + '年级位置', changeName(change.rank), citation, 'change');
        }
        addSeries(label, 'scoreChange', changes.map(row => point(row.axis, row.score)));
        addSeries(label, 'rateChange', changes.map(row => point(row.axis, row.rate)));
        addSeries(label, 'rankChange', changes.map(row => point(row.axis, row.rank)));
        const paired = changes.filter(row => row.rate !== null && row.rank !== null);
        if (paired.length >= 2) {
          const flat = paired.filter(row => row.rate === 0 || row.rank === 0).length;
          const aligned = paired.filter(row => row.rate !== 0 && row.rank !== 0 && Math.sign(row.rate!) === Math.sign(row.rank!)).length;
          add(label + '得分率与年级位置', '同向 ' + aligned + ' 次 · 反向 ' + (paired.length - aligned - flat) + ' 次 · 一项持平 ' + flat + ' 次',
            source(rows[0].exam) + ' → ' + source(last.exam) + ' · ' + paired.length + ' 组可比变化');
        }
        const prior = scopeRows(key).filter(row => row.id < last.id && inCategory(row) && sameScope(row, last)).slice(-8)
          .map(row=>args.basis === 'raw' ? {...row,actual:{...row.actual,...rawMark(row.exam,key,modules)}} : row);
        const prevRates = prior.map(row => rate(row.actual)).filter(finite), prevPositions = prior.map(row => position(row.actual)).filter(finite);
        const currentRate = rate(last.actual), currentPosition = position(last.actual);
        if (currentRate !== null && prevRates.length >= 3) {
          const typical = median(prevRates);
          add(label + '得分率对照', '此前中位数 ' + round(typical) + '% · 本次 ' + round(currentRate) + '% · ' + signed(currentRate - typical) + ' 个百分点',
            source(last.exam) + ' · 此前 ' + prevRates.length + ' 场可比记录');
        }
        if (currentPosition !== null && prevPositions.length >= 3) {
          const typical = median(prevPositions);
          add(label + '年级位置对照', '此前中位数前 ' + round(typical) + '% · 本次前 ' + round(currentPosition) + '% · ' + changeName(round(typical - currentPosition)),
            source(last.exam) + ' · 此前 ' + prevPositions.length + ' 场可比记录');
        }
        if (rows.some(row => !sameScope(row, last))) notes.push(label + '图表仅连接与所选最后一场同口径的记录。');
      } else if (args.tool === 'matrix') {
        const metric: Metric = args.metric === 'difficulty' ? 'difficulty' : args.metric === 'class' ? 'classRank' :
          args.metric === 'score' ? 'score' : args.metric === 'rank' ? 'rank' : 'rate';
        const estimates = metric === 'difficulty' && key.startsWith('s:') ? worth.cells(exams,[key.slice(2)],true) : {};
        const matrixRows = matching().slice(-maxExams);
        const points = matrixRows.map(row=>{
          const actual = measure(row.exam,key,modules);
          const cls = otherRanks(row.exam,key,modules).class;
          const value = metric === 'difficulty' ? estimates[(row.id-1) + '|' + key.slice(2)]?.index :
            metric === 'classRank' ? position(cls) : metric === 'score' ? actual.score : metric === 'rank' ? position(actual) : rate(actual);
          return point(row.axis, value);
        });
        const valid = points.filter(p=>p.value !== null);
        if (!valid.length) continue;
        const latest = valid.at(-1)!;
        const current = metric === 'difficulty' ? latest.value + ' / 100' : metric === 'score' ? latest.value + ' 分' : latest.value + '%';
        add(label + '矩阵',valid.length + ' / ' + matrixRows.length + ' 场有记录 · 最近 ' + current,latest.label + ' · ' + latest.detail);
        addSeries(label,metric,points);
      } else if (args.tool === 'profile' && rows.length) {
        const last = rows.at(-1)!;
        const comparable = rows.filter(row=>sameScope(last,row));
        const group = extraRanks[0];
        const progress = comparable.map(row=>{
          const ranked = group ? otherRanks(row.exam,key,modules)[group] : row.actual;
          return {row,pct:ranked ? position(ranked) : null,people:ranked?.people};
        }).filter((r): r is {row:Row;pct:number;people:number}=>r.pct !== null);
        const scores = comparable.map(row=>({row,rate:rate(row.actual)}))
          .filter((r): r is {row:Row;rate:number}=>r.rate !== null);
        add(label + '记录覆盖', comparable.length + ' 场同口径考试 · ' + scores.length + ' 场有得分率 · ' + progress.length + ' 场有' + (group ? rankNames[group] : '年级') + '位置',
          source(comparable[0].exam) + ' → ' + source(last.exam));
        if (scores.length) {
          const best = scores.reduce((best,x)=>x.rate > best.rate ? x : best);
          add(label + '最佳得分率', round(best.rate) + '% · ' + fmtMark(best.row.actual.score,best.row.actual.max),source(best.row.exam));
        }
        if (progress.length) {
          const best = progress.reduce((best,x)=>x.pct < best.pct ? x : best);
          const latest = progress.at(-1)!;
          add(label + '最佳位置', '前 ' + round(best.pct) + '% · 最近前 ' + round(latest.pct) + '%',source(best.row.exam) + ' · 最近 ' + source(latest.row.exam));
          const limits = [[10,'前 10% 内'],[20,'前 10%～20%'],[30,'前 20%～30%'],[50,'前 30%～50%'],[100,'50% 之后']] as const;
          if (args.mode === 'distribution') {
            const bands = limits.map(([high,name],i)=>point({key:String(high),label:name},
              progress.filter(r=>r.pct <= high && (i === 0 || r.pct > limits[i-1][0])).length));
            add(label + '排名分布', bands.map(b=>b.label + ' ' + b.value + ' 场').join(' · '), progress.length + ' 场有参考位置');
            addSeries(label,'count',bands,'bands');
          }
        }
        const changes = progress.slice(1).map((x,i)=>round(progress[i].pct-x.pct));
        if (changes.length >= 2) {
          const recent = changes.slice(-3);
          const speed = round(median(recent));
          add(label + '进步速度', recent.length < 3 || Math.abs(speed) < 1 ? '近期整体平稳 · 单场变化中位 ' + signed(speed) + ' 个百分点' :
            '每场约' + changeName(speed), '最近 ' + (recent.length + 1) + ' 次有效位置 · 趋势与进步');
          if (changes.length >= 3) {
            const middle = median(changes), sigma = round(1.4826*median(changes.map(x=>Math.abs(x-middle))));
            add(label + '稳定性', (sigma < 1.5 ? '较稳' : sigma < 3 ? '有起伏' : '起伏明显') + ' · 场间波动 ' + sigma + ' 个百分点',
              '趋势与进步 · ' + changes.length + ' 组相邻差');
          }
        } else if (scores.length >= 3) {
          const recent = scores.slice(-5);
          const speed = median(recent.slice(1).map((x,i)=>x.rate-recent[i].rate));
          add(label + '得分率速度', signed(speed) + ' 个百分点/场', '最近 ' + recent.length + ' 场有效得分率');
        }
      } else if (args.tool === 'goals') {
        for (const { exam, actual } of rows.slice(-8)) {
          const goal = goals.goalFor(exam, key, modules, true);
          for (const kind of ['score', 'rank']) {
            const result = goals.evaluate(goal, actual, kind);
            if (!result) continue;
            const rankPercent = kind === 'rank' && goal.rankType === 'percent';
            const unit = rankPercent || (kind === 'score' && actual.max !== goal.max) ? ' 个百分点' : kind === 'score' ? ' 分' : ' 名';
            const value = kind === 'score' ? goal.score + '/' + goal.max + ' 分' : rankPercent ? '前 ' + goal.rank + '%' : '第 ' + goal.rank + ' 名';
            add(label + (kind === 'score' ? '分数目标' : '年级排名目标'), '目标 ' + value + ' · ' + (result.met ? '达标' : '差 ' + round(-result.gap) + unit), source(exam));
          }
        }
        if (args.calibrate === true) {
          for (const kind of ['score','rank']) {
            const items = scopeRows(key).filter(row=>inCategory(row) && (!ids.size || row.id <= Math.max(...ids))).map(row=>{
              const original = goals.goalFor(row.exam,key,modules,true), current = goals.goalFor(row.exam,key,modules,false);
              const old = goals.num(original?.[kind]) !== null;
              return {exam:row.exam,actual:row.actual,goal:old ? original : current,origin:!old && current ? 'retro' : row.exam.exam_goals?.origin || 'legacy'};
            });
            const r = goals.calibrate(items,kind);
            if (!r) continue;
            const suggested = r.suggestion == null || ['暂不调整','待补录'].includes(r.decision) ? '' :
              kind === 'score' ? fmtMark(r.suggestion,r.max) : r.unit === 'percent' ? '前 ' + r.suggestion + '%' : '第 ' + r.suggestion + ' 名';
            add(label + (kind === 'score' ? '分数' : '排名') + '目标校准',
              [r.streak ? '连续 ' + r.streak + ' 场' + (r.met ? '达标' : '未达标') : '',r.decision,suggested ? '建议 ' + suggested : '',r.reason].filter(Boolean).join(' · '),
              '目标校准 · ' + r.eligible + ' 场可比较的目标与结果');
          }
        }
      } else if (args.tool === 'difficulty') {
        if (!key.startsWith('s:')) continue;
        const name = key.slice(2);
        const estimates = worth.cells(exams, [name], true);
        const usable = rows.filter(row => estimates[(row.id - 1) + '|' + name]);
        for (const row of (usable.length <= 10 ? usable : usable.slice(-5))) {
          const estimate = estimates[(row.id - 1) + '|' + name];
          add(label + '难度参考', round(estimate.index) + ' / 100' + (estimate.limited ? ' · 粗略参考' : ''),
            source(row.exam) + ' · 成绩含金量 · 历史 ' + estimate.n + ' 场');
        }
        addSeries(label, 'difficulty', rows.map(row => point(row.axis, estimates[(row.id - 1) + '|' + name]?.index)));
        if (usable.length && (args.worth === true || Number.isInteger(args.reference))) {
          const explicit = exams[args.reference - 1] != null;
          for (const row of usable.slice(-3)) {
            const estimate = worth.compare(exams, name, row.id - 1, explicit ? { mode: 'exam', exam: args.reference - 1 } : { mode: 'history' });
            if (!['estimate', 'identity'].includes(estimate.kind)) continue;
            add(label + '参考分', round(estimate.value) + '/' + estimate.targetMax + ' 分 · 参照 ' + estimate.referenceLabel +
              (estimate.quality === 'limited' ? ' · 粗略参考' : ''), source(row.exam) + ' · 成绩含金量');
          }
        }
        if (!usable.length) notes.push(label + '没有足够的同科得分、日期和年级位置记录来估计难度。');
      } else if (args.tool === 'forecast') {
        const available = scopeRows(key).filter(row => inCategory(row) && (!ids.size || row.id <= Math.max(...ids)));
        const latest = available.filter(observed).at(-1);
        const eligible = latest ? available.filter(row => sameScope(row, latest) &&
          Number.isInteger(row.actual.rank) && Number.isInteger(row.actual.people) &&
          row.actual.rank >= 1 && row.actual.rank <= row.actual.people) : [];
        if (eligible.length < 2) { notes.push(label + '需要至少 2 场含年级名次和参考人数的同口径考试。'); continue; }
        const report = pal.pipeline.analyzeSeries(eligible.map(row => ({
          rank: row.actual.rank, N: row.actual.people, score: row.actual.score ?? undefined, max: row.actual.max ?? undefined,
          date: row.exam.exam_date, label: row.axis.label,
        })), pal.productionOptions);
        if (!report.nextExam) continue;
        const value = round(report.ewmaForecast?.valid ? report.ewmaForecast.percentile : report.nextExam.medianPercentile);
        const [low, high] = report.nextExam.ci95Percentile.map(round);
        add(label + '下一场参考位置', '前 ' + value + '%', '学习状态预测 · ' + eligible.length + ' 场 · 截至 ' + source(eligible.at(-1)!.exam));
        add(label + '可能波动范围', '前 ' + low + '% ～ 前 ' + high + '%', '学习状态预测 · 同口径排名 · 状态模型');
        const points = eligible.slice(-10).map(row => point(row.axis, 100 * row.actual.rank / row.actual.people));
        points.push({ key: 'next:rank', label: '下次参考', detail: '学习状态预测', value, low, high, forecast: true });
        addSeries(label, 'rank', points);
      } else if (args.tool === 'trajectory') {
        if (trajectoryUsed || !loadTrajectory) continue;
        const subjects = key === 'total' ? null : key.startsWith('s:') ? [key.slice(2)] : groups.find(group => group.key === key)?.subjects;
        if (subjects !== null && (!Array.isArray(subjects) || subjects.length === 0 || subjects.length > 20)) continue;
        trajectoryUsed = true;
        const metric = args.metric === 'year' ? 'year' : 'score';
        const matched = await loadTrajectory(subjects, metric, category).catch(() => null);
        const own = matched?.history;
        const estimate = matched?.enabled && !matched.preliminary && own?.length >= 3 && matched.matches?.length ?
          trajectory.estimate(own, matched.matches, 'shape') : null;
        if (!estimate) { notes.push(label + '暂时没有可用的相似轨迹预测。'); continue; }
        const { center, low, high, count } = estimate;
        const prefix = metric === 'year' ? '前 ' : '';
        add(label + '相似轨迹预测', prefix + round(center) + '% · 参考范围 ' + prefix + round(low) + '% ～ ' + prefix + round(high) + '%',
          '相似轨迹 · ' + count + ' 条匿名参考 · 默认匹配设置');
        const points: Point[] = own.slice(-10).map((n: number, index: number, values: number[]) => {
          const offset = own.length - values.length + index;
          const date = matched.history_dates?.[offset];
          const exam = exams.filter(e => e.exam_date === date);
          return point({ key: 'trajectory:' + offset, label: exam.length === 1 ? examName(exam[0]) : date || '第 ' + (offset + 1) + ' 场', detail: date }, n);
        });
        points.push({ key: 'next:trajectory', label: '下次参考', detail: '相似轨迹 · ' + count + ' 条参考', value: round(center), low: round(low), high: round(high), forecast: true });
        addSeries(label, metric === 'year' ? 'rank' : 'rate', points);
      } else if (args.tool === 'benchmarks') {
        const gaps: Point[] = [];
        for (const { exam, actual, axis } of rows.slice(-12)) {
          const row = exam.averages?.[key];
          const names = key === 'total' ? Object.keys(exam.scores).filter(name => !exam.scores[name].excludeFromTotal && !modules.some(m=>m.name===name)) :
            key.startsWith('s:') ? [key.slice(2)] : groups.find(group => group.key === key)?.subjects || [];
          const basis = JSON.stringify(names.slice().sort().map((name: string) => [name, goals.num(exam.scores[name]?.max) || 100]));
          if (!row || row.basis !== basis || !finite(actual.score)) continue;
          const reference = [['year', '年级均分'], ['class', '班级均分'], ['yearMax', '年级最高分'], ['classMax', '班级最高分']];
          for (const [field, name] of reference) {
            const value = goals.num(row[field]);
            if (!finite(value)) continue;
            add(label + name, round(value) + ' 分 · 自己 ' + round(actual.score) + ' 分 · 相差 ' + signed(actual.score - value) + ' 分', source(exam));
            if (field === 'year') gaps.push(point(axis, actual.score - value));
          }
        }
        addSeries(label, 'averageGap', gaps);
      }
    }
    return {
      facts: [...found].map(id => ({ id, ...facts[id - 1] })),
      series: [...datasets].map(id => {
        const { label, metric, points, dimension } = series[id - 1];
        const sample = points.length > 24 ? [points[0], ...points.slice(-16)] : points;
        return { id, label, metric, dimension, count: points.length,
          values: sample.map(p => p.forecast ? [p.key, p.value, p.low, p.high] :
            dimension === 'exams' ? [p.key, p.value] : [p.label, p.value]) };
      }),
      notes,
    };
  }

  function chart(spec: any, question: string): Chart | null {
    const title = typeof spec?.title === 'string' ? spec.title.trim().slice(0, 44) : '';
    const requestedMatrix = /矩阵/.test(question);
    const requestedChart = /画(?:个|一张|成)?图|走势|趋势图|折线|柱状|图表|雷达/.test(question);
    const requestedTable = requestedMatrix || /对照表|列成(?:一张)?表|表格/.test(question) ||
      !requestedChart && /对照|逐场|每次.{0,6}(?:升降|变化)/.test(question);
    const comparison = requestedTable && /升降|变化/.test(question);
    const isRadar = /雷达/.test(question) || spec?.type === 'radar';
    let type: Chart['type'] = requestedTable ? 'table' : isRadar ? 'radar' :
      spec?.type === 'bar' ? 'bar' : spec?.type === 'table' ? 'table' : 'line';
    const selected = [...new Set(candidate(spec?.series).filter((id): id is number => Number.isInteger(id)))]
      .map(id => series[id - 1]).filter(Boolean).slice(0, type === 'table' ? 24 : type === 'radar' ? 10 : 4);
    let input = selected;
    if (!input.length && requestedMatrix) input = series.filter(s => s.dimension === 'exams').slice(0,24);
    if (!input.length && isRadar) input = series.filter(s => s.dimension === 'subjects').slice(0,10);
    if (!input.length && (requestedTable || requestedChart)) {
      const options = comparison ? ['scoreChange', 'rankChange', 'rateChange'] : ['rate', 'rank', 'classRank', 'cityRank', 'districtRank', 'difficulty', 'score', 'averageGap', 'lost', 'count'];
      input = options.flatMap(metric => series.filter(s => s.metric === metric)).slice(0, 4);
    }
    if (!input.length) return null;
    const axisKind = (p: Point) => p.key.includes(':') && /^\d+:\d+$/.test(p.key);
    const anchor = input[0], keys = new Set(anchor.points.map(p => p.key));
    input = input.filter(s => s === anchor || s.dimension === anchor.dimension &&
      s.points.some(p => keys.has(p.key)) && axisKind(s.points[0]) === axisKind(anchor.points[0]));
    if (type === 'radar' && (anchor.dimension !== 'subjects' || keys.size < 3)) type = 'bar';
    if (type === 'line' && anchor.dimension !== 'exams') type = 'bar';
    if (type === 'bar' && input.some(s => s.points.some(p => p.forecast))) type = 'line';
    if (!requestedTable && !requestedChart && !input.some(s => s.points.some(p => p.forecast)) &&
        new Set(input.flatMap(s => s.points.filter(p => p.value !== null).map(p => p.key))).size < 2) return null;
    return { type, title: title || (requestedMatrix ? '考试矩阵' : requestedTable ? '逐场对照' : isRadar ? '学科对照' : '成绩走势'), series: input };
  }

  return { catalog, query, facts, chart };
}
