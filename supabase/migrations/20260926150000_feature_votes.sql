-- Dynamic feature voting.
-- A user may vote each option once, can vote multiple options, and can vote newly-added options later.

create table if not exists public.score_tracker_feature_vote_options (
  id uuid primary key default gen_random_uuid(),
  option_key text not null unique,
  label text not null,
  description text,
  source text not null default 'admin' check (source in ('admin','seed','user_suggestion')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_tracker_feature_vote_options_label_check
    check (char_length(btrim(label)) between 1 and 160)
);

create table if not exists public.score_tracker_feature_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  option_id uuid not null references public.score_tracker_feature_vote_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint score_tracker_feature_votes_user_option_unique unique (user_id, option_id)
);

create table if not exists public.score_tracker_feature_vote_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  content text not null,
  status text not null default 'new' check (status in ('new','promoted','dismissed')),
  promoted_option_id uuid references public.score_tracker_feature_vote_options(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_tracker_feature_vote_suggestions_content_check
    check (char_length(btrim(content)) between 1 and 300)
);

create index if not exists score_tracker_feature_votes_option_idx
  on public.score_tracker_feature_votes(option_id, created_at desc);
create index if not exists score_tracker_feature_votes_user_idx
  on public.score_tracker_feature_votes(user_id, created_at desc);
create index if not exists score_tracker_feature_vote_suggestions_status_idx
  on public.score_tracker_feature_vote_suggestions(status, created_at desc);

alter table public.score_tracker_feature_vote_options enable row level security;
alter table public.score_tracker_feature_votes enable row level security;
alter table public.score_tracker_feature_vote_suggestions enable row level security;

insert into public.score_tracker_feature_vote_options(option_key,label,source,sort_order)
values
  ('natural_input','增加自然语言录入 / 拍照录入','seed',10),
  ('similar_trajectory','分析功能升级：匹配与我成绩轨迹类似的用户','seed',20),
  ('school_selection','支持选择学校','seed',30)
on conflict (option_key) do update
set label=excluded.label,
    sort_order=excluded.sort_order,
    is_active=true,
    updated_at=now();

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
      o.sort_order, o.created_at,
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
          'sortOrder', option_rows.sort_order,
          'votes', option_rows.votes,
          'votedByMe', option_rows.voted_by_me,
          'votedAt', option_rows.voted_at,
          'createdAt', option_rows.created_at
        )
        order by option_rows.sort_order, option_rows.created_at
      ) filter (where option_rows.is_active),
      '[]'::jsonb
    ),
    'myVotes', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', option_rows.id,
          'key', option_rows.option_key,
          'label', option_rows.label,
          'isActive', option_rows.is_active,
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

comment on table public.score_tracker_feature_vote_options is
  'Admin-managed feature voting options. is_active=false hides an option while keeping vote history.';
comment on table public.score_tracker_feature_votes is
  'One row per account per option. Users can vote additional options added later.';
comment on table public.score_tracker_feature_vote_suggestions is
  'Free-text feature requests submitted by users; admins may promote them into vote options.';
