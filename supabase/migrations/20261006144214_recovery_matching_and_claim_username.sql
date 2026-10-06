-- Improve recovery evidence matching and allow a custom username when claiming.
-- Replace the existing candidate matcher with the normalized version below.
drop function if exists public.score_tracker_recovery_candidates(uuid,text);
create function public.score_tracker_recovery_candidates(p_ticket uuid,p_query text default '')
returns jsonb language sql security invoker set search_path='' as $$
with t as (
  select r.*,
    lower(regexp_replace(coalesce(r.evidence->>'subject',''),'[[:space:]·._-]+','','g')) as subject_key,
    nullif(r.evidence->>'score','')::numeric as score_value,
    regexp_replace(btrim(coalesce(p_query,'')),'[[:space:],]+','','g') as query_key,
    case when regexp_replace(btrim(coalesce(p_query,'')),'[[:space:],]+','','g') ~ '^[0-9]+([.][0-9]+)?$' then regexp_replace(btrim(coalesce(p_query,'')),'[[:space:],]+','','g')::numeric end as query_score
  from public.score_tracker_recovery_tickets r where r.id=p_ticket
),
x as (
  select u.id,u.username,u.original_username,u.created_at,
    (t.username_hint<>'' and (lower(u.username)=lower(t.username_hint) or lower(u.original_username)=lower(t.username_hint))) as username_match,
    exists(select 1 from public.score_tracker_exams e where e.user_id=u.id
      and (nullif(t.evidence->>'exam_name','') is not null or nullif(t.evidence->>'exam_date','') is not null or t.score_value is not null)
      and (coalesce(t.evidence->>'exam_name','')='' or position(lower(t.evidence->>'exam_name') in lower(e.name))>0)
      and (coalesce(t.evidence->>'exam_date','')='' or e.exam_date::text=t.evidence->>'exam_date')
      and (t.score_value is null or
        (t.subject_key not in ('总分','总成绩','总分数','合计','总分合计') and exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (t.subject_key='' or s.subject=t.evidence->>'subject') and (s.actual_score=t.score_value or s.raw_score=t.score_value)))
        or ((t.subject_key='' or t.subject_key in ('总分','总成绩','总分数','合计','总分合计')) and
          (coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value
          or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value)))) as exam_match,
    exists(select 1 from public.score_tracker_exams e where e.user_id=u.id and t.score_value is not null
      and (coalesce(t.evidence->>'exam_name','')='' or position(lower(t.evidence->>'exam_name') in lower(e.name))>0)
      and (coalesce(t.evidence->>'exam_date','')='' or e.exam_date::text=t.evidence->>'exam_date')
      and (t.subject_key='' or t.subject_key in ('总分','总成绩','总分数','合计','总分合计'))
      and (coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value
        or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.score_value)) as total_match,
    exists(select 1 from public.score_tracker_setup_profiles p where p.user_id=u.id and coalesce(t.evidence->>'school','')<>'' and position(lower(t.evidence->>'school') in lower(p.school->>'name'))>0) as school_match,
    exists(select 1 from public.score_tracker_exams e where e.user_id=u.id and t.query_score is not null
      and ((exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (s.actual_score=t.query_score or s.raw_score=t.query_score)))
        or coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score
        or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score)) as query_score_match
  from public.score_tracker_users u cross join t
  where not u.is_admin and (t.query_key='' or position(lower(t.query_key) in lower(u.username))>0 or position(lower(t.query_key) in lower(u.original_username))>0 or exists(select 1 from public.score_tracker_exams e where e.user_id=u.id and t.query_score is not null
    and ((exists(select 1 from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and (s.actual_score=t.query_score or s.raw_score=t.query_score)))
      or coalesce(e.total_actual_score,(select sum(s.actual_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score
      or coalesce(e.total_raw_score,(select sum(s.raw_score) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=u.id and not s.exclude_from_total))=t.query_score)))
),
r as (select *, (case when username_match then 4 else 0 end + case when exam_match then 3 else 0 end + case when school_match then 1 else 0 end + case when query_score_match then 2 else 0 end) as strength from x
  where query_score_match or username_match or exam_match or school_match)
select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'exams',(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select e.name,e.exam_date,e.total_actual_score,e.total_raw_score,e.total_rank,
    (select coalesce(jsonb_agg(jsonb_build_object('subject',s.subject,'actual_score',s.actual_score,'raw_score',s.raw_score,'rank_position',s.rank_position)),'[]'::jsonb) from public.score_tracker_scores s where s.exam_id=e.id and s.user_id=r.id) as scores
    from public.score_tracker_exams e cross join t where e.user_id=r.id order by
      (coalesce(t.evidence->>'exam_name','')<>'' and position(lower(t.evidence->>'exam_name') in lower(e.name))>0) desc,e.exam_date desc limit 5) v),
  'school',(select p.school->>'name' from public.score_tracker_setup_profiles p where p.user_id=r.id),
  'exam_count',(select count(*) from public.score_tracker_exams e where e.user_id=r.id))), '[]'::jsonb) from r;
$$;

create function public.score_tracker_recovery_claim(p_ticket uuid,p_key_hash text,p_hash text,p_salt text,p_token_hash text,p_username text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.score_tracker_recovery_tickets; u public.score_tracker_users; next_username text;
begin
  next_username=lower(btrim(coalesce(p_username,'')));
  if length(next_username)<2 or length(next_username)>24 or next_username~'[[:space:]]' then raise exception 'invalid_username'; end if;
  select * into t from public.score_tracker_recovery_tickets where id=p_ticket and key_hash=p_key_hash for update;
  if not found then raise exception 'ticket_not_found'; end if;
  if t.status<>'approved' then raise exception 'not_claimable'; end if;
  if t.claim_until<now() then raise exception 'claim_expired'; end if;
  if exists(select 1 from public.score_tracker_users where id<>t.new_user_id and (lower(username)=next_username or lower(original_username)=next_username)) then raise exception 'username_taken'; end if;
  update public.score_tracker_users set username=next_username,password_hash=p_hash,password_salt=p_salt,session_token_hash=p_token_hash,session_expires_at=now()+interval '180 days',updated_at=now() where id=t.new_user_id and not is_admin returning * into u;
  if not found then raise exception 'source_not_found'; end if;
  update public.score_tracker_recovery_tickets set status='claimed',history=history||jsonb_build_array(jsonb_build_object('author','system','content','新账号已领取。请保存账号和新密码。','at',now())),updated_at=clock_timestamp() where id=p_ticket;
  return jsonb_build_object('user',jsonb_build_object('id',u.id,'username',u.username,'created_at',u.created_at));
end $$;

-- Keep older edge bundles able to claim while they roll out the username field.
create or replace function public.score_tracker_recovery_claim(p_ticket uuid,p_key_hash text,p_hash text,p_salt text,p_token_hash text)
returns jsonb language sql security invoker set search_path='' as $$
  select public.score_tracker_recovery_claim(p_ticket,p_key_hash,p_hash,p_salt,p_token_hash,'recover-'||substr(replace(gen_random_uuid()::text,'-',''),1,16));
$$;

revoke all on function public.score_tracker_recovery_candidates(uuid,text),public.score_tracker_recovery_claim(uuid,text,text,text,text),public.score_tracker_recovery_claim(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.score_tracker_recovery_candidates(uuid,text),public.score_tracker_recovery_claim(uuid,text,text,text,text),public.score_tracker_recovery_claim(uuid,text,text,text,text,text) to service_role;
