begin;
do $test$
declare
  owner_id uuid;
  admin_id uuid;
  suggestion_id uuid;
  thread_id uuid;
  repeated_id uuid;
  reply_id uuid;
  overview jsonb;
begin
  select id into admin_id from public.score_tracker_users where is_admin limit 1;
  insert into public.score_tracker_users(username,password_hash,password_salt)
    values ('test-vote-' || substr(gen_random_uuid()::text,1,8), 'test-only', 'test-only') returning id into owner_id;
  insert into public.score_tracker_feature_vote_suggestions(user_id,content)
    values (owner_id, '我在哪里修改考试名称？<script>测试</script>') returning id into suggestion_id;
  begin
    perform public.score_tracker_convert_vote_to_feedback(suggestion_id, owner_id);
    raise exception 'Non-admin conversion must fail';
  exception when insufficient_privilege then null;
  end;
  thread_id := public.score_tracker_convert_vote_to_feedback(suggestion_id, admin_id);
  repeated_id := public.score_tracker_convert_vote_to_feedback(suggestion_id, admin_id);
  assert thread_id = repeated_id, 'Repeated conversion must reuse the thread';
  assert (select count(*) = 1 from public.score_tracker_feedback_submissions where user_id=owner_id), 'Only one thread';
  assert (select f.user_id=s.user_id and f.content=s.content and f.created_at=s.created_at and f.account_mode='account' and f.status='new'
    from public.score_tracker_feedback_submissions f join public.score_tracker_feature_vote_suggestions s on s.feedback_id=f.id
    where s.id=suggestion_id), 'Original author, content and date must survive';
  overview := public.score_tracker_feature_vote_overview(owner_id);
  assert overview->'suggestions'->0->>'status'='converted', 'User sees converted status';
  assert overview->'suggestions'->0->>'feedbackId'=thread_id::text, 'User gets the correct thread link';
  assert (select count(*)=1 from public.score_tracker_visit_logs where event_type='feature_suggestion_converted' and metadata->>'suggestion_id'=suggestion_id::text), 'Conversion audit is not duplicated';
  assert not exists (select 1 from public.score_tracker_feedback_replies where feedback_id=thread_id), 'No fabricated admin reply';
  insert into public.score_tracker_feedback_replies(feedback_id,author_user_id,author_type,content)
    values (thread_id,admin_id,'admin','打开录入页，点考试旁的编辑按钮。') returning id into reply_id;
  assert (select count(*)=1 from public.score_tracker_feedback_replies r join public.score_tracker_feedback_submissions f on f.id=r.feedback_id
    where f.user_id=owner_id and r.author_type='admin' and r.read_at is null), 'Reply is unread for the original user';
  update public.score_tracker_feedback_replies set read_at=now() where id=reply_id;
  assert not exists (select 1 from public.score_tracker_feedback_replies where feedback_id=thread_id and author_type='admin' and read_at is null), 'Read clears unread';
  insert into public.score_tracker_feature_vote_suggestions(user_id,content,status)
    values (owner_id,'已经处理的需求','dismissed') returning id into suggestion_id;
  begin
    perform public.score_tracker_convert_vote_to_feedback(suggestion_id,admin_id);
    raise exception 'Handled suggestions must not convert';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.score_tracker_convert_vote_to_feedback(gen_random_uuid(),admin_id);
    raise exception 'Missing suggestions must fail';
  exception when no_data_found then null;
  end;
  assert not has_function_privilege('anon','public.score_tracker_convert_vote_to_feedback(uuid,uuid)','execute'), 'Guests cannot invoke conversion';
  assert not has_function_privilege('authenticated','public.score_tracker_convert_vote_to_feedback(uuid,uuid)','execute'), 'Direct authenticated clients cannot invoke conversion';
  assert has_function_privilege('service_role','public.score_tracker_convert_vote_to_feedback(uuid,uuid)','execute'), 'Admin server can invoke conversion';
end;
$test$;
select 'vote conversion, ownership, idempotency, unread and permissions passed' as result;
rollback;
