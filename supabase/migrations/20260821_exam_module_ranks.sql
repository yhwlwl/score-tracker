-- 组合分排名：exam_modules 表增加 ranks(jsonb) 列，保存每场考试每个组合的年排/班排
alter table public.score_tracker_exam_modules
  add column if not exists ranks jsonb;