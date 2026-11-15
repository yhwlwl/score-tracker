-- The unified guide is versioned independently from legacy first-run steps.
alter table public.score_tracker_setup_profiles
  add column if not exists preference_guide_version smallint not null default 0,
  add column if not exists guide_step smallint not null default 0 check (guide_step between 0 and 9),
  add column if not exists current_grade text not null default '' check (length(current_grade) <= 20),
  add column if not exists privacy_notice_version smallint not null default 0 check (privacy_notice_version between 0 and 1),
  add column if not exists privacy_acknowledged_at timestamptz;
alter table public.score_tracker_setup_profiles
  drop constraint if exists score_tracker_setup_profiles_preference_guide_version_check;
alter table public.score_tracker_setup_profiles
  add constraint score_tracker_setup_profiles_preference_guide_version_check
  check (preference_guide_version between 0 and 2);
alter table public.score_tracker_user_goals
  add column if not exists target_rank integer check (target_rank between 1 and 10000000);
