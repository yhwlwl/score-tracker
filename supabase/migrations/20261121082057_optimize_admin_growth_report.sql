set local lock_timeout = '2s';
-- Existing production index was built concurrently, without blocking log writes.
create index if not exists score_tracker_visit_logs_setup_steps_idx on public.score_tracker_visit_logs (occurred_at desc) where event_type in ('setup_step_shown','setup_step_completed','setup_step_skipped','setup_step_failed');
create or replace function public.score_tracker_admin_growth_report()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
with monthly as materialized (
 select user_id,count(*) active_months from score_tracker_growth_ledger where feature='month' group by user_id
), accounts as materialized (
 select a.*,u.username,greatest(0,floor(extract(epoch from(now()-u.created_at))/86400)) age_days,
 coalesce(m.active_months,0) active_months
 from score_tracker_growth_accounts a join score_tracker_users u on u.id=a.user_id left join monthly m on m.user_id=a.user_id where not u.is_admin
), distribution as (
 select l.level,l.threshold,l.monthly_credits,count(a.user_id) users,
 percentile_cont(.5) within group(order by a.points) median_points,max(a.points) max_points,
 percentile_cont(.5) within group(order by a.age_days) median_age_days,max(a.age_days) max_age_days,
 percentile_cont(.5) within group(order by a.active_months) median_active_months
 from score_tracker_account_levels l left join accounts a on a.level=l.level group by l.level
), steps as (
 select l.metadata->>'step' step,
 count(distinct l.user_id) filter(where l.event_type='setup_step_shown') shown,
 count(distinct l.user_id) filter(where l.event_type='setup_step_completed') completed,
 count(distinct l.user_id) filter(where l.event_type='setup_step_skipped') skipped,
 count(*) filter(where l.event_type='setup_step_failed') failures,
 percentile_cont(.5) within group(order by case when l.metadata->>'duration_ms' ~ '^[0-9]{1,10}$' and l.event_type in ('setup_step_completed','setup_step_skipped') then (l.metadata->>'duration_ms')::numeric end) median_ms
 from score_tracker_visit_logs l join score_tracker_users u on u.id=l.user_id where not u.is_admin and l.metadata->>'guide_version'='2' and l.occurred_at>=now()-interval '30 days'
 and l.event_type in ('setup_step_shown','setup_step_completed','setup_step_skipped','setup_step_failed') group by l.metadata->>'step'
)
select jsonb_build_object('total_users',(select count(*) from score_tracker_users where not is_admin),
 'evaluated_users',(select count(*) from accounts),'highest_level',(select max(level) from accounts),
 'median_points',(select percentile_cont(.5) within group(order by points) from accounts),
 'distribution',(select jsonb_agg(to_jsonb(d) order by level) from distribution d),
 'top_users',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select user_id,username,level,points,age_days,active_months from accounts order by points desc,user_id limit 20)t),
 'guide',jsonb_build_object('completed',(select count(*) from score_tracker_setup_profiles p join score_tracker_users u on u.id=p.user_id where not u.is_admin and p.preference_guide_version>=2),
 'steps',(select coalesce(jsonb_agg(to_jsonb(s) order by step),'[]') from steps s)), 'as_of',now());
$$;
revoke all on function public.score_tracker_admin_growth_report() from public,anon,authenticated;
grant execute on function public.score_tracker_admin_growth_report() to service_role;
