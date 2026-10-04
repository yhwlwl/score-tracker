-- Runs in a transaction and leaves no accounts, exams, or opt-ins behind.
begin;
do $$
declare ids uuid[]:='{}'; u uuid; e uuid; j int; k int; got jsonb; category text:='高二'; subject_name text:='peer-test-'||substr(gen_random_uuid()::text,1,8);
begin
  for j in 1..6 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt)
    values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,j<>6);
    for k in 1..case when j=1 then 3 else 6 end loop
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent,total_class_position_percent)
      values(e,u,'Private title',current_date-30+k,category,40-k*5+(j-1)*0.2,70-k*4+(j-1)*0.2);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score,year_position_percent,class_position_percent)
      values(u,e,subject_name,(60+k*5)*(case when j=3 then 1.5 else 1 end),case when j=3 then 150 else 100 end,40-k*5+(j-1)*0.2,70-k*4+(j-1)*0.2);
    end loop;
  end loop;
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert got->'history'='[35,30,25]'::jsonb,'latest user history';
  assert jsonb_array_length(got->'matches')=3,'top three distinct users';
  assert got->'matches'->0->'future'='[20.2,15.2,10.2]'::jsonb,'real subsequent values';
  assert not got::text like '%Private title%' and not got::text like '%'||ids[2]::text||'%','anonymous payload';
  got:=public.score_tracker_trajectory_match(ids[1],array[subject_name],'class',category);
  assert got->'history'='[66,62,58]'::jsonb,'class and grade ranks separated';
  got:=public.score_tracker_trajectory_match(ids[1],array[subject_name],'score',category);
  assert got->'history'='[65,70,75]'::jsonb,'score rates';
  assert got->'matches'->0->'future'='[80,85,90]'::jsonb,'normalizes different full marks';
  update public.score_tracker_trajectory_sharing set enabled=false where user_id=any(ids[2:5]);
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert jsonb_array_length(got->'matches')=0,'withdrawn and nonconsenting peers excluded';
  update public.score_tracker_trajectory_sharing set test_all_database=true where user_id=ids[1];
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert jsonb_array_length(got->'matches')=3,'designated test requester can use nonconsenting peers';
  update public.score_tracker_trajectory_sharing set test_all_database=false where user_id=ids[1];
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert jsonb_array_length(got->'matches')=0,'normal requester never inherits test scope';
  assert not has_function_privilege('authenticated','public.score_tracker_trajectory_points_for_request(text[],text,text,uuid)','execute'),'cannot bypass test authorization directly';

  update public.score_tracker_trajectory_sharing set enabled=true where user_id=ids[2];
  update public.score_tracker_exams set is_hidden=true where user_id=ids[2] and exam_date>current_date-27;
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert jsonb_array_length(got->'matches')=0,'hidden futures excluded';
  update public.score_tracker_exams set is_hidden=false,total_year_position_percent=null where user_id=ids[2] and exam_date=current_date-26;
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert jsonb_array_length(got->'matches')=0,'missing next exam cannot be skipped';
  update public.score_tracker_trajectory_sharing set enabled=false where user_id=ids[1];
  got:=public.score_tracker_trajectory_match(ids[1],null,'year',category);
  assert got->'enabled'='false'::jsonb,'requester must consent';
  assert not has_function_privilege('anon','public.score_tracker_trajectory_match(uuid,text[],text,text)','execute'),'no anon rpc';
  assert not has_table_privilege('authenticated','public.score_tracker_trajectory_sharing','select'),'no direct table access';
end $$;
rollback;
