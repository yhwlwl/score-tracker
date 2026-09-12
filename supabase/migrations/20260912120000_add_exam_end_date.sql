-- 20260912_add_exam_end_date.sql
-- 考试支持日期段:end_date 可空;为空表示与开始日期同日(旧数据天然兼容)
alter table public.score_tracker_exams
  add column if not exists end_date date;

alter table public.score_tracker_exams
  drop constraint if exists score_tracker_exams_date_range_check,
  add constraint score_tracker_exams_date_range_check check (end_date is null or end_date >= exam_date);
