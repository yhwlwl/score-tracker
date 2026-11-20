-- Preview only. The marker is set by the preview Edge Function, never by clients.
-- Jobs are committed in the same transaction as each materials change.
create table public.score_tracker_paper_mirror_preview_jobs (
  request_id uuid primary key,
  user_id uuid not null,
  generation uuid not null default gen_random_uuid(),
  operation text not null check (operation in ('sync','delete')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index score_tracker_paper_mirror_preview_pending_idx
  on public.score_tracker_paper_mirror_preview_jobs (available_at, updated_at);
alter table public.score_tracker_paper_mirror_preview_jobs enable row level security;
revoke all on public.score_tracker_paper_mirror_preview_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.score_tracker_paper_mirror_preview_jobs to service_role;

-- A signed worker request is usable only once, even inside its short time window.
create table public.score_tracker_paper_mirror_preview_nonces (
  nonce uuid primary key,
  created_at timestamptz not null default now()
);
create index score_tracker_paper_mirror_preview_nonces_created_idx
  on public.score_tracker_paper_mirror_preview_nonces (created_at);
alter table public.score_tracker_paper_mirror_preview_nonces enable row level security;
revoke all on public.score_tracker_paper_mirror_preview_nonces from public, anon, authenticated;
grant select, insert, delete on public.score_tracker_paper_mirror_preview_nonces to service_role;

create or replace function public.score_tracker_paper_mirror_preview_enqueue()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare before_enabled boolean := false; after_enabled boolean := false;
declare job_request uuid; job_owner uuid; job_operation text;
begin
  if tg_op <> 'INSERT' then
    before_enabled := coalesce(old.options->>'ecs_mirror', '') = 'preview-v1';
  end if;
  if tg_op <> 'DELETE' then
    after_enabled := coalesce(new.options->>'ecs_mirror', '') = 'preview-v1';
  end if;
  if not before_enabled and not after_enabled then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'DELETE' then job_request := old.request_id; job_owner := old.user_id;
  else job_request := new.request_id; job_owner := new.user_id; end if;
  job_operation := case when after_enabled then 'sync' else 'delete' end;
  insert into public.score_tracker_paper_mirror_preview_jobs as q
    (request_id,user_id,generation,operation,attempts,available_at,updated_at)
  values (job_request,job_owner,gen_random_uuid(),job_operation,0,now(),now())
  on conflict (request_id) do update set user_id=excluded.user_id,
    generation=excluded.generation,operation=excluded.operation,attempts=0,
    available_at=now(),updated_at=now();
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.score_tracker_paper_mirror_preview_enqueue() from public, anon, authenticated;
create trigger score_tracker_paper_mirror_preview_enqueue
after insert or update of pages, options or delete on public.score_tracker_paper_materials
for each row execute function public.score_tracker_paper_mirror_preview_enqueue();
