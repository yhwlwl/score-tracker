alter table public.score_tracker_ai_configs
  add column if not exists daily_limit integer,
  add column if not exists global_daily_limit integer,
  add column if not exists cooldown_seconds integer;

update public.score_tracker_ai_configs
set daily_limit = coalesce(daily_limit, 10),
    global_daily_limit = coalesce(global_daily_limit, 100),
    cooldown_seconds = coalesce(cooldown_seconds, 15);

alter table public.score_tracker_ai_configs
  alter column daily_limit set default 10,
  alter column global_daily_limit set default 100,
  alter column cooldown_seconds set default 15,
  alter column daily_limit set not null,
  alter column global_daily_limit set not null,
  alter column cooldown_seconds set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'score_tracker_ai_configs_daily_limit_check'
      and conrelid = 'public.score_tracker_ai_configs'::regclass
  ) then
    alter table public.score_tracker_ai_configs
      add constraint score_tracker_ai_configs_daily_limit_check
      check (daily_limit between 1 and 1000);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'score_tracker_ai_configs_global_daily_limit_check'
      and conrelid = 'public.score_tracker_ai_configs'::regclass
  ) then
    alter table public.score_tracker_ai_configs
      add constraint score_tracker_ai_configs_global_daily_limit_check
      check (global_daily_limit between 1 and 10000);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'score_tracker_ai_configs_cooldown_seconds_check'
      and conrelid = 'public.score_tracker_ai_configs'::regclass
  ) then
    alter table public.score_tracker_ai_configs
      add constraint score_tracker_ai_configs_cooldown_seconds_check
      check (cooldown_seconds between 0 and 86400);
  end if;
end
$$;