begin;
do $$
declare ids uuid[]:='{}';u uuid;e uuid;j int;k int;v numeric;got jsonb;base jsonb;mode text;policy text;exact_score numeric;offset_score numeric;near_score numeric;
  own numeric[]:=array[30,45,20,40,25,15];subject_name text:='match-score-'||substr(gen_random_uuid()::text,1,8);
begin
  for j in 1..4 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt)
      values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,true);
    for k in 1..case when j=1 then 6 else 7 end loop
      v:=case when k=7 then 10 when j in (1,2) then own[k] when j=3 then own[k]+10
        else own[k]+case when k%2=0 then 2 else -2 end end;
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent)
        values(e,u,'Match score test',current_date-20+k,'高二',100-v);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score)
        values(u,e,subject_name,v,100);
    end loop;
  end loop;
  foreach mode in array array['shape','overlap'] loop
    base:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,'balanced',6);
    assert jsonb_array_length(base->'matches')=3,'three controlled references qualify';
    assert not exists(select 1 from jsonb_array_elements(base->'matches') m where
      jsonb_typeof(m->'match_score')<>'number' or (m->>'match_score')::numeric not between 0 and 100
      or (m->>'match_score')::numeric<>trunc((m->>'match_score')::numeric)),'score is an integer in 0..100';
    select (m->>'match_score')::numeric into exact_score from jsonb_array_elements(base->'matches') m where m->'history'='[30,45,20,40,25,15]'::jsonb;
    select (m->>'match_score')::numeric into offset_score from jsonb_array_elements(base->'matches') m where m->'history'='[40,55,30,50,35,25]'::jsonb;
    select (m->>'match_score')::numeric into near_score from jsonb_array_elements(base->'matches') m where m->'history'='[28,47,18,42,23,17]'::jsonb;
    assert exact_score=100,'identical compared history has 100% fit';
    assert near_score<exact_score and near_score>0,'a distorted trajectory scores below an identical one';
    if mode='shape' then assert offset_score=100,'shape matching ignores a constant level offset';
    else assert offset_score=54 and near_score>offset_score,'overlap uses level differences and monotonic fit transform';end if;
    foreach policy in array array['long','recent'] loop
      got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,policy,6);
      assert (select jsonb_agg(jsonb_build_object('history',m->'history','score',m->'match_score')) from jsonb_array_elements(got->'matches') m)
        =(select jsonb_agg(jsonb_build_object('history',m->'history','score',m->'match_score')) from jsonb_array_elements(base->'matches') m),
        'same compared segment has same fit regardless of policy or length penalties';
    end loop;
    update public.score_tracker_scores set actual_score=90 where user_id=ids[2]
      and exam_id in(select id from public.score_tracker_exams where user_id=ids[2] and exam_date=current_date-13);
    got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,'balanced',6);
    assert (select jsonb_agg(jsonb_build_object('history',m->'history','score',m->'match_score','gap',m->'gap')) from jsonb_array_elements(got->'matches') m)
      =(select jsonb_agg(jsonb_build_object('history',m->'history','score',m->'match_score','gap',m->'gap')) from jsonb_array_elements(base->'matches') m),
      'future scores do not influence fit, ranking or ordering';
  end loop;
  assert not has_function_privilege('anon','public.score_tracker_trajectory_match_configured(uuid,text[],text,text,text,text,int)','execute'),'matcher remains private';
end $$;
rollback;
