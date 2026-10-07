-- Read-only reproduction of proposed v2 defaults for the authorized admin1 language case.
-- Uses existing stable points helpers; skips unrelated/missing language observations.
-- Returns aggregate selection metadata and hashed peer IDs; performs no writes.
WITH requester AS (SELECT id FROM public.score_tracker_users WHERE username='admin1'),
points AS MATERIALIZED (
 SELECT p.* FROM requester r CROSS JOIN LATERAL public.score_tracker_trajectory_points_for_request(ARRAY['语文']::text[],'year','__all__',r.id) p
), own AS (
 SELECT array_agg(v ORDER BY k) AS target,COUNT(*)::int AS n FROM requester r JOIN points p ON p.uid=r.id
 CROSS JOIN LATERAL unnest(p.vals) WITH ORDINALITY a(v,k) WHERE v BETWEEN 0 AND 100
), params AS (SELECT own.*,policy FROM own CROSS JOIN (VALUES ('balanced'),('long'),('recent')) pol(policy)),
observations AS (
 SELECT p.uid,k,p.vals[k] AS value FROM points p CROSS JOIN LATERAL generate_series(1,cardinality(p.vals)) positions(k)
 WHERE p.vals[k] BETWEEN 0 AND 100 AND p.uid<>(SELECT id FROM requester)
), trajectories AS (
    SELECT uid,array_agg(value ORDER BY k) AS vals
    FROM observations GROUP BY uid
    HAVING COUNT(*)>=greatest(3,3)+1
  ), segments AS (
    SELECT t.uid,t.vals,params.target,params.n,params.policy,finish.k AS finish,fit.k AS k,
      t.vals[finish.k-fit.k+1:finish.k] AS history,
      t.vals[finish.k+1:least(finish.k+3,cardinality(t.vals))] AS future,
      finish.k AS reference_history_length
    FROM trajectories t CROSS JOIN params
    CROSS JOIN LATERAL generate_series(greatest(3,3),cardinality(t.vals)-1) AS finish(k)
    CROSS JOIN LATERAL generate_series(
      CASE WHEN n=2 THEN 2 ELSE greatest(3,3) END,
      least(finish.k,n,CASE WHEN policy='recent' THEN greatest(5,3) ELSE n END)
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
    SELECT *,CASE WHEN 'shape'='shape' THEN shape_error/0.9+
        0.1*abs(sqrt(vx)-sqrt(vy))/greatest(sqrt(vx),sqrt(vy),1)
      ELSE 0.75*level_gap/12+0.25*centered_gap/10 END AS fit_error
    FROM errors
    WHERE ('shape'='shape' AND shape_error<=0.9)
       OR ('shape'='overlap' AND level_gap<=12 AND centered_gap<=10)
  ), distances AS (
    SELECT *,fit_error+CASE WHEN policy='recent' THEN 0.6/sqrt(greatest(k-2,1)::numeric) ELSE support_penalty END AS distance,
      CASE WHEN fit_error<=0.65 THEN 0 ELSE 1 END AS fit_band
    FROM fits
  ), best_scores AS (
    SELECT *,min(fit_band) OVER (PARTITION BY uid,policy) AS best_band,
      min(distance) OVER (PARTITION BY uid,policy,fit_band) AS best_distance
    FROM distances
  ), ranked AS (
    SELECT *,row_number() OVER (
      PARTITION BY uid,policy ORDER BY
        CASE WHEN policy IN ('balanced','long') THEN k ELSE 0 END DESC,
        distance,k DESC,finish DESC
    ) AS best
    FROM best_scores
    WHERE fit_band=best_band AND (policy<>'balanced' OR distance<=best_distance+0.05)
  
), chosen AS (
 SELECT *,row_number() OVER(PARTITION BY policy ORDER BY fit_band,CASE WHEN policy='long' THEN k ELSE 0 END DESC,distance,k DESC,uid) AS position
 FROM ranked WHERE best=1
)
SELECT policy,max(n) AS own_history_count,count(*) AS reference_count,
 jsonb_agg(jsonb_build_object('peer',substr(md5(uid::text),1,12),'window',k,'reference_history',reference_history_length,'fit',round(fit_error,4),'distance',round(distance,4)) ORDER BY position) AS references
FROM chosen WHERE position<=20 GROUP BY policy ORDER BY policy;

