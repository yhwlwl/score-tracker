-- Round ballots are separate from the original continuous voting archive.
-- All RPCs are service-role only; Edge Functions authenticate Score Tracker sessions.
create table public.score_tracker_vote_rounds (
 id uuid primary key default gen_random_uuid(),
 round_no integer generated always as identity unique,
 title text not null check (char_length(btrim(title)) between 1 and 120),
 starts_at timestamptz not null,
 ends_at timestamptz not null check (ends_at > starts_at),
 max_choices integer not null default 3 check (max_choices between 1 and 50),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 exclude using gist (tstzrange(starts_at,ends_at,'[)') with &&) where (published)
);
alter table public.score_tracker_feature_vote_options
 add column development_status text not null default 'pending'
 check(development_status in ('pending','accepted','deferred','declined','developing','released')),
 add column development_note text not null default '' check(char_length(development_note)<=500);
create table public.score_tracker_vote_round_options (
 round_id uuid not null references public.score_tracker_vote_rounds(id) on delete cascade,
 option_id uuid not null references public.score_tracker_feature_vote_options(id) on delete restrict,
 label text not null, description text, sort_order integer not null,
 primary key(round_id,option_id)
);
create table public.score_tracker_vote_round_ballots (
 id uuid primary key default gen_random_uuid(),
 round_id uuid not null references public.score_tracker_vote_rounds(id) on delete restrict,
 user_id uuid references public.score_tracker_users(id) on delete set null,
 choices uuid[] not null check(cardinality(choices)>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(round_id,user_id)
);
create index score_tracker_round_ballots_user_idx on public.score_tracker_vote_round_ballots(user_id);
alter table public.score_tracker_vote_rounds enable row level security;
alter table public.score_tracker_vote_round_options enable row level security;
alter table public.score_tracker_vote_round_ballots enable row level security;
revoke all on public.score_tracker_vote_rounds,public.score_tracker_vote_round_options,public.score_tracker_vote_round_ballots from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_vote_rounds,public.score_tracker_vote_round_options,public.score_tracker_vote_round_ballots to service_role;
grant usage,select on sequence public.score_tracker_vote_rounds_round_no_seq to service_role;

create function public.score_tracker_rounds_overview(p_user uuid, p_admin boolean default false)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 with rs as (
  select r.*,case when not published then 'draft' when now()<starts_at then 'scheduled'
     when now()<ends_at then 'open' else 'closed' end as state
  from score_tracker_vote_rounds r
  where p_admin or (published and starts_at<=now())
 ), counts as (
  select round_id,count(*)::integer participants,sum(cardinality(choices))::integer total_votes
  from score_tracker_vote_round_ballots group by round_id
 ), votes as (
  select b.round_id,c.option_id,count(*)::integer votes
  from score_tracker_vote_round_ballots b cross join lateral unnest(b.choices) c(option_id)
  group by b.round_id,c.option_id
 ), items as (
  select ro.round_id,jsonb_agg(jsonb_build_object(
   'id',ro.option_id,'label',ro.label,'description',coalesce(ro.description,''),
   'votes',case when p_admin or rs.state='closed' or exists(select 1 from score_tracker_vote_round_ballots b where b.round_id=rs.id and b.user_id=p_user) then coalesce(v.votes,0) else null end,
   'status',case when o.completed_at is not null then 'released' else o.development_status end,
   'note',o.development_note,'votedByMe',coalesce(ro.option_id=any(b.choices),false)
  ) order by ro.sort_order,ro.option_id) options
  from score_tracker_vote_round_options ro join rs on rs.id=ro.round_id
  join score_tracker_feature_vote_options o on o.id=ro.option_id
  left join votes v on v.round_id=ro.round_id and v.option_id=ro.option_id
  left join score_tracker_vote_round_ballots b on b.round_id=ro.round_id and b.user_id=p_user
  group by ro.round_id
 ), legacy as (
  select jsonb_build_object('title','早期功能共创','participants',(select count(distinct user_id) from score_tracker_feature_votes),
    'totalVotes',(select count(*) from score_tracker_feature_votes),
    'options',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'votes',(select count(*) from score_tracker_feature_votes v where v.option_id=o.id),
      'status',case when o.completed_at is not null then 'released' else o.development_status end,'note',o.development_note) order by o.sort_order),'[]'::jsonb)) data
  from score_tracker_feature_vote_options o where exists(select 1 from score_tracker_feature_votes v where v.option_id=o.id)
 )
 select jsonb_build_object('enabled',exists(select 1 from score_tracker_vote_rounds where published and starts_at<=now()),
  'rounds',coalesce((select jsonb_agg(jsonb_build_object('id',rs.id,'number',rs.round_no,'title',rs.title,
    'startsAt',rs.starts_at,'endsAt',rs.ends_at,'maxChoices',rs.max_choices,'state',rs.state,
    'participants',coalesce(c.participants,0),'totalVotes',case when p_admin or rs.state='closed' or b.id is not null then coalesce(c.total_votes,0) else null end,
    'choices',coalesce(to_jsonb(b.choices),'[]'::jsonb),'options',coalesce(i.options,'[]'::jsonb))
    order by rs.starts_at desc,rs.round_no desc) from rs left join counts c on c.round_id=rs.id
    left join items i on i.round_id=rs.id left join score_tracker_vote_round_ballots b on b.round_id=rs.id and b.user_id=p_user),'[]'::jsonb),
  'legacy',(select data from legacy));
$$;

create function public.score_tracker_round_save(p_id uuid,p_title text,p_start timestamptz,p_end timestamptz,p_max integer,p_options uuid[],p_publish boolean)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare rid uuid; valid_count integer; old score_tracker_vote_rounds%rowtype;
begin
 perform pg_advisory_xact_lock(60261125);
 if p_start is null or p_end is null or p_end<=p_start or p_max is null or p_max<1 or p_max>50
   or p_title is null or char_length(btrim(p_title)) not between 1 and 120
   or coalesce(cardinality(p_options),0)<2 or cardinality(p_options)>50 or p_max>cardinality(p_options) then
  raise exception '请核对时间、候选功能及投票额度' using errcode='22023';
 end if;
 select count(*) into valid_count from score_tracker_feature_vote_options
 where id=any(p_options) and completed_at is null and development_status in ('pending','deferred');
 if valid_count<>cardinality(p_options) then raise exception '候选功能重复或已不适合投票' using errcode='22023'; end if;
 if p_publish and p_end<=now() then raise exception '不能发布已经截止的轮次' using errcode='22023'; end if;
 if p_id is null then
  insert into score_tracker_vote_rounds(title,starts_at,ends_at,max_choices,published)
  values(btrim(p_title),p_start,p_end,p_max,p_publish) returning id into rid;
 else
  select * into old from score_tracker_vote_rounds where id=p_id for update;
  if not found or old.published then raise exception '仅草稿可修改' using errcode='22023'; end if;
  update score_tracker_vote_rounds set title=btrim(p_title),starts_at=p_start,ends_at=p_end,max_choices=p_max,published=p_publish where id=p_id returning id into rid;
  delete from score_tracker_vote_round_options where round_id=rid;
 end if;
 insert into score_tracker_vote_round_options(round_id,option_id,label,description,sort_order)
 select rid,o.id,o.label,o.description,a.ordinality::integer
 from unnest(p_options) with ordinality a(id,ordinality) join score_tracker_feature_vote_options o on o.id=a.id;
 return rid;
end $$;

create function public.score_tracker_round_submit(p_user uuid,p_round uuid,p_choices uuid[])
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r score_tracker_vote_rounds%rowtype; valid_count integer; n integer;
begin
 if p_user is null then raise exception '未登录' using errcode='22023'; end if;
 select * into r from score_tracker_vote_rounds where id=p_round for share;
 if not found or not r.published or clock_timestamp()<r.starts_at or clock_timestamp()>=r.ends_at then
  raise exception '本轮投票尚未开始或已截止，请刷新' using errcode='22023';
 end if;
 n:=coalesce(cardinality(p_choices),0);
 if n<1 or n>r.max_choices then raise exception '请选择符合本轮额度的功能' using errcode='22023'; end if;
 select count(*) into valid_count from score_tracker_vote_round_options where round_id=p_round and option_id=any(p_choices);
 if valid_count<>n then raise exception '存在重复或不属于本轮的选项' using errcode='22023'; end if;
 insert into score_tracker_vote_round_ballots(round_id,user_id,choices) values(p_round,p_user,p_choices)
 on conflict(round_id,user_id) do update set choices=excluded.choices,updated_at=clock_timestamp();
 return score_tracker_rounds_overview(p_user,false);
end $$;

-- Prevent stale clients and suggestion promotion from adding legacy votes after the first round starts.
create function public.score_tracker_legacy_vote_guard() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if exists(select 1 from score_tracker_vote_rounds where published and starts_at<=clock_timestamp()) then
  raise exception '旧投票已归档，请参与新一轮投票' using errcode='22023';
 end if;
 return new;
end $$;
create trigger score_tracker_legacy_vote_guard before insert on public.score_tracker_feature_votes
 for each row execute function public.score_tracker_legacy_vote_guard();

revoke all on function public.score_tracker_rounds_overview(uuid,boolean),public.score_tracker_round_save(uuid,text,timestamptz,timestamptz,integer,uuid[],boolean),public.score_tracker_round_submit(uuid,uuid,uuid[]),public.score_tracker_legacy_vote_guard() from public,anon,authenticated;
grant execute on function public.score_tracker_rounds_overview(uuid,boolean),public.score_tracker_round_save(uuid,text,timestamptz,timestamptz,integer,uuid[],boolean),public.score_tracker_round_submit(uuid,uuid,uuid[]) to service_role;
