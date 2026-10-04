-- Every fixture is rolled back; no test accounts or sharing changes persist.
begin;
do $$
declare ids uuid[]:='{}';u uuid;e uuid;j int;k int;v numeric;got jsonb;mode text;
  own numeric[]:=array[65,55,60,44,52,36,48,34,41,28,33,20];
  subject_name text:='evidence-'||substr(gen_random_uuid()::text,1,8);
begin
  -- Three early short-only candidates must not stop the later long candidates.
  for j in 1..7 loop
    u:=gen_random_uuid();ids:=array_append(ids,u);
    insert into public.score_tracker_users(id,username,original_username,password_hash,password_salt)
      values(u,'test-'||u,'test-'||u,'unusable','unusable');
    insert into public.score_tracker_trajectory_sharing(user_id,enabled) values(u,true);
    for k in 1..case when j in (1,5,6) then 13 when j=7 then 9 else 4 end loop
      v:=case when j=1 then own[k]
        when j in (2,3,4) then case when k<=3 then own[9+k] else 21+j end
        when j=5 then case when k<=12 then own[k]+case when k%2=0 then 1 else -1 end else 17 end
        when j=6 then case when k<=9 then 95 when k<=12 then own[k] else 18 end
        else case when k<=8 then own[4+k]+case when k%2=0 then 1 else -1 end else 16 end end;
      if j=1 and k=13 then continue;end if;
      e:=gen_random_uuid();
      insert into public.score_tracker_exams(id,user_id,name,exam_date,grade_level,total_year_position_percent)
        values(e,u,'Evidence test',current_date-40+k,'高二',v);
      insert into public.score_tracker_scores(user_id,exam_id,subject,actual_score,max_score)
        values(u,e,subject_name,100-v,100);
    end loop;
  end loop;
  foreach mode in array array['shape','overlap'] loop
    got:=public.score_tracker_trajectory_match_adaptive(ids[1],array[subject_name],'score','高二',mode);
    assert jsonb_array_length(got->'matches')=3,'all candidates are scored before selecting three';
    assert (got->'matches'->0->>'history_length')::int=12,'slightly imperfect full history beats an exact three-exam coincidence';
    assert (got->'matches'->1->>'history_length')::int=8,'good unequal-length history outranks short snippets';
    assert (got->'matches'->2->>'history_length')::int=3,'short candidates remain usable when fewer long matches exist';
    assert got->'matches'->0->'future'='[83]'::jsonb,'future starts after the selected long history';
    assert got->'matches'->1->'own_history_start'='4'::jsonb,'eight-exam peer compares with requester latest eight';
    -- A peer with nine unrelated old points and a good suffix cannot win as long.
    update public.score_tracker_trajectory_sharing set enabled=false where user_id=any(array[ids[2],ids[3],ids[4],ids[5],ids[7]]);
    got:=public.score_tracker_trajectory_match_adaptive(ids[1],array[subject_name],'score','高二',mode);
    assert jsonb_array_length(got->'matches')=1,'only the misleading peer remains';
    assert (got->'matches'->0->>'history_length')::int<=4,'never stretch a match through unrelated old exams';
    update public.score_tracker_trajectory_sharing set enabled=true where user_id=any(ids);
  end loop;
  update public.score_tracker_trajectory_sharing set enabled=false where user_id=any(array[ids[5],ids[6],ids[7]]);
  got:=public.score_tracker_trajectory_match_adaptive(ids[1],array[subject_name],'score','高二','shape');
  assert jsonb_array_length(got->'matches')=3,'short-only candidate pool does not become empty';
  assert not exists(select 1 from jsonb_array_elements(got->'matches') m where (m->>'history_length')::int<>3),'short-only results retain real three-exam histories';
  assert not has_function_privilege('anon','public.score_tracker_trajectory_match_adaptive(uuid,text[],text,text,text)','execute'),'RPC is still private';
end $$;
rollback;
