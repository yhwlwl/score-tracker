begin;
do $$
declare ids uuid[]:='{}';u uuid;e uuid;j int;k int;v numeric;got jsonb;mode text;policy text;old jsonb;
  own numeric[]:=array[65,55,60,44,52,36,48,34,41,28,33,20];
  subject_name text:='configured-'||substr(gen_random_uuid()::text,1,8);
begin
  for j in 1..4 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt)
      values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,true);
    for k in 1..case when j=1 then 12 when j=2 then 13 when j=3 then 9 else 4 end loop
      v:=case when j=1 then own[k]
        when j=2 then case when k<=12 then own[k]+case when k%2=0 then 1 else -1 end else 17 end
        when j=3 then case when k<=8 then own[4+k]+case when k%2=0 then 1 else -1 end else 16 end
        else case when k<=3 then own[9+k] else 22 end end;
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent)
        values(e,u,'Configured test',current_date-40+k,'高二',v);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score)
        values(u,e,subject_name,100-v,100);
    end loop;
  end loop;
  foreach mode in array array['shape','overlap'] loop
    old:=public.score_tracker_trajectory_match_adaptive(ids[1],array[subject_name],'score','高二',mode);
    got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,'balanced',3);
    assert old=got,'default configured matching exactly preserves explicit-mode compatibility';
    got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,'long',3);
    assert (got->'matches'->0->>'history_length')::int=12,'long preference uses longest sufficiently close segment';
    assert (got->'matches'->1->>'history_length')::int=8,'unequal histories are not excluded';
    got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,'recent',3);
    assert jsonb_array_length(got->'matches')=3,'recent policy scans all eligible peers';
    assert not exists(select 1 from jsonb_array_elements(got->'matches') m where (m->>'history_length')::int>5),'recent policy compares only latest three to five requester exams';
    foreach policy in array array['balanced','long','recent'] loop
      got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二',mode,policy,8);
      assert jsonb_array_length(got->'matches')=2,'hard minimum never falls back to short peer';
      assert not exists(select 1 from jsonb_array_elements(got->'matches') m where (m->>'history_length')::int<8),'minimum is respected in every policy';
      assert got->'min_history'='8'::jsonb and got->>'reference_policy'=policy,'response reports applied settings';
      assert not exists(select 1 from jsonb_array_elements(got->'matches') m where (m->>'own_history_start')::int<>12-(m->>'history_length')::int),'each match uses requester latest suffix';
    end loop;
  end loop;
  got:=public.score_tracker_trajectory_match_configured(ids[1],array[subject_name],'score','高二','shape','long',13);
  assert got->>'reason'='need_history' and got->'matches'='[]'::jsonb,'requester with too few exams gets explicit empty result';
  begin
    perform public.score_tracker_trajectory_match_configured(ids[1],null,'year','高二','shape','invalid',3);
    raise exception 'invalid policy was accepted';
  exception when raise_exception then assert sqlerrm='Invalid trajectory filters','reject unknown policy';end;
  begin
    perform public.score_tracker_trajectory_match_configured(ids[1],null,'year','高二','shape','balanced',2);
    raise exception 'invalid minimum was accepted';
  exception when raise_exception then assert sqlerrm='Invalid trajectory filters','reject unsafe sample length';end;
  update public.score_tracker_trajectory_sharing set enabled=false where user_id=ids[1];
  got:=public.score_tracker_trajectory_match_configured(ids[1],null,'year','高二','shape','long',3);
  assert got->'enabled'='false'::jsonb and got->'matches'='[]'::jsonb,'settings do not bypass sharing consent';
  assert not has_function_privilege('anon','public.score_tracker_trajectory_match_configured(uuid,text[],text,text,text,text,int)','execute'),'configured matcher is private';
  assert not has_function_privilege('authenticated','public.score_tracker_trajectory_match_configured(uuid,text[],text,text,text,text,int)','execute'),'authenticated clients cannot impersonate requester';
end $$;
rollback;
