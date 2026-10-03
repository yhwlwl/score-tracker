begin;
do $$
declare ids uuid[]:='{}'; u uuid; e uuid; j int; k int; got jsonb; subject_name text:='full-history-'||substr(gen_random_uuid()::text,1,8);
begin
  for j in 1..3 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt) values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,true);
    for k in 1..case when j=1 then 12 when j=2 then 15 else 7 end loop
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent) values(e,u,'History test',current_date-30+k,'高二',60-k);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score) values(u,e,subject_name,50+k,100);
    end loop;
  end loop;
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二','overlap');
  assert jsonb_array_length(got->'history')=12,'all 12 requester exams included';
  assert jsonb_array_length(got->'matches')=2,'shorter peer may participate while all twelve requester exams are retained';
  assert jsonb_array_length(got->'matches'->0->'history')=12,'peer segment has same length';
  assert got->'matches'->0->'future'='[47,46,45]'::jsonb,'future starts after the full matching segment';
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],array[subject_name],'score','高二','overlap');
  assert jsonb_array_length(got->'history')=12,'score mode also uses all 12 exams';
  update public.score_tracker_exams set total_year_position_percent=null where user_id=ids[1] and exam_date=current_date-22;
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二','overlap');
  assert jsonb_array_length(got->'history')=4,'missing exam remains a boundary rather than joining unrelated segments';
end $$;
rollback;
