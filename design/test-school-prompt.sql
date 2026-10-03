-- Creates only temporary fixtures; all changes are rolled back.
begin;
do $$
declare u uuid; username text := 'school-test-' || gen_random_uuid()::text; p public.score_tracker_setup_profiles;
begin
  insert into public.score_tracker_users(username,original_username,password_hash,password_salt)
  values(username,username,'not-a-real-password','test-only') returning id into u;
  if not public.score_tracker_claim_school_prompt(u) then raise exception 'first claim denied'; end if;
  if public.score_tracker_claim_school_prompt(u) then raise exception 'duplicate claim allowed'; end if;
  select * into p from public.score_tracker_setup_profiles where user_id=u;
  if p.step<>0 or p.selected_subjects<>'[]'::jsonb or p.completed_at is not null or p.school is not null then raise exception 'claim changed setup'; end if;
  update public.score_tracker_setup_profiles set school_prompted_at=null,school='{"name":"已有学校"}' where user_id=u;
  if public.score_tracker_claim_school_prompt(u) then raise exception 'selected school prompted'; end if;
  update public.score_tracker_setup_profiles set school=null,step=6 where user_id=u;
  if public.score_tracker_claim_school_prompt(u) then raise exception 'old school screen prompted'; end if;
  update public.score_tracker_setup_profiles set step=0,completed_at=now() where user_id=u;
  if public.score_tracker_claim_school_prompt(u) then raise exception 'completed setup prompted'; end if;
  update public.score_tracker_setup_profiles set completed_at=null,step=3,selected_subjects='["物理","化学","生物"]' where user_id=u;
  if not public.score_tracker_claim_school_prompt(u) then raise exception 'unseen school prompt denied'; end if;
  select * into p from public.score_tracker_setup_profiles where user_id=u;
  if p.step<>3 or p.selected_subjects<>'["物理","化学","生物"]'::jsonb then raise exception 'claim changed preferences'; end if;
  if has_function_privilege('anon','public.score_tracker_claim_school_prompt(uuid)','execute') or has_function_privilege('authenticated','public.score_tracker_claim_school_prompt(uuid)','execute') then raise exception 'public claim access'; end if;
  if not has_function_privilege('service_role','public.score_tracker_claim_school_prompt(uuid)','execute') then raise exception 'missing service access'; end if;
end;
$$;
rollback;
