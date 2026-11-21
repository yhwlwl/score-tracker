-- Read-only; never refreshes accounts or grants credits.
set local lock_timeout = '2s';
create function public.score_tracker_admin_growth_report()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
with accounts as (
 select a.*,u.username,greatest(0,floor(extract(epoch from(now()-u.created_at))/86400)) age_days,
 (select count(*) from score_tracker_growth_ledger l where l.user_id=a.user_id and l.feature='month') active_months
 from score_tracker_growth_accounts a join score_tracker_users u on u.id=a.user_id where not u.is_admin
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
create function public.score_tracker_admin_paper_summary(p_since timestamptz)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
select jsonb_build_object('succeeded',count(*) filter(where status='succeeded'),
 'failed',count(*) filter(where status='failed'),'running',count(*) filter(where status='running'),'paused',count(*) filter(where status='paused'),
 'success_rate',round(100.0*count(*) filter(where status='succeeded')/nullif(count(*) filter(where status in ('succeeded','failed')),0),1),
 'median_ms',percentile_cont(.5) within group(order by duration_ms) filter(where status='succeeded'),
 'p95_ms',percentile_cont(.95) within group(order by duration_ms) filter(where status='succeeded'),
 'max_ms',max(duration_ms) filter(where status='succeeded'))
from score_tracker_paper_reviews where created_at>=p_since and (options->>'purpose'='record' or result->>'record_only'='true');
$$;
revoke all on function public.score_tracker_admin_growth_report(), public.score_tracker_admin_paper_summary(timestamptz) from public,anon,authenticated;
grant execute on function public.score_tracker_admin_growth_report(), public.score_tracker_admin_paper_summary(timestamptz) to service_role;
