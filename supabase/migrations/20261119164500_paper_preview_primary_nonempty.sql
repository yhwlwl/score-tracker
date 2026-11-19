-- ECS-primary records have nothing to replicate until at least one page is registered.
create or replace function public.score_tracker_paper_mirror_preview_enqueue()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare before_mode text := ''; after_mode text := '';
declare before_enabled boolean := false; after_enabled boolean := false;
declare job_request uuid; job_owner uuid; job_operation text;
begin
  if tg_op <> 'INSERT' then before_mode := coalesce(old.options->>'ecs_mirror',''); end if;
  if tg_op <> 'DELETE' then after_mode := coalesce(new.options->>'ecs_mirror',''); end if;
  before_enabled := before_mode in ('preview-v1','preview-v2-primary');
  after_enabled := after_mode in ('preview-v1','preview-v2-primary');
  if not before_enabled and not after_enabled then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'DELETE' then job_request := old.request_id; job_owner := old.user_id;
  else job_request := new.request_id; job_owner := new.user_id; end if;
  if tg_op <> 'DELETE'
     and after_mode = 'preview-v2-primary'
     and jsonb_array_length(coalesce(new.pages,'[]'::jsonb)) = 0 then
    delete from public.score_tracker_paper_mirror_preview_jobs where request_id = job_request;
    return new;
  end if;
  job_operation := case when not after_enabled then 'delete'
                        when after_mode = 'preview-v2-primary' then 'primary'
                        else 'sync' end;
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