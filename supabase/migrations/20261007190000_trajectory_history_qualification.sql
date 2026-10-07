-- Preserve invalid and unrelated exams as display gaps, but omit them from a
-- comparable sequence. Category is a peer filter, not a self-history boundary.
CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_points_v2(
  p_subjects text[],
  p_metric text,
  p_category text,
  p_as_of_date date,
  p_only_user uuid DEFAULT NULL,
  p_requester uuid DEFAULT NULL
)
RETURNS TABLE(uid uuid, vals numeric[], contexts text[], exam_dates date[], categories text[])
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  WITH points AS (
    SELECT e.user_id,
      e.exam_date,
      e.created_at,
      e.id,
      CASE WHEN p_subjects IS NULL THEN s.basket ELSE array_to_string(p_subjects,'|') END AS context,
      e.grade_level,
      CASE
        WHEN p_subjects IS NULL AND p_metric='year' THEN
          COALESCE(e.total_year_position_percent,CASE WHEN e.total_rank BETWEEN 1 AND e.total_participants THEN 100.0*e.total_rank/NULLIF(e.total_participants,0) END)
        WHEN p_subjects IS NULL AND p_metric='class' THEN
          COALESCE(e.total_class_position_percent,CASE WHEN e.total_class_rank BETWEEN 1 AND e.total_class_participants THEN 100.0*e.total_class_rank/NULLIF(e.total_class_participants,0) END)
        WHEN p_metric='score' THEN
          CASE WHEN s.complete AND s.max_total>0 THEN 100.0*(CASE WHEN p_subjects IS NULL THEN COALESCE(e.total_actual_score,s.score_total) ELSE s.score_total END)/s.max_total END
        WHEN s.rank_complete THEN s.rank_median
      END AS value
    FROM public.score_tracker_exams e
    LEFT JOIN public.score_tracker_trajectory_sharing sharing ON sharing.user_id=e.user_id
    CROSS JOIN LATERAL (
      SELECT string_agg(r.subject,'|' ORDER BY r.subject) AS basket,
        COUNT(*)>0 AND bool_and(r.actual_score IS NOT NULL AND r.max_score>0 AND r.actual_score BETWEEN 0 AND r.max_score)
          AND (p_subjects IS NULL OR COUNT(*)=cardinality(p_subjects)) AS complete,
        SUM(r.actual_score) AS score_total,
        SUM(r.max_score) AS max_total,
        COUNT(*)>0 AND COUNT(v.pos)=COUNT(*) AND (p_subjects IS NULL OR COUNT(*)=cardinality(p_subjects)) AS rank_complete,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY v.pos)::numeric AS rank_median
      FROM public.score_tracker_scores r
      CROSS JOIN LATERAL (
        SELECT CASE WHEN p_metric='class' THEN
          COALESCE(r.class_position_percent,CASE WHEN r.class_rank_position BETWEEN 1 AND COALESCE(r.class_participant_count,e.total_class_participants) THEN 100.0*r.class_rank_position/NULLIF(COALESCE(r.class_participant_count,e.total_class_participants),0) END)
        ELSE
          COALESCE(r.year_position_percent,CASE WHEN r.rank_position BETWEEN 1 AND COALESCE(r.participant_count,e.total_participants) THEN 100.0*r.rank_position/NULLIF(COALESCE(r.participant_count,e.total_participants),0) END)
        END AS pos
      ) v
      WHERE r.exam_id=e.id AND r.user_id=e.user_id
        AND CASE WHEN p_subjects IS NULL THEN NOT COALESCE(r.exclude_from_total,false) ELSE r.subject=ANY(p_subjects) END
    ) s
    WHERE (p_only_user IS NULL OR e.user_id=p_only_user)
      AND (p_requester IS NULL OR COALESCE(sharing.enabled,false) OR EXISTS (
        SELECT 1 FROM public.score_tracker_trajectory_sharing access
        WHERE access.user_id=p_requester AND access.enabled AND access.test_all_database
      ))
      AND NOT COALESCE(e.is_hidden,false)
      AND e.exam_date<=p_as_of_date
      AND (p_subjects IS NULL OR s.basket IS NOT NULL)
      AND (p_category='__all__' OR (p_category='__none__' AND COALESCE(e.grade_level,'')='') OR e.grade_level=p_category)
  )
  SELECT user_id,
    array_agg(CASE WHEN value BETWEEN 0 AND 100 THEN value END ORDER BY exam_date,created_at,id),
    array_agg(context ORDER BY exam_date,created_at,id),
    array_agg(exam_date ORDER BY exam_date,created_at,id),
    array_agg(COALESCE(grade_level,'') ORDER BY exam_date,created_at,id)
  FROM points
  GROUP BY user_id;
$function$;

-- A two-point history gets an explicitly preliminary display. Formal forecast
-- calculations remain client-side and are only enabled from three points.
CREATE OR REPLACE FUNCTION public.score_tracker_trajectory_match_v2(
  p_user_id uuid,
  p_subjects text[] DEFAULT NULL,
  p_metric text DEFAULT 'year',
  p_category text DEFAULT '__all__',
  p_same_category boolean DEFAULT false,
  p_match_mode text DEFAULT 'shape',
  p_reference_policy text DEFAULT 'balanced',
  p_min_history integer DEFAULT 3,
  p_reference_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
SET statement_timeout TO '12s'
AS $function$
DECLARE
  mine numeric[] := '{}';
  contexts text[] := '{}';
  own_dates date[] := '{}';
  own_categories text[] := '{}';
  target numeric[] := '{}';
  target_dates date[] := '{}';
  target_categories text[] := '{}';
  current_context text;
  current_category text := '';
  peer_category text := '__all__';
  total_exam_count integer := 0;
  skipped_count integer := 0;
  combination_count integer := 0;
  n integer := 0;
  i integer;
  matches jsonb := '[]'::jsonb;
  matched_uids uuid[] := '{}';
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.score_tracker_trajectory_sharing WHERE user_id=p_user_id AND enabled) THEN
    RETURN jsonb_build_object('enabled',false,'matches','[]'::jsonb);
  END IF;

  IF p_metric IS NULL OR p_metric NOT IN ('year','class','score')
    OR p_category IS NULL OR length(p_category)>40
    OR p_same_category IS NULL
    OR p_match_mode IS NULL OR p_match_mode NOT IN ('shape','overlap')
    OR p_reference_policy IS NULL OR p_reference_policy NOT IN ('balanced','long','recent')
    OR p_min_history IS NULL OR p_min_history NOT BETWEEN 3 AND 1000
    OR p_reference_limit IS NULL OR p_reference_limit NOT IN (3,20)
    OR (p_subjects IS NOT NULL AND (cardinality(p_subjects) NOT BETWEEN 1 AND 20 OR array_position(p_subjects,NULL) IS NOT NULL
      OR cardinality(ARRAY(SELECT DISTINCT subject FROM unnest(p_subjects) AS subjects(subject)))<>cardinality(p_subjects))) THEN
    RAISE EXCEPTION 'Invalid trajectory filters';
  END IF;

  SELECT points.vals,points.contexts,points.exam_dates,points.categories INTO mine,contexts,own_dates,own_categories
  FROM public.score_tracker_trajectory_points_v2(p_subjects,p_metric,p_category,current_date,p_user_id,NULL) AS points
  WHERE points.uid=p_user_id;
  mine:=COALESCE(mine,'{}'::numeric[]);
  contexts:=COALESCE(contexts,'{}'::text[]);
  own_dates:=COALESCE(own_dates,'{}'::date[]);
  own_categories:=COALESCE(own_categories,'{}'::text[]);

  SELECT COUNT(*)::integer INTO total_exam_count
  FROM public.score_tracker_exams e
  WHERE e.user_id=p_user_id AND NOT COALESCE(e.is_hidden,false) AND e.exam_date<=current_date
    AND (p_category='__all__' OR (p_category='__none__' AND COALESCE(e.grade_level,'')='') OR e.grade_level=p_category);

  i:=cardinality(mine);
  WHILE i>0 LOOP
    IF mine[i] BETWEEN 0 AND 100 THEN
      current_context:=contexts[i];
      current_category:=COALESCE(own_categories[i],'');
      EXIT;
    END IF;
    i:=i-1;
  END LOOP;

  IF current_context IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO combination_count
    FROM unnest(mine,contexts) AS point(value,context)
    WHERE point.value BETWEEN 0 AND 100 AND point.context IS DISTINCT FROM current_context;
  END IF;

  FOR i IN 1..cardinality(mine) LOOP
    IF mine[i] BETWEEN 0 AND 100 AND contexts[i] IS NOT DISTINCT FROM current_context THEN
      target:=array_append(target,mine[i]);
      target_dates:=array_append(target_dates,own_dates[i]);
      target_categories:=array_append(target_categories,COALESCE(own_categories[i],''));
    END IF;
  END LOOP;

  n:=cardinality(target);
  skipped_count:=greatest(0,total_exam_count-n);
  peer_category:=CASE WHEN p_same_category THEN CASE WHEN current_category='' THEN '__none__' ELSE current_category END ELSE '__all__' END;

  IF n<2 THEN
    RETURN jsonb_build_object(
      'enabled',true,'reason','need_history','preliminary',false,
      'history',target,'history_dates',target_dates,'history_categories',target_categories,
      'history_count',n,'visible_exam_count',total_exam_count,'skipped_count',skipped_count,
      'combination_excluded_count',combination_count,'same_category',p_same_category,
      'peer_category',peer_category,'matches','[]'::jsonb,'match_mode',p_match_mode,
      'reference_policy',p_reference_policy,'min_history',p_min_history,'reference_limit',p_reference_limit
    );
  END IF;

  WITH pool AS MATERIALIZED (
    SELECT * FROM public.score_tracker_trajectory_points_v2(
      p_subjects,p_metric,peer_category,current_date,NULL,p_user_id
    ) WHERE uid<>p_user_id
  ), observations AS (
    SELECT p.uid,k,p.vals[k] AS value,p.contexts[k] AS context,
      p.exam_dates[k] AS exam_date
    FROM pool p CROSS JOIN LATERAL generate_series(1,cardinality(p.vals)) AS positions(k)
    WHERE p.vals[k] BETWEEN 0 AND 100 AND p.contexts[k] IS NOT DISTINCT FROM current_context
  ), trajectories AS (
    SELECT uid,array_agg(value ORDER BY exam_date,k) AS vals
    FROM observations GROUP BY uid
    HAVING COUNT(*)>=greatest(3,p_min_history)+1
  ), segments AS (
    SELECT t.uid,t.vals,finish.k AS finish,fit.k AS k,
      t.vals[finish.k-fit.k+1:finish.k] AS history,
      t.vals[finish.k+1:least(finish.k+3,cardinality(t.vals))] AS future,
      finish.k AS reference_history_length
    FROM trajectories t
    CROSS JOIN LATERAL generate_series(greatest(3,p_min_history),cardinality(t.vals)-1) AS finish(k)
    CROSS JOIN LATERAL generate_series(
      CASE WHEN n=2 THEN 2 ELSE greatest(3,p_min_history) END,
      least(finish.k,n,CASE WHEN p_reference_policy='recent' THEN greatest(5,p_min_history) ELSE n END)
    ) AS fit(k)
  ), statistics AS (
    SELECT s.*,a.mse,a.vx,a.vy,a.cv
    FROM segments s
    CROSS JOIN LATERAL (
      SELECT avg(power(x-y,2)) AS mse,var_pop(x) AS vx,var_pop(y) AS vy,
        covar_pop(x::double precision,y::double precision)::numeric AS cv
      FROM (
        SELECT target[n-s.k+j] AS x,s.history[j] AS y
        FROM generate_series(1,s.k) AS aligned(j)
      ) aligned
    ) a
  ), errors AS (
    SELECT *,sqrt(greatest(0,mse)) AS level_gap,sqrt(greatest(0,vx+vy-2*cv)) AS centered_gap,
      CASE WHEN sqrt(vx)<1 AND sqrt(vy)<1 THEN sqrt(greatest(0,vx+vy-2*cv)) ELSE
        sqrt(greatest(0,vx/power(greatest(sqrt(vx),1),2)+vy/power(greatest(sqrt(vy),1),2)-2*cv/(greatest(sqrt(vx),1)*greatest(sqrt(vy),1)))) END AS shape_error,
      0.6/sqrt(greatest(k-2,1)::numeric)+0.9*(1-k::numeric/n) AS support_penalty
    FROM statistics
  ), fits AS (
    SELECT *,CASE WHEN p_match_mode='shape' THEN shape_error/0.9+
        0.1*abs(sqrt(vx)-sqrt(vy))/greatest(sqrt(vx),sqrt(vy),1)
      ELSE 0.75*level_gap/12+0.25*centered_gap/10 END AS fit_error
    FROM errors
    WHERE (p_match_mode='shape' AND shape_error<=0.9)
       OR (p_match_mode='overlap' AND level_gap<=12 AND centered_gap<=10)
  ), distances AS (
    SELECT *,fit_error+CASE WHEN p_reference_policy='recent' THEN 0.6/sqrt(greatest(k-2,1)::numeric) ELSE support_penalty END AS distance,
      CASE WHEN fit_error<=0.65 THEN 0 ELSE 1 END AS fit_band
    FROM fits
  ), best_scores AS (
    SELECT *,min(fit_band) OVER (PARTITION BY uid) AS best_band,
      min(distance) OVER (PARTITION BY uid,fit_band) AS best_distance
    FROM distances
  ), ranked AS (
    SELECT *,row_number() OVER (
      PARTITION BY uid ORDER BY
        CASE WHEN p_reference_policy IN ('balanced','long') THEN k ELSE 0 END DESC,
        distance,k DESC,finish DESC
    ) AS best
    FROM best_scores
    WHERE fit_band=best_band AND (p_reference_policy<>'balanced' OR distance<=best_distance+0.05)
  ), chosen AS (
    SELECT * FROM ranked WHERE best=1
    ORDER BY fit_band,CASE WHEN p_reference_policy='long' THEN k ELSE 0 END DESC,distance,k DESC,uid
    LIMIT p_reference_limit
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'history',history,'history_length',reference_history_length,'own_history_start',n-k,'own_history_length',k,
      'future',future,'gap',round(distance,2),
      'match_score',CASE WHEN n>=3 THEN round(100*exp(-greatest(fit_error,0))) ELSE NULL END
    ) ORDER BY fit_band,CASE WHEN p_reference_policy='long' THEN k ELSE 0 END DESC,distance,k DESC,uid),'[]'::jsonb),
    COALESCE(array_agg(uid ORDER BY fit_band,CASE WHEN p_reference_policy='long' THEN k ELSE 0 END DESC,distance,k DESC,uid),'{}'::uuid[])
  INTO matches,matched_uids FROM chosen;

  IF cardinality(matched_uids)>0 THEN
    INSERT INTO public.score_tracker_trajectory_match_exposures(owner_user_id,matcher_user_id,first_matched_at,last_matched_at)
    SELECT matched_uid,p_user_id,now(),now() FROM unnest(matched_uids) AS rows(matched_uid)
    WHERE NOT EXISTS(SELECT 1 FROM public.score_tracker_trajectory_sharing test_access WHERE test_access.user_id=p_user_id AND test_access.test_all_database)
    ON CONFLICT (owner_user_id,matcher_user_id) DO UPDATE SET last_matched_at=excluded.last_matched_at;
  END IF;

  RETURN jsonb_build_object(
    'enabled',true,'reason',CASE WHEN n=2 THEN 'preliminary' WHEN jsonb_array_length(matches)=0 THEN 'no_match' ELSE 'matched' END,
    'preliminary',n=2,'history',target,'history_dates',target_dates,'history_categories',target_categories,
    'history_count',n,'visible_exam_count',total_exam_count,'skipped_count',skipped_count,
    'combination_excluded_count',combination_count,'same_category',p_same_category,'peer_category',peer_category,
    'matches',matches,'metric',p_metric,'match_mode',p_match_mode,'reference_policy',p_reference_policy,
    'min_history',p_min_history,'reference_limit',p_reference_limit
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.score_tracker_trajectory_points_v2(text[],text,text,date,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.score_tracker_trajectory_points_v2(text[],text,text,date,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.score_tracker_trajectory_match_v2(uuid,text[],text,text,boolean,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.score_tracker_trajectory_match_v2(uuid,text[],text,text,boolean,text,text,integer,integer) TO service_role;
