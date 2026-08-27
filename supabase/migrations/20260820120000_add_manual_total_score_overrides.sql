alter table public.score_tracker_exams
  add column if not exists total_actual_score numeric(10,2),
  add column if not exists total_raw_score numeric(10,2);

alter table public.score_tracker_exams
  drop constraint if exists score_tracker_exams_total_actual_score_check,
  add constraint score_tracker_exams_total_actual_score_check check (total_actual_score is null or (total_actual_score >= 0 and total_actual_score <= 99999)),
  drop constraint if exists score_tracker_exams_total_raw_score_check,
  add constraint score_tracker_exams_total_raw_score_check check (total_raw_score is null or (total_raw_score >= 0 and total_raw_score <= 99999));
