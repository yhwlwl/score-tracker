/* Deterministic synthetic history. No credentials; writes require an explicit SQL call. */
const crypto=require('node:crypto'),Q=require('../supabase/functions/_shared/question-types.js');
const dates=['2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-10-01','2026-10-10','2026-10-18','2026-10-25'];
const pick=(a,i)=>a[i];
const fixtures=dates.map((date,i)=>{
  const row=(name,score,max,difficulty,cause,position)=>Object.fromEntries(Object.entries({name,score,max,difficulty,cause,position}).filter(([,v])=>v!==undefined));
  const types={
    英语:[row('听力',pick([16,17,20,22,23,25,25,27],i),30,'easy','careless'),row('阅读理解',pick([24,25,24.5,26,29,30.5,31,32],i),37.5,'medium','method'),row('七选五',pick([5,7.5,5,7.5,10,10,10,10],i),12.5,'medium'),row('完形填空',pick([5,6,7,8,9,11,12,13],i),15,'easy','knowledge'),row('语法填空',pick([6,6,7,8,10,11,12,12],i),15,'easy','careless'),row('应用文',pick([9,10,10,11,11,12,12,13],i),15,'medium','method'),row('读后续写',pick([16,15,17,18,19,20,21,22],i),25,'hard','method')],
    数学:[row('单项选择题',40,40,'easy'),row('多项选择题',pick([14,16,16,18,16,18,18,18],i),18,'medium','careless'),row('填空题',pick([10,15,15,15,15,15,15,15],i),15,'medium','careless'),row('解答题',10,10,'easy',undefined,'第 17 题'),row('解答题',12,12,'medium',undefined,'第 18 题'),row('解答题',12,12,'medium',undefined,'第 19 题'),row('解答题',pick([13,13,14,14,15,15,15,15],i),15,'medium','careless','第 20 题'),row('解答题',pick([11,12,12,13,13,14,14,14],i),14,'hard','time','第 21 题'),row('解答题',pick([9,9,10,9,10,10,11,12],i),14,'hard','method','第 22 题')],
    语文:[row('现代文阅读',pick([23,24,23,25,25,26,27,28],i),35,'medium','method'),row('文言文阅读',pick([13,13,14,14,15,16,16,17],i),20,'medium','knowledge'),row('古诗词鉴赏',pick([4,5,4,5,6,6,7,7],i),9,'hard','method'),row('名篇名句默写',pick([4,4,5,5,6,6,6,6],i),6,'easy','careless'),row('语言文字运用',pick([12,13,13,14,14,15,16,16],i),20,'easy','knowledge'),row('作文',pick([43,44,44,45,46,46,47,48],i),60,'hard','method')],
    物理:[row('单项选择题',pick([16,20,20,24,24,24,24,24],i),24,'easy','knowledge'),row('多项选择题',pick([10,10,12,12,14,14,16,16],i),16,'medium','careless'),row('实验题',pick([8,9,10,11,13,13,14,15],i),16,'easy','knowledge'),row('计算题',pick([12,13,13,14,15,16,16,17],i),20,'medium','method','第 14 题'),row('计算题',pick([8,9,9,10,10,11,12,13],i),24,'hard','method','第 15 题')],
    化学:[row('选择题',pick([30,33,33,36,36,39,39,42],i),42,'easy','knowledge'),row('实验题',pick([10,0,11,12,12,13,14,14],i),18,'medium','careless'),row('原理综合题',pick([9,10,10,11,12,13,13,14],i),20,'hard','method'),row('有机推断题',pick([11,12,12,13,14,14,15,16],i),20,'hard','time')],
    生物:[row('选择题',pick([30,32,34,34,36,38,38,40],i),40,'easy','knowledge'),row('非选择题',pick([33,34,35,37,38,40,41,43],i),60,undefined,'method')]
  };
  const scores={};for(const [subject,rows] of Object.entries(types)){const clean=Q.clean(rows),sum=Q.sum(clean);Q.validate(clean,sum.max,sum.score);scores[subject]={actual:sum.score,raw:sum.score,max:sum.max,rawMax:sum.max,target:subject==='数学'?148:subject==='英语'?130:subject==='语文'?125:90,rank:Math.max(8,400-i*35+Object.keys(scores).length*12),participants:800,classRank:Math.max(2,24-i*2),classParticipants:50};}
  // A partial record demonstrates unknown versus zero without inventing a zero mark.
  if(i===2)types.生物[1].score=null;
  const hex=crypto.createHash('md5').update('showcase-question-types-v1:'+date).digest('hex');
  const id=[hex.slice(0,8),hex.slice(8,12),'4'+hex.slice(13,16),'8'+hex.slice(17,20),hex.slice(20)].join('-');
  return {id,name:'【演示】'+['基础摸底','第一周巩固','阶段复测','九月月考','国庆复习检测','十月阶段练习','考前模拟','期中综合检测'][i],exam_date:date,grade_level:'题型演示',scores,question_type_scores:types,reflection:'【合成演示数据】用于展示题型历史与提分建议，不代表真实学生表现。\n'+(i<3?'先补英语完形填空和物理实验的基础知识；数学继续拆解最后一题。':'基础题更稳定了，继续检查英语语法细节；数学尝试在限时下完成第 22 题的关键步骤。')};
});
function sql(){
  const payload=JSON.stringify(fixtures).replace(/'/g,"''");
  return `BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM public.score_tracker_users WHERE username='showcase') <> 1 THEN RAISE EXCEPTION 'Expected exactly one showcase account'; END IF; END $$;
WITH target AS (SELECT id FROM public.score_tracker_users WHERE username='showcase'),
payload AS (SELECT value AS e FROM jsonb_array_elements('${payload}'::jsonb)),
inserted AS (
 INSERT INTO public.score_tracker_exams(id,user_id,name,exam_date,grade_level,question_type_scores,reflection,reflection_revision,reflection_updated_at)
 SELECT (p.e->>'id')::uuid,t.id,p.e->>'name',(p.e->>'exam_date')::date,p.e->>'grade_level',p.e->'question_type_scores',p.e->>'reflection',1,now() FROM payload p CROSS JOIN target t
 ON CONFLICT (id) DO NOTHING RETURNING id,user_id
), inserted_scores AS (
 INSERT INTO public.score_tracker_scores(exam_id,user_id,subject,target_score,actual_score,max_score,raw_score,raw_max_score,rank_position,participant_count,class_rank_position,class_participant_count)
 SELECT i.id,i.user_id,s.key,(s.value->>'target')::numeric,(s.value->>'actual')::numeric,(s.value->>'max')::numeric,(s.value->>'raw')::numeric,(s.value->>'rawMax')::numeric,(s.value->>'rank')::integer,(s.value->>'participants')::integer,(s.value->>'classRank')::integer,(s.value->>'classParticipants')::integer
 FROM inserted i JOIN payload p ON i.id=(p.e->>'id')::uuid CROSS JOIN LATERAL jsonb_each(p.e->'scores') s RETURNING id
)
SELECT (SELECT count(*) FROM inserted) AS inserted_exams,(SELECT count(*) FROM inserted_scores) AS inserted_scores;
COMMIT;`;
}
module.exports={fixtures,sql};
if(require.main===module)process.stdout.write(sql());
