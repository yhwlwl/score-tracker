-- Runs entirely inside a rollback; never changes a real account.
begin;
do $$
declare a uuid=gen_random_uuid(); src uuid=gen_random_uuid(); e1 uuid=gen_random_uuid(); e2 uuid=gen_random_uuid(); m uuid=gen_random_uuid(); badexam uuid=gen_random_uuid(); t uuid=gen_random_uuid(); dst uuid; v timestamptz; j jsonb; cnt integer;
begin
  insert into public.score_tracker_users(id,username,password_hash,password_salt,is_admin,session_token_hash,session_expires_at)
    values(a,'recovery-test-admin-'||a,'fixture','fixture',true,repeat('a',64),now()+interval '1 hour'),
    (src,'recovery-test-source-'||src,'fixture','fixture',false,null,null);
  insert into public.score_tracker_exams(id,user_id,name,exam_date,total_actual_score,total_rank,total_participants,end_date)
    values(e1,src,'找回核验月考','2026-09-01',650,10,100,'2026-09-02'),(e2,src,'另一次考试','2026-09-15',660,9,100,null);
  insert into public.score_tracker_scores(exam_id,user_id,subject,actual_score,raw_score,max_score,rank_position,participant_count)
    values(e1,src,'数学',128.5,120,150,5,100),(e2,src,'数学',132,125,150,4,100);
  insert into public.score_tracker_modules(id,user_id,name,subjects,is_builtin,sort_order) values(m,src,'选考','["数学"]',false,1);
  insert into public.score_tracker_exam_modules(exam_id,user_id,module_id,sort_order,ranks) values(e1,src,m,1,'{"year":{"rank":10,"participants":100}}');
  insert into public.score_tracker_subjects(user_id,name,default_max,sort_order) values(src,'数学',150,1);
  insert into public.score_tracker_user_goals(user_id,subject_goals,total_goal,dream_school) values(src,'{"数学":140}',680,'目标学校');
  insert into public.score_tracker_setup_profiles(user_id,step,selected_subjects,school,completed_at) values(src,6,'["物理","化学","生物"]','{"name":"测试中学"}',now());
  insert into public.score_tracker_user_roles(user_id,active_role) values(src,'teacher');
  insert into public.score_tracker_teacher_workspaces(user_id,data,revision) values(src,'{"classes":[{"id":"fixture","name":"测试班级"}]}',1);
  insert into public.score_tracker_recovery_tickets(id,ticket_no,key_hash,mode,username_hint,evidence)
    values(t,'ST-FFFFFFFFFFFF',repeat('b',64),'password','recovery-test-source-'||src,'{"exam_name":"找回核验月考","subject":"数学","score":"128.5","school":"测试中学"}') returning updated_at into v;
  j=public.score_tracker_recovery_candidates(t,'');
  assert jsonb_array_length(j)=1 and (j->0->>'exam_match')::boolean and (j->0->>'username_match')::boolean,'candidate matching';
  update public.score_tracker_exams set total_actual_score=null where id=e1;
  update public.score_tracker_recovery_tickets set evidence=jsonb_set(jsonb_set(evidence,'{score}','"128.5"'),'{subject}','"总分"') where id=t;
  j=public.score_tracker_recovery_candidates(t,''); assert (j->0->>'exam_match')::boolean,'sum scores when manual total absent';
  update public.score_tracker_recovery_tickets set evidence=jsonb_set(evidence,'{subject}','"数学"') where id=t;
  update public.score_tracker_recovery_tickets set evidence=jsonb_set(evidence,'{score}','"132"') where id=t;
  j=public.score_tracker_recovery_candidates(t,'');
  assert not (j->0->>'exam_match')::boolean,'different exam scores must not match';
  update public.score_tracker_recovery_tickets set evidence=jsonb_set(evidence,'{score}','"128.5"') where id=t;
  begin perform public.score_tracker_recovery_review(t,'bad','approved',src,'确认归属',v,'recovery-fixture-new','fixture','fixture'); raise exception 'unauthorized unexpectedly succeeded'; exception when raise_exception then if sqlerrm<>'unauthorized' then raise; end if; end;
  begin perform public.score_tracker_recovery_supplement(t,'bad','extra'); raise exception 'bad key unexpectedly succeeded'; exception when raise_exception then if sqlerrm<>'ticket_not_found' then raise; end if; end;
  perform public.score_tracker_recovery_supplement(t,repeat('b',64),'补充信息：数学月考128.5分');
  begin perform public.score_tracker_recovery_review(t,repeat('a',64),'approved',src,'确认归属',v,'recovery-fixture-new','fixture','fixture'); raise exception 'stale review unexpectedly succeeded'; exception when raise_exception then if sqlerrm<>'ticket_changed' then raise; end if; end;
  select updated_at into v from public.score_tracker_recovery_tickets where id=t;
  -- Force failure after copying exams/modules; every partial row must roll back.
  insert into public.score_tracker_exams(id,user_id,name,exam_date) values(badexam,a,'关联异常测试','2026-09-20');
  insert into public.score_tracker_scores(exam_id,user_id,subject,actual_score,max_score) values(badexam,src,'物理',90,100);
  begin perform public.score_tracker_recovery_review(t,repeat('a',64),'approved',src,'确认归属',v,'recovery-fixture-partial','fixture','fixture'); raise exception 'invalid source links succeeded'; exception when raise_exception then if sqlerrm<>'invalid_source_links' then raise; end if; end;
  select count(*) into cnt from public.score_tracker_users where username='recovery-fixture-partial'; assert cnt=0,'failed approval must not persist account';
  delete from public.score_tracker_scores where exam_id=badexam;
  perform public.score_tracker_recovery_review(t,repeat('a',64),'approved',src,'已核验两项独立信息，恢复成绩。',v,'recovery-fixture-new','fixture','fixture');
  select new_user_id into dst from public.score_tracker_recovery_tickets where id=t;
  assert dst<>src,'new independent account';
  select count(*) into cnt from public.score_tracker_exams where user_id=dst; assert cnt=2,'copy exams';
  select count(*) into cnt from public.score_tracker_scores where user_id=dst; assert cnt=2,'copy scores';
  select count(*) into cnt from public.score_tracker_scores s join public.score_tracker_exams e on e.id=s.exam_id where s.user_id=dst and e.user_id=dst; assert cnt=2,'remap exam links';
  select count(*) into cnt from public.score_tracker_exam_modules e join public.score_tracker_modules m on m.id=e.module_id join public.score_tracker_exams x on x.id=e.exam_id where e.user_id=dst and m.user_id=dst and x.user_id=dst and e.ranks->'year'->>'rank'='10'; assert cnt=1,'remap module links and copy ranks';
  select count(*) into cnt from public.score_tracker_user_goals where user_id=dst and total_goal=680; assert cnt=1,'copy goals';
  select count(*) into cnt from public.score_tracker_teacher_workspaces where user_id=dst and data->'classes'->0->>'name'='测试班级'; assert cnt=1,'copy teacher workspace';
  select count(*) into cnt from public.score_tracker_users where id=dst and not is_admin and session_token_hash is null; assert cnt=1,'no privilege or session inheritance';
  select count(*) into cnt from public.score_tracker_exams where user_id=src; assert cnt=2,'original account retained';
  begin perform public.score_tracker_recovery_review(t,repeat('a',64),'approved',src,'重复审批',v,'recovery-fixture-new2','fixture','fixture'); raise exception 'duplicate approval succeeded'; exception when raise_exception then if sqlerrm<>'ticket_closed' then raise; end if; end;
  update public.score_tracker_recovery_tickets set claim_until=now()-interval '1 second' where id=t;
  begin perform public.score_tracker_recovery_claim(t,repeat('b',64),'new-hash','new-salt',repeat('c',64)); raise exception 'expired claim succeeded'; exception when raise_exception then if sqlerrm<>'claim_expired' then raise; end if; end;
  update public.score_tracker_recovery_tickets set claim_until=now()+interval '1 day' where id=t;
  j=public.score_tracker_recovery_claim(t,repeat('b',64),'new-hash','new-salt',repeat('c',64));
  assert j->'user'->>'id'=dst::text,'claim new account';
  select count(*) into cnt from public.score_tracker_users where id=dst and password_hash='new-hash' and session_token_hash=repeat('c',64); assert cnt=1,'set new password and session';
  begin perform public.score_tracker_recovery_claim(t,repeat('b',64),'new-hash','new-salt',repeat('c',64)); raise exception 'duplicate claim succeeded'; exception when raise_exception then if sqlerrm<>'not_claimable' then raise; end if; end;
  assert not has_table_privilege('anon','public.score_tracker_recovery_tickets','select'),'anonymous table access denied';
  assert not has_function_privilege('anon','public.score_tracker_recovery_review(uuid,text,text,uuid,text,timestamptz,text,text,text)','execute'),'anonymous approval denied';
  assert not has_function_privilege('authenticated','public.score_tracker_recovery_claim(uuid,text,text,text,text)','execute'),'direct claim denied';
  assert public.score_tracker_recovery_rate('fixture-limit',60,1),'first request';
  assert not public.score_tracker_recovery_rate('fixture-limit',60,1),'rate limit';
end $$;
rollback;
