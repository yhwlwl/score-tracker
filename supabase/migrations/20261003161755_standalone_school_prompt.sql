alter table public.score_tracker_setup_profiles
  add column if not exists school_prompted_at timestamptz;

-- People who already reached the old school screen should not be asked again.
update public.score_tracker_setup_profiles
set school_prompted_at = coalesce(completed_at, updated_at)
where school_prompted_at is null and (step = 6 or completed_at is not null or school is not null);

create or replace function public.score_tracker_claim_school_prompt(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare claimed_id uuid;
begin
  insert into public.score_tracker_setup_profiles as p (user_id, school_prompted_at)
  values (p_user_id, now())
  on conflict (user_id) do update
    set school_prompted_at = now(), updated_at = now()
    where p.school is null and p.school_prompted_at is null
      and p.step < 6 and p.completed_at is null
  returning user_id into claimed_id;
  return claimed_id is not null;
end;
$$;
revoke all on function public.score_tracker_claim_school_prompt(uuid) from public, anon, authenticated;
grant execute on function public.score_tracker_claim_school_prompt(uuid) to service_role;
