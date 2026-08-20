alter table public.score_tracker_exams
  add column if not exists total_year_position_percent numeric(6,3),
  add column if not exists total_class_position_percent numeric(6,3);

alter table public.score_tracker_scores
  add column if not exists year_position_percent numeric(6,3),
  add column if not exists class_position_percent numeric(6,3),
  add column if not exists exclude_from_total boolean not null default false;

alter table public.score_tracker_exams
  drop constraint if exists score_tracker_exams_total_year_position_percent_check,
  add constraint score_tracker_exams_total_year_position_percent_check check (total_year_position_percent is null or (total_year_position_percent >= 0 and total_year_position_percent <= 100)),
  drop constraint if exists score_tracker_exams_total_class_position_percent_check,
  add constraint score_tracker_exams_total_class_position_percent_check check (total_class_position_percent is null or (total_class_position_percent >= 0 and total_class_position_percent <= 100));

alter table public.score_tracker_scores
  drop constraint if exists score_tracker_scores_year_position_percent_check,
  add constraint score_tracker_scores_year_position_percent_check check (year_position_percent is null or (year_position_percent >= 0 and year_position_percent <= 100)),
  drop constraint if exists score_tracker_scores_class_position_percent_check,
  add constraint score_tracker_scores_class_position_percent_check check (class_position_percent is null or (class_position_percent >= 0 and class_position_percent <= 100));
