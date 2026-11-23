// The model chooses the records. Scores, rank positions and gaps are calculated here.
import '../_shared/exam-goals.js';
const goals = (globalThis as any).ScoreExamGoals;
type Snapshot = { exams: any[], modules: any[] };
export type Evidence = { label: string, value: string, source: string, kind?: 'change' };
const round = (value:number) => Math.round(value * 100) / 100;
const signed = (value:number) => (value > 0 ? '+' : '') + round(value);
const present = (n:unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function studyTools({ exams, modules }: Snapshot) {
  const scopes = new Map<string,string>([['total','总分']]);
  for (const exam of exams) {
    for (const s of Object.keys(exam.scores)) scopes.set('s:'+s, s);
  }
  for (const m of modules) scopes.set('m:'+m.id, m.name);
  const catalog = {
    exams: exams.map((e,i) => ({id:i+1, name:e.name, date:e.exam_date, category:e.grade_level})),
    scopes: Object.fromEntries(scopes),
    groups: modules.map(m => ({name:m.name, subjects:m.subjects})),
  };
  const facts:Evidence[] = [];
  const refs = new Map<string,number>();
  function query(args:any) {
    const result = new Set<number>();
    const add = (label:string, value:string, source:string, kind?:'change') => {
      const fact = {label,value,source,kind}, key = JSON.stringify(fact);
      if (!refs.has(key)) refs.set(key,facts.push(fact));
      result.add(refs.get(key)!);
    };
    if (!Array.isArray(args?.exams) || !Array.isArray(args?.scopes)) return [];
    const ids:number[] = [...new Set<number>(args.exams.filter((i:number)=>Number.isInteger(i) && exams[i-1]))].sort((a,b)=>a-b).slice(-8);
    const keys:string[] = [...new Set<string>(args.scopes.filter((k:string)=>scopes.has(k)))].slice(0,12);
    for (const key of keys) {
      const label = scopes.get(key)!;
      let prev:any;
      for (const id of ids) {
        const exam = exams[id-1], r = goals.measured(exam,key,modules);
        const source = [exam.name,exam.exam_date].filter(Boolean).join(' · ');
        const pct = goals.rankValue(r,'percent');
        if (args.tool === 'goals') {
          const goal = goals.goalFor(exam,key,modules,true);
          for (const kind of ['score','rank']) {
            const v = goals.evaluate(goal,r,kind);
            if (!v) continue;
            const percentGoal = kind==='rank' && goal.rankType==='percent';
            const mixed = kind==='score' && r.max!==goal.max;
            const actual = kind==='score' ? r.score : goals.rankValue(r,goal.rankType);
            const target = kind==='score' ? goal.score : goal.rank;
            const format = (x:number,max:number) => kind==='score' ? round(x)+'/'+max+' 分' : percentGoal ? '前'+round(x)+'%' : '第'+x+'名';
            const unit = mixed || percentGoal ? ' 个百分点' : kind==='score' ? ' 分' : ' 名';
            add(label+' · '+(kind==='score'?'分数目标':'年级排名目标'),format(actual,r.max)+'，目标 '+format(target,goal.max)+'，'+(v.met?'达标':'差 '+round(-v.gap)+unit),source);
          }
        } else if (args.tool === 'results') {
          const parts = [];
          if (present(r.score)) parts.push(r.max!=null ? round(r.score)+'/'+r.max+' 分' : round(r.score)+' 分');
          if (r.max>0 && present(r.score)) parts.push('得分率 '+round(r.score/r.max*100)+'%');
          if (present(r.rank)) parts.push('年级第 '+r.rank+' 名'+(r.people?' / '+r.people+' 人':''));
          if (present(pct)) parts.push('年级前 '+round(pct)+'%');
          if (parts.length) add(label,parts.join(' · '),source);
          if (prev && r.scope && prev.r.scope===r.scope) {
            const between=prev.source+' → '+source;
            if (present(r.score) && present(prev.r.score) && r.max>0 && prev.r.max>0) {
              if (prev.r.max===r.max) add(label+'分差',signed(r.score-prev.r.score)+' 分',between,'change');
              add(label+'得分率变化',signed((r.score/r.max-prev.r.score/prev.r.max)*100)+' 个百分点',between,'change');
            }
            const lastPct=goals.rankValue(prev.r,'percent');
            if (present(pct) && present(lastPct)) {
              const delta=round(lastPct-pct);
              const direction=delta===0 ? '持平' : (delta>0?'前进 ':'后退 ')+Math.abs(delta)+' 个百分点';
              add(label+'年级位置',direction,between,'change');
            }
          }
        }
        prev = {r,source};
      }
    }
    return [...result].map(id=>({id,...facts[id-1]}));
  }
  return {catalog,query,facts};
}
