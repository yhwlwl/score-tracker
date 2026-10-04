begin;
do $$
declare ids uuid[]:='{}';u uuid;e uuid;j int;k int;v numeric;got jsonb;mode text;subject_name text:='recent-'||substr(gen_random_uuid()::text,1,8);
begin
  for j in 1..3 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt) values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,true);
    for k in 1..case when j=1 then 6 else 4 end loop
      v:=case when j=1 then (array[65,55,45,45,55,65])[k] when j=2 then 75-10*k else 35+10*k end;
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent) values(e,u,'Recent first test',current_date-30+k,'高二',v);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score) values(u,e,subject_name,100-v,100);
    end loop;
  end loop;
  foreach mode in array array['shape','overlap'] loop
    got:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二',mode);
    assert jsonb_array_length(got->'history')=6,'full available requester history stays visible';
    assert jsonb_array_length(got->'matches')=1,'only recent matching direction qualifies';
    assert got->'matches'->0->'history'='[45,55,65]'::jsonb,'never match against the older first-three segment';
    assert got->'matches'->0->'future'='[75]'::jsonb,'follow-up belongs to the chosen recent reference';
    assert got->'matches'->0->'own_history_start'='3'::jsonb,'three-point reference aligns with requester points four through six';
    assert got->'matches'->0->'own_history_length'='3'::jsonb,'latest three requester exams were compared';
  end loop;
end $$;
rollback;
