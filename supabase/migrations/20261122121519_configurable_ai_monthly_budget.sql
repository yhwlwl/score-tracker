alter table public.score_tracker_ai_policy
  drop constraint score_tracker_ai_policy_hard_limit_cny_check,
  add constraint score_tracker_ai_policy_hard_limit_cny_check
    check (hard_limit_cny > 0 and hard_limit_cny < 'Infinity'::numeric);
