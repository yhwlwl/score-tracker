begin;
do $$
declare ids uuid[]:='{}';u uuid;e uuid;j int;k int;v numeric;got jsonb;overlap jsonb;before jsonb;subject_name text:='adaptive-'||substr(gen_random_uuid()::text,1,8);
begin
  for j in 1..3 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt) values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,true);
    for k in 1..case when j=1 then 12 else 4 end loop
      v:=case when j=1 then 67-2*k when j=2 then 106-11*k else 76-11*k end;
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent) values(e,u,'Adaptive test',current_date-30+k,'高二',v);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score) values(u,e,subject_name,100-v,100);
    end loop;
  end loop;
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二','shape');
  overlap:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二','overlap');
  assert jsonb_array_length(got->'history')=12,'requester retains all twelve actual points';
  assert jsonb_array_length(got->'matches')=2,'shape accepts short histories at different levels';
  assert jsonb_array_length(got->'matches'->0->'history')=3,'returns three real peer points instead of twelve invented samples';
  assert jsonb_array_length(overlap->'matches')=1,'overlap rejects offset trajectory while accepting nearby short history';
  before:=(select jsonb_agg(jsonb_build_object('history',x->'history','gap',x->'gap')) from jsonb_array_elements(got->'matches') x);
  update public.score_tracker_exams set total_year_position_percent=99 where user_id=ids[2] and exam_date=current_date-26;
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二','shape');
  assert before=(select jsonb_agg(jsonb_build_object('history',x->'history','gap',x->'gap')) from jsonb_array_elements(got->'matches') x),'future scores cannot influence matching or ordering';
  update public.score_tracker_exams set total_year_position_percent=99 where user_id=ids[1] and exam_date=current_date-24;
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],null,'year','高二','shape');
  assert jsonb_array_length(got->'matches')=2,'earlier requester exams cannot replace the latest three-point reference';
  assert not has_function_privilege('anon','public.score_tracker_trajectory_match_adaptive(uuid,text[],text,text,text)','execute'),'anonymous clients cannot invoke privileged matching';
  assert not has_function_privilege('authenticated','public.score_tracker_trajectory_curve_value(numeric[],numeric)','execute'),'helper remains service-only';
end $$;
rollback;
