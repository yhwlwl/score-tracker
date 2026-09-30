-- Completion keeps vote history; an account sees its completion animation once.
alter table public.score_tracker_feature_vote_options
  add column completed_at timestamptz;
alter table public.score_tracker_feature_vote_options
  add constraint completed_feature_not_active check (completed_at is null or not is_active);

create table public.score_tracker_feature_completion_receipts (
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  option_id uuid not null references public.score_tracker_feature_vote_options(id) on delete cascade,
  shown_at timestamptz not null default now(),
  primary key (user_id, option_id)
);
create index feature_completion_receipts_option_idx
  on public.score_tracker_feature_completion_receipts(option_id);
alter table public.score_tracker_feature_completion_receipts enable row level security;
revoke all on public.score_tracker_feature_completion_receipts from public, anon, authenticated;
grant all on public.score_tracker_feature_completion_receipts to service_role;

create or replace function public.score_tracker_feature_vote_overview(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $feature_vote$
  with option_rows as (
    select
      o.id, o.option_key, o.label, o.description, o.source, o.is_active,
      o.sort_order, o.created_at, o.completed_at,
      not exists (select 1 from public.score_tracker_feature_completion_receipts cr
        where cr.user_id = p_user_id and cr.option_id = o.id) as completion_unseen,
      count(v.id)::integer as votes,
      coalesce(bool_or(v.user_id = p_user_id), false) as voted_by_me,
      min(v.created_at) filter (where v.user_id = p_user_id) as voted_at
    from public.score_tracker_feature_vote_options o
    left join public.score_tracker_feature_votes v on v.option_id = o.id
    group by o.id
  ),
  totals as (
    select
      count(*)::integer as total_votes,
      count(distinct user_id)::integer as total_voters
    from public.score_tracker_feature_votes
  ),
  mine as (
    select count(*)::integer as my_votes
    from public.score_tracker_feature_votes
    where user_id = p_user_id
  ),
  suggestions as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'content', s.content,
          'status', s.status,
          'promotedOptionId', s.promoted_option_id,
          'createdAt', s.created_at
        )
        order by s.created_at desc
      ),
      '[]'::jsonb
    ) as rows,
    count(*)::integer as n
    from public.score_tracker_feature_vote_suggestions s
    where s.user_id = p_user_id
  )
  select jsonb_build_object(
    'submitted', (mine.my_votes > 0 or suggestions.n > 0),
    'availableCount', count(*) filter (where option_rows.is_active and not option_rows.voted_by_me),
    'totalVoters', totals.total_voters,
    'totalVotes', totals.total_votes,
    'options', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', option_rows.id,
          'key', option_rows.option_key,
          'label', option_rows.label,
          'description', coalesce(option_rows.description, ''),
          'source', option_rows.source,
          'isActive', option_rows.is_active,
          'completedAt', option_rows.completed_at,
          'sortOrder', option_rows.sort_order,
          'votes', option_rows.votes,
          'votedByMe', option_rows.voted_by_me,
          'votedAt', option_rows.voted_at,
          'createdAt', option_rows.created_at
        )
        order by option_rows.sort_order, option_rows.created_at
      ) filter (where option_rows.is_active or (option_rows.completed_at is not null and option_rows.completion_unseen)),
      '[]'::jsonb
    ),
    'myVotes', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', option_rows.id,
          'key', option_rows.option_key,
          'label', option_rows.label,
          'isActive', option_rows.is_active,
          'completedAt', option_rows.completed_at,
          'votes', option_rows.votes,
          'votedByMe', true,
          'votedAt', option_rows.voted_at,
          'createdAt', option_rows.created_at
        )
        order by option_rows.voted_at desc nulls last
      ) filter (where option_rows.voted_by_me),
      '[]'::jsonb
    ),
    'suggestions', suggestions.rows
  )
  from option_rows
  cross join totals
  cross join mine
  cross join suggestions
  group by totals.total_voters, totals.total_votes, mine.my_votes, suggestions.rows, suggestions.n;
$feature_vote$;

revoke all on function public.score_tracker_feature_vote_overview(uuid) from public;
revoke all on function public.score_tracker_feature_vote_overview(uuid) from anon;
revoke all on function public.score_tracker_feature_vote_overview(uuid) from authenticated;
grant execute on function public.score_tracker_feature_vote_overview(uuid) to service_role;

