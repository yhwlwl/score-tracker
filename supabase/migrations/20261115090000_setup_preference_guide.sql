-- One-time preference guide for every account. Existing setup profiles keep
-- their current first-run state and receive version 0 until the guide is seen.
alter table public.score_tracker_setup_profiles
  add column if not exists preference_guide_version smallint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.score_tracker_setup_profiles'::regclass
      and conname = 'score_tracker_setup_profiles_preference_guide_version_check'
  ) then
    alter table public.score_tracker_setup_profiles
      add constraint score_tracker_setup_profiles_preference_guide_version_check
      check (preference_guide_version between 0 and 1);
  end if;
end $$;
