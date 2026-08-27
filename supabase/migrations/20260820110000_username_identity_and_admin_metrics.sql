-- v1.1: preserve the originally generated account name while allowing a checked display/login rename.
alter table public.score_tracker_users
  add column if not exists original_username text;

update public.score_tracker_users
set original_username = username
where original_username is null;

create or replace function public.score_tracker_fill_original_username()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.original_username is null or btrim(new.original_username) = '' then
    new.original_username := new.username;
  end if;
  return new;
end;
$$;

drop trigger if exists score_tracker_fill_original_username_before_insert on public.score_tracker_users;
create trigger score_tracker_fill_original_username_before_insert
before insert on public.score_tracker_users
for each row execute function public.score_tracker_fill_original_username();

alter table public.score_tracker_users
  alter column original_username set not null;

create unique index if not exists score_tracker_users_username_lower_key
  on public.score_tracker_users (lower(username));
create unique index if not exists score_tracker_users_original_username_lower_key
  on public.score_tracker_users (lower(original_username));

-- Exact dashboard counters stay in PostgreSQL so the admin UI does not depend on client-side row limits.
create or replace function public.score_tracker_admin_exact_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'events_total', (select count(*) from public.score_tracker_visit_logs),
    'visitors_total', (select count(distinct visitor_id) from public.score_tracker_visit_logs where visitor_id is not null),
    'sessions_total', (select count(distinct session_id) from public.score_tracker_visit_logs where session_id is not null),
    'visitors_24h', (select count(distinct visitor_id) from public.score_tracker_visit_logs where visitor_id is not null and occurred_at >= now() - interval '24 hours'),
    'sessions_24h', (select count(distinct session_id) from public.score_tracker_visit_logs where session_id is not null and occurred_at >= now() - interval '24 hours'),
    'online_5m', (select count(distinct coalesce(visitor_id::text, user_id::text, session_id::text)) from public.score_tracker_visit_logs where occurred_at >= now() - interval '5 minutes'),
    'users_total', (select count(*) from public.score_tracker_users where coalesce(is_admin,false)=false),
    'exams_total', (select count(*) from public.score_tracker_exams),
    'scores_total', (select count(*) from public.score_tracker_scores),
    'feedback_total', (select count(*) from public.score_tracker_feedback_submissions)
  );
$$;

revoke all on function public.score_tracker_admin_exact_metrics() from public, anon, authenticated;
grant execute on function public.score_tracker_admin_exact_metrics() to service_role;
