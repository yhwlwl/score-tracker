-- Recognition diagnostics are server-only; images stay in a private bucket.
create table public.score_tracker_vision_requests (
  request_id uuid primary key,
  user_id uuid references public.score_tracker_users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','failed','rejected')),
  model text,
  provider_host text,
  http_status integer,
  upstream_status integer,
  error_code text,
  error_stage text,
  error_message text,
  duration_ms integer,
  image_count integer not null default 0,
  source_image_count integer not null default 0,
  image_bytes integer not null default 0,
  image_meta jsonb not null default '[]',
  attempts jsonb not null default '[]',
  diagnostics jsonb not null default '{}',
  result jsonb,
  raw_output text,
  images jsonb not null default '[]',
  storage_status text not null default 'not_requested' check (storage_status in ('not_requested','pending','complete','partial','failed')),
  storage_errors jsonb not null default '[]',
  quota_consumed boolean not null default false,
  quota_refunded boolean not null default false,
  quota_date date
);
comment on table public.score_tracker_vision_requests is 'Server-only recognition attempts, results and private sample references. No passwords, tokens or image base64.';
create index score_tracker_vision_requests_created_idx on public.score_tracker_vision_requests(created_at desc);
create index score_tracker_vision_requests_user_created_idx on public.score_tracker_vision_requests(user_id,created_at desc);
alter table public.score_tracker_vision_requests enable row level security;
revoke all on table public.score_tracker_vision_requests from public, anon, authenticated;
grant select, insert, update, delete on public.score_tracker_vision_requests to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('score-tracker-vision-samples','score-tracker-vision-samples',false,3000000,array['image/jpeg','image/jpg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Also protect this bucket if a project-wide permissive Storage policy exists.
create policy score_tracker_vision_samples_server_only on storage.objects
as restrictive for all to anon,authenticated
using (bucket_id<>'score-tracker-vision-samples')
with check (bucket_id<>'score-tracker-vision-samples');

create function public.score_tracker_vision_reserve(p_user_id uuid,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.score_tracker_vision_requests%rowtype; q jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('score_tracker_vision:' || p_user_id::text,0));
  select * into r from public.score_tracker_vision_requests where request_id=p_request_id for update;
  if not found or r.user_id is distinct from p_user_id then raise exception 'Unknown recognition request' using errcode='22023'; end if;
  if r.status<>'running' then raise exception 'Recognition request already completed' using errcode='22023'; end if;
  if r.quota_consumed then
    return public.score_tracker_vision_quota(p_user_id,false) || jsonb_build_object('allowed',true,'consumed',true);
  end if;
  q := public.score_tracker_vision_quota(p_user_id,true);
  if coalesce((q->>'consumed')::boolean,false) then
    update public.score_tracker_vision_requests set quota_consumed=true,quota_date=(clock_timestamp() at time zone 'UTC')::date where request_id=p_request_id;
  end if;
  return q;
end;
$$;
revoke all on function public.score_tracker_vision_reserve(uuid,uuid) from public,anon,authenticated;
grant execute on function public.score_tracker_vision_reserve(uuid,uuid) to service_role;

create function public.score_tracker_vision_refund(p_request_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare r public.score_tracker_vision_requests%rowtype; account_id uuid;
begin
  select user_id into account_id from public.score_tracker_vision_requests where request_id=p_request_id;
  if account_id is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('score_tracker_vision:' || account_id::text,0));
  select * into r from public.score_tracker_vision_requests where request_id=p_request_id for update;
  if not r.quota_consumed or r.quota_refunded or r.status<>'failed' or r.error_code not in
    ('upstream_timeout','upstream_network_error','upstream_error','upstream_rate_limited','upstream_auth_failed',
     'upstream_billing_or_model_error','invalid_upstream_response','model_output_truncated','empty_model_output',
     'invalid_model_output','vision_handler_error','rate_limit_unavailable') then return false; end if;
  update public.score_tracker_ai_usage set request_count=greatest(0,request_count-1)
    where usage_date=r.quota_date and scope='user:' || r.user_id::text;
  -- Keep global usage and last_requested_at intact to bound upstream costs and retry abuse.
  update public.score_tracker_vision_requests set quota_refunded=true where request_id=p_request_id;
  return true;
end;
$$;
revoke all on function public.score_tracker_vision_refund(uuid) from public,anon,authenticated;
grant execute on function public.score_tracker_vision_refund(uuid) to service_role;

create function public.score_tracker_vision_summary(p_since timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with selected as (
    select status,error_code,duration_ms from public.score_tracker_vision_requests
    where created_at>=greatest(p_since,now()-interval '90 days')
  ), counts as (
    select count(*) as total,count(*) filter(where status='succeeded') as succeeded,
      count(*) filter(where status='failed') as failed,count(*) filter(where status='rejected') as rejected,
      count(*) filter(where status='running') as running,
      percentile_cont(0.5) within group(order by duration_ms) filter(where status='succeeded') as median_ms,
      percentile_cont(0.95) within group(order by duration_ms) filter(where status='succeeded') as p95_ms from selected
  ), reasons as (
    select error_code,count(*) as count from selected where status in ('failed','rejected') group by error_code order by count(*) desc
  )
  select to_jsonb(c) || jsonb_build_object('success_rate',case when c.succeeded+c.failed>0 then round(c.succeeded*100.0/(c.succeeded+c.failed),1) else null end,
    'errors',coalesce((select jsonb_agg(to_jsonb(r)) from reasons r),'[]'::jsonb)) from counts c;
$$;
revoke all on function public.score_tracker_vision_summary(timestamptz) from public,anon,authenticated;
grant execute on function public.score_tracker_vision_summary(timestamptz) to service_role;
