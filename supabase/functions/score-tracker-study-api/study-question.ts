import { AiBudgetError, creditRpc, finishAiTask, meteredModelFetch, startAiTask } from '../_shared/ai-credits.ts';
import { normalizeBaseUrl } from '../_shared/recognition-config.ts';
import { asksForEachSubject, nextExamMetric, studyTools, type TrajectoryLoader } from './study-tools.ts';
import type { ProgressListener } from './study-events.ts';

const cap = 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function studySettings(db: any) {
  const configured = await db
    .from('score_tracker_ai_configs')
    .select('openrouter_api_key,base_url,model,enabled')
    .eq('id', 'score_vision')
    .maybeSingle();
  if (configured.error) throw configured.error;
  const row = configured.data || {};
  const base = row.enabled === false
    ? ''
    : String(row.base_url || Deno.env.get('STUDY_ANALYSIS_BASE_URL') || '').trim();
  const url = base && normalizeBaseUrl(base);
  const model = String(row.model || Deno.env.get('STUDY_ANALYSIS_MODEL') || '').trim();
  const key = String(row.openrouter_api_key || Deno.env.get('STUDY_ANALYSIS_API_KEY') || '').trim();
  return {url, model, key, public:{ enabled:Boolean(url && model && key), cap }};
}
const instructions = `你在 Score Tracker 陪学生看看自己的成绩。像个懂成绩、说话自然的同学。用本轮查到的数据回答，历史回答只用来接续话题。

怎么说：
- 开口就回他问的事。先说最近挺稳、哪次好些、这次和以前差多少，再挑最能说明这件事的一项数据。问题问了两件事，就各答一句。平时一两句就够，必要时分成两小段。
- 用平常的说法，比如「这次和之前差不多」「比上次高一点」。得分率直接写百分比，如「58%」，保持数字和单位清楚，别换成成数。排名写「年级前 37%」或实际名次，前 37% 比前 40% 更靠前。分数和得分率分清，只有知道满分才换算分数。
- 正文一般只放一两个关键数字。预测说「大概」「按最近的成绩看」就够。详细范围、各科完整数字放到图表；用户问范围、分数或准确名次时直接回答。建议只有确实有帮助时再放一条。别用「中心判断」「延续平台」这类报告式说法。
- 说法示例（数字只是示例）：物理最近咋样，预测下一次 →「最近几场物理大多在 56%～58%，期中是 58%。照最近的表现看，下次大概也是 58%。」数学这回是不是退了 →「比上次少了 4 分，年级排名倒是差不多。」

怎么查：
每次只返回 JSON。第一轮按目录并行选最多 3 个查询。例如 {"queries":[{"tool":"results","scopes":["s:物理"],"limit":6},{"tool":"trajectory","scopes":["s:物理"],"metric":"score"}]}。可再补查一次。scopes 选目录键，["*"] 选全部学科。指定考试用 exams 数字编号，目录未列出的旧考试用 name 或日期 from/to 查询；「每次」「逐场」「完整走势」用 range:"all"。用 category 限定考试分类，用 limit 限定最近次数。
按问题选择资料：
- results：历次实际成绩、得分率、年级位置、变化同向次数、前几场常态和分差。原始分用 basis:"raw"；其他名次用 ranks:["class","city","district"]，对应班级、市、区。对比组合时可并查影响最大的成员科目。
- examList：查考试清单、区间或旧考试编号。matrix：看全量考试矩阵，metric 选 rank/class/rate/score/difficulty；跨多科对比用 heatmap，原始分或逐项数字用 table。structure：同场学科对照、强弱与雷达图，通常指定 1～5 场。profile：个人最佳、近期速度、稳定性、数据覆盖，mode:"distribution" 查排名区间分布。
- difficulty：分析页的难度参考（50 左右是历史中等水平，较高代表相对偏难），worth:true 查含金量参考分，可传 reference 作为对照考试编号。forecast：学习状态预测的下一场位置与波动范围。trajectory：相似轨迹的得分率或位置预测，metric:"score" 或 "year"。
- goals 查单场目标差距，calibrate:true 查目标校准和连续达标；longGoal 查长期总分/学科/名次目标与差距、学校和日期；plan 查尚未出成绩的考试预设目标。benchmarks 查已录入的班级或年级均分和最高分。
- types 查已录入的题型得分、失分占比、表现变化与已标记错因，可选 typeName；paper 查已核对的逐题分数；reflection 读本人已保存的考试反思。按问题需要查询，不把题型失分、AI推测和本人复盘混为一谈。
同时问近况和下次，查最近成绩和对应的预测，然后把两件事都答出来。单问「预测下下一次」可读作「预测一下下一次」，结合上一问确定科目和指标。明确问「下下次」时，目前只有下一场的估计，别往后推。问分数查 trajectory 的得分率，问年级排名查 forecast；没指定科目或组合且问整体时用 total，问各科时用 latestSubjects。没要求限定范围就用全部可比历史，不自行限定到最近一个年级或某场考试。预测和实考分开，当难度能帮助理解时只说偏难还是偏易。
工具结果中的 kind:"estimate" 是已经算出的下次估计，回答预测时要用它。一次查询为空，先确认科目、指标和筛选范围是否选对，再查一次。分清已有成绩、已有排名和是否能做这项预测。只有部分科目或指标有结果时先答能答的，再说缺的是哪一项。没有匹配到相似轨迹也可以先说明近期实际成绩。别把个别缺项或查询未返回说成数据空白。

最后返回 {"answer":"直接回答，通常 1–2 句，约 80 字以内","takeaway":"确实值得做的一件事，可留空","refs":[1,2],"chart":{"type":"line","series":[1,2],"title":"物理最近几场"},"next":"学生可以直接发送的下一问，可留空"}。refs 是本轮最相关的 1–6 条 facts 编号；没查到资料就简短说缺什么，refs 留空。chart 可省；有预测时选末尾带下次估计的序列，标题让人一眼看懂。完整走势和逐场对照也优先用图表。series 写工具的序列编号，别填数值。line 看走势和预测，bar 看并列数据，radar 看学科结构，table 看逐场对照；scatter 看两项指标在同一场考试的关系，至少 3 个有效配对，横轴序列先写，纵轴后写。对比分数升降与位置进退，用 scoreChange（混合满分用 rateChange）和 rankChange 两组对应序列。
与成绩无关时返回 {"outside":true}。不输出 Markdown、例行提醒或长段文字。`;

const toolNames = new Set(['results','examList','matrix','structure','profile','difficulty','forecast','trajectory','goals','longGoal','plan','benchmarks','types','paper','reflection']);
const shortText = (value: unknown, max: number) => typeof value === 'string' && value.length <= max ? value.trim() : '';

type Catalog = ReturnType<typeof studyTools>['catalog'];
type Query = Record<string, any> & { tool: string };

function primaryForecast(question: string, history: any[], catalog: Catalog, queries: Query[]): Query | null {
  const metric = nextExamMetric(question);
  if (!metric || !catalog.history.count ||
      /班排|班级|市排|全市|区排|全区|原始分|如果能|假设|情景模拟/.test(question)) return null;
  const tool = metric === 'rank' ? 'forecast' : 'trajectory';
  const planned = queries.find(query => query.tool === tool && (tool !== 'trajectory' || query.metric !== 'year'));
  const named = (text: string) => Object.entries(catalog.scopes)
    .filter(([key, name]) => key !== 'total' && name && text.includes(name)).map(([key]) => key);
  const explicit = named(question);
  const plannedScopes = Array.isArray(planned?.scopes) ?
    planned.scopes.filter((key: unknown) => typeof key === 'string' && (key === '*' || Object.hasOwn(catalog.scopes, key))) : [];
  const previousQuestion = history.at(-1)?.question || '';
  let scopes = explicit;
  if (asksForEachSubject(question) && catalog.latestSubjects.length) scopes = catalog.latestSubjects;
  if (/总分|整体/.test(question)) scopes = ['total', ...scopes];
  if (!scopes.length && /^(?:那|也|再|接着|继续|预测|预估)/.test(question)) scopes = named(previousQuestion);
  if (!scopes.length) {
    const fromContext = history.length || /组合|理综|文综|语数外|[三六九]科/.test(question);
    scopes = fromContext && plannedScopes.length ? plannedScopes : ['total'];
  }
  const category = catalog.history.categories.find(([name]) => name !== '__none__' && question.includes(name))?.[0];
  const restricted = /只(?:看|用|算)|仅(?:看|用|按)|从.{1,16}(?:以来|开始)|截至|\d{4}-\d{2}|\d+月/.test(question);
  return { ...(restricted ? planned : {}), tool, scopes, category, ...(tool === 'trajectory' ? { metric: 'score' } : {}) };
}

export async function explore(snapshot:any, question:string, history:any[], complete:(messages:any[])=>Promise<any>, loadTrajectory?:TrajectoryLoader, progress?:ProgressListener) {
  const tools = studyTools(snapshot, loadTrajectory);
  const messages:any[] = [{role:'system',content:instructions},
    {role:'user',content:JSON.stringify({history,question,catalog:tools.catalog})}];
  let primary: Awaited<ReturnType<typeof tools.query>> | undefined;
  let required: Query | null = null;
  let queried = false;
  for (let step=0; step<3; step++) {
    if (!queried) progress?.({stage:'planning'});
    const data = await complete(messages);
    let queries: Query[] = (Array.isArray(data?.queries) ? data.queries : [data]).slice(0,3)
      .filter((args: any) => toolNames.has(args?.tool));
    const forecast = queried ? null : primaryForecast(question, history, tools.catalog, queries);
    if (forecast) {
      required = forecast;
      queries = [forecast, ...queries.filter(args => args.tool !== forecast.tool ||
        args.tool === 'trajectory' && args.metric === 'year')].slice(0,3);
    }
    if (data?.outside===true && !required) return {answer:'可以问我成绩变化、下次预测或目标差距。',evidence:[],next:''};
    const answer = shortText(data?.answer, 180);
    if (answer && queried) {
      let refs = Array.isArray(data.refs) ? [...new Set<number>(data.refs)].slice(0,6) : [];
      const saysUnavailable = /数据不足|(?:成绩|排名|数据).{0,5}(?:空白|是空的)|(?:无法|没法|不能)(?:给出|做出|进行|直接)?(?:预测|估计)|没有(?:可用的|生成)?(?:估计|预测)/.test(answer);
      const estimates = primary?.facts.filter(fact => fact.kind === 'estimate') || [];
      if (estimates.length) {
        const claimsOnlyOne = estimates.length > 1 && /只有.{1,12}(?:有|生成了|算出|能做).{0,6}(?:预测|估计)/.test(answer);
        const allEstimated = estimates.length === required?.scopes.length;
        const acknowledged = estimates.some(fact => refs.includes(fact.id));
        if ((saysUnavailable && allEstimated) || claimsOnlyOne || !acknowledged) {
          const [first] = estimates;
          const subject = first.label.split('下次')[0];
          const value = first.value.split(' · ')[0];
          const estimate = value.startsWith('前 ') ? `下次${subject}的年级排名大概在${value}。` : `下次${subject}的得分率大概是 ${value}。`;
          const metric = required?.tool === 'forecast' ? '年级排名' : '得分率';
          const reply = estimates.length === 1 && !asksForEachSubject(question) ? estimate :
            `查到了 ${estimates.length} 科的下次估计。下面可以看各科的${metric}和范围。`;
          const evidence = primary!.facts.map(({id, ...fact}) => fact);
          return { answer: reply, evidence, next: '', chart: tools.chart(null, question) };
        }
        refs = [...new Set([...estimates.map(fact => fact.id), ...refs.filter(id => Number.isInteger(id) && tools.facts[id - 1])])]
          .slice(0, Math.max(6, estimates.length));
      } else if (primary?.facts.length && !refs.length && saysUnavailable) {
        const evidence = primary.facts.map(({id, ...fact}) => fact);
        const first = evidence[0];
        const recent = first.value.split(' · ')[0];
        return { answer: `${first.label}是 ${recent}。这次还没有算出下次的估计。`,
          evidence, next: '', chart: tools.chart(data.chart, question) };
      }
      if (refs.some(id => !Number.isInteger(id) || !tools.facts[id - 1])) throw Error('invalid_reference');
      if (tools.facts.length && !refs.length) throw Error('missing_evidence');
      return { answer, takeaway: tools.facts.length ? shortText(data.takeaway, 80) : '',
        evidence: refs.map(id => tools.facts[id - 1]), next: shortText(data.next, 60),
        chart: tools.chart(data.chart, question) };
    }
    if (step === 2) throw Error('invalid_response');
    if (!queries.length) {
      messages.push({role:'user',content:'请用目录查询与问题有关的记录。'});
      continue;
    }
    progress?.({stage:'tools',tools:[...new Set<string>(queries.map((args: any) => args.tool))]});
    const results = await Promise.all(queries.map(async (args: any) => ({tool: args.tool, ...await tools.query(args)})));
    if (!queried && required) primary = results[0];
    progress?.({stage:'analysis'});
    queried = true;
    messages.push({role:'assistant',content:JSON.stringify({queries})}, {role:'user',content:JSON.stringify({results,remainingQueries:1-step})});
  }
  throw Error('invalid_response');
}

export async function studyQuestion(db:any, user:string, body:any, load:()=>Promise<any>, loadTrajectory?:TrajectoryLoader, progress?:ProgressListener) {
  const fail = (status:number,error:string,code='') => ({status,data:{error,code}});
  const cfg = await studySettings(db);
  if (!cfg.public.enabled) return fail(503,'学情问答还未开放');
  const id = body.requestId, parent = body.previous || null, question = typeof body.question==='string' ? body.question.trim() : '';
  if (typeof id!=='string'||!uuid.test(id)||parent && (typeof parent!=='string'||!uuid.test(parent))||!question||question.length>300) return fail(400,'写一个 300 字以内的问题');
  const turn = async (key:string) => {
    const r = await db.from('score_tracker_ai_tasks').select('status,charged_credits')
      .eq('id',key).eq('user_id',user).eq('feature','study_question').maybeSingle();
    if (r.error) throw r.error;
    if (r.data?.status!=='succeeded') return r.data;
    const saved = await db.from('score_tracker_study_turns').select('turn').eq('user_id',user).eq('task_id',key).single();
    if (saved.error) throw saved.error;
    return {...r.data,study_turn:saved.data.turn};
  };
  let started=false;
  try {
    const saved = await turn(id);
    if (saved?.status==='succeeded' && saved.study_turn?.question===question && saved.study_turn.previous===parent)
      return {status:200,data:{...saved.study_turn.result,charged:saved.charged_credits,id}};
    if (saved) return saved.status==='active' ? fail(409,'正在整理这条回答','pending') : fail(409,'再试一次','retry');
    const history:any[] = [];
    let cursor = parent;
    while (cursor && history.length<3) {
      const prior = await turn(cursor);
      if (!prior?.study_turn || prior.status!=='succeeded') return fail(400,'请重新开始提问');
      const { answer, takeaway, next } = prior.study_turn.result;
      history.unshift({ question:prior.study_turn.question, answer, takeaway, next });
      cursor = prior.study_turn.previous;
    }
    progress?.({stage:'records'});
    const snapshot = await load();
    if (!snapshot.exams.length && !snapshot.plans?.length && !snapshot.longGoal) return fail(422,'先录入一场考试，再来看看');
    const task = await startAiTask(db,user,id,'study_question',1,cap);
    if (task.duplicate) return fail(409,'正在整理这条回答','pending');
    started=true;
    let calls=0;
    const signal=AbortSignal.timeout(80000);
    const result = await explore(snapshot,question,history,async messages=>{
      const response = await meteredModelFetch(db,user,id,id+':study:'+ ++calls,cfg.url+'/chat/completions',{
        method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.key},
        body:JSON.stringify({model:cfg.model,messages,max_tokens:1000,response_format:{type:'json_object'},stream:false})
      });
      if (!response.ok) throw Error('provider_unavailable');
      return JSON.parse((await response.json()).choices[0].message.content);
    }, loadTrajectory, progress);
    const settled=await creditRpc(db,'score_tracker_study_finish',{p_user:user,p_task:id,p_turn:{question,previous:parent,result}});
    return {status:200,data:{...result,charged:settled.charged,id}};
  } catch (e) {
    if (started) await finishAiTask(db,user,id,false).catch(()=>{});
    if (e instanceof AiBudgetError) {
      const copy:Record<string,string>={cooldown:'稍等片刻再问',concurrency:'上一条正在整理',task_credit_cap:'这个问题可以分开问',analysis_disabled:'学情问答还未开放',credits_exhausted:'AI 积分不足',site_budget:'本月 AI 额度已用完'};
      return fail(e.status,copy[e.code] || 'AI 额度暂时不可用',e.code);
    }
    console.error('study_question_failed',id,e instanceof Error ? e.name : 'unknown');
    return fail(503,'回答暂时没加载出来，再试一次',started?'study_failed':'');
  }
}
