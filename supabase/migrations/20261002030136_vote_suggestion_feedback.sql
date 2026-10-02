-- Conversion preserves the original author and creates a normal feedback thread.
alter table public.score_tracker_feature_vote_suggestions
  add column feedback_id uuid references public.score_tracker_feedback_submissions(id) on delete set null;
create index feature_vote_suggestions_feedback_idx
  on public.score_tracker_feature_vote_suggestions(feedback_id) where feedback_id is not null;
alter table public.score_tracker_feature_vote_suggestions
  drop constraint score_tracker_feature_vote_suggestions_status_check;
alter table public.score_tracker_feature_vote_suggestions
  add constraint score_tracker_feature_vote_suggestions_status_check
  check (status in ('new', 'promoted', 'dismissed', 'converted'));

create or replace function public.score_tracker_convert_vote_to_feedback(p_suggestion_id uuid, p_admin_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $convert$
declare
  suggestion public.score_tracker_feature_vote_suggestions%rowtype;
  feedback uuid;
begin
  if not exists (select 1 from public.score_tracker_users where id = p_admin_id and is_admin) then
    raise exception '只有管理员可以转为反馈' using errcode = '42501';
  end if;
  select * into suggestion from public.score_tracker_feature_vote_suggestions
    where id = p_suggestion_id for update;
  if not found then
    raise exception '这条需求没有找到' using errcode = 'P0002';
  end if;
  if suggestion.status = 'converted' and suggestion.feedback_id is not null then
    return suggestion.feedback_id;
  end if;
  if suggestion.status <> 'new' then
    raise exception '这条需求已经处理过了' using errcode = '22023';
  end if;
  insert into public.score_tracker_feedback_submissions
    (user_id, content, feedback_type, account_mode, status, created_at, page_path)
    values (suggestion.user_id, suggestion.content, 'other', 'account', 'new', suggestion.created_at, '/feature-vote')
    returning id into feedback;
  update public.score_tracker_feature_vote_suggestions
    set status = 'converted', feedback_id = feedback, updated_at = now()
    where id = suggestion.id;
  insert into public.score_tracker_visit_logs(event_type, user_id, account_mode, app_page, pathname, metadata)
    values ('feature_suggestion_converted', p_admin_id, 'account', 'admin_featurevotes', '/mg',
      jsonb_build_object('suggestion_id', suggestion.id, 'feedback_id', feedback));
  return feedback;
end;
$convert$;
revoke all on function public.score_tracker_convert_vote_to_feedback(uuid, uuid) from public, anon, authenticated;
grant execute on function public.score_tracker_convert_vote_to_feedback(uuid, uuid) to service_role;

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
          'feedbackId', s.feedback_id,
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

revoke all on function public.score_tracker_feature_vote_overview(uuid) from public, anon, authenticated;
grant execute on function public.score_tracker_feature_vote_overview(uuid) to service_role;
