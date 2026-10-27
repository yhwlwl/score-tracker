/* Synthetic demo fixtures. Explicit, repeatable values; only the showcase account may be updated. */
const crypto=require('node:crypto'),Q=require('../supabase/functions/_shared/question-types.js');
const dates=['2026-09-01','2026-09-08','2026-09-12','2026-09-15','2026-09-22','2026-09-27','2026-10-01','2026-10-05','2026-10-10','2026-10-14','2026-10-18','2026-10-25'];
const uuid=key=>{const h=crypto.createHash('md5').update(key).digest('hex');return [h.slice(0,8),h.slice(8,12),'4'+h.slice(13,16),'8'+h.slice(17,20),h.slice(20)].join('-');};
const modules=[{id:'07548a5c-169e-4fe2-b3d5-cd4ce1a9acb8',name:'语数外',subjects:['语文','数学','英语']},{id:'c37e45e9-135e-4c59-86a8-42a3d7637f10',name:'科学',subjects:['物理','化学','生物']}];
const goal={subjects:{语文:120,数学:145,英语:125,物理:75,化学:85,生物:62},totalGoal:612,school:'理想大学（演示）',date:'2027-01-15',dateName:'期末目标（演示）'};
const names=['开学摸底','周练一','九月周测','九月阶段检测','九月月考','周练二','国庆联考','国庆返校检测','十月阶段检测','周练三','考前模拟','期中综合检测'];
const notes=['英语阅读能拿到大部分分，完形和语法仍不稳。物理选择题错了两题。','这次物理计算题难度上升，得分下降；英语听力受最后一段影响。','英语完形比上次少一分，阅读也有回落；数学最后一题多拿了步骤分。','卷子整体较容易，分数上涨，但年级排名没有相同幅度的变化。','英语阅读失分增多，物理实验数据处理还不稳定。','数学第 22 题发挥较好，英语语法又出现重复失分。','联考难度较大，原始总分下降；年级位次反而前移。','英语阅读有所恢复，物理基础选择题仍然反复。','语法填空这次较好，但阅读没有同步改善。','数学后两题不稳定；英语听力提高，语法又有回落。','英语阅读连续两次偏低；化学实验比前次失分少。','完形填空比开学更好，但中间有反复；物理基础题和英语阅读仍有持续失分。'];
const row=(name,values,max,difficulty,cause,position,i)=>{const score=Array.isArray(values)?values[i]:values;return {name,score,max,difficulty,...(score!==max&&cause?{cause:Array.isArray(cause)?cause[i]:cause}:{}),...(position?{position}:{})};};
const fixtures=dates.map((date,i)=>{
  const r=(n,s,m,d,c,p)=>row(n,s,m,d,c,p,i);
  const types={
    英语:[r('听力',[24,21,25.5,24,27,22.5,24,25.5,23,27,24,25.5],30,'easy','careless','第 1–20 题'),r('阅读理解',[28,25,27.5,30,26,28.5,25,29.5,27,25.5,24.5,26],37.5,'medium',['method','time','method','careless','method','time','method','careless','time','method','time','method'],'第 21–35 题'),r('七选五',[7.5,10,5,10,7.5,10,7.5,10,10,7.5,10,7.5],12.5,'medium','method','第 36–40 题'),r('完形填空',[6,8,7,9,6,10,9,11,8,11,10,12],15,'easy','knowledge','第 41–55 题'),r('语法填空',[8,7,10,8,11,9,10,8,12,9,10,8],15,'easy','careless','第 56–65 题'),r('应用文',[12,13,12,13,12,13,11,13,12,13,12,13],15,'medium','careless','写作第一节'),r('读后续写',[17,19,16,20,18,21,17,19,20,18,21,19],25,'hard','method','写作第二节')],
    数学:[r('单项选择题',[40,35,40,40,35,40,35,40,40,35,40,40],40,'easy','careless','第 1–8 题'),r('多项选择题',[16,18,16,18,14,18,16,18,16,18,16,18],18,'medium','careless','第 9–11 题'),r('填空题',[15,15,10,15,15,15,10,15,15,15,10,15],15,'medium','careless','第 12–14 题'),r('解答题',[10,10,10,9,10,10,10,10,10,10,10,10],10,'easy','careless','第 17 题'),r('解答题',[12,12,11,12,12,12,11,12,12,12,12,12],12,'medium','careless','第 18 题'),r('解答题',[12,11,12,12,11,12,10,12,12,11,12,12],12,i===10?'hard':'medium','method','第 19 题'),r('解答题',[14,15,13,15,14,15,12,14,15,13,15,14],15,'medium','careless','第 20 题'),r('解答题',[12,14,11,13,12,14,10,13,14,12,13,14],14,'hard','time','第 21 题'),r('解答题',[10,9,11,8,10,12,7,11,9,10,8,11],14,'hard','method','第 22 题')],
    语文:[r('现代文阅读',[25,23,26,27,24,26,22,27,25,26,24,27],35,'medium','method','阅读一'),r('文言文阅读',[14,16,13,16,15,14,12,16,15,14,16,15],20,'medium','knowledge','阅读二'),r('古诗词鉴赏',[4,6,3,7,4,6,3,5,6,4,5,4],9,'hard','method','阅读三'),r('名篇名句默写',[6,5,6,6,4,6,5,6,6,5,6,6],6,'easy','careless','第 16 题'),r('语言文字运用',[16,14,17,15,16,14,13,17,15,16,14,16],20,'easy','knowledge','第 17–21 题'),r('作文',[45,47,43,49,46,48,42,48,47,45,49,47],60,'hard','method','第 22 题')],
    物理:[r('单项选择题',[12,16,12,20,16,12,20,16,12,16,20,12],24,'easy','knowledge','第 1–6 题'),r('多项选择题',[10,12,10,12,8,14,10,12,10,12,10,12],16,'medium','careless','第 7–10 题'),r('实验题',[9,8,11,10,9,12,7,10,11,9,12,10],16,'easy','knowledge','第 11–12 题'),r('计算题',[13,11,14,15,12,14,10,14,13,12,15,13],20,'medium','method','第 14 题'),r('计算题',[10,8,12,13,9,14,6,12,10,8,13,11],24,'hard','time','第 15 题')],
    化学:[r('选择题',[33,36,30,39,33,36,27,36,33,39,36,33],42,'easy','knowledge','第 1–14 题'),r('实验题',[12,14,11,13,12,15,10,0,14,12,15,13],18,'medium','careless','第 15 题'),r('原理综合题',[12,10,13,14,11,15,9,13,12,14,11,13],20,'hard','method','第 16 题'),r('有机推断题',[13,15,12,14,13,16,10,15,14,12,16,14],20,'hard','time','第 17 题')],
    生物:[r('选择题',[32,34,30,36,32,34,28,34,32,36,34,32],40,'easy','careless','第 1–20 题'),r('非选择题',[38,35,40,42,37,41,33,40,39,36,42,38],60,'medium','method','第 21–25 题')]
  };
  const scores={},averages={};let totalRaw=0,totalActual=0;
  const yearRanks=[160,145,181,132,174,102,88,166,119,153,137,124];
  for(const [subject,rows] of Object.entries(types)){
    const clean=Q.clean(rows),sum=Q.sum(clean);Q.validate(clean,sum.max,sum.score);
    const index=Object.keys(scores).length,assigned=subject==='生物'?Math.round(sum.score*.7)+3:subject==='化学'?Math.min(100,sum.score+6+(i%3)):sum.score,max=subject==='生物'?70:sum.max;
    scores[subject]={actual:assigned,raw:sum.score,max,rawMax:sum.max,target:subject==='数学'?145:subject==='英语'?125:subject==='语文'?120:subject==='生物'?62:subject==='化学'?85:75,rank:Math.min(790,Math.max(6,yearRanks[i]+[0,-100,12,280,35,65][index])),participants:800+(i%3)*12,classRank:Math.min(48,Math.max(1,Math.round((yearRanks[i]+[0,-100,12,280,35,65][index])/17))),classParticipants:50};
    const basis=JSON.stringify([[subject,max]]),classRate=[.68,.73,.66,.76,.7,.74,.6,.72,.7,.69,.71,.7][i];
    averages['s:'+subject]={class:Math.round(max*classRate*10)/10,year:Math.round(max*(classRate-.035)*10)/10,basis};totalRaw+=sum.score;totalActual+=assigned;
  }
  // Incomplete breakdowns are genuine unknowns; raw subject totals remain known.
  if(i===3)types.生物[1].score=null;
  if(i===8)types.语文=types.语文.filter(r=>r.name!=='古诗词鉴赏');
  const basis=JSON.stringify(Object.entries(scores).map(([s,r])=>[s,r.max]).sort((a,b)=>a[0]<b[0]?-1:1));
  averages.total={class:Math.round(Object.values(averages).reduce((a,r)=>a+r.class,0)*10)/10,year:Math.round(Object.values(averages).reduce((a,r)=>a+r.year,0)*10)/10,basis};
  const moduleRanks={};for(const m of modules){const pairs=m.subjects.map(s=>[s,scores[s].max]).sort((a,b)=>a[0]<b[0]?-1:1);averages['m:'+m.id]={class:Math.round(m.subjects.reduce((n,s)=>n+averages['s:'+s].class,0)*10)/10,year:Math.round(m.subjects.reduce((n,s)=>n+averages['s:'+s].year,0)*10)/10,basis:JSON.stringify(pairs)};moduleRanks[m.id]={yearRank:Math.max(8,yearRanks[i]+(m.name==='科学'?65:-35)),yearParticipants:800+(i%3)*12,classRank:Math.max(1,Math.round(yearRanks[i]/19)),classParticipants:50};}
  return {id:uuid('showcase-question-types-v1:'+date),name:'【演示】'+names[i],exam_date:date,end_date:new Date(Date.parse(date)+86400000).toISOString().slice(0,10),grade_level:'题型演示',is_hidden:false,scores,question_type_scores:types,averages,moduleIds:modules.map(m=>m.id),moduleRanks,total_rank:yearRanks[i],total_participants:800+(i%3)*12,total_class_rank:Math.round(yearRanks[i]/19),total_class_participants:50,total_actual_score:totalActual,total_raw_score:totalRaw,cityRank:Math.round(yearRanks[i]*4.6),cityParticipants:4200,districtRank:Math.round(yearRanks[i]*1.8),districtParticipants:1600,reflection:'【合成演示数据】'+notes[i]+(i===7?' 化学实验最后一题未完成，本次记 0 分。':'')};
});
// Differing maxima, direct percentiles, hidden records and partial entry live outside the comparable full-paper series.
const specials=[
  {date:'2026-09-29',name:'英语百分制小测',subject:'英语',rows:[{name:'阅读理解',position:'阅读部分',score:31,max:40,difficulty:'medium',cause:'time'},{name:'语法填空',position:'语法部分',score:16,max:20,difficulty:'easy',cause:'careless'},{name:'写作',position:'写作部分',score:27,max:40,difficulty:'hard',cause:'method'}],actual:74,max:100,extra:{total_year_position_percent:18.6,total_class_position_percent:16}},
  {date:'2026-10-08',name:'物理半卷小测',subject:'物理',rows:[{name:'选择题',position:'第 1–5 题',score:12,max:20,difficulty:'easy',cause:'knowledge'},{name:'实验题',position:'第 6 题',score:null,max:10,difficulty:'medium'},{name:'计算题',position:'第 7 题',score:9,max:20,difficulty:'hard',cause:'time'}],actual:28,max:50},
  {date:'2026-10-20',name:'数学压轴专项（隐藏）',subject:'数学',rows:[{name:'解答题',position:'压轴第一问',score:5,max:5,difficulty:'medium'},{name:'解答题',position:'压轴第二问',score:0,max:5,difficulty:'hard',cause:'time'},{name:'解答题',position:'压轴第三问',score:2,max:5,difficulty:'hard',cause:'method'}],actual:7,max:15,extra:{is_hidden:true}},
  {date:'2026-10-23',name:'英语周练（待补录）',subject:'英语',rows:[{name:'阅读理解',position:'阅读部分',score:28,max:40,difficulty:'medium',cause:'method'},{name:'语法填空',position:'语法部分',score:null,max:15,difficulty:'easy'},{name:'完形填空',position:'完形部分',score:10,max:15,difficulty:'easy',cause:'knowledge'}],actual:103,max:150}
];
for(const s of specials)fixtures.push({id:uuid('showcase-question-types-special-v2:'+s.date),name:'【演示】'+s.name,exam_date:s.date,grade_level:'专项小测',scores:{[s.subject]:{actual:s.actual,raw:s.actual,max:s.max,rawMax:s.max,target:Math.round(s.max*.85),...(s.extra?.total_year_position_percent?{yearPositionPercent:s.extra.total_year_position_percent,classPositionPercent:s.extra.total_class_position_percent}:{rank:25,participants:80,classRank:12,classParticipants:50})}},question_type_scores:{[s.subject]:s.rows},averages:{['s:'+s.subject]:{class:Math.round(s.max*.68),year:Math.round(s.max*.65),basis:JSON.stringify([[s.subject,s.max]])}},reflection:'【合成演示数据】专项样例，用于展示'+s.name+'。',is_hidden:false,...s.extra});
fixtures.sort((a,b)=>a.exam_date.localeCompare(b.exam_date));
function sql(){
  const payload=JSON.stringify(fixtures).replace(/'/g,"''");
  const examColumns={name:'text',exam_date:'date',end_date:'date',grade_level:'text',is_hidden:'boolean',total_rank:'integer',total_participants:'integer',total_class_rank:'integer',total_class_participants:'integer',total_actual_score:'numeric',total_raw_score:'numeric',total_year_position_percent:'numeric',total_class_position_percent:'numeric',city_rank:'integer',city_participants:'integer',district_rank:'integer',district_participants:'integer'};
  const field=(k,t)=>`(p.e->>'${({city_rank:'cityRank',city_participants:'cityParticipants',district_rank:'districtRank',district_participants:'districtParticipants'})[k]||k}')::${t}`;
  const scoreColumns={target_score:'target',actual_score:'actual',max_score:'max',raw_score:'raw',raw_max_score:'rawMax',rank_position:'rank',participant_count:'participants',class_rank_position:'classRank',class_participant_count:'classParticipants',year_position_percent:'yearPositionPercent',class_position_percent:'classPositionPercent'};
  return `BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM public.score_tracker_users WHERE username='showcase') <> 1 THEN RAISE EXCEPTION 'Expected exactly one showcase account'; END IF; END $$;
CREATE TEMP TABLE demo_payload ON COMMIT DROP AS SELECT value AS e FROM jsonb_array_elements('${payload}'::jsonb);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.score_tracker_exams x JOIN demo_payload p ON x.id=(p.e->>'id')::uuid WHERE x.user_id<>(SELECT id FROM public.score_tracker_users WHERE username='showcase') OR x.grade_level NOT IN ('题型演示','专项小测') OR x.name NOT LIKE '【演示】%') THEN RAISE EXCEPTION 'Refusing to overwrite a non-demo exam'; END IF; END $$;
INSERT INTO public.score_tracker_exams(id,user_id,${Object.keys(examColumns).join(',')},question_type_scores,averages,reflection,reflection_revision,reflection_updated_at)
SELECT (p.e->>'id')::uuid,t.id,${Object.entries(examColumns).map(([k,v])=>field(k,v)).join(',')},p.e->'question_type_scores',p.e->'averages',p.e->>'reflection',1,now() FROM demo_payload p CROSS JOIN public.score_tracker_users t WHERE t.username='showcase'
ON CONFLICT(id) DO UPDATE SET ${Object.keys(examColumns).map(k=>`${k}=EXCLUDED.${k}`).join(',')},question_type_scores=EXCLUDED.question_type_scores,averages=EXCLUDED.averages,reflection=EXCLUDED.reflection,reflection_revision=score_tracker_exams.reflection_revision+1,reflection_updated_at=now(),updated_at=now();
UPDATE public.score_tracker_scores x SET ${Object.entries(scoreColumns).map(([k,v])=>`${k}=(s.value->>'${v}')::${k.includes('rank')||k.includes('count')?'integer':'numeric'}`).join(',')},updated_at=now()
FROM demo_payload p CROSS JOIN LATERAL jsonb_each(p.e->'scores') s WHERE x.exam_id=(p.e->>'id')::uuid AND x.subject=s.key AND x.user_id=(SELECT id FROM public.score_tracker_users WHERE username='showcase');
INSERT INTO public.score_tracker_scores(exam_id,user_id,subject,${Object.keys(scoreColumns).join(',')})
SELECT (p.e->>'id')::uuid,t.id,s.key,${Object.entries(scoreColumns).map(([k,v])=>`(s.value->>'${v}')::${k.includes('rank')||k.includes('count')?'integer':'numeric'}`).join(',')} FROM demo_payload p CROSS JOIN LATERAL jsonb_each(p.e->'scores') s CROSS JOIN public.score_tracker_users t WHERE t.username='showcase' AND NOT EXISTS(SELECT 1 FROM public.score_tracker_scores x WHERE x.exam_id=(p.e->>'id')::uuid AND x.subject=s.key);
INSERT INTO public.score_tracker_exam_modules(exam_id,user_id,module_id,sort_order,ranks)
SELECT (p.e->>'id')::uuid,t.id,m.id,row_number() OVER(PARTITION BY p.e->>'id' ORDER BY m.sort_order)::integer,p.e->'moduleRanks'->m.id::text FROM demo_payload p CROSS JOIN public.score_tracker_users t JOIN public.score_tracker_modules m ON m.user_id=t.id WHERE t.username='showcase' AND (p.e->'moduleIds') ? m.id::text
ON CONFLICT(exam_id,module_id) DO UPDATE SET ranks=EXCLUDED.ranks;
INSERT INTO public.score_tracker_user_goals(user_id,subject_goals,total_goal,dream_school,exam_date,date_name) SELECT id,'${JSON.stringify(goal.subjects)}'::jsonb,${goal.totalGoal},'${goal.school}','${goal.date}'::date,'${goal.dateName}' FROM public.score_tracker_users WHERE username='showcase' ON CONFLICT(user_id) DO UPDATE SET subject_goals=EXCLUDED.subject_goals,total_goal=EXCLUDED.total_goal,dream_school=EXCLUDED.dream_school,exam_date=EXCLUDED.exam_date,date_name=EXCLUDED.date_name,updated_at=now();
SELECT count(*) AS demo_exams FROM demo_payload;
COMMIT;`;
}
module.exports={fixtures,modules,goal,sql};
if(require.main===module)process.stdout.write(sql());
